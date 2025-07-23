import api from '../api/axiosInstance';

class StudentDetailService {
  // Получить успеваемость студента
  async getStudentPerformance(studentId) {
    console.log('[StudentDetailService] Loading performance for student:', studentId);
    
    try {
      // Получаем курсы студента для анализа успеваемости
      const coursesResponse = await api.get('/courses/student');
      const courses = coursesResponse.data || [];
      
      // Получаем данные о lesson-student для подсчета оценок
      const lessonStudentResponse = await api.get('/courses/lesson-student', {
        params: { limit: 100, offset: 0 }
      });
      const lessonStudentData = lessonStudentResponse.data?.objects || lessonStudentResponse.data || [];
      
      // Если передан конкретный studentId, фильтруем по нему; иначе берем все для текущего пользователя
      const studentLessons = lessonStudentData.filter(ls => {
        if (studentId) {
          return ls.student_id === studentId && ls.grade !== null && ls.grade !== undefined;
        }
        return ls.grade !== null && ls.grade !== undefined;
      });
      
      // Вычисляем статистику
      const grades = studentLessons.map(ls => ls.grade).filter(g => g !== null);
      const averageGrade = grades.length > 0 ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : 0;
      const completedTasks = studentLessons.filter(ls => ls.status === 'completed').length;
      const totalTasks = studentLessons.length;
      
      // Группируем оценки по курсам
      const subjectGrades = {};
      for (const course of courses) {
        const courseGrades = grades; // В реальной системе здесь должна быть фильтрация по курсу
        if (courseGrades.length > 0) {
          subjectGrades[course.title] = courseGrades.reduce((sum, grade) => sum + grade, 0) / courseGrades.length;
        }
      }
      
      const subjects = Object.entries(subjectGrades).map(([name, grade]) => ({
        name,
        grade: Math.round(grade * 10) / 10
      }));
      
      return {
        averageGrade: Math.round(averageGrade * 10) / 10,
        completedTasks,
        totalTasks,
        attendanceRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        recentGrades: grades.slice(-5),
        subjects
      };
    } catch (error) {
      console.error('[StudentDetailService] Error fetching student performance:', error);
      // Возвращаем заглушку в случае ошибки
      return {
        averageGrade: 0,
        completedTasks: 0,
        totalTasks: 0,
        attendanceRate: 0,
        recentGrades: [],
        subjects: []
      };
    }
  }

  // Получить посещаемость студента
  async getStudentAttendance(studentId) {
    console.log('[StudentDetailService] Loading attendance for student:', studentId);
    
    try {
      // Получаем данные о lesson-student для анализа посещаемости
      const lessonStudentResponse = await api.get('/courses/lesson-student', {
        params: { limit: 100, offset: 0 }
      });
      const lessonStudentData = lessonStudentResponse.data?.objects || lessonStudentResponse.data || [];
      
      // Фильтруем данные для конкретного студента
      const filteredLessons = lessonStudentData.filter(ls => {
        if (studentId) {
          return ls.student_id === studentId;
        }
        return true; // Для текущего пользователя берем все
      });
      
      // Получаем данные о расписании для получения информации о занятиях
      const scheduleResponse = await api.get('/schedule/', {
        params: { limit: 100, offset: 0 }
      });
      const scheduleData = scheduleResponse.data?.objects || scheduleResponse.data || [];
      
      // Подсчитываем статистику посещаемости
      const totalClasses = filteredLessons.length;
      const attendedClasses = filteredLessons.filter(ls => ls.attendance === true).length;
      const missedClasses = totalClasses - attendedClasses;
      const attendanceRate = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
      
      // Формируем список последних занятий
      const recentClasses = filteredLessons
        .slice(-5)
        .reverse()
        .map((ls, index) => {
          const scheduleItem = scheduleData.find(s => s.lesson_id === ls.lesson_id);
          return {
            date: scheduleItem?.start_time ? new Date(scheduleItem.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            course: `Урок ${ls.lesson_id}`,
            attended: ls.attendance === true
          };
        });
      
      return {
        totalClasses,
        attendedClasses,
        missedClasses,
        attendanceRate,
        recentClasses
      };
    } catch (error) {
      console.error('[StudentDetailService] Error fetching student attendance:', error);
      // Возвращаем заглушку в случае ошибки
      return {
        totalClasses: 0,
        attendedClasses: 0,
        missedClasses: 0,
        attendanceRate: 0,
        recentClasses: []
      };
    }
  }

  // Получить курсы студента
  async getStudentCourses(studentId) {
    console.log('[StudentDetailService] Loading courses for student:', studentId);
    
    try {
      // Получаем курсы студента
      const coursesResponse = await api.get('/courses/student');
      const courses = coursesResponse.data || [];
      
      // Получаем данные о прогрессе по урокам
      const lessonStudentResponse = await api.get('/courses/lesson-student', {
        params: { limit: 100, offset: 0 }
      });
      const allLessonStudentData = lessonStudentResponse.data?.objects || lessonStudentResponse.data || [];
      
      // Фильтруем данные по студенту, если указан studentId
      const lessonStudentData = allLessonStudentData.filter(ls => {
        if (studentId) {
          return ls.student_id === studentId;
        }
        return true; // Для текущего пользователя берем все
      });
      
      // Обрабатываем каждый курс
      const processedCourses = await Promise.all(courses.map(async (course) => {
        try {
          // Получаем уроки курса
          const lessonsResponse = await api.get(`/courses/${course.id}/lessons`, {
            params: { limit: 100, offset: 0 }
          });
          const lessons = lessonsResponse.data?.objects || lessonsResponse.data || [];
          
          // Фильтруем lesson-student данные для этого курса
          const courseLessonData = lessonStudentData.filter(ls => 
            lessons.some(lesson => lesson.id === ls.lesson_id)
          );
          
          // Подсчитываем прогресс
          const totalLessons = lessons.length;
          const completedLessons = courseLessonData.filter(ls => ls.status === 'completed').length;
          const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
          
          // Собираем оценки
          const grades = courseLessonData
            .map(ls => ls.grade)
            .filter(grade => grade !== null && grade !== undefined);
          
          // Находим последнее занятие
          const lastLessonData = courseLessonData
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
          
          const lastLesson = lastLessonData 
            ? new Date(lastLessonData.updated_at || lastLessonData.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          
          return {
            id: course.id,
            title: course.title || course.name || 'Неизвестный курс',
            status: progress === 100 ? 'completed' : 'active',
            statusText: progress === 100 ? 'Завершен' : 'Активный',
            progress,
            lastLesson,
            grades,
            teacher: course.teacher_name || 'Преподаватель не назначен'
          };
        } catch (courseError) {
          console.error(`[StudentDetailService] Error processing course ${course.id}:`, courseError);
          return {
            id: course.id,
            title: course.title || course.name || 'Неизвестный курс',
            status: 'active',
            statusText: 'Активный',
            progress: 0,
            lastLesson: new Date().toISOString().split('T')[0],
            grades: [],
            teacher: 'Преподаватель не назначен'
          };
        }
      }));
      
      return processedCourses;
    } catch (error) {
      console.error('[StudentDetailService] Error fetching student courses:', error);
      // Возвращаем пустой массив в случае ошибки
      return [];
    }
  }

  // Получить информацию о группе студента
  async getStudentGroup(studentId) {
    console.log('[StudentDetailService] Loading group for student:', studentId);
    
    try {
      let currentStudent;
      
      // Если передан studentId, пытаемся получить конкретного студента
      if (studentId) {
        try {
          const studentResponse = await api.get(`/students/${studentId}`);
          currentStudent = studentResponse.data;
        } catch (error) {
          console.warn('[StudentDetailService] Cannot fetch specific student, falling back to current user:', error);
          const currentStudentResponse = await api.get('/students/me');
          currentStudent = currentStudentResponse.data;
        }
      } else {
        // Получаем информацию о текущем студенте
        const currentStudentResponse = await api.get('/students/me');
        currentStudent = currentStudentResponse.data;
      }
      
      if (!currentStudent || !currentStudent.group_id) {
        console.warn('[StudentDetailService] Student has no group assigned');
        return null;
      }
      
      // Получаем информацию о группе
      const groupResponse = await api.get(`/groups/${currentStudent.group_id}`);
      const group = groupResponse.data;
      
      if (!group) {
        console.warn('[StudentDetailService] Group not found');
        return null;
      }
      
      // Получаем всех студентов группы
      let groupStudents = [];
      try {
        const studentsResponse = await api.get('/students/', {
          params: { limit: 100, offset: 0 }
        });
        const allStudents = studentsResponse.data?.objects || studentsResponse.data || [];
        groupStudents = allStudents.filter(student => student.group_id === currentStudent.group_id);
      } catch (studentsError) {
        console.error('[StudentDetailService] Error fetching group students:', studentsError);
      }
      
      // Получаем информацию о преподавателе
      let teacherName = 'Преподаватель не назначен';
      if (group.teacher_id) {
        try {
          const teachersResponse = await api.get('/teachers/', {
            params: { limit: 100, offset: 0 }
          });
          const teachers = teachersResponse.data?.objects || teachersResponse.data || [];
          const teacher = teachers.find(t => t.id === group.teacher_id);
          if (teacher) {
            teacherName = teacher.first_name && teacher.last_name 
              ? `${teacher.first_name} ${teacher.last_name}`
              : teacher.username || 'Преподаватель';
          }
        } catch (teacherError) {
          console.error('[StudentDetailService] Error fetching teacher info:', teacherError);
        }
      }
      
      // Формируем расписание
      let schedule = 'Расписание не задано';
      if (group.schedule_info) {
        schedule = group.schedule_info;
      }
      
      // Обрабатываем список студентов группы
      const students = groupStudents.map(student => ({
        id: student.id,
        name: student.first_name && student.last_name 
          ? `${student.first_name} ${student.last_name}`
          : student.username || 'Неизвестный студент',
        status: student.is_active !== false ? 'Активный' : 'Неактивный'
      }));
      
      return {
        id: group.id,
        name: group.name || group.title || `Группа ${group.id}`,
        level: group.level || 'Не указан',
        teacher: teacherName,
        schedule,
        studentsCount: students.length,
        startDate: group.created_at ? new Date(group.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        students
      };
    } catch (error) {
      console.error('[StudentDetailService] Error fetching student group:', error);
      return null;
    }
  }

  // Получить полную информацию о студенте
  async getStudentFullInfo(studentId) {
    console.log('[StudentDetailService] Loading full info for student:', studentId);
    
    try {
      // Запускаем все запросы параллельно для оптимизации
      const [basicInfo, performance, attendance, courses, group] = await Promise.allSettled([
        this.getStudentBasicInfo(studentId),
        this.getStudentPerformance(studentId),
        this.getStudentAttendance(studentId),
        this.getStudentCourses(studentId),
        this.getStudentGroup(studentId)
      ]);

      // Обрабатываем результаты, заменяя ошибки на значения по умолчанию
      const result = {
        basicInfo: basicInfo.status === 'fulfilled' ? basicInfo.value : null,
        performance: performance.status === 'fulfilled' ? performance.value : {
          averageGrade: 0,
          completedTasks: 0,
          totalTasks: 0,
          attendanceRate: 0,
          recentGrades: [],
          subjects: []
        },
        attendance: attendance.status === 'fulfilled' ? attendance.value : {
          totalClasses: 0,
          attendedClasses: 0,
          missedClasses: 0,
          attendanceRate: 0,
          recentClasses: []
        },
        courses: courses.status === 'fulfilled' ? courses.value : [],
        group: group.status === 'fulfilled' ? group.value : null
      };

      // Логируем ошибки, если они были
      if (basicInfo.status === 'rejected') {
        console.error('[StudentDetailService] Basic info fetch failed:', basicInfo.reason);
      }
      if (performance.status === 'rejected') {
        console.error('[StudentDetailService] Performance fetch failed:', performance.reason);
      }
      if (attendance.status === 'rejected') {
        console.error('[StudentDetailService] Attendance fetch failed:', attendance.reason);
      }
      if (courses.status === 'rejected') {
        console.error('[StudentDetailService] Courses fetch failed:', courses.reason);
      }
      if (group.status === 'rejected') {
        console.error('[StudentDetailService] Group fetch failed:', group.reason);
      }

      console.log('[StudentDetailService] Full student info loaded successfully');
      return result;
      
    } catch (error) {
      console.error('[StudentDetailService] Error fetching full student info:', error);
      
      // Возвращаем структуру по умолчанию в случае критической ошибки
      return {
        basicInfo: null,
        performance: {
          averageGrade: 0,
          completedTasks: 0,
          totalTasks: 0,
          attendanceRate: 0,
          recentGrades: [],
          subjects: []
        },
        attendance: {
          totalClasses: 0,
          attendedClasses: 0,
          missedClasses: 0,
          attendanceRate: 0,
          recentClasses: []
        },
        courses: [],
        group: null
      };
    }
  }

  // Получить базовую информацию о студенте
  async getStudentBasicInfo(studentId) {
    console.log('[StudentDetailService] Loading basic info for student:', studentId);
    
    try {
      if (studentId) {
        // Пытаемся получить конкретного студента
        try {
          const response = await api.get(`/students/${studentId}`);
          return response.data;
        } catch (error) {
          console.warn('[StudentDetailService] Cannot fetch specific student, falling back to current user:', error);
        }
      }
      
      // Fallback к текущему пользователю
      const response = await api.get('/students/me');
      return response.data;
    } catch (error) {
      console.error('[StudentDetailService] Error fetching student basic info:', error);
      return null;
    }
  }
}

export const studentDetailService = new StudentDetailService();
