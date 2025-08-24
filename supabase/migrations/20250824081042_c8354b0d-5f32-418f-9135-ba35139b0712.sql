-- Create storage bucket for arquivos
INSERT INTO storage.buckets (id, name, public) VALUES ('arquivos-substitucions', 'arquivos-substitucions', false);

-- Create table for file metadata
CREATE TABLE public.arquivos_calendario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  class_id UUID REFERENCES public.grupos_educativos(id),
  class_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  owner_uid UUID NOT NULL,
  owner_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.arquivos_calendario ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view all files" 
ON public.arquivos_calendario 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload files" 
ON public.arquivos_calendario 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND owner_uid = auth.uid());

CREATE POLICY "Owners and admins can update files" 
ON public.arquivos_calendario 
FOR UPDATE 
USING (owner_uid = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete files" 
ON public.arquivos_calendario 
FOR DELETE 
USING (owner_uid = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create storage policies for file access
CREATE POLICY "Authenticated users can view files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'arquivos-substitucions' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'arquivos-substitucions' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners and admins can update files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'arquivos-substitucions' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Owners and admins can delete files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'arquivos-substitucions' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

-- Create audit log table
CREATE TABLE public.arquivos_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('upload', 'delete', 'download')),
  file_id UUID REFERENCES public.arquivos_calendario(id) ON DELETE CASCADE,
  owner_uid UUID NOT NULL,
  by_uid UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.arquivos_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.arquivos_audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_arquivos_calendario_updated_at
  BEFORE UPDATE ON public.arquivos_calendario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();