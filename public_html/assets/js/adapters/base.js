/* NexusAI Base Adapter - Helper functions for adapters */

export const helpers = {
  normalize_response(data) {
    return {
      content: data.content || '',
      finish_reason: data.finish_reason || 'stop',
      usage: data.usage || null,
      error: data.error || null
    };
  },

  create_error_response(message, error = null) {
    return {
      content: '',
      finish_reason: 'error',
      usage: null,
      error: { message: message, original: error }
    };
  }
};

/* Base adapter class - extend for new adapters */
export class BaseAdapter {
  constructor() {
    this.name = 'base';
  }

  detect(url) {
    return false;
  }

  build_request(messages, settings) {
    throw new Error('build_request must be implemented');
  }

  parse_response(response) {
    throw new Error('parse_response must be implemented');
  }

  get_headers(settings) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.api_token || ''}`
    };
  }

  get_method() {
    return 'POST';
  }
}
