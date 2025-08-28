-- Actualizar la función is_current_user_active para verificar también que el usuario tenga rol
CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
    WHERE p.user_id = auth.uid()
      AND p.is_active = true
      AND ur.role IS NOT NULL
  );
$function$

-- Actualizar las políticas de acceso para ser más restrictivas
-- Eliminar políticas conflictivas y crear una nueva más estricta para substitucions
DROP POLICY IF EXISTS "substitucions_select_auth" ON public.substitucions;
DROP POLICY IF EXISTS "substitucions_update_auth_own" ON public.substitucions;
DROP POLICY IF EXISTS "substitucions_insert_auth" ON public.substitucions;

-- Política más estricta para ver substituciones - solo usuarios activos con rol
CREATE POLICY "Active users with role can view substitutions" 
ON public.substitucions 
FOR SELECT 
USING (
  is_current_user_active() AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'profesor'::app_role))
);

-- Política para que profesores puedan actualizar sus propias substituciones
CREATE POLICY "Professors can update their own substitutions" 
ON public.substitucions 
FOR UPDATE 
USING (
  is_current_user_active() AND
  profesor_asignado_id = auth.uid() AND
  has_role(auth.uid(), 'profesor'::app_role)
)
WITH CHECK (
  is_current_user_active() AND
  profesor_asignado_id = auth.uid() AND
  has_role(auth.uid(), 'profesor'::app_role)
);

-- Actualizar política de profiles para ser más restrictiva
DROP POLICY IF EXISTS "Users can view their own profile and admins can view all" ON public.profiles;

CREATE POLICY "Active users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (user_id = auth.uid() AND is_active = true AND EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid())) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Actualizar política de grupos educativos
DROP POLICY IF EXISTS "All authenticated users can view grupos" ON public.grupos_educativos;

CREATE POLICY "Active users with role can view grupos" 
ON public.grupos_educativos 
FOR SELECT 
USING (is_current_user_active());

-- Política más estricta para arquivos_calendario
DROP POLICY IF EXISTS "Authenticated users can view all files" ON public.arquivos_calendario;

CREATE POLICY "Active users with role can view files" 
ON public.arquivos_calendario 
FOR SELECT 
USING (is_current_user_active());