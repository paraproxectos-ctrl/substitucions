-- Crear función para ejecutar SQL desde edge functions (solo para administradores)
CREATE OR REPLACE FUNCTION public.execute_admin_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can execute this function';
  END IF;
  
  -- Ejecutar la consulta
  EXECUTE sql_query;
END;
$$;