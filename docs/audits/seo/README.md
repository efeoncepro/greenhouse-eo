# SEO Audits

Numeración operativa de Berel: [mapa noviembre/diciembre 2026](BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Las auditorías anteriores conservan los números de su corte; el mapa resuelve la identidad por página.

Auditorías de búsqueda orgánica y AEO — de Efeonce y de clientes a los que Efeonce opera contenido.

## Regla de uso

- Toda cifra lleva declarada su naturaleza: **MEDIDO** (Search Console, o una consulta directa a la API de un
  proveedor con fecha y costo registrados), **ESTIMADO** (Semrush u otra fuente de terceros) u **OBSERVADO**
  (SERP en vivo o HTML del sitio, una foto de un momento). Cuando el research incluye fechas de mercado o
  afirmaciones de terceros, se agregan **INFERIDO** (deducción sobre lo observado) y **REPORTADO** (un tercero
  lo afirma y no se pudo verificar de primera fuente). Un dato REPORTADO o INFERIDO nunca se presenta como verificado.
- Estas auditorías documentan el estado de un sitio en una fecha. Los defectos de arquitectura caducan
  en cuanto el equipo dueño del sitio lo toca; las líneas base caducan con las semanas. Revalidar antes de consumir.
- El oficio vive en la skill `seo-aeo`; el proceso repetible en
  [`docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md);
  el uso comercial en la skill `seo-aeo-practice`. Estas auditorías son **evidencia de caso**, no doctrina.

## Auditorías

- [DataForSEO Improved ETV — impacto en Greenhouse SEO — 2026-09-01](2026-09-01-dataforseo-improved-etv-impact.md) —
  respuesta contractual incorporada el 2026-09-02: 14 familias ETV-capable, nueve callers, seis familias/siete
  caminos consumidores y corte irreversible 2026-11-01T00:00:00Z. Define foundation formula-aware, shadow,
  tratamiento histórico, cutover pre-corte y safe mode posterior.

- [Berel — producción editorial de noviembre y diciembre 2026 — 2026-08-26](BEREL_NOVEMBER_DECEMBER_2026_CONTENT_PRODUCTION_2026-08-26.md) —
  cierre observado de ocho reescrituras `N43–N50`: 72 tareas entre ambos proyectos, 32 subítems sociales y
  paridad exacta en los 32 pares tarea/subítem. Conserva gates de archivo y derechos para N48, tratamiento
  institucional no comercial para N49 y consolidación canónica para N50.

- [Berel — producción editorial de octubre 2026 — 2026-08-26](BEREL_OCTOBER_2026_CONTENT_PRODUCTION_2026-08-26.md) —
  auditoría de cierre del proyecto creativo en Notion: ocho artículos `N35–N42`, 72 tareas y 32 subítems sociales;
  documenta la corrección de 54 fechas alteradas por automatización, la producción completa de N41–N42 y el gate
  de soft-404 que impide activar enlaces, CMS y redes antes del QA público.

- [Berel — Color del Año 2027 "Bien y de Buenas": research, ángulo y plan de lanzamiento — 2026-08-25](BEREL_COLOR_DEL_ANO_2027_2026-08-25.md) —
  el mismo cliente, su **pieza-hito anual** (slot N28). El competidor más peligroso era una pieza propia de cinco semanas antes;
  una agencia de tendencias pre-emptó la tesis seis semanas antes; la categoría entera en México está vacía de contenido y el único
  competidor real muestra el color del año pasado. Berel tiene el mejor activo técnico de la categoría y **cero enlaces editoriales**
  (MEDIDO: 4 dominios vivos y basura, contra los 25 que estimaba Semrush) y **cero notas de prensa mexicanas fechadas** de su hito anual.
  Bloqueante con reloj propio: la URL destino ya devuelve HTTP 200 vacío. **Caduca por diseño** — el claim diferenciador muere cuando Comex publique.

- [Berel — arquitectura de autoridad del blog y plan editorial de octubre — 2026-08-25](BEREL_ARQUITECTURA_AUTORIDAD_2026-08-25.md) —
  el mismo cliente, la **segunda mitad de la sesión**: cómo está conectado (o no) el corpus y qué se planificó para octubre. El grafo medido con el filtro de chrome
  aplicado da **0,38 enlaces editoriales por artículo, 86% de las piezas sin entrante y 16–23% del enlazado hacia soft 404** — el conteo bruto mentía porque un destino
  está cableado en 113 de 113 páginas. Ese mismo destino es **la ficha del color del año, que tiene cero entrantes y cero salientes editoriales**: la entidad más valiosa
  de la marca es la pieza más aislada del sitio, y **las dos mejores piezas del ciclo creen estar enlazadas y no lo están**. Incluye el hueco de vocabulario medido
  (`ofrenda` 0 menciones en 113 artículos), el léxico propietario del catálogo, los entregables de octubre y **un riesgo de claim de salud en una página ya publicada**,
  que es lo único del documento que no espera calendario editorial. **Corrige §8.1 del research del color** y declara dos discrepancias de conteo sin resolver.

- [Berel — diagnóstico de búsqueda orgánica y arquitectura de contenido — 2026-08-25](BEREL_SEO_DIAGNOSTIC_2026-08-25.md) —
  cliente cuyo blog opera Efeonce. Tráfico ~90% de marca; un solo activo editorial sostiene 14 keywords no-marca
  en top 3; ausente del top 10 de los 7 espacios del hogar; 10 defectos de arquitectura verificados, el techo lo
  fijan el índice de blog inexistente y `/colores` rota. Incluye un hallazgo de operación de cuenta: la superficie
  de striking distance del portal (`/admin/growth/seo/keywords`, `TASK-1308`) está `complete` y nunca se corrió para este cliente.
