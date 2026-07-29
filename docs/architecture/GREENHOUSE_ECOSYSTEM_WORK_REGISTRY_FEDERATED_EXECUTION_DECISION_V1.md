# ADR — Ecosystem Work Registry y Federated Execution Harness

> **Status:** `Proposed — architecture direction accepted, implementation gated`
> **Date:** 2026-07-27
> **Owner:** Greenhouse Platform + Product/Architecture
> **Scope:** Greenhouse, Wave, Globe, Think, sitio público, Kortex, pipelines, workers y futuras plataformas Efeonce
> **Reversibility:** `two-way-but-slow`
> **Confidence:** `high` para la frontera de ownership; `medium` para el mecanismo de transporte y el modelo de datos V1
> **Validated as of:** 2026-07-27 — revisión del Greenhouse Operating Loop, hooks Codex, contrato de sister platforms, modelo de acceso ecosistema y decisiones vigentes de Wave/Globe

## Context

El harness operativo actual es sólido para `greenhouse-eo`: gobierna `TASK-###`, `ISSUE-###`, `EPIC-###`, planes,
linters, verificación local-first, cierre documental y handoff. Sin embargo, sus entrypoints y prompts están acoplados
al repositorio Greenhouse. El hook de tasks resuelve archivos sólo bajo `docs/tasks/{to-do,in-progress,complete}` y el
prompt canónico describe la ejecución dentro de `greenhouse-eo`.

El ecosistema Efeonce ya opera —o está construyendo— múltiples repositorios y runtimes con ownership propio:

- Greenhouse;
- Wave y sus Product Services;
- Globe;
- Think;
- sitio público;
- Kortex;
- pipelines, workers, integraciones y servicios auxiliares.

Los agentes actualmente compensan la limitación explorando repositorios hermanos, resolviendo manualmente el destino y
dejando evidencia en Greenhouse. Esta capacidad depende de la inteligencia y memoria contextual del agente; no es un
contrato determinista, observable ni fácil de auditar.

El riesgo opuesto también es inaceptable: convertir Greenhouse en un runner que posea o ejecute directamente el código,
los secretos, los despliegues y los datos transaccionales de cada plataforma. Eso rompería la frontera de sister
platforms, aumentaría el blast radius y produciría acoplamiento operativo entre productos independientes.

La necesidad load-bearing es, por tanto, doble:

1. Greenhouse debe conservar una vista consolidada del trabajo y del estado del ecosistema.
2. Cada repo debe conservar la autoridad sobre su código, runtime, datos, infraestructura, pruebas y despliegue.

## Decision

Greenhouse evolucionará hacia un **Ecosystem Work Registry** acompañado por un **Federated Execution Harness**.

### 1. Greenhouse posee el registro y la visibilidad global

Greenhouse será el source of truth del trabajo coordinado del ecosistema. Mantendrá una proyección consolidada de:

- iniciativas, epics, tasks, issues y dependencias;
- product house, producto, servicio y repositorio objetivo;
- owner, agente u operador responsable;
- fase operativa y estado por target;
- branch, commit, PR y release relacionados;
- verificaciones, despliegues, blockers, riesgos y evidencia;
- freshness de la última actualización;
- handoff y siguiente acción.

Esta proyección debe cubrir Greenhouse, Wave, Globe, Think, sitio público, Kortex y servicios auxiliares cuando formen
parte de una iniciativa. El operador no debe entrar a cada repo para conocer el estado global.

### 2. Cada repo posee la ejecución local

El repositorio o runtime destino conserva la autoridad sobre:

- código y schemas locales;
- comandos, readers, capabilities y APIs de su producto;
- tests, builds, deploys y rollbacks;
- secretos, service accounts, datos y observabilidad propios;
- evidencia primaria de runtime;
- lifecycle funcional de la capability que implementa.

Greenhouse no recreará la lógica, scoring, datos transaccionales ni infraestructura de una sister platform para poder
mostrar un resumen.

### 3. La coordinación ocurrirá mediante contratos federados

Cada work item central declarará explícitamente, como mínimo:

```yaml
work_id: TASK-####
product_house: wave
product_service: experience-launchops
target_repositories:
  - efeonce-wave
execution_home: sibling-repo
source_of_truth: efeonce-wave
verification_profile: wave-standard
```

El contrato completo deberá incluir tipo de trabajo, owners, dependencias, capabilities requeridas, autorización,
criterios de aceptación, evidencia esperada, rollout, rollback y handoff.

Cada repo habilitado declarará un **Repo Capability Manifest** y un adapter local con sus capacidades de preflight,
plan, test, build, deploy, smoke, rollback y publicación de evidencia. Greenhouse podrá descubrir y coordinar esas
capacidades; no podrá inferirlas por nombres de carpetas ni ejecutarlas fuera de su contrato.

### 3.1 Gates de verificación por repositorio

Los gates no serán globales ni se asumirán por el nombre del lenguaje o del repositorio. Cada repo declarará perfiles
de verificación versionados, con comandos reales, orden, precondiciones, timeout, artifacts, severidad y evidencia
esperada. El manifest puede expresar, por ejemplo:

```yaml
verification_profiles:
  standard:
    preflight: ["pnpm install --frozen-lockfile"]
    static: ["pnpm lint", "pnpm typecheck"]
    tests: ["pnpm test"]
    build: ["pnpm build"]
  release:
    extends: standard
    deploy: ["pnpm deploy:preview"]
    smoke: ["pnpm smoke:preview"]
```

La forma anterior es ilustrativa; el adapter debe declarar los comandos que realmente existen en el repo destino. Un
repo puede usar `pnpm`, `npm`, `yarn`, `bun`, `pytest`, `cargo`, `go test`, scripts propios o una combinación. Greenhouse
no debe imponer `pnpm`, ESLint, TypeScript, Vercel, Cloud Run ni una estructura de scripts a plataformas que no los
usen.

Cada gate debe clasificarse como:

- `required`: su fallo bloquea el estado de verificación del perfil;
- `advisory`: informa deuda o riesgo, pero no bloquea por sí solo;
- `conditional`: corre sólo si el target, archivos, ambiente o tipo de cambio lo activa;
- `human_approval`: exige decisión explícita y no puede ser simulado por un agente.

El resultado federado de cada gate debe incluir `gate_id`, `profile`, comando/version, exit status, duración,
commit, actor, ambiente, artifact/evidence reference, clasificación (`passed`, `failed`, `skipped`, `blocked` o
`unknown`) y timestamp. Un `skipped` o `unknown` nunca equivale a `passed`.

Greenhouse agregará y aplicará política sobre esos resultados, pero el repo destino conserva la autoridad sobre la
definición técnica del gate. Así se evita tanto ejecutar ESLint de Greenhouse sobre Wave como declarar una task
cross-repo completa porque sólo pasó el lint del portal.

### 4. La visibilidad central se actualizará por estado y evidencia estructurados

Los repos y runtimes publicarán estados normalizados, mediante un transporte que se decidirá en la implementación,
como mínimo para:

- `work.accepted`;
- `work.started`;
- `work.plan_ready`;
- `work.slice_completed`;
- `work.blocked`;
- `verification.completed`;
- `deployment.completed`;
- `handoff.updated`.

La proyección debe distinguir `synced`, `stale`, `missing`, `blocked` y `unknown`. Un estado no actualizado no debe
presentarse como estado confirmado.

La evidencia federada debe conservar provenance: repo, commit, run, versión de contrato, actor, timestamp, resultado y
referencia al artefacto. Greenhouse puede resumirla y enlazarla; el repo destino conserva la evidencia primaria.

### 5. El harness se modelará como ejecución durable y autorizada

Las ejecuciones cross-repo deberán poder representar, como mínimo:

```text
accepted
→ planning
→ awaiting_policy
→ executing
→ checkpointed
→ completed | failed | cancelled | quarantined
```

Cada efecto externo debe tener checkpoint, idempotency key, timeout, política de retry, cancelación y reconciliación.
La identidad del operador, la identidad del agente, el grant delegado y la identidad del runtime se mantienen
separadas. Ningún agente puede ampliar tenant, scope, presupuesto o capability por inferencia.

### 6. Codex y Claude deben consumir el mismo contrato de ejecución

El harness del ecosistema no será Codex-only. Greenhouse tiene dos entrypoints operativos que deben permanecer
alineados:

| Entrypoint | Estado actual | Evolución objetivo |
|---|---|---|
| Codex `pnpm codex:task-hook` | Resuelve la task y genera el prompt canónico Greenhouse-local | Resuelve work item/target y entrega el contrato de ejecución y verification profile correspondiente |
| Claude `/implement-task` | Ejecuta el proceso local-first y contiene gates específicos de Greenhouse | Consume el mismo work contract; selecciona gates del repo destino y conserva sus guardrails propios |

Ambos entrypoints deben compartir:

- identidad del work item y target repository;
- source of truth, owner, dependencias y lifecycle;
- Repo Capability Manifest y verification profile;
- reglas de autorización, branch/worktree, subagentes y efectos externos;
- formato de estado, evidencia, freshness y handoff;
- clasificación de cierre (`complete`, `code complete, rollout pendiente` o `operativamente bloqueado`).

Pueden diferir en instrucciones específicas del modelo, formato de prompt y tooling de delegación, pero no pueden
divergir en el contrato de autoridad, gates requeridos, evidencia o semántica de cierre. Los gates actualmente
embebidos en `.claude/commands/implement-task.md` —como `pnpm`, ESLint, typecheck, GVC, workers o `pg:doctor`— deben
convertirse en gates del perfil `greenhouse-standard`, no en requisitos universales para Wave, Globe, Think o el sitio
público.

La paridad debe tener drift guards para ambos entrypoints. Un cambio en el work contract, verification profile,
capability o estado de cierre debe actualizar el contrato común y validar Codex y Claude antes de promoverlo.

## Boundary model

| Concern | Greenhouse / Work Registry | Repo o runtime destino |
|---|---|---|
| Registro global de work items | Source of truth | Consumer de contexto |
| Código y datos del producto | No ownership | Source of truth |
| Estado agregado de iniciativa | Source of truth | Publica estado y evidencia |
| Estado primario de ejecución | Proyección federada | Source of truth local |
| Commands/readers/capabilities | Coordina mediante contrato | Implementa y autoriza localmente |
| Tests/build/deploy/rollback | Orquesta policy y evidencia | Ejecuta y verifica |
| Definition of verification gates | Consume perfiles y aplica policy de cierre | Declara comandos, dependencias, versiones y evidencia |
| Gate result | Proyección agregada por target | Resultado primario firmado o verificable |
| Agent entrypoint | Consume el contrato y reporta ejecución | Codex/Claude ejecutan sin divergir en autoridad, gates ni cierre |
| Identidad y entitlements ecosistema | Administra contexto y bindings | Enforces localmente |
| Secretos, DB, service accounts | Aislados por plataforma | Owner local |
| Auditoría cross-platform | Registro de coordinación y grants | Auditoría del efecto local |
| Visibilidad operativa | Vista consolidada | Evidencia primaria y detalle técnico |

## Quality scenarios

| Concern | Scenario | Measure / evidence |
|---|---|---|
| Visibilidad | Un epic cruza Greenhouse, Wave, Think y sitio público | Greenhouse muestra estado por target, blockers, última actualización y siguiente acción sin visitar cada repo |
| Ownership | Wave cambia su runtime de Agentic Readiness | Greenhouse mantiene la proyección mediante contrato versionado; no copia scoring ni tablas de Wave |
| Frescura | Un repo deja de publicar eventos | El target aparece como `stale` o `unknown` después del umbral documentado; nunca como `complete` confirmado |
| Seguridad | Un agente intenta ejecutar un deploy en Globe | El adapter verifica actor, grant, capability, target, aprobación y presupuesto antes del efecto |
| Fallo parcial | Wave está caído mientras Greenhouse está operativo | Greenhouse conserva el último estado con freshness y muestra degradación; no ejecuta lógica Wave localmente |
| Reanudación | Un worker pierde conexión después de una mutación externa | El harness reconcilia por idempotency/readback antes de repetir el efecto |
| Evidencia | Una task aparece como verificada | Existe referencia a repo, commit/run, contrato, timestamp y resultado; la evidencia es auditable |
| Gates correctos | Una iniciativa cruza repos con toolchains diferentes | Cada target ejecuta sus propios gates declarados; Greenhouse agrega resultados sin sustituirlos por gates Greenhouse |
| Escala cognitiva | Se agrega un nuevo repo, como Think o el sitio público | Se registra mediante manifest/adapter sin copiar el harness completo ni crear otro task registry |

## Alternatives considered

### A. Mantener el harness sólo dentro de Greenhouse

Rechazada como target. Conserva simplicidad local, pero obliga a los agentes a descubrir manualmente el ecosistema,
degrada la visibilidad y hace que el estado cross-repo dependa de memoria o navegación manual.

### B. Crear un task registry separado en cada producto

Rechazada. Duplica IDs, ownership, lifecycle, dependencias y handoff; además contradice la decisión vigente de mantener
Greenhouse como control plane operativo único para sister platforms.

### C. Centralizar todo el código y ejecución en Greenhouse

Rechazada. Rompe aislamiento de runtime, ownership de producto, secretos, datos y despliegues; convierte Greenhouse en
un punto único de fallo y en propietario accidental de IP de Wave, Globe, Think y otros productos.

### D. Scraping periódico de repositorios

Rechazada como mecanismo primario. Puede servir como reconciliación o discovery, pero no expresa autorización, estado de
ejecución, evidencia, idempotencia ni semántica de fallos de manera confiable.

### E. Registry central con adapters y evidencia federada

Seleccionada. Mantiene visibilidad central y registro único, preserva boundaries de runtime y permite introducir repos
gradualmente con capacidades y contratos explícitos.

## Consequences

### Benefits

- El operador obtiene una vista única del ecosistema.
- Greenhouse conserva su rol de administración transversal sin absorber los productos.
- Wave, Globe, Think y el sitio público mantienen independencia de runtime y ownership.
- Los agentes dejan de depender de exploración manual para descubrir dónde trabajar.
- La evidencia cross-repo se vuelve auditable, comparable y reutilizable por UI, API, MCP y reporting.
- La arquitectura soporta productos Agent Native y Full API Parity sin convertir el harness en un mega-runtime.

### Costs and risks

- Debe crearse y mantenerse un contrato de estado federado.
- Habrá consistencia eventual y necesidad de reconciliación.
- Cada repo necesita un manifest y adapter mínimo.
- Los estados agregados pueden quedar stale si el publisher o el transporte fallan.
- La autorización cross-repo requiere diseño explícito de grants, capabilities, auditoría y revocación.
- El primer diseño del registry puede crear deuda si intenta modelar todos los tipos de evidencia desde V1.

## Non-goals

- No crea un monorepo.
- No crea una base de datos compartida entre plataformas.
- No crea un segundo task registry en Wave, Globe, Think o el sitio público.
- No autoriza a Greenhouse a ejecutar directamente código, SQL, secretos o deploys de otra plataforma.
- No reemplaza los comandos, readers, APIs, MCP o workflows locales de cada producto.
- No impone los gates, package manager, linter, framework, proveedor cloud o estrategia de build de Greenhouse a otros repos.
- No mantiene un contrato cross-repo separado para Codex y Claude.
- No define todavía transporte específico, proveedor de colas, schema final de tablas ni UI final.
- No convierte todos los scripts históricos en capacidades federadas automáticamente.

## Transition plan

1. **Baseline:** inventariar repos, runtimes, owners, commands/gates actuales y fuentes de estado para Greenhouse, Wave,
   Globe, Think, sitio público, Kortex y servicios auxiliares.
2. **Work contract:** extender el contrato de epic/task con `product_house`, `target_repository`, `execution_home`,
   `source_of_truth`, `verification_profile` y estado por target, sin cambiar todavía la ejecución.
3. **Registry foundation:** definir el modelo central de work items, targets, status snapshots, evidence references,
   freshness y reconciliation.
4. **Verification profiles:** registrar por repo los comandos reales de lint, typecheck, tests, build, deploy, smoke y
   rollback; clasificar cada gate como required, advisory, conditional o human approval y definir su schema de evidencia.
5. **Entrypoint parity:** extraer el contrato común consumido por `pnpm codex:task-hook` y `/implement-task`, mapear los
   gates Greenhouse actuales al perfil `greenhouse-standard` y crear drift guards para ambos caminos.
6. **First adapters:** implementar un adapter read-only de referencia para un repo hermano y uno para una superficie
   externa como Think o sitio público. Validar discovery, estado y evidencia antes de permitir mutaciones.
7. **Execution federation:** añadir planificación y ejecución delegada con capabilities, grants, checkpoints,
   idempotencia, cancelación y approval gates.
8. **Conformance:** agregar contract tests, drift/freshness checks, failure/replay tests y dashboard de cobertura del
   ecosistema.
9. **Promotion:** habilitar mutaciones o deploys sólo por repo, capability y nivel de autonomía, con rollback y kill
   switch probados.

## Open decisions before implementation

- ¿El work item seguirá usando sólo `TASK-###` o requerirá un identificador global que también represente iniciativas no
  reducibles a tasks?
- ¿El transporte inicial será API push, webhook/event bus, polling de reconciliación o una combinación?
- ¿Cuál es el mínimo de estado que cada repo debe publicar para ser visible sin imponer un framework común?
- ¿Cuál es el contrato mínimo de verification profiles y cómo se versionan los gates sin imponer una toolchain común?
- ¿Qué operaciones serán read-only en V1 y cuáles podrán mutar o desplegar?
- ¿Qué repo o producto será el primer adapter de referencia?
- ¿Cuál será la fuente canónica compartida que consuman Codex y Claude, y qué drift guards tendrán ambos entrypoints?
- ¿Dónde se almacenará la evidencia pesada: en el repo/runtime destino, en un artifact store o mediante referencias?
- ¿Qué SLO de frescura y disponibilidad necesita la vista central para trabajo interno y trabajo cliente-facing?

## Revisit triggers

Revisar este ADR si:

- Greenhouse deja de ser el control plane operativo único;
- un producto requiere un task registry autónomo por razones regulatorias o de ownership;
- el volumen de eventos o work items hace insuficiente la proyección actual;
- se introduce ejecución autónoma de alto impacto o cross-tenant;
- cambia el modelo de identidad, autorización o aislamiento entre sister platforms;
- la consistencia eventual de la visibilidad deja de ser aceptable para una operación crítica.

## Related decisions and contracts

- [Greenhouse Operating Loop](../operations/GREENHOUSE_OPERATING_LOOP_V1.md)
- [Greenhouse Sister Platforms Integration Contract](GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md)
- [Greenhouse Ecosystem Access Control Plane](GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md)
- [Greenhouse Repo Ecosystem](../operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md)
- [Wave Product Platform & Greenhouse Administration](EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md)
- [Greenhouse Full API Parity](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
- [Globe Epic — Greenhouse as operational control plane](../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
