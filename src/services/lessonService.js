// src/services/lessonService.js
import api from '../api/axiosInstance';

// Функция для преобразования относительного URL в абсолютный
const absUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `http://localhost:8080${url}`;
};

// ─────────── Курс ───────────
export const getCourse = async (courseId) => {
  const response = await api.get(`/courses/${courseId}`);
  return response.data;
};

// ─────────── Список уроков ───────────
export const listLessons = async (courseId, limit = 10, offset = 0) => {
  const response = await api.get(`/courses/${courseId}/lessons`, {
    params: { limit, offset }
  });
  return response.data;
};

// ─────────── Обычный урок ───────────
export const getLesson = async (courseId, lessonId) => {
  const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
  return response.data;
};

// ─────────── CRUD для преподавателя ───────────
export const createLesson = async (courseId, data) => {
  const response = await api.post(`/courses/${courseId}/lessons-with-materials`, data);
  return response.data;
};

export const deleteLesson = async (courseId, lessonId) => {
  const response = await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
  return response.data;
};

export const updateLesson = async (courseId, lessonId, data) => {
  const response = await api.put(`/courses/${courseId}/lessons/${lessonId}`, data);
  return response.data;
};

// ─────────── Материал студента ───────────
export async function getStudentLessonMaterial(courseId, lessonId) {
  try {
    const { data: mat } = await api.get(
      `/courses/${courseId}/lessons/${lessonId}/student-materials`
    );
    if (!mat) return null;

    if (mat.url) {
      return { type: 'file', url: absUrl(mat.url), name: mat.name || 'material' };
    }
    if (mat.html || mat.html_text) {
      return {
        type: 'html',
        html: mat.html || mat.html_text,
        name: mat.name || 'material'
      };
    }
    return null;
  } catch (err) {
    console.error('Не удалось получить материал студента:', err);
    return null;
  }
}

// ─────────── Полный урок для студента ───────────
export async function getLessonWithMaterials(courseId, lessonId) {
  try {
    // 1) базовая информация об уроке
    const lesson = await getLesson(courseId, lessonId);

    // 2) материал преподавателя
    const teacherResponse = await api.get(
      `/courses/${courseId}/lessons/${lessonId}/teacher-materials`
    );
    const teacherMat = teacherResponse.data;

    // 3) материал(ы) студента
    const studentResponse = await api.get(
      `/courses/${courseId}/lessons/${lessonId}/student-materials`
    );
    const studentMat = studentResponse.data;

    // 4) подробности домашки (если есть homework_id)
    let homeworkMat = null;
    if (lesson.homework_id) {
      const homeworkResponse = await api.get(
        `/courses/material/${lesson.homework_id}`
      );
      homeworkMat = homeworkResponse.data;
    }

    return {
      ...lesson,
      teacher_material: teacherMat,
      student_material: studentMat,
      homework: homeworkMat
    };
  } catch (error) {
    console.error('Error loading lesson with materials:', error);
    throw error;
  }
}

// ─────────── Инфо для преподавателя ───────────
export async function getLessonInfoForTeacher(courseId, lessonId) {
  try {
    const { data } = await api.get(
      `/courses/${courseId}/lessons/${lessonId}/teacher-info`
    );
    return {
      id: data.id,
      name: data.name,
      teacher_material_url : data.teacher_material?.url ? absUrl(data.teacher_material.url) : '',
      homework_material_url: data.homework?.url ? absUrl(data.homework.url) : ''
    };
  } catch (error) {
    console.error('Error loading lesson info for teacher:', error);
    throw error;
  }
}
