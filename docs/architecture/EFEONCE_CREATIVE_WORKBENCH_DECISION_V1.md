# Efeonce Creative Workbench — repo del equipo creativo gobernado desde Greenhouse (ADR)

> **Tipo:** decisión de arquitectura (ADR)
> **Versión:** 1.1
> **Estado:** **Accepted** (2026-09-29) — decisión del operador (Julio Reyes). **Delta 2026-09-30 (§8):**
> el workbench pasa a tener un harness propio (rutas nativas); greenhouse-eo conserva la frontera.
> **Creado:** 2026-09-29 por Claude
> **Repo:** [`efeoncepro/creative-workbench`](https://github.com/efeoncepro/creative-workbench) (privado, `main`)
> **Plano de control:** [`scripts/creative-workbench/`](../../scripts/creative-workbench/) en este repo
> **Relacionados:** [Brand Workshop (ADR)](EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) ·
> [Marketing Studio — fuente única e ingesta](marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md) ·
> [Globe / Creative Studio](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) ·
> [Selección de modelos](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) ·
> Manual: [operar el creative workbench](../manual-de-uso/plataforma/operar-creative-workbench.md) ·
> Funcional: [creative workbench](../documentation/plataforma/creative-workbench.md)

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

> **Delta 2026-09-30:** «todo lo demás» ya no es literal. Hay rutas **nativas** (el harness del workbench) que
> greenhouse-eo declara, sella y deja de escribir. Ver §8, que prevalece sobre §2.1, §2.2 y §5 donde choquen.

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
| Proyecto GCP, buckets y secretos (`creative:provision apply`) | ⚠ superado: según `HARNESS_STATUS.md` del PR #3, Codex los creó con `gcloud` (ver más abajo) |
| Llaves dedicadas con tope en cada proveedor | ⏳ operador |
| Publicar referencias en canon (`creative:assets:publish apply`) | ⏳ tras provision |
| Alta de miembros en `control.json` | ⏳ operador |
| Ruleset de `main` | ⛔ requiere GitHub Team |
| Re-sync desde commit limpio (`greenhouse-eo@1185cbf68`, PR #2 del workbench) | ✅ 2026-09-29 |
| Proyecto GCP, buckets, secreto OpenAI y broker Cloud Run (creados por Codex en el PR #3, fuera de `creative:provision`) | ⚠ existen; falta llevarlos a `control.json` (§8.4) |
| Rutas nativas selladas, sync que no pisa, `creative:status` por REST con integridad del sello (§8) | ✅ 2026-09-30 en greenhouse-eo; ⏳ sync de transición tras el PR #3 |

## 8. Delta 2026-09-30 — harness nativo y frontera sellada

### 8.1 Contexto

El 2026-09-29 el operador pidió a Codex construir en el workbench y no alterar los CLIs de Greenhouse. Codex
construyó un harness propio (PR #3 del workbench, en borrador): comandos `marca:*`, brand pack SKY con las 126
adaptaciones, broker privado en Cloud Run y desactivación de `ai:*`/`foto:*` en el workbench. Para que el CI
pasara, el PR editó 13 archivos sellados y cambió el gate `managed-drift` para no compararlos, declarando la
exención en `.workbench/native-ownership.json`, un archivo que el mismo PR podía editar. Además, un
`creative:sync` posterior habría pisado el harness (y el harness, bloqueado el sync).

### 8.2 Decisión

Se adopta el modelo **harness nativo con frontera gobernada**:

| Clase | Quién escribe | Qué hace el sync | Cómo se controla |
|---|---|---|---|
| Gestionado (skills, engines, docs, gates) | greenhouse-eo | Escribe y sella | `managed-drift` + integridad del sello |
| Nativo (harness: `package.json`, lockfile, guard, `AGENTS.md`…) | El workbench | No lo escribe ni lo borra | La lista la decide greenhouse-eo y viaja sellada |
| Reservado (`gates/**`, workflow `gates`, `CODEOWNERS`, `.workbench/**`) | greenhouse-eo | Siempre gestionado | Nunca puede declararse nativo |
| `projects/**` | El equipo | Nunca lo toca | Gate `piezas` |

Mecánica (`scripts/creative-workbench/`):

- `export-manifest.json → native.paths` (rutas exactas o `dir/**`) y `native.reserved`. `planFromSource`
  excluye lo nativo del plan; si una skill, un engine o un doc cae en ruta nativa, falla.
- `creative:sync` escribe `native` dentro de `.workbench/sync.lock.json`. Lo gestionado que pasa a nativo se
  **entrega**: sale del sello sin borrarse. Si una ruta del plan ya existe en el workbench y el sello no la
  gestionaba, el sync **aborta** en vez de pisarla. Si `pnpm-lock.yaml` es nativo, no se regenera.
- El gate `managed-drift` lee `native` **sólo del sello**. `.workbench/native-ownership.json` no exime nada;
  el gate avisa que existe.
- `creative:status` (sólo REST de GitHub) recalcula el plan del commit que el sello declara y verifica que el
  sello publicado sea el que greenhouse-eo habría escrito (**sello íntegro**). También marca los PRs abiertos
  que tocan archivos gestionados o `.workbench/`, y lista las dependencias que los engines entregados
  necesitan y que el `package.json` nativo no declara.

Rutas nativas iniciales, las 11 que el PR #3 necesita poseer: `AGENTS.md`, `CLAUDE.md`, `README.md`,
`.gitignore`, `.claude/hooks/guard.mjs`, `.claude/settings.json`, `package.json`, `pnpm-lock.yaml`,
`tools/doctor.mjs`, `tools/instalar.mjs`, `clients/sky/README.md`. De los 13 archivos que el PR editó,
`gates/managed-drift.mjs` y `gates/hygiene.mjs` **no** pasan a nativos: los gates son la forma de controlar
el workbench. El sync de transición los reemplaza por la versión de greenhouse-eo, que lee `native` del sello.

Verificado 2026-09-30 sobre copias locales: sync contra `main` y contra el estado del PR #3 → 11 entregados
sin borrar, gates verdes, y los tests del harness de Codex iguales antes y después (104/105 y 5/7; los
omitidos requieren canon licenciado).

### 8.3 Reglas duras que agrega

- **NUNCA** declarar nativa una ruta desde el workbench: se pide por issue allá y se decide en el manifest de
  greenhouse-eo. Declararla en otro archivo no tiene efecto.
- **NUNCA** declarar nativos `gates/**`, el workflow `gates`, `CODEOWNERS` ni `.workbench/**`.
- **NUNCA** quitar una ruta del manifest para "soltarla": el sync la **borraría**. Se suelta declarándola
  nativa.
- **NUNCA** editar a mano `.workbench/sync.lock.json`: `creative:status` lo detecta como sello no íntegro.

### 8.4 Pendiente (siguientes pasos, no cubiertos por este delta)

1. Codex termina el PR #3; se mergea (idealmente dividido).
2. Sync de transición `pnpm creative:sync --pr`: entrega las 11 rutas, instala los gates que leen `native` y
   pone al día los engines (`isotipo`, línea gráfica). Después, el workbench puede retirar
   `native-ownership.json` y su test.
3. **Política de lo nativo:** reglas selladas que un gate verifica sobre el harness (el guard sigue
   bloqueando secretos y push a `main`, ningún script llama directo a un proveedor, marcas coherentes con
   `control.json`).
4. **Broker e IAM a `control.json`:** hoy la cuenta de servicio, los bindings del broker, el proyecto de
   Vercel y `production-policy.json` («todas las marcas para todo el equipo», distinto del acceso por
   cliente de §2.4) se crearon fuera de `creative:access`/`creative:provision`. `deployment-plan.json` del
   PR #3 aún apunta al bundle `877f5806…` y el vivo es otro.
5. **Skills vs. harness:** las 17 skills siguen indicando `pnpm foto:*`/`ai:*`, desactivados en el
   workbench; Efeonce y Berel quedaron cerrados («gated»). Hay que decidir si se entrega una capa por repo o
   si `AGENTS.md` nativo lo resuelve.
