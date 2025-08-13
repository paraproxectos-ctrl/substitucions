-- Crear usuario administrador con credenciais fixas
-- Esto se debe hacer mediante la consola de Supabase Auth, pero crearemos el perfil y rol
-- El administrador debe ser creado manualmente en Auth con email: admin@vallinclan.edu.es

-- Insertar perfil del administrador (se ejecutará cuando se cree el usuario)
-- La función handle_new_user ya está configurada para crear perfiles automáticamente

-- Función para crear administrador programáticamente (ejecutar una vez)
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Buscar si ya existe un usuario admin
    SELECT auth.uid() INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@vallinclan.edu.es' 
    LIMIT 1;
    
    -- Si no existe, crear perfil para cuando se cree
    IF admin_user_id IS NULL THEN
        -- Esto se manejará cuando se cree el usuario en Auth
        RAISE NOTICE 'Admin user should be created in Supabase Auth dashboard';
    ELSE
        -- Si existe, asegurar que tiene perfil y rol de admin
        INSERT INTO public.profiles (user_id, nome, apelidos, email)
        VALUES (admin_user_id, 'Administrador', 'Sistema', 'admin@vallinclan.edu.es')
        ON CONFLICT (user_id) DO NOTHING;
        
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END;
$$;

-- Habilitar realtime para mensajes
ALTER TABLE public.mensaxes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensaxes;

-- Mejorar las políticas de mensajería para chats privados y grupales
DROP POLICY IF EXISTS "Users can view their own messages" ON public.mensaxes;
DROP POLICY IF EXISTS "Users can send messages" ON public.mensaxes;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.mensaxes;

-- Nuevas políticas para mensajería
CREATE POLICY "Users can view messages they sent or received or group messages"
ON public.mensaxes
FOR SELECT
TO authenticated
USING (
  remitente_id = auth.uid() OR
  destinatario_id = auth.uid() OR
  is_grupo = true
);

CREATE POLICY "Users can send messages"
ON public.mensaxes
FOR INSERT
TO authenticated
WITH CHECK (remitente_id = auth.uid());

CREATE POLICY "Users can mark their received messages as read"
ON public.mensaxes
FOR UPDATE
TO authenticated
USING (destinatario_id = auth.uid())
WITH CHECK (destinatario_id = auth.uid());

-- Agregar índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_mensaxes_remitente_id ON public.mensaxes(remitente_id);
CREATE INDEX IF NOT EXISTS idx_mensaxes_destinatario_id ON public.mensaxes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensaxes_is_grupo ON public.mensaxes(is_grupo);
CREATE INDEX IF NOT EXISTS idx_mensaxes_created_at ON public.mensaxes(created_at DESC);

-- Crear tabla para conversaciones (para agrupar mensajes)
CREATE TABLE public.conversacions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT,
  is_grupo BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para participantes de conversaciones
CREATE TABLE public.conversacion_participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversacion_id UUID REFERENCES public.conversacions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversacion_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.conversacions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversacion_participantes ENABLE ROW LEVEL SECURITY;

-- Políticas para conversaciones
CREATE POLICY "Users can view conversations they participate in"
ON public.conversacions
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT conversacion_id 
    FROM public.conversacion_participantes 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversacions
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Políticas para participantes
CREATE POLICY "Users can view participants of their conversations"
ON public.conversacion_participantes
FOR SELECT
TO authenticated
USING (
  conversacion_id IN (
    SELECT conversacion_id 
    FROM public.conversacion_participantes 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants to conversations they created"
ON public.conversacion_participantes
FOR INSERT
TO authenticated
WITH CHECK (
  conversacion_id IN (
    SELECT id 
    FROM public.conversacions 
    WHERE created_by = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Modificar tabla mensaxes para incluir conversacion_id
ALTER TABLE public.mensaxes ADD COLUMN conversacion_id UUID REFERENCES public.conversacions(id);

-- Crear índice para conversacion_id
CREATE INDEX IF NOT EXISTS idx_mensaxes_conversacion_id ON public.mensaxes(conversacion_id);

-- Trigger para actualizar updated_at en conversaciones
CREATE TRIGGER update_conversacions_updated_at
  BEFORE UPDATE ON public.conversacions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();