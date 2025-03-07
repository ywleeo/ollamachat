import $ from "../util/leeo.js";

class Messagebox {
    constructor(onSendCallback) {
        this.element = $("#messagebox");
        this.onSendCallback = onSendCallback;
        this.isComposing = false;
        this.isDisabled = false;
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
                
                // If disabled, shake the messagebox and don't send
                if (this.isDisabled) {
                    this.shakeEffect();
                    return;
                }
                
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
    
    // Disable messagebox during AI response
    disable() {
        this.isDisabled = true;
        this.element.addClass('disabled');
    }
    
    // Enable messagebox after AI response
    enable() {
        this.isDisabled = false;
        this.element.removeClass('disabled');
    }
    
    // Add shake effect to indicate messagebox is disabled
    shakeEffect() {
        this.element.addClass('shake');
        setTimeout(() => {
            this.element.removeClass('shake');
        }, 500);
    }
}

export default Messagebox;