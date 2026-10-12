# Handoff

## 2026-10-12 — Propuesta de campaña creativa: aprendizajes documentados (caso Sika N.º 1164)

Paquete del caso terminado y **no presentado** en Wherex (cierre 16/10, 16:00 de Ciudad de México): anexo gráfico v2, deck técnico de 21 láminas,
reel de 25 s con su página en Think y QR, y económica en la plantilla A4 (MXN 64.000 por lanzamiento tipo, por componente).
Aprendizajes en el [playbook](docs/operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md) y en las skills `greenhouse-public-private-tenders`,
`deck-studio`, `creative-practice`, `efeonce-pricing-operator`, `motion-design-studio`, `audio-studio`, `efeonce-graphic-line` y `astro`; fila nueva en el router.
Seis subagentes con alcance disjunto; espejos `.codex` sincronizados salvo `astro` y `efeonce-pricing-operator`, que ya diferían. Gates documentales PASS. Sin push.
Abierto para el operador: IVA y validez de la económica, evolución gráfica por lanzamiento o pago único, SLA por niveles de complejidad (lo espera Sika; el deck
no lo trae), texto de alcance de la lámina 10, y las reglas que chocan con lo ya escrito (precio unitario «nunca», spec work, tercera persona en SOW):
[expediente](docs/commercial/tenders/sika-mexico-campana-creativa-1164/README.md).

## 2026-10-12 — BytePlus: media directa del contrato Johor

Claves ModelArk y Seed Speech creadas/guardadas en Secret Manager con confirmación del operador; consumer
local conectado con permisos sólo sobre esos secretos. `pnpm ai:byteplus` cubre 21 entradas; `pnpm ai:layers`
usa Pro directo por defecto. [Manual](docs/manual-de-uso/creative-studio/byteplus-directo.md) y
[evidencia](docs/audits/creative-studio/BYTEPLUS_DIRECT_CONNECTION_2026-10-12.md). Canary real: Flash, Pro
Layerize, máscara, Seedance Mini y 2.5; consumo estimado total US$0,5713 (no factura). 24 tests, lint,
typecheck y gates documentales pasan. Audio sin generación
real de prueba; no clonaciones/slots. Código local versionado; sin push/deploy ni promoción Globe.

Continuación: [costos Seedance 2.5 por API a 720p/1080p](docs/audits/creative-studio/BYTEPLUS_DIRECT_PRICING_COMPARISON_2026-10-12.md)
y [Nexa cine Pro standard vs Sunburst max](docs/audits/ai-tooling/2026-10-12-nexa-seedream5-pro-vs-sunburst.md)
documentados; imágenes nativas entregadas. Pro 2864×1611 / Sunburst 3840×2160, estimados US$0,0999 / US$0,508
por respuesta recibida; primer timeout Pro con cobro sin confirmar. Espera de imágenes ampliada a 600 s sin
retry; lint, 12 pruebas y typecheck PASS. Continuación versionada por pedido del operador; comparación interna,
sin nuevas anclas ni publicación. Fal 1080p subestima y snapshot HF t2v sigue limitado: divergencias documentadas.

[Iconos: Flare max frente a Pro standard](docs/audits/ai-tooling/2026-10-12-iconos-flare-vs-seedream5-pro.md):
cuatro parejas, PNG nativos 2048² opacos, mismos prompts; Flare mejor acabado mate/detalle, Pro útil con
revisión de material. Totales estimados US$1,72014 / US$0,324; ocho solicitudes exitosas sin retry.
Lámina, ZIP de originales, hashes y recibos en `ai-generations/2026-10-12_iconos-flare-seedream5pro/`.
Sin cambio de UI/canon; no es una prueba de transparencia.
Segunda tanda **clay 3D** en la misma auditoría: ocho PNG nuevos 2048², mate en ambos; Pro textura más manual,
Flare formas más infladas/regulares. Estimados US$1,72097 / US$0,324, sin retries. Originales, lámina y ZIP
en `ai-generations/2026-10-12_iconos-clay-flare-seedream5pro/`; sin reemplazar la primera prueba ni el canon.
[Cuatro iconos nuevos Efeonce, mate uniforme](docs/audits/ai-tooling/2026-10-12-efeonce-iconos-mate-uniforme.md):
bases planas aprobadas; Flare max una pasada y Pro standard con ajuste adicional. Originales 2048², alfa
derivado por color-key, QA con avisos geométricos, costos/recibos y ZIP. Operador seleccionó Flare para esta
ronda; comparación preservada, sin publicación del catálogo ni default global.

## 2026-10-12 — Medios: oferta integral y evaluación DSP acompañada

Programmatic consolida la [oferta integral de medios Efeonce](docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md#11-oferta-integral-como-agencia-de-medios).
[Modelo V1.5](docs/business-models/media-distribution/PROGRAMMATIC_MEDIA_OPERATIONS_BUSINESS_MODEL_V1.md) y pricing V1.4:
tarifario aprobado sin cambio, gestión conjunta/incremental y gate de operación directa acompañada. Docs y skills
Codex/Claude sincronizados; alcance documental, sin integración ni publicación. [Reunión Basis leída completa](docs/audits/commercial/BASIS_DISCOVERY_AND_MEDIA_OFFER_2026-10-12.md):
demo registrada **21-10 18:00–19:00 Chile**; porcentajes ilustrativos, formación/soporte declarados. Pendientes a cargo
de Julio, Media y Finance/Legal: demo, oferta formal, RACI/capacidad, acceso, inventario Chile y crédito; sin gasto autorizado.

[V3](data/pricing/README.md): local.
Outlook: [firma + CCO](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md).
Sesiones anteriores (continuidad del 2026-10-08 incluida): [Handoff.archive.md](Handoff.archive.md).

## 2026-10-12 — Insights: alcance de contenido por organización (TASK-2033, en curso)

El informe SEO de Berel medía la propiedad completa de Search Console; lo que Efeonce trabaja es el 5,6 % de sus
clics. [`TASK-2033`](docs/tasks/in-progress/TASK-2033-efeonce-insights-content-scope-measurement.md) agrega un alcance
de contenido por organización (reglas de ruta, append-only) en `src/lib/growth/seo/content-scope/`; los readers dueños
lo aplican y el adapter de Insights lo sella en cada fuente. Slices 1–5 en `develop` local, **sin push ni release**.
**Aplicado en la base compartida** con autorización del operador: la migración
`20261012145214417_task-2033-growth-seo-content-scope.sql` y el alcance v1 de Berel (`pnpm seo:content-scope`).
Producción sigue midiendo el sitio completo: el código desplegado no lee el alcance. El release debe incluir Vercel y
el `ops-worker` (el tick de schedules arma ediciones allí).
Vista previa real de septiembre de 2026 con alcance: A4 27 páginas, deck 21 láminas, 0 violaciones; clics del contenido
661 → 799 (+20,9 %) con el sitio en −13,6 %. **Para quien revise esa edición:** las visitas orgánicas de GA4 al
contenido caen 51,9 % por un pico de dos semanas en agosto; el informe lo imprime.
Pendiente: tool MCP de lectura (Slice 6), `pnpm build`, release, decisión del operador sobre revisar la edición de
septiembre. Verificado: `pnpm test` completo (20.284 pruebas, 0
fallas), `test:live` del alcance 9/9 contra PostgreSQL real, gate visual de Insights 37 frames a 0 píxeles, typecheck.

## 2026-10-12 — Arquitectura: desacople de Greenhouse por dominios de producto (decisión, nada ejecutado)

El operador aprobó [a dónde va cada dominio y en qué orden](docs/architecture/GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md):
el Design System Lab, los catálogos de marca, `brand-surfaces` y el motor del compositor van a
AXIS (`artifact-worker` se queda y consume el paquete); Growth y Search Visibility 360 van enteros a Marketing
Studio; Insights pasa a dominio propio y sale último; Commercial queda diferido con su API aquí; Hiring se queda. **Knowledge
se queda en Greenhouse** por decisión del operador, aun con poco uso (4 llamadas de personas en 4 meses; el resto es
el QA nocturno).
Lo ejecuta [`EPIC-054`](docs/epics/to-do/EPIC-054-greenhouse-product-domain-decoupling.md), diez unidades D01–D10 sin task registrada.
Enmienda la cláusula «un repositorio» del ADR de build units. **Sólo documentos**: no hay tasks, repositorios ni
código movido, y el trabajo nuevo sigue naciendo donde vive hoy su dominio. Para quien toque esos dominios: un
dominio se mueve con su API y sus procesos asíncronos o no se mueve, y no se agregan lecturas SQL cruzadas (Insights
ya tiene 32 hacia `greenhouse_growth` que hay que retirar antes de su corte). Sin decidir: ledger de migraciones de un
schema con otro dueño, hospedaje de Insights, interfaz del cotizador (portal o Rooms). Verificado: `pnpm epic:lint`,
`pnpm task:lint --task TASK-1382`, `pnpm docs:context-check:strict`. No se corrió ningún build. Local, sin push.

## 2026-10-12 — Growth: dos errores de Sentry del ops-worker (ISSUE-181 / ISSUE-182)

Regrade AEO: Sky tenía 6 mercados secundarios con cadencia y sin declarar en el contrato; fallaba a diario desde el
3-oct. **Aplicado en producción**: `aeo_markets_included` de Sky = AR, BR, CL, CO, PE, US, UY (assignment
`cpma-9755492d…`, command gobernado desde el árbol local). Código local sin push: predicado único
`markets/contract-coverage.ts`, `assignAeoTier({ marketsIncluded })`, CLI `pnpm growth:aeo-contracted-markets`.
Captura de rankings: job nuevo `ops-seo-rank-capture-retry` (07:00) y aviso de parciales, ambos **sólo tras el deploy
del worker**. Pendiente: (1) el operador recupera hoy las 3 keywords de Berel con `gcloud scheduler jobs run
ops-seo-rank-capture` (el clasificador bloqueó al agente); (2) mirar `failed=0` en el regrade del 13-oct 08:00 — encolará
5 corridas `full` de Sky; (3) cerrar ambas issues tras el deploy. Verificado: typecheck, lint, 1.257 tests de
ai-visibility/seo/worker, predicado SQL contra PG real. No se corrió `pnpm test` completo ni `pnpm build`.

## 2026-10-12 — AXIS: dependientes del pin `axis-brand-assets` 0.4.25 regenerados

`596bfab90` subió el pin de 0.4.15 a 0.4.25 sin regenerar y dejó tres tests rojos en `pnpm test`. Corregido en
`7877dfe89` y el commit siguiente: tokens de Manzanitas, `INSIGHT_CHANNEL_IDS` de 19 a 22 (Facebook, Threads, X, con
isotipo en los dos catálogos) y los cuatro lockups del PDF del AI Visibility Report re-sellados (terminación
concéntrica del anillo: **cambio visible en un PDF en producción**, sale con el próximo release). `channelForDomain`
lleva facebook.com a `facebook` y suma los dominios de Threads y X. Think tiene los tres isotipos en producción
(`236d549`). El mapeo por dominio sólo marca filas de tabla del PDF y el deck: el modelo web no lo usa, así que no hay
orden obligado entre Think y el release de Greenhouse (`develop` lleva 283 commits sin push desde el 2026-10-05). Verificado: suites de Insights, Composer,
config y PDF; gate visual de Insights 37 frames a 0 px; export real del PDF (10); lint y typecheck. No se corrió
`pnpm test` completo ni `pnpm build`. Lección y comandos en las skills `axis-design-system` y `efeonce-insights`.

## 2026-10-12 — SEO/AEO: categoría y representación de marca

[Método aceptado](docs/operations/SEO_AEO_CATEGORY_LEADERSHIP_OPERATING_MODEL_V1.md): aspirar a referencia
para categoría/comprador/situación con pruebas y representación fiel; conservar non-brand y separar
presencia/cita/recomendación de consideración y negocio. ADR/index, manual/plan, contexto, modelo SV360,
caso de negocio y cuatro skills Codex/Claude alineados. Oferta, briefs, QBR/retención y mensajes corrigen
promesas históricas de citación/recovery paid. [Verificación](docs/audits/seo/2026-10-12-category-leadership-docs-skills.md):
espejos y destinos locales correctos, revisión semántica y gates proporcionales. Método documental;
sin scoring/runtime, precio, programa de cliente o publicación. Primera parte capturada por commit
concurrente `4fa5e6ce4`; cierre restante de este alcance separado. Siguiente aplicación: delimitar una
categoría/cuenta y registrar baseline, pruebas y brechas; liderazgo/eficacia aún requieren evidencia.

## 2026-10-11 — Diseño de skill de prospección B2B

[Inventario HubSpot](docs/audits/commercial/hubspot-properties-2026-10-11/README.md): tres subagentes,
1.126 definiciones activas de Contact/Company/Deal/Lead verificadas por CLI; CSV/JSON completos y
[captura por fase](docs/manual-de-uso/hubspot/llenar-propiedades-comerciales.md) enlazados desde skills
Codex/Claude. Catálogos MCP y un readback mínimo Lead conciliados. Pendiente: reglas UI/formulario/etapa
(navegador sin sesión) y permiso efectivo de Lead write. Sin cambios CRM, schema, acceso, créditos o envío.
Actualización posterior aprobada: módulo HubSpot con familias de captura, plan por objeto/fase
(completar/conservar/pendiente/sistema) y plantillas changeset/action-pack sincronizadas Codex/Claude.

[Prospección B2B](.codex/skills/efeonce-b2b-prospecting/SKILL.md): método Codex/Claude implementado, revisión Sales y 12 escenarios offline aceptados. Adapter personal conserva HSP/radar y Commercial Codex resuelve routing. [Decisión](docs/architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md), [discovery](docs/audits/commercial/2026-10-11-prospecting-skill-discovery.md) y [verificación](docs/audits/commercial/2026-10-11-prospecting-skill-implementation.md). Sin nuevos schedulers, créditos, CRM ni envíos. Eficacia comercial y discrepancia económica pendientes de evidencia/decisión del caso.

[Buying group](docs/audits/commercial/2026-10-11-buying-group-coverage-research.md): tres subagentes y revisión crítica completados; cobertura por roles/fase y 2–3 adicionales como base, ampliable según brechas. Evolución aprobada e implementada: núcleo, espejos, plantillas y canon CRM sincronizados; personas, roles y autoridad/correo/acceso separados. [Verificación](docs/audits/commercial/2026-10-11-buying-group-skill-update.md); 22 escenarios offline aceptados; validaciones mecánicas aprobadas. Sin acciones externas.

[ABM y ABS](docs/audits/commercial/2026-10-11-abm-abs-research.md): investigación y tres revisiones completadas; método incorporado por aprobación del operador a skill/espejos, templates y owners. Selección/inversión por cuenta, mapas por iniciativa, coordinación marketing–ventas, consenso, medición y costo total. [Verificación](docs/audits/commercial/2026-10-11-abm-abs-skill-update.md). Piloto, capacidad/presupuesto y oferta cliente pendientes de decisión; sin acciones externas.

[HubSpot ABM / Buying Groups API–CLI](docs/audits/commercial/2026-10-11-hubspot-abm-buying-groups-api-cli.md): investigación posterior al commit local `293d3f4cd`, sin cambios SaaS. Agent CLI `hubspot` 0.15.1 y MCP contrastados en portal 48713323: checkbox objetivo, tiers ICP y roles verificables; escritura documentada, no ejecutada. Buying Groups expone metadata pero rechaza list/search con 400; no contrato público de CRUD del gráfico encontrado. Beta/layout y roles por iniciativa pendientes de verificación/modelado; no confundir `hs_is_target_account` con el campo oculto `hs_target_account`.

[Ampliación operativa de prospección](docs/audits/commercial/2026-10-11-prospecting-operational-modules-update.md): cuatro mejoras aprobadas e incorporadas a skills/espejos: adapter HubSpot con changeset/readback y roles por iniciativa, capacidad/costo por owner/período, discovery/proof por oferta/función y aprendizaje/vigencia. Fixtures v4 preservan 26 casos y añaden cuatro; revisión/validación del alcance registrada en auditoría. Método sin nuevo software/API de gráfico, activación beta, schema, gastos, CRM, envíos ni scheduler.

[Recorridos y entregabilidad](docs/audits/commercial/2026-10-11-prospecting-routes-deliverability-update.md): cinco módulos aprobados y repartidos entre tres subagentes; señal→acción, entradas por situación, cadencia, respuestas y preparación de entrega. Plantillas/routing Commercial y fixtures v5 (40, 30 previos conservados) incorporados. Verificación y límites en auditoría; ningún piloto ni acción externa iniciados.

## 2026-10-11 — Contactos conocidos de banca y retail

Contrato vigente de [prospección B2B](docs/manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md#gate-previo-al-alta-correo-y-contactos-adyacentes): objetivo + 2–3 adicionales como base ampliable por roles/riesgos; no dar de alta contactos sin correo corporativo individual verificado. Docs y skills Codex/Claude actualizadas; los registros sin correo descritos abajo son históricos. Sin migración ni cambios live por esta actualización.

[Bancos Chile](docs/commercial/prospects/bancos-chile-2026-10/README.md): 22 Contact adicionales (18 nuevos, cuatro reutilizados) de 11 bancos; 20 con correo, Arturo/Isabel sin correo. ACTIVE **188** reúne esos 20 y ocho conocidos de BCI/BICE/Itaú: **28 personas de 14 bancos**, definición ACTIVE y conjunto completo verificados. Focos SEO/web de Luisa/Carolina/Rafael/Natalia en notas, sin fit forzado. Antes de contacto: validación conflictiva de Andrés/María Beatriz, vigencia de Cristian y campos pendientes. Sin envíos ni Deals nuevos.

[BCI, BICE, Cencosud e Itaú](docs/commercial/prospects/contactos-conocidos-banca-retail-2026-10/README.md): 12 contactos en HubSpot (10 nuevos, 2 reutilizados), cinco Company existentes, focos por persona y segmentos 180–187 verificados para este intake. Luisa: SEO de sitios públicos; Pamela/Felipe del Sante: creativo. Owner Julio; sin outreach ni nuevos Deals.

Antes de contactar: resolver validación contradictoria del correo de Andrés, correo histórico de Pablo (Primary Mercado Libre) y roles/permanencia de Cencosud. Correos/evidencia en CRM y expediente local indicado en el dossier. Apollo consumió seis créditos autorizados; nuevas revelaciones requieren su propio alcance aprobado.

## 2026-10-10 — Brochure web y Product Design 360

**`TASK-2025` completa y aplicada: el registro del cotizador V3 existe en la base compartida** (2026-10-12, sesión «Cotizador V3»): `greenhouse_commercial.quoter_*` (12 tablas, 2 vistas) con las tres migraciones `20261012123154614`, `…155887` y `…157583` aplicadas; los 24 documentos del catálogo del repo importados por huella y el puntero reflejado, idéntico byte a byte a `data/pricing/v3-operating/current.json`. **Todavía no hay cotizaciones ni APIs**: nada del portal lee estas tablas hasta `TASK-2026`/`TASK-2027`. [Modelo de datos](docs/architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md) · [qué es, en simple](docs/documentation/finance/cotizador-v3-registro-en-plataforma.md) · [manual del importador](docs/manual-de-uso/finance/importar-catalogo-v3-a-la-plataforma.md). Código en `src/lib/commercial/quoter/`; pruebas con `pnpm quoter:test:local` (PostgreSQL 16 local, 117 pruebas, conectando como `greenhouse_app`). **Regla vigente: NINGUNA cotización con `data_origin = 'real'` se registra hasta que exista `TASK-2031` (identidad de producto), y `TASK-2027` no se toma antes que ella.** El operador resolvió el 2026-10-12 el vínculo con el catálogo de Productos ([ADR, «Productos y el cotizador: una identidad, dos responsabilidades»](docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md)): Productos nombra lo que se vende (SKU, nombre, HubSpot) y V3 decide costo y precio; un servicio gestionado es un producto compuesto con SKU fijo; una línea es un ítem con SKU o un ítem a medida con motivo y categoría. **No cambia nada de lo aplicado por `TASK-2025`**: el vínculo va en una versión nueva del catálogo y en una tabla de lectura por línea, reconstruible. `TASK-2026` (cálculo sin persistir) y `TASK-2023` siguen libres. **Tampoco se registra ninguna versión sintética en la base compartida antes de `TASK-2031`:** esa task agrega una columna obligatoria a `quoter_quote_versions` (si el artefacto declara identidad de producto, para que la base sostenga la regla), y eso sólo es trivial mientras la tabla tenga cero filas, como hoy. Por eso las pruebas de salida de `TASK-2027` que registren ejemplos en staging esperan a `TASK-2031`; en el PostgreSQL local (`pnpm quoter:test:local`) se puede registrar lo que haga falta. **Cuatro cosas que quien siga tiene que saber:** (1) **cada vez que el catálogo del repo cambie** (versión nueva o `current set`) hay que correr `pnpm quoter:import documents --apply` y `pnpm quoter:import pointer --apply`, con lo cambiado ya commiteado y empujado; si no, la plataforma sigue con el catálogo anterior; (2) la primera cotización real emitida será `EO-QTE-15001` y el número lo asigna la base, nadie lo elige; (3) con una cotización real registrada ninguna de las tres migraciones baja (su `Down` aborta): la corrección es una migración nueva; (4) de las 47 cotizaciones calculadas del repo, 22 están bajo el piso de margen y emitirlas en la plataforma exige la aprobación de una persona. Gates del cierre: `pnpm test` completo verde (2.050 archivos, 20.231 pruebas) y `pnpm local:check` verde; **`pnpm build` local NO se verificó** (colgó el equipo y se cortó a medias, dejando `tsconfig.json` en cero bytes, restaurado desde git): no correrlo en paralelo con nada. **El build quedó verificado por Vercel**: el despliegue de staging del commit empujado (`62e3773ec`) terminó bien. **El CI de ese push quedó en rojo por tiempo, no por una prueba**: el paso `Test` se cortó a los 14 minutos (`timeout-minutes: 14` en `.github/workflows/ci.yml`) con 1.879 de ~2.121 archivos corridos y ninguno fallado; la suite pasó de 18.540 pruebas el 2026-10-05 a 20.595. El mismo día se subieron los límites como medida temporal (`ci.yml` Test 14 → 24 min y job 30 → 38; `ci-deep.yml` Coverage 21 → 32 y job 25 → 40, que estaba por fallar igual en el próximo push a `main`), con la medición escrita junto a cada límite; la cura es `TASK-1997` (setup por entorno y shards), que quedó con su Delta. Falta ver el veredicto real del CI cuando se empuje. Ajeno a esta task y abierto: la paridad de capacidades contra la base real sigue en rojo por `marketing_studio.catalog.manage` (`TASK-1905`, migración pendiente propia). Siguientes del programa: `TASK-2026` (API de cálculo) y `TASK-2027` (API de registro), ya alineadas con este almacén. La sesión «CLI cotizador v3 y skills» sigue de consultora.

**`TASK-2031` revisada contra el código y lista para tomarse** (2026-10-12, sesión consultora): la guarda de identidad vive en `prepareArtifact` (cubre `createQuote` y `addQuoteVersion`; una versión 1 nunca pasa por el segundo) y además en la base, con `product_identity_declared` en `quoter_quote_versions`. Esa columna sólo se puede agregar con la tabla vacía: **ninguna cotización, real ni sintética, entra a la base compartida antes de aplicar su migración**, que es un archivo nuevo (las tres de `TASK-2025` no se editan) y espera el visto bueno del operador. [Task](docs/tasks/to-do/TASK-2031-quoter-v3-product-identity.md). `TASK-2027` va después; `TASK-2026` y `TASK-2023` no dependen de esto.

**`TASK-2024` completa: puerto de almacenamiento de Pricing V3** (2026-10-12, sesión «Cotizador V3»): la CLI `pnpm pricing:v3` lee y escribe fuentes, puntero y artefactos a través de `PricingV3Storage` (`src/lib/finance/pricing-v3/storage/`), con el adaptador de archivos en `scripts/commercial/pricing-v3-storage-file.ts`; `scripts/commercial/pricing-v3.ts` no importa `node:fs`. **No cambió nada de lo que la CLI responde** y no hay runtime desplegado que actualizar. [Contrato y reglas](docs/architecture/GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md). `pnpm pricing:v3:test` (36 archivos, ~55 s) suma una línea base dorada de 107 comandos, una batería de conformidad contra tres adaptadores y una guarda de pureza del motor. **Si cambias a propósito lo que un comando responde, incluido `help`, la línea base se pone roja**: se vuelve a capturar con `PRICING_V3_CLI_GOLDEN=capture pnpm vitest run src/lib/finance/pricing-v3/__tests__/pricing-v3-cli-golden.test.ts` y se revisa el diff de los fixtures; un refactor nunca captura. Gate de cierre: `pnpm build` exit 0; `pnpm test` completo con 20.172 en verde y **3 rojos ajenos** por desfase entre el repo y el paquete AXIS instalado (`manzanitas-tokens-sync`, `efeonce-insights/contracts/channels`, `report-pdf-assets`); al cierre había archivos de esos dominios modificados sin commitear por otra sesión, no tocarlos desde aquí. Siguiente del programa: `TASK-2025` (base de datos), ya sin bloqueo; sus migraciones piden el visto bueno del operador porque hay una sola base. `EPIC-053` pasó a `in-progress`. Local, sin push.

**Cotizador V3 a la plataforma: programa aprobado, listo para ejecutar** (2026-10-12): el CEO aprobó llevar el cotizador V3 a la plataforma en el orden API → la misma CLI sobre esa API → MCP → interfaz, con una regla que manda: **el modo local de la CLI sigue operativo en todo momento y después** (con ella se cotiza y se arman licitaciones hoy). [Decisión aceptada](docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md) · [plan por fases](docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md) · [auditoría del cotizador actual](docs/audits/commercial/2026-10-12-cotizador-actual-auditoria.md) · épica `EPIC-053`, tareas `TASK-2023` a `TASK-2030`. Idea: un motor, dos transportes; registro y API propios de V3 en `greenhouse_commercial` (no escribe en `quotations*`); versiones inmutables verificadas por huella. **Nada está implementado.** Para quien continúa: empezar por `TASK-2024` (puerto de almacenamiento, sin cambio de comportamiento) y `TASK-2023` (cerrar las puertas de escritura del cotizador actual, aprobado por el CEO), independientes entre sí; después `TASK-2025` → `2026` → `2027` → `2028`. `TASK-2025` trae migraciones: hay una sola base para desarrollo, staging y producción, así que aplicarlas pide el visto bueno del operador en ese momento. Puerta de toda entrega que toque el motor: `pnpm pricing:v3:test` verde y los artefactos congelados idénticos (bajo carga alta de la máquina esa suite da falsos rojos por tiempo: repetir el test suelto antes de creer el rojo). Resuelto por el CEO: excepción bajo el piso sólo administración; puntero del catálogo, administración y finanzas. Abierto, no bloquea: portal o Rooms para la interfaz (los documentos de Rooms dicen hoy que no genera precios); prorrateo del fee de plataforma; costo de puesta en marcha de un servicio gestionado. Sin tarea todavía: interfaz con render del PDF en producción, y retiro del cotizador actual. Local, sin push.

**Cotizador V3, segunda prueba a ciegas y cierre** (2026-10-11, cierre): tres agentes nuevos repitieron los tres negocios reales sólo con la skill y el manual, sin abrir código, y reprodujeron precio y documento. Lo que aún encontraron quedó corregido: un precio mensual todo incluido (`agreed_total` con `per: "period"`; el documento lo imprime con `combine` por periodo), la evidencia de una asignación se declara (`allocations[].evidence`, ya no se lee el texto de `reason`), `compose assess` pliega los pendientes que sólo difieren en el mes y el resumen trae el total bajo el piso (`marginFloor.netShortOfFloor`), el esqueleto lista sólo precios utilizables y deja `work[].tasks` vacío, y el documento acepta `buyer.contact`. Skill y manual dicen una sola regla para cupos `planned-*` y tareas, y suman el caso de una persona continua a precio mensual. Sin tercera prueba: lo abierto está en el [registro de pendientes](data/pricing/v3-operating/operational-gaps.json) (35 ítems). Decisiones abiertas del CEO: prorratear o no el fee de plataforma por dedicación; costo de puesta en marcha de un servicio gestionado. Siguiente paso acordado y **no iniciado**: plan para llevar cotizador y documento a Greenhouse. [Procedimiento](.claude/skills/efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md), [manual](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cotizar-un-negocio-de-punta-a-punta). Local, sin push.

**Cotizador V3, tres negocios reales más y lo que corrigieron** (2026-10-11, última): agentes nuevos, sólo con la skill y el manual, cotizaron una persona por dedicación, un proyecto de alcance cerrado y un programa de licitación. Reprodujeron el precio y el documento, pero leyendo código. Corregido: `agreed_total` (un neto por todo el trabajo, con IVA exacto), cada oferta declara cómo se vende (catálogo v11, registro `offer`; el esqueleto ya no lo asume), la dedicación lleva su evidencia y cuenta como dato estimado, `compose assess` juzga contra el piso de la propia oferta, los diagnósticos dicen su causa, y el documento imprime un precio de programa o proyecto (`combine`) y cuotas con su IVA. La skill quedó reescrita como procedimiento con un caso por tipo de negocio. Abierto, decisión del CEO: prorratear o no el fee de plataforma por dedicación. [Procedimiento](.claude/skills/efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md), [manual](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cotizar-un-negocio-de-punta-a-punta). Local, sin push.

**Cotizador V3, primer caso real y lo que corrigió** (2026-10-11, cierre): un servicio gestionado de doce meses se cotizó de punta a punta y expuso cuatro límites, ya cerrados. Asientos como se compran: varios planes de una herramienta en un mes, asiento pagado sin uso (`idleSeats`) y asiento compartido (`seatSharing`); todo asiento pagado se usa, se comparte o se declara ocioso, o la cotización no calcula. Meses declarados una vez (`periodIds`). `compose document` imprime opcionales desde sus propias cotizaciones congeladas (`--option`) y una línea bonificada con su valor de referencia. `--out` es una cotización calculada o nada (`--keep-blocked` para lo otro). Un opcional que amplía a personas de la cotización principal se lee como incremento (`compose increment`, `--increment`), sin volver a cargar lo que se cobra una vez por línea. Las cotizaciones ya congeladas se recalculan idénticas. Sin modelar: puesta en marcha de un servicio gestionado. Fuera del cotizador por decisión del CEO: fecha de inicio y duración del contrato (una cotización no es un contrato). [Contrato para agentes](.claude/skills/efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md), [pendientes](data/pricing/v3-operating/operational-gaps.json). Local, sin push.

**Cotizador V3, documento de cotización para el cliente** (2026-10-11, noche): por decisión del CEO el documento de una cotización V3 es la [plantilla A4](docs/commercial/templates/cotizacion-a4/README.md), no el PDF del cotizador de Greenhouse. `compose document` convierte una cotización congelada en los datos del documento: las cifras salen sólo de la cotización y el brief lleva texto, nunca montos. La plantilla tiene una versión 2 con varias líneas con precio, IVA declarado, calendario de pagos y costos que el cliente paga directo; la versión 1 no cambió (guarda de hashes). Sale como borrador: sin número, QR ni firmas. Siguiente paso acordado y **no iniciado**: llevar ese diseño al cotizador de Greenhouse. [Contrato para agentes](.claude/skills/efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md), [ejemplos](data/pricing/v3-operating/README.md). Local, sin push.

**Cotizador V3, On-Demand, puesta en marcha, plazos de proveedor y lecturas del encargo** (2026-10-11, tarde): contrato 1.3.0 con la forma del compromiso como dato propio (`engagementForm`; On-Demand = precio × 1,10, mismo piso). Catálogo v9: incorporación USD 200 por persona (por defecto) y reclutamiento USD 500 (opcional), estimados; CLP→USD. Policy v10: Adobe como se factura, dos productos en CLP con IVA, contrato que renueva el 2026-11-16, y **cotizado sin el descuento de 50 %** por decisión del CEO; Microsoft 365 (USD 14,70) y Notion según factura, un mes por licencia. Lecturas nuevas de un artefacto: `compose split|schedule|cash|commitments`. Tres ofertas con política propia: creativo gestionado 45/45, SEO/AEO gestionado 55/45, persona por dedicación 30–40/25. Una demanda fechada antes del 11/10 o con perfiles de contenido sin Adobe Express ya no calcula con `--current`: es el comportamiento esperado, no un error. **Contrato 1.4.0 y catálogo v10 (misma noche):** una cotización lleva costos de terceros refacturados, cada uno en su fila con la regla de su categoría (10 % de manejo y piso 5 % en producción, talento e imprenta; pauta y licencias al costo), y una reserva de contingencia de 12 % del costo de personas en servicio gestionado On-Demand, como costo y con renuncia explícita. Los porcentajes son estimaciones del agente aceptadas por el CEO. Con terceros hay dos márgenes: el del trabajo propio (`ownWork`) es el que se compara con el piso de la oferta; el total se diluye. Los factores por país quedaron cerrados por el CEO y confirmados desde el 12/10; HubSpot no es insumo pendiente. Ejemplo congelado: `managed-on-demand-third-party`. No modelado: cuándo se paga a un proveedor, compromisos que sobreviven al encargo, plazo del contrato con el cliente, reserva en On-Going con multas. Guía: [manual para agentes](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md); pendientes en el [ledger](data/pricing/v3-operating/operational-gaps.json).

**Cotizador V3, versiones vigentes, precios sin vencimiento y exposición a estimados** (commit `c38e2249b`, docs en el siguiente): las versiones vigentes ya no se nombran a mano; las nombra el puntero [`current.json`](data/pricing/v3-operating/current.json) y los comandos las cargan con `--current` (`current show|set`). Tras emitir una versión hay que mover el puntero o `pnpm pricing:v3:test` queda en rojo. Policy v6: el precio unitario de una herramienta no vence, lleva una fecha de revisión que avisa sin bloquear. El resumen suma `runNotices` (avisos de la corrida, no se congelan) y `estimateExposure` (qué dato estimado pesa más). Decidido por el CEO el 11/10: el costo de personas es el nivel salarial objetivo del Excel, no la nómina; no conectar nómina ni escribir sueldos. Propuestos por el agente, sin decisión expresa: revisión de precios el 2027-04-11 y FX EUR→USD 1,20; no se cotiza en EUR. Catálogo v7 (commit siguiente): la venta de una persona por dedicación (`talent-assurance-staffing`) tiene piso de margen de 25 % y objetivos de 30/35/40 % según el nivel del perfil, decididos por el CEO el 11/10; antes no tenía piso. Guía: [manual para agentes](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md); pendientes en el [ledger](data/pricing/v3-operating/operational-gaps.json).

**Cotizador V3, motor 1.2 y factores por país** (commit `e8117442b`): el precio sigue al país del cliente y el costo al país de la persona; donde el factor de mercado es menor que 1 el piso de margen lo acompaña. [ADR, delta 2026-10-11](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md). Las versiones vigentes las nombra hoy el puntero (entrada anterior). Decididos por el CEO: mercado CL 1, CO 0,90, US 1,10 y sueldos del Excel como referencia de Chile. Estimados, por validar: talento CO 0,80, PE 0,85, MX 0,90, ES 3, US 5 y mercado PE 0,95, MX 1, ES 1,10 ([ledger](data/pricing/v3-operating/operational-gaps.json), `COUNTRY_FACTORS_UNVALIDATED`).

**Cotizador V3, motor 1.1 y catálogo v4** (commits `9e397278c`, `72fbf10d4`): precio acordado directo (`agreed_net`), redondeo comercial por moneda y dos contratos de entrada que conviven, con una guarda que reproduce todo artefacto congelado. [ADR](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md). Para cotizaciones nuevas: `catalog.review-v4.json` + `resources.review-v5.json`. Decisiones del CEO del 10/10: piso de 45 % como norma, sueldos del Excel válidos, dólar de cotización 1.000 / 3.650 / 19,25 / 3,70 (CLP, COP, MXN, PEN) y redondeo a 10.000 / 10 / 50 / 50.000 / 100 (CLP, USD, PEN, COP, MXN) en toda oferta. Pendiente del operador: país de cada sueldo del catálogo ([ledger](data/pricing/v3-operating/operational-gaps.json), `LOCALIZED_TALENT_COSTS`).

**Cotizador V3, CLI endurecida** (commits `54bf7e232`, `5bb98cacd`, `8a82acc9e`): errores tipados, resumen derivado en `compose prepare|quote` y veredicto de piso en `assess`; kernel, versión de motor y digests sin tocar. [ADR y delta](docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md), [manual](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Decisión del CEO: el piso de 45 % sigue siendo la norma; [SKY social care es excepción](docs/commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md) (40,26 %). Pendiente, en [el ledger](data/pricing/v3-operating/operational-gaps.json): redondeo del precio al piso, precio acordado como ajuste directo y alcance del piso fuera de creativo.

**Brochure «Marketing de Contenidos»** (Brand, 57 láminas): aprobado 2026-10-10; [fuente, PDF y pendientes](ai-generations/2026-10-09_deck-contenidos/deck/LEEME.md), PDF en OneDrive `Brochures/2026/Marketing de Contenidos`. Entró a los modelos de [Social Media](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md) (decisiones abiertas 8–20) y [Media & Distribution](docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md) (`DA-01`…`DA-15`) sin cambiar estados ni precios. Antes de enviarlo: compromisos de servicio por contrastar, cifra «+85», datos de muestra y logos de terceros.

**Brochure «Servicios web y digitales»** (Engine, 29 láminas): aprobado 2026-10-09; [fuente, PDF y pendientes](ai-generations/2026-10-09_deck-web-nexa-spark/deck/LEEME.md), PDF en OneDrive `Brochures/2026/Web`. Antes de enviarlo: cifras reales de Aguas Andinas/ANAM (las de la lámina 18 son marcadores), plazo de Berel y titular repetido en 26–27. Commits locales `d0ccca3c6` y `eb5cf3795`, sin push.

**Product Design 360:** [aprobada entera por el operador](docs/architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md) (ADR `Accepted`, modelo `Approved`, Wave con seis familias); commit local `cf6d885ab`. Por confirmar: [TASK-1859](docs/tasks/to-do/TASK-1859-landing-product-design-360.md) quedó sin el freno del modelo; publicar sigue pidiendo autorización. Sin fila de PD360 en la matriz de precios de Wave.

## 2026-10-09 — CRM y Talent Assurance

[Ads✓](docs/README.md)

[CRM](docs/operations/CRM_SPECIALIST_CAPACITY_ACTIVATION_V1.md): aprobado; pendiente.

**Pibank:** [v13 enviada 09-10](docs/commercial/prospects/banco-pichincha-peru-seo-2026/README.md).
