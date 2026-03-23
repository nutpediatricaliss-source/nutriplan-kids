

# Plan: Mejoras al PlanCreator — Plantillas, Sidebar Sticky y Diseño Visual

## Cambios Solicitados

### 1. Guardar menús y sistema de plantillas
- Agregar botón "Guardar" explícito en la barra superior del PlanCreator que guarde todos los campos del plan con feedback visual (toast de confirmación)
- Agregar botón "Guardar como Plantilla" que marca el plan como plantilla reutilizable
- En el Dashboard, mostrar sección separada de "Mis Plantillas" con opción de "Crear plan desde esta plantilla" (duplica la plantilla como plan nuevo)
- **Migración SQL**: agregar columna `es_plantilla boolean default false` a `planes_menu`

### 2. Buscador lateral sticky (1/3 del ancho)
- Reestructurar el layout del PlanCreator: el panel de búsqueda pasa a ser un sidebar fijo a la izquierda con `position: sticky`, `max-width: 33%`, y scroll independiente
- En el tab de Recetas del buscador, mostrar la imagen thumbnail junto al nombre de cada receta (ya que hay más espacio)
- Aumentar el límite de resultados visibles (de 3 a ~6-8) aprovechando la altura completa del sidebar
- Mover los toggles (Porciones, Macros) debajo del campo de búsqueda de forma compacta

### 3. Búsqueda de recetas por etiquetas
- **Migración SQL**: agregar columna `etiquetas text[]` (array de texto) a la tabla `recetas`
- En la página de Recetas (CRUD), agregar campo de etiquetas en el formulario (input con chips/tags)
- En el buscador del PlanCreator, filtrar recetas tanto por nombre como por etiquetas
- Mostrar las etiquetas como badges pequeños debajo del nombre de cada receta en los resultados

### 4. Paleta de colores pastel para la interfaz
Agregar CSS variables y aplicar colores pastel sobrios que complementen la paleta existente:
- **Melocotón suave** `#fde8d0` — fondo de las cards de tiempos de comida en el canvas
- **Verde salvia claro** `#e8f0e4` — fondo del panel de búsqueda lateral
- **Lavanda suave** `#ede8f5` — badges de etiquetas y tabs activos
- Aplicar bordes y fondos sutiles diferenciados para que cada sección sea visualmente distinguible (buscador vs canvas vs navegación de días)

## Archivos a Modificar
- **`src/pages/PlanCreator.tsx`**: Layout sidebar sticky, botón guardar, colores
- **`src/pages/Dashboard.tsx`**: Sección de plantillas, crear plan desde plantilla
- **`src/pages/Recetas.tsx`**: Campo de etiquetas en formulario
- **`src/index.css`**: Variables CSS para los nuevos colores pastel

## Migración SQL
```sql
-- Plantillas
ALTER TABLE planes_menu ADD COLUMN es_plantilla boolean DEFAULT false;

-- Etiquetas para recetas
ALTER TABLE recetas ADD COLUMN etiquetas text[] DEFAULT '{}';
```

## Flujo de Plantillas
1. Usuario arma un menú completo
2. Hace clic en "Guardar como Plantilla" → se marca `es_plantilla = true`
3. En el Dashboard aparece en sección "Mis Plantillas"
4. Al hacer clic en "Usar Plantilla" → se duplica como plan nuevo con `es_plantilla = false`

