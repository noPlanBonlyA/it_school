// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate }            from 'react-router-dom';
import { useAuth }                from '../contexts/AuthContext';
import Toast                      from '../components/Toast';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast]         = useState({ message: '', type: 'error' });

  // Если уже залогинены — сразу редирект
  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setToast({ message: '', type: 'error' });
    try {
      await login(username, password);
      navigate('/home', { replace: true });
    } catch (err) {
      let msg = 'Неизвестная ошибка';
      if (!err.response)              msg = 'Сервер недоступен или CORS.';
      else if (err.response.status === 404) msg = 'Пользователь не найден';
      else if (err.response.status === 401) msg = 'Неверный логин или пароль';
      else {
        const detail = err.response.data.detail;
        if (Array.isArray(detail))    msg = detail.map(i => i.msg).join('; ');
        else if (typeof detail === 'string') msg = detail;
        else                          msg = err.response.data.detail || err.message;
      }
      setToast({ message: msg, type: 'error' });
    }
  };

  const handleForgotPassword = () => {
    // Переход на страницу восстановления пароля
    navigate('/forgot-password');
  };

  return (
    <div className="login-container">
      <div className="login-background" />
      <div className="login-box">
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'error' })}
        />

        <h1 className="login-title">Войти в личный кабинет</h1>
        <form className="login-form" onSubmit={handleSubmit}>

          <div className="input-group">
            <label htmlFor="login-username">Введите логин</label>
            <input
              id="login-username"
              type="text"
              className="input-control"
              placeholder="ivan_ivanov@gmail.com"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <div className="password-header">
              <label htmlFor="login-password">Пароль</label>
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={handleForgotPassword}
              >
                Забыли пароль?
              </button>
            </div>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
