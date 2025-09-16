// src/components/MobileEnhancedSearch.jsx
import React from 'react';
import MobileSearchBox from './MobileSearchBox';

/**
 * Компонент для замены стандартного поиска в страницах управления
 * Использует MobileSearchBox с предустановленными настройками
 */
const MobileEnhancedSearch = ({
  search,
  setSearch,
  filtered,
  showSuggestions,
  setShowSuggestions,
  onSelect,
  onViewDetails,
  placeholder = "Поиск по логину или ФИО",
  renderSuggestion,
  className = ""
}) => {
  // Функция рендеринга предложения по умолчанию
  const defaultRenderSuggestion = (item) => {
    const u = item.user;
    const fio = [u.first_name, u.surname, u.patronymic].filter(Boolean).join(' ');
    
    return {
      id: u.id,
      text: `${u.username || '(без логина)'} — ${fio || '(ФИО не заполнено)'}`,
      details: u.email ? `${u.email}` : '',
      action: onViewDetails ? {
        icon: "👁️",
        title: "Подробная информация",
        onClick: () => onViewDetails(item)
      } : null
    };
  };

  // Подготавливаем suggestions для MobileSearchBox
  const suggestions = filtered.map(renderSuggestion || defaultRenderSuggestion);

  const handleSuggestionClick = (suggestion) => {
    // Находим оригинальный элемент по ID
    const originalItem = filtered.find(item => item.user.id === suggestion.id);
    if (originalItem && onSelect) {
      onSelect(originalItem);
    }
    setShowSuggestions(false);
    setSearch('');
  };

  return (
    <div className={`search-block ${className}`}>
      <MobileSearchBox
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // Задержка для обработки кликов по suggestions
          setTimeout(() => setShowSuggestions(false), 300);
        }}
        placeholder={placeholder}
        suggestions={suggestions}
        onSuggestionClick={handleSuggestionClick}
        showSuggestions={showSuggestions && filtered.length > 0}
      />
    </div>
  );
};

export default MobileEnhancedSearch;
