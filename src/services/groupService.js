/**
 * Сервис «Groups»
 * (CRUD групп + прикрепление студентов/преподавателей/курсов)
 */
import api from '../api/axiosInstance';

/**
 * Получение всех групп
 */
export const getAllGroups = async (limit = 100, offset = 0) => {
  console.log('[GroupService] Getting all groups:', { limit, offset });
  
  try {
    const response = await api.get('/groups/', {
      params: { limit, offset }
    });
    
    console.log('[GroupService] Groups loaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error getting groups:', error);
    throw error;
  }
};

/**
 * Получение групп для преподавателя
 */
export const getTeacherGroups = async () => {
  console.log('[GroupService] Getting teacher groups...');
  
  try {
    const response = await api.get('/groups/teacher');
    
    console.log('[GroupService] Teacher groups loaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error getting teacher groups:', error);
    throw error;
  }
};

/**
 * Получение группы по ID
 */
export const getGroupById = async (groupId) => {
  console.log('[GroupService] Getting group by ID:', groupId);
  
  try {
    const response = await api.get(`/groups/${groupId}`);
    
    console.log('[GroupService] Group loaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error getting group:', error);
    throw error;
  }
};

/**
 * Создание группы
 */
export const createGroup = async (groupData) => {
  console.log('[GroupService] Creating group:', groupData);
  
  try {
    const response = await api.post('/groups/', groupData);
    
    console.log('[GroupService] Group created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error creating group:', error);
    throw error;
  }
};

/**
 * Обновление группы
 */
export const updateGroup = async (groupId, groupData) => {
  console.log('[GroupService] Updating group:', { groupId, groupData });
  
  try {
    const response = await api.put(`/groups/${groupId}`, groupData);
    
    console.log('[GroupService] Group updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error updating group:', error);
    throw error;
  }
};

/**
 * Удаление группы
 */
export const deleteGroup = async (groupId) => {
  console.log('[GroupService] Deleting group:', groupId);
  
  try {
    await api.delete(`/groups/${groupId}`);
    
    console.log('[GroupService] Group deleted successfully');
  } catch (error) {
    console.error('[GroupService] Error deleting group:', error);
    throw error;
  }
};

/**
 * ИСПРАВЛЕНО: Добавление студентов в группу с правильными ID
 */
export const addStudentsToGroup = async (groupId, studentIds) => {
  console.log('[GroupService] Adding students to group:', { groupId, studentIds });
  
  try {
    // Убеждаемся, что передаем именно student profile IDs, а не user IDs
    const response = await api.post(`/groups/${groupId}/students/`, {
      students_id: studentIds  // API ожидает массив student profile IDs
    });
    
    console.log('[GroupService] Students added to group successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[GroupService] Error adding students to group:', {
      groupId,
      studentIds,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

/**
 * Удаление студента из группы
 */
export const removeStudentFromGroup = async (groupId, studentId) => {
  console.log('[GroupService] Removing student from group:', { groupId, studentId });
  
  try {
    await api.delete(`/groups/${groupId}/students/${studentId}`);
    
    console.log('[GroupService] Student removed from group successfully');
  } catch (error) {
    console.error('[GroupService] Error removing student from group:', error);
    throw error;
  }
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
