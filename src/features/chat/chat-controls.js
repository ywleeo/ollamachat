import $ from "../../utils/dom.js";
import store from "../../state/store.js";
import { stopResponseGeneration } from "../../state/actions.js";

class ChatControls {
    constructor() {
        // Get direct reference to the DOM element
        this.stopButton = document.getElementById("stop-button");
        this.bodyElement = document.body;
        
        this.setupEventListeners();
        
        // Subscribe to state changes
        store.subscribe((state) => {
            if (state.isResponding) {
                this.bodyElement.classList.add("is-responding");
            } else {
                this.bodyElement.classList.remove("is-responding");
            }
        });
    }
    
    setupEventListeners() {
        // Add click handler using direct DOM method
        if (this.stopButton) {
            this.stopButton.addEventListener("click", () => {
                console.log("Stop button clicked");
                stopResponseGeneration();
            });
        } else {
            console.error("Stop button not found in the DOM");
        }
    }
}

export default ChatControls;