import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const { message, model, messages, stream } = req.body;

    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 确保发送到 Ollama 的请求格式正确
        const requestBody = {
            model: model || 'deepseek-r1:14b', 
            messages: messages || [{ role: 'user', content: message }],
            stream: stream !== undefined ? stream : true
        };

        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            const errorText = await response.text();
            console.error(`Error details: ${errorText}`);
            res.status(response.status).json({ error: `HTTP error! status: ${response.status}` });
            return;
        }

        if (response.body) {
            for await (const chunk of response.body) {
                const chunkText = new TextDecoder().decode(chunk);
                
                const lines = chunkText.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        
                        // 转换Ollama格式到我们的客户端格式
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
        res.status(500).json({ error: 'An error occurred during fetch' });
    }
});

app.get('/api/models', async (req, res) => {
    try {
        const response = await fetch('http://localhost:11434/api/tags', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            const errorText = await response.text();
            console.error(`Error details: ${errorText}`);
            return res.status(response.status).json({ error: `HTTP error! status: ${response.status}` });
        }

        const data = await response.json();
        
        // 将数据格式转换为前端期望的格式
        res.json({ models: data.models || [] });

    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ error: 'An error occurred while fetching models' });
    }
});

// Add these endpoints to your server.js file
app.post('/api/check-model', async (req, res) => {
    const { model } = req.body;
    
    if (!model) {
        return res.status(400).json({ error: 'Model name is required' });
    }
    
    try {
        // Send a simple ping to Ollama to check if the model is loaded
        const response = await fetch('http://localhost:11434/api/show', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: model })
        });
        
        if (!response.ok) {
            // If model isn't found or isn't loaded
            return res.json({ loaded: false });
        }
        
        const data = await response.json();
        return res.json({ loaded: true, modelInfo: data });
        
    } catch (error) {
        console.error("Error checking model:", error);
        res.status(500).json({ error: 'Failed to check model status' });
    }
});

import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Update your close-model endpoint
app.post('/api/close-model', async (req, res) => {
    const { model } = req.body;
    
    if (!model) {
        return res.status(400).json({ error: 'Model name is required' });
    }
    
    try {
        // First get the list of running models
        const { stdout } = await execPromise('ollama ps');
        
        // Parse the output to find the model's process ID
        const lines = stdout.split('\n').filter(line => line.includes(model));
        
        if (lines.length === 0) {
            return res.json({ success: true, message: 'Model not running' });
        }
        
        // Extract process IDs
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 1) {
                const processId = parts[0];
                // Kill the process
                await execPromise(`ollama stop ${processId}`);
            }
        }
        
        res.json({ success: true, message: 'Model stopped successfully' });
    } catch (error) {
        console.error("Error closing model:", error);
        res.status(500).json({ error: `Failed to close model: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Server running... http://127.0.0.1:${port}`);
});