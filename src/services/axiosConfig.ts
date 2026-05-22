import axios from 'axios';

const api = axios.create({
  baseURL: '',
});

api.interceptors.request.use(
  (config) => {
    try {
      const saved = localStorage.getItem('iker_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      }
    } catch (e) {
      console.error('Error retrieving token from local session state:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
