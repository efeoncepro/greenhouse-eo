# Efeonce Insights — lessons (append; newest first; each with date, symptom, rule)

- **2026-09-25 · `artifact-composer/pure` is not browser-safe.** Importing the chart geometry into `contracts/` to
  validate value invariants failed the worker-in-Vercel lint and would have dragged Node crypto (manifest hash) into
  every browser consumer of the contracts. Rule: `contracts/**` stays structural; anything that needs the geometry
  lives in `editorial/` (`chart-values.ts`). The boundary test greps the contract SOURCE TEXT for `node:crypto`, so even a
  comment naming it fails — describe it in words.
- **2026-09-25 · Generation runs in the `ops-worker` too: watch what the composing phase imports.** Resolving the cover
  through `organization-brand-assets.ts` pulled storage, Kysely and the assets client into the generation graph (the
  commands tests broke on a `@/lib/db` mock). Rule: give the worker a light owner reader (`organization-logo-variants-reader.ts`)
  instead of importing the owner's command module.
- **2026-09-25 · Rounding hides a tiny pp change.** Berel CTR 1,83 % vs 1,87 % printed «1,8 % … 1,9 %, variación 0,0 pp».
  No unit test would have found it; the read-only v2 preview over real data did. Rule: preview real editions
  (`preview-edition.ts --editorial-v2 --plan-only`) before declaring the contract; under 0,05 pp print two decimals.
- **2026-09-25 · The AEO adapter only reads the LATEST grader run.** The comparison window never has its own score, so
  a gauge «with the previous period» has no evidence even though the canvas shows one. Rule: the family × evidence
  matrix decides, not the canvas; enabling it means selecting the run by window in the grader's domain.
- **2026-09-25 · ICO thresholds disagree across docs.** Registry (runtime) FTR ≥ 80; glossary ≥ 70; ICO contract ≥ 85.
  Rule: the printed target comes from `ICO_METRIC_REGISTRY` via a reference fact; never copy a number from a doc.

- **2026-09-25 · Un canvas aprobado no es un diseño construido.** TASK-1847 cerró el mismo día en que el operador
  aprobó el rediseño premium en un canvas; producción siguió sirviendo los catálogos v1 y el rediseño quedó en dos
  tasks nuevas (1888 contrato, 1889 catálogos). Decir «los informes se ven así» mirando el canvas habría sido falso.
  Regla: al cerrar una task de catálogos, o al describir el producto, nombrar **qué diseño sirve producción hoy** (qué
  catálogo, qué release) y dónde vive el aprobado-sin-construir; nunca presentar una dirección aprobada como disponible.
- **2026-09-25 · La fidelidad a un diseño aprobado se exige con referencias por página y un umbral, no a ojo.** El
  operador pidió que el informe quede «igual al canvas». Eso se volvió medible: 41 páginas de referencia a tamaño nativo
  versionadas en el repo, un paquete fuente que las regenera (40 de 41 byte a byte; la restante 0,008 % por
  antialiasing), un fixture por plantilla con los datos de ejemplo del canvas y `pixelmatch` (umbral 0,1) con techo de
  1 % de píxeles distintos por página; lo que exceda se corrige o se justifica en el dossier con la región y la
  aprobación del operador. Regla: antes de construir contra un diseño, dejar referencias durables, reproducibles y un
  criterio numérico; «se parece» no es un gate. Y el fixture del canvas vive sólo en pruebas: nunca datos de ejemplo en
  producción.
- **2026-09-25 · Material de referencia con marcado HTML va empaquetado dentro del repo.** Las fuentes `.dc.html` del
  canvas se guardaron como `fuente-canvas-2026-09-25.tar.gz` para que el escaneo de Tailwind no lea su marcado (lee
  cualquier archivo de texto del árbol y materializa sus clases). Regla: HTML de referencia, ejemplos o prototipos que no
  son código del producto entran comprimidos o fuera del árbol escaneado, con el script que los reproduce al lado.
- **2026-09-25 · Un diseño aprobado no autoriza familias, y la evidencia se verifica en la fuente, no se supone.** El
  canvas dibuja 15 familias con datos de ejemplo; varias (embudo, Venn, UpSet, cascada) piden evidencia que ningún
  adapter produce hoy. Y en sentido contrario, la primera matriz de TASK-1888 subestimó lo que sí existe: Sky tenía 11
  meses de ICO en BigQuery, el snapshot traía `ftr_pct` que el adapter no leía y SEO ya declaraba granularidad
  `day`/`month` (corregida en `e845ab562`). Regla: la matriz familia × evidencia decide qué se emite; cada veredicto se
  verifica contra el adapter y la fuente (BigQuery/PG), nunca contra el diseño ni contra la memoria del planner.
- **2026-09-25 · Los títulos del planner determinista repiten la etiqueta del hecho.** Hallazgo del cierre de
  TASK-1847: el título repite la etiqueta en vez de afirmar la conclusión. Es del contrato del plan
  (TASK-1888), no de un catálogo: arreglarlo en la plantilla escondería el defecto en una sola salida.

- **2026-09-24 · El gate global puede bloquear un catálogo nuevo por drift histórico ajeno.** El baseline de
  `deck-axis`/SKY ya difería en el `develop` limpio. Usa `--catalog=insights` para congelar y comparar sólo los
  frames de Insights, preservando hashes ajenos; valida ambos comandos y mantén ISSUE-122 abierta para el gate global.

- **2026-09-24 · Campos geométricos vacíos pueden borrar geometría SVG authored.** El resolver scatter escribía
  `d=""` desde slots vacíos aunque el SVG ya tuviera path; el PDF quedaba sin puntos. Regla: un efecto de figura
  vacío debe ser no-op y no sobrescribir la geometría del molde; cubrirlo con una regresión y abrir el PDF real.

- **2026-09-24 · El baseline de Insights no puede promoverse sobre veinte frames ajenos.** El freeze halló cambios
  declarados en diez plantillas nuevas y veinte frames `deck-axis` no declarados; las plantillas comerciales estaban
  limpias en Git. Regla: conservar el baseline y resolver esa deriva con su dueño; no añadir frames ajenos al ledger
  para forzar el freeze de otra task.

- **2026-09-24 · El primer baseline de un catálogo nuevo sigue sujeto al commit atómico.** `composer:visual-gate`
  reportó diez frames Insights aún no promovidos; el nuevo índice ya estaba declarado y el resto era el set del
  2026-09-21. Regla: conserva los frames ajenos intactos y no ejecutes `--freeze` sin poder incluir baseline y
  catálogo en el mismo commit.

- **2026-09-22 · OTD nunca llegó a un informe, y nada falló.** El adapter ICO buscaba `metricId === 'otd'`; el
  registro del motor lo llama `otd_pct`. Sin match, el `if (otd)` sin `else` omitía la métrica en silencio, y el
  fixture del test repetía el id equivocado, así que el test confirmaba el error en vez de detectarlo. Regla: los ids que
  un adapter lee de otro dominio van en una constante exportada (`ICO_SNAPSHOT_METRIC_IDS`) que un test cruza contra
  el registro dueño (`ICO_METRIC_REGISTRY`); y una métrica esperada que no llega se narra como límite, nunca se omite.
- **2026-09-22 · La barra destacada era invisible.** El molde A4 define `.lead` (párrafo introductorio con
  `margin-top`); la barra usaba la clase de tono `lead`, heredaba el margen y quedaba fuera de su riel. Ningún test ni
  gate lo vio: sólo mirar el PDF. Regla: las clases de estado de un resolver van con espacio de nombres propio
  (`tone-lead`/`tone-rest`), nunca con nombres que un molde pueda usar para tipografía.
- **2026-09-22 · La guarda barra↔etiqueta rechazaba toda etiqueta bien redondeada.** Exigía igualdad exacta entre
  «1,9 %» y 1,88. Regla: la tolerancia es media unidad del último decimal IMPRESO (`roundingToleranceOf`); una cifra
  distinta sigue fallando. La guarda vive una sola vez en `artifact-composer/bar-figure.ts` (las copias por catálogo
  ya habían divergido).
- **2026-09-22 · El deck productivo sobre `deck-axis` no servía con datos reales.** Recortaba con «…», imprimía el
  período anterior como otra métrica con el mismo nombre y callaba lo que no cabía (2 de 6 métricas SEO). Cutover a
  `insights-deck` (`insights-deck-mapper.ts`): toda afirmación aparece en alguna lámina, nada se recorta. Lo ya
  encolado con `deck-axis` sigue componiendo con su input sellado.
- **2026-09-22 · Una figura de comparación necesita pares con escala propia.** En escala compartida, 9 mil clics
  junto a 488 mil impresiones quedan como una raya; y nombrar la barra por la serie («Período») no dice qué mide.
  `figure-pages.ts`: cada métrica es un grupo (período + anterior, `scaleGroup`), la figura se pagina sin partir
  pares ni dejar una barra sola, y cada página se narra con las afirmaciones que citan sus hechos.
- **2026-09-22 · El período se rotulaba con el mes de inicio.** Una edición del 1 al 20 de septiembre decía
  «Septiembre de 2026». `render/labels.ts` rotula la ventana civil medida, dentro del presupuesto de 28.
- **2026-09-22 · Límites y metodología imprimían identificadores internos.** `ico`, `rank`, el `detail` del adapter
  («Rank evolution: no_data») y el nombre de la función lectora (`readSeoOverviewKpisForWindow`) llegaban tal cual al
  documento. El planner los redacta desde `GH_INSIGHTS` (`metrics`, `sources`, `units`); un test barre todo
  identificador conocido. AEO usa el copy es-CL que el grader ya declara para clientes.
- **2026-09-22 · La edición de Demo no ejercita nada.** Sin datos, el A4 de Demo salió «perfecto» y no mostró ninguno
  de los defectos anteriores: todos aparecieron con Berel y Sky. El canary de un render se hace con datos reales, y la
  vista previa local (adapters → planner → validador → mapper → composer) los encuentra antes de desplegar.
- **2026-09-22 · El validador de cifras rechazaba toda edición SEO real, y la de ICO iba a caer igual.** Síntoma:
  la edición de Berel falló con `unreferenced_number` por `"10"` y `"-08"`. Causas: el lector de cifras partía
  `2026-08` en `2026` + `-08` (el mes, leído como negativo), y la etiqueta del hecho —texto del adapter— traía cifras
  propias (`Keywords en primera página (≤10)`, `Tráfico orgánico estimado 2026-08`, y en ICO `RpA · <space> · <mes>`).
  Los fixtures sólo usaban etiquetas sin cifras: el gate probaba la forma del primer caso, no la de los adapters.
  Regla: una fecha ISO es UN token; la etiqueta LITERAL de un hecho **referenciado** se enmascara antes de leer
  cifras (una cifra fuera de ella, o la etiqueta de un hecho no referenciado, se sigue rechazando). **NUNCA** se
  arregla renombrando la etiqueta en el adapter (el snapshot ya sellado la conserva) ni agregando las cifras de la
  etiqueta al conjunto permitido (eso sí relaja la guarda). Los fixtures del validador usan etiquetas reales.
- **2026-09-22 · Un import de VALOR desde el barrel del composer rompe la función de Vercel.** Síntoma: staging
  falló el deploy con una función de 441 MB (límite 250 MB). `report-mapper.ts` corre en Vercel (encola) e importaba
  `paginateFlow` desde `@/lib/artifact-composer`, que arrastra Playwright, pdf-lib y los catálogos. `pnpm build` local
  no lo detecta. Regla: código que corre en Vercel importa del composer sólo TIPOS (barrel) o VALORES de la entrada
  liviana `@/lib/artifact-composer/pure` (paginate, chart-geometry, bar-figure, manifest-hash); el catálogo viaja como
  string (`INSIGHT_RENDER_CATALOG_BY_OUTPUT`). Desde ISSUE-177 lo hace cumplir la regla ESLint
  `greenhouse/no-worker-only-module-in-vercel-code` y el gate `pnpm vercel:reachability-gate`.
- **2026-09-22 · Un capítulo sin afirmaciones se narra, no se rechaza.** Mi guarda del mapper A4 rechazaba el
  capítulo vacío y contradecía la filosofía de narrar lo que falta. Ahora el titular es el título del capítulo y el
  cuerpo dice que la sección no registró hallazgos en el período.
- **2026-09-21 · El riel de una barra puede leerse como el dato.** En el deck, el fondo del riel usaba `fieldMid`
  (#023c70) sobre el navy del molde y se leía como una barra llena: el valor chico (3,1 %) parecía grande. Ningún
  test lo vio; salió de abrir el PNG. Regla: el riel va un escalón por encima del fondo (`fieldEdge`), nunca a media
  distancia entre fondo y relleno — un riel que compite con su relleno es un segundo dato que nadie declaró.
- **2026-09-21 · `CompositionPlanInput` usa `artifactId`, no `deckId`.** Una sonda con el campo equivocado compone
  igual y deja un `undefined.manifest.json` y un `undefined.pdf` junto a los archivos buenos. No es un bug del motor:
  es el campo mal escrito, y el motor no lo reclama.
- **2026-09-21 · El llenador clona el PRIMER HIJO del contenedor.** Un campo declarado directamente sobre ese hijo
  (`<th data-slot-field="label">`) no se encuentra: el campo va DENTRO del elemento repetible
  (`<th><span data-slot-field="label">`). Y un dato de presentación que se repetiría por fila —la alineación de una
  columna numérica— se resuelve en el CSS del molde por posición, no declarándolo en cada item.

- **2026-09-21 · Una guarda que no puede fallar es una afirmación, no un mecanismo.** Escribí en el resolver del
  catálogo A4 una verificación de que la etiqueta impresa representara el valor que dibuja la barra, y la anuncié en
  el commit. Estaba muerta: `printedValue` es `string` por contrato y el helper sólo aceptaba `number`, así que
  siempre daba `null` y la comparación se saltaba entera. El render pasaba. Regla: para toda guarda, escribir primero
  el test que la hace SALTAR (etiqueta que contradice el dato, etiqueta ilegible); si no se puede escribir ese test,
  la guarda no existe. Y una entrada ilegible nunca desactiva una verificación: la convierte en error.
- **2026-09-21 · Los tests verdes NO son typecheck.** 263 tests del composer pasaban con cuatro errores TS vivos
  (`ResolverRegistry`/`FieldEffect` importados del módulo equivocado): Vitest transpila con esbuild y no verifica
  tipos. Regla: `pnpm typecheck` es un gate propio, no una consecuencia de la suite; correrlo antes de cada commit
  de código, no sólo al cerrar.
- **2026-09-21 · El `composer:visual-gate` da rojo en `develop` limpio, y es más ancho que ISSUE-122.** Sin tocar
  nada: 19 de 33 plantillas, 1–443 píxeles. El runbook documenta la variación de rasterización entre entornos, pero
  ISSUE-122 la acota a láminas con FOTOS, y acá fallan también `ProcessStepsFull` (443), `TimelineFull` (332) y
  `MaturityLadderFull` (197), que son geometría y texto. El gate no corre en CI: es local. Regla: al tocar el
  composer, exigir cero píxeles SÓLO en los frames que uno introduce, y nunca re-congelar frames ajenos para
  ponerse en verde — el runbook llama a eso «rebaseline silencioso».
- **2026-09-21 · La tubería de marca estaba atada al primer catálogo.** El ADR del Composer sostiene que agregar un
  catálogo no toca el motor — cierto para el motor, falso para `compile-tokens`, que derivaba TODAS sus rutas de
  `deckAxisCatalogDir`. Mientras hubo un solo catálogo, «el catálogo es dato» no se probó en esa frontera. Regla: al
  extraer una tubería compartida, la no-regresión se verifica con el mecanismo que el repo YA tiene
  (`brand-pack-sync` compara CSS compilado vs committeado) y con `sha256`, no con un script inventado para la ocasión.
- **2026-09-21 · Un redondeo cosmético puede romper la promesa del gráfico.** El Venn de dos conjuntos resuelve por
  bisección la distancia entre centros cuya lente vale exactamente la intersección. Redondear esa distancia a 4
  decimales degradaba el área fuera de tolerancia; su propio test lo detectó porque **recalcula el área desde la
  geometría devuelta** con una implementación independiente. Regla: cuando un valor alimenta otra magnitud, la
  precisión del intermedio es parte del contrato. Y un test de geometría que sólo comprueba que el código corre no
  prueba nada.
- **2026-09-21 · Venn de tres conjuntos no se implementa, y no por costo.** Con tres conjuntos las áreas
  proporcionales exactas en general NO existen: es una limitación matemática. Un Venn de tres con números adentro es
  un esquema, y si aparenta proporcionalidad, miente. El caso de 3+ es UpSet (longitud de barra, escala a N).
- **2026-09-21 · Contrato de catálogo: `item.shape`, no `item.fields`; y `consumer`.** Un campo del item que no se
  imprime se declara `consumer: 'resolver-only'` o `'validation-only'`; si no, el motor exige un
  `[data-slot-field]` en el HTML y falla con «quedaría el contenido de ejemplo del prototipo». `composeArtifact`
  tiene firma POSICIONAL `(catalog, deckPlan, outDir, options)`.

- **2026-09-18 · Release from an explicit SHA, not from the tip of `develop`.** TASK-1848's release was cut from an explicit
  SHA to exclude a peer commit on `develop` that had not been validated. Rule: dispatch the release from the explicit, validated SHA so an
  unvalidated peer commit stays out; verify the manifest's `target_sha` before approving.
- **2026-09-18 · The gateway deploys only after the Greenhouse release that publishes its routes.** `efeonce-mcp`
  `deploy.yml` is `workflow_dispatch` (merging to its `main` does NOT deploy). Federating tools whose ecosystem routes are
  not yet in production makes the gateway point at 404s. Order: Greenhouse release → contract canary → dispatch the
  gateway deploy → provider canary.
- **2026-09-18 · "Delivered" cannot be read from the ledger.** Resend's lifecycle webhook does not operate (ISSUE-160), so
  `provider_status` stays null after `accepted`. Rule: a real-email canary is confirmed by the operator looking at the
  authorized inbox and saying so; record it as human evidence, never as ledger evidence.
- **2026-09-18 · A concurrent burst against a public route nearly exhausted the shared PostgreSQL.** Measuring the share
  reader's rate limit with 64 concurrent requests left 86–88 idle `greenhouse_app` connections (max 100) for exactly 5 min:
  each Vercel invocation opens its own pool, the pool's idle timeout never runs while the function is frozen, and the
  server only cuts at `idle_session_timeout` (5 min). DB-backed rate limiters spend a connection before rejecting, so the
  limiter itself does not protect the database. Rule: never probe limits with concurrent bursts against public DB-backed
  routes on the single shared Cloud SQL (it serves production); sequence them. Fix owner: TASK-1876 (ISSUE-174).
- **2026-09-18 · The email platform's token-sensitive intent index is unique per (type, source_event_id, source_entity).**
  Symptom: a retry that reuses the SAME correlation never creates a new `email_deliveries` row (it collides with the
  previous attempt). Rule: correlate per attempt — `idlr-<uuid>` for attempt 1, `idlr-<uuid>:aN` for retries N=2..5 —
  so a retry never collides with, nor is confused with, the previous attempt when reconciling.
- **2026-09-18 · `email_type_config` fails OPEN.** Symptom: a new EmailType without a seeded row is enabled the moment
  the code deploys. Rule: every new EmailType ships with its `email_type_config` row seeded `enabled=false` in the same
  migration; turning email on is a row flip, not a side effect of the deploy.
- **2026-09-18 · `NotificationService.dispatch` cannot restrict channels.** Symptom: using it for an "in-app" notice
  also fires its own generic `notification` email — a double send with no dedupe. Rule: do not use it for in-app next to
  a domain email until channel restriction exists (owners TASK-690–693 / TASK-1849); document the gap instead.
- **2026-09-18 · `pnpm pg:connect:migrate` stops the Cloud SQL Proxy when it finishes.** Symptom: a proxy you started
  earlier is dead afterwards (`ECONNREFUSED 127.0.0.1:15432`) for readbacks and live tests. Rule: restart the proxy after
  migrating before any readback or `pnpm test:live`.
- **2026-09-18 · `tenant/access` drags bcrypt/BigQuery/notifications into the worker bundle.** Symptom: revalidating an
  authority from the ops-worker through the tenant access helpers pulls heavy, unrelated deps. Rule: read
  `greenhouse_serving.session_360` (role_codes with lifecycle) and build the subject there.
- **2026-09-18 · The Grader's share link is not a model for sharing.** Symptom: it stores the token in clear and serves
  without anti-index headers (`public, max-age=300`). Rule: the model is the talent-pool token (digest only) plus the
  headers of `hiring/assessment/public-session/http.ts`.
- **2026-09-16 · A cold Job start makes the dispatcher launch twice for one output.** Production canary: the Job took
  ~2 min to start, so the next 2-min tick (22:14) still saw the `deck_pdf` output `queued` and launched a second
  execution after the 22:12 one. Only one finalized (atomic claim + fencing); the other found no work. Rule: count
  executions per output as "≥1", never "exactly 1"; integrity lives in claim + fence, not in the dispatcher. Two Job
  executions for one output after a cold start are expected, not a double render — do not retry or cancel. If the
  cost ever matters, the fix is for the dispatcher to account for Job executions still running before launching.
- **2026-09-16 · A hand-launched canary hid the dispatcher's missing flag.** The 13:00Z render canary executed the
  `artifact-worker` Job manually and passed; the `ops-worker` dispatcher did not have `INSIGHTS_RENDER_ENABLED`
  (logs 13:02Z `insightsQueued=0` with an output queued), so nothing would have drained on its own. Rule: a canary
  exercises the production path (enqueue → scheduler tick → dispatcher → Job), never a shortcut. Map every runtime
  that reads the flag with `grep` before declaring the rollout, including the one that only *launches* work.
- **2026-09-16 · A single Job cannot carry lane-dependent config.** The `artifact-worker` Job and the `ops-worker` are one
  instance each for staging AND production; the assets bucket is fixed to the staging bucket and assets keep
  `bucket_name` per row. Rule: per-environment behaviour lives at the enqueue gate (Vercel per target), not in Job env;
  never assume a flag or bucket on the Job can differ between staging and production.
- **2026-09-16 · Audit the human actor on EVERY event, not only on the run.** Before migration
  `20260916201127095`, runs and events of a client-requested render were recorded as `system` (the CHECK did not
  accept `client_user`). Rule: when a command can be invoked by a human of any kind (`member`, `client_user`), the actor
  travels to the run, the enqueue event, retry and cancel — and the CHECK accepts every actor kind the lanes allow.
- **2026-09-16 · Throughput is the tick, not the render.** Rendering takes ~7 s but the dispatcher launches one Job
  execution per 2-min tick (`parallelism=1`, Proposal first): a burst of 5 took 11 min. Promise ≈ 2·N min, not seconds.

- **2026-09-16 · Down of a migration must respect governance tables.** Symptom: `migrate:down` failed twice
  (`module_assignments_module_key_fkey`, then `module_assignment_events is append-only`); node-pg-migrate rolled the
  whole transaction back (no damage). Rule: a domain's Down retires its own schema and deprecates capabilities; it
  never deletes catalog rows, assignments or audit. Editing only the Down section of an applied migration is fine.
- **2026-09-16 · Announce destructive shared-instance actions and WAIT.** A peer session (TASK-1846) sent an ALTO that
  arrived after the down had run, because the docs said "real editions in production". Rule: announce, wait for a
  reply, name the owning org, and write "synthetic (sandbox org); production = runtime".
- **2026-09-15 · Vercel freezes env vars at build.** `INSIGHTS_GENERATION_ENABLED` added after the deployment was
  created ⇒ `generation_disabled` until `vercel redeploy`. Same in Production after the release.
- **2026-09-15 · Idempotent replay is HTTP 200, not 202.** `status: result.idempotent ? 200 : 202` in both lanes. A
  lane-level replay (header key) returns the cached 202 with `idempotent:false`: lane behaviour, not the command.
- **2026-09-15 · The served manual must be self-sufficient.** An agent with no context built a valid request from it,
  but lacked title/purpose, window limits, `comparison.custom` shape, pagination, `includeEvidence`, `allowPartial`
  with all modules empty, and the real error codes. All added; keep it that way when contracts change.
- **2026-09-15 · `plan.limits` repeats the same line per rejection** ("ico: sin datos." ×4). Dedupe belongs to TASK-1846.
- **2026-09-15 · Gateway surface baseline trap.** If `surface-baseline.json` already carries the new version with the
  old hash, `pnpm surface:baseline` aborts: `git checkout -- surface-baseline.json`, bump `package.json`, regenerate.
- **2026-09-15 · Parity/authorized-tools tests build their own server.** New provider ⇒ add the stub to
  `test/authorized-tools.test.ts` and the parity test's server build, plus `src/surface.ts`.
- **2026-09-15 · Permission classifier vs. autonomy.** `az rest`, `gh pr`/push to the gateway repo, `pnpm migrate:down`,
  `gh workflow run`, `vercel env add … production` were blocked until the operator added Bash allow rules in
  `~/.claude/settings.json`; chained commands get blocked more often than single ones. Ask for the rules up front.
- **2026-09-15 · `git push` over SSH (ssh.github.com:443) dropped the pack; HTTPS with `gh auth git-credential` worked.**
- **2026-09-15 · Docs-only merge before a release cancels staging (Ignored Build Step)** and `vercel_readiness`
  then fails preflight; touching a deploy-control doc (flag ledger) produces the build honestly.
- **2026-09-15 · Served manual leak test rejects TASK ids, repo paths, UUIDs, org ids, secret names.** Write for an
  external agent; keep those in the local skill, never in `docs/mcp/skills/**`.
- **2026-09-15 · ISSUE-172 pattern applied:** public codes use a plpgsql function with a single `nextval` and
  `lpad(n, GREATEST(6, length(n)), '0')`; never `to_char FM` nor a per-row DEFAULT in `INSERT … SELECT`.
- **2026-09-16 · `proposal_render_jobs` has NO lease, fencing token or heartbeat.** The claim
  (`claimNextRenderJobForExecution`) is atomic via `FOR UPDATE SKIP LOCKED`, and `markRenderJobCompleted` only
  checks `expectFromStates:['running']` — it never verifies the finisher still owns the claim. Consequence today:
  no double execution (nothing re-claims), but a worker that dies leaves the job in `running` forever;
  `listExpiredQueuedRenderJobs` only covers `queued` past its deadline. TASK-1846's acceptance about "a stale lease
  must not produce two final outputs" describes a hazard **that task itself introduces** by adding reclaim — so
  lease and fencing must ship in the SAME slice. Never split them.
- **2026-09-16 · In the shared checkout, another session's `git push` carries YOUR local commits.** Three
  documentation commits of TASK-1846 reached `origin/develop` inside greenhouse-eo-96's push of TASK-1845, with no
  action from the 1846 session. Local-first is not protection: if a commit must not leave the machine yet, it must
  not be committed to `develop` yet. Verify after any peer push with `git merge-base --is-ancestor <sha> origin/develop`.
- **2026-09-16 · `Handoff.md` budget: the gate counts TOKENS, the rotator works on SESSIONS.** `docs:context-rotate`
  reported "2/20 sessions, 439/600 lines, nothing to rotate" while `docs:context-check:strict` failed at ~12411
  tokens over a 12000 ceiling. Baseline was 11994 with a single session — six tokens of headroom, so ANY new entry
  overflows it. Fixes, in order: `--max-sessions=N` to force rotation, and then trim your own entry to a pointer
  (most of the file's bulk is not in dated sections, so rotation alone does not get you under).
- **2026-09-16 · How to verify the synthetic-edition claim AFTER the fact.** The vocabulary trap is in SKILL.md; the
  operational check is: `module_assignments WHERE module_key='insights_v1'` must return exactly the sandbox org, and
  `organizations.organization_name` confirms it is "Greenhouse Demo". That check survives a `down`/`up`; the rows
  themselves do not. Post-rollback you can prove "no real org had the module", never "what the deleted rows were".
- **2026-09-16 · Un parámetro `$N` sin referenciar revienta en PostgreSQL, no se ignora.** Al agregar la
  cuota por organización quedó `$2` sin usar en el SELECT del claim (usaba `$1` y `$3`): PG responde
  `could not determine data type of parameter $2`. Numerar los `$N` consecutivos POR QUERY, no por la lista de
  variables del TS. Lo destapó el live test; el typecheck no ve dentro del SQL.
- **2026-09-16 · `zsh` NO hace word-splitting de `$VAR` sin comillas.** `P="a b c"; git add $P` pasa la cadena
  entera como UN path y falla con `did not match any files`. En bash funcionaría. Usar rutas literales o `${=P}`.
  Falló ruidoso, que es lo bueno; la variante silenciosa de esta clase es la que muerde.
- **2026-09-16 · Un live test que falla con `invalid_rapt` NO es un bug de tu SQL: es la ADC de gcloud vencida.**
  El stack apunta a `cloud-sql-connector`/`google-auth-library`, no a tu query. Se arregla con
  `pnpm gcloud:auth:playwright -- --force` y se re-corre; perseguir el SQL es perder el rato.
- **2026-09-16 · `pnpm build` de producción MODIFICA `tsconfig.json`** (le agrega includes con timestamp
  `.next-local/build-<ts>/types/**`). Es un archivo versionado: commitear después de un build sin mirar
  `git status` se lleva esa basura, distinta en cada corrida. Revertir con `git checkout -- tsconfig.json`.
- **2026-09-16 · El guard de write-target del dominio atrapa tus tablas nuevas, y está bien.**
  `boundary-domain.test.ts` falla con la lista de writes no registrados; la task lo exige en el mismo PR.
  Registrarlas en `ALLOWED_WRITE_TARGETS` es la acción correcta — el boundary no se ensancha hacia módulos
  productores, sólo reconoce tablas propias.
- **2026-09-16 · A re-export does not bring the name into local scope.** Moving `hashResolvedManifest` to the composer and
  writing `export { … } from` in `render-jobs.ts` broke its own internal use; the fix is `import` + `export { name }`.
- **2026-09-16 · Two canonical-JSON implementations = two hashes.** `request-hash.ts` and `render-jobs.ts` each had one;
  the worker's drift check would give false positives if enqueue and worker hashed differently. One domain-free
  function in the composer, re-exported by Proposal, byte-identical (`composer:visual-gate` unaffected).
- **2026-09-16 · `CoverFull` is proposal vocabulary.** Its `proposalKind` enum renders "Propuesta Técnica" / "Capacitación
  HubSpot": an Insights deck must not emit it. The section divider opens the deck until TASK-1847 ships real catalogs.
- **2026-09-16 · Slot budgets are tuned for tender copy** (title 32, KPI value 8, unit 8, qual 72). Insights copy from a
  frozen plan will exceed them; the honest answer is `render_rejected` with the cause, never a silent truncation.
- **2026-09-16 · The `unit` slot of `MetricsSplit` renders glued and wrapped** (`45–50por`/`mes`) in delivered tender
  decks too — it is a catalog defect, invisible to slot validation and to the pixel gate (baselined). Separate issue.
- **2026-09-16 · macOS `xargs` has no `-a`.** Use `git add --pathspec-from-file=<file>` / `git commit --pathspec-from-file`
  for explicit-path commits in the shared checkout.
- **2026-09-25 · The sandbox org cannot prove a report with data.** «Greenhouse Demo» has no ICO snapshots, so a
  productive canary with figures needs an internal edition of a real client (operator authorization). Check the
  source (BigQuery) before concluding a client "has no data": Sky had 11 months while the sandbox had none.
- **2026-09-25 · A percentage delta printed as a relative percent is ambiguous.** OTD 80,1 → 81,9 printed
  «+2,2 %»; the reader expects «+1,8 pp». Owned by TASK-1888 (plan contract), not a catalog fix.
- **2026-09-25 · `cmd; echo EXIT=$?; tail log` reports tail's exit code.** A background gate must end with
  `exit $rc` of the gated command, or its green notification proves nothing.
