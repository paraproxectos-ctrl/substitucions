-- Add foreign keys to fix the relationships between tables

-- Add foreign key from user_roles to profiles
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for mensaxes table
ALTER TABLE public.mensaxes 
ADD CONSTRAINT mensaxes_remitente_id_fkey 
FOREIGN KEY (remitente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mensaxes 
ADD CONSTRAINT mensaxes_destinatario_id_fkey 
FOREIGN KEY (destinatario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mensaxes 
ADD CONSTRAINT mensaxes_conversacion_id_fkey 
FOREIGN KEY (conversacion_id) REFERENCES public.conversacions(id) ON DELETE CASCADE;

-- Add foreign keys for conversacion_participantes
ALTER TABLE public.conversacion_participantes 
ADD CONSTRAINT conversacion_participantes_conversacion_id_fkey 
FOREIGN KEY (conversacion_id) REFERENCES public.conversacions(id) ON DELETE CASCADE;

ALTER TABLE public.conversacion_participantes 
ADD CONSTRAINT conversacion_participantes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for conversacions
ALTER TABLE public.conversacions 
ADD CONSTRAINT conversacions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign keys for substitucions
ALTER TABLE public.substitucions 
ADD CONSTRAINT substitucions_profesor_ausente_id_fkey 
FOREIGN KEY (profesor_ausente_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.substitucions 
ADD CONSTRAINT substitucions_profesor_asignado_id_fkey 
FOREIGN KEY (profesor_asignado_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.substitucions 
ADD CONSTRAINT substitucions_grupo_id_fkey 
FOREIGN KEY (grupo_id) REFERENCES public.grupos_educativos(id) ON DELETE CASCADE;

ALTER TABLE public.substitucions 
ADD CONSTRAINT substitucions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;