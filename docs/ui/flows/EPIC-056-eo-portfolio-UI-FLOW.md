# EPIC-056 — EO Portfolio: flujo maestro

> Flujo de programa de [EPIC-056](../../epics/to-do/EPIC-056-eo-portfolio.md). Lo usan `TASK-2046` (limpieza),
> `TASK-2047` (plugin y contenido), `TASK-2048` (portada y entrada) y `TASK-2049` (migración y salida).
>
> - Decisión: [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md).
> - Diseño: canvas «Portafolio Efeonce — concepto», página «EO Portfolio»,
>   [claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm](https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm).

## Flow Goal

Un solo modelo de proyecto (el documento de `TASK-2047`) y varias formas de mostrarlo: la portada, la entrada y el JSON
público. Que una persona que evalúa a Efeonce encuentre trabajo real con su contexto y llegue a conversar, y que el equipo
y los agentes publiquen proyectos sólo cuando el cliente los aprobó.

## Actors and Surfaces

| Actor | Superficie | Nodo |
|---|---|---|
| Visitante | Menú global, entrada «Portafolio» (EPIC-055) | A1 |
| Visitante | Home, CTA «Cases» («Del desafío al trabajo hecho.») | A2 |
| Visitante | Pie del sitio, «Casos de éxito» (nombre pendiente, PDR-028 pendiente 4) | A3 |
| Visitante | Búsqueda o enlace antiguo `/project/<slug>/` | A4 |
| Visitante | Portada `/portafolio/` | P1–P6 (`TASK-2048`) |
| Visitante | Entrada `/portafolio/<slug>/` | E1–E11 (`TASK-2048`) |
| Visitante | Caso completo en el blog (canónico, PDR-020) o experiencia del caso | C1 |
| Visitante | Agendador nativo del menú global | M1 |
| Editor (persona) | Admin del plugin `eo-portfolio` | W1 (`TASK-2047`) |
| Agente u operador | `wp eo-portfolio` (`export`, `validate`, `apply`, `publish`) por `pnpm public-website:wpcli` | W2 (`TASK-2047`) |
| Otro sitio (Think, Astro) | JSON público `GET /wp-json/eo/v1/portfolio` | W3 (`TASK-2047`) |
| Operador | Limpieza de los demos de Ohio | O1 (`TASK-2046`) |
| Operador | Migración, redirecciones y retiro de Ohio Portfolio | O2 (`TASK-2049`) |

## Happy Path

**Visitante**

1. **A1–A3 → P1.** Llega a `/portafolio/` desde el menú, la Home o el pie. Ve el hero con la lente sobre el proyecto
   destacado.
2. **P2.** Baja al índice «Proyectos con nombre y apellido». Filtra por línea (`?linea=brand`).
3. **P3 → P4.** Abre una fila: ve las piezas en su formato real y el resumen.
4. **P4 → E1.** Entra al proyecto. Lee la ficha, el reto, la idea, lo que pasó y las campañas.
5. **E8 → C1.** Si quiere el método completo, va al caso del blog.
6. **E9 → M1.** O agenda un diagnóstico sin salir de la página.
7. **E10 → E1.** O sigue al proyecto siguiente.

**Enlace antiguo**

1. **A4.** `/project/<slug>/` → 301 a `/portafolio/<slug>/` si el proyecto está publicado; si no, a `/portafolio/`. Las
   44 entradas demo responden 410 (`TASK-2046`).

**Editor y agente**

1. **W1 o W2 · Crear.** Se carga el documento del proyecto en borrador. La validación rechaza cifras sin fuente,
   imágenes sin `alt` y videos con voz sin subtítulos.
2. **Aprobar.** Se registra `clientApproval` con referencia, fecha y alcance (`logo`, `pieces`, `metrics`,
   `testimonial`).
3. **Publicar.** Sin aprobación el proyecto no se publica, por ninguna de las dos puertas. Al publicar, aparece en P2,
   en su entrada y en W3.
4. **Revisión de copy.** El texto del proyecto pasa por copywriting y UX writing antes de publicar (`TASK-2049`).

## Recovery Branches

| Situación | Qué pasa |
|---|---|
| Proyecto sin aprobación | Queda en borrador; su URL nueva responde 404 y la antigua redirige a la portada. |
| Aprobación sin alcance `metrics` | La entrada se publica sin cifras ni órbita de medida. |
| Aprobación sin alcance `logo` | El nombre del cliente va en texto; no aparece en «TRABAJAMOS CON». |
| Documento inválido | Se sirve la última versión válida; sin ella, el proyecto no se lista. |
| Interruptor del portafolio en `off` | Vuelve la página 247116; el contenido nuevo queda intacto. |
| JSON público consultado por un proyecto no publicado | No existe en la respuesta. |

## Focus and Navigation

- La entrada siempre ofrece tres salidas: caso completo, agendar y siguiente proyecto.
- El breadcrumb vuelve a la portada; el filtro de línea del breadcrumb vuelve a la portada filtrada.
- Ninguna superficie del programa abre ventanas nuevas salvo enlaces externos declarados.

## Editing Flow

| Paso | Puerta | Resultado |
|---|---|---|
| Exportar | W2 `export` | Documento JSON del proyecto, idéntico al guardado. |
| Validar | W1 al guardar / W2 `validate` | Lista de errores con la ruta del campo; no guarda. |
| Aplicar | W1 guardar / W2 `apply` | Foto previa y guardado todo-o-nada. |
| Publicar | W1 / W2 `publish` | Sólo con `clientApproval` válido. |

## Measurement

`gh_portfolio_filter`, `gh_portfolio_row_open`, `gh_portfolio_entry_view`, `gh_portfolio_video_play` y el evento del
agendador (`greenhouse_cta_*`) con `cta_location: portfolio` [verificar nombres con GTM].

## GVC Scenario Plan

- Escenario de programa: A1 → P2 filtrado → P4 → E1 → E9 (abre M1) y A4 (301) sobre `public-site-portfolio`.
- Viewports 1440×900 y 390×844.
- El detalle por superficie vive en el flujo de `TASK-2048` y el del admin en el de `TASK-2047`.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Un documento, tres puertas | Mismo patrón que la navegación global (PDR-027): personas, agentes y otros sitios leen lo mismo. |
| Aprobación del cliente en el sistema | PDR-020 la exigía como regla editorial; aquí falla cerrado. |
| El caso largo sigue en el blog | Evita contenido duplicado y respeta PDR-020. |
| 410 para los demos, 301 para lo real | Los demos no tienen valor que preservar; las entradas reales sí. |
