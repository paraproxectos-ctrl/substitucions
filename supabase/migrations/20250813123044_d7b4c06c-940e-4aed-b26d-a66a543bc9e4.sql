-- Función para crear profesores con email confirmado automáticamente
CREATE OR REPLACE FUNCTION public.create_teacher_user(
    user_email TEXT,
    user_password TEXT,
    user_nome TEXT,
    user_apelidos TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    result JSON;
BEGIN
    -- Insertar directamente en auth.users con email confirmado
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

    -- Crear perfil automáticamente
    INSERT INTO public.profiles (user_id, nome, apelidos, email)
    VALUES (new_user_id, user_nome, user_apelidos, user_email);

    -- Asignar rol de profesor
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'profesor');

    -- Retornar resultado
    result := json_build_object(
        'success', true,
        'user_id', new_user_id,
        'email', user_email
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;