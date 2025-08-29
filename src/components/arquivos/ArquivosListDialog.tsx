import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Download, Trash2, FileText, Search, Upload, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface ArquivoCalendario {
  id: string;
  date: string;
  class_name: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;  // clave relativa dentro do bucket
  owner_uid: string;
  owner_name: string;
  notes?: string;
  created_at: string;
}

interface ArquivosListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  files: ArquivoCalendario[];
  onDeleteSuccess: () => void;
}

export const ArquivosListDialog: React.FC<ArquivosListDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  files,
  onDeleteSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  // estado local da lista + sincronización coa prop files
  const [list, setList] = useState<ArquivoCalendario[]>([]);
  useEffect(() => {
    setList(files);
  }, [files]);

  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('gl-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canDelete = (file: ArquivoCalendario) => {
    return user && (file.owner_uid === user.id || userRole?.role === 'admin');
  };

  // agora calculamos a partir de list (non de files)
  const uniqueClasses = [...new Set(list.map(f => f.class_name))].sort();
  const uniqueOwners = [...new Set(list.map(f => f.owner_name))].sort();

  const filteredFiles = list.filter(file => {
    const matchesSearch =
      file.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === 'all' || file.class_name === classFilter;
    const matchesOwner = ownerFilter === 'all' || file.owner_name === ownerFilter;

    return matchesSearch && matchesClass && matchesOwner;
  });

  // ⬇️⬇️ CAMBIO CLAVE: forzar descarga para CUALQUIER tipo de arquivo
  const handleDownload = async (file: ArquivoCalendario) => {
    try {
      setDownloading(file.id);

      // 1) URL firmada (válida 1 hora)
      const { data, error } = await supabase.storage
        .from('arquivos-substitucions')
        .createSignedUrl(file.storage_path, 3600);

      if (error) throw error;

      // 2) Añadimos ?download=<nome> para forzar Content-Disposition: attachment
      const signed = data.signedUrl || '';
      const sep = signed.includes('?') ? '&' : '?';
      const forcedDownloadUrl = `${signed}${sep}download=${encodeURIComponent(file.original_filename || 'arquivo')}`;

      // 3) Auditoría (opcional)
      try {
        await supabase
          .from('arquivos_audit_log')
          .insert({
            action: 'download',
            file_id: file.id,
            owner_uid: file.owner_uid,
            by_uid: user?.id || '',
          });
      } catch {
        // se falla auditoría non bloqueamos a descarga
      }

      // 4) Disparar descarga nativa do navegador
      const a = document.createElement('a');
      a.href = forcedDownloadUrl;
      a.setAttribute('download', file.original_filename || 'arquivo');
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast({
        title: "Descarga iniciada",
        description: `Descargando ${file.original_filename}`,
      });
    } catch (err) {
      console.error('Error downloading file:', err);
      toast({
        title: "Erro na descarga",
        description: "Non se puido descargar o arquivo",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };
  // ⬆️⬆️ FIN DO CAMBIO

  // BORRADO REAL: Storage + BD + auditoría + actualización de UI local
  const handleDelete = async (file: ArquivoCalendario) => {
    try {
      // normalizar ruta en Storage (por se vén con URL completa)
      let normalizedPath = file.storage_path;

      if (normalizedPath.includes('supabase.co/storage/v1/object/public/')) {
        const parts = normalizedPath.split('/');
        const idx = parts.findIndex(p => p === 'arquivos-substitucions');
        if (idx >= 0) normalizedPath = parts.slice(idx + 1).join('/');
      }

      if (normalizedPath.startsWith('arquivos-substitucions/')) {
        normalizedPath = normalizedPath.replace('arquivos-substitucions/', '');
      }

      // 1) borrar de Storage
      const { error: storageError } = await supabase.storage
        .from('arquivos-substitucions')
        .remove([normalizedPath]);

      if (storageError) throw storageError;

      // 2) borrar de BD
      const { error: dbError } = await supabase
        .from('arquivos_calendario')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      // 3) log (non bloqueante)
      try {
        await supabase
          .from('arquivos_audit_log')
          .insert({
            action: 'delete',
            file_id: file.id,
            owner_uid: file.owner_uid,
            by_uid: user?.id || '',
          });
      } catch {}

      // 4) actualizar UI
      setList(prev => prev.filter(f => f.id !== file.id));
      onDeleteSuccess();

      toast({
        title: "Arquivo eliminado",
        description: `${file.original_filename} foi eliminado correctamente`,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Erro ao eliminar",
        description: "Non se puido eliminar o arquivo",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    return '📋';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Arquivos do {selectedDate?.toLocaleDateString('gl-ES')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Clase</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as clases</SelectItem>
                  {uniqueClasses.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Propietario</Label>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuarios</SelectItem>
                  {uniqueOwners.map((ownerName) => (
                    <SelectItem key={ownerName} value={ownerName}>
                      {ownerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {list.length} arquivos</span>
            <span>Filtrados: {filteredFiles.length} arquivos</span>
            <span>Clases: {uniqueClasses.length}</span>
          </div>

          {/* Lista */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <p>Non se atoparon arquivos cos filtros aplicados</p>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <Card key={file.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">{getFileIcon(file.mime_type || '')}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-medium truncate">{file.original_filename}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">{file.class_name}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatFileSize(file.file_size)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(file)}
                              disabled={downloading === file.id}
                            >
                              <Download className="h-4 w-4" />
                              {downloading === file.id ? 'Descargando...' : 'Descargar'}
                            </Button>

                            {canDelete(file) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" title="Eliminar">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminar arquivo</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Estás seguro de que queres eliminar "{file.original_filename}"?
                                      Esta acción non se pode desfacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(file)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{file.owner_name}</span>
                            <span>•</span>
                            <span>{formatDate(file.created_at)}</span>
                          </div>

                          {file.notes && (
                            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              <strong>Indicacións:</strong> {file.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Pechar
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                // aquí poderías abrir o diálogo de subida dende o compoñente pai
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir máis arquivos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
