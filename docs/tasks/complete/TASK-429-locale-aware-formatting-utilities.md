# TASK-429 — Locale-Aware Formatting Utilities

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Entregada 2026-05-06`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` — entregable independiente, puede arrancar sin `TASK-265` ni `TASK-428`.
- Branch: `develop` — instrucción explícita del usuario; no se creó `task/*` para esta ejecución.
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-266` (umbrella)

## Summary

Crea una utility central (`src/lib/format/`) para fechas, moneda, números, porcentajes y pluralización con signatura `(value, locale?)`, reemplazando los 254+ call sites de `Intl.DateTimeFormat` / `toLocaleDateString` / `toLocaleString` hardcoded a `'es-CL'`. Entregable independiente del copy contract y del i18n completo: aunque la copy siga en español, un cliente en Brasil viendo un monto `$ 1.500,00 BRL` con fecha `17/04/2026` ya es una mejora tangible.

## Why This Task Exists

- 254+ instancias de `Intl.*` scattered por el repo, la mayoría con `'es-CL'` hardcoded.
- No hay utility central: cada módulo reinventa el wheel, con inconsistencias en precision, separadores y timezone.
- Formatos incorrectos por locale rompen la UX con clientes no-chilenos: separadores de miles, símbolo de moneda, posición del símbolo, formato de fecha.
- Finance es el consumer más crítico: reports multi-currency (CLP/USD/BRL/MXN) hoy asumen el mismo formatter.
- Este trabajo **no espera** a que `TASK-265` cierre — son cambios de formato, no de copy. Puede arrancar en paralelo.

## Goal

- Dejar una utility canónica que todo el codebase pueda consumir.
- Reducir el count de call sites con `'es-CL'` hardcoded a un target medible.
- Soportar locale override por call site y default implícito desde sesión/tenant cuando esté disponible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — formatter de moneda debe respetar las reglas de display de Finance.

Reglas obligatorias:

- Timezone operativa sigue siendo `America/Santiago` para payroll y cierre — la utility no debe confundir locale de UI con timezone operativa.
- Moneda display separada de moneda de computo: un reporte puede computarse en CLP y mostrarse en USD formateado según locale.
- Mantener retrocompatibilidad temporal: la migración de los 254+ call sites puede ser incremental.
- No re-implementar `Intl`: la utility es un wrapper tipado con defaults sensatos, no una lib nueva.

## Normative Docs

- `docs/tasks/to-do/TASK-266-greenhouse-i18n-globalization-activation.md`
- Cualquier utility de formato existente en `src/lib/` (inventariar en planning).

## Dependencies & Impact

### Depends on

- Ninguna — entregable independiente.
- Si `TASK-428` cierra antes, consume la lista de locales first-class; si no, acepta cualquier locale BCP 47 válido.

### Blocks / Impacts

- Reduce la deuda que `TASK-430` hereda al activar locales reales.
- Beneficia inmediatamente a Finance, payroll reports, analytics y emails.
- No bloquea ninguna otra task.

### Files owned

- `src/lib/format/` (nuevo)
- Todo call site que consuma `Intl.*` de forma hardcoded (migración incremental)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Utility foundation

- Crear `src/lib/format/` con funciones:
  - `formatDate(date, options?, locale?)`
  - `formatDateTime(date, options?, locale?)`
  - `formatCurrency(amount, currency, locale?)`
  - `formatNumber(value, options?, locale?)`
  - `formatPercent(value, locale?)`
  - `formatRelative(date, locale?)` (si aplica)
- Cada función acepta `locale` explícito; si no se pasa, usa el default del runtime (inicialmente `es-CL`).
- Type safety sobre currencies soportadas (`CLP`, `USD`, `BRL`, `MXN`, etc.).

### Slice 2 — Default resolution (no persistence)

- La utility resuelve el locale default desde un módulo `src/lib/format/locale-context.ts` que por ahora retorna `es-CL`.
- Cuando `TASK-431` entregue persistencia, ese módulo se actualiza para leer de sesión/tenant sin cambiar las signaturas de las funciones.

### Slice 3 — Migración incremental de call sites

- Detectar los 254+ call sites con `rg "toLocaleString|Intl\.(DateTimeFormat|NumberFormat)"`.
- Migrar por prioridad:
  1. Finance displays (moneda, economics, payroll)
  2. Shared analytics (rendimiento, delivery metrics)
  3. Emails
  4. Restantes
- No pretender migrar 100% en una sola PR — dividir por dominio si el PR se vuelve inmanejable.

### Slice 4 — ESLint guard (opcional)

- Considerar un rule que alerte sobre nuevos `toLocaleString('es-CL')` o `Intl.DateTimeFormat('es-CL')` fuera de `src/lib/format/`.

## Out of Scope

- Copy / traducción — fuera.
- Persistencia de locale en PG (eso es `TASK-431`).
- UI para cambiar locale (eso es derivado de `TASK-431`).
- Multi-currency display strategy en Finance — si requiere decisión propia, derivar child task desde Finance.

## Acceptance Criteria

- [ ] `src/lib/format/` existe con las funciones listadas y type safety.
- [ ] 100% de los call sites en `src/lib/finance/**`, `src/lib/payroll/**`, `src/emails/**` y vistas de analytics consumen la utility central.
- [ ] Baseline de `toLocaleString('es-CL')` + `Intl.*('es-CL')` fuera de `src/lib/format/` queda en **≤ 30** instancias (baseline 254+), con plan documentado para los restantes.
- [ ] Tests unitarios cubren al menos: moneda CLP, USD, BRL; fechas en 3 locales; números con separadores diferentes.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan.

## Verification

- Tests unitarios nuevos para la utility.
- Verificación manual en staging de: Finance dashboards, payroll reports, emails que incluyan montos y fechas.
- Grep post-migración para confirmar el conteo objetivo.

## Closing Protocol

- [ ] Actualizar `TASK-266` con progreso.
- [ ] Documentar la utility en `GREENHOUSE_UI_PLATFORM_V1.md` (sección formatting).
- [ ] Notificar a Finance de que la utility está disponible para consumo multi-currency.

## Open Questions

- ¿La utility debe exponer también `parseDate` / `parseNumber` por locale, o solo formateo?
- ¿Finance necesita una segunda capa de formateo contable (signos, paréntesis para negativos, CR/DR) separada del formateo general?

## Execution Notes — 2026-05-06

### Open Questions Resueltas

- `parseDate` / `parseNumber`: fuera de scope para esta entrega. La tarea activa solo formateo; parsing por locale requiere UX de inputs, validación y errores localizados, por lo que debe vivir en una task posterior con contrato de forms.
- Capa contable Finance: se entrega como función explícita `formatAccountingCurrency` sobre la misma foundation, no como wrapper paralelo. Rationale: evita duplicar reglas de currency/locale y mantiene el formato contable opt-in.

### Entrega

- Foundation canónica `src/lib/format/` con date, datetime, ISO date keys, currency, accounting currency, number, integer, percent, relative y plural.
- Default locale inicial `es-CL`, timezone operacional `America/Santiago` y date-only strings sin drift por timezone.
- Migración de call sites visibles y críticos en `src/lib/finance/**`, `src/lib/payroll/**`, `src/emails/**`, payroll views, pricing/admin-pricing, dashboard y finance movement feed.
- Guardrail ESLint `greenhouse/no-raw-locale-formatting` en modo `warn`, scoped a surfaces visibles (`src/views`, `src/components`, `src/app`) para evitar nuevas llamadas crudas a `Intl.*` / `toLocale*` sin romper deuda histórica.

### Conteo Post-Migración

- Scope crítico migrado (`src/lib/finance`, `src/lib/payroll`, `src/emails`, payroll views, pricing/admin-pricing, dashboard, finance movement feed): `0` usos directos de `new Intl.*`, `toLocaleString`, `toLocaleDateString` o `toLocaleTimeString`.
- Quedan menciones textuales a `es-CL` / `en-US` cuando son argumentos explícitos de la utility, tests, comentarios o casing (`toLocaleLowerCase`) fuera del anti-pattern de formateo.

### Validación

- `pnpm exec tsc --noEmit --pretty false` — OK.
- `pnpm exec vitest run src/lib/format/__tests__/format.test.ts src/lib/finance/pdf/__tests__/formatters.test.ts src/lib/payroll/final-settlement/document-pdf.test.tsx src/emails/PayrollReceiptEmail.test.tsx src/emails/PayrollExportReadyEmail.test.tsx --reporter=verbose` — OK, 5 files / 24 tests.
- `node eslint-plugins/greenhouse/rules/__tests__/no-raw-locale-formatting.test.mjs` — OK.
- Grep post-migración del scope crítico — OK, 0 raw formatters directos.
