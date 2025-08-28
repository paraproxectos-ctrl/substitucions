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