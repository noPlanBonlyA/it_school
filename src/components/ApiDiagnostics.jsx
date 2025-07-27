// src/components/ApiDiagnostics.jsx
import React, { useState } from 'react';
import { diagnoseApiIssues } from '../utils/apiHealth';

const ApiDiagnostics = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    try {
      const diagnostics = await diagnoseApiIssues();
      setResults(diagnostics);
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setResults({
        apiHealth: false,
        corsConfiguration: false,
        recommendations: ['Не удалось выполнить диагностику']
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px', borderRadius: '5px' }}>
      <h3>🔧 Диагностика API</h3>
      
      <button 
        onClick={runDiagnostics} 
        disabled={isChecking}
        style={{
          padding: '10px 20px',
          backgroundColor: isChecking ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isChecking ? 'not-allowed' : 'pointer'
        }}
      >
        {isChecking ? 'Проверка...' : 'Проверить подключение'}
      </button>

      {results && (
        <div style={{ marginTop: '20px' }}>
          <h4>Результаты:</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: results.apiHealth ? 'green' : 'red' }}>
              {results.apiHealth ? '✅' : '❌'} API сервер: {results.apiHealth ? 'Доступен' : 'Недоступен'}
            </span>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: results.corsConfiguration ? 'green' : 'red' }}>
              {results.corsConfiguration ? '✅' : '❌'} CORS: {results.corsConfiguration ? 'Настроен' : 'Проблемы'}
            </span>
          </div>

          {results.recommendations.length > 0 && (
            <div>
              <h5>Рекомендации:</h5>
              <ul>
                {results.recommendations.map((rec, index) => (
                  <li key={index} style={{ color: '#e74c3c' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiDiagnostics;
