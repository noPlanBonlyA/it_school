# Новые страницы: Управление товарами и Магазин

## Обзор

Добавлены две новые страницы для работы с товарами в системе:

1. **Управление товарами** (`/manage-products`) - для супер-администраторов
2. **Магазин** (`/shop`) - для студентов

## 🛠️ Управление товарами (Супер-админ)

### Доступ
- Только для пользователей с ролью `superadmin`
- Пункт меню: "Товары"
- URL: `/manage-products`

### Возможности
- ✅ Просмотр всех товаров
- ✅ Создание новых товаров
- ✅ Редактирование существующих товаров
- ✅ Удаление товаров
- ✅ Загрузка изображений товаров
- ✅ Поиск товаров по названию и описанию

### Как использовать

1. **Создание товара:**
   - Нажмите кнопку "Добавить товар"
   - Заполните обязательные поля:
     - Название товара
     - Описание
     - Цена в монетах (бесткоинах)
   - Опционально загрузите изображение
   - Нажмите "Создать"

2. **Редактирование товара:**
   - Нажмите "Редактировать" на карточке товара
   - Измените нужные поля
   - Нажмите "Обновить"

3. **Удаление товара:**
   - Нажмите "Удалить" на карточке товара
   - Подтвердите удаление

4. **Поиск товаров:**
   - Используйте поле поиска в верхней части страницы
   - Поиск работает по названию и описанию товара

## 🛒 Магазин (Студент)

### Доступ
- Только для пользователей с ролью `student`
- Пункт меню: "Магазин"
- URL: `/shop`

### Возможности
- ✅ Просмотр баланса бесткоинов
- ✅ Просмотр доступных товаров (которые можно купить)
- ✅ Просмотр недоступных товаров (на которые не хватает монет)
- ✅ Интерфейс покупки товаров
- ✅ Автоматическое разделение товаров по доступности

### Как использовать

1. **Просмотр баланса:**
   - В правом верхнем углу отображается текущее количество бесткоинов
   - Используется компонент BestCoins с анимацией

2. **Доступные товары:**
   - Вкладка "Доступные товары"
   - Показывает товары, которые студент может купить
   - Зеленая рамка и кнопка "Купить"

3. **Недоступные товары:**
   - Вкладка "Недоступные товары"
   - Показывает товары, на которые не хватает монет
   - Оранжевая рамка и информация о том, сколько монет нужно накопить

4. **Покупка товара:**
   - Нажмите "Купить" на доступном товаре
   - Подтвердите покупку в модальном окне
   - Система покажет детали покупки и остаток монет

## 🔧 Технические детали

### API эндпоинты

Используются следующие эндпоинты из OpenAPI спецификации:

**Для управления товарами:**
- `GET /api/products/` - получение всех товаров
- `POST /api/products/` - создание товара
- `PUT /api/products/{product_id}` - обновление товара
- `DELETE /api/products/{product_id}` - удаление товара
- `POST /api/products/{product_id}/photo/` - добавление фото

**Для магазина:**
- `GET /api/products/available?price={student_coins}` - доступные товары
- `GET /api/products/not-available?price={student_coins}` - недоступные товары
- `GET /api/students/me` - получение данных студента с монетами

### Файловая структура

```
src/
├── services/
│   └── productService.js          # API методы для работы с товарами
├── pages/
│   ├── ManageProductsPage.jsx     # Страница управления товарами
│   └── ShopPage.jsx               # Страница магазина
├── styles/
│   ├── ManageProductsPage.css     # Стили для управления товарами
│   └── ShopPage.css               # Стили для магазина
└── components/
    ├── Sidebar.jsx                # Обновлен: добавлены новые пункты меню
    └── BestCoin.jsx               # Компонент отображения монет (уже был)
```

### Маршрутизация

Добавлены новые маршруты в `App.js`:
- `/manage-products` - страница управления товарами
- `/shop` - страница магазина

### Меню навигации

**Для студентов:**
- Добавлен пункт "Магазин" между "Рейтинг" и "Профиль"

**Для супер-администраторов:**
- Добавлен пункт "Товары" после "Группы"

## 🎨 Дизайн и UX

### Управление товарами
- Современный дизайн с карточками товаров
- Сетка товаров адаптивная (grid layout)
- Модальные окна для создания/редактирования
- Предпросмотр изображений
- Интуитивные кнопки действий

### Магазин
- Два четких раздела с вкладками
- Визуальное разделение доступных и недоступных товаров
- Анимированный компонент отображения монет
- Модальное окно подтверждения покупки
- Информация о том, сколько монет нужно накопить

## 🚀 Будущие улучшения

- Реализация логики покупки товаров (списание монет)
- История покупок студента
- Система скидок и акций
- Категории товаров
- Фильтрация и сортировка товаров
- Push-уведомления о новых товарах
- Система отзывов на товары

## 📝 Примечания

1. **Безопасность:** Все API запросы автоматически включают токен авторизации
2. **Валидация:** Форма создания товаров включает валидацию всех полей
3. **Отзывчивость:** Интерфейс адаптирован для мобильных устройств
4. **Производительность:** Изображения оптимизированы и кэшируются браузером
5. **UX:** Все действия сопровождаются понятными сообщениями и анимациями

## 🐛 Известные ограничения

- Логика покупки пока не реализована (показывается заглушка)
- Нет системы инвентаря купленных товаров
- Изображения товаров не имеют ограничений по размеру
- Нет пагинации для большого количества товаров

Все новые компоненты интегрированы в существующую архитектуру приложения и следуют установленным паттернам проектирования.
