// src/state/actions.js
import store from "./store.js";
import {
    getModels,
    getLoadedModel,
    closeModel,
    loadModel,
} from "../api/models.js";
import { sendChatMessage } from "../api/chat.js";

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
        store.setState({
            modelStatus: {
                ...store.getState().modelStatus,
                [loadedModel]: "closing",
            },
        });

        try {
            // Close the current model
            await closeModel(loadedModel);

            // Clear the status for closed model
            const updatedStatus = { ...store.getState().modelStatus };
            delete updatedStatus[loadedModel];
            store.setState({ modelStatus: updatedStatus });
        } catch (error) {
            console.error("Failed to close model:", error);
        }
    }

    // Set loading state for the new model
    store.setState({
        modelStatus: {
            ...store.getState().modelStatus,
            [modelName]: "loading",
        },
    });

    try {
        // Load the model
        await loadModel(modelName);

        // Update the state to show the model is loaded
        store.setState({
            loadedModel: modelName,
            modelStatus: {
                ...store.getState().modelStatus,
                [modelName]: "loaded",
            },
        });

        // Store loaded model in localStorage
        localStorage.setItem("loadedModel", modelName);
    } catch (error) {
        // Handle loading error
        store.setState({
            modelStatus: {
                ...store.getState().modelStatus,
                [modelName]: "error",
            },
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
        { role: "user", content: message },
    ];

    store.setState({
        messageHistory: updatedHistory,
        isResponding: true,
    });

    try {
        const response = await sendChatMessage(selectedModel, updatedHistory);
        return response.body.getReader();
    } catch (error) {
        store.setState({ isResponding: false });
        throw error;
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
                stats: statsText, // Store stats with the message
            },
        ],
        isResponding: false,
    });
}
