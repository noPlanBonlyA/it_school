// src/components/Toast.jsx
import React, { useEffect } from 'react';
import '../styles/Toast.css';

export default function Toast({ message, type = 'error', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast--${type}`}>
      <svg className="toast__icon" viewBox="0 0 24 24">
        <path
          d="M12,2A10,10,0,1,0,22,12,10.011,10.011,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8.009,8.009,0,0,1,12,20Zm-.5-13h1v6h-1Zm0,8h1v1h-1Z"
        />
      </svg>
      <span className="toast__text">{message}</span>
      <button className="toast__close" onClick={onClose}>&times;</button>
    </div>
  );
}
