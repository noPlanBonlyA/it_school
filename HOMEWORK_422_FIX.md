# Исправление 422 ошибки при загрузке домашнего задания

## Проблема
При попытке загрузить домашнее задание через виджет расписания ("провести урок") возникала 422 ошибка:
```
Request URL: http://localhost:8080/api/courses/3cca0d88-cc80-4a39-a48c-9ff42643bc9c/lessons/c7a5bca8-850e-4a3e-89df-93bdbb58567a/homework-material-text
Request Method: POST
Status Code: 422 Unprocessable Entity
```

## Корневая причина
Несоответствие между форматом данных, отправляемых фронтендом, и ожидаемой схемой бэкенда.

### Бэкенд ожидает:

#### Для текстового задания (`/homework-material-text`):
```python
class LessonHTMLTextCreateSchema(CreateBaseModel, LessonHTMLBaseSchema):
    name: str
    html_text: str  # НЕ "content"
```

#### Для файлового задания (`/homework-material`):
```python
async def add_homework_material_file_to_lesson(
    homework_material_name: str = Form(...),  # НЕ "name"
    homework_material_file: UploadFile = File(...)  # НЕ "file"
):
```

### Фронтенд отправлял:

#### Для текстового задания:
```javascript
// НЕПРАВИЛЬНО
{
  name: "Название",
  content: "Текст"  // должно быть html_text
}
```

#### Для файлового задания:
```javascript
// НЕПРАВИЛЬНО
FormData:
- name: "Название"  // должно быть homework_material_name
- file: [файл]      // должно быть homework_material_file
```

## Исправления

### 1. Schedule.jsx - Текстовое задание
```javascript
// БЫЛО:
await api.post(textEndpoint, {
  name: homeworkData.name,
  content: homeworkData.textContent.trim()  // НЕПРАВИЛЬНО
});

// СТАЛО:
await api.post(textEndpoint, {
  name: homeworkData.name,
  html_text: homeworkData.textContent.trim()  // ПРАВИЛЬНО
});
```

### 2. Schedule.jsx - Файловое задание
```javascript
// БЫЛО:
const formData = new FormData();
formData.append('name', homeworkData.name);  // НЕПРАВИЛЬНО
formData.append('file', homeworkData.file);  // НЕПРАВИЛЬНО

// СТАЛО:
const formData = new FormData();
formData.append('homework_material_name', homeworkData.name);  // ПРАВИЛЬНО
formData.append('homework_material_file', homeworkData.file);  // ПРАВИЛЬНО
```

### 3. Обновлена документация
- HOMEWORK_UPLOAD_CHANGES.md исправлен с корректными именами полей
- Добавлен этот файл с подробным описанием исправления

## Проверка исправления

1. Откройте расписание
2. Нажмите "Провести урок" для любого занятия
3. В секции "Загрузить домашнее задание":
   - Введите название задания
   - Введите текст задания И/ИЛИ выберите файл
   - Нажмите "Загрузить ДЗ"
4. Проверьте, что:
   - Нет ошибок 422 в консоли разработчика
   - Показывается сообщение об успешной загрузке
   - Материалы действительно загружаются на бэкенд

## Влияние
- ✅ Исправлены 422 ошибки при загрузке домашних заданий
- ✅ Корректная работа с бэкенд API
- ✅ Обратная совместимость сохранена
- ✅ Не затронута другая функциональность

## Статус
✅ **ИСПРАВЛЕНО** - домашние задания теперь загружаются корректно без 422 ошибок.
