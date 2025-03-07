import Chatbox from './features/chat/chatbox.js';
import Messagebox from './features/chat/messagebox.js';
import { initializeModels } from './state/actions.js';

// Main application class
class OllamaChat {
  constructor() {
    // Initialize components
    this.chatbox = new Chatbox();
    this.messagebox = new Messagebox();
    
    // Initialize app state
    this.initialize();
  }
  
  async initialize() {
    // Load models and initialize app state
    await initializeModels();
  }
}

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new OllamaChat();
});