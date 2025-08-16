-- Fix missing roles for existing users
-- First, ensure admin user has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'admin@vallinclan.edu.es'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also assign admin role to miguelv@edu.xunta.es for testing
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'miguelv@edu.xunta.es'
ON CONFLICT (user_id, role) DO NOTHING;