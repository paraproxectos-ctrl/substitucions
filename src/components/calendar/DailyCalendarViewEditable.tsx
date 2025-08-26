import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Eye, EyeOff, Bell, BellRing, Edit, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  grupo_id?: string;
  grupos_educativos: {
    nome: string;
    nivel: string;
  } | null;
  profiles: {
    nome: string;
    apelidos: string;
  } | null;
  profesor_asignado_id: string;
  profesor_ausente_id?: string;
  sesion?: string;
  guardia_transporte?: string;
}

interface EditableViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

export const DailyCalendarViewEditable: React.FC<EditableViewProps> = ({ selectedDate, setSelectedDate }) => {
  const [substitucions, setSubstitucions] = useState<Substitucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSubstitution, setEditingSubstitution] = useState<Substitucion | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    data: '',
    hora_inicio: '',
    hora_fin: '',
    grupo_id: '',
    profesor_ausente_id: '',
    profesor_asignado_id: '',
    motivo: 'ausencia_imprevista' as 'ausencia_imprevista' | 'enfermidade' | 'asuntos_propios' | 'outro',
    motivo_outro: '',
    observacions: '',
    sesion: '',
    guardia_transporte: 'ningun' as 'ningun' | 'entrada' | 'saida'
  });
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

  const fetchTeachers = async () => {
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'profesor');

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const teacherIds = userRoles.map(role => role.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, nome, apelidos, email, horas_libres_semanais, sustitucions_realizadas_semana')
          .in('user_id', teacherIds)
          .order('nome');

        if (profilesError) throw profilesError;
        setTeachers(profiles || []);
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
    fetchDailySubstitutions();
    if (userRole?.role === 'admin') {
      fetchTeachers();
      fetchGrupos();
    }
  }, [selectedDate, userRole]);

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

  const startEdit = (substitution: Substitucion) => {
    setEditingSubstitution(substitution);
    setFormData({
      data: substitution.data,
      hora_inicio: substitution.hora_inicio,
      hora_fin: substitution.hora_fin,
      grupo_id: substitution.grupo_id || '',
      profesor_ausente_id: substitution.profesor_ausente_id || '',
      profesor_asignado_id: substitution.profesor_asignado_id,
      motivo: substitution.motivo as typeof formData.motivo,
      motivo_outro: substitution.motivo_outro || '',
      observacions: substitution.observacions || '',
      sesion: substitution.sesion || '',
      guardia_transporte: (substitution.guardia_transporte as typeof formData.guardia_transporte) || 'ningun'
    });
    setShowEditDialog(true);
  };

  const updateSubstitution = async () => {
    if (!editingSubstitution || !formData.data || !formData.hora_inicio || !formData.hora_fin) {
      toast({
        title: "Error",
        description: "Data, hora de inicio e hora de fin son obrigatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('substitucions')
        .update({
          data: formData.data,
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin,
          grupo_id: formData.grupo_id || null,
          profesor_asignado_id: formData.profesor_asignado_id,
          motivo: formData.motivo as any,
          motivo_outro: formData.motivo === 'outro' ? formData.motivo_outro : null,
          observacions: formData.observacions || null
        })
        .eq('id', editingSubstitution.id);

      if (error) {
        console.error('Error updating substitution:', error);
        toast({
          title: "Error",
          description: "Non se puido actualizar a substitución",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Substitución actualizada correctamente",
      });

      setShowEditDialog(false);
      setEditingSubstitution(null);
      await fetchDailySubstitutions();
    } catch (error) {
      console.error('Error in updateSubstitution:', error);
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
          
          <div className="flex flex-col items-end space-y-2">
            {/* Edit button for admins */}
            {userRole?.role === 'admin' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit(sub)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            
            {isMySubstitution && (
              <>
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
              </>
            )}
          </div>
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Substitución</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-data">Data</Label>
              <Input
                id="edit-data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-motivo">Motivo</Label>
              <Select value={formData.motivo} onValueChange={(value: typeof formData.motivo) => setFormData(prev => ({ ...prev, motivo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona o motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausencia_imprevista">Ausencia imprevista</SelectItem>
                  <SelectItem value="enfermidade">Enfermidade</SelectItem>
                  <SelectItem value="asuntos_propios">Asuntos propios</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-hora-inicio">Hora inicio</Label>
              <Input
                id="edit-hora-inicio"
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-hora-fin">Hora fin</Label>
              <Input
                id="edit-hora-fin"
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_fin: e.target.value }))}
              />
            </div>

            {formData.motivo === 'outro' && (
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit-motivo-outro">Especifica o motivo</Label>
                <Input
                  id="edit-motivo-outro"
                  value={formData.motivo_outro}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo_outro: e.target.value }))}
                  placeholder="Describe o motivo..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-grupo">Grupo (opcional)</Label>
              <Select value={formData.grupo_id} onValueChange={(value) => setFormData(prev => ({ ...prev, grupo_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona o grupo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sen asignar</SelectItem>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome} - {grupo.nivel}
                    </SelectItem>
                  ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-profesor">Profesor asignado</Label>
              <Select value={formData.profesor_asignado_id} onValueChange={(value) => setFormData(prev => ({ ...prev, profesor_asignado_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona o profesor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.user_id} value={teacher.user_id}>
                      {teacher.nome} {teacher.apelidos}
                    </SelectItem>
                  ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="edit-observacions">Observacións</Label>
              <Textarea
                id="edit-observacions"
                value={formData.observacions}
                onChange={(e) => setFormData(prev => ({ ...prev, observacions: e.target.value }))}
                placeholder="Observacións adicionais..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={updateSubstitution}>
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
