-- Eliminar todos los perfiles que no sean el administrador principal
DELETE FROM public.profiles 
WHERE user_id != 'dbc7a494-f070-4d69-9583-ca76a9ff4881';

-- Eliminar todos los roles que no sean del administrador principal  
DELETE FROM public.user_roles 
WHERE user_id != 'dbc7a494-f070-4d69-9583-ca76a9ff4881';