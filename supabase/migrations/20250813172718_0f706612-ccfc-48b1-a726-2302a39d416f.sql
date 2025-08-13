-- Revisar y actualizar las políticas RLS para mensaxes
-- Primero eliminar las políticas existentes si las hay
DROP POLICY IF EXISTS "Users can view their messages and group messages they participa" ON mensaxes;
DROP POLICY IF EXISTS "Users can send messages" ON mensaxes;
DROP POLICY IF EXISTS "Users can mark their received messages as read" ON mensaxes;

-- Crear nuevas políticas más permisivas para depurar
CREATE POLICY "Anyone can view messages" 
ON mensaxes FOR SELECT 
USING (true);

CREATE POLICY "Anyone can send messages" 
ON mensaxes FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update messages" 
ON mensaxes FOR UPDATE 
USING (true);