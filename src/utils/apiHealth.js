// src/utils/apiHealth.js
import api from '../api/axiosInstance';

/**
 * Проверка доступности API
 * @returns {Promise<boolean>} true если API доступен
 */
export const checkApiHealth = async () => {
  try {
    console.log('[ApiHealth] Checking API connection...');
    const response = await api.get('/health', { timeout: 5000 });
    console.log('[ApiHealth] API is healthy:', response.status);
    return true;
  } catch (error) {
    console.error('[ApiHealth] API health check failed:', error);
    return false;
  }
};

/**
 * Проверка CORS конфигурации
 * @returns {Promise<boolean>} true если CORS настроен правильно
 */
export const checkCorsConfiguration = async () => {
  try {
    console.log('[ApiHealth] Checking CORS configuration...');
    const response = await fetch('http://localhost:8080/api/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('[ApiHealth] CORS check response:', response.status);
    return response.ok;
  } catch (error) {
    console.error('[ApiHealth] CORS check failed:', error);
    return false;
  }
};

/**
 * Диагностика проблем с API
 */
export const diagnoseApiIssues = async () => {
  const results = {
    apiHealth: false,
    corsConfiguration: false,
    recommendations: []
  };

  // Проверяем доступность API
  results.apiHealth = await checkApiHealth();
  if (!results.apiHealth) {
    results.recommendations.push('Убедитесь, что backend сервер запущен на http://localhost:8080');
  }

  // Проверяем CORS
  results.corsConfiguration = await checkCorsConfiguration();
  if (!results.corsConfiguration) {
    results.recommendations.push('Проверьте CORS настройки на backend сервере');
  }

  return results;
};
