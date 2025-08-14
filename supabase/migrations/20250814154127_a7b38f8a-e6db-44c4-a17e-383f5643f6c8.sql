-- Crear enum para las sesiones
CREATE TYPE public.sesion_tipo AS ENUM (
  'primeira',
  'segunda', 
  'terceira',
  'cuarta',
  'quinta',
  'recreo',
  'hora_lectura'
);

-- Crear enum para guardia de transporte
CREATE TYPE public.guardia_transporte_tipo AS ENUM (
  'entrada',
  'saida',
  'ningun'
);

-- Añadir los nuevos campos a la tabla substitucions
ALTER TABLE public.substitucions 
ADD COLUMN sesion sesion_tipo,
ADD COLUMN guardia_transporte guardia_transporte_tipo DEFAULT 'ningun';