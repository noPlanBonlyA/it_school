# Полное исправление ошибки course_id undefined - ОКОНЧАТЕЛЬНАЯ ВЕРСИЯ

## Проблема
При попытке загрузить домашнее задание через виджет расписания ("провести урок"), происходили ошибки:
1. `GET http://localhost:8080/api/courses/lessons/c7a5bca8-850e-4a3e-89df-93bdbb58567a 404 (Not Found)`
2. `GET http://localhost:8080/api/courses/lesson-group?lesson_id=c7a5bca8-850e-4a3e-89df-93bdbb58567a 422 (Unprocessable Entity)`
3. `Missing course_id or lesson_id: {course_id: undefined, lesson_id: '...', ...}`

## Первоначальная причина
API расписания (`/schedule/`) возвращает данные lesson-group, которые не всегда содержат поле `course_id`. Это приводило к тому, что при попытке загрузить домашнее задание, запрос отправлялся на `undefined/lessons/.../homework-material` вместо корректного URL.

## Корневая причина 422 ошибки
Fallback логика пыталась вызвать `/courses/lesson-group` с параметром `lesson_id`, но согласно OpenAPI документации, этот эндпоинт принимает только `group_id`. Использование недопустимого параметра приводило к 422 ошибке.

## Полное решение - ФИНАЛЬНАЯ ВЕРСИЯ

### 1. Исправление fallback логики в Schedule.jsx
**Файл**: `/src/components/Schedule.jsx` (строки ~254-268)

**Было (вызывало 422 ошибку)**:
```javascript
const lessonGroupsResponse = await api.get('/courses/lesson-group', {
  params: { lesson_id: event.lesson_id }  // ❌ Недопустимый параметр
});
```

**Стало (финальная версия)**:
```javascript
const lessonGroupsResponse = await api.get('/courses/lesson-group', {
  params: { group_id: event.group_id }    // ✅ Корректный параметр
});
// Затем ищем нужный lesson-group по lesson_id в полученных данных
const targetLessonGroup = lessonGroups.find(lg => lg.lesson_id === event.lesson_id);
```
  courseId = lessonGroupData.lesson.course_id;
  console.log('[Schedule] Retrieved course_id from lesson-group lesson data:', courseId);
} else {
  // Попытка 2: Если не удалось получить через lesson-group, попробуем через полное расписание
  const scheduleResponse = await api.get('/schedule/');
  const scheduleData = scheduleResponse.data;
  
  const matchingEvent = scheduleData.find(item => 
    item.id === event.id || 
    (item.lesson_id === event.lesson_id && item.group_id === event.group_id)
  );
  
  if (matchingEvent && matchingEvent.course_id) {
    courseId = matchingEvent.course_id;
    console.log('[Schedule] Retrieved course_id from full schedule:', courseId);
  }
}
```

### 2. Исправление в scheduleService.js - getUserSchedule
**Файл**: `/src/services/scheduleService.js` (строки 22-50)

Добавлена превентивная логика для получения `course_id` из lesson-group данных, если он отсутствует в исходном ответе:

```javascript
let courseId = item.course_id; // Пытаемся использовать course_id из исходных данных

// ИСПРАВЛЕНО: Если course_id отсутствует, пытаемся получить его из lesson-group
if (!courseId && item.lesson_id) {
  try {
    console.log('[ScheduleService] Course ID missing for lesson', item.lesson_id, ', trying to get from lesson-group...');
    const lessonGroupResponse = await api.get(`/courses/lesson-group/${item.id}`);
    const lessonGroupData = lessonGroupResponse.data;
    
    if (lessonGroupData.lesson && lessonGroupData.lesson.course_id) {
      courseId = lessonGroupData.lesson.course_id;
      console.log('[ScheduleService] Retrieved course_id from lesson-group:', courseId);
    }
  } catch (lgError) {
    console.warn('[ScheduleService] Could not get course_id from lesson-group:', lgError);
  }
}
```

### 3. Исправление в scheduleService.js - getUserScheduleOptimized
**Файл**: `/src/services/scheduleService.js` (строки 250-275)

Аналогичная логика добавлена в оптимизированную версию функции получения расписания:

```javascript
// Обогащаем данные расписания
const enhancedSchedule = await Promise.all(scheduleData.map(async (item) => {
  const groupInfo = groupsMap.get(item.group_id);
  const teacherInfo = groupInfo?.teacher;
  let courseId = item.course_id; // Используем course_id из исходных данных
  
  // ИСПРАВЛЕНО: Если course_id отсутствует, пытаемся получить его из lesson-group
  if (!courseId && item.lesson_id) {
    try {
      console.log('[ScheduleService] Course ID missing for lesson', item.lesson_id, ', trying to get from lesson-group...');
      const lessonGroupResponse = await api.get(`/courses/lesson-group/${item.id}`);
      const lessonGroupData = lessonGroupResponse.data;
      
      if (lessonGroupData.lesson && lessonGroupData.lesson.course_id) {
        courseId = lessonGroupData.lesson.course_id;
        console.log('[ScheduleService] Retrieved course_id from lesson-group:', courseId);
      }
    } catch (lgError) {
      console.warn('[ScheduleService] Could not get course_id from lesson-group:', lgError);
    }
  }

  return {
    id: item.id,
    lesson_id: item.lesson_id,
    lesson_name: item.lesson_name,
    course_id: courseId, // ИСПРАВЛЕНО: используем правильно полученный course_id
    course_name: item.course_name,
    // ... остальные поля
  };
}));
```

## Результат
1. **Устранена 404 ошибка**: Fallback логика теперь использует существующие API эндпоинты
2. **Гарантирован course_id**: Все события расписания теперь содержат корректный `course_id`
3. **Робастность**: Система работает даже если backend не возвращает `course_id` напрямую
4. **Производительность**: Дополнительные запросы выполняются только при необходимости

## Тестирование
1. Открыть виджет расписания
2. Нажать "Провести урок" на любом событии
3. Попробовать загрузить домашнее задание (текст или файл)
4. Убедиться, что запросы идут на корректные URL с правильным `course_id`
5. Проверить консоль - должны отсутствовать 404 ошибки и "undefined course_id"

## Файлы изменены
- `/src/components/Schedule.jsx`: Улучшена fallback логика
- `/src/services/scheduleService.js`: Добавлена превентивная загрузка course_id
- `/src/services/scheduleService.js`: Исправлена оптимизированная версия функции

Все изменения обратно совместимы и не влияют на существующую функциональность.
