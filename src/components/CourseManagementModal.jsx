import React, { useState, useEffect, useCallback } from 'react';
import * as groupCourseManagementService from '../services/groupCourseManagementService';
import './CourseManagementModal.css';

/**
 * Модальное окно для управления курсом в группе
 * - Удаление курса
 * - Изменение времени всех занятий
 */
const CourseManagementModal = ({ 
  isOpen, 
  onClose, 
  groupId, 
  course, 
  onCourseUpdated 
}) => {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule', 'lessons', 'remove'
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removalMode, setRemovalMode] = useState('new'); // 'new', 'standard' или 'force'
  
  // Состояние для управления отдельными уроками
  const [courseLessons, setCourseLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  
  // Состояние для формы изменения расписания
  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: 1, // Понедельник по умолчанию
    startTime: '10:00',
    durationMinutes: 90,
    startDate: new Date().toISOString().split('T')[0],
    auditorium: ''
  });

  const dayNames = [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 
    'Четверг', 'Пятница', 'Суббота'
  ];

  // Функция загрузки информации о расписании
  const loadScheduleInfo = useCallback(async () => {
    try {
      setLoading(true);
      const info = await groupCourseManagementService.getGroupCourseScheduleInfo(groupId, course.id);
      setScheduleInfo(info);
      
      // Заполняем форму текущими данными, если расписание есть
      if (info.hasSchedule && info.lessons.length > 0) {
        const firstLesson = new Date(info.lessons[0].start_datetime);
        const endLesson = new Date(info.lessons[0].end_datetime);
        
        setScheduleForm({
          dayOfWeek: firstLesson.getDay(),
          startTime: firstLesson.toTimeString().substring(0, 5),
          durationMinutes: Math.round((endLesson - firstLesson) / (1000 * 60)),
          startDate: firstLesson.toISOString().split('T')[0],
          auditorium: info.lessons[0].auditorium || ''
        });
      }
    } catch (error) {
      console.error('Error loading schedule info:', error);
      alert('Ошибка загрузки информации о расписании');
    } finally {
      setLoading(false);
    }
  }, [groupId, course?.id]);

  // Функция загрузки уроков курса в группе
  const loadCourseLessons = useCallback(async () => {
    try {
      setLoading(true);
      const lessons = await groupCourseManagementService.getCourseLessonsInGroup(groupId, course.id);
      setCourseLessons(lessons);
    } catch (error) {
      console.error('Error loading course lessons:', error);
      alert('Ошибка загрузки уроков курса');
    } finally {
      setLoading(false);
    }
  }, [groupId, course?.id]);

  // Загружаем информацию о расписании курса
  useEffect(() => {
    if (isOpen && groupId && course?.id) {
      loadScheduleInfo();
      if (activeTab === 'lessons') {
        loadCourseLessons();
      }
    }
  }, [isOpen, groupId, course?.id, activeTab, loadScheduleInfo, loadCourseLessons]);

  // Обработчик клавиши Escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

    const handleDiagnostics = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Проверка здоровья API
      const healthCheck = await groupCourseManagementService.checkApiHealth();
      
      // 2. Получение актуальных данных группы
      const refreshResult = await groupCourseManagementService.forceRefreshGroupCourses(groupId);
      
      // 3. Проверка конкретного курса в группе
      let courseInGroup = false;
      let courseLessonsCount = 0;
      
      if (refreshResult.success && course) {
        const courseFound = refreshResult.courses.find(c => c.id === course.id);
        if (courseFound) {
          courseInGroup = true;
          courseLessonsCount = courseFound.lessonGroups.length;
        }
      }
      
      // 4. Формируем отчет
      const report = `🔧 ОТЧЕТ ДИАГНОСТИКИ СИСТЕМЫ

📊 API Сервер:
${healthCheck.success ? '✅' : '❌'} Статус: ${healthCheck.status}
${healthCheck.success ? '✅' : '❌'} Состояние: ${healthCheck.message}

📋 Данные группы (ID: ${groupId}):
✅ Всего курсов в группе: ${refreshResult.courses.length}
✅ Общее количество lesson-groups: ${refreshResult.totalLessonGroups}

📚 Курс "${course?.name}" (ID: ${course?.id}):
${courseInGroup ? '✅' : '❌'} Курс ${courseInGroup ? 'найден' : 'НЕ НАЙДЕН'} в группе
${courseInGroup ? '✅' : '❌'} Количество занятий: ${courseLessonsCount}

🔍 Детальный анализ курсов в группе:
${refreshResult.courses.map((c, index) => 
  `${index + 1}. "${c.name}" (ID: ${c.id}) - ${c.lessonGroups.length} занятий`
).join('\n')}

💡 Рекомендации:
${!healthCheck.success ? '• Проверьте подключение к серверу\n' : ''}${!courseInGroup ? '• Курс уже отвязан от группы или данные устарели\n' : ''}${courseInGroup && courseLessonsCount === 0 ? '• У курса нет активных занятий в группе\n' : ''}${courseInGroup && courseLessonsCount > 0 ? '• Курс активен, можно безопасно отвязать\n' : ''}• Обновите страницу для актуализации данных`;

      alert(report);
      
    } catch (error) {
      console.error('[CourseManagement] Diagnostics failed:', error);
      
      const errorReport = `❌ ОШИБКА ДИАГНОСТИКИ

🔧 Не удалось выполнить полную диагностику системы

📝 Детали ошибки:
${error.message}

🔍 Возможные причины:
• Потеря соединения с сервером
• Временная недоступность API
• Проблемы с аутентификацией
• Ошибка в конфигурации системы

💡 Что можно попробовать:
1. Проверить подключение к интернету
2. Обновить страницу (F5)
3. Выйти и войти в систему заново
4. Обратиться к системному администратору

⚠️ Если проблема повторяется, рекомендуется не выполнять операции с курсами до устранения неисправности.`;

      alert(errorReport);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCourse = async () => {
    if (!course) return;
    
    // Выбираем правильный метод в зависимости от режима
    if (removalMode === 'new') {
      return handleRemoveCourseNew();
    }
    
    const modeText = removalMode === 'force' ? 'принудительной отвязки' : 'стандартной отвязки';
    const modeDescription = removalMode === 'force' 
      ? '\n\n🔥 ПРИНУДИТЕЛЬНЫЙ РЕЖИМ:\n• Попытка удалить lesson-groups\n• Более агрессивная очистка данных\n• Рекомендуется при проблемах с обычным удалением'
      : '\n\n🔧 СТАНДАРТНЫЙ РЕЖИМ:\n• Удаление записей студентов\n• Безопасная отвязка курса\n• Рекомендуется для большинства случаев';
      
    const confirmMessage = `⚠️ ВНИМАНИЕ! Вы выбрали режим ${modeText} курса "${course.name}" от группы.${modeDescription}

Это действие приведет к:
• Удалению всех записей студентов с занятий этого курса
• Отвязке всех lesson-groups курса от группы  
• Потере данных о посещаемости и оценках по курсу
• Невозможности восстановить связи автоматически

❗ Данное действие необратимо!

Введите "УДАЛИТЬ" для подтверждения:`;

    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'УДАЛИТЬ') {
      alert('❌ Операция отменена. Для подтверждения нужно было ввести "УДАЛИТЬ"');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Выбираем метод удаления в зависимости от режима
      const result = removalMode === 'force' 
        ? await groupCourseManagementService.forceRemoveCourseFromGroup(groupId, course.id)
        : await groupCourseManagementService.removeCourseFromGroup(groupId, course.id);
      
      console.log('[CourseManagement] Removal result:', result);
      
      if (result.success) {
        // Создаем детальное сообщение об успехе
        const modeResultText = removalMode === 'force' ? 'принудительно отвязан' : 'успешно отвязан';
        const successMessage = `✅ Курс "${course.name}" ${modeResultText} от группы!

📊 Статистика операции:
• Режим: ${modeText.toUpperCase()}
• Обработано занятий: ${result.removed}/${result.total}
• Удалено записей студентов: ${result.removedStudents || 0}
${result.removedLessonGroups ? `• Удалено lesson-groups: ${result.removedLessonGroups}` : ''}
${result.failed > 0 ? `• Ошибок: ${result.failed}` : ''}

${result.message || ''}

🔄 Страница будет обновлена для отображения актуальных данных.`;

        alert(successMessage);
        
        // Закрываем модальное окно
        onClose();
        
        // Принудительно обновляем данные группы через callback
        if (onCourseUpdated) {
          onCourseUpdated({
            type: 'removed',
            courseId: course.id,
            courseName: course.name,
            mode: removalMode,
            details: result
          });
        }
        
        // Обновляем страницу после небольшой задержки
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } else {
        throw new Error(result.message || 'Не удалось полностью отвязать курс от группы');
      }
      
    } catch (error) {
      console.error('[CourseManagement] Error removing course:', error);
      
      let errorMessage = `❌ Ошибка при отвязке курса "${course.name}" от группы\n\n`;
      errorMessage += `🔧 Использованный режим: ${modeText.toUpperCase()}\n\n`;
      
      if (error.response?.status === 500) {
        errorMessage += '🔧 Ошибка сервера (500). Возможные причины:\n';
        errorMessage += '• Курс уже был удален\n';
        errorMessage += '• Проблемы с базой данных\n';
        errorMessage += '• Нарушение целостности данных\n\n';
        errorMessage += '💡 Попробуйте:\n';
        errorMessage += removalMode === 'standard' 
          ? '1. Переключиться на принудительный режим\n2. Обновить страницу\n3. Проверить актуальность данных через диагностику'
          : '1. Обновить страницу\n2. Проверить актуальность данных через диагностику\n3. Обратиться к администратору';
      } else if (error.response?.status === 404) {
        errorMessage += '🔍 Курс или группа не найдены (404)\n';
        errorMessage += 'Возможно, данные уже были изменены другим пользователем.';
      } else if (error.message) {
        errorMessage += `📝 Детали ошибки: ${error.message}`;
      } else {
        errorMessage += '🔧 Неизвестная ошибка. Проверьте подключение к интернету.';
      }
      
      setError(errorMessage);
      
      // Даже при ошибке попробуем обновить данные
      if (onCourseUpdated) {
        onCourseUpdated({
          type: 'attempted_removal',
          courseId: course.id,
          courseName: course.name,
          mode: removalMode,
          error: errorMessage
        });
      }
      
    } finally {
      setLoading(false);
    }
  };

  // Новая функция для использования нового API удаления курса
  const handleRemoveCourseNew = async () => {
    if (!course) return;
    
    const confirmMessage = `⚠️ ВНИМАНИЕ! Вы используете НОВЫЙ API для отвязки курса "${course.name}" от группы.

🔧 НОВЫЙ МЕТОД УДАЛЕНИЯ:
• Использует эндпоинт DELETE /courses/${course.id}/groups/${groupId}
• Быстрое и чистое удаление всех связей
• Рекомендуется для всех операций с API версии 2024+

Это действие приведет к:
• Полной отвязке курса от группы
• Удалению всех связанных lesson-groups
• Потере данных о посещаемости и оценках
• Невозможности восстановить связи автоматически

❗ Данное действие необратимо!

Введите "УДАЛИТЬ" для подтверждения:`;

    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'УДАЛИТЬ') {
      alert('❌ Операция отменена. Для подтверждения нужно было ввести "УДАЛИТЬ"');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await groupCourseManagementService.removeCourseFromGroupNew(course.id, groupId);
      
      const successMessage = `✅ Курс "${course.name}" успешно отвязан от группы!

🆕 Использован новый API метод
📊 Все связи между курсом и группой удалены
🔄 Страница будет обновлена для отображения актуальных данных.`;

      alert(successMessage);
      
      // Закрываем модальное окно
      onClose();
      
      // Принудительно обновляем данные группы через callback
      if (onCourseUpdated) {
        onCourseUpdated({
          type: 'removed',
          courseId: course.id,
          courseName: course.name,
          mode: 'new',
          method: 'new_api'
        });
      }
      
      // Обновляем страницу после небольшой задержки
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[CourseManagement] Error removing course with new API:', error);
      
      let errorMessage = `❌ Ошибка при отвязке курса "${course.name}" от группы\n\n`;
      errorMessage += `🆕 Использован новый API метод\n\n`;
      
      if (error.response?.status === 404) {
        errorMessage += '🔍 Курс или группа не найдены (404)\n';
        errorMessage += 'Возможно, курс уже отвязан или данные изменены другим пользователем.';
      } else if (error.response?.status === 500) {
        errorMessage += '🔧 Ошибка сервера (500)\n';
        errorMessage += 'Проблема на стороне сервера. Обратитесь к администратору.';
      } else if (error.message) {
        errorMessage += `📝 Детали ошибки: ${error.message}`;
      } else {
        errorMessage += '🔧 Неизвестная ошибка. Проверьте подключение к интернету.';
      }
      
      setError(errorMessage);
      
      // Даже при ошибке попробуем обновить данные
      if (onCourseUpdated) {
        onCourseUpdated({
          type: 'attempted_removal',
          courseId: course.id,
          courseName: course.name,
          mode: 'new',
          error: errorMessage
        });
      }
      
    } finally {
      setLoading(false);
    }
  };

  // Функции для работы с отдельными уроками
  const handleRemoveSelectedLessons = async () => {
    if (selectedLessons.size === 0) {
      alert('Выберите уроки для удаления');
      return;
    }

    const lessonsList = Array.from(selectedLessons)
      .map(lessonId => {
        const lesson = courseLessons.find(cl => cl.lesson.id === lessonId);
        return lesson ? `• ${lesson.lesson.name}` : `• Урок ID: ${lessonId}`;
      })
      .join('\n');

    const confirmMessage = `⚠️ ВНИМАНИЕ! Вы собираетесь удалить ${selectedLessons.size} уроков из группы:

${lessonsList}

🆕 НОВЫЙ МЕТОД УДАЛЕНИЯ УРОКОВ:
• Использует эндпоинт DELETE /courses/lessons/{lessonId}/groups/${groupId}
• Удаляет только выбранные уроки
• Остальные уроки курса остаются в группе

Это действие приведет к:
• Удалению выбранных уроков из расписания группы
• Потере данных о посещаемости по этим урокам
• Невозможности восстановить данные автоматически

❗ Данное действие необратимо!

Введите "УДАЛИТЬ" для подтверждения:`;

    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'УДАЛИТЬ') {
      alert('❌ Операция отменена. Для подтверждения нужно было ввести "УДАЛИТЬ"');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const lessonIds = Array.from(selectedLessons);
      const result = await groupCourseManagementService.removeMultipleLessonsFromGroup(lessonIds, groupId);

      const successMessage = `✅ Операция удаления уроков завершена!

📊 Статистика:
• Успешно удалено: ${result.successCount} уроков
• Ошибок: ${result.failCount}
• Всего обработано: ${result.totalLessons}

${result.message}

🔄 Обновляем список уроков...`;

      alert(successMessage);

      // Обновляем список уроков
      await loadCourseLessons();
      setSelectedLessons(new Set());

      if (onCourseUpdated) {
        onCourseUpdated({
          type: 'lessons_removed',
          courseId: course.id,
          courseName: course.name,
          removedLessons: result.successCount,
          details: result
        });
      }

    } catch (error) {
      console.error('[CourseManagement] Error removing lessons:', error);
      
      const errorMessage = `❌ Ошибка при удалении уроков

📝 Детали: ${error.message}

💡 Попробуйте:
1. Обновить страницу
2. Выбрать меньше уроков
3. Проверить права доступа`;

      setError(errorMessage);
      alert(errorMessage);

    } finally {
      setLoading(false);
    }
  };

  const toggleLessonSelection = (lessonId) => {
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const selectAllLessons = () => {
    setSelectedLessons(new Set(courseLessons.map(cl => cl.lesson.id)));
  };

  const clearLessonSelection = () => {
    setSelectedLessons(new Set());
  };

  const handleReschedule = async () => {
    if (!scheduleInfo?.hasSchedule) {
      alert('У курса нет настроенного расписания');
      return;
    }

    if (!window.confirm(
      `Изменить расписание всех занятий курса "${course.name}"?\n\n` +
      `Новое расписание:\n` +
      `• День недели: ${dayNames[scheduleForm.dayOfWeek]}\n` +
      `• Время: ${scheduleForm.startTime}\n` +
      `• Продолжительность: ${scheduleForm.durationMinutes} минут\n` +
      `• Начать с: ${new Date(scheduleForm.startDate).toLocaleDateString('ru-RU')}\n` +
      `• Аудитория: ${scheduleForm.auditorium || 'Не указана'}\n\n` +
      `Будет изменено ${scheduleInfo.totalLessons} занятий.`
    )) {
      return;
    }

    try {
      setLoading(true);
      
      const result = await groupCourseManagementService.rescheduleGroupCourseLessons(groupId, course.id, scheduleForm);
      
      if (result.success) {
        alert(
          `Расписание курса "${course.name}" успешно изменено!\n\n` +
          `Обновлено занятий: ${result.updated} из ${result.totalLessons}`
        );
        onCourseUpdated();
        loadScheduleInfo(); // Обновляем информацию
      } else {
        alert(
          `Изменение расписания завершено с ошибками.\n` +
          `Обновлено: ${result.updated}\nОшибок: ${result.failed}`
        );
      }
      
    } catch (error) {
      console.error('Error rescheduling course:', error);
      alert('Ошибка при изменении расписания');
    } finally {
      setLoading(false);
    }
  };

  const updateScheduleForm = (field, value) => {
    setScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content course-management-modal">
        <div className="modal-header">
          <h2>Управление курсом: {course?.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Вкладки */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              📅 Изменить расписание
            </button>
            <button 
              className={`tab ${activeTab === 'lessons' ? 'active' : ''}`}
              onClick={() => setActiveTab('lessons')}
            >
              📚 Управление уроками
            </button>
            <button 
              className={`tab ${activeTab === 'remove' ? 'active' : ''}`}
              onClick={() => setActiveTab('remove')}
            >
              🗑️ Удалить курс
            </button>
            <button 
              className={`tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
              onClick={() => setActiveTab('diagnostics')}
            >
              🔧 Диагностика
            </button>
          </div>

          {loading && (
            <div className="loading-section">
              <p>Загрузка...</p>
            </div>
          )}

          {/* Вкладка изменения расписания */}
          {activeTab === 'schedule' && !loading && (
            <div className="tab-content">
              <div className="schedule-section">
                <div className="schedule-header">
                  <h3>📅 Управление расписанием курса</h3>
                  <p className="schedule-subtitle">
                    Просмотр текущего расписания и массовое изменение времени всех занятий
                  </p>
                </div>
              
                <div className="current-schedule-card">
                  <h4>📊 Текущее расписание</h4>
                  
                  {scheduleInfo?.hasSchedule ? (
                    <div className="schedule-details">
                      <div className="schedule-stats">
                        <div className="stat-item success">
                          <span className="stat-number">{scheduleInfo.totalLessons}</span>
                          <span className="stat-label">всего занятий</span>
                        </div>
                        <div className="stat-item info">
                          <span className="stat-number">{scheduleInfo.duration}мин</span>
                          <span className="stat-label">продолжительность</span>
                        </div>
                      </div>
                      
                      <div className="schedule-info-grid">
                        <div className="schedule-info-item">
                          <span className="label">День недели:</span>
                          <span className="value">{scheduleInfo.dayOfWeek}</span>
                        </div>
                        <div className="schedule-info-item">
                          <span className="label">Время:</span>
                          <span className="value">{scheduleInfo.startTime} — {scheduleInfo.endTime}</span>
                        </div>
                        <div className="schedule-info-item">
                          <span className="label">Аудитория:</span>
                          <span className="value">{scheduleInfo.auditorium}</span>
                        </div>
                        <div className="schedule-info-item">
                          <span className="label">Период:</span>
                          <span className="value">{scheduleInfo.firstLessonDate} — {scheduleInfo.lastLessonDate}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-schedule">
                      <div className="no-schedule-icon">📭</div>
                      <h4>Расписание не найдено</h4>
                      <p>Для этого курса не настроено расписание или занятия не найдены</p>
                    </div>
                  )}
                </div>

                {scheduleInfo?.hasSchedule && (
                  <div className="new-schedule-card">
                    <h4>🔄 Новое расписание</h4>
                    <p className="form-description">
                      Измените параметры ниже, чтобы обновить время всех занятий курса
                    </p>
                    
                    <div className="schedule-form">
                      <div className="form-row">
                        <div className="form-field">
                          <label>День недели:</label>
                          <select 
                            className="form-control"
                            value={scheduleForm.dayOfWeek}
                            onChange={(e) => updateScheduleForm('dayOfWeek', parseInt(e.target.value))}
                          >
                            {dayNames.map((day, index) => (
                              <option key={index} value={index}>{day}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="form-field">
                          <label>Время начала:</label>
                          <input 
                            className="form-control"
                            type="time"
                            value={scheduleForm.startTime}
                            onChange={(e) => updateScheduleForm('startTime', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-field">
                          <label>Продолжительность (минуты):</label>
                          <input 
                            className="form-control"
                            type="number"
                            min="30"
                            max="480"
                            step="15"
                            value={scheduleForm.durationMinutes}
                            onChange={(e) => updateScheduleForm('durationMinutes', parseInt(e.target.value))}
                          />
                        </div>
                        
                        <div className="form-field">
                          <label>Дата первого занятия:</label>
                          <input 
                            className="form-control"
                            type="date"
                            value={scheduleForm.startDate}
                            onChange={(e) => updateScheduleForm('startDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-field full-width">
                          <label>Аудитория:</label>
                          <input 
                            className="form-control"
                            type="text"
                            placeholder="Например: 101, Онлайн, Zoom"
                            value={scheduleForm.auditorium}
                            onChange={(e) => updateScheduleForm('auditorium', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="schedule-preview">
                        <h5>👁️ Предварительный просмотр</h5>
                        <div className="preview-content">
                          <p>
                            <strong>Новое расписание:</strong> {dayNames[scheduleForm.dayOfWeek]}s в {scheduleForm.startTime}, 
                            продолжительность {scheduleForm.durationMinutes} минут
                            {scheduleForm.auditorium && `, аудитория: ${scheduleForm.auditorium}`}
                          </p>
                          <p>
                            <strong>Будет изменено:</strong> {scheduleInfo.totalLessons} занятий
                          </p>
                        </div>
                      </div>

                      <div className="action-section">
                        <button 
                          className="btn-primary reschedule-btn"
                          onClick={handleReschedule}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner">⏳</span>
                              Изменяем расписание...
                            </>
                          ) : (
                            <>
                              <span className="icon">🔄</span>
                              Изменить расписание всех занятий
                            </>
                          )}
                        </button>
                        
                        <p className="confirmation-note">
                          💡 <strong>Внимание:</strong> Это изменит время всех {scheduleInfo.totalLessons} занятий курса
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Вкладка управления уроками */}
          {activeTab === 'lessons' && !loading && (
            <div className="tab-content">
              <div className="lessons-section">
                <div className="lessons-header">
                  <h3>📚 Управление отдельными уроками</h3>
                  <p className="lessons-subtitle">
                    Удаляйте отдельные уроки из группы, не затрагивая весь курс
                  </p>
                </div>

                <div className="lessons-stats-card">
                  <h4>📊 Статистика уроков</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-number">{courseLessons.length}</span>
                      <span className="stat-label">всего уроков</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">{selectedLessons.size}</span>
                      <span className="stat-label">выбрано</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {courseLessons.reduce((sum, cl) => sum + cl.studentsCount, 0)}
                      </span>
                      <span className="stat-label">записей студентов</span>
                    </div>
                  </div>
                </div>

                {courseLessons.length > 0 ? (
                  <>
                    <div className="lessons-controls">
                      <div className="selection-controls">
                        <button 
                          className="btn-secondary"
                          onClick={selectAllLessons}
                          disabled={selectedLessons.size === courseLessons.length}
                        >
                          Выбрать все
                        </button>
                        <button 
                          className="btn-secondary"
                          onClick={clearLessonSelection}
                          disabled={selectedLessons.size === 0}
                        >
                          Снять выбор
                        </button>
                      </div>
                      
                      <div className="action-controls">
                        <button 
                          className="btn-danger"
                          onClick={handleRemoveSelectedLessons}
                          disabled={selectedLessons.size === 0 || loading}
                        >
                          🗑️ Удалить выбранные ({selectedLessons.size})
                        </button>
                      </div>
                    </div>

                    <div className="lessons-list">
                      {courseLessons.map((courseLesson, index) => (
                        <div 
                          key={courseLesson.lesson.id} 
                          className={`lesson-card ${selectedLessons.has(courseLesson.lesson.id) ? 'selected' : ''}`}
                        >
                          <div className="lesson-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedLessons.has(courseLesson.lesson.id)}
                              onChange={() => toggleLessonSelection(courseLesson.lesson.id)}
                            />
                          </div>
                          
                          <div className="lesson-info">
                            <div className="lesson-header">
                              <h5 className="lesson-title">
                                Урок {index + 1}: {courseLesson.lesson.name}
                              </h5>
                              <div className="lesson-badges">
                                <span className="badge students">
                                  👥 {courseLesson.studentsCount} студентов
                                </span>
                                {courseLesson.canRemove && (
                                  <span className="badge removable">✅ Можно удалить</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="lesson-schedule">
                              <div className="schedule-item">
                                <span className="schedule-label">📅 Дата:</span>
                                <span className="schedule-value">
                                  {courseLesson.scheduleInfo.startDateTime.toLocaleDateString('ru-RU')}
                                </span>
                              </div>
                              <div className="schedule-item">
                                <span className="schedule-label">⏰ Время:</span>
                                <span className="schedule-value">
                                  {courseLesson.scheduleInfo.startDateTime.toLocaleTimeString('ru-RU', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} — {courseLesson.scheduleInfo.endDateTime.toLocaleTimeString('ru-RU', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              <div className="schedule-item">
                                <span className="schedule-label">🏢 Аудитория:</span>
                                <span className="schedule-value">
                                  {courseLesson.scheduleInfo.auditorium}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="lesson-actions">
                            <button 
                              className="btn-danger-small"
                              onClick={() => {
                                setSelectedLessons(new Set([courseLesson.lesson.id]));
                                handleRemoveSelectedLessons();
                              }}
                              disabled={loading}
                              title="Удалить только этот урок"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="lessons-info-card">
                      <h4>💡 Информация об удалении уроков</h4>
                      <div className="info-list">
                        <div className="info-item">
                          <span className="info-icon">🆕</span>
                          <div className="info-text">
                            <strong>Новый API метод</strong>
                            <p>Использует эндпоинт DELETE /courses/lessons/{"{lesson_id}"}/groups/{"{group_id}"}</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">🎯</span>
                          <div className="info-text">
                            <strong>Точечное удаление</strong>
                            <p>Удаляются только выбранные уроки, остальные остаются в курсе</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">⚠️</span>
                          <div className="info-text">
                            <strong>Потеря данных</strong>
                            <p>Удаляются записи студентов, посещаемость и оценки по урокам</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon">🔄</span>
                          <div className="info-text">
                            <strong>Необратимость</strong>
                            <p>Восстановить удаленные уроки автоматически невозможно</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="no-lessons-card">
                    <div className="no-lessons-icon">📭</div>
                    <h4>Уроки не найдены</h4>
                    <p>
                      В группе нет уроков этого курса или произошла ошибка загрузки
                    </p>
                    <button 
                      className="btn-secondary"
                      onClick={loadCourseLessons}
                      disabled={loading}
                    >
                      🔄 Обновить список
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Вкладка удаления курса */}
          {activeTab === 'remove' && !loading && (
            <div className="tab-content">
              <div className="danger-zone">
                <div className="danger-header">
                  <h3>⚠️ Отвязка курса от группы</h3>
                  <p className="danger-subtitle">
                    Данная операция полностью отвяжет курс от группы и удалит все связанные данные
                  </p>
                </div>
                
                <div className="course-info-card">
                  <h4>📚 Информация о курсе</h4>
                  <div className="course-details">
                    <div className="detail-item">
                      <span className="label">Название:</span>
                      <span className="value">{course?.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">ID курса:</span>
                      <span className="value">{course?.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Описание:</span>
                      <span className="value">{course?.description || 'Не указано'}</span>
                    </div>
                  </div>
                </div>

                {scheduleInfo?.hasSchedule && (
                  <div className="schedule-impact-card">
                    <h4>📅 Влияние на расписание</h4>
                    <div className="impact-stats">
                      <div className="stat-item danger">
                        <span className="stat-number">{scheduleInfo.totalLessons}</span>
                        <span className="stat-label">занятий будет удалено</span>
                      </div>
                      <div className="stat-item warning">
                        <span className="stat-number">{scheduleInfo.dayOfWeek}</span>
                        <span className="stat-label">день недели</span>
                      </div>
                      <div className="stat-item info">
                        <span className="stat-number">{scheduleInfo.duration}мин</span>
                        <span className="stat-label">продолжительность</span>
                      </div>
                    </div>
                    <div className="schedule-period">
                      <strong>Период:</strong> {scheduleInfo.firstLessonDate} — {scheduleInfo.lastLessonDate}
                    </div>
                  </div>
                )}

                <div className="consequences-card">
                  <h4>🗑️ Что будет удалено</h4>
                  <div className="consequences-list">
                    <div className="consequence-item critical">
                      <span className="icon">👥</span>
                      <div className="text">
                        <strong>Записи студентов</strong>
                        <p>Все записи студентов на занятия этого курса</p>
                      </div>
                    </div>
                    <div className="consequence-item critical">
                      <span className="icon">📊</span>
                      <div className="text">
                        <strong>Данные о посещаемости</strong>
                        <p>Отметки о посещении, опозданиях и пропусках</p>
                      </div>
                    </div>
                    <div className="consequence-item critical">
                      <span className="icon">📝</span>
                      <div className="text">
                        <strong>Домашние задания</strong>
                        <p>Оценки и комментарии по домашним заданиям</p>
                      </div>
                    </div>
                    <div className="consequence-item critical">
                      <span className="icon">🔗</span>
                      <div className="text">
                        <strong>Связь курса с группой</strong>
                        <p>Курс больше не будет отображаться в группе</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="removal-mode-card">
                  <h4>⚙️ Режим удаления курса</h4>
                  <p className="mode-description">
                    Выберите способ отвязки всего курса от группы
                  </p>
                  
                  <div className="mode-selector">
                    <div 
                      className={`mode-option ${removalMode === 'new' ? 'active' : ''}`}
                      onClick={() => setRemovalMode('new')}
                    >
                      <div className="mode-header">
                        <span className="mode-icon">🆕</span>
                        <span className="mode-title">Новый API (рекомендуется)</span>
                        {removalMode === 'new' && <span className="mode-badge">Выбрано</span>}
                      </div>
                      <div className="mode-features">
                        <ul>
                          <li>Использует DELETE /courses/[course_id]/groups/[group_id]</li>
                          <li>Быстрое и чистое удаление всех связей</li>
                          <li>Современный метод для API 2024+</li>
                          <li>Рекомендуется для всех новых операций</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div 
                      className={`mode-option ${removalMode === 'standard' ? 'active' : ''}`}
                      onClick={() => setRemovalMode('standard')}
                    >
                      <div className="mode-header">
                        <span className="mode-icon">🔧</span>
                        <span className="mode-title">Стандартный режим (legacy)</span>
                        {removalMode === 'standard' && <span className="mode-badge">Выбрано</span>}
                      </div>
                      <div className="mode-features">
                        <ul>
                          <li>Удаление записей студентов</li>
                          <li>Безопасная отвязка курса</li>
                          <li>Совместимость со старыми версиями</li>
                          <li>Использовать только при проблемах с новым API</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div 
                      className={`mode-option ${removalMode === 'force' ? 'active' : ''}`}
                      onClick={() => setRemovalMode('force')}
                    >
                      <div className="mode-header">
                        <span className="mode-icon">🔥</span>
                        <span className="mode-title">Принудительный режим (legacy)</span>
                        {removalMode === 'force' && <span className="mode-badge">Выбрано</span>}
                      </div>
                      <div className="mode-features">
                        <ul>
                          <li>Попытка удалить lesson-groups</li>
                          <li>Более агрессивная очистка данных</li>
                          <li>Использовать только в крайних случаях</li>
                          <li>При серьезных проблемах с данными</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="warning-card">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-content">
                    <h4>ВНИМАНИЕ!</h4>
                    <ul>
                      <li>Это действие <strong>необратимо</strong></li>
                      <li>Восстановить удаленные данные будет невозможно</li>
                      <li>Студентам придется заново записываться на курс</li>
                      <li>Вся история обучения по курсу будет потеряна</li>
                    </ul>
                  </div>
                </div>

                {error && (
                  <div className="error-card">
                    <div className="error-icon">❌</div>
                    <div className="error-content">
                      <h4>Ошибка операции</h4>
                      <pre className="error-text">{error}</pre>
                    </div>
                  </div>
                )}

                <div className="action-section">
                  <button 
                    className="btn-danger remove-course-btn"
                    onClick={handleRemoveCourse}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner">⏳</span>
                        {removalMode === 'new' ? 'Отвязываем курс (новый API)...' :
                         removalMode === 'force' ? 'Принудительно отвязываем...' : 'Отвязываем курс...'}
                      </>
                    ) : (
                      <>
                        <span className="icon">
                          {removalMode === 'new' ? '🆕' : removalMode === 'force' ? '🔥' : '🗑️'}
                        </span>
                        {removalMode === 'new' ? 'Отвязать курс (новый API)' :
                         removalMode === 'force' ? 'Принудительно отвязать курс' : 'Отвязать курс от группы'}
                      </>
                    )}
                  </button>
                  
                  <p className="confirmation-note">
                    💡 <strong>Подсказка:</strong> Для подтверждения операции потребуется ввести "УДАЛИТЬ"
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="tab-content">
              <div className="diagnostics-section">
                <div className="diagnostics-header">
                  <h3>🔧 Диагностика системы</h3>
                  <p className="diagnostics-subtitle">
                    Проверьте статус API, актуальность данных и готовность к операциям
                  </p>
                </div>
                
                <div className="current-state-card">
                  <h4>📊 Текущее состояние</h4>
                  <div className="state-grid">
                    <div className="state-item">
                      <span className="state-label">Группа ID:</span>
                      <span className="state-value">{groupId}</span>
                    </div>
                    <div className="state-item">
                      <span className="state-label">Курс:</span>
                      <span className="state-value">{course?.name || 'Не выбран'}</span>
                    </div>
                    <div className="state-item">
                      <span className="state-label">Курс ID:</span>
                      <span className="state-value">{course?.id || 'Не выбран'}</span>
                    </div>
                    <div className="state-item">
                      <span className="state-label">Описание курса:</span>
                      <span className="state-value">{course?.description || 'Не указано'}</span>
                    </div>
                  </div>
                </div>

                <div className="diagnostics-actions">
                  <button 
                    className="btn-primary diagnostics-btn"
                    onClick={handleDiagnostics}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner">⏳</span>
                        Выполняется диагностика...
                      </>
                    ) : (
                      <>
                        <span className="icon">🔍</span>
                        Запустить полную диагностику
                      </>
                    )}
                  </button>
                </div>

                <div className="diagnostics-info-card">
                  <h4>🔍 Что проверяет диагностика</h4>
                  <div className="check-list">
                    <div className="check-item">
                      <span className="check-icon">🌐</span>
                      <div className="check-text">
                        <strong>Доступность API сервера</strong>
                        <p>Проверка соединения с backend и статуса API</p>
                      </div>
                    </div>
                    <div className="check-item">
                      <span className="check-icon">📊</span>
                      <div className="check-text">
                        <strong>Актуальные курсы группы</strong>
                        <p>Получение списка всех активных курсов в группе</p>
                      </div>
                    </div>
                    <div className="check-item">
                      <span className="check-icon">🔗</span>
                      <div className="check-text">
                        <strong>Связи lesson-groups</strong>
                        <p>Анализ связей между уроками, группами и студентами</p>
                      </div>
                    </div>
                    <div className="check-item">
                      <span className="check-icon">📈</span>
                      <div className="check-text">
                        <strong>Статистика данных</strong>
                        <p>Подсчет количества занятий, студентов и связей</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="troubleshooting-card">
                  <h4>🔧 Устранение неполадок</h4>
                  
                  <div className="trouble-section">
                    <h5>❌ Если отвязка курса не работает:</h5>
                    <ol className="trouble-steps">
                      <li>Запустите диагностику для проверки состояния системы</li>
                      <li>Убедитесь, что курс действительно привязан к группе</li>
                      <li>Проверьте, нет ли ошибок в консоли браузера (F12)</li>
                      <li>Обновите страницу и попробуйте снова</li>
                      <li>Проверьте права доступа к группе и курсу</li>
                    </ol>
                  </div>

                  <div className="trouble-section">
                    <h5>⚠️ Распространенные проблемы:</h5>
                    <ul className="trouble-list">
                      <li><strong>Ошибка 500:</strong> Проблема на сервере, обратитесь к администратору</li>
                      <li><strong>Ошибка 404:</strong> Курс или группа не найдены</li>
                      <li><strong>Ошибка 403:</strong> Недостаточно прав доступа</li>
                      <li><strong>Network Error:</strong> Проблемы с подключением к интернету</li>
                    </ul>
                  </div>

                  <div className="trouble-section">
                    <h5>💡 Рекомендации по безопасности:</h5>
                    <ul className="trouble-list">
                      <li>Всегда запускайте диагностику перед важными операциями</li>
                      <li>Создавайте резервные копии данных перед удалением курсов</li>
                      <li>Уведомляйте студентов о предстоящих изменениях</li>
                      <li>Проверяйте актуальность расписания после операций</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseManagementModal;
