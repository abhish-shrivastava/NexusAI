/* OpenAI-Compatible Adapter - Default adapter for OpenAI and compatible APIs */

import { BaseAdapter, helpers } from './base.js';

export class OpenAIAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'openai';
  }

  detect(url) {
    return true;
  }

  build_request(messages, settings) {
    const is_reasoning = settings.is_reasoning || 
                        /reason|o1-|o3-|deepseek-r/i.test(settings.model_name || '');

    const body = {
      model: settings.model_name || 'gpt-3.5-turbo',
      messages: messages
    };

    if (is_reasoning) {
      // 1. Remove standard penalties
      // 2. Map max_tokens to max_completion_tokens for o1/o3 models
      if (/^o[13]-/i.test(settings.model_name)) {
        body.max_completion_tokens = settings.max_tokens || 6000;
      } else {
        body.max_tokens = settings.max_tokens || 6000;
      }
      
      // Some providers still support temperature 1.0 for reasoning, 
      // but omitting it is safer for o1/o3.
      if (!/^o[13]-/i.test(settings.model_name)) {
         body.temperature = 1.0;
      }
    } else {
      body.max_tokens = settings.max_tokens || 6000;
      body.temperature = settings.temperature ?? 0.7;
      body.top_p = settings.top_p ?? 1.0;
      
      // Add optional penalties if they were in settings (future proofing)
      if (settings.frequency_penalty) body.frequency_penalty = settings.frequency_penalty;
      if (settings.presence_penalty) body.presence_penalty = settings.presence_penalty;
    }

    return body;
  }

  parse_response(response) {
    // 1. Check for proxy-wrapped image data first
    if (response.image_data) {
      return helpers.normalize_response({
        content: response.image_data,
        finish_reason: 'stop'
      });
    }

    // 2. Handle errors early
    if (response.error) {
      return helpers.create_error_response(
        response.error.message || response.error
      );
    }

    const choice = response.choices?.[0];
    if (!choice) {
      return helpers.create_error_response('No response from API');
    }

    const message = choice.message || choice.delta || {};
    
    // 3. Check for images in message (OpenRouter/FLUX style: message.images array)
    if (message.images && Array.isArray(message.images) && message.images.length > 0) {
      const image_content = this._extract_images_from_array(message.images);
      if (image_content) {
        return helpers.normalize_response({
          content: image_content,
          finish_reason: choice.finish_reason || 'stop',
          usage: response.usage
        });
      }
    }

    // 4. Check for image_url directly in message (some providers)
    if (message.image_url) {
      const url = typeof message.image_url === 'string' ? message.image_url : message.image_url.url;
      if (url) {
        return helpers.normalize_response({
          content: url,
          finish_reason: choice.finish_reason || 'stop',
          usage: response.usage
        });
      }
    }

    // 5. Check for image field directly (some providers)
    if (message.image) {
      const img = message.image.startsWith('data:') ? message.image : `data:image/png;base64,${message.image}`;
      return helpers.normalize_response({
        content: img,
        finish_reason: choice.finish_reason || 'stop',
        usage: response.usage
      });
    }

    // 6. Standard text content
    let content = message.content || '';
    
    // 7. Handle content_blocks (Anthropic style)
    if (message.content_blocks && Array.isArray(message.content_blocks)) {
      content = this._process_content_blocks(message.content_blocks);
    }
    
    return helpers.normalize_response({
      content: content,
      finish_reason: choice.finish_reason || 'stop',
      usage: response.usage
    });
  }

  /* Extract images from OpenRouter-style images array */
  _extract_images_from_array(images) {
    for (const img of images) {
      // OpenRouter format: { type: "image_url", image_url: { url: "data:..." } }
      if (img.type === 'image_url' && img.image_url?.url) {
        return img.image_url.url;
      }
      // Alternative: { url: "..." }
      if (img.url) {
        return img.url;
      }
      // Alternative: { b64_json: "..." }
      if (img.b64_json) {
        return `data:image/png;base64,${img.b64_json}`;
      }
    }
    return null;
  }

  /* Process content_blocks from multimodal responses */
  _process_content_blocks(blocks) {
    const parts = [];
    
    for (const block of blocks) {
      if (block.type === 'text') {
        parts.push(block.text || '');
      } else if (block.type === 'image_url') {
        // Handle inline image - could be base64 data URL or regular URL
        const image_url = block.image_url?.url || '';
        if (image_url) {
          // Insert as markdown image or raw data URL for rendering
          if (image_url.startsWith('data:image/')) {
            // Base64 image - wrap in special marker for rendering
            parts.push(`\n\n![Generated Image](${image_url})\n\n`);
          } else {
            // Regular URL
            parts.push(`\n\n![Image](${image_url})\n\n`);
          }
        }
      }
    }
    
    return parts.join('');
  }

  get_headers(settings) {
    const headers = { 'Content-Type': 'application/json' };
    if (settings.api_token) {
      headers['Authorization'] = `Bearer ${settings.api_token}`;
    }
    return headers;
  }
}

export const openai_adapter = new OpenAIAdapter();
