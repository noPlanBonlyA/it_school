# Исправление фона главной страницы

## Проблемы, которые были решены:

### 1. Контент налезал на TopBar
- **Проблема**: Карточки и содержимое страницы налезали на TopBar
- **Решение**: Увеличили `padding-top` для `.main-content` до 140px

### 2. Фоновое изображение не отображалось
- **Проблема**: Сложная система с псевдоэлементами `::before` не работала корректно
- **Решение**: Упростили подход - добавили фон напрямую к `.main-content`

### 3. Карточки были слишком непрозрачными
- **Проблема**: Фон не был виден через карточки
- **Решение**: Снизили непрозрачность фона карточек до 30% (`rgba(255, 255, 255, 0.3)`)

## Примененные изменения:

### 1. Фон для main-content:
```css
.main-content {
  background: 
    linear-gradient(180deg, rgba(245, 246, 250, 0.9) 0%, rgba(245, 246, 250, 0.3) 20%, transparent 30%),
    url('../images/image.png') center/cover no-repeat;
  background-attachment: fixed;
  padding-top: 140px;
}
```

### 2. Упрощение карточек:
```css
.card {
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
```

### 3. Удаление сложного псевдоэлемента:
- Убрали `.cards::before` с фоновым изображением
- Упростили структуру CSS

## Результат:
- ✅ Фоновое изображение теперь видно за карточками
- ✅ Контент не налезает на TopBar
- ✅ Glassmorphism эффект работает корректно
- ✅ Двухколоночная структура сохранена
- ✅ Адаптивность для мобильных устройств

## Технические детали:
- Увеличен отступ сверху до 140px для предотвращения наложения на TopBar
- Добавлен градиент сверху для плавного перехода от области TopBar к фону
- Фон зафиксирован (`background-attachment: fixed`) для лучшего визуального эффекта
- Карточки стали полупрозрачными с эффектом размытия для лучшего отображения фона
