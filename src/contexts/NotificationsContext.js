// src/contexts/NotificationsContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  dropdownOpen: false,
  setDropdownOpen: () => {},
  markAsRead: () => Promise.resolve()
});

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [dropdownOpen, setDropdownOpen]   = useState(false);

  // Загрузка уведомлений при смене user
  useEffect(() => {
    if (!user) return;
    const studentId = user.id;
    api.get(`/notifications/student/${studentId}`, {
      params: {
        limit: 100,
        offset: 0,
        get_notifications_use_case: 'getNotificationsUseCase'
      }
    })
    .then(res => {
      const objs = res.data.objects || [];
      setNotifications(objs);
      setUnreadCount(objs.filter(n => !n.is_read).length);
    })
    .catch(err => {
      console.error('Не удалось получить уведомления:', err);
    });
  }, [user]);

  // Пометить одно уведомление прочитанным
  const markAsRead = async notifId => {
    if (!user) return;
    await api.put(`/notifications/${notifId}/read`, null, {
      params: {
        student_id: user.id,
        is_read: true,
        update_status_use_case: 'updateNotificationStatusUseCase'
      }
    });
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(c => c - 1);
  };

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      dropdownOpen,
      setDropdownOpen,
      markAsRead
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
