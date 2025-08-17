-- Fix the get_proportional_teacher function to avoid updating in read-only context
DROP FUNCTION IF EXISTS get_proportional_teacher();
DROP FUNCTION IF EXISTS reset_weekly_counters();

-- Create a function that resets weekly counters (will be called separately)
CREATE OR REPLACE FUNCTION reset_weekly_counters()
RETURNS void AS $$
DECLARE
  current_week text;
BEGIN
  current_week := to_char(now(), 'YYYY-"W"WW');
  
  UPDATE public.profiles 
  SET 
    sustitucions_realizadas_semana = 0,
    ultima_semana_reset = current_week
  WHERE ultima_semana_reset IS NULL 
     OR ultima_semana_reset != current_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the get_proportional_teacher function without updates
CREATE OR REPLACE FUNCTION get_proportional_teacher()
RETURNS uuid AS $$
DECLARE
  teacher_id uuid;
  current_week text;
BEGIN
  current_week := to_char(now(), 'YYYY-"W"WW');
  
  -- Select teacher based on proportional assignment
  SELECT p.user_id INTO teacher_id
  FROM public.profiles p
  WHERE p.horas_libres_semanais > 0
    AND (p.ultima_semana_reset IS NULL OR p.ultima_semana_reset != current_week OR p.sustitucions_realizadas_semana < p.horas_libres_semanais)
  ORDER BY 
    -- Priority: ratio of completed to ideal assignments (lower is better)
    CASE 
      WHEN p.ultima_semana_reset IS NULL OR p.ultima_semana_reset != current_week THEN 0
      ELSE p.sustitucions_realizadas_semana::float / GREATEST(p.horas_libres_semanais, 1)
    END,
    -- Then by available hours (higher is better)
    p.horas_libres_semanais DESC,
    -- Finally by current assignments (lower is better)
    p.sustitucions_realizadas_semana ASC
  LIMIT 1;
  
  RETURN teacher_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;