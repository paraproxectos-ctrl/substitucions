-- Actualizar políticas para otros recursos críticos
DROP POLICY IF EXISTS "Users can view their own profile and admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "All authenticated users can view grupos" ON public.grupos_educativos;
DROP POLICY IF EXISTS "Authenticated users can view all files" ON public.arquivos_calendario;

-- Política más estricta para profiles
CREATE POLICY "Active users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (user_id = auth.uid() AND is_active = true AND EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid())) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Política más estricta para grupos educativos
CREATE POLICY "Active users with role can view grupos" 
ON public.grupos_educativos 
FOR SELECT 
USING (is_current_user_active());

-- Política más estricta para arquivos
CREATE POLICY "Active users with role can view files" 
ON public.arquivos_calendario 
FOR SELECT 
USING (is_current_user_active());