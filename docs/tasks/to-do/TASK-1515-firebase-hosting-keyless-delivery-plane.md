# TASK-1515 — Firebase Hosting Keyless Delivery Plane

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-035`
- Status real: `Diseño aceptado; provisioning pendiente`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1515-firebase-hosting-keyless-delivery-plane`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Provisiona el delivery plane estático de Efeonce Embed Runtime como un Firebase Hosting site dedicado dentro del
proyecto GCP existente `efeonce-group`, con Hosting Classic, costos observables, dominio neutral, GitHub protected
environments y OIDC/WIF. Prueba preview→clone exacto y rollback sin cambiar todavía el loader productivo.

## Why This Task Exists

Firebase no requiere otra cuenta ni un proyecto GCP adicional. La frontera aprobada es un Hosting site dedicado
dentro de `efeonce-group`, con configuración, ownership, permisos de publicación y evidencia operativa explícitos.
Crear recursos por consola o usar una llave JSON introduciría drift y dependencia tribal. La arquitectura exige un
spike operacionalmente reversible antes de convertir Firebase en autoridad.

## Goal

- Habilitar Firebase en `efeonce-group` y provisionar/configurar el Hosting site dedicado aprobado, reutilizando
  organización y Cloud Billing existentes con costo observable.
- Publicar desde GitHub mediante identidad corta y mínimo privilegio, sin secrets de credenciales.
- Probar bytes idénticos entre preview y live clone, headers, custom domain y rollback.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Firebase Hosting Classic, no App Hosting, Functions, Firestore, Auth ni Cloud Run.
- Reutilizar el proyecto GCP `efeonce-group`; no crear un proyecto paralelo. El aislamiento se implementa con un
  Firebase Hosting site dedicado, target/channel explícito y permisos mínimos verificables.
- GitHub OIDC/WIF, protected production environment y cero service-account JSON.
- Reutilizar el WIF pool/provider canónico del repo. El publisher del Embed Runtime es dedicado; no recibe permisos
  sobre Cloud Run, Secrets, Storage general ni administración IAM.
- La task prueba el dominio/Hosting pero no corta consumers productivos.

## Normative Docs

- `docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md`
- `docs/tasks/to-do/TASK-1489-greenhouse-gcp-iac-foundation.md`

## Dependencies & Impact

### Depends on

- Provisioning puede avanzar en paralelo con `TASK-1514`; el fixture, digest gate y clone de aceptación esperan su
  protocol/fleet composer.
- `TASK-1489` es alineamiento/adopción futura no bloqueante. Esta task posee el bootstrap idempotente y manifest de
  ownership del site/publisher; TASK-1489 sólo puede adoptarlos después mediante import, sin co-ownership.
- WIF y GitHub environments vigentes descritos en cloud security posture.

### Blocks / Impacts

- Bloquea `TASK-1516` y los cutovers posteriores.
- Agrega el Hosting site y su configuración, bindings IAM mínimos, observabilidad de costo/uso, DNS validation y
  workflow; no agrega un proyecto ni state de producto.

### Files owned

- `firebase.json` (nuevo)
- `.firebaserc` (nuevo, sin secretos)
- `.github/workflows/embed-runtime-release.yml` (nuevo)
- `scripts/embed-runtime/` (nuevo, provisioning/verify acotado)
- `.github/DEPLOY.md`
- recursos declarativos para Firebase enablement, secondary site, custom role, publisher SA y WIF binding; no project
  ni billing resource creation
- manifest/bootstrap idempotente con owner único en esta task; root de adopción futura por TASK-1489 `[verificar]`

## Current Repo State

### Already exists

- GitHub Actions con WIF para GCP y production environment protegido.
- Fleet artifacts/protocol entregados por TASK-1514.
- Proyecto GCP `efeonce-group`, organización, Cloud Billing y WIF de GitHub existentes.

### Gap

- Firebase/Hosting aún no está habilitado/configurado en `efeonce-group`; no existen el site dedicado, dominio,
  configuración, observabilidad de costo/uso ni publisher autorizado para el fleet.
- El deployer vigente es demasiado amplio y no se reutiliza; el custom role Hosting mínimo debe verificarse.
- No se ha probado `hosting:clone`, rollback ni headers con artifacts reales.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `.github/workflows + firebase config + IaC/scripts aprobados`
- Future candidate home: `public`
- Boundary: `GitHub publica fleet snapshots estáticos; hosts consumen assets.efeoncepro.com`
- Server/browser split: `CI/IaC server-side; Firebase sólo sirve JS/CSS/JSON públicos`
- Build impact: `Firebase CLI sólo en tooling/CI; no entra al build/runtime Next.js`
- Extraction blocker: `IAM, billing, DNS y release evidence pertenecen al control plane Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `efeonce-group Firebase/Hosting site + IAM config + GitHub release workflow`
- Consumidores afectados: `release operators y TASK-1516..1518`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `Embed Runtime protocol V1 + Cloud WIF posture`
- Contrato nuevo o modificado: `Firebase site/channels, CI promotion receipt y neutral-domain config`
- Backward compatibility: `compatible; Vercel sigue autoritativo`
- Full API parity: `N/A — infraestructura de publicación, no capability de negocio`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; cloud resources/config`
- Invariantes que no se pueden romper:
  - `preview verificado se clona; production no rebuild`
  - `candidate.baseFleetDigest == currentLiveFleetDigest; un preview stale se recompone y vuelve a verificar`
  - `site/target secundario explícito; el default site nunca se despliega ni se elimina`
  - `deployer no posee llave persistente ni acceso a PII`
  - `Firebase no contiene state/secret de producto`
- Tenant/space boundary: `N/A — artifacts públicos`
- Idempotency/concurrency: `provisioning idempotente; concurrency group live único + optimistic fleet digest`
- Audit/outbox/history: `GitHub run + Firebase version + fleet digest + actor/approval`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `disabled` — sitio no referenciado por consumers productivos
- Backfill plan: `publicar sólo fixture/fleet de prueba de TASK-1514`
- Rollback path: `hosting clone a versión previa o dejar Vercel intacto`
- External coordination: `GCP org/billing owner, DNS owner, GitHub environment reviewer`

### Security and access

- Auth/access gate: `OIDC/WIF restringido por repo/ref/environment + mínimo privilegio Hosting`
- Sensitive data posture: `no sensitive data; cero secrets de credenciales`
- Error contract: `workflow sanitizado, sin tokens/claims crudos`
- Abuse/rate-limit posture: `CDN público; budgets y quotas observados`

### Runtime evidence

- Local checks: `Firebase emulator + config validation`
- DB/runtime checks: `N/A`
- Integration checks: `preview deploy, headers, exact clone, rollback, custom-domain TLS`
- Reliability signals/logs: `Hosting version/transfer/storage + budget alerts`
- Production verification sequence: `preview → synthetics → clone fixture → rollback; sin consumer cutover`

### Acceptance criteria additions

- [ ] Proyecto `efeonce-group`, Firebase Hosting site, IAM, costo/uso y rollback están documentados con evidence no
  sensible.
- [ ] No existen llaves JSON ni raw credentials.
- [ ] La ruta permanece reversible a Vercel.

<!-- ZONE 2 — PLAN MODE -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Existing project, Firebase enablement, billing and IAM

- Inventariar Firebase/sites/default targets/WIF actuales; confirmar `efeonce-group` como project ID, habilitar Firebase
  sin crear otro proyecto, registrar site ID/owners y verificar Blaze, costos y alertas sin alterar guardrails globales.
- Provisionar un site/target dedicado y el publisher dedicado sobre el WIF canónico, con IAM mínimo. Todo deploy/clone
  usa `--only hosting:<target>`; un comando sin site/target debe fallar antes de mutar cloud.
- Capturar baseline/after-diff de APIs, IAM, service accounts, API keys/restricciones, labels, billing link, WIF y
  sites/apps. Registrar y restringir los recursos automáticos creados por Firebase sin exponer valores sensibles.
- Separar bootstrap de topología del publisher rutinario. El publisher no crea/elimina sites, dominios, APIs o IAM; si
  Firebase CLI exige visibilidad project-wide de API keys, comparar con REST Hosting antes de aceptar ese permiso.

### Slice 2 — Hosting and neutral domain

- `firebase.json` con headers/cache/CORS/nosniff y public directory del fleet composer.
- Vincular/validar `assets.efeoncepro.com` sin cambiar todavía los embeds productivos.

### Slice 3 — Build-once promotion

- Workflow preview, synthetics, protected approval, `hosting:clone` exacto, receipt y rollback.
- Probar igualdad de hashes/digest antes y después del clone y rechazar un candidate cuyo `baseFleetDigest` ya no sea
  el live digest actual.

## Out of Scope

- Migrar Meetings, Forms o CTA.
- Crear Firebase App Hosting, Functions, Auth, Firestore o Cloud Run.
- Crear un proyecto GCP paralelo o usar un proyecto distinto de `efeonce-group` sin una nueva decisión arquitectónica.
- Usar el Hosting site default, registrar una Firebase Web App/SDK o reutilizar `github-actions-deployer`.
- Modificar la billing account o usar delete de `efeonce-group`/Hosting site como mecanismo de rollback.

## Detailed Spec

Hosting recibe exclusivamente el directorio final del fleet composer. El workflow autentica con OIDC/WIF, publica a
un channel preview, guarda su digest y sólo después de los synthetics clona esa versión exacta a live. El proyecto,
billing, roles y DNS deben quedar reproducibles según la foundation IaC aprobada; acciones manuales se documentan como
bootstrap excepcional con readback, nunca como source of truth. El site, la habilitación Firebase en
`efeonce-group`, los bindings IAM, la observabilidad de costos y DNS deben quedar reproducibles.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Confirmación de `efeonce-group`/Firebase/IAM → Hosting/DNS validation → preview/clone/rollback. Nunca live consumer
  antes del rollback drill.

### Risk matrix

| Riesgo               | Sistema | Probabilidad | Mitigation                               | Signal de alerta       |
| -------------------- | ------- | ------------ | ---------------------------------------- | ---------------------- |
| IAM demasiado amplio | GCP     | medium       | publisher dedicado + IAM negativos       | policy diff inesperado |
| Side effects automáticos | GCP  | medium       | baseline/after-diff + key restringida     | APIs/SA/key no esperadas |
| Preview stale        | release | medium       | baseFleetDigest + live concurrency        | base != current live   |
| Rebuild cambia bytes | release | medium       | clone exacto + digest gate               | digest preview != live |
| Costos inesperados   | billing | low          | SKU/transfer view + alertas del proyecto | alerta budget/250 GB   |
| Enablement residual  | GCP     | low          | registrar efecto no totalmente reversible | Firebase label/API     |
| DNS/TLS afecta host  | public  | low          | no consumer cutover; validation separada | cert no ACTIVE         |

### Feature flags / cutover

No feature flag de producto. El sitio nace sin consumers; authority switch ocurre en TASK-1516.

### Rollback plan per slice

| Slice | Rollback                                             | Tiempo  | Reversible? |
| ----- | ---------------------------------------------------- | ------- | ----------- |
| 1     | retirar bindings/config y dejar site sin consumers; registrar residuos de enablement | <1 h | parcial |
| 2     | remover DNS candidate; Vercel sigue intacto          | DNS TTL | sí          |
| 3     | clone de versión previa o freeze de workflow         | <15 min | sí          |

### Production verification sequence

1. Validar identidad WIF, exact-subject binding y permisos positivos/negativos sin exponer claims.
2. Deploy de fixture a preview y verificar headers/assets.
3. Aprobar clone exacto y comparar fleet digest.
4. Ejecutar rollback y repetir digest/health.
5. Confirmar observabilidad por SKU/transfer, after-diff y no consumers productivos.

### Out-of-band coordination required

- Owner de `efeonce-group`/Cloud Billing para habilitar Firebase, validar Blaze y la estrategia de alertas.
- Owner DNS para TXT/CNAME/SSL.
- Reviewer del GitHub production environment.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Firebase está habilitado en `efeonce-group` y el Hosting site dedicado tiene site ID, billing, owners y
  configuración registrados; no se creó un proyecto paralelo.
- [ ] El publisher no puede mutar el site default/otros sites, Cloud Run, Secrets, Storage general ni IAM admin.
- [ ] El site es secundario, el target es obligatorio y los deploys genéricos/default fallan antes de mutar cloud.
- [ ] Baseline/after-diff registra APIs, IAM, service accounts, labels y API keys/restricciones creadas automáticamente.
- [ ] Hosting Classic sirve fixture con TLS y headers contractuales.
- [ ] GitHub usa OIDC/WIF de mínimo privilegio y no existe llave JSON.
- [ ] Production environment exige aprobación humana.
- [ ] Preview y live clone tienen el mismo fleet digest; producción no rebuild.
- [ ] Una promoción con `baseFleetDigest` stale se rechaza y exige recompose/retest.
- [ ] Rollback a versión verificada completa en menos de 15 minutos.
- [ ] Billing export/usage permite observar SKUs y transfer/storage de Hosting; las alertas project-wide se documentan
  como defensa secundaria, no como presupuesto aislado del site.
- [ ] Ningún consumer productivo fue cortado a Firebase.

## Verification

- `npx -y firebase-tools@latest emulators:start --only hosting` y checks de config.
- Preview/clone/rollback con release receipt.
- `pnpm local:check`, `pnpm task:lint --task TASK-1515`, `pnpm ops:lint --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta e índices sincronizados.
- [ ] Runbook de deploy/rollback y ownership cloud actualizado.
- [ ] Handoff/changelog sin IDs, claims o secretos sensibles.
- [ ] QA release auditor, secret hygiene y documentation governor revisan cierre.

## Follow-ups

- `TASK-1516` — Meetings dual-publish y neutral-domain cutover.

## Open Questions

- El site ID final y el root de adopción IaC se resuelven en Discovery; el project ID está fijado en `efeonce-group`.
