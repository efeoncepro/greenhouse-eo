# Home — Reencuadre y comparación · 2026-08-31

## Alcance y estado

Aplicado y verificado en https://efeoncepro.com/, post `251731`. Pedido del operador:
recuperar fuerza en Reencuadre y revisar toda la comparación con copywriting.
Skills empleadas en esta secuencia: copywriting/voz Efeonce, agencia, WordPress público y QA de navegador.
Se preservan el hero aprobado, otras secciones, medios, URLs, SEO, ajustes de página y páginas de referencia.

## Decisiones editoriales

- Reencuadre: **Tu equipo necesita un aliado. No otro proveedor que coordinar.**
  Apoyo: «Reunimos creatividad, medios y tecnología en un mismo plan. Tu equipo participa en las
  decisiones; nosotros coordinamos la ejecución.» Mantiene el eyebrow y el énfasis teal.
- Comparación: **No compares solo servicios. Compara cómo se trabaja.**
  Apoyo: «Quién ejecuta importa. Quién conecta el trabajo, también. Revisa qué implica cada modelo
  para tu equipo.»
- Se comparan agencia especializada, freelancers, equipo interno y Efeonce mediante alcance,
  coordinación, especialistas, seguimiento, herramientas y ajustes al plan.
- Eliminados del render los scores 42/8/33/100, barras, cruces/checks y la superioridad por software
  propio. No había evidencia para las afirmaciones absolutas sobre competidores.
- Greenhouse se explica como seguimiento de proyectos y métricas. La nota explicita que es una
  comparación orientativa y que capacidades/responsabilidades dependen del acuerdo.

## Fuente, cambio y recuperación

Runtime existente: `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`.
Dos archivos publicados: `includes/agency/schemas/comparison.json` y `includes/agency/templates/comparison.html`.
56 controles raíz de comparación: 24 celdas cualitativas nativas y nota/etiqueta accesible;
se retiran controles de puntuación. Los valores antiguos persistidos no se renderizan ni se borran.
Total: 17 widgets semánticos, cero HTML, 408 controles raíz y seis repeaters.

- Runtime anterior: `/tmp/eo-agency-before-20260831-203940.tar`.
- Ajuste posterior de ancho mínimo 880 → 760 px: `/tmp/eo-agency-before-20260831-204058.tar`.
- Snapshot CMS: `_gh_home_reframe_comparison_20260831_203947`.
- Hash anterior: `784aa73f40513012bbfd935b1f1985d61e7b4edea9d5d9fd15ae7f8cc3cbe0b0`.
- Hash nuevo: `df8b731b81c0495dfddac27e2b02c68faac3c47ff238fbb53b8be34bceeddb4f`.

Guardas: frontend ID/estado/owner, hashes de ambos archivos y documento, permisos, controles nativos,
48 asignaciones en dos widgets exactos. Escritura por `Document::save(elements, settings)` y readback
completo del árbol. Metas Yoast, opciones, template, thumbnail y siete páginas de referencia intactos.
Purga Elementor/Kinsta. No commit, push, branch ni cambios al WIP ajeno.

Para recuperación autorizada: verificar drift, restaurar los dos archivos del primer tar y los dos
widgets desde el snapshot mediante Document::save, preservando cambios posteriores ajenos; purgar y
verificar frontend. El segundo tar sólo revierte el ajuste de ancho, no toda la revisión.

## Verificación

- PHP renderer: PASS, 17 módulos, 301 verificaciones de edición/escape; controles de celda legibles,
  caption y región enfocable. Se sustituyó una aserción obsoleta de copy literal por semántica renderizada.
- Lifecycle existente: PASS. Sin modificaciones a ese script (WIP de otro trabajo).
- Contrato vivo Elementor: PASS, `failures=[]`; readback exacto de 48 textos.
- Navegador real: desktop 1280, ventana 878 y móvil 390. Documento sin overflow horizontal.
  Tabla final en 878: `clientWidth=scrollWidth=788`; móvil: región 348 / tabla 760.
- Desplazamiento horizontal por gesto confirmado en móvil hasta `scrollLeft=412`, mostrando Efeonce.
  Foco de región y anillo visibles. La simulación de flechas no produjo desplazamiento: no se certifica
  aquí el desplazamiento por teclado, aunque la región nativa es enfocable.
- Evidencia: `.captures/home-comparison-20260831/`; planes, backups locales y logs en
  `tmp/home-comparison-20260831/`. Guardado/reapertura en UI autenticada del editor no probado.
- Las afirmaciones de otras secciones no forman parte de esta revisión ni quedan validadas por ella.
