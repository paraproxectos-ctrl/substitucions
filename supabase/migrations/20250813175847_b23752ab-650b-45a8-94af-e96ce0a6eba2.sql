-- Add missing foreign keys for the messaging system

-- Add foreign keys for mensaxes table (if they don't exist)
DO $$ 
BEGIN
    -- Add remitente_id foreign key if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'mensaxes_remitente_id_fkey') THEN
        ALTER TABLE public.mensaxes 
        ADD CONSTRAINT mensaxes_remitente_id_fkey 
        FOREIGN KEY (remitente_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add destinatario_id foreign key if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'mensaxes_destinatario_id_fkey') THEN
        ALTER TABLE public.mensaxes 
        ADD CONSTRAINT mensaxes_destinatario_id_fkey 
        FOREIGN KEY (destinatario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add profiles foreign key if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'profiles_user_id_fkey') THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;