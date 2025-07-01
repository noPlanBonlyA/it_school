import React, { useState } from 'react';
import { 
  createLessonWithMaterials, 
  updateLessonWithMaterials,
  createLessonWithMaterialsText,
  updateLessonWithMaterialsText
} from '../services/lessonService';

export default function LessonEditor({ courseId, lesson = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: lesson?.name || '',
  });
  
  const [materialMode, setMaterialMode] = useState('text'); // 'text' или 'file'
  
  // Для файлов
  const [teacherMaterialFile, setTeacherMaterialFile] = useState(null);
  const [studentMaterialFile, setStudentMaterialFile] = useState(null);
  const [homeworkMaterialFile, setHomeworkMaterialFile] = useState(null);
  
  // Для названий материалов
  const [teacherMaterialName, setTeacherMaterialName] = useState(lesson?.teacher_material?.name || '');
  const [studentMaterialName, setStudentMaterialName] = useState(lesson?.student_material?.name || '');
  const [homeworkMaterialName, setHomeworkMaterialName] = useState(lesson?.homework?.name || '');
  
  // Для текстового содержимого
  const [teacherMaterialText, setTeacherMaterialText] = useState('');
  const [studentMaterialText, setStudentMaterialText] = useState('');
  const [homeworkMaterialText, setHomeworkMaterialText] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type, file) => {
    switch (type) {
      case 'teacher':
        setTeacherMaterialFile(file);
        if (file && !teacherMaterialName) {
          setTeacherMaterialName(file.name.split('.')[0]); // Убираем расширение
        }
        break;
      case 'student':
        setStudentMaterialFile(file);
        if (file && !studentMaterialName) {
          setStudentMaterialName(file.name.split('.')[0]);
        }
        break;
      case 'homework':
        setHomeworkMaterialFile(file);
        if (file && !homeworkMaterialName) {
          setHomeworkMaterialName(file.name.split('.')[0]);
        }
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Название урока обязательно');
      return;
    }
    
    try {
      setLoading(true);
      
      if (materialMode === 'file') {
        // РЕЖИМ ФАЙЛОВ - используем multipart/form-data
        const submitData = new FormData();
        
        // ИСПРАВЛЕНО: Правильная структура данных для API
        const lessonData = {
          name: formData.name,
          ...(teacherMaterialName && { teacher_material_name: teacherMaterialName }),
          ...(studentMaterialName && { student_material_name: studentMaterialName }),
          ...(homeworkMaterialName && { homework_material_name: homeworkMaterialName }),
          // Для обновления передаем ID
          ...(lesson && {
            id: lesson.id,
            ...(lesson.teacher_material_id && { teacher_material_id: lesson.teacher_material_id }),
            ...(lesson.student_material_id && { student_material_id: lesson.student_material_id }),
            ...(lesson.homework_id && { homework_id: lesson.homework_id })
          })
        };
        
        // Добавляем JSON данные как строку
        submitData.append('data', JSON.stringify(lessonData));
        
        // Добавляем файлы с правильными именами полей
        if (teacherMaterialFile) {
          submitData.append('teacher_material_file', teacherMaterialFile);
        }
        if (studentMaterialFile) {
          submitData.append('student_material_file', studentMaterialFile);
        }
        if (homeworkMaterialFile) {
          submitData.append('homework_material_file', homeworkMaterialFile);
        }
        
        console.log('[LessonEditor] Submitting with files:', {
          courseId,
          lessonData,
          files: {
            teacher: teacherMaterialFile?.name,
            student: studentMaterialFile?.name,
            homework: homeworkMaterialFile?.name
          }
        });
        
        if (lesson) {
          await updateLessonWithMaterials(courseId, lesson.id, submitData);
        } else {
          await createLessonWithMaterials(courseId, submitData);
        }
        
      } else {
        // РЕЖИМ ТЕКСТА - используем JSON
        const textData = {
          name: formData.name,
          ...(teacherMaterialName && { 
            teacher_material_name: teacherMaterialName,
            teacher_material_text: teacherMaterialText 
          }),
          ...(studentMaterialName && { 
            student_material_name: studentMaterialName,
            student_material_text: studentMaterialText 
          }),
          ...(homeworkMaterialName && { 
            homework_material_name: homeworkMaterialName,
            homework_material_text: homeworkMaterialText 
          }),
          // Для обновления передаем ID
          ...(lesson && {
            id: lesson.id,
            ...(lesson.teacher_material_id && { teacher_material_id: lesson.teacher_material_id }),
            ...(lesson.student_material_id && { student_material_id: lesson.student_material_id }),
            ...(lesson.homework_id && { homework_id: lesson.homework_id })
          })
        };
        
        console.log('[LessonEditor] Submitting with text:', { courseId, textData });
        
        if (lesson) {
          await updateLessonWithMaterialsText(courseId, lesson.id, textData);
        } else {
          await createLessonWithMaterialsText(courseId, textData);
        }
      }
      
      alert('Урок успешно сохранен!');
      onSave();
      
    } catch (error) {
      console.error('[LessonEditor] Error saving lesson:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail
            .map(err => `${err.loc?.join('.')}: ${err.msg}`)
            .join('\n');
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert('Ошибка сохранения урока:\n' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lesson-editor">
      <h3>{lesson ? 'Редактировать урок' : 'Создать урок'}</h3>
      
      <form onSubmit={handleSubmit} className="user-form form-grid">
        {/* Название урока */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Название урока *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Введите название урока..."
          />
        </div>

        {/* Выбор режима материалов */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Тип материалов</label>
          <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="text"
                checked={materialMode === 'text'}
                onChange={(e) => setMaterialMode(e.target.value)}
              />
              Текстовые материалы (HTML)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="file"
                checked={materialMode === 'file'}
                onChange={(e) => setMaterialMode(e.target.value)}
              />
              Файловые материалы
            </label>
          </div>
        </div>

        {/* Материал для преподавателя */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <h4>📚 Материал для преподавателя</h4>
          
          <label>Название материала</label>
          <input
            type="text"
            value={teacherMaterialName}
            onChange={(e) => setTeacherMaterialName(e.target.value)}
            placeholder="Например: Конспект урока по React"
          />
          
          {materialMode === 'file' ? (
            <div style={{ marginTop: '10px' }}>
              <label>Файл материала</label>
              <input
                type="file"
                onChange={(e) => handleFileChange('teacher', e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              {teacherMaterialFile && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                  <div style={{ fontSize: '14px', color: '#0369a1' }}>
                    ✓ Выбран файл: <strong>{teacherMaterialFile.name}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Размер: {Math.round(teacherMaterialFile.size / 1024)} KB
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <label>Содержимое материала (HTML)</label>
              <textarea
                value={teacherMaterialText}
                onChange={(e) => setTeacherMaterialText(e.target.value)}
                placeholder="Введите HTML содержимое материала..."
                rows={4}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          )}
          
          {lesson?.teacher_material && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
              Текущий материал: {lesson.teacher_material.name}
            </div>
          )}
        </div>

        {/* Материал для студента */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <h4>👨‍🎓 Материал для студента</h4>
          
          <label>Название материала</label>
          <input
            type="text"
            value={studentMaterialName}
            onChange={(e) => setStudentMaterialName(e.target.value)}
            placeholder="Например: Учебные материалы по React"
          />
          
          {materialMode === 'file' ? (
            <div style={{ marginTop: '10px' }}>
              <label>Файл материала</label>
              <input
                type="file"
                onChange={(e) => handleFileChange('student', e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              {studentMaterialFile && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                  <div style={{ fontSize: '14px', color: '#0369a1' }}>
                    ✓ Выбран файл: <strong>{studentMaterialFile.name}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Размер: {Math.round(studentMaterialFile.size / 1024)} KB
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <label>Содержимое материала (HTML)</label>
              <textarea
                value={studentMaterialText}
                onChange={(e) => setStudentMaterialText(e.target.value)}
                placeholder="Введите HTML содержимое материала..."
                rows={4}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          )}
          
          {lesson?.student_material && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
              Текущий материал: {lesson.student_material.name}
            </div>
          )}
        </div>

        {/* Домашнее задание */}
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <h4>📝 Домашнее задание</h4>
          
          <label>Название задания</label>
          <input
            type="text"
            value={homeworkMaterialName}
            onChange={(e) => setHomeworkMaterialName(e.target.value)}
            placeholder="Например: Практическое задание по React"
          />
          
          {materialMode === 'file' ? (
            <div style={{ marginTop: '10px' }}>
              <label>Файл задания</label>
              <input
                type="file"
                onChange={(e) => handleFileChange('homework', e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              {homeworkMaterialFile && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                  <div style={{ fontSize: '14px', color: '#0369a1' }}>
                    ✓ Выбран файл: <strong>{homeworkMaterialFile.name}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Размер: {Math.round(homeworkMaterialFile.size / 1024)} KB
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <label>Содержимое задания (HTML)</label>
              <textarea
                value={homeworkMaterialText}
                onChange={(e) => setHomeworkMaterialText(e.target.value)}
                placeholder="Введите HTML содержимое задания..."
                rows={4}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          )}
          
          {lesson?.homework && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
              Текущее задание: {lesson.homework.name}
            </div>
          )}
        </div>

        <div className="buttons" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
            style={{ marginRight: '10px' }}
          >
            {loading ? 'Сохранение...' : (lesson ? 'Обновить урок' : 'Создать урок')}
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}