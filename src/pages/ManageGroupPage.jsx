/*  src/pages/ManageGroupPage.jsx  */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import { useAuth } from '../contexts/AuthContext';

import {
  getAllGroups, createGroup, updateGroup, deleteGroup,
  addStudentsToGroup, removeStudentFromGroup,
  addTeacherToGroup, removeTeacherFromGroup,
  attachCourseToGroup // привязывает все уроки курса к группе
} from '../services/groupService';

import { getAllUsers }       from '../services/userService';
import { findStudentByUser } from '../services/studentService';
import { findTeacherByUser } from '../services/teacherService';
import { getAllCourses }     from '../services/courseService';

import api from '../api/axiosInstance';
import '../styles/ManageUserPage.css';
import '../styles/ManageGroupPage.css';

/* ─────────────────── helpers ────────────────────────*/
const hi = (txt, q) => {
  if (!q) return txt;
  const i = txt.toLowerCase().indexOf(q.toLowerCase());
  return i === -1
    ? txt
    : <>
        {txt.slice(0, i)}
        <mark>{txt.slice(i, i + q.length)}</mark>
        {txt.slice(i + q.length)}
      </>;
};

const mapUserObj = o => {
  const u = o.user || o;
  return {
    profileId : o.id,        // ID студенческого профиля (для добавления в группу)
    userId    : o.user_id || o.id,    // ID пользователя
    first_name: u.first_name || '',
    surname   : u.surname    || '',
    username  : u.username   || ''
  };
};

const normalizeGroup = g => ({
  ...g,
  courses : g.courses  || [],
  students: (g.students || []).map(s => ({
    id        : s.id,
    points    : s.points,
    username  : s.user.username,
    first_name: s.user.first_name,
    surname   : s.user.surname
  })),
  teacher: g.teacher ? {
    id        : g.teacher.id,
    username  : g.teacher.user.username,
    first_name: g.teacher.user.first_name,
    surname   : g.teacher.user.surname
  } : null
});

/* ─────────────────── component ────────────────────────*/
export default function ManageGroupPage() {
  const { user } = useAuth();
  const nav      = useNavigate();

  /* ------ state ---------- */
  const [groups,   setGroups]   = useState([]);
  const [students, setStudents] = useState([]); const [stuLoaded, setSL] = useState(false);
  const [teachers, setTeachers] = useState([]); const [teaLoaded, setTL] = useState(false);
  const [courses,  setCourses]  = useState([]); const [couLoaded, setCL] = useState(false);

  const [newF, setNewF] = useState({ name:'', description:'' });
  const [errs, setErrs] = useState({});

  const [sel , setSel ] = useState(null);
  const [edit, setEdit] = useState(null);
  const [show, setShow] = useState(false);

  const [addStu, setAddStu] = useState(false);
  const [addTea, setAddTea] = useState(false);
  const [addCou, setAddCou] = useState(false);

  const [chk,      setChk]      = useState(new Set());
  const [chosenT , setChosenT ] = useState(null);
  const [chosenC , setChosenC ] = useState(null);

  const [sFil, setSFil] = useState('');
  const [tFil, setTFil] = useState('');
  const [cFil, setCFil] = useState('');

  const [schedulingMode, setSchedulingMode] = useState(false);
  const [courseLessons, setCourseLessons] = useState([]);
  const [lessonSchedules, setLessonSchedules] = useState({});

  /* ─── initial groups load ────────*/
  useEffect(() => { 
    (async () => {
      try {
        const brief = (await getAllGroups(100, 0)).objects || [];
        const full  = await Promise.all(
          brief.map(async g => {
            try {
              const fullGroup = (await api.get(`/groups/${g.id}`)).data;
              return normalizeGroup(fullGroup);
            } catch (error) {
              console.error(`Error loading group ${g.id}:`, error);
              return normalizeGroup(g); // fallback to brief data
            }
          })
        );
        setGroups(full);
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    })(); 
  }, []);

  /* ─── lazy lists ────────*/
  const loadStu = async () => { 
    if (stuLoaded) return;
    try {
      // Загружаем пользователей со студенческой ролью
      const usersList = await getAllUsers({ role:'student', limit:100, offset:0 });
      
      // Для каждого пользователя получаем его студенческий профиль
      const studentsData = await Promise.all(
        usersList.map(async (user) => {
          try {
            const studentProfile = await findStudentByUser(user.id);
            return {
              profileId: studentProfile.id,     // ID студенческого профиля
              userId: user.id,                  // ID пользователя
              first_name: user.first_name || '',
              surname: user.surname || '',
              username: user.username || ''
            };
          } catch (error) {
            console.warn(`No student profile for user ${user.id}:`, error);
            return null;
          }
        })
      );
      
      // Фильтруем только тех, у кого есть студенческий профиль
      const validStudents = studentsData.filter(s => s !== null);
      setStudents(validStudents);
      setSL(true);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };
  
  const loadTea = async () => { 
    if (teaLoaded) return;
    try {
      const list = await getAllUsers({ role:'teacher', limit:100, offset:0 });
      setTeachers(list.map(mapUserObj)); 
      setTL(true);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };
  
  const loadCou = async () => { 
    if (couLoaded) return;
    try {
      const data = await getAllCourses(100, 0);
      setCourses(data.objects || []); 
      setCL(true);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  /* ─── refresh one group ────────*/
  const refresh = useCallback(async id => {
    try {
      const fullGroup = (await api.get(`/groups/${id}`)).data;
      return normalizeGroup(fullGroup);
    } catch (error) {
      console.error(`Error refreshing group ${id}:`, error);
      return null;
    }
  }, []);

  /* ────────── CREATE GROUP ────────────────*/
  const createGrp = async () => {
    if (!newF.name.trim()) { setErrs({ name:'Название обязательно' }); return; }
    try {
      // Добавляем обязательные поля start_date и end_date со значениями по умолчанию
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const endDate = futureDate.toISOString().split('T')[0];
      
      const g   = await createGroup({
        ...newF,
        start_date: currentDate,
        end_date: endDate
      });
      const obj = await refresh(g.id);
      if (obj) {
        setGroups(gs => [...gs, obj]);
      }
      setNewF({ name:'', description:'' });
      setErrs({});
    } catch (error) { 
      console.error('Error creating group:', error);
      alert('Ошибка создания группы'); 
    }
  };

  const delGrp = async id => {
    if (!window.confirm('Удалить группу?')) return;
    try { 
      await deleteGroup(id); 
      setGroups(gs => gs.filter(g => g.id !== id)); 
    }
    catch (error) { 
      console.error('Error deleting group:', error);
      alert('Не удалось удалить группу'); 
    }
  };

  const open = g => {
    setSel(g);
    setEdit({
      name       : g.name,
      description: g.description || ''
    });
    setAddStu(false); setAddTea(false); setAddCou(false);
    setShow(true);
  };
  
  const close = () => { setShow(false); setSel(null); };

  const save = async () => {
    if (!sel) return;
    const body = {};
    ['name','description'].forEach(f=>{
      if ((sel[f]||'') !== (edit[f]||'')) body[f] = edit[f] || null;
    });
    if (!Object.keys(body).length) return;
    try {
      await updateGroup(sel.id, body);
      let fr = await refresh(sel.id);

      /* PUT teacher может обнулиться; вернём обратно, если был */
      if (!fr.teacher && sel.teacher) {
        await addTeacherToGroup(sel.id, sel.teacher.id);
        fr = await refresh(sel.id);
      }
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      }
    } catch (error) { 
      console.error('Error saving group:', error);
      alert('Не удалось сохранить'); 
    }
  };
  
  const changed = sel && ['name','description']
    .some(f => (sel[f]||'') !== (edit[f]||''));

  /* ────────────── filters ───────────────────*/
  const filterArr = (arr,q,fn)=>{ 
    const s=q.trim().toLowerCase(); 
    return s?arr.filter(a=>fn(a).includes(s)):arr.slice(0,100); 
  };

  const fStu = useMemo(()=>sel?filterArr(students,sFil,
    s=>`${s.first_name} ${s.surname} ${s.username}`.toLowerCase())
    .map(s=>({...s,already:new Set(sel.students.map(st=>st.id)).has(s.profileId)})):[],[students,sel,sFil]);

  const fTea = useMemo(()=>sel&&!sel.teacher?filterArr(teachers,tFil,
    t=>`${t.first_name} ${t.surname} ${t.username}`.toLowerCase()):[],[teachers,sel,tFil]);

  const fCou = useMemo(()=>sel?filterArr(courses,cFil,c=>c.name.toLowerCase())
    .map(c=>({...c,already:new Set(sel.courses.map(cc=>cc.id)).has(c.id)})):[],[courses,sel,cFil]);

  /* ────────────── STUDENTS ───────────────────*/
  const addStudents = async () => {
    if (!chk.size) {
      alert('Выберите студентов');
      return;
    }

    try {
      console.log('[ManageGroupPage] Adding students:', {
        groupId: sel.id,
        selectedStudents: Array.from(chk),
        allStudents: students.length
      });

      // ИСПРАВЛЕНО: используем student profile IDs, а не user IDs
      const studentProfileIds = Array.from(chk);
      
      await addStudentsToGroup(sel.id, studentProfileIds);
      
      // ИСПРАВЛЕНО: обновляем группу и состояние
      const fr = await refresh(sel.id);
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      }
      
      setChk(new Set());
      setAddStu(false);
      console.log('[ManageGroupPage] Students added successfully');
    } catch (error) {
      console.error('[ManageGroupPage] Error adding students:', error);
      alert('Ошибка при добавлении студентов: ' + (error.response?.data?.detail || error.message));
    }
  };

  const rmStudent = async sid => {
    if (!window.confirm('Удалить студента?')) return;
    try {
      await removeStudentFromGroup(sel.id, sid);
      const fr = await refresh(sel.id);
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      }
    } catch (error) { 
      console.error('Error removing student:', error);
      alert('Не удалось удалить студента'); 
    }
  };

  /* ────────────── TEACHER ───────────────────*/
  const assignTeacher = async () => {
    if (!chosenT) return;
    try {
      const profile = await findTeacherByUser(chosenT);
      if (!profile){ alert('У выбранного пользователя нет Teacher-профиля'); return; }
      
      await addTeacherToGroup(sel.id, profile.id);
      const fr = await refresh(sel.id);
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      }
      setChosenT(null); setAddTea(false); setTFil('');
    } catch(e){
      console.error('Error assigning teacher:', e);
      if (e.response?.status === 409) alert('Этот преподаватель уже закреплён за другой группой');
      else                            alert('Не удалось привязать преподавателя');
      setChosenT(null); setAddTea(false); setTFil('');
    }
  };

  const rmTeacher = async tid => {
    if (!window.confirm('Удалить преподавателя?')) return;
    try {
      await removeTeacherFromGroup(sel.id, tid);
      const fr = await refresh(sel.id);
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      }
    } catch (error) { 
      console.error('Error removing teacher:', error);
      alert('Не удалось удалить преподавателя'); 
    }
  };

  /* ────────────── COURSES ───────────────────*/
  const addCourse = async () => {
    if (!chosenC) return;
    try {
      // Получаем уроки курса
      const lessonsResponse = await api.get(`/courses/${chosenC}/lessons`);
      const lessons = lessonsResponse.data.objects || [];
      
      if (lessons.length === 0) {
        alert('У курса нет уроков – добавьте хотя бы один урок.');
        return;
      }

      // Переходим в режим планирования расписания
      setCourseLessons(lessons);
      setLessonSchedules({});
      setSchedulingMode(true);
      
    } catch(e) {
      console.error('Error loading course lessons:', e);
      alert('Не удалось загрузить уроки курса');
    }
  };

  const confirmSchedule = async () => {
    try {
      // Проверяем, что все уроки имеют расписание
      const scheduleEntries = Object.entries(lessonSchedules);
      if (scheduleEntries.length !== courseLessons.length) {
        alert('Установите время для всех уроков');
        return;
      }

      // Формируем массив lesson-group объектов
      const lessonGroups = scheduleEntries.map(([lessonId, schedule]) => ({
        lesson_id: lessonId,
        group_id: sel.id,
        start_datetime: schedule.start_datetime,
        end_datetime: schedule.end_datetime,
        is_opened: false, // по умолчанию закрыто
        auditorium: schedule.auditorium || ''
      }));

      // Создаем lesson-groups через bulk API
      await api.post('/courses/lesson-groups', lessonGroups);
      
      // Обновляем группу
      const fr = await refresh(sel.id);
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      }
      
      // Сбрасываем состояние
      setSchedulingMode(false);
      setCourseLessons([]);
      setLessonSchedules({});
      setChosenC(null);
      setAddCou(false);
      setCFil('');
      
      alert('Курс успешно добавлен к группе с расписанием');
      
    } catch(e) {
      console.error('Error creating schedule:', e);
      alert('Не удалось создать расписание');
    }
  };

  const cancelScheduling = () => {
    setSchedulingMode(false);
    setCourseLessons([]);
    setLessonSchedules({});
  };

  const updateLessonSchedule = (lessonId, field, value) => {
    setLessonSchedules(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [field]: value
      }
    }));
  };

  /* ────────────── UI helpers ───────────────────*/
  const fio = [user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  /* ────────────── RENDER ───────────────────*/
  return (
    <div className="groups-page app-layout manage-users">
      <Sidebar activeItem="manage-groups" userRole={user.role}/>
      <div className="main-content">
        <SmartTopBar pageTitle="Управление группами" />

        <div className="content-area">
          {/*— убираем дублирующий заголовок, так как он теперь в TopBar —*/}

          {/*— create group —*/}
          <div className="block">
            <h2>Создать группу</h2>
            <div className="user-form form-grid">
              {['name','description'].map(f=>(
                <div className="field" key={f}>
                  <label>{f.replace('_',' ')}</label>
                  {f==='description'
                    ? <textarea value={newF[f]}
                                onChange={e=>setNewF(s=>({...s,[f]:e.target.value}))}/>
                    : <input type={f.includes('date')?'date':'text'}
                             value={newF[f]}
                             onChange={e=>setNewF(s=>({...s,[f]:e.target.value}))}/>}
                  {f==='name' && errs.name && <div className="error-text">{errs.name}</div>}
                </div>
              ))}
              <div className="buttons">
                <button className="btn-primary" onClick={createGrp}>Создать группу</button>
              </div>
            </div>
          </div>

          {/*— list of groups —*/}
          <div className="block">
            <h2>Список групп</h2>
            <div className="groups-list">
              {groups.map(g=>(
                <div className="group-card" key={g.id} style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div className="group-info">
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e1e2f' }}>
                      {g.name}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', color: '#6b7280', fontSize: '14px' }}>
                      {g.description||'—'}
                    </p>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                      Преподаватель:&nbsp;
                      {g.teacher ? `${g.teacher.first_name} ${g.teacher.surname}` : '—'}
                      {' • '}Студентов: {g.students.length}
                      {' • '}Курсов: {g.courses?.length || 0}
                    </p>
                  </div>
                  <div className="group-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-primary" onClick={() => open(g)}>Управлять</button>
                    <button className="btn-danger"    onClick={() => delGrp(g.id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/*— modal —*/}
        {show && sel && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '900px' }}>

              {/* header */}
              <div className="modal-header">
                <h2>{sel.name}</h2>
                <button className="btn-secondary" onClick={close} style={{
                  background: 'transparent',
                  border: '1px solid rgba(0, 177, 143, 0.3)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}>×</button>
              </div>

              {/* body */}
              <div className="modal-body" style={{ 
                padding: '24px', 
                display: 'grid', 
                gridTemplateColumns: '1fr 2fr', 
                gap: '24px',
                maxHeight: '70vh',
                overflow: 'auto'
              }}>

                {/* panel: parameters */}
                <div className="panel">
                  <h3 style={{ marginTop: 0 }}>Параметры</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {['name','description'].map(f=>(
                      <div className="field" key={f}>
                        <label>{f.replace('_',' ')}</label>
                        {f==='description'
                          ? <textarea value={edit[f]}
                                      onChange={e=>setEdit(s=>({...s,[f]:e.target.value}))}
                                      style={{ minHeight: '60px', resize: 'vertical' }}/>
                          : <input type={f.includes('date')?'date':'text'}
                                   value={edit[f]}
                                   onChange={e=>setEdit(s=>({...s,[f]:e.target.value}))}/>}
                      </div>
                    ))}
                    <button className="btn-primary" disabled={!changed}
                            style={{opacity:changed?1:0.55}} onClick={save}>
                      Сохранить изменения
                    </button>
                  </div>
                </div>

                {/* panel: members */}
                <div className="panel">
                  <h3 style={{ marginTop: 0 }}>Участники</h3>

                  {/*─ teacher ─*/}
                  <div className="section" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0 }}>Преподаватель</h4>
                      {!sel.teacher && (
                        <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={async()=>{
                          const n=!addTea; setAddTea(n); setAddStu(false); setAddCou(false);
                          if(n) await loadTea();
                        }}>
                          {addTea?'Отмена':'Добавить'}
                        </button>
                      )}
                    </div>

                    {sel.teacher ? (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '8px 12px', 
                        background: '#f8f9fa', 
                        borderRadius: '6px' 
                      }}>
                        <span>{sel.teacher.first_name} {sel.teacher.surname} ({sel.teacher.username})</span>
                        <button className="btn-danger" style={{ fontSize: '12px', padding: '2px 6px' }} onClick={()=>rmTeacher(sel.teacher.id)}>×</button>
                      </div>
                    ) : addTea && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
                        <input placeholder="Поиск преподавателя..." value={tFil} onChange={e=>setTFil(e.target.value)}
                               style={{ width: '100%', marginBottom: '8px' }}/>
                        <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
                          {teaLoaded
                            ? fTea.length ? fTea.map(t=>(
                                <label key={t.profileId}
                                       style={{ 
                                         display: 'block', 
                                         padding: '4px 0', 
                                         cursor: 'pointer',
                                         background: chosenT===t.userId ? '#e3f2fd' : 'transparent'
                                       }}>
                                  <input type="radio" name="teacher"
                                         checked={chosenT===t.userId}
                                         onChange={()=>setChosenT(t.userId)}
                                         style={{ marginRight: '8px' }}/>
                                  {hi(`${t.first_name} ${t.surname}`,tFil)} ({hi(t.username,tFil)})
                                </label>
                              )) : <div style={{ color: '#6b7280', textAlign: 'center' }}>Список пуст</div>
                            : <div style={{ color: '#6b7280', textAlign: 'center' }}>Загрузка…</div>}
                        </div>
                        <button className="btn-primary" disabled={!chosenT} onClick={assignTeacher}
                                style={{ width: '100%' }}>
                          Назначить преподавателя
                        </button>
                      </div>
                    )}
                  </div>

                  {/*─ students ─*/}
                  <div className="section" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0 }}>Студенты ({sel.students.length})</h4>
                      <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={async()=>{
                        const n=!addStu; setAddStu(n); setAddTea(false); setAddCou(false);
                        if(n) await loadStu();
                      }}>
                        {addStu?'Отмена':'Добавить'}
                      </button>
                    </div>

                    {addStu && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
                        <input placeholder="Поиск студентов..." value={sFil} onChange={e=>setSFil(e.target.value)}
                               style={{ width: '100%', marginBottom: '8px' }}/>
                        <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
                          {stuLoaded
                            ? fStu.length ? fStu.map(s=>(
                                (s.username||s.first_name||s.surname) && (
                                  <label key={s.profileId}
                                         style={{ 
                                           display: 'block', 
                                           padding: '4px 0', 
                                           cursor: s.already ? 'not-allowed' : 'pointer',
                                           opacity: s.already ? 0.5 : 1,
                                           background: chk.has(s.profileId) ? '#e3f2fd' : 'transparent'  // ИСПРАВЛЕНО: используем profileId
                                         }}>
                                    <input type="checkbox" disabled={s.already}
                                           checked={chk.has(s.profileId)}  // ИСПРАВЛЕНО: используем profileId
                                           onChange={e=>{
                                             setChk(prev=>{
                                               const out=new Set(prev);
                                               e.target.checked?out.add(s.profileId):out.delete(s.profileId);  // ИСПРАВЛЕНО: используем profileId
                                               return out;
                                             });
                                           }}
                                           style={{ marginRight: '8px' }}/>
                                    {hi(`${s.first_name} ${s.surname}`.trim(),sFil)} ({hi(s.username,sFil)})
                                    {s.already && ' — уже в группе'}
                                  </label>
                                )
                              )) : <div style={{ color: '#6b7280', textAlign: 'center' }}>Список пуст</div>
                            : <div style={{ color: '#6b7280', textAlign: 'center' }}>Загрузка…</div>}
                        </div>
                        <button className="btn-primary" disabled={chk.size===0} onClick={addStudents}
                                style={{ width: '100%' }}>
                          Добавить студентов {chk.size?`(${chk.size})`:''}
                        </button>
                      </div>
                    )}

                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {sel.students.length ? sel.students.map(st=>(
                        <div key={st.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '6px 12px', 
                          marginBottom: '4px',
                          background: '#f8f9fa', 
                          borderRadius: '4px' 
                        }}>
                          <span>{st.first_name} {st.surname} ({st.username})</span>
                          <button className="btn-danger" style={{ fontSize: '12px', padding: '2px 6px' }} onClick={()=>rmStudent(st.id)}>×</button>
                        </div>
                      )) : <p style={{ color: '#6b7280', textAlign: 'center' }}>Студентов нет</p>}
                    </div>
                  </div>

                  {/*─ courses ─*/}
                  <div className="section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0 }}>Курсы ({sel.courses?.length || 0})</h4>
                      <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={async()=>{
                        const n=!addCou; setAddCou(n); setAddStu(false); setAddTea(false);
                        if(n) await loadCou();
                      }}>
                        {addCou?'Отмена':'Добавить'}
                      </button>
                    </div>

                    {/* уже привязанные */}
                    <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '12px' }}>
                      {sel.courses?.length ? sel.courses.map(c=>(
                        <div key={c.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '8px 12px', 
                          marginBottom: '4px',
                          background: '#f8f9fa', 
                          borderRadius: '4px' 
                        }}>
                          <span>{c.name}</span>
                        </div>
                      )) : <p style={{ color: '#6b7280', textAlign: 'center' }}>Курсы не добавлены</p>}
                    </div>

                    {/* выбор нового */}
                    {addCou && !schedulingMode && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px' }}>
                        <input placeholder="Поиск курсов..." value={cFil} onChange={e=>setCFil(e.target.value)}
                               style={{ width: '100%', marginBottom: '8px' }}/>
                        <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
                          {couLoaded
                            ? fCou.length ? fCou.map(c=>(
                                <label key={c.id}
                                       style={{ 
                                         display: 'block', 
                                         padding: '4px 0', 
                                         cursor: c.already ? 'not-allowed' : 'pointer',
                                         opacity: c.already ? 0.5 : 1,
                                         background: chosenC===c.id ? '#e3f2fd' : 'transparent'
                                       }}>
                                  <input type="radio" disabled={c.already}
                                         checked={chosenC===c.id}
                                         onChange={()=>setChosenC(c.id)}
                                         style={{ marginRight: '8px' }}/>
                                  {hi(c.name,cFil)}
                                  {c.already && ' — уже привязан'}
                                </label>
                              )) : <div style={{ color: '#6b7280', textAlign: 'center' }}>Список пуст</div>
                            : <div style={{ color: '#6b7280', textAlign: 'center' }}>Загрузка…</div>}
                        </div>
                        <button className="btn-primary" disabled={!chosenC} onClick={addCourse}
                                style={{ width: '100%' }}>
                          Добавить курс
                        </button>
                      </div>
                    )}

                    {/* Планирование расписания */}
                    {schedulingMode && (
                      <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '16px', background: '#f8f9ff' }}>
                        <h4 style={{ margin: '0 0 16px 0', color: '#007bff' }}>
                          Планирование расписания для курса: {courses.find(c => c.id === chosenC)?.name}
                        </h4>
                        
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          {courseLessons.map((lesson, index) => (
                            <div key={lesson.id} style={{ 
                              border: '1px solid #e5e7eb', 
                              borderRadius: '6px', 
                              padding: '12px', 
                              marginBottom: '12px',
                              background: 'white'
                            }}>
                              <h5 style={{ margin: '0 0 12px 0' }}>
                                Урок {index + 1}: {lesson.name}
                              </h5>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                                    Дата и время начала:
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={lessonSchedules[lesson.id]?.start_datetime || ''}
                                    onChange={e => updateLessonSchedule(lesson.id, 'start_datetime', e.target.value)}
                                    style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                                    Дата и время окончания:
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={lessonSchedules[lesson.id]?.end_datetime || ''}
                                    onChange={e => updateLessonSchedule(lesson.id, 'end_datetime', e.target.value)}
                                    style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                    required
                                  />
                                </div>
                              </div>
                              
                              <div style={{ marginTop: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                                  Аудитория (необязательно):
                                </label>
                                <input
                                  type="text"
                                  value={lessonSchedules[lesson.id]?.auditorium || ''}
                                  onChange={e => updateLessonSchedule(lesson.id, 'auditorium', e.target.value)}
                                  placeholder="Например: 101, Онлайн, Zoom"
                                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                          <button 
                            className="btn-primary" 
                            onClick={confirmSchedule}
                            disabled={Object.keys(lessonSchedules).length !== courseLessons.length}
                            style={{ flex: 1 }}
                          >
                            Подтвердить расписание
                          </button>
                          <button 
                            className="btn-secondary" 
                            onClick={cancelScheduling}
                            style={{ flex: 1, background: '#6c757d', color: 'white', border: 'none' }}
                          >
                            Отмена
                          </button>
                        </div>
                        
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                          Установлено расписание для {Object.keys(lessonSchedules).length} из {courseLessons.length} уроков
                        </div>
                      </div>
                    )}
                  </div>
                </div>{/* panel members */}
              </div>{/* modal-body */}
            </div>{/* modal-content */}
          </div>
        )}
      </div>
    </div>
  );
}