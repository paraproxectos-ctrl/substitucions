-- Corregir la función get_substitution_confirmations para usar confirmada_professor
CREATE OR REPLACE FUNCTION public.get_substitution_confirmations(target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(substitution_id uuid, professor_id uuid, professor_name text, hora_inicio time without time zone, hora_fin time without time zone, grupo_nome text, confirmada boolean, vista boolean)
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
$function$