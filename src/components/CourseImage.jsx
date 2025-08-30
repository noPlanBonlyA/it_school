import React, { useState } from 'react';
import '../styles/CourseImageStyles.css';

const CourseImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = '📚',
  onLoad,
  onError 
}) => {
  const [imageStatus, setImageStatus] = useState('loading');
  const [imageSrc, setImageSrc] = useState(src);

  // Обрабатываем разные форматы URL
  const getProcessedImageUrl = (url) => {
    if (!url) return null;
    
    // Если URL уже полный
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Если относительный путь, добавляем базовый URL
    if (url.startsWith('/')) {
      return `${window.location.protocol}//${window.location.hostname}:8080${url}`;
    }
    
    return url;
  };

  const handleImageLoad = (e) => {
    setImageStatus('loaded');
    if (onLoad) onLoad(e);
  };

  const handleImageError = (e) => {
    setImageStatus('error');
    if (onError) onError(e);
  };

  const processedSrc = getProcessedImageUrl(imageSrc);

  return (
    <div className={`course-image-container ${className}`}>
      {imageStatus === 'loading' && (
        <div className="course-image-loading">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {imageStatus === 'error' && (
        <div className="course-image-error">
          <div className="error-icon">⚠️</div>
          <div className="error-text">Изображение недоступно</div>
        </div>
      )}
      
      {!processedSrc && (
        <div className="course-image-placeholder">
          {placeholder}
        </div>
      )}
      
      {processedSrc && (
        <img
          src={processedSrc}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            display: imageStatus === 'loaded' ? 'block' : 'none'
          }}
        />
      )}
    </div>
  );
};

export default CourseImage;
