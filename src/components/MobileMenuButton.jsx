// src/components/MobileMenuButton.jsx
import React from 'react';

export default function MobileMenuButton({ onClick, isOpen }) {
  return (
    <button 
      className="mobile-menu-button"
      onClick={onClick}
      aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
    >
      {isOpen ? '✕' : '☰'}
    </button>
  );
}
