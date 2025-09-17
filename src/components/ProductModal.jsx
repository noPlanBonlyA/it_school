// src/components/ProductModal.jsx

import React, { useState, useEffect } from 'react';
import './ProductModal.css';

const ProductModal = ({ 
  isOpen, 
  onClose, 
  product,
  form,
  setForm,
  imageFile,
  setImageFile,
  previewUrl,
  setPreviewUrl,
  errors,
  saving = false,
  onSubmit,
  onImageChange
}) => {
  // Блокировка скролла
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(event);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="product-modal-overlay" onClick={handleOverlayClick}>
      <div className="product-modal">
        <div className="product-modal-header">
          <h2>{product ? 'Редактировать товар' : 'Создать товар'}</h2>
          <button 
            className="product-modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="product-modal-form">
          <div className="product-modal-body">
            <div className="product-form-group">
              <label>Название товара *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className={errors.name ? 'error' : ''}
                placeholder="Введите название товара"
              />
              {errors.name && <span className="product-error-text">{errors.name}</span>}
            </div>

            <div className="product-form-group">
              <label>Описание *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className={errors.description ? 'error' : ''}
                placeholder="Введите описание товара"
                rows={3}
              />
              {errors.description && <span className="product-error-text">{errors.description}</span>}
            </div>

            <div className="product-form-group">
              <label>Цена (в монетах) *</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({...form, price: e.target.value})}
                className={errors.price ? 'error' : ''}
                placeholder="Введите цену"
              />
              {errors.price && <span className="product-error-text">{errors.price}</span>}
            </div>

            <div className="product-form-group">
              <label className="product-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={(e) => setForm({...form, is_pinned: e.target.checked})}
                />
                <span className="product-checkbox-text">Закрепить товар (отображать в начале списка)</span>
              </label>
            </div>

            <div className="product-form-group">
              <label>Изображение товара {!product && '*'}</label>
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className={errors.image ? 'error' : ''}
              />
              {errors.image && <span className="product-error-text">{errors.image}</span>}
              {previewUrl && (
                <div className="product-image-preview">
                  <img src={previewUrl} alt="Предпросмотр" />
                </div>
              )}
            </div>
          </div>

          <div className="product-modal-footer">
            <button 
              type="submit" 
              className="product-btn product-btn-primary"
              disabled={saving}
            >
              {saving ? 'Сохранение...' : (product ? 'Обновить' : 'Создать')}
            </button>
            <button 
              type="button" 
              className="btn-primary"
            style={{ backgroundColor: '#e40b0bff'}}
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
