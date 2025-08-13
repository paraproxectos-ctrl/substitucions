-- Clean up any orphaned profiles first
DELETE FROM public.profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Update the function to be more robust
DROP FUNCTION IF EXISTS public.create_teacher_user(text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_teacher_user(user_email text, user_password text, user_nome text, user_apelidos text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    new_user_id UUID;
    existing_user_id UUID;
    result JSON;
BEGIN
    -- Clean up any orphaned profiles for this email first
    DELETE FROM public.profiles WHERE email = user_email AND user_id NOT IN (SELECT id FROM auth.users);
    
    -- Check if user already exists
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF existing_user_id IS NOT NULL THEN
        -- User exists, ensure profile and role
        INSERT INTO public.profiles (user_id, nome, apelidos, email)
        VALUES (existing_user_id, user_nome, user_apelidos, user_email)
        ON CONFLICT (user_id) DO UPDATE SET
            nome = EXCLUDED.nome,
            apelidos = EXCLUDED.apelidos,
            email = EXCLUDED.email;
        
        -- Ensure user has profesor role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (existing_user_id, 'profesor')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RETURN json_build_object(
            'success', true,
            'user_id', existing_user_id,
            'email', user_email
        );
    END IF;

    -- Create new user
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
        user_email,
        crypt(user_password, gen_salt('bf')),
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
        json_build_object('nome', user_nome, 'apelidos', user_apelidos),
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
    RETURNING id INTO new_user_id;

    -- Create profile
    INSERT INTO public.profiles (user_id, nome, apelidos, email)
    VALUES (new_user_id, user_nome, user_apelidos, user_email);

    -- Assign profesor role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'profesor');

    RETURN json_build_object(
        'success', true,
        'user_id', new_user_id,
        'email', user_email
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$;