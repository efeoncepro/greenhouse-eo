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
- Execution profile: `backend-data`
- UI impact: `interaction`
- Backend impact: `migration`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-725-finance-fiscal-scope-legal-entity-foundation`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-101`

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

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (finance + migration + backfill + source-of-truth switch del scope fiscal)
- Impacto principal: `migration` (+ `reader` + `command`/materializer + `api`)
- Source of truth afectado: `greenhouse_finance.vat_ledger_entries` + `vat_monthly_positions` (materializados desde `income`/`expenses`); nuevo SoT de scope fiscal = entidad legal
- Consumidores afectados: `UI` (card IVA + export CSV), `API` (endpoint monthly-position), futuros (period closing, Nexa finance, PPM/retenciones)
- Runtime target: `staging` → `production` (misma Cloud SQL); materializador en ops-worker reactivo/cron

### Contract surface

- Contrato existente a respetar: `GET /api/finance/vat/monthly-position` (shape `VatMonthlyPositionRecord`), helpers de `src/lib/finance/vat-ledger.ts`, `requireFinanceTenantContext`.
- Contrato nuevo o modificado: `resolveFinanceFiscalScope()` (resolver canónico); el endpoint acepta `legalEntityId` y devuelve estados tipados (`ready|scope_required|forbidden`) en vez de 422 inglés crudo; materializador agrega por `legal_entity_id`.
- Backward compatibility: `gated` — el shape se conserva; `spaceId` pasa a parámetro transicional; `space_id` sobrevive como audit/etiqueta nullable.
- Full API parity: la posición IVA se expone como reader canónico de **entidad legal** reutilizable por UI/Nexa/CLI sin recomputar; el resolver es el único punto de autorización fiscal.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_finance.vat_ledger_entries`, `greenhouse_finance.vat_monthly_positions`, nueva tabla de entidad fiscal (`legal_entity`) + mapping `space ↔ legal_entity`.
- Invariantes que no se pueden romper:
  - Posición IVA = `Σ débito − Σ crédito recuperable` de **toda** la entidad legal; **ningún documento con IVA queda fuera por falta de space** (quitar el filtro `space_id IS NOT NULL` del materializador fiscal — causa raíz de ISSUE-101).
  - El scope fiscal se deriva de `legal_entity_id`, **NUNCA** de `space_id`. `space_id`/`client_id` = etiqueta analítica nullable.
  - Ledger append-only / re-materializable; nunca DELETE destructivo sin re-build validado.
  - El resolver no auto-selecciona si hay múltiples entidades autorizadas; no usa "primer space/registro" como fallback silencioso.
- Tenant/space boundary: autorización del usuario contra la entidad fiscal solicitada en `resolveFinanceFiscalScope`; gate `requireFinanceTenantContext` (route group `finance` / `EFEONCE_ADMIN`).
- Idempotency/concurrency: materializador idempotente por `(legal_entity_id, period_year, period_month)`; unique constraint que evite duplicados por período tras agregar la columna.
- Audit/outbox/history: re-materialización deja `materialized_at` + `materialization_reason`; nuevo reliability signal de drift (ver Rollout).

### Migration, backfill and rollout

- Migration posture: `additive` (tabla `legal_entity` + mapping + columna `legal_entity_id` nullable en las 2 tablas VAT) + `backfill` (mapear `space_id → legal_entity_id` y re-materializar abr/may/jun).
- Default state: Slice 1 (degradación de la card) ship sin tocar datos; el re-scope del materializador detrás de validación staging (dry-run comparativo).
- Backfill plan: dry-run que compare net previo vs nuevo por período (debe subir por la entrada del crédito fiscal) → apply; allowlist de períodos existentes (3).
- Rollback path: flag off / revert PR / re-materializar con lógica previa (fuente intacta en `income`/`expenses`; el ledger es reconstruible — no hay pérdida).
- External coordination: validar la posición IVA corregida contra el **F29 real declarado** de abr/may/jun con el contador antes de tomarla como baseline.

### Security and access

- Auth/access gate: `requireFinanceTenantContext` + autorización fina por entidad fiscal en el resolver.
- Sensitive data posture: `finance` (cifras fiscales internas; no PII de terceros; un portal de cliente NUNCA ve el IVA de Efeonce).
- Error contract: `canonicalErrorResponse` / estados tipados (`code`), NUNCA prosa inglesa cruda (el 422 actual es justo el anti-patrón a remover); la UI degrada por `code`, no parseando strings.
- Abuse/rate-limit posture: N/A — endpoint read-only autenticado.

### Runtime evidence

- Local checks: tests focales del materializador (overhead sin space → entra al crédito), del resolver (sin scope / entidad única / múltiples / no autorizada / fallback `space_id`), y del endpoint (sin spaceId → estado tipado, no 422).
- DB/runtime checks: query `credito_con_space_incluido > 0` y `clp_credito_excluido = 0` post-fix; re-materialización verificada vía `pnpm pg:connect:shell`.
- Integration checks: `pnpm staging:request /api/finance/vat/monthly-position --pretty` con agent admin interno → estado resuelto.
- Reliability signals/logs: `finance.vat.position_drift` steady=0 en `/admin/operations`.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes (clave fiscal = entidad legal; space = etiqueta; sin filtro `space_id IS NOT NULL`), tenant boundary e idempotencia explícitos.
- [ ] Migration/backfill/rollback proporcional al riesgo (re-materialización validada en staging + vs F29).
- [ ] Evidencia DB listada (crédito fiscal incluido; drift=0).
- [ ] Dominio finance con errores canónicos/tipados y signal de drift.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability de negocio nueva` (no introduce un write mutante de negocio; es un reader/materializer fiscal correcto + resolver de scope). La posición IVA y `resolveFinanceFiscalScope` quedan como contratos canónicos reutilizables por todos los consumers (UI/Nexa/CLI), sin lógica duplicada por pantalla.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Finanzas / admin interno Efeonce (único consumidor del IVA).
- Momento del flujo: dashboard `/finance` (Resumen) + card "Posición IVA del mes".
- Resultado perceptible esperado: la card IVA carga sin banner de error global; muestra la posición consolidada de la entidad legal (con crédito fiscal incluido). Si hay múltiples entidades, selector compacto.
- Friccion que debe reducir: hoy el 422 genera un banner amarillo permanente que ensucia todo el dashboard del admin interno.
- No-goals UX: no rediseñar el dashboard; no construir un selector fiscal global pesado si hay una sola entidad.

### Surface & system decision

- Surface: `VatMonthlyPositionCard` + `FinanceDashboardView` (degradación local del error).
- Composition Shell: `no aplica` — card existente dentro del dashboard actual.
- Primitive decision: `reuse` — card existente; agregar estados; selector compacto reusa primitives de selección existentes si hay multi-entidad.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: N/A (selector inline compacto).
- Copy source: `src/lib/copy/*` (estados, labels, mensajes) — NUNCA prosa inglesa cruda; validar con `greenhouse-ux-writing`.
- Access impact: `none` runtime nuevo (lectura gateada por `finance`/`EFEONCE_ADMIN`); si el selector fiscal se vuelve visible para multi-entidad, declarar `views`+`entitlements` antes de implementar (Slice 6).

### State inventory

- Default: `ready` — posición consolidada de la entidad legal.
- Loading: skeleton de la card (existente).
- Empty: período sin movimientos con IVA → empty positivo, no error.
- Error: `error` tipado local en la card (no banner global).
- Degraded / partial: `stale` cuando la materialización está vencida.
- Permission denied: `forbidden` → card oculta/mensaje, no 422 global.
- Long content: tabla de buckets ya truncada (slice de 6).
- Mobile / compact: card responsive existente.
- Keyboard / focus: selector fiscal accesible por teclado si aparece.
- Reduced motion: sin motion nuevo.

### Interaction contract

- Primary interaction: ver posición; (multi-entidad) elegir entidad fiscal.
- Hover / focus / active: estados estándar del selector.
- Pending / disabled: durante fetch de la posición tras cambiar entidad.
- Escape / click-away: cerrar selector.
- Focus restore: al cerrar selector, foco vuelve al trigger.
- Latency feedback: skeleton/loading en la card al recomputar.
- Toast / alert behavior: el error de IVA vive en la card, NUNCA en el banner global del dashboard.

### Motion & microinteractions

- Motion primitive: `none` — sin motion nuevo.
- Enter / exit / layout morph / stagger: N/A.
- Timing / easing token: N/A.
- Reduced-motion fallback: N/A (sin motion).
- Non-goal motion: no animar la card.

### Visual verification

- GVC scenario: capturar `/finance` con agent admin interno (sin space) antes/después — el banner desaparece.
- Viewports: desktop + mobile 390px.
- Required captures: dashboard con card IVA `ready`; estado `scope_required`/`forbidden` si aplica.
- Required `data-capture` markers: `data-capture="vat-monthly-position-card"`.
- Scroll-width check: sin scroll horizontal de página en desktop ni 390px.
- Accessibility/focus checks: selector fiscal navegable por teclado + aria.
- Before/after evidence: captura del banner actual vs card cargada post-fix.
- Known visual debt: ninguna nueva.

## Hybrid Execution Justification

- Why not split: el core es backend-data (foundation fiscal + resolver + migración + materializador). La UI (Slice 6) es un **consumidor delgado** de la card ya existente: degradación local + estados tipados + selector solo si hay multi-entidad. El boundary es estable (la UI consume `resolveFinanceFiscalScope` + el endpoint), así que el riesgo de mantenerla junta es bajo y reduce coordinación.
- Primary execution profile: `backend-data`.
- Contract boundary: la UI nunca computa scope ni IVA; consume el reader/endpoint canónico y decide render por `code` tipado. Slice 1 (degradación) y Slice 6 (estados/selector) son los únicos slices UI; el resto es backend.
- Risk controls: ordering hard rule (UI de Slice 1 no depende del schema; Slice 6 va al final, tras el read path migrado); GVC desktop+mobile; copy en `src/lib/copy/*`; si el selector se vuelve visible para multi-entidad, declarar `views`+`entitlements` antes.

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

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (dashboard resilience)** puede shipear solo y primero — additive, no toca datos, desbloquea el banner de inmediato.
- **Slice 2 (schema entidad fiscal + mapping)** → **Slice 3 (`resolveFinanceFiscalScope`)** → **Slice 4 (read path compat)**: el read path no puede migrar antes de que exista el resolver, y el resolver no puede existir sin el schema.
- **Slice 5 (materialization migration)** DESPUÉS de Slice 4, con dry-run validado en staging. Aquí se **quita el filtro `space_id IS NOT NULL`** (corrige el crédito fiscal) y se re-materializa.
- **Slice 6 (UI fiscal scope)** va al **final**, tras el read path migrado (la UI consume estados ya estables).
- **Slice 7 (docs)** al cierre.
- Cualquier agente que materialice por `legal_entity_id` (Slice 5) antes de tener el resolver + read path (Slice 3-4) viola el contract.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Re-materialización cambia el net y descuadra vs F29 ya declarado | finance | medium | dry-run comparativo + validación con contador antes de baseline | `finance.vat.position_drift` |
| Quitar `space_id IS NOT NULL` mete gastos no fiscales por error | finance | low | filtrar por `recoverable_tax_amount > 0` / `tax_recoverability`, NUNCA por space; tests focales | test focal materializador |
| Doble conteo de un documento por space y por entidad | finance / migration | low | unique constraint `(legal_entity_id, period_year, period_month)` + agregación idempotente | `finance.vat.position_drift` |
| Backfill `space_id → legal_entity_id` mapea a entidad equivocada | migration | medium | mapping explícito + dry-run; no auto-asignar "primer registro" | revisión manual del mapping |
| Resolver auto-selecciona entidad y filtra datos de otra | finance / identity | low | autorización fina + estado `forbidden`; no auto-select con múltiples | test resolver multi-entidad |
| Consumidores que asumían `spaceId` requerido en el shape | UI / API | low | shape conservado, `spaceId` opcional/transicional, backward-compatible | smoke endpoint + build |

### Feature flags / cutover

Slice 1 sin flag — additive, immediate cutover (degradación honesta es estrictamente mejor que un banner 422). Slices 2-5 detrás de validación staging (dry-run) antes de apply en prod; el ledger es re-materializable y reversible. Si se quiere shadow, gatear el re-scope del materializador con `VAT_LEGAL_ENTITY_SCOPE_ENABLED` (default OFF) durante validación — decisión del agente que tome la task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <5 min | sí |
| Slice 2 | reverse migration (DROP tabla/columna additive, sin data productiva) | <15 min | sí |
| Slice 3 | revert PR (resolver es código nuevo) | <5 min | sí |
| Slice 4 | revert PR (endpoint vuelve a scope previo) | <10 min | sí |
| Slice 5 | revert PR + re-materializar con lógica previa (fuente intacta) | <30 min | sí |
| Slice 6 | revert PR (UI additive) | <5 min | sí |
| Slice 7 | revert PR (docs) | <5 min | sí |

### Production verification sequence

1. Slice 1 a staging → `/finance` con agent admin interno (sin space): banner global ausente, card IVA degrada local.
2. Slices 2-4 a staging → `GET /api/finance/vat/monthly-position` resuelve por entidad legal; sin scope → estado tipado, no 422.
3. Slice 5 dry-run en staging → comparar net previo vs nuevo por período; confirmar `clp_credito_excluido = 0` y crédito fiscal incluido.
4. Slice 5 apply en staging → re-materializar abr/may/jun → verificar buckets.
5. Validar cifras corregidas contra F29 real (contador/operador).
6. Repetir 1-5 en producción con cooldown.
7. Slice 6 (UI) + monitorear `finance.vat.position_drift` steady=0 durante 7d.

### Out-of-band coordination required

Validación de la posición IVA corregida (con los ~$2.56M de crédito fiscal que hoy faltan) contra el F29 real declarado de abr/may/jun con el contador/operador de Efeonce antes de tomarla como baseline. Resto: repo-only.

## Architecture & Finance Skill Review

Revisado con `arch-architect` (overlay Greenhouse) + `greenhouse-finance-accounting-operator` el 2026-06-20.

### Razonamiento fiscal (finance)

- **F29 se declara por RUT, una vez al mes** (SII): una posición de IVA = `Σ débito ventas − Σ crédito compras recuperable` de **toda la entidad legal**, sin importar el cliente. El crédito fiscal del overhead (arriendo, software, servicios) no pertenece a ningún cliente — pertenece a Efeonce. Por eso el scope correcto es la entidad legal, no `space_id`.
- El `space`/`client` es dimensión de **atribución analítica** (margen por cliente), ortogonal a la dimensión **fiscal** (RUT/F29). Mezclarlas en una sola clave de particionado es el error.
- Escalamiento: la cifra corregida debe cuadrarse contra el F29 real con el contador antes de tomarla como baseline (no es asesoría de filing; es validación de insumo).

### 4 pilares (arch-architect) del estado objetivo

- **Safety:** ✅ el número fiscal pasa a ser correcto y auditable contra el F29; autorización fina por entidad fiscal en el resolver evita cross-tenant leak. Riesgo actual = declarar un IVA sobreestimado.
- **Robustness:** ✅ quitar el filtro `space_id IS NOT NULL` cierra la fuga silenciosa de crédito fiscal; unique constraint `(legal_entity_id, period)` + idempotencia evitan doble conteo; estados tipados evitan el 422 que rompía el dashboard.
- **Resilience:** ✅ reliability signal `finance.vat.position_drift` (steady=0, patrón VIEW/helper/signal de TASK-571/766/774) cazaría la regresión; ledger re-materializable → rollback barato.
- **Scalability:** ✅ particionar por entidad legal (cardinalidad baja) en vez de por space (N); el modelo soporta multi-entidad/multi-país sin redesign (Slice 2 deja el foundation).

### Hard rules (anti-regresión)

- **NUNCA** particionar un agregado fiscal (IVA/F29 — y a futuro PPM/retenciones/renta) por `space_id`/`client_id`. La SSOT fiscal es la **entidad legal (RUT)**.
- **NUNCA** filtrar `space_id IS NOT NULL` en un cómputo fiscal (bota el overhead sin cliente = el grueso del crédito).
- **NUNCA** auto-seleccionar entidad fiscal cuando hay múltiples autorizadas, ni usar "primer space/registro" como fallback silencioso.
- **NUNCA** devolver prosa inglesa cruda como error fiscal (usar `canonicalErrorResponse`/estado tipado; la UI degrada por `code`).
- **SIEMPRE** que el VAT mute, emitir `finance.vat.position_drift` (materializada vs Σ directo).
- **SIEMPRE** validar la cifra corregida contra el F29 real antes de baseline.

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

## Delta 2026-06-20

Re-diagnóstico contra la BD viva (auditoría `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md`, skills `greenhouse-finance-accounting-operator` + `arch-architect`) confirma y **agrava** la deuda: el mis-scoping no es solo el 422, es **incorrección fiscal medible**. Registrado como `ISSUE-101`.

Evidencia (2026-06-20):

- El materializador (`src/lib/finance/vat-ledger.ts`) filtra `space_id IS NOT NULL` al recoger gastos. **125/125 gastos con IVA crédito fiscal tienen `space_id NULL` → los 125 quedan excluidos.** Crédito fiscal que entra al ledger hoy = **0**; crédito excluido = **$2.563.383 CLP**. La posición publicada ($1.102.000 net abr/may/jun) es solo débito de Sky Airline, sin crédito → **sobreestima el IVA a pagar**.
- Las 3 posiciones + 3 asientos del ledger cuelgan de un único `space_id = spc-ae463d9f-…` (**"Sky Airline", un client_space**), no de una entidad fiscal de Efeonce.

Implicaciones para esta task:

- **Invariante adicional (Slice 5):** quitar el filtro `space_id IS NOT NULL` del materializador fiscal — todo documento con IVA recuperable entra, tenga o no space. Filtrar por `recoverable_tax_amount > 0` / `tax_recoverability`, NUNCA por space. Sin esto, migrar a `legal_entity_id` deja el bug del crédito fiscal vivo.
- **AC adicional:** post-fix, query BD debe mostrar `credito_con_space_incluido > 0` y `clp_credito_excluido = 0`.
- **Reliability signal recomendado (nuevo):** `finance.vat.position_drift` (steady=0) que compare la posición materializada vs Σ directo de income/expenses con IVA del período — habría cazado este bug antes de inspección manual.
- **Coordinación out-of-band:** validar la posición IVA corregida (con los $2.56M de crédito que hoy faltan) contra el F29 real declarado de abr/may/jun con el contador antes de tomarla como baseline.
- **Razonamiento fiscal:** F29 se declara por RUT (una entidad legal = una posición consolidada/mes); el crédito fiscal del overhead no pertenece a ningún cliente. Refuerza el goal central de esta task (scope fiscal = entidad legal, no `space_id`).

## Open Questions

- Confirmar si ya existe una tabla canonica de legal entities que deba reutilizarse en vez de crear una nueva.
- Definir si la entidad fiscal inicial de Efeonce debe vivir en `greenhouse_core` o `greenhouse_finance`.
- Definir si `income` debe persistir `legal_entity_id` directo o heredar inicialmente desde `quotation/contract/space`.
