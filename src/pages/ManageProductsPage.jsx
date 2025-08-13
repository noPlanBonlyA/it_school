// src/pages/ManageProductsPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../services/productService';
import '../styles/ManageProductsPage.css';

export default function ManageProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Состояния
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Форма создания/редактирования
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    is_pinned: false
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  
  // UI состояния
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Проверка прав доступа
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!['admin', 'superadmin'].includes(user.role)) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Загрузка товаров
  useEffect(() => {
    loadProducts();
  }, []);

  // Поиск
  useEffect(() => {
    if (!search.trim()) {
      setFiltered([]);
      setShowSuggestions(false);
    } else {
      const results = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase())
      );
      setFiltered(results);
      setShowSuggestions(true);
    }
  }, [search, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data.objects || []);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', is_pinned: false });
    setImageFile(null);
    setPreviewUrl(null);
    setErrors({});
    setEditingProduct(null);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Название обязательно';
    }
    
    if (!form.description.trim()) {
      newErrors.description = 'Описание обязательно';
    }
    
    if (!form.price || isNaN(form.price) || Number(form.price) < 0) {
      newErrors.price = 'Цена должна быть положительным числом';
    }

    // Проверяем изображение только для создания нового товара
    if (!editingProduct && !imageFile) {
      newErrors.image = 'Изображение обязательно для нового товара';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      
      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        is_pinned: form.is_pinned
      };

      console.log('Submitting product:', productData);
      console.log('Image file:', imageFile);
      
      if (editingProduct) {
        const result = await updateProduct(editingProduct.id, productData, imageFile);
        console.log('Update result:', result);
        alert('Товар успешно обновлен!');
      } else {
        const result = await createProduct(productData, imageFile);
        console.log('Create result:', result);
        alert('Товар успешно создан!');
      }
      
      resetForm();
      setShowCreateForm(false);
      await loadProducts();
      
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка сохранения товара';
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg).join(', ');
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Ошибка: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      is_pinned: product.is_pinned || false
    });
    if (product.photo?.url) {
      setPreviewUrl(product.photo.url);
    }
    setShowCreateForm(true);
  };

  const handleDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await deleteProduct(productToDelete.id);
      alert('Товар успешно удален!');
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Ошибка удаления товара');
    } finally {
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  const getProductImage = (product) => {
    // Отладочная информация
    console.log('Admin - Product photo data:', product.photo);
    
    if (product.photo?.url) {
      const photoUrl = product.photo.url;
      console.log('Admin - Photo URL found:', photoUrl);
      
      // Если URL уже абсолютный, возвращаем как есть
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        return photoUrl;
      }
      // Если относительный путь, добавляем базовый URL
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
      const fullUrl = `${baseURL}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
      console.log('Admin - Generated full URL:', fullUrl);
      return fullUrl;
    }
    
    console.log('Admin - No photo found for product:', product.name);
    return null;
  };

  // Функция сортировки товаров (закрепленные первыми)
  const sortProducts = (productsList) => {
    return [...productsList].sort((a, b) => {
      // Сначала сортируем по is_pinned (закрепленные первыми)
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // Затем по дате создания (новые первыми)
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  const displayedProducts = search.trim() ? sortProducts(filtered) : sortProducts(products);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="manage-products" userRole={user?.role} />
        <div className="main-content">
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка товаров...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="manage-products" userRole={user?.role} />
      <div className="main-content">
        <SmartTopBar />
        <div className="manage-products-page">
          <div className="page-header">
            <button 
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
            >
              Добавить товар
            </button>
          </div>

          {/* Поиск */}
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              {showSuggestions && filtered.length > 0 && (
                <div className="search-suggestions">
                  {filtered.slice(0, 5).map(product => (
                    <div 
                      key={product.id} 
                      className="suggestion-item"
                      onClick={() => {
                        setSearch(product.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {product.name} - {product.price} монет
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Список товаров */}
          <div className="products-grid">
            {displayedProducts.length === 0 ? (
              <div className="empty-state">
                <p>Товары не найдены</p>
              </div>
            ) : (
              displayedProducts.map(product => (
                <div key={product.id} className={`product-card ${product.is_pinned ? 'pinned' : ''}`}>
                  {product.is_pinned && (
                    <div className="pinned-badge">
                      📌 Закреплено
                    </div>
                  )}
                  <div className="product-image">
                    {getProductImage(product) ? (
                      <img src={getProductImage(product)} alt={product.name} />
                    ) : (
                      <div className="image-placeholder">
                        <span>Нет изображения</span>
                      </div>
                    )}
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-price">
                      <span className="price">{product.price} монет</span>
                    </div>
                    <div className="product-actions">
                      <button 
                        className="btn-secondary"
                        onClick={() => handleEdit(product)}
                      >
                        Редактировать
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => handleDelete(product)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Модальное окно создания/редактирования */}
        {showCreateForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingProduct ? 'Редактировать товар' : 'Создать товар'}</h2>
                <button 
                  className="close-modal"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                  <label>Название товара *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className={errors.name ? 'error' : ''}
                    placeholder="Введите название товара"
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Описание *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    className={errors.description ? 'error' : ''}
                    placeholder="Введите описание товара"
                    rows={4}
                  />
                  {errors.description && <span className="error-text">{errors.description}</span>}
                </div>

                <div className="form-group">
                  <label>Цена (в монетах) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({...form, price: e.target.value})}
                    className={errors.price ? 'error' : ''}
                    placeholder="Введите цену"
                  />
                  {errors.price && <span className="error-text">{errors.price}</span>}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.is_pinned}
                      onChange={(e) => setForm({...form, is_pinned: e.target.checked})}
                    />
                    <span className="checkbox-text">Закрепить товар (отображать в начале списка)</span>
                  </label>
                </div>

                <div className="form-group">
                  <label>Изображение товара {!editingProduct && '*'}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={errors.image ? 'error' : ''}
                  />
                  {errors.image && <span className="error-text">{errors.image}</span>}
                  {previewUrl && (
                    <div className="image-preview">
                      <img src={previewUrl} alt="Предпросмотр" />
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Сохранение...' : (editingProduct ? 'Обновить' : 'Создать')}
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Модальное окно подтверждения удаления */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-content small">
              <div className="modal-header">
                <h2>Подтверждение удаления</h2>
              </div>
              <div className="modal-body">
                <p>Вы уверены, что хотите удалить товар "{productToDelete?.name}"?</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-danger"
                  onClick={confirmDelete}
                >
                  Удалить
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setProductToDelete(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
