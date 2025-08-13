-- Asignar rol de admin ao usuario que acabou de crear
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'admin@vallinclan.edu.es'
ON CONFLICT (user_id, role) DO NOTHING;

-- Actualizar perfil do admin con nome e apelidos
UPDATE public.profiles 
SET nome = 'Administrador', apelidos = 'Sistema'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@vallinclan.edu.es'
);