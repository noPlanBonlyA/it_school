import api from '../api/axiosInstance';

/*───────────────────────────────────────────────────────────────────────────
  Создать материал из обычного HTML-текста
───────────────────────────────────────────────────────────────────────────*/
export async function createMaterialFromText(name, htmlText = '') {
  const { data } = await api.post('/courses/material', {
    name,
    html_text: htmlText
  });
  return data;                 // { id, url, created_at, … }
}

/*───────────────────────────────────────────────────────────────────────────
  Создать материал из файла
───────────────────────────────────────────────────────────────────────────*/
export async function createMaterialFromFile(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('file', file);     // поле «file» должно совпадать с бекендом

  const { data } = await api.post('/courses/material', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
