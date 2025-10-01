// src/components/SuccessModal.jsx
import React, { useEffect } from 'react';
import '../styles/SuccessModal.css';

export default function SuccessModal({ 
  isOpen, 
  onClose, 
  title = 'Успешно!', 
  message,
  autoCloseDelay = 3000 
}) {
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="success-modal-overlay">
      <div className="success-modal-content">
        <div className="success-modal-header">
          <h2>{title}</h2>
        </div>
        
        <div className="success-modal-body">
          <p className="success-message">{message}</p>
        </div>
        
        <div className="success-modal-actions">
          <button 
            className="btn-success-ok"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
