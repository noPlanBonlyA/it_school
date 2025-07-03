# API Services - Form Data Support

## Обновленные сервисы для работы с form-data

### StudentService

#### Создание студента с пользователем (form-data)
```javascript
import { createStudent } from '../services/studentService';

const handleCreateStudent = async (formData, imageFile) => {
  try {
    const studentData = {
      // Данные пользователя
      username: formData.username,
      first_name: formData.first_name,
      surname: formData.surname,
      patronymic: formData.patronymic,
      email: formData.email,
      birth_date: formData.birth_date,
      phone_number: formData.phone_number,
      password: formData.password,
      
      // Данные студента
      points: formData.points || 0
    };
    
    const result = await createStudent(studentData, imageFile);
    console.log('Student created:', result);
    // result содержит: { user: {...}, student: {...} }
    
  } catch (error) {
    console.error('Error creating student:', error);
  }
};
```

#### Создание профиля студента для существующего пользователя
```javascript
import { createStudentProfile } from '../services/studentService';

const createStudentForExistingUser = async (userId, points = 0) => {
  try {
    const student = await createStudentProfile(userId, { points });
    console.log('Student profile created:', student);
    
  } catch (error) {
    console.error('Error creating student profile:', error);
  }
};
```

### TeacherService

#### Создание учителя с пользователем (form-data)
```javascript
import { createTeacherWithUser } from '../services/teacherService';

const handleCreateTeacher = async (formData, imageFile) => {
  try {
    const teacherData = {
      // Данные пользователя
      username: formData.username,
      first_name: formData.first_name,
      surname: formData.surname,
      patronymic: formData.patronymic,
      email: formData.email,
      birth_date: formData.birth_date,
      phone_number: formData.phone_number,
      password: formData.password
    };
    
    const result = await createTeacherWithUser(teacherData, imageFile);
    console.log('Teacher created:', result);
    // result содержит: { user: {...}, teacher: {...} }
    
  } catch (error) {
    console.error('Error creating teacher:', error);
  }
};
```

### UserService (для администраторов)

#### Создание администратора (form-data)
```javascript
import { createAdminWithUser } from '../services/userService';

const handleCreateAdmin = async (formData, imageFile) => {
  try {
    const adminData = {
      username: formData.username,
      first_name: formData.first_name,
      surname: formData.surname,
      patronymic: formData.patronymic,
      email: formData.email,
      birth_date: formData.birth_date,
      phone_number: formData.phone_number,
      password: formData.password,
      role: formData.role // 'admin' или 'superadmin'
    };
    
    const result = await createAdminWithUser(adminData, imageFile);
    console.log('Admin created:', result);
    // result содержит: { user: {...} }
    
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};
```

## Примеры использования в компонентах

### Форма создания студента
```jsx
const CreateStudentForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    surname: '',
    patronymic: '',
    email: '',
    birth_date: '',
    phone_number: '',
    password: '',
    points: 0
  });
  const [imageFile, setImageFile] = useState(null);
  
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    setImageFile(file);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const result = await createStudent(formData, imageFile);
      console.log('Student created successfully:', result);
      // Обработка успешного создания
      
    } catch (error) {
      console.error('Failed to create student:', error);
      // Обработка ошибки
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Поля формы */}
      <input
        type="text"
        value={formData.username}
        onChange={(e) => setFormData({...formData, username: e.target.value})}
        placeholder="Username"
        required
      />
      
      {/* Другие поля... */}
      
      <input
        type="file"
        onChange={handleImageChange}
        accept="image/*"
      />
      
      <button type="submit">Создать студента</button>
    </form>
  );
};
```

## Изменения в API

Все функции создания теперь используют:
- **form-data** вместо JSON для передачи данных пользователя
- Автоматическое создание профилей (студент/учитель) после создания пользователя
- Поддержку загрузки изображений
- Правильную установку ролей пользователей

### Структура FormData
```javascript
const formData = new FormData();
formData.append('user_data', JSON.stringify({
  username: '...',
  first_name: '...',
  // ... другие поля
  role: 'student' // или 'teacher', 'admin', 'superadmin'
}));

// Если есть изображение
if (imageFile) {
  formData.append('image', imageFile);
}
```

### Возвращаемые данные
- **createStudent**: `{ user: UserObject, student: StudentObject }`
- **createTeacherWithUser**: `{ user: UserObject, teacher: TeacherObject }`
- **createAdminWithUser**: `{ user: UserObject }`
