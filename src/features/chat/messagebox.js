import $ from '../../utils/dom.js';
import store from '../../state/store.js';
import { sendMessage, addAssistantResponse, setResponseState } from '../../state/actions.js';

class Messagebox {
  constructor(element) {
    this.element = element || $('#messagebox');
    this.isComposing = false;
    
    this.setupEventListeners();
    
    // Subscribe to state changes
    store.subscribe(state => {
      if (state.isResponding) {
        this.disable();
      } else {
        this.enable();
      }
    });
  }

  setupEventListeners() {
    this.element.on('compositionstart', () => {
      this.isComposing = true;
    });

    this.element.on('compositionend', () => {
      this.isComposing = false;
    });

    this.element.on('keydown', async (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !this.isComposing) {
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
      const reader = await sendMessage(message);
      
      // Process the stream
      const decoder = new TextDecoder();
      let fullResponse = '';
      
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
              this.updateAssistantResponse(fullResponse);
            }
            
            if (data.done) {
              addAssistantResponse(fullResponse);
            }
          } catch (error) {
            console.error('JSON parse error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Send message failed:', error);
      setResponseState(false);
    }
  }

  updateAssistantResponse(text) {
    // This will be used to update the response in real-time
    const lastMessage = $('.message.ollama:last-child');
    if (lastMessage.elements.length > 0) {
      lastMessage.find('.content').text(text);
    } else {
      // Create a new message container if none exists
      const messageDiv = $.create('div', {
        attributes: { class: 'message ollama' }
      });
      const contentDiv = $.create('div', {
        attributes: { class: 'content' }
      }).text(text);
      const statsDiv = $.create('div', {
        attributes: { class: 'stats' }
      });
      
      messageDiv.appendChild(contentDiv);
      messageDiv.appendChild(statsDiv);
      $('#chatbox').appendChild(messageDiv);
    }
    
    // Scroll to bottom
    $('#chatbox').get(0).scrollTop = $('#chatbox').get(0).scrollHeight;
  }

  getText() {
    return this.element.text();
  }

  clear() {
    this.element.text('');
  }
  
  disable() {
    this.element.addClass('disabled');
  }
  
  enable() {
    this.element.removeClass('disabled');
  }
  
  shakeEffect() {
    this.element.addClass('shake');
    setTimeout(() => {
      this.element.removeClass('shake');
    }, 500);
  }
}

export default Messagebox;