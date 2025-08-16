import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/profile/UserProfile';
import { 
  Calendar, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut,
  School,
  CalendarDays,
  UserPlus,
  PlusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { userRole, signOut, profile } = useAuth();
  const isAdmin = userRole?.role === 'admin';

  const menuItems = [
    {
      id: 'calendar',
      label: 'Calendario',
      icon: Calendar,
      available: true,
    },
    {
      id: 'substitutions',
      label: 'Xestionar substitucións',
      icon: PlusCircle,
      available: isAdmin,
    },
    {
      id: 'teachers',
      label: 'Xestionar profesorado',
      icon: UserPlus,
      available: isAdmin,
    },
    {
      id: 'reports',
      label: 'Informes e estatísticas',
      icon: Settings,
      available: isAdmin,
    },
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <School className="h-8 w-8 text-primary" />
          <div>
            <h2 className="font-bold text-lg text-foreground">Valle Inclán</h2>
            <p className="text-sm text-muted-foreground">Substitucións</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="space-y-1">
          <p className="font-medium text-sm text-foreground">
            {profile?.nome} {profile?.apelidos}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {userRole?.role === 'admin' ? 'Administrador/a' : 'Profesor/a'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems
          .filter(item => item.available)
          .map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeView === item.id ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start",
                  activeView === item.id && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => {
                  console.log(`Clicking menu item: ${item.id}, available: ${item.available}, isAdmin: ${isAdmin}`);
                  onViewChange(item.id);
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
      </nav>

      {/* Profile and Logout */}
      <div className="p-4 border-t border-border space-y-2">
        <UserProfile />
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Saír
        </Button>
      </div>
    </div>
  );
};