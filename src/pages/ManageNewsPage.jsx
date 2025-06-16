// src/pages/ManageNewsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }               from 'react-router-dom';
import Sidebar                        from '../components/Sidebar';
import Topbar                         from '../components/TopBar';
import api                            from '../api/axiosInstance'; // axios с baseURL и авторизацией
import { useAuth }                   from '../contexts/AuthContext';
import '../styles/ManageNewsPage.css';

export default function ManageNewsPage() {
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const emptyForm  = { name:'', description:'', is_pinned:false };
  const [form, setForm]         = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors]     = useState({});
  const [newsList, setNewsList] = useState([]);
  const [search, setSearch]     = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSug, setShowSug]   = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(newsList.filter(n => n.name.toLowerCase().includes(q)));
  }, [search, newsList]);

  async function loadNews() {
    try {
      const { data } = await api.get('/news/', { params:{ limit:100, offset:0 }});
      setNewsList(data.objects || []);
    } catch (e) {
      console.error(e);
      alert('Не удалось загрузить новости');
    }
  }

  async function handleCreate() {
    setErrors({});
    try {
      const fd = new FormData();
      // news_data — строка, внутри JSON с exactly этими ключами
      fd.append('news_data', JSON.stringify({
        name:        form.name,
        description: form.description,
        is_pinned:   form.is_pinned
      }));
      if (imageFile) {
        fd.append('image', imageFile);
      }
      await api.post('/news/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Новость создана');
      setForm(emptyForm);
      setImageFile(null);
      loadNews();
    } catch (e) {
      console.error(e);
      if (e.response?.status === 422) {
        const detail = e.response.data.detail;
        setErrors({
          form: Array.isArray(detail)
            ? detail.map(d => d.msg).join('; ')
            : JSON.stringify(detail)
        });
      } else {
        alert('Ошибка создания новости');
      }
    }
  }

  async function handleUpdate() {
    if (!editItem) return;
    setErrors({});
    try {
      const fd = new FormData();
      fd.append('news_data', JSON.stringify({
        name:        editItem.name,
        description: editItem.description,
        is_pinned:   editItem.is_pinned
      }));
      // если заменяем картинку:
      if (imageFile) {
        fd.append('image', imageFile);
      }
      await api.put(`/news/${editItem.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Новость обновлена');
      setEditItem(null);
      setImageFile(null);
      loadNews();
    } catch (e) {
      console.error(e);
      if (e.response?.status === 422) {
        const detail = e.response.data.detail;
        setErrors({
          form: Array.isArray(detail)
            ? detail.map(d => d.msg).join('; ')
            : JSON.stringify(detail)
        });
      } else {
        alert('Ошибка обновления новости');
      }
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
      console.error(e);
      alert('Ошибка удаления');
    }
  }

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ');

  return (
    <div className="manage-news app-layout">
      <Sidebar activeItem="news" userRole={user.role} />
      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Управление новостями</h1>

        {/* Создание */}
        <div className="block">
          <h2>Создать новость</h2>
          <div className="news-form form-grid">
            <div className="field">
              <label>Заголовок</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f=>({...f, name:e.target.value}))}
              />
            </div>
            <div className="field field-full">
              <label>Описание</label>
              <textarea
                value={form.description}
                onChange={e=>setForm(f=>({...f, description:e.target.value}))}
              />
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={e=>setForm(f=>({...f, is_pinned:e.target.checked}))}
                />
                Закрепить новость
              </label>
            </div>
            <div className="field">
              <label>Картинка (опционально)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e=>setImageFile(e.target.files[0]||null)}
              />
            </div>

            {errors.form && (
              <div className="error-text" style={{gridColumn:'1/-1'}}>
                {errors.form}
              </div>
            )}

            <div className="buttons-create" style={{gridColumn:'1/-1'}}>
              <button className="btn-primary" onClick={handleCreate}>
                Создать
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
              onChange={e=>setSearch(e.target.value)}
              onFocus={()=>setShowSug(true)}
              onBlur={()=>setTimeout(()=>setShowSug(false),200)}
            />
            {showSug && filtered.length>0 && (
              <ul className="suggestions">
                {filtered.map(n=>(
                  <li key={n.id} onClick={()=>setEditItem(n)}>
                    {n.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {editItem && (
            <div className="news-form form-grid" style={{marginTop:20}}>
              <div className="field">
                <label>Заголовок</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={e=>setEditItem(i=>({...i,name:e.target.value}))}
                />
              </div>
              <div className="field field-full">
                <label>Описание</label>
                <textarea
                  value={editItem.description}
                  onChange={e=>setEditItem(i=>({...i,description:e.target.value}))}
                />
              </div>
              <div className="field">
                <label>
                  <input
                    type="checkbox"
                    checked={editItem.is_pinned}
                    onChange={e=>setEditItem(i=>({...i,is_pinned:e.target.checked}))}
                  />
                  Закрепить
                </label>
              </div>
              <div className="field">
                <label>Новая картинка (опционально)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e=>setImageFile(e.target.files[0]||null)}
                />
              </div>

              {errors.form && (
                <div className="error-text" style={{gridColumn:'1/-1'}}>
                  {errors.form}
                </div>
              )}

              <div className="buttons-edit" style={{gridColumn:'1/-1'}}>
                <button className="btn-primary" onClick={handleUpdate}>
                  Сохранить
                </button>
                <button className="btn-danger" onClick={handleDelete}>
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
