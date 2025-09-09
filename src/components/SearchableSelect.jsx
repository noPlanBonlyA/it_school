// src/components/SearchableSelect.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../styles/SearchableSelect.css';

export default function SearchableSelect({
  items = [],
  value = '',
  onChange,
  placeholder = 'Поиск...',
  displayField = 'name',
  valueField = 'id',
  renderItem,
  noResultsText = 'Ничего не найдено',
  className = '',
  disabled = false,
  icon = '🔍'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Обновляем выбранный элемент при изменении value
  useEffect(() => {
    if (value) {
      const item = items.find(item => item[valueField] === value);
      setSelectedItem(item);
    } else {
      setSelectedItem(null);
    }
  }, [value, items, valueField]);

  // Фильтрация элементов
  useEffect(() => {
    if (!search.trim()) {
      setFilteredItems(items);
      return;
    }

    const searchLower = search.toLowerCase().trim();
    const filtered = items.filter(item => {
      // Поиск по основному полю отображения
      const mainField = (item[displayField] || '').toString().toLowerCase();
      
      // Дополнительные поля для поиска (для студентов и групп)
      const additionalFields = [];
      
      // Для студентов ищем по ФИО и username
      if (item.user) {
        const fio = [
          item.user.first_name,
          item.user.surname,
          item.user.patronymic
        ].filter(Boolean).join(' ').toLowerCase();
        additionalFields.push(fio, (item.user.username || '').toLowerCase());
      }
      
      // Для групп ищем по названию и описанию
      if (item.description) {
        additionalFields.push((item.description || '').toLowerCase());
      }

      return mainField.includes(searchLower) ||
             additionalFields.some(field => field.includes(searchLower));
    });

    setFilteredItems(filtered);
  }, [search, items, displayField]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    onChange(item[valueField]);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedItem(null);
    onChange('');
    setSearch('');
  };

  const getDisplayText = () => {
    if (!selectedItem) return '';
    
    if (renderItem) {
      // Используем рендер функцию, но извлекаем только текст
      const rendered = renderItem(selectedItem);
      if (typeof rendered === 'string') return rendered;
      return selectedItem[displayField];
    }
    
    return selectedItem[displayField];
  };

  const defaultRenderItem = (item) => {
    if (renderItem) {
      return renderItem(item);
    }

    // Дефолтный рендер для студентов
    if (item.user) {
      const fio = [item.user.first_name, item.user.surname].filter(Boolean).join(' ');
      return (
        <div className="searchable-item-content">
          <div className="item-main">
            {fio || item.user.username || 'Без имени'}
          </div>
          {fio && item.user.username && (
            <div className="item-secondary">@{item.user.username}</div>
          )}
        </div>
      );
    }

    // Дефолтный рендер для групп
    return (
      <div className="searchable-item-content">
        <div className="item-main">{item[displayField]}</div>
        {item.description && (
          <div className="item-secondary">{item.description}</div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`searchable-select ${className} ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
    >
      <div className="searchable-input-container" onClick={handleInputClick}>
        <div className="searchable-icon">{icon}</div>
        
        <input
          ref={inputRef}
          type="text"
          className="searchable-input"
          placeholder={selectedItem ? getDisplayText() : placeholder}
          value={isOpen ? search : (selectedItem ? getDisplayText() : '')}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          readOnly={!isOpen}
        />
        
        {selectedItem && (
          <button
            type="button"
            className="searchable-clear"
            onClick={handleClear}
            disabled={disabled}
          >
            ×
          </button>
        )}
        
        <div className={`searchable-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </div>
      </div>

      {isOpen && (
        <div className="searchable-dropdown">
          {filteredItems.length > 0 ? (
            <div className="searchable-items">
              {filteredItems.map(item => (
                <div
                  key={item[valueField]}
                  className={`searchable-item ${selectedItem && selectedItem[valueField] === item[valueField] ? 'selected' : ''}`}
                  onClick={() => handleItemSelect(item)}
                >
                  {defaultRenderItem(item)}
                </div>
              ))}
            </div>
          ) : (
            <div className="searchable-no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">{noResultsText}</div>
            </div>
          )}
          
          {items.length > 0 && (
            <div className="searchable-footer">
              Показано {filteredItems.length} из {items.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
