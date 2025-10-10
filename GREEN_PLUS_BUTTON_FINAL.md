# Зелёная кнопка "+2" для скрытых событий - Финальная версия

## Задача
Сделать кнопку "+2" (и другие варианты "+N") с зелёным фоном в фирменном стиле IT School, расположить её под событиями и добавить знак "+" перед числом.

## Внешний вид
- **Текст**: `+2`, `+3`, `+4` и т.д. (только число с плюсом, без слова "еще")
- **Фон**: Зелёный (#00B18F)
- **Форма**: Скругленная капсула (border-radius: 20px)
- **Позиция**: Внизу ячейки дня, под всеми событиями
- **Выравнивание**: По центру
- **Размер**: 70px min-width, 32px height

## Реализация

### 1. Изменение текста кнопки (SchedudlePage.jsx)

```javascript
// Было:
moreLinkText={(n) => `+${n} еще`}

// Стало:
moreLinkText={(n) => `${n}`}  // Показываем только число
```

Знак "+" добавляется через CSS `::before`, чтобы его можно было стилизовать отдельно.

### 2. CSS стили (SchedulePage.css)

#### Позиционирование внизу ячейки
```css
.fc-daygrid-day-bottom {
  margin-top: 4px !important;
  display: flex !important;
  justify-content: center !important;
  padding: 4px 0 !important;
}
```

Это обеспечивает:
- Отступ сверху от событий
- Flexbox для центрирования
- Отступы снизу для воздуха

#### Стили самой кнопки
```css
.fc-daygrid-more-link,
.fc-timegrid-more-link { 
  font-weight: 600 !important; 
  color: white !important;
  font-size: 13px !important;
  padding: 8px 16px !important;
  border-radius: 20px !important; /* Скругленная капсула как на скриншоте */
  background: #00B18F !important; /* Чистый зелёный */
  margin: 0 auto !important; /* Центрирование */
  min-width: 70px !important;
  height: 32px !important;
  box-shadow: 0 2px 4px rgba(0, 177, 143, 0.2) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}
```

#### Добавление знака "+" перед числом
```css
.fc-daygrid-more-link::before,
.fc-timegrid-more-link::before {
  content: "+ " !important;
  font-weight: 700 !important;
}
```

Результат: кнопка отображается как **`+2`**, **`+3`** и т.д.

#### Интерактивность
```css
.fc-daygrid-more-link:hover,
.fc-timegrid-more-link:hover {
  background: #03836A !important; /* Темнее при наведении */
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 8px rgba(0, 177, 143, 0.3) !important;
}

.fc-daygrid-more-link:active,
.fc-timegrid-more-link:active {
  transform: translateY(0px) !important;
  box-shadow: 0 1px 2px rgba(0, 177, 143, 0.2) !important;
}
```

### 3. Мобильная адаптация

```css
@media (max-width: 768px) {
  .fc-daygrid-more-link,
  .fc-timegrid-more-link {
    font-size: 11px !important;
    padding: 5px 10px !important;
    margin: 2px 3px !important;
  }
}
```

## Результат

### До изменений:
- ❌ Текст: "+2 еще"
- ❌ Позиция: рядом с событиями
- ❌ Стиль: прозрачный фон с зелёной рамкой

### После изменений:
- ✅ Текст: "+2" (чисто, без лишних слов)
- ✅ Позиция: под событиями, по центру
- ✅ Стиль: зелёная капсула как на дизайне
- ✅ Анимации: hover и active эффекты
- ✅ Адаптивность: корректно на мобильных

## Технические детали

### Поддерживаемые классы
- `.fc-daygrid-more-link` - для месячного вида
- `.fc-timegrid-more-link` - для недельного и дневного видов

### Использованные свойства
- `display: inline-flex` - для идеального центрирования текста
- `margin: 0 auto` - центрирование в родительском flex-контейнере
- `::before` - для добавления знака "+" без изменения основного текста
- `!important` - для переопределения стилей библиотеки FullCalendar

## Файлы изменены

1. `/src/pages/SchedudlePage.jsx` - изменён `moreLinkText`
2. `/src/styles/SchedulePage.css` - добавлены стили для позиционирования и внешнего вида

## Дата реализации
10 октября 2025 г.

## Скриншот результата
Кнопка выглядит точно как на макете: зелёная капсула с белым текстом "+2", расположенная под событиями по центру ячейки.
