
# Plan: Corregir orientación horizontal solo en páginas de menú Grid

## Hallazgo
Sí existe `orientation="landscape"` en `MenuGrid`, pero hoy el PDF sigue saliendo vertical. El problema está en la definición real de la página del menú: hay que forzar la hoja horizontal únicamente en esas páginas del menú semanal, sin tocar Portada, Recetas, Recomendaciones, etc.

## Qué voy a cambiar

### 1. Forzar tamaño landscape solo en `MenuGrid`
En `src/lib/pdfGenerator.tsx` actualizaré la página del menú grid para que no dependa solo de `orientation="landscape"`, sino de un tamaño explícito horizontal de A4.

Implementación prevista:
- Mantener todas las demás páginas con `size="A4"` vertical
- En `MenuGrid`, usar tamaño landscape explícito:
  - `size={{ width: 841.89, height: 595.28 }}` o equivalente
- Con eso, solo las páginas del menú estilo grid saldrán horizontales

### 2. Mantener condicional por estilo
En `PlanDocument` ya existe la condición:
- `config.estilo === "grid"` → `MenuGrid`
- `config.estilo !== "grid"` → `MenuLista`

La dejaré así, pero aseguraré que:
- `MenuGrid` = horizontal
- `MenuLista` = vertical
- El resto de secciones = vertical

### 3. Ajustar layout interno al ancho horizontal real
Como el menú tendrá ancho landscape real, ajustaré el layout del grid para aprovechar ese espacio:
- 7 columnas de días + columna de tiempos
- celdas con `borderRadius: 8`
- fondo `#FDEBDA`
- separación visible entre tarjetas
- texto pequeño pero legible con wrap dentro de cada celda

## Archivo a modificar
- `src/lib/pdfGenerator.tsx`

## Resultado esperado
- Si eliges **estilo Grid**, las páginas del menú semanal salen en **horizontal**
- Si eliges **estilo Lista**, las páginas del menú siguen en **vertical**
- Portada, Generalidades, Recomendaciones, Recetas y Agradecimiento siguen en **vertical**
