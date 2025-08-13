// src/services/homeworkService.js
import api from '../api/axiosInstance';
import { createLessonCoinsHistory } from './coinHistoryService';

/**
 * Отправка     // Форматируем данные для API
    const apiData = {
      student_id: updateData.student_id,
      lesson_group_id: updateData.lesson_group_id,
      is_visited: Boolean(updateData.is_visited),
      is_excused_absence: Boolean(updateData.is_excused_absence),
      is_compensated_skip: Boolean(updateData.is_compensated_skip || false),
      is_sent_homework: Boolean(updateData.is_sent_homework),
      is_graded_homework: Boolean(updateData.is_graded_homework),
      coins_for_visit: Number(updateData.coins_for_visit) || 0,
      grade_for_visit: Number(updateData.grade_for_visit) || 0,
      coins_for_homework: Number(updateData.coins_for_homework) || 0,
      grade_for_homework: Number(updateData.grade_for_homework) || 0,
      id: lessonStudentId
    };
    
    console.log('[HomeworkService] Formatted API data:', apiData);
    
    const response = await api.put(`/courses/lesson-student/${lessonStudentId}`, apiData);
    
    console.log('[HomeworkService] Lesson student updated:', response.data);удентом
 */
export const submitHomework = async (courseId, lessonId, formData) => {
  try {
    console.log('[HomeworkService] Submitting homework:', { courseId, lessonId });
    
    const response = await api.post(`/courses/${courseId}/lessons/${lessonId}/homework`, formData);
    
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
    
    // Создаем записи в истории поинтов, если начислены монеты
    if ((apiData.coins_for_visit > 0 || apiData.coins_for_homework > 0) && updateData.student_id) {
      try {
        await createLessonCoinsHistory(
          updateData.student_id,
          {
            coins_for_visit: apiData.coins_for_visit,
            coins_for_homework: apiData.coins_for_homework
          },
          {
            lesson_name: updateData.lesson_name || 'Урок',
            course_name: updateData.course_name
          },
          updateData.student_profile_id // Передаем ID профиля студента для уведомлений
        );
        console.log('[HomeworkService] Coins history records created successfully');
      } catch (historyError) {
        console.warn('[HomeworkService] Failed to create coins history:', historyError);
        // Не прерываем основной процесс, просто логируем предупреждение
      }
    }
    
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
    
    // Получаем прогресс студента по всем урокам
    const response = await api.get('/courses/student/lesson-student');
    console.log('[HomeworkService] Student lesson progress response:', response.data);
    
    if (Array.isArray(response.data)) {
      // Ищем урок по lesson_id в структуре lesson_group
      const lessonProgress = response.data.find(item => {
        if (item.lesson_group && item.lesson_group.lesson_id === lessonId) {
          console.log('[HomeworkService] Found matching lesson_group:', item.lesson_group);
          return true;
        }
        return false;
      });
      
      if (lessonProgress) {
        console.log('[HomeworkService] Found lesson progress:', lessonProgress);
        
        // Добавляем дополнительную информацию для удобства
        const enrichedProgress = {
          ...lessonProgress,
          lesson_id: lessonProgress.lesson_group?.lesson_id,
          course_id: courseId // добавляем для полноты информации
        };
        
        return enrichedProgress;
      }
    }
    
    // Если не найдено через lesson-student, пытаемся получить через lesson-group
    console.log('[HomeworkService] No lesson progress found, trying lesson-group approach...');
    
    try {
      // Получаем lesson groups и ищем подходящий
      const lessonGroupResponse = await api.get('/courses/lesson-group', {
        params: { group_id: null } // Этот запрос может потребовать group_id
      });
      
      console.log('[HomeworkService] Lesson group response:', lessonGroupResponse.data);
      
      // Если lesson-group подход не сработал, возвращаем null
      return null;
      
    } catch (lessonGroupError) {
      console.log('[HomeworkService] Lesson group approach failed:', lessonGroupError);
      return null;
    }
    
  } catch (error) {
    console.error('[HomeworkService] Error getting student lesson info:', error);
    throw error;
  }
};

/**
 * Альтернативный метод - проверка через прямой запрос lesson-student материалов
 */
export const checkHomeworkSubmissionStatus = async (courseId, lessonId) => {
  try {
    console.log('[HomeworkService] Checking homework submission status:', { courseId, lessonId });
    
    // Пытаемся получить материалы студента для конкретного урока
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-materials`);
    console.log('[HomeworkService] Student materials response:', response.data);
    
    // Если запрос прошел успешно, значит у студента есть доступ к уроку
    // Но этот эндпоинт не возвращает статус домашнего задания
    // Возвращаем базовую информацию
    return {
      lesson_id: lessonId,
      course_id: courseId,
      has_access: true,
      is_sent_homework: false, // По умолчанию false, будет обновлено основным методом
      is_graded_homework: false
    };
    
  } catch (error) {
    console.error('[HomeworkService] Error checking homework submission status:', error);
    return null;
  }
};
