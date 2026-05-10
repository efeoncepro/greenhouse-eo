# AGENTS.md

## Objetivo

Este repositorio es la base operativa de Greenhouse sobre Vuexy + Next.js. Aqui trabajaran multiples agentes y personas. Este documento define reglas obligatorias para evitar conflictos, duplicidad de trabajo y despliegues rotos.

## Alcance

- Este repo corresponde solo a `starter-kit`.
- `full-version` debe usarse como referencia de contexto para entender componentes, patrones, flujos y alcance funcional esperado.
- Aunque `full-version` exista versionado en este workspace como referencia local, no debe tratarse como source of truth del producto ni ampliarse como si fuera parte activa del portal.
- Cualquier copia de componentes desde `full-version` debe ser intencional, revisada y adaptada al contexto Greenhouse antes de integrarse.
- Convencion documental vigente:
  - `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md` y `changelog.md` quedan en raiz.
  - specs, tasks, roadmap y guias especializadas viven bajo `docs/`.
  - `docs/audits/` vive bajo `docs/` como categoria formal para auditorias tecnicas y operativas versionadas. El indice vigente es `docs/audits/README.md`.
  - las auditorias deben consumirse como input operativo frecuente cuando un cambio toca el sistema auditado, pero nunca asumirse vigentes a ciegas: antes de apoyarse en una auditoria hay que verificar si el runtime, el codigo o la arquitectura siguen reflejando lo que documento, o si hace falta abrir una auditoria nueva/refresh.
  - `docs/epics/` se ordena operativamente en `in-progress/`, `to-do/` y `complete/`; el indice vigente es `docs/epics/README.md`.
  - los epics nuevos deben usar ID estable `EPIC-###` y `docs/epics/EPIC_TEMPLATE.md`; sirven para programas cross-domain o multi-task y no reemplazan la ejecucion por tasks.
  - `docs/mini-tasks/` se ordena operativamente en `in-progress/`, `to-do/` y `complete/`; el indice vigente es `docs/mini-tasks/README.md`.
  - las mini-tasks nuevas deben usar ID estable `MINI-###` y `docs/mini-tasks/MINI_TASK_TEMPLATE.md`; el modelo operativo vive en `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`.
  - `docs/tasks/` se ordena operativamente en `in-progress/`, `to-do/` y `complete/`; el indice vigente es `docs/tasks/README.md`.
  - las tasks nuevas deben nacer con ID estable `TASK-###` y usar `docs/tasks/TASK_TEMPLATE.md` como plantilla copiable. Si una task cuelga de un programa mayor, debe declarar `Epic: EPIC-###` en `## Status`. El protocolo de ejecucion (Plan Mode, Skill, Subagent, Checkpoint/Mode) vive en `docs/tasks/TASK_PROCESS.md`.
  - los briefs `CODEX_TASK_*` existentes siguen vigentes como legacy hasta su migracion y deben vivir versionados dentro de `docs/tasks/**`; el patron ignorado en raiz queda solo para scratch local fuera de la taxonomia documental.

## Prioridades

1. Mantener el proyecto desplegable en Vercel.
2. Evitar romper la base de Vuexy mientras se adapta a Greenhouse.
3. Dejar handoff claro para el siguiente agente.
4. No mezclar refactors grandes con cambios funcionales pequenos.
5. Preferir soluciones seguras, robustas, resilientes y escalables por sobre parches locales. La regla canonica vive en `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.

## Contrato rapido para agentes

Este bloque es el resumen obligatorio antes de ejecutar cualquier cambio. Las secciones posteriores son la fuente detallada y no se deben ignorar cuando el dominio aplique.

- Primero orientarse: leer `project_context.md`, `Handoff.md`, la task/spec aplicable y la arquitectura del dominio antes de escribir.
- Protocolo TASK-###: usar `docs/tasks/TASK_PROCESS.md` como proceso canonico y `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` como prompt operativo robusto para ejecucion con Codex.
- ADRs: decisiones arquitectonicas viven bajo `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` y el indice `docs/architecture/DECISIONS_INDEX.md`. Si una task cambia source of truth, schema, access, auth, finance/payroll/accounting semantics, events/outbox/webhooks, APIs externas, cloud/deploy/secrets, UI platform o runtime projections compartidas, debe identificar o proponer ADR antes de implementar.
- Contexto y auditoria: `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` gobierna como usar `project_context.md`, `Handoff.md` y `Handoff.archive.md` sin perder memoria historica.
- Source of truth: si task/spec, arquitectura y runtime real discrepan, prevalecen arquitectura vigente + codigo/schema/runtime verificados. Corregir la spec antes de implementar si el drift cambia contrato o bloquea.
- Calidad de solucion: no entregar parches fragiles si el problema pide causa raiz. Aplicar `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`; cualquier workaround debe ser temporal, reversible, documentado y con owner/retirada.
- Copy visible: antes de escribir labels, CTAs, empty states, alerts, tooltips, aria-labels o mensajes, buscar/crear la entrada en la capa canonica. `src/lib/copy/*` guarda microcopy funcional y copy reutilizable por dominio; `src/config/greenhouse-nomenclature.ts` guarda solo nomenclatura de producto, navegacion y labels institucionales. No hardcodear copy reusable en JSX.
- Proporcionalidad: discovery breve para cambios locales; protocolo completo para cambios cross-domain, auth, billing, finance, data, cloud, migraciones, observabilidad o UI visible.
- Reutilizar antes de crear: buscar helpers, readers, components, routes, signals, capabilities y docs existentes antes de introducir piezas nuevas.
- Aislamiento multi-agente: no cambiar la rama de un checkout donde otra persona/agente trabaja; usar `git worktree` y documentar coordinacion en `Handoff.md`.
- Skills y subagentes: usar skills cuando el dominio matchee y subagentes solo para trabajo paralelo independiente con ownership claro. No delegar el bloqueo inmediato del hilo principal.
- Seguridad runtime: no improvisar credenciales, pools, env vars, access paths, bypasses, raw errors ni acciones destructivas. Usar los CLIs autenticados con guardrails.
- Verificacion y cierre: validar con build/lint/test/manual segun aplique, documentar lo no validado, sincronizar docs/task lifecycle y no declarar cerrado algo que siga incompleto.

## Reglas Operativas

### 0. Tooling disponible (CLIs autenticadas)

Estos CLIs estan autenticados localmente. Cuando una task toca su dominio, **usalos directamente** en vez de pedirle al usuario que lo haga manualmente desde portal/web UI. Esto aplica especialmente para diagnostico y fix de incidentes runtime cuya causa raiz vive fuera del codigo.

- **Azure CLI (`az`)**: autenticado contra el tenant Microsoft de Efeonce `a80bf6c1-7c45-4d70-b043-51389622a0e4`. Sirve para gestionar Azure AD App Registrations (redirect URIs, client secrets, tenant config), Bot Service, Logic Apps, Resource Groups. Comandos canonicos: `az ad app show --id <client-id>`, `az ad app update`, `az ad app credential reset`, `az ad sp show`. Subscription ID: `e1cfff3e-8c21-4170-8b28-ad083b741266`.
- **Google Cloud CLI (`gcloud`)**: autenticado como `julio.reyes@efeonce.org` con ADC. Project canonico `efeonce-group`. Sirve para Secret Manager, Cloud Run, Cloud SQL, Cloud Scheduler, BigQuery, Cloud Build, Workload Identity Federation.
  - **Regla operativa obligatoria**: cuando un agente necesite acceso interactivo local a GCP, debe lanzar **siempre ambos** flujos y no asumir que uno reemplaza al otro:
    - `gcloud auth login`
    - `gcloud auth application-default login`
  - Motivo: `gcloud` CLI y ADC pueden quedar desalineados; si solo se autentica uno, pueden fallar `bq`, `psql` via Cloud SQL tooling, Secret Manager o scripts del repo de forma parcial y confusa.
- **GitHub CLI (`gh`)**: autenticado contra `efeoncepro/greenhouse-eo`. Sirve para issues, PRs, workflow runs, releases.
- **Vercel CLI (`vercel`)**: autenticado contra el team `efeonce-7670142f`. Sirve para env vars, deployments, project config.
- **PostgreSQL CLI (`psql`)** via `pnpm pg:connect`: levanta proxy Cloud SQL + conexion auto, sin credenciales manuales.

**Regla operativa**: si diagnosticas que la causa raiz de un incidente vive en una de estas plataformas, ejecuta el fix con el CLI con guardrails y verificacion. Documentar pasos manuales para que el usuario los haga es **antipatron** salvo que la accion sea destructiva (eliminar app registration, drop database, force-push), en cuyo caso confirma con el usuario primero.

### 1. Antes de cambiar codigo

- Leer `project_context.md`.
- Leer `Handoff.md` para ver trabajo en curso, riesgos y proximos pasos.
- Usar `Handoff.archive.md` solo si hace falta rastrear contexto historico; no como primera lectura operativa.
- Para continuidad entre agentes, auditoria historica y compresion segura del handoff, aplicar `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`. No borrar historia auditable; moverla o enlazarla cuando corresponda.
- Leer `DESIGN.md` cuando el cambio toque cualquier surface visible o decision visual del portal. **Validar local con `pnpm design:lint`** (debe reportar 0 errors / 0 warnings) antes de commitear cualquier cambio al frontmatter — el CI gate `.github/workflows/design-contract.yml` (TASK-764) bloquea PRs en modo strict.
- Leer la especificacion externa `../Greenhouse_Portal_Spec_v1.md` cuando el cambio afecte producto, autenticacion, data, rutas principales o arquitectura.
- Si el trabajo requiere specs o briefs, buscarlos primero en `docs/README.md` y luego en la categoria correspondiente dentro de `docs/`.
- Si existe una auditoria relevante en `docs/audits/` para la zona que vas a tocar, leerla temprano y usarla como contexto operativo; antes de confiar en sus conclusiones, validar si sus hallazgos siguen vigentes en el codebase/runtime actual.
- Si el trabajo nace de una task del sistema (`TASK-###` nueva o `CODEX_TASK_*` legacy), revisar obligatoriamente la arquitectura antes de implementar:
  - minimo: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - ademas: toda arquitectura especializada que aplique al task, por ejemplo identidad, finance, service modules o multitenancy
- **Source of truth canonico**:
  - si hay conflicto entre la task, la arquitectura vigente y el runtime/codigo/schema real, prevalece arquitectura + runtime real
  - si la spec/task esta desactualizada y el drift cambia contrato o bloquea implementacion, corregir primero la task/spec antes de escribir codigo
  - si el drift no bloquea, documentarlo explicitamente en el handoff/plan y seguir con la implementacion alineada al estado real del repo
- **Regla de proporcionalidad**:
  - tasks pequenas/locales pueden hacer discovery, audit y plan de forma breve
  - tasks cross-domain, shared runtime, migraciones, access model, observabilidad o UI visible deben aplicar el protocolo completo con mayor rigor
  - cambios sensibles en finance, payroll, auth, billing, cloud, data o produccion deben tratarse como de alto rigor aunque el diff parezca pequeno
- **Regla anti-parche**:
  - por defecto, resolver causa raiz y reforzar el contrato canonico, no solo apagar el sintoma local
  - si el fix correcto vive en una primitive compartida, schema, worker, env, secret, docs o arquitectura, actuar ahi en vez de parchear el caller visible
  - un workaround solo es aceptable como mitigacion temporal: reversible, documentado, con owner, condicion de retiro y task/issue asociada cuando aplique
  - fuente canonica: `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- Si el trabajo toca permisos, navegacion, Home, menu, guards, surfaces por rol o diseño de nuevas capacidades:
  - revisar `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - revisar `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
  - pensar y documentar la solucion sobre **ambos planos** del portal:
    - `views` / `authorizedViews` / `view_code` como surface visible y proyeccion de UI
    - `entitlements` / `capabilities` / `module + capability + action + scope` como autorizacion fina y direccion canonica
  - no diseñar arquitectura o tasks nuevas asumiendo que `views` son la unica capa de acceso; tampoco saltarse las `views` cuando la feature requiere surface visible, menu, tabs, page guards o entrypoints
  - `routeGroups` siguen resolviendo acceso broad y navegacion; `startup policy` sigue siendo un contrato separado de permisos
- Si el trabajo toca el calendario operativo de Payroll, revisar `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `src/lib/calendar/operational-calendar.ts` y `src/lib/calendar/nager-date-holidays.ts`; la timezone canónica es IANA (`America/Santiago`) y los feriados nacionales se hidratan desde `Nager.Date` con overrides locales persistidos.
- Si el cambio toca modelado de datos, sync, fuentes externas, PostgreSQL o BigQuery:
  - revisar `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - revisar `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`
- Si el cambio toca pipelines externos, notificaciones, sync con Notion/HubSpot/Frame.io/Teams o dependencias multi-repo:
  - revisar `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- Si el cambio toca lanzamiento de una capacidad visible, promocion `alpha/beta/stable`, disponibilidad por tenant/cohort o comunicacion client-facing:
  - revisar `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`
  - revisar `docs/changelog/CLIENT_CHANGELOG.md`
- Si el cambio toca webhooks, event delivery, callbacks o integraciones near-real-time:
  - revisar `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- Si el cambio toca PostgreSQL, Cloud SQL, backfills, source sync o migraciones runtime:
  - revisar `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - revisar `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - correr `pnpm pg:doctor` antes de asumir que el acceso esta sano
- Si una task del sistema contradice la arquitectura vigente, no implementarla tal cual; corregir primero la task o documentar la nueva decision arquitectonica.
- Si una task cambia un contrato arquitectonico compartido, revisar `docs/architecture/DECISIONS_INDEX.md` y aplicar `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` antes de escribir codigo. La decision puede vivir embebida en una spec `GREENHOUSE_*_V1.md` o como doc dedicado en `docs/architecture/`, pero debe quedar indexada.
- Si el cambio es UI, UX o seleccion de componentes, usar como criterio operativo los skills locales vigentes (`greenhouse-agent`, `greenhouse-portal-ui-implementer`, `greenhouse-ui-orchestrator` o `greenhouse-vuexy-ui-expert`), revisar `full-version` junto con la documentacion oficial de Vuexy antes de inventar componentes nuevos y leer `DESIGN.md` en raiz como contrato visual legible por agentes.
- Si el cambio toca copy visible al usuario:
  - invocar la skill de UX writing/content aplicable antes de fijar tono o wording final
  - usar `src/lib/copy/` para microcopy funcional shared (`actions`, `states`, `loading`, `empty`, `aria`, `errors`, `feedback`, `time`) y para copy reutilizable por dominio (`src/lib/copy/<domain>.ts`, por ejemplo `agency.ts`, `finance.ts`, `payroll.ts`)
  - usar `src/config/greenhouse-nomenclature.ts` solo para nomenclatura estable de producto, navegacion, shell y labels institucionales
  - mantener JSX/componentes libres de strings reutilizables; un literal inline solo es aceptable si es texto unico, no compartido, no de estado/CTA/error/empty/aria y queda justificado por bajo reuse
  - no promover pantallas desde `/mockup/` a runtime sin extraer primero el shell runtime y migrar el copy productivo a la capa canonica
- Si el usuario pide un mockup/prototipo visual de Greenhouse, invocar `greenhouse-mockup-builder`: por defecto el mockup debe construirse como ruta real del portal con mock data tipada (`src/app/(dashboard)/.../mockup/page.tsx` + `src/views/greenhouse/.../mockup/*`), usando Vuexy/MUI wrappers y primitives del repo. No crear HTML/CSS aparte salvo que el usuario pida explicitamente un artefacto estatico fuera de la app.
- **Regla de reutilizacion**:
  - reutilizar helpers, readers, components, routes, signals y primitives existentes antes de crear nuevos
  - no inventar access paths paralelos si ya existe un path canonico del repo para ese dominio
- **Skills y subagentes**:
  - cuando el trabajo matchee un skill disponible del entorno, usarlo antes de escribir en ese dominio
  - usar el conjunto minimo de skills que cubra el trabajo; no cargarlos por reflejo
  - usar subagentes solo cuando haya trabajo independiente, no bloqueante y con ownership claro de archivos o preguntas
  - no delegar a subagentes el paso critico inmediato del que depende la siguiente accion local
- Si el cambio crea o modifica skills locales para agentes:
  - skills de Codex viven en `.codex/skills/<skill-name>/SKILL.md`
  - skills de Claude viven en `.claude/skills/<skill-name>/SKILL.md` (mayuscula — convencion oficial vigente de Claude/Agent Skills)
  - los archivos Claude legacy en `.claude/skills/*/skill.md` se preservan solo como compatibilidad historica; no usarlos como patron para skills nuevas
  - antes de crear una skill nueva, revisar primero ejemplos locales existentes en `.codex/skills/*` o `.claude/skills/*`
- Si el cambio afecta como funciona un modulo desde la perspectiva del usuario, verificar si existe documentacion funcional en `docs/documentation/` para el dominio afectado y actualizarla.
- Si el cambio agrega o modifica una capacidad visible que el usuario debe saber operar paso a paso, actualizar o crear un manual en `docs/manual-de-uso/` con la categoria del dominio correspondiente. Los manuales no reemplazan arquitectura ni documentacion funcional: explican como usar la feature, que permisos requiere, que no hacer y como resolver problemas comunes.
- Aplicar `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` para documentar con una fuente canonica y deltas cortos en los documentos vivos.
- Revisar `git status` y no asumir que el arbol esta limpio.
- Confirmar si el cambio toca layout global, navegacion, autenticacion, tema o deploy. Si toca alguno, documentarlo en `Handoff.md`.

### 2. Limites de trabajo

- Un agente debe trabajar un objetivo claro por vez.
- No mezclar cambios de producto, infraestructura y refactor en un mismo lote sin necesidad real.
- Si el cambio es exploratorio o incompleto, no dejarlo a medias sin actualizar `Handoff.md`.

### 3. Coordinacion entre agentes

- El agente que toma una tarea debe dejar constancia breve en `Handoff.md` antes de cerrar su turno si:
  - modifico archivos de alto impacto
  - dejo deuda tecnica abierta
  - detecto una decision pendiente del usuario
  - cambio supuestos del proyecto
- Si dos agentes pueden tocar la misma zona, prevalece el ultimo handoff documentado, no la memoria conversacional.
- Si otro agente ya esta trabajando en el workspace actual y hace falta otra rama, **no cambiar la rama de ese checkout**; abrir un `git worktree` aislado. Fuente canonica: `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`.
- Cuando tomes un worktree pre-existente, NO correr `pnpm install` a ciegas. Verificar primero lockfile md5 vs `main`; reutilizar `node_modules`, y symlinkear `.env.local` / `.vercel/` si no existen. Detalle: [Higiene de worktree preexistente](docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md#higiene-de-worktree-preexistente).
- Cuando dos PRs vayan a `develop` en paralelo, usar `git rebase --onto origin/develop <other-agent-commit>` para separar scope y `git push --force-with-lease` (nunca `--force` solo). Detalle: [Patrones de integración multi-agente](docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md#patrones-de-integración-multi-agente).
- Si tu PR falla CI por un test que no tocaste, **no hacer admin override**. Triage: correr `pnpm test:coverage` local y revisar los últimos runs de `develop`. Si el flake es heredado, abrir `ISSUE-###` + PR separada de fix → merge → rebase tu PR original. Detalle: [CI como gate compartido](docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md#ci-como-gate-compartido).
- Merge a `develop` es siempre **squash merge + delete branch**. `develop` no tiene branch protection, entonces `gh pr merge --auto` no funciona — usar background watcher (`until CI completed; gh pr merge --squash --delete-branch`). Detalle: [Merge policy canónica](docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md#merge-policy-canónica).

### 4. Regla de cambios minimos

- Preferir cambios pequenos, verificables y reversibles.
- Si un archivo base de Vuexy requiere cambios amplios, separar primero la adaptacion funcional y despues el cleanup.
- Evitar renombrar masivamente archivos o mover carpetas sin una razon fuerte.
- Los componentes UI compartidos de Greenhouse deben vivir en `src/components/greenhouse/*`.
- Las rutas y modulos deben reutilizar esa capa y dejar en `src/views/greenhouse/*` solo la composicion o piezas especificas del modulo.

### 5. Regla de verificacion

- Todo cambio debe intentar validar al menos una de estas rutas:
  - `pnpm build`
  - `pnpm lint` (ESLint 9 flat config; configuracion canonica en `eslint.config.mjs`)
  - `pnpm test`
  - prueba manual local o en preview de Vercel
- **Contrato Playwright smoke**: en `tests/e2e/smoke/*.spec.ts` no usar `page.goto(...)` directo. Toda navegacion debe pasar por `gotoWithTransientRetries()` o `gotoAuthenticated()` desde `tests/e2e/fixtures/auth.ts`. La regresion `scripts/lib/e2e-smoke-navigation-contract.test.ts` debe quedar verde y bloquea reintroducir navegacion cruda. HTTP `4xx/5xx`, redirects indebidos a login y asserts funcionales siguen fallando loud; no subir timeouts ad hoc por spec como parche.
- Baseline vigente de unit tests:
  - `Vitest` es el framework canonico para tests unitarios del repo.
  - Para tests de componentes React, usar `Vitest + Testing Library + jsdom`, no introducir otro runner sin una razon fuerte.
  - El helper canonico de render para UI es `src/test/render.tsx`.
  - Priorizar tests unitarios en logica de dominio (`src/lib/**`) y componentes UI compartidos antes de sumar suites mas pesadas.
- Si no se pudo validar, registrar exactamente que no se valido y por que en `Handoff.md`.
- **Regla de cierre**:
  - no declarar una task/cambio como cerrado sin dejar explicito que cambio, que se reutilizo, que se valido, que no se pudo validar, riesgos/follow-ups y que docs se actualizaron
  - si la implementacion termino pero el `Lifecycle`, la carpeta de la task y la documentacion viva no quedaron sincronizados, el trabajo no debe presentarse como realmente cerrado

### 6. Regla de despliegue

- El proyecto debe conservar configuracion compatible con Vercel.
- `Framework Preset` en Vercel debe ser `Next.js`.
- No depender de configuraciones manuales opacas en Vercel si el repo puede expresar el comportamiento.
- Si un cambio altera rutas raiz, redirects, `basePath` o variables de entorno, documentarlo en `project_context.md` y `Handoff.md`.

### 7. Regla de documentacion viva

- Actualizar `changelog.md` cuando haya un cambio real en comportamiento, estructura, flujo de trabajo o despliegue.
- Actualizar `docs/changelog/CLIENT_CHANGELOG.md` cuando cambie una capacidad visible para usuarios/clientes o cuando una feature/modulo cambie de canal o disponibilidad.
- Actualizar `project_context.md` cuando cambie arquitectura, stack, rutas clave, decisiones o restricciones.
- Actualizar `docs/documentation/` cuando cambie comportamiento funcional de un modulo. Cada dominio tiene su subcarpeta (identity, finance, hr, etc.). Si un documento del dominio afectado existe, actualizarlo. Si no existe y el cambio es significativo, crearlo. El indice vive en `docs/documentation/README.md`.
- Actualizar `docs/manual-de-uso/` cuando una capacidad visible requiera instrucciones de uso practico. Cada dominio tiene su subcarpeta (finance, identity, hr, etc.). Si existe un manual de la capacidad, actualizarlo; si no existe y el flujo tiene pasos, permisos, estados, riesgos o troubleshooting, crearlo. El indice vive en `docs/manual-de-uso/README.md`.
- Actualizar `docs/audits/` cuando se produzca una auditoria tecnica/operativa reusable, especialmente si descubre riesgos sistemicos, contratos frágiles o decisiones de priorizacion cross-domain. Las auditorias no reemplazan arquitectura ni tasks: documentan el estado observado en una fecha.
- No usar estos documentos como dumping ground. Deben quedar legibles.
- Usar `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` para evitar duplicacion: una fuente canonica por tema y deltas breves en el resto.
- La politica canonica de release channels y changelog client-facing vive en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- La convencion canonica de Git tags para releases (`platform/`, `<module>/`, `api/<slug>/`) vive en ese mismo documento; no improvisar tags globales ambiguos como `v1.1.0` para el portal completo.
- Tres capas de documentacion, cada una con su proposito:
  - `docs/architecture/` — contratos tecnicos para agentes y desarrolladores (schemas, APIs, decisiones de diseno)
  - `docs/architecture/DECISIONS_INDEX.md` — indice maestro de ADRs y decisiones aceptadas; no duplica specs, enlaza el contrato canonico.
  - `docs/documentation/` — explicaciones funcionales en lenguaje simple (roles, flujos, reglas de negocio). Cada documento enlaza a su spec tecnica
  - `docs/manual-de-uso/` — guias operativas paso a paso para usuarios del portal (como usar, permisos, cuidados, troubleshooting)
  - `docs/audits/` — auditorias tecnicas y operativas reutilizables, fechadas y acotadas por scope. Se consumen frecuentemente como contexto para decisiones, pero siempre deben revalidarse contra el estado actual antes de tratarlas como vigentes.
  - `docs/operations/` — modelos operativos del repo y del equipo (documentacion, GitHub Project, release channels)
- Las skills locales tambien tienen contrato documental:
  - `AGENTS.md` y `CLAUDE.md` dejan la regla operativa corta
  - `project_context.md` registra skills nuevas que cambian el contrato multi-agente
  - `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` guarda la convención canónica para crear skills de Codex y Claude
- Regla operativa adicional para agentes:
  - cuando un agente redacte una task, un plan o una propuesta de arquitectura que toque acceso, debe explicitar si el cambio vive en `views`, en `entitlements`, o en ambos
  - la ausencia de esa distincion debe tratarse como señal de diseño incompleto

### 8. Regla de line endings

- El repositorio debe versionar archivos de texto con finales de linea `LF`.
- Mantener `.gitattributes` como fuente de verdad para la politica de `EOL`.
- No forzar conversiones masivas a `CRLF`.
- Si reaparecen warnings de `LF/CRLF`, revisar primero `.gitattributes` y la configuracion local de `core.autocrlf`.

## Convenciones de Trabajo

### Branching y commits

- `main` es solo para codigo listo para produccion.
- `develop` debe funcionar como rama de integracion y rama asociada a `Staging` en Vercel.
- Todo trabajo de agentes debe salir desde rama propia salvo cambios minimos de emergencia.
- Si varios agentes trabajan en paralelo, cada uno debe usar rama propia y, cuando compartan máquina/workspace físico, worktree propio para no alterar el branch visible del otro agente.
- Formato recomendado de ramas:
  - `feature/<owner>-<tema>`
  - `fix/<owner>-<tema>`
  - `hotfix/<owner>-<tema>`
  - `docs/<owner>-<tema>`
- Evitar trabajar directo sobre `main`.
- Evitar trabajar directo sobre `develop` salvo integracion, resolucion de conflictos o consolidacion final.
- No hacer `commit` ni `push` hasta tener evidencia razonable de que el cambio esta sano.
- No ejecutar en paralelo comandos Git que muten estado del repo, por ejemplo `git add`, `git commit`, `git merge` o `git push`.
- Validacion minima esperada antes de `commit` o `push`:
  - `npx pnpm build`, o
  - `npx pnpm lint`, o
  - validacion manual suficiente cuando el cambio no rompa build pero afecte UI o deploy
- Si no se pudo validar, no hacer `push` como si el cambio estuviera cerrado. Dejarlo explicitado en `Handoff.md`.

### Git hooks canonicos (Husky + lint-staged) — autoenforcement local

Desde 2026-05-05 el repo tiene 2 git hooks instalados que se activan automaticamente al `pnpm install` (via `"prepare": "husky"` script). Cualquier agente (Claude Code, Codex, Cursor, futuro) que clone el repo los hereda sin configuracion adicional.

| Hook | Que corre | Que bloquea | Latencia |
| --- | --- | --- | --- |
| **`.husky/pre-commit`** | `pnpm exec lint-staged` → `eslint --fix --cache` sobre archivos staged | Errores no auto-fixable | < 5s |
| **`.husky/pre-push`** | `pnpm lint` (full repo) + `pnpm exec tsc --noEmit` | Cualquier 1+ error de lint o tsc | < 90s |

**Reglas duras** (multi-agente):

- **NUNCA** ejecutar `git commit --no-verify` o `git push --no-verify` sin autorizacion explicita del usuario. Bypassear los hooks rompe el contrato con el CI gate y deja errores que otro agente tiene que limpiar despues. Ese antipattern (revert+repush ciclos) es justamente lo que los hooks previenen.
- **NUNCA** desinstalar / deshabilitar / mover los hooks sin discutir antes con el usuario. Los hooks son infra compartida; ajustarlos sin autorizacion afecta a todos los agentes futuros.
- Si un hook falla por causa ajena a tu cambio (e.g. un warning preexistente que escalo a error porque otro agente flipeo una rule), arreglalo solo si la regla esta en `error`. Warnings no bloquean. Si error preexistente bloquea, documenta en commit message + abre issue/task para el cleanup separado.
- Si necesitas saltar el hook por emergencia documentada (e.g. hotfix de produccion bloqueante, deploy time-critical), pide autorizacion al usuario primero, documenta el bypass en el commit message con razon + fecha + task de cleanup posterior.
- Los hooks NO reemplazan el CI gate. CI sigue siendo la ultima linea de defensa. La idea es que CI casi nunca falle porque los hooks ya filtraron el 99% de los errores antes del push.

**Si el hook ejecuta lento o tiene falsos positivos**:

- ESLint cache local en `node_modules/.cache/eslint-staged` reduce latencia del pre-commit a < 5s. Si el cache se corrompe, `rm -rf node_modules/.cache/eslint-staged` lo regenera.
- Si pre-push tarda > 2 min consistentemente, abrir issue. El target es < 90s.
- NUNCA loopear con bypass — eso solo posterga el problema y rompe el contrato con el equipo.

Documentacion canonica:

- Spec arquitectura: `docs/architecture/GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md`
- Doc funcional (lenguaje simple): `docs/documentation/plataforma/git-hooks-pre-commit-pre-push.md`
- Configuracion: `package.json` (`"lint-staged"` block + `"prepare"` script), `.husky/pre-commit`, `.husky/pre-push`
- Mensajes de commit:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `docs: ...`
  - `chore: ...`

### Flujo por ramas

- `feature/*` y `fix/*`:
  - sirven para trabajo aislado por agente
  - cada push debe generar Preview Deployment en Vercel
  - no deben considerarse aptas para produccion por defecto
- `develop`:
  - integra trabajo ya validado en preview individual
  - es la rama de prueba compartida del proyecto
  - debe mapear al `Custom Environment` `Staging` en Vercel
  - debe mantenerse funcional y demostrable
- `main`:
  - refleja el estado productivo
  - solo recibe cambios validados previamente en `develop` o hotfixes justificados
- `hotfix/*`:
  - salen desde `main`
  - corrigen produccion
  - deben validarse en preview antes de volver a `main`
  - despues de cerrar el hotfix, sincronizar tambien con `develop`

### Regla de merge

- No mergear una rama si no esta claro:
  - que problema resuelve
  - como se valido
  - que riesgo introduce
- Antes de mergear a `develop`:
  - validar build o lint
  - revisar preview deployment de la rama si el cambio afecta UI o rutas
- Antes de mergear a `main`:
  - el cambio ya debio haber pasado por `develop`, salvo hotfix
  - revisar preview o entorno de prueba compartido
  - confirmar que no hay pendientes abiertos en `Handoff.md` para esa zona
  - verificar conflictos con: `git merge --no-commit --no-ff origin/main` (luego `git merge --abort` si solo es verificacion). **No usar** `git merge-tree | grep CONFLICT` — produce falsos positivos con sentencias SQL `ON CONFLICT` del codebase (ver ISSUE-011)

### Ambientes y Vercel

- `Production` en Vercel debe estar asociado a `main`.
- `Staging` en Vercel debe ser un `Custom Environment` asociado a `develop`.
- `Preview` en Vercel debe usarse para:
  - ramas `feature/*`
  - ramas `fix/*`
  - ramas `hotfix/*` antes de promocion
- Si se define un dominio de staging, debe apuntar al `Custom Environment` de `develop`, no a ramas personales.
- No usar Production como entorno de prueba manual.

### Protocolo canonico de Preview

- Regla base: `Preview` debe considerarse **el entorno compartido y genérico para cualquier rama que no sea `develop` ni `main`**.
- Interpretación operativa:
  - `develop` valida en `Staging`
  - `main` valida en `Production`
  - toda rama `feature/*`, `fix/*`, `hotfix/*`, `docs/*` o equivalente valida en `Preview`
- Consecuencia obligatoria: una branch nueva debe poder desplegar en `Preview` **sin depender** de que antes exista `Preview (develop)` o `Preview (<otra-rama>)`.
- Las variables críticas de runtime para ramas de trabajo deben existir como baseline de `Preview` genérico, no solo como override por branch.
- Los overrides `Preview (<branch>)` quedan permitidos solo como excepción temporal cuando:
  - una rama necesita un valor distinto al baseline compartido
  - el caso está documentado en `Handoff.md` y, si aplica, en un issue o task
  - existe plan explícito de limpieza al cerrar la rama
- Regla dura: no usar `Preview (develop)` como source of truth de secrets para el resto de las ramas. Si una variable es necesaria para una preview nueva, debe promoverse a `Preview` genérico.
- Antes de dar por sano un cambio que dependa de variables nuevas, verificar el baseline efectivo con una branch cualquiera, no solo con `develop`.
- Smoke check canónico de baseline:
  - `vercel env pull --environment preview --git-branch <branch-cualquiera>`
  - confirmar que el set mínimo requerido aparece sin depender de overrides históricos
- Familias de variables que no deben quedar solo en overrides por branch cuando afectan el runtime base de previews:
  - auth (`NEXTAUTH_*`, `GOOGLE_CLIENT_*`, `AZURE_AD_*`)
  - acceso GCP (`GCP_*`, credenciales o WIF equivalente)
  - PostgreSQL (`GREENHOUSE_POSTGRES_*`)
  - acceso headless/agentes (`AGENT_AUTH_*`)
  - correo, webhooks o cron si el flujo requiere esas capacidades en previews
- Si aparece una preview roja en una rama nueva pero `develop` sigue sano, asumir primero drift de env por overrides de branch antes de culpar al diff.

### Vercel Deployment Protection (SSO)

- El proyecto tiene **Vercel Authentication (SSO)** habilitada con `deploymentType: "all_except_custom_domains"`.
- Esto significa que **todos los deployments** (preview, staging, `.vercel.app`) requieren autenticación SSO de Vercel, **excepto** custom domains de Production (`greenhouse.efeoncepro.com`).
- **El custom domain de staging** (`dev-greenhouse.efeoncepro.com`) **SÍ recibe protección SSO** — no es una excepción. La excepción es solo para custom domains de Production.
- **Para acceder programáticamente** a staging o preview (agentes, Playwright, curl), se debe usar:
  - La URL `.vercel.app` del deployment (no el custom domain)
  - Header `x-vercel-protection-bypass` con el secret del sistema
- **El secret de bypass** es gestionado automáticamente por Vercel como variable de entorno `VERCEL_AUTOMATION_BYPASS_SECRET`. Está en el objeto `protectionBypass` del proyecto con `scope: "automation-bypass"` e `isEnvVar: true`.
- **REGLA CRÍTICA: NUNCA crear manualmente** una variable `VERCEL_AUTOMATION_BYPASS_SECRET` en Vercel. La variable del sistema es auto-gestionada. Si se crea manualmente con un valor distinto, **sombrea** el valor real del sistema y rompe el bypass silenciosamente.
- Si el bypass no funciona, verificar:
  1. Que NO exista una variable manual `VERCEL_AUTOMATION_BYPASS_SECRET` que sombree la del sistema
  2. Que se está usando la URL `.vercel.app`, no el custom domain
  3. Que el header es `x-vercel-protection-bypass` (no `x-vercel-bypass` ni otro nombre)
- Ejemplo de request con bypass:
  ```bash
  curl -s -X POST "https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app/api/auth/agent-session" \
    -H "Content-Type: application/json" \
    -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
    -d '{"secret": "<AGENT_AUTH_SECRET>", "email": "agent@greenhouse.efeonce.org"}'
  ```
- URLs de staging:
  - Custom domain (protegido por SSO, no usar para agentes): `dev-greenhouse.efeoncepro.com`
  - Vercel app (usar con bypass header): `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`

### Proyecto Vercel único

- El proyecto canónico es `greenhouse-eo` (id: `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`) dentro del team `efeonce-7670142f`.
- **NUNCA** debe existir un segundo proyecto Vercel vinculado al mismo repositorio GitHub. Si GitHub reporta failures constantes en deploys, verificar en `vercel.com` que no exista un proyecto duplicado en un scope personal u otro team.
- **Incidente real (2026-04-05):** existía un proyecto duplicado en scope personal (`julioreyes-4376's projects`, id `prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8`) con 0 variables de entorno y sin framework — cada push disparaba builds en ambos proyectos, el duplicado siempre fallaba.

### Variables por ambiente

- Separar variables en Vercel por entorno:
  - `Development`: trabajo local
  - `Preview`: feature branches, fix branches y hotfix
  - `Staging`: branch `develop`
  - `Production`: solo main
- No crear una variable solo en Production si el cambio necesita validacion previa en Preview o Staging.
- No dejar variables críticas solo en `Preview (develop)` o `Preview (<branch>)` si el comportamiento esperado debe existir para cualquier rama de trabajo.
- Regla de provisioning:
  - `Preview` genérico es el baseline para ramas no `develop`/`main`
  - `Staging` es el baseline de `develop`
  - `Production` es el baseline de `main`
  - los overrides por branch son aditivos o excepcionales, no la fuente primaria del contrato
- Toda variable nueva debe indicar:
  - nombre
  - proposito
  - en que entornos debe existir
  - valor esperado o formato

### Regla de promocion

- El camino normal es:
  - rama de trabajo
  - Preview Deployment
  - merge a `develop`
  - validacion compartida en `Staging`
  - merge a `main`
  - deploy a Production
- Si un cambio no paso por ese camino, debe existir razon explicita en `Handoff.md`.
- Regla complementaria:
  - `Preview` suele corresponder a `alpha`
  - `Staging/develop` suele corresponder a `beta`
  - `Production/main` es el unico lugar donde una capacidad puede declararse `stable`
  - Greenhouse comunica releases principalmente por modulo o feature visible, no solo por plataforma completa

### Archivos sensibles

- Tratar con cuidado:
  - `next.config.ts`
  - `package.json`
  - `pnpm-lock.yaml`
  - `src/app/layout.tsx`
  - `src/app/(dashboard)/layout.tsx`
  - `src/components/greenhouse/**`
  - `src/components/layout/**`
  - `src/configs/**`
- Si alguno cambia, dejar nota en `Handoff.md`.

### Variables de entorno

- No introducir variables nuevas sin documentarlas en `project_context.md`.
- Mantener `.env.example` alineado con cualquier variable requerida por el proyecto.
- No asumir que Vercel tiene variables cargadas.

### Secret Manager y payload hygiene

- Todo secreto publicado en GCP Secret Manager para consumo runtime debe ser un scalar crudo:
  - sin comillas envolventes
  - sin sufijos literales `\n` o `\r`
  - sin whitespace residual al inicio o al final
- Patrón recomendado de publicación/rotación:
  ```bash
  printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-
  ```
- Nunca hacer `JSON.stringify`, copiar el valor entre comillas ni pegar bloques multilínea cuando el consumer espera un token/password simple.
- Si un secreto usa el patrón `*_SECRET_REF`, la verificación no termina al publicarlo:
  - confirmar que el payload quedó limpio en Secret Manager
  - confirmar que el consumer real se recuperó en el ambiente afectado
- Casos críticos:
  - rotar `NEXTAUTH_SECRET` puede invalidar sesiones activas y forzar re-login
  - rotar secretos de webhook obliga a reprobar firma/HMAC del consumer
  - rotar passwords PostgreSQL obliga a reprobar `pnpm pg:doctor` o una conexión real
- Si un secreto mal publicado rompe runtime, auth o integraciones, documentarlo como `ISSUE-###` aunque también exista fix defensivo en código.

### Agent Auth (acceso headless para agentes y E2E)

- Endpoint: `POST /api/auth/agent-session` — genera un JWT NextAuth válido sin pasar por login interactivo.
- Requiere `AGENT_AUTH_SECRET` en `.env.local`. Sin esa variable, el endpoint devuelve 404.
- **Bloqueado en production** por defecto (`VERCEL_ENV === 'production'` → 403), salvo `AGENT_AUTH_ALLOW_PRODUCTION=true`.
- El caller envía `{ secret, email }` y recibe `{ cookieName, cookieValue, portalHomePath }` para montar la cookie de sesión.
- El email debe existir como usuario activo en la tabla de acceso de tenants; no crea usuarios.
- **Usuario dedicado de agente**: `agent@greenhouse.efeonce.org` (user_id: `user-agent-e2e-001`, roles: `efeonce_admin` + `collaborator`). Provisionado via migración `20260405151705425_provision-agent-e2e-user.sql`. Password: `Gh-Agent-2026!`.
- Script de setup: `node scripts/playwright-auth-setup.mjs` — genera `.auth/storageState.json` con la cookie lista para Playwright.
- Dos modos:
  - **API** (default): llama al endpoint, no necesita browser (`AGENT_AUTH_SECRET` + `AGENT_AUTH_EMAIL`).
  - **Credentials**: abre Playwright y llena el formulario de login (`AGENT_AUTH_MODE=credentials` + `AGENT_AUTH_EMAIL` + `AGENT_AUTH_PASSWORD`).
- `.auth/` está en `.gitignore` — nunca commitear storageState.
- Variables:
  - `AGENT_AUTH_SECRET` — secret compartido (generar con `openssl rand -hex 32`)
  - `AGENT_AUTH_EMAIL` — email del usuario a autenticar (default: `agent@greenhouse.efeonce.org`)
  - `AGENT_AUTH_PASSWORD` — password del usuario agente: `Gh-Agent-2026!` (solo modo credentials)
  - `AGENT_AUTH_ALLOW_PRODUCTION` — `true` solo si se necesita en prod (no recomendado)
- Fuente canónica: `src/app/api/auth/agent-session/route.ts`
- Spec técnica: `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (sección Agent Auth)

### Staging requests programáticas (agentes y CI)

- Staging tiene **Vercel SSO Protection** activa — todo request sin bypass es redirigido a la SSO wall de Vercel.
- **Comando canónico**: `pnpm staging:request <path>` — maneja bypass + auth + request en un solo paso.
- Ejemplos:

  ```bash
  # GET simple
  pnpm staging:request /api/agency/operations

  # GET con búsqueda
  pnpm staging:request /api/agency/operations --grep reactive

  # POST con body
  pnpm staging:request POST /api/some/endpoint '{"key":"value"}'

  # Pretty-print
  pnpm staging:request /api/agency/operations --pretty
  ```

- El script `scripts/staging-request.mjs`:
  1. Lee `VERCEL_AUTOMATION_BYPASS_SECRET` de `.env.local`
  2. Si no existe, lo auto-fetch desde la Vercel API (requiere `vercel login` previo)
  3. Autentica como agente vía `/api/auth/agent-session` con bypass header
  4. Ejecuta el request real con bypass header + cookie de sesión
  5. Persiste el bypass secret en `.env.local` para future runs
- **NUNCA** intentar hacer `curl` directo a la URL `.vercel.app` de staging sin bypass header — siempre devuelve HTML de Vercel SSO.
- **NUNCA** crear `VERCEL_AUTOMATION_BYPASS_SECRET` manualmente en el dashboard de Vercel — la variable es auto-gestionada por el sistema.
- Si el bypass secret se vuelve stale, borrar `VERCEL_AUTOMATION_BYPASS_SECRET` de `.env.local` y correr el script de nuevo — auto-refetch.
- Fuente: `scripts/staging-request.mjs`

### Teams Bot outbound smoke y mensajes manuales (2026-04-28)

- Greenhouse/Nexa envía mensajes proactivos a Teams vía **Bot Framework Connector**, no vía Microsoft Graph como canal principal de delivery.
- Secreto runtime: `greenhouse-teams-bot-client-credentials` en GCP Secret Manager, con JSON `{ "clientId": "...", "clientSecret": "...", "tenantId": "..." }`. Nunca imprimir `clientSecret`, access tokens ni payloads completos con secretos.
- Token OAuth:
  - endpoint `https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token`
  - scope `https://api.botframework.com/.default`
- Delivery canónico:
  - Resolver primero el `chatId`/conversation id exacto (`teams_notification_channels.recipient_chat_id`, cache de conversation reference o Teams connector `_resolve_chat`).
  - Enviar `POST {serviceUrl}/v3/conversations/{encodeURIComponent(chatId)}/activities`.
  - Probar service URLs con failover regional: `https://smba.trafficmanager.net/teams`, `/amer`, `/emea`, `/apac`.
- Group chats y menciones tipo `@todos`:
  - Usar activity `type: "message"`, `textFormat: "xml"`, texto con `<at>todos</at>` y `entities: [{ type: "mention", text: "<at>todos</at>", mentioned: { id: <chatId>, name: "todos" } }]`.
  - El transcript vía Graph puede normalizar la mención como `todos` o `[Greenhouse]: ...`; validar visualmente en Teams cuando la semántica de notificación sea crítica.
- Chats individuales:
  - Si el usuario indica que Greenhouse ya fue agregado al chat individual, **no crear 1:1 a ciegas con AAD Object ID**. Resolver el chat `oneOnOne` existente y publicar sobre su `chatId`.
  - Crear conversación Bot Framework con `members: [{ id: "29:<aadObjectId>" }]` puede fallar con `403 Failed to decrypt pairwise id`; tratarlo como ruta/conversation reference incorrecta o instalación incompleta, no como prueba de que el usuario no existe.
  - En 1:1 no hace falta mencionar al usuario; Teams notifica al participante del chat.
- Para smoke scripts locales que importen libs server-side, usar `npx tsx --require ./scripts/lib/server-only-shim.cjs ...` para neutralizar imports `server-only`.
- Si esto pasa a UI/producto, no implementar un textbox que postea directo a Teams. Debe converger con Notification Hub / `TASK-716`: intent/outbox, preview, aprobación si aplica, idempotencia, retries, audit, delivery status y permisos en ambos planos (`views` + `entitlements`).
- **Helper canónico ya disponible para anuncios manuales**:
  - comando: `pnpm teams:announce`
  - runbook: `docs/operations/manual-teams-announcements.md`
  - runtime: `src/lib/communications/manual-teams-announcements.ts`
  - destinos permitidos code-versioned: `src/config/manual-teams-announcements.ts`
  - reglas: usar `--dry-run` para preview, `--yes` para envío real, `--body-file` con párrafos separados por línea en blanco, CTA `https` obligatorio
  - para futuras solicitudes de "envía este mensaje por Greenhouse TeamBot", preferir este helper antes de improvisar scripts ad hoc o usar el conector personal de Teams
- Chats operativos ya verificados:
  - `EO Team` group chat: `19:1e085e8a02d24cc7a0244490e5d00fb0@thread.v2`.
  - `Sky - Efeonce | Shared` group chat: `19:bf42622ef7b44d139cd4659e8aa22e81@thread.v2`.
  - Para mencionar a Valentina Hoyos en Teams, usar entity `mentioned.id = "29:f60d5730-1aab-45ec-a435-45ffe8be6f54"` y `text = "<at>Valentina Hoyos</at>"`.
- El primer anuncio client-facing en `Sky - Efeonce | Shared` fue enviado el 2026-04-28 como Nexa presentándose como AI Agent de Efeonce y comunicando a Valentina Hoyos como `Content Lead` del Piloto Sky de mayo. Activity id: `1777411344948`. Usar ese tono como referencia: amable, claro, con emojis moderados, sin sonar a boletín rígido.

### Cloud Run ops-worker (crons reactivos + materialización)

- Greenhouse tiene un servicio Cloud Run dedicado (`ops-worker`) en `us-east4` que ejecuta los crons reactivos del outbox y la materialización de cost attribution.
- 3 Cloud Scheduler jobs disparan el servicio: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15), timezone `America/Santiago`.
- Endpoint adicional: `POST /cost-attribution/materialize` — materializa `commercial_cost_attribution` + recomputa `client_economics`. Acepta `{year, month}` para single-period o vacío para bulk. Las VIEWs complejas (3 CTEs + LATERAL JOIN + exchange rates) que timeout en Vercel serverless corren aquí.
- SA: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`.
- **Si el cambio toca `src/lib/sync/`, `src/lib/operations/`, `src/lib/commercial-cost-attribution/`, proyecciones reactivas, o `services/ops-worker/`**, verificar que el build del worker sigue compilando (`cd services/ops-worker && docker build .` o revisar esbuild aliases).
- **Regla ESM/CJS para Cloud Run**: servicios que reutilicen `src/lib/` sin necesitar NextAuth deben shimear `next-auth`, sus providers y `bcryptjs` via esbuild `--alias`. El patrón canónico de shims está en `services/ops-worker/Dockerfile`.
- **Deploy canónico via GitHub Actions** (`.github/workflows/ops-worker-deploy.yml`): trigger automático en `push` a `develop` o `main` que toque `services/ops-worker/**`. Trigger manual: `gh workflow run ops-worker-deploy.yml --ref <branch>` o desde la UI de Actions. El workflow autentica con Workload Identity Federation, ejecuta `bash services/ops-worker/deploy.sh` (idempotente — upsertea Cloud Scheduler jobs y revisión Cloud Run), verifica `/health` post-deploy y registra el commit. Cualquier cambio a `services/ops-worker/server.ts`, `Dockerfile`, `deploy.sh` o un nuevo Cloud Scheduler job dispara el workflow al pushear. Confirmar el deploy con `gh run list --workflow=ops-worker-deploy.yml --limit 1` o `gh run watch <run-id>`. **Manual local (`bash services/ops-worker/deploy.sh`) solo para hotfix puntual** con `gcloud` autenticado contra `efeonce-group`; el path canónico para que el deploy quede trazable en `gh run` es el workflow.
- **Health check**: el deploy script usa `gcloud run services proxy` (no requiere SA impersonation).
- Las rutas API Vercel (`/api/cron/outbox-react`, etc.) siguen como fallback manual pero **no están scheduladas**.
- Run tracking: `source_sync_runs` con `source_system='reactive_worker'`, visible en Admin > Ops Health.
- Fuente canónica: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 y §5.
- Documentación funcional: `docs/documentation/operations/ops-worker-reactive-crons.md`

### Vercel cron classification + migration platform (TASK-775)

Toda decisión "dónde vive un cron" pasa por las **3 categorías canónicas** de `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`:

- **`async_critical`** — alimenta o consume pipeline async (outbox, projection, sync downstream) que QA/staging necesita. **Hosting canónico: Cloud Scheduler + ops-worker. NO Vercel cron.** Vercel custom env (staging) NO ejecuta crons → si vive en Vercel, queda invisible en QA y la próxima regresión "cron prod-only que rompe staging" es cuestión de tiempo.
- **`prod_only`** — side effects que solo importan en producción real (compliance, GDPR cleanup, FX externos públicos). Hosting Vercel cron OK.
- **`tooling`** — utilitarios para developers/QA/monitoreo. Hosting Vercel cron OK.

**Patrón de migración canónico** (cron nuevo o migración):

1. Lógica pura en `src/lib/<dominio>/<orchestrator>.ts` o `src/lib/cron-orchestrators/index.ts` — reusable desde Vercel route + Cloud Run.
2. Endpoint Cloud Run en `services/ops-worker/server.ts` via helper canónico `wrapCronHandler({ name, domain, run })` — centraliza `runId`, `captureWithDomain`, `redactErrorForResponse`, audit log, 502 sanitizado.
3. Cloud Scheduler job en `services/ops-worker/deploy.sh` con `upsert_scheduler_job` (idempotente).
4. Si era cron Vercel scheduled, eliminar entry de `vercel.json` (la route queda como fallback manual via curl + `CRON_SECRET`).
5. Sincronizar snapshot `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en **dos** lugares:
   - `src/lib/reliability/queries/cron-staging-drift.ts` (reader runtime)
   - `scripts/ci/vercel-cron-async-critical-gate.mjs` (CI gate)

**Defensas anti-regresión**:

- **Reliability signal `platform.cron.staging_drift`** (subsystem `Event Bus & Sync Infrastructure`): kind=`drift`, severity=`error` si count>0, steady=0. Lee `vercel.json`, matchea contra `ASYNC_CRITICAL_PATH_PATTERNS` (`outbox*`, `sync-*`, `*-publish`, `webhook-*`, `hubspot-*`, `entra-*`, `nubox-*`, `*-monitor`, `email-delivery-retry`, `reconciliation-auto-match`), verifica equivalente Cloud Scheduler, honra `KNOWN_NON_ASYNC_CRITICAL_PATHS` (`sync-previred` = prod_only legítimo) y override `// platform-cron-allowed: <reason>` adyacente al path en vercel.json.
- **CI gate `pnpm vercel-cron-gate`** (`.github/workflows/ci.yml` después de Lint, modo `--warn` durante TASK-775; promueve a strict tras estabilización). Falla CI si detecta async-critical sin equivalent.

**⚠️ Reglas duras** (cualquier agente que toque crons las respeta):

- **NUNCA** agregar a `vercel.json` un path que matchea pattern async-critical sin Cloud Scheduler equivalent. CI gate bloquea, reliability signal alerta. Si emerge un caso legítimo prod_only/tooling cuyo path matchea pattern, agregarlo a `KNOWN_NON_ASYNC_CRITICAL_PATHS` (en AMBOS readers) o usar override comment.
- **NUNCA** crear handler Cloud Run sin pasar por `wrapCronHandler`. Sin él, perdés runId estable, audit log consistente, captureWithDomain canónico, sanitización de error y 502 contract uniforme.
- **NUNCA** duplicar lógica de cron entre route Vercel y server.ts del ops-worker. Toda lógica vive en `src/lib/<...>/orchestrator.ts` y ambos endpoints la importan. Single source of truth.
- **NUNCA** sincronizar `CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS` en uno solo de los dos lugares (reader + gate). Drift entre ambos = falsos positivos en CI o falsos negativos en runtime dashboard.
- **NUNCA** modificar pattern array en uno solo de los dos lugares. Si emerge un nuevo pattern async-critical, agregarlo en AMBOS con comentario justificando la categoría.
- Cuando se cree un cron nuevo, **categorizarlo PRIMERO** según las 3 categorías canónicas, luego elegir hosting. NO al revés.

**Spec canónica**: `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (categorías + decision tree + inventario completo).
**Helper canónico**: `services/ops-worker/cron-handler-wrapper.ts` (`wrapCronHandler`).
**Reader runtime**: `src/lib/reliability/queries/cron-staging-drift.ts`.
**CI gate**: `scripts/ci/vercel-cron-async-critical-gate.mjs`.
**Orchestrators canónicos**: `src/lib/cron-orchestrators/index.ts` (11 orchestrators puros) + `src/lib/email/deliverability-monitor.ts` + `src/lib/nubox/sync-nubox-orchestrator.ts` + `src/lib/nubox/sync-nubox-balances.ts`.

### Cron rematerialize-balances seed contract (ISSUE-069, 2026-05-08)

Todo cron que invoque `rematerializeAccountBalanceRange` (o cualquier primitiva canónica con seed-row contract) DEBE calcular `seedDate = today − (lookbackDays + 1)`, NO `today − lookbackDays`.

**Por qué**: el contrato canónico de `rematerializeAccountBalanceRange` (`src/lib/finance/account-balances-rematerialize.ts:258`) NO materializa el día seed — itera desde `seedDate + 1`. El día seed se inserta como ancla muda (`period_inflows=0, period_outflows=0`) para preservar reconciliation snapshots TASK-721 + OTB anchor TASK-703.

**Bug class** (ISSUE-069): si el caller usa `seedDate = today − lookbackDays`, ese día queda como ancla muda. Cualquier `settlement_leg` / `expense_payment` / `income_payment` con `transaction_date` exactamente en ese día (típicamente registros retroactivos creados horas/días después) NO se contabiliza. La ventana del cron rota cada día → "día ciego" se mueve diariamente → bug determinístico que afecta TODAS las cuentas. Detección: reliability signal `finance.account_balances.fx_drift` (TASK-774).

**Fix canónico**: helper `computeRematerializeSeedDate(today, lookbackDays)` en `services/ops-worker/finance-rematerialize-seed.ts`. Resta 1 día adicional para que los últimos `lookbackDays` días COMPLETOS se materialicen.

**Reglas duras**:

- **NUNCA** calcular el seed inline en un nuevo handler de cron. Usar el helper canónico `computeRematerializeSeedDate`.
- **NUNCA** modificar el contrato de `rematerializeAccountBalanceRange` (seed no se materializa). Es load-bearing para reconciliation snapshots y OTB.
- **NUNCA** correr backfill manual con `--from-date` igual al día a reparar. El backfill usa `seedMode='active_otb'` que toma el OTB genesis como seed real — el `--from-date` es etiqueta documental.
- **SIEMPRE** que un nuevo cron emerja consumiendo la primitiva, agregar test de regresión que pin-ee `seed = today − (lookbackDays + 1)` con casos edge (lookback=1, 30, cross-month, cross-year).

**Diagnostic operator tool**: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/finance/diagnose-fx-drift.ts` lista detalle por (account, fecha) con drift activo. Útil ANTES de invocar el backfill.

**Spec canónica**: `docs/issues/open/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md`.

### Reliability dashboard hygiene — orphan archive, channel readiness, smoke lane bus, domain incidents (2026-04-26)

Cuatro patrones canónicos que evitan re-introducir falsos positivos o `awaiting_data` perpetuos. Cualquier cambio que toque `projection_refresh_queue`, `teams_notification_channels`, smoke lane readers o Sentry capture debe respetarlos.

**1. Orphan auto-archive en `projection_refresh_queue`**

- `markRefreshFailed` corre `ENTITY_EXISTENCE_GUARDS` antes de rutear a `dead`. Si el `entity_id` no existe en su tabla canónica → `archived=TRUE` en el mismo UPDATE, NO se cuenta en el dashboard.
- Dashboard query filtra `WHERE COALESCE(archived, FALSE) = FALSE`.
- Para sumar un nuevo entity guard: añadir entry al array `ENTITY_EXISTENCE_GUARDS` (entityType, errorMessagePattern, checkExists). Un single-row PG lookup, sólo al moment dead-routing.
- **NO** borrar rows archived — quedan para audit. Query `WHERE archived = TRUE` para ver historial.

**2. Channel `provisioning_status` en `teams_notification_channels`**

- Estados: `'ready' | 'pending_setup' | 'configured_but_failing'`. `pending_setup` = config en PG pero secret faltante en GCP Secret Manager — sends skipean silenciosamente, NO contribuyen al subsystem failure metric.
- Dashboard query Teams Notifications filtra `NOT EXISTS` por `secret_ref` matching channels en `pending_setup`.
- Workflow nuevo channel: row `pending_setup` → upload secret a Secret Manager → flip a `'ready'`. Dashboard nunca pinta warning durante setup.

**3. Smoke lane runs vía `greenhouse_sync.smoke_lane_runs` (PG-backed)**

- CI publica resultados Playwright via `pnpm sync:smoke-lane <lane-key>` (auto-resuelve `GITHUB_SHA`, `GITHUB_REF_NAME`, `GITHUB_RUN_ID`).
- Reader (`getFinanceSmokeLaneStatus`, etc.) lee última row por `lane_key` desde PG. Funciona desde Vercel runtime, Cloud Run, MCP — sin filesystem dependency.
- Lane keys canónicos: `finance.web`, `delivery.web`, `identity.api`, etc. (lowercase, dot-separated, stable).
- Nueva lane = upsertear desde CI con un nuevo `lane_key` — cero migration.

**4. Sentry incident signals via `domain` tag (per-module)**

- `captureWithDomain(err, 'finance', { extra })` (en `src/lib/observability/capture.ts`) — wrapper canónico. Reemplaza `Sentry.captureException(err)` directo donde haya dominio claro.
- `getCloudSentryIncidents(env, { domain: 'finance' })` filtra por `tags[domain]`. UN proyecto Sentry, MUCHOS tags.
- Registry: cada `ReliabilityModuleDefinition` declara `incidentDomainTag`. `getReliabilityOverview` itera y produce un `incident` signal per module.
- Nuevo módulo = añadir `incidentDomainTag: '<key>'` al registry + `captureWithDomain(err, '<key>', ...)` en su code path. Cero config Sentry-side.

**⚠️ Reglas duras**:

- **NO** borrar rows de `projection_refresh_queue` por DELETE manual. Usar el orphan guard si es residue, o `requeueRefreshItem(queueId)` si es real fallo a recuperar.
- **NO** contar failed de `source_sync_runs WHERE source_system='teams_notification'` sin excluir `pending_setup` channels.
- **NO** leer Playwright results desde filesystem en runtime (Vercel/Cloud Run no tienen el archivo). Usar `greenhouse_sync.smoke_lane_runs`.
- **NO** usar `Sentry.captureException()` directo en code paths con dominio claro — el tag `domain` no se setea y el módulo correspondiente NUNCA ve el incidente. Usar `captureWithDomain()`.

### Platform Health API Contract — preflight programático para agentes (TASK-672, 2026-04-26)

Contrato versionado `platform-health.v1`. Permite a agentes (MCP, Teams bot, CI, scripts) consultar el estado real de la plataforma con un solo request antes de actuar. Compone Reliability Control Plane + Operations Overview + runtime checks + integration readiness + synthetic monitoring + webhook delivery + posture, con timeouts per-source y degradación honesta (NUNCA 5xx por una fuente caída).

**Rutas**:

- `GET /api/admin/platform-health` — admin lane (`requireAdminTenantContext`). Payload completo con evidencia y referencias.
- `GET /api/platform/ecosystem/health` — ecosystem lane (`runEcosystemReadRoute`). Summary redactado, sin evidence detail hasta que TASK-658 cierre el bridge `platform.health.detail`.

**Composer**: `src/lib/platform-health/composer.ts`. 7 sources via `Promise.all` con `withSourceTimeout` per-source (budgets 2-6s). Cache in-process 30s per audience.

**Helpers canónicos NUEVOS**:

- `src/lib/observability/redact.ts` — `redactSensitive`, `redactObjectStrings`, `redactErrorForResponse`. Strip de JWT/Bearer/GCP secret URI/DSN/email/query secret. **USAR SIEMPRE** antes de persistir o devolver `last_error` o response body que cruce un boundary externo. NUNCA loggear `error.stack` directo.
- `src/lib/platform-health/with-source-timeout.ts` — `(produce, { source, timeoutMs }) → SourceResult<T>`. Reutilizable por TASK-657 (degraded modes) y cualquier reader que necesite timeout + fallback estructurado.
- `src/lib/platform-health/safe-modes.ts` — booleans `readSafe/writeSafe/deploySafe/backfillSafe/notifySafe/agentAutomationSafe`. Conservador: en duda → `false`.
- `src/lib/platform-health/recommended-checks.ts` — catálogo declarativo de runbooks accionables filtrados por trigger.

**Cómo lo usa un agente**:

1. Consultar `safeModes` antes de cualquier acción sensible. Respetar las banderas tal cual vienen.
2. Si `agentAutomationSafe=false`, escalar a humano antes de actuar.
3. Si una acción específica falla en runtime, reconsultar Platform Health para confirmar si el módulo afectado pasó a `blocked`.
4. NO cachear el payload más allá de 30s en el cliente. La API ya tiene cache in-process.
5. NO depender de campos no documentados. Solo `contractVersion: "platform-health.v1"` garantiza shape estable.

**⚠️ Reglas duras para AGENTES**:

- **NO** crear endpoints paralelos de health en otros módulos. Si un módulo nuevo necesita exponer salud, registrarlo en `RELIABILITY_REGISTRY` (con `incidentDomainTag` si aplica) y el composer lo recoge automáticamente.
- **NO** exponer payload sin pasar por `redactSensitive` cuando contiene strings de error o de fuente externa.
- **NO** computar safe modes ni rollup en el cliente. Consumir las banderas tal como vienen.
- **NO** agregar fuentes al composer sin envolverlas en `withSourceTimeout` — una fuente colgada sin budget colapsa el contrato entero.
- **NO** interpretar `degraded` como `healthy`. Si el contrato dice `degraded`, hay un warning real que requiere atención.

**Tests**: `pnpm test src/lib/platform-health src/lib/observability/redact` (47 tests).

**Spec**:

- Arquitectura: `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (sección Platform Health)
- Funcional (Spanish): `docs/documentation/plataforma/platform-health-api.md`
- OpenAPI: `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` (schema `PlatformHealthV1`)
- Markdown público: `docs/api/GREENHOUSE_API_PLATFORM_V1.md` + mirror `public/docs/greenhouse-api-platform-v1.md`

### Notion sync canónico — Cloud Run + Cloud Scheduler (NO usar el script manual ni reintroducir un PG-projection separado)

**Decisión arquitectónica (2026-04-26)**: el daily Notion sync es un SOLO ciclo de DOS pasos en `ops-worker` Cloud Run, schedulado por Cloud Scheduler. No hay otro path scheduled.

- **Trigger canónico**: Cloud Scheduler `ops-notion-conformed-sync @ 20 7 * * * America/Santiago` → `POST /notion-conformed/sync` en ops-worker. Definido en `services/ops-worker/deploy.sh` (idempotente).
- **Step 1 — `runNotionSyncOrchestration`**: BQ raw `notion_ops.*` → BQ conformed `greenhouse_conformed.delivery_*`. Si BQ ya está fresh, skipea con "Conformed sync already current; write skipped" — comportamiento intencional, NO bug.
- **Step 2 — `syncBqConformedToPostgres` (UNCONDICIONAL)**: BQ conformed → PG `greenhouse_delivery.*` vía `projectNotionDeliveryToPostgres`. **Corre SIEMPRE**, regardless del skip de Step 1, porque BQ puede estar fresh y PG stale (root cause del incidente abril 2026: 24 días de drift).

**⚠️ Reglas duras para AGENTES (futuras sesiones, prevent regressions)**:

- **NO mover el PG step adentro del path no-skip de Step 1**. Ya vivió ahí y dejaba PG stale 24+ días cuando BQ estaba current.
- **NO crear cron Vercel scheduled** para `/api/cron/sync-conformed`. Existe como fallback manual; el trigger automático canónico vive en Cloud Scheduler. Vercel cron es frágil para syncs largos.
- **NO depender del script manual `pnpm sync:source-runtime-projections` para escribir PG en producción**. Es solo para dev ad-hoc. El path canónico es Cloud Run.
- **NO inyectar sentinels** (`'sin nombre'`, `'⚠️ Sin título'`, etc.) en `*_name` columns. TASK-588 los prohíbe vía CHECK constraints. NULL = unknown. Para fallback de display usar `displayTaskName/Project/Sprint` de `src/lib/delivery/task-display.ts` o `<TaskNameLabel/>`/`<ProjectNameLabel/>`/`<SprintNameLabel/>`.
- **NO usar `Number(value)` directo** para BQ-formula columns que se persisten a PG INTEGER (`days_late`, `frame_versions`, etc.). BQ formulas devuelven fraccionales (`0.117…`) y PG INT crashea. Usar `toInteger()` (con `Math.trunc`) — vive en `src/lib/sync/sync-bq-conformed-to-postgres.ts`.

**Helpers canónicos (orden de uso)**:

- `runNotionSyncOrchestration({ executionSource })` — wrapper completo BQ raw → conformed.
- `syncBqConformedToPostgres({ syncRunId?, targetSpaceIds?, replaceMissingForSpaces? })` — drena BQ conformed → PG. Default: todos los spaces activos, `replaceMissingForSpaces=true`. Reusable desde admin endpoints o scripts de recovery.
- `projectNotionDeliveryToPostgres({ ... })` — primitiva más baja: per-row UPSERT por `notion_*_id`. Idempotente. Used by `syncBqConformedToPostgres`.

**Manual triggers / recovery**:

- Cloud Scheduler manual: `gcloud scheduler jobs run ops-notion-conformed-sync --location=us-east4 --project=efeonce-group`
- Admin endpoint Vercel (auth via agent session): `POST /api/admin/integrations/notion/trigger-conformed-sync` — corre los 2 steps secuencialmente.
- Vercel cron `/api/cron/sync-conformed` (CRON_SECRET) — fallback histórico, no usar como path principal.

**Kill-switch**: `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED=false` revierte el step PG dentro del path Vercel cron (`runNotionConformedCycle`) sin requerir deploy. NO afecta el endpoint Cloud Run (que es UNCONDICIONAL).

**Tenant safety (Sky no rompe Efeonce ni viceversa)**:

- `replaceMissingForSpaces` filtra `WHERE space_id = ANY(targetSpaceIds)` — nunca toca rows de spaces fuera del cycle.
- UPSERT por `notion_*_id` (PK natural Notion) es idempotente, independiente del orden.
- Cascade de title `nombre_de_tarea` / `nombre_de_la_tarea` resuelve correctamente para ambos tenants (Efeonce usa primera, Sky segunda — verificado vivo via Notion REST API + Notion MCP).

**Schema constraints**:

- BQ `delivery_*.{task_name,project_name,sprint_name}` están NULLABLE. Helper `ensureDeliveryTitleColumnsNullable` lo aplica idempotente al startup del sync.
- PG tiene CHECK constraints anti-sentinel (TASK-588 / migration `20260424082917533`). Cualquier sentinel string los rechaza.
- DB functions `greenhouse_delivery.{task,project,sprint}_display_name` (migration `20260426144105255`) producen el fallback display data-derived al READ time. Mirror exacto en TS via `src/lib/delivery/task-display.ts`.

**Admin queue**: `/admin/data-quality/notion-titles` — surface las pages con `*_name IS NULL` agrupadas por space, con CTA "Editar en Notion". Backed por `getUntitledPagesOverview`. Empty state celebra "Todo en orden".

**Spec arquitectónica completa**: `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`.

### Production Release Watchdog (TASK-848 + TASK-849, 2026-05-10)

- **Que hace**: scheduled GH Actions cron `*/30 * * * *` que detecta los 3 sintomas del incidente 2026-04-26 → 2026-05-09 (stale Production approvals, pending sin jobs, worker revision drift) y emite alertas Teams a `production-release-alerts` con dedup canonico via `greenhouse_sync.release_watchdog_alert_state`.
- **Workflow**: `.github/workflows/production-release-watchdog.yml`. Cron solo activa cuando esta en `main` (default branch). Manual dispatch: `gh workflow run production-release-watchdog.yml --ref main`.
- **CLI local canonico**: `pnpm release:watchdog [--json|--fail-on-error|--enable-teams|--dry-run]`. Si vas a correrlo desde fuera de Vercel runtime, set `GCP_PROJECT=efeonce-group` + las 3 GH App env vars (App ID `3665723`, Installation ID `131127026`, secret ref `greenhouse-github-app-private-key`).
- **GitHub auth strategy canonica**: GitHub App `Greenhouse Release Watchdog` (App ID `3665723`) instalada en `efeoncepro` org con permissions `Actions:read + Deployments:read + Metadata:read`. Private key vive en GCP Secret Manager `greenhouse-github-app-private-key` (project `efeonce-group`). Resolver `src/lib/release/github-app-token-resolver.ts` mintea installation token con cache 1h. Fallback a PAT (`GITHUB_RELEASE_OBSERVER_TOKEN`/`GITHUB_TOKEN`) solo si GH App no esta configurado. Beneficios: token NO ligado a usuario, rate limit 15K req/h vs 5K, auditoria per-installation.
- **Setup scripts canonicos**:
  - `pnpm release:setup-github-app` — flow completo end-to-end (manifest creation + install + GCP upload + Vercel config + redeploy). 2 clicks browser + 3 confirmaciones CLI.
  - `pnpm release:complete-github-app-setup --app-id=<N> --installation-id=<N> --pem-file=<path>` — recovery script si setup-github-app crashea mid-flow. Reusa App ya creado.
- **Rollback canonico**: `pnpm release:rollback` (TASK-848 V1.0). Vercel alias swap + Cloud Run workers traffic split + HubSpot integration. Azure manual gated en runbook.
- **3 reliability signals canonicos** (subsystem `Platform Release`, steady=0): `platform.release.stale_approval`, `platform.release.pending_without_jobs`, `platform.release.worker_revision_drift`. Visibles en `/admin/operations`.
- **Helpers canonicos** (single source of truth): `src/lib/release/{github-helpers, workflow-allowlist, severity-resolver, github-app-token-resolver, watchdog-alerts-dispatcher, manifest-store, state-machine}.ts`. Cualquier code path nuevo debe reusar estos.
- **Si emerge un workflow nuevo de deploy production**: agregarlo a `RELEASE_DEPLOY_WORKFLOWS` en `src/lib/release/workflow-allowlist.ts` ANTES del primer deploy. Sin esto el watchdog NO lo detecta.
- **Si tienes que generar un PAT fallback** (degraded mode V1.0): scopes minimos `Actions:read + Deployments:read + Metadata:read`, NUNCA mas amplio.
- **Spec canonica**: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`. Runbooks: `docs/operations/runbooks/production-release.md` (release operativo), `docs/operations/runbooks/production-release-watchdog.md` (watchdog ops). Manuales: `docs/manual-de-uso/plataforma/release-watchdog.md` (operador), `docs/documentation/plataforma/release-watchdog.md` (funcional).

### Production Preflight CLI (TASK-850, 2026-05-10)

- **Que hace**: CLI `pnpm release:preflight` que ejecuta los 12 checks fail-fast ANTES de promover `develop → main`. Composer pattern (TASK-672 mirror) con timeout independiente por check via `withSourceTimeout`. Output JSON machine-readable + humano. `readyToDeploy` boolean conservador (`healthy AND zero degraded sources`).
- **CLI canonico**:
  - `pnpm release:preflight` → human output, exit 0 always
  - `pnpm release:preflight --json` → JSON only (machine-readable, contractVersion='production-preflight.v1')
  - `pnpm release:preflight --fail-on-error` → exit 1 si overallStatus=blocked (CI gate canonico)
  - `pnpm release:preflight --override-batch-policy` → downgrade release_batch_policy errors a warnings (requiere `platform.release.preflight.override_batch_policy` capability + audit row reason >= 20 chars)
  - `pnpm release:preflight --target-sha=<sha>` → SHA explicito (default git HEAD)
  - `pnpm release:preflight --target-branch=<branch>` → branch a promover (default main)
- **12 checks canonicos** (orden estable): target_sha_exists, ci_green, playwright_smoke, release_batch_policy, stale_approvals, pending_without_jobs, vercel_readiness, postgres_health, postgres_migrations, gcp_wif_subject, azure_wif_subject, sentry_critical_issues.
- **Check #4 release_batch_policy** (mas novel): clasifica diff `origin/main...target_sha` por dominio (`payroll`, `finance`, `auth_access`, `cloud_release`, `db_migrations`, `ui`, `docs`, `tests`, `config`, `unclassified`) + decide ship | split_batch | requires_break_glass. Code constants en `src/lib/release/preflight/batch-policy/{domains,classifier}.ts` (YAGNI promote-a-PG hasta que rule-edit frequency >1x/mes).
- **Severity rules** per check:
  - STRICT (Sentry, GCP WIF, Postgres health/migrations, target_sha, ci, playwright, batch_policy, stale_approvals, pending_without_jobs): failure → error/block
  - DEGRADED (Vercel, Azure WIF): failure → warning, degradedSources entry
- **3 capabilities granulares least-privilege** (migration `20260510144012098_task-850-preflight-capabilities.sql`):
  - `platform.release.preflight.execute` (EFEONCE_ADMIN + DEVOPS_OPERATOR)
  - `platform.release.preflight.read_results` (EFEONCE_ADMIN + DEVOPS_OPERATOR + FINANCE_ADMIN observabilidad)
  - `platform.release.preflight.override_batch_policy` (EFEONCE_ADMIN solo, break-glass)
- **Helpers canonicos** (single source of truth, reusables):
  - `src/lib/release/preflight/composer.ts` (composeFromCheckResults puro)
  - `src/lib/release/preflight/runner.ts` (runPreflight async + Promise.all + withSourceTimeout)
  - `src/lib/release/preflight/registry.ts` (PREFLIGHT_CHECK_REGISTRY canonico)
  - `src/lib/release/preflight/types.ts` (ProductionPreflightV1 contract versionado)
  - `src/lib/release/preflight/batch-policy/{domains,classifier}.ts` (release_batch_policy heuristic)
  - `src/lib/release/preflight/output-formatters.ts` (JSON + human es-CL)
- **Reusos de helpers existentes** (cero duplicacion): `src/lib/release/github-helpers.ts` (TASK-849), `RELEASE_DEPLOY_WORKFLOW_NAMES` (workflow-allowlist), `listWaitingProductionRuns` + `listPendingRuns` (TASK-848 V1.0 readers extracted to public exports), `withSourceTimeout` (TASK-672 platform-health), `captureWithDomain` + `redactErrorForResponse` (observability).
- **Si emerge un check nuevo**: extender `PreflightCheckId` union + `PREFLIGHT_CHECK_ORDER` array + registry + tests. Composer rechaza checks fuera del orden canonico.
- **Si emerge un nuevo dominio sensible** (e.g. `compliance`, `legal`): extender `DOMAIN_PATTERNS` + `IRREVERSIBLE_DOMAINS` + tests anti-regresion. Code constants → no requires migration, solo PR review.
- **Spec canonica**: `docs/tasks/in-progress/TASK-850-production-preflight-cli-complete.md`. Runbook: `docs/operations/runbooks/production-release.md` (check #11). Manual operador: `docs/manual-de-uso/plataforma/release-preflight.md`. Doc funcional: `docs/documentation/plataforma/release-preflight.md`.

### Production Release Orchestrator (TASK-851, 2026-05-10)

- **Que hace**: workflow GH Actions canonico `.github/workflows/production-release.yml` que coordina la promocion `develop → main` end-to-end. Compactacion arch-architect de TASK-851 + TASK-852 originales (orquestador y SHA verification son arquitecturalmente acoplados).
- **Trigger**: `workflow_dispatch` con inputs `target_sha` (req), `force_infra_deploy`, `bypass_preflight_reason` (>=20 chars + capability `platform.release.bypass_preflight`).
- **8 jobs canonicos**: preflight (CLI TASK-850) → record-started (CLI Slice 0) → approval-gate (environment Production) → 4 workers parallel (workflow_call) → wait-vercel (poll Vercel API) → post-release-health (ping /api/auth/health) → transition-released (state machine final) → summary.
- **Concurrency**: `production-release-${{ inputs.target_sha }}` cancel-in-progress=false. Distinct SHAs deploy independientemente. Partial UNIQUE INDEX TASK-848 V1.0 enforce 1 release activo per branch a nivel DB.
- **Worker workflow contract**: 4 workers (ops, commercial-cost, ico-batch, hubspot-integration) aceptan `workflow_call` con `inputs.environment` + `inputs.expected_sha` + `secrets.GCP_WORKLOAD_IDENTITY_PROVIDER`. Preserva paths `push:` + `workflow_dispatch:` existentes.
- **Worker deploy.sh contract**: aceptan env var `EXPECTED_SHA` + post-deploy verify `gcloud run revisions describe` matchea `GIT_SHA=EXPECTED_SHA`. Mismatch → exit 1. Skipea cuando EXPECTED_SHA='unknown'.
- **CLI scripts canonicos**:
  - `pnpm release:orchestrator-record-started --target-sha=<sha> --triggered-by=<actor>` → INSERT manifest atomic + outbox event + audit. Returns release_id JSON stdout.
  - `pnpm release:orchestrator-transition-state --release-id=<id> --from-state=<state> --to-state=<state> --actor-label=<actor>` → UPDATE atomic + audit + outbox.
- **State machine canonica** (TASK-848 V1.0): 8 estados (`preflight, ready, deploying, verifying, released, degraded, rolled_back, aborted`) con transition matrix V1 §2.3. Live parity test TS↔SQL en `state-machine.live.test.ts` rompe build si emerge drift.
- **Tests anti-regresion**: `concurrency-fix-verification.test.ts` (10 tests) parsea YAML real de los 4 worker workflows + production-release.yml. Verifica que el cancel-in-progress expression production-only se preserva (defensa contra regresion del incidente 2026-04-26 → 2026-05-09) + workflow_call contracts presentes.
- **Cero outbox events nuevos**: reusa los 7 existentes (`platform.release.* v1` TASK-848 V1.0).
- **Cero capabilities nuevas**: reusa `platform.release.execute` + `platform.release.preflight.execute` + `platform.release.bypass_preflight`.
- **Spec canonica**: `docs/tasks/in-progress/TASK-851-production-release-orchestrator-workflow.md`. Workflow: `.github/workflows/production-release.yml`. CLAUDE.md sección "Production Release Orchestrator invariants (TASK-851)". Manual operador: `docs/manual-de-uso/plataforma/release-orchestrator.md`. Doc funcional: `docs/documentation/plataforma/release-orchestrator.md`.

### Cloud Run hubspot-greenhouse-integration (HubSpot write bridge + webhooks) — TASK-574 (2026-04-24)

- Servicio Cloud Run Python/Flask ubicado en `us-central1` (region bloqueada — NO migrar a `us-east4` porque la URL pública contiene `-uc.` y romperia el webhook del portal HubSpot).
- URL: `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app`. Ubicación código: `services/hubspot_greenhouse_integration/` (absorbido 2026-04-24 desde el sibling `cesargrowth11/hubspot-bigquery` con `git filter-repo` — blame y autoría preservados).
- 23 rutas HTTP: lectura (16 GET no-auth) + escritura (6 endpoints Bearer auth) + webhook inbound HMAC (`POST /webhooks/hubspot`). Lista completa en `services/hubspot_greenhouse_integration/README.md`.
- Consumer en Vercel: `src/lib/integrations/hubspot-greenhouse-service.ts` (no cambia pre/post cutover — contrato HTTP idéntico).
- **Si el cambio toca rutas del bridge, secretos (`hubspot-access-token`, `greenhouse-integration-api-token`, `hubspot-app-client-secret`), webhook handler, `Dockerfile` o `deploy.sh`**: invocar la skill `hubspot-greenhouse-bridge` en `.claude/skills/` o `.codex/skills/`. La skill tiene el árbol de decisión para property lifecycle, rotación de secretos, smoke end-to-end.
- Deploy automático: `.github/workflows/hubspot-greenhouse-integration-deploy.yml` (push a `develop`/`main` con cambios a `services/hubspot_greenhouse_integration/**` → pytest → Cloud Build → Cloud Run deploy → smoke `/health` + `/contract`). Auth via Workload Identity Federation.
- Deploy manual emergencia: `ENV=production bash services/hubspot_greenhouse_integration/deploy.sh`.
- Tests pytest locales: `python -m pytest services/hubspot_greenhouse_integration/tests/ -v` (37/40 passing — 3 known failures pre-cutover documentados en README).
- **Sibling `cesargrowth11/hubspot-bigquery` ya no es owner del bridge**: conserva solo ingestion Cloud Function `main.py` + app HubSpot Developer Platform. Ver `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` §3 y §3.1.

### Conectividad PostgreSQL (leer ANTES de cualquier operación DB)

- **Paso 1 — Usar `pg-connect.sh`** (recomendado para cualquier operación manual o interactiva):
  ```bash
  pnpm pg:connect              # Verifica gcloud CLI + ADC + levanta proxy + test conexión
  pnpm pg:connect:migrate      # Lo anterior + ejecuta migraciones pendientes
  pnpm pg:connect:status       # Lo anterior + muestra estado de migraciones
  pnpm pg:connect:shell        # Lo anterior + abre shell SQL interactivo (como admin)
  ```
  El script `scripts/pg-connect.sh` resuelve automáticamente:
  1. Verifica que credenciales GCP CLI y ADC estén vigentes; si una falla, ejecuta ambos flujos: `gcloud auth login` y `gcloud auth application-default login`
  2. Mata cualquier proxy anterior en el puerto 15432
  3. Levanta Cloud SQL Auth Proxy en `127.0.0.1:15432`
  4. Selecciona el usuario correcto: `ops` (connect/migrate/status) o `admin` (shell)
  5. Verifica la conexión antes de ejecutar la operación
  
  **Prerequisitos**: `cloud-sql-proxy` instalado (`gcloud components install cloud-sql-proxy`), `.env.local` con credenciales PostgreSQL (`GREENHOUSE_POSTGRES_OPS_USER`, `GREENHOUSE_POSTGRES_OPS_PASSWORD`, `GREENHOUSE_POSTGRES_ADMIN_USER`, `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`).

- **Método preferido (runtime en todos los entornos)**: Cloud SQL Connector vía `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`. Conecta sin TCP directo — negocia un túnel seguro por la Cloud SQL Admin API. Funciona en Vercel (WIF + OIDC), local, y agentes AI.
- **La IP pública de Cloud SQL (`34.86.135.144`) NO es accesible por TCP directo** — no hay authorized networks configuradas. Intentar conectar da `ETIMEDOUT`.
- **Prioridad en `src/lib/postgres/client.ts`**: si `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` está definida, el Connector toma prioridad sobre `GREENHOUSE_POSTGRES_HOST`. Ambas pueden coexistir en `.env.local`.
- **Prerequisito (sin pg-connect.sh)**: credenciales GCP válidas y alineadas — `GOOGLE_APPLICATION_CREDENTIALS_JSON` en env, o CLI+ADC local (`gcloud auth login` + `gcloud auth application-default login`), o WIF (Vercel). El service account necesita `roles/cloudsql.client`.
- **Scripts Node.js de runtime** (`pnpm pg:doctor`, `pnpm setup:postgres:*`, scripts de backfill) usan el Connector automáticamente cuando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` está definida.
- **Migraciones y binarios standalone** (`pnpm migrate:up`, `pnpm migrate:down`, `pnpm db:generate-types`, `pg_dump`, `psql`) requieren **Cloud SQL Auth Proxy** corriendo como tunnel local. Usar `pnpm pg:connect` para levantarlo automáticamente, o manualmente:
  ```bash
  cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432
  ```
  `.env.local` debe tener:
  ```
  GREENHOUSE_POSTGRES_HOST="127.0.0.1"
  GREENHOUSE_POSTGRES_PORT="15432"
  GREENHOUSE_POSTGRES_SSL="false"
  ```
- **Guardia fail-fast**: `scripts/migrate.ts` detecta si `GREENHOUSE_POSTGRES_HOST` apunta a una IP pública (ej. `34.86.135.144`) y aborta inmediatamente con instrucciones claras en vez de esperar timeout. **No intentar conectar a la IP pública de Cloud SQL — no hay authorized networks.**
- **Si no tienes `cloud-sql-proxy`**: `gcloud components install cloud-sql-proxy`.
- **Regla**: si un script Node.js de runtime falla con `ETIMEDOUT`, verificar que `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` esté definida y que las credenciales GCP sean válidas. Si una migración o binario standalone falla, verificar que el Cloud SQL Auth Proxy esté corriendo en `127.0.0.1:15432`.

### Acceso PostgreSQL

- Greenhouse usa cuatro perfiles de acceso para PostgreSQL:
  - `runtime` — portal app (DML, via Cloud SQL Connector en Vercel)
  - `migrator` — migraciones DDL (`pnpm migrate:up`, `pnpm setup:postgres:*`)
  - `admin` — bootstrap y ownership (`postgres` user)
  - `ops` — canonical owner de todos los objetos (`greenhouse_ops`, break-glass)
- Variables por perfil:
  - `runtime`:
    - `GREENHOUSE_POSTGRES_USER`
    - `GREENHOUSE_POSTGRES_PASSWORD`
  - `migrator`:
    - `GREENHOUSE_POSTGRES_MIGRATOR_USER`
    - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`
  - `admin`:
    - `GREENHOUSE_POSTGRES_ADMIN_USER`
    - `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
- Variables compartidas obligatorias:
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` o `GREENHOUSE_POSTGRES_HOST`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_PORT`
- Ownership:
  - **`greenhouse_ops`** es el canonical owner de todos los objetos (122 tablas, 11 schemas, 17 views)
  - Consolidado en migración `20260402000000000_consolidate-ownership-to-greenhouse-ops.sql`
  - Password en Secret Manager: `greenhouse-pg-dev-ops-password`
  - Default privileges configurados: objetos nuevos de `greenhouse_ops` otorgan grants automáticos a `greenhouse_runtime` y `greenhouse_migrator`
- Regla operativa:
  - runtime del portal usa solo credenciales `runtime`
  - migraciones DDL usan `migrator` (via `pnpm migrate:up`)
  - bootstrap y ownership usan `admin` o `greenhouse_ops`
  - no hacer DDL con el usuario runtime salvo que exista una razon excepcional y quede documentada
  - no crear objetos con users distintos a `greenhouse_ops` — si una migración corre como `migrator`, los DEFAULT PRIVILEGES otorgan acceso automáticamente
- Comandos canonicos:
  - `pnpm gcloud:auth:preflight` — verificar/renovar gcloud CLI auth + ADC juntos
  - `pnpm pg:connect` — verificar gcloud CLI auth + ADC + levantar proxy + test conexión (usar PRIMERO)
  - `pnpm pg:connect:migrate` — lo anterior + ejecutar migraciones
  - `pnpm pg:connect:status` — lo anterior + mostrar estado de migraciones
  - `pnpm pg:connect:shell` — lo anterior + abrir shell SQL interactivo
  - `pnpm pg:doctor` — health check de conectividad y schemas
  - `pnpm migrate:create <nombre>` — crear migración nueva
  - `pnpm migrate:up` — aplicar migraciones pendientes
  - `pnpm migrate:down` — revertir última migración
  - `pnpm migrate:status` — estado de migraciones
  - `pnpm db:generate-types` — regenerar tipos Kysely
  - `pnpm setup:postgres:access` — setup de roles y grants (legacy)
- Antes de cortar cualquier dominio nuevo a PostgreSQL:
  - correr `pnpm pg:doctor --profile=runtime`
  - correr `pnpm pg:doctor --profile=migrator`
  - confirmar en `Handoff.md` si el dominio ya fue tocado por otro agente
- Fuente canonica del modelo:
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

### Database Connection

- **Import `query` from `@/lib/db`** for raw SQL queries (convenience alias for `runGreenhousePostgresQuery`).
- **Import `getDb` from `@/lib/db`** for Kysely typed queries in new modules.
- **Import `withTransaction` from `@/lib/db`** for transactions.
- **NEVER** create new `Pool` instances — the singleton lives in `src/lib/postgres/client.ts`.
- **NEVER** read `GREENHOUSE_POSTGRES_*` directly outside `src/lib/postgres/client.ts`.
- **NEVER** import `Pool` from `pg` directly — always go through `@/lib/db` or `@/lib/postgres/client`.
- Importing `type PoolClient` from `pg` for function signatures is fine.
- Existing modules using `runGreenhousePostgresQuery` from `@/lib/postgres/client` are fine — no need to migrate retroactively.
- New modules SHOULD use Kysely (`getDb()`) for type safety.

### Database Migrations

- Todo cambio de schema PostgreSQL (DDL) debe hacerse via migración versionada, nunca con ALTER/CREATE manual.
- Framework: `node-pg-migrate` — wrapper en `scripts/migrate.ts`, migraciones en `migrations/`.
- Tabla de tracking: `public.pgmigrations`
- Credenciales: usa perfil `migrator` de `.env.local` automáticamente. Override con `MIGRATE_PROFILE=admin`.
- Convención de nombres: `YYYYMMDDHHMMSS_descripcion-kebab-case.sql`
- Cada migración DEBE incluir `SET search_path = <target_schema>, greenhouse_core, public;` al inicio.
- Regla de orden: **migración ANTES del deploy, siempre** (Vercel no ejecuta migraciones en deploy time).
- Regla de backward-compatibility: columnas nullable primero, deploy código, backfill, luego constraint.
- Reglas de timestamps:
  - **SIEMPRE** usar `pnpm migrate:create <nombre>` para generar el archivo — genera el timestamp UTC correcto automáticamente.
  - **NUNCA** renombrar manualmente el timestamp de un archivo de migración. `node-pg-migrate` ordena por timestamp y rechaza ejecutar migraciones cuyo timestamp sea anterior a la última aplicada.
  - **NUNCA** crear archivos de migración a mano con timestamps inventados. Si el timestamp cae antes del baseline (`20260401120000000`), la migración será ignorada silenciosamente o causará error.
  - Si necesitas que una migración corra antes que otra pendiente, la solución es reordenar el contenido dentro de un solo archivo, no manipular timestamps.
- Flujo obligatorio al modificar schema:
  1. `pnpm migrate:create <nombre>` — crea archivo SQL con timestamp UTC correcto
  2. Editar el archivo con el DDL necesario **bajo `-- Up Migration`** (ver Markers abajo)
  3. `pnpm migrate:up` — aplica contra la base de datos (auto-regenera tipos Kysely)
  4. Commit migración + `db.d.ts` actualizado **juntos** en el mismo commit
  5. `pnpm build` para verificar que los tipos son consistentes
- Conexión local: requiere Cloud SQL Auth Proxy corriendo en `127.0.0.1:15432`. El script tiene guardia fail-fast que aborta si detecta IP pública como host — no esperar timeout, leer el mensaje de error.
- Spec completa: `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

### Database Migration Markers — anti pre-up-marker bug

Patrón canonico que TODA migration debe seguir. La estructura del archivo `.sql` parseada por `node-pg-migrate` es:

```sql
-- Up Migration

-- 1. DDL: CREATE TABLE / ALTER TABLE / CREATE INDEX / CREATE FUNCTION / INSERT seed.
CREATE TABLE IF NOT EXISTS schema.table (...);

-- 2. Bloque DO con RAISE EXCEPTION (anti pre-up-marker bug).
--    Verifica que el DDL realmente quedó aplicado en information_schema.
DO $$
DECLARE expected_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'schema' AND table_name = 'table'
  ) INTO expected_exists;
  IF NOT expected_exists THEN
    RAISE EXCEPTION 'TASK-XXX: schema.table was NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- 3. GRANTs (read/write a runtime, ownership a ops).
GRANT SELECT, INSERT, UPDATE, DELETE ON schema.table TO greenhouse_runtime;

-- Down Migration

-- SOLO undo (DROP / ALTER ... DROP). NUNCA CREATE TABLE aquí.
DROP TABLE IF EXISTS schema.table;
```

**Por qué importa**: si el DDL termina bajo `-- Down Migration` por error, `node-pg-migrate` parsea la sección Up vacía, registra la migration como aplicada en `pgmigrations` y **NO ejecuta el SQL**. Silent failure. Detectado en TASK-768 Slice 1 y repetido por TASK-404 (3 governance tables nunca creadas → ISSUE-068).

**Reglas duras**:

- **NUNCA** pongas `CREATE TABLE`, `ALTER TABLE ADD COLUMN`, `CREATE INDEX`, `CREATE FUNCTION` o `INSERT` debajo de `-- Down Migration`. Ese marker es **solo para undo** (DROP / ALTER ... DROP). Si te encuentras escribiendo CREATE en Down, tienes los markers invertidos — para y mueve a Up.
- **NUNCA** edites una migration ya aplicada (registrada en `pgmigrations`). Si tiene bug, **forward fix con migration nueva idempotente** (`IF NOT EXISTS` + bloque DO de verificación). Editar la legacy rompe environments fresh.
- **NUNCA** asumas que `pnpm migrate:up` aplicó porque devolvió "Migrations complete!" — verifica con `psql` / `pnpm pg:connect:shell` / `pnpm pg:connect:status`, o agrega el bloque DO con RAISE EXCEPTION dentro de la propia migration.
- **SIEMPRE** que la migration cree tablas críticas para runtime, escribe el bloque DO de verificación post-DDL en la misma migration. Patrón fuente: `migrations/20260508104217939_task-611-capabilities-registry.sql`.
- **SIEMPRE** que la down sea destructiva (DROP TABLE, DROP CONSTRAINT), declara explícitamente con `IF EXISTS` para que sea idempotente.
- **SIEMPRE** que un agente "vea raro" el output de `pnpm migrate:up` (sin errors pero la tabla no aparece en queries), correr `psql -c "SELECT * FROM information_schema.tables WHERE table_schema = 'schema_X';"` antes de continuar.

**Defense in depth (en construcción — Fase 2 de ISSUE-068)**: `scripts/ci/migration-marker-gate.mjs` detectará migrations con sección Up vacía + sección Down con DDL keywords. Modo blocking en PRs. Hasta que aplique, la regla es enforcement humano + code review.

**Si descubres que una migration aplicada anteriormente tenía este bug** (sección Up vacía, DDL bajo Down): NO la edites. Crea una migration nueva forward-fix con el SQL correcto, idempotente, y abre un ISSUE-### documentando el hallazgo (ejemplo: ISSUE-068).

### SQL embebido — type alignment + live testing (ISSUE-071)

Cualquier query SQL embebido en TS que use **uniones de tipos** (COALESCE de subqueries, CASE WHEN, NULL coalescing entre tipos heterogéneos) debe **ejercitarse contra PG real ANTES de mergear**, no solo via mocks Vitest.

**Bug class detectado** (2026-05-08, ISSUE-071): el CTE `subject_admin` del relationship resolver de TASK-611 hacía `SELECT 1 AS is_admin` (integer) pero el `COALESCE((SELECT is_admin FROM subject_admin), FALSE)` combinaba con boolean. PG rechaza con `COALESCE types integer and boolean cannot be matched`. El catch silencioso convertía el throw a `degradedMode=true` y el banner "Workspace en modo degradado" se mostraba al usuario. Bug latente desde el merge de TASK-611, descubierto solo cuando un usuario real ejerció el path post TASK-613 V1.1.

**Reglas duras**:

- **NUNCA** mergear queries con CTEs + COALESCE/CASE/NULL handling sin un live test contra PG (vía `pg:connect` proxy + `pnpm tsx`, o `*.live.test.ts`).
- **NUNCA** confiar SOLO en unit tests con mocks para validar type alignment SQL. Los mocks ejercitan la lógica TS, NO el SQL crudo.
- **SIEMPRE** que `COALESCE((SELECT ... FROM cte), default)`, verificar que el tipo del SELECT del CTE matchee el tipo del `default`. PG hace casting implícito en algunos casos (e.g. INT → NUMERIC) pero NO entre INT y BOOL.
- **SIEMPRE** que un read path tenga catch + degraded mode honesto (correcto desde safety perspective), confirmar que `captureWithDomain` está emitiendo a Sentry — sino el bug class queda completamente oculto al equipo y aparece solo cuando un usuario real reporta el síntoma.

**Defense-in-depth recomendado**: cuando una query nueva emerja, agregar un script `scripts/<dominio>/_sanity-<query-name>.ts` (gitignored o committed según necesidad) que la ejecute contra el proxy local. Después del primer ejercicio exitoso, ese script es opcional pero útil como debugging aid futuro.

### Charts — política canónica (decisión 2026-04-26 — prioridad: impacto visual)

**Stack visual de Greenhouse prioriza wow factor y enganche** sobre bundle/a11y. Los dashboards (MRR/ARR, Finance Intelligence, Pulse, ICO, Portfolio Health) son la cara del portal a stakeholders y clientes Globe.

- **Vistas nuevas con dashboards de alto impacto**: usar **Apache ECharts** vía `echarts-for-react`. Animaciones cinemáticas, tooltips multi-series ricos, gradientes premium, soporte nativo de geo/sankey/sunburst/heatmap/calendar. Lazy-load por ruta para mitigar bundle (~250-400 KB con tree-shaking).
- **Vistas existentes con ApexCharts** (32 archivos al 2026-04-26): siguen activas sin deadline. ApexCharts se mantiene como segundo tier oficial — no es deuda técnica, es stack válido vigente. Migración Apex → ECharts es **oportunista**, solo cuando se toque la vista por otra razón Y se busque subir el tier visual.
- **NO usar Recharts** como default para vistas nuevas. Recharts gana en bundle/ecosystem pero pierde en wow factor sin una capa custom de polish. Reservar Recharts solo para sparklines compactos en KPI cards o cuando explícitamente NO se necesita impacto visual.
- **Excepción única**: si necesitas control absoluto Stripe-level o un tipo que ECharts no cubre, usar Visx (requiere construcción custom).
- **Por qué este orden** (ECharts > Apex > Recharts):
  - ECharts: visual atractivo 10/10, enganche 10/10, cobertura asombrosa.
  - Apex: visual 8/10, ya cubre el portal, no urge migrar.
  - Recharts: 7/10 sin inversión adicional; gana solo si construimos `GhChart` premium (no priorizado).
- TASK-518 (migración masiva a Recharts) **descartada** — pierde impacto visual. Ver Delta 2026-04-26 en `docs/tasks/to-do/TASK-518-apexcharts-deprecation.md`.

### Tablas operativas — Density Contract canonical (TASK-743, 2026-05-01)

Toda tabla operativa con celdas editables inline o > 8 columnas vive bajo un contrato declarativo de densidad para no desbordar el `compactContentWidth: 1440`.

- **3 densidades canonicas**: `compact` (row 32px, editor 110px, sin slider inline), `comfortable` (row 44px, editor 130px, slider en popover-on-focus), `expanded` (row 56px, editor 160px, slider inline + min/max captions).
- **Resolucion de densidad** (precedencia): prop explicita > cookie `gh-table-density` > container query auto-degrade (< 1280px degrada un nivel) > default tema (`comfortable`).
- **Wrapper canonico**: `<DataTableShell>` envuelve TODA tabla operativa. Establece `container-type: inline-size`, observa el ancho real, computa densidad efectiva, expone `<DataTableShell.Sticky>` para columna sticky-first y agrega gradient fade en el borde derecho cuando hay scroll restante.
- **Primitive editable canonica**: `<InlineNumericEditor>` reemplaza inputs+sliders dispersos. Acepta `value`, `min`, `max`, `step`, `currency`, `qualifies`, `disabled`, `label`, `onChange`. Adapta render a la densidad efectiva.
- **Ubicacion**: `src/components/greenhouse/data-table/{density,useTableDensity,DataTableShell}.tsx` y `src/components/greenhouse/primitives/InlineNumericEditor.tsx`.
- **Spec canonica**: `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`.
- **Doc funcional**: `docs/documentation/plataforma/tablas-operativas.md`.

**⚠️ Reglas duras**:

- **NUNCA** crear una `<Table>` MUI con > 8 columnas o con `<input>`/`<TextField>`/`<Slider>` en `<TableBody>` sin envolverla en `<DataTableShell>`. Lint rule `greenhouse/no-raw-table-without-shell` bloquea el commit.
- **NUNCA** hardcodear `minWidth` en una primitiva editable — debe leer densidad via `useTableDensity()`.
- **NUNCA** mover `compactContentWidth` a `wide` para resolver overflow de una tabla. Resolver siempre con el contrato (densidad + sticky + scroll fade).
- **NUNCA** duplicar `BonusInput` u otra primitiva legacy. Migrar consumers a `<InlineNumericEditor>`. `BonusInput.tsx` queda como re-export deprecado hasta que el ultimo consumer migre.
- **NUNCA** desactivar el visual regression test de `/hr/payroll` para forzar un merge. Si falla por overflow, la solucion es respetar el contrato, no bypass.

### Organization-by-facets — receta canónica (TASK-611/612/613, 2026-05-08)

Toda surface organization-centric (clientes finanzas, agency organizations, prospects, partners, vendors, futuras vistas legales/marketing/compliance/audit) **debe** renderearse a través del **Organization Workspace shell canónico** (TASK-612). Cero composición ad-hoc.

#### Composición canónica

- **`OrganizationFacet`** × **`EntrypointContext`** son dos dimensiones ortogonales. NO mezclar en un solo enum.
- 9 facets canónicos: `identity | spaces | team | economics | delivery | finance | crm | services | staffAug`.
- 4 entrypoints canónicos: `agency | finance | admin | client_portal` (extensible — receta abajo).
- 5 relationships canónicas: `internal_admin | assigned_member | client_portal_user | unrelated_internal | no_relation`.

#### Para agregar un facet nuevo

1. Extender `OrganizationFacet` enum + `viewCode` mapping (`src/lib/organization-workspace/facet-{capability,view}-mapping.ts`).
2. Seedear capability `organization.<facet>:read` en `capabilities_registry` con migration. Documentar matriz `relationship × capability → access` en spec V1.
3. Crear `<NameFacet>.tsx` self-contained en `src/views/greenhouse/organizations/facets/`. NO renderiza chrome — el shell ya lo hace.
4. Registrar en `FACET_REGISTRY` (`FacetContentRouter.tsx`) con `dynamic()` lazy load.
5. Reliability signal recomendado: clonar patrón TASK-613 `finance-client-profile-unlinked.ts`.

#### Para agregar un entrypoint nuevo

1. Extender `EntrypointContext` union (`src/lib/organization-workspace/projection-types.ts`).
2. Migration que extienda CHECK constraint `home_rollout_flags_key_check` con `organization_workspace_shell_<scope>` + INSERT global `enabled=FALSE`. Extender también `WorkspaceShellScope` (`src/lib/workspace-rollout/index.ts`) y `HomeRolloutFlagKey` (`src/lib/home/rollout-flags.ts`) — drift entre los 3 = falsos positivos.
3. Server page mirror del patrón Agency/Finance: `requireServerSession` → `isWorkspaceShellEnabledForSubject` → resolver canónico → `resolveOrganizationWorkspaceProjection` → render wrapper. Errores degradan a legacy con `captureWithDomain('<domain>', ...)`.
4. Client wrapper mirror del Agency/Finance con slots canónicos: `kpis`, `adminActions`, `drawerSlot`, `children` render-prop, deep-link `?facet=`.
5. Si un facet existente debe cambiar contenido per-entrypoint, inspeccionar `entrypointContext` adentro del facet (patrón canónico `FinanceFacet` desde TASK-613). NO crear facets paralelos.

#### Patrón canónico per-entrypoint dispatch en facet

```tsx
const FinanceFacet = ({ organizationId, entrypointContext }: FacetContentProps) => {
  if (entrypointContext === 'finance') {
    return <FinanceClientsContent lookupId={organizationId} />
  }

  return <FinanceFacetAgencyContent organizationId={organizationId} />
}
```

#### ⚠️ Reglas duras

- **NUNCA** crear una vista de detalle organization-centric que NO use el Organization Workspace shell.
- **NUNCA** componer la projection en el cliente. Server-only por construcción.
- **NUNCA** branchear `entrypointContext` afuera del facet. La decisión vive **adentro** del facet, no en el page o el router.
- **NUNCA** modificar `OrganizationView` legacy (`src/views/greenhouse/organizations/OrganizationView.tsx`) sin migrar paralelamente al shell. Mantener legacy intacto durante el rollout.
- **NUNCA** seedear capabilities `organization.<facet>:*` sin agregar entry al spec table en `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Apéndice A.
- **NUNCA** crear una flag `organization_workspace_shell_*` sin extender los 3 lugares (CHECK constraint + `WorkspaceShellScope` + `HomeRolloutFlagKey`).
- **NUNCA** mezclar dimensiones (e.g. "qué facet" + "qué entrypoint") en un solo enum.
- **NUNCA** computar la decisión `legacy fallback vs shell` en runtime sin envolver en `try/catch + captureWithDomain(...)`.
- **NUNCA** modificar la flag directamente vía SQL. Toda mutación pasa por el admin endpoint `POST /api/admin/home/rollout-flags`.
- **SIEMPRE** declarar `incidentDomainTag` en el module registry cuando el facet tiene dataset propio que puede generar incidents Sentry.
- **SIEMPRE** seguir el rollout staged: V1 OFF default → V1.1 pilot users → V2 flip global con steady-state ≥30 días → V3 cleanup legacy ≥90 días sin reverts.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Delta 2026-05-08 (receta paso a paso). Tasks de referencia: TASK-611 (foundation), TASK-612 (shell + Agency entrypoint), TASK-613 (Finance entrypoint + dual-dispatch pattern).

## Task Lifecycle Protocol

### Regla general

Todo agente que trabaje sobre una task del sistema debe gestionar su estado en el pipeline de tareas. Las tasks nuevas usan `TASK-###`; las `CODEX_TASK_*` existentes se consideran legacy hasta su migracion. Todas viven en `docs/tasks/{to-do,in-progress,complete}/` y su índice es `docs/tasks/README.md`.

Antes de crear una task nueva:

1. Revisar `docs/tasks/TASK_TEMPLATE.md` (plantilla copiable) y `docs/tasks/TASK_PROCESS.md` (protocolo)
2. Revisar `docs/tasks/TASK_ID_REGISTRY.md`
3. Asignar el siguiente `TASK-###` disponible sin renumerar tasks existentes
4. Registrar el nuevo ID en `docs/tasks/TASK_ID_REGISTRY.md`
5. Crear la task en la carpeta de lifecycle correcta

### Al iniciar trabajo en una task

1. Mover el archivo de la task de `to-do/` a `in-progress/`
2. Cambiar `Lifecycle` dentro del markdown a `in-progress`
3. Verificar que carpeta y `Lifecycle` digan lo mismo
4. Actualizar `docs/tasks/README.md` — cambiar estado a `In Progress`
5. Registrar en `Handoff.md` qué task se está trabajando, rama y objetivo

### Al completar una task

1. Cambiar `Lifecycle` dentro del markdown a `complete`
2. Mover el archivo de `in-progress/` a `complete/`
3. Verificar que carpeta y `Lifecycle` digan lo mismo
4. Actualizar `docs/tasks/README.md` — mover entrada a sección `Complete` con resumen de lo implementado
5. Documentar en `Handoff.md` y `changelog.md`
6. Ejecutar el chequeo de impacto cruzado (ver abajo)

Regla dura:

- una task no está cerrada si el trabajo terminó pero el archivo sigue en `in-progress/`
- un agente no debe reportar "task completada" al usuario mientras `Lifecycle` siga en `in-progress`

### Chequeo de impacto cruzado (obligatorio al cerrar)

Después de completar implementación, escanear `docs/tasks/to-do/` buscando tasks que:

- **Referencien archivos que se modificaron** → actualizar su sección "Ya existe"
- **Declaren gaps que el trabajo acaba de cerrar** → marcar el gap como resuelto con fecha
- **Tengan supuestos que los cambios invaliden** → agregar nota delta con fecha y nuevo estado
- **Estén ahora completamente implementadas** → marcar para cierre y notificar al usuario

Regla: si una task ajena cambió de estado real (un gap se cerró, un supuesto cambió), agregar al inicio del archivo:

```markdown
## Delta YYYY-MM-DD

- [descripción del cambio] — cerrado por trabajo en [task que lo causó]
```

### Reclasificación de documentos

Si durante una auditoría se determina que un archivo en `docs/tasks/` no es una task sino una spec de arquitectura o referencia:

- Moverlo a `docs/architecture/`
- Actualizar `docs/tasks/README.md` con nota de reclasificación
- Si tiene gaps operativos pendientes, crear una task derivada en `to-do/`

### Dependencias entre tasks

Cada task activa debe tener un bloque `## Dependencies & Impact` que declare:

- **Depende de:** qué tablas, schemas, o tasks deben existir antes
- **Impacta a:** qué otras tasks se verían afectadas si esta se completa
- **Archivos owned:** qué archivos son propiedad de esta task (para detectar impacto cruzado)

## Mini Task Lifecycle Protocol

### Regla general

Las mejoras chicas, locales y planificadas que no son incidentes ni ameritan `TASK-###` deben vivir como `MINI-###` en `docs/mini-tasks/{to-do,in-progress,complete}/`, con índice en `docs/mini-tasks/README.md`.

Antes de crear una mini-task nueva:

1. Revisar `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
2. Revisar `docs/mini-tasks/MINI_TASK_TEMPLATE.md`
3. Revisar `docs/mini-tasks/MINI_TASK_ID_REGISTRY.md`
4. Asignar el siguiente `MINI-###` disponible
5. Crear el archivo en `docs/mini-tasks/to-do/`

### Al iniciar trabajo en una mini-task

1. Mover el archivo de `to-do/` a `in-progress/`
2. Actualizar `docs/mini-tasks/README.md`
3. Registrar en `Handoff.md` si el cambio toca una zona sensible o deja pendientes

### Al completar una mini-task

1. Mover el archivo de `in-progress/` a `complete/`
2. Actualizar `docs/mini-tasks/README.md`
3. Registrar verificación real ejecutada
4. Actualizar `Handoff.md` y `changelog.md` cuando aplique

Cuando un agente modifica archivos listados como "owned" por otra task, debe revisar esa task y actualizar su estado si corresponde.

### GitHub Project mirror

- El Project de GitHub es la capa operativa de seguimiento; la task markdown sigue siendo la fuente canonica de alcance.
- Toda task activa o priorizada para iteracion debe idealmente tener:
  - issue con titulo `[TASK-###] ...`
  - `Task ID` y `Task Doc` visibles
  - estado alineado con el pipeline del Project
- La referencia canonica para este flujo queda en:
  - `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md`

## Checklist de Cierre de Turno

- Cambios acotados y entendibles.
- Verificacion ejecutada o limitacion documentada.
- Ningun `commit` o `push` hecho sin revisar que el cambio este estable para su alcance.
- Rama de trabajo y destino de merge claros.
- `Handoff.md` actualizado si hubo impacto real.
- `changelog.md` actualizado si hubo cambio relevante.
- `project_context.md` actualizado si cambio la arquitectura, el deploy o los supuestos.

## Regla Final

Si una decision no esta documentada y puede afectar a otros agentes, aun no esta cerrada.
