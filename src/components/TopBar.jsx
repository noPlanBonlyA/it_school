// src/components/TopBar.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import '../styles/TopBar.css';
import bellIcon   from '../images/bell.png';
import avatarImg  from '../images/avatar.png';

export default function Topbar({
  userName,
  userRole,
  notifications = 0,
  onBellClick = () => {}
}) {
  const navigate = useNavigate();

  // При клике на аватар или имя переходим на /profile
  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="topbar">
      {/* Блок поиска */}
    

      <div className="spacer" />

      {/* Кнопка уведомлений */}
      <button className="notifications" onClick={onBellClick}>
        <img src={bellIcon} alt="Уведомления" className="bell-img" />
        {notifications > 0 && <span className="badge">{notifications}</span>}
      </button>

      {/* Информация о пользователе */}
      <div className="user" onClick={handleProfileClick}>
        <img src={avatarImg} alt="Аватар" className="avatar" />
        <div className="info">
          <div className="name">{userName}</div>
          <div className="role">{userRole}</div>
        </div>
      </div>
    </header>
  );
}

Topbar.propTypes = {
  userName:      PropTypes.string.isRequired,
  userRole:      PropTypes.string.isRequired,
  notifications: PropTypes.number,
  onBellClick:   PropTypes.func
};
