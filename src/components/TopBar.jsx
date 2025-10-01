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
import ConfirmModal from './ConfirmModal';

export default function Topbar({ userName, userRole, pageTitle, onBellClick, onProfileClick }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Показываем уведомления только для студентов
  const showNotificationBell = userRole === 'student';

  const loadUserProfile = useCallback(async () => {
    try {
      setProfileError(null);
      
      if (user?.id) {
        console.log('[TopBar] Loading user profile for user:', user.id, 'role:', userRole);
        
        // Для студентов загружаем полный профиль студента
        if (userRole === 'student') {
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
        
        // Информация о фото уже есть в user объекте из AuthContext
        console.log('[TopBar] User photo info:', user.photo);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
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
    if (user?.id) {
      loadUserProfile();
    }
  }, [user?.id, loadUserProfile]);

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

  const handleClearAllNotifications = async () => {
    setShowConfirmModal(true);
  };

  const confirmClearAllNotifications = async () => {
    setShowConfirmModal(false);
    
    try {
      // Показываем индикатор загрузки (можно добавить спиннер)
      console.log(`[TopBar] Clearing ${notifications.length} notifications...`);
      
      // Удаляем все уведомления
      const deletePromises = notifications.map(notification => 
        deleteNotification(notification.id)
      );
      
      await Promise.all(deletePromises);
      
      // Очищаем локальное состояние с небольшой задержкой для плавности
      setTimeout(() => {
        setNotifications([]);
        setUnreadCount(0);
        setShowNotifications(false);
        console.log('[TopBar] All notifications cleared successfully!');
      }, 300);
      
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      // Более красивое уведомление об ошибке
      alert('❌ Произошла ошибка при удалении уведомлений. Пожалуйста, попробуйте ещё раз.');
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

  const getUserAvatar = () => {
    // Проверяем есть ли фото у пользователя
    if (user?.photo?.url) {
      console.log('[TopBar] Using user photo:', user.photo.url);
      return user.photo.url;
    }
    
    // Для студентов также проверяем userProfile (если есть полная информация о студенте)
    if (userRole === 'student' && userProfile?.user?.photo?.url) {
      console.log('[TopBar] Using student profile photo:', userProfile.user.photo.url);
      return userProfile.user.photo.url;
    }
    
    console.log('[TopBar] Using default avatar for user:', user?.username);
    return avatarImg;
  };

  return (
    <div className="topbar">
      <div className="topbar-content">
        {/* Левая часть - название страницы */}
        <div className="topbar-left">
          {pageTitle && (
            <h1 className="page-title">{pageTitle}</h1>
          )}
        </div>
        
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
                    <div className="notification-header-left">
                      {notifications.length > 0 && (
                        <button 
                          className="clear-all-btn"
                          onClick={handleClearAllNotifications}
                          type="button"
                          title={`Очистить все уведомления (${notifications.length})`}
                        >
                          Очистить все
                        </button>
                      )}
                    </div>
                    <div className="notification-header-right">
                      <button 
                        className="notification-close-btn"
                        onClick={() => setShowNotifications(false)}
                        type="button"
                        aria-label="Закрыть уведомления"
                      >
                        ×
                      </button>
                    </div>
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
                        📭 Нет уведомлений
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
                            className="notification-delete-btn"
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            type="button"
                            aria-label="Удалить уведомление"
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
              src={getUserAvatar()} 
              alt="Профиль" 
              className="profile-avatar"
            />
            <div className="profile-text">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">#{user?.username || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Модальное окно подтверждения */}
      <ConfirmModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmClearAllNotifications}
        title="🗑️ Очистить уведомления"
        message={
          notifications.length === 1 
            ? "Вы действительно хотите удалить это уведомление? Это действие нельзя отменить." 
            : `Вы действительно хотите удалить все уведомления (${notifications.length} шт.)? Это действие нельзя отменить.`
        }
        confirmText="✅ Да, удалить все"
        cancelText="❌ Отмена"
        type="warning"
      />
    </div>
  );
}

Topbar.propTypes = {
  userName: PropTypes.string.isRequired,
  userRole: PropTypes.string.isRequired,
  pageTitle: PropTypes.string,
  onBellClick: PropTypes.func,
  onProfileClick: PropTypes.func
};

Topbar.defaultProps = {
  pageTitle: null,
  onBellClick: () => {},
  onProfileClick: () => {}
};
