// src/state/actions.js - Add loading functionality
import store from './store.js';
import { getModels, getLoadedModel, closeModel } from '../api/models.js';
import { sendChatMessage } from '../api/chat.js';

export async function initializeModels() {
  const loadedModel = await getLoadedModel();
  const models = await getModels();
  
  // Load persisted selected model from localStorage if available
  const persistedModel = localStorage.getItem('selectedModel');
  
  store.setState({
    models,
    loadedModel,
    selectedModel: persistedModel || loadedModel || (models.length > 0 ? models[0].name : null)
  });
}

export async function selectModel(modelName) {
  const { loadedModel } = store.getState();
  
  // If there's already a model loaded and it's different from the selected one
  if (loadedModel && loadedModel !== modelName) {
    // Set loading state for the closing operation
    store.setState({ 
      modelStatus: { ...store.getState().modelStatus, [loadedModel]: 'closing' }
    });
    
    try {
      // Close the current model
      await closeModel(loadedModel);
    } catch (error) {
      console.error('Failed to close model:', error);
    }
  }
  
  // Set loading state for the new model
  store.setState({ 
    selectedModel: modelName,
    modelStatus: { ...store.getState().modelStatus, [modelName]: 'loading' }
  });
  
  // Save selected model to localStorage
  localStorage.setItem('selectedModel', modelName);
  
  try {
    // Simulate loading the model (in a real implementation, this would call the API)
    // For now we'll use a timeout to simulate the loading process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update the state to show the model is loaded
    store.setState({ 
      loadedModel: modelName,
      modelStatus: { ...store.getState().modelStatus, [modelName]: 'loaded' }
    });
  } catch (error) {
    // Handle loading error
    store.setState({ 
      modelStatus: { ...store.getState().modelStatus, [modelName]: 'error' }
    });
    console.error('Failed to load model:', error);
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
    { role: 'user', content: message }
  ];
  
  store.setState({
    messageHistory: updatedHistory,
    isResponding: true
  });
  
  try {
    const response = await sendChatMessage(selectedModel, updatedHistory);
    return response.body.getReader();
  } catch (error) {
    store.setState({ isResponding: false });
    throw error;
  }
}

export function addAssistantResponse(content) {
  const { messageHistory } = store.getState();
  
  store.setState({
    messageHistory: [...messageHistory, { role: 'assistant', content }],
    isResponding: false
  });
}