
-- Agregar campo is_active a la tabla profiles si no existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Crear función para verificar si el usuario actual está activo
CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_active = true
  );
$$;

-- Crear política RLS para denegar acceso a usuarios inactivos
-- Esto se aplicará a todas las tablas que ya tienen RLS
CREATE POLICY "Deny access to inactive users" ON public.profiles
FOR ALL USING (
  CASE 
    WHEN user_id = auth.uid() THEN is_active = true
    ELSE true  -- Permitir que otros usuarios vean perfiles (admins, etc.)
  END
);

-- Aplicar la restricción a la tabla substitucions también
CREATE POLICY "Only active users can access substitutions" ON public.substitucions
FOR ALL USING (is_current_user_active());

-- Aplicar la restricción a otras tablas importantes
CREATE POLICY "Only active users can access messages" ON public.mensaxes
FOR ALL USING (is_current_user_active());

CREATE POLICY "Only active users can access conversations" ON public.conversacions
FOR ALL USING (is_current_user_active());
