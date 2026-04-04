# TASK_TEMPLATE v2

## Objetivo

Plantilla canónica para crear y leer tasks del proyecto sin depender de memoria conversacional.

v2 introduce dos mejoras estructurales:

1. **Zonas de carga progresiva** — el documento está ordenado para que un agente pueda decidir si toma la task, planificar su ejecución, y ejecutar slice por slice, sin necesidad de cargar todo el archivo de golpe.
2. **Plan Mode integrado** — protocolo formal de discovery → plan → checkpoint → ejecución → verificación, con reglas de aprobación que varían según prioridad y effort.

Las tasks nuevas deben usar IDs estables `TASK-###`.
Los `CODEX_TASK_*` existentes siguen vigentes como legacy hasta su migración.

---

## Convención de ID y nombre

- ID canónico para tasks nuevas: `TASK-###`
- El `###` es un identificador estable, no el orden mutable del backlog
- El orden actual de ejecución debe vivir en `Rank` y en el panel operativo, no en renumeraciones
- Nombre de archivo recomendado:
  - `docs/tasks/to-do/TASK-003-finance-dashboard-calculation-correction.md`
  - `docs/tasks/in-progress/TASK-003-finance-dashboard-calculation-correction.md`
  - `docs/tasks/complete/TASK-003-finance-dashboard-calculation-correction.md`
- Título H1 recomendado:
  - `# TASK-003 — Finance Dashboard Calculation Correction`
- Título de issue recomendado:
  - `[TASK-003] Finance Dashboard Calculation Correction`
- Si la task nace desde un brief legacy, agregar:
  - `- Legacy ID: CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1`
- Consultar `docs/tasks/TASK_ID_REGISTRY.md` para reservar el siguiente ID disponible antes de crear una task nueva
- Branch convention: `task/TASK-###-short-slug` (e.g., `task/TASK-003-finance-dashboard-fix`)

---

## Zonas de carga progresiva

El template organiza la información en 5 zonas. Cada zona responde una pregunta diferente. Un agente debe leer en orden y solo avanzar a la siguiente zona cuando haya completado lo que la zona anterior le pide.

```
ZONE 0 — Identity & Triage         "¿Qué task es y puedo tomarla?"
ZONE 1 — Context & Constraints      "¿Qué necesito entender antes de planificar?"
ZONE 2 — Plan Mode                  "¿Cuál es mi plan y está aprobado?"
ZONE 3 — Execution Spec             "¿Qué construyo exactamente, slice por slice?"
ZONE 4 — Verification & Closing     "¿Cómo compruebo que terminé y qué actualizo?"
```

### Regla de lectura secuencial para agentes

1. **Leer Zone 0.** Si `Lifecycle = complete` → STOP, la task ya cerró. Si `Blocked by` tiene items → STOP, no es ejecutable aún.
2. **Leer Zone 1.** Abrir y leer cada documento listado en `Architecture Alignment` y `Normative Docs`. Si algún doc no existe en el repo → reportar antes de continuar. Crear branch: `task/TASK-###-short-slug`.
3. **Ejecutar Zone 2** (Plan Mode). Producir el plan. Commitear `plan.md` al branch. Aplicar regla de checkpoint.
4. **Leer Zone 3** solo después de que el plan esté aprobado (o auto-aprobado). Ejecutar slice por slice.
5. **Ejecutar Zone 4** al cerrar cada slice y al cerrar la task completa.

---

## Semántica de Status

Usar estos campos dentro de `## Status`:

- `Lifecycle`: `to-do`, `in-progress`, `complete`
- `Priority`: `P0`, `P1`, `P2`, `P3`
- `Impact`: `Muy alto`, `Alto`, `Medio`
- `Effort`: `Bajo`, `Medio`, `Alto`
- `Status real`: `Diseño`, `Parcial`, `Avanzada`, `Cerrada`, `Referencia`
- `Rank`: posición actual en backlog operativo
- `Domain`: módulo o área principal
- `Checkpoint`: `human` o `auto` — derivado de Priority × Effort (ver tabla abajo)
- `Blocked by`: lista de TASK-### que deben completarse antes, o `none`
- `Branch`: `task/TASK-###-short-slug`

Reglas:

- `TASK-###` no cambia cuando cambia el backlog
- `Rank` sí puede cambiar
- `Lifecycle` cambia cuando el archivo se mueve entre `to-do/`, `in-progress/` y `complete/`
- `Status real` describe madurez de runtime, no solo estado administrativo

---

## Plan Mode Protocol

### Qué es

Plan Mode es la fase obligatoria donde el agente evalúa la task, descubre el estado real del repo, y produce un plan concreto antes de escribir una sola línea de código. Equivale al "Plan Mode" de Claude Code / Codex: pensar primero, ejecutar después.

### Fases

```
┌─────────────┐     ┌────────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  DISCOVERY   │────▶│    PLAN     │────▶│  STOP    │────▶│  EXECUTION   │────▶│ VERIFICATION │
│              │     │            │     │CHECKPOINT│     │              │     │              │
│ Leer docs    │     │ Escribir   │     │          │     │ Slice por    │     │ Lint, test,  │
│ Explorar repo│     │ plan.md    │     │ Aprobado?│     │ slice        │     │ handoff      │
│ Listar files │     │ en branch  │     │          │     │              │     │              │
└─────────────┘     └────────────┘     └──────────┘     └──────────────┘     └─────────────┘
```

### Phase 1 — Discovery

El agente DEBE hacer estas acciones antes de producir un plan:

1. Leer `project_context.md` y `Handoff.md`
2. Leer cada documento listado en `Architecture Alignment` y `Normative Docs`
3. Explorar los archivos listados en `Files owned` — confirmar qué existe, qué no
4. Explorar los archivos listados en `Depends on` — confirmar qué tablas, schemas, types existen
5. Correr `pnpm lint` y `pnpm tsc --noEmit` para detectar el estado de salud del repo. **Si hay errores preexistentes:** registrarlos en Discovery summary como "preexisting errors", no fixearlos salvo que estén en archivos de `Files owned`. El objetivo es tener una baseline para no introducir errores nuevos.
6. Si la task tiene `Current Repo State`, validar que las afirmaciones siguen siendo ciertas
7. **Skill scan** — identificar qué tipos de output produce la task (e.g., `.docx`, `.pptx`, `.xlsx`, `.pdf`, frontend components, API routes, diagrams) y buscar skills aplicables:
   - Entorno global: listar `/mnt/skills/public/`, `/mnt/skills/examples/`, `/mnt/skills/user/` (si existe)
   - Repo local: buscar `docs/skills/`, `.skills/`, o cualquier directorio de skills documentado en `project_context.md`
   - Leer el `SKILL.md` de cada skill relevante **antes de escribir código que la necesite** — no después
   - Si múltiples skills aplican (e.g., `docx` + `frontend-design`), leer todas
   - Registrar en Discovery summary qué skills se usarán y para qué slice
8. **Subagent assessment** — evaluar si la task se beneficia de delegación a subagentes (ver protocolo abajo). Registrar la decisión en el plan: ejecución secuencial por el agente principal, o fork con coordinación.

**Output de Discovery:** un bloque de texto (o sección en `plan.md`) que lista:
- Archivos encontrados vs. esperados
- Discrepancias entre la task y el repo real
- Dependencias satisfechas vs. bloqueantes
- Cualquier contradicción detectada entre la task y la arquitectura
- **Skills identificadas** — cuáles se usarán, para qué slice, path del SKILL.md leído
- **Subagent decision** — secuencial o fork, y justificación

### Phase 2 — Plan

Con el output de Discovery, el agente produce un `plan.md` que incluye:

```md
# Plan — TASK-### [Short Title]

## Discovery summary
[Hallazgos de la fase anterior, discrepancias, dependencias confirmadas]

## Skills
[Qué skills se usan y en qué slice]
- Slice 1: `docx` skill → SKILL.md path leído
- Slice 3: `frontend-design` skill → SKILL.md path leído
- (ninguna) → no aplican skills especializadas

## Subagent strategy
[`sequential` | `fork`]
- Si `sequential`: el agente principal ejecuta todos los slices en orden
- Si `fork`: descripción de qué subagentes se crean, qué slices toman, y reglas de coordinación

## Execution order
1. [Archivo o cambio concreto — Slice X]
2. [Archivo o cambio concreto — Slice X]
3. [Archivo o cambio concreto — Slice Y]
...

## Files to create
- `src/...`

## Files to modify
- `src/...` — qué cambia y por qué

## Files to delete
- (si aplica)

## Risk flags
- [Anything the plan touches that impacts other tasks or surfaces]

## Open questions
- [Decisions the agent cannot resolve alone]
```

El `plan.md` se commitea al branch de la task en `docs/tasks/plans/TASK-###-plan.md`. Sirve como auditoría y como handoff si otro agente retoma.

### Phase 3 — STOP Checkpoint

Regla de aprobación:

| Condición | Checkpoint |
|---|---|
| `Priority ≤ P1` (P0 o P1) | **Humano aprueba** — el agente espera confirmación explícita |
| `Effort = Alto` (cualquier priority) | **Humano aprueba** — el blast radius justifica revisión |
| `Priority ≥ P2` **y** `Effort ≤ Medio` | **Auto-aprobable** — el agente commitea `plan.md` y continúa |

Cuando el checkpoint es humano:
- El agente presenta el plan y espera. No escribe código.
- Si el humano pide cambios al plan, el agente actualiza `plan.md` y vuelve a presentar.
- Si el humano aprueba, el agente pasa a Execution.

Cuando el checkpoint es auto-aprobable:
- El agente commitea `plan.md` al branch con mensaje: `docs: plan for TASK-### (auto-approved, P2+ low-effort)`
- Continúa a Execution sin esperar.

### Phase 4 — Execution

- Ejecutar slice por slice según el orden del plan
- **Antes de cada slice:** si el plan indica una skill para ese slice, re-leer el SKILL.md (el agente puede haber perdido contexto entre slices). Seguir los patterns de la skill, no improvisar.
- **Si el plan indica `fork`:** delegar slices a subagentes según el Subagent Protocol. El agente principal coordina, no ejecuta los slices delegados.
- Después de cada slice:
  - Correr `pnpm lint` y `pnpm tsc --noEmit`
  - Si hay errores → fix antes de avanzar al siguiente slice
  - Commit con mensaje: `feat(TASK-###): slice N — [descripción corta]`
- Si el agente descubre durante la ejecución que el plan necesita cambiar:
  - Actualizar `plan.md` con un `## Delta YYYY-MM-DD`
  - Si el cambio es **material** → aplicar regla de checkpoint de nuevo
  - Si el cambio es **cosmético** → continuar

**Cambio material** (re-checkpoint): nueva tabla o schema, nueva API route, nuevo archivo de arquitectura, cambio en `Dependencies & Impact`, cambio que afecta `Files owned` de otra task activa.

**Cambio cosmético** (continuar): renombrar variable, ajustar UI copy, reordenar slices, agregar un archivo helper que no cambia la surface pública.

### Phase 5 — Verification

- Correr todos los checks de `## Verification`
- Actualizar `Handoff.md` con lo que cambió
- Actualizar `changelog.md` si hubo impacto en arquitectura
- Marcar acceptance criteria como completados
- Mover archivo de `to-do/` o `in-progress/` a la carpeta correspondiente
- Si la task dejó follow-ups → crear issues o documentar en `## Follow-ups`

---

## Skill Protocol

### Qué es

Las skills son instrucciones especializadas que enseñan al agente cómo producir ciertos tipos de output con calidad profesional. Cada skill tiene un `SKILL.md` con best practices, patrones, errores comunes, y dependencias.

Las skills pueden vivir en:
- **Entorno global:** `/mnt/skills/public/`, `/mnt/skills/examples/`, `/mnt/skills/user/`
- **Repo local:** `docs/skills/`, `.skills/`, o cualquier directorio documentado en `project_context.md`

### Cuándo usar skills

Un agente DEBE buscar y leer skills cuando la task produce alguno de estos outputs:

| Output | Skill probable | Ejemplo |
|---|---|---|
| Word document (.docx) | `docx` | Generar un reporte, spec, o contrato |
| Presentation (.pptx) | `pptx` | Crear un deck de pitch o status |
| Spreadsheet (.xlsx) | `xlsx` | Generar un template financiero o tracker |
| PDF | `pdf` | Crear o llenar un PDF |
| Frontend UI | `frontend-design` | Componentes, páginas, dashboards |
| Diagrams / flowcharts | `canvas-design` o herramienta de diagrama | Arquitectura, flujos, wireframes |
| MCP server | `mcp-builder` | Integración con servicio externo |

Esta lista no es exhaustiva. El agente debe escanear los directorios de skills disponibles y evaluar cuáles aplican a los entregables de la task.

### Reglas

1. **Leer antes de ejecutar.** Leer el `SKILL.md` relevante ANTES de escribir código que lo necesite. No después.
2. **Múltiples skills pueden aplicar.** Si un slice necesita `docx` y otro necesita `frontend-design`, leer ambas.
3. **Skills del repo tienen prioridad** sobre skills globales si cubren el mismo tema — son más específicas al proyecto.
4. **Registrar en el plan.** El `plan.md` debe listar qué skills se usan y en qué slice. Si no aplica ninguna, declarar "ninguna".
5. **No inventar patterns.** Si una skill define cómo crear un .docx, seguir ese pattern — no improvisar uno diferente.

---

## Subagent Protocol

### Qué es

Cuando una task tiene slices que pueden ejecutarse en paralelo o que requieren especialización diferente, el agente principal puede delegar slices a subagentes. El agente principal actúa como coordinador: reparte trabajo, define contratos de interfaz, y consolida los resultados.

### Cuándo usar subagentes

El agente principal decide caso a caso durante Discovery (paso 8). No todas las tasks se benefician de subagentes. La decisión se registra en `plan.md` bajo `## Subagent strategy`.

**Usar subagentes (`fork`) cuando:**
- Los slices son independientes entre sí (no comparten archivos en edición simultánea)
- Los slices requieren skills diferentes (e.g., un slice es schema SQL y otro es UI components)
- El volumen de trabajo justifica la coordinación overhead
- La task tiene Effort = Alto y slices claramente separables

**No usar subagentes (`sequential`) cuando:**
- Los slices tienen dependencia causal (slice 2 necesita el output de slice 1)
- Los archivos owned se solapan entre slices
- El effort es Bajo o Medio y la task es un flujo lineal
- La coordinación costaría más que la ejecución secuencial

### Protocolo de fork

Cuando el agente principal decide usar subagentes:

1. **Definir contratos.** El plan.md debe especificar para cada subagente:
   - Qué slice(s) toma
   - Qué archivos puede crear o modificar (scope exclusivo — sin solapamiento)
   - Qué interfaces debe respetar (types, API contracts, schemas ya definidos)
   - Qué skill(s) debe leer antes de ejecutar
   - Qué acceptance criteria le corresponden

2. **Regla de no-colisión.** Dos subagentes NUNCA modifican el mismo archivo. Si un archivo necesita cambios de dos slices, el agente principal lo maneja secuencialmente o define un orden explícito.

3. **Consolidación.** Después de que los subagentes completen sus slices:
   - El agente principal corre `pnpm lint` y `pnpm tsc --noEmit` sobre el resultado combinado
   - El agente principal verifica que las interfaces entre slices son coherentes
   - El agente principal resuelve conflictos si los hay
   - Un solo PR consolida todo el trabajo — no PRs separados por subagente

4. **Context handoff.** Cada subagente recibe:
   - El `plan.md` completo (para contexto global)
   - Los docs de Architecture Alignment y Normative Docs relevantes a su slice
   - La sección de `Detailed Spec` correspondiente a su slice
   - Las skills que necesita
   - Su scope de archivos exclusivo

### Ejemplo en plan.md

```md
## Subagent strategy
`fork` — 2 subagentes

### Subagent A — Backend (Slices 1–2)
- Files owned: `src/app/api/finance/`, `src/lib/finance/`
- Skills: ninguna
- Reads: GREENHOUSE_ARCHITECTURE_V1, FINANCE_CANONICAL_360_V1
- Acceptance criteria: #1, #2, #3

### Subagent B — Frontend (Slices 3–4)
- Files owned: `src/views/greenhouse/finance/`, `src/components/greenhouse/finance/`
- Skills: `frontend-design` → /mnt/skills/public/frontend-design/SKILL.md
- Reads: GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1, Nomenclatura_Portal_v3
- Acceptance criteria: #4, #5, #6

### Shared contract
- Type definitions: `src/types/finance.ts` (created by Subagent A, consumed by B)
- API routes: `POST /api/finance/calculate` (created by A, called by B)
- Subagent A executes first for shared types, then B proceeds
```

---

## Cuándo crear una task nueva

Crear una task nueva si:

- el trabajo abre una lane con objetivo propio
- necesita su propio bloque `Dependencies & Impact`
- tiene archivos owned diferenciables
- tiene criterios de aceptación propios

Actualizar una task existente si:

- el trabajo es un slice más de la misma lane
- el objetivo sigue siendo el mismo
- los archivos owned y dependencias no cambian de manera material

Reclasificar a spec y no dejarlo como task si:

- el documento ya no describe un backlog ejecutable
- fija arquitectura o contratos de dominio más que slices implementables
- no tiene un gap operativo claro para ejecutar

---

## Campos mínimos obligatorios

Toda task nueva debe incluir las secciones de Zone 0 a Zone 4. Las secciones opcionales pueden omitirse si no aplican.

---

## Template canónico

```md
# TASK-### — [Short Title]

<!-- ═══════════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     Pregunta: "¿Qué task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `[finance|hr|platform|identity|ui|data|ops|content|crm]`
- Checkpoint: `human` | `auto`
- Blocked by: `[TASK-XXX, or "none"]`
- Branch: `task/TASK-###-short-slug`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

[Qué cambia en 2–4 líneas y por qué importa. Esto es lo único que lee alguien que está escaneando el backlog.]

## Why This Task Exists

[Problema actual, deuda, contradicción o gap real. No repite el summary — explica la raíz.]

## Goal

- [Resultado 1]
- [Resultado 2]
- [Resultado 3]

<!-- ═══════════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     Pregunta: "¿Qué necesito entender antes de planificar?"
     El agente lee cada doc referenciado aquí. Si un doc no existe
     en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- [arquitectura especializada aplicable]

Reglas obligatorias:

- [regla 1 — e.g., "`space_id` on all queries"]
- [regla 2 — e.g., "metrics from ICO Engine only, never calculate inline"]
- [regla 3 — e.g., "EO-XXX-XXXX ID conventions"]

## Normative Docs

[Solo si hay documentos adicionales que el agente DEBE leer y que no son arquitectura. E.g., specs de UI, brand guidelines, external API docs.]

- `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md` — UI contract
- `Greenhouse_Nomenclatura_Portal_v3.md` — design tokens, UX writing

## Dependencies & Impact

### Depends on

- [task, tabla, schema, API o spec — con path real]

### Blocks / Impacts

- [otras tasks o superficies afectadas]

### Files owned

- `src/...`
- `docs/...`

## Current Repo State

### Already exists

- [foundation ya materializada — con paths reales]

### Gap

- [qué sigue roto, faltante o ambiguo]

<!-- ═══════════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Pregunta: "¿Cuál es mi plan y está aprobado?"
     El agente ejecuta Discovery, produce plan.md, y aplica la
     regla de checkpoint (campo `Checkpoint` en Zone 0).
     NO avanzar a Zone 3 sin plan aprobado / auto-aprobado.
     ═══════════════════════════════════════════════════════════════ -->

## Plan Mode

### Discovery checklist

- [ ] Leí `project_context.md` y `Handoff.md`
- [ ] Leí cada doc de `Architecture Alignment` y `Normative Docs`
- [ ] Exploré `Files owned` — confirmé qué existe y qué no
- [ ] Exploré `Depends on` — confirmé tablas, schemas, types
- [ ] Corrí `pnpm lint` y `pnpm tsc --noEmit`
- [ ] Validé `Current Repo State` contra el repo real
- [ ] **Skill scan:** identifiqué skills aplicables, leí cada SKILL.md relevante
- [ ] **Subagent assessment:** decidí `sequential` o `fork`, con justificación
- [ ] [checklist item específico de esta task, si aplica]

### Checkpoint rule

[Derivado automáticamente de Priority + Effort:]
- `human` — el agente presenta plan.md y espera aprobación explícita
- `auto` — el agente commitea plan.md y continúa

### Plan output

El agente produce `docs/tasks/plans/TASK-###-plan.md` en el branch con esta estructura:

```
# Plan — TASK-### [Short Title]
## Discovery summary
## Skills
## Subagent strategy
## Execution order
## Files to create
## Files to modify
## Files to delete
## Risk flags
## Open questions
```

<!-- ═══════════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     Pregunta: "¿Qué construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUÉS de que el plan esté
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — [nombre]

- [entregable concreto]
- [entregable concreto]

### Slice 2 — [nombre]

- [entregable concreto]
- [entregable concreto]

## Out of Scope

- [explicitar qué NO se mezcla aquí]

## Detailed Spec

[Sección expandible. Aquí va el detalle pesado: schemas SQL, API routes,
component specs, data flows, pseudocódigo, wireframes de referencia.

Esta sección puede ser larga. El agente la consume durante Execution,
no durante Discovery o Planning.]

<!-- ═══════════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     Pregunta: "¿Cómo compruebo que terminé y qué actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] [criterio verificable]
- [ ] [criterio verificable]
- [ ] [criterio verificable]

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- [validación manual o preview]

## Closing Protocol

- [ ] Acceptance criteria marcados como completados
- [ ] `Handoff.md` actualizado con los cambios de esta task
- [ ] `changelog.md` actualizado si hubo impacto en arquitectura
- [ ] `TASK-###-plan.md` refleja el estado final (incluidos Deltas si hubo cambios)
- [ ] Archivo movido a `docs/tasks/complete/`
- [ ] PR abierto con branch limpio, nunca merge directo a `main` o `develop`

## Follow-ups

- [tasks derivadas, issues pendientes, o deuda técnica identificada durante la ejecución]

## Delta YYYY-MM-DD

[Opcional. Registra cambios materiales a la task después de su creación.]

## Open Questions

[Opcional. Decisiones que no pudieron resolverse durante el diseño de la task y que el agente debe escalar.]
```

---

## Cómo derivar el campo Checkpoint

El campo `Checkpoint` en Status se deriva así:

| Priority | Effort Bajo | Effort Medio | Effort Alto |
|---|---|---|---|
| P0 | `human` | `human` | `human` |
| P1 | `human` | `human` | `human` |
| P2 | `auto` | `auto` | `human` |
| P3 | `auto` | `auto` | `human` |

Regla simplificada: **`human` si Priority ≤ P1 o Effort = Alto. `auto` en cualquier otro caso.**

Si hay duda, usar `human`. Es más barato revisar un plan que revertir código.

---

## Checklist para quien escribe la task

- El título deja claro el objetivo sin leer todo el documento
- La task tiene un solo objetivo principal
- `Dependencies & Impact` nombra tasks y archivos reales con paths
- `Files owned` es lo bastante concreto como para detectar choques entre tasks
- `Acceptance Criteria` permite decidir cierre sin interpretación subjetiva
- `Out of Scope` evita mezclar refactor, infraestructura y producto en la misma lane
- `Current Repo State` refleja el estado real, no el ideal
- `Discovery checklist` incluye cualquier verificación específica de esta task
- `Checkpoint` está derivado correctamente de Priority × Effort
- Si la task contradice arquitectura, primero corregir la task o documentar la nueva decisión
- La `Detailed Spec` está separada de la navegación rápida (Zones 0–2)

## Checklist para quien toma la task (agente)

- Leer Zone 0 completa antes de cualquier otra cosa
- Seguir la regla de lectura secuencial: Zone 0 → 1 → 2 → 3 → 4
- NO leer Zone 3 (Execution Spec) hasta que el plan esté aprobado
- Ejecutar Discovery checklist completo — no saltar items
- **Skill scan obligatorio** — buscar skills aplicables y leer SKILL.md ANTES de escribir código
- **Subagent assessment obligatorio** — decidir `sequential` o `fork` y documentar en plan.md
- Commitear `plan.md` al branch SIEMPRE, incluso en auto-approved
- Después de cada slice: lint + type-check + commit
- Si algo cambió materialmente durante ejecución → actualizar `plan.md` con Delta
- Si el Delta es material (nueva tabla, nueva ruta) → re-aplicar regla de checkpoint
- Si se usaron subagentes → el agente principal consolida y corre verificación completa sobre el resultado combinado
- Al cerrar: ejecutar Closing Protocol completo
- Nunca merge directo a `main` o `develop`

---

## Migración desde CODEX_TASK format

Los `CODEX_TASK_*` existentes siguen vigentes. Para migrar uno al formato v2:

1. Mapear `Resumen` → `Summary`
2. Mapear `Contexto` → `Why This Task Exists` + `Architecture Alignment` + `Normative Docs`
3. Mapear `Dependencias` → `Dependencies & Impact` + `Current Repo State`
4. Mapear `Schema/Architecture` + vista-by-vista specs + API routes → `Detailed Spec` (Zone 3)
5. Mapear `Acceptance criteria` → `Acceptance Criteria`
6. Mapear `Notas para el agente` → `Discovery checklist` items + `Checkpoint` rule
7. Mapear `File structure` → `Files owned`
8. Agregar `Plan Mode` section (Zone 2) — no existía en CODEX format
9. Agregar `Closing Protocol` (Zone 4) — no existía en CODEX format
10. Derivar `Checkpoint` de Priority × Effort
