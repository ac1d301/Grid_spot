const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || import.meta.env.VITE_API_URL || 'https://grid-spot-web.onrender.com/api'
  : 'http://localhost:5001/api';

const WS_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_WS_URL || import.meta.env.VITE_WS_URL || 'wss://grid-spot-web.onrender.com'
  : 'ws://localhost:5001';

// Add API health check
export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    return response.ok;
  } catch {
    return false;
  }
};

export { API_BASE_URL, WS_BASE_URL };
