// src/pages/ImpersonatePage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers } from '../services/userService';
import { impersonateUser } from '../services/authService';
import SmartTopBar from '../components/SmartTopBar';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import { useConfirm } from '../hooks/useConfirm';
import '../styles/ImpersonatePage.css';

export default function ImpersonatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirmState, showConfirm } = useConfirm();

  // Состояния
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');

  // Проверка прав доступа
  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Загрузка пользователей
  useEffect(() => {
    loadUsers();
  }, []);

  // Фильтрация пользователей
  useEffect(() => {
    let result = users;

    // Фильтр по роли
    if (selectedRole !== 'all') {
      result = result.filter(u => u.role === selectedRole);
    }

    // Поиск (улучшенный)
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter(u => {
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phone_number || '').toLowerCase();
        const fio = [u.first_name, u.surname, u.patronymic]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        
        return username.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchLower) ||
               fio.includes(searchLower);
      });
    }

    setFiltered(result);
  }, [users, search, selectedRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Загружаем всех пользователей постранично
      const allUsers = [];
      for (let offset = 0; ; offset += 100) {
        const response = await getAllUsers({ limit: 100, offset });
        const users = Array.isArray(response) ? response : (response?.objects || []);
        allUsers.push(...users);
        if (users.length < 100) break;
      }
      setUsers(allUsers);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (userId, userName) => {
    const confirmed = await showConfirm({
      title: "🎭 Магический вход",
      message: `Вы уверены, что хотите войти под пользователем "${userName}"?`,
      confirmText: "Войти",
      cancelText: "Отмена",
      type: "warning"
    });

    if (!confirmed) return;

    try {
      setImpersonating(true);
      await impersonateUser(userId);
      
      // Перезагружаем страницу для применения новых токенов
      window.location.href = '/';
    } catch (error) {
      console.error('Ошибка входа под пользователем:', error);
      
      await showConfirm({
        title: "❌ Ошибка",
        message: "Не удалось войти под пользователем. Попробуйте еще раз.",
        confirmText: "OK",
        cancelText: "",
        type: "danger"
      });
    } finally {
      setImpersonating(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'student': 'Студент',
      'teacher': 'Преподаватель',
      'admin': 'Администратор',
      'superadmin': 'Супер-администратор'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'student': '#10b981',
      'teacher': '#3b82f6',
      'admin': '#f59e0b',
      'superadmin': '#ef4444'
    };
    return colors[role] || '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getUserDisplayName = (userData) => {
    const parts = [userData.first_name, userData.surname].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : userData.username;
  };

  return (
    <div className="app-layout">
      <Sidebar activeItem="impersonate" userRole={user?.role} />
      <div className="main-content">
        <SmartTopBar pageTitle="Магия" />
        
        <div className="impersonate-page">
          <div className="page-header">
            <h1>Магия</h1>
            <p>Вход под другими пользователями</p>
          </div>

          <div className="controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск по имени, email, телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              <div className="search-icon">🔍</div>
            </div>

            <div className="role-filter">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="role-select"
              >
                <option value="all">Все роли</option>
                <option value="student">Студенты</option>
                <option value="teacher">Преподаватели</option>
                <option value="admin">Администраторы</option>
                <option value="superadmin">Супер-администраторы</option>
              </select>
            </div>
          </div>

          <div className="users-stats">
            <div className="stat-item">
              <span className="stat-number">{filtered.length}</span>
              <span className="stat-label">найдено</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{users.length}</span>
              <span className="stat-label">всего</span>
            </div>
          </div>

          <div className="users-grid">
            {filtered.length > 0 ? (
              filtered.map(u => (
                <div key={u.id} className="user-card">
                  <div className="user-avatar">
                    {u.photo?.url ? (
                      <img src={u.photo.url} alt={getUserDisplayName(u)} />
                    ) : (
                      <div className="avatar-placeholder">
                        {getUserDisplayName(u).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="user-info">
                    <h3 className="user-name">{getUserDisplayName(u)}</h3>
                    <p className="user-username">@{u.username}</p>
                    
                    <div className="user-details">
                      <div className="detail-item">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{u.email}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Телефон:</span>
                        <span className="detail-value">{u.phone_number || 'Не указан'}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Дата рождения:</span>
                        <span className="detail-value">{formatDate(u.birth_date)}</span>
                      </div>
                    </div>

                    <div className="user-role">
                      <span 
                        className="role-badge"
                        style={{ backgroundColor: getRoleColor(u.role) }}
                      >
                        {getRoleDisplayName(u.role)}
                      </span>
                    </div>
                  </div>

                  <div className="user-actions">
                    <button
                      onClick={() => handleImpersonate(u.id, getUserDisplayName(u))}
                      disabled={impersonating || u.id === user?.id}
                      className="impersonate-btn"
                    >
                      {impersonating ? (
                        <>
                          <div className="btn-spinner"></div>
                          Вхожу...
                        </>
                      ) : (
                        <>
                          🎭 Войти под пользователем
                        </>
                      )}
                    </button>
                    
                    {u.id === user?.id && (
                      <span className="current-user-badge">
                        Это вы
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : !loading && (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>Пользователи не найдены</h3>
                <p>Попробуйте изменить поисковый запрос или фильтр</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={confirmState.onCancel}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </div>
  );
}
