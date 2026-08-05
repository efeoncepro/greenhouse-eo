# Handoff activo

### EPIC-028 — Producer V3: contratos de diseño y plan de ejecución (2026-08-05)

**Estado:** contratos de diseño `design-ready`; no se modificó runtime ni se creó una task paraguas. La
decisión es un solo shell del Producer con tres estudios adaptativos —Image, Video y Audio— gobernados por
`RouteCreativeContract`, con feed/muro y asset workspace compartidos.

**Artefactos creados:** dirección visual, wireframes, flujo de usuario, contrato de motion y plan operativo:

- [`EPIC-028-producer-v3-unified-studios.md`](docs/ui/visual-directions/EPIC-028-producer-v3-unified-studios.md)
- [`EPIC-028-producer-v3-unified-studios.md`](docs/ui/wireframes/EPIC-028-producer-v3-unified-studios.md)
- [`EPIC-028-producer-v3-unified-studios-flow.md`](docs/ui/flows/EPIC-028-producer-v3-unified-studios-flow.md)
- [`EPIC-028-producer-v3-unified-studios-motion.md`](docs/ui/motion/EPIC-028-producer-v3-unified-studios-motion.md)
- [`EPIC_028_PRODUCER_V3_EXECUTION_PLAN_V1.md`](docs/operations/creative-studio/EPIC_028_PRODUCER_V3_EXECUTION_PLAN_V1.md)

**Owners actualizados:** TASK-1523, TASK-1633, TASK-1552 y TASK-1643 contienen ahora los criterios de
aceptación y límites de ownership. TASK-1641 permanece restringida al lane backend/API de promoción; no se le
añadió UI. No se detectó un hueco que justificara una task nueva.

**Validación:** `git diff --check`, `pnpm task:lint --changed`, `pnpm ops:lint --changed` y el chequeo de enlaces
Markdown pasan. La implementación sigue condicionada a que cada task dueña cierre su mapeo UI, evidencia GVC,
dossier y decision log; estos documentos no habilitan por sí solos `UI ready` ni rollout.

## TASK-1641 — Globe: DESPLEGADO + promoción end-to-end ejecutada (2026-08-05)

**Estado:** `in-progress`, **desplegado y aplicado**. Globe `main@b958a11`; API
`globe-api-internal-00213-5z9` (tag `b958a116a23a`, tráfico 100%), Job worker por digest
`sha256:82a4f2d3e0a6…`, `tofu apply` sobre plan guardado (`6 to add, 1 to change, 0 to destroy`) y `No
changes` posterior. Las 3 métricas, sus 3 alertas y `GLOBE_PROMOTION_WINDOW_WARNING_SECONDS=1800`
verificados contra el runtime, no contra el workflow en verde.

🔴 **El primer ciclo reportó 3 divergencias y DOS eran rutas VIVAS.** `ref/still/rrss-v1` y
`ref/still/openai-v2` tienen su última promoción de la saga en `rolled_back` **y su binding `enabled`**,
porque las habilitó el lane automatizado de ADR-010, que no enruta por la saga. El remedio que la señal
sugiere las habría retirado. «Última promoción revertida» era un **proxy** de «el rollback sigue en pie», y
un proxy falla donde otra autoridad puede deshacerlo: cuando dos mecanismos mueven el mismo estado, hay que
cerrar el predicado sobre el **estado actual del efecto**. Arreglado en `@b958a11`; **medido: la señal bajó
de 3 a 1**. Ningún test lo atrapó — apareció leyendo las primeras emisiones reales.

**Divergencia genuina que queda, y espera un acto humano:** `ref/still/reference-v1` `v5-pro` (binding
`enabled=false`, readiness `promoted`). Remedio: `globe.model-readiness.route.pause` sobre esa identidad.

| Scope | Estado | Evidencia |
|---|---|---|
| 1 canary de ruta arbitraria | ✅ ejercitado con gasto real | `@1767138` + `@a6ff46f` |
| 2 señal de ventana por expirar | ✅ código + IaC, sin aplicar | `@17c3fef` |
| 3 convergencia + su consumidor | ✅ cerrado | `@4a0a18b` + `@17c3fef` |
| 4 `canary-confirm` sin 500 opaco | ✅ cerrado | `@38c528d` |
| 5 reserva pre-gasto | ✅ código, sin desplegar | `@21d6ee3` |
| 6 runbook | ✅ publicado | `GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md` |

**Scopes 2 y 3 son un solo consumidor** porque son el mismo lector cross-workspace; usan la política de scan
que ya existía (`app.promotion_recovery_scan`, migración `0028`) — **sin migración nueva**. La señal de
ventana es el **complemento estricto** de `stalled`, que mide `deadline_at <= now` y avisa cuando ya venció.

🔴 **El hallazgo que evitó una señal falsa:** dos de las diez promociones revertidas pertenecen a identidades
que **después se volvieron a promover y quedaron selladas**. Sin el predicado de supersede por identidad
exacta, la señal habría acusado de divergencia justo a las dos rutas que convergieron, y su remedio habría
**retirado dos rutas vivas**.

**Scope 5, medido contra `globe-pg` antes de tocar código:** la **única** reserva `held` de toda la base es
pre-gasto (32 créditos) y hay **cero** post-gasto. El discriminador es `attempt.providerOperation`, no
`lease.kind`. Un fallo al liberar degrada al TTL y se observa, nunca se propaga.

**Los 8 criterios de aceptación están cerrados.** `ref/still/reference-v1` se promovió de punta a punta
(`promotion_4265dd26…` → `canary_passed` rev 9, binding `enabled` rev 5, 10 = 10 créditos) con el runbook
nuevo y sin una sola secuencia a mano — y esa promoción **cerró la divergencia**: la señal pasó de 1 a 0.

🔴 **Follow-up abierto: pausar una readiness no tiene camino ejecutable.** `requireHuman` rechaza a los
lanes de service account y `globe.model-readiness.pause` no está en los scopes humanos, así que hoy nadie
puede. No se construyó el modo en el operator lane porque habría sido un camino muerto; cerrarlo exige el
rollout de 3 pasos del broker. Detalle:
[`TASK_1641_SESSION_HANDOFF_2026-08-04.md`](docs/operations/creative-studio/TASK_1641_SESSION_HANDOFF_2026-08-04.md).

**Benchmark de producto (2026-08-05):** la comparación autenticada de Higgsfield/Magnific y la verificación de
Globe main@21d6ee3 están documentadas en
[GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05](docs/audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md).
El hallazgo load-bearing coincide con este handoff: la UI React todavía deja Reference, Recreate, Favorite y
Download sin handlers reales; no declarar cerrado el loop de Producer hasta TASK-1643/TASK-1552. TASK-1641 queda
limitada al lane backend/API de promoción y conserva como único criterio abierto el canary end-to-end.

## TASK-1641 — Globe: el sello del canary funciona; Omni y Veo SELLADAS (2026-08-04)

**Estado:** `in-progress`. **Causa raíz cerrada y las dos rutas de video promovidas, selladas y habilitadas.**

| Ruta | Promoción | Binding | Circuito | Canary |
|---|---|---|---|---|
| `ref/motion/reference-v1` (Omni) | **`canary_passed`** rev 9 | `enabled` rev 10 | `closed` rev 9 | run `74ea0dec…`, output `sha256:2c3370a9…`, `eligible` |
| `ref/video/frames-v1` (Veo 3.1) | **`canary_passed`** rev 9 | `enabled` rev 11 | `closed` rev 11 | run `d2788195…`, attempt `68a75b70…`, output `sha256:3a49d5ba…`, `eligible`, 32 cr reservados = 32 gastados |

Las dos son terminales: ya no expiran.

**Desplegado:** `efeonce-globe@38c528d`. API `globe-api-internal-00211-8sp` (tag `38c528d27b9a`) y Job
`globe-producer-worker` (digest `sha256:14b80d2f…`, mismo tag). Migración `0050` aplicada por el workflow keyless
(run `30953709590`); la vista proyecta **16 columnas** y conserva SELECT para los cuatro runtimes.

**Los dos defectos que la migración committeada TENÍA y no se veían leyéndola** (medidos contra PG real, en una
transacción con ROLLBACK, antes de aplicar):

1. `CREATE OR REPLACE VIEW` **no puede** reordenar ni renombrar columnas — sólo agregar al final. Poner
   `source_kind` en la tercera posición aborta con **`42P16`**. Va `DROP` + `CREATE`, sin `CASCADE`.
2. El runner de Globe hace `tx.query(sql)` con el **archivo completo**: no parsea markers. La sección
   `-- Down Migration` se ejecutaba y **re-creaba la vista rota tres líneas después de arreglarla**, quedando
   registrada como aplicada. Esa convención es de `node-pg-migrate` (Greenhouse), no de Globe.

**Lo demás que entró:** el checkpoint `activated → verifying_canary` ahora ocurre **después** de leer la
evidencia (era una lectura pura delante de un estado sin retorno: cada intento fallido quemaba una promoción);
un `DatabaseError` de pg deja de ser `internal_error` opaco —infraestructura `08/40/53/55/57` →
`dependency_unavailable`, las deterministas siguen `internal_error`, que es la verdad— y todo error de Postgres
emite su SQLSTATE en `globe.dispatch.database_error`; y el path tiene test real (estructural sin base + en vivo
opt-in), registrado en el script `test` del package y probado en rojo y en verde.

### 🔴 Cómo se produjo el canary de Veo, y qué NO prueba

Por el **carril gobernado**, con los commands canónicos del spine (`estimate` → `prepare` → `execute`) sobre el
transporte de `scripts/producer-ui-canary-lib.mjs`. Forma: 720p, 8 s, 16:9, `silent`,
`inputMode {kind:'frames', hasEndFrame:false}`; primer cuadro = el output ya gobernado
`output:8a5e24ec-…:0` declarado como `authorizedInputs`.

**NO se produjo desde la UI del Producer, y la UI sigue sin poder producirlo.** `ProducerFeedRoute.tsx` cablea
`onReference`, `onRecreate`, `onFavorite` y `onDownload` a **`() => undefined`** — no-ops explícitos —, así que
«Usar como referencia» no despacha ningún command y sin referencia el estimado no se calcula. El comentario del
propio archivo ya razonó que un no-op deja el botón mintiendo, pero sólo lo aplicaron a `onSelect`.

Consecuencias, sin adornos: **el Scope 1 de la task —un canary de ruta arbitraria canónico y committeado— sigue
pendiente**, y **la generación desde el Producer para rutas con entrada obligatoria sigue bloqueada**. Ambos
defectos tienen chip propio.

**Y un hallazgo sobre el ingest privado, con su límite declarado.** Dos subidas de referencia murieron en la
etapa `inspecting` con `dependency_unavailable` tras 5 intentos, mientras el asset **generado** de este mismo
canary pasó `inspecting` y `malware_scan` sin problema — o sea el worker está sano y lo que falla es el camino
private-ingest. ⚠️ Esas subidas se dispararon con un `File` **sintético** desde el browser, así que antes de
llamarlo defecto de plataforma hay que reproducirlo con el selector real. Lo que **sí** queda verificado es el
**enmascaramiento**: `SAFE_DEPENDENCY_CODES` sólo deja pasar los cuatro códigos de C2PA, así que los nombres de
ClamAV y de inspección que `engines.ts` ya emite se destruyen en la frontera. Tercera aparición de ISSUE-127 en
el día.

Historia anterior: [Handoff.archive.md](Handoff.archive.md).

## ADR-023 — Model Route Cards y skill compartida (2026-08-04)

**Estado:** implementado como contrato documental y de tooling; no cambia el runtime de Globe. La skill
`greenhouse-globe-model-fleet` existe en `.codex/skills/` y `.claude/skills/`, con paridad byte a byte, schema y
validador local. El baseline de fichas incluye FLUX 3, Gemini Omni, Veo 3.1, Seedance 2.0/R2V, GPT Image 2,
Seedream 5 Pro y Nano Banana 2/Pro:
[`FLUX_3_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/FLUX_3_VIDEO_ROUTE_CARD_V1.json),
[`GEMINI_OMNI_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/GEMINI_OMNI_VIDEO_ROUTE_CARD_V1.json),
[`VEO_3_1_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/VEO_3_1_VIDEO_ROUTE_CARD_V1.json) y
[`SEEDANCE_2_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/SEEDANCE_2_VIDEO_ROUTE_CARD_V1.json),
[`GPT_IMAGE_2_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/GPT_IMAGE_2_IMAGE_ROUTE_CARD_V1.json),
[`SEEDREAM_5_PRO_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/SEEDREAM_5_PRO_IMAGE_ROUTE_CARD_V1.json),
[`NANO_BANANA_2_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/NANO_BANANA_2_IMAGE_ROUTE_CARD_V1.json) y
[`NANO_BANANA_PRO_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/NANO_BANANA_PRO_IMAGE_ROUTE_CARD_V1.json).

La auditoría confirmó que las rutas públicas de Seedance usan `seedance-2.0` (text-to-video) y `seedance-2.0-r2v`
(R2V). `seedance-2.0-i2v`, bajo `bytedance/seedance-2.0/mini/image-to-video`, existe solo en el adapter Fal para
`video-extend`: no tiene routeId público, binding gobernado ni canary de producción. El adapter genérico de Veo también
contiene `veo-3.1-fast-generate-001`, pero el binding sellado de `ref/video/frames-v1` usa `veo-3.1-generate-001`.

**Estado honesto:** FLUX 3 sigue `gated` y no está declarado en `globe.producer.fleet.list`. Fal es la vía candidata;
BFL directo permanece Early Access y fuera de alcance. Próximo paso operativo: revalidar namespace/OpenAPI/pricing
con credenciales en Globe y ejecutar el Slice 0 de `TASK-1642`; no hacer submit billable ni promoción desde esta
skill.

La auditoría de imagen resolvió “Imagen 2 de ChatGPT” como GPT Image 2 (`gpt-image-2`); Google `imagen-2` no tiene
routeId, adapter ni binding en Globe. El reader live confirma disponibles GPT Image 2, Nano Banana 2 y Nano Banana Pro,
y Seedream 5 Pro para generación. Seedream Edit conserva provider/adapter cableados, pero su binding está deshabilitado
y el reader la devuelve `gated`; no debe promocionarse por herencia de Seedream T2I. Las cards mantienen además como
superficies diferidas la edición de OpenAI/Nano Banana y Seedream 5 Lite. Nano Banana Pro requiere reconciliar un lookup
de circuito `not_found` antes de nuevo gasto. No hubo cambios de runtime, secrets, bindings, rates ni deploy.

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
