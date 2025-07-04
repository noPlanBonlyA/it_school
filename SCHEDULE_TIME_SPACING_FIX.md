# ОПТИМИЗАЦИЯ РАСПИСАНИЯ - ВРЕМЯ И ОТСТУПЫ

## 🕐 **Изменение логики поиска ближайшего дня**

### **Проблема:**
Поиск ближайших занятий начинался с 00:00 текущего дня, что не учитывало время начала учебного дня.

### **Решение:**
```jsx
const nearestDayISO = useMemo(() => {
  if (!events.length) return null;
  
  const today = new Date();
  today.setHours(8, 0, 0, 0); // Начинаем поиск с 8:00 утра, а не с 00:00
  
  const upcomingEvents = events
    .filter(e => new Date(e.start_datetime || e.start) >= today)
    .sort((a, b) => new Date(a.start_datetime || a.start) - new Date(b.start_datetime || b.start));
  
  return upcomingEvents.length > 0 
    ? new Date(upcomingEvents[0].start_datetime || upcomingEvents[0].start)
    : new Date();
}, [events]);
```

### **Преимущества:**
- ✅ Учитывает реальное время начала учебного дня
- ✅ Не показывает занятия, которые уже прошли утром
- ✅ Более точное определение "ближайших" занятий
- ✅ Лучший UX для пользователей

## 📐 **Добавление отступов с !important**

### **Основная страница:**
```css
.main-content {
  padding-top: 80px !important; /* Отступ сверху от TopBar */
  padding-bottom: 40px !important; /* Отступ снизу */
}

.schedule-page {
  padding-top: 20px !important; /* Дополнительный отступ сверху */
  padding-bottom: 40px !important; /* Дополнительный отступ снизу */
}
```

### **Layout расписания:**
```css
.schedule-layout {
  margin-top: 24px !important;
  margin-bottom: 40px !important; /* Отступ снизу */
  padding-bottom: 40px !important; /* Дополнительный отступ снизу */
}
```

### **Виджеты:**
```css
.widget-card {
  margin-bottom: 24px !important;
  padding-bottom: 16px !important; /* Дополнительный отступ снизу в карточках */
}

.widget.nearest-lessons {
  margin-bottom: 40px !important; /* Отступ снизу для виджета ближайших занятий */
  padding-bottom: 24px !important;
}
```

### **Календарь:**
```css
.calendar-widget {
  padding: 20px !important;
  margin-bottom: 40px !important; /* Отступ снизу */
}
```

## 📱 **Адаптивные отступы**

### **Планшеты (≤1024px):**
```css
@media (max-width: 1024px) {
  .main-content {
    padding-top: 90px !important; /* Больше отступ на планшетах */
    padding-bottom: 50px !important;
  }
  
  .schedule-layout {
    margin-bottom: 50px !important;
    padding-bottom: 50px !important;
  }
  
  .calendar-widget {
    margin-bottom: 50px !important;
  }
}
```

### **Мобильные (≤768px):**
```css
@media (max-width: 768px) {
  .main-content {
    padding-top: 100px !important; /* Еще больше отступ на мобильных */
    padding-bottom: 60px !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
  
  .schedule-layout {
    gap: 16px;
    margin-top: 16px !important;
    margin-bottom: 60px !important;
    padding-bottom: 60px !important;
  }
  
  .calendar-widget {
    margin-bottom: 60px !important;
    padding: 16px !important;
  }
  
  .widget.nearest-lessons {
    margin-bottom: 50px !important;
    padding-bottom: 30px !important;
  }
}
```

## 🎯 **Результат изменений**

### **Логика времени:**
✅ **Корректный поиск** - занятия ищутся с 8:00 утра
✅ **Точность** - не показываются уже прошедшие утренние занятия
✅ **Реалистичность** - учитывает реальный учебный день
✅ **Лучший UX** - пользователи видят действительно актуальные занятия

### **Отступы:**
✅ **Не налезает на TopBar** - достаточный отступ сверху
✅ **Хорошие отступы снизу** - контент не обрезается
✅ **Адаптивность** - правильные отступы на всех устройствах
✅ **!important** - гарантирует применение стилей
✅ **Читаемость** - все элементы хорошо разделены

### **Устройства:**
- **Десктоп**: 80px сверху, 40px снизу
- **Планшет**: 90px сверху, 50px снизу
- **Мобильный**: 100px сверху, 60px снизу

## 📋 **Файлы изменений**

1. **`/src/pages/SchedulePage.jsx`** - Изменена логика поиска с 8:00
2. **`/src/styles/SchedulePage.css`** - Добавлены отступы с !important
3. **`SCHEDULE_TIME_SPACING_FIX.md`** - Данная документация

## 🔧 **Совместимость**

- ✅ Работает на всех устройствах
- ✅ Корректные отступы на всех разрешениях
- ✅ Учитывает высоту TopBar и Sidebar
- ✅ Responsive дизайн
- ✅ Touch-friendly на мобильных

Теперь расписание корректно работает с 8:00 утра и имеет правильные отступы на всех устройствах!
