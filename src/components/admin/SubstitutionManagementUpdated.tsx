import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  User,
  Save,
  X,
  AlertCircle
} from 'lucide-react';

interface Substitution {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  motivo_outro?: string;
  observacions?: string;
  vista: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  grupo_id: string;
  profesor_asignado_id: string;
  profesor_ausente_id?: string;
  sesion?: string;
  guardia_transporte?: string;
  grupos_educativos?: {
    id: string;
    nome: string;
    nivel: string;
  };
  profesor_asignado?: {
    nome: string;
    apelidos: string;
  };
  profesor_ausente?: {
    nome: string;
    apelidos: string;
  };
}

interface Teacher {
  user_id: string;
  nome: string;
  apelidos: string;
  horas_libres_semanais: number;
  sustitucions_realizadas_semana: number;
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
  const [submitting, setSubmitting] = useState(false);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    data: '',
    hora_inicio: '',
    hora_fin: '',
    grupo_id: '',
    profesor_asignado_id: '',
    profesor_ausente_id: '',
    motivo: 'enfermidade' as const,
    motivo_outro: '',
    observacions: '',
    sesion: '' as string,
    guardia_transporte: '' as string
  });

  const [recommendedTeacher, setRecommendedTeacher] = useState<{\
    user_id: string;
    nome: string;
    apelidos: string;
    horas_libres_semanais: number;
    sustitucions_realizadas_semana: number;
  } | null>(null);

  // Check admin access
  if (userRole?.role !== 'admin') {
    return (
      <Alert>
        <AlertDescription>
          Non tes permisos para acceder a esta sección.
        </AlertDescription>
      </Alert>
    );
  }

  // Get recommended teacher
  const fetchRecommendedTeacher = async () => {
    try {
      const { data, error } = await supabase.rpc('get_recommended_teacher');
      if (error) {
        console.error('Error fetching recommended teacher:', error);
        return;
      }
      if (data && data.length > 0) {
        setRecommendedTeacher(data[0]);
        setFormData(prev => ({ ...prev, profesor_asignado_id: data[0].user_id }));
      } else {
        setRecommendedTeacher(null);
        setFormData(prev => ({ ...prev, profesor_asignado_id: '' }));
      }
    } catch (error) {
      console.error('Error in fetchRecommendedTeacher:', error);
    }
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch substitutions with joins
      const { data: substitutionsData, error: substError } = await supabase
        .from('substitucions')
        .select(`
          *,
          grupos_educativos:grupo_id (id, nome, nivel),
          profesor_asignado:profesor_asignado_id (nome, apelidos),
          profesor_ausente:profesor_ausente_id (nome, apelidos)
        `)
        .order('data', { ascending: false });

      if (substError) {
        console.error('Error fetching substitutions:', substError);
        toast({
          title: "Error",
          description: "Non se puideron cargar as sustitucións",
          variant: "destructive",
        });
        return;
      }

      // Fetch teachers
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'profesor');

      if (roleData) {
        const userIds = roleData.map(role => role.user_id);
        const { data: teachersData } = await supabase
          .from('profiles')
          .select('user_id, nome, apelidos, horas_libres_semanais, sustitucions_realizadas_semana')
          .in('user_id', userIds)
          .order('nome');

        setTeachers(teachersData || []);
      }

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('grupos_educativos')
        .select('*')
        .order('nivel, nome');

      setSubstitutions(substitutionsData || []);
      setGroups(groupsData || []);

    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create substitution
  const createSubstitution = async () => {
    // Validation - only require basic fields
    if (!formData.data || !formData.hora_inicio || !formData.hora_fin || 
        !formData.grupo_id || !formData.profesor_asignado_id || !formData.motivo) {
      toast({
        title: "Error",
        description: "Todos os campos obrigatorios deben estar relleados",
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
          grupo_id: formData.grupo_id,
          profesor_asignado_id: formData.profesor_asignado_id,
          profesor_ausente_id: formData.profesor_ausente_id || null,
          motivo: formData.motivo,
          motivo_outro: formData.motivo === 'outros' ? formData.motivo_outro : null,
          observacions: formData.observacions || null,
          created_by: user?.id || '',
          sesion: formData.sesion || null,
          guardia_transporte: formData.guardia_transporte || null
        });

      if (error) {
        console.error('Error creating substitution:', error);
        toast({
          title: "Error",
          description: "Non se puido crear a sustitución",
          variant: "destructive",
        });
        return;
      }

      // Increment the teacher's substitution counter
      await supabase.rpc('increment_teacher_substitution', {
        teacher_id: formData.profesor_asignado_id
      });

      toast({
        title: "Éxito",
        description: "Sustitución creada correctamente",
      });

      // Reset form
      setFormData({
        data: '',
        hora_inicio: '',
        hora_fin: '',
        grupo_id: '',
        profesor_asignado_id: '',
        profesor_ausente_id: '',
        motivo: 'enfermidade' as const,
        motivo_outro: '',
        observacions: '',
        sesion: '',
        guardia_transporte: ''
      });
      setShowAddDialog(false);
      fetchData();
      fetchRecommendedTeacher();

    } catch (error) {
      console.error('Error in createSubstitution:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // rest of CRUD operations would be similar

  // Fetch initial data
  useEffect(() => {
    fetchData();
    fetchRecommendedTeacher();
  }, []);

  const motivoOptions = [
    { value: 'enfermidade', label: 'Enfermidade' },
    { value: 'permiso', label: 'Permiso' },
    { value: 'formacion', label: 'Formación' },
    { value: 'outros', label: 'Outros' }
  ];

  const sesionOptions = [
    { value: 'primeira', label: 'Primeira sesión' },
    { value: 'segunda', label: 'Segunda sesión' },
    { value: 'terceira', label: 'Terceira sesión' },
    { value: 'cuarta', label: 'Cuarta sesión' },
    { value: 'quinta', label: 'Quinta sesión' },
    { value: 'recreo', label: 'Recreo' },
    { value: 'lectura', label: 'Hora de lectura' }
  ];

  const guardiaTransporteOptions = [
    { value: 'entrada', label: 'Guardia transporte entrada' },
    { value: 'saida', label: 'Guardia transporte saída' }
  ];

  const getMotivoLabel = (motivo: string) => {
    const option = motivoOptions.find(o => o.value === motivo);
    return option?.label || motivo;
  };

  const getMotivoColor = (motivo: string) => {
    const colors: Record<string, string> = {
      'enfermidade': 'bg-red-100 text-red-800',
      'permiso': 'bg-blue-100 text-blue-800',
      'formacion': 'bg-green-100 text-green-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[motivo] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Xestión de Sustitucións
          </h1>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Sustitución
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Sustitución</DialogTitle>
              <DialogDescription>
                Crea unha nova sustitución. Os campos marcados con * son obrigatorios.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Recommended Teacher Alert */}
              {recommendedTeacher ? (
                <Alert>
                  <User className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Profesor recomendado:</strong> {recommendedTeacher.nome} {recommendedTeacher.apelidos} 
                    ({recommendedTeacher.horas_libres_semanais - recommendedTeacher.sustitucions_realizadas_semana} horas libres restantes)
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Non hai profesorado dispoñíbel dentro do cupo semanal
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grupo_id">Grupo *</Label>
                  <Select value={formData.grupo_id} onValueChange={(value) => setFormData({...formData, grupo_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.nivel} - {group.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hora_inicio">Hora inicio *</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora_fin">Hora fin *</Label>
                  <Input
                    id="hora_fin"
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sesion">Sesión</Label>
                <Select value={formData.sesion} onValueChange={(value) => setFormData({...formData, sesion: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sesión (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar guardia (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {guardiaTransporteOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profesor_asignado_id">Profesor asignado *</Label>
                <Select value={formData.profesor_asignado_id} onValueChange={(value) => setFormData({...formData, profesor_asignado_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar profesor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.user_id} value={teacher.user_id}>
                        {teacher.nome} {teacher.apelidos} 
                        {teacher.sustitucions_realizadas_semana >= teacher.horas_libres_semanais && 
                          " (Cupo completo)"
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profesor_ausente_id">Profesor ausente</Label>
                <Select value={formData.profesor_ausente_id} onValueChange={(value) => setFormData({...formData, profesor_ausente_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar profesor ausente (opcional)" />
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

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Select value={formData.motivo} onValueChange={(value) => setFormData({...formData, motivo: value as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
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

              {formData.motivo === 'outros' && (
                <div className="space-y-2">
                  <Label htmlFor="motivo_outro">Outro motivo</Label>
                  <Input
                    id="motivo_outro"
                    value={formData.motivo_outro}
                    onChange={(e) => setFormData({...formData, motivo_outro: e.target.value})}
                    placeholder="Especificar outro motivo"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="observacions">Observacións</Label>
                <Textarea
                  id="observacions"
                  value={formData.observacions}
                  onChange={(e) => setFormData({...formData, observacions: e.target.value})}
                  placeholder="Observacións adicionais (opcional)"
                  className="min-h-[100px]"
                />
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

      {/* Substitutions List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Sustitucións</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando sustitucións...</p>
            </div>
          ) : substitutions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Non hai sustitucións rexistradas
              </h3>
              <p className="text-sm text-muted-foreground">
                Crea a primeira sustitución
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Profesor Asignado</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Sesión</TableHead>
                  <TableHead>Guardia</TableHead>
                  <TableHead className="text-right">Accións</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substitutions.map((substitution) => (
                  <TableRow key={substitution.id}>
                    <TableCell>{new Date(substitution.data).toLocaleDateString('gl-ES')}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{substitution.hora_inicio} - {substitution.hora_fin}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {substitution.grupos_educativos?.nivel} - {substitution.grupos_educativos?.nome}
                    </TableCell>
                    <TableCell>
                      {substitution.profesor_asignado?.nome} {substitution.profesor_asignado?.apelidos}
                    </TableCell>
                    <TableCell>
                      <Badge className={getMotivoColor(substitution.motivo)}>
                        {getMotivoLabel(substitution.motivo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {substitution.sesion ? sesionOptions.find(s => s.value === substitution.sesion)?.label : '-'}
                    </TableCell>
                    <TableCell>
                      {substitution.guardia_transporte ? guardiaTransporteOptions.find(g => g.value === substitution.guardia_transporte)?.label : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
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
    </div>
  );
};
