# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-23 — Los live tests dejan de pisarse: eran cuatro causas, y una la causaba yo

**Estado: `complete`.** Sin rollout pendiente — es infraestructura de tests, no runtime.

El rojo que había reportado como «contención en la base compartida» tenía **cuatro causas
independientes**, y la etiqueta que le puse escondía tres:

1. **Pool de fixtures compartido.** Tres archivos de `assignment-policy` resolvían su sujeto con
   `ORDER BY ip.profile_id LIMIT n` sobre un pool de **3 perfiles sintéticos**: tomaban los mismos y
   se invalidaban las propuestas entre sí. Canónico nuevo: `resolveLiveTestCandidateFixture(scope)`
   en `live-test-identity.ts` — el sujeto se DERIVA de un scope textual, así que un archivo nuevo
   queda aislado sin coordinación. Se descartó serializar (castiga a toda la suite) y repartir con
   `OFFSET` (se rompe con el cuarto archivo).
2. **Paralelismo por archivo sobre UNA sola base.** Los live tests corren contra la única instancia
   Cloud SQL que comparten dev/staging/prod. `vitest.config.ts` los separa en un proyecto `live` con
   `fileParallelism: false`; los ~12.000 unitarios conservan su paralelismo.
3. **Contaminación de entorno — la causaba mi propio método.** `set -a; source .env.local` exporta
   ~85 variables y tumbaba **15 tests unitarios en 4 dominios ajenos** que afirman DEFAULTS. Nace
   **`pnpm test:live`**, que pasa sólo acceso a base y **rechaza cualquier `*_ENABLED`**. El test que
   afirmaba «nace disabled» ahora garantiza su precondición en `beforeEach` en vez de heredarla.
4. **Proxy caído disfrazado de suite rota.** Sin Cloud SQL Proxy los tests **pasan** y la suite igual
   sale roja, porque quien no conecta es el teardown. `test:live` hace preflight TCP.

**Bug propio destapado por el parity test de TASK-611:** había agregado las dos capabilities de
capacidad al catálogo TS **sin su fila en `capabilities_registry`** — justo lo que ese test existe
para atrapar. Sembradas; el `Down` las deprecia, no las borra.

**Evidencia:** `pnpm test` (CI, sin env) 1590 archivos / 12051 tests, 0 fallos. `pnpm test:live` 44
archivos serializados: de 6 fallos intermitentes a **3 estables**.

**Los 3 restantes NO son míos y fallan aislados también** — estaban escondidos en la sopa paralela y
ahora son visibles y deterministas: 11 capabilities de growth/commercial/platform sin seed en
`capabilities_registry`, 3 `data_sources` de client-portal (`TASK-824`) y una aserción propia de
`TASK-1509`. Sin dueño asignado; candidatos a ISSUE si el operador lo decide.

## 2026-08-23 — TASK-1762: el cierre por capacidad ya no marca a nadie como rechazado

**Estado: `code complete, rollout pendiente`.** Slices 1–5 en `develop` local, **sin push**. Tres
migraciones aplicadas y verificadas contra PG. **Los dos flags están OFF y el correo nace apagado**,
así que hoy no cambia nada para nadie.

**El hallazgo que cambió el diseño.** El ADR afirmaba que no existía fuente de verdad del número de
cupos. Era falso: `hiring_opening.requested_seats` existe desde TASK-353 y **el operador la ve y la
edita como «Cupos»** en el Demand Desk (`DemandDeskView.tsx:981` y `:1240`). Por eso
`hiring_opening_capacity` **NO guarda conteo** — sólo el opt-in y su gobernanza — y `unmanaged` se
expresa como ausencia de política vigente, no como un `NULL`. Un `target_seats` propio habría sido
un segundo «Cupos» decidiendo el cierre de 36 personas mientras la pantalla muestra el primero. El
ADR quedó enmendado en sitio y `Accepted`.

**Lo construido:** política + preview con digest + confirm durable + reconciler + correo propio.
El desenlace que escribe es `not_selected` + `capacity_filled`, **nunca `rejected`**. Un `EmailType`
propio (`hiring_decision_not_selected`) con kill-switch independiente, y la promesa del Banco de
Talento sólo con consentimiento **re-leído al enviar**.

**Tres frenos independientes**, y la independencia es lo que permite un canary: cerrar la cohorte
SIN notificarla. `HIRING_OPENING_CAPACITY_CLOSURE_ENABLED` (ejecución) ·
`HIRING_CAPACITY_FILLED_EMAIL_ENABLED` (sólo correo) · fila de `email_type_config`. **Los dos flags
viven en el `ops-worker`, no en Vercel.**

**Dos bugs que sólo aparecieron ejecutando de verdad:**

1. `runGreenhousePostgresQuery` devuelve el array **ya desempaquetado**: `.rows[0]` compila, pasa
   typecheck y revienta en runtime. Lo cazó el live test corrido **con credenciales** — sin ellas
   decía `skipped`, que a ojo se ve igual que verde.
2. **El `Down` del seed hacía `DELETE`**, y con `checkEmailTypeEnabled` fail-open eso **encendía**
   el correo en vez de deshacerlo — en el peor momento, porque uno hace rollback cuando algo ya va
   mal. Hallazgo de `greenhouse-eo-e8` auditando. Corregido a `enabled = FALSE` antes de commitear.
   **El defecto venía heredado del precedente TASK-1757, que copié fielmente** junto con su cita a
   una función inexistente. Reusar un precedente transmite también sus defectos.

**Bloqueadores reales del rollout, no agenda:**

- **El canary no es ejercitable hoy**: las dos vacantes vivas tienen **0 `selected`**, así que la
  capacidad nunca está llena y el confirm se niega correctamente.
- **`TASK-1764` sigue `to-do`**: sin ella el `EmailType` nuevo cae al perfil de footer **legacy en
  silencio**. Bloquea sólo el correo, no el cierre.
- Falta sign-off de Talent y Privacidad sobre el copy y el gate de consentimiento.

**Decisión tomada, antes implícita:** el cierre masivo **no se federa** como acción de agente. Bajo
el AI Act, selección es alto riesgo con supervisión humana obligatoria. El carril expone `preview` y
`status` como lecturas.

**Deuda ajena señalada, no tocada:** el seed de TASK-1757 tiene el mismo `Down` con `DELETE`. e8
midió que su fila está hoy `enabled=true`, así que **no hay riesgo vivo** —borrarla la deja en el
mismo estado efectivo—: es una trampa latente que se arma sólo si alguien pausa ese correo y después
revierte. Limpieza, no urgencia.

Próximo paso: `TASK-1763` (consumer UI) recibe el DTO del preview y el command sin duplicar reglas.

## 2026-08-23 — Release a producción `709e15f6688e`: los follow-ups de Hiring quedaron vivos

**Estado: `released`.** Manifest `709e15f6688e-639df794-8604-4053-8fcf-d2419cfedcc4`, orquestador
`32668879867` (un solo run, sin retry), PR #206 squash a `main` como
`709e15f6688e521549c0376f11b08340737f37a7`. 140 archivos, 73 de código, 5 migraciones. Segundo
release del día, sobre el `304371f73407` de la madrugada.

**Qué quedó vivo en producción:** contract del enum de decisión e invariante de cerrado (TASK-1765),
contract del vocabulario de etapas (TASK-1754), backfill del archivo sintético sobre el eje nuevo y
allowlist de la purga (TASK-1748), callejón de intentos en la asignación de assessment (TASK-1755),
predicado canónico de proceso activo con su señal de reliability (TASK-1772) y las fronteras del
EPIC-011 (TASK-1773).

**Sin flags que prender.** `HIRING_FAIRNESS_MONITOR_ENABLED` **queda OFF a propósito**: TASK-1754
Slice F le puso condición de retiro explícita hasta que cierre TASK-1365, porque su default
`input.stage ?? 'selected'` apunta a una etapa que el contract retiró y devolvería **cero en
silencio** en una métrica de equidad — que se lee como «no hay impacto adverso», la conclusión
contraria a la verdad.

**Evidencia de estabilidad (no sólo el health check):** watchdog 3/3 signals `ok` con
`drift_count=0`; `/api/auth/health` 200 con los tres providers `ready`; Vercel
`dpl_HRDEBU5MDSTswRjX6V6bWPGK4Det` Ready y aliased a `greenhouse.efeoncepro.com`; Sentry con **cero
issues activos** en la ventana del release; **321 eventos de outbox `published`** desde el dispatch,
sin `dead_letter` ni backlog >10min; **145 eventos reaccionados con `con_error=0`**. Los `degraded`
del dashboard de operaciones se verificaron por timestamp y son fallos de **abril–mayo 2026** —
deuda previa, no del release. `ops-worker` quedó change-gated en `181aaf4f75ca` con diff vacío
contra la lista real del gate y `Ready=True`: residual de etiqueta, no drift.

**Render verificado con sesión, no sólo con un 307.** Como el árbol de `main` y `develop` quedó
idéntico (`b34bca9490…`), staging sirve el mismo código: `/agency/hiring/pipeline` responde HTTP 200
sin marcadores de error y con las **seis etapas** de TASK-1754 en el HTML.

**Dos defectos de la documentación de release corregidos en este mismo cierre:**

1. **El comando que verifica el `ops-worker` usaba una lista de rutas que no existe en ningún gate.**
   Skill y runbook arrastraban 7 entradas (`src/lib/ops` y `scripts/ops-worker` ni siquiera figuran
   en el array real); el gate son las ~28 de `WORKER_RUNTIME_PATHS` en `ops-worker-deploy.yml`,
   entre ellas `src/lib/reliability`, `src/lib/hiring/talent-pool` y `src/lib/sync` — **las tres
   tocadas por este release**. La lista corta devolvía «vacío» sin haber mirado. Ahora el comando
   **extrae la lista del workflow** y exige un sanity sin `--`, porque un diff vacío por SHA no
   resuelto se ve igual que uno vacío por ausencia de drift.
2. **`-X ours` duplicó contenido documental y las dos verificaciones duras no lo vieron.** Salieron
   ambas vacías y el merge igual resucitó 8 tasks en su lifecycle viejo y duplicó un bloque de 10
   líneas del manual de Hiring Desk que `develop` ya tenía: `-X ours` sólo decide los hunks en
   conflicto, y uno de `main` que aplica limpio en otra parte entra como adición silenciosa. Se
   resolvió con `git reset --hard HEAD@{1}` + `git merge origin/main -s ours`. **El default del Paso
   A pasa a ser `-s ours` cuando `main ⊆ develop`**, y la auditoría correcta es
   `git diff HEAD@{1} HEAD --name-status` completo, no sólo las rutas de código.

Tiempos en `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` (~1h10m E2E, workflow 12m45s,
manifest 9m50s). Skills Claude/Codex actualizadas en paridad total.

## 2026-08-23 — Hiring: retorno contextual Application 360 → Pipeline implementado localmente

**Estado: `code complete, rollout pendiente`; sin commit, push ni release.** La pestaña persistente `Pipeline`
ahora deriva `openingId` desde cualquier postulación, vuelve con `focusApplication`, enfoca la tarjeta sin
restaurar filtros y usa View Transition tarjeta↔hero con reduced-motion equivalente. El selector de vacante
sincroniza el scope en la URL. GVC local PASS en 1440/390 px:
`.captures/2026-08-23T20-28-03_task355-hiring-application-360` (12 frames, video, cero errores runtime).
Typecheck, ESLint y 10 tests focales limpios. Pendiente: commit/release cuando el operador lo autorice.

## 2026-08-23 — TASK-1772: los dos predicados convergieron, y convergieron al valor equivocado

**Estado: `code complete, rollout pendiente`.** Slices 1-5 en `develop` local, **sin push**:
`0794b6ff1`, `31f04ed42`, `03a33a55a`, `d430990df`, `1206c0f44`. `ISSUE-162` cerrado y movido a
`resolved/`. La task ya está en `complete/` porque no depende de flags, migraciones ni deploy: es un
cambio de LECTURA sin escrituras, y su efecto ya es visible contra la base compartida.

**La condición que `TASK-1765` dejó escrita se cumplió, y su conclusión igual estaba mal.** Decía
«cuando los dos predicados converjan, el cambio es puramente de claridad». Convergieron (82 y 82) — y
convergieron contando como vivas 32 postulaciones archivadas. La respuesta no era ninguno de los dos
candidatos: **son TRES ejes**, y el tercero (`archived_at`) nació el mismo día que el ADR sin que
ningún consumidor lo incorporara. **Cuando una task deja una deuda con la condición «cuando A y B
converjan esto es cosmético», la condición se verifica midiendo: dos predicados pueden converger y
estar los dos mal.**

**Daño real medido, no aritmética de dashboard:** 5 personas **reales** figuraban `active_process` en
el Banco de Talento —o sea buscables e invitables— únicamente por una postulación archivada. Pasan a
`needs_reconsent` (54 → 49).

**Once copias, no ocho.** La spec contaba 8; la segunda familia agregó 2 más (`ISSUE-162`) y la
onceava la encontró **calibrar el gate del Slice 4**, no un barrido manual: un docstring que se
declaraba «espejo VERBATIM» de la señal y había dejado de serlo. Correr el gate y mirar qué encuentra
completó un inventario que dos barridos manuales dejaron corto.

**Un defecto que casi cometo dentro de su propio arreglo:** la primera versión le recortaba una mitad
a la conjunción con `split(' AND ').at(-1)` para que `dead-ends.ts` compusiera sólo visibilidad. Eso
sobrevive a que el predicado crezca un eje y suelta `archived_at` **en silencio**. Los ejes se
exportan como piezas nombradas: componerlas falla al compilar, recortar strings no falla.

**Declarados FUERA con su razón** (un `grep` es un inventario, no una prueba): `documents/retention.ts`
—ese `NOT EXISTS` protege de la purga, migrarlo la haría más agresiva y borrar no es reversible—,
`store.ts:1341` (guard de un write) y `hiring-application-outcome-signals.ts` (mide otra pregunta).

**Readback:** `awaiting_terminal` 13 → 3 sobre base limpia; `drift` 0; Banco de Talento 54 → 49.
Gate probado en las dos direcciones (falla sobre reintroducción, pasa sobre el árbol migrado).

**Residuo RESUELTO, y el arreglo fue la capacidad, no la limpieza.** Mi primera corrida de live
tests murió a mitad (proxy Cloud SQL caído) y dejó 8 postulaciones de humo sin archivar
(`EO-APP-0234`…`0241`). Limpiarlas exigía mutar las 43 no-reales + 16 fichas + 18 vacantes, porque
`--archive` mandaba el plan entero.

La capacidad ya existía y el CLI la pisaba: `ApplyPurgeInput` recibe allowlist en los tres niveles y
su contrato dice «Omitirlo NO archiva ninguna». `a913a6998` hace que el CLI la respete —`--archive`
EXIGE `--allowlist`, el plan completo queda tras un `--all` explícito— y mueve la validación a la
biblioteca con 7 tests. El carril de BORRADO **no** acepta allowlist ni `--all`: archivar es
reversible, borrar no, y ahí lo que decide no es QUÉ considerar sino SI califica.

Readback **medido** (2026-08-23T17:54:19Z), no esperado:

| Métrica | Antes | Después |
|---|---|---|
| `awaiting_terminal` | 5 | **3** (+12 en `awaiting_terminal_excluded_archived`) |
| `assignment_dead_ends` | 1 | **0** |
| `active_process_predicate_drift` | 0 | **0** (`canonical` 50, `archived_gap` 40; 90 − 40 = 50) |

El `assignment_dead_ends = 1` que otra sesión leyó como «apareció un callejón de una persona real»
era `EO-APP-0241`, `smoke_test`, de este mismo residuo. Verificado por columnas nombradas antes de
concluir.

**Rollout VERIFICADO en runtime (2026-08-23T18:18Z), no sólo desplegado.** Push
`099ada848..181aaf4f7`, CI 10/10 en verde incluidos los cuatro deploys de workers Cloud Run. El
ops-worker corrió la projection del Banco de Talento con el predicado nuevo:

```
active_process = 47 · needs_reconsent = 26
membresías active_process SÓLO por una postulación archivada = 0   ← el defecto, cerrado
```

⚠️ **No dio el 49 que anuncié, y la diferencia no es un error del cambio.** Entre la medición del
dry-run y ésta se archivaron las 8 del residuo y otra sesión marcó fixtures como sintéticos, así
que la población se movió por dos causas legítimas. Lo que vale como evidencia NO es el total sino
el invariante: **cero** membresías activas por un registro archivado, medido directamente. Un total
absoluto sobre una base que varias sesiones mutan no es reproducible; el invariante sí.

**Deuda destapada, sin dueño:** `assign.live.test.ts` y `propose-confirm.live.test.ts` crean fixtures
**sin declarar `dataOrigin`**, así que nacen `real`. El gate `hiring-data-origin-gate` barre
`scripts/` y `tests/e2e/`, **no** `src/**/*.live.test.ts`.

**Gates:** `pnpm lint` y `pnpm typecheck` limpios · `hiring` + `reliability` 1.908 verdes ·
`task:lint` `errors=0 warnings=0` · gate de source 0 hallazgos. `pnpm test` completo y `pnpm build`
**no** se corrieron (el build consume ~30 GB y espera autorización del operador).

## 2026-08-23 — EPIC-042: el mockup aprobado ya gobierna la implementación futura de footers

**Estado: documentación y skill completas; runtime sin cambios.** `TASK-1764` continúa como umbrella y la ADR
sigue `Proposed`: todavía no existe la child foundation ejecutable ni se habilitó ningún footer gobernado.

La ruta `/admin/emails/footer-profiles/mockup`, su vista/data, el SSOT de marca, los PNG transparentes y los
contratos UI quedaron registrados como baseline aprobado. Los cinco perfiles visuales mapean a siete `purpose`;
suscripción opcional y marketing conservan reglas distintas. Toda child futura debe demostrar paridad 720/390,
Outlook Desktop Windows/OWA, Gmail, un cliente WebKit e imágenes bloqueadas, con fallback accesible de RRSS.

La auditoría final cubrió 10 estados desktop/mobile: cero overflow, contraste mínimo 4.51:1, targets 24/32 px,
foco visible, headings `h1 → h2 → h3`, listas/tablas nativas y GVC 1440/iPhone 13 sin errores de consola, página,
hidratación o red. Esto valida el mockup local; no es evidencia de React Email ni de entrega.

La skill espejo `greenhouse-email` ahora carga este contrato, corrige `broadcast !== marketing`, fija Efeonce como
masterbrand y conserva rollout legacy/cohorts sin big bang. Siguiente paso: aceptar la ADR y recién entonces abrir
la child foundation byte-idéntica; el mockup no prueba React Email, envío, deploy ni provider.

## 2026-08-23 — TASK-1771: el carril automático tiene reversa; el gate vivo casi manda un correo

**Estado: `code complete, rollout pendiente`.** Slices 1-4 en `develop` local, sin push: `617d18df7`,
`146242339`, `d5914c841`, `0f558666a`. Más `ISSUE-162` (`9d1db5252`) y la recalibración de la spec
(`12868f9c7`). Nada desplegado, así que la task **no se mueve a `complete`**.

**Dos premisas de la spec estaban muertas al empezar, y las dos cambiaban decisiones.** La restricción de
orden («va ANTES del colapso de `TASK-1754`») ya no aplica: esa task cerró y aplicó su contract. Y las 4 filas
en callejón **ya no están `closed`** — `TASK-1748` cambió el archivado para sellar `archived_at` en vez de
escribir la etapa, así que volvieron a cumplir `stage = trigger_stage`. La decisión no cambia (**sin
backfill**, siguen siendo smoke), pero el filtro de procedencia del reader dejó de ser higiene: sin él la
métrica nacía en 2 y su steady = 0 era inalcanzable el primer día.

**La condición de avance es «hoy resolvería `assigned`», no «difiere de lo registrado»**, y no es preferencia.
Ejercitando el resolver real contra PG sobre las cuatro filas: dos dicen `volume_cap` y hoy evaluarían
`policy_disabled`. Con el criterio laxo el command las libera para volver a quemar la clave con otra razón —
y cada ciclo inútil **gasta una de las tres recuperaciones de esa persona**, así que le consume el presupuesto
a quien dice ayudar.

**🔴 El gate vivo asignó de verdad en una versión intermedia** y dejó un `hiring.assessment.assigned` en
estado `pending` —el evento del que cuelga el correo al candidato— apuntando a una instancia que el teardown
ya había borrado. El publisher corre **cada 2 minutos sobre la base compartida**. Se retiró con
verify-then-delete; readback posterior 0. La causa no fue el teardown: el encabezado del test **afirmaba** que
nunca llegaba a `assigned`, y eso era cierto cuando se escribió. **Un comentario no es una guarda.** Quedó
enforced (la policy se apaga antes del reintento + assert de cero instancias).

**Un verde falso que vale para todos:** leí «exit 0» de `pnpm typecheck | grep | head` — era el exit del
`head`. Un import roto pasó como verde. **Nunca leer el exit code de un comando encadenado.** Lo cacé por una
ausencia en `git diff --cached --stat`, no por un gate.

**Gates:** `pnpm lint` exit 0 · `pnpm typecheck` exit 0 · `src/lib/hiring` + `src/lib/reliability` 1.812
verdes · gate vivo 2/2 en dos corridas seguidas, `awaiting_terminal` = 13 antes y después. `pnpm test`
completo y `pnpm build` **no** se corrieron (el build consume ~30 GB y espera autorización).

**Pendiente bloqueante para cerrar:** release + la `Production verification sequence` + la migración del
`COMMENT` de `superseded_at`, parqueada en `docs/tasks/pending-migrations/` con su condición (**el release que
despliega el command ya ocurrió**, verificado contra `origin/main`). Aplicarla antes describiría en la base una
capacidad que el runtime desplegado no tiene — el error simétrico de `ISSUE-161`.

## 2026-08-23 — TASK-1754 Slice F: el contract está escrito y revisado; falta aplicarlo

**Estado: `code complete, migración pendiente de aplicar`.** `pnpm pg:connect:migrate` quedó bloqueado por
el clasificador de permisos y espera autorización del operador. **El `CHECK` de la base sigue admitiendo
las trece etapas**; el candado de seis vive hoy sólo en la aplicación.

**El método que autorizó a angostar, y que hay que reusar.** No fue contar filas —«cero filas» no es «nadie lo
escribe»— sino el contrato de la superficie desplegada: en `origin/main` hay **tres** escritores de
`hiring_application.stage`, los tres acotados por tipo (`store.ts:1249`/`1340` vía
`assertEnum(HIRING_PIPELINE_STAGES)`; `decide.ts:299` vía `DECISION_STAGE` → siempre `closed`). La unión son los
seis que quedan. El `stage = $n` de `store.ts:666` es un **filtro**, no una escritura: el falso positivo típico
de un grep laxo.

**Lo que cambió además del enum 13 → 6.** `TERMINAL_APPLICATION_STAGES` nace como fuente única (antes tres
copias verbatim en los guards de assessment). `STAGES_DOWNSTREAM_OF_TRIGGER` se **reescribió, no se podó**:
`client_review` figuraba aguas abajo de `shortlisted` y el colapso la absorbió dentro, así que mandaba a la
cola humana postulaciones que la reconciliación sí recupera.

**Deuda declarada a propósito.** `FAIRNESS_REPORTABLE_STAGES` conserva tres literales muertos: son el default
de `getSelectionFairness` (`input.stage ?? 'selected'`) y re-apuntar su cubo terminal cambia **qué mide** el
four-fifths rule, lo que no cabe en un contract de vocabulario. Mitigación: falla ruidoso
(`hiring_fairness_stage_retired`, 422) en vez de devolver cero, que en equidad se lee como «no hay impacto
adverso». Condición en el ledger: `TASK-1365` cierra **antes** de prender `HIRING_FAIRNESS_MONITOR_ENABLED`.

**Corrección posterior al commit (`ddb38d3a6`).** El `.sql` quedó dentro de `migrations/` porque la premisa
era aplicarlo en la misma sesión; al bloquearse el comando esa premisa murió y el archivo pasó a ser una mina:
una migración committeada y sin aplicar **no espera su turno** — el próximo `migrate:up` de cualquier sesión la
aplica sin su readback. Movida a `docs/tasks/pending-migrations/` con su condición y su readback en el
encabezado. **Regla: si no se aplica en la misma sesión que la escribe, no vive en `migrations/`.**

**Gates:** `typecheck` limpio, `pnpm lint` limpio, suite del dominio 1.236 verdes. El guard derivado
`stage-enum-check-parity.live.test.ts` **falla a propósito** ahora (enum 6 ≠ `CHECK` 13): es el readback que
se pone verde al aplicar. Readback previo tomado: 13 valores, **0 filas** en las siete etapas retiradas.

## 2026-08-23 — El dominio de Hiring está en producción; faltan tres migraciones y su autorización

**Release verificado.** `304371f734076e2bfc96529712d2fa63a179bf84` (PR #205), orchestrator run `32610182477`
success, manifest `304371f73407-ef375a47-…` en `released` (9m49s), watchdog `ok` con `drift_count=0`, health 200. Un solo run, sin retry. Subieron TASK-1765, TASK-1754, TASK-1748 y TASK-1755, más el fix de la regresión
de retención de la Ley 21.719 para `not_selected` — que se volvía viva justo cuando el release habilitaba el
desenlace, así que viajó dentro.

**Lo que falta, y por qué no lo hice.** Las tres migraciones de `docs/tasks/pending-migrations/` siguen sin
correr. Sus dos precondiciones están **verificadas contra `origin/main`**, no contra el working tree: `main` ya
no ofrece `on_hold` en el eje de Hiring (los hits que quedan son dos comentarios que documentan el retiro y un
`case` del pipeline de servicios, otro enum), y el filtro de procedencia corre en los dos runtimes — en el
`ops-worker` con código byte-idéntico, verificado con diff completo, no con la lista del change-gate. El orden
es cadena: contract del enum → backfill → invariante, con readback esperado **`1 → 0`** (si sale 33, el backfill
no corrió y se para). **Mutan la base compartida de producción y son irreversibles: esperan autorización
directa del operador.** Mientras no corran, las cuatro tasks se quedan en `in-progress/`, que es su estado
correcto.

**Dos cosas del camino que valen para el próximo release.** El merge canónico `-X ours` resucitó cuatro
archivos en su ubicación de lifecycle vieja (ISSUE-160 en `open/`, TASK-1745 en `in-progress/`, TASK-1747 y
TASK-1748 en `to-do/`): no es el modify/delete conocido, y **las dos verificaciones duras no lo detectan porque
son sobre código** — hay que buscar duplicados de lifecycle a mano. Y el bloqueador real estuvo antes del
dispatch: staging en `Canceled` por los pushes docs-only del día, resuelto tocando un doc de
`deployControlDocs` que el release necesitaba igual, no con un bypass.

**El hueco del change-gate quedó medido por otra sesión** en la Delta de `TASK-930` (`72c681a3c`): 62 rutas que
el `ops-worker` importa contra 24 vigiladas, 33 sin cubrir, incluida `src/lib/postgres/client`. Un release que
toque una de esas puede dejar el worker viejo con el watchdog en `ok`.

## 2026-08-22 — TASK-1748: archivar dejó de fingir cierres, y el orden de sus slices no era preferencia

Estado correcto: **`code complete, rollout pendiente`**. Slices 1 y 2 en `develop` local, sin push:
`1d0b4e32a`, `b0415ef50`, `5fd8e5245`, `afed7098f`. `pnpm test` completo → **11.960 verdes**; `pnpm lint` y
`pnpm typecheck` → 0 errores; `pnpm build` **no** se corrió (pendiente de autorización del operador, ~30 GB).

**Lo que cambió.** `archiveSyntheticRecords` archivaba escribiendo `stage='closed'`, y ese `UPDATE` es el origen
de las 32 filas `closed` sin desenlace que ensuciaron el diagnóstico de la auditoría del vocabulario. Ahora
escribe `archived_at` —eje propio— y cubre las tres entidades sobre allowlist explícita. El Banco de Talento
filtra por procedencia, con el predicado viajando por JOIN a `identity_profiles` porque `candidate_facet` no
tiene `data_origin` propio.

**El hallazgo que reordena el trabajo, y la spec decía lo contrario.** El `Slice 1` y el `Slice 2` **no son
independientes**. La migración del Slice 2 devuelve las 32 filas fuera de `closed`; el predicado
`stage NOT IN ('rejected','withdrawn','closed')` de `talent-pool/projection.ts` pasa entonces a dar
`has_active_application = true` para sus 11 fichas, la projection las reclasifica a `active_process` —que sí es
servible— y esa projection corre **cada 5 minutos** por Cloud Scheduler. Sin el filtro desplegado arriba, la
migración **causa** el defecto que la task vino a cerrar. Por eso quedó parqueada en
`docs/tasks/pending-migrations/` con condición de **código desplegado en los dos runtimes** (Vercel para los
readers, `ops-worker` para la projection), no de datos.

**Dos reglas nuevas que valen fuera de esta task:**

- **Se filtran los caminos que CREAN; el que CORRIGE converge.** La primera versión excluía las membresías
  sintéticas del `UPDATE` de ciclo de vida, y eso no las excluía: las **congelaba**. Una congelada en
  `pool_eligible` habría quedado visible para siempre sin que ninguna corrida pudiera sacarla.
- **Un filtro nuevo puede sacar de su steady a una señal que no tocaste.** `hiring.talent_pool.integrity` cuenta
  fichas activas «aún no proyectadas»; desde que la projection no proyecta sintéticos a propósito, esa premisa
  es falsa y la señal habría quedado en `warning` permanente — una alarma que no puede volver a cero entrena a
  ignorar el tablero.

**Trampa cara, verificada en `src/lib/postgres/client.ts` junto con la sesión de TASK-1765/1754:** anidar
`withGreenhousePostgresTransaction` **no aísla nada**. El helper llama `acquireGreenhouseTransactionClient()`
incondicionalmente, así que la transacción de adentro toma otra conexión y hace su propio `COMMIT`; el
`ROLLBACK` de afuera no la alcanza. Envolví un `reconcileTalentPoolProjection({apply:true})` creyendo que se
revertía y **commiteó contra la base compartida**. Efecto medido: idéntico a un tick del cron (441 filas de
evidencia borradas y reinsertadas iguales, 0 membresías creadas, 0 reclasificadas). Sin daño, verificado
post-corrida.

**Siguiente paso:** el release. Después, en este orden: aplicar la migración parqueada del cambio de eje →
readback (`0` no-real en `closed`, invariante 33 → 1) → correr el archivado de 11 fichas + 14 vacantes por CLI →
recién ahí el `CHECK` de `TASK-1765`. El `Slice 3` (lane B, borrado irreversible) tiene **doble bloqueo**:
sign-off del operador y esa migración — hoy el plan reporta `deletable=0` porque las 32 siguen en `closed` y el
lane exige `stage='sourced'`.

**Deuda abierta que toca este dominio:** 12 live tests de hiring crean vacantes sin declarar `dataOrigin`, así
que nacen `real` y publicables en la base compartida; `pnpm hiring:data-origin-gate` no las ve porque sólo barre
`scripts/` y `tests/e2e/`. Dos perfiles de identidad sintéticos (`identity-live-test-hiring-fixture` y el smoke
de TASK-354) siguen marcados `real` y esperan el marcado gobernado. Queda propuesto como trabajo aparte.

## 2026-08-22 — TASK-1754 colapsa el eje de etapa: expand APLICADO en base, código NO en producción

Estado correcto: **`code complete, rollout pendiente`**, y la asimetría importa. El expand de datos sí está
aplicado contra la instancia compartida —que es producción—; el código no. La mitigación `4e1566d9a` sigue sin
subir, así que **hoy en producción arrastrar a «Evaluación» todavía escribe `qualified` y sigue sin disparar**.

Slices A–E en `develop` local, sin push: `a0cee45b0` (paridad estructural: `satisfies` contra el enum del
dominio en los dos disparadores, `Record<HiringApplicationStage, string>` en el mapa de copy, muere el cast de
`stage-comms/decide.ts`), `c27ad6432` (paridad enum ↔ `CHECK` derivada de los dos lados contra PG real),
`a9926e981` (expand: `qualified` 7 → 0, `shortlisted` 4 → 11, total 83 sin cambio; `HIRING_PIPELINE_STAGES`
pierde los dos literales **antes** que el `CHECK`), `f5ca4b4f9` (`en-US` redefine `stages`; heredaba castellano
por spread sin línea que mirar en ningún diff), `1047f5ee6` (el carril declara UNA etapa; lo que agrupa se
separó en `absorbs`), `b2fbabd80` (el tablero renderizado con cada diccionario).

**Riesgo residual y siguiente paso operativo: hay 7 postulaciones REALES esperando decisión de asignación.** La
migración por SQL no emite `stage_changed`, así que no recibieron correo ni prueba — pero sí aparecen en la cola
de reconciliación de su vacante, que deriva del estado vigente y no del evento. Están en dos vacantes: 4 bajo
policy `enabled/manual` y 3 bajo `enabled/on_stage_entry`. **Avisarle a Talento.**

**El Slice F (contract) queda bloqueado por dos condiciones independientes**, y confundirlas es cómo se rompió
producción esta mañana: el release que retira los escritores tiene que estar en producción, y `TASK-1765` tiene
que estar verificada ahí antes de tocar los cuatro espejos terminales. Antes de ejecutarlo, avisarle a
`TASK-1718`: su lane programático acepta `stage` como string libre sin `assertEnum`, así que un filtro por un
literal retirado pasará a devolver cero en silencio.

**Hallazgo entregado a `TASK-1765`, no cerrado acá:** el trigger
`refresh_assessment_access_recovery_retention_for_application` ramifica por `stage` y por `decision`, y sus ramas
de `decision` **no cubren `backup_selected`, `not_selected` ni `unresponsive`**. La rama `ELSE` deja
`retention_expires_at` en `NULL` — sin vencimiento en absoluto — y `not_selected` es la población más grande del
eje de desenlace. Hoy no muerde porque la tabla está vacía. Registrado en el §17 del ADR del vocabulario.

`pnpm build` NO se ejecutó: el operador respondió «no, salvo que lo autorices después» — postergado por costo
de máquina, con la puerta abierta, **no** delegado al release; `pnpm test` completo 11.962 verdes, `pnpm lint` 0
errores, `pnpm typecheck` limpio, GVC del tablero en desktop y 390 px mirado.

## 2026-08-22 — Demo 35 queda estudiada y registrada; WordPress sigue intacto

Inspección read-only de `Demo 35: Blog Magazine` (`page_id=225984`) para su posible adaptación como home del
blog. El baseline vigente es 7 raíces, 113 nodos, 55 containers, 58 widgets y 15 `ohio_recent_posts`; catorce
usan IDs fijos, cinco referencias son attachments, cuatro widgets ya renderizan vacíos y dos pierden un slot.
La causa de que el layout parezca romperse al retirar Ohio es el wiring de contenido, no los containers.

Contrato operativo nuevo:
`docs/audits/public-site/2026-08-22-demo35-elementor-runtime-contract.md`. La landing quedó registrada en las
skills espejadas `efeonce-public-site-wordpress`. Regla principal: conservarla como página Elementor normal,
mantener `page_for_posts=0`, adaptar primero una copia/draft y preservar árbol, settings Elementor y metas Ohio;
el futuro corte debe mantener una sola canónica `/blog/`. Dueño arquitectónico existente: Public Website Landing
Control Plane. No se modificaron páginas, posts, opciones, formularios, caché ni archivos de Kinsta.

## 2026-08-22 — El vocabulario de etapas de Hiring tiene su primer ADR; auditoría de 30 hallazgos verificada adversarialmente

Sesión de diagnóstico y decisión, **cero código**. Partió de un síntoma acotado —la automatización de assessment no
disparaba— y terminó en el primer ADR que el vocabulario del pipeline tiene: nació el 2026-07-07 con `TASK-353` **sin
decisión registrada** (su spec no menciona la palabra `stage` ni una vez) y ninguna fila del índice de decisiones lo
justificaba.

**Arqueología del defecto.** Reconstruida del log append-only `hiring.application.stage_changed` (222.801 eventos) y
del historial de `git`: el carril «Evaluación» nació el 2026-07-09 (`559f5654b`) tomando su nombre de `shortlisted` y
escribiendo `qualified` — el defecto está en la **primera versión** del archivo, y el wireframe de `TASK-355` afirmaba
`columnas = etapas canónicas` cuando eran 6 contra 13. Sobrevivió seis semanas porque nada automático miraba la etapa;
se volvió caro el 2026-08-17, cuando la doctrina de selección —correcta— movió el disparador desde `interview`, la
única alcanzable, hacia la que nunca lo fue. **Ningún operador escribió jamás `shortlisted`**: de las 27 escrituras
históricas, 21 entraron por el INSERT (que no emite `stage_changed`) y ninguna es humana.

**El ADR fija dos ejes.** `stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` **se
queda y es escribible**, porque una columna terminal que no recibe tarjetas no es un kanban). **Desenlace** = cómo
terminó (`selected`, `backup_selected`, `not_selected`, `rejected`, `withdrawn`, `unresponsive`) + causa gobernada
obligatoria en `not_selected`. El invariante `stage='closed'` ⟺ desenlace declarado, como `CHECK` de base, vuelve
**irrepresentables** los dos P0 de la auditoría en vez de parchearlos. Decisión del operador: el desenlace describe a
la persona, **nunca el estado de la vacante** — cupo lleno o búsqueda cerrada son _causa_ de «Sin selección», no
etiqueta. Enmienda `GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1` (corregido en sitio, sigue `Proposed`).

**La auditoría se equivocó cinco veces y está declarado.** 6 barridos automatizados levantaron 22 hallazgos; 5
verificadores adversariales después, ninguna conclusión estructural cayó pero **5 afirmaciones estaban
sobredimensionadas y 2 evidencias declaradas eran falsas** — dos de ellas propias. H-03 y H-04 bajaron de P0; el
veredicto de Full API Parity se reformuló (cumple la letra del ADR por su cláusula de deuda; incumple el patrón
canónico §2, que no tiene escape, y el modelo correcto ya existe en el mismo dominio: `HiringHandoff`). El banner del
encabezado declara **cuatro modos de fallo** para quien audite después; el cuarto —_verificar el contenido de la tabla
cuando lo que gobierna es el código desplegado_— salió de **ejecutar** la auditoría, no de escribirla, y produjo un
break real de producción reparado en minutos (regla dura nueva en `GREENHOUSE_DATABASE_TOOLING_V1.md`).

**Carril abierto:** `TASK-1765`…`TASK-1771` (`EPIC-011`), con 12 tasks vivas alineadas — 5 con el cuerpo reescrito
porque su contrato contradecía el ADR (el Slice 2 de `TASK-1748` escribía `stage='closed'` al archivar, que es justo
lo prohibido; `TASK-1763` mostraba «N personas serán rechazadas» en pantalla) y 7 con Delta de coordinación. Dos
superficies no generaron ID y entraron como Delta a su dueño. Decisiones del operador registradas: el correo al
candidato conserva **«Preselección»** como divergencia deliberada; el identificador se queda en `shortlisted`; y en
agendamiento de entrevistas **el calendario manda** — Greenhouse agenda pero no es su dueño.

Siguiente paso: `TASK-1748` destraba el `CHECK` del invariante moviendo sus 32 filas; `TASK-1771` va **antes** del
colapso de `TASK-1754`. Estado: **todo documental, sin push pendiente salvo los últimos commits**; ningún cambio de
runtime salió de esta sesión.

## 2026-08-22 (cierre) — TASK-1765: una regresión propia corregida antes del release

Auditoría adversarial cruzada sobre el trabajo del día. **Un hallazgo real y mío, corregido:** el trigger de
retención de recibos de recuperación de acceso (`TASK-1746`) decidía con listas de literales, y los dos
desenlaces nuevos caían al `ELSE`, que pone **NULL** — el reloj de la Ley 21.719 no arrancaba nunca para
`not_selected`, que es la población más grande. Familia del H-01, y el mismo patrón de denylist que esta task vino
a borrar, sobreviviendo dentro de un trigger de PostgreSQL. Corregido con migración aplicada y verificada
evaluando el `CASE` de la función instalada; `backup_selected` queda sin vencimiento **explícito** con dueño
(`TASK-1744`, H-23) en vez de colarse por un `ELSE` mudo. **No bloquea el release: tiene que ir DENTRO de él**,
porque la regresión se vuelve viva cuando el release habilite los desenlaces nuevos.

**Dos hallazgos de la auditoría NO se sostuvieron al verificarlos** y quedaron documentados: el colapso de
`DECISION_STAGE` no mete a nadie al Banco de Talento (el `CASE` tiene dos ramas que dan `pool_eligible`; el
consentimiento decide, no `has_active_application`), y `withdrawn` no perdió su correo (ya era mudo por el
early-return). Tres sí: retiré el guard `closed` que era inerte, endurecí el guard del mapa de correo para que
itere el enum, y **honesté la doc funcional**, que afirmaba en presente un invariante todavía parqueado.

**Deuda declarada con condición medible:** cuatro predicados de «proceso activo» preguntan por `stage` cuando el
desenlace ya vive en `decision`. NO se cambian todavía: hoy darían 82 activas en vez de 50, porque las 32
sintéticas archivadas volverían a contar. Sólo es seguro tras el backfill de `TASK-1748` y el `CHECK`.

Estado: **code complete; tres migraciones parqueadas esperan el release** (contract del enum → backfill de 1748 →
`CHECK` del invariante). Árbol e índice compartido limpios. Sin push.

## 2026-08-22 — TASK-1765 parte el pipeline en dos ejes; cerrar es decidir. Contract del enum, POST-RELEASE

El pipeline de Hiring pasa a modelar **etapa** (dónde va la persona) y **desenlace** (cómo terminó su proceso) como
ejes ortogonales. Entran `not_selected` y `unresponsive`, nace `decision_cause` como enum gobernado obligatorio
sólo en `not_selected`, y nace `archived_at` — el campo que `TASK-1748` necesitaba para dejar de archivar
escribiendo `closed`. Cerrar deja de ser un cambio de etapa: la denylist del `PATCH` **se borró** y nace
`HIRING_PIPELINE_STAGES`, que excluye `closed` por TIPO, así que un cierre por esa vía ni compila.

Aplicado y verificado contra PG real: expand, command con causa en el mismo `UPDATE` (y en el replay: distinta
causa ⇒ 409), colapso de `DECISION_STAGE` a `closed`, `PATCH` acotado, señal
`hiring.application.closed_without_outcome` y las tres capas documentales. Dos regresiones se cerraron en el mismo
cambio: el selector de correo era un ternario binario que le habría mandado un **correo de rechazo al primer
`not_selected`**, y `STAGES_DOWNSTREAM_OF_TRIGGER` no listaba `closed`, así que la cola humana de triggers perdidos
se habría vaciado en silencio (H-11).

**Incidente y su lección, que vale más que la task.** El contract del enum (retirar `on_hold`) se aplicó y **rompió
producción ~7 minutos**: hay UNA sola instancia de Cloud SQL, producción sirve `origin/main` —que todavía ofrece
«Dejar en espera»— y la acción quedó en `23514`. Cero filas afectadas, reparado con forward fix permisivo. El
readback previo era correcto pero sobre el eje equivocado: **«cero filas» no es «nadie lo escribe»**. La regla
—_un contract de enum va DESPUÉS del release que retira el valor del código_— quedó en
`GREENHOUSE_DATABASE_TOOLING_V1.md` y como enmienda al §14 del ADR. Segundo hallazgo: **no existe «migración
escrita y sin aplicar» como estado seguro** — la del Slice 5 bloqueó la reparación urgente porque `migrate:up`
corre todas las pendientes. Nace `docs/tasks/pending-migrations/`.

Estado: **code complete parcial; dos migraciones POST-RELEASE pendientes**. (1) contract del enum, cuando `main` ya
no ofrezca `on_hold`; (2) `CHECK` del invariante, cuando `TASK-1748` mueva sus 32 filas — readback esperado
**33 → 0**, no 32 (la bicondicional se viola por los dos lados). `TASK-1748` quedó desbloqueada; `TASK-1744` pasa a
depender de ella; el Slice F de `TASK-1754` sigue bloqueado. Siguiente paso: **`TASK-1748`**, y después el release
que habilita las dos migraciones parqueadas. Sin push.

## 2026-08-22 — El gate de `pnpm build` corrió y pasa: cierra el pendiente de TASK-1748/1754/1755

El operador autorizó el build de producción, que las tres tasks de hiring de hoy declararon **NO ejecutado**
(`TASK-1755` por un error de tipos ajeno que ya no existe; `TASK-1754` y `TASK-1748` por costo de máquina,
con la puerta abierta a autorización posterior).

**Resultado: verde.** `Compiled successfully in 27.8s`, exit 0, **0 errores**. Los 10 warnings del log son
`npm warn Unknown env config` — ruido de `.npmrc`, ajeno al código. Corrido sobre `develop` ya sincronizado
con `origin` (38 commits empujados, fast-forward, hook pre-push con lint + typecheck en verde).

**Por qué importa que este gate corriera y no se delegara:** el build de producción es el único que atrapa
violaciones de frontera `server-only`→cliente y dynamic imports rotos — clases de bug que `pnpm test` y
`pnpm typecheck` no ven. Las tres tasks tocaron `src/lib/hiring/**` y una de ellas
(`PipelineDeskView.tsx`, TASK-1754) tocó una superficie cliente.

Con esto, **ninguna de las tres tiene gates mecánicos pendientes**. Lo que les falta es runtime, no
verificación: las tres migraciones parqueadas en `docs/tasks/pending-migrations/` esperan el release, en el
orden declarado en su README (contract del enum → backfill de 1748 → `CHECK` del invariante).
