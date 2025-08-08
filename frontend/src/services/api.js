import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Parts API
export const partsAPI = {
  getAll: () => api.get('/parts'),
  getById: (id) => api.get(`/parts/${id}`),
  create: (data) => api.post('/parts', data),
  update: (id, data) => api.put(`/parts/${id}`, data),
  delete: (id) => api.delete(`/parts/${id}`),
  getLowStock: () => api.get('/parts/alerts/low-stock'),
  updateStock: (id, data) => api.post(`/parts/${id}/stock`, data),
  getStats: () => api.get('/parts/stats/summary'),
};

// Assemblies API
export const assembliesAPI = {
  getAll: () => api.get('/assemblies'),
  getById: (id) => api.get(`/assemblies/${id}`),
  create: (data) => api.post('/assemblies', data),
  update: (id, data) => api.put(`/assemblies/${id}`, data),
  delete: (id) => api.delete(`/assemblies/${id}`),
  addPart: (id, data) => api.post(`/assemblies/${id}/parts`, data),
  removePart: (id, partId) => api.delete(`/assemblies/${id}/parts/${partId}`),
  build: (id, data) => api.post(`/assemblies/${id}/build`, data),
  getStats: () => api.get('/assemblies/stats/summary'),
};

export default api;
