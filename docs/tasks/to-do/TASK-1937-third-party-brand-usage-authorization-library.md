# TASK-1937 — Biblioteca de autorizaciones de uso de marcas, testimonios y fotos de terceros

## Delta 2026-09-30 — primeros casos de clientes: Banco BICE, BICECORP y Berel (deck SEO/AEO, TASK-1949)

- El deck SEO/AEO aprobado por el operador el 2026-09-30 lleva tres casos (`decision-case`) con el logo del cliente:
  **BICECORP** (`logos/bicecorp.svg`, trazado con potrace desde la imagen de bicecorp.com), **Banco BICE**
  (`logos/banco-bice.svg` y `banco-bice-blanco.svg`, SVG oficial de banco.bice.cl, sólo recoloreado; además compuesto
  dentro del plate CS1b) y **Berel** (`src/lib/artifact-composer/catalogs/deck-axis/assets/clients/berel.svg`).
  Procedencia en `ai-generations/2026-09-29_deck-seo-aeo-documentos/logos/PROCEDENCIA.txt`.
- Son los **primeros casos pendientes** de esta biblioteca para logos de clientes: su uso está condicionado a la
  autorización de cada cliente, y las cifras de los tres casos son de ejemplo hasta que el operador pase las reales con
  fuente, período, servicio y permiso. Ningún deck con esas láminas sale a un cliente sin las dos cosas. Grupo Security
  se fusionó con BICECORP (sep-2025, marca BICE): si los casos vienen de esa época, el pie debe decirlo.

## Delta 2026-09-29 (d) — Salesforce autorizó sus marcas (declarado por el operador)

- El operador declaró la insignia «Salesforce Partner» autorizada por Salesforce («Todo está aprobado. Necesito que
  tengan el Badge de Salesforce Partner ya está autorizado por Salesforce»); en el deck Salesforce valen también logo e
  íconos de producto. Referencia estable: `salesforce-partner-authorization-2026-09-29` (registro de partnerships).
  Archivar la copia escrita junto a `ai-generations/2026-09-29_deck-salesforce/DECISIONES.md` es recomendado, no
  bloqueante. Sigue pendiente la autorización escrita de **Anthropic** (Claude y Claudeforce en SF16). Agent Astro,
  edición interpretativa, no entra a ningún package. — TASK-1942.

## Delta 2026-09-29 — autorizaciones pendientes del deck de práctica Salesforce (TASK-1942)

- Por archivar: la autorización escrita de **Salesforce** (logo, 8 íconos de producto, Agent Astro, insignia «Salesforce
  Partner») y la de **Salesforce y Anthropic** (Claude y Claudeforce en la lámina «Enablement conversacional»). El
  operador la declaró el 2026-09-29; sin la escrita, esas láminas no salen a clientes ni a pauta. Hoy el estado vive en
  `AXIS_PARTNER_ASSETS` (`authorization.status: 'pending-written-authorization'`) y en
  `ai-generations/2026-09-29_deck-salesforce/DECISIONES.md`; las plantillas exigen `authorizationRef` para mascota y
  co-marcas. La insignia además exige readback del programa (registro de partnerships).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm|content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Efeonce registra **una sola vez** que un tercero (un cliente, un partner o la persona de un testimonio) autorizó usar su
logo, una cita suya o una foto de su caso, con el documento que lo respalda, su vigencia, los canales donde vale y la
posibilidad de revocarla. Los binders del deck «La órbita» (TASK-1930) leen esa biblioteca además de la evidencia de
cada `Proposal`, y así el muro de logos, el caso y el testimonio dejan de exigir que alguien registre nueve
autorizaciones cada vez que arma un deck.

## Why This Task Exists

- **El muro de logos casi nunca compone.** Desde TASK-1930 un logo de tercero sólo entra con evidencia `attested` y
  documento **de esa propuesta**, y `content-clients` / `content-partners` piden nueve (decisión del operador
  2026-09-28). Registrar nueve autorizaciones por deck es tan caro que, en la práctica, la lámina no sale.
- **La autorización es de la relación, no de la propuesta.** Que Sky autorizó su logo no cambia de un deck a otro;
  modelarlo por `Proposal` repite el mismo dato y lo deja sin vigencia ni revocación: si un cliente retira el permiso,
  nada impide que su logo siga saliendo en un deck nuevo.
- **La regla existe y el registro no.** El catálogo de recetas, el registro de partnerships
  (`EFEONCE_PARTNERSHIP_REGISTRY_V1.md`) y los módulos del sitio público exigen «logos sólo autorizados», pero no hay
  dónde consultarlo: hoy la autorización vive en la memoria del operador.
- **Fuera de una `Proposal` no hay camino.** Un brochure o un pitch de marca propia queda con `no-authorization` en todo
  slot de prueba (TASK-1930), aunque la autorización exista.

## Goal

- Una autorización de uso por tercero y tipo (logo, testimonio, foto de caso) registrada una vez por una persona, con
  documento de respaldo, vigencia, canales y revocación auditada.
- Un reader canónico que responde «¿esta autorización está vigente, para este canal, a esta fecha?» y que los binders
  de TASK-1930 consumen sin lógica paralela.
- Revocar una autorización impide su uso en todo deck compuesto después, sin tocar lo ya entregado.
- Contrato gobernado (API + CLI) desde el primer día; la acción de Nexa y la tool MCP quedan como follow-up declarado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (el tercero es una `organization` canónica; la persona citada,
  cuando exista, un `identity_profile`)
- `docs/architecture/GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1.md` (el logo de la organización y su variante
  oscura: esta task no los duplica, los referencia)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (`proposal_evidence`, proyección allowlisted)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + grant en el mismo PR)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migración con markers y bloque DO)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Sin documento no hay autorización.** Cada fila exige `source_asset_id` en `greenhouse_core.assets`; una
  autorización «confirmada de palabra» no se registra.
- **Una persona registra y revoca.** El actor es siempre `member`; un agente o Nexa sólo propone.
- **Append-only.** Una autorización no se edita ni se borra: se revoca (fila de revocación) o se reemplaza por una nueva.
- **La vigencia se evalúa al componer**, a la fecha de composición, nunca al registrar.
- **Datos personales mínimos.** De la persona de un testimonio sólo nombre, cargo o equipo y la cita autorizada textual;
  nada de correo, teléfono ni documento de identidad en la fila.
- **No reemplaza `proposal_evidence`.** La evidencia de una propuesta sigue siendo válida; la biblioteca es una segunda
  fuente, y la de la propuesta no puede resucitar una autorización revocada en la biblioteca.

## Normative Docs

- `docs/tasks/in-progress/TASK-1930-deck-recipe-slot-data-bindings.md` (binders `proof-logo`, `proof-quote`,
  `proof-photo`, `proof-figures`; Follow-ups y Open Question resuelta el 2026-09-28)
- `docs/tasks/to-do/TASK-1931-brand-plate-bank-governed.md` (follow-up «plates de clientes con autorización de uso»)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (§Datos reales por slot)
- `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md` (casos y logos de partners exigen autorización)

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (el tercero) y `greenhouse_core.assets` (documento de respaldo, logo, foto) —
  existentes.
- `greenhouse_core.identity_profiles` para la persona citada, sólo como vínculo opcional `[verificar]`.
- TASK-1930 Slices 1–4 (en `develop`): `checkEvidence` en
  `src/lib/brand-surfaces/deck-recipes/bindings/binders/evidence.ts` y el loader `loadDeckBindingSources` en
  `bindings/index.ts`.
- `src/lib/storage/greenhouse-assets.ts` (`getAssetById`) para verificar que el documento existe y no está en cuarentena.

### Blocks / Impacts

- `TASK-1930`: los binders `proof-*` pasan a aceptar un `evidenceRef` de la biblioteca; fuera de una `Proposal`, la
  prueba de terceros deja de ser siempre `no-authorization`.
- `TASK-1932`: el preview del deck muestra de qué autorización sale cada logo, cita o foto.
- `TASK-1931`: su follow-up de plates de clientes consume la autorización de tipo `case_photo`.
- Sitio público (módulos de logos y casos): consumidor futuro del mismo reader, fuera de esta task.

### Files owned

- `migrations/<timestamp>_task-1937-brand-usage-authorizations.sql` `[nuevo, vía pnpm migrate:create]`
- `src/types/db.d.ts` (regenerado)
- `src/lib/commercial/brand-usage-authorizations/types.ts`, `store.ts`, `reader.ts`, `commands.ts`, `errors.ts`
  `[nuevos]`
- `src/lib/commercial/brand-usage-authorizations/__tests__/**` `[nuevos]`
- `src/app/api/commercial/brand-usage-authorizations/route.ts` y
  `src/app/api/commercial/brand-usage-authorizations/[authorizationId]/revoke/route.ts` `[nuevos]`
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` (capabilities + grants)
- `src/lib/brand-surfaces/deck-recipes/bindings/binders/evidence.ts`, `bindings/index.ts`, `bindings/types.ts`
  (consumo de la biblioteca)
- `scripts/commercial/brand-usage-authorizations.ts` + script `pnpm brand:authorizations` en `package.json` `[nuevos]`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (sección de la biblioteca)
- `docs/documentation/creative/linea-grafica-efeonce.md` (delta funcional)
- `docs/manual-de-uso/comercial/registrar-autorizaciones-de-marca.md` `[nuevo]`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (eventos nuevos)

## Current Repo State

### Already exists

- `greenhouse_commercial.proposal_evidence` (TASK-1392): evidencia por propuesta con `source_asset_id`,
  `classification` (`attested`), `audience` y `as_of`; sin vigencia ni revocación.
- Acción de Nexa `record_proposal_evidence` (TASK-1399) para registrar esa evidencia.
- Binders `proof-logo`, `proof-quote`, `proof-photo` y `proof-figures` (TASK-1930) que hoy sólo aceptan evidencia
  `attested` con documento de la propuesta.
- Logos de la propia organización (`organizations.logo_asset_id` / `logo_on_dark_asset_id`, TASK-999/1888) y el store
  de assets `greenhouse_core.assets`.

### Gap

- No existe tabla, reader ni command de autorizaciones de uso por tercero (barrido 2026-09-28: sólo hay consentimientos
  OAuth, de formularios y de candidatos, que son otra cosa).
- No hay vigencia ni revocación para una autorización de marca.
- Fuera de una `Proposal` no hay forma de ligar un logo, una cita o una foto de tercero.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/brand-usage-authorizations/` (store, reader y commands server-only sobre el PostgreSQL del portal) + rutas en `src/app/api/commercial/brand-usage-authorizations/`
- Future candidate home: `domain-package`
- Boundary: el reader `readBrandUsageAuthorizations({ ids?, subjectOrganizationIds?, kind?, channel, asOf })` y los commands `registerBrandUsageAuthorization` / `revokeBrandUsageAuthorization` son el único contrato; los consumers (binders de TASK-1930, API, CLI y, después, Nexa/MCP y el sitio público) nunca leen la tabla directo
- Server/browser split: sólo server (`server-only`); ningún Client Component lo importa
- Build impact: sin dependencias nuevas; el loader de TASK-1930 lo importa dentro del bundle de Vercel y del Job `artifact-worker`
- Extraction blocker: comparte transacción con `greenhouse_core.assets` y `organizations` y con el outbox del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_commercial.brand_usage_authorizations` y
  `greenhouse_commercial.brand_usage_authorization_revocations` (nuevas); lectura de `greenhouse_core.organizations`
  y `greenhouse_core.assets`
- Consumidores afectados: binders de TASK-1930 (vía su loader), TASK-1932, CLI local; más adelante Nexa/MCP y el sitio
  público
- Runtime target: `local` y staging (la instancia compartida) en esta task; producción cuando la consuma TASK-1932

### Contract surface

- Contrato existente a respetar: `proposal_evidence` y `assertEvidenceAllowedForAudience` (no se tocan);
  `checkEvidence` de TASK-1930 (se extiende, no se reemplaza); `getAssetById`
- Contrato nuevo o modificado: tablas nuevas; `readBrandUsageAuthorizations`; commands register/revoke; rutas
  `GET/POST /api/commercial/brand-usage-authorizations` y `POST …/[authorizationId]/revoke`; eventos outbox
  `commercial.brand_usage_authorization.registered` y `.revoked` (v1); `evidenceRef` `bua-…` aceptado por los binders
- Backward compatibility: `compatible` — aditivo; los binders siguen aceptando evidencia de la propuesta
- Full API parity: API + CLI en esta task; acción de Nexa (`propose → confirm → execute`) y tool MCP como follow-up
  explícito

### Data model and invariants

- Entidades/tablas/views afectadas:
  - `brand_usage_authorizations`: `authorization_id` (`bua-…`), `owner_org_id` (Efeonce), `subject_organization_id`
    (el tercero, FK a `organizations`), `kind` (`logo` | `testimonial` | `case_photo`), `channels` (`deck` |
    `public_site` | `case_study`, al menos uno), `source_asset_id` (documento, NOT NULL), `subject_asset_id` (logo o
    foto autorizados; NOT NULL salvo `testimonial`), `quote_text`, `author_name`, `author_role` (sólo `testimonial`,
    obligatorios ahí), `valid_from`, `valid_to` (nullable = sin vencimiento), `content_hash`,
    `created_by_member_id`, `created_at`
  - `brand_usage_authorization_revocations`: `authorization_id` (UNIQUE), `revoked_at`, `revoked_by_member_id`,
    `reason` (≥ 10 caracteres), append-only
- Invariantes que no se pueden romper:
  - Toda autorización tiene documento de respaldo existente y fuera de cuarentena.
  - `testimonial` guarda la cita textual autorizada; un binder nunca liga otra cita con esa autorización.
  - Vigente = no revocada y `valid_from <= asOf < valid_to` (o sin `valid_to`) y el canal pedido está en `channels`.
  - Una revocación es definitiva: la evidencia de una propuesta no reactiva un logo, cita o foto revocados en la
    biblioteca para el mismo tercero y tipo.
  - Ninguna fila guarda correo, teléfono ni documento de identidad de la persona citada.
- Write-target allowlist: sólo las dos tablas nuevas, vía los commands de `src/lib/commercial/brand-usage-authorizations/`
- Tenant/space boundary: `owner_org_id` = la organización dueña (Efeonce); todo reader y command filtra por
  `owner_org_id` del sujeto autenticado
- Idempotency/concurrency: register idempotente por `content_hash` (mismo tercero, tipo, documento, sujeto y vigencia →
  misma fila); revoke idempotente por `authorization_id` (UNIQUE)
- Audit/outbox/history: eventos outbox v1 en register y revoke, en la misma transacción; la historia es la propia tabla
  append-only

### Migration, backfill and rollout

- Migration posture: `additive` — dos tablas nuevas + seed de capabilities; `-- Up Migration` + bloque DO anti
  pre-up-marker + GRANTs a `greenhouse_runtime`
- Default state: sin filas; nada cambia en los decks hasta que alguien registre una autorización
- Backfill plan: sin backfill automático. El operador registra con la CLI las autorizaciones que ya tiene documentadas
  (una por tercero, con su documento); ninguna se infiere de los logos del catálogo del composer
- Rollback path: `revert PR` + migración down (DROP de las dos tablas vacías o sin consumidores); los binders vuelven a
  leer sólo `proposal_evidence`
- External coordination: el operador reúne los documentos de autorización (correos, contratos, formularios firmados) y
  decide los canales de cada uno

### Security and access

- Auth/access gate: capabilities nuevas `commercial.brand_authorization.read`, `.register` y `.revoke` con grant en
  `runtime.ts` en el mismo PR (propuesta inicial: `efeonce_admin` y `efeonce_account` registran y revocan;
  `efeonce_operations` lee — confirmar en Discovery contra `role-codes.ts`)
- Sensitive data posture: nombre y cargo de la persona citada y la cita; documentos de respaldo privados en el store de
  assets (nunca URL pública en la fila ni en el rastro)
- Error contract: `canonicalErrorResponse` con códigos nuevos (`brand_authorization_document_missing`,
  `brand_authorization_already_revoked`, …) en es-CL; `captureWithDomain(err, 'commercial', …)` en lecturas y writes
- Abuse/rate-limit posture: writes sólo humanos por capability; lectura acotada por organización

### Runtime evidence

- Local checks: tests de commands (idempotencia, documento faltante, revocación doble), del reader (vigencia, canal,
  revocada) y de los binders (liga desde la biblioteca, revocada no liga, la propuesta no resucita una revocada)
- DB/runtime checks: `pnpm migrate:up` + verificación en `information_schema`; registrar una autorización de prueba en
  la instancia compartida, ligarla con `pnpm brand:deck-plan -- --bind` y revocarla, con la salida en el cierre
- Integration checks: sin integración externa
- Reliability signals/logs: sin señal nueva en V1; `captureWithDomain`
- Production verification sequence: la cubre TASK-1932 al encender su flag

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Commands y reader en `src/lib/commercial/brand-usage-authorizations/`.
- [ ] **Modelada como aggregate/recurso/command, no como click-handler.**
- [ ] **Read** como reader canónico; **write** como command con capability fina, idempotencia, outbox y errores canónicos.
- [ ] **Capability + grant en el MISMO PR** (registry + `runtime.ts` + coverage test).
- [ ] **Camino programático declarado:** API + CLI en esta task; Nexa y MCP como follow-up explícito.
- [ ] **Write apto para `propose → confirm → execute`:** el command exige actor `member`; la acción de Nexa sólo propone.
- [ ] **Un primitive, muchos consumers:** binders, API y CLI llaman al mismo reader y commands.
- [ ] **Parity check = SÍ** con la API; Nexa/MCP heredan al cerrar su follow-up.

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

### Slice 1 — Tablas y capabilities

- Migración con las dos tablas, CHECKs (`kind`, `channels` no vacío, campos de `testimonial` obligatorios sólo ahí,
  `valid_to > valid_from`), índices por `(owner_org_id, subject_organization_id, kind)`, bloque DO de verificación,
  GRANTs y seed de las tres capabilities; `db.d.ts` regenerado en el mismo commit.
- Capabilities en `entitlements-catalog.ts` y grants en `runtime.ts`.

### Slice 2 — Commands y reader

- `registerBrandUsageAuthorization` (verifica documento y sujeto con `getAssetById`, idempotente por `content_hash`,
  outbox v1) y `revokeBrandUsageAuthorization` (fila de revocación, idempotente, outbox v1).
- `readBrandUsageAuthorizations` con la regla de vigencia por canal y fecha.

### Slice 3 — API

- `GET/POST /api/commercial/brand-usage-authorizations` y `POST …/[authorizationId]/revoke` con capability, validación
  y `canonicalErrorResponse`.

### Slice 4 — Los binders de TASK-1930 leen la biblioteca

- `checkEvidence` acepta un `evidenceRef` `bua-…` para `need: 'attested'`: vigente para el canal `deck` a la fecha de
  composición, del tipo que pide el binder (`logo`, `testimonial`, `case_photo`) y, en `testimonial`, con la cita
  textual idéntica a la del hecho.
- El loader lee las autorizaciones citadas (con y sin `Proposal`); una revocada queda `no-authorization` aunque la
  propuesta traiga evidencia `attested` del mismo tercero y tipo.

### Slice 5 — CLI y documentación

- `pnpm brand:authorizations -- register | list | revoke` (perfil runtime, actor humano con `--member`).
- Arquitectura, doc funcional, manual y catálogo de eventos.

## Out of Scope

- La acción de Nexa y la tool MCP (follow-up con su propia task).
- Una pantalla en el portal para registrar o revisar autorizaciones.
- Consumir la biblioteca en el sitio público o en casos publicados.
- Autorizaciones de cifras de un caso (`proof-figures`): siguen saliendo de evidencia de la propuesta en V1.
- Migrar o borrar `proposal_evidence`.
- Inferir autorizaciones desde los logos que ya están en el catálogo del composer.

## Detailed Spec

**Qué pide cada binder de TASK-1930 a la biblioteca:**

| Binder | `kind` | Canal | Además |
|---|---|---|---|
| `proof-logo` (caso, testimonio, muro de clientes y partners) | `logo` | `deck` | el `logoAssetId` del hecho es el `subject_asset_id` autorizado |
| `proof-quote` | `testimonial` | `deck` | la cita y el autor del hecho son los autorizados |
| `proof-photo` | `case_photo` | `deck` | el `photoAssetId` del hecho es el `subject_asset_id` autorizado |

**Rastro:** una prueba ligada desde la biblioteca lleva `source: 'brand-authorization'` (valor nuevo de
`SlotBindingSource`), `evidenceRef` = `bua-…` y `asOf` = `valid_from`.

## Rollout Plan & Risk Matrix

Cambio aditivo: tablas nuevas vacías, sin flag propio y sin consumidor productivo hasta TASK-1932. El riesgo real es
de datos (una autorización mal registrada o una revocación ignorada), no de runtime.

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slices 3 y 4 (en cualquier orden) → Slice 5.
- La migración se aplica antes de mergear el código que la lee (expand primero).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se usa un logo o una cita con la autorización revocada | marca / legal | low | vigencia evaluada al componer; la propuesta no resucita una revocada (test) | `no-authorization` en el rastro |
| Se registra una autorización sin respaldo real | legal | medium | documento obligatorio y verificado; actor humano con capability | revisión del documento en la lista |
| Datos personales de la persona citada de más | privacidad | low | columnas acotadas (nombre, cargo, cita); sin contacto ni identificación | test de columnas |
| Se liga una cita distinta de la autorizada | marca / legal | low | igualdad textual entre hecho y autorización | `no-authorization` |

### Feature flags / cutover

Sin flag: tablas vacías y lectura aditiva. El cutover productivo lo gobierna el flag de TASK-1932.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | migración down (DROP de las tablas nuevas) + `git revert` | < 15 min | sí, mientras no haya autorizaciones reales registradas |
| Slices 2–5 | `git revert` | < 10 min | sí |

### Production verification sequence

1. Local: tests de commands, reader y binders.
2. Instancia compartida: registrar, listar, ligar con `--bind` y revocar una autorización de prueba de Efeonce
   (`EO-ORG-0007`), y confirmar que el deck deja de ligarla.
3. Producción: la cubre TASK-1932.

### Out-of-band coordination required

- El operador reúne los documentos de autorización vigentes y decide canales y vigencia de cada uno antes de registrar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las dos tablas existen en la instancia compartida y un bloque DO en la migración verifica su creación.
- [ ] Registrar sin documento de respaldo existente falla con un error canónico (test).
- [ ] Registrar dos veces lo mismo devuelve la misma autorización (test de idempotencia).
- [ ] Una autorización revocada, vencida o de otro canal no la devuelve el reader como vigente (test).
- [ ] `proof-logo`, `proof-quote` y `proof-photo` ligan desde una autorización vigente con `source: 'brand-authorization'` (test).
- [ ] Una revocación en la biblioteca gana a la evidencia `attested` de una propuesta para el mismo tercero y tipo (test).
- [ ] Fuera de una `Proposal`, un logo autorizado en la biblioteca liga en un brochure (test).
- [ ] Ninguna fila guarda correo, teléfono ni documento de identidad de la persona citada (test de columnas).
- [ ] Capabilities con grant a roles reales y `capability-grant-coverage.test.ts` en verde.
- [ ] Eventos `registered` y `revoked` v1 en el catálogo de eventos.
- [ ] Evidencia de registro → `--bind` → revocación contra la instancia compartida en el cierre.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre; focal `src/lib/commercial/brand-usage-authorizations` y
  `src/lib/brand-surfaces/deck-recipes/bindings`)
- `pnpm migrate:up` + verificación en `information_schema`
- `pnpm brand:authorizations -- list` y `pnpm brand:deck-plan -- --bind` contra la instancia compartida

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en TASK-1930, TASK-1931 y TASK-1932 con el `evidenceRef` `bua-…` y la regla de revocación

## Follow-ups

- Acción de Nexa `register_brand_usage_authorization` (`propose → confirm → execute`) y tool MCP de lectura.
- Pantalla del portal para ver y revocar autorizaciones por organización.
- Consumo desde el sitio público (muro de clientes y casos).
- Aviso cuando una autorización está por vencer.

## Open Questions

- ¿Los documentos de autorización que ya existen distinguen canal (deck vs sitio público)? Si no, ¿se registran con
  todos los canales o sólo con `deck`? Propuesta: sólo los que el documento nombra; si no nombra ninguno, `deck`.
- ¿Quién registra y revoca? Propuesta inicial `efeonce_admin` y `efeonce_account`; confirmar con el operador.
