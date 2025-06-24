import api from '../api/axiosInstance';

/**
 * Создание уведомления для конкретного студента
 */
export const createNotificationForStudent = async (studentId, content) => {
  console.log('[NotificationService] Creating notification for student:', { studentId, content });
  
  try {
    const response = await api.post('/notifications/', 
      {
        content: content
      },
      {
        params: {
          recipient_type: 'student',
          recipient_id: studentId
        }
      }
    );
    
    console.log('[NotificationService] Notification created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error creating notification for student:', error);
    throw error;
  }
};

/**
 * ИСПРАВЛЕНО: Массовая отправка уведомлений всем студентам
 */
export const createNotificationForAllStudents = async (content) => {
  console.log('[NotificationService] Creating notification for all students:', content);
  
  try {
    // Получаем всех студентов
    const studentsResponse = await api.get('/students/', {
      params: { limit: 100, offset: 0 }
    });
    
    const students = studentsResponse.data.objects || [];
    console.log('[NotificationService] Found students:', students.length);
    
    if (students.length === 0) {
      throw new Error('Не найдено ни одного студента для отправки уведомления');
    }
    
    // Отправляем уведомление каждому студенту отдельно
    const notifications = [];
    const errors = [];
    
    for (const student of students) {
      try {
        const notification = await createNotificationForStudent(student.id, content);
        notifications.push({
          studentId: student.id,
          studentName: `${student.user.first_name || ''} ${student.user.surname || ''}`.trim(),
          notification: notification,
          success: true
        });
      } catch (error) {
        console.error(`[NotificationService] Failed to send notification to student ${student.id}:`, error);
        errors.push({
          studentId: student.id,
          studentName: `${student.user.first_name || ''} ${student.user.surname || ''}`.trim(),
          error: error.message,
          success: false
        });
      }
    }
    
    console.log('[NotificationService] Bulk notification results:', {
      total: students.length,
      successful: notifications.length,
      failed: errors.length
    });
    
    return {
      total: students.length,
      successful: notifications.length,
      failed: errors.length,
      notifications: notifications,
      errors: errors
    };
    
  } catch (error) {
    console.error('[NotificationService] Error in bulk notification:', error);
    throw error;
  }
};

/**
 * ИСПРАВЛЕНО: Отправка уведомления студентам конкретной группы
 */
export const createNotificationForGroup = async (groupId, content) => {
  console.log('[NotificationService] Creating notification for group:', { groupId, content });
  
  try {
    // Получаем информацию о группе со студентами
    const groupResponse = await api.get(`/groups/${groupId}`);
    const group = groupResponse.data;
    
    if (!group.students || group.students.length === 0) {
      throw new Error('В группе нет студентов для отправки уведомления');
    }
    
    console.log('[NotificationService] Group students found:', group.students.length);
    
    // Отправляем уведомление каждому студенту группы
    const notifications = [];
    const errors = [];
    
    for (const student of group.students) {
      try {
        const notification = await createNotificationForStudent(student.id, content);
        notifications.push({
          studentId: student.id,
          studentName: `${student.user.first_name || ''} ${student.user.surname || ''}`.trim(),
          notification: notification,
          success: true
        });
      } catch (error) {
        console.error(`[NotificationService] Failed to send notification to student ${student.id}:`, error);
        errors.push({
          studentId: student.id,
          studentName: `${student.user.first_name || ''} ${student.user.surname || ''}`.trim(),
          error: error.message,
          success: false
        });
      }
    }
    
    console.log('[NotificationService] Group notification results:', {
      groupId: groupId,
      groupName: group.name,
      total: group.students.length,
      successful: notifications.length,
      failed: errors.length
    });
    
    return {
      groupId: groupId,
      groupName: group.name,
      total: group.students.length,
      successful: notifications.length,
      failed: errors.length,
      notifications: notifications,
      errors: errors
    };
    
  } catch (error) {
    console.error('[NotificationService] Error in group notification:', error);
    throw error;
  }
};

/**
 * НОВОЕ: Отправка уведомления студентам курса
 */
export const createNotificationForCourse = async (courseId, content) => {
  console.log('[NotificationService] Creating notification for course:', { courseId, content });
  
  try {
    // Получаем всех студентов, которые изучают этот курс
    const studentCoursesResponse = await api.get('/courses/student');
    const studentCourses = studentCoursesResponse.data || [];
    
    // Фильтруем студентов, которые изучают данный курс
    const relevantStudents = studentCourses
      .filter(sc => sc.course_id === courseId)
      .map(sc => sc.student_id);
    
    if (relevantStudents.length === 0) {
      throw new Error('Нет студентов, изучающих этот курс');
    }
    
    console.log('[NotificationService] Course students found:', relevantStudents.length);
    
    // Получаем подробную информацию о студентах
    const studentsResponse = await api.get('/students/', {
      params: { limit: 100, offset: 0 }
    });
    
    const allStudents = studentsResponse.data.objects || [];
    const courseStudents = allStudents.filter(student => 
      relevantStudents.includes(student.id)
    );
    
    // Отправляем уведомления
    const notifications = [];
    const errors = [];
    
    for (const student of courseStudents) {
      try {
        const notification = await createNotificationForStudent(student.id, content);
        notifications.push({
          studentId: student.id,
          studentName: `${student.user.first_name || ''} ${student.user.surname || ''}`.trim(),
          notification: notification,
          success: true
        });
      } catch (error) {
        console.error(`[NotificationService] Failed to send notification to student ${student.id}:`, error);
        errors.push({
          studentId: student.id,
          studentName: `${student.user.first_name || ''} ${student.user.surname || ''}`.trim(),
          error: error.message,
          success: false
        });
      }
    }
    
    return {
      courseId: courseId,
      total: courseStudents.length,
      successful: notifications.length,
      failed: errors.length,
      notifications: notifications,
      errors: errors
    };
    
  } catch (error) {
    console.error('[NotificationService] Error in course notification:', error);
    throw error;
  }
};

/**
 * Получение уведомлений для студента
 */
export const getStudentNotifications = async (studentId, limit = 10, offset = 0) => {
  console.log('[NotificationService] Getting notifications for student:', studentId);
  
  try {
    const response = await api.get(`/notifications/student/${studentId}`, {
      params: { limit, offset }
    });
    
    console.log('[NotificationService] Notifications retrieved:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error getting student notifications:', error);
    throw error;
  }
};

/**
 * Пометить уведомление как прочитанное
 */
export const markNotificationAsRead = async (notificationId, studentId) => {
  console.log('[NotificationService] Marking notification as read:', { notificationId, studentId });
  
  try {
    const response = await api.put(`/notifications/${notificationId}/read`, null, {
      params: {
        student_id: studentId,
        is_read: true
      }
    });
    
    console.log('[NotificationService] Notification marked as read:', response.data);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Удаление уведомления
 */
export const deleteNotification = async (notificationId) => {
  console.log('[NotificationService] Deleting notification:', notificationId);
  
  try {
    await api.delete(`/notifications/${notificationId}`);
    console.log('[NotificationService] Notification deleted successfully');
  } catch (error) {
    console.error('[NotificationService] Error deleting notification:', error);
    throw error;
  }
};

/**
 * НОВОЕ: Получение уведомлений для текущего пользователя
 */
export const getMyNotifications = async (limit = 10, offset = 0) => {
  console.log('[NotificationService] Getting my notifications...');
  
  try {
    // Сначала получаем информацию о текущем студенте
    const studentResponse = await api.get('/students/me');
    const student = studentResponse.data;
    
    if (!student?.id) {
      throw new Error('Не удалось получить информацию о студенте');
    }
    
    return await getStudentNotifications(student.id, limit, offset);
  } catch (error) {
    console.error('[NotificationService] Error getting my notifications:', error);
    throw error;
  }
};

/**
 * ОТЛАДОЧНАЯ: Получение всех студентов для проверки
 */
export const debugAllStudents = async () => {
  console.log('[NotificationService] DEBUG: Getting all students...');
  
  try {
    const response = await api.get('/students/', {
      params: { limit: 100, offset: 0 }
    });
    
    const students = response.data.objects || [];
    console.log('[NotificationService] DEBUG: All students:', {
      total: students.length,
      students: students.map(s => ({
        id: s.id,
        user_id: s.user_id,
        name: `${s.user.first_name || ''} ${s.user.surname || ''}`.trim(),
        username: s.user.username
      }))
    });
    
    return students;
  } catch (error) {
    console.error('[NotificationService] DEBUG: Error getting students:', error);
    throw error;
  }
};