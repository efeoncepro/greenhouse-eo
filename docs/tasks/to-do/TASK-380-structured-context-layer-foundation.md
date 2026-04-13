# TASK-380 — Structured Context Layer Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Lifecycle note: `implemented in branch; pending shared dev DB apply because the shared database is ahead of this branch with TASK-379 migration history`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Foundation implementada en rama`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-380-structured-context-layer-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse necesita una capa canónica para contexto estructurado flexible sobre PostgreSQL sin degradar el modelo relacional como fuente de verdad. Esta task formaliza una `Structured Context Layer` para guardar documentos JSONB tipados, versionados y tenant-safe que sirvan a integraciones, flujos reactivos, auditoría operativa y memoria de agentes.

## Why This Task Exists

Hoy el repo ya usa JSON/JSONB en varios módulos, pero de forma dispersa y sin un contrato de plataforma común. Eso funciona para payloads puntuales, pero no alcanza para escalar contexto reutilizable entre integraciones, replay reactivo, trazabilidad y trabajo asistido por agentes. El gap no es "usar JSONB"; el gap es no tener una capa gobernada que diga qué vive ahí, cómo se valida, quién lo produce, cómo se versiona y cuándo ese contexto debe promocionarse a tablas relacionales.

## Goal

- Crear una foundation canónica `greenhouse_context` para documentos de contexto estructurado.
- Materializar una librería runtime tipada para leer/escribir contexto con validación y tenant isolation.
- Dejar el primer set de `context_kind` orientado a integraciones, reactividad y trabajo de agentes.
- Incluir guardrails enterprise de clasificación, retención, redacción, idempotencia y límites de tamaño desde el diseño base.

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
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`

Reglas obligatorias:

- El modelo relacional canónico sigue siendo la fuente de verdad para entidades, balances, estados y contratos de negocio.
- La Structured Context Layer es sidecar: guarda contexto flexible, snapshots controlados, payloads normalizados y memoria operativa; no reemplaza tablas de dominio cuando un dato se vuelve crítico, consultable o transaccional.
- Todo documento de contexto debe ser tenant-safe, tipado por `context_kind` y versionado por `schema_version`.
- Ningún writer puede introducir `new Pool()` ni leer `GREENHOUSE_POSTGRES_*` directo; usar `getDb`, `query` o `withTransaction`.
- Regla explícita para agentes:
  - si el dato es verdad canónica del negocio, usar modelo relacional
  - si el dato es contexto flexible persistible y reusable dentro de PostgreSQL, usar `JSONB`
  - si solo importa preservar representación cruda exacta y no necesitas comportamiento de DB, `JSON` es excepcionalmente aceptable
  - si el campo empieza a usarse para joins, reporting, access control o reglas de negocio, debe promocionarse a columnas/tablas relacionales
- La foundation no puede almacenar secretos, tokens, cookies, credenciales ni blobs binarios/base64 grandes dentro de `document_jsonb`.
- Cada `context_kind` debe tener política explícita de sensibilidad, retención y access scope.

## Normative Docs

- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `src/lib/db.ts`
- `src/lib/postgres/client.ts`

### Blocks / Impacts

- future hardening de pipelines reactivos y replay operativo
- normalización de payloads externos y sister platforms
- memoria estructurada para auditorías, resultados y trazas de agentes
- follow-ons de observabilidad y debugging con contexto persistido

### Files owned

- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/tasks/to-do/TASK-380-structured-context-layer-foundation.md`
- `src/lib/structured-context/**`
- `src/app/api/**` si la task derivada expone surfaces
- `migrations/**`

## Current Repo State

### Already exists

- uso disperso de JSON/JSONB en payloads y metadata de sync, webhooks, assets y finance
- foundations de PostgreSQL y Kysely ya institucionalizadas en el repo
- pipelines reactivos, outbox y módulos de integración que pueden consumir contexto sidecar

### Gap

- no existe schema `greenhouse_context`
- no existe una taxonomía canónica de `context_kind`
- no existe una librería shared para validar y persistir contexto estructurado
- no existe una convención formal para memoria de agentes o replay enriquecido

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

### Slice 1 — Foundation PostgreSQL

- crear migración oficial para schema `greenhouse_context`
- materializar `context_documents` como tabla base de documentos de contexto
- evaluar `context_document_versions` para historial inmutable o append-only cuando aplique
- dejar índices tenant-safe y lookup por aggregate owner + `context_kind`

### Slice 2 — Runtime tipado

- crear `src/lib/structured-context/` como raíz de runtime
- definir types, validators y contrato de lectura/escritura
- soportar `schema_version`, `source_system`, `producer_type`, `producer_id` y ownership del aggregate

### Slice 3 — Taxonomía inicial y pilotos

- definir primeros `context_kind` para:
  - `integration.raw_payload`
  - `integration.normalized_payload`
  - `event.replay_context`
  - `agent.audit_report`
  - `agent.execution_plan`
  - `agent.assumption_set`
  - `agent.result_summary`
- conectar al menos un piloto real de escritura/lectura en un módulo existente

### Slice 4 — Gobernanza y adopción

- documentar cuándo usar contexto estructurado vs tabla relacional
- documentar anti-patrones y criterio de promoción a modelo físico
- dejar tests o smoke checks que aseguren validación y aislamiento por tenant

### Slice 5 — Enterprise hardening

- definir envelope mínimo para clasificación, redacción y access scope
- definir política de retención y expiración por `context_kind`
- definir estrategia de idempotencia, `content_hash` y lineage entre documentos
- definir límites de tamaño y prohibición de binarios/base64 en `document_jsonb`
- definir manejo de validación fallida, observabilidad y quarantine/dead-letter operativo

## Out of Scope

- migrar de golpe todos los JSONB existentes del repo
- usar esta capa para esconder campos relacionales mal modelados
- reemplazar el modelo canónico de Finance, HR, Identity o Space 360
- abrir una surface UI nueva si no existe un consumer inmediato

## Detailed Spec

La arquitectura base propuesta vive en `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md` y define:

- nombre canónico: `Structured Context Layer`
- schema recomendado: `greenhouse_context`
- code root: `src/lib/structured-context/`
- modelo sidecar por aggregate, no `jsonb` embebido "por comodidad" en cualquier tabla
- gobierno explícito de tipos de documento, versión de schema, productor y source system

La decisión arquitectónica central es que Greenhouse necesita una memoria estructurada reutilizable para trabajo distribuido entre módulos, crons e incluso agentes. El objetivo no es convertir PostgreSQL en un document store genérico, sino agregar una capa controlada para:

- snapshots y payloads normalizados de integraciones
- replay context de eventos o proyecciones
- bundles de auditoría y resolución de supuestos
- memoria de trabajo operativa que hoy termina enterrada en docs o prompts

La implementación de esta task debe dejar una guía reusable para agentes y developers sobre cuándo aplicar:

- tabla/columna relacional
- `JSONB` inline local
- `JSONB` en la Structured Context Layer
- `JSON` como excepción

Además, la foundation debe salir con criterios enterprise explícitos para:

- clasificación de datos
- retención
- redacción
- idempotencia
- límites de tamaño
- observabilidad y quarantine

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe schema `greenhouse_context` con tabla base y contrato mínimo de ownership + tenant isolation
- [x] Existe runtime tipado compartido para validar y persistir documentos de contexto
- [x] Existe una taxonomía inicial de `context_kind` con al menos dos validators reales
- [x] Al menos un consumer piloto escribe y lee contexto estructurado de forma tenant-safe

## Execution Notes

- Implementación materializada en:
  - `migrations/20260413113902271_structured-context-layer-foundation.sql`
  - `src/lib/structured-context/**`
  - piloto reactivo en `src/lib/sync/reactive-run-tracker.ts`
- Validación cerrada en rama:
  - tests unitarios de la capa
  - eslint dirigido sobre runtime nuevo
  - `pnpm build`
- Bloqueo real detectado:
  - `pnpm pg:connect:migrate` no pudo aplicar en el shared dev DB porque ese entorno ya tiene corrida `20260413105218813_reactive-pipeline-v2-circuit-breaker` de `TASK-379`, migración que esta rama/worktree todavía no trae

## Implementation Learnings

- los tipos de documentos persistidos deben ser JSON puros también en TypeScript; `undefined` en objetos sidecar rompe el contrato aunque el runtime parezca aceptarlo
- el fallback correcto para campos opcionales de documentos persistidos es `null`, no `undefined`
- la capa gana mucho valor cuando el documento inválido cae primero en quarantine y luego falla; así no se pierde evidencia operativa
- el primer piloto confirmó que un sidecar de contexto no debe derribar el flujo canónico si falla; en reactive tracking se aplicó degradación con warning en vez de caída dura del worker
- la idempotencia funciona mejor como constraint acotado a `owner_aggregate_type + owner_aggregate_id + context_kind + idempotency_key`, no como llave global
- no se justificó un índice GIN global sobre `document_jsonb` en la foundation; el lookup principal es por owner, kind, tenant y source system
- trabajar con worktrees aislados puede exponer fricciones del toolchain local; Turbopack rechazó `node_modules` symlink fuera del root y hubo que instalar dependencias localmente en el worktree
- el shared dev DB puede quedar adelantado respecto a la rama actual cuando varios agentes aplican migraciones en paralelo; eso debe tratarse como drift operativo, no automáticamente como fallo del cambio nuevo

## Critical Considerations

- no abrir `context_kind` nuevos sin validator, access scope, clasificación y retención explícita
- no usar esta capa para diferir modelado relacional de datos que ya son contractuales o transaccionales
- no persistir secretos, cookies, tokens ni blobs/base64 grandes
- no asumir que todo consumer debe depender sin fallback del sidecar desde el día uno
- si un documento empieza a usarse para joins, reporting o reglas de negocio, planear promoción a modelo relacional
- cuando una migración de esta layer no aplica en un entorno compartido, verificar primero drift de historia con otras ramas antes de mezclar migraciones ajenas en la branch
- [ ] La arquitectura y el criterio de uso quedan documentados para equipos y agentes
- [ ] Existen reglas explícitas de clasificación, retención, access scope, redacción e idempotencia para la foundation
- [ ] La foundation prohíbe secretos y blobs binarios en `document_jsonb` y define estrategia de quarantine para documentos inválidos

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual o smoke de lectura/escritura sobre el piloto implementado

## Closing Protocol

- [ ] correr `pnpm migrate:create <nombre>` para la migración oficial; nunca crearla a mano
- [ ] si hay migración nueva, aplicar `pnpm pg:connect:migrate` y regenerar `src/types/db.d.ts` en el mismo lote
- [ ] actualizar `project_context.md`, `Handoff.md` y `changelog.md` si la foundation queda materializada

## Follow-ups

- materializar surfaces de observabilidad y replay sobre contexto estructurado
- explorar persistencia formal de auditorías y resultados de agentes
- evaluar readers genéricos por aggregate para debugging y soporte operativo

## Open Questions

- si `context_kind` debe quedar gobernado por enum físico, tabla registry o validación runtime con constraint liviano
- cuánto historial versionado debe ser inmutable por default vs overwrite controlado
- qué pilotos conviene activar primero para capturar valor sin generar sobre-ingeniería
