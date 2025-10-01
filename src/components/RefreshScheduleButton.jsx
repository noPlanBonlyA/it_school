// src/components/RefreshScheduleButton.jsx

import React, { useState } from 'react';
import { refreshGroupSchedule } from '../services/groupScheduleService';
import ScheduleUpdateResultModal from './ScheduleUpdateResultModal';
import '../styles/RefreshScheduleButton.css';

export default function RefreshScheduleButton({ 
  groupId, 
  courseId, 
  courseName, 
  courses, // массив курсов для группы
  variant = "default", // "default" или "small"
  onRefresh 
}) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const handleRefresh = async () => {
    if (!groupId) {
      alert('Не указан ID группы');
      return;
    }

    // Определяем, с чем работаем - с одним курсом или массивом
    let coursesToUpdate = [];
    
    if (courseId) {
      // Работаем с одним курсом
      coursesToUpdate = [{ id: courseId, name: courseName || 'курс' }];
    } else if (courses && courses.length > 0) {
      // Работаем с массивом курсов
      coursesToUpdate = courses.map(course => ({
        id: course.id,
        name: course.name || 'курс'
      }));
    } else {
      alert('Нет курсов для обновления расписания');
      return;
    }

    try {
      setLoading(true);
      
      const allResults = [];
      let totalAdded = 0;
      let totalExisting = 0;
      let totalLessons = 0;
      
      // Обновляем расписание для каждого курса
      for (const course of coursesToUpdate) {
        try {
          const result = await refreshGroupSchedule(groupId, course.id);
          
          allResults.push({
            course: course.name,
            success: true,
            ...result
          });
          
          totalAdded += result.added || 0;
          totalExisting += result.existing || 0;
          totalLessons += result.total || 0;
          
        } catch (error) {
          console.error(`Error refreshing schedule for course ${course.name}:`, error);
          allResults.push({
            course: course.name,
            success: false,
            error: error.message
          });
        }
      }
      
      // Формируем сообщение о результатах
      const successCount = allResults.filter(r => r.success).length;
      const failCount = allResults.filter(r => !r.success).length;
      
      // Подготавливаем данные для модального окна
      const resultData = {
        success: successCount > 0,
        totalCourses: coursesToUpdate.length,
        successCount,
        failCount,
        totalAdded,
        totalExisting,
        totalLessons,
        results: allResults
      };
      
      // Открываем модальное окно с результатами
      setModalData(resultData);
      setModalOpen(true);
      
      // Уведомляем родительский компонент об обновлении
      if (onRefresh) {
        onRefresh(resultData);
      }
      
    } catch (error) {
      console.error('Error refreshing schedule:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      if (error.response?.data?.detail) {
        errorMessage = Array.isArray(error.response.data.detail) 
          ? error.response.data.detail.map(err => err.msg).join(', ')
          : error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`❌ Ошибка обновления расписания:\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayText = () => {
    if (courseId) {
      return `Обновить расписание для курса "${courseName || 'курс'}"`;
    } else if (courses && courses.length > 0) {
      return `Обновить расписание для всех курсов (${courses.length})`;
    }
    return 'Обновить расписание';
  };

  const getButtonText = () => {
    if (loading) {
      return variant === "small" ? "Обновляется..." : "Обновляется...";
    }
    
    if (variant === "small") {
      return "🔄 Обновить";
    }
    
    return "🔄 Обновить расписание";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className={`refresh-schedule-btn ${variant === "small" ? "compact" : ""}`}
        title={getDisplayText()}
      >
        {loading ? (
          <>
            <span className="refresh-icon spinning">🔄</span>
            <span>{getButtonText()}</span>
          </>
        ) : (
          <span>{getButtonText()}</span>
        )}
      </button>

      <ScheduleUpdateResultModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </>
  );
}
