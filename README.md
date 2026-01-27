# NexusAI

A browser-based tool to interact with AI applications, intended to work with **any OpenAI-compatible API**. Other platforms and services can also be integrated via custom adapters. 

You can access this app also online at https://nexusai.site

## Features

- **Multi-Platform** - OpenAI, OpenRouter, HuggingFace, Together.ai, Groq, Pollinations, and any OpenAI-compatible API
- **Multi-Tab** - Multiple conversations with different models with their own settings, context and memories.
- **Local Storage** - Everything is saved in the browser (IndexedDB)
- **Markdown & Code** - Syntax highlighting and math equations (KaTeX)
- **Image Generation** - Supports image generation from all OpenAI compatible platforms (like OpenRouter). Also APIs from Pollinations and HuggingFace. Other platforms can be added via custom adapters.
- **Smart Context** - Auto-summarizes long conversations to manage token limits

## Requirements

- **PHP 7.4+** with cURL extension
- **Web server** to run PHP

> **Why PHP?** Most AI APIs block direct browser requests (CORS). The PHP proxy forwards your requests server-side. In case, your platform supports CORS, you can enable direct requests in settings.

## Installation

1. Clone to your web server directory:
   ```bash
   git clone https://github.com/abhish-shrivastava/nexusai.git
   ```

2. (Optional) Create `config.php` from `resources/config.php.example` as a template to customize summarization settings from the server side if needed.

3. Start a local PHP server from the project root:
   ```bash
   php -S localhost:8000 -t public_html

## Some popular examples to confuigre endpoints in the settings:

| Platform | Endpoint 
|----------|----------
| OpenAI | `https://api.openai.com/v1/chat/completions` 
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` 
| HuggingFace | `https://router.huggingface.co/v1/chat/completions` 
| Together.ai | `https://api.together.xyz/v1/chat/completions` 
| Groq | `https://api.groq.com/openai/v1/chat/completions` 
| Pollinations | `https://text.pollinations.ai/v1/chat/completions` 
| Fireworks.ai | `https://api.fireworks.ai/inference/v1/chat/completions` 

**Image Generation:**
Check the documentation in platforms. For ex, Pollinations uses `https://gen.pollinations.ai/image`, OpenRouter has the same endpoint as chat completions. Other platforms may require creating custom adapters.

## Project Structure

```
nexusai/
├── public_html/
│   ├── index.html        # Main application
│   ├── api.php           # PHP proxy for CORS bypass
│   └── assets/
│       ├── css/          # Stylesheets
│       └── js/
│           ├── main.js   # Entry point
│           ├── gui.js    # UI management
│           ├── api.js    # API orchestration
│           ├── storage.js # IndexedDB operations
│           └── adapters/ # Platform adapters
└── resources/
    └── config.php        # (optional) server configuration file
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `F2` | Rename tab |

## Context Summarization

For long conversations, older messages are automatically summarized to fit within token limits. The model used for summarization is Llama 3.1 8B by default (you can change this in config.php). The platform used for summarization will be determined in the following order:

1. **User's platform** - If the user's platform supports Llama 3.1 8B.
2. **Server fallback** - If not, the server-side configuration in `config.php` (if created) is used. 

## Contributing

To add support for a new platform, see [adapters/CONTRIBUTING.md](public_html/assets/js/adapters/CONTRIBUTING.md).

## License

MIT
