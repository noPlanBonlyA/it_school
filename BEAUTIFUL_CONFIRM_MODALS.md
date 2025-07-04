# Красивые модальные окна подтверждения

## Обзор

В приложении теперь есть красивые модальные окна подтверждения вместо стандартного `window.confirm()`. Они предоставляют лучший UX и более современный вид.

## Компоненты

### ConfirmModal
Основной компонент модального окна подтверждения.

**Местоположение:** `src/components/ConfirmModal.jsx`

**Пропсы:**
- `isOpen` - показывать ли модальное окно
- `onClose` - функция закрытия (отмена)
- `onConfirm` - функция подтверждения
- `title` - заголовок окна (по умолчанию "Подтверждение")
- `message` - текст сообщения
- `confirmText` - текст кнопки подтверждения (по умолчанию "Да")
- `cancelText` - текст кнопки отмены (по умолчанию "Отмена")
- `type` - тип окна: `default`, `danger`, `warning`, `success`

### useConfirm Hook
Хук для удобного использования модальных окон подтверждения.

**Местоположение:** `src/hooks/useConfirm.js`

## Использование

### 1. Базовое использование

```jsx
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';

function MyComponent() {
  const { confirmState, showConfirm } = useConfirm();

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: "🗑️ Удаление",
      message: "Вы уверены, что хотите удалить этот элемент?",
      confirmText: "Удалить",
      cancelText: "Отмена",
      type: "danger"
    });

    if (confirmed) {
      // Выполняем удаление
      console.log('Удаляем...');
    }
  };

  return (
    <div>
      <button onClick={handleDelete}>Удалить</button>
      
      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={confirmState.onCancel}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </div>
  );
}
```

### 2. Разные типы окон

```jsx
// Предупреждение (желтое)
const confirmed = await showConfirm({
  title: "⚠️ Предупреждение",
  message: "Это действие может повлиять на других пользователей",
  type: "warning"
});

// Опасное действие (красное)
const confirmed = await showConfirm({
  title: "🚨 Опасно",
  message: "Это действие нельзя отменить!",
  type: "danger"
});

// Успех (зеленое)
const confirmed = await showConfirm({
  title: "✅ Готово",
  message: "Операция выполнена успешно",
  confirmText: "OK",
  cancelText: "", // Скрыть кнопку отмены
  type: "success"
});

// Обычное (синее)
const confirmed = await showConfirm({
  title: "❓ Подтверждение",
  message: "Продолжить выполнение?",
  type: "default"
});
```

### 3. Только уведомление (без кнопки отмены)

```jsx
await showConfirm({
  title: "ℹ️ Информация",
  message: "Операция завершена",
  confirmText: "OK",
  cancelText: "", // Пустая строка скрывает кнопку
  type: "success"
});
```

## Стили

Все стили находятся в `src/styles/ConfirmModal.css` и включают:

- Красивые анимации появления
- Glassmorphism эффект для overlay
- Цветные кнопки в зависимости от типа
- Адаптивный дизайн для мобильных устройств
- Эмодзи иконки для разных типов

## Цвета кнопок по типам

- **default**: Синий градиент (#667eea → #764ba2)
- **danger**: Красный градиент (#ef4444 → #dc2626)
- **warning**: Оранжевый градиент (#f59e0b → #d97706)
- **success**: Зеленый градиент (#10b981 → #059669)
- **secondary**: Серый (#f3f4f6)

## Где уже используется

1. **ImpersonatePage** - подтверждение входа под другим пользователем
2. **Sidebar** - подтверждение выхода из системы

## Дальнейшие обновления

Рекомендуется заменить все `window.confirm()` в следующих файлах:

- `ManageGroupPage.jsx` - удаление групп и пользователей
- `HomeWorkPage.jsx` - отмена оценок
- `ManageNewsPage.jsx` - удаление новостей  
- `CourseDetailPage.jsx` - удаление уроков

## Анимации

- **fadeIn** - плавное появление overlay
- **slideUp** - появление модального окна снизу вверх с масштабированием
- **hover эффекты** - подъем кнопок при наведении
- **активное состояние** - нажатие кнопок

Модальные окна автоматически закрываются при клике на overlay или нажатии Escape (если добавить обработчик).
