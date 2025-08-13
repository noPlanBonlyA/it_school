# Исправление навигации "Вернуться к курсам" для разных ролей

## Проблема
При нажатии кнопки "Вернуться к курсам" супер-администраторы переходили на страницу студентов (`/courses`) вместо страницы управления курсами (`/manage-courses`).

## Решение

### 1. Создана утилита навигации (`navigationUtils.js`)

```javascript
// src/utils/navigationUtils.js

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
```

### 2. Обновленные компоненты

#### ✅ ManageLessonsPage.jsx
- **Старый код навигации**: `onClick={() => navigate('/teacher-courses')}`
- **Новый код навигации**: `onClick={() => navigate(getCoursesPath(user.role))}`
- **Старый код сайдбара**: `activeItem="teacherCourses"`
- **Новый код сайдбара**: `activeItem={getSidebarActiveItem(user.role)}`
- **Результат**: Супер-админы возвращаются к `/manage-courses` с правильным выделением

#### ✅ CourseDetailPage.jsx
- **Старый код навигации**: `onClick={() => navigate('/courses')}`
- **Новый код навигации**: `onClick={() => navigate(getCoursesPath(user.role))}`
- **Старый код сайдбара**: `activeItem="courses"`
- **Новый код сайдбара**: `activeItem={getSidebarActiveItem(user.role)}`
- **Результат**: Каждая роль возвращается к своей странице курсов с правильным выделением

#### ✅ StudentCoursePage.jsx
- **Старый код навигации**: `onClick={() => navigate('/courses')}`
- **Новый код навигации**: `onClick={() => navigate(getCoursesPath(user.role))}`
- **Старый код сайдбара**: `activeItem="studentCourses"`
- **Новый код сайдбара**: `activeItem={getSidebarActiveItem(user.role)}`
- **Результат**: Универсальная навигация для всех ролей с правильным выделением в сайдбаре

### 3. Правильная маршрутизация по ролям

| Роль | Страница курсов | Путь | Описание |
|------|----------------|------|----------|
| **Student** | `StudentCoursesPage` | `/courses` | Мои курсы (студент) |
| **Teacher** | `TeacherCoursesPage` | `/teacher-courses` | Мои курсы (преподаватель) |
| **Admin/SuperAdmin** | `ManageCoursePage` | `/manage-courses` | Управление курсами |

## Тестирование

### Для супер-администратора:
1. Перейти в `/manage-courses`
2. Открыть любой курс
3. Нажать "Вернуться к управлению курсами"
4. ✅ Должен вернуться к `/manage-courses`

### Для преподавателя:
1. Перейти в `/teacher-courses`
2. Открыть любой курс
3. Нажать "Вернуться к курсам"
4. ✅ Должен вернуться к `/teacher-courses`

### Для студента:
1. Перейти в `/courses`
2. Открыть любой курс
3. Нажать "Вернуться к курсам"
4. ✅ Должен вернуться к `/courses`

## Преимущества

1. **Логичная навигация** - каждая роль возвращается к своей странице
2. **Правильное выделение в сайдбаре** - активный пункт меню соответствует роли
3. **Универсальность** - одни функции для всех компонентов  
4. **Масштабируемость** - легко добавить новые роли
5. **Читаемость** - понятный код с явным указанием логики

## Функции утилиты

### `getSidebarActiveItem(userRole)`
Определяет правильный activeItem для сайдбара:
- **admin/superadmin** → `'manageCourses'`
- **teacher** → `'teacherCourses'` 
- **student** → `'studentCourses'`

Эта функция добавлена в каждый компонент для правильного выделения активного пункта в сайдбаре.

## Импорты в компонентах

Во все обновленные компоненты добавлен импорт:
```javascript
import { getCoursesPath, getCoursesTitle } from '../utils/navigationUtils';
```
