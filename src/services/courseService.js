import api from '../api/axiosInstance';
import { createNotificationForCourse } from './notificationService';

/**
 * Нормализует возрастные категории для отображения в UI
 * Преобразует серверные значения в пользовательские
 */
function normalizeAgeCategory(ageCategory) {
  if (Array.isArray(ageCategory)) {
    return ageCategory.map(category => {
      if (category === 'All' || category === 'Все возрасты') return 'All';
      if (category === 'SixPlus') return '5-7';
      if (category === 'TwelvePlus') return '12-14';
      if (category === '5-7') return '5-7';  // уже в правильном формате
      if (category === '8-10') return '8-10';  // уже в правильном формате
      if (category === '12-14') return '12-14';  // уже в правильном формате
      return category;
    });
  } else {
    if (ageCategory === 'All' || ageCategory === 'Все возрасты') return 'All';
    if (ageCategory === 'SixPlus') return '5-7';
    if (ageCategory === 'TwelvePlus') return '12-14';
    if (ageCategory === '5-7') return '5-7';  // уже в правильном формате
    if (ageCategory === '8-10') return '8-10';  // уже в правильном формате
    if (ageCategory === '12-14') return '12-14';  // уже в правильном формате
    return ageCategory;
  }
}

/**
 * Обратная нормализация возрастных категорий для отправки на сервер
 * Преобразует пользовательские значения в серверные
 */
function denormalizeAgeCategory(ageCategory) {
  if (Array.isArray(ageCategory)) {
    return ageCategory.map(category => {
      if (category === 'ALL') return 'All';  // Правильный формат для API
      if (category === '5-7') return '5-7';
      if (category === '8-10') return '8-10';
      if (category === '12-14') return '12-14';
      return category;
    });
  } else {
    if (ageCategory === 'ALL') return 'All';  // Правильный формат для API
    if (ageCategory === '5-7') return '5-7';
    if (ageCategory === '8-10') return '8-10';
    if (ageCategory === '12-14') return '12-14';
    return ageCategory;
  }
}

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
    
    // Обрабатываем категорию "ALL" (для всех возрастов)
    if (ageCategory === 'all' || ageCategory === 'все возрасты' || ageCategory === 'все') {
      return true; // Курсы "ALL" показываем всем
    }
    
    // Парсим диапазоны возрастов (например, "5-7", "8-10", "12-14")
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
    
    // Обрабатываем устаревшие категории для обратной совместимости
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
  
  // Нормализуем возрастные категории
  if (data.objects) {
    data.objects = data.objects.map(course => ({
      ...course,
      age_category: normalizeAgeCategory(course.age_category)
    }));
  } else if (Array.isArray(data)) {
    data = data.map(course => ({
      ...course,
      age_category: normalizeAgeCategory(course.age_category)
    }));
  }
  
  return data;
}

// GET /api/courses/ - курсы с фильтрацией по возрасту для студентов
export async function getAllCoursesFiltered(studentUser = null, limit = 100, offset = 0) {
  const { data } = await api.get('/courses/', { params: { limit, offset } });
  
  // Нормализуем возрастные категории
  let normalizedData = data;
  if (data.objects) {
    normalizedData = {
      ...data,
      objects: data.objects.map(course => ({
        ...course,
        age_category: normalizeAgeCategory(course.age_category)
      }))
    };
  } else if (Array.isArray(data)) {
    normalizedData = data.map(course => ({
      ...course,
      age_category: normalizeAgeCategory(course.age_category)
    }));
  }
  
  // Если пользователь не передан, возвращаем нормализованные курсы
  if (!studentUser) {
    return normalizedData;
  }
  
  // Вычисляем возраст студента
  const studentAge = calculateAge(studentUser.birth_date);
  
  console.log('[CourseService] Student age:', studentAge, 'from birth_date:', studentUser.birth_date);
  
  // Фильтруем курсы по возрасту
  const filteredCourses = (normalizedData.objects || normalizedData || []).filter(course => {
    const suitable = isCourseSuitableForAge(course, studentAge);
    console.log('[CourseService] Course:', course.name, 
                'age_category:', course.age_category, 
                'student age:', studentAge, 
                'suitable:', suitable);
    return suitable;
  });
  
  console.log('[CourseService] Filtered courses:', filteredCourses.length, 'out of', (normalizedData.objects || normalizedData || []).length);
  
  return {
    ...normalizedData,
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
          age_category: normalizeAgeCategory(item.course?.age_category),
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
  
  // Нормализуем возрастные категории
  const normalizedData = Array.isArray(data) 
    ? data.map(course => ({
        ...course,
        age_category: normalizeAgeCategory(course.age_category)
      }))
    : data;
    
  return normalizedData;
}

// GET /api/courses/{id} - один курс по ID
export async function getCourse(courseId) {
  const { data } = await api.get(`/courses/${courseId}`);
  
  // Нормализуем возрастные категории
  return {
    ...data,
    age_category: normalizeAgeCategory(data.age_category)
  };
}

// УПРОЩЕНО: Проверка доступа студента к курсу (всегда разрешаем)
export async function checkStudentCourseAccess(courseId) {
  console.log('[CourseService] Checking student access to course:', courseId);
  // Упрощаем - всегда разрешаем доступ
  return true;
}

// POST /api/courses/ - создание курса
export const createCourse = async (formData) => {
  // Если в formData есть age_category, применяем обратную нормализацию
  if (formData.has && formData.has('course_data')) {
    try {
      const courseDataStr = formData.get('course_data');
      const courseData = JSON.parse(courseDataStr);
      
      console.log('[CourseService] Original course data:', courseData);
      console.log('[CourseService] age_category:', courseData.age_category, 'type:', typeof courseData.age_category, 'isArray:', Array.isArray(courseData.age_category));
      
      if (courseData.age_category) {
        courseData.age_category = denormalizeAgeCategory(courseData.age_category);
        formData.set('course_data', JSON.stringify(courseData));
        console.log('[CourseService] Denormalized course data:', courseData);
        console.log('[CourseService] Denormalized age_category:', courseData.age_category, 'type:', typeof courseData.age_category, 'isArray:', Array.isArray(courseData.age_category));
      }
    } catch (error) {
      console.warn('[CourseService] Could not parse course_data for denormalization:', error);
    }
  }
  
  try {
    // Детальное логирование FormData перед отправкой
    console.log('[CourseService] FormData entries before sending:');
    for (let [key, value] of formData.entries()) {
      console.log(`[CourseService] FormData key: "${key}", value:`, value, 'type:', typeof value);
    }
    
    // Отправляем запрос с правильным Content-Type заголовком
    const { data } = await api.post('/courses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
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
  } catch (error) {
    console.error('[CourseService] Create course error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // Детальная информация об ошибке валидации
    if (error.response?.status === 422 && error.response?.data?.detail) {
      console.error('[CourseService] Validation errors:', error.response.data.detail);
      error.response.data.detail.forEach((detail, index) => {
        console.error(`[CourseService] Validation error ${index + 1}:`, detail);
        if (detail.loc) {
          console.error(`[CourseService] Error location path:`, detail.loc);
          console.error(`[CourseService] Error type:`, detail.type);
          console.error(`[CourseService] Error message:`, detail.msg);
          console.error(`[CourseService] Error input:`, detail.input);
        }
      });
    }
    
    throw error;
  }
};

// PUT /api/courses/{id} - обновление курса
export async function updateCourse(id, formData) {
  // Если в formData есть age_category, применяем обратную нормализацию
  if (formData.has && formData.has('course_data')) {
    try {
      const courseDataStr = formData.get('course_data');
      const courseData = JSON.parse(courseDataStr);
      
      if (courseData.age_category) {
        courseData.age_category = denormalizeAgeCategory(courseData.age_category);
        formData.set('course_data', JSON.stringify(courseData));
      }
    } catch (error) {
      console.warn('[CourseService] Could not parse course_data for denormalization:', error);
    }
  }
  
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
  try {
    console.log('[CourseService] Getting course lessons for course:', courseId);
    
    const { data } = await api.get(`/courses/${courseId}/lessons`, { 
      params: { limit, offset } 
    });
    
    console.log('[CourseService] Course lessons response:', data);
    console.log('[CourseService] Response data type:', typeof data);
    console.log('[CourseService] Response data is array:', Array.isArray(data));
    
    // Проверяем различные варианты структуры ответа
    let lessons = [];
    
    if (data && typeof data === 'object') {
      if (Array.isArray(data.objects)) {
        lessons = data.objects;
        console.log('[CourseService] Using data.objects as lessons array');
      } else if (Array.isArray(data)) {
        lessons = data;
        console.log('[CourseService] Using data as lessons array');
      } else {
        console.warn('[CourseService] Unexpected response structure:', data);
        lessons = [];
      }
    } else if (Array.isArray(data)) {
      lessons = data;
      console.log('[CourseService] Direct array response');
    } else {
      console.warn('[CourseService] Invalid response format:', data);
      lessons = [];
    }
    
    console.log('[CourseService] Final lessons array:', lessons);
    console.log('[CourseService] Lessons count:', lessons.length);
    
    return lessons;
  } catch (error) {
    console.error('[CourseService] Error getting course lessons:', error);
    console.error('[CourseService] Error response:', error.response?.data);
    return []; // Возвращаем пустой массив в случае ошибки
  }
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