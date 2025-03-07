import { fetchAPI } from './client.js';

export async function getModels() {
  const response = await fetchAPI('models');
  const data = await response.json();
  return data.models || [];
}

export async function getLoadedModel() {
  const response = await fetchAPI('loaded-model');
  const data = await response.json();
  return data.loadedModel;
}

export async function closeModel(modelName) {
  return fetchAPI('close', {
    method: 'POST',
    body: JSON.stringify({ model: modelName })
  });
}