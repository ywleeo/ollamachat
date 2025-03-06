import $, {
    LeeoQuery
} from "../util/leeo.js";
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

let selectedModel = 'deepseek-r1:14b'; // Default selected model

// Check loaded model on page load
(async function() {
    // First check if there's already a loaded model
    const loadedModel = await getLoadedModel();
    
    if (loadedModel) {
        selectedModel = loadedModel;
    } else {
        // Only preload the default model if nothing is loaded
        await preloadSelectedModel();
    }
    
    // Initialize the model list UI after determining the loaded model
    await initModelList('model-list-container');
})();

const chatbox = $("#chatbox");
const messagebox = $("#messagebox");
let messageHistory = []; // Store message history
const modelStatusInterval = 2000; // Check model status every 2 seconds

// Initialize model list
async function initModelList(containerId) {
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
        if (model.name === selectedModel) {
            modelButton.addClass('model-selected');
            
            // Update button status based on current model state
            if (isModelLoaded(model.name)) {
                updateButtonStatus(modelButton, 'loaded');
            } else {
                updateButtonStatus(modelButton, 'loading');
            }
        }
        
        modelButton.on('click', async () => {
            // Remove selection from other buttons
            containerElement.find('button').removeClass('model-selected');
            
            // Add selection to current button
            modelButton.addClass('model-selected');
            
            // Update selected model
            selectedModel = model.name;
            
            // Start preloading the selected model
            updateButtonStatus(modelButton, 'loading');
            preloadSelectedModel();
        });
        
        containerElement.appendChild(modelButton);
    });
    
    // Start periodic status updates
    startModelStatusUpdates();
}

// Preload the selected model
async function preloadSelectedModel() {
    try {
        const modelName = selectedModel;
        const modelButton = $(`button[data-model="${modelName}"]`);
        
        if (!isModelLoaded(modelName)) {
            updateButtonStatus(modelButton, 'loading');
            await preloadModel(modelName);
            updateAllButtonStatuses();
        }
    } catch (error) {
        console.error('Error preloading model:', error);
    }
}

// Update all button statuses
function updateAllButtonStatuses() {
    $(".model-button").for(button => {
        const el = $(button);
        const modelName = el.attr('data-model');
        const status = getModelStatus(modelName);
        updateButtonStatus(el, status);
    });
}

// Update button status and appearance
function updateButtonStatus(buttonElement, status) {
    buttonElement.removeClass('status-available', 'status-loading', 'status-loaded', 'status-error');
    buttonElement.addClass(`status-${status}`);
}

// Start periodic model status updates
function startModelStatusUpdates() {
    setInterval(updateAllButtonStatuses, modelStatusInterval);
}

// Create UI message elements
function createMessageElements(text, role) {
    if (role === 'user') {
        return $.create('div', {
            attributes: {
                class: 'message user'
            }
        }).text(`You: ${text}`);
    } else {
        const messageDiv = $.create('div', {
            attributes: {
                class: 'message ollama'
            }
        });
        const contentDiv = $.create('div', {
            attributes: {
                class: 'content'
            }
        });
        const statsDiv = $.create('div', {
            attributes: {
                class: 'stats'
            }
        });
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(statsDiv);
        return {
            container: messageDiv,
            content: contentDiv,
            stats: statsDiv
        };
    }
}

// Handle message sending and receiving
async function handleMessageExchange(userInput) {
    if (!userInput || !selectedModel) return;
    
    // Show loading state for the selected model
    const modelButton = $(`button[data-model="${selectedModel}"]`);
    updateButtonStatus(modelButton, 'loading');
    
    // Add user message to history
    messageHistory.push({
        role: 'user',
        content: userInput
    });
    
    // Create and add user message element to chat
    const userMessage = createMessageElements(userInput, 'user');
    chatbox.appendChild(userMessage);
    
    // Clear input box
    messagebox.text('');
    
    // Create AI response elements
    const aiElements = createMessageElements('', 'assistant');
    chatbox.appendChild(aiElements.container);
    
    // Scroll to bottom of chat
    chatbox.get(0).scrollTop = chatbox.get(0).scrollHeight;
    
    try {
        // Send the message and get reader
        const reader = await sendMessage(selectedModel, messageHistory);
        
        // Update model button status after successful send
        updateButtonStatus(modelButton, 'loaded');
        
        // Process the response stream with callbacks
        await receiveMessage(reader,
            // onChunk callback - update content as chunks arrive
            (chunk, fullResponse, stats) => {
                aiElements.content.text(fullResponse);
                aiElements.stats.text(`Rate: ${stats.tokensPerSecond} tok/s`);
                
                // Auto-scroll to bottom as content arrives
                chatbox.get(0).scrollTop = chatbox.get(0).scrollHeight;
            },
            // onComplete callback - finalize the message
            (fullResponse, stats) => {
                aiElements.content.text(fullResponse);
                aiElements.stats.text(`Rate: ${stats.tokensPerSecond} tok/s | Total: ${stats.tokenCount} tokens`);
                
                // Add AI response to history
                messageHistory.push({
                    role: 'assistant',
                    content: fullResponse
                });
            },
            // onError callback
            (error) => {
                aiElements.content.text(`Error sending message: ${error.message}`);
                aiElements.stats.text('Error');
                updateButtonStatus(modelButton, 'error');
            });
    } catch (error) {
        console.error('Request failed:', error);
        aiElements.content.text(`Error sending message: ${error.message}`);
        updateButtonStatus(modelButton, 'error');
    }
}

// Add event listeners
let isComposing = false; // Flag to track input method composition state

// Add composition event listeners
messagebox.on('compositionstart', () => {
    isComposing = true;
});

messagebox.on('compositionend', () => {
    isComposing = false;
});

messagebox.on('keydown', async (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
        event.preventDefault();
        const userInput = messagebox.text().trim();
        if (userInput) {
            await handleMessageExchange(userInput);
        }
    }
});

// Initialize model list
await initModelList('model-list-container');