# TASK-529 — Chile Tax Code Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-529-chile-tax-code-foundation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Crear la capa canonica de codigos tributarios y snapshots de impuesto para Chile dentro de `greenhouse_finance`. Esta es la foundation que necesita el resto del portal para dejar de usar `tax_rate` como campo suelto o default implicito.

## Why This Task Exists

Hoy el repo tiene columnas tributarias dispersas, pero no una semantica unica para responder preguntas basicas: cual impuesto aplica, si es recuperable, cual era la tasa al momento de emitir, o que parte del monto es base imponible. Sin ese contrato, cada modulo inventa una version distinta del IVA.

## Goal

- Crear un catalogo canonico de tax codes Chile-first y snapshots efectivos.
- Exponer helpers reutilizables para resolver impuesto, base imponible, monto tributario y recuperabilidad.
- Preparar el schema para que quotes, income y expenses persistan snapshots, no solo tasas sueltas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- Los nuevos modulos backend deben usar `getDb()` / Kysely y `withTransaction` sobre la infraestructura oficial del repo.
- `tax_rate` deja de ser el contrato primario; pasa a ser snapshot derivado de `tax_code`.
- La resolucion tributaria siempre debe aceptar contexto tenant (`space_id`) para soportar overrides o efectividad futura sin romper aislamiento.
- El primer corte soporta Chile; no se inventa un framework multi-pais innecesario antes de cerrar IVA CL.

## Normative Docs

- `Handoff.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-528-chile-tax-iva-program.md`
- `docs/architecture/schema-snapshot-baseline.sql`
- `scripts/`
- `src/lib/db.ts`

### Blocks / Impacts

- `TASK-530`
- `TASK-531`
- `TASK-532`
- `TASK-533`

### Files owned

- `migrations/*`
- `src/lib/tax/chile/*`
- `src/types/db.d.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `src/app/api/finance/income/route.ts` calcula `taxRate` y `taxAmount` al crear ingresos.
- `src/app/api/finance/expenses/route.ts` y `src/app/api/finance/expenses/[id]/route.ts` ya manejan tax fields y tax metadata.
- `src/lib/finance/quotation-canonical-store.ts` tiene campos `tax_rate`, `tax_amount` y `legacy_tax_amount`.

### Gap

- No existe `tax_code` canonico.
- No existe tabla/catalogo para codigos tributarios Chile.
- No existe helper comun para saber si el impuesto es cobrable, exento o recuperable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema foundation

- Crear migracion con tablas y/o sidecars canonicos en `greenhouse_finance` para tax codes y snapshots efectivos.
- Versionar la migracion junto con `src/types/db.d.ts`.
- Evaluar `space_id NULL` como default global Chile y `space_id` poblado para overrides tenant-specific futuros.

### Slice 2 — Resolver and helpers

- Crear helpers tipo `resolveChileTaxCode`, `computeChileTaxSnapshot`, `computeChileTaxAmounts`.
- Exponer contrato reusable para:
  - `taxCode`
  - `taxLabel`
  - `taxRateSnapshot`
  - `taxableAmount`
  - `taxAmount`
  - `totalAmount`
  - `recoverability`

### Slice 3 — Seed v1 Chile

- Sembrar codigos minimos:
  - `cl_vat_19`
  - `cl_vat_exempt`
  - `cl_vat_non_billable`
  - `cl_input_vat_credit_19`
  - `cl_input_vat_non_recoverable_19`
- Dejar effective dating y versionado preparados para cambios regulatorios futuros.

### Slice 4 — Tests and docs

- Agregar tests unitarios y de persistencia.
- Actualizar arquitectura financiera con el contrato de tax layer.

## Out of Scope

- UI tributaria final.
- Reglas avanzadas de retenciones, boletas de honorarios o regimens fuera de IVA Chile v1.
- Multi-country tax engine.

## Detailed Spec

Contrato objetivo minimo:

1. Todo documento financiero que soporte impuestos debe poder persistir `tax_code`.
2. `tax_rate` y `tax_amount` quedan como snapshots/materializaciones derivadas.
3. La semantica de recuperabilidad debe ser first-class, no inferida solo por signo o tipo de documento.
4. El helper debe poder resolver montos desde base neta y tambien validar snapshots preexistentes.

Decision de escalabilidad:

- El catalogo tributario debe quedar desacoplado de quotations, income y expenses para soportar nuevas jurisdicciones sin rediseñar esos aggregates.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe foundation canonica de `tax_code` y snapshots tributarios en `greenhouse_finance`.
- [ ] El repo tiene helpers reutilizables para resolver IVA Chile sin defaults hardcodeados por modulo.
- [ ] Los tax codes semilla de Chile quedan testeados y documentados.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:up`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [ ] `changelog.md` quedo actualizado si cambio comportamiento o contrato
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] migracion y `src/types/db.d.ts` quedaron commiteados juntos

## Follow-ups

- `TASK-530`
- `TASK-531`
- `TASK-532`
- `TASK-533`

