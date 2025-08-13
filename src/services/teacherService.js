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
  console.log('[TeacherService] Updating teacher:', { id, payload });
  // PUT /api/teachers/{teacher_id} принимает JSON данные для обновления профиля учителя
  const { data } = await api.put(`/teachers/${id}`, payload);
  return data;
}

// Удаляет сущность teacher
export async function deleteTeacher(id) {
  await api.delete(`/teachers/${id}`);
}

export const listTeachers = (limit=100, offset=0)=>
  api.get('/teachers',{params:{limit,offset}}).then(r=>r.data);

export async function findTeacherByUser(user_id) {
  try {
    console.log(`[findTeacherByUser] Searching for teacher with user_id: ${user_id}`);
    
    // Получаем всех преподавателей
    const { data } = await api.get('/teachers', {
      params: { limit: 100, offset: 0 }
    });
    
    const teachers = data.objects || data;
    console.log(`[findTeacherByUser] All teachers response:`, data);
    console.log(`[findTeacherByUser] Teachers array:`, teachers);
    
    // Ищем преподавателя по user_id
    if (Array.isArray(teachers)) {
      console.log(`[findTeacherByUser] Searching for user_id: ${user_id}`);
      const teacher = teachers.find(t => {
        console.log(`[findTeacherByUser] Checking teacher:`, t);
        return t.user_id === user_id;
      });
      console.log(`[findTeacherByUser] Found teacher:`, teacher);
      return teacher || null;
    }
    
    console.log(`[findTeacherByUser] No teacher found for userId ${user_id}`);
    return null;
  } catch (error) {
    console.error(`[findTeacherByUser] Error finding teacher for userId ${user_id}:`, error);
    return null;
  }
}

/**
 * Создать нового учителя с пользователем
 */
export async function createTeacherWithUser(teacherData, imageFile = null) {
  console.log('[TeacherService] Creating teacher with user:', teacherData);
  
  try {
    // Создаем FormData для пользователя
    const formData = new FormData();
    
    // Подготавливаем данные пользователя
    const userData = {
      first_name: teacherData.first_name,
      surname: teacherData.surname,
      patronymic: teacherData.patronymic || '',
      email: teacherData.email,
      birth_date: teacherData.birth_date,
      phone_number: teacherData.phone_number,
      password: teacherData.password,
      role: 'teacher' // Устанавливаем роль учителя
    };
    
    // Добавляем данные пользователя как JSON строку
    formData.append('user_data', JSON.stringify(userData));
    
    // Добавляем изображение если есть
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    // Сначала создаем пользователя
    console.log('[TeacherService] Creating user first...');
    const userResponse = await api.post('/users/', formData);
    
    console.log('[TeacherService] User created:', userResponse.data);
    
    // Затем создаем профиль учителя
    const teacherProfile = {
      user_id: userResponse.data.id
    };
    
    console.log('[TeacherService] Creating teacher profile:', teacherProfile);
    const teacherResponse = await api.post('/teachers/', teacherProfile);
    
    console.log('[TeacherService] Teacher profile created:', teacherResponse.data);
    
    // Возвращаем объединенные данные
    return {
      user: userResponse.data,
      teacher: teacherResponse.data
    };
    
  } catch (error) {
    console.error('[TeacherService] Error creating teacher:', error.response?.data || error.message);
    throw error;
  }
}

// Экспорт по умолчанию
const teacherService = {
  createTeacher,
  createTeacherWithUser,
  getMyTeacher,
  updateTeacher,
  deleteTeacher,
  listTeachers,
  findTeacherByUser
};

export default teacherService;