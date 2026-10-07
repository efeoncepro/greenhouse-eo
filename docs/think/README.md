# Think Docs

> **Naming vigente:** la capacidad es **Efeonce AEO** y su diagnóstico público **Efeonce AEO Assessment**; el reporte se presenta como **Efeonce AI Visibility Report**. `AI Visibility Grader`/`Brand Visibility` siguen identificando el motor y las rutas existentes. [ADR](../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md).

`docs/think/` documenta los patrones de producto, UI y operacion del runtime publico
`think.efeoncepro.com` cuando una experiencia vive fuera del portal
Greenhouse pero depende de contratos, datos o renderers gobernados por
Greenhouse.

Este directorio documenta el **runtime del subdominio**, no toda la superficie
editorial Think. Según [PDR-003](../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md),
Think es el producto/hub de demand generation que agrupa Marketing con
Manzanitas, Glitch, newsletter, tools y lead magnets. Esa identidad puede
materializarse en más de un host y en plataformas externas, con la Pillar como
hogar canónico del territorio.

El sitio principal sigue siendo `efeoncepro.com`; el subdominio
`think.efeoncepro.com` es hoy un satélite público para experiencias enfocadas,
tools, reportes, muestras y superficies de lectura ejecutiva. **No es el destino
automático de toda guía o Pillar editorial.** El placement de Pillars se decide
con [PDR-018](../public-site/decisions/PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md)
y la route-ownership matrix.

Rooms incorporará la experiencia SEO/AEO de X-ray junto al perfil creativo mediante contenido estructurado y un adapter gobernado. [Contrato y límites](../architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md); no altera las rutas/muestras actuales ni acredita una migración ejecutada.

## Indice

- [Efeonce Rooms — dirección vigente](../architecture/rooms/README.md): plataforma propia en `rooms.efeonce.org`, nombre, frontera y design system La órbita acordados; arquitectura/experiencia propuestas antes del go final. El [análisis inicial](creative-proposal-experience-stack-analysis-2026-10-07.md) queda como investigación histórica. Las rutas actuales de Insights y X-Ray conservan sus contratos hasta una migración explícita.

- [Banco Pichincha / Pibank — continuidad comercial](../commercial/prospects/banco-pichincha-peru-seo-2026/README.md): muestra histórica y nuevo mandato 2027; no cambia el estado de publicación.

- [Arquitectura de patrones UI Think](architecture-ui-patterns.md)
- [Landing Brand Visibility](brand-visibility-landing.md)
- [Manual para reutilizar patrones UI Think](reuse-ui-patterns-manual.md)
- **[Radiografía AEO — Arquitectura](radiografia-aeo-architecture.md)** · **[Manual](radiografia-aeo-manual.md)**
- [X-Ray — análisis y plan de extensión a landing + artículo y enlaces por cliente](aeo-xray-composer-extension-plan-2026-09-30.md) — registro de análisis inicial; para estado actual consultar el manual y handoff de release.
- **[AEO X-Ray — preparar otro cliente](aeo-xray-nuevo-cliente.md)** · [Manual operativo](../manual-de-uso/growth/aeo-xray.md) · [Handoff de publicación](aeo-xray-release-handoff.md)
- Efeonce Insights — vista web compartida por token (decisión 2026-09-15; contrato en [arquitectura Insights §8](../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md#8-acceso-web-compartido); render en TASK-1875 sobre `InsightWebModelV1` de TASK-1848). Patrón: [Shared Tokenized Report](architecture-ui-patterns.md#pattern-shared-tokenized-report-efeonce-insights); dossier visual en [`docs/ui/reviews/TASK-1875-…`](../ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/)

## Herramientas vivas en Think

| Herramienta | Qué es | Ruta |
|---|---|---|
| **Efeonce AEO Assessment** (`AI Visibility Grader` técnico) | Diagnóstico público de visibilidad en motores de respuesta, por token. Greenhouse calcula, Think presenta el **Efeonce AI Visibility Report**. Mide el hueco: presencia, citación, competidores, readiness y próximos pasos. | `/brand-visibility` · `/brand-visibility/r/<token>` |
| **Efeonce Insights (informe compartido)** | Lectura ejecutiva de una edición de Insights para el cliente, por enlace con token. Greenhouse compone y gobierna el acceso; Think presenta: hallazgos que se expanden, escenas por módulo, modo presentación y descargas PDF. En producción desde 2026-09-28 (Think `bbf8522`); lee Greenhouse de producción, donde `INSIGHTS_SHARING_ENABLED` sigue OFF hasta el flip del operador. | `/insights/r/<token>` |
| **Efeonce Insights (muestra para clientes)** | El mismo render con datos de ejemplo y una marca ficticia, para mostrar el producto en venta: aviso visible, sin descargas ni llamadas a Greenhouse, `noindex`, fuera del sitemap. | `/insights/muestra` |
| **Radiografía AEO / AEO X-Ray** | Muestra de trabajo SEO/AEO: La oportunidad → La pieza → La radiografía → Dónde más vive. Extiende el mismo renderer con landing/artículo, marca y tokens por cliente, módulos completos, fuentes, acoplamiento, motion y derivados. Banco Pichincha publicado autónomamente en Think el 30/09/2026; integración gobernada Greenhouse aún pendiente. | `/muestras/<slug>-<token>` legacy · `/aeo-xray/r/sample_<clave>` autónomo · `/aeo-xray/r/xrg_<grant>` gobernado futuro |

## Principios

- **Producto ≠ host.** Una pieza puede pertenecer editorialmente a Think y
  mantener canonical en `efeoncepro.com`; nunca duplicar una pieza indexable
  entre WordPress, el dominio principal y el subdominio.
- **Cluster federado ≠ inventario social.** Un reel, carrusel, pin, video, post
  o newsletter platform-native puede ser nodo de primera clase si resuelve un
  JTBD, entrega valor autónomo, tiene relación gobernada con la Pillar y produce
  progreso medible. Publicar sobre el tema no basta. La URL de plataforma no
  convierte a `think.efeoncepro.com` en owner ni desplaza el hogar canónico.
- **Greenhouse calcula; Think presenta** los informes gobernados. La muestra X-Ray
  autónoma empaqueta un manifest AXIS revisado y medios autorizados en Think, sin provider
  Greenhouse ni formulario/captura. Es distribución no listada, no autenticación. Su carril
  futuro gobernado conserva ediciones, permisos, assets privados y revocación separados.
- **Grader diagnostica; Radiografía demuestra.** El Grader responde "qué hueco
  existe"; la Radiografía responde "cómo se tapa con trabajo visible". No son
  sustitutos ni dos lead magnets.
- **Think puede tener lenguaje visual propio.** Las landing pages publicas pueden
  usar ritmo editorial, hero inmersivo, motion y assets de marca que no pertenecen
  al portal operacional Vuexy.
- **No duplicar dominios gobernados.** Think no crea formularios locales,
  validaciones paralelas, consentimiento paralelo, submit paralelo ni proxy CORS
  para resolver lo que ya gobierna Growth Forms.
- **La jerga debe ser precisa.** Usar `IA` cuando ayuda al reconocimiento del
  usuario, pero preferir terminos AEO/GEO/SEO como `motores de respuesta`,
  `superficies generativas de busqueda`, `citabilidad`, `operabilidad`,
  `Share of Model`, `AI Overviews` o `respuestas generadas` cuando se describe
  el mecanismo real.
- **La UI se valida como producto vivo.** Cada patron visible debe verificarse en
  desktop y mobile con captura visual, overflow check, estados degradados y una
  prueba del contrato browser que consuma.
- **Un gate verde con una captura ilegible no es un cierre valido.** El gate no
  mira. Varios bugs de la Radiografia AEO solo aparecieron al ABRIR el PNG — entre
  ellos una regla CSS que nunca se agrego (el reemplazo apuntaba a una clase que ya
  no existia = no-op silencioso) y que dejaba los textos de lector de pantalla
  visibles en pantalla.
- **Una muestra con marca de cliente NUNCA emite su schema como marcado activo.**
  Publicar en `think.efeoncepro.com` un `application/ld+json` que declare
  `author: <cliente>` es un dato estructurado FALSO en nuestro propio dominio,
  ingerible por crawlers. Se muestra como texto escapado. Ver Radiografia AEO.

## Contratos relacionados

- [Pillar Experience: arquitectura y runtime](../public-site/decisions/PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md)
- [Public Site Route Ownership Matrix](../operations/public-site-route-ownership-matrix-20260616.md)
- [Growth AI Visibility Grader - documentacion funcional](../documentation/growth/ai-visibility-grader.md)
- [Growth AI Visibility Grader - smoke manual](../manual-de-uso/growth/ai-visibility-grader-smoke.md)
- [Public AI Visibility Grader Architecture](../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
- [Growth Public Forms Runtime Contract](../architecture/growth-public-forms-runtime-contract.md)

## Regla de frontera

Los patrones Think se pueden reutilizar dentro de Think o en otras experiencias
publicas satelite. Para llevarlos al portal Greenhouse hay que traducirlos a la
plataforma UI privada: primitives, tokens, `CompositionShell`, density contracts,
GVC y contratos de task UI cuando aplique.
