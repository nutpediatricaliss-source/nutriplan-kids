ALTER TABLE public.plan_items ADD COLUMN marca text;
ALTER TABLE public.plan_items ADD CONSTRAINT plan_items_marca_check CHECK (marca IS NULL OR marca IN ('alergeno', 'blw'));
