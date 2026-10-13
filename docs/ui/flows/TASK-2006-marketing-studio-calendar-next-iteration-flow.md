# TASK-2006 — Flujo de la siguiente iteración del calendario

- Programa: [`EPIC-049-marketing-studio-UI-FLOW.md`](EPIC-049-marketing-studio-UI-FLOW.md). Extiende el nodo **`MS-N4`
  Calendario** (vista Trimestre, hoja con pestañas, lote, exportar) y el nodo **`MS-N1` Hoy** (menciones y propuestas de
  agentes como ítems de atención); agrega la vista de cliente de sólo lectura.
- Base: [`TASK-2002-marketing-studio-activations-calendar-flow.md`](TASK-2002-marketing-studio-activations-calendar-flow.md).
- Wireframe: [`TASK-2006-marketing-studio-calendar-next-iteration.md`](../wireframes/TASK-2006-marketing-studio-calendar-next-iteration.md).
- Contrato: TASK-2005.

## Rutas y estado en la URL

| Estado | URL |
|---|---|
| Trimestre | `/calendar?view=quarter&quarter=YYYY-Qn` |
| Pestaña de la hoja | `&activation=<id>&tab=detail\|results\|history\|comments` |
| Selección en lote | sin URL (estado local); el resultado del lote sí deja la URL filtrada en lo que falló |
| Vista de cliente | `/client/calendar` `[verificar con TASK-1898]` |

## Recorridos

**A. Planificar el trimestre.** `Trimestre` → ver campañas con su portada, feriados y fechas comerciales → abrir un punto →
hoja de TASK-2002.

**B. Coordinar una salida.** Hoja → `Comentarios` → escribir y «Comentar» → la persona mencionada ve un ítem en Hoy →
abre la activación en esa pestaña.

**C. Revisar qué pasó.** Hoja → `Historial` (quién planificó, qué cambió, qué descubrió la herramienta, cuándo se
publicó) → `Resultados` (alcance, interacciones y clics con su fuente y frescura).

**D. Mover varias.** Semana → seleccionar (clic, Mayús + clic, o Espacio con teclado) → barra → «Reprogramar» (diálogo con
la nueva fecha y el aviso de fuera de plan) o «Cancelar» (confirmación con el conteo) → resultado por ítem; si alguna
falla, «Se aplicó a {ok} de {total}» con la lista para reintentar.

**E. Compartir.** «Exportar» → «Descargar CSV» con los filtros actuales, «Suscribirse (iCal)» (crea la URL privada y se
puede revocar) o «Copiar enlace con filtros».

**F. Decidir una propuesta de agente.** Hoy o calendario → tarjeta «Propuesta por agente» → «Aceptar» (crea la activación
`Planificada` con la persona como actor), «Editar» (abre el formulario de TASK-2002 precargado) o «Descartar».

**G. Ver como cliente.** La persona del cliente entra a la vista de sólo lectura → sus campañas con estados simplificados,
sin evidencia, herramientas ni acciones.

## Superficies superpuestas

- Hoja con pestañas (una a la vez); diálogos de lote sobre la semana; menú de exportar como popover; la vista de cliente
  no abre superficies de edición.

## Paridad

Cada acción es una operación de TASK-2005 con ruta `/api/v1` y tool MCP; un agente comenta, exporta o propone por su
work item (TASK-1913) y una persona acepta. La UI no decide qué ve el cliente: lo decide `getClientCalendar`.

## Motion

Sin motion propio: la barra de lote aparece con la transición vigente de Studio y se anula con `prefers-reduced-motion`.

## GVC Scenario Plan

Escenario Playwright contra `http://localhost:3100` sobre staging, `qualityProfile: premium`, en 1440×1100 y 390×844,
claro y oscuro: A (trimestre y un punto), B (comentar y ver el ítem en Hoy), C (historial y resultados), D (lote con un ítem
que falla a propósito para ver el resultado parcial), E (CSV, feed creado y revocado), F (aceptar y descartar), G (cliente
con aserción de que no aparecen herramientas ni evidencia). Capturas `after-flow-*`, `scrollWidth <= clientWidth` en cada
paso y recorrido con teclado. Línea base `approved-v33-*`, surface ID `studio-calendar-next-iteration`.

## Design Decision Log

- Decision: comentarios, historial y resultados viven dentro de la hoja; el lote es una barra que sigue a la selección; la
  vista de cliente es una ruta aparte de sólo lectura.
- Alternatives considered: panel lateral permanente de comentarios (descartado: compite con la bandeja); acciones de lote
  en un menú contextual (descartado: escondidas y difíciles con teclado); mostrar el calendario interno al cliente con
  permisos (descartado: riesgo de filtrar evidencia y herramientas).
- Why this pattern: cada superficie tiene un solo dueño y el foco es predecible; el cliente no puede ver lo que no le toca
  porque el reader no lo devuelve.
- Reuse / extend / new primitive: reusa hoja, diálogos y formulario de TASK-2002.
- Open risks: acceso del cliente depende de TASK-1898; propuestas dependen de TASK-1913.
