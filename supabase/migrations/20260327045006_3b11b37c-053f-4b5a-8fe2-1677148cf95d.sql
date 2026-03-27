CREATE TABLE public.plantillas_texto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('generalidades', 'snacks', 'recomendaciones')),
  contenido text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plantillas_texto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own text templates"
  ON public.plantillas_texto FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);