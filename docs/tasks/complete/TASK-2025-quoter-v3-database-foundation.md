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
- **Diseño cerrado en Discovery (2026-10-12), ya incorporado al cuerpo:** destinataria en tabla propia de sólo
  agregar (hoy doce tablas); huella de artefacto única por cotización y no en el registro; una sola puerta de escritura
  con `command_execution_id` obligatorio; sin vínculo con el negocio; migraciones en `pending-migrations/` hasta el
  visto bueno; permisos por rol y `can()` con literales; SQL directo sobre cliente recibido; huella por disparador.
- **Lectura final del diseño (sesión consultora, 2026-10-12), ya incorporada al cuerpo y al SQL pendiente.** Ninguna
  migración estaba aplicada, así que se corrigió en el esquema y no con una migración hacia adelante:
  1. El historial de estados tiene orden propio: `transition_seq` por cotización, asignado bajo bloqueo. El estado
     vigente es el de la fila de mayor `transition_seq`, no el de la hora más reciente.
  2. `data_origin` no tiene valor por defecto: quien crea lo declara, y lo decide la identidad, no el pedido.
  3. Toda fila inmutable guarda `*_principal_id NOT NULL`: el registro de comandos caduca y `command_execution_id`
     queda como referencia blanda.
  4. Emitir nombra la última versión **o la última emitida** (volver a lo que el cliente tenía), y fija el documento
     que se emitió (`document_seq` y `document_digest`). El documento se escribe en `draft` y en `revising`.
  5. Emitir apunta a una versión real con su huella por llave foránea compuesta; una cotización emitida o retirada
     no recibe versiones (primero `issued → revising`).
  6. La regla del piso vive también en la base: la versión guarda `below_floor` y emitir una versión bajo el piso
     exige una aprobación vigente. Las aprobaciones son decisiones `approved | revoked`; rige la última.
  7. El número lo asigna la base en la primera emisión, desde un contador por serie (sin huecos). La serie real
     empieza en **15001**: la primera cotización real es `EO-QTE-15001` (aclarado por el CEO; no `EO-QTE-15`).
  8. Los índices de lectura de una versión viven en una tabla hermana reconstruible, no en la fila inmutable.
  9. Cada rechazo de un disparador lleva `CONSTRAINT = '<nombre>'`; el código lee ese nombre, nunca el mensaje.
  10. `REVOKE` explícito al runtime (el esquema concede `UPDATE` y `DELETE` por defecto) y verificación por nombre.
  11. El puntero: sin único en `pointer_digest`; persona exigida sólo en `platform_activation`; un reflejo del repo
      nombra su commit. Los documentos importados nombran su archivo y su commit.
- **Ciclo de vida después de emitir (aprobado por el CEO el 2026-10-12; ADR, decisión 5; commit `3cc560f52`).**
  Se suman los estados `accepted` y `rejected` y una fecha de vigencia que fija cada emisión (`valid_until`).
  «Vencida» no es un estado guardado: se deriva de esa fecha en un solo lugar (`quoter_quote_current.effective_state`)
  y la base no deja aceptar una cotización vencida. Trece pares en la matriz, ninguno con compuerta humana: un agente
  aplica todos los estados. Sólo `withdrawn` es terminal. Fuera de alcance: enviada y vista, ganada y perdida, un
  proceso que marque vencidas, y que el documento imprima la vigencia registrada.
- **Una sola lectura del veredicto del motor.** `replayFrozenArtifact` (`src/lib/finance/pricing-v3/adapters/
  frozen-artifact.ts`) reproduce un artefacto de cualquier carril y dice, sobre el resultado **recalculado**, si
  calculó y si alguna fila está bajo el piso. El almacén guarda eso; `artifact-index.ts` ya no lo lee del texto.
- **Una aprobación se revoca sólo mientras su versión no se haya emitido**; después, el acto es retirar.
- **Aceptar una cotización vencida se permite (CEO, 2026-10-12).** La regla que lo impedía no protegía (bastaba
  re-emitir y aceptar en dos pasos) y borraba el dato de que se aceptó tarde. Se quitó del disparador y del almacén;
  que una aceptación fue fuera de vigencia, y por cuántos días, se lee derivado en `quoter_quote_current`
  (`accepted_after_validity`, `accepted_days_after_validity`). Un tope de antigüedad («pasados N días hay que
  cotizar de nuevo») sería una regla de catálogo decidida por el CEO; hoy no existe.
- **Un documento fuente se guarda como se recibió**, igual que un artefacto y un puntero. La batería lo exigió: una
  cotización calculada con un documento lo lleva dentro, y con `stableJson(documento)` el artefacto calculado en la
  plataforma no salía byte a byte igual al de la CLI (caso 8). Dos huellas: `document_text_digest` (del texto, la
  comprueba la base) y `document_digest` (de identidad, la que nombra el puntero).
- **Lectura independiente del SQL (revisor de la sesión consultora, ~120 sondas en PostgreSQL 16).** Las quince
  correcciones aguantaron. Hallazgos nuevos, ya incorporados: `greenhouse_migrator` recibe `ALL` por defecto en el
  esquema y podía darle un número a un borrador (se le revoca todo y queda con `SELECT`); las reglas de «leer lo
  vigente y escribir» sólo valen bajo `READ COMMITTED` (otro aislamiento se rechaza,
  `quoter_requires_read_committed`); un miembro vacío (`''`) pasaba por identificado; la hora de cada fila la fija el
  reloj de la base; la bajada de una migración aborta si hay una cotización real; `search_path` de la función
  `SECURITY DEFINER` con `pg_temp` explícito; una transacción escribe una sola cotización.
- **Lectura de la base compartida antes de pedir el visto bueno (sólo lectura, 2026-10-12).** PostgreSQL 16.14,
  UTF8, `READ COMMITTED` por defecto; `sha256` inmutable y `convert_to` estable, igual que en local; `EO-ORG-0007` es
  la entidad operativa activa y es la única; ninguna tabla `quoter_*` ni capacidad `commercial.quoter.*` todavía;
  `pnpm migrate:status` sin migraciones pendientes de otra sesión. **Y un defecto que habría abortado la migración
  en producción:** la aplicación entra como `greenhouse_app`, que **hereda** de `greenhouse_runtime` (un grupo que no
  inicia sesión), y el bloque de verificación exigía que `greenhouse_app` no tuviera `INSERT`. Corregido: se concede
  al grupo, se comprueba el privilegio efectivo de los usuarios que entran (`greenhouse_app`,
  `greenhouse_migrator_user`), y el carril local reproduce esos roles y membresías; las pruebas conectan como
  `greenhouse_app`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Status real: `Completa y aplicada (2026-10-12): tres migraciones en la base compartida, 24 documentos del catálogo importados y el puntero reflejado; sin cotizaciones todavía. El build local no se verificó: la compuerta es el CI del push`
- Rank: `EPIC-053-02 (fase 2 del programa)`
- Domain: `finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea en `greenhouse_commercial`, bajo el prefijo único `quoter_`, la base del cotizador V3 en la plataforma: los
documentos de catálogo, política y créditos guardados por huella; el historial del puntero de versiones vigentes; la
identidad de una cotización, su organización destinataria y su número público; sus versiones inmutables, que son el
artefacto congelado tal cual; los cambios de estado y las aprobaciones de excepción como historial de sólo agregar,
con la matriz como dato; y los datos del documento por versión.
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
- **Las migraciones no viven en `migrations/` hasta el visto bueno.** `pnpm migrate:up` aplica todo lo pendiente, así
  que una migración commiteada y sin aplicar la aplicaría cualquier sesión que migre lo suyo. Se escriben y se prueban
  como `docs/tasks/pending-migrations/TASK-2025-*.sql.pending` (convención de esa carpeta); en el Slice 6, con el
  visto bueno, nacen en `migrations/` con `pnpm migrate:create <slug>` y reciben ese contenido.
- Migraciones que sólo agregan (expand). Ninguna modifica ni lee `greenhouse_commercial.quotations*`.
- Cada migración empieza con `-- Up Migration`, lleva su bloque `DO $$ … RAISE EXCEPTION` de verificación y deja bajo
  `-- Down Migration` sólo sentencias de deshacer. SQL compatible con PostgreSQL 16, la versión de la base.
- **Una sola puerta de escritura al agregado.** Toda fila de cotización, versión, estado, destinataria, número,
  excepción o documento la escribe una función de `quote-store.ts`, dentro de la transacción que recibe. El adaptador
  del puerto, el importador y los comandos de `TASK-2027` llaman a esas mismas funciones; ninguno escribe SQL propio
  sobre esas tablas. La base lo respalda: versión y cambio de estado exigen `command_execution_id`.
- Nada se actualiza, se borra ni se trunca en las tablas de historia: versiones, cambios de estado, destinatarias,
  historial del puntero, documentos por huella y datos de documento son de sólo agregar, con disparadores que lo
  hacen cumplir para todo rol, también para el dueño.
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
- Los almacenes usan SQL directo sobre un cliente recibido (`Pick<PoolClient, 'query'>`, el patrón de
  `src/lib/efeonce-insights/stores/db.ts`), no Kysely tipado: `src/types/db.d.ts` se regenera leyendo la base real y
  no conoce `quoter_*` hasta que las migraciones se apliquen.

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

- `docs/tasks/pending-migrations/TASK-2025-quoter-source-documents-and-pointer.sql.pending`,
  `TASK-2025-quoter-quote-aggregate.sql.pending` y `TASK-2025-quoter-capabilities.sql.pending` hasta el visto bueno;
  después `migrations/<timestamp>_task-2025-…sql` (nombres generados por `pnpm migrate:create`).
- `scripts/commercial/quoter-local-pg.mjs` y el script `quoter:test:local` (clúster local: roles, tablas núcleo
  mínimas, aplicación de las migraciones pendientes, ida-vuelta-ida y corrida de las pruebas como `greenhouse_runtime`).
- `src/lib/finance/pricing-v3/__tests__/storage-conformance.ts` (declaración `acceptsOnlyCalculated` del sujeto).
- `src/types/db.d.ts` (regenerado).
- `src/lib/commercial/quoter/` (nuevo): `storage-postgres.ts`, `source-documents-store.ts`, `pointer-store.ts`,
  `quote-store.ts`, `state-machine.ts`, `authz.ts`, `errors.ts`, `events.ts`, `canonical-text.ts`, `index.ts` y sus
  tests (`*.test.ts`, `local-postgres.test.ts`, `boundary-domain.test.ts`, `state-machine-parity.test.ts`) y
  `db.ts` (cliente recibido).
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
  `quoter_pointer_history`, `quoter_quotes`, `quoter_quote_recipients`, `quoter_quote_number_counters`,
  `quoter_quote_numbers`, `quoter_quote_versions`, `quoter_quote_version_index`, `quoter_state_matrix`,
  `quoter_state_transitions`, `quoter_exception_approvals`, `quoter_version_documents`; vistas
  `quoter_current_pointer` y `quoter_quote_current`; funciones de bloqueo, de estado vigente y de asignación de
  número.
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
  - El estado vigente, la destinataria vigente, el documento vigente y la decisión vigente sobre una excepción se
    leen por un correlativo propio asignado bajo el bloqueo de la cotización, nunca por la hora.
  - Emitir nombra una versión real con su huella (la última o la última emitida) y el documento que rige para ella
    con su huella; exige destinataria y, si la versión está bajo el piso, una aprobación vigente. Lo comprueba la
    base, no sólo el código.
  - Una cotización emitida, aceptada, rechazada o retirada no recibe versiones (se abre antes una revisión); un
    documento se escribe en `draft` o en `revising`.
  - Toda emisión declara hasta qué día vale y no nace vencida. Aceptar y rechazar nombran lo último que se emitió.
    «Vencida» se deriva en un solo lugar. Aceptar una vencida se permite y queda legible que fue fuera de vigencia.
    Sólo `withdrawn` es terminal.
  - Estas tablas sólo se escriben bajo `READ COMMITTED`; una transacción escribe una sola cotización.
  - Ningún rol distinto del dueño escribe números, contador ni matriz; el rol de migraciones no escribe ninguna
    fila del cotizador.
  - Si una versión calculó y si está bajo el piso lo dice el motor sobre el resultado recalculado, en una sola
    función; nadie más reimplementa ese criterio.
  - La hora de un cambio de estado es la del reloj de la base; quien llama no puede declarar otra.
  - Toda fila inmutable dice quién actuó (`*_principal_id`), sin depender del registro de comandos.
  - Cada regla que la base hace cumplir tiene nombre, y el código responde por ese nombre.
  - La organización dueña de toda cotización es la canónica de Efeonce; la destinataria, cuando existe, es una
    organización cliente o potencial cliente y no confiere acceso. Se asigna en una tabla de sólo agregar: rige la
    última, se puede reasignar mientras la cotización esté en `draft` y queda congelada desde la primera emisión.
  - El mismo cálculo no es dos versiones de una cotización (`(quote_id, replay_digest)` único). La huella no es
    única en el registro: la identidad de una versión es `(quote_id, version_number)`. Que un cálculo viva en una
    sola cotización no retirada lo hace cumplir la función de escritura, bajo bloqueo, no una restricción: una
    restricción global dejaría sin salida a quien retira un borrador y vuelve a registrar el mismo cálculo.
  - Ninguna versión ni cambio de estado entra sin `command_execution_id`.
  - Una decisión sobre una excepción (aprobar o revocar) vale para una versión y una huella de artefacto, sólo la
    registra una persona identificada, y sólo existe para una versión que el motor marcó bajo el piso.
  - Una versión guarda sólo un artefacto con estado de cálculo `calculated`.
  - El número público lo asigna la base una sola vez por cotización, en la transacción de su primera emisión, desde
    un contador por serie que sólo avanza de a uno: sin huecos y sin que nadie lo elija. La serie real empieza en
    15001 (`EO-QTE-15001`), sin relleno.
  - El registro no escribe ni lee `greenhouse_commercial.quotations*`.
- Write-target allowlist: el dominio comercial no tiene prueba de frontera; esta task la crea para el cotizador
  (`src/lib/commercial/quoter/boundary-domain.test.ts`) con las tablas `quoter_*` en que el runtime inserta (todas
  menos la matriz, el contador y los números) más `greenhouse_sync.outbox_events` como únicos destinos de escritura,
  cada uno con su justificación.
- Tenant/space boundary: `quoter_quotes.owner_organization_id` es obligatorio, referencia
  `greenhouse_core.organizations` y es siempre la organización canónica de Efeonce, la cree una persona o un agente
  (CEO, 2026-10-12). La resuelve el servidor por referencia estable; nunca sale del pedido ni de un UUID escrito en
  código (ver «Organización dueña y destinataria»). Las tablas hijas la repiten y un disparador comprueba que coincide
  con la del padre. El alcance de autorización es la identidad interna con su capacidad, no «la organización de quien
  llama». La organización destinataria es contenido validado de la cotización, por llave foránea en
  `quoter_quote_recipients`, y no confiere acceso. Catálogo y puntero son de Efeonce y no llevan organización.
- Idempotency/concurrency: la idempotencia de comandos usa la tabla única `api_platform_command_executions`; no se
  crea una segunda. Cada fila escrita por un comando guarda `command_execution_id` y `request_hash` como referencia
  blanda (esa tabla se purga), y `*_principal_id` como huella permanente de quién actuó. Concurrencia: control
  optimista por huella en el puntero; un bloqueo transaccional por cotización (`quoter_lock_quote`, de dos claves)
  que toman el almacén y todos los disparadores que leen «lo vigente»; un bloqueo por cálculo, siempre antes que el
  de la cotización; unicidad `(quote_id, version_number)`.
- Audit/outbox/history: las propias tablas son el historial. Eventos en la misma transacción para documento guardado
  y puntero activado; los eventos de cotización nacen con los comandos de `TASK-2027`.

### Migration, backfill and rollout

- Migration posture: `additive` (tres migraciones) más `seed` (matriz de estados y capacidades). Pendientes en
  `docs/tasks/pending-migrations/` hasta el visto bueno.
- Default state: tablas vacías y sin lectores en runtime. Ningún flag: nada las consulta hasta `TASK-2026`.
- Backfill plan: importador `pnpm quoter:import` en modo simulación por defecto; `--apply` para escribir; idempotente
  por huella (una segunda corrida no escribe nada); activar el puntero es un subcomando aparte con actor y motivo.
  No hay cotizaciones que migrar: no existe ninguna real en el cotizador actual.
- Rollback path: antes de que exista una cotización real, migración de bajada (elimina objetos vacíos o con sólo
  reflejo del repo, que se puede reimportar). Después de la primera cotización real, sin retorno por bajada: la
  corrección es una migración nueva hacia adelante.
- External coordination: visto bueno del operador para aplicar migraciones y para la primera importación con
  escritura. El prefijo del número y el arranque de la serie (15001) quedaron fijados por el CEO el 2026-10-12: ya
  no requieren confirmación. El importador sólo acepta archivos commiteados y empujados: importar el catálogo vigente
  exige que esté en el remoto, y empujar es decisión del operador.

### Security and access

- Auth/access gate: capacidades `commercial.quoter.*` resueltas en una sola puerta
  (`src/lib/commercial/quoter/authz.ts`) con `can(subject, capability, action, scope)`; nunca `roleCodes.includes`.
  Una identidad de agente pasa por la misma puerta como sujeto máquina derivado de su binding interno (ver
  «Identidad de agente»).
- Sensitive data posture: documentos y artefactos llevan costos y márgenes internos; ningún dato de nómina ni de
  personas. Permisos de base: `REVOKE ALL` y luego `SELECT` e `INSERT` para `greenhouse_runtime` en las tablas de
  historia (el esquema concede `UPDATE` y `DELETE` por defecto a toda tabla nueva: se quitan a mano y el bloque de
  verificación lo comprueba con `has_table_privilege`); sólo `SELECT` en números, contador y matriz; `UPDATE` sólo
  en el índice de lectura. Dueño `greenhouse_ops`. Los eventos llevan identificadores, versión, estado y huellas,
  nunca el texto.
- Error contract: errores tipados del dominio en `src/lib/commercial/quoter/errors.ts`, que dejan pasar
  `PricingV3Error` sin redefinir sus códigos y traducen cada rechazo con nombre de la base
  (`QUOTER_CONSTRAINT_CODES`) a su código; `captureWithDomain(err, 'commercial', …)`. La traducción a HTTP es de
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

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio
      (`src/lib/commercial/quoter/boundary-domain.test.ts`), en el mismo cambio.
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

### Slice 1 — Prueba de ida y vuelta de huellas (antes de escribir el esquema definitivo)

- Contra el clúster PostgreSQL local: para cada uno de los 48 artefactos y para cada documento de catálogo, política
  y créditos del repo, guardar su texto (el artefacto como está en el repo; el documento fuente como
  `stableJson(validado)`) en una columna `text`, leerlo, y comprobar que (a) el texto leído
  es idéntico, (b) `encode(sha256(convert_to(texto, 'UTF8')), 'hex')` calculado por PostgreSQL es igual al sha256
  calculado en Node sobre el mismo texto, y (c) la reproducción del artefacto leído verifica con su huella.
- Antes de eso, el carril local reproducible: `scripts/commercial/quoter-local-pg.mjs` (`pnpm quoter:test:local`)
  crea en el clúster local una base desechable con los roles `greenhouse_ops` y `greenhouse_runtime` y las tablas
  núcleo mínimas, aplica la mitad `Up` de las migraciones pendientes, las baja y las vuelve a subir, y corre las
  pruebas conectando como `greenhouse_runtime`. Una prueba omitida por falta de clúster no cuenta.
- Volatilidad medida (clúster local, PostgreSQL 16.15, la versión de la base real): `sha256(bytea)` es inmutable y
  `convert_to(text, name)` es `STABLE`. Por la regla de este slice la comprobación de huella va como disparador
  `BEFORE INSERT`, con las funciones calificadas por esquema.
- Verificar que cada artefacto del corpus declara un solo `engineVersion` y un solo contrato de entrada. Si alguno
  trae más de uno, `engine_version` y `contract_version` guardan el mayor y siguen siendo sólo índices de lectura.
- El resultado decide el mecanismo y queda escrito en el documento de modelo de datos. Si alguna huella difiere, la
  task se detiene y se reporta: el diseño de «texto en `text`, sin reserializar» no se cambia por un atajo.

### Slice 2 — Catálogo por huella y puntero

- Migración 1 (pendiente): `quoter_source_documents`, `quoter_pointer_history`, vista `quoter_current_pointer`,
  disparadores de sólo agregar (rechazan `UPDATE`, `DELETE` y `TRUNCATE`), de huella del texto y de control optimista
  del puntero, todos con rechazo nombrado; `REVOKE` y permisos; bloque de verificación por nombre de disparador y por
  privilegio.
- `source-documents-store.ts` y `pointer-store.ts` (SQL directo sobre el cliente de la transacción recibida), con
  comprobación de huella al leer.
- Eventos `commercial.quoter.source_document.stored` y `commercial.quoter.pointer.activated` publicados con
  `publishOutboxEvent(event, client)` dentro de la misma transacción; registrados en el catálogo de eventos.

### Slice 3 — Agregado de cotización

- Migración 2 (pendiente): `quoter_quotes`, `quoter_quote_versions`, `quoter_quote_version_index`,
  `quoter_state_matrix` (con su siembra), `quoter_version_documents`, `quoter_exception_approvals`,
  `quoter_state_transitions`, `quoter_quote_recipients`, `quoter_quote_number_counters` (con su siembra: real 15001,
  sintética 1), `quoter_quote_numbers`, vista `quoter_quote_current`, funciones `quoter_lock_quote` y
  `quoter_quote_state`, disparadores con rechazo nombrado, `REVOKE` y permisos, bloque de verificación.
- `quote-store.ts`, la única puerta de escritura al agregado: crear identidad con su versión 1 y su primer estado en
  una transacción, agregar versión (sobre una emitida registra antes `issued → revising`), registrar un cambio de
  estado (emitir fija versión y documento, y devuelve el número), asignar o reasignar la destinataria, decidir una
  excepción (`decideException`: aprobar o revocar), guardar datos de documento, leer versión (texto guardado y
  huellas verificadas) y reconstruir su índice de lectura (`rebuildVersionIndex`). No asigna números: lo hace la
  base. Toda escritura recibe el contexto del comando (`commandExecutionId`, huella del pedido) y el actor con su
  `principalId`. Antes de guardar una versión toma un bloqueo por `replay_digest` y rechaza si ese cálculo ya vive
  en una cotización no retirada. Ninguna de estas funciones queda expuesta por una ruta en esta task. Crear
  identidad recibe la organización dueña ya resuelta por `resolveQuoterOwnerOrganizationId()`; nunca un valor de
  quien llama a la API.
- `errors.ts`: registro cerrado de códigos y `QUOTER_CONSTRAINT_CODES`, el mapa nombre de rechazo → código, con
  `constraint-names.test.ts` (todo `RAISE` nombrado tiene su código y ninguna entrada sobra).
- `state-machine.ts` con la matriz en TypeScript y `state-machine-parity.test.ts`, que lee el bloque sembrado de la
  migración y exige igualdad; la misma comparación corre contra las filas reales en el clúster local.

### Slice 4 — Capacidades, permisos y puerta única

- Migración 3: siembra de las capacidades de `## Detailed Spec` en `greenhouse_core.capabilities_registry`, con su
  bloque de verificación.
- Entradas en `src/config/entitlements-catalog.ts` y permisos en `src/lib/entitlements/runtime.ts`, en el mismo
  commit que la migración. Los permisos se otorgan **por rol explícito** (los cuatro roles que hoy tienen el grupo de
  rutas `commercial`) además de por el grupo: `can()` no deriva grupos de rutas del rol, y el sujeto máquina de un
  binding interno lleva `routeGroups: ['internal']`.
- `authz.ts`: un único núcleo que recibe un `TenantEntitlementSubject`, para que rutas, Nexa y el carril de
  ecosistema compartan la misma puerta. Cada necesidad se resuelve con una llamada `can(subject, '<capacidad>',
  '<acción>', 'tenant')` escrita **con literales**: la guarda `capability-grant-coverage.test.ts` sólo ve literales, y
  un mapa necesidad → capacidad dejaría estas capacidades sin cubrir.
- `authz.ts` exporta también `resolveQuoterOwnerOrganizationId()` (organización canónica de Efeonce por `public_id`),
  y una prueba fija qué puede y qué no puede el sujeto máquina de un binding interno (ver «Identidad de agente»).
- `capability-grant-coverage.test.ts` en verde.

### Slice 5 — Adaptador PostgreSQL del puerto e importador

- `storage-postgres.ts`: implementa `PricingV3Storage` sobre los almacenes y sobre la transacción que recibe. Para
  artefactos el `locator` es el `quote_id`: con él agrega una versión a esa cotización; sin él crea la cotización
  (identidad, versión 1 y `none → draft`) con el contexto de comando con que se construyó el adaptador. Siempre por
  las funciones de `quote-store.ts`.
- La batería de `TASK-2024` gana dos declaraciones del sujeto. `acceptsOnlyCalculated`: para este adaptador los
  artefactos no calculados deben ser **rechazados** (se prueba; el corpus tiene uno) y quedan fuera de los casos de
  ida y vuelta. `pointerNamesOnlyHeldDocuments`: un puntero sólo entra si sus tres documentos ya están guardados, así
  que el caso 7 los guarda primero y el caso del puntero que nombra un documento ausente espera el rechazo. El caso
  3 pasa `replayDigest` (este adaptador no direcciona por ruta: `locator` devuelve `undefined`). Para archivos y
  memoria nada cambia.
- Ejecutar `runStorageConformance` contra este adaptador en el clúster local, con una base desechable por almacén
  vacío.
- `scripts/commercial/quoter-import.ts` (`pnpm quoter:import`): recorre los documentos del repo, calcula su huella
  con `catalogDigest`, y guarda los que falten. Rechaza un archivo con cambios sin commitear o cuyo commit no está en
  el remoto, y guarda el SHA del commit con cada fila. Subcomando separado para reflejar el puntero del repo, con
  `--reason` obligatorio y el mismo SHA: el reflejo no exige una persona (la decisión fue el commit); activar en la
  plataforma, sí.
- Pruebas de `## Detailed Spec` §«Pruebas obligatorias».

### Slice 6 — Aplicación con visto bueno, importación y documentación

- Pedir al operador el visto bueno. Con él: `pnpm migrate:create <slug>` por cada migración pendiente, copiar su
  contenido, retirar el archivo `.sql.pending`, `pnpm migration-marker-gate`, `pnpm pg:connect:migrate`,
  `pnpm db:generate-types` y verificar por consulta.
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
- Vincular una cotización con un negocio (deal). La fila de identidad no admite cambios y una cotización suele nacer
  antes que el negocio; además, la auditoría midió que 45 de 64 `hubspot_deal_id` no existen en
  `greenhouse_commercial.deals`, así que una llave foránea bloquearía vínculos reales. El vínculo se diseña junto con
  la salida a HubSpot (decisión abierta de `EPIC-053`), como asignación de sólo agregar.

## Detailed Spec

Nombres propuestos. Discovery puede ajustar tipos y columnas de índice; no las invariantes ni el prefijo.

### Texto guardado y huellas

Regla (decidida el 2026-10-12 con la batería de conformidad de `TASK-2024`): **lo que se guarda es el texto que se
recibió, tal cual; nadie lo reserializa, lo ordena ni lo normaliza.** Cada objeto lleva dos huellas con funciones
distintas: la **huella del texto** (sha256 de los bytes guardados; la comprueba la base) y la **huella de identidad**
(la que define el motor; la calcula el almacén al escribir). Sólo en los datos del documento del cliente el texto
guardado es `stableJson(valor)`, así que ahí las dos coinciden y basta una columna.

| Objeto | Texto guardado | Huella del texto (la comprueba la base) | Huella de identidad (la verifica el adaptador) |
| --- | --- | --- | --- |
| Documento de catálogo, política o créditos | el documento **como se recibió**, con su sangría y su orden de claves | `document_text_digest` = sha256 del texto | `document_digest` = `catalogDigest(documento validado)`, la que lleva el puntero |
| Puntero | el texto del puntero **como se escribió** (opaco) | `pointer_text_digest` = sha256 del texto | `pointer_digest` = `currentVersionsDigest(puntero)` |
| Artefacto congelado | el texto del artefacto **como se emitió**, con su sangría y su orden de claves | `artifact_digest` = sha256 del texto | `replay_digest`, el que el artefacto declara y la reproducción recalcula |
| Datos del documento del cliente | `stableJson(datos)` | `document_digest` = sha256 del texto | la misma |

Por qué un documento fuente tampoco: una cotización calculada con él lo lleva dentro. Con el texto canónico el
artefacto calculado en la plataforma tenía la misma huella de reproducción pero otros bytes que el de la CLI, y la
paridad de archivo entre transportes (`TASK-2028`) se rompía. Lo destapó el caso 8 de la batería contra PostgreSQL.

Por qué el artefacto y el puntero no se guardan como `stableJson`: la batería de `TASK-2024` exige que un artefacto se
lea byte a byte como se escribió y que el puntero viaje como texto opaco; `stableJson` reordena las claves y ese
orden no se recupera. Sin esos bytes no hay paridad de archivo entre transportes (`TASK-2028`).

`canonical-text.ts` es el único lugar del servidor que calcula huellas de texto y que produce `stableJson` para los
objetos que lo usan; reutiliza `stableJson` del motor. No transforma un artefacto ni un puntero.

### `quoter_source_documents` (sólo agregar)

- `role text NOT NULL CHECK (role IN ('catalog','policy','credits'))`
- `version text NOT NULL`
- `document_digest text NOT NULL CHECK (document_digest ~ '^[0-9a-f]{64}$')` — huella de identidad
- `document_text text NOT NULL` — como se recibió — y `document_text_digest text NOT NULL`, huella del texto
- `schema_version text` (índice: el `schemaVersion` que declara el documento)
- `parent_digest text` (el documento al que sucede, cuando lo declara)
- `origin text NOT NULL CHECK (origin IN ('repo_import','artifact_embedded','platform_apply'))`
- `source_path text` (ruta del repo cuando `origin = 'repo_import'`; ruta del artefacto que lo trae dentro cuando
  `origin = 'artifact_embedded'`: una versión que no existió como archivo propio) y `source_commit_sha text` (40
  hexadecimales): los dos obligatorios salvo en `platform_apply` (`quoter_source_documents_origin_names_its_source`)
- `stored_by_actor_kind text NOT NULL CHECK (stored_by_actor_kind IN ('member','agent','service'))`,
  `stored_by_member_id text`, `stored_by_principal_id text NOT NULL`,
  `reason text NOT NULL CHECK (length(btrim(reason)) >= 5)`
- `command_execution_id text` (referencia blanda; el importador no corre bajo un comando),
  `request_hash text CHECK (request_hash ~ '^[0-9a-f]{64}$')`
- `stored_at timestamptz NOT NULL DEFAULT now()`
- Llave primaria `(role, document_digest)`; única `(role, version)`: una versión ya usada no cambia de contenido.
- Comprobación de `document_text_digest` sobre `document_text` por disparador `BEFORE INSERT` (resultado del Slice 1).
- Disparadores: rechazo de `UPDATE`, de `DELETE` y de `TRUNCATE`. Vale para todas las tablas de sólo agregar de esta
  task: sin el rechazo de `UPDATE` la huella se podría saltar reescribiendo el texto.
- **Lectura.** El lector comprueba el sha256 del texto y nada más: no vuelve a pasar el documento por el validador
  de su rol, que es el de hoy. Un documento guardado bajo un contrato anterior tiene que seguir siendo legible
  mientras un artefacto lo nombre. La identidad se compara por columnas (rol, versión, huella), que se derivaron
  del valor validado al escribir.
- **Rechazos con nombre (vale para todas las tablas de esta task).** Cada `RAISE` de un disparador usa
  `USING ERRCODE = 'check_violation', CONSTRAINT = '<nombre>'`, y cada restricción de tabla que el código necesita
  distinguir lleva nombre explícito. `QUOTER_CONSTRAINT_CODES` en `errors.ts` es el único lugar que lee esos nombres.
- **Permisos (ídem).** `REVOKE ALL … FROM greenhouse_runtime, greenhouse_app` y después lo justo. Los privilegios
  por defecto del esquema (migración de TASK-345) dan `SELECT`, `INSERT`, `UPDATE` y `DELETE` al runtime en toda
  tabla nueva de `greenhouse_ops`; el clúster local los copia para que el olvido falle ahí.
- **Cabecera (ídem).** `SET LOCAL lock_timeout = '5s'`: la migración no se queda esperando un bloqueo en la base
  compartida.

### `quoter_pointer_history` (sólo agregar)

- `pointer_seq bigint PRIMARY KEY`, asignado por el disparador bajo bloqueo (correlativo, sin huecos)
- `pointer_digest text NOT NULL` (identidad; **sin único**: volver a un puntero anterior, byte a byte, es legítimo
  y una tabla de la que nada se borra no puede prohibirlo para siempre), `pointer_text text NOT NULL` (como se
  escribió), `pointer_text_digest text NOT NULL` con comprobación de huella del texto
- `previous_pointer_digest text` — obligatorio salvo en la primera fila
- `catalog_digest`, `policy_digest`, `credits_digest`: cada una con llave foránea nombrada a
  `quoter_source_documents (role, document_digest)` con el rol fijo correspondiente
- `origin text NOT NULL CHECK (origin IN ('repo_mirror','platform_activation'))`
- `activated_by_member_id text` — obligatorio en `platform_activation`
  (`quoter_pointer_history_activation_needs_person`): activar en la plataforma es siempre un acto de una persona
  identificada. Un reflejo del repo no la exige: la persona decidió al commitear el archivo
- `activated_by_principal_id text NOT NULL`
- `source_commit_sha text` — obligatorio en `repo_mirror` (`quoter_pointer_history_mirror_names_its_commit`)
- `reason text NOT NULL CHECK (length(btrim(reason)) >= 5)`
- `command_execution_id text`, `request_hash text`, `activated_at timestamptz NOT NULL DEFAULT now()`
- Disparador `BEFORE INSERT`: toma un bloqueo transaccional de dos claves, lee la fila de mayor `pointer_seq` y
  rechaza (`quoter_pointer_history_follows_current`) si `previous_pointer_digest` no es su `pointer_digest` (o si no
  es nulo con la tabla vacía).
- Disparadores: rechazo de `UPDATE`, de `DELETE` y de `TRUNCATE`.
- Vista `quoter_current_pointer`: la fila de mayor `pointer_seq`. No existe «la versión más alta gana».
- Ningún disparador de `quoter_source_documents` inserta aquí.

### `quoter_quotes` (identidad; inmutable)

- `quote_id text PRIMARY KEY DEFAULT ('qtr-' || gen_random_uuid()::text)`, con `CHECK` de formato: una ruta o un
  texto de prueba no se vuelve un identificador permanente
- `owner_organization_id text NOT NULL`, llave foránea nombrada a `greenhouse_core.organizations` — la organización
  dueña y emisora: siempre la canónica de Efeonce, resuelta por el servidor (ver «Organización dueña y
  destinataria»). Un disparador `BEFORE INSERT` exige además que sea la entidad operativa activa
  (`quoter_quotes_owner_is_operating_entity`): comprueba el hecho, sin UUID en ninguna parte
- Sin organización destinataria en esta fila: vive en `quoter_quote_recipients`, un solo lugar.
- Sin referencia al negocio (ver `## Out of Scope`).
- `data_origin text NOT NULL CHECK (data_origin IN ('real','synthetic'))`, **sin valor por defecto**: una
  cotización de prueba que naciera `real` por omisión consumiría un número real, y la fila no se corrige. Lo decide
  la identidad que crea, nunca un campo del pedido (`TASK-2027`)
- `created_by_actor_kind`, `created_by_member_id`, `created_by_principal_id text NOT NULL`,
  `command_execution_id text NOT NULL`, `request_hash`, `created_at`
- Sin columna de estado, de número, de destinataria ni de «versión vigente»: viven en tablas de sólo agregar y se
  leen por la vista.
- Disparadores: rechazo de `UPDATE`, de `DELETE` y de `TRUNCATE`.

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
- **Cuándo es obligatoria.** Opcional en un borrador, obligatoria para emitir: el disparador de cambios de estado
  rechaza una transición a `issued` de una cotización sin destinataria asignada.
- **Dónde vive: `quoter_quote_recipients` (sólo agregar).** `quote_id` (llave foránea), `assignment_seq integer`,
  llave primaria de los dos; `owner_organization_id` repetido y comprobado contra el padre;
  `client_organization_id text NOT NULL` con llave foránea nombrada a `greenhouse_core.organizations` y `CHECK` de
  que no es la dueña; `assigned_by_actor_kind`, `assigned_by_member_id`, `assigned_by_principal_id NOT NULL`,
  `reason`, `command_execution_id NOT NULL`, `request_hash`, `assigned_at`.
  Rige la fila de mayor `assignment_seq`. Se puede reasignar mientras la cotización esté en `draft`: un agente se va
  a equivocar de organización en un borrador y la identidad no admite corrección. Un disparador `BEFORE INSERT`,
  bajo el bloqueo de la cotización, asigna `assignment_seq` (máximo más uno) y rechaza la fila si el estado vigente
  no es `draft` (`quoter_quote_recipients_only_in_draft`). Desde la primera emisión la destinataria queda congelada,
  y con ella lo que se emitió. Quien emite puede declarar la destinataria que vio; si la vigente es otra, el almacén
  responde `recipient_conflict`.
  Disparadores: rechazo de `UPDATE`, `DELETE` y `TRUNCATE`.
- Ser la destinataria no da acceso a nada: abrir una lectura a una identidad de cliente es otra decisión
  (`TASK-2027`, «Organización»).

### Número público: `quoter_quote_number_counters` y `quoter_quote_numbers`

- El número se asigna **en la primera emisión**, no al crear la cotización: un borrador no consume número y la
  identidad no necesita actualizarse.
- **Lo asigna la base, no el código.** Un disparador `AFTER INSERT` sobre `quoter_state_transitions`, cuando la fila
  va a `issued` y la cotización todavía no tiene número, avanza el contador de su serie y agrega la fila del número,
  en la misma transacción de la emisión. La función es `SECURITY DEFINER`, del dueño, con `search_path` fijo y sin
  `EXECUTE` para nadie más: el runtime no puede insertar un número ni mover el contador, y nadie emite sin número ni
  consume un número sin emitir.
- `quoter_quote_number_counters`: `series` (`real | synthetic`, llave primaria), `prefix`, `next_value bigint`. Una
  fila por serie, sembrada: real `EO-QTE-` desde **15001**, sintética `EO-QTE-T-` desde 1. Un disparador sólo
  admite que avance de a uno (`quoter_quote_number_counters_advances_by_one`) y nada la borra.
- Por qué un contador y no una secuencia: una secuencia consume un valor aunque la transacción falle, y la primera
  cotización real tiene que ser `EO-QTE-15001` con correlativas después. El contador avanza dentro de la transacción
  de la emisión: si la emisión no confirma, el número no se consumió. El costo es que dos emisiones esperan una a la
  otra por esa fila; con este volumen no importa.
- `quoter_quote_numbers` (sólo agregar): `quote_id text PRIMARY KEY` (una cotización tiene como máximo un número,
  para siempre), `quote_number text NOT NULL UNIQUE`, `issued_transition_seq` (llave foránea a la emisión que lo
  produjo), `assigned_at`.
- Prefijo `EO-QTE-` y serie real que empieza en 15001: la primera cotización real emitida es `EO-QTE-15001` y sigue
  correlativa (`EO-QTE-15002`, …) (CEO, 2026-10-12). Sin relleno: el número se imprime tal cual, así que no hay
  recorte posible. El prefijo es lo único de estas tablas que ve un cliente.
- La serie se decide por el `data_origin` de la cotización: una sintética (`EO-QTE-T-1` en adelante, aprobada por el
  CEO el 2026-10-12) no consume ni salta números reales.
- El bloque de verificación de la migración comprueba el arranque leyendo el contador (`next_value = 15001`): no
  consume ningún número.
- Disparadores: rechazo de `UPDATE`, de `DELETE` y de `TRUNCATE` sobre los números; sobre el contador, sólo el
  avance de a uno.

### `quoter_quote_versions` (inmutable) y `quoter_quote_version_index` (reconstruible)

- `quote_id` (llave foránea), `version_number integer NOT NULL CHECK (version_number >= 1)`, llave primaria
  `(quote_id, version_number)`; `owner_organization_id` repetido y comprobado contra el padre
- `artifact_text text NOT NULL` (como se emitió, sin reserializar), `artifact_digest text NOT NULL` con comprobación
  de huella del texto
- `replay_digest text NOT NULL CHECK (replay_digest ~ '^[0-9a-f]{64}$')`, `calculation_id text NOT NULL`; única
  `(quote_id, replay_digest)` e índice no único sobre `replay_digest`. La huella es evidencia, no llave del registro
- única `(quote_id, version_number, artifact_digest)`: existe para que un cambio de estado y una aprobación nombren
  una versión real **con su huella** por llave foránea compuesta
- `artifact_version text NOT NULL CHECK (artifact_version IN ('pricing-v3-local-artifact/1',
  'pricing-v3-selection-quote/1','pricing-v3-resource-composition/1'))`
- `calculation_status text NOT NULL CHECK (calculation_status = 'calculated')`
- `below_floor boolean NOT NULL` — el veredicto del motor, congelado con la versión: alguna fila de algún período
  trae el diagnóstico `MARGIN_BELOW_FLOOR`. No es un índice: la regla de la emisión lo lee. Lo calcula **una sola
  función del motor**, `replayFrozenArtifact`, sobre el resultado recalculado y no sobre el texto recibido; una
  prueba del motor la mantiene igual, sobre todos los artefactos del repo, a los diagnósticos del kernel y a las
  filas que dimensiona el resumen (`linesBelowPolicyFloor`)
- `origin text NOT NULL CHECK (origin IN ('platform','local'))` — calculada por la API o hecha en local y registrada
  después de recalcularla
- `registered_by_actor_kind`, `registered_by_member_id`, `registered_by_principal_id text NOT NULL`,
  `command_execution_id text NOT NULL`, `request_hash`, `registered_at`
- Sin `supersedes_version_number` ni `metadata_json`: reemplazar es agregar la versión siguiente, y eso ya lo dice
  el correlativo.
- Disparador `BEFORE INSERT`, bajo el bloqueo de la cotización: `version_number` igual al máximo más uno
  (`quoter_quote_versions_next_number`), y el estado vigente admite versiones — sin estado todavía, `draft` o
  `revising` (`quoter_quote_versions_state_admits_version`). Sobre una cotización emitida el almacén registra
  primero `issued → revising` (y, sobre una aceptada o rechazada, su cambio a `revising`); una retirada no recibe
  versiones.
- **Un cálculo vive en una sola cotización no retirada.** Lo hace cumplir `quote-store.ts`, no una restricción: antes
  de insertar toma un bloqueo transaccional por `replay_digest` y rechaza con `artifact_already_registered` (con la
  cotización y la versión existentes) si esa huella ya está en una cotización cuyo estado vigente no es `withdrawn`.
  Así, retirar un borrador libera el cálculo para registrarlo de nuevo.
- Disparadores: rechazo de `UPDATE`, de `DELETE` y de `TRUNCATE`.

**Índices de lectura, en tabla aparte.** `quoter_quote_version_index (quote_id, version_number)` con
`contract_version`, `engine_version`, `currency`, y versión y huella de catálogo, política y créditos, todos
anulables, más `indexed_at`. No es inmutable: el runtime puede insertar y actualizar, y `rebuildVersionIndex` la
reescribe desde `artifact_text`. En la fila inmutable un error del extractor sería para siempre; aquí se corrige.
Son índices para listar y trazar, nunca la fuente de un resultado ni la fuente con que se reproduce: el artefacto
lleva sus fuentes dentro. Cuando un artefacto nombra más de un motor o contrato, guardan el mayor.

### `quoter_state_matrix` y `quoter_state_transitions`

El estado es **de la cotización**. La matriz coincide con la que propone `TASK-2027`; si el ciclo de vida necesita un
par nuevo, entra por una migración que sólo agrega filas.

- Matriz: `(from_state text, to_state text, requires_human_gate boolean NOT NULL)`, llave primaria
  `(from_state, to_state)`, sembrada en la migración. El estado inicial usa un origen centinela (`'none'`).
- Historial (sólo agregar): llave primaria `(quote_id, transition_seq)`; `transition_id` único;
  `owner_organization_id`; `from_state`, `to_state`; `requires_human_gate` (copiado de la matriz por el disparador,
  no dado por quien llama); `actor_kind`, `actor_member_id`, `actor_principal_id text NOT NULL`;
  `reason text NOT NULL CHECK (length(btrim(reason)) >= 5)`; `command_execution_id text NOT NULL`, `request_hash`,
  `occurred_at`. Sin `metadata_json`.
- **Orden propio.** `transition_seq integer` lo asigna el disparador bajo el bloqueo de la cotización, correlativo
  desde 1. El estado vigente es el de la fila de mayor `transition_seq`. `occurred_at` es la hora del inicio de la
  transacción y no ordena: dos transacciones que se cruzan pueden confirmar en orden inverso a su hora, y un orden
  por hora haría que la base y la aplicación respondieran estados distintos para la misma cotización.
- **Qué se emitió.** `version_number`, `artifact_digest`, `document_seq` y `document_digest`: los cuatro presentes
  cuando `to_state = 'issued'` y los cuatro nulos en cualquier otro cambio
  (`quoter_state_transitions_issue_names_what_it_issues`). Llave foránea compuesta
  `(quote_id, version_number, artifact_digest)` a la versión y
  `(quote_id, version_number, document_seq, document_digest)` al documento: una emisión no puede nombrar una versión
  inexistente, una huella que no es la de esa versión, ni un documento que no es de ella.
- Restricción: `requires_human_gate = false OR (actor_kind = 'member' AND actor_member_id IS NOT NULL)`.
- Disparador `BEFORE INSERT`, bajo el bloqueo de la cotización, cada regla con su nombre:
  - `from_state` es el estado vigente, o el centinela si es su primera fila (`…_from_is_current`);
  - el par existe en la matriz (`…_pair_exists`);
  - hacia `issued`: la versión es la última **o la última emitida** (`…_issues_last_or_issued_version`); la
    cotización tiene destinataria (`…_issue_needs_recipient`); el documento nombrado es el que rige para esa versión
    (`…_issues_document_in_force`); y si la versión está bajo el piso, la última decisión sobre su excepción es
    `approved` (`…_issue_needs_exception_approval`).
  Ninguna migración de referencia valida «el origen es el vigente» en la base (lo hacen en la aplicación): este
  disparador es nuevo, no copiado.
- **Volver desde `revising`.** `revising → issued` con la última versión emitida devuelve la cotización a lo que el
  cliente ya tenía, sin fabricar una versión nueva. Sin eso, una revisión abierta por error sólo se cerraba
  retirando la cotización. Con el mismo par se corrige el documento de una cotización emitida: `issued → revising`,
  se guarda el documento corregido y se emite de nuevo; cada emisión conserva el documento que emitió.
- Función `quoter_quote_state(quote_id)`: el estado vigente. Función `quoter_lock_quote(quote_id)`: el bloqueo
  transaccional de dos claves que toman el almacén y todos los disparadores del agregado.
- Vista `quoter_quote_current`: por cotización, su estado vigente, su número si lo tiene, su destinataria, su última
  versión (con `below_floor`) y lo último que se emitió (versión, huella, documento y hora).

| Origen | Destino | Compuerta humana | Lo dispara |
| --- | --- | --- | --- |
| `none` | `draft` | no | crear la cotización con su versión 1 |
| `draft` | `issued` | no | emitir |
| `draft` | `withdrawn` | no | retirar un borrador |
| `issued` | `revising` | no | agregar o registrar una versión sobre una cotización emitida; reabrir para corregir |
| `revising` | `issued` | no | emitir la versión nueva, o volver a emitir la última emitida |
| `issued` | `withdrawn` | no | retirar |
| `revising` | `withdrawn` | no | retirar |
| `issued` | `accepted` | no | el cliente aceptó lo emitido |
| `issued` | `rejected` | no | el cliente rechazó lo emitido |
| `revising` | `accepted` | no | el cliente aceptó la última versión emitida mientras se prepara otra |
| `revising` | `rejected` | no | ídem, rechazó |
| `accepted` | `revising` | no | abrir una versión nueva; también el camino para corregir un registro equivocado |
| `rejected` | `revising` | no | ídem |

`withdrawn` es el único estado terminal y ningún otro es un callejón sin salida: desde `accepted` o `rejected` se
vuelve a `revising`, y de ahí a emitir de nuevo o a retirar. No hay vuelta de `issued` a `draft`. Qué capacidad
exige cada acto lo resuelve la puerta única, no la matriz.

**Vigencia y «vencida».**

- `valid_until date` en el historial: obligatoria cuando el destino es `issued` y nula en cualquier otro cambio
  (`…_issue_names_its_validity`); no anterior a hoy (`…_validity_not_past`). Cada emisión fija la suya; el número no
  cambia.
- «Hoy» tiene un dueño: la función `quoter_today()`, el día en `America/Santiago`. La usan el disparador y la vista;
  nunca `CURRENT_DATE`, que depende de la zona de la sesión.
- «Vencida» no se guarda. `quoter_quote_current` expone `valid_until` de la última emisión y `effective_state`, que
  vale `expired` cuando el estado guardado es `issued` o `revising` y esa fecha pasó. El último día de la vigencia
  todavía cuenta. Es el único lugar que aplica la regla: el almacén lee `effective_state` y no la repite.
- **Aceptar o rechazar una cotización vencida se permite** (CEO, 2026-10-12). Que una aceptación fue fuera de
  vigencia queda legible sin columna nueva: la vista expone, mientras el estado es `accepted`, `accepted_at`,
  `accepted_valid_until` (la vigencia de la emisión respondida), `accepted_after_validity` y
  `accepted_days_after_validity`, calculados con el día de Santiago de la aceptación contra esa vigencia. El último
  día de la vigencia cuenta como dentro. Es lectura derivada, no verdad guardada. Un tope de antigüedad sería una
  regla de catálogo decidida por el CEO; hoy no existe.
- **Aceptar y rechazar** nombran lo último que se emitió —versión, huella, documento y huella— por las mismas
  llaves foráneas compuestas que la emisión (`…_responds_to_last_issued`). El motivo va en `reason`. Sin tablas
  nuevas. Capacidad: `commercial.quoter.quote:update`.
- La tabla del historial no enumera estados: exige que los cuatro campos del objeto vayan juntos
  (`…_object_is_whole`) y el disparador decide qué cambio nombra qué. La matriz tampoco los enumera en una
  restricción: **la matriz es la lista**. Agregar un estado más adelante (enviada, vista, ganada, perdida) es agregar
  filas a la matriz y reemplazar funciones y la vista; no toca una tabla con filas.
- `actor_kind` lleva una restricción con nombre (`quoter_state_transitions_actor_kind`) para ampliar su dominio a un
  tercero (`client`, cuando el cliente acepte por el enlace público) cambiando esa restricción. No se implementa
  ahora.
- `occurred_at` lo fija el disparador con el reloj de la base. Lo mismo vale para la hora de toda fila del
  cotizador (`created_at`, `registered_at`, `stored_at`, `assigned_at`, `decided_at`, `activated_at`): quien inserta
  no declara otra.
- **Aislamiento.** `quoter_lock_quote()` y el disparador del puntero llaman a `quoter_assert_read_committed()`: bajo
  `REPEATABLE READ` o `SERIALIZABLE` lo que se lee después del bloqueo es una foto anterior y las reglas dejarían
  pasar lo que deben rechazar. Se rechaza con `quoter_requires_read_committed`.
- **Una cotización por transacción.** Una transacción que tocara dos podría cruzarse con otra en orden inverso
  (bloqueo por cotización y fila del contador) y PostgreSQL abortaría una (40P01). Un lote futuro ordena los
  identificadores antes de bloquear.
- **Permisos de `greenhouse_migrator`.** El esquema le da `ALL` por defecto. Se le revoca todo en las tablas del
  cotizador y queda con `SELECT`; el bloque de verificación lo comprueba para él y para `greenhouse_app`.
- **Bajada.** Las tres migraciones abortan su bajada si existe una cotización con `data_origin = 'real'`.

Ningún par exige compuerta humana (decisión 7, enmendada por el CEO el 2026-10-12): un agente emite una versión que
está dentro de política, retira lo que puede emitir y registra lo que respondió el cliente. Que un agente no pueda
aplicar un cambio de estado es un defecto, no una protección; lo único que no puede es decidir una excepción bajo el
piso y activar el catálogo. Las dos reglas de negocio de la emisión y de la aceptación (aprobación vigente bajo el
piso; vigencia en pie) son de la operación, para cualquiera, no del agente. Los dos actos de persona del
cotizador no son cambios de estado y por eso no aparecen aquí: la aprobación de una excepción bajo el piso vive en
`quoter_exception_approvals` (`actor_kind = 'member'`) y la activación del catálogo en `quoter_pointer_history`
(persona obligatoria en `platform_activation`). La columna `requires_human_gate` y su restricción se conservan como
mecanismo: marcar un par exige una decisión del CEO y una migración. Que una versión bajo el piso no se emita sin
una aprobación vigente —la emita quien la emita— lo comprueba la base en el disparador de arriba, además del
almacén: una regla de negocio de este peso no puede depender de que todo escritor pase por el mismo código.

### `quoter_exception_approvals` (sólo agregar)

La aprobación de una excepción bajo el piso no es un estado: es un acto registrado que la emisión comprueba.

- Llave primaria `(quote_id, version_number, approval_seq)`; `approval_seq` lo asigna el disparador bajo el bloqueo
  de la cotización. `owner_organization_id`.
- `artifact_digest text NOT NULL`, con llave foránea compuesta `(quote_id, version_number, artifact_digest)` a la
  versión: una versión nueva no hereda la aprobación.
- `decision text NOT NULL CHECK (decision IN ('approved','revoked'))`. **Rige la última decisión**: una aprobación
  dada por error se revoca agregando una fila, y se puede volver a aprobar. Una fila única por versión no dejaba
  salida en una tabla de la que nada se borra.
- `actor_kind text NOT NULL CHECK (actor_kind = 'member')`, `decided_by_member_id text NOT NULL`,
  `decided_by_principal_id text NOT NULL`
- `reason text NOT NULL CHECK (length(btrim(reason)) >= 10)`
- `command_execution_id text NOT NULL`, `request_hash`, `decided_at`
- Disparador `BEFORE INSERT`: sólo una versión con `below_floor = true` recibe una decisión
  (`quoter_exception_approvals_version_is_below_floor`), la decisión cambia la vigente
  (`quoter_exception_approvals_decision_changes_it`: se aprueba lo que no está aprobado y se revoca lo que sí), y
  una aprobación se revoca sólo mientras su versión no se haya emitido
  (`quoter_exception_approvals_revoke_before_issue`): después esa fila no significaría nada, y el acto es retirar.
- Disparadores: rechazo de `UPDATE`, de `DELETE` y de `TRUNCATE`.

### `quoter_version_documents` (sólo agregar)

- `quote_id`, `version_number`, `document_seq integer` (asignado por el disparador), llave primaria de los tres;
  única además con `document_digest`, para la llave foránea de la emisión; `owner_organization_id`
- `brief_text text NOT NULL`, `brief_digest text NOT NULL` — lo que se escribió para el documento (textos y
  referencias a opciones), en texto canónico con su huella
- `document_text text NOT NULL`, `document_digest text NOT NULL` — los datos del documento que produce
  `compose document` sobre el artefacto guardado, congelados para que lo emitido se regenere igual
- `template_data_version text NOT NULL` (la versión de datos de la plantilla A4)
- `stored_by_actor_kind`, `stored_by_member_id`, `stored_by_principal_id text NOT NULL`,
  `command_execution_id text NOT NULL`, `request_hash`, `stored_at`
- Corregir los textos es agregar una fila con `document_seq` mayor; rige la última.
- Disparador `BEFORE INSERT`: un documento entra mientras la cotización está en `draft` o en `revising`
  (`quoter_version_documents_state_admits_document`). Lo emitido no cambia porque la emisión nombró su
  `document_seq` y su `document_digest`: una corrección posterior es otra fila, y la emisión anterior sigue
  apuntando a la suya. La regla anterior («ninguna fila nueva para una versión ya emitida») dejaba sin corrección
  posible un error de tipeo en el documento de una cotización emitida.

### Capacidades y permisos

Módulo `commercial`, alcance por defecto `tenant`. Roles reales de `src/config/role-codes.ts`. Donde la tabla dice
«grupo de rutas `commercial`» el permiso se otorga al grupo **y** a sus cuatro roles por nombre, para que también lo
reciba un sujeto que lleva el rol sin el grupo (el sujeto máquina).

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
  (`new Pool()` sólo existe en `src/lib/postgres/client.ts`). No direcciona por ruta: su `locator` para la batería
  devuelve `undefined`, y un artefacto se busca por `replayDigest`.
- Un puntero sólo entra si sus tres documentos ya están guardados (llave foránea): el adaptador lo declara a la
  batería (`pointerNamesOnlyHeldDocuments`).
- Un artefacto se entrega y se registra con **un** serializador, el de la CLI: `JSON.stringify(artefacto, null, 2)`
  más salto de línea. `TASK-2027` no habla de «texto canónico» para artefactos.
- Lectura: devuelve el texto guardado y falla con error tipado si la huella recalculada no coincide.
- Artefactos: `writeArtifact` con `locator` (un `quote_id`) agrega una versión; sin `locator` crea la cotización. Un
  `replay_digest` que ya vive en una cotización no retirada es `OUTPUT_EXISTS`. `readArtifact({ replayDigest })` sin
  `locator` devuelve la fila de la cotización viva y, si sólo hay retiradas, la más reciente. Un artefacto no
  calculado se rechaza con el código de dominio `quote_not_calculated` (registro cerrado de `errors.ts`); nunca
  aflora como error sin clasificar.
- `OUTPUT_EXISTS` no llega a un cliente HTTP: `TASK-2027` responde 409 con el detalle `artifact_already_registered`.
- Importador: origen = todos los documentos de catálogo, política y créditos bajo `data/pricing/**`, más cualquier
  versión que un artefacto del corpus traiga dentro y no exista como archivo (hoy una: el catálogo
  `review-policy-proposal-2026-10-09-v1`, en dos artefactos). Esas entran con `origin = 'artifact_embedded'`, y sólo
  si todos los artefactos que la nombran la traen con la misma huella; si difieren, se detiene y lo reporta. Para cada
  uno: validar con el esquema del motor, calcular huella, comparar con el puntero cuando lo nombra, y guardar si
  falta. Si existe la misma `(role, version)` con otra huella, se detiene y reporta: nunca sobrescribe.
- El importador sólo lee archivos commiteados y empujados (`git status` limpio para esa ruta y commit alcanzable
  desde el remoto) y guarda el SHA con cada fila: lo que entra a una tabla inmutable se puede volver a encontrar.
- Salida del importador: por documento, `stored | already_present | conflict`, con rol, versión y huella; nunca el
  contenido.

### Pruebas obligatorias

1. **Ida y vuelta de un artefacto.** Para cada artefacto **calculado** del corpus: guardarlo como versión por el
   adaptador, leerlo, y comprobar que el texto es idéntico, que `artifact_digest` y `replay_digest` son los mismos y
   que la reproducción de su carril sobre el valor leído verifica. El artefacto no calculado del corpus se rechaza
   con `quote_not_calculated` y no deja fila.
2. **El resultado no se reconstruye desde columnas.** Corromper a propósito el índice de lectura de una versión
   (`currency`, `engine_version`); el lector debe devolver lo que dice el artefacto, y `rebuildVersionIndex` debe
   dejar el índice como estaba. Además, una prueba estática: ningún archivo de
   `src/lib/commercial/quoter/` construye un artefacto o un resultado a partir de filas (el único origen de un
   resultado es `JSON.parse` del texto guardado o una llamada al motor).
3. **Huella corrupta.** Una fila cuyo texto no corresponde a su huella no entra (restricción) y, forzada en una
   tabla temporal de prueba, el lector la rechaza.
4. **Sólo agregar.** `UPDATE`, `DELETE` y `TRUNCATE` sobre cada tabla de historia fallan con el usuario de runtime y
   con el de operaciones.
5. **Puntero.** Guardar un documento no cambia `quoter_current_pointer`; una activación con huella previa equivocada
   falla; dos activaciones concurrentes dejan una sola fila nueva.
6. **Estados y excepción.** Un par fuera de la matriz falla; un origen que no es el vigente falla; los trece pares
   sembrados tienen `requires_human_gate = false` y un actor `agent` emite y retira; el historial tiene
   `transition_seq` correlativo; emitir exige versión emitible, destinataria y documento, en ese orden; desde
   `revising` se vuelve a la última versión emitida y no a una anterior; una versión bajo el piso no se emite sin
   aprobación vigente, ni por el almacén ni por SQL directo; sólo una persona decide, sólo sobre una versión bajo el
   piso, y aprobar → revocar → aprobar deja vigente la última; una versión nueva no hereda la aprobación; una
   activación del puntero en la plataforma sin persona falla, y un reflejo sin commit también.
7. **Número.** En una base recién migrada la primera cotización real emitida recibe exactamente `EO-QTE-15001` y la
   siguiente `EO-QTE-15002`; una emisión que no confirma no consume número; reemitir no cambia el número ni consume
   otro; una sintética toma `EO-QTE-T-1` y no mueve el contador real; el runtime no puede insertar un número, mover
   el contador ni ejecutar la función; el dueño no puede hacerlo saltar ni retroceder; crear un borrador no consume
   ninguno.
8. **Importador idempotente.** Segunda corrida: cero escrituras. Conflicto de versión con otra huella: se detiene.
9. **Frontera.** Ningún archivo de `src/lib/commercial/quoter/` nombra `greenhouse_commercial.quotations`.
10. **Dueña y sujeto máquina.** `resolveQuoterOwnerOrganizationId()` devuelve la fila de `EO-ORG-0007` y falla
    cerrado si no es la entidad operativa activa; ningún archivo de `src/lib/commercial/quoter/` contiene un UUID de
    organización; el sujeto máquina de un binding interno pasa la puerta para emitir y retirar, y no la pasa para
    aprobar una excepción, activar el puntero ni guardar un documento de catálogo.
11. **Destinataria.** Un borrador sin destinataria no pasa a `issued`; se puede reasignar en `draft` y rige la
    última; después de la primera emisión una asignación nueva falla; dos asignaciones concurrentes no dejan dos
    filas con el mismo `assignment_seq`.
12. **Un cálculo, una cotización viva.** Registrar el mismo `replay_digest` en una segunda cotización falla con
    `artifact_already_registered` mientras la primera no esté retirada, y pasa una vez retirada; el mismo cálculo
    dos veces en la misma cotización falla siempre; dos registros concurrentes del mismo cálculo dejan una sola fila.
13. **Una sola puerta.** Una prueba estática confirma que sólo `quote-store.ts` contiene `INSERT` sobre las tablas del
    agregado; una fila sin `command_execution_id`, sin `*_principal_id` o sin `data_origin` no entra.
14. **Concurrencia real, con dos conexiones.** La misma cotización emitida dos veces a la vez deja una emisión y un
    número; dos cotizaciones emitidas a la vez reciben números consecutivos; dos emisiones por SQL directo, sin
    almacén, dejan una y la otra recibe `…_from_is_current`; una emisión y una reasignación de destinataria, o una
    emisión y una corrección de documento, nunca dejan emitido algo que quien emitió no vio.
15. **Rechazos con nombre.** Cada regla se ejercita por el almacén (código) y por SQL directo (SQLSTATE y nombre);
    ninguna aserción lee el texto de un mensaje. `constraint-names.test.ts` exige que todo `RAISE` nombrado tenga su
    código y que ninguna entrada del mapa sobre.
17. **Después de emitir.** Emitir sin vigencia, con formato inválido o con una fecha pasada falla; aceptar y
    rechazar nombran la última emisión; una respuesta sobre una versión que no es la última emitida falla, por el
    almacén y por SQL directo; ninguna respuesta es un callejón sin salida y el número se conserva en cada
    re-emisión; con «hoy» movido en la base desechable, una cotización pasa a `expired` el día siguiente a su
    vigencia (no el mismo día); una vencida se acepta y se rechaza, y la aceptación queda marcada fuera de vigencia
    con sus días de atraso (en plazo y en el último día, no); «hoy» es el día de Santiago con cualquier zona de
    sesión; la hora de toda fila es la del reloj de la base.
19. **Lo que la base sostiene sola.** Bajo `REPEATABLE READ` o `SERIALIZABLE` la escritura se rechaza; un miembro
    vacío no pasa por identificado; el rol de migraciones no puede insertar un número, mover el contador, agregar un
    par ni escribir una cotización; con una cotización real la bajada aborta y con sólo sintéticas corre entera.
20. **Batería de conformidad e importador.** `runStorageConformance` pasa contra el adaptador PostgreSQL con sus dos
    diferencias declaradas (sólo artefactos calculados; puntero sólo sobre documentos guardados); el importador en
    simulación no escribe, la segunda corrida no escribe, un conflicto de versión detiene todo antes de escribir, y
    el reflejo del puntero nombra su commit y se hace una vez.
18. **Un agente aplica todos los estados.** El sujeto máquina de un binding interno pasa la puerta y registra, sin
    persona: crear, asignar destinataria, guardar documento, emitir, rechazar, reabrir, re-emitir, aceptar, agregar
    versión, emitir, aceptar, reabrir y retirar. Ningún par de la matriz tiene compuerta. Lo único que no pasa:
    decidir una excepción y activar el catálogo. (El carril de ecosistema no existe todavía: lo crea `TASK-2026`; la
    misma prueba por HTTP es de `TASK-2027`.)
16. **Falsificación.** Antes de dar una regla por probada se quita (en el SQL pendiente o en el almacén) y se
    confirma que la suite se pone roja; se restaura y vuelve a verde. Hecho el 2026-10-12 para el bloqueo del
    disparador de estados, la regla del piso, la regla del documento, el bloqueo del almacén, la respuesta sobre la
    última emisión, el borde del último día de vigencia, la revocación después de emitir, la emisión que nace
    vencida, el rechazo de otro aislamiento, la marca y los días de una aceptación tardía, la guarda de la bajada,
    la hora declarada por quien inserta, el miembro vacío y los permisos del rol de migraciones.

Las pruebas 1 a 8, 11, 12, 14, 15 y el lector de la dueña de la 10 corren contra el clúster PostgreSQL local. Una prueba omitida por
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
| Pruebas o ejemplos en la base compartida dejan filas permanentes y consumen números | data / production | high | `data_origin` sin valor por defecto y decidido por la identidad; serie sintética con contador propio; pruebas automáticas sólo en clúster local | Cotizaciones `real` creadas por una prueba, un canario o una puerta de salida |
| La siembra de capacidades llega a la base antes que el catálogo de TypeScript a producción | identity / production | medium | Misma entrega; revisar en Discovery si la prueba de paridad registro ↔ catálogo o alguna señal reacciona a filas sin entrada en el código desplegado; si reacciona, aplicar la migración 3 después del release | Señal o prueba de paridad de capacidades en rojo |
| El importador activa un catálogo por accidente | finance | low | Guardar y activar son subcomandos distintos; ningún disparador activa; prueba 5 | Fila nueva en `quoter_pointer_history` sin motivo declarado |
| La matriz de estados sembrada no coincide con el ciclo de vida que implemente la API de registro | data | low | Matriz igual a la que propone `TASK-2027`; como es dato, se amplía por una migración que sólo agrega filas | `TASK-2027` necesita un par inexistente |
| El prefijo o el arranque de la serie cambian después de emitir | finance | low | Prefijo `EO-QTE-` y arranque en 15001 fijados por el CEO el 2026-10-12; viven en la fila del contador, y un cambio posterior no altera números ya asignados | Petición de cambio de prefijo con cotizaciones emitidas |
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

0. Dos lecturas contra la base compartida, antes de migrar: que `EO-ORG-0007` sea la entidad operativa activa (si
   no, toda cotización falla cerrada) y qué privilegios reales tiene `greenhouse_migrator` en el esquema. La
   migración 3 (capacidades) se aplica cuando el código que las declara ya está en producción: código primero.
1. Clúster local (PostgreSQL 16): aplicar las tres migraciones, correr las pruebas obligatorias y la batería de
   conformidad; bajar y volver a subir las migraciones para comprobar que la bajada deja la base como estaba.
2. Operador: visto bueno explícito para aplicar a la base compartida. Sin él, la task queda en
   `code complete, rollout pendiente`.
3. `pnpm pg:connect:migrate`; consulta de sólo lectura que confirma tablas, disparadores, restricciones, permisos de
   `greenhouse_runtime` (sin `UPDATE` ni `DELETE`), matriz sembrada y capacidades vigentes.
4. `pnpm db:generate-types` y `pnpm pg:doctor`.
5. Operador: visto bueno para la importación. `pnpm quoter:import` en simulación, revisar el plan, luego `--apply`.
6. Segunda corrida: cero escrituras. Comparar, por documento, huella en la base contra huella en el repo.
7. Reflejar el puntero del repo con motivo y commit; comprobar que `quoter_current_pointer` nombra las tres huellas de
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

**Evidencia del cierre (2026-10-12).** Lo que sigue se verificó contra la base compartida, no contra un documento:

- Autorización del operador, en este orden y con estas palabras: «te autorizo a que hagas push» y «te autorizo a
  aplicar todo lo que falte». Antes de eso no se empujó ni se aplicó nada.
- `pnpm test` completo: 2.050 archivos, 20.231 pruebas, exit 0. `pnpm local:check` (lint y typecheck): exit 0.
  `pnpm quoter:test:local`: 117 pruebas en PostgreSQL 16.15 conectando como `greenhouse_app`, contra los archivos
  de `migrations/` tal como se aplicaron.
- `pnpm migrate:status` antes de aplicar: correrían sólo las tres de esta task. `pnpm pg:connect:migrate`: las tres
  aplicadas; sus bloques de verificación pasaron con los roles reales.
- Lectura posterior como `greenhouse_app`: 12 tablas y 2 vistas `quoter_*`, dueño `greenhouse_ops`, 30
  disparadores; contador real en 15001 y sintético en 1; 13 pares de estado, ninguno con compuerta; seis
  capacidades `commercial.quoter.*` vigentes; la aplicación inserta y no actualiza ni borra; nadie más que el dueño
  escribe números, contador o matriz; el usuario de migraciones sólo lee.
- `pnpm quoter:import documents --apply`: 24 guardados (12 catálogos, 11 políticas, 1 de créditos); segunda corrida:
  24 ya presentes, cero escrituras. La huella del texto de las 24 filas la recalcula la base y coincide.
- `pnpm quoter:import pointer --apply`: activado como `repo_mirror`, sin persona, con su commit; segunda corrida:
  `already_current`. El puntero de la base es el de `data/pricing/v3-operating/current.json` byte a byte, con las
  mismas tres huellas (catálogo y política `operating-review-2026-10-11-v11`, créditos
  `operator-screenshots-2026-10-09-v1`).
- Ninguna cotización registrada todavía: la primera real emitida será `EO-QTE-15001`.
- `pnpm pg:doctor` sano. La prueba de paridad registro ↔ catálogo contra la base ya no falla por las capacidades de
  esta task; sigue en rojo por una ajena, `marketing_studio.catalog.manage` (`TASK-1905`, con su propia migración
  pendiente).
- **No verificado en local:** `pnpm build`. Colgó el equipo y se cortó a medias. **Verificado por Vercel:** el
  despliegue de staging del commit empujado (`62e3773ec`) terminó bien, así que el build de producción pasa.
- **CI del push, en rojo por tiempo y no por una prueba:** el paso `Test` se cortó a los 14 minutos con 1.879 de
  ~2.121 archivos corridos y ninguno fallado; el build condicional de ese job no llegó a correr. La misma suite
  pasó completa en local sobre el mismo código. Subir ese límite o repartir la suite es trabajo aparte.

- [x] El visto bueno del operador para aplicar migraciones y para importar con escritura quedó registrado en la task
      (fecha y alcance) antes de cada acción sobre la base compartida.
      2026-10-12: el operador respondió «Ok, termina lo pendiente» al pedido de empujar `develop`, aplicar las tres
      migraciones y correr la suite y el build. La suite corrió. El push y la lectura de estado de migraciones
      quedaron bloqueados por los permisos de la sesión, así que **no se aplicó nada**; antes de aplicar se pide una
      confirmación explícita para ese acto.
- [x] Hasta el visto bueno las tres migraciones viven en `docs/tasks/pending-migrations/` y ninguna en `migrations/`.
      Al cierre viven en `migrations/`, nacidas con `pnpm migrate:create`.
- [x] Las tres migraciones empiezan con `-- Up Migration`, llevan bloque `DO` de verificación, no tienen `CREATE` bajo
      `-- Down Migration` y `pnpm migration-marker-gate` pasa.
- [x] En el clúster local las tres suben, bajan y vuelven a subir sin dejar objetos (`pnpm quoter:test:local`).
- [x] Ninguna migración nombra `greenhouse_commercial.quotations` ni altera un objeto existente.
- [x] Existen las doce tablas `greenhouse_commercial.quoter_*`, las dos vistas y sus funciones, todas con dueño
      `greenhouse_ops`; `greenhouse_runtime` no tiene `UPDATE`, `DELETE` ni `TRUNCATE` sobre las tablas de historia,
      ni `INSERT` sobre los números, y la migración lo comprueba con `has_table_privilege`.
- [x] La huella de cada documento y de cada artefacto la comprueba la base al insertar (restricción o disparador,
      según el resultado del Slice 1) y el adaptador al leer.
- [x] `UPDATE`, `DELETE` y `TRUNCATE` fallan en `quoter_source_documents`, `quoter_pointer_history`, `quoter_quotes`,
      `quoter_quote_recipients`, `quoter_quote_numbers`, `quoter_quote_versions`, `quoter_state_transitions`,
      `quoter_exception_approvals` y `quoter_version_documents`.
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; runtime sin privilegio (42501) y dueño rechazado por `quoter_append_only`.
- [x] La destinataria se asigna y se reasigna sólo en `draft`, rige la última, y una cotización sin destinataria no
      pasa a `issued` (prueba 11).
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; almacén y SQL directo (`quoter_quote_recipients_only_in_draft`).
- [x] El mismo cálculo no entra dos veces en una cotización ni en una segunda cotización viva; retirar lo libera
      (prueba 12). Sólo `quote-store.ts` escribe en las tablas del agregado, y versión y cambio de estado exigen
      `command_execution_id` (prueba 13).
- [x] Guardar un documento no agrega una fila a `quoter_pointer_history`; una activación en la plataforma exige
      persona identificada, un reflejo del repo exige su commit, y las dos exigen motivo y la huella del puntero que
      reemplazan.
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; `source-documents-and-pointer.local-postgres.test.ts`.
- [x] `quoter_quote_versions` rechaza un artefacto cuyo estado de cálculo no es `calculated`.
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; el almacén responde `quote_not_calculated` con el artefacto no calculado del corpus; la columna lleva el `CHECK`.
- [x] El número lo asigna la base en la primera emisión, desde un contador por serie: la primera cotización real es
      `EO-QTE-15001` y la siguiente `EO-QTE-15002`, sin relleno ni huecos; una emisión que no confirma no consume
      número; crear una cotización no consume número, una cotización no recibe un segundo número, una sintética no
      mueve el contador real y el runtime no puede escribir un número ni mover el contador (prueba 7).
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; `EO-QTE-15001`, `EO-QTE-15002`, `EO-QTE-T-1`, emisión sin confirmar, concurrencia de dos conexiones.
- [x] Emitir fija la versión con su huella y el documento con su huella; exige destinataria, documento y, bajo el
      piso, aprobación vigente, también por SQL directo; desde `revising` se vuelve a la última versión emitida
      (pruebas 6 y 14).
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; `quote-aggregate.local-postgres.test.ts`.
- [x] Toda fila inmutable tiene `*_principal_id`; `data_origin` no tiene valor por defecto; el historial de estados
      se ordena por `transition_seq`.
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; columnas `NOT NULL` en las dos migraciones; fila sin principal, sin comando o sin origen rechazada (23502).
- [x] Cada rechazo de la base tiene nombre y `QUOTER_CONSTRAINT_CODES` lo traduce; ninguna prueba lee el texto de un
      mensaje (prueba 15).
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; `constraint-names.test.ts` y aserciones por SQLSTATE y nombre.
- [x] Las reglas probadas se falsificaron: quitada la regla, la suite se puso roja (prueba 16).
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; cuatro reglas quitadas de a una; la suite se puso roja cada vez y volvió a verde al restaurar.
- [x] La matriz de estados en TypeScript y la sembrada en la migración son iguales (`state-machine-parity.test.ts`).
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; `state-machine-parity.test.ts` y la misma comparación contra las filas del clúster local.
- [x] Ninguno de los trece pares sembrados exige compuerta humana: un actor `agent` registra una emisión y un retiro.
      Una decisión sobre una excepción con un actor que no es una persona identificada falla en la base y exige la
      huella de su versión; una activación del puntero en la plataforma sin persona identificada falla.
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, como `greenhouse_runtime`, 64 pruebas verdes; un agente emite y retira; decisión de excepción por un agente rechazada; activación sin persona rechazada.
- [x] Prueba 1: los artefactos calculados del corpus (47 de 48 al planificar) se guardan y se leen con el mismo
      texto, el mismo `artifact_digest` y el mismo `replay_digest`, y su reproducción verifica; el no calculado se
      rechaza con `quote_not_calculated`.
- [x] Prueba 2: con el índice de lectura corrompido, el lector devuelve lo que dice el artefacto y el índice se
      reconstruye; la prueba estática confirma que nada en `src/lib/commercial/quoter/` construye un resultado desde
      filas.
- [x] `runStorageConformance` pasa contra el adaptador PostgreSQL en el clúster local.
      Evidencia 2026-10-12: `storage-postgres-conformance.local-postgres.test.ts`, once casos, con las dos
      diferencias declaradas del registro; los adaptadores de archivos y de memoria siguen en verde.
- [x] Las pruebas con base de datos corrieron con el clúster local arriba (evidencia de corrida, no omitidas).
- [x] Después de emitir: `accepted` y `rejected` como estados, vigencia fijada por cada emisión, `expired` derivado
      en un solo lugar, una vencida se puede aceptar y queda marcada fuera de vigencia, y sólo `withdrawn` es
      terminal (pruebas 17 y 18).
      Evidencia 2026-10-12: `pnpm quoter:test:local`, PostgreSQL 16.15, 109 pruebas verdes.
- [x] Los hallazgos de la lectura independiente del SQL están dentro y probados (prueba 19).
      Evidencia 2026-10-12: la misma corrida; siete reglas nuevas falsificadas.
- [x] Un agente (sujeto máquina de un binding interno) aplica todos los estados sin persona; lo único que no puede
      es decidir una excepción bajo el piso y activar el catálogo (prueba 18 y `authz.test.ts`).
      Evidencia 2026-10-12: la misma corrida.
- [x] El veredicto «calculó» y «bajo el piso» sale de una sola función del motor sobre el resultado recalculado
      (`pricing-v3-artifact-verdict.test.ts`, sobre los 48 artefactos del repo).
- [x] Las capacidades `commercial.quoter.catalog`, `commercial.quoter.catalog.activate`, `commercial.quoter.simulate`,
      `commercial.quoter.quote`, `commercial.quoter.issue` y `commercial.quoter.exception` existen en el
      registro, en `entitlements-catalog.ts` y otorgadas en `runtime.ts`; `commercial.quoter.exception:approve` sólo a
      `efeonce_admin`, `commercial.quoter.catalog.activate:execute` sólo a `efeonce_admin` y `finance_admin`, y
      `commercial.quoter.issue:approve` a `efeonce_admin`, `efeonce_account` y `finance_admin`.
- [x] `capability-grant-coverage.test.ts` pasa y ve las llamadas `can()` de la puerta (escritas con literales). La
      prueba de paridad registro ↔ catálogo (`parity.live.test.ts`, contra la base real) pasa después de aplicar la
      migración 3; entre el commit del catálogo y esa aplicación queda en rojo, y así se reporta.
- [x] El sujeto máquina de un binding interno (rol `efeonce_account`) pasa la puerta única para emitir y retirar, y
      no la pasa para aprobar una excepción, activar el puntero ni guardar un documento de catálogo (probado).
      Evidencia 2026-10-12: `src/lib/commercial/quoter/__tests__/authz.test.ts`.
- [x] La organización dueña de una cotización se resuelve en una sola función por el identificador público
      `EO-ORG-0007` y falla cerrado si la fila no es la entidad operativa activa; ningún archivo de
      `src/lib/commercial/quoter/` ni migración de esta task contiene un UUID de organización.
- [x] `pnpm quoter:import --apply` dejó en la base todos los documentos de catálogo, política y créditos del repo,
      incluidas las versiones históricas que nombra el corpus; una segunda corrida no escribe; cada huella en la base
      es igual a la del repo.
- [x] `quoter_current_pointer` nombra las mismas tres huellas que `data/pricing/v3-operating/current.json`.
- [x] Ningún archivo de `src/lib/commercial/quoter/` nombra `greenhouse_commercial.quotations`, y ningún archivo de
      `src/lib/finance/pricing-v3/` importa algo de `src/lib/commercial/`.
- [x] Ninguna ruta bajo `src/app/` importa `src/lib/commercial/quoter/` al cierre de esta task.
- [x] `pnpm pricing:v3:test` sigue en verde y ningún archivo de `data/pricing/**` cambió.
- [x] Modelo de datos, documentación funcional y manual del importador publicados; `EPIC-053` y `TASK-2026`/`TASK-2027`
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

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (`TASK-2027`, `TASK-2028` y `TASK-2029`
      alineadas con el almacén; `TASK-2026` no cambia de alcance)

- [x] `EPIC-053` refleja la puerta de salida de la fase 2 («catálogo vigente importado; huellas en la base = huellas
      del repo») con su evidencia
- [x] si el estado es código completo sin migraciones aplicadas, la task se reporta como
      `code complete, rollout pendiente` y no se mueve a `complete/`
- [x] CLAUDE.md §«Data Architecture» menciona `greenhouse_commercial` entre los esquemas activos si sigue sin
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
- **Cómo decide el servidor que una cotización es sintética.** La numeración aparte está aprobada; la regla la
  propone `TASK-2027` y el esquema sólo guarda el resultado (`data_origin`).
- **Dónde corre la reproducción de lo persistido** cuando cambie el motor (ver Follow-ups).

Resueltas en Discovery el 2026-10-12, con la sesión consultora:

- **Asignar la destinataria después de crear.** Tabla de sólo agregar `quoter_quote_recipients`; reasignable en
  `draft`, congelada desde la primera emisión.
- **Unicidad de la huella de un artefacto.** Única por cotización, no en el registro; «una sola cotización viva»
  lo hace cumplir la función de escritura.
- **Vínculo con el negocio.** Fuera de esta task.
- **Dónde viven las migraciones antes del visto bueno.** `docs/tasks/pending-migrations/`.
- **Mecanismo de comprobación de huella.** Disparador `BEFORE INSERT`.

Resuelta por el operador el 2026-10-12: **versión de PostgreSQL del clúster local.** Se instaló `postgresql@16`
(16.15, la versión de la base real) y todas las pruebas con base corren ahí.

Abierta, del operador: **empujar el catálogo vigente antes de importar.** El importador rechaza archivos sin
commitear o sin empujar; la primera importación con escritura exige que el catálogo vigente esté en el remoto.
Medido el 2026-10-12 con `pnpm quoter:import plan`: 24 documentos (12 catálogos, 11 políticas, 1 de créditos),
ninguno con cambios sin commitear y **ninguno empujado**, tampoco el puntero.

Resueltas por el CEO el 2026-10-12 (ya no abiertas):

- **Prefijo y arranque del número público.** `EO-QTE-`; la serie real empieza en 15001 (`EO-QTE-15001`, después
  `EO-QTE-15002`, …), sin relleno. La serie sintética no cambia (`EO-QTE-T-1`).
- **Quién puede emitir.** `efeonce_admin`, `efeonce_account`, `finance_admin` y los agentes, dentro de política y sin
  aprobación de una persona. Retirar sigue el mismo principio.
- **Organización dueña.** Efeonce siempre, por referencia estable.
- **Organización destinataria obligatoria o no.** Cliente o potencial cliente; opcional en un borrador y obligatoria
  para emitir.
- **Momento del número.** En la primera emisión, asignado por la base, en una tabla de sólo agregar para no
  actualizar la identidad.
- **Cotizaciones de ejemplo en la base compartida.** Sintéticas, con numeración aparte.
