import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios  from 'axios';
import Toast  from '../components/Toast';
import '../styles/PasswordReset.css';

export default function ResetPassword() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { token: paramToken } = useParams();   // берём токен из URL-параметра, если есть

  const [token, setToken]                     = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast]                     = useState({ message: '', type: 'info' });

  const API_BASE = 'http://localhost:8080';

  useEffect(() => {
    // 1) Пытаемся взять токен из URL-параметра   /reset-password/:token
    if (paramToken) {
      setToken(paramToken);
      return;
    }

    // 2) Если его там нет — пробуем достать ?token=... из query-строки
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setToast({ message: 'Неверная ссылка или отсутствие токена.', type: 'error' });
    }
  }, [location.search, paramToken]);

  const handleSubmit = async e => {
    e.preventDefault();
    setToast({ message: '', type: 'info' });

    if (newPassword !== confirmPassword) {
      setToast({ message: 'Пароли не совпадают.', type: 'error' });
      return;
    }
    if (!token) {
      setToast({ message: 'Токен не найден.', type: 'error' });
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/users/confirm_reset_password`, {
        token,
        new_password: newPassword,
      });
      setToast({
        message: 'Пароль успешно сброшен. Через 3 с перенаправим на вход.',
        type: 'info'
      });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg =
        err.response?.status === 422
          ? 'Неверный токен или некорректные данные.'
          : 'Ошибка при сбросе пароля.';
      setToast({ message: msg, type: 'error' });
    }
  };

  return (
    <div className="login-container">
      <div className="login-background" />
      <div className="login-box">

        {/* Тост уведомлений */}
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />

        <h2 className="reset-title">Сброс пароля</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="new-password">Новый пароль</label>
            <input
              id="new-password"
              type="password"
              className="input-control"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirm-password">Повторите пароль</label>
            <input
              id="confirm-password"
              type="password"
              className="input-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Сменить пароль
          </button>
        </form>

        <button className="back-link" onClick={() => navigate('/login')}>
          Вернуться к входу
        </button>
      </div>
    </div>
  );
}
