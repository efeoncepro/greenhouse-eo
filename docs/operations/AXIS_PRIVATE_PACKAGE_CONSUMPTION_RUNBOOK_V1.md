# AXIS Private Package Consumption Runbook V1

## Purpose

This runbook describes how Greenhouse, Globe and future Efeonce products consume the
private AXIS packages without coupling runtimes or placing personal credentials in
source control.

## Current state — 2026-07-29

- Package repository: `efeoncepro/axis-design-system`.
- Private packages published at version `0.1.4`:
  - `@efeoncepro/axis-tokens`
  - `@efeoncepro/axis-ui-contracts`
  - `@efeoncepro/axis-ui-registry`
- Lab: `https://axis-design-system-lab.vercel.app`.
- Greenhouse and Globe consume the packages in opt-in AXIS adapter fixtures under `TASK-1591`.
- Product promotion remains gated separately from the pilot.
- GitHub Actions read access is configured for `efeoncepro/greenhouse-eo` and
  `efeoncepro/efeonce-globe` on all three packages.
- Vercel `NPM_RC` is configured on `axis-design-system-lab` for Production and Preview.
  ⚠️ **Verified 2026-07-29: it is not used.** The Lab consumes AXIS through `workspace:*`
  links, so its build never authenticates against the registry. Retire it — see the Delta below.
- GCP Secret Manager secret `axis-packages-read-token` exists in `efeonce-globe`; this
  is deliberate ecosystem ownership, not a Globe-only credential. The Compute Engine
  service accounts used by Globe and Greenhouse Cloud Build have secret-level
  `roles/secretmanager.secretAccessor`.
- The current PAT is operator-owned and expires on 2026-08-27. Replace it with a
  dedicated machine identity before the first external/customer rollout.
- Local private-package installation for the TASK-1591 canary was verified with a temporary
  developer credential. CI/Cloud Build wiring is now implemented: GitHub Actions uses its scoped
  `GITHUB_TOKEN`, while Cloud Build reads `axis-packages-read-token` and mounts an ephemeral
  BuildKit secret for `pnpm install`.
- The Globe AXIS browser/accessibility/reduced-motion evidence is automated by
  `apps/studio-client/scripts/axis-pilot-canary.test.mjs`; a real CI/Cloud Build execution and
  deployed digest verification remain required before promotion.

## Delta 2026-07-29 — dónde vive el credencial, y dónde NO hace falta (TASK-1589 V1.1)

Decisión arquitectónica completa en
`docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` § Delta 2026-07-29. Lo operativo:

**Hay dos planos de ejecución, y solo uno necesita un credencial durable.**

| Plano | Qué usa hoy | ¿Necesita secreto? |
|---|---|---|
| GitHub Actions — 11 workflows Greenhouse + `ci.yml` de Globe | `secrets.GITHUB_TOKEN` del runner | **No.** Efímero, por run. Ya es óptimo; no tocar |
| Cloud Build — 4 workers Greenhouse + Globe | Secret Manager | **Sí.** Único consumidor real del PAT |
| Vercel `NPM_RC` del Lab | variable de entorno sensible | **No — y hay que retirarla** (ver abajo) |

**Por qué esto importa para el diagnóstico:** el PAT **no está en el camino del PR**. El día que expire,
todos los PR seguirán verdes y solo fallará un build de worker, posiblemente semanas después y bajo
deadline. Es una falla silenciosa por construcción, y por eso existe el detector.

**Detector:** `.github/workflows/axis-credential-expiry.yml` (semanal, martes 13:00 UTC) corre
`scripts/ci/axis-package-credential-expiry-gate.mjs`. Lee la expiración **real que reporta GitHub** en el
header `github-authentication-token-expiration` — no una fecha escrita en este documento. Umbrales: aviso a
21 días, falla a 7. Mientras el secreto siga en el proyecto legacy, el workflow se omite solo y no hace
ruido; empieza a medir en cuanto exista en `efeonce-group`.

### 🔴 Retirar el `NPM_RC` de Vercel — credencial sin consumidor

`apps/lab` consume AXIS por **`workspace:*`** (symlinks a `packages/`), verificado en `pnpm-lock.yaml`
(`version: link:../../packages/tokens`). El build del Lab **nunca resuelve nada contra
`npm.pkg.github.com`**, así que el `NPM_RC` configurado en Production y Preview es un credencial de larga
vida almacenado **sin ningún consumidor**: superficie de exposición sin contrapartida.

Acción: borrar la variable en ambos entornos y redesplegar el Lab para confirmar que sigue construyendo.
Es reversible en un minuto (volver a crearla) y no afecta a Greenhouse ni a Globe.

### Nuevo hogar del secreto: `efeonce-group`

Decisión del operador (2026-07-29). El secreto deja de vivir en `efeonce-globe` —un proyecto de
**producto**— y pasa al proyecto del **control plane**, que ya gobierna a Globe. No es simétrico al
anterior: `efeonce-group` no es un peer de Globe.

Secuencia obligatoria, en este orden:

```bash
# 1. Crear el contenedor (el VALOR lo publica el operador; nunca por chat, nunca en un log)
gcloud secrets create axis-packages-read-token --project=efeonce-group

# 2. Publicar el valor como scalar crudo (sin comillas, sin \n — higiene de secretos)
printf %s "$TOKEN" | gcloud secrets versions add axis-packages-read-token \
  --project=efeonce-group --data-file=-

# 3. Conceder accessor SOLO sobre este secreto, a las dos identidades de build
for SA in 183008134038-compute@developer.gserviceaccount.com \
          818083690953-compute@developer.gserviceaccount.com; do
  gcloud secrets add-iam-policy-binding axis-packages-read-token \
    --project=efeonce-group --member="serviceAccount:${SA}" \
    --role=roles/secretmanager.secretAccessor
done

# 4. Apuntar los consumidores al nuevo versionName (4 deploy.sh de Greenhouse + Cloud Build de Globe)
# 5. Build verde en AMBOS productos contra el secreto nuevo
# 6. RECIÉN ENTONCES revocar el binding legacy en efeonce-globe y borrar el secreto viejo
```

**NUNCA** revocar el binding legacy antes del paso 5. Revocar primero deja a Greenhouse sin poder
desplegar sus workers.

## Required GitHub package access

GitHub Packages requires authentication for private packages. For GitHub Actions,
`GITHUB_TOKEN` is sufficient only when the consuming repository has been granted read
access to the package. Configure this in each package's GitHub settings:

`Package settings → Manage Actions access → Add repository`

Add:

- `efeoncepro/greenhouse-eo`
- `efeoncepro/efeonce-globe`

Repeat for all three AXIS packages. Do not make the packages public as a shortcut.

## Consumer `.npmrc`

Do not commit a token. The build environment must provide the token through its secret
manager and materialize this configuration only for the install step:

```ini
@efeoncepro:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${AXIS_PACKAGES_READ_TOKEN}
```

For local development, use a developer-owned `~/.npmrc` or an ignored project-local
file. Never add the resolved token to git, a deployment artifact or a log.

## Vercel

⚠️ **This section does NOT apply to the AXIS Lab.** The Lab is a workspace member and resolves
AXIS through `workspace:*` links, so it needs no registry credential at all — its `NPM_RC` is
being retired (see the Delta above). What follows applies only to a Vercel project that consumes
the **published** packages from outside the AXIS workspace.

For such a Vercel consumer, configure the project environment variable `NPM_RC` with the
`.npmrc` contents and select only the required environments (`Preview` first, then
`Production` after a successful canary). Vercel must receive an organization-owned
PAT classic with `read:packages` only; do not use a personal deployment token.

After setting `NPM_RC`, trigger a new deployment. Environment changes do not affect
previous deployments.

## Cloud Build / Globe and Greenhouse workers

Store the organization-owned read-only token in Secret Manager in the `efeonce-globe`
project. Grant the build service account access to that one secret only. The build
step writes the `.npmrc` file to the ephemeral workspace, runs `pnpm install --frozen-lockfile`,
and removes the file before producing the artifact. The token must not be passed as a
Docker build argument or copied into the image.

Current secret reference:

```text
projects/efeonce-globe/secrets/axis-packages-read-token
```

Current Globe build identity:

```text
818083690953-compute@developer.gserviceaccount.com
```

Greenhouse worker build identity:

```text
183008134038-compute@developer.gserviceaccount.com
```

This cross-project binding is temporary and intentionally avoids a second copy of the
PAT. The retirement condition is an ownership decision, not the PAT expiry: when the
dedicated machine identity is created, its replacement secret must be born in a neutral
AXIS ecosystem project outside any product project. Migrate both consumers, revoke the
Greenhouse binding to this legacy secret, and remove the legacy secret only after both
consumers pass their build and digest gates. Do not recreate the coupling by placing the
replacement secret in `efeonce-globe` merely because the legacy secret is there today.

The Greenhouse deploy scripts for `ops-worker`, `commercial-cost-worker`,
`ico-batch-worker` and the staging-only `artifact-worker` use the same contract.
The service Dockerfiles mount the secret in both builder and runtime installs;
the single-stage artifact worker mounts it in its only `pnpm install`. BuildKit
secrets are scoped to one `RUN`; the token is never passed as a Docker build argument or
copied into the image.

The deployment workflow must prove:

1. package installation succeeds;
2. the resulting image does not contain `.npmrc` or the token;
3. the deployed digest matches the build digest;
4. rollback restores the previous package version and image digest.

Until those checks have run successfully in the consumer pipeline and the deployed digest has been
verified, the AXIS adapters remain an opt-in canary and must not be described as a production-wide
rollout.

## Credential options

GitHub Packages currently supports a classic PAT for this registry. The preferred
operational model is a dedicated Efeonce machine account with `read:packages` only,
short expiration and documented rotation owner. Do not send the token through chat.

## Consumer integration sequence

1. Grant repository read access to all AXIS packages.
2. Configure the read-only token in Vercel and/or Secret Manager.
3. Add the scoped registry configuration without resolving the secret in source.
4. Add fixed package versions, starting at the verified pilot version `0.1.4`.
5. Implement one simple and one complex adapter under the consumer's native runtime.
6. Run desktop, 390 px, keyboard, reduced-motion, accessibility and visual-diff evidence.
7. Record the consumer and evidence in the AXIS registry.
8. Keep the pilot opt-in until rollback and a fresh install have passed.

## Rollback

Rollback means reverting the consumer package version or adapter flag. It does not mean
mutating the shared contract or deleting a package. Keep the last known-good package
version in the consumer lockfile and deployment evidence.

## Evidence and ownership

- Architecture: `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`.
- Umbrella: `TASK-1588`.
- Consumer pilot: `TASK-1591`.
- Package foundation: `TASK-1589`.
- Registry/Lab: `TASK-1590` and `TASK-1592`.
- Package repository: `../axis-design-system`.
