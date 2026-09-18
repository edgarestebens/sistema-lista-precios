# Lista de Mercado M y E

Aplicación web responsive (pensada para móvil) para gestionar listas de mercado: varias listas (por ejemplo Carnes, Frutas) y los productos de cada una, con datos guardados en **Supabase**.

## ¿Qué hace?

### Pantalla de listas
- Ver todas las listas de mercado
- Agregar, editar y eliminar listas
- Reordenar con arrastrar y soltar
- Entrar a una lista al tocarla

### Pantalla de ítems
- Agregar productos desde un campo fijo abajo (input + botón `+`)
- Editar y eliminar ítems
- Marcar / tachar comprados (van al final de la lista)
- **Seleccionar todo** para tachar o destachar todos
- Menú (⋮) para ordenar **A → Z** o **Z → A** (los tachados siguen al final)
- Reordenar manualmente con arrastrar y soltar

## Stack

| Pieza | Tecnología |
|--------|------------|
| Frontend | Angular 19 (standalone) |
| Drag & drop | Angular CDK |
| Backend / BD | Supabase (Postgres + API) |
| Estilo | Dark mode, layout móvil |

## Estructura de datos (Supabase)

- **`markets`**: id, name, position, created_at  
- **`items`**: id, market_id, name, is_checked, position, created_at  

Al borrar una lista se eliminan sus ítems (cascade).

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm
- Proyecto Supabase con las tablas `markets` e `items` y políticas RLS para `anon`

## Configuración

Las URL y clave anónima de Supabase están en:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Ajusta `supabaseUrl` y `supabaseAnonKey` si usas otro proyecto.

## Ver la app en la web (GitHub Pages)

La app se publica automáticamente al hacer push a `main`:

**https://edgarestebens.github.io/sistema-lista-precios/**

> Nota: si abres Pages sin desplegar el build, GitHub muestra el README. El sitio real es el resultado de `ng build` (workflow `Deploy GitHub Pages`).

## Cómo correrlo

```bash
npm install
npm start
```

Abre [http://localhost:4200/](http://localhost:4200/).

## Scripts útiles

```bash
npm start          # servidor de desarrollo
npm run build      # build de producción
npm test           # pruebas unitarias (Karma + Chrome)
```

## Pruebas

Hay pruebas unitarias de servicios y componentes (listas, ítems, tachar, ordenar, editar, etc.):

```bash
npx ng test --watch=false --browsers=Chrome
```

## Notas

- En esta versión **no hay login**: el acceso usa la clave `anon` de Supabase.
- La app está optimizada para pantallas estrechas; también funciona en escritorio.
