-- Add ON DELETE CASCADE for substitutions when a teacher is deleted
-- This will automatically delete all substitutions associated with a teacher when the teacher is deleted

-- First, add foreign key constraints with CASCADE for teacher-related columns
ALTER TABLE public.substitucions 
ADD CONSTRAINT fk_substitucions_profesor_asignado 
FOREIGN KEY (profesor_asignado_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

ALTER TABLE public.substitucions 
ADD CONSTRAINT fk_substitucions_profesor_ausente 
FOREIGN KEY (profesor_ausente_id) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;

-- Also add cascade for created_by field
ALTER TABLE public.substitucions 
ADD CONSTRAINT fk_substitucions_created_by 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;