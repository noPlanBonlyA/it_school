import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar      from '../components/Sidebar';
import Topbar       from '../components/TopBar';
import CourseCard   from '../components/CourseCard';
import { useAuth }  from '../contexts/AuthContext';

import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse
} from '../services/courseService';

import '../styles/ManageUserPage.css';   // старая сетка + модалки
import '../styles/CourseGrid.css';       // сетка карточек (см. предыдущий ответ)

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
    age_category: '',
    price: '',
    author_name: ''
  });
  const [formImage, setFormImage] = useState(null);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);

  /* редактирование */
  const [edit, setEdit] = useState(null);
  const [editImage, setEditImage] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);

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

  /* ---------- handlers ---------- */
  const handleCreate = async () => {
    try {
      const fd = new FormData();
      fd.append('course_data', JSON.stringify({
        name:         form.name,
        description:  form.description,
        age_category: form.age_category,
        price:        Number(form.price),
        author_name:  form.author_name
      }));
      if (formImage) fd.append('image', formImage);

      await createCourse(fd);
      setForm({ name:'', description:'', age_category:'', price:'', author_name:'' });
      setFormImage(null);
      setShowConfirmCreate(false);
      await load();
    } catch {
      alert('Ошибка создания курса');
      setShowConfirmCreate(false);
    }
  };

  const handleSelect = c => {
    setEdit({
      id:           c.id,
      name:         c.name || '',
      description:  c.description || '',
      age_category: c.age_category || '',
      price:        c.price != null ? c.price.toString() : '',
      author_name:  c.author_name || ''
    });
    setEditImage(null);
    setSearch('');
  };

  const handleUpdate = async () => {
    try {
      const fd = new FormData();
      fd.append('course_data', JSON.stringify({
        name:         edit.name,
        description:  edit.description,
        age_category: edit.age_category,
        price:        Number(edit.price),
        author_name:  edit.author_name
      }));
      if (editImage) fd.append('image', editImage);

      await updateCourse(edit.id, fd);
      setEdit(null);
      setEditImage(null);
      setShowConfirmUpdate(false);
      await load();
    } catch {
      alert('Ошибка обновления курса');
      setShowConfirmUpdate(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCourse(edit.id);
      setEdit(null);
      setShowConfirmDelete(false);
      await load();
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
        <Topbar
          userName={fullName}
          userRole={user.role}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        {/* ---------------- CREATE COURSE ---------------- */}
        <div className="block">
          <h2>Создать курс</h2>

          <div className="user-form form-grid">
            {[
              { key:'name',         label:'Название' },
              { key:'description',  label:'Описание' },
              { key:'age_category', label:'Возрастная категория' },
              { key:'price',        label:'Цена' },
              { key:'author_name',  label:'Автор' }
            ].map(({ key, label }) => (
              <div className="field" key={key}>
                <label>{label}</label>
                {key === 'description'
                  ? <textarea
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  : <input
                      type={key === 'price' ? 'number' : 'text'}
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                }
              </div>
            ))}

            <div className="field">
              <label>Изображение</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setFormImage(e.target.files[0] || null)}
              />
            </div>

            <div className="buttons" style={{ gridColumn:'1 / -1' }}>
              <button className="btn-primary" onClick={() => setShowConfirmCreate(true)}>
                Создать
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
                    {c.name} ({c.author_name})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* edit form */}
          {edit && (
            <div className="user-form form-grid" style={{ marginTop:20 }}>
              {[
                { key:'name',         label:'Название' },
                { key:'description',  label:'Описание' },
                { key:'age_category', label:'Возрастная категория' },
                { key:'price',        label:'Цена' },
                { key:'author_name',  label:'Автор' }
              ].map(({ key, label }) => (
                <div className="field" key={key}>
                  <label>{label}</label>
                  {key === 'description'
                    ? <textarea
                        value={edit[key]}
                        onChange={e => setEdit(p => ({ ...p, [key]: e.target.value }))}
                      />
                    : <input
                        type={key === 'price' ? 'number' : 'text'}
                        value={edit[key]}
                        onChange={e => setEdit(p => ({ ...p, [key]: e.target.value }))}
                      />
                  }
                </div>
              ))}

              <div className="field">
                <label>Новое изображение (опционально)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEditImage(e.target.files[0] || null)}
                />
              </div>

              <div className="buttons" style={{ gridColumn:'1 / -1' }}>
                <button className="btn-primary" onClick={() => setShowConfirmUpdate(true)}>
                  Сохранить
                </button>
                <button className="btn-danger"  onClick={() => setShowConfirmDelete(true)}>
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- COURSES GRID ---------------- */}
        {courses.length > 0 && (
          <div className="block">
            <h2>Мои курсы</h2>
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
              <p>Создать курс?</p>
              <div className="modal-buttons">
                <button className="btn-primary"   onClick={handleCreate}>Да</button>
                <button className="btn-secondary" onClick={() => setShowConfirmCreate(false)}>Нет</button>
              </div>
            </div>
          </div>
        )}
        {/* update */}
        {showConfirmUpdate && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>Сохранить изменения?</p>
              <div className="modal-buttons">
                <button className="btn-primary"   onClick={handleUpdate}>Да</button>
                <button className="btn-secondary" onClick={() => setShowConfirmUpdate(false)}>Нет</button>
              </div>
            </div>
          </div>
        )}
        {/* delete */}
        {showConfirmDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>Удалить курс?</p>
              <div className="modal-buttons">
                <button className="btn-primary"   onClick={handleDelete}>Да</button>
                <button className="btn-secondary" onClick={() => setShowConfirmDelete(false)}>Нет</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
