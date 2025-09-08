import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import AttendanceWidget from '../components/AttendanceWidget';
import { useAuth } from '../contexts/AuthContext';
import { getMe } from '../services/userService';
import api from '../api/axiosInstance';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    // Используем данные из AuthContext если они есть, иначе загружаем
    if (authUser) {
      setUser(authUser);
    } else {
      getMe()
        .then(setUser)
        .catch(() => alert('Не удалось загрузить профиль'));
    }
  }, [authUser]);

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
    if (!selectedFile || !user?.id) return;

    try {
      setUploading(true);
      
      console.log('[ProfilePage] Uploading avatar for user ID:', user.id);
      
      // Создаем FormData по стандарту API
      const formData = new FormData();
      
      // Создаем объект с данными пользователя (все обязательные поля)
      const userData = {
        username: user.username,
        first_name: user.first_name,
        surname: user.surname,
        patronymic: user.patronymic || '',
        email: user.email,
        birth_date: user.birth_date,
        role: user.role,
        phone_number: user.phone_number || ''
      };
      
      // Добавляем данные пользователя как JSON
      formData.append('user_data', JSON.stringify(userData));
      
      // Добавляем изображение под именем 'image' (как в API)
      formData.append('image', selectedFile);

      console.log('[ProfilePage] Form data prepared:', {
        userData,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Отправляем через правильный эндпоинт
      const response = await api.put(`/users/${user.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('[ProfilePage] Avatar uploaded successfully:', response.data);

      // Обновляем пользователя в AuthContext и локальном состоянии
      try {
        const updatedUser = await updateUser();
        setUser(updatedUser);
        console.log('[ProfilePage] User data updated successfully');
      } catch (updateError) {
        console.warn('[ProfilePage] Failed to update user context, using response data:', updateError);
        // Если не удалось обновить через AuthContext, используем данные из ответа
        setUser(response.data);
      }
      
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Очищаем input
      const fileInput = document.getElementById('avatar-input');
      if (fileInput) fileInput.value = '';
      
      alert('Аватар успешно обновлен!');
      
    } catch (error) {
      console.error('[ProfilePage] Error uploading avatar:', error);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Неизвестная ошибка';
      
      alert('Ошибка загрузки аватара: ' + errorMessage);
      
      // При ошибке не очищаем выбранный файл, чтобы пользователь мог попробовать снова
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
    
    // По API документации фото пользователя находится в поле 'photo'
    if (user?.photo?.url) {
      // Если URL уже полный - используем как есть
      if (user.photo.url.startsWith('http')) {
        return user.photo.url;
      }
      // Если относительный путь - добавляем базовый URL
      return `${window.location.protocol}//${window.location.hostname}:8080${user.photo.url}`;
    }
    
    // Fallback к старым полям или дефолтной картинке
    if (user?.avatar?.url) {
      if (user.avatar.url.startsWith('http')) {
        return user.avatar.url;
      }
      return `${window.location.protocol}//${window.location.hostname}:8080${user.avatar.url}`;
    }
    
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
            </div>

            {/* Виджет посещаемости для студентов */}
            {user.role === 'student' && (
              <div className="attendance-section">
                <AttendanceWidget userId={user.id} />
              </div>
            )}

            {/* Кнопка истории монет для студентов */}
            {user.role === 'student' && (
              <div className="coin-history-section">
                <button 
                  className="coin-history-btn"
                  onClick={() => navigate('/coin-history')}
                >
                  💰 История монет
                </button>
              </div>
            )}
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
