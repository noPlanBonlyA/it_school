// src/hooks/useMobileKeyboard.js
import { useEffect, useCallback } from 'react';

/**
 * Хук для обработки появления/исчезновения мобильной клавиатуры
 * Автоматически управляет CSS переменными и классами для адаптации интерфейса
 */
export const useMobileKeyboard = () => {
  // Определяем высоту viewport без клавиатуры
  const getInitialViewportHeight = useCallback(() => {
    return window.innerHeight;
  }, []);

  // Обновляем CSS переменные для высоты клавиатуры
  const updateKeyboardHeight = useCallback((keyboardHeight) => {
    document.documentElement.style.setProperty(
      '--keyboard-height', 
      `${keyboardHeight}px`
    );
  }, []);

  // Добавляем/убираем классы для состояния клавиатуры
  const setKeyboardVisibility = useCallback((isVisible) => {
    const body = document.body;
    
    if (isVisible) {
      body.classList.add('keyboard-visible');
      body.classList.remove('keyboard-hidden');
    } else {
      body.classList.add('keyboard-hidden');
      body.classList.remove('keyboard-visible');
      // Сбрасываем высоту клавиатуры
      updateKeyboardHeight(0);
    }
  }, [updateKeyboardHeight]);

  useEffect(() => {
    // Проверяем, что мы на мобильном устройстве
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768;

    if (!isMobile) {
      return;
    }

    let initialViewportHeight = getInitialViewportHeight();
    let resizeTimeout;

    // Обработчик изменения размера viewport
    const handleResize = () => {
      // Дебаунсинг для предотвращения множественных вызовов
      clearTimeout(resizeTimeout);
      
      resizeTimeout = setTimeout(() => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        // Порог для определения появления клавиатуры (150px)
        const keyboardThreshold = 150;
        
        if (heightDifference > keyboardThreshold) {
          // Клавиатура появилась
          const keyboardHeight = heightDifference;
          updateKeyboardHeight(keyboardHeight);
          setKeyboardVisibility(true);
          
          console.log(`Keyboard detected: ${keyboardHeight}px`);
        } else {
          // Клавиатура скрыта
          setKeyboardVisibility(false);
          console.log('Keyboard hidden');
        }
      }, 100);
    };

    // Обработчик изменения ориентации экрана
    const handleOrientationChange = () => {
      // Небольшая задержка для корректного получения новых размеров
      setTimeout(() => {
        initialViewportHeight = getInitialViewportHeight();
        setKeyboardVisibility(false);
      }, 500);
    };

    // Обработчик фокуса на элементах ввода
    const handleInputFocus = (event) => {
      const target = event.target;
      
      // Проверяем, что это поле ввода
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Плавная прокрутка к элементу через небольшую задержку
        setTimeout(() => {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }, 300);
      }
    };

    // Обработчик потери фокуса
    const handleInputBlur = () => {
      // Небольшая задержка перед проверкой, так как клавиатура может не исчезнуть сразу
      setTimeout(() => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        if (heightDifference <= 50) {
          setKeyboardVisibility(false);
        }
      }, 200);
    };

    // Добавляем обработчики событий
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    document.addEventListener('focusin', handleInputFocus, { passive: true });
    document.addEventListener('focusout', handleInputBlur, { passive: true });

    // Обработчик для Visual Viewport API (более точный для iOS)
    if ('visualViewport' in window) {
      const handleVisualViewportChange = () => {
        const viewport = window.visualViewport;
        const keyboardHeight = window.innerHeight - viewport.height;
        
        if (keyboardHeight > 50) {
          updateKeyboardHeight(keyboardHeight);
          setKeyboardVisibility(true);
        } else {
          setKeyboardVisibility(false);
        }
      };

      window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true });
      
      // Cleanup для Visual Viewport API
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        document.removeEventListener('focusin', handleInputFocus);
        document.removeEventListener('focusout', handleInputBlur);
        
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
        }
        
        // Сбрасываем состояние
        setKeyboardVisibility(false);
        clearTimeout(resizeTimeout);
      };
    }

    // Cleanup для обычных обработчиков
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('focusin', handleInputFocus);
      document.removeEventListener('focusout', handleInputBlur);
      
      // Сбрасываем состояние
      setKeyboardVisibility(false);
      clearTimeout(resizeTimeout);
    };
  }, [getInitialViewportHeight, updateKeyboardHeight, setKeyboardVisibility]);

  // Возвращаем утилитарные функции для ручного управления
  return {
    setKeyboardVisibility,
    updateKeyboardHeight
  };
};

export default useMobileKeyboard;
