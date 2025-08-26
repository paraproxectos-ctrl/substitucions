import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, EyeOff, Clock, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { gl } from 'date-fns/locale';

interface SubstitutionConfirmation {
  substitution_id: string;
  professor_id: string;
  professor_name: string;
  hora_inicio: string;
  hora_fin: string;
  grupo_nome: string;
  confirmada: boolean;
  vista: boolean;
}

export const ConfirmationDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [confirmations, setConfirmations] = useState<SubstitutionConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { userRole } = useAuth();
  const { toast } = useToast();

  // Verificar que é administrador
  if (userRole?.role !== 'admin') {
    return (
      <Alert>
        <AlertDescription>
          Non tes permisos para acceder a esta sección.
        </AlertDescription>
      </Alert>
    );
  }

  const fetchConfirmations = async () => {
    try {
      setLoading(true);
      const targetDate = format(selectedDate, 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('get_substitution_confirmations', {
        target_date: targetDate
      });

      if (error) {
        console.error('Error fetching confirmations:', error);
        toast({
          title: "Error",
          description: "Non se puideron cargar as confirmacións",
          variant: "destructive",
        });
        return;
      }

      setConfirmations(data || []);
    } catch (error) {
      console.error('Error in fetchConfirmations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfirmations();
  }, [selectedDate]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchConfirmations();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDate]);

  const getStatusColor = (confirmada: boolean, vista: boolean) => {
    if (confirmada || vista) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const getStatusIcon = (confirmada: boolean, vista: boolean) => {
    if (confirmada || vista) {
      return <Eye className="h-4 w-4" />;
    } else {
      return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (confirmada: boolean, vista: boolean) => {
    if (confirmada || vista) return 'Vista';
    return 'Pendente';
  };

  const confirmedCount = confirmations.filter(c => c.confirmada).length;
  const viewedCount = confirmations.filter(c => c.vista && !c.confirmada).length;
  const pendingCount = confirmations.filter(c => !c.vista).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando confirmacións...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Estado das Confirmacións
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date())}
          >
            Hoxe
          </Button>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          />
          <Button
            variant="outline"
            onClick={fetchConfirmations}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Date Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: gl })}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{viewedCount + confirmedCount}</p>
                <p className="text-sm text-muted-foreground">Vistas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmations List */}
      {confirmations.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Substitucións do día ({confirmations.length})
          </h2>
          {confirmations.map((confirmation) => (
            <Card key={confirmation.substitution_id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {confirmation.hora_inicio} - {confirmation.hora_fin}
                      </span>
                      <Badge className={getStatusColor(confirmation.confirmada, confirmation.vista)}>
                        {getStatusIcon(confirmation.confirmada, confirmation.vista)}
                        <span className="ml-1">
                          {getStatusText(confirmation.confirmada, confirmation.vista)}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <strong>Grupo:</strong> {confirmation.grupo_nome || 'Sen asignar'}
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="h-4 w-4 mr-1" />
                      <strong>Profesor:</strong> {confirmation.professor_name}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Sen substitucións
            </h3>
            <p className="text-muted-foreground">
              Non hai substitucións programadas para este día.
            </p>
          </CardContent>
        </Card>
      )}

      {pendingCount > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Hai {pendingCount} substitución{pendingCount > 1 ? 'es' : ''} sen confirmar polo profesorado.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};