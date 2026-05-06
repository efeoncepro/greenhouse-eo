# TASK-802 — Engagement Commercial Terms Time-Versioned

## Delta 2026-05-06

- Auditoría arch-architect detectó 30 filas fantasma en `core.services` (cross-product `service_modules × clients` del 2026-03-16, `hubspot_service_id IS NULL`).
- **TASK-813** archiva esas 30 filas con `active=FALSE` + `status='legacy_seed_archived'` antes de que esta task corra. Sin ese cleanup previo, los helpers `declareCommercialTerms` podrían registrar términos comerciales contra services fantasma → datos inválidos en `engagement_commercial_terms`.
- Recomendación: agregar `WHERE active=TRUE AND status != 'legacy_seed_archived'` al UI selector y queries que listen services elegibles para declarar terms.
- Soft dep agregado: TASK-813 (recomendado correr antes; no rompe TASK-802 si no se respeta, solo introduce ruido en la nueva tabla).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado`
- Domain: `commercial`
- Blocked by: `TASK-801`
- Branch: `task/TASK-802-engagement-commercial-terms-time-versioned`

## Summary

Crea tabla `greenhouse_commercial.engagement_commercial_terms` con time-versioning (`effective_from/to` + UNIQUE active partial index), patrón heredado de TASK-700. Helper TS canónico `getActiveCommercialTerms(serviceId, atDate?)`. Modela los 4 valores de `terms_kind`: `committed | no_cost | success_fee | reduced_fee`. Soporta transiciones (un Sample Sprint que pasa a contrato no muta el service_id — agrega un nuevo registro de terms y mantiene historial).

## Why This Task Exists

Sin esta tabla, los términos comerciales del Sample Sprint viven en `commitment_terms_json` (JSONB libre), perdiendo: temporalidad (un Sprint puede empezar `no_cost` y pasar a `success_fee` mid-flight), trazabilidad (quién declaró los términos y por qué), validación (CHECK de enum + reason length). Time-versioned terms es el patrón canónico TASK-700 (internal_account_number_registry) aplicado al dominio comercial.

## Goal

- Tabla `engagement_commercial_terms` creada con DDL completa de §3.2 Capa 2.
- UNIQUE partial index garantiza máximo 1 fila activa per service_id (`WHERE effective_to IS NULL`).
- Helper TS `getActiveCommercialTerms` retorna terms vigente al `atDate` provisto (o `NOW()` por default).
- Helper TS `declareCommercialTerms({ serviceId, kind, effectiveFrom, monthlyAmount?, successCriteria?, reason, declaredBy })` cierra terms anterior y abre nuevo en una sola tx.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 2.

Patrones canónicos:

- TASK-700 — time-versioned terms (`effective_from/to` + UNIQUE active partial index)
- TASK-760/761/762 — FK actor pattern (`declared_by TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL`)

Reglas obligatorias:

- `engagement_commercial_terms_active_unique` (partial index `WHERE effective_to IS NULL`) — máximo 1 fila activa por service.
- `reason TEXT NOT NULL CHECK (length(reason) >= 10)` — todo cambio de terms requiere razón humana.
- `effective_to > effective_from` CHECK invariant.
- Helper escribe close-prior + open-new en una sola transacción Postgres atómica.

## Slice Scope

DDL (de §3.2 Capa 2):

```sql
CREATE TABLE greenhouse_commercial.engagement_commercial_terms ( ... );
CREATE UNIQUE INDEX engagement_commercial_terms_active_unique ... WHERE effective_to IS NULL;
CREATE INDEX engagement_commercial_terms_kind_idx ... WHERE effective_to IS NULL;
```

Helpers TS (`src/lib/commercial/sample-sprints/commercial-terms.ts`):

```ts
getActiveCommercialTerms(serviceId: string, atDate?: Date): EngagementCommercialTerms | null
declareCommercialTerms(input: DeclareCommercialTermsInput): { termsId: string }
```

Tests:

- Unit: helper retorna terms activo correcto al date provisto.
- Integration: declare cierra prior + abre new atómico (tx fail = rollback ambos).
- Concurrency: 2 declare simultáneos → uno gana, otro falla con conflict (gracias a partial UNIQUE index).

## Acceptance Criteria

- DDL aplicada y verificada via `information_schema`.
- `pnpm db:generate-types` actualiza `db.d.ts` con tipo `EngagementCommercialTerms`.
- Helper `getActiveCommercialTerms` con tests cubriendo: terms activo, terms cerrado, sin terms, `atDate` en el pasado.
- Helper `declareCommercialTerms` con tests: declare new, transition kind, race condition.
- `pnpm lint` + `pnpm test` verde.

## Dependencies

- Blocked by: TASK-801 (necesita `services.engagement_kind` columna).
- Bloquea: TASK-803, TASK-804, TASK-806, TASK-808, TASK-809.

## References

- Spec: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 2
- Patrón: `migrations/*task-700*` (internal_account_number)
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
