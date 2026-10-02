# Handoff: compactación previa al release 2026-10-02

> No ejecutable. Estado actual en Handoff activo y en cada task, ADR o auditoría enlazada.

<!-- session-sha256:79c6ebc9e37bcc549ca90eba6bd456f2cf524472dbbe8c354e0cd4923ff202f9 -->
## 2026-10-02 — Entradas del 09–11/09 movidas desde Handoff activo

Movidas para devolver `Handoff.md` a su presupuesto de tokens antes del release develop→main del 2026-10-02. Texto sin cambios.

**Trendjacking «Nuestro Duo» (2026-09-11, operación):** pieza 4:5 + Short 9:16 (Seedance 2.5) programados vía
Metricool en la marca Efeonce Group: Threads 11-09 12:30 · Instagram 11-09 19:00 · LinkedIn página 12-09 11:00 · YouTube
Short 12-09 12:00 (todos `PENDING`; **falta confirmar publicación**). Skills `social-media-studio`, `copywriting`,
`greenhouse-ai-image-generator` y `motion-design-studio` actualizadas con los aprendizajes. Detalle e ids:
`docs/operations/social/2026-09-11-iphone-duo-trendjack.md`.

**Vacantes en LinkedIn (2026-09-11, operación):** 4 vacantes vivas programadas vía Metricool (perfil del operador +
página Efeonce, 11:00 Chile; **falta confirmar publicación**). Pendientes: ficha de `EO-OPN-0009` sin "caso ficticio" ·
Careers sin UTM por postulación. Detalle: `docs/operations/hiring/2026-09-11-linkedin-vacancy-distribution.md`.

**Performance & Commerce Distribution (2026-09-10, documental; `Proposed`, no autoriza venta):** ADR
`EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md` + ficha + Pricing Integrity Pack `hypothesis_only` + market
update 2026-09-10 + PDR-022 (spoke `/servicios/performance-marketing`). La capability tiene dos motions (Demand & Commerce ·
B2B Pipeline), los canales son cobertura y programmatic va vía partner con cláusula de transparencia. Niveles al piso de 45%:
USD 2.400 / 5.900 / 11.800 al mes. El costo del Performance Lead (USD 5.500) es hipótesis: el catálogo no tiene el rol.
Registry: diez relaciones nuevas `No iniciado`. Pendientes con dueño: retiro de `EFG-003` (asignado a Wave, bajo el
piso), costo del lead, overhead y piso (Finance) · posición sobre datos first-party bajo la Ley 21.719, vigente el
2026-12-01 (Legal) · verificar Google Partners y cerrar términos con Real Audiences, partner programático seleccionado por el CEO
(fees, cláusula de transparencia, brand safety, CTV, ABM y certificación de trader; Commercial) · G1: dos
Diagnostics pagados en 90 días, uno por motion · TASK ui-ux de la landing, sin crear. Sin runtime ni push.
Canales emergentes: ChatGPT Ads `selectivo` donde existe (LATAM: sólo BR/MX; Chile no), X Ads bajo pedido, Perplexity
`no disponible`. **Landing: `TASK-1865`** (to-do, ui-ux/flow, UI ready no; reservada como 1864 y renumerada porque la
tomó en paralelo la task del MCP autosuficiente) con wireframe, flow, motion, dirección "La señal" y brief SEO/AEO. La
legacy `/servicio-gestion-campanas-publicitarias/` (`242862`) muestra contadores en cero y un claim de Google/Meta
Partners no verificado en producción; el owner decidió no parcharla: la página se construye desde cero y la legacy sale
con 301. Investigación Semrush por país completada (keywords por país, title y FAQ en
`docs/audits/public-site/PERFORMANCE_LANDING_KEYWORD_RESEARCH_BY_COUNTRY_2026-09-11.md`).

**Product Design 360 (2026-09-10, modelado y canonizado; oferta `Proposed`, no autoriza venta):** business model
V1.1 + ficha `docs/services/wave/product-design-360.md` + ADR `EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md`: capability de
oficio con dos ofertas por comprador (producto → Product Design 360 · sitio público → Web Experience 360), siete lanes
con accesibilidad primero; se venden lanes, nunca horas ni pantallas. `creative-practice` corregido: Superside mínimo
USD 15.000/mes (decía ~5.000, error 3×). Landing `TASK-1859` creada (to-do, UI ready no; no se indexa hasta
`Commercially approved`). **Colisión de ID resuelta:** la landing de Trade Marketing & BTL, que usó `TASK-1859` en
paralelo, se registró como `TASK-1860` (`a2081e4f1`); `TASK-1859` es la landing de Product Design 360 y no
cambió. Pendientes con dueño: G1 demanda (Commercial) · D7 loaded cost chileno de un
senior product designer y piso de margen por lane (Finance) · IP del design system, datos de research y marco chileno
de accesibilidad (Legal) · nombre público D1 (Strategy) · Calculadora de Capacidad (wedge, sin task). **BP9** (Head of Design in-house) agregada a `13_icp` como persona
candidata: su plan de validación —≥ 5 conversaciones con Heads of Design— valida también el copy de la landing.


**Sistema de contenidos Notion (2026-09-10, mapeado / sin mutaciones):**
[mapa canónico](docs/operations/EFEONCE_CONTENT_SYSTEM_NOTION_MAP_V1.md) de Pilares JTBD + Content Hub +
Calendario + Wiki, con IDs y schema. Corrige `PDR-020` a rev 1.5: los Pilares JTBD son el eje temático
canónico y las franquicias son ortogonales; `LinkedIn Julio` es canal aparte. Tres fracturas medidas: dos bases de Calendario con schema idéntico (100 filas de histórico vs 66 a
futuro) que parten la evidencia de velocidad; **0 de 66 filas del calendario vigente declaran Pilar
JTBD**; y el Content Hub no tiene propiedad de destino Think/WordPress (`Enlace` en 5 de 41). Pendiente
del operador: autorizar los cambios propuestos, en orden — etiquetar Wiki, poblar Pilar JTBD, agregar
Destino, luego schema del calendario, y por último decidir el corte de calendarios (el único que puede
romper histórico). Nada escrito en Notion.

**Canales propios Efeonce (2026-09-10, decisión cerrada / ejecución no autorizada):** seasonalities conservadas
como línea propia de marca (rev 1.4): son temporadas con ventana por mercado, NO efemérides; hogar Instagram,
sends+saves, LinkedIn recibe argumento y no caption. Plan 2026–2027 sin cambios de alcance.
[PDR-020](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md) rev 1.2 — rol y catálogo por
canal, franquicias con canal-hogar, vocero Julio Reyes. Propagado a `TASK-1802`, `PDR-003/004/005/019`, roadmap,
context pack y diez archivos de skills espejados. Pendiente: 7 decisiones, entre ellas canonical de video (bloquea
TASK-1802 y YouTube) y el plan estacional 2026–2027. Nada producido ni publicado.

**Social Efeonce, 09/09:** [13 piezas y skills](docs/audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md).
Pendiente: conciliar MET-2339–2342 tarea/calendario. Producción abierta; cierre documental sin cambios Notion.
