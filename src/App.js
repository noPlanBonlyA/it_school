// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import HomePage             from './pages/HomePage';
import LoginPage            from './pages/LoginPage';
import ProfilePage          from './pages/ProfilePage';
import SchedulePage         from './pages/SchedudlePage';
import CoinHistoryPage      from './pages/CoinHistoryPage';

import ManageGroupPage      from './pages/ManageGroupPage';
import GroupDetailPage      from './pages/GroupDetailPage';
import ManageStudentsPage   from './pages/ManageStudents';
import ManageTeachersPage   from './pages/ManageTeachers';
import ManageAdminsPage     from './pages/ManageAdmins';
import ManageCoursePage     from './pages/ManageCourse';
import ManageEventsPage     from './pages/ManageEventsPage';
import CreateEventPage      from './pages/CreateEventPage';
import ManagePointsPage     from './pages/ManagePointsPage';

import StudentCoursesPage   from './pages/StudentCoursesPage';
import StudentCoursePage    from './pages/StudentCoursePage';
import StudentLessonPage    from './pages/StudentLessonPage';

import TeacherCoursesPage   from './pages/TeacherCoursesPage';
import TeacherCoursePage    from './pages/TeacherCoursePage';
import TeacherLessonPage    from './pages/TeacherLessonPage';

import CourseDetailPage     from './pages/CourseDetailPage';
import CreateLessonPage     from './pages/CreateLessonPage';
import HomeWorkPage         from './pages/HomeWorkPage';
import ForgotPasswordPage   from './pages/ForgotPassword';
import ResetPasswordPage    from './pages/ResetPassword';
import ManageNewsPage       from './pages/ManageNewsPage';
import ManageProductsPage   from './pages/ManageProductsPage';
import ShopPage             from './pages/ShopPage';
import NotificationPage     from './pages/NotificationPage';
import RatingPage          from './pages/RatingPage';
import ImpersonatePage      from './pages/ImpersonatePage';

import { useAuth }          from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';

/**
 * Обёртка приватного маршрута:
 * если пользователь не залогинен — редирект на /login
 * если данные ещё загружаются — показываем загрузку
 */
function PrivateRoute({ children }) {
  const { user } = useAuth();
  
  // Если user === undefined, значит ещё идёт загрузка
  if (user === undefined) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>;
  }
  
  // Если user === null, значит не авторизован
  if (user === null) {
    return <Navigate to="/login" />;
  }
  
  // Если user есть, показываем контент
  return children;
}

export default function App() {
  return (
    <NotificationsProvider>
      <BrowserRouter>
        <Routes>
          {/* ───── публичные ───── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ───── базовые приватные ───── */}
          <Route path="/home" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/coin-history" element={<PrivateRoute><CoinHistoryPage /></PrivateRoute>} />

          {/* ───────────────────── STUDENT ───────────────────── */}
          <Route path="/courses" element={<PrivateRoute><StudentCoursesPage /></PrivateRoute>} />
          <Route path="/courses/:courseId/student" element={<PrivateRoute><StudentCoursePage /></PrivateRoute>} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<PrivateRoute><StudentLessonPage /></PrivateRoute>} />
          <Route path="/rating" element={<PrivateRoute><RatingPage /></PrivateRoute>} />
          <Route path="/shop" element={<PrivateRoute><ShopPage /></PrivateRoute>} />

          {/* ───────────────────── TEACHER ───────────────────── */}
          <Route path="/teacher-courses" element={<PrivateRoute><TeacherCoursesPage /></PrivateRoute>} />
          <Route path="/courses/:courseId/teacher" element={<PrivateRoute><TeacherCoursePage /></PrivateRoute>} />
          <Route path="/courses/:courseId/teacher/lessons/:lessonId" element={<PrivateRoute><TeacherLessonPage /></PrivateRoute>} />

          {/* «конструктор» курса / уроков */}
          <Route path="/courses/:courseId" element={<PrivateRoute><CourseDetailPage /></PrivateRoute>} />
          <Route path="/courses/:courseId/lessons/create" element={<PrivateRoute><CreateLessonPage /></PrivateRoute>} />

          <Route path="/homework" element={<PrivateRoute><HomeWorkPage /></PrivateRoute>} />

          {/* ───────────────── ADMIN / SUPERADMIN ───────────────── */}
          <Route path="/groups" element={<PrivateRoute><ManageGroupPage /></PrivateRoute>} />
          <Route path="/groups/:groupId" element={<PrivateRoute><GroupDetailPage /></PrivateRoute>} />
          <Route path="/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
          <Route path="/manage-users" element={<PrivateRoute><ManageStudentsPage /></PrivateRoute>} />
          <Route path="/manage-teachers" element={<PrivateRoute><ManageTeachersPage /></PrivateRoute>} />
          <Route path="/manage-admins" element={<PrivateRoute><ManageAdminsPage /></PrivateRoute>} />
          <Route path="/manage-courses" element={<PrivateRoute><ManageCoursePage /></PrivateRoute>} />
          <Route path="/manage-events" element={<PrivateRoute><ManageEventsPage /></PrivateRoute>} />
          <Route path="/create-event" element={<PrivateRoute><CreateEventPage /></PrivateRoute>} />
          <Route path="/manage-products" element={<PrivateRoute><ManageProductsPage /></PrivateRoute>} />
          <Route path="/manage-points" element={<PrivateRoute><ManagePointsPage /></PrivateRoute>} />
          <Route path="/news" element={<PrivateRoute><ManageNewsPage /></PrivateRoute>} />
          <Route path="/broadcast" element={<PrivateRoute><NotificationPage /></PrivateRoute>} />
          <Route path="/impersonate" element={<PrivateRoute><ImpersonatePage /></PrivateRoute>} />

          {/* ───── fallback ───── */}
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </BrowserRouter>
    </NotificationsProvider>
  );
}
