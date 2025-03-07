import store from './store.js';
import { getModels, getLoadedModel, closeModel } from '../api/models.js';
import { sendChatMessage } from '../api/chat.js';

export async function initializeModels() {
  const loadedModel = await getLoadedModel();
  const models = await getModels();
  
  store.setState({
    models,
    loadedModel,
    selectedModel: loadedModel || (models.length > 0 ? models[0].name : null)
  });
}

export async function selectModel(modelName) {
  store.setState({ selectedModel: modelName });
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