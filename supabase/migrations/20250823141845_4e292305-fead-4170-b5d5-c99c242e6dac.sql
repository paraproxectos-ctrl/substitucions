-- Enable RLS on user_telegram table
ALTER TABLE public.user_telegram ENABLE ROW LEVEL SECURITY;

-- Create policy for user_telegram - users can only see their own data
CREATE POLICY "Users can view their own telegram data" 
ON public.user_telegram 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own telegram data" 
ON public.user_telegram 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their existing telegram data" 
ON public.user_telegram 
FOR UPDATE 
USING (user_id = auth.uid());

-- Enable RLS on telegram_updates_cursor table
ALTER TABLE public.telegram_updates_cursor ENABLE ROW LEVEL SECURITY;

-- Create policy for telegram_updates_cursor - only admins can access
CREATE POLICY "Only admins can access telegram cursor" 
ON public.telegram_updates_cursor 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));