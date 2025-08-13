-- Crear enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'profesor');

-- Crear enum para motivos de substitución
CREATE TYPE public.motivo_sustitucion AS ENUM ('ausencia_imprevista', 'enfermidade', 'asuntos_propios', 'outro');

-- Crear tabla de grupos educativos
CREATE TABLE public.grupos_educativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  nivel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar grupos educativos predefinidos
INSERT INTO public.grupos_educativos (nome, nivel) VALUES
  ('Infantil 3 anos', 'infantil'),
  ('Infantil 4 anos', 'infantil'),
  ('Infantil 5 anos', 'infantil'),
  ('1ºA', 'primaria'),
  ('1ºB', 'primaria'),
  ('1ºC', 'primaria'),
  ('2ºA', 'primaria'),
  ('2ºB', 'primaria'),
  ('2ºC', 'primaria'),
  ('3ºA', 'primaria'),
  ('3ºB', 'primaria'),
  ('3ºC', 'primaria'),
  ('4ºA', 'primaria'),
  ('4ºB', 'primaria'),
  ('4ºC', 'primaria'),
  ('5ºA', 'primaria'),
  ('5ºB', 'primaria'),
  ('5ºC', 'primaria'),
  ('6ºA', 'primaria'),
  ('6ºB', 'primaria'),
  ('6ºC', 'primaria');

-- Crear tabla de perfiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  apelidos TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de roles de usuario
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Crear tabla de sustituciones
CREATE TABLE public.substitucions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  grupo_id UUID REFERENCES public.grupos_educativos(id) NOT NULL,
  profesor_asignado_id UUID REFERENCES auth.users(id) NOT NULL,
  motivo motivo_sustitucion NOT NULL,
  motivo_outro TEXT,
  observacions TEXT,
  vista BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de mensajes
CREATE TABLE public.mensaxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remitente_id UUID REFERENCES auth.users(id) NOT NULL,
  destinatario_id UUID REFERENCES auth.users(id),
  asunto TEXT NOT NULL,
  contido TEXT NOT NULL,
  is_grupo BOOLEAN NOT NULL DEFAULT false,
  leido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitucions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensaxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_educativos ENABLE ROW LEVEL SECURITY;

-- Crear función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile and admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile and admins can update all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin')
);

-- Políticas RLS para user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para grupos_educativos
CREATE POLICY "All authenticated users can view grupos"
ON public.grupos_educativos
FOR SELECT
TO authenticated
USING (true);

-- Políticas RLS para substitucions
CREATE POLICY "All authenticated users can view substitutions"
ON public.substitucions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage all substitutions"
ON public.substitucions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professors can update their own substitution status"
ON public.substitucions
FOR UPDATE
TO authenticated
USING (profesor_asignado_id = auth.uid())
WITH CHECK (profesor_asignado_id = auth.uid());

-- Políticas RLS para mensaxes
CREATE POLICY "Users can view their own messages"
ON public.mensaxes
FOR SELECT
TO authenticated
USING (
  remitente_id = auth.uid() OR
  destinatario_id = auth.uid() OR
  is_grupo = true
);

CREATE POLICY "Users can send messages"
ON public.mensaxes
FOR INSERT
TO authenticated
WITH CHECK (remitente_id = auth.uid());

CREATE POLICY "Users can update their own messages"
ON public.mensaxes
FOR UPDATE
TO authenticated
USING (
  remitente_id = auth.uid() OR
  destinatario_id = auth.uid()
);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_substitucions_updated_at
  BEFORE UPDATE ON public.substitucions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, apelidos, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'apelidos', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();