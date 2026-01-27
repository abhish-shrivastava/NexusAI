<?php
/**
 * NexusAI API Proxy
 * Forwards requests to AI APIs (CORS bypass) and handles server-side summarization
 */

session_start();

// Define fallback if config.php doesn't exist
if (!file_exists("../resources/config.php")) {
    define('FALLBACK_TOKEN', '');
    define('FALLBACK_SUMMARIZE_MODEL', '');
    define('FALLBACK_SUMMARIZE_URL', '');
}

/* Rate limiting configuration */
define('RATE_LIMIT_REQUESTS', 60);      // Max requests per window
define('RATE_LIMIT_WINDOW', 60);        // Window in seconds (1 minute)

/* Rate limiting check */
function check_rate_limit() {
    $now = time();
    $window_start = $now - RATE_LIMIT_WINDOW;
    
    // Initialize or clean old entries
    if (!isset($_SESSION['api_requests'])) {
        $_SESSION['api_requests'] = [];
    }
    
    // Remove requests outside the window
    $_SESSION['api_requests'] = array_filter(
        $_SESSION['api_requests'],
        fn($timestamp) => $timestamp > $window_start
    );
    
    // Check limit
    if (count($_SESSION['api_requests']) >= RATE_LIMIT_REQUESTS) {
        return false;
    }
    
    // Record this request
    $_SESSION['api_requests'][] = $now;
    return true;
}

/* Origin/Referer validation for CSRF protection */
function validate_origin() {
    // Skip validation for development
    $server_host = $_SERVER['HTTP_HOST'] ?? '';
    if (in_array($server_host, ['localhost', '127.0.0.1']) || 
        strpos($server_host, 'localhost:') === 0) {
        return true;
    }
    
    // Check Origin header first (preferred for CSRF protection)
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin) {
        $origin_host = parse_url($origin, PHP_URL_HOST);
        if ($origin_host === $server_host) {
            return true;
        }
        // Allow same base domain (e.g., api.example.com from www.example.com)
        $server_domain = implode('.', array_slice(explode('.', $server_host), -2));
        $origin_domain = implode('.', array_slice(explode('.', $origin_host), -2));
        if ($server_domain === $origin_domain) {
            return true;
        }
        return false;
    }
    
    // Fallback to Referer header
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($referer) {
        $referer_host = parse_url($referer, PHP_URL_HOST);
        if ($referer_host === $server_host) {
            return true;
        }
    }
    
    // No Origin or Referer - could be direct API call or cURL
    // Allow for now but log for monitoring
    return true;
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* Validate origin for non-OPTIONS requests */
if (!validate_origin()) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid request origin']);
    exit;
}

/* Rate limiting check */
if (!check_rate_limit()) {
    http_response_code(429);
    header('Content-Type: application/json');
    header('Retry-After: ' . RATE_LIMIT_WINDOW);
    echo json_encode(['error' => 'Too many requests. Please slow down.']);
    exit;
}

/* cURL request to external API */
function make_request($url, $headers, $payload = null, $method = 'POST') {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    
    /* DNS options - use IPv4 and custom DNS servers to avoid resolution issues.
       Note: CURLOPT_DNS_SERVERS requires libcurl built with c-ares support.
       On systems without c-ares, it will be silently ignored and system DNS is used. */
    curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 120);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
    curl_setopt($ch, CURLOPT_DNS_SERVERS, '8.8.8.8,8.8.4.4,1.1.1.1');
    
    if ($method === 'POST' && $payload !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    } elseif ($method === 'GET') {
        curl_setopt($ch, CURLOPT_HTTPGET, true);
    }
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    
    if (curl_errno($ch)) {
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        curl_close($ch);
        
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? $url;
        
        if ($errno === CURLE_COULDNT_RESOLVE_HOST) {
            throw new Exception("DNS Error: Could not resolve host '$host'. Check your network connection.");
        } elseif ($errno === CURLE_OPERATION_TIMEDOUT) {
            throw new Exception("Request to '$host' timed out.");
        } elseif ($errno === CURLE_SSL_CONNECT_ERROR) {
            throw new Exception("SSL connection error with '$host'.");
        }
        throw new Exception("cURL Error ($errno): $error");
    }
    
    curl_close($ch);
    return [$response, $http_code, $content_type];
}

/* Check if platform supports Llama 3.1 8B for summarization */
function supports_summarization($url) {
    foreach (SUMMARIZATION_CAPABLE_PATTERNS as $pattern) {
        if (stripos($url, $pattern) !== false) return true;
    }
    return false;
}

/* Server-side summarization using fallback HF token */
function summarize_with_fallback($messages) {
    if (empty(FALLBACK_TOKEN)) {
        throw new Exception("Server-side summarization not configured");
    }
    
    $messages_text = "";
    foreach ($messages as $msg) {
        $role = ucfirst($msg['role']);
        $content = $msg['content'];
        $messages_text .= "$role: $content\n\n";
    }
    
    $payload = json_encode([
        'model' => FALLBACK_SUMMARIZE_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => 'Summarize the conversation concisely, preserving key facts and context.'],
            ['role' => 'user', 'content' => "Summarize:\n\n$messages_text"]
        ],
        'max_tokens' => 500,
        'temperature' => 0.3
    ]);
    
    $headers = [
        "Authorization: Bearer " . FALLBACK_TOKEN,
        "Content-Type: application/json"
    ];
    
    [$response, $http_code, $content_type] = make_request(FALLBACK_SUMMARIZE_URL, $headers, $payload);
    
    if ($http_code !== 200) {
        throw new Exception("Summarization failed with HTTP $http_code");
    }
    
    $data = json_decode($response, true);
    return $data['choices'][0]['message']['content'] ?? 'Summary unavailable';
}

/* GET requests (image proxying) */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $url = $_GET['url'] ?? null;
        if (!$url) throw new Exception("URL parameter required");
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            throw new Exception("Invalid URL");
        }
        
        $token = $_GET['token'] ?? '';
        
        // Load config (may modify $token for logged-in admins)
        if (file_exists("../resources/config.php")) require_once("../resources/config.php");
        
        $headers = [];
        if ($token) {
            $headers[] = "Authorization: Bearer $token";
        }
        
        [$response, $http_code, $content_type] = make_request($url, $headers, null, 'GET');
        
        if (strpos($content_type, 'image/') === 0) {
            header("Content-Type: $content_type");
            echo $response;
        } else {
            header('Content-Type: application/json');
            echo $response;
        }
    } catch (Exception $e) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

/* POST requests */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = file_get_contents('php://input');
        $json_input = json_decode($input, true);
        $action = $json_input['action'] ?? $_POST['action'] ?? 'proxy';
        
        // Extract URL and token early for config.php to potentially modify
        $api_url = $json_input['url'] ?? $json_input['api_url'] ?? $_POST['api_url'] ?? '';
        $token = $json_input['token'] ?? $_POST['token'] ?? '';
        
        // Load config (may modify $token for logged-in admins)
        if (file_exists("../resources/config.php")) require_once("../resources/config.php");
        
        /* Summarize action */
        if ($action === 'summarize') {
            $messages = $json_input['messages'] ?? null;
            
            if (!$messages || !is_array($messages)) {
                throw new Exception("Messages array required for summarization");
            }
            
            $use_user_token = supports_summarization($api_url) && !empty($token);
            
            if ($use_user_token) {
                $summarize_url = $api_url;
                $summarize_model = 'meta-llama/llama-3.1-8b-instruct';
                
                /* Platform-specific model names */
                if (stripos($api_url, 'openrouter.ai') !== false) {
                    $summarize_model = 'meta-llama/llama-3.1-8b-instruct:free';
                } elseif (stripos($api_url, 'together.xyz') !== false) {
                    $summarize_model = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
                }
                
                $messages_text = "";
                foreach ($messages as $msg) {
                    $role = ucfirst($msg['role']);
                    $content = $msg['content'];
                    $messages_text .= "$role: $content\n\n";
                }
                
                $payload = json_encode([
                    'model' => $summarize_model,
                    'messages' => [
                        ['role' => 'system', 'content' => 'Summarize the conversation concisely, preserving key facts and context.'],
                        ['role' => 'user', 'content' => "Summarize:\n\n$messages_text"]
                    ],
                    'max_tokens' => 500,
                    'temperature' => 0.3
                ]);
                
                $headers = [
                    "Authorization: Bearer $token",
                    "Content-Type: application/json"
                ];
                
                [$response, $http_code, $content_type] = make_request($summarize_url, $headers, $payload);
                
                if ($http_code !== 200) {
                    $summary = summarize_with_fallback($messages);
                } else {
                    $data = json_decode($response, true);
                    $summary = $data['choices'][0]['message']['content'] ?? 'Summary unavailable';
                }
            } else {
                $summary = summarize_with_fallback($messages);
            }
            
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'summary' => $summary,
                'used_fallback' => !$use_user_token
            ]);
            exit;
        }
        
        /* Proxy action (default) */
        $payload = $json_input['body'] ?? $json_input['payload'] ?? null;
        $request_method = $json_input['method'] ?? 'POST';
        
        // Handle GET requests (e.g., Pollinations image API)
        if ($request_method === 'GET' && $api_url) {
            $headers = [];
            if ($token) {
                $headers[] = "Authorization: Bearer $token";
            }
            
            [$response, $http_code, $content_type] = make_request($api_url, $headers, null, 'GET');
            
            if ($http_code !== 200) {
                http_response_code($http_code);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => [
                        'message' => 'Image generation failed',
                        'code' => $http_code
                    ],
                    'status' => $http_code
                ]);
                exit;
            }
            
            if (strpos($content_type, 'image/') === 0) {
                $base64 = base64_encode($response);
                $mime = explode(';', $content_type)[0];
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => true,
                    'type' => 'image',
                    'data' => "data:$mime;base64,$base64"
                ]);
            } else {
                http_response_code($http_code);
                header("Content-Type: $content_type");
                echo $response;
            }
            exit;
        }
        
        if (!$payload && isset($_POST['model'])) {
            $model = $_POST['model'];
            $u_prompt = $_POST['prompt'] ?? '';
            $sys_prompt = $_POST['system'] ?? 'Be concise and to the point.';
            
            $payload = [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $sys_prompt],
                    ['role' => 'user', 'content' => $u_prompt]
                ],
                'max_tokens' => intval($_POST['max_tokens'] ?? 6000),
                'temperature' => floatval($_POST['temperature'] ?? 0.7),
                'top_p' => floatval($_POST['top_p'] ?? 1.0)
            ];
        }
        
        if (!$api_url) {
            throw new Exception("API URL not specified");
        }
        
        if (!$payload) {
            throw new Exception("Request body not specified");
        }
        
        if (!filter_var($api_url, FILTER_VALIDATE_URL)) {
            throw new Exception("Invalid API URL");
        }
        
        $payload_json = is_string($payload) ? $payload : json_encode($payload);
        $headers = [
            "Content-Type: application/json"
        ];
        
        if ($token) {
            $headers[] = "Authorization: Bearer $token";
        }
        
        if (stripos($api_url, 'huggingface.co') !== false) {
            $headers[] = "x-wait-for-model: true";
            $headers[] = "x-use-cache: false";
        }
        
        [$response, $http_code, $content_type] = make_request($api_url, $headers, $payload_json);
        
        if (strpos($content_type, 'image/') === 0) {
            $base64 = base64_encode($response);
            $mime = explode(';', $content_type)[0];
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'type' => 'image',
                'data' => "data:$mime;base64,$base64"
            ]);
        } else {
            http_response_code($http_code);
            header("Content-Type: $content_type");
            echo $response;
        }
    } catch (Exception $e) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}
