// src/pages/HomeworkPage.jsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/TopBar';
import '../styles/HomeworkPage.css';

export default function HomeworkPage() {
  // Пример данных: группы и темы и домашки студентов
  const groupsData = [
    {
      id: 'g1',
      name: 'Группа 33',
      topics: [
        {
          id: 't1',
          title: 'Тема 1: Основы JavaScript',
          submissions: [
            { id: 's1', student: 'Иванов И.И.', fileName: 'dz1_ivanov.pdf', comment: '', grade: '' },
            { id: 's2', student: 'Петров П.П.', fileName: 'dz1_petrov.pdf', comment: '', grade: '' }
          ]
        },
        {
          id: 't2',
          title: 'Тема 2: Работа с DOM',
          submissions: [
            { id: 's3', student: 'Сидорова С.С.', fileName: 'dz2_sidorova.pdf', comment: '', grade: '' },
            { id: 's4', student: 'Кузнецов К.К.', fileName: 'dz2_kuznetsov.pdf', comment: '', grade: '' }
          ]
        }
      ]
    },
    {
      id: 'g2',
      name: 'Группа 42',
      topics: [
        {
          id: 't3',
          title: 'Тема 1: Основы Python',
          submissions: [
            { id: 's5', student: 'Лебедева Л.Л.', fileName: 'dz1_lebedeva.pdf', comment: '', grade: '' },
            { id: 's6', student: 'Фролов Ф.Ф.', fileName: 'dz1_frolov.pdf', comment: '', grade: '' }
          ]
        }
      ]
    }
  ];

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [data, setData] = useState(groupsData);

  // Найти выбранную группу и тему
  const selectedGroup = data.find(g => g.id === selectedGroupId);
  const selectedTopic = selectedGroup
    ? selectedGroup.topics.find(t => t.id === selectedTopicId)
    : null;

  // Обработчик выбора группы
  function handleSelectGroup(groupId) {
    setSelectedGroupId(groupId);
    setSelectedTopicId(null);
    setExpandedSubmission(null);
  }

  // Обработчик выбора темы
  function handleSelectTopic(topicId) {
    setSelectedTopicId(topicId);
    setExpandedSubmission(null);
  }

  // Обработчики обновления комментария и оценки в состоянии
  function handleCommentChange(subId, value) {
    setData(prev =>
      prev.map(g => ({
        ...g,
        topics: g.topics.map(t => ({
          ...t,
          submissions: t.submissions.map(s =>
            s.id === subId ? { ...s, comment: value } : s
          )
        }))
      }))
    );
  }

  function handleGradeChange(subId, value) {
    setData(prev =>
      prev.map(g => ({
        ...g,
        topics: g.topics.map(t => ({
          ...t,
          submissions: t.submissions.map(s =>
            s.id === subId ? { ...s, grade: value } : s
          )
        }))
      }))
    );
  }

  // Обработчик клика на домашку: разворачиваем секцию
  function handleToggleSubmission(subId) {
    setExpandedSubmission(prev => (prev === subId ? null : subId));
  }

  // Сохранить (в будущем отправка на бэк)
  function handleSave(subId) {
    alert('Комментарий и оценка сохранены для ' + subId);
    setExpandedSubmission(null);
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="homework" userRole="teacher" />

      <div className="main-content">
        <Topbar
          userName="Бойцев Антон"
          userRole="teacher"
          onBellClick={() => {}}
          onProfileClick={() => {}}
        />

        <div className="content-area homework-page">
          <h1>Домашние задания</h1>
          <div className="homework-grid">
            {/* Колонка 1: Список групп */}
            <div className="column groups-col">
              <h2>Группы</h2>
              <ul className="groups-list">
                {data.map(group => (
                  <li
                    key={group.id}
                    className={group.id === selectedGroupId ? 'selected' : ''}
                    onClick={() => handleSelectGroup(group.id)}
                  >
                    {group.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Колонка 2: Список тем */}
            <div className="column topics-col">
              <h2>Темы</h2>
              {selectedGroup ? (
                <ul className="topics-list">
                  {selectedGroup.topics.map(topic => (
                    <li
                      key={topic.id}
                      className={topic.id === selectedTopicId ? 'selected' : ''}
                      onClick={() => handleSelectTopic(topic.id)}
                    >
                      {topic.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="placeholder">Выберите группу</div>
              )}
            </div>

            {/* Колонка 3: Список домашних работ по теме */}
            <div className="column submissions-col">
              <h2>Домашки</h2>
              {selectedTopic ? (
                selectedTopic.submissions.map(sub => (
                  <div key={sub.id} className="submission-item">
                    <div
                      className="submission-header"
                      onClick={() => handleToggleSubmission(sub.id)}
                    >
                      <span className="student-name">{sub.student}</span>
                      <span className="file-name">{sub.fileName}</span>
                    </div>
                    {expandedSubmission === sub.id && (
                      <div className="submission-details">
                        <textarea
                          placeholder="Комментарий"
                          value={sub.comment}
                          onChange={e => handleCommentChange(sub.id, e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Оценка"
                          value={sub.grade}
                          onChange={e => handleGradeChange(sub.id, e.target.value)}
                        />
                        <div className="details-buttons">
                          <button
                            className="btn-primary"
                            onClick={() => handleSave(sub.id)}
                          >
                            Сохранить
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setExpandedSubmission(null)}
                          >
                            Отменить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="placeholder">Выберите тему</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
