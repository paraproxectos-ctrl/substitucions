-- Create view for complete substitution data with joins
CREATE OR REPLACE VIEW public.vw_substitucions_docente AS
SELECT 
  s.id,
  s.data,
  s.hora_inicio,
  s.hora_fin,
  s.motivo,
  s.motivo_outro,
  s.grupo_id,
  g.nome as grupo_nome,
  s.profesor_ausente_id as titular_id,
  CASE 
    WHEN p_titular.nome IS NOT NULL THEN CONCAT(p_titular.nome, ' ', p_titular.apelidos)
    ELSE NULL
  END as titular_nome,
  s.profesor_asignado_id as assigned_to,
  CASE 
    WHEN p_substituto.nome IS NOT NULL THEN CONCAT(p_substituto.nome, ' ', p_substituto.apelidos)
    ELSE NULL
  END as substituto_nome,
  s.sesion,
  s.guardia_transporte,
  s.observacions,
  s.vista,
  s.confirmada_professor
FROM public.substitucions s
LEFT JOIN public.grupos_educativos g ON s.grupo_id = g.id
LEFT JOIN public.profiles p_titular ON s.profesor_ausente_id = p_titular.user_id
LEFT JOIN public.profiles p_substituto ON s.profesor_asignado_id = p_substituto.user_id;

-- Create RPC function to get teacher's substitutions for a specific day
CREATE OR REPLACE FUNCTION public.get_substitucions_docente(p_user uuid, p_day date)
RETURNS TABLE (
  id uuid,
  data date,
  hora_inicio time,
  hora_fin time,
  motivo motivo_sustitucion,
  motivo_outro text,
  grupo_id uuid,
  grupo_nome text,
  titular_id uuid,
  titular_nome text,
  assigned_to uuid,
  substituto_nome text,
  sesion sesion_tipo,
  guardia_transporte guardia_transporte_tipo,
  observacions text,
  vista boolean,
  confirmada_professor boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id,
    v.data,
    v.hora_inicio,
    v.hora_fin,
    v.motivo,
    v.motivo_outro,
    v.grupo_id,
    v.grupo_nome,
    v.titular_id,
    v.titular_nome,
    v.assigned_to,
    v.substituto_nome,
    v.sesion,
    v.guardia_transporte,
    v.observacions,
    v.vista,
    v.confirmada_professor
  FROM public.vw_substitucions_docente v
  WHERE v.assigned_to = p_user 
    AND v.data = p_day
  ORDER BY v.hora_inicio;
$$;

-- Grant permissions on the view
GRANT SELECT ON public.vw_substitucions_docente TO authenticated;

-- RLS policy for the view (teachers can see their own substitutions)
CREATE POLICY "Teachers can view their own substitutions in view"
ON public.vw_substitucions_docente
FOR SELECT
USING (assigned_to = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));