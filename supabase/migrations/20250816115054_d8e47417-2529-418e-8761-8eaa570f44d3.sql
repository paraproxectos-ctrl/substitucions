-- Eliminar perfiles con nombre o apellidos vacíos que tengan rol de profesor
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT p.user_id 
  FROM public.profiles p 
  WHERE (p.nome = '' OR p.nome IS NULL OR p.apelidos = '' OR p.apelidos IS NULL)
  AND p.user_id != 'dbc7a494-f070-4d69-9583-ca76a9ff4881' -- Preservar admin
);

-- También limpiar estos perfiles de la tabla profiles 
DELETE FROM public.profiles 
WHERE (nome = '' OR nome IS NULL OR apelidos = '' OR apelidos IS NULL)
AND user_id != 'dbc7a494-f070-4d69-9583-ca76a9ff4881'; -- Preservar admin