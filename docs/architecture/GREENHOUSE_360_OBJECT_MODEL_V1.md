# Greenhouse 360 Object Model V1

## Delta 2026-03-31 — `Asset` entra como object cross-module governado

Greenhouse ya debe tratar `Asset` como object técnico compartido del portal.

Regla:
- `Asset` no reemplaza al documento de negocio del dominio
- `Asset` ancla bytes, metadata base, visibilidad, retention y access log
- cada dominio conserva su agregado semántico:
  - `leave_request`
  - `purchase_order`
  - `member_document`
  - `expense_report_item`
  - `payroll_receipt`
  - `payroll_export_package`

Consecuencia:
- los módulos pueden extender o asociar assets
- no deben crear identidades paralelas para el mismo archivo cuando el registry shared ya cubre el caso
- el ownership de acceso se resuelve por aggregate owner y no solo por `space_id`

## Purpose

This document defines the platform-level architecture rule that Greenhouse must evolve around canonical enriched objects instead of siloed module-local identities.

It explains:
- which business objects Greenhouse should treat as canonical
- which table or entity anchors each object today
- which source systems can enrich each object
- which modules may extend an object without taking ownership of its identity
- when a module is allowed to create a separate table
- how read models, write models, snapshots, caches, APIs, and future modules should behave

This is the architecture contract that turns Finance canonicalization into a general platform rule rather than an isolated module exception.

Use this document together with:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `project_context.md`

## Status

This document defines the intended operating rule for the repository as of March 2026.

Current reality:
- some canonical anchors already exist
- some modules already enrich shared objects correctly
- some areas still depend on source-system-first reads
- some future objects such as `Quote` still need a canonical Greenhouse entity

This document is therefore both:
- a description of the current direction
- a hard rule for future implementation
- a migration reference for reducing drift and duplicate object definitions

## Core Thesis

Greenhouse must be modeled as a platform of canonical enriched objects.

That means:
- each important business object has one canonical identity in Greenhouse
- modules may contribute attributes, transactions, events, extensions, and summaries
- modules must not create parallel identities for an object that already exists in Greenhouse
- all cross-module visibility should come from enriched read models and shared object graphs

Greenhouse should not become:
- a pile of disconnected domain tables
- a set of UI modules each with its own version of `client`, `person`, `project`, or `product`
- a platform where the same object has different identities depending on which module created the row

## Why This Matters

Without a canonical 360 object model:
- the same client appears with different IDs in Finance, CRM, auth, and reporting
- the same collaborator is fragmented across auth principals, roster, payroll, and provider records
- modules duplicate fields and snapshots until no one knows which version is current
- dashboards disagree with detail views
- AI or automation layers consume conflicting object graphs
- BigQuery costs and maintenance increase because the platform keeps re-joining unstructured silos

With a canonical 360 object model:
- each object has a stable identity boundary
- every new module adds value to the same graph
- read models can safely combine commercial, operational, financial, and identity context
- objects become reusable across dashboard, admin, AI, finance, people, capabilities, and future modules
- the platform becomes lighter to reason about, not heavier

## Key Terms

### Canonical object

A business object that Greenhouse recognizes as a first-class entity with a stable identity.

Examples:
- Client
- Collaborator
- Product or Capability
- Provider
- Quote
- Project
- Sprint

### Canonical anchor

The main Greenhouse entity that defines the object identity.

Examples:
- `greenhouse.clients.client_id`
- `greenhouse.team_members.member_id`
- `greenhouse.service_modules.module_id`

### Extension table

A module-owned table that stores domain-specific state for a canonical object but does not own the object identity.

Examples:
- `greenhouse.fin_client_profiles`
- `greenhouse.fin_income`
- `greenhouse.fin_expenses`
- `greenhouse.client_service_modules`

### Source-system reference

An identifier from an external system that remains valuable for traceability, syncing, or drilling back to the original source.

Examples:
- `hubspot_company_id`
- `hubspot_deal_id`
- Notion page or database IDs
- payroll source row IDs

### Snapshot field

A denormalized field captured at write time for historical resilience, documents, exports, or auditability.

Examples:
- `client_name`
- `supplier_name`
- `member_name`

Snapshot fields are allowed, but they must never replace canonical IDs.

### 360 read model

A composed read representation that gathers multiple sources around one canonical object.

A 360 read model:
- may combine several tables
- may expose derived fields
- may be optimized for one surface
- must still anchor to the canonical object ID

### Domain owner

The module or subsystem allowed to manage a specific kind of transactional truth.

Examples:
- Finance owns financial transactions
- Payroll owns payroll periods and payroll entries
- HubSpot owns CRM deal source data
- Notion owns raw project task workflow

Ownership of a domain is not ownership of every identity inside that domain.

## Non-Negotiable Rules

### Rule 1: One object, one canonical identity

If Greenhouse already has a canonical object for something, no module may invent a parallel primary identity for it.

Examples:
- Finance must not invent a new tenant identity separate from `greenhouse.clients`
- People must not treat `client_users` as the canonical collaborator entity
- Notifications must not treat `client_users` as the canonical human identity when `identity_profile` or `member` already exists
- Capabilities must not invent product identities outside `greenhouse.service_modules`

### Rule 2: Modules may own transactions, not shared identity

A module can own:
- transactions
- journal rows
- workflow states
- settings
- per-domain extensions
- external sync status

A module cannot own:
- the canonical identity of `Client`, `Collaborator`, `Project`, or other shared objects if such an anchor already exists

### Rule 3: Every extension row must point back to the canonical object

If a row describes or extends an existing canonical object, it must persist the relevant canonical foreign key whenever resolution is possible.

Examples:
- Finance rows extending clients should persist `client_id`
- Finance rows extending collaborators should persist `member_id`
- capability assignment rows should persist `client_id` and module identity

### Rule 4: Source IDs stay, but as source IDs

External IDs remain useful and should be preserved.

But they must be treated as:
- source references
- integration handles
- sync keys

They must not be promoted into parallel object identity inside Greenhouse.

### Rule 5: 360 views come from composition, not duplication

The solution to fragmented data is not copying all fields into more tables.

The solution is:
- canonical anchors
- disciplined extension tables
- reusable enriched read models
- where needed, semantic marts or curated dimensions/facts

### Rule 6: Snapshot fields are allowed, but secondary

A module may snapshot descriptive labels for history and exports.

Allowed:
- `client_name`
- `member_name`
- `project_name`

Not allowed:
- treating those snapshot labels as join keys
- resolving authorization or ownership from snapshots
- using snapshots as the only reference when a canonical ID exists

### Rule 7: APIs must expose canonical IDs even during migration

During transition, APIs may continue returning legacy references.

## Delta 2026-03-30 — Notifications contract after person-first hardening

Notifications ya no pueden modelarse como `client_user-first` cuando el problema real es resolver un humano.

Regla institucional:
- la resolución conceptual del recipient es `person-first`
- `identity_profile` es la raíz humana
- `member` sigue siendo la faceta operativa válida para payroll y colaboración
- `client_user` sigue siendo la capacidad portal para inbox, preferencias y auditoría

Para Notifications esto significa:
- projections y webhook consumers deben compartir un shape explícito con:
  - `identityProfileId`
  - `memberId`
  - `userId`
  - `email`
  - `fullName`
- el sistema no debe colapsar ese grafo a un solo identificador
- la recipient key efectiva puede seguir siendo `userId` o fallback `person:*` / `member:*` / `external:*` según el delivery disponible

No permitido:
- tratar `client_user` como raíz humana del sistema de notificaciones
- reemplazar `notification_preferences`, `notifications` o `notification_log` por una semántica `identity_profile`-scoped sin migración explícita

But every modern API should increasingly expose:
- the canonical ID
- relevant source IDs
- the resolved relationship shape

The response contract should make the object graph clearer over time, not more ambiguous.

### Rule 8: Person-first must preserve reactive operating keys

Greenhouse debe converger a una lectura `person-first`, pero sin reescribir a ciegas los identificadores operativos de los carriles reactivos.

Reglas:
- el ancla humana canónica sigue siendo `identity_profile_id`
- `member_id` sigue siendo la ancla operativa para colaboradores, ICO, payroll, capacity y varios snapshots serving
- `user_id` sigue siendo la ancla operativa para sesión, inbox, preferencias, overrides y auditoría user-scoped
- ningún consumer reactivo debe perder uno de esos enlaces solo porque la persona canónica exista

Implicación de diseño:
- el resolver compartido debe enriquecer el grafo humano
- no debe colapsar el grafo a un solo identificador
- un contrato correcto debe poder exponer simultáneamente:
  - `identity_profile_id`
  - `member_id`
  - `user_id`
  - estado de resolución y degradación

Carriles que dependen explícitamente de esta coexistencia:
- projections de notifications
- recipients para webhook notifications
- serving de ICO por miembro
- snapshots financieros con collaborator linkage
- access previews y overrides user-scoped

## Object Catalog

Greenhouse should standardize around the following object catalog.

## Object 1: Client

### Business meaning

The company or tenant account boundary served by Greenhouse.

This is the primary business container for:
- access
- capabilities
- commercial context
- financial context
- project visibility
- future campaign and operational reporting

### Canonical anchor

Primary anchor:
- `greenhouse.clients.client_id`

### Current canonical source

Current canonical table:
- `greenhouse.clients`

### Supporting references

Relevant secondary identifiers:
- `greenhouse.clients.hubspot_company_id`
- `greenhouse.fin_client_profiles.client_profile_id`
- `greenhouse.fin_client_profiles.hubspot_company_id`
- `greenhouse.client_users.client_id`
- `greenhouse.client_service_modules.client_id`

### Current object responsibilities

The Client object should answer:
- who the client is
- whether the tenant is active
- which users belong to it
- which products or capabilities are enabled
- which projects and operational scope belong to it
- what the financial context is
- what the commercial context is

### Allowed enrichers

Modules and systems that may enrich Client:
- Auth and access:
  - `greenhouse.client_users`
  - `greenhouse.user_role_assignments`
  - `greenhouse.user_project_scopes`
  - `greenhouse.user_campaign_scopes`
- CRM:
  - `hubspot_crm.companies`
  - `hubspot_crm.deals`
  - `hubspot_crm.contacts`
- Finance:
  - `greenhouse.fin_client_profiles`
  - `greenhouse.fin_income`
  - `greenhouse.fin_expenses` when expenses are attributable to a client
- Capabilities and productization:
  - `greenhouse.client_service_modules`
  - `greenhouse.service_modules`
- Operations:
  - project associations
  - assignment rosters
  - future campaign scope models

### What Client does not own

Client is not:
- a login principal
- a deal row
- a finance profile row
- a capability assignment row
- a project

### Example read models

Possible Client-centered read models:
- Client executive dashboard
- Finance client detail
- Admin tenant detail
- Capability preview
- Client 360 summary for AI agents
- Cross-client agency operations summary

### Current implementation state

Today this is the most advanced canonical object in the repo.

Already in place:
- `greenhouse.clients` as canonical tenant inventory
- finance client read models anchored to `client_id`
- capability assignment linkage by `client_id`
- auth and access anchored to client tenant

Still needed:
- broader cross-module reuse of the same enriched client read model patterns
- stronger canonical project linkage under each client
- future quote and campaign linkage

## Object 2: Person 360

### Business meaning

The canonical human profile of a person participating in Greenhouse.

This object must support multiple contextual views of the same human being:
- employee or collaborator
- user with access and scopes
- CRM contact associated with a client company
- participant inside one or more client or internal spaces
- future provider-linked or workflow-linked identity contexts

### Canonical anchor

Primary anchor:
- `greenhouse.identity_profiles.profile_id`

Primary internal collaborator facet:
- `greenhouse.team_members.member_id`

Primary access facet:
- `greenhouse.client_users.user_id`

### Current canonical source

Current base tables:
- `greenhouse.identity_profiles`
- `greenhouse.identity_profile_source_links`
- `greenhouse.team_members`
- `greenhouse.client_users`

### Supporting references

Secondary identifiers:
- `greenhouse.team_members.member_id`
- `greenhouse.client_users.user_id`
- `greenhouse_crm.contacts.contact_record_id`
- `greenhouse.payroll_entries.entry_id`
- provider IDs in identity links
- module-specific snapshot names

### Current object responsibilities

The Person 360 object should answer:
- who the person is in Greenhouse
- which canonical profile anchors them
- whether they have internal collaborator context
- whether they have access principal context
- whether they are linked to CRM contact context
- which clients, spaces or projects they participate in
- what payroll, HR and finance context relates to them
- which external source identities correspond to them

### Allowed enrichers

Modules and systems that may enrich Person 360:
- People:
  - list and detail views
  - assignments
  - activity metrics
- Payroll:
  - `greenhouse.compensation_versions`
  - `greenhouse.payroll_periods`
  - `greenhouse.payroll_entries`
  - `greenhouse.payroll_bonus_config`
- Finance:
  - expenses linked by `member_id`
  - social security or tax related expense records
- Identity:
  - `greenhouse.identity_profile_source_links`
- Operations:
  - `greenhouse.client_team_assignments`
  - `notion_ops.tareas` and other operational sources via semantic calculations

### What Person 360 does not own

Person 360 is not:
- a payroll row
- a finance expense row
- a provider-specific account

Its facets may own contextual behavior:
- `client_users` owns access principal state
- `team_members` owns internal collaborator state
- CRM projections own contact-source state

### Example read models

Possible Person-centered read models:
- People detail
- Users detail
- Collaborator finance overview
- Payroll operator view
- Assignment capacity view
- Internal talent profile
- Client account participant view
- Future AI assistant context for staffing and expertise routing

### Current implementation state

Already in place:
- identity profile strategy
- collaborator anchor in `team_members`
- user anchor in `client_users`
- `greenhouse_serving.person_360` as first unified serving layer over profile, member, user and CRM contact facets
- people read models
- payroll read models
- finance collaborator overview endpoint

Still needed:
- reconciliation of `People` and `Users` over `identity_profile_id`
- CRM contact facet fully unified into the same profile view
- future richer cross-module skill, tooling, and output history

### Transitional rule

Until the unified serving layer exists:
- `People` may keep centering the collaborator facet
- `Users` may keep centering the access facet
- but neither surface should be treated as a separate identity root
- both must converge toward `identity_profile_id` as the canonical person anchor

## Object 3: Product or Capability

### Business meaning

The commercial and productized capability a client may contract and the portal may activate.

This is the closest current equivalent to “Producto” in the Greenhouse platform.

### Canonical anchor

Canonical catalog anchor:
- `greenhouse.service_modules.module_id`

Canonical assignment anchor:
- `greenhouse.client_service_modules.assignment_id`

### Current canonical source

Current base tables:
- `greenhouse.service_modules`
- `greenhouse.client_service_modules`

### Supporting references

Secondary identifiers:
- HubSpot company properties such as `linea_de_servicio`
- HubSpot multi-select values such as `servicios_especificos`
- future commercial packaging or bundle IDs

### Current object responsibilities

The Product or Capability object should answer:
- what the capability is
- whether it is a business line or a service module
- which client has it active
- where it came from
- whether it was controlled manually or synced externally
- which portal modules it enables

### Allowed enrichers

Systems and modules that may enrich Product:
- CRM sync metadata
- Admin manual overrides
- module registries and UI composition
- future financial mappings for billing and revenue by capability
- future operational mappings for project grouping or staffing strategy

### What Product does not own

Product is not:
- a client
- a project
- a deal
- a quote

### Example read models

Possible Product-centered read models:
- client capability inventory
- admin capability governance view
- revenue by service line
- future adoption and utilization analysis

### Current implementation state

Already in place:
- canonical capability catalog and assignment model
- service module resolution in runtime

Still needed:
- a richer product object vocabulary if Greenhouse later distinguishes:
  - catalog capability
  - commercial package
  - sold offer
  - delivered operating module

## Object 4: Quote

### Business meaning

A commercial offer or quotation layer between capability packaging and operational execution.

This object is not yet canonically implemented in the repo, but it should become first-class if Greenhouse wants a real commercial-to-operational bridge.

### Why Quote must become canonical

Without a Quote object:
- HubSpot deals become overloaded as both CRM opportunity and product configuration source
- Finance and operations lack a stable commercial artifact to explain what was sold
- future billing, scope, and delivery analysis becomes blurry

### Proposed canonical anchor

Recommended future tables:
- `greenhouse.quotes`
- `greenhouse.quote_line_items`
- optional `greenhouse.quote_versions`

Recommended canonical key:
- `quote_id`

### Supporting references

Likely source references:
- `hubspot_deal_id`
- document or proposal IDs from external systems
- associated `client_id`

### Proposed object responsibilities

Quote should answer:
- what was offered
- to which client
- at what commercial stage
- with which products or service modules
- with which amounts, terms, and assumptions
- which project or delivery entities were later derived from it

### Allowed enrichers

Systems and modules that may enrich Quote:
- HubSpot deals
- Finance revenue planning
- future approvals or procurement flow
- service module packaging

### What Quote does not own

Quote is not:
- a client
- the capability catalog
- an invoice
- a project

### Current implementation state

Not yet canonical in repo.

Architectural rule for future work:
- do not use raw HubSpot deals as the long-term sole canonical quote object if Greenhouse needs explainable commercial history

## Object 5: Project

### Business meaning

The delivery container that groups work into a coherent client-facing operational initiative.

### Current reality

Today project context is largely sourced from:
- `notion_ops.proyectos`
- surrounding task relationships

Greenhouse already renders project views, but the platform is still partially source-system-first for project identity.

### Recommended canonical model

Near-term canonical read anchor:
- a stable project identity layer derived from `notion_ops.proyectos`

Longer-term options:
- `greenhouse.projects` as a control or dimension table
- or a canonical `dim_projects` semantic layer if Greenhouse moves more aggressively toward marts

### Minimum canonical requirement

Regardless of storage choice, Greenhouse needs one stable project identity contract that all modules can agree on.

That contract should resolve:
- project ID
- owning client
- project name
- status
- relevant source-system IDs

### Allowed enrichers

Modules and systems that may enrich Project:
- task workflow and delivery metrics from Notion
- client capability context
- assignment roster context
- future quote linkage
- future financial attribution
- future campaign linkage

### What Project does not own

Project is not:
- a task
- a sprint
- a client
- a quote

### Example read models

Possible Project-centered read models:
- project detail
- project delivery health
- project commercial margin context
- cross-project risk summary

### Current implementation state

Partially canonical in product UX, but not yet fully canonical in data architecture.

Architectural rule:
- future modules must not each invent their own project identity layer
- Finance, AI, and agency modules should enrich the same project contract

## Object 6: Sprint or Cycle

### Business meaning

The time-boxed operational cadence used to explain speed, predictability, throughput, and delivery rhythm.

### Current reality

Today sprint context is sourced mainly from:
- `notion_ops.sprints`

The UI already exposes sprint or cycle surfaces, but the backend still lacks the fuller canonical layer planned in architecture.

### Recommended canonical model

Near-term canonical read anchor:
- a stable sprint identity layer derived from `notion_ops.sprints`

Longer-term options:
- `greenhouse.sprints`
- or a canonical `dim_sprints` and related facts in semantic marts

### Minimum canonical requirement

Greenhouse needs one stable sprint identity contract with:
- sprint ID
- owning client or scope
- start and end dates
- status
- associated project references where relevant

### Allowed enrichers

Modules and systems that may enrich Sprint:
- task completion and review friction
- velocity metrics
- project associations
- team participation
- future client health and forecast signals

### What Sprint does not own

Sprint is not:
- a project
- a task
- a client

### Example read models

Possible Sprint-centered read models:
- sprint list
- sprint detail
- velocity by person
- burndown or predictability
- cross-sprint performance trends

### Current implementation state

Product-level concept exists.
Canonical data architecture is still maturing.

Architectural rule:
- every future sprint surface must reuse the same sprint identity contract

## Object 7: Provider

### Business meaning

The canonical external organization or platform that Greenhouse relates to across tooling, AI suites, finance, identity, or future integration workflows.

Examples:
- Anthropic
- OpenAI
- Adobe
- Freepik
- HubSpot
- Deel

### Canonical anchor

Primary anchor:
- `greenhouse_core.providers.provider_id`

### Current reality

Provider is already formalized as a first-class object in PostgreSQL:

- canonical anchor: `greenhouse_core.providers`
- base serving view: `greenhouse_serving.provider_360`
- finance extension view: `greenhouse_serving.provider_finance_360`

The remaining drift is no longer identity drift but enrichment drift:

- some legacy lanes still keep free-text vendor labels
- auth/identity provider codes still live as source references
- provider-centric operational summary needed explicit materialization for tooling + finance + payroll exposure

### Recommended canonical model

Near-term canonical table:
- `greenhouse_core.providers`

Recommended minimum fields:
- `provider_id`
- `provider_name`
- `provider_category`
- `provider_kind`
- `website_url`
- `is_active`

Suggested examples of `provider_category`:
- `ai_vendor`
- `software_suite`
- `identity_provider`
- `delivery_platform`
- `financial_vendor`

Suggested examples of `provider_kind`:
- `organization`
- `platform`
- `marketplace`

### Supporting references

Secondary identifiers may include:
- `greenhouse.fin_suppliers.supplier_id`
- `greenhouse_finance.suppliers.supplier_id`
- auth or identity provider codes
- vendor account IDs
- external billing account IDs
- admin-entered aliases or domains

### Current object responsibilities

The Provider object should answer:
- which external vendor or platform Greenhouse is talking about
- which tools, suites, or integrations belong to that provider
- which finance supplier profile represents that provider operationally
- which collaborator identities or licenses point to that provider
- which client-level tooling allocations ultimately depend on that provider

### Allowed enrichers

Modules and systems that may enrich Provider:
- AI Tooling:
  - tool catalog
  - suites
  - licenses
  - wallets
  - usage ledgers
- Finance:
  - `greenhouse.fin_suppliers`
  - expenses related to subscriptions, usage, or vendor payments
- Identity:
  - `greenhouse.identity_profile_source_links`
  - auth or directory provider mappings
- Admin and integrations:
  - sync metadata
  - procurement or operations notes

### What Provider does not own

Provider is not:
- a client
- a collaborator
- a supplier invoice
- a provider-specific account credential
- a tool license assignment
- a wallet or usage ledger

### Recommended relationship rule

Provider should be the shared vendor/platform object.

Then:
- finance-specific payable state lives in `fin_suppliers` as an extension profile
- AI tooling catalog rows should point to `provider_id`
- member licenses and client wallets should point to tooling entries, which in turn resolve to a provider
- provider account IDs remain source references, not the Greenhouse provider identity

### Example read models

Possible Provider-centered read models:
- provider directory for AI and tooling governance
- provider cost overview across finance and AI usage
- provider-linked tooling inventory
- provider relationship detail with supplier and integration context

### Current implementation state

Provider is already formalized as a canonical object.

Current implemented shape:
- `greenhouse_core.providers` owns the reusable identity
- `greenhouse_finance.suppliers` acts as Finance extension profile
- `greenhouse_ai.tool_catalog` points to `provider_id`
- `greenhouse_ai.member_tool_licenses`, `credit_wallets` and `credit_ledger` extend the same graph indirectly through tools
- `greenhouse_serving.provider_tooling_snapshots` materializes provider-centric monthly tooling + finance + payroll exposure
- `greenhouse_serving.provider_tooling_360` exposes the latest provider-centric operational summary

Architectural rule:
- future tooling, AI, or vendor-linked modules should not keep `vendor` only as ungoverned free text when the relation is reusable across modules
- finance supplier profiles must continue to be treated as an extension of Provider, not as the platform-wide provider identity
- auth provider codes or integration handles must remain source references unless explicitly mapped to `provider_id`

## Cross-Object Relationships

The object model should be understood as a graph, not isolated islands.

Core graph:
- Client has many Users
- Client has many Capability assignments
- Client has many Projects
- Client has many Quotes
- Client has many Financial transactions
- Collaborator has many Assignments
- Collaborator has many Payroll entries
- Collaborator has many Finance-related expense records
- Collaborator may have many Tool licenses
- Project belongs to a Client
- Project may be linked to one or more Capabilities
- Project may later be linked to one or more Quotes
- Sprint belongs to or references a Project and indirectly a Client
- Quote belongs to a Client and contains Products or Capabilities
- Provider has many Tooling catalog entries
- Provider may have one or more Finance supplier profiles over time
- Client may have Tool wallets or tool entitlements tied to Provider-linked tooling

Operational rule:
- every edge in the graph should eventually resolve through canonical IDs, not only source IDs

## When a Module May Create Its Own Table

A module may create a separate table when one of these is true:

1. it stores transactions, events, or journaled facts
2. it stores module-specific settings
3. it stores workflow rows unique to that domain
4. it stores a controlled extension of an existing canonical object
5. it stores sync status or integration metadata

Examples of valid separate tables:
- `fin_income`
- `fin_expenses`
- `fin_exchange_rates`
- `payroll_entries`
- `client_service_modules`
- `ai_tool_catalog`
- `member_tool_licenses`
- `ai_credit_wallets`
- `ai_credit_ledger`

## When a Module May Not Create a New Primary Identity

A module should not create a new primary identity when:
- the object already exists in Greenhouse
- the new table is just a renamed copy of an existing object
- the only reason is local convenience for one module
- the “new object” is really just an external source reference

Anti-pattern examples:
- a finance-specific `client_master_id` separate from `clients.client_id`
- a people-specific `employee_master_id` separate from `team_members.member_id`
- a capability-specific `company_id` separate from `clients.client_id`
- a project ID created by one module when project identity already exists elsewhere

## Read Model Pattern

The standard Greenhouse pattern should be:

1. start from the canonical anchor
2. join domain extensions
3. join external enrichers
4. compute derived fields
5. expose a clear response contract that includes canonical IDs

### Read model requirements

Every serious read model should answer:
- which canonical object is this about
- which enrichers were used
- which identifiers are canonical vs source references
- which fields are derived

### Read model composition layers

Recommended order:

1. Canonical object layer
- the object identity and stable metadata

2. Extension layer
- module-owned attributes and transactions

3. Source-system enrichment layer
- HubSpot, Notion, Payroll, provider identities

4. Semantic or calculated layer
- summaries, KPIs, health states, aging buckets, capacity signals

5. Presentation contract layer
- stable API or server-side UI payload

## Write Model Pattern

When writing data against a canonical object:

1. accept canonical ID if available
2. optionally accept legacy or source references during migration
3. resolve the canonical object server-side
4. reject inconsistent references
5. persist the canonical key on the new row
6. persist source references when useful
7. snapshot descriptive labels only as secondary fields

### Required write-time validation

For writes extending a canonical object:
- validate the canonical object exists
- validate source references are compatible with the canonical object
- reject ambiguous combinations
- do not silently create orphaned extension rows

## Snapshot Policy

Snapshot fields are useful, but only under clear rules.

### Allowed uses

- invoices
- historical exports
- audit trails
- resilient UI labels when source records change
- cached explainability in read models

### Required safeguards

- snapshots never replace canonical IDs
- snapshots are never used as authorization input
- snapshots are never the only join mechanism for shared objects once a canonical key exists

### Preferred pattern

Persist both:
- canonical ID
- source ID when relevant
- snapshot label when helpful

Example:
- `client_id`
- `hubspot_company_id`
- `client_name`

## Semantic Mart Guidance

For some objects, canonical transactional or control tables are not enough.

Greenhouse should also use semantic marts where needed.

Semantic marts are especially valuable for:
- Project
- Sprint
- Client health
- Capacity
- Review friction
- Campaign performance

Rule:
- marts define shared semantics
- marts should still resolve back to canonical object IDs
- marts do not replace canonical control entities

## Caching and Performance Rules

Because Greenhouse relies on BigQuery and multiple source systems, caching must respect object identity.

### Cache keys

If a cache is object-specific, the cache key must include:
- canonical object ID
- relevant tenant boundary
- any effective role or scope boundary

### What not to cache loosely

Do not cache:
- cross-client object reads without tenant-aware boundaries
- module-local object fragments under generic keys
- responses that hide which canonical object they belong to

## API Contract Rules

Every API that exposes a shared object should increasingly follow these principles:

### Response requirements

- include the canonical object ID
- include relevant source IDs explicitly
- separate `summary` from `profile` or `detail` when useful
- do not overload one field with mixed identity meaning

### Example good pattern

For a Client payload:
- `clientId`
- `hubspotCompanyId`
- `clientProfileId`
- `company`
- `financialProfile`
- `summary`

### Example bad pattern

- only returning `hubspotCompanyId` and calling it “client”
- mixing auth user IDs and collaborator IDs without distinction
- returning a local module key without the canonical ID

## Migration Strategy

Greenhouse should migrate toward the 360 model gradually, not destructively.

### Step 1: identify canonical anchor

Before adding a new module:
- decide which existing canonical object it extends
- or explicitly document why the object is genuinely new

### Step 2: add canonical foreign keys

If a module table extends an existing object:
- add the canonical foreign key
- keep source IDs for compatibility

### Step 3: dual-read and dual-write

During migration:
- read using canonical-first with legacy fallback
- write canonical IDs wherever resolution is possible

### Step 4: backfill deliberately

Backfills should run as:
- explicit scripts
- administrative jobs
- controlled migrations

Backfills should not be hidden in every runtime request.

### Step 5: narrow the legacy surface

Once adoption is stable:
- prefer canonical IDs in frontend payloads
- reduce dependence on legacy-only routes
- keep source references only where still useful

## Module Impact Guidance

### Finance

Finance should:
- keep its own transaction tables
- anchor clients to `client_id`
- anchor collaborators to `member_id`
- expose enriched read models

Finance should not:
- become a parallel client master
- become a parallel collaborator master

### People

People should:
- remain the primary collaborator read surface
- consume financial and payroll enrichments through read models

People should not:
- own payroll transactions
- own finance transactions

### Payroll

Payroll should:
- own payroll periods and payroll entries
- resolve collaborators through `member_id`

Payroll should not:
- redefine collaborator identity outside the canonical people model

### Capabilities

Capabilities should:
- use the canonical module catalog
- attach assignments to `client_id`
- enrich client-level views

Capabilities should not:
- create a new client identity model
- infer core governance from deals alone

### CRM integrations

CRM should:
- enrich Client and future Quote objects
- preserve deal and company source IDs

CRM should not:
- replace Greenhouse object identity

### AI or tooling layers

Future AI layers should:
- consume canonical 360 objects
- avoid inventing assistant-local entity graphs
- write usage, credits, licenses, or recommendations as extensions tied to canonical object IDs
- resolve tool vendors through a canonical Provider object when vendor relationships must be reused across modules
- avoid treating a free-text `vendor` label or provider account handle as the durable identity boundary

## Anti-Patterns to Avoid

These patterns should be treated as architecture violations unless explicitly documented as exceptions.

### Anti-pattern 1: parallel object masters

Creating a new “master” table for an object that already has a canonical Greenhouse anchor.

### Anti-pattern 2: source ID as primary identity

Using `hubspot_company_id`, `deal_id`, a provider account ID, or a free-text vendor label as if it were the Greenhouse object identity.

### Anti-pattern 3: module-local joins only

Building a module so it only understands its own tables and never reconnects to shared objects.

### Anti-pattern 4: silent orphan rows

Accepting writes that reference an object ambiguously or not at all.

### Anti-pattern 5: backfill in hot path

Running broad schema or historical data migration logic on every request.

### Anti-pattern 6: snapshot-driven identity

Joining by `client_name`, `member_name`, or other denormalized labels.

## Architecture Review Checklist

Before approving a new module, endpoint, or schema extension, ask:

1. Which canonical object does this extend?
2. What is the canonical ID?
3. Does the new table persist that canonical ID?
4. Which source IDs are still needed?
5. Are any snapshot fields being added, and why?
6. Could this object already exist elsewhere in Greenhouse?
7. Is this a transaction table, extension table, or canonical object table?
8. Which future read models should be able to reuse this data?
9. Would this design make AI, reporting, or admin surfaces easier or harder?
10. Are we creating a silo for convenience?

## Current Repo Direction

As of March 2026, Greenhouse is already moving in this direction in several places:
- `Client` is anchored to `greenhouse.clients`
- `Collaborator` is anchored to `greenhouse.team_members`
- `Product or Capability` is anchored to `greenhouse.service_modules`
- Finance has started canonicalizing around shared objects instead of isolated profile IDs
- People already behaves as a consolidated collaborator read layer

The next platform-wide goal is consistency:
- every new domain should follow the same rules
- every existing domain should be evaluated against this object model

## Recommended Next Steps

### Short-term

1. Keep using this document as the object-model review gate for new modules.
2. Continue canonicalizing Finance, Payroll, and People against shared IDs.
3. Formalize the Provider registry before landing deeper AI Tooling or multi-vendor governance work.
4. Avoid introducing new object identities in future modules such as AI Tooling, Quotes, or deeper Capabilities work.

### Medium-term

1. Define the canonical `Quote` object.
2. Define the canonical `Project` identity contract formally.
3. Define the canonical `Sprint` identity contract formally.
4. Expand client, collaborator, and provider 360 read models into more surfaces.

### Longer-term

1. Move more cross-domain metrics into semantic marts.
2. Publish shared object contracts for API consumers and AI agents.
3. Treat Greenhouse as a graph of reusable business objects rather than a menu of separate modules.

## Operational Note

If a future agent changes:
- a canonical object anchor
- an object identity rule
- the boundary between a canonical object and an extension table
- the cross-module enrichment rules

They must update:
- this document
- `project_context.md`
- `Handoff.md`

And if the change alters behavior, they must also update:
- `changelog.md`
