
ALTER TABLE planes_menu ADD COLUMN es_plantilla boolean DEFAULT false;
ALTER TABLE recetas ADD COLUMN etiquetas text[] DEFAULT '{}';
