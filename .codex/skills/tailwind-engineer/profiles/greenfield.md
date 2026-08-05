# Perfil: greenfield — montar Tailwind v4 bien desde cero

Usar solo cuando el repo **no** es greenhouse-eo, efeonce-globe ni un Astro del ecosistema. Si es uno
de esos tres, carga su perfil: acá vas a tomar decisiones que ahí ya están tomadas.

## Decisiones de arranque, en orden

### 1. Motor

| Contexto | Plugin | Por qué |
|---|---|---|
| Vite / Astro / SPA | `@tailwindcss/vite` | camino más directo, sin PostCSS de por medio |
| webpack / Next con webpack | `@tailwindcss/webpack` | v4.2+; **2.17x** más rápido que la vía PostCSS |
| PostCSS ya en el stack | `@tailwindcss/postcss` | solo si ya hay pipeline PostCSS que no vale la pena sacar |

**Nunca** un `tailwind.config.js`. En v4 la config es CSS; `@config` existe solo para migrar legacy.

### 2. ¿Preflight sí o no?

- **Sí** (`@import "tailwindcss"`) si el repo no tiene reset propio ni un sistema de componentes con
  el suyo. Es el default correcto.
- **No** (importar solo `theme.css` + `utilities.css`) si ya hay un reset propio o un framework de
  componentes que trae el suyo. Dos resets globales peleando es una de las formas más caras de
  perder una tarde.

### 3. ¿De dónde sale el theme?

Esta es **la** decisión del repo, y define su dialecto para siempre.

| Patrón | Cuándo | Ejemplo del ecosistema |
|---|---|---|
| **SSOT en TS → generador → `@theme` generado + gate** | hay un design system propio y quieres una sola fuente auditable | `efeonce-globe` |
| **`@theme` puente que consume vars de otro sistema** | ya existe un theme dueño (MUI, Chakra, un DS heredado) | `greenhouse-eo` |
| **`@theme` escrito a mano** | proyecto chico, sin DS, sin dark mode complejo | — |
| **Sin theme** | nunca a propósito | `efeonce-think` (es deuda, no diseño) |

Si eliges el primero, **el gate no es opcional**: sin un test que compare lo generado contra el
generador, alguien va a editar el archivo generado a mano y nadie se va a enterar.

### 4. ¿Vacías los namespaces?

`--color-*: initial` (o `--*: initial`) borra la escala de fábrica.

- **Vacía** si el producto tiene identidad propia y no quieres que nadie use un color de la paleta
  default por accidente. Es lo que hace Globe. Costo: todo tiene que existir en tu SSOT antes de
  poder usarse, y una utilidad ausente **falla en silencio**.
- **No vacíes** si el equipo se beneficia de la escala de fábrica para prototipar. Costo: entra
  cualquier color por la puerta de atrás.

No hay opción intermedia buena: "vaciamos color pero dejamos spacing" produce un sistema que nadie
recuerda de memoria.

### 5. Orden de capas

Declaralo explícito y **antes del primer `@import`**:

```css
@layer theme, base, components, utilities;
```

Si hay CSS heredado conviviendo, dale su propia capa y ponla **después de `base` y antes de
`components`**. Ponerla primera hace que las utilidades le ganen a estilos de componente que sí
querías conservar (medido en Globe: `.capability-button` cayó de 11,52px/600 a 16px/400).

### 6. Acota la detección de contenido desde el día 1

```css
@source not "**/*.test.ts";
@source not "**/*.test.tsx";
@source not "docs/**";
```

Tailwind escanea el árbol como **texto plano** respetando `.gitignore`, y **no ignora comentarios**.
Cualquier archivo con un ejemplo de clase — tests, docs, `.md`, fixtures — materializa esa clase en
el CSS compilado. Excluir esto después es una arqueología desagradable.

## Setup mínimo verificado

```css
/* app.css */
@layer theme, base, components, utilities;
@import 'tailwindcss';

@theme {
  --color-brand: oklch(0.72 0.11 178);
  --font-display: 'Satoshi', sans-serif;
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
}

@source not "**/*.test.{ts,tsx}";
```

## Lo que NO vas a necesitar

- `clsx` / `cva` / `tailwind-merge` — el idiom shadcn/ui no se usa en este ecosistema. Si crees que
  hace falta, es una decisión de plataforma (`arch-architect`), no de feature.
- `@apply` como estilo de la casa — ver §4 del SKILL.
- Configurar `content` o purge — no existe en v4.
