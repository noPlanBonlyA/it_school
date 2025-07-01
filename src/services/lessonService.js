// src/services/lessonService.js
import api from '../api/axiosInstance';

/**
 * Получить курс по ID
 */
export const getCourse = async (courseId) => {
  try {
    console.log('[LessonService] Getting course:', courseId);
    
    const response = await api.get(`/courses/${courseId}`);
    console.log('[LessonService] Course data received:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error getting course:', error);
    throw error;
  }
};

/**
 * Создание урока с материалами (с файлами)
 */
export const createLessonWithMaterials = async (courseId, formData) => {
  try {
    console.log('[LessonService] Creating lesson with materials (files):', { courseId });
    console.log('[LessonService] FormData type:', formData.constructor.name);
    
    // Проверяем, что это действительно FormData
    if (!(formData instanceof FormData)) {
      console.error('[LessonService] Expected FormData, but got:', typeof formData, formData);
      throw new Error('Expected FormData object for file upload');
    }
    
    // Логируем содержимое FormData для отладки
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`[LessonService] FormData[${key}]:`, value.name, value.size, 'bytes');
      } else {
        console.log(`[LessonService] FormData[${key}]:`, value);
      }
    }
    
    const response = await api.post(`/courses/${courseId}/lessons-with-materials`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('[LessonService] Lesson created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error creating lesson:', error);
    console.error('[LessonService] Error response:', error.response?.data);
    throw error;
  }
};

/**
 * Создание урока с материалами (с текстом)
 */
export const createLessonWithMaterialsText = async (courseId, textData) => {
  try {
    console.log('[LessonService] Creating lesson with materials (text):', { courseId });
    
    const response = await api.post(`/courses/${courseId}/lessons-with-materials-text`, textData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[LessonService] Lesson created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error creating lesson:', error);
    throw error;
  }
};

/**
 * Обновление урока с материалами (с файлами)
 */
export const updateLessonWithMaterials = async (courseId, lessonId, formData) => {
  try {
    console.log('[LessonService] Updating lesson with materials (files):', { courseId, lessonId });
    console.log('[LessonService] FormData type:', formData.constructor.name);
    
    // Проверяем, что это действительно FormData
    if (!(formData instanceof FormData)) {
      console.error('[LessonService] Expected FormData, but got:', typeof formData, formData);
      throw new Error('Expected FormData object for file upload');
    }
    
    // Логируем содержимое FormData для отладки
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`[LessonService] FormData[${key}]:`, value.name, value.size, 'bytes');
      } else {
        console.log(`[LessonService] FormData[${key}]:`, value);
      }
    }
    
    const response = await api.put(`/courses/${courseId}/lessons-with-materials/${lessonId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('[LessonService] Lesson updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error updating lesson:', error);
    console.error('[LessonService] Error response:', error.response?.data);
    throw error;
  }
};

/**
 * Обновление урока с материалами (с текстом)
 */
export const updateLessonWithMaterialsText = async (courseId, lessonId, textData) => {
  try {
    console.log('[LessonService] Updating lesson with materials (text):', { courseId, lessonId });
    
    const response = await api.put(`/courses/${courseId}/lessons-with-materials-text/${lessonId}`, textData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[LessonService] Lesson updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error updating lesson:', error);
    throw error;
  }
};

/**
 * Получение урока с материалами
 */
export const getLessonWithMaterials = async (courseId, lessonId) => {
  try {
    console.log('[LessonService] Getting lesson with materials:', { courseId, lessonId });
    
    const response = await api.get(`/courses/${courseId}/lessons-with-materials/${lessonId}`);
    
    console.log('[LessonService] Lesson loaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error getting lesson:', error);
    throw error;
  }
};

/**
 * Удаление урока с материалами
 */
export const deleteLessonWithMaterials = async (courseId, lessonId, materialIds) => {
  try {
    console.log('[LessonService] Deleting lesson with materials:', { courseId, lessonId, materialIds });
    
    await api.delete(`/courses/${courseId}/lessons-with-materials/${lessonId}`, {
      data: materialIds
    });
    
    console.log('[LessonService] Lesson deleted successfully');
  } catch (error) {
    console.error('[LessonService] Error deleting lesson:', error);
    throw error;
  }
};

/**
 * Получение списка уроков курса
 */
export const getCourseLessons = async (courseId, limit = 100) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons`, {
      params: { limit, offset: 0 }
    });
    
    console.log('[LessonService] Course lessons:', response.data);
    return response.data.objects || [];
  } catch (error) {
    console.error('[LessonService] Error getting course lessons:', error);
    throw error;
  }
};

// ДОБАВЛЕНО: Алиасы для обратной совместимости
export const listLessons = getCourseLessons;
export const createLesson = createLessonWithMaterials;
export const updateLesson = updateLessonWithMaterials;
export const deleteLesson = deleteLessonWithMaterials;
