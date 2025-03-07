// src/main.js
import Chatbox from "./features/chat/chatbox.js";
import Messagebox from "./features/chat/messagebox.js";
import ChatControls from "./features/chat/chat-controls.js";
import ModelList from "./features/models/model-list.js";
import { initializeModels } from "./state/actions.js";
import store from "./state/store.js";

// Main application class
class OllamaChat {
    constructor() {
        // Initialize components
        this.chatbox = new Chatbox();
        this.messagebox = new Messagebox();
        this.modelList = new ModelList();
        this.chatControls = new ChatControls();

        // Debug: Log state changes to console
        store.subscribe((state) => {
            // console.log('State updated:', state);
        });

        // Initialize app state
        this.initialize();
    }

    async initialize() {
        try {
            // Load models and initialize app state
            await initializeModels();
        } catch (error) {
            console.error("Failed to initialize models:", error);

            // Show error in the model list container
            const modelListContainer = document.getElementById(
                "model-list-container"
            );
            modelListContainer.innerHTML = `
        <div class="status-indicator status-error">
          Failed to load models: ${error.message}
        </div>
      `;
        }
    }
}

// Initialize the application when the document is ready
document.addEventListener("DOMContentLoaded", () => {
    window.app = new OllamaChat();
});