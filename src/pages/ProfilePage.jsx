import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { getMe } from '../services/userService';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => alert('Не удалось загрузить профиль'));
  }, []);

  // Обработка выбора файла
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }
      
      // Проверяем размер файла (например, максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Создаем превью
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Загрузка аватара
  const handleUploadAvatar = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('avatar', selectedFile);
      
      // Здесь нужен API эндпоинт для загрузки аватара
      // Пример: PUT /users/me/avatar
      const response = await fetch('/api/users/me/avatar', {
        method: 'POST', // или PUT
        body: formData,
        headers: {
          // Токен авторизации будет добавлен interceptor'ом
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки аватара');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setSelectedFile(null);
      setPreviewUrl(null);
      alert('Аватар успешно обновлен!');
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Ошибка загрузки аватара: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Отмена выбора файла
  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

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
              <div className="avatar-container">
                <img
                  className="avatar-img"
                  src={previewUrl || user.avatar_url || '/img/default-avatar.svg'}
                  alt="avatar"
                />
                
                {/* Кнопка для выбора файла */}
                <div className="avatar-upload">
                  <input
                    type="file"
                    id="avatar-input"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-input" className="upload-button">
                    📷 Изменить фото
                  </label>
                </div>

                {/* Кнопки управления загрузкой */}
                {selectedFile && (
                  <div className="upload-controls">
                    <button
                      onClick={handleUploadAvatar}
                      disabled={uploading}
                      className="save-button"
                    >
                      {uploading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button
                      onClick={handleCancelUpload}
                      className="cancel-button"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
              
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
