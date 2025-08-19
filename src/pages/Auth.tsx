import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { School, LogIn, UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    nome: '',
    apelidos: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const cleanupAuthState = () => {
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Error",
        description: "Por favor, introduce email e contraseña",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Clean up existing state
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        let errorMessage = "Error ao iniciar sesión";
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email ou contraseña incorrectos";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Por favor, confirma o teu email antes de iniciar sesión";
        }
        
        toast({
          title: "Error de autenticación",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Benvido/a",
          description: "Sesión iniciada correctamente",
        });
        // Force page reload for clean state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "Erro inesperado ao iniciar sesión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupForm.email || !signupForm.password || !signupForm.nome || !signupForm.apelidos) {
      toast({
        title: "Error",
        description: "Todos os campos son obrigatorios",
        variant: "destructive",
      });
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Error",
        description: "As contraseñas non coinciden",
        variant: "destructive",
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: "Error",
        description: "A contraseña debe ter polo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Clean up existing state
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome: signupForm.nome,
            apelidos: signupForm.apelidos
          }
        }
      });

      if (error) {
        let errorMessage = "Error ao crear a conta";
        if (error.message.includes('User already registered')) {
          errorMessage = "Este email xa está rexistrado. Proba a iniciar sesión ou usar outro email";
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = "A contraseña debe ter polo menos 6 caracteres";
        }
        
        toast({
          title: "Error de rexistro",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        if (data.user.email_confirmed_at) {
          // User is automatically confirmed
          toast({
            title: "Conta creada",
            description: "Rexistro completado. Benvido/a!",
          });
          window.location.href = '/';
        } else {
          // User needs to confirm email
          toast({
            title: "Revisa o teu email",
            description: "Enviámosche un enlace de confirmación. Revisa a túa bandexa de entrada.",
          });
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: "Erro inesperado ao crear a conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <School className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Valle Inclán</h1>
          <p className="text-muted-foreground">Sistema de Xestión de Substitucións</p>
        </div>

        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-xl">Acceso ao sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Rexistrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="exemplo@vallinclan.edu.es"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Contraseña
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-nome">Nome</Label>
                      <Input
                        id="signup-nome"
                        type="text"
                        placeholder="Nome"
                        value={signupForm.nome}
                        onChange={(e) => setSignupForm({ ...signupForm, nome: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-apelidos">Apelidos</Label>
                      <Input
                        id="signup-apelidos"
                        type="text"
                        placeholder="Apelidos"
                        value={signupForm.apelidos}
                        onChange={(e) => setSignupForm({ ...signupForm, apelidos: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="exemplo@vallinclan.edu.es"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Contraseña
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar contraseña</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Creando conta...' : 'Crear conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Os administradores deben crear contas de profesores dende o panel de administración.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Sistema educativo © 2024 Valle Inclán
        </p>
      </div>
    </div>
  );
};

export default Auth;