// src/components/MaterialUploader.jsx
import React, { useState } from 'react';
import '../styles/MaterialUploader.css';

const MaterialUploader = ({ 
  materialType, 
  currentMaterial, 
  onMaterialChange, 
  icon, 
  title 
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const [newText, setNewText] = useState(currentMaterial?.text || '');
  const [newFile, setNewFile] = useState(null);
  const [uploadType, setUploadType] = useState('text'); // 'text' или 'file'

  const handleStartChange = () => {
    setIsChanging(true);
    setNewText(currentMaterial?.text || '');
    setNewFile(null);
  };

  const handleSaveChange = () => {
    if (uploadType === 'text' && newText.trim()) {
      onMaterialChange(materialType, {
        type: 'text',
        text: newText,
        name: `${title} (текст)`
      });
    } else if (uploadType === 'file' && newFile) {
      onMaterialChange(materialType, {
        type: 'file',
        file: newFile,
        name: newFile.name
      });
    }
    setIsChanging(false);
  };

  const handleCancel = () => {
    setIsChanging(false);
    setNewText(currentMaterial?.text || '');
    setNewFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setNewFile(file);
  };

  return (
    <div className="material-uploader">
      <div className="material-header">
        <span className="material-icon">{icon}</span>
        <h5 className="material-title">{title}</h5>
      </div>

      {!isChanging ? (
        <div className="material-current">
          {currentMaterial?.name ? (
            <div className="current-material">
              <div className="material-info">
                <span className="material-name">{currentMaterial.name}</span>
                {currentMaterial.text && (
                  <div className="material-preview">
                    {currentMaterial.text.length > 100 
                      ? `${currentMaterial.text.substring(0, 100)}...`
                      : currentMaterial.text
                    }
                  </div>
                )}
              </div>
              <button 
                className="btn-change"
                onClick={handleStartChange}
              >
                ✏️ Изменить
              </button>
            </div>
          ) : (
            <div className="no-material">
              <span className="no-material-text">Материал не добавлен</span>
              <button 
                className="btn-add"
                onClick={handleStartChange}
              >
                ➕ Добавить
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="material-editor">
          <div className="upload-type-selector">
            <label className="radio-option">
              <input
                type="radio"
                name={`uploadType-${materialType}`}
                value="text"
                checked={uploadType === 'text'}
                onChange={() => setUploadType('text')}
              />
              📝 Текст
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name={`uploadType-${materialType}`}
                value="file"
                checked={uploadType === 'file'}
                onChange={() => setUploadType('file')}
              />
              📎 Файл
            </label>
          </div>

          {uploadType === 'text' ? (
            <div className="text-editor">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder={`Введите ${title.toLowerCase()}...`}
                rows={6}
                className="material-textarea"
              />
            </div>
          ) : (
            <div className="file-editor">
              <input
                type="file"
                onChange={handleFileChange}
                className="file-input"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
              {newFile && (
                <div className="file-info">
                  Выбран файл: {newFile.name}
                </div>
              )}
            </div>
          )}

          <div className="editor-actions">
            <button 
              className="btn-cancel"
              onClick={handleCancel}
            >
              Отмена
            </button>
            <button 
              className="btn-save"
              onClick={handleSaveChange}
              disabled={
                (uploadType === 'text' && !newText.trim()) || 
                (uploadType === 'file' && !newFile)
              }
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialUploader;
