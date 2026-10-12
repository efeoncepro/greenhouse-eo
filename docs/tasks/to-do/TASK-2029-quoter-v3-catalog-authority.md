# TASK-2029 — Quoter V3 catalog authority on the platform

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|platform`
- Blocked by: `TASK-2028`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fase 6 de `EPIC-053`. Hasta esta task el repo es la autoridad del catálogo y la base lo refleja por huella. Esta task
invierte la autoridad: el cambio de catálogo, de política de recursos y de catálogo de créditos (change-set → revisión →
aplicar → activar el puntero) se hace por la API, con las mismas huellas de confirmación que la CLI usa hoy, control de
concurrencia, auditoría y una mutación por llamada. La CLI gana el modo plataforma en sus comandos de catálogo y de
puntero, y una exportación devuelve al repo la versión vigente para que el modo local y la guarda de artefactos
congelados sigan funcionando sin conexión.

## Why This Task Exists

Dos personas no pueden cambiar un catálogo con control de concurrencia sobre git, y los archivos `wx`/`0600` y las
huellas locales no resuelven autoridad, concurrencia ni auditoría de empresa por sí solos. Mientras el repo mande, un
cambio de precio es un commit que cualquiera con el checkout puede hacer y que la plataforma sólo conoce cuando alguien
corre el importador. La decisión aceptada lo resuelve en dos pasos: primero espejo (hecho en `TASK-2025`), después
autoridad en la plataforma con copia al repo. Este es el segundo paso, y se hace con la CLI ya conectada porque el
mantenimiento del catálogo se opera con ella.

## Goal

- Revisar, aplicar y activar por la API, cada uno con su huella de confirmación: huella base, huella de la revisión y
  huella del puntero que se reemplaza.
- Aplicar nunca activa. Activar es un acto humano, sólo para `efeonce_admin` y `finance_admin`.
- El impacto sobre cotizaciones guardadas se informa y nunca se aplica: ninguna cotización guardada se recalcula ni
  cambia de versión.
- `catalog preview|apply`, `resources preview|apply` y `current set` de la CLI operan en modo plataforma.
- Una exportación escribe en el repo la versión aplicada y el puntero; el modo local sigue completo sin red.
- Queda definido y probado el camino de vuelta: el repo como autoridad otra vez.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` (Accepted; puntos 5, 6 y 7 y las reglas
  duras).
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` (D5, fase 6, sección 4).
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` — **el contrato de mantenimiento que
  esta task traslada sin cambiarlo**: change-sets `add/replace/retire`, reemplazo íntegro de política y créditos,
  `baseDigest`, huella de revisión, puntero verificado, reglas duras de secuencia (`contingency_reserve`).
- `docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md` y
  `docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (comandos con idempotencia, carriles, errores).
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` y
  `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`.

Reglas obligatorias:

- **NUNCA** editar o borrar una versión del catálogo, de la política o de los créditos: cada versión es inmutable y es
  el padre de las cotizaciones que se calcularon con ella.
- **NUNCA** que aplicar active. Mover el puntero es otra llamada, otra huella y otra persona posible.
- **NUNCA** que un agente active el puntero: no existe ruta de activación en el carril de ecosistema, y una sesión de
  agente no cuenta como persona.
- **NUNCA** recalcular, actualizar ni cambiar de versión una cotización guardada como efecto de un cambio de catálogo.
  El impacto es un informe.
- **NUNCA** resolver «lo vigente» por convención (número más alto, última fila aplicada): lo vigente es el puntero
  verificado.
- **NUNCA** dos autoridades a la vez: mientras mande la plataforma el importador repo → base no escribe; mientras mande
  el repo las rutas de mutación de catálogo no escriben.
- **NUNCA** calcular la revisión o el sucesor fuera del motor: las funciones `previewCatalogChange`,
  `applyCatalogChange`, `previewResourceChange`, `applyResourceChange` y `buildCurrentVersions` de
  `src/lib/finance/pricing-v3/**` son las únicas que deciden qué cambia.
- **SIEMPRE** una mutación por llamada, con clave de idempotencia, huella del pedido, auditoría y evento en una
  transacción.
- **SIEMPRE** capacidad nueva con su permiso otorgado a un rol real en el mismo cambio; los únicos roles que activan son
  `efeonce_admin` y `finance_admin`.
- **SIEMPRE** migraciones que sólo agregan: hay una sola instancia para desarrollo, staging y producción.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md` y `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/documentation/finance/cotizador-v3-promocion-canonica.md` (el mantenimiento necesita command, auditoría y
  bloqueo optimista equivalentes en servidor).
- `data/pricing/v3-operating/README.md` y `data/pricing/v3-resources/README.md`.
- `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md` (sección «Actualizar valores sin alterar cotizaciones
  anteriores»).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- Precedente de acto humano desde una CLI: `scripts/globe-credit-funding.ts`.

## Dependencies & Impact

### Depends on

- `TASK-2028` — capa de transporte de la CLI, credenciales, inicio de sesión de persona y comando de paridad.
- `TASK-2025` — `greenhouse_commercial.quoter_source_documents` (documentos por rol y huella, con `parent_digest` y
  origen `repo_import | platform_apply`), `quoter_pointer_history` (con `previous_pointer_digest`, origen
  `repo_mirror | platform_activation` y `activated_by_member_id` obligatorio), vista `quoter_current_pointer`,
  capacidades `commercial.quoter.catalog` (`read`, `update`) y `commercial.quoter.catalog.activate` (`execute`), eventos
  `commercial.quoter.source_document.stored` y `commercial.quoter.pointer.activated`, y el importador
  `scripts/commercial/quoter-import.ts` (`pnpm quoter:import`).
- `TASK-2026` — lecturas del catálogo y `GET /versions/current`; puerta única `src/lib/commercial/quoter/authz.ts`.
- `TASK-2027` — registro de cotizaciones, que esta task sólo lee para informar impacto.
- `TASK-2024` — puerto de almacenamiento con sus dos adaptadores.

### Blocks / Impacts

- Fase de interfaz de `EPIC-053`: las pantallas de catálogo consumirán estos comandos.
- `TASK-2030`: las herramientas MCP **no** exponen la activación; si exponen revisión o lectura de versiones, lo hacen
  sobre estas rutas.
- `TASK-2017` (economía, en curso) y cualquier trabajo que emita versiones de catálogo en el repo: desde el cambio de
  autoridad, una versión nueva nace en la plataforma. Coordinación obligatoria antes del Slice 6.
- Importador de `TASK-2025`: cambia de «la forma de poblar» a «verificación y camino de vuelta».
- Prueba `src/lib/finance/pricing-v3/__tests__/pricing-v3-current-versions.test.ts`: su afirmación se conserva; cambia
  quién escribe los archivos que comprueba.

### Files owned

- `src/lib/commercial/quoter/catalog/**` (nuevo propuesto: comandos de revisar, aplicar y activar, lector de impacto,
  exportación).
- `src/lib/api-platform/resources/{app,ecosystem}-quoter-catalog*.ts` (nuevos propuestos; adaptadores finos).
- `src/app/api/platform/app/quoter/{catalog,resources,versions}/**` y
  `src/app/api/platform/ecosystem/quoter/{catalog,resources}/**` (sólo las rutas de mutación y de exportación de esta
  task; las de lectura son de `TASK-2026`).
- `src/lib/commercial/quoter/flags.ts` y `src/lib/commercial/quoter/authz.ts` (edición: una bandera y las necesidades
  de esta task).
- `migrations/**` (migración que sólo agrega, creada con `pnpm migrate:create`, si hace falta registro de autoridad,
  restricciones o capacidades).
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` (sólo si `TASK-2025` no sembró las
  capacidades de esta task).
- `scripts/commercial/pricing-v3.ts` y `scripts/commercial/pricing-v3/**` (modo plataforma de los comandos de catálogo
  y puntero; comando de exportación).
- `scripts/commercial/quoter-import.ts` (importador de `TASK-2025`; sólo la guarda de autoridad y el modo de
  verificación).
- `data/pricing/v3-operating/**` y `data/pricing/v3-resources/**` (sólo los archivos que escribe la exportación del
  cambio real de la aceptación).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila de la bandera).
- Skill `efeonce-pricing-operator` (con espejo), manual y documentación funcional del cotizador.

## Current Repo State

### Already exists

- Mantenimiento local completo en la CLI: `catalog preview|apply` (`previewCatalogChange`, `applyCatalogChange`),
  `resources preview|apply` (`src/lib/finance/pricing-v3/adapters/resource-maintenance.ts`), `current show|set`
  (`src/lib/finance/pricing-v3/adapters/current-versions.ts`: `currentVersionsDigest`, `verifyCurrentVersions`,
  `resolveCurrentSource`, `buildCurrentVersions`).
- Confirmaciones de hoy: `apply --confirm <previewDigest>` y `current set --confirm <pointerDigest>`; rechazo
  `CURRENT_VERSIONS_CONFLICT`; `apply` exige ruta nueva y no activa.
- Puntero `data/pricing/v3-operating/current.json` (`pricing-v3-current/1`): catálogo y política en su versión 11 y
  créditos en su versión 1, cada uno con ruta, versión y huella.
- Guarda `pricing-v3-current-versions.test.ts`: el puntero coincide con los archivos que nombra y nombra la versión de
  número más alto de cada familia.
- Trece clases de registro en el catálogo monetario, cada una con la identidad que una revisión no puede cambiar
  (`CATALOG_IDENTITY_CONFLICT`).

### Gap

- Ninguna mutación de catálogo existe en servidor: no hay comando, ruta, auditoría ni bloqueo de concurrencia.
- No hay un hecho único que diga quién manda (repo o plataforma), ni guarda que impida que el importador pise a la
  plataforma.
- No existe exportación de la plataforma al repo.
- Nada informa qué cotizaciones guardadas nombran la versión que se va a reemplazar.
- Las tablas, capacidades y el importador de `TASK-2025` son propuestas hasta que esa task cierre: sus nombres exactos
  se confirman en Discovery y manda lo que haya materializado.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/commercial/quoter/catalog/**` y rutas bajo `src/app/api/platform/{app,ecosystem}/quoter/**`, servidas por el portal Next.js en Vercel; el lado cliente vive en `scripts/commercial/pricing-v3/**`.
- Future candidate home: `domain-package`
- Boundary: comandos `preview`, `apply` y `activate` y lector de impacto del agregado de catálogo del cotizador; consumers autorizados: rutas de plataforma de los dos carriles, la CLI y, más adelante, la interfaz. El cálculo del cambio pertenece al motor `src/lib/finance/pricing-v3/**`.
- Server/browser split: comandos, almacén, autorización y secretos sólo en servidor; el motor sigue siendo puro y apto para navegador; ningún import de interfaz ni de tema en `src/lib/commercial/quoter/**`.
- Build impact: ninguna dependencia nueva y ninguna lectura de archivos del repo en tiempo de ejecución; la exportación escribe archivos sólo desde la CLI.
- Extraction blocker: la transacción comparte base con el registro de cotizaciones y con la tabla de idempotencia de la plataforma; la autorización depende de `src/lib/entitlements/runtime.ts`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: catálogo monetario, política de recursos, catálogo de créditos y puntero de versiones vigentes; pasan de los archivos del repo a las tablas `greenhouse_commercial.quoter_*` de `TASK-2025`.
- Consumidores afectados: la CLI en sus dos modos, la API de cálculo de `TASK-2026`, el registro de `TASK-2027`, el importador de `TASK-2025`, las skills de pricing y de licitaciones.
- Runtime target: Vercel (rutas), máquina local (CLI y exportación), staging y producción sobre la misma base.

### Contract surface

- Contrato existente a respetar: `GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md`; salida y errores de los comandos `catalog`, `resources` y `current` de la CLI; forma común de operación de `TASK-2026` (claves del cuerpo con el nombre de la opción, `data.result`, `meta.exitCode`, `details.option`).
- Contrato nuevo o modificado: rutas de revisar, aplicar, activar y exportar bajo `/api/platform/{app,ecosystem}/quoter/**`; registro de autoridad. Los eventos son los de `TASK-2025` (`commercial.quoter.source_document.stored`, `commercial.quoter.pointer.activated`), publicados ahora también desde estos comandos.
- Backward compatibility: gated. Con la autoridad en `repo` y la bandera apagada el sistema se comporta como al cierre de `TASK-2028`.
- Full API parity: la CLI, la interfaz futura y cualquier agente usan los mismos comandos; la activación tiene camino programático sólo para personas, por decisión.

### Data model and invariants

- Entidades/tablas/views afectadas: escribe en `greenhouse_commercial.quoter_source_documents` (origen `platform_apply`) y en `quoter_pointer_history` (origen `platform_activation`); lee `quoter_current_pointer` y las tablas del registro (`quoter_quotes`, `quoter_quote_versions`); agrega un registro de autoridad de sólo agregar (tabla nueva propuesta con prefijo `quoter_`) y, si no existe, un índice único parcial sobre `(role, parent_digest)`.
- Invariantes que no se pueden romper:
  - Una versión guardada es su texto canónico con su huella, verificada al escribir y al leer; nunca se actualiza ni se borra.
  - Cada versión nombra a su padre por huella y un padre tiene un único sucesor por familia.
  - El puntero vigente nombra tres versiones que existen y cuyas huellas se recalculan iguales; cada fila del historial nombra la huella del puntero que reemplaza y sólo una fila puede reemplazar a un puntero dado.
  - Toda fila de activación tiene una persona como actor y un motivo.
  - Ninguna fila del registro de cotizaciones cambia por una mutación de catálogo.
- Write-target allowlist: las tablas que esta task escribe se declaran con su justificación en el control de frontera del dominio del cotizador, si `TASK-2025` lo creó; si no existe, se deja constancia en el cierre.
- Tenant/space boundary: el catálogo es de Efeonce, no de una organización cliente; la identidad sale del binding o de la sesión y ningún cuerpo trae organización, actor ni estado.
- Idempotency/concurrency: `Idempotency-Key` más huella del pedido; bloqueo optimista por huella (padre para aplicar, puntero reemplazado para activar) respaldado por restricciones únicas en la base, no sólo por una lectura previa.
- Audit/outbox/history: historial de sólo agregar con actor, motivo, huellas y `requestId`; evento en la misma transacción con identificadores, versiones y huellas, nunca con el contenido del catálogo.

### Migration, backfill and rollout

- Migration posture: additive. Sólo si falta el registro de autoridad, alguna restricción única o una capacidad.
- Default state: bandera `QUOTER_CATALOG_WRITES_ENABLED` apagada y autoridad `repo`.
- Backfill plan: ninguno masivo. Antes del cambio de autoridad se verifica que toda versión del repo esté reflejada con la misma huella y que el puntero reflejado coincida con `current.json`.
- Rollback path: nueva fila de autoridad `repo`, bandera apagada, importador habilitado; las versiones aplicadas en la plataforma ya están en el repo por la exportación.
- External coordination: alta de la bandera en Vercel por entorno y sus redeploys; señal del operador para el cambio de autoridad; aviso a quienes emiten versiones en el repo.

### Security and access

- Auth/access gate: puerta única `assertQuoterAccess`; revisar y aplicar con la capacidad de mantenimiento; activar con una capacidad propia otorgada sólo a `efeonce_admin` y `finance_admin`, por el carril de aplicación y con persona.
- Sensitive data posture: el catálogo lleva costos y pisos; audiencia interna en todas las rutas; un tenant cliente recibe 404. Sin datos de nómina.
- Error contract: códigos del registro cerrado de `PricingV3Error` en `details.code`; conflictos de concurrencia y de autoridad con códigos propios; nunca el valor recibido ni un mensaje del parser; `captureWithDomain`.
- Abuse/rate-limit posture: límites del carril; el informe de impacto tiene tope de demandas declaradas (100, como hoy) y de cotizaciones listadas.

### Runtime evidence

- Local checks: pruebas de comandos, de concurrencia y de la exportación; `pnpm pricing:v3:test`.
- DB/runtime checks: la migración se verifica con su bloque de comprobación; las consultas nuevas se ejercitan contra PostgreSQL real; lectura de vuelta de versión, puntero e historial después de cada acto.
- Integration checks: el cambio real de la aceptación por staging y producción; `pnpm pricing:v3:parity` después de exportar.
- Reliability signals/logs: señal propuesta de divergencia entre la autoridad declarada y el último escritor del catálogo; `requestId` por acto.
- Production verification sequence: la de «Rollout Plan & Risk Matrix».

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.
- [ ] Capacidad, registro y permiso a un rol real en el mismo cambio, con `capability-grant-coverage.test.ts` en verde.

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

### Slice 1 — Autoridad declarada y guardas

- Registro de autoridad de sólo agregar (`repo` | `platform`) con actor, motivo y fecha; lector único
  `getQuoterCatalogAuthority()`.
- Bandera `QUOTER_CATALOG_WRITES_ENABLED` en `src/lib/commercial/quoter/flags.ts` y su fila en el libro de banderas.
- Guarda en `pnpm quoter:import`: con autoridad `platform` no escribe y ofrece un modo de sólo verificación.
- Capacidades: se usan las de `TASK-2025` (`commercial.quoter.catalog:update` y
  `commercial.quoter.catalog.activate:execute`). Sólo si faltan se siembran aquí, con registro, catálogo TS y permiso
  en el mismo cambio.
- Índice único parcial sobre `(role, parent_digest)` en `quoter_source_documents`, previa comprobación de que el
  historial importado del repo no tiene dos sucesores del mismo padre; si los tiene, se informa y se decide antes de
  migrar.

### Slice 2 — Revisar y aplicar

- Comandos `previewQuoterCatalogChange` y `applyQuoterCatalogChange` para las tres familias (catálogo monetario por
  change-set; política y créditos por reemplazo íntegro), que llaman a las funciones del motor.
- Rutas en los dos carriles; revisar no escribe; aplicar inserta el sucesor y nada más.

### Slice 3 — Activar el puntero

- Comando `activateQuoterCurrentVersions` y su ruta, **sólo en el carril de aplicación**.
- Guardas en la base: las de `TASK-2025` (`activated_by_member_id` obligatorio; disparador que rechaza una fila cuyo
  `previous_pointer_digest` no es el del puntero vigente). Esta task las ejercita y no las duplica.

### Slice 4 — Informe de impacto

- Lector que, para una revisión o una activación, informa qué cotizaciones guardadas nombran la versión que deja de ser
  vigente, más el antes y después de las demandas declaradas que ya calcula el motor.

### Slice 5 — CLI y exportación

- Modo plataforma de `catalog preview|apply`, `resources preview|apply` y `current set` sobre la capa de `TASK-2028`.
- Comando de exportación de la plataforma al repo.
- Extensión del corpus de paridad a los comandos de mantenimiento.

### Slice 6 — Cambio de autoridad y cambio real de precio

- Verificación previa, cambio de autoridad a `platform`, y un cambio real de precio hecho por la API de punta a punta
  con su copia exportada en el repo.

### Slice 7 — Camino de vuelta y documentación

- Ensayo de la vuelta a `repo` como autoridad en staging.
- Skill, manual y documentación funcional y técnica al día.

## Out of Scope

- Cambiar el motor, las clases de registro del catálogo, las reglas de validación de un change-set o la forma del
  puntero (`pricing-v3-current/1`).
- Tomar decisiones de negocio del catálogo (prorrateo del fee de plataforma, costo de puesta en marcha de un servicio
  gestionado, medición de provisiones): entran como cambios de catálogo cuando el dueño las decida.
- Recalcular, migrar o cambiar de versión cotizaciones guardadas.
- Interfaz de mantenimiento de catálogo, herramientas MCP de mutación de catálogo y el catálogo de servicios del
  cotizador actual (`searchServiceCatalog`, motor V2).
- Borrar versiones, compactar el historial o reescribir archivos de versión ya existentes en el repo.
- Que la exportación haga commit o push: escribe archivos y el operador decide el commit.
- Conectar un lector de nómina o de inventario de licencias como fuente del catálogo.

## Detailed Spec

### 1. Los tres actos y sus huellas

| Acto | Qué confirma quien llama | Qué escribe | Quién | Carril |
| --- | --- | --- | --- | --- |
| Revisar | `baseDigest` de la versión que se cambia y, para política y créditos, las huellas del contexto | nada | agente o persona con la capacidad de mantenimiento | aplicación y ecosistema |
| Aplicar | la huella de la revisión (`confirm`), que el servidor recalcula con el mismo change-set, la misma base y las mismas demandas de impacto | una versión sucesora, inactiva | agente o persona con la capacidad de mantenimiento | aplicación y ecosistema |
| Activar | la huella del puntero que se reemplaza (`confirm`) y un motivo | una fila nueva de puntero | persona con rol `efeonce_admin` o `finance_admin` | sólo aplicación |

- La revisión no se guarda: aplicar la recalcula y compara. Cambiar el change-set, la base, el contexto o las demandas
  de impacto invalida la confirmación, como hoy.
- Aplicar responde con la versión, su huella y `binding: false`; no toca el puntero ni emite un evento de activación.
- Activar toma tres referencias (catálogo, política, créditos) por huella; versión y huella del puntero se calculan con
  `buildCurrentVersions`, no se reciben. Antes de escribir se recalculan las tres huellas desde el texto guardado.
- El documento del puntero (`pricing-v3-current/1`) lleva la ruta de cada fuente relativa al repo y `updatedAt`, y los
  dos entran en su huella. Para que la copia exportada tenga la misma huella que el puntero de la plataforma, la
  activación recibe la ruta de repo de cada fuente (validada contra el nombre de su familia; no es una autoridad, es
  dónde se exportará) y el servidor fija `updatedAt` con el día del calendario operativo (`America/Santiago`). El caso
  de paridad de `current set` entre transportes fija la fecha; confirmar en Discovery que no queda otra entrada
  dependiente del reloj.
- Una mutación por llamada: no existe una ruta que aplique y active, ni una que aplique dos familias.
- Si el operador decide que aplicar también sea sólo de personas, la ruta de ecosistema de aplicar no se publica y el
  resto del diseño no cambia (ver Open Questions).

### 2. Concurrencia

- Aplicar: la versión sucesora nombra a su padre por huella (`parent_digest`). Índice único por rol sobre el padre: dos
  aplicaciones sobre el mismo padre no pueden entrar las dos; la segunda recibe un conflicto tipado y debe revisar de
  nuevo sobre la versión que ganó. La llave `(role, version)` de `TASK-2025` impide además reutilizar un nombre de
  versión.
- Activar: el disparador de `quoter_pointer_history` rechaza una fila que no reemplaza al puntero vigente. Dos
  activaciones simultáneas: una entra, la otra recibe `CURRENT_VERSIONS_CONFLICT`.
- Repetir un pedido con la misma clave de idempotencia y el mismo cuerpo devuelve el mismo resultado; la misma clave
  con otro cuerpo es conflicto de idempotencia.
- Las reglas duras de secuencia del catálogo siguen siendo responsabilidad del motor y del operador (por ejemplo, no
  emitir un registro `contingency_reserve` en una versión que una cotización congelada pueda volver a resolver); el
  informe de impacto las hace visibles antes de activar.

### 3. Autorización

- Necesidades nuevas en la tabla de `src/lib/commercial/quoter/authz.ts`: `catalog_maintain` (revisar y aplicar) →
  `commercial.quoter.catalog:update`, y `catalog_activate` (activar) → `commercial.quoter.catalog.activate:execute`.
  Manda lo que haya materializado `TASK-2025`.
- Consecuencia a decidir: `TASK-2025` otorga `commercial.quoter.catalog:update` a `efeonce_admin` y `finance_admin`. Un
  consumidor de ecosistema no tiene capacidad por persona, así que «un agente aplica» depende de que el binding interno
  de la CLI esté autorizado a esa necesidad (ver Open Questions).
- `catalog_activate` se otorga únicamente a `efeonce_admin` y `finance_admin`. La ruta rechaza: tenant cliente (404),
  sesión de agente, consumidor de ecosistema y persona sin la capacidad (403).
- La base exige actor persona en la fila de activación. La guarda de aplicación y la de la base son dos controles; no
  se quita uno porque exista el otro.
- Quien revisa o aplica no fija pisos ni costos «para una cotización»: propone una versión del catálogo que no rige
  hasta que una persona la activa.

### 4. Versiones aplicadas y nunca activadas

- Una versión aplicada y nunca activada sirve para revisar impacto y para simular por referencia explícita.
- No puede respaldar una cotización registrada. El registro de `TASK-2027` debe exigir que las versiones que nombra un
  artefacto figuren en el historial del puntero. Si `TASK-2027` no trae esa guarda, esta task la agrega **antes** de
  publicar la ruta de aplicar en el carril de ecosistema; de lo contrario, quien aplica una versión podría registrar
  una cotización con costos y pisos que nadie activó.

### 5. Informe de impacto

- En revisar: lo de hoy (antes y después de las demandas declaradas con `--impact`, tope 100), calculado por el motor.
- En revisar y en activar: cuántas cotizaciones guardadas, por estado, nombran cada versión que dejaría de ser vigente,
  y la lista de sus identificadores hasta un tope declarado.
- El informe no lleva importes de cotizaciones guardadas y no dispara ninguna escritura. Una cotización abierta que
  nombra una versión reemplazada sigue reproduciéndose con esa versión; actualizarla es crear una versión nueva de la
  cotización, a mano y por su propio comando.

### 6. CLI

- `catalog preview|apply`, `resources preview|apply` y `current set` pasan a tener modo plataforma en la tabla de
  transportes de `TASK-2028`, con las mismas opciones, la misma salida y los mismos códigos.
- `apply --out` en modo plataforma escribe el sucesor que devuelve la API, verificado por huella en local antes de
  escribirse. La ruta sigue siendo obligatoria y nueva; la regla de hoy se mantiene: un sucesor que todavía no es
  vigente se escribe fuera de las carpetas canónicas.
- `current set` en modo plataforma es un acto humano: inicio de sesión de persona, confirmación en terminal mostrando
  las tres versiones y el motivo. Con token de consumidor se rechaza. Hereda la dependencia abierta de `TASK-2028`
  (sección 7): si el carril de aplicación no admite el bearer delegado de una persona, activar desde la CLI no es
  posible y sólo queda la sesión del portal, que no tiene pantalla hasta la fase 8. Sin esa decisión, el Slice 6 no se
  puede cerrar.
- `current show` en modo plataforma ya existe (`TASK-2026`).
- Con autoridad `platform`, `current set` y `catalog apply` en modo local siguen funcionando: el modo local no se
  condiciona. Lo que cambia es que un puntero local distinto del de la plataforma es divergencia, y `doctor` y la
  paridad la reportan y fallan.

### 7. Exportación al repo

- Comando de la CLI que escribe, desde la plataforma: el archivo de cada versión que nombra el puntero vigente y aún no
  está en el repo, con el nombre de la familia (`catalog.review-vN.json`, `resources.review-vN.json`,
  `ai-credits.review-vN.json`), y el puntero `data/pricing/v3-operating/current.json`.
- Cada archivo se escribe con el texto canónico guardado y se verifica por huella antes y después de escribir. Un
  archivo de versión existente nunca se sobrescribe: si existe con otra huella, la exportación se detiene con error.
- El puntero exportado conserva el esquema `pricing-v3-current/1` (rutas relativas a la raíz del repo, versión, huella,
  `updatedAt`, `reason`) y su huella debe ser igual a la del puntero de la plataforma.
- La exportación de una activación escribe versiones y puntero en un mismo cambio de archivos. No ejecuta git.

### 8. Qué pasa con `current.json` y con la prueba del puntero

- `current.json` deja de ser la autoridad y pasa a ser **la copia exportada del puntero de la plataforma**. Se
  reemplaza con la exportación; `current set` local queda para contingencia y para el camino de vuelta.
- `pricing-v3-current-versions.test.ts` conserva lo que afirma, sin red: el puntero coincide con los archivos que
  nombra y nombra la versión de número más alto de cada familia. Sigue en verde porque la exportación escribe versiones
  y puntero juntos, y porque un sucesor aplicado y no activado no se exporta a las carpetas canónicas.
- El mensaje de la falla de esa prueba cambia: con autoridad `platform` la corrección es exportar, no `current set`.
- La igualdad entre el puntero del repo y el de la plataforma no se puede comprobar sin red: la comprueban `doctor` y
  `pnpm pricing:v3:parity`, que ya están cableados por `TASK-2028`.
- La guarda de artefactos congelados no depende de esta task: cada artefacto lleva sus fuentes dentro.

### 9. Cambio de autoridad y camino de vuelta

Cambio a `platform`:

1. Toda versión de las tres familias presente en el repo está reflejada con la misma huella.
2. El puntero reflejado tiene la huella de `current.json`.
3. Bandera encendida en el entorno y fila de autoridad `platform` con actor y motivo.
4. El importador pasa a sólo verificación.

Vuelta a `repo`:

1. Exportación al día: la huella del puntero del repo es la de la plataforma y toda versión aplicada está exportada.
2. Fila de autoridad `repo` con actor y motivo; bandera apagada.
3. Las rutas de mutación responden con un código propio de autoridad y no escriben; el importador vuelve a escribir.
4. Nada se borra: las versiones y el historial creados en la plataforma se conservan.

La autoridad es un hecho de la base y no una variable de entorno, porque la leen procesos de máquinas distintas (rutas
en Vercel y un importador que corre en la máquina de quien lo ejecuta). La bandera es el freno de las rutas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6 → Slice 7.
- La guarda del importador (Slice 1) se cierra antes de que cualquier ruta de mutación pueda escribir.
- La guarda de la sección 4 de Detailed Spec está en su lugar antes de publicar aplicar en el carril de ecosistema.
- Slice 6 no empieza sin: paridad en verde, las cuatro comprobaciones del cambio a `platform`, y la señal del operador.
- El ensayo de la vuelta (Slice 7) se hace en staging antes de declarar la task completa; puede adelantarse al Slice 6.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Repo y plataforma divergen | catálogo | medium | Una sola autoridad declarada; guarda del importador; `doctor` y paridad comparan punteros | paso de puntero de `doctor` en falla; señal de divergencia de autoridad |
| Una versión activada cambia el precio de cotizaciones guardadas | registro | low | Cada cotización se reproduce con las versiones que nombra; el impacto sólo informa; prueba que compara el registro antes y después | cambio en filas del registro tras una activación |
| Dos personas aplican sobre el mismo padre | catálogo | medium | Restricción única por padre; conflicto tipado | conflicto de versión en la respuesta |
| Un agente activa el puntero | catálogo | low | Sin ruta en ecosistema; rechazo de sesión de agente; actor persona exigido por la base | intento rechazado en auditoría |
| Se registra una cotización con una versión nunca activada | registro | medium | Guarda de la sección 4 | rechazo de registro por versión no vigente |
| La exportación pisa un archivo de versión | repo | low | Nunca sobrescribe; verificación por huella antes y después | error de exportación |
| El modo local queda desactualizado sin que nadie lo note | CLI | medium | Exportación como parte del acto de activar; `doctor` y paridad fallan por puntero | paridad en rojo por puntero |
| Una reserva de contingencia alcanza a una cotización congelada | motor | low | Regla dura de secuencia del catálogo; informe de impacto antes de activar | `REPLAY_MISMATCH` en la guarda de artefactos |
| Trabajo paralelo emite una versión en el repo durante el cambio | repo | medium | Coordinación previa; verificación de reflejo completo como condición del cambio | versión en el repo sin reflejo |

### Feature flags / cutover

- `QUOTER_CATALOG_WRITES_ENABLED`, default `false`. Se lee en las rutas de mutación de catálogo, en Vercel; confirmar
  con `grep -rn "QUOTER_CATALOG_WRITES_ENABLED" src/ services/` que ningún otro runtime la lee. Fila en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo cambio que la declara.
- Autoridad: fila de sólo agregar en la base. Las rutas de mutación escriben sólo con bandera encendida **y** autoridad
  `platform`.
- Cutover: encender la bandera en staging, ensayar; encender en producción; insertar la fila de autoridad `platform`.
  Staging y producción comparten base: la fila de autoridad vale para los dos, así que el cambio de autoridad es un
  solo acto y se hace con la bandera ya encendida en producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el código; la tabla y las capacidades quedan sin uso (la migración sólo agrega) | minutos | sí |
| Slice 2 | Apagar la bandera; las versiones aplicadas quedan inactivas y se conservan | menos de 10 minutos | sí; las versiones no se borran |
| Slice 3 | Apagar la bandera; activar de nuevo el puntero anterior con una fila nueva y su motivo | menos de 10 minutos | sí, por fila nueva; el historial no se reescribe |
| Slice 4 | Revertir el código; sólo lee | minutos | sí |
| Slice 5 | Revertir el código de la CLI o usar `--transport local` | inmediato | sí |
| Slice 6 | Vuelta a `repo` según la sección 9; el cambio de precio se deshace con otra versión y otra activación | menos de una hora | sí, sin borrar historia |
| Slice 7 | Revertir documentos | minutos | sí |

### Production verification sequence

1. Migración aplicada y verificada con su bloque de comprobación; lectura de vuelta de tabla, restricciones y
   capacidades.
2. Staging con bandera apagada: toda ruta de mutación responde que la capacidad está apagada y no escribe.
3. Staging con bandera encendida y autoridad `repo`: las rutas responden el código de autoridad y no escriben.
4. Ensayo completo con una familia de prueba marcada como sintética, o sobre el catálogo real con un cambio que no
   altere valores: revisar, aplicar, activar con persona, exportar, paridad en verde; negativas (confirmación vieja,
   padre ya sucedido, agente que intenta activar, persona sin la capacidad).
5. Ensayo de la vuelta a `repo`.
6. Producción: bandera encendida, comprobaciones del cambio de autoridad, fila `platform`.
7. Cambio real de precio de punta a punta, exportación, commit del operador, `pnpm pricing:v3:test` en verde y paridad
   en verde por los dos transportes.
8. Una cotización calculada con `--current` en los dos modos da la misma huella con la versión nueva.

### Out-of-band coordination required

- Operador: alta de la bandera en Vercel por entorno, redeploys y señal para el cambio de autoridad.
- Dueño de los valores (Finance/Commercial y CEO): el cambio real de precio de la aceptación es una decisión suya; esta
  task no inventa un precio.
- Quien tenga trabajo en curso que emita versiones en el repo (`TASK-2017`): no emitir durante el Slice 6.
- Release de Greenhouse por el control plane antes del paso 6.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un único lector de la autoridad del catálogo y la base guarda su historial con actor y motivo.
- [ ] Con autoridad `platform`, el importador repo → base no escribe y su modo de verificación informa diferencias; con
      autoridad `repo`, las rutas de mutación no escriben. Las dos negativas están probadas.
- [ ] Revisar no escribe ninguna fila (comprobado contra la base) y devuelve la misma salida que la CLI local para el
      mismo change-set, base y demandas de impacto.
- [ ] Aplicar con una confirmación que no corresponde a la revisión recalculada se rechaza con el mismo código que en
      local; con la correcta, inserta una versión inactiva y el puntero no cambia.
- [ ] Dos aplicaciones concurrentes sobre el mismo padre: una entra y la otra recibe conflicto, probado contra
      PostgreSQL real.
- [ ] Activar exige la huella del puntero reemplazado y un motivo; con una huella vieja responde
      `CURRENT_VERSIONS_CONFLICT`; dos activaciones concurrentes dejan una sola fila nueva.
- [ ] Activar se rechaza para: consumidor de ecosistema, sesión de agente, tenant cliente y persona sin la capacidad; y
      se acepta para una persona con `efeonce_admin` y para una con `finance_admin`.
- [ ] No existe ruta de activación bajo `/api/platform/ecosystem/quoter/**` (prueba sobre el sistema de archivos).
- [ ] La fila de activación no se puede insertar sin `activated_by_member_id` ni reemplazando un puntero que no es el
      vigente (prueba contra la base, sobre las guardas de `TASK-2025`).
- [ ] Ninguna versión ni fila de historial admite actualización o borrado (prueba contra la base).
- [ ] No existe una llamada que aplique y active, ni una que mute dos familias.
- [ ] Una versión aplicada y nunca activada no puede respaldar el registro de una cotización (rechazo probado).
- [ ] El informe de impacto lista las cotizaciones guardadas que nombran la versión reemplazada y, después de una
      activación, las filas del registro son idénticas a las de antes.
- [ ] `catalog preview|apply`, `resources preview|apply` y `current set` dan por los dos transportes la misma salida,
      el mismo exit code y los mismos códigos de rechazo, y sus casos están en el corpus de paridad.
- [ ] `current set` en modo plataforma exige persona y confirmación en terminal.
- [ ] La exportación escribe versiones y puntero verificados por huella, no sobrescribe un archivo de versión existente
      y no ejecuta git.
- [ ] Después de exportar, `pricing-v3-current-versions.test.ts` y toda `pnpm pricing:v3:test` quedan en verde sin red,
      y `--current` en modo local usa la versión nueva.
- [ ] `doctor` y `pnpm pricing:v3:parity` fallan cuando el puntero del repo difiere del de la plataforma (visto
      fallar).
- [ ] La vuelta a `repo` como autoridad se ensayó en staging con lectura de vuelta de cada paso.
- [ ] Un cambio real de precio se hizo por la API de punta a punta, su copia exportada está en el repo y los dos
      transportes siguen en paridad.
- [ ] Bandera registrada en el libro de banderas con su runtime; capacidades con permiso a roles reales en el mismo
      cambio.
- [ ] Ninguna respuesta, evento o log lleva el contenido del catálogo, un token o datos de nómina.

## Verification

- `pnpm task:lint --task TASK-2029`
- `pnpm pricing:v3:test`
- `pnpm vitest run src/lib/commercial/quoter src/lib/api-platform/resources`
- `pnpm vitest run src/lib/entitlements/capability-grant-coverage.test.ts`
- `pnpm test:live` serializado para las consultas y restricciones nuevas
- `pnpm migration-marker-gate` y `pnpm db:generate-types` si hay migración
- `pnpm pricing:v3 doctor` y `pnpm pricing:v3:parity` contra staging y producción
- `pnpm local:check`, `pnpm skills:mirrors`, `pnpm qa:gates --changed`, `pnpm docs:closure-check`
- `pnpm test` completo y `pnpm build` como puerta de cierre; el build pide autorización del operador en esta máquina.
- Después de editar contexto o handoff: `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Documentación técnica: `## Delta` en `GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` (quién es la
      autoridad, qué es `current.json` desde ahora) y contrato de las rutas en la arquitectura del cotizador y en
      `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`.
- [ ] Documentación funcional: cómo cambia un precio y quién lo activa, en `docs/documentation/finance/`.
- [ ] Manual: sección «Actualizar valores sin alterar cotizaciones anteriores» del manual y la referencia de la skill,
      con espejo, incluido el camino de vuelta.
- [ ] `data/pricing/v3-operating/README.md` dice que sus archivos de versión y su puntero son copia exportada.
- [ ] `EPIC-053` actualizada.
- [ ] El estado se reporta como «code complete, rollout pendiente» mientras falte el cambio de autoridad o el cambio
      real de precio.

## Follow-ups

- Interfaz de mantenimiento de catálogo (fase de interfaz de `EPIC-053`).
- Lectura de datos de autoridad del servidor para lo que hoy se declara a mano (inventario de licencias, asignaciones).
- Reproducir el corpus de cotizaciones guardadas ante un cambio de motor: lo exige la frontera de promoción y no existe
  todavía.

## Open Questions

- ¿Aplicar puede hacerlo un agente por el carril de ecosistema (como hoy en local, donde aplicar no aprueba nada) o
  sólo una persona? La propuesta es que sí, con la guarda de la sección 4.
- ¿Quién puede cambiar la autoridad (`repo` ↔ `platform`)? La propuesta es `efeonce_admin`.
- ¿Con qué identidad activa una persona antes de que exista interfaz? Depende de admitir el bearer delegado de una
  persona verificada como acto humano (decisión abierta en `TASK-2027` y `TASK-2028`).
- ¿La exportación al repo es obligatoria en el mismo acto de activar, o puede quedar pendiente con `doctor` en falla
  hasta que alguien exporte?
- ¿Cuál es el cambio real de precio de la aceptación? Lo decide el dueño de los valores.
