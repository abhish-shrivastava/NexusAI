/**
 * NexusAI Chat Application - Entry Point
 * Main entry file that bootstraps all modules
 * @version 2.0.0
 */

import { init_gui } from './gui.js';

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init_gui);
} else {
  init_gui();
}

console.log('NexusAI Chat Application v2.0.0 loaded');
