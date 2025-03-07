import express from 'express';
import * as ollamaService from '../services/ollama-service.js';

const router = express.Router();

router.get('/models', async (req, res) => {
  try {
    const models = await ollamaService.fetchModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/loaded-model', async (req, res) => {
  try {
    const loadedModel = await ollamaService.getRunningModel();
    res.json({ loadedModel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/close', async (req, res) => {
  const { model } = req.body;
  
  if (!model) {
    return res.status(400).json({ error: 'Model name is required' });
  }
  
  try {
    await ollamaService.stopModel(model);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  const { model, messages } = req.body;
  
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const response = await ollamaService.sendChatRequest(model, messages);
    
    if (response.body) {
      for await (const chunk of response.body) {
        const chunkText = new TextDecoder().decode(chunk);
        
        const lines = chunkText.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            
            if (json.message && json.message.content) {
              res.write(JSON.stringify({ chunk: json.message.content }) + '\n');
            }
            
            if (json.done) {
              res.write(JSON.stringify({ done: true }) + '\n');
            }
          } catch (e) {
            console.error("JSON parse error:", e, "line:", line);
          }
        }
      }
    }
    res.end();
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;