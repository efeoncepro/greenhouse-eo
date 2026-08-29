# TASK-1794 — La credencial de paquetes privados AXIS deja de vencer en silencio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (el Slice 2 necesita una acción de owner de la organización GitHub; ver §Out-of-band coordination)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El secreto `axis-packages-read-token` guarda un `.npmrc` con un PAT clásico de GitHub que vence a los
30 días y **nadie se entera cuando expira**. El 2026-08-28 tumbó tres de los cuatro workers del
control plane con `ERR_PNPM_FETCH_401` mientras Vercel seguía verde, y bloqueó un release de
producción ~2 horas. Esta task cambia el mecanismo: la App de GitHub acuña **tokens de instalación de
1 hora** bajo demanda desde su private key, en vez de un PAT estático que hay que rotar a mano cada
mes. Mientras esa puerta no se abra, deja el mínimo que hace la expiración **visible antes** de
promover, no durante.

## Why This Task Exists

No es un descuido: es una clase de falla con mecanismo propio, y ya se repitió.

**Qué pasó, medido.** La versión 1 del secreto se creó el 2026-07-29 y venció el **2026-08-28**. Sin
señal, sin alerta, sin check en el camino de la promoción. Los tres workers que instalan paquetes
privados en su build —`ops-worker`, `commercial-cost-worker`, `ico-batch`— fallaron con
`ERR_PNPM_FETCH_401`, y **Vercel siguió verde**, porque el portal no consume ese registry. Esa
asimetría es lo que hace el síntoma engañoso: el tablero que la mayoría mira decía que todo estaba
bien. Llevaba ~14 h y 3 deploys fallidos antes de detectarse, y se detectó **porque alguien estaba
mirando un deploy**, no porque el sistema avisara.

**Y no fue el único.** Había un SEGUNDO token AXIS vencido el **2026-08-27**. Dos credenciales del
mismo proveedor muertas en dos días consecutivos no es mala suerte: es lo que produce un default de
30 días sin dueño ni recordatorio.

**Por qué el arreglo no es "rotar mejor".** Rotar es tratar el caso; el defecto es que el mecanismo
elegido **caduca por diseño y no lo declara a nadie**. Un token de instalación de la App se acuña al
momento, vive una hora y se deriva de una private key que no expira: elimina la CLASE de falla, no la
ocurrencia. Ese es el arreglo que esta task persigue.

**Por qué hoy no se puede, y eso no lo convierte en excusa.** La App `greenhouse-release-watchdog`
(`app_id=3665723`) tiene `actions:read`, `deployments:read` y `metadata:read` — **sin `packages`**.
Concederlo es acción de un owner de la organización, fuera del alcance de un agente. Por eso la task
se parte: el Slice 1 entrega hoy lo que hace la expiración visible en el momento en que importa, y el
Slice 2 ejecuta el cambio de mecanismo en cuanto el permiso exista.

## Goal

- Que la expiración del credencial AXIS **falle el preflight de release** antes de promover, en vez
  de aparecer como un 401 de build a mitad de una promoción.
- Que el propio secreto declare cuándo vence, en sus annotations de Secret Manager, para que la fecha
  viva junto al dato y no en un documento que se desincroniza.
- Que las builds de los cuatro workers dejen de depender de un PAT estático y consuman un token de
  instalación de corta vida acuñado desde la private key de la App de GitHub.
- Que el helper de rotación quede como camino de contingencia explícito y fechado, no como el
  procedimiento normal de cada mes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` — el preflight, sus checks y la state
  machine del release; el Slice 1 agrega un check, no una excepción.
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` — el contrato de build de los workers,
  dueño de cómo se resuelven dependencias antes de cada install.
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — postura cross-runtime
  de secretos y observabilidad.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Cloud Build / Cloud Run y el acceso a
  Secret Manager desde los builds.

Reglas obligatorias:

- **NUNCA** imprimir, loggear ni escribir en un artefacto el valor del credencial, ni completo ni
  truncado. El gate existente mide la expiración leyendo el header que GitHub devuelve, no el token.
- **NUNCA** publicar un secreto con comillas envolventes, `\n` literal o whitespace residual
  (Secret Manager Hygiene, CLAUDE.md): el consumidor es un `.npmrc` y un byte de más lo rompe.
- **NUNCA** rotar sin verificar el consumidor real después: el credencial se prueba contra el
  registry de paquetes, no contra el hecho de que `gcloud` aceptó la versión nueva.
- **NUNCA** declarar el flujo cerrado porque el gate esté verde en CI si las builds de los cuatro
  workers no ejercitaron el camino nuevo al menos una vez.
- **SIEMPRE** que el mecanismo cambie, dejar el camino viejo desactivado pero recuperable durante una
  ventana declarada; una credencial de build no se corta en seco.

## Normative Docs

- `docs/operations/runbooks/production-release.md` — el runbook que consume el preflight; un check
  nuevo tiene que aparecer ahí con su remediación.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — contrato de placement.
- `.github/workflows/axis-credential-expiry.yml` — el watch semanal existente, que esta task no
  reemplaza sino que complementa con el check del camino de promoción.

## Dependencies & Impact

### Depends on

- `src/lib/release/github-app-token-resolver.ts` — ya acuña tokens de instalación
  (`resolveGithubAppInstallationToken`, `isGithubAppConfigured`) desde la private key en Secret
  Manager (`GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF`). El Slice 2 lo extiende, no crea un
  segundo minter.
- `scripts/ci/axis-package-credential-expiry-gate.mjs` — el gate que ya mide la expiración real
  contra el header `github-authentication-token-expiration`.
- Permiso `packages` (lectura) en la App `greenhouse-release-watchdog` (`app_id=3665723`) — acción de
  owner de la organización, fuera del repo.

### Blocks / Impacts

- `TASK-864` (Production Readiness Control Plane Contract) — su Goal declara "watchdog/schedule del
  doctor para detectar drift de credenciales". Este credencial es un caso concreto de ese drift; si
  `TASK-864` aterriza primero, el check del Slice 1 se aloja en el doctor en vez de duplicarse.
- `TASK-1589` (Efeonce UI package foundation) — es quien introdujo el contrato
  `axis-packages-read-token` y su watch semanal; el Slice 2 cambia el mecanismo que esa task
  estableció y debe recibir su `## Delta`.
- Los cuatro workers de Cloud Run: `ops-worker`, `commercial-cost-worker`, `ico-batch`,
  `artifact-worker`.

### Files owned

- `scripts/ci/axis-package-credential-expiry-gate.mjs`
- `scripts/secrets/rotate-axis-packages-token.sh`
- `scripts/release/production-preflight.ts`
- `services/ops-worker/deploy.sh`
- `services/commercial-cost-worker/deploy.sh`
- `services/ico-batch/deploy.sh`
- `services/artifact-worker/deploy.sh`
- `src/lib/release/github-app-token-resolver.ts`
- `docs/operations/runbooks/production-release.md`

## Current Repo State

### Already exists

- **El gate que mide bien.** `scripts/ci/axis-package-credential-expiry-gate.mjs` lee la expiración
  **que GitHub reporta para el token**, no una fecha escrita en un documento — su propio comentario
  lo dice: un ledger deriva, el header no. Umbrales `WARN_DAYS=21` / `FAIL_DAYS=7`, y sin token sale
  `0` declarando que se omitió.
- **Un watch semanal.** `.github/workflows/axis-credential-expiry.yml` corre martes 13:00 UTC con WIF
  y lee el secreto desde Secret Manager. Su paso de lectura es `continue-on-error` mientras el
  secreto viva en el proyecto legacy.
- **Un helper de rotación seguro.** `scripts/secrets/rotate-axis-packages-token.sh`.
- **Un minter de tokens de instalación ya escrito y en uso.**
  `src/lib/release/github-app-token-resolver.ts` acuña el JWT de la App y canjea el token de
  instalación con caché.
- **Cuatro consumidores declarados.** `services/{ops-worker,commercial-cost-worker,ico-batch,artifact-worker}/`
  en sus `deploy.sh` y `Dockerfile`.

### Gap

- 🔴 **El camino de la promoción no mira el credencial.** `scripts/release/production-preflight.ts`
  no tiene ningún check de AXIS: la expiración es invisible justo en el momento en que su
  consecuencia es más cara. El watch semanal llega **hasta 7 días tarde** respecto de un release, y
  el incidente del 2026-08-28 cayó dentro de esa ventana.
- El secreto **no declara su expiración** en las annotations de Secret Manager: la fecha sólo existe
  dentro del token y en la memoria de quien lo creó.
- El mecanismo sigue siendo un PAT clásico con default de 30 días. Mientras eso no cambie, cada mes
  hay una fecha en la que el sistema se cae si nadie actúa.
- La App no tiene `packages`, así que el arreglo durable **no es ejecutable hoy** por un agente.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/{ci,release,secrets}/`, `services/*/deploy.sh` y `src/lib/release/github-app-token-resolver.ts`
- Future candidate home: `remain-shared`
- Boundary: el minter canónico `resolveGithubAppInstallationToken` es la única fuente de credenciales derivadas de la App; sus consumers son el preflight de release y los cuatro builds de worker
- Server/browser split: `n/a` — nada de esto se ejecuta en el browser; el credencial vive en Secret Manager y se resuelve en CI y en Cloud Build
- Build impact: cambia cómo los cuatro Dockerfile de worker obtienen credenciales antes del install; sin dependencias nuevas
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: el secreto `axis-packages-read-token` en Secret Manager (proyecto `efeonce-group`) y la private key de la App `greenhouse-release-watchdog`
- Consumidores afectados: los cuatro builds de worker en Cloud Build, el preflight de release y el watch semanal
- Runtime target: `production` (Cloud Build, GitHub Actions)

### Contract surface

- Contrato existente a respetar: `scripts/ci/axis-package-credential-expiry-gate.mjs`,
  `src/lib/release/github-app-token-resolver.ts`, `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`
- Contrato nuevo o modificado: un check de preflight nuevo con su código de causa propio; una función
  de minteo con scope de paquetes derivada del resolver existente
- Backward compatibility: `gated` — el camino PAT queda operativo detrás de un fallback declarado
  durante la ventana de cutover
- Full API parity: `N/A — no capability`. Nada de esto es una acción de negocio del portal: es
  credencial de build. No se expone a UI, Nexa ni MCP, y exponerlo sería un defecto de seguridad, no
  una brecha de parity.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna — no hay persistencia en PostgreSQL ni BigQuery
- Invariantes que no se pueden romper:
  - El valor del credencial jamás aparece en logs, artefactos de CI, salida de consola ni mensajes
    de error; lo único observable es su fecha de expiración y un veredicto.
  - Un credencial sin fecha legible se trata como **no medible**, nunca como sano: el gate distingue
    "omitido" de "verde" y el preflight no aprueba sobre un "omitido" silencioso.
  - El secreto se publica como escalar crudo (`printf %s`), sin comillas ni salto de línea final.
- Write-target allowlist: `N/A` — la task no escribe en ninguna tabla
- Tenant/space boundary: `N/A` — credencial de infraestructura, sin dimensión de tenant
- Idempotency/concurrency: el minteo es idempotente por caché de token vigente en el resolver; dos
  builds concurrentes acuñan tokens independientes sin coordinación
- Audit/outbox/history: el veredicto del preflight queda en el artefacto JSON del release; el minteo
  queda en el audit log de la App en GitHub. Sin outbox: no es un evento de dominio.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: Slice 1 activo de inmediato (es un check, y su modo de falla es avisar de más);
  Slice 2 detrás de fallback al PAT hasta que las cuatro builds pasen con el mecanismo nuevo
- Backfill plan: `N/A`
- Rollback path: Slice 1 revert PR; Slice 2 volver al PAT es cambiar una variable del build y
  redeployar — por eso el secreto no se borra durante la ventana de cutover
- External coordination: concesión del permiso `packages` en la App por un owner de la organización;
  acceso del service account de Cloud Build a la private key de la App

### Security and access

- Auth/access gate: WIF para leer Secret Manager en CI; service account de Cloud Build para la
  private key de la App
- Sensitive data posture: `secrets` — el credencial es el dato sensible y la superficie de fuga es la
  salida de CI
- Error contract: el gate falla con causa nombrada y sin filtrar el valor; los errores de red y los
  de credencial se distinguen (uno se reintenta, el otro no)
- Abuse/rate-limit posture: el minteo respeta el caché del resolver para no golpear la API de la App
  en cada build; sin rate limit adicional

### Runtime evidence

- Local checks: `pnpm vitest run scripts/ci/__tests__` y ejecución directa del gate contra un token
  de prueba con expiración conocida
- DB/runtime checks: `N/A` — sin base de datos
- Integration checks: instalar un paquete privado real con el credencial acuñado; `gcloud secrets
  versions access` para confirmar la forma del `.npmrc`
- Reliability signals/logs: el veredicto del preflight en el artefacto del release; el resultado del
  workflow `axis-credential-expiry`
- Production verification sequence: en §Rollout Plan

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR — `N/A`, la task no crea tablas.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — La expiración se ve antes de promover, y el secreto declara su fecha

- Check nuevo en `scripts/release/production-preflight.ts` que ejecuta la medición del gate existente
  y devuelve `ok` / `warn` / `fail` con causa nombrada, reusando
  `scripts/ci/axis-package-credential-expiry-gate.mjs` como función y no duplicando la lógica de
  parseo del header.
- El check distingue tres estados y **no colapsa dos de ellos**: sano, expirando dentro de la ventana,
  y **no medible** (sin acceso al secreto). "No medible" no puede presentarse como verde: es
  exactamente la forma en que el defecto se escondió.
- Annotations de expiración en el secreto de Secret Manager, escritas por el helper de rotación en el
  mismo paso que publica la versión, para que la fecha nazca junto al dato.
- El helper de rotación deja de ser el procedimiento mensual implícito y se documenta como
  contingencia con fecha y condición de retiro.
- Fila en el runbook de release con el check nuevo y su remediación en una línea.

### Slice 2 — El mecanismo cambia: tokens de instalación de 1 hora, no un PAT de 30 días

- Extender el resolver canónico para acuñar un token de instalación con el scope de lectura de
  paquetes, sin crear un segundo minter.
- Cablear los cuatro `deploy.sh` y `Dockerfile` de worker para que el `.npmrc` se componga en el
  build con el token acuñado, con fallback declarado al PAT durante la ventana de cutover.
- Ejercitar las cuatro builds con el camino nuevo antes de retirar el fallback.
- Retirar el PAT: revocarlo en GitHub y dejar el secreto vacío o eliminado sólo después de que las
  cuatro builds hayan pasado sin fallback, con la fecha registrada.
- `## Delta` en `TASK-1589`, que estableció el contrato que este slice reemplaza.

## Out of Scope

- Rediseñar el preflight de release o el reparto de responsabilidades entre doctor y preflight: eso
  es `TASK-864`. Acá se agrega un check, no se reorganiza el gate.
- Auditar el resto de los secretos del proyecto en busca del mismo patrón de expiración. Es una
  extensión natural y merece su propia task; mezclarla acá diluye el cierre de ésta.
- Cambiar cómo GitHub Actions instala paquetes privados: usa el `GITHUB_TOKEN` del runner y nunca
  toca este credencial.
- El segundo token AXIS vencido el 2026-08-27: se documenta acá como evidencia del patrón, pero su
  remediación pertenece a quien lo posea.

## Detailed Spec

**Por qué el check va en el preflight y no sólo en el schedule semanal.** El watch existente mide
bien y llega tarde por construcción: entre dos corridas hay 7 días y una promoción puede caer en
cualquier punto de esa ventana. El 2026-08-28 cayó justo ahí. Un check en el preflight no reemplaza
al watch —el watch avisa con semanas de anticipación, que es cuando rotar es barato— sino que cierra
el último tramo, donde el costo de enterarse tarde es un release detenido.

**Por qué "no medible" es un estado propio.** El gate actual, sin token, imprime que se omitió y sale
`0`. Para un workflow semanal eso es correcto: no tiene sentido hacer ruido por algo que no puede
medir. Para un preflight de promoción NO lo es: un `0` indistinguible del sano es precisamente la
forma en que un gate deja de significar algo. El check del Slice 1 debe poder decir "no pude medir" y
que eso tenga una consecuencia declarada.

**Por qué el token de instalación elimina la clase y no sólo el caso.** Un PAT clásico es un secreto
con fecha de muerte que nadie recuerda; su vida útil depende de que una persona actúe a tiempo, cada
mes, para siempre. Un token de instalación se acuña al momento desde una private key que no expira,
vive una hora y no requiere que nadie recuerde nada. La diferencia no es de higiene: es que el modo
de falla desaparece del sistema en vez de quedar mitigado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (visibilidad) → Slice 2 (cambio de mecanismo). El orden importa: mientras el mecanismo siga
  siendo un PAT, el check del Slice 1 es la única defensa, y tiene que existir antes de que la
  próxima fecha de expiración llegue.
- 🔴 **El Slice 2 no puede empezar sin el permiso `packages` concedido en la App.** No es una
  preferencia de secuencia: sin ese permiso el minteo devuelve un token que no puede leer paquetes, y
  la primera evidencia sería una build rota.
- 🔴 **El PAT no se revoca antes de que las cuatro builds hayan pasado con el mecanismo nuevo.**
  Revocar primero convierte cualquier defecto del cutover en el mismo incidente que esta task existe
  para cerrar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El credencial vuelve a vencer antes de que el Slice 2 aterrice | cron / release | **high** (fecha conocida, ~30 días desde la rotación del 2026-08-29) | Check del Slice 1 en el preflight + watch semanal + annotation de expiración en el secreto | fallo del check de preflight y del workflow `axis-credential-expiry` |
| El check nuevo sale verde sin haber medido nada | release | medium | Estado "no medible" separado de "sano", con consecuencia declarada; prueba que ejercita el camino sin acceso al secreto | el propio check reporta el estado, no lo calla |
| El cutover al token de instalación rompe las builds de los cuatro workers | cron / worker | medium | Fallback al PAT durante la ventana + ejercicio de las cuatro builds antes de retirarlo | `ERR_PNPM_FETCH_401` en el build de cualquier worker |
| El valor del credencial se filtra a un log o artefacto de CI | secrets | medium | Sólo se manipula fecha y veredicto; `umask 077` y borrado con `trap` como ya hace el workflow existente | revisión del diff y de la salida del job |
| El permiso `packages` nunca se concede y el Slice 2 queda huérfano | release | medium | El Slice 1 es entregable por sí solo y deja el sistema mejor que hoy; el Slice 2 se declara bloqueado con dueño en vez de quedar como intención | esta task sigue `in-progress` con el bloqueo nombrado |

### Feature flags / cutover

- Sin flag de aplicación: nada de esto corre en el portal. El control de cutover del Slice 2 es la
  presencia del fallback al PAT en el build, que se retira en un commit propio y fechado.
- El Slice 1 entra sin flag: es un check, y su peor modo de falla es avisar de más.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — check de preflight + annotations | revert PR; las annotations son metadata aditiva y pueden quedarse | <10 min | sí |
| Slice 2 — token de instalación en los builds | restaurar el fallback al PAT y redeployar los workers afectados; por eso el PAT no se revoca hasta el final | <30 min | sí, mientras el PAT siga vivo |

### Production verification sequence

1. Ejecutar el check del Slice 1 contra el credencial vigente y confirmar que reporta la fecha real
   que GitHub devuelve, no una escrita a mano.
2. Ejecutar el mismo check sin acceso al secreto y confirmar que reporta **no medible** y no verde.
3. Escribir las annotations de expiración y leerlas de vuelta desde Secret Manager.
4. Con el permiso `packages` concedido: acuñar un token de instalación e instalar un paquete privado
   real con él, fuera de cualquier build.
5. Cutover en un solo worker (`artifact-worker`, el que no participó del incidente) con fallback
   activo; build verde.
6. Extender a los tres restantes; las cuatro builds verdes con el mecanismo nuevo.
7. Retirar el fallback, revocar el PAT y registrar la fecha.
8. Confirmar en la siguiente corrida del watch semanal que el estado reportado corresponde al
   mecanismo nuevo.

### Out-of-band coordination required

- 🔴 **Owner de la organización GitHub**: conceder el permiso de lectura de `packages` a la App
  `greenhouse-release-watchdog` (`app_id=3665723`). Es la única acción que un agente no puede
  ejecutar y de la que depende todo el Slice 2.
- **GCP**: acceso del service account de Cloud Build a la private key de la App en Secret Manager.
- **Operador**: aviso antes de retirar el fallback, porque el paso siguiente es revocar un credencial
  que hoy sostiene cuatro builds.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `scripts/release/production-preflight.ts` incluye un check del credencial AXIS que falla la
      promoción cuando el credencial está expirado o expira dentro de la ventana declarada.
- [ ] El check distingue **tres** estados —sano, expirando, no medible— y el estado "no medible"
      nunca se presenta como verde, con una prueba que lo ejercita sin acceso al secreto.
- [ ] El check reusa `scripts/ci/axis-package-credential-expiry-gate.mjs` como función: no existe una
      segunda implementación del parseo del header de expiración.
- [ ] El secreto `axis-packages-read-token` tiene annotations con su fecha de expiración, escritas
      por el helper de rotación en el mismo paso que publica la versión.
- [ ] El runbook de release documenta el check nuevo y su remediación.
- [ ] `resolveGithubAppInstallationToken` acuña un token con lectura de paquetes y **no** existe un
      segundo minter de tokens de la App en el repo.
- [ ] Las builds de los cuatro workers instalan paquetes privados con el token acuñado, verificadas
      una a una, con el fallback al PAT ya retirado.
- [ ] El PAT quedó revocado en GitHub y la fecha de revocación está registrada.
- [ ] Ninguna salida de CI, artefacto ni log expone el valor del credencial, comprobado sobre la
      corrida real del preflight y de las cuatro builds.
- [ ] `TASK-1589` recibió su `## Delta` con el cambio de mecanismo del contrato que estableció.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ci/__tests__`
- Ejecución directa del gate contra un token con expiración conocida y contra la ausencia de token
- Corrida real del preflight de release con el check nuevo
- Build real de los cuatro workers con el mecanismo nuevo
- `pnpm task:lint --task TASK-1794` y `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-864` recibió nota de acople: si su `release:doctor` aterriza, el check de este credencial
      se aloja ahí en vez de vivir suelto en el preflight.

## Follow-ups

- Auditar el resto de los secretos de larga vida del proyecto buscando el mismo patrón: credencial
  con expiración y sin dueño ni señal. Dos vencimientos en dos días consecutivos sugieren que este no
  es el único.
- Evaluar si el estado "no medible" merece ser un estado de primera clase de todo el preflight y no
  sólo de este check: un gate que no puede medir y sale verde es la forma general del defecto.

## Open Questions

- **Umbral de falla del preflight.** El gate usa `WARN_DAYS=21` / `FAIL_DAYS=7`. Para un check de
  promoción, 7 días puede ser generoso: un release que sale con 6 días de vida útil deja el problema
  para la semana siguiente. Confirmar con el operador si el preflight usa un umbral propio más
  estricto que el del watch semanal.
- **Destino final del secreto.** Una vez retirado el PAT, ¿se elimina el secreto o se conserva vacío
  como marca de que el camino existió? Conservarlo documenta la historia; eliminarlo evita que
  alguien lo repueble sin leer esta task.
