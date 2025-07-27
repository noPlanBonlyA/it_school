/*  src/services/scheduleService.js  */
import api from '../api/axiosInstance';

/**
 * Получение расписания пользователя
 */
export const getUserSchedule = async (user) => {
  try {
    if (!user || !user.role) {
      throw new Error('Пользователь не определен');
    }

    console.log('[ScheduleService] Getting schedule for user:', user.role, user.id);

    // Получаем базовое расписание
    const response = await api.get('/schedule/');
    const scheduleData = response.data || [];
    
    console.log('[ScheduleService] Raw schedule data:', scheduleData);

    // Дополняем данные информацией о группах и преподавателях
    const enhancedSchedule = await Promise.all(scheduleData.map(async (item) => {
      // Получаем информацию о группе
      let groupInfo = null;
      let teacherInfo = null;
      let courseId = item.course_id; // Пытаемся использовать course_id из исходных данных
      
      // ИСПРАВЛЕНО: Если course_id отсутствует, пытаемся получить его из lesson-group
      if (!courseId && item.lesson_id && item.group_id) {
        try {
          console.log('[ScheduleService] Course ID missing for lesson', item.lesson_id, ', trying to get from lesson-group...');
          const lessonGroupResponse = await api.get('/courses/lesson-group', {
            params: { 
              group_id: item.group_id
            }
          });
          const lessonGroups = lessonGroupResponse.data;
          
          // Ищем подходящий lesson-group для данного урока
          const matchingLessonGroup = Array.isArray(lessonGroups) ? 
            lessonGroups.find(lg => lg.lesson_id === item.lesson_id) : 
            lessonGroups;
            
          if (matchingLessonGroup && matchingLessonGroup.lesson && matchingLessonGroup.lesson.course_id) {
            courseId = matchingLessonGroup.lesson.course_id;
            console.log('[ScheduleService] Retrieved course_id from lesson-group:', courseId);
          }
        } catch (lgError) {
          console.warn('[ScheduleService] Could not get course_id from lesson-group:', lgError);
        }
      }
      
      try {
        if (item.group_id) {
          try {
            const groupResponse = await api.get(`/groups/${item.group_id}`);
            groupInfo = groupResponse.data;
            
            // Получаем информацию о преподавателе из группы
            if (groupInfo.teacher) {
              teacherInfo = groupInfo.teacher;
            }
          } catch (groupError) {
            console.warn('[ScheduleService] Could not load group info:', groupError);
          }
        }

        return {
          id: item.id,
          lesson_id: item.lesson_id,
          lesson_name: item.lesson_name,
          course_id: courseId, // ИСПРАВЛЕНО: используем правильно полученный course_id
          course_name: item.course_name,
          group_id: item.group_id,
          group_name: groupInfo?.name || 'Группа не найдена',
          teacher_name: teacherInfo ? 
            `${teacherInfo.user.first_name || ''} ${teacherInfo.user.surname || ''}`.trim() || 
            teacherInfo.user.username : 
            'Преподаватель не назначен',
          start_datetime: item.start_datetime,
          end_datetime: item.end_datetime,
          auditorium: item.auditorium || '',
          is_opened: item.is_opened,
          description: item.description || '',
          // Для обратной совместимости
          holding_date: item.start_datetime,
          start: item.start_datetime,
          end: item.end_datetime
        };
      } catch (error) {
        console.error('[ScheduleService] Error enhancing schedule item:', error);
        // Возвращаем базовые данные если не удалось получить дополнительную информацию
        return {
          id: item.id,
          lesson_id: item.lesson_id,
          lesson_name: item.lesson_name,
          course_id: courseId, // ИСПРАВЛЕНО: используем правильно полученный course_id
          course_name: item.course_name,
          group_id: item.group_id,
          group_name: 'Группа не найдена',
          teacher_name: 'Преподаватель не назначен',
          start_datetime: item.start_datetime,
          end_datetime: item.end_datetime,
          auditorium: item.auditorium || '',
          is_opened: item.is_opened,
          description: item.description || '',
          holding_date: item.start_datetime,
          start: item.start_datetime,
          end: item.end_datetime
        };
      }
    }));

    console.log('[ScheduleService] Enhanced schedule:', enhancedSchedule);
    return enhancedSchedule;

  } catch (error) {
    console.error('Ошибка получения расписания:', error);
    throw error;
  }
};

/**
 * Получение расписания за период
 */
export const getScheduleByDateRange = async (startDate, endDate) => {
  try {
    const response = await api.get('/schedule/lessons', {
      params: {
        datetime_start: startDate,
        datetime_end: endDate
      }
    });
    
    const scheduleData = response.data || [];
    
    // Дополняем данные информацией о группах и преподавателях
    const enhancedSchedule = await Promise.all(scheduleData.map(async (item) => {
      try {
        let groupInfo = null;
        let teacherInfo = null;
        
        if (item.group_id) {
          try {
            const groupResponse = await api.get(`/groups/${item.group_id}`);
            groupInfo = groupResponse.data;
            
            if (groupInfo.teacher) {
              teacherInfo = groupInfo.teacher;
            }
          } catch (groupError) {
            console.warn('[ScheduleService] Could not load group info:', groupError);
          }
        }

        return {
          id: item.id,
          lesson_id: item.lesson_id,
          lesson_name: item.lesson_name,
          course_id: item.course_id, // ДОБАВЛЕНО: course_id из исходных данных
          course_name: item.course_name,
          group_id: item.group_id,
          group_name: groupInfo?.name || 'Группа не найдена',
          teacher_name: teacherInfo ? 
            `${teacherInfo.user.first_name || ''} ${teacherInfo.user.surname || ''}`.trim() || 
            teacherInfo.user.username : 
            'Преподаватель не назначен',
          start_datetime: item.start_datetime,
          end_datetime: item.end_datetime,
          auditorium: item.auditorium || '',
          is_opened: item.is_opened,
          description: item.description || '',
          holding_date: item.start_datetime,
          start: item.start_datetime,
          end: item.end_datetime
        };
      } catch (error) {
        console.error('[ScheduleService] Error enhancing schedule item:', error);
        return {
          id: item.id,
          lesson_id: item.lesson_id,
          lesson_name: item.lesson_name,
          course_id: item.course_id, // ДОБАВЛЕНО: course_id из исходных данных
          course_name: item.course_name,
          group_id: item.group_id,
          group_name: 'Группа не найдена',
          teacher_name: 'Преподаватель не назначен',
          start_datetime: item.start_datetime,
          end_datetime: item.end_datetime,
          auditorium: item.auditorium || '',
          is_opened: item.is_opened,
          description: item.description || '',
          holding_date: item.start_datetime,
          start: item.start_datetime,
          end: item.end_datetime
        };
      }
    }));

    return enhancedSchedule;
    
  } catch (error) {
    console.error('Ошибка получения расписания по датам:', error);
    throw error;
  }
};

/**
 * Кэширование для оптимизации запросов к группам
 */
const groupCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

const getCachedGroup = async (groupId) => {
  const now = Date.now();
  const cached = groupCache.get(groupId);
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const response = await api.get(`/groups/${groupId}`);
    groupCache.set(groupId, {
      data: response.data,
      timestamp: now
    });
    return response.data;
  } catch (error) {
    console.warn(`[ScheduleService] Could not load group ${groupId}:`, error);
    return null;
  }
};

/**
 * Оптимизированная версия получения расписания с кэшированием
 */
export const getUserScheduleOptimized = async (user) => {
  try {
    if (!user || !user.role) {
      throw new Error('Пользователь не определен');
    }

    console.log('[ScheduleService] Getting optimized schedule for user:', user.role, user.id);

    const response = await api.get('/schedule/');
    const data = response.data || {};
    
    // Новая схема API возвращает объект с lessons и events
    const lessons = data.lessons || [];
    const events = data.events || [];
    
    console.log('[ScheduleService] Received lessons:', lessons.length, 'events:', events.length);
    
    // Получаем уникальные ID групп из уроков
    const uniqueGroupIds = [...new Set(lessons.map(item => item.group_id).filter(Boolean))];
    
    // Загружаем все группы параллельно
    const groupsPromises = uniqueGroupIds.map(groupId => getCachedGroup(groupId));
    const groups = await Promise.all(groupsPromises);
    
    // Создаем мапу групп для быстрого доступа
    const groupsMap = new Map();
    uniqueGroupIds.forEach((groupId, index) => {
      if (groups[index]) {
        groupsMap.set(groupId, groups[index]);
      }
    });

    // Обогащаем данные уроков
    const enhancedLessons = await Promise.all(lessons.map(async (item) => {
      const groupInfo = groupsMap.get(item.group_id);
      const teacherInfo = groupInfo?.teacher;
      let courseId = item.course_id; // Используем course_id из исходных данных
      
      // ИСПРАВЛЕНО: Если course_id отсутствует, пытаемся получить его из lesson-group
      if (!courseId && item.lesson_id && item.group_id) {
        try {
          console.log('[ScheduleService] Course ID missing for lesson', item.lesson_id, ', trying to get from lesson-group...');
          const lessonGroupResponse = await api.get('/courses/lesson-group', {
            params: { 
              group_id: item.group_id
            }
          });
          const lessonGroups = lessonGroupResponse.data;
          
          // Ищем подходящий lesson-group для данного урока
          const matchingLessonGroup = Array.isArray(lessonGroups) ? 
            lessonGroups.find(lg => lg.lesson_id === item.lesson_id) : 
            lessonGroups;
            
          if (matchingLessonGroup && matchingLessonGroup.lesson && matchingLessonGroup.lesson.course_id) {
            courseId = matchingLessonGroup.lesson.course_id;
            console.log('[ScheduleService] Retrieved course_id from lesson-group:', courseId);
          }
        } catch (lgError) {
          console.warn('[ScheduleService] Could not get course_id from lesson-group:', lgError);
        }
      }

      return {
        id: item.id,
        lesson_id: item.lesson_id,
        lesson_name: item.lesson_name,
        course_id: courseId,
        course_name: item.course_name,
        group_id: item.group_id,
        group_name: groupInfo?.name || 'Группа не найдена',
        teacher_name: teacherInfo ? 
          `${teacherInfo.user.first_name || ''} ${teacherInfo.user.surname || ''}`.trim() || 
          teacherInfo.user.username : 
          'Преподаватель не назначен',
        start_datetime: item.start_datetime,
        end_datetime: item.end_datetime,
        auditorium: item.auditorium || '',
        is_opened: item.is_opened,
        description: item.description || '',
        type: 'lesson', // Маркируем как урок
        // Для обратной совместимости
        holding_date: item.start_datetime,
        start: item.start_datetime,
        end: item.end_datetime
      };
    }));

    // Обогащаем данные событий
    const enhancedEvents = events.map(event => ({
      id: event.event_id,
      event_id: event.event_id,
      name: event.event_name,
      lesson_name: event.event_name, // Для совместимости
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      auditorium: event.auditorium || '',
      description: event.description || '',
      type: 'event', // Маркируем как событие
      is_opened: true, // События считаем открытыми
      // Для обратной совместимости
      holding_date: event.start_datetime,
      start: event.start_datetime,
      end: event.end_datetime
    }));

    // Объединяем уроки и события
    const combinedSchedule = [...enhancedLessons, ...enhancedEvents];
    
    console.log('[ScheduleService] Enhanced schedule:', combinedSchedule.length, 'items');
    return combinedSchedule;

  } catch (error) {
    console.error('[ScheduleService] Error getting optimized schedule:', error);
    throw error;
  }
};

// Функция для обновления lesson-group
export const updateLessonGroup = async (lessonGroupId, updateData) => {
  try {
    console.log('[ScheduleService] Updating lesson group:', { lessonGroupId, updateData });
    
    const response = await api.put(`/courses/lesson-group/${lessonGroupId}`, updateData);
    
    console.log('[ScheduleService] Lesson group updated:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('[ScheduleService] Error updating lesson group:', error);
    
    // Обработка специфичных ошибок
    if (error.response?.status === 403) {
      throw new Error('Недостаточно прав для изменения урока');
    } else if (error.response?.status === 404) {
      throw new Error('Урок не найден');
    } else if (error.response?.status === 422) {
      throw new Error('Неверные данные для обновления');
    }
    
    throw error;
  }
};
