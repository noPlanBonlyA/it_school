# Исправление ошибки undefined course_id

## Проблема
При попытке загрузить домашнее задание в компоненте Schedule возникала ошибка 422 с URL:
`http://localhost:8080/api/courses/undefined/lessons/.../homework-material`

Это происходило из-за того, что `course_id` был `undefined`.

## Причина
В функциях `getUserSchedule` и `getUserScheduleOptimized` в файле `scheduleService.js` отсутствовало поле `course_id` при формировании объектов событий расписания.

## Исправления

### 1. scheduleService.js
Добавлено поле `course_id` в обе функции:
- `getUserSchedule()` - строки 42 и 60
- `getUserScheduleOptimized()` - строка 245

```javascript
return {
  id: item.id,
  lesson_id: item.lesson_id,
  lesson_name: item.lesson_name,
  course_id: item.course_id, // ДОБАВЛЕНО
  course_name: item.course_name,
  // ... остальные поля
};
```

### 2. Schedule.jsx
Добавлены улучшения для отладки и резервный механизм:

#### Дополнительное логирование
- Логирование структуры получаемых событий
- Проверка наличия обязательных полей перед началом урока
- Подробное логирование в функции загрузки домашнего задания

#### Резервный механизм получения course_id
Если `course_id` отсутствует в событии, компонент пытается получить его через API урока:

```javascript
if (!courseId && event.lesson_id) {
  try {
    const lessonResponse = await api.get(`/courses/lessons/${event.lesson_id}`);
    courseId = lessonResponse.data.course_id;
  } catch (error) {
    console.error('[Schedule] Error getting course_id from lesson:', error);
  }
}
```

#### Улучшенная валидация
- Проверка наличия `course_id` и `lesson_id` перед загрузкой домашнего задания
- Информативные сообщения об ошибках
- Отображение ID курса и урока в заголовке модального окна для отладки

### 3. Дополнительные улучшения
- Подробное логирование endpoints для отладки
- Улучшенная обработка ошибок с конкретными сообщениями
- Валидация данных на каждом этапе

## Тестирование
После внесения изменений необходимо:

1. Перезагрузить приложение
2. Открыть расписание
3. Нажать "Провести урок" для любого занятия
4. Проверить, что в заголовке модального окна отображаются корректные ID курса и урока
5. Попробовать загрузить домашнее задание (текстовое или файл)
6. Проверить в консоли браузера, что endpoints формируются правильно

## Ожидаемый результат
URL запроса должен иметь вид:
`http://localhost:8080/api/courses/[реальный-uuid]/lessons/[реальный-uuid]/homework-material`

Вместо:
`http://localhost:8080/api/courses/undefined/lessons/[реальный-uuid]/homework-material`
