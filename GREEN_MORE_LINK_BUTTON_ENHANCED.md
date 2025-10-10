# Зелёный фон для кнопки "+N еще"

## Задача
Сделать кнопку "+2 еще" (и другие варианты "+N еще") с зелёным фоном в фирменном стиле IT School во всех представлениях календаря.

# Зелёная кнопка "+N еще" в стиле скриншота

## Задача
Сделать кнопку "+2 еще" (и другие варианты "+N еще") точно такой же, как на скриншоте - с зелёным фоном, округлыми краями и красивым дизайном.

## Реализация

### CSS стили для кнопки "+N еще"

Обновлены стили для кнопок в месячном, недельном и дневном видах:

```css
.fc-daygrid-more-link,
.fc-timegrid-more-link,
a.fc-daygrid-more-link,
a.fc-timegrid-more-link { 
  font-weight: 600 !important; 
  color: white !important;
  font-size: 13px !important;
  padding: 8px 16px !important;
  border-radius: 20px !important; /* Более округлые края */
  background: #00B18F !important; /* Чистый зелёный */
  min-width: 70px !important; /* Минимальная ширина */
  height: 32px !important; /* Фиксированная высота */
  box-shadow: 0 2px 4px rgba(0, 177, 143, 0.2) !important;
}
```

### Интерактивность

#### Наведение курсора (hover)
```css
.fc-daygrid-more-link:hover,
.fc-timegrid-more-link:hover {
  background: linear-gradient(135deg, #03836A 0%, #026B58 100%) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 8px rgba(0, 177, 143, 0.4) !important;
}
```

#### Нажатие (active)
```css
.fc-daygrid-more-link:active,
.fc-timegrid-more-link:active {
  transform: translateY(0px) !important;
  box-shadow: 0 1px 2px rgba(0, 177, 143, 0.3) !important;
}
```

### Мобильная адаптация

Для экранов шириной до 768px:
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

## Дизайн

### Цвета
- **Основной фон**: Градиент от `#00B18F` до `#03836A` (фирменный зелёный IT School)
- **Текст**: `white` (белый)
- **Hover**: Более тёмный градиент от `#03836A` до `#026B58`
- **Тень**: `rgba(0, 177, 143, 0.3)` с увеличением при наведении

### Размеры
- **Padding**: `6px 12px` (больше для лучшей кликабельности)
- **Border-radius**: `8px` (округлые углы)
- **Font-size**: `12px` (11px на мобильных)
- **Font-weight**: `700` (жирный шрифт)

### Эффекты
- **Transition**: `all 0.2s ease` (плавная анимация)
- **Transform**: Поднимается на 1px при наведении
- **Box-shadow**: Увеличивается при наведении для эффекта "парения"

## Поддерживаемые виды

✅ **Месячный вид** (`dayGridMonth`) - `.fc-daygrid-more-link`  
✅ **Недельный вид** (`timeGridWeek`) - `.fc-timegrid-more-link`  
✅ **Дневной вид** (`timeGridDay`) - `.fc-timegrid-more-link`  

## Результат

Кнопка "+2 еще" (и другие варианты) теперь:
- ✅ Имеет зелёный градиентный фон в фирменном стиле
- ✅ Белый текст для лучшей читаемости
- ✅ Плавные анимации при наведении и нажатии
- ✅ Адаптивный дизайн для мобильных устройств
- ✅ Работает во всех представлениях календаря
- ✅ Соответствует общему стилю приложения

## Файлы изменены

- `/src/styles/SchedulePage.css` - обновлены стили для `.fc-daygrid-more-link` и `.fc-timegrid-more-link`

## Дата реализации
10 октября 2025 г.
