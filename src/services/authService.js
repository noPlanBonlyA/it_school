import api from '../api/axiosInstance';

export async function login(credentials) {
  const { data } = await api.post('/users/auth', credentials);
  return data;
}

export async function logout() {
  await api.post('/users/logout');
}

export async function refreshToken() {
  const { data } = await api.post('/users/refresh');
  return data;
}
