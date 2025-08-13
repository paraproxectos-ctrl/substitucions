-- Update profiles RLS policy to allow viewing other profiles for messaging
-- Keep existing policies and add a new one for messaging
CREATE POLICY "Users can view other profiles for messaging" 
ON public.profiles 
FOR SELECT 
USING (true);