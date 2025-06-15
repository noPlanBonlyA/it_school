import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { AuthContext } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  const handleSubmit = async e => {
    e.preventDefault();
    setToast({ message: '', type: 'error' });

    try {
      const userData = await login({ username, password, remember });
      setUser(userData);
      navigate('/home');
    } catch (err) {
      let msg = 'Неизвестная ошибка';
      if (!err.response) {
        msg = 'Сервер недоступен или CORS.';
      } else if (err.response.status === 404) {
        msg = 'Пользователь с таким логином не найден';
      } else if (err.response.status === 401) {
        msg = 'Неверный пароль';
      } else {
        // если detail — массив с объектами { loc, msg, type, input }
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          // возьмём все тексты ошибок и соединим их
          msg = detail.map(item => item.msg).join('; ');
        } else if (typeof detail === 'string') {
          msg = detail;
        } else {
          msg = err.response.data.detail || err.message;
        }
      }
      setToast({ message: msg, type: 'error' });
    }
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

          {/* Логин */}
          <div className="input-group">
            <label htmlFor="login-username">Логин</label>
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

          {/* Пароль */}
          <div className="input-group">
            <div className="password-header">
              <label htmlFor="login-password">Пароль</label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => navigate('/forgot-password')}
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
                {showPassword ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5S14.49 16.5 12 16.5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M12 6a9.77 9.77 0 0 1 8.96 5A9.77 9.77 0 0 1 12 16a9.77 9.77 0 0 1-8.96-5A9.77 9.77 0 0 1 12 6m0-2C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 5a3 3 0 0 0 0 6 3 3 0 0 0 0-6z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Запомнить пароль */}
          <div className="remember-group">
            <input
              id="remember"
              type="checkbox"
              className="remember-checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" className="remember-label">
              Запомнить пароль
            </label>
          </div>

          {/* Кнопка Войти */}
          <button type="submit" className="submit-btn">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
