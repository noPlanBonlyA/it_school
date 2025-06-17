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
 * Получить урок с материалами
 */
export const getLessonWithMaterials = async (courseId, lessonId) => {
  try {
    console.log('[LessonService] Getting lesson with materials:', { courseId, lessonId });
    
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
    console.log('[LessonService] Lesson data received:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error getting lesson:', error);
    throw error;
  }
};

/**
 * Получить список уроков курса
 */
export const listLessons = async (courseId, limit = 100, offset = 0) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons`, {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error listing lessons:', error);
    throw error;
  }
};

/**
 * Создать урок
 */
export const createLesson = async (courseId, lessonData) => {
  try {
    const response = await api.post(`/courses/${courseId}/lessons`, lessonData);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error creating lesson:', error);
    throw error;
  }
};

/**
 * Обновить урок
 */
export const updateLesson = async (courseId, lessonId, lessonData) => {
  try {
    const response = await api.put(`/courses/${courseId}/lessons/${lessonId}`, lessonData);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error updating lesson:', error);
    throw error;
  }
};

/**
 * Удалить урок
 */
export const deleteLesson = async (courseId, lessonId) => {
  try {
    await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
  } catch (error) {
    console.error('[LessonService] Error deleting lesson:', error);
    throw error;
  }
};
