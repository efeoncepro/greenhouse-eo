# Task Process Reference

Documento de referencia para el protocolo completo de tasks del proyecto. Define Plan Mode, Skill Protocol, Subagent Protocol, matrices de derivacion, Lightweight Mode y reglas de migracion.

Para la plantilla copiable, ver [`TASK_TEMPLATE.md`](TASK_TEMPLATE.md).
Para tasks con impacto UI/UX visible, ver [`TASK_UI_UX_ADDENDUM.md`](TASK_UI_UX_ADDENDUM.md).
Para tasks con impacto backend/data, ver [`TASK_BACKEND_DATA_ADDENDUM.md`](TASK_BACKEND_DATA_ADDENDUM.md).

> **Convivencia de formatos:** solo las tasks creadas a partir de ahora usan esta estructura. En el backlog existen tasks con el formato anterior — tanto `CODEX_TASK_*` como `TASK-###` ya creadas — que siguen vigentes con su estructura original hasta su cierre.

---

## Convenciones de ID y nombre

- ID canonico para tasks nuevas: `TASK-###` como forma simbolica; el correlativo acepta 3 o mas digitos (`TASK-001`, `TASK-999`, `TASK-1000`, etc.)
- El `###` es un identificador estable, no el orden mutable del backlog
- El orden actual de ejecucion debe vivir en `Rank` y en el panel operativo, no en renumeraciones
- Nombre de archivo recomendado:
  - `docs/tasks/to-do/TASK-003-finance-dashboard-calculation-correction.md`
  - `docs/tasks/in-progress/TASK-003-finance-dashboard-calculation-correction.md`
  - `docs/tasks/complete/TASK-003-finance-dashboard-calculation-correction.md`
- Titulo H1 recomendado:
  - `# TASK-003 — Finance Dashboard Calculation Correction`
- Titulo de issue recomendado:
  - `[TASK-003] Finance Dashboard Calculation Correction`
- Si la task nace desde un brief legacy, agregar:
  - `- Legacy ID: CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1`
- Consultar `docs/tasks/TASK_ID_REGISTRY.md` para reservar el siguiente ID disponible antes de crear una task nueva
- Si la task pertenece a un programa mayor, declarar `Epic: EPIC-###` dentro de `## Status` y sincronizarla con `docs/epics/`
- Branch convention: `task/TASK-###-short-slug` (e.g., `task/TASK-003-finance-dashboard-fix`)
- Las tasks con UI visible usan el mismo `TASK-###`, pero declaran `Execution profile: ui-ux`, `UI impact` y completan `## UI/UX Contract`.
- Las tasks con backend/data usan el mismo `TASK-###`, pero declaran `Execution profile: backend-data`, `Backend impact` y completan `## Backend/Data Contract`.

---

## Tipos de task

| Type | Entregable | Zones activas | Verification tecnica |
|---|---|---|---|
| `implementation` | Codigo, schemas, API routes, UI | Zone 0-4 completas | Si (`pnpm lint`, `tsc`, `test`) |
| `umbrella` | Child tasks coordinadas | Zone 0-1, Acceptance Criteria | No — verificacion es consistencia documental |
| `policy` | Decisiones formalizadas, documentacion | Zone 0-1, Acceptance Criteria | No — verificacion es revision manual contra arquitectura |

El campo `Type` en Zone 0 determina que zonas y pasos aplican. Cuando hay duda, usar `implementation`.

## Perfiles de ejecucion

`Execution profile` no reemplaza `Type`: define el rigor operativo adicional.

| Execution profile | Cuando usar | Contrato adicional |
|---|---|---|
| `standard` | Docs, tooling o cambios sin superficie visible ni contrato runtime/data relevante | Template base |
| `ui-ux` | Cualquier cambio visible, copy, layout, estados, interaccion, motion, primitive, flujo o GVC | `## UI/UX Contract` desde `TASK_UI_UX_ADDENDUM.md` |
| `backend-data` | API, DB, readers, commands, migrations, sync, cron, webhook, integration o source-of-truth/data contract | `## Backend/Data Contract` desde `TASK_BACKEND_DATA_ADDENDUM.md` |

`UI impact` ayuda a clasificar el alcance visible:

- `none` — no hay cambio visible.
- `copy` — labels, CTAs, empty states, alerts, tooltips, aria-labels o errores.
- `layout` — estructura visual, responsive, density, cards, tables, shell.
- `interaction` — hover/focus/keyboard/click-away/pending/feedback.
- `motion` — entrance/exit/layout morph/stagger/scroll reveal/GSAP.
- `primitive` — primitive, variant, kind, pattern reusable o Design System lab.
- `flow` — journey multi-step, onboarding, wizard, queue+inspector o experiencia conversacional.

`Backend impact` ayuda a clasificar el alcance runtime/data:

- `none` — no hay cambio backend/data.
- `api` — route handler, endpoint, OpenAPI, API Platform o contrato programatico.
- `db` — schema, view, reader SQL, persistence helper o query shared.
- `migration` — migration, seed, backfill, destructive change o data repair.
- `command` — write path, command, idempotency, audit, capability mutante.
- `reader` — read surface compartida, serving projection o DTO consumido por UI/agentes.
- `sync` — consumer, materializer, outbox projection o integration sync.
- `cron` — scheduled job, worker periodic, watchdog o batch.
- `webhook` — inbound/outbound webhook, HMAC, replay, subscription o delivery.
- `integration` — provider externo, cloud, HubSpot, Notion, Teams, WordPress/Kinsta, AI provider u otro sistema fuera del repo.

Regla de migracion: no convertir masivamente backlog historico. `complete/` queda como historia;
`in-progress/` y `to-do/` agregan el contrato UI/UX o Backend/Data cuando se editan, se rankean o se toman.

## Calidad de solucion obligatoria

Toda task debe ejecutarse bajo `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.

Reglas:

- Resolver causa raiz antes que sintomas locales.
- Reutilizar primitives canonicas antes de crear rutas/helpers/readers/components nuevos.
- Si un workaround temporal es inevitable, documentar motivo, owner, condicion de retiro, verificacion y task/issue asociada.
- En dominios sensibles (`finance`, `payroll`, `auth`, `billing`, `cloud`, `data`, `production`, sync, migraciones, observabilidad), tratar la task como alto rigor aunque el diff sea pequeno.
- Al cerrar, dejar evidencia de por que la solucion no es un parche fragil.

---

## Zonas de carga progresiva

El template organiza la informacion en 5 zonas. Cada zona responde una pregunta diferente. Un agente debe leer en orden y solo avanzar a la siguiente zona cuando haya completado lo que la zona anterior le pide.

```
ZONE 0 — Identity & Triage         "Que task es y puedo tomarla?"
ZONE 1 — Context & Constraints      "Que necesito entender antes de planificar?"
ZONE 2 — Plan Mode                  "Cual es mi plan y esta aprobado?"
ZONE 3 — Execution Spec             "Que construyo exactamente, slice por slice?"
ZONE 4 — Verification & Closing     "Como compruebo que termine y que actualizo?"
```

### Regla de lectura secuencial para agentes

1. **Leer Zone 0.** Si `Lifecycle = complete` -> STOP, la task ya cerro. Si `Blocked by` tiene items -> STOP, no es ejecutable aun.
2. **Leer Zone 1.** Abrir y leer cada documento listado en `Architecture Alignment` y `Normative Docs`. Si algun doc no existe en el repo -> reportar antes de continuar. Crear branch: `task/TASK-###-short-slug`.
3. **Tomar ownership operativo.** Antes del primer cambio de codigo o de docs de la task:
   - mover el archivo a `docs/tasks/in-progress/`
   - cambiar `Lifecycle` a `in-progress`
   - actualizar `docs/tasks/README.md`
   - registrar en `Handoff.md` que la task fue tomada
4. **Ejecutar Zone 2** (Plan Mode). Producir el plan. Commitear `plan.md` al branch. Aplicar regla de checkpoint. **Zone 2 la ejecuta el agente que toma la task, no se llena al crearla.**
5. **Leer Zone 3** solo despues de que el plan este aprobado (o auto-aprobado). Ejecutar slice por slice.
6. **Ejecutar Zone 4** al cerrar cada slice y al cerrar la task completa.

> Para tasks `umbrella` o `policy`: el agente salta Zone 2 y Zone 3. Su trabajo es Zone 0 -> Zone 1 -> Acceptance Criteria.

---

## Semantica de Status

Usar estos campos dentro de `## Status`:

- `Lifecycle`: `to-do`, `in-progress`, `complete`
- `Priority`: `P0`, `P1`, `P2`, `P3`
- `Impact`: `Muy alto`, `Alto`, `Medio`
- `Effort`: `Bajo`, `Medio`, `Alto`
- `Type`: `implementation`, `umbrella`, `policy`
- `Execution profile`: `standard`, `ui-ux`, `backend-data`
- `UI impact`: `none`, `copy`, `layout`, `interaction`, `motion`, `primitive`, `flow`
- `Backend impact`: `none`, `api`, `db`, `migration`, `command`, `reader`, `sync`, `cron`, `webhook`, `integration`
- `Epic`: `EPIC-###` cuando la task pertenece a un programa cross-domain; `optional` cuando es standalone
- `Status real`: `Diseno`, `Parcial`, `Avanzada`, `Cerrada`, `Referencia`
- `Rank`: posicion actual en backlog operativo
- `Domain`: modulo o area principal
- `Blocked by`: lista de TASK-### que deben completarse antes, o `none`
- `Branch`: `task/TASK-###-short-slug`

Reglas:

- `TASK-###` no cambia cuando cambia el backlog
- `Rank` si puede cambiar
- `Lifecycle` cambia cuando el archivo se mueve entre `to-do/`, `in-progress/` y `complete/`
- `Lifecycle` dentro del markdown y la carpeta donde vive el archivo deben decir lo mismo; si no coinciden, la task esta mal cerrada
- `Status real` describe madurez de runtime, no solo estado administrativo
- `Checkpoint` y `Mode` se derivan automaticamente de Priority x Effort (ver tablas abajo) — el agente los calcula al tomar la task, no se declaran en el archivo
- una task no puede declararse "terminada" ante el usuario mientras siga en `in-progress/` o con `Lifecycle: in-progress`

## Task Contract Linter

TASK-926 agrega `pnpm task:lint` como enforcement mecanico del contrato de tasks.

Uso canonico:

- `pnpm task:lint` — revisa el backlog en modo report; `complete/` historico queda exento de deuda activa.
- `pnpm task:lint --active` — revisa solo `to-do/` + `in-progress/` creadas bajo el contrato
  TASK-926+; es el indicador de deuda operativa viva post-adopcion.
- `pnpm task:lint --task TASK-###` — revision focal de una task; errores estructurales bloquean.
- `pnpm task:lint --changed` — revision rapida para PRs; errores estructurales bloquean y es el modo usado por CI.
- `pnpm task:lint --format json` — salida consumible por workflow/dashboard.
- `pnpm task:lint --strict` — warnings tambien bloquean; reservado para flips post-saneo.

Reglas V1:

- `Lifecycle` debe coincidir con la carpeta (`to-do`, `in-progress`, `complete`) y es `error`.
- Las tasks formato template deben mantener las secciones canonicas, `### Files owned`,
  `Acceptance Criteria` con checkboxes y rollout no vacio para `implementation`.
- Tasks `CODEX_TASK_*` y formatos pre-template quedan legacy-exempt de reglas
  estructurales.
- Tasks en `complete/` previas al contrato se tratan como historico: no cuentan como
  deuda activa salvo que se modifiquen (`--changed`) o se revisen explicitamente
  con `--task TASK-###`.
- Tasks activas pre-TASK-926 no cuentan como deuda activa global; al ejecutarlas o tocarlas
  se revisan con `--task TASK-###` / `--changed` y el agente debe normalizarlas si corresponde.
- Paridad contra `TASK_ID_REGISTRY.md` y marcador "siguiente ID disponible" nacen como
  `warning` para rollout warn-first; no deben bloquear hasta que el registry este saneado.
- Tasks template con impacto UI/UX sin `## UI/UX Contract` y tasks template con impacto backend/data sin
  `## Backend/Data Contract` generan `warning` en rollout warn-first; no bloquean hasta que el backlog
  nuevo demuestre adopcion estable.

CI corre `.github/workflows/task-contract.yml` en modo `--changed` warn-first. No usar el
linter para reescribir backlog legacy ni para auto-mover archivos; reporta drift y el agente
lo corrige siguiendo este proceso.

## Greenhouse Operating Loop

El proceso de tasks forma parte del **Greenhouse Operating Loop**, el ciclo operativo canonico `intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff`.

Fuente canonica:

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

Ademas de `task:lint`, el repo tiene gates separados para la taxonomia operativa completa:

- `pnpm epic:lint` — revisa epics (`EPIC-###`) contra lifecycle/carpeta, secciones obligatorias, registry, next ID y exit criteria.
- `pnpm mini:lint` — revisa mini-tasks (`MINI-###`) contra lifecycle/carpeta, secciones obligatorias, registry, next ID y acceptance criteria.
- `pnpm ops:lint` — orquesta `task:lint`, `epic:lint` y `mini:lint` con los mismos flags (`--changed`, `--active`, `--strict`).

Regla V1:

- `task:lint` sigue siendo el gate especifico de tasks.
- `epic:lint` y `mini:lint` cubren estructura y paridad documental; no ejecutan cierre semantico profundo aun.
- `ops:lint --changed` es la primera pasada recomendada cuando una sesion toca `docs/tasks/`, `docs/epics/` o `docs/mini-tasks/`.
- Epics previos a `EPIC-018` y mini-tasks previas a `MINI-005` quedan tratados como deuda historica en barridos globales/active; si se modifican o se revisan con `--item`, deben normalizarse.
- Los checks de cierre end-to-end siguen viviendo en `docs:closure-check`, el protocolo de la task/epic/mini y la verificacion tecnica correspondiente.

---

## Derivacion de Checkpoint y Mode

El agente que toma la task deriva Checkpoint asi:

| Priority | Effort Bajo | Effort Medio | Effort Alto |
|---|---|---|---|
| P0 | `human` | `human` | `human` |
| P1 | `human` | `human` | `human` |
| P2 | `auto` | `auto` | `human` |
| P3 | `auto` | `auto` | `human` |

Regla simplificada: **`human` si Priority <= P1 o Effort = Alto. `auto` en cualquier otro caso.**

El agente que toma la task deriva Mode asi:

| Priority | Effort Bajo | Effort Medio | Effort Alto |
|---|---|---|---|
| P0 | `standard` | `standard` | `standard` |
| P1 | `standard` | `standard` | `standard` |
| P2 | `lightweight` | `standard` | `standard` |
| P3 | `lightweight` | `standard` | `standard` |

Regla simplificada: **`lightweight` si Priority >= P2 y Effort = Bajo. `standard` en cualquier otro caso.**

Si hay duda, usar `standard` y `human`. Es mas barato revisar un plan que revertir codigo.

---

## Plan Mode Protocol

### Que es

Plan Mode es la fase obligatoria (para tasks `implementation`) donde el agente evalua la task, descubre el estado real del repo, y produce un plan concreto antes de escribir una sola linea de codigo. Pensar primero, ejecutar despues.

### Fases

```
DISCOVERY -> PLAN -> STOP CHECKPOINT -> EXECUTION -> VERIFICATION
```

### Phase 1 — Discovery

El agente DEBE hacer estas acciones antes de producir un plan:

1. Leer `project_context.md` y `Handoff.md`
2. Leer cada documento listado en `Architecture Alignment` y `Normative Docs`
3. Explorar los archivos listados en `Files owned` — confirmar que existe, que no
4. Explorar los archivos listados en `Depends on` — confirmar que tablas, schemas, types existen
5. Si la task tiene `Current Repo State`, validar que las afirmaciones siguen siendo ciertas
6. **Access model check** — si la task toca permisos, menú, navegación, Home, page guards, tabs o surfaces por rol, verificar explícitamente qué parte vive en:
   - `routeGroups`
   - `views` / `authorizedViews` / `view_code`
   - `entitlements` / `module + capability + action + scope`
   - `startup policy`
   Registrar en Discovery si la solución afecta uno o varios planos. No asumir que `views` son la única capa de acceso.
7. **ADR check** — revisar `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` y `docs/architecture/DECISIONS_INDEX.md` cuando la task cambie un contrato compartido. Registrar:
   - ADR existente que gobierna el cambio, o
   - ADR nuevo/propuesto requerido antes de implementar, o
   - razon por la que no aplica ADR.
   Si la task cambia source of truth, schema compartido, access model, auth/session, finance/payroll/accounting semantics, events/outbox/webhooks, APIs externas, cloud/deploy/secrets, UI platform o runtime projections compartidas, el ADR check es obligatorio.
8. **Skill scan** — consultar skills disponibles en el entorno del agente a nivel global o de repo. Leer cada skill relevante antes de escribir codigo que la necesite. Registrar en Discovery summary que skills se usaran y para que slice.
9. **Subagent assessment** — evaluar si la task se beneficia de delegacion a subagentes (ver protocolo abajo). Registrar la decision en el plan: ejecucion secuencial por el agente principal, o fork con coordinacion.
10. **UI/UX profile check** — si `Execution profile: ui-ux` o `UI impact != none`, completar `## UI/UX Contract` antes de escribir JSX/copy visible:
   - decidir reuse / extend / new primitive + variant/kind;
   - resolver Composition Shell, Adaptive Card density, Floating Surface/Sidecar/Dialog si aplica;
   - declarar estados visuales obligatorios;
   - declarar copy source;
   - declarar motion/microinteracciones y reduced-motion fallback;
   - declarar GVC scenario/viewports y check de scroll horizontal.
11. **Backend/Data profile check** — si `Execution profile: backend-data` o `Backend impact != none`, completar `## Backend/Data Contract` antes de escribir backend/data:
   - nombrar source of truth, contrato programatico y consumidores;
   - declarar invariantes de datos, tenant/space boundary y access/capability gates;
   - declarar idempotency, concurrencia, transaction boundary, audit/outbox/history si aplica;
   - declarar migration/backfill/seed posture, default state, flags/cutover y rollback;
   - declarar error contract, sensitive data posture, rate-limit/replay/circuit breaker cuando aplique;
   - declarar evidencia runtime/DB/integracion y production verification sequence proporcional al riesgo.

**Output de Discovery:** un bloque de texto (o seccion en `plan.md`) que lista:
- Archivos encontrados vs. esperados
- Discrepancias entre la task y el repo real
- Dependencias satisfechas vs. bloqueantes
- Cualquier contradiccion detectada entre la task y la arquitectura
- **Solution quality assessment** — causa raiz identificada, primitive canonica a reutilizar/crear y por que no se hara un parche local
- **Access model resolution** — si el cambio toca acceso, dejar explicito si impacta `views`, `entitlements`, `startup policy`, `routeGroups` o una combinacion
- **ADR resolution** — ADR existente, ADR nuevo/propuesto o razon explicita para no requerir ADR
- **Skills identificadas** — cuales se usaran y para que slice
- **Subagent decision** — secuencial o fork, y justificacion
- **UI/UX decision** — si aplica: nivel `ui-lite|ui-standard|ui-platform`, primitive/pattern elegido, estados, motion/copy/GVC y deuda visual conocida
- **Backend/Data decision** — si aplica: nivel `backend-lite|backend-standard|backend-critical`, source of truth, contract surface, invariantes, migracion/rollback, seguridad/acceso y evidencia runtime requerida

### Phase 2 — Plan

Con el output de Discovery, el agente produce un `plan.md` que incluye:

```md
# Plan — TASK-### [Short Title]

## Discovery summary
[Hallazgos de la fase anterior, discrepancias, dependencias confirmadas]

## Access model
[Si aplica: que capa de acceso toca la task]
- `routeGroups`: ...
- `views` / `authorizedViews`: ...
- `entitlements`: ...
- `startup policy`: ...
- Decision de diseño: ...

## Architecture decision
[Si aplica: ADR existente o nuevo/propuesto]
- ADR existente:
- ADR nuevo/propuesto:
- Status requerido antes de implementar:
- Razon si no aplica:

## Backend/data contract
[Si aplica: source of truth, contract surface, data invariants, access/auth, idempotency/concurrency, migration/backfill/rollback, external coordination y runtime evidence]

## Skills
[Que skills se usan y en que slice]
- Slice 1: `greenhouse-backend` skill
- Slice 3: `greenhouse-dev` skill
- (ninguna) -> no aplican skills especializadas

## Subagent strategy
[`sequential` | `fork`]
- Si `sequential`: el agente principal ejecuta todos los slices en orden
- Si `fork`: descripcion de que subagentes se crean, que slices toman, y reglas de coordinacion

## Execution order
1. [Archivo o cambio concreto — Slice X]
2. [Archivo o cambio concreto — Slice X]
3. [Archivo o cambio concreto — Slice Y]
...

## Files to create
- `src/...`

## Files to modify
- `src/...` — que cambia y por que

## Files to delete
- (si aplica)

## Risk flags
- [Anything the plan touches that impacts other tasks or surfaces]

## Open questions
- [Decisions the agent cannot resolve alone]
```

El `plan.md` se commitea al branch de la task en `docs/tasks/plans/TASK-###-plan.md`. Sirve como auditoria y como handoff si otro agente retoma.

### Phase 3 — STOP Checkpoint

Regla de aprobacion (derivada de Priority x Effort):

| Condicion | Checkpoint |
|---|---|
| `Priority <= P1` (P0 o P1) | **Humano aprueba** — el agente espera confirmacion explicita |
| `Effort = Alto` (cualquier priority) | **Humano aprueba** — el blast radius justifica revision |
| `Priority >= P2` **y** `Effort <= Medio` | **Auto-aprobable** — el agente commitea `plan.md` y continua |

Cuando el checkpoint es humano:
- El agente presenta el plan y espera. No escribe codigo.
- Si el humano pide cambios al plan, el agente actualiza `plan.md` y vuelve a presentar.
- Si el humano aprueba, el agente pasa a Execution.

Cuando el checkpoint es auto-aprobable:
- El agente commitea `plan.md` al branch con mensaje: `docs: plan for TASK-### (auto-approved, P2+ low-effort)`
- Continua a Execution sin esperar.

### Phase 4 — Execution

- Correr `pnpm lint` y `pnpm tsc --noEmit` como baseline antes del primer cambio. **Si hay errores preexistentes:** registrarlos como "preexisting errors" y no fixearlos salvo que esten en archivos de `Files owned`.
- Ejecutar slice por slice segun el orden del plan
- **Antes de cada slice:** si el plan indica una skill para ese slice, re-leer la skill (el agente puede haber perdido contexto entre slices). Seguir los patterns de la skill, no improvisar.
- **Si el plan indica `fork`:** delegar slices a subagentes segun el Subagent Protocol. El agente principal coordina, no ejecuta los slices delegados.
- Despues de cada slice:
  - Correr `pnpm lint` y `pnpm tsc --noEmit`
  - Si hay errores -> fix antes de avanzar al siguiente slice
  - Commit con mensaje: `feat(TASK-###): slice N — [descripcion corta]`
- Si el agente descubre durante la ejecucion que el plan necesita cambiar:
  - Actualizar `plan.md` con un `## Delta YYYY-MM-DD`
  - Si el cambio es **material** -> aplicar regla de checkpoint de nuevo
  - Si el cambio es **cosmetico** -> continuar

**Cambio material** (re-checkpoint): nueva tabla o schema, nueva API route, nuevo archivo de arquitectura, cambio en `Dependencies & Impact`, cambio que afecta `Files owned` de otra task activa.

**Cambio cosmetico** (continuar): renombrar variable, ajustar UI copy, reordenar slices, agregar un archivo helper que no cambia la surface publica.

### Phase 5 — Verification

- Correr todos los checks de `## Verification`
- Marcar acceptance criteria como completados
- Si la task dejo follow-ups -> crear issues o documentar en `## Follow-ups`
- Ejecutar el cierre documental y de lifecycle. La task sigue abierta hasta completar TODO este bloque:
  1. cambiar `Lifecycle` a `complete`
  2. mover el archivo a `docs/tasks/complete/`
  3. actualizar `docs/tasks/README.md`
  4. actualizar `Handoff.md`
  5. actualizar `changelog.md` si hubo cambio real de comportamiento, estructura o protocolo
  6. ejecutar el chequeo de impacto cruzado
- Si el trabajo implementado quedo listo pero falta alguno de los puntos anteriores, el estado correcto sigue siendo `in-progress`
- El agente no debe responder "listo", "cerrado" o equivalente mientras la task siga viva en `docs/tasks/in-progress/`

---

## Skill Protocol

Las skills son instrucciones especializadas que ensenan al agente como producir ciertos tipos de output con calidad profesional. Consultar skills disponibles en el entorno del agente a nivel global o de repo.

### Reglas

1. **Leer antes de ejecutar.** Leer la skill relevante ANTES de escribir codigo que lo necesite. No despues.
2. **Multiples skills pueden aplicar.** Si un slice necesita una skill de backend y otro de frontend, leer ambas.
3. **Skills del repo tienen prioridad** sobre skills globales si cubren el mismo tema — son mas especificas al proyecto.
4. **Registrar en el plan.** El `plan.md` debe listar que skills se usan y en que slice. Si no aplica ninguna, declarar "ninguna".
5. **No inventar patterns.** Si una skill define como producir un output, seguir ese pattern — no improvisar uno diferente.

---

## Subagent Protocol

### Cuando usar subagentes

El agente principal decide caso a caso durante Discovery. No todas las tasks se benefician de subagentes. La decision se registra en `plan.md` bajo `## Subagent strategy`.

**Usar subagentes (`fork`) cuando:**
- Los slices son independientes entre si (no comparten archivos en edicion simultanea)
- Los slices requieren skills diferentes (e.g., un slice es schema SQL y otro es UI components)
- El volumen de trabajo justifica la coordinacion overhead
- La task tiene Effort = Alto y slices claramente separables

**No usar subagentes (`sequential`) cuando:**
- Los slices tienen dependencia causal (slice 2 necesita el output de slice 1)
- Los archivos owned se solapan entre slices
- El effort es Bajo o Medio y la task es un flujo lineal
- La coordinacion costaria mas que la ejecucion secuencial

### Protocolo de fork

Cuando el agente principal decide usar subagentes:

1. **Definir contratos.** El plan.md debe especificar para cada subagente:
   - Que slice(s) toma
   - Que archivos puede crear o modificar (scope exclusivo — sin solapamiento)
   - Que interfaces debe respetar (types, API contracts, schemas ya definidos)
   - Que skill(s) debe leer antes de ejecutar
   - Que acceptance criteria le corresponden

2. **Regla de no-colision.** Dos subagentes NUNCA modifican el mismo archivo. Si un archivo necesita cambios de dos slices, el agente principal lo maneja secuencialmente o define un orden explicito.

3. **Consolidacion.** Despues de que los subagentes completen sus slices:
   - El agente principal corre `pnpm lint` y `pnpm tsc --noEmit` sobre el resultado combinado
   - El agente principal verifica que las interfaces entre slices son coherentes
   - El agente principal resuelve conflictos si los hay
   - Un solo PR consolida todo el trabajo — no PRs separados por subagente

4. **Context handoff.** Cada subagente recibe:
   - El `plan.md` completo (para contexto global)
   - Los docs de Architecture Alignment y Normative Docs relevantes a su slice
   - La seccion de `Detailed Spec` correspondiente a su slice
   - Las skills que necesita
   - Su scope de archivos exclusivo

### Ejemplo en plan.md

```md
## Subagent strategy
`fork` — 2 subagentes

### Subagent A — Backend (Slices 1-2)
- Files owned: `src/app/api/finance/`, `src/lib/finance/`
- Skills: `greenhouse-backend` (skill de repo)
- Reads: GREENHOUSE_ARCHITECTURE_V1, FINANCE_CANONICAL_360_V1
- Acceptance criteria: #1, #2, #3

### Subagent B — Frontend (Slices 3-4)
- Files owned: `src/views/greenhouse/finance/`, `src/components/greenhouse/finance/`
- Skills: `greenhouse-dev` (skill de repo)
- Reads: GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1, Nomenclatura_Portal_v3
- Acceptance criteria: #4, #5, #6

### Shared contract
- Type definitions: `src/types/finance.ts` (created by Subagent A, consumed by B)
- API routes: `POST /api/finance/calculate` (created by A, called by B)
- Subagent A executes first for shared types, then B proceeds
```

---

## Lightweight Mode

### Cuando aplica

Lightweight Mode aplica cuando `Priority >= P2` **y** `Effort = Bajo`. Son tasks contenidas: un fix de calculo, un ajuste de UI copy, un cambio de configuracion, un hotfix de un bug reportado.

### Que cambia

| Seccion | Modo standard | Lightweight |
|---|---|---|
| `Summary` | 2-4 lineas | 1-2 lineas |
| `Why This Task Exists` | Parrafo con contexto | 1 linea — "bug", "deuda", "gap" basta |
| `Architecture Alignment` | Docs + reglas | Solo si la task toca arquitectura. Si no: "No architectural impact" |
| `Normative Docs` | Lista de docs | Omitir si no hay docs especializados |
| `Current Repo State` | Already exists + Gap | Colapsar a 1-2 lineas por seccion |
| `Discovery checklist` | 7+ items | Los pasos 1-5 siguen obligatorios. Paso 6 (skill scan): solo si el output lo requiere. Paso 7 (subagent): siempre `sequential` |
| `plan.md` | Documento completo | Puede ser inline en el commit message: `docs: plan for TASK-### — [1-3 lineas]` |
| `Detailed Spec` | Seccion expandible | Puede omitirse si el Scope ya es suficiente |
| `Closing Protocol` | Items task-especificos | Handoff.md solo si hay impacto cross-task |

### Que NO cambia

- `Status` (Zone 0 completo)
- `Goal`
- `Dependencies & Impact` + `Files owned`
- `Scope` con slices (aunque sea un solo slice)
- `Out of Scope`
- `Acceptance Criteria`
- `Verification`

### Regla de escalacion

Si durante Discovery el agente descubre que la task es mas compleja de lo que el `Effort = Bajo` sugiere (toca mas archivos de los esperados, tiene dependencias no documentadas, requiere cambios de schema), debe:

1. Actualizar `Effort` al valor correcto
2. Re-derivar Checkpoint y Mode con la nueva combinacion Priority x Effort
3. Salir de Lightweight Mode si el nuevo Effort es Medio o Alto
4. Documentar la escalacion en el plan

---

## Cuando crear una task nueva

Crear una task nueva si:

- el trabajo abre una lane con objetivo propio
- necesita su propio bloque `Dependencies & Impact`
- tiene archivos owned diferenciables
- tiene criterios de aceptacion propios

Actualizar una task existente si:

- el trabajo es un slice mas de la misma lane
- el objetivo sigue siendo el mismo
- los archivos owned y dependencias no cambian de manera material

Reclasificar a spec y no dejarlo como task si:

- el documento ya no describe un backlog ejecutable
- fija arquitectura o contratos de dominio mas que slices implementables
- no tiene un gap operativo claro para ejecutar

---

## Checklist para quien escribe la task

- El titulo deja claro el objetivo sin leer todo el documento
- La task tiene un solo objetivo principal
- `Type` refleja correctamente si es implementation, umbrella o policy
- `Dependencies & Impact` nombra tasks y archivos reales con paths
- `Files owned` es lo bastante concreto como para detectar choques entre tasks
- `Acceptance Criteria` permite decidir cierre sin interpretacion subjetiva
- `Out of Scope` evita mezclar refactor, infraestructura y producto en la misma lane
- `Current Repo State` refleja el estado real, no el ideal
- Si la task contradice arquitectura, primero corregir la task o documentar la nueva decision
- La `Detailed Spec` esta separada de la navegacion rapida (Zones 0-1)

## Checklist para quien toma la task (agente)

- Leer Zone 0 completa antes de cualquier otra cosa
- Derivar Checkpoint y Mode de Priority x Effort (ver tablas arriba)
- Seguir la regla de lectura secuencial: Zone 0 -> 1 -> 2 -> 3 -> 4
- Para `implementation`: ejecutar Plan Mode completo antes de escribir codigo
- Para `umbrella` o `policy`: saltar Zone 2 y Zone 3, ir directo a Acceptance Criteria
- NO leer Zone 3 (Execution Spec) hasta que el plan este aprobado
- Ejecutar Discovery checklist completo — no saltar items
- **Skill scan obligatorio** — consultar skills disponibles en el entorno (global o repo) ANTES de escribir codigo
- **Subagent assessment obligatorio** — decidir `sequential` o `fork` y documentar en plan.md
- Commitear `plan.md` al branch SIEMPRE, incluso en auto-approved
- Despues de cada slice: lint + type-check + commit
- Si algo cambio materialmente durante ejecucion -> actualizar `plan.md` con Delta
- Si el Delta es material (nueva tabla, nueva ruta) -> re-aplicar regla de checkpoint
- Si se usaron subagentes -> el agente principal consolida y corre verificacion completa sobre el resultado combinado
- Al cerrar: ejecutar cierre segun `CLAUDE.md` § Task Lifecycle Protocol
- Nunca merge directo a `main` o `develop`

---

## Migracion desde CODEX_TASK format

Los `CODEX_TASK_*` existentes siguen vigentes como legacy. Para migrar uno al formato actual:

1. Mapear `Resumen` -> `Summary`
2. Mapear `Contexto` -> `Why This Task Exists` + `Architecture Alignment` + `Normative Docs`
3. Mapear `Dependencias` -> `Dependencies & Impact` + `Current Repo State`
4. Mapear `Schema/Architecture` + vista-by-vista specs + API routes -> `Detailed Spec` (Zone 3)
5. Mapear `Acceptance criteria` -> `Acceptance Criteria`
6. Mapear `Notas para el agente` -> items de Discovery
7. Mapear `File structure` -> `Files owned`
8. Agregar `Type` segun naturaleza de la task
9. Derivar Checkpoint y Mode de Priority x Effort
