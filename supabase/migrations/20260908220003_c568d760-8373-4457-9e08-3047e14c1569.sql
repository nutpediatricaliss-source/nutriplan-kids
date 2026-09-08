CREATE TABLE public.pacientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  fecha_nacimiento date NOT NULL,
  sexo text NOT NULL DEFAULT 'M',
  diagnostico text,
  notas_generales text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes TO authenticated;
GRANT ALL ON public.pacientes TO service_role;

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus pacientes" ON public.pacientes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus pacientes" ON public.pacientes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios actualizan sus pacientes" ON public.pacientes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuarios eliminan sus pacientes" ON public.pacientes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.consultas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  peso numeric,
  talla numeric,
  perimetro_cefalico numeric,
  motivo_consulta text,
  notas text,
  formula_ree text,
  factor_actividad numeric,
  ree_kcal numeric,
  macros_porcentaje jsonb DEFAULT '{"proteina": 15, "grasa": 30, "carbohidrato": 55}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultas TO authenticated;
GRANT ALL ON public.consultas TO service_role;

ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven consultas de sus pacientes" ON public.consultas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = consultas.paciente_id AND p.user_id = auth.uid()));
CREATE POLICY "Usuarios crean consultas de sus pacientes" ON public.consultas FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = consultas.paciente_id AND p.user_id = auth.uid()));
CREATE POLICY "Usuarios actualizan consultas de sus pacientes" ON public.consultas FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = consultas.paciente_id AND p.user_id = auth.uid()));
CREATE POLICY "Usuarios eliminan consultas de sus pacientes" ON public.consultas FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = consultas.paciente_id AND p.user_id = auth.uid()));

CREATE INDEX idx_consultas_paciente_fecha ON public.consultas (paciente_id, fecha DESC);

ALTER TABLE public.planes_menu ADD COLUMN paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL;