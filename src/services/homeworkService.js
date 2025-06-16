// src/services/homeworkService.js
import api from '../api/axiosInstance';

// Получить уже сданные материалы (для статуса “сдано/не сдано”)
export function getStudentMaterials(courseId, lessonId) {
  return api
    .get(`/courses/${courseId}/lessons/${lessonId}/student-materials`)
    .then(r => r.data.objects || []);
}

// Отправка домашнего задания (текст + файл)
export function submitHomework(courseId, lessonId, { text, file }) {
  const form = new FormData();
  if (text) form.append('homework_data', text);
  if (file) form.append('homework_file', file);

  return api.post(
    `/courses/${courseId}/lessons/${lessonId}/homework`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}

// Для преподавателя: получить список всех сданных домашек
export function listStudentMaterials(courseId, lessonId) {
  return api
    .get(`/courses/${courseId}/lessons/${lessonId}/student-materials`)
    .then(r => r.data.objects || []);
}

// Получить все комментарии к уроку
export function listComments(courseId, lessonId) {
  return api
    .get(`/courses/${courseId}/lessons/${lessonId}/comments`)
    .then(r => r.data.objects || []);
}

// Оставить комментарий к конкретной сданной домашке
export function postComment(courseId, lessonId, { text, lesson_student_id }) {
  return api
    .post(`/courses/${courseId}/lessons/${lessonId}/comments`, {
      text,
      lesson_student_id
    })
    .then(r => r.data);
}
