import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const OLLAMA_ENDPOINT = 'http://localhost:11434';

export async function fetchModels() {
  const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.models || [];
}

export async function getRunningModel() {
  try {
    const { stdout } = await execPromise('ollama ps');
    
    if (stdout) {
      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        const modelLine = lines[1].trim();
        const modelName = modelLine.split(/\s+/)[0];
        return modelName;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error checking loaded model:", error);
    return null;
  }
}

export async function stopModel(modelName) {
  try {
    await execPromise(`ollama stop ${modelName} > /dev/null 2>&1`);
    return true;
  } catch (error) {
    console.log(`Error or model not running: ${error.message}`);
    return false;
  }
}

export async function sendChatRequest(model, messages, stream = true) {
  const requestBody = {
    model,
    messages,
    stream
  };
  
  const response = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
}

export default {
    fetchModels,
    getRunningModel,
    stopModel,
    sendChatRequest
  };