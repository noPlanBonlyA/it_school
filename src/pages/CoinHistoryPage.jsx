// src/pages/CoinHistoryPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import SmartTopBar from '../components/SmartTopBar';
import CoinHistory from '../components/CoinHistory';
import '../styles/HomePage.css';

export default function CoinHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Проверяем, что пользователь - студент
  if (!user || user.role !== 'student') {
    navigate('/');
    return null;
  }

  return (
    <div className="app-layout">
      <Sidebar activeItem="coinHistory" userRole={user?.role} />
      
      <div className="main-content">
        <SmartTopBar 
          pageTitle="История монет"
          onBellClick={() => {}}
          onProfileClick={() => navigate('/profile')}
        />
        
        <div className="page-content" style={{ padding: '24px' }}>
          <CoinHistory compact={false} />
        </div>
      </div>
    </div>
  );
}
