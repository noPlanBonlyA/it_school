// src/pages/ManagePointsPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import PointsManagement from '../components/PointsManagement';
import '../styles/HomePage.css';

export default function ManagePointsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Проверяем права доступа
  if (!user || !['admin', 'superadmin', 'teacher'].includes(user.role)) {
    navigate('/');
    return null;
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="points" userRole={user?.role} />
      
      <div className="main-content">
        <SmartTopBar 
          pageTitle="Управление монетами"
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />
        
        <div className="page-content" style={{ padding: '24px' }}>
          <PointsManagement />
        </div>
      </div>
    </div>
  );
}
