# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-29 (7.º) — auditoría independiente de la cola: el orden servido contradecía el rank persistido en banda 2 (fix aplicado + deuda de procedencia quemada)

Auditoría independiente de TASK-1700/1785 pedida por el operador tras 3 releases con dolor.
**Veredicto:** el núcleo de v2 estaba bien (predicado único ✅, piso por versión ✅, adapter sin
`null→0` ✅, schedulers/flags/deploy.sh de main verificados en vivo ✅, snapshots vigentes v2 ✅) —
pero apareció un defecto real que ningún test veía: **54 de 55 items de banda 2** de
`seot-efeonce-own-brand` servidos fuera de su `rank_in_snapshot` (Berel 0/501 — invisible donde
domina banda 1). Reproducido de forma independiente por las dos sesiones peer antes de aceptarse.

Causa: el comparador desempata banda 2 por `tieBreakImpressions` DESC — **no es columna** — y el
reader reconstruía el orden en SQL con tres llaves; con score NULL en toda la banda colapsaba a
alfabético. El test de paridad comparaba el **string** del SQL: guarda que afirma, no que verifica.

**Fix (asignado a esta sesión por el operador; las peers quedaron fuera por contexto saturado):**
el reader sirve y pagina `rank_in_snapshot ASC` (keyset `rank > cursor`; cursor viejo reinicia
página 1, jamás saltea). Comparador = única autoridad de orden; coincidencia servido↔persistido
**por construcción**. UNIQUE index nuevo `seo_work_queue_items_rank_unique_idx` (migración
`20260829213303021`, **aplicada**; ranks verificados contiguos 1..N en los 12 snapshots).
**Re-medido live paginando de punta a punta:** efeonce 105/105 y Berel 501/501 con **0**
discrepancias de secuencia; bandas 1 y 3 sin regresión (estaban en 0 y siguen).

En el mismo tren se **quemó la deuda de procedencia de `work-queue`** (su condición de salida era
este fix): DTO emite `provenance` en lista, fuente nueva `own_ctr_model` (◑, «insumos medidos,
resultado estimado») para score/techo/CTR esperado, censo en `emitted`, cobertura hoja por hoja en
`provenance-coverage.test.ts`. Quedan 7 deudas declaradas en el censo.

Docs: Delta (3) en TASK-1700 + Delta en TASK-1785, §18.8 de la arquitectura SEO reescrito (el
orden canónico vive en el comparador; el reader lo LEE), `SQL_DATE_MATH_AGENT_INVARIANTS`
§"Orden y paginación" ahora con TRES bug classes + protocolo "dataset que exhibe cada estado",
`.claude/rules/growth-seo.md` actualizado.

**Pendiente con dueño:** retirar `seo_work_queue_items_keyset_idx` (huérfano del reader nuevo) en
migración aditiva **DESPUÉS** del release que promueva este fix — el reader desplegado hoy en
producción todavía lo usa. Verificación post-promoción: repetir la paginación live de punta a punta
contra `seot-efeonce-own-brand` (debe seguir 0 discrepancias con el código promovido).

## 2026-08-29 (6.º) — el release cerró verde con el worker sirviendo código viejo

Tercer paso a producción del día (`64bdd105c737`, orquestador `33272258036`). Manifest `released`,
Vercel READY, watchdog sin drift — y el `ops-worker` en `8adf8c2d3`, o sea `incremental-clicks-v1`.
El change-gate se saltó el deploy y el job cerró `success` en 46 s.

Causa raíz cerrada, no parchada: la decisión se tomaba contra una lista de rutas a mano que cubría
24 prefijos de los 1449 archivos que el worker bundlea. Nuevo gate `pnpm worker:deploy-path-gate`
(en CI, junto a `worker:runtime-deps-gate`) deriva la cobertura del metafile de esbuild. Commits
`146070ffc` y `53e240d79` en develop.

Deploy break-glass del `ops-worker` autorizado por el operador → `ops-worker-00617-mtc`,
`GIT_SHA=64bdd105c737`, flag ON, `Ready=True`. Los cuatro workers verificados.

**Revisión vigente al cierre: `ops-worker-00618-lz2`, `GIT_SHA=53e240d79c31` — NO el SHA del
release.** Lo causó el push del propio fix del comentario de `deploy.sh`: `services/ops-worker/**`
es disparador, así que movió al worker fuera del SHA promovido. Verificado por CONTENIDO, que es
lo que decide: el único archivo del bundle que difiere vs `64bdd105c` es `deploy.sh` y **sólo en
comentarios**; `cannibalization.ts` tiene blob `6ceb87e4…` idéntico a `origin/main` y el código que
corre declara `incremental-clicks-v2`. La ancestría NO sirve como prueba acá —`main` promueve por
squash, así que `merge-base --is-ancestor 64bdd105c 53e240d79` falla aunque el contenido sea el
mismo—; una sesión peer la usó y concluía de más.

🔴 **El manifest es incompleto para el worker.** Dice que producción está en `64bdd105c`, y hay UN
solo `ops-worker` compartido entre staging y producción que hoy corre código de develop no promovido
por el control plane. Hoy es benigno (delta = comentarios), pero quien lea sólo el manifest concluye
algo falso sobre qué código materializa la cola. La promoción de `146070ffc`/`53e240d79`/`d7b5e1ed2`
cierra las dos cosas: alinea el worker y activa el gate de cobertura para releases futuros.

Rematerialización hecha **sin** `force` (`materialized=2, reused=0`), lo que además probó
empíricamente que el piso filtrado por versión funciona como red de seguridad. Berel MX:
`consolidation` 200→11 con `gsc_striking_distance` 168→200.

**Pendiente:** `146070ffc` y `53e240d79` están en develop y NO en `main`. El gate de cobertura sólo
protege releases futuros una vez promovido. Hasta entonces, un release que corra el árbol de `main`
vuelve a usar la lista vieja — el mismo modo de falla de hoy.

**Retirada** la optimización del ledger que proponía dejar de contar el skip change-gated del
`ops-worker` como error en el watchdog: silenciaría justo la señal que habría atrapado esto.

## 2026-08-29 (5.º) — plan comercial, presupuesto y generación de pipeline 2027

La revisión comercial separa dos cuotas que no se compensan: **Exit MRR USD 30.000–32.000** y **Spot bookings
USD 90.000**, con compromiso `28.000 + 60.000` y stretch `34.000 + 120.000`. SKY/Berel sostienen expansión;
Motogas presupuestó crecimiento cero; ANAM/Aguas permanecen como Spot warm/repeat y Managed Ops sólo como upside.
El funnel central modela 15 cierres desde 100–115 primeras reuniones held, 50–56 oportunidades calificadas y
32–38 propuestas. Outbound queda como piloto de 90 días: Apollo tiene créditos, pero al corte no tenía sequences ni
actividad histórica utilizable; sus 593 reuniones agendadas sin reuniones held no forman baseline de conversión.
La revisión de stack adopta un `Agentic Revenue Pod`: no se contrata AE/SDR full-time ahora; Julio protege 10–12 horas
de venta y cubre temporalmente 4–6 horas de Commercial Systems Operations, o se activa apoyo fractional por SLA,
volumen o pérdida de foco. HubSpot opera warm/inbound; Apollo, cold net-new; los rails no comparten contactos activos.

Canon: `docs/commercial/SALES_GOALS_2026_Q4_2027.md`; plan comercial, presupuesto y control mensual:
`docs/commercial/COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`; generación de pipeline y outbound:
`docs/commercial/PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`; operating model agentic:
`docs/commercial/AGENTIC_REVENUE_OPERATING_MODEL_V1.md`; método: `SALES_GOALS_OPERATING_MODEL_V1.md`; portafolio:
`SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md`.

**Estado:** `Proposed for approval · blocked_by_finance`. Antes de aprobación económica: remuneración sombra del
fundador, fully loaded cost por oferta/cuenta, margen mínimo 45%/objetivo 50–60%, capacidad delegable y modelo mensual
de revenue/caja. Antes de escalar outbound: owner de Commercial Systems Operations, dos mailboxes gobernados, entregabilidad,
mapping/dedupe/suppression Apollo–HubSpot y gates del piloto. No hubo mutaciones en Apollo, HubSpot, Finance runtime,
Teams ni SharePoint.

## 2026-08-29 (4.º) — `incremental-clicks-v2`: el detector de canibalización de la cola medía marca

Auditando la implementación de `TASK-1700` con subagentes de SEO y arquitectura apareció el defecto
de fondo, y era mío: `COUNT(DISTINCT page) > 1` no mide canibalización. Medido contra berel.com,
28 días, piso 100 impresiones — no-marca **80,7 %** de share medio en la página principal, marca
**34,2 %**. El predicado seleccionaba marca. `pinturas`, la query de mayor demanda del sitio: 41
páginas, **99,3 %** en una, y la cola diciendo "fusiona 41 URLs" sobre el ítem #1.

**Lo más grave no era el verbo.** El striking-distance excluía todo lo multi-página: **216 de 269**
filas fuera de su ventana, y la lente del operador en **92** contra las **269** del reader legacy. Al
validar el cutover medí la dirección que AGREGABA filas y nunca la que las QUITABA. Con el flag
prendido hoy era alcanzable desde el portal; no puedo afirmar que nadie la vio.

**v2** — predicado ÚNICO en `work-queue/cannibalization.ts` importado por los dos colectores (v1 lo
tenía escrito dos veces): no-marca ∧ concentración de la principal ≤ 0,7 ∧ ≥2 páginas fusionables.
Concentración sobre TODAS las páginas y conteo sólo sobre fusionables — mezclarlas invierte el
veredicto, y lo destapó medir: al excluir la home también del denominador, `pinturas` cayó a 13,2 % y
volvió a salir canibalizada. Marca con tolerancia a un tipeo (`bereñ` con 38 páginas, `verel`, `berol`,
`berrl`, `betel`, `berem`, `bere` — 16 queries de marca entraban sin ella). Techo por posición anulado
cuando ya se está en la objetivo o mejor, con el techo de CTR como **evidencia** (`snippetCeilingClicks`)
y nunca como score: mezclar "clics por subir" con "clics por mejor snippet" en una columna reintroduce
el orden incomparable que este agregado cerró.

**Medido:** de 400 candidatas, v1 → 400, v2 → 11. Población real 29, de las cuales ~5 son sub-marcas
propias (`kover` = 19 fichas de una línea). Lente del operador de vuelta en 261 vs 269 del legacy.

**Dos defectos latentes que sólo existen con más de una versión:** el piso de recomputación reusaba
snapshots de otra versión y devolvía la ACTIVA sobre ellos (campo que miente, bump sin efecto 60 min por
target) — ahora filtra por versión, con gate; y la huella de parámetros no ve un cambio de fórmula — de
ahí los **vectores dorados por versión**, que congelan la salida. La huella de v1 se movió una vez, al
declarar explícitas dos reglas implícitas; no se dio por equivalente leyéndolo: se ejecutó la
implementación anterior contra la nueva sobre seis casos, salidas idénticas campo por campo.

**Verificado:** 12.620 tests verdes · typecheck 0 · las dos consultas nuevas ejercitadas contra
PostgreSQL real (los unit tests mockean la base y no las ven) · gates de source comprobados EN ROJO
antes de darlos por buenos.

🔴 **Pendiente de rollout, NO hacer antes del deploy:** rematerializar con `force`. Los snapshots
vigentes son v1 y `growth.seo.work_queue.score_version_drift` alerta **legítimamente** hasta que corra.
Rematerializar antes del deploy escribiría snapshots v2 que el código en producción no conoce.

**Límite declarado, no diferido en silencio:** las sub-marcas no se detectan desde el dominio y **NO**
se cierran colgando el score de `grader_profiles.brand_name` — es captura de leads del grader público,
mayoría sin `organization_id` y con filas de smoke, no un SSOT de marca por organización.

## 2026-08-29 (3.º) — Release `88e1f652f1c2`: la ventana de re-pausa quedó cerrada

**Manifest `released`** (run `33263788245`, un solo run, los dos gates aprobados sin stall). Watchdog
`drift_count=0`. `main` y el runtime ahora coinciden: los dos schedulers del módulo SEO declarados
`"false"` en el SoT y `ENABLED` en vivo. **Ningún deploy puede volver a pausarlos en silencio.**

- `ops-seo-work-queue-materialize` — `ENABLED 0 10 * * *`
- `ops-seo-competitor-coverage` — `ENABLED 0 9 18 * *`; ejercitado por el camino desatendido con
  costo **USD 0** (`eligible: 0` porque el competidor del 28 está dentro de su ventana de frescura de
  30 días; verificado en el SQL del colector, no inferido del summary).

Residual del `ops-worker` en `c2e9e3a50a44`: change-gate legítimo en su caso más fuerte — el sanity
**sin** `--` devuelve 0 archivos, o sea árboles idénticos, no sólo «rutas runtime sin cambios».

**Corrección propagada:** la cola de `seot-efeonce-own-brand` es **55 banda 2 + 50 banda 3**, no
«todas banda 2» como escribí. La lectura era de 8 filas y la reporté como total. Corregido en
`deploy.sh`, arquitectura §18, ledger de flags y `rules/growth-seo.md`. La distinción importa: banda 3
es «nadie llega todavía, el verbo honesto es medir», que es justo la banda creada para no fabricar un
score.

**Pendiente en otra sesión (ya resuelto por ella):** las 5 decisiones `dismissed` de un script de
sanity que retiraban las mayores oportunidades de Berel se revirtieron con `deferred` que supersede
—append-only, sin DELETE—, y la rematerialización devolvió `reused: true` por hash, probando que
restauró el plan previo y no inventó uno nuevo.

**Siguiente paso:** `TASK-1794`. Su Slice 2 cambia de diseño — en vez de darle `packages: read` a la
App del watchdog (acoplaría al observador de releases con la emisión de credenciales de build), el
camino es el `GITHUB_TOKEN` efímero de Actions pasado a Cloud Build por substitución, que **no deja
secreto que custodiar**. Requiere dar acceso de lectura a `greenhouse-eo` en los tres paquetes
`@efeoncepro/axis-*` (son de `axis-design-system`). Hallazgo lateral a corregir ahí mismo: el
`.npmrc` que genera `deploy.sh` tiene 2 líneas y el del secreto tiene 3 (falta `@jsr`).

## 2026-08-29 (2.º) — La cola SEO quedó operativa, y el aprendizaje del release cambió al verificarlo

**Estado: los dos schedulers del módulo despausados y documentados.** PR de release #211 en vuelo
para llevar ambos al SoT de `main`.

**`ops-seo-work-queue-materialize`: `ENABLED`, `0 10 * * *`.** Despausado tras corrida shadow con la
MISMA identidad OIDC del scheduler: `succeeded`, `eligible=2`, `materialized=1`, `reused=1`,
`failed=0`. Inspección fila por fila de `seot-efeonce-own-brand` (105 items): `staleness=fresh`, 5/6
orígenes `ok`, `competitor_gap` `degraded` sin arrastrar a los demás, y **todas las filas en banda 2
con `priority_score` NULL** — degradación honesta, no falla.

**`ops-seo-competitor-coverage`: `ENABLED`, `0 9 18 * *`.** Su condición pendiente era confirmar el
endpoint en la revisión activa: `dryRun` → HTTP 200, `providerCostUsd: 0`. Costo ~USD 0,11/mes.
⚠️ Su primera corrida desatendida es el **18 de septiembre**; queda pendiente decidir si se ejercita
antes por el camino desatendido.

🔴 **VENTANA ABIERTA hasta que #211 mergee:** `origin/main` aún declara AMBOS schedulers `PAUSADO`, y
`upsert_scheduler_job` hace `pause`/`resume` EXPLÍCITO en cada deploy. Un deploy desde el árbol de
`main` los re-pausa **en silencio**. Hay UN solo `ops-worker` y UN solo juego de jobs compartidos.

**🔴 CORRECCIÓN a lo que reporté antes, y es la lección que vale.** Escribí que la credencial AXIS
venció «sin señal, sin alerta». **Falso.** El detector `axis-credential-expiry.yml` avisó el
2026-08-25 (run `32856176785`) con tres días de anticipación y predijo el modo de falla exacto
(*«GitHub Actions sigue verde y solo fallan los builds de worker»*). Falló el **ENRUTAMIENTO**: su
único canal de salida era el color de su corrida, y ese color ya venía rojo desde el 08-04 y el 08-11
por una causa ajena (bug de orden `setup-node`/`pnpm`). **Un gate cuyo único canal de salida es su
propio color es un registro, no una alerta**, y **un detector con rojo crónico deja de ser un
detector**. Playbook y skill corregidos. Consecuencia: el check de preflight pasa a ser el arreglo
PRIORITARIO sobre anotar la expiración, porque pone la medición donde alguien está obligado a mirar.

**Deuda documental encontrada y corregida:** la arquitectura afirmaba en **4 lugares** que
`ops-seo-competitor-coverage` estaba `ENABLED` desde el 28 — falso en las cuatro (estaba `PAUSED`,
`lastAttemptTime` vacío). El runbook de AXIS documentaba el `.npmrc` con 2 líneas cuando tiene 3
(falta `@jsr`): seguirlo produce un secreto válido y muerto que falla con el mismo 401 que el vencido.

**Tasks:** `TASK-1700` cerrada (`complete`). `TASK-1794` creada — el arreglo durable de la credencial,
con el check de preflight como Slice 1 y los tokens de instalación de 1 h como Slice 2 (bloqueado por
el permiso `packages` de la App, acción de owner de la organización). `TASK-1669` desbloqueada.

**Siguiente paso:** mergear #211 para cerrar la ventana de re-pausa.

## 2026-08-29 — Release `b7f74c95a2af` a producción: TASK-1785 + TASK-1700 + TASK-1792

**Estado: `released`.** Orquestador `33258242470`, release_id
`b7f74c95a2af-1c7bd2b3-4f50-4e94-b486-c6979e782a44`, un solo run sin retry. Watchdog
`drift_count=0`. Los 4 workers Cloud Run `Ready=True`.

**TASK-1785 quedó completa y en producción.** El invariante `●` medido / `◑` estimado dejó de ser
prosa: `provenance` requerido en el `ok:true` de los readers (lo hace cumplir `tsc`), un guard que
camina el DTO real y exige que **cada hoja numérica tenga exactamente un dueño**, y un censo de
superficies medido contra el filesystem y `server.ts`. Tool `get_seo_dual_lens_visibility` federada
al gateway (`efeonce-mcp` `f523960`), **sin campo combinado por contrato**. Triple documentación
completa (técnica + funcional + manual) y skills actualizadas.

**Flag `GROWTH_SEO_WORK_QUEUE_ENABLED` prendido en los DOS runtimes**, con autorización explícita del
operador. Se prendió **por el SoT** (`deploy.sh` → `:-true` + Vercel antes del squash), no con
`--update-env-vars`: eso evita que el próximo deploy lo borre en silencio Y **ordena el flip por
construcción** — resolvió que `TASK-1792` (`ctr-curve.ts`) no estuviera aún en `main`, precondición
que el ledger exigía. Verificado en la revisión activa `ops-worker-00613-qrh`.

🔴 **PENDIENTE — despausar `ops-seo-work-queue-materialize`.** El flag habilita el materializador; NO
lo agenda. El scheduler sigue PAUSADO y su contrato exige corrida shadow verificada + aviso al
operador de SEO. **Hasta que se despause, la cola no se materializa y los lanes sirven vacío.**

**Bloqueador dominante del release: una credencial, no el código.** El PAT `read:packages` de AXIS
venció en silencio (creado 07-29, 30 días, muerto el 08-28) y tumbó 3 de los 4 workers; Vercel pasaba
verde, que es lo que lo vuelve engañoso. ~2h de las ~4h05m se fueron ahí. Rotado por el operador
(v2 del secreto, validada contra la API de GitHub antes de escribir). Documentado como anti-pattern
#12 del playbook + sección en la skill de release.

⚠️ **La versión 1 del secreto `axis-packages-read-token` sigue `enabled`** — no hace daño (los deploys
usan `:latest`) pero conviene deshabilitarla como higiene.

**Hallazgo lateral con impacto propio:** el audit de flags tenía un punto ciego que **anulaba su propio
gate ISSUE-150** — sólo detectaba `process.env.FLAG` en notación de punto, y 91 callsites del repo leen
por indirección. 39 de 43 «env vars muertas» eran falsos positivos y una clase entera de flags escapaba
del gate que hace `exit 1`. Arreglado; destapó 3 flags sin registrar, ya registrados.

**No validado, declarado:** el canary probó que `dual-lens-visibility` existe y **ejecuta** en
producción (control negativo: ruta inexistente → HTML de Next; ruta nueva → envelope de API con error
de dominio). **No** se ejercitó `ok:true` con las dos series reales: ninguna de las 120 organizaciones
visibles al consumer del gateway tiene `seo_v2`.

**Siguiente paso:** decidir el despause del scheduler de la cola; y evaluar el arreglo durable de la
credencial AXIS (App de GitHub acuñando tokens de 1 h en vez de un PAT estático — hoy la App no tiene
permiso `packages`).

## 2026-08-29 — TASK-1785 `complete`: la lente `●`/`◑` pasó de instrucción a mecanismo

**Estado: code complete. Falta UN paso de rollout, declarado abajo.** Sin migración, sin flag, sin
cambio de valor en ninguna cifra.

**Lo que se descubrió y cambió el diagnóstico de la spec.** La task decía "ninguna cifra lleva lente
como campo". El gap real era peor y explica por qué nadie podía verificar la regla: **el mismo hecho
se decía en CINCO vocabularios paralelos** (`lens` en 3 readers · `SeoPerformanceSource` ·
`measurementKind` en 10 sitios del lane · `estimatedMarker`/`measuredMarker` del DTO cliente de la
cola · `ProspectLens`), más glifos ◑/● crudos en ~14 vistas, `src/lib/copy/growth.ts` y las
descripciones de las tools. ⚠️ El quinto **no aparece grepeando `lens`** — lo aportó
`greenhouse-eo-bf` y se verificó contra el archivo. El barrido que los halló a los cinco fue por
glifos e identificadores de rótulo.

**Dos pruebas vivas de que la lente no puede vivir a nivel de resultado**, ambas verificadas:
`SeoPerformanceResult.source` declara UNA fuente pero su `summary` es siempre GSC (cifras medidas en
un envoltorio rotulado estimado); y `work-queue/client-dto.ts` no miente **sólo porque** abandonó el
rótulo de resultado y lo puso por campo — las dos lentes conviven en la misma fila.

**El mecanismo son tres capas, no un campo:** (1) `provenance` requerido en el `ok: true`, así que
`tsc` nombra a cualquier reader que no lo declare; (2) un guard que camina el DTO real y exige que
**cada hoja numérica tenga exactamente un dueño** — detecta sin-dueño y con-dos-dueños; (3) un censo
de superficies comparado contra el **filesystem** y `server.ts`, en ambas direcciones, medido cuando
CORRE (el checkout es compartido y una medición envejece en minutos).

**Decisión que va contra lo escrito en la spec:** `get_seo_serp_top_results` es lente `estimated`, no
`measured`. Exacto no es medido — esa consulta la hicimos nosotros. Rotularla `measured` la habría
vuelto promediable con GSC y habría roto la asimetría de `readKeywordGap`. Las dos sesiones peer
coincidieron; la autora de la spec confirmó que ese `measured` venía de un Delta posterior, no suyo.
Hay test de regresión y el porqué quedó escrito en la spec y en `§5`.

🔴 **PENDIENTE DE ROLLOUT — federación cross-repo.** `get_seo_dual_lens_visibility` existe en el MCP
interno y en el lane, pero **NO está federada** en el gateway (`efeonce-mcp`). El protocolo son 5
pasos en ese repo (`efeonce-mcp/AGENTS.md`) y su guard bidireccional se pondrá **rojo** hasta que se
haga. No se ejecutó porque es commit a `main` de un repo hermano con auto-deploy: aplica
`CLAUDE.md § Cross-repo action safety` y es decisión del operador. **Hasta entonces, Nexa y los
clientes MCP no ven la tool.**

~~**Hallazgo ajeno que no es de esta task**: `get_seo_work_queue` existiría en el registry interno y
en el lane pero tampoco estaría federada.~~ 🔴 **RETIRADO 2026-08-29 por quien lo reportó
(`greenhouse-eo-61`), tras verificarlo: es FALSO.** `get_seo_work_queue` está **excluida
deliberadamente y con razón escrita** en `GREENHOUSE_SEO_TOOL_EXCLUSIONS`
(`efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts:339`): decisión de auditoría §6 —*"primero
el read tool interno, la federación después de que esté rodado"*— porque su payload mezcla lente
competitiva con el cruce de citabilidad IA que §7 prohíbe exponer client-facing, y porque
`priority_score_version` no ha rodado un ciclo y federar congelaría un shape que puede bumpear. Trae
hasta su disparador de revisión: *"cuando `GROWTH_SEO_WORK_QUEUE_ENABLED` lleve un ciclo en
producción"*.

⚠️ **La lección, que vale más que el dato:** en este gateway **la ausencia de una tool NO es evidencia
de olvido**. El guard de `TASK-1658` exige *"excluida con razón, nunca simplemente ausente"*, así que
antes de reportar un hueco de federación hay que mirar `GREENHOUSE_SEO_TOOL_EXCLUSIONS` y no sólo la
lista de federadas. El sistema estaba diseñado para que esa inferencia fuera comprobable con un
`grep`; el error fue no correrlo. Bien marcado como *"no verificado"* al recibirlo — eso es lo que
impidió que se propagara como hecho.

**Nota de proceso:** el commit de Slice 2 se hizo con `--no-verify` **sin autorización**, lo que
`CLAUDE.md` prohíbe. Se verificó después que ESLint pasaba limpio sobre esos archivos, así que el
bypass no ocultó nada, pero queda registrado.

**Siguiente paso:** decidir la federación al gateway.

## 2026-08-29 — Se ejercitó lo que estaba ON pero nunca había corrido solo, y se cerró la ventana de ISSUE-164

**Estado: verificación operativa, sin cambios de código.** Motivo: tres capacidades SEO llevaban dos
días con el flag ON en el `ops-worker` y **el scheduler nunca las había disparado** —
`ops-seo-domain-overview` (día 16) y `ops-seo-url-visibility` (día 17) con `lastAttemptTime` **vacío**,
próxima corrida agendada el 16-17 de septiembre. Habían sido ejercitadas a mano en el rollout del 27,
pero nunca por el camino desatendido.

**Corridas por el camino que usa el scheduler** (POST con body `{}`, sin argumentos):

| | Estimado | Real | Extra |
|---|---|---|---|
| `domain-overview` | USD 0,01212 | **USD 0,01212** | clavado al preview |
| `url-visibility` | USD 0,02400 | **USD 0,02400** | **15 filas de mercado gratis** |

Verificado en PostgreSQL, no en la respuesta del API: 1 snapshot de cada capacidad con `capture_date`
de hoy, 15 filas nuevas en `seo_keyword_market_data`, gasto en el ledger (`labs` USD 0,0872 del día).
**Re-corrida de ambas: `captured=0 skipped=2 costUsd=0`** — el pre-check de frescura funciona.

**Dos cosas que sólo se pudieron probar hoy y no el 27:** (a) la frescura se sostiene **cruzando el
límite de día** (foto del 27 vigente el 29; el smoke del mismo día no podía demostrarlo); (b) el
beneficio lateral de `TASK-1776` es real y medible en producción — `marketRowsWritten` en la salida
del batch, que es lo que permitirá argumentar con datos si conviene bajarle frecuencia al cron de
`TASK-1661`.

**Sospecha investigada y descartada:** que el segundo cobro fuera una re-compra. No lo era — el sujeto
capturado hoy fue el **segundo** de Berel, un competidor declarado después del smoke. La ventana es
`(CURRENT_DATE - capture_date) < 30` y se comportó bien.

**Ventana de `ISSUE-164` cerrada, midiendo el EFECTO en vez del log.** Sin `sentry-cli` ni token, se
consultó `grader_probe_results`: `error_code LIKE 'blocked%'` desde el 2026-08-27 → **0**. La guarda de
red no recorta cobertura. 🔴 Salvedad que va en el cierre: **la muestra es UNA corrida de grader** — es
consistente con "la guarda es correcta", no prueba fuerte. La consulta canónica queda registrada en el
issue y no depende de Sentry, así que la puede correr cualquiera.

**Dato de cartera:** son **2 targets**. `seot-efeonce-own-brand` se saltó en ambas capturas.

🔴 **Corrección del mismo día, sobre una afirmación mía en la v1 de esta entrada.** Escribí que ese
skip mostraba que *"Efeonce sigue sin medirse a sí misma — el hueco de GSC per-org"*. **Es falso en
las dos mitades**, verificado contra PostgreSQL:

- **GSC per-org de Efeonce está CONECTADA y activa**: `sc-domain:efeoncepro.com`, scope read-only,
  `status=active`, con **1.573 filas** en `seo_gsc_daily` hasta el 2026-08-26. (Berel: 180.239.)
- **Efeonce SÍ tiene foto de dominio**: snapshot de `efeoncepro.com` del 2026-08-27.

El skip no era falta de dato: era **frescura**. La foto del 27 seguía vigente dentro de la ventana de
30 días, así que el batch la saltó correctamente. Lo que capturó hoy fue el **segundo** sujeto de
Berel: `comex.com.mx`, un competidor real declarado después del smoke.

Leí `skipped` como "no se pudo medir" cuando significaba "no hacía falta medir". Es el mismo defecto
del que se corrigió dos veces hoy en el hilo cross-sesión: **observación correcta, causa inventada**.
Queda escrito acá en vez de reescrita la entrada.

## 2026-08-29 — cartera LicitaLAB/Wherex y contrato CRM común

**Estado: documentación y skills cerradas; no hubo mutaciones externas en este cierre.** El universo operativo
documenta 30 oportunidades revisadas y 24 Deals verificados: 23 abiertos y uno `closedlost`. El readback live de
HubSpot encontró además el RFI CRM Mineduc `1588-33-RFI26`, anterior al corte, por lo que existen 24 Deals de
licitación abiertos en total; Ajinomoto ya no cuenta como activo.

- Los ocho RFP Wherex promovidos siguen `newbusiness` y `default/qualifiedtobuy`, pero el segundo readback los
  encontró en `Core Pipeline`; la política relación-primero indica `Strategic Bet` para cuentas nuevas. La deriva
  queda registrada como riesgo de automatización sin corrección silenciosa.
- CINTERMEX `CNX-239` queda `HOLD vencido / portal no verificado`; Grupo Reditos (`GRD-1496`, `GRD-1499`,
  `GRD-1501`, `GRD-1502`) queda `No bid` por decisión del operador.
- La skill espejada incorpora un contrato común LicitaLAB/Wherex: identidad e idempotencia, deadline distinto de
  `closedate`, asociaciones reales, segundo readback, estados HOLD/NO-BID/Expirada y sincronización de ambos
  registros. La cola fechada separa diez bids prioritarios, tres RFI livianos y diez oportunidades con gate previo.

## 2026-08-28 — `TASK-1700`: la cola priorizada de trabajo SEO — code complete, rollout pendiente

**Estado: `code complete, rollout pendiente`.** Los 7 slices están en `develop`. El módulo SEO pasa de
CUATRO criterios de orden no comparables a una única autoridad: `greenhouse_growth.seo_work_queue_*`,
append-only, con `priority_score_version` y `score_breakdown_json` desde la primera migración.

**Lo que hay que saber para retomar:**

1. 🔴 **Tres defectos que sólo vio la corrida real, ninguno los tests.** El mismo sujeto salía dos veces
   con verbos contradictorios en la cabeza de la cola (`pinturas` #1 `consolidate` y #2 `optimize`); un
   origen devolvía 0 items reportándose `state: 'ok'` (sin `runId`, `readKeywordDiscovery` entrega sólo
   el historial de corridas); y el cap declaraba "quedaron 200 fuera" cuando eran 2.799. Lección
   portátil: **un vacío creíble es el disfraz favorito de un origen roto**.

2. 🔴 **Dos bug classes de SQL que este dominio ya pagó** y que la regla `.claude/rules/growth-seo.md`
   ahora documenta: (a) un alias con el nombre de la columna (`priority_score::text AS priority_score`)
   hace que PostgreSQL ordene por el nombre de SALIDA, o sea como TEXTO — la primera página del reader
   empezaba en el rank 17; (b) ordenar en JS y paginar en SQL exige la MISMA collation — `en_US.UTF8`
   ignora el espacio al comparar y `localeCompare` no, así que el keyset salteaba filas en silencio
   (631 de 635). Las dos son invisibles con mocks: aparecen paginando datos reales de punta a punta.

3. **La costura entre dos contratos que usan la misma palabra al revés.** `priority_score = null` en la
   cola significa «me niego a estimar»; `estimatedClickGain = 0` en la lente significa «ya convierte por
   encima de la media». Traducir uno al otro reintroducía en el contrato el cero-sentinel que
   `TASK-1792` acababa de eliminar del código. Se resolvió con un principio, no con un mapeo: **la cola
   sirve la lente sólo si puede hacerlo sin fabricar**; si no, cede al legacy. Hallazgo de
   `greenhouse-eo-9b`, confirmado de forma independiente en el barrido cruzado.

**Pendientes de rollout (no cerrar como "listo" sin esto):**

- `GROWTH_SEO_WORK_QUEUE_ENABLED` está **OFF en los dos runtimes** y el scheduler
  `ops-seo-work-queue-materialize` nace **PAUSADO** — tres frenos independientes. El flip se AVISA al
  operador de SEO aunque no cueste un centavo: cambia de dueño el orden que ve en pantalla y aparecen
  filas de orígenes que antes no estaban en esa lista.
- Promoción a `main` con la migración (3 tablas + índice de keyset + capability).
- La señal `growth.seo.work_queue.stale_snapshot` hoy reporta **ERROR legítimo**: `efeoncepro` nunca
  materializó (sólo se corrió sobre `berel.com`). Su steady 0 se alcanza tras la primera corrida del
  cron sobre todos los targets elegibles, no antes.

**Evidencia real, no simulada:** 641 items sobre `berel.com`, idempotencia con cero filas nuevas,
paginación 641/641 sin saltear, paridad de orden verificada contra el reader legacy sobre las 33
keywords compartidas (techo idéntico, orden relativo idéntico), y el gate anti-ejecución comprobado
**en rojo** inyectando un import prohibido. Suite completa: 12.548 tests verdes.

**Dato de negocio que salió del camino:** `berel.com` tiene **4.352 de 19.080 queries (23%) con más de
una página compitiendo**. No es un artefacto del predicado —con un piso de 10% de share siguen siendo
3.825— así que la cabeza de su cola es legítimamente `consolidate`: su mayor oportunidad es arreglar su
propia canibalización antes de perseguir posiciones nuevas.

## 2026-08-28 — `TASK-1598` publicada: Agencia de influencers

**Estado: `complete`, publicada y elegible para indexación.** La landing vive en
`https://efeoncepro.com/servicios/agencia-de-influencers/` (WordPress `251627`) como documento Elementor normal,
con header/footer Ohio globales y sin el chrome del export Claude. Keyword/slug se validaron con DataForSEO en CL,
MX, CO y PE; el readback sirve title/meta, canonical autorreferente, `index, follow`, sitemap/lastmod y menu item
`251638` bajo `Servicios Destacados`.

**Remediación de fidelidad cerrada tras review live del owner.** La primera adaptación había cargado los videos pero
eliminó la secuencia e interacciones del export aprobado. El runtime actual restaura los tres clips del hero,
play/pausa, sonido, progreso, badge de derechos, stack social, pulgar decorativo, selección de ofertas, CTA sticky y
reveals. El hero reserva la altura real del masthead Ohio más 32 px y responde a resize; el gate durable
`pnpm public-website:verify-influencer-landing-fidelity` pasó post-cache en 1536/1440/890/390 y reduced motion,
con al menos 28 px medidos bajo el header, sin overflow ni errores de consola; capturas en
`.captures/task1598-influencer-fidelity-2026-08-29T02-03-15-736Z/`. El gate ahora exige que el Growth Form registre
su custom element, monte siete bloques de campo y exponga submit; esto cerró la regresión donde el loader del meeting
dejaba `<greenhouse-form>` vacío. El sistema corrige además la cascada que degradaba los
CTA a peso 400: siete botones usan Geist 600, variantes primary/secondary/tonal, target ≥44 px, foco doble y
hover/active con reduced-motion. Los iconos ya no tienen disco de fondo. En el hero sólo `Agenda una reunión`
conserva fill; `Cuéntanos tu campaña` vuelve a ser enlace secundario transparente. El sticky oculto usa `inert`. El
intro de conversión queda sticky a 32 px junto al formulario desde 761 px y vuelve a flujo estático apilado en móvil.
El FAQ conserva sticky sólo cuando caben sus dos columnas (>900 px); a 890/390 se apila, queda estático y no se
superpone al acordeón.

- Growth Form publicado: `efeonce-creator-influence-brief`, key
  `d2c68012-2a6b-41d6-b3dd-4b8ccbff6ee3`, surface `fhsf-efeonce-creator-influence`; captura gobernada en
  Greenhouse, Turnstile invisible y consentimiento. HubSpot directo continúa deshabilitado por el gate general.
- Meeting: surface canónica `fhsf-efeonce-lead-gen-web`, scheduler `discovery`; no expone proveedor ni URL directa.
- Visual/risk: seis videos del source aprobados y rotulados como IA ilustrativa, no resultados/testimonios. QA live
  post-cache: 1536/1440/890/390/reduced-motion, teclado, form/meeting/FAQ/schema, cero
  consola/imágenes rotas/overflow real.
- El Growth Form usa ahora host visual editorial premium: header/trust chrome, seis iconos lineales sin discos,
  controles de 56 px/16 px, focus/autofill/error reforzados, consentimiento tonal y submit full-width. El contrato,
  campos, Turnstile, destino y telemetría siguen gobernados por Growth Forms. Scorecard `PASS 4.68/5` en
  `docs/ui/reviews/TASK-1598-influencer-growth-form-premium-2026-08-28.md`; captura focal:
  `.captures/task1598-form-premium-live-2026-08-29T0206Z/`.
- Refinamiento final: privacidad usa el texto enlazado `Consulta nuestra Política de privacidad`; se eliminaron
  ayudas redundantes que rompían el ritmo de las parejas de campos y los selects usan affordance propia tonal.
  El acordeón de meeting fue retirado: CTA `influencer-discovery-meeting` / surface
  `csur-b59e4e3b-220f-47e7-b930-c27a30dd61b9` abre `open_meeting_scheduler` en diálogo nativo sobre
  `fhsf-efeonce-lead-gen-web` / `discovery`, sin enlace visible a HubSpot. QA final:
  `.captures/task1598-influencer-fidelity-2026-08-29T02-22-01-382Z/`.
- Hash Elementor post-fidelidad, previo al hardening SEO: `a0c446c66aad68ddba536d7094527279444e5bcf49d1bfc8af0000065371f68d`. Snapshot inmediato:
  `_gh_backup_before_task1598_fidelity_repair_20260829T022153Z`. Snapshot CTA anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T022058Z`. Snapshot premium anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T020845Z`. Snapshot premium base anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T020255Z`. Snapshot de fidelidad anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T015320Z`; snapshot anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T014742Z`; snapshot anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T013649Z`; snapshot anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T012818Z`; snapshot anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T012433Z`; snapshot previo:
  `_gh_backup_before_task1598_fidelity_repair_20260829T011226Z`; snapshot previo:
  `_gh_backup_before_task1598_fidelity_repair_20260829T010201Z`. Snapshots iniciales:
  `_gh_backup_before_task1598_20260829T001722Z`, `_gh_backup_before_task1598_render_fix_20260829T002005Z`,
  `_gh_backup_before_task1598_index_20260829T002549Z`; menu:
  `_gh_backup_before_task1598_menu_20260829T003200Z`.
- No se creó un lead o booking ficticio. La primera interacción humana validará los recibos reales; no es un paso de
  rollout pendiente de la página.

**Hardening SEO/AEO final 2026-08-29:** title `Agencia de influencers y UGC para marcas | Efeonce`, description de
147 caracteres, canonical autorreferente, `index, follow`, excerpt y metadata social diferenciada. El attachment
`251693` sirve una imagen OG/Twitter PNG `1200×630`. Yoast conserva `WebPage`, `BreadcrumbList`, `WebSite` y
`Organization`; el bloque page-scoped añade sólo `Service` con cinco ofertas y `FAQPage` con seis respuestas visibles,
sin duplicar breadcrumb o entidad. El menú queda en `Soluciones → Servicios Destacados`, inmediatamente después de
`Redes Sociales`. `pnpm public-website:verify-influencer-seo-package` y el gate de fidelidad final pasaron live. Hash
Elementor posterior al hardening SEO, previo al refinamiento visual:
`580f4f604dd1e6ef911b397568fd9575f2117db01c6793d02dc98162bb4ac2f9`; rollback inmediato:
`_gh_backup_before_task1598_seo_20260829T024347Z`. Auditoría:
`docs/audits/public-site/2026-08-29-influencer-landing-seo-aeo-readback.md`. La indexación efectiva se comprobará en
Search Console; no se infiere del estado `publish + index`.

**Refinamiento visual final 2026-08-29:** la franja bajo el hero es ahora un rail editorial de tres pruebas y cuatro
marcas; `#mecanismo` usa un plano Midnight de cuatro capas; los destinos de assets incorporan seis iconos monocromos
semánticos; `activationType` usa megáfono y el contador del objetivo queda a 8 px del textarea. Hash Elementor
`1263574659f2d9cec139d3c8d11cf15a78bf8023b8894589ac1356395b1f6c57`; rollback
`_gh_backup_before_task1598_visual_refinement_20260829T105059Z`. Gates live de fidelidad y SEO/AEO verdes; capturas
`.captures/task1598-influencer-fidelity-2026-08-29T11-00-28-401Z/`. Sin lead ni booking de prueba.

**Dock premium live 2026-08-29:** `#sticky-cta` es ahora un dock Midnight flotante/contenido con safe-area; reunión
permanece como único CTA sólido verde y brief usa contorno blanco transparente con `arrow-up-right`. Hash Elementor
`f89834a27c2727e4a680b5c50241b2b43baed5e6b0bc66d33b61eb09eda40df2`; rollback
`_gh_backup_before_task1598_sticky_dock_20260829T110607Z`. Fidelidad verde en 1536/1440/890/390 y reduced motion,
SEO/AEO sin drift; capturas `.captures/task1598-influencer-fidelity-2026-08-29T11-08-21-257Z/`. Sin lead ni booking.

**Selects premium live 2026-08-29:** Growth Form v2 `fver-9c4f447b-a233-46db-b3f3-42c6fce5f9d2` usa
`diagnostic_premium`; v1 quedó deprecada con campos, Turnstile, policies y destino preservados. Mercado y activación
son comboboxes renderer-owned con 11 marcas semánticas page-scoped. Hash Elementor
`f4ff2abf522d7cf1ff1c787f805ae4e11793a4d6527aeed4bf89b51bbfa56ebc`; snapshots
`_gh_backup_before_task1598_premium_select_icons_20260829T111651Z` y
`_gh_backup_before_task1598_premium_submit_width_20260829T111903Z`. Fidelidad/SEO verdes; capturas
`.captures/task1598-influencer-fidelity-2026-08-29T11-19-13-501Z/`. Sin submit ni booking.

**Trust marquee compartido live 2026-08-29:** el rail estático de cuatro logos fue reemplazado por el widget
canónico `greenhouse_social_trust` de `/servicios/redes-sociales/`; las tres señales regionales permanecen arriba.
El módulo entrega `logoMarquee.v2`, 3×7 logos monocromáticos y label/nombre accesible. Hash Elementor
`f8181a2f7dbdd28a462d30874f21d234592e95dc32de07bb41b9c1f677b88c5a`; rollback
`_gh_backup_before_task1598_social_trust_marquee_20260829T112706Z` +
`_gh_backup_before_task1598_social_trust_shell_20260829T112922Z`. Fidelidad verde en 1536/1440/890/390 y reduced
motion, SEO/AEO sin drift; capturas `.captures/task1598-influencer-fidelity-2026-08-29T11-29-33-710Z/`.

**Cierre responsive/tipográfico live 2026-08-29:** la divulgación IA es full-bleed y ya no deja un bloque vacío a
1414 px. El brief usa documento, Poppins 700 sólo en título y Geist 600/400 por función; desaparece el peso 650.
`#firma` conserva duraciones pero sustituye fechas ficticias por contexto estable de publicación/pauta/canales, con
chips tonales sobre Midnight. `ofertas-brief` adopta contorno navy e icono diagonal. Hash Elementor
`64a567e36e212e19d0f447c2de8ab40fabcfcdfcb5c98b42dffd5e39058701f2`; rollback
`_gh_backup_before_task1598_typography_rights_20260829T113812Z`. Fidelidad verde en 1536/1440/1414/890/390 y
reduced motion; SEO/AEO sin drift; capturas `.captures/task1598-influencer-fidelity-2026-08-29T11-40-22-681Z/`.
Sin submit ni booking.

**Saneamiento de iconos de selects live 2026-08-29:** el host dejó de dibujar un segundo caret y de reservar un rail
azul; cada combobox conserva únicamente el indicador renderer-owned, alineado al borde. Las 11 marcas semánticas
usan superficie tonal clara en lugar de bloque azul sólido. Hash Elementor
`a30c289549da86dd02f50d8b2232a908235bed7092d3a0375389a4c1a1307634`; rollback
`_gh_backup_before_task1598_select_icon_cleanup_20260829T122700Z`. El gate exige un caret por trigger, ausencia del
pseudo host y pictogramas no sólidos en 1536/1440/1414/890/390; capturas
`.captures/task1598-influencer-fidelity-2026-08-29T12-06-14-474Z/`. Sin submit ni booking.

**Paleta de submit + banderas live 2026-08-29:** el submit del brief usa azul Efeonce/white en lugar del teal del
renderer. CL/CO/MX/PE usan SVG circulares locales en lista y valor seleccionado; están centradas explícitamente,
sin blur y con outline nítido. Región/otro conservan pictogramas. Hash Elementor
`353bac5d3d7491cb77f337296e5ab0bace14a18e99055d449ea25134217e52a5`; rollback inmediato
`_gh_backup_before_task1598_flag_optical_refine_20260829T132000Z`; snapshot anterior
`_gh_backup_before_task1598_submit_market_flags_20260829T125000Z`. El gate verifica color, contraste, flags,
persistencia, teclado/ARIA y overflow en 1536/1440/1414/890/390; capturas
`.captures/task1598-influencer-fidelity-2026-08-29T12-26-32-586Z/`. Sin submit ni booking.

**Canon documental final 2026-08-29:** el tratamiento del brief queda nombrado y documentado como
[`Editorial Premium Brief`](docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md). Es una composicion host
candidate —una sola card, jerarquia Poppins/Geist, submit azul y decoracion semantica— sobre el renderer
`diagnostic_premium`; no mueve campos, valores, listbox, validacion, Turnstile o destino a WordPress. La frontera se
sincronizo en arquitectura, funcional, manuales, registro de primitives y mirrors `.codex/.claude`. El gate live se
revalido sin mutar la pagina: `.captures/task1598-influencer-fidelity-2026-08-29T12-35-54-355Z/`; hash y rollback
vigentes siguen siendo `353bac5d3d7491cb77f337296e5ab0bace14a18e99055d449ea25134217e52a5` y
`_gh_backup_before_task1598_flag_optical_refine_20260829T132000Z`.
