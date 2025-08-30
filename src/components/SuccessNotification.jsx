// src/components/SuccessNotification.jsx
import React, { useEffect } from 'react';
import '../styles/SuccessNotification.css';

export default function SuccessNotification({ 
  isOpen, 
  onClose, 
  title = "Успешно!", 
  message,
  autoClose = true,
  duration = 3000 
}) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div className="success-notification-overlay" onClick={onClose}>
      <div className="success-notification" onClick={e => e.stopPropagation()}>
        <div className="success-content">
          <h3 className="success-title">{title}</h3>
          <p className="success-message">{message}</p>
        </div>
        
        <button className="success-ok-btn" onClick={onClose}>
          ОК
        </button>
      </div>
    </div>
  );
}
