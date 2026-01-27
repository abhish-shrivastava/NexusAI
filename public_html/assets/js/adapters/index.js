/* NexusAI Adapter Registry */

import { OpenAIAdapter } from './openai.js';
import { HuggingFaceAdapter } from './huggingface.js';
import { PollinationsAdapter } from './pollinations.js';

const openai = new OpenAIAdapter();
const huggingface = new HuggingFaceAdapter();
const pollinations = new PollinationsAdapter();

/* Adapters in priority order (OpenAI is fallback) */
const ADAPTERS = [huggingface, pollinations, openai];

export function get_adapter(url) {
  if (!url) return openai;

  for (const adapter of ADAPTERS) {
    if (adapter.detect(url)) {
      console.log(`Using adapter: ${adapter.name} for ${url}`);
      return adapter;
    }
  }
  return openai;
}

export function has_llama_models(url) {
  if (!url) return false;
  const llama_platforms = [
    'openrouter.ai', 'together.xyz', 'api.together.ai',
    'router.huggingface.co', 'groq.com', 'api.groq.com',
    'fireworks.ai', 'anyscale.com'
  ];
  return llama_platforms.some(platform => url.includes(platform));
}

export { openai, huggingface, pollinations, ADAPTERS };
