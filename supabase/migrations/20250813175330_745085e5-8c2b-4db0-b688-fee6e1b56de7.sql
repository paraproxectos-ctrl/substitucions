-- Remove the overly permissive policy that exposes all profiles
DROP POLICY IF EXISTS "Users can view other profiles for messaging" ON public.profiles;

-- Create a secure view for messaging that only shows necessary info for teachers/admins
CREATE VIEW public.messaging_contacts AS
SELECT 
  p.user_id,
  p.nome,
  p.apelidos
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role IN ('profesor', 'admin');

-- Enable RLS on the view
ALTER VIEW public.messaging_contacts OWNER TO postgres;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.messaging_contacts TO authenticated;

-- Create RLS policy for the view that allows teachers/admins to see other teachers/admins
CREATE POLICY "Teachers and admins can view messaging contacts" 
ON public.messaging_contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('profesor', 'admin')
  )
);