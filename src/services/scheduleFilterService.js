// src/services/scheduleFilterService.js

import api from '../api/axiosInstance';

/**
 * Получение отфильтрованного расписания для админов
 * @param {Object} filters - Объект с фильтрами
 * @param {string} filters.group_id - ID группы
 * @param {string} filters.course_id - ID курса
 * @param {string} filters.student_id - ID студента
 * @param {string} filters.teacher_id - ID преподавателя
 * @returns {Promise<Array>} Отфильтрованное расписание
 */
export const getFilteredSchedule = async (filters = {}) => {
  try {
    console.log('[ScheduleFilterService] Applying filters:', filters);

    // Получаем базовое расписание
    const response = await api.get('/schedule/');
    const data = response.data || {};
    
    // Новая схема API возвращает объект с lessons и events
    let scheduleData = data.lessons || [];
    
    console.log('[ScheduleFilterService] Base schedule data:', scheduleData.length, 'items');

    // Применяем фильтры
    let filteredData = scheduleData;

    // Фильтр по группе
    if (filters.group_id) {
      filteredData = filteredData.filter(item => item.group_id === filters.group_id);
      console.log('[ScheduleFilterService] After group filter:', filteredData.length, 'items');
    }

    // Фильтр по курсу - нужно получить course_id через lesson
    if (filters.course_id) {
      // Получаем информацию о всех уроках для сопоставления с курсами
      const lessonPromises = filteredData.map(async (item) => {
        // Сначала проверяем, есть ли уже course_id в данных
        if (item.course_id === filters.course_id) {
          return { ...item, matches_course: true };
        }
        
        if (!item.lesson_id) return { ...item, matches_course: false };
        
        try {
          const lessonResponse = await api.get(`/courses/lesson-group?group_id=${item.group_id}`);
          const lessonGroups = lessonResponse.data || [];
          const lessonGroup = lessonGroups.find(lg => lg.id === item.id);
          
          if (lessonGroup && lessonGroup.lesson) {
            return { 
              ...item, 
              course_id: lessonGroup.lesson.course_id,
              matches_course: lessonGroup.lesson.course_id === filters.course_id 
            };
          }
          return { ...item, matches_course: false };
        } catch (error) {
          console.error('[ScheduleFilterService] Error getting lesson for course filter:', error);
          return { ...item, matches_course: false };
        }
      });

      const itemsWithCourseInfo = await Promise.all(lessonPromises);
      filteredData = itemsWithCourseInfo.filter(item => item.matches_course);
      console.log('[ScheduleFilterService] After course filter:', filteredData.length, 'items');
    }

    // Фильтр по студенту - проверяем участие студента в группе
    if (filters.student_id) {
      const groupPromises = filteredData.map(async (item) => {
        if (!item.group_id) return { ...item, has_student: false };
        
        try {
          const groupResponse = await api.get(`/groups/${item.group_id}`);
          const groupData = groupResponse.data;
          
          if (groupData && groupData.students) {
            const hasStudent = groupData.students.some(student => 
              student.id === filters.student_id || 
              student.user_id === filters.student_id
            );
            return { ...item, has_student: hasStudent };
          }
          return { ...item, has_student: false };
        } catch (error) {
          console.error('[ScheduleFilterService] Error getting group for student filter:', error);
          return { ...item, has_student: false };
        }
      });

      const itemsWithStudentInfo = await Promise.all(groupPromises);
      filteredData = itemsWithStudentInfo.filter(item => item.has_student);
      console.log('[ScheduleFilterService] After student filter:', filteredData.length, 'items');
    }

    // Фильтр по преподавателю - проверяем преподавателя группы
    if (filters.teacher_id) {
      const groupPromises = filteredData.map(async (item) => {
        if (!item.group_id) return { ...item, has_teacher: false };
        
        try {
          const groupResponse = await api.get(`/groups/${item.group_id}`);
          const groupData = groupResponse.data;
          
          if (groupData && groupData.teacher_id) {
            return { ...item, has_teacher: groupData.teacher_id === filters.teacher_id };
          } else if (groupData && groupData.teacher && groupData.teacher.id) {
            return { ...item, has_teacher: groupData.teacher.id === filters.teacher_id };
          }
          return { ...item, has_teacher: false };
        } catch (error) {
          console.error('[ScheduleFilterService] Error getting group for teacher filter:', error);
          return { ...item, has_teacher: false };
        }
      });

      const itemsWithTeacherInfo = await Promise.all(groupPromises);
      filteredData = itemsWithTeacherInfo.filter(item => item.has_teacher);
      console.log('[ScheduleFilterService] After teacher filter:', filteredData.length, 'items');
    }

    // Дополняем данные информацией о группах, курсах и преподавателях
    const enhancedData = await Promise.all(filteredData.map(async (item) => {
      let groupInfo = null;
      let teacherInfo = null;
      let courseId = item.course_id;

      // Получаем информацию о группе
      if (item.group_id) {
        try {
          const groupResponse = await api.get(`/groups/${item.group_id}`);
          groupInfo = groupResponse.data;
          if (groupInfo?.teacher_id) {
            try {
              const teacherResponse = await api.get(`/teachers/${groupInfo.teacher_id}`);
              teacherInfo = teacherResponse.data;
            } catch (error) {
              console.error('[ScheduleFilterService] Error getting teacher:', error);
            }
          }
        } catch (error) {
          console.error('[ScheduleFilterService] Error getting group:', error);
        }
      }

      // Получаем course_id если его еще нет
      if (!courseId && item.lesson_id && item.group_id) {
        try {
          const lessonResponse = await api.get(`/courses/lesson-group?group_id=${item.group_id}`);
          const lessonGroups = lessonResponse.data || [];
          const lessonGroup = lessonGroups.find(lg => lg.id === item.id);
          if (lessonGroup && lessonGroup.lesson) {
            courseId = lessonGroup.lesson.course_id;
          }
        } catch (error) {
          console.error('[ScheduleFilterService] Error getting course_id:', error);
        }
      }

      const enhancedItem = {
        id: item.id,
        lesson_id: item.lesson_id,
        lesson_name: item.lesson_name,
        course_id: courseId,
        course_name: item.course_name,
        group_id: item.group_id,
        group_name: groupInfo?.name || 'Группа не найдена',
        teacher_name: teacherInfo ? 
          `${teacherInfo.user?.first_name || ''} ${teacherInfo.user?.surname || ''}`.trim() || 
          teacherInfo.user?.username : 
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

      console.log(`[ScheduleFilterService] Enhanced item ${item.id}:`, {
        group_id: enhancedItem.group_id,
        group_name: enhancedItem.group_name,
        course_id: enhancedItem.course_id,
        teacher_name: enhancedItem.teacher_name,
        lesson_name: enhancedItem.lesson_name
      });

      return enhancedItem;
    }));

    console.log('[ScheduleFilterService] Final filtered schedule:', enhancedData.length, 'items');
    return enhancedData;

  } catch (error) {
    console.error('[ScheduleFilterService] Error applying filters:', error);
    throw error;
  }
};

/**
 * Получение списка доступных опций для фильтров
 * @returns {Promise<Object>} Объект с массивами групп, курсов, студентов и преподавателей
 */
export const getFilterOptions = async () => {
  try {
    const [groupsRes, coursesRes, studentsRes, teachersRes] = await Promise.all([
      api.get('/groups/?limit=100'),
      api.get('/courses/?limit=100'),
      api.get('/students/?limit=100'),
      api.get('/teachers/?limit=100')
    ]);

    return {
      groups: groupsRes.data?.objects || [],
      courses: coursesRes.data?.objects || [],
      students: studentsRes.data?.objects || [],
      teachers: teachersRes.data?.objects || []
    };
  } catch (error) {
    console.error('[ScheduleFilterService] Error getting filter options:', error);
    throw error;
  }
};

/**
 * Форматирование текста фильтров для отображения
 * @param {Object} filters - Активные фильтры
 * @param {Object} options - Опции для отображения (groups, courses, students, teachers)
 * @returns {string} Текстовое описание активных фильтров
 */
export const formatFiltersText = (filters, options) => {
  const activeFilters = [];

  if (filters.group_id) {
    const group = options.groups?.find(g => g.id === filters.group_id);
    if (group) activeFilters.push(`Группа: ${group.name}`);
  }

  if (filters.course_id) {
    const course = options.courses?.find(c => c.id === filters.course_id);
    if (course) activeFilters.push(`Курс: ${course.name}`);
  }

  if (filters.student_id) {
    const student = options.students?.find(s => s.id === filters.student_id);
    if (student) {
      const name = `${student.user?.first_name || ''} ${student.user?.surname || ''}`.trim() || student.user?.username;
      activeFilters.push(`Студент: ${name}`);
    }
  }

  if (filters.teacher_id) {
    const teacher = options.teachers?.find(t => t.id === filters.teacher_id);
    if (teacher) {
      const name = `${teacher.user?.first_name || ''} ${teacher.user?.surname || ''}`.trim() || teacher.user?.username;
      activeFilters.push(`Преподаватель: ${name}`);
    }
  }

  return activeFilters.length > 0 ? activeFilters.join(', ') : 'Все записи';
};

export default {
  getFilteredSchedule,
  getFilterOptions,
  formatFiltersText
};
