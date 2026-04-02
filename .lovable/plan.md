

# Plan: Mejoras al PDF — Recetas continuas, porciones completas, y alternativa de diseño

## Problemas identificados

1. **Recetas en páginas separadas**: Línea 454 hace `doc.addPage()` por cada receta. Se debe cambiar a flujo continuo, solo agregando página cuando no hay espacio.

2. **Porciones sin unidad en estilo lista**: Línea 250 muestra `item.porcion` (el campo del plan_item, que es solo el multiplicador como "2"). Falta combinar con `alimento.porcion` (la unidad base como "1 cdita") para mostrar algo como "2 cditas".

3. **Diseño del encabezado y control visual**: jsPDF dibuja todo píxel por píxel, lo cual hace muy difícil replicar diseños exactos. 

## Propuesta de diseño: migrar a HTML-to-PDF

**Recomendación**: Cambiar el motor de generación de `jsPDF` (dibujo manual) a **html2pdf.js** (HTML + CSS → PDF). Esto permite:
- Escribir el diseño como HTML/CSS normal (flexbox, bordes, colores, fuentes)
- Mucho más fácil de iterar: puedes describir cambios como "mueve el logo a la derecha" y se traduce a CSS
- Soporte nativo de imágenes, tablas, y tipografía
- Puedes incluso previsualizar el diseño en el navegador antes de exportar

Sin embargo, esto es un cambio grande. **Para esta iteración**, propongo arreglar los 2 bugs concretos con el motor actual y dejar la migración a html2pdf.js como siguiente paso si lo deseas.

## Cambios en `src/lib/pdfGenerator.ts`

### Fix 1: Recetas continuas (sin salto de página por receta)
- Eliminar `doc.addPage()` al inicio de cada receta
- En su lugar, iniciar la primera receta en una nueva página con título "Recetas"
- Para las siguientes recetas, verificar si hay espacio suficiente (~60mm mínimo); si no, hacer salto de página
- Agregar una línea separadora dorada entre recetas

### Fix 2: Porciones con unidad en estilo lista
- En `renderMenuLista` (línea 245-255), cuando `item.tipo === "alimento"` y hay `item.porcion`:
  - Buscar `alimento.porcion` (ej. "1 cdita") para extraer la unidad
  - Combinar: si porción base es "1 cdita" y el usuario puso "2", mostrar "2 cditas"
  - Lógica: extraer la parte textual de `alimento.porcion` (después del número) y concatenar con el valor de `item.porcion`

### Archivo a modificar
- **`src/lib/pdfGenerator.ts`** — ambos fixes

