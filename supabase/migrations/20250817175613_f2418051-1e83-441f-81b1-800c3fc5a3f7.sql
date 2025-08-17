-- Remove the problematic trigger and function
DROP TRIGGER IF EXISTS trigger_notify_substitution_assignment ON public.substitucions;
DROP FUNCTION IF EXISTS public.notify_substitution_assignment();