/**
 * Сервис для автоматического планирования расписания групп
 */
import api from '../api/axiosInstance';

/**
 * Дни недели (для автоматического планирования)
 */
export const WEEKDAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0
};

export const WEEKDAY_NAMES = {
  [WEEKDAYS.MONDAY]: 'Понедельник',
  [WEEKDAYS.TUESDAY]: 'Вторник',
  [WEEKDAYS.WEDNESDAY]: 'Среда',
  [WEEKDAYS.THURSDAY]: 'Четверг',
  [WEEKDAYS.FRIDAY]: 'Пятница',
  [WEEKDAYS.SATURDAY]: 'Суббота',
  [WEEKDAYS.SUNDAY]: 'Воскресенье'
};

/**
 * Интервалы занятий
 */
export const INTERVALS = {
  WEEKLY: 'weekly',        // каждую неделю
  BIWEEKLY: 'biweekly',   // раз в две недели
  MONTHLY: 'monthly'       // раз в месяц
};

export const INTERVAL_NAMES = {
  [INTERVALS.WEEKLY]: 'Каждую неделю',
  [INTERVALS.BIWEEKLY]: 'Раз в две недели',
  [INTERVALS.MONTHLY]: 'Раз в месяц'
};

/**
 * Получает настройки по умолчанию из localStorage или использует стандартные
 */
const getDefaultSettings = () => {
  const saved = localStorage.getItem('default_schedule_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.warn('[GroupScheduleService] Error parsing default settings:', error);
    }
  }
  
  // Стандартные настройки
  return {
    dayOfWeek: WEEKDAYS.MONDAY,
    startTime: '18:00',
    endTime: '20:00',
    interval: INTERVALS.WEEKLY
  };
};

/**
 * Настройки расписания группы
 */
export class GroupScheduleSettings {
  constructor({
    dayOfWeek = null,
    startTime = null,
    endTime = null,
    interval = null,
    startDate = null,
    auditorium = ''
  } = {}) {
    const defaults = getDefaultSettings();
    
    this.dayOfWeek = dayOfWeek !== null ? dayOfWeek : defaults.dayOfWeek;
    this.startTime = startTime || defaults.startTime;
    this.endTime = endTime || defaults.endTime;
    this.interval = interval || defaults.interval;
    this.startDate = startDate || new Date().toISOString().split('T')[0];
    this.auditorium = auditorium;
  }
}

/**
 * Генерирует расписание для курса на основе настроек группы
 */
export const generateCourseSchedule = (lessons, scheduleSettings) => {
  console.log('[GroupScheduleService] Generating schedule for lessons:', { 
    lessonCount: lessons.length, 
    settings: scheduleSettings 
  });

  const { dayOfWeek, startTime, endTime, interval, startDate, auditorium } = scheduleSettings;
  const schedule = [];

  // Находим первую дату занятий
  let currentDate = new Date(startDate);
  
  // Находим ближайший нужный день недели
  while (currentDate.getDay() !== dayOfWeek) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Генерируем расписание для каждого урока
  lessons.forEach((lesson, index) => {
    // Вычисляем дату урока
    let lessonDate = new Date(currentDate);
    
    // Добавляем интервал в зависимости от настроек
    switch (interval) {
      case INTERVALS.WEEKLY:
        lessonDate.setDate(lessonDate.getDate() + (index * 7));
        break;
      case INTERVALS.BIWEEKLY:
        lessonDate.setDate(lessonDate.getDate() + (index * 14));
        break;
      case INTERVALS.MONTHLY:
        lessonDate.setMonth(lessonDate.getMonth() + index);
        break;
    }

    // Формируем datetime для начала и конца урока
    const startDateTime = new Date(lessonDate);
    const [startHour, startMinute] = startTime.split(':');
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const endDateTime = new Date(lessonDate);
    const [endHour, endMinute] = endTime.split(':');
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    schedule.push({
      lesson_id: lesson.id,
      start_datetime: startDateTime.toISOString(),
      end_datetime: endDateTime.toISOString(),
      auditorium: auditorium || '',
      lesson_name: lesson.name,
      lesson_order: index + 1
    });
  });

  console.log('[GroupScheduleService] Generated schedule:', schedule);
  return schedule;
};

/**
 * Создает автоматическое расписание для группы и курса
 */
export const createAutoSchedule = async (groupId, courseId, scheduleSettings) => {
  console.log('[GroupScheduleService] Creating auto schedule:', { 
    groupId, 
    courseId, 
    scheduleSettings 
  });

  try {
    // Получаем уроки курса
    const lessonsResponse = await api.get(`/courses/${courseId}/lessons`);
    const lessons = lessonsResponse.data.objects || [];
    
    if (lessons.length === 0) {
      throw new Error('У курса нет уроков');
    }

    // Генерируем расписание
    const schedule = generateCourseSchedule(lessons, scheduleSettings);

    // Формируем массив lesson-group объектов
    const lessonGroups = schedule.map(item => ({
      lesson_id: item.lesson_id,
      group_id: groupId,
      start_datetime: item.start_datetime,
      end_datetime: item.end_datetime,
      is_opened: false,
      auditorium: item.auditorium
    }));

    // Создаем lesson-groups через bulk API
    const response = await api.post('/courses/lesson-groups', lessonGroups);
    
    console.log('[GroupScheduleService] Auto schedule created successfully:', response.data);
    return {
      success: true,
      schedule: response.data,
      lessonCount: lessons.length
    };

  } catch (error) {
    console.error('[GroupScheduleService] Error creating auto schedule:', error);
    throw error;
  }
};

/**
 * Добавляет новый урок в существующее расписание группы
 */
export const addLessonToGroupSchedule = async (groupId, courseId, lessonId, scheduleSettings) => {
  console.log('[GroupScheduleService] Adding lesson to group schedule:', { 
    groupId, 
    courseId, 
    lessonId, 
    scheduleSettings 
  });

  try {
    // Получаем существующие lesson-groups для этой группы и курса
    let existingLessonGroups = [];
    let courseLessonIds = [];
    
    try {
      const existingResponse = await api.get('/courses/lesson-group', {
        params: { group_id: groupId }
      });
      existingLessonGroups = existingResponse.data || [];

      // Фильтруем только lesson-groups этого курса
      const courseResponse = await api.get(`/courses/${courseId}/lessons`);
      courseLessonIds = (courseResponse.data.objects || []).map(lesson => lesson.id);
    } catch (error) {
      console.warn('[GroupScheduleService] Error loading existing lesson-groups (this is OK for new groups):', error);
      // Продолжаем с пустыми массивами
    }
    
    const courseLessonGroups = existingLessonGroups.filter(lg => 
      courseLessonIds.includes(lg.lesson_id)
    );

    // Вычисляем порядковый номер нового урока
    const lessonOrder = courseLessonGroups.length;

    // Находим дату первого урока этого курса для определения паттерна
    let baseDate;
    if (courseLessonGroups.length > 0) {
      // Берем дату первого урока как базовую
      const firstLesson = courseLessonGroups.sort((a, b) => 
        new Date(a.start_datetime) - new Date(b.start_datetime)
      )[0];
      baseDate = new Date(firstLesson.start_datetime);
    } else {
      // Если это первый урок курса, используем настройки
      baseDate = new Date(scheduleSettings.startDate);
      while (baseDate.getDay() !== scheduleSettings.dayOfWeek) {
        baseDate.setDate(baseDate.getDate() + 1);
      }
    }

    // Вычисляем дату нового урока
    let lessonDate = new Date(baseDate);
    switch (scheduleSettings.interval) {
      case INTERVALS.WEEKLY:
        lessonDate.setDate(lessonDate.getDate() + (lessonOrder * 7));
        break;
      case INTERVALS.BIWEEKLY:
        lessonDate.setDate(lessonDate.getDate() + (lessonOrder * 14));
        break;
      case INTERVALS.MONTHLY:
        lessonDate.setMonth(lessonDate.getMonth() + lessonOrder);
        break;
    }

    // Формируем datetime для начала и конца урока
    const startDateTime = new Date(lessonDate);
    const [startHour, startMinute] = scheduleSettings.startTime.split(':');
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const endDateTime = new Date(lessonDate);
    const [endHour, endMinute] = scheduleSettings.endTime.split(':');
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    // Создаем lesson-group
    const lessonGroup = {
      lesson_id: lessonId,
      group_id: groupId,
      start_datetime: startDateTime.toISOString(),
      end_datetime: endDateTime.toISOString(),
      is_opened: false,
      auditorium: scheduleSettings.auditorium || ''
    };

    const response = await api.post('/courses/lesson-group', lessonGroup);
    
    console.log('[GroupScheduleService] Lesson added to schedule successfully:', response.data);
    return {
      success: true,
      lessonGroup: response.data
    };

  } catch (error) {
    console.error('[GroupScheduleService] Error adding lesson to schedule:', error);
    throw error;
  }
};

/**
 * Обновляет настройки расписания группы (в локальном хранилище или через API)
 */
export const saveGroupScheduleSettings = (groupId, scheduleSettings) => {
  const key = `group_schedule_${groupId}`;
  localStorage.setItem(key, JSON.stringify(scheduleSettings));
  console.log('[GroupScheduleService] Schedule settings saved:', { groupId, scheduleSettings });
};

/**
 * Загружает настройки расписания группы
 */
export const loadGroupScheduleSettings = (groupId) => {
  const key = `group_schedule_${groupId}`;
  const saved = localStorage.getItem(key);
  
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      console.log('[GroupScheduleService] Schedule settings loaded:', { groupId, settings });
      return new GroupScheduleSettings(settings);
    } catch (error) {
      console.warn('[GroupScheduleService] Error parsing saved settings:', error);
    }
  }
  
  // Возвращаем настройки по умолчанию
  return new GroupScheduleSettings();
};

/**
 * Валидация настроек расписания
 */
export const validateScheduleSettings = (scheduleSettings) => {
  const errors = {};

  if (!scheduleSettings.dayOfWeek || ![0,1,2,3,4,5,6].includes(scheduleSettings.dayOfWeek)) {
    errors.dayOfWeek = 'Выберите день недели';
  }

  if (!scheduleSettings.startTime || !/^\d{2}:\d{2}$/.test(scheduleSettings.startTime)) {
    errors.startTime = 'Введите корректное время начала (HH:MM)';
  }

  if (!scheduleSettings.endTime || !/^\d{2}:\d{2}$/.test(scheduleSettings.endTime)) {
    errors.endTime = 'Введите корректное время окончания (HH:MM)';
  }

  if (scheduleSettings.startTime && scheduleSettings.endTime) {
    const startMinutes = timeToMinutes(scheduleSettings.startTime);
    const endMinutes = timeToMinutes(scheduleSettings.endTime);
    
    if (endMinutes <= startMinutes) {
      errors.endTime = 'Время окончания должно быть позже времени начала';
    }
  }

  if (!scheduleSettings.interval || !Object.values(INTERVALS).includes(scheduleSettings.interval)) {
    errors.interval = 'Выберите интервал занятий';
  }

  if (!scheduleSettings.startDate) {
    errors.startDate = 'Выберите дату начала занятий';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Вспомогательная функция для конвертации времени в минуты
 */
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Получает все группы, которые связаны с конкретным курсом
 */
export const getGroupsByCourse = async (courseId) => {
  console.log('[GroupScheduleService] Getting groups for course:', courseId);
  
  try {
    // Получаем все уроки курса
    const lessonsResponse = await api.get(`/courses/${courseId}/lessons`);
    const courseLessons = lessonsResponse.data.objects || [];
    const courseLessonIds = courseLessons.map(lesson => lesson.id);
    
    if (courseLessonIds.length === 0) {
      console.log('[GroupScheduleService] No lessons found for course');
      return [];
    }
    
    // Получаем все группы
    const groupsResponse = await api.get('/groups');
    const allGroups = groupsResponse.data.objects || [];
    
    // Для каждой группы проверяем, есть ли у неё lesson-groups с уроками этого курса
    const courseGroupIds = new Set();
    
    for (const group of allGroups) {
      try {
        // Получаем lesson-groups для каждой группы
        const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${group.id}`);
        const groupLessonGroups = lessonGroupsResponse.data || [];
        
        // Проверяем, есть ли lesson-groups с уроками этого курса
        const hasCourseLessons = groupLessonGroups.some(lg => 
          lg.lesson && courseLessonIds.includes(lg.lesson.lesson_id || lg.lesson_id)
        );
        
        if (hasCourseLessons) {
          courseGroupIds.add(group.id);
        }
      } catch (error) {
        console.warn(`[GroupScheduleService] Error checking group ${group.id}:`, error);
        // Продолжаем с другими группами
      }
    }
    
    console.log('[GroupScheduleService] Found groups for course:', Array.from(courseGroupIds));
    return Array.from(courseGroupIds);
    
  } catch (error) {
    console.error('[GroupScheduleService] Error getting groups for course:', error);
    return [];
  }
};

/**
 * Получает все курсы, которые связаны с конкретной группой
 */
export const getCoursesByGroup = async (groupId) => {
  console.log('[GroupScheduleService] Getting courses for group:', groupId);
  
  try {
    // Получаем все lesson-groups для этой группы
    const lessonGroupsResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const groupLessonGroups = lessonGroupsResponse.data || [];
    
    if (groupLessonGroups.length === 0) {
      console.log('[GroupScheduleService] No lesson groups found for this group');
      return [];
    }
    
    // Получаем уникальные course_id из уроков
    const courseIds = new Set();
    groupLessonGroups.forEach(lg => {
      if (lg.lesson && lg.lesson.course_id) {
        courseIds.add(lg.lesson.course_id);
      }
    });
    
    // Получаем информацию о курсах
    const coursesData = [];
    for (const courseId of courseIds) {
      try {
        const courseResponse = await api.get(`/courses/${courseId}`);
        coursesData.push(courseResponse.data);
      } catch (error) {
        console.error(`[GroupScheduleService] Error fetching course ${courseId}:`, error);
      }
    }
    
    console.log('[GroupScheduleService] Found courses for group:', coursesData.map(c => ({ id: c.id, name: c.name })));
    return coursesData;
    
  } catch (error) {
    console.error('[GroupScheduleService] Error getting courses for group:', error);
    return [];
  }
};

/**
 * Автоматически добавляет новый урок во все группы курса
 */
export const autoAddLessonToAllCourseGroups = async (courseId, lessonId) => {
  console.log('[GroupScheduleService] Auto adding lesson to all course groups:', { courseId, lessonId });
  
  try {
    // Получаем все группы курса
    const groupIds = await getGroupsByCourse(courseId);
    
    if (groupIds.length === 0) {
      console.log('[GroupScheduleService] No groups found for course - skipping auto schedule');
      return {
        success: true,
        message: 'Курс пока не привязан к группам',
        results: []
      };
    }
    
    // Для каждой группы добавляем урок в расписание
    const addPromises = groupIds.map(async (groupId) => {
      try {
        // Загружаем настройки расписания группы
        const scheduleSettings = loadGroupScheduleSettings(groupId);
        
        console.log('[GroupScheduleService] Adding lesson to group:', { 
          groupId, 
          lessonId,
          scheduleSettings 
        });
        
        // Добавляем урок в расписание группы
        const result = await addLessonToGroupSchedule(groupId, courseId, lessonId, scheduleSettings);
        
        return { 
          groupId, 
          success: true, 
          lessonGroup: result.lessonGroup 
        };
        
      } catch (error) {
        console.error(`[GroupScheduleService] Error adding lesson to group ${groupId}:`, error);
        return { 
          groupId, 
          success: false, 
          error: error.message 
        };
      }
    });
    
    // Ждем выполнения всех операций
    const results = await Promise.all(addPromises);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('[GroupScheduleService] Auto add results:', { 
      total: results.length,
      success: successCount,
      failed: failCount,
      results 
    });
    
    return {
      success: true,
      total: results.length,
      successCount,
      failCount,
      results
    };
    
  } catch (error) {
    console.error('[GroupScheduleService] Error in auto add lesson:', error);
    throw error;
  }
};

/**
 * Обновить расписание группы - проверить все уроки курса и добавить недостающие
 * @param {string} groupId - ID группы
 * @param {string} courseId - ID курса
 * @returns {Promise<Object>} Результат обновления
 */
export const refreshGroupSchedule = async (groupId, courseId) => {
  try {
    console.log(`[GroupScheduleService] Refreshing schedule for group ${groupId}, course ${courseId}`);
    
    // Получаем все уроки курса
    const lessonsResponse = await api.get(`/courses/${courseId}/lessons?limit=100`);
    const allLessons = lessonsResponse.data.objects || [];
    
    if (allLessons.length === 0) {
      return {
        success: true,
        message: 'В курсе нет уроков для добавления',
        total: 0,
        added: 0,
        existing: 0
      };
    }
    
    // Получаем существующие lesson_groups для этой группы
    const existingResponse = await api.get(`/courses/lesson-group?group_id=${groupId}`);
    const existingLessonGroups = existingResponse.data || [];
    
    // Находим уроки этого курса среди существующих
    const existingLessonIds = existingLessonGroups
      .filter(lg => lg.lesson && lg.lesson.course_id === courseId)
      .map(lg => lg.lesson_id);
    
    // Находим недостающие уроки
    const missingLessons = allLessons.filter(lesson => !existingLessonIds.includes(lesson.id));
    
    if (missingLessons.length === 0) {
      return {
        success: true,
        message: 'Все уроки уже добавлены в расписание группы',
        total: allLessons.length,
        added: 0,
        existing: allLessons.length
      };
    }
    
    // Загружаем настройки расписания группы
    const settings = loadGroupScheduleSettings(groupId);
    if (!settings || !settings.dayOfWeek) {
      return {
        success: false,
        message: 'Не настроено расписание для группы. Пожалуйста, настройте расписание в настройках группы.',
        total: allLessons.length,
        added: 0,
        existing: existingLessonIds.length
      };
    }
    
    // Добавляем недостающие уроки
    const results = [];
    let addedCount = 0;
    
    for (const lesson of missingLessons) {
      try {
        const result = await addLessonToGroupSchedule(groupId, courseId, lesson.id, settings);
        results.push({
          lessonId: lesson.id,
          lessonName: lesson.name,
          success: true,
          lessonGroupId: result.lessonGroup.id
        });
        addedCount++;
        console.log(`[GroupScheduleService] Added lesson ${lesson.name} to group schedule`);
      } catch (error) {
        console.error(`[GroupScheduleService] Failed to add lesson ${lesson.name}:`, error);
        results.push({
          lessonId: lesson.id,
          lessonName: lesson.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      message: `Обновление завершено: добавлено ${addedCount} из ${missingLessons.length} недостающих уроков`,
      total: allLessons.length,
      added: addedCount,
      existing: existingLessonIds.length,
      results
    };
    
  } catch (error) {
    console.error('[GroupScheduleService] Error refreshing group schedule:', error);
    throw error;
  }
};

export default {
  WEEKDAYS,
  WEEKDAY_NAMES,
  INTERVALS,
  INTERVAL_NAMES,
  GroupScheduleSettings,
  generateCourseSchedule,
  createAutoSchedule,
  addLessonToGroupSchedule,
  getGroupsByCourse,
  getCoursesByGroup,
  autoAddLessonToAllCourseGroups,
  refreshGroupSchedule,
  saveGroupScheduleSettings,
  loadGroupScheduleSettings,
  validateScheduleSettings
};
