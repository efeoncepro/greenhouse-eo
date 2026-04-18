# TASK-442 — Nexa Mentions Registry + Entity Expansion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-441`
- Branch: `task/TASK-442-nexa-mentions-registry-entity-expansion`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Centraliza el catálogo de entidades mencionables de Nexa en un registry único (`src/lib/nexa/mentions/registry.ts`) y lo expande más allá de `member` / `space` / `project` para cubrir el modelo 360 completo: `client`, `provider`, `business_line`, `service_module`, `task`, `ico_anomaly`, `payroll_period`, `document`. Cada tipo declara su tabla PG, loader batch, `href(id)`, icono, color, tooltip y label i18n. UI, email, push y resolver consumen el mismo registry.

## Why This Task Exists

Hoy hay tres fuentes de verdad desincronizadas para menciones:

- Frontend: `MENTION_CONFIG` hardcodeado en [NexaMentionText.tsx:30-43](src/components/greenhouse/NexaMentionText.tsx#L30-L43)
- Email: `buildMentionHref()` aparte en [build-weekly-digest.ts:92](src/lib/nexa/digest/build-weekly-digest.ts#L92)
- Prompt: instrucción de tipos hardcoded en [llm-types.ts:213-218](src/lib/ico-engine/ai/llm-types.ts#L213-L218)

Agregar un tipo nuevo (cliente, proveedor, BU) implica tocar 3+ archivos y arriesgarse a desincronizaciones. Para el modelo 360 de Greenhouse eso no escala. Además, los tipos `project` y los que siguen no tienen href definido — los chips son inertes, y el LLM ni siquiera sabe que existen entidades como `business_line` o `provider` que son parte del modelo canónico.

## Goal

- Un registry canónico declarativo que UI, resolver, prompt y email consumen
- Soporte para: `member`, `space`, `client`, `provider`, `project`, `business_line`, `service_module`, `task`, `ico_anomaly`, `payroll_period`, `document`
- Cada tipo con: tabla PG, loader batch, `href(id)`, icono, color, tooltip, i18n label
- Generación automática de la instrucción del prompt desde el registry (no más hardcoded)
- Project chips clickeables via ruta canónica de proyectos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

Reglas obligatorias:

- Los tipos del registry respetan el modelo 360 canónico (no crear identidades paralelas)
- Cada entidad se resuelve contra su tabla canónica (`greenhouse.clients`, `greenhouse_core.providers`, etc.)
- Un tipo con ruta aún no disponible se declara `navigable: false` (no se emite chip inert en UI — cae a texto)
- Prompt instruction se genera desde el registry → cambio de tipos no requiere editar el prompt a mano

## Normative Docs

- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/in-progress/TASK-440-nexa-project-label-resolution.md`

## Dependencies & Impact

### Depends on

- `TASK-441` — resolver server-side, parse-marks, telemetry
- `TASK-440` — resolución canónica de proyectos (cerrar para poder hacer `project` clickable)
- Tablas PG canónicas del modelo 360

### Blocks / Impacts

- TASK-443 (chat) consume el registry expandido
- TASK-444 (autocomplete) consume el registry como catálogo de tipos
- Todos los engines que generen signals (Finance, Payroll, ICO, Staff Aug) podrán mencionar más entidades ricas

### Files owned

- `src/lib/nexa/mentions/registry.ts` — nuevo
- `src/lib/nexa/mentions/loaders/*.ts` — nuevo, uno por tipo
- `src/lib/nexa/mentions/build-prompt-instruction.ts` — nuevo, genera el texto del prompt
- `src/lib/nexa/mentions/resolver.ts` — modificar: iterar sobre el registry en vez de hardcoded
- `src/components/greenhouse/NexaMentionText.tsx` — modificar: usar registry
- `src/lib/nexa/digest/build-weekly-digest.ts` — modificar: usar registry
- `src/lib/ico-engine/ai/llm-types.ts` — modificar: derivar instrucción desde registry

## Current Repo State

### Already exists

- Modelo 360 canónico: `client`, `team_member` (member), `space`, `provider`, `service_module`, `project`
- Business lines: `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`
- Rutas existentes:
  - `/people/[memberId]`
  - `/agency/spaces/[id]`
  - `/admin/providers/[id]` (verificar existencia)
  - `/admin/clients/[id]` (verificar)
  - `/agency` con tab ICO (anchor a anomaly posible)
- Registry patterns en `src/config/` y `src/lib/*/registry.ts` ya se usan en Finance Metric Registry

### Gap

- No existe un registry central para menciones
- No existe `href` para `project`, `provider`, `client`, `business_line`, etc. en el contexto de menciones
- Prompt instruction hardcoded en `llm-types.ts` — no refleja nuevos tipos
- Icons y colores por tipo dispersos entre files

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato del registry

- Crear `src/lib/nexa/mentions/registry.ts` con:
  - `MentionType` enum ampliado
  - `MentionRegistryEntry` con `{ type, tablePath, loader, href, icon, color, tooltipKey, navigable, promptLabel, promptExample }`
  - Export `NEXA_MENTION_REGISTRY: Record<MentionType, MentionRegistryEntry>`

### Slice 2 — Loaders por tipo

- `loaders/member.ts`, `loaders/space.ts`, `loaders/client.ts`, `loaders/provider.ts`, `loaders/project.ts`, `loaders/business-line.ts`, `loaders/service-module.ts`, `loaders/task.ts`, `loaders/ico-anomaly.ts`, `loaders/payroll-period.ts`, `loaders/document.ts`
- Cada loader: `loadByIds(ids: string[], ctx: { tenantId }): Promise<Map<id, { name, valid }>>`
- Tests unitarios con mock PG

### Slice 3 — Registry consumido por resolver (TASK-441)

- Reescribir `resolver.ts` para iterar tipos del registry en vez de switch hardcoded
- Mantener compatibilidad con los 3 tipos originales

### Slice 4 — Registry consumido por UI

- `NexaMentionText.tsx` lee icon/color/href/navigable desde el registry
- Tipos no navegables → chip outlined disabled con tooltip `Entidad sin surface dedicada`
- Role colors vía el entry del registry para `member`

### Slice 5 — Registry consumido por email

- `build-weekly-digest.ts` reescribe `buildMentionHref()` → `registry[type].href(id)`
- Consistencia entre UI y email garantizada

### Slice 6 — Prompt instruction generado

- `build-prompt-instruction.ts` serializa el registry en la sección `Formato de menciones` del prompt
- Cambia tipos → el prompt se regenera automáticamente en la próxima build
- Cap de tokens configurable (mostrar solo tipos relevantes al dominio del engine)

### Slice 7 — Rutas faltantes y clickabilidad de project

- Confirmar / implementar rutas para `client`, `provider`, `project` (blockers de TASK-440 resuelven project)
- Tipos sin ruta quedan `navigable: false` hasta que exista surface

## Out of Scope

- Input-side autocomplete (TASK-444)
- NexaThread render (TASK-443)
- Tombstone y a11y (TASK-445)
- Crear rutas nuevas para `business_line`, `document`, `payroll_period` si no existen — se declaran no-navegables

## Detailed Spec

### Ejemplo de entry

```ts
export const NEXA_MENTION_REGISTRY: Record<MentionType, MentionRegistryEntry> = {
  client: {
    type: 'client',
    tablePath: 'greenhouse.clients',
    loader: () => import('./loaders/client').then(m => m.default),
    href: (id) => `/admin/clients/${id}`,
    icon: 'tabler-building',
    color: 'primary',
    tooltipKey: 'nexa.mentions.client',
    navigable: true,
    promptLabel: 'Cliente',
    promptExample: '@[Sky Airlines](client:cli-...)'
  },
  business_line: {
    type: 'business_line',
    tablePath: 'greenhouse_core.business_lines',
    loader: () => import('./loaders/business-line').then(m => m.default),
    href: () => null,
    icon: 'tabler-brand-asana',
    color: 'info',
    tooltipKey: 'nexa.mentions.businessLine',
    navigable: false,
    promptLabel: 'Línea de negocio',
    promptExample: '@[Agencia](business_line:bl-...)'
  }
  // ...
}
```

### Prompt generado (sample)

```
Formato de menciones (obligatorio cuando refieras a entidades con ID):
- Miembro del equipo: @[Nombre](member:MEMBER_ID)
- Space / cliente operativo: @[Nombre](space:SPACE_ID)
- Cliente comercial: @[Nombre](client:CLIENT_ID)
- Proveedor: @[Nombre](provider:PROVIDER_ID)
- Proyecto: @[Nombre](project:PROJECT_ID)
- Línea de negocio: @[Nombre](business_line:BL_ID)
...
Si no tienes el ID de una entidad, menciona solo el nombre sin formato de mención.
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Registry único consumido por UI, resolver, email y prompt
- [ ] 11 tipos soportados: member, space, client, provider, project, business_line, service_module, task, ico_anomaly, payroll_period, document
- [ ] Al menos 6 tipos navegables (member, space, client, provider, project, task)
- [ ] Prompt instruction generado desde el registry (sin hardcoded)
- [ ] `project` chips clickeables (asume TASK-440 cerrada)
- [ ] Tests por loader y test de integración del resolver con registry
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores

## Verification

- `pnpm test -- nexa/mentions`
- Manual: forzar al LLM a mencionar un cliente / proveedor → verificar chip clickeable en staging
- Manual: mención de `business_line` renderiza como chip disabled con tooltip
- Auditoría: sólo un lugar declara iconos y hrefs (grep por `tabler-user`, `tabler-grid-4x4`)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-441, TASK-443, TASK-444, TASK-445
- [ ] `docs/architecture/Greenhouse_ICO_Engine_v1.md` delta con lista de tipos soportados

## Follow-ups

- Rutas nuevas para `business_line`, `payroll_period`, `document` para activar `navigable: true`
- Role colors por rol de miembro en chips de `member` (azul account, magenta design, etc.)
- Prompt scoping por engine: Finance engine solo ve tipos `client`, `business_line`, `payroll_period`; Staff Aug solo ve `member`, `project`, `space`

## Open Questions

- ¿Token budget del prompt — mostrar todos los tipos siempre o filtrar por dominio del engine? Propuesta: filtrar por dominio en build-prompt.
