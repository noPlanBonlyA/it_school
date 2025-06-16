// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined — ещё не загрузили, null — не аутентифицирован
  // создаём инстанс axios, который автоматически шлёт куки и базовый URL
  const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
  });

  // 1) При монтировании — пробуем подгрузить /users/me
  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  // 2) Если залогинены, каждые 4 минуты обновляем сессию
  useEffect(() => {
    if (user) {
      const id = setInterval(() => {
        api.post('/users/refresh')
          .then(({ data }) => setUser(data))
          .catch(() => setUser(null));
      }, 4 * 60 * 1000);
      return () => clearInterval(id);
    }
  }, [user]);

  // 3) Функция логина
  const login = async (username, password) => {
    const { data } = await api.post('/users/auth', { username, password });
    // бэкенд в ответ кидает HttpOnly-куку, и возвращает user
    setUser(data);
    return data;
  };

  // 4) Функция логаута
  const logout = async () => {
    await api.post('/users/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
