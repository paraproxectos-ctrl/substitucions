-- Agregar campo para el profesor ausente en la tabla substitucions
ALTER TABLE public.substitucions 
ADD COLUMN IF NOT EXISTS profesor_ausente_id uuid;

-- Agregar comentarios para clarificar los campos
COMMENT ON COLUMN public.substitucions.profesor_ausente_id IS 'ID del profesor que está ausente y necesita ser sustituido';
COMMENT ON COLUMN public.substitucions.profesor_asignado_id IS 'ID del profesor que cubre la sustitución';