# Wireframe — TASK-1558 · Globe Share Board (la cara del cliente)

> **Superficie:** `GET /shares/:shareId` de Efeonce Globe — **la única cara de Globe que ve un cliente externo hoy**.
> **Repo de implementación:** `efeonce-globe` (`apps/studio-client`, nuevo). Doc gobernante: Greenhouse.
> **ADR:** [`EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) (ADR-014) — **Slice 1 de la ADR**.
> **Foundation:** `TASK-1556` (Slices 1-3 de esa task), ya cerrada: el payload cliente, el SSOT de tokens, la capa de copy y los gates existen y se consumen.

## Por qué esta superficie primero

Globe es un **producto comercial** (ADR-010). Su Producer es internal-only por gate duro de identidad
(`isEligibleInternalIdentity`: `tenantId==='efeonce'` + `tenantType==='efeonce_internal'` + `roles.length===0`),
así que **ningún cliente puede obtener sesión**. La **única** superficie client-facing es este share board, servido
**sin sesión** (evaluado antes del guard), y hoy está en el peor estado del repo:

| Hecho verificado | Consecuencia |
|---|---|
| `public-share-ui.ts` son **15 líneas**, con 3.071 caracteres de CSS en **una sola línea** | Ilegible, no editable, no linteable |
| Sus tokens de marca están **re-tipeados a mano y ya driftearon** (`--surface` `.62` vs `.5`; `--line` `.18` vs `.12`) | La cara del cliente no coincide con la marca del producto |
| Se auto-rotula **`Producer`** | El cliente ve el nombre de una superficie interna |
| **No tiene footer**: cero atribución, cero link legal, cero referencia de soporte (verificado: 0 `<footer>`, 0 `<a>`) | La cara comercial termina en el aire. El `/legal/terms` roto está en `producer-ui.ts:82`, no acá |
| Renderiza **valores crudos**: `changes_requested` y `2026-08-01T18:00:00.000Z` van directo a `dd.textContent` | El cliente lee identificadores internos y un ISO 8601 |
| Si los bytes fallan, el `.catch(fail)` **tira también los hechos y comentarios** | Es el "preview roto genérico" que ADR-005 prohíbe |
| **Cero** canary visual | Cualquier regresión pasa sin ser vista |

## Visual Direction Contract

- Visual direction mode: repo-native-benchmark
- Product Design asset: docs/ui/visual-directions/TASK-1558-globe-share-board-direction.md
- **Source duradero:** ✅ [`../visual-directions/TASK-1558-globe-share-board-direction.md`](../visual-directions/TASK-1558-globe-share-board-direction.md)
  (2026-07-25). Tres direcciones renderizadas con los valores reales del SSOT y las fuentes reales de Globe,
  mirada cada una a `1440×1000` y `390×844`; elegida **B "Lámina montada"** (passepartout + riel de líneas).
  El `approved-prototype.dc.html` de `TASK-1505` **no** es fuente acá: es el target del **Producer**.
- **Modo:** `repo-native-benchmark` — la dirección se deriva del sistema visual de Globe ya presente en
  `producer-ui.ts`, elevado al SSOT de tokens de `TASK-1556`.
- **Gate:** satisfecho. `UI ready` pasa a **`yes`**.
- **Targets:** desktop `1440×1000` · mobile `390×844`.
- **Action hierarchy:** el activo es el héroe; la identidad de Efeonce/Globe es marco, no protagonista;
  los comentarios son lectura secundaria; **no hay acciones de escritura** (el grant es read-only). La
  única acción de toda la superficie es **Reintentar**, y sólo existe en `partial` y `error`.
- **Decisión dominante:** el **margen** alrededor de la pieza (`contain`, nunca `cover`; sin viñeta ni
  tinte). Una superficie de revisión no puede recortar ni alterar el color del artefacto que se revisa.

## Layout — regiones

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                        │
│  [isotipo Globe]  Globe · <nombre público de la superficie>   │
│                                        [chip "Sólo lectura"]  │
├───────────────────────────────┬──────────────────────────────┤
│ STAGE                          │ PANEL                        │
│                                │                              │
│  <img|video|audio>             │  eyebrow: Revisión compartida│
│  servido por Blob URL          │  h1: Resultado creativo      │
│  (nunca URL pública de GCS)    │                              │
│                                │  nota de alcance del enlace  │
│                                │  ─────────────────────────── │
│                                │  <dl> hechos:                │
│                                │   · Modelo   (nombre+versión)│
│                                │   · Revisión                 │
│                                │   · Vence                    │
│                                │  ─────────────────────────── │
│                                │  Comentarios (read-only)     │
│                                │   · autor · fecha · texto    │
│                                │   · …                        │
├───────────────────────────────┴──────────────────────────────┤
│ FOOTER   [Efeonce]  alcance del enlace        Privacidad ↗    │
└──────────────────────────────────────────────────────────────┘

mobile 390px → STAGE arriba (full-bleed, techo 62svh), PANEL debajo, scroll vertical único
```

**El footer hoy NO EXISTE** (verificado: `grep footer public-share-ui.ts` = 0, y la superficie no tiene un
solo `<a>`). Nace acá con tres cosas y ninguna más: atribución Efeonce, el alcance del enlace en una línea,
y el link de privacidad **que sí existe y resuelve** (`https://efeonce.com/privacidad`).

## Contrato de datos y confidencialidad

El transporte **no cambia** (queda igual que hoy, verificado):

1. El token llega en el **fragment** de la URL (`location.hash`) — nunca en query, nunca al servidor.
2. Se borra del historial con `history.replaceState`.
3. Se promueve al header `authorization: Globe-Share <token>`, `credentials: 'omit'`.
4. Datos por `GET /v1/shares/resolve`; bytes por `GET /v1/shares/:id/media` → Blob URL local.

**Regla dura de audiencia (ADR-003 + `CREDIT_MODEL_V1.md:209-215`):** esta superficie es audiencia `client`.

| Se muestra | NUNCA se muestra |
|---|---|
| **Nombre + versión** del modelo ("Seedance · 2.0") — ancla de posicionamiento | El **slug** del proveedor (`bytedance/seedance-2.0/…`) |
| Revisión, vencimiento del enlace | El **costo del vendor** y el **margen** de Efeonce |
| Comentarios visibles para el cliente | La taxonomía interna `house` (operator-only) |
| | Prompts internos, endpoints, correlation IDs técnicos, datos de otro workspace |

En el payload nuevo esto deja de depender de la memoria de quien edita: la proyección `client` es un tipo,
y filtrar un campo prohibido es error de compilación.

## Estados

### ⚠️ Recalibración 2026-07-25 — el runtime sólo distingue dos fallos, y es a propósito

La versión anterior de esta tabla pedía `authentication_required`, `not_found` y `access_denied` como
**tres estados visibles distintos**. **Eso no se puede construir sin cambiar el BFF, y cambiarlo sería una
regresión de seguridad.** Verificado en `apps/studio-web/src/app.ts:4143`:

```ts
// Collapse invalid, expired, revoked, wrong-target and denied grants into one non-enumerable
// response. Only infrastructure outages remain distinguishable so the client can retry.
```

Un grant inválido, vencido, revocado, de otro target o denegado devuelven **el mismo 404**. Sólo
`dependency_unavailable` sobrevive como 503. Eso es **no-enumerabilidad**: decirle a un desconocido sin
sesión *por qué* falló su grant es exactamente el oráculo que un atacante necesita.

Y la regla de ADR-005 que se citaba está **fuera de alcance para esta superficie**: su texto
(`EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`, §Delta) gobierna el **feed reader del Producer**
—autenticado, con `TASK-1526` como consumer— no el share público. Lo que la regla exige de verdad es que
**ningún fallo colapse en "preview roto genérico"** y que `authentication_required` sea UX de
re-solicitud y no "falta el medio". Eso sí se cumple, y con los estados de abajo.

`Out of Scope` de la task ya prohibía tocar el BFF; la recalibración lo respeta en vez de contradecirlo.

### La unión discriminada real (5 estados)

`authentication_required` **sí es distinguible** — pero **client-side, no por respuesta del servidor**: el
cliente sabe si el fragment traía token. Un enlace pegado sin su `#token` (lo strippeó un cliente de
correo, o se copió de la barra después del `replaceState`) es una situación genuinamente distinta de un
grant rechazado, y merece su propio copy.

| Estado | Disparador | Qué ve el cliente | ARIA | Retryable |
|---|---|---|---|---|
| **`loading`** | inicial | Skeleton dimensionado al stage + placeholders del riel. **Nunca** spinner de página | `aria-busy="true"` en el stage; `role="status"` | — |
| **`ready`** | resolve 200 + media 200 | Pieza montada + hechos + comentarios | — | — |
| **`link_incomplete`** | **sin token en el fragment** | "El enlace está incompleto o venció" + pedir uno nuevo a quien lo compartió | `role="alert"` | **no** |
| **`unavailable`** | **404** (colapsado) | "Este enlace ya no está disponible" — sin revelar cuál de las cinco causas | `role="alert"` | **no** |
| **`degraded`** | **503** `dependency_unavailable` | "No pudimos cargar la pieza" + **Reintentar** | `role="status"` | **sí — el único** |

`role="alert"` en los dos estados terminales porque el cliente **tiene que reaccionar** (pedir otro
enlace); `role="status"` en el degradado porque es informativo y la acción ya está en pantalla.

### Variantes de presentación (no son estados de datos)

| Variante | Comportamiento |
|---|---|
| **Comentarios vacíos** | "Todavía no hay comentarios en esta revisión." **Sin CTA** — no puede escribir. Es el único empty state legítimo sin acción, y la razón se documenta |
| **Long content** | El riel scrollea; en desktop la lámina queda fija |
| **Mobile / compact** | Una columna: pieza a sangre con techo `62svh`, riel debajo |
| **Keyboard / focus** | `:focus-visible` ≥3:1 en Reintentar y en el link de privacidad. Tras un reintento el foco vuelve al botón. **Los comentarios NO son focusables**: son contenido, se leen, no se operan |
| **Reduced motion** | Sin fade del stage; el skeleton no pulsa |

**Regla dura que sí aplica:** ningún fallo se muestra como "preview roto". Los tres estados no-`ready`
tienen copy propio, y `link_incomplete` habla de re-solicitar el enlace, nunca de un medio faltante.

## Copy

Todo el copy visible sale de la **capa de copy nueva** (`apps/studio-client/src/copy/`), en es-CL,
validado con `greenhouse-ux-writing`. **Cero literales en JSX.** Motivo no cosmético: el **nombre público del
producto y de la moneda todavía no están decididos** (`Globe Credits` está bloqueado), y el ICP es multi-mercado
— la capa nace lista para locale aunque hoy sirva un solo idioma.

**Registro:** impersonal/neutro por defecto ("Este enlace es de sólo lectura", "No permite editar ni
descargar"). Donde el trato sea inevitable, **tuteo neutro** (`puedes`, nunca `podés`). El cliente es
externo y comercial: el impersonal evita el falso tú-a-tú sin caer en el usted de un contrato.

Copy que **desaparece**: el rótulo `Producer` de esta página (es una superficie interna).

**`/legal/terms` — resuelto: se retira el link, no se implementa la página.** Dos motivos.
(1) **El link no está en esta superficie**: verificado, `public-share-ui.ts` no tiene footer ni un solo
`<a>`; el `/legal/terms` roto vive en `producer-ui.ts:82`, el footer del **Producer** (interno). O sea el
share board nunca lo tuvo. (2) El footer nuevo necesita un link legal, y ya existe uno que resuelve:
`https://efeonce.com/privacidad`, absoluto y externo. Implementar una página de términos es un entregable
de contenido legal con su propio dueño, y un enlace de revisión read-only no es una superficie de
aceptación de términos. Se retira además la línea de `producer-ui.ts` (una línea, cero riesgo) porque es
una fuga viva de JSON a un browser y ADR-014 lo prohíbe explícitamente.

## Desktop Target

`1440×1000`. Grid de dos columnas: `minmax(0,1fr)` (stage) + `minmax(20rem,24rem)` (riel).

| Región | Alto/ancho | Composición |
|---|---|---|
| Topbar (sticky) | `~3.6rem` × full | isotipo Globe 26px + wordmark Poppins `1rem` + eyebrow "Revisión compartida"; a la derecha el chip "Sólo lectura" con punto `--action` |
| Stage | `1fr` × `1fr` | `place-items:center`, padding `clamp(1.25rem,2.6vw,2.5rem)`, halo radial `--action` 9%. La pieza: `max-height: calc(100svh - 8.5rem)`, **`object-fit: contain`**, `--radius-sm`, sombra + hairline |
| Riel | `1fr` × `20-24rem` | `border-left: 1px --line`, **sin fondo propio**. Eyebrow → h1 Poppins `1.55rem/1.2` → lede `.85rem/1.6` `max-width:34ch` → hechos separados por líneas → comentarios con barra `--line-strong` 2px |
| Footer | `~3.4rem` × full | `border-top`, atribución Efeonce + alcance del enlace + link de privacidad |

**Una sola sombra en toda la página** (la de la lámina) y **una sola superficie `contained`**. El riel se
separa con una línea, no con una card: ése es el presupuesto de chrome del fold.

## Mobile Target

`390×844`. Transformación real vía `@media (max-width: 60rem)`, no compresión.

| Región | Transformación |
|---|---|
| Topbar | igual, padding lateral reducido |
| Stage | **primero**, a sangre: `width:100%`, `border-radius:0`, **`max-height: 62svh`**, `contain` |
| Riel | debajo, `border-top` en vez de `border-left`, padding `1.5rem clamp(1.1rem,4vw,1.5rem) 1.75rem`; h1 baja a `1.4rem` |
| Footer | apilado, wrap permitido |

El **techo de `62svh`** es la decisión que hace la transformación honesta: sin él la pieza ocupa el
viewport entero y el riel queda detrás de un scroll que el cliente no sabe que existe. Con él, el título y
el primer hecho entran en el fold. `scrollWidth <= clientWidth` verificado a `390` **y a `320`**.

## Action Hierarchy

La superficie es **read-only**: el grant no concede escritura, descarga ni acceso al espacio.

| Nivel | Elemento | Presencia |
|---|---|---|
| Primaria | **Reintentar** | **Sólo** en `partial` y `error`. Es la única acción de toda la superficie |
| Secundaria | link de privacidad (externo) | Footer, siempre |
| Cero | comentarios, hechos, la pieza | **Contenido, no controles.** No son focusables ni clickeables |

**Anti-patrón bloqueante:** Reintentar visible en un estado no retryable. `denied` no ofrece reintentar
porque reintentar no arregla un enlace vencido — ofrece pedir uno nuevo, que es texto, no botón.

## Visual Fidelity Mapping

La dirección es intención; acá se convierte en token. Detalle completo en
[`../visual-directions/TASK-1558-globe-share-board-direction.md`](../visual-directions/TASK-1558-globe-share-board-direction.md) §Token mapping.

| Cue de la dirección | Token del SSOT | Nota |
|---|---|---|
| Fondo de página | `--canvas` + los dos radiales de `producer-ui.ts` | continuidad con el producto |
| Separadores (riel, filas de hechos, bordes de chrome) | `--line` | **adopta el canónico `.12`; hoy esta superficie tiene `.18`** |
| Barra de comentario, borde del chip | `--line-strong` | |
| Texto primario/secundario/terciario | `--text` / `--muted` / `--faint` | ramp, nunca opacidad arbitraria |
| Acento (foco, punto del chip) | `--action` | **hoy esta superficie lo llama `--blue`** |
| Punto de estado de revisión | `--warning` / `--success` | **siempre con label**; color nunca solo |
| Anillo de foco | `--focus` | ya canónico acá |
| Radios | `--radius-sm`, `999px` para el chip | |
| Sombra de la lámina | `--shadow` reforzada | única de la página |
| Fade del stage | `--duration-short` + `--ease-enter` | |
| Display / body | **`--font-display` / `--font-body` 🆕** | **no existen en el SSOT**; nacen acá |

**Cero HEX, cero duración literal, cero `fontFamily` literal en la superficie.** El SSOT es el único lugar
con valores. La superficie del riel **no usa `--surface`**: en esta dirección el riel no tiene fondo.

## Copy Ledger

Cada string visible sale de `copyFor().share` en `apps/studio-client/src/copy/index.ts`. **Cero literales
en JSX ni en `aria-label`/`title`/`alt`.** Registro impersonal; `puedes` si el trato es inevitable (nunca `podés`).

| Clave | Texto es-CL | Dónde |
|---|---|---|
| `documentTitle` | Globe · Revisión compartida | `<title>` |
| `brandTagline` | Revisión compartida | eyebrow del topbar |
| `readOnlyBadge` | Sólo lectura | chip del topbar |
| `readOnlyBadgeHint` | Este enlace no permite editar, descargar ni entrar al espacio de trabajo. | `title` del chip |
| `eyebrow` | Pieza compartida | eyebrow del riel |
| `headingFallback` | Resultado creativo | h1 cuando la pieza no trae título |
| `lede` | El equipo de Efeonce compartió esta pieza para que la revises. No permite editarla ni descargarla. | lede del riel |
| `factModel` | Modelo | `<dt>` |
| `factRevision` | Revisión | `<dt>` |
| `factExpires` | Vence | `<dt>` |
| `revisionApproved` | Aprobado | valor de `reviewStatus` |
| `revisionChangesRequested` | Con cambios pedidos | valor de `reviewStatus` |
| `revisionPending` | Sin revisión todavía | `reviewStatus` ausente |
| `factUnavailable` | Sin dato | hecho que el grant no proyecta — **nunca `—` a secas ni `0`** |
| `commentsHeading` | Comentarios del equipo | encabezado |
| `commentsEmpty` | Todavía no hay comentarios en esta revisión. | empty state, **sin CTA** |
| `mediaAlt` | Pieza creativa compartida para revisión | `alt` de la imagen |
| `stageLoading` | Cargando la pieza… | `aria-label` del skeleton |
| `retry` | Reintentar | único botón |
| `footerScope` | Este enlace es de sólo lectura y vence el {fecha}. | footer |
| `footerPrivacy` | Privacidad | link externo |
| `footerBrandAlt` | Efeonce | `alt` del wordmark |

Estados en §State Copy. **`Producer` no aparece en ninguna clave.**

## State Copy

Dos slots de datos, cada uno con su estado — es composición de degradación honesta, no un enum plano:
`board` (desde `/v1/shares/resolve`) y `media` (bytes desde `/v1/shares/:id/media`).

| Estado | Disparador real | Copy visible | Recuperación | ARIA |
|---|---|---|---|---|
| `loading` | primer fetch | "Cargando la pieza…" + skeleton dimensionado al stage y placeholders del riel | ninguna; **nunca spinner de página** | `aria-busy="true"` + `role="status"` en el stage |
| `ready` | `board` 200 + `media` 200 | pieza + título + hechos + comentarios | — | — |
| `empty` | `board` 200, `comments.length === 0` | "Todavía no hay comentarios en esta revisión." | **sin CTA** — no puede escribir, y prometer una acción inexistente sería peor que el vacío | — |
| `partial` | **`board` 200 pero `media` falla** | riel completo y legible + en el stage: "No pudimos cargar la pieza" + **Reintentar** | Reintentar **sólo los bytes**; los hechos y comentarios ya leídos **no se pierden** | `role="status"` en el bloque del stage; el riel queda intacto |
| `error` | `board` **503** `dependency_unavailable` | "No pudimos cargar esta revisión. Vuelve a intentar en unos minutos." + **Reintentar** | Reintentar; el foco vuelve al botón | `role="status"` |
| `denied` | `board` **404** (colapsado) **o** sin token en el fragment | 404: "Este enlace ya no está disponible." + "Pídele un enlace nuevo a la persona que te lo compartió." · sin token: "El enlace está incompleto." + la misma indicación | **ninguna** — no hay Reintentar: reintentar no revive un enlace vencido | `role="alert"` |

**`partial` es el estado que hoy no existe y es el que ADR-005 pide de verdad.** Hoy, si los bytes fallan,
el `.catch(fail)` tira **todo** —hechos y comentarios incluidos— y pinta el mensaje genérico: eso *es* el
"preview roto genérico" que la regla prohíbe. Con `partial`, lo que se pudo leer se muestra, y lo que falló
se declara en su propio slot con su propia recuperación.

**`denied` no enumera.** Vencido, revocado, firmado mal, de otro target y no-encontrado comparten copy a
propósito: el 404 del BFF es no enumerable y la UI no lo desarma.

## Accessibility Contract

Target: **WCAG 2.2 AA**. Superficie sin sesión, un solo control, contenido de lectura.

| Contrato | Decisión |
|---|---|
| Landmarks | `<header>` · `<main>` · `<aside>` (riel) · `<footer>`. `<h1>` único: el título de la pieza |
| Orden de foco | topbar → (Reintentar si existe) → link de privacidad. **3 tab-stops como máximo** |
| **Los comentarios NO son focusables** | Son contenido: se leen, no se operan. Un `tabindex="0"` sobre contenido convierte 3 stops en 10 y no agrega función |
| Anillo de foco | `outline: .16rem solid var(--focus)`, `outline-offset: .16rem`. **`outline`, no `box-shadow`** (sobrevive `forced-colors`). ≥3:1 contra el canvas **y** contra el fondo del control. **Nunca `outline: transparent`** como reserva de espacio |
| Nombre accesible | el botón dice "Reintentar" (visible, no `aria-label`). La imagen lleva `alt` desde `mediaAlt`. El isotipo es decorativo: `alt=""` |
| `aria-busy` | `true` en el stage mientras carga; se **retira** al resolver |
| `role="alert"` | los dos casos de `denied`: el cliente tiene que reaccionar (pedir otro enlace) |
| `role="status"` | `loading`, `partial`, `error`: informativo, y la acción ya está en pantalla |
| Foco tras reintento | vuelve al botón Reintentar. Si el reintento tiene éxito el botón desaparece → el foco se mueve **antes** al `<h1>` del riel (`tabindex="-1"`), nunca al `<body>` |
| Contraste | texto ≥4,5:1 sobre el fondo **renderizado** (incluye los radiales); `--faint` sólo en eyebrows ≥600 de peso, verificado, nunca en texto corrido |
| Estado por color | el punto de revisión **siempre** acompañado del label. Ningún estado se comunica sólo con color |
| Reduced motion | sin fade del stage; el skeleton no pulsa. El significado final es idéntico |
| Target size | el botón ≥44×44; el link del footer ≥24×24 con padding |
| Reflow | usable a **320px** con zoom 200% y los overrides de 1.4.12 (line-height 1.5, letter .12em, word .16em) |
| `forced-colors` | el anillo sobrevive; la pieza no depende de background-image para su affordance |
| Idioma | `<html lang="es">` |

**Verificación:** `axe-core` limpio + recorrido de teclado real + captura con
`prefers-reduced-motion: reduce` + medición de `scrollWidth` **en los paneles, no sólo en el documento**
(un contenedor con `overflow-y:auto` fuerza `overflow-x:auto` y el desborde scrollea adentro).

## Implementation Mapping

- **Route / surface:** `GET /shares/:shareId` (sin sesión) → `renderShell()` de `apps/studio-web/src/shell.ts` + la superficie montada en `#globe-root`.
- **Repo / paths:**
  - `apps/studio-web/src/shell.ts` — **ya existe** (`TASK-1556`); esta task lo consume y retira `renderPublicSharePage`.
  - `apps/studio-web/src/assets.ts` — +entradas del bundle (allowlist explícito ya existente).
  - `apps/studio-client/src/surfaces/share/` 🆕 — la superficie. **`surfaces/`, no `routes/`**: es la
    convención que el payload ya tiene (`src/surfaces/seam-probe.tsx`).
  - `apps/studio-client/src/tokens/tokens.ts` — **SSOT ya existente**; se consume, no se re-crea. Ojo con `LEGACY_TOKEN_DRIFT`: los valores del share board divergen y adoptarlos es cambio visible deliberado (dos en `producer-ui.ts`, uno en `ui.ts`, uno en `public-share-ui.ts`).
    **Delta:** el SSOT **no tiene tokens de tipografía** y Poppins/Geist están literales en `producer-ui.ts`.
    Esta task agrega `--font-display` / `--font-body` + los `@font-face` al SSOT — el gate de color y el de
    motion no cubren tipografía, así que hoy nada impide que una fuente se re-tipee a mano igual que pasó
    con los colores.
  - **Hueco de gate a cerrar en el mismo slice:** `src/gates/design-contract.test.ts` sólo camina
    `.ts|.tsx`. Si esta superficie introduce un `.css`, un `#hex` ahí pasaría limpio. La superficie declara
    sus estilos **desde TS** (o el gate se extiende a `.css` en el mismo commit).
  - `apps/studio-client/src/copy/index.ts` — capa de copy **ya existente**: se agrega la clave `share` al diccionario `es-CL`, no se crea una capa nueva.
  - `apps/studio-client/src/data/` 🆕 — cliente tipado del transporte del share; importa de `packages/contracts`.
- **Primitive / variant / kind:** nacen aquí las primeras primitives de Globe — `Surface`, `Chip`, `FactList`,
  `CommentItem`, `MediaStage`, `StateBlock` — declaradas en el scope de `TASK-1556` pero **NO entregadas** a propósito: diseñarlas sin una superficie a la que sirvan era especulativo. **Globe NO importa primitives, CompositionShell, MUI ni AXIS de
  Greenhouse** (`TASK-1540`): los tokens se materializan en Globe.
- **Data reader / command:** `GET /v1/shares/resolve` + `GET /v1/shares/:id/media` (existentes, sin cambio).
- **API parity:** ninguna capability nueva. La UI es cliente de contratos que ya existen.
- **Access / capability:** superficie sin sesión, autorizada **sólo** por el bearer `Globe-Share`; la autoridad
  se re-verifica server-side por request. **Ninguna lógica de autorización cruza al cliente.**
- **States to implement:** los 10 de la tabla anterior.

## GVC Scenario Plan

> Globe **no** corre el GVC de Greenhouse (es otro repo, otro runtime). El equivalente canónico es el
> **fixture/canary propio de Globe**, que esta task extiende a la primera superficie client-facing.

- **Scenario file:** `apps/studio-client/scenarios/share-board.fixture.mjs` 🆕 (espeja `scripts/producer-gvc-fixture.mjs`).
- **Route:** `/shares/:shareId` con un share grant de prueba emitido por el flujo real.
- **Viewports:** `1440×1000` y `390×844`.
- Quality profile: premium (rigor `ui-standard`).
- **Required steps:** token válido · **sin token en el fragment** (`link_incomplete`) · 404 (`unavailable`) ·
  503 inyectado (`degraded`) · sin comentarios.
- **Required captures:** first fold desktop · first fold mobile · `link_incomplete` · `unavailable` ·
  `degraded` · empty de comentarios · reduced-motion.
- **Required `data-capture` markers:** `share-header`, `share-stage`, `share-panel`, `share-comments`,
  `share-state`, `share-footer`.
- **Assertions:** `scrollWidth <= clientWidth` en ambos viewports · el DOM **no contiene** el slug del
  proveedor, ni `house`, ni costo/margen · el rótulo `Producer` **no aparece** · **ni un ISO 8601 crudo ni
  un enum crudo** (`changes_requested`, `approved`) — es lo que la superficie de hoy sí filtra · el botón
  Reintentar existe **sólo** en `degraded` · `role="alert"` presente en los dos estados terminales ·
  `aria-busy` presente durante la carga · todo `<a>` resuelve a `text/html` o es externo absoluto.
- **Scroll-width checks:** sí, ambos viewports.
- **Reduced-motion / focus evidence:** captura con `prefers-reduced-motion: reduce` + recorrido de foco por teclado.
- **Review dossier:** `docs/ui/reviews/TASK-1558-globe-share-board/`.
- **Baseline decision / surface ID:** `globe.share-board` — **baseline nuevo** (hoy no existe ninguno).

## Design Decision Log

- **Decision:** el share board se reconstruye como componentes tipados sobre el SSOT de tokens, servido como
  bundle estático por el mismo `studio-web`; el transporte del grant y el trust boundary quedan intactos.
- **Alternatives considered:**
  - *Arreglar el CSS de una línea in situ* — rechazado: no arregla el drift de tokens, no habilita lint ni canary,
    y deja la superficie sin componentes para los estados.
  - *Empezar por el Producer* (más código, más visible internamente) — rechazado: el orden lo fija **quién mira
    la pantalla**, y el Producer no lo mira ningún cliente.
  - *Una superficie de validación desechable para el seam* — rechazado: sería trabajo tirado y un wireframe de
    relleno; el share board valida el mismo seam entregando valor real.
  - *Importar el design system de Greenhouse* — prohibido por `TASK-1540`.
- **Why this pattern:** es la superficie client-facing más chica del repo y la que peor está: máximo aprendizaje
  del seam, mínimo blast radius, y arregla una fuga real de calidad hacia el cliente.
- **Reuse / extend / new primitive:** `new` — nacen las primeras primitives de Globe. Es deliberado y es el
  entregable de plataforma de esta task.
- **Open risks:** (1) ~~dirección visual inexistente~~ **resuelta** 2026-07-25 (dirección B, doc durable);
  (2) ~~compat `react-router@8.3.0` sobre Vite 8~~ **resuelta** — compuerta (a) verde en `TASK-1556`;
  (3) semántica CJS estricta de Rolldown → el smoke de producción es obligatorio, CI no la atrapa;
  (4) el gate de diseño no cubre tipografía ni `.css` → los estilos nacen en TS y los tokens de fuente
  suben al SSOT en el mismo slice.
- **Delta de estados 2026-07-25:** los cuatro códigos de error NO son distinguibles desde el cliente porque
  el BFF los colapsa a un 404 no enumerable a propósito. La unión discriminada real tiene 5 miembros; ver
  §Estados. La regla de ADR-005 que pedía lo contrario gobierna el feed del Producer, no el share público.

## Visual verification

- **GVC scenario:** `share-board.fixture.mjs` (arriba).
- **Viewports:** `1440×1000`, `390×844`.
- **Scroll-width check:** obligatorio en ambos.
- **Accessibility/focus checks:** `:focus-visible` ≥3:1, orden de tabulación, `role="alert"` en el estado vencido,
  `aria-busy` en el stage durante carga, contraste ≥4.5:1 en texto.
- **Before/after evidence:** captura del share board actual **antes** de tocar nada — es la línea base que hoy no existe.
- **Known visual debt:** el resto de las superficies (`launch`, `error`, Producer) sigue en el payload viejo hasta
  sus slices; convivencia esperada y gobernada por el flag.
- **Visual scorecard:** `docs/ui/reviews/TASK-1558-globe-share-board.scorecard.json`
- **Quality threshold:** `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5` (estándar premium de Globe).
