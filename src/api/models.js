// src/api/models.js
import { fetchAPI } from "./client.js";

export async function getModels() {
    const response = await fetchAPI("models");
    const data = await response.json();
    return data.models || [];
}

export async function getLoadedModel() {
    const response = await fetchAPI("loaded-model");
    const data = await response.json();
    return data.loadedModel;
}

export async function closeModel(modelName) {
    return fetchAPI("close", {
        method: "POST",
        body: JSON.stringify({ model: modelName }),
    });
}

export async function loadModel(modelName) {
    // This is a new function to load a model - in a real implementation
    // you would call an API endpoint to load the model
    return fetchAPI("load", {
        method: "POST",
        body: JSON.stringify({ model: modelName }),
    });
}
