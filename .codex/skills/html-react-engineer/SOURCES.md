# SOURCES — html-react-engineer

> **Regla:** el HTML semántico y los principios de composición de React **no se reverifican**: son
> estables. Lo que rota es (a) el catálogo de elementos/atributos de plataforma nuevos y (b) la
> superficie de React. Si la fila tiene más de ~3 meses y la afirmación es load-bearing, reverificá.
>
> **Última revisión completa: 2026-07-27.**

## Tabla de volatilidad

| Tema | Volatilidad | Reverificar antes de afirmar… | Dónde vive |
|---|---|---|---|
| HTML semántico (landmarks, headings, listas, tablas, forms) | **estable** | — | `references/semantic-html.md` |
| ARIA-vs-nativo, roles, estados | **estable** (APG cambia lento) | patrones nuevos de APG | idem |
| `<dialog>`, `popover`, `<details>` | **semestral** | detalles finos (`::backdrop`, `::details-content`) | `references/platform-elements.md` |
| Invoker commands, customizable select, `popover=hint` | **trimestral** | **todo** — son de 2025 | idem |
| React 19.x API | **trimestral** | qué es estable vs experimental; el minor vigente | `references/react19-components.md` |
| React Compiler | **trimestral** | comportamiento y qué inhibe la optimización | idem |
| Adopción real en los repos | **por task** | **siempre** — grepeá, no cites esta tabla | ↓ |

## Fuentes

| Fuente | Qué se tomó | Verified |
|---|---|---|
| [React 19.2 (react.dev, 2025-10-01)](https://www.react.dev/blog/2025/10/01/react-19-2) | `<Activity>` (modos `visible`/`hidden`: oculto desmonta efectos y difiere updates); `useEffectEvent`; `cacheSignal` (solo Server Components); **Partial Pre-rendering** (`prerender` + `resume`); **SSR batching** de Suspense (evita animaciones en cascada); Web Streams en Node; performance tracks en DevTools; `useId` cambia prefijo `:r:` → `_r_` por compatibilidad con view transitions; `eslint-plugin-react-hooks` v6 con flat config. **No hay API `<ViewTransition>` anunciada** — solo preparación | 2026-07-27 |
| [MDN — Invoker Commands API](https://developer.mozilla.org/docs/Web/API/Invoker_Commands_API) | `command` + `commandfor`; comandos built-in (`show-modal`, `close`, `request-close`, `show-popover`, `hide-popover`, `toggle-popover`, y para `<details>`/`<audio>`/`<video>`/`<select>`); comandos custom con prefijo `--`; `CommandEvent`; `HTMLButtonElement.commandForElement`. **Baseline desde 2025-12** | 2026-07-27 |
| [CSS-Tricks — Invoker Commands](https://css-tricks.com/invoker-commands-additional-ways-to-work-with-dialog-popover-and-more/) · [OpenReplay guide](https://blog.openreplay.com/invoker-commands-api-guide/) | patrones de uso, relación implícita invoker/popover en `<select>` | 2026-07-27 |
| [modern-css.com — What's New](https://modern-css.com/whats-new/) | customizable select (`appearance: base-select`, Chrome 134); `popover=hint` (Chrome 135); `field-sizing`; `::details-content` | 2026-07-27 |
| [MDN — `::picker`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::picker) | pseudo-elemento del select personalizable | 2026-07-27 |
| [React 19.2 — guías secundarias](https://blog.logrocket.com/react-19-2-is-here/) | confirmación de que **React Compiler llegó a 1.0**; el patch vigente de la 19.2 es 19.2.7 (2026-06-01) | 2026-07-27 |
| Prácticas 2026 (varias) | "Server Components por defecto, cliente solo cuando hace falta"; "usá el compiler antes que memo manual"; `use()` sobre `useEffect` para datos; Server Actions sobre API routes para formularios | 2026-07-27 |

⚠️ **Sesgo a corregir:** los artículos de "React best practices 2026" recomiendan Server Actions y la
forms API como default. **En este ecosistema no son el idiom** (ver abajo), y el repo tiene un contrato
propio — Full API Parity — que un Server Action ingenuo puede violar. Tomá la técnica, no la
prescripción arquitectónica.

## Adopción real en los repos (runtime > doc)

Verificado por grep 2026-07-27. **Grepeá antes de citar esto**: es lo que más rápido queda viejo.

| | greenhouse-eo | globe/studio-client | efeonce-think |
|---|---|---|---|
| React | 19.2.3 | 19.2.8 | 19.2.7 |
| Framework | Next 16.1.1, App Router | Vite 8.1.5 SPA | Astro 7.0.6 |
| Server Components | **sí** — 282 de 286 `page.tsx` sin `'use client'` | no aplica | no aplica |
| `'use client'` | **931 archivos** | 0 | 0 |
| `'use server'` / Server Actions | **0** | 0 | 0 |
| `useActionState` / `useFormStatus` / `useOptimistic` | **0 / 0 / 0** | 0 | 0 |
| `use()` | **0** (los 39 hits del grep son falsos positivos: `buildTenantWhereClause(`, etc.) | 0 | 0 |
| `Suspense` | **3** | 0 | 0 |
| `useTransition` | 12 | 0 | 0 |
| React Compiler | no | **sí — `babel-plugin-react-compiler@1.0.0`, pin exacto** | no |
| Islas React | n/a | n/a | **0** (`@astrojs/react` instalado pero sin usar) |

**Lectura:** greenhouse-eo usa Server Components como **shells delgados** y toda la mutación va por API
routes + fetch cliente. Toda la superficie de React 19 (forms API, `use()`, optimistic) es
**greenfield**. Introducirla es una decisión de arquitectura, no de componente.

## Mitos que NO se citan

- **"ARIA mejora la accesibilidad."** ARIA **mal puesto es peor que nada**: sobreescribe la semántica
  nativa con una mentira. La primera regla de ARIA es no usar ARIA si hay un elemento nativo.
- **"`<div>` con `role="button"` y `tabindex="0"` equivale a `<button>`."** Falta Enter/Espacio,
  `:disabled`, envío de formulario, `forced-colors` y el mapeo del árbol de accesibilidad.
- **"Hay que envolver todo en `memo`."** Con React Compiler es contraproducente. Sin compiler, es
  optimización prematura que agrega comparaciones.
- **"`useEffect` es para traer datos."** Es para sincronizar con sistemas externos. Para datos, el
  camino es el framework (RSC, `use()`, cache).
- **"`<dialog>` no es accesible / hay que usar una librería."** Fue cierto en 2021. Hoy `showModal()`
  da top layer, foco atrapado, ESC y `::backdrop` nativos.
- **"El HTML semántico es solo para SEO."** Es la API que consumen lectores de pantalla, modo lectura,
  el navegador y ahora los agentes.
