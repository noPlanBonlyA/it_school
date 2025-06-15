import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { getMe } from '../services/userService';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => alert('Не удалось загрузить профиль'));
  }, []);

  if (!user) return <div>Загрузка...</div>;

  /* ---------- вычисляемые поля ---------- */
  const fullName   = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean)
    .join(' ');
  const birthDate  = user.birth_date
    ? new Date(user.birth_date).toLocaleDateString('ru-RU')
    : '—';

  return (
    <div className="app-layout">
      <Sidebar activeItem="settings" userRole={user.role} />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          notifications={0}
          onBellClick={() => setNotifOpen(o => !o)}
        />

        {notifOpen && (
          <div className="notif-dropdown profile-notifs">
            <h4>Уведомления</h4>
            {/* Здесь потом можно отрендерить реальные уведомления */}
          </div>
        )}

        <div className="profile-page">
          <h1 className="page-title">Персональная информация</h1>

          <div className="profile-form">
            {/* ---------- аватар + username ---------- */}
            <div className="avatar-block">
              <img
                className="avatar-img"
                src={user.avatar_url || '/img/default-avatar.svg'}
                alt="avatar"
              />
              <span className="username">{user.username || '—'}</span>
            </div>

            {/* ---------- статичные поля ---------- */}
            <div className="fields-grid">
              <ReadOnlyField label="ФИО"           value={fullName}   />
              <ReadOnlyField label="Дата рождения" value={birthDate}  />
              <ReadOnlyField label="Телефон"       value={user.phone_number || '—'} />
              <ReadOnlyField label="Email"         value={user.email        || '—'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------- */
/*      общекомпонент для «read-only» поля  */
/* ---------------------------------------- */
function ReadOnlyField({ label, value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input read-only">{value}</div>
    </div>
  );
}
