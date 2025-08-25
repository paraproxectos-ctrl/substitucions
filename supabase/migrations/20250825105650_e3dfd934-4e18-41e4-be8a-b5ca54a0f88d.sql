-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to delete expired files (5 days after substitution date)
CREATE OR REPLACE FUNCTION public.delete_expired_arquivos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_file RECORD;
  file_count INTEGER := 0;
BEGIN
  -- Find files that have expired (date + 5 days < current date)
  FOR expired_file IN 
    SELECT id, storage_path, original_filename, date
    FROM public.arquivos_calendario 
    WHERE date + INTERVAL '5 days' < CURRENT_DATE
  LOOP
    BEGIN
      -- Delete from storage
      DELETE FROM storage.objects 
      WHERE bucket_id = 'arquivos-substitucions' 
      AND name = expired_file.storage_path;
      
      -- Delete from database
      DELETE FROM public.arquivos_calendario 
      WHERE id = expired_file.id;
      
      -- Log the deletion in audit log
      INSERT INTO public.arquivos_audit_log (action, by_uid, owner_uid, file_id)
      VALUES (
        'AUTO_DELETE_EXPIRED', 
        '00000000-0000-0000-0000-000000000000'::uuid, -- System user
        (SELECT owner_uid FROM public.arquivos_calendario WHERE id = expired_file.id LIMIT 1),
        expired_file.id
      );
      
      file_count := file_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other files
      RAISE NOTICE 'Error deleting expired file %: %', expired_file.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Deleted % expired files', file_count;
END;
$$;

-- Schedule the cleanup to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-expired-arquivos',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT public.delete_expired_arquivos();
  $$
);