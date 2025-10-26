// src/pages/ManageNewsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import api from '../api/axiosInstance';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ManageNewsPage.css';

export default function ManageNewsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const emptyForm = { name: '', description: '', is_pinned: false };
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [newsList, setNewsList] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(newsList.filter(n => n.name.toLowerCase().includes(q)));
  }, [search, newsList]);

  // Обработка выбора файла
  const handleFileSelect = (file, isEdit = false) => {
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5MB');
      return;
    }

    setImageFile(file);

    // Создаем превью
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    console.log('[ManageNewsPage] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isEdit
    });
  };

  async function loadNews() {
    try {
      const { data } = await api.get('/news/', { params: { limit: 100, offset: 0 } });
      const newsList = data.objects || [];
      
      // Добавляем image_url для каждой новости
      const mappedNews = newsList.map(news => ({
        ...news,
        image_url: news.photo?.url ? (
          news.photo.url.startsWith('http') 
            ? news.photo.url 
            : `${window.location.protocol}//${window.location.hostname}:8080${news.photo.url}`
        ) : null
      }));
      
      setNewsList(mappedNews);
      console.log('[ManageNewsPage] News loaded:', mappedNews);
    } catch (e) {
      console.error('[ManageNewsPage] Error loading news:', e);
      alert('Не удалось загрузить новости');
    }
  }

  async function handleCreate() {
    setErrors({});
    setUploading(true);
    
    try {
      console.log('[ManageNewsPage] Creating news:', {
        form,
        hasImage: !!imageFile,
        imageName: imageFile?.name
      });

      const formData = new FormData();
      
      // ИСПРАВЛЕНО: news_data С полем photo
      const newsData = {
        name: form.name,
        description: form.description,
        is_pinned: form.is_pinned
      };
      
      // Если есть файл, добавляем поле photo с именем
      if (imageFile) {
        newsData.photo = { name: imageFile.name };
        formData.append('image', imageFile);
      }
      
      formData.append('news_data', JSON.stringify(newsData));

      const response = await api.post('/news/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('[ManageNewsPage] News created successfully:', response.data);
      alert('Новость создана');
      setForm(emptyForm);
      setImageFile(null);
      setPreviewUrl(null);
      
      // Очищаем input file для создания
      const fileInput = document.querySelector('input[type="file"]:not([data-edit])');
      if (fileInput) fileInput.value = '';
      
      loadNews();
    } catch (e) {
      console.error('[ManageNewsPage] Error creating news:', e);
      if (e.response?.status === 422) {
        const detail = e.response.data.detail;
        setErrors({
          form: Array.isArray(detail)
            ? detail.map(d => d.msg).join('; ')
            : JSON.stringify(detail)
        });
      } else {
        alert('Ошибка создания новости: ' + (e.response?.data?.detail || e.message));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate() {
    if (!editItem) return;
    setErrors({});
    setUploading(true);
    
    try {
      console.log('[ManageNewsPage] Updating news:', {
        editItem,
        hasImage: !!imageFile,
        imageName: imageFile?.name
      });

      const formData = new FormData();
      
      // ИСПРАВЛЕНО: news_data С полем photo
      const newsData = {
        name: editItem.name,
        description: editItem.description,
        is_pinned: editItem.is_pinned
      };
      
      // Если заменяем картинку, добавляем поле photo с именем
      if (imageFile) {
        newsData.photo = { name: imageFile.name };
        formData.append('image', imageFile);
      }
      
      formData.append('news_data', JSON.stringify(newsData));

      const response = await api.put(`/news/${editItem.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('[ManageNewsPage] News updated successfully:', response.data);
      alert('Новость обновлена');
      setEditItem(null);
      setImageFile(null);
      setPreviewUrl(null);
      loadNews();
    } catch (e) {
      console.error('[ManageNewsPage] Error updating news:', e);
      if (e.response?.status === 422) {
        const detail = e.response.data.detail;
        setErrors({
          form: Array.isArray(detail)
            ? detail.map(d => d.msg).join('; ')
            : JSON.stringify(detail)
        });
      } else {
        alert('Ошибка обновления новости: ' + (e.response?.data?.detail || e.message));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!editItem || !window.confirm('Удалить эту новость?')) return;
    try {
      await api.delete(`/news/${editItem.id}`);
      alert('Новость удалена');
      setEditItem(null);
      loadNews();
    } catch (e) {
      console.error('[ManageNewsPage] Error deleting news:', e);
      alert('Ошибка удаления');
    }
  }

  // Функция для получения URL изображения
  const getImageUrl = (news) => {
    if (previewUrl && editItem?.id === news?.id) return previewUrl;
    
    if (news?.photo?.url) {
      return news.photo.url.startsWith('http') 
        ? news.photo.url 
        : `${window.location.protocol}//${window.location.hostname}:8080${news.photo.url}`;
    }
    
    return news?.image_url || null;
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  return (
    <div className="manage-news app-layout">
      <Sidebar activeItem="news" userRole={user.role} />
      <div className="main-content">
        <SmartTopBar pageTitle="Управление новостями" />

        {/* Убираем дублирующий заголовок, так как он теперь в TopBar */}

        {/* Создание */}
        <div className="block">
          <h2>Создать новость</h2>
          <div className="news-form form-grid">
            <div className="field">
              <label>Заголовок</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field field-full">
              <label>Описание</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="field">
              <div className="checkbox-field">
                <input
                  type="checkbox"
                  id="pin-create"
                  className="custom-checkbox"
                  checked={form.is_pinned}
                  onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                />
                <label htmlFor="pin-create" className="checkbox-label" >
                  <span className="checkbox-custom"></span>
                  Закрепить новость
                </label>
              </div>
            </div>
            <div className="field">
              <label>Картинка (опционально)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleFileSelect(e.target.files[0], false)}
              />
              {previewUrl && !editItem && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={previewUrl} 
                    alt="Превью" 
                    style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => { 
                      setImageFile(null); 
                      setPreviewUrl(null);
                      // Очищаем также input file
                      const fileInput = document.querySelector('input[type="file"]:not([data-edit])');
                      if (fileInput) fileInput.value = '';
                    }}
                    style={{ marginLeft: '10px', padding: '5px 10px' }}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>

            {errors.form && (
              <div className="error-text" style={{ gridColumn: '1/-1' }}>
                {errors.form}
              </div>
            )}

            <div className="buttons-create" style={{ gridColumn: '1/-1' }}>
              <button 
                className="btn-primary" 
                onClick={handleCreate}
                disabled={uploading || !form.name.trim()}
              >
                {uploading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>

        {/* Редактирование / удаление */}
        <div className="block">
          <h2>Поиск / Изменить / Удалить</h2>
          <div className="search-block">
            <input
              placeholder="Поиск по заголовку"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 200)}
            />
            {showSug && filtered.length > 0 && (
              <ul className="suggestions">
                {filtered.map(n => (
                  <li key={n.id} onClick={() => { setEditItem(n); setShowSug(false); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getImageUrl(n) && (
                        <img 
                          src={getImageUrl(n)} 
                          alt="" 
                          style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      )}
                      <span>{n.name}</span>
                      {n.is_pinned && <span style={{ color: '#007bff' }}>📌</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {editItem && (
            <div className="news-form form-grid" style={{ marginTop: 20 }}>
              <div className="field">
                <label>Заголовок</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={e => setEditItem(i => ({ ...i, name: e.target.value }))}
                />
              </div>
              <div className="field field-full">
                <label>Описание</label>
                <textarea
                  value={editItem.description}
                  onChange={e => setEditItem(i => ({ ...i, description: e.target.value }))}
                />
              </div>
              <div className="field">
                <div className="checkbox-field">
                  <input
                    type="checkbox"
                    id="pin-edit"
                    className="custom-checkbox"
                    checked={editItem.is_pinned}
                    onChange={e => setEditItem(i => ({ ...i, is_pinned: e.target.checked }))}
                  />
                  <label htmlFor="pin-edit" className="checkbox-label">
                    <span className="checkbox-custom"></span>
                    Закрепить новость
                  </label>
                </div>
              </div>
              <div className="field">
                <label>Изображение</label>
                
                {/* Текущее изображение */}
                {getImageUrl(editItem) && (
                  <div style={{ marginBottom: '10px' }}>
                    <img 
                      src={getImageUrl(editItem)} 
                      alt="Текущее изображение" 
                      style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                      {previewUrl ? 'Новое изображение (не сохранено)' : 'Текущее изображение'}
                    </p>
                  </div>
                )}
                
                {/* Выбор нового файла */}
                <input
                  type="file"
                  accept="image/*"
                  data-edit="true"
                  onChange={e => handleFileSelect(e.target.files[0], true)}
                />
                
                {previewUrl && (
                  <button 
                    type="button" 
                    onClick={() => { 
                      setImageFile(null); 
                      setPreviewUrl(null);
                      // Очищаем input file для редактирования
                      const editFileInput = document.querySelector('input[type="file"][data-edit="true"]');
                      if (editFileInput) editFileInput.value = '';
                    }}
                    style={{ marginTop: '5px', padding: '5px 10px' }}
                  >
                    Отменить замену
                  </button>
                )}
              </div>

              {errors.form && (
                <div className="error-text" style={{ gridColumn: '1/-1' }}>
                  {errors.form}
                </div>
              )}

              <div className="buttons-edit" style={{ gridColumn: '1/-1' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleUpdate}
                  disabled={uploading}
                >
                  {uploading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button className="btn-danger" onClick={handleDelete}>
                  Удалить
                </button>
                <button 
                  className="btn-primary"
            style={{ backgroundColor: '#e40b0bff'}}
                  onClick={() => { 
                    setEditItem(null); 
                    setImageFile(null); 
                    setPreviewUrl(null);
                    // Очищаем input file для редактирования
                    const editFileInput = document.querySelector('input[type="file"][data-edit="true"]');
                    if (editFileInput) editFileInput.value = '';
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
