import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { School, Calendar, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);
    
    if (error) {
      setError('Credenciais incorrectas. Verifica o teu email e contrasinal.');
      toast({
        title: "Error de acceso",
        description: "Credenciais incorrectas",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Acceso correcto",
        description: "Benvido/a ao sistema de substitucións",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/30 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center space-x-2">
            <School className="h-12 w-12 text-primary" />
            <div className="flex space-x-1">
              <Calendar className="h-8 w-8 text-accent-foreground" />
              <Users className="h-8 w-8 text-secondary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Substitucións Valle Inclán
            </h1>
            <p className="text-muted-foreground mt-2">
              Sistema de xestión de substitucións escolares
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Iniciar sesión
            </CardTitle>
            <CardDescription className="text-center">
              Introduce as túas credenciais para acceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@colexio.gal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contrasinal</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Introduce o teu contrasinal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 CEIP Valle Inclán</p>
          <p>Sistema educativo seguro e eficiente</p>
        </div>
      </div>
    </div>
  );
}