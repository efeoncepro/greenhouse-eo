# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-18 — TASK-1832 retira la corrida canary y apaga sus gates

Se revocó la authority del canary sintético, el cleanup sujeto-específico borró todo el grafo run-owned
y preservó el cliente compartido de ChatGPT/Codex y los artefactos de otros sujetos. El apply ahora usa el
perfil PostgreSQL `ops`. Las dos puertas canary quedaron en `false` en todos sus runtimes, con lectura en la
revisión servida: auth-server `00076-t2t`, Vercel Production y gateway `00056-kgs`. Runbook, manual, matriz,
manifiesto, ledger y skill `efeonce-mcp-platform` (espejo) quedaron actualizados.

## 2026-09-18 — Efeonce Insights: enlaces, correo y recurrencia en producción con flags OFF (TASK-1848)

Release `bda1cf2cd938` (PR #238) lleva a producción compartir por enlace, envío por correo y recurrencia de Insights
con `INSIGHTS_SHARING/DELIVERY/SCHEDULES_ENABLED` y la emisión **apagados** hasta que exista el lector de Think
(TASK-1875, ya desbloqueada). Canary de contrato: crear enlace ⇒ 503 `sharing_disabled`, token inexistente ⇒ 404.
Staging queda encendido; el operador confirmó la llegada de los dos correos del canary. Gateway `efeonce-mcp` 1.7.0
(revisión `00055-gk6`, 58 tools): 5 lecturas con el scope base y crear/revocar enlace con `efeonce.mcp.insights.write`
(fail-closed); enviar y programar no existen por MCP. `ISSUE-174` → `TASK-1876` sigue abierto.

## 2026-09-18 — Efeonce Insights: compartir por enlace, envío por correo y recurrencia (TASK-1848, code complete)

Una edición emitida ya puede compartirse por enlace personal que vence (se guarda sólo el hash del token; revocable
uno a uno; el lector público responde 404/410/429 y nunca cachea), enviarse por correo desde Efeonce a personas
activas de la organización (enlace compartido o PDF adjunto opt-in, dedupe por persona y versión, un resultado
ambiguo se reconcilia antes de reenviar) y programarse (semanal/mensual, zona y consolidación; cada ocurrencia deja
un borrador en revisión, nunca emite ni envía). Migraciones aplicadas en la base compartida; los tres flags nuevos
nacen apagados en producción y los EmailTypes apagados. Verificado en staging con canary sintético completo (incluye un
correo real al buzón autorizado del operador); la prueba destapó `ISSUE-174` → `TASK-1876`. Producción y gateway pendientes.

## 2026-09-18 — Corte ampliado de Dreamforce 2026 y UNBOUND 2026

Se actualizaron los ledgers, docs de oferta, narrativa estratégica y skills espejo `.codex`/`.claude` con la
investigación oficial ampliada al 18/09. Salesforce queda separado por AIforce, Koa, Missionforce, Agentforce,
interoperabilidad y Marketing Cloud Next, con estados por capacidad y sin nuevos lanzamientos identificados el
17–18/09 en el media hub. HubSpot incorpora Smart CRM self-updating, Growth Context, Context Home, Breeze, Marketing
Studio, Microsoft Advertising, Prospecting Agent, ChatGPT Ads y las superficies mostradas en UNBOUND; Customer Agent
Voice, HubSpot Work y Agent CLI quedan marcadas como first look/demo hasta verificar GA, pricing y runtime. No se
activaron entitlements, betas, campañas ni conexiones.

## 2026-09-17 — Higgsfield documentado como proveedor gobernado de Creative Studio

La revisión de los nueve repositorios oficiales de Higgsfield quedó documentada en arquitectura, auditoría,
documentación funcional, manual de uso, runbook, fleet ledger y skills espejo. API/SDK/CLI, skills agentic y MCP
local para After Effects/Blender quedan como superficies preparadas; Higgsfield permanece
`provider-supported / no Globe route` hasta contar con route card, adapter, secreto, coste, derechos, canary,
Asset Governance y readback. No se instaló, generó, compró crédito ni publicó nada.

## 2026-09-17 — Aplicar el logo 3D en escenas con IA generativa

El kit 3D del logo ya no se compone a mano sobre la escena: se pega el render exacto y el modelo repinta sólo un halo
alrededor con máscara, así aporta sombra de contacto, reflejo y rebote sin poder re-dibujar el logo. Con el logo grande
en cuadro basta la pasada directa con el render como referencia. Medido en dos casos reales (avenida de Nueva York y
escritorio): zona protegida 4,4/255 de diferencia y halo 39,6. La composición determinística queda como respaldo.

## 2026-09-17 — Logo de Efeonce en 3D como kit de referencia para agentes

Quedó en `13- Branding/Logo Efeonce 3D` el logo completo en 3D renderizado en Blender desde el SVG oficial, en navy y
blanco, en cuatro escalas (monumental, grande, mediana, pequeña) con 33 cámaras y luz izquierda/derecha, sin
superficies. Cada escala trae un manifiesto de cámara y usos para que un agente elija el render que coincide con la
escena y se lo pase al modelo como imagen 1, sin dejar que el modelo dibuje las letras.

## 2026-09-17 — `pnpm ai:image:rmbg --key-background` para huecos opacos

El recorte de fondo suma una opción opt-in para el caso de objeto claro sobre fondo oscuro: vacía los huecos pasantes
(ventanas, cortes) que el matting dejaba opacos mostrando el fondo de estudio, con borde suave y sin halo. Reemplaza el
script de corrida de la nave de Efeonce 3D y reproduce el mismo alfa en sus finales aprobados.

## 2026-09-17 — LicitaLAB: CLI `pnpm licitalab` y flujo agéntico de licitaciones públicas

Nuevo cliente canónico `src/lib/commercial/tenders/licitalab/client.ts` sobre el MCP de LicitaLAB y CLI con tres
credenciales: API key en Secret Manager (`documents`, `ask-docs`, `support`), sesión OAuth de usuario de 7 días
automatizada con Playwright (`opportunity`, `provider`; la key responde `unsupported`) y el radar web existente,
ahora con `--headless/--no-login`, detrás de `search [--match] [--enrich]`. Verificado en vivo (20 recomendadas
enriquecidas; 175 del listado completo). Receta 0 en la skill de licitaciones y manual
`revisar-licitaciones-licitalab-con-cli.md`. El agente nunca ingresa la contraseña: renovar sesiones es del operador.

## 2026-09-17 — Nave de Efeonce en 3D, navy y blanco

Quedó en `13- Branding/Nave Efeonce 3D` la biblioteca del isotipo en 3D: 16 ángulos de cámara por color (con versiones
transparentes) y 8 escenas. El blanco se obtuvo recoloreando los renders navy aprobados, porque generarlo aparte salió
plano; los ángulos extremos usaron una guía de perspectiva proyectada desde la silueta oficial.

## 2026-09-17 — Sprocket de HubSpot en 3D (uso interno) y mascotas en carpeta propia

Las bibliotecas de mascotas pasaron a `14. Mascotas de partners` en la raíz de la carpeta de contenidos, por
indicación del operador, y se sumó el sprocket de HubSpot en 3D: 8 ángulos y 8 escenas desde el SVG oficial. Como es
marca registrada y HubSpot exige aprobación previa para usarlo, la biblioteca queda como uso interno hasta obtenerla.
El relleno de huecos de `pnpm ai:image:rmbg` ahora reconoce el fondo en sombra visto a través de un agujero del objeto.

## 2026-09-17 — Bibliotecas de poses 3D de Clawd y Codex, y recorte sin huecos

Quedaron en la carpeta de contenidos de Marketing dos bibliotecas de mascotas de partners: Clawd (Claude) y Codex
(OpenAI), cada una con 8 ángulos de cámara y 8 poses con accesorios ligados a servicios de Efeonce, en fondo de estudio y
transparente, más su fuente oficial (sprite del binario de Claude Code y atlas del app de ChatGPT). `pnpm ai:image:rmbg`
ahora rellena por defecto los huecos internos que el recorte automático deja en el sujeto (ojos, visores, glifos) y
conserva los huecos reales de fondo. El método quedó documentado para repetirlo con Nexa; inventario en
`docs/operations/social/PARTNER_MASCOT_POSE_LIBRARIES.md`.

## 2026-09-17 — Narrativa «Tu IA no conoce tu negocio» y su key visual

Quedó definida la narrativa go-to-market de Efeonce para Q4 2026 – Q3 2027: cinco capítulos de contexto (lo que la IA
no sabe, datos, lo que la IA dice de ti, equipo agéntico y marca) más una capa de resultados, conectados con todas las
líneas de negocio (`docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md`). Su key visual —Nexa con hoodie
Efeonce y Clawd en 3D en el hombro, con una selección AXIS sobre «tu negocio.»— quedó programado para el 21/09 en
LinkedIn e Instagram. Anthropic y OpenAI figuran como partners aceptados. El adapter de selección colaborativa AXIS
suma una opción de presentación (escala y color por participante, con contraste verificado) y las skills aprenden que
cambiar el fondo detrás de una persona o mascota se resuelve regenerando la escena, no recortando. Bitácora en
`docs/operations/social/2026-09-17-kv-tu-ia-no-conoce-production-method.md`.

## 2026-09-16 — Serie social de Fiestas Patrias: México y previa del 18

Se publicaron el carrusel «Hay frases que no se tocan» en Instagram y su documento en LinkedIn para México, y quedó
programada para el 17/09 la estática «Hay días que sí rediseñaríamos». El caso dejó reglas nuevas en las skills
sociales: la conexión con la marca se demuestra con el oficio y no con una moraleja; sin símbolos patrios mexicanos en
piezas de marca; personas del equipo sólo con consentimiento; alto impacto se logra con luz, cámara, material y
acción; un recoloreo con máscara de IA que cambia la forma se descarta por uno determinístico; y las imágenes sociales
se publican en PNG. Bitácora en `docs/operations/social/2026-09-16-viva-mexico-y-previa-18-production-method.md`.

## 2026-09-16 — `pnpm ai:fal` también trabaja con Higgsfield

El mismo comando ahora opera la API de Higgsfield: 44 modelos que se eligen con `--capability hf-*`, entre ellos SOUL,
Marketing Studio, Ideogram 4.0, Qwen Image 3, Kling Omni y O3, PixVerse 6, LTX 2.5 y Happy Horse. Antes de gastar,
revisa el pedido contra las reglas reales de cada modelo y pide el precio exacto al proveedor, que no cobra por
cotizar. En Seedance y Wan 3.0, que solo publican una fórmula, calcula un techo. `--estimate` cotiza sin generar y
`--cancel` anula un trabajo que sigue en cola. La llave quedó en Secret Manager. Las 44 opciones cotizaron con la
cuenta de Efeonce, pero todavía no se generó nada: la cuenta de la API de Higgsfield no tiene créditos. Si el Recraft de
esta API entrega SVG está sin probar, y Veo 3.1, Sora 2 y Nano Banana Pro no están disponibles por esta vía.

## 2026-09-16 — Los comandos de IA avisan cuánto van a costar antes de gastar

`pnpm ai:fal` ahora calcula el costo antes de mandar un trabajo y se detiene si pasa de USD 1 (o del tope que
indiques) hasta que confirmes con `--yes`. Sin `--resolution`, usa la resolución más barata del modelo en vez del
valor caro por defecto de algunos proveedores. También dejó de guardar archivos con la extensión equivocada, rechaza
`--seed` en los modelos que no lo aceptan y avisa antes de mandar más imágenes de las que el modelo usa. `pnpm
ai:image` valida tamaño, fondo y formato antes de llamar a OpenAI, permite elegir PNG, JPEG o WebP, y muestra el
costo estimado con la fórmula oficial. Guía, catálogo, manuales y skills quedaron al día.

## 2026-09-16 — Efeonce Insights ya entrega decks en producción

El render de Insights quedó en producción: una edición pedida por API o MCP produce su deck descargable sin
intervención, y el gateway de MCP de Efeonce ya expone las cuatro herramientas de render. El release llevó por primera
vez al orquestador de producción un Cloud Run Job, el worker de render, que el watchdog y el rollback ya saben leer.
La prueba final en producción siguió el camino real: el despacho automático lanzó el worker y el deck quedó listo al
primer intento. Emitir la edición al cliente sigue apagado y es el siguiente paso de EPIC-045.

## 2026-09-16 — Efeonce Insights renderiza solo en staging y el worker de render entra al release

El render de Insights ya funciona de punta a punta en staging sin intervención: se encarga por API o MCP, el despacho
lanza el worker y el deck queda como asset privado. La prueba que lo dejó así destapó que el despachador nunca había
leído su flag: el primer canary había funcionado porque el worker se lanzó a mano. Con una ráfaga de cinco renders
medimos el ritmo real: un output cada dos minutos, siete segundos de render cada uno. Retry, cancelación y el bloqueo
de un cliente sobre una edición interna se probaron contra el runtime, y un render pedido por un cliente ahora queda
auditado como `client_user` y no como `system`. El worker de render, un Cloud Run Job, quedó integrado al orquestador
de producción con su propia lectura de drift y rollback. Producción recibe todo esto con el próximo release.

## 2026-09-16 — Guía para elegir modelo de IA: qué usar, cuándo, cómo y cuánto cuesta cada uno

Todos los modelos que hoy se pueden correr desde `pnpm ai:image` y `pnpm ai:fal` quedaron descritos en una sola guía
(`docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`): árboles de decisión para imagen y video, fichas
por modelo con capacidades, límites, comandos y trampas, recetas por caso de uso con costo, y rankings externos con sus
contradicciones a la vista. Cada dato indica si viene de una corrida real, del contrato del proveedor, de su
documentación o de un tercero.

Investigar para escribirla corrigió varias cosas que dábamos por ciertas. fal cobra según la resolución: Wan 3.0 a
1080p, su valor por defecto, cuesta cuatro veces lo registrado, y Prime es más cara que la base. Seedream 5 Pro en fal
no llega a 4K, y el 2K y 4K de H3 son reescalados. La fórmula de tokens de Seedance sí calza con lo que pagamos, y el
costo de GPT Image 2.5 se puede estimar antes de gastar. La guía, el catálogo, los manuales y las skills creativas
quedaron alineados, y las fallas del CLI detectadas quedan para una tarea aparte.

## 2026-09-16 — `pnpm ai:fal` trabaja con dos cuentas de fal y ya puede encolar sin esperar

El CLI de fal ahora conoce dos cuentas. Elige la que tiene más saldo y, si fal bloquea una por falta de fondos, pasa sola a
la otra antes de gastar. `--balance` muestra ambos saldos, y cada corrida dice qué cuenta usó. También se puede encolar un
video y seguir trabajando: `--detach` deja el trabajo en fal y `--status` avisa cuándo está listo, sin necesidad de montar
un webhook. Con la cuenta con saldo se terminaron de verificar Wan 3.0 y todas las variantes de Seedance (47 de 55
capacidades). Las pruebas costaron USD 7,71, el doble de lo estimado para Seedance, y mostraron que su filtro rechaza
material con marcas o personas reales después de cobrar. Queda pendiente rotar la clave nueva, que se compartió por chat.

## 2026-09-16 — La recarga de fal no llegó a la cuenta de la clave; `pnpm ai:fal --balance` lo muestra en segundos

Después de recargar USD 50, el CLI seguía bloqueado por saldo. La cuenta de fal dueña de la clave que usamos tenía
−3,86 USD: la recarga no estaba ahí. Se descartó que otro sistema estuviera gastando: Globe usa la misma clave, pero no
hubo llamadas a fal desde ningún servidor en una semana. Ahora `pnpm ai:fal --balance` muestra ese saldo sin costo y el
CLI lo imprime solo cuando fal bloquea una corrida. Wan 3.0 sumó tres verificaciones; quedan documentados como
pendientes las pruebas de Seedance, el entrenamiento de LoRA de H3 (postergado) y Recraft, que hoy no tiene vía
operativa porque la CLI de Higgsfield perdió la sesión.

## 2026-09-16 — Wan 3.0 entra a `pnpm ai:fal`; Nano Banana Pro está disponible pero nadie lo usa

Wan 3.0 y Wan 3.0 Prime, segundo del ranking de video de OpenArt Arena y primero en edición, quedaron en el CLI
con sus seis endpoints: texto, imagen y referencias a video. Traen dos novedades: la duración puede quedar en
manos del modelo (hasta 30 s) y el video por referencias puede basarse en una página web o un documento si se
activa el razonamiento. Sólo el texto a video alcanzó a probarse: a mitad de las pruebas se agotó el saldo de
fal y el resto quedó declarado, sin verificar, hasta recargar.

Al revisar Nano Banana Pro apareció que no está conectado en ninguna parte. Nuestro proyecto de Vertex ya lo
tiene habilitado (`gemini-3-pro-image`), pero el generador del producto usa Nano Banana 2 y no hay un CLI de
Gemini Image. Se mantiene por Google directo, igual que Gemini Omni Flash. Kling 3 y Grok Imagine quedaron
revisados y documentados como candidatos, sin conectar.

## 2026-09-16 — Berel: Colores de Temporada 2027 sin canibalizar el ciclo 2026

El nuevo ciclo nace en su propia página (`/articulos/colores-de-temporada-2027`) y la página genérica existente
queda como el ciclo 2026 sin cambios, porque el layout de pillar todavía no existe. La separación se sostiene con
Search Console de 16 meses: la página actual vive de marca y catálogo y no gana clics por «colores de temporada».
En el Content Hub quedaron research (material oficial de las cuatro paletas, Semrush y Search Console), plan
editorial y SEO, el artículo N61 en revisión con fichas N1–N4 y un desplegable aparte de notas internas; el gate de
copy visible pasó sobre la página releída. La skill `berel-content-production` (espejo `.claude`/`.codex`) suma
Color del Año 2027, las paletas, la regla de página de ciclo anual y la de notas internas.
[Detalle](docs/audits/seo/BEREL_COLORES_DE_TEMPORADA_2027_2026-09-16.md)

## 2026-09-16 — HubSpot y Salesforce: provider-fit por segmento

La posición comercial deja de tratarlos como sustitutos universales: HubSpot-first parte como hipótesis para
crecimiento B2B, mid-market y time-to-value; Salesforce-first gana peso con org instalada compleja, gobierno,
service a escala, extensibilidad e integración enterprise. La zona de solapamiento sigue incluyendo mid-market
alto, agentes y coexistencia. El diagnóstico conserva las salidas `HubSpot-first`, `Salesforce-first`, `híbrida` y
`no-fit`, siempre condicionadas a TCO, datos, adopción, entitlements y contrato.

## 2026-09-16 — Dreamforce: AIforce, Missionforce y marketing agentic

El ledger de Salesforce y sus skills espejo separan los anuncios del 15/09 de las publicaciones del 16/09.
AIforce queda documentado como capa de interfaz/headless —no SKU— para llevar contexto, workflows, permisos,
gobierno y acciones a interfaces como Claude y Slack. Missionforce suma capacidades para gobierno y entornos
regulados con OpenAI/NVIDIA. Marketing Cloud Next incorpora Campaign Agent, Headless Marketing/MCP, Palmata,
Data Guardian, Budget Optimization y otras capacidades con estados GA/fechas separados. Koa se conserva como
lanzamiento del 15/09 en pilotos seleccionados. [Ledger](.codex/skills/salesforce-crm-practice/references/dreamforce-2026.md)

## 2026-09-16 — HubSpot actualizado con Fall Spotlight y UNBOUND 2026

Las skills espejo y el catálogo HubSpot incorporan ChatGPT Ads en beta pública, la expansión del MCP/Claude,
Agent Hub, Agent Builder, Breeze y Scheduled Prompts, además de Developer Platform 2026.09, sus APIs GA y betas.
Se documentan requisitos de portal, plan, créditos, permisos, consentimiento, Audit Log y la separación entre
capacidad anunciada, elegibilidad y runtime. También queda registrada la deprecación de APIs y apps legacy, con
enforcement previsto para septiembre de 2027. [Detalle](docs/services/hubspot-as-a-service/HUBSPOT_FALL_2026_UNBOUND_RELEASES_2026-09-16.md)

## 2026-09-16 — Flux 3 entra a `pnpm ai:fal`, y Seedance ya sabe hacer video a video sin sorpresas

Flux 3 llegó al CLI completo y con sus 12 endpoints probados en real. En fal no es un modelo de imagen sino
de video: texto, imagen, primer y último cuadro, y keyframes a video; edición y extensión de un clip
existente; y un flujo de borrador que cuesta USD 0,03 por segundo y después se sube a calidad final sin volver
a generar la toma. Las pruebas destaparon dos trampas de la extensión: el clip de origen tiene que traer pista
de audio (sin ella fal acepta el trabajo y lo rechaza después) y lo que devuelve es sólo la continuación, no el
clip completo. El CLI ahora revisa el audio antes de subir.

Al revisar cómo hace video a video Seedance, apareció que no tiene un endpoint propio: la 2.5 edita y extiende
dentro de reference-to-video con `--task`, y la 2.0 sólo usa el video como guía. El registro tenía mal la
duración mínima (4 s, no 1) y no declaraba cuántas referencias acepta cada versión; ambas cosas quedaron
corregidas y validadas antes de encolar. La edición y extensión con Seedance 2.5 siguen sin probarse en real.

## 2026-09-16 — Minimax H3 entra a `pnpm ai:fal`: video en segundos, control de cámara y LoRAs

El CLI de fal suma los 17 endpoints de Minimax H3. Nueve quedaron verificados con corridas reales: texto,
imagen y referencias a video en sus tres variantes (base, Max y Max Turbo) y el control de cámara, que
congela la escena y sólo mueve el encuadre. Max Turbo cuesta USD 0,0125 por segundo y cada corrida volvió
en menos de 10 segundos, así que sirve para explorar antes de gastar en Seedance. Las variantes con LoRA y
los cuatro entrenadores quedan declarados pero sin probar (exigen una LoRA o se cobran por step), y el
Director se lista como no operable: es un stream en tiempo real, no un trabajo de cola.

H3 no se parece a Seedance en la forma de los pedidos (duración entera, resolución en mayúsculas,
image-to-video sin aspect ratio, expansión de prompt obligatoria en Max), y el CLI lo valida antes de
encolar. Dos mejoras alcanzan a todos los modelos: el `request_id` se imprime apenas fal acepta el trabajo
y `--request-id` retoma uno que siguió corriendo tras un timeout, sin volver a cobrarlo. De paso se corrigió
`--task`, que sólo acepta Seedance 2.5 y hasta ahora se dejaba pasar a la 2.0.

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

Se probó y revirtió el 2026-09-16 la mitigación page-scoped de WordPress (`ghf-country-icon-ohio-override-v1`, página
20729, snapshot `_gh_contacto_before_country_icon_override`): el CSS no atraviesa el Shadow DOM y dejaba `globe`
junto al SVG. Luego del release se corrigió esa duplicación sin otro release mediante CSS page-scoped
`ghf-country-icon-dedup-v1`, que oculta solo el globo dentro de `/contacto/`. El hotfix definitivo del renderer
`d15bb9256` (sobre `e5d4a0fb2`) y la v3 siguen activos; no requiere una nueva versión del formulario.

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
