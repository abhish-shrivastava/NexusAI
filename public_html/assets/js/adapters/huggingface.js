/* HuggingFace Adapter - Handles HuggingFace inference API for images */

import { BaseAdapter, helpers } from './base.js';
import { OpenAIAdapter } from './openai.js';

export class HuggingFaceAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'huggingface';
    this.openai_adapter = new OpenAIAdapter();
  }

  detect(url) {
    if (url.includes('api-inference.huggingface.co')) return true;
    if (url.includes('huggingface.co') && url.includes('/images/generations')) return true;
    return false;
  }

  build_request(messages, settings) {
    const last_message = messages.filter(m => m.role === 'user').pop();
    const prompt = last_message?.content || '';

    if (settings.api_url && settings.api_url.includes('/images/generations')) {
      return { prompt: prompt, model: settings.model_name || undefined };
    }

    const is_reasoning = settings.is_reasoning || 
                        /reason|o1-|o3-|deepseek-r/i.test(settings.model_name || '');

    const parameters = {
      max_new_tokens: settings.max_tokens || 1024,
      return_full_text: false
    };

    if (!is_reasoning) {
      parameters.temperature = settings.temperature ?? 0.7;
      parameters.top_p = settings.top_p ?? 1.0;
    }

    return {
      inputs: prompt,
      parameters: parameters
    };
  }

  parse_response(response) {
    // Handle image data (base64 from proxy)
    if (response.image_data) {
      return helpers.normalize_response({
        content: response.image_data,
        finish_reason: 'stop'
      });
    }

    // Handle async task response (image generation)
    if (response.task_status) {
      if (response.task_status === 'PROCESSING' || response.task_status === 'PENDING') {
        return {
          _async: true,
          task_id: response.id || response.request_id,
          task_status: response.task_status
        };
      }
      if (response.task_status === 'SUCCESS') {
        // Extract image from successful async response
        const image_url = response.result?.image_url || 
                         response.image_result?.[0]?.url ||
                         response.data?.[0]?.url || 
                         response.images?.[0]?.url ||
                         response.output?.image_url;
        if (image_url) {
          return helpers.normalize_response({
            content: image_url,
            finish_reason: 'stop'
          });
        }
        // Handle base64 image in result
        const image_b64 = response.result?.image || 
                         response.image_result?.[0]?.b64_json ||
                         response.data?.[0]?.b64_json ||
                         response.images?.[0]?.b64_json;
        if (image_b64) {
          const data_url = image_b64.startsWith('data:') ? image_b64 : `data:image/png;base64,${image_b64}`;
          return helpers.normalize_response({
            content: data_url,
            finish_reason: 'stop'
          });
        }
      }
      if (response.task_status === 'FAILED' || response.task_status === 'ERROR') {
        return helpers.create_error_response(response.error || response.message || 'Image generation failed');
      }
    }

    // Handle error
    if (response.error) {
      return helpers.create_error_response(response.error);
    }

    // Text generation response (array format)
    if (Array.isArray(response)) {
      const text = response[0]?.generated_text || '';
      return helpers.normalize_response({
        content: text,
        finish_reason: 'stop'
      });
    }

    // Single object response
    if (response.generated_text) {
      return helpers.normalize_response({
        content: response.generated_text,
        finish_reason: 'stop'
      });
    }

    return helpers.create_error_response('Unexpected response format');
  }

  get_poll_url(base_url, task_id) {
    if (base_url.includes('/async/')) {
      return base_url.replace(/\/async\/.*$/, `/async-result/${task_id}`);
    }
    return `${base_url}/${task_id}`;
  }

  get_headers(settings) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.api_token || ''}`,
      'x-wait-for-model': 'true',
      'x-use-cache': 'false'
    };
  }
}

export const huggingface_adapter = new HuggingFaceAdapter();
