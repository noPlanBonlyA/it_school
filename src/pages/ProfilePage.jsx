import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { getMe } from '../services/userService';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => alert('Не удалось загрузить профиль'));
  }, []);

  if (!user) return <div>Загрузка...</div>;

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean)
    .join(' ');
  const birthDate = user.birth_date
    ? new Date(user.birth_date).toLocaleDateString('ru-RU')
    : '—';

  return (
    <div className="app-layout">
      <Sidebar activeItem="settings" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onBellClick={() => {}}
          onProfileClick={() => {}}
        />

        <div className="profile-page">
          <h1 className="page-title">Персональная информация</h1>

          <div className="profile-form">
            {/* аватар + username */}
            <div className="avatar-block">
              <img
                className="avatar-img"
                src={user.avatar_url || '/img/default-avatar.svg'}
                alt="avatar"
              />
              <span className="username">{user.username || '—'}</span>
            </div>

            {/* статичные поля */}
            <div className="fields-grid">
              <ReadOnlyField label="ФИО"           value={fullName}   />
              <ReadOnlyField label="Дата рождения" value={birthDate}  />
              <ReadOnlyField label="Почта"         value={user.email || '—'} />
              <ReadOnlyField label="Телефон"       value={user.phone_number || '—'} />
              <ReadOnlyField label="Роль"          value={user.role || '—'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input read-only" value={value} readOnly />
    </div>
  );
}
