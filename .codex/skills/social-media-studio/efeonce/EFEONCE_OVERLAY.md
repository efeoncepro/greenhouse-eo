# Overlay Efeonce / Greenhouse — índice (social-media-studio)

## Contrato vigente de Social Media

El servicio comercial vigente es una operación humana recurrente, operada por un squad Efeonce. Su diferenciador es convertir conocimiento, conversación y contenido social en autoridad y demanda medibles, con foco inicial en B2B experto.

### Run & Gun: capability vs servicio

- **Efeonce Run & Gun Studio:** capability interna de producción profesional rápida, con equipo, crew, captura, sonido, iluminación, movilidad, edición y postproducción.
- **Efeonce Run & Gun Production:** servicio cotizable que define objetivo, jornada, equipo, entregables, rondas, derechos y fecha de entrega.
- **Paquetes:** `Content Capture Day`, `Executive / Interview Capture`, `Social-First Production Sprint` y `Brand Story / Campaign Capture`.

Run & Gun es una ventaja de delivery, no producción ilimitada incluida en el retainer. Jornadas, viajes, talentos, derechos, licencias, postproducción ampliada y campañas extraordinarias requieren SOW y economics propios.

### Globe no es dependencia

La operación actual debe funcionar con personas, herramientas y procesos disponibles sin Globe. `CLIENT_DELIVERY.md` conserva un adaptador futuro para clientes internacionales, pero no debe leerse como disponibilidad de Globe ni como requisito para vender o ejecutar Social Media.

> Aterriza el conocimiento portable de social media en el ecosistema real de Efeonce.
> Lo genérico vive en `../modules/`; aquí van los mapeos, boundaries, herramientas y paths
> reales. **Reverifica el estado en el repo y en las plataformas** (todo cambia rápido).
> Nota: el overlay de `digital-marketing` lista "social/Metricool" como un **GAP** de martech
> — esta skill es la que lo llena.

## Canales propios — SSOT: PDR-020

**`docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` gobierna los canales de marca
Efeonce.** Cárgalo antes de proponer formato, calendario o distribución en canal propio. Resumen operativo:

| Canal | Rol | Formatos nativos |
|---|---|---|
| **Blog** | el activo (URL canónica, schema, citabilidad) | artículos y Pillars · **casos de éxito completos (canonical)** · tools/graders · webinars · ebooks · data studies · archivo Glitch |
| **LinkedIn** | el comprador | **educativo** (post extenso + documento nativo) · el corte del caso de éxito · POV profesional · talking head ejecutivo |
| **YouTube** | la profundidad + segundo buscador | experimento completo · tutorial/how-to · webinar grabado · Shorts como anzuelo |
| **Instagram** | craft y cultura | proceso real con tropiezos · talking head de tendencia · trendjacking · **seasonalities (la temporada vista desde el oficio)** · cultura y talento. **NO lleva casos de éxito** |
| **Threads** | conversación viva | reacción rápida · opinión corta · hilo en bruto · pregunta abierta. **Experimento con criterio de salida** |
| **Glitch (email)** | la propiedad | la edición semanal |

**Franquicias con canal-hogar** (nacen en uno, viajan como corte con trabajo propio, nunca como copia):
Behind the Build → Instagram · Versus → YouTube + Blog · Educativo → LinkedIn · Glitch → email ·
Trendjacking → Threads + Instagram · Casos de Éxito → Blog · **Seasonalities → Instagram**.

**Seasonalities** (PDR-020 §4.4) es una línea permanente: ventana previsible por mercado, desarrollada desde
una disciplina de la casa. Una efeméride puede ser su detonante, pero no sustituye la investigación del
comportamiento. **Trendjacking** responde a una conversación emergente verificada; no imponer una duración
universal de horas ni tratar toda ocasión cultural como tendencia. Una reacción imprevista dentro de una
temporada se clasifica y evalúa por separado. Sends/saves son señales, no prueba de recuerdo ni negocio.
LinkedIn requiere argumento profesional propio. Plan fechado: `docs/audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md`.

**Marca:** declarar papel estratégico y atribución visual. Una firma editorial no es product placement;
una marca física necesita soporte plausible, acabado, perspectiva y revisión de identidad. Un color o cinta
aprobados no garantizan reconocimiento sin evidencia. No forzar objeto corporativo ni CTA. Mantener la marca
fuera de objetos rituales sin revisión cultural específica. El procedimiento y los criterios por formato viven
en [SEASONAL_CONTENT.md](SEASONAL_CONTENT.md) y
[brand-in-scene](../references/brand-in-scene.md); cargar ambos al producir una seasonality con marca física.

### Reglas duras de canal propio

- **NUNCA replicar una pieza a un canal cuya señal no la premia.** Compartir producción ("una producción,
  N cortes") **no** implica compartir catálogo. Un carrusel no es contenido de Threads; una noticia de texto
  no es contenido de Instagram; un hilo en bruto no es contenido de LinkedIn.
- **NUNCA crear taxonomía social paralela.** Los territorios se heredan de la taxonomía canónica del blog
  (PDR-019): AEO, Inteligencia Artificial (Agentes es sub-territorio), HubSpot, Loop Marketing, Growth,
  Diseño, SEO, Marketing Digital, Inbound Marketing, Novedades Efeonce. Foco actual: **AEO + IA**.
- **NUNCA publicar en el blog el mismo texto de un post educativo de LinkedIn.** El blog recibe la versión
  answer-first; copiar canibaliza el activo.
- **NUNCA comprometer un caso de éxito en el calendario sin aprobación del cliente.** Es la única franquicia
  con compuerta externa: los briefs ANAM nacen `private` y no autorizan publicación automática. Casos
  citables al 2026-09: Sky (+127% orgánico), Bresler (+180% ventas digitales), Pinturas Berel, ANAM (2 en
  desarrollo). Sin resultado citable → cifra ilustrativa **declarada**, nunca inflada.
- **NUNCA despiezar trendjacking** a canales lentos: su valor es la ventana temporal.
- **NUNCA liderar con portafolio estático en Instagram**: optimiza la métrica de vanidad que la propia
  doctrina de PDR-005 §2 declara demotada. El proceso es la prueba; el resultado final es un claim.
- **Vocero de talking head: Julio Reyes.** El formato construye reconocimiento facial y sólo rinde con
  recurrencia de la misma cara; un segundo vocero es decisión explícita, no disponibilidad de agenda.
  Capability de producción: paquete `Executive / Interview Capture` de Run & Gun Studio.
- **Hook <2s, sin excepción**, y ninguna línea se mide por seguidores ni por volumen de posts.

## Runtime real en Notion — leer ANTES de proponer estructura

El sistema de contenidos **no es el calendario**: son tres bases encadenadas
(**Pilares JTBD → Content Hub → Calendario de Contenidos**) + la Wiki. Mapa canónico con IDs,
schema vigente y brechas: **`docs/operations/EFEONCE_CONTENT_SYSTEM_NOTION_MAP_V1.md`**.

| Base | Data source | Rol |
|---|---|---|
| Pilares JTBD | `collection://33ecce0f-f806-409d-b193-6f6a23e6f9d2` | **eje temático canónico** — 7 pilares con job, buyers BP1–BP8, tier, registro de voz, split y canales |
| Content Hub | `collection://9540b2c0-c621-4ccf-986b-efefe63feb7e` | **taller de texto largo**: artículos, ebooks, pillar pages, series, podcast, storytime (41 piezas, 8 templates). Desde acá se distribuye a **Think** o **WordPress** |
| Calendario **vigente** | `collection://38339c2f-efe7-8113-9c92-000b50674fa8` | 66 filas, todas a futuro (2026-09-18 → 2027-03-21) |
| Calendario **anterior** | `collection://2e039c2f-efe7-8118-ab82-000b04f62cfd` | 100 filas de histórico publicado, **schema idéntico**; es al que apuntan Content Hub y Pilares |
| Wiki de Contenidos | `collection://15839c2f-efe7-819d-90b7-000b9011a403` | 89 páginas de doctrina, formatos, SOPs, playbooks |

**Cuatro ejes ortogonales — una pieza bien formada declara los cuatro:** Pilar JTBD (para quién y qué
job) · Territorio `PDR-019` (bajo qué se archiva) · Franquicia `PDR-020` (qué forma recurrente) ·
Canal (dónde nace).

**Reglas duras:**

- **NUNCA** proponer estructura de contenidos sin leer el mapa: el runtime tiene ejes que la doctrina
  no inventó (tier T1/T2/T3, registro de voz, split, buyers) y siguen vigentes.
- **NUNCA** confundir `Territorio Arc` (Social Proof, CSC, AEO+SD, Nested Loops, Agentic Web — narrativa
  de marca) con el territorio de `PDR-019` (taxonomía del blog WordPress). Son dos taxonomías distintas.
- **NUNCA** tratar `LinkedIn Página 💼` y `LinkedIn Julio 👤` como el mismo canal: el runtime los modela
  separados y su voz es distinta (marca vs `JULIO_REYES_VOICE_SYSTEM`).
- **NUNCA** ejecutar una mutación en Notion sin autorización explícita del operador.
- **NUNCA** asumir que "el calendario" es una sola base: hay **dos** con schema idéntico y el histórico
  está partido. Cualquier promedio de velocidad operativa medido sobre una sola usa la mitad de la
  evidencia.
- **NUNCA** inferir el destino de publicación desde el `Tipo`: una Pillar puede vivir en Think o en
  WordPress según `PDR-018`, y un ebook no vive en ninguno (bucket privado + entrega por link). Hoy el
  Content Hub **no tiene propiedad de destino** — sólo `Enlace`, poblado en 5 de 41 piezas.
- Brecha crítica del eje temático: **0 de 66 filas del calendario vigente declaran `Pilar JTBD`.**
- Brechas al 2026-09-10: Wiki con **89 páginas sin etiquetar**; el Calendario **no puede expresar
  franquicia, canal-hogar vs satélite, territorio ni sends/saves/watch time/dwell**; `Tipo de pieza`
  conserva `Portafolio`, descartado por `PDR-020`.

## Cuándo usar este overlay

Cuando el trabajo social toca los canales propios de Efeonce (marca, Think/Glitch/grader) o
la operación para un cliente internacional futuro. Para Social Media actual basta `../modules/`; Globe no es dependencia.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `SEASONAL_CONTENT.md` | **Seasonalities** (ventanas previsibles, con efemérides como posibles detonantes) por mercado, conceptos visuales, briefs ejecutables y producción anticipada; relación con tareas/calendario Notion. |
| `STUDIO_TOOLING.md` | El pipeline real de ejecución: Metricool + Higgsfield + AI-image + Figma/Express + hand-offs. |
| `SOCIAL_BOUNDARY.md` | La costura completa vs digital-marketing / growth-marketing-cro / copywriting / seo-aeo / efeonce-agency / generadores. Regla de precedencia. |
| `CLIENT_DELIVERY.md` | Adaptador futuro para clientes internacionales: multi-marca, aprobaciones y reporting. No implica disponibilidad de Globe. |

## Ecosistema digital Efeonce (SSOT: `docs/public-site/decisions/PDR-003`)

Dos ejes ortogonales — **superficies** front-of-house (por audiencia/etapa) que consumen
**plataformas/backbones** (runtime Greenhouse, Kortex CRM, Verk). Dónde entra social:

- **Think** = demand-gen + nurturing top-of-funnel: blog *Marketing con Manzanitas* →
  newsletter semanal *Glitch* (IA/Marketing/Negocios) + tools (*AI Visibility Grader*, ebooks,
  webinars). Social distribuye Think, pero no se reduce a promoción: reels, carruseles, posts,
  Pins, Shorts y videos pueden ser **platform-native cluster nodes** de sus Territory/Cluster
  Experiences cuando tienen JTBD propio, valor autónomo, relación gobernada, URL/ID, owner y
  medición. Un teaser que sólo lleva al blog sigue siendo activación. **El canal de destino lo
  decide el catálogo de PDR-020, no la conveniencia del calendario.**
- **`efeoncepro.com`** = demand-capture + conversión (WordPress/Kinsta, recalibrando a Astro).
  Social empuja tráfico a las landings de servicio (ej. `/aeo-2/`).
- **El grader (AI Visibility Grader)** es la costura top→bottom — pieza social-nativa ideal:
  contenido que muestra el resultado del grader es "DM-able" y demuestra expertise AEO.

## Marca (dura)

- **Efeonce ≠ Greenhouse.** Greenhouse es el portal operativo interno (los clientes NO lo ven).
  Todo lo social público es **marca Efeonce** (agencia). SSOT de marca:
  `src/config/efeonce-brand.ts` (arquitectura de marca, eslogan). NUNCA uses el `AxisWordmark`
  ni assets del Design System interno en social público.
- Voz: es-CL neutro, natural para audiencia LATAM/internacional. Para craft fino de copy →
  `copywriting` + su sistema de voz Efeonce. Para reglas de tono del portal → `greenhouse-ux-writing`
  (pero eso es copy de producto, no social).
- Ilustraciones/personajes propietarios (`characters/greenhouse-*.png`, Nexa) = obra del equipo
  creativo, NO stock. Úsalas con criterio de marca; producción visual nueva → generadores (§tooling).

### Línea gráfica «La órbita» en redes (canónica desde 2026-09-25)

Rige toda pieza social de la marca propia Efeonce y su familia (Globe, Wave, Reach cambian sólo el acento).
**No** aplica a clientes ni a Greenhouse. Contrato: [manual](../../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
(§1.3 órbita, §1.5 lente, §8.5 URL, §9 foto, §10.1 grillas y campaña). Referencia operativa y checklist de QA:
[graphic-line-orbit.md](../../efeonce-brand-studio/references/graphic-line-orbit.md). Los valores salen de los
tokens `efeonceGraphicLine` de `@efeoncepro/axis-tokens`; nunca HEX ni px transcritos a mano.

- **Lo que cambia en redes:** grosores ×1,75 en lienzos de hasta 1200 px; margen del 9 % del lado corto; en 9:16,
  la órbita y el texto respetan la zona que tapa la interfaz de cada red (medidas en
  `docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md`, §Zonas seguras).
- **Ningún texto cruza la órbita.** Una órbita o una lente por pieza, nunca como patrón. El arco de avance mide un
  dato real; sin dato, no hay arco.
- **Campaña con foto:** la órbita rodea la lente con aire y la esfera va arriba a la izquierda, lejos de la cara.
  La foto sale del banco propio `ai-generations/2026-09-25_banco-lente-orbita/` (8 tomas, una por palanca, fichas
  en `fichas/`) o del pipeline `foto:*`; sin velo navy, sin emblema legible, sujeto dentro de un círculo del 55 %
  del lado corto.
- **URL:** `efeoncepro.com` va siempre en la burbuja oficial `url-lum`, nunca como texto suelto; si el render no
  garantiza la fusión de luminosidad, usa la variante horneada (`deliverables/assets/url-lum-{light,dark}.svg`).
- **«Te hacemos visible»** siempre con su prueba y sin pauta mientras falte la revisión legal (§1.4). La prueba de
  atribución sin logo sigue sin medir: no afirmes que la órbita ya se reconoce sola.

## Narrativa del período (Q4 2026 – Q3 2027)

Las piezas sociales de marca de Efeonce que no son seasonality se anclan a un capítulo de **«Tu IA no conoce tu
negocio»**. Canon: [`EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md`](../../../../docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md).
- El capítulo 4 prioriza la serie **«Así trabaja un equipo humano-agente»**: job, ficha de rol, handoff,
  excepción, supervisor y resultado válido. Es una serie temática, no territorio social ni octava franquicia.
  [Brief Q4](../../../../docs/commercial/campaigns/2026-q4-tu-ia-no-conoce-tu-negocio/README.md).
- La variante para CMO de esa misma serie conecta AEO (qué se dice de la marca), contexto aprobado de campaña y handoff humano-agente. Mostrar brief, revisión de claims/segmento y decisión de publicación o gasto, no un bot genérico ni volumen de campañas como resultado. Respetar canal-hogar y permisos distintos entre contexto público y datos privados.
- Instagram: proceso real con tropiezo/decisión bajo `Behind the Build`, nunca organigrama ficticio o caso de éxito
  no autorizado. LinkedIn Página: método educativo y documento útil; LinkedIn Julio: POV personal con su voz.
  El blog conserva casos completos autorizados. PDR-020 manda el catálogo y cada satélite aporta trabajo propio.
- El CRM que se actualiza solo desplaza la pregunta de «¿quién escribe el dato?» a «¿quién autoriza la acción,
  revisa la interpretación y corrige el error?». Evitar el absoluto «el CRM nunca se enteró» sin prueba.
- En piezas del servicio usar artefactos auténticos anonimizados (work chart, ficha, registro de excepción),
  escenas/entrevistas reales y baseline. Un mockup se rotula ilustrativo; métricas, nombres y logos de cliente
  exigen permiso específico. No usar robots/cerebros genéricos como sustituto de prueba.
- Salesforce sólo se nombra en orgánico de liderazgo de opinión, con respeto; nunca en pauta.
- La cuenta regresiva a la Ley 21.719 (1 dic 2026) es orientación, no asesoría legal.
- Seasonalities conservan su línea propia; no se les fuerza un capítulo.
- La oferta humano-agente está comercialmente aprobada y probada por confirmación del operador; esto no autoriza
  publicar ROI, precio, caso ni claim de disponibilidad de un tenant sin su propia evidencia. Antes de convertir
  en paid, verificar landing neutral, CTA, formulario/agenda y atribución. No programar por este overlay.
- KV paraguas: Nexa (humana, hoodie Efeonce) es central; el hombro lleva **una sola** mascota de partner por imagen
  (Clawd/Claude hoy, Codex Pet/Codex después), que cambia junto con nombre y color del cursor colaborador e insignia.
  Nunca dos mascotas de terceros juntas.
- Riesgo de partner: la mascota confundida puede leerse «Claude no sirve». Mitigar en caption (el problema es el
  contexto, no la capacidad) y validar con la guía de marca del partner antes de pautar. Caso:
  [`LEEME.md`](../../../../ai-generations/2026-09-17_kv-tu-ia-no-conoce/LEEME.md).
- **Gigi (Google Gemini) es la tercera mascota de partner** con biblioteca 3D, y entra con un papel distinto:
  no es quien hace marketing, es **la máquina que responde**. Por eso tiene una familia propia de 8 poses de
  búsqueda y AEO que Clawd y Codex no tienen —la pregunta, la respuesta con citas, el podio, el diagnóstico— y
  `no-te-conoce` (una tarjeta completamente vacía) es el KV del capítulo. Sigue valiendo una sola mascota de
  partner por imagen. 🔴 **Gigi se queda con el sistema de color de la pieza:** no «porta un color», es el
  espectro completo de Google, así que con ella en cuadro es el **único acento de color** y Efeonce vive en el
  navy y la estructura; buscar otro portador para el azul de Efeonce es competir con un degradado de tres colores
  y perder. Es propiedad de Google: interpretación 3D de uso interno y orgánico, y orgánico aprobado no es pauta.

## Coherencia con las skills hermanas del repo

Esta skill es **social-first ejecución**. Encadena con: `digital-marketing` (cuando social es
parte de una campaña integrada), `growth-marketing-cro` + `greenhouse-growth-forms` (captura de
lead social → grader/newsletter), `content-marketing-studio` (pertenencia al territorio/cluster),
`seo-aeo` (URLs sociales en Google/Search Console + AEO; acá búsqueda/recomendación in-platform),
`efeonce-public-site-wordpress` (publicar nodos owned cuando corresponde),
`greenhouse-email` (Glitch newsletter runtime). Detalle en `SOCIAL_BOUNDARY.md`.
