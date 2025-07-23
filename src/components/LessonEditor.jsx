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
  
  // Названия материалов
  const [teacherMaterialName, setTeacherMaterialName] = useState(lesson?.teacher_material?.name || '');
  const [teacherAdditionalMaterialName, setTeacherAdditionalMaterialName] = useState('');
  const [studentMaterialName, setStudentMaterialName] = useState(lesson?.student_material?.name || '');
  const [studentAdditionalMaterialName, setStudentAdditionalMaterialName] = useState('');
  
  // HTML текст для основных материалов
  const [teacherMaterialText, setTeacherMaterialText] = useState('');
  const [studentMaterialText, setStudentMaterialText] = useState('');
  
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
        // HTML текст для основных материалов
        ...(teacherMaterialText && { teacher_material_text: teacherMaterialText }),
        ...(studentMaterialText && { student_material_text: studentMaterialText })
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
      
      console.log('[LessonEditor] Submitting lesson:', {
        courseId,
        lessonData,
        files: {
          teacher_additional: teacherAdditionalMaterialFile?.name,
          student_additional: studentAdditionalMaterialFile?.name
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
      <form onSubmit={handleSubmit} className="lesson-form">
        {/* Название урока */}
        <div className="form-section">
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

        {/* Выбор режима материалов - убираем, так как теперь всегда можно и файлы и текст */}

        {/* Материалы */}
        <div className="materials-section">
          <h3 className="section-title">📚 Материалы урока</h3>
          
          {/* Материалы для преподавателя */}
          <div className="material-category">
            <h4 className="category-title">👨‍🏫 Материалы для преподавателя</h4>
            
            {/* Основной материал преподавателя */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">📋 Основной материал</h5>
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
              
              {/* Только HTML текст для основного материала */}
              <div className="text-area">
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
              
              {lesson?.teacher_material && (
                <div className="current-material">
                  Текущий материал: {lesson.teacher_material.name}
                </div>
              )}
            </div>
            
            {/* Дополнительный материал преподавателя */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">� Дополнительный материал</h5>
                <span className="material-subtitle">Справочники, примеры, ресурсы</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название дополнительного материала</span>
                <input
                  type="text"
                  value={teacherAdditionalMaterialName}
                  onChange={(e) => setTeacherAdditionalMaterialName(e.target.value)}
                  placeholder="Например: Справочник по React Hooks"
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
                    {teacherAdditionalMaterialFile ? teacherAdditionalMaterialFile.name : 'Выберите дополнительный файл'}
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
            <h4 className="category-title">�‍🎓 Материалы для студента</h4>
            
            {/* Основной материал студента */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">� Основной материал</h5>
                <span className="material-subtitle">Учебные материалы, теория</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название материала</span>
                <input
                  type="text"
                  value={studentMaterialName}
                  onChange={(e) => setStudentMaterialName(e.target.value)}
                  placeholder="Например: Учебные материалы по React"
                  className="form-input"
                />
              </label>
              
              {/* Только HTML текст для основного материала */}
              <div className="text-area">
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
              
              {lesson?.student_material && (
                <div className="current-material">
                  Текущий материал: {lesson.student_material.name}
                </div>
              )}
            </div>
            
            {/* Дополнительный материал студента */}
            <div className="material-block">
              <div className="material-header">
                <h5 className="material-title">� Дополнительный материал</h5>
                <span className="material-subtitle">Примеры, практические задания</span>
              </div>
              
              <label className="form-label">
                <span className="label-text">Название дополнительного материала</span>
                <input
                  type="text"
                  value={studentAdditionalMaterialName}
                  onChange={(e) => setStudentAdditionalMaterialName(e.target.value)}
                  placeholder="Например: Практические примеры"
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
                    {studentAdditionalMaterialFile ? studentAdditionalMaterialFile.name : 'Выберите дополнительный файл'}
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
            </div>          </div>

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