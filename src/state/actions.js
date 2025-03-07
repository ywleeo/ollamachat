// src/state/actions.js
import store from "./store.js";
import {
    getModels,
    getLoadedModel,
    closeModel,
    loadModel,
} from "../api/models.js";
import { sendChatMessage } from "../api/chat.js";

// Add a global variable to hold the current reader controller
let currentResponseController = null;

export async function initializeModels() {
    try {
        const loadedModel = await getLoadedModel();
        const models = await getModels();

        // Load persisted selected model from localStorage if available
        const persistedModel = localStorage.getItem("selectedModel");

        store.setState({
            models,
            loadedModel,
            selectedModel:
                persistedModel ||
                loadedModel ||
                (models.length > 0 ? models[0].name : null),
        });
    } catch (error) {
        console.error("Failed to initialize models:", error);
        throw error;
    }
}

export async function selectModel(modelName) {
    console.log("selectModel called with:", modelName);
    const { loadedModel, modelStatus } = store.getState();

    // Skip if already in a transition state
    if (
        modelStatus &&
        modelStatus[modelName] &&
        (modelStatus[modelName] === "loading" ||
            modelStatus[modelName] === "closing")
    ) {
        return;
    }

    // Update UI immediately to show selection
    store.setState({
        selectedModel: modelName,
    });

    // Save selected model to localStorage
    localStorage.setItem("selectedModel", modelName);

    // If there's already a model loaded and it's different from the selected one
    if (loadedModel && loadedModel !== modelName) {
        // Set loading state for the closing operation
        const updatedStatus = { ...store.getState().modelStatus };
        updatedStatus[loadedModel] = "closing";

        store.setState({
            modelStatus: updatedStatus,
        });

        try {
            // Close the current model - this is an async operation
            await closeModel(loadedModel);

            // Clear the status for closed model - only do this AFTER closing is complete
            const postCloseStatus = { ...store.getState().modelStatus };
            delete postCloseStatus[loadedModel];

            store.setState({
                loadedModel: null, // Important: mark that no model is loaded during transition
                modelStatus: postCloseStatus,
            });
        } catch (error) {
            console.error("Failed to close model:", error);
            // Reset the status in case of error
            const errorStatus = { ...store.getState().modelStatus };
            delete errorStatus[loadedModel];
            store.setState({ modelStatus: errorStatus });
        }
    }

    // Now that previous model is fully closed, start loading the new one
    const loadingStatus = { ...store.getState().modelStatus };
    loadingStatus[modelName] = "loading";

    store.setState({
        modelStatus: loadingStatus,
    });

    try {
        // Load the model
        await loadModel(modelName);

        // Update the state to show the model is loaded
        const loadedStatus = { ...store.getState().modelStatus };
        loadedStatus[modelName] = "loaded";

        store.setState({
            loadedModel: modelName,
            modelStatus: loadedStatus,
        });

        // Store loaded model in localStorage
        localStorage.setItem("loadedModel", modelName);
    } catch (error) {
        // Handle loading error
        const errorStatus = { ...store.getState().modelStatus };
        errorStatus[modelName] = "error";

        store.setState({
            modelStatus: errorStatus,
        });
        console.error("Failed to load model:", error);
    }
}

export function setResponseState(isResponding) {
    store.setState({ isResponding });
}

export async function sendMessage(message) {
    const { selectedModel, messageHistory } = store.getState();

    // Add user message to history
    const updatedHistory = [
        ...messageHistory,
        { role: "user", content: message, sender: "You" },
    ];

    store.setState({
        messageHistory: updatedHistory,
        isResponding: true,
    });

    try {
        // Create an AbortController to allow stopping the response
        const controller = new AbortController();
        currentResponseController = controller;
        
        const response = await sendChatMessage(
            selectedModel, 
            updatedHistory, 
            controller.signal
        );
        
        return response.body.getReader();
    } catch (error) {
        // Check if this is an abort error (user clicked stop)
        if (error.name === 'AbortError') {
            console.log('Request was aborted by user');
        } else {
            console.error('Request failed:', error);
        }
        
        store.setState({ isResponding: false });
        throw error;
    }
}

export function stopResponseGeneration() {
    if (currentResponseController) {
        // Abort the current fetch request
        currentResponseController.abort();
        currentResponseController = null;
        
        // Update state
        store.setState({ isResponding: false });
        
        // Add a note that the response was stopped
        const { messageHistory } = store.getState();
        if (messageHistory.length > 0) {
            const lastMessage = messageHistory[messageHistory.length - 1];
            
            // If the last message is from the assistant, update it to show it was stopped
            if (lastMessage.role === 'assistant') {
                const updatedHistory = [...messageHistory];
                updatedHistory[updatedHistory.length - 1] = {
                    ...lastMessage,
                    stats: lastMessage.stats + ' [Stopped]'
                };
                
                store.setState({ messageHistory: updatedHistory });
            }
        }
    }
}

export function addAssistantResponse(content, statsText = "") {
    const { messageHistory } = store.getState();

    store.setState({
        messageHistory: [
            ...messageHistory,
            {
                role: "assistant",
                content,
                stats: statsText,
                sender: "Ollama",
            },
        ],
        isResponding: false,
    });
}