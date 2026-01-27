# // This guide is written by Claude Sonnet //

# Contributing New Platform Adapters

This guide explains how to add support for new AI platforms to NexusAI.

## Architecture Overview

NexusAI uses an **adapter pattern** to support multiple AI platforms. The key insight is that **most platforms are OpenAI-compatible** - they accept the same request format and return the same response format as OpenAI's Chat Completions API.

### When to Create a New Adapter

You only need a new adapter if the platform:

1. **Has a non-OpenAI endpoint** (e.g., image generation with different schema)
2. **Requires special request transformations**
3. **Returns responses in a different format**

If the platform uses OpenAI's `/v1/chat/completions` format, it works out of the box!

## File Structure

```
public_html/assets/js/
├── adapters/
│   ├── base.js          # Abstract base class (don't modify)
│   ├── openai.js        # Default OpenAI-compatible adapter
│   ├── huggingface.js   # HuggingFace-specific (images only)
│   ├── pollinations.js  # Pollinations-specific (images only)
│   └── index.js         # Adapter registry (add your adapter here)
├── api.js               # Main API orchestration
├── gui.js               # UI management
├── storage.js           # IndexedDB operations
└── main.js              # Entry point
```

## Creating a New Adapter

### Step 1: Create the Adapter File

Create `adapters/yourplatform.js`:

```javascript
/**
 * YourPlatform Adapter
 * Support for YourPlatform-specific endpoints
 */

import { BaseAdapter } from './base.js';
import { OpenAIAdapter } from './openai.js';

export class YourPlatformAdapter extends BaseAdapter {
  constructor() {
    super();
    // Reuse OpenAI adapter for compatible endpoints
    this.openai_adapter = new OpenAIAdapter();
  }

  /**
   * Detect if this adapter should handle the URL
   * Return true ONLY for non-OpenAI-compatible endpoints
   */
  detect(url) {
    // Example: only handle special image endpoint
    return url.includes('yourplatform.com/special-endpoint');
  }

  /**
   * Build the request for your platform
   */
  build_request(messages, settings) {
    // Transform to your platform's schema
    return {
      // Your platform's specific format
      prompt: messages[messages.length - 1].content,
      custom_param: settings.model_name
    };
  }

  /**
   * Parse the response from your platform
   */
  parse_response(response) {
    // Transform to normalized format
    return this.normalize_response({
      content: response.output || response.result,
      finish_reason: 'stop'
    });
  }

  /**
   * Get headers for your platform
   */
  get_headers(settings) {
    return {
      'Authorization': `Bearer ${settings.api_token}`,
      'Content-Type': 'application/json',
      // Add platform-specific headers
      'X-Custom-Header': 'value'
    };
  }

  /**
   * Optional: Override HTTP method (default is POST)
   */
  get_method() {
    return 'POST'; // or 'GET' for some endpoints
  }
}

export default YourPlatformAdapter;
```

### Step 2: Register the Adapter

Edit `adapters/index.js`:

```javascript
import { OpenAIAdapter } from './openai.js';
import { HuggingFaceAdapter } from './huggingface.js';
import { PollinationsAdapter } from './pollinations.js';
import { YourPlatformAdapter } from './yourplatform.js';  // Add this

// ... existing code ...

// Register adapters (specific first, OpenAI last as fallback)
registry.register(new HuggingFaceAdapter());
registry.register(new PollinationsAdapter());
registry.register(new YourPlatformAdapter());  // Add this
registry.register(new OpenAIAdapter());  // Always last (fallback)
```

### Step 3: Test Your Adapter

1. Open `index.html` in your browser
2. Create a new tab
3. Enter your platform's API URL and credentials
4. Send a test message
5. Verify the response is correctly parsed

## Common Patterns

### Delegating to OpenAI Adapter

If your platform has multiple endpoints, some OpenAI-compatible:

```javascript
detect(url) {
  // Only handle the non-compatible endpoint
  return url.includes('yourplatform.com/special');
}

// For compatible endpoints, OpenAI adapter handles them automatically
```

### Handling Binary Responses (Images)

```javascript
parse_response(response) {
  // Check if response is binary (image)
  if (response.type === 'image') {
    return this.normalize_response({
      content: response.data, // base64 data URL
      finish_reason: 'stop'
    });
  }
  // Handle text response
  return this.normalize_response({
    content: response.text,
    finish_reason: 'stop'
  });
}
```

### Platform-Specific Headers

```javascript
get_headers(settings) {
  const headers = {
    'Authorization': `Bearer ${settings.api_token}`,
    'Content-Type': 'application/json'
  };
  
  // Example: HuggingFace-specific headers
  if (settings.api_url.includes('huggingface')) {
    headers['x-wait-for-model'] = 'true';
    headers['x-use-cache'] = 'false';
  }
  
  return headers;
}
```

## Testing Checklist

- [ ] Adapter detects correct URLs
- [ ] Request is properly transformed
- [ ] Response is correctly parsed
- [ ] Error handling works
- [ ] Continue button works (for long responses)
- [ ] Image responses display correctly (if applicable)

## Supported Platforms

Currently supported out-of-the-box (OpenAI-compatible):
- OpenAI
- OpenRouter
- HuggingFace (router.huggingface.co)
- Pollinations (chat endpoint)
- Together.ai
- Anyscale
- Fireworks.ai
- Groq
- Requesty
- Any OpenAI-compatible endpoint

Special handling:
- HuggingFace Inference API (images)
- Pollinations Image API

## Need Help?

- Check existing adapters for examples
- Open an issue on GitHub
- Review the `BaseAdapter` class documentation in `base.js`

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
