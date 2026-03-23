
-- Fix overly permissive policies on alimentos_smae
-- Add user_id to track who added the food item
ALTER TABLE public.alimentos_smae ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop old permissive policies
DROP POLICY "Alimentos insertables por autenticados" ON public.alimentos_smae;
DROP POLICY "Alimentos actualizables por autenticados" ON public.alimentos_smae;
DROP POLICY "Alimentos eliminables por autenticados" ON public.alimentos_smae;

-- Create user-scoped policies for write operations
CREATE POLICY "Usuarios insertan alimentos"
  ON public.alimentos_smae FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus alimentos"
  ON public.alimentos_smae FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuarios eliminan sus alimentos"
  ON public.alimentos_smae FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);
