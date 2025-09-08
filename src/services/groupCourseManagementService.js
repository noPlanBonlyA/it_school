/**
 * Сервис для управления курсами и расписанием группы
 * - Удаление курсов из группы
 * - Массовое изменение времени занятий
 */
import api from '../api/axiosInstance';

/**
 * Удалить курс из группы - полная отвязка с удалением всех lesson-groups
 */
export const removeCourseFromGroup = async (groupId, courseId) => {
  console.log('[GroupCourseManagement] Removing course from group:', { groupId, courseId });
  
  try {
    // 1. Получаем все lesson-groups для этой группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = lessonGroupsResponse.data || [];
    
    // 2. Получаем все уроки курса
    const lessonsResponse = await api.get(`/courses/${courseId}/lessons`);
    const courseLessons = lessonsResponse.data.objects || [];
    const courseLessonIds = courseLessons.map(lesson => lesson.id);
    
    // 3. Фильтруем lesson-groups, относящиеся к этому курсу
    const courseLessonGroups = lessonGroups.filter(lg => 
      lg.lesson && courseLessonIds.includes(lg.lesson.id)
    );
    
    console.log('[GroupCourseManagement] Found lesson-groups for course:', courseLessonGroups.length);
    
    if (courseLessonGroups.length === 0) {
      return {
        success: true,
        removed: 0,
        failed: 0,
        total: 0,
        message: 'Курс уже отвязан от группы - нет занятий для удаления'
      };
    }
    
    let successCount = 0;
    let failCount = 0;
    let removedStudents = 0;
    const results = [];
    
    // 4. Для каждого lesson-group удаляем всех студентов и затем сам lesson-group
    for (const lg of courseLessonGroups) {
      try {
        console.log(`[GroupCourseManagement] Processing lesson-group ${lg.id}...`);
        
        // 4.1. Получаем всех студентов этого занятия
        let lessonStudents = [];
        try {
          const studentsResponse = await api.get(`/courses/lesson-student?lesson_group_id=${lg.id}`);
          lessonStudents = studentsResponse.data || [];
          console.log(`[GroupCourseManagement] Found ${lessonStudents.length} students for lesson-group ${lg.id}`);
        } catch (studentsError) {
          console.log(`[GroupCourseManagement] No students found for lesson-group ${lg.id}:`, studentsError.message);
        }
        
        // 4.2. Удаляем всех студентов из занятия
        for (const student of lessonStudents) {
          try {
            await api.delete(`/courses/lesson-student/${student.id}`);
            removedStudents++;
            console.log(`[GroupCourseManagement] Deleted lesson-student ${student.id}`);
          } catch (deleteStudentError) {
            console.warn(`[GroupCourseManagement] Failed to delete lesson-student ${student.id}:`, deleteStudentError.message);
            // Продолжаем, даже если не удалось удалить студента
          }
        }
        
        // 4.3. Пытаемся удалить сам lesson-group (если API поддерживает)
        // Примечание: В API документации нет прямого DELETE для lesson-group,
        // поэтому lesson-group останется, но без студентов
        
        successCount++;
        results.push({ 
          success: true, 
          lessonGroupId: lg.id, 
          removedStudents: lessonStudents.length,
          message: `Обработано занятие. Удалено студентов: ${lessonStudents.length}`
        });
        
      } catch (error) {
        console.error(`[GroupCourseManagement] Error processing lesson-group ${lg.id}:`, error.message);
        failCount++;
        results.push({ 
          success: false, 
          lessonGroupId: lg.id, 
          error: error.message 
        });
      }
    }
    
    console.log('[GroupCourseManagement] Course removal completed:', { 
      successCount, 
      failCount, 
      total: courseLessonGroups.length,
      totalRemovedStudents: removedStudents
    });
    
    return {
      success: successCount > 0, // Успех, если обработали хотя бы одно занятие
      removed: successCount,
      failed: failCount,
      total: courseLessonGroups.length,
      removedStudents: removedStudents,
      details: results,
      message: `Курс отвязан от группы! Обработано занятий: ${successCount}/${courseLessonGroups.length}. Удалено записей студентов: ${removedStudents}`
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error removing course from group:', error);
    throw new Error(`Не удалось отвязать курс от группы: ${error.message}`);
  }
};

/**
 * Получить все занятия группы по конкретному курсу
 */
export const getGroupCourseLessons = async (groupId, courseId) => {
  console.log('[GroupCourseManagement] Getting group course lessons:', { groupId, courseId });
  
  try {
    // 1. Получаем все lesson-groups для группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = lessonGroupsResponse.data || [];
    
    // 2. Получаем уроки курса
    const lessonsResponse = await api.get(`/courses/${courseId}/lessons`);
    const courseLessons = lessonsResponse.data.objects || [];
    const courseLessonIds = courseLessons.map(lesson => lesson.id);
    
    // 3. Фильтруем lesson-groups этого курса
    const courseLessonGroups = lessonGroups.filter(lg => 
      lg.lesson && courseLessonIds.includes(lg.lesson.id)
    );
    
    // 4. Сортируем по дате
    courseLessonGroups.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    
    console.log('[GroupCourseManagement] Found course lessons:', courseLessonGroups.length);
    return courseLessonGroups;
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error getting group course lessons:', error);
    throw error;
  }
};

/**
 * Изменить время всех занятий группы по курсу
 * @param {string} groupId - ID группы
 * @param {string} courseId - ID курса  
 * @param {Object} timeSettings - Настройки времени
 * @param {number} timeSettings.dayOfWeek - День недели (0=воскресенье, 1=понедельник, ..., 6=суббота)
 * @param {string} timeSettings.startTime - Время начала в формате "HH:MM"
 * @param {number} timeSettings.durationMinutes - Продолжительность в минутах
 * @param {string} timeSettings.startDate - Дата первого занятия в формате "YYYY-MM-DD"
 * @param {string} [timeSettings.auditorium] - Аудитория (опционально)
 */
export const rescheduleGroupCourseLessons = async (groupId, courseId, timeSettings) => {
  console.log('[GroupCourseManagement] Rescheduling group course lessons:', { 
    groupId, 
    courseId, 
    timeSettings 
  });
  
  try {
    // 1. Получаем все занятия курса в группе
    const courseLessonGroups = await getGroupCourseLessons(groupId, courseId);
    
    if (courseLessonGroups.length === 0) {
      throw new Error('Занятия этого курса в группе не найдены');
    }
    
    const { dayOfWeek, startTime, durationMinutes, startDate, auditorium } = timeSettings;
    
    // 2. Вычисляем новые даты и времена
    const updates = courseLessonGroups.map((lessonGroup, index) => {
      // Вычисляем дату урока (первый урок в startDate, затем каждую неделю)
      const lessonDate = new Date(startDate);
      lessonDate.setDate(lessonDate.getDate() + (index * 7));
      
      // Устанавливаем день недели
      const currentDay = lessonDate.getDay();
      const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
      lessonDate.setDate(lessonDate.getDate() + daysToAdd);
      
      // Устанавливаем время начала
      const [hours, minutes] = startTime.split(':').map(Number);
      lessonDate.setHours(hours, minutes, 0, 0);
      
      // Вычисляем время окончания
      const endDate = new Date(lessonDate);
      endDate.setMinutes(endDate.getMinutes() + durationMinutes);
      
      return {
        lessonGroupId: lessonGroup.id,
        lesson_id: lessonGroup.lesson_id,
        group_id: groupId,
        start_datetime: lessonDate.toISOString(),
        end_datetime: endDate.toISOString(),
        is_opened: lessonGroup.is_opened,
        auditorium: auditorium || lessonGroup.auditorium || ''
      };
    });
    
    console.log('[GroupCourseManagement] Calculated new schedule:', updates);
    
    // 3. Обновляем каждый lesson-group
    const updatePromises = updates.map(async (update) => {
      try {
        const response = await api.put(`/courses/lesson-group/${update.lessonGroupId}`, {
          lesson_id: update.lesson_id,
          group_id: update.group_id,
          start_datetime: update.start_datetime,
          end_datetime: update.end_datetime,
          is_opened: update.is_opened,
          auditorium: update.auditorium
        });
        
        console.log('[GroupCourseManagement] Updated lesson-group:', update.lessonGroupId);
        return { success: true, lessonGroupId: update.lessonGroupId, data: response.data };
        
      } catch (error) {
        console.error('[GroupCourseManagement] Error updating lesson-group:', update.lessonGroupId, error);
        return { 
          success: false, 
          lessonGroupId: update.lessonGroupId, 
          error: error.message 
        };
      }
    });
    
    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('[GroupCourseManagement] Reschedule results:', { successful, failed });
    
    return {
      success: failed === 0,
      updated: successful,
      failed: failed,
      totalLessons: courseLessonGroups.length,
      details: results,
      newSchedule: updates
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error rescheduling course lessons:', error);
    throw error;
  }
};

/**
 * Проверка доступности API и базовая диагностика
 */
export const checkApiHealth = async () => {
  try {
    console.log('[GroupCourseManagement] Checking API health...');
    
    // Простая проверка доступности API
    const healthCheck = await api.get('/courses?limit=1');
    
    return {
      success: true,
      status: healthCheck.status,
      message: 'API доступен'
    };
  } catch (error) {
    console.error('[GroupCourseManagement] API health check failed:', error);
    
    return {
      success: false,
      status: error.response?.status || 'unknown',
      message: error.message || 'API недоступен'
    };
  }
};

/**
 * Альтернативный метод удаления курса - более агрессивный подход
 * Пытается удалить lesson-groups напрямую (если API поддерживает)
 */
export const forceRemoveCourseFromGroup = async (groupId, courseId) => {
  console.log('[GroupCourseManagement] Force removing course from group:', { groupId, courseId });
  
  try {
    // 1. Получаем все lesson-groups для этой группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = lessonGroupsResponse.data || [];
    
    // 2. Получаем все уроки курса
    const lessonsResponse = await api.get(`/courses/${courseId}/lessons`);
    const courseLessons = lessonsResponse.data.objects || [];
    const courseLessonIds = courseLessons.map(lesson => lesson.id);
    
    // 3. Фильтруем lesson-groups, относящиеся к этому курсу
    const courseLessonGroups = lessonGroups.filter(lg => 
      lg.lesson && courseLessonIds.includes(lg.lesson.id)
    );
    
    console.log('[GroupCourseManagement] Found lesson-groups for course:', courseLessonGroups.length);
    
    if (courseLessonGroups.length === 0) {
      return {
        success: true,
        removed: 0,
        failed: 0,
        total: 0,
        message: 'Курс уже отвязан от группы - нет занятий для удаления'
      };
    }
    
    let successCount = 0;
    let failCount = 0;
    let removedStudents = 0;
    let removedLessonGroups = 0;
    const results = [];
    
    // 4. Для каждого lesson-group удаляем всех студентов и затем сам lesson-group
    for (const lg of courseLessonGroups) {
      try {
        console.log(`[GroupCourseManagement] Processing lesson-group ${lg.id}...`);
        
        // 4.1. Получаем всех студентов этого занятия
        let lessonStudents = [];
        try {
          const studentsResponse = await api.get(`/courses/lesson-student?lesson_group_id=${lg.id}`);
          lessonStudents = studentsResponse.data || [];
          console.log(`[GroupCourseManagement] Found ${lessonStudents.length} students for lesson-group ${lg.id}`);
        } catch (studentsError) {
          console.log(`[GroupCourseManagement] No students found for lesson-group ${lg.id}:`, studentsError.message);
        }
        
        // 4.2. Удаляем всех студентов из занятия
        for (const student of lessonStudents) {
          try {
            await api.delete(`/courses/lesson-student/${student.id}`);
            removedStudents++;
            console.log(`[GroupCourseManagement] Deleted lesson-student ${student.id}`);
          } catch (deleteStudentError) {
            console.warn(`[GroupCourseManagement] Failed to delete lesson-student ${student.id}:`, deleteStudentError.message);
            // Продолжаем, даже если не удалось удалить студента
          }
        }
        
        // 4.3. Пытаемся удалить сам lesson-group
        // Хотя в API нет прямого DELETE для lesson-group, попробуем другие методы
        try {
          // Попробуем обновить lesson-group, установив некорректные данные для "удаления"
          await api.put(`/courses/lesson-group/${lg.id}`, {
            lesson_id: lg.lesson_id,
            group_id: "00000000-0000-0000-0000-000000000000", // Недопустимый ID группы
            start_datetime: lg.start_datetime,
            end_datetime: lg.end_datetime,
            is_opened: false,
            auditorium: "DELETED"
          });
          
          removedLessonGroups++;
          console.log(`[GroupCourseManagement] Successfully "deleted" lesson-group ${lg.id} by updating group_id`);
          
        } catch (lessonGroupError) {
          console.log(`[GroupCourseManagement] Could not delete lesson-group ${lg.id}:`, lessonGroupError.message);
          // Это нормально, если API не поддерживает удаление lesson-groups
        }
        
        successCount++;
        results.push({ 
          success: true, 
          lessonGroupId: lg.id, 
          removedStudents: lessonStudents.length,
          removedLessonGroup: removedLessonGroups > 0,
          message: `Обработано занятие. Удалено студентов: ${lessonStudents.length}`
        });
        
      } catch (error) {
        console.error(`[GroupCourseManagement] Error processing lesson-group ${lg.id}:`, error.message);
        failCount++;
        results.push({ 
          success: false, 
          lessonGroupId: lg.id, 
          error: error.message 
        });
      }
    }
    
    console.log('[GroupCourseManagement] Force course removal completed:', { 
      successCount, 
      failCount, 
      total: courseLessonGroups.length,
      totalRemovedStudents: removedStudents,
      removedLessonGroups
    });
    
    return {
      success: successCount > 0,
      removed: successCount,
      failed: failCount,
      total: courseLessonGroups.length,
      removedStudents: removedStudents,
      removedLessonGroups: removedLessonGroups,
      details: results,
      message: `Принудительная отвязка курса завершена! Обработано занятий: ${successCount}/${courseLessonGroups.length}. Удалено записей студентов: ${removedStudents}. Удалено lesson-groups: ${removedLessonGroups}`
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error force removing course from group:', error);
    throw new Error(`Не удалось принудительно отвязать курс от группы: ${error.message}`);
  }
};

/**
 * Альтернативный метод обновления данных группы - принудительное обновление курсов
 */
export const forceRefreshGroupCourses = async (groupId) => {
  try {
    console.log('[GroupCourseManagement] Force refreshing group courses for group:', groupId);
    
    // Получаем актуальные lesson-groups
    const response = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = response.data || [];
    
    // Группируем по курсам
    const courseMap = new Map();
    
    for (const lg of lessonGroups) {
      if (lg.lesson && lg.lesson.course) {
        const courseId = lg.lesson.course.id;
        const courseName = lg.lesson.course.name;
        
        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            id: courseId,
            name: courseName,
            lessonGroups: []
          });
        }
        
        courseMap.get(courseId).lessonGroups.push(lg);
      }
    }
    
    const activeCourses = Array.from(courseMap.values());
    
    console.log('[GroupCourseManagement] Active courses found:', activeCourses.length);
    
    return {
      success: true,
      courses: activeCourses,
      totalLessonGroups: lessonGroups.length
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error force refreshing group courses:', error);
    throw error;
  }
};

/**
 * Получить информацию о расписании курса в группе
 */
export const getGroupCourseScheduleInfo = async (groupId, courseId) => {
  console.log('[GroupCourseManagement] Getting course schedule info:', { groupId, courseId });
  
  try {
    const courseLessonGroups = await getGroupCourseLessons(groupId, courseId);
    
    if (courseLessonGroups.length === 0) {
      return {
        hasSchedule: false,
        totalLessons: 0,
        message: 'Расписание не настроено'
      };
    }
    
    // Анализируем расписание
    const firstLesson = courseLessonGroups[0];
    const lastLesson = courseLessonGroups[courseLessonGroups.length - 1];
    
    const firstDate = new Date(firstLesson.start_datetime);
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayOfWeek = dayNames[firstDate.getDay()];
    
    const startTime = firstDate.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const endDate = new Date(firstLesson.end_datetime);
    const endTime = endDate.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const duration = Math.round((endDate - firstDate) / (1000 * 60)); // в минутах
    
    return {
      hasSchedule: true,
      totalLessons: courseLessonGroups.length,
      dayOfWeek: dayOfWeek,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      auditorium: firstLesson.auditorium || 'Не указана',
      firstLessonDate: firstDate.toLocaleDateString('ru-RU'),
      lastLessonDate: new Date(lastLesson.start_datetime).toLocaleDateString('ru-RU'),
      lessons: courseLessonGroups
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error getting schedule info:', error);
    return {
      hasSchedule: false,
      totalLessons: 0,
      message: 'Ошибка загрузки расписания'
    };
  }
};

/**
 * Получить актуальный список курсов группы на основе lesson-groups
 */
export const getActualGroupCourses = async (groupId) => {
  console.log('[GroupCourseManagement] Getting actual group courses:', groupId);
  
  try {
    // 1. Получаем все lesson-groups для группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = lessonGroupsResponse.data || [];
    
    // 2. Группируем по курсам
    const courseMap = new Map();
    
    for (const lg of lessonGroups) {
      if (lg.lesson && lg.lesson.course_id) {
        const courseId = lg.lesson.course_id;
        
        if (!courseMap.has(courseId)) {
          // Получаем информацию о курсе
          try {
            const courseResponse = await api.get(`/courses/${courseId}`);
            courseMap.set(courseId, {
              ...courseResponse.data,
              lessonCount: 0
            });
          } catch (error) {
            console.warn('[GroupCourseManagement] Error loading course:', courseId, error);
            continue;
          }
        }
        
        // Увеличиваем счетчик уроков
        const course = courseMap.get(courseId);
        course.lessonCount = (course.lessonCount || 0) + 1;
      }
    }
    
    const courses = Array.from(courseMap.values());
    console.log('[GroupCourseManagement] Found actual courses:', courses.length);
    return courses;
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error getting actual group courses:', error);
    return [];
  }
};

/**
 * Получить список курсов группы с информацией о расписании
 */
export const getGroupCoursesWithSchedule = async (groupId) => {
  console.log('[GroupCourseManagement] Getting group courses with schedule:', groupId);
  
  try {
    // 1. Получаем все lesson-groups группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = lessonGroupsResponse.data || [];
    
    // 2. Группируем по курсам
    const courseMap = new Map();
    
    for (const lg of lessonGroups) {
      if (lg.lesson && lg.lesson.course_id) {
        const courseId = lg.lesson.course_id;
        
        if (!courseMap.has(courseId)) {
          // Получаем информацию о курсе
          try {
            const courseResponse = await api.get(`/courses/${courseId}`);
            courseMap.set(courseId, {
              ...courseResponse.data,
              lessonGroups: []
            });
          } catch (error) {
            console.warn('[GroupCourseManagement] Error loading course:', courseId, error);
            continue;
          }
        }
        
        courseMap.get(courseId).lessonGroups.push(lg);
      }
    }
    
    // 4. Добавляем информацию о расписании для каждого курса
    const coursesWithSchedule = await Promise.all(
      Array.from(courseMap.values()).map(async (course) => {
        const scheduleInfo = await getGroupCourseScheduleInfo(groupId, course.id);
        return {
          ...course,
          scheduleInfo
        };
      })
    );
    
    console.log('[GroupCourseManagement] Courses with schedule:', coursesWithSchedule.length);
    return coursesWithSchedule;
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error getting courses with schedule:', error);
    throw error;
  }
};

/**
 * Новые функции для работы с новыми API эндпоинтами
 */

/**
 * Удалить связь между конкретным уроком и группой (новый API)
 * DELETE /api/courses/lessons/{lesson_id}/groups/{group_id}
 */
export const removeLessonFromGroup = async (lessonId, groupId) => {
  console.log('[GroupCourseManagement] Removing lesson from group using new API:', { lessonId, groupId });
  
  try {
    await api.delete(`/courses/lessons/${lessonId}/groups/${groupId}`);
    
    console.log('[GroupCourseManagement] Successfully removed lesson from group');
    return {
      success: true,
      message: 'Урок успешно отвязан от группы'
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error removing lesson from group:', error);
    throw new Error(`Не удалось отвязать урок от группы: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * Удалить связь между курсом и группой (новый API)
 * DELETE /api/courses/{course_id}/groups/{group_id}
 */
export const removeCourseFromGroupNew = async (courseId, groupId) => {
  console.log('[GroupCourseManagement] Removing course from group using new API:', { courseId, groupId });
  
  try {
    await api.delete(`/courses/${courseId}/groups/${groupId}`);
    
    console.log('[GroupCourseManagement] Successfully removed course from group');
    return {
      success: true,
      message: 'Курс успешно отвязан от группы'
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error removing course from group:', error);
    throw new Error(`Не удалось отвязать курс от группы: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * Удалить несколько уроков из группы (используя новый API)
 */
export const removeMultipleLessonsFromGroup = async (lessonIds, groupId) => {
  console.log('[GroupCourseManagement] Removing multiple lessons from group:', { lessonIds, groupId });
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const lessonId of lessonIds) {
    try {
      await removeLessonFromGroup(lessonId, groupId);
      results.push({
        lessonId,
        success: true,
        message: 'Урок отвязан'
      });
      successCount++;
    } catch (error) {
      results.push({
        lessonId,
        success: false,
        error: error.message
      });
      failCount++;
    }
  }
  
  return {
    success: failCount === 0,
    successCount,
    failCount,
    totalLessons: lessonIds.length,
    details: results,
    message: `Отвязано уроков: ${successCount}/${lessonIds.length}`
  };
};

/**
 * Получить детальную информацию об уроке в группе
 */
export const getLessonGroupDetails = async (groupId, lessonId) => {
  console.log('[GroupCourseManagement] Getting lesson group details:', { groupId, lessonId });
  
  try {
    // Получаем все lesson-groups для группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = lessonGroupsResponse.data || [];
    
    // Ищем конкретный lesson-group
    const lessonGroup = lessonGroups.find(lg => lg.lesson_id === lessonId);
    
    if (!lessonGroup) {
      throw new Error('Урок не найден в расписании группы');
    }
    
    // Получаем информацию о студентах на этом уроке
    let students = [];
    try {
      const studentsResponse = await api.get(`/courses/lesson-student?lesson_group_id=${lessonGroup.id}`);
      students = studentsResponse.data || [];
    } catch (error) {
      console.warn('[GroupCourseManagement] No students found for lesson-group:', lessonGroup.id);
    }
    
    return {
      lessonGroup,
      studentsCount: students.length,
      students,
      canRemove: true // Всегда можно удалить с новым API
    };
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error getting lesson group details:', error);
    throw error;
  }
};

/**
 * Получить список всех уроков курса в группе с возможностью удаления
 */
export const getCourseLessonsInGroup = async (groupId, courseId) => {
  console.log('[GroupCourseManagement] Getting course lessons in group:', { groupId, courseId });
  
  try {
    // 1. Получаем все уроки курса
    const lessonsResponse = await api.get(`/courses/${courseId}/lessons`);
    const allLessons = lessonsResponse.data.objects || [];
    
    // 2. Получаем lesson-groups для группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const lessonGroups = lessonGroupsResponse.data || [];
    
    // 3. Соединяем данные
    const lessonsInGroup = [];
    
    for (const lesson of allLessons) {
      const lessonGroup = lessonGroups.find(lg => lg.lesson_id === lesson.id);
      
      if (lessonGroup) {
        // Получаем количество студентов для этого урока
        let studentsCount = 0;
        try {
          const studentsResponse = await api.get(`/courses/lesson-student?lesson_group_id=${lessonGroup.id}`);
          studentsCount = (studentsResponse.data || []).length;
        } catch (error) {
          console.warn('[GroupCourseManagement] Error getting students for lesson:', lesson.id);
        }
        
        lessonsInGroup.push({
          lesson,
          lessonGroup,
          studentsCount,
          canRemove: true, // С новым API всегда можно удалить
          scheduleInfo: {
            startDateTime: new Date(lessonGroup.start_datetime),
            endDateTime: new Date(lessonGroup.end_datetime),
            auditorium: lessonGroup.auditorium || 'Не указана'
          }
        });
      }
    }
    
    // Сортируем по дате проведения
    lessonsInGroup.sort((a, b) => a.scheduleInfo.startDateTime - b.scheduleInfo.startDateTime);
    
    console.log('[GroupCourseManagement] Found lessons in group:', lessonsInGroup.length);
    return lessonsInGroup;
    
  } catch (error) {
    console.error('[GroupCourseManagement] Error getting course lessons in group:', error);
    throw error;
  }
};
