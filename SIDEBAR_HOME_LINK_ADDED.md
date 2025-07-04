# Добавление ссылки "Главная" в сайдбар

## Внесенные изменения

### 1. Обновление компонента Sidebar.jsx ✅

- **Добавлена иконка для главной страницы**: `homeIcon` (используется `sidebar_icon1.png`)
- **Ссылка "Главная" добавлена первой для всех ролей пользователей**

### 2. Конфигурация сайдбара по ролям

#### Студент (student)
```javascript
main = [
  { key: 'dashboard',      label: 'Главная',    icon: homeIcon },      // ← ДОБАВЛЕНО
  { key: 'schedule',       label: 'Расписание', icon: calendarIcon },
  { key: 'studentCourses', label: 'Мои курсы',  icon: coursesIcon },
  { key: 'rating',         label: 'Рейтинг',    icon: chartIcon },
  { key: 'shop',           label: 'Магазин',    icon: shopIcon },
  { key: 'settings',       label: 'Профиль',    icon: cogIcon }
];
```

#### Преподаватель (teacher)
```javascript
main = [
  { key: 'dashboard',      label: 'Главная',     icon: homeIcon },      // ← ДОБАВЛЕНО
  { key: 'settings',       label: 'Мой профиль', icon: cogIcon },
  { key: 'schedule',       label: 'Расписание',  icon: calendarIcon },
  { key: 'teacherCourses', label: 'Курсы',       icon: coursesIcon },
  { key: 'homework',       label: 'Дом. задания',icon: homeworkIcon }
];
```

#### Администратор (admin)
```javascript
main = [
  { key: 'dashboard',      label: 'Главная',      icon: homeIcon },      // ← ДОБАВЛЕНО
  { key: 'settings',       label: 'Профиль',      icon: cogIcon },
  { key: 'schedule',       label: 'Расписание',   icon: calendarIcon },
  { key: 'manageStudents', label: 'Студенты',     icon: usersIcon },
  { key: 'notifications',  label: 'Рассылка',     icon: broadcastIcon },
  { key: 'groups',         label: 'Группы',       icon: usersIcon },
  { key: 'manageTeachers', label: 'Преподаватели',icon: usersIcon },
  { key: 'news',           label: 'Новости',      icon: coursesIcon }
];
```

#### Суперадминистратор (superadmin)
```javascript
main = [
  { key: 'dashboard',       label: 'Главная',          icon: homeIcon },  // ← ДОБАВЛЕНО
  { key: 'settings',        label: 'Профиль',          icon: cogIcon },
  { key: 'schedule',        label: 'Расписание',       icon: calendarIcon },
  { key: 'manageStudents',  label: 'Студенты',         icon: usersIcon },
  { key: 'notifications',   label: 'Рассылка',         icon: broadcastIcon },
  { key: 'manageTeachers',  label: 'Преподаватели',    icon: usersIcon },
  { key: 'manageAdmins',    label: 'Администраторы',   icon: adminIcon },
  { key: 'moderateCourses', label: 'Модерация курсов', icon: moderationIcon },
  { key: 'groups',          label: 'Группы',           icon: usersIcon },
  { key: 'manageProducts',  label: 'Товары',           icon: shopIcon },
  { key: 'news',            label: 'Новости',          icon: coursesIcon }
];
```

## Маршрутизация

- **Ключ**: `dashboard`
- **Маршрут**: `/home`
- **Страница**: HomePage.jsx уже корректно использует `activeItem="dashboard"`

## Результат

Теперь все пользователи (студенты, преподаватели, администраторы и суперадминистраторы) имеют ссылку "Главная" первой в списке сайдбара, которая ведет на главную страницу приложения `/home`.

## Визуальные изменения

- ✅ Ссылка "Главная" добавлена первой для всех ролей
- ✅ Используется единообразная иконка для всех ролей 
- ✅ Сохранена существующая структура и порядок остальных ссылок
- ✅ Корректная подсветка активного элемента на главной странице
