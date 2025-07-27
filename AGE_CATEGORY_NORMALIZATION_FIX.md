# Исправление отображения возрастных категорий курсов

## Проблема
При отображении курсов некоторые старые курсы содержали возрастные категории в старом формате:
- `'All'` вместо `'Все возрасты'`
- `'SixPlus'` вместо `'5-7'`
- `'TwelvePlus'` вместо `'12-14'`

Это приводило к некорректному отображению возрастных категорий в интерфейсе.

## Решение

### 1. Добавлена функция нормализации в `courseService.js`
```javascript
/**
 * Нормализует возрастные категории, преобразуя старые значения в новые
 */
function normalizeAgeCategory(ageCategory) {
  if (Array.isArray(ageCategory)) {
    return ageCategory.map(category => {
      if (category === 'All') return 'Все возрасты';
      if (category === 'SixPlus') return '5-7';
      if (category === 'TwelvePlus') return '12-14';
      return category;
    });
  } else {
    if (ageCategory === 'All') return 'Все возрасты';
    if (ageCategory === 'SixPlus') return '5-7';
    if (ageCategory === 'TwelvePlus') return '12-14';
    return ageCategory;
  }
}
```

### 2. Обновлены API функции
- ✅ `getAllCourses()` - нормализует все курсы для админов
- ✅ `getAllCoursesFiltered()` - нормализует курсы для студентов
- ✅ `getCourse()` - нормализует один курс

### 3. Обновлен компонент `CourseCard.jsx`
```javascript
// Обрабатываем age_category как массив или строку
let ageCategory;

if (Array.isArray(course.age_category)) {
  // Если массив, обрабатываем каждый элемент
  ageCategory = course.age_category.map(cat => {
    // Маппинг старых значений
    if (cat === 'All') return 'Все возрасты';
    if (cat === 'SixPlus') return '5-7';
    if (cat === 'TwelvePlus') return '12-14';
    return cat;
  }).join(', ');
} else {
  // Если строка, также обрабатываем старые значения
  if (course.age_category === 'All') {
    ageCategory = 'Все возрасты';
  } else if (course.age_category === 'SixPlus') {
    ageCategory = '5-7';
  } else if (course.age_category === 'TwelvePlus') {
    ageCategory = '12-14';
  } else {
    ageCategory = course.age_category;
  }
}
```

### 4. Проверена обработка в `ManageCourse.jsx`
Уже существовала правильная обработка в функции `handleSelect`:
```javascript
// Маппинг старых значений на новые
let mappedAgeCategory = ageCategory;
if (ageCategory === 'All') mappedAgeCategory = 'Все возрасты';
else if (ageCategory === 'SixPlus') mappedAgeCategory = '5-7';
else if (ageCategory === 'TwelvePlus') mappedAgeCategory = '12-14';
```

## Результат

Теперь все курсы с возрастной категорией `'All'` корректно отображаются как `'Все возрасты'` во всех частях приложения:

- ✅ В списке курсов для админов
- ✅ В списке курсов для студентов  
- ✅ В карточках курсов
- ✅ При редактировании курсов
- ✅ В детальном просмотре курса

## Совместимость

Исправление полностью обратно совместимо:
- Старые курсы с категориями `'All'`, `'SixPlus'`, `'TwelvePlus'` отображаются корректно
- Новые курсы с правильными категориями продолжают работать как прежде
- Фильтрация по возрасту учитывает все варианты названий категорий
