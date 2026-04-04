# TASK-240 — Nexa Insights: Menciones interactivas de Spaces y Miembros

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-239` (el prompt de TASK-239 resuelve los nombres — esta task los hace clickeables)
- Branch: `task/TASK-240-nexa-insights-entity-mentions`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Implementar menciones interactivas (@mentions) en los insights de Nexa Insights para que cuando Gemini mencione un Space/cliente o un miembro del equipo en sus narrativas, el texto se renderice como un chip clickeable que navega al perfil correspondiente (`/people/[memberId]` o `/agency/spaces/[id]`).

## Why This Task Exists

TASK-239 enriquece el prompt con nombres humanos de Spaces, miembros y proyectos, pero las narrativas resultantes son texto plano. Cuando Gemini dice "Andrés Carlosama contribuye 53% de la desviación", el operador no puede hacer click para ver el perfil de Andrés ni su carga operativa. Lo mismo con "El FTR% de Sky Airlines cayó" — no hay link al Space 360 de Sky.

La mención interactiva convierte el texto plano en una interface navegable: el operador lee el insight, identifica al actor, y con un click accede a su contexto operativo completo sin salir del flujo de análisis.

## Goal

- Las narrativas de Nexa Insights renderizan menciones de miembros como chips clickeables que navegan a `/people/[memberId]`
- Las narrativas de Nexa Insights renderizan menciones de Spaces/clientes como chips clickeables que navegan a `/agency/spaces/[id]`
- El formato de mención es parseable y auditable — el LLM emite una marca estándar, la UI la transforma
- Los chips de mención siguen la identidad visual de Greenhouse (role colors para miembros, primary para Spaces)
- Fallback graceful: si el parser no reconoce una marca, la muestra como texto plano

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- Los insights siguen siendo `advisory-only` e `internal-only` — las menciones solo navegan a surfaces internas
- El formato de mención vive en el output del LLM (persistido en `explanation_summary`, `root_cause_narrative`, `recommended_action`) y se parsea en el frontend al renderizar
- El parser de menciones es un componente reutilizable (`NexaMentionText` o similar) que cualquier surface de Nexa puede usar
- Las rutas de navegación usan los patrones existentes: `/people/[memberId]` para miembros, `/agency/spaces/[id]` para Spaces
- No se modifica la estructura de las tablas de enrichments — el texto con marcas de mención se almacena como string

## Normative Docs

- `docs/tasks/to-do/TASK-239-nexa-advisory-prompt-enrichment-metric-glossary.md` — prerequisito: resuelve nombres y los pasa al LLM
- `docs/tasks/complete/TASK-235-agency-ico-llm-insights-ui.md` — implementación original del bloque
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — contexto de métricas

## Dependencies & Impact

### Depends on

- `TASK-239` — el prompt ya resuelve `spaceName`, `memberName` y sus IDs correspondientes; esta task agrega el formato de mención
- `src/components/greenhouse/NexaInsightsBlock.tsx` — componente que renderiza los insights (se modifica para usar el parser)
- `src/lib/ico-engine/ai/llm-provider.ts` — builder del prompt (se modifica para instruir formato de mención)
- Rutas existentes: `/people/[memberId]` y `/agency/spaces/[id]`

### Blocks / Impacts

- Todos los consumers de `NexaInsightsBlock` se benefician automáticamente
- Futuros consumers de menciones Nexa (chat, notifications) pueden reutilizar el parser

### Files owned

- `src/components/greenhouse/NexaMentionText.tsx` — nuevo: parser + renderer de menciones inline
- `src/components/greenhouse/NexaInsightsBlock.tsx` — modificar: usar `NexaMentionText` en vez de `Typography` para narrativas
- `src/lib/ico-engine/ai/llm-provider.ts` — modificar: agregar instrucción de formato de mención al prompt

## Current Repo State

### Already exists

- Rutas de perfil: `/people/[memberId]` — `src/app/(dashboard)/people/[memberId]/page.tsx`
- Rutas de Space 360: `/agency/spaces/[id]` — `src/app/(dashboard)/agency/spaces/[id]/page.tsx`
- Patrón de link a miembro: `<Typography component={Link} href={'/people/${memberId}'}>` — `src/views/greenhouse/people/PeopleListTable.tsx:61`
- Patrón de link a Space: `router.push('/agency/spaces/${id}')` — `src/components/agency/SpaceCard.tsx`
- `CustomChip` con `component={Link}` soportado por MUI — puede hacer chips clickeables
- `GH_COLORS.roles.*` para colores de rol de miembros
- `NexaInsightsBlock` con `InsightCard` que renderiza `explanation`, `recommendedAction` como texto plano
- TASK-239 (pendiente) resolverá `memberName`, `spaceName`, `projectName` y los pasará al LLM junto con sus IDs

### Gap

- No existe un formato de mención estándar para output de LLM
- No existe parser de menciones inline (texto → chips clickeables)
- No existe componente `NexaMentionText` ni similar
- El prompt no instruye al LLM a emitir marcas de mención
- `InsightCard` usa `Typography variant='body2'` para narrativas — no soporta inline links

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Formato de mención y instrucción al LLM

- Definir el formato estándar de mención para output del LLM:
  - Miembros: `@[Nombre Visible](member:MEMBER_ID)`
  - Spaces/clientes: `@[Nombre Visible](space:SPACE_ID)`
  - Proyectos (futuro): `@[Nombre Visible](project:PROJECT_ID)`
- Agregar al prompt de `buildSignalPrompt()` la instrucción:
  - "Cuando menciones un miembro del equipo, usa el formato `@[Nombre](member:ID)`. Cuando menciones un Space o cliente, usa `@[Nombre](space:ID)`. Nunca uses el ID sin el nombre."
- El JSON de la señal enriquecida (de TASK-239) ya trae `memberName` + `memberId`, `spaceName` + `spaceId` — el LLM los combina en la marca

### Slice 2 — Componente NexaMentionText (parser + renderer)

- Crear `src/components/greenhouse/NexaMentionText.tsx`:
  - Input: string con posibles marcas `@[Nombre](type:ID)`
  - Output: fragmentos de React intercalados — texto plano + chips clickeables
  - Regex de parsing: `/\@\[([^\]]+)\]\((member|space|project):([^)]+)\)/g`
  - Renderizado por tipo:
    - `member` → `<Chip component={Link} href={'/people/${id}'} label={name} size='small' variant='outlined' clickable />` con icono `tabler-user` y hover primary
    - `space` → `<Chip component={Link} href={'/agency/spaces/${id}'} label={name} size='small' variant='outlined' clickable />` con icono `tabler-grid-4x4` y hover primary
    - `project` → chip no-clickeable (ruta de proyecto aún no definida) con icono `tabler-folder`
  - Fallback: si el regex no matchea nada, retornar el texto como `Typography` normal
  - El componente es reutilizable — vive en `src/components/greenhouse/`

### Slice 3 — Integración en NexaInsightsBlock

- Reemplazar los `Typography variant='body2'` de `explanation` y `recommendedAction` en `InsightCard` por `<NexaMentionText text={item.explanation} variant='body2' />`
- Lo mismo para `rootCauseNarrative` si se muestra
- Mantener los estilos existentes (`color`, `line-clamp`, etc.) via props de `NexaMentionText`

### Slice 4 — Re-materialización con menciones

- Correr el pipeline LLM de nuevo para que las narrativas incluyan las marcas de mención
- Verificar que los chips renderizan correctamente y navegan a los perfiles

## Out of Scope

- Menciones en el chat de Nexa (`/home`) — eso sería una task futura que reutiliza `NexaMentionText`
- Menciones en notificaciones o emails
- Autocompletado de menciones (input `@` → dropdown) — eso es para input de usuario, no output de LLM
- Resolver roles o colores por rol de miembros en los chips de mención (usar estilo neutral primero, role colors como follow-up)
- Menciones de proyectos clickeables (la ruta `/proyectos/[id]` existe pero requiere contexto de cliente — se deja como chip no-clickeable)

## Detailed Spec

### Formato de mención

```
@[Andrés Carlosama](member:EO-MBR-a1b2c3d4)
@[Sky Airlines](space:spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9)
@[Campaña Q1 Digital](project:31239c2f-efe7-806e-8062-dd281fc82a08)
```

### Ejemplo de narrativa con menciones

```
El FTR% de @[Sky Airlines](space:spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9) cayó a 69.6% 
en marzo. @[Andrés Carlosama](member:EO-MBR-a1b2c3d4) contribuye significativamente con 
un 53.4% de la desviación en el proyecto @[Campaña Q1 Digital](project:31239c2f).
```

### Rendering esperado

```
El FTR% de [Sky Airlines ▸] cayó a 69.6% en marzo. [👤 Andrés Carlosama ▸] contribuye
significativamente con un 53.4% de la desviación en el proyecto [📁 Campaña Q1 Digital].
```

Donde `[Sky Airlines ▸]` y `[👤 Andrés Carlosama ▸]` son MUI Chips clickeables con hover state y navegación.

### Instrucción adicional al prompt

```
Formato de menciones:
- Cuando menciones un miembro del equipo en la narrativa, usa: @[Nombre Completo](member:MEMBER_ID)
- Cuando menciones un Space o cliente, usa: @[Nombre del Space](space:SPACE_ID)
- Cuando menciones un proyecto, usa: @[Nombre del Proyecto](project:PROJECT_ID)
- Siempre incluye el nombre legible dentro de los corchetes y el ID entre paréntesis.
- Si no tienes el ID de una entidad, menciona solo el nombre sin formato de mención.
```

### Impacto en tokens

La instrucción de menciones agrega ~100 tokens al prompt. Las marcas en el output agregan ~20 tokens por mención. Impacto negligible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El prompt instruye al LLM a emitir menciones con formato `@[Nombre](type:ID)`
- [ ] Los enrichments regenerados contienen marcas de mención en `explanationSummary` y `rootCauseNarrative`
- [ ] `NexaMentionText` parsea correctamente las marcas y renderiza chips clickeables
- [ ] Click en un chip de miembro navega a `/people/[memberId]`
- [ ] Click en un chip de Space navega a `/agency/spaces/[id]`
- [ ] Texto sin menciones se renderiza como `Typography` normal (fallback graceful)
- [ ] Marcas mal formadas se renderizan como texto plano sin romper la UI
- [ ] `pnpm build` y `pnpm lint` sin errores
- [ ] El componente `NexaMentionText` es reutilizable y no depende de Agency

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- Validación manual: correr pipeline LLM, verificar que las narrativas contienen marcas
- Validación visual: `/agency?tab=ico` → Nexa Insights → click en chip de miembro → navega a `/people/[id]`
- Validación de fallback: inyectar texto sin marcas y texto con marcas malformadas → no se rompe

## Closing Protocol

- [ ] Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` — agregar delta documentando el formato de menciones en la lane LLM

## Follow-ups

- Reutilizar `NexaMentionText` en el chat de Nexa (`NexaThread.tsx`) para menciones en respuestas del asistente
- Agregar role colors a los chips de miembros (ej: Account en azul oscuro, Design en magenta)
- Hacer clickeables los chips de proyectos cuando exista una ruta de proyecto unificada
- Evaluar autocompletado de menciones en el input de Nexa (para que el usuario pueda arrobar en preguntas)

## Open Questions

Ninguna — formato de mención, entidades soportadas (Spaces y miembros) y comportamiento de fallback definidos.
