// Track loaded model status
let currentlyLoadedModel = null;
let modelLoadStatus = {};

// Get all available Ollama models
async function getModels() {
    try {
        const response = await fetch('/api/models', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const models = data.models || [];
        
        // Initialize model status
        models.forEach(model => {
            if (!modelLoadStatus[model.name]) {
                modelLoadStatus[model.name] = 'available';
            }
        });
        
        return models;
    } catch (error) {
        console.error("Failed to fetch models:", error);
        return [];
    }
}

// Check if model is loaded
function isModelLoaded(modelName) {
    return currentlyLoadedModel === modelName;
}

// Get model status
function getModelStatus(modelName) {
    return modelLoadStatus[modelName] || 'unknown';
}

// Close currently loaded model
async function closeCurrentModel() {
    if (!currentlyLoadedModel) return true;
    
    try {
        const response = await fetch('/api/close', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentlyLoadedModel
            })
        });
        
        if (!response.ok) {
            console.error(`Error closing model: ${response.statusText}`);
            return false;
        }
        
        // Update tracking variables
        modelLoadStatus[currentlyLoadedModel] = 'available';
        currentlyLoadedModel = null;
        return true;
    } catch (error) {
        console.error('Error closing model:', error);
        return false;
    }
}

// Preload a model
async function preloadModel(modelName) {
    if (currentlyLoadedModel === modelName) {
        return true; // Already loaded
    }
    
    try {
        // Close current model if one is loaded
        if (currentlyLoadedModel) {
            await closeCurrentModel();
        }
        
        modelLoadStatus[modelName] = 'loading';
        
        // Send a minimal prompt to initialize the model
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelName,
                messages: [{ role: 'user', content: 'Initialize' }]
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // Process the response to ensure model is loaded
        const reader = response.body.getReader();
        await processModelInitResponse(reader);
        
        // Update model status
        console.log(`Model ${modelName} loaded successfully`);
        currentlyLoadedModel = modelName;
        modelLoadStatus[modelName] = 'loaded';
        return true;
    } catch (error) {
        console.error(`Failed to preload model ${modelName}:`, error);
        modelLoadStatus[modelName] = 'error';
        return false;
    }
}

// Process initialization response
async function processModelInitResponse(reader) {
    const decoder = new TextDecoder();
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Just consume the response to complete initialization
            decoder.decode(value);
        }
    } catch (error) {
        console.error('Model initialization error:', error);
        throw error;
    }
}

// Send message to the API
async function sendMessage(model, messages) {
    try {
        // Close current model if different
        if (currentlyLoadedModel && currentlyLoadedModel !== model) {
            await closeCurrentModel();
        }
        
        // Update status to loading if not already loaded
        if (!isModelLoaded(model)) {
            modelLoadStatus[model] = 'loading';
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // Update model status after successful request
        currentlyLoadedModel = model;
        modelLoadStatus[model] = 'loaded';
        
        return response.body.getReader();
    } catch (error) {
        console.error('Request failed:', error);
        modelLoadStatus[model] = 'error';
        throw error;
    }
}

// Process stream of messages with callback
async function receiveMessage(reader, onChunk, onComplete, onError) {
    const decoder = new TextDecoder();
    let fullResponse = '';
    let startTime = Date.now();
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value);
            const lines = chunkText.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.chunk) {
                        fullResponse += data.chunk;
                        
                        // Call the chunk callback with the current chunk and full response
                        if (onChunk) {
                            const elapsedTime = (Date.now() - startTime) / 1000;
                            const tokenCount = Math.floor(fullResponse.length / 4); // Estimate token count
                            const tokensPerSecond = (tokenCount / elapsedTime).toFixed(1);
                            
                            onChunk(data.chunk, fullResponse, {
                                elapsedTime,
                                tokenCount,
                                tokensPerSecond
                            });
                        }
                    }
                    
                    if (data.done && onComplete) {
                        const elapsedSeconds = (Date.now() - startTime) / 1000;
                        const totalTokens = Math.floor(fullResponse.length / 4);
                        const tokensPerSecond = (totalTokens / elapsedSeconds).toFixed(1);
                        
                        onComplete(fullResponse, {
                            elapsedTime: elapsedSeconds,
                            tokenCount: totalTokens,
                            tokensPerSecond
                        });
                    }
                } catch (error) {
                    console.error('JSON parse error:', error);
                    if (onError) onError(error);
                }
            }
        }
    } catch (error) {
        console.error('Stream processing error:', error);
        if (onError) onError(error);
    }
    
    return fullResponse;
}

export { 
    getModels, 
    sendMessage, 
    receiveMessage, 
    preloadModel,
    closeCurrentModel,
    isModelLoaded,
    getModelStatus
};