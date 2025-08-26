import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  User,
  School,
  Save,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { gl } from 'date-fns/locale';

interface Substitution {
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

interface Teacher {
  user_id: string;
  nome: string;
  apelidos: string;
  email: string;
}

interface Group {
  id: string;
  nome: string;
  nivel: string;
}

export const SubstitutionManagement: React.FC = () => {
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubstitution, setEditingSubstitution] = useState<Substitution | null>(null);
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    data: '',
    hora_inicio: '',
    hora_fin: '',
    grupo_id: '',
    profesor_ausente_id: '',    // Profesor que está ausente
    profesor_asignado_id: '',   // Profesor que cubre la sustitución
    motivo: 'ausencia_imprevista',
    motivo_outro: '',
    observacions: '',
    sesion: '',
    guardia_transporte: 'ningun'
  });
  const [submitting, setSubmitting] = useState(false);
  const [recommendedTeacher, setRecommendedTeacher] = useState<any>(null);
  const { userRole, user } = useAuth();
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

  // Cargar datos
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Cargar substitucións
      const { data: substitutionsData, error: substitutionsError } = await supabase
        .from('substitucions')
        .select(`
          *,
          grupos_educativos (nome, nivel)
        `)
        .order('data', { ascending: false })
        .order('hora_inicio');

      if (substitutionsError) {
        console.error('Error fetching substitutions:', substitutionsError);
      }

      // Se hai substitucións, obter os perfís dos profesores
      if (substitutionsData && substitutionsData.length > 0) {
        const professorIds = substitutionsData.map(sub => sub.profesor_asignado_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, nome, apelidos')
          .in('user_id', professorIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combinar datos
        const enrichedSubstitutions = substitutionsData.map(sub => ({
          ...sub,
          profiles: profilesData?.find(profile => profile.user_id === sub.profesor_asignado_id) || null
        }));

        setSubstitutions(enrichedSubstitutions as any);
      } else {
        setSubstitutions([]);
      }

      // Cargar profesores - usar el mismo método que en TeacherManagement
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'profesor');

      if (roleError) {
        console.error('Error fetching teacher roles:', roleError);
        setTeachers([]);
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
          setTeachers([]);
        } else {
          // Solo incluir profesores con nombre y apellidos válidos
          const validTeachers = teachersData?.filter(teacher => 
            teacher.nome && teacher.nome.trim() !== '' && 
            teacher.apelidos && teacher.apelidos.trim() !== ''
          ) || [];
          setTeachers(validTeachers);
        }
      } else {
        console.log('No teacher roles found');
        setTeachers([]);
      }

      // Cargar grupos
      const { data: groupsData, error: groupsError } = await supabase
        .from('grupos_educativos')
        .select('*')
        .order('nome');

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
      } else {
        setGroups(groupsData || []);
      }

    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get recommended teacher with proportional assignment
  const getRecommendedTeacher = async () => {
    try {
      // Reset weekly counters first
      await supabase.rpc('reset_weekly_counters');
      
      const { data, error } = await supabase.rpc('get_proportional_teacher');
      
      if (error) {
        console.error('Error getting proportional teacher:', error);
        setRecommendedTeacher(null);
        return;
      }
      
      if (!data) {
        setRecommendedTeacher(null);
        toast({
          title: "Non hai profesorado dispoñible",
          description: "Non hai profesorado dispoñible dentro do cupo semanal",
          variant: "destructive",
        });
        return;
      }
      
      // Find the teacher profile
      const teacher = teachers.find(t => t.user_id === data);
      if (teacher) {
        setRecommendedTeacher(teacher);
        setFormData(prev => ({
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
      setRecommendedTeacher(null);
    }
  };

  // Crear nova substitución
  const createSubstitution = async () => {
    // Verificar se hai profesores disponibles
    if (teachers.length === 0) {
      toast({
        title: "Aviso",
        description: "Non hai profesorado dispoñible. Primeiro debes engadir profesores ao sistema.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.data || !formData.hora_inicio || !formData.hora_fin) {
      toast({
        title: "Error",
        description: "Data, hora de inicio e hora de fin son obrigatorios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('substitucions')
        .insert({
          data: formData.data,
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin,
          grupo_id: formData.grupo_id || null,
          profesor_ausente_id: formData.profesor_ausente_id || null,
          profesor_asignado_id: formData.profesor_asignado_id,
          motivo: formData.motivo as any,
          motivo_outro: formData.motivo === 'outro' ? formData.motivo_outro : null,
          observacions: formData.observacions || null,
          sesion: formData.sesion ? formData.sesion as any : null,
          guardia_transporte: formData.guardia_transporte as any,
          created_by: user?.id
        });

      if (error) {
        console.error('Error creating substitution:', error);
        toast({
          title: "Error",
          description: "Non se puido crear a substitución",
          variant: "destructive",
        });
        return;
      }

      // Reset counters and increment teacher substitution counter if teacher is assigned
      if (formData.profesor_asignado_id) {
        await supabase.rpc('reset_weekly_counters');
        const { error: incrementError } = await supabase.rpc('increment_teacher_substitution', {
          teacher_id: formData.profesor_asignado_id
        });

        if (incrementError) {
          console.error('Error incrementing teacher substitution:', incrementError);
        }
      }

      toast({
        title: "Éxito",
        description: "Substitución creada correctamente",
      });

      // Resetear formulario e recargar lista
      setFormData({
        data: '',
        hora_inicio: '',
        hora_fin: '',
        grupo_id: '',
        profesor_ausente_id: '',
        profesor_asignado_id: '',
        motivo: 'ausencia_imprevista',
        motivo_outro: '',
        observacions: '',
        sesion: '',
        guardia_transporte: 'ningun'
      });
      setShowAddDialog(false);
      await fetchData();

    } catch (error) {
      console.error('Error in createSubstitution:', error);
      toast({
        title: "Error",
        description: "Erro inesperado ao crear a substitución",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Actualizar substitución
  const updateSubstitution = async () => {
    if (!editingSubstitution || !formData.data || !formData.hora_inicio || !formData.hora_fin) {
      toast({
        title: "Error",
        description: "Data, hora de inicio e hora de fin son obrigatorios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
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

      setEditingSubstitution(null);
      setFormData({
        data: '',
        hora_inicio: '',
        hora_fin: '',
        grupo_id: '',
        profesor_ausente_id: '',
        profesor_asignado_id: '',
        motivo: 'ausencia_imprevista',
        motivo_outro: '',
        observacions: '',
        sesion: '',
        guardia_transporte: 'ningun'
      });
      await fetchData();

    } catch (error) {
      console.error('Error in updateSubstitution:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar substitución
  const deleteSubstitution = async (substitution: Substitution) => {
    if (!confirm('¿Estás seguro de que queres eliminar esta substitución?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('substitucions')
        .delete()
        .eq('id', substitution.id);

      if (error) {
        console.error('Error deleting substitution:', error);
        toast({
          title: "Error",
          description: "Non se puido eliminar a substitución",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Substitución eliminada correctamente",
      });

      await fetchData();

    } catch (error) {
      console.error('Error in deleteSubstitution:', error);
    }
  };

  // Iniciar edición
  const startEdit = (substitution: Substitution) => {
    setEditingSubstitution(substitution);
    setFormData({
      data: substitution.data,
      hora_inicio: substitution.hora_inicio,
      hora_fin: substitution.hora_fin,
      grupo_id: substitution.grupos_educativos?.nome || '',
      profesor_ausente_id: '', // Este campo será agregado más tarde
      profesor_asignado_id: substitution.profesor_asignado_id,
      motivo: substitution.motivo,
      motivo_outro: substitution.motivo_outro || '',
      observacions: substitution.observacions || '',
      sesion: '',
      guardia_transporte: 'ningun'
    });
  };

  // Funciones de selección múltiple
  const handleSelectSubstitution = (substitutionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSubstitutions);
    if (checked) {
      newSelected.add(substitutionId);
    } else {
      newSelected.delete(substitutionId);
    }
    setSelectedSubstitutions(newSelected);
  };

  const handleSelectAllSubstitutions = (checked: boolean) => {
    if (checked) {
      setSelectedSubstitutions(new Set(substitutions.map(s => s.id)));
    } else {
      setSelectedSubstitutions(new Set());
    }
  };

  const deleteSelectedSubstitutions = async () => {
    if (selectedSubstitutions.size === 0) return;
    
    if (!confirm(`¿Estás seguro de que queres eliminar ${selectedSubstitutions.size} substitución(es)?`)) {
      return;
    }

    try {
      for (const substitutionId of selectedSubstitutions) {
        const { error } = await supabase
          .from('substitucions')
          .delete()
          .eq('id', substitutionId);

        if (error) {
          console.error('Error deleting substitution:', error);
          toast({
            title: "Error",
            description: "Error ao eliminar algunha substitución",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Éxito",
        description: `${selectedSubstitutions.size} substitución(es) eliminada(s) correctamente`,
      });

      setSelectedSubstitutions(new Set());
      await fetchData();

    } catch (error) {
      console.error('Error in deleteSelectedSubstitutions:', error);
      toast({
        title: "Error",
        description: "Error ao eliminar as substitucións seleccionadas",
        variant: "destructive",
      });
    }
  };

  // Opcións de motivos
  const motivoOptions = [
    { value: 'ausencia_imprevista', label: 'Ausencia imprevista' },
    { value: 'enfermidade', label: 'Enfermidade' },
    { value: 'asuntos_propios', label: 'Asuntos propios' },
    { value: 'outro', label: 'Outro' }
  ];

  // Opcións de sesión
  const sesionOptions = [
    { value: 'primeira', label: '1ª sesión' },
    { value: 'segunda', label: '2ª sesión' },
    { value: 'terceira', label: '3ª sesión' },
    { value: 'cuarta', label: '4ª sesión' },
    { value: 'quinta', label: '5ª sesión' },
    { value: 'recreo', label: 'Recreo' },
    { value: 'hora_lectura', label: 'Hora de lectura' }
  ];

  // Opcións de guardia de transporte
  const guardiaTransporteOptions = [
    { value: 'ningun', label: 'Ningún' },
    { value: 'entrada', label: 'Guardia de transporte de entrada' },
    { value: 'saida', label: 'Guardia de transporte de saída' }
  ];

  // Obter etiqueta do motivo
  const getMotivoLabel = (motivo: string, motivoOutro?: string) => {
    const option = motivoOptions.find(opt => opt.value === motivo);
    return motivo === 'outro' ? (motivoOutro || 'Outro') : (option?.label || motivo);
  };

  // Obter cor do motivo
  const getMotivoColor = (motivo: string) => {
    const colors: Record<string, string> = {
      'ausencia_imprevista': 'destructive',
      'enfermidade': 'secondary',
      'asuntos_propios': 'default',
      'outro': 'outline'
    };
    return colors[motivo] || 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Xestión de Substitucións
          </h1>
          {selectedSubstitutions.size > 0 && (
            <Badge variant="secondary" className="ml-4">
              {selectedSubstitutions.size} seleccionada(s)
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedSubstitutions.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={deleteSelectedSubstitutions}
              className="mr-2"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar {selectedSubstitutions.size}
            </Button>
          )}
          
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            if (open) {
              // Get recommended teacher when opening dialog
              getRecommendedTeacher();
            }
            setShowAddDialog(open);
          }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Substitución
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Nova Substitución</DialogTitle>
              <DialogDescription>
                Introduce os datos da nova substitución
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_inicio">Hora inicio</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_fin">Hora fin</Label>
                  <Input
                    id="hora_fin"
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grupo">Grupo (opcional)</Label>
                  <Select value={formData.grupo_id} onValueChange={(value) => setFormData({...formData, grupo_id: value})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona un grupo (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      <SelectItem value="">Sen grupo asignado</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.nome} - {group.nivel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profesor_ausente">Profesor/a ausente</Label>
                  <Select value={formData.profesor_ausente_id} onValueChange={(value) => setFormData({...formData, profesor_ausente_id: value})}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Profesor/a que falta" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50 max-h-60">
                      {teachers.map((teacher) => (
                        <SelectItem key={`ausente-${teacher.user_id}`} value={teacher.user_id}>
                          {teacher.nome} {teacher.apelidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profesor_sustituto">Profesor/a sustituto/a</Label>
                  {recommendedTeacher && (
                    <div className="text-xs text-green-600 mb-1">
                      💡 Recomendado: {recommendedTeacher.nome} {recommendedTeacher.apelidos} 
                      ({recommendedTeacher.sustitucions_realizadas_semana}/{recommendedTeacher.horas_libres_semanais} substitucións/semana)
                    </div>
                  )}
                  <Select value={formData.profesor_asignado_id} onValueChange={(value) => setFormData({...formData, profesor_asignado_id: value})}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Profesor/a que cubre" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50 max-h-60">
                      {teachers.map((teacher) => (
                        <SelectItem key={`sustituto-${teacher.user_id}`} value={teacher.user_id}>
                          {teacher.nome} {teacher.apelidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Select value={formData.motivo} onValueChange={(value: any) => setFormData({...formData, motivo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.motivo === 'outro' && (
                <div className="space-y-2">
                  <Label htmlFor="motivo_outro">Especificar motivo</Label>
                  <Input
                    id="motivo_outro"
                    value={formData.motivo_outro}
                    onChange={(e) => setFormData({...formData, motivo_outro: e.target.value})}
                    placeholder="Describe o motivo..."
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="observacions">Observacións</Label>
                <Textarea
                  id="observacions"
                  value={formData.observacions}
                  onChange={(e) => setFormData({...formData, observacions: e.target.value})}
                  placeholder="Observacións adicionais..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sesion">Sesión</Label>
                  <Select value={formData.sesion} onValueChange={(value) => setFormData({...formData, sesion: value})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona unha sesión" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {sesionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guardia_transporte">Guardia de transporte</Label>
                  <Select value={formData.guardia_transporte} onValueChange={(value) => setFormData({...formData, guardia_transporte: value})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecciona guardia" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {guardiaTransporteOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={submitting}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={createSubstitution} disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? 'Gardando...' : 'Gardar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Lista de substitucións */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Substitucións</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando substitucións...</p>
            </div>
          ) : substitutions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Non hai substitucións rexistradas
              </h3>
              <p className="text-sm text-muted-foreground">
                Crea a primeira substitución
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSubstitutions.size === substitutions.length && substitutions.length > 0}
                      onCheckedChange={handleSelectAllSubstitutions}
                      aria-label="Seleccionar todas"
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Profesor/a</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Accións</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substitutions.map((substitution) => (
                  <TableRow key={substitution.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSubstitutions.has(substitution.id)}
                        onCheckedChange={(checked) => handleSelectSubstitution(substitution.id, checked as boolean)}
                        aria-label={`Seleccionar substitución do ${substitution.data}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {format(new Date(substitution.data), "dd/MM/yyyy", { locale: gl })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{substitution.hora_inicio} - {substitution.hora_fin}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <School className="h-4 w-4 text-muted-foreground" />
                        <span>{substitution.grupos_educativos?.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{substitution.profiles?.nome} {substitution.profiles?.apelidos}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getMotivoColor(substitution.motivo) as any}>
                        {getMotivoLabel(substitution.motivo, substitution.motivo_outro)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {substitution.vista ? (
                          <>
                            <Eye className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Vista</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-600">Pendente</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(substitution)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSubstitution(substitution)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog de edición - similar ao de creación pero con datos prellenados */}
      {editingSubstitution && (
        <Dialog open={!!editingSubstitution} onOpenChange={() => setEditingSubstitution(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Substitución</DialogTitle>
              <DialogDescription>
                Modifica os datos da substitución
              </DialogDescription>
            </DialogHeader>
            
            {/* ... resto do contido igual ao formulario de creación ... */}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-data">Data</Label>
                  <Input
                    id="edit-data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hora_inicio">Hora inicio</Label>
                  <Input
                    id="edit-hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hora_fin">Hora fin</Label>
                  <Input
                    id="edit-hora_fin"
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-grupo">Grupo</Label>
                  <Select value={formData.grupo_id} onValueChange={(value) => setFormData({...formData, grupo_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-profesor">Profesor/a</Label>
                  <Select value={formData.profesor_asignado_id} onValueChange={(value) => setFormData({...formData, profesor_asignado_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un profesor/a" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.user_id} value={teacher.user_id}>
                          {teacher.nome} {teacher.apelidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-motivo">Motivo</Label>
                <Select value={formData.motivo} onValueChange={(value: any) => setFormData({...formData, motivo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.motivo === 'outro' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-motivo_outro">Especificar motivo</Label>
                  <Input
                    id="edit-motivo_outro"
                    value={formData.motivo_outro}
                    onChange={(e) => setFormData({...formData, motivo_outro: e.target.value})}
                    placeholder="Describe o motivo..."
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-observacions">Observacións</Label>
                <Textarea
                  id="edit-observacions"
                  value={formData.observacions}
                  onChange={(e) => setFormData({...formData, observacions: e.target.value})}
                  placeholder="Observacións adicionais..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingSubstitution(null)}
                disabled={submitting}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={updateSubstitution} disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? 'Gardando...' : 'Actualizar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};