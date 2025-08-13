-- Fix security vulnerability in mensaxes table RLS policy
-- The current policy allows any authenticated user to read all group messages
-- We need to ensure users can only read group messages if they're participants

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view messages they sent or received or group messages" ON public.mensaxes;

-- Create a new secure policy that checks group membership
CREATE POLICY "Users can view their messages and group messages they participate in" 
ON public.mensaxes 
FOR SELECT 
USING (
  -- Users can see messages they sent
  (remitente_id = auth.uid()) 
  OR 
  -- Users can see direct messages sent to them
  (destinatario_id = auth.uid()) 
  OR 
  -- Users can see group messages ONLY if they are participants in the conversation
  (
    is_grupo = true 
    AND conversacion_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM public.conversacion_participantes cp 
      WHERE cp.conversacion_id = mensaxes.conversacion_id 
      AND cp.user_id = auth.uid()
    )
  )
);