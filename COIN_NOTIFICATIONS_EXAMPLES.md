# Система уведомлений о монетах

## Автоматические уведомления

Теперь система автоматически отправляет уведомления студентам в следующих случаях:

### 1. При оценивании уроков преподавателем (Schedule.jsx)
- ✅ Начисление монет за посещение урока
- ✅ Начисление монет за домашнее задание
- ✅ Отправка уведомлений: "Вам начислено X монет за посещение урока! 🪙"

### 2. При оценивании через API (homeworkService.js)
- ✅ Начисление монет через updateLessonStudent
- ✅ Требует передачи student_profile_id в updateData

## Примеры использования новых функций

### Для автоматического создания истории с уведомлениями:

```javascript
import { createPointsHistoryWithNotification, POINT_REASONS } from '../services/coinHistoryService';

// Бонус за хорошее поведение
await createPointsHistoryWithNotification({
  user_id: studentUserId,
  reason: POINT_REASONS.BONUS,
  changed_points: 10,
  description: 'Бонус за активное участие в уроке'
}, studentProfileId);

// Штраф за нарушение
await createPointsHistoryWithNotification({
  user_id: studentUserId,
  reason: POINT_REASONS.PENALTY,
  changed_points: -5,
  description: 'Штраф за опоздание'
}, studentProfileId);

// Покупка в магазине
await createPointsHistoryWithNotification({
  user_id: studentUserId,
  reason: POINT_REASONS.BUY,
  changed_points: -20,
  description: 'Покупка: Дополнительная попытка теста'
}, studentProfileId);
```

### Для создания записей за урок с уведомлениями:

```javascript
import { createLessonCoinsHistory } from '../services/coinHistoryService';

// При выставлении оценок через Schedule.jsx (уже интегрировано)
await createLessonCoinsHistory(
  studentUserId,
  {
    coins_for_visit: 5,
    coins_for_homework: 10
  },
  {
    lesson_name: 'Основы программирования',
    course_name: 'JavaScript для начинающих'
  },
  studentProfileId // Для отправки уведомлений
);
```

## Какие уведомления приходят:

### Начисление монет:
- "Вам начислено 5 монет за посещение урока! 🪙"
- "Вам начислено 10 монет за домашнее задание! 🪙"
- "Вам начислено 15 монет за бонус! 🪙"

### Списание монет:
- "Вам начислено 5 монет за списание за штраф! 🪙"
- "Вам начислено 20 монет за списание за покупку! 🪙"

## Интеграция с существующими процессами:

### ✅ Schedule.jsx
- Автоматически создает историю и отправляет уведомления при сохранении оценок

### ✅ homeworkService.js  
- Поддерживает уведомления через параметр student_profile_id в updateData

### 🔄 Что можно добавить дополнительно:
- Интеграция с системой покупок в магазине
- Автоматические бонусы за достижения
- Штрафы за пропуски
- Уведомления родителям о начислениях/списаниях

## Структура данных для уведомлений:

```javascript
// В updateData для homeworkService.updateLessonStudent добавить:
{
  student_id: 'user_id_студента',
  student_profile_id: 'profile_id_студента', // Новое поле для уведомлений
  lesson_name: 'Название урока',
  course_name: 'Название курса',
  coins_for_visit: 5,
  coins_for_homework: 10,
  // ... остальные поля
}
```
