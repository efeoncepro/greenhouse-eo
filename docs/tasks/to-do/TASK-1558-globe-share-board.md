# TASK-1558 — Globe Share Board sobre el payload cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1558-globe-share-board.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Bloqueada por direccion visual aprobada inexistente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-1558-globe-share-board`
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

Ése es el gate `UI ready: no`, y no es burocracia: improvisar la única cara comercial de Globe es
exactamente lo que ADR-014 existe para impedir.

## Goal

- El share board queda reconstruido con componentes tipados sobre el SSOT de tokens y la capa de copy.
- Sus **diez estados** quedan implementados y distinguibles; sólo `dependency_unavailable` ofrece reintentar.
- Deja de auto-rotularse `Producer` y no queda ningún link que devuelva JSON a un browser.
- Estrena su primer canary visual: hoy la única superficie client-facing **no tiene ninguno**.
- El flag `client_app_enabled` se puede prender con evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — **ADR-014**, cuyo
  **Slice 1** implementa esta task. Su Slice 0 ya lo entregó `TASK-1556`.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — ADR-005 §3/§4 y
  su Delta: los cuatro códigos de error **nunca** colapsan en un preview roto genérico.
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

- `docs/ui/wireframes/TASK-1558-globe-share-board.md` — regiones, contrato de audiencia, los diez estados
  con su ARIA, implementation mapping, plan de canary y decision log.
- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md` — cómo correr y verificar los gates.
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` §209-215 — qué **nunca**
  se muestra.

## Dependencies & Impact

### Depends on

- **`TASK-1556`** (complete): `apps/studio-client`, `apps/studio-web/src/shell.ts`, el SSOT de tokens, la
  capa de copy, los gates y el flag ya existen. Esta task los **consume**.
- ⚠️ **Dirección visual aprobada** del share board — **no existe**. Es el bloqueo real.

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
- `docs/ui/visual-directions/TASK-1558-*` 🆕 (la dirección aprobada, cuando exista)
- `docs/ui/reviews/TASK-1558-globe-share-board.scorecard.json` 🆕

## Current Repo State

### Already exists

- Todo el sustrato de `TASK-1556`: `apps/studio-client` (Vite + React + React Router), `shell.ts` con slot
  `criticalContent`, SSOT de tokens + `LEGACY_TOKEN_DRIFT`, capa de copy locale-keyed, ESLint + 3 gates,
  React Compiler, flag `client_app_enabled` (default `false`).
- El transporte del share: `GET /shares/:shareId`, `/v1/shares/resolve`, `/v1/shares/:id/media`.
- El patrón de canary: `apps/studio-client/scripts/seam-smoke-server.mjs` + `scripts/frontend/globe-client-seam-gate.mjs`.

### Gap

- **No hay dirección visual aprobada** para esta superficie.
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

Los diez están en el wireframe §Estados con su copy y ARIA: Default · Loading (skeleton dimensionado,
`aria-busy`) · Empty de comentarios · `authentication_required` (`role="alert"`) · `not_found` ·
`access_denied` · `dependency_unavailable` (**único con Reintentar**) · Long content · Mobile 390px ·
Keyboard/focus · Reduced motion.

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

Ver wireframe §GVC Scenario Plan. Globe no corre el GVC de Greenhouse: el equivalente es un canary propio
siguiendo el patrón `seam-smoke-server.mjs` + driver Playwright en `scripts/frontend/`.

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

### Slice 1 — Dirección visual (desbloquea todo lo demás)

- 2-3 direcciones comparadas con `design-studio` / `product-design-loop`, una elegida por el operador.
- Asset durable persistido en `docs/ui/visual-directions/TASK-1558-*`.
- `UI ready` pasa a `yes` sólo cuando el wireframe tenga su Visual Direction Contract completo.

### Slice 2 — Primitives base + superficie

- `Surface`, `Chip`, `FactList`, `CommentItem`, `MediaStage`, `StateBlock` sobre el SSOT de tokens.
- El share board con sus diez estados, copy desde `copyFor().share`.
- Se retira el rótulo `Producer` y se resuelve `/legal/terms` (implementar o retirar el link).

### Slice 3 — Canary y cutover

- Canary visual del share board: desktop `1440×1000` + mobile `390×844`, estados vencido y degradado,
  assertion de no-fuga (sin slug, `house`, costo ni margen en el DOM).
- Flip de `client_app_enabled` tras canary verde.
- Se retira `public-share-ui.ts` y su rama de render.

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

- [ ] Existe dirección visual aprobada y persistida; `UI ready: yes` con `pnpm task:lint --task TASK-1558` limpio.
- [ ] Los diez estados están implementados; los cuatro códigos de error son **distinguibles** y sólo
      `dependency_unavailable` ofrece Reintentar.
- [ ] El DOM servido **no contiene** slug del proveedor, `house`, costo vendor ni margen — verificado por assertion.
- [ ] La página no se auto-rotula `Producer` y ningún link devuelve JSON a un browser.
- [ ] Canary verde en `1440×1000` y `390×844`, con `scrollWidth <= clientWidth` en ambos.
- [ ] Existe evidencia **before/after**.
- [ ] Los 6 gates de UI pasan con la superficie mergeada.
- [ ] Con el flag en `false` la superficie responde idéntica a hoy.
- [ ] El transporte del grant no cambió: fragment → header `Globe-Share` → `credentials:'omit'`.
- [ ] Scorecard: promedio ≥4,5, piso 4, fidelidad y resistencia a template ≥4,5.

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
- [ ] **Doc funcional obligatoria acá**: es la primera superficie client-facing reconstruida
      (`docs/documentation/creative-studio/`)
- [ ] Las primitives que nacieron quedan documentadas y su promoción propuesta

## Follow-ups

- Slices siguientes de ADR-014: launch + error → composer → feed/viewer → library + retiro del payload viejo.
- Resolver las entradas de `LEGACY_TOKEN_DRIFT` de esta superficie al adoptarlas.

## Open Questions

- **Dirección visual**: no existe. Es el Slice 1.
- **`/legal/terms`**: ¿se implementa la página o se retira el link? Decisión de producto/legal.
