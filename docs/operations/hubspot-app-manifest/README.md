# HubSpot Developer Platform App Manifest — snapshot

> **Fuente canónica:** HubSpot Developer Platform project `hubspot-bigquery` en portal `kortex-dev` (48713323).
> **Este directorio** es solo un snapshot versionado para audit trail. La source of truth vive en HubSpot y se edita via `hs` CLI.

## Estado actual (2026-04-24)

- **App**: `efeonce-data-platform` (uid)
- **App ID HubSpot**: `33235280`
- **Último build deployado**: **#16** (2026-04-24, TASK-605 scope expansion)
- **Platform version**: `2025.2`
- **Auto-migración a granular permissions**: programada por HubSpot para `2026-06-24T14:00:00Z` (antes de esa fecha ir a https://app.hubspot.com/developer-apps/33235280/auth)

## Scopes incluidos (TASK-605 expansion)

Ver `app-hsmeta.json` en este directorio. Agrupados:

- **CRM objects (r+w)**: contacts, companies, deals, leads, products, line_items, quotes, services, custom, marketing_events, subscriptions, carts, orders, invoices, appointments, courses, listings, partner-clients, partner-services, users
- **CRM objects (read-only)**: owners, feedback_submissions, goals, invoices, commercepayments
- **CRM schemas (r+w where available)**: contacts, companies, deals, custom, services, subscriptions, carts, orders, invoices, appointments, courses, listings
- **CRM pipelines**: dealsplits.read_write, pipelines.orders.read/write
- **CRM ops**: export, import, lists.read/write
- **Automation**: automation, sequences.read, sequences.enrollments.write
- **Conversations**: read, write, visitor_identification.tokens.create, custom_channels.read/write
- **Communication preferences**: read, read_write, statuses.batch.read/write
- **Settings**: currencies.read, users.read, users.teams.read
- **Analytics + events**: behavioral_events.send, event_definitions.read_write
- **Collector**: graphql_query.execute, graphql_schema.read
- **CMS**: domains.read, functions.read, knowledge_base.articles.read, knowledge_base.settings.read, membership.access_groups.read
- **Ecosystem**: e-commerce, hubdb, transactional-email, timeline, accounting, actions, ctas.read, external_integrations.forms.access
- **Business**: business-intelligence
- **Tickets / sales / files / forms / content**: tickets, sales-email-read, files, forms, content
- **Base**: oauth

## Scopes deliberadamente EXCLUIDOS (destructivos, fuera del perímetro operativo)

- `settings.billing.write` — modifica billing del portal HubSpot
- `settings.users.write`, `settings.users.teams.write` — crea/modifica usuarios y teams
- `marketing-email`, `marketing.campaigns.write` — envío masivo de marketing
- `account-info.security.read` — audit logs de seguridad
- `files.ui_hidden.read` — archivos privados de admin
- Sensitive/highly_sensitive variants de contacts/deals/companies/custom — data sensible no necesaria

Si alguno se vuelve necesario en el futuro, se agrega puntualmente con autorización explícita.

## Workflow para editar scopes

```bash
# 1. Descargar snapshot actual desde HubSpot
hs project download --account=kortex-dev --project=hubspot-bigquery --dest=/tmp/hs-bigquery-download

# 2. Editar /tmp/hs-bigquery-download/hubspot-bigquery/src/app/app-hsmeta.json

# 3. Validar
cd /tmp/hs-bigquery-download/hubspot-bigquery
hs project validate --account=kortex-dev

# 4. Upload + deploy (requiere autorización explícita por ser cambio privilegiado)
hs project upload --account=kortex-dev -m "mensaje describiendo cambio"
# El upload crea un build + lo deploya automáticamente si valida.

# 5. Copiar el manifest al monorepo para audit trail
cp /tmp/hs-bigquery-download/hubspot-bigquery/src/app/app-hsmeta.json \
   docs/operations/hubspot-app-manifest/app-hsmeta.json

# 6. Commit
git add docs/operations/hubspot-app-manifest/app-hsmeta.json
git commit -m "chore(hubspot): update app scopes snapshot post-deploy"
```

## Scopes rechazados por HubSpot durante TASK-605 (learnings)

- `crm.objects.commerce_payments.read/write` → correcto: `crm.objects.commercepayments.read` (una palabra, sin write)
- `crm.schemas.commerce_payments.read/write` → correcto: `crm.schemas.commercepayments.read`
- `crm.schemas.line_items.write` → no existe (solo `.read`)
- `crm.objects.feedback_submission.read` → correcto: `crm.objects.feedback_submissions.read` (plural)
- `business_units.view.read` → rechazado (no existe)

## Notas sobre `hs_product_classification`, `hs_bundle_type`, `hs_recurring`

**Incluso con scopes máximos, estos 3 fields siguen bloqueados**:

| Property | readOnlyValue | Razón |
|---|---|---|
| `hs_product_classification` | `true` | Managed by HubSpot — controla behavior interno de quote line items (bundle vs standalone vs variant). Inmutable por diseño. Ningún scope lo abre. |
| `hs_bundle_type` | `true` | Mismo. Inmutable por diseño. |
| `hs_recurring` | No existe | Nunca se creó como custom property. Greenhouse ya infiere recurrencia de `hs_recurring_billing_period`. |

Confirmado via `GET /crm/v3/properties/products/{name}` consultado en vivo al portal 48713323 el 2026-04-24. El hotfix del middleware (no emitirlos) queda como solución permanente.

## Referencias

- [HubSpot Developer Platform — Projects](https://developers.hubspot.com/docs/getting-started/quickstart)
- [HubSpot Private Apps Scopes (legacy)](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/scopes)
- [HubSpot Spring 2026 Spotlight](https://developers.hubspot.com/changelog/spring-2026-spotlight)
- [HubSpot Granular Permission Migration](https://app.hubspot.com/developer-apps/33235280/auth) — portal-specific link
