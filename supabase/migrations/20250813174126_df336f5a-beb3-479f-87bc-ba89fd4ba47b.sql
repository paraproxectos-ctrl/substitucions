-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Anyone can send messages" ON public.mensaxes;
DROP POLICY IF EXISTS "Anyone can update messages" ON public.mensaxes;
DROP POLICY IF EXISTS "Anyone can view messages" ON public.mensaxes;

-- Create secure RLS policies for messages

-- Users can only view messages where they are sender, recipient, or conversation participant
CREATE POLICY "Users can view their own messages" ON public.mensaxes
FOR SELECT USING (
  -- Direct messages: user is sender or recipient
  (NOT is_grupo AND (remitente_id = auth.uid() OR destinatario_id = auth.uid()))
  OR
  -- Group messages: user is a participant in the conversation
  (is_grupo AND conversacion_id IN (
    SELECT conversacion_id 
    FROM public.conversacion_participantes 
    WHERE user_id = auth.uid()
  ))
);

-- Users can only send messages as themselves
CREATE POLICY "Users can send messages as themselves" ON public.mensaxes
FOR INSERT WITH CHECK (
  remitente_id = auth.uid()
  AND
  -- For group messages, user must be participant in conversation
  (NOT is_grupo OR conversacion_id IN (
    SELECT conversacion_id 
    FROM public.conversacion_participantes 
    WHERE user_id = auth.uid()
  ))
);

-- Users can only update messages they are involved in (for marking as read, etc.)
CREATE POLICY "Users can update their messages" ON public.mensaxes
FOR UPDATE USING (
  -- Direct messages: user is sender or recipient
  (NOT is_grupo AND (remitente_id = auth.uid() OR destinatario_id = auth.uid()))
  OR
  -- Group messages: user is a participant in the conversation
  (is_grupo AND conversacion_id IN (
    SELECT conversacion_id 
    FROM public.conversacion_participantes 
    WHERE user_id = auth.uid()
  ))
) WITH CHECK (
  -- Prevent users from changing sender/recipient fields
  remitente_id = OLD.remitente_id 
  AND destinatario_id = OLD.destinatario_id
  AND conversacion_id = OLD.conversacion_id
  AND is_grupo = OLD.is_grupo
);