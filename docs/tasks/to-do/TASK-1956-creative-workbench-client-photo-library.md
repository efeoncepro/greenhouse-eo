# TASK-1956 — Creative Workbench: biblioteca de fotografía por cliente en todos los formatos

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
- Branch: `Workbench: rama propia desde main (task/TASK-1956-client-photo-library); Greenhouse develop sólo para docs; sin worktrees nuevos`

## Summary

Crea una biblioteca neutral de fotografía **por cliente**: cada foto con derechos y procedencia
registrados, sujeto declarado (destino, producto, lugar o persona), punto focal y zona segura del sujeto.
Una receta de encuadre neutral la ubica en todos los formatos con foto de la marca, sin deformar ni tapar
el sujeto con texto, flecha o logo. Es lo que permite producir campañas reales de cualquier cliente con sus
propias fotos. SKY es el primer cliente: hoy sólo 3 de sus 126 formatos aceptan una foto nueva.

## Why This Task Exists

Las campañas a escala dependen de fotos propias del cliente y de su contexto (el destino de una aerolínea,
el producto de un retailer, el lugar de un evento). El Workbench no tiene dónde guardarlas con sus
derechos ni cómo encuadrarlas en todos los formatos de una marca:

- En SKY, los 126 formatos llevan imagen, pero la receta `sky-airline.photograph.native-focus-cover` 1.0.0
  sólo admite una foto nueva en tres (2611 story, 3378 banner, 4616 4:5). Todas las pruebas, incluida la v7
  de 24 adaptaciones, usan la foto histórica `source-reference`, que no representa el destino anunciado.
- No existe biblioteca por cliente ni registro de licencia, vigencia o autorización de imagen por foto.
- El foco es un punto heredado del recorte nativo; no hay zona segura del sujeto ni QA de que texto,
  flecha o logo no lo tapen, crítico en formatos extremos como 728×90 o 160×600.

## Goal

- Una biblioteca neutral y versionada de fotos por cliente, cada una con derechos, procedencia, sujeto,
  punto focal y zona segura.
- Una receta de encuadre neutral que respeta caja, máscara y zonas de texto de cada formato, derivadas de
  la fuente de cada marca, con QA que rechaza recortes que tapan el sujeto o dejan bandas.
- Sustitución de foto admitida en todos los formatos con foto de cada cliente habilitado, empezando por SKY.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- Workbench: `docs/architecture/workbench-sky-photo-frame.md` (receta vigente de SKY),
  `docs/architecture/workbench-kv-zones.md`, `docs/architecture/workbench-cloud-boundary.md`,
  `docs/architecture/workbench-resource-revisions.md`

Reglas obligatorias:

- Núcleo neutral: biblioteca, admisión, encuadre y QA no nombran ninguna marca; cada cliente aporta su
  adaptador (formatos, zonas, criterio fotográfico) en `brands/<marca>/`.
- Una biblioteca por cliente; ninguna foto cruza marcas.
- El job nunca elige foco, recorte, coordenadas ni rutas: selecciona una foto admitida por ID y la receta encuadra.
- Una foto entra sólo con derechos, procedencia y vigencia verificados; sin eso, no se admite.
- La foto no se deforma ni se rellena con bandas; si ningún recorte válido cabe, el formato la rechaza.
- El criterio estético de cada marca lo gobierna su skill de fotografía (SKY:
  `brands/sky-airline/skills/sky-fotografia/`); esta task no la reemplaza.
- Esta task no genera fotos con IA ni gasta en proveedores (TASK-1947).

## Normative Docs

- Workbench `.codex/skills/sky-fotografia/SKILL.md` y `brands/sky-airline/skills/sky-fotografia/SKILL.md` (primer adaptador).
- Workbench `docs/manual/native-design.md` (sustitución de fotografía).
- Greenhouse skill `efeonce-creative-workbench` → `references/sky-photography.md`.

## Dependencies & Impact

### Depends on

- `TASK-1955` Slice 1: derivación de la fuente (recorte nativo, caja y máscara por formato y por marca).
- Broker/UUID propio para fotos verificadas (vigente para los tres formatos SKY actuales).

### Blocks / Impacts

- `TASK-1953`: el plan de campaña referencia fotos por ID de la biblioteca del cliente.
- `TASK-1954`: la caché incluye el SHA de la foto.
- `TASK-1945`: el segundo cliente habilitado necesita su biblioteca para producir.

### Files owned

- Workbench `tools/photo-library.mjs`, `tools/photo-admit.mjs`, `tools/photo-frame.mjs` (núcleo neutral, nuevos) y `tools/marca-fotos.mjs` (consulta).
- Workbench `clients/<cliente>/photo-library.json` (índice versionado sin binarios; primero `clients/sky/`).
- Workbench `brands/sky-airline/components/photo-frame.mjs` (pasa a adaptador SKY del núcleo).
- Workbench `docs/architecture/workbench-photo-library.md` y `docs/manual/photo-library.md` (nuevos); actualizar `workbench-sky-photo-frame.md`.
- Greenhouse skill espejo `efeonce-creative-workbench` (`references/sky-photography.md` y referencia neutral).

## Current Repo State

### Already exists

- Receta SKY `sky-airline.photograph.native-focus-cover` 1.0.0 para 2611/3378/4616: foco desde el centro del recorte nativo, ventana cover sin bandas, `qa.photoFit`.
- Rechazo de sustitución en STRETCH/FIT no admitidos; FILL nativo conserva su recorte central.
- Skill de fotografía SKY con criterio de luz, color, blur y reservas de texto.
- Bucket privado `gs://efeonce-creative-work` (prefijo por cliente) y canon `gs://efeonce-creative-canon`.

### Gap

- No hay núcleo neutral de biblioteca ni de encuadre; lo que existe es una receta SKY para tres formatos.
- 123 de 126 formatos SKY no admiten foto nueva; las demás marcas no tienen receta.
- No hay registro de derechos/procedencia/vigencia por foto ni zona segura del sujeto.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `creative-workbench/tools/` (núcleo neutral) y `creative-workbench/brands/sky-airline/components/` (primer adaptador)
- Future candidate home: `remain-shared`
- Boundary: `photo-admit admite fotos a la biblioteca del cliente; photo-frame encuadra en composición con el adaptador de la marca; ningún job decide geometría`
- Server/browser split: `Node local; binarios en bucket privado por cliente, índice versionado en Git`
- Build impact: `lee binarios del bucket instalados localmente; sin dependencia de red en composición`
- Extraction blocker: `derechos de uso por foto: sin registro verificado no puede distribuirse al equipo`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `biblioteca de fotos por cliente (índice + binarios privados) y receta neutral de encuadre`
- Consumidores afectados: `marca:disenar, marca:campana (TASK-1953), marca:lote, Lab`
- Runtime target: `local + bucket privado por cliente`

### Contract surface

- Contrato existente a respetar: receta SKY 1.0.0 y `qa.photoFit`; IDs de recurso de cada pack.
- Contrato nuevo o modificado: `workbench.photo-library.v1`, `workbench.photo-admission.v1`, receta neutral de encuadre con adaptador por marca (SKY 2.0.0).
- Backward compatibility: `compatible` — los tres formatos SKY actuales reproducen sus bytes o declaran el cambio en la regresión de TASK-1955.
- Full API parity: comandos CLI (`marca:fotos --admit|--list|--preview`) usables por personas y agentes.

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; índice JSON versionado por cliente y binarios en bucket privado`
- Invariantes que no se pueden romper:
  - Ninguna foto se compone sin derechos, procedencia y vigencia registrados y vigentes a la fecha de composición.
  - Ninguna composición deforma la foto ni deja bandas; recorte inválido = rechazo del formato.
  - La zona segura del sujeto no queda tapada por texto, flecha, logo ni sticker (QA por formato).
  - Cada foto se identifica por SHA; reemplazarla es una versión nueva, nunca una sobrescritura.
  - Una foto pertenece a una sola biblioteca de cliente.
- Write-target allowlist: `N/A — sin DB`
- Tenant/space boundary: `biblioteca y prefijo de bucket por cliente; sin cruces entre marcas`
- Idempotency/concurrency: `admisión idempotente por SHA; encuadre determinista`
- Audit/outbox/history: `índice versionado en Git con autor, fecha, fuente y licencia de cada foto`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `la receta neutral admite formatos por familia a medida que pasan QA; los no admitidos siguen rechazando`
- Backfill plan: `admitir la foto histórica SKY como fixture y una foto real con derechos para un sujeto piloto`
- Rollback path: `revert PR; la receta SKY 1.0.0 de tres formatos sigue disponible`
- External coordination: `derechos de las fotos con cada cliente y revisión estética de la diseñadora por marca`

### Security and access

- Auth/access gate: `entrada gobernada vigente + IAM por prefijo de cliente en el bucket`
- Sensitive data posture: `fotos con personas: autorización de imagen registrada; sin datos personales en el índice`
- Error contract: `rechazo por formato con causa (sujeto tapado, bandas, proporción incompatible, licencia vencida)`
- Abuse/rate-limit posture: `N/A — herramienta interna`

### Runtime evidence

- Local checks: tests de admisión (licencia faltante, vigencia vencida, SHA duplicado, cruce de cliente), encuadre por familia, QA de zona segura y neutralidad del núcleo; suites del Workbench.
- DB/runtime checks: `N/A — sin DB`
- Integration checks: `foto real con derechos de un sujeto piloto SKY compuesta en todos los formatos de su familia y revisada en hoja de contacto`
- Reliability signals/logs: `qa.photoFit extendido con zona segura y causa de rechazo`
- Production verification sequence: `N/A — tooling interno; verificación con el sujeto piloto`

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

### Slice 1 — Biblioteca y admisión neutrales

- `workbench.photo-library.v1`: por foto, ID, cliente, sujeto (tipo y nombre: destino, producto, lugar,
  persona), SHA, fuente, licencia/derechos, vigencia, personas identificables (sí/no y autorización), punto
  focal y zona segura del sujeto (rectángulo normalizado).
- `marca:fotos --admit`: valida derechos y metadatos, sube el binario al prefijo privado del cliente con
  ruta con huella y registra el índice `clients/<cliente>/photo-library.json`. Sin derechos o vigencia: rechazo.

### Slice 2 — Encuadre neutral con adaptador SKY

- Receta neutral: para cada formato con foto, calcula la ventana cover que conserva la zona segura del
  sujeto dentro de la caja y fuera de las zonas de texto/flecha/logo, a partir de la geometría derivada por
  el adaptador de la marca (TASK-1955).
- `brands/sky-airline/components/photo-frame.mjs` pasa a ser el adaptador SKY (2.0.0); los tres formatos
  actuales reproducen sus bytes o declaran el cambio en la regresión.

### Slice 3 — QA de encuadre y admisión por familia

- `qa.photoFit` extendido: zona segura visible, solapes con texto/flecha/logo, bandas, escala mínima.
- Admitir formatos SKY por familia (Always On, Eventos, SKY Week, otras adaptaciones) a medida que pasan la
  QA con la foto piloto; los no admitidos siguen rechazando con causa.

### Slice 4 — Consulta, hoja de contacto y neutralidad probada

- `marca:fotos --list|--preview <foto>`: muestra cómo queda una foto en todos los formatos de una familia
  (hoja de contacto local), antes de usarla en un plan de campaña.
- Cliente sintético con su biblioteca y adaptador mínimo que pasa admisión, encuadre y QA sin cambios en
  `tools/`; test que falla si el núcleo nombra una marca real.

## Out of Scope

- Generación o edición de fotos con IA (TASK-1947 y su presupuesto).
- Retoque o color grading: la biblioteca recibe fotos ya aprobadas.
- Adaptadores fotográficos de Berel/Efeonce (los suma TASK-1945 cuando habilite esas marcas).
- Interfaz del Lab para la biblioteca (follow-up).
- Compra o negociación de derechos de imagen.

## Detailed Spec

- La zona segura se declara al admitir (manual o con ayuda de la diseñadora); no se infiere con IA en esta task.
- Las zonas de texto/flecha/logo de cada formato salen de la geometría derivada por el adaptador y de `marca:zonas`.
- Un formato FILL nativo de SKY (p. ej. 2630) pasa a encuadrar por zona segura sólo si la QA lo admite; si
  no, conserva su comportamiento actual.
- La vigencia de la licencia se revalida al componer, no sólo al admitir.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 (la admisión por familia necesita encuadre y QA). Slice 4 tras Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Foto sin derechos o con licencia vencida usada en una pieza | legal/derechos | medium | admisión bloquea sin licencia; vigencia revalidada al componer | rechazo por vigencia |
| Foto de un cliente usada en otro | aislamiento de marca | low | biblioteca y prefijo por cliente; test de cruce | rechazo por cliente |
| Recorte tapa el sujeto en formatos extremos (728×90, 160×600) | composición | high | zona segura + QA por formato; rechazo si no cabe | rechazo `subject-occluded` |
| Cambio de bytes en los tres formatos SKY actuales | motor | medium | regresión de TASK-1955 con cambios declarados | informe de regresión |
| Binarios de fotos en Git | repositorio | low | índice sin binarios; gate de higiene | gate de higiene |

### Feature flags / cutover

- Sin flag de runtime: la receta neutral admite formatos por familia; un formato no admitido sigue rechazando la sustitución como hoy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; objetos del bucket quedan (sin borrado) | minutos | parcial |
| Slice 2 | volver a la receta SKY 1.0.0 | minutos | sí |
| Slice 3 | desadmitir una familia | minutos | sí |
| Slice 4 | revert PR | minutos | sí |

### Production verification sequence

1. Foto histórica SKY admitida como fixture; los tres formatos actuales sin cambios no declarados.
2. Foto real con derechos de un sujeto piloto, encuadrada en todas las familias SKY; hoja de contacto revisada con la diseñadora.
3. Admisión por familia según la QA; cliente sintético verde.

### Out-of-band coordination required

- Confirmar con cada cliente la fuente de sus fotos (banco propio, banco contratado, producción de Efeonce) y sus licencias; SKY primero.
- Revisión estética de la diseñadora por marca y familia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Biblioteca, admisión, encuadre y QA no nombran ninguna marca en `tools/`, y un cliente sintético las pasa sin cambios en el núcleo (test automatizado).
- [ ] `marca:fotos --admit` rechaza una foto sin licencia, con vigencia vencida, con SHA duplicado o destinada a otro cliente (casos negativos probados).
- [ ] El índice versionado no contiene binarios y cada foto tiene cliente, sujeto, fuente, licencia, vigencia, foco y zona segura.
- [ ] Los formatos SKY 2611, 3378 y 4616 producen los mismos bytes con el adaptador 2.0.0, o el cambio queda declarado y aprobado en la regresión.
- [ ] Una foto piloto con derechos se compone en todos los formatos de al menos una familia SKY completa sin bandas ni deformación.
- [ ] La QA rechaza con causa los formatos donde texto, flecha o logo tapan la zona segura del sujeto.
- [ ] `marca:fotos --preview` genera la hoja de contacto de una foto en todos los formatos de su familia.

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

- [ ] Contratos de biblioteca y de encuadre, manual y skill espejo actualizados.

## Follow-ups

- Biblioteca y encuadre en el Lab.
- Adaptadores fotográficos de Berel/Efeonce cuando TASK-1945 habilite esas marcas.
- Sugerencia de zona segura asistida por IA, gobernada por TASK-1947.

## Delta 2026-10-02

- Reencuadre multicliente por decisión del operador: de «biblioteca por destino» SKY a biblioteca neutral
  por cliente con sujeto genérico; la receta SKY pasa a adaptador. Archivo renombrado desde
  `TASK-1956-creative-workbench-destination-photo-library.md`.

## Open Questions

- ¿Cada cliente entrega sus fotos con licencia, o las produce/compra Efeonce? (SKY primero.)
- ¿Cuántos sujetos tiene un despliegue típico por cliente y cuántas fotos por sujeto se esperan?

## Delta 2026-10-02 — Berel segundo cliente

- La biblioteca de Berel tendrá sujetos de producto, color y espacios pintados; Berel entrega sus propios
  masters de campaña, que entran como fotos admitidas con su licencia.

## Delta 2026-10-02 — anclas por foto (caso Berel)

- En Berel los marcadores de color (círculo + línea guía + nombre/código) apuntan a un muro concreto de la
  foto y se reubican cuando la misma escena se recorta en post, story y Pinterest. La biblioteca debe
  registrar, además de foco y zona segura, **anclas con nombre** en coordenadas de la imagen (p. ej. «muro
  principal», con el color aplicado), y el encuadre debe transformarlas a cada formato o rechazar el formato
  si un ancla queda fuera del recorte o bajo texto. Va en el Slice 1 (schema) y Slice 3 (QA).
