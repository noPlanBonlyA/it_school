// src/utils/pointsUtils.js

import { createPointsHistory, POINT_REASONS } from '../services/coinHistoryService';
import { createNotificationForStudent } from '../services/notificationService';

/**
 * Создает запись в истории поинтов и отправляет уведомление студенту
 * @param {string} userId - ID пользователя (студента)
 * @param {string} reason - Причина изменения поинтов (из POINT_REASONS)
 * @param {number} changedPoints - Количество изменившихся поинтов (может быть отрицательным)
 * @param {string} description - Описание операции
 * @returns {Promise<Object>} Созданная запись истории
 */
export const addPointsHistoryWithNotification = async (userId, reason, changedPoints, description) => {
  try {
    // Создаем запись в истории
    const historyEntry = await createPointsHistory({
      user_id: userId,
      reason: reason,
      changed_points: changedPoints,
      description: description
    });

    // Создаем уведомление для студента
    const notificationContent = createPointsNotificationContent(reason, changedPoints, description);
    
    await createNotificationForStudent(userId, notificationContent);

    return historyEntry;
  } catch (error) {
    console.error('Ошибка при создании записи истории поинтов с уведомлением:', error);
    throw error;
  }
};

/**
 * Создает текст уведомления для изменения поинтов
 * @param {string} reason - Причина изменения
 * @param {number} changedPoints - Количество изменившихся поинтов
 * @param {string} description - Описание операции
 * @returns {string} Текст уведомления
 */
const createPointsNotificationContent = (reason, changedPoints, description) => {
  const isPositive = changedPoints > 0;
  const pointsText = Math.abs(changedPoints) === 1 ? 'монету' : 
                    (Math.abs(changedPoints) < 5 ? 'монеты' : 'монет');
  
  const action = isPositive ? 'получили' : 'потратили';
  const emoji = isPositive ? '💰' : '💸';

  let reasonText = '';
  switch (reason) {
    case POINT_REASONS.HOMEWORK:
      reasonText = isPositive ? 'за выполнение домашнего задания' : 'за домашнее задание';
      break;
    case POINT_REASONS.VISIT:
      reasonText = 'за посещение урока';
      break;
    case POINT_REASONS.BONUS:
      reasonText = 'бонус';
      break;
    case POINT_REASONS.PENALTY:
      reasonText = 'штраф';
      break;
    case POINT_REASONS.BUY:
      reasonText = 'за покупку';
      break;
    default:
      reasonText = description || 'другая операция';
  }

  let message = `${emoji} Вы ${action} ${Math.abs(changedPoints)} ${pointsText}`;
  
  if (reasonText) {
    message += ` ${reasonText}`;
  }

  if (description && reason !== POINT_REASONS.OTHER) {
    message += `. ${description}`;
  }

  return message;
};

/**
 * Хелпер для начисления поинтов за домашнее задание
 * @param {string} userId - ID студента
 * @param {number} points - Количество поинтов
 * @param {string} lessonName - Название урока
 * @param {string} courseName - Название курса
 */
export const addHomeworkPoints = async (userId, points, lessonName, courseName) => {
  const description = `Урок: ${lessonName}${courseName ? `, Курс: ${courseName}` : ''}`;
  return addPointsHistoryWithNotification(
    userId, 
    POINT_REASONS.HOMEWORK, 
    points, 
    description
  );
};

/**
 * Хелпер для начисления поинтов за посещение урока
 * @param {string} userId - ID студента
 * @param {number} points - Количество поинтов
 * @param {string} lessonName - Название урока
 * @param {string} courseName - Название курса
 */
export const addVisitPoints = async (userId, points, lessonName, courseName) => {
  const description = `Урок: ${lessonName}${courseName ? `, Курс: ${courseName}` : ''}`;
  return addPointsHistoryWithNotification(
    userId, 
    POINT_REASONS.VISIT, 
    points, 
    description
  );
};

/**
 * Хелпер для начисления бонусных поинтов
 * @param {string} userId - ID студента
 * @param {number} points - Количество поинтов
 * @param {string} description - Описание бонуса
 */
export const addBonusPoints = async (userId, points, description) => {
  return addPointsHistoryWithNotification(
    userId, 
    POINT_REASONS.BONUS, 
    points, 
    description
  );
};

/**
 * Хелпер для списания поинтов за покупку
 * @param {string} userId - ID студента
 * @param {number} points - Количество поинтов (должно быть отрицательным)
 * @param {string} productName - Название купленного товара
 */
export const deductPurchasePoints = async (userId, points, productName) => {
  const description = `Покупка: ${productName}`;
  return addPointsHistoryWithNotification(
    userId, 
    POINT_REASONS.BUY, 
    -Math.abs(points), // Убеждаемся, что поинты отрицательные
    description
  );
};

/**
 * Хелпер для штрафных поинтов
 * @param {string} userId - ID студента
 * @param {number} points - Количество поинтов (должно быть отрицательным)
 * @param {string} description - Описание штрафа
 */
export const deductPenaltyPoints = async (userId, points, description) => {
  return addPointsHistoryWithNotification(
    userId, 
    POINT_REASONS.PENALTY, 
    -Math.abs(points), // Убеждаемся, что поинты отрицательные
    description
  );
};
