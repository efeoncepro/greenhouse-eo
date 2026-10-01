# Efeonce Creative Workbench — repo del equipo creativo gobernado desde Greenhouse (ADR)

> **Tipo:** decisión de arquitectura (ADR)
> **Versión:** 1.0
> **Estado:** **Accepted** (2026-09-29) — decisión del operador (Julio Reyes)
> **Creado:** 2026-09-29 por Claude
> **Repo:** [`efeoncepro/creative-workbench`](https://github.com/efeoncepro/creative-workbench) (privado, `main`)
> **Plano de control:** [`scripts/creative-workbench/`](../../scripts/creative-workbench/) en este repo
> **Relacionados:** [Brand Workshop (ADR)](EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) ·
> [Marketing Studio — fuente única e ingesta](marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md) ·
> [Globe / Creative Studio](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) ·
> [Selección de modelos](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) ·
> Manual: [operar el creative workbench](../manual-de-uso/plataforma/operar-creative-workbench.md) ·
> Funcional: [creative workbench](../documentation/plataforma/creative-workbench.md)

## Aplicabilidad vigente — 2026-10-01

Este ADR conserva el contrato de distribución sellada y su bootstrap de 2026-09-29. La evolución
admitida de rutas nativas se rige por el [ADR multimarcas](EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md),
el inventario/sello vigente y `creative-workbench/docs/architecture/workbench-native-harness.md`.
El motor de producción, componentes SKY, Lab y broker se desarrollan en Workbench; las rutas gestionadas
siguen sujetas al sello. Los apartados históricos de CLIs crudos y llaves vía ADC de la persona no son
el contrato operativo actual del broker, ni autorizan reactivarlos o ejecutar un sync total.
Fuentes, adopción y pendientes: [continuidad vigente](../operations/creative-production/WORKBENCH_CURRENT_STATE.md).
Efeonce ID es la identidad definitiva diferida en TASK-1952; no crear AUTH paralelo.

## Delta 2026-10-01 — canon como respaldo de los kits sellados; la exploración se archiva fuera del Workbench

- **Canon como respaldo:** además de distribuir al equipo las referencias aprobadas, `efeonce-creative-canon` respalda
  también los kits sellados en `scripts/foto/assets.lock.json` de greenhouse-eo. Se publican con
  `pnpm creative:assets:publish apply` (pendiente de correr). Una copia en canon no autoriza borrar el original local
  mientras el lock lo declare.
- **La exploración de greenhouse-eo se archiva fuera del Workbench:** va al bucket privado de Greenhouse
  (`gs://efeonce-group-greenhouse-private-assets-prod/ai-generations/<ruta relativa>`) con `pnpm ai-gen:archive`, y su
  inventario es el `artifacts.remote.json` de cada carpeta. Este ADR no crea buckets: siguen siendo `canon` y `work`.
- **El equipo no la baja:** el archivo no forma parte de `assets:pull` ni del harness del Workbench.
- Contrato completo: [`AI_GENERATIONS_STORAGE_V1.md`](../operations/AI_GENERATIONS_STORAGE_V1.md).

## 1. Contexto

El operador quiere que el equipo creativo (diseño, redacción, dirección de arte) trabaje con agentes —Claude
y Codex— usando las mismas skills de oficio, los CLIs de fotografía de la línea gráfica y los CLIs de IA
generativa que ya funcionan en `greenhouse-eo`, con cuatro condiciones:

1. un repo propio en la org `efeoncepro`, que el equipo usa sin tocar Greenhouse;
2. **controlado desde `greenhouse-eo`**: qué recibe el equipo, quién entra y con qué permisos;
3. acceso a GCP **limitado y dado por el operador**, para bajar referencias y subir entregables;
4. modelos de IA **sólo a través de la conexión del operador**: el equipo no tiene llaves.

Se descartó enrutar la generación por Globe, que sería el hogar natural, porque está hibernado. El operador
confirmó que sus CLIs locales (`pnpm ai:*`, `pnpm foto:*`) cubren la necesidad.

Clientes del primer corte: **Efeonce, Berel y SKY**. Agentes: **Claude y Codex**. Las licencias de Claude
Team/Enterprise están en evaluación, así que el diseño **no depende de managed settings**.

## 2. Decisión

`efeoncepro/creative-workbench` es un **cliente gobernado** de `greenhouse-eo`. El equipo trabaja en
`projects/`; todo lo demás llega desde aquí por un único camino y queda sellado.

### 2.1 Un solo camino de entrada: el plan de exportación

`scripts/creative-workbench/export-manifest.json` declara qué sale. `pnpm creative:sync` lo materializa:

| Clase | Qué viaja | Cómo se decide |
|---|---|---|
| Plantilla | `AGENTS.md`, `CLAUDE.md`, guardarraíles de Claude, gates de CI, herramientas, brand packs de clientes | `scripts/creative-workbench/template/` |
| Skills | 17 skills de oficio, espejadas en `.claude/skills/` y `.codex/skills/` desde la misma fuente | Lista en el manifest |
| Código | Cierre de imports de los CLIs exportados, más datos declarados (`bloques`, `assets.lock.json`) | **Calculado con esbuild en cada sync**, no listado a mano |
| Docs | Canon de marca, fotografía, social, publicidad y los docs de Berel | Allowlist explícita, con raíces prohibidas |
| Generados | `package.json` (scripts y versiones fijadas), `workbench.config.json`, `.env.example` | Derivados de `control.json` y del `package.json` del ref |

Reglas del plan:

- **Se exporta un ref de git (HEAD por defecto), nunca el working tree.** El checkout de Greenhouse lo
  comparten varias sesiones. En el bootstrap se exportó el disco y viajó trabajo sin commitear de otra
  sesión, con un sello que decía «commit X» sin serlo. Se corrigió el mismo día.
- El cierre de código falla si alcanza una raíz prohibida (`postgres`, `db`, `finance`, `payroll`, `hr`,
  `auth`, `entitlements`, `commercial`, `identity`, `workforce`). Al 2026-09-29, los 17 entrypoints alcanzan
  55 archivos: `src/lib/ai/*`, `secret-manager`, `google-credentials`, `creative/axis-advertising` y
  `scripts/{ai,foto,creative/layout-compiler}`.
- Las skills citan docs que no viajan (finanzas, contratación, arquitectura de plataforma). No es un error:
  `.workbench/export-report.json` lista esas rutas por skill para decidirlas una por una.

### 2.2 Sello y drift

`.workbench/sync.lock.json` guarda el sha256 de cada archivo gestionado y el commit de origen. En el
workbench:

- el gate `managed-drift` del CI falla si un archivo gestionado se editó o se borró;
- el hook `PreToolUse` de Claude bloquea la edición de cualquier ruta del sello antes de que ocurra;
- el próximo sync pisa cualquier edición.

Un cambio a algo gestionado se propone por issue en el workbench y entra por aquí.

### 2.3 Llaves de IA: dedicadas, en un proyecto propio, leídas en memoria

- **Proyecto GCP propio `efeonce-creative-workbench`**, nunca `efeonce-group`, donde vive la data de
  producción de Greenhouse.
- Secretos `workbench-{openai,fal,higgsfield}-api-key` con **llaves dedicadas al workbench** y tope de gasto
  configurado en cada proveedor. No son las llaves de Greenhouse.
- `.env.local` del equipo sólo lleva `*_SECRET_REF` (rutas completas). Los CLIs sin modificar resuelven la
  llave en memoria con la identidad Google de la persona (`@efeonce.org`), vía ADC.
- Vertex (`ai:omni`) se cobra al mismo proyecto: `roles/aiplatform.user` + `serviceUsageConsumer`.
- **Riesgo aceptado:** quien tiene `secretAccessor` técnicamente puede extraer la llave. Se mitiga con llaves
  dedicadas y revocables, topes en el proveedor, guardarraíles contra `gcloud secrets` y retiro por IAM. Si
  el riesgo deja de ser aceptable, la salida es un broker (Globe al reactivarse, o un servicio delgado), sin
  cambiar la experiencia del equipo.

### 2.4 Buckets e IAM

| Bucket | Contenido | Permiso del equipo |
|---|---|---|
| `efeonce-creative-canon` | Referencias aprobadas del catálogo de foto (`assets.lock.json`, 156 archivos) | `objectViewer` |
| `efeonce-creative-work` | Entregables por `<cliente>/<slug>/<sha12>/<archivo>` | `objectCreator` + `objectViewer` **por prefijo de cliente** |

Ambos buckets tienen acceso uniforme, prevención de acceso público, versionado y soft delete de 30 días. El
equipo **no puede borrar ni sobrescribir** (`objectCreator` no incluye `delete`), y la ruta con huella hace
que una versión nueva nunca pise a otra. No hay listado del bucket: los entregables se ubican por la ruta
registrada en `pieza.json`.

Todo binding que crea el plano de control lleva una condición IAM con título `workbench-*`. Así
`creative:access` reconoce los suyos y los retira cuando alguien sale de `control.json`, sin tocar bindings
ajenos.

### 2.5 Estado deseado declarativo

`scripts/creative-workbench/control.json` es la fuente de verdad del acceso: miembros (GitHub + Google),
clientes asignados y si generan con IA. `pnpm creative:access plan|apply` reconcilia GitHub (equipo
`creative-workbench`, permiso `push`) y GCP. `pnpm creative:provision plan|apply` levanta la infraestructura de
forma idempotente. Nada se da de alta a mano.

### 2.6 Flujo de pieza

`pieza.json` es el **registro de trabajo del taller**: formato, responsable, estado (`brief` →
`en-produccion` → `en-revision` → `aprobada` → `entregada`/`descartada`), aprobación y entregables con huella.
La revisión ocurre en el PR, y el gate `piezas` exige aprobación con fecha, entregables subidos y que apruebe
otra persona. **Publicar nunca ocurre desde el workbench.**

## 3. Fronteras con decisiones vigentes

| Decisión | Relación |
|---|---|
| **Brand Workshop** (`efeonce-brand-workshop`) | Es el taller del **operador** para la marca Efeonce. El workbench es el taller del **equipo**, para varios clientes. No hay dos pipelines: el workbench recibe **copias selladas** del pipeline canónico, no una lógica propia. Cuando TASK-1925 migre `foto` al taller, el manifest debe tomar `foto` desde el taller y dejar de exportarlo desde `scripts/foto` (delta en TASK-1925). El bucket canon está disponible para que TASK-1925 no cree otro. |
| **Marketing Studio** (fuente única de piezas finales) | Studio sigue siendo dueño de la pieza terminada: versiones, aprobación de campaña, derechos y evidencia de publicación. `pieza.json` no lo reemplaza: es trabajo en curso. Cuando exista `studio:upload` (TASK-1894), una pieza `aprobada` se ingiere en Studio y `pieza.json` guarda la referencia a esa versión. |
| **Globe** | Hibernado. Al reactivarse es el candidato natural para ser el broker de IA del workbench (§2.3). |
| **Skills** | La fuente es `greenhouse-eo`. El workbench las recibe selladas, no copiadas a mano. La regla del Brand Workshop «nunca copiar skills al taller» protege al taller del operador, que sí trabaja desde Greenhouse. El equipo no trabaja desde Greenhouse. |

## 4. Alternativas descartadas

- **Dar acceso al equipo a `greenhouse-eo`:** expone código, datos y docs de todos los dominios.
- **Forkear o copiar a mano skills y CLIs:** divergen en semanas y nadie sabe cuál es la vigente.
- **Paquete npm con los CLIs:** es el destino deseable, pero hoy el código vive entre `scripts/` y
  `src/lib/ai` y depende de `@/` aliases. Extraerlo como paquete es el trabajo de TASK-1925 y EPIC-027. El
  cierre calculado por esbuild da el mismo resultado sin bloquear.
- **Broker de IA desde el día uno:** es la opción más segura, pero requiere un servicio nuevo mientras Globe
  está hibernado. Queda como salida del riesgo aceptado del §2.3.
- **Workforce Identity Federation con Entra:** el equipo ya tiene identidades Google `@efeonce.org`
  (Cloud Identity); federar agrega complejidad sin ganancia.

## 5. Reglas duras

- **NUNCA** editar en el workbench un archivo gestionado; el cambio entra por `greenhouse-eo` + `creative:sync`.
- **NUNCA** exportar el working tree: `creative:sync` exporta un ref (`--ref`, por defecto `HEAD`).
- **NUNCA** poner las llaves de Greenhouse en los secretos del workbench; son llaves dedicadas con tope.
- **NUNCA** dar permisos en `efeonce-group` al equipo creativo, ni bindings sin condición `workbench-*`.
- **NUNCA** dar alta o baja de acceso a mano: se edita `control.json` y se corre `creative:access apply`.
- **NUNCA** agregar a la allowlist de docs una raíz de finanzas, contratación, modelo de negocio o tasks.
- **NUNCA** agregar al manifest un CLI cuyo cierre alcance una raíz prohibida: se corta el import primero.

## 6. Limitaciones conocidas

- **GitHub Free:** la org no puede proteger ramas de repos privados (rulesets y branch protection responden
  403, verificado 2026-09-29). `main` no bloquea push directo y CODEOWNERS sólo solicita revisión. Mitigan el
  hook de Claude (bloquea push a `main` y `--force`), el gate de drift y el sync que pisa. Con **GitHub Team**
  se activa el ruleset `main-gobernado` (PR + review de CODEOWNERS + check `gates` obligatorio), ya redactado
  en el manual.
- **Codex** no tiene hooks por proyecto equivalentes a los de Claude: sus reglas viven en `AGENTS.md` y lo
  atrapan el CI y el sync.
- **Referencias de personas:** el bucket canon contiene fotos del equipo. Se usan sólo en piezas de Efeonce.

## 7. Estado

| Paso | Estado |
|---|---|
| Plano de control (`scripts/creative-workbench/`, `pnpm creative:*`) + 12 pruebas | ✅ 2026-09-29 |
| Repo creado, bootstrap y primer sync por PR (#1), CI `gates` en verde | ✅ 2026-09-29 |
| Equipo GitHub `creative-workbench` con permiso `push` (vacío) | ✅ 2026-09-29 |
| Proyecto GCP, buckets y secretos (`creative:provision apply`) | ⏳ pendiente de autorización del operador (crea infraestructura con cobro) |
| Llaves dedicadas con tope en cada proveedor | ⏳ operador |
| Publicar referencias en canon (`creative:assets:publish apply`) | ⏳ tras provision |
| Alta de miembros en `control.json` | ⏳ operador |
| Re-sync desde un commit limpio (el bootstrap arrastró working tree) | ⏳ al commitear este plano de control |
| Ruleset de `main` | ⛔ requiere GitHub Team |
