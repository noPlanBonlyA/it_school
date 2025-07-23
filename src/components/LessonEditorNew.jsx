import React, { useState } from 'react';
import { 
  createLessonWithMaterials, 
  updateLessonWithMaterials
} from '../services/lessonService';
import '../styles/LessonEditor.css';
import '../styles/ManageUserPage.css'; // Фирменные стили кнопок

export default function LessonEditor({ courseId, lesson = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: lesson?.name || '',
  });
  
  // Файлы для дополнительных материалов
  const [teacherAdditionalMaterialFile, setTeacherAdditionalMaterialFile] = useState(null);
  const [studentAdditionalMaterialFile, setStudentAdditionalMaterialFile] = useState(null);
  const [homeworkAdditionalMaterialFile, setHomeworkAdditionalMaterialFile] = useState(null);
  
  // Названия материалов
  const [teacherMaterialName, setTeacherMaterialName] = useState(lesson?.teacher_material?.name || '');
  const [teacherAdditionalMaterialName, setTeacherAdditionalMaterialName] = useState('');
  const [studentMaterialName, setStudentMaterialName] = useState(lesson?.student_material?.name || '');
  const [studentAdditionalMaterialName, setStudentAdditionalMaterialName] = useState('');
  const [homeworkMaterialName, setHomeworkMaterialName] = useState('');
  const [homeworkAdditionalMaterialName, setHomeworkAdditionalMaterialName] = useState('');
  
  // HTML текст для основных материалов
  const [teacherMaterialText, setTeacherMaterialText] = useState('');
  const [studentMaterialText, setStudentMaterialText] = useState('');
  const [homeworkMaterialText, setHomeworkMaterialText] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type, file) => {
    switch (type) {
      case 'teacher_additional':
        setTeacherAdditionalMaterialFile(file);
        if (file && !teacherAdditionalMaterialName) {
          setTeacherAdditionalMaterialName(file.name.split('.')[0]);
        }
        break;
      case 'student_additional':
        setStudentAdditionalMaterialFile(file);
        if (file && !studentAdditionalMaterialName) {
          setStudentAdditionalMaterialName(file.name.split('.')[0]);
        }
        break;
      case 'homework_additional':
        setHomeworkAdditionalMaterialFile(file);
        if (file && !homeworkAdditionalMaterialName) {
          setHomeworkAdditionalMaterialName(file.name.split('.')[0]);
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
      
      // Новый API - создание урока с материалами
      const submitData = new FormData();
      
      // Данные урока
      const lessonData = {
        name: formData.name,
        // Названия материалов
        ...(teacherMaterialName && { teacher_material_name: teacherMaterialName }),
        ...(teacherAdditionalMaterialName && { teacher_additional_material_name: teacherAdditionalMaterialName }),
        ...(studentMaterialName && { student_material_name: studentMaterialName }),
        ...(studentAdditionalMaterialName && { student_additional_material_name: studentAdditionalMaterialName }),
        ...(homeworkMaterialName && { homework_material_name: homeworkMaterialName }),
        ...(homeworkAdditionalMaterialName && { homework_additional_material_name: homeworkAdditionalMaterialName }),
        // HTML текст для основных материалов
        ...(teacherMaterialText && { teacher_material_text: teacherMaterialText }),
        ...(studentMaterialText && { student_material_text: studentMaterialText }),
        ...(homeworkMaterialText && { homework_material_text: homeworkMaterialText })
      };
      
      // Добавляем JSON данные
      submitData.append('data', JSON.stringify(lessonData));
      
      // Добавляем файлы для дополнительных материалов
      if (teacherAdditionalMaterialFile) {
        submitData.append('teacher_additional_material_file', teacherAdditionalMaterialFile);
      }
      if (studentAdditionalMaterialFile) {
        submitData.append('student_additional_material_file', studentAdditionalMaterialFile);
      }
      if (homeworkAdditionalMaterialFile) {
        submitData.append('homework_additional_material_file', homeworkAdditionalMaterialFile);
      }
      
      console.log('[LessonEditor] Submitting lesson:', {
        courseId,
        lessonData,
        files: {
          teacher_additional: teacherAdditionalMaterialFile?.name,
          student_additional: studentAdditionalMaterialFile?.name,
          homework_additional: homeworkAdditionalMaterialFile?.name
        }
      });
      
      if (lesson) {
        await updateLessonWithMaterials(courseId, lesson.id, submitData);
      } else {
        await createLessonWithMaterials(courseId, submitData);
      }
      
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
      
      alert('❌ Ошибка сохранения урока:\n' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lesson-editor">
      <div className="editor-header">
        <h2>{lesson ? '✏️ Редактировать урок' : '✨ Создать новый урок'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="lesson-form">
        <div className="form-basic">
          <label className="form-label">
            <span className="label-text">Название урока *</span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="Введите название урока..."
              className="form-input"
            />
          </label>
        </div>

        {/* Материалы */}
        <div className="materials-section">
          <h3 className="section-title">📚 Материалы урока</h3>
          
          {/* Материалы для преподавателя */}
          <div className="material-category">
            <h4 className="category-title">👨‍🏫 Материалы для преподавателя</h4>
            
            {/* Основной материал преподавателя (HTML текст) */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">📋 Основной материал (HTML)</h5>
                <span className="material-subtitle">Конспект, план урока, презентация</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название материала</span>
                <input
                  type="text"
                  value={teacherMaterialName}
                  onChange={(e) => setTeacherMaterialName(e.target.value)}
                  placeholder="Например: Конспект урока по React"
                  className="form-input"
                />
              </label>
              
              <label className="form-label">
                <span className="label-text">HTML содержимое</span>
                <textarea
                  value={teacherMaterialText}
                  onChange={(e) => setTeacherMaterialText(e.target.value)}
                  placeholder="Введите HTML содержимое материала..."
                  rows={6}
                  className="form-textarea"
                />
              </label>
            </div>
            
            {/* Дополнительный материал преподавателя (файл) */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">📎 Дополнительный материал (файл)</h5>
                <span className="material-subtitle">Справочники, примеры, ресурсы</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название дополнительного материала</span>
                <input
                  type="text"
                  value={teacherAdditionalMaterialName}
                  onChange={(e) => setTeacherAdditionalMaterialName(e.target.value)}
                  placeholder="Например: Дополнительные примеры"
                  className="form-input"
                />
              </label>
              
              <div className="file-upload">
                <input
                  type="file"
                  id="teacher-additional-file"
                  onChange={(e) => handleFileChange('teacher_additional', e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                  className="file-input"
                />
                <label htmlFor="teacher-additional-file" className="file-label">
                  <span className="file-icon">📁</span>
                  <span className="file-text">
                    {teacherAdditionalMaterialFile ? teacherAdditionalMaterialFile.name : 'Выберите файл'}
                  </span>
                </label>
                {teacherAdditionalMaterialFile && (
                  <div className="file-info">
                    <span className="file-size">
                      Размер: {Math.round(teacherAdditionalMaterialFile.size / 1024)} KB
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Материалы для студента */}
          <div className="material-category">
            <h4 className="category-title">👨‍🎓 Материалы для студента</h4>
            
            {/* Основной материал студента (HTML текст) */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">📋 Основной материал (HTML)</h5>
                <span className="material-subtitle">Теория, примеры, объяснения</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название материала</span>
                <input
                  type="text"
                  value={studentMaterialName}
                  onChange={(e) => setStudentMaterialName(e.target.value)}
                  placeholder="Например: Теория по React"
                  className="form-input"
                />
              </label>
              
              <label className="form-label">
                <span className="label-text">HTML содержимое</span>
                <textarea
                  value={studentMaterialText}
                  onChange={(e) => setStudentMaterialText(e.target.value)}
                  placeholder="Введите HTML содержимое материала..."
                  rows={6}
                  className="form-textarea"
                />
              </label>
            </div>
            
            {/* Дополнительный материал студента (файл) */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">📎 Дополнительный материал (файл)</h5>
                <span className="material-subtitle">Файлы, документы, ресурсы</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название дополнительного материала</span>
                <input
                  type="text"
                  value={studentAdditionalMaterialName}
                  onChange={(e) => setStudentAdditionalMaterialName(e.target.value)}
                  placeholder="Например: Дополнительные файлы"
                  className="form-input"
                />
              </label>
              
              <div className="file-upload">
                <input
                  type="file"
                  id="student-additional-file"
                  onChange={(e) => handleFileChange('student_additional', e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                  className="file-input"
                />
                <label htmlFor="student-additional-file" className="file-label">
                  <span className="file-icon">📁</span>
                  <span className="file-text">
                    {studentAdditionalMaterialFile ? studentAdditionalMaterialFile.name : 'Выберите файл'}
                  </span>
                </label>
                {studentAdditionalMaterialFile && (
                  <div className="file-info">
                    <span className="file-size">
                      Размер: {Math.round(studentAdditionalMaterialFile.size / 1024)} KB
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Домашнее задание */}
          <div className="material-category">
            <h4 className="category-title">📝 Домашнее задание</h4>
            
            {/* Основное домашнее задание (HTML текст) */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">📋 Задание (HTML)</h5>
                <span className="material-subtitle">Описание домашнего задания</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название задания</span>
                <input
                  type="text"
                  value={homeworkMaterialName}
                  onChange={(e) => setHomeworkMaterialName(e.target.value)}
                  placeholder="Например: Практическое задание по React"
                  className="form-input"
                />
              </label>
              
              <label className="form-label">
                <span className="label-text">Описание задания (HTML)</span>
                <textarea
                  value={homeworkMaterialText}
                  onChange={(e) => setHomeworkMaterialText(e.target.value)}
                  placeholder="Введите описание домашнего задания..."
                  rows={6}
                  className="form-textarea"
                />
              </label>
            </div>
            
            {/* Дополнительные файлы для домашнего задания */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">📎 Дополнительные файлы (файл)</h5>
                <span className="material-subtitle">Шаблоны, стартовые файлы, примеры</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название дополнительных файлов</span>
                <input
                  type="text"
                  value={homeworkAdditionalMaterialName}
                  onChange={(e) => setHomeworkAdditionalMaterialName(e.target.value)}
                  placeholder="Например: Стартовые файлы"
                  className="form-input"
                />
              </label>
              
              <div className="file-upload">
                <input
                  type="file"
                  id="homework-additional-file"
                  onChange={(e) => handleFileChange('homework_additional', e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                  className="file-input"
                />
                <label htmlFor="homework-additional-file" className="file-label">
                  <span className="file-icon">📁</span>
                  <span className="file-text">
                    {homeworkAdditionalMaterialFile ? homeworkAdditionalMaterialFile.name : 'Выберите файл'}
                  </span>
                </label>
                {homeworkAdditionalMaterialFile && (
                  <div className="file-info">
                    <span className="file-size">
                      Размер: {Math.round(homeworkAdditionalMaterialFile.size / 1024)} KB
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn-primary btn-save"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : (lesson ? '💾 Обновить урок' : '✨ Создать урок')}
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
