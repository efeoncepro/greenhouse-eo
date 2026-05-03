# Codex Execution Prompt V1

## Objetivo

Definir un prompt operativo canónico para que Codex ejecute `TASK-###` dentro de `greenhouse-eo` con alta fidelidad al repo real, bajo drift, buen uso de skills, coordinación segura con subagentes y cierre documental consistente.

Este documento **no reemplaza** `AGENTS.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md`, `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`, `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` ni `docs/tasks/TASK_PROCESS.md`. Los comprime en una forma reutilizable para sesiones de ejecución.

## Cuándo usarlo

- Cuando Codex va a implementar una `TASK-###`
- Cuando el trabajo toca varios dominios o tiene blast radius medio/alto
- Cuando se quiere un prompt único y robusto, en vez de instrucciones dispersas

## Cuándo NO usarlo literal

- Tasks demasiado pequeñas y locales donde un prompt largo agregue más overhead que valor
- Sesiones de brainstorming, diseño o revisión sin intención inmediata de implementar

En esos casos, usar este prompt de forma proporcional y breve.

## Prompt canónico

```md
Vas a implementar la task **[TASK-###]** ubicada en `docs/tasks/{to-do,in-progress}/TASK-###-*.md` dentro del repo `greenhouse-eo`.

Tu objetivo es ejecutar la task de forma **canónica, reusable, segura, resiliente y alineada con el estado real del repo**. No basta con “hacer que funcione”: debes respetar arquitectura, runtime, documentación viva, contratos existentes y blast radius del ecosistema Greenhouse.

Greenhouse no quiere parches fragiles por defecto. Debes aplicar `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`: corrige causa raiz, reutiliza primitives canonicas, agrega defensa/regresion cuando aplique y documenta cualquier workaround como temporal, reversible y con condicion de retiro.

No asumas que la spec está perfecta. Primero debes contrastarla contra:
- el código real
- la arquitectura vigente
- el schema/runtime actual
- la documentación viva

Si la spec tiene `## Open Questions`, resuélvelas **antes de implementar** con la opción más robusta, segura, resiliente y escalable. No elijas bandaids. Documenta cada decisión y su rationale antes de FASE 1. Si alguna open question es bloqueante, detente y repórtalo.

-------------------------------------------------------------------------------
SOURCE OF TRUTH
-------------------------------------------------------------------------------

Si hay conflicto entre:
1. la task
2. la arquitectura/documentación vigente
3. el runtime/código/schema real

prevalece **arquitectura + runtime real**. Luego corrige la task o la documentación correspondiente.

-------------------------------------------------------------------------------
ESTADO DE LA TASK
-------------------------------------------------------------------------------

Si la task ya está en `in-progress/`:
- lee el archivo
- lee `Handoff.md`
- busca branch/contexto existente
- si Discovery / Audit / Plan ya fueron hechos y siguen vigentes, **no los repitas**
- continúa desde el primer slice incompleto
- solo rehace fases si detectas drift real desde la última sesión:
  - commits nuevos relevantes
  - schema/runtime cambiado
  - docs actualizadas
  - task movida o redefinida

Si la task está en `to-do/`:
- antes de cualquier implementación, verifica si alguien más la está trabajando
- revisa PRs, branches y handoff
- si está libre:
  - mueve la task a `in-progress/`
  - cambia `Lifecycle` a `in-progress`
  - sincroniza `docs/tasks/README.md`
  - crea branch `task/TASK-###-short-slug`
  - deja nota en `Handoff.md`

No trabajes en paralelo sobre una task que ya tiene ownership activo no resuelto.

-------------------------------------------------------------------------------
PRINCIPIOS OPERATIVOS
-------------------------------------------------------------------------------

1. Reutiliza antes de crear.
2. Corrige causa raiz antes que sintomas locales; no entregues workarounds permanentes.
3. No implementes sobre supuestos no verificados.
4. Si la spec está desactualizada:
   - si el drift es bloqueante o cambia contrato, corrígela primero
   - si no es bloqueante, documéntalo en Audit y sigue
5. Si el cambio toca acceso, documenta explícitamente qué vive en:
   - `routeGroups`
   - `views` / `authorizedViews` / `view_code`
   - `entitlements`
   - `startup policy`
6. Si el cambio toca UI visible, respeta `DESIGN.md`.
7. Si el cambio toca backend/data/runtime, usa primitives canónicas del repo; no inventes paths paralelos.
8. Si existe una auditoría relevante en `docs/audits/`, úsala como input, pero revalídala.
9. Usa skills reales del entorno cuando el trabajo lo justifique.
10. Usa subagentes solo cuando haya trabajo independiente, no bloqueante y con ownership claro.
11. No mezcles refactor grande con fix funcional chico sin necesidad real.
12. No reviertas cambios ajenos del worktree.

-------------------------------------------------------------------------------
PROPORCIONALIDAD
-------------------------------------------------------------------------------

Aplica este protocolo con intensidad proporcional al tamaño y riesgo de la task:

- Task pequeña/local/bajo riesgo:
  - Discovery, Audit y Plan pueden ser breves, pero no se omiten.
- Task cross-domain, shared runtime, acceso, migraciones, observabilidad o UI visible:
  - aplica el protocolo completo.
- Task sensible (finance, payroll, auth, billing, cloud, data, production):
  - asume rigor alto aunque el diff sea pequeño.

No generes burocracia innecesaria, pero no saltes verificación esencial.

-------------------------------------------------------------------------------
LECTURA OBLIGATORIA
-------------------------------------------------------------------------------

Lee siempre:
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`
- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- la spec completa de la task
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Además, lee toda arquitectura especializada aplicable al dominio.

Ejemplos frecuentes:
- acceso / permisos / navegación:
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- datos / sync / postgres / bigquery:
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- cloud / reliability / billing / AI:
  - `docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md`
  - `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Si la task toca schema o DDL, revisa también:
- `docs/architecture/schema-snapshot-baseline.sql`
- `migrations/`
- `scripts/migrate.ts`
- `scripts/pg-connect.sh`

-------------------------------------------------------------------------------
SKILLS
-------------------------------------------------------------------------------

Debes usar los skills reales disponibles en esta sesión cuando el trabajo claramente matchee su dominio.

Reglas:
- usa el conjunto mínimo de skills que cubra la task
- no cargues skills porque sí
- usa skills para escribir o decidir implementación, no para lectura superficial
- si delegas, el subagente usa el skill al inicio de su subtarea relevante

Guía práctica:
- backend / TS / helpers / routes / dominio Greenhouse:
  - `greenhouse-agent`
- Next.js App Router / handlers / layouts / server components:
  - `greenhouse-agent` + `vercel:nextjs`
- UI / pages / views:
  - `greenhouse-agent` + `greenhouse-ui-orchestrator`
- UI compleja sobre Vuexy/MUI:
  - sumar `greenhouse-vuexy-ui-expert` o `greenhouse-portal-ui-implementer`
- copy user-facing:
  - sumar `greenhouse-ux-content-accessibility`
- task/spec/brief:
  - `greenhouse-task-planner`
- diseño estructural UI:
  - `modern-ui-architect` si realmente aplica
- seguridad:
  - `codex-security:*` si la task es explícitamente de hardening/seguridad

Si vas a usar un skill, dilo brevemente antes de aplicarlo.

-------------------------------------------------------------------------------
SUBAGENTES
-------------------------------------------------------------------------------

Usa subagentes cuando haya trabajo independiente y paralelizable.

Úsalos para:
- explorar varios módulos en paralelo
- revisar schema/runtime mientras otro agente revisa docs
- implementar slices con write-scope separado
- verificar riesgos o tests mientras avanzas en otra parte

No los uses para:
- delegar el paso crítico inmediato del que depende tu siguiente acción
- duplicar trabajo ya delegado
- repartir los mismos archivos entre varios agentes
- crear agentes vagos sin ownership claro

Cada subagente debe tener:
- objetivo exacto
- alcance acotado
- ownership de archivos o pregunta concreta
- instrucción explícita de no revertir trabajo ajeno

Si la task es simple o altamente acoplada, trabaja secuencialmente.

-------------------------------------------------------------------------------
BUDGET GUARDRAIL
-------------------------------------------------------------------------------

Detente y reporta antes de seguir si ocurre cualquiera de estas condiciones:
- llevas más de 3 slices sin commit del primero
- rehiciste Discovery por segunda vez
- 3+ subagentes fallaron consecutivamente sobre el mismo problema
- sigues encontrando drift estructural que empuja scope creep

Probable causa:
- supuesto roto
- scope creep
- falta input humano
- contrato upstream incompleto

No sigas escribiendo código hasta resolverlo.

-------------------------------------------------------------------------------
FASE 1 — DISCOVERY
-------------------------------------------------------------------------------

No escribas código todavía.

1. Lee la spec completa.
2. Lee la lectura obligatoria.
3. Explora `src/`, `migrations/`, `scripts/`, `services/` y `docs/` para encontrar:
   - APIs
   - helpers
   - migrations
   - tests
   - lint rules
   - signals
   - capabilities
   - workers
   - components/views existentes
4. Verifica schema/runtime real:
   - revisa `schema-snapshot-baseline.sql`
   - revisa `src/types/db.d.ts`
   - si toca Postgres, corre `pnpm pg:doctor`
   - si necesitas conectividad local, usa `pnpm pg:connect` / `pnpm pg:connect:migrate`
5. Si hay remediation/backfill o incidentes runtime:
   - verifica datos vivos cuando aplique
   - usa `pnpm staging:request <path>` y/o herramientas DB/CLI canónicas
6. Si el fix real vive fuera del código (GCP, Azure, Vercel, GitHub, Postgres operativo), usa las CLIs autenticadas disponibles cuando aplique.
7. Resuelve `Open Questions` con la opción más robusta y documenta la decisión.
8. Si una question es bloqueante, detente.

-------------------------------------------------------------------------------
FASE 2 — AUDIT
-------------------------------------------------------------------------------

Antes de seguir, presenta exactamente este bloque:

=== AUDIT: [TASK ID] ===

SUPUESTOS CORRECTOS:
- ...

SUPUESTOS DESACTUALIZADOS:
- spec dice X, realidad es Y (verificado en [path]) → acción

ARQUITECTURA / DOCS OBLIGATORIOS:
- [doc] → [por qué aplica]

CÓDIGO EXISTENTE PARA REUTILIZAR:
- [qué] → [path:linea si sirve]

SCHEMA / RUNTIME REAL:
- [tabla / helper / route / worker / view] → [path]

ACCESS MODEL:
[solo si aplica]
- routeGroups: ...
- views: ...
- entitlements: ...
- startup policy: ...
- decisión de diseño: ...

SKILLS A USAR:
- [skill] → [para qué]

SUBAGENTES:
- [si/no] + [por qué]

DEPENDENCIAS FALTANTES:
- ...

RIESGOS / BLAST RADIUS:
- ...

OPEN QUESTIONS RESUELTAS:
- [Q → resolución → rationale]

===

Reglas:
- drift cosmético/no bloqueante: documenta y sigue
- drift bloqueante o cambio de contrato: corrige la spec primero
- bloqueo real: detente y reporta

-------------------------------------------------------------------------------
FASE 3 — MAPA DE CONEXIONES
-------------------------------------------------------------------------------

Antes de implementar, levanta un mapa explícito de integración cuando la task no sea puramente local.

Documenta lo que aplique:
- eventos salientes: este módulo emite → quién consume
- eventos entrantes: quién emite → este módulo consume
- foreign keys / joins / views / projections compartidas
- readers / helpers / services reutilizables
- tablas / schemas / materializaciones relacionadas
- rutas / views / guards / capabilities afectadas
- jobs / cron / ops-worker / cloud run / webhooks relacionados
- reliability signals impactados
- surfaces UI consumidoras
- tests transversales que debes extender o no romper

Si hay más de dos módulos relevantes, puedes usar subagentes para levantar este mapa en paralelo.

-------------------------------------------------------------------------------
FASE 4 — PLAN
-------------------------------------------------------------------------------

Antes de implementar, presenta un plan ordenado slice por slice con esta estructura:

1. Migraciones
2. Tipos / contratos
3. Queries / readers / helpers
4. API routes / handlers / workers
5. Events / publishers / consumers
6. Reliability signals / observability / lint rules
7. UI / views / pages
8. Docs / handoff / changelog / arquitectura
9. Verificación

Para cada item nuevo:
- explica por qué no existe uno reutilizable
- indica qué archivos toca
- indica qué skill(s) usarás
- indica dependencias
- indica si requiere subagente o no

Si la task toca acceso, agrega:
ACCESS MODEL DECISION:
- `routeGroups`: ...
- `views`: ...
- `entitlements`: ...
- `startup policy`: ...

Si la task es P0/P1 o de blast radius alto, detente al final del plan para checkpoint humano si corresponde al flujo del equipo.

-------------------------------------------------------------------------------
FASE 5 — IMPLEMENTACIÓN
-------------------------------------------------------------------------------

Implementa slice por slice.

Reglas críticas:
- reutilizar > crear
- no inventes helpers/readers/components/rutas si ya existe una primitive canónica
- mantén tenant/scope isolation según el dominio real
  - no fuerces `space_id` si el contrato usa `organization_id`, `client_id`, scope híbrido o `__platform__`
- no calcules métricas inline si ya existe materialización o reader canónico
- respeta schema-per-domain (`greenhouse_core`, `greenhouse_finance`, `greenhouse_payroll`, etc.)
- `views` y `entitlements` no son lo mismo
- si tocas archivos sensibles/globales, refléjalo en `Handoff.md`
- no reviertas cambios ajenos

Reglas DB:
- usa primitives canónicas del repo (`getDb`, `query`, `withTransaction`, Kysely o helper existente según la zona)
- nunca crees `new Pool()`
- nunca leas secrets DB directo desde código nuevo
- migraciones:
  - siempre crea con `pnpm migrate:create <slug>`
  - nunca fabriques migraciones a mano
- si necesitas DB local:
  - usa `pnpm pg:doctor`
  - usa `pnpm pg:connect`, `pnpm pg:connect:migrate` o `pnpm migrate:up` según corresponda

Reglas de métricas / reliability / events:
- signals determinísticos primero, IA después
- outbox events versionados y documentados si aplica
- si agregas lint rules o reliability signals, define steady state, severity rule y evidence concreta

Reglas UI:
- usa `DESIGN.md` como contrato visual
- baseline actual: `Poppins` + `Geist Sans`
- no reintroduzcas `DM Sans` o `Inter` como baseline general
- reutiliza shells, cards, tables, empty states y patterns existentes
- copy visible debe pasar por criterio de `greenhouse-ux-content-accessibility`

Si descubres que la causa raíz vive fuera del código, usa las CLIs autenticadas disponibles cuando aplique y verifica después.

Por slice:
- implementa atómicamente
- valida el slice
- commit
- avanza al siguiente solo cuando esté sano

-------------------------------------------------------------------------------
FASE 6 — VERIFICACIÓN
-------------------------------------------------------------------------------

Antes de cerrar, ejecuta lo que aplique:

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm pg:doctor`
- validación manual o preview si hay UI
- verificación específica de la task
- comprobación de steady state si agregaste signals o remediaciones

Si hubo migraciones:
- crea la migración con `pnpm migrate:create`
- aplica/verifica con el flujo correcto
- commitea juntos migración + tipos/regenerados si corresponde

Si hubo cambios visibles o contractuales:
- actualiza docs vivas aplicables:
  - `Handoff.md`
  - `project_context.md` si cambió el contrato del repo
  - `changelog.md` si cambió comportamiento/flujo/protocolo
  - docs de arquitectura, documentación funcional o manuales si aplica

-------------------------------------------------------------------------------
CIERRE OBLIGATORIO
-------------------------------------------------------------------------------

No declares la task cerrada sin dejar explícito:
- qué cambió
- qué reutilizaste
- qué validaste
- qué no pudiste validar
- riesgos o follow-ups
- qué docs actualizaste
- cualquier drift detectado entre spec y repo

Si la task exige workflow completo:
- sincroniza `Lifecycle`
- mueve el archivo a la carpeta correcta
- sincroniza `docs/tasks/README.md`
- actualiza `Handoff.md`
- crea PR o sigue el flujo acordado
- no reportes “completada” mientras siga en `in-progress/`

-------------------------------------------------------------------------------
FORMATO DE CIERRE
-------------------------------------------------------------------------------

Al terminar, resume:
1. slices entregados
2. tests/validaciones ejecutadas
3. migraciones / capabilities / events / signals nuevos
4. docs actualizadas
5. riesgos / follow-ups
6. próximo paso
```

## Notas de uso

- Este prompt es deliberadamente riguroso para tasks medianas/grandes.
- En tasks pequeñas, aplicar el mismo flujo de forma proporcional.
- El prompt presupone que `AGENTS.md`, `project_context.md`, `Handoff.md` y la spec de la task siguen siendo las fuentes primarias del repo; si cambian, este documento debe actualizarse.
