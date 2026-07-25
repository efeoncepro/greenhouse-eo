# TASK-1559 — Globe Producer Feed + Viewer sobre el payload cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1559-globe-feed-viewer-client-port.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1558`
- Branch: `task/TASK-1559-globe-feed-viewer-client-port`
- GitHub Issue: `TBD`

## Summary

Porta el **feed vivo y el viewer** del Producer al payload cliente. Es el **Slice 4 de ADR-014** y el
slice de **concurrencia**: acá viven la reconciliación por watermark, la cancelación por epoch y el
refresh de sesión single-flight — comportamientos verificados en vivo que un port puede regresar en
silencio.

## Why This Task Exists

`TASK-1556` dejó el sustrato y ADR-014 declaró el orden, pero el feed no tenía task. Y no es una
superficie más: es la única del roadmap cuyos invariantes son **temporales**, no visuales. Un port
que renderice bien y reconcilie mal produce una UI que se ve correcta y muestra el candidato
equivocado — la clase de fallo que ninguna captura detecta.

Los tres comportamientos que deben sobrevivir, hoy implementados en JS serializado sin tipos:

- **Watermark**: `globe.producer.feed.live.changes` resume desde una marca; perderla duplica o saltea.
- **Epoch por operación**: elegir B nunca puede ser sobrescrito por la respuesta tardía de A.
- **Refresh single-flight con a lo sumo UN reintento**, preservando body, correlation e idempotency —
  un `execute` es una operación que **gasta**.

## Goal

- El feed y el viewer corren sobre componentes tipados, consumiendo los contratos de `packages/contracts`.
- Los tres invariantes de concurrencia quedan **cubiertos por tests**, no sólo portados.
- Los cuatro códigos de error siguen siendo distinguibles (Delta de ADR-005).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — ADR-014, Slice 4.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — ADR-005 y
  su **Delta**: el contrato del feed vivo (`feed.live.list` + `feed.live.changes`), `displayTitle`
  client-safe, y los cuatro códigos que **nunca** colapsan en un preview roto.

Reglas obligatorias:

- **NUNCA** reintentar a ciegas un command que gasta tras un timeout de cliente: primero leer el estado.
- **NUNCA** derivar `displayTitle` del prompt ni dejar una receta faltante como título permanente.
- **NUNCA** mintear URLs firmadas en el cliente: los bytes salen por el path gobernado de retrieval.
- **NUNCA** colapsar `authentication_required` / `not_found` / `access_denied` / `dependency_unavailable`.

## Normative Docs

- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`
- `docs/tasks/complete/TASK-1526-globe-producer-resilient-feed-viewer.md` — la implementación vigente
  que se porta; su comportamiento es el contrato.

## Dependencies & Impact

### Depends on

- **`TASK-1558`**: las primitives base nacen ahí. Portar el feed antes obligaría a inventarlas dos veces.
- `TASK-1556` (complete): payload, tokens, copy y gates.

### Blocks / Impacts

- Es prerrequisito de `TASK-1560` (retiro del payload legacy): mientras el feed no porte, no se puede
  retirar `producer-controller.ts`.

### Files owned

- `apps/studio-client/src/surfaces/producer/feed/**` 🆕 y `.../viewer/**` 🆕
- `apps/studio-client/src/data/**` (cliente del feed; se extiende, no se duplica)
- `apps/studio-web/src/producer-client.ts` — transporte, se porta antes que el render

## Current Repo State

### Already exists

- El comportamiento vigente en `producer-controller.ts` / `producer-client.ts`, verificado en vivo.
- Los readers `globe.producer.feed.live.list` y `.changes`.
- El payload cliente y sus gates (`TASK-1556`).

### Gap

- Los tres invariantes de concurrencia **no tienen tests**: viven en JS serializado sin tipos, y su
  evidencia es que funcionaron en vivo, no que estén cubiertos.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-client`
- Future candidate home: `remain-shared`
- Boundary: consume readers gobernados vía BFF same-origin; cero lógica de autoridad en el cliente.
- Server/browser split: la autoridad y la proyección del feed son server-side; el browser sólo reconcilia.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno de Efeonce sobre el Producer.
- Momento del flujo: seguimiento de corridas en curso y revisión de candidatos.
- Resultado perceptible: el feed refleja el estado real sin duplicar, saltear ni mostrar el candidato de otra operación.
- No-goals UX: sin rediseño visual — es un **port**, no un rediseño. El aspecto se preserva.

### Surface & system decision

- Surface: feed + viewer del Producer.
- Primitive decision: `reuse` — consume las primitives que nacen en `TASK-1558`.
- Copy source: `apps/studio-client/src/copy/index.ts` (absorbe lo que corresponda de `producer-copy.ts`).
- Access impact: `none`.

### State inventory

Default · Loading · Empty · `authentication_required` · `not_found` · `access_denied` ·
`dependency_unavailable` · run activo · run terminal · Long content · Mobile · Keyboard/focus · Reduced motion.

### Interaction contract

Selección de candidato cancelable por epoch; reintento explícito sólo donde es seguro; foco preservado
al llegar items nuevos (nunca robar el foco del usuario por una actualización del feed).

### Motion & microinteractions

Sin motion nuevo: se preserva el vigente, leído de los tokens de motion del SSOT.

### Implementation mapping

Transporte primero (`producer-client.ts` → `src/data/`), render después. Cada invariante de
concurrencia se porta **con su test**, no después.

### GVC scenario plan

Canary propio siguiendo el patrón `seam-smoke-server.mjs` + driver Playwright en `scripts/frontend/`,
con escenarios de llegada de item nuevo, selección concurrente y sesión expirada.

### Design decision log

Es un port, no un rediseño: la decisión de diseño ya está tomada y verificada. Lo que se decide acá es
cómo se cubren los invariantes temporales con tests.

### Visual verification

Before/after del feed y del viewer, desktop y 390px.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Transporte tipado + tests de concurrencia

- Cliente del feed en `src/data/`, tipado desde `packages/contracts`.
- Tests de watermark, epoch y refresh single-flight **antes** de tocar el render.

### Slice 2 — Feed

- La lista viva sobre primitives, con sus estados y `displayTitle` client-safe.

### Slice 3 — Viewer

- Inspección de candidato, media por el path gobernado, cancelación por epoch.

### Slice 4 — Canary y cutover

- Canary con escenarios de concurrencia; flip tras verde.

## Out of Scope

- Rediseño visual del feed o del viewer.
- Composer (`TASK-1552`), library (`TASK-1520`), share board (`TASK-1558`).
- Retiro del payload legacy (`TASK-1560`).

## Detailed Spec

El contrato de comportamiento es `TASK-1526` (complete) más el Delta de ADR-005. No se re-especifica
acá: se porta, y lo que hoy es comportamiento verificado en vivo pasa a ser comportamiento **cubierto**.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (transporte + tests) **antes** que cualquier render. Portar el render primero deja los
invariantes temporales sin red justo mientras se los mueve.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión de watermark → items duplicados o salteados | UI / confianza | **medium** | Tests antes del port; canary con llegada de item nuevo | Feed mostrando duplicados |
| Regresión de epoch → se muestra el candidato de otra operación | UI / correctitud | medium | Test de selección concurrente | Candidato equivocado tras elegir rápido |
| Reintento ciego de un command que gasta | Créditos | **low pero costoso** | Leer estado antes de decidir; nunca reintentar a ciegas | Doble cargo en el ledger |
| El feed roba el foco al llegar un item | a11y | medium | Test de foco; canary con teclado | Foco saltando durante la navegación |

### Feature flags / cutover

`client_app_enabled` (ya existe). El feed viejo convive hasta el flip.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-3 | Revert PR; el flag apagado deja el feed viejo | <15 min | sí |
| 4 | Flag a `false` + apply | <10 min | sí |

### Production verification sequence

1. Slices 1-3 con flag `false` → gates verdes.
2. Canary con los tres escenarios de concurrencia.
3. Flip y observación de un ciclo real de generación.

### Out-of-band coordination required

`N/A — repo-only`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los tres invariantes de concurrencia (watermark, epoch, single-flight) tienen test propio y verde.
- [ ] Los cuatro códigos de error son distinguibles en la UI.
- [ ] `displayTitle` nunca sale del prompt ni queda como receta faltante.
- [ ] El cliente no mintea URLs firmadas.
- [ ] Los 6 gates de UI pasan.
- [ ] Con el flag en `false` el feed viejo responde idéntico.
- [ ] Before/after desktop y 390px.

## Verification

`pnpm check` · `pnpm build` · gates de `studio-client` · canary de concurrencia.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` y `GLOBE_RUNTIME_HANAOFF.md` actualizados
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] `TASK-1560` notificada: el feed dejó de bloquear el retiro

## Follow-ups

- `TASK-1560` — retiro del payload legacy.

## Open Questions

- ¿La librería de estado/data-fetching se decide acá o se hereda de lo que `TASK-1558` haya elegido?
  Resolver leyendo lo que 1558 dejó, no re-decidiendo.
