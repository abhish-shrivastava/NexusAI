<?php 
/**
 * NexusAI Configuration
 * Copy this file to config.php and update with your values
 */

/* Error logging */
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php-error.log');
error_reporting(E_ALL);

/*
 * Server-side Summarization (Optional)
 * 
 * For long conversations, the app can summarize older messages to save context.
 * If the user's API platform supports Llama 3.1 8B, their token is used.
 * Otherwise, this fallback token is used.
 * 
 * Leave empty to disable server-side fallback (summarization will only work
 * if user's platform supports Llama 3.1 8B)
 */
define('FALLBACK_HF_TOKEN', getenv('NEXUSAI_HF_TOKEN') ?: '');

/* Summarization endpoint and model */
define('FALLBACK_SUMMARIZE_URL', 'https://router.huggingface.co/novita/v3/openai/chat/completions');
define('FALLBACK_SUMMARIZE_MODEL', 'meta-llama/llama-3.1-8b-instruct');

/* Platforms where user's token can be used for summarization (supports Llama 3.1 8B). You can edit this list */
define('SUMMARIZATION_CAPABLE_PATTERNS', [
    'huggingface.co',
    'openrouter.ai',
    'together.xyz',
    'anyscale.com',
    'fireworks.ai',
    'deepinfra.com',
    'replicate.com'
]);
