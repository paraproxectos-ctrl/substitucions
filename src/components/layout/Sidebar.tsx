import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
  PlusCircle,
  HelpCircle,
  CheckCircle,
  FolderOpen,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onClose, isMobile, collapsed }) => {
  const { userRole, profile, signOut } = useAuth();
  const { toast } = useToast();
  
  const isAdmin = userRole?.role === 'admin';
  
  console.log('Sidebar - userRole:', userRole, 'isAdmin:', isAdmin, 'profile:', profile);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleResetApp = async () => {
    if (!isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can reset the app",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = "⚠️ ATENCIÓN: Esta acción eliminará TODOS os datos da aplicación (profesores, substitucións, arquivos, etc.) e non se pode desfacer.\n\nÓ único que se conservará é a túa conta de administrador.\n\n¿Estás COMPLETAMENTE seguro?";
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const secondConfirm = "Esta é a túa última oportunidade para cancelar.\n\n¿Proceder co reseteo TOTAL da aplicación?";
    if (!confirm(secondConfirm)) {
      return;
    }

    try {
      toast({
        title: "Iniciando reseteo...",
        description: "Este proceso pode tardar uns momentos",
      });

      const { data, error } = await supabase.functions.invoke('reset-app', {
        body: {},
      });

      if (error) {
        console.error('Reset error:', error);
        toast({
          title: "Error",
          description: "Non se puido resetear a aplicación",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Reseteo completado",
        description: "A aplicación foi reseteada correctamente. Recargando...",
      });

      // Reload the page after successful reset
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Reset failed:', error);
      toast({
        title: "Error",
        description: "Fallo durante o reseteo da aplicación",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    {
      id: 'calendar',
      label: 'Calendario',
      icon: Calendar,
      available: true,
    },
    {
      id: 'daily-calendar',
      label: 'Substitucións do día',
      icon: CalendarDays,
      available: true,
    },
    {
      id: 'arquivos',
      label: 'Arquivos',
      icon: FolderOpen,
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
      id: 'confirmations',
      label: 'Estado das confirmacións',
      icon: CheckCircle,
      available: isAdmin,
    },
    {
      id: 'reports',
      label: 'Informes e estatísticas',
      icon: Settings,
      available: isAdmin,
    },
    {
      id: 'axuda',
      label: 'Axuda',
      icon: HelpCircle,
      available: true,
    },
  ];

  return (
    <div className="w-48 md:w-64 bg-card border-r border-border h-screen flex flex-col shrink-0 md:relative fixed md:translate-x-0 z-40">
      {/* Header */}
      <div className="p-3 md:p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <School className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <div className="min-w-0">
            <h2 className="font-bold text-sm md:text-lg text-foreground truncate">Valle Inclán</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Substitucións</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-2 md:p-4 border-b border-border">
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="font-medium text-xs md:text-sm text-foreground truncate">
              {profile?.nome} {profile?.apelidos}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {userRole?.role === 'admin' ? 'Admin' : 'Profesor/a'}
            </p>
          </div>
          {/* Logout Button */}
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 text-xs md:text-sm h-7 md:h-8"
            onClick={signOut}
          >
            <LogOut className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="truncate">Saír</span>
          </Button>
          
          {/* Reset App Button - Only for admins */}
          {isAdmin && (
            <Button
              variant="ghost"
              className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs md:text-sm h-7 md:h-8"
              onClick={handleResetApp}
            >
              <RotateCcw className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="truncate">Resetear App</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 md:p-4 space-y-1 md:space-y-2">
        {menuItems
          .filter(item => item.available)
          .map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeView === item.id ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start text-xs md:text-sm h-8 md:h-9",
                  activeView === item.id && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => {
                  console.log(`Clicking menu item: ${item.id}, available: ${item.available}, isAdmin: ${isAdmin}`);
                  handleViewChange(item.id);
                }}
              >
                <Icon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
      </nav>

      {/* Profile */}
      <div className="p-2 md:p-4 border-t border-border">
        <UserProfile />
      </div>
    </div>
  );
};