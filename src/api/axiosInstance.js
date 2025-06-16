// src/api/axiosInstance.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true,   // чтобы браузер слал HttpOnly-cookie
});

// (не редиректим на логин при /users/me)
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || '';
    // автоматический редирект только для всех 401, кроме /users/me
    if (err.response?.status === 401 && !url.endsWith('/users/me')) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
