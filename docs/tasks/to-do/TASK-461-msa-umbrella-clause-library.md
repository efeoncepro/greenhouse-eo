# TASK-461 — MSA Umbrella Entity & Clause Library

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-460 (contracts entity)`
- Branch: `task/TASK-461-msa-umbrella-clause-library`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Introducir `greenhouse_commercial.master_agreements` como umbrella legal bajo el cual pueden colgar múltiples contracts (SOWs). Modela el marco legal negociado con clientes enterprise (Sky, Pinturas Berel México) y habilita clause library reutilizable para que los SOWs nuevos solo renegocien scope, heredando T&Cs.

## Why This Task Exists

Efeonce ya opera con MSAs firmados (Sky Airline + Pinturas Berel). El proceso involucra departamento legal + procurement del cliente + comercial del lado Efeonce. Los SOWs bajo esos MSAs renegocian solo scope (payment terms, IP, NDA quedan estables). Sin modelarlo:

- Los contracts (TASK-460) no pueden heredar clauses legales — cada SOW se modela como si fuera independiente
- No hay forma de consultar "¿cuántos SOWs vivos bajo el MSA de Sky?"
- Effective dates, expiration dates, renewal de MSAs no están gobernadas
- La clause library se mantiene en Word/PDF fuera del sistema

## Goal

- `greenhouse_commercial.master_agreements` como entidad con effective/expiration dates, jurisdicción, status
- `greenhouse_commercial.msa_clauses` como library de cláusulas reutilizables (NDA, IP, payment terms, limitation of liability, etc.)
- `greenhouse_commercial.master_agreement_clauses` como join MSA × clause con overrides
- Contract hereda clauses del MSA (si existe FK); puede override por SOW
- UI mínima para admin crear/gestionar MSAs y clause library
- Attach de PDF/documento firmado como asset

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- MSA es source-of-truth para T&Cs — contract hereda por default, puede overrride explícito
- Clause library versiona cambios (clauses pueden evolucionar; contracts activos quedan atados a la versión al momento de firma)
- Documento legal firmado es un asset (reuse del asset system existente)
- Admin-gated: solo `efeonce_admin` + `finance_admin` + rol legal (cuando exista) pueden editar MSAs

## Normative Docs

- TASK-460 — contracts entity
- `src/lib/commercial/governance/terms-store.ts` — patrón de terms/clauses ya usado en TASK-348
- `src/lib/assets/*` — asset system para attach de PDFs firmados

## Dependencies & Impact

### Depends on

- TASK-460 — contracts entity con `msa_id` nullable FK

### Blocks / Impacts

- Contract detail view (TASK-460) puede surfacear clauses heredadas del MSA
- Finance compliance reports (auditoría de T&Cs activas)
- Futura negociación de renewal de MSA con clientes enterprise

### Files owned

- `migrations/[verificar]-task-461-msa-schema.sql`
- `src/lib/commercial/msa-store.ts`
- `src/lib/commercial/msa-clauses-store.ts`
- `src/lib/commercial/msa-events.ts`
- `src/app/api/finance/master-agreements/**`
- `src/views/greenhouse/finance/MasterAgreementsView.tsx`
- `src/views/greenhouse/finance/MasterAgreementDetailView.tsx`
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- TASK-460 — `contracts.msa_id` nullable FK placeholder
- TASK-348 — pattern de terms/clauses con `quotation_terms` + `terms_library`
- Asset system para attach de PDFs firmados

### Gap

- No hay entidad MSA; los T&Cs se mantienen fuera del portal (Drive/Dropbox)
- Contract no hereda clauses porque no hay origen stable
- No hay visibilidad de "qué cláusulas gobiernan este contrato"

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

- `greenhouse_commercial.master_agreements`:
  - `msa_id` PK, `msa_number`, `client_id` FK, `organization_id`, `space_id`
  - `title`, `governing_law` text, `jurisdiction` text
  - `status` enum: `draft / active / expired / terminated`
  - `effective_date`, `expiration_date` (nullable para MSAs perpetuos renovables)
  - `auto_renewal boolean`, `renewal_frequency_months`
  - `signed_at`, `signed_by_client`, `signed_by_efeonce`, `signed_document_asset_id`
  - `payment_terms_days` (default inherited by SOWs)
  - `currency` default
  - `internal_notes`
  - timestamps

- `greenhouse_commercial.clause_library`:
  - `clause_id` PK, `clause_code` unique (ej. `IP_OWNERSHIP_v1`, `NDA_STANDARD_v2`)
  - `category` enum: `ip / nda / payment / liability / data_protection / warranty / termination / sla / governance / other`
  - `title`, `body_markdown`, `variables jsonb` (placeholders para MSA-specific values)
  - `version` integer, `effective_from`, `deprecated_at`
  - `language` enum: `es / en / pt`

- `greenhouse_commercial.master_agreement_clauses`:
  - `msa_id`, `clause_id` (join PK)
  - `clause_version` integer — pin al version al momento de firma
  - `override_body_markdown` text nullable — override per-MSA si negociaron una variante
  - `variables_resolved jsonb` — valores concretos de las placeholders
  - `sort_order`

- `greenhouse_commercial.contracts.msa_id` ya existe como FK nullable (TASK-460); el Slice conecta

### Slice 2 — Runtime + publishers

- `msa-store.ts` — CRUD tenant-safe + `listActiveMSAsForClient(clientId)`
- `msa-clauses-store.ts` — CRUD de clause library con versioning
- `msa-events.ts` publishers:
  - `commercial.msa.created`
  - `commercial.msa.activated`
  - `commercial.msa.amended`
  - `commercial.msa.renewed`
  - `commercial.msa.terminated`
- Helper `resolveContractClauses(contractId)` — computa clauses efectivas (MSA inherited + contract-specific overrides)

### Slice 3 — Seed inicial de clause library

- Seed con ~10 clausulas estándar en español de Efeonce:
  - `IP_OWNERSHIP_DELIVERABLES_v1` — ownership de deliverables finales por cliente
  - `IP_PRE_EXISTING_v1` — Efeonce retiene pre-existing IP
  - `NDA_MUTUAL_STANDARD_v1` — NDA mutua estándar 3 años
  - `PAYMENT_TERMS_30D_v1`, `PAYMENT_TERMS_60D_v1`
  - `LIMITATION_OF_LIABILITY_v1`
  - `DATA_PROTECTION_CHILE_v1` (Ley 19.628)
  - `DATA_PROTECTION_MEXICO_v1` (LFPDPPP) — para Pinturas Berel
  - `TERMINATION_WITH_CAUSE_v1`, `TERMINATION_FOR_CONVENIENCE_60D_v1`
  - `GOVERNING_LAW_CHILE_v1`, `GOVERNING_LAW_MEXICO_v1`

### Slice 4 — UI mínima

- `/finance/master-agreements` — lista de MSAs activos/expired con KPIs (MSAs activos, SOWs bajo cada MSA, expiration soon)
- `/finance/master-agreements/[id]` — detail con:
  - Header: cliente, status, effective/expiration, signed document link
  - Tab Clauses: lista de clauses con resolve-preview
  - Tab Contracts: SOWs colgando de este MSA con status propio
  - Tab History: amendments + renewals timeline

## Out of Scope

- Negociación workflow end-to-end (redlines, versioning colaborativo) — se deja en Drive/Word
- e-Signing integration — attach del PDF ya firmado es suficiente
- Clause diff/redline UI
- Full-text search en clauses library

## Detailed Spec

### Migration (esquema)

```sql
CREATE TABLE greenhouse_commercial.master_agreements (
  msa_id text PRIMARY KEY DEFAULT 'msa-' || gen_random_uuid(),
  msa_number text UNIQUE NOT NULL,
  client_id text NOT NULL REFERENCES greenhouse_core.clients(client_id) ON DELETE RESTRICT,
  organization_id text,
  space_id text,
  title text NOT NULL,
  governing_law text,
  jurisdiction text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  effective_date date NOT NULL,
  expiration_date date,
  auto_renewal boolean NOT NULL DEFAULT FALSE,
  renewal_frequency_months integer,
  signed_at timestamptz,
  signed_by_client text,
  signed_by_efeonce text,
  signed_document_asset_id text,
  payment_terms_days integer DEFAULT 30,
  currency text DEFAULT 'CLP',
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_commercial.clause_library (
  clause_id text PRIMARY KEY DEFAULT 'cl-' || gen_random_uuid(),
  clause_code text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'ip', 'nda', 'payment', 'liability', 'data_protection',
    'warranty', 'termination', 'sla', 'governance', 'other'
  )),
  title text NOT NULL,
  body_markdown text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  deprecated_at timestamptz,
  language text NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en', 'pt')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (clause_code, version)
);

CREATE TABLE greenhouse_commercial.master_agreement_clauses (
  msa_id text NOT NULL REFERENCES greenhouse_commercial.master_agreements(msa_id) ON DELETE CASCADE,
  clause_id text NOT NULL REFERENCES greenhouse_commercial.clause_library(clause_id) ON DELETE RESTRICT,
  clause_version integer NOT NULL,
  override_body_markdown text,
  variables_resolved jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (msa_id, clause_id)
);
```

### Effective clauses resolution

```typescript
export interface EffectiveClause {
  clauseId: string
  clauseCode: string
  category: ClauseCategory
  title: string
  bodyResolved: string   // body + variables resolved
  source: 'msa_inherited' | 'contract_override' | 'ad_hoc'
  version: number
}

export const resolveContractClauses = async ({
  contractId
}: {
  contractId: string
}): Promise<EffectiveClause[]> => {
  // 1. Get contract + msa_id
  // 2. If msa_id: pull master_agreement_clauses for that MSA
  // 3. Merge with any contract-specific overrides (follow-up task)
  // 4. Return resolved set
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente
- [ ] Seed de clause library con 10+ clauses bilingual (es + en para MSAs cross-border)
- [ ] Puede crearse MSA manualmente desde UI admin, attach PDF firmado como asset
- [ ] Contract creado con `msa_id` hereda automáticamente las clauses del MSA
- [ ] Sky + Pinturas Berel MSAs creados manualmente como prueba real (vía UI)
- [ ] Eventos `commercial.msa.*` aparecen en outbox

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Staging: crear MSA de prueba, attach PDF, crear contract con `msa_id`, confirmar resolución de clauses

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-460, TASK-462
- [ ] Actualizar arquitectura con delta de MSA como legal umbrella

## Follow-ups

- Workflow de renegociación de MSA con redline tracking (out of scope)
- Contract-specific clause overrides UI (hoy solo MSA-level)
- Integration con e-signing provider (DocuSign, HelloSign)
- Alerting cuando MSA expira < 90 días

## Open Questions

- ¿La clause library la pueden editar solo abogados (rol nuevo) o también admin general? Inclinación: admin general en V1, rol legal si se crea.
- ¿Versioning: crear nueva clause_version es manual siempre, o auto cuando se edita una clause activa? Inclinación: manual (force intent).
