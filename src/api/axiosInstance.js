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
    // Устанавливаем Content-Type только для JSON данных
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    console.log('[API] Request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data
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
    // автоматический редирект только для всех 401, кроме /users/me
    if (err.response?.status === 401 && !url.endsWith('/users/me')) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
