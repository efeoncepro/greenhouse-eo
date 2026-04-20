# Plan — TASK-461 MSA Umbrella Entity & Clause Library

## Discovery summary

- La spec original asumia que el dominio contractual podia extenderse directo sobre `contracts` sin revisar el cutover organization-first de quotations; el runtime real quedo mixto:
  - quotations ya migraron a `organization_id` en TASK-486
  - contracts siguen scopeados principalmente por `space_id`
  - `contracts.msa_id` existe solo como placeholder sin FK real
- Ya existe un patron reusable de texto legal en `greenhouse_commercial.terms_library` + `quotation_terms`, pero esta orientado a snapshots de quote; no cubre versionado y attach persistente de un marco legal umbrella.
- El asset system canonico ya existe en `src/lib/storage/greenhouse-assets.ts`; la spec estaba desactualizada al referir `src/lib/assets/*`.
- No existe surface MSA en API ni UI.

## Access model

El cambio vive en ambos planos.

- `views` / `authorizedViews`:
  - agregar surfaces nuevas bajo `finance` para `/finance/master-agreements` y `/finance/master-agreements/[id]`
  - mantenerlas admin-gated dentro del route group `finance`
- `entitlements`:
  - no se crea una capability legal nueva en este corte
  - V1 reutiliza el gate actual `canAdministerPricingCatalog` (`efeonce_admin` + `finance_admin`)
- `startup policy`: sin cambios

## Skills

- Slice 1 — migration + backend stores + contract/asset integration:
  - `greenhouse-agent`
- Slice 2 — App Router API routes:
  - `greenhouse-agent`
  - `vercel:nextjs`
- Slice 3 — UI / pages:
  - `greenhouse-agent`
  - `greenhouse-ui-orchestrator`
  - `greenhouse-portal-ui-implementer`
  - `greenhouse-ux-content-accessibility`

## Subagent strategy

`parallel-after-backend-contract`

- Primero cierro localmente el contrato tecnico compartido:
  - migration
  - stores
  - API shape
- Luego paralelizo slices con write sets disjuntos:
  - UI/pages
  - docs/cierre administrativo

## Execution order

1. Mover TASK-461 a `in-progress`, dejar handoff y plan.
2. Crear migracion formal `task-461-msa-umbrella-clause-library`.
3. Extender asset contexts y registrar el FK real `contracts.msa_id -> master_agreements`.
4. Implementar stores backend:
   - `master-agreements-store`
   - `master-agreement-clauses-store`
   - `msa-events`
   - resolver de clauses efectivas por contract
5. Corregir runtime de contracts para coexistencia `organization_id` + `space_id`.
6. Crear API routes `/api/finance/master-agreements/**` y `/api/finance/contracts/[id]/msa`.
7. Implementar pages/views admin de MSA.
8. Actualizar docs de arquitectura y documentacion funcional.
9. Ejecutar migracion, regenerar `db.d.ts`, validar `lint`, `build`, chequeo `new Pool`, y cerrar con commit/push.

## Files to create

- `migrations/<timestamp>_task-461-msa-umbrella-clause-library.sql`
- `src/lib/commercial/master-agreements-store.ts`
- `src/lib/commercial/master-agreement-clauses-store.ts`
- `src/lib/commercial/msa-events.ts`
- `src/app/api/finance/master-agreements/route.ts`
- `src/app/api/finance/master-agreements/[id]/route.ts`
- `src/app/api/finance/master-agreements/[id]/clauses/route.ts`
- `src/app/api/finance/master-agreements/clause-library/route.ts`
- `src/app/api/finance/master-agreements/clause-library/[clauseId]/route.ts`
- `src/app/api/finance/contracts/[id]/msa/route.ts`
- `src/views/greenhouse/finance/MasterAgreementsListView.tsx`
- `src/views/greenhouse/finance/MasterAgreementDetailView.tsx`
- `src/app/(dashboard)/finance/master-agreements/page.tsx`
- `src/app/(dashboard)/finance/master-agreements/[id]/page.tsx`

## Files to modify

- `docs/tasks/in-progress/TASK-461-msa-umbrella-clause-library.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `src/lib/commercial/contracts-store.ts`
- `src/lib/commercial/contract-lifecycle.ts`
- `src/lib/storage/greenhouse-assets.ts`
- `src/types/assets.ts`
- `src/app/api/assets/private/route.ts`
- `src/app/api/assets/private/[assetId]/route.ts` if access rules need extension
- `src/lib/sync/event-catalog.ts`
- `src/types/db.d.ts`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/documentation/finance/contratos-comerciales.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Files to delete

- ninguno

## Risk flags

- Hay drift real entre quotation tenant scope (`organization_id`) y contracts (`space_id`); si no se corrige, MSA nace sobre un carril tenant-inseguro.
- `terms_library` y `clause_library` deben convivir con una frontera clara para no duplicar semantica.
- El attach de PDF firmado toca permisos de assets privados y puede romper otros draft contexts si se hace de forma ad hoc.

## Open questions

- V1 dejara `client_id` nullable en `master_agreements` para soportar prospects organization-first; `organization_id` sera el anchor obligatorio.
- La herencia MSA -> contract se resolvera en tiempo de lectura para clauses legales; los overrides contract-level quedan diferidos a un slice posterior salvo que aparezca infraestructura reusable evidente durante la implementacion.
