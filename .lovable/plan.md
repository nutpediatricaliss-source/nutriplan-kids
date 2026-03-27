

# Plan: Reescribir generador de PDF con @react-pdf/renderer

## Problema
El generador actual usa `jsPDF` con posicionamiento manual pixel por pixel, lo que produce un diseño rígido y poco fiel a la marca. Se reescribirá usando `@react-pdf/renderer` que permite layouts declarativos con flexbox, bordes redondeados, sombras y fuentes personalizadas.

## Cambios principales

### 1. Instalar dependencia
- `@react-pdf/renderer` — librería React para generar PDFs declarativamente

### 2. Registrar fuentes
- Registrar fuente serif (EB Garamond o Playfair Display de Google Fonts) para títulos elegantes
- Registrar Inter (Sans-serif) para texto de alimentos
- Usar URLs de CDN de Google Fonts para los archivos `.ttf`

### 3. Reescribir `src/lib/pdfGenerator.ts`
Reemplazar todo el archivo. La nueva estructura usa componentes React internos renderizados a blob:

**Paleta de colores:**
- `#FDEBDA` — fondo de headers de día y tiempo de comida (melocotón suave)
- `#e7c688` — acentos dorados, línea ondulada, footer
- `#ad8a48` — texto de títulos
- `#282828` — texto normal

**Secciones del PDF (misma estructura actual):**
1. **Portada** — blobs decorativos, título "Plan Nutricional", nombre paciente, logo
2. **Generalidades** — bullet list
3. **Menú Grid** (landscape): 
   - Header: "Semana X" a la izquierda (serif grande), logo a la derecha, línea ondulada SVG
   - Grid con flexbox: columna izquierda = tiempos de comida, columnas = días
   - Cada celda es una "card" con `borderRadius: 6`, `backgroundColor: white`, gap de 4pt entre cards
   - Headers de día y tiempo con fondo `#FDEBDA`
   - El `+` entre alimentos se renderiza con color `#ad8a48` y espacio propio
4. **Menú Lista** (portrait): formato vertical por día con cards
5. **Snacks** — bullet list
6. **Recomendaciones** — bullet list  
7. **Recetas** — imagen + ingredientes + preparación
8. **Agradecimiento** — mensaje centrado con logo

**Footer en todas las páginas:**
- Franja horizontal color `#e7c688` 
- Tres datos: `ND. Lissette Gutiérrez | www.lissnutricion.com | @nut.pediatrica.liss`

**Función principal:**
```typescript
export async function generatePdf(data: PdfData, config: PdfConfig) {
  const blob = await pdf(<PlanDocument data={data} config={config} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Plan_${data.plan.nombre_paciente}.pdf`;
  a.click();
}
```

### 4. Actualizar `src/components/PdfConfigDialog.tsx`
- Sin cambios en la interfaz — solo asegurar que la importación siga funcionando (mismo `generatePdf` export)

### 5. Copiar logo a `public/images/logo.png`
- Verificar que el logo ya existe en esa ruta (usado actualmente por el generador)

## Archivos afectados
- **`src/lib/pdfGenerator.ts`** — reescritura completa
- **`package.json`** — nueva dependencia `@react-pdf/renderer`

## Detalle técnico: Estructura del Grid

```text
┌─────────────────────────────────────────────────────┐
│  Semana 1                              [LOGO]       │
│  ─── línea ondulada dorada ───────────────────      │
├──────────┬────────┬────────┬────────┬────────┤      │
│          │ Día 1  │ Día 2  │ Día 3  │ ...    │      │
├──────────┼────────┼────────┼────────┼────────┤      │
│Desayuno  │ card   │ card   │ card   │ card   │      │
│          │rounded │rounded │rounded │rounded │      │
├──────────┼────────┼────────┼────────┼────────┤      │
│Almuerzo  │ card   │ card   │ card   │ card   │      │
├──────────┼────────┼────────┼────────┼────────┤      │
│Cena      │ card   │ card   │ card   │ card   │      │
└──────────┴────────┴────────┴────────┴────────┘      │
│  ████████ franja melocotón ██████████████████       │
│  ND. Lissette | web | @instagram                    │
└─────────────────────────────────────────────────────┘
```

Cada celda tiene: `borderRadius: 6`, `padding: 4`, gap entre celdas, fondo blanco, y el texto se ajusta automáticamente al ancho.

