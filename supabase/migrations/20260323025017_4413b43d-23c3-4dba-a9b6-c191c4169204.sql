
-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabla de alimentos SMAE
CREATE TABLE public.alimentos_smae (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  grupo TEXT NOT NULL,
  porcion TEXT,
  calorias NUMERIC DEFAULT 0,
  proteinas NUMERIC DEFAULT 0,
  grasas NUMERIC DEFAULT 0,
  carbohidratos NUMERIC DEFAULT 0,
  fibra NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alimentos_smae ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alimentos visibles para todos los autenticados"
  ON public.alimentos_smae FOR SELECT TO authenticated USING (true);

CREATE POLICY "Alimentos insertables por autenticados"
  ON public.alimentos_smae FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Alimentos actualizables por autenticados"
  ON public.alimentos_smae FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Alimentos eliminables por autenticados"
  ON public.alimentos_smae FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_alimentos_smae_updated_at
  BEFORE UPDATE ON public.alimentos_smae
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de recetas
CREATE TABLE public.recetas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  ingredientes TEXT,
  preparacion TEXT,
  imagen_url TEXT,
  nota_predeterminada TEXT DEFAULT '',
  incluir_detalle_pdf BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus recetas"
  ON public.recetas FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuarios crean sus recetas"
  ON public.recetas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus recetas"
  ON public.recetas FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus recetas"
  ON public.recetas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_recetas_updated_at
  BEFORE UPDATE ON public.recetas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de planes de menú
CREATE TABLE public.planes_menu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre_paciente TEXT NOT NULL,
  dias INTEGER NOT NULL DEFAULT 14 CHECK (dias >= 14 AND dias <= 30),
  tiempos_comida JSONB NOT NULL DEFAULT '["Desayuno","Colación AM","Comida","Colación PM","Cena"]'::jsonb,
  pautas_extra TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planes_menu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus planes"
  ON public.planes_menu FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuarios crean sus planes"
  ON public.planes_menu FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus planes"
  ON public.planes_menu FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus planes"
  ON public.planes_menu FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_planes_menu_updated_at
  BEFORE UPDATE ON public.planes_menu
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de items del plan
CREATE TABLE public.plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.planes_menu(id) ON DELETE CASCADE NOT NULL,
  dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 30),
  tiempo_comida TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('alimento', 'receta')),
  item_id UUID NOT NULL,
  nota_menu TEXT DEFAULT '',
  porcion TEXT DEFAULT '',
  incluir_detalle_pdf BOOLEAN DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven items de sus planes"
  ON public.plan_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.planes_menu WHERE id = plan_items.plan_id AND user_id = auth.uid()));

CREATE POLICY "Usuarios crean items en sus planes"
  ON public.plan_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.planes_menu WHERE id = plan_items.plan_id AND user_id = auth.uid()));

CREATE POLICY "Usuarios actualizan items de sus planes"
  ON public.plan_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.planes_menu WHERE id = plan_items.plan_id AND user_id = auth.uid()));

CREATE POLICY "Usuarios eliminan items de sus planes"
  ON public.plan_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.planes_menu WHERE id = plan_items.plan_id AND user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_alimentos_grupo ON public.alimentos_smae(grupo);
CREATE INDEX idx_alimentos_nombre ON public.alimentos_smae USING gin(to_tsvector('spanish', nombre));
CREATE INDEX idx_recetas_user ON public.recetas(user_id);
CREATE INDEX idx_planes_user ON public.planes_menu(user_id);
CREATE INDEX idx_plan_items_plan ON public.plan_items(plan_id);
CREATE INDEX idx_plan_items_plan_dia ON public.plan_items(plan_id, dia);
