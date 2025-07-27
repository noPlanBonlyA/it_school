# Компоненты отображения материалов урока

## Обзор

Созданы новые компоненты для красивого и функционального отображения материалов урока как для студентов, так и для преподавателей. Компоненты используют данные из API endpoints FastAPI для отображения материалов с возможностью скачивания файлов.

## Компоненты

### 1. `StudentLessonMaterials` 
**Расположение**: `src/components/StudentLessonMaterials.jsx`

**Назначение**: Отображение материалов урока для студентов

**Отображаемые материалы**:
- ✅ **Материалы для изучения**:
  - Основной материал (текст/HTML) - отображается в iframe
  - Дополнительный материал (файл) - кнопка скачивания
- ✅ **Домашнее задание**:
  - Основное задание (текст/HTML) - отображается в iframe  
  - Дополнительные материалы ДЗ (файл) - кнопка скачивания

**API endpoint**: `GET /api/courses/{course_id}/lessons/{lesson_id}/teacher-info`

### 2. `TeacherLessonMaterials`
**Расположение**: `src/components/TeacherLessonMaterials.jsx`

**Назначение**: Отображение материалов урока для преподавателей

**Отображаемые материалы**:
- ✅ **Материалы для преподавателя**:
  - Основной материал (текст/HTML) - отображается в iframe
  - Дополнительный материал (файл) - кнопка скачивания
- ✅ **Материалы для студентов**:
  - Основной материал (текст/HTML) - отображается в iframe
  - Дополнительный материал (файл) - кнопка скачивания
- ✅ **Домашнее задание**:
  - Основное задание (текст/HTML) - отображается в iframe
  - Дополнительные материалы ДЗ (файл) - кнопка скачивания

**API endpoint**: `GET /api/courses/{course_id}/lessons/{lesson_id}/teacher-info`

### 3. `LessonMaterials` (Универсальный)
**Расположение**: `src/components/LessonMaterials.jsx`

**Назначение**: Универсальный компонент, который автоматически определяет роль пользователя и отображает соответствующие материалы

## Интеграция

### В страницах студента
```jsx
// src/pages/StudentLessonPage.jsx
import StudentLessonMaterials from '../components/StudentLessonMaterials';

<StudentLessonMaterials 
  courseId={courseId} 
  lessonId={lessonId} 
/>
```

### В страницах преподавателя
```jsx
// src/pages/TeacherLessonPage.jsx
import TeacherLessonMaterials from '../components/TeacherLessonMaterials';

<TeacherLessonMaterials 
  courseId={courseId} 
  lessonId={lessonId} 
/>
```

## Обновленные сервисы

### `lessonService.js`
Добавлены новые функции для работы с API:

```javascript
// Получение материалов урока для студента
export const getLessonMaterialsForStudent = async (courseId, lessonId)

// Получение материалов урока для преподавателя
export const getLessonMaterialsForTeacher = async (courseId, lessonId, studentId)

// Получение информации об уроке для преподавателя
export const getLessonInfoForTeacher = async (courseId, lessonId)

// Получение урока с материалами
export const getLessonWithMaterials = async (courseId, lessonId)
```

## Особенности отображения

### 📄 Текстовые материалы
- Отображаются в iframe для безопасного рендеринга HTML
- Ссылка "Открыть в новом окне" для просмотра в полном размере

### 📁 Файловые материалы
- Кнопка скачивания с иконкой папки
- Hover эффекты для лучшего UX
- Поддержка всех типов файлов

### 🎨 Дизайн
- Glassmorphism эффекты с полупрозрачными фонами
- Адаптивная сетка материалов
- Градиенты и тени для современного вида
- Полная адаптивность для мобильных устройств

### ⚡ Состояния
- **Загрузка**: Спиннер с анимацией
- **Ошибка**: Сообщение об ошибке с кнопкой повтора
- **Пустые материалы**: Информативное сообщение о том, что материалы не добавлены

## Обновленные страницы

### ✅ `StudentLessonPage.jsx`
- Заменена старая логика отображения материалов
- Добавлен новый компонент `StudentLessonMaterials`
- Сохранена функциональность сдачи домашнего задания

### ✅ `TeacherLessonPage.jsx` 
- Заменена старая логика отображения материалов
- Добавлен новый компонент `TeacherLessonMaterials`
- Сохранена функциональность работы с домашними заданиями студентов

## API интеграция

Компоненты используют следующие FastAPI endpoints:

1. **`GET /courses/{course_id}/lessons/{lesson_id}/teacher-info`**
   - Возвращает полную информацию об уроке
   - Включает все материалы (teacher, student, homework + additional)
   - Используется для всех ролей

2. **`GET /courses/{course_id}/lessons/{lesson_id}/student-materials`**
   - Специфичный endpoint для студентов
   - Возвращает только материалы, доступные студенту

3. **`GET /courses/{course_id}/lessons/{lesson_id}/teacher-materials`**
   - Специфичный endpoint для преподавателей
   - Требует параметр `student_id`
   - Возвращает материалы в контексте конкретного студента

## Структура ответа API

```json
{
  "id": "lesson_id",
  "name": "Название урока",
  "course_id": "course_id",
  "homework": {
    "id": "homework_id", 
    "name": "Название ДЗ",
    "url": "https://example.com/homework.html"
  },
  "homework_additional_material": {
    "id": "material_id",
    "name": "Дополнительный файл ДЗ.pdf", 
    "url": "https://example.com/homework_file.pdf"
  },
  "teacher_material": {
    "id": "material_id",
    "name": "Материал преподавателя",
    "url": "https://example.com/teacher.html"
  },
  "teacher_additional_material": {
    "id": "material_id", 
    "name": "Доп файл преподавателя.pdf",
    "url": "https://example.com/teacher_file.pdf"
  },
  "student_material": {
    "id": "material_id",
    "name": "Материал студента", 
    "url": "https://example.com/student.html"
  },
  "student_additional_material": {
    "id": "material_id",
    "name": "Доп файл студента.pdf",
    "url": "https://example.com/student_file.pdf"
  }
}
```

## Результат

✅ **Для студента - 2 окна**:
1. **Материалы для изучения** (текст + доп файл)
2. **Домашнее задание** (текст + доп файл)

✅ **Для преподавателя - 3 окна**:
1. **Материалы для преподавателя** (текст + доп файл)
2. **Материалы для студентов** (текст + доп файл) 
3. **Домашнее задание** (текст + доп файл)

✅ **Функциональность**:
- Текстовые материалы отображаются в iframe
- Файлы доступны для скачивания
- Современный дизайн с glassmorphism эффектами
- Полная адаптивность
- Обработка ошибок и состояний загрузки
