

# Plan: Rediseño Visual + Plantillas de Texto para PDF

## 1. Rediseño visual estilo card-based con paleta dorada

Inspirado en la imagen de referencia, cambiar la estética general de la app a un estilo card-based con bordes redondeados, fondo cálido (#fcfbf8), y acentos dorados (#e7c688, #ad8a48).

### Cambios en `src/index.css`
- Cambiar `--background` a un tono cálido tipo crema (`40 33% 98%`)
- Cambiar `--primary` a dorado/café (`37 50% 48%` → #ad8a48)
- Cambiar `--primary-foreground` a blanco
- Cambiar `--card` a blanco puro con sombra sutil
- Actualizar `--border` a un tono cálido más suave
- Ajustar `--accent` y `--muted` para que armonicen con la paleta dorada

### Cambios en `src/components/AppLayout.tsx`
- Header con fondo crema/blanco, navegación con estilo tabs similar a la imagen (Custom, Cards, Dashboard, etc.)
- Links de navegación con estilo de chip/tab activo con borde inferior o fondo sutil dorado
- Tipografía más limpia, sin iconos en la nav (solo texto)

### Cambios en `src/pages/Dashboard.tsx`
- Cards con bordes redondeados grandes (`rounded-2xl`), sombra suave
- Fondo de página cálido
- Botones con estilo dorado/café como primary
- Grid responsivo de cards como en la imagen

### Cambios globales
- Botones primary con fondo dorado (#ad8a48) y hover más oscuro
- Cards con `shadow-sm` por defecto y `shadow-md` on hover
- Bordes más redondeados en general

## 2. Plantillas de texto guardables para PDF

### Nueva tabla en la base de datos
```sql
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
```

### Cambios en `src/components/PdfConfigDialog.tsx`
Para cada sección (Generalidades, Snacks, Recomendaciones):
- Agregar un `Select` dropdown arriba del `Textarea` que lista las plantillas guardadas del usuario para ese tipo
- Al seleccionar una plantilla, se carga su contenido en el textarea (reemplazando el texto actual)
- Agregar botón "Guardar como plantilla" junto al textarea que abre un mini-input para escribir el nombre y guarda el contenido actual
- Botón de eliminar plantilla en el dropdown
- El usuario puede editar el texto después de cargar la plantilla sin afectar la plantilla guardada

### Flujo del usuario
1. Abre "Generar PDF" → va a la tab "Generalidades"
2. Ve un dropdown "Mis plantillas" → selecciona "Estándar pediátrico"
3. El textarea se llena con el contenido guardado
4. Puede editarlo para este paciente específico
5. O puede escribir algo nuevo y hacer clic en "Guardar como plantilla" → le pone nombre → queda disponible para futuros PDFs

### Archivos a modificar/crear
- **Migración SQL**: nueva tabla `plantillas_texto`
- **`src/index.css`**: paleta de colores actualizada
- **`src/components/AppLayout.tsx`**: header rediseñado
- **`src/pages/Dashboard.tsx`**: cards con nuevo estilo visual
- **`src/components/PdfConfigDialog.tsx`**: selector de plantillas + guardar plantilla
- **`tailwind.config.ts`**: ajustes menores si se necesitan nuevos tokens

