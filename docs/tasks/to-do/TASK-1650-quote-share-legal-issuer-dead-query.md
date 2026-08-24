# TASK-1650 — El emisor legal de las cotizaciones compartidas nunca se lee de la base

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Delta 2026-08-24 — deja de ser deuda de una superficie y bloquea un programa

El drift de la dirección de casa matriz que esta task documenta —**tres fuentes, dos valores**: la base
dice `of 05`, `DEFAULT_LEGAL_ENTITY` dice `of. 05` y la constante de marca dice `Of 1105`— pasó a ser
**dependencia dura de `EPIC-042`**.

Razón: la ADR de presentación de correo adoptó que **todo footer gobernado muestra razón social, RUT y
casa matriz** resueltos desde el operating entity. En cuanto la primera cohorte se promueva, esa
dirección se imprime en correos productivos y va a diferir de la lámina que el operador aprobó. Se leerá
como defecto de implementación cuando en realidad es un dato desalineado desde abril.

O sea: la Open Question de esta task —«¿oficina 05 o 1105?»— ya no bloquea sólo a la cotización
compartida. Bloquea a toda cohorte de `EPIC-042` que imprima identidad legal, que son todas.

Sigue necesitando **decisión humana**; no hay forma de resolverla desde el código.

## Summary

La query que resuelve la entidad legal emisora de una cotización compartida selecciona dos
columnas que no existen. Falla siempre, un `catch` silencioso la tapa, y toda cotización
—vista pública y PDF interno— imprime un `DEFAULT_LEGAL_ENTITY` hardcodeado en vez del dato
real de la base.

## Why This Task Exists

Verificado contra PG el 2026-08-06:

```sql
SELECT legal_name, tax_id, registered_address, website
  FROM greenhouse_core.organizations
 WHERE is_operating_entity = TRUE
-- ERROR: column "registered_address" does not exist
```

Las columnas reales son `legal_address` y `website_url`. La query está en
`src/lib/finance/quote-share/load-quote-for-public-view.ts:245-251` y su gemela
`load-quote-for-pdf-internal.ts:176`, ambas envueltas en `try/catch` con fallback silencioso a
`DEFAULT_LEGAL_ENTITY` (`src/lib/finance/pdf/tokens.ts:154-159`).

Es un documento **client-facing con identidad legal**: razón social, RUT y domicilio de la
empresa emisora. Que se sirva de un hardcode significa que cualquier cambio de domicilio o de
entidad operativa no se refleja, y nadie se entera porque el error nunca sale a superficie.

Hoy el daño está enmascarado porque el hardcode coincide *casi* con la base. Pero **no coincide
con el SSOT de marca**: `EFEONCE_LEGAL_ADDRESS_FALLBACK` en `src/config/efeonce-brand.ts` dice
`Of 1105`, mientras la base y el hardcode dicen `of 05`. Hay tres fuentes y dos valores.

Además rompe el contrato multi-entidad declarado en
`GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md:7-12`: *"todo consumer que necesite la entidad
contratante/emisora debe leerla del campo, NUNCA hardcodear Efeonce"*.

## Goal

Que la cotización compartida imprima la entidad legal real resuelta desde la base, y que si esa
resolución falla, el fallo sea visible en vez de silencioso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` §Delta multi-entity — prohíbe
  hardcodear la entidad emisora.
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — documentos fiscales y su emisor.

## Normative Docs

- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` — precedente de la bug
  class "SQL embebido que nunca se ejerció contra PG real".
- CLAUDE.md §`SQL embebido — type alignment + live testing` (ISSUE-071) — misma clase de bug:
  query embebida que sólo falla en runtime y queda tapada por un catch.

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (columnas `legal_address`, `website_url`).
- `getOperatingEntityIdentity` (`src/lib/account-360/organization-identity.ts:103-130`), que ya
  resuelve la operadora correctamente y podría reusarse en vez de una query paralela.

### Blocks / Impacts

- Cualquier consumer futuro de cotización compartida y su PDF.
- La decisión de domicilio correcto impacta también `src/config/efeonce-brand.ts`.

### Files owned

- `src/lib/finance/quote-share/load-quote-for-public-view.ts`
- `src/lib/finance/quote-share/load-quote-for-pdf-internal.ts`
- `src/lib/finance/pdf/tokens.ts`
- `src/config/efeonce-brand.ts`

## Current Repo State

### Already exists

- Resolver canónico correcto y cacheado: `getOperatingEntityIdentity`
  (`src/lib/account-360/organization-identity.ts:103-130`), usado por payroll, finiquito,
  ledgers de IVA/PPM/retención y el footer PDF de Finance.
- Variante multi-entidad: `getOrganizationIssuerIdentityById` (`:139-166`).

### Gap

- `load-quote-for-public-view.ts:245-251` — query a `registered_address` / `website`, columnas
  inexistentes; `catch` silencioso.
- `load-quote-for-pdf-internal.ts:176` — misma query duplicada.
- `DEFAULT_LEGAL_ENTITY` (`src/lib/finance/pdf/tokens.ts:154-159`) actúa como fuente real en vez
  de fallback.
- Discrepancia de domicilio entre la base (`of 05`) y `EFEONCE_LEGAL_ADDRESS_FALLBACK`
  (`Of 1105`) — sin resolver cuál es correcto.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/finance/quote-share/**` y `src/lib/finance/pdf/**`
- Future candidate home: `remain-shared`
- Boundary: `getOperatingEntityIdentity` como resolver único de la entidad emisora; los loaders
  de quote-share pasan a ser consumers en vez de tener su propia query
- Server/browser split: la resolución ocurre server-side al construir el payload de la vista
  pública y del PDF; el browser recibe el dato ya resuelto
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_core.organizations` vía `getOperatingEntityIdentity`
- Consumidores afectados: vista pública de cotización compartida y su PDF interno
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `QuotationPdfLegalEntity`
- Contrato nuevo o modificado: el loader consume el resolver canónico en vez de query propia
- Backward compatibility: `compatible` — mismo shape de salida
- Full API parity: un solo resolver server-side para todos los documentos con emisor legal

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.organizations`
- Invariantes que no se pueden romper:
  - La entidad emisora se lee del campo, NUNCA se hardcodea.
  - Si la resolución falla, el fallo debe ser observable (`captureWithDomain`), no silencioso.
  - El fallback puede existir, pero no puede ser indistinguible del camino feliz.
- Tenant/space boundary: la cotización determina su emisor; multi-entidad vía
  `getOrganizationIssuerIdentityById` si el quote lo especifica `[verificar si el quote guarda
  su entidad emisora]`
- Idempotency/concurrency: `n/a` — lectura cacheada con TTL 5 min en el resolver
- Audit/outbox/history: `none` — no hay mutación

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — corrección de lectura
- Backfill plan: `n/a`
- Rollback path: `revert PR + redeploy`
- External coordination: decisión del operador sobre el domicilio correcto (oficina 05 vs 1105)

### Security and access

- Auth/access gate: la vista pública ya tiene su propio gate de token de compartición
- Sensitive data posture: identidad legal de la propia empresa, no PII de terceros
- Error contract: reemplazar el `catch` silencioso por `captureWithDomain` + degradación honesta
- Abuse/rate-limit posture: sin cambio

### Runtime evidence

- Local checks: tests focales de ambos loaders + `pnpm lint` + `pnpm typecheck`
- DB/runtime checks: ejercitar la query corregida contra PG real (la anterior nunca se ejerció)
- Integration checks: generar una cotización compartida y su PDF, comparar contra la base
- Reliability signals/logs: el nuevo `captureWithDomain` debe aparecer si la resolución falla
- Production verification sequence: abrir una cotización compartida real y verificar que razón
  social, RUT y domicilio coinciden con `greenhouse_core.organizations`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1** — Reemplazar la query rota de ambos loaders por `getOperatingEntityIdentity` (o
  `getOrganizationIssuerIdentityById` si el quote guarda su emisor), con test que ejercite el
  camino real contra PG.
- **Slice 2** — Convertir el `catch` silencioso en degradación observable: `captureWithDomain` +
  fallback explícitamente marcado, para que un fallo futuro no vuelva a ser invisible.
- **Slice 3** — Resolver la discrepancia de domicilio: decidir con el operador cuál es el
  correcto y alinear base, `DEFAULT_LEGAL_ENTITY` y `EFEONCE_LEGAL_ADDRESS_FALLBACK`.

## Out of Scope

- Rediseñar el PDF de cotización.
- Cambiar el gate de la vista pública compartida.
- Migrar otros documentos fiscales (payroll, finiquito, contratos ya usan el resolver correcto).

## Detailed Spec

La corrección mínima es cambiar los nombres de columna. La corrección **correcta** es eliminar
la query paralela: ya existe un resolver canónico, cacheado y usado por todos los demás
documentos con emisor legal. Tener una query propia en quote-share es justamente lo que permitió
que se desalineara con el schema sin que nadie lo notara.

El `catch` silencioso es la segunda mitad del bug: sin él, el error habría salido el primer día.
Cualquier fallback debe seguir existiendo (una cotización no debe caerse por esto) pero debe
emitir señal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (resolver canónico) → Slice 2 (observabilidad del fallback).
- Slice 2 después de Slice 1: instrumentar un camino que aún está roto sólo produce ruido.
- Slice 3 es independiente y puede correr en paralelo, pero **no cierra sin decisión humana**.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El domicilio de la base es el incorrecto y ahora sí se imprime | Documento client-facing | Media | Slice 3 resuelve la discrepancia ANTES de dar por cerrada la task | Operador detecta domicilio errado en una cotización |
| El quote no guarda su entidad emisora y multi-entidad queda ambiguo | Finance | Media | `[verificar]` en Discovery; si no la guarda, usar la operadora única y declararlo | Cotización de otra entidad con emisor equivocado |
| Romper la vista pública por error de resolución | Público | Baja | Conservar fallback, ahora con señal | Señal `captureWithDomain` + cotización sin emisor |

### Feature flags / cutover

Sin flag: corrección de lectura, reversible por revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR + redeploy | <10 min | Sí |
| 2 | revert PR + redeploy | <10 min | Sí |
| 3 | revert del valor alineado | <10 min | Sí |

### Production verification sequence

1. Abrir una cotización compartida real: razón social, RUT y domicilio coinciden con la base.
2. Descargar el PDF interno: mismo dato.
3. Confirmar que no se emitió la señal de fallback.

### Out-of-band coordination required

Decisión del operador sobre el domicilio correcto (oficina 05 vs 1105) antes de cerrar Slice 3.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Ambos loaders resuelven la entidad emisora por el resolver canónico, sin query propia.
- [ ] Existe un test que ejercita la resolución contra PG real (no sólo mocks).
- [ ] El fallback emite señal observable; ya no es un `catch` mudo.
- [ ] La cotización compartida imprime el dato de la base, verificado en runtime.
- [ ] La discrepancia de domicilio está resuelta y las tres fuentes coinciden.
- [ ] `pnpm lint` + `pnpm typecheck` + tests focales verdes.

## Verification

- Test focal que ejerce la query real contra PG.
- Smoke de la vista pública y del PDF, comparando contra `greenhouse_core.organizations`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] Delta en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` si cambia el contrato del emisor

## Follow-ups

- Auditar si existen otras queries embebidas contra `greenhouse_core.organizations` con nombres
  de columna desalineados y `catch` silencioso (misma bug class que ISSUE-071).

## Open Questions

1. ¿La cotización guarda su entidad emisora, o siempre asume la operadora única? Define si se usa
   `getOperatingEntityIdentity` o `getOrganizationIssuerIdentityById`.
2. ¿El domicilio correcto es oficina 05 o 1105? Requiere respuesta del operador.
