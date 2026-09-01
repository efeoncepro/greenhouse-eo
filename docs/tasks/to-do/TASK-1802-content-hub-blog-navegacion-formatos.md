# TASK-1802 — Content Hub Efeonce: `/blog` navegable y multiformato

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1802-content-hub-blog-navegacion-formatos.md`
- Flow: `docs/ui/flows/TASK-1802-content-hub-blog-navegacion-formatos-flow.md`
- Motion: `docs/ui/motion/TASK-1802-content-hub-blog-navegacion-formatos-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-019`
- Status real: `Dirección y arquitectura funcional contratadas; naming, inventario multiformato y bindings por verificar`
- Rank: `TBD`
- Domain: `public-site|content|growth|ui|seo`
- Blocked by: `inventario canónico de Tools/Videos/Webinars y decisión de naming visible Think/Marketing con Manzanitas`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reconstruir `/blog` como el Content Hub editorial de Efeonce: una experiencia propia, navegable y dinámica que
consulta artículos publicados de WordPress mediante widgets Elementor gobernados, hace visible el archivo histórico
y reúne Artículos, Glitch, Tools, Videos, Webinars y recursos futuros sin confundir formatos con categorías.

La adaptación estética de Demo 35 deja de ser la dirección. Se conservan únicamente los patrones aprobados de
descanso editorial full-bleed y la banda de suscripción; la estructura, queries, navegación y sistema visual son
propios de Efeonce.

## Why This Task Exists

El `/blog` vigente trata el contenido como un feed difícil de recorrer. Para encontrar publicaciones anteriores,
la persona termina dependiendo de la lupa y de una búsqueda global poco intuitiva que mezcla posts, páginas,
adjuntos, Elementor y portfolio. No existe una entrada visible al archivo, una paginación clara ni una forma de
explorar el catálogo por formato y tema.

El ecosistema editorial tampoco es sólo artículos. PDR-003 define Think como producto/hub de demand generation:
Marketing con Manzanitas y Glitch conviven con tools, graders, ebooks, webinars, podcast, videos y distribución
social. Una home que sólo cambia cards de posts resolvería estética, pero no el problema de producto ni el de
descubrimiento histórico.

Elementor debe componer la experiencia, no almacenar un inventario duplicado. Los módulos de artículos consultan
el `post` type publicado de WordPress y su taxonomía canónica; la curaduría manual se limita a posiciones editoriales
explícitas y siempre conserva fallback por query. Tools, Videos y Webinars requieren inventario de canonical URL,
owner, tipo, tema, fecha, imagen, estado y freshness antes de definir su reader o registro.

## Goal

- Llegar a contenido antiguo desde `/blog` en no más de dos decisiones visibles, sin depender de buscar.
- Renderizar artículos reales y vigentes desde WordPress mediante widgets Elementor dinámicos, no cards hardcodeadas.
- Separar tipos de contenido de temas editoriales y hacer navegables ambos ejes.
- Integrar Artículos, Glitch, Tools, Videos, Webinars y recursos futuros bajo una URL canónica por pieza.
- Conservar rendimiento, accesibilidad, SEO/AEO, medición y rollback antes de reemplazar el `/blog` actual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/public-site/decisions/PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md`
- `docs/public-site/decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- WordPress `post` + Gutenberg siguen siendo la fuente editorial de artículos; Elementor consume queries, no copia
  título, imagen, fecha o URL de cada artículo en settings manuales.
- Tipos (`article`, `glitch`, `tool`, `video`, `webinar`, `guide`, etc.) y temas (AEO, SEO, IA, HubSpot, Growth,
  Diseño, etc.) son dimensiones distintas. No crear una categoría WordPress por cada formato.
- Cada pieza tiene una única canonical URL aunque viva en WordPress, Think/Astro, YouTube, HubSpot u otra superficie.
- La navegación histórica debe existir como HTML rastreable con enlaces y URLs persistentes. Scroll infinito o
  búsqueda pueden complementar, nunca sustituir paginación/archivo.
- No escribir `_elementor_data` directamente; usar `Document::save(elements, settings)` con snapshot, hash,
  ownership guard, purge y readback.
- La fuente Demo 35 page `225984` permanece protegida. La copia `251875` continúa `noindex` hasta aprobar cutover.
- El tamaño/prominencia de una card no se deduce de la jerarquía de categorías. Las posiciones destacadas tienen
  un contrato de curaduría explícito y fallback automático.

## Normative Docs

- `docs/documentation/public-site/wordpress-blog-content-hub-search.md`
- `docs/manual-de-uso/public-site/operar-wordpress-blog-content-hub-search.md`
- `docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md`
- `docs/public-site/PRODUCT_ROADMAP.md`
- `docs/ui/visual-directions/TASK-1802-content-hub-blog-navegacion-formatos.md`
- `docs/ui/wireframes/TASK-1802-content-hub-blog-navegacion-formatos.md`
- `docs/ui/flows/TASK-1802-content-hub-blog-navegacion-formatos-flow.md`
- `docs/ui/motion/TASK-1802-content-hub-blog-navegacion-formatos-motion.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landings/demo35-blog-magazine.md`
- `.codex/skills/efeonce-public-site-wordpress/references/elementor-mutation.md`
- `.codex/skills/efeonce-public-site-wordpress/references/runtime-and-discovery.md`

## Dependencies & Impact

### Depends on

- WordPress/Kinsta vivo, `ohio-child`, Gutenberg posts y Elementor page `251875` como superficie de trabajo.
- Taxonomía editorial aplicada por PDR-019 y los artículos reales publicados.
- Inventario verificable de Tools, Videos, Webinars, guías y otros recursos con URL canónica y owner.
- `TASK-1337` sólo para el bloque semántico de Glitch dentro de posts; el hub no espera su cierre para listar Glitch.
- Decisión editorial del operador sobre el nombre visible `Think` / `Marketing con Manzanitas`.

### Blocks / Impacts

- Futuro cutover de la ruta `/blog` y navegación pública hacia contenido.
- Search editorial, archivos, category navigation, newsletter y medición de descubrimiento/conversión.
- PDR-003/PDR-018 y roadmap si Discovery cambia placement, naming o source of truth multiformato.
- EPIC-031 sólo como consumidor de ediciones Glitch publicadas; esta task no opera el pipeline editorial.

### Files owned

- `docs/tasks/to-do/TASK-1802-content-hub-blog-navegacion-formatos.md`
- `docs/ui/visual-directions/TASK-1802-content-hub-blog-navegacion-formatos.md`
- `docs/ui/wireframes/TASK-1802-content-hub-blog-navegacion-formatos.md`
- `docs/ui/flows/TASK-1802-content-hub-blog-navegacion-formatos-flow.md`
- `docs/ui/motion/TASK-1802-content-hub-blog-navegacion-formatos-motion.md`
- `docs/public-site/` y `docs/documentation/public-site/` — deltas del hub aprobados durante ejecución.
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` — relación y estado de la unidad.
- `scripts/public-website/` — compilación, configuración y verificación page-scoped, con nombres congelados en Discovery.
- Plugin/widget público canónico de Elementor — módulos Content Hub con nombres y ubicación confirmados en Discovery.
- `.codex/skills/efeonce-public-site-wordpress/` y espejo `.claude/` — continuidad operacional posterior al cierre.

## Current Repo State

### Already exists

- `/blog` WordPress, posts Gutenberg, categorías canónicas y permalinks `/%category%/%postname%/`.
- Búsqueda WordPress nativa y archivos Ohio por categoría, pero sin una navegación de hub suficiente.
- Demo 35 fuente `225984` protegida y copia `251875` publicada `noindex` para trabajo.
- Quince widgets `ohio_recent_posts` en la copia, hoy dependientes de estructura/copy/assets demo y algunos vacíos.
- Módulos públicos Elementor gobernados, patrón `Document::save`, snapshots, verificación y rollback.

### Gap

- No hay arquitectura de información ni sistema visual propio para el Content Hub Efeonce.
- La navegación a artículos antiguos no es visible ni intuitiva; la lupa termina funcionando como ruta principal.
- El buscador editorial no está restringido a contenido relevante.
- Elementor no tiene aún módulos Content Hub gobernados con queries canónicas y paginación server-rendered.
- Tools, Videos y Webinars no poseen inventario federado común ni contrato de exposición verificado.
- No existe un flow/GVC durable que pruebe archivo, filtros, búsqueda, vacíos, responsive y cutover.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: WordPress/Kinsta para `/blog`, posts y Elementor; recursos especializados pueden vivir en Think/Astro u otras plataformas.
- Future candidate home: `public`
- Boundary: widgets Elementor consumen un reader/query de contenido publicado y un registro federado allowlisted;
  el browser recibe sólo campos públicos, canonicals y estado de navegación.
- Server/browser split: WordPress/PHP resuelve queries, paginación, taxonomías y fallbacks; browser mejora filtros o
  búsqueda sin importar credenciales, CMS internals o provider SDKs.
- Build impact: widgets y scripts públicos existentes; no agregar framework pesado, búsqueda client-only ni entrypoint global.
- Extraction blocker: route ownership WP/Astro y fuente canónica de recursos externos deben cerrarse antes de mover runtime.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante que llega por navegación directa, buscador, newsletter, social o enlace a una pieza.
- Momento del flujo: quiere descubrir lo reciente, profundizar en un tema/formato o recuperar contenido antiguo.
- Resultado perceptible esperado: «entiendo qué publica Efeonce, puedo recorrerlo y siempre sé cómo seguir».
- Friccion que debe reducir: feed opaco, dependencia de la lupa, categorías mezcladas con formatos y cards demo.
- No-goals UX: portal editorial interno, dashboard, streaming de video propio, reproductor complejo o catálogo e-commerce.

### Surface & system decision

- Surface: `/blog` y su copia `noindex` de trabajo antes del cutover.
- Information architecture: hero editorial; navegación por tipo; latest; archivo; temas; Glitch; recursos; descansos
  visuales full-bleed; newsletter; footer.
- Primitive decision: `extend` el plugin Elementor público con módulos Content Hub adaptables y query-driven.
- Visual system: dirección propia Efeonce; Demo 35 sólo aporta evidencia de ritmos full-bleed aprobados.
- Navigation: links semánticos para destinos, filtros y páginas; buttons sólo para acciones locales.

### State inventory

- Default: artículos y recursos reales con navegación de tipo/tema/archivo visible.
- Loading: HTML server-rendered primero; enhancement opcional nunca oculta contenido base.
- Empty: el tipo/tema sin contenido explica el estado y ofrece volver a Todos/Archivo.
- Error: falla de recurso federado no tumba artículos WordPress; se omite o marca bloque degradado sin datos falsos.
- Search empty query: no ejecuta el inventario completo; conserva instrucciones y foco.
- Search no results: copy útil, query visible y rutas a Archivo/Temas.
- Long content: títulos, excerpts y etiquetas no rompen grid ni jerarquía.
- Mobile 390 px: navegación de tipos envuelve o usa overflow accesible; cero overflow de documento.
- Pagination: current, first, middle, last, previous/next disabled semánticamente y deep link directo.

### Interaction contract

- `Explorar archivo` navega a una sección/destino visible, no abre la lupa.
- Tipo y tema actual se reflejan en URL, heading y estado activo; Back/Forward restaura el estado.
- Paginación usa enlaces server-rendered y conserva filtros compatibles.
- Search del hub restringe resultados a tipos editoriales allowlisted y no reemplaza navegación.
- Cards completas pueden ser enlaces si mantienen texto accesible; CTAs internos no crean links anidados.
- Teclado recorre skip link, navegación local, cards, filtros, paginación y suscripción en orden lógico.

### Motion & microinteractions

- Motion contract: `none` para V1; no parallax, carrusel, scroll hijacking ni reveal obligatorio.
- Hover/focus/active usan CSS y no cambian layout.
- Reduced motion conserva la misma información y navegación.

### Implementation mapping

- Elementor document: page `251875` como staging `noindex`; ID final `/blog` se decide en cutover.
- Widget `hero/latest`: query `post_type=post`, `post_status=publish`, fecha descendente; curado opcional por ID
  válido con fallback automático y deduplicación de posts ya mostrados.
- Widget `archive/feed`: `WP_Query` o reader canónico equivalente, `paged`, categoría/tipo allowlisted, orden estable,
  HTML de paginación y canonical coherente; nunca lista manual de artículos.
- Widget `topics`: términos de PDR-019 con conteo/estado real; no promover categorías vacías.
- Widget `glitch`: query de posts publicados en categoría Glitch, tratado como serie editorial diferenciada.
- Widget `resources`: consume registro federado público verificado para Tools/Videos/Webinars/guías; no inventa URLs.
- Widget `feature-break`: destacado editorial query-driven con imagen responsive, overlay legible y fallback.
- Widget `newsletter`: form gobernado con confirmación server-side y tracking sin PII.
- CSS/JS page-scoped, nombres finales congelados en Discovery; no modificar globales Ohio para corregir una sola página.

### GVC scenario plan

- Targets: desktop 1440, laptop 1280, tablet 890 y mobile 390 px.
- Quality profile: `premium` con dossier, baseline decision y `scrollWidth === clientWidth`.
- Scenarios: first fold, latest, archivo page 1/page intermedia, filtro tipo, filtro tema, búsqueda con/sin resultados,
  Glitch, resources degradado, newsletter, footer y keyboard-only.
- Assertions de datos: títulos/URLs/fechas visibles coinciden con REST/readback WordPress; publicar un post fixture
  elegible cambia la query sin editar Elementor y retirarlo lo elimina.
- Performance: LCP asset identificado, imágenes con dimensiones/srcset, lazy-load bajo fold y cero JS pesado para listar.

### Design decision log

- 2026-08-31: se descarta adaptar Demo 35 como dirección del hub; la experiencia será propia.
- 2026-08-31: se conservan descansos editoriales full-bleed y banda de suscripción como patrones, no como template.
- 2026-08-31: archivo/paginación visibles son navegación primaria; búsqueda es complementaria.
- 2026-08-31: Elementor trae artículos reales desde WordPress; hardcodear cards viola el contrato.
- Pending: naming visible Think/Marketing con Manzanitas y fuente federada de recursos.

### Visual verification

- Comparar contra `/blog` actual y la copia Demo 35 sólo para demostrar mejora de navegación y ritmo.
- Revisar lectura real con títulos largos, imágenes ausentes, categorías múltiples, resources externos y archivo profundo.
- Validar foco, contraste, 200% zoom, reduced motion y controles táctiles antes de `UI ready: yes`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `standard` sobre integración read-only y configuración CMS gobernada.
- Source of truth: WordPress `post`/categorías para artículos; registro federado por decidir para recursos no-post.
- Writer: publicación editorial existente; esta task no crea un segundo writer de posts.
- Reader: queries WordPress server-side y reader/manifest público allowlisted para recursos.
- Consumers: widgets Elementor, archivo, búsqueda editorial, sitemap/enlazado y medición pública.

### Contract surface

- Artículo mínimo: `id`, `title`, `canonicalUrl`, `excerpt`, `featuredImage`, `publishedAt`, `updatedAt`, `topics`,
  `format`, `readingTime` y `status=publish`.
- Recurso mínimo: `stableId`, `type`, `title`, `canonicalUrl`, `summary`, `image`, `topics`, `publishedAt/updatedAt`,
  `owner`, `state`, `freshness` y `surface`.
- Query: tipo, tema, página, page size y orden allowlisted; respuesta estable con `items`, `total`, `page`, `pages`.
- Curaduría: IDs explícitos sólo para posiciones named; inválido/no publicado cae a query automática y deja señal.

### Data model and invariants

- No duplicar datos de posts en Elementor settings.
- Ningún draft/private/scheduled aparece públicamente.
- Un mismo canonical no se repite en dos módulos de la misma vista salvo intención editorial documentada.
- Los filtros no generan combinaciones indexables ilimitadas; SEO define canonical/noindex por patrón.
- Una categoría vacía no se presenta como destino principal.
- Recursos externos se omiten si falta canonical/owner/state verificable.

### Migration, backfill and rollout

- No migration de DB asumida. Discovery decide si el registro federado cabe en un contrato existente.
- Si se requiere CPT, schema, API o primitive reusable nueva, crear task `backend-data` dependiente antes de implementar.
- Backfill: inventario inicial de recursos con canonical y owner; sin inventario no se publica el bloque multiformato.
- Rollout: staging `251875` `noindex` -> QA/readbacks -> aprobación -> backup `/blog` -> cutover -> smoke/rollback window.

### Security and access

- Reader público allowlisted; no exponer drafts, emails, analytics internos, IDs sensibles ni provider credentials.
- Elementor editor/admin conserva permisos WordPress existentes; frontend no obtiene capacidad de escritura.
- Newsletter respeta consentimientos, privacidad, Turnstile/rate limit y receipt del sistema gobernado aplicable.

### Runtime evidence

- REST/WP readback de queries y términos, HTML público y canonical/pagination links.
- Fixture temporal/draft controlado para probar inclusión/exclusión sin publicar contenido ficticio.
- Readback del documento Elementor guardado por `Document::save` y hash posterior.
- GVC, axe, Lighthouse/CWV lab proporcional, Search Console/sitemap y GTM/GA4 sin PII.

### Acceptance criteria additions

- Los módulos de artículos cambian cuando cambia el conjunto publicado elegible sin editar el documento Elementor.
- La paginación funciona sin JavaScript y conserva URL/estado al refrescar o usar Back/Forward.
- El bloque multiformato sólo consume recursos con canonical, owner y estado verificables.

### Capability Definition of Done — Full API Parity gate

- No aplica como API de escritura: la task consume readers públicos y writers editoriales existentes.
- Si Discovery introduce un reader nuevo, debe tener contrato tipado, validación, errores, observabilidad, test y
  consumidor UI; Elementor no puede ser la única implementación de la lógica de negocio.

## Hybrid Execution Justification

- Why not split: la integración prevista es read-only y está inseparablemente ligada a la navegación/render de la
  home. No se introduce schema ni writer nuevo en el alcance base.
- Primary execution profile: `ui-ux`.
- Contract boundary: queries WordPress y registro público entregan DTOs; Elementor sólo compone/renderiza.
- Risk controls: architecture gate en Slice 1; si falta una capability reusable, se crea task backend dependiente
  y esta task queda bloqueada antes de ocultar lógica o datos manuales en widgets.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery, naming y content model

- Inventariar `/blog`, archivos, search, widgets, posts, tipos de recurso, canonicals, owners y métricas actuales.
- Resolver naming visible y documentar matriz `tipo × tema × superficie × canonical × source of truth`.
- Decidir `reuse | extend | new primitive` y separar task backend si aparece schema/reader reusable faltante.

### Slice 2 — Dirección visual y checkpoint funcional

- Profundizar visual direction/wireframe/flow con contenido real y prototipo del first fold + archivo.
- Obtener aprobación sobre jerarquía, ritmos, navegación y descansos full-bleed antes de construir toda la página.
- Completar implementation mapping, GVC plan y decision log; cambiar `UI ready` sólo con gates satisfechos.

### Slice 3 — Widgets Elementor query-driven

- Implementar módulos adaptables para hero/latest, archive/feed, topics, Glitch, resources, feature break y newsletter.
- Consultar posts reales publicados, deduplicar, aplicar fallback y renderizar paginación HTML sin JS obligatorio.
- Añadir tests de query/render, estados y editor sin tocar `_elementor_data` directamente.

### Slice 4 — Composición del hub y navegación

- Reconstruir page `251875` desde una estructura propia mediante `Document::save`, preservando `noindex`.
- Conectar navegación por formato/tema, archivo, search editorial, recursos federados y suscripción.
- Verificar desktop/mobile, teclado, URLs, canonicals, empty/error/degraded y rendimiento.

### Slice 5 — Cutover y cierre

- Capturar backup/hash de `/blog`, redirects/canonicals/sitemap y plan de rollback.
- Obtener aprobación explícita, ejecutar cutover gobernado, purgar caché y hacer readbacks live.
- Actualizar documentación, manuales y mirrors de skills; registrar pendientes separados sin presentar rollout como completo.

## Out of Scope

- Continuar reparando los quince widgets Demo 35 como solución final.
- Reescribir artículos, operar/publicar Glitch o migrar posts Gutenberg a Elementor.
- Crear un CMS paralelo, búsqueda semántica/IA, recomendador personalizado o streaming propio.
- Migrar `/blog` a Astro/headless sin decisión de route ownership y task propia.
- Publicar recursos externos sin canonical, owner o derechos verificables.

## Detailed Spec

La experiencia debe funcionar como hub incluso con JavaScript deshabilitado. La primera capa responde tres preguntas:
qué publica Efeonce, qué hay nuevo y cómo explorar. La segunda ofrece rutas por formato y tema. La tercera garantiza
profundidad histórica con Archivo, paginación y enlaces permanentes.

Los widgets no reciben arrays de cards completas. Reciben parámetros de query/curaduría (`type`, `topics`, `limit`,
`page`, `exclude`, `curatedId`) y construyen su salida desde la fuente canónica. Un `curatedId` inválido o no publicado
no vacía el módulo: registra la degradación y usa el siguiente resultado elegible. La paginación no puede depender de
AJAX; un enhancement `load more` sólo es válido si mantiene los enlaces y estados URL de la navegación base.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- No implementar widgets antes de cerrar la fuente de cada tipo ni componer toda la página antes del checkpoint visual.
- Ningún cutover ocurre antes de que queries, archive, search, GVC, SEO y rollback estén verificados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Hub visualmente atractivo pero estático | WordPress/Elementor | medium | tests fixture + readback que prueban query dinámica | post nuevo no aparece sin editar Elementor |
| Paginación pierde contenido o canonical | SEO/UI | medium | links server-rendered + crawl/sitemap/canonical QA | páginas huérfanas, duplicadas o sin next path |
| Recursos externos duplican canonical | Think/WP/SEO | medium | inventario federado y unique canonical gate | misma pieza indexada en dos hosts |
| Query pesada degrada LCP/TTFB | WordPress/Kinsta | medium | límites, cache, imagen responsive y profiling | TTFB/LCP fuera del budget |
| Cutover rompe `/blog` | WordPress/Kinsta | low | snapshot/hash, aprobación y rollback de página/ruta | 4xx/5xx, layout roto o pérdida de tráfico |

### Feature flags / cutover

- La page `251875` `noindex` funciona como staging y control de exposición.
- Sin flag adicional en V1; el cutover de `/blog` es la acción reversible gobernada y requiere aprobación explícita.

### Rollback plan per slice

- Slice 1/2: docs/prototipo sin runtime; revert de archivos focales.
- Slice 3: desactivar widgets nuevos o restaurar artefacto/plugin previo; posts y Gutenberg no cambian.
- Slice 4: restaurar snapshot/hash de `251875` mediante `Document::save` y purgar.
- Slice 5: devolver `/blog` a su documento/configuración anterior, restaurar canonicals/redirects si se tocaron y purgar.

### Production verification sequence

1. Verificar staging `251875`, `noindex`, query fixtures y readback Elementor.
2. Correr GVC 1440/1280/890/390, teclado, axe, links, search, archivo y performance.
3. Aprobar visual/naming/copy y capturar snapshot/hash live pre-cutover.
4. Aplicar cutover, purge y verificar HTTP, canonical, sitemap, analytics y cero overflow.
5. Repetir smoke tras ventana de caché y conservar rollback disponible.

### Out-of-band coordination required

- Aprobación del operador para naming visible, dirección visual y cutover.
- Owner editorial para curaduría y freshness de recursos.
- Owner Growth/CRM para formulario de suscripción y receipt.
- Search Console/analytics sólo como verificación; esta task no inventa acceso ni datos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como pruebo que termino y como cierro?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/blog` muestra una ruta visible a Archivo y permite llegar a contenido anterior en máximo dos decisiones.
- [ ] Archivo tiene paginación server-rendered con URLs estables, Anterior/Siguiente y números de página.
- [ ] Los widgets Elementor de artículos consultan `post_status=publish` y contenido real de WordPress.
- [ ] Publicar/retirar un post elegible actualiza el hub sin editar cards o títulos dentro de Elementor.
- [ ] Hero/destacados permiten curaduría explícita con fallback automático y deduplicación.
- [ ] Tipos de contenido y temas editoriales se presentan como ejes distintos.
- [ ] Artículos, Glitch, Tools, Videos y Webinars tienen rutas de descubrimiento; recursos futuros son extensibles.
- [ ] Cada recurso multiformato expuesto tiene canonical, owner, estado y source of truth verificables.
- [ ] Search editorial no ejecuta query vacía y no mezcla páginas/adjuntos/portfolio fuera del allowlist.
- [ ] Demo 35 `225984` permanece intacta y `251875` sigue `noindex` hasta el cutover aprobado.
- [ ] El documento Elementor se guarda sólo por `Document::save` con snapshot, hash, ownership guard y readback.
- [ ] Estados default/empty/error/degraded/long/mobile/pagination quedan implementados y probados.
- [ ] GVC premium pasa en 1440/1280/890/390, teclado y reduced motion, con `scrollWidth === clientWidth`.
- [ ] Imágenes tienen dimensiones/srcset, LCP definido y lazy-load bajo fold; no hay JS pesado para listar.
- [ ] SEO/AEO valida headings, links, canonicals, indexabilidad, pagination, schema aplicable y sitemap.
- [ ] Newsletter usa un form real gobernado con receipt; ningún CTA demo o `#` queda activo.
- [ ] Cutover de `/blog` tiene aprobación, backup, rollback y verificación live diferenciada de código/CMS save.
- [ ] Task, README, registry, docs/manuales y mirrors de skills quedan sincronizados al cierre.

## Verification

- `pnpm task:lint --task TASK-1802`
- Tests focales del plugin/renderer/query de Content Hub definidos en Discovery.
- Script page-scoped de verificación: REST/WP query ↔ HTML Elementor ↔ canonical/pagination.
- `pnpm fe:capture <scenario> --env=staging` con dossier premium y escenarios del contrato.
- Axe/teclado/zoom/reduced-motion y `scrollWidth === clientWidth` en los cuatro breakpoints.
- Lighthouse/CWV lab proporcional, HTML con JS deshabilitado, link crawl y sitemap/canonical readback.
- Smoke live posterior al cutover y repetición tras caché, sin confundir `200` con contenido correcto.
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental.

## Closing Protocol

- Mover la task a `in-progress` sólo después del plan aprobado y `pnpm codex:task-hook TASK-1802` con goal confirmado.
- Mantener `UI ready: no` hasta que naming, sources, mapping, GVC y decision log estén cerrados.
- Registrar por separado código, plugin/build, CMS save, publicación/cutover y verificación live.
- Al completar, mover a `docs/tasks/complete/`, actualizar lifecycle/README/registry y documentar riesgos residuales.
- No declarar complete si `/blog` no fue verificado live o si el bloque multiformato sigue usando placeholders.

## Follow-ups

- Task backend-data separada si Discovery exige CPT/schema/API/reader reusable nuevo para recursos federados.
- Evolución a Astro/headless sólo bajo route ownership y estrategia SEO aprobados.
- Recomendación personalizada o búsqueda semántica sólo después de medir uso del archivo/filtros/search básico.

## Open Questions

- `[verificar]` ¿El nombre principal será Think, Marketing con Manzanitas o una jerarquía explícita entre ambos?
- `[verificar]` ¿Qué sistema gobierna Tools, Videos, Webinars y guías, y quién responde por freshness?
- `[verificar]` ¿Qué form/lista/consentimiento recibe la suscripción del hub?
- `[verificar]` ¿El archivo vive dentro de `/blog` con query params, en `/blog/page/N/` o en una ruta dedicada?
