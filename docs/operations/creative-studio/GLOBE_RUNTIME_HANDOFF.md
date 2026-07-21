> **Continuidad de runtime de Efeonce Globe — bajo el control plane de Greenhouse (TASK-1492).**
> Este archivo es la continuidad activa del **runtime** de Globe (deploys, rollout, verificación en vivo,
> hardening). Repatriado desde `efeonce-globe/Handoff.md` (historia previa auditable en el git log del repo
> hermano). El `Handoff.md` principal de Greenhouse referencia este archivo para el detalle de runtime de Globe;
> el **código/infra** siguen en `efeonce-globe`. Modelo de contexto: `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.

---

# Handoff

## Active state — 2026-07-21 (TASK-1508: Cloud Run bajo Terraform + cap de 1 instancia corregido)

Los dos servicios Cloud Run **entraron a Terraform** por import brownfield, sin un solo destroy/replace, y
`deploy-internal.yml` quedó reducido a desplegar **sólo la imagen**. Terraform gobierna ingress, invoker posture,
runtime SA, env y secret refs, escala, recursos y el invoker IAM binding de la api; el workflow no vuelve a escribir
configuración. Probado en vivo: un deploy real dejó el `tofu plan` en **No changes**.

**El hallazgo que justifica leer esto:** ambos servicios estaban capados a **1 instancia efectiva**. Un servicio Cloud
Run tiene ceiling a nivel servicio y a nivel revisión, y aplica **el menor**; el de servicio estaba en 1 mientras el de
revisión decía 3, que es el que toda la doc venía citando. Nunca corrió más de una réplica, así que **el spend fence
cross-réplica de `TASK-1465` jamás se ejercitó**. La causa: `--max-instances` escribe campos distintos según el
subcomando (`run deploy` → servicio, `run services update` → revisión), de modo que el workaround que los manuales
prescribían para "restaurar" el techo escribía el campo equivocado. Corregido a **3/3** y ambos campos bajo IaC
(requiere provider `google` >= 7.x; el pin subió de `~> 6.0` a `~> 7.0`, verificado con 76 de 78 recursos en no-op).

**Riesgos abiertos.** El spend fence cross-réplica sigue **sin ejercitar**: ahora es posible, pero nadie lo probó con
>1 réplica. La §Production verification sequence de 1508 pide observar **dos** ciclos de deploy y se corrió uno.

**Próximo paso ejecutable:** segundo ciclo de deploy con plan convergido, y cerrar 1508 (Slice 4 documental).
`TASK-1480` (Production/clientes externos) sigue siendo el gate que nada de esto levanta.

## Active state — 2026-07-21 (TASK-1507: front door internal-only vivo)

**La URL estable del shell interno de Globe es `https://globe.efeoncepro.com`.** Se sirve por un Global External
Application Load Balancer + serverless NEG (`southamerica-west1`) hacia `globe-studio-internal`, con IP global
`8.233.189.79`, certificado administrado por Google `ACTIVE` (`CN=globe.efeoncepro.com`, issuer `GTS WR3`, vence
`Oct 19 20:35:36 2026 GMT`) y redirect 301 de HTTP a HTTPS. `GLOBE_PUBLIC_BASE_URL` quedó cortado al dominio en la
revisión `globe-studio-internal-00018-zkx`, que sirve el 100% del tráfico.

**El `*.run.app` ya no es alcanzable por browser.** El ingress del web quedó en
`internal-and-cloud-load-balancing` (`gcloud run services update … --ingress`), así que el acceso directo por
`https://globe-studio-internal-818083690953.southamerica-west1.run.app` devuelve **404** y el dominio por el ALB
devuelve **200** con el shell real (`<title>Efeonce Globe — Internal creative studio</title>` + su propio
`x-correlation-id`: responde la app, no el balanceador). Ese origen `run.app` **sigue en el allowlist OAuth** a
propósito, como camino de rollback; retirarlo es un comando, no un incidente:
`pnpm sister-platform:redirect --client globe --remove https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback --apply`.

**Cómo se opera el allowlist ahora.** Greenhouse ganó la primitive aditiva
`updateSisterPlatformOAuthRedirectUris` (`src/lib/sister-platforms/oauth-broker.ts`) + el CLI
`pnpm sister-platform:redirect` (`--client/--add/--remove`, dry-run sin `--apply`): una transacción que toca sólo
`redirect_uris`, sin rotar el client secret ni reemplazar el array — a diferencia del seed
`seed-globe-internal-pilot.ts`, que hace ambas cosas y **no** sirve para un cutover. El SSO humano se verifica con
`efeonce-globe/scripts/smoke-human-federation.mjs` (tres piernas: `/auth/start` → authorize → callback);
`GLOBE_SMOKE_RESOLVE=host:ip` permite smokear un front door recién publicado desde un resolver con cache negativa
sin debilitar ninguna aserción. Verde antes y después del hardening de ingress.

**Riesgos abiertos.**

- **El ingress no está gobernado por IaC.** Se fijó por `gcloud` porque los servicios Cloud Run siguen fuera de
  Terraform; su gobierno es `TASK-1508`. No es drift-trap del workflow (`deploy-internal.yml` no pasa `--ingress`
  y `gcloud run deploy` preserva lo no especificado), pero nada lo previene fuera de esa task.
- **`maxScale` sí es drift-trap.** `deploy-internal.yml` hardcodea `--max-instances=1`: un deploy por ese workflow
  baja el techo a 1. Valor vivo hoy: 3. Workaround inmediato tras un deploy:
  El drift-trap quedó **cerrado por `TASK-1508`**: el workflow ya no pasa `--max-instances` y Terraform gobierna los dos ceilings (servicio y revisión). Cuidado con el workaround viejo `gcloud run services update <servicio> --max-instances=3`: escribía el ceiling de **revisión**, no el de **servicio**, y Cloud Run aplica el menor — así que dejaba el techo efectivo en 1 aparentando haberlo restaurado.
- **Cache negativa de DNS.** El SOA de `efeoncepro.com` tiene minimum TTL 86400, así que un NXDOMAIN cacheado antes
  de crear el registro persiste ~24h en el resolver local y `dscacheutil -flushcache` sin `sudo` no hace nada. El
  síntoma engañoso es `curl` devolviendo `status=000` sin `remote_ip`. Verificar con `dig @8.8.8.8` y
  `curl --resolve` antes de concluir que el dominio está roto.
- **Costo fijo nuevo:** ~US$18,25/mes por las forwarding rules globales + ~US$0,024 por GiB servido (in+out),
  precios de la Cloud Billing Catalog API al 2026-07-21. Si se destruye el ALB, destruir **también** la IP global:
  reservada y sin adjuntar factura como IP estática ociosa.
- **Sigue internal-only.** Publicar el dominio no habilita Production, clientes externos ni marketing: eso está
  gateado por `TASK-1480`. `globe-api-internal` no recibe custom domain, sigue IAM-private (403 anónimo) y su
  audience se deriva de `run.app`, nunca del dominio browser.

**Próximo paso ejecutable: `TASK-1508`** — adoptar los dos servicios Cloud Run en Terraform por import/no-replace y
dejar un solo escritor (Terraform gobierna configuración estable y seguridad; el workflow queda image/revision-only).
Ahí se pinean `ingress`, `maxScale` e `invokerIamDisabled`. Spec de cierre del front door:
`docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md`; decisión que implementa: ADR-004
`docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`.

## Active state — 2026-07-21 (TASK-1466 desplegada + verificada internal-only)

SPEC-008 materializa `client-operated | co-operated | efeonce-managed` como accountability versionada —nunca como
grant— mediante commands/readers Full API Parity, store Postgres append-only y audit atómico. Runtime commit
`00fee5ded505` y fix del smoke `3baafde831563` están en `efeonce-globe/main`; `pnpm check && pnpm build` pasó.

**Cloud SQL:** `0002_operating_responsibilities.sql` aplicada por el migrador IAM. El verifier live confirmó owner
`globe_owner`, grants DML para `globe-api-runtime`/`globe-web-runtime` y siete constraints. **Cloud Run:** workflows
`29858616172` (API) y `29858618168` (Studio) exitosos; revisiones Ready `globe-api-internal-00012-lcq` y
`globe-studio-internal-00017-4sd`, imagen `00fee5ded505`, ambas en `maxScale=3`.

**Smoke:** scope `task-1466-smoke-be28c266-4ff4-473d-9cec-2e286198bdc4`; auth ausente y audiencia incorrecta
denegadas, assign v1, replay estable, replay conflictivo=409, change v2, effective/history y cross-workspace deny.
Readback durable: dos versiones (`co-operated` → `efeonce-managed`) y dos auditorías correlacionadas en
`greenhouse-org:efeonce`. El smoke requiere `--include-email` al mintear el ID token; el helper ya lo incorpora.
Los grants temporales `serviceAccountTokenCreator` de proyecto y service account fueron revocados y verificados.

La capacidad queda **operativa internal-only**. UI, MCP, clientes externos y producción comercial continúan bloqueados.
El drift conocido de `deploy-internal.yml` sigue bajo TASK-1508: tras cada deploy verificar/restaurar `maxScale=3`.

## Active state — 2026-07-21 (TASK-1465: persistencia durable desplegada + verificada en vivo)

**Globe deja de vivir en memoria.** `TASK-1465` le dio a Globe su primera base de datos durable y desplegó
los dos servicios contra ella. Cloud SQL **`globe-pg`** (Postgres 16, `southamerica-west1`, tier chico,
~US$15–30/mo fijo), **keyless**: la app autentica como **usuario IAM** por el conector de Cloud SQL (sin
contraseñas en el runtime), sólo por conector (sin acceso de red directo). Es **de Globe**, nunca compartida
con Greenhouse. La persistencia vive en `packages/database` (cliente + runner de migraciones); el setup de
roles de una sola vez (`bootstrap.sql`) crea el rol dueño `globe_owner` y luego revuelve la contraseña de
`postgres` — no queda contraseña de admin en pie.

**Los cinco almacenes son durables** detrás de las mismas interfaces (drop-in, sin reescribir consumidores):
experimentos, evaluaciones, el **spend fence** (ahora **atómico entre réplicas** — el freno de seguridad que
recién habilita correr multi-réplica), sesiones + transacciones de OAuth, más una bitácora de auditoría
append-only. Tablas del esquema `globe`: `experiments`, `evaluation_reports`, `human_sessions`,
`oauth_transactions`, `spend_fence_runs`, `spend_fence_days`, `audit_log`.

**Desplegado en vivo:** ambos servicios Cloud Run corren durables a **`maxScale=3`** (hasta 3 réplicas; bajan a
cero cuando ociosos, ~US$0 extra) — `globe-studio-internal` (cáscara web/login) y `globe-api-internal` (API del
Model Lab), **cada uno con su propio usuario IAM** de base. **Verificado en vivo:** golpear `/auth/start` en el
servicio corriendo **persistió una fila `oauth_transactions` en Postgres** — evidencia real desde el servicio,
no sólo por el seam local.

**Fix de build (Dockerfile construye `packages/database`):** el Dockerfile no compilaba el paquete de
persistencia; se corrigió para que la imagen incluya `packages/database`. Un servicio hace durable su runtime
sólo si declara las tres `GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME` / `GLOBE_POSTGRES_DATABASE` /
`GLOBE_POSTGRES_USER` (el usuario IAM de runtime del servicio); si falta alguna, **arranca en memoria** — sólo
permitido en el environment `internal_smoke`.

**⚠️ Drift-trap conocido → `TASK-1508`.** `deploy-internal.yml` hoy **fija `--max-instances=1`** por hardcode,
así que un redespliegue por ese workflow **baja el `maxScale` a 1** hasta que Terraform gobierne ese valor.
El drift-trap quedó **cerrado por `TASK-1508`**: el workflow ya no pasa `--max-instances` y Terraform gobierna los dos ceilings (servicio y revisión). Cuidado con el workaround viejo `gcloud run services update <servicio> --max-instances=3`: escribía el ceiling de **revisión**, no el de **servicio**, y Cloud Run aplica el menor — así que dejaba el techo efectivo en 1 aparentando haberlo restaurado. El
saneamiento de raíz (Terraform gobierna la config estable, el workflow queda image/revision-only) es
`TASK-1508`. **Diferido:** un modelo rico de workspace / members / grants. Docs: funcional
[`docs/documentation/creative-studio/persistencia-durable-globe.md`], manual
[`docs/manual-de-uso/creative-studio/operar-persistencia-globe.md`], spec
`docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`.

## Active state — 2026-07-21 (front door e IaC separados: TASK-1507 → TASK-1508)

**Decisión (ADR-004, `EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`).** Para la release
internal-only, el web/BFF/SSO shell **se queda en Cloud Run** (servidor Node nativo; el target Next.js queda
`superseded` para el shell interno) — migrar a Vercel se rechaza: parte el trust boundary sin beneficio interno.
El **frontend cliente comercial** (`TASK-1505`+) es una superficie separada con host + framework **diferidos**
(Vercel + Next.js sobre edge global es candidato vivo), a decidir cuando se construya la UI de 1505 y antes de
`TASK-1480` Production; elegir Cloud Run para el shell interno **no** cierra esa puerta. Tres gates distintos,
nunca mezclados: URL internal-only / HA (gate `TASK-1465`, **ya cleared** — ver el bloque de persistencia durable) /
Production externo (`TASK-1480`).

**Front door → `TASK-1507`: IMPLEMENTADO (complete 2026-07-21).** `globe.efeoncepro.com` se sirve vía **Global
External ALB + serverless NEG** (`southamerica-west1`) → `globe-studio-internal` (path GA, no domain mapping
directo), el ingress del web quedó en `internal-and-cloud-load-balancing` y `globe-api-internal` sigue sin custom
domain, IAM-private y con audience `run.app`. Estado vigente, comandos y riesgos abiertos: ver el bloque
**Active state — 2026-07-21 (TASK-1507: front door internal-only vivo)** al inicio de este archivo.

**Cloud Run IaC + deploy ownership → `TASK-1508` (registrada, `to-do`; su blocker `TASK-1507` ya está levantado).**
Adopta los dos servicios vivos por import/no-replace y elimina la doble escritura: Terraform gobierna configuración
estable y seguridad; el workflow `gcloud run deploy` queda image/revision-only. Ahí se pinean `invokerIamDisabled`
(web `True`, api `False`), `maxScale` e `ingress`. **Próximo paso ejecutable: `TASK-1508`.**

## Active state — 2026-07-20 (TASK-1490 desplegada + verificada en el servicio + hardening de auth)

### Dónde vive el Lab (corrección de rollout)

El Model Lab se opera por **api mode**, servido por **`globe-api-internal`** (rev con imagen
`2b3a19f`), corriendo como **`globe-api-runtime`**. Es el único servicio con un caller autorizado:
en api mode el principal es el service principal, que sí tiene `globe.lab.experiment.run`. En **web
mode** (`globe-studio-internal`) el principal humano lleva sólo `globe.studio.access` — el broker de
Greenhouse **no** otorga la capability del Lab a humanos — así que ahí el Lab es inalcanzable. El
primer rollout prendió los flags en `studio-web` (inertes) y dio `aiplatform.user` a `web_runtime`
(la SA equivocada); ambos corregidos. Config viva de `globe-api-internal`:
`GLOBE_LAB_ENABLED=true` · `GLOBE_LAB_PROVIDER=composite` ·
`GLOBE_LAB_INPUT_BUCKET=efeonce-globe-lab-evidence` · `GLOBE_LAB_OMNI_EDITABLE=false` ·
`GLOBE_LAB_DAILY_CAP_CREDITS=200`. `studio-web` quedó con el Lab **apagado** (`fake`, disabled).

### Verificado en vivo contra el servicio desplegado (no sólo por el seam local)

El chain **generate → edit por referencia (cross-model)** corrió end to end contra
`globe-api-internal`, autenticado como el caller REAL (`greenhouse-globe-caller`) con un ID token
audienced al servicio: generate Nano Banana (`outputsRetained=true` → la SA del servicio escribió al
bucket) → edit `editMode=reference` con lineage encadenado. Cierra el gap "bindings presentes pero no
ejercitados desde el servicio". La concesión `tokenCreator` para mintear ese token fue **temporal y
revocada** al terminar.

### Hardening de auth (api mode) — robusto, no parche

Al preparar el rollout se encontró que en api mode la app devolvía el service principal (con la
capability de gasto del Lab) **sin verificar el token**, confiando sólo en Cloud Run IAM. Con
`invokerIamDisabled=True` (ver abajo) ese perímetro se salta y el principal quedaría expuesto a
internet. Ahora la app **verifica el ID token del caller** como segunda capa (defense in depth):
- Verificación **local** contra las claves públicas de Google cacheadas
  (`google-auth-library.verifyIdToken`), sin round-trip por request — reemplazó un primer intento
  con `tokeninfo` que era un SPOF externo síncrono en el hot path.
- **Audience explícito** (`GLOBE_API_EXPECTED_AUDIENCE`, multi-valor por los dos formatos de URL
  run.app) + **allowlist** de SAs (`GLOBE_API_CALLER_SERVICE_ACCOUNTS`). Ambos son gates
  fail-closed: sin allowlist o sin audience declarado, el servicio no acepta a nadie.
- El ID token va en **`Authorization`** (Cloud Run lo reenvía a la app), NO en
  `X-Serverless-Authorization` (Cloud Run lo consume). El SDK se corrigió a `Authorization`; con
  X-Serverless el perímetro pasaba y la app rechazaba al caller legítimo con 401.

### ⚠️ Decisión pendiente — `invokerIamDisabled: True` en `globe-studio-internal`

Anterior a esta sesión: el studio tiene `invokerIamDisabled=True`, así que Cloud Run no verifica el
invoker y el servicio es alcanzable desde internet aunque su IAM esté vacío (`globe-api-internal`
**no** lo tiene: anónimo → 403). Es coherente con que el studio es una **app web con SSO** (un
browser no presenta ID token), y su auth es la sesión-cookie de la app — apagarlo rompería el
callback OAuth. **La capa de app aguanta** (anónimo → 401 en commands/capabilities). Pendiente:
decidir explícitamente si el flag se documenta como intencional (con el smoke ajustado: el contrato
"anónimo → 403" no aplica a web mode) o si el studio va detrás de un proxy autenticado. Y, follow-up
de raíz: los servicios Cloud Run **no** están gestionados por Terraform hoy (los crea el workflow),
así que nada previene que el flag drift-ee — gobernar `invoker_iam_disabled` en IaC lo cerraría de
raíz en vez de sólo detectarlo.

## Active state — 2026-07-20

- `apps/creative-runner` now owns **two dedicated Vertex video adapters** that replace the removed
  `generateContent` video path (video is not servable via `generateContent`), realizing the `LabRunnerPort` seam
  without touching domain, contracts or transports. Both were **verified live 2026-07-20** through the sanctioned
  Model Lab seam against the motion golden brief `product-motion-loop`, each settling `objective_pass_pending_human`:
  - `VertexVideoAdapter` (`apps/creative-runner/src/vertex-video-adapter.ts`, commit `1d5635b` + fix `0e06fdc`):
    keyless Vertex **Veo** (`veo-3.0-fast-generate-001`, us-central1) via the long-running predict flow
    `:predictLongRunning` → `:fetchPredictOperation` → base64/GCS — the method Veo requires. 32 credits, real MP4.
  - `VertexOmniAdapter` (`apps/creative-runner/src/vertex-omni-adapter.ts`, commit `f56452a`): **Gemini Omni Flash**
    (`gemini-omni-flash-preview`, reasoning-native video) via the **Interactions API**. GENERATE is keyless on
    Vertex (`aiplatform.googleapis.com/v1beta1/.../interactions`, ADC Bearer, no key). 40 credits.
- **Stateful EDIT surface split (found live):** the stateful edit (`previous_interaction_id` + `store`) is **not**
  available on the keyless Vertex path — it returns 400 "do not support previous_interaction_id". Edit needs the
  **Gemini API** surface (`generativelanguage`) + an API key (`globe-gemini-api-key`); OAuth is rejected there.
- **Lab EDIT-COMMAND shipped + live-verified (commit `a765d55`, prior follow-up now closed):** the seam threads
  edit end to end — `PrepareExperimentPayloadV1.previousInteractionId` + `ExperimentAttemptManifestV1.providerRunRef`
  (contracts/domain/runner), `VertexOmniAdapter` dual-transport (generate keyless Vertex / edit Gemini-key).
  **Cross-surface gotcha found + fixed live:** a keyless Vertex interaction id is NOT editable on the Gemini surface
  (different id namespaces), so an editable generate (`store:true`) also runs on the Gemini surface. Verified live
  through the seam: prepare(video-generate,store)→execute→candidate_ready with `providerRunRef=v1_…` →
  prepare(previousInteractionId)→execute→**EDIT candidate_ready, new video + chainable id**. Generalizing edit to
  all editable models (reference-based paradigm) + **multi-reference / combined cross-modal refs** (the seam already
  carries a `resolvedInputs` array; Omni/Veo/single-key Fal consume only the first) = **TASK-1490**.
- The Composite selects the video engine by a **fidelity anchor** `GLOBE_LAB_VIDEO_ANCHOR` =
  `fal` (Seedance, default) | `vertex-video` (Veo) | `vertex-omni` (Omni), replacing the fixed policy for video.
  Live motion matrix through the seam: Omni 40 cr, Veo 32 cr, Seedance 20 cr — all `objective_pass_pending_human`
  (craft verdict stays human, never auto-passed).
- **Provisioned live 2026-07-20:** `generativelanguage.googleapis.com` enabled; secrets `globe-gemini-api-key` +
  `globe-fal-api-key` created in Secret Manager with runtime-SA `secretAccessor`; Terraform `secrets.tf` + import
  blocks **applied (`tofu apply`: 8 imported, 0 destroy; `tofu plan` clean, "No changes")**. The Globe-owned Fal key
  **retires the shared `greenhouse-fal-api-key` exception at the code level**.
- **studio-web DEPLOYED to Cloud Run (`globe-studio-internal` rev `00007-jrr`, Ready), 2026-07-20** — the first
  keyless deploy of the real provider stack (Omni + Veo + Seedance + track B + edit-command). URL
  `https://globe-studio-internal-a6odmgzpvq-tl.a.run.app` (private/internal). **`GLOBE_LAB_PROVIDER` stays `fake` in
  the deployed service** (config inherited) — the real engines are deployed but OFF; enabling them is a flag flip
  (`GLOBE_LAB_ENABLED=true` + `GLOBE_LAB_PROVIDER=composite` + `GLOBE_LAB_VIDEO_ANCHOR`), a gated decision.
- **Cloud Build deploy IAM gaps fixed (commit `d264039`, live + Terraform):** the first `gcloud builds submit` 403'd —
  TASK-1464's IaC lacked (a) deployer `cloudbuild.builds.editor` + `storage.admin` (source staging bucket), and (b)
  the compute-default build SA's `storage.objectViewer` / `artifactregistry.writer` / `logging.logWriter` /
  `cloudbuild.builds.builder`. Also the Dockerfile missed `packages/sdk` (studio-web devDep). All fixed + tracked
  in `infra/terraform/{iam,locals}.tf`.
- **Billing finding (do not misbuy):** Omni video has **no free API tier** ($0.10/s); the Gemini API bills
  Prepay/Postpay + an API key and is the **only** surface that serves stateful edit today. "Gemini Enterprise"
  per-seat is **UNRELATED** — do not buy it. Recommendation: enable **Postpay** to avoid the Prepay $0-balance cliff.

## Active state — 2026-07-19

- Repository: `efeoncepro/efeonce-globe`, branch `main`.
- GCP project `efeonce-globe` now has a TASK-1454 non-production identity slice: dedicated service accounts, Vercel WIF, Artifact Registry and private `globe-api-internal`; no database, provider secret, asset bucket, external client or Production environment exists.
- Node 24 monorepo foundation is green.
- Greenhouse connectivity is now specified by `docs/architecture/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001).
- `packages/sdk` implements typed transport, injected authentication, a server-only Google ADC ID-token adapter,
  and (TASK-1481) typed `capabilities`/`dispatchCommand`/`dispatchReader` methods over the private API.
- `packages/contracts` owns the namespaced capability, principal, health and API error contracts, plus (TASK-1481)
  the untrusted command/reader envelopes, canonical result/error, `policy_blocked` code and capability coverage.
- `packages/domain` owns (TASK-1481) the trusted command context (branded, server-only), `deriveTrustedContext`
  (validates workspace selection against bindings), and the `CapabilityRegistry` dispatch with per-surface coverage.
- `apps/studio-web` exposes (TASK-1481) the private API contract spine (`/v1/capabilities`, `/v1/commands`,
  `/v1/readers`) with an inert fixture and a cross-surface conformance harness. Creative capabilities remain
  policy-blocked until their own tasks (TASK-1457+).
- `packages/domain` + `apps/creative-runner` own (TASK-1457) the Safe Model Lab: experiment commands/readers on
  the spine, state machine, `LabSpendFence` hard cap, private-ingest policy, kill switch, and the provider seam
  (`FakeReferenceAdapter` + `LabRunner`) proven end to end with a deterministic fake. `GLOBE_LAB_ENABLED` defaults
  OFF; the live provider canary was **later realized and verified live by TASK-1486/1487/1488** (see below),
  though the durable deploy stays gated and `GLOBE_LAB_PROVIDER` defaults to `fake`.
- `packages/domain` + `apps/studio-web` own (TASK-1458) the Golden Briefs & Evaluation Harness
  (`globe.lab.evaluation.run`, SPEC-003) — the **second business capability on the spine**. It consumes the Model
  Lab (`runModelLabExperiment`) to score golden briefs (still `rrss-key-visual-still`, motion
  `product-motion-loop`, audio `glitch-microphone-foley`, with declared rights) against versioned rubrics,
  separating objective automated checks from human criteria. The verdict is never auto-`passed`
  (`objective_fail` | `objective_pass_pending_human`); reports are versioned, workspace-scoped and carry their
  own limitations. Proven with the same deterministic fake canary (zero spend/infra); `ui`/`mcp` remain
  `policy-blocked`. It **shares the TASK-1457 live-canary rollout gate**; the human-judgment `ui` surface and a
  durable report store are **deferred**. Spec: `docs/architecture/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`;
  runbook §7-ter in `docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`.
- `infra/terraform/` + `.github/workflows/` own (TASK-1464) the keyless IaC foundation. **APPLIED live 2026-07-19**
  (`tofu apply`: 23 imported, 13 added, 0 changed, 0 destroyed — no live identity destroyed/replaced). Now live:
  GitHub WIF pool/provider (ACTIVE), deployer run.admin + act-as, private `efeonce-globe-lab-evidence` bucket,
  SA-key-created log metric, remote state in `gs://efeonce-globe-tfstate`. State is remote; only the HCL is in git.
  Runbook: `docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`.
- `apps/creative-runner` + `apps/studio-web` own (TASK-1486/1487/1488) the **real provider stack** for the Model
  Lab, realizing the `LabRunnerPort` seam without touching domain, contracts, transports or the conformance
  harness. `VertexCreativeAdapter` (TASK-1486, keyless ADC/WIF) routes Google-native capabilities — image → Nano
  Banana `gemini-2.5-flash-image` (image only — a video route to Gemini Omni Flash was later **removed**: Omni is
  not callable via `generateContent`, see the Track B / provider-correction bullet below) — and
  was **verified live 2026-07-19** (`image-generate` → `candidate_ready`, `provider=vertex`, `proposedRoute==actualRoute`,
  `estimated==actual==10`, output as `sha256:…`, fence reserved/settled). `FalCreativeAdapter` (TASK-1487, keyed,
  Fal queue API) routes the allowlisted non-Google stack, and `CompositeProviderAdapter` (TASK-1487) routes
  Vertex + Fal by `supports()` + an explicit policy. TASK-1488 grows `CREATIVE_CAPABILITIES` to **ten**
  (+`image-upscale`/`video-upscale`/`model-3d-generate`) with **ten models verified live** (Seedream 5, Recraft
  v4.1, Topaz, Seedance 2.0, Seed Audio `fal-ai/seed-audio`, ElevenLabs, Hyper3D Rodin v2.5; the six text-driven
  ones generated end to end). Hard rule found live: ByteDance models on Fal use the slug **without** the `fal-ai/`
  prefix. `GLOBE_LAB_PROVIDER` = `fake|vertex|fal|composite` (default `fake`, reversible). Spec §"Realización" /
  §"Segundo adapter" / expansion + live verification: `docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`.
- `apps/creative-runner` + `packages/domain` own (TASK-1459) the **Still Model Lab recommendation matrix**: a real,
  honest comparison of the still portfolio (Vertex Nano Banana at 10 credits / ~7 s vs Fal Seedream 5 Pro at 10
  credits / ~138 s), both settling `objective_pass_pending_human` — the differentiator is latency and the craft
  verdict stays with a human, never auto-passed. It also fixed a `route_stable` bug in the Fal adapter and did not
  wait for the durable ledger or workbench.
- `provider-contract` + `apps/creative-runner` + `apps/studio-web` own **Track B — hash→bytes input resolution**
  (`40c6a95`): the `InputResolverPort` seam injected into the `LabRunner` resolves an experiment's declared input
  hashes to real bytes at the single provider-invocation point (`FixtureInputResolver` for golden-brief fixtures;
  keyless content-addressed `GcsInputResolver` + integrity check for real inputs; `RightsRoutedInputResolver`),
  attaching them server-internal to the request. Vertex inlines them (`generateContent` `inlineData`); Fal uploads
  to Fal storage → short-lived URL. **This closed the `inputs_unavailable` block** on the input-bearing golden
  briefs — the motion + audio briefs now run end to end. Full provenance/rights/retention stays TASK-1467.
- **First live motion + audio canary** (through Track B): **Fal Seedance 2.0** ran `product-motion-loop`
  (`objective_pass_pending_human`, 20 cr, ~155 s) and **Fal Seed Audio** ran `glitch-microphone-foley`
  (`objective_pass_pending_human`, 6 cr, ~16 s) — the working motion + audio engines today. The **Vertex Omni
  video path was removed** (`77d2949`): `gemini-omni-flash-preview` 400s on `generateContent` (Interactions API
  only); a `generateContent` adapter cannot serve Vertex video.
- **Follow-ups still open** on the provider stack: Globe's own Fal API key (the live Fal canary borrowed the repo
  key as a documented temporary exception), a `studio-web` deploy / Dockerfile for the runtime, a **dedicated
  Vertex video adapter** (Veo `predictLongRunning` / Omni Interactions API — `generateContent` cannot serve video),
  and a fidelity-contract selector replacing the Composite's fixed policy.
- Workload bridge evidence is green for anonymous denial, exact audience, wrong audience and Vercel WIF. Human federation is also live for the internal pilot: Greenhouse migration applied, Globe OAuth client/binding active for `efeonce_internal`, callback/session deployed and allow/deny/replay/revocation/correlation smokes green.
- TASK-1455 is live on `globe-studio-internal-00006-445`: the root, callback redirect, authenticated `/studio`, recovery and logout states use the canonical Globe assets. The premium GVC scenario passed at 1440×1000 and 390×844, including keyboard, reduced motion, axe, layout, runtime, performance and enterprise rubric.
- EPIC-028 has an accepted parallel execution baseline. Greenhouse is the canonical task control plane and now
  owns `TASK-1456…1481`, hooks, lifecycle, QA and handoff. Globe owns implementation/runtime/evidence only and
  has no local task registry. Model Lab, governed platform and commercial validation start in parallel. Live
  inference may begin only behind the bounded Lab gate; UI/MCP requires the separate promotion gate.

## Immediate next step

1. The spine (`TASK-1481`), the Model Lab (`TASK-1457`), the evaluation harness (`TASK-1458`), the IaC foundation
   (`TASK-1464`), the real provider stack (`TASK-1486/1487/1488`) and the still recommendation matrix (`TASK-1459`)
   are all complete, with the Vertex and Fal canaries verified live through the sanctioned seam. `GLOBE_LAB_PROVIDER`
   stays `fake` by default and the durable runtime is not yet deployed;
2. The video engines are now real: dedicated `VertexVideoAdapter` (Veo `predictLongRunning`/`fetchPredictOperation`)
   and `VertexOmniAdapter` (Omni Interactions API) landed and were **verified live 2026-07-20** (32 cr / 40 cr, both
   `objective_pass_pending_human`), and the Composite selects video by the `GLOBE_LAB_VIDEO_ANCHOR` fidelity anchor —
   closing the "dedicated Vertex video adapter" + "fidelity selector" follow-ups from 07-19. Globe's own
   `globe-fal-api-key` is provisioned (retiring the borrowed `greenhouse-fal-api-key` at the code level), and
   `globe-gemini-api-key` + `generativelanguage.googleapis.com` are live for the edit surface. Remaining: run
   `tofu apply` for `secrets.tf`; ship a `studio-web` deploy / Dockerfile; add a Lab **edit command** that threads
   `previous_interaction_id` through the domain (the adapter supports stateful edit on the Gemini API surface, the
   one-shot seam does not surface the interaction id yet); re-test Vertex stateful-edit parity periodically; and land
   TASK-1467 full provenance;
3. only then, behind the explicit canary approval and a low hard cap, flip `GLOBE_LAB_ENABLED` / `GLOBE_LAB_PROVIDER`
   in the deployed runtime and revert to `fake` after the smoke;
4. replace temporary vendored SDK tarballs with an authorized private registry path before release;
5. rotate the pre-existing Greenhouse operations DB credential in a separate approved checkpoint;
6. configure GitHub WIF and reduce the bootstrap administrator's standing Owner privilege before a broader release.

Fresh-session handoff prompt: [`EPIC_028_FRESH_SESSION_PROMPT.md`](docs/operations/EPIC_028_FRESH_SESSION_PROMPT.md).

Do not add a service-account key, enable Production or widen the OAuth audience. `globe-studio-internal` is network-reachable because the organization policy blocks `allUsers` IAM binding; application authorization remains internal-only and the service is configured with Cloud Run's no-invoker-IAM-check setting. The API service remains IAM-private.
