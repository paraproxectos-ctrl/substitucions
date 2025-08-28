-- Limpiar políticas existentes conflictivas en substitucions
DROP POLICY IF EXISTS "substitucions_select_auth" ON public.substitucions;
DROP POLICY IF EXISTS "substitucions_update_auth_own" ON public.substitucions;
DROP POLICY IF EXISTS "substitucions_insert_auth" ON public.substitucions;

-- Crear políticas más estrictas para substitucions
CREATE POLICY "Active users with role can view substitutions" 
ON public.substitucions 
FOR SELECT 
USING (
  is_current_user_active() AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'profesor'::app_role))
);

CREATE POLICY "Professors can update their own substitutions" 
ON public.substitucions 
FOR UPDATE 
USING (
  is_current_user_active() AND
  profesor_asignado_id = auth.uid() AND
  has_role(auth.uid(), 'profesor'::app_role)
)
WITH CHECK (
  is_current_user_active() AND
  profesor_asignado_id = auth.uid() AND
  has_role(auth.uid(), 'profesor'::app_role)
);