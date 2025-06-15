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

export async function createUser(payload) {
  const { data } = await api.post('/users', payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await api.put(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

/* default export — чтобы HomePage мог импортировать одним именем */
const userService = {
  getMe,
  getById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
export default userService;
