// src/components/ConfirmModal.jsx

import React from 'react';
import '../styles/ConfirmModal.css';

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

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'success':
        return '✅';
      default:
        return '❓';
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      case 'success':
        return 'btn-success';
      default:
        return 'btn-primary';
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className="confirm-icon">{getIcon()}</div>
          <h3 className="confirm-title">{title}</h3>
        </div>
        
        <div className="confirm-modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`btn ${getConfirmButtonClass()}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
