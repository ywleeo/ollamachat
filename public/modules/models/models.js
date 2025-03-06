import $ from "../util/leeo.js";
import {
    getModels,
    sendMessage,
    receiveMessage,
    preloadModel,
    closeCurrentModel,
    isModelLoaded,
    getModelStatus,
    getLoadedModel
} from "../util/api.js";

class Models {
    constructor(onModelChange) {
        this.selectedModel = 'deepseek-r1:14b'; // Default selected model
        this.modelStatusInterval = 2000; // Check model status every 2 seconds
        this.onModelChange = onModelChange;
        this.intervalId = null;
    }

    async initialize() {
        // First check if there's already a loaded model
        const loadedModel = await getLoadedModel();
        
        if (loadedModel) {
            this.selectedModel = loadedModel;
        } else {
            // Only preload the default model if nothing is loaded
            await this.preloadSelectedModel();
        }
        
        // Initialize the model list UI after determining the loaded model
        await this.initModelList('model-list-container');
    }

    // Initialize model list
    async initModelList(containerId) {
        const containerElement = $(`#${containerId}`);
        const models = await getModels();
        
        if (models.length === 0) {
            containerElement.text('No models available');
            return;
        }
        
        // Clear container
        containerElement.empty();
        
        // Create model buttons
        models.forEach(model => {
            const modelButton = $.create('button', {
                attributes: {
                    'data-model': model.name,
                    class: 'model-button status-available'
                }
            });
            
            modelButton.text(model.name);
            
            // Check if this model is the loaded/selected one
            if (model.name === this.selectedModel) {
                modelButton.addClass('model-selected');
                
                // Update button status based on current model state
                if (isModelLoaded(model.name)) {
                    this.updateButtonStatus(modelButton, 'loaded');
                } else {
                    this.updateButtonStatus(modelButton, 'loading');
                }
            }
            
            modelButton.on('click', async () => {
                // Remove selection from other buttons
                containerElement.find('button').removeClass('model-selected');
                
                // Add selection to current button
                modelButton.addClass('model-selected');
                
                // Update selected model
                this.selectedModel = model.name;
                
                if (this.onModelChange) {
                    this.onModelChange(model.name);
                }
                
                // Start preloading the selected model
                this.updateButtonStatus(modelButton, 'loading');
                this.preloadSelectedModel();
            });
            
            containerElement.appendChild(modelButton);
        });
        
        // Start periodic status updates
        this.startModelStatusUpdates();
    }

    // Preload the selected model
    async preloadSelectedModel() {
        try {
            const modelName = this.selectedModel;
            const modelButton = $(`button[data-model="${modelName}"]`);
            
            if (!isModelLoaded(modelName)) {
                this.updateButtonStatus(modelButton, 'loading');
                await preloadModel(modelName);
                this.updateAllButtonStatuses();
            }
        } catch (error) {
            console.error('Error preloading model:', error);
        }
    }

    // Update all button statuses
    updateAllButtonStatuses() {
        $(".model-button").for(button => {
            const el = $(button);
            const modelName = el.attr('data-model');
            const status = getModelStatus(modelName);
            this.updateButtonStatus(el, status);
        });
    }

    // Update button status and appearance
    updateButtonStatus(buttonElement, status) {
        buttonElement.removeClass('status-available', 'status-loading', 'status-loaded', 'status-error');
        buttonElement.addClass(`status-${status}`);
    }

    // Start periodic model status updates
    startModelStatusUpdates() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => this.updateAllButtonStatuses(), this.modelStatusInterval);
    }

    // Stop periodic model status updates
    stopModelStatusUpdates() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Get currently selected model
    getSelectedModel() {
        return this.selectedModel;
    }

    // Send message with currently selected model
    async sendMessage(messages) {
        try {
            const modelName = this.selectedModel;
            const modelButton = $(`button[data-model="${modelName}"]`);
            
            // Show loading state for the selected model
            this.updateButtonStatus(modelButton, 'loading');
            
            // Send the message and get reader
            const reader = await sendMessage(modelName, messages);
            
            // Update model button status after successful send
            this.updateButtonStatus(modelButton, 'loaded');
            
            return reader;
        } catch (error) {
            console.error('Send message failed:', error);
            const modelButton = $(`button[data-model="${this.selectedModel}"]`);
            this.updateButtonStatus(modelButton, 'error');
            throw error;
        }
    }

    // Process the response stream
    async receiveMessage(reader, onChunk, onComplete, onError) {
        return receiveMessage(reader, onChunk, onComplete, onError);
    }
}

export { Models };