/* NexusAI API Module - Request orchestration and context management */

import { get_adapter, has_llama_models } from './adapters/index.js';
import { helpers } from './adapters/base.js';

const CONFIG = {
  PROXY_URL: 'api.php',
  SUMMARIZE_URL: 'api.php',
  DEFAULT_CONTEXT_MESSAGES: 30,
  SUMMARIZATION_MODEL: 'google/gemma-3-12b-it:free',
  SUMMARIZATION_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions'
};

/* Extract error message from various error response formats */
function extract_error_message(data) {
  // Handle {error: {message: "..."}} format (Pollinations, OpenAI style)
  if (data?.error?.message) {
    return data.error.message;
  }
  // Handle {error: "string"} format
  if (typeof data?.error === 'string') {
    return data.error;
  }
  // Handle {message: "..."} format
  if (data?.message) {
    return data.message;
  }
  // Handle {error: {code: "..."}} format - use code as fallback
  if (data?.error?.code) {
    return `Error: ${data.error.code}`;
  }
  // Fallback
  return 'Request failed';
}

/* Send a chat message */
export async function send_chat_message(tab_id, user_message, settings, context = {}) {
  const { messages = [], context_summaries = [], signal } = context;

  try {
    const context_messages = await build_context(messages, settings, context_summaries);
    const api_messages = [];
    
    if (settings.system_prompt) {
      api_messages.push({ role: 'system', content: settings.system_prompt });
    }
    api_messages.push(...context_messages);

    const response = await send_request({ messages: api_messages }, settings, signal);
    
    return response;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('send_chat_message error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message'
    };
  }
}

/* Continue a truncated response */
export async function continue_response(tab_id, settings, context = {}) {
  const { messages = [], signal } = context;

  try {
    const api_messages = [];
    
    if (settings.system_prompt) {
      api_messages.push({ role: 'system', content: settings.system_prompt });
    }

    const recent = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
    api_messages.push(...recent);
    api_messages.push({ role: 'user', content: 'Please continue from where you left off.' });

    const response = await send_request({ messages: api_messages }, settings, signal);
    
    return response;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('continue_response error:', error);
    return {
      success: false,
      error: error.message || 'Failed to continue response'
    };
  }
}

/* Send request to AI API */
async function send_request(payload, settings, signal = null) {
  const adapter = get_adapter(settings.api_url);
  
  try {
    const request_data = adapter.build_request(payload.messages, settings);
    const headers = adapter.get_headers(settings);
    const method = adapter.get_method ? adapter.get_method() : 'POST';
    const use_direct = settings.direct_api;
    
    let response;
    if (use_direct) {
      response = await execute_direct_request(settings.api_url, request_data, headers, method, signal);
    } else {
      response = await execute_proxy_request(settings.api_url, request_data, headers, method, signal);
    }

    let parsed = adapter.parse_response(response.data);
    
    if (parsed._async && parsed.task_id) {
      console.log('Async task detected, polling...', parsed.task_id);
      parsed = await poll_for_result(adapter, settings, parsed.task_id, headers, use_direct, signal);
    }
    
    return {
      success: true,
      content: parsed.content,
      finish_reason: parsed.finish_reason,
      usage: parsed.usage
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    
    console.error('API request failed:', error);
    
    // Check for CORS error
    if (error.message?.includes('CORS') || error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'CORS error: Please disable "Direct API" in settings to use the proxy.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Request failed'
    };
  }
}

/* Poll for async task result */
async function poll_for_result(adapter, settings, task_id, headers, use_direct, signal) {
  const MAX_POLLS = 60;
  const POLL_INTERVAL = 2000;
  
  const poll_url = adapter.get_poll_url ? 
    adapter.get_poll_url(settings.api_url, task_id) : 
    `${settings.api_url}/${task_id}`;
  
  console.log('Polling URL:', poll_url);
  
  for (let i = 0; i < MAX_POLLS; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    
    if (i > 0) await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    
    try {
      let response;
      if (use_direct) {
        response = await execute_direct_request(poll_url, null, headers, 'GET', signal);
      } else {
        response = await execute_proxy_request(poll_url, null, headers, 'GET', signal);
      }
      
      const parsed = adapter.parse_response(response.data);
      
      if (parsed._async) {
        console.log(`Poll ${i + 1}/${MAX_POLLS}: Processing...`);
        continue;
      }
      return parsed;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error(`Poll ${i + 1} failed:`, error);
    }
  }
  
  throw new Error('Image generation timed out after 2 minutes');
}

/* Execute request directly (bypassing proxy) */
async function execute_direct_request(url, body, headers, method, signal) {
  const fetch_options = {
    method: method,
    headers: headers,
    signal: signal
  };

  if (body && method !== 'GET') {
    fetch_options.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetch_options);
  const content_type = response.headers.get('content-type') || '';

  if (!response.ok) {
    const error_data = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error_data.error?.message || error_data.error || `HTTP ${response.status}`);
  }

  let data;
  if (content_type.includes('image/')) {
    const blob = await response.blob();
    data = await blob_to_data_url(blob);
  } else {
    data = await response.json();
  }

  return { data, content_type };
}

/* Execute request through PHP proxy */
async function execute_proxy_request(url, body, headers, method, signal) {
  /* Pollinations image requests */
  if (body && body._pollinations_image) {
    const proxy_payload = {
      url: body._pollinations_url,
      method: 'GET',
      token: headers['Authorization']?.replace('Bearer ', '') || ''
    };

    const response = await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxy_payload),
      signal: signal
    });

    const content_type = response.headers.get('content-type') || '';

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(extract_error_message(error_data));
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(extract_error_message(result));
    }

    if (result.type === 'image' && result.data) {
      return {
        data: { image_data: result.data },
        content_type: 'image/*'
      };
    }

    return { data: result, content_type };
  }

  // Handle GET requests (for polling async results)
  if (method === 'GET' || !body) {
    const proxy_payload = {
      url: url,
      method: 'GET',
      token: headers['Authorization']?.replace('Bearer ', '') || ''
    };

    const response = await fetch(CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxy_payload),
      signal: signal
    });

    const content_type = response.headers.get('content-type') || '';

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(extract_error_message(error_data));
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(extract_error_message(result));
    }

    if (result.type === 'image' && result.data) {
      return {
        data: { image_data: result.data },
        content_type: 'image/*'
      };
    }

    return { data: result, content_type };
  }

  const proxy_payload = {
    url: url,
    body: body,
    token: headers['Authorization']?.replace('Bearer ', '') || ''
  };

  const response = await fetch(CONFIG.PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(proxy_payload),
    signal: signal
  });

  const content_type = response.headers.get('content-type') || '';
  
  if (!response.ok) {
    const error_data = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(extract_error_message(error_data));
  }

  const result = await response.json();
  
  if (result.error) throw new Error(extract_error_message(result));

  if (result.type === 'image' && result.data) {
    return {
      data: { image_data: result.data },
      content_type: 'image/*'
    };
  }

  return {
    data: result,
    content_type: content_type
  };
}

function blob_to_data_url(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* Context Management */

async function build_context(all_messages, settings, stored_summaries = []) {
  const context_limit = settings.context_messages || CONFIG.DEFAULT_CONTEXT_MESSAGES;
  const valid_messages = all_messages.filter(msg => msg.content && msg.role);
  
  if (valid_messages.length <= context_limit) {
    return format_messages_for_api(valid_messages);
  }

  const recent_messages = valid_messages.slice(-context_limit);
  const context = [];
  
  if (stored_summaries.length > 0) {
    const summary_text = stored_summaries.map(s => s.summary).join('\n\n');
    context.push({
      role: 'system',
      content: `Previous conversation context:\n${summary_text}`
    });
  }

  context.push(...format_messages_for_api(recent_messages));
  
  return context;
}

function format_messages_for_api(messages) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/* Summarize messages via server */
export async function summarize_messages(messages, settings) {
  const response = await fetch(CONFIG.SUMMARIZE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'summarize',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      api_url: settings.api_url,
      token: settings.api_token
    })
  });

  if (!response.ok) {
    throw new Error('Summarization request failed');
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Summarization failed');
  }

  return result.summary;
}

/* Utility Functions */

export function validate_settings(settings) {
  if (!settings.api_url) {
    return { valid: false, error: 'API URL is required' };
  }

  try {
    new URL(settings.api_url);
  } catch {
    return { valid: false, error: 'Invalid API URL format' };
  }

  return { valid: true };
}

export async function test_connection(settings) {
  const validation = validate_settings(settings);
  if (!validation.valid) {
    return { success: false, message: validation.error };
  }

  try {
    const response = await send_request(
      { messages: [{ role: 'user', content: 'Hello' }] },
      { ...settings, max_tokens: 10 }
    );

    if (!response.success) {
      return { success: false, message: response.error };
    }

    return { success: true, message: 'Connection successful!' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Export config for external use
export { CONFIG };
