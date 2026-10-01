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

## Nota de continuidad — 2026-09-30

El bootstrap y la transición sellada descritos abajo conservan su historia. Para operación
productiva actual, cargar el [aislamiento multimarcas](EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md),
la [skill del Workbench](../../.codex/skills/efeonce-creative-workbench/SKILL.md) y su corte fechado.
El harness activo, las recetas y el broker se implementan en `creative-workbench`; no se requiere
copiar o modificar motores Greenhouse ni ejecutar el sync total heredado para componer SKY.
Efeonce ID definitivo está diferido en TASK-1952, sin crear otro AUTH. Las afirmaciones históricas
de equipo vacío, PR 3 draft y broker rechazado no describen el flujo nativo posterior; código/CI
integrados no acreditan activación IA, onboarding completo o deploy del broker.

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

Rutas nativas iniciales, las 11 que el PR #3 necesita poseer (más `clients/brands.json`, `tools/brand-context.mjs` y
`tools/marca-preflight.mjs`, agregadas el mismo día para que copias viejas que aparezcan en la plantilla nunca se
exporten encima del harness): `AGENTS.md`, `CLAUDE.md`, `README.md`,
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
3. ~~**Política de lo nativo**~~ ✅ 2026-09-30 (§8.5).
4. **Broker e IAM a `control.json`:** hoy la cuenta de servicio, los bindings del broker, el proyecto de
   Vercel y `production-policy.json` («todas las marcas para todo el equipo», distinto del acceso por
   cliente de §2.4; resuelto en §8.6) se crearon fuera de `creative:access`/`creative:provision`. `deployment-plan.json` del
   PR #3 aún apunta al bundle `877f5806…` y el vivo es otro.
5. ~~**Skills vs. harness**~~ ✅ 2026-09-30 con la nota «En el Workbench» (§8.7). Sigue pendiente admitir
   Efeonce (y Berel) en el harness para que la fotografía de marca vuelva a ser posible allá.

### 8.5 Política de lo nativo (gate `native-policy`)

`gates/native-policy.json` (reservado, sellado) declara lo que el harness nativo debe cumplir, y el gate
`native-policy` lo verifica **por comportamiento**, sin leer el código del workbench. Es un **lint**, no una
frontera de seguridad: la barrera real es IAM (el equipo no tiene llaves). La revisión de PRs **no** es una barrera
mientras la org siga en GitHub Free (§6): `main` acepta push directo y CODEOWNERS sólo solicita revisión.

- **Proveedores (primero):** ningún archivo de código o configuración (`.mjs/.ts/.jsx/.sh/.py/.json/.yml`…) fuera de
  `services/production-broker/**` llega a un proveedor de IA o a sus llaves: ni directo (host, SDK de IA importado o
  declarado, `import 'openai'`, `*_API_KEY`, `gcloud secrets`, `secretmanager.googleapis.com`, el SDK de Secret
  Manager importado) ni importando —relativo o con alias `@/`, transitivamente— un módulo que lo haga: el adaptador
  del broker o los engines históricos `src/lib/ai/*`. Importar validadores que no llegan al proveedor está bien.
  El import puede ir entre comillas o backticks (`` import(`../src/lib/ai/x`) ``). Tampoco puede **nombrar** la ruta
  de un engine gestionado (`enginePaths`: `scripts/ai/`, `src/lib/ai/`, `src/lib/secrets/`) que llegue al
  proveedor: así se ejecuta sin import, con `spawn`, `tsx` o un script de `package.json`. Nombrar un módulo que
  no llega al proveedor (una tabla de precios) está bien, y una ruta que no resuelve a un archivo se trata como
  engine. Se omiten los archivos gestionados, `gates/`, `.workbench/` (el sello lista las rutas de los engines),
  el guard y `settings.json` (los prueba la sección siguiente), `docs/` y los tests `*.test.*` dentro de una
  carpeta `test/`. Un texto ofuscado (`"api.openai" + ".com"`) lo evade: es un lint.
- **Settings de Claude:** `permissions.deny` conserva las denegaciones mínimas, `disableAllHooks` no está activo y
  el hook `PreToolUse` corre exactamente `node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard.mjs"` para `Bash|Edit|Write`.
- **Guardarraíl (al final, en una copia):** ejecuta `.claude/hooks/guard.mjs` sobre una copia temporal de lo
  versionado, con un payload como el de Claude Code y valores aleatorios. Debe bloquear leer secretos, borrar en
  buckets, push forzado o a `main` (también `rama:main`), leer `.env.local`, llamar a un proveedor y
  `--no-verify`; debe impedir editar el sello y dos archivos gestionados elegidos al azar; debe dejar pasar
  `git status`, un push a una rama y escribir en `projects/`. `native-policy` corre último en `run-all`.
  Desde el 2026-09-30 el push a `main` también se prueba escondido: con la ruta del binario (`/usr/bin/git`),
  dentro de `sh -c '…'`, `bash -c "…"` o `$(…)`, con `+main`, por `xargs`, configurándolo en
  `remote.origin.push` y con `--mirror`. El `git push` sin destino estando en `main` no se puede sondear en una
  copia sin git; la plantilla lo bloquea leyendo la rama actual y el workbench debería hacer lo mismo.

Además, `managed-drift` compara en CI el sello del PR con el de la rama base: sólo un PR de sync puede cambiarlo, y
`creative:status` reconoce un PR de sync porque re-sella con el sello exacto que greenhouse-eo habría escrito (no por
el nombre de la rama).

Verificado 2026-09-30 sobre copias (sync + gates): el estado del PR #3 (`7c4024d`) falla sólo por
`tools/provider-doctor.ts` (lee la llave de OpenAI de Secret Manager y llama a `api.openai.com` directo) y por un
guard que no bloquea `git push origin rama:main`; `main` falla sólo por lo segundo. Los tests del harness de
Codex no cambian (152 pasan, 14 omitidos por canon licenciado). Ambas correcciones deben entrar en el PR #3 antes
del sync de transición.

**Verificado 2026-09-30 sobre el head `289a12e` del PR #3** (copia con los gates de este PR): con la política
anterior, `native-policy` en verde; con las sondas y `enginePaths` nuevas, cero falsos positivos en el código
nativo y seis fallas, todas del guard nativo (las seis formas escondidas de push a `main` de arriba). El sync de
transición queda en rojo hasta que el PR #3 porte esos casos a su `.claude/hooks/guard.mjs`; la plantilla de
este repo es la referencia.

**El catálogo de marcas es nativo (decisión 2026-09-30).** `clients/brands.json` decide qué pack está `ready`, y
las activaciones de pack (revisiones SKY con rollback del mantenedor) viven en el workbench. Si fuera gestionado,
la copia de la plantilla —con SKY `gated`— lo pisaría en el sync. Riesgo residual aceptado: sin protección de
rama, quien pueda empujar al workbench puede habilitar un pack. Lo acota que el pack declare su SHA y que el broker
sólo cargue lo que `admission.json` admite; el ruleset `main-gobernado` de §6 lo cierra. Supersede la frase «el
owner del catálogo es el plano de control Greenhouse» del ADR multimarcas (TASK-1945) mientras no se revise.

### 8.6 Acceso a marcas: todo el equipo, todas las marcas (decisión 2026-09-30)

El operador decidió que, por ahora, todo el equipo produce para todas las marcas. Reemplaza el acceso por cliente
de §2.4 como valor por defecto: `control.json → clientesPorDefecto: "todos"` y `creative:access` otorga a cada
miembro los prefijos de todos los clientes de `control.clientes` (también los que se agreguen). Un miembro puede
restringirse declarando `"clientes": ["sky"]`. Coincide con `production-policy.json` del PR #3 («all-clients»),
que ahora tiene respaldo en greenhouse-eo. Que una marca esté cerrada («gated», p. ej. Efeonce y Berel en el
harness) es otra cosa: depende de que su pack esté admitido, no del acceso de las personas.

### 8.7 Nota «En el Workbench» en las skills (2026-09-30)

Las skills exportadas mandan a `pnpm foto:*`, `ai:*` y `assets:pull`, que el harness nativo retira (la IA pasa por
`marca:*` y el broker). La fuente de la skill no se toca: `export-manifest.json → skillOverlay` apunta a
`scripts/creative-workbench/skill-overlay.md`, y `planFromSource` inserta esa nota justo después del frontmatter
del `SKILL.md` (espejo Claude y Codex) de cada skill que menciona alguno de esos comandos, con la lista exacta que
usa. Hoy son 12 de 17 (`export-report.json → skillOverlays`). La nota dice: el criterio de la skill sigue valiendo;
si un comando está retirado no se busca rodeo; equivalencias (`ai:*` → `marca:producir`, `foto:componer*` →
`marca:componer`/`marca:disenar`, `assets:pull` → `marca:instalar`); y la fotografía de marca Efeonce no está
disponible mientras Efeonce no esté admitida. Es compatible con sellos anteriores: un commit sin `skillOverlay`
se recalcula sin nota.

### 8.8 El sync no toca el checkout local (2026-09-30)

El checkout local del workbench lo comparten la persona y los agentes (Codex trabaja ahí en otra rama). Antes,
`creative:sync --pr` hacía `checkout main` + `reset --hard` en ese checkout. Ahora `creative:sync` y
`creative:status` trabajan en un **clon temporal** de `main` que se borra al terminar (sin flags, el sync es una
vista previa). `--in-place` existe para quien lo pida explícitamente y se niega si el checkout no está limpio, en
`main` y al día con origin: nunca cambia de rama ni resetea. Verificado: tras una vista previa y un `status`, el
checkout local conserva commit, rama, archivos y refs idénticos.

### 8.9 Evaluación de arquitectura del delta (2026-09-30)

**Frontera de dominio.** Tooling de plataforma: `scripts/creative-workbench/**` y su plantilla. Ningún archivo de
`src/**` lo importa (verificado: 0 referencias), no entra al bundle de Next ni a los workers y no toca PostgreSQL,
BigQuery ni entitlements. El workbench es un repo cliente; Globe, Marketing Studio y Brand Workshop mantienen las
fronteras del §3. **Full API Parity no aplica:** no es una capacidad del portal sino un plano de control por CLI,
cuyos consumidores son el operador y el CI del workbench.

**Puertas y reversibilidad.** Todo es de doble vía: una ruta nativa vuelve a ser gestionada quitándola de
`native.paths` (el sync aborta con colisión y exige decidir qué versión queda, en vez de pisar); el sello agrega un
campo (`native`) y es compatible hacia atrás (un sello anterior se verifica íntegro con el generador nuevo, medido);
la nota de skills se retira borrando `skillOverlay` del manifest. La única decisión de una vía es de proceso: el
workbench deja de ser «todo gestionado» y pasa a tener harness propio, y eso quedó escrito aquí.

**Cuatro pilares.**

| Pilar | Cómo lo cumple |
|---|---|
| Seguridad | Lista nativa decidida en greenhouse-eo y sellada; rutas reservadas; `managed-drift` compara el sello del PR contra la base; `creative:status` recalcula el sello; `native-policy` prueba el guard por comportamiento en una copia; la barrera real sigue siendo IAM (§2.3). |
| Robustez | El sync aborta antes de escribir ante colisiones; entrega sin borrar; `package.json` y lockfile nativos juntos; formas canónicas de ruta; staging forzado del plan. |
| Resiliencia | Sólo REST de GitHub y paginación explícita (funciona detrás de proxies de agentes); 404 ≠ error de acceso; un sello no recalculable cuenta como anomalía, no como silencio. |
| Escalabilidad | Cada sync/status calcula 1–2 planes (esbuild, segundos) y un clon superficial temporal; costo lineal en archivos exportados. Suficiente para 1 workbench; si hubiera varios, el plan por commit ya está memoizado en `status`. |

**Patrones canónicos que extiende.** (1) *Enforcement de helper canónico* (TASK-721): el manifest es la única
fuente y los gates son la aplicación mecánica, con un verificador real (`creative:status`) detrás de cada guarda
textual, según la regla de guardas textuales del overlay de arquitectura. (2) *Defensa en profundidad* (TASK-742):
hook del agente → gates de CI → comparación con la base → integridad desde greenhouse-eo → IAM. (3) *Fuente única,
muchos consumidores*: `planFromSource` alimenta sync, status, la verificación del sello y las pruebas; nada recalcula
el plan por su cuenta.

**Riesgos residuales aceptados.** `native-policy` es un lint (un guard malicioso puede engañar sondas; lo mitiga que
el equipo no tenga llaves). La comparación de sello en CI confía en el nombre de rama `sync/*`; lo cubre
`creative:status`, que no confía en nombres. `sync --pr` y `status` no tienen pruebas unitarias de extremo a extremo:
se validaron contra el repo real y contra copias desechables.

**Descartado por el operador (2026-09-30).** La zona «ventana de viaje» mezclada con «origen» en 20 adaptaciones SKY
no bloquea: son textos de ejemplo que se reemplazan al crear el flujo productivo.

**Seguimiento que requiere implementación.** §8.4.4 (broker, cuentas de servicio, Vercel y paquetes al plano de
control) necesita una task formal antes de ejecutarse.

