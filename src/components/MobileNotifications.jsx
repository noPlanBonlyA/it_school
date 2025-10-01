// src/components/MobileNotifications.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import bellIcon from '../images/bell.png';
import '../styles/TopBar.css';
import { 
  getStudentNotifications, 
  markNotificationAsRead,
  deleteNotification 
} from '../services/notificationService';
import { findStudentByUser, getCurrentStudent } from '../services/studentService';
import ConfirmModal from './ConfirmModal';

export default function MobileNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Показываем уведомления только для студентов
  const showNotificationBell = user?.role === 'student';

  const loadUserProfile = useCallback(async () => {
    try {
      setProfileError(null);
      
      if (user?.id && user?.role === 'student') {
        console.log('[MobileNotifications] Loading user profile for user:', user.id);
        
        let profile = null;
        try {
          profile = await findStudentByUser(user.id);
        } catch (error) {
          console.log('[MobileNotifications] findStudentByUser failed, trying getCurrentStudent...');
          try {
            profile = await getCurrentStudent();
          } catch (meError) {
            console.error('[MobileNotifications] Both methods failed:', { findError: error, meError });
            setProfileError('Не удалось загрузить профиль студента');
            return;
          }
        }
        
        console.log('[MobileNotifications] Student profile loaded:', profile);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setProfileError(error.message);
    }
  }, [user?.id, user?.role]);

  const loadNotifications = useCallback(async () => {
    try {
      if (userProfile?.id) {
        console.log('[MobileNotifications] Loading notifications for student ID:', userProfile.id);
        const data = await getStudentNotifications(userProfile.id, 20, 0);
        console.log('[MobileNotifications] Notifications response:', data);
        
        const notificationsList = data.objects || data.results || data || [];
        console.log('[MobileNotifications] Processed notifications:', notificationsList);
        
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
    if (user?.id && user?.role === 'student') {
      loadUserProfile();
    }
  }, [user?.id, user?.role, loadUserProfile]);

  // Загружаем уведомления
  useEffect(() => {
    if (userProfile?.id) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [userProfile?.id, loadNotifications]);

  const handleBellClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[MobileNotifications] Bell clicked!', { 
      userRole: user?.role, 
      userProfile, 
      notificationsCount: notifications.length,
      unreadCount,
      profileError
    });
    setShowNotifications(!showNotifications);
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
      console.log(`[MobileNotifications] Clearing ${notifications.length} notifications...`);
      
      const deletePromises = notifications.map(notification => 
        deleteNotification(notification.id)
      );
      
      await Promise.all(deletePromises);
      
      setTimeout(() => {
        setNotifications([]);
        setUnreadCount(0);
        setShowNotifications(false);
        console.log('[MobileNotifications] All notifications cleared successfully!');
      }, 300);
      
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
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

  // Не показываем ничего, если не студент
  if (!showNotificationBell) {
    return null;
  }

  return (
    <>
      <div className="mobile-notifications-wrapper">
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
                <button 
                  className="notification-close-btn"
                  onClick={() => setShowNotifications(false)}
                  type="button"
                  aria-label="Закрыть уведомления"
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
    </>
  );
}
