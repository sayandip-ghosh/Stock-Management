import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL
const API_BASE_URL = 'http://localhost:8000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    if (error.response?.status === 401) {
      // Token is invalid, redirect to login
      localStorage.removeItem('token');
      window.location.reload();
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Stock Management API endpoints
export const stockManagementAPI = {
  
  performStockOperation: (data) => 
    api.post('/stock-management/operation', data),
  
  getPartStockHistory: (partId, params = {}) => 
    api.get(`/stock-management/history/${partId}`, { params }),
   
  getCurrentStockLevels: (params = {}) => 
    api.get('/stock-management/current-levels', { params })
};

// Suppliers API
export const suppliersAPI = {
  getAll: () => api.get('/suppliers'),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  getActive: () => api.get('/suppliers/dropdown/active')
};

// Parts API
export const partsAPI = {
  getAll: (params = {}) => {
    // For getting all parts without pagination (used in dropdowns and counts)
    const searchParams = new URLSearchParams({
      limit: '1000', // Set a high limit to get all parts
      page: '1',
      ...params
    });
    return api.get(`/parts?${searchParams}`);
  },
  getById: (id) => api.get(`/parts/${id}`),
  create: (data) => {
    console.log('Creating part with data:', data);
    // Ensure type defaults to one of valid categories if not provided
    const createData = {
      ...data,
      type: data.type || 'Copper',
      category: data.category || data.type || 'Copper'
    };
    return api.post('/parts', createData);
  },
  update: (id, data) => {
    console.log('Updating part with data:', data);
    // Ensure type is one of valid categories
    const updateData = {
      ...data,
      type: data.type || 'Copper',
      category: data.category || data.type || 'Copper'
    };
    return api.put(`/parts/${id}`, updateData);
  },
  delete: (id) => api.delete(`/parts/${id}`),
  getLowStock: () => api.get('/parts/alerts/low-stock'),
  updateStock: (id, data) => api.post(`/parts/${id}/stock`, data),
  getStats: () => api.get('/parts/stats/summary'),
  // Add a paginated version for when we actually need pagination
  getPaginated: (params = {}) => api.get('/parts', { params })
};

// Assemblies API
export const assembliesAPI = {
  getAll: (params = {}) => {
    // For getting all assemblies without pagination (used in assembly management)
    const searchParams = new URLSearchParams({
      limit: '1000', // Set a high limit to get all assemblies
      page: '1',
      ...params
    });
    return api.get(`/assemblies?${searchParams}`);
  },
  getById: (id) => api.get(`/assemblies/${id}`),
  create: (data) => api.post('/assemblies', data),
  update: (id, data) => api.put(`/assemblies/${id}`, data),
  delete: (id) => api.delete(`/assemblies/${id}`),
  addPart: (id, data) => api.post(`/assemblies/${id}/bom`, data),
  removePart: (id, itemId) => api.delete(`/assemblies/${id}/bom/${itemId}`),
  build: (id, data) => api.post(`/assemblies/${id}/build`, data),
  ship: (id, data) => api.post(`/assemblies/${id}/ship`, data),
  dismantle: (id, data) => api.post(`/assemblies/${id}/dismantle`, data),
  getStats: () => api.get('/assemblies/stats/summary'),
  // Add a paginated version for when we actually need pagination
  getPaginated: (params = {}) => api.get('/assemblies', { params })
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getAssemblable: () => api.get('/products/assemblable'),
  getWithBOM: (id) => api.get(`/products/${id}/bom`),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
};

// BOM API
export const bomAPI = {
  getAll: () => api.get('/bom'),
  getById: (id) => api.get(`/bom/${id}`),
  create: (data) => api.post('/bom', data),
  update: (id, data) => api.put(`/bom/${id}`, data),
  delete: (id) => api.delete(`/bom/${id}`),
  getProductBOM: (productId) => api.get(`/bom/product/${productId}`),
  getProductsUsingPart: (partId) => api.get(`/bom/part/${partId}/products`),
  checkProductBOM: (productId) => api.get(`/bom/product/${productId}/check`),
};

// Transactions API
export const transactionsAPI = {
  getAll: () => api.get('/transactions'),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  getSummary: () => api.get('/transactions/summary/overview'),
  getRecent: () => api.get('/transactions/recent/list'),
  getByPart: (partId) => api.get(`/transactions/part/${partId}`),
  getStatistics: () => api.get('/transactions/stats/overview')
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  getAll: (params = {}) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  
  // Receive parts for a purchase order
  receiveItems: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
  
  // Get pending/partial orders
  getPending: () => api.get('/purchase-orders/status/pending'),
  getPartial: () => api.get('/purchase-orders/status/partial'),
  
  // Get purchase order items with receipt status
  getItems: (id) => api.get(`/purchase-orders/${id}/items`),
  
  // Update individual item receipt
  receiveItem: (orderId, itemId, data) => 
    api.post(`/purchase-orders/${orderId}/items/${itemId}/receive`, data)
};

// Auth API
export const authAPI = {
  checkUserExists: () => api.get('/auth/check'),
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verifyToken: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout')
};

export default api;
