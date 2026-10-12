# TASK-2031 — Quoter V3 product identity: SKU binding, composite services and line versus custom items

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
- Rank: `TBD`
- Domain: `finance|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Da a cada cotización de V3 la identidad de producto que el plan no había resuelto. El catálogo de V3 declara, en una
versión nueva, a qué SKU de Productos corresponde cada perfil y cada herramienta; un servicio gestionado pasa a ser un
producto compuesto con SKU fijo, receta por defecto y la oferta que lo precia; una línea es *line item* (con SKU) o
*custom item* (sin producto, con categoría y motivo), y nunca detiene a un agente. El registro gana lecturas
reconstruibles por línea, que son la base de la inteligencia de negocios: qué se cotiza más, qué se vende más, qué
es más rentable y qué se cotiza y no se vende, por producto y por compuesto.

Va **antes de `TASK-2027` y antes de la primera cotización real**: una cotización registrada queda congelada para
siempre, y lo que no lleve dentro al congelarse no se le puede agregar después.

## Why This Task Exists

El CEO lo señaló el 2026-10-12: Productos (roles, herramientas, recargos y servicios, cada uno con su SKU,
sincronizado con HubSpot) se creó para que las cotizaciones compusieran desde ahí y para responder preguntas de
negocio por producto. Medido ese día:

- El catálogo vigente de V3 usa como identificador de sus 32 perfiles el mismo código que `sellable_roles.role_sku`
  (`ECG-001`…`ECG-032`) y, en 25 herramientas, el de `tool_catalog.tool_sku` (`ETG-###`), porque ambos nacieron del
  mismo libro de precios. Nada lo declara ni lo comprueba: en `src/lib/finance/pricing-v3/**` el identificador es
  una cadena opaca (`catalog/contracts.ts:19`) y no existe la palabra SKU.
- Hay dos emisores del espacio `ECG`/`ETG`: las secuencias de la base y la edición del catálogo de V3. El código
  `ETG-017` ya nombra dos cosas distintas (una herramienta en Productos; una referencia histórica de fee de
  plataforma en V3).
- Un servicio gestionado se le presenta al cliente como **un fee**. Lo único que lo nombra dentro de una cotización
  es `brief.offerId`, que es una regla de precio por práctica y no un producto. Los siete servicios `EFG-###` de
  Productos no tienen par en V3.
- El registro de la plataforma (`TASK-2025`, aplicado y vacío) guarda el artefacto como texto y un índice de lectura
  sin oferta, línea, perfil ni producto. Los datos generales que hoy leen contratos, embudo y rentabilidad (línea de
  negocio, totales recurrentes) no existen como columna.
- Ocho herramientas que V3 cotiza no tienen SKU, y los costos de terceros y la puesta en marcha se cotizan sin
  producto alguno.

Si la primera cotización real se registra así, la pregunta «qué producto se vendió» queda sin respuesta para esa
cotización, sin arreglo posible.

## Goal

- El catálogo de V3 declara el SKU de cada perfil y de cada herramienta en una versión nueva, y un control avisa si
  se desalinea de Productos, en los dos sentidos.
- Un servicio gestionado se cotiza nombrando su SKU compuesto; cada línea nombra el SKU de su componente; la
  cotización guarda la composición real y se puede leer cuánto se apartó de la receta.
- Toda línea de una cotización es *line item* o *custom item*; el custom item lleva categoría de una lista cerrada y
  motivo, se emite igual y queda reportado.
- El registro lee por línea, desde el artefacto congelado: SKU, compuesto, oferta, forma, dedicación, períodos, neto,
  costo, margen y piso; y por cotización: línea de negocio y totales recurrentes.
- Las cuatro preguntas de negocio se responden por producto y por compuesto con una consulta sobre esas lecturas.
- Ninguna cifra cambia, ningún artefacto congelado deja de reproducirse y la CLI local sigue completa sin red.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` — en especial «Delta 2026-10-12 —
  Productos y el cotizador: una identidad, dos responsabilidades» (cuatro decisiones y sus consecuencias), la regla 5
  (ciclo de vida) y las reglas duras.
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` y `docs/epics/in-progress/EPIC-053-quoter-v3-platform-promotion.md`.
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` — change-set, revisión, aplicar,
  activar; identidad que una revisión no puede cambiar.
- `docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md` — el motor, sus contratos
  y sus cifras no cambian.
- `docs/architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md` y `docs/architecture/GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md`.
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` y
  `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` — capa de autoría, capa de distribución, SKU
  inmutable después de creado.
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` y `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`
  — la identidad de un servicio se resuelve en `greenhouse_core.service_modules`; ningún módulo crea una paralela.
- `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` — un SKU o un precio no otorgan madurez de
  Product Service.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` y
  `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`.

Reglas obligatorias:

- **NUNCA** cambiar `src/lib/finance/pricing-v3/calculate.ts` ni `src/lib/finance/pricing-v3/schemas.ts`. Ninguna
  entrada del kernel lleva identidad de producto.
- **NUNCA** un valor por defecto en una clave nueva del catálogo, del brief o de la demanda: el brief y el catálogo
  ya validados viven dentro de cada artefacto congelado, y un valor por defecto movería todas las huellas.
- **NUNCA** agregar una clave a los registros `resource` del catálogo: su valor entra tal cual al snapshot del kernel
  (`catalog/resolve.ts:853`). El vínculo va en registros propios, inertes, como el registro `offer`.
- **NUNCA** que una cotización, un cálculo o un agente al cotizar acuñe un SKU. Un SKU nace en Productos, en línea,
  por un acto del catálogo.
- **NUNCA** reutilizar un SKU para otro significado, ni que un identificador con forma de SKU nombre en V3 algo que
  no es ese producto.
- **NUNCA** rechazar ni bloquear una cotización porque una línea no tiene producto. Se calcula, se registra, se emite
  y se reporta.
- **NUNCA** una aprobación de persona nueva. Los únicos actos de persona siguen siendo la excepción bajo el piso y
  activar una versión del catálogo.
- **NUNCA** alterar una tabla inmutable de `TASK-2025`, con **una sola excepción deliberada**: la columna
  `product_identity_declared` en `quoter_quote_versions` y su regla (sección 7, «Guarda de registro»). Se agrega con
  la tabla vacía, antes de que exista una sola cotización —real o sintética— en la base compartida; la migración lo
  comprueba y aborta si encuentra una fila. Todo lo demás vive en tablas de lectura reconstruibles desde el texto
  guardado, que nunca son fuente de un resultado.
- **NUNCA** editar las tres migraciones ya aplicadas de `TASK-2025`. Todo cambio de esquema de esta task es una
  migración nueva, hacia adelante.
- **NUNCA** decidir una regla desde una tabla de lectura. La regla de emisión sigue leyendo `below_floor` de la fila
  inmutable de la versión, y la guarda de identidad lee `product_identity_declared` de esa misma fila.
- **NUNCA** SKU, costo, margen ni categoría de custom item en la proyección del cliente: `clientSafePeriodItems` no
  cambia.
- **NUNCA** escribir en `greenhouse_commercial.quotations*`, en `product_catalog*` ni en las tablas fuente de
  Productos desde el registro de V3. El control de conformidad sólo lee.
- **NUNCA** que un compuesto o un vínculo declare madurez de Product Service.
- **NUNCA** el nombre de un cliente, ni la paga de una persona, junto a un margen: las lecturas por línea no llevan
  organización y sus ejemplos y pruebas usan datos sintéticos.
- **SIEMPRE** todos los artefactos congelados del repo se recalculan idénticos y `pnpm pricing:v3:test` queda en
  verde, incluida la línea base de la CLI sin regenerar un fixture existente.
- **SIEMPRE** migraciones que sólo agregan: hay una sola instancia para desarrollo, staging y producción.
- **SIEMPRE** una sola lectura del motor para decir qué producto lleva una línea; la CLI y la plataforma la importan.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`, `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` y
  `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/documentation/finance/cotizador-v3-promocion-canonica.md` («Mantener identidad SKU/catálogo aprobados»;
  servicio gestionado como un fee, nunca su equipo).
- `docs/documentation/finance/catalogo-productos-sincronizacion.md`,
  `docs/documentation/finance/administracion-catalogo-pricing.md` y `docs/documentation/finance/pricing-comercial.md`.
- `docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md`,
  `docs/documentation/finance/cotizador-v3-registro-en-plataforma.md` y `data/pricing/v3-operating/README.md`.
- `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md` y `docs/manual-de-uso/finance/cotizar-v3-por-cli.md`.
- `docs/tasks/complete/TASK-2025-quoter-v3-database-foundation.md` (índice reconstruible, una sola puerta de
  escritura, control de frontera).
- `docs/audits/commercial/2026-10-12-cotizador-actual-auditoria.md` (qué leen contratos, ingresos, embudo y
  rentabilidad de una cotización).

## Dependencies & Impact

### Depends on

- `TASK-2025` (completa): `greenhouse_commercial.quoter_source_documents`, `quoter_current_pointer`,
  `quoter_quote_versions`, `quoter_quote_version_index`, `quoter_quote_current`; `src/lib/commercial/quoter/**`
  (`quote-store.ts`, `artifact-index.ts`, `importer.ts`, `authz.ts`); `pnpm quoter:import`.
- `TASK-2024` (completa): puerto de almacenamiento y línea base dorada de la CLI.
- Motor: `src/lib/finance/pricing-v3/catalog/{contracts,catalog,resolve}.ts`,
  `resources/{composition-contracts,operating,readiness,summary}.ts`.
- Productos: `greenhouse_commercial.sellable_roles`, `greenhouse_ai.tool_catalog`,
  `greenhouse_commercial.overhead_addons`, `greenhouse_commercial.service_pricing`, `service_role_recipe`,
  `service_tool_recipe`, `greenhouse_commercial.product_catalog`; `src/lib/commercial/product-catalog/**`;
  `src/lib/commercial/pricing-catalog-impact-analysis.ts`.
- Decisiones de curación de su dueño (Slice 3). No son una aprobación del flujo de cotizar: son el contenido del
  catálogo.

### Blocks / Impacts

- `TASK-2027` — no registra **ninguna** cotización, real ni sintética, en la base compartida antes de que la
  migración de esta task esté aplicada (la columna nueva exige la tabla de versiones vacía); hereda la escritura de
  las lecturas nuevas por la puerta única de `quote-store.ts` y la guarda de identidad de una versión real.
- `TASK-2026` — sus rutas de `catalog search`, `compose scaffold` y `compose assess` devuelven lo que el motor
  devuelva: heredan candidatos, compuestos y señales sin código propio. Suma la lectura `compose items`.
- `TASK-2028` — el corpus de paridad suma las lecturas nuevas.
- `TASK-2029` — refleja y exporta un catálogo con tres clases de registro nuevas; su lista de clases se lee del
  contrato.
- `TASK-2030` — las herramientas MCP que busquen o propongan una demanda devuelven SKU y compuestos.
- `TASK-2032` — el precio de referencia de Productos se calcula sobre los vínculos y compuestos de esta task.
- `TASK-620`, `TASK-620.1`, `TASK-620.3`, `TASK-620.5`, `TASK-620.7` — «un solo catálogo debe mandar» queda
  resuelto por la decisión: Productos nombra, V3 precia. Delta en ellas al cerrar.
- `TASK-608` — el historial de precios de Productos pierde su propósito para lo que V3 precia.
- Herramientas actuales sobre V2 (`search_services`, `quote_price`): no cambian; su repunte es de la unidad U2.

### Files owned

- `src/lib/finance/pricing-v3/catalog/contracts.ts`, `catalog/catalog.ts`, `catalog/resolve.ts`, `catalog/explain.ts`
  (clases de registro nuevas, identidad, validación, vínculos de resolución).
- `src/lib/finance/pricing-v3/resources/operating.ts` y `resources/readiness.ts` (propuesta desde la receta,
  candidatos y señales de revisión; `clientSafePeriodItems` no se toca).
- `src/lib/finance/pricing-v3/resources/quote-items.ts` (nuevo propuesto: la lectura por línea).
- `src/lib/finance/pricing-v3/__tests__/**` (pruebas nuevas; ningún fixture existente se regenera).
- `scripts/commercial/pricing-v3.ts` y `scripts/commercial/pricing-v3/**` (lectura `compose items`, entrada de
  compuesto en `compose scaffold`).
- `data/pricing/v3-operating/**` (el change-set, la versión nueva del catálogo, el puntero y ejemplos sintéticos).
- `src/lib/commercial/quoter/{line-index,catalog-product-index,product-conformance,product-intelligence}.ts`
  (nuevos propuestos) y edición acotada de `quote-store.ts` (`prepareArtifact`, `insertVersion`, `createQuote`,
  `addQuoteVersion`, `rebuildVersionIndex`), `source-documents-store.ts` (`storeSourceDocument`), `artifact-index.ts`,
  `importer.ts` y `errors.ts` (`QUOTER_CONSTRAINT_CODES`).
- `src/lib/commercial/quoter/__tests__/**` (incluido `boundary-domain.test.ts`).
- `src/lib/commercial/pricing-catalog-impact-analysis.ts` (guarda inversa; sólo agrega un bloque de lectura).
- `src/lib/reliability/queries/commercial-quoter-product-identity-drift.ts` (nuevo propuesto) y su registro.
- `scripts/commercial/quoter-products.ts` (nuevo propuesto) y `package.json` (script `quoter:products`).
- `docs/tasks/pending-migrations/TASK-2031-*.sql.pending` mientras no haya visto bueno; después `migrations/**`, en
  un archivo creado con `pnpm migrate:create`. Las tres migraciones aplicadas de `TASK-2025` no se tocan.
- `docs/documentation/finance/cotizador-v3-identidad-de-producto.md` (nuevo propuesto; incluye la hoja de curación).
- `docs/architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md`, manuales y skill `efeonce-pricing-operator` (con espejo).

## Current Repo State

### Already exists

- Catálogo de V3 con 14 clases de registro en una unión estricta (`catalog/contracts.ts:38-158`). El registro `offer`
  es el precedente de una clase inerte: «No kernel input carries it… A catalog without the record states nothing
  about the offer, and every quote resolves as it always did» (`contracts.ts:143-157`); resolución lo ata con
  `bind('*', 'offer', offer)` (`catalog/resolve.ts:236-239`).
- Cada clase declara la identidad que una revisión no puede cambiar, con una comprobación en tiempo de compilación
  para una clase sin caso (`catalog/catalog.ts:100-131`).
- Brief estricto con claves opcionales sin valor por defecto (`engagementForm`, `thirdPartyCosts`, `contingency`,
  `dedicationEvidence`), cada una con la misma razón escrita (`contracts.ts:228-322`).
- `scaffoldResourceDemand` propone una demanda editable y preguntas, lee la unidad comercial del registro `offer` y
  no inventa plan ni denominador (`resources/operating.ts:283-406`).
- `assessCompositionReadiness` levanta brechas con dueño y acción, plegadas por período (`resources/readiness.ts:26`).
- `clientSafePeriodItems`, único filtro hacia el cliente, emite cuatro clases de ítem (`fee`, `line`, `setup`,
  `third_party`) con llaves derivadas de identificadores del motor (`readiness.ts:388-454`).
- Filas del kernel por período con `parentLineId`, `kind` (`monthly`, `setup`, `third_party`), `cost`, `net`,
  `marginAmount` y `minimumMargin`; `linesBelowPolicyFloor` en `resources/summary.ts`.
- El artefacto lleva dentro catálogo, política, créditos y demanda: lo que el catálogo diga de un producto queda
  congelado con cada cotización calculada con él.
- Registro en la base: tablas `quoter_*` aplicadas, 24 documentos fuente importados, puntero igual al del repo, cero
  cotizaciones. `quoter_quote_version_index` es reconstruible (`rebuildVersionIndex`, `quote-store.ts:371`).
- Productos: cuatro tablas fuente con SKU por secuencia; `product_catalog.product_code` republica el SKU; 77
  productos; edición en `/admin/pricing-catalog` para `efeonce_admin` y `finance_admin`.

### Gap

- Ningún registro del catálogo de V3 declara un SKU; ninguna lectura lo comprueba contra Productos.
- `ETG-017` nombra cosas distintas en los dos catálogos.
- No existe el producto compuesto: ni registro, ni receta en V3, ni clave en el brief que lo nombre.
- No existe la noción de line item y custom item, ni categoría, ni motivo, ni señal por monto sin producto.
- Ocho herramientas de la política de V3 no tienen SKU (`claude-team`, `higgsfield`, `magnific`, `vercel`, `gcp`,
  `notion-credits`, `social-inbox`, `agent-runtime-usage`); los costos de terceros y la puesta en marcha tampoco
  tienen producto.
- El registro no tiene lectura por línea ni datos generales de negocio.
- Productos no tiene carril programático: un SKU sólo se acuña desde el navegador. Esta task no lo construye
  (ver Follow-ups).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: motor en `src/lib/finance/pricing-v3/**` (CLI local y portal); lecturas con estado en `src/lib/commercial/quoter/**`, servidas por el portal Next.js en Vercel; comando de operador en `scripts/commercial/**`.
- Future candidate home: `domain-package`
- Boundary: contrato del catálogo y del brief (`catalog/contracts.ts`), lectura por línea `readQuoteItems` del motor, y lectores `readProductConformance`, `readProductDemand` y `readRepeatedCustomItems` del agregado; consumers autorizados: la CLI, la puerta de escritura `quote-store.ts`, el importador, el plano de confiabilidad y las rutas de plataforma de `TASK-2026` y `TASK-2027`.
- Server/browser split: el motor sigue puro y apto para navegador; almacén, SQL y lectores de Productos sólo en servidor; ningún import de interfaz ni de tema.
- Build impact: ninguna dependencia nueva y ninguna lectura de archivos del repo en tiempo de ejecución.
- Extraction blocker: el control de conformidad cruza `greenhouse_commercial` y `greenhouse_ai` en la misma base; la escritura de las lecturas comparte transacción con la versión que indexan.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: el catálogo de V3 (identidad declarada, compuestos, política de custom items) y el artefacto congelado; las tablas nuevas son lecturas derivadas, nunca fuente.
- Consumidores afectados: CLI en modo local, `TASK-2026`, `TASK-2027`, `TASK-2028`, `TASK-2029`, `TASK-2030`, `TASK-2032`, plano de confiabilidad, análisis de impacto de `/admin/pricing-catalog`.
- Runtime target: máquina local (CLI, comando de operador, importador), Vercel (lectores y señal), staging y producción sobre la misma base.

### Contract surface

- Contrato existente a respetar: `pricing-v3-catalog/1`, `pricing-v3-brief/1`, `pricing-v3-composition-demand/1`, salida de `compose scaffold`, `compose assess` y `catalog search`; modelo de datos de `TASK-2025`.
- Contrato nuevo o modificado: clases de registro `product_binding`, `composite` y `custom_item_policy`; clave opcional `businessLineCode` en `offer`; claves opcionales `compositeSku`, `lines[].recipeLineId` y `customItems` en el brief; lectura `pricing-v3-quote-items/1`; entrada `pricing-v3-composite-request/1` de `compose scaffold`; tablas `quoter_quote_version_line_index`, `quoter_quote_version_tool_index`, `quoter_quote_version_commercial_index` y `quoter_catalog_product_index`.
- Backward compatibility: compatible. Un catálogo sin los registros nuevos no dice nada de productos y todo resuelve como siempre; un brief sin las claves nuevas se valida a lo mismo.
- Full API parity: una sola lectura del motor para CLI y plataforma; los lectores del agregado son funciones de `src/lib/commercial/quoter/**` con comando de operador; sus rutas se publican en la familia de lecturas de `TASK-2026` y `TASK-2027`.

### Data model and invariants

- Entidades/tablas/views afectadas: cuatro tablas nuevas `greenhouse_commercial.quoter_*` (lecturas reconstruibles) y una vista de lectura; una columna nueva, `product_identity_declared`, en la tabla inmutable `quoter_quote_versions`, con un disparador propio; sólo lectura sobre `sellable_roles`, `greenhouse_ai.tool_catalog`, `overhead_addons`, `service_pricing`, `service_role_recipe`, `service_tool_recipe`, `product_catalog` y `greenhouse_core.service_modules`.
- Invariantes que no se pueden romper:
  - Cada artefacto congelado del repo se reproduce con su misma huella.
  - Ninguna cifra de ninguna demanda declarada cambia entre la versión vigente del catálogo y la nueva.
  - Un SKU en vigor en el catálogo de V3 nombra un solo sujeto, y un sujeto tiene a lo más un SKU en vigor.
  - El SKU de un compuesto identifica el servicio y nunca la cotización.
  - Una lectura por línea se puede borrar y reconstruir desde `artifact_text` y da el mismo contenido.
  - Ningún lector construye un resultado desde una columna de lectura.
  - Una versión de una cotización real tiene `product_identity_declared = true`. Lo hace cumplir el código y, además, la base.
  - La regla de emisión lee `below_floor` de la fila de la versión, nunca de `quoter_quote_version_line_index`.
- Write-target allowlist: el mapa exacto tabla → escritor de `src/lib/commercial/quoter/__tests__/boundary-domain.test.ts` se extiende en el mismo cambio. Las tres lecturas por versión tienen un solo escritor, `quote-store.ts`; `quoter_catalog_product_index` tiene un solo escritor, `source-documents-store.ts`. Se declaran como reconstruibles (admiten `UPDATE` y `DELETE`); las tablas de historia no se relajan.
- Tenant/space boundary: catálogo y cotizaciones son de Efeonce; las lecturas por línea no llevan organización destinataria; la identidad sale de la sesión o del binding.
- Idempotency/concurrency: la escritura de las lecturas ocurre en `insertVersion`, que comparten `createQuote` (versión 1) y `addQuoteVersion` (versión 2 en adelante), dentro de la transacción de cada uno; reconstruir es idempotente (borra y reescribe las filas de la versión); el importador ya es idempotente por huella.
- Audit/outbox/history: sin evento nuevo. Las versiones del catálogo conservan su auditoría propia; la deriva se lee por señal.

### Migration, backfill and rollout

- Migration posture: additive, en una migración nueva hacia adelante. Cuatro tablas y una vista nuevas; una columna `product_identity_declared boolean NOT NULL`, sin valor por defecto, en `quoter_quote_versions`, y un disparador propio. Bloque de verificación. La columna sólo se puede agregar con la tabla vacía: la migración lo comprueba primero y aborta si hay una fila.
- Default state: sin bandera. El contrato es inerte hasta que una versión del catálogo declara identidad; el corte es la activación de esa versión por una persona.
- Backfill plan: los 24 documentos fuente ya importados entraron antes de que existiera `quoter_catalog_product_index`, así que la task incluye un paso de reconstrucción (`pnpm quoter:products rebuild-catalog-index`) que la llena desde `document_text`, se puede repetir y se corre después de aplicar la migración. Las lecturas por versión parten vacías porque no hay cotizaciones; la columna nueva no necesita relleno por la misma razón.
- Rollback path: activar de nuevo la versión anterior del catálogo con una fila nueva de puntero; revertir el código; las tablas quedan sin uso. La bajada de la migración quita la columna sólo mientras no exista una cotización real (la misma guarda que la bajada de `TASK-2025`); con una real registrada, la corrección es otra migración hacia adelante.
- External coordination: visto bueno del operador antes de aplicar la migración; decisiones de curación del dueño; una persona con `efeonce_admin` o `finance_admin` acuña los SKU en Productos y activa la versión.

### Security and access

- Auth/access gate: `assertQuoterAccess` de `src/lib/commercial/quoter/authz.ts`; lecturas con costo y margen sólo para identidad interna con `commercial.quoter.quote:read`; conformidad con `commercial.quoter.catalog:read`. Ninguna capacidad nueva.
- Sensitive data posture: costo objetivo y margen por línea; audiencia interna; sin datos de nómina; sin organización en las lecturas por línea. Costo y margen de las tablas nuevas no salen de la audiencia interna por ninguna ruta, herramienta ni documento: quién más los ve se decide en `TASK-2030`, no aquí.
- Error contract: códigos del registro cerrado de `PricingV3Error` para el motor y de `QuoterError` para el almacén; `captureWithDomain`; nunca el valor recibido en un mensaje.
- Abuse/rate-limit posture: lecturas con tope de filas y paginación por keyset en bytes (`COLLATE "C"`); la señal lee el índice del catálogo y no abre el documento.

### Runtime evidence

- Local checks: `pnpm pricing:v3:test`; pruebas nuevas del motor; `pnpm quoter:test:local` con cotizaciones sintéticas.
- DB/runtime checks: bloque de verificación de la migración; lectura de vuelta de tablas, llaves y permisos; cada consulta nueva ejercitada contra PostgreSQL real.
- Integration checks: `pnpm quoter:import` refleja la versión nueva con su huella; `pnpm quoter:products conformance` contra la base compartida.
- Reliability signals/logs: `commercial.quoter.product_identity_drift`.
- Production verification sequence: la de «Rollout Plan & Risk Matrix».

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La regla que decide qué producto lleva una línea vive en el motor (`readQuoteItems`), no en una ruta, una
      consulta o una pantalla.
- [ ] Conformidad, demanda por producto y custom items repetidos son lectores de `src/lib/commercial/quoter/**`,
      consumidos por el comando de operador y por la señal sin lógica duplicada.
- [ ] Camino programático declarado: CLI local (`compose items`, `compose scaffold`, `catalog search`), comando
      `pnpm quoter:products`, y rutas en la familia de lecturas de `TASK-2026` y `TASK-2027` (registrado en
      `EPIC-053`).
- [ ] Ninguna capacidad nueva: las lecturas usan `commercial.quoter.quote:read` y `commercial.quoter.catalog:read`.
- [ ] Acuñar un SKU sigue siendo un acto de Productos; el carril programático de Productos queda como deuda con
      dueño en Follow-ups.

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

### Slice 1 — Contrato del catálogo y del brief

- Clases de registro `product_binding`, `composite` y `custom_item_policy`; clave opcional `businessLineCode` en
  `offer`; identidad y validación de cada una en `catalog/catalog.ts`.
- Claves opcionales del brief: `compositeSku`, `lines[].recipeLineId`, `customItems`.
- Resolución ata los registros nuevos a la cotización (`product`, `composite`, `custom_item_policy`) sin que
  ninguno llegue al kernel.
- Puerta: artefactos congelados idénticos, línea base de la CLI sin regenerar, `calculate.ts` y `schemas.ts` sin
  diferencias.

### Slice 2 — Lecturas del motor y CLI

- `readQuoteItems` (lectura `pricing-v3-quote-items/1`) y `compose items`.
- `compose scaffold` acepta un pedido de compuesto y propone el brief desde la receta; sobre un brief, propone
  compuestos y SKU candidatos.
- `catalog search` lista primero los productos que calzan cuando el catálogo declara identidad.
- `compose assess` suma las señales de revisión de producto, sólo cuando el catálogo declara identidad.
- Parte local de la conformidad en `catalog validate`, como avisos.

### Slice 3 — Curación con dueño

- Hoja de curación en `docs/documentation/finance/cotizador-v3-identidad-de-producto.md` con los hechos medidos y una
  columna de decisión por fila: 32 perfiles, 25 herramientas, 8 herramientas sin SKU, `ETG-017`, los siete servicios
  `EFG` y sus tres recetas, los compuestos con nombre y los genéricos por práctica, los productos genéricos de
  terceros y de puesta en marcha, la línea de negocio de cada oferta y el umbral de custom items.
- El dueño decide; una persona con `efeonce_admin` o `finance_admin` acuña en `/admin/pricing-catalog` los SKU que la
  hoja pide. La hoja registra cada SKU acuñado.

### Slice 4 — Versión nueva del catálogo

- Change-set con los vínculos, los compuestos, la política de custom items, el retiro de `ETG-017` y la línea de
  negocio de las ofertas; `catalog preview` con todas las demandas declaradas del repo como impacto; `catalog apply`;
  activación por una persona; `pnpm quoter:import`.

### Slice 5 — Lecturas reconstruibles del registro

- Migración nueva (archivo en `docs/tasks/pending-migrations/` hasta el visto bueno) con las cuatro tablas, la vista,
  la columna `product_identity_declared` en `quoter_quote_versions` y su disparador.
- Extractor que llama a `readQuoteItems`. La escritura de las lecturas va en `insertVersion`, el punto que comparten
  `createQuote` y `addQuoteVersion`: una versión 1 entra por `createQuote`, y ponerla sólo en `addQuoteVersion` la
  dejaría fuera. `rebuildVersionIndex` las reconstruye.
- Índice del catálogo escrito por `storeSourceDocument` al guardar un documento fuente, y paso de reconstrucción para
  los 24 documentos que ya estaban importados.
- Guarda de registro en dos capas: en `prepareArtifact`, que pasa a recibir el origen de la cotización, y en la base.
- Mapa de `boundary-domain.test.ts` extendido con las cuatro tablas y su escritor.

### Slice 6 — Conformidad y guarda inversa

- Lector `readProductConformance`, señal `commercial.quoter.product_identity_drift`, informe en `pnpm quoter:import`
  y en `pnpm quoter:products conformance`.
- `previewPricingCatalogImpact` informa cuando el producto que se desactiva está nombrado por el catálogo vigente de
  V3.

### Slice 7 — Lecturas de inteligencia de negocios

- `readProductDemand` (por producto y por compuesto) y `readRepeatedCustomItems`; subcomandos del comando de
  operador; pruebas con cotizaciones sintéticas que recorren emitida, aceptada, rechazada y vencida.

### Slice 8 — Documentación y hermanas

- Documentación técnica, funcional y manual; skill `efeonce-pricing-operator` con espejo; `## Delta` en las tasks
  afectadas; `EPIC-053` al día.

## Out of Scope

- Enviar cotizaciones, líneas o productos a HubSpot, y cualquier vínculo con un negocio de HubSpot (decisión abierta
  de `EPIC-053`; no se agrega columna para él).
- Cambiar precios, costos o unidades de Productos, o lo que Productos muestra como precio (`TASK-2032`).
- Archivar, renombrar o borrar productos, roles de prueba, recargos o servicios de Productos.
- Un carril programático para leer o acuñar productos (Follow-ups).
- Retirar el cotizador actual o repuntar `search_services`, `quote_price` y `author_quote` (unidad U2).
- Interfaz, tableros, reportes visuales y render del documento.
- Imprimir el SKU en el documento del cliente (Open Questions).
- Cambiar el motor de cálculo, sus cifras, la proyección del cliente o el ciclo de vida de una cotización.
- Normalizar montos de distintas monedas a una moneda común para comparar.
- Escribir o borrar `service_role_recipe` y `service_tool_recipe`.

## Detailed Spec

Los nombres son propuestos. Discovery puede ajustar nombres y tipos; no las invariantes, ni el carácter inerte de los
registros, ni la regla de no poner valores por defecto.

### 1. Identidad declarada — registro `product_binding`

Un registro por sujeto vendible, inerte como `offer`:

| Campo | Contenido |
| --- | --- |
| `subject` | unión por `kind`: `{ kind: 'profile', profileId }` · `{ kind: 'tool', toolId }` (el `toolId` de la política de recursos) · `{ kind: 'third_party_category', category }` · `{ kind: 'charge', charge: 'setup' }` |
| `productSku` | cadena con forma de SKU (`^[A-Z]{2,5}-[0-9]{3,}$`). La familia que corresponde a cada sujeto la comprueba la conformidad, que conoce Productos; el contrato sólo comprueba la forma |

- Identidad que una revisión no puede cambiar: sujeto **y** SKU. Cambiar el SKU de un sujeto es retirar el registro y
  agregar otro, con su fuente y su motivo; nunca una revisión silenciosa.
- Validación del catálogo (`validateCatalog`): en vigor, a lo más un vínculo por sujeto y a lo más un sujeto por SKU.
- Los sujetos `third_party_category` y `charge` son **productos genéricos** por naturaleza: lo dice el sujeto, no un
  campo.
- Un perfil, una herramienta o una categoría sin vínculo sigue siendo legal: calcula igual y se reporta.
- Resolución ata `bind(<lineId>, 'product', registro)` por cada línea cuyo perfil tiene vínculo, y por cada costo de
  tercero cuya categoría lo tiene (con el `costId` como `lineId`, igual que `third_party_policy`), y
  `bind('*', 'product_setup', registro)` cuando existe el de puesta en marcha. Así cada línea nombra su SKU dentro
  del artefacto.
- Las herramientas se vinculan por `toolId` de la política, que es el identificador con que V3 opera; un plan
  (`priceId`) no tiene SKU propio.

### 2. `ETG-017` y los identificadores con forma de SKU

- Regla: en V3, un identificador con forma de SKU sólo nombra ese producto. Un `profileId` con esa forma es legítimo
  cuando el vínculo de ese perfil declara el mismo SKU; un `resourceId`, cuando un vínculo de herramienta en vigor
  declara ese SKU y la herramienta lo nombra en `catalogResourceId`. Lo comprueba la conformidad
  (`sku_shaped_id_unbound`, `sku_shape_mismatch`).
- `ETG-017` en V3 es un registro `resource` de clase `platform_fee` que ningún kit ni herramienta de la política
  selecciona (verificado sobre `catalog.review-v11.json` el 2026-10-12; repetir en Discovery). La versión nueva lo
  **retira**. Si en Discovery algo en vigor lo selecciona, se reemite como registro nuevo con un identificador sin
  forma de SKU (propuesto `fee:historical-platform-reference`); nunca como revisión, porque la identidad no cambia.
- En Productos `ETG-017` sigue nombrando lo que nombra: el SKU es inmutable. Queda como producto sin par en V3, y si
  sigue activo es una fila de la hoja de curación, no una decisión de esta task.

### 3. Herramientas sin SKU

Ocho herramientas de la política no tienen SKU. Según la medición del 2026-10-12, siete no existen en
`greenhouse_ai.tool_catalog` y `higgsfield` existe ahí sin SKU; se confirma en Discovery.

1. La hoja de curación las lista con su decisión: acuñar o dejar sin producto.
2. Una persona con `efeonce_admin` o `finance_admin` las crea en `/admin/pricing-catalog`; la secuencia asigna el
   `ETG` siguiente. Antes confirma el estado vivo de `GREENHOUSE_PRODUCT_SYNC_TOOLS`: con la bandera encendida, crear
   la herramienta crea también su producto en HubSpot.
3. El change-set agrega el vínculo de cada una.

Mientras no tengan SKU son herramientas sin producto: aparecen en la lectura de herramientas con SKU nulo y en la
conformidad como `unbound_in_v3`. Nada se bloquea. Una cotización nunca acuña.

### 4. Servicio compuesto — registro `composite`

| Campo | Contenido |
| --- | --- |
| `compositeSku` | SKU `EFG-###` de `service_pricing.service_sku`. Identidad del registro |
| `label` | nombre interno del servicio |
| `offerId` | la oferta de V3 que lo precia. Una sola por compuesto |
| `generic` | `true` para el compuesto genérico de una práctica |
| `businessLineCode` | opcional; `module_code` de la línea de negocio |
| `recipe.lines[]` | `recipeLineId`, `profileId`, `seniorityCode?`, `headcount`, `dedication`, `allocationMode`, `kitId?` |
| `recipe.serviceToolIds[]` | herramientas del servicio más allá de las recetas de sus perfiles |

- La receta está en el catálogo de V3 porque `compose scaffold` la necesita sin red y porque se expresa en dedicación,
  que es el lenguaje con que V3 precia. `service_role_recipe` y `service_tool_recipe` no se escriben ni se borran: la
  conformidad compara y reporta la deriva de receta como aviso.
- Validación: la oferta existe y, si su registro `offer` lo dice, se vende como `managed_service`; un compuesto
  genérico no tiene líneas de receta; a lo más un genérico en vigor por oferta. Un compuesto con nombre puede no
  tener receta: se compone a mano.
- Una oferta `role_capacity` no tiene compuesto: sus líneas son productos por sí mismas.
- Un SKU nuevo nace sólo cuando el dueño define un servicio nuevo en Productos; cotizar el mismo servicio mañana
  reutiliza el SKU.

**Qué gana el brief.** `compositeSku` opcional. Con él, resolución ata `bind('*', 'composite', registro)`.

- Nombra un compuesto que el catálogo en vigor no tiene, o cuyo `offerId` no es el del brief: diagnóstico que
  bloquea el cálculo, como cualquier otra selección de un registro inexistente. Es un error de referencia, no una
  línea sin producto.
- No nombra ninguno en un servicio gestionado: calcula, y la lectura lo reporta como servicio sin compuesto.
- Cada línea gana `recipeLineId` opcional: qué línea de la receta realiza. Lo escribe la propuesta; una línea sin él
  es una línea agregada fuera de la receta.

**Cómo propone `compose scaffold`.**

- Entrada nueva `pricing-v3-composite-request/1`: la cabecera de un brief sin líneas (`quoteDate`, `engagementCode`,
  `engagementForm`, `accountId`, `offerMarketCountry`, `outputCurrency`, `periods`) más `compositeSku` o un texto de
  búsqueda. Devuelve un brief editable con las líneas de la receta (cada una con su `recipeLineId` y el kit por
  defecto de su perfil) y preguntas por lo que la receta no dice (país del talento, política de asignación).
- Candidatos: primero los compuestos con nombre de la práctica que calzan con el texto; al final, el genérico. Así
  siempre hay un SKU que nombrar.
- Sobre un brief con líneas, la propuesta de demanda suma: los SKU candidatos de cada línea cuyo perfil no tiene
  producto, y los compuestos candidatos cuando el servicio gestionado no nombra ninguno. Son preguntas, no bloqueos.
- No inventa: una receta vacía produce un brief sin líneas y la pregunta de componer a mano.

**Cómo se registra un desvío.** No se escribe: se deriva. La cotización congela la composición real
(`brief.lines`) y el catálogo con la receta; `readQuoteItems` compara y dice, por línea, `as_recipe`, `changed`
(mismo `recipeLineId` con otro perfil, cantidad, dedicación o modo) o `added`, y por cotización las líneas de la
receta que no están. No pide motivo y no es una brecha de emisión.

**Los siete servicios existentes.** Paso de curación con dueño (CEO para la lista; Commercial/Finance para las
recetas), no una decisión del ejecutor. La hoja presenta, por cada `EFG-001`…`EFG-007`: su nombre, si tiene receta
(sólo tres; la de `EFG-001` trae herramientas duplicadas), la oferta de V3 que podría preciarlo o que ninguna puede,
y lo que realmente se ha cotizado con V3 que se le parece. El dueño marca cada uno como compuesto con nombre (con su
oferta y su receta en dedicación), como servicio que queda fuera de V3, o como pendiente. Aparte, define un compuesto
genérico por cada práctica que se vende como servicio gestionado (hoy dos ofertas), que se acuñan en Productos.

### 5. Line item y custom item

La unidad es la fila interna de la cotización, que es más fina que lo que ve el cliente: la fila mensual de cada
línea (`<lineId>`), su puesta en marcha (`<lineId>:setup`) y cada costo de tercero refacturado
(`third_party:<costId>`). En un servicio gestionado el cliente ve un fee, y las filas internas son sus componentes.

Cada fila tiene una **categoría**, de una lista cerrada, que el motor deriva de la naturaleza de la fila. Quien
cotiza no la escribe, así que no puede contradecir a la fila.

| Categoría | Qué es | Producto que le corresponde |
| --- | --- | --- |
| `role_capacity` | capacidad de un perfil por dedicación | el SKU del rol (`ECG-###`). Sin vínculo, la fila es custom hasta que se acuñe su rol: no hay genérico |
| `start_up` | puesta en marcha (cuenta, reclutamiento) | un producto **genérico** |
| `third_party_production` | costo de tercero, producción | un producto **genérico** |
| `third_party_talent` | costo de tercero, talento | un producto **genérico** |
| `third_party_printing` | costo de tercero, impresión | un producto **genérico** |
| `third_party_media` | costo de tercero, medios | un producto **genérico** |
| `third_party_licences` | costo de tercero, licencias | un producto **genérico** |

- **Line item:** la fila tiene producto, propio o genérico.
- **Custom item:** la fila no tiene producto. Lleva su categoría y un motivo.
- Un custom item **no es una línea libre**: en V3 no existe una fila con un monto tecleado. Toda fila, con producto o
  sin él, sale del motor con su costo, su margen y su piso. «Custom» sólo dice que a esa fila le falta producto; nunca
  que alguien escribió su precio. Esta task no agrega esa posibilidad.
- La lista de terceros la cierra el catálogo: una categoría `third_party_<categoría>` por cada `third_party_policy`
  en vigor. Una categoría nueva sin vínculo es custom hasta que tenga su producto genérico.
- Con sus vínculos en vigor, la puesta en marcha y los terceros son line items con SKU genérico, y el custom item
  queda para lo que de verdad no está en el catálogo: un perfil sin producto, o una categoría recién creada.
- Un servicio gestionado sin compuesto no es un custom item: es una cotización sin compuesto declarado, con su propia
  señal. Sus filas siguen siendo los perfiles que lo componen. Como cada práctica tiene su compuesto genérico,
  siempre hay uno que nombrar.
- La casa de los productos genéricos (familia `EFO` de `overhead_addons` o un producto `manual`) se confirma en
  Discovery y la decide la curación; la recomendación es `overhead_addons`, que ya tiene secuencia y materializador.

Motivo: `brief.customItems[]`, opcional, con `itemKey` (la llave de la fila) y `reason` (1 a 1000 caracteres). Un
custom item sin motivo se calcula, se registra y se emite igual; la evaluación lo señala.

**No requieren SKU**, y nadie debe acuñarles uno: el fee de plataforma (`fee:ECG-###`), los asientos de herramienta
dentro de un kit, las provisiones (cobertura, guardia, onboarding, reclutamiento como costo), la reserva de
contingencia y los créditos de IA. Son componentes de costo de una fila, nunca un ítem del cliente. Un costo que el
cliente paga directo a su proveedor tampoco: está fuera de todo total.

**Guardas contra el abuso, ninguna con persona:**

1. `compose scaffold` y `catalog search` proponen primero los SKU que calzan.
2. La evaluación levanta una señal de revisión cuando el neto en custom items supera una proporción del neto del
   plazo. El umbral es un valor de política del catálogo, registro `custom_item_policy` (`reviewShare`, con `offerId`
   opcional que prevalece sobre el general), cuyo dueño es el CEO. No se escribe en el código. Punto de partida
   propuesto para la hoja de curación: 0,20, como `estimated` hasta que el CEO lo confirme. Sin registro en vigor no
   hay señal por proporción.
3. `readRepeatedCustomItems` lista los custom items que se repiten (misma categoría y etiqueta normalizada, en
   cotizaciones distintas) y, aparte, las etiquetas que se repiten bajo un producto genérico: candidatos a producto.

Señales nuevas de `compose assess`, sólo cuando el catálogo del artefacto declara identidad: `PRODUCT_REASON_REQUIRED`
(custom item sin motivo), `COMPOSITE_NOT_DECLARED` (servicio gestionado sin compuesto) y `CUSTOM_ITEMS_SHARE_REVIEW`
(proporción sobre el umbral). Tienen dueño Commercial y ninguna condiciona la emisión: la regla de emisión de
`TASK-2027` sigue leyendo sólo el piso.

### 6. La lectura por línea — `readQuoteItems`

Función pura del motor sobre un artefacto, para los tres carriles. Es la única que dice qué producto lleva una fila;
la CLI la imprime con `compose items` y la plataforma la guarda.

- `productIdentityDeclared`: el catálogo del artefacto tiene al menos un `product_binding` o un `composite` en vigor
  a la fecha de la cotización. Con `false`, todas las filas son custom por definición y no hay señales.
- Cabecera: oferta, unidad comercial, código y forma de compromiso, mercado, moneda, fecha; compuesto (SKU, si es
  genérico, estado de la receta); línea de negocio (`composite.businessLineCode`, si no `offer.businessLineCode`, si
  no nula); plazo; neto, costo y margen del plazo; neto recurrente mensual (filas `monthly` sobre los períodos), neto
  de única vez (`setup`) y neto de terceros; neto y proporción en custom items y si supera el umbral.
- Filas: las columnas de `quoter_quote_version_line_index`.
- Herramientas: por herramienta y plan, el SKU si lo hay y el costo atribuido en el plazo. Van aparte porque son costo
  dentro de las filas: sumarlas a las filas contaría el costo dos veces.

No se llama MRR ni ARR: el cotizador no conoce la duración del contrato.

### 7. Tablas de lectura

Todas reconstruibles desde texto guardado; el runtime puede insertar, reemplazar y borrar; ninguna es inmutable ni
fuente. Llave foránea a la versión o al documento que leen. Cada una guarda `extractor_version` e `indexed_at`.

Permisos, con el modelo real de roles de la base (los mismos cuatro nombres que usa `TASK-2025`):

- `REVOKE ALL` de `greenhouse_runtime`, `greenhouse_app`, `greenhouse_migrator` y `greenhouse_migrator_user` antes de
  conceder nada: los privilegios por defecto del esquema le dan de todo a una tabla nueva.
- `GRANT SELECT, INSERT, UPDATE, DELETE` al grupo `greenhouse_runtime`. A diferencia de `quoter_quote_version_index`,
  que se reconstruye por reemplazo y no tiene `DELETE`, estas tablas tienen varias filas por versión: reconstruir
  exige borrar las que el extractor ya no produce.
- El bloque de verificación comprueba el privilegio **efectivo** de `greenhouse_app` (que hereda de
  `greenhouse_runtime`) y de `greenhouse_migrator_user` (que hereda de `greenhouse_migrator`) con
  `has_table_privilege`, no el del grupo. En `quoter_quote_versions` comprueba que siguen sin `UPDATE`, `DELETE` ni
  `TRUNCATE`.
- `SET LOCAL lock_timeout = '5s'` al inicio: el `ALTER TABLE` y las llaves foráneas toman bloqueo y no deben hacer
  cola detrás de un escritor largo.
- Cada `RAISE` lleva `USING ERRCODE` y `CONSTRAINT = '<nombre estable>'`, y `errors.ts` lo mapea a su código en
  `QUOTER_CONSTRAINT_CODES`, con la prueba de paridad que ya existe.
- El archivo se queda en `docs/tasks/pending-migrations/` hasta el visto bueno del operador; al moverlo, `-- Up
  Migration` es su primera línea.

**`quoter_quote_version_line_index`** — llave `(quote_id, version_number, item_key)`.

| Columna | Contenido |
| --- | --- |
| `item_key`, `billing_class` | llave de la fila; `monthly`, `setup` o `third_party` |
| `item_kind` | `line` o `custom` |
| `item_category` | categoría de la lista cerrada, siempre presente |
| `product_sku`, `product_generic` | SKU del producto, nulo en un custom item; si es producto genérico |
| `custom_reason` | motivo declarado de un custom item; nulo si no se declaró o si es un line item |
| `composite_sku`, `composite_generic` | compuesto de la cotización, repetido por fila para agrupar |
| `recipe_line_id`, `recipe_status` | `as_recipe`, `changed`, `added` o `not_applicable` |
| `offer_id`, `commercial_unit`, `engagement_code`, `engagement_form` | regla de precio y forma |
| `profile_id`, `talent_country`, `headcount` | de la línea; nulos en un tercero |
| `dedication_unit`, `dedication_value`, `fte_months` | dedicación declarada y su equivalente en el plazo |
| `period_first`, `period_last`, `periods_billed` | períodos en que la fila se cobra |
| `label` | concepto de la fila, para la lectura de repetidos |
| `currency`, `net`, `cost`, `margin_amount`, `margin_rate` | del plazo, en la moneda de la cotización |
| `minimum_margin`, `below_floor` | piso con que se juzgó y veredicto del kernel para la fila |

**`quoter_quote_version_tool_index`** — llave `(quote_id, version_number, tool_id, price_id)`: `product_sku`
(nulo si la herramienta no tiene producto), `periods_used`, `currency`, `attributed_cost`.

**`quoter_quote_version_commercial_index`** — llave `(quote_id, version_number)`: `product_identity_declared`,
`offer_id`, `commercial_unit`, `engagement_code`, `engagement_form`, `market_country`, `quote_date`,
`composite_sku`, `composite_generic`, `recipe_deviation`, `business_line_code`, `currency`, `term_periods`,
`term_net`, `recurring_monthly_net`, `one_off_net`, `third_party_net`, `term_cost`, `margin_amount`, `margin_rate`,
`own_work_margin_rate`, `items_total`, `items_custom`, `custom_net`, `custom_share`, `custom_review`.

**`quoter_catalog_product_index`** — por documento de catálogo (`document_digest`): una fila por vínculo, por
compuesto, por línea de receta y por identificador con forma de SKU, con sujeto, SKU, etiqueta, oferta, vigencia y
retiro. Se escribe al guardar un documento fuente y se reconstruye desde `document_text` con una lectura tolerante
(no revalida con el validador de hoy). Es lo que la conformidad cruza con Productos sin abrir el documento.

Ninguna lleva organización destinataria ni negocio de HubSpot.

**Guarda de registro.** Una versión de una cotización con `data_origin` real cuyo artefacto no declara identidad de
producto se rechaza con un código propio, `product_identity_required`. Una sintética no la exige. Vive en dos capas:

1. **En el código, en `prepareArtifact`.** Es la función por la que pasan `createQuote` (versión 1) y
   `addQuoteVersion` (versión 2 en adelante); hoy recibe sólo el texto del artefacto y pasa a recibir también el
   origen de la cotización: `createQuote` le entrega el que declara su entrada y `addQuoteVersion` el de la cotización
   que ya leyó bajo su bloqueo. Ponerla sólo en `addQuoteVersion` dejaría sin guarda a toda versión 1, que es por
   donde nace una cotización. `prepareArtifact` obtiene el hecho de `readQuoteItems(...).productIdentityDeclared`, la
   misma lectura del motor que usa la CLI.
2. **En la base.** `quoter_quote_versions` gana `product_identity_declared boolean NOT NULL`, sin valor por defecto:
   lo escribe `insertVersion` desde ese mismo hecho, igual que `below_floor`. Un disparador nuevo y propio sobre la
   inserción de versiones (no reemplaza la función de `TASK-2025`) lee el `data_origin` de la cotización y rechaza una
   versión real con `false`, con un `CONSTRAINT` con nombre que `errors.ts` mapea a `product_identity_required`. Una
   sintética puede llevar `false`.

Es la única columna que esta task agrega a una tabla inmutable. Se puede porque la tabla está vacía: la migración
comprueba que `quoter_quote_versions` no tiene filas antes del `ALTER TABLE` y aborta si las tiene. Por eso ninguna
cotización, real ni sintética, entra a la base compartida antes de aplicarla; el carril local sigue creando sintéticas
en su propio clúster.

La base no puede comprobar que el booleano corresponde al texto, igual que con `below_floor`: lo que garantiza es que
ningún escritor registra una versión real sin declararlo, y la prueba estática de frontera garantiza que el único
escritor es `quote-store.ts`.

Es lo que hace verdadera la regla «ninguna cotización real se registra antes de que esto exista». Una cotización hecha
en local con la versión 11 del catálogo, o con cualquier versión que no declare identidad, se vuelve a cotizar con la
versión 12 antes de registrarla como real: no se registra tal cual ni se le agrega identidad a mano.

### 8. Conformidad con Productos y guarda inversa

`readProductConformance` cruza el catálogo que nombra `quoter_current_pointer` con las tablas fuente de Productos y
devuelve una fila por hallazgo:

| Hallazgo | Severidad | Qué significa |
| --- | --- | --- |
| `match` | — | sujeto y SKU existen, activos, con el mismo nombre |
| `missing_in_products` | error | el vínculo nombra un SKU que Productos no tiene |
| `archived_in_products` | error | el SKU existe pero su fuente está inactiva o su producto archivado |
| `kind_mismatch` | error | el SKU es de otra familia que el sujeto |
| `sku_shape_mismatch` | error | el identificador del sujeto tiene forma de SKU y no es el SKU vinculado |
| `sku_shaped_id_unbound` | error | identificador con forma de SKU sin vínculo (la clase de `ETG-017`) |
| `name_drift` | aviso | la etiqueta difiere |
| `unbound_in_v3` | aviso | perfil, herramienta o categoría en vigor sin vínculo |
| `only_in_products` | aviso | producto activo con SKU que ningún vínculo nombra |
| `recipe_drift` | aviso | la receta del compuesto difiere de la de Productos |
| `business_line_unknown` | aviso | la línea de negocio declarada no existe en `service_modules` |

Dónde corre y quién lo lee:

- **Señal** `commercial.quoter.product_identity_drift` en el plano de confiabilidad (clase `data_quality`; estado
  sano: cero errores). La leen los dueños del catálogo (Commercial/Finance) y cualquier agente por Platform Health.
- **Comando** `pnpm quoter:products conformance`, para el agente o la persona que prepara un cambio de catálogo.
- **Informe del importador**: `pnpm quoter:import` lo imprime después de reflejar un puntero. Lo lee quien activa.
- **En local**, sin red, `catalog validate` avisa lo que se puede saber sin Productos: una receta que nombra un
  perfil o una herramienta que no está en vigor, un identificador con forma de SKU sin vínculo, y el sujeto de un
  vínculo que no existe en el catálogo o en la política. Son avisos; lo que el validador rechaza es lo estructural
  (sección 1 y sección 4). Que el SKU exista en Productos sólo se comprueba en línea; en local es un hecho declarado
  y no verificado.

Guarda inversa: `previewPricingCatalogImpact` suma a su resultado si el rol, la herramienta, el recargo o el servicio
que se va a desactivar está nombrado por el catálogo vigente de V3 (vínculo o receta que lo usa). Informa; no
bloquea. Después de desactivar, la señal queda en error por `archived_in_products`.

### 9. Lecturas de inteligencia de negocios

Vista sobre las lecturas por línea y `quoter_quote_current`. Reglas de conteo:

- Se cuentan cotizaciones, no versiones; cada una se lee en la versión que nombra su estado (la última emitida, o la
  aceptada o rechazada).
- Sólo cotizaciones reales; las sintéticas se excluyen salvo que se pidan.
- **Cotizada:** emitida al menos una vez. Un borrador no cuenta.
- **Vendida:** estado vigente `accepted`.
- **Cotizada y no vendida:** estado efectivo `rejected` o `expired`. `expired` se toma de
  `quoter_quote_current.effective_state`; no se reaplica la regla de vigencia. Una emitida dentro de vigencia está
  abierta y no entra en ninguno de los dos grupos.
- **Rentabilidad:** margen real de las filas (`margin_amount` sobre `net`), de las vendidas.
- Los montos se agrupan por moneda y no se convierten. El margen como proporción sí se compara entre monedas.

`readProductDemand({ by: 'product' | 'composite', … })` devuelve por SKU y moneda: cotizaciones cotizadas, vendidas,
rechazadas y vencidas; neto cotizado y vendido; costo y margen de lo vendido; proporción de margen. Por producto
incluye las filas que son componentes de un compuesto; por compuesto agrupa por `composite_sku`, con los servicios
gestionados sin compuesto en un grupo propio. Los custom items salen bajo su categoría, sin SKU.

### 10. Documento del cliente

No cambia. Ver Open Questions.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 4. Slice 3 (curación) corre en paralelo con 1 y 2 y debe estar cerrada antes del Slice 4.
- Slice 5 puede empezar después del Slice 2 y no depende del Slice 4. Su migración espera el visto bueno del operador.
- Slice 6 necesita Slice 4 (versión con vínculos importada) y Slice 5 (índice del catálogo).
- Slice 7 necesita Slice 5. Slice 8 al final.
- El código del Slice 1 está en producción antes de que el puntero de la plataforma nombre la versión nueva.
- `TASK-2027` no registra una cotización real hasta que los Slices 4 y 5 estén cerrados, y no registra ninguna,
  tampoco sintética, en la base compartida hasta que la migración del Slice 5 esté aplicada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una clave nueva mueve la huella de artefactos congelados | motor | medium | Claves opcionales sin valor por defecto; registros inertes; guarda de artefactos congelados y línea base de la CLI como puerta del Slice 1 | `REPLAY_MISMATCH` en `pricing-v3-frozen-artifacts.test.ts` |
| La versión nueva cambia una cifra | catálogo | low | `catalog preview` con todas las demandas declaradas como impacto; comparación fila por fila antes de aplicar | diferencia en el antes y después del impacto |
| Retirar `ETG-017` rompe una selección | catálogo | low | Comprobación en Discovery de kits y política; reemisión con otro identificador si algo lo selecciona | diagnóstico de selección en el impacto |
| Todo termina como custom o como genérico | negocio | medium | Candidatos primero; umbral de política; lectura de repetidos, que incluye etiquetas bajo genéricos | `CUSTOM_ITEMS_SHARE_REVIEW`; `custom_share` en la lectura |
| El catálogo y Productos se desalinean después | Productos | medium | Señal de conformidad; guarda inversa en el análisis de impacto | `commercial.quoter.product_identity_drift` |
| Acuñar un SKU crea un producto en HubSpot sin que nadie lo espere | HubSpot | medium | La persona que acuña confirma antes el estado vivo de las banderas `GREENHOUSE_PRODUCT_SYNC_*` | producto nuevo en `product_catalog` con intento de sync |
| Una lectura por línea contradice al artefacto | registro | low | Una sola función del motor; prueba que corrompe la lectura y comprueba que el lector responde lo que dice el texto; reconstrucción | diferencia al reconstruir |
| Se registra una cotización real sin identidad | registro | medium | Guarda `product_identity_required` en `prepareArtifact` (cubre `createQuote` y `addQuoteVersion`) y regla en la base sobre la fila de la versión | rechazo de registro |
| Alguien registra una cotización en la base compartida antes de la migración | base | medium | La migración aborta si `quoter_quote_versions` tiene filas; `TASK-2027` espera a que esté aplicada; aviso en `Handoff.md` | conteo de filas antes de aplicar |
| La migración le deja a runtime privilegios de más o de menos | base | low | `REVOKE ALL` de los cuatro roles y comprobación del privilegio efectivo de `greenhouse_app` y `greenhouse_migrator_user` en el bloque de verificación | la migración aborta |
| Migración aplicada en la base compartida antes de tiempo | base | medium | Archivo en `docs/tasks/pending-migrations/` hasta el visto bueno del operador | `pnpm migrate:status` |
| El runtime desplegado no conoce las clases nuevas cuando el puntero ya las nombra | plataforma | low | Regla de orden: release del Slice 1 antes de importar la versión | error de validación al leer el catálogo |

### Feature flags / cutover

Sin bandera nueva. El contrato es inerte: un catálogo sin los registros nuevos no dice nada de productos y nada
cambia. El corte es un acto ya existente y de persona: activar la versión nueva del catálogo (`current set` con su
huella de confirmación y su motivo) y reflejarla con `pnpm quoter:import`. Las tablas nuevas sólo agregan, y la
columna de la guarda de registro se agrega sobre una tabla sin ninguna fila.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el código; ningún catálogo en vigor usa las clases nuevas todavía | minutos | sí |
| Slice 2 | Revertir el código; son lecturas | minutos | sí |
| Slice 3 | La hoja es un documento; un SKU acuñado no se borra (inmutable): se deja sin vínculo | sin retorno para el SKU | parcial |
| Slice 4 | Activar de nuevo la versión anterior con una fila nueva de puntero y su motivo; la versión nueva se conserva | menos de 10 minutos | sí, sin borrar historia |
| Slice 5 | Revertir el código; las tablas quedan vacías y sin uso. La columna se quita con la bajada sólo mientras no exista una cotización real; después, con otra migración hacia adelante | minutos | sí, hasta la primera cotización real |
| Slice 6 | Revertir el código; la señal deja de evaluarse | minutos | sí |
| Slice 7 | Revertir el código; son lecturas | minutos | sí |
| Slice 8 | Revertir documentos | minutos | sí |

### Production verification sequence

1. `pnpm pricing:v3:test` en verde con el Slice 1; `git diff` vacío sobre `calculate.ts` y `schemas.ts`.
2. Release de Greenhouse con los Slices 1 y 2 antes de tocar el puntero.
3. Hoja de curación cerrada por su dueño; SKU acuñados y anotados.
4. `catalog preview` de la versión nueva con todas las demandas declaradas: ninguna cifra distinta. `catalog apply`.
5. Una persona activa la versión; `pnpm quoter:import` la refleja; segunda corrida sin escrituras.
6. Antes de aplicar: `quoter_quote_versions` tiene cero filas (lectura de sólo lectura contra la base). Migración
   aplicada con el visto bueno del operador y verificada con su bloque; `pnpm db:generate-types`; reconstrucción del
   índice del catálogo desde los documentos ya importados.
7. `pnpm quoter:products conformance` contra la base: cero errores, o cada error con dueño en la hoja.
8. La señal aparece en el plano de confiabilidad en estado sano.
9. Lectura de vuelta: las tres lecturas por versión existen, vacías, con sus permisos; el índice del catálogo tiene
   las filas de los documentos importados, incluida la versión vigente; `quoter_quote_versions` tiene la columna
   nueva y su disparador, y `greenhouse_app` sigue sin poder actualizar ni borrar en ella.

### Out-of-band coordination required

- CEO: lista de compuestos con nombre, genéricos por práctica, umbral de custom items, línea de negocio por oferta.
- Commercial/Finance: recetas en dedicación; destino de `ETG-017` y de las ocho herramientas.
- Una persona con `efeonce_admin` o `finance_admin`: acuñar los SKU en `/admin/pricing-catalog` y activar la versión.
- Operador: visto bueno de la migración; estado vivo de las banderas `GREENHOUSE_PRODUCT_SYNC_*` en Vercel y en el
  `ops-worker` antes de acuñar; release por el control plane.
- Quien ejecute `TASK-2026` y `TASK-2027`: aviso de las clases nuevas y de la guarda de registro.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `calculate.ts` y `schemas.ts` no tienen diferencias respecto del commit anterior a la task.
- [ ] Los artefactos congelados del repo se reproducen con su misma huella, y la línea base de la CLI pasa sin
      regenerar un fixture existente.
- [ ] Un catálogo sin registros nuevos y un brief sin claves nuevas se validan a un objeto idéntico al de antes
      (prueba que compara la salida del validador).
- [ ] Ningún registro `resource` ganó una clave, y ninguna clave nueva tiene valor por defecto.
- [ ] Cada clase nueva declara su identidad; una revisión que cambia el sujeto o el SKU de un vínculo, o el SKU de un
      compuesto, se rechaza con `CATALOG_IDENTITY_CONFLICT`.
- [ ] El validador rechaza dos vínculos en vigor para un sujeto, dos sujetos en vigor para un SKU, un compuesto cuya
      oferta no se vende como servicio gestionado y dos genéricos en vigor para una oferta.
- [ ] La versión nueva del catálogo se emitió por change-set, revisión, aplicación y activación por una persona, y su
      impacto sobre todas las demandas declaradas del repo no muestra ninguna cifra distinta.
- [ ] La versión nueva vincula los perfiles y las herramientas que la hoja de curación lista como vinculados, y
      `ETG-017` ya no está en vigor en V3 con ese identificador.
- [ ] Ningún identificador con forma de SKU del catálogo vigente queda sin vínculo al mismo SKU.
- [ ] Las herramientas sin SKU quedaron acuñadas en Productos por una persona, o listadas en la hoja como sin
      producto con su razón; ninguna se acuñó desde una cotización o desde un comando de cotizar.
- [ ] Una cotización con un perfil sin vínculo, con un tercero de una categoría sin producto y con un custom item sin
      motivo calcula, y `compose assess` reporta cada caso sin bloquear.
- [ ] Un brief que nombra un compuesto inexistente, o de otra oferta, no calcula y lo dice con un diagnóstico propio.
- [ ] `compose scaffold` con un pedido de compuesto devuelve un brief con las líneas de la receta y su
      `recipeLineId`, y para un texto sin coincidencia propone el genérico de la práctica.
- [ ] Cotizar dos veces el mismo servicio produce dos artefactos con el mismo `compositeSku`.
- [ ] `readQuoteItems` clasifica una línea cambiada, una agregada y una quitada respecto de la receta.
- [ ] La señal por proporción usa el valor del registro `custom_item_policy` en vigor; sin registro no se levanta; no
      hay umbral escrito en el código (prueba con dos valores).
- [ ] Sobre un artefacto cuyo catálogo no declara identidad, `compose assess` devuelve lo mismo que antes.
- [ ] `clientSafePeriodItems` y el documento del cliente no cambian (prueba sobre los ejemplos del repo).
- [ ] La migración es un archivo nuevo, sólo agrega, tiene bloque de verificación y pasa `pnpm migration-marker-gate`;
      las tres migraciones aplicadas de `TASK-2025` no tienen diferencias.
- [ ] La migración aborta si `quoter_quote_versions` tiene alguna fila, y su bajada se niega con una cotización real
      registrada (ambas probadas en el clúster local).
- [ ] El bloque de verificación comprueba el privilegio efectivo de `greenhouse_app` y de `greenhouse_migrator_user`
      sobre cada tabla nueva y sobre `quoter_quote_versions`.
- [ ] Cada rechazo nuevo de la base tiene un `CONSTRAINT` con nombre mapeado en `QUOTER_CONSTRAINT_CODES`, y la
      prueba de paridad lo cubre.
- [ ] `quoter_catalog_product_index` tiene filas de los 24 documentos que ya estaban importados, y repetir la
      reconstrucción no cambia nada.
- [ ] Las cuatro tablas se pueden vaciar y reconstruir desde el texto guardado y quedan idénticas (prueba contra
      PostgreSQL real).
- [ ] Una versión cuya lectura por línea se corrompe a propósito sigue respondiendo lo que dice su artefacto.
- [ ] Crear una cotización **real** por `createQuote` con un artefacto que no declara identidad se rechaza con
      `product_identity_required`; lo mismo al agregarle una versión por `addQuoteVersion`; la misma como sintética
      se registra por los dos caminos.
- [ ] Una inserción directa en `quoter_quote_versions` de una versión real con `product_identity_declared = false`
      la rechaza la base, sin pasar por el código (prueba contra PostgreSQL real).
- [ ] La regla de emisión sigue leyendo `below_floor` de la fila de la versión: con la lectura por línea corrompida
      a propósito, una versión bajo el piso sigue sin poder emitirse sin su aprobación.
- [ ] Ninguna tabla nueva tiene columna de organización, de cliente ni de negocio de HubSpot.
- [ ] Las cuatro tablas están en el mapa exacto de `boundary-domain.test.ts` con su único escritor
      (`quote-store.ts` para las tres por versión, `source-documents-store.ts` para el índice del catálogo), y
      ninguna tabla de historia cambió de trato en esa prueba.
- [ ] Ninguna ruta, herramienta ni documento nuevo entrega costo o margen de las tablas nuevas fuera de la audiencia
      interna.
- [ ] `readProductConformance` devuelve cada hallazgo de la tabla sobre casos construidos, y contra la base
      compartida no deja ningún error sin dueño en la hoja.
- [ ] La señal `commercial.quoter.product_identity_drift` está registrada y se vio en error con un caso construido.
- [ ] `previewPricingCatalogImpact` informa que un producto nombrado por el catálogo vigente de V3 está en uso.
- [ ] **Más cotizado:** con cotizaciones sintéticas, la lectura ordena por producto y por compuesto según cotizaciones
      emitidas.
- [ ] **Más vendido:** cuenta sólo las aceptadas, por producto y por compuesto.
- [ ] **Más rentable:** devuelve el margen real de lo vendido, por producto y por compuesto.
- [ ] **Cotizado y no vendido:** cuenta las emitidas y luego rechazadas, y las emitidas con vigencia vencida; una
      emitida dentro de vigencia no cuenta.
- [ ] Un borrador y una cotización sintética no entran en ninguna de las cuatro lecturas por defecto.
- [ ] `readRepeatedCustomItems` lista un custom item que se repite en dos cotizaciones y una etiqueta que se repite
      bajo un producto genérico.
- [ ] Las cuatro lecturas agrupan por moneda y no convierten montos.
- [ ] Ningún comando nuevo pide una aprobación de persona, y ningún par de la matriz de estados cambió.
- [ ] La CLI local hace todo lo anterior sin red; lo que sólo se sabe en línea se reporta como no verificado.

## Verification

- `pnpm task:lint --task TASK-2031`
- `pnpm pricing:v3:test`
- `pnpm vitest run src/lib/commercial/quoter src/lib/commercial/product-catalog src/lib/reliability`
- `pnpm quoter:test:local`
- `pnpm test:live` serializado para las consultas nuevas
- `pnpm migration-marker-gate` y `pnpm db:generate-types`
- `pnpm pricing:v3 catalog validate --current` y `pnpm pricing:v3 current show`
- `pnpm quoter:import` (dos corridas) y `pnpm quoter:products conformance`
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

- [ ] Documentación técnica: `GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md` (tablas de lectura y guarda de registro),
      `## Delta` en `GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` (clases nuevas e identidad) y en
      `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` (Productos nombra, V3 precia; conformidad).
- [ ] Documentación funcional: `docs/documentation/finance/cotizador-v3-identidad-de-producto.md`, con la hoja de
      curación cerrada, la lista de categorías y qué no lleva SKU.
- [ ] Manual: cómo nombrar un compuesto, qué hacer con una línea sin producto y cómo leer las señales, en
      `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md` y `cotizar-v3-por-cli.md`; cómo acuñar un SKU
      antes de vincularlo.
- [ ] Skill `efeonce-pricing-operator` actualizada en `.claude/skills/` y `.codex/skills/`, con
      `pnpm skills:mirrors` en verde.
- [ ] `data/pricing/v3-operating/README.md` nombra la versión nueva y lo que declara.
- [ ] `## Delta` en `TASK-2026`, `TASK-2027`, `TASK-2028`, `TASK-2029`, `TASK-2030` y en las `TASK-620.x`.
- [ ] `EPIC-053` actualizada, con la casilla de esta fase y su evidencia.
- [ ] El estado se reporta como «code complete, rollout pendiente» mientras falte activar la versión nueva o aplicar
      la migración.

## Follow-ups

- Carril programático de Productos (leer, acuñar, renombrar y archivar un producto por la API de plataforma): hoy un
  agente no puede crear el producto que le falta. Dueño: Platform con Commercial.
- Registrar las banderas `GREENHOUSE_PRODUCT_SYNC_*` en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su estado
  por runtime.
- Limpieza de Productos (roles de prueba, recargos que V3 reemplazó, `ETG-017` si queda sin uso): cada archivo es un
  acto aprobado aparte, porque archiva en HubSpot.
- Moneda común para comparar montos en la inteligencia de negocios.
- Rutas de plataforma de las lecturas nuevas, si `TASK-2026` y `TASK-2027` no las publican en su cierre.
- Vínculo con el negocio de HubSpot y salida de líneas con producto (unidad U2).
- `TASK-2032`: precio de referencia de Productos calculado por V3.

## Open Questions

- **Documento del cliente.** ¿Una línea muestra su SKU? El PDF del cotizador actual lo imprime cuando la línea tiene
  producto; los datos de la plantilla A4 no tienen clave para él. Recomendación: no imprimirlo; un servicio
  gestionado es un fee y el SKU es una referencia interna. Si se quiere, entra en la misma versión nueva de los
  datos del documento que ya hace falta para imprimir número y versión.
- ¿Los productos genéricos (puesta en marcha y terceros por categoría) viven en `overhead_addons` (`EFO-###`) o como
  productos `manual`? Recomendación: `overhead_addons`.
- ¿El neto bajo productos genéricos cuenta para la proporción que levanta la revisión? Recomendación: no; se reporta
  aparte en la lectura de repetidos.
- ¿Qué línea de negocio se declara para la oferta de dotación, que cruza prácticas? Si no se declara, queda nula.
- ¿Existe un uso real del carril `pricing-v3-local-artifact/1`? Un artefacto sin catálogo dentro no puede declarar
  identidad, y la guarda de registro lo deja fuera de las cotizaciones reales.
- ¿Un compuesto con nombre sin receta se admite, o todo compuesto con nombre debe tener una? El contrato lo admite.
- Destino de los servicios `EFG` que ninguna oferta de V3 puede preciar hoy: quedan fuera de V3 hasta que exista su
  oferta. Lo decide el CEO en la hoja de curación.
