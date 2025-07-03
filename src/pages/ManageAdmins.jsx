import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';
import Sidebar                        from '../components/Sidebar';
import Topbar                         from '../components/TopBar';
import { useAuth }                    from '../contexts/AuthContext';

import {
  getAllUsers,
  createUser,
  createAdminWithUser,
  updateUser,
  deleteUser
} from '../services/userService';

import '../styles/ManageUserPage.css';

export default function ManageAdminsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [admins, setAdmins]  = useState([]);
  const [search, setSearch]  = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSug, setShowSug]   = useState(false);

  const [form, setForm] = useState({
    first_name:'', surname:'', patronymic:'', birth_date:'',
    email:'', phone_number:'', password:''
  });
  const [errors, setErrors]     = useState({});
  const [edit,   setEdit]       = useState(null);

  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [creating, setCreating] = useState(false);

  /* ---------- load ---------- */
  useEffect(()=>{load();},[]);
  async function load() {
    const limit = 100;
    const users = [];
  
    for (let offset = 0; ; offset += limit) {
      const page = await getAllUsers({ limit, offset });
      users.push(...page);
      if (page.length < limit) break;
    }
  
    setAdmins(users.filter(u => u.role === 'admin'));
  }

  /* ---------- filter ---------- */
  useEffect(()=>{const q=search.toLowerCase();setFiltered(
    admins.filter(u=>{
      const login=(u.username||'').toLowerCase();
      const fio=[u.first_name,u.surname,u.patronymic].filter(Boolean).join(' ').toLowerCase();
      return login.includes(q)||fio.includes(q);
    })
  );},[search,admins]);

  /* ---------- create ---------- */
  const handleCreate = async () => {
    if (creating) return;
    setCreating(true); setErrors({});
    try{
      // Используем новый метод создания администратора с form-data
      const result = await createAdminWithUser({
        first_name: form.first_name,
        surname: form.surname,
        patronymic: form.patronymic,
        birth_date: form.birth_date || null,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        role: 'admin'
      });
      
      alert('Администратор создан');
      setAdmins(prev=>[...prev, result.user]);
      setForm({ first_name:'',surname:'',patronymic:'',birth_date:'',
                email:'',phone_number:'',password:'' });
    }catch(e){
      if(e.response?.data?.username)setErrors({username:e.response.data.username});
      else alert('Ошибка создания');
    }finally{
      setCreating(false); setShowCreateConfirm(false);
    }
  };

  /* ---------- выбор / save / delete ---------- */
  const handleSelect=u=>{setEdit({...u,birth_date:u.birth_date||''}); setSearch('');};

  /* ───────── СОХРАНЕНИЕ ───────── */
  const save = async () => {
    if (!edit) return;
    setErrors({});
    try {
      // Убираем username из запроса
      await updateUser(edit.id, {
        first_name: edit.first_name,
        surname: edit.surname,
        patronymic: edit.patronymic,
        birth_date: edit.birth_date || null,
        email: edit.email,
        phone_number: edit.phone_number,
        role: edit.role || 'admin'
        // username НЕ передаем
      });
      alert('Сохранено');
      load();
      setEdit(null);
    } catch (e) {
      console.error('Error saving admin:', e);
      alert('Ошибка сохранения');
    }
  };

  const reallyDelete=async()=>{
    if(!edit)return;
    try{await deleteUser(edit.id);alert('Удалено');load();setEdit(null);}
    catch{alert('Не удалось удалить');}
    setShowDeleteConfirm(false);
  };

  const fullName=[user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  return(
    <div className="manage-users app-layout">
      <Sidebar activeItem="manage-admins" userRole={user.role}/>
      <div className="main-content">
        <Topbar
          userName={fullName}
          userRole={user.role}
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />

        <h1>Управление администраторами</h1>

        {/* СОЗДАТЬ */}
        <div className="block">
          <h2>Создать администратора</h2>
          <div className="user-form form-grid">
            {['first_name','surname','patronymic','birth_date',
              'email','phone_number','password'].map(f=>(
              <div className="field" key={f}>
                <label>{f.replace('_',' ')}</label>
                <input
                  type={f==='password'?'password':f==='birth_date'?'date':'text'}
                  value={form[f]}
                  onChange={e=>setForm(s=>({...s,[f]:e.target.value}))}/>
              </div>
            ))}
            <div className="buttons" style={{gridColumn:'1 / -1'}}>
              <button className="btn-primary" onClick={()=>setShowCreateConfirm(true)}>
                Создать
              </button>
            </div>
          </div>
        </div>

        {/* ПОИСК / РЕД / УДАЛ */}
        <div className="block">
          <h2>Найти / Изменить / Удалить</h2>
          <div className="search-block">
            <div style={{position:'relative'}}>
              <input placeholder="Поиск по логину или ФИО"
                     value={search}
                     onChange={e=>setSearch(e.target.value)}
                     onFocus={()=>setShowSug(true)}
                     onBlur={()=>setTimeout(()=>setShowSug(false),200)}/>
              {showSug&&filtered.length>0&&(
                <ul className="suggestions">
                  {filtered.map(u=>{
                    const fio=[u.first_name,u.surname,u.patronymic].filter(Boolean).join(' ');
                    return(<li key={u.id} onClick={()=>handleSelect(u)}>
                      {u.username||'(без логина)'} — {fio||'(ФИО не заполнено)'}
                    </li>);
                  })}
                </ul>
              )}
            </div>
          </div>

          {edit&&(
            <div className="user-form form-grid" style={{marginTop:20}}>
              {['first_name','surname','patronymic','birth_date',
                'email','phone_number'].map(f=>(  // Убираем 'username' из редактируемых полей
                <div className="field" key={f}>
                  <label>{f.replace('_',' ')}</label>
                  <input type={f==='birth_date'?'date':'text'}
                         value={edit[f]||''}
                         onChange={e=>setEdit(s=>({...s,[f]:e.target.value}))}
                         disabled={f === 'username'}  // Делаем поле только для чтения
                         style={f === 'username' ? {backgroundColor:'#f5f5f5'} : {}}/>
                </div>
              ))}
              {/* Показываем username только для отображения */}
              <div className="field">
                <label>Логин (только чтение)</label>
                <input type="text" value={edit.username||'(генерируется автоматически)'} 
                       disabled style={{backgroundColor:'#f5f5f5'}}/>
              </div>
              <div className="buttons" style={{gridColumn:'1 / -1'}}>
                <button className="btn-primary" onClick={save}>Сохранить</button>
                <button className="btn-danger"  onClick={()=>setShowDeleteConfirm(true)}>Удалить</button>
              </div>
            </div>
          )}
        </div>

        {/* МОДАЛКИ */}
        {showCreateConfirm&&(
          <div className="modal-overlay">
            <div className="modal-content">
              <p>Создать администратора?</p>
              <div className="modal-buttons">
                <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                  {creating?'Создание…':'Да'}
                </button>
                <button className="btn-secondary" onClick={()=>setShowCreateConfirm(false)} disabled={creating}>
                  Нет
                </button>
              </div>
            </div>
          </div>
        )}
        {showDeleteConfirm&&(
          <div className="modal-overlay">
            <div className="modal-content">
              <p>Удалить администратора?</p>
              <div className="modal-buttons">
                <button className="btn-danger" onClick={reallyDelete}>Да</button>
                <button className="btn-secondary" onClick={()=>setShowDeleteConfirm(false)}>Нет</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
