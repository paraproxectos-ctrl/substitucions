-- Create trigger function to send email when substitution is created
CREATE OR REPLACE FUNCTION public.notify_substitution_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload json;
BEGIN
  -- Create payload with substitution data
  payload := row_to_json(NEW);
  
  -- Call the edge function to send email
  PERFORM
    net.http_post(
      url := 'https://tgzxldtrniflakoexpew.supabase.co/functions/v1/send-substitution-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('record', payload)
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after insert on substitucions table
DROP TRIGGER IF EXISTS trigger_notify_substitution_assignment ON public.substitucions;

CREATE TRIGGER trigger_notify_substitution_assignment
  AFTER INSERT ON public.substitucions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_substitution_assignment();