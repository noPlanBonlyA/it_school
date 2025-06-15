import api from '../api/axiosInstance';

export async function createStudent(payload) {
  const { data } = await api.post('/students', payload);
  return data;
}

export async function getMyStudent() {
  const { data } = await api.get('/students/me');
  return data;
}

export async function updateStudent(id, payload) {
  await api.put(`/students/${id}`, payload);     // payload: { points }
}

export async function deleteStudent(id) {
  await api.delete(`/students/${id}`);
}
export const listStudents = (limit=100, offset=0)=>
  api.get('/students',{params:{limit,offset}}).then(r=>r.data);

export async function findStudentByUser(user_id) {
  const { data } = await api.get('/students', {
    params: { user_id, limit: 1, offset: 0 }
  });
  return data.objects?.[0] ?? null;
}

