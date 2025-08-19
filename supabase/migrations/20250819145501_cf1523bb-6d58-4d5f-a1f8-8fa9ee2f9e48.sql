-- Crear usuario admin si no existe
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Intentar encontrar el usuario admin existente
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@vallinclan.edu.es' 
    LIMIT 1;
    
    -- Si no existe, crear el usuario admin
    IF admin_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@vallinclan.edu.es',
            crypt('Lacl7777melm@@@@', gen_salt('bf')),
            NOW(),
            NOW(),
            '',
            NOW(),
            '',
            NULL,
            '',
            '',
            NULL,
            NULL,
            '{"provider": "email", "providers": ["email"]}',
            json_build_object('nome', 'Administrador', 'apelidos', 'Sistema'),
            FALSE,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            '',
            0,
            NULL,
            '',
            NULL,
            FALSE,
            NULL
        )
        RETURNING id INTO admin_user_id;
        
        -- Crear perfil para el admin
        INSERT INTO public.profiles (user_id, nome, apelidos, email)
        VALUES (admin_user_id, 'Administrador', 'Sistema', 'admin@vallinclan.edu.es')
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Asignar rol de admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
    ELSE
        -- Si existe, asegurar que tiene perfil y rol
        INSERT INTO public.profiles (user_id, nome, apelidos, email)
        VALUES (admin_user_id, 'Administrador', 'Sistema', 'admin@vallinclan.edu.es')
        ON CONFLICT (user_id) DO UPDATE SET
            nome = EXCLUDED.nome,
            apelidos = EXCLUDED.apelidos,
            email = EXCLUDED.email;
        
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;