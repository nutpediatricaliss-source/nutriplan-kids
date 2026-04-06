

# Plan: Nombre editable, notas en alimentos, y alimento personalizado

## Resumen
Tres mejoras al canvas del PlanCreator:
1. Ícono para editar el nombre visible de cualquier item (sin afectar la DB original)
2. Notas para el menú en alimentos (igual que recetas)
3. Botón para agregar "alimento personalizado" (texto libre) en cada tiempo de comida

## Migración SQL

```sql
-- Nombre personalizado por item (no afecta tabla original del alimento/receta)
ALTER TABLE plan_items ADD COLUMN nombre_override text DEFAULT NULL;
```

El campo `nota_menu` ya existe en `plan_items` — solo hay que mostrarlo también para alimentos (actualmente solo se muestra para recetas).

Para los alimentos personalizados, se usará `tipo = 'personalizado'` con `item_id` generado como UUID random y el nombre guardado en `nombre_override`.

## Cambios en `src/pages/PlanCreator.tsx`

### 1. Nombre editable con ícono
- Añadir ícono `Pencil` (lucide) junto al nombre del item
- Al hacer clic, convierte el nombre en un `DebouncedInput` que guarda en `nombre_override`
- `getItemName()` prioriza `item.nombre_override` sobre el nombre de la DB
- El ícono es discreto (tamaño pequeño, color muted)

### 2. Nota para el menú en alimentos
- Añadir ícono `StickyNote` junto al nombre del alimento
- Al hacer clic, muestra/oculta un `DebouncedInput` para `nota_menu`
- Mismo comportamiento que ya existe para recetas, pero activable con ícono para ahorrar espacio

### 3. Alimento personalizado (texto libre)
- Añadir botón `Plus` con texto "Personalizado" en el header de cada Card de tiempo de comida (junto al ícono de copiar)
- Al hacer clic, inserta un nuevo `plan_item` con `tipo: "personalizado"`, `item_id: crypto.randomUUID()`, y abre inline el campo de nombre para escribir
- Se muestra igual que los demás items pero con un badge "Personalizado"
- El nombre se guarda en `nombre_override`

### UI compacta para cada item
```text
┌─────────────────────────────────────────────┐
│ [✏️] Nombre del item [📝] [🗑️]             │
│   (porción si aplica)                        │
│   (macros si aplica)                         │
│   [nota si está visible]                     │
└─────────────────────────────────────────────┘
```
- ✏️ = Pencil (editar nombre) — toggle inline input
- 📝 = StickyNote (nota) — toggle inline input  
- 🗑️ = X (eliminar)

### Lógica `getItemName` actualizada
```typescript
const getItemName = (item: PlanItem) => {
  if (item.nombre_override) return item.nombre_override;
  if (item.tipo === "personalizado") return "Alimento personalizado";
  if (item.tipo === "alimento") return alimentos.find(a => a.id === item.item_id)?.nombre ?? "Alimento";
  return recetas.find(r => r.id === item.item_id)?.nombre ?? "Receta";
};
```

### Archivos a modificar
- **Migración SQL**: agregar columna `nombre_override` a `plan_items`
- **`src/pages/PlanCreator.tsx`**: UI de items (ícono editar nombre, ícono nota, botón personalizado), lógica de insert personalizado, `getItemName` actualizado
- **`src/lib/pdfGenerator.ts`**: usar `nombre_override` cuando exista al renderizar items

