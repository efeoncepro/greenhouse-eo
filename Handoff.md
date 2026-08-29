# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

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

**Estado: `complete`, publicado e indexable.** La landing vive en
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
`.captures/task1598-influencer-fidelity-2026-08-29T01-12-35-487Z/`.

- Growth Form publicado: `efeonce-creator-influence-brief`, key
  `d2c68012-2a6b-41d6-b3dd-4b8ccbff6ee3`, surface `fhsf-efeonce-creator-influence`; captura gobernada en
  Greenhouse, Turnstile invisible y consentimiento. HubSpot directo continúa deshabilitado por el gate general.
- Meeting: surface canónica `fhsf-efeonce-lead-gen-web`, scheduler `discovery`; no expone proveedor ni URL directa.
- Visual/risk: cuatro videos del source aprobados y rotulados como IA ilustrativa, no resultados/testimonios. QA live
  post-cache: 1440/390/reduced-motion, teclado, form/meeting/FAQ/schema, cero consola/imágenes rotas/overflow real.
- Hash Elementor: `ff1ca667589a5e40431413042d5872430e0fcc402c6e3a22440359eeaa223058`. Snapshot inmediato:
  `_gh_backup_before_task1598_fidelity_repair_20260829T011226Z`. Snapshot de fidelidad anterior:
  `_gh_backup_before_task1598_fidelity_repair_20260829T010201Z`. Snapshots iniciales:
  `_gh_backup_before_task1598_20260829T001722Z`, `_gh_backup_before_task1598_render_fix_20260829T002005Z`,
  `_gh_backup_before_task1598_index_20260829T002549Z`; menu:
  `_gh_backup_before_task1598_menu_20260829T003200Z`.
- No se creó un lead o booking ficticio. La primera interacción humana validará los recibos reales; no es un paso de
  rollout pendiente de la página.

## 2026-08-28 — `TASK-1792` complete: la curva de CTR declara su usabilidad

**Estado: `complete` y verificado contra runtime real (lectura).** Sin flag, sin migración, sin escritura —
el cutover fue el merge; rollback = revert PR. Commits en `develop`: `d4d731721` (módulo + predicado),
`f8be78d83` (reader consume y ordena honesto, curva privada retirada), `8943b2f5c` (referencia recalibrada +
nivel estimado + curva monótona). Contrato canónico y sus invariantes:
[`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
§`readKeywordOpportunities`. Este Handoff rota; ese doc no.

**Lo que queda vivo para quien siga:**

- **`org_level_reference_shape` está unit-tested y es correcto por construcción, pero NO observado en
  producción.** Ninguna de las dos organizaciones con serie cae hoy en ese estado: Berel mide en el bucket
  objetivo y Efeonce no tiene muestra ni para estimar un nivel (2 clics en 28d). En tres semanas alguien va a
  leerlo como "probado" — no lo está. Se verá cuando exista una org con agregado suficiente y bucket objetivo
  delgado.
- **`TASK-1691` hereda el contrato y tiene su `## Delta 2026-08-28 (3)`** con la forma tal como quedó: cuatro
  estados, no tres. El ORDEN que ve el usuario ya está corregido del lado servidor (la tabla re-ordena en
  cliente y `Array.prototype.sort` es estable); lo que falta es que la etiqueta deje de prometer orden por
  ganancia cuando `orderedBy === 'measured_demand'`.
- **Follow-ups sin task creada** (no se reservaron IDs: el registry estaba contendido por tres sesiones):
  filtro marca/no-marca de la curva (defecto independiente del tamaño de muestra, no se cura cuando el sitio
  crezca); unificar el predicado con `work-queue/priority-score.ts` cuando `TASK-1700` cierre; revisar
  `DEFAULT_TARGET_POSITION = 5` contra la doctrina de 8–10.
- **Dato para calibrar:** el nivel estimado de `berel.com` contra la curva de referencia da **1,048** (28d) y
  **1,095** (7d), y Berel no es la fuente de esa referencia. Es el control contra el cual medir si algún día
  el filtro no-marca mueve algo real.
- **Alcance, dicho con precisión:** no es «afecta a 1 de 2 organizaciones». Dos es el tamaño de la
  muestra, no una tasa. El disparador —bucket objetivo presente y sin clics— está **garantizado en
  todo target recién onboardeado**, así que cada cliente nuevo nace en ese estado hasta acumular
  muestra. Quien lea el 24/24 de Efeonce como «un caso» va a subestimar el alcance.
- **`TASK-1700` desbloqueada y con el desbloqueo aceptado del otro lado.** El Slice 7 (cutover del
  consumer) tenía su rollback aterrizando en la lente rota: volver al reader legacy devolvía una
  pantalla que no ordenaba. `TASK-1700` ya lleva su `## Delta 2026-08-28 (3)` declarando la
  dependencia dura y su tabla de rollback dice ahora que el destino está **verificado, no supuesto**.
  Nada queda pendiente de coordinar entre ambas.
- **Crédito, para que quien siga sepa a quién preguntarle:** el hallazgo es de la sesión
  `greenhouse-eo-56`; la investigación (arqueología del commit introductor, lectura de oficio SEO,
  blast radius) es de esta sesión; la **implementación** de los cuatro slices es de `greenhouse-eo-75`.
  Tres cabezas, un defecto: no atribuir el trabajo a una sola.

## 2026-08-28 — LicitaLAB MCP + radar Playwright documentados en skills Codex/Claude

**Estado: `complete`, discovery read-only + ocho promociones CRM verificadas.** El MCP OAuth expone cinco tools
read-only y el radar autenticado mantiene credencial/perfil/reporte ignorados bajo `.auth/` con modo `0600`; su
canary paginado leyó 45 oportunidades y el barrido ampliado posterior leyó 163. Las skills espejadas separan discovery web, evidencia MCP y promoción humana.
La prueba aprobada creó Company `57870164778` y deal `64461187076` para `1098710-22-LP26`, en
`default/qualifiedtobuy`, `Strategic Bets`, CLP 250.000.000; el readback probó Deal↔Company y
`num_associated_deals=1`, sin contacto ficticio. La misma carga manual gobernada por MCP promovió después ProChile
como deal `64482163516` asociado a Company existente `31209269815` y Defensoría como deal `64471071912` asociado a
la Company separada `57878590071`; las búsquedas por `gh_idempotency_key` devolvieron una fila por licitación.
ProChile es cliente vigente (`hs_current_customer=yes`), por eso quedó `Core Pipeline`/`existingbusiness`; Defensoría
quedó `Strategic Bets`/`newbusiness`. `gh_deal_origin` permanece vacío en las tres porque su enum sólo admite
`greenhouse_quote_builder`: nunca escribir un origen falso. El bridge no admite aún `public_tender`; esa brecha
bloquea automatización, no cargas manuales MCP con confirmación, asociación y readback.
Una promoción posterior creó cinco Deals adicionales, todos con búsqueda exacta por ID y asociación releída:
UOH `64466117716` ↔ `57899319173`, Beneficios Estudiantiles `64482321775` ↔ Ministerio de Educación
`46499468091`, Campaña VCM `64466272830` ↔ Ministerio de la Mujer `31163122599`, marketing Valparaíso
`64469214508` ↔ `32039105348` y RFI JUNJI `64469523247` ↔ `57892355617`. UOH y JUNJI quedaron
`Strategic Bets`/`newbusiness`; las tres cuentas existentes quedaron `Core Pipeline`/`existingbusiness`. No se
asociaron contactos no confirmados. Brecha honesta: estos cinco Deals tienen un único `id_de_licitacion`, pero
`gh_idempotency_key` no fue poblado en la carga aprobada; completar esa propiedad requiere un write posterior.
**Frontera corregida por el operador:** LicitaLAB ve licitaciones públicas solamente; toda fila mantiene
`public_opportunity` y sólo se promueve con `origin='public_tender'`. Nunca se usa para discovery privado ni se
mezcla con Wherex, Ariba, Coupa u otros portales corporativos. Estado rápido de bid, CRM y postulación:
`docs/commercial/tenders/LICITATION_CRM_REGISTER.md`; la vista transversal de deals activos vive en
`docs/commercial/CRM_DEAL_REGISTER.md`. Ambos son índices fechados y siempre requieren readback live; una
licitación promovida se sincroniza por `deal_id`, mientras el radar sin Deal permanece sólo en bid desk.

## 2026-08-28 — El candidato de discovery no declara pertinencia — YA LEVANTADO como `TASK-1791`

**Documentado en el repo, no sólo acá:** `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 → *"Hallazgo
abierto (2026-08-28)"*, con la evidencia medida y el alcance recomendado. Este Handoff rota; ese doc
no. Tres sesiones (`greenhouse-eo-63`, `-fa`, `-6c`) lo verificaron de forma independiente el mismo
día por caminos distintos — si el registro viviera sólo en una bitácora, la cuarta lo vuelve a
descubrir pagando otra vez.

Resumen: el candidato no lleva señal de marca/categoría/relevancia (ni en la tabla ni en el DTO), así
que 50 keywords de consumidor sobre ChatGPT pasaron todos los checks para un target que vende AEO
B2B. 🔴 **El vector estructural es `TASK-1662`, no la expansión de seeds**: en el gap competitivo las
seeds las elige el competidor, así que no hay operador a quien pedirle que elija mejor.

**Estado de la task (actualizado el mismo día): LEVANTADA.** Existe
`docs/tasks/to-do/TASK-1791-growth-seo-candidate-relevance-signal.md` — `to-do`, P1, `EPIC-022`,
`backend-data`, `Blocked by: none`, sin dueño asignado todavía. El riesgo de duplicado entre las tres
sesiones que lo escalaron quedó cerrado: hay un solo ID. Alcance vigente: **señal con evidencia, no
filtro** — un filtro duro descartaría long-tail legítimo en silencio.

⚠️ **El argumento de urgencia que estaba escrito acá era falso y se corrigió en la propia task
(`65372ea68`).** Decía que `TASK-1700` heredaría el orden por volumen y congelaría lo irrelevante
arriba de su cola append-only. No ocurre: `work-queue/priority-score.ts` **no mira el volumen
estimado del proveedor**, y el CHECK `basis_band_score` impide fabricar un score sin demanda medida —
un candidato irrelevante **sin** impresiones cae a banda 3 con score `NULL` y no compite con nada. El
caso vivo que sí sostiene la task es el otro: keyword irrelevante **con** impresiones reales, que
atraviesa el CHECK y entra a la cola. El vector es la demanda medida, no el volumen del proveedor.
Corolario de forma, ya escrito en la task: la señal entra como **factor del item con su procedencia,
jamás como entrada del `priority_score`** — `evidence_ref` es opaca por contrato (cero FK, cero JOIN
al motor que produciría la señal), así que puntuar con ella sería puntuar con algo que el aggregate no
puede citar. Quien retome la task lee la versión corregida, no este resumen.

## 2026-08-28 — Drain de keyword discovery: `*/10` → `*/2` (⚠️ con ventana de reversión abierta)

Bajada de cadencia del scheduler `ops-seo-keyword-discovery-drain` (us-east4), autorizada por el
operador. `Descubrir` es un workbench INTERACTIVO: con `*/10` la espera media era 5 min y el peor
caso 10, cuando la corrida en sí tarda segundos. El `*/10` no compraba nada — el drain con cola
vacía es no-op, así que correrlo 5× más seguido no gasta un centavo más. Es el mismo razonamiento
por el que `ops-outbox-publish` ya usa `*/2`. Seguro a esta cadencia: el claim es un `UPDATE`
condicional (`WHERE status='pending' … RETURNING`), así que un segundo worker matchea cero filas.

**Aplicado en los DOS lugares**, como manda la regla de Cloud Run: `services/ops-worker/deploy.sh`
(SoT) + `gcloud scheduler jobs update` para efecto inmediato (verificado: `*/2`, `ENABLED`).

🔴 **VENTANA ABIERTA hasta el próximo release:** `origin/main` todavía declara `*/10`, y
`upsert_scheduler_job` corre en cada deploy del worker. **Si el ops-worker se despliega desde `main`
antes de que este cambio se promueva, el schedule vuelve a `*/10` en silencio** — el mismo bug class
del ebook (rev `00470` → `00473`). No amerita un release propio (regla dura: si es demasiado trivial
para un manifest, es demasiado trivial para `main`); lo cierra el próximo release regular. Si alguien
ve `*/10` de vuelta, es esto y no un rollback deliberado.

## 2026-08-28 (2.º release del día) — TASK-1694 + TASK-1692 EN PRODUCCIÓN

Release `e82c18579b05` (manifest `e82c18579b05-0ab096eb-628a-4d41-9b96-dc82064a21f7`, run
`33208942436`, PR #209). **Pasó a la primera, sin break-glass, sin retry, `drift_count=0`.** Las dos
tasks pasan de `code complete, rollout pendiente` a **operativamente completas**.

**Por qué no hubo break-glass, y cómo repetirlo:** cero migraciones ⇒ ningún dominio irreversible ⇒
`decision=ship` limpio. Es exactamente lo que aisló el par del 2026-08-09; con migraciones el
break-glass es parte del plan, sin ellas no aparece.

**Flags: cero.** La pregunta se derivó en vez de recordarse —
`git diff origin/main..HEAD -- src/ services/ | grep '+.*_ENABLED'` vacío, y el VALOR (no la
presencia) de `GROWTH_SEO_ENABLED` / `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` leído con
`vercel env pull` = `true` en Production. Dos comandos en lugar de leer 72 filas del ledger.

🔴 **El aprendizaje que vale para el próximo release de contrato:** el manifest `released` y Vercel
`READY` prueban que el código está desplegado, **no que el contrato esté vivo**. Los canaries sí:

- `keyword-discovery-filters` devolvió `maxLinkBarrier aceptado; ignoredFilters=maxDifficulty`
  (TASK-1694 ejecutándose en producción);
- dos POST directos al lane con `promoted_to_tracking` y `selected_for_target` devolvieron **400**
  nombrando los kinds permitidos (TASK-1692: el boundary de escritura está vivo).

El primero existía en el canary del gateway; el segundo hubo que fabricarlo. **Un release que cambia
un CONTRATO sin canary de contrato está a medio verificar.**

**Validación de la regla nueva de merge (`-s ours`, delta de la mañana):** V1 = un solo commit, el
squash del release anterior → clasificación "sólo squashes de release" → `-s ours` → las tres
verificaciones vacías, incluido el `--name-status` completo. Primera vez que el merge canónico no
necesita auditoría posterior, porque la estrategia no puede colar nada.

**Residual `ops-worker`:** refutado por la vía más barata — `git diff` **sin filtro** entre su SHA y
el target devolvió **0 archivos** (árboles idénticos; ya había desplegado desde `develop`). No hizo
falta el diff de las 28 rutas del gate.

**Gateway MCP desplegado** (`efeonce-mcp` run `33209983511`): el schema federado de
`get_seo_keyword_discovery` ya es el nuevo.

**Smoke con gasto EJECUTADO — 3 corridas, USD 0,0482 total** (MX+CL, `keyword_suggestions` y
`keyword_ideas`). Las tres `succeeded`. **Probó lo que importaba:** el payload sin `filters` es
aceptado por los DOS endpoints que lo llevaban — el riesgo de la matriz queda refutado con
evidencia — y `volumePolicy: "all"` quedó persistido en `methods_json`.

🔴 **Y desmintió la justificación que la propia task tenía escrita.** La spec afirmaba que en un
mercado ralo el filtro *"se comía el long-tail emergente"*. Medido: **102 candidatos, 3 corridas, 2
endpoints, 2 mercados → CERO con volumen nulo o cero**. El histórico del store lo corrobora por
endpoint: `keyword_suggestions` 61 filas / 0 nulos; el único con nulos es `keyword_overview` (15 de
62), que **nunca llevó el filtro**. O sea: los índices de sugerencias e ideas del proveedor sólo
devuelven keywords con volumen medido, así que el `filters: search_volume > 0` era un **no-op** en
esos dos endpoints.

**Qué queda en pie:** quitarlo sigue siendo correcto —elimina una asimetría no declarada y deja de
imponer una exclusión que el contrato no decía—, pero **el beneficio prometido no tiene evidencia**.
La corrección está escrita en la task; el delta de arquitectura §7 conserva la afirmación vieja y
convendría alinearlo cuando alguien toque ese doc.

**Lección portátil:** una justificación plausible escrita en una spec no es un hecho. Ésta sobrevivió
al diseño, a la implementación y a la review; sólo cayó al gastar 5 centavos en medirla.

**`TASK-1700` (P0, cola priorizada) queda desbloqueada Y con su prerequisito de runtime cumplido:**
el contrato nuevo ya sirve en producción, así que su primer snapshot no puede congelar duplicados ni
la barrera engañosa. Es el siguiente trabajo natural.

## 2026-08-28 — TASK-1692: ledger de decisiones de discovery — code complete, rollout pendiente

Cerrada en `develop`. Cinco slices: append transaccional (`appendDiscoveryActionTx`), el bridge y
el camino de tracking escribiendo su propio hecho, re-selección, guard de cobertura de writers y
docs. Sin migración, sin flag, sin capability.

**Tres cosas que un próximo turno necesita saber:**

1. 🔴 **Un test que se rompe por hacer lo correcto es un test mal escrito.** El boundary test del
   bridge decía "el bridge no ejecuta SQL de tablas"; escribir el ledger lo rompía. La salida
   barata era relajar el regex. Se reescribió sobre el invariante REAL de §1.1 (nada de `grader_*`,
   ningún JOIN cruzando motores, y el bridge no COMPONE candidatos con SQL propio). Si vuelve a
   pasar con otro gate del dominio, ése es el criterio.
2. **Tres falsos verdes destapados verificando, no leyendo:** el check del trigger append-only
   pasaba sobre tabla vacía (es `FOR EACH ROW` — no dispara sin filas); el mock de
   `track-keywords.test.ts` devolvía la fila del TARGET para cualquier consulta, así que el chequeo
   de tenant pasaba siempre; y el parser del guard nuevo devolvía lista vacía porque se cortaba en
   el `[]` de la anotación de tipo. Los tres habrían quedado verdes por la razón equivocada.
3. **El ledger estaba VACÍO en producción** (0 filas, ni un `dismissed`) al momento del cambio. Por
   eso retirar `selected_for_target` del enum no creó ninguna fila ilegible, y por eso el backfill
   se descartó sin costo.

**Pendientes de rollout (no cerrar como "listo" sin esto):**

- Verificación funcional en staging de los dos caminos (grounded y tracking) + el lane ecosystem
  con binding `internal`, y el caso `capacity_exceeded` confirmando que NO se escribió fila.
- Promoción a producción; observar 7 días `seo_track_keywords_command` y
  `seo_grounded_query_bridge_decision_log`.
- Avisarle al operador de SEO que el orden del inbox cambia (lo resuelto deja de encabezar). Ya
  está escrito en el manual.

**`TASK-1700` (P0) queda `Blocked by: none`** — era su último bloqueador. Su Delta lleva la
salvedad de no tomar el primer snapshot contra un runtime que todavía sirva el contrato viejo:
ni 1694 ni 1692 se han promovido.

**Follow-up `ui-ux` declarado:** el affordance visible de re-selección en el drawer. El camino
server existe; el botón no. El comentario del drawer ya lo dice.

## 2026-08-28 — TASK-1694: contrato de candidatos de discovery — code complete, rollout pendiente

Cerrada en `develop`, sin push. Cinco slices + un fix propio: barrera de enlaces filtrable
(`maxLinkBarrier`/`includeUnknownBarrier`) con `maxDifficulty` aceptado-pero-ignorado y declarado en
`ignoredFilters`; colapso del reader por `normalizedKeyword` (`candidateIds[]`/`provenance[]`,
`totalCandidates` cuenta keywords); `clusterConflict` contra el set seguido sin gasto de proveedor;
política de inclusión única (`all`) en los cuatro adapters, persistida en `methods_json` con default
histórico de lectura; federación en route admin + lane ecosystem + tool MCP.

**Dos cosas que un próximo turno necesita saber:**

1. 🔴 **`core_keyword IS NULL` significa "la keyword ES la canónica de su clúster", no "no se
   sabe".** Verificado sobre las 923 filas del store: 527 nulos, 396 apuntando a otra, **cero
   autorreferentes**. Mi primera implementación lo leyó como desconocido y dejó 8 de 10 candidatos
   productivos en `unknown`, escondiendo una colisión real. El core efectivo es
   `core_keyword ?? la keyword misma`; el único estado ciego es no tener fila de mercado. Lo destapó
   la verificación contra PG real, no los tests — que pasaban.
2. **El caso de fusión aún no existe en datos reales**: una sola corrida productiva, 10 candidatos
   de un solo método. El colapso es preventivo y su razón de ser es llegar antes del primer snapshot
   de `TASK-1700`, que es append-only.

**Pendientes de rollout (no cerrar como "listo" sin esto):**

- Corrida real de smoke con gasto (~USD 0,013) en un mercado es-LATAM ralo con la política `all`,
  comparando candidatos/costo/mezcla de `searchVolume=null` contra el smoke de `TASK-1664`. Requiere
  autorización del operador.
- ~~**Deploy del gateway MCP.**~~ **CERRADO el mismo día.** Los dos commits de `~/Documents/efeonce-mcp`
  (`807fb76` federación + `32baa9f` prettier) están **en `origin/main`** y desplegados (run
  `33209983511`); el guard bidireccional de paridad de ese repo no quedó rojo. No queda nada que
  empujar allá por esta task.
- Promoción por el release control plane + observar `seo-keyword-discovery-health`.

**Follow-up con evidencia nueva:** cinco candidatos de la corrida real comparten el core
`pintura acrílica` **entre sí** — es el conflicto intra-corrida que la task dejó fuera de alcance a
propósito y que pertenece a la superficie de decisión en lote (`TASK-1660`, ya con su `## Delta`).

## 2026-08-28 — Release develop→main `c983be7f18e6` + flip de flag + gateway MCP: COMPLETO

**Estado: `complete`.** Paso a producción end-to-end del carril Growth/SEO (PR #208, 181 archivos,
4 migraciones): TASK-1696 (dimensión de consumidor del ledger de gasto DataForSEO), TASK-1662
(fundación del gap competitivo), TASK-1699 (top-N del SERP + descubrimiento de competidores),
TASK-1652 (request AI Mode del grader).

- **Release:** `release_id c983be7f18e6-92b1b327-a1c9-4e7a-85dc-6a5e300f4e32`, run `33178544139`,
  manifest **`released`** en 11m41s. Los dos gates `production` aprobados con ~2 min de diferencia.
  Break-glass usado por `db_migrations` con razón verificada: `pnpm pg:connect:status` devolvió
  `No migrations to run!` ANTES del dispatch — el release reconcilia archivos con un estado ya
  realizado, sin undo de schema ni backfill.
- **Runtime:** watchdog `ok`, `drift_count=0`, `data_missing_count=0`. `commercial-cost-worker`,
  `ico-batch-worker` y `hubspot-greenhouse-integration` en el target SHA; `ops-worker` en
  `fdfdedbe5` como residual change-gated, verificado con las **28 rutas leídas del workflow** (diff
  vacío) más el sanity sin `--` (22 archivos en el rango, o sea ambos SHA resuelven). No se
  redesplegó. `/api/auth/health` 200.
- **Flag:** `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED=true` en Vercel Production + redeploy
  `greenhouse-aj0ng1mfw`. Precondición verificada antes del flip: la cadena de lectores está en
  `origin/main` (`flags.ts`, `competitor-discovery.ts` ×3, `rank-capture.ts` ×2). **Verificado en el
  runtime, no sólo la env var:** el canary contra `https://greenhouse.efeoncepro.com` devolvió
  `serp-top-results read: {"ok":true,…,"rows":[]}` — `ok:true`, no `disabled`.
- **Gateway MCP:** `efeonce-mcp` `8f1ae34 → 92e7197`, CI verde, deploy run `33180234265`, revisión
  **`efeonce-mcp-gateway-00024-8b8`** Ready=True con 100% del tráfico e imagen taggeada al SHA
  exacto. Front door: protected-resource `200`, `/mcp` sin token `401` (fail-closed). Inventario
  **21 → 27 tools SEO** (20 lecturas + 7 escrituras), diferencia verificada contra el SHA de la
  revisión anterior (`220e916929d9`): entran `get_seo_provider_spend`, `get_seo_keyword_gap`,
  `declare_seo_competitors`, `retire_seo_competitors`, `get_seo_serp_top_results`,
  `get_seo_competitor_candidates`. **Cero cambios en Entra** (los writes viajan en el scope
  `efeonce.mcp.seo.write` existente y siguen fail-closed hasta TASK-1631). Canary de cierre verde
  completo contra producción: 20 lecturas ✓, denies `404` anti-oracle, escrituras ejercitadas en su
  puerta sin escribir ni gastar.

**🔴 Hallazgo para el runbook — la regla de decisión del merge canónico está mal formulada.** El
runbook dice `-s ours` si V1 (`git log origin/main --not HEAD`) está vacía y `-X ours` si no. Con
squash-merge **V1 nunca está vacía en el estado estacionario**: siempre contiene el commit de squash
del release anterior. La regla literal empuja a `-X ours` en todos los releases, y acá `-X ours`
reprodujo la patología del delta 2026-08-23 **con la V2 vacía**: duplicó un bloque completo de
`.claude/rules/growth-seo.md` y resucitó TASK-1775/1776/1777 en `in-progress/` teniéndolas develop
en `complete/`. Sólo la V3 (`--name-status` completo) lo cazó. La pregunta correcta no es «¿V1 está
vacía?» sino **«¿aporta `main` contenido propio?»**, que se responde con
`git diff --diff-filter=A --name-only origin/develop origin/main` (vacío ⇒ `-s ours` es seguro y
pierde nada). Candidato a corregir en el runbook, el playbook y las dos skills espejadas.

**Corrección aplicada al control plane (misma sesión).** La regla del merge canónico quedó
reescrita en los 5 lugares que la prescribían: `docs/operations/runbooks/production-release.md`
(§2.4 Paso A + gotchas #1/#5), `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md`,
las dos skills espejadas `{.claude,.codex}/skills/greenhouse-production-release/SKILL.md` y
`docs/manual-de-uso/plataforma/release-orchestrator.md` (que seguía prescribiendo `-X ours` como
resolución y contradecía al resto). La regla ya no cuenta V1: la **clasifica** — sólo squashes de
release ⇒ `-s ours`; un hotfix cuyo contenido no volvió a `develop` ⇒ PARAR y reconciliarlo por su
camino canónico. Se agregó una cuarta verificación (`git diff --diff-filter=A --name-only
origin/develop origin/main`, archivos que existen sólo en `main`) y `-X ours` quedó degradado a
excepción con auditoría `--name-status` completa obligatoria. Los conflictos `modify/delete`
(TASK-1590) y `rename/rename` (TASK-1658, hoy) quedaron reencuadrados: sólo existen en el camino
excepcional, porque `-s ours` no produce conflictos.

**Follow-up registrado: `TASK-1790`** (`to-do`, P1, backend-data/`reader`). El arreglo durable no es
prosa sino un gate: `pnpm release:merge-canonical` clasifica los commits divergentes **contra
`greenhouse_sync.release_manifests`** —el título no es prueba—, elige la estrategia, corre las cuatro
verificaciones y **se detiene** ante un commit que no reconoce, en vez de adivinar. Extiende
`readLastReleasedRelease` (`src/lib/release/preflight/last-released-reader.ts`) y jamás escribe en
`release_manifests`. Barrido por dominio y superficie sobre las 849 tasks vivas, por símbolo: cero
tasks poseen el merge canónico — es el único paso del release enteramente manual. `TASK-860` observa
PRs pero no los mergea; `TASK-864`/`1681`/`1682` son del preflight, que corre después; `897`/`920`
son post-dispatch. La razón de que sea un gate y no otro párrafo: la prosa **ya** se había corregido
el 08-23 y el 08-28 volvió a ocurrir.

**Barrido documental post-release (4 subagentes, particiones disjuntas).** Gateway MCP a 27 tools en
skills/runbook/manuales/doc funcional; estado de flags por runtime en la arquitectura del módulo
SEO, `.claude/rules/growth-seo.md`, skills `dataforseo-operator` y EPIC-022; deltas 2026-08-28 en
15 tasks con barrido de impacto cruzado. **`TASK-1699` y `TASK-1662` se dejaron deliberadamente en
`in-progress`**: la primera porque el día 1 de la serie es el 2026-08-29 y su verificación no ha
ocurrido; la segunda porque su Slice 4 sigue bloqueado por `TASK-1700`. `pnpm task:lint --changed`
y `pnpm ops:lint --changed` con `errors=0` (los 13 warnings de epic-child-parity son preexistentes
de otros épicos; EPIC-022 no aparece).

**Coordinación:** el freeze de `develop` se acordó por mensaje con las 2 sesiones locales activas
(`greenhouse-eo-87`, dueña de TASK-1662/1699, y `greenhouse-eo-92`), que confirmaron qué flags
prender y cuáles no. Ambas terminaron antes del cierre, así que **el aviso de levantar el freeze
quedó sólo acá**: `develop` está libre desde 2026-08-28 ~14:35Z. Sus 2 commits docs-only locales
(`40aec5bbc`, `bb6eb8d11`) **entraron en este release** — no volver a pushearlos; `origin/develop`
quedó en `245295d04` con el merge canónico encima.

**Pendientes heredados (no bloquean este release):** (1) 2026-08-29 tras el cron de las 05:00 CLT,
verificar ~20 filas/keyword + `provider_cost` idéntico al baseline + señal
`seo.serp_top_results.coverage`; (2) ≈2026-09-02 (≥5 días de serie), revisar candidatos de
`readSerpCompetitorCandidates` con el operador ANTES de declarar; (3) `ISSUE-164` dejó agendada para
2026-08-29 la revisión de conteos `blocked_*` en Sentry de la guarda de red de TASK-1778;
(4) el `PRODUCTION_RELEASE_TIMING_LEDGER.md` no tiene filas para los releases del 2026-08-18,
08-19, 08-23 y 08-27 — deuda previa, no de este release.

## 2026-08-28 — TASK-1699: el top-N del SERP ya pagado — code complete, rollout pendiente

**Estado: `code complete, rollout pendiente` — el día 1 de la serie es el día del primer deploy del
worker post-release, y cada día sin release pierde el top-N de ese día PARA SIEMPRE** (el pre-check
de idempotencia del rank capture impide re-capturar sin recomprar; es la única task del plan con
costo de demora irrecuperable). Implementado: `seo_serp_top_results` append-only estricto con ranura
`rank_absolute` (jamás `rank_group` — se repite entre bloques y `DO NOTHING` descartaría filas en
silencio) · parser hermano `parseSerpTopResults` sobre la MISMA respuesta pagada (costo marginal
CERO, probado con test de no-regresión EXACTA de `buildSerpTask`) · cableado tras flag dual-runtime
`GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` (ON declarativo; tx atómica snapshot+top-N con fallback que
jamás pierde la medición pagada) · descubrimiento de competidores por recurrencia
(`readSerpCompetitorCandidates`, umbrales versionados 30d/3kw/5días, PROPONE con `proposalRef` — el
execute es `declareCompetitors` de TASK-1662) · lanes sólo-internal 404 anti-oracle + tools MCP
`get_seo_serp_top_results`/`get_seo_competitor_candidates` (inventario federado: **27 tools**,
commit local `92e7197` en `efeonce-mcp`) · señal `seo.serp_top_results.coverage`. Sanity **9/9
contra PG real** con rollback transaccional (cero residuo en tabla append-only). Recalibración
clave: CERO ALTER a `seo_competitors` (la autoría ya era de 1662); la evidencia viaja compacta en
`proposal_ref`.

**Corrección de supuesto (mismo día, tarde) + estado VIVO:** el Ops Worker Deploy corre en cada push
a develop (el worker es un servicio único compartido) — "efectivo post-release" era falso para el
worker. La revisión activa `ops-worker-00610-kc8` YA lleva el código y AMBOS flags en `true`
(verificado con gcloud + dry-run real del endpoint de cobertura: `eligible:0` por frescura, cero
gasto). Scheduler `ops-seo-competitor-coverage` **ENABLED** (despausado tras esa verificación).
Vercel staging: `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED=true` agregada (custom env `staging`).
🔴 **El día 1 de la serie del top-N es el 2026-08-29** (cron 05:00 CLT). **Próximo paso:**
(1) 2026-08-29 tras el cron: ~20 filas/keyword + `provider_cost` IDÉNTICO al baseline + re-run
no-op + señal `seo.serp_top_results.coverage` en verde; (2) release develop→main EN CURSO por la
sesión hermana greenhouse-eo-6c (freeze de develop aceptado; le pedí prender
`GROWTH_SEO_SERP_TOP_RESULTS_ENABLED=true` en Vercel Production con el release); (3) post-release:
deploy del gateway `efeonce-mcp` (6 tools) + push de los commits docs-only locales; (4) ≈2026-09-02
(≥5 días de serie): revisar candidatos de `readSerpCompetitorCandidates` con el operador ANTES de
declarar. Docs/skills sincronizados post-1662 y post-1699 por 6 subagentes con espejos verificados.

## 2026-08-28 — TASK-1662: keyword gap competitivo — code complete, rollout pendiente

**Estado: `code complete, rollout pendiente`; Slice 4 bloqueado por `TASK-1700` (`to-do`).** El módulo SEO
gana su tercera pregunta: competidores DECLARADOS con autoría (`declareCompetitors`/`retireCompetitors`,
techo default 5, outbox, 3 lanes), cobertura vía `labs/domain_intersection` ×2 (flag
`GROWTH_SEO_COMPETITOR_GAP_ENABLED` **OFF**, scheduler `ops-seo-competitor-coverage` día 18 **PAUSADO**,
V1 un competidor por corrida, ~USD 0,15/ciclo) y `readKeywordGap` que DERIVA el gap al leer: exclusión
dura por GSC medido, `content_gap`/`ranks_worse`/`declaredTargets` separados, factores con `sin_dato`,
**sin orden propio** (la cola de `TASK-1700` es la autoridad de orden; `evidence_ref` opaca
`seo:competitor_gap:<coverage_run_id>`). Sanity **22/22 contra PG real** (exclusión GSC probada con
query medida real). Federación commiteada en `efeonce-mcp` local (3 tools; deploy DESPUÉS del próximo
release develop→main). Migración `20260828113457119` APLICADA.

**Rollout ejecutado el mismo día (autorización plena del operador):** `pnpm build` de producción
verde (gate de cierre completo) · shape de `domain_intersection` validado contra el sandbox gratis
ANTES de gastar (elemento directo, sin wrapper `serp_item`) · competidor real declarado — Berel MX →
`comex.com.mx`, `declared_by=user-efeonce-admin-julio-reyes`, evidencia
`BEREL_SEO_DIAGNOSTIC_2026-08-25` · dry-run USD 0,144 → **primera corrida real USD 0,1076 con Δ
EXACTO en el ledger** (697 filas de cobertura + 640 de mercado gratis) · gap con datos reales:
**357 content_gap / 54 ranks_worse / 269 excluidas por GSC medido** (el invariante ●/◑ en vivo) ·
flag **ON declarativo** en `deploy.sh` (efectivo con el primer deploy del worker post-release;
scheduler PAUSADO hasta entonces — antes sería un 404).

**Riesgo/continuidad:** ownership de `seo_competitors` resuelto — el command lo aterrizó 1662 y
`TASK-1699` (P0) consume `declareCompetitors` con `proposal_ref` (Deltas declarados en 1699/1700).
**Próximo paso (post-release develop→main):** verificar `/seo/competitor-coverage/capture-batch` en
la revisión activa del worker → despausar `ops-seo-competitor-coverage` → medir el costo del segundo
ciclo antes de declarar más competidores; deploy del gateway `efeonce-mcp` en la misma ventana. La
task queda `in-progress` sólo por el Slice 4 (bloqueado por `TASK-1700`) y ese cierre operativo.

## 2026-08-28 — Higgsfield y Magnific: solicitudes de partnership para agencias enviadas

**Estado: `Postulación enviada`; respuesta de Higgsfield y evaluación de Magnific pendientes.** Higgsfield confirmó la
consulta B2B/studio por Enterprise Sales. Magnific respondió: Susana Lazcano, Enterprise BDR EMEA & LATAM, derivó la
solicitud al canal oficial `ai-partnerships@magnific.com`. El outreach directo se envió el 2026-08-28 desde Outlook
Web, con Susana en copia y la firma configurada `Julio`; readback del mensaje enviado observado a las 10:44 UTC.

**Límite y continuidad:** la derivación y el outreach enviado no equivalen a aceptación, reseller, co-selling,
certificación ni revenue share. Revisar las respuestas en Outlook y actualizar el registry antes de cualquier claim u
oferta. Evidencia: [`HIGGSFIELD_MAGNIFIC_AGENCY_PARTNERSHIP_OUTREACH_2026-08-28.md`](docs/audits/commercial/HIGGSFIELD_MAGNIFIC_AGENCY_PARTNERSHIP_OUTREACH_2026-08-28.md).

## 2026-08-28 — TASK-1696: cierre documental del inventario MCP y dos gates ciegos con task

**Hallazgo que corrige un dato vencido, no una omisión.** Cinco docs declaraban que la revisión
productiva del gateway servía **13 tools** y que TASK-1658 seguía "sin push". Ambas cosas eran
falsas: la revisión activa `efeonce-mcp-gateway-00023-zt2` (2026-08-27T23:19Z) ya llevaba ese
deploy y sirve **21**. Los docs subestimaban producción por un deploy entero. Quedaron reescritos
separando siempre **inventario interno (22 tras `get_seo_provider_spend`)** de **desplegado en el
gateway (21)** — confundirlos es el error que ya habían cometido. La 22.ª llega después del release:
su lane sigue en `develop`.

**Dos gates que dan verde sin mirar quedaron con task, no con nota.** Los subagentes midieron y los
dos son más grandes de lo que parecían:

- **`TASK-1782`** — el auditor de flags no ve los leídos por constante (`env[FLAG]`). No es higiene
  documental: ese conjunto ciego alimenta los dos chequeos de ISSUE-150, **los únicos que fallan
  siempre**, no sólo con `--strict` (flag ON en Production sin código en `main`). Segundo eje que no
  estaba en el radar: el detector asume sufijo `_ENABLED`, así que tampoco ve `..._ENFORCED`,
  `*_DISABLED`, `MAINTENANCE_MODE` ni los `*_MODE`. Piso medido: 51 nombres invisibles, 3 sin fila
  (dos gatean escrituras a GitHub del sitio público). El defecto ya estaba **admitido en prosa
  dentro del propio ledger** y nadie lo cerró.
- **`TASK-1783`** — `dataforseo-operator` no era la excepción: **77 skills fuera del manifiesto de
  espejos y 32 ya divergen en el cuerpo** (payroll-auditor, production-release, legal-privacy entre
  ellas). La asimetría `.claude/references/` vs `.codex/agents/` es estructural, así que el modo
  "cuerpo-idéntico" debe exentar paths por namespace, nunca en global.

**Continuidad:** el rollout de TASK-1696 sigue pendiente tal como quedó ayer (los dos flags OFF, el
flip a enforce como decisión del operador, el deploy del gateway después del release).
