import React, { useState } from 'react';
import { 
  createLessonWithMaterials, 
  updateLessonWithMaterials,
  createLessonWithMaterialsText,
  updateLessonWithMaterialsText
} from '../services/lessonService';
import '../styles/LessonEditor.css';

export default function LessonEditor({ courseId, lesson = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: lesson?.name || '',
  });
  
  const [materialMode, setMaterialMode] = useState('file'); // 'text' или 'file'
  
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
        
        // Правильная структура данных для API
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

        {/* Выбор режима материалов */}
        <div className="form-section">
          <label className="form-label">
            <span className="label-text">Тип материалов</span>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="file"
                  checked={materialMode === 'file'}
                  onChange={(e) => setMaterialMode(e.target.value)}
                />
                <span className="radio-label">📁 Файловые материалы</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="text"
                  checked={materialMode === 'text'}
                  onChange={(e) => setMaterialMode(e.target.value)}
                />
                <span className="radio-label">📝 Текстовые материалы (HTML)</span>
              </label>
            </div>
          </label>
        </div>

        {/* Материалы */}
        <div className="materials-section">
          <h3 className="section-title">📚 Материалы урока</h3>
          
          {/* Материал для преподавателя */}
          <div className="material-block">
            <div className="material-header">
              <h4 className="material-title">👨‍🏫 Материал для преподавателя</h4>
              <span className="material-subtitle">
                {materialMode === 'file' ? 'Конспект, план урока, презентация' : 'HTML содержимое для преподавателя'}
              </span>
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
            
            {materialMode === 'file' ? (
              <div className="file-upload">
                <input
                  type="file"
                  id="teacher-file"
                  onChange={(e) => handleFileChange('teacher', e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                  className="file-input"
                />
                <label htmlFor="teacher-file" className="file-label">
                  <span className="file-icon">📁</span>
                  <span className="file-text">
                    {teacherMaterialFile ? teacherMaterialFile.name : 'Выберите файл'}
                  </span>
                </label>
                {teacherMaterialFile && (
                  <div className="file-info">
                    <span className="file-size">
                      Размер: {Math.round(teacherMaterialFile.size / 1024)} KB
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-area">
                <label className="form-label">
                  <span className="label-text">Содержимое материала (HTML)</span>
                  <textarea
                    value={teacherMaterialText}
                    onChange={(e) => setTeacherMaterialText(e.target.value)}
                    placeholder="Введите HTML содержимое материала..."
                    rows={6}
                    className="form-textarea"
                  />
                </label>
              </div>
            )}
            
            {lesson?.teacher_material && (
              <div className="current-material">
                Текущий материал: {lesson.teacher_material.name}
              </div>
            )}
          </div>

          {/* Материал для студента */}
          <div className="material-block">
            <div className="material-header">
              <h4 className="material-title">👨‍🎓 Материал для студента</h4>
              <span className="material-subtitle">
                {materialMode === 'file' ? 'Учебные материалы, справочники' : 'HTML содержимое для студента'}
              </span>
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
            
            {materialMode === 'file' ? (
              <div className="file-upload">
                <input
                  type="file"
                  id="student-file"
                  onChange={(e) => handleFileChange('student', e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                  className="file-input"
                />
                <label htmlFor="student-file" className="file-label">
                  <span className="file-icon">📁</span>
                  <span className="file-text">
                    {studentMaterialFile ? studentMaterialFile.name : 'Выберите файл'}
                  </span>
                </label>
                {studentMaterialFile && (
                  <div className="file-info">
                    <span className="file-size">
                      Размер: {Math.round(studentMaterialFile.size / 1024)} KB
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-area">
                <label className="form-label">
                  <span className="label-text">Содержимое материала (HTML)</span>
                  <textarea
                    value={studentMaterialText}
                    onChange={(e) => setStudentMaterialText(e.target.value)}
                    placeholder="Введите HTML содержимое материала..."
                    rows={6}
                    className="form-textarea"
                  />
                </label>
              </div>
            )}
            
            {lesson?.student_material && (
              <div className="current-material">
                Текущий материал: {lesson.student_material.name}
              </div>
            )}
          </div>

          {/* Домашнее задание */}
          <div className="material-block">
            <div className="material-header">
              <h4 className="material-title">📝 Домашнее задание</h4>
              <span className="material-subtitle">
                {materialMode === 'file' ? 'Практические задания, упражнения' : 'HTML содержимое задания'}
              </span>
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
            
            {materialMode === 'file' ? (
              <div className="file-upload">
                <input
                  type="file"
                  id="homework-file"
                  onChange={(e) => handleFileChange('homework', e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.html,.txt,.zip,.rar"
                  className="file-input"
                />
                <label htmlFor="homework-file" className="file-label">
                  <span className="file-icon">📁</span>
                  <span className="file-text">
                    {homeworkMaterialFile ? homeworkMaterialFile.name : 'Выберите файл'}
                  </span>
                </label>
                {homeworkMaterialFile && (
                  <div className="file-info">
                    <span className="file-size">
                      Размер: {Math.round(homeworkMaterialFile.size / 1024)} KB
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-area">
                <label className="form-label">
                  <span className="label-text">Содержимое задания (HTML)</span>
                  <textarea
                    value={homeworkMaterialText}
                    onChange={(e) => setHomeworkMaterialText(e.target.value)}
                    placeholder="Введите HTML содержимое задания..."
                    rows={6}
                    className="form-textarea"
                  />
                </label>
              </div>
            )}
            
            {lesson?.homework && (
              <div className="current-material">
                Текущее задание: {lesson.homework.name}
              </div>
            )}
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