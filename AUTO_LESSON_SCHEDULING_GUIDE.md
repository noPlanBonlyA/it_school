# Автоматическое добавление уроков в расписание групп

## Обзор функциональности

При создании нового урока в курсе система автоматически добавляет его в расписание всех групп, которые уже изучают этот курс. Это экономит время и гарантирует, что все группы получат новый урок в соответствии с их настройками расписания.

## 🚀 Как это работает

### 1. Пользователь создает новый урок
- В интерфейсе управления уроками (`ManageLessonsPage`)
- Через компонент `LessonEditor`
- По умолчанию включена опция "Автоматически добавить урок в расписание групп"

### 2. Система автоматически:
1. **Создает урок** через API
2. **Находит все группы**, которые изучают данный курс
3. **Для каждой группы**:
   - Загружает настройки расписания группы
   - Вычисляет дату и время нового урока
   - Создает запись в расписании (`lesson_group`)

### 3. Результат
- Урок создан и готов к использованию
- Автоматически добавлен в расписание всех связанных групп
- Пользователь получает отчет о результатах

## 📊 Логика определения даты урока

### Расчет позиции урока
```javascript
// Находим все существующие уроки этого курса в группе
const existingLessons = [...]; // lesson_groups этого курса

// Определяем порядковый номер нового урока
const lessonOrder = existingLessons.length; // 0, 1, 2, ...

// Находим базовую дату (дата первого урока курса в группе)
let baseDate = firstLessonDate || groupStartDate;
```

### Вычисление даты нового урока
```javascript
switch (scheduleSettings.interval) {
  case 'weekly':
    lessonDate = baseDate + (lessonOrder * 7 дней);
    break;
  case 'biweekly':  
    lessonDate = baseDate + (lessonOrder * 14 дней);
    break;
  case 'monthly':
    lessonDate = baseDate + (lessonOrder месяцев);
    break;
}
```

## 🎯 Ключевые компоненты

### LessonService (`lessonService.js`)
```javascript
// Создание урока с автоматическим расписанием
export const createLessonWithAutoSchedule = async (courseId, formData) => {
  // 1. Создаем урок
  const lesson = await createLessonWithMaterials(courseId, formData);
  
  // 2. Автоматически добавляем в группы
  const result = await autoAddLessonToAllCourseGroups(courseId, lesson.id);
  
  return { lesson, autoSchedule: result };
};
```

### GroupScheduleService (`groupScheduleService.js`)
```javascript
// Получение групп курса
export const getGroupsByCourse = async (courseId) => {
  // Находит все группы через lesson_groups
};

// Автоматическое добавление урока во все группы курса
export const autoAddLessonToAllCourseGroups = async (courseId, lessonId) => {
  // Добавляет урок в расписание каждой группы
};

// Добавление урока в конкретную группу
export const addLessonToGroupSchedule = async (groupId, courseId, lessonId, settings) => {
  // Вычисляет дату и создает lesson_group
};
```

### LessonEditor (`LessonEditor.jsx`)
```jsx
// Опция автоматического расписания
const [useAutoSchedule, setUseAutoSchedule] = useState(true);

// При создании урока
if (useAutoSchedule) {
  const result = await createLessonWithAutoSchedule(courseId, formData);
  // Показываем результат пользователю
}
```

## 🔧 API Endpoints

### Используемые эндпоинты
- `POST /courses/{courseId}/lessons-with-materials` - создание урока
- `GET /courses/{courseId}/lessons` - получение уроков курса
- `GET /courses/lesson-group` - получение всех lesson_groups
- `POST /courses/lesson-group` - создание lesson_group

### Структура lesson_group
```json
{
  "lesson_id": "uuid",
  "group_id": "uuid", 
  "start_datetime": "2025-07-23T18:00:00Z",
  "end_datetime": "2025-07-23T20:00:00Z",
  "is_opened": false,
  "auditorium": "Аудитория 101"
}
```

## 🎨 Пользовательский интерфейс

### В LessonEditor
```jsx
{!lesson && (
  <div className="form-section">
    <label className="checkbox-label">
      <input type="checkbox" checked={useAutoSchedule} />
      🗓️ Автоматически добавить урок в расписание групп
    </label>
    <div className="form-hint">
      {useAutoSchedule 
        ? "✅ Урок автоматически добавится в расписание всех групп курса" 
        : "⚠️ Урок создастся без автоматического добавления в расписание"
      }
    </div>
  </div>
)}
```

### Результат после создания
```javascript
if (result.autoSchedule.total > 0) {
  const message = `Урок создан!\n\n` +
    `Автоматически добавлен в расписание:\n` +
    `✅ Успешно: ${result.autoSchedule.success} групп(ы)\n` +
    `❌ Ошибки: ${result.autoSchedule.failed} групп(ы)\n` +
    `Всего групп: ${result.autoSchedule.total}`;
  alert(message);
}
```

## 📝 Настройки расписания группы

### Структура настроек
```javascript
class GroupScheduleSettings {
  dayOfWeek: number;     // 1=Monday, 2=Tuesday, ...
  startTime: string;     // "18:00"
  endTime: string;       // "20:00"  
  interval: string;      // "weekly", "biweekly", "monthly"
  startDate: string;     // "2025-07-23"
  auditorium: string;    // "Аудитория 101"
}
```

### Хранение настроек
- В localStorage: `group_schedule_{groupId}`
- Используются настройки по умолчанию если не заданы
- Настройки по умолчанию: понедельник 18:00-20:00, еженедельно

## ⚠️ Важные моменты

### 1. Обработка ошибок
- Если группа не найдена - пропускаем её
- Если нет настроек расписания - используем значения по умолчанию
- Все ошибки логируются и возвращаются в результате

### 2. Производительность
- Операции выполняются параллельно для всех групп
- Используется `Promise.all()` для ожидания результатов
- Подробное логирование для отладки

### 3. Обратная совместимость
- Старые функции (`createLessonWithMaterials`) продолжают работать
- Автоматическое расписание - опциональная функция
- При редактировании урока автоматическое расписание не используется

## 🧪 Тестирование

### Сценарий 1: Новый курс без групп
1. Создать курс
2. Добавить урок с автоматическим расписанием
3. Результат: урок создан, уведомление "курс не привязан к группам"

### Сценарий 2: Курс с одной группой
1. Создать курс и группу
2. Привязать курс к группе (создать lesson_group для существующих уроков)
3. Добавить новый урок
4. Результат: урок автоматически добавлен в расписание группы

### Сценарий 3: Курс с несколькими группами
1. Создать курс и несколько групп
2. Привязать курс ко всем группам
3. Добавить новый урок
4. Результат: урок добавлен в расписание всех групп

### Проверка результата
```javascript
// В браузере console
const result = await createLessonWithAutoSchedule(courseId, formData);
console.log('Автоматическое расписание:', result.autoSchedule);
```

## 🔮 Будущие улучшения

1. **Групповые настройки расписания** - хранение в базе данных
2. **Уведомления** - email/push уведомления о новых уроках
3. **Батчевые операции** - массовое добавление уроков
4. **Конфликты расписания** - проверка пересечений по времени
5. **История изменений** - логирование всех операций с расписанием
