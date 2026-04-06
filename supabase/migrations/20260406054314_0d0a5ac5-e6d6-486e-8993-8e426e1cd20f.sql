ALTER TABLE public.plan_items DROP CONSTRAINT IF EXISTS plan_items_tipo_check;

ALTER TABLE public.plan_items
ADD CONSTRAINT plan_items_tipo_check
CHECK (tipo = ANY (ARRAY['alimento'::text, 'receta'::text, 'personalizado'::text]));