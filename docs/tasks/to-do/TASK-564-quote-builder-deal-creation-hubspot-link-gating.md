# TASK-564 — Quote Builder: Gate Deal Creation + Link-to-HubSpot-Company Fallback

## Delta 2026-04-22

- `CreateDealDrawer` y `useCreateDeal` ganaron pipeline/stage/owner vía TASK-571. El drawer ahora fetchea `GET /api/commercial/organizations/[id]/deal-creation-context` al abrirse y bloquea el submit si no hay pipelines.
- La aserción "el comando `createDealFromQuoteContext` falla con 409 porque el guard de `src/lib/commercial/party/commands/create-deal-from-quote-context.ts:369-371` exige `hubspot_company_id`" sigue válida, pero ahora el command puede fallar también con `DealCreateSelectionInvalidError` (422) o `DealCreateContextEmptyError` (409) si el registry local no está gobernado. Considerar ambos errores al diseñar el gating.
- El CTA "Crear deal nuevo" ya no está en un floating button: vive en el footer del popover del chip Deal (TASK-570). El gating de TASK-564 debe ocultar o deshabilitar ese footer cuando la org no tiene `hubspot_company_id`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo-Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `crm` + `ui`
- Blocked by: `none` (TASK-539, TASK-537 y TASK-540 ya cerrados)
- Branch: `task/TASK-564-quote-builder-deal-creation-hubspot-link-gating`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

El CTA "Crear deal nuevo" en Quote Builder se renderiza aunque la organization no tenga `hubspot_company_id`; el operador llena el drawer y recién al submit recibe 409 `ORGANIZATION_HAS_NO_HUBSPOT_COMPANY`. Esta task cierra el gap: grisa/oculta el CTA cuando falta el vínculo, muestra motivo explícito, y agrega una acción inline "Vincular a Company HubSpot" que reutiliza el search de TASK-537 para setear `hubspot_company_id` sobre la organization existente sin salir del builder.

## Why This Task Exists

TASK-539 entregó la creación inline de deals con la premisa implícita de que la organization ya estaba sincronizada con HubSpot (vía TASK-538 selector que adopta `hubspot_candidate`). Orgs creadas por el path legacy de Finance (Clients → Organizations) **no tienen `hubspot_company_id`** y no pasaron por el selector unificado. El gap se manifiesta en producción: el operador elige "Santander – Chile" (legacy), ve "Sin deals disponibles", clickea "+ Crear deal nuevo", llena el drawer, y el comando `createDealFromQuoteContext` falla con 409 porque el guard de `src/lib/commercial/party/commands/create-deal-from-quote-context.ts:369-371` exige `hubspot_company_id`. La promesa de TASK-539 (eliminar context-switch a HubSpot) queda rota para este subconjunto de orgs.

## Goal

- Gate visual del CTA "Crear deal nuevo" cuando `organization.hubspot_company_id IS NULL` — botón disabled con tooltip explicativo, no silent no-op.
- Pre-check en `CreateDealDrawer` que comunica el motivo antes de dejar submitear.
- Acción inline "Vincular a Company HubSpot existente" que reutiliza `/api/commercial/parties/search` (TASK-537) filtrando `kind='hubspot_candidate'` y dispara comando `linkOrganizationToHubSpotCompany` que setea `hubspot_company_id` + emite evento outbox.
- Una vez linkeada, el CTA "Crear deal nuevo" se desbloquea sin refresh de página.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §6 (commands), §7 (endpoints)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability gate
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — nuevo evento outbox para link

Reglas obligatorias:

- El link de Company HubSpot pasa por comando CQRS nuevo; **no** writes directos a PG desde la API route.
- Idempotencia por `(organization_id, hubspot_company_id)`: re-link al mismo Company es no-op con outcome `already_linked`.
- Capability gate: reutilizar `commercial.party.adopt` (TASK-537) o crear `commercial.organization.link_hubspot` — resolver en Discovery.
- Emit outbox `commercial.organization.hubspot_linked` para que `partyHubSpotOutbound` (TASK-540) se reactive.

## Normative Docs

- `docs/tasks/complete/TASK-539-inline-deal-creation-quote-builder.md` — contexto del CTA actual
- `docs/tasks/complete/TASK-537-party-search-adoption-endpoints.md` — search endpoint reutilizable
- `docs/tasks/complete/TASK-540-hubspot-lifecycle-outbound-sync.md` — projection que consume el evento nuevo

## Dependencies & Impact

### Depends on

- `TASK-537` (`/api/commercial/parties/search` — complete)
- `TASK-539` (`CreateDealDrawer` + `createDealFromQuoteContext` — complete)
- `TASK-540` (projection `partyHubSpotOutbound` — complete)

### Blocks / Impacts

- `TASK-543` (Party Lifecycle Deprecation & Flag Cleanup — Fase I). Si se remueve el selector legacy antes de cerrar este gap, orgs legacy quedan huérfanas del flujo de deal.
- Cierra un sub-item del program goal de `TASK-534`: "eliminar context-switch a HubSpot".

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` — gate del CTA (línea 1562)
- `src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx` — pre-check banner
- `src/views/greenhouse/finance/workspace/LinkHubSpotCompanyDrawer.tsx` — nuevo drawer
- `src/hooks/useLinkHubSpotCompany.ts` — nuevo hook
- `src/lib/commercial/party/commands/link-organization-to-hubspot-company.ts` — nuevo comando CQRS
- `src/lib/commercial/party/commands/__tests__/link-organization-to-hubspot-company.test.ts`
- `src/app/api/commercial/organizations/[id]/link-hubspot-company/route.ts` — endpoint
- `src/app/api/commercial/organizations/[id]/link-hubspot-company/route.test.ts`

## Current Repo State

### Already exists

- Botón CTA ya renderizado: `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx:1562-1574`
- Guard que tira 409: `src/lib/commercial/party/commands/create-deal-from-quote-context.ts:369-371` (`OrganizationHasNoCompanyError`)
- Search endpoint reutilizable: `src/app/api/commercial/parties/search/route.ts`
- Adopt endpoint para `hubspot_candidate` (no sirve para orgs ya locales): `src/app/api/commercial/parties/adopt/route.ts`
- Projection outbound ya escucha eventos: `partyHubSpotOutbound` (TASK-540)
- Drawer pattern de referencia: `src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx`
- Hook pattern de referencia: `src/hooks/useCreateDeal.ts`

### Gap

- Nada valida `hubspot_company_id` antes de habilitar el CTA → UX falla con 409 tardío.
- No existe path para linkear una organization local a una Company HubSpot existente sin pasar por el selector de creación. `TASK-538` asume adopt-on-select de `hubspot_candidate`, no linkeo retroactivo sobre org ya local.
- `CreateDealDrawer` no muestra el motivo del fail más allá del toast genérico del 409.
- Evento outbox `commercial.organization.hubspot_linked` no existe en catálogo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Gate UX del CTA (frontend only)

- Fetch de `hubspot_company_id` desde el endpoint org detail hacia el estado del `QuoteBuilderShell` (si aún no está incluido en la respuesta actual).
- Condicionar el disable del CTA `QuoteBuilderShell.tsx:1562`: `disabled={submitting || !hubspotCompanyId}`.
- `Tooltip` explicativo cuando el botón está disabled: "Para crear deals hay que vincular esta organización a una Company de HubSpot primero."
- Pre-check banner dentro de `CreateDealDrawer` si el drawer se abre con `hubspotCompanyId = null` (defensa en profundidad aunque el gate ya previene el click).
- Sin cambios de backend.

### Slice 2 — Comando `linkOrganizationToHubSpotCompany` + endpoint

- Comando en `src/lib/commercial/party/commands/link-organization-to-hubspot-company.ts` que:
  - Valida que `organization_id` existe.
  - Si `organization.hubspot_company_id` ya coincide con el input → no-op con outcome `already_linked` (idempotente).
  - Si `organization.hubspot_company_id` existe y difiere → 409 `ORGANIZATION_ALREADY_LINKED`.
  - Verifica que no exista otra organization con ese `hubspot_company_id` → 409 `COMPANY_ALREADY_LINKED_TO_OTHER_ORG` con `existingOrganizationId`.
  - UPDATE `organizations SET hubspot_company_id = $1 WHERE organization_id = $2`.
  - Emite evento `commercial.organization.hubspot_linked` en misma transacción (mismo patrón que TASK-540).
  - Audit record en `commercial_operations_audit` con `correlation_id`.
- Endpoint `POST /api/commercial/organizations/[id]/link-hubspot-company`:
  - Body: `{ hubspotCompanyId: string }`
  - Capability gate: `commercial.party.adopt` (reutiliza) o nueva `commercial.organization.link_hubspot` — decidir en Discovery.
  - Rate limit: 10/min/user.
- Tests: happy path, `already_linked` (idempotencia), collision con otra org, auth 403, capability insuficiente.

### Slice 3 — Drawer inline "Vincular Company HubSpot"

- Componente `LinkHubSpotCompanyDrawer` reutilizando el buscador de `/api/commercial/parties/search` con filtro `kind=hubspot_candidate`.
- Fallback: si el search no devuelve matches, mensaje "No encontramos la Company en HubSpot. Creala allá y volvé" + link externo al portal HubSpot (doc técnico de setup referenciable).
- Botón "Vincular Company HubSpot" en `QuoteBuilderShell` junto al CTA gated (o inline dentro del tooltip del botón disabled).
- Hook `useLinkHubSpotCompany` que invalida el fetch de org detail → `hubspotCompanyId` se actualiza y el CTA se desbloquea sin refresh.
- Telemetría (logs estructurados, no métricas formales): `link_attempted`, `link_succeeded`, `link_no_candidate` para medir si se necesita Slice 4 (crear Company inline).

## Out of Scope

- **Crear Company nueva en HubSpot desde Greenhouse.** Si la Company no existe en HubSpot, esta task no la crea — muestra fallback "creala en HubSpot y volvé". Crear Company vía Cloud Run `POST /companies` es task hermana — abrir como TASK-565 (o equivalente) si la telemetría del Slice 3 muestra >20% de casos sin candidate.
- **Bulk link para orgs legacy.** Esta task resuelve el flujo por-operador en Quote Builder. El bulk va en follow-up del programa `TASK-534` (Admin Center tool, nueva task).
- **Cambios al flujo `party_selector` de TASK-538.** El selector sigue siendo el path preferido para orgs nuevas; este task cubre el subconjunto ya-local-sin-hubspot.
- **Cambios a `createDealFromQuoteContext`.** El comando sigue siendo consumidor de `hubspot_company_id`, no lo escribe. El guard del línea 369 se mantiene como defensa en profundidad.

## Detailed Spec

### Slice 1 — Condición de gating

```tsx
// QuoteBuilderShell.tsx:1562 — antes
{organizationId && !hubspotDealId ? (
  <Button onClick={() => setCreateDealDrawerOpen(true)} disabled={submitting}>
    Crear deal nuevo
  </Button>
) : null}

// después
{organizationId && !hubspotDealId ? (
  <Stack direction='row' spacing={1}>
    <Tooltip title={
      !hubspotCompanyId
        ? 'Vinculá esta organización a una Company de HubSpot antes de crear deals.'
        : ''
    }>
      <span>
        <Button
          disabled={submitting || !hubspotCompanyId}
          onClick={() => setCreateDealDrawerOpen(true)}
          startIcon={<i className='tabler-plus' aria-hidden='true' />}
        >
          Crear deal nuevo
        </Button>
      </span>
    </Tooltip>
    {!hubspotCompanyId ? (
      <Button
        variant='outlined'
        size='small'
        onClick={() => setLinkCompanyDrawerOpen(true)}
      >
        Vincular Company HubSpot
      </Button>
    ) : null}
  </Stack>
) : null}
```

### Slice 2 — Endpoint shape

```
POST /api/commercial/organizations/:id/link-hubspot-company
Body: { hubspotCompanyId: string }

200: { organizationId, hubspotCompanyId, outcome: 'linked' | 'already_linked' }
409: { error: 'ORGANIZATION_ALREADY_LINKED', currentHubspotCompanyId }
409: { error: 'COMPANY_ALREADY_LINKED_TO_OTHER_ORG', existingOrganizationId }
403: { error: 'INSUFFICIENT_PERMISSIONS' }
400: { error: 'hubspotCompanyId is required' }
```

### Slice 2 — Evento outbox nuevo

```
event_type: commercial.organization.hubspot_linked
payload: {
  organization_id,
  hubspot_company_id,
  previous_hubspot_company_id: null,
  linked_by_user_id,
  linked_at,
  correlation_id
}
```

Registrar en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` bajo namespace `commercial.organization.*`.

### Slice 3 — Search filter signature

```ts
// hook nuevo — usa search endpoint existente (TASK-537) con filtro de candidate
const search = await fetch(`/api/commercial/parties/search?q=${q}&kind=hubspot_candidate`)
// response: { items: Array<{ kind: 'hubspot_candidate', hubspotCompanyId, name, country, ... }> }
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El botón "Crear deal nuevo" aparece disabled con tooltip cuando `organization.hubspot_company_id IS NULL`.
- [ ] El usuario nunca recibe 409 `ORGANIZATION_HAS_NO_HUBSPOT_COMPANY` desde el flujo UI feliz (el gate lo previene; el guard del comando queda como defensa en profundidad del backend).
- [ ] Botón "Vincular Company HubSpot" dispara drawer con search por `hubspot_candidate`.
- [ ] Al linkear exitoso, el CTA "Crear deal nuevo" se desbloquea sin full refresh.
- [ ] Endpoint devuelve `already_linked` idempotente al re-link al mismo id.
- [ ] Endpoint rechaza con 409 + mensaje accionable cuando `hubspot_company_id` ya pertenece a otra org.
- [ ] Evento `commercial.organization.hubspot_linked` llega al outbox y lo consume `partyHubSpotOutbound` de TASK-540 (verificado en staging).
- [ ] Tests del comando cubren: happy path, idempotencia, collision con otra org, auth 403, capability insuficiente.
- [ ] Validación manual con "Santander – Chile" (o equivalente org legacy sin `hubspot_company_id`) en staging: link → crear deal exitoso en un solo flujo.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Verificación manual en staging: org sin `hubspot_company_id` → link inline → crear deal.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado (`in-progress` al tomar, `complete` al cerrar).
- [ ] Archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` actualizado con validaciones y deuda.
- [ ] `changelog.md` actualizado (cambio de comportamiento visible: gate de CTA + nuevo endpoint).
- [ ] Chequeo de impacto cruzado sobre `TASK-543` (Deprecation & Flag Cleanup) y `TASK-534` umbrella.

- [ ] Evento `commercial.organization.hubspot_linked` registrado en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.
- [ ] Capability (reutilizada o nueva) registrada en `src/config/entitlements-catalog.ts`.

## Follow-ups

- Si telemetría de Slice 3 muestra >20% de casos sin `hubspot_candidate` encontrado: abrir task hermana para crear Company nueva en HubSpot inline (requiere endpoint `POST /companies` en Cloud Run `hubspot-greenhouse-integration`).
- Bulk-link tool en Admin Center para orgs legacy Finance sin `hubspot_company_id`.
- Evaluar mover la capability a `commercial.organization.link_hubspot` dedicada si se adopta un modelo más granular de permisos por acción.

## Open Questions

- ¿Capability gate reutiliza `commercial.party.adopt` de TASK-537 o se crea una nueva `commercial.organization.link_hubspot`? La semántica difiere: adopt crea `organizations` desde un candidate; link asocia una org existente. Recomendación: crear nueva para no mezclar semánticas, pero validar contra el modelo de entitlements actual en Discovery.
- ¿El search debería filtrar por `country_code` matcheando el `organization.country_code` para reducir falsos positivos (ej. "Santander – Chile" vs. "Santander – Argentina")?
- ¿El outbound projection `partyHubSpotOutbound` (TASK-540) requiere cambios para manejar el caso donde la Company en HubSpot ya existía pre-link (skip del "create Company outbound" para evitar duplicados)?
