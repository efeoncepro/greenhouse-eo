# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-16 — `pnpm ai:fal`: Seedream 5 con capas editables y Seedance 2.5/2.0 desde la terminal

El cliente fal.ai existía desde julio sin un solo consumidor. Ahora lo usa un CLI hermano de `ai:image`, sobre un
registro de capacidades model-agnostic (`src/lib/ai/fal-capabilities.ts`) donde cada endpoint declara su slug
literal, sus campos y sus límites. Seedream 5 quedó completo y verificado —incluido **layerize**, que descompone
una pieza en hasta 16 capas con alfa real, nombre y bounding box— y los 15 endpoints de Seedance 2.5/2.0 quedan
operables, con límites validados **antes** de encolar: 2.5 llega a 30 s pero topa en 1080p, y sólo 2.0 base
entrega 4K (verificado: 3840×2160). Gemini Omni salió del carril: irá directo por Google.

Dos correcciones que venían mal documentadas: el prefijo `fal-ai/` depende del endpoint y no del proveedor
(Seedream 5 sin él, Seedream 4/4.5 con él), y la subida de archivos es `uploadFalFile`, no un CDN temporal.
Tres capas documentales y las skills de imagen, video y dirección de arte actualizadas.

## 2026-09-16 — Efeonce Insights: render durable (TASK-1846, code complete, rollout pendiente)

- Artifact Worker despacha por `RenderConsumer` (Proposal intacto: `composer:visual-gate` 61 frames a cero píxeles);
  tablas `insight_render_runs`/`insight_outputs`/`insight_render_events`; lease + fencing (columnas additive
  también en `proposal_render_jobs`, reclamo de Proposal apagado); cuota por org, retry sin duplicar, cancelación
  honesta, señal `insights.render.orphaned_output`.
- `requestInsightRender` + `InsightOutputsPort` real; lanes `…/insights/editions/{id}/render` y `…/render-runs/{id}`
  (app + ecosystem); tools MCP `request/get/retry/cancel_insight_render`; eventos `insights.render.*`; errores
  `render_disabled`/`render_rejected`; `renderableOutputs: ['deck_pdf']`.
- Flag `INSIGHTS_RENDER_ENABLED` (OFF; dos runtimes). Hash del manifest domain-free en el composer.
  Sin deploy, sin push, sin canary: exigen autorización.

## 2026-09-16 — Skills Salesforce alineadas con Dreamforce 2026

Las skills espejo de CRM, Marketing Cloud Next y Marketing Cloud Engagement incorporan el ledger de AIforce,
Claudeforce, Slackforce, Koa, Agentforce long-horizon y las integraciones AWS/Google/NVIDIA/Siemens. Cada claim
conserva su estado `GA`, beta, piloto, preview o roadmap; la actualización no cambia entitlements, contratos,
orgs ni rollout.

## 2026-09-16 — El CLI de imágenes gana inpainting por máscara y reporta `usage`

`pnpm ai:image` ya puede editar **solo una zona** de una imagen: `--mask` conecta el soporte de máscara que
el cliente canónico ya tenía y nadie podía usar, con su validación de formato y dimensiones y un guardarraíl
que aborta si se pasa una máscara sin imagen base. El CLI además imprime ahora el `usage` de cada corrida:
para la familia 2.5 esa es la **única** fuente documentada de costo, y el instrumento que gasta no lo mostraba.

Medido en el mismo movimiento, contra la intuición: **editar no abarata**. El modelo devuelve la imagen
completa aunque la máscara acote qué cambia, así que el output se cobra idéntico a una generación (196 tokens
en `low`) y encima la imagen base entra como 1 024 tokens de input — editar costó 2,3× generar en `low`, y el
sobrecosto se diluye al subir calidad. **La máscara es gratis**: con y sin ella el `usage` fue idéntico.
Corolario: para recortar el fondo de una imagen existente, `pnpm ai:image:rmbg` (local, sin costo de
proveedor) en vez de un edit. Evidencia: `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/`.

## 2026-09-16 — GPT Image 2.5 transportado, y el carril Google migrado porque su modelo estaba apagado

`src/lib/ai/` ya reconoce `gpt-image-2.5-flare` y `gpt-image-2.5-sunburst` con su contrato correcto
(`xhigh`/`max`, grilla de tamaños moderna, sin `input_fidelity`). El contrato se decide por **capacidad
declarada** y no por literales de modelo, así que agregar uno nuevo sin declarar sus capacidades ya no
compila — la degradación silenciosa deja de ser posible por olvido. Cinco puertas que antes elegían otro
motor sin avisar ahora fallan ruidoso, incluida la ruta interna, que respondía con el default cuando recibía
un campo inválido: pedir `quality: "max"` devolvía `medium`.

El carril `google-imagen` no estaba bloqueado sino **apagado**: un probe propio devolvió `404 NOT_FOUND` para
`imagen-4.0-generate-001`, retirado por Google, y era el **default** del helper. Se migró de provider —no de
string— a `gemini-3.1-flash-image` sobre `generateContent`, y el default pasó a `openai-image`.

Queda además la primera medición propia del costo de 2.5, que OpenAI no publica y declara no estimable:
el consumo es **idéntico entre Flare y Sunburst** (196/1756/7024 tokens en `low`/`high`/`max`), así que el
costo lo fija `quality × size` y no el modelo; lo que los separa es la latencia (`max`: 46,0 s vs 80,6 s).
Evidencia fechada, no tarifa: `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/`.

## 2026-09-16 — Skill viva `efeonce-insights` para Claude y Codex, con contrato de mantenimiento

La skill pasa de un resumen a una memoria operativa del programa: `references/program-ledger.md` (qué construyó
cada task y dónde corre), `architecture-map.md`, `contracts.md`, `operations.md` y `lessons.md`, espejada en
`.codex/` con su `agents/openai.yaml`. Contrato obligatorio: cada task de EPIC-045 la actualiza al cerrar
(registrado en CLAUDE.md, AGENTS.md, la regla auto-load, EPIC-045 y los closing protocols de 1847–1849/1875;
TASK-1846 lo asume por coordinación entre sesiones).

## 2026-09-16 — TASK-1845 complete: rollback ensayado en la instancia compartida

El ensayo de `migrate:down` reveló dos defectos del Down original (borraba el módulo con asignaciones vigentes y luego
exigía borrar una auditoría append-only); el Down definitivo retira sólo el schema y depreca las capabilities, y el
Up restaura el estado vigente. Con permisos habilitados por el operador, el ensayo corrió de punta a punta con
readbacks (down 00:24Z, up 00:25:31Z) y los canaries posteriores crearon `EO-INS-000002` en staging y
`EO-INS-000003` en producción. Las cuatro ediciones sintéticas previas se perdieron por diseño. TASK-1845 pasa a
`complete`; la integración con Berel/Sky reales queda diferida a EPIC-046 P01. La sesión que lleva TASK-1846 fue
avisada y corroboró el estado contra la base.

## 2026-09-15 — TASK-1845: canary de Efeonce Insights verde en staging y federación MCP lista en rama

`develop` `8844a3d5c` quedó empujado con la foundation de Insights y CI/workers verdes. En staging se prendió sólo
`INSIGHTS_GENERATION_ENABLED` (redeploy necesario: la deployment anterior nació sin el env var) y se asignó
`insights_v1` a la org sintética Greenhouse Demo por el command canónico. El canary cubrió los dos lanes contra el
deployment real: la persona cliente creó `EO-INS-000012` (202 → `ready_for_review`, replay idempotente, 409 con
payload distinto) y el consumer del gateway leyó catálogo/lista/detalle con evidencia, creó `EO-INS-000013` y recibió
404 anti-oracle en una org sin módulo. La evidencia fue honesta: 0 hechos y 4 rechazos `no_data` porque esa org no
tiene snapshots ICO, con los límites visibles en el plan determinista.

El gateway `efeonce-mcp` federa las 4 tools en la rama `feat/task-1845-insights-federation` (v1.5.0, 47 tools,
scope `efeonce.mcp.insights.write` sólo para crear, políticas nativas fail-closed); Greenhouse registra el scope en
su paridad y los docs del gateway pasan a ocho clases. PR/merge/deploy del gateway, el scope en Entra y el flag en
producción siguen pendientes de autorización explícita. Se integró además el WIP ajeno de la landing de contacto
(TASK-1801 → complete) tras `eslint --fix`, y se añadió `scripts/insights/assign-insights-module.ts`.

Más tarde el mismo día: el gateway quedó mergeado (PR #12) y desplegado como revisión `00053-dsk` con front door
verificado, y el scope `efeonce.mcp.insights.write` existe en la app recurso de Entra con los seis scopes previos
intactos. Ningún cliente lo porta todavía, así que la escritura por MCP sigue cerrada hasta un consentimiento
gobernado. El ensayo de `migrate:down` no se ejecutó.

Release a producción la misma noche: PR #236 (`9c0946883`) promovido por el orquestador `35032358217` en un solo
intento (manifest `9c094688309d-500ec9e7` released 22:55Z, watchdog ok, cinco servicios sincronizados o con skip
legítimo). El canary de contrato por el lane ecosystem muestra las rutas de Insights ejecutando en producción con
create en `generation_disabled` hasta que Codex prendió el flag en Production (valor verificado, redeploy Ready) y el
mismo canary creó `EO-INS-000014` con 202. Efeonce Insights genera ediciones en producción para la organización
sintética; emisión e IA de autoría siguen apagadas hasta TASK-1846.

Barrido documental de cierre con cinco agentes: nace `EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md` (registro de
construcción y despliegue archivo por archivo), y se alinean arquitectura, ADR, doc funcional, manual, skills
(`efeonce-insights`, `efeonce-mcp-platform`, `greenhouse-production-release`), router de `CLAUDE.md` con regla
auto-load, reliability, client portal, entitlements, catálogo API/MCP, runbook del gateway y las tasks que
declaraban bloqueo por TASK-1845 (1846–1849, 1672), ahora desbloqueadas. La skill servida se verificó en producción
(manual idéntico al artefacto, 404 anti-oracle) y un agente sin contexto construyó con ella un encargo válido; sus once
dudas se cerraron en el manual.

## 2026-09-15 — Contacto publica metadata y grafo SEO/AEO coherentes

`TASK-1801` queda cerrada por aprobación explícita del operador sobre la landing pública. El cierre acredita la
superficie page-scoped y su responsive, no SLA/routing por destino ni booking end-to-end; el footer global conserva
la dirección legacy y requiere ownership separado.

`/contacto/` ahora declara `og:type=website`, título y descripción orientados a la intención de contacto,
canonical indexable y una imagen social determinística de 1200×630 construida con Nexa y el logo canónico.
El grafo de Yoast conserva `ContactPage`, corrige `primaryImageOfPage`, enriquece la `Organization` existente
con casa matriz y teléfonos, y vincula las cuatro preguntas visibles como `FAQPage`; no se inventan horarios,
reseñas, `LocalBusiness` ni schemas de servicio. Referencia y rollback:
[Contacto](.codex/skills/efeonce-public-site-wordpress/references/landings/contacto.md).

El selector premium de país quedó publicado y verificado el 2026-09-15 tras el release del renderer y las
banderas. La v3 de `efeonce-contacto` (`fver-c00955ca-863a-4e7d-99c7-c09706660a3a`) entrega 250 opciones
localizadas, typeahead/listbox accesible y chevron con orientación cerrada/abierta verificada; la v2 fue
deprecada conservando el destino existente.

Queda pendiente para el próximo release del renderer el hotfix `e5d4a0fb2`: reemplaza el glifo `↗` que aún puede
aparecer junto a “País” por el ícono geográfico SVG. No requiere una nueva versión del formulario.

## 2026-09-15 — TASK-1845: foundation de Efeonce Insights en develop (code complete, rollout pendiente)

Nace el dominio Efeonce Insights: schema `greenhouse_insights` (reportes con código `EO-INS-…`, ediciones
versionadas e inmutables al emitir, historial append-only, snapshots sellados y planes congelados),
adapters SEO/AEO/ICO sobre los readers dueños con ventanas en zona IANA y ausencias declaradas (nunca
cero), plan editorial determinista con validación de cifras e IA acotada tras flag, commands con
autorización de tres planos e idempotencia por encargo, 16 rutas en los lanes app/ecosystem, 4 tools MCP,
manual servido `efeonce-insights` + skill espejada, módulo `insights` de reliability con dos señales y
flags `INSIGHTS_*` OFF. Emitir queda bloqueado hasta el render durable (TASK-1846); canary staging,
federación en `efeonce-mcp` y release no ejecutados. Commits `e6e8a5dfe`, `a21e424fa`, `ca17c93da`, `12f985d8a`.

## 2026-09-14 — TASK-1832 corrige la atribución de señales del CIMD compartido

La revisión por sujeto/familia confirmó que la actividad `refresh_reuse` agregada de Codex pertenecía a una
identidad interna real y que el MCP posterior a la certificación funciona mediante Claude hospedado. El canary
mantiene su propio corte al `2026-09-11T01:33:34.325Z`; el retiro continúa bloqueado hasta completar siete días y
hasta que el cleanup preserve el cliente compartido y sus artefactos ajenos. El runbook, manual y skills espejo
ahora exigen correlación por sujeto antes de usar una señal por `client_id` como blocker canary.

## 2026-09-14 — Harness publicitario AXIS consumible por agentes en Greenhouse

AXIS `v0.2.5` publica `supportingTagline`, advertising contract `0.2.1` y
`efeonce.collaboration-selection` `0.2.0`; CI `34859611394` y release `34859795624` terminaron en `success`.
Greenhouse fija los tres packages en `0.2.5` y amplía `pnpm creative:layout` con un adapter Sharp/fontkit: copy
arbitrario continuo con espacios naturales, Poppins Regular/Bold Italic reales, fitting al lockup, bounding box
adaptativo, overlay luminosity, cursor local y multiplayer acting/moving. Los targets soportados son
`headline|support|hook|lockup` con tipos `text|text|object|group`; las relaciones se resuelven sin coordenadas
libres y quedan verificadas en manifests y QA.

El mismo adapter consume `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg` como URL Bubble real:
firma fija `efeoncepro.com`, escala proporcional, opacidad `0.72` y blend raster no separable `luminosity` contra
el canvas compuesto. El gate compara el master con un render idéntico sin la burbuja para impedir que un marcador
SVG presente pero no rasterizado produzca un falso positivo.

La skill publicitaria incluye contrato e intent reutilizables para sesiones nuevas. Sus fixtures cubren texto y
objeto en 16:9/9:16. No se generó una pieza de campaña, no hubo publicación ni cambio MCP. Advertising permanece
`trial`, collaboration `candidate` y Globe/otros runtimes `pending adapter` hasta implementar y comparar su motor.

## 2026-09-13 — Creative Typography Workbench de AXIS desplegado

La guía pública [Creative Typography Workbench](https://axis.efeonce.org/references/creative-typography/) quedó
desplegada desde AXIS: implementación `93810997c72a2664e8be6d3a85be410b5b5985f9`, release HEAD
`e2694025f8f7cb06fbb3ebe85ea0d2b4687d8786`, deployment Vercel `dpl_G9gbrg5gkzR4RQotfZes9G3eoduS` y
GitHub verify verde. El readback público respondió `200`, encontró
Bricolage, Poppins y Guttery reales, expuso el asesor interactivo y no mostró overflow en desktop. Greenhouse
enlaza la experiencia desde el contrato operativo, la descripción funcional y el manual sin duplicar recetas.
El despliegue del Lab no cambia `efeonce.advertising-typography` de `trial` a `stable`, no activa tipografía
publicitaria en la UI de producto y no aprueba automáticamente ninguna pieza.

## 2026-09-13 — Publicidad tipográfica activable por Codex y Claude

Se añade la skill espejo `efeonce-advertising-creative`, su brief/gate DO/DON'T y la activación por los routers
humano y machine-readable. La orquestadora usa `axisAdvertising` y `efeonce.advertising-typography` como fuente,
compone Typography/Social/Motion/Image/Copy/Brand según el soporte y exige prueba de peso, tracking, leading,
contraste local, safe area, logo y estado. Documentación técnica, funcional y manual explican invocación automática
y explícita. `mcp.efeonce.org` se evaluó y no se usó como atajo: su catálogo sólo admite manuales ligados a tools
reales y no existe una tool creativa federada; no hubo cambio de manifiesto, gateway, runtime ni publicación.

## 2026-09-13 — Casos tipográficos reales para diseñadores y agentes

La guía pública de aplicaciones creativas de AXIS incorpora las portadas 4:5/9:16 y el Reel aprobado de
Fiestas Patrias 2026 como caso auditado, no como patrón automático. Se documenta el límite 750/800 de las
portadas, el mejor relevo temporal del Reel y una comparación 580/760 sobre el plate limpio: el ritmo vertical
fragmentado se documenta como **DON’T** y el ajuste óptico como **DO**. Además se produjo
con ImageGen un fondo editorial sin texto ni marca para cuatro composiciones normativas resueltas con overlays
deterministas y motion accesible. El brochure compara además el logo negativo perdido sobre fotografía clara
como **DON’T** con el wordmark positivo sobre blanco estable como **DO**. Typography y Social Media Studio comparten una referencia espejo que separa
aprobación, calidad normativa, programación, publicación y performance. El Lab incorpora además un control de
tracking/leading, seis pruebas visuales y rangos por tamaño; el supuesto DO de “rediseño” se corrigió porque
`-0.060em`/`0.84` comprimía letras e interlínea en exceso. No se llamó a Fal: el Reel real ya cubre
video y las animaciones didácticas se resuelven localmente.

## 2026-09-13 — Pódcast: fotohistoria, biblioteca Nexa y entrega documentada

[Bitácora y evidencia](docs/operations/social/2026-09-13-podcast-fotohistoria-production-method.md):
decisiones y rechazos de video, continuidad/identidad, logo físico, globos, texto compacto, seis slides,
PDF, captions y readback Metricool. Programado 30/09: LinkedIn11:00 e Instagram19:00 Chile; no publicado.
Manual, funcional y skills Codex/Claude actualizados; [recursos Nexa](docs/operations/social/NEXA_CREATIVE_RESOURCE_LIBRARY.md)
localizados para reuso. Sin nuevas generaciones, publicación, cambio de runtime ni push.

Complemento: [inventario completo de Marketing con Manzanitas](docs/operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md):
nueve SVG verificados, cuatro logos y cinco símbolos, colores/viewBox y rutas exactas; enlaces en
Design/Social de ambos agentes, manual y descripción funcional. Sin modificar los originales.

## 2026-09-13 — Referente de seasonalities Metricool separado del calendario editorial

[Revisión de 407 eventos y oportunidades por mercado](docs/audits/social/2026-09-13-seasonality-reference-opportunities.md):
referente de inspiración para Efeonce/clientes, calendario editorial por marca y planner Metricool
identificados como superficies distintas. Cruce corregido con las cinco líneas: Influencer, Marketing,
Pódcast y demás vínculos profesionales, con prioridad y evidencia separadas. Social Media Studio y Notion Platform incorporan el contrato
espejado; manual, funcional y protocolo enlazan la fuente. Fechas propuestas sin crear ni programar piezas.

## 2026-09-13 — Metodología completa de Fiestas Patrias y programación con portadas

[Bitácora del caso](docs/operations/social/2026-09-13-fiestas-patrias-production-method.md), manual y descripción
funcional: dirección gastronómica/cultural, tipografía por tinta, storytelling, Seedance + post exacta,
cueca preservada, adaptación nativa9:16, portadas, entrega y readback Metricool. Skills de Design,
Typography, Copy, Brand, Motion, Audio y Social actualizadas en ambos agentes, conservando overlays propios.
Fiestas Patrias18/09 (LinkedIn11:00, Instagram19:00) y Día de Muertos02/11 (11:00/18:00), horaChile:
programadas con video/copy/portada; publicación efectiva pendiente. Aprobación posterior supera el estado
histórico de candidato de las entradas previas. No cambia runtime ni habilita proveedores de Globe.

## 2026-09-13 — Release TASK-1604 / TASK-1719 D4

- PR #235 promovida a `main` con SHA `cc3ec449495ba6b866ecdb8fa4fe309a9a991fd9` mediante el
  orquestador `34754161855`; manifiesto `cc3ec449495b-58fdc69f-3223-4348-8767-382008593b54`
  en estado `released`.
- Vercel Production, `/api/auth/health` y los cinco workers Cloud Run quedaron verificados para
  el SHA exacto. Azure cerró sus health checks y omitió Bicep por `no_infra_diff`.
- Canary interno productivo confirmó las ocho revisiones SEO activas y la frontera de asignación
  manual (`canAssign=true`, `proposal=null`) sin crear propuestas, instancias ni correos.
- La captura inmutable D4 se conserva para el primer recorrido sintético autorizado; no se presenta
  una asignación de candidato como evidencia. Calibración independiente y trigger `on_stage_entry`
  siguen pendientes.

## 2026-09-12 — Criterio y ejecución de seasonality/trendjacking para Codex y Claude

Ampliación 2026-09-13: criterio espejo video/estático por mecanismo, complementariedad y comparación
de resultados; adelantar la transformación sigue como propuesta, no como mejora ejecutada en v02.

Workflow espejo de video estacional desde metáfora visual: previs y keyframes, Seedance 2.5,
preflight/costo, tipografía/logo exactos, audio medido, QA temporal y MP4 en OneDrive.
Caso «Hay abrazos que encendemos»: candidato técnico; escucha/revisión completa y aprobación pendientes.

[Protocolo compartido](docs/operations/SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md) y skills espejo: clasificación,
evidencia, elegibilidad, mecanismos creativos, papel de marca, dirección por formato, producción por defecto y
cinco revisiones separadas. Routers AGENTS/CLAUDE/JSON y studios adyacentes apuntan al canon social.
Módulo 12 añade mecanismos/innovación, emoción-atención-memoria y heurísticas/pruebas, con fuentes académicas,
alcance de acceso, contrapesos y aplicaciones como hipótesis. Se corrigen recetas psicológicas universales en
fundamentos visuales/dirección/copy. [Investigación](docs/audits/social/2026-09-12-creative-cognition-research.md).
Se corrigen firma vs placement físico, activo aprobado vs reconocimiento demostrado y concepto vs permiso de
render. La materialización puede usar logo oficial como referencia; titulares y firmas editoriales siguen exactos.
Prueba Día de Muertos: v5 rechazada por deformación; v6 es iteración con referencia, no aprobación ni performance.
[Evidencia, escenarios y límites](docs/audits/social/2026-09-12-social-creative-production.md). Base en `87b05206e`.
[V8](docs/audits/social/2026-09-12-editorial-type-brand-v8.md): tres formatos corregidos, firma agrupada,
espaciado por tinta, contraste final y pruebas de fusión; protocolo espejo de auditoría editorial.
Delta v8 local, revisión pendiente y sin publicación. Entrega PNG a OneDrive Marketing con carpetas
semánticas y verificación de integridad; `5. Contenidos` es la biblioteca general para buscar, adaptar y
organizar assets, no sólo seasonalities. Convención en `social-media-studio/efeonce/ONEDRIVE_DELIVERY.md`.

## 2026-09-12 — Hiring: incidente P1 del Banco de Talento resuelto y liberado (ISSUE-171/172/173)

`lpad(nextval::text, 5, '0')` recortaba el `public_id` de `talent_pool_membership` pasado 99 999: diez valores de
secuencia colapsaban contra `UNIQUE`, el cron `ops-hiring-talent-pool-reconcile` fallaba en cada corrida y el consumer
que crea postulaciones desde el Growth Form abrió su circuito — hasta 38 personas reales sin proyectar durante horas,
sin ninguna señal (nada se borró). Migración a una función que rellena sin recortar + `setval`; anti-join en la
projection (cortaba ~71k `nextval`/día); parser público que ya no rechaza una postulación por un enlace opcional
(href canónico https); señal `sync.reactive.circuit_open`; el sender propaga el `error.name` de Resend; revive
gobernado de `dead_letter` (excluye buzones bloqueados y cierres inciertos, ventana por `updated_at`); tablero
del pipeline que sigue al snapshot del servidor; `reason_code` en la señal de aviso de rotación (Sentry 91/96);
`denyUrls` contra el filename crudo (Sentry 94). Recuperación por replay gobernado: 0 sin postulación, 164 acuses
(el plan Free de Resend se agotó en la ráfaga; ahora Pro). Release `586a8627568a` (PR #234), watchdog 5/5, canary
verde. `ISSUE-173` (el drain del dominio deja huérfano al handler que el breaker saltó) queda abierta con diseño.
Docs y skills sincronizadas el mismo día (arquitectura ATS §Delta 2026-09-12, `.claude/rules/hiring.md`, invariantes
SQL/Ops, playbook reactivo, skills talento/resend/email/release con espejos `.codex/`, desk/careers/emails) y follow-ups
formalizados: `TASK-1872` (fix de ISSUE-173), `TASK-1873`/`TASK-1874` (enlace descartado en intake y Application 360).

## 2026-09-12 — Bricolage Grotesque disponible para assets creativos Efeonce

Se incorporó `BricolageGrotesque-Variable.ttf` desde el repositorio oficial de Google Fonts, junto con su licencia SIL
OFL 1.1 y nota de procedencia/hash en `src/assets/fonts/`. `DESIGN.md`,
`docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` y las skills espejo de tipografía, `design-studio` e
`greenhouse-ai-image-generator` documentan su uso como display expresiva para campañas y piezas editoriales fuera de
la UI. Se fijó además la regla de que toda seasonality debe incluir product placement reconocible de Efeonce, con
Bricolage para la idea display y Poppins para contexto/apoyo, sin invadir elementos rituales. No cambia el runtime:
Greenhouse mantiene Poppins + Geist como sus únicas familias activas de producto.

## 2026-09-11 — Conocimiento de las «AI Skills» de DataForSEO incorporado a las skills propias

Seis skills públicas del proveedor (licencia libre de uso, copia, modificación y redistribución) descargadas y
analizadas como datos, más 62 páginas de la API AI Optimization y 11 templates n8n/Make. Ninguna se instala: duplican
capacidades existentes y comprarían API fuera del ledger de gasto. Se incorporó el delta real —comportamiento de
endpoints que falla en silencio (`domain_intersection` AND vs unión, `rank_scale: one_hundred` en `bulk_ranks`,
`info.target_spam_score` ≠ `backlinks_spam_score`, lost-link spike derivado, asimetría V1/V3 en `historical_serps`,
referencias de AI Overview anidadas en varios niveles) y el método (scoring de visibilidad en IA, umbral de
significancia, higiene de denominador, canibalización SERP-first, 28 checks de cartera, offer bank). Las curvas de CTR
del proveedor quedaron declaradas como discrepantes ~6× frente a las mediciones propias, que gobiernan.
`ai_optimization` permanece fuera del allowlist. [RESEARCH-011](docs/research/RESEARCH-011-dataforseo-ai-skills-competitive-review.md).

**Decisiones y consecuencias del mismo día.** Las cuatro preguntas abiertas quedaron resueltas:
screening masivo de toxicidad (`TASK-1871`) y rotación de URL en el SERP derivada a costo cero de
`seo_serp_top_results` (`TASK-1870`), ambas con `task:lint` limpio; disavow **descartado** como
entregable automático, con el criterio de cuándo sí escrito en `seo-aeo/modules/05_OFFPAGE_AUTHORITY.md`;
y gate de `rank_scale` implementado (`dataforseo-backlinks-rank-scale-guard.test.ts`, verificado en
ambos sentidos), que destapó que `prospect/` pedía `rank` en escala 0–1000 sin declararlo — corregido.
Abierto `ISSUE-170`: el link gap del diagnóstico de prospecto pasa hasta 5 competidores juntos a
`domain_intersection` y el default `all` devolvería sólo los dominios que enlazan a todos; registrado
con experimento definido, no afirmado. `project_context.md` compactado de 11.997 a 11.297 tokens con
control de no-pérdida verificado (148 rutas antes y después). La copia de `seo-aeo` en `~/.claude/skills`
quedó sincronizada con marcador de procedencia.

## 2026-09-11 — CLAUDE.md: bloque del outbox a su companion y fila de Channel & Commerce en el router

El bloque "Outbox publisher canónico" (TASK-773) se movió verbatim a
`docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` y en `CLAUDE.md` queda un puntero con sus
dos reglas más peligrosas. Con ese espacio entra la fila de Channel & Commerce en el router de dominios, que el ADR
`EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1` dejaba pendiente por el techo de 35.000 tokens; se retira del ADR la
sección de pendiente. `pnpm claude-md check`: presupuesto al 98% y 0 huérfanos en ambos niveles del audit.

## 2026-09-11 — Channel & Commerce: documento membretado del modelo de negocio para el equipo

Se entrega el modelo de negocio de Channel & Commerce como PDF A4 de 19 páginas con membrete Efeonce, etiqueta
"Confidencial · Uso interno" y sin rastros de trabajo interno de agentes
(`docs/business-models/channel-commerce/deliverables/`). La fuente es HTML editable y la genera
`scripts/documents/render-channel-commerce-business-model.mjs`: inyecta logos, URL bubble, contacto del catálogo y
fuentes; pone el pie institucional en todas las páginas, incluida la portada; calcula el índice desde la página real
y falla si alguna hoja desborda. `report-studio` y el estándar de marca de informes incorporan el patrón de hojas
fijas, el QA de respaldo con poppler cuando falta PyMuPDF y las reglas para documentos internos. Sin cambios de
runtime.

## 2026-09-11 — EPIC-047: portafolio de landings del sitio público con orden de prioridad

Las landings pendientes dejan de colgar de EPIC-019 (control plane técnico) y pasan a `EPIC-047`, que fija su orden
de ejecución en el campo `Rank` de cada task. Se cierran por decisión del operador TASK-1799 (Content Marketing),
TASK-1358 (Home), TASK-1351 (Redes Sociales) y TASK-1352 (Pillar HubSpot), publicadas e indexables; sus criterios de QA sin verificar quedan
registrados. TASK-1402 y TASK-1404 salen del ranking de landings porque son artículos del hub HubSpot. ASO sube al segundo lugar por el pitch activo con Berel. Sin cambios de
código ni de runtime público.

## 2026-09-11 — Panel competitivo AEO multi-marca: primer caso real (SKY) y método documentado

El AI Visibility Grader se corrió sobre SKY y cuatro competidores (LATAM, JetSMART, Avianca, Gol) en Chile con un
set curado de 12 preguntas idéntico para todos, el mismo día y los mismos 5 motores (`EO-GRUN-00050`…`00054`).
Resultado: LATAM 81,1 · JetSMART 72,7 · SKY 70,6 · Avianca 41,5 · Gol 37,3; informes web y PDF entregados y usados como
paso de venta fuera de la licitación SEO. Sin cambios de código ni flags: perfiles y set creados con funciones de
dominio y aprobaciones de revisión firmadas por el operador.

Se documenta el método en tres capas (manual comercial, doc funcional, runbook del grader con § "Panel competitivo
multi-marca", Delta de arquitectura) y en las skills `seo-aeo-practice` (módulo de la cuña, plantilla de correo,
estado actual) y `seo-aeo` (overlay operativo del grader). Quedan registrados tres defectos medidos del grader, sin
task todavía, y la capacidad gobernada del panel en `TASK-1861` Delta (d).

## 2026-09-11 — Trendjacking «Nuestro Duo»: pieza híbrida, Short con Seedance 2.5 y 4 canales vía Metricool

Primera operación de trendjacking end-to-end sobre el lanzamiento del iPhone Duo: investigación de las reacciones
reales de marcas, pieza 4:5 con mockup de plegable (plate `gpt-image-2` con pantallas chroma + homografía + texto y
logo determinísticos), Short 9:16 con Seedance 2.5 vía Higgsfield y programación en Threads, Instagram, LinkedIn y
YouTube (marca Efeonce Group, etiqueta IA declarada). Registro con ids y aprendizajes en
`docs/operations/social/2026-09-11-iphone-duo-trendjack.md`.

Las skills `social-media-studio`, `copywriting`, `greenhouse-ai-image-generator` y `motion-design-studio` (Codex y
Claude) y `GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md` incorporan lo aprendido: YouTube en Metricool solo acepta
video; en video las pantallas las renderiza el modelo (el reemplazo con green screen se ve pegado) y se protegen con
pantallas de texto grande + cada pantalla como referencia; `start_image` de Seedance no fija el encuadre, así que el
overlay se diagrama midiendo el sujeto por frame; y el copy de trendjacking cita lo que las marcas publicaron, sin
inventar su estado, con frases naturales y golpe.

## 2026-09-10 — Performance & Commerce: paid media con dos motions, pricing por nivel y landing propia

La solución de paid media de Media & Distribution vivía como sección del catálogo de la línea, sin precio, con un solo
comprador B2C y sin decisión sobre programmatic ni partnerships de plataforma. Se propone su arquitectura V1
(`EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md`, `Proposed`): una capability con dos motions por
comprador —Demand & Commerce, que optimiza hacia venta y margen, y B2B Pipeline, que optimiza hacia la etapa del CRM
con LinkedIn, Search y ABM vía partner—; los canales son cobertura y nunca SKU ni página; programmatic y CTV se compran
vía partner con cláusula de transparencia. Performance especifica la señal; Wave Measurement & Analytics la implementa;
RevOps & CRM opera el lado CRM.

Pricing Integrity Pack `hypothesis_only`: fee mensual por tres niveles de complejidad costeados con el catálogo
Greenhouse (USD 2.400 / 5.900 / 11.800 al piso de 45%), Diagnostic y Sprint de precio fijo, híbrido porcentual sólo
como alternativa con piso y programmatic sin markup. El SKU legacy `EFG-003` (asignado a Wave, con creatividad
incluida y bajo el piso) queda en conflicto y se pide su retiro a Finance. Market update fechado con evidencia de
demanda, plataformas, programas de partners, programmatic, precios Chile/LATAM y costo de talento; el registry suma
diez relaciones de plataformas y medios, todas `No iniciado` salvo Google Ads (estado sin verificar).

PDR-022 propone una spoke `/servicios/performance-marketing`: "agencia (de) performance marketing" tiene 480–590
búsquedas al mes en Chile con KD 11–13, dato que PDR-008 no había medido. Sin páginas por plataforma. Nada autoriza
precios públicos, badges, venta general ni implementación de la landing. Las skills `efeonce-pricing-operator` y
`efeonce-business-model-operator` (Codex y Claude) y el router de contexto de agentes enrutan ahora a estos documentos.

Canales emergentes (misma fecha): ChatGPT Ads entra como canal `selectivo` donde OpenAI lo habilita —self-service en
52 países; en LATAM sólo Brasil y México, Chile no—, medido del lado del sitio porque la plataforma sólo entrega vistas y
clics agregados; en Chile se ofrece preparación en composición con AEO. Nunca se vende como visibilidad orgánica. X Ads
queda `selectivo` bajo pedido con brand safety de terceros; Perplexity queda `no disponible` (abandonó la publicidad).
Partner programático: el CEO seleccionó a **Real Audiences** (DSP con operación en CL, CO, MX, PE y EE.UU.), usado
primero en modo managed por briefing y después autogestionado con trader certificado; suma pDOOH y push como canales
selectivos. Sin acuerdo firmado: fees, cláusula de transparencia, brand safety, CTV y ABM por confirmar. MiQ y TenX
quedan como alternativas.

Landing (2026-09-11): `TASK-1865` en `/servicios/performance-marketing/` con dirección "La señal" —firma interactiva
`Clics / Ventas` que reordena las campañas sin cifras ni logos—, trece módulos semánticos, form `efeonce-performance-brief`
con rango de inversión alineado a los niveles del pricing pack, y 301 desde la página legacy `242862`, que no se parcha:
la página se construye desde cero. La investigación Semrush en cinco países mostró que no hay un término único —Chile
busca "performance marketing"; Perú, México y Colombia, "publicidad digital"; Estados Unidos, en inglés—: el title combina
ambas cabezas, el copy suma una línea de léxico y el FAQ pasa a catorce preguntas.

## 2026-09-10 — Channel & Commerce: se abre la línea de trade marketing y BTL

Efeonce no tenía oferta de trade marketing ni BTL; el dominio existía disperso (retail media en Media &
Distribution, producción de piezas en Creative Services, medición en Wave) y nadie resolvía la pregunta del
Gerente Comercial: qué pasó en la góndola, qué costó y dónde reasignar. Se abre **Channel & Commerce** con ADR
`Accepted` (`EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1.md`), catálogo canónico de **23 servicios** en dos familias
de mercado —13 trade + 9 BTL + 1 transversal— y `Managed Channel Operations` como modalidad que opera todos:
Efeonce fija plan, estándar, validación de evidencia y accountability; la ejecución puede ser propia o de
proveedor, y el fee remunera la operación mientras la ejecución de terceros va como pass-through.

Evidencia de mercado fechada: el benchmark chileno encontró dos categorías ocupadas —software de retail execution
(Teamcore, Frogmi, Trax, Storecheck) que detecta pero no ejecuta, y agencias de servicio (Touch Latam, Novaprom,
Treid) que ejecutan pero reportan de forma descriptiva— y ninguna conecta la ejecución física con la inversión
digital, que es la diferenciación de la línea. Battlecards con vulnerabilidades y reglas de conversación en
`CHANNEL_COMMERCE_COMPETITIVE_BATTLECARDS_V1.md`.

Modelo económico en `Proposed` con gates G1–G6 abiertos: capital asignado CLP 40M que financia una cuenta ancla a
la vez, tres fases con la oferta estable y el mix build/partner variable, y el working capital declarado como el
riesgo que mata el modelo (se paga mensual y se cobra a 30–90 días; el factoring reduce el problema pero no cubre
el tramo pre-factura). Invariantes duros: nunca staff augmentation de terreno —en Chile sería suministro de
personal bajo la Ley 20.123—, nunca producción física propia, back-to-back o no se firma, y nunca prometer
incremento de venta. **No** autoriza precios, claims, cobertura ni contratación de capacidad.

Router: la fila quedó en `AGENTS.md` y en `agent-context-router.json`; **no** en `CLAUDE.md`, que está en su techo
de presupuesto (34.973/35.000) y requiere liberar espacio primero — registrado como pendiente en el ADR.

## 2026-09-10 — Product Design 360 canonizado: ADR propuesto, índice y enrutamiento de agentes

Se crea `docs/architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md` en estado **`Proposed`** —capability única
con dos ofertas por comprador, siete lanes, invariantes duros, condición de aceptación y alternativas rechazadas—,
indexado en `DECISIONS_INDEX.md` bajo decisiones propuestas. Enrutamiento: dominio `product-design-360` en
`docs/operations/agent-context-router.json` con **triggers específicos** (`Design Velocity`, `capacidad de diseño`,
`equipo de diseño in-house`…) para no robarle enrutamiento al dominio `ui-platform`, cuyos triggers son genéricos;
fila en el router de `AGENTS.md`. `CLAUDE.md` no se toca, siguiendo el precedente de Channel & Commerce del mismo
día. **Canonizar no aprueba la oferta**: la vuelve fuente única, descubrible y enrutada; el estado sigue `Proposed`
y el ADR declara qué lo haría `Accepted` (G1, Legal, piso de margen con loaded cost local, marco chileno de
accesibilidad).

## 2026-09-10 — Product Design 360: investigación de mercado, re-corte de lanes y corrección de doctrina

Fan-out de cuatro investigaciones (dolor de equipos de producto, dolor de equipos de sitio público, oferta
existente y huecos, efecto de la IA). Tres consecuencias.

**Corrección de doctrina en `creative-practice`.** El comparable Superside decía ~USD 5.000/mes, tomado de un blog
de tercero. Su propia página fija **mínimo USD 15.000/mes**, `Dedicated` desde USD 30.000/mes a 12 meses, +USD 1.000
de software y compromiso anual — **error de 3×**. La afirmación "estamos en el mismo rango que Superside" era falsa:
estamos muy por debajo, y eso pasa a ser pregunta abierta para Finance sobre si subvaloramos la capacidad. Corregido
en `SKILL.md`, `modules/09_DISPLACEMENT.md` y `SOURCES.md` + espejo Codex, con comparables de product design que
faltaban (Eleken USD 4.599–11.999/mes por diseñador dedicado, Awesomic, Penji, ManyPixels) y la señal de que Design
Pickle retiró su precio público. **Regla derivada: todo comparable de precio se verifica en la página del proveedor.**

**Arquitectura: capability única, dos ofertas, dos superficies.** El oficio de diseño es uno; los compradores son
dos. Product Design 360 posee la capability y vende la superficie de producto (Head of Design → CPO/CTO); **Web
Experience 360 conserva la superficie de sitio público** (CMO → Head of Digital) consumiendo la misma capability.
Accesibilidad y design system/tokens son lanes **compartidas**, contratadas una sola vez por cliente. Regla
anti-conflicto de canal: nunca dos ofertas de Efeonce por la capacidad de diseño de una misma cuenta.

**Lanes re-priorizadas por evidencia, no por intuición.** Accesibilidad sube de 4ª a 1ª —único dolor con ley,
medición independiente y tendencia empeorando: WebAIM Million verificado en fuente primaria, 95,9% de home pages
fallando, 56,1 errores/página, +10,1% interanual revirtiendo seis años de mejora, con ARIA promediando 59,1 errores
vs 42 sin ARIA—. Entrega de diseño baja de 1ª a 4ª por comoditización. Design system se re-corta: no es
construirlo (buy-in 42%→32%, 7% de adopción completa, 5% mide ROI) sino **hacerlo adoptado y demostrable**. Se
agrega L7, endurecer lo generado con IA, con evidencia de earnings de Upwork.

**Y el moat se degrada a hipótesis.** La investigación no encontró a ningún comprador articulando que no pudo medir
el cumplimiento de su proveedor: el hueco de accountability es de **oferta**, no demanda demostrada. Queda escrito
como hipótesis a validar en G1, con la evidencia indirecta que sí existe (reclamos por opacidad) y su límite (casi
toda de diseño de marketing, no de producto). Límites declarados de toda la investigación: cero mid-market, cero
LATAM, y ninguna encuesta del sector sin un proveedor financiándola.

## 2026-09-10 — Product Design 360 modelado como sexta familia propuesta de Wave

UI/UX y product design no estaban modelados en ninguna parte: cero fichas en `docs/services/`, cero modelos en
`docs/business-models/`. El ADR de Wave le daba a **Web Experience 360** el _diseño técnico, delivery y operación_
de la web —construir y operar—, pero nadie poseía **decidir cómo debe ser la experiencia**; la disciplina caía
entre Wave (ingeniería) y Globe (producción creativa). Se agrega
`docs/business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md` (`Proposed`, 14 secciones,
Operator & Buying Group Contract, 5 gates de validación) y la ficha
`docs/services/wave/product-design-360.md` con seis servicios: Diagnóstico de Experiencia, Experience Design
Sprint, Digital Product Design, Design System (build + gobierno), Experience Research & Validation y Design
Operations. Alcance: web **y** producto digital (app, portal, SaaS, herramienta interna, superficie
conversacional). Unidad de cobro de la línea recurrente: capacidad gobernada, nunca horas ni pantallas. El ADR de
boundaries recibe un **delta fechado que no reescribe la decisión aceptada**: la sexta familia queda `Proposed` y
su gate G1 (demanda externa) decide si se acepta en un ADR V2 o si se repliega a capability dentro de Web
Experience 360. Evidencia declarada como capability interna (AXIS, UI Platform, GVC, Premium UI Delivery
Standard), explícitamente **no** como caso de cliente. Se crea además `docs/services/wave/README.md`, primer
índice de fichas de Wave. Sin pricing, sin claims públicos, sin venta general.

**Corrección de tesis en la misma sesión (V1.1).** V1 asumía un cliente sin capacidad de diseño y listaba al
diseñador interno como _blocker_. Estaba invertido: las empresas mid y grandes ya tienen product design in-house, y
ese líder es el **comprador, el operador y el único con poder de veto**. El motion primario pasa a ser **extensión
de capacidad**: se venden **lanes** de capacidad gobernada —Feature Delivery, Research & Validation, Design System,
Accessibility, Design Debt & Consistency, Design Ops—, nunca diseñadores. Se agrega el **contrato
anti-desplazamiento** (el cliente elige qué lanes conserva; Efeonce no posee visión ni roadmap; no se presenta a
ejecutivos sin el Head of Design; la telemetría mide nuestras lanes, no a su gente) y la distinción dura **Managed
Squad ≠ Staff Augmentation** con la deriva como métrica de alarma. Doctrina aplicada desde la skill
`creative-practice` (in-housing, el comparable real, piso 45%, gobierno que no se descuenta). Comparables de
mercado **verificados para product design** con fuente y `as-of` 2026 —senior product designer US ~USD 185k mediana,
loaded 1,4–2,4× base, contractor embebido USD 80–135/h, ratio diseñador:ingeniero 1:2–1:1 en equipos maduros,
deuda de diseño 10–20% del sprint— con **sesgo de proveedor declarado** y la advertencia de rehacer el cálculo con
loaded cost chileno antes de usarlos (decisión abierta D7). Diseño integral queda como motion secundario.

**Segunda corrección de la misma sesión: recurrencia y razón de compra.** El modelo estaba construido sobre señales
de **disfunción**, lo que sesgaba el ICP hacia clientes con problemas, y sus lanes eran mayormente de **arreglo**,
que termina. Se incorporan **tres razones de compra**: expansión de capacidad productiva (el roadmap creció y el
equipo no alcanza), gap estructural permanente (no tiene ni tendrá research, accesibilidad o design system) y
deterioro. **Las dos primeras son retainer desde el mes uno y no requieren conversión**; sólo el deterioro entra
como proyecto. Para ese caso se agregan los **dos tiempos de una lane** —arreglar y sostener— con disparador de
conversión declarado por lane y la regla de que todo SOW de arreglo declara el sostener que le sigue. El
diagnóstico se reformula hacia adelante: deja de preguntar _"¿qué tienes roto?"_ y pasa a **dimensionar la
capacidad que exige el roadmap** contra la del equipo. Se agregan métricas de recurrencia (lanes en `run` ÷
contratadas, conversión fix→run, drift en ventanas sin gobierno) y la regla de honestidad: **si el drift no sube
cuando nos vamos, el retainer no se merecía**. Prospección: se busca a quien va a construir más de lo que su equipo
alcanza a diseñar —señal pública y anticipable—, no a quien ya está en problemas.

## 2026-09-10 — Conciliación bancaria ago–sep en producción, `fx_drift` cubre USD/MXN y rutina mensual (TASK-1858)

Release `2cf8c26cfa2d-8f79606f-8cb3-4154-a7fd-c570e7af8497` (`released` 20:06Z, run `34523159501`, un solo
intento): producción y el `ops-worker` sirven el fix de `ISSUE-169` (cuentas USD/MXN en unidades de la cuenta,
día genesis materializado, piso de genesis reactivo), los adapters de cartola y las CLIs `finance:*`. El
detector `finance.account_balances.fx_drift` deja de filtrar `currency = 'CLP'` y compara en la moneda de cada
cuenta (tolerancia nativa 0,05); el remediator nunca auto-remedia filas no-CLP. Manual de conciliación v1.2 con
la rutina mensual por cuenta y la decisión sobre facturas Nubox (siguen por plan `pay_expense`). OTB del CCA del
accionista al 01/08/2026 = 2.141.867 (`estimated`). Retención SII de Humberly (jul/ago) asumida por la empresa
por decisión del operador, registrada en Finance; Payroll sin tipo de ajuste para modelarla.

## 2026-09-10 — El sistema de contenidos en Notion queda mapeado y PDR-020 se reconcilia con él

Lectura MCP en vivo de las bases que operan el contenido de Efeonce. El sistema no es el calendario: son
Pilares JTBD, Content Hub y Calendario encadenados, más la Wiki. El Content Hub es el taller donde se
escribe el texto largo — artículos, ebooks, pillar pages, series, podcast, storytime, con ocho templates
por tipo — y desde ahí el material se distribuye a Think o al sitio público WordPress. El mapa con IDs, schema vigente y brechas queda en
[docs/operations](docs/operations/EFEONCE_CONTENT_SYSTEM_NOTION_MAP_V1.md).

El mapeo corrigió dos supuestos de `PDR-020`, que se escribió sin conocer ese runtime. Existe una base de
siete Pilares JTBD con job, buyers, tier, registro de voz y canales declarados: es el eje temático
canónico y las franquicias del PDR son un eje ortogonal, no un reemplazo, de modo que una pieza bien
formada declara cuatro ejes y no tres. Y `LinkedIn Julio` es un canal distinto de `LinkedIn Página` en
las tres bases, con voz propia. También queda advertido que `Territorio Arc` no es el territorio de
`PDR-019`: son dos taxonomías vivas y distintas.

Tres fracturas medidas que el mapeo destapó. Existen dos bases de Calendario con schema idéntico: la
anterior con 100 filas de histórico publicado y la vigente con 66 filas todas a futuro, y el histórico
queda partido, de modo que cualquier promedio de velocidad operativa usa la mitad de la evidencia. El
eje temático no se está usando donde importa: cero de las 66 filas del calendario vigente declaran
Pilar JTBD, mientras el Content Hub y los Pilares siguen apuntando al calendario anterior. Y el destino
de publicación que el operador declaró como flujo no tiene dónde vivir: el Content Hub sólo tiene
Enlace, poblado en cinco de 41 piezas, sin propiedad que distinga Think de WordPress, que es
justamente la decisión de host y canonical de PDR-018.

Brechas previas que siguen abiertas: la Wiki tiene las ocho etiquetas definidas y las 89 páginas sin
etiquetar; el Calendario no puede expresar franquicia, canal-hogar frente a satélite, territorio ni las
métricas que la doctrina declara (sends, saves, watch time, dwell), y conserva `Portafolio` como tipo de
pieza. La propuesta de cambios queda ordenada de menor a mayor invasividad y **ninguna fue aplicada**:
no se creó, editó ni borró nada en Notion.

## 2026-09-10 — Las seasonalities entran al catálogo como línea propia de marca

`PDR-020` rev 1.4 cierra la reconciliación con el plan de seasonalities 2026–2027: se conserva como línea propia
y permanente porque su trabajo es marca, no como compromiso previo con vencimiento. Son **seasonalities, no
efemérides**, y la distinción es operativa: una efeméride es una fecha conmemorativa puntual, mientras una
seasonality es una temporada con comportamiento propio de audiencia y mercado, con ventana y variación por país.
La unidad de trabajo es la ventana, no el día — por eso Navidad se entrega en octubre — y una temporada puede
sostener más de una pieza. Lo que la distingue del post
genérico de efeméride es que cada fecha demuestra una disciplina de la casa — Halloween es un envase que pierde
personalidad por imitación, el Día de la Usabilidad son fricciones digitales como obstáculos físicos, el Óscar es
retirar una luz para cambiar una escena — y ese es el estándar declarado de la línea. Canal-hogar Instagram,
métrica sends y saves, nunca seguidores. Único ajuste operativo: LinkedIn deja de recibir la misma pieza con otro
caption y recibe el argumento profesional desarrollado, sólo cuando la disciplina es legible para un comprador.
No se fusiona con trendjacking: misma familia cultural, economía de producción opuesta. Alcance, fechas,
responsables y entregas del plan no cambian, y sigue pendiente la conciliación tarea/calendario de MET-2339–2342.
No se produjo, programó ni publicó nada.

## 2026-09-10 — Canales propios de Efeonce quedan bajo un sistema editorial declarado

`PDR-020` fija el sistema editorial de los canales propios de marca: un motor compartido con un rol por canal
(blog el activo, LinkedIn el comprador, YouTube la profundidad, Instagram craft y cultura, Threads conversación
viva, Glitch la propiedad), catálogo propio de formatos por canal y franquicias con canal-hogar que viajan como
corte y nunca como copia. Los territorios se heredan de la taxonomía de `PDR-019` sin taxonomía social paralela;
el educativo nace en LinkedIn y el blog recibe la versión answer-first; el blog queda declarado multiformato con
casos, tools, webinars, ebooks y data studies; los casos de éxito se modelan en tres profundidades con canonical
en el blog y compuerta de aprobación del cliente. El vocero de talking head es Julio Reyes.
[Decisión](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md), delta de impacto en
`TASK-1802`, cross-links en `PDR-003/004/005/019`, drift de Thought Territories registrado en el context pack y
diez archivos de skills reconciliados con espejo Claude/Codex, incluido el hueco de Threads que no existía en la
mecánica de plataforma. Quedan siete decisiones pendientes y un conflicto declarado sin resolver con el plan
estacional 2026–2027, que sigue vigente. No se abrió ninguna cuenta, no se produjo contenido, no se programó nada
y no se autorizó publicación.

## 2026-09-10 — Finance: nómina agosto al valor real de Global66 y TASK-1858

Con autorización del operador, los dos pagos de nómina de agosto que Payroll había registrado en USD con tasa
estimada quedaron superseded y reemplazados por lo que salió de Global66 el 03/09 (800.730 y 1.114.423 más las
comisiones de cambio), pagados en la moneda del expense al tipo de cambio realizado; Global66 septiembre queda
`reconciled`. Se crea `TASK-1858` como cierre formal de la recuperación.

## 2026-09-10 — Finance: tercera pasada (sueldo accionista, Berel MXN, fee HubSpot, Deel mayo–julio)

Nace `finance:ledger-adjust` (cobros en moneda nativa con vínculo a fila, comisiones, pagos directos a un member y
supersede de settlements) sobre el command compartido `linkStatementRow`; los expenses anclados aceptan
USD/MXN con tipo de cambio explícito y `createMemberPaymentExpense` registra pagos a un colaborador sin entry
de Payroll. Datos: sueldo accionista 2×1.000.000 reemplaza los traspasos al CCA; Berel folios 51/52/53 cobrados
en MXN; comisión HubSpot cerrada con la fee de recepción estimada; Deel REC-2026-8/9/10 al CCA.

## 2026-09-10 — Finance: segunda pasada de conciliación (honorarios brutos, Deel al CCA, payable backdated, Banco de Chile)

El plan de conciliación suma `honorarios_gross_paid`, `income_receipt`, `link_existing_payment` y
`link_existing_leg`; nacen `finance:record-deel-receipts` (recibos Deel con tarjeta personal → cuenta corriente
accionista) y `finance:contractor-settle` (boleta on-behalf → readiness → obligación reactiva → orden pagada con
la fecha del banco), más el adapter `bancochile_cuenta_vista_text`. Datos: Humberly julio/agosto como brutos sin
retención; Deel REC-2026-11/12/13; Valentina EO-CPAY-0002 pagado el 07/09; comisión HubSpot Q2 2026 como
ingreso; Banco de Chile FAN Emprende anclado e importado. Seis períodos `reconciled`. Pendiente de despliegue:
el ops-worker recomputa saldos con el código previo a ISSUE-169.

## 2026-09-10 — Finance: recuperación de conciliación agosto–septiembre 2026

Cuatro meses sin cartola se resolvieron re-anclando cada instrumento con una OTB bank-authoritative al inicio de
agosto (Global66 al 31/07 y la TC al cierre de ciclo 06/08) en vez de reconstruir mayo–julio. Nacen los adapters
de cartola (`santander_cartola_xlsx`, `santander_tc_movimientos_xlsx`, `santander_tc_estado_cuenta_text`,
`global66_xls`) detrás de `parseBankStatementFile`; la ruta de import acepta archivo/texto y el drawer suma la
pestaña «Archivo del banco» (la lista CSV ahora calza con el parser). CLIs canónicas nuevas:
`finance:instrument:create`, `finance:import-statement`, `finance:reconcile-rows` (plan JSON) y
`finance:declare-otbs --file`. Se corrigió `ISSUE-169` (cuentas USD/MXN sumaban CLP; el día genesis de la OTB no
materializaba movimientos), el opening canónico del período honra la OTB, las filas idénticas del mismo día ya no
colapsan al importar y las factorías de settlement aceptan fechas partidas y MXN. Créditos V1
(`src/lib/finance/loans.ts`): Crédito FOGAPE Santander registrado con su desembolso como settlement `funding`.
Datos: `banco-chile-clp` registrada, 9 períodos ago/sep importados, 77 filas conciliadas por plan, tres períodos
`reconciled`; las discrepancias de nómina y dos cobros quedan escaladas al operador (follow-up propuesto `TASK-1858`, sin registrar aún).

## 2026-09-10 — TASK-1604: pack SEO/Arte y vacantes reconciliadas

Ampliación 2026-09-13: nueve preguntas SEO afinadas activas para piloto manual, ocho originales retiradas con
linaje idempotente. Snapshot D4 desplegado en producción, dos migraciones aplicadas; 594 tests focales y dos
live passed. [Evidencia](docs/audits/hiring/2026-09-13-seo-assignment-readiness.md). Pendientes calibración independiente,
recorrido sintético y automatización por etapa. Piloto autorizado: nueve activas y template/policy manual habilitada con 75 min y cap 5/h. Sin asignaciones ni correos.

Se agregó el pack versionado de evaluación para SEO Specialist Senior y Director(a) de Arte Senior: seis
competencias aditivas, nueve preguntas SEO con rúbricas BARS en `sme_review`, scorecard de portfolio/caso para
Arte, migración y operador local/readback. El guard de materialización ahora cuenta sólo las preguntas exactas
del pack; la reutilización de templates exige un único match de role hint, módulos, niveles y pesos y falla
cerrado ante colisiones. Las vacantes `EO-OPN-0674/0675` fueron publicadas por una operación separada y se
releyeron `active|published|public_listed`, rutas 200, pero continúan con cero policies, templates del pack y
assessments. Task, registry, epic, documentación funcional y handoff reflejan esa frontera; TASK-1604 sigue
`in-progress` hasta SME, template/binding y Quality Gate.

## 2026-09-10 — TASK-1832: retiro bloqueado y contrato shared-CIMD documentado

Readback live conserva la organización sintética aislada: registro/binding `1/1`, purpose drift `0/0`, dos
profiles run-owned fuera de Person 360 y un único grant read-only activo. La muestra dejó de ser steady:
`auth.oauth.refresh_reuse_detected` reportó 93 eventos/24h sobre el CIMD compartido de Codex. El cleanup dry-run
no mutó y añadió `oauth_client_not_run_owned`; el mismo cliente tiene 8 artefactos canary y 35 de otros sujetos.
Task, manifiesto, runbook, manual, doc funcional y skills Claude/Codex ahora prohíben remover ese blocker o
aplicar el helper client-scoped. El retiro exige primero planner/delete/readback sujeto-específicos y prueba de
preservación del cliente/hijos ajenos, además del diagnóstico de refresh; no hubo revoke, cleanup apply, gate
OFF, push ni deploy. El gateway 1.4.0 usa los tres paquetes MCP v2 oficiales 2.0.0, todavía latest en npm al
momento del chequeo.

## 2026-09-10 — TASK-1852: canal MCP delegado vivo; TASK-1857 Creative Hub

Canal delegado completo fuera del primitive: scope Entra `efeonce.mcp.client_services.write` (Admin) en la app recurso MCP,
`efeonce-mcp-client-services` en la allowlist de consumers de Vercel Production (redeploy `greenhouse-naxc5guq3`) y
federación en `efeonce-mcp` 1.4.0 (PR #9 provider `greenhouse-client-services` con preview/apply/rollback; PR #10 corrige
`efeonce.gateway.status`, que omitía el provider; revisión `00052-slt`, 174 tests). Verificado en producción por
`efeonce.gateway.status`). Canary humano punta a punta y apply de Sky ejecutados ~07:40Z por el canal (`EO-APC-ECD63852`, `delegated_oauth`, 0 altas, replay idempotente). `scopes.ts` del auth-server suma
`efeonce.mcp.client_services.write` a las clases de escritura MCP (paridad con `efeonce-mcp/src/config.ts`).
Decisión del operador: Creative Hub ES el módulo de Sky → `TASK-1857` (ui-ux; wireframe v2 de cinco bloques cliente + dirección visual C «hoja de trabajo creativa» con component mapping por bloque sobre el surface system; sin JSX) y Delta en `TASK-1687`.
[Auditoría](docs/audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md) §Canal MCP delegado.
Barrido documental por dos subagentes (32 archivos): skills `efeonce-mcp-platform` (+referencias, espejo `.codex`),
`greenhouse-teams-message-operator`, `teams-bot-platform`, `efeonce-customer-experience`; arquitectura MCP §25, invariantes MCP §11,
sister platforms §16 (registro de clientes de exchange), gap ledger de parity, Teams/Notification Hub, client lifecycle §9,
Pilot Engagement (`bundled_modules`), docs funcionales y manuales de portal/comunicaciones, DECISIONS_INDEX.

## 2026-09-09 — TASK-1852: habilitación común de servicios

Implementados inventario/preview, apply y compensación por organización/persona/servicio con commands
canónicos, locks, snapshot e idempotencia atómica. App/CLI/MCP/Nexa reutilizan el dominio; escritura
delegada denegada y writes nuevos apagados. JOIN comercial corregido, procedencia agent preservada
durante refresh y audit App acepta cliente nulo de sesión interna. Suite inicial 290 tests, PostgreSQL local y smoke
HTTP autenticado; [QA y matriz Berel/Sky](docs/audits/client-portal/TASK-1852_IMPLEMENTATION_QA_2026-09-09.md).
Rollout autorizado y alcance Berel/Sky confirmado por el operador; permiso de compensación EFEONCE_ADMIN
corregido, 392 tests passed. Servicio Berel sincronizado por command; resolver HubSpot vigente y
normalizador conservan importes ausentes NULL. [Estado del despliegue](docs/audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md).
PR #231/main `5726ce9d90` en Production; orquestador `34416904936` success y manifest `released`.
CI/Deep/build, cinco workers Ready, health, watchdog sin drift y siete canaries HTTP verdes. Excepción
de compensación autorizada y auditada. Altas OFF; mapping comercial y certificación cliente pendientes.
Tres contactos Berel quedaron seleccionados en HubSpot pero aún sin usuario Greenhouse; tres usuarios Sky
activos fueron confirmados, sin login observado. [Dossier de discovery](docs/audits/client-portal/TASK-1852_CLAUDE_DISCOVERY_2026-09-09.md).
2026-09-10 (local, sin push): `declareCommercialTerms` acepta `bundledModules` validados contra el catálogo activo y
gana contrato App `/api/platform/app/commercial/services/{serviceId}/terms` + CLI; Berel y Sky declarados con importes
NULL. `inviteClientPortalUser` gana `delivery: 'deferred'` + `deliverClientPortalInvitation` (ruta `portal-users/deliver`);
tres personas Berel provisionadas sin correo. El lane App acepta autoridad humana `delegated_oauth`
(`client_services.enablement.write`, exchange RFC 8693 con cliente dedicado sembrado por migración) y el recibo registra
`authority`; el preview distingue `person_invitation_pending`. Preview Sky limpio en producción; apply pendiente de sesión
humana y flag. Chats grupales de Berel y Sky registrados como destino `chat_group` del Teams bot (`ready`, pertenencia
verificada por Graph read-only; ruta `lifecycle/teams/chat`; migración que relaja el CHECK legado). Invitaciones Berel
bloqueadas por decisión del operador hasta tener interfaces. Política de preferencias `client_service_default_v1` aplicada a las seis personas (ruta `portal-users/notification-preferences`). **Release 2026-09-10:** PR #232 → main `f69b9d32`, orquestador `34431792218`, manifest `released` 03:16Z, flag `CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED=true` horneada, canary de contrato 5/5 en producción. [Readback](docs/audits/client-portal/TASK-1852_MAPPING_PROVISIONING_READBACK_2026-09-10.json).

## 2026-09-09 — Planificación estacional Efeonce y continuidad editorial

Documentadas 13 piezas 2026–2027 con conceptos, tareas, calendario y readback fechado en
[registro social](docs/audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md).
Social Media incorpora guía de efemérides, metáforas visuales y briefs; Notion explicita la aplicación
del flujo existente a pares tarea/calendario, con fechas separadas y detección de divergencias.
Skills espejadas Claude/Codex. Cuatro tareas tienen asignaciones nuevas aún no copiadas al calendario;
se documenta el pendiente sin mutaciones Notion. Producción, aprobación y publicación siguen abiertas.

## 2026-09-09 — Portal de servicios: EPIC-046 e integración con Efeonce Insights

Registrados [EPIC-046](docs/epics/to-do/EPIC-046-client-services-visibility-and-self-service.md) y
[ADR](docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md): Berel SEO/marketing de
contenidos y Sky diseño digital, primero visibilidad y después solicitudes/briefs. Cinco tasks nuevas
registradas y tres existentes por reutilizar, sin cambiar asignaciones ni desplegar.
Baseline fechado de catálogo, acceso y destinos 404; fuentes, permisos, contratación y estados separados.
El operador aprueba la dirección y añade Insights como hito obligatorio: autogestión cliente y gestión
interna comparten dominio/historial, con permisos distintos y token limitado a una edición. EPIC-045,
arquitectura/ADR, TASK-1845/1846/1848/1849 y flow/wireframe sincronizados; sin otro builder o motor.
Ampliación del operador: email de Insights con resumen/deep link, in-app y Teamsbot en esta fase;
móvil posterior. Hito N/P09 reutiliza Hub y sus dueñas, distingue entrega/consulta/acción y exige
preferencias, destino autorizado y dedupe. TASK-690/693/1848/1849 actualizadas; sin envíos reales.
El operador autoriza el registro: TASK-1852–1856 creadas con templates, contratos UI/backend y
criterios; TASK-1852 ↔ TASK-1834 enlazadas para identidad/contexto/deep links y rollout nativo
condicional. Inicio por 1852 con login vigente probado; commit documental autorizado, sin implementación, push ni deploy.
Diseño UI ampliado por pedido del operador: ocho documentos TASK-1854/1856 con pantallas H0/S1 y R0–R5,
campos de contenidos/SEO/diseño, deep links, recovery, adjuntos, copy, responsive y motion causal.
Primitives verificadas en código; tareas/backend/epic alineados. UI ready no hasta integración/primer fold/GVC;
umbral premium vigente ≥4.5, sin declarar capturas, scorecard ni funcionalidad desplegada.
Asignación Claude/Codex documentada en EPIC-022/045/046: modelo, esfuerzo y revisión por task/carril;
Astra para fronteras críticas, Sol para integración, Opus para UI/editorial y Fable para TASK-1669.
Reglas comunes en EPIC-046: un editor por archivos, continuidad de owner y sin ejecución/rollout implícitos.
Commit completo autorizado: incluye el movimiento previo de TASK-1690 a in-progress; lifecycle, registro y README conciliados, sin avance de implementación.

## 2026-09-08 — GPT Image 2.5 entra a la doc como capacidad de proveedor, no como camino disponible

OpenAI publicó `gpt-image-2.5-sunburst` y `gpt-image-2.5-flare`. La matriz de capacidades, la spec del
generador visual, el doc operativo, el ledger de la flota Globe y cuatro skills espejadas quedaron al
día contra la doc oficial, no contra la prensa.

Lo que cambia el trabajo real: OpenAI declara que **la calculadora de GPT Image 2 no estima el consumo
de 2.5** y que tarifas por token iguales no implican costo por imagen igual. Eso rompe la estimación
previa al gasto — el compiler de Globe reserva créditos ANTES de generar, y con 2.5 esa reserva no
tiene fuente documentada. Quedó registrado como bloqueador de integración, no como detalle de pricing.
Tampoco hay Batch ni rate limits publicados, así que `gpt-image-2` no se retira.

Se documentaron dos trampas silenciosas del helper local, verificadas leyendo el código: por env var,
`OPENAI_IMAGE_MODEL=gpt-image-2.5-*` no pasa el allowlist y cae a `gpt-image-2` sin avisar; por flag
CLI, `--model` se castea sin validar, así que el modelo sí viaja pero la resolución se degrada a la
rama legacy y se inyecta `input_fidelity`, que la guía de OpenAI excluye de Sunburst y Flare.

Inventariando el dominio apareció un tercer defecto de la misma forma: `DEFAULT_IMAGE_PROVIDER` apunta
a `imagen-4.0-generate-001`, que la arquitectura declara bloqueado. `TASK-1850` se creó y se supersedió
el mismo día por `TASK-1851`, que toma el contrato entero: partirlo habría dejado el mismo archivo con
dos dueños y el mismo invariante declarado en dos lugares. El hallazgo del auditor de flags —ciego a
`ENABLE_ASSET_GENERATOR` porque su patrón exige sufijo `_ENABLED` y éste lleva prefijo `ENABLE_`— NO
generó task: `TASK-1782` ya posee ese bug class y recibió un Delta. `TASK-278` recibió otro: sus
entregables existen en el repo con 0 de 11 criterios tildados.

También quedó por escrito lo que 2.5 NO mejora: OpenAI no afirma mejora de tipografía ni de texto
multilingüe, las cuatro limitaciones declaradas siguen vigentes, y el system card mide una mejora de
seguridad sin significancia estadística con Abuse peor que 2.0.

## 2026-09-08 — Efeonce Insights: arquitectura y programa multiformato

Extensión: skill operativa y distribución MCP/harness exigibles al cierre, con fuente común, routing,
versionado y evaluación de agente sin historial. Se integra en TASK-1845/1848/1849; no agrega tareas.

[EPIC-045](docs/epics/to-do/EPIC-045-efeonce-insights-multiformat-intelligence.md) formaliza cinco tasks
TASK-1845–1849: evidencia/adapters, render durable, catálogos deck/A4, acceso/correo/recurrencia y biblioteca/web.
ADR y arquitectura fijan dominio Greenhouse + Artifact Worker, tres salidas de primera clase, snapshots,
API/UI/MCP, co-branding y grants revocables. TASK-1672/1673 conservan integración de auditoría técnica SEO.
Sólo planificación autorizada; sin implementación, emisión de reportes ni rollout.

## 2026-09-08 — TASK-1844: autoridad interna multiorganización activada

Greenhouse resuelve autoridad por objetivo con consentimiento v2; gateway 1.3.0 descubre organizaciones
permitidas y revalida cada llamada sin ampliar `efeonce.mcp.read`. Expand/contract aplicadas y cohorte de
una persona ON. Codex, Claude Code, Claude hospedado/Desktop: A/B, negativos, refresh y revocación verificados.
Rollback/restore servido probado; Claude Code requiere login tras OFF. CIMD extendido de Claude admite
PKCE/refresh y rechaza JWT bearer; OAuth 150 passed. PR 230/main `45f6910e3`, orquestador `34281143424`
success, manifest released, Vercel exacto y watchdog 5/5. Fixtures retiradas; conexiones definitivas conservadas.
[QA y límites](docs/audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md).
Manual interno, documentación funcional/técnica, API, runbooks y skills Codex/Claude reconciliados; [cobertura](docs/audits/mcp/TASK-1844_DOCUMENTATION_SKILLS_CLOSURE_2026-09-08.md).

## 2026-09-08 — Berel cierra la doctrina de recuperación y QA editorial preventivo

La skill Berel y el gate client-visible incorporan el barrido obligatorio de todo el mes aun sin comentarios,
rechazo de links Notion/metadatos operativos en la zona vigente, preservación de análisis y specs congeladas,
edición/restauración segura y verificación del propio reporte. La
[auditoría fechada](docs/audits/seo/BEREL_CONTENT_HUB_EDITORIAL_LEAK_RECOVERY_2026-09-08.md) consolida octubre,
noviembre y diciembre, distingue el typo `segundasegunda` del contenido real y documenta `pintura sana` como
problema de claridad —no como palabra inexistente en México—. El contrato genérico de Notion añade baseline y
readback de discusiones para reemplazos/restauraciones; no hubo nuevas escrituras en Notion, Drupal ni Frame.io.

## 2026-09-08 — Berel adopta una propuesta de colaboración mensual y canales con función única

Efeonce aprobó internamente proponer desde septiembre una dinámica simplificada para Berel: Notion como fuente
central del trabajo, Frame.io para revisión visual/audiovisual, Teams para avisos y bloqueos, y correo para informe
mensual y cierre formal. Dos cortes mensuales alimentan una reunión de 45 minutos dentro de los primeros siete días
hábiles del mes siguiente; no se impone un SLA genérico de tres días para feedback. El contrato, módulo 19 y skills
espejo dejan separado lo aprobado internamente de la aceptación pendiente del cliente; no hubo cambio en Notion,
envío de correo, calendario ni alcance contratado.

## 2026-09-07 — Berel: comentarios, recuperación de octubre y contrato visual corregido

La skill espejo `berel-content-production` incorpora el delta del Playbook vivo para comentarios: claridad antes
que ingenio, una sección por intención, reubicación con costura, contenido evergreen y evaluación del diagnóstico
del cliente sin aceptar mecánicamente su remedio. `Atendido` queda separado de `resolved`; Efeonce prueba
decisión/cambio + respuesta + readback y el cliente cierra el hilo. Las 25 observaciones del lote se clasificaron
por causa primaria: claridad/estructura 10, precisión de producto 7, voz/localización 5 y alcance editorial 3.

El barrido preventivo de los diez artículos de octubre reveló una regresión propia: al retirar notas internas se
habían eliminado fichas visuales contextuales y reescrito copy no solicitado. Se restauraron byte a byte los siete
artículos sin comentarios; en los tres comentados se recuperaron historia y fichas sin deshacer títulos ni cambios
justificados. La lectura final de esos diez y del artículo centinela de herrería confirmó 44 fichas N1–N4 intactas,
30 hilos conservados y 59 comentarios, incluida la respuesta que faltaba. De las zonas editoriales se retiraron
solo notas de agente y operación ajena a la narrativa; no se modificaron assets, Frame.io ni Drupal.

Aclaración del operador del 2026-09-08: los toggles de Research/análisis/plan son evidencia obligatoria y siempre
permanecen en la página. La limpieza se limita al toggle editorial de artículo, reescritura o tutorial, donde no
pueden colarse notas de agente o texto ajeno a la narrativa. Skills y gate se alinearon con esta frontera; las
specs contextuales siguen protegidas y el análisis no se vuelve a tratar como fuga.

Segunda revisión preventiva: 11/11 páginas conservaron evidencia, 44 fichas N1–N4 y 12 fotos de paso; 30 hilos
y 59 comentarios permanecieron íntegros. Se corrigieron ocho fragmentos de planificación fuera de lugar en Día
de Muertos, Psicología del color y App Color Berel mediante reemplazos quirúrgicos; la delimitación de cluster
se movió al análisis. Gate final 11/11, sin cambios en arte, tareas, estados, Frame.io ni Drupal.

La causa raíz también quedó cerrada en los espejos Claude/Codex: las fichas N1–N4 son parte obligatoria del
artículo y se copian literalmente a las tareas visuales. Una vez producido el arte, composición, copy, ALT,
archivo, formato y posición quedan congelados hasta una conciliación explícita con diseño. El gate distingue
fichas de notas internas, exige exactamente N1–N4 completas y conserva la jerarquía de toggles.

## 2026-09-07 — TASK-1813 despliega discovery OAuth nativo/base-only y ensaya rollback

`efeonce-mcp` `1.2.0` deja Efeonce ID como único authorization server anunciado cuando el carril nativo está
activo, fija el bootstrap en `efeonce.mcp.read` y entrega scopes adicionales por challenge 403. Retira el shim
DCR/metadata AS del gateway, `OAUTH_PUBLIC_CLIENT_ID` y `MCP_REQUIRED_SCOPES` como controles de deploy, sin
retirar validación Entra legacy ni modificar grants, providers o tool surface. El harness conductual pasa
154/154 sin omitidos; CI `34162827740` construyó además el contenedor. El deploy manual `34162885950` dejó
`cd229069` en `efeonce-mcp-gateway-00047-8b5` / `sha256:608a4789…b29e`, 100 % Ready. El canary productivo
confirmó PRM root/path base-only, shim `404`, `/register` `404` y MCP anónimo `401`. El rollback movió 100 % a
`00046-6n2`, reprodujo el contrato anterior, restauró 100 % a `00047-8b5` y repitió los asserts nuevos.
Claude Code `2.1.263` refrescó con scope base único e invocó una lectura sin gasto. Codex `0.153.4` canary emitió
un token CIMD externo sólo con `efeonce.mcp.read` y ejecutó status + lectura SEO sin gasto; Claude.ai repitió una
lectura hospedada base-only con `no_entitlement` y uso cero. Claude Desktop `1.46388.4` y ChatGPT hospedado
repitieron `get_seo_entitlement` post-cutover: respuesta visible `ok=true`, `no_entitlement`, allowance/presupuesto
cero; sus familias renovaron con scope único y Cloud Run correlacionó `POST /mcp` 200 contra `00047-8b5`. En un
flujo separado, `jreyes@efeoncepro.com` autenticó con Microsoft y llegó al consentimiento corporativo sólo para
`Efeonce`; el code expiró sin intercambio, token ni dispatch. La autoridad interna multiorganización queda en
TASK-1844/U19. No hubo cambios Entra ni widening. La skill MCP y sus referencias Claude/Codex quedaron alineadas
con el rollout servido y ese límite. [Task y evidencia](docs/tasks/complete/TASK-1813-efeonce-mcp-oauth-client-interoperability.md).

## 2026-09-07 — EPIC-044 asume entrada multiproducto y consentimiento por relying party

La dirección descubierta en TASK-1834 dejó de ser un supuesto local de Greenhouse. El nuevo ADR Accepted
`EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` fija el contrato de EPIC-044: cada producto conserva
URL, contexto, destino, sesión y autorización; una cohorte first-party habilitada redirige server-side al único
login visible de Efeonce ID y puede usar fast path si la sesión satisface assurance. Sólo una clasificación
`first_party_sign_in` registrada y server-owned omite consentimiento delegado para establecer identidad. MCP y
terceros conservan consentimiento por cliente/scope, step-up, grants y tokens/audiencias propios.

EPIC-044 y TASK-1829/1830/1831/1833/1834/1840/1841/1842 quedaron sincronizadas según su ownership; TASK-1834
permanece como primer consumer Greenhouse y no como dueña de la policy transversal. Las skills MCP y Design
Studio apuntan al ADR y preservan las prohibiciones de iframe, quinto provider, vestíbulo y contexto controlado
por el browser. El ADR nativo anterior mantiene su historia y sólo agrega un delta fechado. Este cambio es
documental: no implementa OIDC first-party, no cambia login, flags, datos ni runtime, y no hizo commit, push ni
deploy.

## 2026-09-07 — TASK-1832: Claude Code y Claude.ai completan OAuth y lectura real

La falla de Claude Code quedó atribuida a `2.1.186`: esa versión pedía el catálogo completo descubierto.
Anthropic corrigió el comportamiento desde `2.1.196`; el CLI local quedó en `2.1.263` con
`oauth.scopes="efeonce.mcp.read"`. Un login nuevo completó PKCE S256, consentimiento de la organización canary,
catálogo de dos tools read-only y `get_seo_entitlement=no_entitlement`; el write no estuvo disponible. Una
repetición posterior al TTL rotó la familia sin widening: dos access/refresh, uno rotado y uno activo. El warning
SEP-2352 del cliente sobre una credencial aún sin sello `issuer` se conserva como observación no bloqueante.

Claude.ai agregó el custom connector remoto con un segundo DCR público exclusivo, `software_id=run_id`, callback
hospedado exacto, secret vacío, OAuth siempre requerido y Streamable HTTP. Se eligió el cliente propio en vez del
CIMD compartido detectado por Anthropic para preservar el contrato de borrado. El consentimiento fue base-only,
las mismas dos tools quedaron visibles y una llamada aprobada devolvió `no_entitlement` con todos los contadores
en cero. La repetición post-TTL rotó una vez y conservó el scope. Claude Desktop `1.46388.4` abrió el chat desde
la app nativa, pidió aprobación propia y ejecutó la misma lectura sobre el conector remoto.

El dry-run incorporó ambos DCR: 22 clientes, 21 codes/consents, 29 access/refresh, 18 sesiones, 14 magic links,
2 passkeys, 5 challenges y 4 contexts; `unexpectedRefs=0`. La documentación y las skills MCP ahora distinguen
versión/local/hospedado, DCR run-owned frente a CIMD compartido, serialización observable de
schemas/annotations/security, probe vacío 401/400 y refresh real post-TTL. TASK-1832 continúa en observación y no
se cierra antes del cleanup/readback cero. La matriz técnica cliente quedó completa; sólo siguen abiertos la
ventana de observación y el retiro controlado.

Un barrido documental posterior eliminó estados vivos que todavía presentaban Claude, el emisor o la
federación como pendientes y dejó los detalles mutables en el manifest. Las skills espejadas ahora exigen
monitoreo read-only, distinguen superficies Claude compartidas de clientes OAuth persistidos y prohíben
adelantar el cleanup antes de `delete_after`. La muestra de observación de 12:09:54Z mantuvo `unexpectedRefs=0`,
cero contaminación 360/comercial y sólo los blockers esperados de la ventana; no cambió runtime ni flags.

## 2026-09-07 — TASK-1832: ChatGPT completa el OAuth hospedado y el gateway endurece el probe vacío

ChatGPT ya funciona de punta a punta con el authorization server y el gateway productivos. La app hospedada
`Efeonce` se registró por DCR, mostró la organización canary exacta y autorizó sólo `efeonce.mcp.read`. Tras
actualizar su definición importó exactamente dos tools read-only —estado del gateway y entitlement SEO— y
ejecutó ambas: `ready` y `no_entitlement` con presupuesto cero, sin ninguna escritura. La familia OAuth rotó dos
veces después del TTL inicial y mantuvo siempre el scope base; el cliente terminó con dos refresh usados y uno
activo. Esto sustituye la hipótesis de que la ausencia de `offline_access` impediría continuidad: el
comportamiento hospedado real no lo solicitó ni lo necesitó.

La primera actualización de ChatGPT reveló un borde de protocolo: su `POST /mcp` con JSON vacío fallaba en el
parser de Fastify antes de autenticar y el handler global lo convertía en 500. El gateway `v1.1.2`, commit
`171965c99034`, ahora autentica primero ese probe y devuelve 401 con el challenge canónico sin bearer, o 400
`invalid_request` con bearer válido. `pnpm check` pasó 153/153, CI `34111553554` y deploy `34111643880`
terminaron verdes; `efeonce-mcp-gateway-00046-6n2` sirve 100 % y la repetición hospedada respondió 200 sin nuevos 500. El gateway usa los paquetes MCP v2 estables `2.0.0`; no se hizo downgrade al paquete monolítico v1.

El dry-run posterior agregó el DCR de ChatGPT al contrato de retiro: 20 clientes, 19 codes/consents, 25
access/refresh tokens, 18 sesiones, 14 magic links, 2 passkeys, 5 challenges y 4 contexts;
`unexpectedRefs=0`, sin contaminación comercial/360. Claude Code continúa fail-closed por scopes adicionales y
de escritura en `TASK-1813`; Claude Desktop/web no está certificado. TASK-1832 sigue en observación hasta los
siete días, cleanup/readback cero desde `2026-09-13T19:43:30Z` y apagado de ambos gates.

## 2026-09-06 — TASK-1832 entra en observación productiva con retiro verificable

La organización canary dedicada ya recorre el mismo emisor y gateway productivos que usaría un cliente, pero
sigue fuera de Account/Person 360 y de toda superficie comercial. Vercel/auth-server sirven `fb5fc082aa92`; el
gateway sirve `8438c5fa87ed`; ambos gates canary están ON. M365, Gmail personal autorizado, magic link, passkey
Chrome/Safari, consentimiento, PKCE, refresh, revocación de familia, base-only, internal-only y revocación de
authority en `19.272 s` tienen evidencia live. Codex 0.153.4 completó una lectura MCP real sin gasto.
El E2E Playwright productivo pasó `1/1` en Chrome con listener loopback real: DCR+PKCE, consentimiento, JWT,
MCP initialize/list/call, refresh, revocación y logout `401`, sin persistir storage state ni tokens.

Claude Code 2.1.186 pidió scopes desconocidos y de escritura antes del consentimiento; el emisor lo rechazó y
el defecto volvió a TASK-1813. No se amplió la allowlist. La expiración natural recibió `401 invalid_token`
después de `899 s`, antes de rotar o revocar la familia; otra ceremonia exigió el `organization_id` exacto y
confirmó el fixture servido. Los clientes hospedados siguen abiertos, igual que siete días de observación y el
cleanup final. El dry-run post-Playwright enumera 19 DCR y todo el grafo auth/identity, con
`unexpectedRefs=0`; se niega correctamente mientras authority/auth están activas. Los cuatro DCR usados por
error con una sesión interna siguen siendo run-owned y el cleanup conserva esa identidad compartida. El wordmark
ausente del correo se restauró como asset público compartido y quedó visible en Gmail; no se eliminará con el
fixture. El readback dejó las sesiones humanas canary activas en cero y conserva sólo la passkey necesaria para
la observación. Quedó activa una automatización diaria silenciosa para vigilar la ventana y ejecutar el retiro
sólo desde `delete_after` con todas las precondiciones verdes.
Los cinco consentimientos Playwright y las dos familias emitidas durante los intentos se revocaron por el store
canónico; los cinco DCR quedaron en el manifest para el cleanup final.

El preflight del cliente hospedado agregó un riesgo específico a TASK-1813: el emisor anuncia y entrega refresh
tokens rotativos, pero discovery no publica `offline_access`, recomendado por OpenAI para conservar la conexión.
No se alteró runtime ni se amplió el catálogo; la fila ChatGPT exige ceremonia hospedada y renovación post-TTL.

El push de endurecimiento `b69f5297d` mostró una colisión real del entorno compartido: el workflow staging
`34071542507` desplegó `auth-server-00042-hp5` con el gate canary OFF sobre el Cloud Run único. El intervalo
fail-closed duró desde 01:07:25Z hasta 01:15:47Z y no concedió acceso. El dispatch production `34072064873`,
fijado al SHA released `fb5fc082aa92`, restauró `auth-server-00043-ndg`, 100 % de tráfico, `Ready=True`, gate ON;
`readyz` y preflight OAuth/MCP pasaron. Para evitar repetición durante la observación, se eliminaron los overrides
staging/production y quedó una sola variable GitHub de repositorio en `true`; Vercel staging continúa OFF. El
cleanup final debe apagar esa variable y Vercel Production antes del readback de gates.

Una lectura posterior del control plane mostró que esa última afirmación documental era falsa: la variable
Vercel del environment custom staging estaba en `true`. Se corrigió su valor exacto a `false`; el primer
redeploy de recuperación fue `dpl_6UUXxsT7eS4EL44kkLWuDrHFqKDT` y la build final de `develop@c75a07f`,
`dpl_D9mkjQLE1a26H4TXQ2HX7wXWMpLf`, quedó READY desde `2026-09-07T02:03:16.160Z`, tomó los aliases de staging
y respondió 200 en `/api/auth/session`. Production permaneció `true` y no se redeployó. La evidencia cubre
config/build; el deny flow-level de staging no se infiere.

## 2026-09-06 — TASK-1835 completa: Efeonce ID tiene cara, y el gate de accesibilidad estaba ciego

`auth.efeonce.org` sirve su experiencia visible: login con passkey, Microsoft y enlace por correo;
consentimiento que dice a qué dominio viaja el código; step-up, alta de segundo factor, recuperación,
sesión y errores. Desplegado y verificado en vivo.

Tres hallazgos valieron más que el trabajo planificado:

- **El login por passkey no existía.** Backend completo y copy escrito desde el 2026-09-04, con los
  cuatro ids `login_passkey_*` huérfanos: ninguna pantalla ofrecía el método.
- 🔴 **El gate de accesibilidad reportaba `violations: 0` sin medir nada.** axe devuelve todo en
  `incomplete` cuando el fondo es un degradado con pseudo-elemento, y el gate lo informaba como cero.
  Debajo había texto a **1.53:1** en la ficha de aplicación del consentimiento — justo lo que tiene
  que leerse. Causa raíz: una clase de texto compartida entre el lienzo oscuro y la tarjeta clara.
  **Aplica a cualquier superficie con fondo compuesto, no sólo al emisor.**
- **El servidor contaba los códigos de respaldo restantes y la pantalla los ignoraba.** Alguien podía
  quemar el último y enterarse el día que perdiera el teléfono.

Un cuarto hallazgo fue mío y lo corregí el mismo día: agregué al pie de todas las pantallas un enlace
a las licencias de las fuentes, porque su id de copy estaba huérfano. Construir una interfaz para
justificar un copy muerto es el razonamiento al revés —el copy se borra—, y encima el lugar era la
pantalla donde alguien decide si confía para entrar. Retirado; los `.txt` se siguen sirviendo, que es
donde la licencia se cumple.

Mecanismos que quedan corriendo: `pnpm auth-server:verify-contrast` (mide sobre los píxeles
renderizados; 365 textos, 0 bajo el piso WCAG) y `pnpm auth-server:verify-passkey` (14/14 en navegador
real). El patrón «runtime sin React» queda registrado en `ui-platform/PATTERNS.md` para que ningún
otro servicio Efeonce arranque un segundo sistema visual.

GVC premium 29 fixtures × 2 viewports (58 capturas); scorecard 4.63 / piso 4.5; los cuatro gates
`ui:*` PASS; suite del emisor 427.

Follow-up abierto: **`TASK-1842`** — ninguna persona puede crear una passkey todavía, así que el botón
nuevo le queda inerte y cada entrada sigue siendo un correo. Bloqueada por `TASK-1834`.

## 2026-09-06 — TASK-1832: schema canary aplicado fuera del checkpoint, sin fixture

`pnpm pg:connect:migrate` se ejecutó por error como si sólo levantara el proxy y aplicó las dos migraciones de
TASK-1832. El readback inmediato confirmó registry/bindings canary en cero, purpose sin drift y los 30 perfiles
`smoke_test` preservados en identidad pero excluidos de Person 360. No se crearon organización, cuentas, grants,
sesiones ni tokens; flags OFF/default, sin push/deploy. Se detuvieron nuevas mutaciones externas y quedó
documentada la decisión pendiente de conservar el schema adelantado o autorizar una migración compensatoria.
La implementación local pasó 144/144 tests focales, typecheck, lint sin errores y build; el gateway hermano pasó
152/152 tests sin skips y build. `secrets:audit` local no acredita runtime: 6/8 saludables, con `NEXTAUTH_URL`
local inválida y `CRON_SECRET` ausente; TASK-1832 no cambió secretos.
[Evidencia](docs/audits/mcp/TASK-1832_SCHEMA_APPLY_READBACK_2026-09-06.md).

**Decisión posterior:** el operador resolvió conservar el schema aditivo y autorizó completar el rollout
sintético: commit/push, promoción, deploys, gates, fixture dedicado, buzones controlados, sesiones canary,
revocación y cleanup. La autorización no incorpora clientes ni habilita writes; la task sigue pendiente hasta
matriz runtime, retiro demostrable y siete días de señales estables.
