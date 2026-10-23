# TASK-2048 — EO Portfolio: flujo de la portada y la entrada

> Nodo del flujo maestro [`EPIC-056-eo-portfolio-UI-FLOW.md`](EPIC-056-eo-portfolio-UI-FLOW.md). Esta task lleva los
> nodos **P1 a P6** (portada) y **E1 a E11** (entrada) a `efeoncepro.com`. Agrega lo que el documento de `TASK-2047` no
> puede saber: cómo se pinta, cómo se navega, cómo se comporta el video y cómo se vuelve a la página anterior.
>
> Diseño: canvas [claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm](https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm),
> página «EO Portfolio». Wireframe: [`TASK-2048-eo-portfolio-index-entry.md`](../wireframes/TASK-2048-eo-portfolio-index-entry.md).

## Flow Goal

Que una persona que evalúa a Efeonce encuentre un proyecto parecido al suyo, entienda en segundos para quién se hizo y
qué pasó, vea las piezas en movimiento y en su formato, y llegue a agendar un diagnóstico o a leer el caso completo.

## Flujo de la portada

1. **Request.** `GET /portafolio/` (con o sin `?linea=`). Si `eo_portfolio_enabled` está en `off`, se sirve la página
   247116 de Elementor y termina el flujo.
2. **Lectura.** El servicio de `TASK-2047` entrega los proyectos publicados con su alcance de aprobación aplicado. Si
   `?linea=` trae un valor fuera del enum, se ignora y se muestran todos.
3. **P1 · Hero.** Se elige el proyecto destacado (`hero.featuredProject`, o el más reciente con video). Si ninguno tiene
   video, el hero va sin lente y sin video de fondo.
4. **P2 · Índice.** Lista numerada, filtrada en el servidor según `?linea=`. Cada filtro es un enlace; el activo lleva
   `aria-current="page"`.
5. **P3 → P4 · Abrir fila.** Botón de la fila con `aria-expanded`: muestra la galería justificada, el resumen y el CTA.
   En escritorio también se abre al pasar el cursor; en tacto y teclado, sólo con el botón. Una fila abierta a la vez.
6. **P4 → Entrada.** «Ver el proyecto →» navega a `/portafolio/<slug>/`. Si el proyecto no tiene piezas, el CTA es «Leer
   el caso en el blog →» y lleva a `links.blogCase`.
7. **P5 · Cierre.** «Agenda tu diagnóstico» abre el agendador nativo del menú global sin salir de la página.
8. **P6 · Medición.** `gh_portfolio_filter`, `gh_portfolio_row_open` y `gh_portfolio_video_play` al `dataLayer`
   [verificar nombres].

## Flujo de la entrada

1. **Request.** `GET /portafolio/<slug>/`. Proyecto no publicado o sin aprobación → 404 del sitio.
2. **E1–E2 · Apertura.** Composición de formatos y banda del spot. «Ver con sonido» activa el audio en el mismo
   reproductor, sin abrir otra ventana.
3. **E3–E8 · Lectura.** Cada sección se pinta sólo si tiene dato y alcance. La órbita de medida aparece sólo con una cifra
   `percent` con fuente.
4. **E8 → Caso completo.** «EL CASO COMPLETO» lleva al blog (canónico, PDR-020) o a la experiencia publicada del caso.
5. **E9 · Cierre de voz.** «Agenda tu diagnóstico» abre el agendador del menú global.
6. **E10 · Siguiente proyecto.** Enlace al proyecto siguiente en orden editorial; el último enlaza al primero.

## Comportamiento del video

1. Al cargar, cada video muestra su póster. `preload="none"`.
2. Si no hay `prefers-reduced-motion: reduce`, los videos marcados como ambiente (`autoplay`, siempre sin sonido) se
   reproducen cuando entran en pantalla (IntersectionObserver, umbral 50 %) y se pausan al salir.
3. Todo video que se reproduce solo tiene un botón visible de pausa; la pausa del visitante se respeta aunque el video
   vuelva a entrar en pantalla.
4. Con «reducir movimiento», ningún video arranca solo: queda el póster con «Reproducir video».
5. En la lente de la portada, bajo 760 px de ancho la ventana muestra el póster.

## Recovery Branches

| Situación | Qué pasa |
|---|---|
| Interruptor en `off` | `/portafolio/` sirve la página 247116; las entradas nuevas siguen en su URL pero no se enlazan. |
| `?linea=` sin proyectos | «No hay proyectos de esta línea todavía.» + «Ver todos». |
| Documento inválido | Última versión válida; sin ella, el proyecto no se lista y su URL responde 404. |
| Video que no carga | Queda el póster; el resto de la página no cambia. |
| JavaScript bloqueado | Filtros como enlaces, filas abiertas por defecto [verificar: `details` nativo o todas abiertas sin JS], videos con controles nativos y sin autoplay. |
| URL antigua `/project/<slug>/` | 301 a la entrada nueva si está publicada; si no, a `/portafolio/` (`TASK-2049`). |

## Focus and Navigation

- Tab recorre: menú global → CTA del hero → filtros → botones de fila → controles del panel abierto → cierre.
- Escape en una fila abierta la cierra y devuelve el foco a su botón.
- Tras aplicar un filtro (navegación), el foco inicial queda en el H2 del índice con `tabindex="-1"` y ancla `#indice`.
- En la entrada, «Ver con sonido» y la pausa son botones del reproductor con nombre accesible.
- El enlace del siguiente proyecto nombra el proyecto completo, no sólo «Siguiente».

## GVC Scenario Plan

- **Superficie:** `public-site-portfolio`.
- **Viewports:** 1440×900, 1280×800 y 390×844.
- **Pasos:** portada arriba → filtrar Brand → abrir una fila con Enter → Escape → abrir con el cursor → entrar a Sky →
  pausar el spot con teclado → «Ver con sonido» → siguiente proyecto → entrada mínima (PabellonToGo) → entrada sólo
  texto (ANAM) → interruptor en `off`.
- **Verificaciones:** filtros y filas presentes con `curl` sin JS; foco restaurado tras Escape; videos en pausa fuera de
  pantalla; ningún autoplay con «reducir movimiento»; sin scroll horizontal de página.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Filtro en el servidor por `?linea=` | Rastreable, compartible y funciona sin JavaScript. |
| Una fila abierta a la vez | Mantiene el índice legible y un solo video corriendo en el panel. |
| Abrir con el cursor sólo en escritorio | En tacto no existe el hover; el botón es el camino universal. |
| CTA al blog cuando no hay piezas | ANAM y otros casos de datos no tienen piezas visuales; el caso largo es canónico en el blog. |
| La pausa del visitante se respeta | Reanudar solo un video que la persona pausó contradice su decisión. |
