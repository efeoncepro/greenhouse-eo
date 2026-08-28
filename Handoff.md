# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-28 — LicitaLAB MCP + radar Playwright documentados en skills Codex/Claude

**Estado: `complete`, discovery read-only + primera promoción CRM verificada.** El MCP OAuth expone cinco tools
read-only y el radar autenticado mantiene credencial/perfil/reporte ignorados bajo `.auth/` con modo `0600`; su
canary paginado leyó 45 oportunidades. Las skills espejadas separan discovery web, evidencia MCP y promoción humana.
La prueba aprobada creó Company `57870164778` y deal `64461187076` para `1098710-22-LP26`, en
`default/qualifiedtobuy`, `Strategic Bets`, CLP 250.000.000; el readback probó Deal↔Company y
`num_associated_deals=1`, sin contacto ficticio. `gh_commercial_party_id` sigue vacío y el bridge no admite aún
`public_tender`; automatizar nuevas altas requiere la extensión gobernada. Cada write conserva búsqueda de
duplicados, confirmación y readback.
**Frontera corregida por el operador:** LicitaLAB ve licitaciones públicas solamente; toda fila mantiene
`public_opportunity` y sólo se promueve con `origin='public_tender'`. Nunca se usa para discovery privado ni se
mezcla con Wherex, Ariba, Coupa u otros portales corporativos. Estado rápido de bid, CRM y postulación:
`docs/commercial/tenders/LICITATION_CRM_REGISTER.md`; la vista transversal de deals activos vive en
`docs/commercial/CRM_DEAL_REGISTER.md`. Ambos son índices fechados y siempre requieren readback live; una
licitación promovida se sincroniza por `deal_id`, mientras el radar sin Deal permanece sólo en bid desk.

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
- **Deploy del gateway MCP.** Hay un commit LOCAL SIN PUSH en `~/Documents/efeonce-mcp` (`807fb76`)
  con espejo de inventario, schema, descripción y canary al día (67 tests verdes). Sin él, el guard
  bidireccional de paridad de ese repo queda rojo en cuanto Greenhouse promueva.
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

## 2026-08-27 — TASK-1696: el gasto del grader entra al ledger; el gate de dinero nace en shadow

**Estado: `code complete, rollout pendiente`** — el schema, la atribución y las tres señales están
vivos SIN flag (son aditivos y sólo hacen visible lo que ya ocurría); el gate de presupuesto
per-org queda code-complete con sus dos flags en OFF.

**Lo que cerró.** El grader AEO le compraba a DataForSEO fuera del ledger declarado como fuente
única de presupuesto. Ahora `seo_provider_spend_daily` distingue **quién** consumió (`consumer`:
`seo`|`aeo`) y **de qué tipo** es el dólar (`cost_basis` + `price_table_version`, acoplados por
CHECK); el presupuesto SEO filtra `consumer='seo'` y el AEO es `resolveAeoBudget`. UN ledger, dos
resolvers. El adapter de AI Mode migró al transporte canónico con `consumer: 'aeo'` +
`organizationId` derivado del perfil.

**Dos defectos reales que la spec no tenía, encontrados ejercitando el SQL contra PG y no
leyéndolo:**
1. Con la clave única de 4 columnas, un dólar `estimated` colisionaba con la fila `invoiced` del
   mismo día y entraba por el `DO UPDATE`, que suma el monto pero **no toca `cost_basis`** — quedaba
   reetiquetado como facturado, sin error. La clave pasó a SEIS columnas con `NULLS NOT DISTINCT`
   (migración forward-fix `20260828020728716`).
2. `estimateObservationCostUsd` devuelve, para `google_ai_overview`, el costo **real** de
   DataForSEO. O sea que `grader_runs.estimated_cost_usd` ya contenía los dólares que el ledger
   ahora también guarda: sumar los dos lados —lo que pedía el contrato de la spec— habría contado
   ese gasto **dos veces**. `resolveAeoBudget` resta esa porción. Verificado: USD 7,2419 bruto −
   USD 0,112 DataForSEO = USD 7,1299 de LLM.

**Trampa de runtime que estaba a un commit de morder:** `postDataForSeoTask` LANZA si viene
`organizationId` y el runtime no registró el contador de gasto, y sólo lo registraba el entrypoint
del ops-worker — pero el grader **también corre inline en Vercel**
(`/api/admin/growth/ai-visibility/runs`). El `catch` del adapter habría convertido ese throw en una
observación `failed`: AI Mode muerto justo para los perfiles de cliente que la task existe para
atribuir, sin que ningún test lo notara. El adapter registra el contador por import de efecto.

**Desvío deliberado del plan de la spec:** la skill `dataforseo-operator` congela
`postDataForSeoSerpLiveAdvanced` ("no agregar parámetros acá"). En vez de engordarlo con
`organizationId` + `consumer`, se migró su único consumer productivo. El wrapper queda congelado,
documentado como puerta que **no atribuye**, y con guard que rompe el build si alguien vuelve a
comprar por ahí.

🔴 **Dependencia de ORDEN para federar la tool MCP (precedente TASK-1661, ya nos pasó una vez).**
`get_seo_provider_spend` está en `main` de `efeonce-mcp` (commit `1a51461`), pero **el deploy del
gateway es `workflow_dispatch` manual — el push NO desplegó nada**. Y el lane que la tool consume,
`/api/platform/ecosystem/growth/seo/provider-spend`, **está en `develop`, NO en `main` de
Greenhouse** (verificado con `git ls-tree -r origin/main`). Disparar `Deploy Cloud Run` del gateway
ANTES del release dejaría la tool respondiendo **404 upstream** en `mcp.efeonce.org`: el guard de
paridad quedaría verde y la tool rota. **El deploy del gateway va DESPUÉS del release que lleve el
lane a `main`**, nunca antes.

**Pendiente de rollout, con dueño:** (1) prender `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED` en
Vercel **y** en el ops-worker (`deploy.sh` + `--update-env-vars`, los dos pasos) y verificarlo en la
**revisión activa** de Cloud Run; (2) observar un mes calendario de `wouldBlock` por tier; (3)
llevarle al operador una propuesta de tope — **el flip a `ENFORCED` es decisión suya**. Los defaults
(60/10/3 USD) nacen holgados a propósito: en shadow tienen que dejar pasar todo.

**Verificación que NO se pudo hacer y por qué:** el criterio "una corrida real sobre un perfil CON
organización deja fila `('aeo','serp','invoiced')`" no es observable del histórico — **cero** de las
42 observaciones de AI Mode que compraron pertenecen a un run cuyo perfil tenga organización.
Requiere provocar la corrida. La señal de drift ya lo refleja honesto: 7 observaciones de agosto
compraron desde perfiles públicos (`warning`, ausencia legítima) y **0** de drift atribuible.

**Segundo punto ciego, del mismo tipo:** `pnpm skills:mirrors` pasa **sin mirar**
`dataforseo-operator` — no está en el manifiesto de `scripts/skills/validate-mirrored-skills.mjs`,
y el validador sólo tiene modo `byte-identical` (esta skill no puede serlo: frontmatter distinto por
contrato y `references/` sólo en `.claude/`). El espejo se verificó a mano esta vez. Admitirla exige
un modo "cuerpo-idéntico" en el validador — decisión de alcance pendiente.

**Punto ciego anotado, no cerrado:** `pnpm flags:audit` no ve estos flags — su regex busca
`process.env.X_ENABLED` literal y todo `ai-visibility/flags.ts` los lee por constante (`env[FLAG]`),
así que reporta "0 sin registrar" sin haberlos mirado. Se registraron a mano en el ledger.

## 2026-08-27 — Release a producción ejecutado: carril Growth SEO completo (sesión de coordinación)

**Manifest `released`.** `main` = `cc73c74789ce9e667096d5316e9d991fd4a2186a`, release_id
`cc73c74789ce-dbce65f2-303b-4528-bef3-f4edd022a880`, run `33123977671`, todos los jobs verdes
(Azure con su `Skip Bicep deploy (no diff)` esperado, post-release health check verde). Producción
responde 200 en `/api/auth/health` con los 3 providers `ready`.

**Flags prendidos**: `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` (Vercel, sign-off comercial otorgado) y
`GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (Vercel Production). Redeploy `greenhouse-if2u2c8ys`.
`pnpm flags:audit --strict`: 0 flags ON sin lector en `main`, 0 con lector divergente.

**Rollout de la tríada, verificado antes del pase**: los 3 flags ON en la revisión activa del
ops-worker y los 3 schedulers `ENABLED`; smokes live por USD 0,2958 (total del día USD 1,0176,
cruzado contra `seo_provider_spend_daily`). Se atajó un bug real: `deploy.sh` conservaba el 5.º arg
de `upsert_scheduler_job` en `"true"`, así que el siguiente deploy habría **re-pausado los
schedulers en silencio** (fallo silencioso versión scheduler); corregido en `7c1a44962` y verificado
post-deploy.

**PENDIENTES que quedan abiertos:**

1. **Deploy del gateway MCP (TASK-1658) — CERRADO 2026-08-27.** Lo tomó la sesión de coordinación
   porque su sesión dueña terminó antes de que el manifest cerrara. `pnpm check` verde (67/67) →
   push `85b65cb`..`220e916` → `deploy.yml` run `33125750952` success → revisión
   **`efeonce-mcp-gateway-00023-zt2`** `Ready` → `mcp.efeonce.org/health` 200.
   **`tools/list` autenticado observado: 21 tools SEO** (antes 13), con las 8 recién federadas
   presentes. Canary del provider contra producción verde para Efeonce y Berel.
   **Hallazgo del cierre: el `oauth:canary` tenía un punto ciego de inventario.** Ejercitaba
   `tools/call` sobre tools puntuales y nunca `tools/list`, así que una tool que quedara fuera del
   server pasaba invisible mientras las probadas siguieran verdes — el mismo drift que el guard de
   paridad detecta, pero del lado del runtime desplegado. Se le agregó la aserción de inventario
   (`toolsTotal`/`seoToolsTotal`/`seoTools`), commit `4058a07` en `efeonce-mcp`. El charset del
   nombre incluye el punto a propósito: las tools no-SEO son punteadas
   (`hiring.talent_pool.search`) y sin él el total excluye Globe y Hiring en silencio.

2. **TASK-1777 → `complete` (2026-08-27, decisión del operador); queda VIVO su follow-up F1.**
   El veredicto `skipped_no_movement` no pudo observarse en el smoke (ambos targets eran
   `first_time`) y el operador decidió cerrar con ese criterio diferido a follow-up con fecha:
   **lunes 2026-08-31** post 07:00 CLT (`ops-seo-backlink-capture`), consulta lista en el Delta (3)
   del task file. Si aparece `drilled` sin movimiento: ISSUE + flag OFF (<5 min) + fix de
   `shouldDrillDownBacklinks`. Exposición si se ignora: ~USD 0,18 por ciclo semanal. Lifecycle,
   carpeta, README y registry sincronizados; `task:lint` 0/0.
3. **TASK-1775, TASK-1776 y TASK-1658 → `complete` (2026-08-27).** Lifecycle, carpeta, README y
   `TASK_ID_REGISTRY` sincronizados; `task:lint` 0/0 en las tres. Queda **un solo checkbox abierto en
   1775**, honestamente anotado por su autor: "un sujeto que el proveedor no conoce deja fila con
   métricas NULL" está cubierto por unit test pero no observado en runtime (ambos sujetos del smoke
   eran conocidos). Es residual declarado, no bloqueador oculto; se observa cuando entre un dominio
   sin datos. El caso análogo SÍ se observó en 1776 (`no_market_data` honesto con fila NULL en un
   subdominio). De paso se actualizó el delta de `TASK-1313`, que declaraba a 1776 como "rollout
   pendiente".

4. **Revisión Sentry del 2026-08-29** para `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (punto 1 de su
   fila en el ledger): conteos `blocked_redirect`/`blocked_private_address`.
5. **Watchdog en falso positivo (TASK-920).** Reporta DRIFT comparando contra un commit del 2026-07-30
   y su `recommended_action` propone redeployar un SHA viejo sobre workers correctos. **No obedecerlo.**
   La fuente autoritativa es `pnpm release:workers`.

## 2026-08-27 — TASK-1658: federación SEO completa en el gateway + guard bidireccional (code complete, rollout pendiente)

**La federación MCP que la tríada dejó pendiente ya está ESCRITA** (la entrada de abajo decía "la
mueve la sesión de release" — la absorbió TASK-1658): 4 commits locales en `efeonce-mcp` main
(`f1a2b44`…`093f970`, **sin push**). El drift real era 8 tools, no 3 (creció mientras la task
esperaba): las 3 originales + domain-overview/url-visibility/backlink-detail (tríada) + el par
prospect (1709). Todas federadas; `run_seo_prospect_diagnostic` = 4.º write bajo
`efeonce.mcp.seo.write` fail-closed. El guard ahora es bidireccional (espejo de las 21 + paridad de
schema + annotations, introspección runtime) y se probó ROJO contra el drift real antes de federar
(29 findings nombrando cada tool). De paso cerró 9 divergencias de schema vivas: el `intent` de
TASK-1659 en `track_seo_keywords` y el `market` ausente en 5 lecturas (una org multi-mercado era
inoperable desde el front door).

**Rollout pendiente (secuencia acordada con `greenhouse-eo-c1`):** 1) release develop→main lleva los
lanes nuevos a prod; 2) push + deploy del gateway (antes = 404 upstream, lección TASK-1661); 3)
`tools/list` sube 13→21 + canary completo contra prod (`scripts/greenhouse-seo-canary.mjs`, ya cubre
las 21 sin gastar; flag-off del prospecto = estado legítimo). Evidencia pre-deploy: entitlement prod
200 JSON con el consumer token real; los 5 lanes nuevos vivos en staging (401 `missing_token` del
envelope). Riesgo conocido: el espejo del gateway puede quedar atrás hasta que `TASK-1780` lo
reemplace por el manifiesto vivo (su caso de evidencia quedó stale — delta anotado allá).

## 2026-08-27 — La tríada SEO quedó OPERANDO: smokes live verdes, flags ON, schedulers activos

**Estado: 1775/1776/1777 con rollout ejecutado y verificado contra runtime; siguen `in-progress`
sólo por la federación MCP post-release (la mueve la sesión de release `greenhouse-eo-c1`).**
Autorización del operador en este hilo; gasto real total del rollout: **USD 0.30** (1777: 0.1818 ·
1775: 0.0242 · 1776: 0.0366 + 0.0552). Todo flip declarativo en `deploy.sh` **y** aplicado con
`--update-env-vars`, verificado en la revisión activa (`ops-worker-00603-ngj`).

**Evidencia clave (detalle por task en sus files):** re-corridas a **USD 0** en las tres (frescura/
veredicto contra proveedor real); subfolder `berel.com/productos` con **100/100 URLs bajo la ruta**;
**210 filas de mercado gratis** escritas por el tercer productor; drill-down de enlaces con hallazgo
nominal real (Berel perdió `apps.apple.com`); `berel.com` = 773 kw ranqueadas / ETV ~135k MX vs las
31 seguidas — el argumento comercial de la capa entera. Los 3 lanes canarieados verdes en staging
(binding `efeonce-mcp-gateway`) y las 3 señales en steady `ok`. Schedulers día 16 y 17 **ENABLED**;
1777 viaja en el batch semanal (próximo ciclo natural lunes 2026-08-31 — ahí se observa el
`skipped_no_movement` a USD 0 que el smoke no pudo producir por ser todo first_time).

**Coordinación:** la sesión `greenhouse-eo-c1` corre el pase develop→main (con bypass documentado de
`db_migrations`: instancia única, las 10 ya aplicadas) y post-release federa las 5 tools nuevas en
`efeonce-mcp` + flip de `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` en Vercel Production. La
evidencia de costos de este bloque es el insumo para que mueva las tasks a `complete`.

## 2026-08-27 — TASK-1652 COMPLETE: el provider AI Mode del grader deja de mentir "sin bloque AI"

**Estado: `complete` en `develop`, local-first, SIN push (commits `bc2dd0f99` + `63d01db49` +
`6b6c5d200`); la sesión de release `greenhouse-eo-c1` audita antes del pase.** Los 3 defectos de la
spec cerrados + un 4.º que solo el smoke live destapó: Google envuelve TODAS las references de
AI Mode en redirects propios (`domain: google.com`, `goto?url=<token opaco>`) — el dominio real se
deriva ahora de `source` y lo no atribuible se descarta contado en
`usage.dataforseo_citations_unattributable` (antes TODO el SoV de citabilidad se atribuía a
google.com). Dimensionamiento: **60 observaciones históricas** eran falsos negativos (54 con el
`40501` exacto de location ISO-2); **regrade DESCARTADO** — los tasks nunca se ejecutaron y
skip/failed pesan igual río abajo. Smoke real PASS (task `20000` + `succeeded`, ~USD 0,008 total).
Suite full verde (12.311); `pnpm build` prod queda al preflight del release (restricción de memoria
del equipo). AIO producción sigue OFF (TASK-1341). Herencia declarada en TASK-1311 (las `url` de
este provider son punteros al wrapper, no la página citada — su atribución URL-level debe
dimensionarlo). (Aprendizaje de sesión: las cifras `$0.xxxx` de un SKILL.md se ven corrompidas en
el RENDER de la Skill tool por sustitución posicional `$0` — verificar drift de skills en disco,
nunca desde el cuerpo renderizado.)

## 2026-08-27 — TASK-1709: el módulo SEO aprende a hablarle a quien no firmó

**Estado: code complete + runtime verificado contra proveedor real; flag OFF en todos los
environments (por diseño).** Tier `prospect` vivo en `src/lib/growth/seo/prospect/**`: corrida ÚNICA
inline en Vercel con tope duro POR DIAGNÓSTICO (min(USD 1,00, restante mensual de Efeonce), validado
contra el forecast del CONJUNTO antes de la primera llamada), gasto de adquisición atribuido a
`EO-ORG-0007` en el ledger único, hechos con lente `estimated`+`captured_at` (CHECK de un solo
valor), cero score/veredicto, evidencia de sitio delegada al sustrato, contrato en las 3 lanes
(app + ecosystem `internal`-only + MCP `get/run_seo_prospect_diagnostic`) y capabilities con grant
mismo PR. **Sanity live 10/10** (`scripts/growth/_sanity-task-1709-prospect-diagnostic.ts --spend`):
corrida real skyairline.com CL — forecast USD 0,205 vs real 0,1991, ledger Δ exacto, idempotencia
USD 0, `cost_blocked` con cero llamadas. El gate TASK-893 destapó en vivo que `seo_site_audit_runs`
no tiene `organization_id` (primera corrida falló failed-closed, liberó el slot, fix + reintento
verde). Hallazgos reales para la licitación SKY: 769 kw top-10, 231 citas AI Overview, 0 JSON-LD,
0 sitemap.

**Pendiente de rollout (no bloquea el cierre de código):** flag `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED`
ON sólo con decisión del operador (staging para uso interno; Production exige sign-off comercial —
fila en el ledger de flags). La cara visible sigue siendo `TASK-1672`/`1673` tras `TASK-1670`.
`TASK-1662` consumirá el colector de competidores que esta task estrenó (delta declarado).

## 2026-08-27 — Gemini Omni 1.1 investigado; migración P0 definida, sin rollout

**Estado: investigación y contrato documental completos; runtime no modificado.** Google lanzó Gemini Omni 1.1
Flash con dos superficies no intercambiables: Developer API usa `gemini-omni-1.1-flash` y Google Cloud usa
`gemini-omni-1.1-flash-preview`. El modelo anterior `gemini-omni-flash-preview` tiene shutdown anunciado para
el 2026-09-30 en Gemini API. La evidencia oficial, sus contradicciones y límites quedaron en
`docs/audits/creative-studio/GEMINI_OMNI_1_1_PROVIDER_RESEARCH_2026-08-27.md`; la candidatura machine-readable,
en `GEMINI_OMNI_1_1_VIDEO_ROUTE_CARD_V1.json`; las skills de model fleet y motion quedaron espejadas.

**Siguiente unidad ejecutable:** `TASK-1781` (P0, `to-do`) debe entregar primero paridad 720p de la ruta
vigente y luego separar referencias, first/last frame, edición, extensión y output shapes. No hereda canary,
rate, terms, rights ni promotion del modelo anterior. Exige cuota y endpoint live, costo medido, C2PA en bytes,
canary facturable desde Producer, readback y rollback. Hasta entonces Omni 1.1 permanece `gated`: no hubo spend,
deploy, cambio de binding, generación live ni lectura que pruebe disponibilidad en Globe.

## 2026-08-27 — TASK-1777: el detalle de enlaces quedó code complete, rollout pendiente

**Estado (delta posterior mismo día): `complete` por decisión del operador — rollout ejecutado con el release `cc73c74789ce`; sólo sobrevive el follow-up F1 (pendiente 2 arriba).** Entrada original:
Cierra la tercera capacidad de la tríada anti-Semrush: el detalle NOMINAL detrás del snapshot
semanal de enlaces. Tres tablas hijas del snapshot (jamás del target): `seo_backlink_drilldowns`
(el VEREDICTO — decisión de ejecución: sin persistirlo no se distingue "no pasó nada" de "no
sabemos qué pasó" ni se ancla el a-lo-sumo-una-vez), `seo_backlink_referring_domains` (movement
`present|new|lost` con muestra accionable) y `seo_backlink_anchors`. El corazón es la CONDICIÓN DE
DISPARO (`shouldDrillDownBacklinks`, predicado puro testeado antes que el código que gasta): el
drill-down corre como paso post-batch del cron semanal EXISTENTE (sin scheduler nuevo), sólo donde
el `new_lost_delta` ya persistido muestra movimiento; `partial` no dispara jamás. Sobre-optimización
de anchors como métrica nueva separada de `toxic_share` (no se toca); reader de TRES estados;
shape de `readBacklinkProfile` inmutable (test de regresión). 40 tests del paquete + señal
`seo.backlink.detail_drilldown_failed` + sanity SQL vivo con transacción + ROLLBACK (cero residuo
en la serie real; el CHECK de movement rechazó un cuarto valor en vivo).

**Checkpoint del operador (gasta):** flag `GROWTH_SEO_BACKLINK_DETAIL_ENABLED` ON (sólo
ops-worker) + smoke con un target CON movimiento y otro SIN (USD 0 verificado en ledger) + canary
MCP + confirmar umbrales (`…MIN_BACKLINK_MOVEMENT=10` / `…MIN_REFDOMAIN_MOVEMENT=3` /
`…ROW_LIMIT=100`). Runbook: `docs/manual-de-uso/growth/operar-perfil-de-enlaces-seo.md`.

**No re-descubrir:** el gate bloqueado NO escribe veredicto (re-evaluable al renovarse el mes);
`new` manda sobre `present` y `lost` sólo si el dominio ya no está (el delta cuenta backlinks, no
dominios); sin backfill histórico por diseño (la ventana del proveedor ya pasó). `TASK-1314` ya
tiene el "qué enlaza a la pillar" (delta escrito en su spec).

## 2026-08-27 — TASK-1776: la visibilidad por página quedó code complete, rollout pendiente

**Estado: `code complete, rollout pendiente`; sin push.** Misma sesión que TASK-1775, mismo patrón:
`seo_url_visibility_snapshots` (multi-productor, clave con `subject_kind` CHECK cerrado y SIN org;
migración aplicada que ADEMÁS expandió el CHECK de `seo_keyword_market_data.source_endpoint` con
`ranked_keywords`), resolver de sujeto DECLARADO (`resolveVisibilitySubject` — jamás inferir la
clase), captura `captureUrlVisibility` (la foto sale del agregado `metrics` del proveedor, el
`limit`/knob sólo acota el detalle `top_keywords`), colectores on-demand `relevant_pages`/`subdomains`,
**tercer productor del mercado** (el `keyword_info` inline se escribe con el writer compartido a
costo 0, filtrado por frescura), reader + lane ecosystem `/growth/seo/url-visibility` (modos subject
y concentration) + tool MCP `get_seo_url_visibility`, señal `seo.url_visibility.stale_subjects`.
37 tests del paquete + sanity SQL vivo contra PG (6 frentes) verdes.

**Checkpoint del operador (gasta):** smoke live con los cuatro `subject_kind` (verificando que un
`subfolder` devuelve sólo URLs bajo su ruta y que el enriquecimiento NO sube el `cost`), flag
`GROWTH_SEO_URL_VISIBILITY_ENABLED` ON (sólo ops-worker) + despausar `ops-seo-url-visibility`
(día 17), canary MCP staging + federación `efeonce-mcp`, y confirmar el `limit` default (100).
Runbook: `docs/manual-de-uso/growth/operar-visibilidad-por-url-seo.md`.

**No re-descubrir:** una URL como `target` del proveedor va CON esquema (sin él devuelve el dominio
entero y lo cobra — gotcha 10 nuevo en la reference de Labs); la subcarpeta es host + filtro
server-side `relative_url` (gratis, confirmado contra la doc); `page_intersection` quedó fuera por
diseño (follow-up de TASK-1314). `TASK-1313` ya tiene su lado ◑ (delta escrito en su spec).

## 2026-08-27 — TASK-1775: la foto de dominio quedó code complete, rollout pendiente

**Estado: `code complete, rollout pendiente`; sin push.** Los 6 slices implementados sobre `develop`:
tabla multi-productor `seo_domain_overview_snapshots` (clave sin org, append-only, migración aplicada
y verificada por `information_schema`), colector mensual `captureDomainOverview` (target +
competidores, frescura filtrada por `source_endpoint`, NULL-row para sujeto desconocido), backfill
histórico resumible con tope duro USD (default 5, runner `--dry-run`/`--apply`), screening
`estimateDomainTraffic`, reader `readDomainOverview` + lane ecosystem + tool MCP
`get_seo_domain_overview`, y señal `seo.domain_overview.stale_subjects`. 49 tests focales verdes +
sanity SQL contra PG real (gate TASK-893) verde.

**Lo que falta para operarlo (checkpoint del operador — GASTA dinero real):** (1) smoke live contra
DataForSEO con UN sujeto comparando `cost` vs estimado + re-corrida a USD 0; (2) flag
`GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED` ON multi-runtime (deploy.sh + `--update-env-vars`, **sólo
ops-worker**) + despausar `ops-seo-domain-overview` (nace PAUSADO, día 16); (3) canary de la tool MCP
en staging + federación en `efeonce-mcp`; (4) confirmar el tope USD del primer `--apply` del backfill.
Runbook completo: `docs/manual-de-uso/growth/operar-foto-de-dominio-seo.md`.

**No re-descubrir:** el lane app NO se crea (el dominio es ecosystem-only, 14 readers precedentes);
`etv` es tráfico estimado, NO dólares (la spec lo rotulaba mal — corregido en el DTO); la autoridad
canónica de superficie sigue siendo `seo_backlink_snapshots.domain_rank` porque `domain_rank_overview`
no devuelve authority score (desambiguación registrada en arch §4.2). Convivencia con la sesión
paralela de TASK-1709: deltas de archivos compartidos viajaron cruzados y declarados en los commits
de ambas.

## 2026-08-27 — TASK-1697 cerrada: el sustrato de sitio tiene dueño, carta y detector

**Estado: `complete`; gates verdes (12.144 tests full + build de producción + lint con la rule activa + worker gates).** `src/lib/growth/site-substrate/` nace por `git mv` con diff puro (site-fetch/html/robots-policy/read-body + contratos `Site*` + barrel); shims en `probes/` = cero dependientes de producción modificados. Lint rule `greenhouse/growth-substrate-boundary` en `error` desde commit-1, cero exenciones: `probes/**` privado del dominio AEO, el sustrato no importa `growth/*`. Desviaciones registradas en el task file (read-body viaja al sustrato; el flag del fetcher vive en `site-fetch.ts` re-exportado por `flags.ts`; el meta-test anti-divergencia sigue al archivo movido).

**Desbloqueadas:** `TASK-1670` (site probes en el audit SEO), `TASK-1709` (diagnóstico de prospecto — su Slice 2b ya tiene de dónde consumir) y `TASK-1701`; `TASK-1713` (mitad B: rule universal + barrel AEO) sigue tras `TASK-1695`. **Post-push:** vigilar `growth.ai_visibility.probe_failure_rate` en steady (el refactor es shim-idéntico; el canario confirma). Follow-up declarado: retirar los shims reescribiendo los 7 consumers al barrel, tras una release asentada.

## 2026-08-27 — Las tres capacidades de mercado que faltaban en SV360, y de dónde salió ISSUE-164

**Estado: cuatro tasks creadas, `to-do`; sin runtime.** `TASK-1775` (foto de dominio + trayectoria:
`domain_rank_overview` mensual · `historical_rank_overview` como backfill único porque cuesta 10× ·
`bulk_traffic_estimation`), `TASK-1776` (visibilidad por URL/subdominio/subcarpeta: **una** capacidad
con resolver de sujeto, no tres módulos — lo que Semrush vende como tres áreas es un endpoint con el
`target` cambiado) y `TASK-1777` (detalle nominal de enlaces, con el drill-down condicionado al
`new_lost_delta` que lleva meses persistido sin un solo lector). Ninguna amplía el allowlist de
familias DataForSEO: los diez endpoints son `labs` y `backlinks`. `TASK-1776` nace como **tercer
productor** de `seo_keyword_market_data` — el `keyword_info` viene inline y ya pagado en
`ranked_keywords`.

**El origen de `ISSUE-164`.** El barrido salió de preguntar si podíamos dejar de pagar Semrush. Al
habilitar la evidencia de sitio sobre prospectos (`Delta 2026-08-26` de `TASK-1709`: la prohibición
de fetch propio era por SSRF, no por política, y se reemplazó por delegación), la auditoría del
fetcher destapó cuatro defectos y dos eran de seguridad. La premisa inicial del issue —"staging ON,
prod OFF, no es incidente vivo"— **era falsa**: salió de leer el `FEATURE_FLAG_STATE_LEDGER`, cuyo
snapshot se generaba con `vercel env ls`, estructuralmente ciego a los flags del ops-worker. La
corrigió `greenhouse-eo-a4`; su propia corrección conservaba una segunda afirmación falsa (que el
target era el dominio de un cliente cargado por un operador) y se cerró con la cadena verificada del
intake público anónimo. **Lección portátil: medir el interruptor no es medir el alcance.**

**Decisiones de oficio tomadas y registradas en `TASK-1778`:** se obedece `robots.txt` matcheando
**nuestro** token con fallback a `*`, jamás los grupos de los bots auditados — matchearnos contra
ellos nos dejaría fuera justo de los sitios cuyo bloqueo es el hallazgo más valioso. Y `TASK-1281`
**no** sube de prioridad: Chromium reduce la frecuencia del falso negativo, no su clase; el defecto
es que `res.ok` se lee como *"observé la página"* cuando sólo significa *"recibí bytes"*, y ese
invariante se absorbió en `TASK-1778`.

**Pendiente:** decisión del operador sobre la mitigación interina mientras el fix de `TASK-1778` no
esté en producción con su flag ON.

## 2026-08-27 — TASK-1778 cerrada: el fetcher de probes quedó defendible Y desplegado

**Estado: `complete`; ISSUE-164 `resolved`.** Cutover aplicado el mismo día del merge: `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED=true` en el ops-worker (revisión `ops-worker-00598-459`, 100% — worker ÚNICO staging+prod, o sea la cadena viva del intake público) + declarativo en `deploy.sh` + Vercel `staging`. La regla de saltos se extendió a subdominios DESCENDIENTES del sujeto con evidencia de cartera (`www.bancochile.cl → sitiospublicos.bancochile.cl`); cross-registrable (`berel.com.mx → berel.com`) sigue bloqueado, sin PSL. Verificación: 7 dominios vivos en strict (6 ok; bancochile ya fallaba con la red vieja — Imperva, caso `TASK-1281`) + corrida real `EO-GRUN-00048` (SKY, full, 5 motores) verde: 13 probes, cero `blocked_*` falsos, apex→www seguido y medido.

**Residuales con dueño y fecha (ledger § Pendientes):** (1) revisión Sentry 2026-08-29 de `blocked_redirect`/`blocked_private_address` (48 h; volumen alto = guarda estricta, rollback <5 min con flag a false en deploy.sh + `--update-env-vars`); (2) env var en Vercel **Production** SOLO con el release que lleve el código a `main` (ISSUE-150) — hasta entonces el path inline prod (admin `light`) conserva la red vieja; el path público async ya está contenido. La mitigación interina que se le propuso al operador (apagar `PROBES`) quedó obsoleta: el fix real está vivo.

## 2026-08-27 — TASK-1696 adopta la señal de presupuesto que faltaba

**Estado: spec sincronizada; implementación pendiente.** La task ahora incluye `seo.provider.cost_over_budget`: nueve tasks la citaban como mitigación, pero el barrido verificó que no existe en código. Entra junto a la dimensión `consumer` para no sub-reportar el gasto del grader; README y registry ya reflejan las tres señales.
