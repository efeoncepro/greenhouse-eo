# TASK-376 — Sister Platforms Read-Only External Surface Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-376-sister-platforms-read-only-external-surface-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer la surface read-only con la que Greenhouse debe exponer contexto operativo a sister platforms. Esta task toma la direccion ya planteada en `TASK-039` y la aterriza sobre el carril externo que hoy ya existe en el repo (`/api/integrations/v1/*`), convirtiendolo en una foundation enterprise para consumers externos del ecosistema: auth, tenancy binding, rate limiting, observabilidad y shape estable de lectura.

## Why This Task Exists

`TASK-039` y `TASK-040` ya dejaron planteado que Greenhouse debe tener una read API y un MCP downstream como adapter. El nuevo contrato de sister platforms sube el nivel de exigencia: esa surface ya no debe pensarse solo como export o AI tooling, sino como carril institucional para plataformas hermanas. Sin hardening, el primer consumer serio terminaria mezclando tenant inference, auth improvisada, namespace ambiguo y response shapes fragiles.

## Goal

- Convertir la read surface externa de Greenhouse en una capability defendible para sister platforms.
- Reusar la foundation de tenancy binding antes de abrir consumers concretos.
- Dejar el camino listo para MCP y para operator consoles externas como Kortex.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- La surface debe ser read-only por defecto.
- El auth model debe ser explicito y auditable.
- La tenancy no puede resolverse sin pasar por la foundation de bindings.
- MCP sigue siendo adapter downstream y no foundation base.

## Normative Docs

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/complete/TASK-375-sister-platforms-identity-tenancy-binding-foundation.md`
- `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`

## Dependencies & Impact

### Depends on

- `TASK-375`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`

### Blocks / Impacts

- `TASK-377`
- MCP downstream para sister platforms
- futuros consumers externos del ecosistema

### Files owned

- `src/app/api/integrations/v1/`
- `src/lib/sister-platforms/`
- `src/lib/integrations/`
- `migrations/`
- `docs/architecture/`
- `docs/api/`

## Current Repo State

### Already exists

- `TASK-039` y `TASK-040` ya definen el shape conceptual de una read API y del MCP read-only downstream.
- Greenhouse ya tiene un carril externo real en `src/app/api/integrations/v1/*` con helpers y shapes reutilizables.
- `TASK-375` ya dejo la foundation reusable de bindings cross-platform y su helper runtime.
- El contrato marco ya define read API y MCP como carriles permitidos.

### Gap

- El carril externo actual es generico y mezcla lectura con mutaciones; no existe todavia un lane sister-platform-first y read-only por defecto.
- No existe todavia un auth/consumer model canonico para plataformas hermanas.
- No existe request logging, rate limiting ni governance institucional especifica para este carril.
- La spec original todavia apuntaba a `src/app/api/v1/`, pero el repo real vive en `src/app/api/integrations/v1/*`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Consumer auth and tenancy resolution

- Amarrar un lane read-only sister-platform-first al binding canonico de sister platforms.
- Formalizar auth por consumer, scope resolution y consumer metadata.

### Slice 2 — Stable read endpoints

- Materializar el baseline minimo de endpoints read-only sobre `src/app/api/integrations/v1/*` que puedan consumir sister platforms.
- Asegurar response shapes estables y auditables.

### Slice 3 — Governance and observability

- Agregar rate limiting, request logging y trazabilidad de consumer cross-platform.
- Dejar la surface lista para que MCP la consuma sin bypassar estas reglas.

## Out of Scope

- Implementar todavia el MCP server completo.
- Escribir flows de mutacion cross-platform.
- Resolver Kortex-specific UX o deep links.

## Detailed Spec

La task debe aterrizar la regla:

`sister platform consumer -> auth explicita -> tenancy binding -> read-only integrations lane -> optional MCP adapter`

La implementacion no debe inventar un namespace nuevo fuera del carril externo vigente si no existe necesidad real. El baseline debe aterrizar sobre `src/app/api/integrations/v1/*`, idealmente aislando un lane read-only sister-platform-first dentro de esa surface en vez de mezclarlo con rutas genericas o mutativas ya existentes.

La read surface debe nacer reusable para:

- Kortex hoy
- futuras apps hermanas despues

y no como integration point ad hoc solo para un consumer.

La task tambien debe dejar explicito el split entre:

- lane generico de integraciones existente
- lane read-only endurecido para sister platforms
- MCP downstream como adapter posterior

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe una read surface externa formalmente ligada al binding de sister platforms.
- [x] El auth model, tenant resolution y request logging quedan definidos y ejecutables.
- [x] La surface es read-only por defecto y no abre mutaciones laterales.
- [x] La task deja el carril listo para un adapter MCP downstream.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke manual de endpoints read-only con consumer scope controlado

## Closing Protocol

- [x] Actualizar `TASK-039` o dejar delta si algun supuesto de esa spec cambia al aterrizar la surface real.
- [x] Actualizar esta task si el namespace final difiere del carril externo vigente por una razon arquitectonica aprobada.
- [x] Documentar el auth model final en la doc canonica que corresponda.

## Delta 2026-04-11

- Se corrigio la task para alinearla con el repo real: el carril externo vigente vive en `src/app/api/integrations/v1/*`, no en `src/app/api/v1/`.
- Se explicito que el gap actual no es "crear API v1 desde cero", sino endurecer una surface externa ya existente y aislar un lane sister-platform-first read-only.
- Se agrego como referencia obligatoria `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`.

## Delta 2026-04-11 — cierre real

- Se aplicó la migración `20260411201917370_sister-platform-read-surface-hardening.sql` vía `pnpm pg:connect:migrate`.
- `src/types/db.d.ts` quedó regenerado en el mismo lote.
- La task queda cerrada con lane read-only endurecido, auth por consumer y observabilidad base materializados.

## Follow-ups

- `TASK-377` — bridge Kortex sobre esta surface.
- MCP server downstream una vez cerrada la read API base.

## Open Questions

- Si conviene un auth model unico para sister platforms o separar internal trusted consumers vs tenant-scoped consumers.
