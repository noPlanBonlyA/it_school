// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }      from 'react-router-dom';
import '../styles/SideBar.css';

import clockIcon      from '../images/sidebar_icon1.png';
import calendarIcon   from '../images/sidebar_icon2.png';
import coursesIcon    from '../images/sidebar_icon3.png';
import chartIcon      from '../images/sidebar_icon4.png';
import homeIcon       from '../images/sidebar_icon1.png'; // Используем как иконку главной
import usersIcon      from '../images/sidebar_icon1.png';
import homeworkIcon   from '../images/sidebar_icon1.png';
import cogIcon        from '../images/sidebar_icon7.png';
import powerOffIcon   from '../images/sidebar_icon8.png';
import broadcastIcon  from '../images/sidebar_icon4.png';
import shopIcon       from '../images/sidebar_icon5.png';
import moderationIcon from '../images/sidebar_icon3.png';
import adminIcon      from '../images/sidebar_icon1.png';

import { useAuth }    from '../contexts/AuthContext';

export default function Sidebar({ activeItem, userRole }) {
  const navigate     = useNavigate();
  const { logout }   = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Проверяем размер экрана
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false); // Закрываем мобильное меню на больших экранах
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Закрываем меню при клике на элемент (только на мобильных)
  const handleItemClick = (route) => {
    navigate(route);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const routes = {
    dashboard:        '/home',
    schedule:         '/schedule',
    studentCourses:   '/courses',
    rating:           '/rating',
    teacherCourses:   '/teacher-courses',
    homework:         '/homework',
    manageStudents:   '/manage-users',
    'manage-students': '/manage-users',
    notifications:    '/broadcast',
    broadcast:        '/broadcast',
    groups:           '/groups',
    'manage-groups':  '/groups',
    manageTeachers:   '/manage-teachers',
    'manage-teachers': '/manage-teachers',
    news:             '/news',
    manageAdmins:     '/manage-admins',
    'manage-admins':  '/manage-admins',
    moderateCourses:  '/manage-courses',
    'manage-courses': '/manage-courses',
    manageProducts:   '/manage-products',
    'manage-products': '/manage-products',
    shop:             '/shop',
    settings:         '/profile',
    logout:           '/login'
  };

  let main = [];
  switch (userRole) {
    case 'student':
      main = [
        { key: 'dashboard',      label: 'Главная',    icon: homeIcon },
        { key: 'schedule',       label: 'Расписание', icon: calendarIcon },
        { key: 'studentCourses', label: 'Мои курсы',  icon: coursesIcon },
        { key: 'rating',         label: 'Рейтинг',    icon: chartIcon },
        { key: 'shop',           label: 'Магазин',    icon: shopIcon },
        { key: 'settings',       label: 'Профиль',    icon: cogIcon }
      ];
      break;
    case 'teacher':
      main = [
        { key: 'dashboard',      label: 'Главная',     icon: homeIcon },
        { key: 'settings',       label: 'Мой профиль', icon: cogIcon },
        { key: 'schedule',       label: 'Расписание',  icon: calendarIcon },
        { key: 'teacherCourses', label: 'Курсы',       icon: coursesIcon },
        { key: 'homework',       label: 'Дом. задания',icon: homeworkIcon }
      ];
      break;
    case 'admin':
      main = [
        { key: 'dashboard',      label: 'Главная',      icon: homeIcon },
        { key: 'settings',       label: 'Профиль',      icon: cogIcon },
        { key: 'schedule',       label: 'Расписание',   icon: calendarIcon },
        { key: 'manageStudents', label: 'Студенты',     icon: usersIcon },
        { key: 'notifications',  label: 'Рассылка',     icon: broadcastIcon },
        { key: 'groups',         label: 'Группы',       icon: usersIcon },
        { key: 'manageTeachers', label: 'Преподаватели',icon: usersIcon },
        { key: 'news',           label: 'Новости',      icon: coursesIcon }
      ];
      break;
    case 'superadmin':
      main = [
        { key: 'dashboard',       label: 'Главная',          icon: homeIcon },
        { key: 'settings',        label: 'Профиль',          icon: cogIcon },
        { key: 'schedule',        label: 'Расписание',       icon: calendarIcon },
        { key: 'manageStudents',  label: 'Студенты',         icon: usersIcon },
        { key: 'notifications',   label: 'Рассылка',         icon: broadcastIcon },
        { key: 'manageTeachers',  label: 'Преподаватели',    icon: usersIcon },
        { key: 'manageAdmins',    label: 'Администраторы',   icon: adminIcon },
        { key: 'moderateCourses', label: 'Модерация курсов', icon: moderationIcon },
        { key: 'groups',          label: 'Группы',           icon: usersIcon },
        { key: 'manageProducts',  label: 'Товары',           icon: shopIcon },
        { key: 'news',            label: 'Новости',          icon: coursesIcon }
      ];
      break;
    default:
      main = [];
  }

  // Функция для проверки активного элемента (поддерживает camelCase и kebab-case)
  const isActiveItem = (itemKey, activeItem) => {
    if (itemKey === activeItem) return true;
    
    // Создаем kebab-case версию itemKey для сравнения
    const kebabItemKey = itemKey.replace(/([A-Z])/g, '-$1').toLowerCase();
    return kebabItemKey === activeItem;
  };

  const renderItem = i => (
    <li
      key={i.key}
      className={`sidebar-item${isActiveItem(i.key, activeItem) ? ' active' : ''}`}
      onClick={() => handleItemClick(routes[i.key])}
    >
      <img src={i.icon} alt="" className="icon" />
      <span className="label">{i.label}</span>
    </li>
  );

  return (
    <>
      {/* Бургер-кнопка для мобильных */}
      {isMobile && (
        <button 
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      {/* Overlay для закрытия меню при клике вне его */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <nav className={`sidebar ${isMobile ? 'mobile' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo" onClick={() => handleItemClick('/home')}>Bright&nbsp;Web</div>
        <ul className="sidebar-list">{main.map(renderItem)}</ul>

        <hr className="divider" />

        <ul className="sidebar-list bottom">
          <li className="sidebar-item" onClick={() => setShowLogout(true)}>
            <img src={powerOffIcon} alt="" className="icon" />
            <span className="label">Выйти</span>
          </li>
        </ul>
      </nav>

      {showLogout && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p className="modal-text">Уверены, что хотите выйти?</p>
            <div className="modal-buttons">
              <button
                className="btn-primary"
                onClick={async () => {
                  await logout();
                  navigate(routes.logout, { replace: true });
                  if (isMobile) {
                    setIsMobileMenuOpen(false);
                  }
                }}
              >
                Да
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowLogout(false)}
              >
                Нет
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
