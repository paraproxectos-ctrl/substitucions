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
import { useToast } from '@/hooks/use-toast';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Users,
  Mail,
  Phone,
  Save,
  X
} from 'lucide-react';

interface Teacher {
  id: string;
  user_id: string;
  nome: string;
  apelidos: string;
  email: string;
  telefono?: string;
  created_at: string;
}

export const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    apelidos: '',
    email: '',
    telefono: '',
    password: 'ProfesorValle2024'
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
        .select('*')
        .in('user_id', userIds)
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

      setTeachers(data || []);
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
      // Crear usuario en Supabase Auth usando service role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nome: formData.nome,
            apelidos: formData.apelidos
          }
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        toast({
          title: "Error",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      if (!authData.user) {
        toast({
          title: "Error",
          description: "Non se puido crear o usuario",
          variant: "destructive",
        });
        return;
      }

      // Crear perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          nome: formData.nome,
          apelidos: formData.apelidos,
          email: formData.email,
          telefono: formData.telefono || null
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        toast({
          title: "Error",
          description: "Non se puido crear o perfil",
          variant: "destructive",
        });
        return;
      }

      // Asignar rol de profesor
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'profesor'
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        toast({
          title: "Error",
          description: "Non se puido asignar o rol",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: `Profesor/a ${formData.nome} ${formData.apelidos} creado correctamente`,
      });

      // Resetear formulario e recargar lista
      setFormData({
        nome: '',
        apelidos: '',
        email: '',
        telefono: '',
        password: 'ProfesorValle2024'
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
          telefono: formData.telefono || null
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
        password: 'ProfesorValle2024'
      });
      await fetchTeachers();

    } catch (error) {
      console.error('Error in updateTeacher:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar profesor
  const deleteTeacher = async (teacher: Teacher) => {
    if (!confirm(`¿Estás seguro de que queres eliminar a ${teacher.nome} ${teacher.apelidos}?`)) {
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
        .eq('id', teacher.id);

      if (error) {
        console.error('Error deleting teacher:', error);
        toast({
          title: "Error",
          description: "Non se puido eliminar o profesor",
          variant: "destructive",
        });
        return;
      }

      // Eliminar usuario de auth (opcional, pode dar erro de permisos)
      try {
        await supabase.auth.admin.deleteUser(teacher.user_id);
      } catch (authError) {
        console.warn('Could not delete auth user:', authError);
      }

      toast({
        title: "Éxito",
        description: "Profesor eliminado correctamente",
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
      password: 'ProfesorValle2024'
    });
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
        </div>
        
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

      {/* Lista de profesores */}
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
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Accións</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
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
                    <TableCell>
                      <Badge variant="secondary">Activo</Badge>
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