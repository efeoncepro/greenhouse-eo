---
name: html-react-engineer
description: >-
  Especialista en el markup y el componente: qué elemento HTML es el correcto (landmarks, outline de
  encabezados, listas, tablas, `<dialog>`, `popover`, invoker commands, `<details>`, select
  personalizable, formularios), cuándo la plataforma ya resuelve algo que se estaba haciendo con
  JavaScript, ARIA-vs-nativo, y cómo se compone un componente React 19 (forms API `useActionState` /
  `useFormStatus`, `useOptimistic`, `use()`, `useEffectEvent`, `<Activity>`, transiciones, React
  Compiler, refs, keys, composición vs props). Decide la ESTRUCTURA y el COMPORTAMIENTO del
  componente, no su topología de render.
  Triggers: "html", "semántico", "semantic", "markup", "landmark", "heading", "encabezados", "dialog",
  "modal", "popover", "tooltip", "details", "accordion", "select", "combobox", "form", "formulario",
  "input", "button", "aria", "role", "web component", "custom element", "shadow dom", "react",
  "componente", "component", "hook", "useState", "useEffect", "useActionState", "useOptimistic",
  "useEffectEvent", "Activity", "Suspense", "key", "ref", "forwardRef", "render props", "compound
  component", "React Compiler", "useMemo", "useCallback", "memo", "re-render".
---

# HTML + React Engineer — el elemento correcto, el componente correcto

> **Boundary (scope of this skill).** Esta skill decide **qué elemento se usa y cómo se compone el
> componente**.
> **NO decide topología de render** — Server Components, hydration, streaming, Server Actions como
> arquitectura de datos, boundaries de `'use client'`: eso es **`frontend-architect`** (572 líneas,
> denso en RSC). Si la pregunta es *dónde corre este código*, es de ella; si es *cómo se estructura
> este componente*, es de ésta.
> **NO decide el estilo** — `css-architect` (CSS) y `tailwind-engineer` (utilidades).
> **NO es la auditoría de accesibilidad** — `a11y-architect` audita WCAG, contraste, foco y screen
> readers. Ésta **elige el elemento nativo que hace innecesaria la mitad de esa auditoría**; ella
> verifica el resultado.
> **NO decide el copy** — `greenhouse-ux-writing` en el portal.
> En UI nueva de producto, `greenhouse-ai-design-studio` orquesta y ésta es un **lane de
> materialización**.

**Sello de frescura: verificado as-of 2026-07.** El **HTML semántico** es estable y no se reverifica.
Lo **volátil**: los elementos de plataforma nuevos (invoker commands, select personalizable,
`popover=hint`) y la superficie de React (19.2 movió bastante). Ver `SOURCES.md`.

---

## 0. La regla que ahorra más trabajo que ninguna otra

**Antes de construir un comportamiento, preguntá si la plataforma ya lo trae.** En 2025-2026 el
inventario cambió lo suficiente como para que el instinto esté desactualizado:

| Vas a construir… | Ya existe |
|---|---|
| modal con foco atrapado, ESC, backdrop, top layer | `<dialog>` + `showModal()` |
| dropdown / menú / tooltip que sale del `overflow` | atributo `popover` (top layer) + anchor positioning |
| botón que abre/cierra otra cosa | **invoker commands** (`command` + `commandfor`), sin JS |
| acordeón | `<details>` / `<summary>` (+ `::details-content` para animarlo) |
| select estilizado desde cero | **customizable select** (`appearance: base-select`) |
| autosize de textarea | `field-sizing: content` |
| validación básica de formulario | atributos nativos + `:user-invalid` |
| tabla ordenable | `<table>` real + `aria-sort` |

Cada fila que aceptás borra JavaScript, borra bugs de accesibilidad **y borra una dependencia**. Cada
fila que rechazás tiene que tener una razón escrita. Detalle en `references/platform-elements.md`.

**El corolario incómodo:** un `<div>` con `onClick` y `role="button"` es *siempre* peor que un
`<button>`. No es purismo — es que el `<div>` no tiene foco, no responde a Enter/Espacio, no aparece
en la lista de controles del lector de pantalla, no respeta `forced-colors` y no se envía en un form.
Cada una de esas hay que reimplementarla y ninguna sale gratis.

---

## 1. Router — qué cargar

```
├─ ¿Qué elemento uso? landmarks, headings, listas,
│  tablas, ARIA-vs-nativo ........................ references/semantic-html.md
├─ Comportamiento de plataforma: dialog, popover,
│  invoker commands, details, select, forms ...... references/platform-elements.md
├─ Componer el componente: hooks, forms API,
│  estado, refs, keys, Compiler .................. references/react19-components.md
└─ ¿Sigue vigente lo que voy a afirmar? ......... SOURCES.md
```

---

## 2. HTML: los cinco que importan

1. **Landmarks.** `<header>`, `<nav>`, `<main>` (uno solo), `<aside>`, `<footer>`, `<search>`. Un
   lector de pantalla navega por landmarks igual que un vidente por regiones visuales. Una página de
   puros `<div>` es, para ese usuario, una sola masa sin estructura.
2. **Encabezados = índice, no tamaño.** `h1..h6` describen la jerarquía del **contenido**. Nunca se
   elige un `h3` "porque el `h2` es muy grande" — eso se resuelve con estilo. Sin saltos de nivel.
3. **Listas para lo que es una lista.** Nav, menús, tarjetas, resultados, breadcrumbs. El lector
   anuncia "lista de 12 elementos"; un contenedor de `div`s no anuncia nada.
4. **Tablas para datos tabulares.** `<thead>`, `<th scope>`, `<caption>`. Y **nunca** para layout.
5. **Formularios con `<form>` de verdad.** `<label for>` siempre; `autocomplete` correcto (esto es
   accesibilidad **y** conversión); `type` correcto para el teclado móvil; `name` en cada control.

Detalle y casos de borde en `references/semantic-html.md`.

---

## 3. React: cómo se compone un componente

### 3.1 Estado — el orden de preferencia

```
1. ¿Se puede derivar de props/estado existente?  → derivalo, no lo guardes
2. ¿Es estado de la URL?                          → que viva en la URL
3. ¿Es estado del servidor?                       → cache de datos, no useState
4. ¿Es de UN componente?                          → useState
5. ¿De un subárbol?                               → context (o composición, mejor)
6. ¿Global de verdad?                             → store
```

**El bug de estado más común es duplicarlo.** Un `useState` que se sincroniza con una prop vía
`useEffect` es casi siempre estado derivado mal modelado. Si lo podés calcular durante el render,
calculalo.

### 3.2 Con React Compiler, no memoices a mano

React Compiler llegó a **1.0** y está activo en `efeonce-globe` (pin exacto `1.0.0`).
**Donde el compiler corre, `useMemo`/`useCallback`/`React.memo` por performance sobran** — y peor: la
memoización manual puede impedirle optimizar. Lo que sí importa es que los componentes sean **puros**:
el compiler se abstiene cuando detecta efectos secundarios escondidos.

`useMemo` sigue siendo legítimo por **semántica**, no por performance: preservar identidad referencial
cuando algo depende de ella (una dependencia de efecto, una key de cache).

### 3.3 Efectos — la mayoría no deberían existir

No necesitás un efecto para: transformar datos para el render, responder a un evento del usuario,
resetear estado cuando cambia una prop (usá `key`), ni calcular algo derivado.

Sí lo necesitás para **sincronizar con algo externo**: suscripciones, `IntersectionObserver`, timers,
APIs no-React.

**`useEffectEvent` (19.2)** resuelve el problema estructural de las dependencias: separa la lógica de
"evento" de la del efecto, para que las deps reflejen dependencias reales y no todo lo que el callback
toca.

```js
const onConnected = useEffectEvent(() => {
  showNotification('Connected!', theme);
});
useEffect(() => {
  connection.on('connected', () => onConnected());
}, [roomId]);   // theme queda afuera: no re-conecta al cambiar el tema
```

Es la alternativa correcta al patrón de "quito la dep y le pongo un eslint-disable".

### 3.4 Formularios — la API de React 19

`useActionState` + `useFormStatus` + `useOptimistic` reemplazan el trío
`useState`/`isLoading`/`error` escrito a mano en cada formulario. Ver
`references/react19-components.md`.

⚠️ **Realidad del ecosistema (verificado 2026-07):** en `greenhouse-eo` hay **931 archivos con
`'use client'`, 0 `useActionState`, 0 `useOptimistic`, 0 `'use server'`, 3 `Suspense`**. Toda la
mutación va por API routes + fetch cliente. React 19 es **greenfield** en los tres repos.

Eso significa dos cosas: (a) no asumas que el patrón nuevo es el idiom local — no lo es; (b)
**introducirlo es una decisión de arquitectura, no de componente**. Si la task lo amerita, pasa por
`frontend-architect` y respeta el contrato de Full API Parity del repo (toda capacidad necesita su
contrato programático gobernado; un Server Action que muta sin pasar por el command canónico lo viola).

### 3.5 Composición antes que props

Cuando un componente acumula props booleanas (`isCompact`, `hasIcon`, `showFooter`), el problema no es
la cantidad: es que está tratando de ser N componentes. Las salidas, en orden de preferencia:
**children / slots** → **compound components** → **una prop `variant` con valores cerrados**. Última
opción: más booleanas.

En Greenhouse hay una regla previa: **buscá la primitive existente antes de construir**
(Greenhouse primitive → wrapper Vuexy `Custom*` → MUI base). Nacer una primitive nueva tiene su propio
protocolo — ver `greenhouse-product-ui-architect`.

---

## 4. Hard rules (NUNCA / SIEMPRE)

- **NUNCA `<div onClick>`** para algo clickeable. `<button type="button">` (acción) o `<a href>`
  (navegación). Si no navega, no es un link.
- **NUNCA reimplementes un comportamiento que la plataforma trae** sin una razón escrita. Ver §0.
- **NUNCA pongas ARIA sobre un elemento que ya lo dice.** `role="button"` en un `<button>` es ruido;
  ARIA mal puesto es **peor** que sin ARIA porque miente.
- **NUNCA elijas un nivel de encabezado por su tamaño visual.**
- **NUNCA uses el índice del array como `key`** en una lista que se reordena, filtra o inserta.
- **NUNCA sincronices una prop a estado con `useEffect`.** Derivá, o remontá con `key`.
- **NUNCA memoices a mano por performance donde corre React Compiler.**
- **NUNCA metas lógica de negocio en el componente** si puede afectar datos, permisos o estado
  persistente: va a un command/reader canónico en `src/lib/**` (Full API Parity).
- **SIEMPRE** `<label for>` asociado; placeholder **no** es label.
- **SIEMPRE** `autocomplete` correcto en campos de identidad, dirección y pago.
- **SIEMPRE** un `<main>`, un `<h1>`, y jerarquía de headings sin saltos.
- **SIEMPRE** que uses un elemento de plataforma nuevo, verificá soporte y dejá el fallback escrito
  (o la decisión de no tenerlo).
- **SIEMPRE** que el componente cambie orden de foco, agregue un modal, o introduzca ARIA no trivial:
  pasa por `a11y-architect`.

---

## 5. Sinergias — quién decide qué

| Skill | Decide | Frontera con ésta |
|---|---|---|
| `frontend-architect` | **RSC, hydration, streaming, Server Actions como arquitectura, boundaries `'use client'`** | *Dónde corre* el código es de ella; *cómo se estructura el componente* es de ésta. Ante duda de topología → ella. |
| `greenhouse-ai-design-studio` | el loop de UI nueva, artefactos, gate de score | **Orquestador.** Ésta es un lane. |
| `greenhouse-product-ui-architect` | primitive/variant/kind, Composition Shell, recetas Greenhouse | Ella decide **qué primitive** existe y su protocolo; ésta, el markup y la composición interna. |
| `a11y-architect` | WCAG, contraste, foco, screen readers, forced-colors | Ésta **elige el elemento nativo**; ella **audita el resultado**. Modal, orden de foco o ARIA no trivial → pasa por ella. |
| `css-architect` | cascada, capas, layout, pseudos | Frontera compartida: el elemento es de ésta, `::details-content` / `::picker(select)` / `:popover-open` son de ella. |
| `tailwind-engineer` | theme y utilidades | El `className` vive en el JSX de ésta; su **contenido** es de ella. |
| `forms-ux` | timing de validación, errores, wizards, autosave, máscaras | Ella decide **la experiencia** del formulario; ésta, **el markup y la API de React** que la implementan. |
| `state-design` | los 12 estados de UI (loading, vacío, error, degradado…) | Ella decide qué estados existen y qué comunican; ésta los implementa. |
| `motion-design` | duración, curva, coreografía | Ella decide; ésta expone los ganchos (`<Activity>`, transiciones, keys). |
| `greenhouse-ux-writing` | todo string visible en el portal | **Ningún literal de copy** se escribe sin ella dentro de Greenhouse. |
| `webmcp` | exponer capacidades de la página a agentes | Complementaria: markup semántico hace la página legible para agentes; ella define el contrato. |

---

## 6. Cierre

- [ ] Cada elemento es el semánticamente correcto; cero `div` clickeables.
- [ ] Un `<main>`, un `<h1>`, headings sin saltos, landmarks presentes.
- [ ] Revisé §0: no reimplementé nada que la plataforma ya trae (o está justificado por escrito).
- [ ] Formularios: `<label for>`, `autocomplete`, `type` y `name` correctos.
- [ ] ARIA solo donde el elemento nativo no alcanza, y verificado — no inventado.
- [ ] Estado: nada duplicado, nada derivable guardado, `key` estable en listas.
- [ ] Donde corre React Compiler: sin memoización manual por performance.
- [ ] Si hay modal, cambio de orden de foco o ARIA no trivial: pasó por `a11y-architect`.
- [ ] Si introduje un patrón nuevo de React 19 en el repo: pasó por `frontend-architect` y respeta
      Full API Parity.

## Version

- **v1.0** — 2026-07-27 — Pinea el HTML de plataforma verificado a 2026-07 (invoker commands Baseline
  2025-12, customizable select, `popover=hint`, `::details-content`) y React 19.2 (`<Activity>`,
  `useEffectEvent`, `cacheSignal`, partial pre-rendering, SSR batching; React Compiler 1.0). Registra
  que React 19 es greenfield en los tres repos del ecosistema.
