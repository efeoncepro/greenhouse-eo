# Superficies misceláneas del sitio público

> Estado: contrato funcional propuesto; runtime sin cambios.
>
> Contrato técnico: [`PUBLIC_MISCELLANEOUS_SURFACES_V1.md`](../../architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md)
>
> Manual: [`operar-paginas-miscelaneas.md`](../../manual-de-uso/public-site/operar-paginas-miscelaneas.md)

## Qué son

Son experiencias que WordPress construye desde el contexto de la URL y no desde una página normal editable:

- contenido no encontrado;
- búsqueda con o sin resultados;
- categorías, tags, autores, fechas y otras taxonomías;
- estados vacíos dentro de esas superficies.

Comparten lenguaje visual y rutas de recuperación, pero no el mismo status HTTP ni la misma decisión SEO.

## Cómo deben organizarse

### Recovery Shell

Ayuda a una persona cuando no puede continuar. Debe explicar el estado en español, conservar el sitio reconocible
y ofrecer una recuperación real:

- volver al inicio;
- buscar con un término válido;
- ir a servicios o recursos;
- contactar cuando la intención no se puede inferir.

La búsqueda no debe ser la única salida mientras su índice mezcle contenido comercial, editorial y técnico sin
policy explícita.

### Search Experience

La búsqueda responde una intención, no actúa como inventario de todo lo publicado. Debe distinguir:

- **búsqueda global:** páginas comerciales y artículos permitidos;
- **búsqueda editorial:** artículos del Content Hub y taxonomías gobernadas.

El resultado visible incluye término, cantidad, resultado/empty state, filtros permitidos y paginación. Una consulta
vacía no debe listar todo el sitio.

### Editorial Archives

Una categoría o autor indexable es una superficie editorial y de adquisición. Debe mostrar contexto visible,
navegación, metadata y enlaces internos coherentes. Tags y fechas noindex pueden usar una variante más compacta.
Un archivo vacío explica que no hay contenido en esa colección; no habla de “search terms”.

### Global Chrome

Footer, redes, datos institucionales y sidebar son compartidos. Si tienen enlaces demo, datos antiguos o destinos
rotos, se corrigen como sistema global y no como personalización de la 404.

## Estados y comportamiento

| Estado | Lo que ve la persona | Contrato técnico |
| --- | --- | --- |
| URL inexistente | Explicación + recuperación | HTTP `404`; `noindex`; sin canonical inventada |
| Search sin resultados | Término, cero resultados, sugerencias | HTTP `200`; `noindex`; SearchResultsPage cuando aplique |
| Search con resultados | Conteo + resultados intencionales | HTTP `200`; `noindex`; paginación accesible |
| Categoría/autor indexable | Introducción + colección + enlaces | canonical/schema/robots propios |
| Tag/fecha noindex | colección compacta | noindex, sin promoverla como landing |
| Taxonomía vacía | contexto de la colección + recuperación | no reutiliza copy de búsqueda |
| Paginación imposible | contenido no encontrado | HTTP `404` |

## Contenido editable

El equipo editorial puede editar copy, ilustración y enlaces destacados mediante opciones o menús gobernados. El
layout, landmarks, status, robots, canonical, fallback y tipos de búsqueda siguen versionados. Una ausencia de
configuración nunca deja la página en blanco: se usan defaults seguros.

## Accesibilidad esperada

- Un `<main id="main">` alcanzable desde skip link.
- Un H1 que describa el estado sin jerga técnica innecesaria.
- Formularios con label/nombre accesible, no solo placeholder.
- Foco visible y orden de teclado lógico.
- Iconos con nombre o correctamente decorativos.
- Enlaces de recuperación con destino real.
- Español neutro consistente.
- Sin overflow del documento en 390 px.

## Medición

La medición sirve para diagnosticar rutas rotas y calidad de recuperación:

- page type/outcome;
- búsqueda con resultado o vacía;
- cantidad de resultados;
- destino de recuperación seleccionado.

No se trata como conversión. El término crudo no se duplica en eventos custom y cualquier URL/referrer se sanea
antes de enviarse.

## Límites

- Un 403, 500 o mantenimiento de Kinsta/Cloudflare no es una 404 WordPress.
- Feeds, sitemap, robots y endpoints no reciben este shell visual.
- Un redirect o retiro de contenido requiere decisión SEO propia.
- `/blog/` sigue siendo una página Elementor normal mientras `page_for_posts=0`; no es un archivo Ohio.
- Esta documentación no prueba implementación, publicación ni limpieza del footer/sidebar.

## Estado observado al 2026-08-31

El runtime todavía usa el fallback Ohio, copy mixto en inglés, búsqueda sin política de tipos y chrome global con
residuos demo. Ver la
[auditoría fechada](../../audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md) para evidencia
y prioridades.
