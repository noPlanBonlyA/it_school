import api from '../api/axiosInstance';

class StudentDetailService {
  // Вспомогательный метод для получения lesson-student данных
  async _getLessonStudentData(studentId) {
    console.log('[StudentDetailService] Loading lesson-student data for student:', studentId);
    
    let lessonStudentData = [];
    
    if (studentId) {
      // Для конкретного студента нужно получить данные через группы
      try {
        // Сначала получаем группы студента
        const allGroupsResponse = await api.get('/groups/', {
          params: { limit: 100, offset: 0 }
        });
        const allGroups = allGroupsResponse.data?.objects || [];
        
        // Ищем группы, в которых есть данный студент
        const studentGroups = [];
        for (const group of allGroups) {
          try {
            const groupDetailsResponse = await api.get(`/groups/${group.id}`);
            const groupDetails = groupDetailsResponse.data;
            
            if (groupDetails.students && groupDetails.students.some(s => s.id === studentId)) {
              studentGroups.push(groupDetails);
            }
          } catch (error) {
            console.warn(`[StudentDetailService] Could not load group ${group.id} details:`, error);
          }
        }
        
        // Теперь получаем lesson-group для этих групп
        for (const group of studentGroups) {
          try {
            const lessonGroupResponse = await api.get('/courses/lesson-group', {
              params: { group_id: group.id }
            });
            const lessonGroups = lessonGroupResponse.data || [];
            
            // Для каждой lesson-group получаем lesson-student данные
            for (const lessonGroup of lessonGroups) {
              try {
                const lessonStudentResponse = await api.get('/courses/lesson-student', {
                  params: { lesson_group_id: lessonGroup.id }
                });
                const lessonStudents = lessonStudentResponse.data || [];
                
                // Фильтруем только для нужного студента и добавляем lesson_group данные
                const studentLessonData = lessonStudents
                  .filter(ls => ls.student_id === studentId)
                  .map(ls => ({
                    ...ls,
                    lesson_group: lessonGroup
                  }));
                
                lessonStudentData.push(...studentLessonData);
              } catch (error) {
                console.warn(`[StudentDetailService] Could not load lesson-student for group ${lessonGroup.id}:`, error);
              }
            }
          } catch (error) {
            console.warn(`[StudentDetailService] Could not load lesson-groups for group ${group.id}:`, error);
          }
        }
        
        console.log('[StudentDetailService] Loaded lesson-student data:', lessonStudentData.length);
      } catch (error) {
        console.error('[StudentDetailService] Error loading lesson-student data:', error);
      }
    } else {
      // Для текущего пользователя используем endpoint студента
      try {
        const response = await api.get('/courses/student/lesson-student');
        lessonStudentData = response.data || [];
      } catch (error) {
        console.error('[StudentDetailService] Error loading current user lesson-student data:', error);
      }
    }
    
    return lessonStudentData;
  }
  // Получить успеваемость студента
  async getStudentPerformance(studentId) {
    console.log('[StudentDetailService] Loading performance for student:', studentId);
    
    try {
      // Получаем данные о lesson-student для этого студента
      const lessonStudentData = await this._getLessonStudentData(studentId);
      
      // Вычисляем статистику на основе оценок за домашние задания и посещаемость
      const gradesForHomework = lessonStudentData
        .filter(ls => ls.is_graded_homework && ls.grade_for_homework !== null && ls.grade_for_homework !== undefined)
        .map(ls => ls.grade_for_homework);
        
      const gradesForVisit = lessonStudentData
        .filter(ls => ls.grade_for_visit !== null && ls.grade_for_visit !== undefined)
        .map(ls => ls.grade_for_visit);
      
      const allGrades = [...gradesForHomework, ...gradesForVisit];
      const averageGrade = allGrades.length > 0 ? allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length : 0;
      
      const completedHomework = lessonStudentData.filter(ls => ls.is_sent_homework && ls.is_graded_homework).length;
      const totalHomework = lessonStudentData.filter(ls => ls.is_sent_homework).length;
      
      const attendedClasses = lessonStudentData.filter(ls => ls.is_visited).length;
      const totalClasses = lessonStudentData.length;
      const attendanceRate = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
      
      // Получаем курсы для группировки по предметам
      let subjects = [];
      try {
        // Для конкретного студента получаем курсы через наш улучшенный метод
        if (studentId) {
          const studentCourses = await this.getStudentCourses(studentId);
          subjects = studentCourses.map(courseData => {
            const course = courseData.course || courseData;
            return {
              name: course.name || 'Неизвестный курс',
              grade: averageGrade // Упрощенно, в реальности нужно группировать по курсам
            };
          });
        } else {
          // Для текущего пользователя
          const coursesResponse = await api.get('/courses/student');
          const courses = coursesResponse.data || [];
          
          subjects = courses.map(courseData => {
            const course = courseData.course || courseData;
            return {
              name: course.name || 'Неизвестный курс',
              grade: averageGrade // Упрощенно, в реальности нужно группировать по курсам
            };
          });
        }
      } catch (error) {
        console.warn('[StudentDetailService] Could not load courses for subjects:', error);
      }
      
      return {
        averageGrade: Math.round(averageGrade * 10) / 10,
        completedTasks: completedHomework,
        totalTasks: totalHomework,
        attendanceRate,
        recentGrades: allGrades.slice(-5),
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
      const lessonStudentData = await this._getLessonStudentData(studentId);
      
      // Получаем текущую дату в локальном времени
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // Разделяем на прошедшие и будущие уроки
      const pastLessons = [];
      const futureLessons = [];
      
      lessonStudentData.forEach(ls => {
        if (!ls.lesson_group?.start_datetime) {
          return; // Пропускаем уроки без даты
        }
        
        const lessonDate = new Date(ls.lesson_group.start_datetime);
        const dateStr = lessonDate.getFullYear() + '-' + 
          String(lessonDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(lessonDate.getDate()).padStart(2, '0');
        
        if (dateStr <= todayStr) {
          pastLessons.push(ls);
        } else {
          futureLessons.push(ls);
        }
      });
      
      console.log(`[StudentDetailService] Past lessons: ${pastLessons.length}, Future lessons: ${futureLessons.length}`);
      
      // Подсчитываем статистику только по прошедшим урокам
      const totalClasses = pastLessons.length;
      const attendedClasses = pastLessons.filter(ls => ls.is_visited === true).length;
      const excusedClasses = pastLessons.filter(ls => ls.is_excused_absence === true).length;
      const missedClasses = totalClasses - attendedClasses - excusedClasses;
      const attendanceRate = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
      
      // Формируем список последних занятий (только прошедшие)
      const recentClasses = pastLessons
        .sort((a, b) => new Date(b.lesson_group.start_datetime) - new Date(a.lesson_group.start_datetime))
        .slice(0, 10)
        .map(ls => {
          const date = new Date(ls.lesson_group.start_datetime);
          const course = ls.lesson_group?.lesson?.course;
          
          return {
            date: date.toLocaleDateString('ru-RU'),
            course: course?.name || 'Неизвестный курс',
            lesson: ls.lesson_group?.lesson?.name || 'Урок',
            attended: ls.is_visited,
            excused: ls.is_excused_absence,
            compensated: ls.is_compensated_skip
          };
        });
      
      return {
        totalClasses,
        attendedClasses,
        excusedClasses,
        missedClasses,
        attendanceRate,
        futureLessons: futureLessons.length, // Добавляем счетчик будущих уроков
        recentClasses
      };
    } catch (error) {
      console.error('[StudentDetailService] Error fetching student attendance:', error);
      // Возвращаем заглушку в случае ошибки
      return {
        totalClasses: 0,
        attendedClasses: 0,
        excusedClasses: 0,
        missedClasses: 0,
        attendanceRate: 0,
        futureLessons: 0,
        recentClasses: []
      };
    }
  }

  // Получить курсы студента
  async getStudentCourses(studentId) {
    console.log('[StudentDetailService] Loading courses for student:', studentId);
    
    try {
      let courses = [];
      let lessonStudentData = [];
      
      if (studentId) {
        // Для конкретного студента сначала пытаемся получить курсы напрямую
        try {
          // Пытаемся получить курсы студента через прямой endpoint (если существует)
          const studentResponse = await api.get(`/students/${studentId}`);
          console.log('[StudentDetailService] Student data:', studentResponse.data);
          
          // Если нет прямого способа, используем lesson-student данные
        } catch (error) {
          console.warn('[StudentDetailService] Could not get student directly:', error);
        }
        
        // Используем lesson-student данные
        console.log('[StudentDetailService] Getting courses through lesson-student data');
        lessonStudentData = await this._getLessonStudentData(studentId);
        
        console.log('[StudentDetailService] Found lesson-student records:', lessonStudentData.length);
        
        if (lessonStudentData.length > 0) {
          // Извлекаем уникальные курсы из lesson_group.lesson.course
          const courseMap = new Map();
          
          for (const lessonStudent of lessonStudentData) {
            console.log('[StudentDetailService] Processing lesson-student:', {
              id: lessonStudent.id,
              has_lesson_group: !!lessonStudent.lesson_group,
              has_lesson: !!lessonStudent.lesson_group?.lesson,
              lesson_id: lessonStudent.lesson_group?.lesson?.id,
              course_id: lessonStudent.lesson_group?.lesson?.course_id,
              has_course: !!lessonStudent.lesson_group?.lesson?.course,
              course_name: lessonStudent.lesson_group?.lesson?.course?.name
            });
            
            // Если у нас есть lesson с course_id, но нет объекта course, пытаемся получить курс
            if (lessonStudent.lesson_group?.lesson?.course_id && !lessonStudent.lesson_group?.lesson?.course) {
              try {
                const courseResponse = await api.get(`/courses/${lessonStudent.lesson_group.lesson.course_id}`);
                lessonStudent.lesson_group.lesson.course = courseResponse.data;
                console.log('[StudentDetailService] Loaded course data:', courseResponse.data.name);
              } catch (error) {
                console.warn(`[StudentDetailService] Could not load course ${lessonStudent.lesson_group.lesson.course_id}:`, error);
              }
            }
            
            if (lessonStudent.lesson_group?.lesson?.course) {
              const course = lessonStudent.lesson_group.lesson.course;
              if (!courseMap.has(course.id)) {
                courseMap.set(course.id, { course: course });
              }
            }
          }
          
          courses = Array.from(courseMap.values());
          console.log('[StudentDetailService] Extracted unique courses:', courses.length);
        } else {
          console.log('[StudentDetailService] No lesson-student data found, trying alternative approach');
          
          // Альтернативный подход: получаем все группы студента и их курсы
          try {
            const allGroupsResponse = await api.get('/groups/', {
              params: { limit: 100, offset: 0 }
            });
            const allGroups = allGroupsResponse.data?.objects || [];
            
            for (const group of allGroups) {
              try {
                const groupDetailsResponse = await api.get(`/groups/${group.id}`);
                const groupDetails = groupDetailsResponse.data;
                
                if (groupDetails.students && groupDetails.students.some(s => s.id === studentId)) {
                  // Этот студент в этой группе, проверяем курсы группы
                  if (groupDetails.courses && groupDetails.courses.length > 0) {
                    courses.push(...groupDetails.courses.map(course => ({ course })));
                  }
                }
              } catch (error) {
                console.warn(`[StudentDetailService] Could not load group ${group.id} for courses:`, error);
              }
            }
            
            console.log('[StudentDetailService] Found courses through groups:', courses.length);
          } catch (error) {
            console.warn('[StudentDetailService] Could not get courses through groups:', error);
          }
        }
      } else {
        // Для текущего пользователя
        const coursesResponse = await api.get('/courses/student');
        courses = coursesResponse.data || [];
        
        // Также получаем lesson-student данные для текущего пользователя
        lessonStudentData = await this._getLessonStudentData(null);
      }
      
      // Обрабатываем каждый курс
      const processedCourses = courses.map(courseData => {
        const course = courseData.course || courseData;
        
        // Фильтруем данные урок-студент для этого курса
        const courseLessonData = lessonStudentData.filter(ls => {
          // Проверяем через lesson_group -> lesson -> course_id или lesson_group -> lesson -> course -> id
          const courseId = ls.lesson_group?.lesson?.course_id || ls.lesson_group?.lesson?.course?.id;
          return courseId === course.id;
        });
        
        console.log(`[StudentDetailService] Course "${course.name}" lesson data:`, courseLessonData.length);
        
        // Подсчитываем прогресс на основе посещаемости и выполненных домашних заданий
        const totalLessons = courseLessonData.length || 1; // Защита от деления на ноль
        const attendedLessons = courseLessonData.filter(ls => ls.is_visited).length;
        const completedHomework = courseLessonData.filter(ls => ls.is_sent_homework && ls.is_graded_homework).length;
        
        // Прогресс основан на комбинации посещаемости и выполненных заданий
        const progress = totalLessons > 0 ? Math.round(((attendedLessons + completedHomework) / (totalLessons * 2)) * 100) : 0;
        
        // Собираем оценки за домашние задания для этого курса
        const grades = courseLessonData
          .filter(ls => ls.grade_for_homework !== null && ls.grade_for_homework !== undefined)
          .map(ls => ls.grade_for_homework);
        
        // Находим последнее занятие для этого курса
        const lastLessonData = courseLessonData
          .filter(ls => ls.lesson_group?.start_datetime)
          .sort((a, b) => new Date(b.lesson_group.start_datetime) - new Date(a.lesson_group.start_datetime))[0];
        
        const lastLesson = lastLessonData 
          ? lastLessonData.lesson_group.start_datetime.split('T')[0]
          : 'Нет данных';
        
        return {
          id: course.id,
          title: course.name || 'Неизвестный курс',
          status: progress >= 80 ? 'completed' : 'active',
          statusText: progress >= 80 ? 'Завершен' : 'Активный',
          progress: Math.min(progress, 100),
          lastLesson,
          grades,
          teacher: course.author_name || 'Преподаватель не назначен',
          lessonsCount: totalLessons > 1 ? totalLessons : 0 // Показываем 0 если нет реальных уроков
        };
      });
      
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
      let groups = [];
      
      if (studentId) {
        // Для конкретного студента получаем все группы и ищем нужную
        try {
          const allGroupsResponse = await api.get('/groups/', {
            params: { limit: 100, offset: 0 }
          });
          const allGroups = allGroupsResponse.data?.objects || [];
          
          // Ищем группу, в которой есть данный студент
          for (const group of allGroups) {
            try {
              const groupDetailsResponse = await api.get(`/groups/${group.id}`);
              const groupDetails = groupDetailsResponse.data;
              
              if (groupDetails.students && groupDetails.students.some(s => s.id === studentId)) {
                groups = [groupDetails];
                break;
              }
            } catch (error) {
              console.warn(`[StudentDetailService] Could not load group ${group.id} details:`, error);
            }
          }
        } catch (error) {
          console.warn('[StudentDetailService] Could not load groups for student:', error);
        }
      } else {
        // Для текущего студента
        try {
          const response = await api.get('/groups/student');
          groups = response.data || [];
        } catch (error) {
          console.warn('[StudentDetailService] Could not load student groups:', error);
        }
      }
      
      if (groups.length === 0) {
        return null;
      }
      
      const group = groups[0]; // Берем первую группу
      const groupData = group.group || group;
      
      // Получаем информацию о преподавателе
      let teacherName = 'Преподаватель не назначен';
      if (groupData.teacher_id) {
        try {
          const teacherResponse = await api.get(`/teachers/${groupData.teacher_id}`);
          const teacher = teacherResponse.data;
          const teacherUser = teacher.user || {};
          teacherName = [teacherUser.first_name, teacherUser.surname].filter(Boolean).join(' ') || 
                       teacherUser.username || 'Преподаватель';
        } catch (error) {
          console.warn('[StudentDetailService] Could not load teacher info:', error);
        }
      }
      
      // Обрабатываем список студентов группы
      const students = (groupData.students || []).map(student => {
        const user = student.user || {};
        return {
          id: student.id,
          name: [user.first_name, user.surname].filter(Boolean).join(' ') || 
                user.username || 'Неизвестный студент',
          status: student.is_active !== false ? 'Активный' : 'Неактивный'
        };
      });
      
      return {
        id: groupData.id,
        name: groupData.name || `Группа ${groupData.id}`,
        level: groupData.description || 'Не указан',
        teacher: teacherName,
        schedule: 'Расписание не задано', // API не предоставляет расписание группы
        studentsCount: students.length,
        startDate: groupData.start_date || new Date().toISOString().split('T')[0],
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
