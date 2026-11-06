# TASK-2097 — Cuentas operativas: routing estable de servicios y fuentes

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `sync|webhook|migration`
- Epic: `EPIC-057`
- Status real: `Planificada 2026-11-06; corregida contra código el mismo día; sin implementación`
- Rank: `2097`
- Domain: `data|crm|delivery`
- Blocked by: `TASK-2096`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`

## Summary

Fijar Servicio→Space y fuente/objeto externo→Space mediante writers canónicos, versiones y conflictos observables. Los replays no pueden mover proyectos de Diseño a SEO.

## Why This Task Exists

El sync resuelve el Space con `LIMIT 1` sin orden ni filtro `active` y el upsert reasigna `space_id` en cada replay (`ON CONFLICT … DO UPDATE SET space_id`). El intake asíncrono, el handler de webhooks y el backfill tienen su propio `LIMIT 1`. `targetSpaceIds` sólo limita la limpieza. No hay unicidad de base Notion por Space: la misma base puede registrarse en dos Spaces y el último writer gana. El adapter pasa `client_id` como `hubspotCompanyId`.

## Goal

- Entregar U02 de EPIC-057 con un dueño: Services / Source Sync.
- Verificar frontera y fallos reales localmente antes de proponer apertura.
- Conservar cliente comercial, contratos e historia de Diseño.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- [ADR cuentas operativas](../../architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md): Accepted 2026-11-06, modelo B.
- [Modelo 360](../../architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md).
- [EPIC-057](../../epics/in-progress/EPIC-057-operational-accounts-under-organization.md): secuencia y gates.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- [TASK-2096](../in-progress/TASK-2096-operational-space-authority-and-request-context.md) — contrato local requerido; no exige rollout.
- [Evidencia local](../../audits/client-portal/2026-11-01-sky-finance-routing-validation/README.md); 204 pruebas, no certificación productiva.

### Blocks / Impacts

- Certificación integral local de TASK-2094 y gate de apertura SKY de TASK-1852.
- Dependencias por hito, consumidores y exclusiones en EPIC-057; no se exige cerrar todos sus EPICs.

### Files owned

- `src/lib/services/service-sync.ts` (incluye `createSpaceForClient`, que bajo B no puede crear ni elegir un Space)
- `src/lib/services/upsert-service-from-hubspot.ts`
- `src/lib/sync/projections/hubspot-services-intake.ts` (carril asíncrono de webhooks)
- `src/lib/webhooks/handlers/hubspot-services.ts` (carril síncrono)
- `scripts/services/backfill-from-hubspot.ts`
- `src/lib/space-notion/space-notion-store.ts` (dueño único; TASK-2099 lo consume)
- `src/lib/sync/project-notion-delivery-to-postgres.ts` (dueño único; TASK-2101 lo modifica después, por dependencia)
- `scripts/sync-source-runtime-projections.ts` (segundo writer de `greenhouse_delivery.projects`)
- Nueva migración de unicidad Fuente→Space (por `pnpm migrate:create`)
- Esta spec; cambios futuros sólo dentro de la responsabilidad descrita, coordinados con dueños existentes.

## Current Repo State

### Already exists

- `src/lib/services/service-sync.ts`
- `src/lib/services/upsert-service-from-hubspot.ts`
- `src/lib/space-notion/space-notion-store.ts`
- `src/lib/sync/project-notion-delivery-to-postgres.ts`
- Callers del sync de servicios: `src/app/api/integrations/hubspot/services/sync/route.ts`, `src/app/api/admin/integrations/hubspot/orphan-services/route.ts`, `src/app/api/admin/ops/services-sync/route.ts`, `src/app/api/cron/services-sync/route.ts`, `src/lib/cron-orchestrators/index.ts`.
- `services.notion_project_id`: puntero único escrito desde HubSpot; señal existente Proyecto→Servicio que TASK-1960 debe absorber o retirar.

### Gap

El sync resuelve el Space con `LIMIT 1` sin orden ni filtro `active` y el upsert reasigna `space_id` en cada replay (`ON CONFLICT … DO UPDATE SET space_id`). El intake asíncrono, el handler de webhooks y el backfill tienen su propio `LIMIT 1`. `targetSpaceIds` sólo limita la limpieza. No hay unicidad de base Notion por Space: la misma base puede registrarse en dos Spaces y el último writer gana. El adapter pasa `client_id` como `hubspotCompanyId`.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/services/service-sync.ts` y consumers actuales nombrados arriba.
- Future candidate home: `remain-shared`
- Boundary: Binding operativo versionado y resolver único para HubSpot/Notion/BQ→PG; expected version, procedencia y destino explícito por objeto. Proyecto→Servicio es responsabilidad de TASK-1960, que consume estos bindings.
- Server/browser split: primitive server-only; contratos serializables sin DB/secretos en browser.
- Build impact: sin paquetes nuevos ni entrypoints globales previstos; medir cualquier import añadido al implementar.
- Extraction blocker: autoridad, transacción y contratos compartidos; no crear repos/apps/packages por anticipado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync|webhook|migration`
- Source of truth afectado: primitives actuales en Files owned; schema exacto se concilia antes de DDL.
- Consumidores afectados: rutas, API/MCP, workers y portal autorizados según matriz del EPIC.
- Runtime target: `local`; preparación para rollout posterior gobernado por TASK-1852.

### Contract surface

- Contrato existente a respetar: ADR y primitives en Files owned.
- Contrato nuevo o modificado: Binding operativo versionado y resolver único para HubSpot/Notion/BQ→PG; expected version, procedencia y destino explícito por objeto. Proyecto→Servicio es responsabilidad de TASK-1960, que consume estos bindings.
- Backward compatibility: gated; preservar recorridos de un Space y denegar ambigüedad.
- Full API parity: reader/command canónico compartido por adapters; capability, grant y coverage en el mismo PR si cambia autoridad.

### Data model and invariants

- Entidades/tablas/views afectadas: Organization/Space/Service y datos del dominio en los stores actuales; no se aprueba schema por este plan.
- Invariantes: un owner comercial; ningún dato histórico movido, duplicado o reinterpretado silenciosamente.
- Write-target allowlist: comprobar boundary test del dominio; declarar cada tabla nueva con justificación en el mismo PR, si se requiere DDL.
- Tenant/space boundary: principal vigente + capacidad + vínculo recurso/Space/Service; contexto enviado sólo restringe.
- Idempotency/concurrency: versiones esperadas, transacción/locks proporcionales; retry y carrera adversarial antes de declarar completo.
- Audit/outbox/history: eventos existentes con actor, motivo, contexto, correlación y resultado; preservar snapshots sellados.

### Migration, backfill and rollout

- Migration posture: preferir aditivo si se requiere schema; plan SQL y reversa revisados antes de ejecución aislada.
- Default state: sin activar capacidad nueva ni escribir cuentas compartidas durante el laboratorio.
- Backfill plan: ninguno sobre datos reales; cualquier reclasificación futura requiere plan separado con evidencia/versiones.
- Rollback path: revertir código local y retirar sólo fixtures propias; compensaciones verificadas antes de abrir.
- External coordination: aprobación ADR y release/habilitación posteriores; credenciales/providers no necesarios para registrar.

### Security and access

- Auth/access gate: sesión/principal fresco, capability/entitlement fino y grant/vínculo operativo vigente.
- Sensitive data posture: datos sintéticos, sin secretos ni payloads de clientes en evidencia versionada.
- Error contract: errores canónicos sanitizados; conflicto/denegación/unresolved no equivalen a cero ni fallback global.
- Abuse/rate-limit posture: límites de batch, replay y cuotas existentes; negativas y agotamiento ensayados según superficie.

### Runtime evidence

- Local checks: tests de comportamiento/imports reales y lint/types focales de los cambios que se implementen.
- DB/runtime checks: PostgreSQL efímero, schema relevante real, rollback/fallos y control de otra organización.
- Integration checks: contratos de puertos explícitos; simulación no certifica provider ni motor externo.
- Reliability signals/logs: extender registro/señales del dueño con contexto, sin inventar nombres productivos en el plan.
- Production verification sequence: sólo en gate TASK-1852 con aprobación concreta; este registro no ejecuta producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato y primitive

- Conciliar contrato Services sync/upsert y ownership de fuentes/objetos; eliminar selección por client LIMIT 1 en estos productores.

### Slice 2 — Integración y evidencia

- Aplicar guards de destino/versiones y tratamiento de batches parciales en los carriles cron, webhook, robot y proyección.
- Transferir evidencia y pendientes al EPIC y TASK-2094 sin afirmar apertura real.

## Out of Scope

- No construye otro sync ni provisiona Notion: TASK-925 conserva adopción de teamspaces; TASK-1960 posee el vínculo Proyecto→Servicio.
- Producción, backfills reales, envíos, compras, push/deploy y cambios en la historia de Diseño bajo la autorización actual.

## Detailed Spec

Implementar el contrato de esta task en su dueño existente. El ADR aceptó el modelo B el 2026-11-06; esa
aceptación no autoriza migrations, filas reales ni apertura. Los casos negativos de TASK-2094 son regresiones a resolver,
no comportamiento válido que deba conservarse. Consumidores externos conservan sus tasks y sus criterios.

## Rollout Plan & Risk Matrix

Registro repo-only; no production runtime impact en esta sesión. La implementación futura exige gates proporcionales.

### Slice ordering hard rule

Contratos upstream → Slice 1 → Slice 2 → certificación TASK-2094 → apertura explícita por TASK-1852.
La preparación de operaciones precede al canary; su observación real es posterior, sin esperar cierre total circular.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Mezcla o ampliación de acceso | Identity/datos | high | contexto explícito y pruebas negativas | denegación/conflicto correlacionado |
| Reasignación de historia | Sync/Finance/ICO | high | versiones, control histórico y rollback probado | diferencia de IDs/hash o residual |

### Feature flags / cutover

No se inventa un nombre de flag ni se activa ninguno. Seleccionar el gate en el plan de implementación;
capacidad multi-Space permanece cerrada hasta demostrar compatibilidad de consumers y writers.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | Retirar cambio local y fixtures propias | Medir al implementar | sí, local |
| 2 | Pausar carril nuevo, preservar writers compatibles y audit | Medir y ensayar antes de habilitar | depende del efecto; nunca borrar historia |

### Production verification sequence

Piso de código compatible → plan de alta revisable → aprobación específica → canary por capacidad/persona →
readback de Diseño/SEO/control → observación/reconciliación. Sólo TASK-1852 coordina esa habilitación.

### Out-of-band coordination required

Ninguna para documentación o fixtures. Integraciones/providers/operadores requieren coordinación en su gate posterior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Replays antiguos, concurrentes o con otro Space conservan owner e historia; conflictos quedan observables y no se convierten en éxito global.
- [ ] Cada carril Services/Notion/BQ→PG usa el mismo binding; una fuente no pertenece a dos Spaces por duplicar registro.
- [ ] targetSpaceIds se valida también para writes; la limpieza sólo procede con fuente completa y autorizada, nunca por un batch parcial o fallido.
- [ ] Source of truth, API/command y consumidores conciliados con código/schema real; capability + grant + prueba de paridad cuando corresponda.
- [ ] Invariantes, frontera tenant/Space, concurrencia e idempotencia verificadas con negativos y control externo.
- [ ] DDL/destinos permitidos, backfill y rollback explícitos; errores sanitizados, audit y señales del dueño comprobados.
- [ ] Evidencia runtime local separa componentes reales de mocks; no acredita producción ni historia real por inferencia.
- [ ] Cada carril (cron diario, webhook síncrono, intake asíncrono, backfill, rutas admin y writers Notion→PG) resuelve el destino con el mismo resolver; ninguno conserva un `LIMIT 1` propio por company o client.
- [ ] Un replay o evento antiguo no cambia el `space_id` de un servicio ya asignado; el cambio exige expected version o queda como conflicto observable.
- [ ] Una base Notion no puede quedar registrada en dos Spaces: la restricción existe en schema y el intento produce error canónico.
- [ ] Con dos Spaces bajo el mismo client, el sync no crea ni elige un Space por defecto y el adapter deja de pasar `client_id` como company de HubSpot.

## Verification

- `pnpm task:lint --task TASK-2097`
- Lint/types/tests focales y DB/integración de Slice 2 durante implementación; no se ejecutan por registrar el plan.
- Comparar antes/después de fixtures Diseño, SEO y control y documentar cualquier limitación pendiente.

## Closing Protocol

- [ ] Lifecycle/carpeta/registry/README y Status real reflejan evidencia.
- [ ] Acceptance criteria tildados sólo con prueba vinculada; dependencias downstream y EPIC al día.
- [ ] Handoff, manual/arquitectura del dueño y gates documentales actualizados.
- [ ] Ningún rollout o modificación histórica se infiere del cierre local.

## Follow-ups

No construye otro sync ni provisiona Notion: TASK-925 conserva adopción de teamspaces; TASK-1960 posee el vínculo Proyecto→Servicio.

## Delta 2026-11-06 — Revisión contra código

[Revisión del programa](../../audits/client-portal/2026-11-06-operational-accounts-code-review/README.md), hallazgos H7 y H8: carriles, archivos y criterios completados.
