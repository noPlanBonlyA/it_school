// src/pages/ManageTeachersPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import { useAuth } from '../contexts/AuthContext';

import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../services/userService';

import {
  listTeachers,
  createTeacher,
  createTeacherWithUser,
  updateTeacher,
  deleteTeacher
} from '../services/teacherService';

import '../styles/ManageUserPage.css';

/* helper → teacher + user */
const merge = (profile, map) => ({ teacher: profile, user: map.get(profile.user_id) || {} });

export default function ManageTeachersPage() {
  const { user } = useAuth();
  const nav      = useNavigate();

  const [teachers, setTeachers] = useState([]);
  const [search,   setSearch]   = useState('');
  const [list,     setList]     = useState([]);
  const [showSug,  setShowSug]  = useState(false);

  const [form, setForm] = useState({
    first_name:'',surname:'',patronymic:'',birth_date:'',
    email:'',phone_number:'',password:''
  });
  const [errors, setErrors] = useState({});
  const [edit,   setEdit]   = useState(null);

  const [busyCreate, setBusyCreate] = useState(false);
  const [modCreate , setModCreate ] = useState(false);
  const [modDelete , setModDelete ] = useState(false);

  /* ───────── load ───────── */
  async function load() {
    /* 1. teacher-профили */
    const profs=[];
    for(let off=0;;off+=100){
      const page=await listTeachers(100,off);
      profs.push(...(page.objects||[]));
      if((page.objects||[]).length<100)break;
    }
    /* 2. users */
    const ids=[...new Set(profs.map(p=>p.user_id))];
    const users=[];
    for(let off=0;off<ids.length;off+=100){
      const chunk=ids.slice(off,off+100);
      const page=await getAllUsers({limit:100,offset:0,user_ids:chunk.join(',')});
      users.push(...page);
    }
    const map=new Map(users.map(u=>[u.id,u]));
    setTeachers(profs.map(p=>merge(p,map)));
  }
  useEffect(()=>{ load(); },[]);

  /* ───────── live-filter ───────── */
  useEffect(()=>{
    const q=search.toLowerCase();
    setList(
      teachers.filter(o=>{
        const u=o.user;
        const login=(u.username||'').toLowerCase();
        const fio  =[u.first_name,u.surname,u.patronymic].filter(Boolean).join(' ').toLowerCase();
        return login.includes(q)||fio.includes(q);
      })
    );
  },[search,teachers]);

  /* ───────── create ───────── */
  const create = async()=>{
    if(busyCreate) return;
    setBusyCreate(true); setErrors({});
    try{
      // Используем новый метод создания учителя с form-data
      const result = await createTeacherWithUser({
        first_name: form.first_name,
        surname: form.surname,
        patronymic: form.patronymic,
        birth_date: form.birth_date || null,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password
      });
      
      alert('Преподаватель создан');
      setTeachers(t=>[...t,{ teacher: result.teacher, user: result.user }]);
      setForm({ first_name:'',surname:'',patronymic:'',birth_date:'',
                email:'',phone_number:'',password:'' });
    }catch(e){
      if(e.response?.data?.username) setErrors({ username:e.response.data.username });
      else alert('Ошибка создания');
    }finally{ setBusyCreate(false); setModCreate(false); }
  };

  /* ───────── select / save / delete ───────── */
  const select = o => {
    const u=o.user, t=o.teacher;
    setEdit({ ...u, teacherId:t.id, birth_date:u.birth_date||'' });
    setSearch('');
  };

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
        role: 'teacher'
        // username НЕ передаем
      });
      alert('Сохранено');
      load();
      setEdit(null);
    } catch (e) {
      console.error('Error saving teacher:', e);
      alert('Ошибка сохранения');
    }
  };

  const reallyDelete = async()=>{
    if(!edit) return;
    try{
      await deleteTeacher(edit.teacherId);
      await deleteUser(edit.id);
      alert('Удалено');
      await load();
      setEdit(null);
    }catch{ alert('Не удалось удалить'); }
    setModDelete(false);
  };

  /* ───────── ui ───────── */
  const fio=[user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  return(
  <div className="manage-users app-layout">
    <Sidebar activeItem="manage-teachers" userRole={user.role}/>
    <div className="main-content">
      <SmartTopBar pageTitle="Управление преподавателями" />

      {/* Убираем дублирующий заголовок, так как он теперь в TopBar */}

      {/* ───── создать ───── */}
      <div className="block">
        <h2>Создать преподавателя</h2>
        <div className="user-form form-grid">
          {['first_name','surname','patronymic','birth_date',
            'email','phone_number','password'].map(f=>(
            <div className="field" key={f}>
              <label>{f.replace('_',' ')}</label>
              <input type={f==='password'?'password':f==='birth_date'?'date':'text'}
                     value={form[f]} onChange={e=>setForm(s=>({...s,[f]:e.target.value}))}/>
            </div>
          ))}
          <div className="buttons" style={{gridColumn:'1 / -1'}}>
            <button className="btn-primary" onClick={()=>setModCreate(true)}>Создать</button>
          </div>
        </div>
      </div>

      {/* ───── поиск / редакт ───── */}
      <div className="block">
        <h2>Найти / Изменить / Удалить</h2>
        <div className="search-block">
          <div style={{position:'relative'}}>
            <input placeholder="Поиск по логину или ФИО"
                   value={search} onChange={e=>setSearch(e.target.value)}
                   onFocus={()=>setShowSug(true)}
                   onBlur ={()=>setTimeout(()=>setShowSug(false),200)}/>
            {showSug&&list.length>0&&(
              <ul className="suggestions">
                {list.map(o=>{
                  const u=o.user;
                  const fio=[u.first_name,u.surname,u.patronymic].filter(Boolean).join(' ');
                  return(
                    <li key={u.id} onClick={()=>select(o)}>
                      {u.username||'(без логина)'} — {fio||'(ФИО не заполнено)'}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {edit&&(
          <div className="user-form form-grid" style={{marginTop:20}}>
            {['first_name','surname','patronymic','birth_date',
              'email','phone_number'].map(f=>(  // Убрали 'username' из редактируемых полей
              <div className="field" key={f}>
                <label>{f.replace('_',' ')}</label>
                <input type={f==='birth_date'?'date':'text'}
                       value={edit[f]||''}
                       onChange={e=>setEdit(s=>({...s,[f]:e.target.value}))}/>
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
              <button className="btn-danger"  onClick={()=>setModDelete(true)}>Удалить</button>
            </div>
          </div>
        )}
      </div>

      {/* ───── модалки ───── */}
      {modCreate&&(
        <div className="modal-overlay">
          <div className="modal-content">
            <p>Создать преподавателя?</p>
            <div className="modal-buttons">
              <button className="btn-primary" disabled={busyCreate}
                      onClick={create}>{busyCreate?'Создание…':'Да'}</button>
              <button className="btn-secondary" disabled={busyCreate}
                      onClick={()=>setModCreate(false)}>Нет</button>
            </div>
          </div>
        </div>
      )}
      {modDelete&&(
        <div className="modal-overlay">
          <div className="modal-content">
            <p>Удалить преподавателя?</p>
            <div className="modal-buttons">
              <button className="btn-danger" onClick={reallyDelete}>Да</button>
              <button className="btn-secondary" onClick={()=>setModDelete(false)}>Нет</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>);
}
