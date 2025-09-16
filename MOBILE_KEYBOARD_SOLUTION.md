# Решение проблемы с мобильной клавиатурой и выпадающими списками

## Проблема
На мобильных устройствах при нажатии на поля поиска появляется клавиатура, которая перекрывает выпадающие списки (suggestions), делая невозможным доступ к элементам списка.

## Решение

### 1. CSS исправления (`MobileKeyboardFix.css`)
- **Автоматическое позиционирование**: Suggestions автоматически перемещаются над клавиатурой
- **Адаптивная высота**: Списки адаптируются к доступному пространству
- **Улучшенная прокрутка**: Красивые скроллбары и плавные анимации

### 2. JavaScript хук (`useMobileKeyboard.js`)
- **Автоматическое определение клавиатуры**: Использует Visual Viewport API и resize events
- **Управление CSS переменными**: Устанавливает `--keyboard-height` для позиционирования
- **Классы состояния**: Добавляет `keyboard-visible`/`keyboard-hidden` для условных стилей

### 3. React компоненты
- **MobileSearchBox**: Улучшенное поле поиска с адаптацией к клавиатуре
- **MobileEnhancedSearch**: Готовая замена для стандартного поиска

## Интеграция

### Шаг 1: Подключение стилей
```jsx
import '../styles/MobileKeyboardFix.css';
```

### Шаг 2: Использование хука
```jsx
import { useMobileKeyboard } from '../hooks/useMobileKeyboard';

function MyPage() {
  // Просто добавьте эту строку в компонент
  useMobileKeyboard();
  
  // остальной код...
}
```

### Шаг 3: (Опционально) Замена стандартного поиска
```jsx
import MobileEnhancedSearch from '../components/MobileEnhancedSearch';

// Вместо стандартного поиска:
<div className="search-block">
  <input ... />
  {showSuggestions && <ul className="suggestions">...</ul>}
</div>

// Используйте:
<MobileEnhancedSearch
  search={search}
  setSearch={setSearch}
  filtered={filtered}
  showSuggestions={showSuggestions}
  setShowSuggestions={setShowSuggestions}
  onSelect={handleSelect}
  onViewDetails={handleViewDetails}
  placeholder="Поиск по логину или ФИО"
/>
```

## Автоматические улучшения

### Мобильные устройства (≤768px)
- **Фиксированное позиционирование** suggestions над клавиатурой
- **Увеличенные зоны касания** (минимум 44px)
- **Плавные анимации** появления/исчезновения
- **Автоматическая прокрутка** к активному полю

### Планшеты (769px-1024px)
- **Увеличенная высота** списков предложений
- **Адаптивное позиционирование**

### Accessibility
- **Поддержка высокого контраста**
- **Уменьшение анимаций** для чувствительных пользователей
- **Клавиатурная навигация**

## Техническая реализация

### CSS Переменные
```css
:root {
  --keyboard-height: 0px; /* Устанавливается JS */
  --suggestions-max-height: 200px;
  --mobile-suggestions-max-height: 150px;
}
```

### Состояния клавиатуры
```css
/* Когда клавиатура видна */
.keyboard-visible .suggestions {
  position: fixed;
  bottom: calc(var(--keyboard-height) + 10px);
  /* ... */
}

/* Когда клавиатура скрыта */
.keyboard-hidden .suggestions {
  position: absolute;
  top: calc(100% + 8px);
  /* ... */
}
```

### JavaScript обнаружение
```javascript
// Visual Viewport API (iOS Safari)
window.visualViewport.addEventListener('resize', () => {
  const keyboardHeight = window.innerHeight - viewport.height;
  updateKeyboardHeight(keyboardHeight);
});

// Резервный метод для других браузеров
window.addEventListener('resize', () => {
  const heightDifference = initialHeight - window.innerHeight;
  if (heightDifference > 150) {
    // Клавиатура появилась
  }
});
```

## Поддерживаемые браузеры
- ✅ iOS Safari 13+
- ✅ Chrome Mobile 80+
- ✅ Firefox Mobile 85+
- ✅ Samsung Internet 12+
- ✅ Edge Mobile 90+

## Уже интегрировано в:
- [x] ManageStudentsPage
- [x] ManageTeachersPage  
- [x] ManageAdminsPage
- [x] ManageCoursePage
- [x] ManageGroupPage

## Использование

Все страницы уже обновлены и автоматически используют новое решение. Никаких дополнительных действий не требуется!

### Проверка работы:
1. Откройте приложение на мобильном устройстве
2. Перейдите на любую страницу управления
3. Нажмите на поле поиска
4. Введите текст для поиска
5. Список предложений должен автоматически появиться над клавиатурой

## Отладка

### Проверка в DevTools:
```javascript
// Проверить состояние клавиатуры
console.log(document.body.classList.contains('keyboard-visible'));

// Проверить высоту клавиатуры
console.log(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height'));
```

### Консольные сообщения:
```
Keyboard detected: 336px
Keyboard hidden
```
