-- Create some test teacher users for messaging
-- First, let's check if we have any teacher/admin roles in the system
-- If not, we'll add the admin as a professor role for testing

-- Ensure the admin user has both admin and profesor roles for testing
INSERT INTO public.user_roles (user_id, role)
SELECT 'dbc7a494-f070-4d69-9583-ca76a9ff4881', 'profesor'
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = 'dbc7a494-f070-4d69-9583-ca76a9ff4881' 
    AND role = 'profesor'
);

-- Create a test teacher profile and user role (this is just for testing the dropdown)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'profesor.test@vallinclan.edu.es',
    crypt('test123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    FALSE
) ON CONFLICT (id) DO NOTHING;

-- Create profile for test teacher
INSERT INTO public.profiles (user_id, nome, apelidos, email)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Profesor',
    'De Proba',
    'profesor.test@vallinclan.edu.es'
) ON CONFLICT (user_id) DO NOTHING;

-- Assign profesor role to test teacher
INSERT INTO public.user_roles (user_id, role)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'profesor'
) ON CONFLICT (user_id, role) DO NOTHING;