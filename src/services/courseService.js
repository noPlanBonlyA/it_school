import api from '../api/axiosInstance';      // axios.create({ baseURL: import.meta.env.VITE_API_URL })

// GET /api/courses/


// POST /api/courses/
export async function createCourse(formData) {
  const { data } = await api.post('/courses/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;         // новый курс
}

// PUT /api/courses/{id}
export async function updateCourse(id, formData) {
  const { data } = await api.put(`/courses/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

// DELETE /api/courses/{id}
export async function deleteCourse(id) {
  await api.delete(`/courses/${id}`);
}

export async function getAllCourses(limit = 100, offset = 0) {
  const { data } = await api.get('/courses', { params: { limit, offset } });
  return data;                       // { objects, count }
}

/* один курс по id */
export async function getCourse(courseId) {
  const { data } = await api.get(`/courses/${courseId}`);
  return data;                       // { id, name, ... }
}
export async function listStudentCourses() {
  // GET /api/courses/student  →  [{ course, student_id, … }]
  const { data } = await api.get('/courses/student');
  /* удобнее вернуть плоский массив курсов */
  return data.map(o => o.course);
}
export async function getStudentCourses() {
  const { data } = await api.get('/courses/student');
  return data;            // массив [{ course_id, course, … }]
}

export async function getTeacherCourses() {
  const { data } = await api.get('/courses/teacher');
  return data;            // массив курсов
}