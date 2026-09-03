# TASK-1806 — Growth SEO: evaluación y cutover de DataForSEO Improved ETV

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Slice 0 en curso (2026-09-03): readiness verificada en DB/API/worker, preregistro congelado (docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md, 13 celdas / 26 requests / USD ≈1,02, caps propuestos 30 req / USD 2,00). Bloqueada por contract de schema (aplicable ≥ 2026-09-10 con readback 0/0/0) y por aprobación explícita de gasto. Cero llamadas pagadas`
- Rank: `2`
- Domain: `growth|seo|data|integration|ops`
- External deadline: `2026-11-01T00:00:00Z; no existe fallback legacy posterior`
- Internal targets: `shadow/decision 2026-10-23; cutover 2026-10-28T00:00:00Z`
- Blocked by: `contract de schema ETV parqueado en docs/tasks/pending-migrations/ (hoy 5/8/2 filas contractuales en la ventana de 7 días; aplicable ≥ 2026-09-10 con readback 0/0/0); aprobación explícita de gasto/cohorte/caps (preregistro 2026-09-03); aprobación separada de tratamiento histórico y cutover`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ejecuta la evaluación controlada de Improved ETV sobre la foundation versionada de `TASK-1805`, compara legacy
e improved contra GSC y entre sí, decide el tratamiento de la historia y activa la nueva metodología en todos los
los siete caminos consumidores DataForSEO Labs. El cutover es explícito y observable; sólo es reversible a legacy
antes del corte del proveedor. Esta task no rediseña
schema, readers ni API/MCP.

La task queda registrada para ejecución futura. Su creación no autoriza llamadas pagadas, gasto, cambios de
configuración, schedulers, deploy, rebaseline histórico ni cutover.

## Why This Task Exists

La compatibilidad técnica y la activación productiva tienen autoridades distintas. `TASK-1805` puede cerrar con
legacy explícito después de entregar schema, policy, writers, readers, API/MCP y evaluador seguro. Elegir improved
requiere observar resultados reales, aprobar gasto, decidir cómo presentar la discontinuidad histórica y coordinar
dos runtimes. Mantener esos actos dentro de la foundation impediría un cierre honesto y confundiría readiness con
adopción.

Esta task garantiza que el split no recorte alcance: termina con Improved ETV efectivamente servido en los siete
caminos consumidores antes del corte. Un no-go posterior obliga a congelar capturas ETV; ya no puede preservar
legacy mediante `false`.

## Goal

- Medir legacy e improved sobre una cohorte preregistrada y un presupuesto máximo aprobado.
- Determinar si improved mejora la calibración contra GSC y cómo altera valor, orden y membresía top-N.
- Adoptar rebaseline o breakpoint histórico explícito sin conectar metodologías en una misma serie.
- Ejecutar cutover y rollback pre-corte verificados en staging; en producción, verificar cutover y el safe mode de
  congelación que queda disponible después del corte.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- `TASK-1805` debe estar completa y demostrar legacy explícito antes de la primera llamada de shadow.
- GSC es benchmark first-party separado; no se promedia ni sustituye por ETV.
- La cohorte, las métricas, los umbrales, el máximo de requests y el tope USD se congelan antes de ver resultados.
- Un A/B exacto sólo se llama así cuando ambas fórmulas usan inputs equivalentes; un canary temporal no prueba paridad.
- La task no modifica schema/readers para acomodar resultados: cualquier gap estructural vuelve a `TASK-1805`.
- Ningún caller público, UI o MCP selecciona fórmula ni dispara gasto.
- Cutover y rebaseline requieren aprobaciones distintas del permiso para ejecutar el shadow.
- Código, env y deploy no prueban el método efectivo; se exige readback DB/API/MCP por runtime.
- El provider no devuelve versión: la evidencia combina request, timestamp UTC, policy version y resultado, sin
  inventar un método reportado por la respuesta.

## Normative Docs

- `docs/tasks/to-do/TASK-1805-growth-seo-dataforseo-improved-etv-versioned-transition.md`
- `docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md`
- `docs/audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md`
- `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`
- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `.codex/skills/seo-aeo/SKILL.md`
- `.codex/skills/seo-aeo/modules/07_MEASUREMENT.md`

## Dependencies & Impact

### Depends on

- `TASK-1805` completa, con foundation desplegada y legacy verificado en Vercel y ops-worker.
- Respuesta contractual DataForSEO incorporada. Sandbox y URLs públicas pendientes no bloquean fixtures/shadow.
- Aprobación explícita del presupuesto, máximo de requests, sujetos y ventana del shadow.
- Aprobación explícita posterior del tratamiento histórico y del cutover.
- Propiedades GSC con período/mercado comparables para los dominios propios incluidos.

### Blocks / Impacts

- Adopción completa de Improved ETV en domain overview, historical overview, bulk traffic estimation,
  URL visibility, relevant pages, subdomains y prospect diagnostic cuando sean compatibles.
- Interpretación de series, concentración, traffic cost y estimación de tráfico de prospectos.
- Schedulers mensuales, Vercel, ops-worker, API ecosystem/app, Nexa y MCP.
- Cualquier UI futura que represente breakpoint o metodología.

### Files owned

- `scripts/growth/*dataforseo*etv*` o placement final aprobado para ejecución/evaluación.
- `services/ops-worker/deploy.sh` sólo para configuración/cutover ETV.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` sólo para estado ETV.
- `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`
- `docs/audits/seo/*dataforseo-improved-etv*`
- Artefacto de resultados/redacción final definido en Plan Mode, sin datos sensibles.

## Current Repo State

### Already exists

- Spend ledger, entitlement, circuit breaker y registro de costo de la familia Labs.
- GSC per-org para benchmark separado de la lente estimada.
- Auditoría de impacto, ADR aceptado, correo contractual y runbook de evaluación.
- Foundation de `TASK-1805` desplegada en producción (release `5ec4cf769977`, verificada 2026-09-03): policy pura
  y provenance `etvMethodology` en los siete caminos writer, schema formula-aware (migración expand aplicada;
  filas previas atribuidas `legacy_static_v1` + `contract_default_pre_cutoff`), readers/API/MCP que filtran por
  método y devuelven `not_available_for_method`, selectores legacy explícitos en Vercel y en
  `services/ops-worker/deploy.sh` (`GROWTH_SEO_ETV_METHODOLOGY_VERSION` / `GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION`;
  `/health` del worker responde `configuredWriteSource: env`), señal `seo.etv_methodology.drift` (en
  `awaiting_data` hasta la primera captura explícita del worker) y evaluador dry-run OFF por defecto con
  `scripts/growth/_sanity-task-1805-etv-evaluator.ts` (8/8, `providerCalls: 0`).
- Contract de schema parqueado, no aplicado: `docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending`
  (drop de DEFAULT transitorios + drop de UNIQUE legacy + CHECK NOT VALID en `seo_prospect_diagnostic_facts`).
  Condición de 7 días sin filas nuevas con evidencia contractual corriendo desde 2026-09-03.

### Gap

- No existe evidencia comparable legacy/improved obtenida con inputs equivalentes.
- No hay aprobación de presupuesto, cohorte, umbrales, rebaseline ni cutover.
- La matriz contractual está confirmada; falta evidencia de nuestros payloads y resultados sobre cohorte aprobada.
- Improved ETV no está activado ni servido por Vercel, ops-worker, API o MCP.
- No existe decisión aplicada sobre rebaseline histórico versus breakpoint visible.
- El contract parqueado sigue sin aplicar (ventana de 7 días desde 2026-09-03); aplicarlo es precondición del
  Slice 1: mientras no se aplique, los DEFAULT transitorios y las UNIQUE legacy siguen vigentes.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: evaluador/operación en `scripts/growth/**`, policy y readers en `src/lib/growth/seo/**`, captura en
  ops-worker y proyecciones API/MCP en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: el operador ejecuta el evaluador interno de `TASK-1805`; la policy canónica selecciona metodología y
  todos los consumers leen provenance sin elegir fórmula.
- Server/browser split: provider, GSC, DB, spend y configuración son server-only; no se crea consumer browser.
- Build impact: sin SDK ni filesystem runtime nuevos; outputs de evaluación son artefactos operativos, no imports.
- Extraction blocker: provider externo, spend ledger, schema PostgreSQL y cutover coordinado Vercel/ops-worker.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: policy ETV y snapshots formula-aware entregados por `TASK-1805`.
- Consumidores afectados: `API|MCP|Nexa|cron|worker|Vercel|reporting`
- Runtime target: `staging|production|worker|cron|external`

### Contract surface

- Contrato existente a respetar: ADR ETV, policy/evaluator/readers de `TASK-1805`, transporte canónico
  `src/lib/ai/dataforseo.ts` y spend ledger SEO.
- Contrato nuevo o modificado: configuración canónica cambia de legacy a improved sólo después de los gates;
  artefacto de decisión registra fórmula, evidencia y breakpoint/rebaseline.
- Backward compatibility: `windowed`; legacy sólo permanece disponible hasta 2026-11-01T00:00:00Z.
- Full API parity: API, Nexa y MCP continúan consumiendo el reader canónico; esta task cambia policy/configuración,
  no crea un camino paralelo.

### Data model and invariants

- Entidades/tablas/views afectadas: snapshots/facts formula-aware entregados por `TASK-1805`; sin schema nuevo
  previsto en esta task.
- Invariantes que no se pueden romper:
  - legacy e improved se persisten y analizan como métodos distintos;
  - ningún gráfico, agregado, top-N o serie conecta o mezcla métodos;
  - mismas inputs de comparación salvo el flag de metodología;
  - GSC conserva su lente first-party y sus scopes;
  - filas de shadow permanecen evidencia append-only aunque la decisión sea no-go.
- Write-target allowlist: sólo tablas formula-aware ya autorizadas por `TASK-1805`; una tabla nueva bloquea y
  devuelve el diseño a la foundation.
- Tenant/space boundary: organization/target/market se deriva por los primitives y entitlements vigentes.
- Idempotency/concurrency: run ID y celda `subject × market × endpoint × methodology × period`; una corrida humana
  de prospecto por día se conserva y el shadow usa evaluator interno.
- Audit/outbox/history: artefacto de evaluación y decisión + snapshots append-only + ledger de gasto; sin outbox.

### Migration, backfill and rollout

- Migration posture: `none`; consume el expand-contract ya verificado de `TASK-1805`.
- Default state: evaluator OFF y canonical method legacy explícito.
- Backfill plan: distinguir recomputación completa desde julio de 2026 y aproximación calibrada antes; cualquier
  rebaseline amplio exige aprobación separada y etiqueta de `calculation_basis`.
- Rollback path: volver policy/config a legacy sólo antes del corte. Después, pausar writes y servir estado
  degradado desde la última serie coherente sin borrar improved ni afirmar que `false` restauró legacy.
- External coordination: DataForSEO, presupuesto, pausa/reanudación de schedulers, deploy Vercel/ops-worker y
  sign-off del operador.

### Security and access

- Auth/access gate: evaluator y compare sólo operador interno; entitlements SEO y scopes GSC vigentes.
- Sensitive data posture: sin PII nueva; outputs redactan credenciales, tokens, raw payloads y sujetos no aprobados.
- Error contract: errores canónicos de `TASK-1805` más `evaluation_not_authorized`, `budget_cap_reached`,
  `cutover_not_authorized` y `rollback_unavailable` sanitizados.
- Abuse/rate-limit posture: allowlist, máximo de requests, tope USD, dry-run obligatorio y circuit breaker Labs.

### Runtime evidence

- Local checks: fixtures/replay, dry-run determinista, forecast y tests de equivalencia de inputs.
- DB/runtime checks: readback separado por metodología, costo, append-only, mixed-series fail y canonical selection.
- Integration checks: Sandbox gratuito cuando aplique; shadow/canary pagado sólo después de aprobación registrada.
- Reliability signals/logs: configured/requested/provider-effective, request timestamp/policy, cross-runtime drift,
  mixed-series, solicitud legacy after cutoff, cost cap, provider failure y safe-mode state.
- Production verification sequence: readiness -> shadow -> decisión -> staging cutover/rollback -> producción
  cutover/readback -> observación -> rollback drill o evidencia equivalente aprobada.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] No se crea una tabla o write target fuera de la foundation de `TASK-1805`.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime, DB y provider evidence están listados y separados de config/deploy. *(preregistro §2.)*
- [ ] Errores, gasto, datos sensibles y autorizaciones fallan cerrado.

## Capability Definition of Done — Full API Parity gate

- [ ] La selección canónica permanece en la policy de `TASK-1805`, no en scripts, UI o callers MCP.
- [ ] API, Nexa y MCP sirven el método efectivo desde el mismo reader y no disparan gasto.
- [ ] El compare sólo lee evidencia persistida; el evaluator es una operación interna separada.
- [ ] Cualquier cambio de output mantiene manifest MCP source/generated y gateway sincronizados.
- [ ] Parity check = SÍ: el cutover cambia una capability existente sin crear consumidores alternativos.

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

### Slice 0 — Readiness y preregistro

**Avance 2026-09-03 (sin gasto, sin mutación runtime).** Readback hecho: ops-worker rev `00635-tbt` con selectores
explícitos y `/health.etvMethodology` (`configuredWriteSource=env`, `valid=true`, `afterCutoff=false`); lanes de
producción `domain-overview`/`url-visibility` (Berel) sirven `legacy_static_v1` con `single_methodology`; evaluador
dry-run 8/8 (`providerCalls=0`, ledger intacto); schema sanity en transacción 15/17 (coexistencia sólo tras el
contract; los 2 ❌ eran un conteo duro desactualizado del script, corregido); señal de drift en `awaiting_data`.
Contract NO aplicado: la ventana de 7 días cuenta 5/8/2 filas contractuales (última 2026-08-29 11:04Z) → aplicable
≥ 2026-09-10 con readback 0/0/0. Preregistro congelado en
`docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md` (cohorte Berel MX + Comex MX +
Efeonce CL, 13 celdas / 26 requests / USD ≈1,02, caps propuestos 30 requests / USD 2,00, umbrales y decisión
predefinidos). Pendiente del Slice 0: aplicar el contract cuando se cumpla la condición y registrar la aprobación
explícita del operador (cohorte + caps + ventana). Hasta entonces, cero llamadas pagadas.


- Verificar `TASK-1805` completa mediante DB/API/MCP y configured/requested/provider-effective en ambos runtimes.
- Incorporar respuesta DataForSEO y congelar endpoint matrix, cohorte, período, inputs, métricas y umbrales.
- Generar dry-run con número de requests y costo máximo; obtener aprobación explícita antes de ejecutar.
- Readback concreto de la foundation antes de cualquier llamada: `GET /health` del ops-worker → bloque
  `etvMethodology` (`configuredWriteMethod`, `configuredWriteSource`, `configuredReadMethod`, `policyVersion`,
  `providerCutoffAt`, `afterCutoff`, `valid`); señal `seo.etv_methodology.drift` en `/admin/operations`
  (`awaiting_data` sin captura explícita es esperable; cualquier `error` bloquea);
  `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1805-etv-evaluator.ts`
  (dry-run + replay, `providerCalls: 0`, ledger intacto) y
  `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1805-etv-schema.ts`
  (17/17 en transacción con rollback, incluye el contract); ambos con el proxy Cloud SQL arriba.
- Aplicar el contract parqueado (`docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending`)
  tras verificar sus tres condiciones: release en `main` (cumplida 2026-09-03), 7 días sin filas nuevas con
  evidencia `contract_default_pre_cutoff` (cuenta desde 2026-09-03) y selectores explícitos en Vercel y ops-worker
  (cumplida). Sólo entonces puede empezar el Slice 1.

### Slice 1 — Shadow bounded

- Ejecutar legacy/improved con inputs equivalentes en cada endpoint compatible y bajo allowlist.
- Persistir ambas metodologías con run/costo/latencia/error y sin cambiar el canonical reader.
- Detenerse automáticamente al alcanzar request cap, USD cap, drift o error contractual.

### Slice 2 — Evaluación y decisión histórica

- Comparar ETV contra GSC con error, sesgo y correlación definidos antes de observar resultados.
- Medir delta de valores, orden, Jaccard top-N, traffic cost, prospect traffic, nulls, latencia y costo.
- Documentar go/no-go y elegir rebaseline acotado o breakpoint explícito; obtener aprobación separada.
- Preservar baseline legacy representativo antes del corte y etiquetar historia pre-julio como aproximación.

### Slice 3 — Cutover staging y rollback

- Pausar schedulers afectados y activar improved en Vercel/worker de staging de forma coordinada.
- Ejecutar un canary por camino consumidor, leer DB/API/MCP y comprobar configured=requested=provider-effective.
- Ejercitar rollback a legacy antes del corte y safe mode de pausa degradada para el escenario post-corte.

### Slice 4 — Cutover productivo y observación

- Repetir el cambio con aprobación explícita, ventana, owner y rollback ready.
- Reanudar schedulers sólo después del readback productivo y observar señales/costo durante el cooldown.
- Registrar breakpoint/rebaseline, evidencia final y estado honesto de todos los consumers.

## Out of Scope

- Implementar schema, writers, readers, policy, API o MCP pertenecientes a `TASK-1805`.
- Ejecutar cualquier llamada pagada sin aprobación explícita del monto y los sujetos.
- Activar improved sólo porque el proveedor lo convirtió en default.
- Sustituir `etv` por `clickstream_etv`, combinar ambos o construir una fórmula propia.
- Crear UI; una representación visible no aditiva requiere task `ui-ux` separada.
- Reabrir `TASK-1775`, `TASK-1776`, `TASK-1709`, `TASK-1300` o `TASK-1785`.
- Declarar go sólo porque improved se acerca a GSC en una única propiedad o período.

## Detailed Spec

La unidad mínima comparable es `subject × market × language × endpoint × period × methodology`. El A/B cubre las
seis familias/siete caminos que consumen ETV; tres callers `etv_ignored` se validan por guard y cinco familias sin
caller permanecen `provider_supported_not_enabled`. Todos los campos de input deben ser idénticos salvo la selección
de fórmula. Si DataForSEO no permite obtener legacy e improved
para la misma celda, el resultado se clasifica como comparación temporal y no como A/B exacto.

El informe de decisión separa tres preguntas: calibración contra GSC, estabilidad competitiva entre métodos y
costo/operabilidad. Improved puede ser mejor calibrado y aun así exigir un breakpoint por cambios de membresía o
historia. Un no-go no borra evidencia ni invalida la foundation: conserva legacy explícito y registra la condición
de reevaluación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1805 complete` -> Slice 0 -> Slice 1 -> Slice 2 -> aprobación histórica/cutover -> Slice 3 -> Slice 4.
- Slice 1 MUST NOT comenzar sin dry-run, allowlist, request cap y USD cap aprobados.
- Slice 2 MUST cerrar antes de cambiar el canonical method en cualquier runtime.
- Rollback staging MUST comprobarse antes del cutover productivo.
- Schedulers MUST permanecer pausados mientras Vercel y worker puedan servir métodos distintos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cohorte favorece artificialmente improved | evaluación | medium | preregistro + mercados/intenciones/features diversos | cobertura insuficiente |
| Inputs no equivalentes simulan mejora | provider | medium | hash de celda e inputs salvo método | comparison mismatch |
| Shadow excede gasto | provider spend | medium | dry-run + request/USD cap + breaker | ledger/cap breach |
| Reader productivo ve shadow | API/MCP | low | canonical legacy hasta aprobación | effective method changed |
| Rebaseline reescribe historia | data | low | append-only + artefacto de decisión | update/delete rejected |
| Vercel y worker divergen | cross-runtime | medium | pausa + deploy coordinado + readback | configured/effective drift |
| Legacy deja de estar disponible en el corte confirmado | rollback | certain | pausa degradada + última serie coherente | legacy requested post-cutoff |
| Mejora GSC pero cambia top-N | reporting | high | Jaccard/order diff + breakpoint | membership discontinuity |

### Feature flags / cutover

- Reusar la policy y gates creados por `TASK-1805`; esta task no introduce un segundo selector.
- Evaluator permanece OFF excepto durante la ventana aprobada.
- Canonical method comienza en legacy explícito; staging y producción cambian por actos separados.
- Configuración debe coincidir en Vercel y ops-worker; la evidencia final combina payload explícito, fecha UTC,
  policy version y readback de la serie. El proveedor no devuelve `served`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | corregir preregistro antes de llamadas; ninguna mutación runtime | inmediato | sí |
| 1 | apagar evaluator/cerrar allowlist; conservar evidencia y costo | inmediato | sí |
| 2 | decisión no-go y canonical legacy sin borrar resultados | inmediato | sí |
| 3 | selector legacy pre-corte o pausa degradada; readback completo | minutos | sólo pre-corte |
| 4 | pausa de capturas; servir última serie coherente | minutos | no revierte proveedor post-corte |

### Production verification sequence

1. Verificar foundation, contrato y precios vigentes.
2. Revisar dry-run/forecast y registrar aprobación de shadow.
3. Ejecutar cohorte bounded y reconciliar costo real contra ledger.
4. Aprobar go/no-go y tratamiento histórico en un acto separado.
5. Pausar schedules; cutover y rollback pre-corte en staging con canary por camino consumidor.
6. Cutover productivo coordinado y readback DB/API/MCP de ambos runtimes.
7. Reanudar schedules, observar cooldown y verificar que no existen series mixtas.

### Out-of-band coordination required

- Respuesta/ticket DataForSEO o documentación pública equivalente.
- Aprobación del presupuesto, máximo de requests, sujetos y ventana del shadow.
- Aprobación del rebaseline/breakpoint y del cutover productivo.
- Coordinación de Cloud Scheduler, Vercel y ops-worker.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## MCP Tools & Skills Contract

Esta task incluye como entregable obligatorio la capa de uso por agentes; no se considera completa con el
primitive, reader, API o documentación humana solamente.

- [ ] Crear o actualizar las tools MCP necesarias para operar/leer esta capacidad desde el mismo primitive
  canónico. Si una tool existente cubre el caso, actualizarla sin duplicarla; si no corresponde una tool nueva,
  declarar las tools afectadas y la razón de exclusión explícita en el gateway.
- [ ] Crear o actualizar la guía de uso en las skills dueñas `.codex/skills/dataforseo-operator/**` y
  `.codex/skills/seo-aeo/**`, junto con sus espejos `.claude/**`, incluyendo selección de tool, inputs,
  interpretación, metodología/provenance, costos, límites, errores y acciones prohibidas.
- [ ] Mantener las copias Codex/Claude byte-idénticas y actualizar también el recurso/manual agent-facing que el MCP
  entrega bajo demanda (registro de skills servidas de `TASK-1804`, ya en producción: `src/mcp/greenhouse/skill-manifest.ts`
  + `docs/mcp/skills/seo-visibility-reading`, `seo-spend-discipline`, `seo-prospect-diagnostic`; gate `pnpm mcp:skills:check`).
  No crear una skill por endpoint si la skill de dominio vigente puede ampliarse de forma clara.
- [ ] Actualizar en el mismo PR el lane ecosystem, `src/mcp/greenhouse/tool-manifest.ts`, su artefacto generado,
  schema/annotations/descripción y la federación del gateway; toda tool interna queda federada o excluida con una
  razón sustantiva, nunca simplemente ausente.
- [ ] Las tools read sólo leen evidencia persistida y no disparan llamadas pagadas on-read. Toda tool que escriba,
  compre o comprometa gasto usa capability fina, presupuesto, idempotencia, audit y
  `propose → confirm → execute`; nunca se agrega un write scope al cliente PKCE público compartido.
- [ ] Verificar `pnpm mcp:manifest:generate && pnpm mcp:manifest:check`, `pnpm skills:mirrors`, paridad
  bidireccional del gateway y canaries allow/deny/fault. Registro o compilación sin readback de la lane y del
  gateway no constituye cierre operativo.


## Acceptance Criteria

- [x] `TASK-1805` está completa y legacy explícito está verificado en DB/API/MCP, Vercel y ops-worker. *(2026-09-03: DB + lanes prod + `/health` worker + env de la revisión activa; MCP vía manifest sincronizado del release, sin login Entra interactivo en esta sesión.)*
- [x] Matriz oficial de 14 familias, campos, booleano, pricing, históricos y clickstream está incorporada; Sandbox y
  docs públicas pendientes están declaradas sin convertirlas en bloqueo ficticio. *(`families.ts` + preregistro §3.)*
- [x] Cohorte, inputs, métricas, umbrales, request cap y USD cap quedaron congelados antes del shadow. *(preregistro 2026-09-03 §4–§5; aprobación del operador pendiente.)*
- [x] Ninguna llamada pagada ocurrió antes de la aprobación explícita registrada. *(vigente al 2026-09-03: gate OFF, ledger intacto; se re-verifica al cerrar.)*
- [ ] Cada endpoint compatible fue evaluado con inputs equivalentes o marcado honestamente como no comparable.
- [ ] GSC se evaluó como benchmark separado, sin promedio ni sustitución de ETV.
- [ ] Se midieron valores, orden, membresía top-N, traffic cost, prospect traffic, nulls, latencia y costo.
- [ ] AIO ETV se interpreta como atribución modelada y clickstream permanece separado del experimento improved.
- [ ] La decisión go/no-go y el tratamiento histórico están respaldados por un artefacto reproducible.
- [ ] Ningún reader/API/MCP sirvió shadow ni una serie mixta antes del cutover aprobado.
- [ ] Cutover staging, rollback pre-corte y safe mode post-corte fueron verificados antes de producción.
- [ ] Vercel y ops-worker demuestran el mismo método configured/requested/provider-effective mediante evidencia.
- [ ] Cero request legacy se envía desde el corte y todo punto improved pre-julio declara aproximación calibrada.
- [ ] Todos los consumers DataForSEO Labs compatibles sirven improved o tienen una excepción contractual explícita.
- [ ] DB, API, Nexa, MCP y reporting declaran método y breakpoint/rebaseline aplicados.
- [ ] Rollback conserva evidencia append-only y no fabrica continuidad histórica.
- [ ] Task, epic, registry, runbook, auditoría, skills y handoff reflejan gasto, deploy y runtime por separado.

## Verification

- `pnpm task:lint --task TASK-1806`
- Tests/dry-run del evaluator con fixtures legacy/improved y equivalencia de inputs.
- Reconciliación de forecast versus ledger de gasto real.
- Sanity PG/readers para separación metodológica, canonical selection y mixed-series failure.
- Contract tests de API/ecosystem y snapshots MCP.
- `pnpm mcp:manifest:check`
- `pnpm test:live` sólo con acceso base y autorización correspondiente; confirmar `passed`.
- Readback de configuración y método efectivo derivado en Vercel y ops-worker.
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental.

## Closing Protocol

- [ ] `Lifecycle` y `Status real` coinciden con evaluación, cutover y evidencia runtime.
- [ ] El archivo está en la carpeta de lifecycle correcta y registry/README/EPIC-022 están sincronizados.
- [ ] El artefacto de decisión declara cohorte, período, inputs, costos, resultados, límites y sign-offs.
- [ ] Runbook y auditoría distinguen shadow, staging, producción y rollback.
- [ ] Skills espejadas reflejan la respuesta contractual y el comportamiento verificado del proveedor.
- [ ] Handoff/changelog separan código, gasto, configuración, deploy y readback.
- [ ] El cierre no se basa en un flag, deploy o HTTP verde: demuestra el método efectivo derivado en todos los consumers.

## Follow-ups

- Crear task `ui-ux` sólo si breakpoint/metodología requieren una superficie visible más allá de metadata/copy.
- Reevaluar una metodología futura únicamente ante versión o cambio oficial nuevo; no ampliar enums preventivamente.
