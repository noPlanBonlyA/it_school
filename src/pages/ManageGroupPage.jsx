/*  src/pages/ManageGroupPage.jsx  */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import AutoScheduleModal from '../components/AutoScheduleModal';
import GroupScheduleInfo from '../components/GroupScheduleInfo';
import DefaultScheduleSettings from '../components/DefaultScheduleSettings';
import RefreshScheduleButton from '../components/RefreshScheduleButton';
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

import { 
  createAutoSchedule,
  loadGroupScheduleSettings,
  saveGroupScheduleSettings 
} from '../services/groupScheduleService';

import api from '../api/axiosInstance';
import '../styles/ManageUserPage.css';
import '../styles/ManageGroupPage.css';
import '../styles/ManageGroupPage-mobile.css';
import '../styles/AutoScheduleModal.css';
import '../styles/GroupManagement.css';

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
  const [edit, setEdit] = useState({ name: '', description: '' });
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
  
  // Новые состояния для автоматического расписания
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [selectedCourseForAuto, setSelectedCourseForAuto] = useState(null);

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
      
      // Создаем объект с валидными данными, исключая undefined и null
      const groupData = {
        name: newF.name.trim(),
        description: newF.description?.trim() || '',
        start_date: currentDate,
        end_date: endDate
      };
      
      console.log('[ManageGroupPage] Creating group with data:', groupData);
      console.log('[ManageGroupPage] Data validation:', {
        name: groupData.name,
        nameLength: groupData.name.length,
        description: groupData.description,
        start_date: groupData.start_date,
        end_date: groupData.end_date,
        allFieldsPresent: !!(groupData.name && groupData.start_date && groupData.end_date)
      });
      
      const g = await createGroup(groupData);
      const obj = await refresh(g.id);
      if (obj) {
        setGroups(gs => [...gs, obj]);
      }
      setNewF({ name:'', description:'' });
      setErrs({});
    } catch (error) { 
      console.error('Error creating group:', error);
      let errorMessage = 'Ошибка создания группы';
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage += ': ' + error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage += ':\n' + error.response.data.detail.map(err => 
            `${err.loc?.join('.') || 'field'}: ${err.msg || err.type || 'invalid'}`
          ).join('\n');
        }
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      alert(errorMessage);
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
    console.log('[ManageGroupPage] Opening group for edit:', g);
    setSel(g);
    setEdit({
      name: g.name || '',
      description: g.description || ''
    });
    console.log('[ManageGroupPage] Edit state initialized:', {
      name: g.name || '',
      description: g.description || ''
    });
    setAddStu(false); setAddTea(false); setAddCou(false);
    setShow(true);
  };
  
  const close = () => { setShow(false); setSel(null); };

  const save = async () => {
    if (!sel) return;
    
    console.log('[ManageGroupPage] Save called with:', { sel, edit });
    
    const body = {};
    ['name','description'].forEach(f=>{
      const oldValue = sel[f] || '';
      const newValue = edit[f] || '';
      
      if (oldValue !== newValue) {
        // Убеждаемся, что отправляем строки, а не объекты
        body[f] = typeof newValue === 'string' ? newValue.trim() : String(newValue || '').trim();
      }
    });
    
    console.log('[ManageGroupPage] Changes detected:', body);
    
    if (!Object.keys(body).length) {
      console.log('[ManageGroupPage] No changes to save');
      return;
    }
    
    // Валидация данных перед отправкой
    if (body.name !== undefined && (!body.name || body.name.length < 1)) {
      alert('Название группы не может быть пустым');
      return;
    }
    
    try {
      console.log('[ManageGroupPage] Calling updateGroup with:', { groupId: sel.id, body });
      const result = await updateGroup(sel.id, body);
      console.log('[ManageGroupPage] Update result:', result);
      
      let fr = await refresh(sel.id);

      /* PUT teacher может обнулиться; вернём обратно, если был */
      if (!fr.teacher && sel.teacher) {
        await addTeacherToGroup(sel.id, sel.teacher.id);
        fr = await refresh(sel.id);
      }
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
        
        // Обновляем состояние edit после успешного сохранения
        setEdit({
          name: fr.name || '',
          description: fr.description || ''
        });
        
        alert('Группа успешно обновлена!');
      }
    } catch (error) { 
      console.error('Error saving group:', error);
      let errorMessage = 'Не удалось сохранить группу';
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage += ': ' + error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage += ':\n' + error.response.data.detail.map(err => 
            `${err.loc?.join('.') || 'field'}: ${err.msg || err.type || 'invalid'}`
          ).join('\n');
        }
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      alert(errorMessage); 
    }
  };
  
  const changed = sel && ['name','description']
    .some(f => {
      const oldValue = (sel[f] || '').toString();
      const newValue = (edit[f] || '').toString();
      return oldValue !== newValue;
    });

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
    if (!window.confirm('Удалить студента из группы?')) return;
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
    if (!window.confirm('Удалить преподавателя из группы?')) return;
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

      // Показываем выбор типа добавления курса
      const useAutoSchedule = window.confirm(
        `Курс содержит ${lessons.length} уроков.\n\n` +
        'Выберите способ добавления:\n' +
        '• ОК - Автоматическое расписание (рекомендуется)\n' +
        '• Отмена - Ручное планирование каждого урока'
      );

      if (useAutoSchedule) {
        // Находим выбранный курс
        const selectedCourse = courses.find(c => c.id === chosenC);
        setSelectedCourseForAuto({
          id: chosenC,
          name: selectedCourse?.name || 'Неизвестный курс',
          lessonCount: lessons.length
        });
        setShowAutoSchedule(true);
      } else {
        // Переходим в режим ручного планирования расписания
        setCourseLessons(lessons);
        setLessonSchedules({});
        setSchedulingMode(true);
      }
      
    } catch(e) {
      console.error('Error loading course lessons:', e);
      alert('Не удалось загрузить уроки курса');
    }
  };

  // Обработчик для автоматического создания расписания
  const handleAutoScheduleConfirm = async (scheduleSettings) => {
    try {
      console.log('[ManageGroupPage] Creating auto schedule:', {
        groupId: sel.id,
        courseId: selectedCourseForAuto.id,
        scheduleSettings
      });

      const result = await createAutoSchedule(
        sel.id, 
        selectedCourseForAuto.id, 
        scheduleSettings
      );
      
      // Обновляем группу
      const fr = await refresh(sel.id);
      if (fr) {
        setSel(fr); 
        setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      }
      
      // Сбрасываем состояние
      setSelectedCourseForAuto(null);
      setChosenC(null);
      setAddCou(false);
      setCFil('');
      
      alert(`Курс "${selectedCourseForAuto.name}" успешно добавлен!\nСоздано расписание для ${result.lessonCount} уроков.`);
      
    } catch(error) {
      console.error('Error creating auto schedule:', error);
      throw error; // Пробрасываем ошибку в модал
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
    <div className="groups-page app-layout manage-users manage-groups">
      <Sidebar activeItem="manage-groups" userRole={user.role}/>
      <div className="main-content">
        <SmartTopBar pageTitle="Управление группами" />

        <div className="content-area">
          {/*— убираем дублирующий заголовок, так как он теперь в TopBar —*/}

          {/*— create group —*/}
          <div className="block create-group-block">
            <div className="create-group-header">
              <h2>Создать новую группу</h2>
            </div>
            <div className="create-group-form">
              <div className="field">
                <label>Название группы</label>
                <input 
                  type="text"
                  value={newF.name}
                  onChange={e=>setNewF(s=>({...s,name:e.target.value}))}
                  placeholder="Введите название группы"
                />
                {errs.name && <div className="error-text">{errs.name}</div>}
              </div>
              <div className="field">
                <label>Описание группы</label>
                <textarea 
                  value={newF.description}
                  onChange={e=>setNewF(s=>({...s,description:e.target.value}))}
                  placeholder="Введите описание группы (необязательно)"
                  rows="3"
                />
              </div>
              <div>
                <button className="create-group-btn" onClick={createGrp}>
                  Создать группу
                </button>
              </div>
            </div>
          </div>

          {/*— list of groups —*/}
          <div className="block groups-list-block">
            <div className="groups-list-header">
              <h2>Управление группами</h2>
            </div>
            <div className="groups-list">
              {groups.length > 0 ? groups.map(g=>(
                <div className="group-card" key={g.id}>
                  <div className="group-info">
                    <h3>{g.name}</h3>
                    <p>{g.description||'Описание отсутствует'}</p>
                    <p>
                      <strong>Преподаватель:</strong>&nbsp;
                      {g.teacher ? `${g.teacher.first_name} ${g.teacher.surname}` : 'Не назначен'}
                    </p>
                    <p>
                      <strong>Студентов:</strong> {g.students.length} • 
                      <strong> Курсов:</strong> {g.courses?.length || 0}
                    </p>
                    
                    {/* Информация о расписании группы */}
                    <GroupScheduleInfo group={g} compact={true} />
                  </div>
                  <div className="group-actions">
                    <button className="btn-primary" onClick={() => open(g)}>
                      Управлять
                    </button>
                    <button className="btn-danger" onClick={() => delGrp(g.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              )) : (
                <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>Группы не созданы</h3>
                  <p style={{ color: '#9ca3af' }}>Создайте первую группу, используя форму выше</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/*— modal —*/}
        {show && sel && (
          <div className="modal-overlay">
            <div className="modal-content large">

              {/* header */}
              <div className="modal-header">
                <h2>Управление группой: {sel.name}</h2>
                <button className="close-modal" onClick={close}>
                  ×
                </button>
              </div>

              {/* body */}
              <div className="modal-body grid">

                {/* panel: parameters */}
                <div className="panel parameters">
                  <h3>Параметры группы</h3>
                  <div>
                    {['name','description'].map(f=>(
                      <div className="field" key={f}>
                        <label>{f === 'name' ? 'Название' : 'Описание'}</label>
                        {f==='description'
                          ? <textarea 
                              value={edit[f] || ''}
                              onChange={e=>setEdit(s=>({...s,[f]:e.target.value || ''}))}
                              placeholder="Введите описание группы"
                            />
                          : <input 
                              type="text"
                              value={edit[f] || ''}
                              onChange={e=>setEdit(s=>({...s,[f]:e.target.value || ''}))}
                              placeholder="Введите название группы"
                            />}
                      </div>
                    ))}
                    <button 
                      className={`save-changes-btn ${changed ? '' : 'disabled'}`}
                      disabled={!changed}
                      onClick={save}
                    >
                      Сохранить изменения
                    </button>
                    
                    {/* Информация о расписании группы */}
                    <div style={{ marginTop: '20px' }}>
                      <GroupScheduleInfo group={sel} />
                    </div>
                  </div>
                </div>

                {/* panel: members */}
                <div className="panel members">
                  <h3 style={{ marginTop: 0 }}>Участники</h3>

                  {/*─ teacher ─*/}
                  <div className="section">
                    <div className="section-header">
                      <h4>Преподаватель</h4>
                      {!sel.teacher && (
                        <button 
                          className="btn-mini" 
                          onClick={async()=>{
                            const n=!addTea; setAddTea(n); setAddStu(false); setAddCou(false);
                            if(n) await loadTea();
                          }}
                        >
                          {addTea?'Отмена':'Добавить'}
                        </button>
                      )}
                    </div>

                    {sel.teacher ? (
                      <div className="member-item">
                        <span>
                          {sel.teacher.first_name} {sel.teacher.surname} 
                          <em style={{ color: '#6b7280', marginLeft: '8px' }}>
                            ({sel.teacher.username})
                          </em>
                        </span>
                        <button 
                          className="remove-btn" 
                          onClick={()=>rmTeacher(sel.teacher.id)}
                          title="Удалить преподавателя"
                        >
                          ×
                        </button>
                      </div>
                    ) : addTea && (
                      <>
                        <div className="add-panel">
                          <input 
                            placeholder="Поиск преподавателя..." 
                            value={tFil} 
                            onChange={e=>setTFil(e.target.value)}
                          />
                          <div className="scroll-list">
                            {teaLoaded
                              ? fTea.length ? fTea.map(t=>(
                                  <label 
                                    key={t.profileId}
                                    className={`row-select ${chosenT===t.userId ? 'selected' : ''}`}
                                  >
                                    <input 
                                      type="radio" 
                                      name="teacher"
                                      checked={chosenT===t.userId}
                                      onChange={()=>setChosenT(t.userId)}
                                    />
                                    {hi(`${t.first_name} ${t.surname}`,tFil)} ({hi(t.username,tFil)})
                                  </label>
                                )) : <div className="empty-text">Преподаватели не найдены</div>
                              : <div className="empty-text">Загрузка преподавателей...</div>}
                          </div>
                          <button 
                            className="btn-mini" 
                            disabled={!chosenT} 
                            onClick={assignTeacher}
                          >
                            Назначить преподавателя
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/*─ students ─*/}
                  <div className="section">
                    <div className="section-header">
                      <h4>Студенты ({sel.students.length})</h4>
                      <button 
                        className="btn-mini" 
                        onClick={async()=>{
                          const n=!addStu; setAddStu(n); setAddTea(false); setAddCou(false);
                          if(n) await loadStu();
                        }}
                      >
                        {addStu?'Отмена':'Добавить'}
                      </button>
                    </div>

                    {addStu && (
                      <div className="add-panel">
                        <input 
                          placeholder="Поиск студентов..." 
                          value={sFil} 
                          onChange={e=>setSFil(e.target.value)}
                        />
                        <div className="scroll-list">
                          {stuLoaded
                            ? fStu.length ? fStu.map(s=>(
                                (s.username||s.first_name||s.surname) && (
                                  <label 
                                    key={s.profileId}
                                    className={`row-select ${s.already ? 'disabled' : ''} ${chk.has(s.profileId) ? 'selected' : ''}`}
                                  >
                                    <input 
                                      type="checkbox" 
                                      disabled={s.already}
                                      checked={chk.has(s.profileId)}
                                      onChange={e=>{
                                        setChk(prev=>{
                                          const out=new Set(prev);
                                          e.target.checked?out.add(s.profileId):out.delete(s.profileId);
                                          return out;
                                        });
                                      }}
                                    />
                                    {hi(`${s.first_name} ${s.surname}`.trim(),sFil)} ({hi(s.username,sFil)})
                                    {s.already && <em style={{ color: '#ef4444' }}> — уже в группе</em>}
                                  </label>
                                )
                              )) : <div className="empty-text">Студенты не найдены</div>
                            : <div className="empty-text">Загрузка студентов...</div>}
                        </div>
                        <button 
                          className="btn-mini" 
                          disabled={chk.size===0} 
                          onClick={addStudents}
                        >
                          Добавить студентов {chk.size?`(${chk.size})`:''}
                        </button>
                      </div>
                    )}

                    <div className="scroll-list">
                      {sel.students.length ? sel.students.map(st=>(
                        <div key={st.id} className="member-item">
                          <span>
                            {st.first_name} {st.surname}
                            <em style={{ color: '#6b7280', marginLeft: '8px' }}>
                              ({st.username})
                            </em>
                          </span>
                          <button 
                            className="remove-btn" 
                            onClick={()=>rmStudent(st.id)}
                            title="Удалить студента"
                          >
                            ×
                          </button>
                        </div>
                      )) : <div className="empty-text">Студенты не добавлены</div>}
                    </div>
                  </div>

                  {/*─ courses ─*/}
                  <div className="section">
                    <div className="section-header">
                      <h4>Курсы ({sel.courses?.length || 0})</h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {sel.courses?.length > 0 && (
                          <RefreshScheduleButton 
                            groupId={sel.id} 
                            courses={sel.courses}
                            variant="small"
                          />
                        )}
                        <button 
                          className="btn-mini" 
                          onClick={async()=>{
                            const n=!addCou; setAddCou(n); setAddStu(false); setAddTea(false);
                            if(n) await loadCou();
                          }}
                        >
                          {addCou?'Отмена':'Добавить'}
                        </button>
                      </div>
                    </div>

                    {/* уже привязанные */}
                    <div className="scroll-list">
                      {sel.courses?.length ? sel.courses.map(c=>(
                        <div key={c.id} className="member-item course">
                          <span>
                            {c.name}
                          </span>
                        </div>
                      )) : <div className="empty-text">Курсы не добавлены</div>}
                    </div>

                    {/* выбор нового */}
                    {addCou && !schedulingMode && (
                      <div className="add-panel">
                        <input 
                          placeholder="Поиск курсов..." 
                          value={cFil} 
                          onChange={e=>setCFil(e.target.value)}
                        />
                        <div className="scroll-list">
                          {couLoaded
                            ? fCou.length ? fCou.map(c=>(
                                <label 
                                  key={c.id}
                                  className={`row-select ${c.already ? 'disabled' : ''} ${chosenC===c.id ? 'selected' : ''}`}
                                >
                                  <input 
                                    type="radio" 
                                    disabled={c.already}
                                    checked={chosenC===c.id}
                                    onChange={()=>setChosenC(c.id)}
                                  />
                                  {hi(c.name,cFil)}
                                  {c.already && <em style={{ color: '#ef4444' }}> — уже привязан</em>}
                                </label>
                              )) : <div className="empty-text">Курсы не найдены</div>
                            : <div className="empty-text">Загрузка курсов...</div>}
                        </div>
                        <button 
                          className="btn-mini" 
                          disabled={!chosenC} 
                          onClick={addCourse}
                        >
                          Добавить курс
                        </button>
                      </div>
                    )}

                    {/* Планирование расписания */}
                    {schedulingMode && (
                      <div className="schedule-planning">
                        <h4>
                          Планирование расписания для курса: {courses.find(c => c.id === chosenC)?.name}
                        </h4>
                        
                        <div className="schedule-lessons">
                          {courseLessons.map((lesson, index) => (
                            <div key={lesson.id} className="schedule-lesson-card">
                              <h5>
                                Урок {index + 1}: {lesson.name}
                              </h5>
                              
                              <div className="schedule-lesson-fields">
                                <div className="field">
                                  <label>Дата и время начала:</label>
                                  <input
                                    type="datetime-local"
                                    value={lessonSchedules[lesson.id]?.start_datetime || ''}
                                    onChange={e => updateLessonSchedule(lesson.id, 'start_datetime', e.target.value)}
                                    required
                                  />
                                </div>
                                
                                <div className="field">
                                  <label>Дата и время окончания:</label>
                                  <input
                                    type="datetime-local"
                                    value={lessonSchedules[lesson.id]?.end_datetime || ''}
                                    onChange={e => updateLessonSchedule(lesson.id, 'end_datetime', e.target.value)}
                                    required
                                  />
                                </div>
                                
                                <div className="field">
                                  <label>Аудитория (необязательно):</label>
                                  <input
                                    type="text"
                                    value={lessonSchedules[lesson.id]?.auditorium || ''}
                                    onChange={e => updateLessonSchedule(lesson.id, 'auditorium', e.target.value)}
                                    placeholder="Например: 101, Онлайн, Zoom"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="schedule-actions">
                          <button 
                            className="btn-primary" 
                            onClick={confirmSchedule}
                            disabled={Object.keys(lessonSchedules).length !== courseLessons.length}
                          >
                            Подтвердить расписание
                          </button>
                          <button 
                            className="btn-secondary" 
                            onClick={cancelScheduling}
                          >
                            Отмена
                          </button>
                        </div>
                        
                        <div className="schedule-progress">
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

        {/* Модал автоматического расписания */}
        <AutoScheduleModal
          isOpen={showAutoSchedule}
          onClose={() => {
            setShowAutoSchedule(false);
            setSelectedCourseForAuto(null);
          }}
          onConfirm={handleAutoScheduleConfirm}
          groupId={sel?.id}
          courseName={selectedCourseForAuto?.name}
          lessonCount={selectedCourseForAuto?.lessonCount}
        />
      </div>
    </div>
  );
}