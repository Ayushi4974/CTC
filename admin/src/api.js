import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const admin = JSON.parse(localStorage.getItem('adminUser'));
  if (admin && admin.token) {
    config.headers.Authorization = `Bearer ${admin.token}`;
  }
  return config;
});

export default api;
