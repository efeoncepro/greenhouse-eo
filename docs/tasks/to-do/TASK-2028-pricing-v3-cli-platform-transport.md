# TASK-2028 — Pricing V3 CLI platform transport and parity gate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|platform`
- Blocked by: `TASK-2024, TASK-2026, TASK-2027`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fase 5 de `EPIC-053`. La CLI `pnpm pricing:v3` gana una capa de transporte: cada comando corre en local sobre archivos
(lo de hoy, intacto) o contra la API de plataforma del cotizador, con los mismos archivos de entrada, el mismo JSON de
salida, los mismos códigos de salida (`0/2/3/1`) y los mismos errores tipados. Trae diagnóstico de conexión, registro
de una cotización hecha en local, un comando de paridad permanente y la skill y el manual al día. El modo por defecto
sigue siendo LOCAL durante toda la task y cambia una sola vez, como último paso de aceptación, con la paridad en verde.

## Why This Task Exists

Con esta CLI se cotiza y se arman licitaciones todos los días, y los agentes la van a seguir usando como instrumento
principal cuando el programa termine. Las fases 3 y 4 (`TASK-2026`, `TASK-2027`) dejan una API que calcula y registra,
pero nadie la usa hasta que el instrumento de siempre hable con ella. Hacerlo mal tiene dos costos concretos: una CLI
que deja de funcionar ante cualquier caída de red, o una que cae a local sin avisar y produce cotizaciones que parecen
registradas y no lo están. La decisión aceptada fija la salida: un motor, dos transportes, modo local permanente, cambio
de modo por defecto una sola vez y con paridad medida, y ningún respaldo silencioso.

## Goal

- Cada comando de la tabla de esta task corre por los dos transportes con salida idéntica byte a byte, mismo exit code y
  mismo error tipado.
- Un agente sin sesión interactiva opera el modo plataforma —cotiza, registra, emite y retira dentro de política— con
  un token de consumidor que nunca se imprime ni se escribe en el repo; una persona ejecuta los dos actos humanos
  (aprobar una excepción bajo el piso y, desde `TASK-2029`, activar el catálogo) con inicio de sesión propio.
- Una cotización hecha en local se registra en la plataforma sin recalcularla a mano.
- La paridad queda como comando permanente, cableada donde ya se corren chequeos.
- El modo local no se retira, no se degrada y no queda condicionado a nada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` (Accepted; puntos 1, 7, 8, 9, 10, las
  reglas duras y «Delta 2026-10-12 — decisiones del CEO», que manda sobre lo que esta task decía antes).
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` — **la sección 4 es el contrato que protege la
  CLI** y es la puerta de esta task.
- `docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md` (exit codes `0/2/3/1`, errores tipados,
  `runNotices`, `--out` siempre es una cotización calculada).
- `docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md` (registro cerrado de
  motores; un artefacto congelado se verifica recalculándolo).
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` (puntero `--current`).
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (carriles `app` y `ecosystem`, sobre de respuesta,
  cabecera de versión, idempotencia).
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (protección de Vercel en staging; una sesión de agente no es
  aprobación humana).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

Reglas obligatorias:

- **NUNCA** retirar, degradar ni condicionar el modo local. Ningún comando local pasa a necesitar red, credencial o
  variable de entorno que hoy no necesita.
- **NUNCA** un respaldo silencioso de plataforma a local. Pedido el modo plataforma, una API que no responde es un error
  tipado con exit `1`.
- **NUNCA** calcular en la capa de transporte: serializa entradas, llama y reproduce la salida. Las fórmulas viven en
  `src/lib/finance/pricing-v3/**`.
- **NUNCA** reintentar una mutación de forma automática. La clave de idempotencia se imprime en stderr **antes** de
  enviar el pedido.
- **NUNCA** imprimir, registrar en logs ni escribir en el repo un token, una cabecera de autorización o el secreto de
  bypass de Vercel.
- **NUNCA** enviar a la API un piso, un costo, una organización dueña o un estado tomados de un archivo de quien
  llama: las fuentes (catálogo, policy, créditos) viajan como referencia por versión y huella, y la dueña la pone el
  servidor (Efeonce siempre). La organización destinataria sí viaja, como contenido que el servidor valida.
- **NUNCA** que un agente ejecute un acto humano. Son dos: aprobar una excepción bajo el piso (esta task) y mover el
  puntero del catálogo (`TASK-2029`); exigen inicio de sesión de una persona por el carril de aplicación.
- **NUNCA** pedir una persona para lo que la decisión deja al agente: emitir y retirar una cotización que está dentro
  de política corren con el token de consumidor, sin aprobación.
- **SIEMPRE** que esta task toque el motor o su entorno, los artefactos congelados del repo se recalculan idénticos y
  `pnpm pricing:v3:test` queda en verde.
- El cambio de modo por defecto ocurre una sola vez, al final, y se revierte con un cambio de una línea.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md` y `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/documentation/finance/cotizador-v3-promocion-canonica.md` (lo que la adaptación debe preservar; el adaptador
  reporta el `code` del registro cerrado y no mantiene lista propia).
- `data/pricing/v3-operating/README.md`.
- Contrato de agente: `.claude/skills/efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md`.
- Manual: `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md`.
- Precedente de CLI sobre una API: `docs/manual-de-uso/marketing-studio/operar-por-cli-api.md` y
  `scripts/marketing-studio/{cli,client}.mjs` (token por entorno, archivo `0600` o Secret Manager; ejecución en seco;
  clave de idempotencia impresa; sin reintento de mutaciones; `redirect: 'error'`).
- Precedente de acto humano desde una CLI: `scripts/globe-credit-funding.ts` (PKCE por loopback sobre el carril de
  aplicación, token en memoria, confirmación en terminal) y `scripts/seed-globe-admin-cli-oauth.ts`.
- Acceso programático a staging: `scripts/lib/vercel-staging-access.mjs`, `scripts/staging-request.mjs`.
- Provisión de un consumidor de ecosistema: `scripts/api-platform/provision-mcp-gateway-seo-consumer.ts`.

## Dependencies & Impact

### Depends on

- `TASK-2024` — puerto de almacenamiento y adaptador de archivos: la CLI ya lee y escribe a través del puerto, y existe
  el arnés de conformidad. Esta task no vuelve a tocar el acceso a disco.
- `TASK-2025` — catálogo reflejado en la base por huella y puntero con historial (sólo como hecho que la API sirve).
- `TASK-2026` — API de cálculo en `/api/platform/{app,ecosystem}/quoter/**`: lecturas de catálogo, scaffold, plan,
  prepare, simular y lecturas de una cotización, con paridad en staging.
- `TASK-2027` — API de registro: cotizaciones, versiones, registro de un artefacto local, datos del documento, ciclo de
  vida (emitir y retirar por los dos carriles; aprobar una excepción sólo por persona) y numeración.
- Un consumidor de ecosistema con binding activo para la CLI y un cliente OAuth para el inicio de sesión de personas
  (los crea esta task si las fases 3 y 4 no los dejaron; ver Slice 3).

### Blocks / Impacts

- `TASK-2029` — los comandos de mantenimiento de catálogo y de puntero ganan modo plataforma sobre esta capa.
- `TASK-2030` — las herramientas MCP reutilizan los mismos contratos de ruta que esta task ejercita.
- `TASK-2017` (economía, en curso) y cualquier trabajo que edite `scripts/commercial/pricing-v3.ts`: coordinación
  serial sobre ese archivo.
- Skills `efeonce-pricing-operator` y `greenhouse-public-private-tenders` (consumer): sus recetas citan comandos de la
  CLI.
- Si un contrato de `TASK-2026` o `TASK-2027` no trae lo que esta task necesita (ver «Requisitos sobre la API» en
  Detailed Spec), se deja un `## Delta` y el criterio exigible en esas tasks; esta task **no crea rutas de API**.

### Files owned

- `scripts/commercial/pricing-v3.ts` (edición; archivo compartido con `TASK-2024`, que cierra antes).
- `scripts/commercial/pricing-v3/**` (nuevo propuesto: `transport/`, `auth/`, `commands/`, `__tests__/`).
- `src/lib/finance/pricing-v3/errors.ts` (sólo códigos nuevos del grupo de adaptador en el registro cerrado) y
  `src/lib/finance/pricing-v3/__tests__/pricing-v3-errors.test.ts`.
- `src/lib/finance/pricing-v3/__tests__/pricing-v3-transport-parity.test.ts` (nuevo propuesto; capa de paridad sin red).
- `scripts/api-platform/provision-quoter-cli-consumer.ts` y `scripts/seed-quoter-cli-oauth.ts` (nuevos propuestos, sólo
  si hacen falta).
- `package.json` (scripts `pricing:v3:parity` y los que haga falta; edición mínima de un archivo compartido).
- `.claude/skills/efeonce-pricing-operator/{SKILL.md,references/cotizador-v3-agent-workflow.md}` y su espejo
  `.codex/skills/efeonce-pricing-operator/**`.
- `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md`, `data/pricing/v3-operating/README.md`,
  `docs/documentation/finance/cotizador-v3-superficie-implementada.md`.
- `docs/operations/runbooks/production-release.md` (sólo el paso de paridad).

## Current Repo State

### Already exists

- `scripts/commercial/pricing-v3.ts` (1.204 líneas): un único bloque que parsea argumentos con una lista cerrada de
  flags, lee con `readJson`, escribe con `writeNew` (exclusivo, `0600`), resuelve `--current` contra
  `data/pricing/v3-operating/current.json`, despacha por comando y serializa con `JSON.stringify(value, null, 2)`.
  Errores a stderr como `{ error: { code, message, option?, allowed?, issues? }, binding: false }` con exit `1`.
- Comandos: `calculate`, `validate`, `explain`, `replay`, `compare`, `export`, `prepare`, `quote`,
  `resources budget|inspect|portfolio|preview|apply`,
  `compose workload|scaffold|plan|prepare|quote|assess|preview|split|schedule|cash|commitments|document|increment`,
  `catalog search|show|validate|preview|apply`, `current show|set`.
- Motor sin acceso a disco ni a red: `src/lib/finance/pricing-v3/**` importa sólo módulos relativos, `decimal.js`, `zod`
  y `node:crypto`. Errores en `src/lib/finance/pricing-v3/errors.ts` (registro cerrado, grupos dominio y adaptador).
- Guarda de artefactos congelados: `src/lib/finance/pricing-v3/__tests__/pricing-v3-frozen-artifacts.test.ts` (48
  `*.artifact.json` bajo `data/pricing/**` y `docs/commercial/**` al 2026-10-12).
- Suite `pnpm pricing:v3:test` (`vitest run src/lib/finance/pricing-v3/__tests__`).
- Precedentes citados en Normative Docs.

### Gap

- La CLI no tiene noción de transporte, de perfil de entorno ni de credencial.
- No hay comando de diagnóstico, de registro ni de paridad.
- No existe un consumidor de ecosistema propio de la CLI: reutilizar el del gateway MCP mezclaría dos principales en la
  tabla de idempotencia y auditoría, que se indexa por principal.
- El carril de ecosistema no se puede ejercitar en `localhost` (falla al cargar la instrumentación): la prueba real del
  transporte necesita staging.
- La skill y el manual describen sólo el modo local.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/commercial/pricing-v3.ts` y `scripts/commercial/pricing-v3/**`, ejecutados con `tsx` en la máquina del operador o del agente; ninguna parte corre en Vercel ni en un worker.
- Future candidate home: `remain-shared`
- Boundary: la CLI consume dos contratos y no define ninguno: el motor `src/lib/finance/pricing-v3/**` en modo local y las rutas `/api/platform/{app,ecosystem}/quoter/**` de TASK-2026 y TASK-2027 en modo plataforma. Consumers autorizados de la capa de transporte: sólo la CLI y sus pruebas.
- Server/browser split: no aplica a una herramienta de terminal; nada de `scripts/commercial/pricing-v3/**` puede ser alcanzable desde una ruta (`pnpm vercel:reachability-gate` lo tiene en su lista de exclusión).
- Build impact: ninguna dependencia nueva; `fetch`, `node:http` y `node:crypto` de Node 24. El acceso a `gcloud` es por proceso hijo, como en `scripts/marketing-studio/cli.mjs`.
- Extraction blocker: la CLI importa el motor por ruta relativa desde `src/lib/finance/pricing-v3/**`; extraerla exige publicar el motor como paquete, que no se autoriza aquí.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: ninguno cambia de dueño. El registro de cotizaciones es de `TASK-2027`; el catálogo sigue mandando desde el repo hasta `TASK-2029`.
- Consumidores afectados: el operador y los agentes que usan `pnpm pricing:v3`; las skills `efeonce-pricing-operator` y `greenhouse-public-private-tenders`.
- Runtime target: máquina local contra staging (`.vercel.app` con bypass) y contra producción (`greenhouse.efeoncepro.com`).

### Contract surface

- Contrato existente a respetar: salida, exit codes y errores de la CLI (`GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md`); sobre y cabeceras de la API de plataforma (`src/lib/api-platform/core/{responses,versioning,commands}.ts`).
- Contrato nuevo o modificado: flags y variables de transporte, comandos `doctor`, `parity` y `registry`, y códigos nuevos del grupo de adaptador en `errors.ts`.
- Backward compatibility: compatible. Sin flag ni variable, cada comando existente produce los mismos bytes que antes de esta task hasta el cambio de modo por defecto, que es el último paso y es reversible.
- Full API parity: la CLI es un cliente más de los commands y readers de `src/lib/commercial/quoter/**`; no lleva lógica que la API no tenga, y lo que la API no expone queda declarado como sólo local con su razón.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla nueva. Escribe filas a través de la API en las tablas `greenhouse_commercial.quoter_*` de `TASK-2025`/`TASK-2027` y en `greenhouse_core.api_platform_command_executions`; puede crear una fila de consumidor y su binding en `greenhouse_core.sister_platform_consumers`.
- Invariantes que no se pueden romper:
  - Mismo comando y mismas entradas ⇒ mismo stdout, mismo exit code y, si falla, mismo `code` por los dos transportes.
  - `--out` de un comando que congela una cotización contiene siempre una cotización calculada y verificada en local antes de escribirse.
  - El comando de paridad no registra nada: usa sólo rutas sin estado.
  - Una cotización se registra sólo si la API la recalcula con las versiones que el artefacto nombra y la huella coincide.
- Write-target allowlist: no aplica a la CLI; las tablas las declara el dominio en `TASK-2025`/`TASK-2027`.
- Tenant/space boundary: la organización dueña es siempre Efeonce y la resuelve el servidor; la CLI nunca la envía. La organización destinataria es contenido de la cotización que quien cotiza nombra de forma explícita al crear o registrar, y el servidor la valida; no se lee de un archivo de entrada. Los parámetros de alcance que el carril exige salen del perfil de entorno.
- Idempotency/concurrency: cabecera `Idempotency-Key` en toda mutación; clave derivada del contenido por defecto y `--key` para fijarla; sin reintento automático; ante resultado dudoso, error tipado que devuelve la clave para repetir el mismo pedido.
- Audit/outbox/history: los produce la API. La CLI imprime en stderr el `requestId` de cada llamada para poder buscarla.

### Migration, backfill and rollout

- Migration posture: none en esta task. La provisión del consumidor usa el script de provisión, no una migración.
- Default state: modo local por defecto; modo plataforma sólo por pedido explícito hasta el último paso.
- Backfill plan: ninguno. Las cotizaciones locales previas se registran una a una con `registry register`, a pedido del operador.
- Rollback path: volver la constante de modo por defecto a `local` (una línea) o exportar `PRICING_V3_TRANSPORT=local`; revocar el token del consumidor.
- External coordination: provisión del consumidor y del secreto en Secret Manager, siembra del cliente OAuth, y la señal del operador para el cambio de modo por defecto.

### Security and access

- Auth/access gate: token de consumidor de ecosistema para el agente, con el que también emite y retira; bearer delegado de una persona, obtenido por PKCE en loopback, para los dos actos humanos y para quien quiera operar como persona.
- Sensitive data posture: las salidas internas llevan costo y margen igual que hoy; los archivos nuevos nacen `0600` y nunca se sobrescriben. Tokens y secreto de bypass sólo en memoria.
- Error contract: el `code` del registro cerrado de `PricingV3Error` que la API devuelve en `details.code` se imprime tal cual; los fallos del transporte usan códigos nuevos del grupo de adaptador. Nunca se copia un mensaje del servidor, una ruta ni un valor recibido.
- Abuse/rate-limit posture: límites por consumidor de la API; la paridad corre en serie y respeta las cabeceras de límite.

### Runtime evidence

- Local checks: `pnpm pricing:v3:test` (incluye la paridad sin red y la caracterización del modo local), `pnpm local:check`.
- DB/runtime checks: lectura de la cotización registrada por la API después de `registry register` (identificador, versión, huella).
- Integration checks: `pnpm pricing:v3 doctor` y `pnpm pricing:v3:parity` contra staging y contra producción.
- Reliability signals/logs: `requestId` por llamada; las señales del registro son de `TASK-2027`.
- Production verification sequence: la de «Rollout Plan & Risk Matrix».

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Esta task no crea tablas; si la provisión del consumidor necesita un destino de escritura nuevo, queda declarado con su justificación en el mismo cambio.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Caracterización del modo local

- Antes de mover una línea de la CLI: un corpus de invocaciones reales (todos los ejemplos y artefactos versionados bajo
  `data/pricing/**` y `docs/commercial/**`, más los rechazos documentados) con su stdout, stderr, exit code y bytes de
  `--out` capturados.
- Prueba en `pnpm pricing:v3:test` que compara cada invocación contra su captura. Si `TASK-2024` ya dejó un arnés
  equivalente, se extiende en vez de duplicarlo.
- Entregable: el corpus y la prueba en verde sobre la CLI sin cambios.

### Slice 2 — Capa de transporte y selección de modo

- Extraer el despacho de la CLI a operaciones con una interfaz única: entradas ya leídas → salida a imprimir, exit code
  y, si corresponde, contenido de `--out`. El transporte local envuelve exactamente el código de hoy.
- Selección de modo: `--transport local|platform`, variable `PRICING_V3_TRANSPORT`, perfil `--profile` /
  `PRICING_V3_PROFILE`. Tabla de transportes admitidos por comando como constante única.
- Códigos nuevos del grupo de adaptador en `src/lib/finance/pricing-v3/errors.ts` y su prueba.
- Bloque `transport` en la salida de ayuda (`pnpm --silent pricing:v3`).
- Entregable: la caracterización del Slice 1 sigue idéntica; sin flag, ningún comando abre un socket.

### Slice 3 — Credenciales, perfiles y diagnóstico

- Fuente de credencial del consumidor (variable de entorno, archivo `0600`, Secret Manager), exactamente una por
  ejecución, con redacción en toda salida.
- Inicio de sesión de persona por PKCE en loopback para el carril de aplicación.
- Perfiles `staging` y `production`, y bypass de Vercel sólo hacia orígenes de staging.
- Provisión del consumidor y del cliente OAuth si no existen.
- Comando `doctor`.

### Slice 4 — Transporte de plataforma para cálculo y lecturas

- Implementar el transporte de plataforma para cada fila «sí» de la tabla comando por comando que depende de
  `TASK-2026`.
- Verificación local del artefacto devuelto antes de escribir `--out`.
- Mapeo de la respuesta de la API a stdout, exit code y error tipado.

### Slice 5 — Registro y actos humanos

- Grupo `registry`: crear una cotización o una versión desde una demanda, registrar un artefacto local, guardar los
  textos del documento, las lecturas del registro, emitir y retirar (agente o persona, sin aprobación) y el acto
  humano de `TASK-2027`: aprobar una excepción bajo el piso (sólo persona).
- Clave de idempotencia impresa antes del pedido; sin reintentos; manejo de resultado dudoso.

### Slice 6 — Paridad permanente

- Capa sin red dentro de `pnpm pricing:v3:test`.
- Comando en vivo `pnpm pricing:v3:parity`.
- Cableado en los tres lugares que define Detailed Spec.

### Slice 7 — Skill, manual y aceptación con un agente nuevo

- Procedimiento del modo plataforma en la referencia de la skill y en el manual; espejo `.claude` ↔ `.codex`.
- Aceptación: un agente sin contexto, sólo con la skill y el manual, cotiza y registra un negocio real por la API.

### Slice 8 — Cambio del modo por defecto

- Con todo lo anterior en verde y la señal del operador: cambiar la constante de modo por defecto a `platform` para los
  comandos que tienen modo plataforma. Es el último commit de la task.

## Out of Scope

- Crear, cambiar o versionar rutas de la API (`TASK-2026`, `TASK-2027`).
- Mantenimiento de catálogo y puntero por la API: `catalog preview|apply`, `resources preview|apply` y `current set`
  quedan sólo locales hasta `TASK-2029`.
- Herramientas MCP (`TASK-2030`), interfaz y render del PDF en producción (el PDF se sigue generando en local con
  `scripts/documents/render-cotizacion-a4.mjs`).
- Cambiar el motor, sus contratos de entrada, sus cifras o la forma de un artefacto.
- Guardar tokens de persona en disco, o un flujo de credenciales que ponga la contraseña de alguien en un agente.
- Retirar o tocar el cotizador actual (`greenhouse_commercial.quotations*`, herramientas V2).
- Ejecutar git por cuenta de la CLI, o hacer commit o push como parte de un comando.

## Detailed Spec

### 1. Selección del modo

Orden de resolución, de mayor a menor: flag `--transport` → variable `PRICING_V3_TRANSPORT` → modo por defecto del
comando.

| Situación | Resultado |
| --- | --- |
| Sin flag ni variable | El modo por defecto del comando. Durante toda la task es `local`. |
| `--transport local` | Local, siempre disponible, sin red ni credencial. |
| `--transport platform` en un comando con modo plataforma | Plataforma; si no hay perfil o credencial, error tipado y exit `1`. |
| `--transport platform` en un comando sólo local | Error tipado `TRANSPORT_NOT_SUPPORTED`, exit `1`. No se ejecuta nada. |
| `PRICING_V3_TRANSPORT=platform` (o modo por defecto `platform`) en un comando sólo local | Corre en local, que es su único modo, y lo dice en una línea JSON en stderr. No es un respaldo: el comando no tiene otro modo. |
| Modo plataforma y la API no responde, responde 5xx o cierra la conexión | Error tipado `TRANSPORT_UNREACHABLE`, exit `1`. Nunca se recalcula en local. |
| Comando sólo de plataforma (`registry`, `doctor`, `parity`) con `--transport local` | Error tipado `TRANSPORT_NOT_SUPPORTED`, exit `1`. |

- En modo plataforma la CLI escribe en stderr, antes del resultado, una línea JSON con `transport`, el origen del perfil
  y el `requestId`. **Stdout no cambia**: es lo que la paridad compara.
- Perfil de entorno: `--profile staging|production` o `PRICING_V3_PROFILE`. `production` →
  `https://greenhouse.efeoncepro.com`. `staging` → la URL `.vercel.app` de staging que resuelve
  `scripts/lib/vercel-staging-access.mjs`. Un origen distinto se da con `GREENHOUSE_API_BASE_URL`; HTTP sólo en
  `localhost`. Sin perfil en modo plataforma: error tipado, nunca un perfil implícito.
- Los nombres de flags y variables de esta sección son la propuesta de la task; si Discovery encuentra una convención
  distinta en las fases 3 y 4, manda la convención y se registra en un `## Delta`.

### 2. Tabla comando por comando

«Sí» significa que el comando gana modo plataforma en esta task, **siempre que la ruta exista** en `TASK-2026` o
`TASK-2027`. Si en Discovery la ruta no existe, el comando queda sólo local, con la razón escrita en la tabla de la CLI
y un `## Delta` en la task dueña de la ruta.

| Comando | Modo plataforma en esta task | Depende de | Nota |
| --- | --- | --- | --- |
| `help` (sin argumentos) | no aplica | — | Local; describe los dos modos. |
| `calculate`, `validate` | no, por regla | — | La entrada trae su propio snapshot de costos: la API no acepta costos de quien llama. Sólo local, de forma permanente. |
| `prepare`, `quote` (camino de brief con catálogo del piloto) | no | — | `TASK-2026` no les da ruta. Sólo local. |
| `compare`, `export` | no | — | `TASK-2026` no les da ruta. Sólo local. |
| `catalog validate`, `resources portfolio`, `resources budget` | no | — | `TASK-2026` no les da ruta. Sólo local. |
| `current show` | sí | `TASK-2026` | En plataforma lee el puntero activo de la plataforma y su verificación; en local, el del repo. |
| `catalog search`, `catalog show` | sí | `TASK-2026` | Lecturas del catálogo reflejado. |
| `resources inspect` | sí | `TASK-2026` | Lectura con `priceReview` y huellas. |
| `compose workload` | sí | `TASK-2026` | Sin fuentes de catálogo. |
| `compose scaffold`, `plan`, `prepare`, `quote` | sí | `TASK-2026` | `--out` escribe lo que la API devuelve; un artefacto se verifica en local antes de escribirse. `compose quote` simula: no registra. |
| `explain`, `replay` | sí | `TASK-2026` | `replay` local es además la verificación cruzada de todo lo que devuelve la API. |
| `compose assess`, `preview`, `split`, `schedule`, `cash`, `commitments`, `increment` | sí | `TASK-2026` | Lecturas de un artefacto congelado: se envía el artefacto y la API lo verifica antes de leerlo. |
| `compose document` | sí | `TASK-2026` | Lectura sobre un artefacto. Los datos con número y versión de una cotización registrada salen de `registry document`. |
| `catalog preview`, `apply` | no | `TASK-2029` | Mantenimiento: el repo es la autoridad. |
| `resources preview`, `apply` | no | `TASK-2029` | Mantenimiento: el repo es la autoridad. |
| `current set` | no | `TASK-2029` | Mover el puntero es el otro acto humano: gana modo plataforma, sólo para una persona, en `TASK-2029`. |
| `doctor` (nuevo) | sólo plataforma | `TASK-2026` | Diagnóstico de conexión. |
| `parity` (nuevo) | los dos a la vez | `TASK-2026` | Compara los dos transportes. |
| `registry create`, `add-version` (nuevos) | sólo plataforma | `TASK-2027` (filas 1 y 2) | La API recalcula la demanda y guarda la versión. |
| `registry register` (nuevo) | sólo plataforma | `TASK-2027` (filas 3 y 4) | Registra un artefacto local como cotización nueva o, con `--quote`, como versión nueva. |
| `registry document-texts` (nuevo) | sólo plataforma | `TASK-2027` (fila 5) | Guarda los textos del documento de una versión. |
| `registry list`, `show`, `version`, `replay`, `preview`, `document`, `history` (nuevos) | sólo plataforma | `TASK-2027` (filas 10 a 16) | Lecturas del registro. |
| `registry issue`, `withdraw` (nuevos) | sólo plataforma; agente o persona | `TASK-2027` (filas 8 y 9) | Emiten y retiran con el token de consumidor, sin aprobación de una persona. La API rechaza una versión bajo el piso sin su excepción aprobada. |
| `registry approve-exception` (nuevo) | sólo plataforma, sólo persona | `TASK-2027` (fila 7) | Acto humano: inicio de sesión de persona y confirmación en terminal. |

Las diecinueve operaciones con ruta son las de la tabla de operaciones de `TASK-2026`; si esa tabla cambia, manda ella.
Si la aceptación del Slice 7 demuestra que un comando sólo local hace falta por la API, entra como `## Delta` de
`TASK-2026` con su fila; no se resuelve dentro de la CLI.

### 3. Fuentes en modo plataforma

- `--current` significa el puntero vigente **de la plataforma**. La respuesta trae las versiones y huellas usadas.
- `--catalog`, `--policy` y `--credits` con un archivo: la CLI calcula versión y huella del archivo con el parser del
  comando y envía sólo esa referencia. Si la plataforma no tiene reflejado ese documento, el comando termina con
  `TRANSPORT_SOURCE_NOT_MIRRORED` y exit `1`. El contenido del archivo nunca se sube.
- La API no tiene el comportamiento «sin `--current`» de la CLI: toda llamada nombra o hereda versiones gobernadas.
  Para que el mismo comando dé lo mismo, sin `--current` ni flag la CLI fija por huella exactamente lo que habría leído
  en local (la baseline histórica del catálogo); `--policy` y `--credits` siguen siendo obligatorios y su ausencia es el
  mismo `MISSING_ARGUMENT` de hoy, resuelto antes de llamar.
- Las entradas que no son fuentes (`--input`, `--brief`, `--base`, `--milestones`, `--option`, `--increment`) viajan
  como documento en la clave del cuerpo que lleva el nombre de la opción, como define `TASK-2026`.
- Mientras el repo sea la autoridad, `doctor` y `parity` comparan la huella del puntero del repo con la del puntero
  reflejado y fallan si difieren: dos transportes con punteros distintos no son comparables.

### 4. Salida, exit codes y errores

- En modo plataforma el stdout es `data.result` de la respuesta, serializado con la misma función de la CLI. La CLI no
  reordena ni completa campos.
- `runNotices.output` describe lo que pasó con `--out`. `TASK-2026` lo devuelve dentro de `result` como si la CLI se
  hubiera ejecutado con `--out`; la CLI lo conserva sólo cuando el operador pasó `--out` y lo ajusta a lo que hizo de
  verdad en disco. La paridad cubre los dos casos, con y sin `--out`.
- Exit codes: `0`, `2` y `3` salen de `meta.exitCode` de la respuesta (los tres son HTTP 200); `1` es toda respuesta de
  error. La paridad comprueba que coinciden con el criterio local. Para los comandos nuevos: `doctor` → `0` conforme, `2` falta configuración, `1` falla;
  `parity` → `0` idéntico, `1` cualquier diferencia; `registry register` → `3` mientras la cotización registrada siga
  en revisión; lecturas del registro → `0`; emisión, retiro o acto humano completado → `0`.
- Errores: una respuesta de error de la API con `details.code` de `PricingV3Error` se imprime con ese mismo `code` y sus
  `issues` (`path`, `rule`), más `details.option` cuando la respuesta nombra la entrada a corregir. Los demás fallos usan códigos
  nuevos del grupo de adaptador. Propuesta de nombres, a cerrar contra `pricing-v3-errors.test.ts`:
  `TRANSPORT_NOT_SUPPORTED`, `TRANSPORT_CONFIG_INVALID`, `TRANSPORT_UNREACHABLE`, `TRANSPORT_UNAUTHENTICATED`,
  `TRANSPORT_FORBIDDEN`, `TRANSPORT_CONTRACT_MISMATCH`, `TRANSPORT_SOURCE_NOT_MIRRORED`,
  `TRANSPORT_AMBIGUOUS_OUTCOME`, `TRANSPORT_HUMAN_SESSION_REQUIRED`, `TRANSPORT_PARITY_MISMATCH`.
- El mensaje del error sigue siendo el texto estático de hoy.

### 5. `--out` y verificación cruzada

- En modo plataforma, `--out` de `quote`, `compose prepare|quote` escribe el artefacto congelado que devuelve la API.
  Antes de escribir, la CLI lo recalcula con las funciones puras de replay del motor; si la huella no coincide no
  escribe nada y termina con `REPLAY_MISMATCH`.
- Un artefacto escrito así se verifica después con `pnpm --silent pricing:v3 replay --input <archivo> --transport
  local`, sin red: el artefacto lleva sus fuentes dentro.
- Reglas de hoy sin cambio: `--out` exclusivo y `0600`; una corrida que no calcula no escribe nada y lo dice en
  `runNotices.output`; `--keep-blocked` mantiene su significado.

### 6. Registro de una cotización hecha en local

- `registry register --input <artefacto> [--quote <id>] [--key <clave>]`: la CLI verifica el artefacto en local, exige
  que esté calculado y lo envía. La API lo recalcula con las versiones que nombra y lo registra sólo si la huella
  coincide.
- Rechazos esperados, cada uno con su código: artefacto bloqueado, versión de catálogo no reflejada, huella distinta,
  motor no registrado.
- Sin `--quote` crea la cotización con su primera versión; con `--quote` agrega una versión que reemplaza a la anterior.
- Al crear una cotización (`registry create`, y `registry register` sin `--quote`), `--client-organization <id>` nombra
  la organización destinataria. Es contenido que el servidor valida, no alcance: opcional en un borrador y
  obligatoria para emitir, y como la identidad de la cotización es inmutable se declara en ese momento (`TASK-2027`,
  «Organización»). La dueña no se envía nunca.
- Calcular por la API **no registra**: registrar es siempre un paso aparte y explícito, una mutación por comando.
- Hay una sola base para staging y producción: registrar contra staging escribe en las mismas tablas que producción.
  Las pruebas de registro en staging usan `data_origin = 'synthetic'` (`TASK-2025`), que tiene secuencia de número
  propia; sin ese marcador no se hacen registros de prueba.

### 7. Autenticación

Agente sin sesión interactiva (carril de ecosistema):

- Token de consumidor en `Authorization: Bearer`. Exactamente una fuente por ejecución: variable de entorno
  `PRICING_V3_API_TOKEN`; `--token-file` (archivo del usuario, permisos `0600`, fuera del repo); o `--token-secret
  <nombre> --project <proyecto>`, que lee la versión vigente de Secret Manager con la identidad `gcloud` del momento y
  la mantiene en memoria.
- El token nunca es un argumento, nunca se imprime, nunca va a un archivo del repo ni a `.env.local`, y no aparece en
  mensajes de error. Un archivo de token dentro del árbol del repo se rechaza.
- Consumidor y binding propios de la CLI. Si las fases 3 y 4 no los crearon, esta task los provee con un script sobre el
  precedente de `scripts/api-platform/provision-mcp-gateway-seo-consumer.ts`; el token se muestra una vez y va a Secret
  Manager como escalar crudo (`printf %s … | gcloud secrets versions add … --data-file=-`).
- Los parámetros de alcance que exige el carril salen del perfil, no de los archivos de entrada.
- Con ese token el agente cotiza, registra, guarda los textos del documento, emite y retira: la API lo modela como
  sujeto máquina con rol `efeonce_account`, que tiene la capacidad de emitir (`TASK-2025`, «Identidad de agente»). Lo
  único que la API le niega son los dos actos humanos.

Persona (carril de aplicación):

- Inicio de sesión por PKCE en loopback, como `scripts/globe-credit-funding.ts`: navegador, escucha en
  `127.0.0.1:<puerto aleatorio>`, intercambio del código, token en memoria durante la ejecución, nada en disco.
- Obligatorio para los dos actos humanos (`registry approve-exception` aquí; `current set` en `TASK-2029`); opcional
  (`--sign-in`) para quien quiera cotizar, registrar o emitir como persona.
- **Decisión tomada (CEO, 2026-10-12).** Ese inicio de sesión produce un bearer `sister_platform_oauth` y es el
  mecanismo aceptado para los dos actos humanos mientras no exista interfaz: la compuerta de `TASK-2027` lo admite
  cuando lo emite el cliente OAuth de la CLI para una persona, nunca para una sesión de agente. `registry
  approve-exception` se construye en esta task. La alternativa de sesión de primera parte (`POST
  /api/platform/app/sessions`, correo y contraseña) no se adopta: los usuarios internos entran por SSO y poner una
  contraseña en una terminal operada por agentes es lo que la política prohíbe.
- Un acto humano pide además confirmación en la terminal mostrando qué se va a hacer. Sin terminal interactiva termina
  con `TRANSPORT_HUMAN_SESSION_REQUIRED`.
- Una sesión de `/api/auth/agent-session` no se usa para actos humanos: la API la rechaza y en producción ese endpoint
  responde `403`.

### 8. Mutaciones

- Toda mutación lleva `Idempotency-Key`. Por defecto la clave se deriva del contenido (huella del artefacto y destino),
  de modo que repetir el mismo comando devuelve el mismo resultado; `--key` la fija a mano.
- La clave se escribe en stderr **antes** de enviar.
- Sin reintento automático de mutaciones, con cualquier error. Un timeout o una conexión cortada después de enviar
  termina con `TRANSPORT_AMBIGUOUS_OUTCOME` y la clave, y la instrucción es repetir con la misma clave.
- `redirect: 'error'` en toda llamada con credencial. Las lecturas sin estado pueden reintentarse hasta dos veces ante
  fallos de red o `502/503/504`, nunca ante `4xx`.

### 9. `doctor`

Comprueba, en orden, y reporta cada paso con `ok`/`falla` y su código: perfil y origen resueltos; fuente de credencial
presente (sin mostrarla); alcance del bypass de staging; respuesta de la API y versión de contrato (`x-greenhouse-api-version`);
identidad del consumidor aceptada y negativa esperada sin token (`401`); versiones del registro de motores del servidor
iguales a las locales; huella del puntero reflejado igual a la del repo. No prueba permisos de escritura ni registra
nada.

### 10. Protección de Vercel en staging

- El dominio propio de staging tiene SSO. El acceso programático usa la URL `.vercel.app` con la cabecera
  `x-vercel-protection-bypass`, resuelta con `resolveBypassSecret` (entorno → `.env.local` → API de Vercel).
- La cabecera se envía **sólo** a orígenes de staging de Greenhouse. Nunca a producción ni a terceros.
- `VERCEL_AUTOMATION_BYPASS_SECRET` es gestionada por Vercel: no se crea a mano.
- El inicio de sesión de persona en staging pasa por el SSO en el navegador, como cualquier visita.

### 11. Paridad

- **Capa sin red**, en `pnpm pricing:v3:test`: cada ejemplo y cada artefacto versionado pasa por la interfaz de
  transporte en los dos modos, con el transporte de plataforma ligado en proceso a las mismas operaciones de servidor
  que exponen las rutas, sobre el adaptador de archivos de `TASK-2024`. Compara huellas, stdout, exit code y error. Si
  esas operaciones no se pueden invocar sin HTTP ni base, se declara el límite y esta capa cubre serialización y mapeo.
- **Capa en vivo**, `pnpm pricing:v3:parity --profile <perfil>`: lo mismo contra la API desplegada, en serie. El corpus
  es el de la corrida de paridad de `TASK-2026` (demandas, planes, dimensionamientos, briefs, briefs de documento y
  artefactos bajo `data/pricing/v3-operating/`, más los ejemplos de la skill), recorrido por descubrimiento del sistema
  de archivos, nunca por una lista escrita a mano; falla si un artefacto no tiene caso. Usa sólo rutas sin estado.
  La diferencia con la corrida de `TASK-2026` es que aquí cada caso pasa por **la CLI real** en sus dos modos, con sus
  flags, su `--out` y su stderr.
- La comparación es de bytes. Si un campo no es determinista, se corrige o se decide; no se enmascara.
- **Dónde queda cableada**: (a) la capa sin red, en `pnpm pricing:v3:test`, que ya es puerta de toda entrega del
  programa; (b) la capa en vivo, como paso de verificación posterior al despliegue en
  `docs/operations/runbooks/production-release.md` y en la lista de la skill `greenhouse-production-release`; (c) como
  evidencia exigida por `pnpm qa:gates --changed` cuando el diff toca `src/lib/finance/pricing-v3/**`,
  `src/lib/commercial/quoter/**` o `scripts/commercial/pricing-v3*` (confirmar en Discovery cómo declara reglas ese
  comando).

### 12. Requisitos sobre la API (para verificar en Discovery)

Ya previstos por `TASK-2026` y que esta task consume tal cual: claves del cuerpo con el nombre de la opción de la CLI,
`details.option` con el mismo significado en los dos transportes, fuentes fijadas por huella, `meta.exitCode`,
`meta.versionsUsed` y `GET /versions/current`.

Pendientes de confirmar; si faltan, van como `## Delta` con su criterio exigible a la task dueña:

- Una lectura de las versiones del registro de motores que sirve el despliegue (`doctor` la compara con las locales).
- Que el carril de aplicación acepte el bearer delegado de una persona para los dos actos humanos: decidido el
  2026-10-12 y recogido en `TASK-2027` (ver sección 7). Falta sólo comprobar que la ruta lo implementa así.
- Que emitir y retirar tengan ruta en el carril de ecosistema y admitan el token de consumidor (`TASK-2027`, filas 8
  y 9).
- Cómo marca quien llama una cotización como sintética (`data_origin = 'synthetic'` de `TASK-2025`, con su secuencia
  propia) para las pruebas de registro en staging.
- El límite de tamaño del cuerpo: el artefacto más grande del repo mide cerca de 2,5 MB. Un `413` se traduce a un error
  tipado propio, nunca a `TRANSPORT_UNREACHABLE`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6 → Slice 7 → Slice 8.
- El Slice 1 se cierra antes de editar la CLI: sin caracterización no hay forma de probar que el modo local no cambió.
- El Slice 5 no empieza sin el marcador de origen sintético disponible para las pruebas de registro.
- El Slice 8 es el último commit y exige: paridad sin red en verde, paridad en vivo en verde contra producción,
  aceptación del Slice 7 hecha y la señal del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El refactor altera la salida del modo local | CLI | medium | Caracterización del Slice 1 como puerta de cada commit; guarda de artefactos congelados | `pnpm pricing:v3:test` en rojo |
| La API calcula distinto que la CLI | motor / API | low | Mismo código; paridad sin red y en vivo; verificación local antes de `--out` | `TRANSPORT_PARITY_MISMATCH`, `REPLAY_MISMATCH` |
| Una caída de red deja al operador sin herramienta | CLI | medium | Modo local intacto y siempre seleccionable; error claro en vez de respaldo | `TRANSPORT_UNREACHABLE` |
| Una cotización parece registrada y no lo está | registro | low | Sin respaldo silencioso; registrar es un comando aparte que devuelve identificador, versión y huella | salida de `registry register` sin identificador |
| Doble registro por reintento | registro | low | Clave derivada del contenido, impresa antes; sin reintentos; resultado dudoso tipado | `TRANSPORT_AMBIGUOUS_OUTCOME` |
| Fuga de un token o del secreto de bypass | identidad | low | Una sola fuente, en memoria, redacción, rechazo de archivos dentro del repo, prueba de que ninguna salida lo contiene | prueba de redacción en rojo |
| Un agente ejecuta uno de los dos actos humanos (aprobar una excepción, mover el puntero) | registro | low | Carril de aplicación con persona; confirmación en terminal; la API rechaza sesión de agente y token de consumidor | `TRANSPORT_HUMAN_SESSION_REQUIRED` |
| Un agente emite durante una prueba una cotización que no es sintética y consume un número real | base compartida | medium | La emisión de prueba se hace sólo sobre cotizaciones sintéticas, que toman número de su propia serie; la paridad no emite; `data_origin` lo decide la API, no la CLI | número real asignado durante una prueba |
| Registros de prueba mezclados con reales | base compartida | medium | Marcador de origen sintético obligatorio; la paridad no registra | filas sin marcador creadas durante una prueba |
| Punteros distintos entre repo y plataforma | catálogo | medium | `doctor` y `parity` comparan huellas y fallan | paso de puntero de `doctor` en falla |

### Feature flags / cutover

- No se agrega una variable `*_ENABLED`. El interruptor de esta fase es el modo por defecto de la CLI: una constante en
  el código, más `PRICING_V3_TRANSPORT` para fijarlo por entorno. Si la ejecución introduce una variable `*_ENABLED`,
  lleva su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo cambio.
- Las banderas del lado servidor son de `TASK-2026` y `TASK-2027`; `doctor` reporta de forma legible cuando la API
  responde que una capacidad está apagada.
- Cutover: un commit que cambia la constante. Reversa: el commit inverso, o `PRICING_V3_TRANSPORT=local` de inmediato y
  sin despliegue.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el commit; sólo agrega pruebas | minutos | sí |
| Slice 2 | Revertir el commit; la caracterización confirma que la CLI vuelve a su forma previa | minutos | sí |
| Slice 3 | Revertir el commit; revocar el token del consumidor y deshabilitar el cliente OAuth | menos de una hora | sí |
| Slice 4 | Revertir el commit; el modo local nunca dependió de él | minutos | sí |
| Slice 5 | Revertir el commit; las cotizaciones ya registradas se conservan y se corrigen con una versión nueva | minutos | parcial: lo registrado no se borra |
| Slice 6 | Revertir el commit y el paso del runbook | minutos | sí |
| Slice 7 | Revertir los documentos; la cotización real registrada se conserva | minutos | parcial: lo registrado no se borra |
| Slice 8 | Commit inverso de la constante, o `PRICING_V3_TRANSPORT=local` sin esperar despliegue | inmediato | sí |

### Production verification sequence

1. Local: caracterización y paridad sin red en verde; `pnpm local:check`.
2. Staging: `doctor` conforme; `pnpm pricing:v3:parity --profile staging` en verde; un registro sintético con su
   marcador, leído de vuelta, y su repetición con la misma clave devolviendo lo mismo. Con el mismo token de
   consumidor, `registry issue` sobre esa cotización sintética: recibe número de la serie sintética sin intervención
   de una persona.
3. Staging: una negativa por cada caso (sin token, token revocado, fuente no reflejada, artefacto bloqueado, aprobar
   una excepción sin persona, emitir una versión bajo el piso sin su aprobación).
4. Producción, después del release que publica las rutas: `doctor` conforme y `pnpm pricing:v3:parity --profile
   production` en verde.
5. Producción: aceptación del Slice 7 con un negocio real.
6. Señal del operador y Slice 8. Verificar después que `pnpm --silent pricing:v3 … --transport local` sigue dando los
   bytes de la caracterización.

### Out-of-band coordination required

- Alta del consumidor de ecosistema y de su secreto en Secret Manager, con permiso de lectura para quien opere la CLI.
- Siembra del cliente OAuth para el inicio de sesión de personas.
- Release de Greenhouse que deja las rutas en `main`, por el control plane, antes del paso 4.
- Señal explícita del operador para el Slice 8 y aviso a los agentes que usan la CLI el día del cambio.
- Avisar a las sesiones que editen `scripts/commercial/pricing-v3.ts` antes de empezar el Slice 2.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un corpus de caracterización del modo local y, al cierre, cada invocación con `--transport local` produce
      los mismos bytes de stdout, stderr y `--out`, y el mismo exit code, que antes de esta task.
- [ ] Sin `--transport`, sin `PRICING_V3_TRANSPORT` y antes del Slice 8, ningún comando existente abre una conexión de
      red (probado).
- [ ] Ningún comando local exige una credencial, un perfil o una variable de entorno nueva.
- [ ] La tabla de transportes por comando es una constante única; la ayuda de la CLI la imprime y coincide con la tabla
      de esta task o con el `## Delta` que la corrija.
- [ ] `calculate` y `validate` no tienen modo plataforma y `--transport platform` sobre ellos responde
      `TRANSPORT_NOT_SUPPORTED` con exit `1`; lo mismo cada comando sólo local de la tabla.
- [ ] Las diecinueve operaciones con ruta en `TASK-2026` tienen modo plataforma en la CLI, o la diferencia está escrita
      con su razón.
- [ ] Con el modo plataforma pedido y la API inalcanzable, el comando termina con `TRANSPORT_UNREACHABLE` y exit `1`, y
      una prueba demuestra que no se ejecutó la operación local.
- [ ] Cada comando con modo plataforma devuelve, para cada caso del corpus, el mismo stdout, el mismo exit code y, en
      los rechazos, el mismo `code` que en local.
- [ ] `--out` en modo plataforma escribe un artefacto que `replay --transport local` verifica; un artefacto devuelto con
      huella alterada no se escribe y termina con `REPLAY_MISMATCH`.
- [ ] Una fuente pasada por archivo viaja como versión y huella; una prueba demuestra que el contenido del archivo no
      está en el cuerpo del pedido.
- [ ] `registry register` registra un artefacto local calculado y devuelve identificador, versión y huella (el número
      público se asigna al emitir); repetir el comando devuelve el mismo registro; un artefacto bloqueado, uno con huella alterada y uno con una versión no reflejada se rechazan
      con su código.
- [ ] Calcular por la API no crea filas en el registro (comprobado leyendo el registro antes y después).
- [ ] Toda mutación imprime su clave de idempotencia en stderr antes del pedido y ninguna se reintenta sola; un corte
      después de enviar termina con `TRANSPORT_AMBIGUOUS_OUTCOME` y la clave.
- [ ] El token de consumidor se acepta desde variable de entorno, archivo `0600` y Secret Manager; dos fuentes a la vez,
      un archivo con otros permisos o un archivo dentro del repo se rechazan.
- [ ] Una prueba recorre stdout, stderr y los archivos escritos de todas las rutas de error y confirma que ni el token
      ni el secreto de bypass aparecen.
- [ ] `registry issue` y `registry withdraw` corren con el token de consumidor, sin inicio de sesión ni confirmación de
      una persona: un agente emite una cotización sintética que está dentro de política y recibe su número; una
      versión bajo el piso sin excepción aprobada se rechaza con el código de la API.
- [ ] `registry approve-exception` exige inicio de sesión de persona y confirmación en terminal; con token de
      consumidor o sin terminal interactiva se rechaza con `TRANSPORT_HUMAN_SESSION_REQUIRED`.
- [ ] La cabecera de bypass de Vercel se envía sólo a orígenes de staging (probado con un origen de producción y uno de
      terceros).
- [ ] `pnpm pricing:v3 doctor` reporta cada comprobación de la sección 9 y falla cuando el puntero reflejado difiere del
      del repo.
- [ ] La paridad sin red corre dentro de `pnpm pricing:v3:test` y cubre todos los `*.artifact.json` encontrados por
      búsqueda; agregar un artefacto sin caso la pone en rojo.
- [ ] `pnpm pricing:v3:parity` contra staging y contra producción termina en `0`, y se vio fallar con una diferencia
      provocada.
- [ ] La paridad en vivo no deja filas en el registro.
- [ ] El paso de paridad figura en `docs/operations/runbooks/production-release.md` y en la lista de la skill
      `greenhouse-production-release`, y `pnpm qa:gates --changed` la exige para los caminos de la sección 11.
- [ ] La referencia de la skill y el manual traen el modo plataforma como procedimiento (elegir modo, credencial,
      `doctor`, cotizar, registrar, emitir y retirar, los dos actos humanos, qué hacer ante cada error de transporte);
      `pnpm skills:mirrors` en verde.
- [ ] Un agente sin contexto, sólo con la skill y el manual, cotizó y registró un negocio real de punta a punta por la
      API sin leer código fuente; sus dudas quedaron resueltas en los documentos.
- [ ] El modo por defecto cambió a `platform` en un único commit final, con las cuatro condiciones del Slice 8
      registradas, y `--transport local` sigue funcionando después.
- [ ] `pnpm pricing:v3:test` en verde y todos los artefactos congelados se recalculan idénticos.

## Verification

- `pnpm task:lint --task TASK-2028`
- `pnpm pricing:v3:test`
- `pnpm local:check`
- `pnpm skills:mirrors`
- `pnpm pricing:v3 doctor --profile staging` y `--profile production`
- `pnpm pricing:v3:parity --profile staging` y `--profile production`
- `pnpm qa:gates --changed` y `pnpm docs:closure-check`
- `pnpm test` completo y `pnpm build` como puerta de cierre; el build pide autorización del operador en esta máquina.
- Después de editar contexto o handoff: `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Documentación técnica: el contrato de transporte, la tabla comando por comando y los códigos de error nuevos
      quedan en la arquitectura del cotizador (documento de `EPIC-053`) y como `## Delta` en
      `GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md`.
- [ ] Documentación funcional: `docs/documentation/finance/cotizador-v3-superficie-implementada.md` dice qué opera por
      la API y qué sigue sólo local.
- [ ] Manual: `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md` y la referencia de la skill, con espejo.
- [ ] `EPIC-053` actualizada; `TASK-2029` y `TASK-2030` desbloqueadas.
- [ ] El estado se reporta como «code complete, rollout pendiente» mientras falte la paridad en producción, la
      aceptación con agente nuevo o el Slice 8.

## Follow-ups

- `TASK-2029`: modo plataforma para `catalog preview|apply`, `resources preview|apply` y `current set`, y exportación al
  repo.
- `TASK-2030`: herramientas MCP sobre las mismas rutas.
- Registrar en lote las cotizaciones locales previas, si el operador lo pide.
- Render del PDF en producción: fase de interfaz de `EPIC-053`.

## Open Questions

- ¿El cambio de modo por defecto alcanza a las lecturas de un artefacto local (`explain`, `compose assess`, etc.) o sólo
  a los comandos que cotizan? La propuesta de esta task es todos los comandos con modo plataforma; el operador puede
  preferir que las lecturas de un archivo local sigan en local por defecto para trabajar sin conexión.
- ¿Qué perfil rige cuando el modo por defecto pasa a `platform`: `production` implícito o perfil siempre explícito? La
  propuesta es exigirlo por `PRICING_V3_PROFILE`, sin perfil implícito.
- ¿Quién opera el alta del consumidor y dónde vive su secreto (nombre y proyecto)?
- ¿Un agente puede pedir datos de documento con número antes de la emisión, o sólo el borrador?

Resueltas por el CEO el 2026-10-12 (ya no abiertas): el bearer delegado de una persona se admite para los dos actos
humanos mientras no exista interfaz; emitir y retirar no son actos de persona y un agente los ejecuta con su token
de consumidor.
