#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const snapshotRoot = 'docs/operations/agent-context-history/2026-07-19'
const snapshotAbsolute = path.join(root, snapshotRoot)

const sources = {
  'AGENTS.md': readFileSync(path.join(root, 'AGENTS.md'), 'utf8'),
  'project_context.md': readFileSync(path.join(root, 'project_context.md'), 'utf8'),
  'Handoff.md': readFileSync(path.join(root, 'Handoff.md'), 'utf8'),
  'Handoff.archive.md': readFileSync(path.join(root, 'Handoff.archive.md'), 'utf8')
}

const sha256 = value => createHash('sha256').update(value).digest('hex')

const stats = value => ({
  lines: value.split(/\r?\n/).length,
  chars: value.length,
  estimatedTokens: Math.ceil(value.length / 4),
  sha256: sha256(value)
})

const sessionPattern = /^## Sesi[oó]n[^\n]*$/gim
const sessionMatches = [...sources['Handoff.md'].matchAll(sessionPattern)]

if (sessionMatches.length < 20) {
  throw new Error(`Expected a legacy Handoff with at least 20 sessions; found ${sessionMatches.length}.`)
}

const activeLegacySessions = sessionMatches.slice(0, 19).map((match, index) => {
  const end = sessionMatches[index + 1]?.index ?? sources['Handoff.md'].length

  return sources['Handoff.md'].slice(match.index, end).trimEnd()
})

const migrationSession = `## Sesión 2026-07-19 — Contexto de agentes migrado a router con preservación íntegra

> Se separó bootstrap, estado vigente y memoria histórica sin borrar contexto. Los cuatro archivos previos al
> corte quedaron preservados byte-for-byte bajo \`${snapshotRoot}/\`, con SHA-256 y conteos en
> \`manifest.json\`. \`AGENTS.md\` ahora enruta por dominio; \`project_context.md\` conserva solo contratos
> durables; este archivo mantiene una ventana máxima de 20 sesiones. El fallback obligatorio ante una duda es
> buscar por keyword en \`AGENTS.legacy.md\` o los snapshots de contexto y contrastar contra arquitectura,
> task, código y runtime vigentes. \`CLAUDE.md\` y su CI quedaron fuera de alcance por instrucción del operador.`

const handoffActive = `# Handoff activo

> Cabina de mando para continuidad inmediata. No es changelog, arquitectura ni memoria completa.
> Ventana máxima: 20 sesiones. Historia íntegra e índice: [Handoff.archive.md](Handoff.archive.md).

## Estado activo ahora

- Branch compartida: \`develop\`. Antes de editar, ejecutar \`git status --short\` y no asumir árbol limpio.
- El checkout contiene trabajo paralelo de Campaign Layout Compiler / producción creativa que fue preservado
  exactamente en el snapshot del corte; no revertir ni reescribir esos cambios.
- Estado de producto, arquitectura y rollout: usar las tasks/epics/issues y documentos canónicos enlazados por
  cada sesión. Una entrada histórica nunca prevalece sobre código, schema o runtime verificados.

## Riesgos abiertos

- Trabajo local concurrente: coordinar ownership antes de tocar archivos ya modificados.
- Las sesiones archivadas pueden describir estados superseded. Revalidar cualquier conclusión histórica.

## Pendientes inmediatos

- Para continuar trabajo activo, partir desde las sesiones recientes de abajo y el artefacto formal aplicable.
- Para investigar decisiones anteriores, buscar primero task/issue/ADR y después los snapshots históricos.

## Recuperación histórica

- Índice: [Handoff.archive.md](Handoff.archive.md).
- Snapshot íntegro pre-migración: [\`${snapshotRoot}/Handoff.legacy.md\`](${snapshotRoot}/Handoff.legacy.md).
- Modelo operativo: [\`docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md\`](docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md).

${migrationSession}

${activeLegacySessions.join('\n\n')}
`

const handoffArchiveIndex = `# Handoff archive

Este archivo es un índice histórico, no una lectura obligatoria de arranque. La continuidad activa vive en
[Handoff.md](Handoff.md). Las fuentes canónicas de una implementación siguen siendo task, issue, ADR,
arquitectura, código y runtime verificado.

## Corte legado 2026-07-19

- [Handoff completo antes de la compactación](${snapshotRoot}/Handoff.legacy.md)
- [Handoff.archive previo a la compactación](${snapshotRoot}/Handoff.archive.legacy.md)
- [Manifest de integridad](${snapshotRoot}/manifest.json)
- [Mapa y protocolo de recuperación](${snapshotRoot}/README.md)

Los snapshots son inmutables y se verifican por SHA-256 con \`pnpm docs:context-check:strict\`.

## Archivo incremental posterior

Las sesiones que salgan de la ventana activa se archivan en
\`docs/operations/agent-context-history/handoff/YYYY-MM.md\` mediante \`pnpm docs:context-rotate --apply\`.
No volver a pegar historia completa en este índice.
`

const projectContext = `# Contexto vigente del repositorio

## Estado vigente para agentes

Greenhouse es la plataforma operativa de Efeonce Group sobre Next.js 16, MUI 7, Vuexy starter-kit y
TypeScript. Este archivo contiene solo contratos durables y rutas de descubrimiento. El estado de una sesión,
rollout o bloqueo vive en [Handoff.md](Handoff.md); la historia pre-2026-07-19 quedó preservada en
[\`docs/operations/agent-context-history/2026-07-19/project_context.legacy.md\`](docs/operations/agent-context-history/2026-07-19/project_context.legacy.md).

### Lectura mínima obligatoria

1. [AGENTS.md](AGENTS.md): reglas transversales y router de dominios.
2. [Handoff.md](Handoff.md): continuidad activa y riesgos del checkout.
3. La task, issue, epic, spec o auditoría aplicable.
4. [\`docs/context/00_INDEX.md\`](docs/context/00_INDEX.md) si el trabajo afecta producto, negocio, marca,
   GTM, onboarding, HubSpot, métricas o experiencia cliente.
5. Arquitectura, invariantes y skill indicadas por el router de \`AGENTS.md\`.

No leer snapshots completos de arranque. Buscar en ellos por keyword solo para investigación histórica.

## Identidad y alcance del repo

- Este repo corresponde al \`starter-kit\` Greenhouse. \`full-version\` es referencia visual/funcional, no
  source of truth ni producto activo.
- Greenhouse es plataforma/subproducto de Efeonce; \`EO\` es abreviación del repo, no nomenclatura visible.
- Arquitectura vigente + código/schema/runtime verificados prevalecen sobre tasks o handoffs stale.
- El repo puede convivir con satélites. Ver [\`docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md\`](docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md)
  antes de asumir ownership de otro runtime.

## Ambientes, ramas y despliegue

- Desarrollo normal: local-first sobre \`develop\`; no hacer push, merge, release ni promoción automática sin
  instrucción humana explícita.
- Producción: \`main\` y \`https://greenhouse.efeoncepro.com\`; promoción mediante el release control plane.
- Staging/preview y producción tienen configuración separada. Flags, secrets y migraciones deben verificarse
  en cada runtime consumidor, no solo en Vercel.
- Nunca cambiar la rama de un checkout compartido con trabajo ajeno. Coordinar o usar worktree solo con
  autorización/justificación aplicable.
- Canon: [\`LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md\`](docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md),
  [\`RELEASE_CHANNELS_OPERATING_MODEL_V1.md\`](docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md) y
  [\`GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md\`](docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md).

## Sources of truth por pregunta

| Pregunta | Fuente primaria |
|---|---|
| Qué hago ahora | \`Handoff.md\` + artefacto activo |
| Qué existe y qué contrato gobierna | \`docs/architecture/**\`, ADRs y código/runtime |
| Por qué se decidió | \`docs/architecture/DECISIONS_INDEX.md\` + ADR |
| Cómo se ejecuta una unidad de trabajo | \`docs/tasks/TASK_PROCESS.md\` / modelo de issue/epic/mini-task |
| Qué pasó históricamente | task/issue/commit y snapshots bajo \`agent-context-history/\` |
| Qué ofrece/opera Efeonce | \`docs/services/README.md\` |
| Qué significa para producto/negocio | \`docs/context/00_INDEX.md\` + docs funcionales |
| Cómo lo opera una persona/agente | \`docs/manual-de-uso/**\` y runbook aplicable |

## Loop operativo vigente

Todo trabajo formal sigue:

\`intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff\`

- Modelo: [\`GREENHOUSE_OPERATING_LOOP_V1.md\`](docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md).
- Tasks: [\`docs/tasks/TASK_PROCESS.md\`](docs/tasks/TASK_PROCESS.md).
- Calidad de solución: [\`SOLUTION_QUALITY_OPERATING_MODEL_V1.md\`](docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md).
- QA: skill \`greenhouse-qa-release-auditor\` + \`pnpm qa:gates --changed\`.
- Cierre documental: skill \`greenhouse-documentation-governor\` + \`pnpm docs:closure-check\`.
- Contexto: \`pnpm docs:context-check\`; modo de cierre/enforcement: \`pnpm docs:context-check:strict\`.

## Entry points ejecutables

- Cambio en task/epic/mini-task: \`pnpm ops:lint --changed\`.
- Ejecución Codex de \`TASK-###\`: goal preflight y luego \`pnpm codex:task-hook TASK-###\`.
- Ejecución Codex de \`ISSUE-###\`: \`pnpm codex:issue-hook ISSUE-###\`.
- UI visible: primero \`greenhouse-ai-design-studio\`; después contratos UI, GVC desktop/mobile y gates premium.
- Captura visual: \`pnpm fe:capture\`, \`pnpm fe:capture:review\`, \`pnpm fe:capture:diff\`.
- PostgreSQL: \`pnpm pg:connect\`; no improvisar pools ni credenciales.
- Sitio público por SSH/WP-CLI: \`pnpm public-website:ssh-check\` antes de mutar.
- Contexto histórico: \`rg -n '<keyword>' docs/operations/agent-context-history\`.

## Contratos transversales no negociables

- Reusar primitives, readers, commands, routes, copy, signals y helpers antes de crear piezas paralelas.
- Toda capacidad ejecutable en Greenhouse debe tener o planificar API parity; la UI no es el único camino.
- No declarar cierre si faltan flags, secrets, deploy, migración, backfill, worker/cron/webhook, datos reales o
  verificación runtime.
- Copy reutilizable vive en \`src/lib/copy/*\`; nomenclatura institucional en
  \`src/config/greenhouse-nomenclature.ts\`.
- Seguridad: no imprimir secretos/raw errors, no improvisar accesos y preferir CLIs autenticados con guardrails.
- Auditorías son evidencia fechada, no verdad permanente: revalidar contra código y runtime.
- Trabajo nuevo durante EPIC-027 debe ser extraction-ready y declarar placement sin crear deployables por
  anticipado. Canon: build-unit decision + modular migration operating model.

## Contexto por dominio

El mapa canónico está en [AGENTS.md](AGENTS.md#router-de-dominios). Cargar solo la fila aplicable: skill,
invariantes, arquitectura y task. Si una regla no aparece en el router:

1. buscar keyword en arquitectura, operations y skills;
2. buscar en el snapshot [\`AGENTS.legacy.md\`](docs/operations/agent-context-history/2026-07-19/AGENTS.legacy.md);
3. contrastar con código/runtime;
4. corregir el router o el documento canónico antes de depender de memoria histórica.

## Memoria histórica e integridad

- Snapshot íntegro del contexto anterior: [índice 2026-07-19](docs/operations/agent-context-history/2026-07-19/README.md).
- El manifest SHA-256 prueba que no se perdió el texto original durante la compactación.
- Los snapshots no gobiernan comportamiento vigente y no deben editarse.
- \`project_context.md\` no acepta secciones \`## Delta YYYY-MM-DD\`; cambios históricos van a changelog,
  tasks/issues/ADRs o archivo, según ownership.
`

const agentsRouter = `# AGENTS.md

## Objetivo

Contrato de arranque para Codex y agentes genéricos que trabajan en \`greenhouse-eo\`. Es un router
accionable, no un spec-store. Las reglas específicas de dominio se cargan bajo demanda desde arquitectura,
invariantes y skills versionadas.

## Alcance y prioridades

- Este repo es solo el \`starter-kit\`; \`full-version\` es referencia, nunca source of truth activo.
- Prioridad: mantener Vercel desplegable, proteger la base Vuexy, evitar conflictos, dejar handoff claro y
  preferir soluciones robustas/escalables sobre parches locales.
- Arquitectura vigente + código/schema/runtime verificados prevalecen sobre historia o specs stale.
- No mezclar refactors amplios con cambios funcionales pequeños sin una unidad formal y ownership claro.

## Preflight obligatorio

1. Leer [project_context.md](project_context.md) y [Handoff.md](Handoff.md).
2. Leer la task/issue/epic/spec aplicable y la arquitectura dueña del dominio.
3. Si hay impacto de producto, copy, naming, GTM, onboarding, cliente, HubSpot o métricas, cargar
   [\`docs/context/00_INDEX.md\`](docs/context/00_INDEX.md) y los archivos pertinentes.
4. Revisar \`git status --short\`; no asumir árbol limpio ni sobrescribir cambios ajenos.
5. Cargar las skills e invariantes indicadas por el [router de dominios](#router-de-dominios).

## Recuperación de contexto y regla de no pérdida

La compactación de 2026-07-19 preservó byte-for-byte el \`AGENTS.md\`, \`project_context.md\`, \`Handoff.md\`
y \`Handoff.archive.md\` anteriores. Índice, hashes y conteos:
[\`docs/operations/agent-context-history/2026-07-19/README.md\`](docs/operations/agent-context-history/2026-07-19/README.md).

Si este router no resuelve una duda load-bearing:

1. Buscar primero en la spec/ADR/task y en el runtime real.
2. Ejecutar \`rg -n '<keyword>' docs/architecture docs/operations .codex/skills\`.
3. Como fallback histórico, ejecutar
   \`rg -n '<keyword>' docs/operations/agent-context-history/2026-07-19/AGENTS.legacy.md\`.
4. No obedecer historia a ciegas: contrastarla y mover la regla vigente al dueño canónico antes de actuar.
5. Si faltaba una ruta, actualizar este router y su gate; no volver a pegar el bloque completo aquí.

## Greenhouse Operating Loop

Todo trabajo formal sigue \`intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff\`.
Canon: [\`GREENHOUSE_OPERATING_LOOP_V1.md\`](docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md).

### Tasks, issues, epics y mini-tasks

- Tasks nuevas: ID \`TASK-###\`, template y enums vigentes de [\`TASK_PROCESS.md\`](docs/tasks/TASK_PROCESS.md).
- Si una task combina backend/data y UI, preferir tasks dependientes; una híbrida requiere justificación.
- Codex + \`TASK-###\`: si no hay goal explícito, proponerlo y esperar confirmación. Luego ejecutar
  \`pnpm codex:task-hook TASK-###\` antes de implementar. Usar \`--develop\` o \`--subagents\` solo si el
  operador lo pidió.
- Codex + \`ISSUE-###\`: ejecutar \`pnpm codex:issue-hook ISSUE-###\` antes de código y decidir
  \`issue-only fix | issue + TASK | blocked\`.
- Cambios en taxonomía operativa: \`pnpm ops:lint --changed\` como primera pasada.
- No mover artefactos a complete sin evidencia proporcional y estado runtime honesto.

### ADR gate

Cambios a source of truth, schema/projections compartidas, acceso/auth, finanzas/payroll, eventos/webhooks,
APIs externas, cloud/deploy/secrets, UI platform o workflows de agentes requieren identificar/proponer ADR.
Canon: [\`ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md\`](docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md)
y [\`DECISIONS_INDEX.md\`](docs/architecture/DECISIONS_INDEX.md).

## Router de dominios

Al tocar un dominio, cargar la skill y la fuente canónica de esa fila. El snapshot legado es solo fallback de
investigación, no contrato vigente.

| Dominio / disparador | Skill principal | Invariantes / canon a cargar |
|---|---|---|
| Arquitectura, boundaries, EPIC-027, modularidad | \`software-architect-2026\` | \`GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md\` + \`MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md\` |
| UI visible, layout, interacción, motion, primitives | \`greenhouse-ai-design-studio\` primero | \`agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md\` + \`architecture/ui-platform/README.md\` + premium UI standard |
| Implementación UI Greenhouse/Vuexy | \`greenhouse-portal-ui-implementer\`, \`greenhouse-vuexy-ui-expert\` | \`agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md\` + \`DESIGN.md\` |
| Copy visible / UX content | \`greenhouse-ux-content-accessibility\`, \`copywriting\` | \`src/lib/copy/*\` + nomenclature config + docs de contexto aplicables |
| Browser/URL/captura/diagnóstico visual | \`greenhouse-browser-diagnostics\` | \`GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md\` + manual GVC |
| Release/promoción develop→main | \`greenhouse-production-release\` | \`GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md\` |
| Cloud, secrets, deploy, runtime config | \`greenhouse-secret-hygiene\`, skill cloud aplicable | cloud governance + security posture + infra architecture |
| Ops/reliability/crons/Teams/Platform Health | skill ops aplicable, \`teams-bot-platform\` | \`agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md\` |
| PostgreSQL/migraciones/SQL readers | skill PostgreSQL aplicable | \`GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md\` + SQL date-math invariants |
| Backend/API/outbox/webhooks | \`software-architect-2026\` | API platform + webhooks architecture + full API parity decision |
| Finance/ledger/bank/CLP/FX/payments | \`greenhouse-finance-accounting-operator\` | \`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md\` |
| Payroll/Workforce/leave/participation | \`greenhouse-payroll-auditor\` | \`agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md\` |
| Payroll receipts/finiquito/legal docs | \`greenhouse-payroll-auditor\` | \`agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md\` |
| Hiring/ATS/talent | \`greenhouse-talent-people-operator\` | \`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md\` |
| Identity/roles/session/access | skill identity aplicable | \`agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md\` + entitlements/roles architecture |
| Organization/Client portal/Account 360 | skill producto aplicable | \`agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md\` |
| Knowledge/Nexa | \`greenhouse-nexa-conversational\` | \`agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md\` |
| Notion sync/work management | \`notion-platform\` | \`GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md\` + Notion architecture/runbook aplicable |
| HubSpot/CRM/services intake | \`hubspot-greenhouse-bridge\` o \`hubspot-as-a-service\` | \`GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md\` |
| Integraciones cross-runtime | skill de integración aplicable | \`agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md\` |
| Growth/SEO/AEO/forms/CTAs/GTM | skill growth/SEO/GTM aplicable | arquitectura del subdominio + \`docs/context/\` + tracking/privacy contracts |
| Sitio público WordPress/Kinsta | \`efeonce-public-site-wordpress\` | \`docs/public-site/README.md\` + Kinsta access invariants |
| Radiografía AEO / repo \`efeonce-think\` | \`seo-aeo\`, \`seo-aeo-practice\`, \`astro\` | \`docs/think/radiografia-aeo-architecture.md\` + runbook/manual; runtime no vive aquí |
| Creative/editorial/image/audio/decks | skill studio específica | docs/skills de producción; preservar provenance, licencia, evidencia y gates humanos |
| Licitaciones/propuestas/composer | \`greenhouse-public-private-tenders\`, \`deck-studio\` | \`agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md\` |
| Documentación/contexto/handoff | \`greenhouse-documentation-governor\` | \`docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md\` + \`docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md\` + agent-context router ADR |
| QA/cierre no trivial | \`greenhouse-qa-release-auditor\` | \`pnpm qa:gates --changed\` + skills especializadas que el auditor inyecte |

Las rutas de la tabla son relativas a \`docs/architecture/\` cuando comienzan por nombre de spec o
\`agent-invariants/\`, y relativas a \`docs/operations/\` para operating models.

## Contratos transversales de implementación

- **Calidad:** resolver causa raíz; workaround solo temporal, reversible, documentado y con owner/retiro.
- **API parity:** la UI consume commands/readers/primitives server-side; no crear endpoints como click handlers.
- **Reuso:** buscar helpers, components, routes, signals, capabilities y copy antes de introducir piezas nuevas.
- **Copy:** texto reutilizable/estado/CTA/error/empty/aria vive en \`src/lib/copy/*\`; nomenclatura institucional
  en \`src/config/greenhouse-nomenclature.ts\`.
- **Acceso:** diseñar siempre views + entitlements; roles revocados/expirados nunca confieren acceso.
- **Seguridad:** no improvisar credenciales/pools/bypasses, no imprimir secrets ni raw errors, usar CLIs con
  guardrails y redacción canónica.
- **Local-first:** validar local antes de gastar CI/cloud; no push/merge/release como cierre automático.
- **Multi-agente:** no cambiar branch ni sobrescribir archivos con trabajo ajeno; subagentes solo para trabajo
  paralelo independiente y con ownership claro cuando estén autorizados.
- **Runtime completeness:** código no equivale a operativo. Flags, env, deploy, migrations, backfills, crons,
  webhooks, workers, secrets, data recovery y verificación live forman parte del cierre.

## Contrato UI resumido

Cualquier UI invoca primero \`greenhouse-ai-design-studio\`. Antes de JSX: dirección visual, comparación de
alternativas, primitive lookup, mapping de tokens, wireframe/flow/motion cuando aplique y decisión
\`reuse | extend | new primitive\`. Toda pantalla nueva considera primero \`CompositionShell\`; cards nuevas
nacen adaptables/rich-ready. Usar primitives canónicas para breadcrumbs, sidecars, floating surfaces, motion y
density. Validar desktop + 390 px, teclado, reduced motion y \`scrollWidth === clientWidth\`; GVC es evidencia
primaria. Detalle load-bearing: [\`UI_PLATFORM_AGENT_INVARIANTS.md\`](docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md)
y [\`GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md\`](docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md).

## Tooling operativo

- CLIs autenticados: \`az\`, \`gcloud\`, \`gh\`, \`vercel\`, \`psql\` vía \`pnpm pg:connect\`.
- GCP interactivo local requiere ambos flujos: \`gcloud auth login\` y
  \`gcloud auth application-default login\`.
- macOS usa \`gtimeout\`, no asumir \`timeout\` GNU.
- GVC: \`pnpm fe:capture <scenario> --env=staging\`; review/diff/health según necesidad.
- Antes de una acción sensible, consultar Platform Health/safe modes cuando el dominio lo exponga.

## Git, verificación y cierre

- Preservar cambios ajenos; usar cambios mínimos coherentes y commits enfocados.
- No ejecutar comandos destructivos ni cambiar de branch/worktree compartido sin autorización.
- Validar proporcionalmente: tests/lint/build/manual/runtime según riesgo y dominio.
- Implementaciones no triviales: \`greenhouse-qa-release-auditor\` + \`pnpm qa:gates --changed\`.
- Cierre documental: \`greenhouse-documentation-governor\` + \`pnpm docs:closure-check\`.
- Contexto/handoff: \`pnpm docs:context-check:strict\` antes de cerrar cambios a estos contratos.
- Estado honesto: \`complete | code complete, rollout pendiente | operativamente bloqueado\`.

## Documentación viva

- \`AGENTS.md\`: reglas transversales y router; nunca volver a almacenar specs de dominio inline.
- \`project_context.md\`: estado durable vigente; sin diario ni secciones \`Delta\`.
- \`Handoff.md\`: continuidad activa, máximo 20 sesiones.
- Tasks/issues/ADRs/arquitectura: evidencia y contrato canónico.
- Historia: \`docs/operations/agent-context-history/\`, buscable bajo demanda y nunca auto-cargada completa.
- Toda capacidad mantiene documentación técnica, funcional y manual/runbook proporcional.

## Regla final

No adivinar contratos ni obedecer memoria histórica a ciegas. Resolver la fuente vigente, cargar el contexto
del dominio, preservar evidencia y dejar el siguiente paso ejecutable.
`

const snapshotNames = {
  'AGENTS.md': 'AGENTS.legacy.md',
  'project_context.md': 'project_context.legacy.md',
  'Handoff.md': 'Handoff.legacy.md',
  'Handoff.archive.md': 'Handoff.archive.legacy.md'
}

const manifest = {
  schemaVersion: 'greenhouse-agent-context-snapshot.v1',
  createdAt: '2026-07-19',
  sourceCommit: '2ba11dd5aacb10d5cc34b9bc66bb5763df263a72',
  note: 'Sources include the complete dirty-working-tree contents at migration time. Snapshots are immutable.',
  files: Object.entries(sources).map(([source, contents]) => ({
    source,
    snapshot: `${snapshotRoot}/${snapshotNames[source]}`,
    ...stats(contents)
  }))
}

const snapshotReadme = `# Agent context history — corte 2026-07-19

## Propósito

Preservar íntegramente el contexto anterior a la migración router-first sin mantener más de un millón de tokens
en la lectura obligatoria de cada agente.

## Contenido

- \`AGENTS.legacy.md\`: contrato genérico completo anterior.
- \`project_context.legacy.md\`: estado + deltas históricos anteriores.
- \`Handoff.legacy.md\`: las 1.357 sesiones y contenido completo anterior.
- \`Handoff.archive.legacy.md\`: archivo histórico previo.
- \`manifest.json\`: líneas, caracteres, tokens estimados y SHA-256 de cada snapshot.

## Recuperación segura

1. Buscar primero task, issue, ADR, arquitectura, skill y runtime vigente.
2. Buscar una keyword, no cargar el snapshot entero:
   \`rg -n '<keyword>' ${snapshotRoot}\`.
3. Tratar el resultado como evidencia histórica y contrastarlo contra el estado actual.
4. Si una regla sigue vigente pero no tiene hogar canónico, moverla a la spec/invariante correcta y añadir el
   pointer a \`AGENTS.md\`.

## Integridad

\`pnpm docs:context-check:strict\` recalcula los hashes del manifest. Estos archivos son inmutables: una
corrección posterior se documenta en el dueño vigente, no reescribiendo el snapshot.
`

const writes = {
  'AGENTS.md': agentsRouter,
  'project_context.md': projectContext,
  'Handoff.md': handoffActive,
  'Handoff.archive.md': handoffArchiveIndex
}

console.log('Agent context router migration 2026-07-19')

for (const [source, contents] of Object.entries(sources)) {
  const before = stats(contents)
  const after = stats(writes[source])

  console.log(
    `- ${source}: ${before.lines} -> ${after.lines} lines; ~${before.estimatedTokens} -> ~${after.estimatedTokens} tokens`
  )
}

console.log(`- Legacy sessions retained active: ${activeLegacySessions.length}; migration session adds 1 (total 20)`)
console.log(`- Snapshot directory: ${snapshotRoot}`)

if (!apply) {
  console.log('- Dry run only. Re-run with --apply after reviewing the plan.')
  process.exit(0)
}

if (existsSync(snapshotAbsolute)) {
  throw new Error(`Refusing to overwrite existing immutable snapshot: ${snapshotRoot}`)
}

mkdirSync(snapshotAbsolute, { recursive: true })

for (const [source, contents] of Object.entries(sources)) {
  writeFileSync(path.join(snapshotAbsolute, snapshotNames[source]), contents)
}

writeFileSync(path.join(snapshotAbsolute, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
writeFileSync(path.join(snapshotAbsolute, 'README.md'), snapshotReadme)

for (const [target, contents] of Object.entries(writes)) {
  writeFileSync(path.join(root, target), contents)
}

console.log('- Migration applied. Run pnpm docs:context-check:strict before committing.')
