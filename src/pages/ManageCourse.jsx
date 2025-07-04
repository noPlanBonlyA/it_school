import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar      from '../components/Sidebar';
import SmartTopBar  from '../components/SmartTopBar';
import CourseCard   from '../components/CourseCard';
import { useAuth }  from '../contexts/AuthContext';

import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse
} from '../services/courseService';

import '../styles/ManageUserPage.css';   // старая сетка + модалки
import '../styles/CourseGrid.css';       // сетка карточек

export default function ManageCoursesPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  /* ---------- state ---------- */
  const [courses, setCourses] = useState([]);

  /* поиск */
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSug, setShowSug] = useState(false);

  /* создание */
  const [form, setForm] = useState({
    name: '',
    description: '',
    age_category: 'All',
    price: ''
  });
  const [formImage, setFormImage] = useState(null);
  const [formPreviewUrl, setFormPreviewUrl] = useState(null);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);

  /* редактирование */
  const [edit, setEdit] = useState(null);
  const [editImage, setEditImage] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ---------- effects ---------- */
  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const all = await getAllCourses();
      setCourses(all.objects || []);
    } catch (e) {
      alert('Ошибка загрузки курсов');
    }
  }

  /* фильтрация для подсказок */
  useEffect(() => {
    setFiltered(
      courses.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, courses]);

  /* ---------- обработка файлов ---------- */
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

    if (isEdit) {
      setEditImage(file);
      // Создаем превью
      const reader = new FileReader();
      reader.onload = (e) => setEditPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFormImage(file);
      // Создаем превью
      const reader = new FileReader();
      reader.onload = (e) => setFormPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }

    console.log('[ManageCourse] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isEdit
    });
  };

  // Функция для получения URL изображения
  const getImageUrl = (course) => {
    if (editPreviewUrl && edit?.id === course?.id) return editPreviewUrl;
    
    if (course?.photo?.url) {
      return course.photo.url.startsWith('http') 
        ? course.photo.url 
        : `${window.location.protocol}//${window.location.hostname}:8080${course.photo.url}`;
    }
    
    return null;
  };

  /* ---------- handlers ---------- */
  const handleCreate = async () => {
    setUploading(true);
    try {
      const fd = new FormData();
      
      // Определяем имя автора из текущего пользователя
      const authorName = [user.first_name, user.surname].filter(Boolean).join(' ') || user.username || 'Неизвестный автор';
      
      // Данные курса
      const courseData = {
        name:         form.name,
        description:  form.description,
        age_category: form.age_category,
        price:        Number(form.price),
        author_name:  authorName
      };
      
      // Если есть изображение, добавляем поле photo с именем
      if (formImage) {
        courseData.photo = { name: formImage.name };
        fd.append('image', formImage);
      }
      
      fd.append('course_data', JSON.stringify(courseData));

      await createCourse(fd);
      setForm({ name:'', description:'', age_category:'All', price:'' });
      setFormImage(null);
      setFormPreviewUrl(null);
      setShowConfirmCreate(false);
      await load();
      alert('Курс создан успешно');
    } catch (e) {
      console.error('[ManageCourse] Error creating course:', e);
      alert('Ошибка создания курса');
      setShowConfirmCreate(false);
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = c => {
    setEdit({
      id:           c.id,
      name:         c.name || '',
      description:  c.description || '',
      age_category: c.age_category || 'All',
      price:        c.price != null ? c.price.toString() : '',
      author_name:  c.author_name || ''  // только для отображения, не для редактирования
    });
    setEditImage(null);
    setEditPreviewUrl(null);
    setSearch('');
  };

  const handleUpdate = async () => {
    setUploading(true);
    try {
      const fd = new FormData();
      
      // Данные курса (author_name не изменяем)
      const courseData = {
        name:         edit.name,
        description:  edit.description,
        age_category: edit.age_category,
        price:        Number(edit.price)
        // author_name исключен - не изменяем автора курса
      };
      
      // Если заменяем изображение, добавляем поле photo с именем
      if (editImage) {
        courseData.photo = { name: editImage.name };
        fd.append('image', editImage);
      }
      
      fd.append('course_data', JSON.stringify(courseData));

      await updateCourse(edit.id, fd);
      setEdit(null);
      setEditImage(null);
      setEditPreviewUrl(null);
      setShowConfirmUpdate(false);
      await load();
      alert('Курс обновлен успешно');
    } catch (e) {
      console.error('[ManageCourse] Error updating course:', e);
      alert('Ошибка обновления курса');
      setShowConfirmUpdate(false);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCourse(edit.id);
      setEdit(null);
      setShowConfirmDelete(false);
      await load();
      alert('Курс удален успешно');
    } catch {
      alert('Ошибка удаления курса');
      setShowConfirmDelete(false);
    }
  };

  /* ---------- helpers ---------- */
  const fullName = [user.first_name, user.surname, user.patronymic]
                   .filter(Boolean).join(' ');

  /* ---------- UI ---------- */
  return (
    <div className="app-layout">
      <Sidebar activeItem="manage-courses" userRole={user.role} />

      <div className="main-content">
        <SmartTopBar pageTitle="Управление курсами" />

        {/* ---------------- CREATE COURSE ---------------- */}
        <div className="block">
          <h2>Создать курс</h2>

          <div className="user-form form-grid">
            <div className="field">
              <label>Название</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Введите название курса"
              />
            </div>

            <div className="field">
              <label>Возрастная категория</label>
              <select
                value={form.age_category}
                onChange={e => setForm(f => ({ ...f, age_category: e.target.value }))}
                className="age-category-select"
              >
                <option value="All">Все возрасты</option>
                <option value="SixPlus">6+</option>
                <option value="TwelvePlus">12+</option>
              </select>
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Описание</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Описание курса"
                rows={4}
              />
            </div>

            <div className="field">
              <label>Цена (₽)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="field">
              <label>Автор курса</label>
              <input
                type="text"
                value={[user.first_name, user.surname].filter(Boolean).join(' ') || user.username || 'Неизвестный автор'}
                disabled
                className="disabled-field"
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Автор определяется автоматически
              </small>
            </div>

            <div className="field">
              <label>Изображение (опционально)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleFileSelect(e.target.files[0], false)}
              />
              {formPreviewUrl && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={formPreviewUrl} 
                    alt="Превью" 
                    style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => { setFormImage(null); setFormPreviewUrl(null); }}
                    style={{ marginLeft: '10px', padding: '5px 10px' }}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>

            <div className="buttons" style={{ gridColumn:'1 / -1' }}>
              <button 
                className="btn-primary" 
                onClick={() => setShowConfirmCreate(true)}
                disabled={uploading || !form.name.trim()}
              >
                {uploading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>

        {/* ---------------- SEARCH / EDIT / DELETE ---------------- */}
        <div className="block">
          <h2>Найти / Изменить / Удалить</h2>

          {/* search bar */}
          <div className="search-block">
            <input
              placeholder="Поиск по названию"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 200)}
            />
            {showSug && filtered.length > 0 && (
              <ul className="suggestions">
                {filtered.map(c => (
                  <li key={c.id} onClick={() => handleSelect(c)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getImageUrl(c) && (
                        <img 
                          src={getImageUrl(c)} 
                          alt="" 
                          style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      )}
                      <span>{c.name} ({c.author_name})</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* edit form */}
          {edit && (
            <div className="user-form form-grid" style={{ marginTop:20 }}>
              <div className="field">
                <label>Название</label>
                <input
                  type="text"
                  value={edit.name}
                  onChange={e => setEdit(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Возрастная категория</label>
                <select
                  value={edit.age_category}
                  onChange={e => setEdit(p => ({ ...p, age_category: e.target.value }))}
                  className="age-category-select"
                >
                  <option value="All">Все возрасты</option>
                  <option value="SixPlus">6+</option>
                  <option value="TwelvePlus">12+</option>
                </select>
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Описание</label>
                <textarea
                  value={edit.description}
                  onChange={e => setEdit(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="field">
                <label>Цена (₽)</label>
                <input
                  type="number"
                  value={edit.price}
                  onChange={e => setEdit(p => ({ ...p, price: e.target.value }))}
                  min="0"
                />
              </div>

              <div className="field">
                <label>Автор курса</label>
                <input
                  type="text"
                  value={edit.author_name || 'Не указан'}
                  disabled
                  className="disabled-field"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Автор курса не может быть изменен
                </small>
              </div>

              <div className="field">
                <label>Изображение</label>
                
                {/* Текущее изображение */}
                {getImageUrl(edit) && (
                  <div style={{ marginBottom: '10px' }}>
                    <img 
                      src={getImageUrl(edit)} 
                      alt="Текущее изображение" 
                      style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                      {editPreviewUrl ? 'Новое изображение (не сохранено)' : 'Текущее изображение'}
                    </p>
                  </div>
                )}
                
                {/* Выбор нового файла */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileSelect(e.target.files[0], true)}
                />
                
                {editPreviewUrl && (
                  <button 
                    type="button" 
                    onClick={() => { setEditImage(null); setEditPreviewUrl(null); }}
                    style={{ marginTop: '5px', padding: '5px 10px' }}
                  >
                    Отменить замену
                  </button>
                )}
              </div>

              <div className="buttons" style={{ gridColumn:'1 / -1' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => setShowConfirmUpdate(true)}
                  disabled={uploading}
                >
                  {uploading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button className="btn-danger" onClick={() => setShowConfirmDelete(true)}>
                  Удалить
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => { 
                    setEdit(null); 
                    setEditImage(null); 
                    setEditPreviewUrl(null); 
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- COURSES GRID ---------------- */}
        {courses.length > 0 && (
          <div className="block">
            <h2>Все курсы</h2>
            <div className="card-grid">
              {courses.map(c => (
                <CourseCard
                  key={c.id}
                  course={c}
                  onOpen={id => navigate(`/courses/${id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ---------------- MODALS ---------------- */}
        {/* create */}
        {showConfirmCreate && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>
                🎯 Создать новый курс<br />
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>
                  "{form.name}"
                </span>
              </p>
              <div className="modal-buttons">
                <button className="btn-primary" onClick={handleCreate} disabled={uploading}>
                  {uploading ? 'Создание...' : '✨ Создать'}
                </button>
                <button className="btn-secondary" onClick={() => setShowConfirmCreate(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
        {/* update */}
        {showConfirmUpdate && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>
                📝 Сохранить изменения<br />
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>
                  Курс "{edit.name}" будет обновлен
                </span>
              </p>
              <div className="modal-buttons">
                <button className="btn-primary" onClick={handleUpdate} disabled={uploading}>
                  {uploading ? 'Сохранение...' : '💾 Сохранить'}
                </button>
                <button className="btn-secondary" onClick={() => setShowConfirmUpdate(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
        {/* delete */}
        {showConfirmDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>
                🗑️ Удалить курс<br />
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#ef4444' }}>
                  Курс "{edit.name}" будет удален безвозвратно
                </span>
              </p>
              <div className="modal-buttons">
                <button className="btn-primary" onClick={handleDelete} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                  🗑️ Удалить
                </button>
                <button className="btn-secondary" onClick={() => setShowConfirmDelete(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
