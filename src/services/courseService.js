import api from '../api/axiosInstance';
import { createNotificationForCourse } from './notificationService';

/**
 * Вычисляет возраст по дате рождения
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;
  
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  
  // Проверяем, прошел ли день рождения в этом году
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Проверяет, подходит ли курс студенту по возрасту
 */
function isCourseSuitableForAge(course, studentAge) {
  if (!course.age_category || !Array.isArray(course.age_category) || course.age_category.length === 0 || studentAge === null) {
    return true; // Если возраст не указан или категория не задана, показываем курс
  }
  
  // Проверяем каждую возрастную категорию в массиве
  for (const category of course.age_category) {
    const ageCategory = category.toLowerCase();
    
    // Обрабатываем различные варианты возрастных категорий
    if (ageCategory.includes('все') || ageCategory === 'all') {
      return true; // Курсы "All" показываем всем
    }
    
    // Парсим диапазоны возрастов
    if (ageCategory.includes('-')) {
      const [minAge, maxAge] = ageCategory.split('-').map(age => parseInt(age.trim()));
      if (!isNaN(minAge) && !isNaN(maxAge) && studentAge >= minAge && studentAge <= maxAge) {
        return true;
      }
    }
    
    // Обрабатываем категории типа "6+", "12+"
    if (ageCategory.includes('+')) {
      const minAge = parseInt(ageCategory.replace('+', ''));
      if (!isNaN(minAge) && studentAge >= minAge) {
        return true;
      }
    }
    
    // Обрабатываем старые категории
    if (ageCategory === 'sixplus' && studentAge >= 6) {
      return true;
    }
    if (ageCategory === 'twelveplus' && studentAge >= 12) {
      return true;
    }
  }
  
  // Если ни одна категория не подошла, не показываем курс
  return false;
}

// GET /api/courses/ - все курсы (для админов)
export async function getAllCourses(limit = 100, offset = 0) {
  const { data } = await api.get('/courses/', { params: { limit, offset } });
  return data;
}

// GET /api/courses/ - курсы с фильтрацией по возрасту для студентов
export async function getAllCoursesFiltered(studentUser = null, limit = 100, offset = 0) {
  const { data } = await api.get('/courses/', { params: { limit, offset } });
  
  // Если пользователь не передан, возвращаем все курсы
  if (!studentUser) {
    return data;
  }
  
  // Вычисляем возраст студента
  const studentAge = calculateAge(studentUser.birth_date);
  
  console.log('[CourseService] Student age:', studentAge, 'from birth_date:', studentUser.birth_date);
  
  // Фильтруем курсы по возрасту
  const filteredCourses = (data.objects || data || []).filter(course => {
    const suitable = isCourseSuitableForAge(course, studentAge);
    console.log('[CourseService] Course:', course.name, 
                'age_category:', course.age_category, 
                'student age:', studentAge, 
                'suitable:', suitable);
    return suitable;
  });
  
  console.log('[CourseService] Filtered courses:', filteredCourses.length, 'out of', (data.objects || data || []).length);
  
  return {
    ...data,
    objects: filteredCourses
  };
}

// GET /api/courses/student - ТОЛЬКО курсы из групп студента
export async function listStudentCourses() {
  console.log('[CourseService] Fetching student courses...');
  try {
    const { data } = await api.get('/courses/student');
    console.log('[CourseService] Student courses response:', data);
    
    // API возвращает массив объектов с полем course и progress
    const courses = Array.isArray(data) 
      ? data.map(item => ({
          ...item.course,
          progress: item.progress || 0,
          student_id: item.student_id,
          course_id: item.course_id
        }))
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

// УПРОЩЕНО: Проверка доступа студента к курсу (всегда разрешаем)
export async function checkStudentCourseAccess(courseId) {
  console.log('[CourseService] Checking student access to course:', courseId);
  // Упрощаем - всегда разрешаем доступ
  return true;
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

/**
 * ИСПРАВЛЕНО: Получить материалы урока для студента через правильный эндпоинт
 */
export async function getStudentLessonMaterials(courseId, lessonId) {
  console.log('[CourseService] Getting student lesson materials:', { courseId, lessonId });
  
  try {
    // ИСПРАВЛЕНО: Используем правильный эндпоинт согласно API
    const response = await api.get(`/courses/${courseId}/lessons/${lessonId}/student-materials`);
    console.log('[CourseService] Student lesson materials loaded:', response.data);
    
    // Добавляем URL для материалов
    const materialsData = response.data;
    
    // ИСПРАВЛЕНО: Формируем правильные URL для iframe
    if (materialsData.id) {
      materialsData.student_material_url = `${window.location.protocol}//${window.location.hostname}:8080/courses/material/${materialsData.id}`;
    }
    
    return materialsData;
  } catch (error) {
    console.error('[CourseService] Error loading student lesson materials:', error.response?.data || error.message);
    throw error;
  }
}

// Псевдонимы для совместимости
export const getStudentCourses = listStudentCourses;

// GET /api/courses/student/lesson-student - получить детальный прогресс по урокам для студента
export async function getStudentLessonProgress() {
  console.log('[CourseService] Fetching student lesson progress...');
  try {
    const { data } = await api.get('/courses/student/lesson-student');
    console.log('[CourseService] Student lesson progress response:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[CourseService] Error fetching student lesson progress:', error);
    return [];
  }
}