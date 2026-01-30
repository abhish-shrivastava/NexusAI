/**
 * NexusAI Error Handler Module
 * Classifies errors and reports app-related issues to production server
 */

// Error classification constants
const ERROR_TYPES = {
  // Errors likely caused by the model's API (don't report)
  API_SERVER_ERROR: 'api_server_error',      // 5xx errors
  API_AUTH_ERROR: 'api_auth_error',          // 401, 403
  API_RATE_LIMIT: 'api_rate_limit',          // 429
  API_NOT_FOUND: 'api_not_found',            // 404 on API endpoint
  API_BAD_REQUEST: 'api_bad_request',        // 400 from API
  API_TIMEOUT: 'api_timeout',                // Request timeout
  
  // Errors likely caused by this app (should report)
  PARSE_ERROR: 'parse_error',                // Failed to parse response
  RENDER_ERROR: 'render_error',              // Failed to render content
  REQUEST_BUILD_ERROR: 'request_build_error', // Failed to build request
  CORS_ERROR: 'cors_error',                  // CORS issues (might be app config)
  NETWORK_ERROR: 'network_error',            // General network issues
  UNKNOWN_ERROR: 'unknown_error'             // Unclassified errors
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ERROR_TYPES.API_SERVER_ERROR]: 'The AI service is experiencing issues. Please try again later.',
  [ERROR_TYPES.API_AUTH_ERROR]: 'Authentication failed. Please check your API token in settings.',
  [ERROR_TYPES.API_RATE_LIMIT]: 'Rate limit exceeded. Please wait a moment before trying again.',
  [ERROR_TYPES.API_NOT_FOUND]: 'The API endpoint was not found. Please check your API URL in settings.',
  [ERROR_TYPES.API_BAD_REQUEST]: 'The request was invalid. Please check your settings or try a different prompt.',
  [ERROR_TYPES.API_TIMEOUT]: 'The request timed out. The AI service may be slow or unavailable.',
  [ERROR_TYPES.PARSE_ERROR]: 'Failed to understand the API response. This may be a compatibility issue.',
  [ERROR_TYPES.RENDER_ERROR]: 'Failed to display the response. Please try refreshing the page.',
  [ERROR_TYPES.REQUEST_BUILD_ERROR]: 'Failed to build the request. Please check your settings.',
  [ERROR_TYPES.CORS_ERROR]: 'Cross-origin request blocked. Try disabling "Direct API" in settings.',
  [ERROR_TYPES.NETWORK_ERROR]: 'Network error. Please check your internet connection.',
  [ERROR_TYPES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
};

// Errors that should be reported to production server
const REPORTABLE_ERRORS = [
  ERROR_TYPES.PARSE_ERROR,
  ERROR_TYPES.RENDER_ERROR,
  ERROR_TYPES.REQUEST_BUILD_ERROR,
  ERROR_TYPES.UNKNOWN_ERROR
];

/**
 * Classify an error based on HTTP status code and error message
 * @param {Object} params - Error parameters
 * @param {number} params.status - HTTP status code
 * @param {string} params.message - Error message
 * @param {Error} params.error - Original error object
 * @returns {string} Error type from ERROR_TYPES
 */
export function classify_error({ status, message, error }) {
  // Check HTTP status codes first
  if (status) {
    if (status >= 500 && status < 600) {
      return ERROR_TYPES.API_SERVER_ERROR;
    }
    if (status === 401 || status === 403) {
      return ERROR_TYPES.API_AUTH_ERROR;
    }
    if (status === 429) {
      return ERROR_TYPES.API_RATE_LIMIT;
    }
    if (status === 404) {
      return ERROR_TYPES.API_NOT_FOUND;
    }
    if (status === 400) {
      return ERROR_TYPES.API_BAD_REQUEST;
    }
  }

  // Check error message patterns
  const msg = (message || error?.message || '').toLowerCase();

  // Timeout errors
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
    return ERROR_TYPES.API_TIMEOUT;
  }

  // CORS errors
  if (msg.includes('cors') || msg.includes('cross-origin') || msg.includes('access-control')) {
    return ERROR_TYPES.CORS_ERROR;
  }

  // Network errors
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('connection')) {
    return ERROR_TYPES.NETWORK_ERROR;
  }

  // Parse errors
  if (msg.includes('parse') || msg.includes('json') || msg.includes('unexpected token') || 
      msg.includes('syntax') || msg.includes('unexpected response')) {
    return ERROR_TYPES.PARSE_ERROR;
  }

  // Auth errors in message
  if (msg.includes('unauthorized') || msg.includes('authentication') || msg.includes('invalid token') ||
      msg.includes('api key') || msg.includes('invalid_api_key')) {
    return ERROR_TYPES.API_AUTH_ERROR;
  }

  // Rate limit errors in message
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('quota')) {
    return ERROR_TYPES.API_RATE_LIMIT;
  }

  // Server errors in message
  if (msg.includes('internal server error') || msg.includes('service unavailable') || 
      msg.includes('bad gateway') || msg.includes('overloaded')) {
    return ERROR_TYPES.API_SERVER_ERROR;
  }

  return ERROR_TYPES.UNKNOWN_ERROR;
}

/**
 * Get user-friendly message for an error type
 * @param {string} errorType - Error type from ERROR_TYPES
 * @returns {string} User-friendly error message
 */
export function get_error_message(errorType) {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
}

/**
 * Check if an error should be reported to the production server
 * @param {string} errorType - Error type from ERROR_TYPES
 * @returns {boolean} True if error should be reported
 */
export function should_report_error(errorType) {
  return REPORTABLE_ERRORS.includes(errorType);
}

/**
 * Report an error to the production server
 * @param {Object} errorData - Error data to report
 * @param {string} errorData.error_type - Classified error type
 * @param {string} errorData.error_message - Error message
 * @param {string} errorData.api_url - API endpoint URL
 * @param {number} errorData.status_code - HTTP status code
 * @param {Object} errorData.request_body - Request body (sanitized)
 * @param {Object} errorData.response_body - Response body
 * @param {string} errorData.user_agent - Browser user agent
 * @returns {Promise<boolean>} True if report was sent successfully
 */
export async function report_error(errorData) {
  const REPORT_URL = 'https://nexusai.site/error_report.php';
  
  try {
    const response = await fetch(REPORT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...errorData,
        timestamp: new Date().toISOString(),
        app_version: '2.0.0'
      })
    });
    
    return response.ok;
  } catch (err) {
    console.error('Failed to report error:', err);
    return false;
  }
}

/**
 * Handle an error - classify, alert user, and optionally report
 * @param {Object} params - Error parameters
 * @param {number} params.status - HTTP status code
 * @param {string} params.message - Error message
 * @param {Error} params.error - Original error object
 * @param {string} params.api_url - API endpoint URL
 * @param {Object} params.request_body - Request body (will be sanitized)
 * @param {Object} params.response_body - Response body
 * @returns {Object} Processed error info with type, message, and whether it was reported
 */
export async function handle_error({ status, message, error, api_url, request_body, response_body }) {
  const error_type = classify_error({ status, message, error });
  const user_message = get_error_message(error_type);
  const should_report = should_report_error(error_type);
  
  let reported = false;
  
  if (should_report) {
    // Sanitize request body - remove tokens
    const sanitized_request = sanitize_request(request_body);
    
    reported = await report_error({
      error_type,
      error_message: message || error?.message,
      api_url,
      status_code: status,
      request_body: sanitized_request,
      response_body,
      user_agent: navigator.userAgent
    });
  }
  
  return {
    type: error_type,
    message: user_message,
    original_message: message || error?.message,
    reported,
    should_report
  };
}

/**
 * Sanitize request body - remove sensitive data like tokens
 * @param {Object} request - Request body object
 * @returns {Object} Sanitized request body
 */
function sanitize_request(request) {
  if (!request) return null;
  
  const sanitized = JSON.parse(JSON.stringify(request));
  
  // Remove common token/key field names
  const sensitive_fields = ['token', 'api_key', 'apiKey', 'api_token', 'apiToken', 
                           'authorization', 'Authorization', 'secret', 'password'];
  
  function remove_sensitive(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      if (sensitive_fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        remove_sensitive(obj[key]);
      }
    }
  }
  
  remove_sensitive(sanitized);
  return sanitized;
}

// Export constants for external use
export { ERROR_TYPES, ERROR_MESSAGES };
