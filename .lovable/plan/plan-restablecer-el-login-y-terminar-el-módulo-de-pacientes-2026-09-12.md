# Plan: Restablecer el login y terminar el módulo de Pacientes

## 1. Error de login ("Network error fetching the source")
La comprobación de estado del backend confirma que no responde (probe de auth→database falló por timeout). Por eso el inicio de sesión falla: no es problema de tu usuario ni de tu contraseña.

### Acción
- Reiniciar el backend de Lovable Cloud (puede tardar unos minutos en estar disponible).
- Verificar que vuelva a estar saludable antes de continuar.
- Pedirte que pruebes el login de nuevo una vez confirmado.

## 2. Completar lo pendiente del módulo de Pacientes
Las pantallas de pacientes ya están creadas, pero faltan estas conexiones:

1. **Navegación y rutas** (`src/components/AppLayout.tsx`, `src/App.tsx`)
   - Agregar "Pacientes" al menú principal junto a Recetas, Alimentos y Calculadora.
   - Agregar las rutas `/pacientes` (lista) y `/pacientes/:id` (ficha del paciente).

2. **PlanCreator con paciente precargado** (`src/pages/PlanCreator.tsx`)
   - Leer el parámetro `paciente_id` de la URL cuando se llega desde la ficha del paciente.
   - Guardar `paciente_id` y `nombre_paciente` al crear el plan, sin tocar el flujo de drag-and-drop ni las plantillas.

3. **Tipos de la base de datos** (`src/integrations/supabase/types.ts`)
   - Agregar las definiciones de las tablas `pacientes`, `consultas` y la columna `paciente_id` en `planes_menu`.

4. **Verificación final**
   - Revisar que no haya errores de compilación y que la calculadora siga funcionando igual que antes.

## Nota
No se modificarán las tablas existentes de alimentos, recetas, ítems de planes ni plantillas de texto.
