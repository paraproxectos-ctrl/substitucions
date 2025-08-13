import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isToday, startOfDay, endOfDay } from 'date-fns';
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

export const CalendarView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [substitucions, setSubstitucions] = useState<Substitucion[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const fetchSubstitucions = async () => {
    try {
      setLoading(true);
      const startDate = startOfDay(selectedDate);
      const endDate = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from('substitucions')
        .select(`
          *,
          grupos_educativos (nome, nivel),
          profiles!substitucions_profesor_asignado_id_fkey (nome, apelidos)
        `)
        .gte('data', format(startDate, 'yyyy-MM-dd'))
        .lte('data', format(endDate, 'yyyy-MM-dd'))
        .order('hora_inicio');

      if (error) {
        console.error('Error fetching substitutions:', error);
        toast({
          title: "Error",
          description: "Non se puideron cargar as substitucións",
          variant: "destructive",
        });
        return;
      }

      setSubstitucions((data as any) || []);
    } catch (error) {
      console.error('Error in fetchSubstitucions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstitucions();
  }, [selectedDate]);

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
      'ausencia_imprevista': 'bg-red-100 text-red-800',
      'enfermidade': 'bg-orange-100 text-orange-800',
      'asuntos_propios': 'bg-blue-100 text-blue-800',
      'outro': 'bg-purple-100 text-purple-800'
    };
    return colors[motivo] || 'bg-gray-100 text-gray-800';
  };

  const mySubstitutions = substitucions.filter(sub => sub.profesor_asignado_id === user?.id);
  const otherSubstitutions = substitucions.filter(sub => sub.profesor_asignado_id !== user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Calendario de substitucións
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
          >
            ← Día anterior
          </Button>
          
          <Button
            variant={isToday(selectedDate) ? "default" : "outline"}
            onClick={() => setSelectedDate(new Date())}
          >
            Hoxe
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
          >
            Día seguinte →
          </Button>
        </div>
      </div>

      {/* Selected Date */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-center text-xl text-primary">
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: gl })}
          </CardTitle>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Cargando substitucións...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* My Substitutions */}
          {mySubstitutions.length > 0 && (
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="text-lg text-accent-foreground">
                  As miñas substitucións
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mySubstitutions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 border border-accent/20 rounded-lg bg-accent/5"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {sub.hora_inicio} - {sub.hora_fin}
                        </span>
                        <Badge className={getMotivoColor(sub.motivo)}>
                          {getMotivoLabel(sub.motivo, sub.motivo_outro)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <strong>Grupo:</strong> {sub.grupos_educativos?.nome}
                      </div>
                      
                      {sub.observacions && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Observacións:</strong> {sub.observacions}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {sub.vista ? (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>Vista</span>
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => markAsViewed(sub.id)}
                          className="flex items-center space-x-1"
                        >
                          <EyeOff className="h-3 w-3" />
                          <span>Marcar como vista</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Other Substitutions */}
          {otherSubstitutions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Outras substitucións do día
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {otherSubstitutions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {sub.hora_inicio} - {sub.hora_fin}
                        </span>
                        <Badge className={getMotivoColor(sub.motivo)}>
                          {getMotivoLabel(sub.motivo, sub.motivo_outro)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <strong>Grupo:</strong> {sub.grupos_educativos?.nome}
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User className="h-3 w-3 mr-1" />
                        <strong>Profesor/a:</strong> {sub.profiles?.nome} {sub.profiles?.apelidos}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* No substitutions */}
          {substitucions.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Non hai substitucións para este día
                </h3>
                <p className="text-sm text-muted-foreground">
                  Desfruta do teu día normal de clases!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
