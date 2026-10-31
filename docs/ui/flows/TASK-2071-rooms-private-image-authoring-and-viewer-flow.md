# TASK-2071 — Flujo de autoría, publicación y «Qué cambió»

Contrato de navegación reescrito el 2026-10-31 desde el canvas aprobado el 2026-10-29 (`Autoria`, `Ediciones`) y el
código de `efeonce-rooms` `claude/rooms-approved-ui` (`src/components/authoring/*`, `src/components/editions/*`). No
existe un flujo maestro del programa EPIC-052 en `docs/ui/flows/`; la sala que se publica está en
[TASK-2059](TASK-2059-rooms-first-experience-flow.md) y la invitación en
[TASK-2068](TASK-2068-rooms-invitation-and-guest-experience-flow.md).

## Puntos de entrada

| Desde | Destino | Condición |
|---|---|---|
| `/rooms` (espacio interno) o una URL | `/rooms/:roomId/authoring` | Sesión interna; el reader exige `content.edit` |
| La mesa sin borrador abierto | Pantalla «No hay un borrador abierto.» en la misma ruta | Sala publicada, no archivada y `getDraft` responde `not_found` |
| «Abrir vista previa» | `/rooms/:roomId/authoring/vista-previa` (rol comprador) | Interno |
| «Probar a pantalla completa» | `/rooms/:roomId/authoring/vista-previa/vive/:blockId` | Escena guardada y sin cambios pendientes |
| Tostada de publicación «Abrir la sala» | `/rooms/:roomId/editions/:editionId` (la nueva) | Tras `editions.publish` |
| URL | `/rooms/:roomId/editions/:editionId/cambios?desde=:baseId` | Lectura de ambas ediciones; sin `desde`, la base es la edición anterior |

## Nodos y transiciones de la mesa

| Nodo | Entrada | Salida |
|---|---|---|
| Pieza seleccionada | Clic en el inventario (también fija el capítulo del escenario) | Otra pieza, una escena, publicar, vista previa |
| Escena seleccionada | Clic en una escena o creación desde «Añadir escena» | Otra selección; los cambios sin guardar quedan en memoria por escena y se marcan «sin guardar» |
| «Ver como» | Selector de rol; flechas ← → | Cambia la proyección del escenario y la nota del rol; no navega |
| Capítulo del escenario | Barra «NN título» bajo el escenario | Solo cambia lo que muestra el escenario |
| Confirmar publicación | «Publicar edición N» | «Cancelar»/Escape (cierra y vuelve al botón) o «Publicar» → tostada |
| Vista previa | «Abrir vista previa» (navegación de documento) | «Ver como: {rol} · volver a autoría» vuelve a la mesa |

Escribir siempre sigue el mismo ciclo: acción → `POST /api/v1/commands` con `expectedRevision` (la última recibida) e
`Idempotency-Key` nueva → la revisión devuelta reemplaza la anterior → `router.refresh()` vuelve a pedir el modelo al
servidor. Un fallo también refresca, para que la mesa muestre la verdad del servidor.

### Acciones y commands

| Acción en la mesa | Commands | Efecto en la mesa |
|---|---|---|
| Incluir o excluir | `content.upsertBlock` (con o sin `excludedReason`) y, si hay capítulos declarados, `content.arrange` | Excluida sale de su capítulo; incluida vuelve al suyo o al último |
| Cambiar de capítulo | `content.arrange` | Sin capítulos vacíos |
| Renombrar (al salir del campo) | `content.upsertBlock` | Solo si el título cambió y no está vacío |
| «Por qué funciona» (al salir del campo) | `content.upsertBlock` | Vacío quita el fundamento |
| «Vincular evidencia» | `content.linkEvidence` (relación no obligatoria del bloque a la evidencia) | La evidencia aparece en la lista |
| «Añadir imagen» | SHA-256 en el navegador → `uploads.initiate` → `PUT` al descriptor de transferencia (corto, privado, usado una vez y nunca guardado) → `uploads.complete` | La imagen aparece «Procesando…» y luego «Lista» |
| «Usar en la sala» | `content.upsertBlock` (bloque de medio nuevo) → `content.attachAsset` (`role: primary`) → `content.arrange` | La pieza entra al capítulo visible en el escenario o al último |
| «Añadir escena» | `content.upsertBlock` (escena con valores editables) → `content.arrange` | La escena queda seleccionada; va al capítulo que ya tiene escenas o crea «Vive el servicio» |
| «Guardar escena» | `content.upsertBlock` con el bloque completo | Se borra el borrador local de esa escena |
| «Descartar cambios» | Ninguno | El escenario vuelve a la escena guardada |
| «Publicar» | `editions.publish` | Tostada «Edición N publicada» con «Abrir la sala»; el botón queda deshabilitado |
| «Abrir borrador» | `editions.reopen {sourceEditionId}` | La ruta se refresca y aparece la mesa con el borrador nuevo |

### Vista previa por rol

- `?as=buyer|champion|audience` (otro valor cae en `buyer`). La vista previa usa la proyección
  `content.previewAudience` del borrador: el rol solo oculta (comprador sin evidencia ni preguntas; champion con
  evidencia y preguntas; audiencia como en la presentación). No crea sesión, no registra recorrido ni presencia
  (`offline`).
- Desde la vista previa, una escena abre `/authoring/vista-previa/vive/:blockId?as=rol`; su «Volver a la sala» regresa
  a la vista previa con el mismo rol. La escena del borrador se ve solo después de guardarla.

## «Qué cambió»

- `?desde=` elige la base; las ediciones anteriores de la línea de tiempo son enlaces que cambian `desde` (navegación de
  documento). Sin edición anterior, o con una base que no se puede leer, la ruta responde `AccessState`.
- Elegir un cambio en la lista actualiza el detalle sin navegar (anunciado con `aria-live`).
- El comparador se opera arrastrando o con las flechas sobre el `range`.
- «Volver a la sala» lleva a la edición mostrada.
- No hay entrada desde la sala ni desde la tostada de publicar: `AUTHORING_COPY.changes` («Ver qué cambió») existe sin
  usarse. Pendiente agregar ese enlace en la tostada y en la sala cuando haya una edición anterior.

## Estados de error, vacío y permiso

| Situación | Respuesta |
|---|---|
| Sesión no interna o sin `content.edit` | `AccessState` con enlace a `/login?returnTo=/rooms` |
| Sala archivada, o borrador abierto que la mesa no pudo leer | `AccessState` (nunca se ofrece reabrir encima de un borrador existente) |
| Sin borrador tras publicar | «No hay un borrador abierto.» con «Abrir borrador» |
| Conflicto de revisión (409) | «La sala cambió mientras editabas. Recargamos la última versión.» y el modelo se refresca |
| Cualquier otro fallo de command | «No pudimos guardar el cambio. Vuelve a intentarlo.» y refresco |
| Escena inválida | El botón «Guardar escena» queda deshabilitado y la lista dice qué falta |
| Cobertura incompleta | «Publicar» deshabilitado con la explicación en la franja de cobertura |
| Imagen que no se pudo procesar | «nombre · No se pudo procesar» en el inventario; no se puede usar |

## GVC Scenario Plan

- `rooms-authoring` (`/demo/autoria`): comprador, champion, excluir una pieza, confirmar publicación; probe
  `view-as-arrows`.
- `rooms-authoring-scenes` (`/demo/autoria`): editar `showcase` y `cycle`, menú «Añadir escena»; probe
  `add-scene-keyboard`.
- `rooms-edition-changes` (`/demo/ediciones`): comparador de pieza y diff de texto; probe `wipe-slider-keyboard`.
- Viewports 1440×900, 1280×800 y 390×844; repetir con movimiento reducido.
- Recorrido real verificado en local contra la integración (renombrar, publicar, «Qué cambió», subir y usar imagen,
  reabrir, escena completa). Pendiente: dos editores en conflicto y vista previa por rol con una sala real.
- Dossier: `docs/ui/reviews/TASK-2071-rooms-private-image-authoring-and-viewer/`.

## Design Decision Log

- 2026-10-31 — La vista previa es la sala real en modo `offline` con la proyección del rol, no una maqueta ni una sesión
  falsa de invitado.
- 2026-10-31 — Publicar siempre pasa por confirmación con el resumen de lo que entra y lo que queda fuera.
- 2026-10-31 — «Qué cambió» se lee con la autoridad de quien mira: el invitado también la ve y nada excluido entra al
  diff.
- 2026-10-31 — Reabrir crea el borrador siguiente desde la última edición; la edición publicada nunca cambia.
