# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

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

**Estado: `code complete, rollout pendiente`; commits en develop, push a decisión del operador.**
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

## 2026-08-27 — Tres skills Salesforce cubren operación y venta consultiva

**Estado: `complete` local; sin runtime ni push.** Quedaron creadas y espejadas las skills de Salesforce CRM, Marketing Cloud Engagement y Marketing Cloud Next, con modos `operate`, `sell` y coexistencia donde aplica. El catálogo vive en [`docs/services/salesforce/README.md`](docs/services/salesforce/README.md) y el fundamento en [`SALESFORCE_PRACTICE_SKILL_FOUNDATION_2026-08-27.md`](docs/audits/commercial/SALESFORCE_PRACTICE_SKILL_FOUNDATION_2026-08-27.md).

**Límite comercial vivo:** la aceptación histórica como Provisional Consulting Partner no prueba el estado actual, tier, certificaciones, SPPA ni Cloud Reseller. Antes de claims, cotización oficial, co-sell o reventa, hacer readback primario en Partner Community/contrato vigente. Ninguna skill autoriza mutaciones por inferencia.

## 2026-08-27 — RevOps & CRM adopta posicionamiento provider-fit

**Estado: `complete`; sin runtime ni push.** Efeonce vende **Revenue Operations & CRM**, con diagnóstico HubSpot-first, Salesforce-first o híbrido. Gartner se separa por mercado; los casos chilenos de Salesforce prueban presencia, no market share.

**Pendiente:** las relaciones de partner declaradas por el CEO requieren readback primario antes de claims externos. Antes de mover inversión o certificaciones, medir 24 meses de pipeline, win/loss, margen, demanda y capacidad. Audit: [`CRM_PLATFORM_POSITIONING_GARTNER_CHILE_2026-08-27.md`](docs/audits/commercial/CRM_PLATFORM_POSITIONING_GARTNER_CHILE_2026-08-27.md).

## 2026-08-27 — Gobernanza de contexto: dos fallos históricos reconciliados localmente

**Estado: `complete` local; sin push.** Los runs fallidos se reprodujeron por SHA y no compartían causa: `CLAUDE.md governance` de `72c18c4` (run `32989156138`) tenía 2 líneas históricas huérfanas; `Agent Context Governance` de `c0af0da` (run `32989424731`) rechazaba `project_context.md` con ~20.418/12.000 tokens.

**Qué ya resolvía `HEAD`:** `c8ab1a68e` dejó `project_context.md` en ~11.852/12.000 tokens; el context gate actual quedó en 0 errores/0 warnings. **Fix mínimo de esta pasada:** `scripts/ci/claude-md-content-allowlist.txt` reconoce el retiro legítimo de las dos líneas de TeamBot detectadas por el audit. No se restauró el falso contrato `@todos`: `7ce2bd691` ya lo reemplazó en arquitectura, invariante Ops, runbook y skills espejadas; la otra línea conserva su intención en el helper `pnpm teams:announce`.

**Evidencia local:** `pnpm claude-md check` 0 huérfanos; `pnpm docs:closure-check`; `pnpm qa:gates --changed --agent codex --docs`; `pnpm docs:context-check:strict`; `git diff --check`. No se tocó runtime, no se creó ADR y no se reejecutaron workflows remotos porque no hubo push.

## 2026-08-26 — Berel: noviembre y diciembre quedan producidos y atomizados

**Estado vivo observado:** [`Noviembre 26`](https://app.notion.com/p/3c839c2fefe78166b1ccef16538c46c6) contiene N43–N47 y 45 tareas; [`Diciembre 26`](https://app.notion.com/p/3c839c2fefe78160992fd31d5b96feb0), N48–N50 y 27 tareas. En conjunto: 8 reescrituras, 32 banners, 32 derivados y 32 subítems sociales.

**QA de Notion:** cuatro derivados por artículo; tareas sociales `Sin empezar`, subítems `En curso`; fechas sociales 15 de noviembre y 13 de diciembre. Se compararon los 32 pares tarea/subítem y los 32 conservaron igualdad exacta de cuerpo, además de proyecto, tarea principal y relaciones inversas.

**Drift vivo de calendario:** la relectura posterior devolvió las 40 tareas preexistentes de artículo/banner —25 de noviembre y 15 de diciembre— en `Listo para diseñar` con fecha `2026-09-11`. Contradice los meses del proyecto. No se corrigió porque esta pasada solo autoriza repo/docs; Operaciones de contenido debe confirmar la fecha y, si corresponde, restaurarla por la vía canónica con lectura posterior.

**Gates abiertos del cliente:** N48 es archivo de 2024 y requiere vigencia/derechos; N49 requiere revisión institucional y no admite CTA comercial; N50 espera confirmar consolidación y canónica. No se produjo arte, no se publicó en CMS y no se programaron redes. Evidencia: [`auditoría fechada`](docs/audits/seo/BEREL_NOVEMBER_DECEMBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-26 — TASK-1773: el eje de desenlace gana carril gobernado

**Estado: `code complete, rollout pendiente`.** Sin push. `pnpm test` 12.098 verdes, `build` exit 0, `local:check` exit 0, `task:lint` 0/0.

**Lo que falta para operarlo:** `NEXA_HIRING_ACTIONS_ENABLED` nace OFF (prenderlo exige sign-off: bajo el AI Act la selección es alto riesgo con supervisión obligatoria) y falta ejercitar el loop contra staging con la persona agente de menor privilegio. La escritura por MCP queda **diferida con razón**: su registro vive en el repo hermano `efeonce-mcp` y `efeonce.mcp.hiring.write` está bloqueado hasta `TASK-1631`.

**No re-descubrir:** la spec pedía copiar el patrón del Banco de Talento y **no calza** —no hay tabla de propuestas de decisión y `Migration: none`—, por eso el guard es un digest efímero. Y Nexa tiene autoridad más angosta que el portal a propósito: sólo cierra una postulación abierta, porque su contrato de acciones no puede cargar la huella del preview al execute.

**Lo que queda visible y con nombre:** el manifiesto de parity declara **18 capabilities `hiring.*` sin carril**. Es el barrido que la propia task pedía en sus Follow-ups.

## 2026-08-26 — TASK-1751: la rendición del assessment deja de perder respuestas

**Estado: `complete`.** Sin push. `pnpm test` completo verde (12.062), `local:check` exit 0, los cuatro gates de UI en PASS, scorecard 4.54.

**Lo que dejó la captura premium, y es el argumento a favor de correrla:** cuatro defectos que ningún test veía — contraste AA pre-existente de 2.43:1 en el contador, el placeholder haciendo de **nombre accesible** del textarea (anti-patrón de años), un ícono de «enviar» sobre un mensaje de «no puedes enviar», y la superficie sin declarar su recipe. Un quinto hallazgo era del gate, no del código: el stepper ya vive en un scroller contenido, así que se declaró la excepción en vez de romper el patrón. Seed ejecutado y limpiado, residuo verificado en cero.

**No re-descubrir:** de los 4 defectos declarados **2 no existían** (el reloj ya era `sticky`; los avisos nunca fueron sólo `srOnly`), y la copy que el wireframe proponía —«puedes enviar lo que alcanzaste a guardar»— es **falsa**: el servidor exige la evaluación completa, así que con faltantes enviar es imposible y el CTA no se renderiza. Detalle en el `## Delta 2026-08-26` de la spec.

**Riesgo residual:** el guardado preventivo nunca se ejercitó contra runtime real; su respaldo son tests unitarios más el test del borde `answer_deadline − ε` que esta task agregó porque no existía.

## 2026-08-26 — Hiring: auditoría de estado real y corrección de la contabilidad documental

**Sólo documentación; runtime intacto.** Detalle completo, método y hechos verificados: [`auditoría fechada`](docs/audits/hiring/GREENHOUSE_HIRING_DOMAIN_STATE_AUDIT_2026-08-26.md).

**El error que hay que no repetir.** `main` promueve por **squash**, así que los SHAs de `develop` no quedan como ancestros aunque el contenido esté desplegado. Leer `rev-list --count origin/main..origin/develop` como «trabajo sin desplegar» produjo un diagnóstico falso. Para saber si algo está en producción, comparar **blobs por ruta**, no contar commits. Último release: `709e15f66` (2026-08-23).

**Estado real:** las 7 tasks `in-progress` no tienen código pendiente salvo dos fixes puntuales; lo que falta es evidencia y verificación. `TASK-1771` está en producción y sólo debe su verification sequence; `TASK-1719` sólo la evidencia del monitor de 7 días (ventana ya transcurrida); `TASK-1757`, una sola rotación real.

**Corregido:** `.claude/rules/hiring.md` (auto-load, afirmaba en presente un `CHECK` aplicado el 08-23), el ledger de flags, ocho entradas de `docs/tasks/README.md`, seis `Status real`, la paridad de `Child Tasks` de `EPIC-011` y el alcance de `TASK-1751`, que perdió la mitad de su premisa.

**Pendiente con dueño, por retorno:** (1) `TASK-1746` — `purge_assessment_access_recovery` con **cero callers**: la retención de 12 meses no se ejecuta; único hallazgo con filo legal. (2) `TASK-1718` — el fix H-10 sigue sin escribirse. (3) `TASK-1742` — re-verificar el canary tras los fixes del 08-19. (4) `HIRING_VACANCY_AI_ENABLED` — ON en Production hace 41 días **sin** el smoke de staging que era su precondición: decidir si se corre o se declara superado. (5) `TASK-1747` — re-auditar sus 8 hallazgos «abiertos»; es triage, no código.

**Verificación.** `pnpm ops:lint --changed`: 6 tasks `errors=0 warnings=0`, warning de paridad de `EPIC-011` cerrado. `pnpm task:lint --task TASK-1751` verde. Sin gate de runtime: el cambio no toca runtime.

## 2026-08-26 — Berel: producción creativa de octubre creada y auditada en Notion

**Estado vivo:** [`Produccion Creativa - Octubre 26`](https://app.notion.com/p/3c839c2fefe7813c9450e2f35cb4021e) está `En curso`: 8 artículos N35–N42, 32 banners, 32 derivados y 32 subítems sociales. Fechas: 7, 14 y 16 de octubre, respectivamente.

**Evidencia y siguiente paso:** producción editorial N35–N42 completa para revisión. La lectura final corrigió 54 fechas y validó las 18 filas nuevas más la paridad de 8 tareas/subítems. N41–N42 aún son soft-404: bloquear enlaces, CMS y redes hasta QA. Detalle: [`auditoría fechada`](docs/audits/seo/BEREL_OCTOBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-25 — Vacaciones contractor por aniversario y mensajes TeamBot 1:1

**Sólo documentación y skills en esta pasada; no se cambió runtime.** Se documentó el caso acotado de Melkin Hernandez (`hire_date=2025-07-15`) y Andrés Carlosama (`hire_date=2025-11-11`), ambos `contractor` + `international` + `deel`. Sus perfiles muestran 15 días disponibles, 0 usados y 0 reservados. Nexa ya les comunicó individualmente que los 15 días se vinculan al primer aniversario, con Daniela como supervisora inmediata y al menos cinco días hábiles de anticipación.

**Drift abierto:** el runtime entrega hoy 15 días fijos incluso a Andrés antes del aniversario; la carta global de beneficios describe 15 días anuales prorrateados y progresión por antigüedad; la comunicación aprobada del caso usa el primer aniversario. No se generalizó ninguna de las tres como política nueva. Auditoría: `docs/audits/payroll/CONTRACTOR_VACATION_ANNIVERSARY_AUDIT_2026-08-25.md`.

**TeamBot:** `pnpm teams:announce` sigue siendo group/channel-only y el CLI 1:1 existente es exclusivo de pagos. Para un one-off genérico aprobado, las skills y el runbook admiten únicamente un puente temporal sobre el dispatcher/audit writers canónicos, con Entra revalidado, card-only, preview/confirmación, idempotencia, deduplicación y `source_sync_runs`. `succeeded` no es read receipt. Los mensajes recurrentes convergen a Notification Hub `dynamic_user`.

**Pendiente con dueño:** People + Payroll + Legal deben decidir la política contractual de vacaciones para contractors Deel; después corresponde corregir precedencia/cálculo, reconciliar saldos y alinear carta, acuerdos y copy. No se abrió ADR porque aún no hay decisión aceptada.
