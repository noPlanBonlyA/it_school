// src/components/MobileSearchBox.jsx
import React, { useState, useRef, useEffect } from 'react';
import '../styles/MobileKeyboardFix.css';

/**
 * Улучшенный компонент поиска для мобильных устройств
 * Автоматически адаптируется к появлению клавиатуры
 */
const MobileSearchBox = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Поиск...",
  suggestions = [],
  onSuggestionClick,
  showSuggestions = false,
  className = "",
  ...props
}) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Отслеживаем состояние клавиатуры
  useEffect(() => {
    const checkKeyboardState = () => {
      const hasKeyboardClass = document.body.classList.contains('keyboard-visible');
      setIsKeyboardVisible(hasKeyboardClass);
    };

    // Проверяем состояние при монтировании
    checkKeyboardState();

    // Отслеживаем изменения класса на body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkKeyboardState();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const handleFocus = (e) => {
    setIsFocused(true);
    
    // Небольшая задержка для прокрутки к элементу
    setTimeout(() => {
      if (inputRef.current && isKeyboardVisible) {
        inputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);

    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    // Задержка чтобы дать время для клика по suggestions
    setTimeout(() => {
      setIsFocused(false);
    }, 200);

    if (onBlur) onBlur(e);
  };

  const handleSuggestionClick = (suggestion, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsFocused(false);
    
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  const shouldShowSuggestions = showSuggestions && suggestions.length > 0 && (isFocused || value.length > 0);

  return (
    <div 
      ref={containerRef}
      className={`mobile-search-container ${className}`}
      style={{ position: 'relative' }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`mobile-search-input ${isFocused ? 'focused' : ''} ${isKeyboardVisible ? 'keyboard-active' : ''}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        {...props}
      />
      
      {shouldShowSuggestions && (
        <div 
          className={`mobile-suggestions ${isKeyboardVisible ? 'keyboard-mode' : 'normal-mode'}`}
          style={{
            position: isKeyboardVisible ? 'fixed' : 'absolute',
            zIndex: isKeyboardVisible ? 10000 : 100
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id || index}
              className="mobile-suggestion-item"
              onClick={(e) => handleSuggestionClick(suggestion, e)}
              onMouseDown={(e) => e.preventDefault()} // Предотвращаем blur при клике
            >
              {typeof suggestion === 'string' ? (
                <span className="suggestion-text">{suggestion}</span>
              ) : (
                <>
                  <span className="suggestion-text">{suggestion.text || suggestion.name}</span>
                  {suggestion.details && (
                    <span className="suggestion-details">{suggestion.details}</span>
                  )}
                  {suggestion.action && (
                    <button
                      className="suggestion-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (suggestion.action.onClick) {
                          suggestion.action.onClick(suggestion);
                        }
                      }}
                      title={suggestion.action.title}
                    >
                      {suggestion.action.icon || "👁️"}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileSearchBox;
