/* Pollinations Adapter - Image generation endpoint */

import { BaseAdapter, helpers } from './base.js';

export class PollinationsAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'pollinations';
  }

  detect(url) {
    return url.includes('pollinations.ai/image/') || 
           url.includes('image.pollinations.ai') ||
           url.includes('gen.pollinations.ai/image');
  }

  build_request(messages, settings) {
    const last_message = messages.filter(m => m.role === 'user').pop();
    const prompt = last_message?.content || '';
    const encoded_prompt = encodeURIComponent(prompt);
    
    let base_url = settings.api_url || 'https://gen.pollinations.ai/image/';
    if (!base_url.endsWith('/')) base_url += '/';
    
    const params = new URLSearchParams();
    if (settings.model_name) params.set('model', settings.model_name);
    params.set('width', '1024');
    params.set('height', '1024');
    params.set('enhance', 'true');
    
    return {
      _pollinations_image: true,
      _pollinations_url: `${base_url}${encoded_prompt}?${params.toString()}`,
      _pollinations_method: 'GET'
    };
  }

  parse_response(response) {
    if (response.image_data) {
      return helpers.normalize_response({ content: response.image_data, finish_reason: 'stop' });
    }
    if (typeof response === 'string' && response.startsWith('data:image')) {
      return helpers.normalize_response({ content: response, finish_reason: 'stop' });
    }
    if (response._pollinations_url) {
      return helpers.normalize_response({ content: response._pollinations_url, finish_reason: 'stop' });
    }
    if (response.error) {
      return helpers.create_error_response(response.error);
    }
    return helpers.create_error_response('Unexpected response format');
  }

  get_method() {
    return 'GET';
  }

  get_headers(settings) {
    const headers = {};
    if (settings.api_token) headers['Authorization'] = `Bearer ${settings.api_token}`;
    return headers;
  }
}

export const pollinations_adapter = new PollinationsAdapter();
