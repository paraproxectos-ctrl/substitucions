import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface UploadArquivosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onSuccess: () => void;
}

interface GrupoEducativo {
  id: string;
  nome: string;
  nivel: string;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

export const UploadArquivosDialog: React.FC<UploadArquivosDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  onSuccess,
}) => {
  const [grupos, setGrupos] = useState<GrupoEducativo[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      rejectedFiles.forEach((file) => {
        if (file.errors.some(e => e.code === 'file-too-large')) {
          toast({
            title: "Arquivo demasiado grande",
            description: `${file.file.name} supera o límite de 10MB`,
            variant: "destructive",
          });
        }
        if (file.errors.some(e => e.code === 'file-invalid-type')) {
          toast({
            title: "Tipo de arquivo non válido",
            description: `${file.file.name} non é un tipo de arquivo permitido`,
            variant: "destructive",
          });
        }
      });

      // Add accepted files
      const newFiles = acceptedFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));

      setFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
    },
  });

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos_educativos')
        .select('*')
        .order('nivel', { ascending: true })
        .order('nome', { ascending: true });

      if (error) {
        console.error('Error fetching grupos:', error);
        return;
      }

      setGrupos(data || []);
    } catch (error) {
      console.error('Error fetching grupos:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchGrupos();
    }
  }, [open]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (fileUpload: FileUpload, index: number): Promise<boolean> => {
    try {
      const selectedGrupoData = grupos.find(g => g.id === selectedGrupo);
      if (!selectedGrupoData || !selectedDate || !user || !profile) {
        throw new Error('Datos incompletos para subir o arquivo');
      }

      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const timestamp = Date.now();
      const fileExtension = fileUpload.file.name.split('.').pop();
      const filename = `${user.id}-${timestamp}-${fileUpload.file.name}`;
      // Use class ID instead of name to avoid invalid characters in storage path
      const storagePath = `${dateStr}/${selectedGrupoData.id}/${filename}`;

      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading' as const } : f
      ));

      // Upload to storage (simple upload without progress tracking for now)
      const { error: uploadError } = await supabase.storage
        .from('arquivos-substitucions')
        .upload(storagePath, fileUpload.file);

      if (uploadError) {
        throw uploadError;
      }

      // Update progress to 100% after successful upload
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 100 } : f
      ));

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('arquivos_calendario')
        .insert({
          date: dateStr,
          class_id: selectedGrupoData.id,
          class_name: selectedGrupoData.nome,
          filename,
          original_filename: fileUpload.file.name,
          mime_type: fileUpload.file.type,
          file_size: fileUpload.file.size,
          storage_path: storagePath,
          owner_uid: user.id,
          owner_name: `${profile.nome} ${profile.apelidos}`,
          notes: notes || null,
        });

      if (dbError) {
        // If database insert fails, cleanup the uploaded file
        await supabase.storage
          .from('arquivos-substitucions')
          .remove([storagePath]);
        throw dbError;
      }

      // Log the upload
      await supabase
        .from('arquivos_audit_log')
        .insert({
          action: 'upload',
          owner_uid: user.id,
          by_uid: user.id,
        });

      // Update status to completed
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'completed' as const, progress: 100 } : f
      ));

      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Erro descoñecido'
        } : f
      ));
      return false;
    }
  };

  const handleUpload = async () => {
    if (!selectedGrupo || files.length === 0) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona unha clase e engade arquivos",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    const uploadPromises = files.map((fileUpload, index) => 
      uploadFile(fileUpload, index)
    );

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;

    setIsUploading(false);

    if (successCount > 0) {
      onSuccess();
      if (successCount === files.length) {
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setFiles([]);
    setSelectedGrupo('');
    setNotes('');
    onOpenChange(false);
  };

  const canUpload = selectedGrupo && files.length > 0 && !isUploading;
  const hasCompletedFiles = files.some(f => f.status === 'completed');
  const hasErrorFiles = files.some(f => f.status === 'error');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Subir Arquivos - {selectedDate?.toLocaleDateString('gl-ES')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class Selection */}
          <div className="space-y-2">
            <Label htmlFor="grupo">Clase *</Label>
            <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona unha clase" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nivel} - {grupo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Arquivos * (PDF, DOC, DOCX, ODT - máx. 10MB cada un)</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p>Soltar os arquivos aquí...</p>
              ) : (
                <div>
                  <p>Arrastra arquivos aquí ou fai clic para seleccionar</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Máximo {MAX_FILES} arquivos, {formatFileSize(MAX_FILE_SIZE)} cada un
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos seleccionados</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((fileUpload, index) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {fileUpload.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileUpload.file.size)}
                          </p>
                          
                          {fileUpload.status === 'uploading' && (
                            <Progress value={fileUpload.progress} className="mt-2" />
                          )}
                          
                          {fileUpload.status === 'error' && (
                            <div className="flex items-center gap-1 mt-1 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-xs">{fileUpload.error}</span>
                            </div>
                          )}
                          
                          {fileUpload.status === 'completed' && (
                            <span className="text-xs text-green-600">✓ Subido</span>
                          )}
                        </div>
                        
                        {fileUpload.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Indicacións para o alumnado</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruccións opcionais para o alumnado..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!canUpload}
              className="min-w-24"
            >
              {isUploading ? 'Subindo...' : 'Gardar'}
            </Button>
          </div>

          {/* Success/Error Messages */}
          {hasCompletedFiles && !isUploading && (
            <div className="text-sm text-green-600">
              ✓ Algúns arquivos subiéronse correctamente
            </div>
          )}
          
          {hasErrorFiles && !isUploading && (
            <div className="text-sm text-destructive">
              ⚠ Algúns arquivos non se puideron subir
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};