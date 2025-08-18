import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from './Sidebar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { DailyCalendarView } from '@/components/calendar/DailyCalendarView';
import { TeacherManagement } from '@/components/admin/TeacherManagement';
import { SubstitutionManagement } from '@/components/admin/SubstitutionManagement';
import { ConfirmationDashboard } from '@/components/admin/ConfirmationDashboard';
import { ReportsAndStatistics } from '@/components/admin/ReportsAndStatistics';
import { AxudaView } from '@/components/help/AxudaView';
import Auth from '@/pages/Auth';

export const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState('calendar');
  
  // Para hosting tradicional: intentar usar auth pero no depender de él
  let user = null;
  let loading = false;
  
  try {
    const authData = useAuth();
    user = authData.user;
    loading = authData.loading;
  } catch (error) {
    console.log('Auth no disponible, continuando sin autenticación');
    // Continuar sin autenticación
  }

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

  // MODO DEMO: Si no hay usuario, mostrar la aplicación de todos modos
  if (!user) {
    console.log('Funcionando en modo demo sin autenticación');
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'calendar':
        return <CalendarView />;
      case 'daily-calendar':
        return <DailyCalendarView />;
      case 'substitutions':
        return <SubstitutionManagement />;
      case 'teachers':
        return <TeacherManagement />;
      case 'confirmations':
        return <ConfirmationDashboard />;
      case 'reports':
        return <ReportsAndStatistics />;
      case 'axuda':
        return <AxudaView />;
      default:
        return <CalendarView />;
    }
  };

  return (
    <div className="flex h-screen bg-background w-full">
      <div className="flex-shrink-0">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
      </div>
      <main className="flex-1 overflow-auto min-w-0">
        <div className="p-6 w-full">
          {renderMainContent()}
        </div>
      </main>
    </div>
  );
};