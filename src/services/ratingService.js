import api from '../api/axiosInstance';

/**
 * Получение всех студентов для рейтинга
 */
export const getAllStudents = async () => {
  try {
    console.log('[RatingService] Getting all students for rating...');
    
    const response = await api.get('/students/', {
      params: { 
        limit: 100, 
        offset: 0 
      }
    });
    
    console.log('[RatingService] Students response:', response.data);
    
    // Обрабатываем ответ
    let students = [];
    if (response.data.objects) {
      students = response.data.objects;
    } else if (Array.isArray(response.data)) {
      students = response.data;
    }
    
    // Убеждаемся что у всех есть points и user данные
    const studentsWithPoints = students.map(student => ({
      ...student,
      points: student.points || 0,
      user: student.user || {}
    }));
    
    console.log('[RatingService] Students with points:', studentsWithPoints);
    return studentsWithPoints;
    
  } catch (error) {
    console.error('[RatingService] Error getting students:', error);
    
    // Fallback на демо данные при ошибке
    console.log('[RatingService] Using fallback demo data');
    return getMockStudents();
  }
};

/**
 * Получение данных текущего студента
 */
export const getCurrentUserRating = async () => {
  try {
    console.log('[RatingService] Getting current user student data...');
    
    const response = await api.get('/students/me');
    
    console.log('[RatingService] Current user student data:', response.data);
    return {
      ...response.data,
      points: response.data.points || 0
    };
    
  } catch (error) {
    console.error('[RatingService] Error getting current user data:', error);
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
    
    // Сортируем по монетам и берем топ
    const topStudents = allStudents
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, limit);
    
    return topStudents;
    
  } catch (error) {
    console.error('[RatingService] Error getting top students:', error);
    throw error;
  }
};