import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api', // поправьте под ваш бекенд
  withCredentials: true,
});

export default api;
