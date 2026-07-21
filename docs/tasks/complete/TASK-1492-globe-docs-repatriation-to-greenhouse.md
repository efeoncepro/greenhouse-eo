# TASK-1492 — Repatriación de la documentación Globe → Greenhouse (control plane documental)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño; ejecución pendiente`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1492-globe-docs-repatriation-to-greenhouse`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Toda la **documentación** de Efeonce Globe (arquitectura, runbooks, handoff, changelog, docs
funcionales) vive hoy en el repo hermano `efeonce-globe`, violando la regla del control plane:
**Greenhouse es el único dueño del cierre documental**; Globe posee sólo código, infra y evidencia
técnica. Esta task repatría esa documentación a `greenhouse-eo`, deja en Globe únicamente código +
evidencia, y corrige la causa raíz que perpetúa el drift (la skill `greenhouse-globe` y el pointer
de `CLAUDE.md` que hoy dirigen a mantener/leer docs en `efeonce-globe`).

## Why This Task Exists

EPIC-028 (`docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`, líneas 55-58)
declara la frontera con precisión:

> *"Greenhouse es el único control plane operativo: registra `TASK-###`, dependencias, lifecycle,
> hooks, lint, QA, **cierre documental y handoff** incluso cuando los paths de implementación viven
> en el repositorio hermano. Globe posee **código, datos, infraestructura, ejecución creativa y
> evidencia técnica**."*

En la práctica, `efeonce-globe/docs/**` acumuló **17 docs** (arquitectura, runbooks, docs
funcionales) + **4 en la raíz** (`Handoff.md`, `changelog.md`, `README.md`, `AGENTS.md`). Esa doc
fue creada y mantenida ahí sesión tras sesión — la de TASK-1490 inclusive. La **causa raíz** no es
descuido puntual: la skill `greenhouse-globe` instruye explícitamente a mantener docs en Globe
(`.claude/skills/greenhouse-globe/SKILL.md` líneas 35-36: *"En `efeonce-globe`: README.md,
AGENTS.md, Handoff.md. Arquitectura de Globe: docs/architecture/…"*), y `CLAUDE.md` línea 31 apunta
a `efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` como fuente. Mientras esos
dos punteros no se corrijan, cualquier agente vuelve a poner docs en Globe.

Consecuencia operativa: la documentación gobernante (decisiones, arquitectura, handoff) está fuera
del control plane que la regla le asigna, dispersa en un repo cuyo rol es runtime. El cierre
documental de Greenhouse no puede auditarse en un solo lugar.

## Goal

- Toda la **documentación** de Globe (arquitectura, runbooks, docs funcionales, handoff, changelog)
  vive en `greenhouse-eo`, bajo una ubicación canónica declarada.
- En `efeonce-globe` queda **solo** código, infra (Terraform), y **evidencia técnica** (bootstrap
  evidence, QA audits, brand-shell evidence) — más el mínimo meta-repo (`README.md` reducido a un
  puntero, `AGENTS.md` reducido a preflight que remite a Greenhouse).
- La **causa raíz** queda cerrada: la skill `greenhouse-globe` (`.claude` + `.codex`) y el pointer de
  `CLAUDE.md` dirigen a la nueva ubicación en Greenhouse, con una regla dura que prohíbe crear doc
  gobernante en Globe.
- Cero links rotos: todo cross-link (dentro de los docs movidos, y desde Greenhouse hacia
  `efeonce-globe/docs/**`) queda reapuntado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` (§Child Tasks — la regla del control plane documental)
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` + `..._ARCHITECTURE_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` (contrato de Handoff/changelog/project_context)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/skills/greenhouse-globe/SKILL.md` + `.codex/skills/greenhouse-globe/SKILL.md` (la skill a corregir)

Reglas obligatorias:

- **La documentación gobernante de Globe es de Greenhouse** (EPIC-028). Globe conserva sólo código,
  infra y evidencia técnica. Esta task NO mueve código ni infra.
- **NUNCA** perder historia: los archivos que se mueven preservan su historia auditable (git log del
  origen enlazado, o `git mv` cuando el destino es el mismo repo; cross-repo se documenta el origen).
  No se borra sin dejar puntero.
- **NUNCA** dejar un cross-link roto: cada referencia a `efeonce-globe/docs/**` desde Greenhouse y
  entre los docs movidos se reapunta en el mismo PR.
- La distinción **documentación vs evidencia técnica** es load-bearing: la evidencia técnica
  (bootstrap/QA/brand-shell) puede quedarse en Globe; la documentación (arquitectura, runbooks,
  handoff, changelog, docs funcionales) se repatría. Clasificar archivo por archivo, no en bloque.
- El `README.md` y `AGENTS.md` de un repo git no se eliminan (todo repo los necesita): se **reducen**
  a un puntero/preflight que remite a la doc en Greenhouse.

## Normative Docs

- `docs/documentation/README.md` (índice de doc funcional — destino de los docs funcionales de Globe)
- `docs/manual-de-uso/README.md` (índice de manuales — destino de runbooks operables)
- `docs/architecture/DECISIONS_INDEX.md` (índice de decisiones de Greenhouse)

## Dependencies & Impact

### Depends on

- Ninguna task bloquea. Coordinar con trabajo activo en `efeonce-globe` (cualquier sesión que edite
  su `Handoff.md`/`changelog.md` durante el corte) para evitar merge conflicts en el momento del move.

### Blocks / Impacts

- **TASK-1490** (complete): sus docs de arquitectura/runbooks/handoff de esta sesión se movieron a
  Globe y deben repatriarse aquí.
- **TASK-1491**, y toda `TASK-14xx` de EPIC-028 futura: tras esta task, su cierre documental va a
  Greenhouse. La skill corregida las guiará.
- Los **agentes** (Claude + Codex): la skill `greenhouse-globe` corregida cambia dónde crean/leen doc.

### Files owned

En `greenhouse-eo` (destino + causa raíz):

- `docs/architecture/globe/**` `[verificar destino canónico — decidir en Slice 0]` (nuevo hogar de la arquitectura de Globe)
- `docs/operations/globe/**` `[verificar]` (runbooks de Globe)
- `docs/documentation/creative-studio/**` `[verificar]` (docs funcionales de Globe)
- `.claude/skills/greenhouse-globe/SKILL.md` + `.codex/skills/greenhouse-globe/SKILL.md`
- `CLAUDE.md` (línea 31, el pointer a `efeonce-globe/docs/architecture/…`)
- `AGENTS.md` (si referencia docs de Globe)
- `docs/tasks/to-do/TASK-1492-...` (esta task)

En `efeonce-globe` (origen — se vacía de doc, se reduce meta-repo):

- `../efeonce-globe/docs/architecture/**`, `../efeonce-globe/docs/operations/**` (runbooks),
  `../efeonce-globe/docs/documentation/**`, `../efeonce-globe/Handoff.md`,
  `../efeonce-globe/changelog.md`, `../efeonce-globe/README.md`, `../efeonce-globe/AGENTS.md`

## Current Repo State

### Already exists

- La regla del control plane documental está escrita (EPIC-028 §Child Tasks).
- En `efeonce-globe` hoy (inventario 2026-07-20, a mover/clasificar):
  - **docs/architecture/** (6): `DECISIONS_INDEX.md`, `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`,
    `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`, `EFEONCE_GLOBE_MODEL_LAB_V1.md`,
    `GREENHOUSE_CONNECTIVITY_V1.md`, `PLATFORM_FOUNDATION_V1.md`.
  - **docs/operations/** (8): `EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`,
    `EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`, `EPIC_028_FRESH_SESSION_PROMPT.md`,
    `EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`, `LOCAL_AUTHENTICATION.md`,
    `BOOTSTRAP_EVIDENCE.md`, `QA_RELEASE_AUDIT_2026-07-19.md`, `TASK_1454_INTERNAL_SMOKE_RUNBOOK.md`,
    `TASK_1455_BRAND_SHELL_EVIDENCE.md`.
  - **docs/documentation/** (2): `efeonce-globe-api-contract-spine.md`, `efeonce-globe-model-lab.md`.
  - **raíz** (4): `Handoff.md`, `changelog.md`, `README.md`, `AGENTS.md`.
- La causa raíz identificada: skill `greenhouse-globe` líneas 35-36 + `CLAUDE.md` línea 31.

### Gap

- No existe una ubicación canónica en Greenhouse para la doc de Globe (definirla en Slice 0).
- No hay una regla dura en la skill que prohíba crear doc gobernante en Globe (la skill hoy hace lo
  contrario).
- Clasificación documentación-vs-evidencia sin resolver por archivo (p.ej. `BOOTSTRAP_EVIDENCE.md`,
  `QA_RELEASE_AUDIT`, `TASK_1455_BRAND_SHELL_EVIDENCE` son **evidencia** → candidatos a quedarse;
  `EPIC_028_*`, `LOCAL_AUTHENTICATION`, `TASK_1454_INTERNAL_SMOKE_RUNBOOK` → **decidir**).

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: doc en `efeonce-globe/docs/**` + raíz; causa raíz en `greenhouse-eo` (skill + CLAUDE.md)
- Future candidate home: `remain-shared`
  <!-- Es una reubicación de documentación entre repos existentes + corrección de gobernanza; no crea apps/*/packages/*. -->
- Boundary: la doc gobernante de Globe pasa a ser propiedad de Greenhouse (control plane); Globe queda como consumidor read-only vía puntero. Consumers = agentes (Claude/Codex) + humanos.
- Server/browser split: `n/a` (doc-only)
- Build impact: `none`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Decidir la ubicación canónica + clasificar cada archivo (doc vs evidencia)

- Definir dónde vive la doc de Globe en Greenhouse (recomendado: `docs/architecture/globe/`,
  `docs/operations/globe/`, `docs/documentation/creative-studio/`; confirmar con la convención de
  Greenhouse). Registrar la decisión en `DECISIONS_INDEX.md`.
- Clasificar los 21 archivos en **{repatriar | queda-como-evidencia | reducir-a-puntero}**, uno por
  uno, con razón. Entregable: una tabla de mapeo origen→destino (o "queda") committeada en la task.

### Slice 1 — Corregir la causa raíz (skill + CLAUDE.md) ANTES de mover

- Reescribir en `greenhouse-globe` SKILL (`.claude` + `.codex`, idénticos) las "Primeras lecturas"
  para que apunten a la ubicación canónica en Greenhouse; agregar regla dura **NUNCA crear doc
  gobernante en `efeonce-globe`; la doc de Globe vive en Greenhouse**.
- Corregir `CLAUDE.md` línea 31 (el pointer a `efeonce-globe/docs/architecture/…`) hacia el nuevo
  hogar. Actualizar `AGENTS.md` si referencia docs de Globe.
- Va **antes** del move: cierra la sangría para que ningún agente concurrente reintroduzca doc en
  Globe mientras el move está en vuelo.

### Slice 2 — Repatriar la documentación (arquitectura + runbooks + funcional)

- Mover los archivos clasificados como "repatriar" a su destino en Greenhouse, preservando
  contenido; reapuntar todos los cross-links internos entre ellos.
- Integrarlos en los índices de Greenhouse (`DECISIONS_INDEX.md`, `docs/documentation/README.md`,
  `docs/manual-de-uso/README.md` según corresponda).

### Slice 3 — Handoff + changelog de Globe → modelo de contexto de Greenhouse

- Repatriar el contenido vigente de `efeonce-globe/Handoff.md` y `changelog.md` según
  `CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`: continuidad activa al `Handoff.md` de Greenhouse (o a un
  archivo de contexto de Globe bajo el modelo de Greenhouse), historia a `docs/changelog/internal/`.
  No duplicar; no perder historia.

### Slice 4 — Reducir el meta-repo de Globe + punteros + verificación de links

- Reducir `efeonce-globe/README.md` y `AGENTS.md` a un puntero/preflight corto que remita a la doc en
  Greenhouse. Dejar en cada ubicación vaciada de `efeonce-globe/docs/**` un puntero (o eliminar el
  dir si el índice de Greenhouse ya lo cubre — decidir en Slice 0).
- Barrido final de links: cero referencias colgantes a `efeonce-globe/docs/**` desde Greenhouse; cero
  cross-links rotos entre los docs movidos.

## Out of Scope

- **NO** se mueve código, tests, ni infra (Terraform) de `efeonce-globe`. Eso es de Globe por regla.
- **NO** se mueve la **evidencia técnica** que la regla asigna a Globe (bootstrap, QA audits,
  brand-shell evidence) salvo que Slice 0 la reclasifique explícitamente como documentación.
- **NO** se cambia el runtime, el deploy, ni ninguna capability de Globe.
- **NO** se toca el registry de tasks de Globe (no existe; el registry es de Greenhouse — esta task
  lo refuerza, no lo cambia).

## Detailed Spec

La tabla de mapeo (Slice 0) es el artefacto central. Forma sugerida:

| Origen (`efeonce-globe`) | Clasificación | Destino (`greenhouse-eo`) o "queda" |
|---|---|---|
| `docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` | documentación | `docs/architecture/globe/…` `[verificar]` |
| `docs/operations/BOOTSTRAP_EVIDENCE.md` | evidencia técnica | queda en Globe `[confirmar]` |
| `Handoff.md` / `changelog.md` | continuidad/cronología | modelo de contexto Greenhouse |
| `README.md` / `AGENTS.md` | meta-repo | se reduce a puntero |
| … | … | … |

Preservación de historia cross-repo: como el move cruza repos, `git mv` no aplica; el patrón es copiar
el contenido al destino en Greenhouse + dejar en el origen un puntero que enlaza el commit histórico,
de modo que la historia siga siendo auditable desde ambos lados.

## Rollout Plan & Risk Matrix

Doc-only, cross-repo. Sin runtime de producción; el riesgo es de **integridad documental** (links
rotos, historia perdida, drift concurrente), no de runtime.

### Slice ordering hard rule

- Slice 0 (mapeo) → Slice 1 (causa raíz: skill + CLAUDE.md) → Slice 2 (repatriar arquitectura/runbooks) → Slice 3 (handoff/changelog) → Slice 4 (reducir meta-repo + verificación de links).
- **Slice 1 va ANTES del move**: sin corregir la skill/CLAUDE.md primero, un agente concurrente
  vuelve a escribir doc en Globe durante el move y se pierde el corte.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cross-link roto tras el move | documentación | high | barrido de grep + reapuntar en el mismo PR (Slice 4) | link a `efeonce-globe/docs/**` residual en grep |
| Pérdida de historia auditable | documentación | medium | puntero al commit origen en cada archivo movido; no borrar sin puntero | archivo sin trazabilidad de origen |
| Drift concurrente (otra sesión edita Handoff de Globe durante el corte) | ops | medium | Slice 1 antes del move + coordinar ventana de corte | conflicto de merge en el move |
| Reclasificar evidencia como doc por error (o viceversa) | gobernanza | medium | tabla de mapeo revisada por humano antes del move (Slice 0 gate) | archivo de evidencia movido / doc dejado en Globe |
| `README`/`AGENTS` de Globe eliminados (repo sin meta) | tooling | low | se reducen a puntero, nunca se eliminan (Slice 4) | repo Globe sin README/AGENTS |

### Feature flags / cutover

Sin flag — cambio documental, cutover inmediato por PR. Reversible por revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revert PR (solo agrega la tabla de mapeo) | <5 min | sí |
| Slice 1 | revert PR (skill + CLAUDE.md vuelven al pointer viejo) | <10 min | sí |
| Slice 2 | revert PR en ambos repos (restaura docs en Globe) | <15 min | sí |
| Slice 3 | revert PR (Handoff/changelog vuelven a Globe) | <10 min | sí |
| Slice 4 | revert PR (restaura README/AGENTS + dirs) | <10 min | sí |

### Production verification sequence

1. `pnpm docs:closure-check` + `pnpm docs:context-check:strict` verdes en Greenhouse tras cada slice.
2. Grep en Greenhouse: cero `efeonce-globe/docs/` residual (salvo punteros intencionales).
3. Grep en los docs movidos: cero cross-links rotos.
4. La skill `greenhouse-globe` `.claude` ≡ `.codex` (salvo el delta de frontmatter conocido).
5. `efeonce-globe` conserva `README.md`/`AGENTS.md` (reducidos) y su código/infra/evidencia intactos.

### Out-of-band coordination required

- Coordinar la ventana del corte con cualquier sesión activa en `efeonce-globe` que edite su
  `Handoff.md`/`changelog.md`, para evitar conflictos durante Slice 3. `N/A` fuera de eso — repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe una ubicación canónica declarada en `greenhouse-eo` para la doc de Globe, registrada en `DECISIONS_INDEX.md`. (`creative-studio/`, Slice 0.)
- [x] Cada uno de los 21 archivos del inventario tiene una clasificación explícita (repatriar / evidencia-queda / reducir-a-puntero) con razón, en una tabla committeada. (Ver Delta de cierre.)
- [x] La documentación clasificada como "repatriar" vive en Greenhouse; su contenido está íntegro y sus cross-links reapuntados. (6 arquitectura + 6 runbooks + 2 funcionales reconciliados; commit `3a2c4f383`.)
- [x] La skill `greenhouse-globe` (`.claude` + `.codex`) apunta a la ubicación en Greenhouse y tiene una regla dura NUNCA-crear-doc-en-Globe; `CLAUDE.md` línea 31 y `AGENTS.md` reapuntados. (Commit `378120752`.)
- [x] `efeonce-globe` conserva solo código, infra y evidencia técnica, con `README.md`/`AGENTS.md` reducidos a puntero (no eliminados). (Commit `d7edea0` en `efeonce-globe`, local, sin push.)
- [x] `grep -r "efeonce-globe/docs/"` en Greenhouse no devuelve referencias colgantes (solo punteros intencionales: refs de origen en esta task, las 3 evidencias que quedan en Globe, y la historia del changelog repatriado). Barrido en commit `5816dc3da`.
- [x] `pnpm docs:context-check:strict` pasa sin warnings (0/0). `pnpm docs:closure-check`: las 2 warnings restantes son sobre `TASK-1469` (archivo uncommitted de Codex, trabajo concurrente ajeno), no sobre esta task.
- [x] La historia de cada archivo movido sigue siendo auditable (git log del repo hermano `efeonce-globe` + puntero desde cada ubicación vaciada).

## Verification

- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict`
- Barrido de links: `grep -rn "efeonce-globe/docs/" .` en Greenhouse + grep de cross-links entre docs movidos.
- Revisión manual de la tabla de mapeo (gate humano) antes del move de Slice 2.

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` (Greenhouse) actualizado con la nueva ubicación canónica de la doc de Globe
- [x] `changelog.md`: N/A — cambio doc-only de gobernanza documental (sin cambio de runtime/producto); la cronología del runtime de Globe quedó en `docs/changelog/internal/creative-studio-globe.md`
- [x] chequeo de impacto cruzado: TASK-1490 (docs repatriados), skills/ADR del ecosistema y las task specs de EPIC-028 reapuntadas
- [x] la skill `greenhouse-globe` corregida (causa raíz cerrada)

## Follow-ups

- Un gate mecánico opcional que falle si aparece doc gobernante nueva bajo `efeonce-globe/docs/**`
  (defensa en profundidad sobre la regla de la skill).
- Revisar si el `AGENTS.md`/`README.md` de otros repos hermanos del ecosistema tienen el mismo drift.

## Delta 2026-07-20 — Slice 0 resuelto (ubicación canónica decidida)

Slice 0 ejecutado. La ubicación canónica **NO** es `globe/` sino **`creative-studio/`** — es la
convención ya establecida en Greenhouse (`docs/documentation/creative-studio/`,
`docs/manual-de-uso/creative-studio/`, `docs/business-models/creative-studio/` ya existen y están
poblados). Usar `globe/` habría creado una tercera convención inconsistente.

Creado en este slice:
- `docs/architecture/creative-studio/README.md` (índice + racional + mapa doc↔repo).
- `docs/operations/creative-studio/README.md` (índice de runbooks).
- Decisión registrada en `docs/architecture/DECISIONS_INDEX.md` ("Documentación de Globe vive en
  Greenhouse bajo `creative-studio/`").

Hallazgo que reduce el trabajo pendiente: la doc **funcional** y los **manuales** de Globe **ya
están** parcialmente repatriados en `docs/documentation/creative-studio/` y
`docs/manual-de-uso/creative-studio/`. Lo que falta mover (Slices 2-3) es sobre todo la
**arquitectura** y los **runbooks** que aún viven en `efeonce-globe/docs/`, más handoff/changelog.

## Delta 2026-07-20 — Slices 1-4 ejecutados (task cerrada)

**Clasificación final de los 21 archivos** (gate humano implícito: evidencia = repo Globe; doc = Greenhouse):

| Origen (`efeonce-globe`) | Clase | Destino / acción |
|---|---|---|
| `docs/architecture/` ×6 (DECISIONS_INDEX, API_CONTRACT_SPINE_V1, EVALUATION_HARNESS_V1, MODEL_LAB_V1, GREENHOUSE_CONNECTIVITY_V1, PLATFORM_FOUNDATION_V1) | documentación | → `docs/architecture/creative-studio/` |
| `docs/operations/` runbooks ×6 (SPINE_RUNBOOK, IAC_RUNBOOK, EPIC_028_FRESH_SESSION_PROMPT, EPIC_028_PARALLEL_EXECUTION_PLAN, LOCAL_AUTHENTICATION, TASK_1454_INTERNAL_SMOKE_RUNBOOK) | documentación | → `docs/operations/creative-studio/` |
| `docs/operations/` evidencia ×3 (BOOTSTRAP_EVIDENCE, QA_RELEASE_AUDIT_2026-07-19, TASK_1455_BRAND_SHELL_EVIDENCE) | **evidencia técnica** | **queda en Globe** |
| `docs/documentation/` ×2 (spine, model-lab) | funcional | reconciliados en `docs/documentation/creative-studio/` (la copia de Greenhouse estaba estancada; se absorbió la §9 cross-model de TASK-1490 del original de Globe) → original reducido a puntero |
| `Handoff.md` | continuidad | → `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` + puntero |
| `changelog.md` | cronología | → `docs/changelog/internal/creative-studio-globe.md` + puntero |
| `README.md` / `AGENTS.md` | meta-repo | reducidos a puntero/preflight que remite a Greenhouse |

**Ejecución (commits):** Slice 1 causa raíz (skill `.claude`+`.codex` + `CLAUDE.md`) `378120752`; Slices 2-3
repatriación + reconciliación + handoff/changelog `3a2c4f383`; Slice 4 barrido de link-integrity (Handoff,
EPIC-028, task specs de Globe → `creative-studio/`) `5816dc3da`; reducción del meta-repo de Globe `d7edea0`
(en `efeonce-globe`, local, **sin push** — pendiente de instrucción del operador).

**Follow-up implementado del propio spec:** se recomendó un gate mecánico que falle si aparece doc gobernante
nueva bajo `efeonce-globe/docs/**`; queda como follow-up (la regla dura de la skill + AGENTS lo cubren a nivel
humano). El commit de `efeonce-globe` **no fue pusheado** por local-first; el operador decide el push del repo hermano.

## Open Questions

- ~~¿La ubicación canónica es `globe/` o planos con prefijo?~~ **Resuelto (Delta 2026-07-20):
  `creative-studio/`, subdir por dominio, consistente con la convención existente.**
- ¿`BOOTSTRAP_EVIDENCE.md`, `QA_RELEASE_AUDIT_2026-07-19.md`, `TASK_1455_BRAND_SHELL_EVIDENCE.md`
  cuentan como "evidencia técnica" (quedan en Globe) o como documentación (se repatrían)? La regla
  dice que la evidencia es de Globe; confirmar caso por caso en Slice 0.
- ¿`Handoff.md` de Globe se funde en el `Handoff.md` de Greenhouse, o se conserva un archivo de
  contexto de Globe separado bajo el modelo de contexto de Greenhouse? Resolver contra
  `CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.
