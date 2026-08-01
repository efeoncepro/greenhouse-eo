# TASK-1584 — Globe Credit Admin: firma asimétrica KMS + identidades disjuntas por unidad de ejecución (ADR-015 Slices D+E)

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
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1584-globe-credit-admin-kms-disjoint-identities`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurece la firma de aprobaciones de crédito de Globe reemplazando el HMAC compartido por **firma
asimétrica en Cloud KMS** con verificador dual y fecha de retiro declarada, y separa el **aprobador
(firma y no muta)** del **ejecutor (muta y no puede firmar)** como **unidades de ejecución
distintas**, con el broker de administración de Greenhouse como identidad **distinta** del
reconciliador de tenancy. Es el hardening D+E del roadmap de ADR-015; el carril de fondeo ya está
vivo y ejercido (TASK-1566) — esto mejora la postura de un camino que funciona, no lo crea.

## Why This Task Exists

Con HMAC, **quien verifica puede forjar**: es la misma llave y la misma operación
(`createHmacCreditAdminApproval`). Hoy el firmador y el verificador viven en el mismo proceso
(`globe-api-internal`), así que un solo runtime comprometido produce aprobaciones válidas Y las
ejecuta. Y el maker-checker de dominio es **vacuo para callers de workload** (`approval.proposedBy`
vs un `principalId` constante por clase), así que la única disyunción real posible es **física**:
identidades y unidades de ejecución separadas. ADR-015 §4-§6 dictamina la forma; TASK-1566 Delta (7)
dejó ejecutado el retiro de la autoridad directa del caller genérico — esta task completa la
topología.

## Goal

- Las aprobaciones de crédito se firman con una clave **asimétrica de Cloud KMS** cuya llave privada
  ningún runtime puede leer; verificar y forjar quedan separados.
- El **aprobador** corre como unidad de ejecución propia con su SA (`signerVerifier`), y el
  **ejecutor** (`api_runtime`) verifica pero no puede firmar.
- El verificador es **dual** (KMS + HMAC legacy) con **fecha de retiro declarada** y la señal
  `globe.credit_admin.legacy_hmac_approval_used` midiendo el uso del legacy (es lo que le da fecha
  real al retiro — TASK-1585).
- El broker de administración de Greenhouse es una identidad **distinta** de `greenhouse-portal@`
  (reconciliador de tenancy), con el guard de disyunción de callers extendido a las clases nuevas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` —
  **ADR-015**, §4 (firma), §6 (identidades), §10 (rollout) y Reglas duras. Leer completa.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md` —
  ADR-009: el patrón de clases de workload disjuntas por config allowlist que esta task **reusa**
  (`promotionWorkloadClass` en `apps/studio-web/src/app.ts`).
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` — protocolo de import Terraform:
  `plan` con cero `destroy`/`replace` de identidad viva.
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — defense-in-depth; flag default-OFF.

Reglas obligatorias:

- **NUNCA** dejar el verificador dual sin fecha de retiro declarada y sin la señal que mide el
  legacy: un dual sin retiro es un esquema simétrico con pasos extra (ADR-015 Reglas duras).
- **NUNCA** darle a `api_runtime` permiso de FIRMA sobre la clave KMS (sólo `verify`/public key); el
  firmador es la unidad aprobadora.
- **NUNCA** usar `greenhouse-portal@` como broker de administración ni reusar las identidades del
  saga de promoción (`globe-promotion-*`).
- **SIEMPRE** habilitar `cloudkms.googleapis.com` en `local.enabled_services` y dar `depends_on`
  explícito si el recurso no tiene arista implícita (lección TASK-1507: arreglar la carrera en el
  HCL, no reintentar).
- **SIEMPRE** registrar cada test nuevo en el script `test` de su package en `efeonce-globe` (la
  suite enumera archivos a mano).

## Normative Docs

- `docs/tasks/complete/TASK-1566-globe-governed-credit-funding-command.md` — Deltas (4)-(7): el
  estado real del carril, el self-deadlock cerrado y el retiro ya ejecutado. Cerrada 2026-07-26.
- `.claude/skills/greenhouse-globe/SKILL.md` § «Gasto y crédito en Globe» — reglas medidas.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — SoT del estado mutable.

## Dependencies & Impact

### Depends on

- Carril de fondeo vivo (TASK-1566, entregado): `CreditApprovalSignerPort` en
  `efeonce-globe/packages/domain/src/credit-funding.ts` es el seam donde KMS enchufa **sin tocar el
  dominio** (el port existe exactamente para esto).
- Cloud KMS NO habilitado hoy en `efeonce-globe` (verificado 2026-07-26: `grep -rn kms
  infra/terraform/` = 0). Habilitación es parte del Slice 1.

### Blocks / Impacts

- **`TASK-1585`** (break-glass gobernado + retiro del HMAC) — bloqueada por esta: el retiro exige el
  verificador dual y su señal en cero por la ventana declarada.
- El comentario/nota de ADR-015 Delta (3) y la skill `greenhouse-globe` (§ reglas 5-8) al cierre.

### Files owned

En `efeonce-globe`:

- `infra/terraform/{locals,kms,iam,cloud_run_services,variables,outputs}.tf` — `kms.tf` es nuevo.
- `apps/credit-approver/**` — unidad de ejecución nueva (aprobador). [verificar forma: Cloud Run
  service `minScale=0` vs Job — Open Question de TASK-1566 heredada]
- `apps/studio-web/src/{app,main,credit-admin-approval}.ts` — verificador dual + clases de caller.
- `packages/domain/src/credit-funding.ts` — sólo si el port necesita metadata de formato de firma.

En `greenhouse-eo`: `src/lib/globe/**` sólo si el broker de administración cambia de identidad
(env/config del impersonation target). `docs/**` para el cierre documental.

## Current Repo State

### Already exists

- `CreditApprovalSignerPort` (dominio, transport-neutral) + `createHmacCreditAdminApproval` (HMAC
  actual, firmador y verificador en `apps/studio-web/src/credit-admin-approval.ts`) con su test de
  contrato (firmar sin `approval` en el payload DEBE fallar).
- Patrón de clases de workload disjuntas por allowlist (`promotionWorkloadClass`,
  `isTenancyOperatorCaller`, `isTenancyBrokerCaller` en `apps/studio-web/src/app.ts`).
- Señal anti-regreso del retiro (`creditAdminAuthorityDrift` + test de disyunción) — TASK-1566
  Delta (7).
- IaC keyless con protocolo de import (TASK-1464/1508); secrets con contenedor+accessor en
  Terraform y valor out-of-band.

### Gap

- Cero KMS en el proyecto; el secreto HMAC (`globe-credit-approval-secret`) es la única evidencia de
  aprobación posible.
- Firmador y verificador en el mismo proceso; no existe unidad aprobadora.
- El broker de administración de Greenhouse ES hoy el reconciliador de tenancy
  (`greenhouse-portal@` → `greenhouse-globe-caller`): identidad compartida entre propósitos.
- No existe la señal `globe.credit_admin.legacy_hmac_approval_used`.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `efeonce-globe` (monorepo hermano): `apps/studio-web` + `infra/terraform`; la unidad
  aprobadora nace como `apps/credit-approver`
- Future candidate home: `worker`
- Boundary: `CreditApprovalSignerPort` (dominio) + verificación dual en el transporte; el firmador
  se consume por invocación de servicio autenticada, nunca por secreto compartido; la unidad
  aprobadora nace como deployable propio del repo hermano sin tocar `apps/*` de greenhouse-eo
- Server/browser split: íntegramente server-side (unidad aprobadora + api runtime); ninguna clave,
  material de firma ni token de KMS cruza al browser ni al payload cliente
- Build impact: dependencia nueva `@google-cloud/kms` (o firma vía REST con ADC) en la unidad
  aprobadora; ninguna en greenhouse-eo
- Extraction blocker: `none` — la unidad nace extraída por diseño (repo hermano)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: formato de evidencia de aprobación de crédito (firma) + clases de
  identidad de workload de Globe
- Consumidores afectados: `confirm` del carril de fondeo, commands de credit-admin que exigen
  approval, verificador del transporte
- Runtime target: `production` (Cloud Run `globe-api-internal` + unidad aprobadora nueva + KMS)

### Contract surface

- Contrato existente a respetar: `CreditApprovalSignerPort` (packages/domain/src/credit-funding.ts)
  y `CreditApprovalVerifierPort` (packages/domain/src/credit-administration.ts) — KMS enchufa por
  los ports, **cero cambios en handlers de dominio**.
- Contrato nuevo o modificado: formato de firma versionado (`approvalFormat: 'hmac-v1' | 'kms-v1'`
  o equivalente) para que el verificador dual discrimine sin heurísticas.
- Backward compatibility: `gated` — dual verifier acepta ambos formatos durante la transición.
- Full API parity: sin superficie nueva; el firmado es efecto interno de `confirm` (regla dura de
  TASK-1566: firmar no es una capability).

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla nueva; la evidencia sigue en los payloads de
  approval existentes.
- Invariantes que no se pueden romper:
  - El payload firmado incluye su propia `approval` sin digest (trampa documentada en `signFor`).
  - Quien verifica NO puede forjar (propiedad que define el éxito de esta task).
  - Un principal de servicio nunca confirma; un usuario agente sólo confirma bajo la delegación
    acotada por workspace introducida en TASK-1629 (esta task no la amplía).
- Tenant/space boundary: la aprobación sigue tenant-bound (el verificador ve workspace).
- Idempotency/concurrency: sin cambios — la idempotencia del confirm ya vive en el broker + stores.
- Audit/outbox/history: señal nueva `globe.credit_admin.legacy_hmac_approval_used` (contador de
  formato legacy en verificación), estilo evento estructurado como
  `globe.credit_admin.caller_authority_drift`.

### Migration, backfill and rollout

- Migration posture: `none` (sin DDL).
- Default state: `flag OFF` — `GLOBE_CREDIT_APPROVAL_KMS_ENABLED` (o firma por formato con KMS
  ausente ⇒ HMAC): el HMAC sigue siendo el camino hasta el flip.
- Backfill plan: `n/a` — las aprobaciones son efímeras (TTL de propuesta 15 min); no hay históricas
  que migrar de formato.
- Rollback path: flag OFF + redeploy (el dual verifier nunca deja de aceptar HMAC hasta TASK-1585).
- External coordination: habilitar `cloudkms.googleapis.com`, crear keyring/clave por Terraform,
  `roles/cloudkms.signerVerifier` SOLO a la SA aprobadora y `verifier`/public-key al ejecutor.

### Security and access

- Auth/access gate: la unidad aprobadora es IAM-private (mismo patrón defense-in-depth de `api`
  mode: perímetro + verificación en-app del ID token del caller).
- Sensitive data posture: material de firma jamás en logs ni en el cliente; la llave privada vive
  en KMS (no exportable).
- Error contract: códigos canónicos del spine; un fallo de KMS degrada a `dependency_unavailable`,
  nunca a un approval sin firma.
- Abuse/rate-limit posture: el firmado sólo es invocable desde el flujo de `confirm` (server-side);
  sin superficie pública.

### Runtime evidence

- Local checks: `pnpm check && pnpm build` en `efeonce-globe`; tests del verificador dual (ambos
  formatos + rechazo de formato desconocido) registrados en el script `test`.
- DB/runtime checks: `tofu plan` en No changes post-apply; readback de IAM de la clave (firmador ≠
  verificador).
- Integration checks: un `confirm` real en staging-interno firmado por KMS punta a punta; un
  approval HMAC sigue verificando (dual) y emite la señal legacy.
- Reliability signals/logs: `globe.credit_admin.legacy_hmac_approval_used` visible en Cloud Logging.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — KMS en IaC

- Habilitar `cloudkms.googleapis.com` en `local.enabled_services` + `kms.tf` (keyring + clave
  asimétrica de firma, protección HSM/software declarada) + IAM: `signerVerifier` a la SA
  aprobadora, verify/public-key a `api_runtime`. `depends_on` explícito donde falte arista.
- `tofu plan` leído (cero destroy/replace de identidad viva) + apply + plan en No changes.

### Slice 2 — Unidad aprobadora (`apps/credit-approver`)

- Deployable propio con SA propia que expone la operación de firma SOLO al ejecutor autenticado
  (perímetro IAM + verificación en-app del caller, mismo patrón `api` mode). [verificar forma:
  service `minScale=0` vs Job invocado por request — medir latencia del confirm antes de elegir]
- El ejecutor (`studio-web`) consume la firma vía `CreditApprovalSignerPort` — cero cambios de
  dominio.

### Slice 3 — Verificador dual + señal + fecha de retiro

- `credit-admin-approval.ts` acepta `kms-v1` y `hmac-v1`, con formato explícito (nunca heurística);
  formato desconocido = rechazo.
- Señal `globe.credit_admin.legacy_hmac_approval_used` (evento estructurado, contador) cada vez que
  verifica un HMAC. Fecha de retiro declarada en ADR-015 delta al cerrar.
- Flag `GLOBE_CREDIT_APPROVAL_KMS_ENABLED` default OFF; flip tras el confirm real KMS verde.

### Slice 4 — Broker de administración disjunto + guard extendido

- SA nueva de Greenhouse para administración de crédito (impersonation target distinto de
  `greenhouse-globe-caller` o clase distinta por allowlist — decidir en Plan Mode contra ADR-015
  §6), clase de workload propia en `internalServicePrincipal` con SOLO `funding.propose/confirm` +
  lecturas.
- Guard de disyunción de callers extendido (patrón `app.ts` overlap-deny de promoción): una SA en
  dos allowlists de crédito = deny.
- `greenhouse-eo`: el broker de fondeo usa la identidad nueva (env/config), con smoke `propose` 200.

## Out of Scope

- El retiro del HMAC y el break-glass gobernado (TASK-1585 — exige la señal legacy en cero por la
  ventana declarada).
- El desambiguador de negación al operador (TASK-1586).
- Capabilities per-member (ADR-015 Slice G — bloqueada por `tenancy_mode=enforced`, TASK-1511).
- La superficie ui-ux de administración en el portal (nace aparte con wireframe real).
- Cualquier cambio al dominio de fondeo (`credit-funding.ts` handlers) o a la transacción del
  confirm.

## Detailed Spec

La forma está dictada por ADR-015 §4 («Firma») y §6 («Cuatro identidades, una por propósito») —
no re-decidir acá. Decisiones que el Plan Mode debe cerrar contra el runtime real:

1. **Service `minScale=0` vs Job** para el aprobador (Open Question heredada de TASK-1566): medir
   la latencia aceptable del `confirm` (hoy ~905 ms sin firma remota) antes de elegir.
2. **Cliente KMS**: `@google-cloud/kms` vs REST con ADC — elegir el que no infle el bundle del
   aprobador; NUNCA en `studio-web`.
3. **Identidad del broker de administración**: SA nueva `greenhouse-globe-credit-admin@` con WIF
   propio vs clase por allowlist sobre el caller existente. ADR-015 §6 prefiere SA distinta;
   validar contra el costo de otro provider WIF (lección del `aud` de Vercel: las audiencias no se
   adivinan, se miden — TASK-1566 Delta (4)).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (KMS IaC) → Slice 2 (aprobador) → Slice 3 (dual verifier + flag) → Slice 4 (broker
  disjunto).
- El flip del flag KMS ocurre DESPUÉS de un confirm real KMS verde en el workspace interno.
- Slice 4 puede correr en paralelo con 2-3 sólo hasta el punto de cutover del broker: el cutover de
  identidad exige el smoke de fondeo verde ANTES y DESPUÉS.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Confirm se vuelve lento/frágil por firma remota | credit funding | medium | medir latencia en staging-interno antes del flip; fallback dual (HMAC) intacto | timeout del cliente en confirm; `globe.dispatch.unmapped_error` |
| Apply de Terraform toca identidad viva | IAM/WIF | low | protocolo de import: plan leído con cero destroy/replace | `tofu plan` |
| Cutover del broker rompe el fondeo | credit funding | medium | smoke `propose` 200 antes/después; rollback = volver la env del broker | 401/403 en `/api/admin/globe/credit-funding/*` |
| Dual verifier acepta formato ambiguo | credit admin | low | formato explícito versionado; desconocido = rechazo; test de ambos + desconocido | test CI |

### Feature flags / cutover

- `GLOBE_CREDIT_APPROVAL_KMS_ENABLED` default `false` (Terraform `variables.tf`, NUNCA sólo
  `terraform.tfvars` — lección del flag fantasma). Flip tras confirm KMS verde. Revert: flag off +
  apply (<10 min).
- Registrar en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` si el flag se lee en runtime de
  Greenhouse; si es sólo de Globe, registrar en `GLOBE_RUNTIME_HANDOFF.md` (SoT de Globe).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `tofu` revert del HCL de KMS (la clave se puede deshabilitar, no destruir con versiones vivas) | <30 min | parcial (claves KMS no se borran instant) |
| Slice 2 | apagar la unidad (traffic 0 / delete service) — nada la consume hasta Slice 3 | <10 min | sí |
| Slice 3 | flag OFF (HMAC sigue siendo el camino) | <10 min | sí |
| Slice 4 | volver env del broker a la identidad anterior + redeploy Greenhouse | <15 min | sí |

### Production verification sequence

1. Slice 1: apply + plan No changes + readback IAM de la clave (firmador ≠ verificador).
2. Slice 2: la unidad responde SOLO al ejecutor autenticado (anónimo 403; caller legítimo 200).
3. Slice 3 con flag OFF: confirm real sigue HMAC; señal legacy cuenta 1.
4. Flip flag: confirm real firmado KMS verde; señal legacy NO incrementa.
5. Slice 4: smoke propose/confirm por la identidad nueva; guard de overlap probado (SA en dos
   listas = deny).

### Out-of-band coordination required

- GCP: habilitar API KMS, crear keyring/clave vía Terraform (apply humano-aprobado), IAM bindings.
- Si Slice 4 usa SA nueva con WIF: crear provider/binding en IaC de Globe + configurar env en
  Vercel (5 runtimes NO — sólo el portal usa el puente de Globe; verificar con grep del env).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La llave privada de firma no es legible ni exportable por ningún runtime; `api_runtime` sólo
  verifica (readback de IAM como evidencia).
- [ ] Un `confirm` real completa firmado por KMS, y un approval HMAC sigue verificando (dual) —
  ambos con evidencia de runtime.
- [ ] La señal `globe.credit_admin.legacy_hmac_approval_used` emite en verificaciones HMAC y NO
  emite en KMS.
- [ ] La fecha de retiro del HMAC quedó declarada (delta en ADR-015).
- [ ] El aprobador y el ejecutor son unidades de ejecución distintas con SAs distintas; el guard de
  disyunción niega overlap.
- [ ] El broker de administración de Greenhouse es una identidad distinta del reconciliador de
  tenancy, y el fondeo funciona por ella (smoke propose/confirm).
- [ ] `pnpm check` + `pnpm build` verdes en `efeonce-globe`; tests nuevos registrados en los
  scripts `test`.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `tofu plan` en No changes post-apply (infra/terraform)
- Smoke de fondeo por el puente real (staging Greenhouse → Globe): `propose` 200
- En greenhouse-eo si se toca código: `pnpm local:check` + tests focales

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ADR-015 recibió el delta con la fecha de retiro del HMAC declarada y el estado de los slices
- [ ] `GLOBE_RUNTIME_HANDOFF.md` refleja revisiones/flags nuevos; skill `greenhouse-globe`
  actualizada si cambió una regla operable

## Follow-ups

- `TASK-1585` — break-glass gobernado + retiro del HMAC (bloqueada por esta).
- Superficie ui-ux de administración de crédito en el portal — nace aparte con su wireframe real
  (product-design-loop), consumiendo los contratos de esta topología.

## Open Questions

- ¿Aprobador como Cloud Run service `minScale=0` o Job invocado por request? Medir la latencia real
  del confirm antes de elegir (heredada de TASK-1566).
- ¿SA nueva con provider WIF propio para el broker de administración, o clase por allowlist sobre
  el caller existente? ADR-015 §6 prefiere SA distinta; el Plan Mode valida el costo real.
