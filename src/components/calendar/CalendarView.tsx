import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Eye, EyeOff, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { SubstitutionForm } from '@/components/common/SubstitutionForm';
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
  console.log('=== CalendarView COMPONENT RENDERING ===');
  console.log('Current URL:', window.location.href);
  
  const { user, userRole } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [substitucions, setSubstitucions] = useState<Substitucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFormDate, setCreateFormDate] = useState<Date | null>(null);
  const [createFormData, setCreateFormData] = useState({
    data: '',
    hora_inicio: '',
    hora_fin: '',
    grupo_id: '',
    profesor_ausente_id: '',
    profesor_asignado_id: '',
    motivo: 'ausencia_imprevista' as 'ausencia_imprevista' | 'enfermidade' | 'asuntos_propios' | 'outro',
    motivo_outro: '',
    observacions: ''
  });
  const [recommendedTeacher, setRecommendedTeacher] = useState<any>(null);
  const [showViewDayDialog, setShowViewDayDialog] = useState(false);
  const [viewDayDate, setViewDayDate] = useState<Date | null>(null);
  const { toast } = useToast();

  const getDateRange = () => {
    switch (view) {
      case 'month':
        // For month view, get full weeks that contain the month
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 1 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 1 })
        };
      case 'week':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
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
          grupos_educativos!grupo_id (nome, nivel)
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

  const fetchTeachers = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'profesor');

      if (roleError) {
        console.error('Error fetching teacher roles:', roleError);
        setProfiles([]);
      } else if (roleData && roleData.length > 0) {
        const userIds = roleData.map(role => role.user_id);
        const { data: teachersData, error: teachersError } = await supabase
          .from('profiles')
          .select('user_id, nome, apelidos, email, horas_libres_semanais, sustitucions_realizadas_semana')
          .in('user_id', userIds)
          .neq('nome', '') // Filtrar perfiles sin nombre
          .neq('apelidos', '') // Filtrar perfiles sin apellidos
          .order('nome');

        if (teachersError) {
          console.error('Error fetching teachers:', teachersError);
          setProfiles([]);
        } else {
          // Solo incluir profesores con nombre y apellidos válidos
          const validTeachers = teachersData?.filter(teacher => 
            teacher.nome && teacher.nome.trim() !== '' && 
            teacher.apelidos && teacher.apelidos.trim() !== ''
          ) || [];
          setProfiles(validTeachers);
        }
      } else {
        console.log('No teacher roles found');
        setProfiles([]);
      }
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
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
      fetchTeachers();
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
    // Prevent any default behavior and stop propagation
    try {
      console.log('=== HANDLE DAY CLICK ===');
      console.log('Date clicked:', date);
      console.log('Current URL:', window.location.href);
      console.log('User role:', userRole?.role);
      console.log('User ID:', user?.id);
      
      setSelectedDate(date);
      const daySubstitutions = getSubstitutionsForDate(date);
      console.log('Found substitutions for this day:', daySubstitutions.length);
      
      if (userRole?.role === 'admin') {
        if (daySubstitutions.length > 0) {
          // Si hay sustituciones existentes, mostrar diálogo para ver y añadir
          console.log('Admin: Opening view day dialog (has substitutions)');
          setViewDayDate(date);
          setShowViewDayDialog(true);
        } else {
          // Si no hay sustituciones, crear nueva directamente
          console.log('Admin: Opening create dialog directly (no substitutions)');
          openCreateDialog(date);
        }
      } else {
        // Para profesores, mostrar las sustituciones del día
        console.log('Professor: Opening view day dialog');
        setViewDayDate(date);
        setShowViewDayDialog(true);
      }
      
      console.log('=== END HANDLE DAY CLICK ===');
    } catch (error) {
      console.error('Error in handleDayClick:', error);
    }
  };

  const openCreateDialog = async (date: Date) => {
    console.log('openCreateDialog called with date:', date);
    console.log('profiles available:', profiles.length);
    console.log('grupos available:', grupos.length);
    
    setCreateFormDate(date);
    setCreateFormData({
      data: format(date, 'yyyy-MM-dd'),
      hora_inicio: '',
      hora_fin: '',
      grupo_id: '',
      profesor_ausente_id: '',
      profesor_asignado_id: '',
      motivo: 'ausencia_imprevista',
      motivo_outro: '',
      observacions: ''
    });
    
    // Get recommended teacher with proportional assignment
    try {
      // Reset weekly counters first
      await supabase.rpc('reset_weekly_counters');
      
      const { data, error } = await supabase.rpc('get_proportional_teacher');
      
      if (error) {
        console.error('Error getting proportional teacher:', error);
        setRecommendedTeacher(null);
      } else if (!data) {
        setRecommendedTeacher(null);
        toast({
          title: "Non hai profesorado dispoñíbel",
          description: "Non hai profesorado dispoñíbel dentro do cupo semanal",
          variant: "destructive",
        });
      } else {
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
      }
    } catch (error) {
      console.error('Error in getRecommendedTeacher:', error);
      setRecommendedTeacher(null);
    }
    
    console.log('Setting showCreateDialog to true');
    setShowCreateDialog(true);
  };

  const handleCreateSubstitution = async () => {
    if (!createFormDate) return;

    try {
      const substitutionData = {
        data: format(createFormDate, 'yyyy-MM-dd'),
        hora_inicio: createFormData.hora_inicio || '08:00',
        hora_fin: createFormData.hora_fin || '09:00',
        motivo: createFormData.motivo,
        motivo_outro: createFormData.motivo === 'outro' ? createFormData.motivo_outro : null,
        observacions: createFormData.observacions || null,
        grupo_id: createFormData.grupo_id === 'none' ? null : createFormData.grupo_id || null,
        profesor_asignado_id: createFormData.profesor_asignado_id || null,
        profesor_ausente_id: createFormData.profesor_ausente_id === 'none' ? null : createFormData.profesor_ausente_id || null,
        created_by: user?.id,
        vista: false
      };

      const { error: insertError } = await supabase
        .from('substitucions')
        .insert(substitutionData);

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
        data: '',
        hora_inicio: '',
        hora_fin: '',
        grupo_id: '',
        profesor_ausente_id: '',
        profesor_asignado_id: '',
        motivo: 'ausencia_imprevista',
        motivo_outro: '',
        observacions: ''
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
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  markAsViewed(sub.id);
                }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Month view day clicked:', day);
                handleDayClick(day);
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Week view day clicked:', day);
                handleDayClick(day);
              }}
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
                         type="button"
                         size="sm"
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           markAsViewed(sub.id);
                         }}
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
            type="button"
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setView('month');
            }}
          >
            Mes
          </Button>
          <Button
            type="button"
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setView('week');
            }}
          >
            Semana
          </Button>
          <Button
            type="button"
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setView('day');
            }}
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
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateDate('prev');
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <CardTitle className="text-center text-xl text-primary">
              {getViewTitle()}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={isToday(selectedDate) ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedDate(new Date());
                }}
              >
                Hoxe
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigateDate('next');
                }}
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

      {/* Create Substitution Dialog using unified form */}
      <SubstitutionForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title={createFormDate ? `Crear substitución para ${format(createFormDate, "d 'de' MMMM 'de' yyyy", { locale: gl })}` : "Crear substitución"}
        formData={createFormData}
        setFormData={setCreateFormData}
        teachers={profiles}
        groups={grupos}
        onSubmit={handleCreateSubstitution}
        submitting={false}
        recommendedTeacher={recommendedTeacher}
        onGetRecommendedTeacher={undefined}
        submitButtonText="Crear substitución"
      />
      
      {/* View Day Substitutions Dialog */}
      <Dialog open={showViewDayDialog} onOpenChange={setShowViewDayDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Substitucións do {viewDayDate && format(viewDayDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: gl })}
              </DialogTitle>
              {userRole?.role === 'admin' && viewDayDate && (
                <Button
                  size="sm"
                  onClick={() => {
                    setShowViewDayDialog(false);
                    openCreateDialog(viewDayDate);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova substitución
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {viewDayDate && (() => {
            const daySubstitutions = getSubstitutionsForDate(viewDayDate);
            const myDaySubstitutions = daySubstitutions.filter(sub => sub.profesor_asignado_id === user?.id);
            const otherDaySubstitutions = daySubstitutions.filter(sub => sub.profesor_asignado_id !== user?.id);
            
            return (
              <div className="space-y-6">
                {/* My Substitutions */}
                {myDaySubstitutions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-accent-foreground mb-3">
                      As miñas substitucións
                    </h3>
                    <div className="space-y-3">
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
                    </div>
                  </div>
                )}
                
                {/* Other Substitutions */}
                {otherDaySubstitutions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Outras substitucións do día
                    </h3>
                    <div className="space-y-3">
                      {otherDaySubstitutions.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-4 border rounded-lg"
                        >
                          <div className="space-y-2">
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
                            
                            {sub.observacions && (
                              <div className="text-sm text-muted-foreground">
                                <strong>Observacións:</strong> {sub.observacions}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* No substitutions */}
                {daySubstitutions.length === 0 && (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Non hai substitucións para este día
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Desfruta do teu día normal de clases!
                    </p>
                   </div>
                 )}
               </div>
             );
           })()}
         </DialogContent>
       </Dialog>
     </div>
   );
 };
