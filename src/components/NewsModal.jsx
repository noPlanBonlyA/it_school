import React from 'react';
import PropTypes from 'prop-types';
import '../styles/HomeNews.css';

export default function NewsModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="news-modal-content">
          {item.image_url && (
            <div className="news-modal-image-container">
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="news-modal-image"
              />
            </div>
          )}
          
          <div className="news-modal-text">
            <h2 className="news-modal-title">{item.name}</h2>
            
            <div className="news-modal-date">
              📅 {new Date(item.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            
            {item.is_pinned && (
              <div className="news-modal-pinned">
                📌 Закреплённая новость
              </div>
            )}
            
            {item.description && (
              <div className="news-modal-description">
                {item.description.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index}>
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
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
