# Handoff activo

### Releases del 2026-08-08/09 — `ISSUE-114` cerrada y batch SEO en producción

`main` = `e048ef3a4` (batch SEO). Antes, `b99b7ad97` (fix de `ISSUE-114`). Ambos manifiestos
`released`; **watchdog `aggregateSeverity: ok`**, tres señales en cero, y los 4 workers de Cloud Run
en `Ready=True` sirviendo `e048ef3a47e9` — ni siquiera el residual change-gated habitual del
`ops-worker`.

**Lo que necesita quien siga:**

1. **`ISSUE-114` resuelta: el batch policy computaba el diff sobre una base congelada.** Usaba
   three-dot (`origin/main...target`), que parte de la merge-base que el squash-merge deja vieja, y
   resucitaba archivos byte-idénticos a producción como cambios del release. Ahora es two-dot vía
   `buildReleaseDiffRange`. **Si el classifier reporta un dominio irreversible, ahora es REAL** — no
   lo tapes con `[release-coupled: …]` por costumbre, como venía pasando en los 4 releases previos.
2. **`ISSUE-145` (ALTA) — léela antes del próximo release.** El batch policy del **orquestador** es
   decorativo: corre con el `target_sha` ya mergeado, ve un rango vacío y aprueba sin mirar nada
   (verificado en los `preflight-result.json` de 3 releases; uno con 1045 archivos y 14 migraciones
   reportó `filesChanged=0`). Y el marker `[release-coupled: …]` nunca se lee donde el runbook dice,
   **pero se dispara solo con prosa**: una cita en un commit de docs de growth/MCP neutralizó
   `split_batch` para todo un batch. El ancla correcta es el `target_sha` del release anterior.
3. **`ISSUE-144`** — `vercel_readiness` confunde un build cancelado a propósito por el `ignoreCommand`
   con uno fallido. **Y `vercel redeploy` NO lo resuelve**: vuelve a correr el ignore-step y cancela
   igual. Lo que sí funciona es un push con código a `develop` (el merge canónico `main`→`develop`
   sirve doble).
4. **Se canceló el run zombie `31126022507`** (`Ops Worker Deploy`, 56h en `queued` con 0 jobs). Era
   lo único que dejaba el watchdog en `error`, y su entrada en la lista forense expiraba el
   **2026-08-21**, o sea habría vuelto a bloquear el preflight ese día. La entrada en
   `src/lib/release/preflight/ignored-pending-runs.ts` ya es letra muerta: quitarla en el próximo
   cambio que toque ese archivo.
5. **⚠️ El merge canónico `-X ours` se come el `Handoff.md` y el `changelog.md` del release.** Pasó
   en este mismo release: la sección y la entrada escritas en la rama de fix llegaron a `main` en el
   squash, y el merge `main`→`develop` las descartó porque `develop` había editado esos mismos
   archivos en paralelo — que es lo habitual. Todo lo demás (código, issues, índice, runbook, ambas
   skills) sobrevivió intacto. **Al cerrar un release, verificar explícitamente que Handoff y
   changelog conservan su entrada después del merge**; las dos verificaciones del gotcha #1 no lo
   detectan porque sólo miran `src/`, `scripts/`, `services/` y `migrations/`.
6. **Dos comandos documentados que ya no funcionan** (corregidos): `vercel ls --target=` →
   `--environment=` (CLI 50.x) y el `gcloud run services describe --format="value(...filter(...))"`
   del runbook §4.1, que crashea con `TransformFilter() takes 2 positional arguments`. Sospecha de
   todo comando copiado de la doc antes de concluir que el sistema está roto.
7. **`data_missing` del watchdog casi siempre es tu sesión `gcloud`, no deriva.** `pnpm
   gcloud:auth:playwright -- --force` renueva CLI **y** ADC. Antes: `data_missing_count=4`; después: `0`.

### TASK-1309 — Auditoría del sitio (2026-08-08)

`TASK-1309` está `in-progress` con código completo: cuarta tab `/admin/growth/seo/audit`, datos reales
de Berel (95 · 0 críticos · 138 avisos · 381 menores · 100 páginas) y UI quality 4.59. El bloqueo
heredado de TASK-1310 ya tiene fix local, pero faltan migración y staging (ver cutover más abajo).
No repetir build ni suite global sin autorización (~30 GB).
Evidencia: `.captures/2026-08-08T13-48-58_growth-seo-audit`.

Auditada con `seo-aeo` y `greenhouse-ui-review`: el orden de la lista ganó un tercer eje —**valor de
búsqueda**, ortogonal a la severidad— porque sin él la higiene de sitio ascendía por puro alcance
(favicon en 91 páginas por encima de `alt` en 50), y los checks de performance ahora declaran que son
medición de **laboratorio** (Google rankea con datos de campo). Queda declarada, sin dueño, una
cobertura que el audit NO tiene: acceso de crawlers de IA en `robots.txt`, ausencia de JSON-LD,
conflicto noindex+robots y salud de sitemap.

### Cutover `seo_v1 → seo_v2` — expand aplicado, falta migrar y contraer (2026-08-08)

El rename de la clave del módulo era **breaking en los dos sentidos**: migración primero deja al
código vivo pidiendo `seo_v1` ya superseded; código primero pide `seo_v2` que la base no tiene. Y no
es sólo UI — el mismo predicado gatea los tres batches que le pagan al proveedor, que en la ventana
saltarían con `no_entitlement` **en silencio**.

Se aplicó la fase **expand**: `SEO_MODULE_KEY` queda para escritura y las lecturas usan
`SEO_MODULE_KEYS_READ = ['seo_v2','seo_v1']` con `ANY($n::text[])` en los 5 consumidores. Verificado
contra PG real con la base todavía en `seo_v1`: ambas orgs resuelven `hasModule=true` sin bloqueo.
El contenido de la lista está fijado por test para que la contracción sea deliberada.

**Pendiente, en este orden:** desplegar el expand → aplicar
`migrations/20260808131441444_task-1310-seo-client-view-codes.sql` → verificar en staging con Berel →
**recién ahí** contraer a `seo_v2` sola (dueño `TASK-1310`). Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.7.

### TASK-1310 — surfaces cliente SEO implementadas (2026-08-08)

`TASK-1310` sigue `in-progress`: dashboard `/growth/seo`, quadrant y report `/growth/seo/report`
reusan `ReportArtifactModel`; guard = assignment per-org + `growth.seo.report.read_client` `own`.
La migración pendiente crea `seo_v2`, supersede el assignment `seo_v1` de Berel preservando tier/metadata
y publica los viewCodes; sin aplicarla no hay navegación compuesta. Próximo paso: staging, sesión Berel,
menú/rutas/denial sin módulo, baseline diff y revisión mobile. Sin push/deploy autorizado.

**Verificación 2026-08-08 (deuda cerrada por Claude).** El barrido con subagentes encontró que el
código estaba adelante de sus documentos y de sus gates, así que se corrigió lo documental y **se
hizo fallar a propósito lo que estaba verde de mentira**:

- **Señal de fiabilidad falsa-sana.** `seo-rank-capture-lag.ts` tenía `module_key = 'seo_v2'`
  hardcodeado: veía 0 orgs y reportaba `ok`. Con el expand aplicado reporta `warning` con un hallazgo
  real. Su test pinneaba el bug (asertaba el literal); ahora aserta el contrato. Commit `2f21dd46e`.
- **GVC corría con la persona equivocada.** Los tres scenarios cliente capturaban con sesión de
  operador contra una superficie client-gated, así que el frame decía "SEO no está activo en tu plan"
  y el visual-gate daba BLOCK por una razón que no era la UI. Se agregó `requiresStorageState` al
  contrato de scenario, exigido **antes** de lanzar el browser. `ui:visual-gate --task TASK-1310`
  pasó de BLOCK a PASS. Commit `ec3fa82c6`.
- **El scorecard estaba verde y la auditoría en BLOCK.** El scorecard de las 10:03 daba PASS 4.61 y
  afirmaba "axe sin violaciones" cuando la auditoría de las 10:25 tiene 2 violaciones de contraste y
  economía de superficies en 1.8. Se regeneró desde la auditoría: **`ui:quality --task TASK-1310`
  ahora da BLOCK con `average=2.29 floor=1.8`**, que es el estado correcto para una task con
  `UI ready: no`. El scorecard viejo queda declarado en el campo `supersedes`.
- **Drift documental del `masterDetail`.** El wireframe y el flow todavía describían un navigator
  lateral que la implementación descartó; era la ruta por la que el siguiente cambio reintroducía la
  composición equivocada. Corregidos a `composition='single'` + tabs, con el "por qué no" escrito.
- **Doc funcional + manual.** La superficie cliente salió de "Que NO existe todavía" y ganó su
  sección con el estado de rollout declarado; se escribió el manual que faltaba
  (`docs/manual-de-uso/growth/habilitar-portal-seo-cliente.md`) con el orden exacto del rollout y por
  qué **no** se valida con la persona agente superadmin. README, EPIC-022 y el ledger de flags
  quedaron sincronizados.

Lo que **no** hice y sigue abierto: los 7 lotes de la auditoría premium (trabajo de Codex, vive en
`/growth/seo/mockup`), el push de los commits locales y la migración —bloqueada porque `main` no
tiene todavía el catálogo TS y `syncViewRegistryCatalog` desactivaría las filas.

### TASK-1309 — CERRADA (2026-08-08)

**Cerrada.** El build de producción salió verde con autorización del operador (exit 0, árbol completo
de rutas), que era el último gate: `pnpm test` full + `pnpm build` prod + los 4 gates de UI +
reachability. Lifecycle `complete`, archivo movido, registry/README/EPIC-022 sincronizados, y delta de
impacto cruzado en las tres tasks que la citan como base (1670, 1672, 1673). **Con ella el conmutador
de Search Visibility queda completo: las 4 tabs del operador navegan.**

**El bloqueo había desaparecido solo.** 1309 estaba `code complete` frenada por 2 rojos ajenos en
`client-role-visibility.test.ts`, causados por 1310 al registrar viewCodes sin migración de
`role_view_assignments`. Esa migración se aplicó hoy en el rollout de 1310 y los cerró:
**`pnpm test` completo en 1429 archivos / 10377 tests / 0 rojos**, `ui:quality` PASS 4.63,
reachability 232 rutas / 0 huérfanas. Falta sólo `pnpm build` de producción sobre el último commit
para moverla a `complete` (no se corrió: ~30 GB, va con autorización del operador).

**Dos subagentes cerraron el ciclo documental**, con dominios de archivos disjuntos para no chocar.
Lo que encontraron vale más que el trabajo mecánico:

- 🔴 **§10.6 de la arquitectura SEO se auto-contradecía**, y fue culpa mía: el delta que agregué esta
  mañana cambiaba el orden a tres ejes, pero el contrato 4 de arriba seguía declarando la regla vieja
  de dos. Un agente que leyera el ítem sin bajar al delta implementaba lo equivocado.
- **Cinco commits de feature aterrizaron DESPUÉS del pase documental** (`4c81306d5`), así que las tres
  capas describían una pantalla anterior a la construida. El pase documental "ya hecho" no era
  garantía de nada: lo que garantiza es mirar el delta.
- Los hallazgos se **generalizaron más allá de SEO**, que es donde está el valor: `dataviz-design`
  ahora advierte que **cualquier** chart que derive su tamaño del contenedor es sospechoso (tabs
  ocultas, acordeones, y el `fullPage` de Playwright que produce cards vacías que parecen bug y no lo
  son); `state-design` fija que el resultado de un job async tiene **seis** estados y no dos (nunca
  corrió · corriendo · limpio · parcial · con techo · fallido); y los dos gates de UI review suman
  como blocker el número cuya procedencia difiere de sus vecinos sin declararlo.

**Deuda detectada de paso:** `greenhouse-ui-enterprise-review` existe en `.claude/` y `.codex/` pero
**no está en el manifiesto de espejos** y ya divergía. Se le aplicó el mismo bloque a las dos copias
para que el gate sea idéntico entre agentes, sin reconciliar la divergencia previa. Alguien debería.

### TASK-1310 — verificado con sesión de cliente: funciona, pero NO es alcanzable (2026-08-08)

Cerré el paso 5 del rollout con sesión real de Grupo Berel. Dos resultados, y el segundo es el que
importa:

✅ **El gate per-org pasa y la superficie es real.** Migración aplicada, `/growth/seo` renderiza con
datos medidos: posición media 1.5, 31 keywords, 19 en primera página, cobertura 61%, procedencia
declarada (medido ● / estimado ◑). Evidencia `.captures/2026-08-08T19-29-36_growth-seo-client`.

🔴 **El menú del portal cliente NO compone SEO** — y no es el catálogo:

1. `VerticalMenu.tsx` arma el menú cliente con una **lista hardcodeada de 7 ítems** filtrada por
   `canSeeView('cliente.*')`. SEO no está en la lista, así que ningún seed lo agrega.
2. Su único bloque dinámico (`capabilityModules`) sale de `businessLines`/`serviceModules` de la
   sesión — **otro sistema**, no `module_assignments`.
3. El resolver canónico module-based (`composeNavItemsFromModules` / `<ClientPortalNavigation>`)
   existe y **sólo lo consume el mockup** `/mockup/cliente-portal-legacy`. Cablearlo es la task
   derivada de TASK-827 que quedó como "V1.0 acepta path híbrido".

**Además, el manifest de alcanzabilidad declara un enlace que no existe:** `/growth/seo` figura con
`parent: '/home'`, `via: 'inline-link'`, y no hay ningún enlace desde `/home`. El gate da `0 orphans`
porque comprueba que la ruta esté **declarada**, no que el enlace declarado **exista**. Hoy el único
camino real es el cross-link desde el informe AEO, que sólo sirve a clientes que además tengan AEO.

**Confirmado con subagentes, y corrige una atribución errónea que hice en el camino:**
`authorizedViews` se deriva **sólo** de `role_view_assignments` + fallback heurístico + permission
sets + overrides — **nunca de `module_assignments`**. Llegué a decir que "el módulo concede y el
denial vetea"; es falso. AEO figura en las 23 views de Berel porque **no tiene fila de rol y cae al
fallback**, no porque su módulo la conceda.

**Y AEO tampoco aparece en el menú lateral.** Se alcanza por deep-link, declarado a propósito en el
manifest. Así que el estado de SEO **no es una regresión: es el diseño vigente del portal cliente.**
Lo que falta es la task derivada de TASK-827 que monta el nav module-driven
(`ClientPortalNavigation` + `/api/client-portal/modules`, ambos completos y con **cero consumidores**
en runtime).

Descartado con dato: no era sesión desactualizada — los claims se auto-refrescan cada ≤5 min y una
sesión recién emitida tampoco los trae.

**No lo parché.** Empujar SEO a la lista hardcodeada haría desaparecer el síntoma y consolidaría el
diseño equivocado: el portal cliente debe componer su menú desde `module_assignments`, que es lo que
el resolver canónico ya sabe hacer y nadie cableó.

### 🔴 ISSUE-143 — rompí SEO en producción aplicando la migración de TASK-1310 (2026-08-08)

**Resuelto el mismo día, ~25 min de caída.** Apliqué la migración de catálogo tras el push+deploy y el
canary del provider contra `greenhouse.efeoncepro.com` pasó de `domainQuadrant=riesgo keywords=50` a
`hasModule=false` + `greenhouse_seo_lane_404` en los cinco lanes.

**La causa no fue el orden del rollout: fue la forma de la migración.** El archivo de viewCodes hace
expand **y contract en el mismo paso** — crea `seo_v2`, le asigna las orgs y en el mismo statement
supersede `seo_v1`. Eso anula el dual-read `SEO_MODULE_KEYS_READ` que habíamos aplicado a los 5
consumidores: su valor entero era que existiera un período con ambas claves vigentes, y la migración
lo borró en el mismo commit en que lo creaba. Vercel producción corre `main`, que pide `seo_v1`
literal.

**El ops-worker NO se vio afectado** — su deploy ya tenía el dual-read, así que los tres batches que le
pagan a DataForSEO siguieron sanos. El daño fue de lectura, no de gasto ni de datos.

Restaurado reabriendo la ventana (`effective_to = NULL` en los `seo_v1`), verificado con el canary
real, y hecho durable por `20260808184512073_…-reopen-seo-module-cutover-window`, que hornea el
invariante: mientras el cutover esté abierto, ambas claves cubren exactamente las mismas orgs; una
ventana asimétrica aborta la migración. Sin doble conteo de cuota: el resolver hace `LIMIT 1` sobre el
`ANY(...)`.

**Dos lecciones, y la segunda es la que importa:**

1. Una migración nunca contiene el expand y el contract del mismo cutover. Hay **cinco runtimes con
   despliegues independientes**; "lo desplegué a develop" no es "lo desplegué".
2. **El diseño era correcto y aun así se cayó.** §10.7 de la arquitectura describía bien el patrón y
   el dual-read estaba fijado por test — pero nada impedía escribir el contract en el mismo archivo,
   porque la regla vivía en prosa. Ahora vive en un test que escanea `migrations/` y falla si una
   migración nueva supersede una clave que `SEO_MODULE_KEYS_READ` todavía acepta. **Probado por
   mutación**: sacando la migración culpable de su allowlist, el test la nombra.

Contribuyó una causa de método: verifiqué la migración con un `SELECT`, que es la mitad del contrato.
La otra mitad es qué versión de código la lee en cada runtime. La verificación correcta es el
consumidor real contra el host real.

**Delta 2026-08-09 — el release cumplió la precondición.** Verificado runtime por runtime: `main` con
el dual-read, canary del provider contra producción **100% verde** (con `track`/`untrack` ya en `400`
en vez de `404`, o sea que esas rutas existen), y el ops-worker en una revisión ancestro de `main`. El
contract pasa a **`TASK-1677`**, separado de `TASK-1310` para no atar una operación de datos de 20
minutos a un ciclo de diseño abierto. La señal de simetría de la ventana sigue sin dueño, pero deja de
ser urgente cuando la ventana se cierre.

**Colateral arreglado de raíz:** rotando este mismo Handoff descubrí que `docs:context-rotate` estaba
ciego y **reventaba** (`TypeError` sobre `matches[0]`): su patrón buscaba secciones `##` con fecha y el
archivo usa `###` hace rato — 0 de 23. Segunda vez que se queda ciego por la misma causa (el propio
código documenta la primera). El nivel de heading ahora **se descubre** en vez de asumirse, porque el
ancla estable es la fecha; sin secciones fechadas degrada con un mensaje accionable en lugar de un
stack. El script quedó importable y con suite (5 tests, uno contra el `Handoff.md` real). Si vuelve a
fallar, la respuesta es extender `DATED_SECTION_LEVELS`, no rotar a mano: rotar a mano es como se
corrompen los marcadores de integridad de los shards.

### Search Visibility — header canónico (2026-08-07)

TASK-1307/1308 siguen `complete`: Resumen, Rendimiento y Keywords comparten `SurfaceRecipe` +
`WorkbenchHeader` (alcance/meta/tabs), sin chrome sobre canvas ni duplicación en estados vacíos. 579
tests focales, typecheck/lint y 5 GVC OK (1440/390). Pendiente: promoción `develop → main` batcheada
con 1308/1655; el export GSC nativo de Berel requiere Owner fuera del repo.

### Carril de keywords OBJETIVO — TASK-1659…1662 (2026-08-07)

Salió de que el operador cuestionara por qué TASK-1308 no usó los ejes especificados. La respuesta
corta era correcta; la larga destapó que **el módulo tiene TRES preguntas y sólo una tenía
superficie**: (1) qué empujo de lo que ya tengo — construida; (2) dónde quiere estar el cliente;
(3) qué me pierdo entero. Ninguna de las 12 tasks abiertas de EPIC-022 cubría 2 ni 3.

🔴 **GSC es ciego por construcción a 2 y 3**: sin top ~100 no hay impresiones, así que esas
búsquedas NO EXISTEN en los datos. Ninguna superficie sobre esa fuente va a contestarlas.

⚠️ **Corrección al criterio anterior:** para una keyword donde el cliente SÍ rankea, el dato de
mercado es enriquecimiento y los ejes medidos mandan. Para una donde NO rankea, GSC no da nada y
volumen+dificultad son la ÚNICA forma de contestar "¿vale la pena?" y "¿cuánto cuesta?". Ahí son
**dependencia dura**, no opcional.

⚠️ **`TASK-1300` SÍ está complete** — yo repetía lo contrario desde un comentario obsoleto de
`contracts.ts`. Entregó el registry (`labs` es llamable) pero es *infra de cliente, no capability*:
falta fetch, columnas (`search_volume` no existe) y reader. Corregido en la fuente y en el doc, que
se contradecía. **Y `trackKeywords` acepta strings arbitrarios**: seguir una keyword no rankeada ya
funciona por contrato, sólo falta el botón — Full API Parity al revés.

Orden de dependencia: `1659` (modelo de intención, migración) → `1660` (lente Objetivos, UI) →
`1661` (datos de mercado) → `1662` (keyword gap). Las 4 con `task:lint` en 0/0.

**Superado el mismo día: el operating mode.** El operador señaló que el módulo tiene los **mismos
tres modelos de servicio que Globe** (`efeonce-managed` | `co-operated` | `client-operated`; "que el
cliente contrate la herramienta" NO es un cuarto modo sino `client-operated` × delivery model de
plataforma). El vocabulario YA era canónico y Globe YA lo materializó (SPEC-008, desplegado) — pero
vive en SU Postgres, y en Greenhouse `delivery-model.ts` es de cotización, no de esto. Creado como
`TASK-1663` + ADR `GREENHOUSE_OPERATING_RESPONSIBILITY_DECISION_V1.md`.

🔴 **La regla que sostiene todo, verbatim de Globe: el modo NUNCA es input de autorización.** No
decide quién PUEDE declarar (eso es `can(...)`), decide qué superficie DEBE existir y quién responde.
Si el modo otorgara acceso, cambiar una etiqueta comercial cambiaría en silencio quién puede
comprometer gasto. El entregable más importante de 1663 es el **test que lo prueba**.

**Tres ejes ortogonales:** quién puede (capability) · quién responde (modo) · quién paga (comercial). ⚠️ **Y NO se construye ahora** (el operador lo acotó el mismo día): el ADR quedó `Proposed` y
`TASK-1663` en `P3` con condición de activación = un segundo consumidor real. Hoy hay **cero
asignaciones declaradas**, así que sería infraestructura de un problema que no tenemos. `1659`/`1660`
se construyen **como están especificadas**, sin esperar y sin conciencia de modo "por si acaso".

### TASK-1308 — Keyword Opportunities COMPLETE + doctrina de scopes MCP (2026-08-07)

Ruta `/admin/growth/seo/keywords` cerrada. Nació `Backend impact: none` y terminó con migración, dos
commands, dos rutas app-lane, dos del lane ecosystem y **dos tools MCP federadas** — porque
`trackKeywords`, que la spec daba por construido por TASK-1303, no existía. La idea que ordenó todo:
seguir una keyword es un **compromiso de gasto diferido**. Detalle completo en la task, el ADR del
gateway y `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`; acá sólo lo que un agente siguiente necesita.

**Doctrina de scopes OAuth (con `arch-architect`):** un scope por **CLASE de blast-radius**, nunca
uno por capability. Corolario: la escritura N+1 de un dominio con scope **no toca Entra**. Completa
en el ADR del gateway y en ambos bundles de `efeonce-mcp-platform`.

🔴 **FRONTERA DE GRANT — lo más importante que dejó esta task.** El scope existe en `Efeonce MCP
Resource` (type `Admin`, id `17f923ad-537a-4c2f-ab5b-2a14ed650183`; round-trip verificado: 4 scopes,
ninguno perdido, `requestedAccessTokenVersion: 2` intacto). Pero **NO se cableó al cliente PKCE
compartido** `32617b87-e7ef-493a-838f-1ff3f0213b93` y **NUNCA debe cablearse**: en el lane ecosystem
el actor es `mcp:<consumer>` —la MÁQUINA, sin chequeo de capability por humano— y el hop va con token
de consumer fijo, así que **ese scope es la única puerta de la cadena que depende de la persona**.
Cablearlo daría poder de gasto a todo el tenant y **nada fallaría**. El write de Globe tampoco está
ahí. Camino correcto: `TASK-1631`.

**PENDIENTE:** push del gateway `efeonce-mcp` — commits `cb316cc`, `41dca07`, `bfbdf3a`, `1d0ebcc`.
Deploy productivo en push. Las tools quedan federadas y **fail-closed a propósito**, igual que el
único otro write del gateway.

**Follow-ups:** `TASK-1658` (drift de federación + punto ciego del guard) · `TASK-1657` (hidratación
`useId` + tokens de canvas).

### Seedance 2.5 — inventario Fal y TASK-1656 (2026-08-07)

Fal Model Search/OpenAPI confirma tres endpoints activos: T2V, I2V y R2V; Globe permanece `provider-supported / gated`.
Se dejaron el inventario API, route card, registry, fleet ledger y skills espejo actualizados; no se tocó runtime de Globe.
`TASK-1656` registra la integración backend-data: roles multimodales, audio, frame final, queue/webhook, ingest, rates,
rights, evaluación, canary, settlement y promotion por ruta. Reutiliza el adapter Fal y el control plane existente;
la UI queda en `TASK-1552` y el contrato compartido en `TASK-1633`. No habilitar 4K/1080p, tres minutos, edit/masks,
storyboard, stems, streaming, realtime, seed de entrada ni BytePlus 2.5 sin contrato verificable.

### Release `30140c662` — TASK-1304 + TASK-1306 en producción (2026-08-07)

PRs #179+#180 → manifest **`released`** (`30140c662a79-b5790565-9b75-41b8-a206-f2cd21a58080`, run 4
`31180734383`, 8m29s), watchdog `worker_revision_drift: ok`, health prod 200, **lanes 1304 vivos en
producción** (`site-audit-report` + `backlink-profile` responden 400 `missing_external_scope_type`).
Con esto el cockpit de 1306 deja de sufrir el apagado cíclico de su viewCode. Costó 4 intentos, dos
hallazgos nuevos ya en el timing ledger y el catálogo: **(a) el run zombie del outage** (31126022507,
inmanejable por API — 6 vías 409/403) bloqueaba `pending_without_jobs` → fix de causa raíz = **lista
forense `src/lib/release/preflight/ignored-pending-runs.ts`** (razón + vencimiento 2026-08-21 +
evidencia en manifest; la reliability signal NO la consume, por eso el watchdog seguirá mostrando
`pending_without_jobs: error` A PROPÓSITO hasta que GitHub recolecte el zombie — NO es un incidente
nuevo); **(b) Cloud Build de ico-batch >600s** (backlog post-outage) abortó el intento 3 — dejar
terminar el build huérfano cachea la imagen y el retry pasa limpio. **Federación EJECUTADA el mismo día**
(`efeonce-mcp` `bfb3832`, deploy `31182267290` success): provider + registerTool + lista de paridad
(6 tools SEO) + canary extendido — **canary 11/11 verde contra producción** con los datos reales de
Berel y Efeonce. TASK-1304 operativamente completa de punta a punta; cero pendientes.

### Autenticación local Gcloud con Playwright (2026-08-07)

Proceso local explícito `pnpm gcloud:auth:playwright` (invocable por Codex o Claude) para renovar CLI +
ADC a pedido del operador: `--force` repite OAuth, `--check-only` verifica sin abrir navegador; skill
espejo `greenhouse-gcloud-auth-playwright`. El setup `…:setup` guarda cuenta y clave en
`.auth/gcloud-auth-credentials.json` (gitignored, `0600`) y el perfil Chrome aislado en
`.auth/gcloud-auth-profile`. Playwright visible, no imprime URLs/códigos/cookies, cierra con
`gcloud-auth-preflight.sh`. Sin scheduler ni rollout remoto.

### TASK-1307 + TASK-1655 — pantalla ancla SEO + Historical Data Platform (2026-08-07)

**TASK-1307** (`/admin/growth/seo/performance`, in-progress → cierre en curso): pantalla
ancla implementada completa en `develop` local (3 commits, sin push). ECharts elegido e
instalado (Slice 0 — 1306/1308/1310 heredan); readers nuevos `readSeoPerformance` +
`readSeoPerformanceCatalog` con parity completa (lane ecosystem + MCP tools
`get_seo_performance`/`get_seo_performance_catalog` en el mismo PR); **fallback entre
fuentes** (keyword×posición intenta DataForSEO ◑ y cae a la posición medida GSC ● cuando
la serie exacta es más joven — regla del operador, nunca promediadas); cobertura REAL
declarada en el chart ("N de M días con medición"). GVC **premium** verde: rubric
enterprise pass, `ui:visual-gate` PASS, `ui:quality` PASS (avg 4.56, floor 4.5). Suite
growth/seo 151/151. **Cerrada y documentada** (ver la entrada del header canónico, arriba);
lo único vivo es la **promoción develop→main heredada de 1306**, batcheada con 1308/1655.

**TASK-1655** (in-progress): hallazgo de fondo — el módulo era **forward-only** (5 días
GSC / 2 de rank teniendo 16 meses en la API). Slices 1-3 SHIPPED: mirror
`greenhouse_growth_analytics.seo_gsc_history` (tabla creada, MERGE idempotente, el batch
diario espeja y reporta `bqMirror`), backfill API→BQ resumible (smoke 31/31 días Berel,
**paridad exacta PG↔BQ** verificada), split de lectura por cobertura. **Backfill de 16
meses de Berel CORRIENDO en background** (562k+ filas al momento del handoff; resumible —
si murió, re-correr `scripts/growth/backfill-gsc-history.ts` con las env OAuth del
runbook `docs/manual-de-uso/growth/backfill-historico-gsc.md`). Pendientes: verificación
final del backfill, Slice 4 (semilla rank `historical_serps`, verificar granularidad en
sandbox ANTES), Slice 5 (export nativo en la propiedad de Berel — necesita permiso
Owner, out-of-band; Efeonce ya lo tiene desde 2025-12-10).

**Hallazgos cross para quien siga:** (1) `CustomTabsNav` (@core) para tabs-que-son-links
— el TabList de lab inyecta `aria-controls` fantasma (axe critical; 1306 puede migrar
igual). (2) `SurfaceRecipe.plane='none'` para recipes sobre composiciones de cards. (3)
El 1 rojo de la suite full es `catalog-extensibility` del artifact-composer, roto por
WIP sin commitear de OTRO agente en `catalogs/deck-axis/` — no tocar desde acá.

### TASK-1306 — cockpit SEO Overview: code complete, deploy pendiente (2026-08-06)

`/admin/growth/seo` en `develop` **local (sin push)**, 5 slices. Suite **10281/0**, build prod
verde, GVC 1440+390 con `pageErrors 0`. Detalle completo en el `## Closure Report` de
`docs/tasks/complete/TASK-1306-growth-seo-overview-cockpit-ui.md`.

**Lo que necesita quien siga:**

1. **`resolveApexColor` (`src/libs/styles/`) es un hallazgo compartido.** Con `cssVariables: true`
   el theme devuelve `var(--mui-palette-*)` y ApexCharts revienta al parsearlo — 8 excepciones por
   corrida, invisibles (el chart no termina de pintar). **Los ~32 consumidores de Apex del repo
   tienen el mismo bug latente**; candidato a task propia.
2. **`MetricTrendCard` ganó `deltaOverride` + `deltaSemantics`** (opt-in, legacy byte-idéntico).
   **TASK-1307 las necesita** para su Δ30d de posición: no reimplementarlas.
3. **`readRankSnapshotLatest` NO existe** aunque 1306/1307 lo citen: sólo `readRankEvolution`.
4. **`GROWTH_SEO_ENABLED` ya está ON en Production** — la ruta queda viva al desplegar; el control
   de exposición restante es el viewCode + el `module_assignment` per-org.

**Rollout pendiente — promover `develop` → `main`.** Corregido: NO hay una migración
pendiente por entorno; hay UNA sola base (`greenhouse_app`) compartida por dev/staging/prod
y el viewCode ya está sembrado. Lo que falta es la promoción, y **no es cosmética**:
`syncViewRegistryCatalog` apaga todo viewCode ausente del catálogo TS del código EN
EJECUCIÓN, así que mientras 1306 viva sólo en `develop`, producción **apaga
`administracion.growth_seo` en cada sincronización** (ya pasó una vez; se reactivó a mano,
pero la reactivación manual se revierte sola). Queda registrado como checkbox de cierre en
`TASK-1307` (§Pendiente heredado) — si 1307 se demora o se cancela, sacar la promoción
igual, por su cuenta.

**Próximo paso:** TASK-1307, con dirección visual ya aprobada (concepto C "Evidencia narrativa",
`product-design-loop` 2026-08-06) y Slice 0 (ECharts vs Apex) todavía abierto.

### Break-glass deploy del gateway MCP — shim DCR LIVE (TASK-1654, 2026-08-06)

GitHub Actions cayó en **major outage** (4 intentos de deploy muertos: 2 cancelados en cola, 1
flake WIF, 1 sin poder descargar actions). Con autorización explícita del operador se desplegó
por **break-glass gcloud directo**: Cloud Build local→imagen `gateway:ae8f2f7` (38s) + `gcloud
run deploy --update-env-vars OAUTH_PUBLIC_CLIENT_ID=…` (aditivo, hereda el resto de la revisión;
el workflow declara la var así que el próximo deploy normal converge). Revisión
`efeonce-mcp-gateway-00015-4st` sirviendo 100%. Verificado live: AS metadata con
`registration_endpoint` + authorize/token reales de Entra, protected-resource apuntando al
gateway, `/register` devolviendo el client fijo, `/mcp` anónimo 401, y canary 4/4 (rank-evolution
series=31). Rollback: snapshot de la revisión previa en scratchpad + `gcloud run services
update-traffic` a `00014`. **VERIFICADO CON EL CLIENTE REAL (2026-08-06 ~17:50Z): Claude Code
autenticó exitosamente contra el gateway** ("Authentication successful / Connected") tras el
segundo fix — scopes CUALIFICADOS en el protected-resource metadata (`56e46f7`, revisión
`00016-6zh`): Entra v2 resuelve scopes pelados contra Graph (AADSTS650053); el valor requestable
es `https://mcp.efeonce.org/mcp/<scope>` y el `scp` del token vuelve pelado (verifier intacto,
validado con arch-architect). Pendientes: (1) formalizar TASK-1654 retroactiva (shim DCR + scope
fix, ambos break-glass documentados); (2) cuando GitHub Actions se recupere del major outage,
correr el deploy normal del workflow para converger el carril canónico (declara la env var; el
código ya está en main `56e46f7`).


> Historial rotado: [Handoff.archive.md](Handoff.archive.md).

### TASK-1304 — site audit + backlinks: code complete + smoke E2E real, rollout pendiente (2026-08-06)

Los fundamentos técnicos + off-page de EPIC-022 quedaron completos en `develop` **local (sin push)**:
`queueSiteAudit` (OnPage async, gate consume cupo de audits, guard anti doble-encolado),
`collectSiteAuditRuns` (claim `FOR UPDATE SKIP LOCKED`; UPDATE + findings + outbox en la MISMA tx =
exactly-once; gave_up a las 24h), `captureBacklinkSnapshot` (pre-check + `ON CONFLICT DO NOTHING`;
`partial` honesto si el delta falla), readers `readSiteAuditReport`/`readBacklinkProfile`, signal
`seo.audit.stuck_tasks` (6h warn / 30h error), 3 handlers ops-worker + 3 Cloud Scheduler **PAUSADOS**
en `deploy.sh`, mirrors BQ `seo_site_audit_history`/`seo_backlink_history` (tablas creadas con
`bq mk`) y — mandato parity — 2 lanes ecosystem + MCP tools `get_seo_site_audit_report` /
`get_seo_backlink_profile` en el mismo PR.

**Smoke REAL ejecutado** (~USD 0.05, efeoncepro.com dogfooding): enqueue task OnPage real (10 págs,
USD 0.0015) → collect materializó exactly-once (`succeeded`, health 93.41, 60 findings 0c/32w/28n) →
re-collect no-op → backlinks USD 0.048 (15 ref domains, 455 backlinks, rank 44/100, new/lost 5/0) →
re-run `already_captured` USD 0 → mirrors BQ 1 fila c/u (manuales — el worker desplegado aún no tiene
las projections) → signal ok → ledger del transporte correcto. **Gotcha cazado en vivo:** el poll
`summary` de OnPage es POST con id en el BODY (`[{id}]`) — la variante POST-por-path responde 200
sin tasks y el collect quedaba ciego (fix + guard de regresión + reference del skill corregida).
Gates: suite full verde, build prod, worker gates, sanity SQL 17 checks, docs:closure-check.

**ROLLOUT EJECUTADO (2026-08-06 tarde, autorización "termina todo lo que falte"):** push develop
hecho; Actions en outage mayor mató 2 runs del worker en cola → **break-glass local** del
ops-worker (mismo patrón que el gateway ese día): revisión **`ops-worker-00528-zgr`** con
`GIT_SHA=26005a619`. **Los 3 schedulers ACTIVOS** (deploy-contract test ahora protege el estado
ENABLED) y handlers ejercitados por el camino real Scheduler→OIDC: **primer audit de Berel
encolado** (USD 0.015, 100 págs) + **primer backlink snapshot de Berel** (USD 0.048: 315 ref
domains, 53.684 backlinks, rank 50/100); efeonce skip por idempotencia. Lanes staging vivos
(400 `missing_external_scope_type`). **Ciclo autónomo COMPLETO verificado el mismo día:** el
collect PROGRAMADO (tick del cron, cero intervención) materializó el audit de Berel —
`succeeded`, 100 páginas, health 95.40, 519 findings (0 críticos) — y la lane reactiva espejó el
backlink snapshot de Berel a BQ orgánicamente (2 filas en `seo_backlink_history`). **Pendiente restante — bloqueado por el outage de Actions:**
release develop→main (los lanes/MCP tools a Vercel Production; NUNCA dispatchar el orquestador en
outage: `main` quedaría sin manifest) y DESPUÉS federar las 2 tools al gateway (patrón TASK-1653 —
antes del release el gateway vería 404). Si el run varado de Actions (31126022507) despierta,
deploya el mismo SHA — converge inofensivo. Runbook:
`docs/manual-de-uso/growth/operar-site-audit-backlinks-seo.md`.

### Hallazgo MCP gateway — clientes Claude no conectan por falta de DCR (2026-08-06)

⚠️ **Superseded el mismo día** por el break-glass del shim DCR (entrada TASK-1654, arriba: LIVE y
verificado con el cliente real). Se conserva sólo la causa: el cliente MCP de Claude exige DCR
(RFC 7591) para auto-registrarse y **Entra no lo soporta**, así que sin el shim `/register` del
gateway falla con `Incompatible auth server: does not support dynamic client registration`.

### Efeonce dejó de ser cliente de sí misma — modelado corregido (2026-08-06)

`EO-ORG-0007` (Efeonce, `is_operating_entity=true`) tenía `organization_type='client'`, herencia
del space de cliente de **marzo 2026** — de cuando aún no se había decidido que la operadora no
es cliente. No lo causó el dogfooding SEO: el script de provisión no escribe en `organizations`,
y la única transición registrada es `null → inactive` del 2026-04-21 (backfill TASK-535).

**Qué exponía.** 5 readers filtran `organization_type IN ('client','both')` **sin consultar el
flag**: lista y detalle de `/finance/clients`, `finance/canonical.ts`, el backfill de
`client_profiles` y el picker del wizard de onboarding. Efeonce salía **primera** de 17 clientes
(orden por `updated_at DESC`). Y `resolveFinanceClientContext` la aceptaba como cliente
facturable, siendo la misma org el emisor fiscal — autofacturación posible. Daño consumado
verificado: **0 income, 0 contratos, 0 usuarios de portal**. Puerta abierta, no incendio.

**Corregido** con `scripts/commercial/reset-organization-commercial-role.ts` (nuevo): baja el rol
a `'other'` por el writer canónico. Hizo falta una puerta dedicada porque
**`deriveOrganizationType` es monótona** — nunca degrada un rol adquirido, así que un
`upsertCanonicalOrganization` normal lo perpetúa (mi escritura de `website_url` de ese mismo día
lo hizo). El script declara `currentType='other'` explícitamente, con guardas: aborta si el
lifecycle implica rol real o si hay income.

**Verificado tras el cambio:** `organization_type='other'`, `is_operating_entity=true` intacto,
2 `module_assignments` intactos, y el canary SEO contra producción sigue devolviendo
`hasModule=true tier=contracted 8 audits $50`.

**El modelo ya soportaba esto — no había que inventar nada.** Tres ejes ortogonales: identidad
legal (`is_operating_entity`), rol comercial (`organization_type`) y capabilities
(`module_assignments`). La operadora monitorea su propio SEO/AEO/GA4 por el tercer eje;
`enforceSeoRunEntitlement` resuelve sólo por `organization_id` + `module_key`, cero dependencia
del tipo. `'other'` no significa "sin clasificar": significa **sin rol comercial**, que es lo
que la operadora es. Contrato semántico escrito en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
§Organization Types, junto con el **NUNCA** de agregar un valor de identidad al enum (ya se
intentó: quedó una rama muerta contra `'efeonce_internal'`, que es un `tenant_type` de usuarios,
no un tipo de organización).

**Follow-ups con dueño:** `TASK-1648` (guard por flag en los 5 readers — cierra la causa),
`TASK-1649` (el `space` y `client_profile` de marzo, con inventario antes de tocar),
`TASK-1650` (el emisor legal de cotizaciones compartidas: query a columnas inexistentes +
`catch` mudo ⇒ todo quote imprime un hardcode; incluye la discrepancia `of 05` vs `Of 1105`).

**Pendiente de decisión tuya:** el merge/borrado en HubSpot de las auto-companies `efeonce.org`
(56011409567) y `efeonce` (57099835819). La canónica **nunca estuvo en HubSpot**
(`hubspot_company_id` es `null`); esas dos son auto-companies creadas desde el dominio del correo
de formularios de prueba. Mergear exigiría *crear* una company canónica de Efeonce, que es
justo lo que no debe existir — corresponde borrarlas, y primero en HubSpot (si se borran sólo en
Greenhouse, el sync las repone). Sin exclusión de dominios internos en el inbound, vuelven.

### Cutover MCP-first de Search Visibility 360 — COMPLETO en producción (2026-08-06)

Las 4 capas quedaron vivas y verificadas, en este orden. **TASK-1645 y TASK-1647 pasan a `complete`.**

**1. Release `develop→main`** — PR #177, SHA `70e912056273d0a30e2aa8dacc2f4e62076e3b44`,
`release_id=70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`, run `31058032196`, manifest `released`,
workflow 10m51s. Batch grande (355 commits, 221 archivos de código, 14 migraciones: EPIC-022 SEO
completo, EPIC-028 Globe, identity 1616/1631, payroll 1630, Nexa 1182, EPIC-040). **Pasó a la primera,
sin bypass y sin retry** porque los 3 gotchas conocidos se pre-emptaron: merge canónico
`origin/main -X ours` antes del PR (conflicto modify/delete de TASK-1590 resuelto conservando develop),
marker `[release-coupled: …]` en el cuerpo del squash (batch policy → `ship`), y
`gh workflow run playwright.yml --ref main` antes del dispatch (3m10s) en vez de bypassear el
`playwright_smoke` ausente del squash. Watchdog `drift_count=0`; el residual change-gated de
`ops-worker` (`558558263e80`, diff runtime vacío) ya lo clasifica bien el fix que entró en `6f7e246ea`.

**2. `GROWTH_SEO_ENABLED=true` en Vercel Production** + redeploy `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`
(Vercel congela env vars al crear el build). Multi-runtime: el mismo flag ya estaba ON en el
`ops-worker` para el materializer GSC. Ledger actualizado.

**3. Canary del provider contra producción** (`greenhouse.efeoncepro.com`, service identity del
gateway): **Berel `domainQuadrant=riesgo`, 50 keywords, AEO 44.5** · Efeonce `hasModule=true
tier=contracted` + `no_seo_data` honesto · deny anti-oracle `404 greenhouse_seo_lane_404`.

**4. Provider habilitado en el gateway** — `efeonce-mcp` `76cb121`, workflow `31059346243`, revisión
`efeonce-mcp-gateway-00012-dkj` `Ready=True` con `GREENHOUSE_ECOSYSTEM_TOKEN` como **secret ref** de
Cloud Run. Hallazgo: el secreto `efeonce-mcp-gateway-greenhouse-token` se había creado **sin ninguna
binding IAM** — sin el `secretAccessor` scoped al SA del gateway el deploy habría fallado. Front door
verificado: health `200`, protected-resource metadata `200` (3 scopes), `POST /mcp` anónimo `401` con
`WWW-Authenticate` correcto.

**5. Smoke MCP autenticado por `mcp.efeonce.org` — VERDE.** `scripts/oauth-canary.mjs` quedó
**extendido en este cierre** con las tools SEO. Flujo Entra authorization-code + PKCE real (login
humano), token con `aud=c5363215-…` y `scp` incluyendo `efeonce.mcp.read`:

```bash
MCP_CANARY_SEO_ORGANIZATION_ID=org-32333527-02a8-487b-819e-6f76a761777d \
MCP_CANARY_SEO_DENY_ORGANIZATION_ID=org-00000000-0000-0000-0000-000000000000 \
node scripts/oauth-canary.mjs
```

→ `initialize 200` · `seoEntitlementStatus 200` · `seoVisibility360Status 200` ·
**`seoDomainQuadrant: "riesgo"`** · `seoDenyFailedClosed: true` (+ Globe capabilities/fleet 200).

**Ese `riesgo` es el quadrant real de Berel devuelto por el front door público**: la cadena
Entra → gateway → provider → lane → readers → PG está cerrada end-to-end. El objetivo de la sesión
—preguntar por MCP por la visibilidad 360 de Berel y recibir el quadrant real— está cumplido.
El smoke exige login interactivo, así que es asistido por humano, no automatizable en CI.

**Pendientes menores heredados (sin tocar):** merge en HubSpot de las auto-companies `efeonce.org`
(56011409567) y `efeonce` (57099835819) hacia la company canónica — el sync propaga, NUNCA borrar por
SQL; ~~`website_url` en EO-ORG-0007~~ **HECHO 2026-08-06**: `https://efeoncepro.com` poblada por
`upsertCanonicalOrganization` (script `scripts/growth/_sanity-efeonce-website-url.ts`, idempotente,
sin `overrideIdentity` para no pisar un valor ajeno; `organization_type` se mantuvo `client`);
conexión GSC de
`efeoncepro.com` gated por TASK-1282/1283.
