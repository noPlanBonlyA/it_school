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
 * Создание урока с материалами (только текст)
 */
export const createLessonWithMaterials = async (courseId, lessonData) => {
  try {
    console.log('[LessonService] Creating lesson with materials:', { courseId, lessonData });
    
    const response = await api.post(`/courses/${courseId}/lessons-with-materials`, lessonData);
    
    console.log('[LessonService] Lesson created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error creating lesson:', error);
    throw error;
  }
};

/**
 * Обновление урока с материалами
 */
export const updateLessonWithMaterials = async (courseId, lessonId, lessonData) => {
  try {
    console.log('[LessonService] Updating lesson with materials:', { courseId, lessonId, lessonData });
    
    const response = await api.put(`/courses/${courseId}/lessons-with-materials/${lessonId}`, lessonData);
    
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
