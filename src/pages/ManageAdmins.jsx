import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';
import Sidebar                        from '../components/Sidebar';
import SmartTopBar                    from '../components/SmartTopBar';
import SuccessNotification from '../components/SuccessNotification';
import { useAuth }                    from '../contexts/AuthContext';

import {
  getAllUsers,
  createUser,
  createAdminWithUser,
  updateUser,
  deleteUser
} from '../services/userService';

import '../styles/ManageUserPage.css';
import '../styles/MobileFixes.css';
import '../styles/MobileKeyboardFix.css';

import { useMobileKeyboard } from '../hooks/useMobileKeyboard';

export default function ManageAdminsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Хук для обработки мобильной клавиатуры
  useMobileKeyboard();

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
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  /* ---------- форматирование телефона ---------- */
  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.startsWith('7')) {
      const formatted = digits.slice(0, 11);
      if (formatted.length <= 1) return '+7';
      if (formatted.length <= 4) return `+7 (${formatted.slice(1)}`;
      if (formatted.length <= 7) return `+7 (${formatted.slice(1, 4)}) ${formatted.slice(4)}`;
      if (formatted.length <= 9) return `+7 (${formatted.slice(1, 4)}) ${formatted.slice(4, 7)}-${formatted.slice(7)}`;
      return `+7 (${formatted.slice(1, 4)}) ${formatted.slice(4, 7)}-${formatted.slice(7, 9)}-${formatted.slice(9, 11)}`;
    }
    
    if (digits.startsWith('8')) {
      const withSeven = '7' + digits.slice(1);
      return formatPhoneNumber(withSeven);
    }
    
    if (digits.length === 0) {
      return '+7';
    }
    
    const withSeven = '7' + digits;
    return formatPhoneNumber(withSeven);
  };

  const handlePhoneChange = (e, isEdit = false) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (isEdit) {
      setEdit(s => ({ ...s, phone_number: formatted }));
    } else {
      setForm(s => ({ ...s, phone_number: formatted }));
    }
  };

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
      // Очищаем номер телефона от форматирования для отправки на бэкенд
      const cleanPhoneNumber = form.phone_number.replace(/\D/g, '');
      const formattedPhoneForBackend = cleanPhoneNumber.startsWith('7') 
        ? `+${cleanPhoneNumber}` 
        : `+7${cleanPhoneNumber}`;

      // Используем новый метод создания администратора с form-data
      const result = await createAdminWithUser({
        first_name: form.first_name,
        surname: form.surname,
        patronymic: form.patronymic,
        birth_date: form.birth_date || '',  // Отправляем пустую строку вместо null
        email: form.email,
        phone_number: formattedPhoneForBackend,  // Отправляем очищенный номер
        password: form.password,
        role: 'admin'
      });
      
      setShowSuccessNotification(true);
      setAdmins(prev=>[...prev, result.user]);
      setForm({ first_name:'',surname:'',patronymic:'',birth_date:'',
                email:'',phone_number:'',password:'' });
    }catch(e){
      console.error('Create admin error:', e);
      if(e.response?.data?.username)setErrors({username:e.response.data.username});
      else alert('Ошибка создания: ' + (e.response?.data?.detail || e.message));
    }finally{
      setCreating(false); setShowCreateConfirm(false);
    }
  };

  /* ---------- выбор / save / delete ---------- */
  const handleSelect=u=>{setEdit({...u,birth_date:u.birth_date||''}); setSearch(''); setShowSug(false);};

  /* ───────── СОХРАНЕНИЕ ───────── */
  const save = async () => {
    if (!edit) return;
    setErrors({});
    try {
      // Очищаем номер телефона от форматирования для отправки на бэкенд
      const cleanPhoneNumber = (edit.phone_number || '').replace(/\D/g, '');
      const formattedPhoneForBackend = cleanPhoneNumber.startsWith('7') 
        ? `+${cleanPhoneNumber}` 
        : `+7${cleanPhoneNumber}`;

      // Убираем username из запроса
      await updateUser(edit.id, {
        first_name: edit.first_name,
        surname: edit.surname,
        patronymic: edit.patronymic,
        birth_date: edit.birth_date || '',  // Отправляем пустую строку вместо null
        email: edit.email,
        phone_number: formattedPhoneForBackend,  // Отправляем очищенный номер
        role: edit.role || 'admin'
        // username НЕ передаем
      });
      alert('Сохранено');
      load();
      setEdit(null);
    } catch (e) {
      console.error('Error saving admin:', e);
      alert('Ошибка сохранения: ' + (e.response?.data?.detail || e.message));
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
        <SmartTopBar pageTitle="Управление администраторами" />

        {/* Убираем дублирующий заголовок, так как он теперь в TopBar */}

        {/* СОЗДАТЬ */}
        <div className="block">
          <h2>Создать администратора</h2>
          <div className="user-form form-grid">
            {[
              {key: 'first_name', label: 'Имя'},
              {key: 'surname', label: 'Фамилия'},
              {key: 'patronymic', label: 'Отчество'},
              {key: 'birth_date', label: 'Дата рождения'},
              {key: 'email', label: 'Email'},
              {key: 'password', label: 'Пароль'}
            ].map(({key, label})=>(
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  type={key==='password'?'password':key==='birth_date'?'date':'text'}
                  value={form[key]}
                  onChange={e=>setForm(s=>({...s,[key]:e.target.value}))}/>
              </div>
            ))}
            {/* Отдельно обрабатываем phone_number */}
            <div className="field">
              <label>Номер телефона</label>
              <input
                type="tel"
                placeholder="+7 (999) 999-99-99"
                value={form.phone_number}
                onChange={(e) => handlePhoneChange(e, false)}
                onFocus={!form.phone_number ? (e) => setForm(s => ({ ...s, phone_number: '+7' })) : undefined}
              />
            </div>
            <div className="buttons" style={{gridColumn:'1 / -1'}}>
              <button 
                className="btn-primary" 
                onClick={()=>setShowCreateConfirm(true)}
                disabled={!form.first_name.trim() || !form.surname.trim() || !form.password.trim()}
                style={{
                  opacity: (!form.first_name.trim() || !form.surname.trim() || !form.password.trim()) ? 0.5 : 1,
                  cursor: (!form.first_name.trim() || !form.surname.trim() || !form.password.trim()) ? 'not-allowed' : 'pointer',
                  backgroundColor: (!form.first_name.trim() || !form.surname.trim() || !form.password.trim()) ? '#9ca3af' : ''
                }}
              >
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
                     onFocus={()=>setShowSug(true)}/>
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
              {[
                {key: 'first_name', label: 'Имя'},
                {key: 'surname', label: 'Фамилия'},
                {key: 'patronymic', label: 'Отчество'},
                {key: 'birth_date', label: 'Дата рождения'},
                {key: 'email', label: 'Email'}
              ].map(({key, label})=>(
                <div className="field" key={key}>
                  <label>{label}</label>
                  <input type={key==='birth_date'?'date':'text'}
                         value={edit[key]||''}
                         onChange={e=>setEdit(s=>({...s,[key]:e.target.value}))}
                         disabled={key === 'username'}  // Делаем поле только для чтения
                         style={key === 'username' ? {backgroundColor:'#f5f5f5'} : {}}/>
                </div>
              ))}
              {/* Отдельно обрабатываем phone_number */}
              <div className="field">
                <label>Номер телефона</label>
                <input
                  type="tel"
                  placeholder="+7 (999) 999-99-99"
                  value={edit.phone_number || ''}
                  onChange={(e) => handlePhoneChange(e, true)}
                  onFocus={!edit.phone_number ? (e) => setEdit(s => ({ ...s, phone_number: '+7' })) : undefined}
                />
              </div>
              {/* Показываем username только для отображения */}
              <div className="field">
                <label>Логин (только чтение)</label>
                <input type="text" value={edit.username||'(генерируется автоматически)'} 
                       disabled style={{backgroundColor:'#f5f5f5'}}/>
              </div>
              <div className="buttons" style={{gridColumn:'1 / -1'}}>
                <button className="btn-primary" onClick={save}>Сохранить</button>
                <button className="btn-primary" style={{ backgroundColor: 'red' }} onClick={()=>setShowDeleteConfirm(true)}>Удалить</button>
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
        
        {/* УВЕДОМЛЕНИЕ ОБ УСПЕШНОМ СОЗДАНИИ */}
        <SuccessNotification
          isOpen={showSuccessNotification}
          onClose={() => setShowSuccessNotification(false)}
          title="Администратор создан!"
          message="Новый администратор успешно добавлен в систему"
        />
      </div>
    </div>
  );
}
