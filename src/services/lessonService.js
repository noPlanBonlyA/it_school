import api from '../api/axiosInstance';

/*───────────────── курс ─────────────────*/
export async function getCourse(courseId) {
  const { data } = await api.get(`/courses/${courseId}`);
  return data;
}

/*───────────────── список уроков ─────────────────*/
export async function listLessons(courseId, limit = 100, offset = 0) {
  const { data } = await api.get(
    `/courses/${courseId}/lessons`,
    { params: { limit, offset } }
  );
  return data;                 // { objects, count }
}

/*───────────────── один урок ─────────────────*/
export async function getLesson(courseId, lessonId) {
  const { data } = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
  return data;
}

/*───────────────── CRUD teacher-уроков ─────────────────*/
export async function createLesson(courseId, payload) {
  const { data } = await api.post(`/courses/${courseId}/lessons`, payload);
  return data;
}
export async function createLessonWithMaterials(courseId, payload) {
  const { data } = await api.post(
    `/courses/${courseId}/lessons-with-materials`,
    payload
  );
  return data;
}

/*───────────────── материал для студента ─────────────────*/
function absUrl(u) {
  return /^https?:\/\//i.test(u)
    ? u
    : `${window.location.protocol}//${window.location.hostname}:8080${u}`;
}

/**
 * Возвращает:
 *  • { type:'html', html, name } ─ если бек шлёт HTML-текст;
 *  • { type:'file', url,  name } ─ если бек шлёт ссылку на файл.
 *  Если материала нет или формат неизвестен → null.
 */
export async function getStudentLessonMaterial(courseId, lessonId) {
  try {
    /* единственный нужный запрос */
    const { data: mat } = await api.get(
      `/courses/${courseId}/lessons/${lessonId}/student-materials`
    );
    if (!mat) return null;

    /* бек нового формата всегда отдаёт одно из двух полей */
    if (mat.url) {
      return { type: 'file', url: absUrl(mat.url), name: mat.name || 'material' };
    }
    if (mat.html || mat.html_text) {
      return { type: 'html', html: mat.html || mat.html_text, name: mat.name || 'material' };
    }

    /* неизвестный формат, но дополнительных запросов не делаем */
    return null;
  } catch (err) {
    console.error('Не удалось получить материал студента:', err);
    return null;
  }
}
export async function getLessonWithMaterials(courseId, lessonId) {
    const { data } = await api.get(
      `/courses/${courseId}/lessons-with-materials/${lessonId}`
    );
    return data;
  }
  export async function getLessonInfoForTeacher(courseId, lessonId) {
    const { data } = await api.get(
      `/courses/${courseId}/lessons/${lessonId}/teacher-info`
    );
    /* бек отдаёт:
       { id,name, …, teacher_material:{url}, homework:{url}, … }
    */
    return {
      id   : data.id,
      name : data.name,
      teacher_material_url : data.teacher_material?.url || '',
      homework_material_url: data.homework?.url        || ''
    };
  }