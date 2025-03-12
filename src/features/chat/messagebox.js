import $ from "../../utils/dom.js";
import store from "../../state/store.js";
import {
    sendMessage,
    addAssistantResponse,
    setResponseState,
} from "../../state/actions.js";

class Messagebox {
    constructor(element) {
        this.element = element || $("#messagebox");
        this.isComposing = false;
        this.responseStats = {
            startTime: null,
            tokens: 0,
            duration: 0,
        };

        this.setupEventListeners();

        // Subscribe to state changes
        store.subscribe((state) => {
            if (state.isResponding) {
                this.disable();
            } else {
                this.enable();
            }
        });
    }

    setupEventListeners() {
        this.element.on("compositionstart", () => {
            this.isComposing = true;
        });

        this.element.on("compositionend", () => {
            this.isComposing = false;
        });

        // Add paste event handler to strip formatting
        this.element.on("paste", (event) => {
            // Prevent the default paste
            event.preventDefault();
            
            // Get plain text from clipboard
            const text = event.clipboardData.getData("text/plain");
            
            // Insert text at cursor position
            document.execCommand("insertText", false, text);
        });

        this.element.on("keydown", async (event) => {
            if (event.key === "Enter" && !event.shiftKey && !this.isComposing) {
                event.preventDefault();

                const { isResponding } = store.getState();
                if (isResponding) {
                    this.shakeEffect();
                    return;
                }

                const userInput = this.getText().trim();
                if (userInput) {
                    this.clear();
                    await this.handleSendMessage(userInput);
                }
            }
        });
    }

    async handleSendMessage(message) {
        try {
            // Reset stats for new message
            this.responseStats = {
                startTime: Date.now(),
                tokens: 0,
                duration: 0,
                prevText: "",
            };

            const reader = await sendMessage(message);

            // Process the stream
            const decoder = new TextDecoder();
            let fullResponse = "";

            while (true) {
                try {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunkText = decoder.decode(value);
                    const lines = chunkText
                        .split("\n")
                        .filter((line) => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.chunk) {
                                fullResponse += data.chunk;
                                this.updateAssistantResponse(fullResponse);
                            }

                            if (data.done) {
                                // Calculate final stats
                                this.responseStats.duration =
                                    (Date.now() - this.responseStats.startTime) /
                                    1000;
                                const finalStats = this.formatStats(
                                    this.responseStats
                                );
                                addAssistantResponse(fullResponse, finalStats);
                            }
                        } catch (error) {
                            console.error("JSON parse error:", error);
                        }
                    }
                } catch (error) {
                    // Check if this is an abort error (user clicked stop)
                    if (error.name === 'AbortError') {
                        console.log('Response generation was stopped by user');
                        break;
                    } else {
                        throw error; // Re-throw unexpected errors
                    }
                }
            }
        } catch (error) {
            // Only log non-abort errors
            if (error.name !== 'AbortError') {
                console.error("Send message failed:", error);
            }
            setResponseState(false);
        }
    }

    updateAssistantResponse(text) {
        // Update token count for stats
        const newTokens = this.countTokens(text, this.responseStats.prevText);
        this.responseStats.tokens += newTokens;
        this.responseStats.prevText = text;

        // Format the stats string
        const statsText = this.formatStats(this.responseStats);

        // This will be used to update the response in real-time
        const lastMessage = $(".message.ollama:last-child");
        const chatbox = $("#chatbox");
        const chatboxElement = chatbox.get(0);
        
        // Check if we're at the bottom before updating
        const wasAtBottom = chatboxElement.scrollHeight - chatboxElement.scrollTop - chatboxElement.clientHeight <= 30;
        
        if (lastMessage.elements.length > 0) {
            lastMessage.find(".content").text(text);
            lastMessage.find(".stats").text(statsText);
        } else {
            // Create a new message container if none exists
            const messageDiv = $.create("div", {
                attributes: { class: "message ollama" },
            });
            const contentDiv = $.create("div", {
                attributes: { class: "content" },
            }).text(text);
            const statsDiv = $.create("div", {
                attributes: { class: "stats" },
            }).text(statsText);

            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(statsDiv);
            chatbox.appendChild(messageDiv);
        }

        // Only scroll if we were already at the bottom
        if (wasAtBottom) {
            chatboxElement.scrollTop = chatboxElement.scrollHeight;
        }
    }

    formatStats(stats) {
        const elapsedSecs = (Date.now() - stats.startTime) / 1000;
        const tokensPerSecond =
            elapsedSecs > 0 ? (stats.tokens / elapsedSecs).toFixed(1) : 0;
        return `${stats.tokens} tokens | ${tokensPerSecond} tokens/s`;
    }

    // Simple token counter (rough estimate)
    countTokens(text, prevText) {
        // Get only new text since last update
        const newText = text.slice(prevText.length);
        // Split by whitespace and punctuation for a rough token count
        // This is just an approximation - real tokenizers are more complex
        return newText.split(/[\s,.!?;:"'-]+/).filter(Boolean).length || 1;
    }

    getText() {
        // Get the HTML content including newlines
        const html = this.element.get(0).innerHTML;
        
        // Replace <div><br></div> and <div>text</div> with newlines and text
        const text = html
            .replace(/<div><br><\/div>/gi, '\n')
            .replace(/<div>(.*?)<\/div>/gi, '\n$1')
            .replace(/<br>/gi, '\n');
            
        // Remove any remaining HTML tags
        const plainText = text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ');
            
        // Handle the first line which doesn't start with a newline
        return plainText.startsWith('\n') ? plainText.substring(1) : plainText;
    }

    clear() {
        this.element.text("");
    }

    disable() {
        this.element.addClass("disabled");
    }

    enable() {
        this.element.removeClass("disabled");
    }

    shakeEffect() {
        this.element.addClass("shake");
        setTimeout(() => {
            this.element.removeClass("shake");
        }, 500);
    }
}

export default Messagebox;