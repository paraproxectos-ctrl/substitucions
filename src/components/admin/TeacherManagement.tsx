import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  UserPlus, 
  Edit, 
  Trash2, 
  Users,
  Mail,
  Phone,
  Save,
  X,
  UserX,
  UserCheck
} from 'lucide-react';

interface Teacher {
  id: string;
  user_id: string;
  nome: string;
  apelidos: string;
  email: string;
  telefono?: string;
  horas_libres_semanais: number;
  sustitucions_realizadas_semana: number;
  ultima_semana_reset?: string;
  created_at: string;
  is_active: boolean;
}

export const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    nome: '',
    apelidos: '',
    email: '',
    telefono: '',
    password: 'ProfesorValle2024',
    horas_libres_semanais: 0
  });
  const [submitting, setSubmitting] = useState(false);
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

  // Cargar profesorado
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // First get users with profesor role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'profesor');

      if (roleError) {
        console.error('Error fetching teacher roles:', roleError);
        toast({
          title: "Error",
          description: "Non se puido cargar os roles do profesorado",
          variant: "destructive",
        });
        return;
      }

      if (!roleData || roleData.length === 0) {
        setTeachers([]);
        return;
      }

      // Then get profiles for those users
      const userIds = roleData.map(role => role.user_id);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, nome, apelidos, email, telefono, horas_libres_semanais, sustitucions_realizadas_semana, ultima_semana_reset, created_at, is_active')
        .in('user_id', userIds)
        .neq('nome', '') // Filtrar perfiles sin nombre
        .neq('apelidos', '') // Filtrar perfiles sin apellidos
        .order('nome');

      if (error) {
        console.error('Error fetching teachers:', error);
        toast({
          title: "Error",
          description: "Non se puido cargar o profesorado",
          variant: "destructive",
        });
        return;
      }

      // Solo incluir profesores con nombre y apellidos válidos
      const validTeachers = data?.filter(teacher => 
        teacher.nome && teacher.nome.trim() !== '' && 
        teacher.apelidos && teacher.apelidos.trim() !== ''
      ) || [];
      
      console.log('Valid teachers found:', validTeachers.length, validTeachers);
      setTeachers(validTeachers);
    } catch (error) {
      console.error('Error in fetchTeachers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Crear novo profesor
  const createTeacher = async () => {
    if (!formData.nome || !formData.apelidos || !formData.email) {
      toast({
        title: "Error",
        description: "Todos os campos obrigatorios deben estar relleados",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Usar edge function para crear profesor
      const { data: result, error: functionError } = await supabase.functions.invoke('create-teacher', {
        body: {
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          apelidos: formData.apelidos,
          telefono: formData.telefono
        }
      });

      if (result?.success && result?.user_id) {
        // Update the teacher's weekly hours
        await supabase
          .from('profiles')
          .update({ horas_libres_semanais: formData.horas_libres_semanais })
          .eq('user_id', result.user_id);
      }

      if (functionError) {
        console.error('Error calling create-teacher function:', functionError);
        toast({
          title: "Error",
          description: `Error ao crear profesor: ${functionError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!result?.success) {
        toast({
          title: "Error",
          description: `Error ao crear profesor: ${result?.error || 'Error descoñecido'}`,
          variant: "destructive",
        });
        return;
      }

      // Teléfono ya se incluye en la creación del perfil

      toast({
        title: "Éxito",
        description: `Profesor/a ${formData.nome} ${formData.apelidos} creado correctamente. Ya puede acceder con su email y contraseña.`,
      });

      // Resetear formulario e recargar lista
      setFormData({
        nome: '',
        apelidos: '',
        email: '',
        telefono: '',
        password: 'ProfesorValle2024',
        horas_libres_semanais: 0
      });
      setShowAddDialog(false);
      await fetchTeachers();

    } catch (error) {
      console.error('Error in createTeacher:', error);
      toast({
        title: "Error",
        description: "Erro inesperado ao crear o profesor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Actualizar profesor
  const updateTeacher = async () => {
    if (!editingTeacher || !formData.nome || !formData.apelidos || !formData.email) {
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
        .from('profiles')
        .update({
          nome: formData.nome,
          apelidos: formData.apelidos,
          email: formData.email,
          telefono: formData.telefono || null,
          horas_libres_semanais: formData.horas_libres_semanais
        })
        .eq('id', editingTeacher.id);

      if (error) {
        console.error('Error updating teacher:', error);
        toast({
          title: "Error",
          description: "Non se puido actualizar o profesor",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Profesor actualizado correctamente",
      });

      setEditingTeacher(null);
      setFormData({
        nome: '',
        apelidos: '',
        email: '',
        telefono: '',
        password: 'ProfesorValle2024',
        horas_libres_semanais: 0
      });
      await fetchTeachers();

    } catch (error) {
      console.error('Error in updateTeacher:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Suspender/Activar profesor
  const toggleTeacherActive = async (teacher: Teacher) => {
    const action = teacher.is_active ? 'suspender' : 'reactivar';
    if (!confirm(`¿Estás seguro de que queres ${action} a ${teacher.nome} ${teacher.apelidos}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !teacher.is_active })
        .eq('user_id', teacher.user_id);

      if (error) {
        console.error('Error toggling teacher status:', error);
        toast({
          title: "Error",
          description: `Non se puido ${action} o profesor`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: `Profesor ${teacher.is_active ? 'suspendido' : 'reactivado'} correctamente`,
      });

      await fetchTeachers();

    } catch (error) {
      console.error('Error in toggleTeacherActive:', error);
    }
  };

  // Eliminar profesor completamente
  const deleteTeacher = async (teacher: Teacher) => {
    if (!confirm(`¿Estás seguro de que queres eliminar PERMANENTEMENTE a ${teacher.nome} ${teacher.apelidos}? Esta acción non se pode desfacer.`)) {
      return;
    }

    try {
      // Eliminar rol
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', teacher.user_id);

      // Eliminar perfil
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', teacher.user_id);

      if (error) {
        console.error('Error deleting teacher:', error);
        toast({
          title: "Error",
          description: "Non se puido eliminar o profesor",
          variant: "destructive",
        });
        return;
      }

      // Eliminar usuario de auth (para seguranza completa)
      try {
        await supabase.auth.admin.deleteUser(teacher.user_id);
      } catch (authError) {
        console.warn('Could not delete auth user:', authError);
      }

      toast({
        title: "Éxito",
        description: "Profesor eliminado completamente",
      });

      await fetchTeachers();

    } catch (error) {
      console.error('Error in deleteTeacher:', error);
    }
  };

  // Iniciar edición
  const startEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      nome: teacher.nome,
      apelidos: teacher.apelidos,
      email: teacher.email,
      telefono: teacher.telefono || '',
      password: 'ProfesorValle2024',
      horas_libres_semanais: teacher.horas_libres_semanais
    });
  };

  // Funciones de selección múltiple
  const handleSelectTeacher = (teacherId: string, checked: boolean) => {
    const newSelected = new Set(selectedTeachers);
    if (checked) {
      newSelected.add(teacherId);
    } else {
      newSelected.delete(teacherId);
    }
    setSelectedTeachers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTeachers(new Set(teachers.map(t => t.id)));
    } else {
      setSelectedTeachers(new Set());
    }
  };

  const deleteSelectedTeachers = async () => {
    if (selectedTeachers.size === 0) return;
    
    if (!confirm(`¿Estás seguro de que queres eliminar ${selectedTeachers.size} profesor(es)?`)) {
      return;
    }

    try {
      for (const teacherId of selectedTeachers) {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          // Eliminar rol
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', teacher.user_id);

          // Eliminar perfil
          await supabase
            .from('profiles')
            .delete()
            .eq('id', teacher.id);

          // Intentar eliminar usuario de auth (opcional)
          try {
            await supabase.auth.admin.deleteUser(teacher.user_id);
          } catch (authError) {
            console.warn('Could not delete auth user:', authError);
          }
        }
      }

      toast({
        title: "Éxito",
        description: `${selectedTeachers.size} profesor(es) eliminado(s) correctamente`,
      });

      setSelectedTeachers(new Set());
      await fetchTeachers();

    } catch (error) {
      console.error('Error in deleteSelectedTeachers:', error);
      toast({
        title: "Error",
        description: "Error ao eliminar os profesores seleccionados",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Xestión de Profesorado
          </h1>
          {selectedTeachers.size > 0 && (
            <Badge variant="secondary" className="ml-4">
              {selectedTeachers.size} seleccionado(s)
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedTeachers.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={deleteSelectedTeachers}
              className="mr-2"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar {selectedTeachers.size}
            </Button>
          )}
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Engadir Profesor/a
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Profesor/a</DialogTitle>
              <DialogDescription>
                Introduce os datos do novo profesor ou profesora
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apelidos">Apelidos *</Label>
                  <Input
                    id="apelidos"
                    value={formData.apelidos}
                    onChange={(e) => setFormData({...formData, apelidos: e.target.value})}
                    placeholder="Apelidos"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="exemplo@colexio.gal"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  placeholder="666 123 456"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="horas_libres_semanais">Horas libres por semana</Label>
                <Input
                  id="horas_libres_semanais"
                  type="number"
                  min="0"
                  value={formData.horas_libres_semanais}
                  onChange={(e) => setFormData({...formData, horas_libres_semanais: parseInt(e.target.value) || 0})}
                  placeholder="Número de horas libres semanais"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasinal temporal</Label>
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Contrasinal temporal"
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
              <Button onClick={createTeacher} disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                {submitting ? 'Gardando...' : 'Gardar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Profesorado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando profesorado...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Non hai profesorado rexistrado
              </h3>
              <p className="text-sm text-muted-foreground">
                Engade o primeiro profesor ou profesora
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTeachers.size === teachers.length && teachers.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Horas libres/semana</TableHead>
                  <TableHead>Sustitucións/semana</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Accións</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTeachers.has(teacher.id)}
                        onCheckedChange={(checked) => handleSelectTeacher(teacher.id, checked as boolean)}
                        aria-label={`Seleccionar ${teacher.nome} ${teacher.apelidos}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {teacher.nome} {teacher.apelidos}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{teacher.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {teacher.telefono ? (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{teacher.telefono}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{teacher.horas_libres_semanais}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {teacher.sustitucions_realizadas_semana}
                        {teacher.sustitucions_realizadas_semana >= teacher.horas_libres_semanais && (
                          <Badge variant="destructive" className="text-xs">Cupo completo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={teacher.is_active ? "default" : "destructive"}>
                        {teacher.is_active ? "Activo" : "Suspendido"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(teacher)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTeacherActive(teacher)}
                          className={teacher.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                        >
                          {teacher.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTeacher(teacher)}
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

      {/* Dialog de edición */}
      {editingTeacher && (
        <Dialog open={!!editingTeacher} onOpenChange={() => setEditingTeacher(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Profesor/a</DialogTitle>
              <DialogDescription>
                Modifica os datos de {editingTeacher.nome} {editingTeacher.apelidos}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome *</Label>
                  <Input
                    id="edit-nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-apelidos">Apelidos *</Label>
                  <Input
                    id="edit-apelidos"
                    value={formData.apelidos}
                    onChange={(e) => setFormData({...formData, apelidos: e.target.value})}
                    placeholder="Apelidos"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="exemplo@colexio.gal"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  placeholder="666 123 456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-horas_libres_semanais">Horas libres por semana</Label>
                <Input
                  id="edit-horas_libres_semanais"
                  type="number"
                  min="0"
                  value={formData.horas_libres_semanais}
                  onChange={(e) => setFormData({...formData, horas_libres_semanais: parseInt(e.target.value) || 0})}
                  placeholder="Número de horas libres semanais"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingTeacher(null)}
                disabled={submitting}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={updateTeacher} disabled={submitting}>
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