import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from './Sidebar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { MessagingView } from '@/components/messaging/MessagingView';
import Auth from '@/pages/Auth';

export const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState('calendar');
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'calendar':
        return <CalendarView />;
      case 'messages':
        return <MessagingView />;
      case 'weekly':
        return <div className="p-6">Vista semanal - Proximamente</div>;
      case 'substitutions':
        return <div className="p-6">Xestión de substitucións - Proximamente</div>;
      case 'teachers':
        return <div className="p-6">Xestión de profesorado - Proximamente</div>;
      default:
        return <CalendarView />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-auto">
        {activeView === 'messages' ? (
          <div className="h-[calc(100vh-0px)]">
            {renderMainContent()}
          </div>
        ) : (
          <div className="p-6">
            {renderMainContent()}
          </div>
        )}
      </main>
    </div>
  );
};