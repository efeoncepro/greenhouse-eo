# TASK-2047 — Admin «Portafolio» (wireframe)

> Pantalla del admin de WordPress para editar un proyecto del portafolio (`eo_project`) con la estructura de su
> documento `portfolio-entry.v1`. Es un cliente delgado del servicio `EOP_Store`, el mismo que usa
> `wp eo-portfolio`. Decisión rectora:
> [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) §2 y §3.
>
> - Flujo de edición: [`TASK-2047-eo-portfolio-editing-flow.md`](../flows/TASK-2047-eo-portfolio-editing-flow.md).
> - Flujo maestro del programa: `docs/ui/flows/EPIC-056-eo-portfolio-UI-FLOW.md` [verificar nombre final].
> - **Dirección visual aprobada por el operador (2026-10-29) y construida (runtime 3ab38ad):** WordPress nativo, como la pantalla de ajustes
>   de `eo-headless-content` (único precedente de admin propio del runtime): barra y menú del admin, cajas, botones y
>   campos del editor de entradas, tipografía del sistema. La marca sólo colorea la línea de servicio; lo que el alcance
>   oculta se marca con «No se mostrará» como estado, no como color. Canvas «Admin del Portafolio»
>   ([claude.ai/artifact/7cLqYYXWkE3pJQVhBKP3DW](https://claude.ai/artifact/7cLqYYXWkE3pJQVhBKP3DW)): listado, edición
>   con errores, capítulos y piezas, y publicado con alcance parcial y restaurar. `UI ready: yes`.
> - El canvas del portafolio público
>   ([claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm](https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm)) diseña la portada y
>   la entrada, no esta pantalla.

- Visual direction mode: source-led
- Product Design asset: docs/ui/designs/TASK-2047-eo-portfolio-admin/Main.dc.html (copia versionada del canvas aprobado; también `Lista`, `Piezas` y `Publicado`)

## Product contract

- **Para quién:** una persona del equipo de marketing o cuentas con `eo_manage_portfolio`, no técnica. Publica quien
  tenga `eo_publish_portfolio`.
- **Qué resuelve:** cargar un proyecto con su contexto real (para quién, reto, idea, ejecución, resultados con fuente,
  piezas por capítulo), saber qué falta para publicarlo y no poder publicarlo sin la aprobación del cliente.
- **Qué no hace:** no diseña la entrada pública, no sube video al bucket (sólo pega la URL y valida dimensiones), no edita
  la portada.
- **Regla visible:** lo que el alcance de la aprobación no cubre se marca como «No se mostrará» en su sección, para que
  quien edita entienda por qué una cifra o un logo no aparecerán.

## Layout

Escritorio (1280–1440). Dos columnas: editor a la izquierda (≈ 70 %) y panel lateral fijo a la derecha (≈ 30 %).

```
┌───────────────────────────────────────────────┬──────────────────────────────┐
│ ← Portafolio   Sky Airline · Un año de…   [Borrador] │ ESTADO                        │
│ Resumen de errores (si hay) con enlaces           │ Borrador · revisión 3          │
├───────────────────────────────────────────────┤ Último cambio: Ana, 23-10      │
│ ▸ Cliente y contexto                          │ [Guardar]  (mensaje del cambio) │
│   Cliente · Industria · Logo (biblioteca)     ├──────────────────────────────┤
│   Título · Para quién · Qué necesitaba        │ APROBACIÓN DEL CLIENTE         │
│   Línea (Growth|Brand|Engine|Voice|Revenue)   │ Referencia · Fecha             │
│   Servicios · Periodo · Mercados              │ Alcance: ☐ Logo ☐ Piezas        │
│ ▸ Reto, idea y ejecución (3 bloques título+texto)│        ☐ Cifras ☐ Testimonio │
│ ▸ Resultados (lista: valor · etiqueta · tipo · fuente)│ Falta para publicar:     │
│ ▸ Capítulos y piezas                          │ · Aprobación sin alcance       │
│   Capítulo: nombre · nota                     │ · 1 video sin subtítulos       │
│   Pieza: imagen (biblioteca) | video (URL)    │ [Publicar] (deshabilitado)     │
│     alt · leyenda · dimensiones · formato calculado ├──────────────────────────────┤
│     póster · subtítulos · foco                │ HISTORIAL                       │
│   Pieza destacada de la portada y foco de la lente│ r3 Ana · «Agrega Cyber Sky» │
│ ▸ Testimonio y equipo                         │ r2 Agente · «apply inicial»    │
│ ▸ Enlaces (caso del blog, servicios)          │ [Ver] [Restaurar]              │
│ ▸ SEO (título, descripción, imagen OG)        │                              │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

- **Secciones colapsables** con contador de errores en su encabezado («Resultados · 1 error»).
- **Pieza de video:** el campo de URL acepta sólo el bucket público de AXIS (`portfolio/v<N>/<slug>/`); al pegarla, el
  admin lee las dimensiones reales del archivo y muestra el formato calculado («16:9»). Si la URL no responde o no hay
  dimensiones, la pieza queda en estado de error.
- **Formato calculado, no editable:** se muestra como chip junto a la miniatura; quien edita no puede escribirlo.
- **Panel lateral:** siempre visible; «Falta para publicar» lista las reglas del validador que impiden publicar, cada
  una con enlace al campo.

## Desktop Target

1440 × 900 (verificado también a 1280): menú del admin de WordPress, editor a la izquierda (`flex: 999 1 560px`) y panel
lateral fijo de 300–360 px con Estado, Aprobación del cliente, Falta para publicar e Historial. Secciones colapsables;
abiertas por defecto «Cliente y contexto» y toda sección con errores. Referencia: `Main.dc.html` y `Publicado.dc.html`.

## Mobile Target

390 × 844 (verificado a 375): no es objetivo de trabajo, pero nada se corta: el panel lateral pasa debajo del editor, las
grillas de dos columnas y la fila de resultados se apilan en una columna, la tabla del listado hace scroll dentro de su
caja y la página no tiene scroll horizontal (medido: `scrollWidth` 353 en 375).

## Action Hierarchy

1. **Guardar** (primario, panel Estado): guarda una revisión con el mensaje del cambio; nunca publica.
2. **Publicar** (primario, panel Falta para publicar): sólo con la revisión guardada lista; deshabilitado con la razón.
3. **Despublicar** (secundario de peligro, sólo en publicados): saca del sitio y conserva contenido e historial.
4. **Restaurar** (en Historial, confirmación en línea con motivo): crea una revisión nueva.
5. Acciones de contenido (agregar resultado, capítulo, imagen, video, persona; quitar): botones secundarios o enlaces.

## Visual Fidelity Mapping

| Canvas | Implementación |
|---|---|
| Barra y menú del admin | Los nativos de WordPress (no se dibujan) |
| Cajas, títulos de sección, campos y botones | `.eop-box`, `.eop-toggle`, `.eop-in`, `.button` / `.button-primary` nativos |
| Píldoras de línea con color sólo en la elegida | `.eop-pill` + `.eop-line-<línea>:has(input:checked)` |
| Chip de formato oscuro «Video · 16:9 · 1156 × 650» | `.eop-format`, calculado de las dimensiones reales |
| «No se mostrará» punteado | `.eop-hidden-note` |
| Resumen de errores y aviso de guardado sin borde lateral | `.eop-notice-error` / `.eop-notice-ok` con borde completo |
| Órbita de medida «88 %» | `.eop-measure` con el primer porcentaje |
| Confirmación de restaurar en línea | `<details class="eop-restore">` con formulario propio por revisión |

## State Copy

| Estado | Copy visible | Salida |
|---|---|---|
| ready | «Listo para publicar» · «Publica la revisión guardada.» | Publicar |
| loading | El botón enviado queda en espera del navegador; el aviso llega tras la recarga («Guardado como revisión N.») | Esperar la recarga |
| empty | «Todavía no hay proyectos. Crea el primero.» · proyecto nuevo: «Borrador · sin guardar» | «Agregar proyecto» |
| partial | «No se mostrará: la aprobación no incluye cifras.» · «No pudimos leer este video. Revisa la URL del bucket.» | Ampliar la aprobación o corregir la URL |
| error | «No guardamos: hay N errores.» con enlace a cada campo; conflicto: «Alguien guardó la revisión N mientras editabas. Revisa sus cambios antes de guardar.» | Corregir y guardar; «Abrir la vigente para editar sobre ella» |
| denied | Sin `eo_publish_portfolio`: «Publica una persona con permiso de publicación.» (no hay botón); sin `eo_manage_portfolio` el menú no aparece | Pedir el permiso a un administrador |


| Estado | Qué se ve |
|---|---|
| Proyecto nuevo | Secciones vacías con su ayuda; panel con «Borrador · sin guardar» y «Publicar» deshabilitado. |
| Guardando | «Guardar» deshabilitado con «Guardando…». |
| Guardado | Aviso «Guardado como revisión N» o «Sin cambios». |
| Error de validación | No guarda. Resumen arriba («No guardamos: hay 3 errores»), error en línea y foco al primero. |
| Conflicto | «Alguien guardó la revisión N mientras editabas. Revisa sus cambios antes de guardar.» con enlace a comparar. |
| Video sin respuesta o sin dimensiones | La pieza muestra «No pudimos leer este video. Revisa la URL del bucket.» y bloquea publicar. |
| Sin aprobación o sin alcance | «Publicar» deshabilitado con la razón en «Falta para publicar». |
| Alcance parcial | La sección no cubierta muestra «No se mostrará: la aprobación no incluye cifras». |
| Publicado | Estado «Publicado» con enlace «Ver en el sitio» y botón «Despublicar». |
| Sin permiso para publicar | El botón no existe; texto «Publica una persona con permiso de publicación.» |
| Restaurar | Confirmación en línea «¿Restaurar la revisión N? Se creará una revisión nueva.» |
| 390 px | No es objetivo; las columnas se apilan y nada se corta. |

## Copy Ledger

Ledger inicial (es-CL neutro, tuteo, dominio `eo-portfolio`). Se valida con `greenhouse-ux-writing` antes de construir.

| Clave | Texto |
|---|---|
| `menu.label` | Portafolio |
| `list.empty` | Todavía no hay proyectos. Crea el primero. |
| `section.client` | Cliente y contexto |
| `section.steps` | Reto, idea y ejecución |
| `section.results` | Resultados |
| `section.chapters` | Capítulos y piezas |
| `section.people` | Testimonio y equipo |
| `section.links` | Enlaces |
| `section.seo` | SEO |
| `field.audience` | Para quién |
| `field.need` | Qué necesitaba |
| `field.source` | Fuente |
| `help.source` | Toda cifra lleva su fuente. Sin fuente no se guarda. |
| `field.format` | Formato (se calcula de la pieza) |
| `approval.title` | Aprobación del cliente |
| `approval.scope` | Qué aprobó |
| `publish.blocked` | Falta para publicar |
| `publish.cta` | Publicar |
| `unpublish.cta` | Despublicar |
| `save.cta` | Guardar |
| `save.message` | Qué cambiaste (queda en el historial) |
| `save.ok` | Guardado como revisión %d. |
| `save.unchanged` | Sin cambios. |
| `error.summary` | No guardamos: hay %d errores. |
| `error.conflict` | Alguien guardó la revisión %d mientras editabas. Revisa sus cambios antes de guardar. |
| `error.video` | No pudimos leer este video. Revisa la URL del bucket. |
| `scope.hidden` | No se mostrará: la aprobación no incluye %s. |
| `restore.confirm` | ¿Restaurar la revisión %d? Se creará una revisión nueva. |
| `publish.noPermission` | Publica una persona con permiso de publicación. |

## Accessibility Contract

- Cada campo con `<label>` visible; ayudas asociadas con `aria-describedby`.
- Resumen de errores con `role="alert"` y enlaces que mueven el foco al campo.
- Secciones colapsables como `<button aria-expanded>` con su contenido enlazado.
- «Publicar» deshabilitado con `aria-disabled` y la razón legible, no sólo color.
- Miniaturas con el `alt` del propio documento; chip de formato leído como texto.

## Implementation Mapping

- **Repo:** `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/`.
- **Pantalla:** reemplaza el editor del tipo `eo_project` (`replace_editor` o pantalla propia enlazada desde el listado)
  [verificar el enganche más simple con el admin de Kinsta].
- **Datos:** carga con `EOP_Store::read`; guarda con `EOP_Store::save` (mismo orden que WP-CLI); publica con
  `EOP_Store::publish`, que vuelve a validar y exige aprobación.
- **Medios:** imágenes con `wp.media` (guarda `mediaId`, lee `width`/`height` de los metadatos del adjunto); video por URL
  con lectura de dimensiones en el servidor [verificar si basta `wp_read_video_metadata` sobre la URL o hace falta
  `ffprobe` en local antes de pegarla].
- **Capabilities:** `eo_manage_portfolio` y `eo_publish_portfolio`, asignadas a administrador al activar.
- **Copy:** dominio de traducción `eo-portfolio`.

## GVC Scenario Plan

- **Superficie:** admin local o de staging; surface ID `wp-admin-eo-portfolio`.
- **Viewports:** 1440×900 y 1280×800; 390×844 sólo para verificar que no rompe.
- Quality profile: premium
- Scroll-width: sin scroll horizontal en 1280, 1440 y 390 (medido en Playground el 2026-10-29).
- **Pasos:**
  1. Crear un proyecto con el fixture de PabellonToGo cargado por WP-CLI.
  2. Borrar la fuente de una cifra y guardar → error y foco.
  3. Agregar un video del bucket → formato calculado.
  4. Registrar aprobación sin alcance de cifras → «No se mostrará» en Resultados.
  5. Publicar y despublicar.
  6. Restaurar una revisión.
- **Captures:** un frame por paso; `data-capture` `eo-portfolio-sections`, `eo-portfolio-media`,
  `eo-portfolio-approval`, `eo-portfolio-history`.
- **Verificaciones:** igualdad con `wp eo-portfolio export`; «Publicar» deshabilitado sin aprobación; scroll-width sin
  desborde en 1280 y 390; foco al primer error.
- **Review dossier:** adjunto a la task. **Baseline:** nueva.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Pantalla propia sobre el servicio, no ACF | ACF repite el problema de Ohio: datos invisibles para la REST y sin validación del documento entero. |
| Panel de aprobación siempre visible | La aprobación es la regla que más importa; esconderla en una pestaña invita a olvidarla. |
| Formato calculado, no editable | La proporción declarada a mano se desvía; la real no (PDR-028 §3.3). |
| Video por URL del bucket | El plugin no tiene credenciales de GCP (PDR-028 §4). |
| Sin vista previa pública en esta task | La vista previa necesita las plantillas de `TASK-2048`; se suma ahí. |

## Delta 2026-10-29 — implementación

- Enganche: menú propio `admin.php?page=eo-portfolio` (listado, `action=edit`, `action=view` para leer una revisión) y
  `admin-post.php` (`eop_save` con `eop_do` = save | publish | unpublish, `eop_restore`). El tipo `eo_project` sigue sin
  UI nativa.
- Video: el navegador lee `videoWidth` y `videoHeight` al pegar la URL (no hace falta `ffprobe` ni descargar en el
  servidor); el servicio exige además que la URL esté en el bucket público de AXIS.
- Ids y nombres de campo salen de la ruta del documento, así que cada falla del validador cae en su campo.
- Lo que el canvas no dibujaba y quedó construido: conflicto (con «Ver la revisión vigente» y «Abrir la vigente para
  editar sobre ella»), sin permiso de publicación (texto en vez de botón), proyecto nuevo con slug sugerido desde el
  título, y la vista de solo lectura de una revisión.
