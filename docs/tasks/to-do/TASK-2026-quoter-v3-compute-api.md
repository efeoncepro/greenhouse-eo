# TASK-2026 — Quoter V3 compute API: catalog reads, simulation and readings

## Delta 2026-10-12

- `TASK-2024` cerró: deja de bloquear. Existe `PricingV3Storage` y la resolución de «lo vigente» sobre el puerto
  (`createCurrentSourceResolver`, `readCurrentVersions`, `verifyPointedSources` en
  `src/lib/finance/pricing-v3/storage/sources.ts`), reutilizable tal cual por un servidor.
  [Contrato](../../architecture/GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md).
- Lo que sigue en `scripts/commercial/pricing-v3.ts` y esta task debe mover al motor: el formateador de salida
  (`json`), el armado del cuerpo de cada respuesta y la clasificación de errores (`classify`, `schemaIssue`).
- Dato medido para el contrato de respuesta: las 106 salidas JSON de la línea base se leen idénticas después de
  `JSON.parse` e impresión, así que pueden viajar como objeto. Viajan como texto el artefacto, la vista previa en
  markdown de `compose preview` y los borradores de `export`.

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
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|finance`
- Blocked by: `TASK-2025`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fase 3 de EPIC-053. Expone por los dos carriles de la API de plataforma (`app` y `ecosystem`) cada operación del
cotizador V3 que calcula o lee **sin guardar una cotización**: buscar y mostrar catálogo, inspeccionar recursos,
esqueleto, plan, dimensionamiento, preparar, simular y las lecturas de un artefacto congelado. Cada ruta es un
adaptador fino sobre la misma función que usa la CLI local: mismo documento de entrada, mismo documento de salida y
una sola tabla que traduce códigos de salida y errores tipados. Nace detrás de una bandera apagada.

## Why This Task Exists

`pnpm pricing:v3` sólo corre en una máquina con el repo: ningún consumidor remoto (la CLI en modo plataforma de
TASK-2028, las herramientas MCP de TASK-2030, una interfaz futura) puede calcular con el motor V3. La decisión
aceptada el 2026-10-12 ordena API → CLI sobre la API → MCP → interfaz y exige que ambos caminos den la misma huella.
Sin una API de cálculo que reproduzca byte a byte lo que hace la CLI, la fase de registro (TASK-2027) no tiene con
qué recalcular en servidor y la CLI no tiene contra qué medir su paridad.

## Goal

- Diecinueve operaciones de cálculo y lectura disponibles en `/api/platform/app/quoter/**` y
  `/api/platform/ecosystem/quoter/**`, una por operación de la CLI, sin fórmulas ni proyecciones propias.
- Una tabla única, total sobre el registro cerrado de errores, que traduce códigos de salida y rechazos a estado HTTP
  y código de plataforma, compartida por los dos carriles y sin repetir jamás un valor recibido.
- Paridad medida en staging: cada ejemplo y artefacto congelado del corpus da por la API la misma huella y las mismas
  lecturas, byte a byte, que la CLI local.
- Identidad máquina propia para la CLI en el carril `ecosystem`, especificada como paso de runbook del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` — decisión aceptada; puntos 1, 3, 7, 8,
  9 y «Reglas duras» son el contrato de esta task.
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` — fase 3 y su puerta de salida.
- `docs/documentation/finance/cotizador-v3-promocion-canonica.md` — sección «Contratos locales que la adaptación debe
  conservar» (sigue vigente y obligatoria).
- `docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md` — códigos de salida `0/2/3/1`, errores
  tipados, `runNotices`.
- `docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md` — registro cerrado de
  motores y guarda de artefactos congelados.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — carriles, envelope, versionado, idempotencia.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — las cotizaciones son de Commercial.

Reglas obligatorias:

- **NUNCA** calcular fuera de `src/lib/finance/pricing-v3/**`. La ruta y su adaptador no suman, no redondean, no
  filtran y no arman un resumen: llaman a la función que ya usa la CLI y devuelven su documento.
- **NUNCA** copiar código del motor ni de `scripts/commercial/pricing-v3.ts`: se importa. Lo que hoy sólo vive en el
  script se mueve al motor (ver Slice 1), no se duplica.
- **NUNCA** aceptar de quien llama un catálogo, una política, un catálogo de créditos, un piso, un costo, una
  organización ni un estado. Las fuentes salen del puntero activo en la base o de una versión fijada por huella que la
  base ya tiene.
- **NUNCA** una segunda proyección para el cliente: lo único apto para cliente sale de `clientSafePeriodItems`
  (`src/lib/finance/pricing-v3/resources/readiness.ts`), que ya alimenta `compose preview` y `compose document`.
- **NUNCA** persistir en esta task: ni cotización, ni artefacto, ni `runNotices`, ni lecturas derivadas.
- **NUNCA** repetir en un error un valor, una ruta de archivo o un mensaje de validador: sólo `code`, `option`,
  `allowed` e `issues` (`path`, `rule`, `limit`, `allowed`, `expected`), igual que el reporte de la CLI.
- **NUNCA** ampliar `PRICING_V3_DOMAIN_ERROR_CODES` ni `PRICING_V3_ADAPTER_ERROR_CODES` para acomodar el transporte.
- **NUNCA** fecha de inicio ni duración de contrato en un pedido; **NUNCA** la nómina como base de costo.
- **SIEMPRE** que la entrega toque el motor o su entorno: `pnpm pricing:v3:test` en verde y los artefactos congelados
  del repo recalculados idénticos.
- Los nombres de rutas, tablas y capacidades de este documento son la familia única de EPIC-053: tablas `quoter_*` en
  `greenhouse_commercial`, rutas `/api/platform/{app,ecosystem}/quoter/**`, código con estado en
  `src/lib/commercial/quoter/**`. Son propuestas hasta materializarse; nada de esto está implementado.

## Normative Docs

- `docs/audits/commercial/2026-10-12-cotizador-actual-auditoria.md` — por qué V3 no entra debajo del cotizador actual.
- `docs/documentation/finance/cotizador-v3-contrato-y-validacion.md` y
  `docs/documentation/finance/cotizador-v3-superficie-implementada.md` — contrato de cada operación de la CLI.
- `docs/manual-de-uso/finance/cotizar-v3-por-cli.md`, `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md`.
- `.claude/skills/efeonce-pricing-operator/SKILL.md` y `references/cotizador-v3-agent-workflow.md`.
- `docs/tasks/complete/TASK-1845-efeonce-insights-domain-evidence-and-module-adapters.md` y
  `docs/tasks/complete/TASK-1846-efeonce-insights-durable-artifact-rendering.md` — precedente de dos carriles nacidos
  antes de una interfaz.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`,
  `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `.claude/skills/greenhouse-backend/SKILL.md` y `.claude/skills/efeonce-pricing-operator/SKILL.md` se cargan antes
  de escribir código.

## Dependencies & Impact

### Depends on

- `TASK-2024` (`docs/tasks/complete/TASK-2024-pricing-v3-storage-port.md`) — puerto de almacenamiento y motor ejecutable
  sin acceso a disco. Esta task necesita que cada operación reciba sus fuentes por el puerto y no por una ruta.
- `TASK-2025` (`docs/tasks/to-do/TASK-2025-quoter-v3-database-foundation.md`) — tablas `quoter_*` del catálogo por
  huella y del puntero, adaptador PostgreSQL del puerto, capacidades con su permiso otorgado, importador repo → base.
- Corpus del exit gate ya importado: las versiones de catálogo, política y créditos que nombran los artefactos de
  `data/pricing/v3-operating/` deben existir en la base por huella. Si el importador de TASK-2025 cargó sólo las
  vigentes, importar las históricas es un acto del operador con ese importador y condición previa de la puerta de
  salida; no es trabajo de esta task.
- Harnesses existentes: `src/lib/api-platform/core/app-auth.ts` (`runAppReadRoute`),
  `src/lib/api-platform/core/ecosystem-auth.ts` (`runEcosystemReadRoute`), `src/lib/api-platform/core/errors.ts`,
  `src/lib/api-platform/core/responses.ts`, `src/lib/api-platform/core/versioning.ts`.
- `src/lib/entitlements/runtime.ts` (`can`) y `src/lib/commercial/party/route-entitlement-subject.ts`.

### Blocks / Impacts

- `TASK-2027` — reutiliza la tabla de errores, los resolvedores de alcance y la resolución de versiones.
- `TASK-2028` — la capa de transporte de la CLI consume estas rutas y esta tabla; absorbe el arnés de paridad.
- `TASK-2030` — las herramientas MCP de lectura y simulación resuelven contra el carril `ecosystem` de esta task.
- No toca `src/app/api/platform/{app,ecosystem}/quotation/**` (simulación del motor V2) ni
  `src/lib/api-platform/resources/{app,ecosystem}-quotation.ts`: siguen sirviendo hasta su retiro.
- No editar los archivos de TASK-2023, TASK-2024, TASK-2025, TASK-2028, TASK-2029 ni TASK-2030.

### Files owned

- `src/lib/commercial/quoter/compute/**` (nuevo propuesto: resolución de versiones y orquestación por operación)
- `src/lib/commercial/quoter/flags.ts` (nuevo propuesto; TASK-2027 le agrega su bandera)
- `src/lib/commercial/quoter/authz.ts` (la puerta única nace en TASK-2025; esta task le agrega dos necesidades)
- `src/lib/api-platform/resources/quoter-errors.ts` (+ test)
- `src/lib/api-platform/resources/app-quoter-scope.ts`, `ecosystem-quoter-scope.ts`
- `src/lib/api-platform/resources/app-quoter-read.ts`, `ecosystem-quoter-read.ts`
- `src/lib/api-platform/resources/quoter-lanes.test.ts`, `quoter-read-boundary.test.ts`
- `src/app/api/platform/app/quoter/{catalog,resources,versions,compose,explain,replay}/**`
- `src/app/api/platform/ecosystem/quoter/{catalog,resources,versions,compose,explain,replay}/**`
- `src/lib/finance/pricing-v3/**` — sólo el traslado sin cambio de comportamiento descrito en el Slice 1
- `scripts/api-platform/provision-quoter-cli-consumer.ts` (nuevo propuesto; TASK-2028 lo reutiliza y no crea otro)
- `scripts/commercial/quoter-api-parity.ts` (nuevo propuesto; TASK-2028 lo absorbe)
- `docs/architecture/GREENHOUSE_QUOTER_V3_API_CONTRACT_V1.md` (nuevo propuesto)
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`, `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/documentation/finance/cotizador-v3-api-de-calculo.md` (nuevo propuesto)
- `docs/manual-de-uso/finance/operar-cotizador-v3-por-api.md` (nuevo propuesto)
- `docs/operations/runbooks/quoter-cli-consumer-provisioning.md` (nuevo propuesto)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila de `QUOTER_COMPUTE_API_ENABLED`)

## Current Repo State

### Already exists

- Motor puro: `src/lib/finance/pricing-v3/**` (31 archivos no test; sólo importa relativos, `decimal.js`, `zod` y
  `node:crypto`). Nada fuera de la carpeta lo importa salvo `scripts/commercial/pricing-v3.ts` y un test de documento.
- CLI: `scripts/commercial/pricing-v3.ts` (1.204 líneas). Concentra todo el acceso a disco, el despacho por comando,
  los códigos de salida y parte del armado de las salidas (`runNotices`, `freezeQuote`, clasificación de errores).
- Registro cerrado de errores: `src/lib/finance/pricing-v3/errors.ts` (49 de dominio, 15 de adaptador,
  `ADAPTER_FAILURE` para lo no clasificado). Una regla de ESLint prohíbe un `Error` desnudo en el módulo.
- Frontera hacia el cliente: `clientSafePeriodItems` y `projectCompositionPreview` en
  `src/lib/finance/pricing-v3/resources/readiness.ts`.
- Puntero local `data/pricing/v3-operating/current.json` (`pricing-v3-current/1`) y su verificación en
  `src/lib/finance/pricing-v3/adapters/current-versions.ts`.
- Corpus: 13 artefactos `pricing-v3-resource-composition/1` en `data/pricing/v3-operating/` con sus demandas, planes,
  briefs de documento y lecturas guardadas; 4 ejemplos (una demanda y un brief de documento cada uno) en
  `.claude/skills/efeonce-pricing-operator/references/examples/`.
- Precedente de dos carriles con tabla de errores compartida: `src/lib/api-platform/resources/insights-errors.ts`,
  `app-insights-scope.ts`, `ecosystem-insights-scope.ts`, `app-insights-read.ts`, `insights-lanes.test.ts`,
  `insights-read-boundary.test.ts`.
- Precedente de POST de sólo lectura sobre el harness de lectura:
  `src/app/api/platform/ecosystem/quotation/simulate/route.ts`.
- Precedente de aprovisionamiento de consumidor: `scripts/api-platform/provision-mcp-gateway-seo-consumer.ts`.
- Gate de alcanzabilidad: `scripts/ci/vercel-function-reachability-gate.mjs` (`pnpm vercel:reachability-gate`).

### Gap

- No existe ninguna ruta, adaptador ni tabla de traducción para V3. No existe `src/lib/commercial/quoter/`.
- El documento que imprime cada comando no siempre lo produce una función del motor: parte se arma dentro del script,
  que una ruta de Vercel no puede alcanzar.
- No hay consumidor ni binding para la CLI en el carril `ecosystem`; el único binding interno pertenece al gateway
  MCP y reutilizarlo mezclaría dos principales en la tabla de idempotencia y auditoría.
- No hay evidencia de que la API calcule igual que la CLI: la paridad está supuesta, no medida.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/commercial/quoter/compute/**` y adaptadores en `src/lib/api-platform/resources/**`, servidos por rutas de `src/app/api/platform/{app,ecosystem}/quoter/**` dentro del portal Next.js en Vercel
- Future candidate home: `remain-shared`
- Boundary: funciones de operación del motor `src/lib/finance/pricing-v3/**` como primitive único; consumidores autorizados son los adaptadores de plataforma de esta task, la CLI local y, más adelante, TASK-2027, TASK-2028 y TASK-2030
- Server/browser split: motor puro y apto para browser; resolución de versiones, autorización, adaptador PostgreSQL y bandera sólo en servidor con `server-only`; ningún componente de interfaz importa el agregado
- Build impact: sin dependencias nuevas; ninguna ruta alcanza `scripts/**`, `services/**`, `node:fs`, el puntero en archivo, Playwright ni el compositor de artefactos, verificado por `pnpm vercel:reachability-gate`
- Extraction blocker: la autorización y el contexto de identidad de los harnesses de la API de plataforma, y la instancia única de PostgreSQL que guarda el catálogo por huella

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: ninguno se modifica. Se leen el catálogo, la política y el catálogo de créditos por
  huella y el puntero activo (tablas `quoter_*` de TASK-2025) a través del puerto de TASK-2024.
- Consumidores afectados: CLI en modo plataforma (TASK-2028), MCP (TASK-2030), TASK-2027, interfaz futura. Ningún
  consumidor actual cambia.
- Runtime target: Vercel (staging primero, después producción). Ningún worker, cron ni Job.

### Contract surface

- Contrato existente a respetar: el de cada operación de `pnpm --silent pricing:v3` (bloque `operations` y sus
  bloques de contrato) y `docs/documentation/finance/cotizador-v3-contrato-y-validacion.md`; envelope y versión de
  `src/lib/api-platform/core/responses.ts` y `versioning.ts` (`x-greenhouse-api-version: 2026-04-25`).
- Contrato nuevo o modificado: las diecinueve operaciones de la tabla de Detailed Spec en ambos carriles;
  `quoter-errors.ts`; contrato `quoter-compute.v1` registrado en el OpenAPI.
- Backward compatibility: aditivo y detrás de bandera. Las rutas `quotation/**` del motor V2 no cambian.
- Full API parity: la CLI local, la CLI en modo plataforma, MCP y una interfaz futura consumen la misma función del
  motor; la ruta es un adaptador de 10 a 20 líneas.

### Data model and invariants

- Entidades/tablas/views afectadas: sólo lectura de `greenhouse_commercial.quoter_*` (catálogo por huella y puntero)
  definidas por TASK-2025. Esta task no crea tablas ni migraciones.
- Invariantes que no se pueden romper:
  - una operación calcula con las versiones que nombra el puntero activo o con las fijadas por huella, nunca con «la
    más alta» ni con un documento que traiga quien llama;
  - el puntero se verifica contra sus fuentes antes de calcular y no se sigue si no coincide;
  - el artefacto que devuelve una simulación es el mismo, byte a byte y por huella, que congela la CLI;
  - una simulación que no calcula no devuelve un artefacto con forma de cotización, salvo petición explícita y
    rotulada (equivalente de `--keep-blocked`);
  - toda lectura de un artefacto lo verifica antes por recálculo (`REPLAY_MISMATCH` si no reproduce su huella);
  - costo y margen nunca llegan a una audiencia cliente.
- Write-target allowlist: no aplica en esta task porque no escribe; si TASK-2025 creó un boundary test del dominio,
  un test de esta task comprueba que `src/lib/commercial/quoter/compute/**` no contiene sentencias de escritura.
- Tenant/space boundary: ninguna operación de cálculo recibe `organizationId`. El actor se deriva de la sesión
  (carril `app`) o del binding (carril `ecosystem`). El `accountId` de una demanda es contenido congelado, no un
  permiso.
- Idempotency/concurrency: operaciones puras y sin efecto; no llevan clave de idempotencia y montan sobre el harness
  de lectura aunque sean `POST`. Dos llamadas con el mismo cuerpo y las mismas versiones devuelven el mismo documento.
- Audit/outbox/history: sin evento de dominio (nada cambia de estado). Queda el registro de solicitud del harness.

### Migration, backfill and rollout

- Migration posture: none.
- Default state: flag OFF en todos los entornos; staging primero.
- Backfill plan: ninguno. La carga del corpus histórico en la base es un acto del operador con el importador de
  TASK-2025.
- Rollback path: apagar `QUOTER_COMPUTE_API_ENABLED` y redeploy; revertir el PR si hace falta. No hay datos que
  deshacer.
- External coordination: alta de la variable en Vercel por entorno; alta del consumidor y binding de la CLI y su
  secreto en Secret Manager (runbook, con autorización del operador).

### Security and access

- Auth/access gate: sesión o bearer de primera parte en `app`; token de consumidor + binding `internal` en
  `ecosystem`. Capacidades sembradas por TASK-2025, resueltas en la puerta única `src/lib/commercial/quoter/authz.ts`.
- Sensitive data posture: costos, márgenes, pisos y proveedores son vista interna. Sin PII y sin datos de nómina.
- Error contract: `ApiPlatformError` vía `quoter-errors.ts`; `captureWithDomain(err, 'commercial', …)` para lo no
  clasificado; nunca un error crudo.
- Abuse/rate-limit posture: límites por defecto de cada harness; tope de tamaño de cuerpo declarado por operación.

### Runtime evidence

- Local checks: pruebas de los adaptadores con el puerto en memoria; totalidad de la tabla de errores;
  `quoter-read-boundary.test.ts`; `pnpm pricing:v3:test`; `pnpm vercel:reachability-gate`.
- DB/runtime checks: lectura real del puntero y de una versión por huella contra PostgreSQL por el proxy, una vez por
  consulta nueva.
- Integration checks: corrida de paridad contra staging por los dos carriles (`.vercel.app` + bypass); rutas de
  negación (sin token, sesión cliente, binding de organización, bandera apagada).
- Reliability signals/logs: sin señal nueva; Sentry dominio `commercial` para `internal_error` y
  `CURRENT_VERSIONS_MISMATCH`.
- Production verification sequence: sección Rollout de esta task.

### Acceptance criteria additions

- [ ] Fuente de verdad, superficie del contrato y consumidores están nombrados con rutas y objetos reales.
- [ ] Invariantes, frontera de identidad y postura de idempotencia quedaron comprobados por una prueba cada uno.
- [ ] La task no agregó tablas ni migraciones; cualquier escritura detectada en `compute/**` rompe un test.
- [ ] Postura de rollback comprobada: bandera apagada responde 503 en cada ruta y no ejecuta el motor.
- [ ] Evidencia de runtime registrada: informe de paridad de staging y rutas de negación.
- [ ] Ningún error ni registro contiene valores del pedido, rutas de archivo ni mensajes de validador.

## Capability Definition of Done — Full API Parity gate

- [ ] La lógica vive en el motor (`src/lib/finance/pricing-v3/**`); ningún adaptador ni ruta contiene una regla.
- [ ] Cada operación es un recurso de lectura del contrato `quoter-compute.v1`, no un manejador acoplado a una pantalla.
- [ ] Lectura con autorización fina por capacidad (no por rol), errores canónicos saneados y observabilidad.
- [ ] Capacidades y permisos: las siembra TASK-2025; si esta task necesita una que no existe, entra con registro,
      catálogo TS y permiso a un rol real en el mismo PR, y `capability-grant-coverage.test.ts` queda en verde.
- [ ] Camino programático declarado: `api/platform/app` y `api/platform/ecosystem`; CLI en TASK-2028 y MCP en TASK-2030.
- [ ] Sin integración específica para Nexa: opera el mismo contrato.
- [ ] Un primitive, muchos consumidores: cero lógica duplicada entre CLI local, API, y futuros MCP e interfaz.
- [ ] Parity check = SÍ a nivel de capacidad, demostrado por la corrida de paridad.

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

### Slice 1 — Un documento por operación, producido por el motor

- Para cada operación de la tabla, comprobar que existe en `src/lib/finance/pricing-v3/**` una función que recibe
  documentos (y el puerto de TASK-2024 cuando necesita fuentes) y devuelve `{ document, exitCode, artifact }`, donde
  `document` es exactamente lo que la CLI escribe en stdout, `exitCode` es `0 | 2 | 3` y `artifact` es lo que la CLI
  escribiría en `--out` cuando difiere de `document`.
- Lo que TASK-2024 haya dejado todavía dentro de `scripts/commercial/pricing-v3.ts` (armado de `runNotices`,
  `freezeQuote`, despacho de `explain`/`replay` por familia de artefacto, lectura de opciones e incrementos de
  `compose document`, `classify` y `schemaIssue`) se **mueve** al motor sin cambiar comportamiento, y el script pasa a
  importarlo. Se mueve; no se copia.
- Evidencia del slice: stdout de la CLI idéntico byte a byte antes y después sobre el corpus, y
  `pnpm pricing:v3:test` en verde.

### Slice 2 — Versiones, bandera, autorización y tabla de errores

- `src/lib/commercial/quoter/compute/versions.ts`: resuelve catálogo, política y créditos desde el puntero activo o
  desde `versions.<rol>.digest`, por el adaptador PostgreSQL del puerto. Verifica el puntero contra sus fuentes antes
  de entregar nada.
- `src/lib/commercial/quoter/flags.ts`: `isQuoterComputeApiEnabled()` sobre `QUOTER_COMPUTE_API_ENABLED`, con la
  forma de `src/lib/efeonce-insights/flags.ts`. Fila en el libro de banderas en el mismo PR.
- `src/lib/commercial/quoter/authz.ts` (de TASK-2025): agregar las necesidades `catalog_read` y `compute` a su
  tabla `NEED → { capability, action }`. Dos entradas (ruta con `TenantContext`, sujeto máquina), una sola puerta;
  no se escribe una segunda.
- `src/lib/api-platform/resources/quoter-errors.ts`: `toQuoterApiPlatformError` y `withQuoterErrors`, con el mapa
  tipado `Record<PricingV3ErrorCode, …>` de Detailed Spec y su test de totalidad.
- `app-quoter-scope.ts` y `ecosystem-quoter-scope.ts`: derivan el sujeto; no leen `organizationId` de ningún lado.

### Slice 3 — Rutas del carril `app`

- Las diecinueve rutas bajo `src/app/api/platform/app/quoter/**`, cada una sobre `runAppReadRoute`, con su `routeKey`
  `platform.app.quoter.<comando>.<subcomando>` y `export const dynamic = 'force-dynamic'`.
- `app-quoter-read.ts` valida el cuerpo, llama a la puerta, resuelve versiones, invoca la función de operación y
  arma `data` y `meta`.

### Slice 4 — Rutas del carril `ecosystem` e identidad de la CLI

- Las mismas diecinueve rutas bajo `src/app/api/platform/ecosystem/quoter/**` sobre `runEcosystemReadRoute`, con el
  mismo módulo de operación y la misma tabla de errores.
- `scripts/api-platform/provision-quoter-cli-consumer.ts` (idempotente, no rota un token existente, publica el
  secreto por stdin, no imprime el token) y su runbook. **El ejecutor escribe el script y el runbook; no lo corre sin
  la autorización explícita del operador**, y registra en el Handoff quién lo corrió y cuándo.

### Slice 5 — Paridad, verificación y documentación

- `scripts/commercial/quoter-api-parity.ts`: recorre el corpus, ejecuta cada operación por el camino local y por la
  API, compara huella y bytes, y emite un informe. Corre contra staging por los dos carriles.
- Rutas de negación, comprobación de bandera apagada, OpenAPI, documento de arquitectura del contrato, documentación
  funcional, manual y fila del libro de banderas.

## Out of Scope

- Guardar cualquier cosa: crear cotización, agregar versión, registrar un artefacto local, textos del documento,
  ciclo de vida, número — todo eso es TASK-2027.
- Cambiar el catálogo: `catalog preview|apply`, `resources preview|apply`, `current set` — TASK-2029.
- La capa de transporte de la CLI, el diagnóstico de conexión y el cambio de modo por defecto — TASK-2028.
- Herramientas MCP, manual servido y federación en el gateway — TASK-2030.
- Operaciones que quedan **sólo locales** y no reciben ruta en esta task: `calculate` y `validate` (reciben el
  snapshot con costos de quien llama, lo que la decisión prohíbe en servidor), `prepare` y `quote` del camino de brief
  con catálogo del piloto, `compare`, `export`, `resources portfolio`, `resources budget` y `catalog validate`. Si
  TASK-2028 demuestra que alguna hace falta en modo plataforma, entra como delta de esta task con su fila en la tabla.
- Lecturas por referencia a una versión guardada: no existen cotizaciones guardadas en esta fase.
- Una audiencia cliente del cálculo, una proyección «interna sin costo» y cualquier redacción nueva.
- Render de PDF, HTML o cualquier motor de render; interfaz; Nexa.
- Cambios en `quotations*`, en el motor V2 y en `src/app/api/platform/{app,ecosystem}/quotation/**`.
- Fecha de inicio, duración de contrato, nómina como costo, recálculo en segundo plano.
- Mover el motor fuera de `src/lib/finance/pricing-v3/**`.

## Detailed Spec

### Regla de nombres y forma común

La ruta es el comando de la CLI: `/api/platform/<carril>/quoter/<comando>[/<subcomando>]`. Cada opción de la CLI que
nombra un archivo es una clave del cuerpo con el mismo nombre y lleva el **documento**, no una ruta. Así
`details.option` significa lo mismo en los dos transportes.

Cuerpo de una operación `POST` (las claves que no aplican se rechazan como `UNKNOWN_OPTION`):

```json
{
  "versions": { "catalog": { "digest": "…" }, "policy": { "digest": "…" }, "credits": { "digest": "…" } },
  "input": {},
  "brief": {},
  "keepBlocked": false
}
```

- `versions` ausente equivale a `--current`: las tres fuentes salen del puntero activo. Un rol presente fija esa
  fuente por huella y los demás siguen al puntero (una opción explícita gana, como en la CLI). No existe en la API el
  comportamiento «sin `--current`» de la CLI (catálogo base histórico por defecto): toda llamada nombra o hereda
  versiones gobernadas.
- Respuesta 200: `data = { result, artifact }` y `meta = { exitCode, versionsUsed, audience }`.
  - `result` es el documento de stdout de la CLI para esa operación, sin envolver ni reordenar.
    Excepción medida en el dorado de `TASK-2024`: `compose preview --format markdown` no imprime JSON. Para esa
    variante la ruta acepta `format` y devuelve el texto en `data.resultText` (y `result: null`); la CLI lo imprime tal
    cual. Las otras 106 salidas del dorado son JSON y sobreviven la ida y vuelta por objeto (prueba permanente en
    `pricing-v3-cli-golden.test.ts`), así que viajan en `result`.
  - `artifact` es `null` salvo en las operaciones marcadas en la tabla. Cuando existe viaja además como **texto**:
    `data.artifactText` es la cadena exacta que la CLI local habría escrito con `--out` (misma sangría, mismo orden de
    claves, salto final) y `data.artifactDigest` es su sha256. Es lo que da paridad de archivo byte a byte entre
    transportes: un objeto JSON no garantiza el orden de claves al cruzar HTTP. El servidor produce ese texto con el
    mismo formateador de la CLI, movido al motor en el Slice 1; nunca lo reconstruye desde `artifact`.
  - `meta.exitCode` es `0`, `2` o `3`. **Los tres son HTTP 200**: bloqueado o falta de datos (`2`) y calculado bajo
    revisión (`3`) son resultados con documento completo, no fallos; un envelope de error no puede transportar ese
    documento. El rechazo (`1` en la CLI) es el único que usa el envelope de error.
  - `meta.versionsUsed` nombra catálogo, política y créditos por versión y huella, y si vinieron del puntero o de una
    fijación.
  - `meta.audience` es `internal` o `client_safe` según la tabla; declara qué proyección es el documento.

### Tabla de operaciones

Las diecinueve operaciones existen en los dos carriles con el mismo adaptador. «Fuentes» indica qué resuelve el
servidor por puntero o por huella.

| # | Operación CLI | Método y ruta bajo `/quoter` | Entrada (claves) | Fuentes | `result` | `artifact` | Exit | Audiencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `current show` | `GET /versions/current` | — | puntero | puntero y su verificación; `meta.engines` con el registro de motores del despliegue | — | 0 · 2 si no es consistente | internal |
| 2 | `catalog search` | `GET /catalog/search` | `query`, `kind`, `date` | catálogo | `resolution` y `candidates` | — | 0 · 2 sin candidatos | internal |
| 3 | `catalog show` | `GET /catalog/show` | `query` obligatorio, `kind`, `date` | catálogo | igual que 2, filtrado por identidad | — | 0 · 2 sin candidatos | internal |
| 4 | `resources inspect` | `GET /resources/inspect` | `date` obligatorio, `query` | catálogo, política, créditos | descubrimiento + `priceReview` + huellas | — | 0 | internal |
| 5 | `compose workload` | `POST /compose/workload` | `input`, `brief` opcional | — | dimensionamiento | brief dimensionado, sólo con `brief` | 0 · 2 | internal |
| 6 | `compose scaffold` | `POST /compose/scaffold` | `input` (brief) | catálogo, política | preguntas y `demand` | demanda | 2 siempre | internal |
| 7 | `compose plan` | `POST /compose/plan` | `input` (plan) | las tres | plan y `demand` | demanda si hay asignación válida | 3 · 2 | internal |
| 8 | `compose prepare` | `POST /compose/prepare` | `input` (demanda), `keepBlocked` | las tres | resumen sin `replayDigest` | artefacto si calculó | 3 · 2 | internal |
| 9 | `compose quote` — **simular** | `POST /compose/quote` | `input` (demanda), `keepBlocked` | las tres | resumen con `replayDigest` y `runNotices` | artefacto congelado si calculó | 3 · 2 | internal |
| 10 | `explain` | `POST /explain` | `input` (artefacto) | las del artefacto | explicación | — | 3 · 2 · 0 según familia | internal |
| 11 | `replay` | `POST /replay` | `input` (artefacto) | las del artefacto | `verified` + resumen | — | 3 · 2 · 0 según familia | internal |
| 12 | `compose assess` | `POST /compose/assess` | `input` | las del artefacto | evaluación plegada | — | 3 | internal |
| 13 | `compose preview` | `POST /compose/preview` | `input`, `format` | las del artefacto | vista previa JSON o Markdown | — | 3 | client_safe |
| 14 | `compose split` | `POST /compose/split` | `input`, `tools`, `label` | las del artefacto | reparto | — | 3 | internal |
| 15 | `compose schedule` | `POST /compose/schedule` | `input`, `milestones` | las del artefacto | calendario de pagos | — | 3 | internal |
| 16 | `compose cash` | `POST /compose/cash` | `input` | las del artefacto | lectura de caja | — | 3 | internal |
| 17 | `compose commitments` | `POST /compose/commitments` | `input` | las del artefacto | compromisos | — | 3 · 2 | internal |
| 18 | `compose document` | `POST /compose/document` | `input`, `brief` opcional, `options` | las del artefacto | datos v2 de la plantilla A4; sin `brief`, el esqueleto | brief solo, cuando no vino `brief` | 3 · 2 sin `brief` | client_safe |
| 19 | `compose increment` | `POST /compose/increment` | `input` (con adicional), `base` | las de ambos | incremento | — | 3 | internal |

Notas a la tabla:

- Diecinueve filas, diecinueve rutas por carril. El conteo que importa para el cierre es «toda fila tiene su ruta
  en ambos carriles y su caso en la corrida de paridad».
- `options` de la fila 18 es **una sola lista ordenada** de `{ flag: "option" | "increment", key, artifact }`, porque
  la CLI comparte una lista entre `--option` y `--increment` y nombra un rechazo por el lugar del elemento. Máximo 8.
- `explain` y `replay` despachan por `artifactVersion` exactamente como la CLI (`pricing-v3-resource-composition/1`,
  `pricing-v3-selection-quote/1`, `pricing-v3-local-artifact/1`), con la función movida al motor. Las lecturas
  `compose *` aceptan sólo la primera familia, como hoy.
- `meta.engines` de la fila 1 lista contrato → motor de `PRICING_V3_ENGINES` tal como lo sirve el despliegue. Es una
  constante del código, no un cálculo; la CLI de TASK-2028 la compara con la local para diagnosticar una versión
  desalineada.
- `runNotices` describe la corrida contra las fuentes de ese momento. Viaja en `result` porque es parte de stdout; no
  se guarda en ningún lado y TASK-2027 no la persiste.
- Fila 9 con `keepBlocked: false` y sin cálculo: `artifact` es `null` y `result.runNotices.output` trae el mismo
  aviso `QUOTE_NOT_CALCULATED` que imprime la CLI ejecutada con `--out`. Con `keepBlocked: true` el artefacto viaja
  rotulado `KEPT_BLOCKED`. La corrida de paridad ejecuta la CLI con `--out` a una ruta temporal para comparar.
- «Fuentes: las del artefacto» significa que la lectura usa lo que el artefacto congeló y no consulta la base ni el
  puntero. Por eso una lectura no necesita `versions`; enviarlo se rechaza.
- `client_safe` no abre la operación a un cliente: declara que ese documento sale del único filtro. En esta fase
  ningún cliente invoca estas rutas.
- Tamaño: el artefacto más grande del repo mide cerca de 2,5 MB y el cuerpo de una función de Vercel admite unos
  4,5 MB. Las filas 18 y 19 reciben varios artefactos en un cuerpo. Discovery mide el corpus del exit gate; una
  solicitud que exceda el límite recibe el 413 de la plataforma, se documenta como límite conocido y la forma por
  referencia a versiones guardadas queda como seguimiento de TASK-2027. No se comprime ni se trocea aquí.

### Autorización

- Puerta única `assertQuoterAccess({ subject, need })`. Necesidades de esta task: `catalog_read` (filas 1 a 4) y
  `compute` (filas 5 a 19). Capacidades de TASK-2025: `commercial.quoter.catalog` acción `read` y
  `commercial.quoter.simulate` acción `read`, otorgadas allí al grupo de rutas `commercial`. Si al materializarse
  difieren, manda TASK-2025. No reutilizar `commercial.quote.simulate`, que gobierna el motor V2.
- Carril `app`: sesión o bearer de primera parte. `tenantType === 'client'` responde 404 `not_found` en toda ruta de
  cálculo (anti-oráculo: la capacidad no existe para esa identidad). Un actor interno sin la capacidad responde 403
  `forbidden`. Una sesión de agente (`tenant.authMode === 'agent'`) **sí** puede calcular: un agente cotiza.
- Carril `ecosystem`: `externalScopeType` y `externalScopeId` siguen siendo obligatorios porque identifican el
  binding. Un binding con organización responde 404. Un binding `internal` se modela como sujeto máquina
  (`userId: consumer:<publicId>`, rol `efeonce_account`), igual que `ecosystem-insights-scope.ts`.
- Ninguna ruta lee `organizationId` de la consulta ni del cuerpo; enviarlo en el cuerpo se rechaza como
  `UNKNOWN_OPTION`.

### Tabla de traducción (compartida por los dos carriles)

Exit de la CLI → HTTP:

| Exit CLI | Significado | HTTP | Dónde viaja |
| --- | --- | --- | --- |
| 0 | resuelto o completo | 200 | `meta.exitCode = 0` |
| 2 | bloqueado, falta un dato, sin candidatos o no calculó | 200 | `meta.exitCode = 2`, documento completo en `data.result` |
| 3 | calculado, requiere revisión | 200 | `meta.exitCode = 3` |
| 1 | rechazo | 4xx o 5xx | envelope de error, `errors[0].details.code` |

`PricingV3Error` → envelope de error. `errors[0].details` es `{ code, option?, allowed?, issues? }` y nada más;
`errors[0].message` es un texto fijo por grupo.

| Grupo | Códigos del registro cerrado | HTTP | `errors[0].code` |
| --- | --- | --- | --- |
| Forma del pedido | `SCHEMA_INVALID`, `INVALID_ARGUMENT`, `MISSING_ARGUMENT`, `INVALID_FORMAT`, `UNKNOWN_OPTION`, `INPUT_NOT_JSON` | 400 | `bad_request` |
| Fuente fijada que la base no tiene | `INPUT_NOT_FOUND` con `option` `catalog`, `policy` o `credits` | 422 | `bad_request` |
| El contenido no pasa una regla del dominio | los 49 de `PRICING_V3_DOMAIN_ERROR_CODES`, más `EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY`, `PLAN_REQUIRES_VALID_ALLOCATION` y `WORKLOAD_REQUIRES_VALID_DIMENSIONING` | 422 | `bad_request` |
| El puntero activo no coincide con sus fuentes | `CURRENT_VERSIONS_MISMATCH` | 503 | `service_unavailable` |
| Confirmación de puntero vencida | `CURRENT_VERSIONS_CONFLICT` | 409 | `bad_request` |
| Sin sentido en HTTP | `UNKNOWN_COMMAND`, `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE` | 500 | `internal_error` |
| Sin clasificar | cualquier otra excepción (`ADAPTER_FAILURE` en la CLI) | 500 | `internal_error` |

Condiciones de plataforma, que no son del registro cerrado. Su `details.code` va en minúsculas para que nadie lo
confunda con un código del dominio:

| Condición | HTTP | `errors[0].code` | `details.code` |
| --- | --- | --- | --- |
| Bandera apagada | 503 | `service_unavailable` | `quoter_compute_disabled` |
| Sin token o sesión | 401 | los del harness (`missing_token`, `missing_session`, …) | — |
| Actor interno sin la capacidad | 403 | `forbidden` | — |
| Sesión cliente o binding de organización | 404 | `not_found` | — |
| Binding ni interno ni de organización | 403 | `scope_not_allowed` | — |
| Versión de API no soportada | 400 | `unsupported_api_version` | — |
| Límite de frecuencia | 429 | `rate_limited` | — |

Reglas de la tabla:

- El mapa es `Record<PricingV3ErrorCode, { statusCode, errorCode }>`: un código nuevo en el registro no compila sin
  su fila. Un test recorre los dos arreglos del registro y exige que cada código esté mapeado una vez.
- `CURRENT_VERSIONS_CONFLICT` no lo produce ninguna operación de esta task (lo produce `current set`, TASK-2029); está
  mapeado para que la tabla sea total. TASK-2029 decide si ese 409 merece un código propio en
  `ApiPlatformErrorCode`, como pide la arquitectura para causas 409 con acción distinta.
- Los tres códigos «sin sentido en HTTP» no pueden originarse en una ruta; si llegan al traductor es un defecto del
  servidor y se captura en Sentry.
- La validación del cuerpo se hace con el esquema del motor y, para la envoltura, con un esquema del adaptador cuyo
  fallo también se reporta como `SCHEMA_INVALID` con `issues` de `path` y `rule`.
- Un `ZodError` aporta sólo lo que lee `schemaIssue`; jamás su mensaje. Máximo 20 `issues`.

### Identidad máquina de la CLI (acto del operador)

- Consumidor nuevo `efeonce-quoter-cli` con `allowedGreenhouseScopeTypes = ['internal']`, binding `internal` activo
  (alcance externo `other/efeonce-quoter-cli`) y token `ghspk_*` generado una vez y publicado por stdin en Secret
  Manager como `greenhouse-quoter-cli-ecosystem-token`. El cliente OAuth para el inicio de sesión de personas es de
  TASK-2028, no de esta task.
- No reutilizar el consumidor del gateway MCP: la tabla de idempotencia y auditoría identifica por principal.
- La instancia de PostgreSQL es una sola para staging y producción, así que el mismo consumidor autentica contra los
  dos despliegues: lo que separa los entornos es la bandera de cada uno. El runbook lo dice con esas palabras.
- El runbook `docs/operations/runbooks/quoter-cli-consumer-provisioning.md` cubre: quién autoriza, comando exacto,
  cómo comprobar sin leer el token, rotación, revocación y qué registrar.

### Cómo se prueba la restricción de Vercel

- `pnpm vercel:reachability-gate` en verde con las rutas nuevas: su lista de negación cubre `scripts/**`,
  `services/**`, el motor de render y las rutas armadas con `process.cwd()`, `__dirname` o `import.meta.url`.
- `quoter-read-boundary.test.ts` afirma por grafo de imports que los módulos de recursos del cotizador no alcanzan
  `node:fs`, `node:path`, `scripts/`, el adaptador de archivos del puerto, la ruta del puntero en archivo,
  `playwright` ni `@/lib/artifact-composer`.
- El gate de tamaño real corre sobre el build de staging; esta task no ejecuta `pnpm build` sin autorización.

### Corrida de paridad (exit gate)

Corpus: toda `*.demand.json`, `*.plan.json`, `*.workload.json`, `*.brief.json`, `*.document-brief.json` y
`*.artifact.json` bajo `data/pricing/v3-operating/`, más los ejemplos de
`.claude/skills/efeonce-pricing-operator/references/examples/`. Por cada caso:

1. Demanda → `compose quote` por la API con las versiones fijadas por huella que nombra su artefacto hermano (o el
   puntero, para los ejemplos de la skill): `artifact.replayDigest` idéntico al de la CLI local y artefacto idéntico
   byte a byte en JSON canónico.
2. Artefacto → cada lectura que el corpus guarda o que la operación admite (`explain`, `replay`, `assess`, `preview`,
   `split`, `schedule`, `cash`, `commitments`, `document`, `increment`): `result` idéntico byte a byte y mismo
   `exitCode`.
3. Esqueleto, plan, dimensionamiento y preparar con sus ejemplos: mismo `result`, mismo `exitCode`.
4. Un caso de rechazo por grupo de la tabla: mismo `code`, `option` e `issues` que el reporte de la CLI.

El informe lista caso, operación, carril, huella local, huella remota y veredicto. Un solo caso distinto deja la task
abierta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5. El Slice 1 cierra con el stdout de la CLI sin cambios antes de
escribir una sola ruta. El Slice 4 no se da por cerrado sin el consumidor aprovisionado por el operador. La bandera
no se enciende en producción antes de que la corrida de paridad de staging esté en verde. Nada de esta task empieza
antes de que TASK-2024 y TASK-2025 estén completas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La API calcula distinto que la CLI | Motor V3 | medium | Mismo código importado; corrida de paridad por huella y byte; guarda de artefactos congelados | informe de paridad con un caso distinto |
| El traslado del Slice 1 cambia una salida de la CLI | CLI local | medium | Comparación byte a byte de stdout sobre el corpus antes y después; `pnpm pricing:v3:test` | diff de stdout no vacío |
| Una ruta alcanza `scripts/**` o el sistema de archivos y la función supera el límite | Vercel | medium | `pnpm vercel:reachability-gate` + test de frontera de imports | gate rojo; deploy de staging fallido |
| Costos o márgenes llegan a una identidad cliente | Access | low | 404 a sesión cliente y a binding de organización; pruebas de negación en ambos carriles | sin señal propia; prueba de negación |
| Un error repite un valor del pedido | Access | low | `details` cerrado a cuatro claves; test que inyecta un valor centinela y lo busca en la respuesta y en los registros | prueba de centinela |
| El puntero de la base no coincide con sus fuentes | Data | low | Verificación previa; 503 `CURRENT_VERSIONS_MISMATCH`; nunca se sigue | evento Sentry dominio `commercial` |
| El corpus nombra versiones que la base no tiene | Data | medium | Condición previa declarada; 422 `INPUT_NOT_FOUND`; el informe de paridad lo distingue de una diferencia de cálculo | casos «fuente ausente» en el informe |
| Cuerpo mayor que el límite de la función | Vercel | medium | Medición del corpus en Discovery; límite documentado; forma por referencia diferida a TASK-2027 | 413 en la corrida de paridad |
| El token de la CLI se filtra o se mezcla con el del gateway | Identity | low | Consumidor propio; secreto por stdin; nunca impreso; runbook de rotación | sin señal — revisión del runbook |

### Feature flags / cutover

- `QUOTER_COMPUTE_API_ENABLED`, default `false`. **Se lee sólo en Vercel** (rutas `app` y `ecosystem` del cotizador);
  ningún worker ni Job la lee, así que no entra en ningún `services/*/deploy.sh`. Confirmarlo al cerrar con
  `grep -rn "QUOTER_COMPUTE_API_ENABLED" src/ services/`.
- Apagada: toda ruta responde 503 `service_unavailable` con `details.code = quoter_compute_disabled` sin ejecutar el
  motor ni consultar la base.
- Orden: `staging` → redeploy → paridad en verde → `Production` con autorización del operador → redeploy. Vercel no
  toma la variable en caliente.
- Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR, con runtime «Vercel» y estado por entorno.
  El auditor busca la forma literal `process.env.X_ENABLED`; si la lectura pasa por un parámetro, la fila del libro
  es lo que cierra el gate.
- La CLI local no cambia: su modo por defecto sigue siendo local hasta TASK-2028.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el commit del traslado; la CLI vuelve a su forma previa | minutos | si |
| Slice 2 | Revertir el PR; sin datos que deshacer | minutos | si |
| Slice 3 | Bandera a `false` + redeploy; o revertir el PR | menos de 10 min | si |
| Slice 4 | Bandera a `false`; suspender el consumidor (`credential_status`) según el runbook | menos de 10 min | si |
| Slice 5 | Revertir documentación y script de paridad | minutos | si |

### Production verification sequence

1. Local: pruebas de adaptadores, tabla de errores y frontera; `pnpm local:check`.
2. Push a `develop` sólo con la señal del operador; esperar el deploy de staging en verde.
3. Staging con la bandera apagada: una ruta por carril responde 503 `quoter_compute_disabled`.
4. Bandera en `staging` + redeploy. Rutas de negación: sin token (401), sesión cliente (404), binding de
   organización (404), actor interno sin capacidad (403).
5. Corrida de paridad por `app` y por `ecosystem` contra la URL `.vercel.app` de staging con el header de bypass.
   Registrar el informe en la task.
6. Producción: release por el control plane (`greenhouse-production-release`), con la bandera todavía apagada;
   comprobar el 503. Encender con autorización del operador, redeploy y repetir una muestra de la paridad por el
   carril `ecosystem` (lecturas y una simulación; no hay nada que escriba).
7. Registrar SHA, valores de bandera leídos y resultado en la task y en el Handoff.

### Out-of-band coordination required

- Operador: autorizar y ejecutar el alta del consumidor `efeonce-quoter-cli`, su binding y su secreto.
- Operador: alta de `QUOTER_COMPUTE_API_ENABLED` en Vercel por entorno y sus redeploys.
- Operador: importar a la base las versiones históricas que nombra el corpus, si TASK-2025 no las dejó.
- Sesiones de TASK-2027 y TASK-2028: avisar cuando la tabla de errores y la forma de `data`/`meta` queden fijas.
- Ningún cambio en el gateway `efeonce-mcp`, en Entra ni en HubSpot.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cada fila de la tabla de operaciones tiene su ruta en `src/app/api/platform/app/quoter/**` y en
      `src/app/api/platform/ecosystem/quoter/**`, y las dos llaman al mismo módulo de operación.
- [ ] Ninguna ruta ni adaptador contiene aritmética, redondeo, filtrado de costos ni armado de resumen: un test de
      frontera lo comprueba por imports y la revisión por lectura.
- [ ] `scripts/commercial/pricing-v3.ts` importa del motor lo que el Slice 1 movió; el stdout de la CLI es idéntico
      byte a byte antes y después sobre el corpus.
- [ ] `pnpm pricing:v3:test` queda en verde y los artefactos congelados del repo se recalculan idénticos.
- [ ] Una operación sin `versions` usa el puntero activo de la base; con `versions.<rol>.digest` usa esa versión; una
      huella que la base no tiene responde 422 con `details.code = INPUT_NOT_FOUND` y `details.option` del rol.
- [ ] Un cuerpo que trae un catálogo, una política, un catálogo de créditos, un piso, un costo, una organización o un
      estado es rechazado; ninguna ruta acepta `organizationId`.
- [ ] Un puntero que no coincide con sus fuentes responde 503 con `CURRENT_VERSIONS_MISMATCH` y no calcula.
- [ ] `compose quote` devuelve en `data.artifact` el artefacto congelado cuando calcula y `null` cuando no, con el
      aviso `QUOTE_NOT_CALCULATED`; con `keepBlocked: true` lo devuelve rotulado `KEPT_BLOCKED`. No se escribe nada
      en ninguna tabla.
- [ ] Los exit `0`, `2` y `3` responden HTTP 200 con `meta.exitCode`; el rechazo responde con el envelope de error.
- [ ] El mapa de `quoter-errors.ts` es total sobre `PricingV3ErrorCode` (no compila si falta un código) y un test lo
      recorre; los dos carriles devuelven el mismo estado y código para la misma causa.
- [ ] `errors[0].details` contiene sólo `code`, `option`, `allowed` e `issues`; un valor centinela enviado en el
      pedido no aparece en ninguna respuesta de error ni en los registros.
- [ ] El registro cerrado de `src/lib/finance/pricing-v3/errors.ts` tiene los mismos códigos que antes de la task.
- [ ] Sesión cliente y binding de organización reciben 404 en toda ruta; actor interno sin capacidad, 403; sin
      credencial, 401. Una sesión de agente con la capacidad puede calcular.
- [ ] `compose preview` y `compose document` salen de `clientSafePeriodItems`; no existe una segunda proyección.
- [ ] Con `QUOTER_COMPUTE_API_ENABLED` apagada, toda ruta responde 503 `quoter_compute_disabled` sin tocar el motor.
- [ ] `pnpm vercel:reachability-gate` en verde y `quoter-read-boundary.test.ts` afirma que ningún módulo del
      cotizador alcanza `scripts/**`, `node:fs`, el puntero en archivo ni un motor de render.
- [ ] El consumidor `efeonce-quoter-cli` existe con binding `internal` propio, creado por el operador según el
      runbook; el token no aparece en ningún archivo, registro ni salida.
- [ ] **Exit gate:** la corrida de paridad en staging, por `app` y por `ecosystem`, da para cada demanda del corpus la
      misma huella de artefacto y, para cada lectura, el mismo documento byte a byte y el mismo `exitCode` que la CLI
      local. El informe está enlazado en esta task.
- [ ] OpenAPI, documento de contrato, documentación funcional, manual y fila del libro de banderas reflejan lo
      construido y lo que queda sólo local.

## Verification

- `pnpm task:lint --task TASK-2026`
- `pnpm local:check` (incluye `pnpm vercel:reachability-gate`, lint y `tsc`)
- `pnpm pricing:v3:test`
- `pnpm vitest run src/lib/api-platform/resources src/lib/commercial/quoter`
- `pnpm vitest run src/lib/entitlements/capability-grant-coverage.test.ts`
- `pnpm test` (suite completa) al cierre; `pnpm build` sólo con autorización del operador
- `pnpm flags:audit --strict --no-vercel` y `pnpm docs:closure-check`
- `pnpm qa:gates --changed`, `pnpm ops:lint --changed`, `pnpm docs:context-check:strict`
- `pnpm finance:e2e-gate`: **no aplica**. El gate observa manejadores `POST/PUT/PATCH/DELETE` en
  `src/app/api/finance/**/route.ts`; estas rutas viven en `src/app/api/platform/**` y sus `POST` no mutan. Queda
  dicho aquí para que nadie agregue un tag `[downstream-verified]` sin objeto.
- `pnpm migration-marker-gate`: sin migraciones en esta task; si aparece una, la task se salió de alcance.
- Corrida de paridad contra staging y rutas de negación, con el informe adjunto.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Documentación técnica: `docs/architecture/GREENHOUSE_QUOTER_V3_API_CONTRACT_V1.md` (operaciones, forma de
      `data` y `meta`, tabla de traducción, autorización) y OpenAPI `quoter-compute.v1`.
- [ ] Documentación funcional: `docs/documentation/finance/cotizador-v3-api-de-calculo.md`.
- [ ] Manual: `docs/manual-de-uso/finance/operar-cotizador-v3-por-api.md` y el runbook del consumidor.
- [ ] `docs/documentation/finance/cotizador-v3-promocion-canonica.md` recibe una nota fechada con lo que esta fase
      entregó; `EPIC-053` y la skill `efeonce-pricing-operator` (y su espejo) quedan al día.
- [ ] `Status real` y los criterios tildados reflejan la evidencia; el estado se declara `code complete, rollout
      pendiente` mientras la bandera no esté encendida y verificada en producción.
- [ ] `Blocked by` de TASK-2027 y TASK-2028 actualizado al cerrar.

## Follow-ups

- TASK-2027: lecturas por referencia a una versión guardada (resuelve el límite de tamaño de las filas 18 y 19).
- TASK-2028: representación en la CLI de las condiciones de plataforma que no tienen código en el registro cerrado
  (401, 403, 404, 429, 503 por bandera, red caída). La decisión pide «error claro» y «mismos errores tipados»; hoy el
  registro no tiene un código de transporte remoto.
- TASK-2029: código 409 propio para `CURRENT_VERSIONS_CONFLICT` si su acción difiere de otros conflictos.
- Decidir si alguna de las operaciones sólo locales merece ruta, con evidencia de uso.

## Open Questions

- Capacidades y puerta: este documento usa las de TASK-2025. Si su migración las materializa con otro nombre o con
  otros roles, se usa lo sembrado y se actualiza esta task antes de escribir código.
- Visibilidad de costos entre roles internos: esta task supone que quien puede simular ve el resumen con costo y
  margen, como en la CLI. Si el dueño quiere un rol interno que simule sin ver costo, la respuesta correcta es negar
  la operación, no redactar; requiere decisión antes de abrir el acceso a más roles.
- `current show` no está nombrado en la fase 3 del plan; se incluye como lectura porque sin ella un consumidor no
  puede saber qué versiones rigen. Confirmar con el dueño de TASK-2029 que no pisa su alcance.
