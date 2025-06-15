import api from '../api/axiosInstance';

/**
 * Вернуть все lesson-groups для указанной группы.
 * Бек допускает query-параметры limit / offset.
 */
export async function listLessonGroupsByGroup(groupId, limit = 100, offset = 0) {
    try {
      // ⚠️ именно ...lesson-groups (plural)
      const { data } = await api.get('/courses/lesson-groups', {
        params: { group_id: groupId, limit, offset }
      });
      return data.objects || [];
    } catch (e) {
      // 404 / 405 / 422 – считаем, что lesson-groups нет
      if ([404, 405, 422].includes(e.response?.status)) return [];
      throw e;          // остальные ошибки пробрасываем
    }
  }


  
