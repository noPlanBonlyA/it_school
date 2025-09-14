// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }      from 'react-router-dom';
import '../styles/SideBar.css';
import ConfirmModal from './ConfirmModal';
import { useConfirm } from '../hooks/useConfirm';

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
import coinsIcon      from '../images/sidebar_icon5.png'; // Иконка для монет (такая же как магазин)
import moderationIcon from '../images/sidebar_icon3.png';
import adminIcon      from '../images/sidebar_icon1.png';
import magicIcon      from '../images/sidebar_icon7.png'; // Иконка для магии
import logoImage      from '../images/logo.png';

import { useAuth }    from '../contexts/AuthContext';

export default function Sidebar({ activeItem, userRole }) {
  const navigate     = useNavigate();
  const { logout }   = useAuth();
  const { confirmState, showConfirm } = useConfirm();
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

  // Закрытие меню при клике вне его области
  useEffect(() => {
    if (!isMobile || !isMobileMenuOpen) return;

    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('.sidebar');
      const toggle = document.querySelector('.mobile-menu-toggle');
      
      // Если клик не по сайдбару и не по кнопке, закрываем меню
      if (sidebar && !sidebar.contains(event.target) && 
          toggle && !toggle.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isMobileMenuOpen]);

  // Закрываем меню при клике на элемент (только на мобильных)
  const handleItemClick = (route) => {
    navigate(route);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  // Функция для обработки выхода
  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: "🚪 Выход",
      message: "Уверены, что хотите выйти?",
      confirmText: "Да, выйти",
      cancelText: "Отмена",
      type: "warning"
    });

    if (confirmed) {
      await logout();
      navigate(routes.logout, { replace: true });
      if (isMobile) {
        setIsMobileMenuOpen(false);
      }
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
    'manage-events':  '/manage-events',
    news:             '/news',
    manageAdmins:     '/manage-admins',
    'manage-admins':  '/manage-admins',
    moderateCourses:  '/manage-courses',
    'manage-courses': '/manage-courses',
    manageProducts:   '/manage-products',
    'manage-products': '/manage-products',
    shop:             '/shop',
    coinHistory:      '/coin-history',
    'coin-history':   '/coin-history',
    managePoints:     '/manage-points',
    'manage-points':  '/manage-points',
    impersonate:      '/impersonate',
    settings:         '/profile',
    logout:           '/login'
  };

  let main = [];
  switch (userRole) {
    case 'student':
      main = [
        { key: 'dashboard',      label: 'Главная',      icon: homeIcon },
        { key: 'schedule',       label: 'Расписание',   icon: calendarIcon },
        { key: 'studentCourses', label: 'Мои курсы',    icon: coursesIcon },
        { key: 'rating',         label: 'Рейтинг',      icon: chartIcon },
        { key: 'coinHistory',    label: 'История монет', icon: coinsIcon },
        { key: 'shop',           label: 'Магазин',      icon: shopIcon },
        { key: 'settings',       label: 'Профиль',      icon: cogIcon }
      ];
      break;
    case 'teacher':
      main = [
        { key: 'dashboard',      label: 'Главная',      icon: homeIcon },
        { key: 'settings',       label: 'Мой профиль',  icon: cogIcon },
        { key: 'schedule',       label: 'Расписание',   icon: calendarIcon },
        { key: 'teacherCourses', label: 'Курсы',        icon: coursesIcon },
        { key: 'homework',       label: 'Дом. задания', icon: homeworkIcon },
        { key: 'managePoints',   label: 'Управление монетами', icon: coinsIcon }
      ];
      break;
    case 'admin':
      main = [
        { key: 'dashboard',      label: 'Главная',      icon: homeIcon },
        { key: 'settings',       label: 'Профиль',      icon: cogIcon },
        { key: 'schedule',       label: 'Расписание',   icon: calendarIcon },
        { key: 'manageStudents', label: 'Студенты',     icon: usersIcon },
        { key: 'managePoints',   label: 'Управление монетами', icon: coinsIcon },
        { key: 'broadcast',      label: 'Рассылка',     icon: broadcastIcon },
        { key: 'manage-groups',  label: 'Группы',       icon: usersIcon },
        { key: 'manageTeachers', label: 'Преподаватели',icon: usersIcon },
        { key: 'manage-events',  label: 'Мероприятия',  icon: calendarIcon },
        { key: 'news',           label: 'Новости',      icon: coursesIcon }
      ];
      break;
    case 'superadmin':
      main = [
        { key: 'dashboard',       label: 'Главная',          icon: homeIcon },
        { key: 'settings',        label: 'Профиль',          icon: cogIcon },
        { key: 'schedule',        label: 'Расписание',       icon: calendarIcon },
        { key: 'manageStudents',  label: 'Студенты',         icon: usersIcon },
        { key: 'managePoints',    label: 'Управление монетами', icon: coinsIcon },
        { key: 'broadcast',       label: 'Рассылка',         icon: broadcastIcon },
        { key: 'manageTeachers',  label: 'Преподаватели',    icon: usersIcon },
        { key: 'manageAdmins',    label: 'Администраторы',   icon: adminIcon },
        { key: 'manage-courses',  label: 'Модерация курсов', icon: moderationIcon },
        { key: 'manage-groups',   label: 'Группы',           icon: usersIcon },
        { key: 'manage-events',   label: 'Мероприятия',      icon: calendarIcon },
        { key: 'manageProducts',  label: 'Товары',           icon: shopIcon },
        { key: 'news',            label: 'Новости',          icon: coursesIcon },
        { key: 'impersonate',     label: 'Магия',            icon: magicIcon }
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
    if (kebabItemKey === activeItem) return true;
    
    // Также сравниваем с соответствующим маршрутом
    const itemRoute = routes[itemKey];
    if (itemRoute) {
      // Извлекаем часть пути после последнего слеша
      const routePart = itemRoute.split('/').pop();
      if (routePart === activeItem) return true;
      
      // Сравниваем весь путь
      if (itemRoute === `/${activeItem}`) return true;
    }
    
    return false;
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
      {/* Бургер-кнопка для мобильных - всегда отображается на экранах <= 768px */}
      <button 
        className={`mobile-menu-toggle ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`sidebar ${isMobile ? 'mobile' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo" onClick={() => handleItemClick('/home')}>
          <img src={logoImage} alt="Пайтишкино" style={{height: '40px', width: 'auto'}} />
        </div>
        
        <div className="sidebar-main-content">
          <ul className="sidebar-list">{main.map(renderItem)}</ul>
        </div>

        <hr className="divider" />

        <ul className="sidebar-list bottom">
          <li className="sidebar-item" onClick={handleLogout}>
            <img src={powerOffIcon} alt="" className="icon" />
            <span className="label">Выйти</span>
          </li>
        </ul>
      </nav>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={confirmState.onCancel}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </>
  );
}
