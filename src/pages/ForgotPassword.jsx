import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import '../styles/PasswordReset.css';
import api from '../api/axiosInstance';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [toast, setToast]       = useState({ message: '', type: 'info' });

  const handleSubmit = async e => {
    e.preventDefault();
    setToast({ message: '', type: 'info' });
    try {
      await api.post('/users/reset_password', { username, email });  // ✅ Правильный эндпоинт согласно API
      setToast({
        message: 'Если пользователь существует, ссылка для сброса пароля отправлена на почту.',
        type: 'info'
      });
    } catch (err) {
      const msg =
        err.response?.status === 422
          ? 'Проверьте правильность введённых данных.'
          : 'Ошибка при запросе сброса пароля.';
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
          onClose={() => setToast({ message: '', type: 'info' })}
        />

        <h2 className="reset-title">Восстановление пароля</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="reset-username">Логин</label>
            <input
              id="reset-username"
              type="text"
              className="input-control"
              placeholder="ivan_ivanov"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              className="input-control"
              placeholder="ivan_ivanov@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="submit-btn">
            Отправить ссылку
          </button>
        </form>
        <button className="back-link" onClick={() => navigate('/login')}>
          Вернуться к входу
        </button>
      </div>
    </div>
  );
}
