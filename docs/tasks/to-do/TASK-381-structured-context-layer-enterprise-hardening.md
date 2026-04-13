# TASK-381 — Structured Context Layer Enterprise Hardening

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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-380`
- Branch: `task/TASK-381-structured-context-layer-enterprise-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`TASK-380` dejó la foundation de Structured Context Layer operativa, pero todavía falta el hardening para que sea una capability enterprise reusable y gobernada. Esta task formaliza lo que sigue: registry de `context_kind`, readers canónicos con enforcement real, lifecycle/retention, observabilidad, pilotos adicionales y criterio explícito de promoción a modelo relacional.

## Why This Task Exists

La foundation ya permite persistir contexto estructurado sidecar, pero hoy la adopción amplia todavía sería frágil si cada writer pudiera inventar kinds, si el access scope quedara solo como metadata, o si no hubiera lifecycle operativo para quarantine, expiración, auditoría y adopción multi-módulo. El gap ya no es "cómo guardar JSONB", sino cómo convertir esa capa en un contrato de plataforma robusto para integraciones, pipelines reactivos, operaciones y trabajo asistido por agentes sin degradar el modelo de datos principal.

## Goal

- Formalizar una gobernanza canónica de `context_kind` con registry, ownership, clasificación y policy runtime.
- Crear readers y enforcement tenant-safe para que la capa pueda consumirse sin lógica ad hoc por módulo.
- Definir lifecycle enterprise: retention, quarantine, redaction, lineage y promotion criteria.
- Conectar al menos un segundo piloto real para validar adopción fuera del primer caso reactivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- El modelo relacional sigue siendo la fuente de verdad para entidades, estados, joins, reporting contractual y reglas de negocio.
- La Structured Context Layer no puede convertirse en "cajón de sastre" para evitar modelado; cada `context_kind` nuevo debe tener validator, owner domain, access scope, data classification y retention policy explícitos.
- Los readers deben aplicar tenant isolation y access scope como enforcement real, no solo devolver metadata.
- Ningún writer o reader nuevo puede introducir acceso PostgreSQL fuera de `getDb`, `query` o `withTransaction`.
- La capa no puede persistir secretos, tokens, cookies, credenciales ni blobs/binarios/base64 grandes.
- Si un documento empieza a usarse para filtros operativos core, joins, reporting, access control o reglas de negocio, debe disparar promoción a modelo relacional.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/plataforma/capa-contexto-estructurado.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-380-structured-context-layer-foundation.md`
- `migrations/20260413113902271_structured-context-layer-foundation.sql`
- `src/lib/structured-context/**`
- `src/lib/sync/reactive-run-tracker.ts`
- `src/types/db.d.ts`

### Blocks / Impacts

- adopción segura de contexto estructurado en integraciones y sister platforms
- replay reactivo con evidencia richer y consumers canónicos
- memoria estructurada reusable por agentes sin drift de esquema
- policy de cuándo un payload sidecar debe promocionarse a tablas relacionales

### Files owned

- `docs/tasks/to-do/TASK-381-structured-context-layer-enterprise-hardening.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/documentation/plataforma/capa-contexto-estructurado.md`
- `src/lib/structured-context/**`
- `src/lib/sync/**` o `src/lib/integrations/**` si se conecta el segundo piloto
- `migrations/**` si la gobernanza requiere tablas/policies adicionales

## Current Repo State

### Already exists

- schema `greenhouse_context` materializado en shared dev DB
- runtime base para tipos, validación, hashing, store y quarantine
- taxonomía inicial con algunos validators reales
- primer piloto real en `src/lib/sync/reactive-run-tracker.ts`
- documentación base arquitectónica y funcional de la SCL

### Gap

- no existe un registry canónico y enforceable de `context_kind`
- no existen readers shared con access scope enforcement y lookup estable por owner/kind/version
- la política de retention y resolución de quarantine está documentada a nivel foundation, pero no instrumentada como lifecycle operativo completo
- falta observabilidad transversal para volumen, growth, invalidaciones, expiraciones y adopción
- falta un segundo piloto real que pruebe la capa fuera del caso reactivo
- falta un playbook claro de promoción de sidecar a modelo relacional cuando un contexto se vuelve contractual

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

### Slice 1 — Context Kind Registry & Governance

- definir registry canónico de `context_kind` en runtime y/o persistencia, con contrato obligatorio por kind
- incluir `owner_domain`, `schema_version`, `access_scope`, `data_classification`, `retention_policy`, `max_document_bytes` y producer policy
- impedir que un writer persista kinds no registrados o versiones no soportadas

### Slice 2 — Readers Canónicos + Access Enforcement

- crear readers shared tipo `getContextByOwner`, `getLatestContext`, `listContextVersions` y `listQuarantineForOwner`
- centralizar filtros tenant-safe, ownership y access scope enforcement
- evitar que cada consumer arme SQL ad hoc sobre `greenhouse_context`

### Slice 3 — Lifecycle, Retention & Quarantine Ops

- materializar lifecycle operativo para expiración, archivado o purge según policy
- definir y ejecutar estrategia de resolución de quarantine, replay o descarte con evidencia
- dejar lineage/document relationships claros para tracing y auditoría

### Slice 4 — Observability & Admin Signals

- exponer métricas o readers operativos para volumen por kind, invalidaciones, quarantine abierta, expiraciones y growth
- integrar señales mínimas con la surface operativa existente o dejar un contrato claro para Ops Health/Admin
- documentar thresholds, síntomas de drift y acciones esperadas

### Slice 5 — Piloto adicional + Promotion Criteria

- conectar al menos un segundo piloto real fuera del primer caso reactivo
- documentar la matriz de decisión para mantener contexto en SCL vs promoverlo a columnas/tablas relacionales
- dejar ejemplos explícitos para integraciones, agentes y pipelines reactivos

## Out of Scope

- migrar de golpe todos los `JSONB` del repo a esta layer
- exponer una UI genérica client-facing para explorar documentos sidecar
- convertir SCL en source of truth de entidades, balances o estados de negocio
- introducir search/indexing pesado sobre `document_jsonb` sin patrón real de lectura medido
- reemplazar el pipeline reactivo enterprise de `TASK-379`

## Detailed Spec

El hardening esperado de esta task debe cerrar el paso entre "foundation utilizable" y "capability de plataforma". Como mínimo, cada `context_kind` debe poder responder:

- quién lo produce
- quién lo puede leer
- cuánto vive
- cuál es su clasificación de datos
- qué schema_version soporta
- cuándo debe promoverse a modelo relacional

La recomendación base es no dejar estos atributos solo en documentación. El agente que implemente debe evaluar qué partes viven:

- en un registry runtime versionado dentro de `src/lib/structured-context/`
- en metadatos persistidos del schema `greenhouse_context`
- o en ambos, con el runtime como enforcement primario y PostgreSQL como evidencia / soporte operacional

El reader layer debe convertirse en el punto canónico para consumo por módulos y agentes. La meta no es un ORM nuevo, sino evitar lecturas ad hoc con filtros inconsistentes y que el access scope quede sin enforcement.

El segundo piloto debe elegirse por valor real de plataforma, no por conveniencia artificial. Candidatos razonables:

- `integration.normalized_payload` en un flujo de integración o sister platform
- `agent.execution_plan` o `agent.audit_report` en una lane operativa ya existente
- contexto de conciliación o replay enriquecido si el consumer ya existe y el blast radius es controlado

La documentación debe dejar un contrato muy explícito para agentes:

- cuándo usar `JSONB` sidecar
- cuándo no usarlo
- señales de que el diseño ya exige promoción relacional
- anti-patrones típicos en adopción multi-agente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe registry canónico de `context_kind` con enforcement real para writers
- [ ] Existen readers shared tenant-safe que aplican access scope y ownership sin SQL ad hoc por consumer
- [ ] La capa tiene lifecycle operativo explícito para retention, expiración y quarantine
- [ ] Existe observabilidad mínima para adopción, invalidaciones, growth y salud operativa de la SCL
- [ ] Existe al menos un segundo piloto real de escritura/lectura fuera del primer caso reactivo
- [ ] La arquitectura y documentación funcional dejan criterio explícito de promoción desde SCL a modelo relacional

## Verification

- `pnpm exec vitest run src/lib/structured-context/**/*.test.ts`
- `pnpm exec eslint src/lib/structured-context/**`
- `pnpm build`
- validación manual o smoke técnico del segundo piloto elegido
- validación manual de readers / metrics / quarantine sobre shared dev DB si se agregan migrations o jobs

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md` con el modelo final de registry/readers/lifecycle
- [ ] Actualizar `docs/documentation/plataforma/capa-contexto-estructurado.md` con reglas legibles para adopción de equipos y agentes
- [ ] Registrar en `Handoff.md` qué piloto adicional quedó conectado y qué follow-ons siguen abiertos

## Follow-ups

- evaluar si alguna familia de `context_kind` necesita tabla relacional auxiliar de governance
- abrir tasks derivadas por dominio si la adopción en finance, integrations o agents prueba valor y exige surfaces nuevas
- decidir si la observabilidad termina en Admin Center, Ops Health o ambos

## Open Questions

- qué segundo piloto entrega mejor señal de valor con menor blast radius
- si el registry debe vivir solo en código o también tener representación persistida para auditoría y tooling
- cuánto de la política de retention se ejecuta en PostgreSQL, cuánto en ops-worker y cuánto queda solo como enforcement runtime
