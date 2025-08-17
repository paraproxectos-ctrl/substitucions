-- Crear campo para marcar sustituciones como confirmadas por el profesor
ALTER TABLE public.substitucions ADD COLUMN IF NOT EXISTS confirmada_professor BOOLEAN DEFAULT false;

-- Función para obtener profesor recomendado usando asignación proporcional
CREATE OR REPLACE FUNCTION public.get_proportional_teacher()
RETURNS TABLE(user_id uuid, nome text, apelidos text, horas_libres_semanais integer, sustitucions_realizadas_semana integer, ratio_disponible numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_week TEXT;
  max_horas INTEGER;
  total_asignadas INTEGER;
BEGIN
  -- Reset counters if needed
  PERFORM reset_weekly_counters();
  
  -- Obtener el máximo de horas libres para calcular proporciones
  SELECT MAX(p.horas_libres_semanais) INTO max_horas
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE ur.role = 'profesor'
    AND p.horas_libres_semanais > 0;
  
  -- Si no hay profesores con horas libres, no retornar nada
  IF max_horas IS NULL OR max_horas = 0 THEN
    RETURN;
  END IF;
  
  -- Calcular total de sustituciones asignadas esta semana
  SELECT COALESCE(SUM(p.sustitucions_realizadas_semana), 0) INTO total_asignadas
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE ur.role = 'profesor';
  
  -- Retornar el profesor que más se aleje de su proporción ideal
  -- La proporción ideal es: (horas_libres / max_horas) * total_asignadas
  RETURN QUERY
  SELECT 
    p.user_id,
    p.nome,
    p.apelidos,
    p.horas_libres_semanais,
    p.sustitucions_realizadas_semana,
    -- Ratio de disponibilidad: diferencia entre lo ideal y lo actual
    CASE 
      WHEN total_asignadas = 0 THEN p.horas_libres_semanais::numeric
      ELSE (p.horas_libres_semanais::numeric / max_horas::numeric * total_asignadas::numeric) - p.sustitucions_realizadas_semana::numeric
    END as ratio_disponible
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE ur.role = 'profesor'
    AND p.horas_libres_semanais > 0
    AND p.sustitucions_realizadas_semana < p.horas_libres_semanais
  ORDER BY 
    -- Prioridad 1: Mayor diferencia con la proporción ideal (más negativo = más alejado)
    ratio_disponible DESC,
    -- Prioridad 2: Más horas libres disponibles
    p.horas_libres_semanais DESC,
    -- Prioridad 3: Menos sustituciones realizadas
    p.sustitucions_realizadas_semana ASC,
    -- Prioridad 4: Orden alfabético
    p.apelidos ASC,
    p.nome ASC
  LIMIT 1;
END;
$function$;

-- Función para obtener estadísticas de confirmación de sustituciones
CREATE OR REPLACE FUNCTION public.get_substitution_confirmations(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  substitution_id uuid,
  professor_id uuid,
  professor_name text,
  hora_inicio time,
  hora_fin time,
  grupo_nome text,
  confirmada boolean,
  vista boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as substitution_id,
    s.profesor_asignado_id as professor_id,
    CONCAT(p.nome, ' ', p.apelidos) as professor_name,
    s.hora_inicio,
    s.hora_fin,
    g.nome as grupo_nome,
    COALESCE(s.confirmada_professor, false) as confirmada,
    s.vista
  FROM public.substitucions s
  LEFT JOIN public.profiles p ON s.profesor_asignado_id = p.user_id
  LEFT JOIN public.grupos_educativos g ON s.grupo_id = g.id
  WHERE s.data = target_date
    AND s.profesor_asignado_id IS NOT NULL
  ORDER BY s.hora_inicio;
END;
$function$;