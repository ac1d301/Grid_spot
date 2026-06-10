// API base URL. Vite replaces import.meta.env.PROD at build time (process.env.NODE_ENV
// is NOT defined in the browser bundle, which is why the old check always fell to dev).
const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || 'https://grid-spot-web.onrender.com/api')
  : (import.meta.env.VITE_API_URL || 'http://localhost:5001/api');

const WS_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_WS_URL || 'wss://grid-spot-web.onrender.com')
  : 'ws://localhost:5001';

// API health check
export const checkAPIHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
};

export { API_BASE_URL, WS_BASE_URL };
