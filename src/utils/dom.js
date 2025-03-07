// Simplified version of your leeo.js, keeping only needed functionality
class DOMQuery {
    constructor(selector) {
      if (selector instanceof HTMLElement) {
        this.elements = [selector];
      } else {
        this.elements = Array.from(document.querySelectorAll(selector));
      }
    }
  
    text(value) {
      if (value === undefined) {
        return this.elements.length > 0 ? this.elements[0].textContent : '';
      }
      
      this.elements.forEach(el => {
        el.textContent = value;
      });
      
      return this;
    }
  
    empty() {
      this.elements.forEach(el => {
        el.innerHTML = '';
      });
      return this;
    }
  
    addClass(...classes) {
      this.elements.forEach(el => {
        el.classList.add(...classes);
      });
      return this;
    }
  
    removeClass(...classes) {
      this.elements.forEach(el => {
        el.classList.remove(...classes);
      });
      return this;
    }
  
    on(event, handler) {
      this.elements.forEach(el => {
        el.addEventListener(event, handler);
      });
      return this;
    }
  
    get(index) {
      return this.elements[index];
    }
  
    attr(name, value) {
      if (value === undefined) {
        return this.elements[0] ? this.elements[0].getAttribute(name) : null;
      }
      
      this.elements.forEach(el => {
        el.setAttribute(name, value);
      });
      
      return this;
    }
  
    find(selector) {
      const found = new DOMQuery();
      found.elements = [];
      
      this.elements.forEach(parent => {
        const matches = Array.from(parent.querySelectorAll(selector));
        found.elements.push(...matches);
      });
      
      return found;
    }
  
    appendChild(child) {
      if (child instanceof DOMQuery) {
        child = child.elements[0];
      }
      
      this.elements.forEach(parent => {
        parent.appendChild(child.cloneNode(true));
      });
      
      return this;
    }
  }
  
  // Factory function
  function $(selector) {
    return new DOMQuery(selector);
  }
  
  // Static create method
  $.create = function(tagName, options = {}) {
    const element = document.createElement(tagName);
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([name, value]) => {
        element.setAttribute(name, value);
      });
    }
    
    return new DOMQuery(element);
  };
  
  export default $;