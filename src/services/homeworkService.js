// src/services/homeworkService.js
import api from '../api/axiosInstance';

/**
 * Получить уже сданные материалы (для статуса "сдано/не сдано")
 */
export function getStudentMaterials(courseId, lessonId) {
  console.log('[HomeworkService] Getting student materials for lesson:', { courseId, lessonId });
  
  return api
    .get(`/courses/${courseId}/lessons/${lessonId}/student-materials`)
    .then(response => {
      console.log('[HomeworkService] Student materials response:', response.data);
      return response.data.objects || response.data || [];
    })
    .catch(error => {
      console.error('[HomeworkService] Error getting student materials:', error);
      return [];
    });
}

/**
 * ИСПРАВЛЕНО: Правильная отправка домашнего задания
 */
export function submitHomework(courseId, lessonId, { text, file }) {
  console.log('[HomeworkService] Submitting homework:', { courseId, lessonId, hasText: !!text, hasFile: !!file });
  
  const form = new FormData();
  
  // ИСПРАВЛЕНО: Проверяем что у нас есть хотя бы текст или файл
  if (!text?.trim() && !file) {
    throw new Error('Необходимо указать текст домашнего задания или выбрать файл');
  }
  
  // Добавляем текст как homework_data (обязательное поле)
  form.append('homework_data', text?.trim() || 'Выполнено (см. прикрепленный файл)');
  
  // ИСПРАВЛЕНО: Добавляем файл только если он есть
  if (file && file instanceof File) {
    form.append('homework_file', file);
    console.log('[HomeworkService] Added file to form:', file.name, file.size);
  }

  // Логируем содержимое FormData для отладки
  console.log('[HomeworkService] FormData contents:');
  for (let [key, value] of form.entries()) {
    if (value instanceof File) {
      console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
    } else {
      console.log(`  ${key}: "${value}"`);
    }
  }

  return api.post(
    `/courses/${courseId}/lessons/${lessonId}/homework`,
    form,
    { 
      headers: { 
        'Content-Type': 'multipart/form-data' 
      } 
    }
  ).then(response => {
    console.log('[HomeworkService] Homework submitted successfully:', response.data);
    return response.data;
  }).catch(error => {
    console.error('[HomeworkService] Error submitting homework:', error);
    console.error('[HomeworkService] Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  });
}

// Для преподавателя: получить список всех сданных домашек
export function listStudentMaterials(courseId, lessonId) {
  return api
    .get(`/courses/${courseId}/lessons/${lessonId}/student-materials`)
    .then(r => r.data.objects || []);
}

// Получить все комментарии к уроку
export function listComments(courseId, lessonId) {
  return api
    .get(`/courses/${courseId}/lessons/${lessonId}/comments`)
    .then(r => r.data.objects || []);
}

// Оставить комментарий к конкретной сданной домашке
export function postComment(courseId, lessonId, { text, lesson_student_id }) {
  return api
    .post(`/courses/${courseId}/lessons/${lessonId}/comments`, {
      text,
      lesson_student_id
    })
    .then(r => r.data);
}

/**
 * Получение групп преподавателя
 */
export const getTeacherGroups = async () => {
  try {
    const response = await api.get('/groups/teacher');
    console.log('[HomeworkService] Teacher groups:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting teacher groups:', error);
    throw error;
  }
};

/**
 * Получение курсов преподавателя
 */
export const getTeacherCourses = async () => {
  try {
    const response = await api.get('/courses/teacher');
    console.log('[HomeworkService] Teacher courses:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting teacher courses:', error);
    throw error;
  }
};

/**
 * Получение уроков курса
 */
export const getCourseLessons = async (courseId) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons`, {
      params: { limit: 100 }
    });
    console.log('[HomeworkService] Course lessons:', response.data);
    return response.data.objects || [];
  } catch (error) {
    console.error('[HomeworkService] Error getting course lessons:', error);
    throw error;
  }
};

/**
 * Получение lesson groups по группе
 */
export const getLessonGroupsByGroup = async (groupId) => {
  try {
    const response = await api.get('/courses/lesson-group', {
      params: { group_id: groupId }
    });
    console.log('[HomeworkService] Lesson groups:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting lesson groups:', error);
    throw error;
  }
};

/**
 * Получение студентов урока
 */
export const getLessonStudents = async (lessonGroupId) => {
  try {
    const response = await api.get('/courses/lesson-student', {
      params: { lesson_group_id: lessonGroupId }
    });
    console.log('[HomeworkService] Lesson students:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting lesson students:', error);
    throw error;
  }
};

/**
 * Получение детальной информации о студенте урока с домашками и комментариями
 */
export const getLessonStudentDetails = async (lessonStudentId) => {
  try {
    const response = await api.get(`/courses/lesson-student/${lessonStudentId}`);
    console.log('[HomeworkService] Lesson student details:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting lesson student details:', error);
    throw error;
  }
};

/**
 * Обновление оценок и статуса студента
 */
export const updateLessonStudent = async (lessonStudentId, updateData) => {
  try {
    const response = await api.put(`/courses/lesson-student/${lessonStudentId}`, updateData);
    console.log('[HomeworkService] Updated lesson student:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error updating lesson student:', error);
    throw error;
  }
};

/**
 * Добавление комментария к студенту урока
 */
export const addCommentToLessonStudent = async (courseId, lessonId, commentData) => {
  try {
    const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/comments`, commentData);
    console.log('[HomeworkService] Added comment:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error adding comment:', error);
    throw error;
  }
};

/**
 * Обновление комментария
 */
export const updateComment = async (courseId, lessonId, commentId, commentData) => {
  try {
    const response = await api.put(`/courses/${courseId}/lessons/${lessonId}/comments/${commentId}`, commentData);
    console.log('[HomeworkService] Updated comment:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error updating comment:', error);
    throw error;
  }
};

/**
 * Удаление комментария
 */
export const deleteComment = async (courseId, lessonId, commentId) => {
  try {
    await api.delete(`/courses/${courseId}/lessons/${lessonId}/comments/${commentId}`);
    console.log('[HomeworkService] Deleted comment:', commentId);
  } catch (error) {
    console.error('[HomeworkService] Error deleting comment:', error);
    throw error;
  }
};

/**
 * Получение информации об уроке для преподавателя
 */
export const getLessonInfoForTeacher = async (courseId, lessonId) => {
  try {
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/teacher-info`);
    console.log('[HomeworkService] Lesson info for teacher:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting lesson info:', error);
    throw error;
  }
};
