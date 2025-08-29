-- Primero, verificar y habilitar RLS en todas las tablas que lo necesiten
-- Para arquivos_calendario ya parece estar habilitado según el esquema

-- Revisar las políticas actuales de arquivos_calendario
-- Problema: La política de SELECT actual solo permite ver archivos a usuarios activos con rol
-- pero los profesores no pueden ver sus propios archivos

-- Eliminar política problemática y crear nuevas políticas más específicas
DROP POLICY IF EXISTS "Active users with role can view files" ON public.arquivos_calendario;

-- Política para que los profesores puedan ver todos los archivos (como los admins)
CREATE POLICY "Professors and admins can view all files" 
ON public.arquivos_calendario 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'profesor'::app_role)
);

-- Asegurar que la política de inserción permite a profesores subir archivos
-- (Esta parece estar bien según el esquema actual)

-- Verificar que RLS está habilitado en todas las tablas necesarias
-- Según el linter hay problemas de RLS no habilitado en tablas públicas

-- Habilitar RLS en tablas que pueden estar faltando
DO $$
BEGIN
  -- Verificar y habilitar RLS en conversacions si no está habilitado
  IF NOT (SELECT row_security FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversacions') THEN
    ALTER TABLE public.conversacions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Verificar y habilitar RLS en conversacion_participantes si no está habilitado
  IF NOT (SELECT row_security FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversacion_participantes') THEN
    ALTER TABLE public.conversacion_participantes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Verificar y habilitar RLS en mensaxes si no está habilitado
  IF NOT (SELECT row_security FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mensaxes') THEN
    ALTER TABLE public.mensaxes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;