# TASK-1507 — Globe Internal Front Door (Global ALB + Terraform adoption)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
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
- Status real: `Diseño; runtime internal-smoke vivo en Cloud Run, sin custom domain ni IaC de servicios`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-1506`
- Branch: `task/TASK-1507-globe-internal-front-door-alb-terraform`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar el front door internal-only de Efeonce Globe que decidió ADR-004 (`TASK-1506`): un Global External
Application Load Balancer + serverless NEG (`southamerica-west1`) hacia `globe-studio-internal`, certificado
administrado y HTTP→HTTPS, para servir `globe.efeoncepro.com`; actualizar `GLOBE_PUBLIC_BASE_URL` y el redirect-URI
allowlist del broker OAuth de Greenhouse; endurecer el ingress del web a `internal-and-cloud-load-balancing`; y meter
los servicios Cloud Run vivos bajo Terraform (ingress/env/scale + `invokerIamDisabled`), cerrando el drift de IaC.
`globe-api-internal` queda IAM-private con audience `run.app`, sin custom domain ni exposición browser.

## Why This Task Exists

ADR-004 aceptó Cloud Run como web/BFF para la release internal-only y declaró explícitamente que **la ADR sola no
autoriza apply**: todo el cambio de runtime, DNS, TLS, OAuth e IaC es responsabilidad de esta task sucesora. Hoy
`globe.efeoncepro.com` no resuelve, la public base URL apunta al `*.run.app`, y los dos servicios Cloud Run
(`globe-studio-internal`, `globe-api-internal`) están **fuera de Terraform** — sólo identidades/WIF/buckets/IAM/budget/
observabilidad están gobernados —, de modo que `invokerIamDisabled`, ingress, env y scale son mutables por consola y
propensos a drift (`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` §"Qué NO hace"). Además el web corre con `ingress=all` +
`invokerIamDisabled=True`: browser-reachable, pero sin la protección de red que el ALB permite (`internal-and-cloud-
load-balancing`). Sin esta task, el dominio no puede publicarse, el canary de `TASK-1469` no tiene una base URL HTTPS
estable propia, y el rollout interno de `TASK-1505` arrancaría sobre un `run.app` no gobernado por IaC.

## Goal

- Publicar `globe.efeoncepro.com` sobre un Global External ALB + serverless NEG hacia `globe-studio-internal`, con
  certificado administrado y redirección HTTP→HTTPS, como el front door internal-only estable.
- Cerrar el loop OAuth de federación humana con el nuevo dominio: `GLOBE_PUBLIC_BASE_URL` y el redirect-URI allowlist
  del cliente Globe en el broker de Greenhouse actualizados de forma exacta (sin wildcards), con smokes verdes de
  federación humana y de workload.
- Meter `globe-studio-internal` y `globe-api-internal` bajo Terraform (import de recursos vivos; gobierno de
  ingress/env/scale + pin de `invokerIamDisabled`) y endurecer el ingress del web a `internal-and-cloud-load-balancing`,
  dejando `globe-api-internal` IAM-private con audience `run.app`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` (ADR-004 — decisión que
  esta task implementa; ver §"Successor task contract (TASK-1507)" y §"Hard rules")
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001 — federación humana + workload; redirect
  URI allowlisting exacto + PKCE/state/nonce)
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/architecture/creative-studio/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`

Reglas obligatorias (de ADR-004, load-bearing):

- El custom domain sólo apunta a `globe-studio-internal` vía Global External ALB + serverless NEG (path GA); **nunca**
  un domain mapping directo de Cloud Run (Preview/region-limited).
- `globe-api-internal` **nunca** recibe custom domain ni exposición browser: queda IAM-private y su Google ID-token
  audience se deriva de su URL `run.app`, jamás del dominio browser.
- El redirect URI allowlist del broker es exacto, sin wildcards (`oauth-broker.ts` rechaza wildcards por diseño).
- No subir `maxScale > 1` de `globe-studio-internal`: sesiones/OAuth/experimentos/eval/spend-fence siguen en memoria
  (gate `TASK-1465`). Esta task preserva `maxScale=1`.
- Un dominio internal-only no es Production ni acceso de clientes externos (gate `TASK-1480`).
- Globe conserva runtime, datos, secretos y ejecución propios; Greenhouse sólo aporta el broker OAuth (federación) y el
  gobierno documental. No se comparte DB, cookie ni credencial de provider.

## Normative Docs

- `docs/tasks/in-progress/TASK-1506-globe-frontend-hosting-front-door-decision.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/tasks/complete/TASK-1464-globe-iac-keyless-platform-foundation.md`
- `docs/tasks/to-do/TASK-1465-globe-workspace-tenancy-persistence-audit.md`
- `docs/tasks/to-do/TASK-1469-globe-governed-run-lifecycle-submission-fence.md`
- `docs/tasks/to-do/TASK-1480-globe-commercial-external-readiness-gate.md`
- `docs/tasks/to-do/TASK-1505-globe-creative-producer-surface.md`

## Dependencies & Impact

### Depends on

- `TASK-1506` (ADR-004 aceptada) — decisión que autoriza y acota esta implementación.
- Foundation IaC keyless `TASK-1464`: `../efeonce-globe/infra/terraform/` (WIF, `globe-deployer`, backend GCS,
  budgets, observabilidad ya en Terraform).
- Runtime vivo `globe-studio-internal` (`web`) y `globe-api-internal` (`api`) en `southamerica-west1`.
- Broker OAuth de Greenhouse: `src/lib/sister-platforms/oauth-broker.ts` (cliente Globe registrado con `redirect_uris`).
- Documentación oficial vigente de Google Cloud (Global External ALB, serverless NEG, managed certs, Cloud Run ingress)
  con fecha registrada.

### Blocks / Impacts

- Desbloquea el rollout interno de `TASK-1505` (Producer surface) al fijar el front door canónico.
- Da a `TASK-1469` una public base URL HTTPS estable propia para su canary/cutover.
- Habilita deep links canónicos de `TASK-1475`.
- No habilita Production ni clientes externos (sigue bloqueado por `TASK-1480`).
- No sube réplicas: HA sigue bloqueada por `TASK-1465` (stores durables).

### Files owned

- `../efeonce-globe/infra/terraform/services.tf` (nuevo — import de los 2 Cloud Run services) `[verificar]`
- `../efeonce-globe/infra/terraform/front_door.tf` (nuevo — IP global, ALB, serverless NEG, managed cert, HTTP→HTTPS)
  `[verificar]`
- `../efeonce-globe/infra/terraform/imports.tf` (import blocks de los servicios vivos)
- `../efeonce-globe/infra/terraform/variables.tf`, `outputs.tf`, `locals.tf`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` (actualizar §"Qué NO hace" al adoptar servicios)
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- El cambio de redirect-URI allowlist del cliente Globe es una **actualización de registro** en el broker de Greenhouse
  (`src/lib/sister-platforms/oauth-broker.ts` es el mecanismo; el dato es la fila del cliente), no código nuevo de
  broker. Confirmar en Discovery si el redirect allowlist se administra por API/command o por seed. `[verificar]`

`GLOBE_PUBLIC_BASE_URL` y `GLOBE_API_EXPECTED_AUDIENCE`/`GLOBE_API_CALLER_SERVICE_ACCOUNTS` son env del runtime Globe
(Cloud Run), no de Greenhouse. DNS de `efeoncepro.com` es out-of-band (HostGator).

## Current Repo State

### Already exists

- `../efeonce-globe/infra/terraform/` gobierna WIF, `globe-deployer`, SAs (`web_runtime`/`api_runtime`), buckets, IAM,
  budgets y observabilidad — pero **no** los dos servicios Cloud Run (los crea el workflow `deploy-internal.yml`).
- `globe-studio-internal`: `web`, `southamerica-west1`, `ingress=all`, `maxScale=1`, `invokerIamDisabled=True`, SA
  `web_runtime`; autentica por sesión-cookie propia.
- `globe-api-internal`: `api`, `southamerica-west1`, `ingress=all`, `maxScale=1`, IAM-private + verificación in-app de
  ID token (`GLOBE_API_EXPECTED_AUDIENCE` + `GLOBE_API_CALLER_SERVICE_ACCOUNTS`), SA `api_runtime`.
- Broker OAuth de sister platforms en `src/lib/sister-platforms/oauth-broker.ts` con redirect-URI allowlist exacto
  (rechaza wildcards, `errorCode: invalid_redirect_uri`).
- `efeoncepro.com` en DNS de HostGator; `globe.efeoncepro.com` no resuelve.

### Gap

- No existe ALB, IP global, serverless NEG ni managed cert; `globe.efeoncepro.com` no tiene front door.
- Los servicios Cloud Run no están bajo Terraform: `invokerIamDisabled`, ingress, env y scale son ungoverned/drift-prone.
- El web usa `ingress=all` (browser-reachable directo por `run.app`) en vez de `internal-and-cloud-load-balancing`
  detrás del ALB.
- El redirect allowlist del cliente Globe y `GLOBE_PUBLIC_BASE_URL` aún no contemplan `globe.efeoncepro.com`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `infra en ../efeonce-globe/infra/terraform + GCP; broker OAuth en greenhouse-eo src/lib/sister-platforms; DNS en HostGator`
- Future candidate home: `remain-shared`
- Boundary: `front door browser de Globe (ALB→serverless NEG→globe-studio-internal) + redirect allowlist del broker; sin mover dominio creativo a Greenhouse`
- Server/browser split: `browser sólo entra por el ALB/dominio del web; OAuth/session/BFF server-side; globe-api-internal IAM-private service-to-service, sin browser`
- Build impact: `none en código de app; Terraform agrega recursos de red (ALB/NEG/cert/IP) e importa 2 Cloud Run services`
- Extraction blocker: `OAuth callback + redirect allowlist acoplados al broker de Greenhouse; session store in-memory (gate 1465); WIF project scoping; API audience run.app`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Terraform de Globe (infra/terraform) + cliente OAuth Globe en el broker de Greenhouse + env Cloud Run + DNS HostGator`
- Consumidores afectados: `browser humano (SSO shell), TASK-1469 canary, TASK-1475 deep links, TASK-1505 rollout interno`
- Runtime target: `production` (infra GCP de Globe; internal-only, no Production comercial)

### Contract surface

- Contrato existente a respetar: `ADR-004 (§Successor task contract, §Hard rules); ADR-001 GREENHOUSE_CONNECTIVITY_V1 (redirect allowlist exacto + PKCE); EFEONCE_GLOBE_IAC_RUNBOOK_V1`
- Contrato nuevo o modificado: `front door HTTPS globe.efeoncepro.com (ALB); redirect URI del cliente Globe; GLOBE_PUBLIC_BASE_URL; ingress del web; Terraform-managed Cloud Run services`
- Backward compatibility: `gated` — el `*.run.app` sigue válido durante cutover; el ingress endurece a `internal-and-cloud-load-balancing` sólo tras verificar que el ALB sirve
- Full API parity: `N/A — no capability` (infra/front door; no introduce ni modifica una capability de negocio del spine)

### Data model and invariants

- Entidades/tablas/views afectadas: `cliente OAuth Globe (fila con redirect_uris) en el broker de Greenhouse; recursos GCP (no tablas de dominio)`
- Invariantes que no se pueden romper:
  - `globe-api-internal nunca recibe custom domain ni exposición browser; audience run.app, IAM-private`
  - `redirect URIs exactos, sin wildcards; PKCE S256 + state + nonce preservados`
  - `maxScale=1 de globe-studio-internal (gate TASK-1465); esta task no sube réplicas`
  - `invokerIamDisabled queda pineado por Terraform: True mientras el web use sesión-cookie; el hardening de ingress no lo cambia sin verificar acceso`
- Tenant/space boundary: `federación humana provee identidad Greenhouse a Globe como broker; el ALB no cambia el trust boundary (una sola nube GCP)`
- Idempotency/concurrency: `Terraform apply idempotente; import de servicios vivos vía import blocks (plan debe mostrar 0 replacements/destroy sobre los servicios)`
- Audit/outbox/history: `Terraform state + plan como evidencia; smokes de federación humana/workload como verificación; sin event de dominio`

### Migration, backfill and rollout

- Migration posture: `none` (DB); infra additive: agregar red (ALB/NEG/cert/IP) + import de servicios existentes
- Default state: `el custom domain se publica sólo tras smoke verde; el ingress endurece a internal-and-cloud-load-balancing como último paso, tras confirmar que el ALB sirve`
- Backfill plan: `N/A — no data backfill`
- Rollback path: `revertir ingress del web a all (restaura acceso directo run.app); apuntar GLOBE_PUBLIC_BASE_URL + redirect al run.app; el ALB es additive y destruible sin tocar el servicio`
- External coordination: `DNS globe.efeoncepro.com en HostGator (out-of-band); verificación de propiedad de dominio para el managed cert; owner GCP/billing; owner OAuth broker en Greenhouse`

### Security and access

- Auth/access gate: `federación humana OAuth (broker Greenhouse, PKCE) para el web; service account + ID token verification (api-mode) para globe-api-internal; WIF/OIDC para el apply (globe-deployer)`
- Sensitive data posture: `secrets` — no imprimir secretos ni valores de provider; el apply corre keyless (OIDC→WIF), sin service-account keys
- Error contract: `N/A runtime de app` — cambios de infra/OAuth; los errores del broker ya usan `SisterPlatformOAuthError` con errorCode
- Abuse/rate-limit posture: `el ALB permite (follow-up) Cloud Armor; el api queda IAM-private + audience/caller allowlist fail-closed; esta task no baja ninguna de esas defensas`

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (si toca código); `terraform validate` + `terraform plan` (0 destroy sobre servicios)
- DB/runtime checks: `gcloud run services describe` read-only pre/post; `curl -I` del dominio (301 HTTP→HTTPS + 200/302 SSO); resolución DNS + cert válido
- Integration checks: smoke de federación humana (login SSO end-to-end contra `globe.efeoncepro.com`) + smoke de workload federation (`globe-api-internal` sigue respondiendo 403 anónimo y 200 al SA autorizado)
- Reliability signals/logs: Cloud Run request logs + ALB logs; verificar que `globe-api-internal` no aparece browser-reachable
- Production verification sequence: ver §Rollout Plan (secuencia canónica: import → red → DNS/cert → cutover URL/OAuth → smokes → hardening ingress)

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths/objetos reales.
- [ ] Invariantes de API-privada/redirect-exacto/maxScale explicitados y preservados.
- [ ] Postura de rollback explícita por slice (ingress revert, URL/OAuth revert, ALB destruible).
- [ ] Evidencia runtime listada (plan Terraform sin destroy sobre servicios, smokes federación humana + workload, curl del dominio).
- [ ] Sin fuga de secretos; apply keyless; API privada intacta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Adoptar los Cloud Run services en Terraform (import, sin mutación)

- Escribir los recursos `google_cloud_run_v2_service` (o el tipo vigente) para `globe-studio-internal` y
  `globe-api-internal` en `services.tf`, reflejando el estado vivo verificado (región, ingress, env, scale,
  `invokerIamDisabled`, SA), con `import` blocks en `imports.tf`.
- `terraform plan` debe mostrar **cero** replace/destroy sobre los servicios (sólo adopción de estado). Corregir el HCL
  hasta que el plan sea no-op sobre los servicios antes de cualquier apply.
- Pin explícito de `invokerIamDisabled` por servicio (web: `True` mientras use sesión-cookie; api: `False`), cerrando
  el drift documentado en el runbook.

### Slice 2 — Front door: IP global + ALB + serverless NEG + managed cert (sin DNS aún)

- Terraform para IP global estática, serverless NEG (`southamerica-west1`) hacia `globe-studio-internal`, backend
  service, URL map, target HTTPS proxy con certificado administrado para `globe.efeoncepro.com`, y forwarding rules
  HTTP→HTTPS.
- El NEG apunta **sólo** a `globe-studio-internal`. `globe-api-internal` no entra al ALB.
- Aún sin cutover de DNS: el cert queda `PROVISIONING` hasta que el dominio resuelva (Slice 3).

### Slice 3 — DNS + provisión de certificado (out-of-band + verificación)

- Crear el registro DNS de `globe.efeoncepro.com` → IP global en HostGator (coordinación out-of-band).
- Verificar propiedad de dominio y esperar `ACTIVE` del managed cert; confirmar `curl -I` con 301 HTTP→HTTPS y TLS
  válido; el web responde detrás del ALB (SSO redirect esperado, no error de red).

### Slice 4 — Cutover de public base URL + OAuth redirect allowlist

- Actualizar `GLOBE_PUBLIC_BASE_URL` del runtime web a `https://globe.efeoncepro.com` (env Cloud Run, con redeploy si
  no toma en caliente).
- Agregar el redirect URI exacto de `globe.efeoncepro.com` al cliente Globe en el broker OAuth de Greenhouse (sin
  quitar el `run.app` hasta smoke verde; sin wildcards).
- Smoke de federación humana: login SSO end-to-end contra `https://globe.efeoncepro.com` con PKCE/state/nonce OK.

### Slice 5 — Endurecer ingress + verificar API privada + cierre IaC

- Cambiar el ingress de `globe-studio-internal` a `internal-and-cloud-load-balancing` vía Terraform, **sólo tras**
  confirmar que el ALB sirve el web (evita lockout).
- Verificar que `globe-api-internal` sigue IAM-private: 403 anónimo, 200 al SA autorizado, audience `run.app` intacto,
  sin custom domain.
- Actualizar el runbook IaC (§"Qué NO hace" pierde la excepción de servicios) y el runtime handoff; least-privilege
  audit de `web_runtime`/`api_runtime` documentado.

## Out of Scope

- Subir `maxScale > 1` o cualquier réplica adicional (gate `TASK-1465`).
- Implementar persistencia durable, ejecución async, workbench, Producer UI o deep links.
- Habilitar Production, clientes externos, pricing o publicación (gate `TASK-1480`).
- Dar a `globe-api-internal` custom domain o exposición browser.
- Migrar el web a Vercel/Next.js o decidir el host del frontend cliente comercial (decisión diferida por ADR-004).
- Cambiar el modelo de federación/broker de identidad (sólo se agrega un redirect URI exacto).

## Detailed Spec

El path GA para un custom domain de Cloud Run es **Global External Application Load Balancer + serverless NEG**, no el
domain mapping directo (Preview/region-limited) — ADR-004 §Alternatives. Componentes Terraform mínimos: `google_compute_
global_address`, `google_compute_region_network_endpoint_group` (serverless, `southamerica-west1`, `cloud_run.service =
globe-studio-internal`), `google_compute_backend_service`, `google_compute_url_map`, `google_compute_managed_ssl_
certificate` (`globe.efeoncepro.com`), `google_compute_target_https_proxy`, y forwarding rules 443 + 80 (redirect a
HTTPS). Confirmar tipos/atributos exactos contra la doc oficial vigente en Discovery `[verificar]`.

El import de los servicios vivos debe ser no-op: cualquier `-/+` (replace) sobre `globe-studio-internal` o
`globe-api-internal` es inaceptable (destruiría el servicio). Usar `terraform plan` iterativo hasta 0 destroy/replace
sobre esos recursos; sólo entonces `apply`.

El orden de cutover es crítico para no dejar afuera al browser ni romper OAuth: primero el ALB sirve (Slice 2-3),
después la URL/OAuth apuntan al dominio (Slice 4), y **al final** el ingress endurece (Slice 5). Invertir el orden
—endurecer ingress antes de que el ALB sirva— deja el web inaccesible.

El redirect allowlist se administra en el broker de Greenhouse (`src/lib/sister-platforms/oauth-broker.ts`
`normalizeRedirectUris` valida exactitud). Confirmar en Discovery si el registro del cliente se actualiza por
command/API o por seed `[verificar]`; en ambos casos, agregar el URI de `globe.efeoncepro.com` sin remover el `run.app`
hasta smoke verde, y sin wildcards (el broker los rechaza con `invalid_redirect_uri`).

## Rollout Plan & Risk Matrix

Task de infra crítica cross-runtime: muta red GCP, DNS, OAuth redirect e ingress de un servicio vivo. El apply lo
autoriza esta task (no ADR-004 sola) y ocurre bajo la secuencia canónica de abajo, con rollback por slice.

### Slice ordering hard rule

- Slice 1 (import IaC, no-op) → Slice 2 (ALB/NEG/cert, sin DNS) → Slice 3 (DNS + cert ACTIVE) → Slice 4 (cutover URL +
  OAuth redirect + smoke humano) → Slice 5 (endurecer ingress + verificar API privada + cierre IaC).
- **Slice 5 (endurecer ingress a `internal-and-cloud-load-balancing`) NUNCA antes de confirmar en Slice 3-4 que el ALB
  sirve el web.** Endurecer antes deja el browser sin acceso (lockout).
- El import de servicios (Slice 1) debe ser plan no-op antes de cualquier `apply`; un replace/destroy sobre un servicio
  vivo aborta la task.
- El redirect `run.app` no se remueve hasta que el smoke del dominio nuevo esté verde (Slice 4).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `terraform import` genera replace/destroy de un servicio vivo | Cloud Run / IaC | high | plan iterativo hasta 0 destroy sobre servicios; nunca apply con `-/+` sobre ellos | plan muestra `-/+` o `destroy` en `globe-studio-internal`/`globe-api-internal` |
| Endurecer ingress antes de que el ALB sirva deja el web sin acceso | Cloud Run web | high | Slice 5 sólo tras smoke verde del ALB (Slice 3-4); rollback a `ingress=all` | 403/timeout browser tras el cambio de ingress |
| Redirect allowlist mal formado rompe login SSO | OAuth / identity | medium | URI exacto sin wildcard; conservar `run.app` hasta smoke verde; PKCE/state/nonce preservados | `invalid_redirect_uri` en el broker; login SSO falla |
| `globe-api-internal` queda browser-reachable o pierde audience | Security / API privada | low | API fuera del NEG; verificación 403 anónimo + audience run.app post-apply | anónimo obtiene 200; audience derivado del dominio browser |
| Managed cert no provisiona (DNS/propiedad) | TLS / DNS | medium | verificar registro DNS + propiedad antes de cutover; esperar `ACTIVE` | cert atascado en `PROVISIONING`; TLS handshake falla |
| Drift IaC persiste si el import queda incompleto | Cloud/IaC | medium | pin explícito de ingress/env/scale/`invokerIamDisabled`; runbook actualizado | consola muta un campo no representado en state |
| Interpretar el dominio internal-only como Production | Product/Ops | medium | ADR-004 gates separados; handoff explícito; sin quitar SSO ni gate 1480 | cliente externo o marketing usa el dominio como GA |

### Feature flags / cutover

No hay feature flag de código. El "cutover" es la secuencia de red/DNS/OAuth de arriba, reversible por slice (revertir
ingress, revertir `GLOBE_PUBLIC_BASE_URL`/redirect al `run.app`, destruir el ALB additive). Defaults fail-closed: la API
sigue IAM-private; el web conserva SSO; `maxScale=1` intacto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (import IaC) | `terraform state rm` de los servicios (vuelven a ungoverned, sin tocar runtime) | <30 min | sí |
| Slice 2 (ALB/NEG/cert) | `terraform destroy` selectivo del front door (additive, no toca el servicio) | <30 min | sí |
| Slice 3 (DNS/cert) | remover el registro DNS en HostGator; el dominio deja de resolver | <60 min (propagación) | sí |
| Slice 4 (URL/OAuth) | `GLOBE_PUBLIC_BASE_URL` + redirect vuelven al `run.app` (env + broker); redeploy si aplica | <15 min | sí |
| Slice 5 (ingress) | ingress del web vuelve a `all` (restaura acceso directo `run.app`) | <10 min | sí |

### Production verification sequence

1. `terraform plan` (Slice 1) → verificar **0 destroy/replace** sobre los servicios; recién ahí `apply`.
2. `apply` Slice 2 (ALB/NEG/cert) → cert en `PROVISIONING` esperado (sin DNS aún); `globe-api-internal` sin cambios.
3. Crear DNS en HostGator (Slice 3) → esperar cert `ACTIVE`; `curl -I https://globe.efeoncepro.com` = 301/302 + TLS OK.
4. Cutover `GLOBE_PUBLIC_BASE_URL` + agregar redirect exacto (Slice 4) → smoke federación humana: login SSO end-to-end
   verde contra el dominio; `run.app` aún válido.
5. Endurecer ingress a `internal-and-cloud-load-balancing` (Slice 5) → re-smoke humano por el ALB; verificar
   `globe-api-internal`: 403 anónimo + 200 SA autorizado + audience `run.app`.
6. Remover el redirect `run.app` del broker sólo si se decide; actualizar runbook + handoff; monitorear logs 48-72h.

### Out-of-band coordination required

- Owner de GCP/billing e infraestructura Globe (apply keyless vía `globe-deployer`).
- Owner del DNS `efeoncepro.com` en HostGator + verificación de propiedad de dominio para el managed cert.
- Owner del OAuth broker/redirect allowlist en Greenhouse.
- Product/Security para confirmar que el dominio se publica como internal-only (no Production; gate `TASK-1480`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `globe.efeoncepro.com` resuelve y sirve `globe-studio-internal` vía Global External ALB + serverless NEG
      (`southamerica-west1`), con managed cert `ACTIVE` y redirección HTTP→HTTPS (`curl -I` = 301 + TLS válido).
- [ ] `globe-api-internal` no recibe custom domain, sigue IAM-private (403 anónimo, 200 al SA autorizado) y su audience
      es `run.app`, no derivada del dominio browser.
- [ ] Los dos servicios Cloud Run están bajo Terraform; `terraform plan` es no-op sobre ellos (0 destroy/replace) y
      `invokerIamDisabled`/ingress/env/scale quedan pineados por IaC.
- [ ] `globe-studio-internal` sirve por `internal-and-cloud-load-balancing` detrás del ALB, con `maxScale=1` intacto.
- [ ] `GLOBE_PUBLIC_BASE_URL = https://globe.efeoncepro.com` y el redirect URI exacto del cliente Globe está en el
      broker (sin wildcards); smoke de federación humana verde (PKCE/state/nonce OK).
- [ ] Ningún secreto impreso; el apply corrió keyless (OIDC→WIF); no se subieron réplicas ni se habilitó Production.
- [ ] Runbook IaC (§"Qué NO hace") y `GLOBE_RUNTIME_HANDOFF.md` actualizados; least-privilege audit documentado.

## Verification

- `cd ../efeonce-globe && terraform -chdir=infra/terraform validate && terraform -chdir=infra/terraform plan` (0 destroy
  sobre servicios)
- `cd ../efeonce-globe && pnpm check` si toca código de app (esperado: no toca app)
- `gcloud run services describe globe-studio-internal --region southamerica-west1` (read-only, pre/post) — ingress,
  scale, `invokerIamDisabled`
- `gcloud run services describe globe-api-internal --region southamerica-west1` — IAM-private, audience, sin domain
- `curl -I https://globe.efeoncepro.com` (301 HTTP→HTTPS, TLS válido)
- Smoke federación humana (login SSO end-to-end) + smoke workload federation (403 anónimo / 200 SA) contra el dominio
- `pnpm task:lint --task TASK-1507`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`).
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [ ] `docs/epics/in-progress/EPIC-028-...md` refleja el front door implementado.
- [ ] `EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` y `GLOBE_RUNTIME_HANDOFF.md` actualizados con la adopción de servicios y el
      dominio; ADR-004 referenciada como la decisión que esta task cierra.
- [ ] `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` revisan el cierre.
- [ ] Runtime Rollout Completion Gate: si el dominio/OAuth/ingress no quedaron aplicados y verificados en vivo, el
      estado es `code complete, rollout pendiente`, no `complete`.

## Follow-ups

- Cloud Armor / WAF sobre el ALB si se endurece la postura antes de exposición externa (`TASK-1480`).
- Store durable de sesión/OAuth para levantar `maxScale > 1` (`TASK-1465`).
- Decisión de host + framework del frontend cliente comercial (diferida por ADR-004, revisit en `TASK-1505` +
  pre-`TASK-1480`).

## Open Questions

- ¿El redirect allowlist del cliente Globe se actualiza por command/API del broker o por seed? (Discovery `[verificar]`.)
- ¿Se remueve el redirect `run.app` tras el cutover, o se conserva como fallback interno? (Decidir en Slice 4 según
  necesidad de smokes/agentes.)
