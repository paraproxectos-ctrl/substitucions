-- Remove the overly permissive policy that exposes all user data
DROP POLICY IF EXISTS "Users can view other profiles for messaging" ON public.profiles;

-- Keep the existing policy for users viewing their own profile and admins viewing all
-- This policy already exists and is secure: "Users can view their own profile and admins can view all"

-- The remaining policies are:
-- 1. "Users can view their own profile and admins can view all" (secure - users see only their own data, admins see all)
-- 2. "Admins can insert profiles" (secure - only admins can create profiles)  
-- 3. "Users can update their own profile and admins can update all" (secure - users update only their own data)

-- This ensures that:
-- - Regular users can only see their own profile data
-- - Admins can see all profiles (needed for teacher management)
-- - No unauthorized access to personal information