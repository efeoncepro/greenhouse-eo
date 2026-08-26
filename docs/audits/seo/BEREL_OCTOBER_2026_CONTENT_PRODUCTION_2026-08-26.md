# Berel — Producción editorial de octubre 2026 — Auditoría 2026-08-26

## Estado y alcance

- Tipo: auditoría operativa de producción editorial, estructura Notion y QA SEO/AEO previo a CMS.
- Cliente: Berel (`berel.com`).
- Fecha de observación: 2026-08-26.
- Fuente de verdad viva: [proyecto `Produccion Creativa - Octubre 26`](https://app.notion.com/p/3c839c2fefe7813c9450e2f35cb4021e), sus relaciones en `Tareas` y las filas del Content Hub.
- Estado: producción editorial y handoff creativo **completos para revisión**; publicación CMS, producción de arte y programación social fuera de alcance.
- Convención: los conteos y propiedades son **OBSERVADOS** en una segunda lectura de Notion. El estado de las rutas públicas es una fotografía y debe revalidarse antes de publicar.

## Inventario verificado

El proyecto quedó `En curso` con ocho artículos `N35–N42`:

| Entregable | Cantidad | Fecha interna |
|---|---:|---|
| Tareas principales de artículo | 8 | 2026-10-07 |
| Tareas de banner | 32 | 2026-10-14 |
| Tareas de derivados sociales | 32 | 2026-10-16 |
| **Tareas relacionadas al proyecto** | **72** | — |
| Subítems sociales en Content Hub | 32 | 2026-10-16 |

La aritmética cumple el contrato `9A` tareas en proyecto y `4A` subítems sociales para `A = 8` artículos. La primera pasada produjo seis reescrituras `N35–N40`; la segunda normalizó los briefs y produjo los dos artículos nuevos `N41–N42`.

## Artículos nuevos cerrados para revisión

| Artículo | Evidencia editorial observada | Estado |
|---|---|---|
| [N41 — Comal, Itacate, Cazuela de Barro: la paleta de la mesa mexicana](https://app.notion.com/p/3c739c2fefe7816d981cd40ae33dd08a) | `Artículo V1`, ~1.684 palabras de cuerpo útil, 4 FAQ, metadatos, CTA, 4 callouts de banner y 8 destinos únicos de `berel.com` | `En revisión` |
| [N42 — Vinílica, acrílica o esmalte: qué pintura usar en cada superficie](https://app.notion.com/p/3a639c2fefe780929593e10838859013) | `Artículo V1`, ~1.751 palabras de cuerpo útil, 6 FAQ, matriz por superficie, metadatos, CTA, 4 callouts de banner y 14 destinos únicos de `berel.com` | `En revisión` |

Los conteos de palabras excluyen callouts de producción y son aproximados sobre el contenido guardado en Notion. Ambos títulos de fila se normalizaron al H1 final.

## Verificaciones de aceptación

- Las 18 filas nuevas de producción —2 principales, 8 banners y 8 sociales— conservaron proyecto, artículo, tarea padre cuando aplica, responsable, tipo, estado y fecha correctos.
- Cada artículo contiene cuatro especificaciones de imagen; ALT, archivo y posición se declaran dentro del artículo y se copian a la tarea correspondiente.
- Cada uno de los ocho derivados tiene un subítem en Content Hub. La segunda lectura comparó sus cuerpos y confirmó igualdad exacta tarea ↔ subítem.
- Los enlaces externos del cuerpo de ambos artículos apuntan únicamente a `berel.com`; no hay competidores ni URLs de búsqueda interna.
- La clasificación inicial de N42 se corrigió: `vinílica`, `acrílica` y `esmalte` no son necesariamente categorías excluyentes. La guía quedó ordenada por superficie, exposición, función y ficha específica.
- En N41 se retiraron claims no respaldados sobre Color del Año 2027, acabado, lavabilidad y comportamiento bajo luz.
- Una consulta final del proyecto devolvió exactamente 8 tareas al 7 de octubre, 32 al 14 y 32 al 16.

## Corrección de automatización

Después de la escritura, automatizaciones de Notion habían cambiado a `2026-09-04` las fechas de las 54 tareas de `N35–N40`. Se restauraron por la vía canónica: seis artículos al 7 de octubre, 24 banners al 14 y 24 sociales al 16. Una consulta fresca posterior confirmó el calendario completo de 72 tareas.

Esto confirma que una respuesta exitosa de creación no es evidencia suficiente: el cierre requiere primera lectura por nivel y segunda lectura del lote completo.

## Gate público pendiente

Las canónicas previstas:

- `https://berel.com/articulos/colores-para-sala-y-comedor`
- `https://berel.com/articulos/pintura-vinilica-acrilica-o-esmalte`

devolvían HTTP 200 con shell vacío, sin `title`, H1 ni cuerpo, igual que una ruta de control inexistente. Son **soft-404**, no artículos publicados. Hasta superar QA live en Drupal:

- no activar enlaces entrantes;
- no programar ni publicar derivados sociales;
- no declarar la pieza publicada;
- verificar `title`, H1, canonical, cuerpo, schema, responsive y destino real de CTA.

## Aprendizajes promovidos al playbook

La doctrina reusable quedó en la skill espejo `berel-content-production`:

- modalidad por contenido vivo, no por presencia de `Enlace` ni HTTP 200;
- canónica planificada permitida como metadata, pero bloqueada para distribución hasta QA;
- selección de pintura por superficie → exposición → función → ficha específica;
- segunda lectura obligatoria frente a automatizaciones de Notion;
- aceptación mecánica `9A` / `4A`;
- paridad exacta entre cuerpo de tarea social y subítem;
- relación inversa legítima de la tarea social con artículo padre y subítem.

## Límites

Esta auditoría no prueba publicación, indexación, producción de banners ni entrega en redes. Tampoco reemplaza la revisión humana de autoría ni la validación técnica final de producto. El estado de `berel.com` puede cambiar después de esta fecha y debe revalidarse en vivo.
