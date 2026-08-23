# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-23 — El dominio de Hiring está en producción; faltan tres migraciones y su autorización

**Release verificado.** `304371f734076e2bfc96529712d2fa63a179bf84` (PR #205), orchestrator run `32610182477`
success, manifest `304371f73407-ef375a47-…` en `released` (9m49s), watchdog `ok` con `drift_count=0`, health
200. Un solo run, sin retry. Subieron TASK-1765, TASK-1754, TASK-1748 y TASK-1755, más el fix de la regresión
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
la persona, **nunca el estado de la vacante** — cupo lleno o búsqueda cerrada son *causa* de «Sin selección», no
etiqueta. Enmienda `GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1` (corregido en sitio, sigue `Proposed`).

**La auditoría se equivocó cinco veces y está declarado.** 6 barridos automatizados levantaron 22 hallazgos; 5
verificadores adversariales después, ninguna conclusión estructural cayó pero **5 afirmaciones estaban
sobredimensionadas y 2 evidencias declaradas eran falsas** — dos de ellas propias. H-03 y H-04 bajaron de P0; el
veredicto de Full API Parity se reformuló (cumple la letra del ADR por su cláusula de deuda; incumple el patrón
canónico §2, que no tiene escape, y el modelo correcto ya existe en el mismo dominio: `HiringHandoff`). El banner del
encabezado declara **cuatro modos de fallo** para quien audite después; el cuarto —*verificar el contenido de la tabla
cuando lo que gobierna es el código desplegado*— salió de **ejecutar** la auditoría, no de escribirla, y produjo un
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
—*un contract de enum va DESPUÉS del release que retira el valor del código*— quedó en
`GREENHOUSE_DATABASE_TOOLING_V1.md` y como enmienda al §14 del ADR. Segundo hallazgo: **no existe «migración
escrita y sin aplicar» como estado seguro** — la del Slice 5 bloqueó la reparación urgente porque `migrate:up`
corre todas las pendientes. Nace `docs/tasks/pending-migrations/`.

Estado: **code complete parcial; dos migraciones POST-RELEASE pendientes**. (1) contract del enum, cuando `main` ya
no ofrezca `on_hold`; (2) `CHECK` del invariante, cuando `TASK-1748` mueva sus 32 filas — readback esperado
**33 → 0**, no 32 (la bicondicional se viola por los dos lados). `TASK-1748` quedó desbloqueada; `TASK-1744` pasa a
depender de ella; el Slice F de `TASK-1754` sigue bloqueado. Siguiente paso: **`TASK-1748`**, y después el release
que habilita las dos migraciones parqueadas. Sin push.

## 2026-08-22 — TASK-1755 destraba el callejón del ledger de asignación; sin migración, verificado contra PG real

Un intento manual de asignar prueba que terminaba en `blocked`/`held`/`stale` ocupaba la clave de idempotencia del
ledger de forma permanente: corregir la causa real —habilitar la política (que es el estado en que NACE toda
política), activar la plantilla, registrar el correo— no devolvía la capacidad de asignar, porque el `INSERT` hacía
`DO NOTHING` y el replay repetía el resultado viejo. `confirmAssessmentAssignment` ahora pide el intento siguiente y
`assignAssessmentFromPolicy` lo resuelve contra el ledger bajo el `FOR UPDATE` de la policy, dentro de la misma
transacción que ya tiene bloqueada la propuesta.

Tres respuestas del resolver, y la tercera es la que evita el daño caro: sin intento vigente o vigente recuperable ⇒
`max + 1` (monotónico contra toda la historia, superseded incluida); **cualquier otro resultado vigente ⇒ su mismo
número**, para que el `ON CONFLICT` colisione y la respuesta sea el replay — un casillero libre junto a un `assigned`
vivo le crearía una segunda prueba al mismo candidato. Lo que define un intento nuevo es la **identidad de la
propuesta**, no su digest: `templateStatus` no entra al material del digest, así que con "digest distinto" como
criterio un `blocked: template_inactive` quedaría irrecuperable.

Sin migración: `attempt_seq`, el `CHECK (origin = 'manual' OR attempt_seq = 1)` y los `GRANT` por columna ya
existían. Ledger append-only: cero `DELETE`, cero `UPDATE` destructivo. Evidencia: 8/8 en el test de reproducción,
472 verdes en `src/lib/hiring/assessment` y **3/3 del gate vivo contra PostgreSQL real** (policy `draft` bloquea →
`markPolicyEnabled` → asigna en el intento 2, con las dos filas vigentes en la base), con teardown verificado sin
residuo.

Estado: **`code complete, rollout pendiente`**, no `complete`. Verificado, no supuesto:
`git show origin/main:…/confirm-assignment.ts` no contiene el sentinel, o sea **el callejón sigue vivo en
producción** — hoy confirmar con la política en `draft` todavía quema la llave de esa persona. La task se movió a
`complete/` por error y se devolvió a `in-progress/`, quedando alineada con `TASK-1748`, `TASK-1754` y `TASK-1765`,
que suben en el mismo release del dominio Hiring. Lo que falta es sólo el deploy: no hay flags, env vars, migración
ni backfill que aplicar.

**Sin backfill, decidido con el conteo real.** Las únicas 4 filas en callejón son del carril **automático**
(`stage_auto` / `volume_cap`), sobre candidaturas `closed` con `data_origin='smoke_test'` —no son personas— y su
clave manual está libre. Ese carril no puede reintentar por `attempt_seq` (lo prohíbe el `CHECK`) y su reversa
declarada, `superseded_at` por reconciliación, no tiene write path: es el hueco de **`TASK-1771`**, que además
hereda la restricción de orden respecto de `TASK-1754` que el Delta original le atribuía a esta task por error.

Siguiente paso: que suba en el release del dominio Hiring y verificar el ciclo contra el deployment activo antes de
mover la task a `complete/`. Nota para ese release: de las 7 postulaciones reales que esperan decisión de asignación
de prueba, **las 4 manuales son exactamente la población que esta corrección desbloquea**.
**`pnpm build` no se ejecutó, por decisión declarada:** el repo tiene
hoy un error de tipos vivo de `TASK-1765` en `src/lib/hiring/store.ts` sobre el mismo checkout, así que el build
fallaría por causa ajena, y el riesgo propio es bajo (server-only, sin JSX ni frontera cliente). Lo corre el release
con el árbol limpio. `pnpm test` completo sí: **11.938 verdes, 0 fallos**.

> **Corrección 2026-08-22 (sesión de auditoría):** el error de tipos citado arriba **ya no existe** — `pnpm typecheck`
> pasa limpio sobre este árbol. O sea que el bloqueo declarado para saltarse el build se disolvió. Ojo con la
> conclusión: **typecheck limpio no es build verde** (el build de producción además atrapa violaciones de frontera
> server-only→cliente y dynamic imports rotos), así que el gate sigue pendiente — lo que cambió es que ya no hay
> causa ajena que lo justifique.

Riesgo residual conocido: el blast radius es alto porque es el único camino que crea pruebas de candidato, y la
defensa contra la doble prueba es la rama 3 del resolver más el índice único parcial — ambas cubiertas por test
unitario y por el gate vivo. Hallazgo colateral abierto: 12 live tests de hiring fabrican vacantes sin declarar
procedencia, así que nacen `real` y publicables en la base compartida; el gate no las ve porque sólo barre
`scripts/` y `tests/e2e/`. El fixture de esta task ya quedó corregido; los otros 12 y la extensión del gate quedan
propuestos como trabajo aparte.

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

## 2026-08-22 — EPIC-042/TASK-1764 gobiernan footers sin big bang; cero cambios de correo o runtime

Se creó `EPIC-042`, su primera child `TASK-1764` y un ADR Proposed para dejar de improvisar footers sin poner en riesgo una de las
superficies más estables del producto. Efeonce es siempre la masterbrand; Greenhouse sólo puede aparecer como su
plataforma. Firma y footer quedan separados, prioridad de entrega no determina propósito y unsubscribe nace
prohibido salvo suscripción opcional o marketing explícitamente clasificados.

El contrato incluye además RRSS, dirección e información legal como bloques independientes: RRSS default `none`
y sólo institucionales en suscripción/marketing; identidad `compact|entity|full` desde el operating entity; nota
`none|security|privacy|regulated`, sin disclaimer universal. Full legal en marketing es baseline conservador sujeto
a validación con abogado habilitado por jurisdicción, no una declaración de cumplimiento global.

La task no posee código ni habilita un reemplazo global de `EmailLayout`. La primera child deberá introducir el
contrato con output legacy byte-idéntico; las siguientes cubrirán una sola familia y máximo cuatro `EmailType`.
Cada cohorte exige baseline, diff limitado al footer, previews 720/390 y sin imágenes, tests, aprobación explícita,
canary consentido en cliente real y rollback por tipo. Access/security, Hiring externo y transaccionales regulados
nunca comparten release. Estado: **diseño/documentación; ADR Proposed; ningún template, envío o runtime cambió**.
Siguiente paso: revisar/aceptar el ADR y sólo entonces crear la child foundation dentro de `EPIC-042`; siguientes
IDs libres `TASK-1772` y `EPIC-043` (actualizado 2026-08-22: `TASK-1765`…`TASK-1771` tomadas por el carril de desenlace).

## 2026-08-21 — Correo de selección personalizado adopta una firma visual Efeonce; rollout pendiente

`hiring_decision_selected` ahora separa asunto, preencabezado y título visible, confirma la elección sin declarar
incorporación y explica `carta oferta → aceptación → contrato` con paridad HTML/texto plano. La primera propuesta
3D, el bouquet genérico y la V3 corporativa abstracta quedaron rechazados. Diseño + Talent
convergen en una V4 concreta: sobre abierto, tarjeta sin texto, check de confirmación y un destello naranja. No
representa demografía, contrato ni onboarding, pesa 63.972 bytes y quedó en
`gs://efeonce-group-greenhouse-public-media-prod/emails/hiring-selected-email-mail-icon-v4.png` con readback 200.

Se retiró la tarjeta que repetía la vacante y la imagen permanece decorativa (`alt=""`). La decisión y los hitos
documentales ahora guían la lectura con negritas visibles aplicadas a frases completas,
y ambas variantes de decisión firman `Equipo de Talento · Efeonce`, alineadas con el Reply-To real. La variante de
rechazo no consume la imagen. Capturas finales: `.captures/hiring-selected-email-hero/email-v6-720.png` y
`.captures/hiring-selected-email-hero/email-v6-390.png`. Estado: **code complete, rollout pendiente**. No se envió ningún correo real ni se
desplegó el cambio; el siguiente paso es incluirlo en un release normal y verificar un envío consentido en un
cliente de correo real.

## 2026-08-21 — TASK-1762/1763 formalizan cierre por cupos y correo empático; cero runtime nuevo

Se crearon dos tasks bajo `EPIC-011` y un ADR Proposed. `TASK-1762` posee capacidad explícita separada de
publicación, preview/confirm humano, run durable por item, decisión/evento canónicos y variantes de rechazo directo
o vacante completada. `TASK-1763` es el consumer UI de Application 360 con dirección visual, wireframe y flow.

La selección de una persona nunca auto-rechaza. Sólo un preview fresco y una confirmación explícita crean el run;
el worker llama `decideHiringApplication` por cada application y el correo nace desde ese hecho, conservando dedupe
y recovery parcial. `backup_selected`/`on_hold` se muestran aparte. La frase de Banco de Talentos sólo aparece con
consentimiento futuro vigente; `data_origin` no gatea comunicaciones. TASK-1689 queda histórica y TASK-1721 ahora
apunta a estos owners. Estado: **diseño/documentación; ADR Proposed; sin código, migración, flag ni envío nuevo**.
Siguiente paso: aceptar/ajustar el ADR, tomar TASK-1762 y después TASK-1763.

## 2026-08-21 — TASK-1761 formaliza Hiring → Microsoft Entra; implementación bloqueada por ADR y gates P0

Se creó `TASK-1761` dentro de `EPIC-011` y el ADR Proposed
`GREENHOUSE_HIRING_ENTRA_WORKFORCE_ACCOUNT_PROVISIONING_DECISION_V1.md`. La decisión propone API-driven inbound
provisioning con app dedicada: cuenta disabled-first desde `principal_bound`, reconciliación de provisioning logs,
OID binding al mismo principal antes del SCIM de retorno, y enable/grupo/licencia sólo después de
`workforce_enabled`, approval y capacidad verificada. TASK-1721 observa checkpoints; 770/1731 mantienen sus
owners; 872 conserva Entra → Greenhouse; 1349 entrega el hecho de baja y 1761 compensa en Microsoft.

Dos gates P0 salieron de la revisión adversarial: `src/lib/entra/profile-sync.ts` hoy convierte
`accountEnabled=false` en `client_users.active=false`, por lo que una precreación segura podría apagar `/my`; y
meter la cuenta al grupo SCIM antes de ligar el OID puede crear otro principal/member. Ambos se convirtieron en
precondiciones de canary con negative/roundtrip tests. Email/UPN no son anchor; `202` no es éxito; rollback exige
disable/revoke/remove group-license y no sólo flag OFF.

Azure CLI fue read-only. El tenant tiene Entra P1 consumido 1/1, Microsoft 365 Business Premium consumido 6/6,
ningún grupo con licencias y `Efeonce Group` no es security-enabled. La identidad inbound puede diseñarse, pero
M365 readiness queda bloqueada/unknown hasta readback comercial y de assignment. TAP también quedó unknown por
403. Estado: **diseño formalizado; ADR Proposed; ningún código/runtime/Azure mutado**. Siguiente paso: aceptar o
ajustar el ADR y luego tomar TASK-1761 con goal + task hook.

## 2026-08-21 — Confiabilidad: hallazgos medidos contra runtime; dos umbrellas superseded por EPIC-041

Codex venía reportando hace semanas dos hallazgos de confiabilidad (`wh-sub-notifications` con dead-letters `401` y
dos handlers `contract_mrr_arr` fallidos). Al medirlos contra PostgreSQL el 2026-08-21 resultó que **son los dos
menos urgentes**, que **siete hallazgos previos estaban mal calibrados o eran falsos positivos**, y que el problema
más caro no aparecía en ningún reporte porque el módulo de confiabilidad lo muestra en verde.

`TASK-1432` (2026-07-18) y `TASK-1710` (2026-08-15) describían el mismo incidente con un mes de diferencia, sin
referenciarse, con cero commits y cero tasks hijas. Ambas quedan **superseded** por `EPIC-041`, que conserva el
baseline medido y fechado, la tabla de falsos positivos y el orden de ejecución.

Correcciones que importan para quien retome: el bridge income→HubSpot **nunca se terminó de construir** — su
endpoint receptor `/invoices` no existe en ninguna rama y 80 de 84 incomes vienen de Nubox, que nunca traerá
anchors; no hay `CLP 141.562.545` perdidos, hay ruido P3. La tasa PPM **es correcta** (`0,125%` confirmada por el
operador); lo obsoleto es el campo `notes` de `ppm_rate_config`, que produjo una falsa alarma de P0. Las
notificaciones **sí funcionan hoy** (7 días de actividad, 100% `sent`); los únicos avisos huérfanos son
`member.created` y `compensation_version.created`, y el conteo dio 12 y **1** respectivamente, ambos sin eventos
desde el 2026-06-26.

Se descartó además un fix que parecía obvio: sacar `skipped` de `isSuccessOutcome` en `handler-health.ts` **no
habría arreglado nada** — sólo 4 filas en toda la tabla empiezan con `skipped`, y los 9.001 falsos éxitos los
produce `no-op`. Ese análisis también expuso que **no existe ni un test** de `recordHandlerOutcomes` ni de
`classifyOutcome`, y que la llamada está envuelta en un `try/catch` que sólo hace `console.warn`.

Estado: **documentación completa, ejecución no iniciada**. Ningún cambio de código, ninguna mutación de datos,
ningún flag tocado. Siguiente paso: `TASK-1760` (cablear las projections de PPM y retenciones), único carril cuyo
daño crece. Owner sin asignar.

## 2026-08-21 — Transparencia GPT Image 2 code complete; rollout de Globe pendiente

La documentación oficial completa de OpenAI quedó consolidada en
`OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`: GPT Image 2 es el único miembro activo/recomendado y soporta
`background=transparent` en preview con PNG/WebP. GPT Image 1.5, 1, 1 Mini y `chatgpt-image-latest` están deprecated
con retiros en octubre/diciembre de 2026. Las skills `greenhouse-ai-image-generator` y
`greenhouse-globe-model-fleet` quedaron corregidas y espejadas; el gate ahora valida también el bundle de imágenes.

El helper Greenhouse ya conserva GPT Image 2, rechaza `transparent+jpeg`, evita pagar/descartar outputs múltiples,
valida máscara/formato/dimensiones y no promete partial images sin transporte SSE. Globe transporta
`backgroundMode` desde catálogo/shape hasta request, fingerprint, manifest y output; verifica alfa decodificado,
expone el selector route-driven y usa checkerboard tokenizado. La ruta Globe queda probada localmente, sin deploy ni
gasto desde ese runtime.

El CLI canónico de Greenhouse completó además un canary facturable mínimo con `gpt-image-2`, PNG 1024×1024,
`quality=low` y `background=transparent`: el archivo tiene cuatro canales, alfa real y 470.164 píxeles totalmente
transparentes; la composición visual pasó sobre fondos claro y oscuro. Esta evidencia valida el helper Greenhouse,
no el adapter/runtime autenticado de Globe.

Estado: **code complete, rollout pendiente**. La variante transparente sigue Globe-gated hasta desplegar, ejecutar
un canary autenticado y facturable sobre `ref/still/openai-v2`, leer bytes/metadata/cobro, capturar GVC y ejercer
promoción/rollback. No actualizar evidencia de reader/canary histórico sin revalidación real. Pendientes adicionales
quedan en `TASK-1552`, `TASK-1553` y `TASK-1633`: badge requested/effective en feed/viewer, GVC/canary live,
promoción/rollback del modo preview y WebP sólo si se decide ampliar la ruta PNG actual.

## 2026-08-20 — Hiring Evaluación: espacio vertical fantasma corregido localmente

La tabla accesible del scorecard ya no recibe dimensiones de 1 px directamente: vive dentro de un
wrapper genérico `1×1` clipado y conserva `caption`, encabezados `scope` y las cuatro columnas del
contrato. GVC local premium pasó desktop 1440 y mobile 390 con cero findings/runtime errors; geometría
medida: `scrollWidth === clientWidth`, wrapper `1×1`, `scrollHeight` 1549/2296. El scenario dejó de
ignorar la tabla y el layout gate detecta `layout_out_of_flow_vertical_runaway`. Estado: **code complete,
rollout pendiente**; no hubo push, deploy ni release en esta sesión.

## 2026-08-19 (noche) — Release 1745/1746 en producción, y cuatro hallazgos que quedaron en tasks

Sesión paralela a la de TASK-1747. Lo que sigue es lo que una sesión fresca necesita saber para no
repetir trabajo ni reabrir decisiones ya tomadas.

**El release está en producción y verificado.** `6f85644cd`, orchestrator run `32256882119` success,
watchdog `drift_count=0`. El `ops-worker` muestra SHA distinto: es el change-gate, los árboles son
idénticos, no es drift. Las dos migraciones están aplicadas con readback, el índice concurrente creado
(`valid=true, ready=true`) y **20 bearers que estaban en claro en `delivery_payload` fueron saneados**.

**El webhook de Resend funciona.** Nunca había existido — esa era la causa raíz de ISSUE-160. Probado
con correo real: `email.sent` y `email.delivered` firmados en 45 s. Ya se puede responder "¿este correo
llegó?" con `email_deliveries.provider_status` + `delivered_at`, que era imposible esta mañana.

**Dos cosas que NO hay que deshacer.** El fix de Turnstile `ef30759a1` fue revertido en `a36967531`:
el timeout de 15 s no se cancelaba al entrar el desafío interactivo, y el supuesto de dónde pinta
Cloudflare quedó sin verificar. Y `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` sigue en `false`
a propósito: hay `email.clicked` **firmados por webhook**, o sea el rewrite de links está ocurriendo
hoy sobre correos de candidatos, y el bearer del cutover viaja en el fragmento.

**Corrección de un error mío que quedó escrito antes:** dije que el tracking del apex "no medía nada"
por faltarle `tracking_subdomain`. Es falso — ese campo es para un dominio de tracking propio, no un
segundo candado. El flag solo basta. Corregido en la skill `resend-email-platform`, que además quedó
espejada a `.codex` y protegida por el gate de espejos.

**Cuatro tasks nuevas, todas con el análisis dentro:**
- `TASK-1749` — tracking de marketing sobre dominio propio (bloqueada por el cutover)
- `TASK-1750` — el desafío interactivo de Turnstile deja fuera a candidatos; su Slice 1 es **verificar
  con la sitekey `3x00000000000000000000FF` antes de implementar**, que es lo que el intento revertido
  se saltó
- `TASK-1754` — las etapas del dominio son las que el operador puede elegir
- Pendiente sin ID: invertir el default de la política de assessment + revisar plantilla por vacante

**El hallazgo que más cuesta y por qué quedó como patrón.** `GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9:
*un estado que el sistema distingue, la superficie no puede colapsarlo*. Cinco casos del mismo día en
cuatro dominios. El síntoma reconocible: **si responder "¿por qué no funcionó?" exige leer la base de
datos para recuperar un dato que el runtime ya tenía, hubo colapso de estado.** Hoy pasó cinco veces y
cada una costó horas.

**Dominio `mail.efeoncepro.com`**: verificado, con SPF/DKIM/DMARC en PASS. Nace sin tracking y **nunca**
debe configurársele un `tracking_subdomain` — es irreversible, sólo se cambia. Mover Hiring ahí es la
salida limpia al problema del rewrite.

**Estado del árbol:** producción corre `6f85644cd`; hay commits en `develop` sin push de las dos
sesiones. No hay nada mío a medio camino.

## 2026-08-19 (noche) — TASK-1747 en curso, traspasada para una sesión nueva

Slices 1 y 2 cerrados; Slice 3 sin empezar. El estado completo para tomarla en frío está en
**`docs/tasks/in-progress/TASK-1747-…md` §Traspaso 2026-08-19** — commits, qué se revirtió y por qué,
los 8 hallazgos de auditoría abiertos y las 3 decisiones que no hay que re-litigar.

**Lo que la auditoría adversarial cambió, y vale más que el código entregado.** El Slice 2 bajaba al
navegador el consentimiento de la candidata y el estado del proveedor de correo, con **ningún**
componente leyéndolos: las props de un Client Component se serializan en el HTML se lean o no. Ningún
gate lo veía — GVC no captura lo que no se pinta y el build no lo mira. Se revirtió el cableado; viaja
con el slice que lo renderiza.

**Y destapó un bug real de `TASK-1746` que ya estaba en producción:** el cooldown de recuperación era
cross-canal en la lectura y por-canal en el comando. Un correo recién enviado apagaba el enlace seguro
durante 60 s — exactamente ocultarle al candidato la única salida que le quedaba, que es lo que el
comentario de ese bloque juraba evitar diciéndose "espejo EXACTO". Corregido en `2e2d4de86` con
cooldown por canal y 4 tests. Lo que lo mantuvo vivo: al fixture del test le faltaba un campo, así que
`Number(undefined)` daba `NaN` y el presupuesto del enlace seguro nunca se ejercitaba.

**El copy también salió corregido de auditoría**, con tres hallazgos que verifiqué contra el código
antes de aceptarlos: los motivos borraban el "reports" del enum (nadie puede afirmar que un correo NO
llegó, y eso quedaba escrito en un ledger append-only); "la candidatura ya está cerrada" se le habría
mostrado a alguien con decisión `selected`; y el mensaje de vencimiento describía 1 de sus 3 ramas, así
que en las otras dos el operador seguía la instrucción y volvía a chocar.

**Estado: nada de esto está en producción.** `develop` tiene además Sonnet 5 de vuelta en el scoring y
la reconciliación del item del run, ambos sin promover. La promoción exige verificar que el ops-worker
quede en el SHA nuevo: el scoring corre ahí, no en Vercel.

## 2026-08-19 (tarde) — El rollout ya estaba hecho y la documentación decía lo contrario

**Corrección de estado.** Las entradas de más abajo dicen "nada aplicado: ninguna migración, ningún secreto, ningún
webhook, ningún flag". Eso dejó de ser cierto a las 13:00 UTC de hoy y **nadie actualizó los documentos**. El peligro no
era cosmético: un agente siguiendo el runbook al pie habría creado un **segundo webhook** al mismo endpoint (eventos
duplicados que el dedupe por `svix-id` NO detiene, porque son ids distintos) y publicado una **segunda versión del
secreto**, rompiendo la verificación del webhook vivo. Corregidos: runbook, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1`,
ledger de flags, `ISSUE-160`, `TASK-1749` y este Handoff.

**Lo que faltaba de verdad, ya aplicado con readback.** El índice único `uq_email_deliveries_token_intent_v2` (los
writers que rotan credenciales llevaban horas corriendo **sin** el backstop que el runbook exigía aplicar antes) y el
CONTRACT de credencial. Sus tres precondiciones se verificaron una por una antes de tocar nada: código en `origin/main`,
Vercel productivo posterior al merge, y ops-worker en `1438906b8` — un SHA de `develop` que **sí** incluye el writer. La
confirmación empírica fue mejor que el chequeo de SHA: un assessment creado después del deploy ya nació con
`access_token_version_id`, y 0 filas violaban el invariante. El guard se probó en transacción revertida y rechaza como
debe.

**La reconciliación destapó 44 correos que nunca llegaron** — 23 `suppressed` y 21 `bounced` — y después, al mirar los
destinatarios, que **todos van a dominios internos de Efeonce**: `efeoncepro.com` (23), `efeonce.org` (13),
`greenhouse.efeonce.org` (7), `efeonce.test` (1). **Cero externos.** Los 8 `hiring_assessment_assigned` fallidos son
direcciones de prueba/QA, no candidatas. O sea: **el daño temido no ocurrió** y no hay cola de rescate para People.
Casi lo reporto al revés — el conteo agregado parecía un incidente grave hasta que se miró a quién le llegaba. Lo que el
dato sí muestra es datos sintéticos y de prueba transitando el pipeline de correo productivo, la misma clase de
problema que `ISSUE-159`.

**`email.suppressed` no estaba suscrito.** Los 8 eventos registrados omitían justo el noveno — y `recover-email.ts`
consulta ese estado para bloquear un reenvío ciego. Un falso negativo silencioso en la puerta de recuperación. Ya son 9.

**El smoke externo real ya está probado por tráfico productivo:** la cadena `email.sent` → `email.delivered` se observó
firmada sobre un `hiring_assessment_assigned` a `gmail.com` — un candidato real, no una casilla interna. Y el
`email.clicked` firmado sobre un assessment a `hotmail.com` es la **prueba dura** de que el rewrite de links de Resend
ya opera sobre correos de candidatos: el gate de `click_tracking` que bloquea el flip de enlaces seguros no es teórico.

**Huecos declarados, no cerrados:** 78 despachos de los últimos 30 días quedan sin lifecycle porque su último evento es
de engagement (`opened`/`clicked`) y el reconciliador prefiere no inferir `delivered` — honesto, pero descarta una señal
que el `opened` implica; 283 despachos fuera de la ventana de 30 días sin reconciliar por diseño;
`redrivePendingResendWebhookEvents` sigue sin caller automático; no se ejercitó un replay real del proveedor.

**`mail.efeoncepro.com`: el DNS está perfecto, Resend no lo confirma.** DKIM publicado con valor idéntico byte a byte,
SPF y MX en su lugar; el dominio sigue `pending`. Aprendizaje operativo: **re-disparar `POST /verify` resetea los tres
registros a `pending`** — hay que esperar, no reintentar. Cuando verifique, mover el remitente de Hiring ahí desbloquea
el flip de enlaces seguros **sin** apagar el `click_tracking` del apex, que marketing usa. Es la salida limpia al gate
que hoy bloquea `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`.

**Estado: TASK-1745 complete e ISSUE-160 resuelto. TASK-1746 sigue in-progress** — le faltan los dos smokes funcionales
(requieren una candidata con consentimiento, decisión humana) y el flip de enlaces seguros. TASK-1747 quedó desbloqueada.
