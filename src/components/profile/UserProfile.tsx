import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { User, Lock, Save } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { profile, userRole, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    nome: profile?.nome || '',
    apelidos: profile?.apelidos || '',
    email: profile?.email || '',
    telefono: profile?.telefono || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update local state when profile changes
  React.useEffect(() => {
    if (profile) {
      setProfileData({
        nome: profile.nome || '',
        apelidos: profile.apelidos || '',
        email: profile.email || '',
        telefono: profile.telefono || '',
      });
    }
  }, [profile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First update profile data in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome: profileData.nome,
          apelidos: profileData.apelidos,
          email: profileData.email,
          telefono: profileData.telefono,
        })
        .eq('user_id', profile?.user_id);

      if (profileError) {
        throw profileError;
      }

      // Try to update auth email if changed (this might fail for some email formats)
      if (profileData.email !== profile?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email
        });
        
        if (emailError) {
          console.warn('Auth email update failed:', emailError.message);
          // Don't throw error, just show warning - profile email was already updated
          toast({
            title: "Perfil actualizado",
            description: "Datos actualizados. O email de autenticación mantense igual por restriccións do sistema.",
            variant: "default",
          });
        } else {
          toast({
            title: "Perfil e email actualizados",
            description: "Revisa o teu novo email para confirmar o cambio de autenticación",
          });
        }
      } else {
        toast({
          title: "Perfil actualizado",
          description: "Os teus datos foron actualizados correctamente",
        });
      }

      await refreshProfile();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Erro ao actualizar o perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "As contrasinais non coinciden",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "A nova contrasinal debe ter polo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Contrasinal actualizada",
        description: "A túa contrasinal foi cambiada correctamente",
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Erro ao cambiar a contrasinal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start text-xs md:text-sm h-8 md:h-9"
        >
          <User className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
          <span className="truncate">Meu perfil</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Datos persoais</TabsTrigger>
            <TabsTrigger value="password">Cambiar contrasinal</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información persoal</CardTitle>
                <CardDescription>
                  Actualiza a túa información persoal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={profileData.nome}
                        onChange={(e) => setProfileData({...profileData, nome: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apelidos">Apelidos *</Label>
                      <Input
                        id="apelidos"
                        value={profileData.apelidos}
                        onChange={(e) => setProfileData({...profileData, apelidos: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Se cambias o email, recibirás unha confirmación no novo enderezo.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={profileData.telefono}
                      onChange={(e) => setProfileData({...profileData, telefono: e.target.value})}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Input
                      value={userRole?.role === 'admin' ? 'Administrador/a' : 'Profesor/a'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Gardando...' : 'Gardar cambios'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar contrasinal</CardTitle>
                <CardDescription>
                  Actualiza a túa contrasinal para manter a túa conta segura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova contrasinal *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      required
                      placeholder="Introduce a nova contrasinal"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova contrasinal *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      required
                      placeholder="Repite a nova contrasinal"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>A contrasinal debe ter polo menos 6 caracteres.</p>
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    <Lock className="mr-2 h-4 w-4" />
                    {loading ? 'Cambiando...' : 'Cambiar contrasinal'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};