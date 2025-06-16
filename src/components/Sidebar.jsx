// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import '../styles/SideBar.css';

import clockIcon      from '../images/sidebar_icon1.png';
import calendarIcon   from '../images/sidebar_icon2.png';
import coursesIcon    from '../images/sidebar_icon3.png';
import chartIcon      from '../images/sidebar_icon4.png';
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
  const { logout }   = useAuth();                    // ← добавили logout из контекста
  const [showLogout, setShowLogout] = useState(false);

  const routes = {
    dashboard:       '/home',
    schedule:        '/schedule',
    studentCourses:  '/courses',
    rating:          '/rating',
    teacherCourses:  '/teacher-courses',
    homework:        '/homework',
    manageStudents:  '/manage-users',
    notifications:   '/broadcast',
    groups:          '/groups',
    manageTeachers:  '/manage-teachers',
    news:            '/news',
    manageAdmins:    '/manage-admins',
    moderateCourses: '/manage-courses',
    shop:            '/shop',
    settings:        '/profile',
    logout:          '/login'
  };

  let main = [];
  switch (userRole) {
    case 'student':
      main = [
        { key: 'dashboard',      label: 'Главная',    icon: clockIcon },
        { key: 'schedule',       label: 'Расписание', icon: calendarIcon },
        { key: 'studentCourses', label: 'Мои курсы',  icon: coursesIcon },
        { key: 'rating',         label: 'Рейтинг',    icon: chartIcon },
        { key: 'settings',       label: 'Профиль',    icon: cogIcon }
      ];
      break;
    case 'teacher':
      main = [
        { key: 'settings',       label: 'Мой профиль', icon: cogIcon },
        { key: 'schedule',       label: 'Расписание',  icon: calendarIcon },
        { key: 'teacherCourses', label: 'Курсы',       icon: coursesIcon },
        { key: 'homework',       label: 'Дом. задания',icon: homeworkIcon }
      ];
      break;
    case 'admin':
      main = [
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
        { key: 'settings',        label: 'Профиль',          icon: cogIcon },
        { key: 'schedule',        label: 'Расписание',       icon: calendarIcon },
        { key: 'manageStudents',  label: 'Студенты',         icon: usersIcon },
        { key: 'notifications',   label: 'Рассылка',         icon: broadcastIcon },
        { key: 'manageTeachers',  label: 'Преподаватели',    icon: usersIcon },
        { key: 'manageAdmins',    label: 'Администраторы',   icon: adminIcon },
        { key: 'moderateCourses', label: 'Модерация курсов', icon: moderationIcon },
        { key: 'groups',          label: 'Группы',           icon: usersIcon },
        { key: 'shop',            label: 'Магазин',          icon: shopIcon }
      ];
      break;
    default:
      main = [];
  }

  const renderItem = i => (
    <li
      key={i.key}
      className={`sidebar-item${i.key === activeItem ? ' active' : ''}`}
      onClick={() => navigate(routes[i.key])}
    >
      <img src={i.icon} alt="" className="icon" />
      <span className="label">{i.label}</span>
    </li>
  );

  return (
    <>
      <nav className="sidebar">
        <div className="logo" onClick={() => navigate('/home')}>Bright&nbsp;Web</div>
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
