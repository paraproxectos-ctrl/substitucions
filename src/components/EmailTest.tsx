import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';

export const EmailTest = () => {
  const [email, setEmail] = useState('miguelavm2009@gmail.com');
  const [name, setName] = useState('Test User');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testEmail = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log(`Testing email with: ${email}, ${name}`);
      
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: {
          teacherEmail: email,
          teacherName: name
        }
      });

      console.log('Test email response:', { data, error });
      
      if (error) {
        console.error('Error testing email:', error);
        setResult({ error: error.message, success: false });
        toast({
          title: "Error",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
      } else {
        setResult(data);
        toast({
          title: data.success ? "Éxito" : "Error",
          description: data.success ? "Conexión SMTP exitosa" : `Error: ${data.error}`,
          variant: data.success ? "default" : "destructive"
        });
      }
    } catch (err: any) {
      console.error('Exception testing email:', err);
      setResult({ error: err.message, success: false });
      toast({
        title: "Error",
        description: `Exception: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testSubstitutionEmail = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log(`Testing substitution email with: ${email}, ${name}`);
      
      const { data, error } = await supabase.functions.invoke('send-substitution-email', {
        body: {
          teacherEmail: email,
          teacherName: name,
          substitutionDetails: {
            fecha: '2025-08-16',
            hora_inicio: '10:00',
            hora_fin: '11:00',
            materia: 'Matemáticas - 2º ESO',
            grupo: 'Grupo A',
            observaciones: 'Prueba de email'
          }
        }
      });

      console.log('Substitution email response:', { data, error });
      
      if (error) {
        console.error('Error sending substitution email:', error);
        setResult({ error: error.message, success: false });
        toast({
          title: "Error",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
      } else {
        setResult(data);
        toast({
          title: data.success ? "Éxito" : "Error", 
          description: data.success ? "Email enviado correctamente" : `Error: ${data.error}`,
          variant: data.success ? "default" : "destructive"
        });
      }
    } catch (err: any) {
      console.error('Exception sending substitution email:', err);
      setResult({ error: err.message, success: false });
      toast({
        title: "Error",
        description: `Exception: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test de Correos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Introduce email de prueba"
          />
        </div>
        
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Introduce nombre"
          />
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testEmail} 
            disabled={loading || !email || !name}
            className="w-full"
          >
            {loading ? 'Probando...' : 'Probar Conexión SMTP'}
          </Button>
          
          <Button 
            onClick={testSubstitutionEmail} 
            disabled={loading || !email || !name}
            className="w-full"
            variant="outline"
          >
            {loading ? 'Enviando...' : 'Probar Email Sustitución'}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};