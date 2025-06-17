// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import HomePage             from './pages/HomePage';
import LoginPage            from './pages/LoginPage';
import ProfilePage          from './pages/ProfilePage';
import SchedulePage         from './pages/SchedudlePage';

import ManageGroupPage      from './pages/ManageGroupPage';
import ManageStudentsPage   from './pages/ManageStudents';
import ManageTeachersPage   from './pages/ManageTeachers';
import ManageAdminsPage     from './pages/ManageAdmins';
import ManageCoursePage     from './pages/ManageCourse';

import StudentCoursesPage   from './pages/StudentCoursesPage';
import StudentCoursePage    from './pages/StudentCoursePage';
import StudentLessonPage    from './pages/StudentLessonPage';

import TeacherCoursesPage   from './pages/TeacherCoursesPage';
import TeacherCoursePage    from './pages/TeacherCoursePage';
import TeacherLessonPage    from './pages/TeacherLessonPage';

import CourseDetailPage     from './pages/CourseDetailPage';
import HomeWorkPage         from './pages/HomeWorkPage';
import ForgotPasswordPage   from './pages/ForgotPassword';
import ResetPasswordPage    from './pages/ResetPassword';
import ManageNewsPage       from './pages/ManageNewsPage';
import NotificationPage     from './pages/NotificationPage';

import { useAuth }          from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';

/**
 * Обёртка приватного маршрута:
 * если пользователь не залогинен — редирект на /login
 */
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <NotificationsProvider>
      <BrowserRouter>
        <Routes>

          {/* ───── публичные ───── */}
          <Route path="/login"                  element={<LoginPage />} />
          <Route path="/forgot-password"        element={<ForgotPasswordPage />} />
          <Route path="/reset-password"         element={<ResetPasswordPage />} />

          {/* ───── базовые приватные ───── */}
          <Route path="/home"     element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/profile"  element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          {/* ───────────────────── STUDENT ───────────────────── */}
          <Route path="/courses"
                 element={<PrivateRoute><StudentCoursesPage /></PrivateRoute>} />
          <Route path="/courses/:courseId/student"
                 element={<PrivateRoute><StudentCoursePage /></PrivateRoute>} />
          <Route path="/courses/:courseId/lessons/:lessonId"
                 element={<PrivateRoute><StudentLessonPage /></PrivateRoute>} />

          {/* ───────────────────── TEACHER ───────────────────── */}
          <Route path="/teacher-courses"
                 element={<PrivateRoute><TeacherCoursesPage /></PrivateRoute>} />
          <Route path="/courses/:courseId/teacher"
                 element={<PrivateRoute><TeacherCoursePage /></PrivateRoute>} />
          <Route path="/courses/:courseId/teacher/lessons/:lessonId"
                 element={<PrivateRoute><TeacherLessonPage /></PrivateRoute>} />

          {/* «конструктор» курса / уроков */}
          <Route path="/courses/:courseId"
                 element={<PrivateRoute><CourseDetailPage /></PrivateRoute>} />

          <Route path="/homework"
                 element={<PrivateRoute><HomeWorkPage /></PrivateRoute>} />

          {/* ───────────────── ADMIN / SUPERADMIN ───────────────── */}
          <Route path="/groups"         element={<PrivateRoute><ManageGroupPage /></PrivateRoute>} />
          <Route path="/schedule"       element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
          <Route path="/manage-users"   element={<PrivateRoute><ManageStudentsPage /></PrivateRoute>} />
          <Route path="/manage-teachers"element={<PrivateRoute><ManageTeachersPage /></PrivateRoute>} />
          <Route path="/manage-admins"  element={<PrivateRoute><ManageAdminsPage /></PrivateRoute>} />
          <Route path="/manage-courses" element={<PrivateRoute><ManageCoursePage /></PrivateRoute>} />
          <Route path="/news"           element={<PrivateRoute><ManageNewsPage /></PrivateRoute>} />
          <Route path="/broadcast"  element={<PrivateRoute><NotificationPage /></PrivateRoute>} />

          {/* ───── fallback ───── */}
          <Route path="*" element={<Navigate to="/home" />} />

        </Routes>
      </BrowserRouter>
    </NotificationsProvider>
  );
}
