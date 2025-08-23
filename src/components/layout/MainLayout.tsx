
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from './Sidebar';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import { SubstitutionConfirmationPopup } from '@/components/substitutions/SubstitutionConfirmationPopup';

export const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state based on screen size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`
        md:relative md:block fixed inset-y-0 left-0 z-50 
        ${sidebarOpen ? 'block' : 'hidden md:block'} 
        transition-all duration-300 ease-in-out
      `}>
        <Sidebar activeView="calendar" onViewChange={() => {}} />
      </div>

      {/* Main content */}
      <div className={`
        flex-1 flex flex-col min-h-screen
        ${sidebarOpen ? 'md:ml-64' : 'ml-0'}
        transition-all duration-300 ease-in-out
      `}>
        <Index onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Substitution Confirmation Popup */}
      <SubstitutionConfirmationPopup />
    </div>
  );
};
