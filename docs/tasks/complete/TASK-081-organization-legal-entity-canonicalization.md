# TASK-081 - Organization Legal Entity Canonicalization

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `5`
- Domain: `identity`
- GitHub Project: `Greenhouse Delivery`

## Summary

Definir una entidad legal canónica para la organización operativa propietaria de Greenhouse, con identidad persistida y reusable en Payroll, Finance y surfaces comerciales.

La tarea evita seguir usando copy hardcoded, docs sueltas o conceptos ambiguos como BU para representar a Efeonce como empleador/propietario del sistema.

## Why This Task Exists

Hoy la identidad legal de Efeonce existe como contexto documental y como strings hardcoded en algunas superficies de Payroll, pero no como un contrato semántico y persistido bien nombrado.

Eso deja tres problemas abiertos:
- Payroll y recibos siguen dependiendo de textos fijos o de lógica puntual de presentación.
- `business_unit` no calza semánticamente con una entidad legal propietaria del sistema.
- `organizations` tiene parte de la identidad, pero todavía no expresa con precisión el rol de la entidad que opera Greenhouse y firma documentos legales.

## Goal

- Definir el nombre semántico correcto para la entidad legal de Efeonce sin mezclarla con BU, tenant o client.
- Persistir y exponer la identidad legal canónica en Account 360 / Organizations.
- Proveer un helper reusable para Payroll, Finance y exportables legales.
- Eliminar hardcodes de identidad legal en PDFs, recibos y otras surfaces consumibles.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No usar `business_unit` para identidad legal.
- No inventar una segunda identidad de client/tenant para la entidad operativa propietaria de Greenhouse.
- La identidad legal debe vivir en la capa de organización / Account 360 o como extensión canónica de ella.
- Los consumers deben leer desde un helper canónico, no desde strings hardcoded en PDFs o templates.

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations`
- `greenhouse_serving.organization_360`
- `TenantContext.organizationId`
- `src/lib/account-360/organization-identity.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/app/api/hr/payroll/periods/[periodId]/pdf/route.ts`
- `src/app/api/hr/payroll/entries/[entryId]/receipt/route.ts`

### Impacts to

- `TASK-076` Payroll Chile liquidations and exportables
- `TASK-077` receipt generation and delivery
- `TASK-078` payroll legal/operational foundations
- Finance exports and document headers
- Future organization/agency/legal entity surfaces

### Files owned

- `scripts/setup-postgres-account-360-m0.sql`
- `scripts/setup-postgres-organization-360.sql`
- `src/lib/account-360/organization-identity.ts`
- `src/lib/account-360/organization-store.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/app/api/hr/payroll/periods/[periodId]/pdf/route.ts`
- `src/app/api/hr/payroll/entries/[entryId]/receipt/route.ts`
- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `project_context.md`
- `Handoff.md`

## Delta 2026-03-28 — Auditoría de implementación

### Hallazgo principal: la base ya existe, solo faltan 2 gaps menores

Se auditó `greenhouse_core.organizations`, `organization-identity.ts`, `generate-payroll-pdf.tsx`, event catalog y arquitectura. El resultado es que la mayor parte del trabajo ya está hecho.

### Lo que ya está implementado

| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| Schema `organizations` con `legal_name`, `tax_id`, `tax_id_type` | **Hecho** | `setup-postgres-account-360-m0.sql` líneas 133-136 |
| Helper `findOrganizationByTaxId(taxId)` | **Hecho** | `src/lib/account-360/organization-identity.ts` |
| Helper `ensureOrganizationForSupplier()` | **Hecho** | mismo archivo — crea/encuentra org por RUT |
| Helper `resolveOrganizationForClient(clientId)` | **Hecho** | mismo archivo — bridge client → space → org |
| Efeonce identity persistida | **Hecho** | `ACCOUNT_360_IMPLEMENTATION_V1.md` documenta razón social, RUT 77.357.182-1, dirección |
| Eventos outbox `organization.created/updated` | **Hecho** | `event-catalog.ts` líneas 68-69 |
| Types con `legalName`, `taxId` | **Hecho** | `organization-store.ts` — `OrganizationDetail` |

### Lo que falta (2 gaps)

**Gap 1: Dirección legal NO está en el schema**

`greenhouse_core.organizations` tiene `legal_name`, `tax_id`, `tax_id_type`, `country` — pero **no tiene `legal_address`**. La liquidación de Valentina muestra "Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile" como dirección del empleador. Para generar un PDF legal completo se necesita:

```sql
ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS legal_address TEXT;
```

**Gap 2: PDFs de Payroll usan "Greenhouse EO" hardcoded**

`src/lib/payroll/generate-payroll-pdf.tsx`:
- Línea 212: `<Text style={styles.companyName}>Greenhouse EO</Text>` (reporte de período)
- Línea 438: `<Text style={styles.companyName}>Greenhouse EO</Text>` (recibo individual)

Debería resolver dinámicamente desde la organización operativa:
- Razón social: `Efeonce Group SpA`
- RUT: `77.357.182-1`
- Dirección: `Dr. Manuel Barros Borgoño 71 of 05, Providencia`

### Cómo implementar

**Slice 1 (schema):**
1. Migration: `ALTER TABLE greenhouse_core.organizations ADD COLUMN IF NOT EXISTS legal_address TEXT`
2. Backfill Efeonce: `UPDATE greenhouse_core.organizations SET legal_address = 'Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile' WHERE tax_id = '77.357.182-1'`

**Slice 2 (helper):**
1. Agregar función `getOperatingEntityIdentity()` en `organization-identity.ts`:
   - Lee la organización con `organization_type = 'internal'` o `tax_id = '77.357.182-1'` (config o fallback)
   - Retorna `{ legalName, taxId, taxIdType, legalAddress, country }`
   - Cacheable — la identidad legal no cambia entre requests

**Slice 3 (consumer cutover):**
1. `generate-payroll-pdf.tsx`: reemplazar `"Greenhouse EO"` por `operatingEntity.legalName`
2. El receipt/PDF debe recibir la identidad legal como parámetro, no resolverla inline
3. `generatePayrollPeriodPdf(periodId)` y `generatePayrollReceiptPdf(entryId)` deben llamar al helper y pasar la identidad al Document component

**Eventos reactivos:**
- No se necesitan eventos nuevos — `organization.updated` ya existe y cubre cambios a la identidad legal
- Si la organización operativa cambia `legal_name` o `tax_id`, los PDFs futuros usarán el nuevo valor automáticamente
- PDFs ya generados no se re-generan (son snapshots del momento de exportación)

**Projections:**
- No se necesitan projections nuevas — la identidad legal se lee on-demand (no cambia frecuentemente)
- `organization_360` serving view ya expone los campos existentes; agregar `legal_address` al view

**Esfuerzo real:** Bajo — 1 migration, 1 helper de ~20 líneas, 2 cambios en PDF template

## Current Repo State

### Ya existe

- `greenhouse_core.organizations` con `legal_name`, `tax_id`, `tax_id_type`, `country`
- `organization-identity.ts` con helpers funcionales (`findOrganizationByTaxId`, `resolveOrganizationForClient`)
- `organization_360` serving view
- Eventos `organization.created/updated` en event catalog
- Identidad legal de Efeonce documentada en `ACCOUNT_360_IMPLEMENTATION_V1.md`

### Gap actual

- Falta columna `legal_address` en `greenhouse_core.organizations`
- PDFs de Payroll usan `"Greenhouse EO"` hardcoded en vez de `organization.legal_name`

## Scope

### Slice 1 - Semantics and persistence

- Definir el nombre canónico del concepto: `legal_entity` y/o `operating_entity` como rol semántico de organización.
- Persistir los campos necesarios en `greenhouse_core.organizations` o en una extensión canónica de Account 360.
- Backfillear la organización operativa propietaria de Greenhouse con sus datos legales.

### Slice 2 - Helper and serving layer

- Crear un helper server-side para resolver identidad legal por `organizationId`.
- Exponer la identidad legal en el serving view o en una capa de lectura reusable.
- Mantener la compatibilidad con organizaciones cliente/proveedor existentes.

### Slice 3 - Consumer cutover

- Remover hardcodes de identidad legal en Payroll PDF y recibos.
- Reusar la identidad legal canónica en Finance y surfaces legales/comerciales cuando corresponda.
- Documentar el contrato para futuros consumers.

## Out of Scope

- No rediseñar el modelo de tenant/client.
- No convertir `business_unit` en identidad legal.
- No tocar la lógica de cálculo de nómina salvo para headers/exports y datos documentales.
- No inventar un nuevo sistema de ownership fuera de Account 360.

## Acceptance Criteria

- [ ] La semántica canónica de la entidad legal queda definida y documentada.
- [ ] La identidad legal de Efeonce queda persistida en la capa de organización o extensión canónica.
- [ ] Existe un helper reusable que devuelve razón social, RUT y dirección legal desde `organizationId`.
- [ ] Payroll PDF y recibos dejan de depender de strings hardcoded para la identidad legal.
- [ ] La solución no rompe `organizations`, `spaces`, `clients` ni el modelo de tenant actual.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- `git diff --check`
- Smoke manual de PDF de nómina y recibo

