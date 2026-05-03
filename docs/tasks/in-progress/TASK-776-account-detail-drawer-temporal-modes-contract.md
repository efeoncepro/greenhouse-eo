# TASK-776 — Account Detail Drawer Temporal Modes Contract

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Medio` (UX deuda arquitectónica + clase de bugs "ventana temporal incoherente")
- Effort: `Medio (4-5h)`
- Type: `architecture` + `ux`
- Status real: `Implementación inmediata — auto mode activo`
- Domain: `finance / banco`
- Blocked by: `none`
- Branch: `develop` (instrucción explícita)

## Summary

`AccountDetailDrawer` (`/finance/bank` → drawer al click en cuenta) muestra simultáneamente 4 surfaces con 4 ventanas temporales independientes y sin contrato declarado: KPIs (acumulado snapshot), chart (rolling 12 meses), lista de movimientos (período mes seleccionado), banner OTB (pre-anchor preserved). El operador no sabe qué ventana mira cuál. Caso real 2026-05-03: tras pago Figma 29/04, el balance KPIs muestra correctamente $1.225.047 (post-fix TASK-774) pero la lista "Movimientos de la tarjeta" está vacía porque filtra por Mayo 2026 (mes seleccionado en BankView padre), ocultando Figma.

Esta task introduce un **contract canónico de modos temporales** declarado en `instrument-presentation.ts`, propagado al endpoint `/api/finance/bank/[accountId]` y al drawer. Default = `snapshot` (rolling 30 días + KPIs acumulados + chart 12 meses), respeta override `period` cuando el operador esté en cierre mensual.

## Why This Task Exists

### Bug class arquitectónica

Cualquier surface futuro de banco/treasury (treasury_position, cashflow_summary, monthly_aging, intelligence dashboards) que muestre múltiples agregaciones temporales va a reintroducir el mismo problema si no hay contract canónico que declare semánticamente qué ventana muestra cuál.

### Caso real 2026-05-03

Post-fix TASK-774 (FX correctness):

- KPIs del drawer Santander Corp: $1.225.047 deuda ✓
- Chart 12 meses: muestra Abr 26 con barras grandes (incluye Figma) ✓
- Lista "Movimientos de la tarjeta": **vacía** ✗ (filtra Mayo 2026, Figma fue 29/04)
- Banner: "Cuenta anclada al 07/04/2026 con saldo $268.442" + "En el período consultado no hay movimientos posteriores al ancla todavía"

El usuario tuvo que pedir explicación porque el balance bajó pero el cargo no aparecía. Eso NO es bug del fix FX — es deuda arquitectónica del drawer.

### Costo de no resolverlo

- Cada nueva surface de banco/treasury que se agregue va a duplicar esta confusión.
- Cada nuevo bug FX/balance va a generar tickets "¿por qué cambió el balance pero no veo el movimiento?".
- Mantenimiento UI del drawer sin contract → cualquier cambio rompe alguna ventana sin que se note.

## Goal

- Contract canónico `temporalMode: 'snapshot' | 'period' | 'audit'` declarado en `instrument-presentation.ts` (extiende profile per categoría).
- Helper canónico `resolveTemporalWindow({mode, year, month, anchorDate, windowDays})` → `{fromDate, toDate, label}` reusable.
- Endpoint `/api/finance/bank/[accountId]` acepta `?mode=...` con backward compat (legacy `year+month` sigue funcionando).
- `AccountDetailDrawer` con default `mode='snapshot'` (últimos 30 días) + selector inline de 3 modos + chip header con la ventana actual.
- Banner "anclada al X" solo aparece cuando `mode='audit'` o cuando el `mode='period'` apunta a un mes pre-anchor (semánticamente coherente).

## Architecture Alignment

- `docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md` — fix FX previo
- `docs/tasks/complete/TASK-720-bank-kpi-aggregation-policy-driven.md` — instrument-presentation patrón
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — finance dual-store

Reglas obligatorias:

- NUNCA un drawer/dashboard nuevo de finance puede mostrar agregaciones temporales sin declarar `temporalMode` explícito.
- VIEWs temporales centralizadas en helper canónico, no calculadas inline en cada surface.
- Backward compat 100%: consumers existentes que envían `year+month` siguen funcionando (mode='period' implícito).

## Scope

### Slice 1 — Contract `temporalMode` en instrument-presentation + helper resolver

- Extender `InstrumentPresentationProfile` con `temporalDefaults: { mode: TemporalMode; windowDays?: number }`.
- Cada categoría declara default semántico:
  - `credit_card` → `snapshot` (windowDays=30) — operador chequea "qué está pasando hoy"
  - `bank_account` → `snapshot` (windowDays=30) — idem
  - `fintech` → `snapshot` (windowDays=30)
  - `payment_platform` → `period` — workbench de cierre mensual de comisiones
  - `payroll_processor` → `period` — cierre mensual nómina
  - `shareholder_account` → `audit` — historial completo desde declaración
- Helper `src/lib/finance/temporal-window.ts`:
  - `resolveTemporalWindow({mode, year?, month?, anchorDate?, windowDays?, today?}) → {fromDate, toDate, modeResolved, label}`
  - Tests unitarios cubriendo cada modo + edge cases (anchor en futuro, periodo sin payments, etc.)

### Slice 2 — Endpoint `/api/finance/bank/[accountId]` acepta `?mode=...`

- Query params: `mode` (opcional), `windowDays` (opcional, default 30).
- Backward compat: si solo viene `year+month` sin `mode`, asume `mode='period'` (comportamiento actual).
- Resuelve `{fromDate, toDate}` via helper canónico.
- Endpoint emite `temporalWindow: {mode, fromDate, toDate, label}` en la response para que el drawer renderice el chip header.

### Slice 3 — `AccountDetailDrawer` consume contract

- Lee `account.instrumentCategory` → `temporalDefaults` del profile.
- Inicializa state local `mode` con el default declarativo (no hardcoded).
- Selector inline `Toggle/SegmentedControl`: "Reciente | Período | Histórico" con tooltips explicando cada modo.
- Chip header "Mostrando: Últimos 30 días" / "Mostrando: Mayo 2026" / "Mostrando: Desde 07/04/2026".
- Banner "anclada al X" condicional:
  - SOLO se muestra si `mode='audit'` o si `mode='period'` apunta a un mes pre-anchor.
  - En `mode='snapshot'` con movimientos visibles, NO mostrar el banner (es redundante y confunde).
  - Si `mode='snapshot'` SIN movimientos en últimos 30 días, mostrar variante neutral: "Sin movimientos recientes. Cambia a Histórico para ver desde anchor."

### Slice 4 — Tests anti-regresión

- Helper `temporal-window.test.ts`: 8+ casos (cada modo × edge cases).
- Endpoint route test: backward compat (legacy year+month sigue), nuevo `mode` resuelve correctamente.
- Component test `AccountDetailDrawer`: render con cada modo, selector cambia mode + dispara re-fetch.

### Slice 5 — Docs + cierre

- CLAUDE.md sección nueva "Finance — Account drawer temporal modes contract (TASK-776)".
- `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta con tabla de defaults por categoría.
- Doc funcional `docs/documentation/finance/drawer-vista-temporal.md` (lenguaje simple para operadores).
- E2E smoke test verifica que el cargo Figma 29/04 SÍ aparece cuando el drawer abre con `mode='snapshot'` (default).
- Closing protocol completo.

## Out of Scope

- NO refactor del padre `BankView` (su selector de período sigue dominante para `mode='period'`).
- NO migrar otros drawers de finance (income, payment_orders) a este contract — si se necesita, task derivada.
- NO agregar 4to modo "12 meses lista completa" (chart ya cubre tendencia visual; lista grande sería UX peor).
- NO cambiar el chart de 12 meses (es coherente con `snapshot` semánticamente).

## Acceptance Criteria

- [ ] `temporalMode` declarado en `InstrumentPresentationProfile` por categoría
- [ ] Helper `resolveTemporalWindow` con tests unitarios verde
- [ ] Endpoint `/api/finance/bank/[accountId]` acepta `?mode=...` con backward compat
- [ ] Drawer default `snapshot` muestra Figma 29/04 al abrir Santander Corp
- [ ] Selector inline funciona y refresca lista
- [ ] Chip header muestra ventana actual
- [ ] Banner "anclada al X" condicional al modo
- [ ] CLAUDE.md + arch doc + doc funcional actualizados
- [ ] E2E smoke test verde contra staging
- [ ] Verde global: tsc + lint + tests + build

## Verification

- `pnpm staging:request '/api/finance/bank/santander-corp-clp?mode=snapshot&windowDays=30'` retorna Figma EXP-202604-008 en `movements[]`.
- Drawer en `dev-greenhouse.efeoncepro.com/finance/bank` con default `snapshot` muestra Figma sin click adicional.
- `pnpm playwright test tests/e2e/smoke/finance-drawer-temporal-modes.spec.ts` verde.

## Open Questions (resueltas pre-execution)

- (Q1) Default `mode` por categoría: ¿declarativo en profile o hardcoded en drawer? → **Profile** (extensible sin tocar UI).
- (Q2) `windowDays` configurable per categoría o constante 30? → **Per categoría con default 30**. Permite ajuste fino.
- (Q3) ¿Mantener filtro `year+month` en endpoint cuando viene `mode`? → **Sí, year+month sigue siendo input para mode='period'**. Snapshot ignora year+month, audit ignora year+month.
- (Q4) ¿Banner "anclada al X" merece task propia o se resuelve aquí? → **Aquí**. Es parte del mismo contract temporal — el banner solo tiene sentido en modos específicos.
