# Handoff activo

TASK-1863: staging; main retenido.

**Insights envíos (28/09):** [TASK-1848](docs/tasks/in-progress/TASK-1848-efeonce-insights-sharing-delivery-and-schedules.md) sigue in-progress: cero doble envío verificado en datos reales y fix de `email_delivery_id` en adjuntos (`8882af0e3`); lo abierto tiene otro dueño (TASK-690–693, 1849, 1875) o exige sesión MCP humana. Producción con flags OFF hasta TASK-1875.

**Rutas públicas / conexiones PG (28/09):** [TASK-1876](docs/tasks/in-progress/TASK-1876-public-route-connection-exhaustion-guard.md) code complete, rollout pendiente (ISSUE-174 open): falta `pnpm security:public-burst-guard --apply`, alerta `num_backends`, `roles/monitoring.viewer` a `greenhouse-portal@`, deploy a staging y ráfaga controlada ([manual](docs/manual-de-uso/plataforma/operar-guard-rutas-publicas-y-saturacion-postgres.md)). El apply WAF lo bloqueó el clasificador: lo corre el operador.

**DataForSEO CLI (28/09):** [TASK-1935](docs/tasks/complete/TASK-1935-dataforseo-daily-operator-cli.md) complete con `research` SEO/AI gobernado y reanudable y `serp-compare` transversal para entidades/aliases/múltiples dominios; Organic Live se serializa a una task por request y el smoke final desktop/mobile cerró ambas tasks `20000` por USD 0,0055. [TASK-1651-A](docs/tasks/in-progress/TASK-1651-growth-seo-dataforseo-ai-optimization-llm-sov-foundation.md) operativa: CHECK aplicado/validado y canary AEO USD 0,0101 con resume sin recompra. El [registro catalog-only](docs/architecture/GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md) documenta 225 rutas bloqueadas (216 de producto + 9 de infraestructura/plantillas) y su posible habilitación sin ampliar el allowlist. `1651-B` no iniciada; sin push/deploy.

**Ruta productiva de marca (28/09):** [TASK-1921](docs/tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md) en staging (flag ON, 6 catálogos + Insights verdes); federación en efeonce-mcp#22 sin merge; no promover a main.

**Composer `--freeze` (28/09):** sólo acepta la sección nueva sin sellar de `BASELINE_DELTAS.md` ([runbook §5](docs/operations/runbooks/composer-visual-gate.md)). Gate global rojo en 59 frames (ISSUE-122).

**Deck «La órbita» (28/09):** TASK-1927–1929 y TASK-1934 complete (78 recetas, AXIS `v0.3.23`). [TASK-1930](docs/tasks/in-progress/TASK-1930-deck-recipe-slot-data-bindings.md) in-progress: `bindDeckSlots` + `--bind` en `develop`; montos/equipo esperan TASK-1417/1418; mínimo de logos (9) por confirmar. Siguen 1931–1933.

**Plugin OpenAI Efeonce MCP (26/09):** [TASK-1904](docs/tasks/to-do/TASK-1904-efeonce-openai-plugin-private-distribution.md) registrada: marca, OAuth, skills e instalación privada Codex/ChatGPT sin revisión pública. TASK-1864 conserva routing/eval. Sin implementación.

**Glitch en el Composer (27/09):** [TASK-1923](docs/tasks/complete/TASK-1923-glitch-artifact-composer-catalogs.md) complete en local (`pnpm glitch:compose`).

**Glitch en AXIS (27/09):** [TASK-1922](docs/tasks/complete/TASK-1922-glitch-axis-franchise-token-contract.md) complete (AXIS `v0.3.12`).

**La órbita (26–27/09):** [índice](docs/operations/brand-graphic-line/README.md). Pendiente: 5 preguntas del operador y TASK-1926.

**Registro cine + taller (27/09):** [registro cine](docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (ads 9:16/4:5 en prueba); repo taller [`efeonce-brand-workshop`](docs/architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) + [TASK-1925](docs/tasks/to-do/TASK-1925-brand-workshop-migration.md).

**Marketing Studio (26/09):** TASK-1890/1891/[1893](docs/tasks/complete/TASK-1893-marketing-studio-original-asset-store-media-worker.md)/[1896](docs/tasks/complete/TASK-1896-marketing-studio-observability-restore.md) complete en producción (`92002873ced9`, PR #243). Pendiente: denegación live sin capability (1891).

**Marketing Studio — estrategia y agentes (26/09):** ADR de [estrategia](docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md) y [agentes híbridos](docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md) `Accepted`; TASK-1905–1916 to-do. Delegación `act`: [TASK-1917](docs/tasks/to-do/TASK-1917-efeonce-id-agent-run-delegation-act.md).

**Insights (26/09):** [TASK-1888](docs/tasks/complete/TASK-1888-efeonce-insights-editorial-contract-v2.md) **complete**: contrato editorial v2 en producción (flag ON en Vercel staging/Production y `ops-worker-00719-gbm`, gateway v1.9.0, canary sintético `insed-f5768172…` con plan v2). Rollback = flag OFF en los dos runtimes (`FEATURE_FLAG_STATE_LEDGER.md`). Siguen TASK-1889 (catálogos) y TASK-1903 (agente redactor).

**Insights diseño (26/09):** [TASK-1889](docs/tasks/complete/TASK-1889-efeonce-insights-premium-catalogs.md) complete en producción; primeras ediciones Berel/Sky verificadas. Emitir/compartir OFF; siguen TASK-1901/1902.

**ANAM Emma (24/09):** landing pública HubSpot `kortex-cms-react/30` verificada con el PNG entregado por María Paz,
cargo `Ejecutivo comercial ANAM` y avatar derivado con fondo menta en identidad de Customer Agent y chatflow
`96601133`. Canon técnico, funcional, manual y skill `hubspot-as-a-service` actualizados en
[caso ANAM](docs/architecture/kortex/hubspot-cms/anam-chat-landing.md). La verificación abrió el widget sin enviar
mensajes; no se repitió la regresión móvil ni conversacional del build anterior. Fuente CMS en
`../dev/kortex/hubspot-cms-react-project`, commit local `2229965` (sin push).

SKY: CDR-009.

**SKY Blog SEO/AEO (24/09):** HECHO end-to-end: `SVC-HS-591725750952`, términos `7c38b899…`, apply `EO-APC-9676214B`; SEO+AEO `contracted` ([delta TASK-1852](docs/tasks/in-progress/TASK-1852-berel-sky-service-access-and-channel-enablement.md#delta-2026-09-24--sky-blog-seoaeo-segundo-servicio-de-la-misma-organización)). Falta humano: login Sky, Search Console y keywords del blog (octubre).

SKY V17: companions Motion/Audio.

**Ads:** [CMP-001](docs/operations/social/2026-09-22-cmp-001-campaign-brief-handoff.md): 28 exports, 3 posts PENDING, sin pauta.

**Paid visual:** [playbook](.codex/skills/efeonce-advertising-creative/references/paid-visual-attention-playbook.md); sin resultados paid.

**Fotografía:** [canon](docs/operations/brand-photography/README.md) aprobado; reserva 2 abierta.

**CTA:** [corte](docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md#1910-regresión-y-mutantes-cómo-leerlos): tramo 16 local; novena sin informe, mutantes 81/175 parciales y P10 intermitente. No más rondas.

**CTA color (25/09):** [política por campaña](docs/architecture/EFEONCE_ADVERTISING_CAMPAIGN_COLOR_POLICY_DECISION_V1.md) optativa local; 39 tests, 14 verificaciones, 13 regresiones idénticas y 4 candidatas CMP-004 reproducidas. Revisión visual del operador pendiente; tipografía/espaciado sin implementar. [Evidencia](docs/audits/social/2026-09-25-cmp004-typography-grouping-review.md).

[EPIC-048](docs/epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md): revisión adversarial aplicada; ADR Proposed, tasks to-do; sin runtime/bono.

**DataForSEO:** ISSUE-175 y TASK-1341 cerrados (guard en `ops-worker-deploy`, revisión 00699, smoke AIO PASS).

**Humano-agente (19/09):** [oferta aprobada](docs/services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md),
con ruta CMO sin CRM obligatorio; TASK-1877/1878 sólo planificadas. [Demanda CL/es + GSC](docs/audits/public-site/2026-09-19-efeonce-human-agent-landing-demand.md):
rango 03 comercial, no volumen orgánico probado. Faltan prueba, CTA y QA; sin publicación ni paid.

**Berel campaña 2027 (19/09):** Color del Año, hub Colores de Temporada 2027 y Raíces de la piel con V2 en revisión
(publican juntos el 29/09; gate PASS). Pendientes: enviar mensaje a Berel (material de marca, menú, «2026»), rehacer arte
social (tareas 744–755) y gráficos 739/740 antes del 25/09. Septiembre: 12 artículos vs 8, 90 gráficas vs 50
([conteo](docs/audits/seo/BEREL_CONTEO_PIEZAS_SEPTIEMBRE_2026-09-19.md)); skill `berel-content-production`.

**Berel Frame.io (19/09):** [feedback visual de octubre](.codex/skills/berel-content-production/modules/20_REVISION_VISUAL_FRAMEIO.md)
clasificado en la skill y Notion. Sin masters: artes intactos, sin publicación. «Berel Squad» no visible en la cuenta de Julio;
cobertura limitada al share.

**16–17/09:** Higgsfield API con créditos. Previa 18: verificar · readback KV 21/09 y 23/09 · 24/09 `higgsfield-provider`.

**GTA VI:** posts 22 y 25/09 ([bitácora](docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md)).

**Posicionamiento CRM (18/09, documental):** solapamiento HubSpot/Salesforce en mid-market alto, agentes e
integraciones. `HubSpot-first`: crecimiento B2B, mid-market y time-to-value. `Salesforce-first`: org compleja,
gobierno, service a escala, extensibilidad e integración enterprise. También `híbrida` o `no-fit`; selección
no automática ni exclusiva.

**Dreamforce 2026 (corte 18/09, documental):** estados por producto en el
[`ledger`](.codex/skills/salesforce-crm-practice/references/dreamforce-2026.md); sin cambios de org, entitlement
ni contrato.

**UNBOUND 2026 (corte 19/09, documental):** estados por capacidad en la
[`matriz`](docs/services/hubspot-as-a-service/HUBSPOT_FALL_2026_UNBOUND_RELEASES_2026-09-16.md); sin activar
beta, permiso, campaña, conexión ni write. Verificar elegibilidad por cliente antes de vender o implementar.

**Contacto:** TASK-1801 cerrada; [alcance y evidencia](.codex/skills/efeonce-public-site-wordpress/references/landings/contacto.md).

**Creative/social 14/09:** `pnpm creative:layout` adapta `supportingTagline` y la selección colaborativa (templates en
`efeonce-advertising-creative`; Globe: `pending adapter`).
[Fiestas Patrias/Muertos](docs/operations/social/2026-09-13-fiestas-patrias-production-method.md)
y [Pódcast](docs/operations/social/2026-09-13-podcast-fotohistoria-production-method.md) están programados/PENDING,
no publicados; el video del Pódcast sigue suspendido. MCP sigue sin tool creativa federada.

**Efeonce Insights:** 1845/1846/1848 en producción (emisión/IA OFF; flags 1848 OFF), gateway 1.7.0; 1849/1875/1876 abiertas. **TASK-1847:** en producción 24/09 (`ebb9212a32ce`); falta canary de render; [evidencia](docs/tasks/in-progress/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md).
Estado vivo: arquitectura §14 y la skill `efeonce-insights`.

**Agentes HubSpot y ANAM (2026-09-13, documental):** Customer Agent de ANAM **activo en producción** (operador);
TASK-1403 reenfocada a landing del servicio de agentes (detalle en su Delta y en EPIC-047). **Pendiente con
autorización:** el artículo publicado del caso (post `251432`) aún dice «no operativo».

**Hiring (12/09):** `ISSUE-171`/`172` resueltos en producción (release `586a8627568a`); recuperación:
281 submissions / 0 sin postulación, 164 acuses, circuito `closed`, handler `healthy`. Evidencia y causa en los
issues y el [contrato ATS](docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md). Abiertos:
`ISSUE-173`/`TASK-1872` (consumer Phase A), `TASK-1873`/`1874` (intake y Application 360), seis CV en cuarentena
de `EO-OPN-0675`, readback del flag `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` y reader submissions↔postulaciones.

**Revisión DataForSEO (11/09):** [investigación](docs/research/RESEARCH-011-dataforseo-ai-skills-competitive-review.md). TASK-1870/1871 en to-do; ISSUE-170 pendiente. El allowlist vigente está en la skill; [contexto histórico](docs/audits/platform/evidence/task-1863/context-history.md).

**Portafolio de landings (2026-09-11, documental):** `EPIC-047` ordena las landings del sitio público en `Rank`;
cuatro cerradas por el operador (1799, 1358, 1351, 1352). Decisiones pendientes en el epic.

**Panel competitivo AEO de SKY (2026-09-11, operación + venta):** 5 runs del grader en staging (SKY, LATAM, JetSMART,
Avianca, Gol; Chile; set curado de 12 preguntas de aerolíneas; `EO-GRUN-00050`…`00054`), 2 aprobados en revisión
humana por el operador, 5 informes web + PDF entregados y correo enviado a Nicolá Lamiaux (se escribe sin "s"),
fuera de la licitación SEO. Método documentado: manual comercial `docs/manual-de-uso/comercial/panel-competitivo-aeo-en-venta.md`,
doc funcional `docs/documentation/comercial/panel-competitivo-aeo.md`, runbook del grader § "Panel competitivo
multi-marca", plantilla `seo-aeo-practice/templates/correo-panel-competitivo-aeo.md`. **Tres defectos del
grader medidos ese día, ya con task:** `TASK-1867` (P1: extracto de 600 caracteres sin texto completo → persistir y
medir la respuesta íntegra, score v3) y `TASK-1868` (P2: probes de `llms.txt`/`robots.txt`/`sitemap.xml` que toman el
HTML de un SPA por archivo real + detector de lenguaje sensible por substring). La capacidad gobernada del panel queda
en `TASK-1861` Delta (d).

**Trendjacking «Nuestro Duo» (2026-09-11, operación):** pieza 4:5 + Short 9:16 (Seedance 2.5) programados vía
Metricool en la marca Efeonce Group: Threads 11-09 12:30 · Instagram 11-09 19:00 · LinkedIn página 12-09 11:00 · YouTube
Short 12-09 12:00 (todos `PENDING`; **falta confirmar publicación**). Skills `social-media-studio`, `copywriting`,
`greenhouse-ai-image-generator` y `motion-design-studio` actualizadas con los aprendizajes. Detalle e ids:
`docs/operations/social/2026-09-11-iphone-duo-trendjack.md`.

**Vacantes en LinkedIn (2026-09-11, operación):** 4 vacantes vivas programadas vía Metricool (perfil del operador +
página Efeonce, 11:00 Chile; **falta confirmar publicación**). Pendientes: ficha de `EO-OPN-0009` sin "caso ficticio" ·
Careers sin UTM por postulación. Detalle: `docs/operations/hiring/2026-09-11-linkedin-vacancy-distribution.md`.

**Performance & Commerce Distribution (2026-09-10, documental; `Proposed`, no autoriza venta):** ADR
`EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md` + ficha + Pricing Integrity Pack `hypothesis_only` + market
update 2026-09-10 + PDR-022 (spoke `/servicios/performance-marketing`). La capability tiene dos motions (Demand & Commerce ·
B2B Pipeline), los canales son cobertura y programmatic va vía partner con cláusula de transparencia. Niveles al piso de 45%:
USD 2.400 / 5.900 / 11.800 al mes. El costo del Performance Lead (USD 5.500) es hipótesis: el catálogo no tiene el rol.
Registry: diez relaciones nuevas `No iniciado`. Pendientes con dueño: retiro de `EFG-003` (asignado a Wave, bajo el
piso), costo del lead, overhead y piso (Finance) · posición sobre datos first-party bajo la Ley 21.719, vigente el
2026-12-01 (Legal) · verificar Google Partners y cerrar términos con Real Audiences, partner programático seleccionado por el CEO
(fees, cláusula de transparencia, brand safety, CTV, ABM y certificación de trader; Commercial) · G1: dos
Diagnostics pagados en 90 días, uno por motion · TASK ui-ux de la landing, sin crear. Sin runtime ni push.
Canales emergentes: ChatGPT Ads `selectivo` donde existe (LATAM: sólo BR/MX; Chile no), X Ads bajo pedido, Perplexity
`no disponible`. **Landing: `TASK-1865`** (to-do, ui-ux/flow, UI ready no; reservada como 1864 y renumerada porque la
tomó en paralelo la task del MCP autosuficiente) con wireframe, flow, motion, dirección "La señal" y brief SEO/AEO. La
legacy `/servicio-gestion-campanas-publicitarias/` (`242862`) muestra contadores en cero y un claim de Google/Meta
Partners no verificado en producción; el owner decidió no parcharla: la página se construye desde cero y la legacy sale
con 301. Investigación Semrush por país completada (keywords por país, title y FAQ en
`docs/audits/public-site/PERFORMANCE_LANDING_KEYWORD_RESEARCH_BY_COUNTRY_2026-09-11.md`).

**Product Design 360 (2026-09-10, modelado y canonizado; oferta `Proposed`, no autoriza venta):** business model
V1.1 + ficha `docs/services/wave/product-design-360.md` + ADR `EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md`: capability de
oficio con dos ofertas por comprador (producto → Product Design 360 · sitio público → Web Experience 360), siete lanes
con accesibilidad primero; se venden lanes, nunca horas ni pantallas. `creative-practice` corregido: Superside mínimo
USD 15.000/mes (decía ~5.000, error 3×). Landing `TASK-1859` creada (to-do, UI ready no; no se indexa hasta
`Commercially approved`). **Colisión de ID resuelta:** la landing de Trade Marketing & BTL, que usó `TASK-1859` en
paralelo, se registró como `TASK-1860` (`a2081e4f1`); `TASK-1859` es la landing de Product Design 360 y no
cambió. Pendientes con dueño: G1 demanda (Commercial) · D7 loaded cost chileno de un
senior product designer y piso de margen por lane (Finance) · IP del design system, datos de research y marco chileno
de accesibilidad (Legal) · nombre público D1 (Strategy) · Calculadora de Capacidad (wedge, sin task). **BP9** (Head of Design in-house) agregada a `13_icp` como persona
candidata: su plan de validación —≥ 5 conversaciones con Heads of Design— valida también el copy de la landing.

**TASK-1858 — conciliación bancaria ago–sep 2026 (2026-09-10, in-progress; Slices 1/2/3/5 hechos):** release
`2cf8c26cfa2d-8f79606f-8cb3-4154-a7fd-c570e7af8497` `released` 20:06Z (PR #233, run `34523159501`, un intento,
bypass forense por la migración de TASK-1604 ya aplicada; watchdog 5/5, `ops-worker`/`auth-server` change-gated
en `f8803acc3` con árbol equivalente). Producción y el worker sirven `ISSUE-169`; saldos = banco (Santander CLP
33.002.610 · USD 336,44 · Global66 16.468 · MXN 10 · Banco de Chile 3.660.000 · TC 1.532.944; CCA −125.194).
`fx_drift` cubre USD/MXN (0 drift contra PG real). Manual v1.2 con rutina mensual + decisión Nubox (facturas
`EXP-NB-*` siguen por plan `pay_expense`). OTB del CCA al 01/08 = 2.141.867 `estimated`
(`obtb-sha-cca-julio-reyes-clp-20260801-275f0308`): pasa a `reconciled` cuando el accionista confirme.
**Slice 4 (Payroll):** Humberly cobra **450.000 líquidos**; v2 (desde 01/07) quedó cargada como bruto por error
(boletas: julio 300.000, agosto 450.000; pagado 450.000 ambos). La reliquidación canónica se detuvo en la guarda sin
escribir (v2 con entries exportados no se edita; el recálculo por entry conserva la versión del entry; el del
período completo tocaría a Felipe Zurita y María Fernanda González en julio). El operador pidió **no forzar**: los
complementos `EXP-RECON-20260803-57fj` (195.750) y `EXP-RECON-20260903-bcfh` (68.625) quedan asumidos
internamente como costo laboral. Desde 01/09 rige `humberly-henriquez_v3` (bruto 530.973,45 = 450.000 líquidos; v2 cerrada al
31/08): **Humberly debe emitir boletas por 530.973 desde septiembre**. Pendiente con el operador: sueldo
empresarial de Julio (2×1.000.000 del 07/09 como expenses `payroll` sin entry), estado de cuenta TC de mayo para
Melkin (`EXP-202604-005`), y el PDF `36_16359_420051383906_2026-06-30.pdf` para el crédito antiguo.
Contable a revisar: pagar el bruto sobre boletas con retención deja la retención sin documento propio.

**TASK-1604 / SEO (2026-09-13):** piloto manual autorizado; calibración independiente pendiente.
Nueve preguntas y template/policy `enabled/manual` vinculados a `EO-OPN-0674` (75 min, cap 5/h), binding
verificado por API/reader. [Evidencia](docs/audits/hiring/2026-09-13-seo-assignment-readiness.md).
D4 desplegado en producción con release `cc3ec449495ba6b866ecdb8fa4fe309a9a991fd9`, canary sin efectos.
Recorrido sintético y automatización pendientes; sin asignaciones/correos; Arte intacto.

**TASK-1832 (2026-09-18): corrida canary retirada; gates OFF con readback servido. Sigue `in-progress`.**
Authority revocada; cleanup sujeto-específico (`74638aed0`, perfil `ops`) con readback cero y CIMD compartido
preservado. Apagados:
GitHub repo var `EXTERNAL_IDENTITY_CANARY_ENABLED=false` (sin overrides) → auth-server `00076-t2t` sirve `false`
(mismo SHA `bda1cf2cd938`); Vercel Production `false` + redeploy `dpl_CWnDKTVm…`; `efeonce-mcp` environment
`production` `MCP_NATIVE_EXTERNAL_CANARY_ENABLED=false` → gateway `00056-kgs` sirve `false`. Flags generales
intactos. Para cerrar faltan la muestra steady por sujeto 2026-09-14→retiro y `pnpm test` + `pnpm build`.
No volver a correr revoke/cleanup.
Lecciones: runbook §Diseño de la corrida.
[Evidencia y alcance](docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_task-1832-canary-20260906-a.md).

**Sistema de contenidos Notion (2026-09-10, mapeado / sin mutaciones):**
[mapa canónico](docs/operations/EFEONCE_CONTENT_SYSTEM_NOTION_MAP_V1.md) de Pilares JTBD + Content Hub +
Calendario + Wiki, con IDs y schema. Corrige `PDR-020` a rev 1.5: los Pilares JTBD son el eje temático
canónico y las franquicias son ortogonales; `LinkedIn Julio` es canal aparte. Tres fracturas medidas: dos bases de Calendario con schema idéntico (100 filas de histórico vs 66 a
futuro) que parten la evidencia de velocidad; **0 de 66 filas del calendario vigente declaran Pilar
JTBD**; y el Content Hub no tiene propiedad de destino Think/WordPress (`Enlace` en 5 de 41). Pendiente
del operador: autorizar los cambios propuestos, en orden — etiquetar Wiki, poblar Pilar JTBD, agregar
Destino, luego schema del calendario, y por último decidir el corte de calendarios (el único que puede
romper histórico). Nada escrito en Notion.

**Canales propios Efeonce (2026-09-10, decisión cerrada / ejecución no autorizada):** seasonalities conservadas
como línea propia de marca (rev 1.4): son temporadas con ventana por mercado, NO efemérides; hogar Instagram,
sends+saves, LinkedIn recibe argumento y no caption. Plan 2026–2027 sin cambios de alcance.
[PDR-020](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md) rev 1.2 — rol y catálogo por
canal, franquicias con canal-hogar, vocero Julio Reyes. Propagado a `TASK-1802`, `PDR-003/004/005/019`, roadmap,
context pack y diez archivos de skills espejados. Pendiente: 7 decisiones, entre ellas canonical de video (bloquea
TASK-1802 y YouTube) y el plan estacional 2026–2027. Nada producido ni publicado.

**Social Efeonce, 09/09:** [13 piezas y skills](docs/audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md).
Pendiente: conciliar MET-2339–2342 tarea/calendario. Producción abierta; cierre documental sin cambios Notion.

**EPIC-046 / TASK-1852 (09/09):** Production `released`; [evidencia y pendientes](docs/audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md).
PR #231/main `5726ce9d90`, orquestador `34416904936`; gates y watchdog verdes; excepción pause auditada.
**10/09 RELEASE `f69b9d32` (PR #232, run `34431792218`, manifest released 03:16Z, watchdog 5/5, canary 5/5):** términos con
`bundledModules`, autoridad `delegated_oauth`, invitación diferida, chats Teams `ready`, preferencias `client_service_default_v1`;
flag writes ON horneada. **07:40Z apply Sky HECHO por MCP delegado con token del operador** (`EO-APC-ECD63852`, sólo preserve,
replay OK) = canary humano del canal cerrado. Berel sin entregar invitaciones (bloqueo del operador hasta UI);
`/creative-hub` → `TASK-1857` (es el módulo de Sky; 1687 no supersede).

**EPIC-045 ↔ EPIC-046:** Hitos I/N obligatorios: Insights cliente/interno + email/in-app/Teamsbot con
deep links; shared separado y móvil posterior. Contrato en arquitectura Insights §§7.1/9.1 y ADRs.
P01/P09 incluyen destinatarios/canales; TASK-1848/1849 distribución/experiencia; TASK-690/693 Hub y
preferencias. UI TASK-1854/1856: ocho docs detallados (dirección/wireframe/flow/motion), requisitos en 1853/1855; UI ready no, GVC pendiente.
Primer email/in-app acompaña apertura cliente; Teamsbot por destino verificado. Reusar dueñas, sin otro Hub.

**GPT Image 2.5 + contrato de imagen — TASK-1851 EJECUTADA (2026-09-16), NO cerrada.** El helper transporta la
familia 2.5 y decide por **capacidad declarada**, no por literales. Cinco puertas dejaron de degradar en silencio.
🔴 **El carril `google-imagen` estaba MUERTO, no "bloqueado"** (probe `404`) y era el default: migrado de
**provider** a `gemini-3.1-flash-image`/`generateContent`, default → `openai-image`. Primera medición propia del
costo de 2.5 (ver changelog).
**Gates:** test y build verdes. **Pendiente:** los dos entregables de Globe, **sin hacer
por instrucción del operador** (hibernado). Todo en [`TASK-1851`](docs/tasks/in-progress/TASK-1851-openai-image-provider-contract-consolidation.md).

**TASK-1844 COMPLETE (2026-09-08):** producción ON para una identidad; SQL aplicada y fixtures retiradas.
Codex y Claude Code/hospedado/Desktop certificados, rollback probado (Claude Code exige login tras OFF).
PR 230/main `45f6910e3`, checks/orquestador `34281143424` success, manifest released y watchdog 5/5.
Conexiones definitivas conservadas; sólo se sustituyó Claude hospedado del canary bajo autorización.
Docs/skills reconciliados con tres subagentes; [manual de uso](docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md) y [cobertura](docs/audits/mcp/TASK-1844_DOCUMENTATION_SKILLS_CLOSURE_2026-09-08.md).
Push documental disparó auth deploy por su README: run `34284610774` cancelado, sin nuevo build/revisión; tráfico conserva `00048-4vq`. Efecto y prevención documentados en runbook/skills.
[QA](docs/audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md) · [runbook](docs/operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md).

**Berel (2026-09-08):** [cadencia mensual](docs/operations/BEREL_CLIENT_COLLABORATION_OPERATING_MODEL_V1.md)
aprobada internamente y skill espejo alineada. Activar sólo tras aceptación de Anel, Fer y Marce; no se envió
correo ni cambió Notion/calendario.

**TASK-1813 — COMPLETE:** cierre histórico en `1.2.0`/`00047-8b5`, discovery base-only y lecturas sin gasto en la
matriz de clientes; sin widening ni cambios Entra. Multi-org queda en TASK-1844/U19.
[Task](docs/tasks/complete/TASK-1813-efeonce-mcp-oauth-client-interoperability.md) ·
[auditoría](docs/audits/mcp/TASK-1813_OAUTH_HARDENING_QA_2026-09-07.md).

**Historia TASK-1832 2026-09-06/07:** releases, clientes, correo, passkeys, observaciones y la excepción de
migración están preservados en la [task](docs/tasks/in-progress/TASK-1832-efeonce-mcp-client-canaries-and-first-customer-cohort.md)
y el [manifiesto](docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_task-1832-canary-20260906-a.md); no repetir
sus snapshots aquí.

**TASK-1835 (EPIC-044 U06) — `COMPLETE` y EN PRODUCCIÓN 2026-09-06 (Claude greenhouse-eo-06, 2026-09-06;
commits `85c67e97d` · `4eb358d5b` · `b15b1690e`).** Efeonce ID queda enterprise-ready en local. Tres hallazgos que
importan más que el trabajo planificado:

1. **El login por passkey no existía.** Backend (`/auth/passkeys/authenticate/*`) y copy estaban desde el
   2026-09-04, pero `/login` no ofrecía el método: los cuatro ids `login_passkey_*` llevaban dos días huérfanos.
   Hallazgo del operador. Implementado con el patrón del step-up; `renderLoginPageResponse` exige el nonce en su
   TIPO, así que el compilador —no la disciplina— impide servir la página sin script.
2. 🔴 **`violations: 0` de axe era una medición vacía.** En las 40 capturas del emisor axe devolvía las 24 filas de
   texto de cada página en `incomplete` («background could not be determined due to a pseudo element»): el lienzo
   pinta su azul con degradado y `::after`. Nunca midió una. Debajo del cero, la ficha de aplicación y el aviso
   «no verificada» del consentimiento estaban a **1.53:1**. Causa raíz: `.id-context`/`.id-muted` compartidas entre
   la ficha (sobre el azul) y el bloque del destino (dentro de la tarjeta) — un color cruzando fondos opuestos.
   Mecanismo nuevo `pnpm auth-server:verify-contrast` (muestrea píxeles): **272 textos, 0 bajo el piso WCAG**.
   _Aplica más allá de esta task: cualquier superficie con fondo compuesto tiene el mismo punto ciego._
3. 🔴 **Ninguna PERSONA puede crear una passkey.** `/auth/passkeys/register/*` existe y no tiene superficie; el
   step-up sólo enrola TOTP. **Corrección del operador:** dije que eso bloqueaba la certificación de U07 y es
   falso — `scripts/auth-server/external-passkey-canary.ts` (TASK-1832, Codex) ya ejecuta registro y login con una
   passkey de plataforma real en Chrome persistente, en el origen real, sin CDP ni autenticador de software. Falta
   la PANTALLA, no la capacidad: quien recibe una invitación depende del correo en cada entrada. Registrado como
   **`TASK-1842`** (`/account/credentials`, ui-ux, con el nodo S11 del flujo maestro y un gate de cobertura
   endpoint→consumidor). Pesa sobre el primer piloto cliente (U16), no sobre el canary.

Evidencia: GVC premium **29 fixtures** × desktop 1440 y móvil 390 = 58 capturas 29/29; scorecard 4.63 / piso 4.5;
los cuatro gates `ui:*` PASS; suite del emisor 427; typecheck y lint limpios. Patrón «runtime sin React» en
`PATTERNS.md`. **Desplegado y verificado en vivo** (deploy `auth-server` 21:49 `success`): botón de passkey, pie de
licencias y arreglo de contraste sirviendo en `auth.efeonce.org`.

**Para quien siga:** el aviso de códigos de respaldo quedó con tres tests en la suite —vistos ponerse ROJOS al
quitar el comportamiento, no sólo verdes—, porque un script suelto que hay que acordarse de correr es un mecanismo
apagado. Y ojo con `auth-server-deploy.yml`: dispara con `src/lib/**` sobre el Cloud Run ÚNICO que sirve
`auth.efeonce.org` en vivo — el push ES el despliegue, incluso si el push lo hace otra sesión sobre la rama
compartida (pasó hoy: Codex empujó y se llevó estos commits).

**TASK-1832 / TASK-1841 — certificación sintética separada del piloto cliente (Codex, 2026-09-06):** U07 ya no
usa una organización cliente real para probar la tecnología. TASK-1832 certifica el camino productivo completo
con cuentas M365/Google controladas por Efeonce, personas `data_origin='smoke_test'`, organización canary no cliente,
binding de propósito explícito, Claude/Codex/ChatGPT y Chrome/Safari; un verde acredita preparación técnica, no
adopción ni usabilidad cliente. TASK-1841 (U16) reserva el primer uso real para una organización ya existente en
Account 360, un administrador consentido y una capability read-only vigente, sólo después de TASK-1832/1833/1835,
con acompañamiento y observación por siete días. El cliente nunca actúa como tester ni comparte tokens o logs.
Este cambio es sólo de tasks/registry/README/epic/handoff/changelog: no crea cuentas, bindings, migraciones, flags,
invitaciones, implementación, push ni rollout. Siguiente ID libre: TASK-1842.

**TASK-1840 — logout multiproducto registrado, sin implementación (Codex, 2026-09-06):** unidad backend-critical
separada de TASK-1834 para tres operaciones distintas: salir sólo del producto, cerrar la sesión Efeonce ID del
navegador actual y cerrar todas las sesiones. El contrato exige `sid` opaco, RP-Initiated/Back-Channel Logout,
ledger/tombstone server-side por RP, fan-out durable, revalidación, auditoría, señales, conformance multi-RP y
rollback. No revoca consentimientos, roles, entitlements, memberships, `gv`, factores ni upstream Microsoft/Google.
TASK-1834 y Globe quedan como consumers separados. Sólo task/registry/README/epic/handoff; sin código, migración,
flag, push, deploy ni modificación de TASK-1834. Siguiente paso: Slice 0/Delta ADR con checkpoint humano.

**TASK-1834 — dirección v2 de login único Greenhouse/Efeonce ID aprobada, sin implementación (Codex,
2026-09-07):** después de revisar la UI real, se rechazaron dos modelos: `Continuar con Efeonce ID` como quinto
provider mezclaba producto, autoridad y método; un CTA genérico `Continuar` todavía creaba un login antes del login.
La decisión vigente mantiene Greenhouse como URL/contexto de entrada y autoridad de producto, pero `/login` de una
cohorte habilitada crea la transacción y redirige server-side sin pantalla ni flash intermedio. Efeonce ID muestra el
único login visible, `Entra a Greenhouse`, desde un RP/transacción registrados y ofrece Microsoft/passkey/correo. Si
la sesión del issuer satisface assurance, vuelve sin mostrar login; el first-party sign-in tampoco muestra
consentimiento delegado. Login MCP/terceros conserva consentimiento. El login directo mantiene `Entra a Efeonce`.

La decisión transversal ya no vive en TASK-1834: EPIC-044 y el ADR Accepted
`EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` son dueños de entry, RP confiable, fast path,
aislamiento y frontera de consentimiento. TASK-1834 queda como primer consumer Greenhouse. EPIC-044 y
TASK-1829/1830/1831/1833/1834/1840/1841/1842 quedaron sincronizadas; las skills `efeonce-mcp-platform` y
`greenhouse-ai-design-studio` cargan el ADR. El ADR nativo previo conserva su historia y suma sólo un delta.

El resolver trata `0 | 1 | many`: deny, contexto único o selector Greenhouse server-authorized; nunca email,
query param, `LIMIT 1` ni suma de permisos. La foundation OIDC/resolver puede construirse en oscuro antes de
TASK-1833. Activar externos exige assurance TASK-1833, evidencia sintética TASK-1832 y piloto consentido TASK-1841;
el cutover amplio además espera invitaciones TASK-1839, logout TASK-1840 y credenciales/passkey TASK-1842. Cohortes
no habilitadas ven sólo el login vigente; recovery usa una ruta/estado sin auto-redirect para evitar loops. `UI
ready: no` hasta first fold contextual, checkpoint humano, GVC no-flash y scorecard. No hubo código, migración,
flag, commit, push ni deploy. Siguiente paso si se ejecuta: confirmar `/goal`, correr
`pnpm codex:task-hook TASK-1834` y planificar Slice 0; Slices 1–3 detrás de flags OFF antes de cualquier first fold
visible.

**TASK-1837 (EPIC-044 U12) — COMPLETE, en producción 2026-09-06** (release `b3e324cb5c8d`, flags
`EXTERNAL_INVITATION_*` ON, canary de contrato y federación MCP verificados). Evidencia completa:
[la task](docs/tasks/complete/TASK-1837-efeonce-id-external-invitation-delivery-delegated-authority.md).

**Pendiente real (no bloqueante):** (1) la **primera persona CLIENTE real** es decisión comercial tuya — hasta que exista, el flujo delegado de punta a punta y las dos tools del gateway sólo están probados en staging y por los negativos del canary; (2) la señal `identity.external_invitation.token_revealed` marca 3 por las revelaciones de prueba y **se apaga sola** al vencer su ventana de 24 h; (3) **punto ciego abierto en el gate de versión del gateway**: `test/version.test.ts` sólo compara el hash de las tools FEDERADAS desde Greenhouse, así que las tools propias del gateway crecieron la superficie de 37 a 39 con el test verde y `version` congelada — se subió a `1.1.0` a mano, pero la próxima volverá a pasar sin bump.

**Barrido documental del 2026-09-06 (posterior al release).** Tres agentes disjuntos actualizaron identidad, MCP/gateway y control plane de release: los dos docs funcionales y el manual de identidad pasan a estado de producción, el runbook del MCP documenta por primera vez que **el gateway se despliega por dispatch manual, nunca por push a `main`**, que su servicio Cloud Run vive en `southamerica-west1`, y la diferencia entre `GREENHOUSE_ECOSYSTEM_API_URL` (producción, la que usan los providers) y `GREENHOUSE_API_URL` (dev-greenhouse, fondeo Globe). El playbook de release suma el caso positivo del día y dos anti-patterns: pedir la autorización de mutaciones externas al EMPEZAR (costó 64 min con la evidencia ya verde) y no leer como drift un SHA distinto cuando los ÁRBOLES son idénticos.

**Dos defectos encontrados por la verificación cruzada, ambos cerrados el mismo día.** (1) El gate de versión del gateway medía sólo las tools federadas: `efeonce-mcp` PR #4 (`5c28a7a`) lo cambia a medir el servidor construido; visto encenderse en los dos casos. (2) Al agregar `efeonce.mcp.identity.write` se cubrió el documento del RECURSO pero no el bloque del emisor NATIVO, así que el scope salía sólo cualificado y un cliente que armara su authorize desde discovery nunca lo habría pedido: `efeonce-mcp` PR #5, abierto, con test de regresión visto fallar sin el arreglo. ⚠️ Ese fix **no** agrega el scope a Entra, que el ADR del gateway prohíbe explícitamente.

**TASK-1836 / TASK-1831 — evidencia consolidada, 2026-09-06:**
Tres subagentes actualizaron contratos, funcionales, manuales, tasks/epic y skills espejo.
[Mapa de construcción, pruebas y pendientes](docs/audits/2026-09-06-task-1836-1831-consolidated-evidence.md).
PR225 está certificado: main `08acfb2c6`, run `34000876213`, manifest released sin override.
Canary MCP real: emisión, lectura propia, aislamiento y revocación en 6.633 s; refresh y rollback
medidos. Piloto gv5, vencimiento original 2026-09-12T15:00Z, señales unaudited/mixed cero.
El fix directo quedó promovido por PR226 a main `456d9accf`: release `456d9accffb6-3b09047e-c37f-4ac7-acbc-0e463e1610fd`,
run `34005056894` success, auth `00032-h45` Ready100% y cinco servicios con el SHA exacto.
Flags OAuth/personas/interno ON; Microsoft visible y clic correcto en `/login` público a1440/390.
Gateway `00036-5wc` sigue Ready100%, nativo/interno ON. Próximos pasos: reconciliar alcance del PR
antes de promover (Claude añadió TASK1837 después del corte21aa), probar retorno humano `/auth/session`
y logout; completar matrices externas/multicontexto y WebKit con los owners. No extender el piloto.
El primer run `34004535327` quedó aborted por un deploy concurrente de develop; el retry se hizo sin bypass
tras drenar esa carrera. No existe todavía un nuevo canary humano directo completo.

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

Notas del 02–05/09 archivadas en [2026-09](docs/operations/agent-context-history/handoff/2026-09.md). Siguen abiertas: TASK-1829/1830 (rollout pendiente; magic link muerto en prod), TASK-1349 (Finance), TASK-1814 y TASK-1815.

## 2026-09-16 — TASK-1846 COMPLETE: render durable de Efeonce Insights en producción

Release `917491fd02e4` (PR #237, run `35154555317`, manifest `917491fd02e4-9231b87b-20da-43c3-abce-4348dccdda99`
`released` 22:02:41Z, un solo intento; watchdog `ok` 6/6, primer Job `artifact-worker` en el orquestador).
`INSIGHTS_RENDER_ENABLED` ON en Vercel Production (redeploy `greenhouse-d6l33zils`) + Job + `ops-worker`. Gateway
`efeonce-mcp` v1.6.0 desplegado (`00054-n78`). Canary productivo: render `202` → dispatcher automático → `completed`.
Siguiente de EPIC-045: `INSIGHTS_ISSUANCE_ENABLED` sigue OFF; `report_pdf`/`web` en TASK-1847/1848. Detalle: la task
(complete), ledgers de flags y tiempos, y la skill `efeonce-insights`.
