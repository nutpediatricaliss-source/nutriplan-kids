

# Plan: Porciones editables con cálculo de macros

## Resumen
Mejorar el campo de porciones en el canvas para que muestre la porción base del alimento (desde la DB) y permita escribir un multiplicador/cantidad personalizada. Los macros se calcularán proporcionalmente a la porción indicada. Además, formatear los macros con números redondeados y formato legible.

## Cambios en `src/pages/PlanCreator.tsx`

### 1. Porción editable con referencia a la porción base
Cuando Modo Porciones está ON, cada alimento en el canvas mostrará:
- La porción base del alimento (ej. "1 cdita") como texto de referencia
- Un campo editable donde el usuario escribe la cantidad deseada (ej. "2", "0.5", "1/2")
- Se usará el campo `porcion` del `plan_item` para guardar el texto libre que el usuario escriba

### 2. Cálculo proporcional de macros
- Al escribir un número en el campo de porción (ej. "2"), los macros se multiplican por ese factor
- La función `getAlimentoMacros` se actualizará para aceptar un multiplicador
- Si el campo contiene texto no numérico o está vacío, se muestran los macros base (×1)
- Fracciones como "1/2" se parsearán como 0.5

### 3. Formato de macros
- **Calorías**: número redondeado sin decimales (ej. `85 Cal`)
- **Proteínas**: máximo 1 decimal + espacio + letra mayúscula (ej. `5.2 P`)
- **Grasas**: mismo formato (ej. `3.1 G`)
- **Carbohidratos**: mismo formato (ej. `12 C`)
- Aplicar este formato tanto en el **sidebar de búsqueda** como en el **canvas del menú**

## Detalle técnico

### Función de parseo de porción
```typescript
function parsePorcionMultiplier(porcion: string): number {
  if (!porcion?.trim()) return 1;
  // Handle fractions like "1/2"
  if (porcion.includes("/")) {
    const [num, den] = porcion.split("/").map(Number);
    if (num && den) return num / den;
  }
  const n = parseFloat(porcion);
  return isNaN(n) ? 1 : n;
}
```

### Función de formato de macros
```typescript
function formatMacros(cal, prot, grasas, carbs, mult = 1) {
  return `${Math.round(cal * mult)} Cal · ${(prot * mult).toFixed(1).replace(/\.0$/, '')} P · ${(grasas * mult).toFixed(1).replace(/\.0$/, '')} G · ${(carbs * mult).toFixed(1).replace(/\.0$/, '')} C`;
}
```

### UI del campo de porción en el canvas
- Mostrar label con la porción base: `"Porción base: 1 cdita"`
- Input editable: placeholder `"Cantidad (ej. 2, 1/2)"`
- Debajo, macros calculados con el multiplicador

### Archivos a modificar
- **`src/pages/PlanCreator.tsx`** — único archivo afectado

