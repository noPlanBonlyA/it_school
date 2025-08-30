// src/components/SmartTopBar.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TopBar from './TopBar';
import MobileNotifications from './MobileNotifications';
import { getPageTitle } from '../utils/pageUtils';

/**
 * Умный TopBar который автоматически определяет название страницы
 */
export default function SmartTopBar({ pageTitle: manualPageTitle, ...props }) {
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Автоматически определяем название страницы если не задано вручную
  const autoPageTitle = getPageTitle(location.pathname, user?.role);
  const finalPageTitle = manualPageTitle || autoPageTitle;

  // Формируем полное имя пользователя
  const fullName = user ? [user.first_name, user.surname, user.patronymic]
    .filter(Boolean)
    .join(' ') : 'Пользователь';

  return (
    <>
      <TopBar
        userName={fullName}
        userRole={user?.role || 'guest'}
        pageTitle={finalPageTitle}
        onBellClick={() => {}}
        onProfileClick={() => navigate('/profile')}
        {...props}
      />
      {/* Мобильные уведомления отображаются независимо от TopBar */}
      <MobileNotifications />
    </>
  );
}
