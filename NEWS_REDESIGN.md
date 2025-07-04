# Редизайн новостей на главной странице

## Изменения в отображении новостей

### Новый дизайн карточек новостей:
- **Вертикальная структура**: Изображение сверху, название и дата снизу
- **Красивые карточки**: Полупрозрачные карточки с glassmorphism эффектом
- **Разворачивание**: Клик по новости разворачивает описание прямо в карточке
- **Анимации**: Плавные переходы при наведении и разворачивании

### Функциональность:
1. **Изображения**: Полноразмерные изображения (150px высота) или иконка по умолчанию
2. **Закрепленные новости**: Выделяются золотой рамкой
3. **Разворачивание**: Клик показывает/скрывает описание с анимацией
4. **Прокрутка**: Карточка новостей имеет собственную прокрутку
5. **Даты**: Форматированные даты на русском языке

### Технические изменения:

#### HomePage.jsx:
- Добавлено состояние `expandedNews` для отслеживания развернутых новостей
- Функция `toggleNewsExpansion()` для управления состоянием
- Обновлена структура JSX для новостей с изображениями и описаниями

#### HomePage.css:
- Новые стили для `.news-row` - вертикальная структура
- Анимации для разворачивания через `max-height` и `opacity`
- Красивый скроллбар для карточки новостей
- Стили для дат и кнопок разворачивания

### Структура новой карточки новости:
```jsx
<div className="news-row">
  <img className="news-thumb" /> // Изображение 
  <div className="news-content">
    <h4 className="news-title">Заголовок</h4>
    <div className="news-date">Дата</div>
    <div className="news-description">Описание (разворачивается)</div>
    <div className="news-expand-btn">▼ Подробнее</div>
  </div>
</div>
```

### Стили:
- **Карточки**: `rgba(255, 255, 255, 0.2)` фон с размытием
- **Анимации**: `transition: all 0.3s ease`
- **Hover эффекты**: Поднятие карточки и изменение тени
- **Закрепленные**: Золотая рамка `#ffc107`

### Результат:
- ✅ Красивые вертикальные карточки новостей
- ✅ Изображения отображаются полноразмерно
- ✅ Описания разворачиваются при клике
- ✅ Плавные анимации и переходы
- ✅ Адаптивный дизайн сохранен
- ✅ Прокрутка работает корректно
