import $, {
    LeeoQuery
} from "../util/leeo.js";
import {
    getModels,
    sendMessage,
    receiveMessage
} from "../util/api.js";
let selectedModel = 'deepseek-r1:14b'; // Default selected model
const chatbox = $("#chatbox");
const messagebox = $("#messagebox");
let messageHistory = []; // Store message history
let currentModelRunning = false;
const statusDisplay = $("#model-status");
// Initialize model list
async function initModelList(containerId) {
    const containerElement = $(`#${containerId}`);
    const models = await getModels();
    if (models.length === 0) {
        containerElement.text('No models available');
        return;
    }
    // Clear container
    containerElement.text('');
    // Create model buttons
    models.forEach(model => {
        const modelButton = $.create('button');
        modelButton.text(model.name);
        if (model.name === selectedModel) {
            modelButton.addClass('model-selected');
        }
        modelButton.on('click', async () => {
            // First check if we need to close the current model
            if (currentModelRunning && selectedModel !== model.name) {
                updateStatus("Closing previous model...");
                await closeModel(selectedModel);
            }
            
            // Remove selection from other buttons
            containerElement.find('button').for(btn => {
                $(btn).removeClass('model-selected');
            });
            // Add selection to current button
            modelButton.addClass('model-selected');
            // Update selected model
            selectedModel = model.name;
            
            // Try to initialize the model
            updateStatus(`Initializing ${selectedModel}...`);
            await initializeModel(selectedModel);
        });
        containerElement.appendChild(modelButton);
    });
    
    // Add status display below model list
    statusDisplay.addClass('model-status');
    containerElement.parent().appendChild(statusDisplay);
    
    // Check if default model is running
    updateStatus("Checking model status...");
    await initializeModel(selectedModel);
}
async function closeModel(modelName) {
    try {
        const response = await fetch('/api/close-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: modelName })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to close model: ${response.statusText}`);
        }
        
        currentModelRunning = false;
        updateStatus(`Model ${modelName} closed`);
        return true;
    } catch (error) {
        console.error("Error closing model:", error);
        updateStatus(`Error closing model: ${error.message}`, true);
        return false;
    }
}

async function initializeModel(modelName) {
    try {
        updateStatus(`Initializing ${modelName}...`);
        
        // Check if model is loaded using a lightweight query
        const response = await fetch('/api/check-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: modelName })
        });
        
        if (!response.ok) {
            throw new Error(`Model check failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.loaded) {
            currentModelRunning = true;
            updateStatus(`@ ${modelName} ready`);
        } else {
            updateStatus(`@ ${modelName} loading... This may take a moment.`);
            // You might want to poll until it's ready
            setTimeout(() => checkModelStatus(modelName), 5000);
        }
        
        return data.loaded;
    } catch (error) {
        console.error("Error initializing model:", error);
        updateStatus(`Error initializing model: ${error.message}`, true);
        return false;
    }
}

function updateStatus(message, isError = false) {
    statusDisplay.text(message);
    if (isError) {
        statusDisplay.addClass('error');
    } else {
        statusDisplay.removeClass('error');
    }
}

async function checkModelStatus(modelName) {
    try {
        const response = await fetch('/api/check-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: modelName })
        });
        
        if (!response.ok) {
            throw new Error(`Model check failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.loaded) {
            currentModelRunning = true;
            updateStatus(`@ ${modelName} ready`);
        } else {
            updateStatus(`@ ${modelName} still loading...`);
            setTimeout(() => checkModelStatus(modelName), 5000);
        }
    } catch (error) {
        console.error("Error checking model status:", error);
        updateStatus(`Error checking model: ${error.message}`, true);
    }
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
    try {
        // Send the message and get reader
        const reader = await sendMessage(selectedModel, messageHistory);
        // Process the response stream with callbacks
        await receiveMessage(reader,
            // onChunk callback - update content as chunks arrive
            (chunk, fullResponse, stats) => {
                aiElements.content.text(fullResponse);
                aiElements.stats.text(`Rate: ${stats.tokensPerSecond} tok/s`);
            },
            // onComplete callback - finalize the message
            (fullResponse, stats) => {
                aiElements.content.text(fullResponse);
                aiElements.stats.text(`Rate: ${stats.tokensPerSecond} tok/s`);
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
            });
    } catch (error) {
        console.error('Request failed:', error);
        aiElements.content.text(`Error sending message: ${error.message}`);
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
        console.log('Enter key pressed - event fired');
        event.preventDefault();
        const userInput = messagebox.text().trim();
        await handleMessageExchange(userInput);
    }
});
// Initialize model list
await initModelList('model-list-container');