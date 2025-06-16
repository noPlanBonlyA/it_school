// src/pages/ManageUserPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../services/userService';
import {
  createStudent,
  updateStudent,
  deleteStudent
} from '../services/studentService';
import {
  createTeacher,
  updateTeacher,
  deleteTeacher
} from '../services/teacherService';

import '../styles/ManageUserPage.css';

/* ---------- helpers ---------- */
const emailRe    = /^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/;
const phoneRe    = /^\+?\d{10,15}$/;
const userRe     = /^[A-Za-z0-9_]{3,}$/;
const passwordRe = /^.{6,}$/;

const validateCreate = f => {
  const e = {};
  if (!f.first_name)     e.first_name   = ['Введите имя'];
  if (!f.username)       e.username     = ['Введите username'];
  else if (!userRe.test(f.username))      e.username = ['Только буквы/цифры/_ и ≥3 символов'];
  if (!f.email)          e.email        = ['Введите email'];
  else if (!emailRe.test(f.email))        e.email    = ['Некорректный email'];
  if (!f.phone_number)   e.phone_number = ['Введите телефон'];
  else if (!phoneRe.test(f.phone_number)) e.phone_number = ['Некорректный телефон'];
  if (!f.password)       e.password     = ['Введите пароль'];
  else if (!passwordRe.test(f.password))  e.password = ['Минимум 6 символов'];
  return e;
};

export default function ManageUserPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ---------- state ---------- */
  const [users,        setUsers]        = useState([]);
  const [search,       setSearch]       = useState('');
  const [filtered,     setFiltered]     = useState([]);
  const [showSug,      setShowSug]      = useState(false);

  const [createForm,   setCreateForm]   = useState({
    first_name:'', surname:'', patronymic:'',
    email:'', username:'', phone_number:'', password:'',
    role:'student', points:0
  });
  const [createErrors, setCreateErrors] = useState({});

  const [editForm,     setEditForm]     = useState(null);
  const [updateErrors, setUpdateErrors] = useState({});

  /* ---------- effects ---------- */
  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    setFiltered(
      users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, users]);

  async function loadUsers() {
    try {
      setUsers(await getAllUsers());
    } catch (err) {
      console.error(err);
      alert('Не удалось загрузить пользователей');
    }
  }

  /* ---------- create ---------- */
  const handleCreate = async () => {
    const clientErr = validateCreate(createForm);
    setCreateErrors(clientErr);
    if (Object.keys(clientErr).length) return;

    try {
      const newUser = await createUser(createForm);
      if (createForm.role === 'student') {
        await createStudent({ user_id: newUser.id, points: createForm.points });
      }
      if (createForm.role === 'teacher') {
        await createTeacher({ user_id: newUser.id });
      }
      alert('Пользователь создан');
      setCreateForm({
        first_name:'', surname:'', patronymic:'',
        email:'', username:'', phone_number:'', password:'',
        role:'student', points:0
      });
      loadUsers();
    } catch (err) {
      const apiErr = err.response?.data;
      if (apiErr) {
        // формат из DRF: {"email":["already exists"]} или {"detail":"..."}
        if (apiErr.detail) {
          const low = apiErr.detail.toLowerCase();
          if (low.includes('email'))        setCreateErrors({ email: [apiErr.detail] });
          else if (low.includes('phone'))   setCreateErrors({ phone_number: [apiErr.detail] });
          else if (low.includes('username'))setCreateErrors({ username: [apiErr.detail] });
          else                              setCreateErrors({ _global: [apiErr.detail] });
        } else {
          setCreateErrors(apiErr);
        }
      } else {
        alert('Ошибка создания, см. консоль');
        console.error(err);
      }
    }
  };

  /* ---------- select ---------- */
  const handleSelect = u => {
    setEditForm({
      id:         u.id,
      first_name: u.first_name,
      surname:    u.surname,
      patronymic: u.patronymic,
      email:      u.email,
      username:   u.username,
      phone_number: u.phone_number,
      role:       u.role,
      points:     u.student?.points || 0,
      studentId:  u.student?.id  || null,
      teacherId:  u.teacher?.id  || null
    });
    setUpdateErrors({});
    setSearch('');
  };

  /* ---------- update ---------- */
  const handleUpdate = async () => {
    if (!editForm) return;
    setUpdateErrors({});
    try {
      await updateUser(editForm.id, editForm);
      if (editForm.role === 'student' && editForm.studentId) {
        await updateStudent(editForm.studentId, { points: editForm.points });
      }
      if (editForm.role === 'teacher' && editForm.teacherId) {
        await updateTeacher(editForm.teacherId, {});
      }
      alert('Сохранено');
      loadUsers();
    } catch (err) {
      const apiErr = err.response?.data;
      if (apiErr) setUpdateErrors(apiErr);
      else {
        alert('Ошибка обновления, см. консоль');
        console.error(err);
      }
    }
  };

  /* ---------- delete ---------- */
  const handleDelete = async () => {
    if (!editForm) return;
    try {
      if (editForm.studentId) await deleteStudent(editForm.studentId);
      if (editForm.teacherId) await deleteTeacher(editForm.teacherId);
      await deleteUser(editForm.id);
      alert('Удалено');
      setEditForm(null);
      loadUsers();
    } catch (err) {
      alert('Ошибка удаления');
      console.error(err);
    }
  };
  const fullName = [user.first_name, user.surname, user.patronymic].filter(Boolean).join(' ');

  /* ---------- JSX ---------- */
  return (
    <div className="manage-users app-layout">
      <Sidebar activeItem="manage" userRole={user.role} />
      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Управление пользователями</h1>

        {/* ===== Создание ===== */}
        <div className="block">
          <h2>Создать пользователя</h2>
          {createErrors._global && (
            <div className="error-text" style={{ gridColumn: '1 / -1' }}>
              {createErrors._global[0]}
            </div>
          )}

          <div className="user-form form-grid">
            {[
              'first_name','surname','patronymic',
              'email','username','phone_number','password'
            ].map(f => (
              <div className="field" key={f}>
                <label>{f.replace('_', ' ')}</label>
                <input
                  type={f === 'password' ? 'password' : 'text'}
                  value={createForm[f]}
                  onChange={e =>
                    setCreateForm(s => ({ ...s, [f]: e.target.value }))
                  }
                />
                {createErrors[f] && (
                  <div className="error-text">{createErrors[f][0]}</div>
                )}
              </div>
            ))}

            <div className="field">
              <label>Роль</label>
              <select
                value={createForm.role}
                onChange={e =>
                  setCreateForm(s => ({ ...s, role: e.target.value }))
                }
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            {createForm.role === 'student' && (
              <div className="field">
                <label>Очки</label>
                <input
                  type="number"
                  value={createForm.points}
                  onChange={e =>
                    setCreateForm(s => ({ ...s, points: +e.target.value }))
                  }
                />
              </div>
            )}

            <div className="buttons" style={{ gridColumn: '1 / -1' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreate}
              >
                Создать
              </button>
            </div>
          </div>
        </div>

        {/* ===== Поиск / редактирование ===== */}
        <div className="block">
          <h2>Найти / Изменить / Удалить</h2>

          <div className="search-block">
            <input
              placeholder="Поиск по username"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 200)}
            />
            {showSug && filtered.length > 0 && (
              <ul className="suggestions">
                {filtered.map(u => (
                  <li key={u.id} onClick={() => handleSelect(u)}>
                    {u.username} ({u.role})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {editForm && (
            <div className="user-form form-grid">
              {[
                'first_name','surname','patronymic',
                'email','username','phone_number'
              ].map(f => (
                <div className="field" key={f}>
                  <label>{f.replace('_', ' ')}</label>
                  <input
                    value={editForm[f]}
                    onChange={e =>
                      setEditForm(s => ({ ...s, [f]: e.target.value }))
                    }
                  />
                  {updateErrors[f] && (
                    <div className="error-text">{updateErrors[f][0]}</div>
                  )}
                </div>
              ))}

              <div className="field">
                <label>Роль</label>
                <select
                  value={editForm.role}
                  onChange={e =>
                    setEditForm(s => ({ ...s, role: e.target.value }))
                  }
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {editForm.role === 'student' && (
                <div className="field">
                  <label>Очки</label>
                  <input
                    type="number"
                    value={editForm.points}
                    onChange={e =>
                      setEditForm(s => ({ ...s, points: +e.target.value }))
                    }
                  />
                </div>
              )}

              <div className="buttons" style={{ gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleUpdate}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                >
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
