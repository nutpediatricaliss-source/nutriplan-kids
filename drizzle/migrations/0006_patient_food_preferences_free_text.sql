ALTER TABLE public.pacientes ADD COLUMN alimentos_gustan_texto text, ADD COLUMN alimentos_no_gustan_texto text;
UPDATE public.pacientes SET alimentos_gustan_texto = array_to_string(alimentos_gustan, ', '), alimentos_no_gustan_texto = array_to_string(alimentos_no_gustan, ', ');
COMMENT ON COLUMN public.pacientes.alimentos_gustan IS 'DEPRECATED: replaced by alimentos_gustan_texto';
COMMENT ON COLUMN public.pacientes.alimentos_no_gustan IS 'DEPRECATED: replaced by alimentos_no_gustan_texto';