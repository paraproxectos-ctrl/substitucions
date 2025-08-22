import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Substitution {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fin: string;
  grupos_educativos?: {
    nome: string;
    nivel: string;
  };
  motivo: string;
  observacions?: string;
}

export const SubstitutionsPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const { user, userRole } = useAuth();

  useEffect(() => {
    const checkSubstitutions = async () => {
      if (!user || !userRole || userRole.role !== 'profesor' || hasChecked) {
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('substitucions')
          .select(`
            id,
            data,
            hora_inicio,
            hora_fin,
            motivo,
            observacions,
            grupos_educativos (
              nome,
              nivel
            )
          `)
          .eq('profesor_asignado_id', user.id)
          .gte('data', today)
          .eq('vista', false)
          .order('data', { ascending: true })
          .order('hora_inicio', { ascending: true });

        if (error) {
          console.error('Error fetching substitutions:', error);
          return;
        }

        if (data && data.length > 0) {
          setSubstitutions(data);
          setIsOpen(true);
        }

        setHasChecked(true);
      } catch (error) {
        console.error('Error checking substitutions:', error);
        setHasChecked(true);
      }
    };

    checkSubstitutions();
  }, [user, userRole, hasChecked]);

  const handleClose = async () => {
    setIsOpen(false);
    
    // Mark substitutions as viewed
    if (substitutions.length > 0) {
      try {
        const substitutionIds = substitutions.map(sub => sub.id);
        await supabase
          .from('substitucions')
          .update({ vista: true })
          .in('id', substitutionIds);
      } catch (error) {
        console.error('Error marking substitutions as viewed:', error);
      }
    }
  };

  const getMotivoText = (motivo: string) => {
    const motivosMap: Record<string, string> = {
      'enfermidade': 'Enfermedad',
      'asuntos_propios': 'Asuntos propios',
      'formacion': 'Formación',
      'reunion': 'Reunión',
      'outro': 'Otro'
    };
    return motivosMap[motivo] || motivo;
  };

  if (!isOpen || substitutions.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Substitucións asignadas
          </DialogTitle>
          <DialogDescription className="text-center">
            Tes {substitutions.length} substitución{substitutions.length > 1 ? 's' : ''} asignada{substitutions.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {substitutions.map((substitution) => (
            <Card key={substitution.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(new Date(substitution.data), 'EEEE, d MMMM yyyy', { locale: es })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {substitution.hora_inicio} - {substitution.hora_fin}
                  </span>
                </div>
                
                {substitution.grupos_educativos && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {substitution.grupos_educativos.nome} ({substitution.grupos_educativos.nivel})
                    </span>
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium">Motivo:</span> {getMotivoText(substitution.motivo)}
                </div>
                
                {substitution.observacions && (
                  <div className="text-sm">
                    <span className="font-medium">Observacións:</span> {substitution.observacions}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={handleClose} className="w-full">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};