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

app.listen(port, () => {
    console.log(`Server running... http://127.0.0.1:${port}`);
});