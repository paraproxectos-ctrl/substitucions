-- Add weekly hours tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN horas_libres_semanais INTEGER NOT NULL DEFAULT 0,
ADD COLUMN sustitucions_realizadas_semana INTEGER NOT NULL DEFAULT 0,
ADD COLUMN ultima_semana_reset TEXT;

-- Create index for efficient teacher recommendation queries
CREATE INDEX idx_profiles_recommendation 
ON public.profiles (horas_libres_semanais DESC, sustitucions_realizadas_semana ASC);

-- Function to get current ISO week
CREATE OR REPLACE FUNCTION public.get_current_iso_week()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT TO_CHAR(NOW(), 'IYYY-"W"IW');
$$;

-- Function to reset weekly substitution counters
CREATE OR REPLACE FUNCTION public.reset_weekly_counters()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_week TEXT;
BEGIN
  current_week := get_current_iso_week();
  
  UPDATE public.profiles 
  SET 
    sustitucions_realizadas_semana = 0,
    ultima_semana_reset = current_week
  WHERE ultima_semana_reset IS NULL 
     OR ultima_semana_reset != current_week;
END;
$$;

-- Function to get recommended teacher for substitution
CREATE OR REPLACE FUNCTION public.get_recommended_teacher()
RETURNS TABLE(
  user_id UUID,
  nome TEXT,
  apelidos TEXT,
  horas_libres_semanais INTEGER,
  sustitucions_realizadas_semana INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_week TEXT;
BEGIN
  -- Reset counters if needed
  PERFORM reset_weekly_counters();
  
  -- Return the recommended teacher based on algorithm
  RETURN QUERY
  SELECT 
    p.user_id,
    p.nome,
    p.apelidos,
    p.horas_libres_semanais,
    p.sustitucions_realizadas_semana
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE ur.role = 'profesor'
    AND p.sustitucions_realizadas_semana < p.horas_libres_semanais
  ORDER BY 
    p.horas_libres_semanais DESC,
    p.sustitucions_realizadas_semana ASC,
    p.apelidos ASC,
    p.nome ASC
  LIMIT 1;
END;
$$;

-- Function to increment teacher substitution counter
CREATE OR REPLACE FUNCTION public.increment_teacher_substitution(teacher_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset counters if needed
  PERFORM reset_weekly_counters();
  
  -- Increment the counter for the specific teacher
  UPDATE public.profiles 
  SET sustitucions_realizadas_semana = sustitucions_realizadas_semana + 1
  WHERE user_id = teacher_id;
END;
$$;