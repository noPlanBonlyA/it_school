# Кнопка "еще +2" - Финальная версия

## Задача
Реализовать кнопку для скрытых событий с текстом "еще +2" (вместо "++2"), расположенную под событиями с правильным позиционированием во всех видах календаря.

## Внешний вид
- **Текст**: `еще +2`, `еще +3`, `еще +4` и т.д.
- **Фон**: Зелёный (#00B18F)
- **Форма**: Скругленная капсула (border-radius: 20px)
- **Позиция**: 
  - В месячном виде: под событиями
  - В недельном/дневном виде: сдвинута вниз на 4px
- **Выравнивание**: По центру

## Реализация

### 1. Текст кнопки (SchedudlePage.jsx)

```javascript
moreLinkText={(n) => `еще +${n}`}
```

**Результат**: 
- `еще +2` - когда скрыто 2 события
- `еще +3` - когда скрыто 3 события
- И т.д.

### 2. CSS стили (SchedulePage.css)

#### Основные стили кнопки
```css
.fc-daygrid-more-link,
.fc-timegrid-more-link { 
  font-weight: 600 !important; 
  color: white !important;
  font-size: 13px !important;
  padding: 8px 16px !important;
  border-radius: 20px !important;
  background: #00B18F !important;
  margin: 0 auto !important;
  min-width: 90px !important; /* Увеличено для текста "еще +2" */
  height: 32px !important;
  box-shadow: 0 2px 4px rgba(0, 177, 143, 0.2) !important;
}
```

#### Позиционирование в месячном виде
```css
.fc-daygrid-day-bottom {
  margin-top: 4px !important;
  display: flex !important;
  justify-content: center !important;
  padding: 4px 0 !important;
}
```

#### Дополнительный сдвиг для недельного/дневного видов
```css
.fc-timegrid-more-link {
  position: relative !important;
  top: 4px !important; /* Сдвигаем вниз */
  margin-bottom: 4px !important;
}
```

#### Интерактивность
```css
.fc-daygrid-more-link:hover,
.fc-timegrid-more-link:hover {
  background: #03836A !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 8px rgba(0, 177, 143, 0.3) !important;
}

.fc-daygrid-more-link:active,
.fc-timegrid-more-link:active {
  transform: translateY(0px) !important;
  box-shadow: 0 1px 2px rgba(0, 177, 143, 0.2) !important;
}
```

## Исправленные проблемы

### Проблема 1: Двойной плюс "++2"
**Было**: 
- `moreLinkText={(n) => \`${n}\``
- CSS добавлял `::before { content: "+ " }`
- **Результат**: "++2"

**Решение**:
- `moreLinkText={(n) => \`еще +${n}\``
- Убран `::before` из CSS
- **Результат**: "еще +2" ✅

### Проблема 2: Позиционирование в недельном/дневном видах
**Было**: Кнопка слишком близко к событиям

**Решение**:
```css
.fc-timegrid-more-link {
  position: relative !important;
  top: 4px !important;
  margin-bottom: 4px !important;
}
```
**Результат**: Кнопка сдвинута вниз ✅

### Проблема 3: Ширина кнопки
**Было**: `min-width: 70px` - слишком узко для "еще +2"

**Решение**: `min-width: 90px` 

**Результат**: Текст помещается комфортно ✅

## Поддерживаемые виды

✅ **Месячный вид** (`dayGridMonth`) 
- Кнопка под событиями, по центру

✅ **Недельный вид** (`timeGridWeek`)
- Кнопка сдвинута вниз на 4px

✅ **Дневной вид** (`timeGridDay`)
- Кнопка сдвинута вниз на 4px

## Мобильная адаптация

```css
@media (max-width: 768px) {
  .fc-daygrid-more-link,
  .fc-timegrid-more-link {
    font-size: 11px !important;
    padding: 5px 10px !important;
    min-width: 80px !important;
  }
}
```

## Результат

### Текст кнопки
- ✅ "еще +2" (не "++2")
- ✅ "еще +3", "еще +4" и т.д.
- ✅ Без лишних символов

### Позиционирование
- ✅ Месячный вид: под событиями, по центру
- ✅ Недельный вид: сдвинута вниз на 4px
- ✅ Дневной вид: сдвинута вниз на 4px

### Стиль
- ✅ Зелёная капсула (#00B18F)
- ✅ Белый текст
- ✅ Скругленные края (20px)
- ✅ Плавные анимации

## Файлы изменены

1. `/src/pages/SchedudlePage.jsx` - изменён `moreLinkText` на `(n) => \`еще +${n}\``
2. `/src/styles/SchedulePage.css` - убран `::before`, добавлен сдвиг для timegrid, увеличена ширина

## Дата реализации
10 октября 2025 г.
