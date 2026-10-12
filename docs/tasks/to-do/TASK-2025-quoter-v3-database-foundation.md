# TASK-2025 — Cotizador V3: base de datos del catálogo por huella y del registro de cotizaciones

## Delta 2026-10-12

`TASK-2024` entregó el contrato `PricingV3Storage` y la batería `runStorageConformance`. Documento vigente:
[`GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md`](../../architecture/GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md). Lo que
difiere de lo que esta task suponía, y que el Slice 5 debe respetar para pasar la batería:

- **Operaciones asíncronas**, todas. Además de las previstas hay `findDocument` (lectura tolerante, sin verificar,
  para los veredictos sobre el puntero) y `readPointer` devuelve `null` cuando no hay puntero.
- **Identidad de un documento** = rol + versión + huella del documento **ya validado por su rol**
  (`identifyDocument`). `readDocument` con identidad entrega ese documento o `INPUT_NOT_FOUND`: en PostgreSQL es una
  búsqueda por `(role, version, document_digest)` que encuentra o no encuentra. El texto canónico de un documento
  fuente es `stableJson(documento validado)`; la batería sólo exige identidad para documentos, no bytes, así que
  guardar ese canónico la pasa.
- **Un artefacto se devuelve byte a byte como se escribió** (casos 1 y 2 de la batería). El texto que recibe
  `writeArtifact` es el que la CLI escribe, con sangría y con el orden de claves de la corrida; `stableJson` ordena
  las claves y ese orden no se recupera. Guardar `stableJson(artefacto)`, como dice hoy la tabla de `## Detailed
  Spec`, **no pasa la batería** y rompería la paridad byte a byte entre transportes de `TASK-2028`. Recomendación:
  guardar el texto recibido tal cual, con `artifact_digest` = sha256 de ese texto (comprobable por la base) y
  `replay_digest` como identidad. **Decidido 2026-10-12: así queda**, ya incorporado en «Texto guardado y huellas».
- **El puntero viaja como texto opaco** (caso 7): `readPointer` devuelve el texto que se escribió. `pointer_digest`
  = `currentVersionsDigest(puntero)` no es el sha256 de ese texto, así que la comprobación en la base necesita una
  huella del texto aparte. **Decidido 2026-10-12:** se guarda el texto tal cual, con `pointer_text_digest` para la
  base y `pointer_digest` verificado por el adaptador.
- **Nada se reemplaza, tampoco con el mismo contenido**: una segunda escritura sobre la misma identidad es siempre
  `OUTPUT_EXISTS`. Ese código no debe llegar a un cliente HTTP: el importador y los comandos del registro preguntan
  antes (`findDocument`) y resuelven la idempotencia por encima del puerto.
- **`replacePointer({ text, confirmDigest })`**: `confirmDigest` es la huella del puntero que se reemplaza o `null`
  si no se espera ninguno; la comprobación y el reemplazo son un solo acto dentro del adaptador (control optimista).
- **La batería se importa, no se copia**: `runStorageConformance({ name, empty })` desde
  `src/lib/finance/pricing-v3/__tests__/storage-conformance.ts`. `empty()` entrega un almacén vacío por llamada y
  `locator(path)` la dirección que el adaptador da a lo que el repositorio tiene en esa ruta (`undefined` si no usa
  ninguna). El caso 8 escribe varias versiones de fuentes y mueve el puntero varias veces sobre el mismo almacén.
- El adaptador de archivos vive en `scripts/commercial/pricing-v3-storage-file.ts`; ningún módulo de `src/` que no
  sea un test puede importarlo (`pricing-v3-purity.test.ts`).

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
- Backend impact: `migration`
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `EPIC-053-02 (fase 2 del programa)`
- Domain: `finance`
- Blocked by: `TASK-2024 (sólo el Slice 5; el esquema y las capacidades no dependen de ella)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea en `greenhouse_commercial`, bajo el prefijo único `quoter_`, la base del cotizador V3 en la plataforma: los
documentos de catálogo, política y créditos guardados por huella; el historial del puntero de versiones vigentes; la
identidad de una cotización y su número público; sus versiones inmutables, que son el artefacto congelado tal cual;
los cambios de estado y las aprobaciones de excepción como historial de sólo agregar, con la matriz como dato; y los
datos del documento por versión.
Entrega además las capacidades con sus permisos, el adaptador PostgreSQL del puerto de almacenamiento y un importador
idempotente del repo a la base. No expone ninguna ruta y no diseña interfaz.

## Why This Task Exists

V3 vive hoy en archivos: catálogo y política versionados en el repo, un puntero y cotizaciones congeladas que se
verifican recalculándolas. Una API en Vercel no puede leer esos archivos en tiempo de ejecución, y git no da control
de concurrencia para dos personas que cambian un catálogo. El cotizador del portal tampoco sirve de base: su tabla
mezcla copias de HubSpot, documentos de Nubox y cotizaciones propias; una versión no congela lo necesario para
reproducir un precio; el número no es único ni secuencial; y la historia se puede editar y borrar
([auditoría](../../audits/commercial/2026-10-12-cotizador-actual-auditoria.md), M-01 a M-05).

La decisión aceptada fija un registro propio (decisión 2), una versión que es el artefacto congelado guardado como
texto canónico con su huella verificada al escribir y al leer (decisión 4), historial de sólo agregar con guardas en
la base y número público de una secuencia (decisión 5), y un catálogo que primero refleja el repo por huella
(decisión 6, primer paso). Esta task es esa base; las APIs que la usan son tasks posteriores.

## Goal

- Todo documento de catálogo, política y créditos del repo existe en la base, identificado por rol, versión y huella,
  con la misma huella que en el repo.
- Existe una sola respuesta a «qué rige», con historial de quién activó qué, cuándo y por qué; guardar un documento
  nunca lo activa.
- Una cotización tiene identidad estable, número público que no colisiona y versiones que ninguna sesión puede editar
  ni borrar, ni siquiera el usuario de runtime.
- Un artefacto guardado se lee con la misma huella con que se escribió, y el resultado del motor nunca se reconstruye
  desde columnas.
- Las capacidades del cotizador existen en el registro, en el catálogo de TypeScript y otorgadas a roles reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` (decisiones 2 a 8, ubicación, reglas
  duras y «Delta 2026-10-12 — decisiones del CEO», que manda sobre lo que esta task decía antes).
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` (D2 a D6, fase 2 de §6, §7, §8).
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` (las cotizaciones son de Comercial y viven
  en `greenhouse_commercial`).
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (extender por llave foránea, nunca identidad paralela).
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` y `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`.
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` (§«Ids secuenciales, casts y comentarios» y
  las dos clases de error de orden).
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` y
  `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`.
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` (versiones inmutables, puntero
  verificado, alternativas descartadas: «la más alta gana», `latest`).
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (tabla única de ejecución de comandos).
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

Reglas obligatorias:

- **Hay una sola instancia y una sola base para desarrollo, staging y producción.** Aplicar una migración desde local
  (`pnpm migrate:up`) es un cambio en producción. El agente que ejecute esta task **no aplica ninguna migración ni
  corre el importador con escritura sin el visto bueno explícito del operador en ese momento**; hasta tenerlo, las
  migraciones se escriben, se revisan y se prueban contra el clúster PostgreSQL local.
- Migraciones que sólo agregan (expand). Ninguna modifica ni lee `greenhouse_commercial.quotations*`.
- Cada migración nace con `pnpm migrate:create <slug>`, empieza con `-- Up Migration`, lleva su bloque
  `DO $$ … RAISE EXCEPTION` de verificación y deja bajo `-- Down Migration` sólo sentencias de deshacer.
- Nada se actualiza ni se borra en las tablas de historia: versiones, cambios de estado, historial del puntero,
  documentos por huella y datos de documento son de sólo agregar, con disparadores que lo hacen cumplir.
- El texto guardado vive en una columna `text`. Ninguna columna `jsonb` es la verdad de un documento o de un
  artefacto.
- Las columnas adicionales son índices de lectura. Ningún lector reconstruye un resultado desde ellas.
- Sólo se registra una cotización calculada. Los avisos de la corrida y las lecturas derivadas no se guardan como
  cotización.
- Ninguna columna para fecha de inicio del servicio ni para duración de contrato. Ningún dato de nómina.
- Organización por llave foránea a `greenhouse_core.organizations`; nunca texto libre.
- La organización dueña de toda cotización es la canónica de Efeonce, resuelta por referencia estable (`public_id`
  `EO-ORG-0007`); ningún UUID de organización escrito en código ni en una migración.
- Ningún cambio de estado exige a una persona. Los únicos actos de persona del cotizador son aprobar una excepción
  bajo el piso y activar el puntero del catálogo; un acto de persona nuevo exige una decisión del CEO.
- Una capacidad nueva entra con su fila en el registro, su entrada en el catálogo de TypeScript y su permiso a un rol
  real, en el mismo cambio.
- SQL embebido en TypeScript se ejercita contra PostgreSQL real antes de commitear; los mocks no prueban SQL.

## Normative Docs

- `.claude/rules/migrations.md` y CLAUDE.md §«Database — Migration markers».
- `docs/documentation/finance/cotizador-v3-promocion-canonica.md` (qué debe preservar un adaptador persistente).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (esta task no agrega flags; ver `### Feature flags / cutover`).
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`.
- Migraciones de referencia para copiar patrón, no contenido:
  `migrations/20260712160001023_task-1392-proposal-studio-foundation.sql` (matriz de estados como dato, historial de
  sólo agregar, compuerta humana por restricción) y `migrations/20260915100154428_task-1845-insights-foundation.sql`
  (función de secuencia sin recorte, huellas con `CHECK`, reemplazo por versión nueva).

## Dependencies & Impact

### Depends on

- `TASK-2024` para el Slice 5: el adaptador PostgreSQL implementa el contrato `PricingV3Storage` y pasa la batería
  `runStorageConformance` que esa task exporta. Los Slices 1 a 4 no dependen de ella y pueden correr en paralelo.
- Tablas canónicas existentes: `greenhouse_core.organizations`, `greenhouse_core.capabilities_registry`,
  `greenhouse_core.api_platform_command_executions`, `greenhouse_sync.outbox_events`.
- Documentos del repo: `data/pricing/v3-operating/` (catálogo y política `v2` a `v11`, puntero `current.json`),
  `data/pricing/v3-resources/` (créditos) y las versiones que nombren los artefactos congelados del corpus.
- Motor: `src/lib/finance/pricing-v3/adapters/` (`stableJson`, `catalogDigest`, `currentVersionsDigest`, las tres
  reproducciones).

### Blocks / Impacts

- Bloquea `TASK-2026` (API de cálculo: lee catálogo y puntero), `TASK-2027` (API de registro: escribe cotizaciones,
  versiones, estados y documentos), `TASK-2028` (CLI sobre la API) y `TASK-2029` (catálogo con autoridad en la
  plataforma).
- No impacta al cotizador actual ni a sus tablas: `proposals.quote_id` sigue apuntando a `quotations`.
- `TASK-2026` espera que el importador deje en la base **todas** las versiones históricas que nombra el corpus, no
  sólo las vigentes.
- Fija la familia de nombres de `EPIC-053`: prefijo de tablas, claves de capacidad, puerta de autorización y carpeta
  del agregado.

### Files owned

- `migrations/<timestamp>_task-2025-quoter-source-documents-and-pointer.sql`,
  `migrations/<timestamp>_task-2025-quoter-quote-aggregate.sql`,
  `migrations/<timestamp>_task-2025-quoter-capabilities.sql` (nombres generados por `pnpm migrate:create`).
- `src/types/db.d.ts` (regenerado).
- `src/lib/commercial/quoter/` (nuevo): `storage-postgres.ts`, `source-documents-store.ts`, `pointer-store.ts`,
  `quote-store.ts`, `state-machine.ts`, `authz.ts`, `errors.ts`, `events.ts`, `canonical-text.ts`, `index.ts` y sus
  tests (`*.test.ts`, `local-postgres.test.ts`, `boundary-domain.test.ts`, `state-machine-parity.test.ts`).
- `scripts/commercial/quoter-import.ts` y el script `quoter:import` en `package.json`.
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` (capacidades y permisos del cotizador).
- `src/lib/sync/event-catalog.ts` y `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (dos tipos de evento).
- `docs/architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md` (nuevo), `docs/documentation/finance/cotizador-v3-registro-en-plataforma.md`
  (nuevo), `docs/manual-de-uso/finance/importar-catalogo-v3-a-la-plataforma.md` (nuevo).

## Current Repo State

### Already exists

- Esquema `greenhouse_commercial` en uso (cotizaciones del cotizador actual, propuestas, engagement), con llaves
  foráneas a `greenhouse_core.organizations`.
- Patrones probados en el mismo esquema y en `greenhouse_insights`: disparadores de sólo agregar con
  `TG_TABLE_NAME`, matriz de estados sembrada en la migración con prueba de paridad TypeScript ↔ base, restricción de
  compuerta humana (`requires_human_gate = false OR (actor_kind = 'member' AND actor_member_id IS NOT NULL)`),
  huellas `CHECK (~ '^[0-9a-f]{64}$')`, función de secuencia `next_insight_report_code()` con un solo `nextval` y
  `lpad(n::text, GREATEST(6, length(n::text)), '0')`.
- Tabla única de idempotencia y auditoría de comandos: `greenhouse_core.api_platform_command_executions`
  (`command_execution_id`, `principal_id`, `idempotency_key`, `request_fingerprint`, `status`, `organization_id`).
- Capacidades del cotizador actual (`commercial.quotation`, `commercial.quote.simulate`,
  `commercial.quotation.cost_override`, `commercial.quotation.pricing_config`): no se reutilizan ni se modifican.
- Siembra de capacidades por migración con `ON CONFLICT (capability_key) DO UPDATE`
  (`migrations/20261002185625608_task-1894-marketing-studio-write-capabilities.sql`) y prueba de cobertura de permisos
  `src/lib/entitlements/capability-grant-coverage.test.ts`.
- Carril de pruebas contra un clúster PostgreSQL local (`src/lib/client-portal/enablement/local-postgres.test.ts`).
- Corpus: 48 artefactos congelados en tres carriles y el puntero vigente (catálogo y política `…-v11`, créditos
  `…-v1`).

### Gap

- V3 no tiene esquema ni tablas. No existe `src/lib/commercial/quoter/`.
- No hay capacidades para cotizar con V3, aprobar una excepción bajo el piso ni mover el puntero.
- No está demostrado que un artefacto sobreviva una ida y vuelta por PostgreSQL con la misma huella.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/commercial/quoter/` en el runtime del portal, sobre el esquema `greenhouse_commercial`
- Future candidate home: `domain-package`
- Boundary: almacenes `source-documents-store`, `pointer-store`, `quote-store` y el adaptador `storage-postgres` del puerto `PricingV3Storage`; consumidores autorizados: comandos y lectores de `EPIC-053` y el importador
- Server/browser split: la carpeta completa es `server-only`; el motor puro se queda en `src/lib/finance/pricing-v3/` y no importa nada de aquí
- Build impact: none; sin dependencias nuevas, y el importador vive en `scripts/commercial/` fuera del alcance de las rutas
- Extraction blocker: transacciones y pool únicos del portal, y llaves foráneas a `greenhouse_core.organizations` y a la tabla de ejecución de comandos

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: nace `greenhouse_commercial.quoter_*`. Para catálogo, política y créditos la autoridad
  sigue siendo el repo en esta fase: la base es su reflejo por huella.
- Consumidores afectados: ninguno todavía en runtime; después, las APIs de `TASK-2026` y `TASK-2027`.
- Runtime target: `local` (clúster local para pruebas) y `production` (la única base compartida), con visto bueno
  del operador.

### Contract surface

- Contrato existente a respetar: `PricingV3Storage` de `TASK-2024`; forma del puntero `pricing-v3-current/1`; las tres
  versiones de artefacto; `PricingV3Error` y su registro cerrado.
- Contrato nuevo: las tablas, vistas y funciones de `## Detailed Spec`; las capacidades `commercial.quoter.*`; la
  puerta `src/lib/commercial/quoter/authz.ts`; los eventos `commercial.quoter.source_document.stored` y
  `commercial.quoter.pointer.activated`.
- Backward compatibility: `compatible` — sólo objetos nuevos; nada existente cambia.
- Full API parity: los almacenes son primitives de servidor; ninguna ruta, pantalla ni herramienta los toca en esta
  task. Las APIs posteriores son adaptadores sobre ellos.

### Data model and invariants

- Entidades afectadas (todas nuevas, esquema `greenhouse_commercial`): `quoter_source_documents`,
  `quoter_pointer_history`, `quoter_quotes`, `quoter_quote_numbers`, `quoter_quote_versions`, `quoter_state_matrix`,
  `quoter_state_transitions`, `quoter_exception_approvals`, `quoter_version_documents`; vistas
  `quoter_current_pointer` y `quoter_quote_current`; secuencias y funciones de número público.
- Invariantes que no se pueden romper:
  - La huella del texto de un documento, un puntero o un artefacto es el sha256 de los bytes guardados, comprobada
    por la base al escribir; su huella de identidad la verifica el adaptador al escribir y al leer.
  - Un artefacto y un puntero se guardan y se devuelven byte a byte como se recibieron.
  - Una fila de historia no se actualiza ni se borra, tampoco con el usuario de runtime.
  - Guardar un documento no agrega una fila al historial del puntero.
  - Una fila del puntero sólo entra si declara la huella del puntero que reemplaza y esa huella es la vigente.
  - Un cambio de estado sólo entra si su par origen → destino existe en la matriz y su origen es el estado vigente de
    esa cotización; si la matriz exige compuerta humana, el actor es una persona identificada. Ningún par sembrado
    la exige: emitir y retirar los hace también un agente (decisión 7).
  - La organización dueña de toda cotización es la canónica de Efeonce; la destinataria, cuando existe, es una
    organización cliente o potencial cliente y no confiere acceso.
  - Una aprobación de excepción vale para una versión y una huella de artefacto, y sólo la registra una persona
    identificada.
  - Una versión guarda sólo un artefacto con estado de cálculo `calculated`.
  - El número público se asigna una sola vez por cotización, en su primera emisión, por una función con un solo
    `nextval`, y no se recorta al crecer. La serie real empieza en 15 (`EO-QTE-15`).
  - El registro no escribe ni lee `greenhouse_commercial.quotations*`.
- Write-target allowlist: el dominio comercial no tiene prueba de frontera; esta task la crea para el cotizador
  (`src/lib/commercial/quoter/boundary-domain.test.ts`) con las nueve tablas `quoter_*` más
  `greenhouse_sync.outbox_events` como únicos destinos de escritura, cada uno con su justificación.
- Tenant/space boundary: `quoter_quotes.owner_organization_id` es obligatorio, referencia
  `greenhouse_core.organizations` y es siempre la organización canónica de Efeonce, la cree una persona o un agente
  (CEO, 2026-10-12). La resuelve el servidor por referencia estable; nunca sale del pedido ni de un UUID escrito en
  código (ver «Organización dueña y destinataria»). Las tablas hijas la repiten y un disparador comprueba que coincide
  con la del padre. El alcance de autorización es la identidad interna con su capacidad, no «la organización de quien
  llama». La organización destinataria es contenido validado de la cotización, también por llave foránea, y no
  confiere acceso. Catálogo y puntero son de Efeonce y no llevan organización.
- Idempotency/concurrency: la idempotencia de comandos usa la tabla única `api_platform_command_executions`; no se
  crea una segunda. Cada fila escrita por un comando guarda `command_execution_id` y `request_hash`. Concurrencia:
  control optimista por huella en el puntero; bloqueo transaccional por cotización al agregar versión o estado;
  unicidad `(quote_id, version_number)`.
- Audit/outbox/history: las propias tablas son el historial. Eventos en la misma transacción para documento guardado
  y puntero activado; los eventos de cotización nacen con los comandos de `TASK-2027`.

### Migration, backfill and rollout

- Migration posture: `additive` (tres migraciones) más `seed` (matriz de estados y capacidades).
- Default state: tablas vacías y sin lectores en runtime. Ningún flag: nada las consulta hasta `TASK-2026`.
- Backfill plan: importador `pnpm quoter:import` en modo simulación por defecto; `--apply` para escribir; idempotente
  por huella (una segunda corrida no escribe nada); activar el puntero es un subcomando aparte con actor y motivo.
  No hay cotizaciones que migrar: no existe ninguna real en el cotizador actual.
- Rollback path: antes de que exista una cotización real, migración de bajada (elimina objetos vacíos o con sólo
  reflejo del repo, que se puede reimportar). Después de la primera cotización real, sin retorno por bajada: la
  corrección es una migración nueva hacia adelante.
- External coordination: visto bueno del operador para aplicar migraciones y para la primera importación con
  escritura. El prefijo del número y el arranque de la serie quedaron fijados por el CEO el 2026-10-12: ya no
  requieren confirmación.

### Security and access

- Auth/access gate: capacidades `commercial.quoter.*` resueltas en una sola puerta
  (`src/lib/commercial/quoter/authz.ts`) con `can(subject, capability, action, scope)`; nunca `roleCodes.includes`.
  Una identidad de agente pasa por la misma puerta como sujeto máquina derivado de su binding interno (ver
  «Identidad de agente»).
- Sensitive data posture: documentos y artefactos llevan costos y márgenes internos; ningún dato de nómina ni de
  personas. Permisos de base: `SELECT` e `INSERT` para `greenhouse_runtime` en las tablas de historia, sin `UPDATE` ni
  `DELETE`; dueño `greenhouse_ops`. Los eventos llevan identificadores, versión, estado y huellas, nunca el texto.
- Error contract: errores tipados del dominio en `src/lib/commercial/quoter/errors.ts`, que envuelven
  `PricingV3Error` sin redefinir sus códigos; `captureWithDomain(err, 'commercial', …)`. La traducción a HTTP es de
  las tasks de API.
- Abuse/rate-limit posture: sin superficie expuesta en esta task. El importador es una herramienta de operador.

### Runtime evidence

- Local checks: pruebas de los almacenes y del adaptador contra el clúster PostgreSQL local; paridad de la matriz;
  cobertura de permisos; frontera de escritura.
- DB/runtime checks: tras aplicar con visto bueno, consulta de sólo lectura que confirma tablas, disparadores,
  restricciones, permisos y siembra; `pnpm pg:doctor`.
- Integration checks: importador en simulación y luego con escritura; segunda corrida sin cambios; huellas en la base
  iguales a las del repo para cada documento.
- Reliability signals/logs: ninguno nuevo en esta task; el conteo de documentos y la huella del puntero vigente quedan
  disponibles por consulta para la señal que agregue `TASK-2026`.
- Production verification sequence: ver `### Production verification sequence`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio
      (`src/lib/commercial/quoter/boundary-domain.test.ts`), en el mismo cambio.
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

### Slice 1 — Prueba de ida y vuelta de huellas (antes de escribir el esquema definitivo)

- Contra el clúster PostgreSQL local: para cada uno de los 48 artefactos y para cada documento de catálogo, política
  y créditos del repo, guardar su texto (el artefacto como está en el repo; el documento fuente como
  `stableJson(validado)`) en una columna `text`, leerlo, y comprobar que (a) el texto leído
  es idéntico, (b) `encode(sha256(convert_to(texto, 'UTF8')), 'hex')` calculado por PostgreSQL es igual al sha256
  calculado en Node sobre el mismo texto, y (c) la reproducción del artefacto leído verifica con su huella.
- Confirmar en PostgreSQL 16 la volatilidad de `sha256(bytea)` y `convert_to(text, name)`: si ambas son inmutables,
  la comprobación de huella va como `CHECK`; si alguna no lo es, va como disparador `BEFORE INSERT`.
- El resultado decide el mecanismo y queda escrito en el documento de modelo de datos. Si alguna huella difiere, la
  task se detiene y se reporta: el diseño de «texto en `text`, sin reserializar» no se cambia por un atajo.

### Slice 2 — Catálogo por huella y puntero

- Migración 1: `quoter_source_documents`, `quoter_pointer_history`, vista `quoter_current_pointer`, disparadores de
  sólo agregar y de control optimista del puntero, bloque de verificación, permisos.
- `source-documents-store.ts` y `pointer-store.ts` (Kysely `getDb()` y `withTransaction` desde `@/lib/db`), con
  comprobación de huella al leer.
- Eventos `commercial.quoter.source_document.stored` y `commercial.quoter.pointer.activated` publicados con
  `publishOutboxEvent(event, client)` dentro de la misma transacción; registrados en el catálogo de eventos.

### Slice 3 — Agregado de cotización

- Migración 2: secuencias y funciones de número público, `quoter_quotes`, `quoter_quote_numbers`,
  `quoter_quote_versions`, `quoter_state_matrix` (con su siembra), `quoter_state_transitions`,
  `quoter_exception_approvals`, `quoter_version_documents`, vista `quoter_quote_current`, disparadores, bloque de
  verificación, permisos.
- `quote-store.ts`: crear identidad con su versión 1 y su primer estado en una transacción, agregar versión, agregar
  estado, registrar una aprobación de excepción, asignar número, guardar datos de documento, leer versión (texto
  canónico y huella verificada). Ninguna de estas funciones queda expuesta por una ruta en esta task. Crear identidad
  recibe la organización dueña ya resuelta por `resolveQuoterOwnerOrganizationId()`; nunca un valor de quien llama a
  la API.
- `state-machine.ts` con la matriz en TypeScript y `state-machine-parity.test.ts`, que lee el bloque sembrado de la
  migración y exige igualdad.

### Slice 4 — Capacidades, permisos y puerta única

- Migración 3: siembra de las capacidades de `## Detailed Spec` en `greenhouse_core.capabilities_registry`, con su
  bloque de verificación.
- Entradas en `src/config/entitlements-catalog.ts` y permisos en `src/lib/entitlements/runtime.ts`, en el mismo
  commit que la migración.
- `authz.ts`: tabla necesidad → `{ capability, action }` y un único núcleo que recibe un
  `TenantEntitlementSubject`, para que rutas, Nexa y el carril de ecosistema compartan la misma puerta.
- `authz.ts` exporta también `resolveQuoterOwnerOrganizationId()` (organización canónica de Efeonce por `public_id`),
  y una prueba fija qué puede y qué no puede el sujeto máquina de un binding interno (ver «Identidad de agente»).
- `capability-grant-coverage.test.ts` en verde.

### Slice 5 — Adaptador PostgreSQL del puerto e importador

- `storage-postgres.ts`: implementa `PricingV3Storage` sobre los almacenes. Para artefactos recibe el contexto de
  cotización como dirección propia del adaptador; el contrato no cambia.
- Ejecutar `runStorageConformance` (de `TASK-2024`) contra este adaptador en el clúster local.
- `scripts/commercial/quoter-import.ts` (`pnpm quoter:import`): recorre los documentos del repo, calcula su huella
  con `catalogDigest`, y guarda los que falten. Subcomando separado para reflejar el puntero del repo, con
  `--actor-member-id` y `--reason` obligatorios.
- Pruebas de `## Detailed Spec` §«Pruebas obligatorias».

### Slice 6 — Aplicación con visto bueno, importación y documentación

- Pedir al operador el visto bueno para `pnpm pg:connect:migrate`; aplicar; `pnpm db:generate-types`; verificar por
  consulta.
- Pedir el visto bueno para la primera importación con escritura; correrla; segunda corrida sin cambios; comparar
  huellas base ↔ repo.
- Triple documentación: modelo de datos (arquitectura), registro en la plataforma (funcional) y manual del
  importador.

## Out of Scope

- Cualquier ruta de API, carril de plataforma, herramienta MCP, acción de Nexa, pantalla o render de PDF.
- Los comandos gobernados de cotización (crear, agregar versión, registrar una hecha en local, aprobar una excepción,
  emitir): `TASK-2027`. Esta task entrega los almacenes que esos comandos llaman.
- Cambiar el catálogo por la API (revisar, aplicar, exportar al repo): `TASK-2029`.
- Eventos de ciclo de vida de la cotización y su catálogo de eventos: `TASK-2027`.
- Enlace público, aceptación, firma, cobro, facturación y cierre de negocio.
- Tocar `greenhouse_commercial.quotations*`, `proposals.quote_id` o cualquier objeto del cotizador actual.
- Migrar cotizaciones del cotizador actual: no hay ninguna real.
- Modificar el motor, sus contratos, su registro de errores o cualquier archivo de `data/pricing/**`.
- Diseñar interfaz.

## Detailed Spec

Nombres propuestos. Discovery puede ajustar tipos y columnas de índice; no las invariantes ni el prefijo.

### Texto guardado y huellas

Regla (decidida el 2026-10-12 con la batería de conformidad de `TASK-2024`): **lo que se guarda es el texto que se
recibió, tal cual; nadie lo reserializa, lo ordena ni lo normaliza.** Cada objeto lleva dos huellas con funciones
distintas: la **huella del texto** (sha256 de los bytes guardados; la comprueba la base) y la **huella de identidad**
(la que define el motor; la verifica el adaptador al escribir y al leer). En los documentos fuente y en los datos
del documento el texto guardado es `stableJson(valor validado)`, así que las dos coinciden y basta una columna.

| Objeto | Texto guardado | Huella del texto (la comprueba la base) | Huella de identidad (la verifica el adaptador) |
| --- | --- | --- | --- |
| Documento de catálogo, política o créditos | `stableJson(documento validado por su rol)` | `document_digest` = sha256 del texto | la misma: `catalogDigest(documento)`, la que lleva el puntero |
| Puntero | el texto del puntero **como se escribió** (opaco) | `pointer_text_digest` = sha256 del texto | `pointer_digest` = `currentVersionsDigest(puntero)` |
| Artefacto congelado | el texto del artefacto **como se emitió**, con su sangría y su orden de claves | `artifact_digest` = sha256 del texto | `replay_digest`, el que el artefacto declara y la reproducción recalcula |
| Datos del documento del cliente | `stableJson(datos)` | `document_digest` = sha256 del texto | la misma |

Por qué el artefacto y el puntero no se guardan como `stableJson`: la batería de `TASK-2024` exige que un artefacto se
lea byte a byte como se escribió y que el puntero viaje como texto opaco; `stableJson` reordena las claves y ese
orden no se recupera. Sin esos bytes no hay paridad de archivo entre transportes (`TASK-2028`).

`canonical-text.ts` es el único lugar del servidor que calcula huellas de texto y que produce `stableJson` para los
objetos que lo usan; reutiliza `stableJson` del motor. No transforma un artefacto ni un puntero.

### `quoter_source_documents` (sólo agregar)

- `role text NOT NULL CHECK (role IN ('catalog','policy','credits'))`
- `version text NOT NULL`
- `document_digest text NOT NULL CHECK (document_digest ~ '^[0-9a-f]{64}$')`
- `canonical_text text NOT NULL`
- `schema_version text` (índice: el `schemaVersion` que declara el documento)
- `parent_digest text` (el documento al que sucede, cuando lo declara)
- `origin text NOT NULL CHECK (origin IN ('repo_import','platform_apply'))`
- `source_path text` (ruta del repo cuando `origin = 'repo_import'`)
- `stored_by_actor_kind text NOT NULL CHECK (stored_by_actor_kind IN ('member','agent','service'))`,
  `stored_by_member_id text`, `reason text NOT NULL CHECK (length(btrim(reason)) >= 5)`
- `command_execution_id text`, `request_hash text CHECK (request_hash ~ '^[0-9a-f]{64}$')`
- `stored_at timestamptz NOT NULL DEFAULT now()`
- Llave primaria `(role, document_digest)`; única `(role, version)`: una versión ya usada no cambia de contenido.
- Comprobación de huella sobre `canonical_text` (mecanismo según Slice 1).
- Disparadores: rechazo de `UPDATE` y de `DELETE`.

### `quoter_pointer_history` (sólo agregar)

- `pointer_seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
- `pointer_digest text NOT NULL UNIQUE` (identidad), `pointer_text text NOT NULL` (como se escribió),
  `pointer_text_digest text NOT NULL` con comprobación de huella del texto
- `previous_pointer_digest text` — obligatorio salvo en la primera fila
- `catalog_digest`, `policy_digest`, `credits_digest`: cada una con llave foránea a
  `quoter_source_documents (role, document_digest)` con el rol fijo correspondiente
- `origin text NOT NULL CHECK (origin IN ('repo_mirror','platform_activation'))`
- `activated_by_member_id text NOT NULL` — mover el puntero es siempre un acto de una persona identificada
- `reason text NOT NULL CHECK (length(btrim(reason)) >= 5)`
- `command_execution_id text`, `request_hash text`, `activated_at timestamptz NOT NULL DEFAULT now()`
- Disparador `BEFORE INSERT`: toma un bloqueo transaccional, lee la fila de mayor `pointer_seq` y rechaza si
  `previous_pointer_digest` no es su `pointer_digest` (o si no es nulo con la tabla vacía).
- Disparadores: rechazo de `UPDATE` y de `DELETE`.
- Vista `quoter_current_pointer`: la fila de mayor `pointer_seq`. No existe «la versión más alta gana».
- Ningún disparador de `quoter_source_documents` inserta aquí.

### `quoter_quotes` (identidad; inmutable)

- `quote_id text PRIMARY KEY DEFAULT ('qtr-' || gen_random_uuid()::text)`
- `owner_organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id)` — la organización
  dueña y emisora: siempre la canónica de Efeonce, resuelta por el servidor (ver «Organización dueña y destinataria»)
- `client_organization_id text REFERENCES greenhouse_core.organizations(organization_id)` — la organización
  destinataria: cliente o potencial cliente; contenido validado por el comando, nunca texto libre; anulable en un
  borrador y obligatoria para emitir
- `deal_reference text` — referencia opcional al negocio. Si existe una tabla canónica de negocios con llave estable
  (confirmar en Discovery contra `src/lib/commercial/deals-store.ts`), es llave foránea a ella; si no, texto con
  `CHECK` de forma. Un solo lugar responde «qué negocio es».
- `data_origin text NOT NULL DEFAULT 'real' CHECK (data_origin IN ('real','synthetic'))`
- `created_by_actor_kind`, `created_by_member_id`, `command_execution_id`, `request_hash`, `created_at`
- Sin columna de estado, de número ni de «versión vigente»: viven en tablas de sólo agregar y se leen por la vista.
- Disparadores: rechazo de `UPDATE` y de `DELETE`.

### Organización dueña y destinataria

Decisión del CEO del 2026-10-12: Efeonce es siempre la dueña y emisora; el destinatario es una organización cliente o
potencial cliente.

- **Dueña.** `resolveQuoterOwnerOrganizationId()` en `authz.ts` es el único lugar que la resuelve: lee
  `organization_id` de `greenhouse_core.organizations` por el identificador público estable `EO-ORG-0007` y exige que
  la fila sea la entidad operativa activa (`is_operating_entity = TRUE`, `active = TRUE`, `status = 'active'`). El
  identificador público vive en una constante con nombre; el UUID no se escribe en código, en una migración ni en una
  prueba. Es el patrón de `resolveBrandOrganizationId()` en `src/lib/brand-surfaces/production/authz.ts` y de
  `INTERNAL_ORGANIZATION_PUBLIC_ID` en `src/lib/identity/internal-access/store.ts`. Si la fila no existe o no cumple,
  crear una cotización falla cerrado, sin escribir: nunca cae a «la organización de quien llama».
- Vale igual para una cotización creada por una persona o por un agente: un binding `internal` del carril de
  ecosistema no trae organización y no la necesita.
- **Destinataria.** Fila de `greenhouse_core.organizations` activa, distinta de la entidad operativa y en etapa
  `prospect`, `opportunity` o `active_client` (`lifecycle_stage`). El modelo canónico sí representa a un potencial
  cliente, así que no hace falta texto libre ni una identidad paralela; un prospecto que todavía no existe se crea
  antes por la puerta canónica de organizaciones. La comprobación es del comando de `TASK-2027`; la base aporta la
  llave foránea.
- **Cuándo es obligatoria.** Opcional en un borrador, obligatoria para emitir. Como la identidad de la cotización es
  inmutable, la destinataria se declara al crear: un borrador sin ella no se emite, y para emitir se crea la
  cotización con su destinataria (un borrador no consume número).
- Ser la destinataria no da acceso a nada: abrir una lectura a una identidad de cliente es otra decisión
  (`TASK-2027`, «Organización»).

### Número público: `quoter_quote_numbers` (sólo agregar)

- El número se asigna **en la primera emisión**, no al crear la cotización: un borrador no consume número y la
  identidad no necesita actualizarse.
- `quote_id text PRIMARY KEY` (llave foránea): una cotización tiene como máximo un número, para siempre.
- `quote_number text NOT NULL UNIQUE`, `number_series text NOT NULL CHECK (number_series IN ('real','synthetic'))`
  igual al `data_origin` de la cotización (lo comprueba un disparador), `assigned_at`, `command_execution_id`.
- Prefijo `EO-QTE-` y serie real que empieza en 15: la primera cotización real emitida es `EO-QTE-15` (CEO,
  2026-10-12). El prefijo es lo único de estas tablas que ve un cliente.
- `quoter_quote_number_seq` se crea con `START WITH 15`. Función `next_quoter_quote_number()` en plpgsql con **un**
  `nextval`, que devuelve `'EO-QTE-' || n::text`: sin relleno, para que el número se lea como lo fijó el CEO, y por
  lo tanto sin recorte posible. Nunca `to_char(…, 'FM…')` ni dos `nextval` en una expresión. Si alguna vez se pide
  ancho fijo, la única forma admitida es `lpad(n::text, GREATEST(N, length(n::text)), '0')`.
- El bloque de verificación de la migración comprueba el arranque leyendo `pg_sequences` (`start_value = 15`); no
  llama a `nextval`, porque en la base compartida eso consumiría el 15.
- Segunda secuencia y función para la serie sintética (`EO-QTE-T-1` en adelante), aprobada por el CEO el 2026-10-12,
  de modo que un ejemplo emitido en la base compartida no consuma ni salte números reales.
- El comando inserta una fila a la vez y la función se evalúa en ese `INSERT`; ningún `INSERT … SELECT … ON CONFLICT`
  la evalúa por filas candidatas.
- Disparadores: rechazo de `UPDATE` y de `DELETE`.

### `quoter_quote_versions` (inmutable)

- `quote_id` (llave foránea), `version_number integer NOT NULL CHECK (version_number >= 1)`, llave primaria
  `(quote_id, version_number)`; `owner_organization_id` repetido y comprobado contra el padre
- `artifact_text text NOT NULL` (como se emitió, sin reserializar), `artifact_digest text NOT NULL` con comprobación
  de huella del texto
- `replay_digest text NOT NULL CHECK (replay_digest ~ '^[0-9a-f]{64}$')`, `calculation_id text NOT NULL`
- `artifact_version text NOT NULL CHECK (artifact_version IN ('pricing-v3-local-artifact/1',
  'pricing-v3-selection-quote/1','pricing-v3-resource-composition/1'))`
- `contract_version text NOT NULL`, `engine_version text NOT NULL` — el contrato de entrada y el motor que lo
  calcularon, tal como los firma el artefacto
- `calculation_status text NOT NULL CHECK (calculation_status = 'calculated')`
- `origin text NOT NULL CHECK (origin IN ('platform','local'))` — calculada por la API o hecha en local y registrada
  después de recalcularla
- Fuentes por versión y huella (`catalog_version`, `catalog_digest`, `policy_version`, `policy_digest`,
  `credits_version`, `credits_digest`), anulables según el carril. Confirmar en Discovery qué carriles las declaran.
  Son índices para trazar, no la fuente con que se reproduce: el artefacto lleva sus fuentes dentro.
- `supersedes_version_number integer` — la versión de la misma cotización a la que reemplaza; un disparador exige que
  exista y sea menor. Reemplazar es agregar una versión; ninguna fila anterior cambia.
- Índices de lectura mínimos y comentados como tales (`COMMENT ON COLUMN … 'read index; never the source of a
  result'`): `currency text` y, si hace falta para listar, un total en `numeric`. Ninguno más sin justificarlo.
- `registered_by_actor_kind`, `registered_by_member_id`, `command_execution_id`, `request_hash`, `registered_at`
- Disparador `BEFORE INSERT`: bloqueo transaccional por cotización y `version_number` igual al máximo más uno.
- Disparadores: rechazo de `UPDATE` y de `DELETE`.

### `quoter_state_matrix` y `quoter_state_transitions`

El estado es **de la cotización**. La matriz coincide con la que propone `TASK-2027`; si el ciclo de vida necesita un
par nuevo, entra por una migración que sólo agrega filas.

- Matriz: `(from_state text, to_state text, requires_human_gate boolean NOT NULL)`, llave primaria
  `(from_state, to_state)`, sembrada en la migración. El estado inicial usa un origen centinela (`'none'`).
- Historial (sólo agregar): `transition_id`, `quote_id`, `owner_organization_id`, `from_state`, `to_state`,
  `version_number` y `artifact_digest` (obligatorios cuando `to_state = 'issued'`: dicen qué versión y qué huella se
  emitió), `requires_human_gate` (copiado de la matriz por el disparador, no dado por quien llama), `actor_kind`,
  `actor_member_id`, `reason text NOT NULL CHECK (length(btrim(reason)) >= 5)`, `metadata_json jsonb`,
  `command_execution_id`, `request_hash`, `occurred_at`.
- Restricción: `requires_human_gate = false OR (actor_kind = 'member' AND actor_member_id IS NOT NULL)`.
- Disparador `BEFORE INSERT`: bloqueo transaccional por cotización; el par debe existir en la matriz; `from_state`
  debe ser el estado vigente de la cotización (o el centinela si es su primera fila).
- Vista `quoter_quote_current`: por cotización, su estado vigente, su número si lo tiene, su última versión y su
  última versión emitida.

| Origen | Destino | Compuerta humana | Lo dispara |
| --- | --- | --- | --- |
| `none` | `draft` | no | crear la cotización con su versión 1 |
| `draft` | `issued` | no | emitir |
| `draft` | `withdrawn` | no | retirar un borrador |
| `issued` | `revising` | no | agregar o registrar una versión sobre una cotización emitida |
| `revising` | `issued` | no | emitir la versión nueva; la emitida anterior queda reemplazada |
| `issued` | `withdrawn` | no | retirar |
| `revising` | `withdrawn` | no | retirar |

`withdrawn` es terminal y no hay vuelta de `issued` a `draft`. Qué capacidad exige cada acto lo resuelve la puerta
única, no la matriz.

Ningún par exige compuerta humana (decisión 7, enmendada por el CEO el 2026-10-12): un agente emite una versión que
está dentro de política y, por el mismo principio, retira lo que puede emitir. Los dos actos de persona del
cotizador no son cambios de estado y por eso no aparecen aquí: la aprobación de una excepción bajo el piso vive en
`quoter_exception_approvals` (`actor_kind = 'member'`) y la activación del catálogo en `quoter_pointer_history`
(`activated_by_member_id NOT NULL`). La columna `requires_human_gate` y su restricción se conservan como mecanismo:
marcar un par exige una decisión del CEO y una migración. Que una versión bajo el piso no se emita sin su
aprobación registrada —la emita quien la emita— lo comprueba el comando de emisión de `TASK-2027`.

### `quoter_exception_approvals` (sólo agregar)

La aprobación de una excepción bajo el piso no es un estado: es un acto registrado que la emisión comprueba.

- `quote_id`, `version_number` (llave foránea a la versión), `owner_organization_id`
- `artifact_digest text NOT NULL` — debe ser el de esa versión (lo comprueba un disparador): una versión nueva no
  hereda la aprobación
- `approved_by_member_id text NOT NULL`, `actor_kind text NOT NULL CHECK (actor_kind = 'member')`
- `reason text NOT NULL CHECK (length(btrim(reason)) >= 10)`
- `command_execution_id`, `request_hash`, `approved_at`
- Única `(quote_id, version_number)`. Disparadores: rechazo de `UPDATE` y de `DELETE`.
- Que una versión bajo el piso no se emita sin esta fila lo decide el comando de `TASK-2027` leyendo el artefacto; la
  base no lo infiere de una columna.

### `quoter_version_documents` (sólo agregar)

- `quote_id`, `version_number`, `document_seq integer`, llave primaria de los tres; `owner_organization_id`
- `brief_text text NOT NULL`, `brief_digest text NOT NULL` — lo que se escribió para el documento (textos y
  referencias a opciones), en texto canónico con su huella
- `document_text text NOT NULL`, `document_digest text NOT NULL` — los datos del documento que produce
  `compose document` sobre el artefacto guardado, congelados para que lo emitido se regenere igual
- `template_data_version text NOT NULL` (la versión de datos de la plantilla A4)
- `stored_by_actor_kind`, `stored_by_member_id`, `command_execution_id`, `request_hash`, `stored_at`
- Corregir los textos es agregar una fila con `document_seq` mayor; rige la última.
- Disparador: rechaza una fila nueva para una versión que ya fue emitida (existe un cambio de estado a `issued` con
  ese `version_number`): lo emitido no cambia.

### Capacidades y permisos

Módulo `commercial`, alcance por defecto `tenant`. Roles reales de `src/config/role-codes.ts`.

| Capacidad | Acciones | Roles con permiso | Fuente |
| --- | --- | --- | --- |
| `commercial.quoter.catalog` | `read` | grupo de rutas `commercial` (hoy `efeonce_admin`, `efeonce_account`, `finance_admin`, `finance_analyst`) | propuesta de esta task; igual que la simulación actual |
| `commercial.quoter.catalog` | `update` (guardar un documento sucesor; no activa) | `efeonce_admin`, `finance_admin` | propuesta; el catálogo es de Commercial/Finance |
| `commercial.quoter.catalog.activate` | `execute` (mover el puntero) | `efeonce_admin`, `finance_admin` | decisión 7 |
| `commercial.quoter.simulate` | `read` | grupo de rutas `commercial` | propuesta |
| `commercial.quoter.quote` | `read`, `create`, `update` | grupo de rutas `commercial` | propuesta |
| `commercial.quoter.issue` | `approve` (emitir y retirar lo emitido) | `efeonce_admin`, `efeonce_account`, `finance_admin`; por el rol `efeonce_account`, también el sujeto máquina de un binding interno | decisión 7 (CEO, 2026-10-12) |
| `commercial.quoter.exception` | `approve` | **sólo** `efeonce_admin` | decisión 7 |

- Ninguna capacidad del cotizador actual se reutiliza: quien tiene `commercial.quotation:approve` no hereda la
  aprobación de excepciones de V3.
- Los dos actos de persona —aprobar una excepción bajo el piso y activar el puntero— exigen además persona
  identificada: una sesión de agente o un token de consumidor no los cumplen aunque el rol tenga la capacidad. Esa
  regla vive en las restricciones de la base y en los comandos (`TASK-2027` para la excepción, `TASK-2029` para la
  activación), no en el permiso. Ningún otro acto la lleva: emitir y retirar dependen sólo de la capacidad y de la
  política.
- Ningún rol de cliente recibe estas capacidades en esta task.

#### Identidad de agente

Cómo emite una identidad que no es una persona. La plataforma no tiene hoy un permiso por capacidad para el binding
de un consumidor del carril de ecosistema (`src/lib/sister-platforms/types.ts`): el consumidor guarda sólo los tipos
de alcance que admite y el binding resuelve uno (`organization | client | space | internal`). Los permisos por
capacidad de `greenhouse_core.external_capability_grants` son de personas detrás del gateway, otro mecanismo, y no
aplican a un token de consumidor. Lo que existe, y lo que el cotizador usa sin inventar nada, es el patrón de
`src/lib/api-platform/resources/ecosystem-insights-scope.ts` y `ecosystem-brand-render-scope.ts`: el adaptador del
carril deriva de un binding `internal` un `TenantEntitlementSubject` máquina (`userId: consumer:<publicId>`,
`tenantType: 'efeonce_internal'`, un rol real) y la puerta única le aplica `can()` como a cualquier sujeto.

- El sujeto máquina del cotizador lleva el rol `efeonce_account`, el que ya fija `TASK-2026` en
  `ecosystem-quoter-scope.ts`. Es el rol de menor privilegio que reúne lo que la decisión deja al agente: leer el
  catálogo, simular, crear y actualizar cotizaciones, emitir y retirar.
- El derecho del agente a emitir **es** la fila `commercial.quoter.issue:approve` → `efeonce_account` de
  `runtime.ts`. No hay una concesión aparte para una identidad no humana, ni tabla, ni columna nueva.
- Lo que la puerta comprueba para un binding: que el alcance resuelto sea `internal` y sin organización (otro alcance
  se trata como definen `TASK-2026` y `TASK-2027`), y `can(subject, capability, action, 'tenant')` sobre el sujeto
  máquina. No distingue consumidores: todo consumidor con un binding interno activo recibe el mismo sujeto (el del
  gateway MCP, que existe hoy, y `efeonce-quoter-cli`, que crea `TASK-2026`). Limitar la emisión a un consumidor
  concreto sería un mecanismo que la plataforma no tiene; quién actuó queda en
  `api_platform_command_executions.principal_id`.
- El rol `efeonce_account` no tiene `commercial.quoter.exception:approve`,
  `commercial.quoter.catalog.activate:execute` ni `commercial.quoter.catalog:update`. Aunque los tuviera, los dos
  actos de persona se rechazan por no venir de una persona.
- En el carril de aplicación, una sesión de agente (`tenant.authMode === 'agent'`) emite si su rol tiene la
  capacidad: emitir no es un acto de persona.
- El actor de un cambio de estado hecho por el sujeto máquina se guarda como `agent`, nunca como `member`.

### Adaptador PostgreSQL e importador

- `storage-postgres.ts` construye el puerto sobre una transacción recibida; no abre conexiones propias
  (`new Pool()` sólo existe en `src/lib/postgres/client.ts`).
- Lectura: devuelve el texto guardado y falla con error tipado si la huella recalculada no coincide.
- Importador: origen = todos los documentos de catálogo, política y créditos bajo `data/pricing/v3-operating/` y
  `data/pricing/v3-resources/`, más cualquier versión que un artefacto del corpus nombre y no esté ahí. Para cada
  uno: validar con el esquema del motor, calcular huella, comparar con el puntero cuando lo nombra, y guardar si
  falta. Si existe la misma `(role, version)` con otra huella, se detiene y reporta: nunca sobrescribe.
- Salida del importador: por documento, `stored | already_present | conflict`, con rol, versión y huella; nunca el
  contenido.

### Pruebas obligatorias

1. **Ida y vuelta de un artefacto.** Para cada artefacto del corpus: guardarlo como versión por el adaptador, leerlo,
   y comprobar que el texto es idéntico, que `artifact_digest` y `replay_digest` son los mismos y que la reproducción
   de su carril sobre el valor leído verifica.
2. **El resultado no se reconstruye desde columnas.** Insertar por SQL de prueba una versión cuyas columnas de índice
   (`currency`, total, `engine_version`) contradicen a propósito lo que dice su `artifact_text`; el lector debe
   devolver los valores del artefacto y la reproducción debe verificar. Además, una prueba estática: ningún archivo de
   `src/lib/commercial/quoter/` construye un artefacto o un resultado a partir de filas (el único origen de un
   resultado es `JSON.parse` del texto guardado o una llamada al motor).
3. **Huella corrupta.** Una fila cuyo texto no corresponde a su huella no entra (restricción) y, forzada en una
   tabla temporal de prueba, el lector la rechaza.
4. **Sólo agregar.** `UPDATE` y `DELETE` sobre cada tabla de historia fallan con el usuario de runtime y con el de
   operaciones.
5. **Puntero.** Guardar un documento no cambia `quoter_current_pointer`; una activación con huella previa equivocada
   falla; dos activaciones concurrentes dejan una sola fila nueva.
6. **Estados y excepción.** Un par fuera de la matriz falla; un origen que no es el vigente falla; los siete pares
   sembrados tienen `requires_human_gate = false` y un actor `agent` registra `draft → issued` e
   `issued → withdrawn`; la restricción de compuerta se ejercita con un par marcado sólo en el clúster local, donde
   un actor `agent` o `service` falla; una aprobación de excepción con una huella que no es la de su versión, o
   registrada por un actor que no es una persona, falla; una fila del puntero sin `activated_by_member_id` falla.
7. **Número.** En una base recién migrada la primera asignación real devuelve exactamente `EO-QTE-15`; la función no
   rellena ni recorta (un valor de más de seis dígitos sale entero); dos asignaciones concurrentes obtienen números
   distintos; una cotización no recibe un segundo número; una sintética no consume la secuencia real; crear un
   borrador no consume ninguna.
8. **Importador idempotente.** Segunda corrida: cero escrituras. Conflicto de versión con otra huella: se detiene.
9. **Frontera.** Ningún archivo de `src/lib/commercial/quoter/` nombra `greenhouse_commercial.quotations`.
10. **Dueña y sujeto máquina.** `resolveQuoterOwnerOrganizationId()` devuelve la fila de `EO-ORG-0007` y falla
    cerrado si no es la entidad operativa activa; ningún archivo de `src/lib/commercial/quoter/` contiene un UUID de
    organización; el sujeto máquina de un binding interno pasa la puerta para emitir y retirar, y no la pasa para
    aprobar una excepción, activar el puntero ni guardar un documento de catálogo.

Las pruebas 1 a 8 y el lector de la dueña de la 10 corren contra el clúster PostgreSQL local. Una prueba omitida por
falta de clúster no cuenta como verde: el cierre exige una corrida con el clúster arriba.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 antes de escribir cualquier migración definitiva: decide el mecanismo de comprobación de huella.
- Slice 2 → Slice 3 (el agregado referencia documentos por huella sólo como índice, pero comparte disparadores
  genéricos creados en la migración 1).
- Slice 4 puede correr en paralelo con Slice 2 y 3; su migración y su código viajan en el mismo commit.
- Slice 5 exige Slice 2 y 3, y el contrato de `TASK-2024`.
- Slice 6 al final. **Ninguna migración se aplica a la base compartida antes de Slice 6 y sin visto bueno.**

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Una migración aplicada desde local cambia producción sin que nadie lo haya decidido | migration / production | medium | Regla dura de visto bueno del operador; pruebas en clúster local; sólo objetos nuevos | Tablas `quoter_*` presentes en la base antes del Slice 6 |
| PostgreSQL altera el texto o la huella de un artefacto | data | low | Slice 1 sobre el corpus completo antes del esquema; texto en `text`, nunca `jsonb` | Prueba 1 roja |
| Historia de sólo agregar con un error de esquema: no se puede corregir editando | migration | medium | Pruebas en local; aplicar con tablas vacías; correcciones por migración nueva hacia adelante | Necesidad de un `UPDATE` sobre una tabla de historia |
| Pruebas o ejemplos en la base compartida dejan filas permanentes y consumen números | data / production | high | `data_origin = 'synthetic'` con secuencia propia; organización de pruebas; pruebas automáticas sólo en clúster local | Cotizaciones `real` creadas por una prueba, un canario o una puerta de salida |
| La siembra de capacidades llega a la base antes que el catálogo de TypeScript a producción | identity / production | medium | Misma entrega; revisar en Discovery si la prueba de paridad registro ↔ catálogo o alguna señal reacciona a filas sin entrada en el código desplegado; si reacciona, aplicar la migración 3 después del release | Señal o prueba de paridad de capacidades en rojo |
| El importador activa un catálogo por accidente | finance | low | Guardar y activar son subcomandos distintos; ningún disparador activa; prueba 5 | Fila nueva en `quoter_pointer_history` sin motivo declarado |
| La matriz de estados sembrada no coincide con el ciclo de vida que implemente la API de registro | data | low | Matriz igual a la que propone `TASK-2027`; como es dato, se amplía por una migración que sólo agrega filas | `TASK-2027` necesita un par inexistente |
| El prefijo o el arranque de la serie cambian después de emitir | finance | low | Prefijo `EO-QTE-` y arranque en 15 fijados por el CEO el 2026-10-12; viven en la función y en la secuencia, y un cambio posterior no altera números ya asignados | Petición de cambio de prefijo con cotizaciones emitidas |
| El contrato del puerto cambia mientras se escribe el adaptador | checkout compartido | medium | Slice 5 empieza con `TASK-2024` cerrada o con su contrato congelado por escrito | La batería de conformidad no compila contra el adaptador |

### Feature flags / cutover

Sin flag — additive: tablas nuevas que ningún runtime lee. Las APIs posteriores traen su propio flag
(`TASK-2026` propone `QUOTER_COMPUTE_API_ENABLED`). El cutover de esta task es la aplicación de las migraciones con
visto bueno y la importación del catálogo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | Revert; sólo pruebas locales | menos de 5 min | si |
| Slice 2 | Antes de aplicar: revert. Aplicada y sin uso: `pnpm migrate:down` con visto bueno (el reflejo del repo se reimporta) | menos de 15 min | si, mientras nada dependa del catálogo en la base |
| Slice 3 | Antes de aplicar: revert. Aplicada y sin cotizaciones reales: `pnpm migrate:down` con visto bueno | menos de 15 min | si hasta la primera cotización real; después, sin retorno por bajada y corrección sólo hacia adelante |
| Slice 4 | Bajada de la migración 3 (marca las capacidades como retiradas) y revert del catálogo y los permisos, en ese orden | menos de 15 min | si |
| Slice 5 | Revert; el importador no borra: lo importado queda como reflejo inerte | menos de 5 min | parcial: los documentos importados permanecen, por diseño |
| Slice 6 | Ver Slice 2 y 3 | — | según el estado de uso |

### Production verification sequence

1. Clúster local: aplicar las tres migraciones, correr las diez pruebas y la batería de conformidad; bajar y volver
   a subir las migraciones para comprobar que la bajada deja la base como estaba.
2. Operador: visto bueno explícito para aplicar a la base compartida. Sin él, la task queda en
   `code complete, rollout pendiente`.
3. `pnpm pg:connect:migrate`; consulta de sólo lectura que confirma tablas, disparadores, restricciones, permisos de
   `greenhouse_runtime` (sin `UPDATE` ni `DELETE`), matriz sembrada y capacidades vigentes.
4. `pnpm db:generate-types` y `pnpm pg:doctor`.
5. Operador: visto bueno para la importación. `pnpm quoter:import` en simulación, revisar el plan, luego `--apply`.
6. Segunda corrida: cero escrituras. Comparar, por documento, huella en la base contra huella en el repo.
7. Reflejar el puntero del repo con actor y motivo; comprobar que `quoter_current_pointer` nombra las tres huellas de
   `data/pricing/v3-operating/current.json`.
8. Comprobar que el cotizador actual no cambió: `pnpm staging:request /api/finance/quotes` responde como antes.

### Out-of-band coordination required

- Visto bueno del operador (CEO) para aplicar migraciones y para la importación con escritura, cada uno en su momento.
- Prefijo del número, arranque de la serie, roles que emiten y numeración sintética: resueltos por el CEO el
  2026-10-12; no requieren coordinación adicional.
- Aviso a quien esté ejecutando `TASK-2026` y `TASK-2027` cuando el esquema quede aplicado y cuando cambie cualquier
  nombre respecto de lo propuesto aquí.
- Ninguna configuración en HubSpot, Nubox, GCP, Azure ni Vercel.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El visto bueno del operador para aplicar migraciones y para importar con escritura quedó registrado en la task
      (fecha y alcance) antes de cada acción sobre la base compartida.
- [ ] Las tres migraciones empiezan con `-- Up Migration`, llevan bloque `DO` de verificación, no tienen `CREATE` bajo
      `-- Down Migration` y `pnpm migration-marker-gate` pasa.
- [ ] Ninguna migración nombra `greenhouse_commercial.quotations` ni altera un objeto existente.
- [ ] Existen las nueve tablas `greenhouse_commercial.quoter_*`, las dos vistas y las funciones de número, todas con
      dueño `greenhouse_ops`; `greenhouse_runtime` no tiene `UPDATE` ni `DELETE` sobre las tablas de historia.
- [ ] La huella de cada documento y de cada artefacto la comprueba la base al insertar (restricción o disparador,
      según el resultado del Slice 1) y el adaptador al leer.
- [ ] `UPDATE` y `DELETE` fallan en `quoter_source_documents`, `quoter_pointer_history`, `quoter_quotes`,
      `quoter_quote_numbers`, `quoter_quote_versions`, `quoter_state_transitions`, `quoter_exception_approvals` y
      `quoter_version_documents`.
- [ ] Guardar un documento no agrega una fila a `quoter_pointer_history`; una activación exige persona identificada,
      motivo y la huella del puntero que reemplaza.
- [ ] `quoter_quote_versions` rechaza un artefacto cuyo estado de cálculo no es `calculated`.
- [ ] La función de número usa un solo `nextval` y no rellena ni recorta (probado con un valor de más de seis
      dígitos); la secuencia real arranca en 15 y su primer número es `EO-QTE-15`; crear una cotización no consume
      número, una cotización no puede recibir un segundo número y una sintética no consume la secuencia real.
- [ ] La matriz de estados en TypeScript y la sembrada en la migración son iguales (`state-machine-parity.test.ts`).
- [ ] Ninguno de los siete pares sembrados exige compuerta humana: un actor `agent` registra una emisión y un retiro.
      La restricción de compuerta sigue viva (probada con un par marcado sólo en el clúster local). Una aprobación de
      excepción con un actor que no es una persona identificada falla en la base y exige la huella de su versión; una
      fila del puntero sin persona identificada falla.
- [ ] Prueba 1: los 48 artefactos del corpus se guardan y se leen con el mismo texto, el mismo `artifact_digest` y el
      mismo `replay_digest`, y su reproducción verifica.
- [ ] Prueba 2: con columnas de índice contradictorias, el lector devuelve lo que dice el artefacto; la prueba
      estática confirma que nada en `src/lib/commercial/quoter/` construye un resultado desde filas.
- [ ] `runStorageConformance` pasa contra el adaptador PostgreSQL en el clúster local.
- [ ] Las pruebas con base de datos corrieron con el clúster local arriba (evidencia de corrida, no omitidas).
- [ ] Las capacidades `commercial.quoter.catalog`, `commercial.quoter.catalog.activate`, `commercial.quoter.simulate`,
      `commercial.quoter.quote`, `commercial.quoter.issue` y `commercial.quoter.exception` existen en el
      registro, en `entitlements-catalog.ts` y otorgadas en `runtime.ts`; `commercial.quoter.exception:approve` sólo a
      `efeonce_admin`, `commercial.quoter.catalog.activate:execute` sólo a `efeonce_admin` y `finance_admin`, y
      `commercial.quoter.issue:approve` a `efeonce_admin`, `efeonce_account` y `finance_admin`.
- [ ] `capability-grant-coverage.test.ts` y la prueba de paridad registro ↔ catálogo pasan.
- [ ] El sujeto máquina de un binding interno (rol `efeonce_account`) pasa la puerta única para emitir y retirar, y
      no la pasa para aprobar una excepción, activar el puntero ni guardar un documento de catálogo (probado).
- [ ] La organización dueña de una cotización se resuelve en una sola función por el identificador público
      `EO-ORG-0007` y falla cerrado si la fila no es la entidad operativa activa; ningún archivo de
      `src/lib/commercial/quoter/` ni migración de esta task contiene un UUID de organización.
- [ ] `pnpm quoter:import --apply` dejó en la base todos los documentos de catálogo, política y créditos del repo,
      incluidas las versiones históricas que nombra el corpus; una segunda corrida no escribe; cada huella en la base
      es igual a la del repo.
- [ ] `quoter_current_pointer` nombra las mismas tres huellas que `data/pricing/v3-operating/current.json`.
- [ ] Ningún archivo de `src/lib/commercial/quoter/` nombra `greenhouse_commercial.quotations`, y ningún archivo de
      `src/lib/finance/pricing-v3/` importa algo de `src/lib/commercial/`.
- [ ] Ninguna ruta bajo `src/app/` importa `src/lib/commercial/quoter/` al cierre de esta task.
- [ ] `pnpm pricing:v3:test` sigue en verde y ningún archivo de `data/pricing/**` cambió.
- [ ] Modelo de datos, documentación funcional y manual del importador publicados; `EPIC-053` y `TASK-2026`/`TASK-2027`
      informadas de los nombres finales.

## Verification

- `pnpm migration-marker-gate`
- `pnpm vitest run src/lib/commercial/quoter` (con el clúster PostgreSQL local arriba)
- `pnpm vitest run src/lib/entitlements`
- `pnpm pricing:v3:test`
- `pnpm local:check`
- `pnpm pg:connect:status` y, con visto bueno, `pnpm pg:connect:migrate`; `pnpm db:generate-types`; `pnpm pg:doctor`
- `pnpm quoter:import` (simulación) y `pnpm quoter:import --apply` (con visto bueno), dos veces
- Consulta de sólo lectura de verificación de objetos, permisos y siembra (adjuntar el SQL y el resultado a la task)
- `pnpm test` (suite completa) al cierre; `pnpm build` sólo con autorización del operador
- `pnpm docs:closure-check` y `pnpm qa:gates --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `EPIC-053` refleja la puerta de salida de la fase 2 («catálogo vigente importado; huellas en la base = huellas
      del repo») con su evidencia
- [ ] si el estado es código completo sin migraciones aplicadas, la task se reporta como
      `code complete, rollout pendiente` y no se mueve a `complete/`
- [ ] CLAUDE.md §«Data Architecture» menciona `greenhouse_commercial` entre los esquemas activos si sigue sin
      figurar (deriva documental detectada al planificar)

## Follow-ups

- Comandos gobernados y eventos de cotización: `TASK-2027`.
- Lectura del catálogo y del puntero por la API, con su señal de confiabilidad: `TASK-2026`.
- Autoridad del catálogo en la plataforma y exportación al repo: `TASK-2029`.
- Extender la guarda de artefactos congelados a las versiones guardadas (todo cambio del motor reproduce también lo
  persistido): exige un corpus exportado o un trabajo de reproducción; decidir dueño en `EPIC-053`.
- Vínculo de las propuestas de licitación con una cotización de V3: unidad de retiro del cotizador actual.

## Open Questions

- **Quién puede guardar un documento de catálogo sin activarlo.** Propuesto: `efeonce_admin` y `finance_admin`.
- **Asignar la destinataria después de crear.** La identidad es inmutable, así que hoy sólo se declara al crear; si
  hace falta, es una tabla de sólo agregar como la del número. No bloquea.
- **Cómo decide el servidor que una cotización es sintética.** La numeración aparte está aprobada; la regla la
  propone `TASK-2027` y el esquema sólo guarda el resultado (`data_origin`).
- **Dónde corre la reproducción de lo persistido** cuando cambie el motor (ver Follow-ups).

Resueltas por el CEO el 2026-10-12 (ya no abiertas):

- **Prefijo y arranque del número público.** `EO-QTE-`; la serie real empieza en 15 (`EO-QTE-15`), sin relleno.
- **Quién puede emitir.** `efeonce_admin`, `efeonce_account`, `finance_admin` y los agentes, dentro de política y sin
  aprobación de una persona. Retirar sigue el mismo principio.
- **Organización dueña.** Efeonce siempre, por referencia estable.
- **Organización destinataria obligatoria o no.** Cliente o potencial cliente; opcional en un borrador y obligatoria
  para emitir.
- **Momento del número.** En la primera emisión, en una tabla de sólo agregar para no actualizar la identidad.
- **Cotizaciones de ejemplo en la base compartida.** Sintéticas, con numeración aparte.
