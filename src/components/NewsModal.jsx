import React from 'react';
import PropTypes from 'prop-types';
import '../styles/NewsModal.css';

export default function NewsModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 className="modal-title">{item.name}</h2>
        {item.image_url && (
          <img src={item.image_url} alt="" className="news-image"/>
        )}
        <time className="news-date">
          {new Date(item.created_at).toLocaleString('ru-RU', {
            day:'2-digit', month:'2-digit', year:'numeric',
            hour:'2-digit', minute:'2-digit'
          })}
        </time>
        <p className="news-text">{item.description}</p>
      </div>
    </div>
  );
}

NewsModal.propTypes = {
  item: PropTypes.shape({
    id:           PropTypes.string,
    name:         PropTypes.string,
    description:  PropTypes.string,
    created_at:   PropTypes.string,
    image_url:    PropTypes.string,
    is_pinned:    PropTypes.bool
  }),
  onClose: PropTypes.func.isRequired
};
