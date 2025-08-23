
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users, X } from 'lucide-react';
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
  confirmada_professor?: boolean;
}

export const SubstitutionConfirmationPopup: React.FC = () => {
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
      if (!user || !userRole || userRole.role !== 'profesor' || hasChecked || loading) {
        return;
      }

      console.log('Checking substitutions for user:', user.id);

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
            confirmada_professor,
            grupos_educativos (
              nome,
              nivel
            )
          `)
          .eq('profesor_asignado_id', user.id)
          .gte('data', today)
          .or('confirmada_professor.is.null,confirmada_professor.eq.false')
          .order('data', { ascending: true })
          .order('hora_inicio', { ascending: true });

        console.log('Substitutions query result:', { data, error });

        if (error) {
          console.error('Error fetching substitutions:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log('Found substitutions to confirm:', data.length);
          setSubstitutions(data);
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
    const timeoutId = setTimeout(checkSubstitutions, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [user, userRole, hasChecked, loading]);

  const handleConfirm = async () => {
    if (substitutions.length > 0) {
      try {
        const substitutionIds = substitutions.map(sub => sub.id);
        await supabase
          .from('substitucions')
          .update({ confirmada_professor: true, vista: true })
          .in('id', substitutionIds);
        
        console.log('Substitutions confirmed successfully');
      } catch (error) {
        console.error('Error confirming substitutions:', error);
      }
    }
    
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const getMotivoText = (motivo: string) => {
    const motivosMap: Record<string, string> = {
      'enfermidade': 'Ausencia imprevista',
      'asuntos_propios': 'Asuntos propios',
      'formacion': 'Formación',
      'reunion': 'Reunión',
      'outro': 'Otro'
    };
    return motivosMap[motivo] || 'Ausencia imprevista';
  };

  if (!isOpen || substitutions.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Substitucións do {substitutions.length > 0 ? format(new Date(substitutions[0].data), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es }) : ''}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Content */}
        <div className="px-6">
          <p className="text-sm text-muted-foreground mb-4">
            Outras substitucións do día
          </p>
          
          {substitutions.map((substitution) => (
            <Card key={substitution.id} className="mb-3 border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-red-500" />
                    <span className="font-medium">
                      {substitution.hora_inicio} - {substitution.hora_fin}
                    </span>
                    <span className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded">
                      {getMotivoText(substitution.motivo)}
                    </span>
                  </div>
                </div>
                
                {substitution.grupos_educativos && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="font-medium">Grupo:</span>
                    <span>{substitution.grupos_educativos.nome}</span>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  <Users className="h-4 w-4 inline mr-1" />
                  <span className="font-medium">Profesor/a:</span>
                </div>
                
                {substitution.observacions && (
                  <div className="text-sm mt-2">
                    <span className="font-medium">Observacións:</span>
                    <p className="text-muted-foreground">{substitution.observacions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4">
          <Button 
            onClick={handleConfirm} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Confirmar substitucións
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
