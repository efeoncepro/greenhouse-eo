# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-07-30 — TASK-1600: ownership de color transferido a AXIS

- AXIS publica la paleta portable completa y Greenhouse consume `@efeoncepro/axis-tokens@0.2.0`/`0.2.1` mediante adapters; el drift gate ahora verifica Greenhouse contra AXIS.
- GVC staging pasó rampas light en 1440/390, captura dark real en 1440/390 y dos capturas repetidas fueron pixel-identical; queda una diferencia de altura del full-page histórico pendiente de aprobación/re-baseline.
- Finance PDF y report-artifact comparados contra el parent commit: raster diff 144 dpi = 0 píxeles. Rollback rehearsal sobre `0.1.5` pasó 43 tests.

## 2026-07-29 — Social Media: modelo de negocio y Product Service V1

- Se documentó Social Media como servicio recurrente humano y gestionado por personas, con estrategia, contenido,
  publicación, community management, escucha, reporting y aprendizaje.
- Se añadieron el Product Service Contract, Business Model y Pricing Integrity Pack con packaging por capacidad,
  hipótesis de bandas, economics, guardrails y gates de validación.
- Se añadió el benchmark comercial [`Social Media Service Market Research`](docs/audits/commercial/SOCIAL_MEDIA_SERVICE_MARKET_RESEARCH_2026-07-29.md), con agencias globales, Chile/LATAM, tendencias, patrones de venta, pricing público y confidence/limitaciones.
- Se añadió el [`Social Media Subservices Catalog V1`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md), que detalla dirección, editorial, contenido, publishing, community, listening, trendjacking, social search, measurement, activaciones y fronteras con otras líneas.
- Se documentó [`Search + Social Visibility Composition V1`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md) como composición propuesta entre Search Visibility 360 y Social Media, con workflow compartido, RACI, wedges, economics separados y gates para evaluar un futuro Product Service compuesto.
- Se añadió el [`Social Media Operating Model`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md), con squad, capacidad, onboarding, cadence, SLA, community/care, crisis y fallbacks.
- Se añadió el [`Social Media Customer Model Integrity Pack`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md), con beachhead B2B experto, buying group, anti-ICP, triggers y motion de validación.
- Se añadió el [`Search + Social Measurement Contract`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_MEASUREMENT_CONTRACT_V1.md), con Social Search, ownership, instrumentación, confidence y gates contra claims causales.
- Se añadió un [`Pricing Validation Addendum`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_VALIDATION_ADDENDUM_2026-07-29.md) con ladder revisada, escenarios de economics y condiciones comerciales de prueba; sigue sujeto a Finance.
- Se documentó el [`Differentiation & Positioning V1`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_DIFFERENTIATION_POSITIONING_V1.md): autoridad y demanda, Social + Search, squad gobernado, transparencia, enemigo commodity, proof system y claims permitidos.
- Se incorporó **Efeonce Run & Gun Studio** como ventaja real de delivery de Social Media: equipos profesionales, captura en terreno y producción social-first componible con SOW, derechos y economics propios.
- Se creó [`Efeonce Run & Gun Production — Offer V1`](docs/services/creative-services/EFEONCE_RUN_AND_GUN_PRODUCTION_OFFER_V1.md) con Content Capture Day, Executive/Interview Capture, Social-First Production Sprint y Brand Story/Campaign Capture; la capability se normalizó como Efeonce Run & Gun Studio.
- Globe / Creative Studio quedó explícitamente fuera de la promesa y pricing base actual; Paid Social, Creator/UGC
  y Producción Especial quedaron como módulos separados.
- Estado honesto: `Approved for validation`; no habilita precios públicos ni venta self-serve.

La continuidad consolidada de esta sesión y el índice histórico mensual quedan reflejados en [`Handoff.md`](Handoff.md)
y [`docs/changelog/internal/2026-07.md`](docs/changelog/internal/2026-07.md).

## 2026-07-29 — Release Cloud Build: autenticación privada AXIS en workers

- El release orchestrator `30465872005` reveló `ERR_PNPM_FETCH_401` en los builds Cloud Run de `ops-worker`,
  `commercial-cost-worker` e `ico-batch-worker`: faltaba autorización para `@efeoncepro/axis-tokens`.
- Los tres deploy scripts ahora usan el secreto read-only existente `axis-packages-read-token` mediante `secretEnv` y
  `.npmrc` efímero; los Dockerfiles montan BuildKit secret en ambas capas `pnpm install`, sin token en imagen o runtime.
- La primera corrida autenticada aún respondió `401`: el PAT estaba sano, pero el heredoc no quoted expandía `$$` al
  PID del shell antes de que Cloud Build pudiera resolver `secretEnv`. Los scripts ahora preservan el doble dólar
  requerido por Cloud Build y un test de contrato cubre los tres consumidores.
- `.dockerignore` y `.gcloudignore` excluyen `.npmrc`; el gate de contratos impide que el secreto efímero viaje en el
  contexto de Docker o en un upload local accidental.
- `artifact-worker`, cuarto build unit que instala el `package.json` raíz, adoptó el mismo montaje BuildKit; el gate
  ahora exige AXIS auth en todas las etapas `pnpm install` de los cuatro workers.
- Se concedió acceso Secret Manager sólo al service account de Cloud Build de Greenhouse. Validaciones locales de
  contratos de workers, tests focales y los cuatro builds reales pasaron.
- PR #166 promovió todo `develop` a `main` en `0b4bdd6acb401ef0b108e27f1a8f1d80c469a0ed`. El orquestador oficial
  `30473069894` terminó verde sin bypass, dejó el manifest
  `0b4bdd6acb40-2608542b-b1e5-4b3b-b24e-5036501dfef1` en `released`, verificó Vercel Production, Cloud Run y
  `/api/auth/health`. Azure aplicó sus skips canónicos `no_infra_diff`.
- El watchdog conserva un falso positivo conocido para `ops-worker`: su diff de rutas runtime desde el SHA
  desplegado al target es vacío y el orquestador aplicó el change-gate, por lo que no corresponde redeploy label-only.

## 2026-07-29 — Globe: contrato tipográfico del payload cliente + jerarquía del Producer (TASK-1599)

- Tres commits desplegados y verificados en vivo sobre `globe-studio-internal-00100-9kq` (imagen
  `b9112a80985d`) en `https://globe.efeoncepro.com/producer`, con sesión real a 1440px.
- **`68a2cbe`** — 13 sitios del payload pedían Geist@700 con sólo Poppins 700 · Geist 400 · Geist 600
  cargados: el navegador **sintetiza** el corte faltante, deforma el trazo y no falla ningún gate. Dos
  gates nuevos cierran la clase: uno aparea familia×peso **en el sitio de uso** (la declaración de
  `@font-face` estaba sana; el defecto era quién pedía qué) y otro rechaza la utilidad de fuente que el
  theme no puede generar (`font-normal`/`font-medium` no emitían CSS). Más `tabular-nums` en siete
  números vivos.
- **`d009871`** — jerarquía del Producer. El panel de créditos **no se rompía por el número**: llevaba
  `max-w-full`, y sobre un elemento `absolute` esa medida resuelve contra el bloque contenedor —el
  `<details>`, o sea el ancho del disparador—; los tres síntomas eran un bug. Y `Listo` vs `Completada`
  eran **dos ejes** del contrato (`coarseProgress` vs `state`), no dos palabras: `stateCompleted` quedó
  huérfana y se borró.
- **`b9112a8`** — cierre de una regresión propia: bajar las acciones del prompt al flujo desbordó el
  cuerpo y un renglón quedó cortado contra el riel translúcido; se resolvió con el token `--rail-scrim`
  en el SSOT. Más `Math.floor` en el donut, que con `round` decía `100 %` junto a `Gastado 166`.
- Verificación: build 0 · eslint 0 · `node --test` 129/129 · canario de motor 8/8 · canario del composer
  163/163 · revisión humana en vivo tras cada despliegue.
- **Quedan tres puntos abiertos sin dueño**: el preflight de Tailwind no se emite, así que
  `b, strong { font-weight: bolder }` pide el corte fuerte por herencia y es invisible a un gate que
  escanea `className`; la fuga del `axis-pilot-canary` deja `pnpm test` sin terminar y un huérfano en el
  puerto 4326 por corrida; y el H9 del feed, cuyo `…` no es CSS (`DISPLAY_TITLE_MAX_LENGTH = 96` recorta
  por conteo de caracteres antes de que exista layout, así que ningún ancho lo arregla).
- Detalle de runtime: `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`.

## 2026-07-29 — Release preflight: corrección de latencia del check Sentry

- La causa del timeout persistente de `sentry_critical_issues` era la consulta de hasta 100 issues, que tardaba
  8,5–9,1 s en Sentry aunque no hubiera resultados; el presupuesto externo e interno anterior era de 6 s.
- El check ahora solicita 10 resultados, suficiente para detectar el umbral bloqueante `>=10`, mantiene la semántica
  estricta ante errores, usa un deadline API de 15 s y un presupuesto de runner de 20 s. El runner reporta el budget
  efectivo de cada check.
- El cambio está en `develop`; todavía no se ha repetido el orchestrator ni se ha desplegado producción.

## 2026-07-29 — PR #164: promoción completa y release detenido por evidencia de smoke

- PR #164 promovió todo `develop` a `main` en `e711fe2560e3a7c2e7e8639e07a8a394e9582cdb`; no hubo cherry-picks ni
  release aislado de AXIS.
- CI/CI Deep, Vercel READY y los gates de governance pasaron. El orchestrator `30452322643` detuvo el proceso en
  preflight por falta de smoke asociado al SHA de `main`; el smoke manual `30452463889` pasó verde posteriormente.
- Queda pendiente reintentar el orchestrator sin bypass cuando la API de GitHub Actions responda. No hubo manifest,
  deploy de workers ni promoción parcial.

## 2026-07-29 — PR #164: bloqueo persistente del preflight Sentry

- Smoke manual `30452463889` pasó y staging fue recuperado a `READY` mediante redeploy del deployment existente del
  proyecto Greenhouse; Production permaneció READY.
- Los orchestrators `30452924614`, `30453278402` y `30453818726` fallaron antes del manifest por
  `sentry_critical_issues` timeout de 6 s; el último ya no tuvo bloqueos de smoke ni staging.
- El rollout queda pendiente. No se activó `bypass_preflight`; requiere `platform.release.bypass_preflight` y razón
  auditada de al menos 20 caracteres.

## 2026-07-29 — PR #164: autenticación de paquetes privados y gobierno de release

- Los workflows con instalación de dependencias privadas usan `GITHUB_TOKEN` con `packages: read` y un `.npmrc`
  efímero en `$RUNNER_TEMP`; no se versionan tokens ni se exponen credenciales en runtime o artefactos.
- Vercel `efeonce-7670142f/greenhouse-eo` recibió `NPM_RC` cifrado para Preview (`develop`) y Production, siguiendo
  el runbook de AXIS. La credencial operator-owned es temporal y requiere reemplazo por una identidad read-only antes
  del rollout externo.
- `CLAUDE.md` quedó bajo el techo estricto de 35k tokens (34.945) y la auditoría de contenido quedó sin huérfanas;
  el detalle del Design System vive en `docs/architecture/ui-platform/README.md`.

## 2026-07-29 — EPIC-028: cinco workstreams comerciales añadidos

- Se añadieron `TASK-1593`–`TASK-1597` como policy tasks dentro de EPIC-028: enterprise ICP/design partners, Agency
  Workflow Sprint, Campaign Variant Workflow, Distribution/Activation y Packaging/Unit Economics.
- Las tasks consumen los gates comerciales existentes sin duplicarlos y mantienen el runtime, pricing público,
  checkout, reseller rights, co-selling y clientes externos bloqueados.
- El orden recomendado es `TASK-1595 → TASK-1594`; `TASK-1593`, `TASK-1596` y `TASK-1597` avanzan en paralelo documental.

## 2026-07-29 — EPIC-028: revisión de alineación con la visión de mercado

- Se auditó lo construido y lo pendiente del epic frente a la estrategia de Globe: enterprise como ICP estratégico,
  beachhead operativo por unidad, agencias como canal, e-commerce/DTC como wedge y creators/SMB como distribución.
- Veredicto: la fundación de producto, gobernanza y operación está alineada; la arquitectura comercial, distribución,
  verticalización y exit criteria de negocio todavía están incompletos.
- Se recomendó añadir dentro del mismo epic workstreams de enterprise design partners, Agency Workflow Sprint,
  Campaign Variant Workflow, activation/distribution y packaging/economics, sin duplicar owners técnicos.

## 2026-07-29 — Globe: estrategia de mercado, distribución y monetización V1

- Se integraron los benchmarks de Higgsfield y Magnific en una estrategia de segmentos, oportunidades, distribución
  masiva, ventas B2B/enterprise, canales, packaging y validación.
- Se fijó enterprise marketing organizations como ICP estratégico; mid-market o una unidad enterprise como beachhead
  operativo; agencias/productoras como canal multiplicador; e-commerce/DTC como vertical wedge; creators y SMB como
  adquisición y aprendizaje inicial.
- Se documentaron loops de artifact/template/creator/referral/content/integration/agency, límites entre software,
  Product Service, managed/co-operated y canal, revenue architecture, cost-to-serve y pilotos de 90 días.

## 2026-07-29 — Globe Producer: craft, densidad y tres bugs que sólo vio el despliegue

- Composer del Producer desplegado a `globe-studio-internal` (`00095`→`00097`): glow con reposo propio y
  rampa de fondo **invertida** (`--field` es más oscuro que el panel, así que la rampa heredada oscurecía
  al interactuar), pozo único sin el borde de fábrica del navegador en el `<textarea>`, ritmo interno
  16/20/32, y bloque de modelo+formato de **471 a 302 px** con jerarquía por consecuencia.
- Miniaturas de Dirección: ocho stills con globo generados con `pnpm ai:image`, mismo sujeto y ocho
  tratamientos, `aspect-video`. Pendiente regenerarlas por el Still Model Lab para procedencia gobernada.
- Proporción pasa a **taxonomía por forma, no por plataforma** (corrección del operador: Globe no produce
  sólo para social). Calidad deja de mostrar el enum crudo `standard`/`high`.
- Header a una fila en la banda 768–1024: **121 → 67 px**. Riel `sticky` funcionando bajo `lg`
  (`overflow-hidden` lo anulaba). Anillo de créditos devuelto al trigger, que el port había perdido.
- Bloque de referencias: el menú ordena por disponibilidad, el copy deja de prometer influencia y anclaje
  —ninguna de las dos existe— y cada ficha muestra su miniatura real.
- **Gate nuevo**: `tailwind-theme.test.ts` falla si una utilidad consume un namespace que el theme vació y
  el SSOT no repobló. Verificado en ambos sentidos. Nació de seis `backdrop-blur-*` computando `none`.
- ⚠️ Tres defectos aparecieron **sólo al desplegar**, con gates verdes: el `.npmrc` que no llegaba al
  `pnpm deploy --prod`, las miniaturas dando 404 por no estar en `assets.ts`, y el feed montando un MP4 en
  un `<img>`. Registrados con su patrón en
  [`GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md`](docs/audits/globe/GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md).
- **TASK-1552 Slice 3 sigue abierta**; nada de esto la cierra.

## 2026-07-29 — Magnific: Go-to-Market, workflows y expansión de plataforma documentados

- Se añadió una auditoría comercial sobre el wedge de upscaling, PLG, content/community, Flows/Agents, plugins, API, MCP,
  Business, Enterprise, services y value capture.
- Se clasificaron adquisición, integración, contributors, affiliates, Creative Partners, casos de agencia y enterprise;
  la evidencia pública no permite llamar partnership formal a la mayoría de esas relaciones ni validar claims de escala.
- El patrón transferible para Globe queda definido como `builder experto → workflow → runner → pod/workspace`, con
  derechos, provenance, QA, aprobación, costos y accountability; no se copian créditos, unlimited ni logos.

## 2026-07-29 — Higgsfield: Go-to-Market, partnerships, advertising y expansión vertical documentadas

- Se añadió una auditoría comercial que analiza el GTM completo: PLG/self-serve, content-led education, agency-led
  adoption, enterprise sales y ecosystem distribution; además separa partnerships formales, proveedores,
  integraciones, workshops, creator programs y case studies.
- Se documentó Advertising como beachhead de alta frecuencia: URL-to-Ad, variantes, workflows de campaña y expansión
  hacia Team/Enterprise, con agencias como multiplicadores y enablement como acelerador de adopción.
- La implicancia para Globe queda en validación: wedge estrecho, partnership taxonomy explícita, memoria de workflow,
  derechos/provenance y accountability Efeonce; Higgsfield puede ser capability provider, no dueño del resultado.
- Las skills de GTM, business model y research incorporan el patrón transferible `cuña → activación → workflow →
  agencia/pod → enterprise → expansión`, con traducción `adoptar | adaptar | descartar` y anti-copia explícita.

## 2026-07-29 — TASK-1591: adapters AXIS opt-in verificados

- AXIS publicó `0.1.4` con los contratos `efeonce.status` y `efeonce.progress` gobernados para Greenhouse y Globe.
- Greenhouse fija los tres paquetes privados y expone adapters MUI/Vuexy; Globe fija los mismos paquetes y expone adapters Tailwind/token classes.
- Se añadieron fixtures opt-in en `/design-system/axis-adapters` y `/_axis-pilot`, con evidencia desktop/mobile, teclado, reduced motion y sin overflow.
- El rollout productivo permanece separado; el PAT operator-owned vence el 2026-08-27 y debe rotarse antes de uso externo durable.

## 2026-07-29 — Creator Influence & Content: modelo operativo documentado

- Se documentó el submodelo de Influencers, Creators & UGC dentro de Media & Distribution, con cinco ofertas:
  Creator Intelligence, Influencer Activation, Creator Content & UGC, Creator Partnership Program y Amplification & Whitelisting.
- Se añadieron ficha de servicio, arquitectura operativa no-runtime, documentación funcional y manual de operación,
  separando audiencia, assets, derechos, pass-through, paid usage, RACI, gates y medición.
- La skill social de Creator/UGC quedó enlazada al modelo canónico; el estado permanece `Approved for validation` y
  no habilita pricing público ni venta general.

## 2026-07-29 — Creator Influence & Content: arquitectura de fees y comisiones

- Se añadió el `Pricing Integrity Pack V1` con bandas internas de validación, fee fijo, pass-through transparente,
  coordinación de terceros, performance fee condicionado, mínimos y condiciones de pago.
- Se fijó como hipótesis el modelo `fee base + pass-through`; las comisiones no pueden ser ocultas ni sustituir el
  delivery fee. Finance, Legal y Commercial deben validar cost-to-serve, derechos, atribución y willingness-to-pay.

## 2026-07-29 — Creator Influence & Content: benchmark de mercado y modelo escalable

- Se investigaron agencias y plataformas líderes, incluyendo Aspire, NeoReach, Upfluence, CreatorIQ e Influentials,
  además de referencias públicas de pricing y guidance de disclosure/rights.
- Se añadió el benchmark comercial con patrones adoptados y descartados: end-to-end modular, rights at signing,
  paid amplification, affiliate con tracking, transparencia y source of truth portable; fuera quedan per-post,
  performance-only, comisión oculta y porcentaje de media spend.
- El modelo propio queda orientado a capacidad gobernada por lane, no a volumen de publicaciones, y permanece en
  `Approved for validation`.

## 2026-07-29 — Creator Influence & Content: bandas y porcentajes de validación

- El Pricing Integrity Pack pasó a V1.1 con bandas por lane: Creator Fit Brief USD 500–1.000, Intelligence USD
  1.500–4.000, Activations USD 3.000–12.000, Content Engine USD 4.000–8.000/mes y Partnership USD 6.000–15.000/mes.
- Se fijaron como hipótesis operativas 10–15% para coordinación de pass-through, 15% para management medio,
  5–15% para creator affiliate, 2–5% para Efeonce success fee, 15–35% por 30 días de paid usage y 15–30% por exclusividad.
- Las skills Codex/Claude de Creator/UGC ahora incluyen las bandas, porcentajes, regla de no doble cobro y prohibición
  de presentar estos números como pricing público.

## 2026-07-29 — Creator Influence & Content: simulación end-to-end documentada

- Se añadió un caso comercial sintético para una campaña de perfume masculino con tres deportistas chilenos.
- El caso recorre intake, casting, vetting, contacto con representantes, negociación, derechos, producción,
  amplificación, medición, presupuesto de planificación y decisión go/no-go.
- Se enlazó desde la documentación funcional, el manual de operación, el índice de auditorías comerciales y las
  skills Codex/Claude de Creator/UGC. No constituye caso de éxito, disponibilidad confirmada ni cotización aprobada.

## 2026-07-29 — Globe: CEO conditional-go para primer servicio comercial gestionado

Se formalizó la autorización CEO para sacar Globe al mercado mediante un `Managed Creative Production Sprint powered by
Globe`: un cliente, un workflow y una ruta promovida, operado por Efeonce, con SOW/factura directa y sin acceso directo
del cliente al runtime. El contrato operativo queda en `docs/services/creative-studio/`; `TASK-1480` continúa
`in-progress` hasta reunir evidencia route-specific y ejecutar el primer sprint.

Corrección de fuente de verdad: el cliente inicial es **SKY Agencia Creativa**, con módulos `agencia_creativa` +
`globe`. La licitación SKY Blog/Wherex queda fuera del rollout; el brief correcto vive en
`docs/services/creative-studio/SKY_GLOBE_DESIGN_PARTNER_PILOT_BRIEF_V1.md`.

## 2026-07-28 — Contrato de producción visual social para reportes

- Se documentó el contrato técnico, funcional y operativo para producir posts de Instagram con reportes reales,
  incluyendo el patrón proof-first/score dominante, crop nativo 4:5, logo único, composición determinística y gates
  contra tarjetas azules, dashboards ilegibles, clipping y decoración genérica.
- Se sincronizaron las skills Codex/Claude de `design-studio`, `social-media-studio` y
  `greenhouse-ai-image-generator`.

## 2026-07-28 — HISTÓRICO SUPERSEDIDO — Plataforma UI compartida Efeonce: foundation local

- Se creó `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1` para superseder parcialmente el modelo Globe-local y separar gobierno Greenhouse, packages portables, adapters por runtime y Lab independiente.
- Se registraron `TASK-1588` y `TASK-1589…1592`.
- Se inició `../axis-design-system` con tokens, contracts, registry y un Lab Vite navegable; build y tests pasan.
- Se creó `efeoncepro/axis-design-system`, se desplegó `axis-design-system-lab.vercel.app` y se publicaron
  `@efeoncepro/axis-tokens`, `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry` en GitHub Packages como `0.1.2`.
- En ese corte Greenhouse/Globe todavía no importaban los packages en runtime; la adopción quedó
  verificada como canary opt-in en `TASK-1591` el 2026-07-29.
- Se completaron las precondiciones de distribución privada: permisos GitHub Packages para Greenhouse/Globe,
  `NPM_RC` del Lab en Vercel y secreto/IAM de lectura para Cloud Build en `efeonce-globe`. El runbook operativo
  queda en `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`; el PAT operator-owned debe rotarse
  antes de cualquier rollout externo.

## 2026-07-28 — Globe: payload React migrado al pipeline Tailwind v4

- En `../efeonce-globe`, composer, shell, diálogos, feed, viewer, share board, primitives y base/motion dejaron
  de depender de hojas CSS de superficie; los estilos quedan en `studio-client/src/styles/tailwind.css`, con
  theme generado desde `tokens.ts`.
- Build, lint, 118 tests del cliente, gates de diseño, reduced-motion y Tailwind engine canary están verdes.
- `producerStyles` sigue únicamente en el fallback vanilla de `/producer`; su retiro continúa siendo el gate de
  `TASK-1560`, por lo que el rollout global aún no se declara cerrado.

## 2026-07-28 — Contrato operator-first y research primario

- Se canonizó `EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md`: las Product Services construyen la
  superficie operatoria; Greenhouse soporta assurance ejecutivo, memoria, coordinación y expansión.
- Se formalizó el ciclo `operador → operator-champion → sponsor/director → compra recurrente → evangelista` y se
  separaron los roles de usuario, problem owner, champion, sponsor, economic buyer y governance owner.
- Se creó `RESEARCH-010` con evidencia secundaria, hipótesis falsables, guion de entrevistas, scorecard y gates
  para validar la adopción primaria. No autoriza implementación ni venta general.
- Se sincronizaron `docs/context/*`, `project_context.md` y skills Codex/Claude relevantes.
- Se documentó que el mapa de dolores de agencia sigue vigente y debe traducirse, por oferta, en capacidades de
  memoria, consistencia, aprobaciones, evidencia, coordinación, governance y transferencia de capacidad; el
  operator-champion es señal de adopción, no sustituto de la solución.

## 2026-07-28 — Mapa de dolores y fallas del journey

- Se aplicó `efeonce-customer-experience` para convertir el mapa de dolores en un artefacto operativo de CX.
- Se creó `EFEONCE_OPERATOR_PAIN_AND_JOURNEY_FAILURE_MAP_V1.md` con lifecycle, moments of truth, causas backstage,
  service blueprint mínimo, recovery, métricas y señales de Greenhouse.
- La investigación externa reciente refuerza confianza/transparencia, procurement/coordinación y governance de IA;
  la validación primaria en Chile/LatAm permanece pendiente.

## 2026-07-28 — Operator-first como mecanismo del Why

- Se documentó la relación entre el Why de Efeonce y el contrato operator-first en estrategia, marca, experiencia,
  ecosistema, Greenhouse y skills.
- Se fijó la regla transversal: el valor debe ganarse por `capacidad + memoria`, nunca por dependencia u opacidad.
- Se conectó cada dolor del operador con la promesa de dejar al cliente más capaz y mejorar cada ciclo.

## 2026-07-28 — Content-to-Capability Loop y learn moments

- Se creó `EFEONCE_CONTENT_TO_CAPABILITY_LOOP_V1.md` para conectar Glitch, blog, YouTube, microcapacitaciones,
  Product Services y Greenhouse como un sistema de aprendizaje y autoridad.
- Se definió el `Learn Moment Contract` para convertir contenido en aprendizaje contextual, acción, evidencia y
  memoria dentro de los productos.

## 2026-07-27 — Globe: motor de estilos en Tailwind v4 y cierre de `TASK-1555`

- **ADR-016 implementado (pasos 1-4).** `apps/studio-client` adopta Tailwind v4 con el SSOT de tokens como
  theme. **Ninguna superficie migrada todavía**: el composer sigue con `producerStyles` y cero utilidades.
- **El theme se GENERA desde el SSOT, no se aliasea.** El idiom de la documentación de Tailwind
  (`@theme inline { --text-xs: var(--text-xs) }`) es una referencia circular cuando el nombre coincide a ambos
  lados —y en Globe casi todos coinciden—. Medido en browser: `text-xs` a 16px, `rounded-sm` a 0px,
  `font-display` en Times, **con el build verde**.
- **Cuatro gates de diseño**, no tres: cada uno cubre ahora la forma CSS y la forma `className`, con una regla
  común (el único valor arbitrario permitido es una referencia a token) y uno nuevo para espaciado y medidas.
  Verificados mordiendo. La escala ajena (`text-red-500`, `text-lg`) se cierra vaciando los namespaces.
- **Regla nueva:** en Tailwind, documentar un anti-patrón dentro del árbol escaneado **lo materializa** como
  clase real — el gate de literales los estaba emitiendo a la hoja servida.
- **`TASK-1555` (selector de modelo) cerrada.** Su ficha declaraba `Diseño` con el código vivo, un bloqueo ya
  resuelto y criterios que describían la galería rechazada. Reescritos contra el runtime; el canary pasó de 1
  ruta a una flota de 4 y ganó 11 asertos de browser. **Desbloquea el Slice 1 de `TASK-1552`.**
- **Dos hallazgos de runtime:** el canary servía el composer **sin la hoja del legacy** y daba todo verde; y
  `.advanced-controls > summary` tiene `display:none`, así que ese `<details open>` **no tiene control para
  cerrarse** — la progressive disclosure no existe, el markup es decorativo.

## 2026-07-27 — Reconciliación de costo del AI Visibility Grader

- Se documentó que `grader_runs.estimated_cost_usd` es un guard parcial, no costo all-in ni base suficiente para pricing.
- La auditoría de un run público real recalculó ~US$0,3067 en providers principales antes de extracción LLM; el valor persistido US$0,2767 omitía request fees de Perplexity.
- Se documentaron los 18 intentos de extracción LLM sin tokens/costo persistidos y la imposibilidad de asignar directamente el costo del `ops-worker` compartido.
- Se sincronizaron la documentación funcional, el runbook de smoke y las skills Codex/Claude; la instrumentación completa queda pendiente.

## 2026-07-27 — Brand Visibility Grader: Think live reconciliado

- Se verificó que `https://think.efeoncepro.com/brand-visibility` está publicado y sirve el form gobernado del grader.
- Se actualizaron TASK-1246/TASK-1327, el índice de tasks, el ledger de flags, la documentación funcional de Think y el handoff para retirar el estado histórico “superficie inexistente”.
- El loop base queda documentado como submit → run → status → reporte tokenizado; resta consolidar evidencia E2E fechada y sincronizar el lifecycle de TASK-1335/TASK-1336.

## 2026-07-27 — Ecosystem Work Registry y Federated Execution Harness

- Se formalizó el ADR propuesto que extiende el harness Greenhouse-local hacia una arquitectura de ecosistema: Greenhouse conserva registro, visibilidad y coordinación global; cada repo conserva ejecución y evidencia primaria.
- Se definieron work contracts, Repo Capability Manifests, adapters federados, estados de freshness y una transición read-only antes de habilitar mutaciones cross-repo.
- Se fijó que ESLint, `pnpm`, typecheck, tests, build, deploy y smoke se declaran por repo mediante verification profiles; Greenhouse agrega sus resultados y aplica policy sin imponer una toolchain común.
- Se aclaró que el contrato debe gobernar tanto `pnpm codex:task-hook` como `/implement-task` de Claude; los gates actuales del command de Claude pasan a ser un perfil Greenhouse-specific, no requisitos universales del ecosistema.
- No se autorizó todavía schema, transporte, adapter concreto, ejecución remota, deploy ni segundo task registry.

## 2026-07-27 — Wave Product House, Greenhouse Admin y Agent Native

- Se formalizó `EPIC-037` y el ADR propuesto para que Wave sea la casa de producto de sus Product Services, con Greenhouse como admin/control plane transversal de todas las plataformas Efeonce.
- Se documentaron Agentic Readiness y Experience LaunchOps como Product Services compuestos de Wave sobre las cinco familias base; Agentic Readiness incluye Snapshot público, Audit/Grader, workbench interno, superficie cliente y monitoreo.
- Se explicitó el contrato de identidad: una sesión/SSO de Greenhouse para entrar a las plataformas habilitadas, con subject, tenant, capabilities y entitlements verificados localmente en cada runtime.
- Se estableció Agent Native + Full API Parity como requisito de nacimiento para los nuevos productos; no se autorizó runtime, migración del Brand Visibility Grader actual, pricing ni rollout.

## 2026-07-26 — Foco comercial: beachheads, entrada y expansión

- Se creó `EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md` para convertir el portfolio amplio en una máquina comercial secuenciada.
- Se priorizaron cuatro beachheads: AI Visibility & Search; RevOps & HubSpot; Performance & Commerce; y Creative Velocity & Production.
- Se definieron ofertas de entrada, rutas de expansión, motions, proof system, campos de cross-sell y validación de 90 días.
- La amplitud del catálogo queda para expansión; no se autoriza presentar todo el portfolio como paquete inicial ni convertir los umbrales de validación en KPI de runtime.

## 2026-07-26 — Partner & Provider Layer transversal

- Se formalizó el modelo transversal de partnerships y providers de Efeonce.
- Se separaron las capas vendibles: licencia/acceso, advisory, implementación, managed operations, Product Services e IP propia.
- Se clasificaron HubSpot, OpenAI, Claude, Google Cloud, Microsoft AI Cloud, AWS, Salesforce, Adobe, Lovable y providers creativos sin confundir provider, partnership aprobado, product brand o business line.
- Se sincronizaron arquitectura, business models, GTM, context pack y skills; el estado de programas permanece en la auditoría fechada y no habilita claims comerciales por sí solo.

## 2026-07-26 — HubSpot: brochure histórico convertido en input gobernado

- Se revisaron los brochures Efeonce x HubSpot de 2024/2025 y se documentó qué capacidades se absorben en RevOps & CRM.
- El catálogo adopta el recorrido diagnóstico → arquitectura → implementación modular → enablement → operación,
  con ofertas diferenciadas y HubSpot explícitamente como plataforma/provider.
- Se sincronizaron `hubspot-as-a-service` y `hubspot-solutions-partner` en `.codex` y `.claude`; claims, precios,
  bundles y disponibilidad del brochure quedan fuera del canon hasta verificación primaria fechada.
- Auditoría: [`HUBSPOT_BROCHURE_REVIEW_2026-07-26.md`](docs/audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md).

## 2026-07-26 — TASK-1566 COMPLETE: fondeo gobernado de créditos de Globe vivo, ejercido y con la autoridad vieja retirada

- **Primer fondeo real de Globe punta a punta sin break-glass**: `propose` (plan legible con el delta
  completo) → `confirm` en 905 ms con atribución humana real; grant +100 `posted`, tope 400→800 y
  asiento de ledger en **una** transacción; `pg_locks` 0/0/0 después. En el camino se cerraron los
  7 defectos en cadena de la sesión (incluida la federación WIF Vercel→Globe que **nunca** había
  funcionado y el self-deadlock del store transaccional — regla nueva: dentro de la transacción,
  ningún port abre conexión propia).
- **Retiro ejecutado (ADR-015 §10)**: el caller genérico (y el broker de tenancy) perdió las 4
  capabilities de credit-admin; señal anti-regreso en dos capas (evento
  `globe.credit_admin.caller_authority_drift` + test de disyunción); scripts de firma cliente
  eliminados.
- **Triple documentación**: manual `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`
  (con las dos correcciones de runbook medidas: clave de idempotencia propia para el confirm;
  anti-replay del broker por propuesta), funcional
  `docs/documentation/creative-studio/fondeo-gobernado-creditos-globe.md`, ADR-015 delta + skill.
- **Hardening restante como tasks nuevas**: `TASK-1584` (KMS + identidades disjuntas),
  `TASK-1585` (break-glass gobernado + retiro del HMAC), `TASK-1586` (desambiguador de negación al
  operador — cierra ISSUE-124).

## 2026-07-26 — Media & Distribution: catálogo y reubicación de servicios Reach

- Se revisó el brochure 2026 de Reach y se formalizó `Media & Distribution` como línea de negocio de Efeonce.
- Se documentaron las siete familias de servicio, la separación entre Influencer Marketing y UGC, la capa operativa
  IMO, las modalidades On-Going/On-Demand/Staff Augmentation y los boundaries con Creative Services, Wave, Kortex y
  Growth Strategy & Measurement.
- Reach queda como product brand habilitadora; no se presenta como agencia, unidad comercial principal ni equivalente
  a toda la línea. El catálogo queda en `docs/services/media-distribution/README.md` con estado `Approved for validation`.
- Se profundizó el packaging: tres soluciones comerciales —Distribution Strategy & Media Architecture; Performance
  & Commerce Distribution; e Influence, Earned & Partnership Distribution— y Managed Media Operations como capa de
  delivery. Se agregó beachhead, JTBD, buying group, criterios de calificación, métricas y guardrails de revenue.
- Se creó el business model canónico `docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md`
  y se sincronizaron context pack, estrategia de capital, Creative Practice, public/private tenders y squad design.
- Se agregó el benchmark [`PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md`](docs/audits/commercial/PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md) y se robusteció Performance & Commerce alrededor de señales first-party, medición, commerce, creative performance y governance algorítmico. MMM e incrementality quedan como escalera avanzada y no como promesa general.

## 2026-07-26 — Creative Services: catálogo y skills sincronizados

- Se formalizó el catálogo de Creative Services como línea de negocio de Efeonce: Creative Strategy & Brand
  Systems, Campaign & Creative Platform Systems, Content & Social Operations, Audiovisual/Motion/Audio Production,
  Run-and-Gun Production, Managed Creative Capacity y AI Creative Operations/Studio Access.
- Se sincronizaron las skills gemelas de `creative-practice`, incluyendo el hand-off a studios, la frontera
  Run-and-Gun Studio/capability versus Run-and-Gun Production/servicio y las composiciones con Wave, Reach y
  Search Visibility.
- Globe conserva el rol de product brand habilitante; no se convierte en la línea creativa completa. No hubo cambios
  de runtime ni de pricing aprobado.

## 2026-07-26 — Portfolio Efeonce: marca paraguas, líneas y product brands

- Se canonizó la separación entre **Efeonce** como marca paraguas/relación comercial, líneas de negocio/prácticas,
  product brands/platform brands, ofertas, delivery models y engagements en
  [`EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`](docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md).
- Se corrigió el lenguaje de contextos, business models, catálogo de servicios y skills: Creative Services no se
  reduce a Globe; Digital Services & Engineering no se reduce a Wave; RevOps & CRM no es una quinta unidad; Reach,
  Wave, Globe, Kortex y Verk nombran productos/sistemas cuando corresponde; Greenhouse es el control plane.
- No hubo cambios de runtime, schema, catálogo productivo ni configuración externa.

## 2026-07-26 — Globe genera de verdad: Producer React vivo y carril de fondeo gobernado

- **Generación desbloqueada.** Las tres modalidades producen desde la UI con principal humano por el BFF:
  imagen (Seedream 5 Pro), video (Seedance 2.0) y audio (ElevenLabs Multilingual v2). Lo que lo bloqueaba
  era un falso positivo del sanitizador, que leía `"Key visual…"` —término de dirección de arte— como una
  credencial (`ISSUE-127` capa 8). Se corrigió el **control**, no el prompt: una credencial serializada es
  un token opaco, no una frase.
- **Producer React en runtime** (`globe-studio-internal` rev `00094-pr8`). El código ya estaba desplegado;
  lo tapaba `GLOBE_CLIENT_PRODUCER_ENABLED=false`, con su gate de paridad ya verde. Se corrigieron además
  el viewer (la pieza no llenaba su celda por una herencia del share board), las acciones muertas en una
  corrida fallida y los enums crudos (`with-audio`/`silent`) que salían como copy visible.
- **Carril gobernado de fondeo de crédito vivo** (`globe-api-internal` rev `00106-b6w`, 176 capabilities).
  La atribución humana pasó de convención de payload a control exigible: tabla append-only en Greenhouse
  con trigger en la base que rechaza que un principal de servicio figure como el humano que aprueba. La
  mutación (grant + asiento + política) corre en **una** transacción.
- **El segundo confirmador humano quedó como política por workspace** (default OFF en el interno) más
  techo por operación, no como invariante — coherente con ADR-015. Un control que su único usuario no
  puede satisfacer no protege: desvía al break-glass.
- Pendiente para cerrar `TASK-1566`: ejercer `propose`→`confirm` con Greenhouse desplegado. El ADC local
  no puede impersonar al workload caller, por diseño.

## 2026-07-26 — Routing económico y creativo de modelos generativos

- Las skills de diseño/motion y Business Model Operator documentan la selección por caso de uso entre Seedance 2.0,
  Gemini Omni y FLUX 3, además de la comparación de consumo directo vs. Fal.
- FLUX 3 queda explícitamente como early access sin API pública general ni precio público al corte; no entra en
  compromisos de producción ni en unit economics aprobados.
- Se sincronizaron las fuentes `.codex`/`.claude` correspondientes; no hubo cambios de runtime.

## 2026-07-26 — Registro de postulaciones a partners de IA generativa

- Se creó [`docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md`](docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md) con el mapa, evidencia, estados y próximos pasos de Anthropic/Claude, Lovable, OpenAI, Google Cloud, AWS, Salesforce, Runway, FLUX, BytePlus/ByteDance, ElevenLabs y HeyGen.
- Se confirmaron envíos a FLUX, Runway Enterprise y ElevenLabs; BytePlus quedó bloqueado únicamente por reCAPTCHA.
- Se incorporó a las skills de business model y customer model la clasificación de partners por función y los gates de oferta, ownership, economics, derechos, procurement, continuidad, fallback y evidencia de demanda; los companions de Claude quedaron sincronizados.

## 2026-07-26 — ADR-015: Greenhouse administra Globe (créditos y capabilities de usuarios)

- Se creó `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` (**ADR-015**,
  Proposed) y se registró en `creative-studio/DECISIONS_INDEX.md` + `README.md`. Greenhouse es la **superficie** de
  administración; Globe la **autoridad**: la llave de aprobación nunca sale de su runtime y ningún actor obtiene
  aprobación y ejecución a la vez.
- Se creó **`TASK-1566`** (backend-data/command, backend-critical) como su implementación, con el registry y el
  índice de tasks sincronizados. Siguiente ID libre: `TASK-1567`.
- Se corrigieron dos afirmaciones de los deltas del 2026-07-26 de ADR-014, con evidencia de código: la autoridad de
  crédito **ya está** concedida al principal genérico `globe:service:internal-caller` junto con el gasto (no falta
  una capability, **sobra**), y el maker-checker de crédito es **vacuo** para cualquier caller de workload porque
  compara contra un `principalId` que es constante por clase. De ahí que la disyunción de actores viva en Greenhouse
  y no en Globe.
- Se corrigió el diseño objetivo del Delta (4): grant + asiento de ledger + política van en **una** transacción
  Postgres, no en una saga — los tres agregados viven en la misma base.
- Se actualizó `ISSUE-124` con la causa localizada: `dispatch.ts` colapsa **tres** clases de error de crédito en
  `conflict` (incluido `maker_checker_required`, indistinguible de `pool_paused`) y el desambiguador
  `budget.evaluate` está `policy-blocked` en `ui`. Solución = Slice 1 de `TASK-1566`.
- **Cambio de contrato para agentes:** la skill `greenhouse-globe` (`.claude/` y `.codex/`) pasa de 5 a 8 reglas en
  `Gasto y crédito en Globe`, y nace `.claude/rules/globe-administration.md` (auto-load por `src/lib/globe/**` +
  `src/lib/sister-platforms/**`). El pointer **no** se agregó a `CLAUDE.md`: el router estaba a 27 tokens del techo
  y el routing ya existe vía la skill y el índice de `creative-studio`.

## 2026-07-26 — Experience LaunchOps + Globe: producción creativa para experiencias launch-ready

- Se creó `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GLOBE_CREATIVE_PRODUCTION_INTEGRATION_V1.md`.
- La frontera queda explícita: Globe produce `CreativeAssetPack`, `AssetManifest` y `AssemblyManifest`; Wave conserva
  `LaunchContract`, ensamblaje, Search/AEO, Measurement, governance, release y evidencia.
- Se distinguen `asset-ready`, `experience-ready` y `launch-ready`, y se agregan los modos client-assets,
  Globe-assisted, Globe-managed y full Efeonce.
- Las skills gemelas `.codex/skills/greenhouse-globe/SKILL.md` y `.claude/skills/greenhouse-globe/SKILL.md` incorporan
  el `Creative Production Contract`, la composición con Wave y la regla de no pasar secretos ni integrar ad hoc.

## 2026-07-26 — Efeonce Product Service Operating Model transversal

- Se creó `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` para definir `Product Service` y
  separar oferta, productización, delivery model, operating mode y engagement.
- El contrato cubre scope, outputs, roles, plataformas, Workers, quality gates, pricing architecture, economics,
  legal/IP, evidence, expansion y stop conditions.
- Business Model y Pricing Operators de Codex/Claude ahora deben cargar este modelo antes de diseñar packaging o
  pricing; Wave, Globe y Experience LaunchOps quedan referenciados a él.

## 2026-07-26 — Directriz corporativa 2028: todos los servicios Productized y AI-native

- Se creó `docs/strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md`.
- La directriz aplica a todo servicio client-facing y exige Product Service Contract, workflow repetible, IA
  estructural, autoridad humana, plataforma/memoria, gates, economics, governance y evidencia.
- ASaaS Manifesto, modelo ASaaS, contexto corporativo y skills de agencia, business model, pricing y customer model
  quedaron alineados. AI-native no se interpreta como SaaS puro, self-service, autonomía total ni reducción de personas.

## 2026-07-26 — Customer Model Operator para Codex y Claude

- Se creó la skill transversal `efeonce-customer-model-operator` en `.codex/skills/` y `.claude/skills/`.
- Se cubrieron ICP, segmentación, beachhead, JTBD, triggers, WTP, buyer personas, buying group, stakeholder map,
  decision/paper process, procurement readiness, qualification, evidence, adopción, retención, expansión y gates.
- Se añadió el `Customer Model Integrity Pack` reusable, con evidence ledger, confidence, owners, falsadores y handoffs.
- Business model, GTM, commercial, research, pricing y agency quedaron conectados a la nueva capa; las ofertas concretas
  siguen siendo responsables de aportar evidencia y mantener sus boundaries.

## 2026-07-26 — Customer Model Integrity Pack para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md` aplicado a la oferta SEO+AEO integrada de Wave.
- El alcance comercial queda explícitamente en mid-market y enterprise; SMB queda fuera salvo decisión posterior.
- El pack separa ICP estratégico/oportunidad/delivery y califica de forma independiente diagnostic, implementation,
  managed operation, ecosystem/providers y renewal.
- Se documentan jobs secuenciales, buying group por fase, decision/paper process, provider governance, transition gates,
  evidence ledger y experimentos. Verdict: `model_incomplete` / `hypothesis_only`.

## 2026-07-26 — EPIC-022 incorpora readiness de producto-servicio

- Se añadió al epic la madurez actual de AEO, la diferencia entre arquitectura SEO y runtime SEO, y los gaps para cerrar
  el loop diagnóstico → acción → implementación → verificación → renovación.
- Se fijó mid-market y enterprise como alcance; SMB queda fuera salvo decisión explícita.
- Se agregaron gates independientes para diagnostic, commercial qualification, implementation, managed operation,
  renewal/expansion y enterprise readiness, además de la secuencia por olas AEO → SEO mínimo → 360 → authority/enterprise.

## 2026-07-26 — Pricing transversal para Codex y Claude

- Se creó la skill agnóstica `efeonce-pricing-operator` en `.codex/skills/` y `.claude/skills/`.
- Se consolidaron patrones investigados de value-based/cost-floor pricing, productized services, capacity,
  managed delivery, T&M/fixed/milestone/usage/outcome/hybrid, credits, AI cost controls, margin waterfall,
  discount governance, versionado y validación.
- Business model, GTM, commercial, Finance, Creative Practice y SEO/AEO Practice quedaron enrutados al companion;
  sus reglas específicas siguen siendo dueñas de sus respectivas líneas.

## 2026-07-26 — Primera aplicación de pricing a Wave

- Se probó `efeonce-pricing-operator` sobre las cinco familias de Wave y sus seis delivery models.
- Se creó `docs/business-models/wave/WAVE_PRICING_INTEGRITY_PACK_V1.md` con métricas candidatas, revenue
  architecture, economics, experimentos y gates de aprobación.
- El resultado es `hypothesis_only`: no se aprobaron tarifas, claims, márgenes ni venta general.

## 2026-07-26 — Pricing específico para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_PRICING_INTEGRITY_PACK_V1.md` como aplicación específica de la skill general de
  pricing a Search Visibility 360.
- El pack separa diagnóstico, foundation, operación, transparencia/plataforma, capacidad de contenido y expansión;
  evita usar artículos como unidad pública y trata SEO+AEO como producto integrado.
- Verdict: `hypothesis_only`, pendiente de Finance, evidencia de willingness-to-pay, capacidad y aprobación comercial.

## 2026-07-26 — Business Model Integrity Pack para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_BUSINESS_MODEL_INTEGRITY_PACK_V1.md` para completar customer/value, oferta, delivery,
  revenue, economics, data/IP, evidence, scale y capital sin convertir hipótesis en decisiones.
- El modelo canónico ahora enlaza su Integrity Pack y mantiene `Draft`; el verdict actual es `model_incomplete`.

## 2026-07-25 — Wave portfolio y boundaries documentados

- Se formalizó Wave como marca de producto de Efeonce para cinco familias: Search Visibility 360, Web Experience 360,
  Measurement & Analytics, Agent Systems & Platforms y Digital Automation & Integrations.
- Se fijó que CRM/RevOps pertenece a Efeonce Digital/Kortex; Wave sólo entrega capas técnicas conectadas.
- Se documentó la frontera con Globe (contenido/producción) y Reach (medios/distribución), manteniendo Efeonce como
  masterbrand externa.
- Canon: `docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md` y
  `docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md`.
- Se separaron product service, delivery model, engagement, operating mode y composición del ecosistema; Wave puede
  operar Managed Squad, Staff Augmentation y otros modelos sin cambiar el ownership de la oferta.

## 2026-07-25 — Globe: el payload de browser deja de ser un string (ADR-014, foundation)

`TASK-1556` cerrada. Nació `apps/studio-client` en `efeonce-globe` (Vite + React + React Router, SSR
apagado) compilando a assets estáticos que sirve el **mismo** `studio-web`; host, BFF, sesión SSO, CSP por
nonce, ALB y API privada sin tocar. Con el flag `client_app_enabled` en `false` **ningún comportamiento
cambia**: es fundación, no superficie.

Globe estrena SSOT de tokens con drift ledger, capa de copy locale-keyed, ESLint acotado (jsx-a11y +
rules-of-hooks) y 3 gates de diseño como tests — los 6 verificados **mordiendo**. React Compiler activado.
Las dos compuertas de la ADR cerraron verdes, así que el fallback a `vite@7.3.x` se retira.

El share board, la única superficie que ve un cliente, se separó a `TASK-1558`: necesita dirección visual
aprobada y no existe.

## 2026-07-25 — Globe: `/assets/*` sale por CDN (TASK-1557)

Carril CDN acotado a `/assets/*` sobre el ALB existente, aplicado y verificado en vivo con hits del
edge. El backend del shell SSO conserva `enable_cdn = false` y el path matcher es un allowlist cuyo
default apunta al backend sin caché: si una regla no matchea, el request cae hacia el lado seguro.
La política de caché la sigue declarando el origen (`USE_ORIGIN_HEADERS`), para no crear una segunda
fuente de verdad. Nada autenticado se cachea, verificado path por path.

## 2026-07-25 — Globe: /producer convertido a React y el bug que dejaba todo command inoperante

- Header y composer de `/producer` convertidos 1:1 reutilizando `producerStyles` verbatim: selector de flota
  con isotipo real y filtrado por modalidad, formato de salida con chips y stepper, Sugerencias, presets,
  Seed y Modo. `/producer` sigue en legacy (flag en `false`).
- Causa raíz: el transporte inventaba la cabecera `x-globe-idempotency-key`; la plataforma usa
  `x-idempotency-key`. El BFF rechazaba todos los commands sin lanzar, así que el fallo no dejaba rastro.
  Ni `Generar` ni `Mejorar` funcionaban. Corregido y verificado en vivo.
- La API (`globe-api-internal`) estaba desfasada del web varios commits, y el dispatch de commands ocurre
  ahí. Ambos servicios al día.
- Observabilidad: se otorgó `roles/logging.logWriter` a las runtime SAs (sin él el servicio corre mudo) y se
  agregó la señal de arranque. Localización de rechazos en handler y envelope, con el nombre del campo.
- Un rechazo de la salida del enhancer ya no se reporta como `invalid_request` del caller.
- La skill `greenhouse-globe` (Claude y Codex) suma siete reglas duras nuevas: cabeceras al portar,
  `idempotencyKey` en el cuerpo, el deploy por servicio, `textPayload` vs logs JSON, `logging.logWriter`,
  el estilado por atributo de la hoja legacy y los controles de salida sin `<select>`.

## 2026-07-25 — Globe: regresión del feed cerrada y mecanismo de conversión de `/producer` a React

- Se cerró la regresión visual de `/producer/feed` portándola del legacy (autoridad de lo ya probado en
  producción, no del prototipo): grid con filas parejas, reposo de card con su sombra, guard de `<img>` sin
  `src`, toggle de selección, clamp del título, fecha en el pie y washes de vuelta a la familia azul.
  Desplegado y verificado: revisión `globe-studio-internal-00078-5gs`.
- Dos bugs que sólo se ven con la obra cargada: `.pf__badge` sin `z-index` (el thumbnail tapaba "Destacada")
  y su relleno dependiente de un media oscuro para ser legible.
- Se montó el mecanismo para convertir `/producer` **sin recrear**: `renderShell` acepta
  `extraStyles`/`extraStylesheets` y la rama React sirve `producerStyles` del legacy **verbatim** + iconos
  Tabler, con flag propio `GLOBE_CLIENT_PRODUCER_ENABLED` (default off, cableado).
- `/v1/session` publica `identity {name,email}` hermana del `principal` (presentación, no autoridad).
- `/producer` sigue sirviendo el legacy: la conversión de la superficie está pendiente. Decisión en ADR-014
  § Delta 2026-07-25 (2); checkpoint en `TASK-1505`.

## 2026-07-25 — Skills de investor readiness y business model

- Se crearon `.codex/skills/efeonce-investor-readiness/` y `.codex/skills/efeonce-business-model-operator/`
  con operating loops, gates, templates, fuentes verificadas, escenarios de evaluación y validadores locales.
- Se actualizó el routing de `AGENTS.md`, `CLAUDE.md`, `efeonce-agency`, `project_context.md` y
  `docs/business-models/README.md`. El cambio no autoriza instrumentos financieros, emisiones, spinouts,
  pricing, ventas ni transferencia de IP.
- Se endurecieron los artefactos: templates del pack de inversión, source catalogs, validadores de ledger y
  data room, acceptance criteria/protocol de evals, y drafts `Draft` de Efeonce Group, Growth Platform, AEO
  y Search Visibility 360 sin inventar datos financieros o de tracción.
- Se redactó la arquitectura canónica de modelos de negocio: corporativo, plataforma, capability/oferta,
  packaging y submodelos, con ownership, gates y reglas de consolidación.
