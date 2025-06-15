// src/pages/ManageStudentsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }                from 'react-router-dom';
import Sidebar                        from '../components/Sidebar';
import Topbar                         from '../components/TopBar';
import { useAuth }                    from '../contexts/AuthContext';

import {
  getAllUsers,
  createUser,
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

export default function ManageStudentsPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  /* ---------- state ---------- */
  const [students, setStudents] = useState([]); // [{ user:{...}, student:{...} }]
  const [search,   setSearch]   = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSug,  setShowSug]  = useState(false);

  const [form, setForm] = useState({
    first_name:'', surname:'', patronymic:'',
    birth_date:'', email:'',  phone_number:'',
    password:'',   points:0
  });
  const [errors, setErrors] = useState({});
  const [edit  , setEdit  ] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [busyCreate, setBusyCreate] = useState(false);

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
      // 1) создаём пользователя
      const newU=await createUser({
        first_name:form.first_name, surname:form.surname, patronymic:form.patronymic,
        birth_date:form.birth_date||null, email:form.email, phone_number:form.phone_number,
        password  :form.password, role:'student'
      });
      // 2) сразу создаём student-профиль
      const newS=await createStudent({ user_id:newU.id, points:+form.points });
      alert('Студент создан');

      setStudents(prev=>[...prev,{ user:newU, student:newS }]);
      setForm({ first_name:'',surname:'',patronymic:'',birth_date:'',
                email:'',phone_number:'',password:'',points:0 });
    }catch(e){
      if(e.response?.data?.username) setErrors({ username:e.response.data.username });
      else alert('Ошибка создания');
    }finally{
      setBusyCreate(false); setShowCreate(false);
    }
  };

  /* ---------- выбор ---------- */
  const select=o=>{
    setEdit({
      ...o.user,
      studentId : o.student.id,
      points    : o.student.points
    });
    setSearch('');
  };

  /* ---------- СОХРАНЕНИЕ ---------- */
  const save=async()=>{
    if(!edit) return;
    setErrors({});
    try{
      await updateUser(edit.id,{
        first_name:edit.first_name, surname:edit.surname, patronymic:edit.patronymic,
        birth_date:edit.birth_date||null, email:edit.email, phone_number:edit.phone_number,
        role:'student'
      });
      await updateStudent(edit.studentId,{ points:edit.points });
      alert('Сохранено');
      load(); setEdit(null);
    }catch(e){
      if(e.response?.data?.username) setErrors({ username:e.response.data.username });
      else alert('Ошибка сохранения');
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
        <Topbar userName={fullName} userRole={user.role}
                notifications={0} onBellClick={()=>{}}
                onProfileClick={()=>navigate('/profile')}/>

        <h1>Управление студентами</h1>

        {/* ---------- создать ---------- */}
        <div className="block">
          <h2>Создать студента</h2>
          <div className="user-form form-grid">
            {['first_name','surname','patronymic','birth_date',
              'email','phone_number','password'].map(f=>(
              <div className="field" key={f}>
                <label>{f.replace('_',' ')}</label>
                <input type={f==='password'?'password':f==='birth_date'?'date':'text'}
                       value={form[f]} onChange={e=>setForm(s=>({...s,[f]:e.target.value}))}/>
              </div>
            ))}
            <div className="field">
              <label>Очки</label>
              <input type="number" value={form.points}
                     onChange={e=>setForm(s=>({...s,points:+e.target.value}))}/>
            </div>
            <div className="buttons" style={{gridColumn:'1 / -1'}}>
              <button className="btn-primary" onClick={()=>setShowCreate(true)}>Создать</button>
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
                     onFocus={()=>setShowSug(true)}
                     onBlur={()=>setTimeout(()=>setShowSug(false),200)}/>
              {showSug && filtered.length>0 && (
                <ul className="suggestions">
                  {filtered.map(o=>{
                    const u=o.user;
                    const fio=[u.first_name,u.surname,u.patronymic].filter(Boolean).join(' ');
                    return (
                      <li key={u.id} onClick={()=>select(o)}>
                        {u.username||'(без логина)'} — {fio||'(ФИО не заполнено)'}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {edit && (
            <div className="user-form form-grid" style={{marginTop:20}}>
              {['first_name','surname','patronymic','birth_date',
                'email','username','phone_number'].map(f=>(
                <div className="field" key={f}>
                  <label>{f.replace('_',' ')}</label>
                  <input type={f==='birth_date'?'date':'text'}
                         value={edit[f]||''}
                         onChange={e=>setEdit(s=>({...s,[f]:e.target.value}))}/>
                  {f==='username' && errors.username && (
                    <div className="error-text">{errors.username[0]}</div>
                  )}
                </div>
              ))}
              <div className="field">
                <label>Очки</label>
                <input type="number" value={edit.points}
                       onChange={e=>setEdit(s=>({...s,points:+e.target.value}))}/>
              </div>
              <div className="buttons" style={{gridColumn:'1 / -1'}}>
                <button className="btn-primary" onClick={save}>Сохранить</button>
                <button className="btn-danger"  onClick={()=>setShowDelete(true)}>Удалить</button>
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
      </div>
    </div>
  );
}
