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
      try {
        // Получаем информацию о группе
        let groupInfo = null;
        let teacherInfo = null;
        
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
    const scheduleData = response.data || [];
    
    // Получаем уникальные ID групп
    const uniqueGroupIds = [...new Set(scheduleData.map(item => item.group_id).filter(Boolean))];
    
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

    // Обогащаем данные расписания
    const enhancedSchedule = scheduleData.map(item => {
      const groupInfo = groupsMap.get(item.group_id);
      const teacherInfo = groupInfo?.teacher;

      return {
        id: item.id,
        lesson_id: item.lesson_id,
        lesson_name: item.lesson_name,
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
    });

    console.log('[ScheduleService] Optimized enhanced schedule:', enhancedSchedule);
    return enhancedSchedule;

  } catch (error) {
    console.error('Ошибка получения оптимизированного расписания:', error);
    throw error;
  }
};
