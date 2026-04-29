# Plan: Importar y exportar plantillas de menú

## Objetivo
Permitir mover plantillas de menú entre cuentas/dispositivos mediante archivos JSON: **exportar** una plantilla a `.json` desde el Dashboard, e **importar** una plantilla desde `.json` para reusarla.

## Por qué JSON (no CSV)
Una plantilla no es una tabla plana — incluye:
- Metadatos del plan (días, tiempos de comida, generalidades, recomendaciones, estilo PDF, etc.)
- Una lista de `plan_items` con día, tiempo de comida, tipo, porción, notas, nombre_override, orden

CSV no representa bien esta estructura anidada. JSON sí, y además permite re-importar sin perder datos.

## Funcionalidad

### 1. Exportar plantilla (botón en cada card de plantilla)
- Nuevo ícono "Descargar" en `PlanCard` cuando `isTemplate`.
- Al hacer click: consulta el plan + sus `plan_items`, arma un objeto JSON con versión y datos, y descarga `plantilla-<nombre>.json`.

Estructura del archivo:
```json
{
  "version": 1,
  "tipo": "plantilla_menu",
  "plantilla": {
    "nombre_paciente": "...",
    "dias": 14,
    "tiempos_comida": [...],
    "pautas_extra": "...",
    "generalidades": "...",
    "snacks_colaciones": "...",
    "recomendaciones": "...",
    "mensaje_agradecimiento": "...",
    "estilo_pdf": "lista"
  },
  "items": [
    { "dia": 1, "tiempo_comida": "Desayuno", "tipo": "alimento|receta|personalizado",
      "item_id": "uuid-original", "porcion": "...", "nota_menu": "...",
      "nombre_override": "...", "orden": 0, "incluir_detalle_pdf": true }
  ]
}
```

### 2. Importar plantilla (botón en sección "Mis Plantillas" del Dashboard)
- Nuevo botón "Importar plantilla" junto al título de la sección (input file oculto, similar a Alimentos).
- Al seleccionar archivo:
  1. Valida que sea JSON con `tipo === "plantilla_menu"`.
  2. Inserta una nueva fila en `planes_menu` con `es_plantilla: true`, `user_id` actual, y todos los campos del bloque `plantilla` (nombre prefijado con `[Importada]` si no inicia con `[Plantilla]`).
  3. Inserta los `plan_items` asociados al nuevo `plan_id`.
  4. Para items de tipo `alimento` o `receta`, intenta **re-mapear** `item_id` por nombre: busca en las tablas locales del usuario un registro con el mismo nombre; si lo encuentra, usa ese id; si no, convierte el item a `tipo: "personalizado"` y guarda el nombre original en `nombre_override` para que no se pierda.
  5. Muestra resumen con toast: cuántos items importados / cuántos convertidos a personalizado.
  6. Refresca la lista.

### 3. Manejo de errores
- JSON inválido / tipo incorrecto → toast de error claro.
- Si falla el insert de items, no dejar la plantilla huérfana: borrar la plantilla recién creada y avisar.

## Archivos a modificar

- **`src/pages/Dashboard.tsx`**:
  - Agregar `exportTemplate(plan)`: query `plan_items`, construye JSON, dispara descarga vía `Blob` + `<a download>`.
  - Agregar `importTemplate(file)`: parse + validación + inserts + remapeo por nombre.
  - Agregar botón de exportar en `PlanCard` cuando `isTemplate`.
  - Agregar botón "Importar plantilla" + input file oculto en el header de la sección "Mis Plantillas" (también visible aunque no haya plantillas todavía — mover el render de la sección para que el botón aparezca siempre).

No se requieren cambios en base de datos ni nuevas migraciones — la columna `es_plantilla` y la estructura de `plan_items` ya soportan todo lo necesario.
