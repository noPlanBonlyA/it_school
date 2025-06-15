/*  src/pages/ManageGroupPage.jsx  */
import React, {
  useState, useEffect, useMemo, useCallback
} from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import Topbar  from '../components/TopBar';
import { useAuth } from '../contexts/AuthContext';

import {
  getAllGroups, createGroup, updateGroup, deleteGroup,
  addStudentsToGroup, removeStudentFromGroup,
  addTeacherToGroup, removeTeacherFromGroup,
  attachCourseToGroup           // ← привязывает все уроки курса к группе
} from '../services/groupService';

import { getAllUsers }       from '../services/userService';
import { findStudentByUser } from '../services/studentService';
import { findTeacherByUser } from '../services/teacherService';
import { getAllCourses }     from '../services/courseService';

import api from '../api/axiosInstance';
import '../styles/ManageGroupPage.css';

/*──────────────────────── helpers ────────────────────────*/
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
    profileId : o.id,                 // id teacher/student-профиля
    userId    : o.user_id || o.id,    // id User
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

/*──────────────────────── component ────────────────────────*/
export default function ManageGroupPage() {
  const { user } = useAuth();
  const nav      = useNavigate();

  /* ---------- state ---------- */
  const [groups,   setGroups]   = useState([]);
  const [students, setStudents] = useState([]); const [stuLoaded, setSL] = useState(false);
  const [teachers, setTeachers] = useState([]); const [teaLoaded, setTL] = useState(false);
  const [courses,  setCourses]  = useState([]); const [couLoaded, setCL] = useState(false);

  const [newF, setNewF] = useState({ name:'', description:'', start_date:'', end_date:'' });
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

  /*──────── initial groups load ────────*/
  useEffect(() => { (async () => {
    const brief = (await getAllGroups(100, 0)).objects || [];
    const full  = await Promise.all(
      brief.map(async g => normalizeGroup((await api.get(`/groups/${g.id}`)).data))
    );
    setGroups(full);
  })(); }, []);

  /*──────── lazy lists ────────*/
  const loadStu = async () => { if (stuLoaded) return;
    const list = await getAllUsers({ role:'student', limit:100, offset:0 });
    setStudents(list.map(mapUserObj)); setSL(true);
  };
  const loadTea = async () => { if (teaLoaded) return;
    const list = await getAllUsers({ role:'teacher', limit:100, offset:0 });
    setTeachers(list.map(mapUserObj)); setTL(true);
  };
  const loadCou = async () => { if (couLoaded) return;
    const data = await getAllCourses(100, 0);
    setCourses(data.objects || []); setCL(true);
  };

  /*──────── refresh one group ────────*/
  const refresh = useCallback(async id =>
    normalizeGroup((await api.get(`/groups/${id}`)).data)
  , []);

  /*──────────────── CREATE / UPDATE / DELETE GROUP ────────────────*/
  const createGrp = async () => {
    if (!newF.name.trim()) { setErrs({ name:'Название обязательно' }); return; }
    try {
      const g   = await createGroup({
        ...newF,
        start_date: newF.start_date || null,
        end_date  : newF.end_date   || null
      });
      const obj = await refresh(g.id);
      setGroups(gs => [...gs, obj]);
      setNewF({ name:'', description:'', start_date:'', end_date:'' });
      setErrs({});
    } catch { alert('Ошибка создания группы'); }
  };

  const delGrp = async id => {
    if (!window.confirm('Удалить группу?')) return;
    try { await deleteGroup(id); setGroups(gs => gs.filter(g => g.id !== id)); }
    catch { alert('Не удалось удалить группу'); }
  };

  const open = g => {
    setSel(g);
    setEdit({
      name       : g.name,
      description: g.description || '',
      start_date : g.start_date  || '',
      end_date   : g.end_date    || ''
    });
    setAddStu(false); setAddTea(false); setAddCou(false);
    setShow(true);
  };
  const close = () => { setShow(false); setSel(null); };

  const save = async () => {
    if (!sel) return;
    const body = {};
    ['name','description','start_date','end_date'].forEach(f=>{
      if ((sel[f]||'') !== (edit[f]||'')) body[f] = edit[f] || null;
    });
    if (!Object.keys(body).length) return;
    try {
      await updateGroup(sel.id, body);
      let fr = await refresh(sel.id);

      /* после PUT teacher может обнулиться; вернём обратно, если был */
      if (!fr.teacher && sel.teacher) {
        await addTeacherToGroup(sel.id, sel.teacher.id);
        fr = await refresh(sel.id);
      }
      setSel(fr); setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
    } catch { alert('Не удалось сохранить'); }
  };
  const changed = sel && ['name','description','start_date','end_date']
    .some(f => (sel[f]||'') !== (edit[f]||''));

  /*──────────────────── filters ───────────────────*/
  const filterArr = (arr,q,fn)=>{ const s=q.trim().toLowerCase(); return s?arr.filter(a=>fn(a).includes(s)):arr.slice(0,100); };

  const fStu = useMemo(()=>sel?filterArr(students,sFil,
    s=>`${s.first_name} ${s.surname} ${s.username}`.toLowerCase())
    .map(s=>({...s,already:new Set(sel.students.map(st=>st.id)).has(s.profileId)})):[],[students,sel,sFil]);

  const fTea = useMemo(()=>sel&&!sel.teacher?filterArr(teachers,tFil,
    t=>`${t.first_name} ${t.surname} ${t.username}`.toLowerCase()):[],[teachers,sel,tFil]);

  const fCou = useMemo(()=>sel?filterArr(courses,cFil,c=>c.name.toLowerCase())
    .map(c=>({...c,already:new Set(sel.courses.map(cc=>cc.id)).has(c.id)})):[],[courses,sel,cFil]);

  /*──────────────────── STUDENTS ───────────────────*/
  const addStudents = async () => {
    if (!chk.size) return;
    const ids = [];
    for (const uid of chk) {
      const profile = await findStudentByUser(uid);
      if (!profile){ alert(`У пользователя ${uid} нет Student-профиля`); return; }
      ids.push(profile.id);
    }
    try {
      await addStudentsToGroup(sel.id, { students_id: ids });
      const fr = await refresh(sel.id);
      setSel(fr); setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      setChk(new Set()); setSFil(''); setAddStu(false);
    } catch { alert('Не удалось добавить студентов'); }
  };

  const rmStudent = async sid => {
    if (!window.confirm('Удалить студента?')) return;
    try {
      await removeStudentFromGroup(sel.id, sid);
      const fr = await refresh(sel.id);
      setSel(fr); setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
    } catch { alert('Не удалось удалить студента'); }
  };

  /*──────────────────── TEACHER ───────────────────*/
  const assignTeacher = async () => {
    if (!chosenT) return;
    const profile = await findTeacherByUser(chosenT);
    if (!profile){ alert('У выбранного пользователя нет Teacher-профиля'); return; }
    try {
      await addTeacherToGroup(sel.id, profile.id);
      const fr = await refresh(sel.id);
      setSel(fr); setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      setChosenT(null); setAddTea(false); setTFil('');
    } catch(e){
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
      setSel(fr); setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
    } catch { alert('Не удалось удалить преподавателя'); }
  };

  /*──────────────────── COURSES ───────────────────*/
  const addCourse = async () => {
    if (!chosenC) return;
    try {
      await attachCourseToGroup(chosenC, sel.id);   // backend создаёт lesson-groups
      const fr = await refresh(sel.id);             // ← курсы придут от API
      setSel(fr); setGroups(gs => gs.map(g => g.id === fr.id ? fr : g));
      setChosenC(null); setAddCou(false); setCFil('');
    } catch(e){
      if(e.message==='NO_LESSONS')      alert('У курса нет уроков – добавьте хотя бы один.');
      else if(e.response?.status===409) alert('Часть уроков уже привязана к группе');
      else                              alert('Не удалось привязать курс');
    }
  };

  /*──────────────────── UI helpers ───────────────────*/
  const fio = [user.first_name,user.surname,user.patronymic].filter(Boolean).join(' ');

  /*──────────────────── RENDER ───────────────────*/
  return (
    <div className="groups-page app-layout">
      <Sidebar activeItem="manage-groups" userRole={user.role}/>
      <div className="main-content">
        <Topbar
          userName={fio}
          userRole={user.role}
          notifications={0}
          onBellClick={()=>{}}
          onProfileClick={()=>nav('/profile')}
        />

        {/*–— header –—*/}
        <h1>Управление группами</h1>

        {/*–— create group –—*/}
        <div className="create-group-block">
          <h2>Создать группу</h2>
          <div className="create-group-form">
            {['name','description','start_date','end_date'].map(f=>(
              <div className="field" key={f}>
                <label>{f.replace('_',' ')}</label>
                {f==='description'
                  ? <textarea value={newF[f]}
                              onChange={e=>setNewF(s=>({...s,[f]:e.target.value}))}/>
                  : <input type={f.includes('date')?'date':'text'}
                           className={f.includes('date')?'date-small':''}
                           value={newF[f]}
                           onChange={e=>setNewF(s=>({...s,[f]:e.target.value}))}/>}
                {f==='name' && errs.name && <div className="error-text">{errs.name}</div>}
              </div>
            ))}
            <button className="btn-primary" onClick={createGrp}>Создать</button>
          </div>
        </div>

        {/*–— list of groups –—*/}
        <div className="groups-list-block">
          <h2>Список групп</h2>
          <div className="groups-list">
            {groups.map(g=>(
              <div className="group-card" key={g.id}>
                <div className="group-info">
                  <h3 className="group-name">{g.name}</h3>
                  <p  className="group-desc">{g.description||'—'}</p>
                  <p  className="group-meta">
                    Преподаватель:&nbsp;
                    {g.teacher ? `${g.teacher.first_name} ${g.teacher.surname}` : '—'}
                    {' • '}Студентов: {g.students.length}
                  </p>
                </div>
                <div className="group-actions">
                  <button className="btn-secondary" onClick={() => open(g)}>Управлять</button>
                  <button className="btn-danger"    onClick={() => delGrp(g.id)}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/*–— modal –—*/}
        {show && sel && (
          <div className="modal-overlay">
            <div className="modal-content large">

              {/* header */}
              <div className="modal-header">
                <h2>{sel.name}</h2>
                <button className="close-modal" onClick={close}>×</button>
              </div>

              {/* body */}
              <div className="modal-body grid">

                {/* panel: parameters */}
                <div className="panel parameters">
                  <h3>Параметры</h3>
                  {['name','description','start_date','end_date'].map(f=>(
                    <div className="field" key={f}>
                      <label>{f.replace('_',' ')}</label>
                      {f==='description'
                        ? <textarea value={edit[f]}
                                    onChange={e=>setEdit(s=>({...s,[f]:e.target.value}))}/>
                        : <input type={f.includes('date')?'date':'text'}
                                 className={f.includes('date')?'date-small':''}
                                 value={edit[f]}
                                 onChange={e=>setEdit(s=>({...s,[f]:e.target.value}))}/>}
                    </div>
                  ))}
                  <button className="btn-primary" disabled={!changed}
                          style={{opacity:changed?1:0.55}} onClick={save}>Сохранить</button>
                </div>

                {/* panel: members */}
                <div className="panel members">

                  {/*─ teacher ─*/}
                  <div className="section">
                    <div className="section-header">
                      <h3>Преподаватель</h3>
                      {!sel.teacher && (
                        <button className="btn-mini" onClick={async()=>{
                          const n=!addTea; setAddTea(n); setAddStu(false); setAddCou(false);
                          if(n) await loadTea();
                        }}>
                          {addTea?'Отмена':'Добавить'}
                        </button>
                      )}
                    </div>

                    {sel.teacher ? (
                      <div className="member-item">
                        <span>{sel.teacher.first_name} {sel.teacher.surname} ({sel.teacher.username})</span>
                        <button className="remove-btn" onClick={()=>rmTeacher(sel.teacher.id)}>×</button>
                      </div>
                    ) : addTea && (
                      <div className="add-panel">
                        <input placeholder="Фильтр…" value={tFil} onChange={e=>setTFil(e.target.value)}/>
                        <div className="scroll-list">
                          {teaLoaded
                            ? fTea.length ? fTea.map(t=>(
                                <label key={t.profileId}
                                       className={`row-select ${chosenT===t.userId?'selected':''}`}>
                                  <input type="radio" name="teacher"
                                         checked={chosenT===t.userId}
                                         onChange={()=>setChosenT(t.userId)}/>
                                  {hi(`${t.first_name} ${t.surname}`,tFil)} ({hi(t.username,tFil)})
                                </label>
                              )) : <div className="empty-text">Список пуст</div>
                            : <div className="empty-text">Загрузка…</div>}
                        </div>
                        <button className="btn-primary" disabled={!chosenT} onClick={assignTeacher}>
                          Назначить
                        </button>
                      </div>
                    )}
                  </div>

                  {/*─ students ─*/}
                  <div className="section">
                    <div className="section-header">
                      <h3>Студенты</h3>
                      <button className="btn-mini" onClick={async()=>{
                        const n=!addStu; setAddStu(n); setAddTea(false); setAddCou(false);
                        if(n) await loadStu();
                      }}>
                        {addStu?'Отмена':'Добавить'}
                      </button>
                    </div>

                    {addStu && (
                      <div className="add-panel">
                        <input placeholder="Фильтр…" value={sFil} onChange={e=>setSFil(e.target.value)}/>
                        <div className="scroll-list">
                          {stuLoaded
                            ? fStu.length ? fStu.map(s=>(
                                (s.username||s.first_name||s.surname) && (
                                  <label key={s.profileId}
                                         className={`row-select ${
                                           s.already?'disabled':chk.has(s.userId)?'selected':''
                                         }`}>
                                    <input type="checkbox" disabled={s.already}
                                           checked={chk.has(s.userId)}
                                           onChange={e=>{
                                             setChk(prev=>{
                                               const out=new Set(prev);
                                               e.target.checked?out.add(s.userId):out.delete(s.userId);
                                               return out;
                                             });
                                           }}/>
                                    {hi(`${s.first_name} ${s.surname}`.trim(),sFil)} ({hi(s.username,sFil)})
                                    {s.already && ' — уже в группе'}
                                  </label>
                                )
                              )) : <div className="empty-text">Список пуст</div>
                            : <div className="empty-text">Загрузка…</div>}
                        </div>
                        <button className="btn-primary" disabled={chk.size===0} onClick={addStudents}>
                          Добавить {chk.size?`(${chk.size})`:''}
                        </button>
                      </div>
                    )}

                    <div className="members-list">
                      {sel.students.length ? sel.students.map(st=>(
                        <div className="member-item" key={st.id}>
                          <span>{st.first_name} {st.surname} ({st.username})</span>
                          <button className="remove-btn" onClick={()=>rmStudent(st.id)}>×</button>
                        </div>
                      )) : <p className="empty-text">Студентов нет</p>}
                    </div>
                  </div>

                  {/*─ courses ─*/}
                  <div className="section">
                    <div className="section-header">
                      <h3>Курсы</h3>
                      <button className="btn-mini" onClick={async()=>{
                        const n=!addCou; setAddCou(n); setAddStu(false); setAddTea(false);
                        if(n) await loadCou();
                      }}>
                        {addCou?'Отмена':'Добавить'}
                      </button>
                    </div>

                    {/* уже привязанные */}
                    <div className="members-list">
                      {sel.courses.length ? sel.courses.map(c=>(
                        <div className="member-item course" key={c.id}>
                          <span>{c.name}</span>
                        </div>
                      )) : <p className="empty-text">Курсы не добавлены</p>}
                    </div>

                    {/* выбор нового */}
                    {addCou && (
                      <div className="add-panel">
                        <input placeholder="Фильтр…" value={cFil} onChange={e=>setCFil(e.target.value)}/>
                        <div className="scroll-list">
                          {couLoaded
                            ? fCou.length ? fCou.map(c=>(
                                <label key={c.id}
                                       className={`row-select ${
                                         c.already?'disabled':chosenC===c.id?'selected':''
                                       }`}>
                                  <input type="radio" disabled={c.already}
                                         checked={chosenC===c.id}
                                         onChange={()=>setChosenC(c.id)}/>
                                  {hi(c.name,cFil)}
                                  {c.already && ' — уже привязан'}
                                </label>
                              )) : <div className="empty-text">Список пуст</div>
                            : <div className="empty-text">Загрузка…</div>}
                        </div>
                        <button className="btn-primary" disabled={!chosenC} onClick={addCourse}>
                          Добавить
                        </button>
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
