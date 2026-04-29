# TASK-725 — Finance Fiscal Scope & Legal Entity Foundation

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
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-725-finance-fiscal-scope-legal-entity-foundation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Separar el scope fiscal/legal del scope operacional `space_id` en Finance. Hoy el libro IVA mensual depende directamente de `tenant.spaceId`, pero el concepto correcto de negocio es una entidad fiscal/legal (`legal_entity_id` / `tax_entity`) con RUT, pais, regimen tributario y calendario fiscal. Esta task crea el foundation para resolver IVA y futuros impuestos por entidad fiscal, con fallback compatible desde `space_id` y degradacion local en el dashboard.

## Why This Task Exists

El error visible en `/finance` muestra:

```txt
IVA mensual: Finance VAT position requires a tenant with canonical space scope.
```

La causa tecnica es que `GET /api/finance/vat/monthly-position` exige `tenant.spaceId`. La causa arquitectonica es mas profunda: `TASK-533` materializo `greenhouse_finance.vat_monthly_positions` por `space_id + periodo`, usando `space_id` como proxy de aislamiento tenant. Eso protege de mezclar datos, pero no modela correctamente la realidad fiscal:

- IVA se declara por entidad fiscal/legal, no por workspace.
- Una empresa puede tener varios spaces operativos.
- Un holding puede tener varias razones sociales/RUTs.
- Un usuario interno puede ver Finanzas globales sin estar "dentro" de un unico space.
- Un space puede ser unidad operacional, cliente, modulo o scope de delivery; no necesariamente contribuyente.

Usar `space_id` como sustituto fiscal escala mal. La solucion seria es introducir un scope fiscal canonico y migrar IVA hacia ese contrato sin romper los readers actuales.

## Goal

- Crear un modelo canonico de entidad fiscal/legal para Finance.
- Construir un resolver compartido `resolveFinanceFiscalScope()` para APIs fiscales.
- Migrar IVA mensual hacia `legal_entity_id` como scope principal, conservando `space_id` como compatibilidad/audit temporal.
- Evitar que la card IVA rompa todo `/finance` cuando falta scope fiscal.
- Dejar base reutilizable para IVA, PPM, retenciones, renta, multiempresa y multipais.

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
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `space_id` sigue siendo boundary operacional/tenant, pero no debe ser el concepto fiscal primario.
- IVA, PPM, retenciones y futuros impuestos deben resolverse por entidad fiscal/legal cuando exista.
- No hardcodear una entidad Efeonce ni usar "primer space" como fallback silencioso.
- Todo resolver debe validar autorizacion del usuario contra entidad fiscal solicitada.
- Si el scope fiscal no se puede resolver, la API debe responder un estado tipado y la UI debe degradar localmente.
- Access model: si se crea selector de entidad fiscal visible, declarar ambos planos (`views` + `entitlements`) antes de implementar.

## Normative Docs

- `docs/tasks/complete/TASK-529-chile-tax-code-foundation.md`
- `docs/tasks/complete/TASK-530-quote-tax-explicitness-chile-iva.md`
- `docs/tasks/complete/TASK-531-income-invoice-tax-convergence.md`
- `docs/tasks/complete/TASK-532-purchase-vat-recoverability.md`
- `docs/tasks/complete/TASK-533-chile-vat-ledger-monthly-position.md`
- `docs/tasks/complete/TASK-639-finance-vat-reactive-data-quality-hardening.md`
- `docs/documentation/finance/libro-iva-posicion-mensual.md`

## Dependencies & Impact

### Depends on

- `src/lib/finance/vat-ledger.ts`
- `src/app/api/finance/vat/monthly-position/route.ts`
- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/views/greenhouse/finance/components/VatMonthlyPositionCard.tsx`
- `src/lib/tenant/get-tenant-context.ts`
- `src/lib/tenant/authorization.ts`
- `greenhouse_core.spaces`
- `greenhouse_finance.vat_ledger_entries`
- `greenhouse_finance.vat_monthly_positions`
- `greenhouse_finance.income`
- `greenhouse_finance.expenses`

### Blocks / Impacts

- Corrige el error de IVA mensual en `/finance` de forma estructural.
- Recontextualiza `TASK-533`: su modelo `space_id` queda como V1 transicional, no como contrato fiscal final.
- Impacta futuras capacidades de impuestos Chile-first y multi-country.
- Impacta export CSV de IVA porque el scope visible debe ser entidad fiscal, no solo space.
- Mejora seguridad multi-tenant al mover autorizacion fiscal a un resolver central.

### Files owned

- `migrations/YYYYMMDDHHMMSS_task-725-finance-fiscal-scope-legal-entity-foundation.sql` (nuevo)
- `src/lib/finance/fiscal-scope/*` (nuevo)
- `src/lib/finance/vat-ledger.ts`
- `src/app/api/finance/vat/monthly-position/route.ts`
- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/views/greenhouse/finance/components/VatMonthlyPositionCard.tsx`
- `src/lib/tenant/authorization.ts` (solo helpers de autorizacion si aplica)
- `src/types/db.d.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/libro-iva-posicion-mensual.md`

## Current Repo State

### Already exists

- `greenhouse_finance.vat_ledger_entries` y `greenhouse_finance.vat_monthly_positions` existen desde `TASK-533`.
- `vat_monthly_positions` se materializa por `space_id + period_year + period_month`.
- `src/lib/finance/vat-ledger.ts` materializa y lee IVA usando `space_id`.
- `GET /api/finance/vat/monthly-position` exige `tenant.spaceId` y devuelve 422 si falta.
- `FinanceDashboardView` agrega ese 422 al error global del dashboard.
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` ya reconoce que relaciones economicas como cuenta corriente accionista viven contra `legal entity`, lo que confirma que el concepto existe en arquitectura aunque no este aplicado a IVA.

### Gap

- No existe entidad fiscal/legal canonica para Finance.
- No existe resolver fiscal compartido.
- IVA depende de `tenant.spaceId`, que es una proxy operacional.
- Los documentos tributarios no tienen un `legal_entity_id` canonico persistido como owner fiscal.
- No hay selector ni default de entidad fiscal para usuarios internos/admin multi-scope.
- Un widget tributario opcional puede generar banner global y degradar toda la pagina `/finance`.

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

### Slice 1 — Dashboard resilience hotfix

- Cambiar `FinanceDashboardView` para que errores de IVA no aparezcan en el banner global de dashboard.
- Tratar `FINANCE_FISCAL_SCOPE_REQUIRED` / `FINANCE_SPACE_SCOPE_REQUIRED` como estado local de la card IVA.
- Mantener el resto de KPIs y widgets cargando normalmente.
- Agregar test o smoke focalizado para usuario sin scope fiscal.

### Slice 2 — Fiscal/legal entity schema foundation

- Crear o extender modelo canonico para entidades fiscales:
  - `legal_entity_id`
  - `display_name`
  - `legal_name`
  - `country_code`
  - `tax_id` / RUT
  - `tax_regime`
  - `default_currency`
  - `fiscal_calendar`
  - `status`
  - `metadata_json`
- Crear relacion entre `space` y entidad fiscal:
  - `space_id`
  - `legal_entity_id`
  - `relationship_type`
  - `is_default`
  - vigencia opcional (`valid_from`, `valid_to`)
- La migracion debe ser aditiva y backfillear una entidad fiscal inicial desde los spaces existentes cuando sea seguro.

### Slice 3 — `resolveFinanceFiscalScope`

- Crear `src/lib/finance/fiscal-scope/resolve.ts`.
- Contrato objetivo:

```ts
type FinanceFiscalScopeResolution =
  | { status: 'resolved'; legalEntityId: string; source: 'requested' | 'tenant_default' | 'single_authorized' | 'space_mapping'; spaceId?: string | null }
  | { status: 'scope_required'; reason: 'no_default' | 'multiple_authorized' | 'missing_configuration' }
  | { status: 'forbidden'; reason: 'unauthorized_legal_entity' }
```

- Inputs:
  - `tenant`
  - `requestedLegalEntityId`
  - `requestedSpaceId` transicional
  - `capability`, por ejemplo `finance.vat.read`
- Validar autorizacion antes de devolver una entidad.
- No elegir "primer registro" si hay multiples entidades posibles.

### Slice 4 — VAT read path compatibility

- Actualizar `GET /api/finance/vat/monthly-position` para usar `resolveFinanceFiscalScope`.
- Aceptar query `legalEntityId` como scope preferente.
- Mantener `spaceId` como parametro transicional validado contra mappings/autorizacion.
- Si no hay scope fiscal:
  - responder estado tipado (`FINANCE_FISCAL_SCOPE_REQUIRED`) sin romper el dashboard.
- Si hay scope:
  - leer IVA por `legal_entity_id` cuando exista materializacion nueva.
  - fallback transicional a `space_id` solo si la entidad fiscal resuelve a un unico space compatible.

### Slice 5 — VAT materialization migration

- Agregar `legal_entity_id` a:
  - `greenhouse_finance.vat_ledger_entries`
  - `greenhouse_finance.vat_monthly_positions`
- Backfill desde `space_id -> legal_entity_id`.
- Ajustar `src/lib/finance/vat-ledger.ts` para materializar por entidad fiscal.
- Mantener `space_id` como audit/compat temporal.
- Actualizar indices y unique constraints para evitar duplicados por periodo.

### Slice 6 — Finance UI fiscal scope

- En `/finance`, si existe una sola entidad fiscal autorizada, resolver automaticamente.
- Si existen multiples, mostrar selector compacto de entidad fiscal para widgets tributarios.
- `VatMonthlyPositionCard` debe mostrar estados:
  - `ready`
  - `scope_required`
  - `not_configured`
  - `stale`
  - `error`
- El export CSV debe incluir `legal_entity_id`, RUT/nombre legal cuando exista, y mantener `space_id` solo como metadata transicional.

### Slice 7 — Docs and operating model

- Actualizar `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`: IVA V2 depende de entidad fiscal/legal, no de `space_id` directo.
- Actualizar `libro-iva-posicion-mensual.md` en lenguaje funcional.
- Documentar migracion progresiva:
  - V1: `space_id`
  - V2: `legal_entity_id` primario + `space_id` audit/compat
  - futuro: multi-country tax profiles.

## Out of Scope

- No cambiar la declaracion legal real ante SII.
- No implementar PPM, renta anual, retenciones u otros impuestos en esta task.
- No redisenar todo el dashboard Finance fuera de la degradacion local de IVA.
- No eliminar `space_id` de tablas existentes en el primer corte.
- No crear una contabilidad legal completa.
- No migrar Banco/Cash Position a entidad fiscal; ellos siguen siendo ledger operacional por instrumento/cuenta.

## Detailed Spec

### Conceptos

```txt
Legal / Tax Entity
  - entidad que declara impuestos
  - tiene RUT/tax_id, pais, regimen, moneda, calendario fiscal

Space
  - scope operativo/tenant/workspace/unidad de trabajo
  - puede mapear a una entidad fiscal, pero no la reemplaza

VAT Monthly Position
  - se calcula por legal_entity_id + periodo
  - puede conservar space_id como evidencia/audit de origen de documentos
```

### API contract recomendado

`GET /api/finance/vat/monthly-position?legalEntityId=...&year=2026&month=4`

Respuesta resuelta:

```json
{
  "status": "ready",
  "scope": {
    "legalEntityId": "le-efeonce-spa",
    "displayName": "Efeonce SpA",
    "taxId": "76.xxx.xxx-x",
    "countryCode": "CL",
    "source": "single_authorized"
  },
  "position": {},
  "recentPositions": [],
  "entries": []
}
```

Respuesta sin scope:

```json
{
  "status": "scope_required",
  "code": "FINANCE_FISCAL_SCOPE_REQUIRED",
  "message": "VAT monthly position requires an active fiscal entity scope.",
  "availableScopes": []
}
```

Respuesta forbidden:

```json
{
  "status": "forbidden",
  "code": "FINANCE_FISCAL_SCOPE_FORBIDDEN"
}
```

### Guardrails

- El resolver no debe seleccionar automaticamente si hay multiples entidades autorizadas.
- Un usuario interno/admin puede tener default, pero debe estar persistido y auditable.
- `legal_entity_id` debe estar presente en nuevas materializaciones de IVA.
- La UI no debe parsear strings humanos para saber si debe degradar; debe usar `code`.
- Las queries de IVA no deben mezclar entidades fiscales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/finance` no muestra banner global rojo cuando solo falla el widget IVA por falta de scope fiscal.
- [ ] Existe modelo persistido de entidad fiscal/legal usable por Finance.
- [ ] Existe mapping controlado entre `space_id` y `legal_entity_id`.
- [ ] `resolveFinanceFiscalScope()` centraliza resolucion y autorizacion de entidad fiscal.
- [ ] `/api/finance/vat/monthly-position` acepta `legalEntityId` y devuelve errores tipados.
- [ ] IVA mensual se puede leer/materializar por `legal_entity_id`.
- [ ] `space_id` queda como compatibilidad/audit, no como concepto fiscal primario.
- [ ] Tests cubren usuario sin scope, entidad unica, multiples entidades, entidad no autorizada y fallback transicional `space_id`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/finance`
- `pnpm test -- src/app/api/finance/vat/monthly-position`
- `pnpm staging:request /api/finance/vat/monthly-position --pretty`
- Validacion visual en `/finance` con usuario sin `spaceId` y con entidad fiscal resuelta.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` documenta que IVA depende de entidad fiscal/legal
- [ ] `libro-iva-posicion-mensual.md` dejo de presentar `space_id` como concepto fiscal primario

## Follow-ups

- Selector fiscal global para Finance si aparecen multiples entidades.
- PPM/retenciones/renta anual sobre el mismo `legal_entity_id`.
- Multi-country tax profiles.
- Eventual deprecacion de `space_id` en `vat_monthly_positions` cuando no queden readers legacy.

## Delta 2026-04-29

Task creada tras detectar que el error visible de IVA mensual no es solo falta de `spaceId`, sino una deuda conceptual: IVA debe depender de entidad fiscal/legal, no de `space_id` operacional. La solucion robusta separa `legal_entity_id` de `space_id`, introduce resolver fiscal compartido y mantiene degradacion local del widget para no romper `/finance`.

## Open Questions

- Confirmar si ya existe una tabla canonica de legal entities que deba reutilizarse en vez de crear una nueva.
- Definir si la entidad fiscal inicial de Efeonce debe vivir en `greenhouse_core` o `greenhouse_finance`.
- Definir si `income` debe persistir `legal_entity_id` directo o heredar inicialmente desde `quotation/contract/space`.
