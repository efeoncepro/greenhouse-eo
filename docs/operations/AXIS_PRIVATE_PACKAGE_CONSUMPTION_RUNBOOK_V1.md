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
- ⚠️ **Superseded — la credencial de esta línea ya venció y provocó un incidente.** El PAT
  `read:packages` del operador publicado como **versión 1** (creada 2026-07-29T23:47:59) expiró el
  **2026-08-28** y dejó rotos los builds de Cloud Build. La credencial vigente es la **versión 2**
  (2026-08-29T13:44:17); la versión 1 quedó `disabled`. Ver **Delta 2026-08-29** más abajo: es el
  caso fuente y contiene el procedimiento de rotación.
- Sigue siendo el camino interino aprobado —un PAT del operador, **no** una cuenta GitHub de
  máquina—. Crear esa cuenta antes del rollout externo/cliente y rotar la versión de Secret Manager
  sin cambiar el contrato del consumidor.
- El PAT legacy que usaba el antiguo camino de Cloud Build de Globe fue revocado después de la
  verificación productiva; no confundir las dos credenciales.
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

## Delta 2026-08-29 — la credencial venció, bloqueó un release, y el detector SÍ había avisado

Caso fuente del modo de falla que este runbook venía anunciando desde el 2026-07-29 ("el día que
expire, todos los PR seguirán verdes y solo fallará un build de worker"). Ocurrió exactamente así.
Lo que **no** se anticipó es la segunda mitad: el detector funcionó, midió bien y avisó a tiempo —
y aun así nadie lo leyó.

### Qué pasó

- El secreto `projects/efeonce-group/secrets/axis-packages-read-token` **no guarda el token pelado**:
  guarda un **`.npmrc` completo** de tres líneas que el Dockerfile monta en `/root/.npmrc`.

  ```ini
  @jsr:registry=https://npm.jsr.io/
  @efeoncepro:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=<TOKEN>
  ```

- La **versión 1** (creada 2026-07-29T23:47:59) llevaba un PAT **clásico** de GitHub con scope
  `read:packages` y la **expiración por defecto de 30 días** → venció el **2026-08-28**. Confirmado
  después contra la UI de GitHub: el token decía *"Expired yesterday"*, y había un **segundo** token
  AXIS ya vencido el **2026-08-27**.
- **Síntoma:** `ERR_PNPM_FETCH_401` sobre `@efeoncepro/axis-tokens` en Cloud Build, durante
  `pnpm install --frozen-lockfile`.
- **Radio: 3 de los 4 workers del control plane** — `ops-worker`, `commercial-cost-worker` e
  `ico-batch` montan ese `.npmrc` (también `artifact-worker`, que está fuera del control plane).
  `hubspot-greenhouse-integration` **no** lo usa. **Vercel no se ve afectado**: su build pasó verde.
  Eso es justo lo que vuelve engañoso mirar sólo el color del PR.
- Llevaba **~14 h roto y 3 deploys consecutivos fallidos** antes de detectarse. Se descubrió porque
  alguien estaba mirando un deploy.

### 🔴 El detector no falló: falló el enrutamiento de su señal

`.github/workflows/axis-credential-expiry.yml` **corrió, midió bien y avisó con la anticipación que
tenía prometida**:

```text
run 32856176785 · 2026-08-25T13:54Z · conclusion: failure
✖ El credencial AXIS expira el 2026-08-28 — quedan 3 días.
  Rotar YA: al expirar, GitHub Actions sigue verde y solo fallan los builds de worker.
```

Tres días de aviso, con la fecha exacta y la instrucción correcta. El incidente ocurrió igual.

**Por qué se perdió el aviso — y esto es lo replicable:** las dos corridas previas del mismo workflow
también estaban en rojo, **por una causa ajena a la credencial**:

| Run | Fecha | Conclusión | Causa |
|---|---|---|---|
| `30924196526` | 2026-08-04 | `failure` | `Unable to locate executable file: pnpm` (orden `setup-node`/pnpm) |
| `31501087312` | 2026-08-11 | `failure` | idéntica |
| `31700211413` | 2026-08-13 | `success` | corregida (`package-manager-cache: false`) |
| `32144377290` | 2026-08-18 | `success` | credencial aún fuera de la ventana |
| `32856176785` | 2026-08-25 | `failure` | **la alarma real: 3 días para vencer** |

Para cuando llegó el rojo que importaba, **el rojo ya era el color habitual de ese workflow**. Un
`failure` en un scheduled workflow no le llega a nadie por sí solo: no bloquea un PR, no abre un
issue, no manda un mensaje. Es una alarma sonando en una sala vacía.

**Regla:** un gate programado cuyo único canal de salida es el color de su propia corrida **no es una
alerta, es un registro**. Y un gate que acumula rojos por causas de infraestructura pierde su
capacidad de significar algo el día que se pone rojo de verdad. Un rojo ajeno al objeto medido debe
arreglarse *rápido*, no tolerarse: cada día que se deja, degrada la señal que sí importa.

### Resolución (2026-08-29)

1. El **operador** generó un PAT nuevo y lo cargó como **versión 2** del secreto
   (`createTime 2026-08-29T13:44:17`).
2. Tras eso, los 3 workers desplegaron en `success`.
3. La **versión 1 quedó `disabled`** el mismo día, por higiene. Estado verificado:

   ```text
   NAME  STATE     CREATED
   2     enabled   2026-08-29T13:44:17
   1     disabled  2026-07-29T23:47:59
   ```

### Cómo rotar — `scripts/secrets/rotate-axis-packages-token.sh`

La rotación **es acción del OPERADOR, no del agente** (ver reglas duras). El helper existe para que
esa acción sea de un solo paso y no se pueda arruinar en silencio.

```bash
# macOS — recomendado. El PAT va portapapeles → stdin → Secret Manager.
# No se muestra en pantalla, no queda en el historial, no toca un archivo.
pbpaste | ./scripts/secrets/rotate-axis-packages-token.sh

# Cualquier plataforma, interactivo: pega el PAT, Enter, Ctrl-D.
./scripts/secrets/rotate-axis-packages-token.sh
```

Lo que hace, y **por qué cada pieza está ahí**:

- **Lee el PAT por `stdin` y sólo por `stdin`.** Nunca como argumento —quedaría en `ps` y en el
  historial del shell—, nunca en un archivo temporal, nunca en un log.
- **Valida el token contra la API de GitHub ANTES de escribir la versión**
  (`GET /orgs/efeoncepro/packages?package_type=npm`). Un `.npmrc` malformado o un scope mal elegido
  fallan con **el mismo 401** que el token vencido; sin esta validación, descubrirlo cuesta un ciclo
  de build de ~4 min en vez de 2 segundos.
- **Compone el `.npmrc` completo**, que es la forma que el consumidor espera. Cargar el token pelado
  produce un secreto sintácticamente válido y funcionalmente muerto.

Después de rotar, verificar el estado de versiones y desactivar la anterior:

```bash
gcloud secrets versions list axis-packages-read-token --project efeonce-group \
  --format='table(name,state,createTime)'
gcloud secrets versions disable <VERSION_ANTERIOR> \
  --secret=axis-packages-read-token --project efeonce-group
```

### ⚠️ Reglas duras

- **La rotación es acción del OPERADOR.** Crear un PAT y manipular su valor es una operación de
  credencial: el agente **no la ejecuta**, aunque se lo pidan. Enuncia la regla y devuelve la acción.
- **NUNCA sustituir la credencial acotada por una de scope amplio** —por ejemplo el token de una
  sesión `gh`— para desbloquear un build. «Funciona», y deja en infraestructura productiva una
  credencial que puede mucho más que `read:packages`. Cambia un incidente de 30 minutos por una
  exposición permanente.
- **Un token expuesto en una captura o en un chat queda comprometido**, sin importar cuán nuevo sea.
  Se revoca y se genera otro. No hay versión de esto en que «total, es de sólo lectura».
- **NUNCA promover con un deploy de worker en rojo.** Los workers se despliegan por `workflow_call`
  dentro del orquestador, así que el release cierra `degraded` con `worker_revision_drift`; y si
  alguno queda change-gated y se salta, **el código entra a `main` SIN su worker desplegado**, sin
  error visible.
- **Diagnóstico: antes de culpar al diff, mirar el HISTORIAL del workflow.**

  ```bash
  gh run list --workflow=<workflow>-deploy.yml --limit 12
  ```

  Si los commits previos también fallan, es entorno o credencial, no tu cambio.

### Arreglo durable — PENDIENTE (no está hecho)

Un PAT estático de 30 días es una bomba de tiempo con fecha conocida: rotarlo sólo mueve la fecha.

**El arreglo real:** la App de GitHub del repo puede acuñar **tokens de instalación de 1 hora** bajo
demanda desde su private key. Eso elimina el vencimiento silencioso en vez de posponerlo.

**Hoy NO puede.** La App `greenhouse-release-watchdog` (`app_id=3665723`) tiene permisos
`actions:read`, `deployments:read`, `metadata:read` — **sin `packages`**. Concederlo es acción de un
**owner de la organización**, no de un agente ni del pipeline.

**Mínimo intermedio mientras tanto**, en este orden de valor:

1. **Un check de preflight que lo detecte ANTES de la promoción.** Es la corrección directa del
   modo de falla real de este incidente: no faltó medición, faltó que la medición apareciera donde
   alguien está obligado a mirar.
2. **Anotar la expiración en el secreto** (etiqueta de la versión). Es para el humano que corre
   `gcloud secrets versions list`; **no** es la fuente de verdad —el gate seguirá leyendo la
   expiración real que reporta GitHub en el header `github-authentication-token-expiration`, porque
   una fecha escrita a mano deriva y el header no.

> Nota de mantenimiento para quien toque el gate: el workflow inyecta **el payload completo del
> secreto** en `AXIS_PACKAGES_READ_TOKEN`, y ese payload es un `.npmrc` de tres líneas, no un token
> pelado. Con la forma actual el gate reportó la fecha correcta el 2026-08-25 (evidencia arriba). Si
> se cambia la forma del secreto o el modo de inyección, **volver a verificar que el gate sigue
> midiendo** — un gate que se vuelve ciego sale `0` igual que uno sano.

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

⚠️ **El secreto de Secret Manager guarda este archivo YA RESUELTO, no el token.** Su contenido real
son tres líneas —incluye `@jsr:registry`— y se monta tal cual. Ver **Delta 2026-08-29** para la forma
exacta y el helper que la compone; cargar el token pelado produce un secreto válido y muerto.

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

⚠️ Un PAT **clásico** creado sin tocar el selector de expiración toma el **default de 30 días**. Fue
la causa directa del incidente del 2026-08-28. **Procedimiento de rotación, reglas duras y el arreglo
durable pendiente: ver Delta 2026-08-29.** La rotación es acción del **operador**.

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
