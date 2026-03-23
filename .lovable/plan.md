
# Plan: App de Planificación Nutricional Pediátrica

## Visión General
Aplicación web para nutriólogos pediátricos que permite crear planes de menú personalizados de 14-30 días con tiempos de comida configurables, drag & drop de alimentos/recetas, y generación de PDF profesional.

## Arquitectura

### Backend (Supabase / Lovable Cloud)
- **Tabla `alimentos_smae`**: nombre, grupo, porción, calorías, proteínas, grasas, carbohidratos, fibra
- **Tabla `recetas`**: nombre, ingredientes (texto), preparación (texto), imagen_url, nota_predeterminada, incluir_detalle_pdf (booleano)
- **Tabla `planes_menu`**: id, nombre_paciente, dias (número 14-30), fecha_creacion, tiempos_comida (JSON array con nombres personalizados)
- **Tabla `plan_items`**: plan_id, dia, tiempo_comida, tipo (alimento/receta), item_id, nota_menu, porcion, incluir_detalle_pdf, orden

### Páginas y Componentes

#### 1. Panel Principal (Dashboard)
- Lista de planes guardados con opciones de crear nuevo, editar, duplicar, eliminar
- Botón prominente "Nuevo Plan"

#### 2. Creador de Plan (página principal de trabajo)
- **Barra superior**: Nombre del paciente, selector de días (14-30), botón para gestionar tiempos de comida (agregar/quitar/renombrar)
- **Panel izquierdo - Buscador Inteligente**:
  - Tabs para alternar entre "Alimentos SMAE" y "Mis Recetas"
  - Campo de búsqueda con filtros por grupo alimenticio
  - Resultados arrastrables (drag)
  - Toggle global "Modo Porciones" (ON/OFF)
- **Panel central - Lienzo de Menú (Canvas)**:
  - Navegación por días (tabs o selector)
  - Secciones por cada tiempo de comida personalizado
  - Zonas de drop para recibir alimentos/recetas
  - Al soltar un **alimento individual**: muestra nombre + campos de gramos/piezas si Modo Porciones está ON
  - Al soltar una **receta**: muestra nombre + campo editable "Nota para el Menú" + toggle "Incluir Detalle en PDF"
  - Reordenar items dentro de cada tiempo de comida con drag & drop

#### 3. Gestión de Recetas
- CRUD completo para recetas
- Formulario con: nombre, ingredientes, preparación, imagen (upload), nota predeterminada, incluir detalle (toggle)

#### 4. Gestión de Alimentos SMAE
- Vista de tabla con búsqueda y filtros
- Importación inicial desde CSV/JSON del usuario

#### 5. Generador de PDF
- **Portada**: Logo del nutriólogo, nombre del paciente, fecha
- **Menú Diario**: Diseño limpio por día, con tiempos de comida, alimentos con porciones (si aplica), recetas con notas pequeñas
- **Pautas Extra**: Sección opcional con texto libre
- **Anexo de Recetas**: Solo recetas marcadas con "Incluir Detalle = SÍ" — foto, nombre y preparación
- Colores y logo de marca del usuario

## Funcionalidades Clave
- Drag & drop fluido con `@dnd-kit/core`
- Generación de PDF con `jspdf` o `@react-pdf/renderer`
- Tiempos de comida totalmente personalizables (agregar, eliminar, renombrar)
- Planes de 14 a 30 días con navegación por día
- Toggle de "Modo Porciones" para control granular
- Importación de datos CSV/JSON para poblado inicial de tablas

## Flujo de Implementación
1. Configurar Lovable Cloud (Supabase) con las tablas y esquema
2. Crear importador de datos CSV/JSON para alimentos y recetas
3. Construir el CRUD de recetas y vista de alimentos
4. Construir el Creador de Plan con drag & drop y lógica de comidas flexibles
5. Implementar generación de PDF con el formato especificado
6. Integrar branding (logo y colores del usuario)
