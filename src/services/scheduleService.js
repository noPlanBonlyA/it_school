/*  src/services/scheduleService.js  */
import api from '../api/axiosInstance';

/*───────────────────────────────────────────────────────────────────────────
  Утилита: превращаем holding_date в корректный ISO-стринг
  (бэкенд присылает 6-значные микросекунды: «…23.296000»)
───────────────────────────────────────────────────────────────────────────*/
function fixIso(dateStr) {
  // «2025-06-16T00:04:23.296000» → «2025-06-16T00:04:23.296Z»
  const [whole, micros = '000000'] = dateStr.split('.');
  return `${whole}.${micros.slice(0, 3)}Z`;            // → миллисекунды + ‘Z’
}

/*────────────────── константы ──────────────────*/
const LESSON_MIN = 60;                                 // длительность пары
const ALL_FROM   = '1900-01-01T00:00:00';
const ALL_TO     = '2100-01-01T00:00:00';

/*────────────────── кэш групп ──────────────────*/
const groupCache = new Map();               // groupId → { name, teacher }

async function getGroupBrief(groupId) {
  if (groupCache.has(groupId)) return groupCache.get(groupId);

  const { data } = await api.get(`/groups/${groupId}`);
  const brief = {
    name: data.name,
    teacher: data.teacher
      ? `${data.teacher.user.first_name} ${data.teacher.user.surname}`
      : '—'
  };
  groupCache.set(groupId, brief);
  return brief;
}

/*────────────────── нормализация L-G → событие ──────────────────*/
async function normalize(rows) {
  /* 1. базовая конвертация */
  const base = rows.map(r => {
    const start = new Date(fixIso(r.holding_date));
    const end   = new Date(start.getTime() + LESSON_MIN * 60_000);

    return {
      /* ids */
      id          : r.id,
      lesson_id   : r.lesson_id,
      group_id    : r.group_id,

      /* даты для FullCalendar */
      start       : start.toISOString(),
      end         : end.toISOString(),

      /* UI-поля (могут быть пустыми – дополним ниже) */
      is_opened   : r.is_opened,
      lesson_name : r.lesson_name,
      course_name : r.course_name,
      group_name  : r.group_name  || null,
      teacher_name: r.teacher_name|| null,
      description : r.description || ''
    };
  });

  /* 2. выясняем, какие группы надо добрать */
  const missingGrpIds = Array.from(
    new Set(
      base.filter(e => !e.group_name || !e.teacher_name)
          .map(e => e.group_id)
    )
  );

  await Promise.all(missingGrpIds.map(getGroupBrief));   // параллельно подтягиваем

  /* 3. дополняем отсутствующие поля */
  return base.map(e => {
    if (e.group_name && e.teacher_name) return e;
    const brief = groupCache.get(e.group_id) || {};
    return {
      ...e,
      group_name  : e.group_name   || brief.name     || '—',
      teacher_name: e.teacher_name || brief.teacher || '—'
    };
  });
}

/*────────────────── CRUD lesson-groups ──────────────────*/
export async function saveLessonGroup(body, id = null) {
  const { data } = id
    ? await api.put(`/courses/lesson-group/${id}`, body)
    : await api.post('/courses/lesson-group', body);
  return data;
}

export async function deleteLessonGroup(id) {
  await api.delete(`/courses/lesson-group/${id}`);
}

/*────────────────── получение расписания ──────────────────*/
export async function getGroupLessonGroups(
  groupId,
  from = ALL_FROM,
  to   = ALL_TO
) {
  const { data } = await api.get('/schedule/lessons', {
    params: { date_start: from, date_end: to }
  });
  const filtered = data.filter(r => r.group_id === groupId);
  return await normalize(filtered);
}

export async function getUserSchedule(user) {
  let data;

  /* админ → всё расписание */
  if (user.role === 'admin' || user.role === 'superadmin') {
    ({ data } = await api.get('/schedule/'));
  } else {
    /* студент / преподаватель → фильтр по себе */
    const params = user.role === 'student'
      ? { student_id: user.id }
      : { teacher_id: user.id };

    ({ data } = await api.get('/schedule/lessons', {
      params: { date_start: ALL_FROM, date_end: ALL_TO, ...params }
    }));
  }

  return await normalize(data);
}
