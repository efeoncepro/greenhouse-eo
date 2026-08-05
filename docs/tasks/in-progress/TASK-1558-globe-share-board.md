# TASK-1558 — Globe Share Board sobre el payload cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1558-globe-share-board.md`
- Visual direction: `docs/ui/visual-directions/TASK-1558-globe-share-board-direction.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `LIVE 2026-07-25 — flag prendido y verificado en vivo; falta verificar el estado ready con un grant real`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- GitHub Issue: `TBD`

## Summary

Reconstruye el **share board** (`GET /shares/:shareId`) sobre el payload cliente que dejó `TASK-1556`.
Es la **única superficie que un cliente externo ve de Globe**, y hoy son 15 líneas con 3.071 caracteres de
CSS en una sola línea, tokens de marca re-tipeados que ya driftearon, un rótulo `Producer` que es el nombre
de una superficie interna y un link que devuelve JSON crudo a un browser. Es el **Slice 1 de ADR-014**.

## Why This Task Exists

Se separó de `TASK-1556` porque son dos trabajos con gates distintos, y mezclarlos habría bloqueado la
fundación detrás de una decisión de diseño.

`TASK-1556` entregó el sustrato —payload tipado, SSOT de tokens, capa de copy, gates— y **no necesitaba
dirección visual**: los tokens se adoptaron de `producer-ui.ts`, que ya existía. Esta task **sí la
necesita**, porque reconstruye una superficie que un cliente mira, y **no existe**: el
`approved-prototype.dc.html` de `TASK-1505` es el target del **Producer**, no de esta pantalla.

Ése era el gate `UI ready: no`, y no era burocracia: improvisar la única cara comercial de Globe es
exactamente lo que ADR-014 existe para impedir. **Cerrado el 2026-07-25**: tres direcciones renderizadas
con los tokens y fuentes reales, miradas en los dos targets, elegida la B ("Lámina montada").

## Goal

- El share board queda reconstruido con componentes tipados sobre el SSOT de tokens y la capa de copy.
- Sus **cinco estados reales** quedan implementados y distinguibles (`loading` · `ready` · `link_incomplete` · `unavailable` · `degraded`); sólo `degraded` ofrece reintentar. Ver §Delta de estados.
- Deja de auto-rotularse `Producer`, deja de filtrar enums e ISO 8601 crudos, y estrena footer con atribución + privacidad.
- Estrena su primer canary visual: hoy la única superficie client-facing **no tiene ninguno**.
- El flag `client_app_enabled` se puede prender con evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — **ADR-014**, cuyo
  **Slice 1** implementa esta task. Su Slice 0 ya lo entregó `TASK-1556`.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — ADR-005 §3/§4:
  trust boundary intacto. Su **Delta** (los cuatro códigos no colapsan) gobierna el **feed del Producer**,
  autenticado, no el share público: acá el BFF los colapsa a un 404 **no enumerable a propósito**
  (`app.ts:4143`). Lo que sí aplica es que ningún fallo se muestre como preview roto genérico.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — ADR-003: el
  **nombre** del modelo es público; el slug, el costo vendor y el margen **nunca** salen.

Reglas obligatorias:

- **NUNCA** tocar el transporte del grant: token en el fragment → header `Globe-Share` → `credentials:'omit'`.
- **NUNCA** meter lógica de autoridad en el cliente; la autoridad se re-verifica server-side por request.
- **NUNCA** declarar un `:root` ni un color/duración literal: son error de gate.
- **NUNCA** poner un string visible en JSX o en `aria-label`/`title`/`placeholder`/`alt`.
- **NUNCA** unificar por decreto un valor de `LEGACY_TOKEN_DRIFT` sin mirar el resultado: los del share
  board (`--surface` `.62`, `--line` `.18`) divergen del canónico y adoptarlos **es cambio visible**.
- **NUNCA** retirar `public-share-ui.ts` antes de que el canary del reemplazo esté verde.

## Normative Docs

- `docs/ui/wireframes/TASK-1558-globe-share-board.md` — regiones, contrato de audiencia, los cinco estados
  con su ARIA, implementation mapping, plan de canary y decision log.
- `docs/ui/visual-directions/TASK-1558-globe-share-board-direction.md` — la dirección aprobada: tesis,
  alternativas rechazadas con motivo, targets, mapeo a tokens, firma y anti-patrones.
- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md` — cómo correr y verificar los gates.
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` §209-215 — qué **nunca**
  se muestra.

## Dependencies & Impact

### Depends on

- **`TASK-1556`** (complete): `apps/studio-client`, `apps/studio-web/src/shell.ts`, el SSOT de tokens, la
  capa de copy, los gates y el flag ya existen. Esta task los **consume**.
- ✅ **Dirección visual aprobada** — `docs/ui/visual-directions/TASK-1558-globe-share-board-direction.md` (2026-07-25, dirección **B "Lámina montada"**). El bloqueo se levantó.

### Blocks / Impacts

- Desbloquea el flip de `client_app_enabled` (el canary de esta superficie es su evidencia).
- `TASK-1505` Slice 5 (UI del share) queda absorbido por esta task.
- Es el precedente de las primitives base para Storyboard (`TASK-1547`) y Video Effectiveness (`TASK-1540`).

### Files owned

En `efeonce-globe`:

- `apps/studio-client/src/surfaces/share/**` 🆕
- `apps/studio-client/src/data/**` 🆕 (cliente tipado del transporte del share)
- `apps/studio-client/src/copy/index.ts` (clave `share`; se extiende, no se duplica)
- `apps/studio-client/scripts/share-board-canary.mjs` 🆕
- `apps/studio-web/src/public-share-ui.ts` (se retira al final)
- `apps/studio-web/src/app.ts` (sólo la rama de render tras el flag)

En `greenhouse-eo`:

- `docs/ui/wireframes/TASK-1558-globe-share-board.md`
- `docs/ui/visual-directions/TASK-1558-globe-share-board-direction.md` ✅ (dirección aprobada)
- `docs/ui/reviews/TASK-1558-globe-share-board.scorecard.json` 🆕

## Current Repo State

### Already exists

- Todo el sustrato de `TASK-1556`: `apps/studio-client` (Vite + React + React Router), `shell.ts` con slot
  `criticalContent`, SSOT de tokens + `LEGACY_TOKEN_DRIFT`, capa de copy locale-keyed, ESLint + 3 gates,
  React Compiler, flag `client_app_enabled` (default `false`).
- El transporte del share: `GET /shares/:shareId`, `/v1/shares/resolve`, `/v1/shares/:id/media`.
- El patrón de canary: `apps/studio-client/scripts/seam-smoke-server.mjs` + `scripts/frontend/globe-client-seam-gate.mjs`.

### Gap

- ~~No hay dirección visual aprobada~~ → **resuelta** 2026-07-25 (dirección B).
- El SSOT de tokens **no tiene tokens de tipografía** (Poppins/Geist están literales en `producer-ui.ts`), y
  el gate de diseño no cubre tipografía ni `.css`. Ambos se cierran acá.
- La superficie de hoy **filtra valores crudos** al cliente: `changes_requested` y `2026-08-01T18:00:00.000Z`
  se renderizan verbatim (verificado en la línea base). No estaba declarado.
- La superficie de hoy **no tiene footer** (0 ocurrencias, 0 links). El `/legal/terms` roto está en
  `producer-ui.ts:82`, no acá.
- **Las primitives base no existen** (`Surface`, `Chip`, `FactList`, `CommentItem`, `MediaStage`,
  `StateBlock`): `TASK-1556` las declaró y deliberadamente no las entregó, porque diseñarlas sin una
  superficie a la que sirvan era especulativo. **Nacen acá.**
- El share board no tiene canary visual ni línea base.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-client` (repo hermano). En Greenhouse sólo doc gobernante.
- Future candidate home: `remain-shared`
- Boundary: consume **sólo** rutas del BFF same-origin y tipos de `@efeonce-globe/contracts`.
- Server/browser split: server = autoridad del grant y re-verificación por request; browser = render sin
  secretos ni lógica de autoridad.
- Build impact: `none` — viaja en el bundle que ya existe.
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: **cliente externo de Efeonce**, sin sesión, entrando por un enlace con token.
- Momento del flujo: revisión de una pieza creativa compartida read-only.
- Resultado perceptible: ve la pieza con acabado de producto comercial, sin nomenclatura interna ni errores técnicos.
- Friccion que reduce: hoy la superficie luce desalineada con la marca, se llama `Producer` y puede escupir JSON.
- No-goals UX: sin acciones de escritura, comentarios del cliente ni descargas — el grant es read-only.

### Surface & system decision

- Surface: `GET /shares/:shareId` (sin sesión).
- Composition Shell: `no aplica` — es de Greenhouse; Globe tiene su propio sistema (`TASK-1540`).
- Primitive decision: `new` — nacen acá las primeras primitives de Globe, y su promoción es entregable.
- Copy source: `apps/studio-client/src/copy/index.ts`, clave `share`.
- Access impact: `none` — autoriza el bearer `Globe-Share`, re-verificado server-side.

### State inventory

**Cinco estados de datos** (unión discriminada) + cinco variantes de presentación, en el wireframe §Estados
con su copy y ARIA: `loading` (skeleton dimensionado, `aria-busy`) · `ready` · `link_incomplete`
(`role="alert"`, sin token en el fragment) · `unavailable` (`role="alert"`, 404 colapsado) · `degraded`
(`role="status"`, **único con Reintentar**). Variantes: comentarios vacíos · long content · mobile 390px ·
keyboard/focus · reduced motion.

> **Delta 2026-07-25.** La versión original pedía `authentication_required`/`not_found`/`access_denied` como
> tres estados visibles. El BFF los colapsa a un 404 **no enumerable a propósito** (`app.ts:4143`) y esta
> task tiene prohibido tocar el BFF; enumerarlos sería un oráculo de grants. `authentication_required` se
> conserva como `link_incomplete`, que **sí** es distinguible client-side (el cliente sabe si el fragment
> traía token).

### Interaction contract

Ver wireframe. Foco visible ≥3:1; tras un reintento el foco vuelve al botón; skeleton dimensionado al
activo, nunca spinner de página; `role="alert"` sólo para el enlace vencido.

### Motion & microinteractions

- Motion primitive: `CSS`, con `--duration-short` / `--ease-enter` del SSOT.
- Enter/exit: fade corto del stage al resolver el activo. Sin motion decorativo.
- Reduced-motion: sin fade; el skeleton no titila.

### Implementation mapping

Ver wireframe §Implementation Mapping.

### GVC scenario plan

- Quality profile: `premium` (rigor `ui-standard`).
- Viewports: desktop `1440×1000` + mobile `390×844`; `scroll-width` medido en ambos y también a `320`.
- Review dossier: `docs/ui/reviews/TASK-1558-globe-share-board/`.
- Baseline: `globe.share-board` — **baseline nuevo**, hoy no existe ninguno.

Detalle en wireframe §GVC Scenario Plan. Globe no corre el GVC de Greenhouse: el equivalente es un canary
propio siguiendo el patrón `seam-smoke-server.mjs` + driver Playwright en `scripts/frontend/`.

### Design decision log

Ver wireframe §Design Decision Log.

### Visual verification

Ver wireframe §Visual verification. Incluye **captura del estado actual antes de tocar nada** — la línea
base que hoy no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dirección visual ✅ (2026-07-25)

- Tres direcciones **renderizadas** con los valores del SSOT y las fuentes reales de Globe, miradas a
  `1440×1000` y `390×844`: A "Cine", B "Lámina montada", C "Ficha de revisión".
- **Elegida B.** A rechazada por descalificante (`cover` recorta la pieza y la viñeta le altera el color:
  corrompe el artefacto bajo revisión); C rechazada porque degrada la pieza a ilustración de documento.
- Asset durable: `docs/ui/visual-directions/TASK-1558-globe-share-board-direction.md`.
- Línea base "antes" capturada (default desktop+mobile y `unavailable`) — no existía.

### Slice 2 — Primitives base + superficie

- Primitives sobre el SSOT de tokens, nacidas sirviendo a esta superficie.
- Tokens de tipografía (`--font-display`/`--font-body` + `@font-face`) suben al SSOT.
- El share board con sus cinco estados, copy desde `copyFor().share`; footer nuevo.
- Se retira el rótulo `Producer`. **`/legal/terms`: se retira el link** (está en `producer-ui.ts:82`, no en
  esta superficie; el footer nuevo usa `https://efeonce.com/privacidad`, que sí resuelve).

### Slice 3 — Canary y cutover (canary ✅ / cutover pendiente)

- ✅ Canary visual del share board: **6 estados × 3 anchos** (`1440×1000`, `390×844`, `320×844`),
  assertion de no-fuga sobre el HTML servido (sin slug, `house`, costo, margen, `Producer`, ISO 8601 ni
  enum crudo), overflow medido **por panel**, y Reintentar/`role=alert` verificados por estado.
  Encontró dos bugs reales antes del commit: el chip decidía el ancho de la página a 320px y el bloque
  de estado de `partial` quedaba pegado arriba en vez de centrado.
- ✅ **Flip ejecutado 2026-07-25.** Precondición que faltaba y nadie había visto: el flag estaba declarado
  en `variables.tf` y **conectado a nada** (`grep` lo devolvía una sola vez), así que el flip habría dado un
  plan vacío. Se cableó al `dynamic "env"` de `studio_web` (`efeonce-globe` `2074a76`), se aplicó en `false`
  (revisión `00069`), se desplegó el SHA `85dac33b03b1` (revisión `00070`, share board todavía legacy con el
  flag OFF — el strangler verificado en vivo), y recién entonces el flip a `true` (revisión `00071`).
  Los dos planes: `0 to add, 1 to change, 0 to destroy`, sin replace de Cloud Run.
- ⏳ Retiro de `public-share-ui.ts`: sigue pendiente y **es correcto que lo esté**. La regla dura de ADR-014
  exige cobertura equivalente en runtime, y falta exactamente eso: el estado `ready` con un grant real. Es
  `TASK-1560`.

## Out of Scope

- **Crear el SSOT de tokens, la capa de copy o los gates** — los entregó `TASK-1556`; acá se consumen.
- Producer, launch y error: siguen en el payload viejo hasta sus propios slices.
- Cualquier cambio al BFF, la sesión, la CSP, el ALB o la API privada.
- Cloud CDN (`TASK-1557`) y dimensionamiento de runtime (`TASK-1521`).

## Detailed Spec

El detalle no se duplica acá: vive en `docs/ui/wireframes/TASK-1558-globe-share-board.md` — regiones y
layout, contrato de audiencia (qué se muestra y qué **nunca**), los diez estados con su copy y su ARIA,
implementation mapping con paths reales, plan de canary y decision log con cuatro alternativas rechazadas.

Lo que esta task **no** re-decide, porque `TASK-1556` ya lo entregó y está en `main` de `efeonce-globe`:
el payload (`apps/studio-client`, Vite 8.1.5 + React 19.2.8 + React Router 8.3.0, SSR apagado), el shell
por request con su slot `criticalContent`, el SSOT de tokens con `LEGACY_TOKEN_DRIFT`, la capa de copy
locale-keyed, los 6 gates y el flag `client_app_enabled`.

El transporte del grant tampoco cambia: token en el fragment → `history.replaceState` → header
`Globe-Share` → `credentials:'omit'` → datos por `/v1/shares/resolve` y bytes por `/v1/shares/:id/media`
como Blob URL.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (dirección visual) → Slice 2 (primitives + superficie) → Slice 3 (canary + cutover).
**El Slice 2 no arranca sin la dirección aprobada**, y el Slice 3 no flipea el flag sin canary verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El reemplazo queda peor que el actual | UI / percepción comercial | medium | Captura before/after obligatoria; scorecard con piso 4; review sin `BLOCK` | Scorecard bajo umbral |
| Fuga de slug/costo/margen a audiencia `client` | Confidencialidad comercial | low | Proyección tipada + assertion del canary sobre el DOM | Assertion en rojo |
| Regresión del transporte del grant | Seguridad | low | El transporte **no se toca**; smoke con grant real | Share que deja de resolver |
| Adoptar el canónico de tokens cambia el aspecto sin querer | UI | medium | `LEGACY_TOKEN_DRIFT` lo declara; el cambio es deliberado y se mira | Diff visual inesperado |
| Primitives sobre-diseñadas para una sola superficie | Plataforma | medium | Nacen sirviendo a esta superficie; su promoción se propone, no se asume | Primitive con un solo consumer y muchas props |

### Feature flags / cutover

`client_app_enabled` (Terraform, default `false`). Flip sólo tras canary verde. Revert: `false` + apply, <10 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A — sólo produce documentación de diseño | — | sí |
| Slice 2 | Revert PR; el flag sigue en `false`, nada cambió en runtime | <15 min | sí |
| Slice 3 | Flag a `false` + apply → vuelve el share board viejo intacto | <10 min | sí |

### Production verification sequence

1. Dirección visual aprobada y persistida; `UI ready: yes` con `task:lint` limpio.
2. Slice 2 en `main` con flag `false` → `pnpm check` + `pnpm build` + gates verdes.
3. Canary del share board en ambos viewports + estados vencido/degradado + assertion de no-fuga.
4. Scorecard ≥4,5 promedio, piso 4 → review sin `BLOCK`.
5. Flip del flag → verificar `/shares/:shareId` con un grant real, desktop y mobile.
6. Retiro de `public-share-ui.ts` + gates verdes.

### Out-of-band coordination required

`N/A — repo-only`, salvo la decisión de producto/legal sobre `/legal/terms`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe dirección visual aprobada y persistida; `UI ready: yes` con `pnpm task:lint --task TASK-1558` limpio.
- [x] Los **cinco estados** están implementados y distinguibles, y sólo `degraded` ofrece Reintentar.
      Los tres fallos no-`ready` tienen copy propio: ninguno se muestra como preview roto genérico.
      **NO** se exige distinguir `not_found` de `access_denied`: el BFF los colapsa a un 404 no enumerable
      a propósito y esta task no toca el BFF (ver §State inventory Delta).
- [x] El DOM servido **no contiene** slug del proveedor, `house`, costo vendor ni margen — verificado por assertion del canary sobre el HTML servido (no sólo el texto visible).
- [x] La página no se auto-rotula `Producer`, no filtra enums ni ISO 8601 crudos, y ningún link devuelve
      JSON a un browser (incluye retirar `/legal/terms` de `producer-ui.ts:82`).
- [x] Canary verde en `1440×1000`, `390×844` **y `320×844`** (piso WCAG 1.4.10), con `scrollWidth <= clientWidth` en los tres y medido **también en los paneles**.
- [x] Existe evidencia **before/after** (la línea base "antes" se capturó antes de tocar nada).
- [x] Los tokens de tipografía viven en el SSOT (familias, escala de 4 pasos, leading, pesos, tracking, measure) y el gate nuevo lo hace mecánico.
- [x] Los gates de UI pasan con la superficie mergeada — ahora **ocho**: se agregaron tipografía literal y peso-sin-`@font-face`, y el escaneo camina `.css`. Las cuatro reglas nuevas verificadas rompiéndolas.
- [x] Con el flag en `false` la superficie responde idéntica a hoy — **con test**, no como afirmación (`creative-review-runtime.test.ts` → `TASK-1558 share board strangler`), incluido el caso flag-on-sin-bundle.
- [x] El transporte del grant no cambió: fragment → header `Globe-Share` → `credentials:'omit'`, con test de contrato que además verifica que el token nunca aparece en la URL.
- [x] Scorecard: promedio **4,71**, piso **4**, jerarquía/economía/impacto/fidelidad/anti-template en **5**. `docs/ui/reviews/TASK-1558-globe-share-board.scorecard.json`.

## Verificación en vivo — 2026-07-25 (post-flip)

Contra el front door real (`https://globe.efeoncepro.com/shares/demo`), en Chromium, a `1440×1000`,
`390×844` y `320×844`:

| Comprobado | Resultado |
|---|---|
| HTTP + React monta + estado terminal alcanzado | ✅ los tres anchos |
| Estado `incomplete` (sin token en el fragment) | ✅ "El enlace está incompleto" + "Pídele un enlace nuevo…" |
| `role="alert"` exactamente uno | ✅ |
| **Reintentar ausente** en estado no retryable | ✅ los tres anchos |
| Footer: atribución + alcance + privacidad absoluta externa | ✅ `https://efeonce.com/privacidad` |
| Fuentes de Globe cargadas (Poppins/Geist) | ✅ |
| `scrollWidth <= clientWidth` | ✅ 1440, 390 **y 320** |
| Sin fuga: `Producer`, enum crudo, ISO 8601, `house`, slug, código del transporte | ✅ ninguno en el DOM servido |
| axe WCAG 2.0/2.1/2.2 A+AA | ✅ 0 violations (1 `incomplete`: contraste sobre gradiente, ver scorecard) |
| Sin `pageerror`, sin `console.error` inesperado, sin `requestfailed` | ✅ — la CSP de producción no rechazó nada |

**Lo que NO se pudo verificar en vivo:** el estado `ready` con un **grant real**. Crear uno exige sesión
interna en el Producer sobre un output existente, y eso no es alcanzable headless. Es el único punto
pendiente del runbook y la razón por la que `TASK-1560` (retiro del payload viejo) sigue bloqueada.

## Verification

En `efeonce-globe`: `pnpm check` · `pnpm build` · `pnpm --filter @efeonce-globe/studio-client lint` ·
`… test` · canary del share board desktop + mobile.
En `greenhouse-eo`: `pnpm task:lint --task TASK-1558` · `pnpm ui:wireframe-check --task TASK-1558`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` y `GLOBE_RUNTIME_HANDOFF.md` actualizados
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [x] **Doc funcional** (`documentation/creative-studio/efeonce-globe-share-board-cliente.md`) + **manual con el runbook del cutover** (`manual-de-uso/creative-studio/operar-share-board-globe.md`), ambos indexados. Es la primera superficie client-facing reconstruida
      (`docs/documentation/creative-studio/`)
- [x] Las seis primitives documentadas en ADR-014 §`Las primitives nacidas`, con su promoción **propuesta y no asumida** (una primitive con un consumer es una hipótesis; se promueve cuando una segunda superficie la consume **sin modificarla** — si necesita una prop nueva, eso no es promoción, es la evidencia de que la abstracción no estaba lista). Incluye por qué `Surface` NO se construyó.

## Follow-ups

- Slices siguientes de ADR-014: launch + error → composer → feed/viewer → library + retiro del payload viejo.
- Resolver las entradas de `LEGACY_TOKEN_DRIFT` de esta superficie al adoptarlas.
- **Slice 3 pendiente (flip + retiro).** El flip de `client_app_enabled` es un `terraform apply` y el
  retiro de `public-share-ui.ts` va después del flip verificado con un grant real. Ninguno se ejecutó:
  requieren decisión de rollout, no más código.
- **Captions de video/audio (WCAG 1.2.2).** `CreativeShareBoardV1` no transporta pista de subtítulos, así
  que no hay `<track>` que emitir. Declarado en el código con `eslint-disable` justificado en vez de
  silenciado. Cerrarlo es cambio de contrato (campo en la proyección + forma de adjuntar el asset).
- **La proyección no tiene título de pieza ni autor de comentario.** El `h1` usa el fallback "Resultado
  creativo" para toda pieza y los comentarios se muestran sin autor. No se inventaron: poner un nombre
  que el contrato nunca envió, en la superficie donde un cliente juzga trabajo, sería fabricar evidencia.
- **Pasada `axe` automatizada** sobre la superficie renderizada: el canary verifica overflow, fuga, roles
  y foco, pero el contraste se verificó por token y a ojo. Es la única dimensión del scorecard en 4 por
  falta de evidencia mecánica.
- **Falso positivo del readiness gate de Greenhouse.** `hasSubstantiveMarkdown` (`scripts/ci/task-lint/rules.mjs`)
  trata cualquier sección que empiece con la palabra **"Todo"** como placeholder `TODO`, así que un párrafo
  en español que arranca con "Todo el copy…" hace fallar el gate. Se esquivó reformulando; la regla
  debería anclar el patrón a `TODO` en mayúsculas o exigir que sea la línea entera.

## Open Questions

- ~~**Dirección visual**~~ → **resuelta** 2026-07-25: dirección B "Lámina montada", documento durable
  persistido, alternativas rechazadas con motivo.
- ~~**`/legal/terms`**~~ → **resuelta**: se **retira el link**, no se implementa la página. El link no está
  en esta superficie (vive en el footer del Producer, `producer-ui.ts:82`); el footer nuevo del share board
  usa `https://efeonce.com/privacidad`, que ya existe y resuelve. Una página de términos es un entregable de
  contenido legal con su propio dueño, y un enlace de revisión read-only no es una superficie de aceptación
  de términos. Si producto/legal decide después publicar términos, se agrega al footer sin rediseño.
- **Abierta y nueva:** el gate de diseño de Globe no cubre **tipografía** ni archivos `.css`. Esta task
  mitiga poniendo los estilos en TS y los tokens de fuente en el SSOT, pero el gate mecánico equivalente al
  de color/motion queda pendiente (candidato a follow-up).
