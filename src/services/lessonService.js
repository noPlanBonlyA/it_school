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

/**
 * Создает урок с автоматическим добавлением в расписания групп
 */
export const createLessonWithAutoSchedule = async (courseId, formData) => {
  console.log('[LessonService] Creating lesson with auto schedule:', { courseId });
  
  try {
    // Сначала создаем урок
    const lessonResponse = await createLessonWithMaterials(courseId, formData);
    const newLesson = lessonResponse;
    
    console.log('[LessonService] Lesson created, now adding to group schedules:', newLesson);
    
    // Автоматически добавляем урок во все группы курса
    const { autoAddLessonToAllCourseGroups } = await import('./groupScheduleService');
    const autoScheduleResult = await autoAddLessonToAllCourseGroups(courseId, newLesson.id);
    
    console.log('[LessonService] Auto schedule completed:', autoScheduleResult);
    
    // Формируем сообщение для пользователя
    let message = '';
    if (autoScheduleResult.total === 0) {
      message = 'Урок создан. Курс пока не привязан к группам.';
    } else if (autoScheduleResult.successCount === 0) {
      message = `Урок создан. Не удалось добавить в расписание ${autoScheduleResult.total} групп(ы). Проверьте настройки расписания групп и нажмите "Обновить" в нужных группах.`;
    } else if (autoScheduleResult.successCount === autoScheduleResult.total) {
      message = `Урок создан и автоматически добавлен в расписание ${autoScheduleResult.total} групп(ы).`;
    } else {
      message = `Урок создан. Добавлен в расписание ${autoScheduleResult.successCount} из ${autoScheduleResult.total} групп(ы). Для остальных групп зайдите в группу и нажмите "Обновить расписание".`;
    }
    
    return {
      lesson: newLesson,
      autoSchedule: autoScheduleResult,
      message
    };
    
  } catch (error) {
    console.error('[LessonService] Error creating lesson with auto schedule:', error);
    throw error;
  }
};

/**
 * Создает урок с текстом и автоматическим добавлением в расписания групп
 */
export const createLessonWithMaterialsTextAndAutoSchedule = async (courseId, textData) => {
  console.log('[LessonService] Creating lesson with text and auto schedule:', { courseId });
  
  try {
    // Сначала создаем урок
    const lessonResponse = await createLessonWithMaterialsText(courseId, textData);
    const newLesson = lessonResponse;
    
    console.log('[LessonService] Lesson created, now adding to group schedules:', newLesson);
    
    // Автоматически добавляем урок во все группы курса
    const { autoAddLessonToAllCourseGroups } = await import('./groupScheduleService');
    const autoScheduleResult = await autoAddLessonToAllCourseGroups(courseId, newLesson.id);
    
    console.log('[LessonService] Auto schedule completed:', autoScheduleResult);
    
    // Формируем сообщение для пользователя
    let message = '';
    if (autoScheduleResult.total === 0) {
      message = 'Урок создан. Курс пока не привязан к группам.';
    } else if (autoScheduleResult.successCount === 0) {
      message = `Урок создан. Не удалось добавить в расписание ${autoScheduleResult.total} групп(ы). Проверьте настройки расписания групп и нажмите "Обновить" в нужных группах.`;
    } else if (autoScheduleResult.successCount === autoScheduleResult.total) {
      message = `Урок создан и автоматически добавлен в расписание ${autoScheduleResult.total} групп(ы).`;
    } else {
      message = `Урок создан. Добавлен в расписание ${autoScheduleResult.successCount} из ${autoScheduleResult.total} групп(ы). Для остальных групп зайдите в группу и нажмите "Обновить расписание".`;
    }
    
    return {
      lesson: newLesson,
      autoSchedule: autoScheduleResult,
      message
    };
    
  } catch (error) {
    console.error('[LessonService] Error creating lesson with text and auto schedule:', error);
    throw error;
  }
};

/**
 * Получение материалов урока для студента
 * @param {string} courseId - ID курса
 * @param {string} lessonId - ID урока
 * @returns {Promise<Object>} Материалы урока для студента
 */
export const getLessonMaterialsForStudent = async (courseId, lessonId) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-materials`);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Ошибка при получении материалов урока для студента:', error);
    throw error;
  }
};

/**
 * Получение материалов урока для преподавателя
 * @param {string} courseId - ID курса
 * @param {string} lessonId - ID урока
 * @param {string} studentId - ID студента
 * @returns {Promise<Object>} Материалы урока для преподавателя
 */
export const getLessonMaterialsForTeacher = async (courseId, lessonId, studentId) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/teacher-materials`, {
      params: { student_id: studentId }
    });
    return response.data;
  } catch (error) {
    console.error('[LessonService] Ошибка при получении материалов урока для преподавателя:', error);
    throw error;
  }
};

/**
 * Получение информации об уроке для преподавателя
 * @param {string} courseId - ID курса
 * @param {string} lessonId - ID урока
 * @returns {Promise<Object>} Информация об уроке
 */
export const getLessonInfoForTeacher = async (courseId, lessonId) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/teacher-info`);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Ошибка при получении информации об уроке:', error);
    throw error;
  }
};

/**
 * Получение информации об уроке для студента
 * @param {string} courseId - ID курса
 * @param {string} lessonId - ID урока
 * @returns {Promise<Object>} Информация об уроке
 */
export const getLessonInfoForStudent = async (courseId, lessonId) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-materials`);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Ошибка при получении информации об уроке для студента:', error);
    throw error;
  }
};

/**
 * Удаление конкретного материала урока
 */
export const deleteLessonMaterial = async (courseId, lessonId, materialType) => {
  try {
    console.log('[LessonService] Deleting lesson material:', { courseId, lessonId, materialType });
    
    const response = await api.delete(`/courses/${courseId}/lessons/${lessonId}/materials/${materialType}`);
    
    console.log('[LessonService] Material deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error deleting material:', error);
    throw error;
  }
};

/**
 * Обновление только названия урока без затрагивания материалов
 */
export const updateLessonNameOnly = async (courseId, lessonId, name) => {
  try {
    console.log('[LessonService] Updating lesson name only:', { courseId, lessonId, name });
    
    const response = await api.put(`/courses/${courseId}/lessons/${lessonId}`, {
      name: name
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[LessonService] Lesson name updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[LessonService] Error updating lesson name:', error);
    throw error;
  }
};

/**
 * Умное получение материалов урока с автоматическим выбором эндпоинта
 * @param {string} courseId - ID курса
 * @param {string} lessonId - ID урока
 * @param {string} userRole - Роль пользователя
 * @returns {Promise<Object>} Материалы урока
 */
export const getSmartLessonMaterials = async (courseId, lessonId, userRole = 'student') => {
  try {
    console.log('[LessonService] Getting smart lesson materials:', { courseId, lessonId, userRole });
    
    // Для всех ролей используем полный эндпоинт, так как student-materials возвращает только {id, name}
    const response = await api.get(`/courses/${courseId}/lessons-with-materials/${lessonId}`);
    console.log('[LessonService] Full materials loaded:', response.data);
    
    // Маркируем данные в зависимости от роли пользователя
    return { 
      ...response.data, 
      _isStudentEndpoint: userRole === 'student',
      _userRole: userRole
    };
  } catch (error) {
    console.error('[LessonService] Error getting smart lesson materials:', error);
    throw error;
  }
};
