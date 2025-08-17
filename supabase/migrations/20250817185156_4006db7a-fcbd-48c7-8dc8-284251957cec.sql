-- Reset weekly counters manually first
UPDATE public.profiles 
SET 
  sustitucions_realizadas_semana = 0,
  ultima_semana_reset = to_char(now(), 'YYYY-"W"WW')
WHERE ultima_semana_reset IS NULL 
   OR ultima_semana_reset != to_char(now(), 'YYYY-"W"WW');

-- Update the get_proportional_teacher function to be more flexible
DROP FUNCTION IF EXISTS get_proportional_teacher();

CREATE OR REPLACE FUNCTION get_proportional_teacher()
RETURNS uuid AS $$
DECLARE
  teacher_id uuid;
  current_week text;
BEGIN
  current_week := to_char(now(), 'YYYY-"W"WW');
  
  -- Select teacher based on proportional assignment
  -- Always consider teachers with available hours, regardless of weekly limits
  SELECT p.user_id INTO teacher_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE p.horas_libres_semanais > 0
    AND ur.role = 'profesor'
  ORDER BY 
    -- Priority: ratio of completed to ideal assignments (lower is better)
    CASE 
      WHEN p.ultima_semana_reset IS NULL OR p.ultima_semana_reset != current_week THEN 0
      ELSE p.sustitucions_realizadas_semana::float / GREATEST(p.horas_libres_semanais, 1)
    END,
    -- Then by available hours (higher is better)
    p.horas_libres_semanais DESC,
    -- Finally by current assignments (lower is better)
    p.sustitucions_realizadas_semana ASC,
    -- Tie breaker by name
    p.apelidos ASC,
    p.nome ASC
  LIMIT 1;
  
  RETURN teacher_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;