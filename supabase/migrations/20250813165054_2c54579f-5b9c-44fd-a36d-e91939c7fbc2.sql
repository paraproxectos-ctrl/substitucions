-- Primero vamos a eliminar el trigger que causa conflictos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar la función del trigger también
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Ahora crear una función trigger mejorada que no cause conflictos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Solo crear perfil si no existe ya (evitar duplicados)
  INSERT INTO public.profiles (user_id, nome, apelidos, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'apelidos', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING; -- No hacer nada si ya existe
  
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();