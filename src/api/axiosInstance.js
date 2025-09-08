// src/api/axiosInstance.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
  withCredentials: true,   // чтобы браузер слал HttpOnly-cookie
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 секунд таймаут
});

// Добавляем интерцептор для запросов
api.interceptors.request.use(
  config => {
    // Для FormData не устанавливаем Content-Type, позволяем браузеру сделать это
    if (config.data instanceof FormData) {
      // Удаляем Content-Type для multipart/form-data
      delete config.headers['Content-Type'];
    } else if (config.data && typeof config.data === 'object') {
      config.headers['Content-Type'] = 'application/json';
    }
    
    console.log('[API] Request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData' : config.data
    });
    return config;
  },
  error => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// (не редиректим на логин при /users/me)
api.interceptors.response.use(
  res => {
    console.log('[API] Response:', {
      status: res.status,
      url: res.config.url,
      data: res.data
    });
    return res;
  },
  err => {
    console.error('[API] Response error:', {
      status: err.response?.status,
      url: err.config?.url,
      data: err.response?.data,
      message: err.message
    });
    
    // Специальная обработка CORS ошибок
    if (err.message && err.message.includes('Network Error')) {
      console.error('[API] Возможная CORS ошибка или сервер недоступен');
    }
    
    const url = err.config?.url || '';
    // автоматический редирект только для критических 401, кроме /users/me и /users/refresh
    if (err.response?.status === 401 && 
        !url.endsWith('/users/me') && 
        !url.endsWith('/users/refresh') &&
        !url.includes('/users/')) { // избегаем редиректов при обновлении профиля
      console.log('[API] 401 error, redirecting to login');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
