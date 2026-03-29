import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add session ID for cart
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  
  // Addresses
  getAddresses: () => api.get('/auth/addresses'),
  addAddress: (data) => api.post('/auth/addresses', data),
  updateAddress: (id, data) => api.put(`/auth/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}`),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  getCategories: () => api.get('/products/categories/all'),
};

// Cart API
export const cartAPI = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart', data),
  update: (id, quantity) => api.put(`/cart/${id}`, { quantity }),
  remove: (id) => api.delete(`/cart/${id}`),
  clear: () => api.delete('/cart'),
  merge: (sessionId) => api.post('/cart/merge', { sessionId }),
};

// Orders API
export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  checkout: (data) => api.post('/orders/checkout', data),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
};

// Payments API
export const paymentsAPI = {
  createPaymentIntent: (orderId) => api.post('/payments/create-payment-intent', { order_id: orderId }),
  confirmPayment: (paymentIntentId) => api.post('/payments/confirm-payment', { payment_intent_id: paymentIntentId }),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getProducts: () => api.get('/admin/products'),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrder: (id, data) => api.put(`/admin/orders/${id}`, data),
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  getUsers: () => api.get('/admin/users'),
};

export default api;
