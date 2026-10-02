# TASK-1953 — Creative Workbench: plan de campaña que se expande a escala

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
- Backend impact: `command`
- Epic: `EPIC-050`
- Status real: `Diseño`
- Rank: `2` dentro de EPIC-050
- Domain: `platform|tooling`
- Blocked by: `TASK-1955` (Slice 1–3: admisiones derivadas y zonas semánticas completas)
- Branch: `Workbench: rama propia desde main (task/TASK-1953-campaign-plan); Greenhouse develop sólo para docs; sin worktrees nuevos`

## Summary

Reemplaza la autoría de jobs campo por campo por un **plan de campaña**: un archivo con ofertas, mercados
y formatos que el Workbench expande en todos los `workbench.design-job.v1` necesarios, usando las zonas
semánticas del catálogo. Cada mercado aporta su moneda, su legal y su idioma; las tarifas se importan de
una planilla. Antes de componer, un preflight dice qué copy no cabe en qué formato y qué variante usar.

## Why This Task Exists

Hoy un job declara el copy con IDs de nodo Figma (`2026:2611/2026:2617/...`) para cada campo, y el
catálogo SKY tiene 1.196 campos en 126 formatos. Un despliegue real de SKY multiplica ofertas por mercados
(CLP, PEN, ARS, UYU, USD y BRL, con portugués en Brasil) y por formatos: son cientos o miles de jobs que
nadie puede escribir a mano sin errores. Además, un copy que no cabe se descubre recién al componer,
pieza por pieza, porque el motor (con razón) no achica texto.

## Goal

- Un plan de campaña declarativo genera todos los jobs de un despliegue sin escribir IDs de nodo.
- Los mercados SKY quedan modelados como perfiles con moneda, formato de número, legal e idioma.
- Las tarifas y condiciones se importan de una planilla validada, sin copiarlas a mano.
- Un preflight produce la matriz copy × formato con ajustes, rechazos y la variante corta elegida, antes
  de gastar una sola composición.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- Workbench: `docs/architecture/workbench-design-batches.md`, `docs/architecture/workbench-kv-zones.md`,
  `docs/architecture/workbench-composition-recipes.md`, `docs/architecture/workbench-sky-designer-content-rules.md`

Reglas obligatorias:

- El plan lleva contenido, nunca geometría, fuentes, colores ni rutas de salida.
- Los datos comerciales (precios, fechas, condiciones, legales) vienen siempre de una fuente declarada
  (planilla o brief); nunca se infieren ni se completan con valores por defecto.
- El preflight no achica texto: elige entre variantes **declaradas** o rechaza.
- Una marca por plan; un mercado nunca hereda el legal de otro.

## Normative Docs

- Workbench `docs/manual/design-batches.md` y `docs/manual/kv-zones.md`.
- Workbench `projects/sky/prueba-modular-24-adaptaciones/` (24 jobs reales usados como caso base).
- Greenhouse `docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md`.

## Dependencies & Impact

### Depends on

- `TASK-1955` Slices 1–3: admisiones derivadas y zonas semánticas para `other-copy` (sin eso, la expansión
  no puede llenar todos los campos por zona).
- Catálogo `sky-adaptation-catalog` 2.0.0 y `marca:disenar`/`marca:lote` vigentes.

### Blocks / Impacts

- `TASK-1954` ejecuta y entrega lo que este plan genera.
- `TASK-1956` aporta las fotos que el plan referencia por destino.

### Files owned

- Workbench `tools/campaign-plan.mjs` y `tools/marca-campana.mjs` (nuevos) con sus pruebas.
- Workbench `clients/sky/markets.json` (nuevo, perfiles de mercado).
- Workbench `tools/fare-import.mjs` (nuevo) y su esquema `workbench.fare-sheet.v1`.
- Workbench `tools/fit-preflight.mjs` (nuevo).
- Workbench `docs/architecture/workbench-campaign-plan.md` y `docs/manual/campaign-plan.md` (nuevos).
- Greenhouse skill espejo `efeonce-creative-workbench` (referencia de operación).

## Current Repo State

### Already exists

- `workbench.design-job.v1` y `workbench.design-batch.v1` (`tools/design-batch.mjs`, máximo 126 jobs).
- Catálogo con zonas por campo (`zoneId` como `sky-airline.kv.fare-conditions`) y `marca:zonas`.
- Reglas de copy: estilo oración en condiciones que preserva USD, CLP, PEN, BRL, ARS, UYU, `US$`, `R$`, `S/`, `$U` (contenido 1.6.0).
- Perfiles finitos de destino y rechazo de overflow sin achicar (`destination.mjs`, `content.mjs`).
- `samples.json` y `batch.json` de la prueba de 24 como ejemplo manual de lo que el plan debe generar.

### Gap

- No existe un modelo de campaña por encima del job: oferta, mercado y matriz de formatos.
- No hay perfiles de mercado (moneda, separadores, legal, idioma) ni importación de tarifas.
- El ajuste del copy sólo se conoce al componer; no hay matriz previa ni variantes declaradas.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `creative-workbench/tools/` y `creative-workbench/clients/sky/`
- Future candidate home: `remain-shared`
- Boundary: `marca:campana genera jobs workbench.design-job.v1 y los entrega a marca:lote; no compone ni toca el motor`
- Server/browser split: `Node local; sin consumer browser`
- Build impact: `lee planillas CSV/XLSX locales y el catálogo instalado; sin dependencias de red`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `plan de campaña (nuevo), perfiles de mercado (nuevo), planilla de tarifas importada`
- Consumidores afectados: `marca:lote, TASK-1954, agentes Codex/Claude que producen campañas`
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `workbench.design-job.v1`, `workbench.design-batch.v1`, catálogo de zonas.
- Contrato nuevo o modificado: `workbench.campaign-plan.v1`, `workbench.market-profile.v1`, `workbench.fare-sheet.v1`, `workbench.fit-preflight.v1`.
- Backward compatibility: `compatible` — los jobs generados son jobs normales; `marca:disenar` no cambia.
- Full API parity: comando CLI (`marca:campana --plan|--preflight|--expand`) usable por personas y agentes.

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; archivos de proyecto`
- Invariantes que no se pueden romper:
  - Cada campo de cada job generado tiene origen trazable: oferta, mercado, campaña o variante declarada.
  - Ningún campo requerido queda vacío o con un valor por defecto: falta = error de preflight.
  - La misma entrada (plan + planilla + catálogo) genera los mismos jobs, byte a byte.
  - Un mercado sólo usa su propia moneda, formato numérico y legal.
- Write-target allowlist: `N/A — sin DB`
- Tenant/space boundary: `una marca por plan (brandId del pack); mercados sólo de esa marca`
- Idempotency/concurrency: `expansión determinista; jobs con id estable derivado de oferta×mercado×formato`
- Audit/outbox/history: `el plan, la planilla (SHA) y el preflight quedan en el proyecto y en el lote`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `comando nuevo; marca:lote con jobs manuales sigue funcionando igual`
- Backfill plan: `reproducir la prueba de 24 desde un plan y comparar sus jobs con los manuales`
- Rollback path: `revert PR; los jobs manuales siguen válidos`
- External coordination: `formato de planilla de tarifas acordado con SKY/cuentas`

### Security and access

- Auth/access gate: `entrada gobernada vigente del Workbench (identidad GitHub viva)`
- Sensitive data posture: `tarifas comerciales no publicadas: la planilla vive en el proyecto privado, no en Git si es real`
- Error contract: `errores por campo/mercado/formato con causa; nunca completar en silencio`
- Abuse/rate-limit posture: `N/A — herramienta interna`

### Runtime evidence

- Local checks: tests del plan, la planilla y el preflight; `pnpm harness:test`, `pnpm gates`.
- DB/runtime checks: `N/A — sin DB`
- Integration checks: `plan de prueba de 3 ofertas × 3 mercados × una familia completa, validado y compuesto por marca:lote`
- Reliability signals/logs: `informe de preflight y receipt del lote`
- Production verification sequence: `N/A — tooling local; verificación con el plan de prueba`

## Capability Definition of Done — Full API Parity gate

`N/A — no capability de negocio de Greenhouse`: comando interno del Workbench, operable por CLI y agentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Perfiles de mercado SKY

- `clients/sky/markets.json` con `workbench.market-profile.v1`: Chile, Perú, Argentina, Uruguay, Brasil y
  tarifas en USD; por mercado moneda, símbolo y posición, separadores de miles y decimales, idioma
  (`es-CL`, `es-PE`, `es-AR`, `es-UY`, `pt-BR`), legal base y URL de T&C por mercado.
- Los valores comerciales (legal, URL) se cargan desde una fuente declarada; sin fuente, el mercado queda
  `incompleto` y el preflight lo rechaza.

### Slice 2 — Planilla de tarifas

- `workbench.fare-sheet.v1` (CSV/XLSX): oferta, origen, destino, mercado, moneda, importe, prefijo
  (DESDE/POR TRAMO), condiciones y vigencia. Validación de tipos, monedas admitidas por mercado y
  duplicados; cada fila con SHA de la planilla de origen.

### Slice 3 — Plan de campaña y expansión

- `workbench.campaign-plan.v1`: campaña (titular, bajada, fechas, sticker), ofertas (por referencia a la
  planilla), mercados, familias/formatos y fotos por destino (IDs admitidos, `TASK-1956`).
- `marca:campana --expand`: produce los jobs llenando cada campo por su zona semántica, con id estable
  `oferta×mercado×formato`, y un lote `workbench.design-batch.v1` (o varios, ver `TASK-1954`).
- Reproducir la prueba de 24 desde un plan: los jobs generados coinciden con los manuales o se explica cada diferencia.

### Slice 4 — Preflight de ajuste y variantes

- `marca:campana --preflight`: matriz copy × formato con resultado `cabe`, `cabe con variante` o
  `rechazado`, usando el mismo shaping Metric y las mismas reglas de las admisiones (sin componer PNG).
- Variantes declaradas en el plan (`short`, `compact`) por campo; el preflight elige la primera que cabe y
  registra la elección. Sin variante que quepa: rechazo con el formato y el campo.
- Informe legible (tabla por familia) y JSON `workbench.fit-preflight.v1` consumido por la expansión.

## Out of Scope

- Ejecución paralela, lotes sin tope, caché y empaquetado (`TASK-1954`).
- Biblioteca de fotos (`TASK-1956`); el plan sólo referencia IDs admitidos.
- Traducción automática: el copy en portugués lo declara el plan; no se genera con IA.
- Conexión en vivo a sistemas de pricing de SKY (follow-up si la planilla no alcanza).

## Detailed Spec

- La expansión consulta el catálogo por zona y no conoce IDs de nodo; los IDs sólo aparecen en el job generado.
- Precio y moneda se formatean por el perfil del mercado antes del preflight (p. ej. `1.090` en es-CL vs
  `1,090` en S/), y el preflight mide el texto ya formateado.
- Campos de zona sin valor en el plan ni en la planilla son error, salvo que el catálogo marque la zona como opcional para ese formato.
- El preflight reutiliza las funciones de shaping del motor (`layoutCopy`, perfiles de destino, reglas de
  condiciones compactas); no duplica medidas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 y Slice 2 en paralelo → Slice 3 (necesita ambos) → Slice 4 (consume la expansión y la alimenta).
- Ningún slice se declara cerrado sin reproducir la prueba de 24 desde un plan.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un campo queda con copy de otro mercado (legal o moneda cruzados) | contenido comercial | medium | invariante de mercado + test por mercado | error de preflight por cruce |
| El preflight dice "cabe" y la composición rechaza | motor | medium | mismo shaping que el motor; test de equivalencia sobre la suite de TASK-1955 | rechazo en `marca:lote` de un job aprobado por preflight |
| Planilla con datos reales filtrada a Git | confidencialidad comercial | low | planillas reales fuera de Git; sólo fixtures sintéticos versionados | gate de higiene |
| Zona sin clasificar impide la expansión | catálogo | medium | depende de TASK-1955 Slice 3 | error de expansión por zona |

### Feature flags / cutover

- Sin flag: comando nuevo y aditivo; `marca:lote` con jobs manuales queda igual.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | minutos | sí |
| Slice 2 | revert PR | minutos | sí |
| Slice 3 | revert PR; los jobs manuales siguen válidos | minutos | sí |
| Slice 4 | revert PR | minutos | sí |

### Production verification sequence

1. Reproducir la prueba de 24 desde un plan con datos sintéticos.
2. Plan de 3 ofertas × 3 mercados × una familia completa: preflight, expansión y `marca:lote` sin rechazos inesperados.
3. Revisión humana de una muestra por mercado (moneda, legal, idioma).

### Out-of-band coordination required

- Acordar con cuentas/SKY el formato de la planilla y la fuente del legal y T&C por mercado.
- Revisión del copy en portugués por alguien de Brasil antes de un despliegue real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `clients/sky/markets.json` define los seis contextos de moneda SKY con moneda, formato numérico, idioma y legal con fuente declarada.
- [ ] `fare-import` rechaza monedas no admitidas por el mercado, duplicados y filas incompletas (probado con casos negativos).
- [ ] La prueba de 24 se reproduce desde un plan y sus jobs coinciden con los manuales o cada diferencia está explicada.
- [ ] Ningún job generado contiene un campo vacío o con valor por defecto; cada campo tiene origen trazable.
- [ ] El preflight produce la matriz copy × formato y su veredicto coincide con el resultado de componer en toda la suite de TASK-1955.
- [ ] Un plan de 3 ofertas × 3 mercados × una familia completa se valida, expande y compone sin editar jobs a mano.
- [ ] Ningún archivo de tarifas reales queda versionado en Git.

## Verification

- `pnpm harness:test`, `pnpm sky:test`, `pnpm gates` en el Workbench.
- `marca:campana --preflight/--expand` sobre el plan de prueba y `marca:lote --validate/--prepare/--execute`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Manual `docs/manual/campaign-plan.md` y skill espejo actualizados con el flujo plan → preflight → expansión.

## Follow-ups

- Conexión directa al sistema de pricing de SKY si la planilla resulta un cuello de botella.
- Plantilla de plan por tipo de campaña (Cyber, SKY Week, Always On, eventos).

## Open Questions

- ¿De dónde sale hoy la tarifa por mercado en SKY (planilla de cuentas, sistema de pricing, feed)?
- ¿El legal y la URL de T&C los define SKY por mercado o Efeonce los redacta para aprobación?
- ¿Las tarifas en USD se publican en todos los mercados o sólo en algunos?
