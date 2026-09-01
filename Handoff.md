# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-09-01 (10) — TASK-1807 tomada: reducción GCP con guardrails por workload

El operador aprobó ejecutar la reducción urgente de gasto GCP. `TASK-1807` quedó `in-progress`, con baseline live
de CLP 538.785 netos en agosto y ~CLP 540.383 de run-rate. Los tres Cloud Run Jobs de Globe explican ~CLP
286.196, pero la ejecución no aplica el mismo cron a los tres: la skill y el contrato runtime de Globe registran
que Asset Governance avanza una etapa por tick y que `*/5` elevaba la convergencia en frío a ~20–25 minutos.

Orden vigente: Producer `* * * * * -> */5` con Terraform/readback/rollback; observar 24 h; Media `*/2 ->
2-59/5` con señal de backlog; Asset Governance conserva `*/1` hasta un rediseño multi-stage o event-driven con
ADR y canary. No hay autorización para CUDs, eliminación de artefactos/secretos ni cancelación de suscripciones.
Plan: `docs/tasks/plans/TASK-1807-plan.md`.

Slice 1 quedó aplicada a las 20:55Z: plan `0 add/1 change/0 destroy`, apply `0/1/0`, post-plan `No changes`.
Primer tick de la nueva cadence: `globe-producer-worker-2lq2v` a las 21:00:07Z, sano y no-op:
`queueOldestAgeSeconds=0`, retry storm/terminal attempts/divergencias/fallos en 0. La ventana de 24 h sigue abierta;
Media no cambia antes de cerrarla.

Slice 5 quedó operativo: dos budgets alert-only en CLP (Globe 250.000; consolidado 370.000), umbrales actuales
50/75/90/100% y forecast 90/100%, post-plan sin drift. Greenhouse `aad71bf07` reconcilia neto = bruto + créditos
y estabiliza el cooldown; 5 pruebas focales pasan y el dry-run no envía notificaciones. En 30 días Globe midió
CLP 350.442 brutos, CLP -2.218 en créditos y CLP 348.224 netos.

Globe `5b01e99` agregó labels a 33 recursos y retention de Artifact Registry en dry-run: 418 versiones / 10,4 GB,
KEEP 10 por paquete y DELETE simulado >30 días; cero eliminaciones. Globe `0ccf485` implementa convergencia de
cuatro stages de Asset Governance en una ejecución fenced (39/39 + 5/5 tests), pero el digest live sigue siendo
el anterior y el cron sigue `*/1`. El deploy canónico requiere SHA exacto publicado en `origin/main`; no hubo push.

## 2026-09-01 (10) — ISSUE-167 resuelto: el foco no era del form, era del eje de modelado

Resuelto el mismo día que lo abrí. **Code complete, rollout pendiente**: el bundle desplegado sigue
siendo el anterior, así que en producción el defecto continúa hasta el próximo release.

La primera lectura culpaba al path del form. Al abrir el código apareció lo real: el comportamiento
existía **dos veces y distinto** —`slide-in` con foco-return y `Escape` a nivel de shell,
`meeting-action` con el suyo propio— y faltaba una tercera. El foco y la salida por teclado se
habían modelado como propiedad del **placement**, no de «hay una superficie revelada por activación
del usuario». Por eso `embedded` no las heredaba.

Primitive canónica `src/growth-cta-renderer/disclosure-focus.ts`. Es disclosure y no modal (sin
focus trap ni `aria-modal`), y **`Escape` se escucha en el contenedor, jamás en el documento**: un
CTA incrustado no puede secuestrarle el `Escape` a la página del cliente.

🔴 **El hallazgo que vale más que el arreglo de accesibilidad salió del test:** `Escape` estaba por
emitir `dismissed`, que es una **señal de negocio** —«el visitante rechazó la oferta»— que viaja al
ledger de conversión. Cerrar un formulario abierto por curiosidad no es rechazar el CTA. Ahora
`Escape` **colapsa** al card sin telemetría, y el botón «✕ Ahora no» sigue siendo el único rechazo.
El colapso queda deliberadamente sin evento: el vocabulario de `cta_conversion_event` no tiene
`form_closed` y agregarlo es cambio de contrato server-side.

Verificación: 8 tests de la primitive + 3 del cableado, **falsificados** revirtiendo el arreglo (2
rojos de 22; 47/47 con él). Y un riesgo que jsdom no habría atrapado, cerrado con medición contra el
DOM real de producción: si `<greenhouse-form>` montara en shadow DOM el selector no lo vería y el
arreglo sería inerte — verificado que no usa shadow DOM y expone 5 controles al selector exacto.

`meeting-action.ts` conserva su gestión propia: funciona, no tenía defecto medido, y refactorizarla
sin necesidad era riesgo sin retorno. Queda como consumidor candidato.

Próximo paso: release develop→main + rebuild del renderer, y repetir el recorrido con teclado en
vivo en ambos hosts antes de dar el issue por cerrado operativamente.

## 2026-09-01 (9) — cinco oportunidades LicitaLAB promovidas por MCP HubSpot

El operador confirmó la promoción manual de cinco oportunidades. El MCP de HubSpot creó y releyó los Deals
`64528962434` (Chile Cultura), `64544277070` (Universidad de Chile DII), `64529115746` (JUNJI), `64532229714`
(Temuco) y `64521733176` (CNTV), todos en `default` / `qualifiedtobuy`, owner `75788512`, con ID de licitación,
llave de idempotencia, ficha, plazo, próximo paso y asociación Deal ↔ Company verificada. Temuco y CNTV requirieron
Companies nuevas `57953559382` y `57958935823`; no se fabricaron contactos. CNTV quedó en `Strategic Bets`, no en
una etapa ficticia: el stage sigue siendo `qualifiedtobuy`.

Corregida la contradicción entre skills: `hubspot-greenhouse-bridge` ahora coincide con el companion LicitaLAB y
con `project_context.md`: el MCP de HubSpot es el writer gobernado para promociones manuales confirmadas; la brecha
del bridge sólo limita automatización. Registros CRM general y de licitaciones sincronizados tras readback. Pendiente
comercial real: admisibilidad, loaded cost/margen y producción de propuestas; ninguna postulación fue enviada.

## 2026-09-01 (6) — barrido documental de los 19 cierres y la calibración que faltaba

Cerré el ciclo del barrido: 19 tasks quedaron en `complete/` y el registro alrededor de ellas ya no
miente. Tres subagentes barrieron docs de proceso, ledger de flags y coherencia epic↔registro; lo que
reportaron lo verifiqué yo antes de escribirlo — los conteos de hijas los medí por campo `Epic:`
(`EPIC-022` 36/39, `EPIC-020` 38/14, `EPIC-040` 11/10, `EPIC-023` 7/3) y coincidieron.

Corregido: `Lifecycle` desincronizado en `TASK-1090`; 5 rutas stale en `README`/`TASK_ID_REGISTRY`;
9 estados falsos en el `README` (1036, 1040, 1253, 1321, 1330, 1335, 1113, 1430, 1431); conteos y
prosa stale en cinco epics y en `AEO_PROGRAM_STATUS.md` —que decía «no existe entrada pública
self-serve» cuando `/aeo-2/` ya corre el grader—; 10 archivos con rutas rotas a tasks cerradas; y
las reglas duras de `TASK-1112`, `TASK-1246`, `TASK-1261` y `TASK-1336` que se apoyaban en un hecho
ya falso.

Lo estructural, que es el hallazgo de fondo: **el registro del avance no estaba en ningún checklist
de cierre**. `stale-progress` avisaba en un comando que el protocolo no mandaba correr — un
mecanismo apagado. Quedó agregado a los checklists de `CLAUDE.md` y `AGENTS.md`: tildar los
criterios que la evidencia respalda, dejar sin tildar y con razón lo que no, poner `Status real` al
día y correr `pnpm task:lint --task TASK-###` antes de mover a `complete/`.

Además: `ui-flow-contract` recibió la misma calibración incidental-vs-focal que ya tenía
`ui-wireframe-contract` —una task en `to-do/` a la que sólo le corrigen una ruta no debe romper el
gate por deuda previa—, con test falsable (rojo sin la calibración, verde con ella; el fixture hace
`git init` porque sin repo el modo `changed` no ve nada y el test sería teatro). El footer de
`flags:audit` decía «verdad live = `vercel env ls`»; `ls` sólo dice que la variable existe, así que
ahora nombra `vercel env pull`. Y el mensaje de `no-opacity-on-text` estaba en voseo.

Gates: `local:check` exit 0, `task:lint:test` 47/47, `ops:lint --changed` errors=0,
`docs:closure-check` sin dueño faltante, `docs:context-check:strict` 0/0, 262 tests de lint-rules.

## 2026-09-01 (9) — TASK-1427 cerrada: el motor CTA queda con evidencia medida, y deja ISSUE-167

Cerré la primera rebanada del motor CTA. Lo importante no es el cierre sino cómo se sostuvo.

**La ventana de 7 días era un falso verde.** El criterio pedía observar `growth.cta.*` durante siete
días tras el deploy del 2026-07-18. Medido contra PG: entre el 18 y el 25 de julio hubo tráfico **un
solo día**. Cero errores sobre cero tráfico no prueba nada. Cerré con la serie completa de 45 días —
0 errores server-confirmed, 0 kill switches, 0 colisiones, con exposición real (219 observaciones el
2026-08-29). Es evidencia más fuerte que la pedida, sobre una ventana más larga.

⚠️ **Los readers de signal no podían responder la pregunta.** `growth-cta-signals.ts` filtra
`INTERVAL '1 day'` en sus tres queries: sirven para «¿está sano ahora?», nunca para «¿estuvo steady
durante N días?». Cualquier criterio de ventana exige ir a la tabla base. Dejé
`scripts/growth/_sanity-cta-signal-window.ts` para que la próxima sea medición y no cita.

🔴 **Probar el teclado destapó `ISSUE-167`.** Me negué a tildar «funciona con teclado, Escape/focus
restore» sin ejercitarlo, y en producción encontré que al abrir el Growth Form desde un CTA **el foco
queda en `body`** y **`Escape` no cierra**. Abre como expansión inline (sin `role=dialog` ni
`aria-modal`) pero sin las dos obligaciones de ese patrón. Es del **renderer compartido**: afecta a
todos los CTA en Think y WordPress. La task cierra con ese criterio **sin tildar y con la razón
escrita**, que es el desenlace correcto.

Sí verificado live hoy: render con el contrato completo, sin overflow en 1280 y 375 (card 343px),
formulario alcanzable por teclado tabulando (5 controles, primero `firstName`).

**Pendiente NO bloqueante, decisión del operador:** el placement AMPLIO en WordPress (recomendado,
posts del blog vía `the_content` en `ohio-child`). Hoy sólo existe la página de prueba.

Transparencia: mi verificación sumó 2 eventos al ledger productivo (`clicked` + `form_opened`).

## 2026-09-01 (8) — el cierre queda escrito en los SEIS sitios donde alguien cierra

El hallazgo estructural del día era que `stale-progress` avisaba en un comando que ningún protocolo
mandaba correr. Quedó cerrado: la regla de registrar el avance donde se LEE está ahora en `CLAUDE.md`,
`AGENTS.md`, `.claude/commands/implement-task.md`, `GREENHOUSE_OPERATING_LOOP_V1.md`, `TASK_PROCESS.md`
y el `greenhouse-documentation-governor` (ambos espejos). Verificado sitio por sitio, no asumido.

`TASK_PROCESS.md` ganó las calibraciones medidas del barrido —qué cuenta como commit de
implementación, por qué NO se filtran los `TASK-###` entre paréntesis, y los tres desenlaces
legítimos cuando la regla avisa— más la advertencia que me costó un error real: **ausencia de código
en este repo no es evidencia de que no exista** (`TASK-1259` estaba construida en otro repositorio).

`TASK_UI_UX_ADDENDUM.md` documenta dos cosas que no estaban en ningún lado: la severidad
foco-vs-incidental de los gates de wireframe/flow, y el protocolo de **contrato retroactivo** para
UI ya construida que nunca declaró contrato (etiquetarlo, derivarlo de fuente verificable, enumerar
lo que NO cubre). Precedentes `TASK-1078` y `TASK-1259`.

El `greenhouse-qa-release-auditor` suma los tres defectos nuevos de gate —con la lección de
propagación: al corregir una regla, revisa sus hermanas; (c) y (e) eran el mismo bug en dos reglas
gemelas— y una regla nueva que vale para cualquier fix: **un test que pasa sin el arreglo es teatro**.
Falsifícalo revirtiendo la corrección.

Reparado además un empalme que yo mismo introduje antes: la nota de `stale-progress` se había
insertado en medio de la regla de los markers ZONE del `greenhouse-task-planner` y la había partido.

## 2026-09-01 (7) — barrido `stale-progress`: 16 tasks auditadas, 12 con el aviso resuelto

Ninguna se cerró, y eso es el resultado, no una falla: **ninguna estaba realmente terminada**. Lo que
faltaba era el registro. 319 checkboxes en cero repartidos entre las 16.

Regla que me impuse y sostuve: tildar sin evidencia es peor que no tildar. Por eso 1258 y 1352
quedaron en cero criterios con la razón escrita, y 927 se llevó 1 de 6 aunque tiene 5 slices
construidos —el único criterio que el estado OFF satisface de verdad es «cero escrituras».

Hallazgos que valen más que los checkboxes: **TASK-1160** predijo en agosto que al 100% del budget
toda invariante nueva se degradaría por falta de espacio, y hoy me pasó a mí, medido. **TASK-1258**
nunca construyó su control plane de migración, pero 1253 y 1254 difirieron su flip «al cutover de
1258» y terminaron ON en prod por otra vía: el cutover ocurrió sin su gobierno. **TASK-1427** tenía
una ventana de siete días de observación de signals que venció el 2026-07-25 y nadie miró.
**TASK-1255** no tiene retención ni purga de PII —el mismo hueco que 1246 declara.

Tres defectos propios corregidos en el detector, los tres con test falsable (verificado revirtiendo
la regla): `stale-blocker` disparaba con `Blocked by: none (explicación que nombra al blocker)`;
`ui-flow-contract` rompía el gate por deuda previa al tocar una task incidentalmente; y un commit
`fix(docs):` contaba como implementación. NO filtré los `TASK-###` entre paréntesis: medido sobre
los 31 asuntos con 2+ referencias, arreglaría 6 casos y escondería 8 reales.

**Me equivoqué con TASK-1259 y lo corregí en la misma sesión.** Escribí «no empezada» porque no
encontré el selector — buscándolo en el repo equivocado. Está construido en
`efeonce-public-site-runtime` (`27c1468`), sin deploy. Le escribí wireframe y flow retroactivos
—reales, desde el manual, no stubs— porque estaba `in-progress` con UI y sin contratos declarados.

Quedan 4 con el aviso vivo (1112, 1258, 1259, 1352): son justo aquellas donde nada se puede tildar
con verdad. Su `Status real` ahora responde el aviso en la primera línea que alguien lee.

## 2026-09-01 — DataForSEO Improved ETV: contrato documentado, cutover no autorizado

Tres subagentes auditaron documentación oficial, siete consumers y drift de skills. El aviso de cuenta anuncia
`use_improved_etv: true`, legacy por default hasta 2026-11-01 y después improved; la documentación pública aún
no publica matriz de endpoints, retroactividad, pricing ni convivencia con clickstream. Greenhouse no declara
fórmula y las UNIQUE append-only de domain/URL/prospect no permiten shadow dual.

Actualizadas las skills espejadas DataForSEO/SEO, dossier Labs, contrato interno, manuales y
`docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md`. Quedaron además: correo de diez preguntas en
**borrador/no enviado**, ADR aceptado con implementación/costo/cutover gated, runbook de evaluación y
`TASK-1805` y `TASK-1806` registradas `to-do` bajo `EPIC-022`. La primera posee
expand→writers→readers/API/MCP→signals/evaluator y cierra todavía en legacy; la segunda depende de su cierre y
posee shadow→decisión histórica→cutover/rollback. Un A/B exacto puede requerir dos llamadas pagadas; un canary sin
gasto incremental es sólo comparación temporal. Sin code/schema/flag/scheduler/API pagada ni runtime mutation.
Siguiente paso: enviar el correo sólo con autorización, incorporar la respuesta contractual y, en otra instrucción,
tomar `TASK-1805`; `TASK-1806` requiere además autorizaciones separadas de gasto y cutover. Estado:
**diseño pre-implementación completo; implementación/rollout pendiente**.

## 2026-09-01 — Performance Report agosto comunicado por TeamBot

Nexa publicó el anuncio grupal en `EO Team` con cuatro menciones reconocidas como `aadUser` y CTA al informe; después envió cuatro lecturas 1:1 a Daniela, Andrés, Melkin y Valentina. Los cinco audit runs quedaron `succeeded`. El copy personal conserva contexto: volumen alto no implica sobrecarga, los atrasos heredados se separan del tiempo de ejecución y onboarding se trata como muestra pequeña. Evidencia: `docs/audits/communications/2026-09-01-performance-report-teambot.md`.

El workflow canónico sigue siendo temporal para DMs genéricos: aprobación → Entra activa → dry-run → dedupe/source object → `--yes` → auditoría. Lo recurrente converge a Notification Hub; no quedó script permanente.

## 2026-09-01 (5) — gateway MCP desplegado: `TASK-1780` operativamente completa

El deploy del gateway (`workflow_dispatch`, no se dispara solo) se ejecutó. Revisión
**`efeonce-mcp-gateway-00026-ctp`**, 100% del tráfico, `Ready=True`, `headSha` del run = `e92961e`.
La revisión anterior (`00024-8b8`) era del 28-ago y **no llevaba el cambio**: lo verifiqué por
timestamp antes de disparar, en vez de asumirlo.

Antes del deploy re-verifiqué lo único capaz de romper runtime: `GREENHOUSE_SEO_WRITE_TOOLS` —que
gatea el 403 de scope en `app.ts`— deriva ahora de `writes || spendsProviderBudget` y da **el mismo
conjunto de 7**. Sin efecto de comportamiento, comprobado antes y no después.

**Canary verde de punta a punta contra producción.** `serp-top-results` con filas reales
(`captureDate: 2026-09-01`), deny `404` anti-oracle en todas, escrituras honestas en su gate.

⏳ **Paso 9 de `TASK-1699` NO se puede cerrar hoy, y lo medí en vez de deducirlo:**
`readSerpCompetitorCandidates` devuelve `candidates: []` con `minDays: 5` y la serie en **4 días**
(29, 30, 31-ago y 1-sep). La lista vacía es el resultado **esperado** con serie joven, no un error.
La quinta captura entra el **2026-09-02 a las 05:00 CLT**; recién ahí la revisión de candidatos con
el operador tiene sustrato.

Corregidas de paso las referencias a la revisión productiva en el runbook, la doc del gateway y la
skill (los dos espejos) — decían `00024-8b8`. Y el runbook declaraba un commit `807fb76` «local sin
push» que **hoy es ancestro de `origin/main`**: drift cerrado.

## 2026-09-01 (4) — 15 tasks cerradas del barrido, y una que NO se cerró a propósito

**15 de las 16 de papeleo quedaron `complete`**, cada una con su evidencia por criterio y su
`Status real` corregido: `1036 1040 1090 1113 1209 1210 1225 1253 1282 1321 1330 1335 1430 1431 1747`.
Desbloqueadas de paso `TASK-1246`, `1254`, `1255` y `1336`.

✅ **`TASK-1078` cerrada por instrucción del operador, y el wireframe se escribió DE VERDAD.**
`docs/ui/wireframes/TASK-1078-nexa-floating-chat-expandable-persisted.md` documenta el diseño que ya
corre —regiones, riel de 272px, los seis estados, la persistencia compartida con `HomeView`, las
cinco primitives— todo leído del código con archivo y línea. El propio documento declara en su
encabezado que es **retroactivo** y **enumera lo que NO cubre** (geometría del contenedor, GVC mobile
del runtime, baseline `fe:capture:diff --promote`) en vez de rellenarlo.

`UI ready` quedó en **`n/a`, no `yes`**: `yes` reclamaría un paquete de diseño previo —UI/UX Contract,
Implementation Mapping, GVC Scenario Plan, Design Decision Log— que esta task nunca tuvo.
Desbloqueada `TASK-1112`.

⚠️ **Dos defectos de `task:lint` corregidos en el camino**, ambos de la misma clase que veníamos
cazando —un mensaje que promete algo que el mecanismo no honra—:
1. `ui-wireframe-contract` ofrecía la salida «set UI impact to none with rationale», pero la
   inferencia por `Domain` la anulaba. Ahora una declaración EXPLÍCITA gana sobre una INFERIDA.
2. `normalizeStatusValue` comparaba el valor crudo del campo, y el parser dobla las líneas de
   continuación DENTRO de él: `UI impact: none` **seguido de su razón** llegaba como `"none\n> razón…"`.
   La regla se rompía justo cuando el autor hacía lo que la plantilla PIDE. Rompió TRES reglas
   distintas en el mismo cierre antes de que lo viera. Ahora compara la primera línea.
3. `ui-wireframe-contract` trataba como **error** a una task en `to-do` tocada de refilón —limpiar un
   `Blocked by` obsoleto bastaba—, cuando su propio mensaje dice *"before implementation"*. En modo
   FOCAL sigue siendo error, porque ahí alguien va a trabajarla y hay test que lo fija; en modo
   `--changed` sobre `to-do` queda warning. ⚠️ Mi primer intento rompió ese test: la calibración
   correcta distingue focal de incidental, no afloja el gate.

Retrofit honesto en `TASK-1036` y `TASK-1113`: `UI impact: none` **con razón escrita** — ninguna
diseña superficie (tokens y un fix de render), así que no les corresponde wireframe.

## 2026-09-01 (3) — barrido de 27 tasks: el ledger era la causa, y dos defectos vivos quedaron registrados

**Barrido completo con 4 subagentes.** 16 son papeleo puro, 8 tienen trabajo real, 3 esperan decisión
tuya. Pero el hallazgo que importa no fue ninguna task: **el `FEATURE_FLAG_STATE_LEDGER` declara
`prod: OFF` en 24 filas cuyo valor live es `true`**. Es el SoT humano que un agente lee para decidir
si algo está desplegado — la misma clase de defecto que hizo repetir `TASK-1699` cinco veces, en otra
tabla.

`pnpm flags:audit` era **estructuralmente ciego** a eso: `vercel env ls` lista presencia, nunca valor.
Ahora hace `vercel env pull` y compara. Detección ejercitada: la 1.ª versión dio 32 con falsos
positivos (escaneaba párrafos narrativos); acotada a filas de tabla, 24; verificado uno de punta a
punta —`COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED`, donde el ledger **se contradice a sí mismo** entre su
línea 174 y su 266—. Sin credenciales la sección se apaga sola. Corregí a mano las 3 que verifiqué;
quedan **21 filas** señaladas, cada una a confirmar antes de tocar.

**Dos defectos vivos registrados** (se pierden si no tienen dueño):
- **`ISSUE-165`** — `/api/admin/spaces:122` crea organizaciones con `INSERT` crudo, sin
  `organization_type`/`origin`/`lifecycle_stage`, violando la regla dura de `CLAUDE.md`. Es la puerta
  que `TASK-991` existe para matar. ⚠️ Impacto **latente**: 0 filas corruptas hoy. Y el CHECK que 991
  da por entregado **no existe en la base** (su aplicación está despejada: 0 violadores).
- **`ISSUE-166`** — el CTA «Pregúntale a Nexa» despacha `focusRef` + `seedPrompt` y el listener **no
  declara el parámetro del evento**: abre el chat sin anclar ni preguntar. Regresión del retiro del
  panel `dock` (`e1662f3b3`). Dueña del fix: `TASK-1182`.

⚠️ **`TASK-927` no está esperando una decisión: su gate está en ROJO.** 10 tareas terminales
(Aprobado/Archivado) con bucket `overdue`/`carry_over`. Prender el flag hoy escribiría "no entregada"
sobre trabajo aprobado, en una columna **visible al cliente**. El remedio previo es el script de
recompute, no el flip.

## 2026-09-01 (2) — TASK-1709 `complete`: llevaba 5 días desplegada y la doc decía OFF

Mismo defecto de registro que `TASK-1699`, detectado por la regla `stale-progress` **a los dos
minutos de existir**: 4 commits de implementación, 33 checkboxes sin tildar, `Status real: Diseno`.

🔴 **Lo peor no era la task: era la doc.** Cuatro skills (×2 espejos), el runbook del gateway MCP,
dos manuales y la doc funcional decían *"flag OFF en todos los ambientes"*. Verificado con
`vercel env ls`: **`GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` está ON en Production desde el
2026-08-27**. El runbook llegaba a instruir al canary a tratar un `disabled` como *"respuesta honesta,
no fallo"* — hoy eso **enmascararía una regresión real**. Corregido en los 9 archivos.

Evidencia medida: 2 diagnósticos y 11 hechos sobre `skyairline.com`; previsto USD 0,2050 vs medido
USD 0,1991 bajo tope duro de USD 1,00; gasto atribuido a «Efeonce Group SpA» en el ledger —
presupuesto de **adquisición**, no costo de cliente. Tier `prospect` documentado en la arquitectura §9.

⚠️ **Debilidad detectada en el guard `stale-blocker`** (no la arreglé, la registro): lee la línea
completa del campo `Blocked by`, así que una explicación entre paréntesis que **nombre** al blocker
ya cerrado se reporta como bloqueo vigente. Me pasó dos veces hoy (1704/1708 y 1670/1695/1713). La
salida fue mover la razón a un `## Delta` y dejar el campo limpio. El arreglo de fondo sería que la
dirección reversa use `parseBlockedByIds` —que ya existe— en vez de un `matchAll` sobre la línea
cruda. De paso quedaron desbloqueadas `TASK-1670`, `1695` y `1713`.

## 2026-09-01 — TASK-1699 `complete`, y el defecto de REGISTRO que la re-ejecutaba en bucle

**La task estaba hecha desde el 28-ago; lo que nunca pasó es que el archivo lo registrara.** Tenía
**46 checkboxes y cero tildados** más `Status real: Diseno`, que son los dos campos de ZONE 0 que una
sesión lee para decidir si tomarla. Cada sesión leía *"diseño, 46 pendientes"*, la re-implementaba,
escribía un `## Delta` y no tocaba ninguno de los dos. Pasó **cinco veces**: `cc80968c1`…`c5b609d12`
(6 slices), `fdfdedbe5`, release `c983be7f1`, `bb6eb8d11`, `7e918c84d`.

Cerrada con evidencia medida hoy, no heredada de los docs: señal `seo.serp_top_results.coverage` →
`ok`, `uncovered: 0` (convergió sola, **sin tocar el umbral**, en la fecha que el Delta del 29-ago
predijo); serie viva **766 · 775 · 762 · 778** filas los días 29, 30, 31-ago y 1-sep; UNIQUE de 6
columnas, trigger append-only y GRANTs sin UPDATE/DELETE verificados contra `pg_constraint`. Los 46
quedaron tildados **uno por uno con su evidencia**.

🔴 **Un criterio nombraba `discovery_evidence_json`, columna que nunca existió** — la evidencia se
resolvió con `proposal_ref` opaca. Corregido contra `information_schema` en vez de tildado a ciegas.

**Pendiente NO bloqueante:** el Paso 9 exige ≥5 días de serie y cae el **2026-09-02**; la propia
`## Verification` lo declara diferido. **Gate no corrido:** `pnpm build` (~30 GB, requiere tu
autorización explícita). Desbloqueadas `TASK-1704` y `TASK-1708`, que la citaban.

**Guardrail nuevo `stale-progress` en `task:lint`** para que no se repita: avisa cuando una task
activa tiene commits `feat/fix/refactor/perf` con su ID y **cero** checkboxes tildados, y cuando una
se cierra sin tildar ninguno. Warning y no error, medido: 414 de 975 en `complete/` y 59 de 121 en
`in-progress/` están así, y un error sería ruido histórico; acotada a las que tienen commits de
implementación, la señal cae a **28**. Muerde en `pnpm task:lint --task TASK-###`, que es lo primero
que corre el harness — o sea, antes de re-implementar.

## 2026-08-31 — Blog WordPress: taxonomía canónica y copia Demo 35 listas para adaptación

La limpieza live dejó 13 categorías canónicas, 20 posts Ohio demo en papelera,
11 posts reales reclasificados y 15 categorías descartadas eliminadas. AEO y
SEO son raíces; Diseño Web depende de Diseño y Redes Sociales de Marketing
Digital. PDR-019 separa jerarquía, primaria Yoast y prominencia en portada.
Redirects de archivos/permalinks y `410` demo quedaron aplicados y verificados.

La copia de trabajo `251875`, publicada con `noindex` en
`/demo35-blog-magazine-copia-trabajo/`, conserva el árbol y metas Ohio de la
fuente protegida `225984`. `/blog/` no cambió. Siguiente slice: mapear sus 15
`ohio_recent_posts` a `manual | query | remove`, reemplazar copy/assets/enlaces
Ohio y suscripción, y ejecutar QA antes de pedir aprobación de cutover. Canon:
`docs/public-site/decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md`
y `docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md`.

## 2026-08-31 — Superficies misceláneas WordPress: discovery y canon, sin rollout

Se documentó el ownership live de 404, búsqueda/no-results, categorías, tags, autor, fecha y archivos:
Ohio padre sigue resolviendo `404.php`, `search.php`, `content-none.php`, `searchform.php` e `index.php`; la
librería Elementor no tiene templates/conditions especiales y la integración Ohio observada sólo cubre
header/footer. El diseño objetivo queda `child-theme-first`, con `PublicUtilityRecoverySurface`, búsqueda y
archivos como slices separadas y reglas HTTP/SEO por query type. No hubo mutación WordPress, caché ni deploy.

Riesgos P0 observados: una página pública/indexable con `(Borrador)` en título/slug y chrome global con enlaces
demo/rotos; search vacío expone 154 resultados. El runtime repo continúa con WIP ajeno y
`fullRepoDeploySafe=false`, por lo que una futura publicación exige artefacto acotado de `ohio-child`, snapshot,
rollback y aprobación. Canon:
`docs/architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md` y
`docs/audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md`.

## 2026-08-31 — Content Marketing: pin/contraste publicados; E2E bloqueado por Turnstile

Paquete focal de **dos assets** publicado en la página `242603`: JS
`8d89cd4708de7892…` y host CSS `ce9eeaa3cb62472…`. Mount y resize comparten el gate
`width >= 940 && height >= 740`; 1440×650 queda en flujo. Contrastes detectados corregidos sin
cambiar copy/layout/tipografía. Backups Kinsta `/tmp/eo-content-marketing-before-20260831-211317.tar` y `…-211754.tar`.
Documento/settings/thumbnail permanecen `b8d37969…` / `c99030e6…` / `251825`.

Producción: pase ampliado de 38 estados de contraste verde; dos captions adicionales del fallback
se corrigieron en un segundo paquete focal. Además, resize
1000↔650, capítulos, tabs/cortes, 390, teclado, reduced motion y JS-off. Assets públicos coinciden
por SHA. El formulario v3 está activo, sin destinos y con ledger vacío antes/después. El intento
sintético normal fue rechazado por Turnstile antes del POST: no hubo submission ni lead. Rechazos
API honeypot/missing-token correctos. El tag genérico sí produjo un `generate_lead` **sintético**
`smoke-test` a `G-KYPPY57M14`, `/g/collect` 204; Admin API confirmó stream/property, pero Realtime
aún no devolvía fila. Esto no cierra accepted→ledger→GA4. Evidencia y rollback:
`docs/audits/public-site/2026-08-31-content-marketing-technical-closure.md`.

## 2026-08-31 — Contacto y cobertura institucional: fuentes corregidas, rollout pendiente

El brief de reconstrucción de `/contacto/` quedó en `docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md` con
formulario por motivo, reclamos/sugerencias, Meetings y routing. La dirección y teléfonos se verificaron contra
la contraportada canónica: Dr. Manuel Barros Borgoño 71, oficina 1105; +56 9 3732 3064; +1 (239) 235-2073.
Estados Unidos ya forma parte de la cobertura operativa junto a Chile, Colombia, México y Perú; fuentes de
contexto, posicionamiento, primitives y skills espejadas fueron conciliadas sin ampliar métricas históricas.
`TASK-1801` quedó registrada en `to-do` con visual direction, wireframe, flow y motion; task lint `template=1`, `legacy=0`, 0/0. No hubo mutación WordPress: la página pública todavía requiere implementación, rollout y readback.

## 2026-08-31 — TASK-1780: el inventario de tools MCP dejó de ser dos listas (Slice 3 pendiente de tu decisión)

`src/mcp/greenhouse/tool-manifest.ts` es ahora la fuente del inventario: `server.ts` **registra
recorriéndolo** y el `name`/`instructions` que el cliente MCP lee se **derivan** de él. Dos banderas
ortogonales por tool —`writes` y `spendsProviderBudget`—; fusionarlas era el defecto original.

Baseline medido al tomarla, distinto del que la spec declaraba: **43 tools** (28 SEO + 15 no-SEO),
**7 escrituras** (la spec decía cuatro), 4 comprometen gasto del proveedor. El criterio 🔴 de cierre
—«el guardia detecta las tres tools invisibles»— era **infalsificable**: `TASK-1658` ya las federó.
Se reemplazó por el drift que sí existe hoy: `get_seo_provider_spend`, federada **sin contraparte
interna**, que ahora se declara en vez de deducirse.

Evidencia: snapshot del registro del SDK antes/después **idéntico byte a byte**; el artefacto generado
reproduce el espejo a mano tool por tool (misma clase de escritura, mismos `inputKeys`), con la única
divergencia esperada; `pnpm test` completo 12.919/0; gateway `pnpm check` verde con 73/73.

✅ **Cerrada.** Greenhouse `7089d92de..d2b3c0639` en `develop` con los 9 workflows en `success`; gateway
`efeonce-mcp` `f523960..e92961e` en `main` con CI `success`. El deploy del gateway **no es automático**
(`deploy.yml` es `workflow_dispatch` puro): la revisión productiva sigue siendo
`efeonce-mcp-gateway-00024-8b8` hasta que alguien lo dispare, y no corre prisa — la verificación de esta
task es de CI, no de runtime.

**Barrido documental con 4 subagentes** (docs funcionales/manuales · arquitectura y contexto · skills
espejadas · lifecycle e impacto cruzado). Corregí 8 skills, 5 specs de arquitectura, 9 docs
funcionales/manuales, 4 tasks vivas y el EPIC-022. Dos huecos sistémicos que encontró el barrido y
valían más que los conteos: `.claude/rules/growth-seo.md` —la regla que más se auto-carga— instruía
editar a mano justo el espejo retirado, y **ninguna rule cubría `src/mcp/**`**, así que los invariantes
de la superficie no se auto-cargaban nunca (creada `.claude/rules/mcp-tool-surface.md`). Además
`mcp:manifest:check` entró a `local:check`: bajo doctrina local-first, sin eso el drift del artefacto
sólo aparecía en CI.

⚠️ **Cifra a no repetir de memoria:** varios docs decían "27 tools federadas"; el array en runtime dice
**28**. Interno son 28 SEO (21 lecturas + 7 escrituras) de 43 totales. Los dos conjuntos no son iguales
**por construcción** y ahora está declarado, no deducido.

## 2026-08-31 — Content Marketing publicado desde diseño aprobado

Menú verificado: **Soluciones → Crecimiento Multicanal → Content Marketing**, item `242917`, sin duplicados ni cambio de orden.
[Revisión editorial de ambas secciones](docs/audits/public-site/2026-08-31-content-marketing-editorial-copy.md): 118 campos publicados, siete pasos coherentes; diseño/SEO/shell intactos.
[Segundo pase editorial](docs/audits/public-site/2026-08-31-content-marketing-hub-review-copy.md): hub y revisión creativa, 83 campos publicados; tres cortes y fichas de campaña revisados.
[CMS y modos](docs/audits/public-site/2026-08-31-content-marketing-cms-modes.md): 53 textos y cuatro logos oficiales publicados; ocho controles nuevos, diseño general y SEO conservados.
[Ecosistema y FAQ](docs/audits/public-site/2026-08-31-content-marketing-ecosystem-faq.md): 37 textos y seis URL publicados; tarjetas completas y ocho FAQ, sin cambios de diseño/SEO.
[Marca en modalidades](docs/audits/public-site/2026-08-31-content-marketing-mode-logo.md): dos logos ampliados con CSS acotado, sin cambiar contenido ni SEO.
[Indexabilidad del menú](docs/audits/public-site/2026-08-31-menu-indexability.md): 18/18 páginas habilitadas; sólo Redes Sociales requería quitar noindex. Canonical/sitemap verificados; indexación GSC no afirmada.
[Cierre, caso interno y formulario](docs/audits/public-site/2026-08-31-content-marketing-business-conversion.md): 48 textos Elementor y copy de form v3 publicados; correo copiado coincide con lo visible, sin cambiar destino ni enviar leads. Ajuste posterior: cinco textos condensados para equilibrar las columnas, sin cambiar el formulario.

Landing `242603` publicada con trece widgets Elementor y chrome Ohio intacto. Formulario canónico, SEO y
verificación pública 1440/1280/890/390; 78 tests del renderer PASS. No se enviaron leads ni correos.
[Auditoría, snapshots y pendientes](docs/audits/public-site/2026-08-31-content-marketing-publication.md).
TASK-1799 sigue in-progress por contraste del diseño, smoke de conversión/GA4, editor completo y CWV/research.
Runtime inicial `73493a8`, refinamientos publicados versionados en `f12dd64`; ocho archivos cotejados con producción. Cierre de scripts/docs/skills en este commit, sin push. No repetir el cutover inicial.
Revisión documental con tres subagentes: docs triples, índices, inventario, skills espejadas y task/UI
reconciliados. Menú conserva secuencia visible; no se afirma igualdad de valores raw `menu_order`.
Hallazgo confirmado: resize a 1440×651 activa pin aunque mount bajo 740 px no lo hace; pendiente de
TASK-1799, sin cambio de código en este pase. Evidencia y comandos en la auditoría enlazada.
