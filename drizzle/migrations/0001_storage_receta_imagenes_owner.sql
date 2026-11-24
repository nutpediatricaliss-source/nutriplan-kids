DROP POLICY IF EXISTS "Usuarios eliminan sus imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados suben imagenes" ON storage.objects;
CREATE POLICY "Usuarios autenticados suben imagenes" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receta-imagenes' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Usuarios eliminan sus imagenes" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receta-imagenes' AND (storage.foldername(name))[1] = (select auth.uid()::text));