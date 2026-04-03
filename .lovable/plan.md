
# Plan: Alarmas del Menú + Copiar/Pegar con Selección Múltiple

## 1. Sección de Alarmas

Panel colapsable debajo de la navegación por días/semanas que analiza `items` con `useMemo`:

- **Tiempos vacíos**: detecta días donde algún tiempo de comida no tiene items → alerta amarilla
- **Receta repetida >5 veces en todo el plan** → alerta naranja
- **Receta repetida >3 veces por semana** → alerta naranja
- **Poca variedad por grupo**: si un grupo de alimento supera 60% del total → alerta roja
- Si todo está bien → check verde "Todo bien"
- Cada alerta es clickeable y navega al día correspondiente

### UI
- Ícono `AlertTriangle` con badge numérico, panel colapsable
- Colores: amarillo (vacíos), naranja (repeticiones), rojo (variedad)

## 2. Copiar/Pegar con Selección Múltiple (Popover)

En lugar de un simple copiar y luego pegar, el flujo será:

1. Al hacer clic en un ícono `Copy` en el header de cada Card de tiempo de comida, se abre un **Popover** (o Dialog pequeño)
2. El Popover muestra una lista de checkboxes con **todos los slots disponibles** del plan, agrupados por semana y día: "Día 1 — Desayuno", "Día 1 — Colación AM", etc. (excluyendo el slot actual)
3. El usuario marca los destinos deseados (selección múltiple)
4. Hace clic en "Duplicar" → se insertan en la DB todos los items del slot origen en cada slot destino seleccionado
5. Toast de confirmación: "Copiado a X destinos"

### Estado necesario
- `copySource: { dia: number; tiempo: string } | null` — controla qué Popover está abierto
- Los destinos se manejan como state local del Popover

### Lógica de duplicado
```
Para cada destino seleccionado (dia, tiempo):
  → Para cada item del slot origen:
    → insert en plan_items con:
      - plan_id, tipo, item_id, porcion, nota_menu, incluir_detalle_pdf del original
      - dia: día destino
      - tiempo_comida: tiempo destino
      - orden: items existentes en destino.length + index
```

## Archivo a modificar
- **`src/pages/PlanCreator.tsx`** — ambas funcionalidades (alarmas como `useMemo`, copiar/pegar como Popover con checkboxes)

## Imports a añadir
- `AlertTriangle`, `CheckCircle`, `Copy` de lucide-react
- `Popover`, `PopoverTrigger`, `PopoverContent` de `@/components/ui/popover`
- `Checkbox` de `@/components/ui/checkbox`
- `ScrollArea` de `@/components/ui/scroll-area`
