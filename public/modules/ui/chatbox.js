import $ from "../util/leeo.js";

class Chatbox {
    constructor() {
        this.element = $("#chatbox");
        this.messageHistory = [];
    }

    // Create UI message elements
    createMessageElements(text, role) {
        if (role === 'user') {
            return $.create('div', {
                attributes: {
                    class: 'message user'
                }
            }).text(`You: ${text}`);
        } else {
            const messageDiv = $.create('div', {
                attributes: {
                    class: 'message ollama'
                }
            });
            const contentDiv = $.create('div', {
                attributes: {
                    class: 'content'
                }
            });
            const statsDiv = $.create('div', {
                attributes: {
                    class: 'stats'
                }
            });
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(statsDiv);
            return {
                container: messageDiv,
                content: contentDiv,
                stats: statsDiv
            };
        }
    }

    // Add user message to chat
    addUserMessage(text) {
        // Add user message to history
        this.messageHistory.push({
            role: 'user',
            content: text
        });
        
        // Create and add user message element to chat
        const userMessage = this.createMessageElements(text, 'user');
        this.element.appendChild(userMessage);
        this.scrollToBottom();
        
        return this.messageHistory;
    }

    // Prepare for AI response
    prepareAIResponse() {
        // Create AI response elements
        const aiElements = this.createMessageElements('', 'assistant');
        this.element.appendChild(aiElements.container);
        
        // Scroll to bottom of chat
        this.scrollToBottom();
        
        return aiElements;
    }

    // Add AI response to chat
    addAIResponse(text) {
        this.messageHistory.push({
            role: 'assistant',
            content: text
        });
    }

    // Scroll to bottom of chat
    scrollToBottom() {
        this.element.get(0).scrollTop = this.element.get(0).scrollHeight;
    }

    // Get message history
    getMessageHistory() {
        return this.messageHistory;
    }
}

export default Chatbox;