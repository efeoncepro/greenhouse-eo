# Handoff activo

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

### Efeonce provisionada como org del 360 (own-brand, dogfooding) — 2026-08-05

Decisión de modelado del operador ejecutada: **Efeonce se modela como su propio cliente** sobre la org
canónica **EO-ORG-0007** (`Efeonce`, Efeonce Group SpA, RUT 77.357.182-1, `is_operating_entity=true` —
canónica verificada contra la base; las otras dos orgs "efeonce" son auto-companies de HubSpot
sincronizadas como ruido). Aplicado con `scripts/growth/provision-efeonce-own-brand-seo.ts` (idempotente):

- 4 perfiles del grader ligados (`EO-GAVP-0002/0017/0018/0020`) → **lente AEO disponible** (cierra §2.A
  del programa AEO para la marca propia).
- Assignment `cpma-efeonce-seo-own-brand` (`seo_v1`, contracted, `metadata.note=own_brand`) → chokepoint
  responde `hasModule=true`, 8 audits, $50 budget.
- Target `seot-efeonce-own-brand` (efeoncepro.com, CL/es).
- Verificado vía payloads del lane (TASK-1645): entitlement ✓ · keyword-opportunities `ok:true` (vacío,
  sin GSC aún) · visibility-360 → **`no_seo_data` honesto** (lente SEO llega al conectar la GSC de
  efeoncepro.com — OAuth de TASK-1282/1283, rollout pendiente — o con TASK-1303/DataForSEO).

**Pendiente vivo:** conectar la GSC de efeoncepro.com cuando 1282/1283 destraben su rollout. SKY ya
tiene lente AEO ligada; su SEO sigue igual de pendiente. Los otros dos pendientes de esta entrada
(auto-companies HubSpot · `website_url`) están resueltos o repetidos en las entradas de 2026-08-06.

### TASK-1305 — Cruce SEO↔AEO (quadrant 360) COMPLETE (2026-08-05)

La sinergia directa con AEO que exigió el operador quedó implementada el mismo día: `readSeoAeoGap`
(`src/lib/growth/seo/gap/read-seo-aeo-gap.ts`) cruza `seo_gsc_daily` (posición medida, ponderada por
impresiones) × `grader_scores` (último run reportable del org) EN MEMORIA por `organization_id` — cero
JOIN/VIEW/FK cross-motor (boundary §1.1, verificado por test dedicado que inspecciona las queries
emitidas). Clasificador puro `classifyQuadrant` (página 1 × score ≥ 50, overridables, jamás promediados)
+ contrato `SeoAeoGapResult` con `aeoAxisGranularity='domain'` (TASK-1311 refina a URL sin romperlo).

**Primera señal 360 real (smoke live):** Berel rankea #1.75 orgánico para su marca con citabilidad AEO
44.5 → quadrant **`riesgo`** = autoridad orgánica sin citabilidad = el CTA cruzado al AEO, funcionando.

Evidencia: 12 tests (incl. boundary + tenant binding) + smoke live con cero residuo
(`scripts/growth/_sanity-seo-aeo-gap.ts`, patrón commit+try/finally post hallazgo TASK-1300 — el
BEGIN/ROLLBACK cross-pool NO es seguro; `_sanity-seo-entitlement.ts` endurecido igual). Full suite
**10142/0** + build prod verdes. Commits `6ff948e2d`+`3bac9df0a` (Slice 1) + `ed88f7d16` (Slice 2).
Nota de proceso: el primer commit de Slice 1 capturó solo el rename (git add abortó por ruta
inexistente — gotcha conocido); `3bac9df0a` es el fixup con el código.

**Rollout:** reader detrás de `GROWTH_SEO_ENABLED` (hoy ON solo en el ops-worker para el materializer;
el reader lo consumirán TASK-1645/1310 — cada consumer valida el flag en su runtime). **Próximo paso
del camino MCP-first: `TASK-1645`** (lane ecosystem + MCP tools — get_seo_visibility_360 nace con este
cruce). Sin push aún.

### TASK-1646 — Cloud Infrastructure doc particionado (2026-08-05) · compactado 2026-08-07

**Complete.** El monolito `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` quedó dividido según el precedente
ui-platform: `docs/architecture/cloud-infrastructure/` (11 temáticos + `HISTORIAL.md`) + router stub +
ADR `GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md`. **Entrada canónica:** el `README.md`
de esa carpeta (cambio vigente → temático; cronología → HISTORIAL; nada al stub). Al separar se
corrigieron inventarios stale de la auditoría 2026-04-23: vigente 2026-08-05 = **46 scheduler jobs**
(`services/ops-worker/deploy.sh`), **8 crons Vercel** (`vercel.json`), **7 workflows de deploy**;
descartes anotados `⚠️ Superseded`. Re-auditoría live GCP sigue siendo TASK-127.

### TASK-1301 — Capabilities + entitlement per-org SEO COMPLETE (2026-08-05) · compactado 2026-08-07

Segundo eslabón de la Ola B MCP-first de EPIC-022. 5 capabilities `growth.seo.*` (seed
`capabilities_registry` migración `20260805162304440` + grants en `runtime.ts`; `entitlement.manage`
SOLO ADMIN+ACCOUNT; `report.read_client` client_* scope own) — coverage verde. Módulo **`seo_v1`**
seedeado en `greenhouse_client_portal.modules` (migración `20260805163024516`; hallazgo del smoke:
`module_assignments.module_key` tiene FK al catálogo, la spec no lo declaraba). **Chokepoint único
`enforceSeoRunEntitlement`** (`src/lib/growth/seo/entitlement.ts`), consumer-agnóstico por mandato
parity+MCP: tier `metadata_json.seo_tier`, `expired` explícito, allowance + budget USD/mes por tier
(env-knobs `GROWTH_SEO_*` = config, NO flags `*_ENABLED`), gasto = `SUM(provider_cost)` de 1299.
Evidencia: 12 tests + smoke live con cero residuo (`scripts/growth/_sanity-seo-entitlement.ts`), suite
**10076/0**, migraciones aplicadas en `greenhouse-pg-dev`. Commits `de94363df` + `100ee9fec`.

### TASK-1299 — Schema SEO fundacional aplicado + contrato parity/MCP de EPIC-022 (2026-08-05)

TASK-1299 (schema `growth.seo`, bloqueador fundacional de EPIC-022) quedó implementada y verificada en vivo:
migración `20260805134439202_task-1299-growth-seo-schema.sql` **aplicada en `greenhouse-pg-dev`** (dev/staging
comparten instancia) — 8 tablas `seo_*` (4 config + 4 serie temporal append-only por `capture_date`), UNIQUEs
de idempotencia, triggers `block_seo_row_mutation` (genérico via TG_TABLE_NAME), GRANTs least-privilege
(mediciones sin UPDATE/DELETE para runtime), `db.d.ts` regenerado. Smoke live contra PG real (con rollback):
UNIQUE de captura duplicada ✓, anti-mutation en rank/findings/backlinks ✓, cierre de término por UPDATE de
`effective_to` permitido ✓, state machine de `seo_site_audit_runs` mutable ✓, `capture_date`=DATE /
`captured_at`=TIMESTAMPTZ ✓. Commits `ff399497c` (schema) + `db949d85f` (contrato).

**Directiva del operador (misma sesión): el módulo SEO nace Full API Parity y usable por MCP.** Materializada
como contrato con dueño: `TASK-1645` nueva (lane ecosystem `/api/platform/ecosystem/growth/seo/*` + 3 MCP
tools read-only, espejo TASK-1086 de Knowledge; blocked by 1301/1302/1303), exit criterion nuevo en EPIC-022
(el epic NO cierra UI-only), DoD reforzado en TASK-1301 (chokepoint consumer-agnóstico) y deltas de impacto
cruzado en 1302/1303/1304 (el schema ya existe; readers nacen consumer-agnósticos).

**Delta misma sesión — destino Wave declarado.** El operador comunicó que SV360 nace en Greenhouse pero
eventualmente se habilita como producto en `wave.efeonce.org` (consistente con EPIC-037). Materializado como
contrato, no como código: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` **§17** (inventario del seam de extracción,
FK org = único acople deliberado que se intercambia en la extracción, reglas duras extraction-ready para TODA
child task de EPIC-022), deltas en EPIC-022/EPIC-037/TASK-1299/TASK-1645. El schema aplicado NO cambió — ya era
extraction-ready. La extracción física NO queda autorizada (programa posterior de Wave; EPIC-027 manda hoy).

**Rollout:** schema inerte por diseño (cero consumers hasta 1302+); prod recibe la migración vía release
control plane cuando el módulo se secuencie. Próximo paso del epic: `TASK-1300` (DataForSEO families, paralela)
y `TASK-1301` (capabilities). Nota de sesión: hubo commits concurrentes de otro agente (`aa00683bb` absorbió
el scaffold vacío de la migración + el rename de la task; sin pérdida — verificado).

### TASK-1631 — Slice 0: comparación build-vs-buy y memo de privacidad entregados (2026-08-05)

TASK-1631 (Efeonce Customer Identity + MCP Federation) está `in-progress` en `develop`. Intake verificó contra
runtime que la spec no tiene drift (gateway single-issuer, `clientId = azp ?? sub`, fusión `scp∪scope∪roles`).
Con aprobación del operador se ejecutaron **S0.2 y S0.3** del Slice 0:

- **S0.2 (costos):** ADR §`Slice 0 measurement — build vs buy vs hybrid`. Native medido contra el código real =
  7–10.5 semanas senior + operación permanente (el broker sister-platform NO autentica personas; depende de la
  sesión NextAuth del portal). WorkOS = USD 99/mes planos + SSO USD 125/conexión/mes, **revisita a ≥5 conexiones
  enterprise**. **Recomendación: WorkOS** con binding provider-neutral.
- **S0.3 (privacidad):** memo `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md` (Efeonce
  controller / IDP encargado, minimización, checklist DPA/subprocesadores/región/retención/ARCO; CL 21.719
  plena el 1-dic-2026 + CO/MX/PE). **Gate abierto:** falta DPA firmado + abogado habilitado.

**Delta mismo día — composición APROBADA con staging de gasto cero.** El operador no quiere pagar WorkOS ahora;
la recomendación se ajustó y aprobó: (1) hoy USD 0, nada provisionado, solo diseño; (2) primer cliente
interesado → WorkOS **free tier sin dominio propio** (AuthKit hosteado, dominio default); (3) USD 99/mes por
`auth.efeonce.org` sólo con clientes pagando. Requisito duro derivado: el binding se llavea por
`(environment, subject)` vía registry `external_identity_environments`, NUNCA por el issuer string crudo — el
cutover de dominio futuro es un UPDATE auditado + re-login, no re-onboarding. **S0.4 y S0.5 entregados** en el
ADR: binding de persona reutiliza `identity_profile_source_links` (sin tabla de identidad nueva); tablas nuevas
sólo para organización/grants/invitaciones; `AuthContext` de 6 campos sin fallback + tools con
`allowedIssuers` + clase de autoridad + 3 tests de regresión obligatorios. La task `ui-ux` dependiente se
reduce a branding config y su creación se difiere (AuthKit hosteado elimina el login custom del primer corte).

**Restante para Slices 1-3:** cierre legal (DPA + abogado), checklist pre-provisión (CIMD live,
`subject_types_supported`, términos free tier) y aceptación formal del ADR completo. Pendiente del Slice 0:
S0.1 (matriz de tokens live + base-only de TASK-1626 — **requiere sesión interactiva del operador** para los
logins OAuth) y el contrato de convergencia del login Greenhouse. Nada externo se provisionó.

### Registro de partnerships — fuente operativa creada (2026-08-05)

Se creó [`EFEONCE_PARTNERSHIP_REGISTRY_V1.md`](docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md) como registro
central de partnerships, providers y postulaciones (Google Cloud, Claude, OpenAI, BytePlus, Runway, ElevenLabs, FLUX,
AWS, Salesforce, HubSpot, Lovable, HeyGen…), separando partnership activo · cuenta registrada · postulación · provider
en uso · bloqueo · target. Google Cloud está `Partner registrado` con debida diligencia `En curso` (sin nivel
Select/Premier/Diamond ni capacidad de crear oportunidades). ⚠️ **Google envió el 2026-08-06 la due diligence
anti-soborno con fecha límite 2026-08-13**: responder el formulario y actualizar el registro sólo con evidencia
primaria. La auditoría de postulaciones de IA del 2026-07-26 queda como fotografía histórica.

### Nexa — retiro del modo "Compacto" + diagnóstico del lane que se abría solo (2026-08-05)

**Origen.** El operador reportó que al iniciar sesión el chat de Nexa aparecía abierto a la derecha. Causa
verificada en runtime (no deducida): su fila en `greenhouse_core.client_users` tenía
`nexa_interaction_mode='lane'`, y el provider abre el sidecar en cada carga fresca
(`useState(initialMode === 'lane')` en `nexa-interaction-mode-context.tsx`), sin persistir el colapso. Se
reprodujo con su propia sesión vía agent-auth y se contrastó con otra persona en modo `expandible` (no monta
el lane). **Preferencia revertida a NULL**; no hubo cambio de código para eso.

**Cambio ejecutado.** Se retiró el modo `dock` ("Compacto"): era el panel efímero pre-TASK-1078 (runtime
local, sin historial) que sobrevivió como opción del selector tras el cutover al panel ampliable. Salieron
con él su código muerto en `NexaFloatingButton` y el flag `NEXA_FLOATING_EXPANDABLE_ENABLED` + mirror
`NEXT_PUBLIC_*` (su único fallback era ese modo). Modos vigentes: `expandible` (piso incondicional) y `lane`.

**Estado: cerrado.** Code complete, migración aplicada, **pusheado a `develop`** (`8dbd11e5e`) y las 3 env
vars huérfanas del flag retirado borradas de Vercel el 2026-08-05
(`NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` en Production, staging y Preview develop; la var server
nunca existió, solo el mirror). Verificado con `vercel env ls` post-borrado: cero restos del flag retirado,
`NEXA_INTERACTION_LANE_ENABLED` intacto.

**Verificación:** `pnpm local:check`, `pnpm test` (10.064 pass), `pnpm build`, `pnpm flags:audit --strict`
verdes. Menú verificado con Playwright contra localhost: solo Panel/Lateral, switch a Lateral y vuelta con
`PATCH /api/home/preferences` 200, cero errores de consola. CHECK de DB leído post-migración:
`('expandible','lane')`, 0 filas en `dock`.

**Deuda descubierta → devuelta a su dueña, no a una task nueva.** El `focusRef` + pregunta semilla vivía
**solo** en el panel legacy, nunca en `NexaFloatingPanel`. Como el default en producción era `expandible`,
el CTA "Pregúntale a Nexa" ya no anclaba el insight ni auto-enviaba la semilla **antes** de este cambio. El
barrido por dominio mostró que **TASK-1182 sigue `in-progress`** y es la dueña del `focusRef`: se le agregó
`## Delta 2026-08-05` con el estado real de sus criterios y el trabajo restante redefinido (portar el ancla
a `useNexaPersistentRuntime`, que cubre Panel y Lateral por construcción). De paso se cerraron dos huecos
preexistentes de su Status que la hacían no-tomable: `UI ready: no` + wireframe registrado
(`docs/ui/wireframes/TASK-1182-nexa-insight-surface-aware-conversation.md`, con las 3 decisiones de
comportamiento abiertas que bloquean `UI ready: yes`). `task:lint` y `ops:lint --changed` en 0/0.
