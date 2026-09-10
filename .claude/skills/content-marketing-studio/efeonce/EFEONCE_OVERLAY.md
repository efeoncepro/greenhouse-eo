# Overlay Efeonce — el ecosistema de contenidos real

El studio es genérico y reutilizable, pero Efeonce tiene un **motor de contenidos concreto**. Este overlay ancla las superficies, el motor y las reglas reales. La **doctrina de marca/voz/ICP/bow-tie NO se decide aquí** — es de `efeonce-agency` + `commercial-expert` + `docs/context/`. Aquí se opera el content engine sobre esa doctrina.

> **ICP:** Efeonce tiene **múltiples ICPs/segmentos** (no solo Globe). No hardcodees un ICP único en la estrategia de contenidos. La segmentación viene de `efeonce-agency`/`commercial-expert`; el contenido se produce para el segmento que el trabajo indique.

## Las superficies de contenido (dónde vive)

Layering canónico del ecosistema digital (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`). Dos ejes: **superficies** front-of-house por etapa de funnel × **plataformas/backbones**. El contenido vive en las superficies de **adquisición** (continuo bow-tie):

| Superficie | Rol en el funnel | Qué contenido |
|---|---|---|
| **Think** — producto/hub editorial multi-runtime | demand-gen + nurturing top-of-funnel | Agrupa Marketing con Manzanitas, Glitch, tools y lead magnets. No equivale al host `think.efeoncepro.com`; placement de Pillars por PDR-018 |
| **`think.efeoncepro.com`** — runtime Astro especializado | tools, reportes y experiencias enfocadas | Repo/Vercel `efeonce-think`; no es el destino automático de artículos o Pillars |
| **Marketing con Manzanitas** — blog | thought leadership / autoridad / demanda | **Multiformato** (PDR-020 §4.2): pillars y clusters, **casos de éxito completos (canonical)**, tools/graders, webinars, ebooks, data studies y archivo Glitch. Formato ≠ categoría |
| **Glitch** — newsletter semanal (IA / Marketing / Negocios) | audiencia propia / nurturing | Canal owned de mayor ROI; consume átomos del pillar y genera piezas |
| **Tools / lead magnets** (AI Visibility Grader, ebooks, webinars) | demand-capture / captura | Contenido gated que convierte audiencia en lead |
| **efeoncepro.com** (WordPress/Kinsta, recalibración a Astro) | demand-capture + conversión | Landings de servicio, comparison tables, páginas de conversión |
| **Experiencia** (cliente sky / cockpit Greenhouse) | post-venta | Contenido de enablement/retención cuando aplique |

El **AI Visibility Grader** es la costura top→bottom del ecosistema. Cargar PDR-003 al razonar sobre superficies/hosts/dónde nace una pieza.

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

## El motor: AI Content Factory (no reimplementar)

`src/lib/public-site/content-factory/` — planificación/validación Gutenberg, catálogo de patrones, patch/refresh de posts, deep-inspection. **Herramienta de producción/publicación; se opera vía `efeonce-public-site-wordpress`.**

- Docs: `docs/documentation/public-site/public-site-content-factory-end-to-end.md`, `content-factory-golden-examples/` (README + `gutenberg-post-ai-revops-draft.json`), `gutenberg-post-authoring-recipes.md`.
- **Refresh de evergreen** (`../modules/04`): `refresh-plan` / `existing-post-refresh-draft-plan` — opéralo vía la skill dueña.
- **Publicar al blog WP:** write path `wpcli eval-file` (writes normalmente OFF), autor WP user 1; gotchas: TOC Yoast anclas `h-{slug}`, UTF-8 nowdoc nunca `\uXXXX` (ver TASK-1123 / reference de publish).
- **Regla dura:** nunca publiques output crudo del factory — pasa por el gate de REVIEW (`../modules/02`) + barra de insight/voz.

## Ebooks / lead magnets (mecánica real)

- **Source:** todos los ebooks en OneDrive (`Alineación/5. Contenidos/07. Ebook/01. Entregables Ebook/`).
- **Entrega:** el PDF **NO** va al repo → bucket privado. Form corporativo → token → descarga on-screen **+ email con LINK** (no adjunto, el PDF pesa ~9MB). Playbook: `docs/reference/ebook-lead-magnet-playbook.md` (TASK-1374/1375).
- **Frontera:** el diseño de la mecánica de conversión del lead magnet (form/gating) es de `growth-marketing-cro` + `greenhouse-growth-forms`; el studio produce el **contenido** del ebook (`../modules/03`).

## AEO: servicio ≠ lead magnet (no confundir)

- **`/aeo-2/`** = landing del **servicio AEO** → HubSpot **AEO Lead Form** (es venta de servicio, no self-serve).
- **AI Visibility Grader** = el **lead magnet self-serve** (eso es growth). Nunca confundas ambos en el contenido/CTA.

## Distribución en el ecosistema Efeonce

> ⚠️ **Los canales propios se rigen por `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md`.**
> Cárgalo antes de planificar distribución en canales de marca Efeonce. Lo que sigue es la cadena de
> atomización; **el destino de cada átomo lo decide el catálogo por canal de PDR-020, no la conveniencia
> del calendario.**

Cadena típica de un pillar de **Marketing con Manzanitas**:

```
Pillar (blog, vía Content Factory)
  → Glitch (edición dedicada al insight)        [greenhouse-email]
  → el canal cuyo catálogo admite el átomo      [social-media-studio + Metricool]
  → Reel/clip (si aplica)                       [motion-design-studio]
  → Lead magnet gated (si el tema lo amerita)   [03 + growth-forms]
  → Slides sales enablement                     [commercial-expert]
  → citabilidad IA (answer-first, datos)        [seo-aeo]
```

**NUNCA atomices "a LinkedIn/IG/X" como si fueran un destino único.** PDR-020 asigna a cada canal un rol y
un catálogo propio de formatos; un átomo que no pertenece al catálogo de un canal no se publica ahí.
Reglas que gobiernan la atomización a canales propios:

- **Canal-hogar + satélites.** Cada franquicia nace en un canal y viaja como **corte con trabajo propio**,
  nunca como copia. Hogares: Behind the Build → Instagram · Versus → YouTube + Blog · Educativo → LinkedIn ·
  Glitch → email · Trendjacking → Threads + Instagram · Casos de Éxito → Blog.
- **Trendjacking no se atomiza:** su valor es la ventana temporal y un canal lento la pierde.
- **Educativo LinkedIn → Blog es corte, nunca copia.** El blog recibe la versión answer-first; publicar el
  mismo texto canibaliza el activo.
- **Casos de éxito** tienen compuerta de aprobación de cliente: su cadencia no la fija el calendario editorial.
- **Los territorios se heredan de PDR-019** (taxonomía canónica del blog). Nunca crear taxonomía social paralela.
- **Vocero de talking head:** Julio Reyes.

- **Metricool** está conectado (MCP, 10 marcas) y **sí programa posts** (`createScheduledPost`; gotcha `dayOfWeek 1=lun..7=dom`). La ejecución social es de `social-media-studio`.
- **Redes sociales de Efeonce** y su calendario → `social-media-studio` + **PDR-020** (rol y catálogo por canal) + landing de redes (TASK-1351). Threads es canal nuevo, abierto como experimento con criterio de salida.
- **Cluster federado:** una pieza social sólo entra al registry como nodo cuando resuelve un JTBD autónomo y
  declara roles, relación y progreso; de lo contrario conserva su rol honesto de activation asset.

## Voz y contexto (delegado, citado)

- **Voz Efeonce** + slogan "Empower your Growth" + 7 creencias contrarias → `efeonce-agency` (+ `copywriting/efeonce/EFEONCE_VOICE_SYSTEM.md`). El studio **aplica** la voz, no la define.
- **Bow-tie / GTM / métricas / ICP** → `docs/context/` (`05` voz, `06` métricas, `08` comercial, `11` HubSpot bow-tie) + `efeonce-agency`.
- **es-CL neutro, tuteo**, sin voseo. El operador no es argentino.

## Baseline competitivo + jugada de autoridad (2026)

El baseline competitivo de la agencia vive en `docs/context/15_panorama-competitivo-benchmark-industria.md` (producido con `research-benchmark-operator`). Hallazgo que le toca directo a este studio: los competidores digitales de Efeonce (Milimetrix, Muller y Pérez, Bigbuda, Loup…) **ganan visibilidad de industria dominando su propio SERP de categoría** con contenido de autoridad ("mejores agencias / estado del marketing digital y AEO en Chile"), y **Efeonce está ausente** — irónico, porque vende AEO y es full-stack (Paid Media, CRO, contenidos, SEO/AEO, performance).

**Jugada canónica para este studio (quick win del baseline):** producir contenido de autoridad propio que gane ese SERP **con método creíble** (data study, no auto-bombo), apropiando el ángulo AEO/integración antes que la competencia lo consolide. Es literalmente vender lo que Efeonce vende. Cruza con `seo-aeo` (citabilidad/AI SoV) y `research-benchmark-operator` (el data study como munición). Meta: volver a Efeonce **fuente** que la prensa gremial (DF, Adlatina, Publimark, ANDA, IAB, AMDD) cite — no solo proveedor.

## Reglas duras del overlay

- **NUNCA** reimplementar el Content Factory ni el publishing (operar vía `efeonce-public-site-wordpress`).
- **NUNCA** hardcodear un ICP único (múltiples segmentos; delega la definición).
- **NUNCA** subir un PDF de ebook al repo (bucket privado + entrega por link).
- **NUNCA** confundir `/aeo-2/` (servicio) con el grader (lead magnet).
- **NUNCA** publicar output IA crudo (gate de REVIEW + barra de insight/voz).
- **NUNCA** replicar un átomo a un canal cuya señal no lo premia, ni tratar los canales propios como un destino único: el catálogo por canal de PDR-020 manda.
- El contenido de Think vive en su **repo dedicado** (efeonce-think, Astro), no en greenhouse-eo.
- Pertenecer al **producto Think** no fija el host: authoring/render puede vivir en WordPress/apex o Astro, y
  sólo las rutas especializadas del subdominio viven en `efeonce-think`. Nunca asumir host desde la marca; lo
  resuelve PDR-018.
- Las infografías editoriales usan `EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`: shell estable, arquetipo elegido por
  relación, sello canónico `efeoncepro.com` y SVG directo cuando gana por seguridad, fidelidad y peso.

## Cross-links

- Estrategia → `../modules/01`; ops → `../modules/02`; formatos/ebooks → `../modules/03`; atomizar → `../modules/04`; distribuir → `../modules/05`; medir → `../modules/06`; IA/factory → `../modules/07`; infografías Efeonce → `EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`.
- Publicar → `efeonce-public-site-wordpress` + `astro`; social → `social-media-studio`; email → `greenhouse-email`; lead forms → `greenhouse-growth-forms`; voz/ICP → `efeonce-agency`.
