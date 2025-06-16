// src/components/TopBar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';
import bellIcon from '../images/bell.png';
import avatarImg from '../images/avatar.png';
import '../styles/TopBar.css';
import { 
  getStudentNotifications, 
  markNotificationAsRead,
  deleteNotification 
} from '../services/notificationService';
import { findStudentByUser, getCurrentStudent } from '../services/studentService';

export default function Topbar({ userName, userRole, onBellClick, onProfileClick }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Показываем уведомления только для студентов
  const showNotificationBell = userRole === 'student';

  const loadUserProfile = useCallback(async () => {
    try {
      setProfileError(null);
      
      if (user?.id && userRole === 'student') {
        console.log('[TopBar] Loading student profile for user:', user.id);
        
        let profile = null;
        
        // Пробуем разные способы получения профиля студента
        try {
          // Способ 1: через user_id
          profile = await findStudentByUser(user.id);
        } catch (error) {
          console.log('[TopBar] findStudentByUser failed, trying getCurrentStudent...');
          try {
            // Способ 2: через me endpoint
            profile = await getCurrentStudent();
          } catch (meError) {
            console.error('[TopBar] Both methods failed:', { findError: error, meError });
            setProfileError('Не удалось загрузить профиль студента');
            return;
          }
        }
        
        console.log('[TopBar] Student profile loaded:', profile);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to load student profile:', error);
      setProfileError(error.message);
    }
  }, [user?.id, userRole]);

  const loadNotifications = useCallback(async () => {
    try {
      if (userProfile?.id) {
        console.log('[TopBar] Loading notifications for student ID:', userProfile.id);
        const data = await getStudentNotifications(userProfile.id, 20, 0);
        console.log('[TopBar] Notifications response:', data);
        
        const notificationsList = data.objects || data.results || data || [];
        console.log('[TopBar] Processed notifications:', notificationsList);
        
        setNotifications(notificationsList);
        setUnreadCount(notificationsList.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userProfile?.id]);

  // Загружаем профиль пользователя при монтировании
  useEffect(() => {
    if (showNotificationBell && user?.id) {
      loadUserProfile();
    }
  }, [showNotificationBell, user?.id, loadUserProfile]);

  // Загружаем уведомления
  useEffect(() => {
    if (userProfile?.id) {
      loadNotifications();
      // Обновляем уведомления каждые 10 секунд для тестирования
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [userProfile?.id, loadNotifications]);

  const handleBellClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[TopBar] Bell clicked!', { 
      userRole, 
      userProfile, 
      notificationsCount: notifications.length,
      unreadCount,
      profileError
    });
    setShowNotifications(!showNotifications);
    if (onBellClick) onBellClick();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read && userProfile?.id) {
      try {
        await markNotificationAsRead(notification.id, userProfile.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="topbar">
      <div className="topbar-content">
        {/* Левая часть - пустая */}
        <div className="topbar-left"></div>
        
        {/* Правая часть - уведомления и профиль */}
        <div className="topbar-right">
          {/* Уведомления только для студентов */}
          {showNotificationBell && (
            <div className="notification-wrapper">
              <button 
                className="notification-btn"
                onClick={handleBellClick}
                type="button"
              >
                <img src={bellIcon} alt="Уведомления" className="bell-icon" />
                {unreadCount > 0 && (
                  <span className="notification-count">{unreadCount}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Уведомления</h3>
                    <button 
                      className="close-btn"
                      onClick={() => setShowNotifications(false)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="notification-list">
                    {profileError ? (
                      <div className="no-notifications">
                        <strong>Ошибка:</strong> {profileError}
                        <br />
                        <small>User ID: {user?.id}</small>
                      </div>
                    ) : !userProfile ? (
                      <div className="no-notifications">
                        Загрузка профиля...
                        <br />
                        <small>User ID: {user?.id}</small>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="no-notifications">
                        Нет уведомлений
                        <br />
                        <small>Профиль ID: {userProfile?.id}</small>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notification-content">
                            <p>{notification.content}</p>
                            <small className="notification-time">
                              {formatDate(notification.created_at)}
                            </small>
                          </div>
                          <button 
                            className="delete-btn"
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            type="button"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Профиль пользователя */}
          <div className="profile-wrapper" onClick={onProfileClick}>
            <img 
              src={avatarImg} 
              alt="Профиль" 
              className="profile-avatar"
            />
            <div className="profile-text">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">{userRole}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Topbar.propTypes = {
  userName: PropTypes.string.isRequired,
  userRole: PropTypes.string.isRequired,
  onBellClick: PropTypes.func,
  onProfileClick: PropTypes.func
};

Topbar.defaultProps = {
  onBellClick: () => {},
  onProfileClick: () => {}
};
