import Chatbox from './chatbox.js';
import Messagebox from './messagebox.js';

class ChatUI {
    constructor(onSendMessage) {
        this.chatbox = new Chatbox();
        this.messagebox = new Messagebox(onSendMessage);
    }

    getMessageHistory() {
        return this.chatbox.getMessageHistory();
    }

    addUserMessage(text) {
        return this.chatbox.addUserMessage(text);
    }

    prepareAIResponse() {
        return this.chatbox.prepareAIResponse();
    }

    addAIResponse(text) {
        return this.chatbox.addAIResponse(text);
    }
}

export { ChatUI };