-- Habilitar tiempo real para la tabla mensaxes
ALTER TABLE public.mensaxes REPLICA IDENTITY FULL;

-- Agregar la tabla a la publicación de tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensaxes;