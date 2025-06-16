/*  src/components/Schedule.jsx
    Упрощённый список занятий     */

import '../styles/Schedule.css';

export default function Schedule({ events = [], onSelect = () => {} }) {
  if (!events.length) return <p className="empty-text">Нет занятий</p>;

  return (
    <ul className="schedule-list">
      {events.map(ev => (
        <li key={ev.id} onClick={() => onSelect(ev)}>
          <span className="time">
            {new Date(ev.holding_date || ev.start).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
          </span>
          <span className="title">{ev.lesson_name}</span>
          {/* мелкий шрифт – группа/препод */}
          <span className="meta">
            {ev.group_name ? `гр. ${ev.group_name}` : ev.teacher_name}
          </span>
          {/* Дата проведения */}
          <span className="date">
            {new Date(ev.holding_date || ev.start).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit', 
              year: 'numeric'
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
