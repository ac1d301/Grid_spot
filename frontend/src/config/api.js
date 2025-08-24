const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://grid-spot-web.onrender.com/api'
  : 'http://localhost:5001/api';

const WS_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_WS_URL || 'wss://grid-spot-web.onrender.com'
  : 'ws://localhost:5001';

export { API_BASE_URL, WS_BASE_URL };
