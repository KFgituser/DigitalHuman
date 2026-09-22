import axios, { type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  // Nginx forwards this same-origin path to the backend container.
  baseURL: '/api/'
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
