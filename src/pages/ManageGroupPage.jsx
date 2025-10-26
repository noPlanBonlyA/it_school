/*  src/pages/ManageGroupPage.jsx  */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import GroupScheduleInfo from '../components/GroupScheduleInfo';
import { useAuth } from '../contexts/AuthContext';

import {
  getAllGroups, createGroup, deleteGroup
} from '../services/groupService';

import api from '../api/axiosInstance';
import '../styles/ManageUserPage.css';
import '../styles/ManageGroupPage.css';
import '../styles/ManageGroupPage-mobile.css';
import '../styles/MobileFixes.css';
import '../styles/MobileKeyboardFix.css';

import { useMobileKeyboard } from '../hooks/useMobileKeyboard';

/* ─────────────────── helpers ────────────────────────*/
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

  // Хук для обработки мобильной клавиатуры
  useMobileKeyboard();

  /* ------ state ---------- */
  const [groups,   setGroups]   = useState([]);

  const [newF, setNewF] = useState({ name:'', description:'' });
  const [errs, setErrs] = useState({});

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

  /* ────────── CREATE GROUP ────────────────*/
  const createGrp = async () => {
    if (!newF.name.trim()) { setErrs({ name:'Название обязательно' }); return; }
    if (newF.name.trim().length > 20) { setErrs({ name:'Название не должно превышать 20 символов' }); return; }
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
      // Обновляем список групп, добавляя новую группу
      setGroups(gs => [...gs, normalizeGroup(g)]);
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

  const openGroupDetail = (groupId) => {
    nav(`/groups/${groupId}`);
  };

  /* ────────────── RENDER ───────────────────*/
  return (
    <div className="groups-page app-layout manage-users manage-groups" style={{ width: '100vw', minHeight: '100vh' }}>
      <Sidebar activeItem="manage-groups" userRole={user.role}/>
      <div className="main-content" style={{ marginLeft: '250px', width: 'calc(100vw - 250px)', maxWidth: 'none' }}>
        <SmartTopBar pageTitle="Управление группами" />

        <div className="content-area" style={{ maxWidth: 'none', padding: '20px 40px', width: '100%' }}>
          {/* Статистика */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px', 
            marginBottom: '30px',
            width: '100%'
          }}>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '12px', 
              textAlign: 'center',
              border: '1px solid #dbeafe'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af' }}>{groups.length}</div>
              <div style={{ fontSize: '14px', color: '#1e40af', marginTop: '4px' }}>Всего групп</div>
            </div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f0fdf4', 
              borderRadius: '12px', 
              textAlign: 'center',
              border: '1px solid #dcfce7'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#166534' }}>
                {groups.reduce((sum, g) => sum + g.students.length, 0)}
              </div>
              <div style={{ fontSize: '14px', color: '#166534', marginTop: '4px' }}>Всего студентов</div>
            </div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '12px', 
              textAlign: 'center',
              border: '1px solid #fde68a'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#92400e' }}>
                {groups.filter(g => g.teacher).length}
              </div>
              <div style={{ fontSize: '14px', color: '#92400e', marginTop: '4px' }}>Групп с преподавателями</div>
            </div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#fdf2f8', 
              borderRadius: '12px', 
              textAlign: 'center',
              border: '1px solid #fce7f3'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#be185d' }}>
                {groups.reduce((sum, g) => sum + (g.courses?.length || 0), 0)}
              </div>
              <div style={{ fontSize: '14px', color: '#be185d', marginTop: '4px' }}>Всего курсов</div>
            </div>
          </div>

          {/*— create group —*/}
          <div className="block create-group-block" style={{ marginBottom: '30px', width: '100%' }}>
            <div className="create-group-header">
              <h2>Создать новую группу</h2>
            </div>
            <div className="create-group-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start', width: '100%' }}>
              <div>
                <div className="field">
                  <label>Название группы</label>
                  <input 
                    type="text"
                    value={newF.name}
                    onChange={e=>setNewF(s=>({...s,name:e.target.value}))}
                    placeholder="Введите название группы"
                    maxLength={20}
                    style={{ width: '100%', padding: '12px', fontSize: '16px' }}
                  />
                  {errs.name && <div className="error-text">{errs.name}</div>}
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {newF.name.length}/20 символов
                  </div>
                </div>
                <div className="field">
                  <label>Описание группы</label>
                  <textarea 
                    value={newF.description}
                    onChange={e=>setNewF(s=>({...s,description:e.target.value}))}
                    placeholder="Введите описание группы (необязательно)"
                    rows="5"
                    style={{ width: '100%', padding: '12px', fontSize: '16px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ marginTop: '20px' }}>
                  <button 
                    className="create-group-btn" 
                    onClick={createGrp} 
                    disabled={!newF.name.trim()}
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '16px',
                      opacity: !newF.name.trim() ? 0.5 : 1,
                      cursor: !newF.name.trim() ? 'not-allowed' : 'pointer',
                      backgroundColor: !newF.name.trim() ? '#9ca3af' : ''
                    }}
                  >
                    Создать группу
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(0, 177, 143, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(0, 177, 143, 0.1)' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
                    Заполните название группы и при желании добавьте описание, затем нажмите кнопку создания
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/*— list of groups —*/}
          <div className="block groups-list-block" style={{ width: '100%' }}>
            <div className="groups-list-header">
              <h2>Управление группами</h2>
            </div>
            <div className="groups-list" style={{ width: '100%' }}>
              {groups.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '25px', width: '100%' }}>
                  {groups.map(g=>(
                    <div className="group-card" key={g.id} style={{ padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
                      <div className="group-info" style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '20px', marginBottom: '12px', color: '#1f2937' }}>{g.name}</h3>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', minHeight: '40px' }}>
                          {g.description || 'Описание отсутствует'}
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Преподаватель</div>
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>
                              {g.teacher ? `${g.teacher.first_name} ${g.teacher.surname}` : 'Не назначен'}
                            </div>
                          </div>
                          <div style={{ padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Участники</div>
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>
                              {g.students.length} студентов • {g.courses?.length || 0} курсов
                            </div>
                          </div>
                        </div>
                        
                        {/* Дополнительная информация */}
                        {g.students.length > 0 && (
                          <div style={{ padding: '8px', backgroundColor: '#eff6ff', borderRadius: '6px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>Студенты группы</div>
                            <div style={{ fontSize: '13px', color: '#1e40af' }}>
                              {g.students.slice(0, 3).map(s => `${s.first_name} ${s.surname}`).join(', ')}
                              {g.students.length > 3 && ` и ещё ${g.students.length - 3}`}
                            </div>
                          </div>
                        )}
                        
                        {/* Информация о расписании группы */}
                        <div style={{ marginTop: '12px' }}>
                          <GroupScheduleInfo group={g} compact={true} />
                        </div>
                      </div>
                      <div className="group-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                          className="btn-primary group-manage-btn" 
                          onClick={() => openGroupDetail(g.id)}
                          style={{ flex: '1 1 auto', minWidth: 'fit-content', padding: '10px 16px', fontSize: '14px' }}
                        >
                          Управлять
                        </button>
                        <button 
                          className="btn-primary group-delete-btn" 
                          onClick={() => delGrp(g.id)}
                          style={{ flex: '0 1 auto', minWidth: 'fit-content', padding: '10px 16px', fontSize: '14px', backgroundColor:'#e90b0bff'}}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ 
                  padding: '60px 40px', 
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  border: '2px dashed #d1d5db'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '18px' }}>Группы не созданы</h3>
                  <p style={{ color: '#9ca3af', fontSize: '16px' }}>Создайте первую группу, используя форму выше</p>
                  <div style={{ marginTop: '20px' }}>
                    <button 
                      className="btn-primary" 
                      onClick={() => document.querySelector('input[placeholder="Введите название группы"]')?.focus()}
                      style={{ padding: '10px 20px' }}
                    >
                      Создать первую группу
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}