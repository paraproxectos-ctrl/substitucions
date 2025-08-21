-- Actualizar el rol del usuario administrador
-- Primero, encontrar el user_id del usuario con ese email
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Buscar el user_id del usuario admin
    SELECT user_id INTO admin_user_id 
    FROM public.profiles 
    WHERE email = 'ceip.valle.inclan.oleiros@edu.xunta.gal' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Eliminar cualquier rol existente para este usuario
        DELETE FROM public.user_roles WHERE user_id = admin_user_id;
        
        -- Asignar el rol de admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin');
        
        -- También actualizar el perfil para asegurar que tenga la información correcta
        UPDATE public.profiles 
        SET 
            nome = 'Administrador',
            apelidos = 'Sistema',
            horas_libres_semanais = 0,
            sustitucions_realizadas_semana = 0
        WHERE user_id = admin_user_id;
        
        RAISE NOTICE 'Usuario % actualizado como administrador', admin_user_id;
    ELSE
        RAISE NOTICE 'No se encontró el usuario con email ceip.valle.inclan.oleiros@edu.xunta.gal';
    END IF;
END
$$;