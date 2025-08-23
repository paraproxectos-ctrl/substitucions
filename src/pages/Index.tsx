import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface IndexProps {
  onToggleSidebar?: () => void;
}

const Index: React.FC<IndexProps> = ({ onToggleSidebar }) => {
  const { user, profile } = useAuth();

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4 ml-4">
            <h1 className="text-xl font-semibold">
              Benvindo/a, {profile?.nome || user?.email}
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <CalendarView />
      </main>
    </div>
  );
};

export default Index;
