# Handoff activo

**Inpainting en los CLIs (02/10, noche):** [TASK-1965](docs/tasks/in-progress/TASK-1965-ai-inpaint-image-video-cli-pipeline.md) in-progress (Claude, develop, sin push): `pnpm ai:mask` + `pnpm ai:inpaint image|video` en `scripts/ai/inpaint/**`, recomposición obligatoria con delta máximo 0. `scripts/foto/expandir.mjs` tiene WIP de otra sesión y queda fuera.

**Marketing Studio (02/10, noche):** [TASK-1894](docs/tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md) in-progress. A en producción. B (commands del catálogo, API 1.4.0, `pnpm studio:write`) en producción (`a8c7886`, health 1.4.0, smoke de sólo lectura); migración `1790967435017` en staging y prod. **Operador:** release de las capabilities de Greenhouse `9d0d698d4` (no autorizado) ; gateway sincronizado con el filtro de sólo lecturas (efeonce-mcp#23 mergeada, v1.10.0) y falta su deploy manual (`deploy.yml`). C diferido. [§7.4](docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).

**CMP-004 completa: 44 piezas aprobadas (02/10, noche):** set de 11 conceptos × 4:5, 9:16, 1:1 y 1,91:1 aprobado por el operador en el canvas y entregado en OneDrive Finales (`CONTROL-DE-PIEZAS` 44 filas con sha256 e id de Studio), Studio y AXIS Lab (banco «finales», AXIS `25f1b40`, 44 en vivo). Las 11 horizontales salen DESDE la escena 1:1 aprobada con `pnpm foto:expandir … --lienzo 2048x1072 --ancla derecha --fundido 120 --reponer no` (escena al 80 %; exige revisar caras) y llevan concepto reducido aprobado por el operador: la bajada va en el titular del anuncio de LinkedIn/Meta ([CDR-012](docs/campaigns/decisions/CDR-012-cmp004-reorientacion-por-servicios.md)). En Studio: subidas con `--ratio 191x100` y aprobadas; grilla corregida en `23e5787` (detalle en TASK-1894). Commits locales `2ff39fe96` (`foto:expandir`) y `ec9e8a00d` (CDR-012) **sin push**.

**Kortex hibernado + corte FinOps (02/10):** desde `2026-10-02T13:44:27Z`, Vercel pausado, Cloud Run internal/IAM/min0,
Cloud Tasks pausado/0 y `kortex-pg-dev` `STOPPED/NEVER`; no ejecutar adapter, smokes ni deploys para despertarlo.
Backlog Kortex retirado: `TASK-264/377/413/889/948/949` pasaron a `cancelled` por la pausa; ya no queda ninguna
task explícita de Kortex en `to-do` ni `in-progress`. Una reactivación requiere intake y tasks nuevas.
Septiembre observado: CLP 10.480,64 netos. Residual Kortex ~CLP 3.500/mes y total GCP CLP 237.068,14/mes
(rango 230k–245k) son **modelos**, no ahorro realizado; confirmar con ventanas post-corte. [Runbook](docs/architecture/kortex/operations/runbook.md) · [auditoría](docs/audits/cloud-cost/CLOUD_COST_AND_KORTEX_HIBERNATION_2026-10-02.md).

**Insights: qué dice el informe (02/10):** [TASK-1962](docs/tasks/in-progress/TASK-1962-efeonce-insights-report-content-contract.md) code complete local, sin push; va en el release de TASK-1957 y Think se empuja después.

**Insights apto para cliente (02/10):** [TASK-1957](docs/tasks/in-progress/TASK-1957-efeonce-insights-client-fit-presentation-contract.md) code complete local (Slices 1–6, sin push): vocabulario único web/PDF, modelo web 1.2, límites de lector, elegibilidad de figuras, roles, gate client-fit que bloquea emitir a cliente e indicadores AEO estándar (Share of Model, Share of Voice, tasa de mención, citas). Falta `pnpm build` autorizado, release y canary. [TASK-1958](docs/tasks/to-do/TASK-1958-efeonce-insights-client-fit-hierarchy.md) (jerarquía Think/PDF) bloqueada por 1957. Ninguna edición de cliente se emite antes de cerrar ambas.

**Release 02/10 (`6ea157e6e641`, PR #247, run `37003281899`):** develop→main `released` 12:04Z; watchdog ok 6/6; canary prod web Insights 1.1 (crear→leer `modelVersion=1.1`→revocar). Migración TASK-1950 aplicada antes del merge. `INSIGHTS_DELIVERY/SCHEDULES_ENABLED` ON en Production + EmailTypes de Insights ON (redeploy `dpl_B1v1vReWS44UYMi7u9LHKqSPpJ7K`); falta canary con sesión humana (lane `app`). `BRAND_RENDER_ENABLED` sigue OFF en prod (canary Proposal pendiente). [Tiempos](docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md).

**CMP-004 por servicios (02/10):** [CDR-012](docs/campaigns/decisions/CDR-012-cmp004-reorientacion-por-servicios.md) — 8 pilotos N2 certificados (`graphicLine`, `fde62f05d`); pendientes y artefactos en el CDR §6. Sin push.

**Registro cine sin consultor (02/10):** [TASK-1926](docs/tasks/to-do/TASK-1926-cine-register-idempotent-photo-pipeline.md) delta b en develop (último `00e53ef53`), AXIS en vivo. Dos pruebas ciegas: las sesiones llegan solas usando `cine-reviewer`; barra de luz recalibrada contra las aprobadas. Pendiente: veredicto del operador sobre `ai-generations/2026-10-02_prueba-ciega-cine-2/` y el orquestador idempotente. [Casebook](docs/operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md).

**Traje biónico de Nexa (02/10):** [TASK-1940](docs/tasks/complete/TASK-1940-nexa-bionic-suit-reference-kit.md) complete: kit sellado y publicado, catálogo sólo Nexa/cine, marcas armadas, NX7d canonizada. Pendientes (OneDrive, NX7d con titular, pose repetida de Nexa, Sparks en el publicador) en el delta de cierre de la task.

**Workbench:** Lab v6 publicado. Íconos: `af6f5e2` local, publicación pendiente. SKY local: 76 badges LEFT, 24 adaptaciones v6, 394 pruebas PASS; aceptación visual pendiente. [Estado](docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md). Efeonce ID diferido.

**Deck SEO/AEO — Search Visibility 360 (30/09):** [TASK-1949](docs/tasks/in-progress/TASK-1949-seo-aeo-deck-recipes-canonization.md) in-progress, code complete parcial: Slices 1 y 4 hechos (catálogo a 100 recetas, planes golden, docs y skills); Slice 2 (plantillas) y 3 (AXIS) en otras sesiones. Datos del deck tal cual por decisión del operador; logos de clientes con TASK-1937.

**DataForSEO CLI (30/09):** [TASK-1948](docs/tasks/complete/TASK-1948-dataforseo-url-keyword-relevance-cli.md) complete local, CLI 1.1.0: URL/host, JSON/CSV, techo y resume. [Evidencia](docs/audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md): 96 tests; prueba corregida MX para Berel USD 0,0284 reconciliados, 20 keywords/2 páginas y resume USD 0. Guías/skills sincronizadas; sugerencias con ruido editorial, CL separado. Typecheck global con WIP ajeno; sin push/deploy.
**Creative Workbench (30/09, actualización):** el harness activo está en `creative-workbench`; PR 11 (lotes) y PR 12 (círculos) integrados en main `2bb761a`. Skills Codex/Claude y documentación de SKY se publican en una rama aislada para no arrastrar commits ajenos de develop. Cargar [skill](.codex/skills/efeonce-creative-workbench/SKILL.md) y [estado fechado](.codex/skills/efeonce-creative-workbench/references/state-continuity.md). **Siguiente:** recomponer en corridas nuevas las dos muestras antiguas afectadas, completar revisión visual y flujo IA. Efeonce ID diferido en [TASK-1952](docs/tasks/to-do/TASK-1952-creative-workbench-efeonce-id-integration.md); sin AUTH paralelo. No ejecutar sync total heredado ni alterar CLIs Greenhouse. El corte anterior del PR 3 borrador queda superado; CI/código no acreditan deploy del broker ni IA habilitada.

**HubSpot Agent CLI / MCP (29/09):** CLI 0.15.0 instalada; OAuth `hubspot whoami` en Efeonce/Kortex `48713323` con lectura CRM live positiva. El conector MCP es el carril alternativo para operación directa, con identidad y permisos propios. `pipelines list` pide service key; HubSQL devolvió 403; `properties create` no ofrece `--dry-run` en esta versión. [Runbook](docs/operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md) y skills espejo actualizados. ANAM `19893546` no quedó autenticado por esta sesión CLI; verificar portal antes de cualquier operación.

**Deck de práctica Salesforce (29/09, cierre):** [TASK-1942](docs/tasks/complete/TASK-1942-salesforce-deck-recipes-canonization.md) **complete** (94/94 con plantilla, AXIS `v0.3.36`, insignia autorizada). Pendiente externo: autorización de Anthropic para Claude/Claudeforce en SF16 (TASK-1937). Siguiente: serie HubSpot (TASK-1943).

**AI Visibility Report y módulos de correo en AXIS (29/09):** AXIS `v0.3.38` publicado (`c92160b`; antes `v0.3.30`, `26097c5`): contrato `efeonce.ai-visibility-report` 0.1.0, `efeonce.email-modules` 0.1.0 (pie, CTA principal, agenda y bloque de marca por línea; «Suscribirme» retirado; el correo de Insights es una aplicación, no la plantilla), `graphic-line-orbit` 0.5.0 con el **recorrido desde las 12 en toda medida** (decidido por el operador), graphic-line 0.13.0 y brand-assets 0.4.6 (PNG de correo; logo y eslogan separados). Lab `/references/ai-visibility-report/` y `/references/email/`. Greenhouse fija 0.3.37 y **el adapter de la órbita (`scripts/creative/layout-compiler/graphic-line.mjs`, sólo acepta 0.3.1) ya da 0/7 en `develop`** desde `9289cab0c`; lo arregla el bump de [TASK-1944](docs/tasks/to-do/TASK-1944-efeonce-email-modules-adoption.md) o [TASK-1938](docs/tasks/to-do/TASK-1938-ai-visibility-report-pdf-la-orbita.md). **Decide el operador:** propósito del correo de Insights frente a la política de TASK-1764 (el contrato exige agenda, preferencias y baja en todo pie).

**Naming Efeonce AEO (29/09):** el [ADR aceptado](docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md) fija **Efeonce AEO** → **Efeonce AEO Assessment** → **Efeonce AI Visibility Report**. Documentación y skills se alinean conservando aliases técnicos/históricos; el copy de los runtimes públicos sigue pendiente de edición y readback. Search Visibility 360 permanece como oferta SEO+AEO.

TASK-1863: staging; main retenido.

**Avatares y firmas del equipo (29/09, noche):** los seis con bomber sobre polo piqué y fondo oscuro con el halo de la órbita (sin anillo); caras medidas con Vision. GCP `gs://efeonce-group-axis-public-media/team/avatars/v1/{1080,800}/`; firmas v3.1 en `…/email-signature/v3.1/people/` y paquetes en OneDrive `Alineación/6. Marca/Kit media/Firmas/`. Repo: `squad/` y `public/images/greenhouse/team/` a 800 px; referencias de identidad en `ai-generations/_identidad-equipo/`. Luis fuera del roster y del dashboard de Efeonce. **Firma, opción C (29/09):** el avatar con órbita mide 130 px (la de área, 106 px), a la altura del bloque de texto; AXIS `v0.3.35` (`e22051d`) publicado y fijado en Greenhouse; 9 firmas, páginas «Copiar mi firma» y zips regenerados (fotos: `firmas/fotos-orbita.mjs`). El operador avisa al equipo que vuelva a copiar. **Fondos de Teams (29/09):** nueve aprobados en la oficina moderna de Efeonce (logo 3D como product placement, órbita sutil, formato `teams` y logo 3D en el catálogo de `foto:prompt`), en OneDrive `Kit media/Fondos de Teams/` y en la página del kit de cada persona; portadas de LinkedIn/YouTube y avatar de redes parqueados (canvas https://claude.ai/artifact/72TN9B5x5NEz34kevCJQn4; el operador pidió portadas por servicio, sin decidir). **Kit del avatar (29/09):** página de descarga por persona en `gs://efeonce-group-axis-public-media/team/kit/` (`kit/paginas-kit.mjs`), carpetas de OneDrive `Kit media/<Nombre>/` con avatar y zip de firma (lo viejo en `Viejo/`) y aviso por TeamBot 1:1 + EO Team. **Pendiente:** congelar el gate visual deck-axis (declarado en BASELINE_DELTAS 2026-09-29 (s); lo congela esta sesión cuando la de Salesforce termine sus láminas; la deriva de Chromium desde `0323fb933` también va ahí) y el LinkedIn de cada firma.

**Manzanitas sin decisiones abiertas (29/09, tarde):** AXIS `v0.3.29` publicado con autorización (tokens/contracts 0.3.29, contrato 0.3.0, graphic-line 0.11.0: `closeCopy`, `teamPeople`, Trazo `republicar`/`enviar`, `slogan.widthEmByWord`). Greenhouse lo fija (`2c95e60b2`). El equipo real entra a las fotos de MCM: [roster](docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md), seis identidades nuevas en `PERSONAS` aprobadas por el operador. **La ropa la decide la línea de la pieza** (noche): hoodie en Servicios creativos, bomber o softshell en las líneas de negocio, para todo el equipo; `foto:prompt` lo exige con `linea` en la ficha. Falta foto actual de Humberly y Luis.

**Manzanitas en el Composer (29/09):** [TASK-1939](docs/tasks/complete/TASK-1939-manzanitas-artifact-composer-catalog.md) **complete** (carruseles aprobados por el operador; `pnpm test` completo y `pnpm build` en verde sobre `814255694`, CI 9/9): `pnpm manzanitas:compose` compone carruseles (PDF + PNG), story, blog, YouTube y pódcast desde el intent del contrato; 18 plantillas / 26 piezas, gate `--catalog=manzanitas` congelado (sección `2026-09-29 (r)`). Decisión abierta del operador: el eslogan de los cierres sigue la regla del 29/09 (debajo del logo, 64 %) y con logo de 400 px sólo Voice conserva la palabra en el acento (~460 px la conservaría en todas). Hallazgos para un patch de AXIS en la task. Todo bump de `axis-tokens` corre también `pnpm manzanitas:tokens --check`.

**Manzanitas en AXIS (28/09):** [TASK-1936](docs/tasks/complete/TASK-1936-manzanitas-register-axis-token-contract-charts-lab.md) **complete**. Publicado con autorización del operador: `v0.3.26` (tokens 0.3.26 `manzanitasRegister`, contracts 0.3.24, brand-assets 0.4.1, graphic-line 0.10.0 `/charts`) y el parche `v0.3.27` (contracts 0.3.27, contrato 0.1.1: el carrusel abre con su portada y cierra con su contraportada). En el mismo push salió `v0.3.25` de Glitch. AXIS `main` `6a1a912`; Lab https://axis.efeonce.org/references/manzanitas/. Greenhouse **no** fija estas versiones aún: la sesión de Glitch se ofreció a fijarlas (el par es tokens 0.3.26 + contracts 0.3.27). Pendiente de terceros: el e2e del deck del Lab espera 69 recetas y hay 78 (de TASK-1934; el CI de AXIS no corre e2e).

**Glitch Flash (28/09):** primer Glitch lanzado con la nueva línea (Flash · Claude Sonnet 5.5: 4 redes vía Metricool + post 251941 en el blog). AXIS `v0.3.24` publicado; Greenhouse lo consume y el Composer compone el Flash (en `origin/develop` hasta `24b165816`, CI 9/9 verde). **Cierre de pendientes (noche):** ruta productiva TASK-1921 acepta el Flash (`c43862008`); muletilla del video como dato (`video.closingLine`), licencia `press` gobernada sólo en el Flash y numeración contra lo publicado — `pnpm glitch:editions`: última #17, **próxima semanal #18** (`05e75f0ed`); Content Factory con `kind: glitchDrop`, botones, caption de embed, tabla stripes y fix `wp_slash()` del write path (`c6f076e9f`). **AXIS 0.3.25 publicado** (29/09, junto al release de Manzanitas); Greenhouse fija 0.3.28 (`44f8db3f0`) y `glitch.css` lee `trail.contexts` (`76376274a`). **Pendiente del operador:** (2) taller de motion: rama local `feat/glitch-flash-motion` (`8061c93`, `ce63091`) con `closingLine` y el Flash en motion — PROPUESTA sin aprobar; el manifiesto Flash de Greenhouse hoy rechaza `video`, decidir cuál manda; (3) artifact-worker staging con plantillas `Flash*` + smoke real. Bitácora: [`2026-09-28-glitch-flash-sonnet-55-production-method.md`](docs/operations/social/2026-09-28-glitch-flash-sonnet-55-production-method.md).

**Insights emisión/envíos (28/09):** `INSIGHTS_ISSUANCE_ENABLED` está **ON en Vercel Production** (valor exacto `true`) en `greenhouse-onfkul43q` / `dpl_CGuQvQgbJR3UmSjPbertT3FHXg3T`, Ready y con alias `greenhouse.efeoncepro.com`. Canary secuencial sólo sobre Greenhouse Demo: ecosystem verificó `insed-5cbe87ef…` `ready_for_review` + `deck_pdf` completado (`irun-5995b21e…`), y la sesión humana App de Julio emitió con HTTP 200; readback ecosystem `issued`. No se tocó ninguna edición de cliente real. La condición de audiencias de EPIC-046 P01 quedó cubierta por TASK-1852 (personas y servicios definidos); resta apertura humana. [TASK-1848](docs/tasks/in-progress/TASK-1848-efeonce-insights-sharing-delivery-and-schedules.md) sigue in-progress: sharing ON; delivery y schedules OFF.

**Insights web en Think (28/09):** [TASK-1875](docs/tasks/complete/TASK-1875-efeonce-insights-shared-web-render-think.md) **complete**. Informe live en producción (`think.efeoncepro.com/insights/r/<token>`) y muestra pública para clientes (`/insights/muestra`); sharing ON en producción con canary verde; WAF con excepción de Think. Pendiente fuera de la task: el próximo release de Greenhouse lleva `InsightWebModelV1` 1.1 (hoy en staging). Idea del operador en evaluación: recomendación contextual de cross-selling en el informe (no carrusel), sin task todavía.

**Rutas públicas / conexiones PG (28/09):** [TASK-1876](docs/tasks/in-progress/TASK-1876-public-route-connection-exhaustion-guard.md) rollout de staging completo y verificado (WAF sin drift, alerta `num_backends > 85`, `roles/monitoring.viewer`, ráfaga: 20×404 + 10×429 del borde, pico 26 → 6 en 1 min). **Próximo paso ≥ 2026-10-05:** revisar 7 días de logs de la regla de producción en Vercel Firewall y pasarla a `enforce` ([manual §3](docs/manual-de-uso/plataforma/operar-guard-rutas-publicas-y-saturacion-postgres.md)); eso resuelve ISSUE-174. Excepción de Think transferida a TASK-1875.

**DataForSEO (28/09):** TASK-1935/TASK-1651-A: [evidencia preservada](docs/operations/agent-context-history/handoff/2026-09.md). TASK-1651-B no iniciada.

**Ruta productiva de marca (28/09):** [TASK-1921](docs/tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md) en staging (flag ON, 6 catálogos + Insights verdes); federación en efeonce-mcp#22 sin merge; no promover a main.

**Composer `--freeze` (28/09):** sólo acepta la sección nueva sin sellar de `BASELINE_DELTAS.md` ([runbook §5](docs/operations/runbooks/composer-visual-gate.md)). Gate global rojo en 59 frames (ISSUE-122).

**Deck «La órbita» (28/09):** TASK-1927–1929 y TASK-1934 complete (78 recetas, AXIS `v0.3.23`). [TASK-1930](docs/tasks/in-progress/TASK-1930-deck-recipe-slot-data-bindings.md) in-progress: `bindDeckSlots` + `--bind` en `develop`; montos/equipo esperan TASK-1417/1418; ningún deck usa evidencia interna y el muro pide 9 logos (decisiones 28/09). Siguen 1931–1933.

**Plugin OpenAI Efeonce MCP (26/09):** [TASK-1904](docs/tasks/to-do/TASK-1904-efeonce-openai-plugin-private-distribution.md) registrada: marca, OAuth, skills e instalación privada Codex/ChatGPT sin revisión pública. TASK-1864 conserva routing/eval. Sin implementación.

**Glitch en el Composer (27/09):** [TASK-1923](docs/tasks/complete/TASK-1923-glitch-artifact-composer-catalogs.md) complete en local (`pnpm glitch:compose`).

**Glitch en AXIS (27/09):** [TASK-1922](docs/tasks/complete/TASK-1922-glitch-axis-franchise-token-contract.md) complete (AXIS `v0.3.12`).

**La órbita (26/09–01/10):** [índice](docs/operations/brand-graphic-line/README.md); perfiles sociales aprobados 01/10 (§10.1.1), sin publicar; Sparks: TASK-1941 complete. Pendiente: 5 preguntas del operador y TASK-1926.

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

**Efeonce Insights (estado actualizado 28/09):** generación, render, editorial v2, IA, sharing y emisión están ON en Production; delivery y schedules siguen OFF. TASK-1875 está complete; 1849/1876 siguen abiertas. **TASK-1847:** complete y en producción desde 24/09 (`ebb9212a32ce`), con renders productivos verificados.
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

**Archivadas el 02/10 (release develop→main):** entradas del 09–11/09 (Trendjacking «Nuestro Duo», vacantes LinkedIn, Performance & Commerce Distribution, Product Design 360, mapa de contenidos Notion, canales propios, social 09/09) en [2026-09](docs/operations/agent-context-history/handoff/2026-10-02-release-compaction.md).

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

## 2026-09-30 — Deck SEO/AEO: docs y skills (TASK-1949 Slice 4, Claude)

Norma §4.6 v1.17, catálogo v1.11, manual v1.12, funcional 2.8, arquitectura 1.6 y cinco skills con espejo. Decisión del operador aplicada (datos tal cual, delta b de la task). `brand:compose` del documento SEO falla hoy en `section-cine` (`gl-px-bodyTop`) por el Slice 2 sin commitear.


### AEO X-Ray — demo publicada y cierre documental (2026-09-30)

Think `be8d484`: demo publicada y aceptada. [Dossier](docs/think/aeo-xray-implementation-dossier-2026-09-30.md), [manual](docs/think/radiografia-aeo-manual.md) y [kit](docs/think/aeo-xray-nuevo-cliente.md).

TASK-1950/1951: integración Greenhouse pendiente, sin promoción; `sample_` no acredita grant. Deal 65352884246 en `presentationscheduled` verificado; correo redactado, envío no verificado.

Diferenciador comercial reconocido: [experimentar capacidad antes de contratar](docs/commercial/EFEONCE_VENTA_CON_DEMOSTRACION_CONTEXTUAL_V1.md); canon `context/09` y skills espejo Agency/Brand/SEO. Sistematización operativa aún propuesta.
