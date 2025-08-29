-- Corregir el problema de visualización de archivos para profesores
-- Eliminar política problemática y crear nueva política específica

DROP POLICY IF EXISTS "Active users with role can view files" ON public.arquivos_calendario;

-- Política para que los profesores puedan ver todos los archivos (como los admins)
CREATE POLICY "Professors and admins can view all files" 
ON public.arquivos_calendario 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'profesor'::app_role)
);

-- Habilitar RLS en tablas que pueden estar faltando (usando sintaxis correcta)
DO $$
BEGIN
  -- Verificar y habilitar RLS en conversacions si no está habilitado
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversacions') THEN
    ALTER TABLE public.conversacions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Verificar y habilitar RLS en conversacion_participantes si no está habilitado
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversacion_participantes') THEN
    ALTER TABLE public.conversacion_participantes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Verificar y habilitar RLS en mensaxes si no está habilitado
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mensaxes') THEN
    ALTER TABLE public.mensaxes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;