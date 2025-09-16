/*  src/pages/GroupDetailPage.jsx  */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import AutoScheduleModal from '../components/AutoScheduleModal';
import GroupScheduleInfo from '../components/GroupScheduleInfo';
import RefreshScheduleButton from '../components/RefreshScheduleButton';
import CourseManagementModal from '../components/CourseManagementModal';
import { useAuth } from '../contexts/AuthContext';

import {
  updateGroup,
  addStudentsToGroup, removeStudentFromGroup,
  addTeacherToGroup, removeTeacherFromGroup
} from '../services/groupService';

import { getAllUsers }       from '../services/userService';
import { findStudentByUser } from '../services/studentService';
import { findTeacherByUser } from '../services/teacherService';
import { getAllCourses }     from '../services/courseService';
import { getGroupCoursesWithSchedule } from '../services/groupCourseManagementService';

import { 
  createAutoSchedule
} from '../services/groupScheduleService';

import api from '../api/axiosInstance';
import '../styles/ManageUserPage.css';
import '../styles/ManageGroupPage.css';
import '../styles/ManageGroupPage-mobile.css';

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
export default function GroupDetailPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { groupId } = useParams();

  /* ------ state ---------- */
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]); const [stuLoaded, setSL] = useState(false);
  const [teachers, setTeachers] = useState([]); const [teaLoaded, setTL] = useState(false);
  const [courses,  setCourses]  = useState([]); const [couLoaded, setCL] = useState(false);

  const [edit, setEdit] = useState({ name: '', description: '' });
  const [hasChanges, setHasChanges] = useState(false);

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
  
  // Состояние для управления курсами
  const [showCourseManagement, setShowCourseManagement] = useState(false);
  const [selectedCourseForManagement, setSelectedCourseForManagement] = useState(null);

  /* ─── initial group load ────────*/
  useEffect(() => { 
    (async () => {
      try {
        setLoading(true);
        const fullGroup = (await api.get(`/groups/${groupId}`)).data;
        const normalizedGroup = normalizeGroup(fullGroup);
        setGroup(normalizedGroup);
        setEdit({
          name: normalizedGroup.name || '',
          description: normalizedGroup.description || ''
        });
      } catch (error) {
        console.error('Error loading group:', error);
        alert('Ошибка загрузки группы');
        nav('/groups');
      } finally {
        setLoading(false);
      }
    })(); 
  }, [groupId, nav]);

  /* ─── check for changes ────────*/
  useEffect(() => {
    if (!group) return;
    
    const nameChanged = (group.name || '') !== (edit.name || '');
    const descChanged = (group.description || '') !== (edit.description || '');
    
    setHasChanges(nameChanged || descChanged);
  }, [group, edit]);

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

  /* ─── refresh group ────────*/
  const refreshGroup = useCallback(async () => {
    try {
      const fullGroup = (await api.get(`/groups/${groupId}`)).data;
      const normalizedGroup = normalizeGroup(fullGroup);
      setGroup(normalizedGroup);
      return normalizedGroup;
    } catch (error) {
      console.error(`Error refreshing group ${groupId}:`, error);
      return null;
    }
  }, [groupId]);

  /* ────────── SAVE CHANGES ────────────────*/
  const saveChanges = async () => {
    if (!group || !hasChanges) return;
    
    console.log('[GroupDetailPage] Save called with:', { group, edit });
    
    // Создаем базовый объект с обязательными полями
    const body = {
      name: group.name || '',
      start_date: group.start_date || new Date().toISOString().split('T')[0],
      end_date: group.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    // Добавляем описание если оно есть
    if (group.description !== undefined) {
      body.description = group.description || '';
    }
    
    // Применяем изменения из формы
    ['name','description'].forEach(f=>{
      const oldValue = group[f] || '';
      const newValue = edit[f] || '';
      
      if (oldValue !== newValue) {
        // Убеждаемся, что отправляем строки, а не объекты
        body[f] = typeof newValue === 'string' ? newValue.trim() : String(newValue || '').trim();
      }
    });
    
    console.log('[GroupDetailPage] Full body to send:', body);
    
    // Валидация данных перед отправкой
    if (!body.name || body.name.length < 1) {
      alert('Название группы не может быть пустым');
      return;
    }
    
    try {
      console.log('[GroupDetailPage] Calling updateGroup with:', { groupId: group.id, body });
      const result = await updateGroup(group.id, body);
      console.log('[GroupDetailPage] Update result:', result);
      
      let updatedGroup = await refreshGroup();

      /* PUT teacher может обнулиться; вернём обратно, если был */
      if (!updatedGroup.teacher && group.teacher) {
        await addTeacherToGroup(group.id, group.teacher.id);
        updatedGroup = await refreshGroup();
      }
      
      if (updatedGroup) {
        setGroup(updatedGroup);
        
        // Обновляем состояние edit после успешного сохранения
        setEdit({
          name: updatedGroup.name || '',
          description: updatedGroup.description || ''
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

  /* ────────── BACK TO GROUPS ────────────────*/
  const goBack = () => {
    if (hasChanges) {
      const shouldSave = window.confirm('У вас есть несохранённые изменения. Сохранить перед выходом?');
      if (shouldSave) {
        saveChanges().then(() => {
          nav('/groups');
        });
        return;
      }
    }
    nav('/groups');
  };

  /* ────────────── filters ───────────────────*/
  const filterArr = (arr,q,fn)=>{ 
    const s=q.trim().toLowerCase(); 
    return s?arr.filter(a=>fn(a).includes(s)):arr.slice(0,100); 
  };

  const fStu = useMemo(()=>group?filterArr(students,sFil,
    s=>`${s.first_name} ${s.surname} ${s.username}`.toLowerCase())
    .map(s=>({...s,already:new Set(group.students.map(st=>st.id)).has(s.profileId)})):[],[students,group,sFil]);

  const fTea = useMemo(()=>group&&!group.teacher?filterArr(teachers,tFil,
    t=>`${t.first_name} ${t.surname} ${t.username}`.toLowerCase()):[],[teachers,group,tFil]);

  const fCou = useMemo(()=>group?filterArr(courses,cFil,c=>c.name.toLowerCase())
    .map(c=>({...c,already:new Set(group.courses.map(cc=>cc.id)).has(c.id)})):[],[courses,group,cFil]);

  /* ────────────── STUDENTS ───────────────────*/
  const addStudents = async () => {
    if (!chk.size) {
      alert('Выберите студентов');
      return;
    }

    try {
      console.log('[GroupDetailPage] Adding students:', {
        groupId: group.id,
        selectedStudents: Array.from(chk),
        allStudents: students.length
      });

      // ИСПРАВЛЕНО: используем student profile IDs, а не user IDs
      const studentProfileIds = Array.from(chk);
      
      await addStudentsToGroup(group.id, studentProfileIds);
      
      // ИСПРАВЛЕНО: обновляем группу и состояние
      const updatedGroup = await refreshGroup();
      if (updatedGroup) {
        setGroup(updatedGroup);
      }
      
      setChk(new Set());
      setAddStu(false);
      console.log('[GroupDetailPage] Students added successfully');
    } catch (error) {
      console.error('[GroupDetailPage] Error adding students:', error);
      alert('Ошибка при добавлении студентов: ' + (error.response?.data?.detail || error.message));
    }
  };

  const rmStudent = async sid => {
    if (!window.confirm('Удалить студента из группы?')) return;
    try {
      await removeStudentFromGroup(group.id, sid);
      const updatedGroup = await refreshGroup();
      if (updatedGroup) {
        setGroup(updatedGroup);
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
      
      await addTeacherToGroup(group.id, profile.id);
      const updatedGroup = await refreshGroup();
      if (updatedGroup) {
        setGroup(updatedGroup);
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
      await removeTeacherFromGroup(group.id, tid);
      const updatedGroup = await refreshGroup();
      if (updatedGroup) {
        setGroup(updatedGroup);
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
      console.log('[GroupDetailPage] Creating auto schedule:', {
        groupId: group.id,
        courseId: selectedCourseForAuto.id,
        scheduleSettings
      });

      const result = await createAutoSchedule(
        group.id, 
        selectedCourseForAuto.id, 
        scheduleSettings
      );
      
      // Обновляем группу
      const updatedGroup = await refreshGroup();
      if (updatedGroup) {
        setGroup(updatedGroup);
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
        group_id: group.id,
        start_datetime: schedule.start_datetime,
        end_datetime: schedule.end_datetime,
        is_opened: false, // по умолчанию закрыто
        auditorium: schedule.auditorium || ''
      }));

      // Создаем lesson-groups через bulk API
      await api.post('/courses/lesson-groups', lessonGroups);
      
      // Обновляем группу
      const updatedGroup = await refreshGroup();
      if (updatedGroup) {
        setGroup(updatedGroup);
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

  /* ────────────── COURSE MANAGEMENT ───────────────────*/
  const handleCourseManagement = (course) => {
    setSelectedCourseForManagement(course);
    setShowCourseManagement(true);
  };

  const handleCourseUpdated = async (updateInfo) => {
    console.log('[GroupDetail] Course update notification:', updateInfo);
    
    try {
      // Обновляем информацию о группе после изменения курса
      const updatedGroup = await refreshGroup();
      if (updatedGroup) {
        // Получаем актуальный список курсов группы
        const actualCourses = await getGroupCoursesWithSchedule(group.id);
        
        // Обновляем группу с актуальными курсами
        const finalGroup = {
          ...updatedGroup,
          courses: actualCourses
        };
        
        setGroup(finalGroup);
        
        // Если курс был удален, дополнительно обновляем через задержку
        if (updateInfo?.type === 'removed') {
          console.log(`[GroupDetail] Course ${updateInfo.courseName} was removed, doing additional refresh`);
          
          setTimeout(async () => {
            try {
              const delayedRefresh = await refreshGroup();
              if (delayedRefresh) {
                const delayedCourses = await getGroupCoursesWithSchedule(group.id);
                const finalDelayedGroup = {
                  ...delayedRefresh,
                  courses: delayedCourses
                };
                setGroup(finalDelayedGroup);
              }
            } catch (delayedError) {
              console.error('Error in delayed refresh:', delayedError);
            }
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error refreshing group after course update:', error);
      
      // Даже при ошибке попробуем базовое обновление
      try {
        const fallbackRefresh = await refreshGroup();
        if (fallbackRefresh) {
          setGroup(fallbackRefresh);
        }
      } catch (fallbackError) {
        console.error('Fallback refresh also failed:', fallbackError);
      }
    }
  };

  /* ────────────── RENDER ───────────────────*/
  if (loading) {
    return (
      <div className="groups-page app-layout manage-users manage-groups" style={{ width: '100%' }}>
        <Sidebar activeItem="manage-groups" userRole={user.role}/>
        <div className="main-content" style={{ marginLeft: '250px', width: 'calc(100% - 250px)', maxWidth: 'none' }}>
          <SmartTopBar pageTitle="Загрузка..." />
          <div className="content-area" style={{ padding: '40px', textAlign: 'center', maxWidth: 'none' }}>
            <h3>Загрузка группы...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="groups-page app-layout manage-users manage-groups" style={{ width: '100%' }}>
        <Sidebar activeItem="manage-groups" userRole={user.role}/>
        <div className="main-content" style={{ marginLeft: '250px', width: 'calc(100% - 250px)', maxWidth: 'none' }}>
          <SmartTopBar pageTitle="Ошибка" />
          <div className="content-area" style={{ padding: '40px', textAlign: 'center', maxWidth: 'none' }}>
            <h3>Группа не найдена</h3>
            <button className="btn-primary" onClick={() => nav('/groups')}>
              Вернуться к списку групп
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="groups-page app-layout manage-users manage-groups" style={{ width: '100%' }}>
      <Sidebar activeItem="manage-groups" userRole={user.role}/>
      <div className="main-content" style={{ marginLeft: '250px', width: 'calc(100% - 250px)', maxWidth: 'none' }}>
        <SmartTopBar pageTitle={`Управление группой: ${group.name}`} />

        <div className="content-area" style={{ maxWidth: 'none', padding: '20px' }}>
          {/* Панель действий */}
          <div className="block" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
              <button className="btn-secondary" onClick={goBack}>
                ← Вернуться к списку групп
              </button>
            </div>
          </div>

          {/* Кнопка сохранения изменений */}
          {hasChanges && (
            <div className="block" style={{ marginBottom: '20px', textAlign: 'center' }}>
              <button className="btn-primary" onClick={saveChanges} style={{ padding: '12px 24px', fontSize: '16px' }}>
                💾 Сохранить изменения
              </button>
            </div>
          )}

          <div className="modal-body grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', maxWidth: 'none' }}>

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
                
                {/* Информация о расписании группы */}
                <div style={{ marginTop: '20px' }}>
                  <GroupScheduleInfo group={group} />
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
                  {!group.teacher && (
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

                {group.teacher ? (
                  <div className="member-item">
                    <span>
                      {group.teacher.first_name} {group.teacher.surname} 
                      <em style={{ color: '#6b7280', marginLeft: '8px' }}>
                        ({group.teacher.username})
                      </em>
                    </span>
                    <button 
                      className="remove-btn" 
                      onClick={()=>rmTeacher(group.teacher.id)}
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
                  <h4>Студенты ({group.students.length})</h4>
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
                  {group.students.length ? group.students.map(st=>(
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
                  <h4>Курсы ({group.courses?.length || 0})</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {group.courses?.length > 0 && (
                      <RefreshScheduleButton 
                        groupId={group.id} 
                        courses={group.courses}
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
                  {group.courses?.length ? group.courses.map(c=>(
                    <div key={c.id} className="member-item course">
                      <span>
                        {c.name}
                      </span>
                      <div className="course-actions">
                        <button 
                          className="btn-mini course-manage-btn"
                          onClick={() => handleCourseManagement(c)}
                          title="Управление курсом"
                        >
                          ⚙️
                        </button>
                      </div>
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
        </div>

        {/* Модал автоматического расписания */}
        <AutoScheduleModal
          isOpen={showAutoSchedule}
          onClose={() => {
            setShowAutoSchedule(false);
            setSelectedCourseForAuto(null);
          }}
          onConfirm={handleAutoScheduleConfirm}
          groupId={group?.id}
          courseName={selectedCourseForAuto?.name}
          lessonCount={selectedCourseForAuto?.lessonCount}
        />

        {/* Модал управления курсом */}
        <CourseManagementModal
          isOpen={showCourseManagement}
          onClose={() => {
            setShowCourseManagement(false);
            setSelectedCourseForManagement(null);
          }}
          groupId={group?.id}
          course={selectedCourseForManagement}
          onCourseUpdated={handleCourseUpdated}
        />
      </div>
    </div>
  );
}
