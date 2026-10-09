# TASK-2022 — Pricing V3: catálogo operativo y flujo completo para agentes

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Status real: `Completa local; economía y promoción canónica pendientes fuera de alcance`
- Rank: `2022`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; shared checkout; sin worktrees`

## Summary

Completar catálogo/reglas de recursos para los32 perfiles históricos y flujo programático de planificación,
reparto por capacidad declarada, evaluación comercial y preview redactado. Los datos verificables se incorporan
con fuente; desconocidos se reportan sin inventar precios, contratos, usuarios o aprobación comercial.

## Why This Task Exists

Tres perfiles tenían policy ejecutable, y el agente debía preparar cada asignación manualmente. Falta catálogo
consultable, denominador de cartera, entradas pendientes accionables y distinción persona/servicio en salida.

## Goal

- Todos los perfiles y herramientas históricos trazables; actual/reportado/público/histórico separados.
- Agente descubre y prepara una demanda sin fórmulas propias; reparto reconciliado con parte interna.
- Casos ampliados, explicación, readiness económica y preview seguro; promoción canónica delimitada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/documentation/finance/cotizador-v3-seleccion-herramientas.md`
- `docs/business-models/EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md`

## Dependencies & Impact

### Depends on

TASK-2019/2020/2021 completos locales. TASK-2017 conserva economía; TASK-1211/1212 preservan canon API.

### Blocks / Impacts

No reemplaza V2, DB ni consumers productivos. Follow-up de promoción requiere autoridad y evidencia propias.

### Files owned

- `src/lib/finance/pricing-v3/resources/operating*`, `resources/composition*` y adapters/projection local.
- `scripts/commercial/pricing-v3.ts`, tests y `data/pricing/v3-operating/`.
- Manual, ADR, audit, skills espejo y deltas de continuidad.

## Current Repo State

### Already exists

Motor decimal, catálogo histórico32 perfiles/26 tools, planner IA, composer y replay. No inventario live.

### Gap

Reglas sólo3 perfiles; faltan cartera declarada y flujo de planificación/evaluación. Adobe cobertura confirmada
por operador:180 USD/mes cubre3 CC Teams+3 Express. Fecha del alza70% desconocida. Operador autoriza reparto por
capacidad declarada, parte interna separada, sin porcentajes arbitrarios.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/finance/pricing-v3/resources/`
- Future candidate home: `domain-package`
- Boundary: primitives puros; adapterCLI/FS y snapshot inmutable
- Server/browser split: Zod/Decimal browser-safe, noSDK/DB/Next en dominio
- Build impact: sin dependencias nuevas
- Extraction blocker: promoción canónica requiere tenancy/auth/lifecycle y contrasteV2/V3

## Backend/Data Contract

### Backend/data brief

Backend-lite local reader. Source of truth explícita: catálogo/policy/portfolio declarados; consumers CLI internos.

### Contract surface

Readiness/discovery/plan/portfolio/proyección local. Paths anteriores compatibles; ninguna capability remota.
API parity futura reutiliza primitive con adapter de identidad y permisos del canon, no nueva topología.

### Data model and invariants

Usuarios únicos, seats nominativos enteros, denominador/parte interna reconciliados; no descuentoFTE implícito.
No suma duplicada de paqueteAdobe/Express; presupuestoIA por proveedor/mes. Estado y fuentes separados;
missing/stale no convierte a0. Alias de perfiles ambiguo bloquea. No inventar salario vigente ni40/35 aprobado.
Read-only por account declarado, sin autoridad tenant live. JSON nuevo y hash explícito; artifacts nunca se actualizan.

### Migration, backfill and rollout

Sin migración/backfill/flag. Additive local opt-in, rollback retirar comandos/policy nueva; baseline intacto.

### Security and access

Slots sin PII, no credenciales ni facturas completas enrepo. Errores sanitizados; previews externos allowlist sin
costos/rates/margen/país de talento. Simulación sigue sin aprobación/envío/export comercial vinculante.

### Runtime evidence

SuiteV3, negativos/pureza/replay/redacción, CLI casos y reconciliaciónDecimal. Outlook sólo investigación read-only;
precio público no gastoEfeonce. No DB/UI/deploy/livewrite.

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

### Slice 1 — Datos y reglas

Policy32 perfiles/tools, evidenciaAdobe/precios públicos, FXreferencial si fecha verificable, pendientes concretos.

### Slice 2 — Flujo programático

Discovery/plan sin compra, reparto de cartera, evaluación y preview redacted, mismo kernel.

### Slice 3 — Verificación y cierre

Casos persona/servicio/CRM y faltantes; documentación, QA e integración canónica preparada.

## Out of Scope

Compra/licencias reales, CRM/envíos, despliegue, sustituciónV2, inventario/remotas/tenancy, aprobación tarifaria
sin evidencia. No afirmar que una simulación prueba capacidad/salario/mercado/SOW.

## Detailed Spec

ADR operativo. Las tareas inferidas se registran como reglas de revisión. Plan descubre candidatos y produce
preguntas por campo pendiente; el agente interpreta lenguaje y el dominio compone/calcula.

## Rollout Plan & Risk Matrix

Orden datos/contrato → primitive/CLI → casos → docs/QA. Riesgos: defaults arbitrarios, sobreasignación, dobleAdobe,
actualizar artifactsviejos o filtrar costos. Gates schema/Decimal/redacción/replay; local opt-in reversible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Catálogo operativo cubre32 perfiles y26 tools históricas más recursos declarados, con fuentes y pendientes.
- [x] Adobe180 paquete combinado; alza306 condicional y sin fecha automática; noExpress duplicado.
- [x] Reparto capacidad cartera + interno reconcilia; sobreasignación/duplicación rechazada; ningún porcentaje default.
- [x] Discovery/plan/quote/explain/replay y evaluación/preview de rol/servicio funcionan por CLI con dominio puro.
- [x] Tests negativos/regresión/redacción y CLI escenarios pasan; artifacts anteriores replayverified.
- [x] Manual/agentes/ADR/QA/contexto/lifecycle sincronizados; pendientes externos y promoción canónica honestos.

## Verification

[QA de la unidad](../../audits/commercial/2026-10-09-pricing-v3-operating-workflow.md):213 testsV2/V3/17 files,
135 V3/78 V2; typecheck0, ESLint focal0, mirrors0;26 operacionesCLI reales y replay3legacy. Catálogo32 perfiles/26 recursos
con nombre trazados; ninguna reserva vacía se cobra. Adobe180/306condicional; driver160/40/80/40 reconcilia.
[CLI](../../../data/pricing/v3-operating/verification.cli.json), [datos/fuentes](../../../data/pricing/v3-operating/README.md),
[manual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) y [faltantes](../../../data/pricing/v3-operating/operational-gaps.json).
Tasklint antes del move:0errors/0warnings. Gates documentales y contexto registrados enQA; no UI/DB/deploy.

## Closing Protocol

- [x] AC y evidencia registradas donde se leen.
- [x] Lifecycle/registry/README sincronizados tras QA proporcional.
- [x] TASK-2017 conserva sólo faltantes económicos externos; datos reales no se inventan.

## Follow-ups

PromociónV3 al canon depende de contrasteV2, authority/lifecycle, consumers y rollout; owner Platform/Finance.

## Open Questions

FechaAdobe; planes/facturas actuales/seats; cartera/capacidad observada; salarios y política comercial. Tooling
hace explícito cada dato requerido y acepta evidencia nueva versionada.
