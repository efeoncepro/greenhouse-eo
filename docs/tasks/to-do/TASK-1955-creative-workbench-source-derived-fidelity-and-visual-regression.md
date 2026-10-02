# TASK-1955 — Creative Workbench: incorporación de clientes por derivación de la fuente y regresión visual

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
- Rank: `1` dentro de EPIC-050 (red de seguridad previa a escalar)
- Domain: `platform|tooling`
- Blocked by: `none`
- Branch: `Workbench: rama propia desde main (task/TASK-1955-source-derived-fidelity); Greenhouse develop sólo para docs; sin worktrees nuevos`

## Summary

Construye el mecanismo neutral para **incorporar la marca de cualquier cliente** al Workbench: su adaptador
de composición (alineaciones, ejes, espaciados, zonas) se deriva de su fuente de diseño sellada, y las
decisiones que se apartan de la fuente quedan como excepciones registradas. Suma una suite de regresión
visual por cliente que en CI dice qué piezas cambian con cada cambio del motor y bloquea lo no declarado, y
clases de revisión para aprobar una vez por clase en lugar de pieza por pieza. SKY es el primer adaptador.

## Why This Task Exists

Hoy sólo SKY tiene componentes de composición (`brands/sky-airline/components/`); Berel y Efeonce siguen
`gated`. Sumar un cliente significa escribir a mano cientos de reglas por formato, lo que limita cuántos
clientes puede atender el equipo creativo. El caso SKY muestra además el costo de hacerlo a mano:

Las admisiones de contenido y destino del Workbench (`content-layout-admissions.mjs`,
`destination-admissions.mjs`) son datos escritos por pin. En la revisión v6 eso produjo 54 pies legales
con alineación distinta a la de su fuente y un espaciado de origen medido desde la tinta en vez de la caja
de línea; ambos se corrigieron a mano en la v7. Cada KV nuevo que entregue la diseñadora repetiría el
riesgo, porque nada contrasta la regla admitida con la fuente.

La v7 también se verificó con un antes/después manual (19 piezas cambiadas, 5 idénticas). Sin esa
comparación automatizada, un cambio del motor puede mover cientos de piezas sin que nadie lo vea, y la
revisión humana tiene que repetirse pieza por pieza. A escala de campaña eso es inviable.

## Goal

- Un núcleo neutral deriva el adaptador de cualquier cliente desde su fuente sellada; sólo las excepciones
  se escriben a mano, con razón, y un gate falla si una regla contradice su fuente sin excepción.
- Incorporar un cliente nuevo tiene un procedimiento documentado y un tiempo medido, probado con SKY y con
  un adaptador sintético que demuestra que el núcleo no conoce ninguna marca.
- Una suite de regresión por cliente compara cada cambio del motor contra su base sellada y bloquea el merge
  si cambia una pieza no declarada.
- Las piezas se agrupan en clases de revisión deterministas; sólo las anomalías van a revisión humana.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- Workbench: `docs/architecture/workbench-sky-designer-content-rules.md`,
  `docs/architecture/workbench-sky-destination-content-flow.md`, `docs/architecture/workbench-kv-zones.md`,
  `docs/architecture/workbench-composition-recipes.md`, `docs/architecture/workbench-native-harness.md`

Reglas obligatorias:

- Núcleo neutral: `tools/` y los schemas `workbench.*` no nombran ninguna marca; lo específico vive en
  `brands/<marca>/`. Un test con adaptador sintético lo comprueba.
- La fuente sellada (`sourceSha256` del FIG) es la autoridad de geometría; un override nunca la reescribe,
  vive como dato aparte con razón, autor y fecha.
- Los jobs no transportan geometría. Ninguna derivación lee datos del job.
- Corridas, outcomes y bases selladas son inmutables: una base nueva es un archivo nuevo, nunca una
  sobrescritura.
- El motor no achica texto; esta task no cambia esa regla.

## Normative Docs

- Workbench `docs/audits/sky-layout-correction-v7-2026-10-01.md` (evidencia de las dos clases de defecto).
- Workbench `docs/audits/sky-layout-feedback-correction-2026-10-01.md`.
- Greenhouse `docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md`.

## Dependencies & Impact

### Depends on

- Contenido `designer-rules@1.6.0` y destino `content-flow@1.3.0` (Workbench `695b701`).
- Catálogo `sky-adaptation-catalog` 2.0.0 y FIG sellado `473054c8…` en el pack 0.1.0.

### Blocks / Impacts

- `TASK-1953` y `TASK-1954` producen a escala sobre este gate; no escalar sin él.
- `TASK-1956` usa la derivación para el encuadre de foto por formato.
- `TASK-1945` usa este mecanismo para habilitar Berel/Efeonce como marcas productivas.
- Follow-up de revisión en el Lab: consume las clases y anomalías que esta task produce.

### Files owned

- Workbench `tools/derive-admissions.mjs` (núcleo neutral, nuevo) y su prueba con adaptador sintético.
- Workbench `brands/sky-airline/derivation.mjs` (adaptador SKY, nuevo), `brands/sky-airline/components/*-admissions.mjs` (regeneración) y `brands/sky-airline/components/admission-overrides.mjs` (nuevo).
- Workbench `docs/manual/client-onboarding-derivation.md` (nuevo): procedimiento para incorporar un cliente.
- Workbench `tools/visual-regression.mjs` (nuevo), `test/visual-regression/` (suite y bases selladas, fuera de Git los binarios).
- Workbench `tools/review-classes.mjs` (nuevo).
- Workbench `.github/workflows/native-harness.yml` (job de regresión), `test/public-ci-policy.json`.
- Workbench docs de contratos citados arriba; Greenhouse skill espejo `efeonce-creative-workbench`.

## Current Repo State

### Already exists

- Admisiones por pin con SHA de fuente: `brands/sky-airline/components/content-layout-admissions.mjs` (104 pins),
  `destination-admissions.mjs` (95 pins), `badge-admissions.mjs`.
- Derivación puntual hecha a mano en la v7: alineación de `footer-legal` desde `text.align`, gap nativo de
  doble moneda, frame centrado de 3311 (script de mantenimiento no versionado).
- QA geométrico por pieza en `outputs/qa.json` (`contentLayouts`: ejes, gaps, centros).
- Catálogo con 1.196 campos clasificados en 14 zonas; 175 en `other-copy`.
- `tools/sky-compare-references.mjs` y `sky-current-reference-comparison.mjs` comparan contra Figma [verificar alcance].

### Gap

- No hay derivador versionado: cada regla nueva se escribe a mano por pin.
- No hay gate que contraste regla admitida con la fuente.
- No hay suite de regresión visual del motor en CI ni base sellada de referencia.
- No hay noción de clase de revisión ni detector de anomalías sobre `qa.json`.
- 175 campos `other-copy` sin zona semántica.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `creative-workbench/tools/` y `creative-workbench/brands/sky-airline/components/`
- Future candidate home: `remain-shared`
- Boundary: `núcleo neutral (derivación, regresión, clases) + adaptador por marca; el motor consume admisiones, nunca la fuente directa en runtime`
- Server/browser split: `Node local y CI; sin consumer browser`
- Build impact: `lee el FIG sellado y los recursos instalados; binarios de bases fuera de Git`
- Extraction blocker: `recursos licenciados (Metric) sólo en máquinas admitidas: la suite licenciada no corre en modo público`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `admisiones de componentes SKY (datos de receta) y fuente FIG sellada`
- Consumidores afectados: `marca:disenar`, `marca:lote`, CI del Workbench, Lab`
- Runtime target: `local y GitHub Actions del Workbench`

### Contract surface

- Contrato existente a respetar: schema de admisiones `sky-airline.content-layout-admissions.v1`,
  `sky-airline.destination-admissions.v1`; `workbench.design-job.v1`; `public-ci-policy.v2`.
- Contrato nuevo o modificado: `derive-admissions` (comando neutral) + interfaz de adaptador por marca, `admission-overrides` (dato por marca),
  `workbench.visual-regression.v1` (informe), `workbench.review-classes.v1` (clases y anomalías).
- Backward compatibility: `compatible` — la regeneración debe reproducir byte a byte las admisiones 1.6.0/1.3.0 salvo diferencias declaradas.
- Full API parity: comandos CLI reutilizables por agentes y CI; el Lab sólo consume informes.

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; admisiones, overrides, bases y reportes en archivos`
- Invariantes que no se pueden romper:
  - Toda regla admitida = derivada de la fuente, o override explícito con razón; nunca un tercer caso.
  - Regenerar sin cambios en fuente ni overrides produce bytes idénticos (determinismo).
  - Una pieza de la suite sólo puede cambiar si el PR la declara en la lista de cambios esperados.
  - Una clase de revisión agrupa piezas con la misma receta, misma versión de motor y la misma categoría de longitud/forma de copy; nada más.
- Write-target allowlist: `N/A — sin DB`
- Tenant/space boundary: `una marca por derivación y por suite; sin cruces SKY/Berel/Efeonce`
- Idempotency/concurrency: `derivación y regresión deterministas; re-ejecución sin efectos laterales`
- Audit/outbox/history: `overrides con autor/fecha/razón versionados en Git; informes de regresión archivados por SHA de commit`

### Migration, backfill and rollout

- Migration posture: `additive` (regeneración verificada de datos existentes)
- Default state: `gate de regresión en modo informe primero, bloqueante tras una semana sin falsos positivos`
- Backfill plan: `regenerar admisiones; el diff contra 1.6.0/1.3.0 debe ser vacío o explicado línea por línea`
- Rollback path: `revert PR; admisiones previas siguen en Git`
- External coordination: `aprobación de la diseñadora sobre la lista de overrides iniciales`

### Security and access

- Auth/access gate: `identidad Git verificada del Workbench (hooks) y permisos del repo`
- Sensitive data posture: `sin PII; recursos licenciados nunca en artefactos públicos de CI`
- Error contract: `errores con causa y pin; nunca auto-reparar una contradicción`
- Abuse/rate-limit posture: `N/A — herramienta interna`

### Runtime evidence

- Local checks: `pnpm harness:test`, `pnpm sky:test`, `pnpm gates`, regeneración con diff vacío.
- DB/runtime checks: `N/A — sin DB`
- Integration checks: `job de CI ejecutado en un PR de prueba con un cambio declarado y uno no declarado`
- Reliability signals/logs: `informe workbench.visual-regression.v1 por PR`
- Production verification sequence: `N/A — tooling interno; la verificación es el PR de prueba`

## Capability Definition of Done — Full API Parity gate

`N/A — no capability de negocio de Greenhouse`: son comandos internos del Workbench, operables por CLI y CI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Núcleo de derivación, adaptador SKY y overrides explícitos

- `tools/derive-admissions.mjs` (neutral) define la interfaz de adaptador: lectura de la fuente sellada,
  catálogo de zonas y reglas derivables. `brands/sky-airline/derivation.mjs` la implementa para SKY y
  genera sus admisiones de contenido y destino desde el FIG sellado y el catálogo (alineaciones `text.align`, ejes de frame, baselines y line boxes, gaps nativos de moneda,
  frames hug-width centrados), aplicando después `admission-overrides.mjs`.
- `admission-overrides.mjs`: cada override con pin, campo, valor, razón, autor y fecha. Migrar a overrides
  las decisiones del operador que se apartan de la fuente (76 badges LEFT, condiciones compactas 1.1.0,
  `priceRowAlignment`, `editorialDiscount` 4685, `leadGap` 2611/2668, piso de tinta 1.3.0).
- Regenerar y probar que el resultado es idéntico a las admisiones 1.6.0/1.3.0, o explicar cada diferencia.

### Slice 2 — Gate de coherencia fuente/regla

- Gate en `pnpm gates` que falla si una regla admitida contradice su fuente sin override o si un override
  apunta a un pin/campo inexistente o ya coincidente con la fuente (override muerto).

### Slice 3 — Zonas semánticas para `other-copy`

- Clasificar los 175 campos `other-copy` en zonas existentes o nuevas con nombre semántico (p. ej.
  prefijo de destino, etiqueta de tarifa, rótulo de campaña), con revisión del catálogo y sin tocar sus SHA.

### Slice 4 — Suite canónica y regresión visual en CI

- Suite por cliente, declarada por su adaptador. Para SKY: las 24 adaptaciones de `prueba-modular-24-adaptaciones` más una matriz de extremos (ciudad de una
  y dos líneas, precio de 1–7 dígitos, cada moneda SKY, doble moneda, legal de 1–3 líneas, 5%/50%).
- `tools/visual-regression.mjs`: compone la suite, compara por SHA y por geometría de `qa.json` contra la
  base sellada, y emite `workbench.visual-regression.v1` (cambiadas, idénticas, nuevas, con hojas de
  contacto antes/después de las cambiadas).
- Job en `native-harness.yml` en modo privado (recursos licenciados): primero informe, después bloqueante
  cuando un PR cambie piezas no declaradas en su lista `expectedVisualChanges`.

### Slice 5 — Clases de revisión y anomalías

- `tools/review-classes.mjs`: agrupa piezas por receta + versión de motor + categoría de copy (líneas de
  destino, dígitos de precio, monedas, líneas de legal) y marca anomalías desde `qa.json` (gaps bajo el
  mínimo, ejes fuera de tolerancia, márgenes al borde de flecha, contraste medido bajo umbral).
- Informe por lote: clases, piezas por clase, una pieza representativa por clase y lista de anomalías.

### Slice 6 — Neutralidad probada y procedimiento de incorporación

- Adaptador sintético mínimo (marca ficticia, fuente sintética de pocos formatos) que pasa derivación,
  gate, regresión y clases sin tocar el núcleo; test que falla si `tools/` nombra una marca real.
- `docs/manual/client-onboarding-derivation.md`: pasos para incorporar un cliente (fuente sellada →
  adaptador → overrides → suite → primera corrida) y medición del tiempo de incorporación.

## Out of Scope

- Interfaz de revisión en el Lab (follow-up de EPIC-050).
- Expansión de campañas, lotes sin tope y empaquetado (`TASK-1953`, `TASK-1954`).
- Encuadre de fotografía por formato (`TASK-1956`).
- Cambiar la regla de no achicar texto o las decisiones del operador (sólo se registran como overrides).
- Habilitar Berel/Efeonce como productivas (TASK-1945 usa este mecanismo para hacerlo).

## Detailed Spec

- La derivación recorre el FIG sellado por `sourceNodeId` y `fieldId`, igual que los generadores de la v7,
  y nunca lee la escena efectiva de una corrida.
- El informe de regresión distingue "cambio de bytes con geometría idéntica" (p. ej. rasterizado) de
  "cambio de geometría"; sólo el segundo exige declaración.
- La base sellada vive fuera de Git (canon/bucket) referenciada por SHA desde un manifiesto versionado.
- Tolerancias de anomalía versionadas en un archivo de policy, no en el código.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (el gate necesita el derivador). Slice 3 en paralelo con 1–2.
- Slice 4 requiere Slice 1 cerrado (la base se sella con las admisiones regeneradas).
- Slice 5 requiere Slice 4 (usa su informe y su suite).
- Slice 6 requiere Slices 1, 2, 4 y 5 (prueba de punta a punta con el adaptador sintético).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La regeneración cambia admisiones vigentes sin que se note | motor SKY | medium | diff byte a byte contra 1.6.0/1.3.0 obligatorio en Slice 1 | diff no vacío sin explicación |
| Un override legítimo del operador se pierde al derivar | motor SKY | medium | migrar decisiones a overrides con razón antes de regenerar; revisión de la diseñadora | gate de override muerto o contradicción |
| Gate de regresión con falsos positivos bloquea todo | CI Workbench | medium | modo informe una semana; separar bytes vs geometría | PRs bloqueados sin cambio de geometría |
| Recursos licenciados expuestos en artefactos de CI | licencias | low | suite sólo en modo privado; artefactos sin fuentes ni PNG públicos | inventario de artefactos del job |

### Feature flags / cutover

- Sin flag de runtime. El gate de regresión arranca como no bloqueante (`VISUAL_REGRESSION_MODE=report`) y
  pasa a `enforce` por PR explícito tras una semana sin falsos positivos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; admisiones previas en Git | minutos | sí |
| Slice 2 | quitar el gate de `gates/run-all.mjs` | minutos | sí |
| Slice 3 | revert del catálogo de zonas | minutos | sí |
| Slice 4 | volver el job a modo informe o retirarlo | minutos | sí |
| Slice 5 | revert PR (sólo genera informes) | minutos | sí |
| Slice 6 | revert PR (adaptador sintético y manual) | minutos | sí |

### Production verification sequence

1. Regeneración local con diff explicado y suites verdes.
2. PR de prueba con un cambio de motor declarado y otro no declarado: informe correcto en ambos.
3. Una semana en modo informe; pasar a `enforce`.

### Out-of-band coordination required

- Revisión de la diseñadora sobre la lista de overrides y la clasificación de `other-copy`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El núcleo `derive-admissions` no nombra ninguna marca, y un adaptador sintético pasa derivación, gate, regresión y clases sin cambios en `tools/` (test automatizado).
- [ ] `docs/manual/client-onboarding-derivation.md` describe la incorporación de un cliente y registra el tiempo medido con SKY.
- [ ] El adaptador SKY regenera las admisiones de contenido y destino; el diff contra 1.6.0/1.3.0 es vacío o cada diferencia está explicada en la auditoría.
- [ ] Cada decisión del operador que se aparta de la fuente vive en `admission-overrides.mjs` con razón, autor y fecha.
- [ ] `pnpm gates` falla ante una regla que contradice su fuente sin override y ante un override muerto (probado con casos negativos).
- [ ] Los 175 campos `other-copy` quedan clasificados, o los que no se puedan clasificar quedan listados con razón.
- [ ] La suite canónica corre en CI privado y su informe distingue cambio de bytes y cambio de geometría.
- [ ] Un PR que cambia una pieza no declarada en `expectedVisualChanges` queda bloqueado en modo `enforce`.
- [ ] El informe de clases agrupa las 24 piezas de la suite en clases deterministas y lista anomalías con su regla y umbral.
- [ ] Ningún artefacto de CI contiene binarios Metric ni PNG de la suite en modo público.

## Verification

- `pnpm harness:test`, `pnpm sky:test`, `pnpm gates` en el Workbench.
- `node test/public-ci-runner.mjs harness --private` y modo público en CI sin recursos.
- PR de prueba con cambios declarados/no declarados.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Contratos Workbench y skill espejo `efeonce-creative-workbench` actualizados con el derivador, overrides, suite y clases.
- [ ] EPIC-050 actualizado con el estado del gate (informe o enforce).

## Follow-ups

- Superficie de revisión por clases en el Lab (consumer de los informes de esta task).
- Incorporar Berel y Efeonce con este mecanismo cuando TASK-1945 habilite sus fuentes.

## Open Questions

- ¿El umbral de contraste para anomalías sigue AA (4,5:1) o una policy propia de SKY para texto sobre foto?
- ¿Quién aprueba los overrides del lado de SKY además de la diseñadora de Efeonce?

## Delta 2026-10-02

- Reencuadre multicliente por decisión del operador: la capacidad es para todos los clientes de Efeonce,
  SKY es el primer adaptador. Se agregan núcleo neutral, interfaz de adaptador, adaptador sintético y
  procedimiento de incorporación (Slice 6).

## Delta 2026-10-02 — Berel segundo adaptador

- El segundo cliente del EPIC-050 es Berel. La interfaz de adaptador debe admitir su fuente de diseño
  (plantillas de banners y social), que hoy no existe sellada en el Workbench; el adaptador sintético del
  Slice 6 debe parecerse a ese caso (pocos formatos, un mercado) además de al caso SKY.

## Delta 2026-10-02 — dos tipos de fuente de diseño

- Berel (segundo cliente) no tiene Figma; su fuente es Illustrator/Photoshop (`Guia de infografías y
  Formatos.ai`, `Reticulas CHIP.ai`). La interfaz de adaptador debe declarar su tipo de fuente:
  `derived` (FIG sellado, SKY) o `declared` (receta nativa como datos, con SHA, autor y aprobación de la
  diseñadora). En ambos casos el gate de coherencia compara la regla con su fuente (FIG o receta declarada) y
  la regresión usa como base piezas de referencia selladas (para Berel, entregables de agosto en adelante).
  El adaptador sintético del Slice 6 debe cubrir el tipo `declared`.
