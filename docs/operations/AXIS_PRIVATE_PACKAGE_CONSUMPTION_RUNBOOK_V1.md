# AXIS Private Package Consumption Runbook V1

## Purpose

This runbook describes how Greenhouse, Globe and future Efeonce products consume the
private AXIS packages without coupling runtimes or placing personal credentials in
source control.

## Current state — 2026-07-30

- Package repository: `efeoncepro/axis-design-system`.
- Agent-facing visual guide: [`DESIGN.md`](https://github.com/efeoncepro/axis-design-system/blob/main/DESIGN.md), generated from `packages/tokens` and checked with `pnpm design:check` in the AXIS repository. It is a projection for agents, not a second token source of truth.
- Lab runtime: `apps/lab` is Astro `7.1.6`, `output: 'static'`, public Vercel delivery, and builds to
  `apps/lab/dist`; its HTML reference consumes AXIS registry/tokens and does not import Greenhouse/Globe adapters.
- Private packages published at version `0.1.5` (was `0.1.4` until 2026-07-29; the bump corrected
  the `warning`/`danger` token drift and was the first release gated by CI):
  - `@efeoncepro/axis-tokens`
  - `@efeoncepro/axis-ui-contracts`
  - `@efeoncepro/axis-ui-registry`
- Lab: `https://axis-design-system-lab.vercel.app`.
- Greenhouse and Globe consume the packages in opt-in AXIS adapter fixtures under `TASK-1591`.
- Product promotion remains gated separately from the pilot.
- GitHub Actions read access is configured for `efeoncepro/greenhouse-eo` and
  `efeoncepro/efeonce-globe` on all three packages.
- Vercel `NPM_RC` on `axis-design-system-lab`: **retired 2026-07-29**. The Lab consumes AXIS through
  `workspace:*` links, so its build never authenticates against the registry — the variable had no
  consumer. Proven by installing and building with no credential at all. See the Delta below.
- GCP Secret Manager secret `axis-packages-read-token` now lives in `efeonce-group` and is the
  production build source for Greenhouse and Globe. The two Cloud Build service accounts have
  secret-level `roles/secretmanager.secretAccessor` on that secret only.
- The active credential is the operator-owned, short-lived `read:packages` PAT approved for this
  migration; it expires on 2026-08-28. This is the accepted interim path, not a dedicated GitHub
  machine account. Create that account before external/customer rollout and rotate the Secret
  Manager version without changing the consumer contract.
- The temporary migration PAT remains active for the current internal/production build path. The
  legacy PAT used by the former Globe Cloud Build path was revoked after production verification;
  do not confuse the two credentials.
- Local private-package installation for the TASK-1591 canary was verified with a temporary
  developer credential. CI/Cloud Build wiring is now implemented: GitHub Actions uses its scoped
  `GITHUB_TOKEN`, while Cloud Build reads `axis-packages-read-token` and mounts an ephemeral
  BuildKit secret for `pnpm install`.
- Cloud Build ejecutó el contrato **en real** el 2026-07-29 y 2026-07-30: los cuatro worker deploys
  de Greenhouse corrieron verdes contra `0.1.5`; el release productivo `30502476429` terminó en
  `success` sobre `41fa94846d0ca18a0f83529dc90cdc2da15a632d`, con health check productivo verde.
- El secreto legacy de `efeonce-globe` fue deshabilitado y eliminado después de verificar el release;
  el secreto activo es únicamente `projects/efeonce-group/secrets/axis-packages-read-token`.
- ✅ The Globe AXIS browser/accessibility/reduced-motion evidence is automated by
  `apps/studio-client/scripts/axis-pilot-canary.test.mjs` **y desde el 2026-07-29 corre en el CI de Globe**.
  Hasta entonces no corría: resolvía Playwright con un fallback a una ruta absoluta del disco de un
  desarrollador y moría con `ERR_MODULE_NOT_FOUND` en cualquier runner, dejando el CI de Globe rojo 9
  commits (`ISSUE-128`, resuelto en `efeonce-globe@498ffce` con `playwright-core` + `channel: 'chrome'`,
  sin descargar browsers). Evidencia: run `30499520419` `success` con `AXIS pilot canary OK` en el log.
  La evidencia del piloto pasa de **local** a **CI**.
- El rollback interno de `globe-studio-internal` y `globe-api-internal` fue ejercitado al 100%, verificado y
  restaurado correctamente durante la promoción productiva.

## Delta 2026-07-30 — el release admite versionado independiente y es idempotente

Los tres paquetes se versionan **de forma independiente**: `tokens` puede ir en `0.2.1` mientras
`contracts` y `registry` siguen en `0.1.5`. Bumpear los tres por un cambio de uno publicaría versiones sin
contenido. El contrato del tag es **"al menos un paquete está en esta versión"**, no "los tres coinciden".

El paso de publish **salta las versiones que ya están en el registry** en vez de fallar. Eso permite
re-taguear un commit ya publicado y usar el run como **verificación a posteriori** — que es lo que se hizo
con `v0.2.1` después de que `0.2.0`/`0.2.1` se publicaran a mano durante `TASK-1600`.

**NUNCA publicar a mano.** El pipeline es el que corre CI, el gate de contratos y la coherencia del tag; sin
él, una versión llega al registry sin que nadie haya verificado su contenido. Ocurrió el 2026-07-30 y el
síntoma fue inmediato: `0.2.0` salió sin los type aliases del adapter y hubo que publicar `0.2.1`.

## Delta 2026-07-29 — dónde vive el credencial, y dónde NO hace falta (TASK-1589 V1.1)

Decisión arquitectónica completa en
`docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` § Delta 2026-07-29. Lo operativo:

**Hay dos planos de ejecución, y solo uno necesita un credencial durable.**

| Plano | Qué usa hoy | ¿Necesita secreto? |
|---|---|---|
| GitHub Actions — 11 workflows Greenhouse + `ci.yml` de Globe | `secrets.GITHUB_TOKEN` del runner | **No.** Efímero, por run. Ya es óptimo; no tocar |
| Cloud Build — 4 workers Greenhouse + Globe | Secret Manager | **Sí.** Único consumidor real del PAT |
| Vercel `NPM_RC` del Lab | *(nada — retirada 2026-07-29)* | **No.** El Lab usa `workspace:*`; la variable no tenía consumidor |

**Por qué esto importa para el diagnóstico:** el PAT **no está en el camino del PR**. El día que expire,
todos los PR seguirán verdes y solo fallará un build de worker, posiblemente semanas después y bajo
deadline. Es una falla silenciosa por construcción, y por eso existe el detector.

**Detector:** `.github/workflows/axis-credential-expiry.yml` (semanal, martes 13:00 UTC) corre
`scripts/ci/axis-package-credential-expiry-gate.mjs`. Lee la expiración **real que reporta GitHub** en el
header `github-authentication-token-expiration` — no una fecha escrita en este documento. Umbrales: aviso a
21 días, falla a 7. Mientras el secreto siga en el proyecto legacy, el workflow se omite solo y no hace
ruido; empieza a medir en cuanto exista en `efeonce-group`.

### ✅ `NPM_RC` de Vercel retirado — era un credencial sin consumidor (ejecutado 2026-07-29)

`apps/lab` consume AXIS por **`workspace:*`** (symlinks a `packages/`), verificado en `pnpm-lock.yaml`
(`version: link:../../packages/tokens`). El build del Lab **nunca resuelve nada contra
`npm.pkg.github.com`**, así que el `NPM_RC` que estaba en Production y Preview era un credencial de larga
vida almacenado **sin ningún consumidor**: superficie de exposición sin contrapartida.

**Retirado** de ambos entornos; el proyecto quedó sin ninguna variable de entorno.

**Verificación (determinista, más fuerte que un redeploy):** con `node_modules` borrado y **sin ninguna
credencial de registry** —`NPM_CONFIG_USERCONFIG=/dev/null`, sin `NPM_TOKEN` ni `NODE_AUTH_TOKEN`—
`pnpm install --frozen-lockfile` resolvió en 247 ms y `pnpm --filter @efeonce/axis-design-system-lab build`
emitió `dist/` completo. Si el Lab necesitara el registry, el install habría fallado con 401.

Reversible en un minuto: volver a crear la variable. No afecta a Greenhouse ni a Globe.

### Nuevo hogar del secreto: `efeonce-group` — activo desde 2026-07-29

**Estado:** el secreto `axis-packages-read-token` **ya existe y tiene una versión habilitada** en
`efeonce-group`, con las dos identidades de build como `secretAccessor`. Los consumidores ya apuntan
al control plane y el release productivo terminó correctamente.

El valor fue publicado mediante el flujo aprobado: un PAT temporal `read:packages` del operador. No se
creó una cuenta GitHub de máquina porque el operador eligió el camino temporal; esa sustitución queda
como trabajo previo al rollout externo.

Decisión del operador (2026-07-29). El secreto deja de vivir en `efeonce-globe` —un proyecto de
**producto**— y pasa al proyecto del **control plane**, que ya gobierna a Globe. No es simétrico al
anterior: `efeonce-group` no es un peer de Globe.

Secuencia obligatoria, en este orden:

```bash
# ✅ 1. HECHO 2026-07-29 — contenedor creado (no lleva valor)
gcloud secrets create axis-packages-read-token --project=efeonce-group \
  --replication-policy=automatic \
  --labels=owner=axis-design-system,purpose=private-package-read,task=task-1589

# ✅ 2. HECHO 2026-07-29 — se publicó el PAT temporal aprobado por el operador.
#       El valor nunca pasó por chat ni se imprimió en logs.
printf %s "$TOKEN" | gcloud secrets versions add axis-packages-read-token \
  --project=efeonce-group --data-file=-

# ✅ 3. HECHO 2026-07-29 — accessor SOLO sobre este secreto, readback verificado
for SA in 183008134038-compute@developer.gserviceaccount.com \
          818083690953-compute@developer.gserviceaccount.com; do
  gcloud secrets add-iam-policy-binding axis-packages-read-token \
    --project=efeonce-group --member="serviceAccount:${SA}" \
    --role=roles/secretmanager.secretAccessor
done

# ✅ 4. HECHO 2026-07-29 — consumidores migrados al nuevo secret resource.
# ✅ 5. HECHO 2026-07-30 — builds, canaries y release productivo verdes en ambos productos.
# ✅ 6. HECHO 2026-07-30 — versión legacy deshabilitada y secreto eliminado de `efeonce-globe`;
#       el PAT legacy también fue revocado en GitHub después de verificar el release productivo.
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

Store the read-only token in Secret Manager in the `efeonce-group`
project. Grant each build service account access to that one secret only. The build
step writes the `.npmrc` file to the ephemeral workspace, runs `pnpm install --frozen-lockfile`,
and removes the file before producing the artifact. The token must not be passed as a
Docker build argument or copied into the image.

Current secret reference:

```text
projects/efeonce-group/secrets/axis-packages-read-token
```

Current Globe build identity:

```text
818083690953-compute@developer.gserviceaccount.com
```

Greenhouse worker build identity:

```text
183008134038-compute@developer.gserviceaccount.com
```

The previous cross-project binding is retired. The `efeonce-globe` secret container was disabled and
deleted after production verification, and no runtime reference should be recreated there. Keep the
replacement in `efeonce-group`; do not recreate the coupling by placing it in a product project.

The Greenhouse deploy scripts for `ops-worker`, `commercial-cost-worker`,
`ico-batch-worker` and the staging-only `artifact-worker` use the same contract.
The service Dockerfiles mount the secret in both builder and runtime installs;
the single-stage artifact worker mounts it in its only `pnpm install`. BuildKit
secrets are scoped to one `RUN`; the token is never passed as a Docker build argument or
copied into the image.

The deployment workflow must prove:

1. ✅ **package installation succeeds** — verificado en pipeline real el 2026-07-29: los cuatro worker
   deploys de Greenhouse (`ops-worker`, `artifact-worker`, `ico-batch`, `commercial-cost-worker`) corrieron
   verdes contra AXIS `0.1.5`, con el credencial leído de Secret Manager y montado como secreto BuildKit.
   Es la primera ejecución real de este contrato, no un ensayo local.
2. ✅ **the resulting image does not contain `.npmrc` or the token** — BuildKit secret mounts are
   ephemeral and the production image/deploy contract completed without a credential artifact.
   `--mount=type=secret` no persiste el archivo en la capa *por diseño*, y el `trap 'rm -f .npmrc'` cubre el
   workspace de Cloud Build; pero **la comprobación empírica sobre la imagen publicada no existe**. Es una
   garantía del mecanismo, no evidencia. Falta un gate que inspeccione la imagen.
3. ✅ **the deployed revision matches the built commit** — cubierto por el contrato de TASK-851: los
   `deploy.sh` leen `GIT_SHA` de la revisión Cloud Run servida y abortan fail-loud ante mismatch contra
   `EXPECTED_SHA`. Verificado en los cuatro deploys de esta pasada.
4. ✅ **rollback restores the previous package version and image digest** — rollback exercise completed
   for Globe Studio and API internal services, with traffic restored to the new revisions. Worker
   Cloud Run deploys also passed their bounded Ready and commit-drift gates.

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
4. Add fixed package versions, starting at the verified pilot version `0.1.5`.
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
