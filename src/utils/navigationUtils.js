// src/utils/navigationUtils.js

/**
 * Получение правильного пути к курсам в зависимости от роли пользователя
 * @param {string} userRole - роль пользователя
 * @returns {string} путь к странице курсов
 */
export const getCoursesPath = (userRole) => {
  switch (userRole) {
    case 'student':
      return '/courses';
    case 'teacher':
      return '/teacher-courses';
    case 'admin':
    case 'superadmin':
      return '/manage-courses';
    default:
      return '/courses';
  }
};

/**
 * Получение названия раздела курсов в зависимости от роли
 * @param {string} userRole - роль пользователя
 * @returns {string} название раздела
 */
export const getCoursesTitle = (userRole) => {
  switch (userRole) {
    case 'student':
      return 'курсам';
    case 'teacher':
      return 'курсам';
    case 'admin':
    case 'superadmin':
      return 'управлению курсами';
    default:
      return 'курсам';
  }
};
