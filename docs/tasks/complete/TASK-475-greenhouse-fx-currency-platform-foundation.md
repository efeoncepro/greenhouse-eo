# TASK-475 — Greenhouse FX & Currency Platform Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-475-greenhouse-fx-currency-platform-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar la brecha entre la capa FX/currency del pricing engine y el resto de Greenhouse. La task define un contrato robusto y escalable para monedas soportadas por dominio, cobertura real de tipos de cambio, freshness/staleness, y guardrails de consumo para que `TASK-466` pueda emitir cotizaciones multi-moneda sin romper payroll, cost intelligence, personas, organizaciones ni finance core.

## Why This Task Exists

Hoy el repo ya soporta dos realidades distintas:

1. Finance core sigue acotado a `CLP | USD` en `src/lib/finance/contracts.ts`.
2. Pricing/quotes ya soporta `USD/CLP/CLF/COP/MXN/PEN` en `src/lib/finance/pricing/contracts.ts` y su conversor lee pares arbitrarios desde `greenhouse_finance.exchange_rates`.

Eso alcanza para pricing simulation, pero no constituye una foundation plataforma:

- no existe una matriz explícita de monedas soportadas por dominio;
- el sync operativo sigue pensando principalmente en compatibilidad `USD/CLP`;
- no hay contrato común de freshness, missing-pair, fallback y readiness;
- `TASK-466` asumiría cobertura FX y políticas de snapshot que hoy no están endurecidas a nivel Greenhouse.

Si se resuelve esto solo dentro de quotes, el resultado sería frágil: duplicación de lógica, drift entre módulos y riesgo de romper consumers que hoy siguen normalizados a CLP.

## Goal

- Definir el contrato canónico de monedas y políticas FX por dominio (`finance core`, `pricing/quotes`, `reporting`, `analytics`).
- Endurecer la cobertura y lectura de `greenhouse_finance.exchange_rates` para las monedas que Greenhouse ya expone comercialmente.
- Exponer una capa reusable de readiness/freshness para consumers backend sin recalcular FX inline en UI/PDF/email.
- Mantener estables los consumers existentes que siguen normalizados a CLP hasta que haya una migración explícita.

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
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`

Reglas obligatorias:

- `greenhouse_finance.exchange_rates` sigue siendo la source of truth operacional para FX. No crear una tabla paralela para quotes o pricing.
- Soporte de moneda debe declararse por dominio. `finance core`, `pricing output`, `reporting` y `analytics` no tienen por qué compartir el mismo universo de monedas.
- Los consumers que hoy trabajan en CLP (`operational_pl`, `member_capacity_economics`, readers de costos) no se amplían de manera implícita a nuevas monedas en esta task.
- Ningún consumer client-facing debe resolver tasas inline desde UI, PDF o email; debe consumir helpers/readers backend con política explícita de freshness y error.
- La solución debe ser robusta y escalable: sin branches ad hoc por moneda en quotes, sin asumir que el siguiente país agregado será el último, y con contratos claros para onboarding de nuevas monedas.

## Normative Docs

- `docs/tasks/complete/TASK-281-payment-instruments-registry-fx-tracking.md`
- `docs/tasks/to-do/TASK-397-management-accounting-financial-costs-integration-factoring-fx-fees-treasury.md`
- `docs/tasks/to-do/TASK-416-finance-metric-registry-foundation.md`
- `docs/tasks/to-do/TASK-429-locale-aware-formatting-utilities.md`
- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`

## Dependencies & Impact

### Depends on

- `src/lib/finance/contracts.ts`
- `src/lib/finance/shared.ts`
- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/pricing/contracts.ts`
- `src/lib/finance/pricing/currency-converter.ts`
- `src/app/api/finance/economic-indicators/sync/route.ts`
- `src/app/api/finance/exchange-rates/latest/route.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/cost-intelligence/pl-types.ts`

### Blocks / Impacts

- `TASK-466` — no debe implementar multi-currency output sobre supuestos incompletos de cobertura FX.
- `TASK-397` — podrá consumir una base FX más explícita para costos financieros y treasury.
- `TASK-416` / `TASK-417` — el registry financiero debe declarar mejor `currency` y `fxPolicy` con foundation real.
- `TASK-429` — formatting multi-moneda debe apoyarse en una capa de soporte/semántica clara, no inventar reglas por locale.
- Pricing program (`TASK-464d`, `TASK-465`, `TASK-473`) — puede seguir vendiendo en varias monedas, pero con guardrails plataforma en lugar de lógica dispersa.

### Files owned

- `src/lib/finance/contracts.ts`
- `src/lib/finance/shared.ts`
- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/pricing/contracts.ts`
- `src/lib/finance/pricing/currency-converter.ts`
- `src/app/api/finance/economic-indicators/sync/route.ts`
- `src/app/api/finance/exchange-rates/latest/route.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/cost-intelligence/pl-types.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`

## Current Repo State

### Already exists

- `src/lib/finance/contracts.ts` restringe `FinanceCurrency` a `CLP | USD`.
- `src/lib/finance/exchange-rates.ts` y `src/app/api/finance/economic-indicators/sync/route.ts` mantienen el carril operativo de compatibilidad `USD/CLP`.
- `src/lib/finance/pricing/contracts.ts` ya expone `PRICING_OUTPUT_CURRENCIES = ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN']`.
- `src/lib/finance/pricing/currency-converter.ts` ya puede resolver pares arbitrarios desde `greenhouse_finance.exchange_rates`.
- `src/lib/member-capacity-economics/store.ts` y `src/lib/team-capacity/tool-cost-reader.ts` ya persisten/leen contexto FX explícito, pero sus targets operativos siguen normalizados.
- `src/lib/cost-intelligence/pl-types.ts` mantiene `OperationalPlSnapshot.currency: 'CLP'`.

### Gap

- No existe una matriz canónica de monedas soportadas por dominio.
- No está endurecida la política de cobertura/freshness para `CLF/COP/MXN/PEN`.
- `TASK-466` hoy asume que `exchange_rates` tendrá los pares necesarios, pero eso no está garantizado por contrato operativo.
- No existe una surface backend única para declarar “moneda soportada”, “par faltante”, “tasa stale” o “fallback permitido”.
- Hay riesgo de que quotes, pricing, finance y analytics evolucionen con contratos divergentes si esto no se corrige antes.

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

### Slice 1 — Currency domain contract

- Formalizar en `src/lib/finance/**` y arquitectura una matriz explícita de soporte por dominio:
  - `finance core`
  - `pricing / quote output`
  - `reporting / metric surfaces`
  - `CLP-normalized analytics`
- Separar con claridad:
  - moneda transaccional fuente,
  - moneda de output/comercialización,
  - moneda target de reporting,
  - política FX aplicable.
- Mantener `FinanceCurrency` estable si el dominio no requiere expansión directa; evitar romper contracts que hoy esperan solo `CLP | USD`.

### Slice 2 — FX coverage and ingestion hardening

- Endurecer el carril operativo de tasas en `greenhouse_finance.exchange_rates` para las monedas ya soportadas comercialmente por pricing (`CLF/COP/MXN/PEN` además de `USD/CLP`).
- Definir política explícita de cómo se puebla cada par soportado:
  - sync automatizado,
  - backfill histórico mínimo,
  - fallback permitido o no,
  - estado explícito de “unsupported” cuando aplique.
- Evitar diseño one-off por país: la solución debe poder extenderse a nuevas monedas sin reabrir el contrato base.

### Slice 3 — Readiness, freshness and consumer guardrails

- Extender la capa `src/lib/finance/` y las APIs de exchange rates para que los consumers backend puedan consultar:
  - cobertura del par,
  - fecha efectiva de la tasa,
  - source/provider,
  - estado stale,
  - razón de fallo cuando no exista cobertura suficiente.
- Quotes/pricing deben consumir esta capa shared para snapshot y validación, no resolver pares con lógica dispersa.
- Definir comportamiento robusto frente a par faltante o stale:
  - bloquear,
  - degradar con advertencia,
  - o permitir solo en surfaces internas, según el dominio.

### Slice 4 — Downstream boundaries and documentation

- Actualizar la arquitectura y docs operativas para declarar con precisión qué módulos quedan:
  - multi-currency enabled,
  - CLP-normalized,
  - o dependientes de una migración futura.
- Reanclar `TASK-466` para que use esta foundation en vez de asumir cobertura implícita.
- Dejar explícito que esta task no migra payroll, P&L ni cost intelligence a nuevas monedas; solo endurece la base compartida y sus contratos.

## Out of Scope

- Implementar el output client-facing de cotizaciones, PDF o email en varias monedas; eso sigue siendo `TASK-466`.
- Cambiar la moneda canónica de `operational_pl`, `member_capacity_economics` o payroll.
- Resolver locale/i18n/formatting de UI a nivel global; eso sigue en `TASK-429` / `TASK-266`.
- Modelar resultado cambiario gerencial, factoring y treasury; eso sigue en `TASK-397`.
- Crear una nueva entidad de FX fuera de `greenhouse_finance.exchange_rates`.

## Detailed Spec

La solución debe dejar un contrato plataforma legible y reutilizable. Como mínimo, el agente debe cerrar estas decisiones:

1. **Currency matrix por dominio**
   - `finance core`: qué monedas puede persistir/validar sin romper contratos existentes.
   - `pricing / quotes`: qué monedas puede ofrecer comercialmente.
   - `reporting / metrics`: qué métricas exponen moneda y bajo qué `fxPolicy`.
   - `analytics`: qué surfaces siguen CLP-normalized.

2. **FX policy matrix**
   - `rate_at_event`
   - `rate_at_send`
   - `rate_at_period_close`
   - `none`

3. **Readiness contract**
   - un consumer debe poder saber si una moneda está:
     - `supported`
     - `supported_but_stale`
     - `unsupported`
     - `temporarily_unavailable`

4. **Scalability rule**
   - agregar una nueva moneda no debe exigir:
     - expandir a ciegas `FinanceCurrency`,
     - tocar manualmente cada surface client-facing,
     - ni duplicar lógica de validación en quotes, PDF, email y analytics.

5. **Compatibility rule**
   - los consumers CLP-normalized existentes siguen funcionando exactamente igual hasta que una task posterior los migre de forma explícita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una matriz canónica documentada de monedas soportadas por dominio y está alineada con los types/contracts reales del repo.
- [ ] `greenhouse_finance.exchange_rates` y su pipeline operativo cubren o declaran explícitamente el estado de `USD/CLP/CLF/COP/MXN/PEN`.
- [ ] Los consumers backend de quotes/pricing pueden consultar coverage/freshness de tasas sin lógica inline en UI/PDF/email.
- [ ] `TASK-466` queda reanclada a esta foundation y ya no asume cobertura FX implícita.
- [ ] Los consumers CLP-normalized existentes siguen estables y su boundary queda documentada.
- [ ] La solución demuestra robustez y escalabilidad: agregar una moneda nueva no requiere hardcodes dispersos ni contradicciones entre domains.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- verificación manual de cobertura/readiness sobre los pares soportados en las APIs/helpers de exchange rates

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md` quedaron sincronizados con el contrato final

## Follow-ups

- `TASK-466` — consumo client-facing de la foundation multi-currency en quote output, PDF y email.
- `TASK-397` — uso de la capa FX endurecida para costos financieros, factoring y treasury.
- `TASK-429` — formateo locale-aware ya apoyado en un contrato de currency/fx explícito.
- migraciones futuras de analytics/reporting que hoy siguen CLP-normalized, si el negocio realmente las necesita.

## Open Questions

- ¿Greenhouse quiere expandir `FinanceCurrency` en el dominio transaccional, o mantenerlo acotado mientras `pricing output` vive en una capa más amplia?
- ¿Cuál es la fuente/proveedor preferida por moneda para `CLF`, `COP`, `MXN` y `PEN`, y cuál es el fallback permitido por compliance operativo?
- ¿Qué umbral de staleness bloquea envío client-facing versus qué umbral solo genera warning interno?
