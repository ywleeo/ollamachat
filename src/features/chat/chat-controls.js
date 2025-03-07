import $ from "../../utils/dom.js";
import store from "../../state/store.js";
import { stopResponseGeneration } from "../../state/actions.js";

class ChatControls {
    constructor() {
        // Get references using DOM utilities
        this.stopButton = $("#stop-button");
        this.bodyElement = $("body");
        
        this.setupEventListeners();
        
        // Subscribe to state changes
        store.subscribe((state) => {
            if (state.isResponding) {
                this.bodyElement.addClass("is-responding");
            } else {
                this.bodyElement.removeClass("is-responding");
            }
        });
    }
    
    setupEventListeners() {
        // Add click handler using DOM utility
        this.stopButton.on("click", () => {
            console.log("Stop button clicked");
            stopResponseGeneration();
        });
    }
}

export default ChatControls;