# GITHUB_PROJECT_OPERATING_MODEL_V1.md

## Objetivo
Definir como usar GitHub Issues + GitHub Project como capa operativa del sistema de tasks sin reemplazar la documentación viva del repo.

## Fuente canonica por capa

- `docs/tasks/**`
  - source of truth de alcance, contexto, dependencias, archivos owned, acceptance criteria y verification
- GitHub Issue
  - unidad operativa de ejecución, conversación async, links a PRs, preview URLs y decisiones de coordinación
- GitHub Project
  - vista viva de estado, prioridad actual, owner, QA y bloqueo

Regla:

- GitHub Project no reemplaza la task markdown
- la task markdown no reemplaza el seguimiento operativo del Project

## Que entra al Project

Agregar al Project:

- toda task `TASK-###` activa
- toda task `TASK-###` priorizada para la iteración actual
- cualquier lane legacy `CODEX_TASK_*` que siga viva y ya tenga asignado un `TASK-###` operativo
- bugs o feature requests que estén suficientemente claros para entrar al pipeline

No hace falta migrar de golpe:

- tasks históricas cerradas
- backlog lejano sin owner
- briefs que siguen siendo solo framing de producto

## Convencion de IDs y mapeo

- ID operativo estable: `TASK-###`
- El issue siempre se titula:
  - `[TASK-003] Finance Dashboard Calculation Correction`
- Si la task todavía vive en un archivo legacy:
  - el issue igual usa `TASK-###`
  - el campo `Legacy ID` guarda el `CODEX_TASK_*`
  - el campo `Task Doc` apunta al archivo legacy real hasta que se renombre

Regla:

- `TASK-###` no cambia cuando cambia el backlog
- `Rank` si cambia

## Pipeline recomendado

### 1. Draft

Usar cuando:

- existe idea, bug, hallazgo o request
- todavía no hay task markdown madura o falta arquitectura

Salida esperada:

- crear/ajustar task markdown
- definir `TASK-###`
- decidir si entra a iteración

### 2. Ready

Usar cuando:

- ya existe task markdown
- ya tiene `TASK-###`
- la arquitectura aplicable ya fue contrastada
- la lane está lista para ser tomada

### 3. In Progress

Usar cuando:

- alguien ya tomó la task
- existe rama de trabajo
- la task ya debería vivir en `docs/tasks/in-progress/`

### 4. In Review

Usar cuando:

- hay PR abierto
- falta review técnica o funcional
- todavía no se valida preview final

### 5. Preview QA

Usar cuando:

- el PR ya tiene preview útil
- la verificación principal ahora es UI, rutas, auth, deploy o smoke tests sobre preview

### 6. Staging QA

Usar cuando:

- el cambio ya entró a `develop`
- se valida en staging según el flujo oficial del repo

### 7. Done

Usar cuando:

- la lane ya quedó cerrada en código
- `docs/tasks/complete/` ya refleja el cierre
- `Handoff.md` y `changelog.md` ya quedaron actualizados si aplica

## Campo Blocked

No usar `Blocked` como columna principal del board.
Usarlo como campo aparte para no romper la lectura secuencial del pipeline.

Regla:

- `Status` sigue describiendo fase
- `Blocked = Yes` describe interrupción
- `Blocker Note` explica por qué

Ejemplo:

- `Status = In Progress`
- `Blocked = Yes`
- `Blocker Note = Falta env var en staging`

## Campos recomendados del Project

### Minimos

- `Status`
  - tipo: single select
  - valores: `Draft`, `Ready`, `In Progress`, `In Review`, `Preview QA`, `Staging QA`, `Done`
- `Task ID`
  - tipo: text
  - ejemplo: `TASK-003`
- `Rank`
  - tipo: number
  - uso: orden operativo actual
- `Priority`
  - tipo: single select
  - valores: `P0`, `P1`, `P2`, `P3`
- `Domain`
  - tipo: single select
  - valores sugeridos:
    - `finance`
    - `hr`
    - `identity`
    - `platform`
    - `data`
    - `ui`
    - `ops`
    - `docs`
- `Owner`
  - usar assignee del issue
- `Iteration`
  - tipo: iteration
- `Task Doc`
  - tipo: text
  - ejemplo: `docs/tasks/to-do/TASK-003-finance-dashboard-calculation-correction.md`
- `Blocked`
  - tipo: single select
  - valores: `No`, `Yes`
- `Blocker Note`
  - tipo: text
- `Legacy ID`
  - tipo: text
  - ejemplo: `CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1`

### Opcionales útiles

- `PR`
  - tipo: text
  - ejemplo: `#123`
- `Preview URL`
  - tipo: text
- `Target Env`
  - tipo: single select
  - valores: `Preview`, `Staging`, `Production`, `Docs only`
- `Impact`
  - tipo: single select
  - valores: `Muy alto`, `Alto`, `Medio`
- `Effort`
  - tipo: single select
  - valores: `Bajo`, `Medio`, `Alto`

## Vistas recomendadas

### Board - Execution

- layout: board
- group by: `Status`
- sort: `Rank ASC`
- show: `Priority`, `Owner`, `Blocked`, `Iteration`

### Table - Backlog

- layout: table
- filter:
  - `Status = Ready`
- sort:
  - `Rank ASC`
  - `Priority ASC`

### Table - Active

- filter:
  - `Status != Done`
  - `Status != Draft`

### Table - Blocked

- filter:
  - `Blocked = Yes`

### Table - Staging

- filter:
  - `Status = Staging QA`

### Roadmap - Iterations

- layout: roadmap
- date source: `Iteration`
- filter:
  - `Status != Done`

## Automatizaciones recomendadas

## Fase 1 - Built-in workflows

- auto-add al Project de issues del repo
- default `Status = Draft` al entrar
- cuando el issue se cierre:
  - `Status = Done`
- auto-archive items `Done` después de 14 a 30 días

## Fase 2 - Actions o API

Agregar solo si el equipo ya usa el pipeline de forma consistente:

- completar `Preview URL` desde el PR o deployment
- completar `PR` automáticamente
- validar que `Task Doc` exista
- alertar si un issue `In Progress` no tiene branch o PR después de cierto tiempo
- sincronizar metadatos entre issue y markdown cuando valga la pena

## Convencion de issue

Titulo:

- `[TASK-003] Finance Dashboard Calculation Correction`

Checklist mínima del issue:

- `Task ID`
- `Task Doc`
- `Summary`
- `Priority`
- `Domain`
- `Verification plan`
- `Dependencies / blockers`

Regla:

- el issue resume y operacionaliza
- la task markdown contiene el detalle completo

## Convencion de PR

Todo PR que ejecute una task debe incluir:

- `Task ID`
- `GitHub Issue`
- `Task Doc`
- verification ejecutada o explicada
- preview URL cuando aplique

## Flujo operativo recomendado

1. Crear o ajustar la task markdown desde `docs/tasks/TASK_TEMPLATE.md`
2. Asignar `TASK-###`
3. Crear issue con título `[TASK-###] ...`
4. Agregar issue al Project
5. Completar campos mínimos
6. Mover `Status` a `Ready`
7. Al tomarla, pasar a `In Progress` y mover la markdown a `docs/tasks/in-progress/`
8. Abrir PR y mover a `In Review`
9. Validar preview y mover a `Preview QA`
10. Merge a `develop` y mover a `Staging QA`
11. Cerrar documentalmente y mover a `Done`

## Anti-patrones

- usar el número de task como ranking mutable
- duplicar acceptance criteria completos en issue y markdown
- usar `Blocked` como columna del board
- meter todas las tasks históricas al Project de una sola vez
- cerrar un issue sin cerrar también su task markdown cuando el alcance sí se completó

## Setup mínimo sugerido

Para arrancar sin fricción:

1. Crear un Project nuevo para `efeoncepro/greenhouse-eo`
2. Crear los campos mínimos de este documento
3. Crear la vista `Board - Execution`
4. Crear la vista `Table - Backlog`
5. Crear la vista `Table - Blocked`
6. Cargar solo:
   - la task activa
   - el top 10 del backlog priorizado
   - cualquier bug vivo que esté compitiendo por capacidad

## Bootstrap inicial recomendado para este repo

Project sugerido:

- `Greenhouse Delivery`

Project materializado:

- owner: `efeoncepro`
- number: `2`
- url: `https://github.com/orgs/efeoncepro/projects/2`

Items iniciales sugeridos para cargar:

- `TASK-001` a `TASK-010` definidos en `docs/tasks/TASK_ID_REGISTRY.md`

Estado real ya cargado:

- issues `#9` a `#18` creadas en `efeoncepro/greenhouse-eo`
- todas agregadas al Project
- `TASK-001` quedó con `Status = In Progress` y `Pipeline = In Progress`
- `TASK-002` a `TASK-010` quedaron con `Status = Todo` y `Pipeline = Ready`

Nota operativa:

- el Project conserva el `Status` built-in de GitHub (`Todo`, `In Progress`, `Done`)
- la secuencia operativa detallada del equipo vive en el campo custom `Pipeline`
- esa dualidad existe porque el CLI permite crear campos custom, pero no deja reemplazar el comportamiento del `Status` built-in

Estado inicial sugerido:

| Task ID | Estado inicial sugerido | Nota |
| --- | --- | --- |
| `TASK-001` | `In Progress` | Lane ya activa en markdown |
| `TASK-002` | `Ready` | P0 abierto |
| `TASK-003` | `Ready` | P0 abierto |
| `TASK-004` | `Ready` | P0 abierto |
| `TASK-005` | `Ready` | P1 dependiente de payroll |
| `TASK-006` | `Ready` | P1 foundation |
| `TASK-007` | `Ready` | Lane transversal de higiene |
| `TASK-008` | `Ready` | P1 parcial |
| `TASK-009` | `Ready` | P1 diseño |
| `TASK-010` | `Ready` | P1 cross-module |

### Orden exacto sugerido de campos al crear el Project

Crear en este orden para reducir setup manual:

1. `Status`
2. `Task ID`
3. `Rank`
4. `Priority`
5. `Domain`
6. `Iteration`
7. `Blocked`
8. `Blocker Note`
9. `Task Doc`
10. `Legacy ID`
11. `Preview URL`
12. `PR`
13. `Target Env`
14. `Impact`
15. `Effort`

### Layout inicial sugerido del board

Columnas:

1. `Draft`
2. `Ready`
3. `In Progress`
4. `In Review`
5. `Preview QA`
6. `Staging QA`
7. `Done`

Tarjetas visibles:

- `Task ID`
- `Priority`
- `Owner`
- `Blocked`
- `Iteration`

### Valores iniciales sugeridos por item

Para cada item bootstrap:

- `Task ID`: segun `TASK_ID_REGISTRY.md`
- `Rank`: mismo orden del registro bootstrap
- `Priority`: segun `docs/tasks/README.md`
- `Blocked`: `No`
- `Task Doc`: path actual del archivo legacy o nuevo
- `Legacy ID`: si aplica
