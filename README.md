# NutriPlan Kids

Actúa como un desarrollador experto en React y Tailwind CSS para crear una aplicación de planificación nutricional pediátrica flexible.

Entorno de Usuario:

Buscador Inteligente: Panel para buscar en dos bases de datos: 'Alimentos SMAE' y 'Mis Recetas Guardadas'.

Lienzo de Menú (Canvas): Un área de arrastrar y soltar (Drag and Drop) para armar comidas.

Lógica de 'Comidas Flexibles':

Alimentos Individuales: Cuando arrastro alimentos sueltos, la app debe tener un interruptor (Toggle) para el 'Modo Porciones'. Si está 'ON', muestra campos para gramos/piezas. Si está 'OFF', solo muestra el nombre.

Recetas Guardadas: Al arrastrar una receta (ej. Sopa de Pollo), la app debe mostrar un panel simple junto a ella con:

Un campo de texto editable para 'Nota para el Menú' (ej. 'con 50g de pollo'). Esto se mostrará en letra pequeña junto al nombre de la receta en el plan diario.

Un interruptor para 'Incluir Detalle de Receta en el PDF final'.

Base de Datos y Datos:

Necesito vincular dos tablas (actualmente en CSV/JSON). Una para alimentos SMAE y otra para mis recetas.

La tabla de recetas DEBE incluir columnas para: Nombre, Ingredientes y Preparación, Imagen (URL), Nota Predeterminada para Menú, Incluir Detalle Receta (Booleano: SÍ/NO).

Salida PDF:

Generar un PDF de diseño minimalista con mi logo y colores de marca.

El PDF debe organizarse así: Portada -> Menú Diario (limpio, con notas/porciones si aplica) -> Pautas Extra (opcionales) -> Anexo de Recetas (SOLO las que marqué con 'SÍ'). Las recetas en el anexo deben tener foto, nombre y preparación.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cfe04e46-b238-49af-ad01-9768e9bf9ec7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
