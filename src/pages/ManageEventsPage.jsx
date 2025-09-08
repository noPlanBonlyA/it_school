// src/pages/ManageEventsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import EventCreateModal from '../components/EventCreateModal';
import EventEditModal from '../components/EventEditModal';
import {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventWithUsers
} from '../services/eventService';
import '../styles/ManageEventsPage.css';
import '../styles/EventModals.css'; // новый импорт

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Состояния
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // UI состояния
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  // Проверка прав доступа
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!['admin', 'superadmin'].includes(user.role)) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Загрузка событий
  useEffect(() => {
    loadEvents();
  }, []);

  // Поиск
  useEffect(() => {
    if (!search.trim()) {
      setFiltered([]);
      setShowSuggestions(false);
    } else {
      const results = events.filter(event =>
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase()) ||
        event.auditorium.toLowerCase().includes(search.toLowerCase())
      );
      setFiltered(results);
      setShowSuggestions(true);
    }
  }, [search, events]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getAllEvents({ limit: 100 });
      setEvents(data.objects || []);
    } catch (error) {
      console.error('Error loading events:', error);
      alert('Ошибка загрузки мероприятий');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (eventData) => {
    try {
      const createdEvent = await createEvent(eventData);
      setShowCreateModal(false);
      await loadEvents();
      return createdEvent; // Возвращаем созданное событие для использования в EventCreateModal
    } catch (error) {
      console.error('Error creating event:', error);
      throw error; // Пробрасываем ошибку, чтобы EventCreateModal мог её обработать
    }
  };

  const handleEdit = async (event) => {
    try {
      // Получаем полную информацию о событии с участниками
      const eventWithUsers = await getEventWithUsers(event.id);
      setEditingEvent({ ...event, users: eventWithUsers.users || [] });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading event details:', error);
      setEditingEvent(event);
      setShowEditModal(true);
    }
  };

  const handleUpdate = async (eventData) => {
    try {
      await updateEvent(editingEvent.id, eventData);
      alert('Мероприятие успешно обновлено!');
      setShowEditModal(false);
      setEditingEvent(null);
      await loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Ошибка обновления мероприятия');
    }
  };

  const handleDelete = (event) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      await deleteEvent(eventToDelete.id);
      alert('Мероприятие успешно удалено!');
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Ошибка удаления мероприятия');
    } finally {
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'Не указано';
    const date = new Date(dateTime);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventActive = (event) => {
    const now = new Date();
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);
    return now >= start && now <= end;
  };

  const isEventUpcoming = (event) => {
    const now = new Date();
    const start = new Date(event.start_datetime);
    return start > now;
  };

  const displayedEvents = search.trim() ? filtered : events;

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar activeItem="manage-events" userRole={user?.role} />
        <div className="main-content">
          <div className="loading-container">
            <div className="loader"></div>
            <p>Загрузка мероприятий...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="manage-events" userRole={user?.role} />
      <div className="main-content">
        <SmartTopBar />
        <div className="manage-events-page">
          <div className="page-header">
            <div className="header-info">
              <h1>Управление мероприятиями</h1>
              <p>Создание и управление событиями и мероприятиями</p>
            </div>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              + Создать мероприятие
            </button>
          </div>

          {/* Поиск */}
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск мероприятий..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              {showSuggestions && filtered.length > 0 && (
                <div className="search-suggestions">
                  {filtered.slice(0, 5).map(event => (
                    <div 
                      key={event.id} 
                      className="suggestion-item"
                      onClick={() => {
                        setSearch(event.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {event.name} - {formatDateTime(event.start_datetime)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Список мероприятий */}
          <div className="events-grid">
            {displayedEvents.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📅</span>
                <h3>Мероприятия не найдены</h3>
                <p>Создайте первое мероприятие для отображения здесь</p>
              </div>
            ) : (
              displayedEvents.map(event => (
                <div 
                  key={event.id} 
                  className={`event-card ${
                    isEventActive(event) ? 'active' : 
                    isEventUpcoming(event) ? 'upcoming' : 'past'
                  }`}
                >
                  <div className="event-header">
                    <h3>{event.name}</h3>
                    <div className="event-status">
                      {isEventActive(event) && <span className="status-badge active">Сейчас</span>}
                      {isEventUpcoming(event) && <span className="status-badge upcoming">Предстоящее</span>}
                      {!isEventActive(event) && !isEventUpcoming(event) && <span className="status-badge past">Завершено</span>}
                    </div>
                  </div>
                  
                  <div className="event-info">
                    <div className="event-time">
                      <span className="time-label">Начало:</span>
                      <span className="time-value">{formatDateTime(event.start_datetime)}</span>
                    </div>
                    <div className="event-time">
                      <span className="time-label">Окончание:</span>
                      <span className="time-value">{formatDateTime(event.end_datetime)}</span>
                    </div>
                    {event.auditorium && (
                      <div className="event-location">
                        <span className="location-icon">📍</span>
                        <span>{event.auditorium}</span>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}

                  <div className="event-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => handleEdit(event)}
                    >
                      Редактировать
                    </button>
                    <button 
                      className="btn-danger"
                      onClick={() => handleDelete(event)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Модальное окно создания */}
        {showCreateModal && (
          <EventCreateModal
            onSave={handleCreate}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {/* Модальное окно редактирования */}
        {showEditModal && editingEvent && (
          <EventEditModal
            event={editingEvent}
            onSave={handleUpdate}
            onClose={() => {
              setShowEditModal(false);
              setEditingEvent(null);
            }}
          />
        )}

        {/* Модальное окно подтверждения удаления */}
        {showDeleteConfirm && (
          <div className="events-modal-overlay">
             <div className="modal-content small">
               <div className="modal-header">
                 <h2>Подтверждение удаления</h2>
               </div>
               <div className="modal-body">
                 <p>Вы уверены, что хотите удалить мероприятие "{eventToDelete?.name}"?</p>
                 <p className="warning-text">Это действие нельзя отменить.</p>
               </div>
               <div className="modal-actions">
                 <button 
                   className="btn-danger"
                   onClick={confirmDelete}
                 >
                   Удалить
                 </button>
                 <button 
                   className="btn-secondary"
                   onClick={() => {
                     setShowDeleteConfirm(false);
                     setEventToDelete(null);
                   }}
                 >
                   Отмена
                 </button>
               </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
