// src/services/eventService.js
import api from '../api/axiosInstance';

/**
 * Получение всех событий
 * @param {Object} params - Параметры запроса (limit, offset)
 * @returns {Promise<Object>} Список событий
 */
export const getAllEvents = async (params = {}) => {
  try {
    const { limit = 100, offset = 0 } = params;
    const response = await api.get('/events/', {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

/**
 * Получение события по ID
 * @param {string} eventId - ID события
 * @returns {Promise<Object>} Данные события
 */
export const getEventById = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

/**
 * Создание нового события
 * @param {Object} eventData - Данные события
 * @returns {Promise<Object>} Созданное событие
 */
export const createEvent = async (eventData) => {
  try {
    const response = await api.post('/events/', eventData);
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

/**
 * Обновление события
 * @param {string} eventId - ID события
 * @param {Object} eventData - Обновленные данные события
 * @returns {Promise<Object>} Обновленное событие
 */
export const updateEvent = async (eventId, eventData) => {
  try {
    const response = await api.put(`/events/${eventId}`, eventData);
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

/**
 * Удаление события
 * @param {string} eventId - ID события
 * @returns {Promise<void>}
 */
export const deleteEvent = async (eventId) => {
  try {
    await api.delete(`/events/${eventId}`);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Добавление события для группы
 * @param {string} eventId - ID события
 * @param {Object} groupData - Данные группы {group_id, with_teacher}
 * @returns {Promise<Object>} Результат добавления
 */
export const addEventForGroup = async (eventId, groupData) => {
  try {
    const response = await api.post(`/events/${eventId}/groups`, groupData);
    return response.data;
  } catch (error) {
    console.error('Error adding event for group:', error);
    throw error;
  }
};

/**
 * Добавление события для пользователей
 * @param {string} eventId - ID события
 * @param {Object} usersData - Данные пользователей {user_ids: []}
 * @returns {Promise<Object>} Результат добавления
 */
export const addEventForUsers = async (eventId, usersData) => {
  try {
    const response = await api.post(`/events/${eventId}/users`, usersData);
    return response.data;
  } catch (error) {
    console.error('Error adding event for users:', error);
    throw error;
  }
};

/**
 * Получение события с пользователями
 * @param {string} eventId - ID события
 * @returns {Promise<Object>} Событие с пользователями
 */
export const getEventWithUsers = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}/users`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event with users:', error);
    throw error;
  }
};

/**
 * Удаление пользователя из события
 * @param {string} eventId - ID события
 * @param {string} userId - ID пользователя
 * @returns {Promise<void>}
 */
export const removeUserFromEvent = async (eventId, userId) => {
  try {
    await api.delete(`/events/${eventId}/users/${userId}`);
  } catch (error) {
    console.error('Error removing user from event:', error);
    throw error;
  }
};
