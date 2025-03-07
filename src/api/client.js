// Base client for API requests
export async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`/api/${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response;
  }