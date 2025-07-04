// src/services/productService.js

import api from '../api/axiosInstance';

/**
 * Получение доступных товаров для студента
 * @param {number} price - максимальная цена (количество монет студента)
 * @param {number} limit - лимит товаров
 * @param {number} offset - смещение для пагинации
 */
export const getAvailableProducts = async (price, limit = 10, offset = 0) => {
  try {
    const response = await api.get('/products/available', {
      params: { price, limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching available products:', error);
    throw error;
  }
};

/**
 * Получение недоступных товаров для студента
 * @param {number} price - максимальная цена (количество монет студента)
 * @param {number} limit - лимит товаров
 * @param {number} offset - смещение для пагинации
 */
export const getNotAvailableProducts = async (price, limit = 10, offset = 0) => {
  try {
    const response = await api.get('/products/not-available', {
      params: { price, limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching not available products:', error);
    throw error;
  }
};

/**
 * Получение всех товаров (для админа)
 * @param {number} limit - лимит товаров
 * @param {number} offset - смещение для пагинации
 */
export const getAllProducts = async (limit = 100, offset = 0) => {
  try {
    const response = await api.get('/products/', {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all products:', error);
    throw error;
  }
};

/**
 * Получение товара по ID
 * @param {string} productId - ID товара
 */
export const getProductById = async (productId) => {
  try {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
};

/**
 * Создание нового товара (для админа)
 * @param {object} productData - данные товара
 * @param {File} imageFile - файл изображения
 */
export const createProduct = async (productData, imageFile = null) => {
  try {
    const formData = new FormData();
    formData.append('product_data', JSON.stringify(productData));
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const response = await api.post('/products/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

/**
 * Обновление товара (для админа)
 * @param {string} productId - ID товара
 * @param {object} productData - данные товара
 * @param {File} imageFile - файл изображения
 */
export const updateProduct = async (productId, productData, imageFile = null) => {
  try {
    const formData = new FormData();
    formData.append('product_data', JSON.stringify(productData));
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const response = await api.put(`/products/${productId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

/**
 * Удаление товара (для админа)
 * @param {string} productId - ID товара
 */
export const deleteProduct = async (productId) => {
  try {
    await api.delete(`/products/${productId}`);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

/**
 * Создание фотографии для товара
 * @param {string} productId - ID товара
 * @param {object} photoData - данные фотографии
 * @param {File} imageFile - файл изображения
 */
export const createProductPhoto = async (productId, photoData, imageFile) => {
  try {
    const formData = new FormData();
    formData.append('photo_data', JSON.stringify(photoData));
    formData.append('image', imageFile);

    const response = await api.post(`/products/${productId}/photo/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating product photo:', error);
    throw error;
  }
};

/**
 * Обновление фотографии товара
 * @param {string} productId - ID товара
 * @param {string} photoId - ID фотографии
 * @param {object} photoData - данные фотографии
 * @param {File} imageFile - файл изображения
 */
export const updateProductPhoto = async (productId, photoId, photoData, imageFile) => {
  try {
    const formData = new FormData();
    formData.append('photo_data', JSON.stringify(photoData));
    formData.append('image', imageFile);

    const response = await api.put(`/products/${productId}/photo/${photoId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating product photo:', error);
    throw error;
  }
};

/**
 * Удаление фотографии товара
 * @param {string} productId - ID товара
 * @param {string} photoId - ID фотографии
 */
export const deleteProductPhoto = async (productId, photoId) => {
  try {
    await api.delete(`/products/${productId}/photo/${photoId}`);
  } catch (error) {
    console.error('Error deleting product photo:', error);
    throw error;
  }
};

/**
 * Получение фотографии товара
 * @param {string} productId - ID товара
 * @param {string} photoId - ID фотографии
 */
export const getProductPhoto = async (productId, photoId) => {
  try {
    const response = await api.get(`/products/${productId}/photo/${photoId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product photo:', error);
    throw error;
  }
};
