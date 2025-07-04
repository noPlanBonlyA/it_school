import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import { getMe } from '../services/userService';
import api from '../api/axiosInstance';
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
      
      // Создаем FormData как для курсов
      const formData = new FormData();
      
      // Добавляем файл под именем 'avatar' (или как требует API)
      formData.append('avatar', selectedFile);
      
      // Также добавляем метаданные фото в JSON формате
      const photoMetadata = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      };
      formData.append('photo', JSON.stringify(photoMetadata));

      console.log('[ProfilePage] Uploading avatar:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Отправляем через api instance (который автоматически добавит токен)
      const response = await api.patch('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('[ProfilePage] Avatar uploaded successfully:', response.data);

      // Обновляем пользователя
      setUser(response.data);
      setSelectedFile(null);
      setPreviewUrl(null);
      alert('Аватар успешно обновлен!');
      
    } catch (error) {
      console.error('[ProfilePage] Error uploading avatar:', error);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Неизвестная ошибка';
      
      alert('Ошибка загрузки аватара: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Отмена выбора файла
  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Функция для получения URL аватара
  const getAvatarUrl = () => {
    if (previewUrl) return previewUrl;
    
    if (user?.avatar?.url) {
      // Если URL уже полный - используем как есть
      if (user.avatar.url.startsWith('http')) {
        return user.avatar.url;
      }
      // Если относительный путь - добавляем базовый URL
      return `${window.location.protocol}//${window.location.hostname}:8080${user.avatar.url}`;
    }
    
    // Fallback к старому полю или дефолтной картинке
    return user?.avatar_url || '/img/default-avatar.svg';
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
          pageTitle="Профиль"
          onBellClick={() => {}}
          onProfileClick={() => {}}
        />

        <div className="profile-page">
          <div className="profile-form">
            {/* аватар + username */}
            <div className="avatar-block">
              <div className="avatar-container">
                <img
                  className="avatar-img"
                  src={getAvatarUrl()}
                  alt="avatar"
                  onError={(e) => {
                    console.warn('Avatar image failed to load:', e.target.src);
                    e.target.src = '/img/default-avatar.svg';
                  }}
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
              <ReadOnlyField label="👤 ФИО"           value={fullName}   />
              <ReadOnlyField label="🎂 Дата рождения" value={birthDate}  />
              <ReadOnlyField label="📧 Почта"         value={user.email || '—'} />
              <ReadOnlyField label="📱 Телефон"       value={user.phone_number || '—'} />
              <ReadOnlyField label="🎭 Роль"          value={user.role || '—'} />
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
