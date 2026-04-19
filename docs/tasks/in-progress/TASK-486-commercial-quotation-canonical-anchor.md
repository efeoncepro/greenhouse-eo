# TASK-486 — Commercial Quotation Canonical Anchor (Organization + Contact)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `En implementacion`
- Rank: `TBD`
- Domain: `finance / commercial`
- Blocked by: `none` (foundation ya existe)
- Branch: `task/TASK-486-commercial-quotation-canonical-anchor`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar el anchor canónico de `greenhouse_commercial.quotations` como **Organización (cliente o prospecto) + Contacto (identity_profile persona)** y decouplear `space_id` del modelo de quote. Hoy la tabla mezcla tres dimensiones (`client_id`, `organization_id`, `space_id`), el builder UI etiqueta el dropdown de organización como "Espacio destinatario", y tenant scoping filtra quotes por `space_id` aunque el Space no pertenece a la identidad canónica. Esta task corrige el modelo end-to-end: schema, store, API, UI, docs arquitectura.

## Why This Task Exists

El bug fix `10018007` (POST /api/finance/quotes 500) dejó expuesto que el modelo canónico de quote estaba mal cableado:

1. **Tres anchors en la misma fila:** `quotations.client_id`, `organization_id`, `space_id` — pero la regla de negocio canónica es _una cotización se ofrece a una organización (cliente o prospecto), representada por un contacto persona_. Space es proyección operativa post-venta (delivery, pulse, ICO), no identidad comercial.
2. **UI engaña:** el builder etiqueta "Espacio destinatario" en un dropdown que en realidad bindea a `organizationId` (no a `spaceId`). El `spaceId` siempre llega `null` desde la UI nueva, pero nadie lo declaró como deprecated.
3. **Tenant scoping frágil:** `listFinanceQuotesFromCanonical` filtra por `space_id ANY($1::text[])`, lo que rompe cuando una quote nace sin Space resolvable (caso común en cotizaciones a prospectos).
4. **Sin Contacto:** hoy no hay campo para registrar la persona del cliente con quien se negocia la cotización. Se pierde trazabilidad clave para follow-ups, aprobaciones y posterior conversión a deal/income.

Los arch docs ya tenían la dirección correcta:

- `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` línea 104: "`Space` = Tenant operativo bajo una org, puente a legacy `client_id`" — operacional, no comercial.
- `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` líneas 640-641: "`space_id` queda _materializado_ via bridge desde `organization_id` / `client_id`" — doc ya usa la palabra "materializado", no "canonical".

Falta alinear el runtime con esa intención arquitectónica.

## Goal

- **`quotations.organization_id`** pasa a ser NOT NULL (con backfill) y es el anchor canónico.
- **Nuevo campo `quotations.contact_identity_profile_id`** (FK a `greenhouse_core.identity_profiles`, nullable inicialmente) registra la persona del cliente.
- **`quotations.space_id`** queda deprecated: se mantiene la columna como read-only/derived post-conversion pero ningún write path del builder la toca. Eventualmente drop en una v2.
- **`space_resolution_source`** se elimina (ya no hay resolución al insertar).
- **Tenant scoping** pasa de `space_id` a `organization_id` + `client_id` coverage (vía `person_memberships` o lookup directo).
- **UI builder**: renombrar "Espacio destinatario" → "Organización (cliente o prospecto)", agregar segundo campo "Contacto".
- **POST /api/finance/quotes**: exigir `organizationId`, aceptar `contactIdentityProfileId` opcional, ignorar `spaceId` legacy con warning estructurado.
- **HubSpot sync**: dejar de resolver Space al sync; sólo persistir `organization_id` (vía `hubspot_company_id` lookup) + contact si la deal tiene primary contact identificable.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` — actualizar a V2 con anchor canónico explícito.
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — referenciar como fuente de verdad para person↔organization linking.
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — confirmar Cliente ↔ Organization, Persona ↔ identity_profile.
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — propagar si la quote-to-cash chain consume space_id.

Reglas obligatorias:

- **No crear identidades paralelas.** Reusar `greenhouse_core.organizations` y `greenhouse_core.identity_profiles` + `person_memberships`. Nunca crear un `quote_contact` table ad-hoc.
- **Backwards-compat durante transición.** `space_id` sigue existiendo y siendo legible post-conversión (delivery/pulse lo usan). Sólo el builder + API de creación deja de escribirlo como "canonical".
- **Tenant isolation preservado.** El cambio de scoping de `space_id → organization_id` no puede abrir quotes de otro tenant. Regla: un usuario ve quotes cuya `organization_id` coincide con el/los que su session resuelve.
- **HubSpot sync idempotente.** Las quotes sync desde HubSpot (fuente: `source_system='hubspot'`) no pueden romper: deben poder seguir sync-eando aunque el `space_id` no se setee.

## Normative Docs

- `docs/tasks/complete/TASK-345-quotation-canonical-schema-finance-compatibility-bridge.md` (schema original)
- `docs/tasks/complete/TASK-346-quotation-pricing-config.md`
- `docs/tasks/complete/TASK-473-quote-builder-full-page-migration.md` (builder full-page, de donde viene el label bug)
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (ya existe)
- `greenhouse_core.identity_profiles` (ya existe)
- `greenhouse_core.person_memberships` (ya existe, membership_type incluye `contact` / `client_user` / `billing`)

### Blocks / Impacts

- **TASK-466** (multi-currency quote send): la validación previo a enviar la quote ahora puede exigir `organization_id + contact` como contrato mínimo.
- **TASK-473** follow-ups: cualquier refactor del builder que siga tocando el dropdown de "Espacio" debe pasar por esta task primero.
- **TASK-481** (Quote Builder Suggested Cost UX): se integra post-TASK-486, no antes, para evitar colisión en el mismo archivo.
- **Quote-to-cash lane** (`materializeInvoiceFromQuotation`, `linkPurchaseOrderToQuotation`, `linkServiceEntryToQuotation`): siguen leyendo `space_id` como contexto operativo post-conversión. No se rompen; quedan intocados.

### Files owned

- `migrations/<new>_task-486-quotation-canonical-anchor.sql` (nueva migración)
- `src/app/api/finance/quotes/route.ts` (validación payload, derivar space desde org post-insert si aplica)
- `src/app/api/finance/quotes/[id]/route.ts` (PUT: aceptar contactIdentityProfileId)
- `src/lib/finance/quotation-canonical-store.ts` (tenant scoping: `organization_id` en vez de `space_id`)
- `src/lib/hubspot/sync-hubspot-quotes.ts` (quitar resolveSpaceForCompany, reemplazar por resolveOrganizationForCompany + contact lookup opcional)
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (rename label, agregar campo contacto)
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx` (si contacto va ahí)
- `src/types/db.d.ts` (regenerar post-migración)
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` (V1 → V2)
- `docs/documentation/finance/cotizador.md` (v2 → v3: anchor canónico)

## Current Repo State

### Already exists

- **Schema base de quotations** con `organization_id`, `client_id`, `space_id` + FKs (migración TASK-345).
- **`greenhouse_core.organizations`** con soporte de prospecto/cliente (`organization_type`, `is_operating_entity`, `hubspot_company_id`).
- **`greenhouse_core.identity_profiles`** como persona canónica.
- **`greenhouse_core.person_memberships`** con `membership_type IN ('contact','client_user','billing',...)` — la primitiva para vincular contacto ↔ organización ya existe.
- **HubSpot sync** que resuelve `organization_id` desde `hubspot_company_id` (via `resolveSpaceForCompany` — joinea a organizations).
- **Tenant scoping** vía `resolveFinanceQuoteTenantSpaceIds` que devuelve array de `space_id`.
- **Bug fix del 500** (commit `10018007`) que derivó `space_resolution_source` en JS — ya no hay reuse de `$4` en el INSERT. La columna sigue existiendo, pero ya no aporta valor real.

### Gap

- `contact_identity_profile_id` **no existe** en `quotations`.
- El builder no permite elegir un contacto.
- Tenant scoping no tiene path alternativo vía `organization_id`.
- No hay validación en POST que exija `organizationId` (hoy es opcional).
- HubSpot sync hardcodea `resolveSpaceForCompany` en vez de un `resolveOrganizationForCompany` más ligero.
- Arch docs aún describen `space_id` como parte del modelo canónico (aunque usan "materializado" ambiguamente).

## Scope

### Slice 1 — Migración schema + backfill

- Crear migración `task-486-quotation-canonical-anchor`:
  - `ALTER TABLE greenhouse_commercial.quotations ADD COLUMN contact_identity_profile_id TEXT REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE SET NULL` (FK target es `profile_id`, no `identity_profile_id` — convención del codebase es nombrar columnas FK con prefijo semántico pero apuntar al PK `profile_id`)
  - `CREATE INDEX idx_commercial_quotations_contact ON greenhouse_commercial.quotations (contact_identity_profile_id) WHERE contact_identity_profile_id IS NOT NULL`
  - `ALTER TABLE greenhouse_commercial.quotations ALTER COLUMN organization_id SET NOT NULL` — **con backfill previo** desde `client_profiles` join: organizations donde tenga match por client_id legacy.
  - Mantener `space_id` existente como nullable; agregar COMMENT explicando "deprecated: post-conversion operational scope only, not canonical anchor".
  - Agregar `CREATE INDEX idx_commercial_quotations_organization_status ON greenhouse_commercial.quotations (organization_id, status, updated_at DESC)` para reemplazar el index space-anchored en tenant scoping.
  - Dejar `idx_commercial_quotations_space_status` por compatibilidad con quote-to-cash readers hasta una v2.
- Regenerar `src/types/db.d.ts`.

### Slice 2 — Store + tenant scoping refactor

- `src/lib/finance/quotation-canonical-store.ts`:
  - `resolveFinanceQuoteTenantSpaceIds` → renombrar a `resolveFinanceQuoteTenantOrganizationIds`, devolver array de `organization_id` visibles para el tenant.
  - Queries de list/detail/line-items: filtrar por `q.organization_id = ANY($1::text[])`.
  - `syncCanonicalFinanceQuote`: dejar de hacer la LATERAL join que resuelve space; insertar quote con `organization_id` + `contact_identity_profile_id`; `space_id` pasa a NULL siempre en writes vía este path.
  - Readers del detail devuelven `contact` object (id, full_name, email) resuelto vía join a identity_profiles.
- Agregar unit test del resolver cuando contacto es null vs cuando está linked.

### Slice 3 — API routes refactor

- `src/app/api/finance/quotes/route.ts`:
  - POST: validar `body.organizationId` como requerido (return 400 si falta o no existe en `greenhouse_core.organizations`).
  - POST: aceptar `body.contactIdentityProfileId` opcional; validar que pertenece al tenant y que tiene membership activo (`membership_type IN ('contact','client_user','billing')`) hacia esa org.
  - POST: ignorar `body.spaceId` (con `console.warn` si viene — legacy compat, no falla).
  - Remover `space_resolution_source` del INSERT; dejar CURRENT_DEFAULT de la columna (`'unresolved'`) sin tocar desde code.
  - GET detail: incluir `contact: { id, fullName, email, role } | null` en la respuesta, resuelto del join.
- `src/app/api/finance/quotes/[id]/route.ts` (PUT): aceptar `contactIdentityProfileId` en update con misma validación.

### Slice 4 — HubSpot sync refactor

- `src/lib/hubspot/sync-hubspot-quotes.ts`:
  - Reemplazar `resolveSpaceForCompany(hubspotCompanyId)` por `resolveOrganizationForCompany(hubspotCompanyId)` — devuelve sólo `{ organization_id, client_id }`, sin tocar spaces.
  - Opcionalmente resolver contact: si la HubSpot deal trae `primary_contact_id` mapeable a un `identity_profile_id` existente, pasarlo como `contactIdentityProfileId`. Si no, null.
  - UPSERT a canonical con `space_id = NULL` siempre. Si ops necesita el link post-conversion, lo resuelve aparte.
  - Event `quote.synced` deja de llevar `spaceId` (o lo lleva siempre null); los consumers downstream (delivery, pulse) ya tienen path propio para resolver Space post-conversión.

### Slice 5 — Builder UI refactor

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`:
  - Renombrar label del dropdown: "Espacio destinatario" → "Organización (cliente o prospecto)".
  - Agregar helper text: "Cliente activo o prospecto en Greenhouse/HubSpot".
  - Agregar nuevo dropdown debajo: "Contacto" (typeahead sobre `identity_profiles` con membership a la org seleccionada). Placeholder: "Persona con quien negocias (opcional)".
  - Enviar `organizationId` + `contactIdentityProfileId` en el payload del POST.
  - **Quitar** cualquier referencia visual a "Espacio" en el builder. "Espacio" vuelve a ser un concepto exclusivo del lane operativo (agencia / delivery).
- Endpoint auxiliar: `GET /api/commercial/organizations/[id]/contacts` — lista los identity_profiles con membership activa hacia esa org. Nuevo archivo, reuso de queries existentes sobre `person_memberships`.

### Slice 6 — Docs + arquitectura

- Bump `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` → V2:
  - Sección nueva "Canonical Anchor" al inicio: "una quote se ancla a Organización + Contacto. Space no forma parte del modelo canónico."
  - Sección "Deprecated fields" documentando que `space_id` + `space_resolution_source` son legacy / post-conversion only.
  - Actualizar ejemplos de queries: todas filtran por `organization_id`.
- Bump `docs/documentation/finance/cotizador.md` v2 → v3:
  - Sección "A quién se le cotiza" con la regla Organización + Contacto explícita.
  - FAQ: "¿Por qué antes aparecía Espacio?" — explicación del legacy y la decisión de decoupling.
- Agregar entrada cruzada en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` bajo "Consumers del modelo": commercial quotations ahora consumen person_memberships para contact validation.

## Out of Scope

- **Drop físico de `space_id`**. Se mantiene nullable hasta una task v2 que confirme que ningún reader lo necesita.
- **Quote templates + contactos**: los templates de cotización no necesitan contacto; el contact se asigna por quote, no por template.
- **Multi-contact support**: una quote = un contacto (el principal). Si se necesita CC, se hace follow-up; no en esta task.
- **Changes a `client_id`**: el campo legacy sigue existiendo. La deprecation de `client_id` es otra conversación (fuera de scope).
- **UI de admin para reasignar contact en quotes existentes**: cambia el schema + endpoint, pero la UI de reasignación masiva es follow-up.

## Detailed Spec

### Schema delta

```sql
-- Migración task-486-quotation-canonical-anchor.sql

-- 1. Pre-flight: backfill organization_id en quotes donde está null pero client_id existe
UPDATE greenhouse_commercial.quotations q
SET organization_id = cp.organization_id
FROM greenhouse_finance.client_profiles cp
WHERE q.organization_id IS NULL
  AND q.client_id IS NOT NULL
  AND q.client_id = cp.client_id
  AND cp.organization_id IS NOT NULL;

-- 2. Aislar quotes que queden sin org resolvable (para reporting)
SELECT quotation_id, quotation_number, client_id, source_system
  FROM greenhouse_commercial.quotations
  WHERE organization_id IS NULL;
  -- Ops debe resolver manualmente antes del SET NOT NULL si hay filas orphan.

-- 3. Agregar contact_identity_profile_id
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN contact_identity_profile_id TEXT
    REFERENCES greenhouse_core.identity_profiles(identity_profile_id)
    ON DELETE SET NULL;

CREATE INDEX idx_commercial_quotations_contact
  ON greenhouse_commercial.quotations (contact_identity_profile_id)
  WHERE contact_identity_profile_id IS NOT NULL;

-- 4. Endurecer organization_id como NOT NULL
ALTER TABLE greenhouse_commercial.quotations
  ALTER COLUMN organization_id SET NOT NULL;

-- 5. Index nuevo para tenant scoping + status filters
CREATE INDEX idx_commercial_quotations_organization_status
  ON greenhouse_commercial.quotations (organization_id, status, updated_at DESC);

-- 6. Marcar space_id como deprecated vía COMMENT (no drop)
COMMENT ON COLUMN greenhouse_commercial.quotations.space_id IS
  'DEPRECATED (TASK-486): post-conversion operational scope only, not canonical anchor. Canonical anchor is organization_id + contact_identity_profile_id. Kept for backward compat with quote-to-cash readers until a future v2.';

COMMENT ON COLUMN greenhouse_commercial.quotations.space_resolution_source IS
  'DEPRECATED (TASK-486): audit trail of legacy space resolution. No longer populated on new inserts.';
```

### API contract update

Request para POST:
```json
{
  "organizationId": "org-...",       // REQUIRED (was optional)
  "contactIdentityProfileId": "ip-...", // NEW, optional
  "businessLineCode": "globe",
  "pricingModel": "retainer",
  "currency": "CLP",
  "lineItems": [ ... ]
  // "spaceId" — aceptado pero ignorado con warn
}
```

Response detail adds:
```json
{
  "quotationId": "qt-...",
  "organization": { "id": "...", "name": "...", "type": "client|prospect" },
  "contact": { "id": "...", "fullName": "...", "email": "...", "role": "contact" } | null,
  ...
}
```

### UI contract

- Dropdown 1: "Organización (cliente o prospecto)" — busca sobre `greenhouse_core.organizations WHERE organization_type IN ('client','supplier','both','other')`. Required.
- Dropdown 2: "Contacto" — typeahead sobre `identity_profiles` con `person_memberships.organization_id = <selected_org>` y `membership_type IN ('client_contact','client_user','contact','billing','partner','advisor')` (excluye `team_member` y `contractor` porque no aplican como contacto comercial de cotización). Optional. Empty state: "Ningún contacto registrado. Puedes agregar uno en el detalle de la organización."

## Acceptance Criteria

- [ ] `quotations.organization_id` es NOT NULL; no hay filas orphan post-migración.
- [ ] `quotations.contact_identity_profile_id` existe con FK a identity_profiles.
- [ ] POST /api/finance/quotes retorna 400 si `organizationId` no viene.
- [ ] POST /api/finance/quotes valida que `contactIdentityProfileId`, si viene, tiene membership activa a esa org.
- [ ] `listFinanceQuotesFromCanonical` filtra por `organization_id` en vez de `space_id`; no hay regresión en tenant isolation.
- [ ] HubSpot sync sigue insertando quotes sin romperse cuando el company no tiene space mapeado.
- [ ] Builder UI muestra label "Organización (cliente o prospecto)" + dropdown de contacto.
- [ ] Builder envía `organizationId` + `contactIdentityProfileId` en el POST; ya no envía `spaceId`.
- [ ] Quote detail response incluye objeto `contact` con data resuelta de identity_profiles.
- [ ] `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` actualizado a V2 con "Canonical Anchor" explícito.
- [ ] `cotizador.md` v3 explica la regla Organización + Contacto en lenguaje simple.
- [ ] `pnpm build` + `pnpm lint` + `pnpm test` + `pnpm tsc --noEmit` clean.
- [ ] Smoke test en staging: crear quote, editar contact, listar quotes del tenant, sync desde HubSpot — todo verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Migración aplicada a staging DB via `pnpm pg:connect:migrate`
- Smoke end-to-end via `pnpm staging:request` con agent-session: POST create → GET list → GET detail → PUT update contact.

## Closing Protocol

- [ ] Lifecycle del markdown sincronizado con estado real.
- [ ] Archivo movido a `complete/` si se cierra.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` con delta y aprendizajes.
- [ ] Chequeo de impacto cruzado en otras tasks (`TASK-466`, `TASK-473`, `TASK-481`).
- [ ] Docs arquitectura bumpeados (V1 → V2) + documentación funcional actualizada.

## Follow-ups

- **Drop físico de `space_id` + `space_resolution_source`** de `quotations` en una task v2, una vez confirmado que quote-to-cash readers migraron.
- **Backfill de contactos desde HubSpot deals** (task dedicada): iterar HubSpot deals activas, resolver primary contact → poblar `contact_identity_profile_id` en las quotes correspondientes.
- **UI de reasignación de contact** en quote detail (drawer o acción inline).
- **Evento outbox `commercial.quotation.contact_changed`** si hace falta para proyecciones.

## Open Questions

- ¿El Contacto de una quote debe permitir crear un nuevo identity_profile desde el builder si no existe? O limitarse a los ya registrados en la org? Recomendación inicial: sólo existentes en v1; crear-en-el-momento queda para v2.
- ¿La deprecation de `client_id` (además de `space_id`) debe ser parte de esta task o una task separada? Recomendación: separada — esta task se enfoca en el positive change (agregar contact + endurecer org); deprecation de client_id requiere migrar toda la cadena legacy.
