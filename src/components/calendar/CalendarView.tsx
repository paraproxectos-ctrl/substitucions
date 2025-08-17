import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Eye, EyeOff, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { 
  format, 
  parseISO, 
  isToday, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  addDays,
  eachDayOfInterval,
  addWeeks,
  addMonths,
  isSameDay,
  isSameMonth,
  isWithinInterval
} from 'date-fns';
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

type CalendarView = 'month' | 'week' | 'day';

export const CalendarView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [substitucions, setSubstitucions] = useState<Substitucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFormDate, setCreateFormDate] = useState<Date | null>(null);
  const [createFormData, setCreateFormData] = useState({
    hora_inicio: '',
    hora_fin: '',
    motivo: '' as 'ausencia_imprevista' | 'enfermidade' | 'asuntos_propios' | 'outro' | '',
    motivo_outro: '',
    observacions: '',
    grupo_id: '',
    profesor_asignado_id: '',
    profesor_ausente_id: 'none',
    sesion: 'none' as 'primeira' | 'segunda' | 'terceira' | 'cuarta' | 'quinta' | 'recreo' | 'hora_lectura' | 'none',
    guardia_transporte: 'ningun' as 'ningun' | 'entrada' | 'saida'
  });
  const [recommendedTeacher, setRecommendedTeacher] = useState<any>(null);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const getDateRange = () => {
    switch (view) {
      case 'month':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
      case 'week':
        return {
          start: startOfWeek(selectedDate, { locale: gl }),
          end: endOfWeek(selectedDate, { locale: gl })
        };
      case 'day':
        return {
          start: startOfDay(selectedDate),
          end: endOfDay(selectedDate)
        };
    }
  };

  const fetchSubstitucions = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const { data: substitutionsData, error: substitutionsError } = await supabase
        .from('substitucions')
        .select(`
          *,
          grupos_educativos (nome, nivel)
        `)
        .gte('data', format(start, 'yyyy-MM-dd'))
        .lte('data', format(end, 'yyyy-MM-dd'))
        .order('data')
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
      console.error('Error in fetchSubstitucions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nome, apelidos, email, horas_libres_semanais, sustitucions_realizadas_semana')
        .order('nome');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos_educativos')
        .select('*')
        .order('nivel')
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      console.error('Error fetching grupos:', error);
    }
  };

  useEffect(() => {
    fetchSubstitucions();
    if (userRole?.role === 'admin') {
      fetchProfiles();
      fetchGrupos();
    }
  }, [selectedDate, view, userRole]);

  const markAsViewed = async (substitutionId: string) => {
    try {
      console.log('Attempting to mark substitution as viewed:', {
        substitutionId,
        userId: user?.id,
        userRole: userRole?.role
      });

      const { data, error } = await supabase
        .from('substitucions')
        .update({ vista: true })
        .eq('id', substitutionId)
        .eq('profesor_asignado_id', user?.id)
        .select();

      if (error) {
        console.error('Error marking as viewed:', error);
        toast({
          title: "Error",
          description: "Non se puido marcar como vista",
          variant: "destructive",
        });
        return;
      }

      console.log('Successfully updated substitution:', data);

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
      toast({
        title: "Error",
        description: "Erro inesperado ao marcar como vista",
        variant: "destructive",
      });
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

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      switch (view) {
        case 'month':
          return direction === 'prev' ? addMonths(prev, -1) : addMonths(prev, 1);
        case 'week':
          return direction === 'prev' ? addWeeks(prev, -1) : addWeeks(prev, 1);
        case 'day':
          return direction === 'prev' ? addDays(prev, -1) : addDays(prev, 1);
      }
    });
  };

  const getViewTitle = () => {
    switch (view) {
      case 'month':
        return format(selectedDate, "MMMM 'de' yyyy", { locale: gl });
      case 'week': {
        const { start, end } = getDateRange();
        return `${format(start, "d MMM", { locale: gl })} - ${format(end, "d MMM yyyy", { locale: gl })}`;
      }
      case 'day':
        return format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: gl });
    }
  };

  const getSubstitutionsForDate = (date: Date) => {
    return substitucions.filter(sub => isSameDay(parseISO(sub.data), date));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (userRole?.role === 'admin') {
      openCreateDialog(date);
    }
  };

  const openCreateDialog = async (date: Date) => {
    setCreateFormDate(date);
    setCreateFormData({
      hora_inicio: '',
      hora_fin: '',
      motivo: '' as typeof createFormData.motivo,
      motivo_outro: '',
      observacions: '',
      grupo_id: '',
      profesor_asignado_id: '',
      profesor_ausente_id: 'none',
      sesion: 'none' as typeof createFormData.sesion,
      guardia_transporte: 'ningun' as typeof createFormData.guardia_transporte
    });
    
    // Get recommended teacher with proportional assignment
    try {
      // Reset weekly counters first
      await supabase.rpc('reset_weekly_counters');
      
      const { data, error } = await supabase.rpc('get_proportional_teacher');
      
      if (error) {
        console.error('Error getting proportional teacher:', error);
        return;
      }
      
      if (!data) {
        setRecommendedTeacher(null);
        toast({
          title: "Non hai profesorado dispoñíbel",
          description: "Non hai profesorado dispoñíbel dentro do cupo semanal",
          variant: "destructive",
        });
        return;
      }
      
      // Find the teacher profile
      const teacher = profiles.find(p => p.user_id === data);
      if (teacher) {
        setRecommendedTeacher(teacher);
        setCreateFormData(prev => ({
          ...prev,
          profesor_asignado_id: data
        }));
      } else {
        setRecommendedTeacher(null);
        toast({
          title: "Error",
          description: "Non se puido cargar a información do profesor recomendado",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in getRecommendedTeacher:', error);
    }
    
    setShowCreateDialog(true);
  };

  const handleCreateSubstitution = async () => {
    if (!createFormDate) return;

    try {
      const substitutionData = {
        data: format(createFormDate, 'yyyy-MM-dd'),
        hora_inicio: createFormData.hora_inicio || '08:00', // Default time if empty
        hora_fin: createFormData.hora_fin || '09:00', // Default time if empty
        motivo: createFormData.motivo || 'outro' as 'ausencia_imprevista' | 'enfermidade' | 'asuntos_propios' | 'outro',
        motivo_outro: createFormData.motivo_outro || null,
        observacions: createFormData.observacions || null,
        grupo_id: createFormData.grupo_id || null,
        profesor_asignado_id: createFormData.profesor_asignado_id || null,
        profesor_ausente_id: createFormData.profesor_ausente_id === 'none' ? null : createFormData.profesor_ausente_id || null,
        sesion: createFormData.sesion === 'none' ? null : createFormData.sesion || null,
        guardia_transporte: createFormData.guardia_transporte as 'ningun' | 'entrada' | 'saida',
        created_by: user?.id,
        vista: false
      };

      const { error: insertError } = await supabase
        .from('substitucions')
        .insert([substitutionData]);

      if (insertError) {
        console.error('Error creating substitution:', insertError);
        toast({
          title: "Error",
          description: "Non se puido crear a substitución",
          variant: "destructive",
        });
        return;
      }

      // Increment teacher substitution counter if teacher is assigned
      if (substitutionData.profesor_asignado_id) {
        const { error: incrementError } = await supabase.rpc('increment_teacher_substitution', {
          teacher_id: substitutionData.profesor_asignado_id
        });

        if (incrementError) {
          console.error('Error incrementing teacher substitution:', incrementError);
        }
      }

      toast({
        title: "Éxito",
        description: "Substitución creada correctamente",
      });

      setShowCreateDialog(false);
      setCreateFormData({
        hora_inicio: '',
        hora_fin: '',
        motivo: '' as typeof createFormData.motivo,
        motivo_outro: '',
        observacions: '',
        grupo_id: '',
        profesor_asignado_id: '',
        profesor_ausente_id: 'none',
        sesion: 'none' as typeof createFormData.sesion,
        guardia_transporte: 'ningun' as typeof createFormData.guardia_transporte
      });
      setRecommendedTeacher(null);
      await fetchSubstitucions();
    } catch (error) {
      console.error('Error in handleCreateSubstitution:', error);
      toast({
        title: "Error",
        description: "Ocorreu un erro inesperado",
        variant: "destructive",
      });
    }
  };

  const mySubstitutions = substitucions.filter(sub => sub.profesor_asignado_id === user?.id);
  const otherSubstitutions = substitucions.filter(sub => sub.profesor_asignado_id !== user?.id);

  const renderSubstitutionCard = (sub: Substitucion, isMySubstitution: boolean = false) => (
    <div
      key={sub.id}
      className={`p-3 border rounded-lg ${isMySubstitution ? 'border-accent/20 bg-accent/5' : 'border-border'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {sub.hora_inicio} - {sub.hora_fin}
            </span>
            <Badge className={`text-xs ${getMotivoColor(sub.motivo)}`}>
              {getMotivoLabel(sub.motivo, sub.motivo_outro)}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <strong>Grupo:</strong> {sub.grupos_educativos?.nome}
          </div>
          
          {!isMySubstitution && (
            <div className="flex items-center text-xs text-muted-foreground">
              <User className="h-3 w-3 mr-1" />
              <strong>Prof:</strong> {sub.profiles?.nome} {sub.profiles?.apelidos}
            </div>
          )}
        </div>
        
        {isMySubstitution && (
          <div className="flex items-center space-x-2">
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
                className="text-xs h-6"
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Marcar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderMonthView = () => {
    const { start, end } = getDateRange();
    const daysInView = eachDayOfInterval({ start, end });
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Headers dos días da semana */}
        {['Lun', 'Mar', 'Mér', 'Xov', 'Ven', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Días do mes */}
        {daysInView.map((day) => {
          const daySubstitutions = getSubstitutionsForDate(day);
          const myDaySubstitutions = daySubstitutions.filter(sub => sub.profesor_asignado_id === user?.id);
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isToday(day);
          
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] p-1 border border-border/50 cursor-pointer hover:bg-accent/20 ${
                !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''
              } ${isSelected ? 'ring-2 ring-primary' : ''} ${isDayToday ? 'bg-primary/5' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <div className={`text-sm font-medium mb-1 ${isDayToday ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {myDaySubstitutions.map((sub) => (
                  <div key={sub.id} className="text-xs p-1 bg-accent rounded truncate">
                    {sub.hora_inicio} - {sub.grupos_educativos?.nome}
                  </div>
                ))}
                {daySubstitutions.length - myDaySubstitutions.length > 0 && (
                  <div className="text-xs p-1 bg-muted rounded truncate">
                    +{daySubstitutions.length - myDaySubstitutions.length} outras
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const { start, end } = getDateRange();
    const daysInWeek = eachDayOfInterval({ start, end });
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {daysInWeek.map((day) => {
          const daySubstitutions = getSubstitutionsForDate(day);
          const myDaySubstitutions = daySubstitutions.filter(sub => sub.profesor_asignado_id === user?.id);
          const otherDaySubstitutions = daySubstitutions.filter(sub => sub.profesor_asignado_id !== user?.id);
          const isSelected = isSameDay(day, selectedDate);
          const isDayToday = isToday(day);
          
          return (
            <Card
              key={day.toISOString()}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                isSelected ? 'ring-2 ring-primary' : ''
              } ${isDayToday ? 'border-primary' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <CardHeader className="pb-2">
                <CardTitle className={`text-center text-lg ${isDayToday ? 'text-primary' : ''}`}>
                  {format(day, 'EEE d', { locale: gl })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {myDaySubstitutions.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-accent-foreground">Miñas substitucións</h4>
                    {myDaySubstitutions.map((sub) => renderSubstitutionCard(sub, true))}
                  </div>
                )}
                
                {otherDaySubstitutions.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-muted-foreground">Outras substitucións</h4>
                    {otherDaySubstitutions.slice(0, 2).map((sub) => renderSubstitutionCard(sub, false))}
                    {otherDaySubstitutions.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{otherDaySubstitutions.length - 2} máis
                      </div>
                    )}
                  </div>
                )}
                
                {daySubstitutions.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Sen substitucións
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const daySubstitutions = getSubstitutionsForDate(selectedDate);
    const myDaySubstitutions = daySubstitutions.filter(sub => sub.profesor_asignado_id === user?.id);
    const otherDaySubstitutions = daySubstitutions.filter(sub => sub.profesor_asignado_id !== user?.id);
    
    return (
      <div className="space-y-6">
        {/* My Substitutions */}
        {myDaySubstitutions.length > 0 && (
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg text-accent-foreground">
                As miñas substitucións
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myDaySubstitutions.map((sub) => (
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
        {otherDaySubstitutions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Outras substitucións do día
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {otherDaySubstitutions.map((sub) => (
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
        {daySubstitutions.length === 0 && (
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
    );
  };

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
        
        {/* View selector */}
        <div className="flex items-center space-x-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
          >
            Mes
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            Semana
          </Button>
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('day')}
          >
            Día
          </Button>
        </div>
      </div>

      {/* Navigation and title */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <CardTitle className="text-center text-xl text-primary">
              {getViewTitle()}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={isToday(selectedDate) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Hoxe
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar content */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Cargando substitucións...</p>
        </div>
      ) : (
        <div>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      )}

      {/* Create Substitution Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Crear substitución para {createFormDate && format(createFormDate, "d 'de' MMMM 'de' yyyy", { locale: gl })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Hora inicio</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={createFormData.hora_inicio}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hora_fin">Hora fin</Label>
              <Input
                id="hora_fin"
                type="time"
                value={createFormData.hora_fin}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, hora_fin: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Select 
                value={createFormData.motivo} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, motivo: value as typeof prev.motivo }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausencia_imprevista">Ausencia imprevista</SelectItem>
                  <SelectItem value="enfermidade">Enfermidade</SelectItem>
                  <SelectItem value="asuntos_propios">Asuntos propios</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {createFormData.motivo === 'outro' && (
              <div className="space-y-2">
                <Label htmlFor="motivo_outro">Especificar motivo</Label>
                <Input
                  id="motivo_outro"
                  value={createFormData.motivo_outro}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, motivo_outro: e.target.value }))}
                  placeholder="Describe o motivo"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="grupo_id">Grupo</Label>
              <Select 
                value={createFormData.grupo_id} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, grupo_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nivel} - {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profesor_asignado_id">
                Profesor asignado
                {recommendedTeacher && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Recomendado: {recommendedTeacher.nome} {recommendedTeacher.apelidos})
                  </span>
                )}
              </Label>
              <Select 
                value={createFormData.profesor_asignado_id} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, profesor_asignado_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.nome} {profile.apelidos}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({profile.sustitucions_realizadas_semana}/{profile.horas_libres_semanais})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profesor_ausente_id">Profesor ausente (opcional)</Label>
              <Select 
                value={createFormData.profesor_ausente_id} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, profesor_ausente_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona profesor ausente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sen especificar</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.nome} {profile.apelidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sesion">Sesión (opcional)</Label>
              <Select 
                value={createFormData.sesion} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, sesion: value as typeof prev.sesion }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona sesión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sen especificar</SelectItem>
                  <SelectItem value="primeira">Primeira</SelectItem>
                  <SelectItem value="segunda">Segunda</SelectItem>
                  <SelectItem value="terceira">Terceira</SelectItem>
                  <SelectItem value="cuarta">Cuarta</SelectItem>
                  <SelectItem value="quinta">Quinta</SelectItem>
                  <SelectItem value="recreo">Recreo</SelectItem>
                  <SelectItem value="hora_lectura">Hora de lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="guardia_transporte">Guardia transporte (opcional)</Label>
              <Select 
                value={createFormData.guardia_transporte} 
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, guardia_transporte: value as typeof prev.guardia_transporte }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona guardia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ningun">Ningún</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="observacions">Observacións (opcional)</Label>
              <Textarea
                id="observacions"
                value={createFormData.observacions}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, observacions: e.target.value }))}
                placeholder="Observacións adicionais..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubstitution}>
              Crear substitución
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
