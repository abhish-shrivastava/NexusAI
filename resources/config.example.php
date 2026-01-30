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
 * If the user's API platform supports Gemma-3-12b-it, their token is used.
 * Otherwise, this fallback token is used.
 * 
 * Leave empty to disable server-side fallback (summarization will only work
 * if user's platform supports Gemma-3-12b-it)
 */
define('FALLBACK_HF_TOKEN', getenv('NEXUSAI_HF_TOKEN') ?: '');

/* Summarization endpoint and model (Gemma 3 12B from OpenRouter - free tier) */
define('FALLBACK_SUMMARIZE_URL', 'https://openrouter.ai/api/v1/chat/completions');
define('FALLBACK_SUMMARIZE_MODEL', 'google/gemma-3-12b-it:free');

/* Platforms where user's token can be used for summarization (supports Gemma-3-12b-it). You can edit this list */
define('SUMMARIZATION_CAPABLE_PATTERNS', [
    'huggingface.co',
    'openrouter.ai',
    'together.xyz',
    'anyscale.com',
    'fireworks.ai',
    'deepinfra.com',
    'replicate.com'
]);
