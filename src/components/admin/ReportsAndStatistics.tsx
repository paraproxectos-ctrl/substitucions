import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, Calendar, RefreshCw } from 'lucide-react';

interface TeacherStats {
  user_id: string;
  nome: string;
  apelidos: string;
  horas_libres_semanais: number;
  sustitucions_realizadas_semana: number;
  total_substitucions: number;
}

interface SubstitutionStats {
  total_substitutions: number;
  this_week: number;
  this_month: number;
  by_motivo: { motivo: string; count: number }[];
}

export const ReportsAndStatistics: React.FC = () => {
  const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
  const [substitutionStats, setSubstitutionStats] = useState<SubstitutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const { userRole } = useAuth();

  // Fetch teacher statistics
  const fetchTeacherStats = async () => {
    try {
      // Get teachers with their weekly stats
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'profesor');

      if (!roleData) return;

      const userIds = roleData.map(role => role.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nome, apelidos, horas_libres_semanais, sustitucions_realizadas_semana')
        .in('user_id', userIds);

      if (!profiles) return;

      // Get total substitutions for each teacher
      const statsPromises = profiles.map(async (profile) => {
        const { count } = await supabase
          .from('substitucions')
          .select('*', { count: 'exact', head: true })
          .eq('profesor_asignado_id', profile.user_id);

        return {
          ...profile,
          total_substitucions: count || 0
        };
      });

      const stats = await Promise.all(statsPromises);
      setTeacherStats(stats);
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
    }
  };

  // Fetch substitution statistics
  const fetchSubstitutionStats = async () => {
    try {
      // Total substitutions
      const { count: total } = await supabase
        .from('substitucions')
        .select('*', { count: 'exact', head: true });

      // This week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const { count: thisWeek } = await supabase
        .from('substitucions')
        .select('*', { count: 'exact', head: true })
        .gte('data', startOfWeek.toISOString().split('T')[0]);

      // This month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count: thisMonth } = await supabase
        .from('substitucions')
        .select('*', { count: 'exact', head: true })
        .gte('data', startOfMonth.toISOString().split('T')[0]);

      // By motivo
      const { data: motivoData } = await supabase
        .from('substitucions')
        .select('motivo')
        .not('motivo', 'is', null);

      const motivoCounts = motivoData?.reduce((acc, sub) => {
        acc[sub.motivo] = (acc[sub.motivo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const byMotivo = Object.entries(motivoCounts).map(([motivo, count]) => ({
        motivo,
        count
      }));

      setSubstitutionStats({
        total_substitutions: total || 0,
        this_week: thisWeek || 0,
        this_month: thisMonth || 0,
        by_motivo: byMotivo
      });
    } catch (error) {
      console.error('Error fetching substitution stats:', error);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTeacherStats(),
      fetchSubstitutionStats()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Check admin access - MOVED AFTER ALL HOOKS
  if (userRole?.role !== 'admin') {
    return (
      <Alert>
        <AlertDescription>
          Non tes permisos para acceder a esta sección.
        </AlertDescription>
      </Alert>
    );
  }

  // Reset weekly counters manually
  const resetWeeklyCounters = async () => {
    try {
      await supabase.rpc('reset_weekly_counters');
      await refreshData();
    } catch (error) {
      console.error('Error resetting weekly counters:', error);
    }
  };

  const getMotivoLabel = (motivo: string) => {
    const labels: Record<string, string> = {
      'enfermidade': 'Enfermidade',
      'permiso': 'Permiso',
      'formacion': 'Formación',
      'outros': 'Outros'
    };
    return labels[motivo] || motivo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando estatísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Informes e Estatísticas
          </h1>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetWeeklyCounters}
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset semanal
          </Button>
          <Button
            variant="outline"
            onClick={refreshData}
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sustitucións</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{substitutionStats?.total_substitutions || 0}</div>
            <p className="text-xs text-muted-foreground">Todas as sustitucións</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{substitutionStats?.this_week || 0}</div>
            <p className="text-xs text-muted-foreground">Sustitucións semanais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{substitutionStats?.this_month || 0}</div>
            <p className="text-xs text-muted-foreground">Sustitucións mensuales</p>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Estatísticas do Profesorado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profesor/a</TableHead>
                <TableHead>Horas libres/semana</TableHead>
                <TableHead>Sustitucións esta semana</TableHead>
                <TableHead>Total sustitucións</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherStats.map((teacher) => (
                <TableRow key={teacher.user_id}>
                  <TableCell className="font-medium">
                    {teacher.nome} {teacher.apelidos}
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
                  <TableCell>{teacher.total_substitucions}</TableCell>
                  <TableCell>
                    {teacher.sustitucions_realizadas_semana < teacher.horas_libres_semanais ? (
                      <Badge variant="secondary">Dispoñible</Badge>
                    ) : (
                      <Badge variant="outline">Sen cupo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Substitution by Motivo */}
      <Card>
        <CardHeader>
          <CardTitle>Sustitucións por Motivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {substitutionStats?.by_motivo.map((item) => (
              <div key={item.motivo} className="flex items-center justify-between">
                <span className="text-sm font-medium">{getMotivoLabel(item.motivo)}</span>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};