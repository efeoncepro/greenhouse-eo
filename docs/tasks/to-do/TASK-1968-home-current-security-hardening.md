# TASK-1968 — Homes por rol · A: seguridad de la Home actual (aislamiento por cliente, enlaces admin y economía expuesta)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
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
- Status real: `Hallazgo de código del discovery de TASK-1967 (2026-10-02); fuga no verificada en runtime; sin implementación`
- Rank: `1`
- Domain: `platform|client-portal`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra tres exposiciones de la Home actual que el discovery de `TASK-1967` encontró en el código: un bloque de la Home que puede mostrarle a un cliente insights de otros clientes, un pulse-strip cliente que enlaza a `/admin`, y un endpoint del portal cliente que entrega costo laboral y margen. Va antes que cualquier cambio visual de las Homes por rol.

## Why This Task Exists

- `loadHomeAiInsightsBento()` (`src/lib/home/loaders/load-ai-insights-bento.ts:38-43`) no recibe contexto de tenant y lee los enrichments sin filtrar, pero el registro de bloques (`src/lib/home/registry.ts`) incluye `client` en su audiencia. Si se confirma, un usuario cliente con `home_v2_shell` encendido ve insights de otras organizaciones.
- `loadHomePulseStrip` arma para el cliente tarjetas de «Reliability» y «Sync Notion» con enlaces a rutas `/admin` (`src/lib/home/loaders/load-pulse-strip.ts:339`): información interna y destinos a los que el cliente no tiene acceso.
- `GET /api/client-portal/account-summary` entrega `getOrganizationExecutiveSnapshot` completo, incluido `economics.totalLaborCostClp` y el margen (`src/lib/account-360/organization-executive.ts:30`), y responde errores en inglés sin el contrato canónico.

Las tres se encontraron leyendo código; ninguna se verificó con usuarios reales. Por eso el primer slice es confirmarlas.

## Goal

- Ningún bloque de la Home ni endpoint del portal cliente entrega datos de otra organización ni datos internos (costos, márgenes, salud de plataforma).
- Un test de no-fuga por tenant protege cada uno de los tres caminos.
- Si alguna fuga se confirma en runtime, queda registrada como `ISSUE-###`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md` (Home v2, Nexa Insights)

Reglas obligatorias:

- El aislamiento por organización se resuelve en el servidor, desde la sesión; nunca desde un parámetro del cliente.
- El dominio cliente (`src/lib/client-portal/**`) compone; no expone snapshots internos completos (BFF hoja).
- Errores al cliente con `canonicalErrorResponse` y prosa es-CL; detalle técnico sólo a `captureWithDomain`.

## Normative Docs

- `docs/tasks/to-do/TASK-1967-role-homes-redesign-program.md` (programa padre, hallazgos de discovery)
- `docs/issues/README.md` (plantilla de issue si la fuga se confirma)

## Dependencies & Impact

### Depends on

- `src/lib/home/registry.ts`, `src/lib/home/compose-home-snapshot.ts`, `src/lib/home/loaders/load-ai-insights-bento.ts`, `src/lib/home/loaders/load-pulse-strip.ts`
- `src/app/api/client-portal/account-summary/route.ts` y `src/lib/account-360/organization-executive.ts`

### Blocks / Impacts

- `TASK-1854` (Home de clientes, hija G de `TASK-1967`): no se implementa antes de que esta task cierre.
- `TASK-1970` (API de la Home por rol): hereda el patrón de contexto de tenant obligatorio en los loaders.

### Files owned

- `src/lib/home/loaders/load-ai-insights-bento.ts`
- `src/lib/home/loaders/load-pulse-strip.ts` (sólo la rama `client`)
- `src/app/api/client-portal/account-summary/route.ts`
- tests nuevos de no-fuga junto a cada archivo

## Current Repo State

### Already exists

- Registro de bloques con `audiences` y `requires.capability` (`src/lib/home/registry.ts:75-205`).
- Insights por período y drill (`src/lib/ico-engine/ai/*`, `listNexaInsightsForPeriod`, `readNexaInsightDrill`).
- Contrato canónico de errores (`src/lib/api/canonical-error-response.ts`).

### Gap

- El loader de insights no recibe ni aplica el tenant.
- El pulse-strip no tiene una versión cliente sin datos internos.
- `account-summary` no tiene un DTO cliente recortado.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/home/loaders/**` y `src/app/api/client-portal/**`
- Future candidate home: `portal`
- Boundary: loaders de Home v2 y BFF `src/lib/client-portal/**`; ningún consumer cliente lee el snapshot ejecutivo interno
- Server/browser split: la lectura corre sólo en el servidor; el navegador recibe el DTO recortado
- Build impact: none
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: loaders de Home v2 y DTO de `account-summary`
- Consumidores afectados: Home v2 (`HomeShellV2`), portal cliente
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `src/lib/home/contract.ts` (bloques y `fallback`), `GET /api/home/snapshot/v2`
- Contrato nuevo o modificado: firma de `loadHomeAiInsightsBento(context)` con tenant obligatorio; DTO cliente de `account-summary` sin economía
- Backward compatibility: `compatible` para internos; para clientes se retiran campos que nunca debieron recibir
- Full API parity: la Home y el portal leen el mismo reader con el mismo filtro de tenant; no hay filtro en el componente

### Data model and invariants

- Entidades/tablas/views afectadas: enrichments de insights ICO (lectura), `greenhouse_core.organizations` (scope)
- Invariantes que no se pueden romper:
  - Un usuario cliente sólo recibe datos de las organizaciones de su sesión.
  - Ningún payload cliente contiene costos laborales, márgenes ni salud de plataforma.
- Write-target allowlist: N/A — sin escrituras
- Tenant/space boundary: organización y Spaces derivados de la sesión (`client_users` → organización)
- Idempotency/concurrency: N/A — sólo lectura
- Audit/outbox/history: none — corrección de lectura; si la fuga se confirma, el registro vive en el `ISSUE-###`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: corrección activa al desplegar (es un cierre de exposición, no una feature)
- Backfill plan: N/A
- Rollback path: revert PR (reabre la exposición; sólo ante regresión grave)
- External coordination: si se confirma la fuga, decidir con el operador si se avisa a clientes afectados

### Security and access

- Auth/access gate: sesión + audiencia del bloque + organización de la sesión
- Sensitive data posture: datos comerciales y económicos de clientes
- Error contract: `canonicalErrorResponse` en `account-summary`
- Abuse/rate-limit posture: none con razón — sin escritura ni costo nuevo

### Runtime evidence

- Local checks: tests de no-fuga con dos organizaciones sintéticas por camino
- DB/runtime checks: snapshot v2 en staging con un usuario cliente de prueba: sin insights de otra organización
- Integration checks: N/A
- Reliability signals/logs: `captureWithDomain` en errores de los loaders tocados
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Confirmar en runtime

- Con un usuario cliente de prueba y `home_v2_shell` encendido sólo para él en staging, pedir `GET /api/home/snapshot/v2` y registrar si el bloque de insights trae datos de otra organización. Mismo ejercicio para el pulse-strip y `account-summary`.
- Si hay fuga confirmada: crear `ISSUE-###` en `docs/issues/open/` con ambiente, síntoma, causa e impacto antes de corregir.

### Slice 2 — Insights con tenant obligatorio

- `loadHomeAiInsightsBento` recibe el contexto de la Home y filtra por las organizaciones/Spaces de la sesión; para la audiencia `client` sin contexto válido devuelve el `fallback` del bloque.
- Test de no-fuga: dos organizaciones, el usuario de una nunca recibe items de la otra.

### Slice 3 — Pulse-strip cliente sin datos internos

- La rama `client` del pulse-strip deja de mostrar Reliability y Sync Notion y de enlazar a `/admin`; mientras la Home cliente nueva no exista (`TASK-1854`), el bloque se oculta para clientes.

### Slice 4 — `account-summary` recortado

- DTO cliente sin `economics` interno (costo laboral, margen); errores con `canonicalErrorResponse` en es-CL. Test que falla si el payload cliente contiene esas llaves.

## Out of Scope

- Rediseñar cualquier bloque (es de `TASK-1969`…`TASK-1972` y `TASK-1854`).
- Revisar otros endpoints del portal cliente que no aparecieron en el discovery.
- Avisar a clientes: lo decide el operador si se confirma la fuga.

## Detailed Spec

- Patrón de filtro: el loader recibe `{ audience, organizationIds, spaceIds }` resueltos por `compose-home-snapshot.ts` desde la sesión; nunca acepta ids desde la query.
- El test de no-fuga se escribe contra el loader (unidad) y contra el composer (integración con mocks de dos tenants).
- Si el snapshot ejecutivo se reutiliza en otro lugar interno, no se toca: se crea un mapper cliente explícito en `src/lib/client-portal/**`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (confirmar) → Slices 2, 3 y 4 (pueden ir en paralelo) → release.
- Ninguna hija UI de clientes de `TASK-1967` se toma antes del release de esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga entre clientes ya ocurrida | identity / UI | medium (inferido) | Confirmar en Slice 1 y abrir ISSUE | no signal — emerge en revisión |
| El filtro deja el bloque vacío para internos | UI | low | El filtro sólo aplica a `client`; test para internos | `captureHomeShellError` |
| Un consumer interno depende de `economics` en `account-summary` | UI | low | Buscar consumers antes de recortar | build/test rojo |

### Feature flags / cutover

- Sin flag nuevo — es un cierre de exposición; el bloque ya está detrás de `home_v2_shell` y el cliente sin contexto recibe el `fallback`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A (sólo lectura y documentación) | — | sí |
| Slice 2 | revert PR + redeploy | < 15 min | sí |
| Slice 3 | revert PR + redeploy | < 15 min | sí |
| Slice 4 | revert PR + redeploy | < 15 min | sí |

### Production verification sequence

1. Staging con dos usuarios cliente de organizaciones distintas: snapshot v2 y `account-summary` sin datos cruzados ni economía.
2. Usuario interno: insights y pulse-strip sin cambios.
3. Release a producción y repetir el paso 1 con el usuario agente cliente.

### Out-of-band coordination required

- Si se confirma la fuga: decisión del operador sobre comunicación a clientes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El resultado de la confirmación en runtime está registrado (fuga sí/no por cada camino) y, si hubo fuga, existe su `ISSUE-###`.
- [ ] `loadHomeAiInsightsBento` exige contexto de tenant y su test de no-fuga con dos organizaciones pasa.
- [ ] La rama cliente del pulse-strip no contiene enlaces a `/admin` ni tarjetas de Reliability o Sync Notion.
- [ ] El payload cliente de `account-summary` no contiene costo laboral ni margen, y un test lo verifica.
- [ ] Los errores de `account-summary` usan `canonicalErrorResponse` en es-CL.
- [ ] Los usuarios internos ven sus bloques sin cambios.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (focal de los loaders y la ruta, y suite completa al cierre)
- Staging: snapshot v2 y `account-summary` con dos usuarios cliente

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1967` marca la hija A como cerrada

## Follow-ups

- Auditar el resto de endpoints `/api/client-portal/**` con el mismo test de no-fuga (fuera de este alcance).
