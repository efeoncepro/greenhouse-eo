# Glosario — Content Marketing Studio

Vocabulario del motor de contenidos. Definiciones operativas, no académicas.

## Estrategia editorial

- **Content-market fit** — cruce de lo que el negocio vende × lo que la audiencia busca × donde tienes autoridad real. Sin esto, el contenido no compite.
- **Pillar** — hogar canónico y durable de un territorio; define el mapa amplio y conecta satélites sin depender
  del feed cronológico ni de un post type concreto.
- **Cluster** — piezas satélite que cubren subtemas y enlazan al pillar; densifican el tema.
- **Topical authority** — autoridad temática ganada por cobertura profunda y estructurada de un tema (pillar+clusters).
- **JTBD (Jobs To Be Done)** — el trabajo/problema que la audiencia intenta resolver; el contenido responde a eso.
- **Nivel de consciencia** (Eugene Schwartz) — cuán consciente es la audiencia del problema/solución; calibra el ángulo. (Craft → `copywriting`.)
- **Evergreen** — contenido que no caduca; el activo que compone en el tiempo.

## Producción / ops

- **Brief** — el contrato de una pieza (objetivo, audiencia, formato, distribución, métrica). Nada se produce sin brief.
- **Content ops** — el sistema (workflow, roles, gobernanza, SLAs) que hace la producción repetible.
- **Gate de review** — el checkpoint de calidad (insight, voz, factcheck, brand safety, distribución) antes de publicar.
- **WIP limit** — límite de piezas en curso simultáneas para no ahogar el gate de calidad.
- **Lead time** — tiempo de producción de un formato; se planifica hacia atrás desde la fecha de publicación.

## Formatos

- **Lead magnet** — contenido de valor (ebook/checklist) intercambiado por un dato de contacto (gated).
- **Gated / ungated** — con/sin formulario de captura antes de acceder.
- **Case study** — prueba con nombre: contexto → problema → solución → resultados cuantificados → quote.
- **Data study** — research con dato propio; originalidad instantánea, munición para PR y GEO.
- **Pillar page** — término histórico para la página sede de un topic cluster; puede tomar forma 10X, resource o
  hub, pero no implica el post type `page` de WordPress.

## Content Engineering

- **Content Engineering** — disciplina de diseñar, construir y operar sistemas de conocimiento que personas y agentes puedan encontrar, comprender, verificar, explorar, reutilizar y convertir en decisiones. Canon: `references/content-engineering.md`.
- **Pillar Experience** — hogar canónico de un territorio que integra tres trabajos: aprender, explorar y decidir.
  Conserva documento completo y enlaces HTML aunque añada navegación, mapa de cluster o primitives interactivas.
- **Document Pillar** — corte válido de Pillar centrado en la guía canónica, TOC, evidencia y enlaces contextuales;
  puede evolucionar a Pillar Experience sin cambiar URL ni duplicar contenido.
- **Cluster Experience** — sistema navegable de experiencias conectadas que permite avanzar alrededor de un
  territorio mediante trabajos de aprendizaje, aplicación, evaluación, verificación y decisión.
- **Cluster node** — destino autónomo gobernado dentro de un cluster. Puede ser artículo, guía, caso, template,
  checklist, dataset, diagnóstico, calculadora o tool; pertenece por JTBD y relación, no por formato o keyword.
- **Cluster registry** — fuente estructurada de nodos, estados, URLs, intenciones y relaciones que alimenta mapa,
  validación, analytics y schema sin mantener cards manuales por renderer.
- **Experiencia de contenido** — representación editorial que ayuda a hacer un trabajo, no sólo a leer: puede explicar, comparar, diagnosticar o guiar una decisión.
- **Interfaz hacia el conocimiento** — artículo o superficie que conserva una fuente canónica legible y añade estructura, profundidad elegible o utilidad sin esconder el contenido.
- **Audiencia dual** — personas y agentes/motores consumen la misma verdad mediante interfaces distintas: experiencia humana y estructura computable.
- **Primitive de comprensión** — tabla, diagrama, disclosure, timeline o interacción cuyo trabajo es reducir carga cognitiva.
- **Primitive de decisión** — comparador, scorecard, calculadora o diagnóstico que devuelve una salida útil y explicable.
- **Progreso del usuario** — cambio observable en comprensión, confianza, decisión o acción; reemplaza a la pieza publicada como unidad primaria de valor.
- **Momento de conversión** — cambio observable entre estados de reconocimiento, comprensión, orientación,
  aplicación, diagnóstico, evidencia, decisión o handoff; no equivale automáticamente a clic, formulario o compra.

## Multiplicación / distribución

- **Repurposing / atomización** — convertir 1 pieza pilar en N átomos nativos por canal.
- **Átomo** — pieza derivada del pilar, nativa de un canal, con un insight.
- **Linaje** — la traza de qué pillar/tema originó un átomo (para medir por tema).
- **POE (Paid / Owned / Earned)** — los tres tipos de canal de distribución.
- **Digital PR** — ganar menciones/backlinks pitcheando contenido (ej. data studies) a medios/creators.
- **Content syndication** — republicar contenido en plataformas de terceros para alcance/leads.
- **Create once, distribute forever** — doctrina: cada activo es una cantera, no una publicación única.

## Descubribilidad (táctica → `seo-aeo`)

- **GEO / AEO** — optimización para motores generativos/de respuesta (que la IA cite tu contenido).
- **Citabilidad** — cualidad de un contenido de ser citado por IA/medios (answer-first, datos, fuentes).
- **Answer-first** — estructura que responde la pregunta arriba, autocontenida, para ser extraída/citada.

## Medición (atribución → `growth-marketing-cro` + `gtm-ga4`)

- **Leading metrics** — señales tempranas de actividad/engagement (tráfico, shares, suscriptores).
- **Lagging metrics** — resultado de negocio (leads, influenced pipeline, revenue, retención).
- **Influenced pipeline** — % de pipeline/revenue que tocó al menos una pieza de contenido. La métrica que justifica el motor.
- **First-touch / multi-touch** — modelos de atribución (qué trajo vs qué influyó).
- **Vanity metric** — métrica que se ve bien pero no conecta a negocio (likes sin conversión).

## IA

- **AI slop** — contenido IA genérico, sin ángulo ni voz; el antipatrón central.
- **Fidelidad de voz** — que el output IA suene a la marca, no a "IA de nadie".
- **Content Factory** — el motor de producción/publicación de Efeonce (`src/lib/public-site/content-factory/`); se opera vía `efeonce-public-site-wordpress`.
- **Media Foundry** — primitive provider-neutral de generación de media (imagen/video/audio).
