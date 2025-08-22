import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from './Sidebar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { DailyCalendarView } from '@/components/calendar/DailyCalendarView';
import { TeacherManagement } from '@/components/admin/TeacherManagement';
import { SubstitutionManagement } from '@/components/admin/SubstitutionManagement';
import { ConfirmationDashboard } from '@/components/admin/ConfirmationDashboard';
import { ReportsAndStatistics } from '@/components/admin/ReportsAndStatistics';
import { AxudaView } from '@/components/help/AxudaView';
import { SubstitutionsPopup } from '@/components/substitutions/SubstitutionsPopup';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Auth from '@/pages/Auth';

export const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);  
  const { user, loading, userRole } = useAuth();
  const isMobile = useIsMobile();

  // Control body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isSidebarOpen]);

  // Close sidebar on route change in mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [activeView, isMobile]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isSidebarOpen]);

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
      {/* Sidebar Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 left-4 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-expanded={isSidebarOpen}
        aria-controls="main-sidebar"
      >
        <Menu className="h-4 w-4" />
        <span className="ml-2">{isSidebarOpen ? 'OCULTAR' : 'VER'}</span>
      </Button>

      {/* Sidebar */}
      {isSidebarOpen && (
        <div 
          id="main-sidebar"
          className={`
            flex-shrink-0 transition-all duration-300 ease-in-out
            ${isMobile ? 'fixed inset-y-0 left-0 z-40 w-80' : 'relative w-80'}
          `}
        >
          <Sidebar 
            activeView={activeView} 
            onViewChange={setActiveView}
            onClose={() => setIsSidebarOpen(false)}
            isMobile={isMobile}
            collapsed={false}
          />
        </div>
      )}

      {/* Mobile backdrop */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        <div className="p-3 md:p-6 w-full pt-16">
          {renderMainContent()}
        </div>
      </main>

      {/* Substitutions Popup */}
      <SubstitutionsPopup />
    </div>
  );
};