# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-08-27 — Gateway MCP desplegado y cierre de la tríada SEO (TASK-1658/1775/1776)

- Federación en producción: revisión `efeonce-mcp-gateway-00023-zt2`, `tools/list` autenticado observado en **21 tools SEO** (antes 13), con las 8 recién federadas presentes. Canary del provider verde contra producción para Efeonce y Berel.
- **El `oauth:canary` tenía un punto ciego de inventario y se cerró**: ejercitaba `tools/call` sobre tools puntuales y nunca `tools/list`, así que una tool que quedara fuera del server pasaba invisible mientras las probadas siguieran verdes. Ahora asserta el inventario (`efeonce-mcp` commit `4058a07`). El charset del nombre incluye el punto a propósito — las tools no-SEO son punteadas (`hiring.talent_pool.search`) y sin él el total excluía Globe y Hiring en silencio, reportando el conteo SEO como si fuera el total.
- `TASK-1658`, `TASK-1775` y `TASK-1776` pasan a `complete` con `task:lint` 0/0. Queda un residual declarado en 1775 (sujeto desconocido → fila NULL: cubierto por unit test, no observado en runtime) y la verificación del lunes 2026-08-31 para `TASK-1777`.

## 2026-08-27 — Release a producción del carril Growth SEO (TASK-1652/1658/1709/1775/1776/1777)

- Promovido `develop`→`main` como **un solo release**: PR #207, 632 archivos, 10 migraciones, target `cc73c74789ce`, release_id `cc73c74789ce-dbce65f2-303b-4528-bef3-f4edd022a880`, orquestador `33123977671`, manifest **`released`** en 9 min 40 s sin retry ni gate colgado. Llegan a producción los lanes ecosystem de la tríada SEO, el lane de diagnóstico de prospecto, la corrección del request AI Mode del grader y la federación MCP; más el cierre de hiring que quedaba en develop.
- **Flags prendidos con el release** (ambos requerían que su lector estuviera en `main`, regla ISSUE-150 — verificado x0 antes y x1/x2/x3 después): `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` (Vercel, sign-off comercial del operador) y `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (Vercel Production; en ops-worker ya estaba ON). Redeploy `greenhouse-if2u2c8ys` porque Vercel congela env vars al build; `pnpm flags:audit --strict` cierra en 0/0.
- **Los 3 gotchas del squash-merge se pre-emptaron, no se sufrieron**: merge canónico `-s ours` con ambas verificaciones vacías; el push a develop se bundleó con una edición del `FEATURE_FLAG_STATE_LEDGER` (está en `deployControlDocs` y fuerza el build de staging, evitando el `vercel_readiness` en exit 1); el Playwright smoke sobre `main` se produjo en 3 min en vez de taparlo con bypass. El `bypass_preflight_reason` quedó reservado para `db_migrations`, único dominio irreversible real, con razón auditable (migraciones ya aplicadas en la instancia única Cloud SQL).
- ⚠️ **El watchdog post-release recomendó una regresión.** Reportó DRIFT en 3 workers comparando contra `gh=6f7e246ea888` (commit del 2026-07-30, ancestro del target) y propuso redeployar `hubspot-greenhouse-integration` con ese `expected_sha` — pisar código correcto con código de un mes atrás. No se ejecutó: `pnpm release:workers` (lee Cloud Run, fuente autoritativa) mostró 3/4 workers exactamente en el target y el `ops-worker` en change-gate legítimo, verificado con las **28 rutas reales** leídas del workflow y diff vacío. Es la clase de falso positivo abierta hasta TASK-920.

## 2026-08-27 — El provider Google AI Mode del AEO grader deja de mentir "sin bloque AI" (TASK-1652)

- Los runs productivos del grader (market ISO-2) fallaban per-task en DataForSEO por `location_name` inválido y el fallo se clasificaba `skipped:no_ai_overview_block` — 60 observaciones históricas eran ese falso negativo (54 con el error exacto `40501`). Fix: mapa cerrado market→`location_code` verificado en vivo (CL=2152, MX=2484, CO=2170, PE=2604, US=2840) + gate per-task por `status_code` (el skip honesto queda reservado para tasks `20000` realmente ejecutadas). Regrade descartado con evidencia: los tasks fallidos nunca se ejecutaron y río abajo skip/failed pesan igual.
- El parser ahora desciende a las `references[]` anidadas de los `ai_overview_element` (dedupe por URL), y el smoke live destapó que Google envuelve TODA reference en redirects propios (`domain: google.com` + `goto?url=<token>`): la atribución ahora deriva el dominio real desde `source` cuando es domain-shaped y descarta honesto (contado en `usage.dataforseo_citations_unattributable`) lo no atribuible — antes todo el SoV de citabilidad se atribuía a google.com. Herencia declarada en `TASK-1311`. AIO producción sigue OFF (TASK-1341).

## 2026-08-27 — El módulo SEO gana el tier `prospect`: diagnóstico sin contrato y sin acceso del cliente (TASK-1709)

- Nuevo carril de adquisición `src/lib/growth/seo/prospect/**`: una corrida ÚNICA por dominio con tope duro POR DIAGNÓSTICO (min(USD 1,00, restante mensual de Efeonce), validado contra el forecast del conjunto ANTES de la primera llamada), idempotencia por dominio/mercado/día (repetir = USD 0), y gasto de adquisición atribuido a `EO-ORG-0007` en el ledger único. Estrena 4 endpoints de familias ya permitidas (`ranked_keywords` +`ai_overview_reference`, `competitors_domain`, `backlinks/competitors`, `domain_intersection`) — el colector de competidores que `TASK-1662` consumirá.
- Todo hecho nace con lente `estimated` + `captured_at` (CHECK de un solo valor) y el contrato de salida no tiene score/veredicto/benchmark/lift; la evidencia de sitio se delega al sustrato (`site-substrate`, USD 0) y un bloqueo del sitio es un hallazgo, no un obstáculo. Cero captura recurrente sobre prospectos (sin cron/scheduler; test fuente + DO guard).
- Full API Parity mismo PR: lane app + lane ecosystem (`internal`-only) + MCP `get/run_seo_prospect_diagnostic`; capabilities `growth.seo.prospect_diagnostic.{run,read}` seedeadas + granteadas; señal `growth.seo.prospect_diagnostic.cost_overrun` (steady 0); evento `growth.seo.prospect_diagnostic.completed`.
- Corrida real verificada (skyairline.com CL): forecast USD 0,205 vs real 0,1991, ledger Δ exacto, idempotencia USD 0, cost_blocked con cero llamadas. Flag `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` default OFF (Vercel V1); ON sólo con decisión del operador.

## 2026-08-27 — Gemini Omni 1.1 entra al gobierno de la flota, no al runtime

- Investigación oficial de Gemini Omni 1.1 Flash: se separan Developer API (`gemini-omni-1.1-flash`, modelo listado Stable) y Google Cloud (`gemini-omni-1.1-flash-preview`, Pre-GA), ambas sobre Interactions `v1beta`; se documentan capacidades, precios, cuotas, residencia, retención, C2PA, restricciones regionales y contradicciones del proveedor.
- `TASK-1781` queda creada como P0 para migrar antes del shutdown anunciado de `gemini-omni-flash-preview` el 2026-09-30 y expandir capacidades por rutas/output shapes independientes, sin heredar evidencia del modelo anterior.
- Nueva route card candidata y actualización espejada de `greenhouse-globe-model-fleet` y las referencias Omni de `motion-design-studio`. Sin cambio de binding, deploy, gasto, canary ni promoción: 1.1 sigue `gated` hasta readback live.

## 2026-08-27 — El perfil de enlaces gana nombres propios, con el gasto condicionado al movimiento

- `TASK-1777` (code complete, rollout pendiente): el snapshot semanal de enlaces decía "perdiste 12 dominios" sin decir CUÁLES. Nacen las tablas hijas del snapshot con el detalle accionable: qué dominio enlazó/se cayó (con muestra del enlace y anchor — suficiente para el correo de recuperación) y el perfil de anchors con una lectura de **sobre-optimización** nueva y separada de `toxic_share` (miden cosas distintas; ninguna reemplaza a la otra).
- El corazón no es el endpoint sino la **condición de disparo**: el drill-down corre como paso del cron semanal existente (sin scheduler nuevo) y SOLO donde el `new_lost_delta` ya persistido muestra movimiento — un target estable registra su veredicto a USD 0, y ese veredicto persistido (`seo_backlink_drilldowns`) es lo que permite al reader distinguir "el perfil estuvo estable" (hallazgo positivo) de "no sabemos qué pasó" (drill-down fallido, señal en rojo).
- `rank` siempre en escala 0-100; el movimiento nominal se pide sólo en la dirección que el delta indica; el shape de `readBacklinkProfile` queda intacto (test de regresión). Lane ecosystem `/growth/seo/backlink-detail` + tool MCP `get_seo_backlink_detail` + señal `seo.backlink.detail_drilldown_failed`.
- Flag `GROWTH_SEO_BACKLINK_DETAIL_ENABLED` nace OFF (sólo ops-worker); el encendido es checkpoint del operador. Runbook `docs/manual-de-uso/growth/operar-perfil-de-enlaces-seo.md`. Con esto, las tres capacidades por las que hoy se paga Semrush (dominio · página · enlaces) quedan code-complete en Greenhouse.

## 2026-08-27 — El módulo SEO aprende a hablar de páginas, no sólo de dominios

- `TASK-1776` (code complete, rollout pendiente): nace `greenhouse_growth.seo_url_visibility_snapshots` — qué ranquea una URL, subcarpeta o subdominio de CUALQUIER dominio, y qué páginas/subdominios concentran su tráfico. La tríada que Semrush vende como tres reportes es acá UNA capacidad con resolver de sujeto **declarado** (la clase jamás se infiere).
- La foto sale del agregado del proveedor (set completo); el `limit` (knob, default 100) sólo acota el detalle comprado y es la palanca de costo. Gotchas verificados contra la doc: URL como target va CON esquema (sin él el proveedor devuelve y cobra el dominio entero); subcarpeta = host + filtro server-side gratis.
- **Tercer productor del mercado compartido**: el `keyword_info` que viene ya pagado en cada fila se deposita en `seo_keyword_market_data` vía el writer canónico con costo 0 (la migración expandió su CHECK) — una corrida sobre un cliente deja fresco mercado para toda la cartera.
- Cron `ops-seo-url-visibility` (día 17) **nace pausado** con flag `GROWTH_SEO_URL_VISIBILITY_ENABLED` OFF (sólo ops-worker); reader + lane ecosystem + tool MCP `get_seo_url_visibility`; señal `seo.url_visibility.stale_subjects`. El encendido queda como checkpoint del operador; runbook `docs/manual-de-uso/growth/operar-visibilidad-por-url-seo.md`.

## 2026-08-27 — El módulo SEO aprende a describir un dominio completo

- `TASK-1775` (code complete, rollout pendiente): nace `greenhouse_growth.seo_domain_overview_snapshots` — la foto de dominio (keywords ranqueadas totales, tráfico estimado, distribución top-100, momentum) del target Y de sus competidores, con trayectoria mensual desde 2020-10. Multi-productor con clave sin organización (patrón `seo_keyword_market_data`): lo que pagó una org sirve a toda la cartera.
- Tres colectores sobre el mismo writer: la foto mensual (`domain_rank_overview`, cron `ops-seo-domain-overview` día 16 — **nace pausado**, flag `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED` default OFF sólo ops-worker), el backfill histórico de una sola vez por sujeto (10× el costo; runner `--dry-run` default + tope duro USD) y el screening de cartera (1.000 dominios ~USD 0.13).
- Reader `readDomainOverview` con `lens: 'estimated'` + `capturedAt` en toda cifra y `no_market_data` sin ceros fantasma; lane ecosystem `/growth/seo/domain-overview` + tool MCP `get_seo_domain_overview`; señal `seo.domain_overview.stale_subjects` (steady 0, con estado "sin rollout" honesto).
- Decisión registrada en arch §4.2: `domain_rank_overview` NO devuelve authority score — la autoridad canónica de superficie sigue siendo `seo_backlink_snapshots.domain_rank`, sin segunda cifra que compita.
- El encendido queda como checkpoint del operador (smoke live que gasta + flag multi-runtime + despausar); runbook `docs/manual-de-uso/growth/operar-foto-de-dominio-seo.md`.

## 2026-08-27 — El sustrato de sitio gana dueño propio y frontera con detector

- `TASK-1697` (mitad A, complete): el fetcher SSRF-guarded + parseo HTML/robots sale de las tripas del grader a `src/lib/growth/site-substrate/` (git mv, diff puro, shims — cero dependientes modificados) con carta verificable por test de allowlist: no importa `growth/*`, no persiste, dice cómo se OBTIENE la evidencia y nunca cómo se JUZGA.
- Lint rule nueva `greenhouse/growth-substrate-boundary` en `error` desde commit-1 sin exenciones: `ai-visibility/probes/**` pasa a ser privado del dominio AEO (la puerta externa es el sustrato) — el deep import que TASK-1670/1701 podían escribir mañana hoy rompe el build. La rule universal de fronteras `growth/*` queda declarada de `TASK-1713` (30 deep imports vivos la harían nacer sucia).
- Desbloquea a `TASK-1670`, `TASK-1701` y `TASK-1709` (el carril comercial de diagnóstico de prospectos ya tiene de dónde consumir la evidencia de sitio).

## 2026-08-27 — El fetcher de sitios de terceros deja de prometer garantías que no implementa

- `TASK-1778` (Slices 1–4b, code complete): el único fetcher con el que Greenhouse lee sitios de terceros (grader AEO público + brand intelligence + diagnóstico de prospectos) gana mecanismo para sus cuatro garantías: contención de redirects por salto acotada a la familia del sujeto (`apex↔www`, upgrade `http→https`), guarda DNS pre-conexión contra rangos no públicos, tope de memoria real por stream con truncado rastreable, y obediencia de `robots.txt` matcheando nuestro token — jamás los bots de IA que auditamos.
- Un probe de presencia ya no puede afirmar «no tiene datos estructurados» sobre un cuerpo truncado o un shell de render JS: degrada a `skipped` con razón explícita (`truncated_body`/`not_observable`), el mismo invariante `null ≠ 0` un nivel más abajo.
- El endurecimiento de red queda tras `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (dual-location Vercel + ops-worker) como kill switch de cobertura; el resto viaja sin flag.
- **Cutover aplicado el mismo día:** flag ON en el ops-worker compartido staging+prod (la cadena viva del intake público) + declarativo en `deploy.sh` + Vercel staging; la regla de saltos se extendió a subdominios descendientes del sujeto con evidencia real de cartera (bancochile). Corrida real `EO-GRUN-00048` verde con cero bloqueos falsos → `ISSUE-164` resuelto. Residuales en el ledger: revisión Sentry 48 h (2026-08-29) y env var en Vercel Production con el release que lleve el código a `main`.

## 2026-08-27 — Nace la práctica Salesforce operable y vendible

- Se crearon tres skills espejadas y gateadas: `salesforce-crm-practice`, `salesforce-marketing-cloud-engagement` y `salesforce-marketing-cloud-next`.
- Cada skill separa `operate` de `sell`, incluye discovery, fit, arquitectura, propuesta/SOW, operación administrada y gates explícitos para claims, licencias, partnership, consentimiento y mutaciones.
- Marketing Cloud Engagement se documenta como producto vigente y coexistente; Marketing Cloud Next como producto nativo de Salesforce Platform/Data 360. No se promete migración automática, paridad ni reemplazo universal.
- La práctica comercial quedó bajo **Revenue Operations & CRM** con catálogo de ofertas, mapa de productos y evidencia fechada. No hubo acceso a tenants, cambios de configuración, ventas, cotizaciones oficiales, claims públicos ni runtime.

## 2026-08-27 — RevOps & CRM deja de confundirse con un único provider

- Se verificó la posición Gartner por mercado y año: HubSpot es Leader en B2B Marketing Automation 2025 por quinto año, y Challenger en CRM Sales Platforms 2026 después de avanzar desde Niche Player en 2025. Zoho también es Challenger en CRM Sales 2026. Ya no se usa un supuesto cuadrante único de “CRM”.
- La señal enterprise chilena de Salesforce quedó sustentada con casos públicos de Enel Chile, Abastible y Colbún, pero se clasificó con confianza media: demuestra presencia, no market share ni desplazamiento general de HubSpot.
- La práctica se normalizó como **Revenue Operations & CRM**, con diagnóstico provider-neutral y tres carriles: HubSpot-first, Salesforce-first e híbrido gobernado. La inversión futura debe decidirse con 24 meses de pipeline, win/loss, margen, demanda y capacidad, no con un badge de analista.
- La declaración del CEO de que Efeonce es partner de HubSpot y Salesforce quedó en el registry como evidencia interna pendiente de readback primario. No autoriza claims externos, tier, certificación ni co-sell.
- Se actualizaron contexto GTM, modelo de negocio, beachheads, catálogo HubSpot, tasks/wireframes activos y las skills espejadas `hubspot-solutions-partner` y `efeonce-agency`. Sin cambios de runtime, clientes, licencias, programas de partner ni sitio público. Evidencia: [`CRM Platform Positioning — Gartner + señal enterprise Chile`](docs/audits/commercial/CRM_PLATFORM_POSITIONING_GARTNER_CHILE_2026-08-27.md).

## 2026-08-26 — Noviembre y diciembre de Berel quedan listos para revisión y producción creativa

- Se reescribieron los ocho artículos N43–N50 con rescate del contenido vivo, análisis SEO/AEO y editorial, voz es-MX, enlaces reales de `berel.com` y cuatro especificaciones de imagen por pieza.
- Los proyectos mensuales quedaron relacionados con 72 tareas: 8 artículos, 32 banners y 32 derivados; el Content Hub ganó 32 subítems sociales, cuatro por artículo.
- Los 32 pares tarea/subítem pasaron comparación exacta de cuerpo. El playbook espejo ahora exige escritura social en dos fases y gates visibles para archivo histórico, sensibilidad institucional, consolidación y soft-404.
- La relectura encontró un drift no corregido: las 40 tareas preexistentes de artículo/banner aparecen al 11 de septiembre, fuera de sus proyectos de noviembre/diciembre. Quedó declarado para confirmación del calendario antes de una nueva mutación en Notion.
- N48, N49 y N50 no están habilitados para distribución automática: esperan derechos/vigencia, revisión institucional y consolidación canónica, respectivamente. No hubo publicación CMS ni programación social. Evidencia: [`auditoría de noviembre/diciembre`](docs/audits/seo/BEREL_NOVEMBER_DECEMBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-26 — El eje de desenlace del pipeline deja de operarse sólo desde el portal

- **El hueco no era una ruta faltante: era una pregunta que nadie hizo.** Cerrar una postulación se podía hacer desde el portal y desde ningún otro lado — ni por `api/platform/app/**`, ni por MCP, ni por Nexa, que no mencionaba hiring ni una vez. Violación directa de Full API Parity, y el agravante es que **ninguna de las cuatro tasks del eje lo declaró como pendiente**, ni la auditoría que las revisó.
- **La spec pedía copiar el Banco de Talento y ese patrón no calzaba.** Talent-pool persiste sus invitaciones en una tabla y compara contra esa fila al confirmar; para decisiones no existe tabla, el command no acepta `proposalRef`, y la spec declaraba `Migration: none`. La salida no fue crear la tabla: una invitación **es** una entidad con ciclo de vida propio, una propuesta de decisión nace y muere dentro de un gesto humano. El guard quedó como un **digest del estado actual** que `propose` calcula y `confirm` revalida — si alguien decidió entre medio, falla en vez de pisar una decisión ajena.
- **Nexa quedó con autoridad deliberadamente MÁS ANGOSTA que el portal: cierra una postulación abierta, nunca re-decide una cerrada.** El motivo es mecánico: su contrato de acciones no puede cargar estado del preview al execute, así que la huella no sobrevive el viaje. Había dos salidas malas —debilitar el guard, o extender un contrato compartido por otras seis acciones— y una buena: acotar lo que el agente puede hacer.
- **El guard de parity es lo que impide que la clase vuelva.** Un manifiesto obliga a declarar cada capability `hiring.*` como federada, deliberadamente interna o pendiente. No obliga a federar: obliga a **decidir y escribir el porqué**. Cuatro de las decisiones ya escritas dicen que no, y valen más que las que dicen que sí. Quedan 18 pendientes — no es deuda nueva, es la que ya existía, ahora con nombre.
- **Dos defectos propios los encontró la pasada documental, no los tests.** El adaptador aplanaba los tres conflictos distintos del command en un solo código —exactamente la clase que se corrigió el mismo día del lado del candidato— y no reenviaba el destino de selección, con lo que dos de los seis desenlaces eran inalcanzables por la ruta que existe para alcanzarlos. Ambos corregidos y congelados con test.
- Estado: `code complete, rollout pendiente`. El flag de Nexa nace OFF —bajo el AI Act la selección es alto riesgo con supervisión humana obligatoria— y falta ejercitar el loop contra staging. La escritura por MCP queda diferida: su registro vive en el repo hermano y su scope está bloqueado hasta `TASK-1631`.

## 2026-08-26 — La rendición del assessment deja de perder respuestas y de mentir sobre por qué

- **El caso fuente, resuelto en su causa.** El 2026-08-19 una candidata real perdió una respuesta escrita y quedó sin poder enviar, teniendo 26 minutos de gracia disponibles. La causa no era el plazo: el autosave es un debounce que **se reinicia con cada tecla**, así que quien escribe de corrido sin pausar 450 ms **no guarda nada** — no pierde los últimos milisegundos, puede perder la respuesta entera. Ahora, dentro de una ventana de 30 s antes del plazo, el guardado se fuerza cada 5 s ignorando el debounce. No extiende ningún plazo: guarda antes.
- **La mitad de la premisa de la task era falsa, y quedó escrita como tal.** De los cuatro defectos declarados, dos no existían: el reloj es `sticky` desde el 2026-08-19 —arreglado 2h43m después de crearse la task, sin que nadie actualizara la spec— y los avisos de 5 y 1 minuto **nunca** fueron sólo `srOnly`. Quien la tomara iba a cazar un bug inexistente o, peor, a «arreglar» lo que funciona.
- **Tres defectos que ninguna línea declaraba.** El paso entre preguntas sobreescribía el borrador con el valor del servidor —vacío— en silencio, rompiendo la promesa central del propio wireframe; `errorBody` se usaba en DOS catches, así que arreglar el submit dejaba el autosave igual de deshonesto; y el diálogo de envío se abría durante la gracia sin verificar completitud, que es exactamente cómo se llegaba al error imposible de resolver.
- **El hallazgo que corrigió el contrato de diseño.** El wireframe proponía la copy «puedes enviar lo que alcanzaste a guardar». Es falso: el servidor **exige la evaluación completa** y rechaza cualquier envío con respuestas faltantes. Prometerlo habría repetido, más sutil, la misma mentira que la task venía a arreglar. La banda pasó a ser condicional, y con faltantes **el CTA de envío no se renderiza**: una acción que no puede tener efecto no se ofrece.
- **`readOnly` sobre `disabled` es accesibilidad, no estilo.** `disabled` saca el campo del tab order y su contenido del árbol de accesibilidad: durante la gracia significaba que quien usa lector de pantalla no podía releer lo que escribió. La asimetría con radio y checkbox —que conservan `disabled` porque `readonly` no les aplica por spec— quedó declarada en el contract test con su razón, no bajada en silencio. Y como el módulo nunca tuvo `.textArea:disabled`, el gris lo ponía el navegador: se agregó la regla explícita para que el campo congelado no parezca editable.
- **El servidor no se tocó, y esa fue la decisión.** Devuelve un mensaje genérico a propósito —es un endpoint público sin autenticación, fijado por un test anti-leak— así que la verdad se construye en el cliente desde el `code`. Cuatro mensajes agrupados por lo que la persona puede hacer, no siete por código.
- **Aprendizaje de gobernanza:** declarar `UI ready: yes` disparó 21 errores de un gate premium que **no tiene válvula de proporcionalidad** — se aplica igual a UI nueva que a un fix de defecto, y exige `Quality profile: premium`, lo que descarta el modo `--contract-only`. Las doce secciones se autoraron con contenido verificado, no de relleno; la más útil terminó siendo declarar **por qué no hay dirección visual nueva que explorar**.
- **La captura premium se ejecutó, y justificó su costo: destapó cuatro defectos que ningún test veía.** El contador de caracteres tenía un contraste de 2.43:1 contra el 4.5:1 de AA — defecto pre-existente, `serious` en axe, sobre una superficie de candidato. Al ocultar el placeholder del campo congelado —porque un campo que no acepta texto no puede invitar a escribir— axe reveló que el textarea llevaba años **sin nombre accesible**: se apoyaba en el placeholder, que es precisamente el anti-patrón que la guía de UX writing prohíbe. La banda usaba un **avión de papel** para decir que no se puede enviar. Y la superficie no declaraba su recipe de composición.
- **Un quinto hallazgo resultó ser del gate, no del código.** Marcaba los botones del stepper como fuera del viewport en 390px, pero su contenedor ya declara `overflow-x: auto`: es un scroller contenido, que es el patrón correcto. Se declaró la excepción en vez de romper el patrón para complacer al checker; el contrato real —que la página no scrollee— se verificó y se cumple.
- Estado: **complete**. `pnpm test` completo verde (12.062), los cuatro gates de UI en PASS, scorecard 4.54 con el piso declarado y su `nextAction` escrito en vez de inflado. Seed ejecutado y limpiado, con residuo verificado en cero.

## 2026-08-26 — La contabilidad de Hiring mentía: el dominio está más avanzado que sus documentos

- **Auditoría con cinco verificadores en paralelo, cada hallazgo re-verificado a mano contra el runtime** (git, `vercel env ls`, `gcloud run services describe`) antes de escribirse. El patrón de fondo: casi nada de Hiring falta por construirse; faltaba por contabilizarse. Sin cambios de runtime en esta pasada.
- **La regla que envenenaba a los agentes.** `.claude/rules/hiring.md` se auto-carga al tocar `src/lib/hiring/**` y afirmaba **en presente** que el `CHECK` del invariante `stage='closed'` ⟺ desenlace seguía parqueado en `docs/tasks/pending-migrations/`. Se aplicó el 2026-08-23 (`b270478f4`) y esa carpeta sólo tiene su `README`. Corregido, con las tres migraciones nombradas por ruta; además `HIRING_APPLICATION_STAGES` volvió a ser el espejo del `CHECK` desde que el Slice F de `TASK-1754` lo bajó de trece a seis. El `NUNCA` de fondo —no aplicar un contract antes del release que retira su escritor— **no se relaja**: cambió el hecho, no el invariante.
- **Un flag encendido en producción que el ledger daba por apagado.** `HIRING_VACANCY_AI_ENABLED` lleva **41 días ON en Production** y está **ausente en staging**; el ledger decía "OFF en todos los environments". Y el orden de sus precondiciones quedó invertido: se declaró "flip staging + smoke, después prod", y ocurrió prod ON **sin que el smoke de staging ocurriera nunca**. Queda registrado como deuda abierta, no como diseño.
- **La trampa que explicaba casi toda la confusión.** `main` promueve por **squash merge**, así que los SHAs de `develop` nunca son ancestros aunque su contenido esté desplegado. Leer `rev-list --count origin/main..origin/develop` como "trabajo sin desplegar" produjo el diagnóstico falso de que `TASK-1771` esperaba release: está en producción desde `709e15f66` (2026-08-23), verificado blob a blob. El gap real de código es `TASK-1762`, cuyas cuatro migraciones **ya se aplicaron** a la instancia Cloud SQL compartida — schema por delante del código, mitigado porque sus flags nacen OFF.
- **Ocho entradas falsas en `docs/tasks/README.md`**, corregidas: `1771` y `1755` como "no están en main" (ambas desplegadas), `1748` y `1771` con migraciones "parqueadas" (las dos aplicadas), `1754` con el Slice F "no ejecutado" (`50b742341`), `1719` con "falta rollout" (ejecutado el 08-18), `1747` marcada `to-do` estando `in-progress` y en producción, y `1757` "apagado esperando sign-off" con el flag ON desde el 08-20. Seis líneas `Status real` de las specs quedaron alineadas con el runtime.
- **Tres pendientes que ninguna línea declaraba.** `TASK-1718`: el fix H-10 sigue sin escribirse — el filtro `stage` entra como texto libre (`stage as never`) y ante un literal inexistente responde `200 {items:[]}`. `TASK-1746`: `purge_assessment_access_recovery` existe en DB con **cero callers**, o sea la retención de 12 meses y el purgado por retiro de consentimiento **nunca se ejecutan** — es el único hallazgo con filo legal. `TASK-1742`: el canary se declaró verde el 08-18 y al día siguiente entraron dos fixes correctivos al mismo carril, sin registro de re-verificación.
- **Una task perdió la mitad de su premisa.** `TASK-1751` declaraba cuatro defectos en la rendición del candidato; **dos no son ciertos**: el reloj ya es `sticky` (`bc69e5a75`, arreglado 2h43m después de crearse la task) y los avisos de 5 y 1 minuto **nunca fueron sólo `srOnly`** — la insignia visible `.timerBadge` convive con el canal de lector de pantalla desde el ship original del 2026-07-13. Quedan los **dos del guardado**, que son el daño real del caso fuente: el borrador en vuelo se pierde al entrar en gracia (falta el _flush_, no "congelar mejor") y el error final manda a reintentar algo imposible. La spec lleva `NUNCA` explícito de no "arreglar" lo que funciona.
- **Un fail-closed que parecía un olvido.** `HIRING_ASSESSMENT_AI_PROMOTION_EVIDENCE_DIGEST` está ausente en los tres runtimes **por diseño**: el digest _es_ la evidencia de promoción y sin él el modo degrada a `global_provisional`. Quedó anotado con su `NUNCA` — declararlo para "destrabar" la policy de excepciones vaciaría el gate.
- **Aprendizaje transversal registrado:** un `Status real` es una afirmación con fecha de caducidad. Cinco de siete tasks `in-progress` del dominio lo tenían stale, y el `README` estaba peor que las specs. Existe precedente del mismo fix (`4a1011286`).

## 2026-08-26 — Octubre de Berel queda convertido en un proyecto creativo trazable

- El proyecto [`Produccion Creativa - Octubre 26`](https://app.notion.com/p/3c839c2fefe7813c9450e2f35cb4021e) quedó `En curso` con ocho artículos `N35–N42`, 32 banners, 32 paquetes sociales y 32 subítems en Content Hub: 72 tareas relacionadas al proyecto, conforme a la aceptación `9A` / `4A`.
- Además de las seis reescrituras, se normalizaron los briefs y se redactaron los artículos nuevos N41 —paleta de la mesa mexicana— y N42 —pintura por superficie—, cada uno con cuatro banners y cuatro derivados completos. La segunda lectura confirmó las 18 filas nuevas y la igualdad exacta tarea ↔ subítem en los ocho sociales.
- Se restauraron 54 fechas de N35–N40 que automatizaciones de Notion habían movido al `2026-09-04`; la consulta final devolvió 8 artículos al 7 de octubre, 32 banners al 14 y 32 sociales al 16. Las canónicas de N41–N42 siguen como soft-404 y permanecen bloqueadas para enlaces entrantes, CMS y redes hasta QA live. Evidencia: [`auditoría de producción de octubre`](docs/audits/seo/BEREL_OCTOBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-25 — El caso de vacaciones por aniversario no se convierte en política global

- Se documentaron las fechas de ingreso verificadas de Melkin Hernandez (`2025-07-15`) y Andrés Carlosama (`2025-11-11`), junto con la comunicación individual aprobada que vinculó 15 días remunerados al primer aniversario.
- La auditoría deja explícito el drift: el runtime actual muestra 15 días a ambos, la carta global describe base anual prorrateada más progresión y la instrucción individual usa otro hito. People, Payroll y Legal deben decidir el contrato antes de cambiar cálculos o saldos.
- El aprendizaje operativo de TeamBot quedó en arquitectura, runbook, invariantes y skills: `pnpm teams:announce` no crea DMs; un one-off genérico solo puede usar el dispatcher y audit writers canónicos con identidad Entra revalidada, confirmación, idempotencia y auditoría. Los mensajes recurrentes pertenecen a Notification Hub.
- Se aclaró en el manual de ficha laboral que `hire_date` no se infiere desde compensación/creación y que guardarla no recalcula automáticamente Leave.

## 2026-08-25 — La metodología de priorización editorial SEO queda escrita, y aparece un motor que ya existía sin usarse

- **La lección más cara: Greenhouse ya calculaba lo que se reconstruyó a mano.** `/admin/growth/seo/keywords` (`TASK-1308`) expone el mismo score de striking distance que el reader canónico `keyword-opportunities-reader.ts` (`TASK-1302`) — clics incrementales contra la curva de CTR de la propia organización, con la canibalización ya separada como consolidación y no como optimización. La capacidad estaba construida, la conexión de Search Console del cliente llevaba semanas acumulando, y nadie la había corrido para esa cuenta. Quedó como antipatrón: verificar no solo que la capacidad exista, sino que esté **habilitada para la organización** — la página está gateada por flag y por entitlement, así que «existe» y «está encendida para este cliente» son dos hechos distintos.
- **Se separaron dos carriles que se venían mezclando.** Striking distance contesta _qué página existente empujo_; el volumen de una herramienta externa contesta _dónde hay demanda que no capturo_. Usar impresiones de Search Console para descartar contenido nuevo es razonamiento circular: un tema sin contenido no puede aparecer en un filtro que exige estar rankeando. La regla previa de «no priorices por volumen de terceros teniendo GSC propio» quedó acotada a la priorización de páginas existentes, que es donde aplica.
- **Tres trampas de lectura de Search Console quedaron documentadas con medición.** La posición promedio no es interpretable sin un piso mínimo de impresiones, y el diagnóstico real es la brecha entre volumen estimado e impresiones entregadas. Con dimensiones consulta+página los sitelinks inflan los agregados: una query de marca sumaba 86.282 impresiones repartidas en 300 páginas. Y la curva de CTR se deriva del propio sitio, porque el benchmark de industria no describe un vertical donde la posición 1 rinde 4,25%.
- **Nuevo modelo operativo y nuevo runbook.** `SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` cubre el proceso de punta a punta —intake del sistema editorial del cliente, los dos carriles, respaldo de producto, producción con subagentes, entrega y medición— con el camino primario apuntando al producto y el proceso manual declarado como fallback. `producir-serie-de-briefs-seo.md` es el paso a paso de producir y depositar una serie de briefs en el sistema editorial de un cliente, incluida la sintaxis de encabezado desplegable y la regla de concurrencia.
- **El caso del cliente quedó en `docs/audits/seo/`** con su línea base medida, el backlog de los dos carriles y los defectos de arquitectura de su sitio ordenados por impacto. La recomendación de mayor retorno no requiere construir nada ni que el cliente toque su sitio: correr la superficie que ya existe.
- **La skill `seo-aeo` entró al repo por el lado de Claude.** Estaba versionada solo como `.codex/skills/seo-aeo` porque una sesión de Codex commiteó su copia; la de Claude vivía a nivel de usuario, fuera de git, y se habría perdido al cambiar de máquina. Ahora están las dos, con 24 de 27 archivos idénticos. Tres siguen divergiendo y necesitan fusión con criterio, no copia.
- **La deriva de skills espejadas queda cerrada de forma estructural.** `seo-aeo` y `seo-aeo-practice` entran al manifiesto de `pnpm skills:mirrors`, que ya corre dentro de `local:check` y por tanto en el pre-push: de ahora en adelante cualquier divergencia rompe el push, verificado con un test negativo. Antes de registrarlas hubo que reconciliarlas a mano, y las dos estaban peor de lo que se veía. En `seo-aeo`, la copia que cargaba Claude estaba **más vieja** que la versionada por Codex: había perdido un sello de frescura y varias secciones enteras. En `seo-aeo-practice`, la copia de Codex afirmaba que el AEO de un cliente real iba regalado cuando está contratado y pagado desde el día uno, y proponía desagregarlo como oportunidad de revenue — es decir, cobrar de nuevo algo ya cobrado.
- **El modelo operativo gana el toolkit del research y el camino a la herramienta interna.** Queda escrito qué reportes se corren y para qué —once reportes agrupados por las siete preguntas que contestan— y una tabla de correspondencia contra la capacidad interna DataForSEO de `src/lib/growth/seo/`: cinco preguntas ya cubiertas internamente (una de ellas **mejor** que con el tercero, porque es medida y no estimada), dos parcialmente y cuatro sin cobertura. La regla queda explícita: cuando la interna cubre, se usa la interna; cada uso del tercero es señal de backlog de producto. Con una trampa de nombre declarada: `src/lib/growth/seo/gap/` **no** es el gap competitivo de keywords —es el cruce SEO×AEO del quadrant— y el gap competitivo (`domain_intersection`, `TASK-1662`) sigue pendiente.
- **Segunda pasada del mismo día: la pieza-hito anual entra al método.** Un cliente puede tener una pieza que es hito anual de marca (color del año, informe, ranking). Exige cuatro análisis que un artículo normal no: cadencia propia, cadencia del mercado con fuente primaria, la ventana, y el **contrato del claim perecedero** — «primera marca en anunciar X» se documenta con su condición de caducidad y una **tarea de retiro con fecha**, en la pieza, en el PR y en los assets ya distribuidos. Un claim que caduca sin retirarse es un pasivo. Y quedó una advertencia medida: la cadencia propia se lee del `datePublished` del JSON-LD, pero **dos fechas separadas por dos meses no son un patrón**, y una ruta que devuelve 200 sin `<title>` no aporta una fecha, aporta un soft 404.
- **El competidor más peligroso suele ser una pieza propia reciente.** El reflejo es barrer competidores; el chequeo que faltaba es barrer los artículos del propio cliente de los últimos tres meses comparando **conceptos, no keywords**. Es un chequeo distinto del de canibalización por GSC que ya existía: ése consolida URLs vivas, éste previene escribir encima de trabajo propio. Y hay un tercer actor que no está en ningún mapa competitivo: el **pre-emptor de tesis** —alguien fuera de la categoría que publicó el mismo concepto con el mismo mecanismo antes—, con la distinción operativa de que **ganar la tesis no es ganar el SERP**, y un riesgo nuevo que se mide: que un motor de respuesta atribuya el concepto a la marca equivocada.
- **La distribución deja de ser una parrilla cuando el canal lo opera otro.** Si el canal existe pero lo publica un tercero, el entregable es un **paquete de insumo**, no un calendario: tabla campo por campo, la fecha marcada _sugerida_ y no comprometida, el objetivo en unidad de cobertura de insumo entregado, la medición declarada de antemano (pedir el reporte a quien publica o inferir por tráfico de referencia) y el retiro del claim perecedero comunicado a quien publica **como entregable**, porque tiene copy vivo. Además: la convención de atomización **se deriva del inventario del cliente, nunca se inventa**, con cuatro señales de degradación; y una red social que ocupa varias posiciones de la primera página del vertical deja de ser un canal y pasa a ser **una segunda superficie de búsqueda**, lo que cambia el copy (el título lleva la consulta, no el nombre de la campaña).
- **Cuatro antipatrones nuevos, todos con caso propio.** Un grep de patrón de nombre no es un inventario —un regex anclado a la convención vieja devolvió cero para el mes que usaba otra y se concluyó que los entregables no existían—; el peso en caracteres no mide la calidad de una sección —se llamó «flaca» a una capa que era checklist y tabla, el formato más denso que hay—; una keyword con dificultad sospechosamente baja se verifica en SERP antes de fijarse como objetivo; y un hallazgo de inventario local no es una acusación de proceso: puede ser sincronización de almacenamiento y se reverifica con el equipo dueño antes de reportarlo al cliente.
- **La trampa de Notion que rompe un entregable devolviendo éxito.** Al depositar un brief dentro de un encabezado desplegable, se escribe la tabla en markdown de tuberías y Notion la guarda como HTML **cuyo envoltorio no hereda el tabulador** — desde ahí, todo lo que sigue queda fuera del desplegable, y la escritura reporta éxito. Tampoco se puede prefijar con tabulador una línea que empiece con sintaxis de lista numerada: Notion la reparsea, descarta el tabulador y arrastra la cola. El cierre es un conteo mecánico, y el fetch devuelve los saltos de línea escapados, así que un patrón ingenuo reporta cero secciones y parece que la página está vacía.
- **`content-marketing-studio` entra al manifiesto de espejos y traía deriva ya committeada.** Cuatro archivos divergían entre las dos copias, uno con un puntero que resolvía a una ruta inexistente. Reconciliado y registrado: el gate de pre-push cubre ahora 11 skills.
- **Tercera pasada del día: la entidad de marca recurrente entra al método, y con ella la autoridad temática.** Si un cliente tiene una entidad propia que se repite cada año —color del año, informe anual, ranking, premio, índice—, **no es contenido estacional: es un clúster que compone autoridad anualmente** y que ningún competidor puede disputar. Quedó escrito el **kit reutilizable con cadencia relativa al anuncio** (`D-30` reservar el destino · `D+0` ficha ancla · `D+2` aplicación profesional · **`D+30` satélite de espíritu anclado a estacionalidad**, el eslabón que produce la capilaridad · `D+75` desarrollo mayor · `D+150` tendencia · `D+240` segundo desarrollo), con bidireccionalidad obligatoria incluida **ficha del año N ↔ año N−1**. El error que lo originó también quedó nombrado: clasificar el territorio de la entidad como «masa de calendario» y descartarlo.
- **La estacionalidad sirve solo si es vinculante.** Test de cuatro pasos: ¿el ritual **es** el concepto? ¿su materia es la del producto? ¿hay demanda con SERP verificado? ¿queda hueco leyendo el contenido propio? Y preferir el **marco reutilizable** sobre la efeméride puntual: una pieza atada a una fecha caduca, un marco de temporada se recicla cada año. Volumen alto con vínculo débil es trampa — un ritual muy buscado puede tener SERP de receta, gobierno o retail.
- **🔴 Medir el grafo de enlaces internos exige separar lo editorial del chrome.** Un módulo global (pie, carrusel de relacionados) inyecta los mismos destinos en **todas** las páginas: eso infla el conteo y **fabrica hubs que no existen**. El método es filtrar los enlaces presentes en más del 50% de las páginas. La consecuencia operativa se invierte: a un destino cableado **no se le dan salidas, se le quitan entradas**, reemplazando la terna fija por un módulo contextual dirigido por el mapa de clúster. Y hay que medir **qué porcentaje del enlazado interno apunta a soft 404**. ⚠️ Con una advertencia que quedó documentada: en el caso fuente **la cifra filtrada no fue reproducible** desde el dataset intermedio, así que el criterio de «cuerpo editorial» hay que declararlo explícitamente antes de darle un número a nadie.
- **🔴 Brief ≠ dossier de research, y la plantilla canónica ya existía sin usarse.** Se entregaron briefs de 27.000 a 70.000 caracteres cuando `content-marketing-studio/templates/content-brief.md` son 35 líneas. Nuevo estándar en `SEO_CONTENT_BRIEF_STRUCTURE_V1.md`: **techo duro de 12.000 caracteres**, once bloques de máximo diez líneas, bloqueantes arriba, y la regla de fondo — **el brief cita la conclusión y enlaza la evidencia, no la transcribe**. Verificado en la práctica: el brief siguiente salió en **10.035 caracteres sin recortar al final**.
- **El `unbrand test` puede fallar legítimamente, y eso cambia la métrica, no el objeto.** Cuando el objeto citable **es** la entidad de marca —un léxico propietario, una nomenclatura—, quitarle la marca lo vacía y el gate falla por construcción. La lectura correcta no es arreglarlo ni marcarlo verde: es que la pieza **construye entidad en vez de utilidad neutra**, y por tanto **se mide por menciones y citas, no por backlinks al objeto**.
- **Dos antipatrones de criterio y cuatro de craft.** Si se cae la razón por la que existe una pieza, **la decisión vuelve a cero, no a otro ángulo** — buscarle un ángulo nuevo para salvarla es publicar por publicar; y un tema que le habla a otro comprador es decisión comercial, no de SEO. En titulación: poner el **concepto** en el lugar del título (el ángulo nombra, el titular promete), meter taxonomía interna en el nombre visible, repetir el mismo titular en las cuatro superficies, y desaprovechar el activo más citable que suele tener un catálogo — **un nombre propio con carga cultural que nadie contó**.
- **Tres trampas más de herramienta, todas devolviendo éxito.** En Notion: **nunca editar el texto de un encabezado desplegable con search-replace** —destruye el toggle y orfana a todos los hijos; para renombrar se cambia la propiedad `Nombre` de la página— y el desplegable **no puede ser el primer bloque**. Leyendo un sitio Next.js: **no des-escapar el payload para buscar `@type`**, porque los objetos de la app aparecen como si fueran schema (se «encontró» un tipo inválido nueve veces por página que en el HTML crudo no existe); y los conteos de palabras sobre el payload salen **~3× inflados**.
- **`copywriting` entra al manifiesto de espejos (12 skills) y traía deriva que no fallaba con error.** La copia de `.codex` tenía una `description` de una línea, sin `user-invocable` ni triggers: la skill simplemente **no se cargaba** cuando alguien pedía un headline o la voz del autor. Un agente entrando por Codex escribía copy firmado sin el sistema de voz, sin saber que existía.

## 2026-08-24 — TeamBot deja de prometer una mención que Teams no soporta

- Un anuncio real a `EO Team` demostró que usar el ID del chat como identidad de `@todos` no funciona: Teams aceptó el mensaje, pero mostró `todos` como texto común y no notificó colectivamente.
- La capacidad oficial es más acotada: un bot puede mencionar personas explícitas en un chat grupal, pero no puede mencionar a todos. La causa no era idioma ni configuración del tenant.
- Se corrigieron las skills, arquitectura, invariantes, runbook y `TASK-716`. El diseño futuro solo admite `none` o `explicit_users`; también conserva las Adaptive Cards sin `activity.text` para evitar la burbuja duplicada.
- No se reintentó el envío. El soporte local especulativo de `--mention-all` fue retirado y no forma parte del runtime versionado.

## 2026-08-24 — Queda registrado que nadie puede darse de baja de un correo, y quién lo va a arreglar

- Se abrió el incidente que documenta el defecto: el enlace «Dejar de recibir estos correos» del pie **falla por los tres caminos posibles**, incluido el botón «Cancelar suscripción» que Gmail y Outlook muestran sobre el asunto. Ninguno da de baja a nadie.
- **No es algo que se rompió después.** La capacidad se cerró así: la task que la construyó quedó marcada como terminada con su propio criterio sin cumplir y sin la página de preferencias que había planeado. El endpoint existe y no lo usa nadie.
- Se creó la task que lo repara, con una decisión de diseño que vale nombrar: **hacer clic en el enlace no dará de baja de inmediato**, mostrará una confirmación. Los escáneres de seguridad de los correos corporativos abren los enlaces solos, así que un enlace que diera de baja al abrirse desuscribiría a gente que nunca lo tocó. El botón nativo del cliente de correo sí actúa directo, porque ahí la intención ya la expresó la persona.
- También deja de guardar permisos de baja que nadie puede usar: hoy la liquidación de sueldo genera uno que dura un mes y no aparece en ninguna parte.
- Tres tasks vecinas quedaron corregidas: los avisos de vacantes para el Banco de Talento —que serían la **primera suscripción voluntaria de verdad** del sistema— asumían que la baja funcionaba; el desalineamiento de la dirección de casa matriz dejó de ser deuda de una pantalla y pasó a bloquear todo el programa de correos; y el aviso de pagos a contractors quedó con una pregunta pendiente sobre a qué carril pertenece.

## 2026-08-24 — El rediseño de los pies de correo se revisó contra el sistema real, no contra su diseño

- **El botón de "darse de baja" no funciona hoy.** El enlace del pie lleva a una dirección que el servidor no atiende, y el botón propio que Gmail muestra arriba del correo tampoco: los dos fallan. Además el sistema agrega ese enlace **solo, por accidente**, a cualquier correo enviado a más de una persona. La liquidación de sueldo llega a generar un permiso de baja de 30 días que nadie ve nunca. Arreglarlo pasa a ser condición previa del programa.
- **La marca queda cerrada, no en discusión.** "Efeonce Greenhouse" no existe: Efeonce es la marca que lidera y Greenhouse es la plataforma, dos capas de la misma jerarquía y no dos opciones a elegir. Se corrigió el planteo excluyente que traía la task de marca, que ahora ejecuta la arquitectura ya aprobada en vez de reabrirla. Son cinco textos, ningún logo: el remitente, el tagline del pie, el texto alternativo del logo y los dos cuerpos de la invitación.
- **Los correos en inglés muestran parte del pie en castellano.** El diccionario en inglés no tiene sección de correos: apunta al español por atajo, y ni el compilador ni las pruebas lo notan. Ya se ve en toda liquidación a colaboradores fuera de Chile.
- **Los correos salen de dos lugares, no de uno.** Veinte tipos salen del servicio en la nube, seis salen del portal —los que uno espera en pantalla al apretar el botón— y tres salen de ambos. Para esos tres, actualizar un solo lado haría que el mismo documento llegue con dos pies distintos según si fue automático o reenviado a mano.
- **Los datos legales del pie todavía no tienen camino ni política de respaldo.** Se adoptó la conducta que ya usan los PDF: si la base no responde, se usa el dato de respaldo y queda registrado; el RUT se omite antes que inventarse. Y la dirección de casa matriz tiene tres versiones distintas en el sistema, con una decisión pendiente que bloquea a todo el programa.
- Se confirmó que el gobierno de la migración estaba bien: nada se cambia por herencia, cada tanda migra pocos tipos y cada una puede revertirse sola. También se corrigieron dos supuestos previos: el encabezado ya usa el logotipo de Efeonce en las treinta plantillas, y el pie sí tenía red de pruebas.

## 2026-08-24 — Revisar postulaciones ya no obliga a entrar y salir del Pipeline

- Application 360 permite pasar a la postulación anterior o siguiente de la **misma vacante y etapa**. La cola excluye archivadas y usa orden cronológico estable; no es un ranking y no consulta score, afinidad ni recomendaciones IA.
- Si hay una decisión, corrección o nota sin guardar, Greenhouse pregunta antes de cambiar de postulación. En móvil el contador se compacta y la pestaña padre activa se mantiene visible.
- Al volver por la pestaña `Pipeline`, Greenhouse recupera la postulación exacta incluso si quedó fuera del límite habitual, consume el foco temporal de la URL y deja la tarjeta enfocada. Si ya no existe, muestra una recuperación honesta en vez de seleccionar otra.
- El recorrido `1 de 2 → 2 de 2 → Pipeline` pasó Playwright/GVC en 1440 y 390 px, con View Transition compartida y cero errores de consola, página, hidratación o red.
- El contrato quedó incorporado en arquitectura y en las skills de Talent, Motion y GVC. La auditoría documental detectó que el snapshot del board aún puede incluir postulaciones archivadas; el delta no está listo para rollout hasta cerrar esa brecha.

## 2026-08-23 — Los tests contra base real dejan de fallar por pisarse entre ellos

- Los tests que corren contra la base de verdad ahora se ejecutan **de a uno**, no en paralelo: comparten una sola base con producción, así que correrlos a la vez hacía que se pisaran y fallaran sin motivo real.
- Cada archivo de test usa **su propio candidato de prueba** en vez de tomarlo de una bolsa común de tres, que era la causa de que tres archivos se estorbaran entre sí.
- Hay un comando nuevo para correrlos (`pnpm test:live`) que **sólo entrega credenciales de base**. Antes, la forma habitual de dárselas volcaba toda la configuración local al proceso y rompía quince tests de otros equipos que no tenían nada que ver.
- Dos fallas que engañaban ahora se declaran: un test saltado ya no se puede confundir con uno exitoso, y si falta el túnel a la base el comando lo dice de entrada en vez de fallar al final.

## 2026-08-23 — Quien no queda porque el cupo lo tomó otro ya no figura como rechazado

- El cierre de una vacante llena registra ahora **«sin selección»** con la causa «vacante completada», no un descarte. La diferencia no es de palabras: un descarte es un juicio sobre la persona, la deja fuera del Banco de Talento por defecto y **cuenta como rechazo en el análisis que mide si un proceso discrimina**.
- El operador ve **exactamente a cuántas personas afectaría** antes de confirmar, agrupadas por cómo entrarían. Quien está en pausa o es respaldo **no entra** salvo que se pida: una la dejó esperando alguien a propósito, y con la otra hay un compromiso abierto.
- Si el resumen cambió desde que se miró, el sistema **no deja confirmar**: estarías cerrando un grupo distinto del que aprobaste.
- El correo tiene su propio texto y su propio interruptor, así que se puede pausar un cierre masivo **sin silenciar** los correos de decisión individual. La frase «mantendremos tu perfil» aparece **sólo** si esa persona lo autorizó, verificado en el momento de enviar.
- Nada de esto está encendido todavía: el cierre y el correo nacen apagados, a la espera del sign-off de Talent y Privacidad.

## 2026-08-23 — Los follow-ups de Hiring quedaron vivos en producción

- El eje de desenlace, el vocabulario de seis etapas, el filtro de procedencia del archivo sintético, el callejón de intentos del assessment y el predicado único de «proceso activo» pasaron a producción en el release `709e15f6688e` (PR #206, 140 archivos, 5 migraciones).
- El monitor de equidad **sigue apagado a propósito**: su etapa por defecto quedó retirada por el contract nuevo, así que prenderlo hoy devolvería cero en silencio — y un cero silencioso en una métrica de equidad se lee como «no hay impacto adverso», que es lo contrario de lo que sabemos.
- Producción quedó verificada más allá del health check: cero errores nuevos en Sentry, 321 eventos de outbox publicados desde el despliegue sin ninguno atascado, y las seis etapas renderizando en el pipeline con sesión real.
- De paso se corrigieron dos instrucciones equivocadas de la propia documentación de release: la que verifica el worker de operaciones miraba una lista de rutas que ya no existe, y la receta del merge podía duplicar texto en los manuales sin que ninguna verificación lo notara.

## 2026-08-23 — Application 360 vuelve al pipeline de la vacante que corresponde

- La pestaña `Pipeline` ahora funciona como retorno contextual desde cualquier postulación: deriva la vacante desde `application.openingId`, en vez de caer en la vacante más reciente.
- La URL conserva el scope de vacante y, al regresar, el Kanban enfoca la tarjeta de origen sin aplicar filtros que oculten a otros postulantes.
- La tarjeta y el hero comparten una View Transition breve; reduced motion conserva el mismo destino y foco sin animación. La validación local pasó en 1440 y 390 px, sin errores de consola, página, hidratación ni red.

## 2026-08-23 — Cinco personas reales eran buscables en el Banco de Talento por una postulación que alguien había retirado

- «Postulación en proceso activo» pasó a tener **una sola definición** en toda la plataforma, y son **tres
  ejes, no uno**: el proceso no terminó (`decision`) **y** el registro no fue retirado de la vista
  (`archived_at`). Antes, once lugares distintos respondían esa pregunta mirando la **etapa**, cada uno con su
  propia lista escrita a mano.
- Preguntar por etapa fallaba por una razón concreta: **archivar devuelve la postulación a su etapa anterior**.
  Una postulación archivada volvía a verse «en Preseleccionado», así que seguía contando como viva. Medido: **5
  personas reales** figuraban como «en proceso activo» en el Banco de Talento —y por lo tanto buscables e
  invitables— únicamente por una postulación que alguien había archivado a propósito. Pasan a
  `needs_reconsent`.
- La señal de salud de la asignación de pruebas dejó de vivir en amarillo por datos de humo (`ISSUE-162`):
  contaba **13** postulaciones esperando, de las cuales **10 eran de prueba, archivadas**. Ahora cuenta **3**,
  que son las reales, y **reporta aparte** las 10 que excluyó — un filtro que no dice cuánto dejó fuera es
  indistinguible de un tope silencioso.
- Si ves un conteo de activas más bajo que ayer, es esto y no se perdió ningún dato: las postulaciones
  archivadas siguen completas, sólo dejaron de contarse como procesos vivos. Cuántas son se lee en
  `/admin/operations`.
- Un gate de CI rechaza que alguien vuelva a escribir la lista a mano, y una señal de confiabilidad detecta en
  runtime lo que el gate no alcanza a ver.

## 2026-08-23 — Los footers aprobados dejaron de depender de la imaginación del siguiente agente

- El mockup aprobado ahora es el punto de partida obligatorio para implementar footers: conserva jerarquía,
  espaciado, contraste, wordmark Efeonce, identidad legal, iconos sociales y reglas responsive.
- Los cinco perfiles visuales no borran la semántica: representan siete propósitos, y suscripción opcional no se
  confunde con marketing aunque compartan anatomía.
- La skill de email ya no infiere baja desde `broadcast`: unsubscribe y RRSS dependen de propósito y consentimiento.
- La revisión final endureció tipografía, jerarquía semántica, listas, tabla de policy, targets, foco y contraste en
  los cinco perfiles; los diez estados desktop/mobile quedaron sin overflow y GVC no registró errores runtime.
- Cada cohorte deberá probar Outlook Desktop Windows, Outlook Web, Gmail, un cliente WebKit e imágenes bloqueadas.
  El mockup sigue siendo diseño aprobado, no evidencia de envío, deploy o runtime.

## 2026-08-23 — Cuando el sistema intentaba mandar la prueba solo y se trababa, esa persona quedaba en un limbo que nadie veía

- Si la prueba la asignaba una persona y se bloqueaba, corregir la causa y volver a proponer alcanzaba. Si la
  iba a mandar el sistema solo, el intento quedaba registrado **reservando el lugar de esa persona en esa
  vacante** — a propósito, para que un error de configuración no le mande tres veces la misma prueba a alguien.
  Pero ese lugar reservado no tenía forma de liberarse, y mientras siguiera ahí la postulación **desaparecía de
  las listas de recuperación**: no porque estuviera resuelta, sino porque el sistema ya había anotado que lo
  intentó.
- Lo grave no era que fuera irreversible: era que **las tres superficies que debían delatarlo callaban a la
  vez**. La cola la excluía, la señal del panel era su espejo exacto, y la métrica que sí la contaba no movía
  la alarma y además caducaba a las 24 horas. A las 24 h el caso salía hasta de la evidencia mientras la
  persona seguía trabada.
- Ahora esas postulaciones aparecen en una lista propia y quien gobierna la prueba de la vacante puede liberar
  el lugar. Con dos condiciones que la plataforma verifica sola: **sólo se libera si hoy la prueba SÍ se
  mandaría** —liberar con la causa viva vuelve a bloquear en el acto y gasta uno de los tres intentos de
  recuperación de esa persona— y **tres recuperaciones por persona y vacante**, tras las cuales el caso pide
  revisión humana.
- Liberar **no manda ningún correo**, no borra el motivo del bloqueo y no devuelve cupo al tope de envíos de la
  vacante: ese tope cuenta correos que ya salieron, y liberar no des-envía nada.
- El panel distingue dos cosas que no son lo mismo: la que ya se puede destrabar **alarma**, y la que sigue
  bloqueada por una causa vigente **no** — avisar de algo que nadie puede arreglar todavía es la forma más
  rápida de que el equipo deje de mirar el tablero.
- **Todavía no está en producción.** El código está completo y verificado contra la base real; falta el
  release. Y de paso quedó abierto `ISSUE-162`: la señal de salud vive en amarillo por diez postulaciones de
  prueba archivadas, no por un defecto real.

## 2026-08-23 — Las trece etapas del pipeline quedaron en seis, y las que sobran ya no son etapas

- El recorrido de una postulación se describía con trece etapas, y cinco de ellas no decían _dónde está_ la
  persona sino _cómo terminó_: «seleccionado», «rechazado», «retirado». Dos preguntas distintas contestadas
  con el mismo campo. Ahora el recorrido tiene seis etapas y el desenlace vive en su propio eje.
- Otras dos, «calificado» y «revisión de cliente», se habían absorbido en «Evaluación» pero seguían existiendo
  por debajo: era el origen del bug que dejó quince vacantes con su política de pruebas bien configurada y
  ninguna disparando.
- El contract que retira los siete literales de la base **está escrito y revisado, y todavía no aplicado**:
  espera autorización. Hasta entonces el candado de seis vive en la aplicación y la base sigue aceptando trece.
- Un detalle que parecía poda y era corrección: el mapa de «etapas posteriores al gatillo» listaba «revisión de
  cliente» como posterior a «Evaluación», cuando el colapso la había metido **dentro**. Mandaba a revisión
  humana postulaciones que la reconciliación automática sí sabe recuperar.
- Y una deuda que se declara en vez de esconderse: el monitor de equidad medía su cubo terminal en una etapa
  que dejó de existir. En vez de devolver cero —que en una métrica de equidad se lee como «no hay impacto
  adverso»— ahora falla ruidoso, y no se prende hasta que se le apunte al eje correcto.

## 2026-08-23 — El dominio de Hiring reparado llegó a producción, y el reloj de retención con él

- Las cuatro correcciones del día estaban `code complete, rollout pendiente`: el eje de desenlace, el colapso de
  trece etapas a seis, el filtro de procedencia del Banco de Talento y el callejón del ledger de asignación de
  pruebas. Ninguna servía de nada mientras producción siguiera corriendo el código anterior. Ahora corren.
- Viajó dentro el fix de una regresión con implicación legal: el reloj de retención de la Ley 21.719 no
  arrancaba para `not_selected`, la población más grande del pipeline. No estaba viva porque producción todavía
  no podía escribir ese desenlace — **se habría vuelto viva en el mismo instante en que este release lo
  habilitó**. Por eso no podía quedar para el siguiente.
- Quedan tres migraciones escritas y revisadas que **no** viajaron: viven fuera de `migrations/` a propósito,
  porque una migración committeada y sin aplicar bloquea a cualquiera que corra `migrate:up`, incluido quien
  esté reparando un incidente. Corren después del release, en cadena, y cada una espera que el código del
  eslabón anterior esté desplegado.
- La lección que ordena esa cadena, y que ya costó un incidente: **«cero filas» no es «nadie lo escribe»**. Lo
  que decide si un valor es alcanzable es el contrato de la superficie desplegada, nunca el contenido de la
  tabla.

## 2026-08-22 — Mover a «Evaluación» ya no guarda una etapa distinta de la que muestra

- El tablero mostraba seis columnas sobre trece etapas del dominio, y tres de ellas se veían todas como
  «Evaluación». Soltar una tarjeta ahí guardaba `qualified`, mientras la automatización de pruebas vigilaba
  `shortlisted`: **quince vacantes tenían su política bien configurada y ninguna disparaba**, sin que en pantalla
  se viera nada raro. Dos candidatas reales cruzaron esa columna el 2026-08-19 y no recibieron su prueba.
- Ahora hay una etapa por columna. `qualified` y `client_review` se absorbieron en `shortlisted`, y el carril del
  tablero declara **una sola** etapa: la que lo titula es la que se escribe, así que ese error dejó de poder
  cometerse. Siete postulaciones reales se movieron con el cambio y quedan visibles en la cola de reconciliación
  de su vacante para que una persona decida si corresponde asignarles la prueba.
- El desk leído en inglés mostraba las seis columnas en castellano: heredaba los nombres del diccionario es-CL sin
  sobreescribirlos. Ya no.
- **«Preselección» en el correo al candidato y «Evaluación» en el tablero se conservan distintos a propósito.**
  Hacia afuera el registro es más suave, y decirle «Evaluación» chocaría con el correo del test, que ya dice
  «tienes una evaluación pendiente». Queda escrito con su razón para que nadie lo lea como error.
- Nada de esto está en producción todavía: allí mover a «Evaluación» sigue guardando la etapa vieja.

## 2026-08-22 — Archivar un dato de prueba dejó de marcarlo como «Cerrado»

- Archivar y cerrar eran la misma escritura, y no son la misma cosa. Cerrar significa que el proceso de una
  persona terminó **con un desenlace que alguien declaró**; archivar sólo saca un registro de la vista. Al
  mezclarlos quedaron 32 postulaciones de prueba marcadas como cerradas sin que nadie hubiera decidido nada.
- Archivar ahora tiene su propia marca y **nunca** toca la etapa, y cubre las tres piezas de un candidato de
  prueba: su postulación, su ficha y la vacante inventada. Una vacante que alguien ya cerró o llenó no se
  reescribe.
- El **Banco de Talento** dejó de mostrar personas de prueba **por su procedencia declarada**. Antes tampoco
  aparecían, pero por casualidad: bastaba con que su estado en el ciclo de vida cambiara para que reaparecieran.
- Nada de esto está en producción todavía: el cambio de las 32 filas ya escritas espera al despliegue.

## 2026-08-22 — Demo 35 queda documentada antes de tocar la home del blog

- La página candidata se revalidó read-only: siete raíces, 113 nodos y 15 widgets de posts; cuatro ya están
  vacíos porque apuntan a attachments y otros dos pierden un slot. La estructura no falla por Elementor: falla el
  contenido fijo si se borra antes de recablear cada bloque.
- El contrato operativo deja explícito que Demo 35 debe seguir como página Elementor normal, nunca como
  `page_for_posts`, y que el futuro corte debe conservar una sola canónica `/blog/`, sus metas Ohio y rollback.
- La skill del sitio público ahora registra la landing, sus parámetros, guards y secuencia de adaptación. No se
  modificó WordPress, Kinsta, formularios ni caché.

## 2026-08-22 — Cerrar una postulación ahora obliga a decir cómo terminó

- El proceso de una persona ya no se cierra arrastrando su tarjeta a «Cerrado». Cerrar es **decidir**, y la
  decisión pide el desenlace. Ese camino silencioso, además de no avisarle a nadie, **congelaba el borrado de los
  documentos de esa persona en todas sus postulaciones** — una obligación legal bloqueada sin que se notara.
- Aparecen dos desenlaces que faltaban. **«Sin selección»** para quien llegó al final y no quedó: antes había que
  marcarla como descarte, un juicio que nadie emitió, que la sacaba del Banco de Talento y que distorsionaba el
  análisis de equidad de su cohorte. Y **«Sin respuesta»** para quien deja de responder: antes había que
  inventarle un retiro que no declaró o un juicio que no hubo.
- «Sin selección» **exige decir por qué**: el cupo lo tomó otra persona, se cerró la búsqueda o se canceló el
  proceso. Es una lista cerrada, no texto libre, porque el embudo de equidad y el correo cambian según cuál sea.
- **Una pausa deja de ser un cierre.** «Dejar en espera» desaparece: para pausar, la tarjeta se queda en la
  columna «Decisión». Su proceso no terminó, así que no tiene desenlace.
- Ningún desenlace nuevo manda correo todavía. Es deliberado: preferible no escribir a mandarle un correo de
  rechazo a quien nadie rechazó. El correo de «Sin selección» llega con su propia entrega.

## 2026-08-22 — Un test bloqueado ya no deja a esa persona sin segunda oportunidad

- Corregir la causa de un bloqueo —registrar el correo, activar la plantilla, habilitar la política— y volver a
  proponer ahora **sí asigna la prueba**. Antes el intento bloqueado ocupaba el cupo de esa persona de forma
  permanente y no había forma de destrabarlo desde el portal.
- El intento bloqueado no se borra: queda como intento 1 y el nuevo entra como intento 2, así que el historial
  sigue diciendo qué pasó y en qué orden.
- Lo que no cambió: una prueba ya asignada sigue sin reintentarse (para eso está cancelar), y un bloqueo del
  carril automático —al mover de etapa— todavía no se destraba solo; hay que asignar a mano.
- Sin migración ni flags. Verificado contra PostgreSQL real, no sólo con tests.

## 2026-08-21 — El correo de selección celebra sin adelantar la incorporación

- El asunto identifica nombre y vacante; el título visible evita duplicar el saludo y el cuerpo explica la
  secuencia real: selección, carta oferta, aceptación y firma del contrato.
- Las tres primeras rutas fueron rechazadas por resultar tecnológicas, genéricas o demasiado abstractas. Diseño +
  Talent convergen en una V4 concreta: icono 3D de sobre abierto, tarjeta sin texto, check de confirmación y un único
  destello naranja. El PNG transparente pesa 63.972 bytes y su URL respondió `200 image/png`.
- HTML y texto plano conservan la misma verdad; la variante de rechazo no carga el hero. Código completo con
  captura local revisada. La decisión, la carta oferta y el contrato reciben negritas visibles sobre frases
  completas; las dos variantes de decisión firman `Equipo de Talento · Efeonce`, sin atribuir el mensaje a una
  persona inexistente.
  Rollout del template pendiente y ningún correo real enviado.

## 2026-08-21 — Hiring formaliza el cierre empático de una vacante cuando se completan sus cupos

- `TASK-1762` separa capacidad de publicación y selección: preview fresco, confirmación humana y run durable por
  aplicación antes de rechazar/notificar a la cohorte restante.
- `TASK-1763` diseña el segundo paso en Application 360 con CTA explícita `Cerrar vacante y notificar a N personas`,
  estados stale/partial y evidencia desktop/mobile planificada.
- El ADR Proposed conserva `TASK-1689` como pipeline individual, prohíbe batch SQL/email directo y sólo permite
  afirmar Banco de Talentos cuando el consentimiento futuro está vigente. `data_origin` no gatea comunicaciones.
- Estado: documentación/diseño; no hay migraciones, código, flags ni emails nuevos activos.

## 2026-08-21 — Hiring incorpora un plan gobernado para crear la cuenta Microsoft del nuevo colaborador

- `TASK-1761`, anclada a `EPIC-011`, separa la cuenta Entra deshabilitada, su binding OID, la habilitación laboral
  y el readiness M365; no trata selección, handoff ni `member.created` como permiso suficiente.
- El ADR Proposed elige API-driven inbound provisioning con app dedicada, matching por ancla longitudinal y
  reconciliación de logs; rechaza `POST /users`, email/UPN como identidad y grupo/licencia antes del OID binding.
- Quedan documentados dos blockers P0 previos al canary: `accountEnabled=false` no puede apagar el principal `/my`
  y el roundtrip SCIM debe actualizar la misma persona sin crear otro principal/member.
- Azure no se modificó. El snapshot read-only no muestra capacidad libre de Microsoft 365 ni grupo de
  licenciamiento válido; ADR, licencia, app/consent, security group y canary siguen pendientes.

## 2026-08-21 — La revisión de confiabilidad pasa de reportar síntomas a medir causas

- `EPIC-041` reemplaza a `TASK-1432` y `TASK-1710`, dos umbrellas P0 que describían el mismo incidente con un mes
  de diferencia, sin referenciarse y sin una sola task hija; el epic conserva un baseline de 16 hallazgos medidos
  contra PostgreSQL y fechados, con la instrucción explícita de re-medir antes de actuar.
- Siete hallazgos previos quedan reclasificados como mal calibrados o falsos positivos: los "4 leads de Growth" son
  correos de prueba con runs no releasables, la "retención en drift" es un documento anulado que el reader no
  filtra, el "rate MXN/CLP faltante" es una señal insatisfacible por diseño USD-pivot, y los "79,6 días" de
  writeback son la edad del ítem atascado, no la frescura del tablero.
- El bridge income→HubSpot se degrada de P0 a P3: su endpoint receptor `/invoices` nunca se escribió y 80 de 84
  incomes vienen de Nubox, que estructuralmente no traerá anchors. Las cotizaciones sí llegan al CRM.
- `TASK-1760` documenta que PPM y retenciones no se recalculan desde el 2026-06-20 porque **nunca se cableó un
  disparador** — el IVA sí tiene projection reactiva y por eso está al día —, y que su señal de drift es ciega a un
  período ausente porque parte desde las posiciones existentes.
- Queda registrado que sacar `skipped` de `isSuccessOutcome` no habría corregido los 9.001 falsos éxitos, que los
  produce `no-op`, y que la state machine de `handler_health` no tiene ningún test que la cubra.

## 2026-08-21 — GPT Image 2 gana transparencia end-to-end en código, con rollout aún gated

- La nueva matriz oficial cubre GPT Image 2/1.5/1/1 Mini/`chatgpt-image-latest`, endpoints, tamaños flexibles,
  edición/máscaras, streaming, precios, datos, provenance, deprecaciones y contradicciones entre páginas oficiales.
- Se elimina el fallback falso Greenhouse GPT Image 2→1.5; el helper valida transparencia/formato, máscaras,
  singularidad de salida y streaming no implementado antes de llamar al proveedor.
- Globe incorpora `backgroundMode` de forma provider-neutral en shape, catálogo, request, fingerprint, manifest y
  output; el driver comprueba alfa real y el Producer deriva selector/checkerboard desde constraints.
- `greenhouse-ai-image-generator` y `greenhouse-globe-model-fleet` quedan alineadas entre Codex y Claude; el gate de
  mirrors incorpora por primera vez el bundle completo de generación de imágenes, incluido `agents/openai.yaml`.
- La ficha GPT Image 2 separa código local verificado de reader/canary históricos. La variante sigue gated hasta
  deploy, canary billable, readback, GVC, promoción y rollback; WebP no se anuncia en la ruta PNG vigente.

## 2026-08-20 — El gate de rutas de skills queda sin enlaces rotos

- `validate-skill-routes --all` ahora reconoce las referencias canónicas de una misma skill alojadas en el runtime
  hermano del repo, sin permitir que una instalación global o externa oculte archivos faltantes.
- `resend-email-platform` incorpora sus tres referencias prometidas —dominios/tracking, webhooks/eventos y
  envío/límites— en espejos byte-identical para Codex y Claude, verificadas contra fuentes oficiales actuales.
- La guía de Resend separa el contrato documental vigente de la evidencia runtime que lo contradice: links con
  secreto siguen fail-closed y requieren `click_tracking=false` más un canary del href recibido.

## 2026-08-20 — Skill compartida para diseñar y operar dashboards en Google Data Studio

- La nueva skill `google-data-studio` queda invocable por Codex y Claude con bundles byte-identical y aliases para
  el nombre histórico Looker Studio; separa el producto de Looker/LookML y consulta fuentes oficiales fechadas.
- Cubre selección de gráficos, modelado, calculated fields, filtros, controles, parámetros, blends, responsive,
  rendimiento, credenciales, sharing y embedding mediante referencias load-on-demand.
- Su ejecución browser parte en `inspect`, distingue Browser/Playwright, Computer Use y Webwright, exige cambios
  atómicos por el autosave y protege OAuth, credenciales, fuentes reutilizables, sharing y costos con gates explícitos.
- La auditoría adversarial amplía el contrato con onboarding de Sheets/BigQuery, row-level security por email,
  lifecycle `refresh fields|reconnect`, copias/rollback, draft/published, extracts, freshness, delivery/alertas, APIs
  limitadas y una escalera de troubleshooting; también refuerza sesión autorizada y minimización de evidencia en
  ambos runtimes.
- El aprendizaje de operación con Search Console queda generalizado: polaridad inversa de Average Position,
  protección contra ejes globales en combos, rangos parciales visibles, cohortes `new|rewrite`, fórmulas ponderadas y
  una narrativa cliente que separa resultado observado, inferencia e impacto de negocio demostrado.

## 2026-08-20 — La tabla accesible del scorecard deja de inflar la página

- La tabla `sr-only` de Hiring > Evaluación aplicaba su caja de 1 px directamente sobre `<table>`;
  el layout tabular envolvía texto carácter por carácter y extendía el documento varios miles de píxeles.
- El fallback se conserva dentro de un wrapper genérico 1×1 clipado y gana semántica completa:
  `caption`, encabezados con `scope`, competencia, objetivo, puntaje y estado.
- GVC ya no ignora ese nodo y reporta `layout_out_of_flow_vertical_runaway` cuando un elemento
  `absolute|fixed` vuelve a extender anormalmente el layout vertical.

## 2026-08-19 — El lifecycle de correo quedó operativo, y la documentación decía que nada estaba aplicado

- **La doc mentía en la dirección peligrosa.** Runbook, arquitectura de webhooks, ledger de flags e
  `ISSUE-160` afirmaban "ninguna migración, ningún secreto, ningún webhook" cuando todo llevaba
  horas aplicado. Seguir el runbook al pie habría creado un segundo webhook al mismo endpoint
  —eventos duplicados que el dedupe por `svix-id` no detiene, porque son ids distintos— y una
  segunda versión del secreto, rompiendo la verificación del webhook vivo.
- **44 correos nunca llegaron** (23 `suppressed`, 21 `bounced`) — y todos van a dominios internos
  de Efeonce. Cero externos: los 8 `hiring_assessment_assigned` fallidos son direcciones de
  prueba/QA, no candidatas. El daño temido no ocurrió. `sent` nunca significó entregado, y ahora se
  puede demostrar cuáles no lo fueron y a quién. Lo que sí queda a la vista es data sintética
  circulando por el pipeline de correo productivo.
- **Faltaba suscribir `email.suppressed`.** El bloqueo de reenvío consulta ese estado para no
  mandar a ciegas a una dirección suprimida — y ese evento nunca iba a llegar. Falso negativo
  silencioso en la puerta de recuperación.
- **Los writers de credenciales corrían sin su backstop.** El índice único token-intent, que el
  runbook exige aplicar ANTES de desplegar esos writers, no existía. Aplicado, junto al CONTRACT
  de credencial, verificando una por una sus tres precondiciones de despliegue.
- **`mail.efeoncepro.com` está bien por nuestro lado y Resend aún no lo confirma.** DKIM publicado
  con valor idéntico byte a byte. Aprendizaje: re-disparar la verificación resetea los registros ya
  verificados a `pending` — se espera, no se reintenta.

## 2026-08-19 — El rollout de assessment iba a romper producción y a cortarle el test a los candidatos

- **Una migración que no era aplicable en ningún orden.** El CHECK y el trigger de versión de
  credencial rompían el writer que corre en `main`; el código nuevo rompía sin la migración.
  Partida en expand/contract, con la fase contract FUERA de `migrations/` — porque el runner
  aplica todas las pendientes en una transacción y un comentario de advertencia no detiene a un
  runner.
- **La sesión del candidato caducaba en el plazo para EMPEZAR, no en el de responder.** Quien
  abría el enlace poco antes del límite y arrancaba perdía la sesión a mitad del test.
- **Un enlace roto era invisible.** El bearer viaja en el fragmento, que nunca llega al servidor:
  si un reescritor lo borra, el candidato queda fuera sin generar un solo request. Ahora hay un
  hecho durable del canje y una señal que lo delata.
- **El cap de recuperación castigaba al candidato por fallas nuestras**: contaba intentos fallidos
  y compartía cuota con el enlace seguro, que es justamente el canal de rescate cuando el correo
  no llega.
- Todo salió de auditorías independientes con skills de arquitectura, talento y seguridad, corridas
  ANTES de promover. Dos auditores encontraron el mismo P0 sin verse entre sí.

## 2026-08-19 — Un guard que verificaba menos de lo que su propio Down borraba

- **La migration de TASK-1746 tenía un hueco silencioso.** Su bloque anti pre-up-marker contaba
  capabilities, triggers y columnas de sesión, pero no la tabla `hiring_assessment_public_request_bucket`
  ni las cuatro funciones de acceso público — que el Down sí dropeaba. La migration creció en dos tandas y
  el guard, que vive al final del Up, no se actualizó con la segunda. Un fallo en ese DDL habría quedado
  registrado como aplicado, verde, y sólo habría aparecido a las 04:17 cuando el cron de retención llamara
  una función inexistente. Corregido antes de aplicarla, así que no hizo falta forward-fix.
- **Regla nueva en la spec de migraciones:** el guard del Up debe cubrir todo lo que el Down dropea, y una
  migration editada en varias tandas necesita revisarlo en cada tanda. Es una comparación mecánica de dos
  listas: los `DROP` del Down contra los contadores del guard.
- **El ledger de flags afirmaba dos cosas falsas.** `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` figuraba ON en
  una sección y OFF en otra; la revisión activa `ops-worker-00585-nv6` lo tiene en `true`, así que la
  segunda era la equivocada. Y `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`, code-complete sin prender,
  sólo estaba en el snapshot y no en `§ Pendientes de acción`, que es donde la regla del propio ledger lo
  exige. Ambas corregidas contra runtime, no contra memoria.

## 2026-08-19 — Un patrón nuevo en el catálogo, y una señal que nadie había registrado

- **Octavo patrón canónico: "hecho declarado al nacer + copia derivada donde se filtra + obligación de
  propagar".** Cruzó el umbral de tres dominios que el propio catálogo exige (Hiring, Knowledge y
  Finance), y su valor no es describir lo que ya hacíamos: es forzar una decisión explícita. O te
  obligas a propagar en la misma transacción y con señal de divergencia —y entonces los readers pueden
  confiar en la copia—, o no te obligas y los readers críticos leen la raíz. Lo prohibido es el tercer
  camino: filtrar por una copia que nadie se comprometió a mantener.
- **Once señales del módulo Hiring estaban vivas en runtime pero sin documentar** en el control plane;
  ahora hay inventario con la task dueña de cada una. Ocho siguen sin delta propio: deuda documental
  declarada, no ausencia en producción.
- **Cinco punteros quedaron rotos** al mover TASK-1739 a `complete/`, uno de ellos dentro de una señal
  de reliability que corre en producción. Corregidos.

## 2026-08-19 — On-Going y On-Demand ya comparten una ontología sin confundir engagement con proyecto

- Se formalizó `Organization → Engagement → Project/Campaign → Task`: la organización y su Space conservan la
  relación y memoria; el engagement gobierna contrato, capacidad, economics y cierre; proyectos/campañas siguen
  siendo contenedores de tareas para ejecutar trabajo del cliente.
- Un engagement On-Going puede producir múltiples proyectos/campañas y uno On-Demand puede contener uno o varios;
  On-Demand describe un compromiso acotado, no un proyecto pequeño ni un retainer corto.
- La venta se activa hacia Delivery mediante una Ficha de Activación que referencia quote/SOW/contrato, y crea sólo
  la diferencia sobre el workspace durable. La Gantt es opcional y se deriva de Projects/Tasks.
- `Product Service` no se usa como sinónimo de todo lo vendido: campaña audiovisual, plan de medios, brandbook y
  otros servicios/deliverables conservan su categoría y nivel real de productización.
- El contrato queda `Proposed` y sin cambio de runtime. La forma física sobre `services`, Notion, HubSpot, Finance,
  equipos y Client Portal requiere cohortes reales, task y ADR antes de implementarse.

## 2026-08-19 — El acceso al test ya tiene sesión opaca y reloj autoritativo

- Cada credencial de evaluación tiene una versión explícita; las sesiones candidatas guardan solo un digest
  opaco vinculado a esa versión, de modo que una recuperación invalida de inmediato los accesos anteriores.
- El test distingue plazo para comenzar, plazo para responder y 30 minutos de gracia para revisar/enviar. Las
  evaluaciones sin límite cierran a las 24 horas y ya no aparecen como “0 min”.
- El navegador proyecta el reloj de base de datos con tiempo monotónico, por lo que cambiar el reloj local no
  adelanta ni atrasa los límites. Durante la gracia se congelan respuestas, pero revisar y enviar siguen activos.
- GET/start/save/submit y SELF-ID legacy mantienen decisión, consentimiento, captura y audit bajo una sola
  transacción. El código fue auditado sin P0/P1/P2; sigue OFF y sin migración aplicada hasta completar el
  fragment exchange, la cookie HttpOnly, Product API y los smokes reales.
- La frontera browser ya está implementada localmente: elimina `#access` antes de React/red, intercambia por cookie
  `__Host-` HttpOnly y usa rutas token-free con CSP/no-store/no-referrer. Maintenance y trailing slash no desvían el
  bootstrap; un fence evita que dos pestañas muten assessments distintos.
- El correo vigente no cambia al desplegar este código: el cutover vive en
  `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`, default OFF. ON queda bloqueado por migración+índice, rutas live,
  `click_tracking=false` de Resend, rate limit y smokes reales de href/cookie/browser.
- El backend de recuperación ya tiene un único command para email o enlace manual, Product API sólo para sesiones
  humanas y revelación one-time. Siempre rota el acceso del assessment existente; nunca crea otro test, reinicia el
  reloj, cambia etapa, score o respuestas.
- El guard antiabuso combina cuota por credential/sesión válida con techo IP confiable de Vercel. Tokens aleatorios
  inválidos no crean cardinalidad durable; la purga diaria drena con readback/señal. Savepoints conservan el consumo
  de cuota y revierten writes parciales si una acción falla.
- Arquitectura, manuales, issue/tasks y skills de Talento/Arquitectura/Secret Hygiene quedaron sincronizados. El
  runbook global de Resend fija orden de migraciones, índice concurrente, webhook firmado, reconciliación,
  `click_tracking=false`, smokes y rollback. Todo sigue `code complete, rollout pendiente`.

## 2026-08-19 — El reenvío gobernado de tests ya tiene command seguro

- La recuperación por email genera un acceso nuevo sin duplicar el test, conserva el plazo cuando la evaluación
  ya comenzó y registra actor, motivo y resultado sin guardar el enlace secreto.
- Si Resend acepta y el proceso cae antes de cerrar la operación, el sistema reconcilia el receipt desde evidencia
  durable sin enviar otro correo ni invalidar nuevamente el enlace; Platform Health muestra el drift restante.
- HTML y texto plano distinguen despacho de entrega, invalidan enlaces anteriores y, para tests en curso, piden
  continuar de inmediato con el deadline expresado en hora de Chile.
- El command está validado localmente, pero sigue inaccesible: el tipo de correo está OFF y faltan la sesión
  HttpOnly, API autorizada, migraciones, índice y smokes antes de cualquier activación.

## 2026-08-19 — Los correos con enlaces de acceso ya no dependen de reintentos ciegos

- Reset de contraseña, invitaciones, verificaciones, magic links, tests y acceso a Talent Pool comparten ahora
  una protección global: el sistema guarda una intención redactada antes de emitir la credencial y nunca
  persiste el enlace secreto para reconstruirlo después.
- Dos workers concurrentes o un replay del mismo evento no pueden rotar dos veces el acceso. Si el proveedor
  rechaza el correo se registra como fallo; si lo aceptó pero faltó confirmación local, se registra como incierto
  y requiere recuperación explícita en vez de afirmar que no salió o reenviarlo automáticamente.
- El cambio está validado localmente por Arquitectura, Talento y Seguridad. Todavía no está activo: primero se
  instalará el índice concurrente con readback verde, sin pausar el resto del correo del sistema.

## 2026-08-19 — La recuperación de acceso a tests ya tiene una base segura y auditable

- Se definieron dos permisos distintos: reenviar por email y revelar un enlace temporal. Ninguno recupera ni
  almacena el enlace anterior; cada acción futura rotará el acceso y quedará auditada sin nombre, correo,
  teléfono, URL ni token.
- La base bloquea recoveries sobre postulaciones cerradas, consentimiento retirado, tests terminados o timers
  vencidos. Un test iniciado conserva exactamente su deadline, accommodations y gracia; una transacción larga
  no puede confirmar después del vencimiento.
- La evidencia nace automáticamente en la misma transacción y la retención distingue candidatos de personas
  seleccionadas. El retiro de consentimiento Hiring no puede borrar registros que ya pasaron a retención
  laboral.
- Este slice está validado localmente pero todavía no opera en producción: la migración no se aplicará hasta
  que exista el command token-safe y los smokes PostgreSQL prueben ACL, concurrencia, rollback y purga.

## 2026-08-19 — El tablero de Hiring dejó de mostrar gente y vacantes que no existen

- **Lo que ve hoy quien abre el desk son procesos reales.** El tablero pasó de 24 vacantes y 79
  postulaciones a **2 y 47**: la diferencia no se perdió ni se borró, era dato de prueba que hasta ayer
  se contaba como si fuera un candidato o una búsqueda de verdad. Las dos vacantes vivas siguen ahí,
  con todos sus postulantes, verificadas una por una antes y después.
- **Menos filas no es pérdida de datos.** Si el tablero se ve más vacío que ayer, es porque por primera
  vez muestra sólo lo que representa a una persona o una búsqueda del mundo real. Lo demás quedó
  archivado y recuperable, no eliminado.
- **La evaluación con IA ya no puede aprender de respuestas inventadas.** Había una respuesta de prueba
  calificada con 90 puntos, lista para entrar al conjunto con que se calibra el sistema. No era un riesgo
  a futuro: ya había pasado. Ahora queda excluida sin interruptor para volver atrás.
- **Los conteos y métricas de contratación por fin cuentan personas.** Todo lo que se lee desde el
  tablero y la reserva de talento parte del mismo criterio, así que dejaron de convivir dos verdades
  sobre cuánta gente hay en un proceso.
- **Lo que todavía no cambia**: nueve registros de prueba quedan archivados en vez de borrados, a la
  espera de una decisión explícita. No aparecen en ninguna pantalla, así que borrarlos es prolijidad,
  no necesidad.

## 2026-08-18 — Evaluación provisional automática y CV por MCP interno

- Los assessments elegibles de cualquier vacante generan ahora evaluación IA provisional en segundo plano para
  operadores. No cambia el score efectivo y el postulante no recibe resultado, rationale ni estado de revisión.
- El expediente auto-propone análisis con CV procesado + assessment puntuado; la confirmación sigue siendo humana.
- Los agentes internos pueden leer el review packet exacto por MCP con CV minimizado/redactado y ligado a hash.
  Sin contacto, PDF crudo, ranking, decisiones, writes ni acceso B2B.
- La UI operator-only quedó compactada y validada GVC 4,82/5; su último ajuste visual aún espera promoción
  ordinaria. TASK-1742/1718 conservan observación, rollback y firmas pendientes.

## 2026-08-18 — Un dato de prueba de Hiring ya no puede hacerse pasar por un candidato real

- **La procedencia ahora es un hecho declarado, no una adivinanza.** Cada persona y cada vacante dice
  si representa algo del mundo real, y la postulación lo hereda de ambas. Antes la única forma de
  distinguir un seed de un candidato era adivinar por el nombre, y esa adivinanza falla en las dos
  direcciones: hay una respuesta REAL de un candidato que dice "pequeñas pruebas o pilotos" y que un
  barrido por regex habría borrado como basura.
- **Omitir la declaración deja el dato visible, nunca oculto.** Es deliberado: la suciedad es molesta
  y evidente; perder un candidato real sería grave e invisible.
- **Una vacante de prueba ya no se puede publicar.** Ocho llegaron a estar publicadas en el careers
  real y que ningún candidato externo postulara fue suerte. La guarda bloqueó el día uno al smoke que
  las creaba, que además nunca limpiaba lo que dejaba.
- **La IA deja de poder calibrarse contra respuestas inventadas.** El gold set excluye datos sintéticos
  sin interruptor para volver atrás: es evidencia de un gate de promoción, no una preferencia.
- **El desk podrá dejar de contar fantasmas**, detrás de un flag que nace apagado y con aviso previo a
  HR, porque 12 de 14 vacantes son sintéticas y sin contexto eso se lee como pérdida de datos.

## 2026-08-18 — Los dos flags que quedaron "ON con pendiente" ya tienen su verificación hecha

- **Canary de identidad del intake (TASK-1736), ejecutado y verde.** Los 5 puntos del runbook contra PG
  real: la evidencia guarda el nombre EXACTO como lo escribió la persona, la clasifica `degenerate_lower`
  y propone la versión capitalizada; la Person queda con esa propuesta y no con el verbatim; el audit
  registra `reconcile/applied`; un segundo envío en MAYÚSCULAS no duplica a la persona y deja el outcome
  del CAS; un reenvío idéntico no agrega evidencia. **Cero correos** emitidos.
- **El canary NO se corre contra una vacante real, y ahora el runbook lo dice.** Hacerlo mete un candidato
  falso en el pipeline de una vacante viva (llevaban 15 y 33 candidatos) y dispara el aviso a People. Peor:
  la evidencia es **append-only por grant**, así que ese candidato falso **no se puede borrar** — queda
  pinneado por FK hasta que un humano purgue con perfil `ops`. El carril correcto es un live test opt-in
  sobre una vacante desechable propia, que se despublica sola.
- **Expediente de evaluación (TASK-1735): el arreglo del truncado quedó probado con el caso real.** La nota
  posterior al fix persistió sus 8240 caracteres completos —termina en punto— contra los 8000 exactos de la
  mutilada, y la vieja quedó enlazada como _versión superada_, no como vigente. El límite en base ya es 20000.
- **Una señal que iba a mentir para siempre.** `evidence_coverage_gap` contaba TODAS las postulaciones, pero
  la evidencia sólo la escribe el intake público: cada postulación cargada a mano desde el desk (6 en 30 días)
  la habría dejado en `warning` de forma permanente, sobre la señal que justamente gatea este rollout.

## 2026-08-18 — Careers público en producción: una vacante que se lee como una oferta, y que Google entiende

- **Lo que ve ahora un candidato.** El detalle de una vacante dejó de ser un bloque de prosa con
  requisitos: hoy abre con la promesa del rol y sigue con qué resultados se esperan, cómo es el trabajo
  real, qué es imprescindible, qué es deseable y **qué puede aprender ahí** — separado a propósito, para
  que nadie se autodescarte por algo que el rol enseña. Lee además cuánto dura el proceso y **en qué
  plazo tendrá respuesta: 3 a 4 semanas**, avance o no. Y ve la vinculación sin letra chica: en Chile
  contrato laboral local; fuera de Chile, vía internacional con pago directo de Efeonce, sobre 20 países
  elegibles (toda Latinoamérica salvo Cuba, más Estados Unidos y España). Las dos vacantes vivas ya están
  escritas así.
- **Lo que ve Google.** Cada vacante publicada emite `JobPosting` estructurado, construido desde el mismo
  contenido visible en la página — nunca desde datos que la persona no puede leer. El schema **pasó la
  validación externa de `validator.schema.org` con 0 errores y 0 advertencias**. Una vacante remota sin
  países declarados sigue sin emitir schema, a propósito: es preferible no aparecer a aparecerle a alguien
  a quien no podemos contratar. Pausar o cerrar una vacante la retira del aire y del schema en el mismo acto.
- **Republicar una vacante viva ya no la saca del aire.** La barra editorial se exige al publicar por
  primera vez, no al volver a publicar: antes, pausar una vacante con postulantes en proceso la habría
  dejado en 404 hasta reescribir su contenido completo.

## 2026-08-17 — TASK-1740: una vacante pública tiene contenido estructurado y schema honesto

- **El contenido candidate-facing deja de vivir sólo en prosa parseada.** Un opening puede declarar
  el bloque versionado `PublicOpeningContent` v1 (promesa, resultados, trabajo, essentials/learnables,
  evidencia, modelo remoto, proceso, beneficios y compensación estructurada opcional). Se escribe por
  el command canónico con validación estricta (422); su ausencia degrada al fallback legacy de prosa,
  nunca a huecos. La allowlist pública sigue siendo la única puerta al navegador (anti-leak extendido).
- **El schema de Google nace del mismo contenido visible y es fail-closed.** Canonical explícito en
  toda leaf publicada; `JobPosting` JSON-LD detrás de `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`
  (Vercel-only, nace OFF). Remoto exige países elegibles ISO reales
  (`public_remote_eligible_countries` — `LATAM`/`Global` se rechazan como país); híbrido/presencial
  exige ciudad+país; salario sólo desde compensación estructurada; nunca `directApply` ni
  `validThrough`. Pausar/cerrar retira URL y schema (404). Hoy ninguna vacante viva emite schema
  (ambas son remotas `LATAM` sin país declarado) — comportamiento correcto por diseño.
- Estado: `code complete, rollout pendiente` (países por confirmar con People/Legal, flag
  staging→Rich Results→prod). TASK-1741 (renderer editorial) queda desbloqueada con fixture.
