import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Save } from 'lucide-react';

interface Teacher {
  user_id: string;
  nome: string;
  apelidos: string;
  email: string;
  horas_libres_semanais?: number;
  sustitucions_realizadas_semana?: number;
}

interface Group {
  id: string;
  nome: string;
  nivel: string;
}

interface FormData {
  data: string;
  hora_inicio: string;
  hora_fin: string;
  grupo_id: string;
  profesor_ausente_id: string;
  profesor_asignado_id: string;
  motivo: 'ausencia_imprevista' | 'enfermidade' | 'asuntos_propios' | 'outro';
  motivo_outro: string;
  observacions: string;
}

interface SubstitutionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  formData: FormData;
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void;
  teachers: Teacher[];
  groups: Group[];
  onSubmit: () => void;
  submitting: boolean;
  recommendedTeacher?: Teacher | null;
  onGetRecommendedTeacher?: () => void;
  submitButtonText?: string;
}

export const SubstitutionForm: React.FC<SubstitutionFormProps> = ({
  open,
  onOpenChange,
  title,
  description,
  formData,
  setFormData,
  teachers,
  groups,
  onSubmit,
  submitting,
  recommendedTeacher,
  onGetRecommendedTeacher,
  submitButtonText = "Gardar"
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Select 
              value={formData.motivo} 
              onValueChange={(value: typeof formData.motivo) => setFormData(prev => ({ ...prev, motivo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ausencia_imprevista">Ausencia imprevista</SelectItem>
                <SelectItem value="enfermidade">Enfermidade</SelectItem>
                <SelectItem value="asuntos_propios">Asuntos propios</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hora_inicio">Hora inicio</Label>
            <Input
              id="hora_inicio"
              type="time"
              value={formData.hora_inicio}
              onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hora_fin">Hora fin</Label>
            <Input
              id="hora_fin"
              type="time"
              value={formData.hora_fin}
              onChange={(e) => setFormData(prev => ({ ...prev, hora_fin: e.target.value }))}
            />
          </div>

          {formData.motivo === 'outro' && (
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="motivo_outro">Especifica o motivo</Label>
              <Input
                id="motivo_outro"
                value={formData.motivo_outro}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo_outro: e.target.value }))}
                placeholder="Describe o motivo..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="grupo_id">Grupo (opcional)</Label>
            <Select 
              value={formData.grupo_id || "none"} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, grupo_id: value === "none" ? "" : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un grupo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sen asignar</SelectItem>
                {groups.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nome} - {grupo.nivel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profesor_ausente_id">Profesor/a ausente</Label>
            <Select 
              value={formData.profesor_ausente_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, profesor_ausente_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona profesor ausente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sen especificar</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.user_id} value={teacher.user_id}>
                    {teacher.nome} {teacher.apelidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="profesor_asignado_id">
                Profesor/a substituto/a
                {recommendedTeacher && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Recomendado: {recommendedTeacher.nome} {recommendedTeacher.apelidos})
                  </span>
                )}
              </Label>
              {onGetRecommendedTeacher && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onGetRecommendedTeacher}
                >
                  Recomendación óptima
                </Button>
              )}
            </div>
            <Select 
              value={formData.profesor_asignado_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, profesor_asignado_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona profesor" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.user_id} value={teacher.user_id}>
                    {teacher.nome} {teacher.apelidos}
                    {teacher.horas_libres_semanais !== undefined && teacher.sustitucions_realizadas_semana !== undefined && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({teacher.sustitucions_realizadas_semana}/{teacher.horas_libres_semanais})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="observacions">Observacións</Label>
            <Textarea
              id="observacions"
              value={formData.observacions}
              onChange={(e) => setFormData(prev => ({ ...prev, observacions: e.target.value }))}
              placeholder="Observacións adicionais..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Gardando...' : submitButtonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};