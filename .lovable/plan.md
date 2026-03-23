

# Plan: Mejoras al Sistema de Recetas y Creador de Menús

## Cambios solicitados

### 1. Importación bulk de recetas (Recetas.tsx)
- Agregar botón "Importar CSV/JSON" en la página de recetas
- Parsear columnas: Nombre, Ingredientes, Preparación, imagen_url, nota_predeterminada, incluir_detalle_pdf
- Reutilizar lógica de detección de delimitador (coma vs punto y coma) del importador de alimentos

### 2. Subida de imagen desde PC para recetas
- Crear un storage bucket `receta-imagenes` (público) via migración SQL
- Agregar políticas RLS para que usuarios autenticados puedan subir/leer
- En el formulario de recetas, reemplazar el campo URL por un input de archivo + preview
- Al subir, guardar en el bucket y almacenar la URL pública en `imagen_url`
- Mantener opción de pegar URL manualmente como alternativa

### 3. Toggle "Mostrar Macros" en el creador de menús (PlanCreator.tsx)
- Agregar un nuevo toggle `modoMacros` junto al toggle de Modo Porciones
- Cuando está ON, mostrar junto a cada alimento en el canvas sus macros (cal, prot, grasas, carbs) obtenidos de la tabla `alimentos_smae`
- Para recetas, mostrar macros si están disponibles (actualmente la tabla recetas no tiene macros — se mostrará solo para alimentos)

### 4. Semanas colapsables en navegación de días (PlanCreator.tsx)
- Reemplazar la lista abierta de semanas por un acordeón/collapsible
- Cada "Semana X" será un encabezado clickeable que muestra/oculta sus días
- Solo la semana del día seleccionado estará expandida por defecto

### 5. Resumen de siguientes pasos según plan inicial
Se presentará al usuario el roadmap pendiente.

## Detalles técnicos

### Migración SQL (storage bucket)
```sql
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
```

### Archivos a modificar
- **src/pages/Recetas.tsx**: Importador bulk CSV + upload de imagen desde PC
- **src/pages/PlanCreator.tsx**: Toggle macros + semanas colapsables

### Roadmap pendiente (post-implementación)
1. **Generador de PDF** — Portada, menú diario, pautas extra, anexo de recetas
2. **Branding** — Logo y colores personalizables del nutriólogo
3. **Copiar menú entre días** — Duplicar contenido de un día a otro
4. **Dashboard mejorado** — Duplicar/exportar planes

