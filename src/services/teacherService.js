import api from '../api/axiosInstance';

export async function createTeacher({ user_id }) {
  try {
    /* пробуем создать */
    const { data } = await api.post('/teachers', { user_id });
    return data;                       // <- 201 Created
  } catch (e) {
    if (e.response?.status === 409) {
      /* вариант 1: бек присылает существующий объект прямо в теле 409 */
      if (e.response.data?.id) return e.response.data;

      /* вариант 2: ищем через list-энд-поинт */
      const { data } = await api.get('/teachers', {
        params: { user_id, limit: 1, offset: 0 }
      });
      if (data.objects?.length) return data.objects[0];

      /* крайний случай: берём id из сообщения вида
         {"detail":"Teacher already exists with id=..."} */
      const msg = e.response.data?.detail || '';
      const m   = msg.match(/id\s*=\s*([0-9a-f-]{36})/i);
      if (m) return { id: m[1], user_id };

      /* ничего не нашли -> падаем как раньше */
    }
    throw e;
  }
}

export async function getMyTeacher() {
  const { data } = await api.get('/teachers/me');
  return data;
}

export async function updateTeacher(id, payload) {
  // PUT /api/teachers/{teacher_id} ожидает хотя бы пустой объект {}
  await api.put(`/teachers/${id}`, payload);
}

// Удаляет сущность teacher
export async function deleteTeacher(id) {
  await api.delete(`/teachers/${id}`);
}

export const listTeachers = (limit=100, offset=0)=>
  api.get('/teachers',{params:{limit,offset}}).then(r=>r.data);

export async function findTeacherByUser(user_id) {
  try {
    // Получаем всех преподавателей и ищем по user_id
    const { data } = await api.get('/teachers', {
      params: { user_id, limit: 100, offset: 0 } // Увеличиваем лимит и добавляем фильтр
    });
    
    const teachers = data.objects || data;
    
    // Если API не поддерживает фильтрацию, делаем это вручную
    if (Array.isArray(teachers)) {
      const teacher = teachers.find(t => t.user_id === user_id);
      console.log(`[findTeacherByUser] Found teacher for userId ${user_id}:`, teacher);
      return teacher;
    }
    
    // Если возвращается один объект, проверяем что это нужный преподаватель
    if (teachers && teachers.user_id === user_id) {
      console.log(`[findTeacherByUser] Found teacher for userId ${user_id}:`, teachers);
      return teachers;
    }
    
    console.log(`[findTeacherByUser] No teacher found for userId ${user_id}`);
    return null;
  } catch (error) {
    console.error(`[findTeacherByUser] Error finding teacher for userId ${user_id}:`, error);
    return null;
  }
}