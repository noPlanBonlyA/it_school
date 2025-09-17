// src/services/coinHistoryService.js

import api from '../api/axiosInstance';
import { getStudentById, updateStudent } from './studentService';

/**
 * Получение истории поинтов для текущего студента
 * @param {Object} params - Параметры запроса (limit, offset)
 * @param {number} params.limit - Количество записей (максимум 100, по умолчанию 10)
 * @param {number} params.offset - Смещение для пагинации (минимум 0, по умолчанию 0)
 * @returns {Promise<Object>} История поинтов с объектами и общим количеством
 */
export const getPointsHistory = async (params = {}) => {
  try {
    const { limit = 10, offset = 0 } = params;
    
    // Валидация параметров согласно API
    const validLimit = Math.min(Math.max(1, limit), 100);
    const validOffset = Math.max(0, offset);
    
    const response = await api.get('/points/history/student', {
      params: { 
        limit: validLimit, 
        offset: validOffset 
      }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении истории поинтов:', error);
    throw error;
  }
};

/**
 * Создание записи в истории поинтов (для админов/системы)
 * @param {Object} historyData - Данные для создания записи
 * @param {string} historyData.student_id - ID студента
 * @param {string} historyData.reason - Причина изменения (Homework, Visit, Bonus, Penalty, Buy, Other)
 * @param {number} historyData.changed_points - Количество изменённых поинтов
 * @param {string} historyData.description - Описание операции
 * @param {string} [historyData.id] - UUID записи (опционально)
 * @returns {Promise<Object>} Созданная запись с датами создания и обновления
 */
export const createPointsHistory = async (historyData) => {
  try {
    // Валидация обязательных полей
    if (!historyData.student_id || !historyData.reason || typeof historyData.changed_points !== 'number') {
      throw new Error('Отсутствуют обязательные поля: student_id, reason, changed_points');
    }
    
    // Формируем правильные данные для API
    const requestData = {
      student_id: historyData.student_id,
      reason: historyData.reason,
      changed_points: Number(historyData.changed_points),
      description: historyData.description || ''
    };

    // Добавляем id только если он указан
    if (historyData.id) {
      requestData.id = historyData.id;
    }
    
    console.log('[CoinHistoryService] Sending request data:', requestData);
    
    const response = await api.post('/points/history/', requestData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании записи истории поинтов:', error);
    throw error;
  }
};

/**
 * Отправка уведомления о начислении монет
 * @param {string} studentProfileId - UUID профиля студента
 * @param {number} coins - Количество монет
 * @param {string} reason - Причина начисления
 * @returns {Promise<void>}
 */
const sendCoinsNotification = async (studentProfileId, coins, reason) => {
  try {
    await api.post('/notifications/', 
      { content: `Вам начислено ${coins} монет за ${reason}! 🪙` },
      { 
        params: { 
          recipient_type: 'student', 
          recipient_id: studentProfileId 
        } 
      }
    );
  } catch (error) {
    console.warn('Не удалось отправить уведомление о монетах:', error);
  }
};

/**
 * Создание записей в истории для начисления монет за урок и домашнее задание
 * @param {string} studentId - ID студента (не user_id!)
 * @param {Object} coinsData - Данные о монетах
 * @param {number} coinsData.coins_for_visit - Монеты за посещение
 * @param {number} coinsData.coins_for_homework - Монеты за домашнее задание
 * @param {Object} lessonInfo - Информация об уроке
 * @param {string} studentProfileId - ID профиля студента для уведомлений
 * @returns {Promise<Array>} Массив созданных записей
 */
export const createLessonCoinsHistory = async (studentId, coinsData, lessonInfo = {}, studentProfileId = null) => {
  try {
    const records = [];
    
    // Создаем запись за посещение урока
    if (coinsData.coins_for_visit && coinsData.coins_for_visit > 0) {
      const visitRecord = {
        student_id: studentId, // Изменено с user_id на student_id
        reason: POINT_REASONS.VISIT,
        changed_points: Number(coinsData.coins_for_visit),
        description: lessonInfo.lesson_name 
          ? `Посещение урока "${lessonInfo.lesson_name}"${lessonInfo.course_name ? ` (${lessonInfo.course_name})` : ''}`
          : 'Посещение урока'
      };
      
      const visitResponse = await createPointsHistory(visitRecord);
      records.push(visitResponse);
      
      // Отправляем уведомление о начислении монет за посещение
      if (studentProfileId) {
        await sendCoinsNotification(
          studentProfileId, 
          coinsData.coins_for_visit, 
          'посещение урока'
        );
      }
    }
    
    // Создаем запись за домашнее задание
    if (coinsData.coins_for_homework && coinsData.coins_for_homework > 0) {
      const homeworkRecord = {
        student_id: studentId, // Изменено с user_id на student_id
        reason: POINT_REASONS.HOMEWORK,
        changed_points: Number(coinsData.coins_for_homework),
        description: lessonInfo.lesson_name 
          ? `Домашнее задание к уроку "${lessonInfo.lesson_name}"${lessonInfo.course_name ? ` (${lessonInfo.course_name})` : ''}`
          : 'Домашнее задание'
      };
      
      const homeworkResponse = await createPointsHistory(homeworkRecord);
      records.push(homeworkResponse);
      
      // Отправляем уведомление о начислении монет за домашку
      if (studentProfileId) {
        await sendCoinsNotification(
          studentProfileId, 
          coinsData.coins_for_homework, 
          'домашнее задание'
        );
      }
    }
    
    return records;
  } catch (error) {
    console.error('Ошибка при создании записей истории для урока:', error);
    // Не прерываем основной процесс, только логируем ошибку
    return [];
  }
};

/**
 * Создание записи в истории поинтов с автоматическим уведомлением и обновлением баланса студента
 * @param {Object} historyData - Данные для создания записи
 * @param {string} studentProfileId - ID профиля студента для уведомлений
 * @returns {Promise<Object>} Созданная запись
 */
export const createPointsHistoryWithNotification = async (historyData, studentProfileId = null) => {
  try {
    // Сначала получаем текущего студента для обновления баланса
    const currentStudent = await getStudentById(historyData.student_id);
    if (!currentStudent) {
      throw new Error('Студент не найден');
    }

    // Создаем запись в истории
    const response = await createPointsHistory(historyData);
    
    // Обновляем баланс студента
    const newPoints = (currentStudent.points || 0) + historyData.changed_points;
    await updateStudent(currentStudent.id, {
      user_id: currentStudent.user_id,
      points: Math.max(0, newPoints), // Не даем балансу стать отрицательным
      id: currentStudent.id
    });
    
    // Отправляем уведомление если указан ID профиля студента
    if (studentProfileId && historyData.changed_points !== 0) {
      const reasonText = REASON_LABELS[historyData.reason] || 'операцию';
      const coinsText = historyData.changed_points > 0 
        ? `начислено ${historyData.changed_points} монет`
        : `списано ${Math.abs(historyData.changed_points)} монет`;
      
      await sendCoinsNotification(
        studentProfileId,
        Math.abs(historyData.changed_points),
        historyData.changed_points > 0 ? reasonText.toLowerCase() : `списание за ${reasonText.toLowerCase()}`
      );
    }
    
    return response;
  } catch (error) {
    console.error('Ошибка при создании записи истории поинтов с уведомлением:', error);
    throw error;
  }
};

/**
 * Обновление поинтов студента (создание записи в истории + обновление баланса)
 * @param {string} studentId - ID студента
 * @param {string} reason - Причина изменения
 * @param {number} changedPoints - Количество изменённых поинтов
 * @param {string} description - Описание операции
 * @param {string} studentProfileId - ID профиля студента для уведомлений
 * @returns {Promise<Object>} Результат операции с обновленным студентом
 */
export const updateStudentPoints = async (studentId, reason, changedPoints, description, studentProfileId = null) => {
  try {
    console.log('[CoinHistoryService] Updating student points:', { studentId, reason, changedPoints, description });

    // Получаем текущего студента
    // const currentStudent = await getStudentById(studentId);
    // if (!currentStudent) {
    //   throw new Error('Студент не найден');
    // }

    //console.log('[CoinHistoryService] Current student:', currentStudent);

    // Проверяем что у нас есть user_id
    // if (!currentStudent.user_id) {
    //   throw new Error('У студента отсутствует user_id');
    // }

    // Создаем запись в истории (используем student_id)
    const historyRecord = await createPointsHistory({
      student_id: studentId, // Теперь используем studentId напрямую
      reason: reason,
      changed_points: Number(changedPoints),
      description: description || 'Изменение количества монет'
    });

    console.log('[CoinHistoryService] History record created:', historyRecord);

    // Обновляем баланс студента
    //const newPoints = (currentStudent.points || 0) + changedPoints;
    // const updatedStudent = await updateStudent(studentId, {
    //   user_id: currentStudent.user_id,
    //   points: Math.max(0, newPoints), // Не даем балансу стать отрицательным
    //   id: studentId
    // });

    //console.log('[CoinHistoryService] Student updated:', updatedStudent);
    
    // Отправляем уведомление если указан ID профиля студента
    if (studentProfileId && changedPoints !== 0) {
      const reasonText = REASON_LABELS[reason] || 'операцию';
      await sendCoinsNotification(
        studentProfileId,
        Math.abs(changedPoints),
        changedPoints > 0 ? reasonText.toLowerCase() : `списание за ${reasonText.toLowerCase()}`
      );
    }
    
    return {
      historyRecord,
      //updatedStudent,
      //newBalance: Math.max(0, newPoints)
    };
  } catch (error) {
    console.error('Ошибка при обновлении поинтов студента:', error);
    throw error;
  }
};

/**
 * Константы для причин изменения поинтов
 */
export const POINT_REASONS = {
  HOMEWORK: 'Homework',
  VISIT: 'Visit',
  BONUS: 'Bonus',
  PENALTY: 'Penalty',
  BUY: 'Buy',
  OTHER: 'Other'
};

/**
 * Названия причин на русском языке
 */
export const REASON_LABELS = {
  [POINT_REASONS.HOMEWORK]: 'Домашнее задание',
  [POINT_REASONS.VISIT]: 'Посещение урока',
  [POINT_REASONS.BONUS]: 'Бонус',
  [POINT_REASONS.PENALTY]: 'Штраф',
  [POINT_REASONS.BUY]: 'Покупка',
  [POINT_REASONS.OTHER]: 'Другое'
};

/**
 * Получение иконки для причины
 */
export const getReasonIcon = (reason) => {
  const icons = {
    [POINT_REASONS.HOMEWORK]: '📝',
    [POINT_REASONS.VISIT]: '✅',
    [POINT_REASONS.BONUS]: '🎁',
    [POINT_REASONS.PENALTY]: '⚠️',
    [POINT_REASONS.BUY]: '🛒',
    [POINT_REASONS.OTHER]: '💰'
  };
  return icons[reason] || '💰';
};

/**
 * Получение цвета для типа операции (для UI)
 * @param {number} changedPoints - Количество изменённых поинтов
 * @returns {string} CSS класс или цвет
 */
export const getOperationColor = (changedPoints) => {
  if (changedPoints > 0) return 'success'; // Зелёный для начисления
  if (changedPoints < 0) return 'danger';  // Красный для списания
  return 'secondary'; // Серый для нулевых операций
};

/**
 * Форматирование текста изменения поинтов
 * @param {number} changedPoints - Количество изменённых поинтов
 * @returns {string} Отформатированный текст
 */
export const formatPointsChange = (changedPoints) => {
  if (changedPoints > 0) {
    return `+${changedPoints}`;
  }
  return changedPoints.toString();
};

/**
 * Получение истории поинтов для конкретного студента (для админов)
 * @param {string} studentId - ID студента
 * @param {Object} params - Параметры запроса (limit, offset)
 * @param {number} params.limit - Количество записей (максимум 100, по умолчанию 10)
 * @param {number} params.offset - Смещение для пагинации (минимум 0, по умолчанию 0)
 * @returns {Promise<Object>} История поинтов с объектами и общим количеством
 */
export const getStudentPointsHistory = async (studentId, params = {}) => {
  try {
    const { limit = 10, offset = 0 } = params;
    
    // Валидация параметров согласно API
    const validLimit = Math.min(Math.max(1, limit), 100);
    const validOffset = Math.max(0, offset);
    
    console.log('[CoinHistoryService] Getting points history for studentId:', studentId);
    
    if (!studentId) {
      console.log('[CoinHistoryService] No studentId provided, using general endpoint for current user');
      // Если нет конкретного studentId, используем обычный endpoint для текущего пользователя
      return await getPointsHistory(params);
    }
    
    // Согласно API документации, для получения истории конкретного студента 
    // используем общий endpoint /api/points/history/ и получаем все записи для фильтрации
    
    try {
      console.log('[CoinHistoryService] Trying to get all points history records...');
      
      // Получаем все записи истории поинтов (с максимальным лимитом)
      const allRecords = [];
      let currentOffset = 0;
      const pageSize = 100;
      
      // Получаем записи постранично
      while (true) {
        const response = await api.get('/points/history/', {
          params: { 
            limit: pageSize,
            offset: currentOffset
          }
        });
        
        const pageData = response.data?.objects || [];
        console.log(`[CoinHistoryService] Got page with ${pageData.length} records (offset: ${currentOffset})`);
        
        if (pageData.length === 0) {
          break; // Больше записей нет
        }
        
        allRecords.push(...pageData);
        
        // Если получили меньше записей чем запрашивали, значит это последняя страница
        if (pageData.length < pageSize) {
          break;
        }
        
        currentOffset += pageSize;
        
        // Ограничиваем количество запросов для избежания бесконечного цикла
        if (currentOffset > 1000) {
          console.warn('[CoinHistoryService] Reached maximum offset limit, stopping...');
          break;
        }
      }
      
      console.log(`[CoinHistoryService] Total records retrieved: ${allRecords.length}`);
      console.log('[CoinHistoryService] Looking for records with student_id:', studentId);
      
      // Фильтруем по studentId - проверяем разные возможные поля
      const filteredHistory = allRecords.filter(record => {
        const matchesStudentId = record.student_id === studentId;
        const matchesUserId = record.user_id === studentId;
        
        // Логируем только несколько первых записей для отладки
        if (allRecords.indexOf(record) < 5) {
          console.log('[CoinHistoryService] Checking record:', {
            recordId: record.id,
            recordStudentId: record.student_id,
            recordUserId: record.user_id,
            targetStudentId: studentId,
            matchesStudentId,
            matchesUserId
          });
        }
        
        return matchesStudentId || matchesUserId;
      });
      
      console.log('[CoinHistoryService] Filtered history:', filteredHistory.length, 'records');
      
      if (filteredHistory.length > 0) {
        console.log('[CoinHistoryService] Found records:', filteredHistory);
      }
      
      // Применяем пагинацию после фильтрации
      const startIndex = validOffset;
      const endIndex = startIndex + validLimit;
      const paginatedHistory = filteredHistory.slice(startIndex, endIndex);
      
      return {
        objects: paginatedHistory,
        meta: {
          total_count: filteredHistory.length,
          limit: validLimit,
          offset: validOffset
        }
      };
      
    } catch (error) {
      console.error('[CoinHistoryService] Error getting points history:', error);
      
      // Fallback: если ничего не работает, возвращаем пустую историю
      return {
        objects: [],
        meta: {
          total_count: 0,
          limit: validLimit,
          offset: validOffset
        }
      };
    }
  } catch (error) {
    console.error('[CoinHistoryService] Ошибка при получении истории поинтов студента:', error);
    
    // Возвращаем пустую структуру в случае ошибки
    return {
      objects: [],
      meta: {
        total_count: 0,
        limit: params.limit || 10,
        offset: params.offset || 0
      }
    };
  }
};
