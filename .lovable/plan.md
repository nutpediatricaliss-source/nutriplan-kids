

# Plan: Generador de PDF con Diseños de Marca

## Resumen

Implementar un generador de PDF integrado en la app que replique fielmente los 8 diseños de Canva proporcionados, con opción de elegir entre estilo Lista y estilo Grid para el menú diario. El PDF se genera desde el navegador usando `jspdf` y se descarga directamente.

## Diseños Identificados (del análisis de tus PDFs)

El PDF seguirá este orden de secciones:

1. **Portada** - Fondo blanco con formas decorativas orgánicas doradas (#e7c688, #ad8a48, #ffe0a7), título "Plan Nutricional", nombre del paciente, tipo de consulta, logo centrado abajo
2. **Generalidades del menú** - Header con línea ondulada dorada + logo, título serif, bullets con texto editable, footer con contacto
3. **Menú Diario** (estilo Lista O Grid, a elegir):
   - **Lista**: Orientacion vertical, "Semana X" como título, 4 días por página, cada día lista sus tiempos de comida con los alimentos, fotos decorativas al costado derecho
   - **Grid**: Orientacion horizontal, tabla de 7 columnas (Día 1-7) x filas por tiempo de comida, celdas con fondo crema (#ffe0a7 claro), headers naranjas
4. **Snacks/Colaciones** - Misma estructura que Generalidades, lista de opciones con bullets
5. **Recomendaciones** - Misma estructura, lista de recomendaciones
6. **Anexo de Recetas** - Solo las marcadas con "incluir detalle = SI", cada receta con: nombre en bold, porciones, ingredientes (bullets), preparacion (numerada), foto a la derecha
7. **Agradecimiento** - Misma estética que la portada (formas orgánicas doradas), mensaje de agradecimiento centrado, logo abajo

## Paleta de Colores

- Blanco: fondo principal
- Negro: textos
- Naranja pastel: `#e7c688`
- Cafe claro: `#ad8a48`
- Crema: `#ffe0a7`
- Crema suave: `#fff5e0` (para celdas del grid)

## Elementos Visuales Recurrentes

- Linea ondulada dorada decorativa en header (esquina superior izquierda)
- Logo en esquina superior derecha
- Footer con barra dorada fina + "ND. Lissette Gutierrez | www.lissnutricion.com | @nut.pediatrica.liss"
- Titulos en tipografia serif bold
- Formas organicas/blob en portada y agradecimiento

## Implementacion Tecnica

### Dependencia
- Instalar `jspdf` para generacion de PDF en el navegador

### Archivos nuevos
- **`src/lib/pdfGenerator.ts`** - Logica principal del generador, funciones por seccion (portada, generalidades, menu lista, menu grid, snacks, recomendaciones, recetas, agradecimiento)
- **`src/components/PdfConfigDialog.tsx`** - Dialog para configurar la generacion: elegir estilo (Lista/Grid), editar generalidades, snacks, recomendaciones, y el texto de agradecimiento

### Archivos modificados
- **`src/pages/PlanCreator.tsx`** - Agregar boton "Generar PDF" que abre el dialog de configuracion

### Assets
- Copiar el logo a `public/images/logo.png` para usarlo en el PDF

### Datos para el PDF
Se obtienen de la base de datos:
- `planes_menu`: nombre paciente, dias, tiempos de comida
- `plan_items`: todos los items del plan con dia, tiempo, tipo, nota, porcion
- `alimentos_smae`: nombres de alimentos referenciados
- `recetas`: nombre, ingredientes, preparacion, imagen_url (solo las marcadas con incluir_detalle_pdf)

### Campos editables antes de generar
El dialog de configuracion permitira escribir:
- Generalidades del menu (texto libre, se renderiza como bullets)
- Lista de snacks/colaciones (texto libre)
- Recomendaciones (texto libre)
- Mensaje de agradecimiento (con texto predeterminado)
- Seleccion de estilo: Lista o Grid

### Migracion de base de datos
Agregar campos a `planes_menu` para guardar el contenido de las secciones extra:
- `generalidades` (text, nullable)
- `snacks_colaciones` (text, nullable)
- `recomendaciones` (text, nullable)
- `mensaje_agradecimiento` (text, nullable, default al texto actual)
- `estilo_pdf` (text, default 'lista')

## Flujo del Usuario
1. Arma su menu completo en el PlanCreator
2. Hace clic en "Generar PDF"
3. Se abre un dialog donde puede:
   - Elegir estilo Lista o Grid
   - Escribir/editar generalidades, snacks, recomendaciones, agradecimiento
4. Hace clic en "Descargar PDF"
5. El PDF se genera y descarga automaticamente

