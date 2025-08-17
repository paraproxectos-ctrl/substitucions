-- Reset all weekly counters to start fresh
UPDATE public.profiles 
SET sustitucions_realizadas_semana = 0
WHERE horas_libres_semanais > 0;