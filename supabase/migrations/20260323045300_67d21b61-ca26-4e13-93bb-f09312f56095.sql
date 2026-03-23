ALTER TABLE public.planes_menu
  ADD COLUMN generalidades text,
  ADD COLUMN snacks_colaciones text,
  ADD COLUMN recomendaciones text,
  ADD COLUMN mensaje_agradecimiento text DEFAULT 'Gracias por confiar en mí para la alimentación de tu pequeño(a). ¡Juntas lograremos grandes cambios!',
  ADD COLUMN estilo_pdf text DEFAULT 'lista';