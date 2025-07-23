// src/pages/ShopPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import BestCoins from '../components/BestCoin';
import {
  getAvailableProducts,
  getNotAvailableProducts
} from '../services/productService';
import { getCurrentStudent } from '../services/studentService';
import '../styles/ShopPageNew.css';

export default function ShopPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Состояния
  const [studentData, setStudentData] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [notAvailableProducts, setNotAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'not-available'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Проверка прав доступа
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'student') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const studentCoins = studentData?.points || 0;
      
      // Загружаем доступные товары
      const availableData = await getAvailableProducts(studentCoins, 50, 0);
      setAvailableProducts(availableData.objects || []);
      
      // Загружаем недоступные товары
      const notAvailableData = await getNotAvailableProducts(studentCoins, 50, 0);
      setNotAvailableProducts(notAvailableData.objects || []);
      
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [studentData?.points]);

  // Загрузка данных студента
  useEffect(() => {
    loadStudentData();
  }, []);

  // Загрузка товаров при изменении количества монет
  useEffect(() => {
    if (studentData?.points !== undefined) {
      loadProducts();
    }
  }, [studentData?.points, loadProducts]);

  const loadStudentData = async () => {
    try {
      setLoadingCoins(true);
      const student = await getCurrentStudent();
      setStudentData(student);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoadingCoins(false);
    }
  };

  const getProductImage = (product) => {
    if (product.photo?.url) {
      const photoUrl = product.photo.url;
      // Если URL уже абсолютный, возвращаем как есть
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        return photoUrl;
      }
      // Если относительный путь, добавляем базовый URL
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
      return `${baseURL}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
    }
    return null;
  };

  const handlePurchase = (product) => {
    setSelectedProduct(product);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedProduct) return;
    
    // В реальном приложении здесь был бы API вызов для покупки
    alert(`Покупка товара "${selectedProduct.name}" за ${selectedProduct.price} монет будет реализована в следующих версиях`);
    setShowPurchaseModal(false);
    setSelectedProduct(null);
  };

  const canAfford = (product) => { // eslint-disable-line no-unused-vars
    return (studentData?.points || 0) >= product.price;
  };

  // Функция для расчета прогресса накопления монет
  const getCoinsProgress = (product) => {
    const currentCoins = studentData?.points || 0;
    const productPrice = product.price;
    const coinsNeeded = Math.max(0, productPrice - currentCoins);
    const progressPercentage = Math.min(100, (currentCoins / productPrice) * 100);
    
    return {
      currentCoins,
      productPrice,
      coinsNeeded,
      progressPercentage: Math.round(progressPercentage)
    };
  };

  const fullName = [user.first_name, user.surname, user.patronymic]
    .filter(Boolean).join(' ') || user.username || 'Студент';

  if (loading && loadingCoins) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="shop" userRole={user?.role} />
        <div className="main-content">
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка магазина...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="shop" userRole={user?.role} />
      <div className="main-content">
        <SmartTopBar pageTitle="Магазин" />
        <div className="shop-page">
          {/* Заголовок */}
          <div className="page-header">
            <div className="header-info">
              <p>Добро пожаловать в магазин, {fullName}!</p>
            </div>
            <div className="coins-display">
              <BestCoins amount={studentData?.points || 0} loading={loadingCoins} />
            </div>
          </div>

          {/* Вкладки */}
          <div className="shop-tabs">
            <button
              className={`tab-button ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              Доступные товары ({availableProducts.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'not-available' ? 'active' : ''}`}
              onClick={() => setActiveTab('not-available')}
            >
              Недоступные товары ({notAvailableProducts.length})
            </button>
          </div>

          {/* Контент вкладок */}
          <div className="shop-content">
            {loading ? (
              <div className="loading-products">
                <div className="loader"></div>
                <p>Загрузка товаров...</p>
              </div>
            ) : (
              <>
                {activeTab === 'available' && (
                  <div className="products-section">
                    {availableProducts.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">🛍️</div>
                        <h3>Нет доступных товаров</h3>
                        <p>К сожалению, сейчас нет товаров, которые вы можете купить за ваши монеты.</p>
                      </div>
                    ) : (
                      <>
                        <div className="section-header">
                          <h2>Товары, которые вы можете купить</h2>
                          <p>У вас достаточно монет для покупки этих товаров</p>
                        </div>
                        <div className="products-grid">
                          {availableProducts.map(product => (
                            <div key={product.id} className="product-card available">
                              <div className="product-image">
                                {getProductImage(product) ? (
                                  <img src={getProductImage(product)} alt={product.name} />
                                ) : (
                                  <div className="image-placeholder">
                                    <span>📦</span>
                                  </div>
                                )}
                              </div>
                              <div className="product-info">
                                <h3>{product.name}</h3>
                                <p className="product-description">{product.description}</p>
                                <div className="product-footer">
                                  <div className="product-price">
                                    <span className="price">{product.price}</span>
                                    <span className="currency">монет</span>
                                  </div>
                                  <button 
                                    className="btn-purchase"
                                    onClick={() => handlePurchase(product)}
                                  >
                                    Купить
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'not-available' && (
                  <div className="products-section">
                    {notAvailableProducts.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">✨</div>
                        <h3>Отлично!</h3>
                        <p>У вас достаточно монет для покупки всех доступных товаров!</p>
                      </div>
                    ) : (
                      <>
                        <div className="section-header">
                          <h2>Товары для будущих покупок</h2>
                          <p>Накопите больше монет, чтобы купить эти товары</p>
                        </div>
                        <div className="products-grid">
                          {notAvailableProducts.map(product => {
                            const progress = getCoinsProgress(product);
                            return (
                              <div key={product.id} className="product-card not-available">
                                <div className="product-image">
                                  {getProductImage(product) ? (
                                    <img src={getProductImage(product)} alt={product.name} />
                                  ) : (
                                    <div className="image-placeholder">
                                      <span>📦</span>
                                    </div>
                                  )}
                                  <div className="unavailable-overlay">
                                    <span>Накопите еще</span>
                                  </div>
                                </div>
                                <div className="product-info">
                                  <h3>{product.name}</h3>
                                  <p className="product-description">{product.description}</p>
                                  
                                  {/* Прогресс накопления */}
                                  <div className="coins-progress">
                                    <div className="progress-header">
                                      <span className="progress-label">Прогресс накопления</span>
                                      <span className="progress-percentage">{progress.progressPercentage}%</span>
                                    </div>
                                    <div className="progress-bar">
                                      <div 
                                        className="progress-fill" 
                                        style={{ width: `${progress.progressPercentage}%` }}
                                      ></div>
                                    </div>
                                    <div className="progress-info">
                                      <span className="current-coins">{progress.currentCoins} 🪙</span>
                                      <span className="target-coins">{progress.productPrice} 🪙</span>
                                    </div>
                                  </div>

                                  <div className="product-footer">
                                    <div className="product-price">
                                      <span className="price">{product.price}</span>
                                      <span className="currency">монет</span>
                                    </div>
                                    <div className="coins-needed">
                                      <span className="needed-icon">💰</span>
                                      <span className="needed-text">Нужно еще: </span>
                                      <span className="needed-amount">{progress.coinsNeeded}</span>
                                      <span className="needed-currency"> монет</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Модальное окно покупки */}
        {showPurchaseModal && selectedProduct && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Подтверждение покупки</h2>
                <button 
                  className="close-modal"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedProduct(null);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <div className="purchase-info">
                  <div className="product-preview">
                    {getProductImage(selectedProduct) ? (
                      <img src={getProductImage(selectedProduct)} alt={selectedProduct.name} />
                    ) : (
                      <div className="image-placeholder">
                        <span>📦</span>
                      </div>
                    )}
                  </div>
                  <div className="purchase-details">
                    <h3>{selectedProduct.name}</h3>
                    <p>{selectedProduct.description}</p>
                    <div className="price-info">
                      <div className="purchase-price">
                        Цена: <strong>{selectedProduct.price} монет</strong>
                      </div>
                      <div className="balance-info">
                        Ваш баланс: <strong>{studentData?.points || 0} монет</strong>
                      </div>
                      <div className="after-purchase">
                        После покупки: <strong>{(studentData?.points || 0) - selectedProduct.price} монет</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-primary"
                  onClick={confirmPurchase}
                >
                  Подтвердить покупку
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedProduct(null);
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
