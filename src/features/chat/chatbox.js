import $ from "../../utils/dom.js";
import store from "../../state/store.js";

class Chatbox {
    constructor(element) {
        this.element = element || $("#chatbox");
        this._lastMessageHistory = [];

        // Get initial messages from HTML if present
        this.saveInitialMessages();

        // Listen for state changes
        store.subscribe((state) => {
            // Only update UI when message history changes
            if (state.messageHistory !== this._lastMessageHistory) {
                this._lastMessageHistory = state.messageHistory;
                this.renderMessages();
            }
        });
    }

    saveInitialMessages() {
        // Save any initial messages that are in the HTML
        const initialMessages = [];
        const userMessages = this.element.find(".message.user");
        const ollamaMessages = this.element.find(".message.ollama");

        userMessages.elements.forEach((el) => {
            const text = el.textContent.replace("You: ", "");
            initialMessages.push({ role: "user", content: text, sender: "You" });
        });
        
        ollamaMessages.elements.forEach((el) => {
            const content = el.querySelector(".content")?.textContent || "";
            const stats = el.querySelector(".stats")?.textContent || "";
            initialMessages.push({ role: "assistant", content, stats, sender: "Ollama" });
        });

        if (initialMessages.length > 0) {
            // Update the store with initial messages
            store.setState({ messageHistory: initialMessages });
        }
    }

    renderMessages() {
        const { messageHistory } = store.getState();

        // Clear existing messages
        this.element.empty();

        // Render each message
        messageHistory.forEach((message) => {
            if (message.role === "user") {
                this.renderUserMessage(message.content);
            } else {
                this.renderAssistantMessage(
                    message.content,
                    message.stats || ""
                );
            }
        });

        this.scrollToBottom();
    }

    renderUserMessage(text, sender = "You") {
        const messageDiv = $.create("div", {
            attributes: { class: "message user" },
        });
        
        const senderSpan = $.create("span", {
            attributes: { class: "sender" },
        }).text(`${sender}: `);
        
        const contentSpan = $.create("span", {
            attributes: { class: "content" },
        }).text(text);
        
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentSpan);
        this.element.appendChild(messageDiv);
    }

    renderAssistantMessage(text, stats, sender = "Ollama") {
        const messageDiv = $.create("div", {
            attributes: { class: "message ollama" },
        });
        
        const senderSpan = $.create("span", {
            attributes: { class: "sender" },
        }).text(`${sender}: `);
    
        const contentDiv = $.create("div", {
            attributes: { class: "content" },
        }).text(text);
    
        const statsDiv = $.create("div", {
            attributes: { class: "stats" },
        }).text(stats || "Welcome to Ollama Chat");
    
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(statsDiv);
        this.element.appendChild(messageDiv);
    }

    scrollToBottom() {
        this.element.get(0).scrollTop = this.element.get(0).scrollHeight;
    }
}

export default Chatbox;
