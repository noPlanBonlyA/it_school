# API Services - Form Data Support (Обновлено)

## Обновленные сервисы для работы с form-data

Все сервисы обновлены для использования multipart/form-data при создании пользователей, что соответствует обновленному FastAPI OpenAPI спецификации.

### StudentService

#### Создание студента с пользователем (form-data)
```javascript
import { createStudent } from '../services/studentService';

const handleCreateStudent = async (formData, imageFile) => {
  try {
    // formData должен содержать все поля пользователя + points
    // username генерируется автоматически на бэкенде
    const studentData = {
      first_name: 'Иван',
      surname: 'Иванов',
      patronymic: 'Иванович',      // опционально
      email: 'ivan@example.com',
      birth_date: '2000-01-01',
      phone_number: '+1234567890',
      password: 'secure_password',
      points: 100                  // опционально, по умолчанию 0
    };
    
    const result = await createStudent(studentData, imageFile);
    console.log('Создан пользователь:', result.user);
    console.log('Создан профиль студента:', result.student);
    
    return result;
  } catch (error) {
    console.error('Ошибка создания студента:', error);
    throw error;
  }
};
```

#### Создание профиля студента для существующего пользователя
```javascript
import { createStudentProfile } from '../services/studentService';

const createStudentForExistingUser = async (userId, points = 0) => {
  try {
    const student = await createStudentProfile(userId, points);
    console.log('Профиль студента создан:', student);
    return student;
  } catch (error) {
    console.error('Ошибка создания профиля студента:', error);
    throw error;
  }
};
```

### TeacherService

#### Создание учителя с пользователем (form-data)
```javascript
import { createTeacherWithUser } from '../services/teacherService';

const handleCreateTeacher = async (formData, imageFile) => {
  try {
    // formData должен содержать все поля пользователя
    // username генерируется автоматически на бэкенде
    const teacherData = {
      first_name: 'Мария',
      surname: 'Петрова',
      patronymic: 'Александровна',  // опционально
      email: 'maria@example.com',
      birth_date: '1985-05-15',
      phone_number: '+1234567890',
      password: 'secure_password'
    };
    
    const result = await createTeacherWithUser(teacherData, imageFile);
    console.log('Создан пользователь:', result.user);
    console.log('Создан профиль учителя:', result.teacher);
    
    return result;
  } catch (error) {
    console.error('Ошибка создания учителя:', error);
    throw error;
  }
};
```

### UserService (для администраторов)

#### Создание администратора (form-data)
```javascript
import { createAdminWithUser } from '../services/userService';

const handleCreateAdmin = async (formData, imageFile) => {
  try {
    // formData должен содержать все поля пользователя
    // username генерируется автоматически на бэкенде
    const adminData = {
      first_name: 'Администратор',
      surname: 'Системы',
      patronymic: 'Главный',        // опционально
      email: 'admin@example.com',
      birth_date: '1980-01-01',
      phone_number: '+1234567890',
      password: 'secure_password',
      role: 'admin'                 // или 'superadmin'
    };
    
    const result = await createAdminWithUser(adminData, imageFile);
    console.log('Создан администратор:', result.user);
    
    return result;
  } catch (error) {
    console.error('Ошибка создания администратора:', error);
    throw error;
  }
};
```

## Важные изменения

### 1. Автоматическая генерация username
**ОБНОВЛЕНО**: Поле `username` теперь генерируется автоматически на бэкенде и **НЕ ДОЛЖНО** передаваться фронтендом. Удалите поле username из всех форм создания пользователей.

### 2. Обновления через multipart/form-data
API обновления пользователей (`PUT /api/users/{user_id}`) теперь требует multipart/form-data:

```javascript
// ПРАВИЛЬНО: Используем updateUser из userService
await updateUser(userId, {
  first_name: 'Иван',
  email: 'new@example.com'
  // username НЕ передаем
});

// НЕПРАВИЛЬНО: Прямые JSON запросы больше не работают
```

### 3. Создание преподавателей в два этапа
Преподаватели требуют создания пользователя + профиля учителя:
- Используйте `createTeacherWithUser()` вместо `createUser()`
- Возвращает `{ user, teacher }`

### 4. Структура ответа
Все функции создания возвращают объект с соответствующими данными:
- `createStudent` → `{ user, student }`
- `createTeacherWithUser` → `{ user, teacher }`
- `createAdminWithUser` → `{ user }`

### 5. Поддержка изображений
Все функции поддерживают опциональный параметр `imageFile` для загрузки аватара пользователя.

## Примеры использования в React компонентах

### Создание студента с файлом
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ОБНОВЛЕНО: username больше не передается
  const formData = {
    first_name: formState.firstName,
    surname: formState.surname,
    email: formState.email,
    password: formState.password,
    points: 0
    // username убран - генерируется автоматически
  };
  
  try {
    const result = await createStudent(formData, selectedImageFile);
    setStudents(prev => [...prev, { user: result.user, student: result.student }]);
    // Сброс формы
    setFormState(initialState);
    setSelectedImageFile(null);
  } catch (error) {
    setError(error.message);
  }
};
```

### Обновленные админские интерфейсы
Все страницы управления (`ManageStudents`, `ManageTeachers`, `ManageAdmins`) обновлены для использования новых API методов с form-data. Поиск и фильтрация работают как прежде.

### Пример компонента создания студента
```jsx
function CreateStudentForm() {
  const [form, setForm] = useState({
    username: '',
    first_name: '',
    surname: '',
    patronymic: '',
    birth_date: '',
    email: '',
    phone_number: '',
    password: '',
    points: 0
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await createStudent({
        ...form,
        username: form.username || form.email // fallback к email
      }, image);
      
      alert('Студент создан успешно!');
      setForm({
        username: '', first_name: '', surname: '', patronymic: '',
        birth_date: '', email: '', phone_number: '', password: '', points: 0
      });
      setImage(null);
      
    } catch (error) {
      alert('Ошибка создания студента: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Username"
        value={form.username}
        onChange={e => setForm(f => ({...f, username: e.target.value}))}
        required
      />
      <input
        type="text"
        placeholder="Имя"
        value={form.first_name}
        onChange={e => setForm(f => ({...f, first_name: e.target.value}))}
        required
      />
      {/* остальные поля... */}
      <input
        type="file"
        accept="image/*"
        onChange={e => setImage(e.target.files[0])}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Создание...' : 'Создать студента'}
      </button>
    </form>
  );
}
```

## API Endpoints
Теперь используются следующие endpoints с multipart/form-data:
- `POST /api/users/` - создание пользователя (form-data: user_data + image)
- `PUT /api/users/{user_id}` - обновление пользователя (form-data: user_data + image)
- `POST /api/students/` - создание профиля студента (JSON)
- `POST /api/teachers/` - создание профиля учителя (JSON)

## Совместимость
Все изменения обратно совместимы. Существующая функциональность поиска, редактирования и удаления пользователей работает без изменений.

## Проверка изменений
Для проверки правильности работы:

1. **Создание студента**: Перейдите в раздел "Управление студентами" и создайте нового студента
2. **Создание учителя**: Перейдите в раздел "Управление учителями" и создайте нового учителя  
3. **Создание админа**: Перейдите в раздел "Управление администраторами" и создайте нового админа
4. **Поиск работает**: Убедитесь, что поиск по логину и ФИО работает как прежде
5. **Редактирование**: Убедитесь, что редактирование существующих пользователей работает

Все формы теперь включают поле "username" как первое поле в форме создания.
