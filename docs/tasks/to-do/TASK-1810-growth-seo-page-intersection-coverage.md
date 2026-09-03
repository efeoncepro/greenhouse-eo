# TASK-1810 — Growth SEO: cobertura comparativa entre paginas con Page Intersection

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|data|integration`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Incorpora `dataforseo_labs/google/page_intersection/live` como captura pagada y acotada para comparar dos
paginas y persistir su cobertura compartida y sus huecos por keyword. Entrega un reader generico page-pair,
formula-aware y sin llamadas al proveedor durante la lectura, con paridad API/MCP para que `TASK-1314` pueda
componer evidencia de pillar pages sin adueñarse de la captura.

La task no habilita el endpoint por anticipado. Implementacion, llamadas pagadas, migracion, deploy y rollout
requieren sus gates normales y sólo comienzan cuando `TASK-1805`, `TASK-1806` y `TASK-1776` esten completas.

## Why This Task Exists

`TASK-1776` describe una pagina mediante `ranked_keywords`, `relevant_pages` y `subdomains`, pero dejo
`page_intersection` explicitamente fuera de alcance porque comparar dos paginas es otro sujeto y otro ciclo de
vida. `TASK-1314` necesita esa comparacion para responder si una pillar propia cubre el tema frente a una pillar
competidora, pero su contrato dice que compone readers y ejecuta cero captura nueva.

DataForSEO confirmo ademas que Page Intersection es ETV-capable. Habilitarlo sin esta unidad mezclaría una nueva
capacidad de producto con el cutover transversal de `TASK-1805/1806`, o permitiría persistir ETV sin metodologia
explicita. Esta task abre el caller sólo para su producto, después de la foundation y del cutover, y conserva la
separacion entre captura, persistencia y lectura.

## Goal

- Capturar Page Intersection para un par de paginas normalizado, mercado e idioma gobernados y presupuesto
  aprobado, usando Improved ETV de forma explicita.
- Persistir hechos append-only con metodologia, provenance, fecha y pertenencia de keyword suficientes para
  derivar cobertura compartida y gap sin recomprar datos on-read.
- Exponer un reader canónico page-pair y el mismo contrato por API ecosystem y MCP en el mismo PR.
- Entregar a `TASK-1314` evidencia reusable; no calcular topical authority ni crear un score alternativo.

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
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- El sujeto es un par ordenado `pagina primaria -> pagina comparada`; normalizar URLs no borra sus roles.
- La captura pagada vive en un command separado. Ningun reader, route, tool MCP o consumer visible llama al
  proveedor para completar una lectura.
- Improved ETV se solicita explicitamente; metodologia forma parte de identidad, frescura y proyeccion.
- El proveedor no devuelve formula version: el metodo efectivo se deriva del request, instante UTC y policy
  versionada entregada por `TASK-1805/1806`, nunca sólo de la fecha.
- GSC y otros hechos first-party permanecen separados; no se promedian con ETV.
- La salida contiene hechos y gap explicable. `TASK-1700` sigue siendo la única autoridad de prioridad y
  `TASK-1314` la autoridad de topical authority.
- Todo reader nuevo se expone por API/MCP en el mismo PR y mantiene entitlement por organizacion.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/complete/TASK-1776-growth-seo-url-subdomain-subfolder-visibility.md`
- `docs/tasks/to-do/TASK-1805-growth-seo-dataforseo-improved-etv-versioned-transition.md`
- `docs/tasks/to-do/TASK-1806-growth-seo-dataforseo-improved-etv-evaluation-cutover.md`
- `docs/tasks/to-do/TASK-1314-growth-seo-pillar-cluster-health-topical-authority.md`
- `docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md`
- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `.codex/skills/seo-aeo/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1805` — policy, schema/provenance y guards formula-aware desplegados.
- `TASK-1806` — Improved ETV canónico y cutover verificado; esta task no abre un nuevo camino legacy.
- `TASK-1776` — normalizacion/resolucion de sujetos URL y contrato de visibilidad por pagina.
- `src/lib/ai/dataforseo.ts` — transporte, breaker y spend ledger existentes.
- `enforceSeoRunEntitlement` — chokepoint de entitlement y presupuesto de Growth SEO.

### Blocks / Impacts

- `TASK-1314` puede consumir `readPageIntersectionCoverage` como evidencia comparativa de pillar pages sin
  agregar provider calls ni persistencia propia.
- API ecosystem Growth SEO, manifiesto MCP y gateway consumidor de la nueva lectura.
- Spend ledger, Platform Health y operabilidad de DataForSEO Labs para un endpoint nuevo.

### Files owned

- `src/lib/growth/seo/page-intersection/**`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- `src/mcp/greenhouse/tool-manifest.ts`
- `src/mcp/greenhouse/tool-manifest.generated.json`
- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/tools.ts`
- `services/ops-worker/server.ts` sólo si Plan Mode confirma ejecucion async necesaria.
- `src/types/db.d.ts` sólo mediante generacion canónica.
- `migrations/*_task-1810-*.sql`
- `docs/manual-de-uso/growth/operar-comparacion-page-intersection-seo.md`

## Current Repo State

### Already exists

- `TASK-1776` entrega resolver de sujeto URL y snapshots de visibilidad por pagina.
- DataForSEO Labs ya usa transporte allowlisted, circuit breaker, entitlement y spend ledger.
- `TASK-1805/1806` definen la identidad metodologica y el cutover obligatorio de Improved ETV.
- El lane ecosystem y el manifiesto MCP Growth SEO tienen patrones canónicos para readers nuevos.
- `TASK-1314` declara Page Intersection como follow-up para comparar dos pillar pages y conserva cero captura.

### Gap

- No existe caller de `page_intersection`, ni command de captura, ni persistencia page-pair.
- No existe reader que distinga keywords compartidas, exclusivas de la pagina primaria y exclusivas de la
  pagina comparada sobre una captura coherente.
- No hay freshness/idempotencia por par, mercado, periodo y metodologia.
- `TASK-1314` no puede obtener esta evidencia sin violar su boundary de composicion.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/page-intersection/**`, con captura server-only y API/MCP como adapters.
- Future candidate home: `domain-package`
- Boundary: `capturePageIntersectionCoverage` compra y persiste; `readPageIntersectionCoverage` sólo lee hechos
  persistidos; API, MCP y `TASK-1314` son consumers autorizados.
- Server/browser split: provider, DB, entitlement, gasto y policy ETV son server-only; DTO del reader no importa
  stores, secretos ni SDKs y puede cruzar adapters.
- Build impact: sin SDK nuevo; si la captura excede el presupuesto request-response se monta en el ops-worker
  existente, sin crear un runtime adicional.
- Extraction blocker: PostgreSQL y spend ledger compartidos, entitlement por organizacion y provider externo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: nuevo hecho append-only de Page Intersection bajo `greenhouse_growth`.
- Consumidores afectados: `API|MCP|worker|TASK-1314`
- Runtime target: `local|staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/seo/url-visibility/**`,
  `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md` y lane ecosystem Growth SEO.
- Contrato nuevo o modificado: `capturePageIntersectionCoverage(input)` y
  `readPageIntersectionCoverage(input)`, schema/DTO page-pair y tool MCP read-only.
- Backward compatibility: `compatible` — capacidad aditiva, deshabilitada hasta rollout explícito.
- Full API parity: el command y reader viven en el dominio; routes y MCP delegan en ellos. Ningun adapter
  consulta tablas ni construye gap por su cuenta.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_page_intersection_runs` y
  `greenhouse_growth.seo_page_intersection_facts`, o nombres equivalentes aprobados en Plan Mode.
- Invariantes que no se pueden romper:
  - Un run identifica organizacion/target, pagina primaria, pagina comparada, mercado, idioma, periodo,
    request hash, captura UTC y metodologia ETV.
  - Las URLs se normalizan con el resolver de `TASK-1776`, pero los roles primaria/comparada no se ordenan
    lexicograficamente ni se intercambian en silencio.
  - Hecho ausente, valor `NULL` declarado por proveedor y valor `0` son estados diferentes.
  - ETV legacy e Improved nunca comparten identidad, frescura ni una serie servida.
  - El reader sólo sirve runs terminados y coherentes; un run parcial se etiqueta/degrada, no se rellena con
    otra fecha o metodologia.
- Write-target allowlist: declarar las tablas nuevas en el boundary allowlist de Growth SEO donde exista, en el
  mismo PR, con justificacion de que son hechos provider-facing del dominio.
- Tenant/space boundary: `organization_id` y target se derivan server-side desde session/ecosystem binding y
  `enforceSeoRunEntitlement`; el caller no puede elegir otra organizacion.
- Idempotency/concurrency: clave por target + par con roles + mercado + idioma + periodo + metodologia + request
  hash; una captura concurrente equivalente converge en el mismo run y nunca duplica gasto sin autorizacion.
- Audit/outbox/history: runs y facts append-only, costo atribuido por el transporte al spend ledger y señal de
  cobertura/error sin payload sensible.

### Migration, backfill and rollout

- Migration posture: `additive`.
- Default state: `disabled`; endpoint fuera del allowlist ejecutable hasta que schema, command, reader y gates
  estén desplegados y verificados.
- Backfill plan: `none` — no recomprar historia ni sintetizar Page Intersection; la serie comienza con la primera
  captura aprobada.
- Rollback path: deshabilitar el endpoint/command, pausar cualquier worker consumidor y revertir adapters; hechos
  append-only permanecen etiquetados y fuera del reader canónico si el rollout se revierte.
- External coordination: aprobacion explícita de cantidad de pares, requests y tope USD antes de smoke o apply;
  deploy y habilitacion productiva son autorizaciones separadas.

### Security and access

- Auth/access gate: session/capability de Growth SEO o ecosystem binding, más `enforceSeoRunEntitlement` para
  toda captura pagada.
- Sensitive data posture: sin PII; URLs y keywords siguen siendo datos de cliente y no cruzan tenant ni aparecen
  completas en logs/señales.
- Error contract: errores canónicos `invalid_page_pair`, `no_access`, `cost_blocked`, `provider_unavailable`,
  `capture_incomplete`, `no_data` y `mixed_methodology`; nunca raw errors del proveedor.
- Abuse/rate-limit posture: límite de pares y filas, preview de costo, USD cap, rate limit por actor/organizacion,
  replay guard, breaker DataForSEO y timeout bounded.

### Runtime evidence

- Local checks: tests de normalizacion con roles, request payload Improved explícito, parser, derivacion del gap,
  idempotencia, mixed-methodology fail y prohibicion de provider call on-read.
- DB/runtime checks: migration verify, constraints/append-only, grants, UNIQUE formula-aware y readback de un run
  fixture completo y uno parcial.
- Integration checks: dry-run sin gasto; después de aprobacion, un smoke allowlisted en staging con forecast y
  delta exacto del spend ledger.
- Reliability signals/logs: `seo.page_intersection.capture_lag`, `seo.page_intersection.coverage` y drift de
  configured/requested/effective ETV reutilizado desde `TASK-1805`.
- Production verification sequence: migration -> deploy disabled -> dry-run -> smoke staging aprobado -> DB y
  API/MCP readback -> habilitacion productiva allowlisted -> cooldown y señales.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificacion en el allowlist de destinos de escritura del dominio
  donde exista, en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Errores, logs y señales no exponen secretos, payloads completos ni datos cross-tenant.

## Capability Definition of Done — Full API Parity gate

- [ ] La captura y lectura viven en primitives de `src/lib/growth/seo/page-intersection/**`, no en routes, MCP ni
  componentes.
- [ ] El aggregate page-pair y sus hechos son la única fuente para la lectura; no existe query/adaptacion paralela
  por consumer.
- [ ] El command pagado tiene authorization fina, idempotencia, spend audit, breaker y errores sanitizados.
- [ ] La lectura se expone por el lane ecosystem y una tool MCP read-only en el mismo PR.
- [ ] El manifiesto MCP, artefacto generado, server, client/gateway consumidor y pruebas de paridad quedan
  sincronizados según el contrato vigente.
- [ ] `TASK-1314` consume el reader o queda explícitamente preparada para hacerlo; nunca llama DataForSEO.

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

### Slice 1 — Contrato page-pair y migracion append-only

- Definir inputs/DTOs, roles de pagina, normalizacion reusable, estados del run y errores canónicos.
- Crear runs/facts append-only con constraints, grants, idempotencia y metodologia ETV en la identidad.
- Regenerar tipos por el camino canónico y registrar write targets permitidos.

### Slice 2 — Command de captura gobernada

- Construir el payload de `page_intersection` con mercado/idioma derivados, limites explícitos y
  `use_improved_etv: true` mediante la policy endpoint-aware.
- Aplicar entitlement, freshness, preview/tope de costo, breaker, replay guard y persistencia transaccional de
  run + facts.
- Separar resultado completo, parcial, sin datos y error; ningún fallo deja un run incompleto como canónico.

### Slice 3 — Reader de cobertura y gap

- Implementar `readPageIntersectionCoverage` exclusivamente sobre hechos persistidos.
- Proyectar keywords compartidas, primaria-only y comparada-only, posiciones/URLs y ETV formula-aware cuando el
  endpoint los entregue, con provenance y cobertura.
- Rechazar mezcla de fecha/metodologia y no rellenar ausencias con otro run.

### Slice 4 — API/MCP, señales y operacion

- Exponer el reader por el lane ecosystem Growth SEO y por MCP read-only en el mismo PR.
- Sincronizar manifest/gateway y pruebas de capability/access/paridad.
- Exponer señales de captura/cobertura y documentar dry-run, habilitacion, verificacion y rollback.

## Out of Scope

- Modificar `TASK-1805/1806`, ejecutar shadow legacy/improved o reabrir el cutover ETV.
- Llamar al proveedor desde el reader, API GET, MCP read tool o `TASK-1314`.
- Construir topical authority, score, prioridad o recomendaciones editoriales; son autoridades de
  `TASK-1314` y `TASK-1700`.
- Crear o modificar UI. Una comparacion visible requiere task `ui-ux` separada y consumer real.
- Habilitar Bing preventivamente; V1 usa Google y una expansion Bing US/en requiere consumer y evidencia propios.
- Comprar historia, programar un cron recurrente o capturar todos los pares de una organizacion.
- Activar clickstream, combinar `clickstream_etv` con `etv` o derivar una formula propia.

## Detailed Spec

El command recibe un target gobernado, `primaryUrl`, `comparisonUrl`, periodo/filtros soportados y límites
acotados. Resuelve organizacion, mercado e idioma server-side, normaliza cada URL con el contrato de `TASK-1776`
y conserva el orden semántico. Antes de llamar, consulta frescura por la identidad completa formula-aware,
calcula el máximo de gasto y pasa entitlement/spend fence. El payload solicita Improved ETV explicitamente; el
transporte permanece neutral.

La persistencia separa el lifecycle del run de sus facts. Cada fact conserva al menos keyword normalizada,
keyword visible, pertenencia respecto de la primaria/comparada, posiciones/URLs disponibles, campos ETV
consumidos, source endpoint, captured/requested timestamps, policy version, requested/effective methodology,
request hash y coverage/truncation. La forma final se valida contra el payload real antes de congelar schema; no
se inventa un campo que el proveedor no entregue.

El reader elige un único run completo por identidad y metodologia canónica. Produce tres conjuntos explícitos
—compartidas, sólo primaria, sólo comparada— y provenance suficiente para que `TASK-1314` componga una señal de
pillar gap. Si el endpoint no devuelve por sí solo los tres lados, el command puede ejecutar únicamente la
combinacion mínima aprobada y persistir la procedencia de cada fila; nunca hace requests ocultos durante la
lectura.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1805 complete + TASK-1806 complete + TASK-1776 complete` -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Schema, grants y uniqueness formula-aware MUST estar verificados antes de cualquier llamada pagada.
- Dry-run, cantidad de pares/requests y USD cap MUST recibir aprobacion antes del primer smoke provider-facing.
- El reader y API/MCP MUST permanecer sobre fixtures o `disabled` hasta que exista un run completo verificado.
- No se habilita un consumer recurrente ni se reanuda nada automaticamente al cerrar la task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicar costo por el mismo par o invertir roles | integration | medium | identidad con roles + request hash, freshness y lock/idempotencia | delta inesperado en spend ledger |
| Mezclar ETV legacy/improved bajo el mismo run | migration/data | medium | metodologia en UNIQUE, payload Improved explícito y reader fail-closed | drift ETV o `mixed_methodology` |
| Servir gap desde una captura parcial/truncada | API/MCP | medium | lifecycle de run, coverage/truncation y sólo runs completos canónicos | `seo.page_intersection.coverage` |
| Fuga cross-tenant por URLs arbitrarias | access | medium | target/mercado derivados server-side, entitlement y validacion de sujeto | `no_access`/scope mismatch |
| Convertir lectura en gasto por conveniencia | integration | low | test que prohíbe provider import/call desde reader y adapters GET/MCP | provider call asociada a read request |
| Volumen o latencia excede request-response | worker | medium | limites bounded y ops-worker existente si Plan Mode lo confirma | timeout, breaker o run incompleto |

### Feature flags / cutover

- El endpoint nace deshabilitado y fuera del allowlist ejecutable. Plan Mode debe elegir una guarda canónica
  compartida por Vercel/worker o demostrar que el command operator-only ya queda fail-closed sin flag nuevo.
- Improved ETV es obligatorio y explícito; no existe fallback legacy para esta capacidad post-cutover.
- El reader puede desplegarse antes sin datos y responder `no_data`; la habilitacion del command ocurre sólo tras
  smoke aprobado y readback de DB/API/MCP.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir consumidores de schema; conservar tablas aditivas sin writers o aplicar reverse migration sólo si están vacias | <15 min | si, mientras no haya facts; parcial después |
| Slice 2 | deshabilitar command/allowlist y revertir adapter; conservar runs append-only etiquetados | <10 min | si para comportamiento |
| Slice 3 | revertir reader al estado `no_data`; facts permanecen sin servir | <10 min | si |
| Slice 4 | retirar lane/tool por revert coordinado de manifest/server/gateway y mantener captura deshabilitada | <15 min | si |

### Production verification sequence

1. Ejecutar migracion en staging y verificar tablas, constraints, grants, append-only y UNIQUE formula-aware.
2. Desplegar con captura deshabilitada; verificar que lectura autorizada responde `no_data` y deny conserva
   anti-oracle.
3. Ejecutar dry-run sobre un par allowlisted y validar request count, límite de filas y USD cap.
4. Con aprobacion de gasto, capturar un par en staging; verificar request Improved explícito, run completo y delta
   exacto del spend ledger.
5. Leer el mismo run por primitive, API y MCP; comparar identidad, conjuntos, provenance y ausencia de llamadas
   adicionales al proveedor.
6. Repetir migracion/deploy disabled en produccion; habilitar sólo el par/caller aprobado y repetir readback.
7. Observar señales, errores y costo durante el cooldown definido en Plan Mode; detener el rollout ante drift.

### Out-of-band coordination required

- Aprobacion humana de sujetos, request cap y USD cap para staging y produccion por separado.
- Aprobacion explícita de deploy y habilitacion productiva; no se derivan de aprobar la task.
- No requiere secret nuevo ni cambio de cuenta DataForSEO salvo que el preflight runtime lo demuestre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un command canónico de captura page-pair con roles estables, mercado/idioma derivados,
  entitlement, preview/tope de gasto, idempotencia y breaker.
- [ ] Todo request provider-facing usa `page_intersection` Google con `use_improved_etv: true`; el transporte
  generico no recibe un default global y clickstream permanece independiente/deshabilitado.
- [ ] Runs y facts son append-only, tenant-scoped y formula-aware; metodologia, policy, endpoint, timestamps,
  request hash, coverage y truncation participan del contrato y de la frescura.
- [ ] `readPageIntersectionCoverage` sirve sólo hechos persistidos de un run completo y una metodologia, distingue
  compartidas/primaria-only/comparada-only y no ejecuta ninguna llamada al proveedor.
- [ ] Ausencia, `NULL`, cero, captura parcial y mixed methodology permanecen estados distintos y verificables.
- [ ] El reader está expuesto por API ecosystem y MCP en el mismo PR, con acceso fail-closed, manifest/gateway
  sincronizados y pruebas de paridad.
- [ ] `TASK-1314` puede consumir el reader sin importar provider/DB ni adquirir ownership de captura.
- [ ] Un smoke pagado no ocurre sin dry-run, allowlist, request cap y USD cap aprobados; el costo observado
  coincide con el ledger y no hay segunda compra al repetir la lectura.
- [ ] Rollback conductual se ejercita antes del rollout productivo y conserva hechos append-only fuera de la
  proyeccion canónica.
- [ ] Manual operativo y señales documentan habilitacion, `no_data`, captura parcial, costo y recuperacion.

## Verification

- `pnpm task:lint --task TASK-1810`
- `pnpm lint`
- `pnpm tsc --noEmit`
- tests focales de `src/lib/growth/seo/page-intersection/**`
- tests de boundary, API ecosystem y MCP manifest/paridad
- migration verify y consultas read-only de constraints, grants, runs/facts y spend ledger
- dry-run sin proveedor; smoke staging/productivo sólo con aprobaciones explícitas
- `pnpm mcp:manifest:check`
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al
  cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] Se ejecuto chequeo de impacto cruzado sobre `TASK-1314`, `TASK-1776`, `TASK-1805/1806` y EPIC-022.
- [ ] `pnpm task:lint --task TASK-1810`, `pnpm docs:closure-check` y el gate de contexto final quedaron verdes en
  el orden canónico.
- [ ] Estado de migracion, deploy, flag/allowlist, gasto, smoke y runtime se reportó por separado.

## Follow-ups

- Task `ui-ux` separada para una comparacion visible de paginas sólo cuando exista un consumer y flujo aprobado.
- Integracion efectiva dentro del score/diagnostico de `TASK-1314`, preservando su autoridad y versionado.
- Variante Bing US/en sólo ante demanda real, compatibilidad verificada y presupuesto propio.

## Open Questions

- Plan Mode debe verificar el shape real y los modos de interseccion del endpoint antes de congelar schema y
  determinar si un único request produce los tres conjuntos o si se necesita una combinacion bounded.
- Confirmar si la captura cabe en request-response bajo los límites aprobados o si debe ejecutarse en el
  ops-worker existente; el reader no cambia en ninguno de los dos casos.
