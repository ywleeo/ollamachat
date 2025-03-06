import $ from "../util/leeo.js";

class Messagebox {
    constructor(onSendCallback) {
        this.element = $("#messagebox");
        this.onSendCallback = onSendCallback;
        this.isComposing = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add composition event listeners for IME input
        this.element.on('compositionstart', () => {
            this.isComposing = true;
        });

        this.element.on('compositionend', () => {
            this.isComposing = false;
        });

        this.element.on('keydown', async (event) => {
            if (event.key === 'Enter' && !event.shiftKey && !this.isComposing) {
                event.preventDefault();
                const userInput = this.getText().trim();
                if (userInput) {
                    this.clear();
                    await this.onSendCallback(userInput);
                }
            }
        });
    }

    // Get text from messagebox
    getText() {
        return this.element.text();
    }

    // Clear messagebox
    clear() {
        this.element.text('');
    }
}

export default Messagebox;