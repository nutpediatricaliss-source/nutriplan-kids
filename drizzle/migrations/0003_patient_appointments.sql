CREATE TABLE public.citas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
 fecha date NOT NULL,
 hora time,
 duracion_min integer NOT NULL DEFAULT 45 CHECK (duracion_min > 0),
 tipo text NOT NULL DEFAULT 'seguimiento' CHECK (tipo IN ('consulta_inicial','seguimiento','control','otra')),
 lugar text,
 nota text,
 estado text NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada','realizada','cancelada','no_asistio')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.citas TO authenticated;
GRANT ALL ON public.citas TO service_role;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven sus citas" ON public.citas FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Usuarios crean sus citas" ON public.citas FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()) AND paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = (select auth.uid())));
CREATE POLICY "Usuarios actualizan sus citas" ON public.citas FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()) AND paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = (select auth.uid())));
CREATE POLICY "Usuarios eliminan sus citas" ON public.citas FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
CREATE INDEX citas_user_fecha_idx ON public.citas (user_id, fecha, hora);
CREATE INDEX citas_paciente_fecha_idx ON public.citas (paciente_id, fecha, hora);
CREATE TRIGGER citas_updated_at BEFORE UPDATE ON public.citas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE FUNCTION public.complete_patient_appointments() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 UPDATE public.citas SET estado = 'realizada' WHERE paciente_id = NEW.paciente_id AND fecha = NEW.fecha AND estado = 'programada' AND user_id = (select auth.uid());
 RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.complete_patient_appointments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_patient_appointments() TO authenticated, service_role;
CREATE TRIGGER consultas_complete_appointments AFTER INSERT OR UPDATE ON public.consultas FOR EACH ROW EXECUTE FUNCTION public.complete_patient_appointments();