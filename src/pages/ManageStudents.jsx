// src/pages/ManageStudentsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';
import Sidebar                        from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import StudentDetailView from '../components/StudentDetailView';
import SuccessNotification from '../components/SuccessNotification';
import { useAuth }                    from '../contexts/AuthContext';

import {
  getAllUsers,
  updateUser,
  deleteUser
} from '../services/userService';

import {
  createStudent,            // ← добавили
  listStudents,              // ← добавили
  updateStudent,
  deleteStudent
} from '../services/studentService';

import '../styles/ManageUserPage.css';
import '../styles/MobileFixes.css';
import '../styles/MobileKeyboardFix.css';

import { useMobileKeyboard } from '../hooks/useMobileKeyboard';

export default function ManageStudentsPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  // Хук для обработки мобильной клавиатуры
  useMobileKeyboard();

  /* ---------- state ---------- */
  const [students, setStudents] = useState([]); // [{ user:{...}, student:{...} }]
  const [search,   setSearch]   = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSug,  setShowSug]  = useState(false);

  const [form, setForm] = useState({
    first_name:'', surname:'', patronymic:'',
    birth_date:'', email:'',  phone_number:'',
    password:'',   points:''
  });
  const [errors, setErrors] = useState({}); // eslint-disable-line no-unused-vars
  const [edit  , setEdit  ] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [busyCreate, setBusyCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  /* ---------- форматирование телефона ---------- */
  const formatPhoneNumber = (value) => {
    // Убираем все символы кроме цифр
    const digits = value.replace(/\D/g, '');
    
    // Если начинается с 7, добавляем +
    if (digits.startsWith('7')) {
      const formatted = digits.slice(0, 11);
      if (formatted.length <= 1) return '+7';
      if (formatted.length <= 4) return `+7 (${formatted.slice(1)}`;
      if (formatted.length <= 7) return `+7 (${formatted.slice(1, 4)}) ${formatted.slice(4)}`;
      if (formatted.length <= 9) return `+7 (${formatted.slice(1, 4)}) ${formatted.slice(4, 7)}-${formatted.slice(7)}`;
      return `+7 (${formatted.slice(1, 4)}) ${formatted.slice(4, 7)}-${formatted.slice(7, 9)}-${formatted.slice(9, 11)}`;
    }
    
    // Если начинается с 8, заменяем на +7
    if (digits.startsWith('8')) {
      const withSeven = '7' + digits.slice(1);
      return formatPhoneNumber(withSeven);
    }
    
    // Если пустое поле, возвращаем +7
    if (digits.length === 0) {
      return '+7';
    }
    
    // Если не начинается с 7 или 8, добавляем +7 в начало
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

  /* ---------- загрузка ---------- */
  useEffect(()=>{ load(); },[]);
  async function load() {
    /* 1. тянем student-профили постранично */
    const stuArr=[];
    for (let off=0;; off+=100) {
      const page=await listStudents(100,off);
      stuArr.push(...(page.objects||[]));
      if ((page.objects||[]).length<100) break;
    }
    /* 2. получаем связанные user-объекты одним запросом */
    const userIds=[...new Set(stuArr.map(s=>s.user_id))];
    const users  =[];
    for (let off=0; off<userIds.length; off+=100) {
      const chunk=userIds.slice(off,off+100);
      const page =await getAllUsers({ limit:100, offset:0, user_ids:chunk.join(',') });
      users.push(...page);
    }
    /* 3. склеиваем */
    const mapUser=new Map(users.map(u=>[u.id,u]));
    const merged  =stuArr.map(st=>({ student:st, user:mapUser.get(st.user_id) || {} }));
    setStudents(merged);
  }

  /* ---------- live-фильтр ---------- */
  useEffect(()=>{
    const q=search.toLowerCase();
    setFiltered(
      students.filter(o=>{
        const u=o.user;
        const login=(u.username||'').toLowerCase();
        const fio  =[u.first_name,u.surname,u.patronymic].filter(Boolean).join(' ').toLowerCase();
        return login.includes(q)||fio.includes(q);
      })
    );
  },[search,students]);

  /* ---------- СОЗДАНИЕ ---------- */
  const handleCreate=async()=>{
    if(busyCreate) return;
    setBusyCreate(true); setErrors({});
    try{
      // Очищаем номер телефона от форматирования для отправки на бэкенд
      const cleanPhoneNumber = form.phone_number.replace(/\D/g, '');
      const formattedPhoneForBackend = cleanPhoneNumber.startsWith('7') 
        ? `+${cleanPhoneNumber}` 
        : `+7${cleanPhoneNumber}`;

      // Используем новый метод создания студента с form-data
      const result = await createStudent({
        first_name: form.first_name,
        surname: form.surname,
        patronymic: form.patronymic,
        birth_date: form.birth_date || '',  // Отправляем пустую строку вместо null
        email: form.email,
        phone_number: formattedPhoneForBackend,  // Отправляем очищенный номер
        password: form.password,
        points: form.points === '' ? 0 : +form.points
      });
      
      setShowSuccessNotification(true);

      setStudents(prev=>[...prev,{ user: result.user, student: result.student }]);
      setForm({ first_name:'',surname:'',patronymic:'',birth_date:'',
                email:'',phone_number:'',password:'',points:'' });
    }catch(e){
      console.error('Create student error:', e);
      if(e.response?.data?.username) setErrors({ username:e.response.data.username });
      else alert('Ошибка создания: ' + (e.response?.data?.detail || e.message));
    }finally{
      setBusyCreate(false); setShowCreate(false);
    }
  };

  /* ---------- выбор ---------- */
  const select = o => {
    setEdit({
      ...o.user,           // содержит user.id, username и другие поля пользователя
      studentId: o.student.id,  // ID студенческого профиля
      points: o.student.points
    });
    setSearch('');
    setShowSug(false); // закрываем список после выбора
  };

  /* ---------- просмотр деталей ---------- */
  const viewDetails = (student) => {
    console.log('viewDetails called with:', student);
    setSelectedStudent(student);
    setShowDetail(true);
    setShowSug(false); // закрываем список после просмотра деталей
  };

  /* ---------- СОХРАНЕНИЕ ---------- */
  const save=async()=>{
    if(!edit) return;
    setErrors({});
    try{
      // Очищаем номер телефона от форматирования для отправки на бэкенд
      const cleanPhoneNumber = (edit.phone_number || '').replace(/\D/g, '');
      const formattedPhoneForBackend = cleanPhoneNumber.startsWith('7') 
        ? `+${cleanPhoneNumber}` 
        : `+7${cleanPhoneNumber}`;

      // 1. Обновляем пользователя
      await updateUser(edit.id, {
        first_name: edit.first_name, 
        surname: edit.surname, 
        patronymic: edit.patronymic,
        birth_date: edit.birth_date || '', 
        email: edit.email, 
        phone_number: formattedPhoneForBackend,  // Отправляем очищенный номер
        role: 'student'
      });
      
      // 2. Обновляем студенческий профиль с полными данными
      await updateStudent(edit.studentId, { 
        user_id: edit.id,        // ID пользователя
        points: edit.points === '' ? 0 : +edit.points,     // Очки
        id: edit.studentId       // ID студенческого профиля
      });
      
      alert('Сохранено');
      load(); 
      setEdit(null);
    }catch(e){
      console.error('Error saving student:', e);
      console.error('Edit object:', edit);
      
      // Более детальная обработка ошибок
      if (e.response?.status === 422) {
        console.error('Validation error details:', e.response.data);
        alert('Ошибка валидации данных: ' + (e.response?.data?.detail || 'Проверьте консоль для деталей.'));
      } else {
        alert('Ошибка сохранения: ' + (e.response?.data?.detail || e.message));
      }
    }
  };

  /* ---------- УДАЛЕНИЕ ---------- */
  const reallyDelete=async()=>{
    if(!edit) return;
    try{
      await deleteStudent(edit.studentId);
      await deleteUser(edit.id);
      alert('Удалено');
      load(); setEdit(null);
    }catch{ alert('Не удалось удалить'); }
    setShowDelete(false);
  };

  /* ---------- рендер ---------- */
  const fullName=[user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  return (
    <div className="manage-users app-layout">
      <Sidebar activeItem="manage-students" userRole={user.role}/>
      <div className="main-content">
        <SmartTopBar pageTitle="Управление студентами" />

        {/* ---------- создать ---------- */}
        <div className="block">
          <h2>Создать студента</h2>
          <div className="user-form form-grid">
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
                       value={form[key]} onChange={e=>setForm(s=>({...s,[key]:e.target.value}))}/>
              </div>
            ))}
            <div className="field">
              <label>Номер телефона</label>
              <input type="tel"
                     value={form.phone_number}
                     placeholder="+7 (___) ___-__-__"
                     onChange={handlePhoneChange}
                     onFocus={e => {
                       if (!e.target.value) {
                         setForm(s => ({ ...s, phone_number: '+7' }));
                       }
                     }}/>
            </div>
            <div className="field">
              <label>Пароль</label>
              <input type="password"
                     value={form.password} onChange={e=>setForm(s=>({...s,password:e.target.value}))}/>
            </div>
            <div className="field">
              <label>Очки</label>
              <input type="number" 
                     value={form.points}
                     placeholder="0"
                     onChange={e=>setForm(s=>({...s,points:e.target.value}))}/>
            </div>
            <div className="buttons" style={{gridColumn:'1 / -1'}}>
              <button 
                className="btn-primary" 
                onClick={()=>setShowCreate(true)}
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

        {/* ---------- поиск / редактирование ---------- */}
        <div className="block">
          <h2>Найти / Изменить / Удалить</h2>
          <div className="search-block">
            <div style={{position:'relative'}}>
              <input placeholder="Поиск по логину или ФИО"
                     value={search} onChange={e=>setSearch(e.target.value)}
                     onFocus={()=>setShowSug(true)}/>
              {showSug && filtered.length>0 && (
                <ul className="suggestions">
                  {filtered.map(o=>{
                    const u=o.user;
                    const fio=[u.first_name,u.surname,u.patronymic].filter(Boolean).join(' ');
                    return (
                      <li key={u.id} className="suggestion-item" onClick={()=>select(o)}>
                        <div className="suggestion-info">
                          {u.username||'(без логина)'} — {fio||'(ФИО не заполнено)'}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {edit && (
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
                         onChange={e=>setEdit(s=>({...s,[key]:e.target.value}))}/>
                </div>
              ))}
              <div className="field">
                <label>Номер телефона</label>
                <input type="tel"
                       value={edit.phone_number||''}
                       placeholder="+7 (___) ___-__-__"
                       onChange={e => handlePhoneChange(e, true)}
                       onFocus={e => {
                         if (!e.target.value) {
                           setEdit(s => ({ ...s, phone_number: '+7' }));
                         }
                       }}/>
              </div>
              {/* Показываем username только для отображения */}
              <div className="field">
                <label>Логин (только чтение)</label>
                <input type="text" value={edit.username||'(генерируется автоматически)'} 
                       disabled style={{backgroundColor:'#f5f5f5'}}/>
              </div>
              <div className="field">
                <label>Очки</label>
                <input type="number" 
                       value={edit.points}
                       placeholder="0"
                       onChange={e=>setEdit(s=>({...s,points:e.target.value}))}/>
              </div>
              <div className="buttons" style={{gridColumn:'1 / -1'}}>
                <button className="btn-primary" onClick={save}>Сохранить</button>
                <button className="btn-primary" onClick={() => viewDetails({user: edit, student: {id: edit.studentId, points: edit.points}})}>
                  Подробная информация
                </button>
                <button className="btn-primary" style={{ backgroundColor: 'red' }}  onClick={()=>setShowDelete(true)}>Удалить</button>
              </div>
            </div>
          )}
        </div>

        {/* ---------- модалки ---------- */}
        {showCreate && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>Создать студента?</p>
              <div className="modal-buttons">
                <button className="btn-primary" disabled={busyCreate}
                        onClick={handleCreate}>{busyCreate?'Создание…':'Да'}</button>
                <button className="btn-secondary" disabled={busyCreate}
                        onClick={()=>setShowCreate(false)}>Нет</button>
              </div>
            </div>
          </div>
        )}
        {showDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>Удалить студента?</p>
              <div className="modal-buttons">
                <button className="btn-danger" onClick={reallyDelete}>Да</button>
                <button className="btn-secondary" onClick={()=>setShowDelete(false)}>Нет</button>
              </div>
            </div>
          </div>
        )}
        
        {/* ---------- детальный просмотр студента ---------- */}
        {showDetail && selectedStudent && (
          <StudentDetailView 
            student={selectedStudent} 
            onClose={() => {
              setShowDetail(false);
              setSelectedStudent(null);
            }} 
          />
        )}
        
        {/* ---------- уведомление об успешном создании ---------- */}
        <SuccessNotification
          isOpen={showSuccessNotification}
          onClose={() => setShowSuccessNotification(false)}
          title="Студент создан!"
          message="Новый студент успешно добавлен в систему"
        />
      </div>
    </div>
  );
}