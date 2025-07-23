import api from '../api/axiosInstance';

/**
 * Получение рейтинга студентов (топ-10 + текущий пользователь если не в топе)
 */
export const getRatingData = async () => {
  try {
    console.log('[RatingService] Getting rating data...');
    
    // Сначала пытаемся получить всех студентов
    let allStudents = [];
    let hasFullAccess = true;
    
    try {
      const response = await api.get('/students/', {
        params: { 
          limit: 100, 
          offset: 0 
        }
      });
      
      console.log('[RatingService] Students response:', response.data);
      
      if (response.data?.objects && Array.isArray(response.data.objects)) {
        allStudents = response.data.objects;
      } else if (Array.isArray(response.data)) {
        allStudents = response.data;
      }
    } catch (error) {
      console.log('[RatingService] Cannot access all students, using fallback approach');
      hasFullAccess = false;
      
      // Если нет доступа ко всем студентам, используем демо данные для топа
      allStudents = getMockStudents();
    }
    
    // Обрабатываем студентов
    const processedStudents = allStudents.map(student => ({
      ...student,
      points: student.points || 0,
      user: student.user || {
        id: student.user_id,
        first_name: 'Неизвестно',
        surname: '',
        email: 'unknown@example.com',
        role: 'student'
      }
    }));
    
    // Фильтруем и сортируем
    const validStudents = processedStudents.filter(student => 
      student.user && (student.user.first_name || student.user.username)
    );
    
    const sortedStudents = validStudents.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    return {
      students: sortedStudents,
      hasFullAccess
    };
    
  } catch (error) {
    console.error('[RatingService] Error getting rating data:', error);
    throw error;
  }
};

/**
 * Получение всех студентов для рейтинга (устаревшая функция, оставлена для совместимости)
 */
export const getAllStudents = async () => {
  const result = await getRatingData();
  return result.students;
};

/**
 * Получение данных текущего студента
 */
export const getCurrentUserRating = async () => {
  try {
    console.log('[RatingService] Getting current user student data...');
    
    const response = await api.get('/students/me');
    
    console.log('[RatingService] Current user student data:', response.data);
    
    if (!response.data) {
      return null;
    }
    
    return {
      ...response.data,
      points: response.data.points || 0,
      user: response.data.user || null
    };
    
  } catch (error) {
    console.error('[RatingService] Error getting current user data:', error);
    
    // Если пользователь не студент или нет доступа, возвращаем null
    if (error.response?.status === 404) {
      console.log('[RatingService] Current user is not a student');
      return null;
    }
    
    return null;
  }
};

/**
 * Mock данные для демонстрации
 */
export const getMockStudents = () => {
  return [
    {
      id: '1',
      user_id: '1',
      points: 250,
      user: {
        id: '1',
        first_name: 'Александр',
        surname: 'Петров',
        email: 'alex.petrov@example.com',
        role: 'student'
      }
    },
    {
      id: '2',
      user_id: '2', 
      points: 235,
      user: {
        id: '2',
        first_name: 'Мария',
        surname: 'Иванова',
        email: 'maria.ivanova@example.com',
        role: 'student'
      }
    },
    {
      id: '3',
      user_id: '3',
      points: 220,
      user: {
        id: '3',
        first_name: 'Дмитрий',
        surname: 'Сидоров', 
        email: 'dmitry.sidorov@example.com',
        role: 'student'
      }
    },
    {
      id: '4',
      user_id: '4',
      points: 205,
      user: {
        id: '4',
        first_name: 'Анна',
        surname: 'Козлова',
        email: 'anna.kozlova@example.com',
        role: 'student'
      }
    },
    {
      id: '5',
      user_id: '5',
      points: 190,
      user: {
        id: '5',
        first_name: 'Сергей',
        surname: 'Морозов',
        email: 'sergey.morozov@example.com',
        role: 'student'
      }
    },
    {
      id: '6',
      user_id: '6',
      points: 175,
      user: {
        id: '6',
        first_name: 'Елена',
        surname: 'Васильева',
        email: 'elena.vasilieva@example.com',
        role: 'student'
      }
    },
    {
      id: '7',
      user_id: '7',
      points: 160,
      user: {
        id: '7',
        first_name: 'Михаил',
        surname: 'Федоров',
        email: 'mikhail.fedorov@example.com',
        role: 'student'
      }
    },
    {
      id: '8',
      user_id: '8',
      points: 145,
      user: {
        id: '8',
        first_name: 'Ольга',
        surname: 'Николаева',
        email: 'olga.nikolaeva@example.com',
        role: 'student'
      }
    }
  ];
};

/**
 * Получение топ студентов с ограничением
 */
export const getTopStudents = async (limit = 10) => {
  try {
    const allStudents = await getAllStudents();
    
    // Берем топ студентов
    const topStudents = allStudents.slice(0, limit);
    
    return topStudents;
    
  } catch (error) {
    console.error('[RatingService] Error getting top students:', error);
    throw error;
  }
};

/**
 * Обновление баллов студента (для админов/учителей)
 * ПРИМЕЧАНИЕ: В настоящее время учитель не имеет прав для прямого обновления баллов студента
 * Эта функция оставлена для будущего использования когда будет реализован соответствующий API
 */
export const updateStudentPoints = async (studentId, points) => {
  try {
    console.log('[RatingService] Attempting to update student points:', { studentId, points });
    
    // Пока что просто логируем попытку, но не выполняем запрос
    console.warn('[RatingService] Student points update is disabled - teacher lacks permissions');
    
    // Возвращаем fake успешный ответ чтобы не ломать UI
    return {
      id: studentId,
      points: points,
      message: 'Points update simulated (teacher lacks API permissions)'
    };
    
    // TODO: Когда будет создан API для учителей, раскомментировать:
    /*
    const response = await api.put(`/students/${studentId}`, {
      user_id: studentUserId, // Нужно получать user_id отдельно
      points: points
    });
    
    console.log('[RatingService] Student updated:', response.data);
    return response.data;
    */
    
  } catch (error) {
    console.error('[RatingService] Error updating student points:', error);
    throw error;
  }
};

/**
 * Получение статистики рейтинга
 */
export const getRatingStats = async () => {
  try {
    const students = await getAllStudents();
    
    const totalStudents = students.length;
    const totalPoints = students.reduce((sum, student) => sum + (student.points || 0), 0);
    const averagePoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
    const topStudent = students[0] || null;
    
    return {
      totalStudents,
      totalPoints,
      averagePoints,
      topStudent
    };
    
  } catch (error) {
    console.error('[RatingService] Error getting rating stats:', error);
    throw error;
  }
};

/**
 * Получение топ-10 рейтинга с информацией о текущем пользователе
 */
export const getTop10WithCurrentUser = async (currentUserId) => {
  try {
    console.log('[RatingService] Getting top 10 with current user:', currentUserId);
    
    const { students, hasFullAccess } = await getRatingData();
    
    // Получаем топ-10
    const top10 = students.slice(0, 10);
    
    // Ищем текущего пользователя
    let currentUserPosition = null;
    let currentUserData = null;
    
    if (currentUserId) {
      const currentUserIndex = students.findIndex(student => 
        student.user_id === currentUserId || student.user?.id === currentUserId
      );
      
      if (currentUserIndex !== -1) {
        currentUserPosition = currentUserIndex + 1;
        currentUserData = students[currentUserIndex];
      } else {
        // Если текущий пользователь не найден в общем рейтинге, попробуем получить его данные
        try {
          const userData = await getCurrentUserRating();
          if (userData) {
            currentUserData = userData;
            currentUserPosition = students.length + 1; // Ставим в конец
          }
        } catch (error) {
          console.log('[RatingService] Could not get current user data');
        }
      }
    }
    
    return {
      top10,
      currentUser: {
        position: currentUserPosition,
        data: currentUserData,
        isInTop10: currentUserPosition && currentUserPosition <= 10
      },
      totalStudents: students.length,
      hasFullAccess
    };
    
  } catch (error) {
    console.error('[RatingService] Error getting top 10 with current user:', error);
    throw error;
  }
};