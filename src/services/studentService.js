import api from '../api/axiosInstance';

/**
 * Найти студента по ID пользователя
 */
export const findStudentByUser = async (userId) => {
  console.log('[StudentService] Finding student by user ID:', userId);
  
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    // Сначала получаем всех студентов
    const response = await api.get('/students/', {
      params: { limit: 100, offset: 0 }
    });
    
    console.log('[StudentService] All students response:', response.data);
    
    // Обрабатываем ответ
    const studentsArray = response.data.objects || response.data || [];
    console.log('[StudentService] Students array:', studentsArray);
    
    if (!Array.isArray(studentsArray)) {
      console.error('[StudentService] Expected array, got:', typeof studentsArray);
      throw new Error('Invalid students data format');
    }
    
    // Ищем студента с нужным user_id
    const student = studentsArray.find(s => s.user_id === userId);
    
    console.log('[StudentService] Searching for user_id:', userId);
    console.log('[StudentService] Found student:', student);
    
    if (!student) {
      console.warn('[StudentService] No student found for user_id:', userId);
      console.log('[StudentService] Available user_ids:', studentsArray.map(s => s.user_id));
      return null;
    }
    
    return student;
    
  } catch (error) {
    console.error('[StudentService] Error finding student:', {
      userId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

/**
 * Получить информацию о текущем студенте
 */
export const getCurrentStudent = async () => {
  console.log('[StudentService] Getting current student info...');
  
  try {
    const response = await api.get('/students/me');
    console.log('[StudentService] Current student:', response.data);
    return response.data;
  } catch (error) {
    console.error('[StudentService] Error getting current student:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Получить всех студентов (для администраторов)
 */
export const getAllStudents = async (limit = 100, offset = 0) => {
  try {
    const response = await api.get('/students/', {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('[StudentService] Error getting all students:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Получить список студентов (alias для getAllStudents)
 */
export const listStudents = getAllStudents;

/**
 * Создать нового студента с пользователем
 */
export const createStudent = async (studentData, imageFile = null) => {
  console.log('[StudentService] Creating student with user:', studentData);
  
  try {
    // Создаем FormData для пользователя
    const formData = new FormData();
    
    // Подготавливаем данные пользователя
    const userData = {
      first_name: studentData.first_name,
      surname: studentData.surname,
      patronymic: studentData.patronymic || '',
      email: studentData.email,
      birth_date: studentData.birth_date,
      phone_number: studentData.phone_number,
      password: studentData.password,
      role: 'student' // Устанавливаем роль студента
    };
    
    // Добавляем данные пользователя как JSON строку
    formData.append('user_data', JSON.stringify(userData));
    
    // Добавляем изображение если есть
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    // Сначала создаем пользователя
    console.log('[StudentService] Creating user first...');
    const userResponse = await api.post('/users/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('[StudentService] User created:', userResponse.data);
    
    // Затем создаем профиль студента
    const studentProfile = {
      user_id: userResponse.data.id,
      points: studentData.points || 0
    };
    
    console.log('[StudentService] Creating student profile:', studentProfile);
    const studentResponse = await api.post('/students/', studentProfile);
    
    console.log('[StudentService] Student profile created:', studentResponse.data);
    
    // Возвращаем объединенные данные
    return {
      user: userResponse.data,
      student: studentResponse.data
    };
    
  } catch (error) {
    console.error('[StudentService] Error creating student:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Обновить студента
 */
export const updateStudent = async (studentId, studentData) => {
  try {
    const response = await api.put(`/students/${studentId}`, {
      // Убедитесь, что передаются все необходимые поля
      user_id: studentData.user_id,
      points: studentData.points,
      id: studentId,
      // Добавьте created_at и updated_at если API их требует
      // created_at: studentData.created_at,
      // updated_at: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

/**
 * Удалить студента
 */
export const deleteStudent = async (studentId) => {
  console.log('[StudentService] Deleting student:', studentId);
  
  try {
    await api.delete(`/students/${studentId}`);
    console.log('[StudentService] Student deleted:', studentId);
  } catch (error) {
    console.error('[StudentService] Error deleting student:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Получить студента по ID
 */
export const getStudentById = async (studentId) => {
  console.log('[StudentService] Getting student by ID:', studentId);
  
  try {
    const response = await api.get(`/students/${studentId}`);
    console.log('[StudentService] Student found:', response.data);
    return response.data;
  } catch (error) {
    console.error('[StudentService] Error getting student by ID:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Получить студентов по группе
 */
export const getStudentsByGroup = async (groupId) => {
  console.log('[StudentService] Getting students by group:', groupId);
  
  try {
    const response = await api.get('/students/', {
      params: { group_id: groupId }
    });
    console.log('[StudentService] Students by group:', response.data);
    return response.data;
  } catch (error) {
    console.error('[StudentService] Error getting students by group:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Добавить студента в группу
 */
export const addStudentToGroup = async (studentId, groupId) => {
  console.log('[StudentService] Adding student to group:', studentId, groupId);
  
  try {
    const response = await api.post(`/students/${studentId}/group`, {
      group_id: groupId
    });
    console.log('[StudentService] Student added to group:', response.data);
    return response.data;
  } catch (error) {
    console.error('[StudentService] Error adding student to group:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Удалить студента из группы
 */
export const removeStudentFromGroup = async (studentId) => {
  console.log('[StudentService] Removing student from group:', studentId);
  
  try {
    const response = await api.delete(`/students/${studentId}/group`);
    console.log('[StudentService] Student removed from group:', response.data);
    return response.data;
  } catch (error) {
    console.error('[StudentService] Error removing student from group:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Отладочная функция для проверки всех студентов
 */
export const debugAllStudents = async () => {
  console.log('[StudentService] DEBUG: Getting all students for debugging...');
  
  try {
    const response = await api.get('/students/', {
      params: { limit: 100, offset: 0 }
    });
    
    console.log('[StudentService] DEBUG: All students response:', response.data);
    
    const students = response.data.objects || response.data || [];
    console.log('[StudentService] DEBUG: Processed students array:', students);
    console.log('[StudentService] DEBUG: Total students found:', students.length);
    
    if (Array.isArray(students)) {
      students.forEach((student, index) => {
        console.log(`[StudentService] DEBUG: Student ${index + 1}:`, {
          id: student.id,
          user_id: student.user_id,
          points: student.points,
          group_id: student.group_id,
          created_at: student.created_at
        });
      });
    }
    
    return students;
  } catch (error) {
    console.error('[StudentService] DEBUG: Error getting all students:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Создать уведомление для студента
 */
export const createNotificationForStudent = async (studentId, message) => {
  try {
    console.log(`[StudentService] Creating notification for student ${studentId}:`, message);
    
    const response = await api.post('/notifications/', {
      student: studentId,
      message: message,
      is_read: false
    });
    
    console.log('[StudentService] Notification created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[StudentService] Error creating notification:', error);
    
    // Дополнительная информация об ошибке
    if (error.response) {
      console.error('Response error:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    
    throw new Error(`Не удалось создать уведомление: ${error.message}`);
  }
};

/**
 * Создать нового студента с существующим пользователем
 */
export const createStudentProfile = async (userId, studentData = {}) => {
  console.log('[StudentService] Creating student profile for user:', userId);
  
  try {
    const studentProfile = {
      user_id: userId,
      points: studentData.points || 0
    };
    
    const response = await api.post('/students/', studentProfile);
    console.log('[StudentService] Student profile created:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('[StudentService] Error creating student profile:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Создать нового учителя с существующим пользователем  
 */
export const createTeacherProfile = async (userId) => {
  console.log('[StudentService] Creating teacher profile for user:', userId);
  
  try {
    const teacherProfile = {
      user_id: userId
    };
    
    const response = await api.post('/teachers/', teacherProfile);
    console.log('[StudentService] Teacher profile created:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('[StudentService] Error creating teacher profile:', error.response?.data || error.message);
    throw error;
  }
};

// Экспорт по умолчанию
const studentServiceDefault = {
  findStudentByUser,
  getCurrentStudent,
  getAllStudents,
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentById,
  getStudentsByGroup,
  addStudentToGroup,
  removeStudentFromGroup,
  debugAllStudents,
  createNotificationForStudent,
  createStudentProfile,
  createTeacherProfile
};

export default studentServiceDefault;

