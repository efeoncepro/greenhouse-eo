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
| El footer apunta a `/legal/terms`, ruta inexistente → devuelve **JSON crudo** al browser | Fuga de error técnico a un externo |
| **Cero** canary visual | Cualquier regresión pasa sin ser vista |

## Visual Direction Contract

- **Source duradero:** ⚠️ **NO existe todavía** una dirección visual aprobada para el share board.
  El `approved-prototype.dc.html` de `TASK-1505` es el target del **Producer**, no de esta superficie.
- **Modo:** `repo-native-benchmark` — la dirección se deriva del sistema visual de Globe (isotipo, wordmark,
  paleta dark, Tabler icons) ya presente en `producer-ui.ts`, elevada al SSOT de tokens que esta task crea.
- **Gate:** por eso `UI ready` queda en **`no`**. La dirección visual se produce en Discovery con
  `design-studio` + `product-design-loop` (2-3 direcciones comparadas, una elegida, asset durable persistido)
  **antes** de escribir JSX. **No se inventa aquí.**
- **Targets:** desktop `1440×1000` · mobile `390×844`.
- **Action hierarchy:** el activo es el héroe; la identidad de Efeonce/Globe es marco, no protagonista;
  los comentarios son lectura secundaria; **no hay acciones de escritura** (el grant es read-only).

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
│ FOOTER   Efeonce · sin links muertos                          │
└──────────────────────────────────────────────────────────────┘

mobile 390px → STAGE arriba (full-bleed), PANEL debajo, scroll vertical único
```

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

| Estado | Qué ve el cliente |
|---|---|
| **Default** | Activo + hechos + comentarios |
| **Loading** | Skeleton dimensionado al activo (no spinner de página); `aria-busy` en el stage |
| **Empty (sin comentarios)** | "Todavía no hay comentarios en esta revisión" — sin CTA (no puede escribir) |
| **`authentication_required`** | El enlace **venció o fue revocado**: mensaje claro + a quién pedirle uno nuevo. `role="alert"` |
| **`not_found`** | "Este enlace ya no existe" — sin revelar si existió (el rechazo de propiedad colapsa a `not_found` por diseño) |
| **`access_denied`** | Fallo de prueba del grant (firmado mal/editado) — distinto de `not_found`, y así debe leerse |
| **`dependency_unavailable`** | "No pudimos cargar la pieza. Reintentá en unos minutos." **+ botón Reintentar** (es el único estado retryable) |
| **Long content** | Muchos comentarios → el panel scrollea, el stage queda fijo en desktop |
| **Mobile / compact** | Una columna, stage full-bleed |
| **Keyboard / focus** | Foco visible en el reintento y en cada comentario enfocable; `:focus-visible`, ≥3:1 |
| **Reduced motion** | Sin fade del stage; el skeleton no titila |

**Regla dura (Delta ADR-005):** los cuatro códigos **nunca** colapsan en un preview roto genérico.
`authentication_required` es UX de re-solicitud de enlace, **jamás** "falta el medio".

## Copy

Todo el copy visible sale de la **capa de copy nueva** (`apps/studio-client/src/copy/`), en es-CL,
validado con `greenhouse-ux-writing`. **Cero literales en JSX.** Motivo no cosmético: el **nombre público del
producto y de la moneda todavía no están decididos** (`Globe Credits` está bloqueado), y el ICP es multi-mercado
— la capa nace lista para locale aunque hoy sirva un solo idioma.

Copy que **desaparece**: el rótulo `Producer` de esta página (es una superficie interna) y el link a `/legal/terms`
(o se implementa la ruta, o se retira el link — no puede quedar devolviendo JSON).

## Implementation Mapping

- **Route / surface:** `GET /shares/:shareId` (sin sesión) → `renderShell()` de `apps/studio-web/src/shell.ts` + la superficie montada en `#globe-root`.
- **Repo / paths:**
  - `apps/studio-web/src/shell.ts` — **ya existe** (`TASK-1556`); esta task lo consume y retira `renderPublicSharePage`.
  - `apps/studio-web/src/assets.ts` — +entradas del bundle (allowlist explícito ya existente).
  - `apps/studio-client/src/routes/share/` 🆕 — la superficie.
  - `apps/studio-client/src/tokens/tokens.ts` — **SSOT ya existente**; se consume, no se re-crea. Ojo con `LEGACY_TOKEN_DRIFT`: los valores del share board divergen y adoptarlos es cambio visible deliberado (dos en `producer-ui.ts`, uno en `ui.ts`, uno en `public-share-ui.ts`).
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
- **Quality profile:** `premium` (rigor `ui-standard`).
- **Required steps:** cargar con token válido · token vencido · `dependency_unavailable` inyectado · sin comentarios.
- **Required captures:** first fold desktop · first fold mobile · estado vencido · estado degradado · empty de comentarios.
- **Required `data-capture` markers:** `share-header`, `share-stage`, `share-panel`, `share-comments`, `share-state`.
- **Assertions:** `scrollWidth <= clientWidth` en ambos viewports · el DOM **no contiene** el slug del proveedor,
  ni `house`, ni costo/margen · el rótulo `Producer` **no aparece** · ningún link devuelve JSON.
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
- **Open risks:** (1) la dirección visual del share board no existe → Discovery la produce, `UI ready: no` hasta
  entonces; (2) compatibilidad `react-router@8.3.0` sobre Vite 8 sin confirmar → compuerta del seam;
  (3) semántica CJS estricta de Rolldown → el smoke de producción es obligatorio, CI no la atrapa.

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
