# TASK-1644 — Artifact Composer Visual Profiles for Proposal Studio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-029`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `commercial|platform|delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin branch dedicada ni worktree`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar perfiles visuales versionados —Skin como nombre de producto y `VisualProfile` como contrato técnico— para que un mismo catálogo/base del Artifact Composer produzca variantes visuales distintas sin duplicar templates, geometría ni el motor de render.

Proposal Studio podrá seleccionar y confirmar un perfil permitido; Artifact Composer lo resolverá, validará y sellará dentro del manifest inmutable que consume `artifact-worker`. La primera entrega se limita a perfiles `token-only` y conserva el camino actual de `deck-axis` como default.

## Why This Task Exists

El catálogo `deck-axis` fija actualmente el brand pack `axis`, y `ResolvedCompositionManifest` sella catálogo, templates, brand pack y fuentes, pero no tiene una dimensión de perfil visual. Por eso una variante de color, tipografía, receta o molde sólo puede implementarse duplicando datos del catálogo o cambiando el pack fijo.

La selección visual tampoco puede vivir únicamente en Proposal Studio: si no llega resuelta y hasheada al manifest, el worker no puede garantizar reproducibilidad, idempotencia ni detección de drift. El seal actual debe además revisar todas las dependencias visuales que realmente afectan el render, no sólo los archivos compilados declarados hoy.

## Goal

- Definir un `VisualProfile` inmutable, versionado, con owner, compatibilidad por catálogo y digest determinista.
- Resolver perfiles desde Artifact Composer como ingrediente compuesto por brand pack, fuentes y tokens/recetas visuales; mantener templates, slots y geometría dentro del catálogo.
- Incorporar el perfil resuelto y sus hashes completos al manifest, con compatibilidad explícita para manifests legacy y rechazo fail-closed ante drift.
- Permitir que Proposal Studio y sus consumers gobernados seleccionen sólo perfiles admitidos, manteniendo el patrón `propose → confirm → execute` y el command de render existente.
- Probar una variante visual alternativa sin cambiar el output del perfil `axis` por defecto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Artifact Composer permanece domain-free; Proposal Studio no puede introducir lógica comercial dentro del selector, la composición ni el renderer.
- El catálogo sigue siendo dato: una Skin no crea un catálogo nuevo mientras no cambie templates, slots, viewport, geometría, paginación u output target.
- `ResolvedCompositionManifest` sigue siendo la única entrada persistible, confirmable y renderizable; el perfil debe formar parte de su hash canónico.
- `BrandPack` es un ingrediente de `VisualProfile`, no el owner de toda la abstracción. No se permite CSS arbitrario, paths libres ni valores visuales no versionados.
- El worker debe re-resolver el perfil contra su bundle local y fallar con drift/integrity antes de publicar un artefacto.
- La selección se limita por organización, catálogo compatible, derechos de fonts/assets y audiencia; no se acepta un `ownerOrgId` libre desde un agente o payload no confiable.
- La modificación del manifest y del source of truth compartido requiere una decisión arquitectónica aceptada antes de implementar el contrato final.

## Normative Docs

- `.codex/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/operations/runbooks/composer-visual-gate.md`

## Dependencies & Impact

### Depends on

- `TASK-1393` (complete) — Artifact Composer domain-free, catálogo `deck-axis`, brand pack y manifest.
- `TASK-1391` (complete) — render pipeline gobernado y `artifact-worker`.
- `TASK-1392` (complete) — aggregate `Proposal`, commands, gates humanos y entitlements.
- `TASK-1399` (complete) — consumers Nexa y patrón de acciones gobernadas de Proposal Studio.
- `EPIC-029` — owner del producto Proposal Studio y de su composición/render client-facing.

### Blocks / Impacts

- Futura UI de autoría/selección de Proposal Studio: deberá consumir el registry/reader y el command resultantes, no crear un selector paralelo.
- `TASK-1419` y `TASK-1420`: orquestador y verifier deberán tratar el perfil como parte del plan/manifest, sin elegir templates ni CSS.
- Catálogos futuros del Composer: podrán declarar compatibilidad con perfiles; no quedan obligados a adoptar el perfil `deck-axis`.
- No impacta Globe ni sus catálogos: Artifact Composer y Proposal Studio viven en Greenhouse.

### Files owned

- `src/lib/artifact-composer/catalog.ts`
- `src/lib/artifact-composer/plan.ts`
- `src/lib/artifact-composer/brand-pack.ts`
- `src/lib/artifact-composer/compose.ts`
- `src/lib/artifact-composer/catalogs/deck-axis/index.ts`
- `src/lib/artifact-composer/__tests__/`
- `src/lib/commercial/tenders/proposals/action-schemas.ts`
- `src/lib/commercial/tenders/proposals/render-jobs.ts`
- `src/lib/commercial/tenders/proposals/render-agent.ts`
- `services/artifact-worker/main.ts`
- `services/artifact-worker/selftest.ts`
- `services/artifact-worker/README.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`
- `.codex/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md`

## Current Repo State

### Already exists

- `ArtifactCatalog` en `src/lib/artifact-composer/catalog.ts`, con brand fijo por catálogo y `resolveBrandSeal`.
- `BrandPack` determinista con roles semánticos, contraste fail-closed para packs de cliente y compilación CSS.
- `deckAxisCatalog` en `src/lib/artifact-composer/catalogs/deck-axis/index.ts`, que usa `brand.packName = axis`.
- `ResolvedCompositionManifest` en `src/lib/artifact-composer/plan.ts`, con hashes de registry, contratos, templates, brand pack, fuentes y validadores.
- `requestProposalRender` y su idempotencia por `(ownerOrgId, proposalId, manifestHash, artifactPurpose)`.
- `artifact-worker` con re-resolución del manifest y rechazo de `manifest_drift`.
- Gates de Proposal Studio para capability/entitlement, audience, evidencia, confirmación humana y errors sanitizados.

### Gap

- No existe `VisualProfile`/Skin ni registry de perfiles compatibles con catálogos.
- El autor o consumer no puede seleccionar una variante visual sin depender del brand pack fijo del catálogo.
- El manifest no identifica ni hashea el perfil visual completo.
- El seal actual no cubre explícitamente todos los recursos visuales que pueden modificar el render, incluidos mold/signature/recipes/assets cuando sean parte del perfil o catálogo.
- No existe una política de compatibilidad v1/v2 para manifests antiguos frente a manifests profile-aware.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/artifact-composer/**` para el motor, registry y resolución; `src/lib/commercial/tenders/proposals/**` para commands/actions/gates; `services/artifact-worker/**` para el render batch.
- Future candidate home: `domain-package`
- Boundary: `VisualProfile` y su resolver viven en Artifact Composer; Proposal Studio sólo selecciona/autoriza una referencia permitida y solicita el command; el worker consume exclusivamente el manifest resuelto.
- Server/browser split: refs, descriptores y metadata del manifest pueden ser browser-safe; registry de archivos, fonts, assets, DB, auth, secrets y render permanecen server/worker-only.
- Build impact: inputs de filesystem para CSS, fonts, recipes, templates y assets; el bundle de `artifact-worker` debe incluir las versiones exactas y pasar sus gates de build/selftest; no se agrega SDK externo.
- Extraction blocker: la costura compartida del manifest y la autorización org-scoped de Proposal Studio mantienen el trabajo dentro del monolito y del worker actual; no se autoriza crear `apps/*`, `packages/*` ni un deployable nuevo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: registry versionado de `VisualProfile` en `src/lib/artifact-composer/**` y `ResolvedCompositionManifest` persistido por el render job.
- Consumidores afectados: CLI, Proposal API/command, Nexa, futuro UI de Proposal Studio y `artifact-worker`.
- Runtime target: `local|staging|worker|production`

### Contract surface

- Contrato existente a respetar: `src/lib/artifact-composer/catalog.ts`, `src/lib/artifact-composer/plan.ts`, `src/lib/commercial/tenders/proposals/render-jobs.ts`, `src/lib/commercial/tenders/proposals/action-schemas.ts` y `hashResolvedManifest`.
- Contrato nuevo o modificado: `VisualProfileRef`, descriptor/registry de perfiles, contexto de resolución de `resolvePlan`, manifest profile-aware y validación del command de render.
- Backward compatibility: `compatible` y explícitamente versionada; manifests legacy deben seguir una rama de lectura/replay definida, sin reinterpretación silenciosa.
- Full API parity: Proposal Studio, Nexa y cualquier UI futura consumen el registry/reader y el command canónico; ningún consumer decide CSS, paths, hashes o gates localmente.

### Data model and invariants

- Entidades/tablas/views afectadas: no se crea tabla en esta task; `proposal_render_jobs` conserva el manifest canónico y su `manifestHash`.
- Invariantes que no se pueden romper:
  - un perfil se identifica por `id + version + digest`, tiene owner y declara `compatibleCatalogs`;
  - una modificación de cualquier recurso visual sellado cambia el digest/hash y bloquea replay por drift;
  - una Skin no puede cambiar templates, slots, geometría, viewport, paginación u output target;
  - `client_facing` mantiene los gates de audience/evidence y no expone recursos internos ni fuentes sin derechos de embedding;
  - un agente propone; sólo un miembro autorizado confirma el command.
- Tenant/space boundary: `ownerOrgId` deriva del scope/entitlement de Proposal Studio; los perfiles globales son explícitos y no un fallback implícito.
- Idempotency/concurrency: la selección entra al `manifestHash`; se conserva la unique key existente del render job y el claim transaccional del worker; reintentar el mismo manifest no crea un segundo artefacto.
- Audit/outbox/history: se reutilizan `proposal_render_jobs`, eventos/outbox y versionado de artefactos existentes; no se agrega un log paralelo de perfiles en esta primera versión.

### Migration, backfill and rollout

- Migration posture: `none|additive`; registry y bundles son archivos versionados; cualquier cambio de shape del manifest debe tener versionado explícito y compatibilidad de lectura.
- Default state: `flag OFF` para la selección de perfiles alternativos; el camino actual `axis` sin referencia conserva el comportamiento vigente.
- Backfill plan: no hay backfill; manifests legacy se leen por la rama compatible y no se reescriben automáticamente.
- Rollback path: desactivar el flag de perfiles alternativos y volver al path default; revertir el PR conserva la ejecución legacy; no se borran assets ni manifests existentes.
- External coordination: registro de cualquier flag nueva en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, variables en Vercel/ops-worker/worker y smoke de staging antes de cualquier flip productivo.

### Security and access

- Auth/access gate: capabilities/entitlement existentes de Proposal Studio (`commercial.proposal.*` + `proposal_studio_v1`), owner/compatibility checks server-side y actor `member` para confirmar gates humanos.
- Sensitive data posture: sin PII, payroll, finance ni secretos en el perfil; metadata de fonts/assets debe declarar derechos de uso/embedding y el renderer mantiene egress bloqueado.
- Error contract: errores canónicos y sanitizados para perfil inexistente, incompatible, integrity failure, rights failure y `manifest_drift`; nunca paths crudos, CSS arbitrario ni raw errors.
- Abuse/rate-limit posture: registry allowlisted, sin paths del caller ni URLs remotas; se reutilizan idempotencia, gates y límites del render job.

### Runtime evidence

- Local checks: tests focales de Composer/Proposal, `pnpm composer:brand-pack`, `pnpm composer:visual-gate`, `pnpm worker:build-contract-gate` y `pnpm typecheck`.
- DB/runtime checks: request/replay de render con manifest default y alternativo; prueba negativa de incompatibilidad/drift; smoke read-only de org isolation y unique idempotency en `proposal_render_jobs`.
- Integration checks: staging `artifact-worker` con bundle de perfil completo, selftest de fonts/assets, render PDF/PNG y verificación de manifest/hash emitidos.
- Reliability signals/logs: `manifest_drift`, failure codes canónicos del render job y señales existentes de cola/dead-letter; cualquier señal nueva debe registrarse en el contrato operativo.
- Production verification sequence: local gates → staging default/alternate → drift negativo → rollback flag OFF → sign-off del operador → promoción según `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`; no activar perfiles alternativos por merge automático.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Canonical errors, rights posture, audit/outbox reuse and no raw data leaks are verified.

### Capability Definition of Done — Full API Parity gate

- [ ] La lógica del perfil vive en Artifact Composer/commands, no en UI, Nexa ni scripts de consumo.
- [ ] La selección se modela como referencia permitida + resolución + command; no como click-handler.
- [ ] El read de perfiles y el write/render reutilizan primitives server-side, con authorization, idempotencia, errors sanitizados y audit/outbox existente.
- [ ] No se crea una capability paralela si basta extender `commercial.proposal.render`; si nace una capability nueva, registry, grant y coverage test entran en el mismo cambio.
- [ ] Proposal Studio/Nexa/UI futura consumen el mismo contrato y el mismo command.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa cuando un agente toma la task; no se llena al crearla.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — ADR y contrato de frontera

- Confirmar en una decisión/Delta aceptado el vocabulario `Skin` de producto → `VisualProfile` técnico.
- Fijar la frontera: profile visual vs `BrandPack` vs catálogo; compatibilidad por catálogo; owner/org scope; modo inicial `token-only`; persistencia futura fuera de esta task.
- Definir la política de manifests legacy y profile-aware, incluyendo el hash canónico y el registro de flags.

### Slice 1 — Registry y resolución determinista del Composer

- Crear el registry/descriptor versionado de perfiles dentro de `src/lib/artifact-composer/**` y el resolver allowlisted que recibe una referencia, no CSS/path.
- Hacer que `resolvePlan`/`ArtifactCatalog` resuelvan el perfil compatible con el catálogo y conserven el default `axis` sin referencia.
- Componer el perfil desde brand pack, fonts y tokens/recipes visuales; no duplicar templates ni mover geometría al perfil.
- Agregar una alternativa token-only aprobada para demostrar que una misma base puede producir una skin distinta.

### Slice 2 — Manifest, seal y `artifact-worker`

- Incorporar al manifest la referencia, versión, owner, compatibilidad, digest y hashes de todos los recursos visuales gobernados.
- Cubrir dependencias render-affecting actualmente no selladas —mold, signature, recipes y assets cuando correspondan— mediante hashes individuales o bundle digest canónico.
- Actualizar el worker/selftest para empaquetar, re-resolver y validar el perfil; incompatibilidad, missing resource o drift deben bloquear antes de publicar.
- Mantener lectura/replay explícitos para manifests legacy y evitar que Zod/API/Nexa reescriban el manifest.

### Slice 3 — Consumer gobernado de Proposal Studio

- Exponer únicamente perfiles permitidos al contexto/reader de Proposal Studio y validar owner, catálogo, derechos y audiencia server-side.
- Hacer que API, Nexa y futuros consumers transporten el manifest resuelto verbatim y crucen el mismo command/gates humanos de render.
- Reutilizar `commercial.proposal.render`, `proposal_studio_v1`, `assertProposalRenderAdmissible` y la idempotencia existente; no crear un endpoint o capability paralelos sólo para la Skin.

### Slice 4 — Baseline visual, rollout y documentación

- Verificar que el perfil default `axis` conserva paridad visual contra el baseline vigente.
- Verificar que la alternativa token-only cambia la identidad visual de manera intencional, determinista y aprobada, sin modificar la estructura del catálogo.
- Ejecutar staging smoke del worker, drift negativo, idempotencia, org isolation y rollback con el flag OFF.
- Actualizar arquitectura, companion runtime, runbook y handoff con estado real y follow-ups de persistencia/UI.

## Out of Scope

- UI visible de selección o autoría de Skins; se mantiene como consumer futuro de este contrato.
- Tabla/CRUD multi-tenant para que clientes creen o editen perfiles; si aparece esa necesidad, abrir una task de persistencia, lifecycle, permisos y auditoría.
- CSS arbitrario, paths remotos, URLs de assets en el payload, Skin por slide o elección de template por el autor/agente.
- Cambios de templates, slots, geometría, viewport, paginación u output target; esos cambios requieren catálogo/variant nuevo.
- Nuevos renderers PPTX/Adobe Express, Globe, AXIS UI package o deployables adicionales.

## Detailed Spec

El contrato técnico debe conservar la separación entre intención y autoridad de presentación. La intención del contenido sigue siendo `artifactId + slides(contentType + slots)`. La referencia visual se resuelve en un contexto controlado por el consumer y el resultado queda sellado en el manifest.

La forma mínima esperada es equivalente a:

```ts
type VisualProfileRef = {
  id: string
  version: string
}

type CompositionResolutionContext = {
  visualProfileRef?: VisualProfileRef
}

type ResolvedVisualProfile = {
  id: string
  version: string
  ownerOrgId: string
  compatibleCatalogs: string[]
  mode: 'token-only' | 'bundle'
  digest: string
  components: Array<{ kind: string; name: string; sha256: string }>
}
```

Los nombres finales, la versión del manifest y la forma de compatibilidad deben quedar fijados por el Slice 0. El manifest no debe guardar sólo el slug: debe guardar la identidad versionada y el digest de la resolución que realmente gobernó el render.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (ADR/contrato) MUST preceder Slice 1.
- Slice 1 (registry/resolver) MUST precede Slice 2 (manifest/worker).
- Slice 2 MUST be verde antes de habilitar Slice 3 en un consumer.
- Slice 3 (Proposal/Nexa/API) MUST precede Slice 4 staging/rollout.
- Slice 4 puede actualizar documentación en paralelo sólo después de que la evidencia del runtime esté disponible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Una Skin altera el output default o el baseline | composer/render | medium | perfil default explícito, visual gate a 0 px y rollback por flag | `composer:visual-gate` rojo o delta no declarado |
| Un recurso visual queda fuera del digest | manifest/worker | medium | inventario de dependencias + selftest + drift negativo antes de publicar | `manifest_drift` o digest incompleto |
| Perfil incompatible o de otra organización | Proposal/access | low | owner/compatibleCatalogs/entitlement derivados server-side y fail-closed | `visual_profile_incompatible` / access denial |
| Manifest v1 deja de reproducirse o se reinterpreta | API/worker | medium | ramas de lectura versionadas, fixtures v1/v2 y no rewrite en Zod | replay mismatch o `manifest_schema_invalid` |
| Se habilita una variante sin aprobación visual | rollout/operator | medium | flag OFF, sign-off y baseline aprobado antes del flip | flag drift o ausencia de evidencia de staging |

### Feature flags / cutover

- Registrar `ARTIFACT_VISUAL_PROFILES_ENABLED` en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, con default `false` en todos los runtimes que lo consuman.
- Sin el flag, el path actual del perfil `axis` permanece operativo y no se seleccionan perfiles alternativos.
- El flip requiere staging verde, evidencia de drift/rollback y sign-off del operador; revertir consiste en volver el flag a `false` y redeployar los runtimes afectados.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Slice 0 | Revertir el documento/ADR propuesta antes de aceptar el contrato; no hay runtime mutado | <1 h | sí |
| Slice 1 | Revertir el PR o dejar el registry sin perfiles alternativos; conservar el resolver default `axis` | <10 min | sí |
| Slice 2 | Flag OFF + revert del bundle del worker; manifests legacy y assets existentes no se borran | <10 min | sí |
| Slice 3 | Deshabilitar la capability/flag de selección y mantener `requestProposalRender` sobre manifests legacy | <10 min | sí |
| Slice 4 | Flag OFF, pausar la selección alternativa y conservar evidencia/manifests para replay | <10 min | sí |

### Production verification sequence

1. Ejecutar tests focales, typecheck, selftest del worker y gates del task.
2. Ejecutar `pnpm composer:visual-gate` contra el perfil default y verificar cero píxeles de drift no declarado.
3. Componer y renderizar en staging un manifest legacy/default y uno profile-aware alternativo; comparar hashes, frames y PDF.
4. Ejecutar un negativo de recurso modificado/incompatible y verificar `manifest_drift` o error canónico sin publicación.
5. Repetir el mismo render y verificar la unique key existente, sin segundo asset final.
6. Verificar org isolation, actor member-only y audience/evidence gates mediante API/Nexa cuando aplique.
7. Obtener sign-off del operador; habilitar el flag sólo después del release control plane y dejar rollback ejercitado.

### Out-of-band coordination required

- Sign-off del operador para el primer perfil visual alternativo y para activar el flag en staging/production.
- Confirmación de derechos de embedding de cualquier font y de uso de assets incluidos en un perfil.
- No se requiere coordinación con Globe ni con proveedores externos.

## Acceptance Criteria

- [ ] Existe una decisión/Delta arquitectónico aceptado que fija `VisualProfile`, su relación con `BrandPack`/catálogo, owner, compatibilidad, modo inicial y política de manifest versioning.
- [ ] Existe un registry versionado y allowlisted de perfiles con `id`, `version`, owner, `compatibleCatalogs`, digest y componentes hasheados; no acepta CSS, paths ni URLs del caller.
- [ ] `resolvePlan` resuelve el perfil seleccionado por contexto controlado y produce un manifest profile-aware; el mismo input + mismo perfil produce el mismo digest y perfiles distintos producen manifests distintos.
- [ ] El perfil default `axis` conserva la salida visual vigente contra el baseline; cualquier delta visual queda declarado y aprobado.
- [ ] El manifest y `hashResolvedManifest` incluyen la identidad/digest del perfil y todos los recursos visuales que gobiernan el render, incluidos mold/signature/recipes/assets cuando correspondan.
- [ ] `artifact-worker` empaqueta el perfil, ejecuta selftest, re-resuelve el manifest y rechaza missing resource, incompatibilidad o drift antes de publicar el artefacto.
- [ ] Manifests legacy tienen una ruta de lectura/replay explícita y ningún consumer los reescribe o elimina campos durante validación.
- [ ] Proposal Studio, API y Nexa reutilizan los commands, capabilities/entitlements, gates humanos, audience/evidence checks e idempotencia existentes; no hay una implementación paralela en UI o agente.
- [ ] La alternativa token-only está disponible sólo cuando el flag y el allowlist lo permiten, cuenta con evidencia visual aprobada y no altera templates, slots, geometría u output target.
- [ ] No se crea una tabla ni un CRUD de perfiles en esta task; la necesidad de perfiles editables por clientes queda como follow-up explícito.
- [ ] `pnpm task:lint --task TASK-1644`, `pnpm ops:lint --changed`, tests focales, `pnpm composer:visual-gate`, `pnpm worker:build-contract-gate` y `pnpm qa:gates --changed --agent codex` quedan verdes o con deuda preexistente documentada.

## Verification

- `pnpm task:lint --task TASK-1644`
- `pnpm ops:lint --changed`
- `pnpm exec vitest run src/lib/artifact-composer/__tests__ src/lib/commercial/tenders/proposals/__tests__`
- `pnpm composer:brand-pack`
- `pnpm composer:visual-gate`
- `pnpm worker:build-contract-gate`
- `pnpm typecheck`
- `pnpm qa:gates --changed --agent codex`
- Smoke staging del `artifact-worker` con manifest default, perfil alternativo, drift negativo, idempotencia y rollback.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK_ID_REGISTRY.md` y `EPIC-029` quedaron sincronizados con el estado real
- [ ] se verificó que los cambios ajenos del checkout no entraron en el commit de la task

## Follow-ups

- Task posterior para persistencia, CRUD, lifecycle y permisos de perfiles administrables por clientes, sólo si el producto lo requiere.
- Task UI/UX posterior para selector de perfiles en Proposal Studio, con contrato de wireframe/flow y GVC antes de implementación visible.
- Posible extensión a catálogos distintos de `deck-axis` después de demostrar compatibilidad y gates en el primer catálogo.

## Open Questions

- ¿El nombre visible definitivo será “Skin” o “Visual Profile” en Proposal Studio? El contrato técnico debe permanecer `VisualProfile` si el nombre de producto cambia.
- ¿Qué primera variante visual alternativa se aprueba para el baseline, sin inventar valores de diseño fuera del SoT?
- ¿Qué recursos pertenecen al perfil y cuáles deben permanecer sellados como dependencias propias del catálogo?
- ¿Cuándo la reutilización multi-org justifica mover el registry de código a una entidad persistida con lifecycle y audit?
