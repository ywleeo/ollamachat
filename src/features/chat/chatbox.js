import $ from "../../utils/dom.js";
import store from "../../state/store.js";
import { clearChatHistory } from "../../state/actions.js";

class Chatbox {
    constructor(element) {
        this.element = element || $("#chatbox");
        this._lastMessageHistory = [];
        this.autoScroll = true;
        this.scrollThreshold = 30; // pixels from bottom to consider "at bottom"

        // Get initial messages from HTML if present
        this.saveInitialMessages();
        
        // Add the clear button
        this.addClearButton();

        // Setup scroll detection
        this.setupScrollDetection();

        // Listen for state changes
        store.subscribe((state) => {
            // Only update UI when message history changes
            if (state.messageHistory !== this._lastMessageHistory) {
                this._lastMessageHistory = state.messageHistory;
                this.renderMessages();
            }
        });
    }
    
    setupScrollDetection() {
        // Detect manual scrolling
        this.element.on("scroll", () => {
            const element = this.element.get(0);
            const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= this.scrollThreshold;
            
            // Only change autoScroll if it's different from current state
            if (this.autoScroll !== isAtBottom) {
                this.autoScroll = isAtBottom;
                // console.log("Auto scroll:", this.autoScroll);
            }
        });
    }
    
    addClearButton() {
        // First, ensure the chatbox is wrapped in a container with relative positioning
        const parent = this.element.get(0).parentNode;
        
        // Create wrapper if chatbox isn't already in one
        if (!parent.classList.contains('chatbox-wrapper')) {
            const wrapper = $.create("div", {
                attributes: { 
                    id: "chatbox-wrapper",
                    class: "chatbox-wrapper" 
                }
            });
            
            // Move the chatbox into the wrapper
            const chatbox = this.element.get(0);
            parent.replaceChild(wrapper.get(0), chatbox);
            wrapper.appendChild(chatbox);
            
            // Add clear button to the wrapper
            const clearButton = $.create("button", {
                attributes: {
                    id: "clear-chat-button",
                    title: "Clear chat history"
                }
            });
            
            // Add trash icon SVG
            clearButton.get(0).innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            `;
            
            // Add click event
            clearButton.on("click", () => {
                clearChatHistory();
            });
            
            wrapper.appendChild(clearButton);
        }
    }

    saveInitialMessages() {
        // Save any initial messages that are in the HTML
        const initialMessages = [];
        const userMessages = this.element.find(".message.user");
        const ollamaMessages = this.element.find(".message.ollama");

        // Process user messages
        userMessages.elements.forEach((el) => {
            const text = el.textContent.replace("You: ", "");
            initialMessages.push({ role: "user", content: text });
        });

        // Process assistant messages
        ollamaMessages.elements.forEach((el) => {
            const content = el.querySelector(".content")?.textContent || "";
            const stats = el.querySelector(".stats")?.textContent || "";
            initialMessages.push({ role: "assistant", content, stats });
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

        // Only scroll to bottom if autoScroll is enabled
        if (this.autoScroll) {
            this.scrollToBottom();
        }
    }

    renderUserMessage(text) {
        const messageDiv = $.create("div", {
            attributes: { class: "message user" },
        }).text(text);

        this.element.appendChild(messageDiv);
    }

    renderAssistantMessage(text, stats) {
        const messageDiv = $.create("div", {
            attributes: { class: "message ollama" },
        });

        const contentDiv = $.create("div", {
            attributes: { class: "content" },
        }).text(text);

        const statsDiv = $.create("div", {
            attributes: { class: "stats" },
        }).text(stats || "Welcome to Ollama Chat");

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(statsDiv);
        this.element.appendChild(messageDiv);
    }

    scrollToBottom() {
        this.element.get(0).scrollTop = this.element.get(0).scrollHeight;
    }
}

export default Chatbox;