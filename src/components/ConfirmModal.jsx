// src/components/ConfirmModal.jsx

import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Подтверждение", 
  message, 
  confirmText = "Да", 
  cancelText = "Отмена",
  type = "default" // default, danger, warning, success
}) {
  if (!isOpen) return null;

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'confirm-btn confirm-btn-danger';
      case 'warning':
        return 'confirm-btn confirm-btn-danger';
      case 'success':
        return 'confirm-btn confirm-btn-primary';
      default:
        return 'confirm-btn confirm-btn-primary';
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
        </div>
        
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button
            className="confirm-btn confirm-btn-secondary"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={getConfirmButtonClass()}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
