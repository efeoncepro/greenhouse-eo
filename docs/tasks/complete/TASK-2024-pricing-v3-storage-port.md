# TASK-2024 — Pricing V3: puerto de almacenamiento y motor sin acceso a disco

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-053`
- Status real: `Completa el 2026-10-12. Cambio de repo, sin runtime desplegado: no hay rollout pendiente. Sin push`
- Rank: `EPIC-053-01 (fase 1 del programa)`
- Domain: `finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Define un puerto de almacenamiento para lo que la CLI de Pricing V3 lee y escribe hoy —documentos de catálogo,
política y créditos por versión y huella, el puntero de versiones vigentes y los artefactos congelados— con un
adaptador de archivos que reproduce el comportamiento actual byte a byte. Agrega el arnés de conformidad que prueba que
todo artefacto y ejemplo versionado en el repo se reproduce idéntico a través del puerto. No cambia ningún
comportamiento: es la base para que una task posterior agregue el adaptador PostgreSQL y el motor corra donde no hay
sistema de archivos.

## Why This Task Exists

El cálculo de V3 ya es puro: ningún archivo no-test bajo `src/lib/finance/pricing-v3/**` importa `node:fs`, y toda la
lectura y escritura vive en la CLI (`scripts/commercial/pricing-v3.ts`). Pero la **orquestación** que une los pasos
—leer el puntero, comprobarlo contra sus fuentes, cargar el documento que nombra, calcular, congelar sin sobrescribir—
está escrita dentro de la CLI y contra rutas de archivo. Una API en Vercel no puede leer `data/pricing/v3-operating/*.json`
en tiempo de ejecución (el gate `pnpm vercel:reachability-gate` rechaza rutas armadas desde el directorio de trabajo, y
`scripts/**` está en su lista de denegación), así que no puede reutilizar ese camino tal como está.

Sin un puerto, la fase de base de datos tendría que reescribir la carga de fuentes en un segundo lugar, y dos caminos
de carga son dos lugares donde la API y la CLI pueden divergir. La decisión aceptada fija lo contrario: un motor, dos
transportes, y el almacenamiento como puerto con dos adaptadores (decisión 3).

## Goal

- Un contrato de almacenamiento, sin dependencias de disco, que cubre documentos por huella, puntero y artefactos.
- Adaptador de archivos que deja a la CLI exactamente como está: mismas entradas, salidas, códigos de salida, errores
  tipados, modos de archivo y contenido de cada archivo escrito.
- Adaptador en memoria que demuestra que el camino completo (puntero → fuentes → cálculo → congelado → lectura) corre
  sin sistema de archivos.
- Arnés de conformidad permanente: todo adaptador presente o futuro pasa la misma batería sobre el corpus del repo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` (decisiones 1, 3, 4, 9 y reglas duras).
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` (§3, §4, fase 1 de §6).
- `docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md` (registro cerrado de
  motores; guarda de artefactos congelados §5).
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` (versiones inmutables; puntero con
  confirmación por huella; aplicar nunca activa).
- `docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md` (códigos de salida `0/2/3/1`, errores
  tipados, qué se congela).
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` y
  `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.

Reglas obligatorias:

- `src/lib/finance/pricing-v3/calculate.ts` y `src/lib/finance/pricing-v3/schemas.ts` **no se modifican**.
- Ningún comando de `pnpm pricing:v3` cambia sus entradas, su salida estándar, su salida de error, su código de salida
  ni el código de sus errores tipados. Tampoco cambia el contenido, el nombre ni el modo de un archivo que escribe.
- Los archivos no-test bajo `src/lib/finance/pricing-v3/**` siguen importando sólo módulos relativos, `decimal.js`,
  `zod` y `node:crypto`. El adaptador de archivos, que necesita `node:fs`, vive fuera de esa carpeta.
- No se agrega ni se renombra ningún código en `src/lib/finance/pricing-v3/errors.ts`: el puerto reutiliza los códigos
  de adaptador existentes (`INPUT_NOT_FOUND`, `INPUT_NOT_JSON`, `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE`,
  `CURRENT_VERSIONS_CONFLICT`, `CURRENT_VERSIONS_MISMATCH`, `REPLAY_MISMATCH`).
- Ningún artefacto congelado del repo cambia un solo byte. Ningún campo nuevo entra al resultado ni al artefacto.
- Un rechazo nombra la opción y la regla, nunca el valor recibido, la ruta ni el mensaje del sistema.
- `pnpm pricing:v3:test` queda en verde, incluida la guarda `pricing-v3-frozen-artifacts.test.ts`.
- No se crea nada bajo `src/lib/commercial/`: ahí vivirá el agregado con estado (ver `## Detailed Spec`), en la task
  de base de datos.

## Normative Docs

- `docs/documentation/finance/cotizador-v3-promocion-canonica.md` (lo que la promoción debe preservar).
- `docs/documentation/finance/cotizador-v3-superficie-implementada.md` y
  `docs/documentation/finance/cotizador-v3-contrato-y-validacion.md`.
- `docs/manual-de-uso/finance/cotizar-v3-por-cli.md` y `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md`.
- `.claude/skills/efeonce-pricing-operator/SKILL.md` (los agentes operan la CLI con esta skill).

## Dependencies & Impact

### Depends on

- Decisión aceptada del programa. Ninguna otra task de `EPIC-053`: puede correr en paralelo con `TASK-2023` y con
  `TASK-2025`.
- Estado local de V3 (`TASK-2015` a `TASK-2022`, completas) y `TASK-2017` (en curso; economía, no toca el puerto).

### Blocks / Impacts

- Habilita el adaptador PostgreSQL de `TASK-2025`, la API de cálculo de `TASK-2026`, la de registro de `TASK-2027` y
  la capa de transporte de la CLI de `TASK-2028`.
- Toca `scripts/commercial/pricing-v3.ts`, que usan a diario personas y agentes para cotizar: cualquier diferencia
  observable es una regresión de esta task.
- `scripts/documents/render-cotizacion-a4.mjs` y su test consumen la salida de `compose document`: no deben notar el
  cambio.

### Files owned

- `src/lib/finance/pricing-v3/storage/port.ts` (contrato), `src/lib/finance/pricing-v3/storage/memory.ts`
  (adaptador en memoria), `src/lib/finance/pricing-v3/storage/sources.ts` (resolución de fuentes sobre el puerto),
  `src/lib/finance/pricing-v3/storage/index.ts`.
- `scripts/commercial/pricing-v3-storage-file.ts` (adaptador de archivos).
- `scripts/commercial/pricing-v3.ts` (sólo el reemplazo de sus llamadas directas a disco por el adaptador).
- `src/lib/finance/pricing-v3/__tests__/pricing-v3-storage-conformance.test.ts`,
  `src/lib/finance/pricing-v3/__tests__/pricing-v3-cli-golden.test.ts`,
  `src/lib/finance/pricing-v3/__tests__/pricing-v3-purity.test.ts` y los fixtures dorados bajo
  `src/lib/finance/pricing-v3/__tests__/fixtures/cli-golden/`.
- `docs/architecture/GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md` (nuevo), deltas en
  `docs/documentation/finance/cotizador-v3-superficie-implementada.md` y
  `docs/manual-de-uso/finance/cotizar-v3-por-cli.md`.

## Current Repo State

### Already exists

- Motor y contratos: `src/lib/finance/pricing-v3/calculate.ts`, `schemas.ts`, `errors.ts`, `catalog/`, `resources/`.
- Adaptadores puros (sólo `node:crypto`): `adapters/local-snapshot.ts` (`stableJson`, `runPricingV3`,
  `replayPricingV3`), `adapters/catalog-local.ts` (`catalogDigest`, `runCatalogQuote`, `replayCatalogQuote`,
  `previewCatalogChange`, `applyCatalogChange`), `adapters/resource-composition.ts`, `adapters/resource-maintenance.ts`
  y `adapters/current-versions.ts` (`currentVersionsSchema`, `verifyCurrentVersions`, `resolveCurrentSource`,
  `buildCurrentVersions`, `currentVersionsDigest`).
- CLI `scripts/commercial/pricing-v3.ts` (1.204 líneas). Su acceso a disco está concentrado en cuatro funciones:
  `readJson` (`:167`), `writeNew` (`:184`, exclusivo `wx`, modo `0600`), `readIfPossible` (`:199`) y `replacePointer`
  (`:209`, archivo temporal hermano y renombrado, modo `0644`); el serializador es `json` (`:89`, sangría de dos
  espacios y salto de línea final). La ruta del puntero es `data/pricing/v3-operating/current.json` (`:196`).
- Puntero vigente (`pricing-v3-current/1`): catálogo `operating-review-2026-10-11-v11`, política de la misma versión
  y créditos `operator-screenshots-2026-10-09-v1`, cada uno con `path`, `version` y `digest`.
- Corpus congelado: 48 archivos `*.artifact.json` bajo `data/pricing/**` y `docs/commercial/**`, en tres carriles
  (`pricing-v3-local-artifact/1`, `pricing-v3-selection-quote/1`, `pricing-v3-resource-composition/1`). La guarda
  actual recorre `data/pricing` más dos rutas fijas de `docs/commercial/prospects/`.
- Tests que ejecutan la CLI como proceso (`pricing-v3-cli-summary.test.ts`), y regla de ESLint que prohíbe un `Error`
  suelto en el módulo y en la CLI (`eslint.config.mjs:803-811`).

### Gap

- No hay un contrato que diga qué necesita el motor de su almacén: está implícito en las cuatro funciones de la CLI.
- La resolución «puntero → fuente comprobada» (`fromCurrent`, `load`, `loadCatalog`, `scripts/commercial/pricing-v3.ts:367-380`)
  vive en la CLI y no es reutilizable por un servidor.
- No hay una prueba que fije la salida de la CLI comando por comando; la paridad futura entre transportes no tiene
  línea base.
- La regla de imports permitidos del motor se cumple, pero confirmar en Discovery si ya existe un test que la haga
  cumplir; si no existe, esta task lo agrega.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/finance/pricing-v3/storage/` para el contrato y `scripts/commercial/` para el adaptador de archivos
- Future candidate home: `domain-package`
- Boundary: `PricingV3Storage` (documentos por huella, puntero, artefactos); consumidores autorizados: la CLI hoy, el adaptador PostgreSQL y los comandos de servidor de `EPIC-053` después
- Server/browser split: contrato y adaptador en memoria sin Node salvo `node:crypto`; el adaptador de archivos es exclusivo de la CLI y nunca se importa desde `src/`
- Build impact: none; sin dependencias nuevas, y ninguna ruta de `src/app` alcanza `scripts/commercial/`
- Extraction blocker: none para el contrato; el adaptador PostgreSQL futuro queda atado al pool y a las transacciones del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: ninguno cambia. Los JSON versionados en `data/pricing/**` siguen siendo la fuente; el
  puerto es la forma de leerlos y escribirlos.
- Consumidores afectados: CLI `pnpm pricing:v3`; indirectamente `scripts/documents/render-cotizacion-a4.mjs`.
- Runtime target: `local` (ningún runtime desplegado importa este código todavía).

### Contract surface

- Contrato existente a respetar: comandos, salidas, códigos de salida y errores documentados en
  `GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md`; forma del puntero `pricing-v3-current/1`; las tres
  versiones de artefacto.
- Contrato nuevo: interfaz `PricingV3Storage` y la batería de conformidad que todo adaptador debe pasar.
- Backward compatibility: `compatible` — cero cambios observables; se demuestra con fixtures dorados.
- Full API parity: el puerto es el primitive; CLI, API y MCP futuros lo consumen por un adaptador, sin lógica propia.

### Data model and invariants

- Entidades afectadas: ninguna tabla. Archivos bajo `data/pricing/**` (sin cambios de contenido).
- Invariantes que no se pueden romper:
  - Un documento se identifica por rol, versión y huella; el adaptador entrega un documento sólo si su huella
    recalculada coincide con la pedida.
  - Escribir un documento o un artefacto nunca sobrescribe: el segundo intento con la misma identidad y otro
    contenido es un rechazo, no un reemplazo.
  - El puntero se reemplaza sólo confirmando la huella del puntero que se reemplaza, y el reemplazo es atómico.
  - Aplicar un cambio de catálogo escribe un sucesor y no mueve el puntero.
  - Leer un artefacto devuelve su texto tal como se guardó; el puerto no lo reserializa, no lo ordena y no lo
    completa.
  - Resolver «lo vigente» ocurre al calcular, nunca al reproducir: un artefacto lleva sus fuentes dentro.
- Write-target allowlist: no aplica; no hay destinos de base de datos.
- Tenant/space boundary: no aplica en modo local; el contrato no lleva organización, que es responsabilidad del
  agregado de servidor.
- Idempotency/concurrency: escritura exclusiva para documentos y artefactos; confirmación por huella para el puntero
  (equivalente local del control optimista que el adaptador de servidor implementará).
- Audit/outbox/history: ninguno en esta task; el adaptador de archivos no audita, igual que hoy.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — refactor sin cambio de comportamiento, cubierto por fixtures dorados
  capturados antes de tocar la CLI.
- Backfill plan: ninguno.
- Rollback path: revert del cambio; no hay estado que deshacer.
- External coordination: ninguna.

### Security and access

- Auth/access gate: no aplica (herramienta local).
- Sensitive data posture: los artefactos llevan costos y márgenes internos; el adaptador conserva el modo `0600` de
  los archivos que la CLI escribe y no agrega registros con su contenido.
- Error contract: `PricingV3Error` con códigos ya registrados; detalle limitado a `{ option }`.
- Abuse/rate-limit posture: no aplica.

### Runtime evidence

- Local checks: batería de conformidad, fixtures dorados de la CLI, test de pureza de imports, suite de V3.
- DB/runtime checks: no hay base de datos en esta task; el cambio es sólo de repo.
- Integration checks: `pnpm pricing:v3 current show` (lee el puntero y lo comprueba contra sus fuentes) sobre el
  puntero real del repo, antes y después, con salida idéntica.
- Reliability signals/logs: ninguno.
- Production verification sequence: no hay despliegue; ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Esta task no crea tablas; no hay allowlist de destinos de escritura que actualizar.
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

### Slice 1 — Línea base dorada de la CLI (antes de tocar código)

- Con la CLI **sin modificar**, capturar para una matriz de comandos representativa: argumentos, salida estándar,
  salida de error, código de salida y, cuando el comando escribe, nombre, bytes y modo de cada archivo escrito.
- La matriz cubre al menos un caso por familia de comando (`calculate`, `validate`, `replay`, `explain`, `compare`,
  `export`, `prepare`, `quote`, `catalog validate | search | show | preview | apply`,
  `resources preview | apply | inspect | portfolio | budget`, `compose workload | scaffold | plan | quote | assess |
  preview | split | schedule | cash | document | increment | commitments`, `current show | set`) y por código
  de salida (`0`, `1`, `2`, `3`), más los rechazos de disco (`INPUT_NOT_FOUND`, `INPUT_NOT_JSON`, `OUTPUT_EXISTS`,
  `OUTPUT_NOT_WRITABLE`) y el uso de `--current`.
- Los casos que escriben lo hacen en un directorio temporal del test; `current set` corre contra una copia del puntero,
  nunca contra `data/pricing/v3-operating/current.json`.
- Guardar la captura como fixtures y el test `pricing-v3-cli-golden.test.ts` que la reproduce. Normalizar sólo lo que
  la CLI ya declara variable (`createdAt`, identificadores derivados del reloj), y documentar cada normalización.
- Este slice se entrega en su propio commit, con la suite en verde, antes de empezar el siguiente.

### Slice 2 — Contrato del puerto y adaptador en memoria

- `storage/port.ts`: interfaz `PricingV3Storage` con las operaciones de `## Detailed Spec`. Sólo tipos y validaciones
  puras.
- `storage/memory.ts`: adaptador en memoria que cumple el contrato completo (exclusividad de escritura, confirmación
  del puntero, comprobación de huella al leer).
- `storage/sources.ts`: la resolución hoy escrita en la CLI («si se pidió lo vigente y no se nombró la fuente, leer
  el puntero, comprobarlo y entregar el documento que nombra») expresada sobre el puerto. Reutiliza
  `resolveCurrentSource` y `verifyCurrentVersions`; no duplica su lógica.
- Test de pureza: ningún archivo no-test bajo `src/lib/finance/pricing-v3/**` importa algo distinto de módulos
  relativos, `decimal.js`, `zod` y `node:crypto`.

### Slice 3 — Adaptador de archivos y CLI sobre el puerto

- `scripts/commercial/pricing-v3-storage-file.ts`: implementa el puerto con las mismas primitivas de hoy (`wx` y `0600`
  para documentos y artefactos; temporal hermano, renombrado y `0644` para el puntero; lectura tolerante para las
  fuentes que nombra el puntero).
- La CLI deja de llamar a `readFileSync`, `writeFileSync` y `renameSync` para esas tres familias y usa el adaptador.
  La lectura de las entradas que da quien llama (`--input`, demandas, briefs, cambios, textos del documento) sigue
  siendo carga de argumentos: no es almacenamiento y no pasa por el puerto.
- Los fixtures dorados del Slice 1 pasan sin regenerarse.

### Slice 4 — Arnés de conformidad

- `pricing-v3-storage-conformance.test.ts`: una misma batería parametrizada por adaptador (archivos sobre el repo,
  archivos sobre un directorio temporal sembrado, memoria sembrada desde el repo). Casos mínimos en
  `## Detailed Spec`.
- El arnés exporta la batería como función (`runStorageConformance(makeAdapter)`), para que `TASK-2025` la ejecute
  contra el adaptador PostgreSQL sin copiarla.

### Slice 5 — Documentación

- `docs/architecture/GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md`: contrato, invariantes, qué es texto canónico y qué
  huella lo identifica, y dónde vivirá el código de servidor.
- Delta en la documentación funcional (qué cambió por dentro y qué no cambió por fuera) y en el manual de la CLI
  (ningún cambio de uso; nota de la prueba de paridad).
- La skill `efeonce-pricing-operator` sólo se toca si su texto describe la carga de archivos de un modo que dejó de
  ser cierto; en ese caso, espejos regenerados con `pnpm skills:mirrors`.

## Out of Scope

- Cualquier tabla, migración, adaptador PostgreSQL o conexión a base de datos (`TASK-2025`).
- Rutas de API, capacidades, flags o herramientas MCP.
- Modo plataforma de la CLI, comando de paridad entre transportes, diagnóstico de conexión (`TASK-2028`).
- Cambiar `calculate.ts`, `schemas.ts`, el registro de motores, el registro de errores o cualquier cifra.
- Mover `src/lib/finance/pricing-v3/**` de carpeta.
- Reformatear, renombrar o regenerar archivos de `data/pricing/**`.
- Crear `src/lib/commercial/quoter/` o cualquier archivo dentro.

## Detailed Spec

### Qué cubre el puerto y qué no

| Familia | Hoy en la CLI | En el puerto |
| --- | --- | --- |
| Documentos de catálogo, política y créditos | Se leen por ruta (flag explícito) o por el puntero; `apply` escribe un sucesor con `writeNew` | Leer por `{ role, version, digest }`; escribir un documento nuevo sin sobrescribir |
| Puntero de versiones vigentes | `readJson('current', …)`, `replacePointer` con `--confirm <pointerDigest>` | Leer el puntero; reemplazarlo confirmando la huella del anterior |
| Artefactos congelados | `writeNew(--out, json(artifact))`; lectura por `--input` para `replay`, `explain`, `compare`, lecturas de `compose` | Guardar un artefacto sin sobrescribir; leerlo por su referencia; listar el corpus |
| Entradas de quien llama (demandas, briefs, cambios, textos) | `readJson(option, path)` | Fuera del puerto: son argumentos, no almacén |

### Forma propuesta del contrato

Nombres propuestos; Discovery puede ajustar firmas, no las invariantes.

```ts
type SourceRole = 'catalog' | 'policy' | 'credits' // = CURRENT_SOURCE_ROLES

type StoredText = { text: string; value: unknown } // text = lo guardado, sin reserializar

interface PricingV3Storage {
  // Documentos por huella
  readDocument(ref: { role: SourceRole; version: string; digest: string; locator?: string }): StoredText
  writeDocument(input: { role: SourceRole; text: string; locator?: string }): { version: string; digest: string }

  // Puntero
  readPointer(): StoredText
  replacePointer(input: { text: string; confirmDigest: string }): void

  // Artefactos congelados
  writeArtifact(input: { text: string; locator?: string }): { replayDigest: string; calculationId: string }
  readArtifact(ref: { locator?: string; replayDigest?: string }): StoredText
  listArtifacts(): Array<{ locator: string; artifactVersion: string }>
}
```

- `locator` es la dirección propia de cada adaptador: una ruta para el de archivos (la que hoy da el flag o el campo
  `path` del puntero), ausente para el de memoria, un identificador para el de PostgreSQL. El contrato nunca la
  interpreta.
- Las operaciones pueden ser síncronas en el adaptador de archivos y asíncronas en el de servidor; decidir en
  Discovery una sola forma (se recomienda asíncrona con un envoltorio que no altere el orden de salida de la CLI) y
  demostrarla con los fixtures dorados.
- Huella de un documento = `catalogDigest(documento)` = sha256 de `stableJson(documento)`. Es la que ya lleva el
  puntero.
- Huella de un artefacto = su `replayDigest` (cubre el bloque semántico). El texto guardado se conserva entero porque
  `execution.createdAt` y `calculationId` no entran en esa huella.
- **Texto canónico** de un valor = `stableJson(valor)`. El adaptador de archivos guarda el texto con sangría que la CLI
  ya escribe; el puerto expone el canónico como derivado. La batería comprueba que ambos textos representan el mismo
  valor y dan la misma huella.

### Batería de conformidad (mínimos)

1. Para cada `*.artifact.json` del repo hallado por recorrido de `data/pricing/**` y `docs/commercial/**` (hoy 48):
   `readArtifact` devuelve exactamente los bytes del archivo, y la reproducción de su carril
   (`replayPricingV3`, `replayCatalogQuote` o `replayResourceComposition`) verifica con la huella guardada.
2. Ida y vuelta: `writeArtifact` de ese texto en un adaptador vacío y `readArtifact` devuelven los mismos bytes.
3. Texto canónico: `stableJson(JSON.parse(stableJson(v)))` es igual a `stableJson(v)` para cada artefacto y documento,
   y la reproducción sobre el valor leído desde el texto canónico verifica con la misma huella.
4. Cada documento que nombra el puntero vigente, y cada versión anterior del catálogo y de la política bajo
   `data/pricing/v3-operating/`, se lee por `{ role, version, digest }` y su huella recalculada coincide.
5. `readDocument` con una huella que no corresponde al contenido rechaza; no entrega el documento.
6. `writeDocument` y `writeArtifact` sobre una identidad existente con otro contenido rechazan con `OUTPUT_EXISTS`;
   el contenido original queda intacto.
7. `replacePointer` con una huella de confirmación que no es la del puntero vigente rechaza con
   `CURRENT_VERSIONS_CONFLICT` y no cambia nada; con la correcta, la lectura siguiente devuelve el nuevo.
8. Camino completo sin disco: sobre el adaptador en memoria sembrado, resolver lo vigente, calcular cada ejemplo del
   repo que tenga artefacto esperado y comparar la huella con la del artefacto versionado.
9. El recorrido nunca se reduce en silencio: la batería falla si encuentra menos artefactos que los contados al
   escribirla o si algún carril queda sin artefacto.

### Dónde vivirá el código con estado (no se crea aquí)

El agregado de servidor —almacén PostgreSQL, comandos, lectores, autorización, eventos— vivirá bajo
`src/lib/commercial/quoter/`, y el adaptador PostgreSQL del puerto en `src/lib/commercial/quoter/storage-postgres.ts`.
Lo crea `TASK-2025`. El motor se queda en `src/lib/finance/pricing-v3/`.

## Rollout Plan & Risk Matrix

Cambio de repo, sin despliegue ni estado: additive en archivos nuevos y un refactor de la CLI cubierto por línea base.

### Slice ordering hard rule

- Slice 1 se entrega y se commitea **antes** de editar la CLI. Sin línea base no hay forma de demostrar «sin cambio».
- Slice 2 → Slice 3 → Slice 4. Slice 4 puede empezar sobre el adaptador en memoria al cerrar Slice 2.
- Slice 5 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| La CLI cambia una salida, un código de salida o un error sin que nadie lo note | CLI de cotización | medium | Fixtures dorados capturados antes del refactor; suite existente que ejecuta la CLI como proceso | `pricing-v3-cli-golden.test.ts` rojo |
| Un archivo escrito cambia de modo o deja de ser exclusivo | CLI / archivos con costos | low | La línea base registra modo y comportamiento ante archivo existente | Caso `OUTPUT_EXISTS` o de modo rojo |
| El puntero queda a medio escribir | catálogo vigente | low | Mismo mecanismo de temporal y renombrado; el test corre sobre copia | Caso 7 de la batería |
| El puerto reserializa y altera un artefacto | artefactos congelados | low | El puerto entrega texto guardado; casos 1 y 2 comparan bytes | Batería roja; guarda de artefactos congelados roja |
| El motor gana un import de disco por comodidad | motor | medium | Test de pureza de imports; adaptador de archivos fuera de `src/` | `pricing-v3-purity.test.ts` rojo; `pnpm vercel:reachability-gate` rojo en tasks posteriores |
| El contrato queda moldeado por archivos y no sirve a PostgreSQL | programa | medium | Adaptador en memoria como segundo cliente del contrato; `locator` opaco; revisión con `TASK-2025` antes de cerrar | Revisión de la task de base de datos pide cambiar el contrato |
| Otra sesión edita la CLI en paralelo | checkout compartido | medium | Commits pequeños por slice; `git status --short` antes de cada commit | Conflicto en `scripts/commercial/pricing-v3.ts` |

### Feature flags / cutover

Sin flag — additive y sin runtime desplegado: ningún servicio importa este código. El cutover es el merge.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | Revert; sólo agrega tests y fixtures | menos de 5 min | si |
| Slice 2 | Revert; archivos nuevos sin llamadores | menos de 5 min | si |
| Slice 3 | Revert del commit de la CLI; el adaptador queda sin uso | menos de 5 min | si |
| Slice 4 | Revert; sólo tests | menos de 5 min | si |
| Slice 5 | Revert documental | menos de 5 min | si |

### Production verification sequence

No hay despliegue. Verificación local en este orden: fixtures dorados verdes → batería de conformidad verde →
`pnpm pricing:v3:test` verde → `pnpm pricing:v3 current show` contra el puntero real con la misma salida que antes
→ un ciclo real de cotización de ejemplo (`compose quote` → `compose assess` → `compose document`) en un directorio
temporal, con artefacto y documento idénticos a los del repo para ese ejemplo.

### Out-of-band coordination required

Repo-only change. Avisar en `Handoff.md` que la CLI cambió por dentro y cómo se comprueba que no cambió por fuera.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `git diff` de la task no toca `src/lib/finance/pricing-v3/calculate.ts`, `schemas.ts` ni `errors.ts`, ni ningún
      archivo bajo `data/pricing/**` o `docs/commercial/**/pricing/`.
      Evidencia: `git diff --stat 6b80ac782..HEAD` sobre esas rutas, vacío.
- [x] Los fixtures dorados de la CLI se capturaron y commitearon antes del primer cambio a
      `scripts/commercial/pricing-v3.ts`, y pasan después del refactor sin haberse regenerado.
      Evidencia: línea base en `8f87ae6b2`, primer cambio a la CLI en `8e5c2d66b`; 122 de 122 tests del dorado en verde sin regenerar; `git status` de `fixtures/cli-golden` limpio.
- [x] La matriz dorada cubre cada familia de comando listada en el Slice 1, los cuatro códigos de salida y los cuatro
      rechazos de disco.
      Evidencia: test «the matrix covers every command family, every exit code and every disk rejection» (107 casos).
- [x] `scripts/commercial/pricing-v3.ts` ya no llama a `readFileSync`, `writeFileSync` ni `renameSync` para documentos
      de catálogo, política y créditos, puntero y artefactos.
      Evidencia: `grep node:fs scripts/commercial/pricing-v3.ts` sólo encuentra un comentario; todo el acceso a disco está en `pricing-v3-storage-file.ts`.
- [x] Ningún archivo no-test bajo `src/lib/finance/pricing-v3/**` importa algo distinto de módulos relativos,
      `decimal.js`, `zod` y `node:crypto`, y un test lo hace cumplir.
      Evidencia: `pricing-v3-purity.test.ts`, 4 tests.
- [x] Ningún archivo bajo `src/` importa `scripts/commercial/pricing-v3-storage-file.ts`.
      Evidencia: mismo test, por `git grep`. Se lee como «ningún módulo que no sea un test»: la batería de conformidad vive en `__tests__` y debe correr contra el adaptador (acordado con la sesión consultora).
- [x] La batería de conformidad corre contra los tres adaptadores (archivos sobre el repo, archivos sobre temporal,
      memoria) y pasa los nueve casos; el caso 1 cubre todos los `*.artifact.json` de `data/pricing/**` y
      `docs/commercial/**`.
      Evidencia: `pricing-v3-storage-conformance.test.ts`, 33 tests (11 por adaptador); el caso 1 recorre los 48 artefactos.
- [x] El caso 8 calcula ejemplos del repo sobre el adaptador en memoria, sin `node:fs` en el camino bajo prueba, y
      obtiene la huella del artefacto versionado.
      Evidencia: caso 8 sobre memoria; todos los pares demanda/artefacto reproducen el archivo commiteado byte a byte (`DEMANDS_THAT_NO_LONGER_GIVE_THEIR_ARTIFACT` vacío).
- [x] `runStorageConformance` está exportada y documentada como requisito de todo adaptador nuevo.
      Evidencia: exportada desde `__tests__/storage-conformance.ts` (módulo auxiliar, no `.test.ts`, para poder importarla sin arrastrar tests) y documentada en `GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md`.
- [x] `pnpm pricing:v3:test` verde, incluida `pricing-v3-frozen-artifacts.test.ts`.
      Evidencia: 36 archivos, 1.799 tests en verde (2026-10-12).
- [x] No existe `src/lib/commercial/quoter/` como resultado de esta task.
      Evidencia: `ls src/lib/commercial/quoter` no existe.
- [x] Documento de arquitectura del puerto, delta funcional y delta del manual publicados.
      Evidencia: `GREENHOUSE_PRICING_V3_STORAGE_PORT_V1.md`, delta en `cotizador-v3-superficie-implementada.md` y en `cotizar-v3-por-cli.md`.

## Verification

- `pnpm pricing:v3:test`
- `pnpm vitest run src/lib/finance/pricing-v3/__tests__/pricing-v3-storage-conformance.test.ts`
- `pnpm vitest run src/lib/finance/pricing-v3/__tests__/pricing-v3-cli-golden.test.ts`
- `pnpm vitest run scripts/documents` si el test del render A4 está en el alcance de Vitest; si corre con otro
  ejecutor, usar el que declare `package.json`.
- `pnpm local:check`
- `pnpm pricing:v3 current show` (comparar con la salida previa al cambio)
- `pnpm test` (suite completa) al cierre; `pnpm build` sólo con autorización del operador.
- `pnpm docs:closure-check`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] `EPIC-053` refleja la puerta de salida de la fase 1 con su evidencia
- [x] `TASK-2025` recibió en un `## Delta` la forma final del contrato si difiere de la propuesta aquí

Gate de cierre, corrido el 2026-10-12 con autorización del operador sobre el último commit de código:

- `pnpm pricing:v3:test`: 36 archivos y 1.799 tests en verde; después se sumó un test al dorado (123 de 123 en ese
  archivo).
- `pnpm test` completo: 20.172 tests pasan y 3 fallan. Los tres comparan archivos del repo contra el paquete AXIS
  instalado (`manzanitas-tokens-sync`, `efeonce-insights/contracts/channels`, `report-pdf-assets`) y no leen ningún
  archivo de esta task. Que el desfase sea anterior a esta task es una inferencia (el paquete se instaló el
  2026-10-06 y la task empezó el 2026-10-12), no una corrida sobre un commit anterior. Queda reportado aparte.
- `pnpm build`: exit 0.
- `pnpm lint` 0 errores y `pnpm typecheck` limpio, corridos sueltos: `pnpm local:check` se detenía en
  `skills:mirrors` por el espejo de otra skill en edición por otra sesión.
- Falsificación de las tres pruebas nuevas: con el modo de archivo cambiado a `0644` el dorado da 25 rojos; con el
  adaptador en memoria permitiendo sobrescribir, el caso 6 de la batería da rojo; con un `import 'node:fs'` en
  `storage/sources.ts`, la guarda de pureza da rojo. Código restaurado después de cada una.
- No se invocó la skill `greenhouse-finance-accounting-operator` que la regla por ruta de `src/lib/finance/` pide: el
  cambio es de almacenamiento y no toca cálculo, costo ni regla contable. Queda declarado, no resuelto por omisión.

## Follow-ups

- Adaptador PostgreSQL del puerto e importador repo → base: `TASK-2025`.
- Extender la guarda de artefactos congelados a las versiones guardadas en la base: `TASK-2027` y siguientes.
- Comando de paridad entre transportes: `TASK-2028`.

## Open Questions

Resueltas en Discovery (2026-10-12), con la sesión consultora:

- **Síncrono o asíncrono:** asíncrono, una sola forma. El adaptador PostgreSQL y el transporte HTTP lo son de todos
  modos, y la resolución de fuentes debe servir igual a la CLI y al servidor. La CLI pasó de un `try` de nivel
  superior a una función asíncrona con las cargas en el mismo orden; los fixtures dorados fueron el juez.
- **Dónde vive la matriz dorada:** dentro de `pnpm pricing:v3:test`. Cada comando tarda entre 0,1 y 0,2 s; el archivo
  completo, unos 19 s.

Ajustes de firma respecto de la propuesta (las invariantes no cambiaron): `findDocument` como lectura tolerante;
`readPointer` devuelve `null` si no hay puntero y acepta dirección; `confirmDigest` admite `null`; una identidad
pedida que no coincide es `INPUT_NOT_FOUND`; una segunda escritura rechaza siempre, también con el mismo contenido.

No cubierto por la línea base: `CURRENT_VERSIONS_MISMATCH` de `--current`, porque el puntero que sigue `--current` es
siempre el del repositorio y provocarlo exigiría alterarlo. Lo cubre el caso 7b de la batería sobre el puerto.
