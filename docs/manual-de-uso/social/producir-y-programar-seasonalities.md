# Producir y programar una seasonality

Owner: Social Media Studio. Para operadores y agentes con un encargo creativo autorizado.
[Descripción funcional](../../documentation/social/produccion-seasonalities.md) ·
[Protocolo](../../operations/SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md) ·
[Caso detallado Fiestas Patrias](../../operations/social/2026-09-13-fiestas-patrias-production-method.md).

## 1. Recuperar el encargo

Leer conversación y archivos aceptados. Anotar marca, país, fecha, audiencia, concepto, red,
formato, copy literal, logo, música y versión aprobada. Recuperar decisiones antes de preguntar.
Usar las skills de Social, Design, Typography, Copy, Motion y Audio según el trabajo necesario.
Si el plugin Creative Production está disponible y fue solicitado, leer sus skills de intake/produce;
los módulos locales conservan el aprendizaje estable, no se editan los archivos del plugin en caché.

## 2. Preparar la escena y sus referencias

Separar referencias de forma cultural, materiales, iluminación y encuadre; registrar fuentes y
licencias cuando se reutilicen activos. Preparar contact sheet para comparar dirección y keyframe
limpio para generar movimiento. En una mesa gastronómica revisar anatomía del alimento, pliegues,
tostado, textura, bebida, vajilla, escala, profundidad y utilería. Decidir si 3D aporta control real.
Reservar zonas de lectura y firma desde la composición.

## 3. Componer texto y marca

Cargar fuentes y SVG oficiales del repo. Contrastar familia, peso y escala por función narrativa.
Medir cajas de tinta después de shaping, no sólo cajas de texto. Revisar tracking, leading,
márgenes ópticos, contraste sobre imagen y legibilidad pequeña por separado.
Mantener titular, logo, cursor/selección y plate en capas distintas.
Si una frase continúa en otra aparición, resolver su puntuación y continuidad; el saludo y la firma
se ubican según el storytelling. Una portada autónoma puede necesitar la frase completa.

Referencias: [dirección de arte](../../../.codex/skills/design-studio/references/premium-cultural-food-art-direction.md),
[tipografía](../../../.codex/skills/greenhouse-typography-accessibility/references/campaign-ink-metrics-and-hierarchy.md)
y [copy](../../../.codex/skills/copywriting/references/seasonal-storytelling-and-caption.md).
Claude usa los equivalentes del router local.

## 4. Producir y terminar el video

Elegir el motor por movimiento/control requerido y verificar su contrato actual. Conservar original,
modelo, job, referencia y gasto. Componer textos y logo exactos después. Sincronizar gesto y remate;
medir tiempos efectivos de lectura. Aplicar correcciones localizadas antes de decidir regenerar.
Preservar audio aprobado; comparar payload si se copia sin recodificar.

[Receta audiovisual con timeline, filtros y comandos](../../../.codex/skills/motion-design-studio/workflows/food-table-native-reel-and-exact-post.md)
y [continuidad musical](../../../.codex/skills/audio-studio/efeonce/APPROVED_MUSIC_CONTINUITY.md).

## 5. Adaptar y revisar

Reencuadrar sólo si conserva intención, sujetos y espacio de lectura. Si no, producir keyframe/toma
para el ratio destino y recomponer overlays. No presentar bandas, fondos extendidos o estiramientos
como una adaptación nativa. Diseñar portada propia sobre un fotograma limpio; guardar PNG master.
Inspeccionar lienzo y previews de recorte, sin asumir que todos los clientes de una red recortan igual.

Decodificar MP4 completo, comprobar duración/resolución/fps/códecs/audio, extraer muestras del export
y revisar transiciones y cierre. Escuchar cuando esté disponible; diferenciar escucha del usuario,
medición y revisión del agente. Los contact sheets no sustituyen revisión temporal completa.

## 6. Guardar el paquete final

Resolver la carpeta existente de Marketing/OneDrive. Conservar versiones y entregar videos,
portadas PNG, derivados de transporte si necesarios, captions y manifiesto de hashes/especificaciones.
Comparar archivos en destino. No afirmar sincronización remota ni permisos a partir de la copia local.
[Convención de entrega](../../../.codex/skills/social-media-studio/efeonce/ONEDRIVE_DELIVERY.md).

## 7. Programar con Metricool

1. Comprobar autorización de campaña/red/versión y resolver cuenta con getBrandSettings.
2. Usar zona IANA y offset de la fecha; consultar mejores horas por red, filtrar día y revisar cola.
3. Buscar duplicados reales por concepto/media/fecha. No confundir autolista o composer sin guardar con post.
4. Hospedar sólo entregables finales en el bucket de campañas existente, sin cambiar IAM; verificar HTTP y MIME.
5. Crear un post por red con copy exacto. El MP4 va en media; la portada en videoThumbnailUrl.
6. Mantener date externo con offset y publicationDate.dateTime local + timezone coherentes.
7. Configurar autoPublish/draft y tipo/feed/disclosure según contenido y contrato vigente.
8. Leer de nuevo por ID y comprobar copy, red, fecha/hora/zona, media, thumbnail, tipo y PENDING.
9. Ante respuesta incierta, consultar cola antes de reintentar. No crear duplicados por un timeout.
10. Guardar PROGRAMACION.md y evidencia saneada con IDs/enlaces. Reportar programado, no publicado.

[Payloads, errores de interpretación y checklist completo](../../../.codex/skills/social-media-studio/references/video-delivery-metricool.md).

## 8. Cierre y seguimiento

Entregar enlaces al planner, hora con zona, carpeta y estado real. La publicación efectiva requiere
readback posterior a la fecha; no se crea un monitor recurrente por inferencia. Si el encargo incluye
actualizar Notion, leer y escribir el par task/calendario correcto; la fecha de producción no sustituye
la fecha de publicación y el scheduler no modifica Notion automáticamente.
