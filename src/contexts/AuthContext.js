// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined — ещё не загрузили, null — не аутентифицирован

  // 1) При монтировании — пробуем подгрузить профиль пользователя
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

  // 3) login - ИСПРАВЛЕНО: отправляем обычный JSON объект
  const login = async (username, password) => {
    const { data } = await api.post('/users/auth', {
      username,
      password
    });
    setUser(data);
    return data;
  };

  // 4) logout
  const logout = async () => {
    try {
      await api.post('/users/logout');  
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
