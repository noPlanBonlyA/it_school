// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined — ещё не загрузили, null — не аутентифицирован
  const [refreshing, setRefreshing] = useState(false); // флаг для предотвращения множественных запросов

  // 1) При монтировании — пробуем подгрузить профиль пользователя
  useEffect(() => {
    api.get('/users/me')  
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  // 2) Если залогинены, каждые 4 минуты обновляем сессию
  useEffect(() => {
    if (user && !refreshing) {
      const id = setInterval(async () => {
        if (!refreshing) {
          setRefreshing(true);
          try {
            const { data } = await api.post('/users/refresh');
            setUser(data);
          } catch (err) {
            console.error('Token refresh failed:', err);
            // Не сбрасываем пользователя при ошибке refresh, если это не 401
            if (err.response?.status === 401) {
              setUser(null);
            }
          } finally {
            setRefreshing(false);
          }
        }
      }, 4 * 60 * 1000);
      return () => clearInterval(id);
    }
  }, [user, refreshing]);

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

  // 5) updateUser - обновление данных пользователя без перезагрузки страницы
  const updateUser = async () => {
    try {
      const { data } = await api.get('/users/me');
      setUser(data);
      return data;
    } catch (err) {
      console.error('Update user error:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
