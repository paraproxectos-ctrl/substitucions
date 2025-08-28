import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users, User, BookOpen, Car } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Substitution {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  motivo_outro?: string;
  grupo_id?: string;
  grupo_nome?: string;
  titular_id?: string;
  titular_nome?: string;
  assigned_to: string;
  substituto_nome?: string;
  observacions?: string;
  vista: boolean;
  confirmada_professor?: boolean;
}

export const SubstitutionsPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const { user, userRole, loading } = useAuth();

  // Reset hasChecked when auth state changes
  useEffect(() => {
    if (!loading && user && userRole) {
      setHasChecked(false);
    }
  }, [user, userRole, loading]);

  useEffect(() => {
    const checkSubstitutions = async () => {
      if (!user || !userRole || userRole.role !== 'profesor' || hasChecked) {
        return;
      }

      console.log('Checking substitutions for user:', user.id);

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .rpc('get_substitucions_docente', { 
            p_user: user.id, 
            p_day: today 
          });

        console.log('Substitutions query result:', { data, error });

        if (error) {
          console.error('Error fetching substitutions:', error);
          return;
        }

        // Filter for unconfirmed substitutions
        const unconfirmedSubstitutions = data?.filter(sub => !sub.confirmada_professor) || [];

        if (unconfirmedSubstitutions.length > 0) {
          console.log('Found substitutions to confirm:', unconfirmedSubstitutions.length);
          setSubstitutions(unconfirmedSubstitutions);
          setIsOpen(true);
        } else {
          console.log('No substitutions found to confirm');
        }

        setHasChecked(true);
      } catch (error) {
        console.error('Error checking substitutions:', error);
        setHasChecked(true);
      }
    };

    // Add a small delay to ensure user and userRole are fully loaded
    const timeoutId = setTimeout(checkSubstitutions, 500);
    
    return () => clearTimeout(timeoutId);
  }, [user, userRole, hasChecked]);

  const handleClose = async () => {
    setIsOpen(false);
    
    // Mark substitutions as confirmed by professor
    if (substitutions.length > 0) {
      try {
        const substitutionIds = substitutions.map(sub => sub.id);
        await supabase
          .from('substitucions')
          .update({ confirmada_professor: true, vista: true })
          .in('id', substitutionIds);
      } catch (error) {
        console.error('Error confirming substitutions:', error);
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
            Substitucións pendentes de confirmación
          </DialogTitle>
          <DialogDescription className="text-center">
            Tes {substitutions.length} substitución{substitutions.length > 1 ? 's' : ''} pendente{substitutions.length > 1 ? 's' : ''} de confirmar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
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
                    Horario: {substitution.hora_inicio} – {substitution.hora_fin}
                  </span>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Motivo:</span> {getMotivoText(substitution.motivo)}
                  {substitution.motivo_outro && ` (${substitution.motivo_outro})`}
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Grupo:</span> {substitution.grupo_nome ?? '—'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Profesor/a ausente:</span> {substitution.titular_nome ?? '—'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Substituto/a:</span> {substitution.substituto_nome ?? '—'}
                  </span>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Observacións:</span> {substitution.observacions ?? '—'}
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Estado:</span> {substitution.vista ? 'Vista' : 'Non vista'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={handleClose} className="w-full">
            Confirmar substitucións
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};