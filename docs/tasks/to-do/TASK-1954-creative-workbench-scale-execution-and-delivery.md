# TASK-1954 — Creative Workbench: ejecución a escala y entrega por canal

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
- Epic: `EPIC-050`
- Status real: `Diseño`
- Rank: `3` dentro de EPIC-050
- Domain: `platform|tooling`
- Blocked by: `TASK-1953` (plan y expansión), `TASK-1955` (gate de regresión y clases de revisión)
- Branch: `Workbench: rama propia desde main (task/TASK-1954-scale-execution); Greenhouse develop sólo para docs; sin worktrees nuevos`

## Summary

Lleva la ejecución y la entrega al tamaño de la demanda real de los clientes de Efeonce: campañas de miles
de piezas sin el tope de 126 jobs, ejecución en paralelo con recuperación, reutilización de composiciones
idénticas y una salida empaquetada por canal, archivada en el espacio privado de cada cliente con rutas y
SHA, sin copiar recursos licenciados, y con el tiempo de entrega medido de punta a punta. Es neutral; SKY es
el primer cliente que la ejerce.

## Why This Task Exists

`marca:lote` acepta como máximo 126 jobs por lote y compone en secuencia (≈6 s por pieza): un despliegue de
miles de piezas tarda horas y obliga a partir la campaña a mano. Tampoco reutiliza nada: la v7 recompuso
5 piezas byte-idénticas a la v6. Al final, la entrega y el archivo se hicieron con scripts ad hoc
(2026-10-01): zips por corrida, subida a `gs://efeonce-creative-work`, verificación CRC32C y registro en
`pieza.json`. El precedente del bucket incluso subía las fuentes Metric dentro de cada corrida, cuya
distribución remota está pendiente de derechos (TASK-1946).

## Goal

- Una campaña completa de cualquier cliente se prepara y ejecuta como una unidad, sin tope de 126 y con
  recuperación por UUID.
- La ejecución corre en paralelo de forma determinista y reutiliza composiciones idénticas.
- La salida sale empaquetada por canal con nomenclatura de tráfico y specs de plataforma.
- El archivo queda gobernado en el prefijo privado de cada cliente, sin recursos licenciados.
- El tiempo desde brief hasta paquete entregado queda medido por campaña y por cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md` (§2.4 buckets e IAM)
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- Workbench: `docs/architecture/workbench-design-batches.md`, `docs/architecture/workbench-cloud-boundary.md`,
  `docs/architecture/workbench-native-harness.md`

Reglas obligatorias:

- Las corridas son inmutables y se recuperan por UUID; nunca se reintenta una corrida incierta con otro UUID.
- La caché sólo reutiliza una corrida cuya entrada completa (receta, versión del motor, pack, copy, foto)
  tenga el mismo hash; un cambio del motor invalida la caché.
- El bucket de trabajo es privado, con rutas `<cliente>/<slug>/<sha>/<archivo>`; el equipo no puede borrar
  ni sobrescribir.
- Núcleo neutral: lotes, caché, paquetes y archivo no nombran ninguna marca; la lista de recursos licenciados
  a excluir la declara el pack de cada cliente.
- Ningún archivo que salga del equipo contiene recursos licenciados sin admisión (p. ej. `sky-metric-*` de SKY).
- Esta task no publica en plataformas de medios ni gasta en proveedores.

## Normative Docs

- Workbench `docs/manual/design-batches.md`, `tools/pieza-subir.mjs`, `tools/pieza-bajar.mjs`.
- Workbench `projects/sky/prueba-modular-24-adaptaciones/archivo.md` (precedente del archivo gobernado, 2026-10-01).
- Greenhouse `docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md`.

## Dependencies & Impact

### Depends on

- `TASK-1953`: plan de campaña y expansión (fuente de los jobs).
- `TASK-1955`: gate de regresión (invalida caché y bases) y clases de revisión (qué se entrega aprobado).
- `TASK-1946`: posición sobre distribución de Metric (esta task la respeta, no la decide).

### Blocks / Impacts

- Follow-up de revisión en el Lab: consume el receipt de campaña y las clases.
- Operación diaria de producción SKY y de cualquier marca futura (TASK-1945).

### Files owned

- Workbench `tools/design-batch.mjs`, `tools/design-batch-runtime.mjs`, `tools/marca-lote.mjs` (campaña sin tope, paralelo, caché).
- Workbench `tools/campaign-delivery.mjs` y `tools/channel-specs/*.json` (nuevos).
- Workbench `tools/pieza-subir.mjs` (archivo de corridas y paquetes sin binarios licenciados).
- Workbench `docs/architecture/workbench-design-batches.md`, `docs/manual/design-batches.md`, `docs/manual/campaign-delivery.md` (nuevo).
- Greenhouse skill espejo `efeonce-creative-workbench`.

## Current Repo State

### Already exists

- `workbench.design-batch.v1` con preparación, ejecución recuperable por UUID y receipts (`tools/design-batch*.mjs`).
- Corridas con `outcome.json`, locks y hashes de outputs; snapshot de lote en `projects/<cliente>/<pieza>/batches/<UUID>/`.
- `pnpm pieza:subir` sube `salidas/` al bucket de trabajo con ruta con huella y registra en `pieza.json`.
- Bucket `gs://efeonce-creative-work` (privado, versionado, soft delete) con prefijos `sky/` y `sky-airline/`.
- Archivo manual de la prueba de 24 (130 entregables, verificados por CRC32C) como precedente.

### Gap

- Tope de 126 jobs por lote y una sola pieza/proyecto por lote.
- Ejecución secuencial; sin pool de workers ni límites de memoria/CPU declarados.
- Sin caché por hash de entrada.
- Sin empaquetado por canal ni nomenclatura de tráfico.
- `pieza:subir` sube `salidas/` tal cual; no conoce corridas ni excluye recursos licenciados.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `creative-workbench/tools/`
- Future candidate home: `worker`
- Boundary: `marca:lote (campaña) ejecuta jobs ya expandidos; campaign-delivery empaqueta y archiva outputs; ninguno decide contenido`
- Server/browser split: `Node local; un Cloud Run Job queda como opción futura, no en esta task`
- Build impact: `paralelismo local con worker_threads o procesos; sin dependencia nueva de red salvo gcloud para el archivo`
- Extraction blocker: `recursos licenciados sólo en máquinas admitidas: un worker remoto requiere resolver TASK-1946 primero`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `lotes/receipts de campaña, caché de corridas, pieza.json (entregables) y bucket gs://efeonce-creative-work`
- Consumidores afectados: `operadores y agentes de producción; Lab (receipts); trafficker/medios (paquetes)`
- Runtime target: `local + GCS`

### Contract surface

- Contrato existente a respetar: `workbench.design-batch.v1`, `workbench.production-outcome.v1`, `pieza.json` (`entregables`), IAM por prefijo de cliente.
- Contrato nuevo o modificado: `workbench.campaign-batch.v1` (lote de campaña con shards), `workbench.run-cache.v1`, `workbench.channel-spec.v1`, `workbench.delivery-package.v1`.
- Backward compatibility: `compatible` — un lote de ≤126 jobs sigue funcionando igual.
- Full API parity: comandos CLI (`marca:lote`, `marca:entregar`) usables por personas y agentes.

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; archivos de proyecto y objetos GCS`
- Invariantes que no se pueden romper:
  - Una corrida reutilizada por caché tiene el mismo hash de entrada completa; sin coincidencia exacta, se compone.
  - El orden de ejecución en paralelo no cambia ningún byte de salida.
  - Una corrida incierta se recupera por su UUID; nunca se duplica.
  - Ningún paquete ni `run.zip` subido contiene recursos licenciados ni otras entradas del pack del cliente; se referencian por SHA.
  - Cada objeto subido se verifica (CRC32C y tamaño) antes de registrarse; nada se borra localmente sin esa verificación.
- Write-target allowlist: `N/A — sin DB; destino GCS limitado al prefijo del cliente`
- Tenant/space boundary: `una marca por campaña; prefijo de bucket por cliente`
- Idempotency/concurrency: `UUID de lote y de corrida; --no-clobber en el bucket; caché por hash`
- Audit/outbox/history: `receipts de lote, pieza.json versionado en Git, bucket con versionado y soft delete`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `paralelismo con concurrencia configurable (default conservador); caché activa sólo con motor sellado`
- Backfill plan: `archivar con la nueva herramienta un lote existente y comparar con el archivo manual 2026-10-01`
- Rollback path: `revert PR; los lotes de ≤126 y pieza:subir actuales siguen válidos`
- External coordination: `permisos de escritura por prefijo de cliente (objectCreator) para cada integrante`

### Security and access

- Auth/access gate: `identidad GitHub viva (entrada gobernada) + IAM GCS por prefijo de cliente`
- Sensitive data posture: `tarifas no publicadas en paquetes privados; binarios licenciados excluidos`
- Error contract: `errores por pieza y por objeto, con causa; nunca marcar entregado sin verificación`
- Abuse/rate-limit posture: `concurrencia acotada por máquina; reintentos de subida idempotentes`

### Runtime evidence

- Local checks: tests de shards, paralelismo determinista, caché y exclusión de recursos licenciados; `pnpm harness:test`, `pnpm gates`.
- DB/runtime checks: `N/A — sin DB`
- Integration checks: `subida real de un paquete de campaña al bucket con verificación CRC32C y descarga de vuelta`
- Reliability signals/logs: `receipt de campaña con conteos por estado y tiempo por pieza`
- Production verification sequence: `campaña de prueba de TASK-1953 ejecutada completa, empaquetada y archivada`

## Capability Definition of Done — Full API Parity gate

`N/A — no capability de negocio de Greenhouse`: comandos internos del Workbench.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Lote de campaña sin tope

- `workbench.campaign-batch.v1`: una campaña = un UUID con shards internos de ≤126 jobs, preparación
  completa antes de ejecutar y receipt único con conteos por estado.
- Recuperación por UUID de campaña: sólo ejecuta lo pendiente; incierto → recuperar por UUID de corrida.

### Slice 2 — Ejecución paralela determinista

- Pool de workers local con concurrencia configurable y límites de memoria; resultados byte-idénticos a la ejecución secuencial (probado sobre la suite de TASK-1955).
- Métrica de throughput por pieza y por campaña en el receipt.
- Tiempo de entrega por campaña (brief aprobado → plan → ejecución → paquete entregado) registrado en el
  receipt, por cliente, para medir el delivery hacia el cliente.

### Slice 3 — Caché por contenido

- `workbench.run-cache.v1`: hash de entrada completa (receta, versión de motor, pack SHA, job normalizado,
  foto) → corrida existente. Reutiliza referenciando la corrida previa; nunca copia ni reescribe outputs.
- Invalidación automática cuando cambia la versión del motor o el pack.

### Slice 4 — Paquetes por canal

- `tools/channel-specs/*.json` con specs por canal (Meta, Google Ads/display, DV360, OOH): formatos de
  archivo, peso máximo, dimensiones admitidas, perfil de color y nomenclatura.
- `marca:entregar`: arma el paquete por canal desde las piezas aprobadas (por clase, TASK-1955), con
  nombres `<campaña>_<mercado>_<oferta>_<formato>_<versión>` y un manifiesto con SHA por archivo.
- Rechaza piezas que no cumplen la spec (peso, dimensiones) en vez de recomprimir en silencio.

### Slice 5 — Archivo gobernado

- Extender `pieza:subir` (o comando hermano) para archivar corridas, paquetes y evidencia: excluye
  entradas del pack (incluido `sky-metric-*`), sube con `--no-clobber` a rutas con huella, verifica CRC32C
  y tamaño, registra en `pieza.json` y sólo entonces permite liberar disco local.
- Documentar la rehidratación (bajar, descomprimir, completar entradas desde el pack sellado).

## Out of Scope

- Cloud Run Job o cola distribuida remota (requiere resolver licencias en TASK-1946; follow-up).
- Publicación o pauta en plataformas de medios.
- Revisión humana en el Lab (follow-up de EPIC-050); esta task entrega receipts y paquetes.
- Contenido del plan (`TASK-1953`) y reglas del motor (`TASK-1955`).

## Detailed Spec

- El hash de caché se calcula sobre el job normalizado (claves ordenadas), el SHA del pack, la versión de
  cada receta aplicada y el SHA de la foto; no incluye el `producer` ni timestamps.
- El receipt de campaña lista cada pieza con: id `oferta×mercado×formato`, UUID de corrida, si vino de
  caché, estado, clase de revisión y ruta de archivo.
- La exclusión de recursos licenciados se define por lista explícita de IDs del pack, no por extensión.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 (la caché necesita UUIDs de campaña estables y ejecución determinista probada).
- Slice 4 requiere las clases de revisión de TASK-1955. Slice 5 puede empezar después de Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Paralelismo cambia bytes de salida | motor | medium | test de equivalencia secuencial/paralelo sobre la suite | diff en la suite |
| Caché entrega una pieza obsoleta tras un cambio del motor | motor/entrega | medium | versión de motor y pack en el hash; invalidación automática | pieza de caché con versión distinta en el receipt |
| Binarios Metric suben al bucket | licencias | medium | lista explícita de exclusión + test negativo | inventario del paquete |
| Borrado local antes de verificar la subida | datos | low | verificación CRC32C obligatoria antes de liberar | objeto sin verificación en `pieza.json` |
| Memoria agotada con alta concurrencia | máquina del operador | medium | concurrencia default conservadora y límite declarado | proceso terminado por OOM |

### Feature flags / cutover

- Sin flag de runtime. Concurrencia por opción de CLI (`--concurrency`, default conservador); caché
  desactivable con `--no-cache`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; lotes ≤126 siguen funcionando | minutos | sí |
| Slice 2 | `--concurrency 1` o revert | inmediato | sí |
| Slice 3 | `--no-cache` o revert | inmediato | sí |
| Slice 4 | revert PR | minutos | sí |
| Slice 5 | revert PR; objetos subidos quedan (bucket sin borrado) | minutos | parcial |

### Production verification sequence

1. Suite de TASK-1955 ejecutada secuencial y en paralelo: bytes idénticos.
2. Campaña de prueba de TASK-1953 completa: receipt, caché en segunda ejecución y tiempos medidos.
3. Paquete por canal generado y validado contra specs; archivo subido, verificado y descargado de vuelta.

### Out-of-band coordination required

- Specs vigentes de cada canal con el equipo de medios/trafficker.
- Permisos de escritura por prefijo de cliente para cada integrante del equipo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una campaña de más de 126 jobs se prepara y ejecuta con un único UUID y receipt, recuperable tras una interrupción.
- [ ] La ejecución paralela produce outputs byte-idénticos a la secuencial en toda la suite de TASK-1955.
- [ ] Una segunda ejecución sin cambios reutiliza todas las corridas por caché, y un cambio de versión del motor la invalida.
- [ ] Cada paquete por canal cumple su spec o la pieza queda rechazada con causa; los nombres siguen la nomenclatura declarada.
- [ ] Ningún `run.zip` ni paquete subido contiene los recursos licenciados declarados por el pack del cliente (test negativo con SKY y con un cliente sintético).
- [ ] Lotes, caché, paquetes y archivo no nombran ninguna marca en `tools/` (test automatizado).
- [ ] Cada objeto subido queda verificado por CRC32C y tamaño y registrado en `pieza.json` antes de liberar disco.
- [ ] El receipt registra throughput y tiempo de entrega de punta a punta de la campaña de prueba, por cliente.

## Verification

- `pnpm harness:test`, `pnpm sky:test`, `pnpm gates` en el Workbench.
- Ejecución real de la campaña de prueba, paquete y archivo con readback desde el bucket.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Manuales de lotes y de entrega, y skill espejo, actualizados.

## Follow-ups

- Worker remoto (Cloud Run Job) cuando TASK-1946 resuelva la distribución de recursos licenciados.
- Revisión por clases en el Lab consumiendo el receipt de campaña.
- Entrega en el portal cliente (Creative Hub, TASK-1857) consumiendo los paquetes por canal.

## Open Questions

- ¿Qué canales y specs piden los clientes en un despliegue típico (en SKY: Meta, Google, DV360, OOH, otros)?
- ¿La nomenclatura de tráfico la define la agencia de medios de cada cliente o es un estándar de Efeonce?

## Delta 2026-10-02

- Reencuadre multicliente por decisión del operador: núcleo neutral, recursos licenciados declarados por el
  pack de cada cliente, archivo por prefijo de cliente y medición del tiempo de entrega por cliente.
