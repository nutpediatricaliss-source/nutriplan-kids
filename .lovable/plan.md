

# Plan: Formato de ingredientes y preparación en recetas

## Problema
Los ingredientes y la preparación se guardan como texto plano. El código actual hace split por `\n`, pero los datos reales usan `;` para ingredientes y `. ` para pasos de preparación, resultando en una sola línea larga.

## Cambios

### 1. `src/pages/Recetas.tsx` — Vista de recetas en cards
Agregar una vista expandible o detalle visible en cada card que muestre:
- **Ingredientes**: split por `;`, cada uno con bullet point (`•`), con `mb-1` entre líneas
- **Preparación**: split por `. ` (punto seguido de espacio), lista numerada (1, 2, 3...), con `mb-1.5` entre pasos

### 2. `src/lib/pdfGenerator.ts` — Renderizado en PDF
Modificar las funciones de parsing en `renderRecetas`:
- **Ingredientes** (línea 494): cambiar `split("\n")` a split inteligente que primero intente `;` y si no hay, use `\n`
- **Preparación** (línea 523): cambiar `split("\n")` a split inteligente que primero intente `. ` y si no hay, use `\n`
- Agregar spacing extra entre items (`y += 5.5` en vez de `4.5`) para evitar que se vean amontonados

### Lógica de split inteligente (reutilizable)
```typescript
function splitIngredientes(text: string): string[] {
  if (text.includes(";")) return text.split(";").map(s => s.trim()).filter(Boolean);
  return text.split("\n").filter(Boolean);
}

function splitPreparacion(text: string): string[] {
  if (text.includes(". ")) {
    return text.split(/\.\s+/).map(s => s.trim()).filter(Boolean);
  }
  return text.split("\n").filter(Boolean);
}
```

### Archivos a modificar
- **`src/pages/Recetas.tsx`** — Mostrar ingredientes y preparación formateados en las cards
- **`src/lib/pdfGenerator.ts`** — Usar los nuevos splits en el renderizado de recetas del PDF

