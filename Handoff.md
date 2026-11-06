# Handoff

[Historial de sesiones](Handoff.archive.md).

## 2026-11-06 — SKY BLACK 2026: Daniela aprobó todo salvo la story de Pucallpa (corregida, en revisión)

Teams 10:28 + Frame «V2»: todo aprobado; la story de Pucallpa no tenía su corrección («subir un poco más la torre, sin
que choque con el logo», aviso de Frame 2026-11-05 17:05). Corregida con `lift` 0.07 en `fotos-destino.json` (la torre
sube ~130 px; queda ~30 px bajo el logo). `split.py` mueve piezas entre carpetas: «APROBADO» 29, «PARA REVISION» sólo
`BS_STORY_PCL.png` + LEEME. «BLACK SKY 2026» (1 archivo) y «ENTREGABLES BLACK» al día; canvas versión 53. Workbench:
rama `claude/sky-black-2026-pucallpa` commit `074cdc6` (contrato de fotos + admisor idempotente), **sin push ni PR**.
Pendiente: visto bueno de Daniela a la story de Pucallpa; PR del Workbench con autorización.

## 2026-11-06 — SKY BLACK 2026: el Creative Workbench construye las piezas aprobadas con sus cifras

Pedido de Julio: las piezas aprobadas por Daniela sólo esperan precio; el Workbench tiene que poder construirlas.
**Workbench** (worktree `/Users/jreye/Documents/creative-workbench-sky-black`, rama `claude/sky-black-2026`, commit
`ca44bd0` → **mergeado en `main` por PR efeoncepro/creative-workbench#35, squash `a47fea2`**, conciliado: árbol idéntico,
gates y pruebas en verde, pieza byte a byte igual): familia declarada `brands/sky-airline/campaigns/black-2026/` que recompone KV, popup y
story de las 39 piezas desde sus capas aprobadas (sha256, fuera de Git en `clients/sky/.resources-local/black-2026/`)
y dibuja con Metric las cifras del job (importes, descuento, campos del legal vivo AR/UY/CL y el legal completo de
PE/BR/US, que en el kit viene trazado; transcripción verificada en el contrato). Paridad con marcadores: 117 PNG,
media ≤ 0,50/255. 39 jobs con `null` en `projects/sky/black-sky-2026/jobs/` hasta que SKY dé precios y fechas.
**Greenhouse:** `taller/kvhm-canvas/exportar-workbench.cjs` (exporta capas sin cifras + fichas), skill
`sky-black-pipeline.md` §19 + router + `state-continuity` (espejo `.codex`) y manual SKY 1.10 (paso 7i).
**Pendiente:** cifras de SKY; fase 2 (GIF/MP4, story en video, PMAX, HPH);
«DESDE BUENOS AIRES» desborda la píldora de AR Lima (el QA lo avisa).

## 2026-11-06 — Blog SKY: fichas del Content Hub plegadas en secciones y ronda de revisión de imágenes resuelta

**Content Hub:** Julio: «dejaste la chorrera de texto». Se plegaron 44 fichas del lote de noviembre y de las pruebas de
octubre. Cada una tiene el callout 🧭 «Cómo leer esta página», el índice y cinco toggles h1: Brief, Research, Artículo
(con la ficha SEO y el JSON-LD en sus propios toggles), Fuentes y hallazgos, y Producción y cambios. En las de octubre,
la versión anterior quedó en un toggle 🗄️ y sus subpáginas V1, V2 y V3 siguen intactas.

- El cambio sólo insertó etiquetas con `update_content`; no cambió texto ni propiedades.
- Se leyeron de vuelta 7 fichas: balance 0 y sin etiquetas literales.
- Cinco ya venían ordenadas y no se tocaron: Punta Sal, Tipos de equipaje, Zorritos y Año Nuevo en Santiago, con
  toggles, y Cena chilena, con pestañas.
- Tampoco se tocaron las fichas Idea de diciembre (sólo brief) ni los temas rechazados.
- Norma en `sky-blog-seo-editorial/references/lote-editorial.md` §6; generador y verificador en
  `outputs/sky-blog-content-hub-estructura/`.

**Imágenes de noviembre:** la ronda de Frame.io (35 comentarios de Melkin y Andrés) y del chat de Teams quedó resuelta.

- CTA de escritorio centrado bajo la ruta (Workbench `d5281de`).
- Retoques con máscaras que cubren objetos enteros; el cielo de N14 IMG 3 se cambió con una edición de la imagen
  completa; N23 IMG 2 es nueva.
- OneDrive en `V1/` (la entrega de las 09:11) y `V2/` (lo vigente) en 45 carpetas; 72 archivos difieren y el índice
  tiene la columna «Versión».
- Docs: skill `sky-blog-graphic-line` (lecciones, revisión, flujo, banners), sistema visual del Workbench §8.8 y
  README de la pieza (`70c2adc`), expediente y manual de imágenes.
- **La respuesta a Diseño en Teams está redactada y sin enviar**, a la espera del permiso de Julio.
- Sin push en ninguno de los dos repos.

## 2026-11-06 — SKY BLACK 2026: taller rescatado a carpeta durable y prueba en frío

El taller del kit (scripts, kit corregido `src2/`, fotos de destino, fuentes y copia del canvas) vivía en el
scratchpad temporal de otra sesión (`/private/tmp/…/556be26d…`), que se borra al reiniciar. Quedó en
`ai-generations/2026-11-04_sky-black-gif/taller/` (≈ 1 GB en disco; en git sólo el código: 54 archivos, 384 KB, con
`taller/.gitignore`; kit, fotos y fuentes con licencia quedan fuera). Rutas fijas al scratchpad reemplazadas por rutas
relativas; nuevo `doctor.sh` (chequeo de arranque, solo lectura). **Prueba en frío:** un agente sin contexto, con solo la
skill, copió el taller y corrió `rehacer-destinos.sh`: «LISTO», 21 piezas rehechas en ≈ 1 min 40 s y `formatos/` 78/78
byte-idénticos (42 reescritos). `png/` varía unos píxeles en las piezas con flecha corrida (tolerancia documentada).
Skill `efeonce-creative-workbench` (`sky-black-pipeline.md` §0, §4.5, §17 y §17.1; `state-continuity`;
`sky-design-canvas`; espejo `.codex`) y manual SKY 1.9. `OUT/scripts/` quedó superada. Sin push.

## 2026-11-06 — Insights: búsqueda siempre con motores de respuesta (estándar) y Berel octubre rehecho

**Decisión del operador:** todo informe con `seo` lleva `aeo`, lo más completo posible. `missingCompanionModules`
(`contracts/request.ts`) lo impone en `validate-request.ts` (creación, revisión, recurrencias) y en
`preview-edition.ts`; el alcance de contenido recorta sólo el capítulo SEO. Además: la vista previa imprime cada rechazo
con su motivo, y lo esencial ya no dice «de 1.648 a 1.082 de 1.121» (`arrivalText`). Código local, sin push ni release.
**Berel octubre rehecho con AEO** (análisis del 3-oct: 5 motores, Share of Model 41,7 %, Share of Voice 44,6 % frente a
Comex/Sherwin-Williams/Behr, citas 26,8 %, sentimiento, visitas desde IA 1.121): A4 32 págs. y deck 25, reemplazados en
OneDrive `Berel/Informes/` y en `~/Desktop/Berel - Informe octubre 2026/`. **El borrador de correo quedó desactualizado:**
no menciona AEO; hay que sumarle los hallazgos de motores de respuesta antes de enviar (sigue sin enviarse).
**Pendiente:** Claude (33,3 %) no entra a la figura de mención por motor porque no tiene período anterior; sale en
texto y tabla (requiere cambiar `chart_spec_v1`).

## 2026-11-05 — Insights Berel octubre «sólo blog»: clics completos (ISSUE-191), valor estimado y redes

**Código (develop, sin push ni release):** `f45230b2e`, `a01a043dc`, `4c2de9aca`, `b583cd93f`. El capítulo SEO de
Insights toma totales, serie, contexto del sitio y movimientos de páginas del control de Search Console sin la
dimensión consulta (`readSeoSearchControlForWindow`, adapter `seo_report_adapter_v2`); la cascada suma «Consultas que
Google no muestra»; si el control falla, límite, nunca la tabla. Nuevo `organic_value_usd` (`readOrganicTrafficValueForWindow`,
sólo CPC capturados, sin CPC = límite) y `site.social_sessions`/`social_source.*` de GA4. CLI de valor orgánico con
`--markets --brand --content-scope` y `sc-domain:`. Vista previa con `--modules` y `--title`; fix de etiquetas gemelas.
Necesita `GROWTH_SEARCH_CONSOLE_ENABLED` + OAuth de Search Console en el runtime que genera la edición.
**Berel:** blog octubre 4.094 clics (antes se habrían impreso 1.065); el informe de septiembre entregado el 2026-10-12
imprimió 799 de 3.540. Compra CPC MX única autorizada (508 consultas, task DataForSEO
`11041847-1987-0607-0000-0e19efc03a45`, USD 0,04836). PDF A4 (18 págs.) y deck (14) desde la **vista previa local**, no
por el flujo de producción, en OneDrive `Alineación/1. Clientes (Interno)/Berel/Informes/`.
**Correo a Berel: redactado, NO enviado** (Para María Fernanda Vega, Anel Garza y Marcela Espinoza; CC Valentina Hoyos y
Daniela Ferreira; CCO HubSpot; debía salir el lunes 2026-11-02, pide disculpas y explica visitas desde redes y la
medición completa de clics). **Los PDF muestran el valor publicitario de ~US$ 85 (A4 págs. 6 y 14, y el deck) que el
correo omite por decisión del operador:** confirmar con él antes de adjuntar.
**Pendiente:** push + release; tablero SEO y demás readers de `seo_gsc_daily` siguen sumando el subconjunto
(ISSUE-191 open); corrección de URLs migradas en movimientos (hoy regla manual); captura de CPC de consultas nuevas por
mes es manual. Docs: funcional Insights 1.26, valor orgánico 1.1 (funcional y manual), manual Insights 1.23.

## 2026-11-05 — GPT Image 2.6 (Sunburst/Flare) en la CLI, junto a 2.5

**Código (develop, sin push):** `src/lib/ai/openai-image.ts` (modelos 2.6 + `gpt-image-2-2026-04-21`; tabla de capacidades
con `complexity`/`svgOutput`/`gifOutput`/`markup`/`tokenFamily`/`shutdownDate`; `assertOpenAIImageOptionsSupported`;
estimación 2.6 = tokens 2.5 × factor medido; `svgUsage`; `imageModel` en el tool de Responses), `scripts/ai/generate-image.ts`
(flags `--complexity --format gif|svg --svg-model --svg-effort --frames --frame-ms --markup --compression --moderation
--estimate`; ayuda con la tabla «¿2.5 o 2.6?»), adaptador de `ai:inpaint` (acepta 2.6, Sunburst 2.5 y 2.6 sin máscara,
`complexity: low`). Default de `ai:image` → `gpt-image-2.5-flare` (operador, 2026-11-05; `gpt-image-2` con `--model`);
el runtime sigue `gpt-image-2`. Tests focales 200/200, typecheck y lint limpios.
**Evidencia:** `ai-generations/2026-11-05_gpt-image-2-6-canary/` (`results.json`, `cli/`, `cli/rayado/`), clave personal,
~USD 1 en total. Medido: tokens 2.6 a 1024² low 824 · medium 1.449 · high 1.758 · xhigh 3.122 · max 7.024; SVG exige
`svg.model`; GIF también en edits, hoja ≤ 3840 y 8,3 MP (9×640² sí, 9×1024² no); markup en 2.5 y 2.6 sin tokens de
entrada extra; rayado sobre la foto funciona; Sunburst 2.6 + máscara del pipeline = panel negro; Flare 2.6 PASS; el tool
de Responses aceptó `tool.model` 2.6 aunque la ficha oficial dice que no.
**Docs:** guía de modelos §2/§4/§5.1/§7/§8/§9/§12, matriz del proveedor OpenAI, arquitectura del generador, skills de
imagen/diseño/ads/social, manual nuevo `generar-y-editar-imagenes-con-gpt-image.md`, funcional y manual de inpaint.
**Pendiente:** canario de identidad de personas con 2.6 antes de usarlo en fotografía de marca; comparar 2.5 vs 2.6 en
una pieza final real; Batch de 2.5 sin confirmar; `models:inventory`/`freshness` no cuentan los ids de OpenAI; el commit
`48f6dd6de` y este trabajo siguen sin push.

**Glitch Flash publicado:** [artículo y cierre](docs/public-site/glitch-flash-images-2-6/README.md), post 252401,
autor Julio, cuatro pruebas crudas de Nexa, cinco Drops. Corrección del operador: dos Vimeo incrustados con
captions; autoría `youtube | vimeo` y filtro responsive de la clase editorial en el runtime canónico, desplegado
con hash/backup. Reproducción y ratios 16:9/4:1 comprobados a 1440/390, sin desborde. 90 tests de autoría y
39 checks del parser WordPress PASS. Código local sin commit/push; backups y hashes de rollback en el cierre.

## 2026-11-04 — SKY en Claude Design: CyberSky Perú y kit BLACK

**Artifacts privados:** DS [«SKY Airline — Performance»](https://claude.ai/artifact/Rc3NFQNXvjDgkWsxrzSEei) (desde las
126 adaptaciones del pack SKY 0.1.0; Metric Regular/Semibold/Bold/Black, **sin Medium**) y canvas
[«SKY CyberSky Perú — Adaptaciones»](https://claude.ai/artifact/QTy12G38oQYB1xrnZmkpee) (v21; DS instalado por copia).
Páginas: Internacionales + Nacionales (66 piezas CyberSky, 22 destinos × popup/post/story), Plantillas, KV Black · HM
(12 KV fijos), KV Black · Animación GIF (12 videos en bucle + 6 referencias + previa con audio), KV Black · Popup y
Story (24 estáticos). **Local, sin versionar:** PDF de 66 páginas en `~/Downloads/`; `ai-generations/2026-11-04_sky-black-gif/`
(12 GIF, 12 MP4, 12 MP4 con audio, `estaticos/`, `scripts/`) y `ai-generations/2026-11-04_sky-cybersky-peru/` (21 selfies
GPT Image, ~USD 5,3 con clave personal autorizada). **Sin confirmar por el operador:** «S/» vs «$/», miles con coma, origen
Lima, tramo del legal y elementos sólo de Cusco. **A corregir en la fuente (OneDrive no se tocó):** bandera CL que es AR,
`SKY-13.svg` es Brasil, derechos de medalla y foto con marcas de IA, flecha en 3 piezas, clúster internacional
desalineado y con franja, textos DCTO/«tramo»/«Stock» inconsistentes, legales trazados, sin logos de alianza ni URL.
[Manual](docs/manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md) · [funcional](docs/documentation/creative/adaptaciones-sky-en-claude-design.md).
**Segunda ronda (pedidos de Daniela por Teams, 2026-11-04):** logo BLACK corregido en todas las fuentes (fecha
«25 de noviembre al 2 de diciembre» en ES/PT/EN, línea del marco flexible, menos resplandor) con `logofix.cjs` → `src2/`
y todo rehecho en cascada (KV, partes, popup/story, GIF, PMAX, HPH). Nuevas páginas del canvas: «Grilla por mercado»
(12 mensajes CL/PE/AR/UY/BR/US con KV, popup, GIF, story y story video de 5 slides con audio), «Rutas foco Perú»
(13 rutas, popup + story, PromPerú y ubicación placeholder) y «Chile KV listo» (TikTok ×3, DAT ×2, PMAX ×4 desde los
editables). HPH por mercado con la lista de banderas del mercado. **Por confirmar:** BR «Voe para Peru» (alianza o KV),
«Vuela por Perú» sin fotos, «Encuentra destinos» CL hecho con el clúster internacional, frases INTER del brandlift y
traducciones, tapa vertical ES recortada de la horizontal (falta en el kit).
**Entrega en OneDrive (2026-11-05):** los 321 entregables (sin `scripts/`) quedaron en una carpeta nueva,
`Despliegue Base/ENTREGABLES BLACK (Efeonce 2026-11-05)/` (GIF Y VIDEO KV, KV ESTATICOS, POPUP Y STORY, RUTAS FOCO
PERU, CHILE KV LISTO, STORY VIDEO 5 SLIDES, PMAX, HPH; 626 MB), verificados byte a byte con `diff -rq`/`cmp`. El kit
no se tocó; la subida a la nube depende de la sincronización de OneDrive.
**Documentación completa (2026-11-05):** catálogo técnico de formatos y taxonomía (`sky-format-catalog.md`), pipeline
script por script (`sky-black-pipeline.md`), catálogo funcional (`docs/documentation/creative/catalogo-formatos-sky.md`)
y manual v1.4. Se encontraron 6 PMAX 1080 de DOM-RUTA/INTER-RUTA con la fecha vieja del logo: se recopiaron desde su
popup, KV y story en local y en OneDrive (`cmp` idéntico). Scripts, `bbox.json`, manifiesto e inventarios quedaron
persistidos en `ai-generations/2026-11-04_sky-black-gif/scripts/` (el scratchpad es temporal).
**Tercera ronda (2026-11-05, Teams):** las 15 rutas foco del CSV de Daniela llevan su foto aprobada, legal, ubicación
y crédito; «Vuela por el Perú» y AR Santiago/Lima llevan foto del destino (`destinos.cjs`, `fotos-destino.json`). Todo
quedó ordenado en `10_Noviembre/BLACK SKY 2026/` (155 archivos, sólo .gif en GIF + POPUP, `organizar.cjs`); canvas en versión 38: foto
completa con degradado superior del 20 % a 0 (sombra y cielo prolongado rechazados), créditos arriba a la izquierda y story
con PromPerú entre precio y pie. **Pendiente:**
fotos de Chiclayo y Talara; ubicación del CSV ≠ foto en Pucallpa y Trujillo; «DESDE LIMA» deducido; CL «Encuentra destinos».
**Cuarta ronda (2026-11-05, 11 comentarios del canvas, versión 40):** velo diagonal del logo con intensidad medida por
foto (reemplaza al degradado plano 20 %), regla destino ↔ flecha de precio a 40 px (`brecha.cjs` en el SVG y
`compose.cjs` en popup/story; también corre los popups de los KV del kit), Chile Travel pegado a la esquina, AR
Santiago con foto de verano, story de Tacna reencuadrada, stories con PromPerú centrado y marca de agua y ubicación
pegadas arriba, aro de banderas de 2 px (KV, GIF, story en video y HPH por mercado). Actualizado en canvas,
`BLACK SKY 2026` y ENTREGABLES. **Por confirmar:** que la regla de la flecha valga también para los popups del kit.
**Quinta ronda (2026-11-05, Teams y Frame.io, canvas versión 44):** gradiente de referencia de Daniela
(`GRAFICOS/Gradiente para imagenes`, negro 69 % → 0) en lugar del velo diagonal. A todo el alto tapaba caras (rechazado por
Julio) y quedó acotado bajo el logo (`FADE_FIN` 0,42/0,50/0,46), con comparación A/B enviada. Talara (ballena) y Chiclayo
(Muelle de Pimentel) con foto de `BANCO DE VIDEOS/02_PERU/PROMPERU/` y ubicación del CSV; Iquitos, Talara y Chiclayo
reencuadrados con `lift`; stories en video de AR Lima, AR Santiago y «Vuela por el Perú» con el destino en intro y
brandlift. `BLACK SKY 2026` (46 archivos) y ENTREGABLES actualizados. **Por confirmar:** largo del gradiente; foto de
Chiclayo (Daniela sólo comentó Talara). Los comentarios de Frame.io no se pueden responder desde aquí.
**Sexta ronda (2026-11-05, Frame.io `https://f.io/VZlcCQta`, canvas versión 47):** 30 comentarios de Daniela sobre las
rutas (versión de la cuarta ronda). Aplicados: Ayacucho sin personas (reencuadre), Trujillo popup con más cielo, crédito de
PromPerú a 18 px en la story, y stories de Piura, Arequipa, Juliaca y Pucallpa expandidas hacia arriba con GPT Image 2.6
Flare (fal sin saldo en sus dos cuentas; ≈ USD 0,15, aprobado por Julio). `BLACK SKY 2026` (30 archivos) y ENTREGABLES al día.
**Por confirmar:** story de Tarapoto («APROBADA» con estado de ajuste) y story de Tumbes (sin comentario).
**Séptima ronda (2026-11-05, segunda revisión en Frame y Teams, canvas versión 51):** Talara = Playa Las Pocitas y Piura =
Playa Vichayito (foto y ubicación de su carpeta; `ubic` en `fotos-destino.json` manda sobre el CSV), story de Tarapoto
expandida (≈ USD 0,04), piso más alto en el popup de Cusco y degradado inferior negro en las piezas con foto de destino (GIF
y story video de AR Lima, AR Santiago y «Vuela por el Perú» rehechos). Carpetas `BLACK SKY 2026 - APROBADO` (19) y
`- PARA REVISION` (11 + LEEME) en `10_Noviembre/`. **Pendiente:** visto bueno de Ayacucho, Chiclayo y story de Pucallpa.

## 2026-11-04 — Fix del BreadcrumbList en efeoncepro.com, pushes y CLAUDE.md bajo presupuesto

**SEO (en producción):** GSC avisó «Falta el campo "item" (en "itemListElement")» (3 correos idénticos; que vengan
de varias propiedades de GSC es inferencia). Causa: Yoast emite en la portada un BreadcrumbList de un solo ListItem
sin `item`. Fix: mu-plugin `wp-content/mu-plugins/efeonce-breadcrumb-single-item.php` (repo
`efeoncepro/efeonce-public-site-runtime`, commit `64d8c59`), instalado en Kinsta con
`scripts/public-website/install-breadcrumb-single-item-mu-plugin.php` (commit `fa3f57dbf`). Verificado en vivo;
re-barrido de 113 URLs del sitemap con 0 problemas. Detalle técnico, funcional y manual en `docs/public-site/`.
**Pushes:** runtime `main` `29bf792..64d8c59` (39 commits pendientes, incluido el fix); `develop`
`985f84d3c..fa3f57dbf` (61 pendientes) y luego `fa3f57dbf..0992618ea`. **CLAUDE.md:** las filas nuevas del router
(Motogas, Berel, Blog SKY) lo dejaron en 35.321 tokens y falló «CLAUDE.md governance»; `0992618ea` compactó filas cuyo
detalle ya vive en su doc o skill: 34.652 tokens, 0 huérfanos, check en `success`
([lección](docs/operations/CLAUDE_MD_REFACTOR_MAP_2026-06-16.md)). Lecciones del carril de push desde la shell del
agente: delta 2026-11-04 de [local-first](docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md).
**Pendiente:** el operador marca «Validar corrección» en GSC. CLAUDE.md queda con ~350 tokens de margen: la próxima
fila del router es un puntero corto o exige compactar antes.

## 2026-11-04 — Prospección contextual: envíos verificados y workflow guardado

[Paula / Cristian](docs/commercial/prospecting-agent/runs/2026-11-04-paula-cristian-contextual.md): **2 InMail y 1 email enviados**;
conversaciones LinkedIn, Enviados de Outlook y EMAIL `120319391872` `SENT` verificados por separado.
Cristian: Contact `260252351138`, Company `60546887588` y Primary confirmados; landing, brochure original,
firma gráfica y CCO preservados. Paula: sólo LinkedIn, se pidió correo laboral; **CRM, brochure personalizado
y email pendientes de respuesta**, sin usar su correo personal. Owner: Julio / Commercial. Esperar respuestas;
no duplicar altas, enriquecimiento ni envíos, ni programar seguimientos. Envío no acredita entrega/lectura.
[Workflow Codex](.codex/skills/efeonce-b2b-prospecting/references/linkedin-signal-to-outreach.md) y
[espejo Claude](.claude/skills/efeonce-b2b-prospecting/references/linkedin-signal-to-outreach.md), accesibles desde
sus skills y el manual. Invocación: «Aplica el workflow de prospección contextual a estas personas».

## 2026-11-02 — Carril CLI de agentes para Rooms en producción y aceptado (TASK-2095 + TASK-2087)

Enmienda **D1-bis** al [ADR del carril](docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01)
(«CLI primero, gateway después»): un agente opera Rooms en producción con el login de una persona interna, sin MFA por
acción. **En producción:** Efeonce ID con la audiencia `https://efeonce-rooms.vercel.app/api/v1` y los clientes
`efeonce-rooms-cli`/`efeonce-rooms-resource` (hotfix PR #267, release `69b0ba90832c`, `auth-server-00172-zcn` al 100 %,
2026-11-01); Rooms con el verificador del bearer y `pnpm rooms login|logout|whoami` (PR #22 `9a4340a`, carril encendido por
el operador en `efeonce-rooms-15djjyfz2`, PR #23 `3434ea8` con `/cli/conectado` y `/cli/error`). **Aceptación:** tras un único
`pnpm rooms login`, el agente creó y publicó la sala `demo-volta` en «Efeonce» (edición `87dd99b7`, 17 acciones
`cli/claude-code`, sin invitaciones); `logout` y un segundo login verificados por el operador. Interruptores:
`ROOMS_AGENT_LANE_ENABLED=false`, suspender `efeonce-rooms-cli` o vaciar `AUTH_SERVER_ROOMS_AUDIENCE`
([manual](docs/manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md)). **Pendiente:** copy del consentimiento
`75b40772d` (sólo `develop`, sale con el próximo release completo); cierre formal de 2095/2087 (siguen in-progress, ver sus
criterios abiertos); la sala vista con sesión humana en `/rooms`; `read.client` tras la revisión de gobierno de datos IA;
gateway TASK-2086 (sólo el canje) → TASK-2088. Rama: Greenhouse `develop` (docs y `src/lib/auth-server`), Rooms `main`.
Siguiente ID libre: TASK-2096.

## 2026-11-02 — Pantallas de Efeonce ID con La órbita (develop, sin release) y fin del login de la CLI de Rooms (vivo)

**Efeonce ID** (commit `d14b786d3`, local, sin push): todas las pantallas salvo el login V4 usan el shell
`src/lib/auth-server/oauth/pages/orbit-shell.ts` (canvas aprobado por el operador). Órbita canónica alrededor de un ícono
AXIS en reposo o de una palabra, una esfera por pantalla, titulares Bricolage, código de seis casillas con modo respaldo,
marca de `efeonce-rooms-cli` por id exacto. Assets por `pnpm auth-server:brand-assets:generate` (drift en
`orbit-shell.test.ts`). Gates: 784 pruebas de `src/lib/auth-server`, typecheck y contraste verdes. **Pendiente:** `pnpm build`,
flujo real contra el host y el release gobernado a `main` (mismo servicio que el login MCP; requiere autorización).
**Rooms** (PR #23, merge `3434ea8`, en producción y verificado por el operador): el callback loopback de `pnpm rooms login`
responde 303 a `/cli/conectado` («Listo») o `/cli/error` («Casi», motivo cerrado), sin code ni tokens en la URL.
Manuales y doc técnica: [pantallas Efeonce ID](docs/manual-de-uso/identity/operar-pantallas-efeonce-id.md) ·
[CLI de Rooms](docs/manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md).

## 2026-11-02 — Botón «Continuar con Efeonce ID» canonizado

«Continuar con» + `efeonce-id-button-lockup-{positive,negative}` (Efeonce | ID con «ID» en la tinta del texto) en
`axis-brand-assets` 0.4.32 (publicado en el release `v0.4.32`, AXIS `0d45749`, 2026-11-02, readback en GitHub Packages; 59/59 pruebas del paquete y 179/179 del Lab). Anatomía,
tamaños y los diez estados en el README del paquete y en el [ADR](docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md).
Pendiente: primitive en `axis-ui-primitives` y adopción en Rooms, Studio y Greenhouse.

## 2026-11-01 — Perfil de clave OpenAI `personal` para generación creativa

Resolver único `src/lib/ai/openai-api-key.ts` para `openai.ts` y `openai-image.ts` (commit `60a53958b`, sin push):
`OPENAI_API_KEY_PROFILE=<perfil>` / `pnpm ai:image --openai-key <perfil>` → secreto `greenhouse-openai-api-key-<perfil>`;
falla cerrado, nunca cae a la canónica; resultados con `keyProfile`. Secreto `greenhouse-openai-api-key-personal` creado
por el operador (cuenta personal, 200 USD) con `secretAccessor` para `greenhouse-portal`; prueba real `low` 1024² →
`clave personal`, ≈ USD 0,006. Regla: generación creativa de agentes con el perfil explícito; producto/runtime/`pnpm dev`
con la clave de empresa; nunca default en `.env.local` ni en Vercel/workers. Manual
[alternar-clave-openai.md](docs/manual-de-uso/ai-tooling/alternar-clave-openai.md). Typecheck, lint y 58 pruebas verdes.

## 2026-11-01 — Marca de Efeonce ID aprobada y canonizada en AXIS

«La órbita vive en la D»: asta, tramo recto de 110 y media órbita, esfera Growth a la 1:30 ([ADR](docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md)).
Generador `scripts/brand/build-efeonce-id-logos.mjs` (0 px de diferencia contra el canvas aprobado); 12 SVG
`efeonce-id-*` en `axis-brand-assets` 0.4.31 (publicado en el release `v0.4.31`: AXIS `5a6a597` + `5540a2c`, 2026-11-02, readback en GitHub Packages; 59/59 pruebas del paquete y la del Lab verdes).
Regla del operador: en el login de Auth sólo favicon y formulario; el panel lateral es del carrusel de novedades.
Skills `efeonce-graphic-line`, `efeonce-auth` y `axis-design-system` actualizadas y espejadas. **Favicon de Auth
cambiado en `develop`** (teja de Efeonce ID vía `scripts/auth-server/efeonce-id-favicon.ts`; 743 pruebas de
`src/lib/auth-server` verdes, verificado en el arnés): llega a producción sólo con un release gobernado. Pendiente: fijar
`axis-brand-assets` ≥ 0.4.31 en Greenhouse (TASK-2014), lockup del formulario y botón «Continuar con Efeonce ID».

## 2026-11-01 — Cloud Build: paquete de subida 986 → 131 MB

`.gcloudignore` excluye `/ai-generations/`, `/outputs/`, `/generated/` y `/scripts/frontend/` (anclados a la raíz;
sin anclar, `ai-generations/` también atrapaba `scripts/ai-generations/`). Verificado con
`gcloud meta list-files-for-upload`: solo salen archivos de esas cuatro carpetas y siguen presentes todas las rutas
que copian los 8 Dockerfiles de `services/`. No se borra nada del repo. Al empujar a develop, los filtros de ruta de
`artifact-worker`, `commercial-cost-worker` y `auth-server` disparan un deploy a staging, que es la prueba real
(empujado a develop; los 4 deploys de workers a staging salieron verdes). El operador compró el CUD de Cloud SQL
`greenhouse-pg-dev-us-east4-3y` (3 años, us-east4, USD 0,03/h ≈ 21,60/mes, inicio 2026-11-01 16:00 PT) y canceló
Looker Studio Pro (verificado). Proyección: ~CLP170k/mes desde diciembre.

## 2026-11-01 — Kortex retirado: respaldo, Vercel pausado, proyecto GCP cerrado

**Actualización:** el operador cerró `efeonce-kortex-dev` (estado `DELETE_REQUESTED`, se puede deshacer con
`gcloud projects undelete` durante 30 días); el respaldo en `efeonce-group-kortex-archive` sigue intacto.

Decisión del operador: Kortex no continúa. Respaldo verificado de `kortex-pg-dev` (`kortex_app` 41 tablas +
`postgres`) en `gs://efeonce-group-kortex-archive/` (clase ARCHIVE, proyecto efeonce-group); la base quedó otra vez
STOPPED/NEVER. Proyecto Vercel `kortex` (`prj_8ylpHC3DI1EdRO1hjZfwWPrk5Y1O`) pausado, responde 503. Pendiente humano:
`gcloud projects delete efeonce-kortex-dev` (bloqueado al agente por la regla de borrado irreversible; restaurable
30 días), que corta ~CLP11k/mes. Las rutas `/api/admin/kortex/*` y la señal `platform.kortex.github.ci_last_status`
siguen en el código: la primera queda sin backend (0 requests en 30 días); la segunda lee GitHub y no se rompe.

## 2026-11-01 — GCP: limpieza de imágenes y tarballs de Cloud Build

Octubre cerró en ~CLP258k netos (junio 111k). Aplicado con autorización del operador: cleanup policy
`keep-15-most-recent` + `delete-older-than-30d` (enforced) en `cloud-run-source-deploy` us-east4 y us-central1
(simulación previa: 241 versiones viejas, 0 imágenes vivas; artifact-worker y notion-bq-sync sirven la más
reciente), y lifecycle `age 30` sobre `gs://efeonce-group_cloudbuild/source/` (2.452 tarballs, 327 GB; soft
delete de 7 días). Ahorro esperado ~CLP25–30k/mes, no confirmado hasta la factura de diciembre. Pendiente: cada
tarball pesa ~727 MB porque `.gcloudignore` no excluye `ai-generations/`, `outputs/` ni `generated/` (ningún
Dockerfile las copia). Decisiones abiertas: kortex-pg-dev detenida (11k), Looker Studio Pro (8.7k), clamav
min=1 (19.5k), balanceador MCP (25k).

## 2026-11-01 — Globe: listeners suspendidos con IP conservada

Aplicado exclusivamente retiro HTTP/HTTPS del balanceador (`0/0/2`); IP original reservada, SQL STOPPED/NEVER
y cuatro schedulers PAUSED. Forecast CLP22–23k/mes, no ahorro confirmado. Reactivación automática de listeners
en `draining`, sin cambiar DNS; [estado y evidencia](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
Monitor actualizado, Terraform validate y 35 tests PASS. Sin deploy de servicios ni despertar SQL.


**31/10 — Prospección focal:** [Wequips/Mambrino](docs/audits/commercial/2026-10-31-wequips-mambrino-docs-skills.md).
Mayra: NDR de correo inferido, sin reintento. Dayanna: Apollo Verified/2 créditos, Contact/Primary y email SENT
comprobados; LinkedIn previo. Pendientes Commercial: respuesta/brief, secundaria vacía y verificación de
segmentos Mambrino. Skills espejo y canon actualizados; sin nueva comunicación o secuencia en este cierre.

## 2026-11-01 — Efeonce ID en `main` con carrusel; Rooms con entrada 307 y nombre del espacio

Release `935583f88db0-544b3943-a041-4fe6-9e62-03aca45c6c8f` (run `41284120477`) `released` al tercer intento:
`auth-server-00170-qlx` al 100 %, first-party/OTP ON, Login V4 con carrusel también en la entrada a Rooms; tráfico a la
última revisión, rollback a `00169-4pq`. Intentos 1 y 2 abortados por [ISSUE-184](docs/issues/resolved/ISSUE-184-auth-deploy-guard-rejected-squash-releases.md)
(guard vs squash, PR #265) y [ISSUE-185](docs/issues/resolved/ISSUE-185-auth-governed-deploy-revision-without-traffic.md)
(tráfico fijado); CI rojo previo por [ISSUE-186](docs/issues/resolved/ISSUE-186-growth-seo-tests-broke-at-etv-cutover.md).
PR #263/#264 cerradas, retención levantada. Rooms PR #9–#11 en producción: 307 sin sesión ([ISSUE-188](docs/issues/resolved/ISSUE-188-rooms-anonymous-entry-rsc-redirect-flash.md)),
`organization.rename` + espacio «Efeonce» ([manual](docs/manual-de-uso/rooms/nombrar-espacio-de-trabajo.md)) y gate de
migraciones revisadas ([ISSUE-187](docs/issues/resolved/ISSUE-187-rooms-reviewed-migrations-inventory-blocked-deploy.md)).
Sin verificar: Sentry del release y login humano Efeonce ID → Rooms (TASK-2064/2085 siguen in-progress). Próximo:
TASK-2086 (delegación interactiva para Rooms) y TASK-1833 antes de cualquier cliente real.
Después (local, sin push): [TASK-1833 conciliada](docs/tasks/in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md)
y la rama local de Codex `codex/auth-pr-develop-stack` integrada en `develop` (`e09d72d70`): revocación/recuperación atómicas,
413, OTP con fallo cerrado, Job de rotación (migración sin aplicar) y verificación post-deploy del tráfico. Requiere release a
`main`; la llave de firma (KMS v1/v2 del 04-09) dispara `auth.keys.rotation_overdue` hacia el 23-11.

## 2026-11-06 — SKY: EPIC transversal formalizado

[EPIC-057](docs/epics/in-progress/EPIC-057-operational-accounts-under-organization.md) coordina TASK-2094
(baseline 204 pruebas del 01-11) y siete nuevas TASK-2096–2102, todas to-do: autoridad/contexto, routing,
Finance, alta hija local, readers/cache, historia y operación durable. Insights/portal mantienen sus dueñas
2033/1960/1848/1849/1992 y1852–1857; GSC1655 conserva productor. No se reparentan ni duplican.
[ADR Proposed](docs/architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md), B recomendado;
aceptación/apertura pendientes. Próximo ejecutable: TASK-2096 local, previa toma/plan de implementación.
Grafo por hitos: foundation1852 consumible; gate SKY SEO1852 espera QA2094. Preparación2102 antes del canary,
observación después; sin ciclo de cierre total. [QA documental](docs/audits/client-portal/2026-11-06-operational-accounts-epic/README.md).
Registro y commit sólo documentales; no nueva corrida de tests runtime, no cambios en producción ni historia Diseño.
Revisión contra código el mismo día ([hallazgos](docs/audits/client-portal/2026-11-06-operational-accounts-code-review/README.md)):
B se mantiene. Laboratorio usaba `session_360` del script de setup; la vigente elige Space sin orden. Cookie de usuario
inactivo conserva claims sin límite; un P&L cerrado se reescribe. Tasks 2096–2102 con impact/archivos/criterios
corregidos y dueño único por archivo; criterios nuevos en 1960 y 2094. Sin código ni producción. Disco local al 98%.
