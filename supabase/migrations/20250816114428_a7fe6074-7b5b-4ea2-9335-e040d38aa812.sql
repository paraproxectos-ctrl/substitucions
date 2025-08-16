-- Asignar rol de profesor a todos los perfiles que no sean admin y no tengan rol
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'profesor'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.user_id IS NULL 
  AND p.user_id != 'dbc7a494-f070-4d69-9583-ca76a9ff4881' -- Excluir admin principal
ON CONFLICT (user_id, role) DO NOTHING;

-- Actualizar horas libres semanales para profesores que tienen 0 horas
UPDATE public.profiles 
SET horas_libres_semanais = 3
WHERE user_id IN (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'profesor'
) 
AND horas_libres_semanais = 0;