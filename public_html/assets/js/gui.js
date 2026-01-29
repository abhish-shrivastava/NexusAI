/* NexusAI GUI Module - UI rendering, tab management, user interactions */

import { storage } from './storage.js';
import { send_chat_message, continue_response } from './api.js';

/* Application State */
export const app_state = {
  tabs: [],
  active_tab_id: null,
  tab_counter: 0,
  is_dark_mode: false,
  pending_requests: new Map(),
  pending_attachments: new Map()
};

/* Model Presets */
const MODEL_PRESETS = {
  'gemma-27b': {
    id: 'gemma-27b',
    label: '🌸 Gemma (Thoughtful Helper)',
    category: 'general',
    model_name: 'google/gemma-3-27b-it',
    api_url: 'https://openrouter.ai/api/v1/chat/completions',
    platform: 'openrouter',
    system_prompt: `You are Gemma, a thoughtful and empathetic AI assistant. You approach every question with genuine curiosity and care. You explain complex topics in accessible ways, often using helpful analogies. You're patient, encouraging, and always aim to help users understand, not just get answers. When you're uncertain, you say so honestly.`
  },
  'llama-70b': {
    id: 'llama-70b',
    label: '🦙 Llama 3.3 (Versatile Genius)',
    category: 'general',
    model_name: 'meta-llama/Llama-3.3-70B-Instruct',
    api_url: 'https://router.huggingface.co/v1/chat/completions',
    platform: 'huggingface',
    system_prompt: `You are a highly capable AI assistant powered by Llama 3.3. You excel at reasoning through complex problems, writing, analysis, and creative tasks. You're direct and efficient in your responses while remaining helpful and thorough. You break down complex topics systematically and provide actionable insights.`
  },
  'gpt-oss-120b': {
    id: 'gpt-oss-120b',
    label: '🧠 GPT-OSS 120B (Deep Thinker)',
    category: 'general',
    model_name: 'openai/gpt-oss-120b',
    api_url: 'https://router.huggingface.co/v1/chat/completions',
    platform: 'huggingface',
    is_reasoning: true,
    system_prompt: `You are an advanced AI reasoning assistant. You excel at deep analysis, nuanced thinking, and exploring ideas from multiple perspectives. You don't rush to conclusions—you think step by step, consider edge cases, and provide comprehensive, well-structured responses. You're great at research, writing, and solving complex problems.`
  },
  'mimo-v2': {
    id: 'mimo-v2',
    label: '📱 Gemini 2.5 flash lite (Quick & Friendly)',
    category: 'general',
    model_name: 'google/gemini-2.5-flash-lite',
    api_url: 'https://openrouter.ai/api/v1/chat/completions',
    platform: 'openrouter',
    system_prompt: `You are a fast and friendly AI assistant! You're enthusiastic, helpful, and get straight to the point. You love making complex things simple and always aim to be practical and useful. Your responses are concise but complete. You use emojis sparingly to add warmth. Help the user to solve problems!`
  },
  'deepseek-pollinations': {
    id: 'deepseek-pollinations',
    label: '🔮 DeepSeek (Curious Explorer)',
    category: 'general',
    model_name: 'deepseek',
    api_url: 'https://gen.pollinations.ai/v1/chat/completions',
    platform: 'pollinations',
    system_prompt: `You are DeepSeek, an AI with boundless curiosity and a love for exploration. You dive deep into topics, uncovering interesting connections and insights. You're enthusiastic about learning and sharing knowledge. You often provide fascinating context or "did you know" tidbits that make conversations richer and more engaging.`
  },
  'minimax-m2': {
    id: 'minimax-m2',
    label: '💻 MiniMax M2.1 (Code Architect)',
    category: 'coding',
    model_name: 'MiniMaxAI/MiniMax-M2.1',
    api_url: 'https://router.huggingface.co/v1/chat/completions',
    platform: 'huggingface',
    system_prompt: `You are a senior software architect and coding expert. You write clean, efficient, well-documented code. You follow best practices, design patterns, and SOLID principles. When reviewing code, you're thorough but constructive. You explain your reasoning and suggest improvements. You're proficient in multiple languages but adapt your style to the project's conventions. Always include comments for complex logic.`
  },
  'grok-4-fast': {
    id: 'grok-4-fast',
    label: '⚡ Grok 4.1 (Speed Coder)',
    category: 'coding',
    model_name: 'x-ai/grok-4.1-fast',
    api_url: 'https://openrouter.ai/api/v1/chat/completions',
    platform: 'openrouter',
    is_reasoning: true,
    system_prompt: `You are Grok, a lightning-fast coding assistant with a hint of wit. You write code that's not just functional but elegant. You're direct—no fluff, just solutions. You anticipate follow-up questions and address edge cases proactively. You love a good optimization challenge and aren't afraid to suggest a completely different approach if it's better. Ship it! 🚀`
  },
  'perplexity-fast': {
    id: 'perplexity-fast',
    label: '🔍 Perplexity (Research Pro)',
    category: 'search',
    model_name: 'perplexity-fast',
    api_url: 'https://gen.pollinations.ai/v1/chat/completions',
    platform: 'pollinations',
    system_prompt: `You are a research-focused AI assistant optimized for finding and synthesizing information. You provide accurate, well-sourced answers. When answering questions, you structure your response clearly with key facts upfront. You distinguish between well-established facts and emerging information. You cite sources when possible and acknowledge limitations in your knowledge.`
  },
  'zimage-pollinations': {
    id: 'zimage-pollinations',
    label: '🎨 ZImage (Artistic Creator)',
    category: 'image',
    model_name: 'zimage',
    api_url: 'https://gen.pollinations.ai/image/',
    platform: 'pollinations-image',
    system_prompt: `You are an AI image generation assistant using the ZImage model. When users describe what they want to see, interpret their request creatively and generate beautiful, artistic images. If a prompt is vague, ask clarifying questions about style, mood, colors, or composition. You can suggest enhancements to make images more striking.`
  },
  'flux-klein': {
    id: 'flux-klein',
    label: '✨ FLUX Klein (Fast Artist)',
    category: 'image',
    model_name: 'black-forest-labs/flux.2-klein-4b',
    api_url: 'https://openrouter.ai/api/v1/chat/completions',
    platform: 'openrouter',
    system_prompt: `You are an AI assistant with image generation capabilities powered by FLUX Klein. You help users create images by understanding their vision and translating it into effective prompts. You're knowledgeable about art styles, composition, lighting, and visual aesthetics. Guide users to get the best results from their image requests.`
  },
  'turbo-pollinations': {
    id: 'turbo-pollinations',
    label: '🚀 Turbo (Speed Artist)',
    category: 'image',
    model_name: 'turbo',
    api_url: 'https://gen.pollinations.ai/image/',
    platform: 'pollinations-image',
    system_prompt: `You are an AI image generation assistant using the Turbo model—optimized for speed without sacrificing quality. You quickly interpret user requests and generate images in seconds. Perfect for rapid prototyping, brainstorming visual ideas, or when users need fast iterations. You're efficient and practical in your suggestions.`
  }
};

const PRESET_CATEGORIES = {
  recent: '⏱️ Recently Used',
  general: '💬 General Chat',
  coding: '👨‍💻 Coding',
  search: '🔎 Search',
  image: '🖼️ Image Generation'
};

const MAX_RECENT_PRESETS = 6;

/* DOM Elements Cache */
const dom = {
  tab_list: null,
  tab_add_btn: null,
  tab_panels: null,
  toast_container: null,
  header_toggle: null,
  header_content: null,
  templates: {}
};

/* SVG Icons */
const ICONS = {
  copy: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  'x-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  eye: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  'eye-off': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
  sun: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  moon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
  refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
  image: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
  user: 'U',
  ai: 'AI'
};

export function get_icon(name) {
  return ICONS[name] || '';
}

/* Utility Functions */

export function generate_id() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'tab_' + crypto.randomUUID();
  }
  return 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

export function escape_html(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function format_time(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function get_tab_id_from_element(el) {
  const panel = el.closest('.tab-panel');
  return panel?.getAttribute('data-tab-id');
}

async function copy_to_clipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    show_toast('Copied to clipboard!', 'success');
    if (button) {
      const original_html = button.innerHTML;
      button.innerHTML = ICONS.check;
      button.classList.add('copied');
      setTimeout(() => {
        button.innerHTML = original_html;
        button.classList.remove('copied');
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    show_toast('Failed to copy to clipboard', 'error');
  }
}

export function show_toast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? ICONS['check-circle'] : ICONS['x-circle']}</span>
    <span class="toast-message">${escape_html(message)}</span>
  `;
  dom.toast_container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-slide-in 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* Preset Management */

function get_recent_presets() {
  try {
    const stored = localStorage.getItem('nexusai_recent_presets');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map(item => typeof item === 'string' ? { id: item, token: '' } : item);
  } catch (e) {
    return [];
  }
}

function add_to_recent_presets(preset_id, token = '') {
  try {
    let recent = get_recent_presets();
    recent = recent.filter(item => item.id !== preset_id);
    recent.unshift({ id: preset_id, token });
    recent = recent.slice(0, MAX_RECENT_PRESETS);
    localStorage.setItem('nexusai_recent_presets', JSON.stringify(recent));
  } catch (e) {
    console.warn('Could not save recent preset:', e);
  }
}

function apply_preset(tab_id, preset_id) {
  const preset = MODEL_PRESETS[preset_id];
  if (!preset) return;

  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab) return;

  const recent = get_recent_presets();
  const recent_entry = recent.find(item => item.id === preset_id);
  const saved_token = recent_entry?.token || '';

  const panel = document.getElementById(`panel-${tab_id}`);
  if (!panel) return;

  const model_input = panel.querySelector('[data-field="model-name"]');
  const api_url_input = panel.querySelector('[data-field="api-url"]');
  const api_token_input = panel.querySelector('[data-field="api-token"]');
  const system_prompt_input = panel.querySelector('[data-field="system-prompt"]');
  const is_reasoning_input = panel.querySelector('[data-field="is-reasoning"]');

  if (model_input) model_input.value = preset.model_name;
  if (api_url_input) api_url_input.value = preset.api_url;
  if (api_token_input && saved_token) api_token_input.value = saved_token;
  if (system_prompt_input) system_prompt_input.value = preset.system_prompt;
  if (is_reasoning_input) is_reasoning_input.checked = !!preset.is_reasoning;

  tab.settings.model_name = preset.model_name;
  tab.settings.api_url = preset.api_url;
  tab.settings.system_prompt = preset.system_prompt;
  tab.settings.is_reasoning = !!preset.is_reasoning;
  if (saved_token) tab.settings.api_token = saved_token;

  storage.save_tab_data(tab).catch(err => console.error('Failed to save preset settings:', err));

  const current_token = api_token_input?.value || saved_token;
  add_to_recent_presets(preset_id, current_token);
  update_all_preset_selectors();
  show_toast(`Applied: ${preset.label}`, 'success');
}

function build_preset_options() {
  const recent = get_recent_presets();
  let html = '<option value="">Select a preset...</option>';

  if (recent.length > 0) {
    html += `<optgroup label="${PRESET_CATEGORIES.recent}">`;
    recent.forEach(item => {
      const preset = MODEL_PRESETS[item.id];
      if (preset) html += `<option value="${preset.id}">${preset.label}</option>`;
    });
    html += '</optgroup>';
  }

  ['general', 'coding', 'search', 'image'].forEach(category => {
    const presets = Object.values(MODEL_PRESETS).filter(p => p.category === category);
    if (presets.length > 0) {
      html += `<optgroup label="${PRESET_CATEGORIES[category]}">`;
      presets.forEach(preset => html += `<option value="${preset.id}">${preset.label}</option>`);
      html += '</optgroup>';
    }
  });

  return html;
}

function update_all_preset_selectors() {
  const html = build_preset_options();
  document.querySelectorAll('.preset-select').forEach(select => {
    const val = select.value;
    select.innerHTML = html;
    select.value = val;
  });
}

/* Tab Management */

export function create_tab(options = {}) {
  app_state.tab_counter++;

  const tab = {
    id: options.id || generate_id(),
    name: options.name || `Chat ${app_state.tab_counter}`,
    created_at: options.created_at || Date.now(),
    settings: options.settings || {
      model_name: '',
      api_url: '',
      api_token: '',
      system_prompt: '',
      temperature: 0.7,
      top_p: 1.0,
      max_tokens: 6000,
      context_messages: 30,
      direct_api: false,
      is_reasoning: false
    },
    messages: options.messages || [],
    context_summaries: options.context_summaries || [],
    last_finish_reason: null
  };

  app_state.tabs.push(tab);
  render_tab_button(tab);
  render_tab_panel(tab);

  storage.save_tab_data(tab).catch(err => console.error('Failed to save tab:', err));
  return tab;
}

function render_tab_button(tab) {
  const frag = dom.templates.tab_button.content.cloneNode(true);
  const li = frag.querySelector('.tab-item');

  li.id = `tab-${tab.id}`;
  li.setAttribute('data-tab-id', tab.id);
  li.setAttribute('aria-controls', `panel-${tab.id}`);
  li.querySelector('.tab-name').textContent = tab.name;
  li.querySelector('.tab-close').setAttribute('aria-label', `Close ${tab.name}`);

  dom.tab_list.appendChild(frag);
}

function render_tab_panel(tab) {
  const frag = dom.templates.tab_panel.content.cloneNode(true);
  const panel = frag.querySelector('.tab-panel');

  panel.id = `panel-${tab.id}`;
  panel.setAttribute('data-tab-id', tab.id);
  panel.setAttribute('aria-labelledby', `tab-${tab.id}`);

  const settings_header = panel.querySelector('[data-field="settings-header"]');
  const settings_body = panel.querySelector('[data-field="settings-body"]');
  if (settings_header && settings_body) {
    settings_body.id = `settings-body-${tab.id}`;
    settings_header.setAttribute('aria-controls', settings_body.id);
  }

  const advanced_toggle = panel.querySelector('[data-action="toggle-advanced"]');
  const advanced_settings = panel.querySelector('[data-field="advanced-settings"]');
  if (advanced_toggle && advanced_settings) {
    advanced_settings.id = `advanced-settings-${tab.id}`;
    advanced_toggle.setAttribute('aria-controls', advanced_settings.id);
  }

  const preset_select = panel.querySelector('[data-field="preset-select"]');
  if (preset_select) preset_select.innerHTML = build_preset_options();

  populate_settings(panel, tab.settings);

  const theme_toggle = panel.querySelector('[data-field="theme-toggle"]');
  if (theme_toggle) theme_toggle.checked = app_state.is_dark_mode;

  dom.tab_panels.appendChild(frag);

  if (tab.messages.length > 0) {
    const empty_state = panel.querySelector('[data-field="empty-state"]');
    if (empty_state) empty_state.style.display = 'none';
    tab.messages.forEach(msg => render_message(tab.id, msg));
    update_retry_buttons(tab.id);

    if (tab.last_finish_reason === 'length') {
      show_continue_button(tab.id);
    }

    const messages_container = panel.querySelector('[data-field="chat-messages"]');
    if (messages_container) {
      setTimeout(() => messages_container.scrollTop = messages_container.scrollHeight, 0);
    }
  }

  update_settings_header_indicator(tab.id);
}

function populate_settings(panel, settings) {
  const fields = {
    'model-name': settings.model_name,
    'api-url': settings.api_url,
    'api-token': settings.api_token,
    'system-prompt': settings.system_prompt,
    'temperature': settings.temperature,
    'top-p': settings.top_p,
    'max-tokens': settings.max_tokens,
    'context-messages': settings.context_messages,
    'direct-api': settings.direct_api,
    'is-reasoning': settings.is_reasoning
  };

  for (const [field, value] of Object.entries(fields)) {
    const el = panel.querySelector(`[data-field="${field}"]`);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = value;
    } else {
      el.value = value;
    }
  }

  const temp_val = panel.querySelector('[data-field="temperature-value"]');
  if (temp_val) temp_val.textContent = settings.temperature;
  const top_p_val = panel.querySelector('[data-field="top-p-value"]');
  if (top_p_val) top_p_val.textContent = settings.top_p;
}

export function activate_tab(tab_id) {
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('tabindex', '-1');
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
  });

  const tab_button = document.getElementById(`tab-${tab_id}`);
  const tab_panel = document.getElementById(`panel-${tab_id}`);

  if (tab_button && tab_panel) {
    tab_button.classList.add('active');
    tab_button.setAttribute('aria-selected', 'true');
    tab_button.setAttribute('tabindex', '0');
    tab_button.focus();
    tab_panel.classList.add('active');
    tab_panel.setAttribute('aria-hidden', 'false');
  }

  app_state.active_tab_id = tab_id;
}

export function close_tab(tab_id) {
  const tab_index = app_state.tabs.findIndex(t => t.id === tab_id);
  if (tab_index === -1) return;

  const abort_controller = app_state.pending_requests.get(tab_id);
  if (abort_controller) {
    abort_controller.abort();
    app_state.pending_requests.delete(tab_id);
  }

  document.getElementById(`tab-${tab_id}`)?.remove();
  document.getElementById(`panel-${tab_id}`)?.remove();

  app_state.tabs.splice(tab_index, 1);
  storage.delete_tab_data(tab_id).catch(err => console.error('Failed to delete tab data:', err));

  if (app_state.tabs.length === 0) {
    const new_tab = create_tab();
    activate_tab(new_tab.id);
  } else if (app_state.active_tab_id === tab_id) {
    const new_index = Math.min(tab_index, app_state.tabs.length - 1);
    activate_tab(app_state.tabs[new_index].id);
  }
}

function start_tab_rename(tab_id) {
  const tab_button = document.getElementById(`tab-${tab_id}`);
  if (!tab_button) return;

  const tab_name = tab_button.querySelector('.tab-name');
  if (!tab_name) return;

  const original_name = tab_name.textContent;
  tab_name.setAttribute('contenteditable', 'true');
  tab_name.focus();

  const range = document.createRange();
  range.selectNodeContents(tab_name);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const finish_rename = () => {
    tab_name.setAttribute('contenteditable', 'false');
    const new_name = tab_name.textContent.trim() || original_name;
    tab_name.textContent = new_name;

    const tab = app_state.tabs.find(t => t.id === tab_id);
    if (tab) {
      tab.name = new_name;
      storage.save_tab_data(tab).catch(err => console.error('Failed to save tab name:', err));
    }
  };

  tab_name.addEventListener('blur', finish_rename, { once: true });
  tab_name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tab_name.blur();
    } else if (e.key === 'Escape') {
      tab_name.textContent = original_name;
      tab_name.blur();
    }
  }, { once: true });
}

export function get_tab(tab_id) {
  return app_state.tabs.find(t => t.id === tab_id) || null;
}

/* Settings Management */

function save_settings(tab_id) {
  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab) return;

  const panel = document.getElementById(`panel-${tab_id}`);
  if (!panel) return;

  const get_val = (field) => panel.querySelector(`[data-field="${field}"]`)?.value || '';
  const get_checked = (field) => panel.querySelector(`[data-field="${field}"]`)?.checked || false;

  tab.settings = {
    model_name: get_val('model-name'),
    api_url: get_val('api-url'),
    api_token: get_val('api-token'),
    system_prompt: get_val('system-prompt'),
    temperature: parseFloat(get_val('temperature')) || 0.7,
    top_p: parseFloat(get_val('top-p')) || 1.0,
    max_tokens: parseInt(get_val('max-tokens')) || 4000,
    context_messages: parseInt(get_val('context-messages')) || 30,
    direct_api: get_checked('direct-api'),
    is_reasoning: get_checked('is-reasoning')
  };

  storage.save_tab_data(tab).catch(err => console.error('Failed to save settings:', err));
}

function update_settings_header_indicator(tab_id) {
  const panel = document.getElementById(`panel-${tab_id}`);
  if (!panel) return;

  const has_missing = ['model-name', 'api-url', 'api-token'].some(field => {
    const input = panel.querySelector(`[data-field="${field}"]`);
    return input && !input.value.trim();
  });

  const settings_header = panel.querySelector('[data-field="settings-header"]');
  if (settings_header) {
    settings_header.classList.toggle('has-missing-fields', has_missing);
  }
}

/* Theme Management */

function toggle_theme(is_dark) {
  app_state.is_dark_mode = is_dark;
  document.documentElement.setAttribute('data-theme', is_dark ? 'dark' : 'light');

  document.querySelectorAll('[data-field="theme-toggle"]').forEach(toggle => {
    toggle.checked = is_dark;
    const slider = toggle.nextElementSibling;
    if (slider) slider.innerHTML = is_dark ? ICONS.moon : ICONS.sun;
  });

  try {
    localStorage.setItem('nexusai_theme', is_dark ? 'dark' : 'light');
  } catch (e) {
    console.warn('Could not save theme preference:', e);
  }
}

function load_theme_preference() {
  try {
    const saved_theme = localStorage.getItem('nexusai_theme');
    if (saved_theme) toggle_theme(saved_theme === 'dark');
  } catch (e) {
    console.warn('Could not load theme preference:', e);
  }
}

/* Chat Functions */

async function send_message(tab_id) {
  const panel = document.getElementById(`panel-${tab_id}`);
  if (!panel) return;

  const chat_input = panel.querySelector('[data-field="chat-input"]');
  if (!chat_input) return;

  const message_text = chat_input.value.trim();
  if (!message_text) return;

  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab) return;

  if (!tab.settings.api_url) {
    show_toast('Please configure API endpoint in Settings', 'error');
    return;
  }

  hide_continue_button(tab_id);

  const empty_state = panel.querySelector('[data-field="empty-state"]');
  if (empty_state) empty_state.style.display = 'none';

  const existing_error = panel.querySelector('.message-error');
  if (existing_error) existing_error.remove();

  const attachment_content = get_attachment_content(tab_id);
  const image_attachments = get_image_attachments(tab_id);
  const full_message_content = message_text + attachment_content;

  const user_message = {
    id: generate_id(),
    role: 'user',
    content: full_message_content,
    timestamp: Date.now(),
    has_attachments: attachment_content.length > 0 || image_attachments.length > 0
  };

  tab.messages.push(user_message);
  render_message(tab_id, user_message, true);

  chat_input.value = '';
  chat_input.style.height = 'auto';
  clear_pending_attachments(tab_id);

  await storage.save_tab_data(tab).catch(err => console.error('Failed to save message:', err));

  show_typing_indicator(tab_id);
  set_input_state(tab_id, true);

  try {
    const abort_controller = new AbortController();
    app_state.pending_requests.set(tab_id, abort_controller);

    const response = await send_chat_message(tab_id, full_message_content, tab.settings, {
      messages: tab.messages,
      context_summaries: tab.context_summaries,
      signal: abort_controller.signal,
      images: image_attachments
    });

    app_state.pending_requests.delete(tab_id);
    hide_typing_indicator(tab_id);

    if (response.success) {
      const ai_message = {
        id: generate_id(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now()
      };

      tab.messages.push(ai_message);
      tab.last_finish_reason = response.finish_reason;
      render_message(tab_id, ai_message);
      update_retry_buttons(tab_id);

      if (response.finish_reason === 'length') show_continue_button(tab_id);
      if (response.context_summaries) tab.context_summaries = response.context_summaries;

      await storage.save_tab_data(tab);
    } else {
      render_error_in_chat(tab_id, response.error || 'Failed to get response');
    }
  } catch (err) {
    app_state.pending_requests.delete(tab_id);
    hide_typing_indicator(tab_id);

    if (err.name === 'AbortError') {
      render_error_in_chat(tab_id, 'Request cancelled');
    } else {
      console.error('API Error:', err);
      render_error_in_chat(tab_id, err.message || 'Failed to send message');
    }
  } finally {
    set_input_state(tab_id, false);
  }
}

async function handle_continue(tab_id) {
  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab) return;

  hide_continue_button(tab_id);
  show_typing_indicator(tab_id);
  set_input_state(tab_id, true);

  try {
    const abort_controller = new AbortController();
    app_state.pending_requests.set(tab_id, abort_controller);

    const response = await continue_response(tab_id, tab.settings, {
      messages: tab.messages,
      context_summaries: tab.context_summaries,
      signal: abort_controller.signal
    });

    app_state.pending_requests.delete(tab_id);
    hide_typing_indicator(tab_id);

    if (response.success) {
      const last_message = tab.messages[tab.messages.length - 1];
      if (last_message && last_message.role === 'assistant') {
        last_message.content += response.content;
        tab.last_finish_reason = response.finish_reason;
        update_message_content(tab_id, last_message.id, last_message.content);

        if (response.finish_reason === 'length') show_continue_button(tab_id);
        await storage.save_tab_data(tab);
      }
    } else {
      render_error_in_chat(tab_id, response.error || 'Failed to continue response');
      show_continue_button(tab_id);
    }
  } catch (err) {
    app_state.pending_requests.delete(tab_id);
    hide_typing_indicator(tab_id);

    if (err.name !== 'AbortError') {
      render_error_in_chat(tab_id, err.message || 'Failed to continue');
      show_continue_button(tab_id);
    }
  } finally {
    set_input_state(tab_id, false);
  }
}

function set_input_state(tab_id, disabled) {
  const panel = document.getElementById(`panel-${tab_id}`);
  if (!panel) return;

  const chat_input = panel.querySelector('[data-field="chat-input"]');
  const send_btn = panel.querySelector('[data-action="send"]');
  if (chat_input) chat_input.disabled = disabled;
  if (send_btn) send_btn.disabled = disabled;
}

function show_continue_button(tab_id) {
  const panel = document.getElementById(`panel-${tab_id}`);
  const wrapper = panel?.querySelector('[data-field="continue-wrapper"]');
  if (wrapper) wrapper.style.display = 'flex';
}

function hide_continue_button(tab_id) {
  const panel = document.getElementById(`panel-${tab_id}`);
  const wrapper = panel?.querySelector('[data-field="continue-wrapper"]');
  if (wrapper) wrapper.style.display = 'none';
}

function update_message_content(tab_id, message_id, new_content) {
  const message_el = document.querySelector(`[data-message-id="${message_id}"] .message-content`);
  if (!message_el) return;

  const processed_content = process_message_content(new_content);
  const copy_btn = message_el.querySelector('.message-copy-btn');
  message_el.innerHTML = processed_content;
  if (copy_btn) message_el.appendChild(copy_btn);

  const parent = message_el.closest('.message');

  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(parent, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    });
  }

  if (typeof hljs !== 'undefined') {
    parent.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  }

  const panel = document.getElementById(`panel-${tab_id}`);
  const messages_container = panel?.querySelector('[data-field="chat-messages"]');
  if (messages_container) messages_container.scrollTop = messages_container.scrollHeight;
}

export function render_message(tab_id, message, is_last_user_message = false) {
  const panel = document.getElementById(`panel-${tab_id}`);
  const messages_container = panel?.querySelector('[data-field="chat-messages"]');
  if (!messages_container) return;

  const frag = dom.templates.message.content.cloneNode(true);
  const message_el = frag.querySelector('.message');

  message_el.classList.add(`message-${message.role}`);
  message_el.setAttribute('data-message-id', message.id);

  const avatar = message_el.querySelector('.message-avatar');
  const role = message_el.querySelector('.message-role');
  const time = message_el.querySelector('.message-time');
  const content = message_el.querySelector('.message-content');

  avatar.textContent = message.role === 'user' ? ICONS.user : ICONS.ai;
  role.textContent = message.role === 'user' ? 'You' : 'AI';
  time.textContent = format_time(new Date(message.timestamp));

  const processed_content = process_message_content(message.content);
  const copy_btn = content.querySelector('.message-copy-btn');
  content.innerHTML = processed_content;
  content.appendChild(copy_btn);

  if (message.role === 'user' && is_last_user_message) {
    const header = message_el.querySelector('.message-header');
    const retry_btn = document.createElement('button');
    retry_btn.className = 'message-retry-btn';
    retry_btn.setAttribute('aria-label', 'Retry this message');
    retry_btn.setAttribute('title', 'Retry this message');
    retry_btn.innerHTML = ICONS.refresh;
    header.appendChild(retry_btn);
  }

  messages_container.appendChild(frag);
  messages_container.scrollTop = messages_container.scrollHeight;

  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(message_el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    });
  }

  if (typeof hljs !== 'undefined') {
    message_el.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  }
}

function process_message_content(content) {
  if (content.startsWith('data:image/') || content.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
    return `<img src="${escape_html(content)}" alt="Generated image" class="generated-image" loading="lazy">`;
  }

  if (typeof marked !== 'undefined') {
    const renderer = new marked.Renderer();

    renderer.code = function(code, language) {
      const lang = language || 'plaintext';
      const escaped_code = escape_html(code);
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-block-language">${escape_html(lang)}</span>
            <button class="code-block-copy" aria-label="Copy code" title="Copy code">
              ${ICONS.copy}
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="language-${escape_html(lang)}">${escaped_code}</code></pre>
        </div>
      `;
    };

    renderer.image = function(href, title, text) {
      const alt_text = text || title || 'Generated image';
      const title_attr = title ? ` title="${escape_html(title)}"` : '';
      const src = href.startsWith('data:') ? href : escape_html(href);
      return `<img src="${src}" alt="${escape_html(alt_text)}"${title_attr} class="generated-image" loading="lazy">`;
    };

    marked.setOptions({ renderer, breaks: true, gfm: true });
    return marked.parse(content);
  }

  // Fallback processing
  const image_placeholder = [];
  let processed = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const placeholder = `__IMG_PLACEHOLDER_${image_placeholder.length}__`;
    const alt_text = alt || 'Generated image';
    const src = url.startsWith('data:') ? url : escape_html(url);
    image_placeholder.push(`<img src="${src}" alt="${escape_html(alt_text)}" class="generated-image" loading="lazy">`);
    return placeholder;
  });

  processed = escape_html(processed);

  image_placeholder.forEach((img, i) => {
    processed = processed.replace(`__IMG_PLACEHOLDER_${i}__`, img);
  });

  processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'plaintext';
    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-block-language">${language}</span>
          <button class="code-block-copy" aria-label="Copy code" title="Copy code">
            ${ICONS.copy}
            <span>Copy</span>
          </button>
        </div>
        <pre><code class="language-${language}">${code.trim()}</code></pre>
      </div>
    `;
  });

  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  processed = processed.replace(/\n/g, '<br>');

  return processed;
}

function show_typing_indicator(tab_id) {
  const panel = document.getElementById(`panel-${tab_id}`);
  const messages_container = panel?.querySelector('[data-field="chat-messages"]');
  if (!messages_container) return;

  const frag = dom.templates.typing_indicator.content.cloneNode(true);
  const indicator = frag.querySelector('.typing-message');
  indicator.id = `typing-${tab_id}`;

  messages_container.appendChild(frag);
  messages_container.scrollTop = messages_container.scrollHeight;
}

function hide_typing_indicator(tab_id) {
  document.getElementById(`typing-${tab_id}`)?.remove();
}

async function handle_clear_chat(tab_id) {
  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab) return;

  if (!confirm('Are you sure you want to clear all messages? This cannot be undone.')) return;

  tab.messages = [];
  tab.context_summaries = [];
  tab.last_finish_reason = null;
  app_state.pending_attachments.delete(tab_id);

  const panel = document.getElementById(`panel-${tab_id}`);
  if (!panel) return;

  const messages_container = panel.querySelector('[data-field="chat-messages"]');
  if (messages_container) {
    messages_container.innerHTML = '';
    const frag = dom.templates.tab_panel.content.cloneNode(true);
    const empty_state = frag.querySelector('[data-field="empty-state"]');
    if (empty_state) messages_container.appendChild(empty_state);
  }

  hide_continue_button(tab_id);

  const attachments_preview = panel.querySelector('[data-field="attachments-preview"]');
  if (attachments_preview) {
    attachments_preview.innerHTML = '';
    attachments_preview.style.display = 'none';
  }

  try {
    await storage.save_tab_data(tab);
    show_toast('Chat cleared', 'success');
  } catch (err) {
    console.error('Failed to save cleared chat:', err);
    show_toast('Chat cleared (save failed)', 'error');
  }
}

function handle_export_chat(tab_id) {
  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab) return;

  if (tab.messages.length === 0) {
    show_toast('No messages to export', 'error');
    return;
  }

  const export_data = {
    name: tab.name,
    exported_at: new Date().toISOString(),
    settings: {
      model_name: tab.settings.model_name,
      api_url: tab.settings.api_url,
      system_prompt: tab.settings.system_prompt,
      temperature: tab.settings.temperature,
      top_p: tab.settings.top_p,
      max_tokens: tab.settings.max_tokens
    },
    messages: tab.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toISOString()
    }))
  };

  const json_str = JSON.stringify(export_data, null, 2);
  const blob = new Blob([json_str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `nexusai-${tab.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  show_toast('Chat exported successfully', 'success');
}

async function handle_retry_message(tab_id) {
  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab || tab.messages.length < 1) return;

  let last_user_index = -1;
  for (let i = tab.messages.length - 1; i >= 0; i--) {
    if (tab.messages[i].role === 'user') {
      last_user_index = i;
      break;
    }
  }

  if (last_user_index === -1) return;

  const user_message = tab.messages[last_user_index];
  const messages_to_remove = tab.messages.slice(last_user_index);
  tab.messages = tab.messages.slice(0, last_user_index);

  messages_to_remove.forEach(msg => {
    document.querySelector(`[data-message-id="${msg.id}"]`)?.remove();
  });

  const panel = document.getElementById(`panel-${tab_id}`);
  panel?.querySelector('.message-error')?.remove();

  hide_continue_button(tab_id);
  await storage.save_tab_data(tab);

  const chat_input = panel?.querySelector('[data-field="chat-input"]');
  if (chat_input) {
    chat_input.value = user_message.content;
    send_message(tab_id);
  }
}

function update_retry_buttons(tab_id) {
  const tab = app_state.tabs.find(t => t.id === tab_id);
  if (!tab) return;

  const panel = document.getElementById(`panel-${tab_id}`);
  if (!panel) return;

  panel.querySelectorAll('.message-retry-btn').forEach(btn => btn.remove());

  for (let i = tab.messages.length - 1; i >= 0; i--) {
    if (tab.messages[i].role === 'user') {
      const msg_el = panel.querySelector(`[data-message-id="${tab.messages[i].id}"]`);
      if (msg_el) {
        const header = msg_el.querySelector('.message-header');
        if (header && !header.querySelector('.message-retry-btn')) {
          const retry_btn = document.createElement('button');
          retry_btn.className = 'message-retry-btn';
          retry_btn.setAttribute('aria-label', 'Retry this message');
          retry_btn.setAttribute('title', 'Retry this message');
          retry_btn.innerHTML = ICONS.refresh;
          header.appendChild(retry_btn);
        }
      }
      break;
    }
  }
}

function render_error_in_chat(tab_id, error_message) {
  const panel = document.getElementById(`panel-${tab_id}`);
  const messages_container = panel?.querySelector('[data-field="chat-messages"]');
  if (!messages_container) return;

  panel?.querySelector('.message-error')?.remove();

  const frag = dom.templates.error_message.content.cloneNode(true);
  const error_el = frag.querySelector('.message-error');
  error_el.querySelector('.error-content').textContent = error_message;

  messages_container.appendChild(frag);
  messages_container.scrollTop = messages_container.scrollHeight;
}

/* File Attachments */

const SUPPORTED_FILE_TYPES = {
  pdf: { type: 'document', extractor: 'pdf' },
  docx: { type: 'document', extractor: 'docx' },
  txt: { type: 'text', extractor: 'text' },
  md: { type: 'text', extractor: 'text' },
  json: { type: 'text', extractor: 'text' },
  xml: { type: 'text', extractor: 'text' },
  csv: { type: 'text', extractor: 'text' },
  js: { type: 'code', extractor: 'text' },
  ts: { type: 'code', extractor: 'text' },
  jsx: { type: 'code', extractor: 'text' },
  tsx: { type: 'code', extractor: 'text' },
  py: { type: 'code', extractor: 'text' },
  java: { type: 'code', extractor: 'text' },
  c: { type: 'code', extractor: 'text' },
  cpp: { type: 'code', extractor: 'text' },
  h: { type: 'code', extractor: 'text' },
  hpp: { type: 'code', extractor: 'text' },
  css: { type: 'code', extractor: 'text' },
  scss: { type: 'code', extractor: 'text' },
  sass: { type: 'code', extractor: 'text' },
  less: { type: 'code', extractor: 'text' },
  html: { type: 'code', extractor: 'text' },
  htm: { type: 'code', extractor: 'text' },
  php: { type: 'code', extractor: 'text' },
  rb: { type: 'code', extractor: 'text' },
  go: { type: 'code', extractor: 'text' },
  rs: { type: 'code', extractor: 'text' },
  swift: { type: 'code', extractor: 'text' },
  kt: { type: 'code', extractor: 'text' },
  cs: { type: 'code', extractor: 'text' },
  sh: { type: 'code', extractor: 'text' },
  bash: { type: 'code', extractor: 'text' },
  sql: { type: 'code', extractor: 'text' },
  yaml: { type: 'text', extractor: 'text' },
  yml: { type: 'text', extractor: 'text' },
  toml: { type: 'text', extractor: 'text' },
  ini: { type: 'text', extractor: 'text' },
  cfg: { type: 'text', extractor: 'text' },
  conf: { type: 'text', extractor: 'text' },
  png: { type: 'image', extractor: 'image' },
  jpg: { type: 'image', extractor: 'image' },
  jpeg: { type: 'image', extractor: 'image' },
  gif: { type: 'image', extractor: 'image' },
  webp: { type: 'image', extractor: 'image' },
  bmp: { type: 'image', extractor: 'image' },
  svg: { type: 'image', extractor: 'image' }
};

async function handle_file_attachment(tab_id, files) {
  if (!files || files.length === 0) return;

  if (!app_state.pending_attachments.has(tab_id)) {
    app_state.pending_attachments.set(tab_id, []);
  }

  const attachments = app_state.pending_attachments.get(tab_id);

  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    const file_type = SUPPORTED_FILE_TYPES[ext];

    if (!file_type) {
      show_toast(`Unsupported file type: .${ext}`, 'error');
      continue;
    }

    try {
      const attachment = await process_file(file, file_type);
      attachments.push(attachment);
    } catch (err) {
      console.error('Failed to process file:', err);
      show_toast(`Failed to process ${file.name}: ${err.message}`, 'error');
    }
  }

  update_attachments_preview(tab_id);
}

async function process_file(file, file_type) {
  const attachment = {
    id: generate_id(),
    name: file.name,
    type: file_type.type,
    size: file.size
  };

  switch (file_type.extractor) {
    case 'text':
      attachment.content = await read_file_as_text(file);
      break;
    case 'pdf':
      attachment.content = await extract_pdf_text(file);
      break;
    case 'docx':
      attachment.content = await extract_docx_text(file);
      break;
    case 'image':
      attachment.content = await read_file_as_base64(file);
      attachment.preview = attachment.content;
      break;
    default:
      throw new Error('Unknown extractor');
  }

  return attachment;
}

function read_file_as_text(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function read_file_as_base64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function extract_pdf_text(file) {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js not loaded.');
  }

  const array_buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: array_buffer }).promise;

  let full_text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text_content = await page.getTextContent();
    const page_text = text_content.items.map(item => item.str).join(' ');
    full_text += `[Page ${i}]\n${page_text}\n\n`;
  }

  return full_text.trim();
}

async function extract_docx_text(file) {
  if (typeof mammoth === 'undefined') {
    throw new Error('Mammoth.js not loaded.');
  }

  const array_buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: array_buffer });
  return result.value;
}

function update_attachments_preview(tab_id) {
  const panel = document.getElementById(`panel-${tab_id}`);
  const preview_container = panel?.querySelector('[data-field="attachments-preview"]');
  if (!preview_container) return;

  const attachments = app_state.pending_attachments.get(tab_id) || [];

  if (attachments.length === 0) {
    preview_container.innerHTML = '';
    preview_container.style.display = 'none';
    return;
  }

  preview_container.style.display = 'flex';
  preview_container.innerHTML = '';

  attachments.forEach(att => {
    const frag = dom.templates.attachment_item.content.cloneNode(true);
    const item = frag.querySelector('.attachment-item');
    item.setAttribute('data-attachment-id', att.id);
    item.querySelector('.attachment-icon').innerHTML = att.type === 'image' ? ICONS.image : ICONS.file;
    item.querySelector('.attachment-name').textContent = att.name;
    item.querySelector('.attachment-name').title = att.name;
    preview_container.appendChild(frag);
  });
}

function remove_attachment(tab_id, attachment_id) {
  const attachments = app_state.pending_attachments.get(tab_id);
  if (!attachments) return;

  const index = attachments.findIndex(a => a.id === attachment_id);
  if (index > -1) attachments.splice(index, 1);

  update_attachments_preview(tab_id);
}

function get_attachment_content(tab_id) {
  const attachments = app_state.pending_attachments.get(tab_id);
  if (!attachments || attachments.length === 0) return '';

  let content = '\n\n---\n**Attached Files:**\n';

  attachments.forEach(att => {
    if (att.type === 'image') {
      content += `\n[Image: ${att.name}]\n`;
    } else {
      content += `\n**${att.name}:**\n\`\`\`\n${att.content}\n\`\`\`\n`;
    }
  });

  return content;
}

function get_image_attachments(tab_id) {
  const attachments = app_state.pending_attachments.get(tab_id);
  if (!attachments) return [];

  return attachments
    .filter(att => att.type === 'image')
    .map(att => ({ name: att.name, data: att.content }));
}

function clear_pending_attachments(tab_id) {
  app_state.pending_attachments.delete(tab_id);
  update_attachments_preview(tab_id);
}

/* Header Toggle */

function setup_header_toggle() {
  if (!dom.header_toggle || !dom.header_content) return;
  
  dom.header_toggle.addEventListener('click', () => {
    const is_expanded = dom.header_toggle.getAttribute('aria-expanded') === 'true';
    const new_state = !is_expanded;
    
    dom.header_toggle.setAttribute('aria-expanded', new_state);
    dom.header_content.setAttribute('aria-hidden', !new_state);
  });
}

/* Event Delegation */

function setup_event_delegation() {
  // Tab list delegation
  dom.tab_list.addEventListener('click', (e) => {
    const tab_item = e.target.closest('.tab-item');
    if (!tab_item) return;

    const tab_id = tab_item.getAttribute('data-tab-id');

    if (e.target.closest('.tab-close')) {
      e.stopPropagation();
      close_tab(tab_id);
    } else {
      activate_tab(tab_id);
    }
  });

  dom.tab_list.addEventListener('dblclick', (e) => {
    const tab_name = e.target.closest('.tab-name');
    if (tab_name) {
      const tab_item = tab_name.closest('.tab-item');
      const tab_id = tab_item?.getAttribute('data-tab-id');
      if (tab_id) start_tab_rename(tab_id);
    }
  });

  dom.tab_list.addEventListener('keydown', (e) => {
    const tab_item = e.target.closest('.tab-item');
    if (!tab_item) return;

    const tab_id = tab_item.getAttribute('data-tab-id');
    const tab_items = Array.from(document.querySelectorAll('.tab-item'));
    const current_index = tab_items.indexOf(tab_item);

    let target_index = -1;

    switch (e.key) {
      case 'ArrowLeft':
        target_index = current_index > 0 ? current_index - 1 : tab_items.length - 1;
        break;
      case 'ArrowRight':
        target_index = current_index < tab_items.length - 1 ? current_index + 1 : 0;
        break;
      case 'Home':
        target_index = 0;
        break;
      case 'End':
        target_index = tab_items.length - 1;
        break;
      case 'Delete':
        close_tab(tab_id);
        return;
      case 'F2':
        start_tab_rename(tab_id);
        return;
      default:
        return;
    }

    if (target_index >= 0) {
      e.preventDefault();
      const target_tab_id = tab_items[target_index].getAttribute('data-tab-id');
      activate_tab(target_tab_id);
    }
  });

  // Tab panels delegation
  dom.tab_panels.addEventListener('click', (e) => {
    const tab_id = get_tab_id_from_element(e.target);
    if (!tab_id) return;

    const panel = document.getElementById(`panel-${tab_id}`);

    // Settings header toggle
    if (e.target.closest('[data-field="settings-header"]') && !e.target.closest('.settings-header-right')) {
      const header = panel.querySelector('[data-field="settings-header"]');
      const body = panel.querySelector('[data-field="settings-body"]');
      const settings_panel = panel.querySelector('[data-field="settings-panel"]');

      const is_expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', !is_expanded);
      settings_panel.classList.toggle('expanded', !is_expanded);
      body.setAttribute('aria-hidden', is_expanded);
      return;
    }

    // Advanced toggle
    if (e.target.closest('[data-action="toggle-advanced"]')) {
      const toggle = panel.querySelector('[data-action="toggle-advanced"]');
      const advanced = panel.querySelector('[data-field="advanced-settings"]');
      const is_expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !is_expanded);
      advanced.classList.toggle('visible');
      advanced.setAttribute('aria-hidden', is_expanded);
      return;
    }

    // Clear chat
    if (e.target.closest('[data-action="clear-chat"]')) {
      handle_clear_chat(tab_id);
      return;
    }

    // Export chat
    if (e.target.closest('[data-action="export-chat"]')) {
      handle_export_chat(tab_id);
      return;
    }

    // Copy buttons
    if (e.target.closest('[data-action="copy"]')) {
      const btn = e.target.closest('[data-action="copy"]');
      const wrapper = btn.closest('.input-wrapper');
      const input = wrapper?.querySelector('input, textarea');
      if (input) copy_to_clipboard(input.value, btn);
      return;
    }

    // Copy input
    if (e.target.closest('[data-action="copy-input"]')) {
      const btn = e.target.closest('[data-action="copy-input"]');
      const input = panel.querySelector('[data-field="chat-input"]');
      if (input) copy_to_clipboard(input.value, btn);
      return;
    }

    // Toggle password
    if (e.target.closest('[data-action="toggle-password"]')) {
      const btn = e.target.closest('[data-action="toggle-password"]');
      const input = panel.querySelector('[data-field="api-token"]');
      if (input) {
        const is_password = input.type === 'password';
        input.type = is_password ? 'text' : 'password';
        btn.innerHTML = is_password ? ICONS['eye-off'] : ICONS.eye;
      }
      return;
    }

    // Send message
    if (e.target.closest('[data-action="send"]')) {
      send_message(tab_id);
      return;
    }

    // Continue
    if (e.target.closest('[data-action="continue"]')) {
      handle_continue(tab_id);
      return;
    }

    // Attach
    if (e.target.closest('[data-action="attach"]')) {
      panel.querySelector('[data-field="file-input"]')?.click();
      return;
    }

    // Retry message
    if (e.target.closest('.message-retry-btn')) {
      handle_retry_message(tab_id);
      return;
    }

    // Copy message
    if (e.target.closest('.message-copy-btn')) {
      const btn = e.target.closest('.message-copy-btn');
      const message_el = btn.closest('.message');
      const message_id = message_el?.getAttribute('data-message-id');
      const tab = app_state.tabs.find(t => t.id === tab_id);
      const message = tab?.messages.find(m => m.id === message_id);
      if (message) copy_to_clipboard(message.content, btn);
      return;
    }

    // Copy code block
    if (e.target.closest('.code-block-copy')) {
      const btn = e.target.closest('.code-block-copy');
      const code = btn.closest('.code-block-wrapper')?.querySelector('code');
      if (code) copy_to_clipboard(code.textContent, btn);
      return;
    }

    // Remove attachment
    if (e.target.closest('.attachment-remove')) {
      const item = e.target.closest('.attachment-item');
      const att_id = item?.getAttribute('data-attachment-id');
      if (att_id) remove_attachment(tab_id, att_id);
      return;
    }
  });

  // Settings header keyboard
  dom.tab_panels.addEventListener('keydown', (e) => {
    if (e.target.closest('[data-field="settings-header"]')) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.target.closest('[data-field="settings-header"]').click();
      }
    }
  });

  // Change events
  dom.tab_panels.addEventListener('change', (e) => {
    const tab_id = get_tab_id_from_element(e.target);
    if (!tab_id) return;

    // Theme toggle
    if (e.target.matches('[data-field="theme-toggle"]')) {
      toggle_theme(e.target.checked);
      return;
    }

    // Preset select
    if (e.target.matches('[data-field="preset-select"]')) {
      if (e.target.value) {
        apply_preset(tab_id, e.target.value);
        setTimeout(() => e.target.value = '', 100);
      }
      return;
    }

    // File input
    if (e.target.matches('[data-field="file-input"]')) {
      handle_file_attachment(tab_id, e.target.files);
      e.target.value = '';
      return;
    }

    // Save settings on any change
    const settings_fields = ['model-name', 'api-url', 'api-token', 'system-prompt', 'temperature', 'top-p', 'max-tokens', 'context-messages', 'direct-api'];
    if (settings_fields.some(f => e.target.matches(`[data-field="${f}"]`))) {
      save_settings(tab_id);
    }
  });

  // Input events
  dom.tab_panels.addEventListener('input', (e) => {
    const tab_id = get_tab_id_from_element(e.target);
    if (!tab_id) return;

    const panel = document.getElementById(`panel-${tab_id}`);

    // Range value display
    if (e.target.matches('[data-field="temperature"]')) {
      panel.querySelector('[data-field="temperature-value"]').textContent = e.target.value;
    } else if (e.target.matches('[data-field="top-p"]')) {
      panel.querySelector('[data-field="top-p-value"]').textContent = e.target.value;
    }

    // Chat input auto-resize
    if (e.target.matches('[data-field="chat-input"]')) {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    }

    // Update settings indicator
    if (['model-name', 'api-url', 'api-token'].some(f => e.target.matches(`[data-field="${f}"]`))) {
      update_settings_header_indicator(tab_id);
    }
  });

  // Keydown events
  dom.tab_panels.addEventListener('keydown', (e) => {
    if (e.target.matches('[data-field="chat-input"]')) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const tab_id = get_tab_id_from_element(e.target);
        if (tab_id) send_message(tab_id);
      }
    }
  });

  // New tab button
  dom.tab_add_btn.addEventListener('click', () => {
    const new_tab = create_tab();
    activate_tab(new_tab.id);
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      const new_tab = create_tab();
      activate_tab(new_tab.id);
    }

    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      if (app_state.active_tab_id) close_tab(app_state.active_tab_id);
    }
  });
}

/* Initialization */

export async function init_gui() {
  dom.tab_list = document.getElementById('tab-list');
  dom.tab_add_btn = document.getElementById('tab-add-btn');
  dom.tab_panels = document.getElementById('tab-panels');
  dom.toast_container = document.getElementById('toast-container');
  dom.header_toggle = document.getElementById('header-toggle');
  dom.header_content = document.getElementById('header-content');

  dom.templates.tab_button = document.getElementById('tab-button-template');
  dom.templates.tab_panel = document.getElementById('tab-panel-template');
  dom.templates.message = document.getElementById('message-template');
  dom.templates.typing_indicator = document.getElementById('typing-indicator-template');
  dom.templates.error_message = document.getElementById('error-message-template');
  dom.templates.attachment_item = document.getElementById('attachment-item-template');

  load_theme_preference();
  setup_event_delegation();
  setup_header_toggle();

  try {
    await storage.init_database();
    const saved_tabs = await storage.get_all_tabs();

    if (saved_tabs.length > 0) {
      saved_tabs.sort((a, b) => a.created_at - b.created_at);
      app_state.tab_counter = saved_tabs.length;

      saved_tabs.forEach(tab_data => {
        const tab = {
          id: tab_data.id,
          name: tab_data.name,
          created_at: tab_data.created_at,
          settings: tab_data.settings || {
            model_name: '',
            api_url: '',
            api_token: '',
            system_prompt: '',
            temperature: 0.7,
            top_p: 1.0,
            max_tokens: 6000,
            context_messages: 30,
            direct_api: false
          },
          messages: tab_data.messages || [],
          context_summaries: tab_data.context_summaries || [],
          last_finish_reason: tab_data.last_finish_reason || null
        };

        app_state.tabs.push(tab);
        render_tab_button(tab);
        render_tab_panel(tab);
      });

      activate_tab(app_state.tabs[0].id);
    } else {
      const first_tab = create_tab();
      activate_tab(first_tab.id);
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
    const first_tab = create_tab();
    activate_tab(first_tab.id);
  }

  console.log('NexusAI GUI initialized');
}
