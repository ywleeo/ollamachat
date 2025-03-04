// api.js - Utility module for API communication
import $ from "../util/leeo.js";

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
        return data.models || [];
    } catch (error) {
        console.error("Failed to fetch models:", error);
        return [];
    }
}

// Send message to the API
async function sendMessage(model, messages) {
    try {
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
        
        return response.body.getReader();
    } catch (error) {
        console.error('Request failed:', error);
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

export { getModels, sendMessage, receiveMessage };