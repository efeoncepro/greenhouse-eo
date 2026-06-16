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
- Execution profile: `backend-data`
- UI impact: `interaction`
- Backend impact: `reader`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|agency|ai|ui|reader`
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
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md`

Reglas obligatorias:

- Los tipos del registry respetan el modelo 360 canónico (no crear identidades paralelas)
- Cada entidad se resuelve contra su tabla/reader canónico confirmado durante Discovery; si la tabla/ruta no existe, el tipo queda `navigable: false` o fuera de V1.
- Un tipo con ruta aún no disponible se declara `navigable: false` (no se emite chip inert en UI — cae a texto)
- Prompt instruction se genera desde el registry → cambio de tipos no requiere editar el prompt a mano
- El registry no debe duplicar el contexto automático de `TASK-1150`: mentions son referencias explícitas del texto, `attachedContext` es contexto de turno.

## Normative Docs

- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/complete/TASK-440-nexa-project-label-resolution.md`
- `docs/tasks/to-do/TASK-1150-nexa-attach-current-page-context.md`

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
  - rutas de provider/client/project deben confirmarse en Discovery antes de declararse `navigable: true`
  - `/agency` con tab ICO (anchor a anomaly posible)
- Registry patterns en `src/config/` y `src/lib/*/registry.ts` ya se usan en Finance Metric Registry

### Gap

- No existe un registry central para menciones
- No existe `href` para `project`, `provider`, `client`, `business_line`, etc. en el contexto de menciones
- Prompt instruction hardcoded en `llm-types.ts` — no refleja nuevos tipos
- Icons y colores por tipo dispersos entre files

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: usuarios que leen o navegan menciones en Insights, digest, chat y futuras superficies Nexa.
- Momento del flujo: lectura de entidad mencionada y decisión de abrir contexto.
- Resultado perceptible esperado: todos los tipos renderizan con tratamiento coherente, y los no navegables no prometen click.
- Friccion que debe reducir: tipos inconsistentes entre UI/email/prompt y chips que parecen clickeables pero no tienen destino.
- No-goals UX: autocomplete, hover preview y reverse index.

### Surface & system decision

- Surface: `NexaMentionText`, email digest y futuros renderers del chat.
- Composition Shell: `no aplica` — renderer inline.
- Primitive decision: `extend` — registry alimenta `NexaMentionText`/`NexaMentionChip`; no crear familias paralelas.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: labels/tooltips en `src/lib/copy/*`; nomenclatura institucional solo si el tipo es producto/navegación.
- Access impact: `entitlements` indirecto — cada href debe respetar el gate de su route.

### State inventory

- Default: tipo navegable con icono/label/href.
- Loading: no aplica al render; loaders corren server-side para resolver.
- Empty: sin mention → texto normal.
- Error: tipo desconocido o loader falla → degradación a texto/tipo no navegable.
- Degraded / partial: `navigable: false` con tooltip honesto.
- Permission denied: no generar href si el tipo/destino no es visible para el sujeto.
- Long content: nombre truncado/wrap-safe.
- Mobile / compact: chips inline wrap-safe.
- Keyboard / focus: solo tipos navegables son tab-focus.
- Reduced motion: no motion.

### Interaction contract

- Primary interaction: click/Enter en chip navegable abre destino.
- Hover / focus / active: feedback MUI consistente por chip.
- Pending / disabled: tipos no navegables disabled/outlined.
- Escape / click-away: no aplica.
- Focus restore: navegación normal.
- Latency feedback: no aplica.
- Toast / alert behavior: ninguno.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no aplica.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica.
- Non-goal motion: hover cards quedan en `TASK-447`.

### Visual verification

- GVC scenario: fixture/lab o ruta con mentions de al menos 4 tipos.
- Viewports: desktop y mobile 390px.
- Required captures: navegable, no navegable, tipo desconocido, nombre largo.
- Required `data-capture` markers: marker estable en el bloque/lab usado.
- Scroll-width check: desktop y mobile.
- Accessibility/focus checks: tab order solo chips navegables, aria-label por tipo.
- Before/after evidence: captura comparativa de tipos.
- Known visual debt: preview cards y autocomplete son tasks separadas.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: registry `src/lib/nexa/mentions/registry.ts` + loaders canónicos por tipo.
- Consumidores afectados: resolver, UI, email digest, prompt builder, future autocomplete.
- Runtime target: local + staging + production.

### Contract surface

- Contrato existente a respetar: `@[Nombre](type:ID)` y `resolveNexaMentions()` de `TASK-441`.
- Contrato nuevo o modificado: `MentionRegistryEntry`, loaders por tipo, prompt instruction generada.
- Backward compatibility: `compatible` — `member|space|project` siguen existiendo.
- Full API parity: UI/email/prompt consumen registry/helper compartido; no tablas/hrefs hardcodeados por surface.

### Data model and invariants

- Entidades/tablas/views afectadas: readers/tablas canónicas de member, space, project, client, provider y tipos aprobados.
- Invariantes que no se pueden romper:
  - Un tipo no confirmado como navegable no puede renderizar href.
  - El prompt no puede instruir al LLM a emitir tipos que el resolver no valida.
- Tenant/space boundary: cada loader recibe tenant/session context server-side.
- Idempotency/concurrency: loaders read-only; sin writes.
- Audit/outbox/history: usa eventos de `TASK-441`; registry no escribe audit.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: registry se adopta behind-code, sin flag; tipos nuevos pueden habilitarse por allowlist interna.
- Backfill plan: N/A — no muta datos.
- Rollback path: revert PR; mantener parser legacy si falla registry.
- External coordination: N/A — repo-only.

### Security and access

- Auth/access gate: loaders server-side con tenant/session/capability cuando aplique.
- Sensitive data posture: metadata mínima de entidades; no incluir datos financieros/payroll crudos en labels.
- Error contract: loader failure degrada a no navegable/texto, sin raw errors.
- Abuse/rate-limit posture: no endpoint nuevo en esta task; futuros search/preview quedan en tasks propias.

### Runtime evidence

- Local checks: tests de registry, loaders mockeados y prompt instruction.
- DB/runtime checks: smoke read-only para tipos V1 confirmados en staging.
- Integration checks: render de UI/email usando registry.
- Reliability signals/logs: N/A; usa telemetría de `TASK-441`.
- Production verification sequence: staging smoke con tipos confirmados → deploy → grep/runtime check de ausencia de configs paralelas.

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

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (registry contract) -> Slice 2 (loaders) -> Slice 3 (resolver consumes registry) -> Slice 4/5 (UI/email) -> Slice 6 (prompt instruction) -> Slice 7 (navigability decisions).
- No agregar un tipo al prompt si el resolver no lo valida.
- No marcar un tipo `navigable: true` sin ruta y access pattern confirmado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Prompt instruye tipos que el resolver no soporta | AI/API | medium | test contract registry -> prompt -> resolver | doc/test failure |
| Href de tipo nuevo revela entidad sin access | identity/UI | medium | loaders/access-aware href, navigable false por defecto | 403/404 spikes |
| Registry se vuelve un cajón de tipos sin owners | platform | low | owner por entry + docs | review/task gate |

### Feature flags / cutover

- Sin flag para el registry base.
- Tipos nuevos pueden habilitarse en allowlist interna del registry por dominio hasta validar rutas/access.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-2 | revert registry/loaders | <30 min | si |
| Slice 3-6 | revert consumers a configs legacy | <30 min | si |
| Slice 7 | cambiar `navigable=false` para tipos dudosos | <10 min | si |

### Production verification sequence

1. Tests de registry y prompt instruction en local.
2. Staging smoke con `member`, `space`, `project` y dos tipos nuevos confirmados.
3. Verificar UI/email no tienen configs paralelas con grep.
4. Deploy prod y revisar logs de resolver por tipo 24h.

### Out-of-band coordination required

N/A — repo-only/readers internos.

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
