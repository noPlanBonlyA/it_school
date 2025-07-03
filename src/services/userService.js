/* src/services/userService.js */
import api from '../api/axiosInstance';

/**
 * Получить пользователей.
 * ───────────────────────────────────────────────────────────
 * ▸ Любые query-параметры (role, search, limit …) передаём как есть.
 * ▸ По умолчанию ставится limit=100, offset=0 — чтобы не получить 422.
 * ▸ Backend может вернуть:
 *      – массив   [ {...}, ... ]
 *      – объект   { objects:[...], count:n }
 *   Функция всегда приводит к «чистому» массиву.
 */
export async function getAllUsers(params = {}) {
  const {
    limit  = 100,
    offset = 0,
    ...rest                 //  ← role, search и всё остальное не теряем
  } = params;

  const query = { limit, offset, ...rest };
  const { data } = await api.get('/users', { params: query });

  return Array.isArray(data)      ? data
       : Array.isArray(data?.objects) ? data.objects
       : [];
}

/* ───────────────────── прочие методы ───────────────────── */

export async function getMe() {
  const { data } = await api.get('/users/me');
  return data;
}

export async function getById(id) {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function createUser(payload, imageFile = null) {
  console.log('[UserService] Creating user:', payload);
  
  // Создаем FormData
  const formData = new FormData();
  
  // Добавляем данные пользователя как JSON строку
  formData.append('user_data', JSON.stringify(payload));
  
  // Добавляем изображение если есть
  if (imageFile) {
    formData.append('image', imageFile);
  }
  
  const { data } = await api.post('/users/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function updateUser(id, payload) {
  console.log('[UserService] Updating user:', { id, payload });
  
  // Создаем FormData для обновления
  const formData = new FormData();
  
  // Добавляем данные пользователя как JSON строку
  formData.append('user_data', JSON.stringify(payload));
  
  const { data } = await api.put(`/users/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

/**
 * Создать нового администратора с пользователем
 */
export async function createAdminWithUser(adminData, imageFile = null) {
  console.log('[UserService] Creating admin with user:', adminData);
  
  try {
    // Создаем FormData для пользователя
    const formData = new FormData();
    
    // Подготавливаем данные пользователя
    const userData = {
      first_name: adminData.first_name,
      surname: adminData.surname,
      patronymic: adminData.patronymic || '',
      email: adminData.email,
      birth_date: adminData.birth_date,
      phone_number: adminData.phone_number,
      password: adminData.password,
      role: adminData.role || 'admin' // admin или superadmin
    };
    
    // Добавляем данные пользователя как JSON строку
    formData.append('user_data', JSON.stringify(userData));
    
    // Добавляем изображение если есть
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    // Создаем пользователя
    console.log('[UserService] Creating admin user...');
    const userResponse = await api.post('/users/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('[UserService] Admin user created:', userResponse.data);
    
    // Для администраторов дополнительного профиля не нужно - роль определяется в user
    return {
      user: userResponse.data
    };
    
  } catch (error) {
    console.error('[UserService] Error creating admin:', error.response?.data || error.message);
    throw error;
  }
}

/* default export — чтобы HomePage мог импортировать одним именем */
const userService = {
  getMe,
  getById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  createAdminWithUser,
};
export default userService;
