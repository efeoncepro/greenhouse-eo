# Handoff activo

## TASK-1641 — Globe: el sello del canary y los motores de video (2026-08-04)

**Estado:** `in-progress`. Diagnóstico cerrado, migración escrita y committeada (`efeonce-globe@7994f0d`),
**NO aplicada**. Próximo paso concreto: `migrate:up` → arreglar el checkpoint → deploy API → re-sellar.

**Lo que quedó funcionando:** Veo y Omni **generan** por el carril gobernado, probados en vivo hoy (MP4 de
7,99 MB y 1,95 MB, `retained`, liquidación exacta). `ISSUE-140` resuelto en dos capas y **D12 de `ISSUE-138`
cerrado** con el objeto en `governed-veo/`.

**Lo que bloquea:** el `canary-confirm` devuelve `internal_error` 500 porque
`generated_asset_rights_authority_effective` proyecta 3 columnas y su consumidor usa 14 — la consulta nunca
pudo parsear. Sin sello, toda promoción se revierte al vencer su ventana (medido: 10 de 12 históricas).

**Trampa a no repetir:** `confirmProductionPromotionCanary` marca `verifying_canary` antes de leer la
evidencia y no tiene try/catch; de ese estado sólo se sale por rollback, así que **cada reintento quema una
promoción**. Arreglar la vista sin reordenar el checkpoint deja la trampa viva.

**Ventanas vivas al cierre:** Veo apagada (se revirtió con `canary_unattested`); Omni activa con ~2h40 desde
las 21:00 UTC — se apagará sola si no se sella.

Historia anterior: [Handoff.archive.md](Handoff.archive.md).

## EPIC-039 — Next.js 16.3 + TypeScript 7 Toolchain Adoption (2026-08-04)

Estado: **to-do / diseño**. Se registraron el epic y sus dos tasks hijas:
[`EPIC-039`](docs/epics/to-do/EPIC-039-nextjs-typescript-toolchain-adoption.md),
[`TASK-1638`](docs/tasks/to-do/TASK-1638-nextjs-16-3-framework-alignment.md) para el alineamiento del framework y
[`TASK-1639`](docs/tasks/to-do/TASK-1639-typescript-7-dual-compiler-adoption.md) para el lane dual TS7/TS6.
Los linters de tasks/epic/ops y el cierre documental pasan. No hubo cambios de código, dependencias, runtime,
deploy ni producción. Siguiente paso: tomar `TASK-1638`; `TASK-1639` permanece bloqueada hasta su cierre.

## ISSUE-137 — Asset Governance: resolución verificada con cron de un minuto (2026-08-04)

**Resuelta y desplegada.** La latencia de Asset Governance era `nº de etapas × el cron`: cuatro etapas
esperando un tick de `*/5` daban ~20 min de reloj para ~60 s de trabajo. El cron bajó a `*/1`
(`efeonce-globe@d78ce01`, Scheduler live `*/1 * * * * ENABLED` en `southamerica-east1`).

**Verificado con dos generaciones reales**, medidas contra `globe-pg`:

| | end-to-end | governance | créditos | output |
|---|---|---|---|---|
| imagen | 471,8 s | 183 s | 10 = 10 | PNG 7,57 MB `retained` |
| video | 474,0 s | 183,8 s | 16 = 16 | MP4 `retained` |

Que imagen y video coincidan **siendo otro medio y otro peso** es la prueba de que era cadence-bound y no
size-bound — o sea que el arreglo generaliza. Antes: ~1085 s de governance y ~22 min end-to-end.

**El presupuesto de latencia ahora es canónico** y vive donde corresponde:
[ADR-007 § Presupuesto de latencia](docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md),
con su corte en [`GLOBE_RUNTIME_HANDOFF`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md) y el
presupuesto de espera para operadores en el
[manual del Producer](docs/manual-de-uso/creative-studio/usar-creative-producer-globe.md).

**Los dos defectos que NO eran de latencia se cerraron en `TASK-1469`**: la vista del experimento ya
proyecta el attempt en vuelo, y el cierre de la cola se sella con reloj real en **los siete** call sites de
`finishLease` (eran timestamps del dominio, tres de ellos del futuro).

🔴 **Las tres lecciones de método, que valen más que el arreglo:**

- **Un readback es un instante, no un veredicto.** Se declaró un bloqueo mirando **seis minutos** un camino
  cuya latencia real era **veintidós**. La regla de no reintentar se aplicó bien; lo que faltó fue **volver a
  leer más tarde**. Declarar «no avanza» exige conocer la latencia esperada del camino.
- **El instrumento decía «roto» y la causa era otra, tres veces:** los runs «colgados» habían completado, el
  drain loop que se iba a escribir era **una variable de Terraform**, y el canary llevaba tiempo **abortando
  sobre un sistema sano**. La señal que la issue proponía —«reservado sin attempt tras N minutos»— habría
  alertado sobre corridas perfectamente sanas.
- **El drain loop quedó evaluado y diferido**, no descartado: bajaría governance a ~1 min, pero su riesgo es
  la **equidad entre workspaces** (hoy cada uno recibe un `claimDue` por ejecución, que es round-robin justo),
  no el lease. Si se hace, con cota configurable y default que reproduce la conducta actual.

Detalle completo y cronología:
[`ISSUE-137`](docs/issues/resolved/ISSUE-137-globe-experiment-running-forever-zero-attempts.md).

## Cierre documental de la sesión de captura de completitud (2026-08-04)

**El hueco más grande no era un defecto de código: era que el contrato no existía.** Ningún documento de
arquitectura mencionaba siquiera la palabra «webhook» — la captura de completitud vivía sólo en el código, y
esa ausencia es lo que dejó acumular trece defectos sin que nadie los viera.

- **[ADR-021](docs/architecture/creative-studio/EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md)**
  (nuevo): cada proveedor avisa distinto y el sistema respeta esa diferencia. Incluye el invariante de
  convergencia terminal y el presupuesto de latencia del camino en frío.
- **Skills, ambos espejos + overlay de arquitectura**: se corrigieron **cuatro contradicciones activas**, que
  son lo peligroso porque enseñan lo contrario de lo aprendido — la peor, que la skill presentaba
  `outboxDeadLetter` como el instrumento *confiable* de blast radius cuando su número estaba inflado ×3.
- **Doc funcional y manual**: el manual tenía un `NUNCA` **invertido por los hechos**, y le faltaba el paso 0
  del diagnóstico (`~8 min no son un cuelgue`), sin el cual manda a diagnosticar corridas sanas.
- **Runbooks de alertas y rollout**: las tres alertas nuevas, la regla del aligner por tipo de métrica, y la
  trampa del `tofu apply` que destruye 20 recursos con el plan en verde.
- **Guard nuevo en Globe**: cada endpoint de Fal declara su base de seguimiento o declara que no la tiene
  (6 con base, 5 sin recuperación declarada). «Correcto por diseño» y «nadie se entera» son cosas distintas.

🔴 **Corrección de algo que yo mismo escribí:** el mensaje del arreglo de la lease decía que el worker corría
con 60 s. **No era cierto** — `producer_worker_job.tf` la fija en 15 min desde antes de la sesión, así que el
modo de fallo que describí no pudo ocurrir en producción. El cambio de default sigue siendo correcto (protege
a runtimes que no seteen la variable), pero exageré su impacto. Queda escrito en el código.

## TASK-1469 — convergencia terminal cerrada; task REABIERTA por cierre prematuro (2026-08-04)

Verificado en runtime desde `efeonce-globe@c28ab9f`; detalle en
[`TASK-1469`](docs/tasks/in-progress/TASK-1469-globe-governed-run-lifecycle-submission-fence.md).

### Delta 2026-08-04 (d) — los dos defectos de ISSUE-137 cerrados y DESPLEGADOS

Rollout verificado contra la **revisión activa**, no contra el workflow verde: `globe-api-internal-00207-28r`,
`globe-studio-internal-00149-w9c` y el Job del worker, las tres con el digest etiquetado `e7a732c9b62e`.

- 🔴 **El sello del reloj era MUCHO peor que los 19 minutos del incidente.** `finishLease` recibía el instante
  como parámetro y sus **siete** call sites pasaban uno de DOMINIO — tres del **futuro**, o sea filas que podían
  declararse completas antes de existir. Medido: **23 de 131** filas `done` contradictorias, peor caso
  **−34.965 s = 9,7 horas**. Hoy sella con reloj de pared **inyectado**; verificado en vivo con **0
  contradictorias** en los tres tipos de job. Y el cambio salió barato por dato, no por suerte: `completed_at`
  del outbox **no tiene lectores**, `finishLease` **no toca `available_at`**, y el instante de dominio **ya
  tenía su columna** en los siete caminos.
- **El attempt en vuelo no necesitaba proyección nueva: necesitaba un LINK.** `coarseProgress` ya existía y era
  browser-safe, pero su reader pide `runId` y `LabExperimentV1` no lo llevaba. Tercera aparición de «la
  capability existe y la UI no la consume». Verificado con una corrida EN CURSO: se leía `running` con
  `attempts: 0` y el reader nuevo respondió `provider-running/queued, providerAccepted=true`.
- **Hallazgo colateral:** `coarseProgress` estaba transcrito **tres** veces y coincidían — por eso el riesgo era
  invisible. Hoy es dato único con el SQL generado; el `ELSE 'terminal'` se retiró porque presentaba un estado
  desconocido como corrida terminada.
- 🔴 **El canary estaba ROTO desde ayer y `pnpm check` seguía verde**: un comentario de bloque escribió una
  expresión de cron literal cuyo `*/` cierra el comentario, y la suite importa la *lib* del canary y nunca el
  *script*. El instrumento de salida de todo rollout no corría. Guard nuevo parsea todos los entrypoints.
- **[`ISSUE-139`](docs/issues/resolved/ISSUE-139-globe-output-descriptor-advertises-per-modality-mime-guess.md)
  (ajena, resuelta):** el descriptor de output anunciaba un MIME adivinado **por modalidad** — un MP3 servido
  como `audio/mpeg` se anunciaba `audio/wav`. Imagen y video pasaban porque su default **coincidía por
  casualidad**. Lo destapó el canary de generación real; re-verificado sobre los mismos assets con **cero gasto
  adicional**.

**Sigue abierto:** los 3 criterios NO VERIFICADOS de abajo, el webhook de OpenAI sin evidencia de runtime, y
**D12 de `ISSUE-138`** (`storageUri` de Veo), que necesita un canary con gasto y es decisión del operador.

- **Huérfanos 4 → 0** en un solo batch, con el motivo real propagado (tres códigos distintos, ningún
  genérico) y el batch siguiente en `convergedExperiments=0` — el barrido es idempotente.
- **El invariante quedó enumerable, no como arreglo de una pareja:** un agregado nuevo sin postura rompe el
  build y un `observable` sin señal se rechaza. La señal `run_aggregate_divergence` existe para que una
  TERCERA pareja se vea en el tablero en vez de descubrirse en producción, que es como apareció la segunda.
- 🔴 **`outboxDeadLetter` no tenía sólo mal el nombre: MEDÍA MAL** — contaba filas de outbox y decía **3 para
  UN solo attempt**. Ya en producción marca `1`. Y `state='dead'` **sí existe**, escrito por la recuperación
  histórica de crédito. Corrige lo que decía este Handoff. **ISSUE-135 punto 1 cerrado.**
- Al aplicar salió un defecto propio: **el aligner es función del TIPO de métrica** — `ALIGN_COUNT` sólo vale
  sobre DELTA/INT64; una métrica que extrae valor necesita `ALIGN_PERCENTILE_99`. Mirar la pieza hermana está
  bien; mirar CUÁL hermana aplica es la otra mitad de la regla.

🔴 **La task NO está complete: la reabrí.** La deuda de convergencia sí quedó cerrada y verificada, pero la
había movido a `complete/` con su bloque `## Acceptance Criteria` —22 ítems del carril webhooks/completion,
que es el corazón de su título— **sin recorrer**. Reconciliado ahora con evidencia: **19 marcados**, **3
declarados NO VERIFICADOS** (deadlines independientes por etapa, policy de fallback —dueña `TASK-1470`— y
conformance API/SDK) y **el webhook de OpenAI sin evidencia de runtime** (sus 4 intentos corren por `poll` y
no hay ninguna señal suya; puede ser correcto por diseño, pero está supuesto).

El carril de webhooks SÍ funciona y hay evidencia: **34 entregas reales de Fal** recibidas, verificadas por
Ed25519/JWKS sobre el body crudo y procesadas; ack en 202 sin descargar ni liquidar; Veo por
`predictLongRunning`→`fetchPredictOperation`.

### 🔴 Auditoría de los tres proveedores (Delta 2026-08-04 (c)) — tres agujeros que pierden un asset pagado

La captura es **correcta en su forma** en los tres, y `poll` para OpenAI es correcto **por diseño** (OpenAI no
emite eventos de imagen). Pero la auditoría contra la doc oficial destapó 13 huecos; los tres graves los
verifiqué yo leyendo el código:

- **Fal:** el rescate del lost-ack recupera el `request_id` pero **no las URLs** de status/response, y ambas
  salidas las exigen → run trabado con el asset ya facturado, teniendo el id en la mano.
- **Veo:** techo de **2 MB** en el poll contra un video que vuelve **inline en base64** (el driver declara 64 MB)
  → revienta exactamente en el poll del éxito. El repo ya resolvió esto para OpenAI con 24 MB y no lo replicó.
- **Omni:** generación de minutos dentro de una lease de **60 s**; si vence, `reconcile` exige un id que nunca
  se escribió — y los bytes ya se ingirieron a GCS con su hash perdido.

Más: el submit de imágenes de OpenAI **no tiene timeout** (el de Fal sí) y su anti-doble-cobro depende de un
`idempotency-key` **no verificado**; y `reconciliationFailureCode` lee `.errorCode` mientras el error expone
`.code`, así que **todos** los códigos del poll colapsan en uno — `ISSUE-127` en el único camino donde no se
había arreglado, y es lo que vuelve invisible al agujero de Veo.

### ✅ Resueltos (2026-08-04) — 11 en código, 2 declarados

Nueve commits en Globe `main` (`0e9d696` → `0b5f875`), `pnpm check` + `pnpm build` verdes en cada uno. Detalle
en [`ISSUE-138`](docs/issues/open/ISSUE-138-globe-provider-completion-capture-loses-paid-assets.md).

Lo que más vale recordar de la sesión:

- **El guard nuevo derivó el vocabulario del archivo fuente y encontró CUATRO códigos que se me habían
  pasado.** Copiar la lista a mano habría dado verde con el defecto adentro.
- **Un test existente atrapó que mi clasificación de D8 era demasiado gruesa** (un cuerpo sobredimensionado
  también es definitivo, no infraestructura). Separar por remedio, otra vez.
- **En D6 la salida no era inferir del status: Fal publica `X-Fal-Retryable` y la estábamos ignorando.**
  Respetar la señal del proveedor vale más que cualquier heurística nuestra.
- **La doc de Fal en vivo cerró D1 y D7.** Devolvía 429 a todo fetch programático **pero es alcanzable desde
  el navegador real** — vale recordarlo la próxima vez que una doc parezca inaccesible. Confirmó que la base de
  la queue **no es derivable**: medido contra nuestros propios datos, un endpoint descarta 3 segmentos y otro 1,
  y su doc muestra uno que conserva 3. La regla dura era correcta, así que la base se **declara por endpoint**
  desde evidencia real.
- **Verificado con una generación real** sobre el runtime desplegado: run `completed`, experimento
  `candidate_ready`, governance `eligible`. **La captura funciona de punta a punta.**
- **D9 cerrado con el valor MEDIDO**, y el resultado justifica haberme negado a adivinarlo: el user id de Fal
  es un identificador estilo Auth0 (`github|…`) que **no se parece en nada** al username de su panel.
  Suponerlo habría rechazado todas las entregas. Aplicado y verificado en la revisión viva.
- 🔴 **El canary abortaba sobre un sistema sano.** Daba timeout a los 20 min mientras la corrida completó sola
  en la entrega 21: el cuello no era el proveedor sino que **Asset Governance corría cada 5 minutos** y avanzaba
  un estado por tick (~20-25 min en frío). Su paciencia estaba por debajo de la latencia real del sistema que
  vigila. Subido a 45 min — un canary que aborta sobre algo sano enseña a leer «timeout» como normal.
  **Delta 2026-08-04: el cron bajó a `*/1` (`ISSUE-137`) y la latencia real es ~7,9 min**, así que los 45 min
  quedaron ~5× por encima (eran ~2×). El presupuesto sigue siendo correcto; el número viejo ya no.
- **Queda sólo D12**, acotado: la retención de la Operation de Vertex sigue sin documentarse, pero D2 ya cerró
  su modo de fallo — resta una ventana de latencia, no una pérdida. Su arreglo (`storageUri`) tiene dueño y no
  se implementó detrás de un flag involtable, que sería el código muerto que D13 vino a limpiar.

**Rollout ejecutado:** los tres runtimes en **`07baef97af9a`** (drift guard verde: API `00204-ttm`, Studio
`00147-gq4`, worker `sha256:26fc3ded0c30`), con salud post-deploy limpia.

**⚠️ `GLOBE_FAL_USER_ID` cableado y sin configurar, a propósito.** El panel de Fal no expone ese identificador
como valor; ponerlo mal rechazaría TODAS las entregas legítimas. El sistema lo **observa** sobre una entrega ya
verificada (`globe.provider_webhook.account_identity_observed`) mientras siga sin configurar: con la próxima
generación queda el valor medido.

**`TASK-1632` queda bloqueada sólo por D12**, que es una ventana de latencia y no una pérdida: se cierra
pasando `storageUri` —lo que además elimina el costo de memoria del presupuesto derivado— y exige un canary
con gasto real, o sea decisión tuya.

### 🔴 Trampa de infra viva (dueño: `TASK-1635`, NO 1469)

`tofu apply` desde un checkout limpio **destruye los 20 recursos del entorno de desarrollo**:
`development_environment_enabled` tiene default `false` en git y el entorno vivo depende de un
`terraform.tfvars` **gitignoreado**. El apply de hoy se hizo con
`-var development_environment_enabled=true -var 'development_operator_principal=user:julio.reyes@efeonce.org'`
→ `0 to destroy`. El arreglo de fondo —el estado real de un flag no puede vivir en un archivo sin trackear—
sigue abierto.

## TASK-1635 — `pnpm globe:dev`: el loop rápido de Globe, funcionando (2026-08-03)

Ver un cambio de UI de Globe costaba construir imagen y desplegar tres runtimes. Ahora cuesta guardar el
archivo. Detalle y las dos correcciones de tesis en
[`TASK-1635`](docs/tasks/in-progress/TASK-1635-globe-local-development-multimodal-harness.md) — leer su
**último Delta**, que es el estado vigente.

Commiteado en Globe `main`, local, **sin push**: `864ce68` · `f1b8e6e` · `8c91fa9` · `9d44091` · `68c4b99` ·
`c8767d0` · `ee8872f`. `pnpm check` en verde.

- `pnpm globe:dev` sirve el **mismo shell que producción** con un bundle que apunta a Vite. **HMR verificado de
  punta a punta en navegador real**: se editó copy, entró sin recarga, se restauró y volvió.
- Dos defectos que **sólo se veían mirando la pantalla**: el preamble de Fast Refresh que falta cuando el
  documento no lo sirve Vite (pantalla negra, consola limpia), y que **un nonce en `style-src` anula
  `'unsafe-inline'`** (contenido correcto, cero estilos). Ninguno aparece en un test ni en un código HTTP.
- **La premisa inicial era falsa** y la desarmó una pregunta del operador: Globe ya separa por `workspace_id`
  y el tope de gasto también, así que una base de datos aparte sólo aporta cuando el cambio toca el **schema**.
  Se construyó infraestructura antes de preguntar qué clase de cambios se iban a hacer.
- Lo que quedó del desvío y sirve igual: `packages/database` ahora **se puede ejercitar sin nube** (antes el
  connector estaba cableado a la fuerza) y un Postgres local en la versión exacta de producción, listo para el
  día que un cambio toque el schema. La base creada en Cloud SQL fue destruida; instancia y base productiva
  intactas.

**Pendiente con bloqueo nombrado:** datos reales en el loop. El cableado está hecho (el dev shell actúa como el
BFF y mintea el token server-side), pero el usuario operador **no tiene `serviceAccountTokenCreator` sobre
`greenhouse-globe-caller`**. Otorgarlo es decisión: ese principal carga `globe.lab.experiment.run`, o sea
autoridad de gasto.

El despliegue por lote sigue en [`TASK-1636`](docs/tasks/to-do/TASK-1636-globe-deployable-promotion-bundle.md).

## SKY Blog — propuesta técnica V2 y arquitectura económica (2026-08-03)

- V2 técnica append-only en [`docs/commercial/tenders/sky-blog-2026/`](docs/commercial/tenders/sky-blog-2026/): fuente,
  deck enriquecido de 29 láminas y manifiesto de evidencia; Notion/Content Hub es el hub editorial propuesto y
  WordPress queda como superficie de publicación. El borrador comprimido de 17 láminas y la V1 se conservan.
- La composición pasó slots y revisión visual; `.captures/` es `workshop_only`, sin render productivo ni `verified`.
- La económica V2 ya tiene fuente, deck separado de 9 láminas y Excel generado: **CLP 3.000.000 netos/mes sin
  IVA**, IVA 19% **CLP 570.000**, total mensual con IVA **CLP 3.570.000**; Notion/Content Hub incluido como
  hub de la operación, newsletter incluida y Addons separados.
- La sesión quedó trazada en HubSpot como nota `114121518673` sobre el deal `62535094842`; no se modificaron
  monto ni etapa. La nota registra contexto, guardrails internos y siguientes pasos.
- La técnica y la económica siguen en `.captures/` como `workshop_only`; falta validar capacidad, cost-to-serve,
  margen y frontera de contenidos nuevos antes de registrarlas como oferta productiva.

## TASK-1633 — el contrato creativo declara; falta que APLIQUE (2026-08-03)

**Estado: 10 de 17 criterios, `in-progress`.** El eje de **declaración** está cerrado; el de **aplicación** no
empezó. Criterio por criterio en
[`TASK-1633`](docs/tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md)
(`## Acceptance Criteria`) y en
[ADR-022](docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md) (Deltas b y c).

**Runtime de Globe verificado hoy contra Cloud Run/Artifact Registry: los tres en `d58bc6f`** — API
`globe-api-internal-00202-74w`, Studio `globe-studio-internal-00145-q2w`, worker digest `sha256:3c510416…`
(= tag `d58bc6f4d300`). `main` local en `949a58c`, sólo docs por delante.

### Lo que ya corre en producción

- **Contrato creativo por ruta:** 8 códigos de rechazo nombrados donde había uno que colapsaba nueve causas;
  38 razones del compiler clasificadas `terminal`, 3 `transient`, 2 `unknown` declaradas; catálogo `1.7.0`;
  `valueShape`; vocabulario único brief↔contrato; compilación del prompt por ruta (el peso ordena y ya no se imprime).
- **Lifecycle de runs — es de [`TASK-1469`](docs/tasks/in-progress/TASK-1469-globe-governed-run-lifecycle-submission-fence.md), no de 1633:**
  la fase entra en la política de reintentos (post-gasto abandonar cuesta distinto que pre-gasto); un run terminal
  cierra su experimento vía el puerto `RunFinalizerPort.abandon`; `generated_asset_governance_pending` entra a la
  allowlist y se clasifica `waiting`; una espera deja de heredar el backoff exponencial de error (10 s fijos en vez
  de hasta 5 min).
- [`ISSUE-136`](docs/issues/resolved/ISSUE-136-globe-composer-command-palette-rebuilds-per-keystroke.md) cerrado
  (`011d0eb`): el composer reconstruía la paleta de comandos en cada tecla y React cortaba con el error #185.
- `scripts/globe-runtime-drift.mjs` (Globe): compara los tres runtimes entre sí **y** contra `origin/main`.

### Los 7 criterios abiertos, agrupados por trabajo real

- **(a) Un solo trabajo — el adapter.** La compilación detrás del adapter con su revisión en el fingerprint
  (`promptCompilerRevision` **no existe**: cero ocurrencias por grep), los fixtures de traducción por adapter
  (la mitad «un motor sin branch por ruta» ya está probada) y la invalidación del estimate ante cambio de
  controles. Los tres se cierran juntos cuando la compilación deja de ser una función global de `domain`.
- **(b) Dos de lectura, no de código.** Declarar el mecanismo por ruta con evidencia del contrato oficial del
  proveedor —**13 de 17 rutas heredan el default**, `negative-prompt` incluido, y **ningún adapter tiene campo
  negativo nativo**— y la evidencia de controles aplicados/rechazados en el manifest.
- **(c) Dos de higiene.** Slice 4 (dual-read/equivalence de rutas legacy) y uno que **NO es de 1633**: que un
  consumer lea la proyección es criterio de [`TASK-1552`](docs/tasks/in-progress/TASK-1552-globe-producer-composer-focused-creation.md)
  — el descriptor ya viaja al navegador (`ProducerCatalogViewV1.creativeContract`) y el composer lo ignora
  (cero ocurrencias en `apps/studio-client/src`).

**1633 ya no depende de nadie para cerrar:** se le sacó el canary de Omni (migró a `TASK-1504`) y el criterio de
consumers es de 1552.

### Próximo paso, en este orden

1. El bloque del adapter de 1633 (grupo **a**).
2. El composer de 1552 leyendo el descriptor.
3. Cerrar los 4 puntos abiertos de `TASK-1469`, que es lo que desbloquea `TASK-1632`.

### 🔶 Riesgos vivos

1. **El canary de Omni sigue bloqueado por el TRANSPORTE (`TASK-1504`), no por IAM.** El bloqueo de IAM sí se
   levantó (`TASK-1635`, Globe `786ee19`). **Son dos cosas distintas y confundirlas lleva a correr un canary
   inválido:** el binding declara `provider=vertex-omni` mientras el runtime inyecta Generative Language, así que
   cobraría por una identidad distinta de la aprobada.
2. **Si aparece una regresión de calidad, el primer sospechoso es el peso.** Quitarlo del prompt cambió el texto
   que recibe el modelo en TODAS las rutas y **no se verificó con canary** (bloqueados por lo anterior).
3. **«Upscale con estilo dejó de funcionar» es esperado**, no un defecto: ahora da error **sin gasto** en vez de
   generar ignorando el estilo y cobrar igual. La UI que evita el caso es `TASK-1552`.
4. ~~Experimentos huérfanos, señales sin cablear y el nombre `outboxDeadLetter`~~ — **los tres cerrados y
   verificados en runtime** por `TASK-1469` (ver arriba). Lo único que queda vivo de ese frente es la trampa
   del `terraform.tfvars` gitignoreado, que es de `TASK-1635`.

### Nota operativa

Tres carriles de credenciales distintos —`gcloud` CLI, ADC y el Cloud SQL **Connector**— y el CLI puede estar vivo
mientras el Connector se cuelga (`invalid_rapt` es reauth). Comandos en
[el manual](docs/manual-de-uso/creative-studio/operar-contrato-creativo-ruta-globe.md).

## TASK-1631 / MCP — canon de scopes, CIMD como registro primario y benchmark de proveedor (2026-08-02)

- **Cambio de invariante en el ADR propuesto** `EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (sigue
  `Proposed`, sin aceptar): **DCR quedó deprecado en la spec MCP vigente** y el orden normativo pasa a
  pre-registro → **CIMD** → DCR → manual (`SHOULD` para CIMD contra `MAY` para DCR, verificado 2026-08-02). Un
  proveedor con DCR y sin CIMD ya **no cumple** el requisito. Afecta el criterio de selección, no el runtime.
- **Riesgo de `subject` pairwise descartado con medición:** los once candidatos SaaS emiten `public`. El único
  `pairwise` es Entra —carril interno— y particiona por **App ID**, no por sector identifier del estándar, así que
  desktop y web con la misma App Registration comparten `sub`; el identificador estable cross-app sigue siendo
  `oid`+`tid`, que el write de fondeo ya usa. Se corrigió la advertencia previa sobre host de redirect.
- **Canon de scopes sincronizado, drift cero verificado por grep** en 15 archivos (arquitectura, runbook, doc
  funcional, manual de operador, `GLOBE_RUNTIME_HANDOFF`, TASK-1473/1626/1631, plan, ambos espejos de
  `efeonce-mcp-platform` y el overlay Codex-only `software-architect-2026`). Lo verificado es co-emisión **base +
  reader**; el write interno `efeonce.mcp.globe.credits.funding.ensure` es un tercer scope declarado, flag-gated,
  con consentimiento propio y **no** verificado en esa co-emisión. `pnpm skills:mirrors` verde.
- **Hallazgo de seguridad que TASK-1631 ahora gobierna:** el verificador del gateway es single-issuer, descarta el
  `subject` (`clientId = azp ?? sub`) y fusiona `roles` dentro de `scopes`. Con un segundo issuer eso permitiría
  que un scope string externo satisficiera una tool internal-only. La task exige autoridad calificada por issuer,
  contexto con `issuer`/`subject`/`clientId`/`audience`/`delegatedScopes`/`roles` separados y binding por
  `(issuer, subject)`. Nada de esto está implementado: es diseño gated.
- **Benchmark de proveedor con precios oficiales:** WorkOS confirmado a **USD 99/mes planos** en 1/5, 5/25 y 20/100
  (el costo lo fija el custom domain, no el volumen; organizaciones sin cargo ni tope). Runner-up Stytch (USD 0
  base, precio de dominio no público). Logto y FusionAuth descartados por no soportar DCR. Curva a modelar:
  SSO/SAML de WorkOS a **USD 125 por conexión/mes**.
- **Nueva alternativa documentada:** Greenhouse ya tiene NextAuth y un broker OAuth sister-platform con PKCE,
  allowlists, tokens opacos hasheados, revocación, audit y userinfo. Es una foundation reutilizable, no un
  authorization server MCP público: requiere extracción independiente a `auth.efeonce.org`, metadata/CIMD-DCR,
  callbacks HTTPS hospedados, consent/grants y contrato de verificación compatible con el gateway. TASK-1631 ahora
  compara WorkOS vs native extraído vs hybrid; ninguna opción está aprobada y Greenhouse cookies/`NEXTAUTH_SECRET`
  nunca se comparten.
- **TASK-1631 quedó `template=1, errors=0, warnings=0`** tras reescritura completa (antes linteaba `legacy`) más
  cuatro rondas de revisión cruzada. Sigue `to-do` y **bloqueada por tres gates**: aceptación del ADR, aprobación
  de proveedor/plan con costo presentado, y **revisión de privacidad/subprocesador** — gate nuevo, porque es el
  primer flujo que rutea PII de personas de organizaciones cliente a un procesador externo.
- Sin cambios de runtime, secretos, DNS ni provisión externa. Commits: `746999fed`, `8533fd533`, `1c7dcce3a`,
  `0155f1f77`, `6f57819ca`, `385cbf76b`.

## Finance Core + Cost Accounting + cotización agentic — planificación (2026-08-02)

- [ADR-021](docs/architecture/GREENHOUSE_FINANCE_CORE_ACCOUNTING_FOUNDATION_DECISION_V1.md) aceptado; `EPIC-012`
  es owner. Sus 11 candidatas no estaban reservadas y deben reenumerarse desde TASK-1634 al confirmarlas.

## Gate canónico de licitaciones / Brightcell (2026-08-02)

- Se agregó `pnpm tender:canonical-gate <slug>` y el registro durable `proposal-studio.json`. Una salida de
  `pnpm deck:compose` bajo `.captures/` queda explícitamente en `workshop_only`; no es Proposal ni asset productivo.
- El gate solo pasa con `status=verified`, `proposalId`, render job `client_facing` completado, PDF/previews
  versionados en `proposal_assets` y verificación autenticada del Portal/API. `pnpm qa:gates --changed` lo ejecuta
  y reporta `BLOCK` si falta la cadena.
- Brightcell quedó documentada en `workshop_only`; regularización pendiente en Proposal Studio. No se ejecutó
  creación de Proposal, render productivo, gcloud ni ADC durante esta implementación.

## TASK-1614 — canary cerrado (2026-08-02)

- TASK-1614 está completa: Seedance motion terminó `canary_passed` con 16 créditos, playback/governance y lineage.
  No reabrir su evaluación/promoción/fondeo; el próximo Seedance es sólo la regresión UI exigida por TASK-1633.

## WIP saneado — Globe, Brightcell y Polpaico (2026-08-01)

- ADR-019 `Accepted`; ADR-020 `Proposed`. Brightcell: **no enviar** hasta Finance. Polpaico: `HOLD / NO-BID`, sin precio/deck emitible. Detalle en `changelog.md`.

## Studio Credits — fondeo enterprise UI/API/CLI/MCP y readback convergente (2026-08-01)

- Saldo vigente esperado: 784 de cap 1500; no fondear. UI/CLI/MCP comparten ledger y todo transporte ambiguo exige
  readers antes de reintentar. Contrato/runbook: [`fondeo`](docs/manual-de-uso/creative-studio/fondear-creditos-globe.md)
  y [`evidencia`](docs/operations/creative-studio/evidence/2026-08-01/README.md). Sin rollout externo.

## Checkout compartido único — worktrees prohibidos (2026-08-01)

- Se eliminaron los dos worktrees temporales creados erróneamente bajo `/private/tmp/greenhouse-mcp-push.*` y el
  worktree de rescate `/Users/jreye/.codex/worktrees/ecd5/greenhouse-eo`, que estaba limpio, 777 commits detrás y
  0 por delante de `develop`. Greenhouse conserva un único checkout en `develop`; Globe uno en `main`.
- Todo agente debe operar sólo en el checkout compartido actual. No puede crear, usar, integrar, limpiar ni
  eliminar worktrees, checkouts aislados o carpetas clonadas; si el estado compartido bloquea, debe detenerse y
  pedir dirección al operador. Canon:
  `docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`.
- Se retiró el drift que todavía inducía Globe `develop`: `efeonce-globe/AGENTS.md` ahora fija `main` como rama
  única de trabajo/integración/release, CI sólo acepta push a `main`, EPIC-028 declara el contrato por repositorio
  y el helper `worktree-sync` quedó retirado fail-closed. `pnpm codex:task-hook:check` bloquea la reintroducción
  de ramas por task o comandos activos de worktree; el pre-commit ejecuta `lint-staged --no-stash` para no apartar
  WIP ajeno. Un commit no autoriza deploy automáticamente.

## Globe — ADR-018: continuidad móvil native-first como dirección, no rollout (2026-08-01)

- [ADR-018](docs/architecture/creative-studio/EFEONCE_GLOBE_MOBILE_CONTINUITY_APPLICATION_DECISION_V1.md) fija Globe como **continuity-first y native-first para Android/iOS**: React Native + Expo development builds/CNG es la dirección tecnológica de la companion; web/PWA queda como fallback. No se creó una skill nueva, no hay app/runtime rollout y el vertical slice requiere PKCE, deep links, captura, upload interrumpible, push reconciliable, handoff, compatibilidad binary/API, task, policy, owner y gates. Funcional/manual: [`mobile continuity`](docs/documentation/creative-studio/efeonce-globe-mobile-continuidad.md) · [`validación`](docs/manual-de-uso/creative-studio/operar-globe-continuidad-movil.md).

## Efeonce MCP — reader y write one-shot de Studio Credits verificados (2026-08-01)

- `mcp.efeonce.org`, el reader Globe y el write interno one-shot están operativos; clientes externos siguen gated
  por TASK-1631.
- TASK-1631 separa sesiones, no identidades: un `identity_profile` + Account 360; linking, revocación y convergencia
  posterior del login Greenhouse preceden el rollout.

## AXIS — guía visual agent-facing publicada (2026-08-01)

- `efeoncepro/axis-design-system` publicó `DESIGN.md` en `main` mediante `0e3c4d6`.
- El documento sigue el formato alpha de Google, pero es una proyección generada desde `packages/tokens`,
  no un segundo SSOT. `pnpm design:generate` lo regenera y `pnpm design:check` detecta drift; CI lo valida.
- Las skills AXIS de Codex y Claude, el runbook, la arquitectura UI y `project_context.md` ya apuntan a la
  guía. Greenhouse conserva su `DESIGN.md` separado como contrato específico MUI/Vuexy.
- `TASK-1590` llevó el Lab desde Vite vanilla a Astro `7.1.6`: salida estática, Content Loader tipado,
  catálogo y rutas por pattern, documentación MDX, sitemap, metadata SEO, script vanilla mínimo, Vitest y
  Playwright desktop/mobile. No hay React, SSR, Actions, secretos ni imports desde Greenhouse/Globe.
- Verificado en el repo AXIS: `pnpm install --frozen-lockfile`, `pnpm design:check`, `pnpm build`,
  `pnpm typecheck`, `pnpm test`, `pnpm lint`, `git diff --check` y preview local HTTP 200.
- Estado honesto: el runtime base está desplegado, pero la migración del catálogo Greenhouse sigue abierta.
  Las entradas no reconstruidas son `reference skeletons`; no se retira `/design-system` hasta cerrar parity
  contractual, funcional, estética, motion, accesibilidad y evidencia de consumidor. `TASK-1382` no es dependencia.
- Rollout realizado el 2026-08-01: deployment `dpl_8TohYh27fJizvDVC3MV5aoemvFPK`, alias público
  `https://axis-design-system-lab.vercel.app`, `READY`, Astro/output `apps/lab/dist`, Node 24. Se retiró la
  protección SSO del proyecto porque el Lab ya tenía decisión explícita de ser público; `/`, `/docs/`,
  `/references/colors/` y `/sitemap-index.xml` responden `200`.
- Empezó la migración Greenhouse → AXIS: `colors`, `typography`, `geometry` y `elevation` ya tienen referencias
  token-backed en `/references/colors/`, `/references/typography/`, `/references/geometry/` y
  `/references/elevation/`; el inventario y el triage están en
  [`AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md`](docs/architecture/AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md).
- El primer bloque pure-UI tiene contratos publicados; `button`, `chip`, `breadcrumbs`, `floating-surface`, `motion` y
  `charts` y `disclosure` están documentados como `candidate parity`; `loaders` sigue siendo skeleton. La
  migración continúa y `/design-system` permanece como fallback hasta cerrar parity visual y de consumidores.
- También quedaron publicados `motion` y `border-beam` como contratos portables; `motion` ya tiene una reconstrucción
  de candidate parity en AXIS (`95bc3f2`): seis duraciones, cuatro easings, cuatro variantes, replay, estado
  manual sin motion y E2E responsive/reduced-motion. `microinteractions` sigue fuera
  del traslado inicial porque mezcla múltiples primitivas y estados de producto.
- `composition-shell` y `card-density` ya tienen fixtures estáticos en AXIS; el shell de Portal y su telemetría
  siguen excluidos del Lab público.
- El catálogo pure-UI también cubre `charts`, `roadmap-timeline`, `team-avatar-group` y `surface-recipes`; aún
  faltan las comparaciones visuales contra consumidores antes de retirar el fallback Greenhouse.
- `gradients` ya tiene fixture portable y `utilities` ahora se representa mediante `efeonce.activity-timeline`,
  sin datos operativos ni registros de auditoría.
- `brand-logos` ya tiene el gate público de provenance; los assets reales no se trasladan hasta tener source,
  licencia y checksum aprobados.
- `buttons` ya tiene una reconstrucción de candidate parity en AXIS (`b1c9869`): boards light/dark, 152 controles,
  matrices completas y E2E responsive/reduced-motion; falta el compare visual/computed contra Greenhouse MUI/Vuexy.
- `chips` ya tiene una reconstrucción de candidate parity en AXIS (`028dba2`): boards light/dark, 72 especímenes,
  avatar/closable, feedback atoms, spotlight/signal motion y reduced-motion; falta el compare visual/computed y
  provenance del avatar sintético.
- `breadcrumbs` ya tiene una reconstrucción de candidate parity en AXIS (`6979641`): cuatro ports, overflow nativo,
  variantes/kinds, hit area cómoda, motion sutil y reduced-motion; falta el compare visual/computed contra Greenhouse.
- `floating-surface` ya tiene una reconstrucción de candidate parity en AXIS (`72d03f4`): seis variantes V1, roles
  tooltip/menu/dialog, menú, editor dirty-safe, motion anchored y reduced-motion; falta compare visual/computed y
  focus return real contra el consumer Greenhouse.
- `disclosure` ya tiene una reconstrucción de candidate parity en AXIS (`0.1.1`): cuatro triggers con rotación/morph,
  contextualEditor, actionMenu, Escape, outside press, focus return, dirty guard y quickPeek explícitamente fuera de
  scope; falta compare visual/computed contra Greenhouse y canary del consumer.
- `leaderboard` ya tiene contrato y fixture estática con datos sintéticos; `brand-motion` ya tiene contrato y
  referencia orbital HTML/CSS sin SVG privado ni GSAP. El Lab queda en 27 páginas y 21 contratos; build, lint,
  typecheck, tests y 32 E2E pasan (4 escenarios con skip por proyecto). `axis.efeonce.org` ya resuelve a `76.76.21.21` y el smoke HTTPS devuelve `200`.
  La siguiente continuidad debe continuar con `handoff`, `microinteractions` y las superficies con API.

## Globe Producer — seis defectos de superficie, el pie de la app y la paginación del feed (2026-08-01)

Sesión reportada por el operador **mirando la pantalla**. Tres PRs mergeados y **desplegados**:
[#66](https://github.com/efeoncepro/efeonce-globe/pull/66), [#69](https://github.com/efeoncepro/efeonce-globe/pull/69),
[#73](https://github.com/efeoncepro/efeonce-globe/pull/73) — main `8989074`, verificado en vivo en
`globe.efeoncepro.com`.

**Lo entregado:** barra del documento tokenizada + `scroll-behavior: smooth` y barra del composer que se revela
en hover; anillo de créditos con hueco opaco que ahora mide el **ciclo** y no el stock, con `flame` en vez del
`sparkles` genérico de IA; `⌘K` como unidad (8 px → 2); controles de selección de las cards centrados y
honestamente apagados; **pie de la aplicación** con el wordmark de Efeonce, que el port a React había perdido;
barra del feed con alturas uniformes y alineada; y **paginación hacia atrás** del feed (25 → 50 piezas
verificado en vivo).

🔴 **Dos veces el mismo patrón en un día: la capability existe y la UI consume la mitad.** El compare de las
cards tiene su diálogo sólo en el legacy, y el feed tenía cursor keyset en el backend desde `TASK-1525` con el
`nextCursor` ignorado. Antes de declarar que «falta» una capacidad en el Producer, **verificar si ya está en el
contrato y sólo falta cablearla**.

🔴 **Regla del feed que no se ve desde el cliente:** una página hacia atrás no puede mover el `watermark` — el
backend lo calcula desde el último item, que hacia atrás es el más viejo, y adoptarlo hace re-traer todo lo ya
visto con la pantalla viéndose perfecta. Por eso el modo (`sync`/`changes`/`older`) viaja explícito.

⚠️ **Trampa operativa que costó reencauzar trabajo:** `gh pr merge --delete-branch` deja al agente en `main`
**local**, que en `efeonce-globe` suele estar viejo y divergente; se siguió editando sobre esa base sin notarlo.
Después de cualquier merge, `git rev-parse --abbrev-ref HEAD` antes de seguir.

⚠️ **Merge a `main` NO despliega.** `deploy-internal.yml` es `workflow_dispatch` manual: el operador vio el
`sparkles` viejo después del merge y eso es indistinguible de «el cambio no funcionó».

**Documentado en:** la skill `greenhouse-globe` (ambas copias, con el catálogo de las seis clases de defecto y
las trampas operativas) y el `Delta 2026-08-01` de
[`TASK-1559`](docs/tasks/in-progress/TASK-1559-globe-feed-viewer-client-port.md).

**Abierto:** (1) la píldora «N nuevas» — las novedades siguen entrando solas y empujando el contenido;
(2) **el anillo de créditos hoy no comunica capacidad operativa** porque el reader no expresa correctamente
período, funding, caps y holds. La decisión ya no está abierta: TASK-1482 corrige la verdad, TASK-1586 publica el
self-status y TASK-1628 lo consume sin matemática local;
(3) el `main` local del operador sigue divergente con 2 duplicados de trabajo ya mergeado.

## MiniMax H3 — documentación y task de integración Globe (2026-07-31)

- Fal live confirmó tres endpoints comerciales activos: `minimax/h3/text-to-video`,
  `minimax/h3/image-to-video` y `minimax/h3/reference-to-video`, con snapshot de precio de
  `USD 0,26/s`. La consulta y los probes fueron de catálogo/validación; no hubo generación.
- Se documentó la propuesta en [`EFEONCE_GLOBE_MINIMAX_H3_INTEGRATION_PROPOSAL_V1.md`](docs/architecture/creative-studio/EFEONCE_GLOBE_MINIMAX_H3_INTEGRATION_PROPOSAL_V1.md).
- Se creó [`TASK-1616`](docs/tasks/to-do/TASK-1616-globe-minimax-h3-fleet-producer-integration.md),
  todavía `to-do`: integra las tres rutas, referencias image/video/audio, contratos, Producer,
  ingest/retrieval, rates, rights, evaluación, canary y promoción. No se ejecutó código de Globe.
- Siguiente paso: tomar `TASK-1616` con su goal/preflight, revisar ADR y ejecutar el plan en
  `efeonce-globe`; no marcar H3 `available` antes de los gates de onboarding y promoción.

## Fal challenger models — documentación y tasks Globe (2026-07-31)

- La consulta autenticada de Fal del 2026-07-31 confirmó rutas activas para Kling 3/O3, Grok Imagine Video, Wan 2.7 y FLUX.2 Max/Edit; el discovery oficial del 2026-08-04 añadió once endpoints activos de FLUX 3 Video, documentados por separado en `TASK-1642`.
- Se documentó la matriz de capacidades y reutilización/extensión en [`EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`](docs/architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md).
- Se crearon `TASK-1617` Kling, `TASK-1618` Grok, `TASK-1619` Wan y `TASK-1620` FLUX.2. Son tasks separadas porque sus schemas, derechos, rates, outputs y canarios no son intercambiables; comparten el seam Fal y las extensiones de Producer de `TASK-1616`/`TASK-1573`.
- No se ejecutó código ni generación. Antes de implementar cada task se debe revalidar OpenAPI y pricing autenticados; todas las rutas parten `gated`.
- **Delta 2026-08-04 — FLUX 3:** Fal devuelve once endpoints activos (cinco estándar, cinco draft y `draft-enhance`) y BFL mantiene el producto/API directo en Early Access. Se creó [`TASK-1642`](docs/tasks/to-do/TASK-1642-globe-flux3-video-fleet-producer-integration.md) y la propuesta [`EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md`](docs/architecture/creative-studio/EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md). La discrepancia `blackforestlabs/...` vs `fal-ai/...` exige discovery autenticado y submit controlado; no hay código ni promoción en `../efeonce-globe`.
- La task cubre keyframes posicionados, first/last, extend, audio evidence, `duration: auto`, `draft_cache`, rates, rights, evaluación, canary y rollback. Siguiente paso: tomarla con su goal/preflight; todas las rutas parten `gated`.
