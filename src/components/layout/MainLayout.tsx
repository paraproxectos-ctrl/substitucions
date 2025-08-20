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
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Auth from '@/pages/Auth';

export const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState('calendar');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

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

  // Si no hay usuario autenticado, mostrar la página de auth
  if (!user) {
    return <Auth />;
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
    <div className="flex h-screen bg-background w-full relative">
      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="fixed top-4 left-4 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-4 w-4" />
          <span className="ml-2">VER</span>
        </Button>
      )}

      {/* Sidebar */}
      <div className={`flex-shrink-0 ${isMobile ? 'fixed inset-y-0 left-0 z-40' : ''} ${
        isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'
      } transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          activeView={activeView} 
          onViewChange={setActiveView}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
      </div>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className={`flex-1 overflow-auto min-w-0 ${isMobile ? 'w-full' : 'ml-48'}`}>
        <div className={`p-3 md:p-6 w-full ${isMobile ? 'pt-16' : ''}`}>
          {renderMainContent()}
        </div>
      </main>
    </div>
  );
};