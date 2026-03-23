INSERT INTO storage.buckets (id, name, public) VALUES ('receta-imagenes', 'receta-imagenes', true);

CREATE POLICY "Usuarios autenticados suben imagenes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receta-imagenes');

CREATE POLICY "Imagenes publicas lectura"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'receta-imagenes');

CREATE POLICY "Usuarios eliminan sus imagenes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receta-imagenes');