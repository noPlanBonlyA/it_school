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
 * ИСПРАВЛЕНО: Отправка домашнего задания с правильными заголовками
 */
export function submitHomework(courseId, lessonId, { text, file }) {
  console.log('[HomeworkService] === HOMEWORK SUBMISSION DEBUG ===');
  console.log('[HomeworkService] Input params:', { 
    courseId, 
    lessonId, 
    text: text ? `"${text.substring(0, 50)}..."` : null,
    hasFile: !!file,
    fileName: file?.name,
    fileSize: file?.size,
    fileType: file?.type
  });
  
  // Проверяем что у нас есть хотя бы текст или файл
  if (!text?.trim() && !file) {
    const error = new Error('Необходимо указать текст домашнего задания или выбрать файл');
    console.error('[HomeworkService] Validation error:', error.message);
    throw error;
  }
  
  const form = new FormData();
  
  // Всегда добавляем текст
  const homeworkText = text?.trim() || (file ? 'Выполнено (см. прикрепленный файл)' : '');
  form.append('homework_data', homeworkText);
  console.log('[HomeworkService] Added homework_data:', `"${homeworkText}"`);
  
  // ИСПРАВЛЕНО: Всегда добавляем homework_file поле
  if (file && file instanceof File) {
    form.append('homework_file', file);
    console.log('[HomeworkService] Added real file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
  } else {
    // Создаем пустой файл если файл не был выбран
    const emptyFile = new File([''], '', { type: 'text/plain' });
    form.append('homework_file', emptyFile);
    console.log('[HomeworkService] Added empty file placeholder');
  }

  // Детальное логирование FormData
  console.log('[HomeworkService] FormData entries:');
  for (let [key, value] of form.entries()) {
    if (value instanceof File) {
      console.log(`  ${key}: File(name="${value.name}", size=${value.size}, type="${value.type}")`);
    } else {
      console.log(`  ${key}: "${value}"`);
    }
  }

  const url = `/courses/${courseId}/lessons/${lessonId}/homework`;
  console.log('[HomeworkService] Request URL:', url);

  // ИСПРАВЛЕНО: Убираем явное указание Content-Type, позволяем браузеру установить его автоматически
  return api.post(url, form).then(response => {
    console.log('[HomeworkService] ✅ SUCCESS! Response:', response.data);
    console.log('[HomeworkService] Response status:', response.status);
    return response.data;
  }).catch(error => {
    console.error('[HomeworkService] ❌ ERROR submitting homework:', error);
    
    if (error.response) {
      console.error('[HomeworkService] Error response status:', error.response.status);
      console.error('[HomeworkService] Error response data:', error.response.data);
      
      // Детально логируем ошибку валидации
      if (error.response.status === 422 && error.response.data?.detail) {
        console.error('[HomeworkService] Validation errors:');
        if (Array.isArray(error.response.data.detail)) {
          error.response.data.detail.forEach((err, index) => {
            console.error(`  ${index + 1}. ${err.loc ? err.loc.join('.') : 'unknown'}: ${err.msg} (type: ${err.type})`);
          });
        } else {
          console.error('  Detail:', error.response.data.detail);
        }
      }
    } else if (error.request) {
      console.error('[HomeworkService] Request was made but no response received');
      console.error('[HomeworkService] Request details:', error.request);
    } else {
      console.error('[HomeworkService] Error in request configuration:', error.message);
    }
    
    console.log('[HomeworkService] === END DEBUG ===');
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
