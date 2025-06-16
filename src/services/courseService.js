import api from '../api/axiosInstance';
import { createNotificationForCourse } from './notificationService';

// GET /api/courses/ - все курсы (для админов)
export async function getAllCourses(limit = 100, offset = 0) {
  const { data } = await api.get('/courses/', { params: { limit, offset } });
  return data;
}

// GET /api/courses/student - ТОЛЬКО курсы из групп студента
export async function listStudentCourses() {
  console.log('[CourseService] Fetching student courses...');
  try {
    const { data } = await api.get('/courses/student');
    console.log('[CourseService] Student courses response:', data);
    
    // API возвращает массив объектов с полем course
    const courses = Array.isArray(data) 
      ? data.map(item => item.course || item) 
      : [];
    
    console.log('[CourseService] Processed student courses:', courses);
    return courses;
  } catch (error) {
    console.error('[CourseService] Error fetching student courses:', error);
    return [];
  }
}

// GET /api/courses/teacher - курсы преподавателя
export async function getTeacherCourses() {
  const { data } = await api.get('/courses/teacher');
  return data;
}

// GET /api/courses/{id} - один курс по ID
export async function getCourse(courseId) {
  const { data } = await api.get(`/courses/${courseId}`);
  return data;
}

// Проверить доступ студента к курсу
export async function checkStudentCourseAccess(courseId) {
  console.log('[CourseService] Checking student access to course:', courseId);
  try {
    const studentCourses = await listStudentCourses();
    const hasAccess = studentCourses.some(course => 
      course.id === parseInt(courseId)
    );
    console.log('[CourseService] Student has access:', hasAccess);
    return hasAccess;
  } catch (error) {
    console.error('[CourseService] Error checking course access:', error);
    return false;
  }
}

// POST /api/courses/ - создание курса
export const createCourse = async (formData) => {
  const { data } = await api.post('/courses/', formData);
  
  // Отправляем уведомление о создании курса
  if (data.id) {
    try {
      await createNotificationForCourse(
        data.id, 
        `Создан новый курс "${data.name}"! Проверьте доступные материалы.`
      );
    } catch (error) {
      console.warn('Failed to send course creation notification:', error);
    }
  }
  
  return data;
};

// PUT /api/courses/{id} - обновление курса
export async function updateCourse(id, formData) {
  const { data } = await api.put(`/courses/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

// DELETE /api/courses/{id} - удаление курса
export async function deleteCourse(id) {
  await api.delete(`/courses/${id}`);
}

// GET /api/courses/{courseId}/lessons - уроки курса
export async function getCourseLessons(courseId, limit = 100, offset = 0) {
  const { data } = await api.get(`/courses/${courseId}/lessons`, { 
    params: { limit, offset } 
  });
  return data.objects || [];
}

// Псевдонимы для совместимости
export const getStudentCourses = listStudentCourses;