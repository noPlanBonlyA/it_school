/**
 * Сервис «Groups»
 * (CRUD групп + прикрепление студентов/преподавателей/курсов)
 */
import api from '../api/axiosInstance';
import { createNotificationForGroup } from './notificationService';

/*────────────────────── CRUD групп ──────────────────────*/
export const getAllGroups = (limit = 100, offset = 0) =>
  api.get('/groups', { params: { limit, offset } }).then(r => r.data);

export const createGroup = async (body) => {
  const { data } = await api.post('/groups', body);
  
  // Отправляем уведомление о создании группы
  if (data.id) {
    try {
      await createNotificationForGroup(
        data.id, 
        `Создана новая группа "${data.name}". Добро пожаловать!`
      );
    } catch (error) {
      console.warn('Failed to send group creation notification:', error);
    }
  }
  
  return data;
};

export const updateGroup  = (id, body) => api.put(`/groups/${id}`, body).then(r => r.data);
export const deleteGroup  = id => api.delete(`/groups/${id}`);

/*───────────────── Студенты / Преподаватель ─────────────*/

/**
 * Добавить студентов в группу
 */
export const addStudentsToGroup = async (groupId, studentIds) => {
  console.log('[GroupService] addStudentsToGroup - START');
  console.log('[GroupService] addStudentsToGroup - groupId:', groupId);
  console.log('[GroupService] addStudentsToGroup - Raw studentIds:', studentIds);
  
  // Обрабатываем разные форматы входных данных
  let idsArray = [];
  
  if (Array.isArray(studentIds)) {
    idsArray = studentIds;
  } else if (studentIds && typeof studentIds === 'object' && studentIds.students_id) {
    idsArray = studentIds.students_id;
  } else if (studentIds && typeof studentIds === 'object' && studentIds.student_ids) {
    idsArray = studentIds.student_ids;
  } else {
    throw new Error('Invalid studentIds format. Expected array or object with students_id/student_ids field');
  }
  
  console.log('[GroupService] addStudentsToGroup - Processed idsArray:', idsArray);
  
  if (!Array.isArray(idsArray) || idsArray.length === 0) {
    throw new Error('Student IDs array is required and cannot be empty');
  }
  
  // Проверяем, что все ID валидные
  const validIds = idsArray.filter(id => id && typeof id === 'string');
  console.log('[GroupService] addStudentsToGroup - Valid IDs:', validIds);
  
  if (validIds.length === 0) {
    throw new Error('No valid student IDs provided');
  }
  
  if (!groupId) {
    console.error('[GroupService] addStudentsToGroup - groupId is missing!');
    throw new Error('Group ID is required to add students.');
  }
  
  // Используем правильный API endpoint из документации
  const payload = { students_id: validIds };
  const url = `/groups/${groupId}/students/`;
  
  console.log('[GroupService] Making request to:', url);
  console.log('[GroupService] Payload:', payload);
  
  try {
    const response = await api.post(url, payload);
    console.log('[GroupService] ✅ SUCCESS - Students added to group:', response.data);
    
    // Отправляем уведомление о добавлении в группу
    try {
      await createNotificationForGroup(
        groupId, 
        `В группу добавились новые студенты!`
      );
    } catch (notificationError) {
      console.warn('Failed to send student addition notification:', notificationError);
    }
    
    return response.data;
    
  } catch (error) {
    console.error('[GroupService] ❌ FAILED to add students:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Показываем детали ошибки для отладки
    if (error.response?.data?.detail) {
      console.error('[GroupService] Error details:', error.response.data.detail);
    }
    
    throw error;
  }
};

export async function removeStudentFromGroup(groupId, studentId) {
  await api.delete(`/groups/${groupId}/students/${studentId}`);
}

export async function addTeacherToGroup(groupId, teacherProfileId) {
  await api.post(`/groups/${groupId}/teacher/${teacherProfileId}`);
}

export const removeTeacherFromGroup = (gid, tid) => api.delete(`/groups/${gid}/teacher/${tid}`);

/*───────────────── Одно занятие → группе ───────────────*/
export function addLessonToGroup(lessonId, groupId, dateIso = new Date().toISOString()){
  console.log('[GroupService] addLessonToGroup:', { lessonId, groupId, dateIso });
  
  return api.post('/courses/lesson-group', {
    lesson_id: lessonId, 
    group_id: groupId,
    holding_date: dateIso,
    is_opened: true
  }).then(r => {
    console.log('[GroupService] Lesson added to group:', r.data);
    return r.data;
  });
}

/*───────────────── Курс → группе (bulk) ────────────────*/
export async function attachCourseToGroup(courseId, groupId, startDate = null) {
  const { data } = await api.get(`/courses/${courseId}/lessons`, { params:{limit:100,offset:0}});
  const lessons  = data.objects || [];
  if (!lessons.length) throw new Error('NO_LESSONS');

  // Если передана стартовая дата, используем её
  const baseDate = startDate ? new Date(startDate) : new Date();
  
  const payload = lessons.map((lesson, index) => {
    // Каждый урок через неделю от предыдущего
    const lessonDate = new Date(baseDate);
    lessonDate.setDate(lessonDate.getDate() + (index * 7));
    
    return {
      lesson_id: lesson.id, 
      group_id: groupId, 
      holding_date: lessonDate.toISOString(), 
      is_opened: true
    };
  });

  console.log('[GroupService] Attaching course to group with dates:', payload);
  await api.post('/courses/lesson-groups', payload);
}

/**
 * Добавить курс к группе
 */
export async function addCourseToGroup(groupId, courseId) {
  console.log('[GroupService] Adding course to group:', { groupId, courseId });
  
  try {
    // Согласно API документации, используем POST /groups/{group_id}/courses
    const response = await api.post(`/groups/${groupId}/courses`, {
      course_id: courseId
    });
    console.log('[GroupService] Course added to group:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error adding course to group:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Удалить курс из группы  
 */
export async function removeCourseFromGroup(groupId, courseId) {
  console.log('[GroupService] Removing course from group:', { groupId, courseId });
  
  try {
    // Согласно API документации, используем DELETE /groups/{group_id}/courses/{course_id}
    await api.delete(`/groups/${groupId}/courses/${courseId}`);
    console.log('[GroupService] Course removed from group');
  } catch (error) {
    console.error('[GroupService] Error removing course from group:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Получить курсы группы
 */
export async function getGroupCourses(groupId) {
  console.log('[GroupService] Getting group courses:', groupId);
  
  try {
    const response = await api.get(`/groups/${groupId}/courses`);
    console.log('[GroupService] Group courses:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error getting group courses:', error.response?.data || error.message);
    throw error;
  }
}
