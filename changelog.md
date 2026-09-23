# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-23 — Compositor de piezas con CTA: nueve tramos de certificación adversarial

`pnpm foto:componer:cta` y `pnpm foto:cta:gate`, auditados dos veces por dos subagentes adversariales (diseño y
arquitectura) y robustecidos sin cambiar ninguna pieza aprobada (regresión: 132 de 132 idénticas):

- el gate distingue falla (1) de **no certificable (3)** y certifica por reproducción (`--reproducir`);
- contraste sobre el trazo; CTA a 4,5:1 siempre, con APCA y daltonismo bloqueantes; `placement` sólo endurece;
  el dominante es la voz mayor;
- excepciones con aprobador del registro (`scripts/foto/aprobadores.json`), sha256 del plate y tope (`hasta`);
- firma automática sólo en la banda del pie; firma externa declarada y leída de `signatureY` (v03–v07 la declaran);
- entradas con errores que nombran pieza y campo; texto alternativo con el rol del CTA siempre;
- proceso: bloqueo sin carreras, regresión que compara el veredicto del gate, mutantes contra corrida base y canarios.

Docs: [contrato §18–§19](docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md), funcional y manual en `creative/`,
skill `efeonce-advertising-creative`. Pendiente: tercera certificación y decisiones del operador (firma en 16:9, margen,
firma de las stories de v07).

## 2026-09-22 — ISSUE-177 resuelto: ninguna función de Vercel vuelve a cargar el motor de PDF

Tres deploys de staging cayeron en tres semanas por funciones de Vercel de más de 250 MB (397, 434 y 441 MB),
siempre con el gate local en verde. Desde ahora:

- la entrada liviana `@/lib/artifact-composer/pure` y la regla ESLint `greenhouse/no-worker-only-module-in-vercel-code`
  impiden importar como valor el motor de composición (Playwright, pdf-lib, catálogos) desde `src/`;
- `pnpm vercel:reachability-gate` (pre-push y CI, ~2 s, sin build) recorre el grafo de imports de las 1.519 entradas
  del App Router y falla ante la denylist o una ruta de runtime variable nueva;
- `pnpm vercel:function-size-gate` mide el tamaño trazado de cada función tras el build de CI (falla sobre 200 MB);
- las rutas de lectura de Insights ya no cargan comandos ni render.

Reglas en `OPS_RELIABILITY_AGENT_INVARIANTS.md` §Tamaño de las funciones de Vercel.

## 2026-09-22 — Efeonce Insights: informe A4 y deck nuevo en staging, probados con datos reales

TASK-1847 en staging (`develop` hasta `21c991999`), sin producción. El canary con Berel (SEO+AEO) y Sky (ICO), en
ediciones internas y sin emitir y con `insights_v1` asignado a ambas orgs, encontró y cerró:

- el validador de cifras rechazaba toda edición SEO real (fecha partida, cifras de la etiqueta del hecho);
- OTD nunca llegaba a un informe (`otd` frente a `otd_pct`);
- límites y metodología mostraban identificadores internos;
- las figuras del A4 tenían formato propio, recortes y la barra destacada invisible;
- el deck sobre `deck-axis` recortaba y callaba métricas, así que `deck_pdf` pasa a `insights-deck`.

Vista previa con datos reales en `scripts/insights/preview-edition.ts`. Se abre ISSUE-177: no hay gate que mida el
tamaño de las funciones de Vercel.

## 2026-09-22 — «Tu IA no conoce tu negocio»: el carril HubSpot

[CDR-004](docs/campaigns/decisions/CDR-004-tu-ia-no-conoce-carril-hubspot.md) (`Proposed`) resuelve cómo se vende
HubSpot dentro de una narrativa que declara no ser una campaña de HubSpot: el carril es provider-specific, no una
campaña paralela, y rige la regla de sujeto —el problema del comprador es el qué, HubSpot es el cómo—. La unidad de
producción pasa a ser el dolor del mapa del pillar, no el Hub ni la familia; tres registros de mención con gate
propio; mitigación del riesgo «HubSpot no sirve» moviendo la pregunta en vez de atacar la herramienta; herencia de la
regla del vacío. Tres gates medidos el mismo día: destino (pillar y caso ANAM `200`, otras cuatro `404`), partner
(tier declarado, no revalidado) y prueba (un solo caso publicado). El cruce deja dos huecos declarados, no rellenados:
Revenue Lifecycle/CFO sin capítulo y el capítulo 5 sin dolor en el mapa. Brief ejecutable de las siete fichas en
[RUTA_HUBSPOT.md](docs/commercial/campaigns/2026-q4-tu-ia-no-conoce-tu-negocio/RUTA_HUBSPOT.md). Los capítulos 1 y 2
quedan con brief por primera vez. Sin producir, publicar, pautar ni declarar tier de partner.

## 2026-09-22 — «Tu IA no conoce tu negocio»: del output a la pieza

[CDR-003](docs/campaigns/decisions/CDR-003-tu-ia-no-conoce-del-output-a-la-pieza.md) acepta la extensión 5B del
capítulo 5: entrada «A nosotros tampoco nos gusta el AI Slop», tesis durable «El output fue generado. La pieza fue
diseñada» y Design Context de seis capas. El ajuste aprobado mantiene a **Efeonce como única marca a posicionar**:
«Del output a la pieza» es territorio creativo, la metodología se comunica sin nombre comercial propio, Design
Context es el artefacto que construye y Behind the Build es un formato demostrativo. También documenta su aplicación
a cualquier disciplina de diseño, con contratos propios por oficio; gráfico, UI, UX, web, 3D y motion son ejemplos,
no una lista cerrada. La tesis empresarial distingue
acceso PYME de diferenciación/gobierno a escala en mid-market y enterprise: el fallo más costoso puede ser que todo
se vea intercambiable. El
[contrato interno](docs/operations/EFEONCE_AI_ASSISTED_DESIGN_METHOD_V1.md), la narrativa y el brief incorporan la
distinción, el build completo, Behind the Build, límites de prueba y medición. Sin producir, publicar, pautar, fusionar
ofertas ni crear SKU.

## 2026-09-22 — Campañas CMP: brief y continuidad entre agentes

[Contrato ampliado](docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md): templates de brief, índice de exports y ficha
por pieza, versionados Claude/Codex y sincronizados con OneDrive. Skills de estrategia, producción y medición
rutean al mismo brief, con JTBD/evidencia, estados separados y receta reproducible. CMP-001 consolida SEO/AEO y
Content, 25 exports por ruta; historial preservado. Corrección del lecho para nuevas adaptaciones documentada;
sin regenerar finales, modificar runtime ni publicar/pautar.

Reconciliación: CDR-002 registra el set de seis pilotos; BRIEF asigna roles vigentes. Template y guía separan recursos, contrato y motor; comprobar archivo adjunto/hash además del checker, que tolera ausentes en CI. Sin generación nueva.

## 2026-09-22 — Ads: Tres voces + acción

[Regla aprobada](docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md): CTA Poppins en texto, contorno o
relleno a demanda, complemento de las tres voces. Define jerarquía, gaps de tinta,
protección de sujeto/firma, cursor semántico y editables. Publicidad, Design y Growth/CRO sincronizados en
Codex/Claude; excepción acotada al relleno CTA sobre foto, sin scrims. Color a demanda según composición,
tinta/borde/relleno medidos por separado. v04 completa16 pilotos:4conceptos×4:5/1:1/9:16/16:9,
composición/contraste16/16 y firma≥5,52:1; arnés fotográfico genérico con límites explícitos.
Prompts, editables, matriz y evidencia en OneDrive; cobertura de cuatro ratios documentada en skills espejo.
v05 recompuso los cuatro verticales; el operador rechazó la firma alta. v06 la baja al pie según Claude,
con texto/CTA protegidos y posible solapamiento de firma en Reels declarado; QA separado.
16 finales autorizados en OneDrive, con conceptos/embudo, prompts, editables y reproducción; sin publicación.
v07 reduce el lecho y ancla la firma dentro de su materia. Método completo y ocho skills actualizados;
auditoría del compositor CTA: p98, cobertura del gate y campos no compatibles documentados, sin cambiar código.
Sin cambios runtime.

## 2026-09-21 — Paid visual: palancas, cinematic ads y medición por formato

Skills de publicidad, Design, Motion, Digital Marketing y Growth/CRO conectadas al
[playbook de atención visual](.codex/skills/efeonce-advertising-creative/references/paid-visual-attention-playbook.md),
con investigación primaria en tres frentes, doce palancas, recetas de estático/video/híbrido y definiciones
por plataforma. Se distingue hipótesis de rendimiento, CTR de atención y palanca publicitaria de ficha foto;
registro C sigue en construcción. Contenido sincronizado Codex/Claude; sin generación ni publicación.

## 2026-09-20 — Fotografía Efeonce: comparación visual obligatoria antes del prompt

El pipeline y las skills espejo de Design Studio y publicidad ahora exigen abrir los finales aprobados comparables,
registrar los portadores visibles del azul activo y del acento de historia, y medirlos de nuevo en el plate. Se corrigió
la firma vigente al **20 %** según la decisión del operador; el default histórico del compositor sigue en 15 % y se
debe pasar `LOGO=0.20` explícitamente. La [prueba con Julio y Nexa](ai-generations/2026-09-20_prueba-motor-integrado-julio-nexa/README.md)
documenta el fallo que motivó la guarda.

## 2026-09-20 — Fotografía de marca: tres comandos, seis reservas y el umbral de calma en L*

El prompt de una toma ya no se concatena a mano: `pnpm foto:prompt` lo arma desde una ficha y resuelve formato, % del
lecho y límite de sujetos desde **una sola tabla** — armarlo a mano fue la vía por la que «Vertical 4:5.» vivió dentro
del bloque de realismo compartido sin que nadie lo viera. `pnpm foto:validar` evalúa las seis reservas sobre el plate
limpio (zona de texto y objeto opt-in, en fracciones) y `pnpm foto:doctor` dice si la máquina puede generar, con seis
chequeos que ejercitan la cadena hasta la clave, sin costo y sin imprimirla; 27 tests cubren las guardas, incluida la de
materia de la superficie. Las reservas pasaron de cuatro a seis, con lecho por formato **[medido]** (4:5 18% · 9:16 22%
· 16:9 16% · 1:1 18% sin validar) y campo profundo al margen.

El piloto de 3 plates (USD 0,142) midió las dos nuevas: la banda del margen llega a **0,60** del alto cuando se pide, y
el recuadro de selección tiene punto dulce de padding (0,02 → 3,29:1; 0,00 y 0,04 fallan), no monotonía. El umbral de
calma se corrigió a **L\***: en luminancia lineal premiaba la oscuridad y la «losa» rechazada pasaba con 12× de margen;
`CALMA_MAX` mide calma y **no** detecta la losa —una losa es calma—, que se ataca en la entrada con la guarda de materia.
Se retiró §3.8.3 **[refutado]**: el prompt que supuestamente no la llevaba nunca se versionó y las dos franjas miden
igual; lo que separaba los números era el formato. **[decisión del operador]** el tono nunca fue el problema —una reserva
oscura está perfecta si la superficie existe de verdad y tiene nombre; lo prohibido es la reserva sin materia, en
cualquier tono—. La capa de composición gráfica sobre la foto sigue **sin aprobar**.
[Bitácora](docs/operations/social/2026-09-19-efeonce-photographic-language-production-method.md).

## 2026-09-19 — Berel: QA visual de comentarios en Frame.io

Los comentarios del share de octubre se clasificaron entre errores comprobables, ajustes visuales,
preferencias con motivo, observaciones incompletas y aprobaciones. La skill Berel en ambos espejos y el
Playbook/Aprendizajes de Notion incorporan gates de color, producto, legibilidad, función editorial y canal.
Sin masters editables, no se modificaron artes, versiones, estados ni publicación.

## 2026-09-19 — ISSUE-175: recuperado keyword discovery de DataForSEO

Restaurado el login ausente del worker compartido sin cambiar imagen ni otras env vars. Canary real
por scheduler: 10 candidatos, USD 0.0132, gasto reconciliado. TASK-1341 añade localmente guard de
configuración antes de build y readback de revisiones con tráfico, incluso si CI salta el deploy;
discovery distingue configuración ausente y no cuenta requests que no salieron. Cierre: guard y check
post-deploy corrieron en `ops-worker-deploy` (revisión `ops-worker-00699-6rf`) y el smoke AIO drenado por el
worker dio 6/6 `succeeded` (EO-GRUN-00055, USD 0,024). TASK-1341 complete.

## 2026-09-19 — Oferta transversal de transformación humano-agente

Se añadió investigación primaria, ficha de servicio y modelo de negocio para pasar de readiness de agentes a
equipos humano-agente con roles, autonomía, handoffs, adopción, calidad y economics. Las ofertas HubSpot/Salesforce,
la ruta RevOps & CRM y las skills espejo remiten al método. Estado `Approved for validation`: sin activación runtime,
precio, margen ni ROI aprobado.

## 2026-09-19 — Ajuste editorial y GTM para la oferta humano-agente

El operador confirmó que la oferta de transformación humano-agente está aprobada comercialmente y probada como
servicio. Se actualizó «Tu IA no conoce tu negocio» con una serie transversal en las franquicias existentes:
operaciones y ruta CMO (AEO público → contexto de campaña → equipo humano-agente), sin CRM obligatorio ni nueva SKU.
Quedaron buyer, piezas, roles por canal, Blueprint/operación y gates de prueba, paid y claims. Los Pilares JTBD de
Notion siguen separados de capítulos y taxonomía pública; posible nuevo pilar requiere readback y aprobación. Sin
cambios en Notion, sitio público ni publicación.

## 2026-09-19 — Trendjacking «Nivel de búsqueda» (GTA VI): jerarquía de 5 voces y compositor reutilizable

Carrusel de 9 láminas + pieza suelta para Efeonce, programado en Instagram (22-sep) y LinkedIn (25-sep, documento).
Método: estudio visual del trend con fuentes antes de dirigir, escenas de realismo ilustrado con GPT Image 2.5
(Flare/Sunburst) y activos de marca en escena (Nexa, logo 3D, nave, Clawd y Codex), jerarquía tipográfica de 5 voces
con texto enriquecido por palabra, selección AXIS con cursores fijos y en movimiento, y readback de Metricool por
firma de imagen. `compositeLuminosity` quedó exportada en `scripts/creative/layout-compiler/compiler.mjs` para
reutilizar la firma url-lum. Skills `social-media-studio`, `efeonce-advertising-creative`, `copywriting` y
`greenhouse-ai-image-generator` (espejos) y docs de ejecución social/publicitaria actualizados.
[Bitácora](docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md).

## 2026-09-19 — Revisión de cierre del último día de UNBOUND

La revisión de la agenda completa del 18/09 añadió al ledger Smart CRM Universal Record Page como private beta,
el laboratorio de Customer Agent como enablement de clientes, la denominación ChatGPT Lead Gen Ads y el cierre
técnico de Developer Platform 2026.09: Projects y Conversations API GA, 44 APIs actualizadas y nuevas betas públicas.
Se mantuvieron los gates: demo/private beta no equivale a GA, pricing, entitlement ni runtime; no se activó ningún
portal, write, conexión o campaña.

## 2026-09-18 — TASK-1832 retira la corrida canary y apaga sus gates

Se revocó la authority del canary sintético, el cleanup sujeto-específico borró todo el grafo run-owned
y preservó el cliente compartido de ChatGPT/Codex y los artefactos de otros sujetos. El apply ahora usa el
perfil PostgreSQL `ops`. Las dos puertas canary quedaron en `false` en todos sus runtimes, con lectura en la
revisión servida: auth-server `00076-t2t`, Vercel Production y gateway `00056-kgs`. Runbook, manual, matriz,
manifiesto, ledger y skill `efeonce-mcp-platform` (espejo) quedaron actualizados. Además se documentó el diagnóstico —buen canary,
retiro mal diseñado— y las reglas para la próxima corrida: clientes OAuth compartidos clasificados desde el día 0,
señales y muestras por sujeto sin huecos, dry-run con el perfil del apply y gates inventariados al abrir.

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
