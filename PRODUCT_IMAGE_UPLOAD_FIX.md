# Исправление загрузки изображений товаров

## Проблема
При создании товара в `ManageProductsPage` изображение не загружалось, показывая `null` в поле `photo`.

## Корневая причина
Проблема была в неправильной обработке `multipart/form-data` запросов:

1. **Неправильные заголовки**: Явное указание `Content-Type: multipart/form-data` в axios запросах блокировало автоматическое добавление `boundary` браузером
2. **Неполная валидация**: Изображение было опциональным при создании товара, что могло приводить к некорректным данным

## Внесенные исправления

### 1. Исправление axiosInstance.js ✅
**Файл**: `src/api/axiosInstance.js`

```javascript
// Добавляем интерцептор для запросов
api.interceptors.request.use(
  config => {
    // Для FormData не устанавливаем Content-Type, позволяем браузеру сделать это
    if (config.data instanceof FormData) {
      // Удаляем Content-Type для multipart/form-data
      delete config.headers['Content-Type'];
    } else if (config.data && typeof config.data === 'object') {
      config.headers['Content-Type'] = 'application/json';
    }
    
    console.log('[API] Request:', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData' : config.data
    });
    return config;
  },
  error => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);
```

### 2. Обновление productService.js ✅
**Файл**: `src/services/productService.js`

```javascript
export const createProduct = async (productData, imageFile = null) => {
  try {
    const formData = new FormData();
    formData.append('product_data', JSON.stringify(productData));
    
    // Добавляем изображение, даже если оно null (API может требовать это поле)
    formData.append('image', imageFile);

    console.log('Creating product with data:', productData);
    console.log('Image file:', imageFile);

    // Убираем явное указание Content-Type - браузер сделает это сам
    const response = await api.post('/products/', formData);
    
    console.log('Product created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Error details:', error.response?.data);
    throw error;
  }
};
```

### 3. Улучшение валидации в ManageProductsPage.jsx ✅
**Файл**: `src/pages/ManageProductsPage.jsx`

- Сделали изображение обязательным для новых товаров
- Добавили лучшую обработку ошибок с детальными сообщениями
- Добавили индикатор обязательности поля

```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!form.name.trim()) {
    newErrors.name = 'Название обязательно';
  }
  
  if (!form.description.trim()) {
    newErrors.description = 'Описание обязательно';
  }
  
  if (!form.price || isNaN(form.price) || Number(form.price) < 0) {
    newErrors.price = 'Цена должна быть положительным числом';
  }

  // Проверяем изображение только для создания нового товара
  if (!editingProduct && !imageFile) {
    newErrors.image = 'Изображение обязательно для нового товара';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### 4. Исправлены аналогичные проблемы в других сервисах ✅

Удалены явные указания `Content-Type: multipart/form-data` из:
- `userService.js`
- `courseService.js`
- `lessonService.js`
- `homeworkService.js`
- `teacherService.js`

## Как тестировать исправления

### Создание товара с изображением:
1. Перейти в "Управление товарами" (только для супер-админов)
2. Нажать "Добавить товар"
3. Заполнить все поля
4. **Обязательно** загрузить изображение
5. Нажать "Создать"
6. Проверить, что товар создался с корректным изображением (не `null`)

### Редактирование товара:
1. Нажать "Редактировать" на существующем товаре
2. Изменить данные (изображение опционально)
3. Сохранить изменения
4. Проверить, что изменения применились

## Диагностика проблем

### Проверка в консоли браузера:
```javascript
// Логи создания товара
[API] Request: { method: 'post', url: '/products/', data: 'FormData' }
Creating product with data: { name: "...", description: "...", price: 100, is_pinned: false }
Image file: File { name: "image.jpg", size: 12345, type: "image/jpeg" }
Product created successfully: { id: "...", name: "...", photo: { url: "..." } }
```

### Что искать в логах:
- ✅ `data: 'FormData'` вместо объекта - FormData обрабатывается правильно
- ✅ `Image file: File { ... }` - файл передается корректно
- ✅ `photo: { url: "..." }` в ответе - изображение загружено

### Если проблема осталась:
1. Проверить, что API сервер запущен и доступен
2. Проверить права доступа к папке загрузки на сервере
3. Проверить настройки CORS на бэкенде
4. Убедиться, что размер файла не превышает лимиты сервера

## Примечания

- Теперь браузер автоматически устанавливает правильный `Content-Type` с `boundary` для `multipart/form-data`
- Все FormData запросы обрабатываются единообразно через интерцептор axios
- Добавлена подробная диагностика ошибок для облегчения отладки
- Изображение теперь обязательно при создании нового товара

## Дополнительные улучшения

Для дальнейшего улучшения можно добавить:
- Предварительное сжатие изображений перед загрузкой
- Валидацию типа и размера файла на фронтенде
- Прогресс-бар загрузки для больших файлов
- Возможность обрезки изображения перед загрузкой
