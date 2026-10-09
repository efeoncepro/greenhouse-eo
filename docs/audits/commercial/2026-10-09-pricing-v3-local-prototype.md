# QA Release Audit — TASK-2016 Pricing V3 local

## Verdict

PASS para la vertical local verificada. No certifica tarifas vigentes o integración canónica.

Closure state: `complete` para el prototipo local; valores comerciales y promoción son follow-ups separados.

## Scope

- Núcleo/schema/proyección en `src/lib/finance/pricing-v3/`, adaptador de snapshots Node, CLI nueva, dos escenarios y catálogo de revisión.
- Runtime: proceso CLI local en checkout y desde otro cwd. Ninguna ruta productiva importa el módulo nuevo.
- Código/dependencia/fixtures/ADR en commit `1db5b0af1`, con endurecimiento de costo humano mezclado en el commit de cierre; plan previo `d82db12a7`. Se preservó todo WIP fuera del alcance; los aliases históricos no se incluyeron en el commit del código V3.
- Manual, modelo/contrato objetivo, pilotos, task/registry y handoff concilian implementación local y límites abiertos.

## Risk Classification

| Riesgo | Nivel | Evidencia/mitigación |
| --- | --- | --- |
| Economics incompletos presentados como precio | Alto por semántica financiera | needs_input, totales null, mode declarado, sin tarifas/approval/issuance automáticos |
| Doble costo o redondeo | Alto por dinero | cobertura por scope/periodo, decimal80, HALF_UP final y mayor resto; golden independiente |
| Fuga de costo/margen en documento | Medio, export local interno | allowlist, prueba adversaria y export bloqueado fuera de política |
| Replay con versión/datos nuevos | Medio | digest de contenido completo, versión exacta, recomputación y tamper tests |
| Impacto runtime existente | Bajo en esta unidad | módulo aditivo no importado por portal/V2; sin DB, env, grants o despliegue |

## Injected Skills

Codex: `software-architect-2026` (boundary/ADR), `efeonce-pricing-operator` (economics/countries/coverage), `greenhouse-finance-accounting-operator` (costo/precio/caja/impuestos), `greenhouse-task-planner` (registro/plan), `greenhouse-qa-release-auditor` (adversarial/evidencia) y `greenhouse-documentation-governor` (cierre). No participaron subagentes ni se afirma auditoría Claude.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Baseline tipos | PASS | Antes de código, tsc exit 0 |
| Baseline lint global | Fallo preexistente acotado | `pnpm lint`: 2 errores en `.tmp-sheet.mjs` (import/newline-after-import, padding-line-between-statements), 26 warnings; no se modifica ese archivo |
| Tests V3 | PASS 49/49 | `pnpm pricing:v3:test`; archivo `src/lib/finance/pricing-v3/__tests__/pricing-v3.test.ts` |
| Regresión histórica | PASS 23/23 | `pnpm pricing:workbook:test`; lector/Excel no se modifican |
| Tipos del repo | PASS | `pnpm typecheck`, exit 0, después de código/test nuevos |
| Lint focal | PASS | `pnpm exec eslint src/lib/finance/pricing-v3 scripts/commercial/pricing-v3.ts`, exit 0; commit hook también limpio |
| Núcleo/CLI | PASS | Mismo resultado sobre fixture sintético; CLI desde directorio temporal; cálculo/explain/replay/export/catalog y no overwrite |
| Estados | PASS | Exit 0 cálculo completo, 2 CO→CL incompleto, 3 revisión, 1 error técnico; stdout JSON limpio y stderr sanitizado |
| Snapshots/redacción | PASS | Timestamp fuera del hash; input/result/version alterados rechazados; cliente sin costo/margen/factores/fuentes/traces/políticas ni notas financieras de exclusión; pendiente/review no exporta |
| Gate QA focal | Evaluado | `pnpm qa:gates --changed --agent codex --task TASK-2016 --finance --docs -- <paths>`; dominios finance/data/docs/tooling, skills cargadas y evidencia proporcional |
| Task/ops | PASS | Task focal 0 errores/0 warnings; ops changed exit0/0 errores, 19 warnings ajenos de registry/epic parity |
| Docs/context | Cierre focal | Closure strict sin faltantes; context strict se ejecuta tras última edición documental y sus resultados quedan en la ejecución del cierre |

Golden manual sintético: humano 400/mes, otros 200/mes; venta humano 720 y otros 300/mes. Tres mensualidades más setup 150 =3210; descuento321 → neto2889. Costo1900, margen989, caja atribuida2800. Tax/grandTotal null por tratamiento fiscal pendiente. No son valores operativos.

Digest de smoke sintético: `d9dfb365f2287cccab9637daf4a94e97e3ce7456e21c242321b762053458d05d`, ID `local-d9dfb365f2287cccab9637da`.

Digest de escenario Colombia→Chile pendiente: `fb397f774df79f17689d3d247ec6e5ed4f47a65e8c2e10202f9df80076206090`, ID `local-fb397f774df79f17689d3d24`. Resultado `needs_input`, sin total: `MISSING_FX`, `MISSING_MARKET_POLICY`, `MISSING_COST`, `MISSING_POLICY`. Estos pendientes iniciales no prueban que herramientas/fee/Assurance/operación estén completos: se deben resolver sus coberturas al completar las políticas.

## Blockers

Ninguno para el prototipo local. El lint global sigue sin quedar verde por el archivo preexistente fuera del alcance; no se declara saneamiento del worktree completo. Economics vigentes bloquean **cotización comercial**, no los fixtures del desarrollo autorizado.

## Conditional Follow-Ups

1. Commercial/Finance + Operations: validar costo colombiano/fecha/cargas/coberturas, capacidad, kits/facturas, Assurance/operación/setup, precio/mercado/margen y FX; no usar datos de prueba.
2. Platform/Architecture: contraste V2/V3, readers/capabilities/auth/audiencias y cutover/rollback bajo unidad propia. No existe Full API Parity productiva de V3 todavía.
3. Extensiones del contrato objetivo: salarios por periodo, request overrides, consumo AI medido, fee porcentual de ingresos, setup amortizado, rounding comercial, múltiples ajustes y servicios compuestos; campos actuales no implementados se rechazan.

## False-Closure Traps Checked

- Tests verdes no certifican precios: escenario real pendiente y parámetros `review_only`/lista operativa vacía.
- No UI/URLs/capturas: no hay cambio visual ni consumer UI en el scope.
- No env/flag/redeploy/backfill: el proceso local no depende de esos pasos. No se ejecutan migraciones o finance:e2e productivo que no ejercitan esta unidad.
- Artifact/calculationId no es Quote remota ni approval/issued; documento comercial es draft estimate no vinculante.
- Snapshot/Digest no es firma ni autenticación: se opera en checkout interno; integración futura requiere autorización canónica.
- Sentry/Cloud/CRM no verificados: no se alteran ni se reclama rollout.

## Final Call

La primera vertical de cálculo local está ejecutable, reproduce inputs completos y devuelve faltantes sin precios inventados. Se cierra el prototipo documentado. La operación comercial y la adopción canónica permanecen fuera del cierre; el [manual](../../manual-de-uso/finance/cotizar-v3-por-cli.md) conserva ambas fronteras y el flujo para agentes.
