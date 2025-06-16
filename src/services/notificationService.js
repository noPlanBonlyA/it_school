import api from '../api/axiosInstance';

/**
 * Получение уведомлений для студента
 */
export const getStudentNotifications = async (studentId, limit = 10, offset = 0) => {
  console.log('[NotificationService] Getting notifications for student:', studentId);
  
  try {
    // Пробуем разные варианты API endpoint
    let response;
    
    try {
      // Вариант 1: как в документации
      response = await api.get(`/notifications/student/${studentId}`, {
        params: { limit, offset }
      });
    } catch (error) {
      if (error.response?.status === 404) {
        // Вариант 2: альтернативный endpoint
        console.log('[NotificationService] Trying alternative endpoint...');
        response = await api.get('/notifications/', {
          params: { 
            recipient_type: 'student',
            recipient_id: studentId,
            limit, 
            offset 
          }
        });
      } else {
        throw error;
      }
    }
    
    console.log('[NotificationService] Raw API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error getting notifications:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Создание уведомления для студента
 */
export const createNotificationForStudent = async (studentId, content) => {
  console.log('[NotificationService] Creating notification for student:', studentId, content);
  
  try {
    const response = await api.post('/notifications/', 
      { content },
      { 
        params: { 
          recipient_type: 'student', 
          recipient_id: studentId 
        } 
      }
    );
    console.log('[NotificationService] Student notification created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error creating student notification:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Создание уведомления для группы (всем студентам группы)
 */
export const createNotificationForGroup = async (groupId, content) => {
  console.log('[NotificationService] Creating notification for group:', groupId, content);
  
  try {
    const response = await api.post('/notifications/', 
      { content },
      { 
        params: { 
          recipient_type: 'group', 
          recipient_id: groupId 
        } 
      }
    );
    console.log('[NotificationService] Group notification created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error creating group notification:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Создание уведомления для курса (всем студентам курса)
 */
export const createNotificationForCourse = async (courseId, content) => {
  console.log('[NotificationService] Creating notification for course:', courseId, content);
  
  try {
    const response = await api.post('/notifications/', 
      { content },
      { 
        params: { 
          recipient_type: 'course', 
          recipient_id: courseId 
        } 
      }
    );
    console.log('[NotificationService] Course notification created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error creating course notification:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Отметить уведомление как прочитанное
 */
export const markNotificationAsRead = async (notificationId, studentId) => {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`, null, {
      params: { student_id: studentId, is_read: true }
    });
    console.log('[NotificationService] Notification marked as read:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error marking notification as read:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Удалить уведомление
 */
export const deleteNotification = async (notificationId) => {
  try {
    await api.delete(`/notifications/${notificationId}`);
    console.log('[NotificationService] Notification deleted:', notificationId);
  } catch (error) {
    console.error('[NotificationService] Error deleting notification:', error.response?.data || error.message);
    throw error;
  }
};