const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://grid-spot-web.onrender.com/api'
  : 'http://localhost:5001/api';

export { API_BASE_URL };
