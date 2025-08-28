-- Fix RLS not enabled on tables with policies
-- Enable RLS on all tables that should have it
ALTER TABLE public.arquivos_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos_calendario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversacion_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversacions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_educativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensaxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitucions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_updates_cursor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_telegram ENABLE ROW LEVEL SECURITY;

-- Fix function security issues by setting search_path
-- Update all functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_current_iso_week()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT TO_CHAR(NOW(), 'IYYY-"W"IW');
$$;

CREATE OR REPLACE FUNCTION public.get_recommended_teacher()
RETURNS TABLE(user_id uuid, nome text, apelidos text, horas_libres_semanais integer, sustitucions_realizadas_semana integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week TEXT;
BEGIN
  -- Reset counters if needed
  PERFORM reset_weekly_counters();
  
  -- Return the recommended teacher based on algorithm
  RETURN QUERY
  SELECT 
    p.user_id,
    p.nome,
    p.apelidos,
    p.horas_libres_semanais,
    p.sustitucions_realizadas_semana
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE ur.role = 'profesor'
    AND p.sustitucions_realizadas_semana < p.horas_libres_semanais
  ORDER BY 
    p.horas_libres_semanais DESC,
    p.sustitucions_realizadas_semana ASC,
    p.apelidos ASC,
    p.nome ASC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_teacher_substitution(teacher_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset counters if needed
  PERFORM reset_weekly_counters();
  
  -- Increment the counter for the specific teacher
  UPDATE public.profiles 
  SET sustitucions_realizadas_semana = sustitucions_realizadas_semana + 1
  WHERE user_id = teacher_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_push_to_user(p_user_id uuid, p_title text, p_msg text, p_url text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_app text;
  v_key text;
begin
  select decrypted_secret into v_app from vault.decrypted_secrets where name='ONESIGNAL_APP_ID';
  select decrypted_secret into v_key from vault.decrypted_secrets where name='ONESIGNAL_API_KEY';

  perform net.http_post(
    'https://api.onesignal.com/notifications',
    jsonb_build_object(
      'Authorization', 'Basic '||v_key,
      'Content-Type',  'application/json'
    ),
    jsonb_build_object(
      'app_id', v_app,
      'include_external_user_ids', jsonb_build_array(p_user_id::text),
      'headings', jsonb_build_object('en', coalesce(p_title,'Nova substitución')),
      'contents', jsonb_build_object('en', p_msg),
      'url', p_url
    )
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.reset_weekly_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week text;
BEGIN
  current_week := to_char(now(), 'YYYY-"W"WW');
  
  UPDATE public.profiles 
  SET 
    sustitucions_realizadas_semana = 0,
    ultima_semana_reset = current_week
  WHERE ultima_semana_reset IS NULL 
     OR ultima_semana_reset != current_week;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
declare
  has_user_roles boolean;
  has_profiles   boolean;
  is_admin_flag  boolean := false;
begin
  -- ¿Existe public.user_roles?
  select exists (
    select 1
    from pg_catalog.pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'user_roles'
  ) into has_user_roles;

  -- ¿Existe public.profiles?
  select exists (
    select 1
    from pg_catalog.pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
  ) into has_profiles;

  -- Si hay user_roles: user_id + role='admin'
  if has_user_roles then
    select exists (
      select 1
      from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'admin'
    ) into is_admin_flag;
    if is_admin_flag then
      return true;
    end if;
  end if;

  -- Si hay profiles: id + role='admin'
  if has_profiles then
    select exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    ) into is_admin_flag;
    if is_admin_flag then
      return true;
    end if;
  end if;

  return false;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_proportional_teacher()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_id uuid;
  current_week text;
BEGIN
  current_week := to_char(now(), 'YYYY-"W"WW');
  
  SELECT p.user_id INTO teacher_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
  WHERE p.horas_libres_semanais > 0
    AND ur.role = 'profesor'
  ORDER BY 
    CASE 
      WHEN p.ultima_semana_reset IS NULL OR p.ultima_semana_reset != current_week THEN 0
      ELSE p.sustitucions_realizadas_semana::float / GREATEST(p.horas_libres_semanais, 1)
    END,
    p.horas_libres_semanais DESC,
    p.sustitucions_realizadas_semana ASC,
    p.apelidos ASC,
    p.nome ASC
  LIMIT 1;
  
  RETURN teacher_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_substitucions_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_title text;
  v_msg   text;
  v_url   text;
begin
  if (tg_op='INSERT' and new.profesor_asignado_id is not null)
     or (tg_op='UPDATE' and new.profesor_asignado_id is distinct from old.profesor_asignado_id
         and new.profesor_asignado_id is not null)
  then
    v_title := 'Nova substitución asignada';

    v_msg := '';
    if new.data is not null then
      v_msg := 'Día '||to_char(new.data,'YYYY-MM-DD');
    end if;
    if new.hora_inicio is not null and new.hora_fin is not null then
      v_msg := trim(both ' ' from v_msg || case when v_msg<>'' then ' · ' else '' end
                    || new.hora_inicio::text || '–' || new.hora_fin::text);
    end if;
    if v_msg = '' then
      v_msg := 'Revisa a túa substitución';
    end if;

    v_url := 'https://tu-xx.app/substitucion/'|| new.id::text;

    perform public.send_push_to_user(new.profesor_asignado_id, v_title, v_msg, v_url);
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.delete_expired_arquivos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_file RECORD;
  file_count INTEGER := 0;
BEGIN
  FOR expired_file IN 
    SELECT id, storage_path, original_filename, date
    FROM public.arquivos_calendario 
    WHERE date + INTERVAL '5 days' < CURRENT_DATE
  LOOP
    BEGIN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'arquivos-substitucions' 
      AND name = expired_file.storage_path;
      
      DELETE FROM public.arquivos_calendario 
      WHERE id = expired_file.id;
      
      INSERT INTO public.arquivos_audit_log (action, by_uid, owner_uid, file_id)
      VALUES (
        'AUTO_DELETE_EXPIRED', 
        '00000000-0000-0000-0000-000000000000'::uuid,
        (SELECT owner_uid FROM public.arquivos_calendario WHERE id = expired_file.id LIMIT 1),
        expired_file.id
      );
      
      file_count := file_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error deleting expired file %: %', expired_file.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Deleted % expired files', file_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_substitution_confirmations(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(substitution_id uuid, professor_id uuid, professor_name text, hora_inicio time without time zone, hora_fin time without time zone, grupo_nome text, confirmada boolean, vista boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as substitution_id,
    s.profesor_asignado_id as professor_id,
    CONCAT(p.nome, ' ', p.apelidos) as professor_name,
    s.hora_inicio,
    s.hora_fin,
    g.nome as grupo_nome,
    COALESCE(s.confirmada_professor, false) as confirmada,
    s.vista
  FROM public.substitucions s
  LEFT JOIN public.profiles p ON s.profesor_asignado_id = p.user_id
  LEFT JOIN public.grupos_educativos g ON s.grupo_id = g.id
  WHERE s.data = target_date
    AND s.profesor_asignado_id IS NOT NULL
  ORDER BY s.hora_inicio;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_substitucions_notify_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_msg text;
begin
  if (tg_op = 'INSERT' and new.profesor_asignado_id is not null)
     or (tg_op = 'UPDATE'
         and (old.profesor_asignado_id is distinct from new.profesor_asignado_id)
         and new.profesor_asignado_id is not null)
  then
    v_msg := coalesce('Nova substitución asignada o día '||to_char(new.data,'YYYY-MM-DD'),
                      'Nova substitución asignada');

    if new.hora_inicio is not null and new.hora_fin is not null then
      v_msg := v_msg || E'\nHorario: '|| new.hora_inicio || ' - ' || new.hora_fin;
    end if;

    v_msg := v_msg || E'\nID: ' || new.id::text;

    perform public.telegram_send_to_user(new.profesor_asignado_id, v_msg);
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.telegram_send_to_user(p_user_id uuid, p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_token text;
  v_chat  text;
begin
  select chat_id into v_chat
  from public.user_telegram
  where user_id = p_user_id;

  if v_chat is null then
    return;
  end if;

  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'TELEGRAM_BOT_TOKEN';

  perform net.http_post(
    'https://api.telegram.org/bot' || v_token || '/sendMessage',
    jsonb_build_object('Content-Type','application/json'),
    jsonb_build_object('chat_id', v_chat, 'text', p_text)
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.telegram_sync_updates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_token   text;
  resp      record;
  v_json    jsonb;
  v_update  jsonb;
  v_res     jsonb;
  v_offset  bigint := 0;
  v_max_id  bigint := 0;
  v_email   text;
  v_chat    text;
  v_user    uuid;
  v_usernm  text;
  v_count   int := 0;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets where name = 'TELEGRAM_BOT_TOKEN';

  select last_update_id into v_offset
  from public.telegram_updates_cursor where id = 1;

  select * into resp
  from net.http_get(
    'https://api.telegram.org/bot' || v_token ||
    '/getUpdates?offset=' || (v_offset + 1)::text,
    jsonb_build_object('Content-Type','application/json')
  );

  if resp.status < 200 or resp.status >= 300 then
    raise exception 'Telegram getUpdates failed (HTTP %): %', resp.status, resp.body;
  end if;

  v_json := resp.body::jsonb;

  for v_update in
    select * from jsonb_array_elements(coalesce(v_json->'result','[]'::jsonb))
  loop
    v_max_id := greatest(v_max_id, (v_update->>'update_id')::bigint);
    v_res := coalesce(v_update->'message', v_update->'channel_post');
    if v_res is null then
      continue;
    end if;

    v_chat   := (v_res->'chat'->>'id');
    v_usernm := coalesce(v_res->'from'->>'username', v_res->'chat'->>'username');
    v_email  := null;

    if (v_res->>'text') is not null and left(v_res->>'text',6) = '/link ' then
      v_email := trim(substring(v_res->>'text' from 7));
    end if;

    if v_email is not null then
      select id into v_user
      from auth.users
      where lower(email) = lower(v_email);

      if v_user is not null then
        insert into public.user_telegram(user_id, chat_id, username)
        values (v_user, v_chat, v_usernm)
        on conflict (user_id) do update
          set chat_id  = excluded.chat_id,
              username = excluded.username,
              linked_at = now();
        v_count := v_count + 1;
      end if;
    end if;
  end loop;

  if v_max_id > 0 then
    update public.telegram_updates_cursor
    set last_update_id = v_max_id
    where id = 1;
  end if;

  return v_count;
end;
$$;