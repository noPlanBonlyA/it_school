/**
 * Сервис «Groups».
 * Все запросы идут через api/axiosInstance.
 */
import api from '../api/axiosInstance';

/*──────────────  CRUD групп  ──────────────*/
export async function getAllGroups(limit = 100, offset = 0) {
  const { data } = await api.get('/groups', { params: { limit, offset } });
  return data;
}
export async function createGroup(body) {
  const { data } = await api.post('/groups', body);
  return data;
}
export async function updateGroup(id, body) {
  const { data } = await api.put(`/groups/${id}`, body);
  return data;
}
export async function deleteGroup(id) {
  await api.delete(`/groups/${id}`);
}

/*──────────  студенты  ──────────*/
export async function addStudentsToGroup(groupId, body /* {students_id:[]} */) {
  await api.post(`/groups/${groupId}/students`, body);
}
export async function removeStudentFromGroup(groupId, studentId) {
  await api.delete(`/groups/${groupId}/students/${studentId}`);
}

/*──────────  преподаватель  ──────────*/
export async function addTeacherToGroup(groupId, teacherId) {
  // API-документация: POST /api/groups/{group_id}/teacher/{teacher_id}
  await api.post(`/groups/${groupId}/teacher/${teacherId}`);
}
export async function removeTeacherFromGroup(groupId, teacherId) {
  await api.delete(`/groups/${groupId}/teacher/${teacherId}`);
}

/*──────────  курс → группе  ──────────*/
export async function attachCourseToGroup(courseId, groupId) {
  /* 1. список уроков курса */
  const { data } = await api.get(`/courses/${courseId}/lessons`, {
    params: { limit: 100, offset: 0 }
  });
  const lessons = data.objects || [];
  if (!lessons.length) throw new Error('NO_LESSONS');

  /* 2. формируем bulk-payload */
  const nowIso = new Date().toISOString();
  const payload = lessons.map(lsn => ({
    lesson_id:    lsn.id,
    group_id:     groupId,
    holding_date: nowIso,
    is_opened:    true
  }));

  /* 3. создаём lesson-groups */
  await api.post('/courses/lesson-groups', payload);
}

export async function listLessonGroupsByGroup(groupId, limit = 100, offset = 0) {
  const { data } = await api.get('/courses/lesson-groups', {
    params: { group_id: groupId, limit, offset }
  });
  return data.objects || [];
}