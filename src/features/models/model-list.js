// src/features/models/model-list.js
import $ from '../../utils/dom.js';
import store from '../../state/store.js';
import { fetchAPI } from '../../api/client.js';

class ModelList {
  constructor(container) {
    this.container = container || $('#model-list-container');
    
    // Subscribe to state changes
    store.subscribe(state => {
      this.render(state);
    });
  }
  
  render(state) {
    const { models, selectedModel, loadedModel, modelStatus } = state;
    
    // Debug logging
    console.log('Rendering models with state:', {
      selectedModel,
      loadedModel,
      modelStatus
    });
    
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
      const currentStatus = modelStatus && modelStatus[model.name] ? modelStatus[model.name] : 'available';
      
      let statusClass = 'status-available';
      let buttonText = model.name;
      
      if (currentStatus === 'loading') {
        statusClass = 'status-loading';
        buttonText = `Loading ${model.name}...`;
      } else if (currentStatus === 'closing') {
        statusClass = 'status-loading';
        buttonText = `Closing ${model.name}...`;
      } else if (currentStatus === 'error') {
        statusClass = 'status-error';
      } else if (isLoaded) {
        statusClass = 'status-loaded';
      }
      
      // Always add model-selected class if this is the selected model
      const buttonClass = `model-button ${isSelected ? 'model-selected' : ''} ${statusClass}`;
      
      console.log(`Creating button for ${model.name} with class ${buttonClass}`);
      
      const button = $.create('button', {
        attributes: { class: buttonClass }
      }).text(buttonText);
      
      // Direct event handler implementation
      button.on('click', async () => {
        console.log(`Clicked on model: ${model.name}`);
        
        // Skip if this model is already in a loading state
        if (currentStatus === 'loading' || currentStatus === 'closing') {
          return;
        }
        
        // Update UI immediately to show loading
        const newModelStatus = { ...state.modelStatus };
        newModelStatus[model.name] = 'loading';
        
        store.setState({
          selectedModel: model.name,
          modelStatus: newModelStatus
        });
        
        // Persist selection
        localStorage.setItem('selectedModel', model.name);
        
        try {
          // If another model is loaded, close it first
          if (loadedModel && loadedModel !== model.name) {
            console.log(`Closing model: ${loadedModel}`);
            newModelStatus[loadedModel] = 'closing';
            store.setState({ modelStatus: newModelStatus });
            
            try {
              await fetchAPI('close', {
                method: 'POST',
                body: JSON.stringify({ model: loadedModel })
              });
            } catch (closeError) {
              console.error('Error closing model:', closeError);
            }
          }
          
          // For demonstration, simulate loading with a timeout
          console.log(`Loading model: ${model.name}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Update state to show model is loaded
          const finalModelStatus = { ...store.getState().modelStatus };
          finalModelStatus[model.name] = 'loaded';
          
          // Clear status of previous model
          if (loadedModel && loadedModel !== model.name) {
            delete finalModelStatus[loadedModel];
          }
          
          store.setState({
            loadedModel: model.name,
            modelStatus: finalModelStatus
          });
          
          console.log(`Model ${model.name} loaded successfully`);
          
          // Persist loaded model
          localStorage.setItem('loadedModel', model.name);
        } catch (error) {
          console.error('Model operation failed:', error);
          const errorModelStatus = { ...store.getState().modelStatus };
          errorModelStatus[model.name] = 'error';
          store.setState({ modelStatus: errorModelStatus });
        }
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
}

export default ModelList;