# TASK-571 — Deal Creation Context Registry + Pipeline/Stage Governance

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-571-deal-creation-context-pipeline-stage-governance`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Formalizar el contexto canónico de creación de deals en el Quote Builder para que pipeline, etapa inicial y owner no dependan de defaults implícitos ni hardcodes como `appointmentscheduled`. La task crea un registry operativo local de pipelines/stages HubSpot, un endpoint `deal creation context`, validación fuerte en backend, y un drawer UI que deja elegir pipeline y etapa con defaults gobernados por política.

## Why This Task Exists

`TASK-539` cerró el comando, el endpoint y el drawer inline para crear deals desde Greenhouse, pero la implementación quedó incompleta respecto de su propia spec:

1. La UI real solo pide nombre, monto y moneda, aunque el dominio ya acepta `pipelineId` y `stageId`.
2. `QuoteBuilderShell` hace optimistic update con `dealstage: 'appointmentscheduled'` y `pipelineName: null`, aunque el backend o HubSpot podrían haber usado otro pipeline/stage real.
3. `greenhouse_commercial.hubspot_deal_pipeline_config` existe como mirror/canonical bridge de deals, pero hoy no funciona como registry UX-first con defaults explícitos por tenant, business line o política operativa.
4. La decisión de pipeline/stage de creación queda repartida entre UI, backend y servicio externo, sin un contrato común auditable.

Con múltiples pipelines HubSpot activos, esto vuelve frágil el flujo inline de deals: el usuario no puede controlar dónde nace el deal, Greenhouse no valida suficiente antes de llamar a HubSpot, y el runtime no tiene una política clara de defaults.

## Goal

- Crear un contrato canónico de `deal creation context` que resuelva pipelines, stages y defaults desde Greenhouse.
- Eliminar el hardcode de etapa inicial en Quote Builder y reemplazarlo por datos reales del backend.
- Convertir el registry local de pipelines/stages en foundation gobernada para UX, validación y sync con HubSpot.
- Permitir que el drawer “Crear deal nuevo” exponga pipeline y etapa con defaults sensatos, restricciones explícitas y optimistic update veraz.
- Garantizar que Greenhouse valide coherencia `pipelineId ↔ stageId` antes de llamar al servicio externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- HubSpot sigue siendo source of truth de pipelines y stages de deals; Greenhouse mantiene un registry local gobernado para lectura, defaults y validación.
- Toda creación de deal sigue pasando por `createDealFromQuoteContext`; no se abren write paths paralelos.
- La UI no debe hardcodear `appointmentscheduled` ni asumir un único pipeline global.
- El backend debe validar que el `stageId` pertenece al `pipelineId` y que ambos son seleccionables para creación.
- La resolución de defaults debe ser explícita y auditable: override por tenant/BU si existe, luego fallback global.
- El drawer debe leer Greenhouse local; no debe depender de consultas live ad hoc a HubSpot en cada apertura.
- Si hace falta refresh del catálogo HubSpot, debe vivir como sync/refresh explícito, no como lógica escondida en la UI.
- El capability gate `commercial.deal.create` sigue siendo el contrato canónico de autorización; esta task no debe degradarlo.

## Normative Docs

- `docs/tasks/complete/TASK-453-deal-canonicalization-commercial-bridge.md`
- `docs/tasks/complete/TASK-539-inline-deal-creation-quote-builder.md`
- `docs/tasks/to-do/TASK-564-quote-builder-deal-creation-hubspot-link-gating.md`
- `docs/documentation/finance/crear-deal-desde-quote-builder.md`

## Dependencies & Impact

### Depends on

- `greenhouse_commercial.deals`
- `greenhouse_commercial.hubspot_deal_pipeline_config`
- `src/lib/commercial/deals-store.ts`
- `src/lib/commercial/party/commands/create-deal-from-quote-context.ts`
- `src/app/api/commercial/organizations/[id]/deals/route.ts`
- `src/hooks/useCreateDeal.ts`
- `src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- repo hermano `hubspot-greenhouse-integration` / `hubspot-bigquery-task-563` para el contrato `POST /deals` y cualquier metadata adicional de pipeline/stage `[verificar]`

### Blocks / Impacts

- Corrige un gap funcional del cierre de `TASK-539`.
- Debe coexistir sanamente con `TASK-564` (gating/link de orgs sin `hubspot_company_id`).
- Impacta Quote Builder, create attempts, sync comercial de deals y documentación funcional del flujo de venta.
- Puede abrir un follow-up posterior para admin UI de governance de defaults si esa surface no entra aquí.

### Files owned

- `src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/hooks/useCreateDeal.ts`
- `src/app/api/commercial/organizations/[id]/deals/route.ts`
- `src/lib/commercial/party/commands/create-deal-from-quote-context.ts`
- `src/lib/commercial/deals-store.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `docs/documentation/finance/crear-deal-desde-quote-builder.md`
- `[verificar]` paths exactos en el repo hermano del servicio externo

## Current Repo State

### Already exists

- `useCreateDeal` ya acepta `pipelineId` y `stageId`:
  - `src/hooks/useCreateDeal.ts`
- `POST /api/commercial/organizations/[id]/deals` ya recibe `pipelineId` y `stageId`:
  - `src/app/api/commercial/organizations/[id]/deals/route.ts`
- `createDealFromQuoteContext` ya persiste `pipeline_id` / `stage_id` en `deal_create_attempts`, reenvía ambos al servicio externo y usa `pipelineUsed` / `stageUsed` si la respuesta los devuelve:
  - `src/lib/commercial/party/commands/create-deal-from-quote-context.ts`
- El cliente del servicio externo ya soporta `pipelineId`, `stageId` y `ownerHubspotUserId`:
  - `src/lib/integrations/hubspot-greenhouse-service.ts`
- `greenhouse_commercial.hubspot_deal_pipeline_config` ya existe y se bootstrappea desde deals observados:
  - `migrations/20260418224710163_task-453-commercial-deals-canonical-bridge.sql`
  - `src/lib/commercial/deals-store.ts`
- La spec y la documentación funcional de `TASK-539` ya declaraban pipeline/stage como parte del diseño esperado:
  - `docs/tasks/complete/TASK-539-inline-deal-creation-quote-builder.md`
  - `docs/documentation/finance/crear-deal-desde-quote-builder.md`

### Gap

- `CreateDealDrawer` no expone pipeline ni stage; hoy solo captura nombre, monto y moneda.
- `QuoteBuilderShell` inserta optimísticamente deals nuevos con `dealstage: 'appointmentscheduled'` y sin `pipelineName`, aunque el backend pudiera haber usado otra combinación real.
- No existe un endpoint dedicado para resolver `deal creation context` con defaults y catálogo de stages seleccionables.
- `hubspot_deal_pipeline_config` no alcanza como registry UX completo: hoy no modela explícitamente defaults por tenant/BU/actor ni orden/seleccionabilidad de creación.
- El sistema no tiene un refresh/sync explícito del catálogo de pipelines/stages pensado para el flujo de create; depende del bootstrap observacional desde deals ya existentes.
- La responsabilidad de decidir pipeline/stage sigue implícita y repartida entre UI, backend y servicio externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Registry canónico de pipeline/stage para creación

- Extender o complementar `greenhouse_commercial.hubspot_deal_pipeline_config` para soportar:
  - labels de pipeline y stage
  - orden de display
  - `is_open_selectable`
  - `active`
  - metadata de default por `business_line_code` y/o tenant si aplica
- Crear readers backend reutilizables para listar pipelines, stages y defaults de creación.
- Documentar explícitamente si esto se resuelve ampliando la tabla actual o sumando una policy layer complementaria.

### Slice 2 — Endpoint `deal creation context`

- Crear `GET /api/commercial/organizations/[id]/deal-creation-context`.
- Debe devolver:
  - pipelines disponibles
  - stages por pipeline
  - `defaultPipelineId`
  - `defaultStageId`
  - `defaultOwnerHubspotUserId`
  - metadatos explicativos del origen del default
- Debe respetar tenant isolation por `organizationId`.
- Debe leer Greenhouse local, no HubSpot live directo.
- Si el registry local está vacío o stale, debe usar un mecanismo explícito de refresh/fallback backend-safe.

### Slice 3 — Validación backend y resolución de defaults

- Endurecer `createDealFromQuoteContext` para que:
  - valide coherencia `pipelineId ↔ stageId`
  - rechace stages cerrados o no seleccionables
  - resuelva defaults canónicos si el caller no envía ambos campos
  - persista qué pipeline/stage se resolvieron efectivamente
- Ajustar el route handler para aceptar el nuevo contrato sin ambigüedad.
- Extender la respuesta con datos suficientes para optimistic UI veraz:
  - `pipelineUsed`
  - `pipelineLabelUsed`
  - `stageUsed`
  - `stageLabelUsed`
  - `ownerUsed`

### Slice 4 — Drawer UI gobernado por contexto

- `CreateDealDrawer` debe cargar el `deal creation context` al abrir.
- Agregar campos explícitos:
  - `Pipeline`
  - `Etapa inicial`
- El cambio de pipeline debe refiltrar stages.
- Los defaults deben venir precargados y ser editables cuando corresponda.
- Si no existe contexto válido, el drawer debe bloquear submit con mensaje accionable.
- El copy debe dejar claro cuando se está usando una etapa inicial sugerida por política.

### Slice 5 — Optimistic update y selector de deals

- El optimistic insert en `QuoteBuilderShell` debe dejar de hardcodear `appointmentscheduled`.
- Debe usar pipeline/stage reales retornados por backend.
- El selector “Vincular deal” debe mostrar inmediatamente el deal recién creado con nombre, stage y pipeline correctos.
- Evitar drift temporal entre lo que HubSpot creó y lo que Greenhouse muestra.

### Slice 6 — Sync/refresh del catálogo HubSpot + documentación

- Definir el carril canónico para mantener actualizado el registry local de pipelines/stages HubSpot:
  - bootstrap incremental desde deals observados
  - refresh explícito
  - sync reactivo/programado si aplica
- Documentar la ownership:
  - HubSpot owner del catálogo real
  - Greenhouse owner de defaults operativos y UX
- Actualizar docs funcionales y arquitectura relacionadas.

## Out of Scope

- Editar deals existentes desde Greenhouse.
- Crear pipelines o stages en HubSpot desde Greenhouse.
- Reemplazar `TASK-564` o absorber el link de orgs sin `hubspot_company_id`.
- Reabrir el workflow de approvals más allá de lo estrictamente necesario para que pipeline/stage queden bien modelados.
- Reescribir el canonical bridge completo de deals si no es necesario para el registry de creación.

## Detailed Spec

### Contrato recomendado de contexto

```ts
type DealCreationContext = {
  organizationId: string
  hubspotCompanyId: string
  defaultPipelineId: string | null
  defaultStageId: string | null
  defaultOwnerHubspotUserId: string | null
  defaultsSource: {
    pipeline: 'tenant_policy' | 'business_line_policy' | 'global_policy' | 'single_option' | 'none'
    stage: 'pipeline_default' | 'first_open_stage' | 'single_option' | 'none'
    owner: 'actor_mapping' | 'business_line_fallback' | 'none'
  }
  pipelines: Array<{
    pipelineId: string
    label: string
    active: boolean
    isDefault: boolean
    stages: Array<{
      stageId: string
      label: string
      displayOrder: number | null
      isClosed: boolean
      isWon: boolean
      isSelectableForCreate: boolean
      isDefault: boolean
    }>
  }>
}
```

### Política de defaults

Orden recomendado:

1. override explícito por tenant/org si existe
2. default por `businessLineCode`
3. si solo hay un pipeline elegible, usarlo
4. fallback global
5. dentro del pipeline: primer stage abierto y seleccionable ordenado por `display_order`

### Validación canónica

- `stageId` debe pertenecer al `pipelineId`
- el stage no puede ser `is_closed = true`
- el stage debe ser `is_open_selectable = true`
- si la UI no manda `pipelineId/stageId`, el backend resuelve defaults
- si el backend no puede resolver contexto, responde error explícito y no llama al servicio externo

### Estrategia de sync del catálogo

La task debe decidir entre:

- ampliar `hubspot_deal_pipeline_config` como registry único, o
- mantener esa tabla como mirror base y sumar una capa de governance/defaults arriba

La decisión debe quedar explícita en la implementación y documentada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El drawer “Crear deal nuevo” deja elegir `pipeline` y `stage` con defaults reales, sin hardcodes.
- [ ] El backend valida coherencia `pipelineId ↔ stageId` y rechaza combinaciones inválidas antes de llamar a HubSpot.
- [ ] Si el caller omite `pipelineId`/`stageId`, el backend resuelve defaults canónicos y devuelve cuáles usó.
- [ ] El optimistic update del Quote Builder refleja pipeline/stage reales del deal creado, no `appointmentscheduled` fijo.
- [ ] El sistema soporta múltiples pipelines HubSpot sin asumir uno único global.
- [ ] Existe un contrato backend explícito para `deal creation context`.
- [ ] La documentación funcional y técnica deja clara la ownership HubSpot vs Greenhouse para pipelines/stages/defaults.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [ ] Validación manual en staging: abrir drawer, ver defaults correctos, cambiar pipeline, ver stages filtradas, crear deal y confirmar que el selector muestra el pipeline/stage correcto.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm staging:request /api/commercial/organizations/<organizationId>/deal-creation-context --pretty`
- validación manual del drawer en `staging`
- verificación en HubSpot sandbox/staging del pipeline y stage usados al crear el deal

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-539`, `TASK-564` y la documentación funcional del Quote Builder

- [ ] quedó documentada la estrategia de sync/refresh del registry de pipelines HubSpot

## Follow-ups

- Admin UI para gobernar overrides/defaults de pipeline por tenant o BU, si no entra en esta task.
- Surface operacional para refresh manual del catálogo de pipelines/stages HubSpot.
- Extender el create de deals para asociar automáticamente el contacto seleccionado de la quote al deal HubSpot.
- Eventual soporte de edición inline de stage/pipeline post-create desde Greenhouse.

## Open Questions

- ¿La capa de defaults por tenant/BU vive en la misma tabla `hubspot_deal_pipeline_config` o en una policy table complementaria?
- ¿El servicio externo debe exponer metadata adicional de pipeline/stage/owner al crear el deal, o Greenhouse puede resolver todo localmente con el registry nuevo?
- ¿Conviene incluir owner selection explícita en el drawer en esta misma task o dejarlo en defaults backend + follow-up?
