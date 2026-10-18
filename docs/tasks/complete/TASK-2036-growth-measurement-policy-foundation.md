# TASK-2036 — Growth measurement policy foundation and authenticated scope

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Status real: `Publicado main9690efad, orquestador38591329633/manifest released; Server9 y watchdog6/6/drift0; API/CLI/UI y alta por datos verificados; tráfico real fuera de este cierre`
- Rank: `Now`
- Domain: `data|growth`
- Blocked by: `none`
- Branch: `develop; checkout compartido, sin worktrees`

## Summary

Growth measurement policy foundation and authenticated scope. Unidad dependiente de TASK-2035, goal limitado aprobado14/10, un release final completo.

## Why This Task Exists

Reemplazar listas por datos publicados sin ampliar autoridad browser ni romper matching existente.

## Goal

- Configuración reusable y verificable sin releases por alta compatible.
- Conservar consentimiento, privacidad y fuente comercial de conversión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/plans/TASK-2035-plan.md` — aprobado por el operador14/10.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md`

## Current Repo State

El bloque Already exists/Gap conserva el snapshot de intake previo a implementar. El estado
vigente es Status real y el cierre publicado; no reejecutar estos gaps históricos.

### Already exists

Forms/Meetings, medición cifrada, dispatcher y cockpit publicados; CAPI corregida en develop.

### Gap

Las dos listas fijas impiden altas por datos; falta configuración versionada administrable.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/measurement` y cockpit Growth Forms existentes
- Future candidate home: `domain-package`
- Boundary: policy command/reader y DTO; fuente acepta, Measurement autoriza y entrega
- Server/browser split: SQL, autoridad y contactos server-only; browser sólo DTO administrativo
- Build impact: no dependencia nueva; renderer y worker existentes
- Extraction blocker: transacción de aceptación, auth y cola compartidas

## Dependencies & Impact

### Depends on

- TASK-2035, plan aprobado; TASK-2034 conserva reparación CAPI y evidencia real pendiente.


### Blocks / Impacts

- Alta compatible de Forms/Meetings y release conjunto.

### Files owned

src/lib/growth/measurement/**; migrations; entitlements; Product API; Forms/Meetings commands; sGTM.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: greenhouse_growth.measurement_policy y revisiones/auditoría
- Consumidores afectados: Forms, Meetings, worker, Product API y UI
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: measurement/contracts.ts, Forms/Meetings commands y sGTM
- Contrato nuevo o modificado: policy command/reader; /api/admin/growth/measurement
- Backward compatibility: `gated`; corte coordinado, sin ampliar alcance desde browser
- Full API parity: primitive autorizado compartido por Product API/CLI/UI; no lógica en JSX

### Data model and invariants

- Entidades/tablas/views afectadas: greenhouse_growth.measurement_policy, measurement_policy_revision, measurement_policy_audit, measurement_conversion
- Invariantes: consentimiento/GPC, un sender, aceptación comercial independiente y snapshot cifrado48h
- Write-target allowlist: no boundary test de escritura Growth existente; destinos explícitos anteriores
- Tenant/space boundary: configuración global Efeonce, sólo actor interno/capability efectiva; clientes denegados
- Idempotency/concurrency: key/fingerprint, row locks/CAS, revisión inmutable y unique source
- Audit/outbox/history: audit append-only sin contactos ni payloads sensibles

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: fuentes nuevas OFF; seed equivalente seis Forms/único binding real
- Backfill plan: dry-run/seed sin reconstruir consentimientos o conversiones
- Rollback path: flags OFF, disable policy y runtime/Client compatibles, sin borrar ledger
- External coordination: Preview/publish sGTM; un release completo develop→main

### Security and access

- Auth/access gate: growth.measurement.read/author/publish/disable, actor interno y scope fuente
- Sensitive data posture: configuración sin PII; matching cifrado, logs/Sentry saneados
- Error contract: clases cerradas, sin errores provider/SQL crudos
- Abuse/rate-limit posture: API autenticada, tamaño/schema cerrados y publicación por CAS

### Runtime evidence

- Local checks: policy/mapping/auth/destinos/consentimiento/revocación/compatibilidad
- DB/runtime checks: migración, seed dry-run/readback, grants y revisiones
- Integration checks: Preview + Meta Test Events real temporal y alta por datos sin nuevo build
- Reliability signals/logs: receipts por destino y safe_error_class existentes
- Production verification sequence: release/worker/migración/seed/Client/flags/hosts/readback

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

### Slice 1 — Contrato

Autoridad, estado y mapeo declarados; decisiones en ADR/plan y fuente existente.

### Slice 2 — Implementación y verificación

Primitive/API o consumer según ownership; pruebas de destino/consentimiento y cierre runtime.

## Out of Scope

CRO, abandono, newsletter, CRM/outcomes, campañas, infraestructura nueva y cambios ajenos.

## Detailed Spec

Plan aprobado docs/tasks/plans/TASK-2035-plan.md y ADR de policy.

## Rollout Plan & Risk Matrix

Cambio additive y corte coordinado con el release completo. No infraestructura nueva.

### Slice ordering hard rule

ADR/schema→policy/API→captura/worker/Client→consumer UI→verificación→release/cutover.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Policy incompatible | matching | medium | validación/default OFF/snapshot | clase segura por destino |
| Client/runtime distintos | CAPI | medium | pausa captura y corte con readback | HTTP/ack/manifest |
| Scope o campo inválido | privacidad | low | autorización fina y tipos cerrados | bloqueo de publicación |

### Feature flags / cutover

Conservar GROWTH_MEASUREMENT_CAPTURE_ENABLED/META_ENABLED/GOOGLE_UPD_ENABLED/RETENTION_ENABLED.
Captura se reactiva sólo tras runtime, migración, policies equivalentes y Client compatibles.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Foundation | disable policy/flags; conservar registros | minutos | sí |
| UI | revert consumidor sin alterar policies | minutos | sí |
| Runtime | release previo y Client compatible, sin dos senders | minutos | sí |

### Production verification sequence

CI/Deep→release completo/worker→migración/seed→Preview/publish Client→flags→Test Events y hosts.

### Out-of-band coordination required

GTM/Meta/hosts existentes con autorización de esta corrida; sin nuevas credenciales/permisos/gasto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Plan aprobado y ownership separados, sin duplicar tasks existentes — aprobación14/10; TASK-2036 foundation/TASK-2037 consumer y registro verificados.
- [x] Alta compatible demostrada por datos sin nuevo build/redeploy/publish GTM — fuente nueva15:56Z, CLI producción y Meta Test Eventc7dd1839; snapshots main/deployment/Server9 idénticos.
- [x] Consentimiento/GPC/revocación, identidad, scopes y matching preservados —74 pruebas foundation más contratos/bridge; negativos live400, frontera Forms/CRM13 PASS.
- [x] API/UI/worker/Client y versión desplegada verificados con Test Events aislados — release9690efad, Server9, Meta UI ambos hosts, health200 y watchdog6/6.

## Verification

Tests/lint focales, CI completo y gates de policy/DB o UI según perfil. Task lint/closure/context strict.

## Closing Protocol

- [x] Lifecycle/carpeta/índices reflejan runtime real y evidencias por criterio — cierre publicado14/10; registry/README sincronizados.
- [x] Docs/skills espejos/handoff/changelog sincronizados; WIP ajeno preservado mediante staging explícito/parcial.
- [x] Un release completo y recibos — PR255/orch38591329633; TASK-2034 conserva tráfico comercial/EMQ pendiente.

## Follow-ups

TASK-2035 conserva los demás slices; TASK-2034 conserva la primera conversión comercial real.

## Open Questions

Ninguna bloqueante: decisiones del plan aprobadas14/10; los detalles quedan en ADR antes de código.

## Evidence — 2026-10-14

- Migración aditiva 20261014122346796 aplicada aisladamente con guard y grants; no se retiró ningún writer existente. El filtro del runner requiere no-check-order porque excluye los nombres aplicados al comparar el catálogo; no se renombraron timestamps ni se aplicaron otras migraciones.
- Seed por comando canónico: seis Forms y binding discovery; idempotencia y readback. Versiones reales fver-* se tratan como identidad opaca e inmutable.
- verify-policy-lifecycle.ts: nueva fuente businessEmail por datos, draft/review/publish/disable, conflicto CAS, replay/idempotency reuse, client denial, immutable trigger, auditoría4. Fixture archivada/surface inactiva; cero envíos, contactos, queue items o requests a proveedores.
- Vitest medición74 y Client27 PASS. Snapshot tipos regenerado. Typecheck previo incremental pasó antes de las últimas adiciones; la repetición completa local alcanzó4GiB. Verificación final en CI, sin build completo local.
- GTM workspace10 Preview: sólo template30 cambia sobre live7. Dos canaries Test Events v2 con ACK200/success; negativos400. Aún sin publicación del contrato v2 ni release Greenhouse.


### Agent-first acceptance addendum14/10

- [x] Versioned discovery + fresh read-only validation + shared HTTP client/CLI;18 targeted tests
  PASS (authority, typed mapping, CAS/state, safe schema errors, exact-origin session and durable
  known-receipt recovery). No SQL or browser required for operational commands.
- [x] Remote HTTP CLI lifecycle/readback on controlled sources — staging17 calls and production14 calls plus disable/readback; CI exact627/969 green.
- [x] Full develop→main release and production contract verified — PR255, manifest released and native HTTP contract canary; see final release audit.


### Cierre publicado14/10

[release y evidencia](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md). El cierre cubre configuración/CAPI y cliente agente; ningún fixture demuestra conversión comercial real ni EMQ.
