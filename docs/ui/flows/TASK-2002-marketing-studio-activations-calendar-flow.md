# TASK-2002 — Flujo del calendario de activaciones

- Programa: [`EPIC-049-marketing-studio-UI-FLOW.md`](EPIC-049-marketing-studio-UI-FLOW.md). Esta superficie es el nodo
  **`MS-N4` Calendario** (global, `/calendar`) y la pestaña Calendario del nodo **`MS-N3`** (espacio de campaña); alimenta
  el nodo **`MS-N1` Hoy** con los ítems «Ejecución sin activación», «Vencida» y «Fuera de plan».
- Wireframe: [`TASK-2002-marketing-studio-activations-calendar.md`](../wireframes/TASK-2002-marketing-studio-activations-calendar.md)
- Contrato: TASK-2001 (activaciones, evidencia de ejecución, descubrimiento de Metricool).

## Rutas y estado en la URL

| Estado | URL |
|---|---|
| Mes | `/calendar?month=YYYY-MM` |
| Semana | `/calendar?view=week&week=YYYY-Www` |
| Filtros | `&modality=paid,organic&family=social&platform=instagram&account=<id>&campaign=CMP-###&status=overdue` |
| Activación abierta | `&activation=<activationId>` (deep link; la hoja se abre al cargar) |
| Pestaña de campaña | `/campaigns/CMP-###?tab=calendar` + los mismos parámetros, con la campaña fijada |

## Recorridos

**A. Revisar la semana.** Calendario → filtro Organic + Instagram → tarjeta «Programada · Metricool» → hoja con pieza,
copy, fecha planificada y evidencia → Esc vuelve a la grilla con el foco en la tarjeta.

**B. Resolver una ejecución sin activación** (el caso de «Los Sparks» del 5/10). Hoy o lateral del calendario →
«Ejecución sin activación» (post de Metricool del 5/10 14:00, Instagram, cuenta Efeonce) → dos salidas:
- «Vincular» → diálogo con las activaciones `planned` candidatas (misma plataforma y cuenta, fecha cercana) → confirmar →
  la tarjeta pasa a «Programada» y la bandeja baja en uno.
- «Crear activación» → hoja precargada con lo que la herramienta sabe (red, cuenta, fecha, texto) → la persona elige
  campaña (obligatoria, puede ser Always On), pieza y versión → guardar → queda vinculada.

**C. Atender una vencida.** Hoy («N activaciones vencidas») → calendario filtrado `status=overdue` → hoja → «Reprogramar»
(nueva fecha planificada) o «Cancelar activación» (`ConfirmDialog`; la evidencia se conserva).

**D. Planificar.** «Planificar activación» → hoja vacía: campaña, dimensiones de canal (validadas por el catálogo),
cuenta, pieza y versión, copy, fecha → guardar → tarjeta «Planificada».

## Superficies superpuestas

- `ActivationSheet` (una a la vez), `LinkExecutionDialog` y `ConfirmDialog` sobre la hoja. Salida con cambios sin guardar
  ⇒ diálogo de descartar. Conflicto de revisión (412) ⇒ diálogo de conflicto de TASK-1895.

## Paridad

Cada acción del flujo es un command de TASK-2001 (`planActivation`, `updateActivation`, `cancelActivation`,
`linkExecution`, `unlinkExecution`, `createActivationFromExecution`) disponible por `/api/v1` y como tool MCP; un agente
recorre B y C con la identidad delegada de la persona (TASK-1899).

## Motion

Sin motion propio: la hoja usa la transición vigente de Studio y se anula con `prefers-reduced-motion`.
