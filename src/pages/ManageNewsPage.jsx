// src/pages/ManageNewsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }               from 'react-router-dom';
import Sidebar                        from '../components/Sidebar';
import Topbar                         from '../components/TopBar';
import axios                          from 'axios';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ManageNewsPage.css';

const API_BASE = 'http://localhost:8080/api';

export default function ManageNewsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newsList, setNewsList]   = useState([]);
  const [search, setSearch]       = useState('');
  const [filtered, setFiltered]   = useState([]);
  const [showSug, setShowSug]     = useState(false);

  const [form, setForm] = useState({
    name:        '',
    description: '',
    status:      'low'
  });
  const [errors, setErrors]     = useState({});
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    setFiltered(
      newsList.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, newsList]);

  async function loadNews() {
    try {
      const response = await axios.get(`${API_BASE}/news/`);
      setNewsList(response.data);
    } catch (e) {
      console.error('Ошибка загрузки новостей:', e);
      alert('Не удалось загрузить новости');
    }
  }

  const handleCreate = async () => {
    setErrors({});
    try {
      const payload = { ...form };
      const response = await axios.post(`${API_BASE}/news/`, payload);
      console.log('Создана новость:', response.data);
      alert('Новость создана');
      setForm({ name: '', description: '', status: 'low' });
      loadNews();
    } catch (e) {
      console.error('Ошибка создания новости:', e);
      if (e.response?.status === 422) {
        // Ожидаем, что e.response.data.detail — массив ошибок
        setErrors(e.response.data.detail || {});
      } else {
        alert('Ошибка создания новости');
      }
    }
  };

  const handleSelect = (item) => {
    // При выборе заполняем editItem со всеми полями, включая id
    setEditItem({ ...item });
    setErrors({});
    setSearch('');
  };

  const handleUpdate = async () => {
    if (!editItem) return;

    console.log('Кнопка "Сохранить" нажата, editItem =', editItem);

    setErrors({});
    try {
      // Теперь обязательно передаём поле id вместе с остальными
      const payload = {
        id:          editItem.id,
        name:        editItem.name,
        description: editItem.description,
        status:      editItem.status
      };
      console.log('Отправляем PUT payload:', payload);

      const response = await axios.put(
        `${API_BASE}/news/${editItem.id}`,
        payload
      );
      console.log('Ответ PUT:', response.data);

      alert('Изменено');
      loadNews();
      setEditItem(null);
    } catch (e) {
      console.error('Ошибка при обновлении новости:', e);

      if (e.response?.status === 422) {
        // e.response.data.detail может быть массивом из объектов вида
        // { loc: [...], msg: "...", type: "..." }
        // Или, если сервер возвращает { detail: { ... } }, нужно адаптировать
        const detail = e.response.data.detail;
        // Если detail — массив, попробуем собрать сообщение в строку или показать по полям
        if (Array.isArray(detail)) {
          // Например, возьмём первый объект и выведем его сообщение
          setErrors({ form: detail.map(d => d.msg).join(', ') });
        } else {
          setErrors(detail || {});
        }
      } else {
        alert('Ошибка обновления новости');
      }
    }
  };

  const handleDelete = async () => {
    if (!editItem) return;
    if (!window.confirm('Вы действительно хотите удалить эту новость?')) return;
    try {
      const response = await axios.delete(`${API_BASE}/news/${editItem.id}`);
      console.log('Удалено, ответ DELETE:', response.data);
      alert('Удалено');
      loadNews();
      setEditItem(null);
    } catch (e) {
      console.error('Ошибка удаления новости:', e);
      alert('Ошибка удаления новости');
    }
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="manage-news app-layout">
      <Sidebar activeItem="manageNews" userRole="admin" />

      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole="admin"
          notifications={0}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Управление новостями</h1>

        {/* Блок создания */}
        <div className="block">
          <h2>Создать новость</h2>
          <div className="news-form form-grid">
            <div className="field">
              <label>Заголовок</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                placeholder="Введите заголовок"
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>
            <div className="field field-full">
              <label>Описание</label>
              <textarea
                value={form.description}
                onChange={e => setForm(s => ({ ...s, description: e.target.value }))}
                placeholder="Введите описание"
              />
              {errors.description && <div className="error-text">{errors.description}</div>}
            </div>
            <div className="field">
              <label>Статус</label>
              <select
                value={form.status}
                onChange={e => setForm(s => ({ ...s, status: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {errors.status && <div className="error-text">{errors.status}</div>}
            </div>
            <div className="buttons-create">
              <button type="button" className="btn-primary" onClick={handleCreate}>
                Создать
              </button>
            </div>
          </div>
        </div>

        {/* Блок поиска/редактирования */}
        <div className="block">
          <h2>Найти / Изменить / Удалить</h2>
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
                {filtered.map(item => (
                  <li key={item.id} onClick={() => handleSelect(item)}>
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {editItem && (
            <div className="news-form form-grid">
              <div className="field">
                <label>Заголовок</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={e =>
                    setEditItem(s => ({ ...s, name: e.target.value }))
                  }
                  placeholder="Редактируйте заголовок"
                />
                {errors.name && <div className="error-text">{errors.name}</div>}
              </div>
              <div className="field field-full">
                <label>Описание</label>
                <textarea
                  value={editItem.description}
                  onChange={e =>
                    setEditItem(s => ({ ...s, description: e.target.value }))
                  }
                  placeholder="Редактируйте описание"
                />
                {errors.description && <div className="error-text">{errors.description}</div>}
              </div>
              <div className="field">
                <label>Статус</label>
                <select
                  value={editItem.status}
                  onChange={e =>
                    setEditItem(s => ({ ...s, status: e.target.value }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {errors.status && <div className="error-text">{errors.status}</div>}
              </div>
              <div className="buttons-edit">
                <button type="button" className="btn-primary" onClick={handleUpdate}>
                  Сохранить
                </button>
                <button type="button" className="btn-danger" onClick={handleDelete}>
                  Удалить
                </button>
              </div>
              {/* Если сервер вернул какие-то неполя 422, отобразим общий текст */}
              {errors.form && <div className="error-text">{errors.form}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
