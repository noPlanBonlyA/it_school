// src/hooks/useConfirm.js

import { useState, useCallback } from 'react';

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Да',
    cancelText: 'Отмена',
    type: 'default',
    onConfirm: null,
    onCancel: null
  });

  const showConfirm = useCallback(({
    title = "Подтверждение",
    message,
    confirmText = "Да",
    cancelText = "Отмена",
    type = "default"
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirmState,
    showConfirm,
    hideConfirm
  };
};
