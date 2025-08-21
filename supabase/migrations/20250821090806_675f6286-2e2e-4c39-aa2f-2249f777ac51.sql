-- Actualizar el email del usuario admin
UPDATE auth.users 
SET email = 'ceip.valle.inclan.oleiros@edu.xunta.gal',
    raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'), 
        '{email}', 
        '"ceip.valle.inclan.oleiros@edu.xunta.gal"'
    )
WHERE email = 'admin@valleinclan.edu.es';

-- Actualizar el perfil correspondiente
UPDATE public.profiles 
SET email = 'ceip.valle.inclan.oleiros@edu.xunta.gal'
WHERE email = 'admin@valleinclan.edu.es';

-- Nota: La contraseña se debe cambiar desde el panel de administración de Supabase
-- o usando la función de cambio de contraseña en la aplicación