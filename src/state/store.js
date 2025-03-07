class Store {
    constructor() {
      this.state = {
        selectedModel: null,
        loadedModel: null,
        modelStatus: {},
        messageHistory: [],
        isResponding: false
      };
      this.listeners = [];
    }
  
    getState() {
      return { ...this.state };
    }
  
    setState(newState) {
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