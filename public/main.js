import { ChatUI } from './modules/ui/ui.js';
import { Models } from './modules/models/models.js';

// Main application class
class OllamaChat {
    constructor() {
        // Initialize models module
        this.models = new Models(this.handleModelChange.bind(this));
        
        // Initialize UI module with message handler
        this.chatUI = new ChatUI(this.handleSendMessage.bind(this));
        
        // Initialize the application
        this.initialize();
    }
    
    async initialize() {
        await this.models.initialize();
    }
    
    // Handle model change event
    handleModelChange(modelName) {
        console.log(`Model changed to ${modelName}`);
    }
    
    // Handle send message event from UI
    async handleSendMessage(message) {
        // Add user message to chat
        this.chatUI.addUserMessage(message);
        
        // Get message history from chatbox
        const messageHistory = this.chatUI.getMessageHistory();
        
        // Prepare UI for AI response
        const aiElements = this.chatUI.prepareAIResponse();
        
        try {
            // Send the message and get reader
            const reader = await this.models.sendMessage(messageHistory);
            
            // Process the response stream with callbacks
            await this.models.receiveMessage(reader,
                // onChunk callback - update content as chunks arrive
                (chunk, fullResponse, stats) => {
                    aiElements.content.text(fullResponse);
                    aiElements.stats.text(`Rate: ${stats.tokensPerSecond} tok/s`);
                },
                // onComplete callback - finalize the message
                (fullResponse, stats) => {
                    aiElements.content.text(fullResponse);
                    aiElements.stats.text(`Rate: ${stats.tokensPerSecond} tok/s | Total: ${stats.tokenCount} tokens`);
                    
                    // Add AI response to history
                    this.chatUI.addAIResponse(fullResponse);
                },
                // onError callback
                (error) => {
                    aiElements.content.text(`Error sending message: ${error.message}`);
                    aiElements.stats.text('Error');
                });
        } catch (error) {
            console.error('Request failed:', error);
            aiElements.content.text(`Error sending message: ${error.message}`);
        }
    }
}

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new OllamaChat();
});