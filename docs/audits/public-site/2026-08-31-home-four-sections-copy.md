# Home: revisión de cuatro secciones — 2026-08-31

Publicación solicitada por el operador: aplicar la propuesta aprobada de Reencuadre/Motor y mejorar
Servicios/Integraciones con copywriting. Página `251731`, `https://efeoncepro.com/`.
Voz institucional Efeonce, público de empresas medianas y grandes. Prioridad: explicar el trabajo,
reducir metáforas repetidas y sustituir promesas absolutas por descripciones concretas.

## Texto publicado

- **Reencuadre:** «Que cada campaña deje algo más que entregables.» Acento en «algo más que
  entregables». Bajada: «Creatividad, medios y tecnología comparten objetivos y aprendizajes.
  Lo que descubrimos en una campaña se usa para decidir la siguiente.» Se conserva «Un equipo.
  Una misma dirección.»; salen «partner de crecimiento», «software propio» y «visibilidad total».
- **Motor:** conserva «Cuatro capacidades. Un solo motor.»; etiqueta «Cómo trabajamos».
  La bajada explica la relación entre anuncios, creatividad, web, CRM y decisiones. Cuatro
  descripciones concretas reemplazan slogans; salen estado ficticio `4 / 4 sincronizados` y
  coletillas de hover. Centro «EFEONCE» y cierre «Lo que aprendemos en un canal mejora las
  decisiones en los demás». No se alteran el diagrama ni sus interacciones.
- **Servicios:** «De la estrategia a la ejecución.» Bajada: «Reunimos las especialidades que
  necesita tu plan: construir marca, generar demanda y conectar marketing con ventas.» Las doce
  tarjetas explican tareas y propósito. Se normalizan CRM y automatización, Ingeniería de datos,
  Analítica y medición, e Infraestructura y rendimiento. Cierre: «Definimos contigo el alcance,
  las prioridades y cómo mediremos el avance.» Se retiran absolutos como «al instante» y
  «sin puntos ciegos», además de la declaración de no recurrir a terceros.
- **Integraciones:** «Tus herramientas, trabajando juntas.» Bajada: «Diseñamos las conexiones
  que necesitas entre campañas, web y CRM para compartir información y reducir trabajo manual.»
  Categorías en español; marcas y logos preservados. Pie «Greenhouse · métricas y seguimiento».
  No se afirma que todas las plataformas escriben a una única base ni se agregan integraciones.

Copy completo y correspondencia de controles: `tmp/home-copy-20260831/changes.json`.
Snapshot durable también conserva el plan y cada valor anterior/posterior.

## Ejecución y recuperación

Sólo controles nativos de texto en cuatro widgets: `c711c04` (reframe), `321a4fa` (motor),
`2deaab2` (servicios), `da5b49d` (stack). Doce filas de servicios conservan `_id`, orden, categoría,
layout, media y enlaces; sus nombres editoriales se sincronizan con los títulos públicos.
72 asignaciones de texto, algunas conservan valores existentes. Sin cambios de runtime/schema/CSS/JS.

Preflight SSH PASS. Guard de identidad, permisos, ownership y hash; validación de tipos de controles
contra Elementor registrado, identidad de filas y count. `Document::save()` conserva settings.
Snapshot WordPress: `_gh_home_four_sections_copy_20260831_202607`.
Hash antes: `ce0dfc757a42043141e722c8fa3c100c00ec70e82556aa70c0d19888ce02c988`.
Hash después: `2e7d1fd5b144c2183806c19cd38b456589a55fed17060395377dae63dd54c02e`.
Purga Elementor y Kinsta completada.

Comparación completa del árbol guardado contra el árbol esperado: ningún cambio fuera del patch.
Metas Ohio, Yoast, thumbnail, settings, opciones de portada y hashes de páginas de referencia
sin cambios. Segundo readback independiente de los cuatro widgets coincide exactamente.
Hero aprobado/subrayado, CTA, cuatro enlaces de servicios, otras secciones y header/footer preservados.

Rollback requiere autorización y nuevo guard de drift. Recuperar sólo valores afectados desde
`elements`/`edits` del snapshot mediante `Document::save()`; no reescribir otros cambios posteriores.
No necesita restaurar archivos del plugin. Regenerar/purgar y verificar CMS y DOM públicos.

## Evidencia y límites

- Contrato Elementor live PASS: 17 widgets, cero HTML, 416 controles raíz, seis repeaters.
- Browser real: copy normal publicado y acentos verificados; capturas desktop 1280 y móvil 390 en
  `.captures/home-copy-20260831/`. Textos de tarjetas sin desbordes; overflow horizontal cero.
  Motor verificado también a 890 px: tarjetas y centro sin superposición, overflow cero;
  evidencia `tablet-motor.png`. Viewport restaurado, pestaña QA cerrada y pestaña del usuario recargada.
- Servicios: los selectores actualizan estado activo y conteos 12/6/6; cuatro enlaces preservados.
  El filtro existente atenúa en vez de ocultar tarjetas. Se observó que la opacidad inline de reveal
  puede prevalecer sobre la atenuación CSS; no se modifica ni se certifica ese comportamiento visual
  en esta revisión de copy. No se alteraron navegación, teclado, tracking ni formularios.
- QA CLI general revisa también WIP ajeno; sus sugerencias de schema/migraciones no pertenecen a
  este cambio de contenido. No se corren builds/migraciones ni se cambia ese WIP.
- No se certificó sesión autenticada de edición/guardado manual en Elementor. No se declara mejora
  de conversión medida ni cierre global de claims/Home/TASK-1358.
