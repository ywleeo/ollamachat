import $, {LeeoQuery} from "../util/leeo.js"

let selectedModel = 'deepseek-r1:14b'; // 默认选中的模型
const chatbox = $("#chatbox");
const messagebox = $("#messagebox");
let messageHistory = []; // 存储消息历史

// 获取所有可用的Ollama模型
async function getModels() {
    try {
        const response = await fetch('/api/models', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error("获取模型列表失败:", error);
        return [];
    }
}
// 发送消息函数
async function sendMessage(selectedModel, messageHistory) {
    const response = await fetch('/your-endpoint', { // 替换为实际的API端点
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: selectedModel,
            messages: messageHistory,
            stream: true
        })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    return response.body.getReader();
}

// 接收消息函数
async function receiveMessage(reader, decoder, contentDiv, statsDiv) {
    let lastUpdateTime = Date.now();
    let lastTokenCount = 0;
    let fullResponse = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value);
        
        const lines = chunkText.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            try {
                if (!line) continue;
                
                const data = JSON.parse(line);
                
                if (data.chunk) {
                    fullResponse += data.chunk;
                    // 调用填充聊天框函数
                    populateChatBox(fullResponse, contentDiv, statsDiv, lastUpdateTime, lastTokenCount);
                }
            } catch (error) {
                console.error("Error parsing line:", error);
            }
        }
    }
}

// 填充聊天框函数
function populateChatBox(fullResponse, contentDiv, statsDiv, lastUpdateTime, lastTokenCount) {
    contentDiv.text(fullResponse);
    
    const currentTime = Date.now();
    const currentTokens = fullResponse.length / 4; // 假设每个token占4个字符
    const timeDiff = (currentTime - lastUpdateTime) / 1000;
    
    if (timeDiff >= 0.5) { // 每0.5秒更新一次速率
        const tokenDiff = currentTokens - lastTokenCount;
        const instantRate = (tokenDiff / timeDiff).toFixed(1);
        statsDiv.text(`Rate: ${instantRate} tok/s`);
        
        lastUpdateTime = currentTime;
        lastTokenCount = currentTokens;
    }
}

// 初始化模型列表
async function initModelList(containerId) {
    const containerElement = $(`#${containerId}`);
    const models = await getModels();
    
    if (models.length === 0) {
        containerElement.text('没有可用的模型');
        return;
    }
    
    // 清空容器
    containerElement.text('');
    
    // 创建模型按钮
    models.forEach(model => {
        const modelButton = $.create('button');
        modelButton.text(model.name);
        if (model.name === selectedModel) {
            modelButton.addClass('model-selected');
        }
        modelButton.on('click', () => {
            // 移除其他按钮的选中状态
            containerElement.find('button').for(btn => {
                $(btn).removeClass('model-selected');
            });
            // 添加当前按钮的选中状态
            modelButton.addClass('model-selected');
            // 更新选中的模型
            selectedModel = model.name;
        });
        containerElement.appendChild(modelButton);
    });
}

// 添加事件监听器
let isComposing = false;  // 添加一个标志来跟踪输入法组合状态

// 添加组合事件监听
messagebox.on('compositionstart', () => {
    isComposing = true;
});

messagebox.on('compositionend', () => {
    isComposing = false;
});

messagebox.on('keydown', async (event) => {
    if (event.key === 'Enter' && !event.shiftKey &&  !isComposing) {
        console.log('Enter key pressed - event fired'); 
        event.preventDefault();
        
        const userInput = messagebox.text().trim();
        if (!userInput || !selectedModel) return;

        // 添加用户消息到历史记录
        messageHistory.push({ role: 'user', content: userInput });
        
        // 创建消息元素并添加到聊天框
        chatbox.appendChild(
            $.create('div', { attributes: { class: 'message user' } })
             .text(`You: ${userInput}`)
        );
        
        // 清空输入框
        messagebox.text('');
        
        // 准备AI回复的容器
        const messageDiv = $.create('div', { attributes: { class: 'message ollama' } });
        const contentDiv = $.create('div', { attributes: { class: 'content' } });
        const statsDiv = $.create('div', { attributes: { class: 'stats' } });
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(statsDiv);
        chatbox.appendChild(messageDiv);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: messageHistory
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let startTime = Date.now();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value);
                const lines = chunkText.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.chunk) {
                            fullResponse += data.chunk;
                            contentDiv.text(fullResponse);
                        }
                        if (data.done) {
                            const elapsedSeconds = (Date.now() - startTime) / 1000;
                            const totalTokens = Math.floor(fullResponse.length / 4);
                            const tokensPerSecond = (totalTokens / elapsedSeconds).toFixed(1);
                            statsDiv.text(`速率: ${tokensPerSecond} tok/s`);
                            messageHistory.push({ role: 'assistant', content: fullResponse });
                            break;
                        }
                    } catch (error) {
                        console.error('JSON解析错误:', error);
                    }
                }
            }
            
        } catch (error) {
            console.error('请求失败:', error);
            contentDiv.text('发送消息时出错: ' + error.message);
        }
    }
});
// 导出函数，使其可以在其他文件中使用
export { sendMessage, getModels, initModelList };
// 初始化模型列表
await initModelList('model-list-container');