# TASK-1956 — Creative Workbench: biblioteca de fotografía por destino en todos los formatos

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
- Rank: `2` dentro de EPIC-050 (en paralelo con TASK-1953)
- Domain: `platform|tooling|content`
- Blocked by: `TASK-1955` (Slice 1: derivación de la fuente, usada para el foco y el recorte nativo de cada formato)
- Branch: `Workbench: rama propia desde main (task/TASK-1956-destination-photo-library); Greenhouse develop sólo para docs; sin worktrees nuevos`

## Summary

Crea una biblioteca de fotografía SKY por destino, con derechos y procedencia registrados, punto focal y
recorte aprobado por proporción, y extiende la sustitución de foto de los 3 formatos admitidos hoy a todos
los formatos que llevan fotografía. Es lo que permite componer campañas reales con destinos distintos,
en lugar de la foto histórica de referencia que usan las pruebas.

## Why This Task Exists

Los 126 formatos SKY llevan imagen, pero la receta `sky-airline.photograph.native-focus-cover` 1.0.0 sólo
admite una foto nueva en tres (2611 story, 3378 banner, 4616 4:5). Todas las pruebas, incluida la v7 de 24
adaptaciones, usan la foto histórica `source-reference`, que además no representa el destino anunciado.
Un despliegue real necesita una foto por destino (o varias), encuadrada correctamente en 9:16, 4:5, 1:1,
2:1 y banners extremos como 728×90 o 160×600, con el sujeto a salvo de texto, flecha y logo, y con
derechos de uso verificados. Hoy no existe dónde guardar esa foto admitida ni cómo encuadrarla fuera de
esos tres formatos.

## Goal

- Una biblioteca versionada de fotos por destino, cada una con derechos, procedencia, punto focal y zona
  segura del sujeto.
- Encuadre automático por formato que respeta la caja, máscara y zona libre de texto de cada plantilla,
  con QA que rechaza un recorte que tapa el sujeto o deja bandas.
- Sustitución de foto admitida en todos los formatos con fotografía, no sólo en tres.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- Workbench: `docs/architecture/workbench-sky-photo-frame.md`, `docs/architecture/workbench-kv-zones.md`,
  `docs/architecture/workbench-cloud-boundary.md`, `docs/architecture/workbench-resource-revisions.md`

Reglas obligatorias:

- El job nunca elige foco, recorte, coordenadas ni rutas: selecciona una foto admitida por ID y la receta encuadra.
- Una foto entra a la biblioteca sólo con derechos y procedencia verificados; sin eso, no se admite.
- La foto no se deforma ni se rellena con bandas; si ningún recorte válido cabe, el formato la rechaza.
- La skill original de fotografía SKY (`brands/sky-airline/skills/sky-fotografia/`) gobierna el criterio de
  aceptación estética; esta task no la reemplaza.
- Esta task no genera fotos con IA ni gasta en proveedores (TASK-1947).

## Normative Docs

- Workbench `.codex/skills/sky-fotografia/SKILL.md` y `brands/sky-airline/skills/sky-fotografia/SKILL.md`.
- Workbench `docs/manual/native-design.md` (sustitución de fotografía).
- Greenhouse skill `efeonce-creative-workbench` → `references/sky-photography.md`.

## Dependencies & Impact

### Depends on

- `TASK-1955` Slice 1: derivación de la fuente (recorte nativo, caja y máscara por formato).
- Broker/UUID propio para fotos verificadas (vigente para los tres formatos actuales).

### Blocks / Impacts

- `TASK-1953`: el plan de campaña referencia fotos por destino con IDs de esta biblioteca.
- `TASK-1954`: la caché incluye el SHA de la foto.

### Files owned

- Workbench `brands/sky-airline/components/photo-frame.mjs` y su admisión (de 3 a todos los formatos con foto).
- Workbench `clients/sky/photo-library.json` (nuevo, índice versionado sin binarios).
- Workbench `tools/photo-admit.mjs` (nuevo) y `tools/marca-fotos.mjs` (consulta).
- Workbench `docs/architecture/workbench-sky-photo-frame.md`, `docs/manual/photo-library.md` (nuevo).
- Greenhouse skill espejo `efeonce-creative-workbench` (`references/sky-photography.md`).

## Current Repo State

### Already exists

- Receta `sky-airline.photograph.native-focus-cover` 1.0.0 para 2611/3378/4616: foco desde el centro del recorte nativo, ventana cover sin bandas, `qa.photoFit`.
- Rechazo de sustitución en STRETCH/FIT no admitidos; FILL nativo conserva su recorte central.
- Skill de fotografía SKY con criterio de luz, color, blur y reservas de texto.
- Bucket privado `gs://efeonce-creative-work` y canon `gs://efeonce-creative-canon` con IAM por prefijo.

### Gap

- 123 de 126 formatos no admiten una foto nueva.
- No hay biblioteca por destino ni registro de derechos/procedencia/vigencia por foto.
- El foco es un punto heredado del recorte nativo; no hay zona segura del sujeto ni QA de que el texto o la flecha no lo tapen.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `creative-workbench/brands/sky-airline/components/` y `creative-workbench/tools/`
- Future candidate home: `remain-shared`
- Boundary: `photo-admit admite fotos a la biblioteca; photo-frame encuadra en composición; ningún job decide geometría`
- Server/browser split: `Node local; binarios en bucket privado, índice versionado en Git`
- Build impact: `lee binarios del bucket/canon instalados localmente; sin dependencia de red en composición`
- Extraction blocker: `derechos de uso por foto: sin registro verificado no puede distribuirse al equipo`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `biblioteca de fotos SKY (índice + binarios privados) y receta de encuadre`
- Consumidores afectados: `marca:disenar, marca:campana (TASK-1953), marca:lote, Lab`
- Runtime target: `local + bucket privado`

### Contract surface

- Contrato existente a respetar: `sky-airline.photograph.native-focus-cover` 1.0.0 y `qa.photoFit`; IDs de recurso del pack.
- Contrato nuevo o modificado: `workbench.photo-library.v1` (índice), `workbench.photo-admission.v1`, receta de encuadre 2.0.0 para todos los formatos.
- Backward compatibility: `compatible` — los tres formatos actuales deben producir los mismos bytes con la receta 2.0.0 o declarar el cambio en la regresión de TASK-1955.
- Full API parity: comandos CLI (`marca:fotos --admit|--list|--preview`) usables por personas y agentes.

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; índice JSON versionado y binarios en bucket privado`
- Invariantes que no se pueden romper:
  - Ninguna foto se compone sin derechos, procedencia y vigencia registrados.
  - Ninguna composición deforma la foto ni deja bandas; recorte inválido = rechazo del formato.
  - La zona segura del sujeto no queda tapada por texto, flecha, logo ni sticker (QA por formato).
  - Cada foto se identifica por SHA; reemplazar una foto es una versión nueva, nunca una sobrescritura.
- Write-target allowlist: `N/A — sin DB`
- Tenant/space boundary: `biblioteca exclusiva de sky-airline; ninguna foto cruza marcas`
- Idempotency/concurrency: `admisión idempotente por SHA; encuadre determinista`
- Audit/outbox/history: `índice versionado en Git con autor, fecha, fuente y licencia de cada foto`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `receta 2.0.0 admite formatos por familia a medida que pasan QA; los no admitidos siguen rechazando`
- Backfill plan: `admitir la foto histórica de referencia como entrada de prueba y una foto real por destino piloto`
- Rollback path: `revert PR; la receta 1.0.0 de tres formatos sigue disponible`
- External coordination: `derechos de las fotos (SKY o banco contratado) y revisión estética con la diseñadora`

### Security and access

- Auth/access gate: `entrada gobernada vigente + IAM por prefijo de cliente en el bucket`
- Sensitive data posture: `fotos con personas: derechos de imagen registrados; sin datos personales en el índice`
- Error contract: `rechazo por formato con causa (sujeto tapado, bandas, proporción incompatible)`
- Abuse/rate-limit posture: `N/A — herramienta interna`

### Runtime evidence

- Local checks: tests de admisión (derechos faltantes, SHA duplicado), encuadre por familia y QA de zona segura; suites del Workbench.
- DB/runtime checks: `N/A — sin DB`
- Integration checks: `una foto real por destino piloto compuesta en todos los formatos de su familia, revisada a ojo y en hoja de contacto`
- Reliability signals/logs: `qa.photoFit extendido con zona segura y causa de rechazo`
- Production verification sequence: `N/A — tooling interno; verificación con el destino piloto`

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

### Slice 1 — Biblioteca y admisión

- `workbench.photo-library.v1`: por foto, ID, destino, SHA, fuente, licencia/derechos, vigencia, personas
  identificables (sí/no y autorización), punto focal y zona segura del sujeto (rectángulo normalizado).
- `marca:fotos --admit`: valida derechos y metadatos, sube el binario al prefijo privado del cliente con
  ruta con huella y registra el índice. Sin derechos o vigencia: rechazo.

### Slice 2 — Encuadre por formato

- Receta de encuadre 2.0.0: para cada formato con foto, calcula la ventana cover que conserva la zona
  segura del sujeto dentro de la caja y fuera de las zonas de texto/flecha/logo del formato, a partir de
  la geometría derivada de la fuente (TASK-1955).
- Los tres formatos actuales reproducen sus bytes o declaran el cambio en la regresión.

### Slice 3 — QA de encuadre y admisión por familia

- `qa.photoFit` extendido: zona segura visible, solapes con texto/flecha/logo, bandas, escala mínima.
- Admitir formatos por familia (Always On, Eventos, SKY Week, otras adaptaciones) a medida que pasan la QA
  con la foto piloto; los no admitidos siguen rechazando con causa.

### Slice 4 — Consulta y hoja de contacto

- `marca:fotos --list|--preview <foto>`: muestra cómo queda una foto en todos los formatos de una familia
  (hoja de contacto local), antes de usarla en un plan de campaña.

## Out of Scope

- Generación o edición de fotos con IA (TASK-1947 y su presupuesto).
- Retoque, color grading o corrección de la foto: la biblioteca recibe fotos ya aprobadas.
- Interfaz del Lab para la biblioteca (follow-up).
- Compra o negociación de derechos de imagen.

## Detailed Spec

- La zona segura se declara al admitir (manual o asistida por la diseñadora); no se infiere con IA en esta task.
- Las zonas de texto/flecha/logo de cada formato salen de la geometría derivada de la fuente y de `marca:zonas`.
- Un formato FILL nativo (p. ej. 2630) pasa a encuadrar por zona segura sólo si la QA lo admite; si no,
  conserva su comportamiento actual.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 (la admisión por familia necesita encuadre y QA). Slice 4 tras Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Foto sin derechos usada en una pieza | legal/derechos | medium | admisión bloquea sin licencia y vigencia; vencimiento revalidado al componer | rechazo por vigencia |
| Recorte tapa el sujeto en formatos extremos (728×90, 160×600) | composición | high | zona segura + QA por formato; rechazo si no cabe | rechazo `subject-occluded` |
| Cambio de bytes en los tres formatos actuales | motor | medium | regresión de TASK-1955 con cambios declarados | informe de regresión |
| Binarios de fotos en Git | repositorio | low | índice sin binarios; gate de higiene | gate de higiene |

### Feature flags / cutover

- Sin flag de runtime: la receta 2.0.0 admite formatos por familia; un formato no admitido sigue rechazando la sustitución como hoy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; objetos del bucket quedan (sin borrado) | minutos | parcial |
| Slice 2 | volver a la receta 1.0.0 | minutos | sí |
| Slice 3 | desadmitir una familia | minutos | sí |
| Slice 4 | revert PR | minutos | sí |

### Production verification sequence

1. Foto histórica de referencia admitida como fixture; los tres formatos actuales sin cambios no declarados.
2. Una foto real con derechos por destino piloto, encuadrada en todas las familias; hoja de contacto revisada con la diseñadora.
3. Admisión por familia según la QA.

### Out-of-band coordination required

- Confirmar con SKY la fuente de fotos por destino (banco propio, banco contratado, producción de Efeonce) y sus licencias.
- Revisión estética de la diseñadora por familia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `marca:fotos --admit` rechaza una foto sin licencia, sin vigencia o con SHA duplicado (casos negativos probados).
- [ ] El índice versionado no contiene binarios y cada foto tiene fuente, licencia, vigencia, foco y zona segura.
- [ ] Los formatos 2611, 3378 y 4616 producen los mismos bytes con la receta 2.0.0, o el cambio queda declarado y aprobado en la regresión.
- [ ] Una foto piloto con derechos se compone en todos los formatos de al menos una familia completa sin bandas ni deformación.
- [ ] La QA rechaza con causa los formatos donde texto, flecha o logo tapan la zona segura del sujeto.
- [ ] La hoja de contacto de una foto en todos los formatos de su familia se genera con `marca:fotos --preview`.

## Verification

- `pnpm harness:test`, `pnpm sky:test`, `pnpm gates` en el Workbench.
- Composición piloto con foto real y revisión visual en hoja de contacto.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Contrato `workbench-sky-photo-frame.md`, manual de biblioteca y skill espejo actualizados.

## Follow-ups

- Biblioteca y encuadre en el Lab.
- Sugerencia de zona segura asistida por IA, gobernada por TASK-1947.

## Open Questions

- ¿SKY entrega fotos por destino con licencia, o las produce/compra Efeonce?
- ¿Cuántos destinos tiene un despliegue típico y cuántas fotos por destino se esperan?
