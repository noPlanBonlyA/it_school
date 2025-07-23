// src/services/homeworkService.js
import api from '../api/axiosInstance';

/**
 * Отправка домашнего задания студентом
 */
export const submitHomework = async (courseId, lessonId, formData) => {
  try {
    console.log('[HomeworkService] Submitting homework:', { courseId, lessonId });
    
    const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/homework`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('[HomeworkService] Homework submitted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error submitting homework:', error);
    throw error;
  }
};

/**
 * Получение материалов урока для студента
 */
export const getStudentMaterials = async (courseId, lessonId) => {
  try {
    console.log('[HomeworkService] Getting student materials:', { courseId, lessonId });
    
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-materials`);
    
    console.log('[HomeworkService] Student materials:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting student materials:', error);
    throw error;
  }
};

/**
 * Получение материалов урока для преподавателя
 */
export const getTeacherMaterials = async (courseId, lessonId, studentId) => {
  try {
    console.log('[HomeworkService] Getting teacher materials:', { courseId, lessonId, studentId });
    
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/teacher-materials`, {
      params: { student_id: studentId }
    });
    
    console.log('[HomeworkService] Teacher materials:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting teacher materials:', error);
    throw error;
  }
};

/**
 * Получение информации об уроке для преподавателя
 */
export const getTeacherLessonInfo = async (courseId, lessonId) => {
  try {
    console.log('[HomeworkService] Getting teacher lesson info:', { courseId, lessonId });
    
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/teacher-info`);
    
    console.log('[HomeworkService] Teacher lesson info:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting teacher lesson info:', error);
    throw error;
  }
};

/**
 * Получение групп преподавателя
 */
export const getTeacherGroups = async () => {
  try {
    console.log('[HomeworkService] Getting teacher groups');
    
    const response = await api.get('/groups/teacher');
    
    console.log('[HomeworkService] Teacher groups:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting teacher groups:', error);
    throw error;
  }
};

/**
 * Получение lesson-groups по group_id
 */
export const getLessonGroupsByGroup = async (groupId) => {
  try {
    console.log('[HomeworkService] Getting lesson groups by group:', groupId);
    
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
 * Получение lesson-students по lesson_group_id
 */
export const getLessonStudents = async (lessonGroupId) => {
  try {
    console.log('[HomeworkService] Getting lesson students:', lessonGroupId);
    
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
 * Получение детальной информации о lesson-student
 */
export const getLessonStudentDetails = async (lessonStudentId) => {
  try {
    console.log('[HomeworkService] Getting lesson student details:', lessonStudentId);
    
    const response = await api.get(`/courses/lesson-student/${lessonStudentId}`);
    
    console.log('[HomeworkService] Lesson student details:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting lesson student details:', error);
    throw error;
  }
};

/**
 * Обновление lesson-student (оценки, посещение и т.д.)
 */
export const updateLessonStudent = async (lessonStudentId, updateData) => {
  try {
    console.log('[HomeworkService] Updating lesson student:', lessonStudentId, updateData);
    
    // ИСПРАВЛЕНО: Формируем правильную структуру данных согласно API схеме
    const apiData = {
      student_id: updateData.student_id,
      lesson_group_id: updateData.lesson_group_id,
      is_visited: updateData.is_visited || false,
      is_excused_absence: updateData.is_excused_absence || false,
      is_sent_homework: updateData.is_sent_homework || false,
      is_graded_homework: updateData.is_graded_homework || false,
      coins_for_visit: parseInt(updateData.coins_for_visit) || 0,
      grade_for_visit: parseInt(updateData.grade_for_visit) || 0,
      coins_for_homework: parseInt(updateData.coins_for_homework) || 0,
      grade_for_homework: parseInt(updateData.grade_for_homework) || 0,
      id: lessonStudentId
    };
    
    console.log('[HomeworkService] Formatted API data:', apiData);
    
    const response = await api.put(`/courses/lesson-student/${lessonStudentId}`, apiData);
    
    console.log('[HomeworkService] Lesson student updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error updating lesson student:', error);
    
    // Логируем детали ошибки для отладки
    if (error.response) {
      console.error('[HomeworkService] Response error data:', error.response.data);
      console.error('[HomeworkService] Response status:', error.response.status);
    }
    
    throw error;
  }
};

/**
 * Добавление комментария к lesson-student
 */
export const addCommentToLessonStudent = async (courseId, lessonId, commentData) => {
  try {
    console.log('[HomeworkService] Adding comment to lesson student:', { courseId, lessonId, commentData });
    
    const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/comments`, commentData);
    
    console.log('[HomeworkService] Comment added:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error adding comment:', error);
    throw error;
  }
};

/**
 * Получение списка сданных домашних заданий студентов
 */
export const listStudentMaterials = async (courseId, lessonId) => {
  try {
    console.log('[HomeworkService] Getting student homework submissions:', { courseId, lessonId });
    
    // Используем endpoint для получения lesson-students по group
    // Сначала получаем расписание для этого урока
    const scheduleResponse = await api.get('/schedule/');
    const schedule = scheduleResponse.data;
    
    const lessonGroups = schedule.filter(item => item.lesson_id === lessonId);
    
    if (lessonGroups.length === 0) {
      console.log('[HomeworkService] No groups found for lesson');
      return [];
    }
    
    // Получаем lesson-students для всех групп этого урока
    const allMaterials = [];
    
    for (const lessonGroup of lessonGroups) {
      try {
        const response = await api.get('/courses/lesson-student', {
          params: { lesson_group_id: lessonGroup.id }
        });
        
        const lessonStudents = response.data || [];
        
        // Фильтруем только тех, кто сдал домашку
        const submittedMaterials = lessonStudents
          .filter(ls => ls.is_sent_homework)
          .map(ls => ({
            lesson_student_id: ls.id,
            student: ls.student,
            homework_url: ls.passed_homeworks?.[0]?.homework?.url || null
          }));
        
        allMaterials.push(...submittedMaterials);
      } catch (error) {
        console.error('[HomeworkService] Error getting lesson students for group:', lessonGroup.id, error);
      }
    }
    
    console.log('[HomeworkService] Student materials found:', allMaterials);
    return allMaterials;
  } catch (error) {
    console.error('[HomeworkService] Error listing student materials:', error);
    return [];
  }
};

/**
 * Создание комментария преподавателем
 */
export const postComment = async (courseId, lessonId, commentData) => {
  try {
    console.log('[HomeworkService] Posting comment:', { courseId, lessonId, commentData });
    
    const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/comments`, commentData);
    
    console.log('[HomeworkService] Comment posted:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error posting comment:', error);
    throw error;
  }
};

/**
 * Получение комментариев к уроку
 */
export const listComments = async (courseId, lessonId) => {
  try {
    console.log('[HomeworkService] Getting comments for lesson:', { courseId, lessonId });
    
    // Получаем lesson-students и их комментарии
    const scheduleResponse = await api.get('/schedule/');
    const schedule = scheduleResponse.data;
    
    const lessonGroups = schedule.filter(item => item.lesson_id === lessonId);
    
    if (lessonGroups.length === 0) {
      return [];
    }
    
    const allComments = [];
    
    for (const lessonGroup of lessonGroups) {
      try {
        const response = await api.get('/courses/lesson-student', {
          params: { lesson_group_id: lessonGroup.id }
        });
        
        const lessonStudents = response.data || [];
        
        // Получаем детальную информацию по каждому lesson-student для комментариев
        for (const ls of lessonStudents) {
          try {
            const detailResponse = await api.get(`/courses/lesson-student/${ls.id}`);
            const detail = detailResponse.data;
            
            if (detail.comments && detail.comments.length > 0) {
              allComments.push(...detail.comments);
            }
          } catch (error) {
            console.error('[HomeworkService] Error getting lesson student detail:', ls.id, error);
          }
        }
      } catch (error) {
        console.error('[HomeworkService] Error getting lesson students for group:', lessonGroup.id, error);
      }
    }
    
    console.log('[HomeworkService] Comments found:', allComments);
    return allComments;
  } catch (error) {
    console.error('[HomeworkService] Error listing comments:', error);
    return [];
  }
};

/**
 * ДОБАВЛЕНО: Создать уведомление для студента при проверке ДЗ
 */
export const createNotificationForStudent = async (studentId, message) => {
  try {
    console.log('[HomeworkService] Creating notification for student:', studentId, message);
    
    const response = await api.post('/notifications/', 
      {
        content: message
      },
      {
        params: {
          recipient_type: 'student',
          recipient_id: studentId
        }
      }
    );
    
    console.log('[HomeworkService] Notification created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error creating notification:', error);
    throw error;
  }
};

/**
 * Получение информации об уроке для студента
 */
export const getStudentLessonInfo = async (courseId, lessonId) => {
  try {
    console.log('[HomeworkService] Getting student lesson info:', { courseId, lessonId });
    
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-info`);
    
    console.log('[HomeworkService] Student lesson info:', response.data);
    return response.data;
  } catch (error) {
    console.error('[HomeworkService] Error getting student lesson info:', error);
    throw error;
  }
};
