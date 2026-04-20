# EPIC_OPERATING_MODEL_V1.md

## Objetivo

Definir cómo funcionan los `EPIC-###` en Greenhouse: cuándo usar un epic, cuál es su ciclo de vida y cómo se conecta operativamente con las `TASK-###`.

## Regla base

Un epic coordina un programa cross-domain o multi-task.  
Una task sigue siendo la unidad ejecutable del repo.

Un epic:

- no reemplaza las tasks
- no se implementa "directamente" como si fuera una sola tarea
- no elimina la necesidad de plan, verificación y cierre por task

## Cuándo usar un epic

Usar `EPIC-###` cuando el trabajo:

- cruza varios dominios del portal
- requiere múltiples tasks hijas claramente separables
- tiene una foundation compartida y varias convergencias downstream
- necesita coordinar trabajo ya existente y trabajo nuevo bajo un mismo programa

### Señales típicas de epic

- una sola task ya no alcanza sin volverse excesivamente amplia
- hay varias tasks que dependen de una misma foundation
- el problema combina plataforma + UX + data + integración
- hay trabajo previo en distintos módulos que debe reanclarse bajo una estrategia común

## Cuándo NO usar un epic

No usar `EPIC-###` cuando:

- el trabajo cabe bien en una sola `TASK-###`
- el cambio es pequeño y local -> usar `MINI-###`
- el hallazgo es una falla real de runtime -> usar `ISSUE-###`
- solo hace falta coordinación liviana dentro del backlog existente -> puede seguir siendo suficiente una `umbrella task`

## Matriz de artefactos

| Artefacto | Propósito | Unidad ejecutable | Verificación principal |
| --- | --- | --- | --- |
| `ISSUE-###` | falla, incidente, bug real | no | reproducción/fix operativo |
| `MINI-###` | mejora pequeña/local | sí | ligera |
| `TASK-###` | trabajo implementable | sí | `lint` / `tsc` / `test` / smoke |
| `TASK-### umbrella` | coordinación acotada dentro del backlog de tasks | no directa | consistencia documental |
| `EPIC-###` | programa cross-domain o multi-task | no directa | consistencia del programa + cierre de tasks hijas |

## Layout canónico

- índice: `docs/epics/README.md`
- plantilla: `docs/epics/EPIC_TEMPLATE.md`
- registro de IDs: `docs/epics/EPIC_ID_REGISTRY.md`
- lifecycle folders:
  - `docs/epics/to-do/`
  - `docs/epics/in-progress/`
  - `docs/epics/complete/`

## Contrato mínimo de un epic

Cada epic debe declarar al menos:

- `Lifecycle`
- `Priority`
- `Impact`
- `Effort`
- `Status real`
- `Domain`
- `Owner`
- `Summary`
- `Why This Epic Exists`
- `Outcome`
- `Architecture Alignment`
- `Child Tasks`
- `Exit Criteria`

## Lifecycle del epic

Los epics usan el mismo eje base de lifecycle que tasks y mini-tasks:

- `to-do`
- `in-progress`
- `complete`

### `to-do`

El epic ya existe como programa definido, pero todavía no está en ejecución coordinada.

Señales:

- el problema ya fue formalizado
- ya puede tener child tasks reservadas
- todavía no hay ejecución activa del programa o la coordinación formal aún no comenzó

### `in-progress`

El programa ya está siendo ejecutado.

Señales:

- al menos una child task relevante ya está en `in-progress` o `complete`
- ya existe avance material de foundation o convergencia
- el epic ya funciona como source of truth del programa activo

### `complete`

El programa quedó cerrado a nivel operativo.

Condiciones esperadas:

- las child tasks obligatorias ya están `complete`, absorbidas o explícitamente descartadas
- los `Exit Criteria` del epic están cumplidos
- no quedan dependencias abiertas que impidan considerar cerrado el programa

## Regla de sincronización de lifecycle

Igual que en tasks:

- la carpeta (`to-do/`, `in-progress/`, `complete/`) y el campo `Lifecycle` deben decir lo mismo
- si no coinciden, el epic está mal sincronizado

## Relación entre epic y tasks

### Regla principal

La task ejecuta. El epic coordina.

### Cómo se conectan

1. El epic lista sus tasks en `## Child Tasks`
2. Cada task hija declara `Epic: EPIC-###` en `## Status`
3. El índice de tasks y el índice de epics deben reflejar la conexión

### Cardinalidad recomendada

- una task tiene **un solo epic primario** como máximo
- un epic puede tener múltiples tasks

Esto evita ambigüedad en ownership y cierre.

## Qué NO hace automáticamente un epic

Un epic no:

- mueve tasks entre `to-do/`, `in-progress/` y `complete`
- aprueba planes
- reemplaza el `Closing Protocol` de las tasks
- implica que todas las tasks hijas se ejecutan al mismo tiempo

## Tipos de tasks que puede anclar un epic

Un epic puede anclar:

- tasks nuevas creadas específicamente para el programa
- tasks existentes reancladas documentalmente
- tasks ya completas que ahora se reconocen como foundation del programa

Esto permite que un epic nazca después de que ya exista trabajo previo relevante.

## Diferencia entre child task y related work

### Child task

Trabajo que forma parte explícita del plan operativo del epic.

Debe:

- aparecer en `## Child Tasks` del epic
- declarar `Epic: EPIC-###` en su `## Status`

### Existing Related Work

Trabajo previo o paralelo que da contexto, foundation o convergencia, pero que no necesariamente fue creado como task hija desde el inicio.

Puede:

- quedar solo en `## Existing Related Work`
- o reanclarse después si conviene operativamente

## Protocolo de creación

Al crear un epic nuevo:

1. reservar `EPIC-###` en `docs/epics/EPIC_ID_REGISTRY.md`
2. crear el archivo en `docs/epics/to-do/`
3. actualizar `docs/epics/README.md`
4. si nacen child tasks nuevas:
   - reservar sus `TASK-###`
   - crear sus archivos
   - actualizar `docs/tasks/TASK_ID_REGISTRY.md`
   - actualizar `docs/tasks/README.md`
   - declarar `Epic: EPIC-###` en cada task hija

## Protocolo de evolución

Cuando un epic cambia:

- actualizar primero el epic como source of truth del programa
- luego dejar solo el delta corto en:
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`

No duplicar el detalle completo en cuatro documentos distintos.

## Protocolo de cierre

Cerrar un epic requiere:

- mover el archivo a `docs/epics/complete/`
- cambiar `Lifecycle` a `complete`
- actualizar `docs/epics/README.md`
- dejar constancia breve en `Handoff.md`
- actualizar `changelog.md` si el cierre cambia el contrato operativo del repo

## Regla sobre umbrella tasks existentes

Los epics no invalidan automáticamente las `umbrella task` existentes.

Regla operativa:

- una `umbrella task` puede seguir viva si ya ordena bien un bloque acotado del backlog
- un `epic` se reserva para programas más amplios, especialmente cross-domain o multi-task de largo alcance
- no migrar por reflejo todo lo viejo a epics

## Anti-patrones

Evitar:

- crear un epic para una sola task
- dejar child tasks sin `Epic: EPIC-###`
- cerrar el epic mientras sus tasks obligatorias siguen abiertas
- usar un epic como sustituto de documentación arquitectónica
- convertir el epic en un backlog infinito sin `Exit Criteria`

## Ejemplo operativo mínimo

```md
EPIC-001
  ├── TASK-489  foundation documental
  ├── TASK-490  signature orchestration
  ├── TASK-491  adapter ZapSign
  ├── TASK-492  gestor documental / access model
  ├── TASK-494  convergencia HR
  └── TASK-495  convergencia Finance/Legal
```

Lectura correcta:

- `EPIC-001` coordina el programa
- cada `TASK-###` se toma, planifica, implementa y cierra por separado
- el epic solo se cierra cuando el programa realmente quedó cerrado
