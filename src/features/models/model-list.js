import $ from '../../utils/dom.js';
import store from '../../state/store.js';
import { selectModel } from '../../state/actions.js';

class ModelList {
  constructor(container) {
    this.container = container || $('#model-list-container');
    
    // Subscribe to state changes
    store.subscribe(state => {
      this.render(state);
    });
  }
  
  render(state) {
    const { models, selectedModel, loadedModel } = state;
    
    // Clear previous content
    this.container.empty();
    
    if (!models || models.length === 0) {
      this.renderStatus('No models available', 'status-error');
      return;
    }
    
    // Render each model as a button
    models.forEach(model => {
      const isSelected = model.name === selectedModel;
      const isLoaded = model.name === loadedModel;
      
      const buttonClass = `model-button ${isSelected ? 'model-selected' : ''} ${
        isLoaded ? 'status-loaded' : 'status-available'
      }`;
      
      const button = $.create('button', {
        attributes: { class: buttonClass }
      }).text(model.name);
      
      button.on('click', () => {
        this.handleModelSelect(model.name);
      });
      
      this.container.appendChild(button);
    });
  }
  
  renderStatus(message, statusClass) {
    const statusElement = $.create('div', {
      attributes: { class: `status-indicator ${statusClass}` }
    }).text(message);
    
    this.container.empty().appendChild(statusElement);
  }
  
  handleModelSelect(modelName) {
    selectModel(modelName);
  }
}

export default ModelList;