

# Plan: Fix nombre editable y alimento personalizado

## Problema 1: Texto no visible al editar nombre
El `DebouncedInput` inicia con `nombre_override ?? ""` — si el item no tiene override, muestra vacío con placeholder "Nombre personalizado...". El usuario quiere ver el nombre actual del item como valor inicial.

### Fix
Cambiar el valor inicial del `DebouncedInput` de `(item as any).nombre_override ?? ""` a `getItemName(item)` para que muestre el nombre real del alimento/receta como punto de partida.

## Problema 2: Error al agregar alimento personalizado
El insert no incluye el campo `porcion`. Aunque tiene default en DB, para consistencia y evitar errores se debe incluir `porcion: ""` en el objeto. También se debe asegurar que el `nombre_override` inicie con un valor útil como "Personalizado" en lugar de vacío.

### Cambios en `src/pages/PlanCreator.tsx`

1. **Línea 1042**: Cambiar valor del DebouncedInput de `(item as any).nombre_override ?? ""` a `getItemName(item)`
2. **Línea 604-613** (`addCustomItem`): Agregar `porcion: ""` al objeto de insert y cambiar `nombre_override` de `""` a `"Personalizado"` como valor inicial

### Archivo a modificar
- **`src/pages/PlanCreator.tsx`**

