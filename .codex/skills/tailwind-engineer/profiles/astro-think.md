# Perfil: astro (efeonce-think / efeonce-web) — Tailwind crudo, con deuda de tokens

> `efeonce-think`: Astro 7.0.6 · `tailwindcss@4.3.2` + `@tailwindcss/vite@4.3.2` · React 19.2.7
> instalado pero **cero islas** · `.nvmrc` 22.22.2.
> `efeonce-web`: Astro 6 · `tailwindcss@^4.2.2` · react `^19.2.5`.
> Verificado 2026-07-27.

## Qué es este repo

`efeonce-think` es el **hub público** (`think.efeoncepro.com`): render "tonto" de un modelo headless
que produce Greenhouse. El cliente es un **payload JSON**, cero lógica de negocio acá. Es donde vive
la Radiografía AEO como muestra de trabajo.

Composición real: **28 `.astro`, 0 `.tsx`, 0 `.jsx`, 7 `.ts`**. `@astrojs/react` está registrado en
`astro.config.mjs` pero no hay una sola isla (`client:load|visible|idle` = 0 hits). Es **HTML + CSS
puro con Astro**; la integración React es peso muerto. No agregues una isla React "porque está
disponible" — si hace falta interactividad, evaluá primero HTML de plataforma
(`html-react-engineer` → `references/platform-elements.md`).

## Cableado

```js
// astro.config.mjs
vite: { plugins: [tailwindcss()] }
```

```css
/* src/styles/global.css:1 */
@import 'tailwindcss';
```

**Import completo → preflight ACTIVO.** Al revés que los otros dos repos. Los defaults de Tailwind
sobre `h1`, `ul`, `button`, `img` sí aplican acá.

**No hay `@theme`, `@layer`, `@utility`, `@plugin` ni `@source`** en todo el repo. `@import 'tailwindcss'`
es la única at-rule de Tailwind.

## La deuda: clases semánticas con valores literales

`src/styles/global.css` son **1.307 líneas** de clases escritas a mano con valores en rem:

```css
.eyebrow       { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; }
.lead          { font-size: 0.9375rem; line-height: 1.55; }
.section-title { font-size: 1.75rem; font-weight: 600; line-height: 1.18; }
```

Más `src/styles/aeo-xray.css` (676 líneas).

Esto **no es Tailwind**: es CSS clásico con Tailwind instalado al lado. El comentario del propio
archivo lo admite — *"Capa de marca (blend AXIS) copiada del portal; paquete compartido = follow-up"*.
Es el repo con **menor disciplina de tokens de los tres**.

### Cómo trabajar acá sin empeorarlo

- **Es un hub público de marca, no el portal.** La vara visual la fija `frontend-design` /
  `efeonce-brand-studio`, no los tokens AXIS del producto. No importes el theme del portal.
- **Regla de no-regresión:** si tocás una superficie, **no agregues más valores literales**. Lo mínimo
  viable es declarar el valor una vez en `@theme` y consumirlo. Un `@theme` chico y honesto es mejor
  que 1.307 líneas creciendo.
- **El camino correcto es el follow-up ya identificado**: paquete de tokens compartido. Si vas a
  invertir más de un rato acá, esa es la conversación (`design-system-governance` + `arch-architect`),
  no un refactor táctico.
- Las clases semánticas existentes (`.eyebrow`, `.lead`, `.section-title`) **son un sistema tipográfico
  válido** — vienen de `typography-design`. No las conviertas en cadenas de utilidades: perderías la
  intención semántica. Lo que hay que arreglar es de dónde salen sus **valores**, no su forma.

## Integración con Astro

Para lo que es propio de Astro (islas, directivas de cliente, view transitions de Astro, content
collections, build) la dueña es la skill **`astro`** y su overlay de efeonce-think. Esta skill decide
theme y clases; `astro` decide el cableado del framework.

Nota de convivencia: `astro/topics/styling.md:48-101` documenta la instalación de Tailwind v4 en Astro
(`@tailwindcss/vite`, `@import 'tailwindcss'`, config CSS-first, 3 reglas NEVER). Es correcta y no la
contradigas; esta skill agrega el oficio que ahí no está.
