// src/utils/pageUtils.js
import { useLocation } from 'react-router-dom';

/**
 * Получение названий страниц по роли пользователя
 */
export const getPageTitles = (userRole) => {
  const baseTitles = {
    home: 'Главная',
    profile: 'Профиль',
    schedule: 'Расписание',
    rating: 'Рейтинг',
    shop: 'Магазин',
    news: 'Новости',
    broadcast: 'Уведомления',
    groups: 'Группы',
    homework: 'Домашние задания',
    'manage-users': 'Студенты',
    'manage-teachers': 'Преподаватели', 
    'manage-admins': 'Администраторы',
    'manage-courses': 'Курсы',
    'manage-products': 'Товары',
    courses: 'Мои курсы',
    'teacher-courses': 'Мои курсы',
    'student-courses': 'Мои курсы',
    impersonate: 'Магия'
  };

  // Дополнительные названия для разных ролей
  const roleTitles = {
    student: {
      courses: 'Мои курсы',
      homework: 'Задания'
    },
    teacher: {
      'teacher-courses': 'Мои курсы',
      homework: 'Проверка заданий'
    },
    admin: {
      ...baseTitles
    },
    superadmin: {
      ...baseTitles
    }
  };

  return { ...baseTitles, ...roleTitles[userRole] };
};

/**
 * Получение названия страницы по текущему пути
 */
export const getPageTitle = (pathname, userRole) => {
  const titles = getPageTitles(userRole);
  
  // Убираем начальный слеш и получаем первую часть пути
  const cleanPath = pathname.replace(/^\/+/, '');
  const pathParts = cleanPath.split('/');
  const basePath = pathParts[0];
  
  // Специальные случаи для динамических маршрутов
  if (pathname.includes('/courses/') && pathname.includes('/student')) {
    return 'Курс';
  }
  
  if (pathname.includes('/courses/') && pathname.includes('/teacher')) {
    return 'Курс';
  }
  
  if (pathname.includes('/courses/') && pathname.includes('/lessons/')) {
    return 'Урок';
  }
  
  if (basePath === 'courses' && pathParts.length > 1) {
    return 'Курс';
  }

  // Возвращаем название по базовому пути или дефолтное
  return titles[basePath] || titles[cleanPath] || 'Страница';
};

/**
 * Хук для получения названия текущей страницы
 */
export const usePageTitle = (userRole) => {
  const location = useLocation();
  return getPageTitle(location.pathname, userRole);
};
