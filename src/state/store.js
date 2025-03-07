// src/state/store.js
class Store {
    constructor() {
      // Initialize with default empty state
      this.state = {
        selectedModel: null,
        loadedModel: null,
        modelStatus: {},
        messageHistory: [],
        isResponding: false,
        models: []
      };
      this.listeners = [];
      
      // Load persisted state
      this.loadPersistedState();
    }
    
    loadPersistedState() {
      try {
        const persistedModel = localStorage.getItem('selectedModel');
        const persistedLoadedModel = localStorage.getItem('loadedModel');
        
        
        if (persistedModel) {
          this.state.selectedModel = persistedModel;
        }
        
        if (persistedLoadedModel) {
          this.state.loadedModel = persistedLoadedModel;
          
          // Initialize modelStatus if needed
          if (!this.state.modelStatus) {
            this.state.modelStatus = {};
          }
          
          // Mark the loaded model as loaded
          this.state.modelStatus[persistedLoadedModel] = 'loaded';
        }
      } catch (e) {
        console.error('Failed to load persisted state:', e);
      }
    }
  
    getState() {
      return { ...this.state };
    }
  
    setState(newState) {
      // console.log('Setting state:', newState);
      this.state = { ...this.state, ...newState };
      this.notifyListeners();
    }
  
    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }
  
    notifyListeners() {
      this.listeners.forEach(listener => listener(this.state));
    }
  }
  
  export default new Store();