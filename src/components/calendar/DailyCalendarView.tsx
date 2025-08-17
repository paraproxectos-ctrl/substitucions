import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Eye, EyeOff, Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isToday } from 'date-fns';
import { gl } from 'date-fns/locale';

interface Substitucion {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  motivo_outro?: string;
  observacions?: string;
  vista: boolean;
  confirmada_professor: boolean;
  grupos_educativos: {
    nome: string;
    nivel: string;
  } | null;
  profiles: {
    nome: string;
    apelidos: string;
  } | null;
  profesor_asignado_id: string;
}

export const DailyCalendarView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [substitucions, setSubstitucions] = useState<Substitucion[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const fetchDailySubstitutions = async () => {
    try {
      setLoading(true);
      const targetDate = format(selectedDate, 'yyyy-MM-dd');

      const { data: substitutionsData, error: substitutionsError } = await supabase
        .from('substitucions')
        .select(`
          *,
          grupos_educativos (nome, nivel)
        `)
        .eq('data', targetDate)
        .order('hora_inicio');

      if (substitutionsError) {
        console.error('Error fetching substitutions:', substitutionsError);
        toast({
          title: "Error",
          description: "Non se puideron cargar as substitucións",
          variant: "destructive",
        });
        return;
      }

      if (substitutionsData && substitutionsData.length > 0) {
        const professorIds = substitutionsData.map(sub => sub.profesor_asignado_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, nome, apelidos')
          .in('user_id', professorIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        const enrichedSubstitutions = substitutionsData.map(sub => ({
          ...sub,
          profiles: profilesData?.find(profile => profile.user_id === sub.profesor_asignado_id) || null
        }));

        setSubstitucions(enrichedSubstitutions as any);
      } else {
        setSubstitucions([]);
      }
    } catch (error) {
      console.error('Error in fetchDailySubstitutions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySubstitutions();
  }, [selectedDate]);

  const confirmSubstitution = async (substitutionId: string) => {
    try {
      const { error } = await supabase
        .from('substitucions')
        .update({ 
          confirmada_professor: true,
          vista: true 
        })
        .eq('id', substitutionId)
        .eq('profesor_asignado_id', user?.id);

      if (error) {
        console.error('Error confirming substitution:', error);
        toast({
          title: "Error",
          description: "Non se puido confirmar a substitución",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setSubstitucions(prev => 
        prev.map(sub => 
          sub.id === substitutionId 
            ? { ...sub, confirmada_professor: true, vista: true } 
            : sub
        )
      );

      toast({
        title: "Substitución confirmada",
        description: "Confirmaches que cubres esta substitución",
      });
    } catch (error) {
      console.error('Error in confirmSubstitution:', error);
      toast({
        title: "Error",
        description: "Erro inesperado ao confirmar a substitución",
        variant: "destructive",
      });
    }
  };

  const markAsViewed = async (substitutionId: string) => {
    try {
      const { error } = await supabase
        .from('substitucions')
        .update({ vista: true })
        .eq('id', substitutionId)
        .eq('profesor_asignado_id', user?.id);

      if (error) {
        console.error('Error marking as viewed:', error);
        toast({
          title: "Error",
          description: "Non se puido marcar como vista",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setSubstitucions(prev => 
        prev.map(sub => 
          sub.id === substitutionId ? { ...sub, vista: true } : sub
        )
      );

      toast({
        title: "Substitución marcada",
        description: "Marcaches a substitución como vista",
      });
    } catch (error) {
      console.error('Error in markAsViewed:', error);
    }
  };

  const getMotivoLabel = (motivo: string, motivoOutro?: string) => {
    const motivoLabels: Record<string, string> = {
      'ausencia_imprevista': 'Ausencia imprevista',
      'enfermidade': 'Enfermidade',
      'asuntos_propios': 'Asuntos propios',
      'outro': motivoOutro || 'Outro'
    };
    return motivoLabels[motivo] || motivo;
  };

  const getMotivoColor = (motivo: string) => {
    const colors: Record<string, string> = {
      'ausencia_imprevista': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'enfermidade': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'asuntos_propios': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'outro': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return colors[motivo] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const mySubstitutions = substitucions.filter(sub => sub.profesor_asignado_id === user?.id);
  const otherSubstitutions = substitucions.filter(sub => sub.profesor_asignado_id !== user?.id);
  const unconfirmedCount = mySubstitutions.filter(sub => !sub.confirmada_professor).length;

  const renderSubstitutionCard = (sub: Substitucion, isMySubstitution: boolean = false) => (
    <Card key={sub.id} className={`mb-3 ${isMySubstitution ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {sub.hora_inicio} - {sub.hora_fin}
              </span>
              <Badge className={`text-xs ${getMotivoColor(sub.motivo)}`}>
                {getMotivoLabel(sub.motivo, sub.motivo_outro)}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <strong>Grupo:</strong> {sub.grupos_educativos?.nome || 'Sen asignar'}
            </div>
            
            {sub.observacions && (
              <div className="text-sm text-muted-foreground">
                <strong>Observacións:</strong> {sub.observacions}
              </div>
            )}
            
            {!isMySubstitution && (
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-1" />
                <strong>Prof:</strong> {sub.profiles?.nome} {sub.profiles?.apelidos}
              </div>
            )}
          </div>
          
          {isMySubstitution && (
            <div className="flex flex-col items-end space-y-2">
              {sub.confirmada_professor ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmada
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => confirmSubstitution(sub.id)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirmar
                </Button>
              )}
              
              {sub.vista ? (
                <Badge variant="secondary" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Vista
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsViewed(sub.id)}
                  className="text-xs"
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  Marcar vista
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando substitucións...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Substitucións do día
          </h1>
          {unconfirmedCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              <BellRing className="h-3 w-3 mr-1" />
              {unconfirmedCount} sen confirmar
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday(selectedDate)}
          >
            Hoxe
          </Button>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          />
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

      {/* Alert for unconfirmed substitutions */}
      {unconfirmedCount > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Tes {unconfirmedCount} substitución{unconfirmedCount > 1 ? 'es' : ''} sen confirmar. 
            Por favor, revisa e confirma as túas substitucións.
          </AlertDescription>
        </Alert>
      )}

      {/* My Substitutions */}
      {mySubstitutions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            As miñas substitucións ({mySubstitutions.length})
          </h2>
          {mySubstitutions.map(sub => renderSubstitutionCard(sub, true))}
        </div>
      )}

      {/* Other Substitutions */}
      {otherSubstitutions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
            Outras substitucións ({otherSubstitutions.length})
          </h2>
          {otherSubstitutions.map(sub => renderSubstitutionCard(sub, false))}
        </div>
      )}

      {/* No substitutions */}
      {substitucions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Sen substitucións
            </h3>
            <p className="text-muted-foreground">
              Non hai substitucións programadas para este día.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
