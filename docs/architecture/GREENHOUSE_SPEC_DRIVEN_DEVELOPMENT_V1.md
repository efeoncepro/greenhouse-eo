# Greenhouse Spec-Driven Development (SDD) — Adoption & Doctrine V1

> **Tipo:** ADR dedicado (policy transversal)
> **Status:** Accepted
> **Date:** 2026-05-24
> **Owner:** Platform / governance (multi-agente)
> **Scope:** Documentación / arquitectura / governance / CI / Task Lifecycle Protocol / multi-agente (Claude, Codex, Cursor)
> **Reversibility:** `two-way` — es una doctrina de proceso; revertir = dejar de promover invariantes a L2 y/o retirar checks puntuales, sin migración de datos.
> **Confidence:** `high` — generaliza un patrón ya probado en el repo (`design:lint`, lint rules, parity tests).
> **Validated as of:** 2026-05-24 — verificado contra `ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`, el Task Lifecycle Protocol vigente, y los gates ejecutables existentes (`design-contract.yml`, `scripts/ci/*.mjs`, `eslint-plugins/greenhouse/`).
> **Decisión canónica de proceso:** complementa `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` y el Task Lifecycle Protocol (`docs/tasks/`)
> **Primera implementación:** TASK-926 complete (`pnpm task:lint`, `--active`, `--changed`, `--task`, `.github/workflows/task-contract.yml`)

## 1. Contexto

Greenhouse ya opera, de facto, como un proyecto **spec-driven**: las specs escritas son la fuente de verdad y el código es un artefacto derivado/verificado contra ellas. Eso vive en:

- `docs/architecture/*_V1.md` — specs canónicas contractuales.
- `docs/tasks/` — pipeline `TASK-###` con template de 4 zonas + lifecycle protocol.
- `DECISIONS_INDEX.md` + ADR operating model — decisiones como fuente de verdad.
- Las "Reglas duras" de `CLAUDE.md` / `AGENTS.md` — invariantes de dominio.

Una auditoría interna (2026-05-24) estimó la madurez SDD del repo en **~70-75%**. La capa de **gobernanza** (templates, ADRs, lifecycle, decision index) está madura. El gap está en la capa de **automatización**: la gran mayoría de los invariantes viven solo como **prosa** — texto que un humano (o agente) lee y debe recordar, pero que **ninguna herramienta verifica**. Cuando un invariante-prosa se viola, nada lo detecta hasta que un humano lo nota (o un cliente/auditor lo sufre).

El repo ya demostró el antídoto en casos puntuales: convertir un invariante-prosa en un **check ejecutable** que corre en CI y rompe el build. Ejemplos vigentes:

| Invariante (prosa) | Versión ejecutable | Gate |
| --- | --- | --- |
| Tokens visibles = runtime theme | `pnpm design:lint` | `design-contract.yml` |
| No `new Pool()` directo | lint rule `greenhouse/no-direct-pg-pool` | CI lint |
| No FX math sin tokenizar | lint rule `greenhouse/no-untokenized-fx-math` | CI lint |
| Migration markers correctos | `scripts/ci/migration-marker-gate.mjs` | CI |
| Cron async-critical no en Vercel | `scripts/ci/vercel-cron-async-critical-gate.mjs` | CI |

El patrón es siempre el mismo: **regla → check ejecutable (lint rule / parity test / linter / gate script) → gate CI**. Pero se aplicó a un puñado de invariantes; el resto sigue siendo prosa.

## 2. Decisión

Greenhouse **adopta Spec-Driven Development como práctica explícita y nombrada**, con una doctrina canónica para promover invariantes de prosa a enforcement ejecutable. La decisión NO es "mecanizar toda la prosa" (eso sería sobre-ingeniería); es **definir cuándo y cómo un invariante merece graduarse a check ejecutable**, y declarar el patrón canónico para hacerlo.

### 2.1 La escalera de promoción (prose → executable)

Todo invariante de Greenhouse vive en uno de tres niveles. La doctrina define cuándo subir de nivel:

| Nivel | Forma | Verificación | Cuándo es suficiente |
| --- | --- | --- | --- |
| **L0 — Prosa** | Regla escrita en spec / CLAUDE.md / ADR | Humana (lectura + memoria del agente) | Invariante nuevo, de baja frecuencia de violación, o cuyo costo de violación es bajo y reversible. |
| **L1 — Revisado** | Regla + checklist en el template / code review / skill | Humana asistida (gate de review, skill obligatoria) | Invariante con blast radius medio donde el review humano todavía escala. |
| **L2 — Ejecutable** | Regla + check (lint rule / parity test / linter / gate script) | Mecánica (CI rompe el build) | Invariante con **alta frecuencia de violación** O **alto costo de violación** O que **todos los agentes deben respetar sin excepción**. |

**Criterio de promoción a L2** (cualquiera de):

1. **Drift recurrente demostrado** — el invariante ya se violó ≥2 veces (evidencia en issues, lifecycle drift, incidentes).
2. **Costo de violación alto/irreversible** — finanzas, payroll, auth, release, migrations, datos de cliente.
3. **Recurso compartido cross-agente** — todos los agentes (Claude, Codex, Cursor) lo tocan y la disciplina humana no escala.
4. **Verificación barata** — existe una forma mecánica de chequearlo sin falsos positivos significativos.

Si ninguno aplica, el invariante **se queda en L0/L1** deliberadamente. No se promueve por reflejo.

### 2.2 Patrón canónico de promoción a L2

Cuando un invariante se promueve a L2, sigue el shape ya probado en el repo:

1. **Check declarativo** — lint rule en `eslint-plugins/greenhouse/`, parity test (`*.live.test.ts`), o gate script en `scripts/ci/*.mjs`. Catálogo de reglas en data, no en branches hardcodeados.
2. **Rollout warn-first** — el check nace en modo `warning` (no bloquea) hasta confirmar 0 falsos positivos sobre el backlog real; flip a `error` en un paso posterior verificado.
3. **Legacy-exempt explícito** — el backlog histórico que no puede cumplir el contrato se clasifica como exento, no como deuda bloqueante. La deuda pre-existente se tría como limpieza separada, nunca como bloqueo del flujo activo.
4. **Gate CI** — workflow propio (espejo de `design-contract.yml`) con path-filtering, o step en `ci.yml`.
5. **La prosa permanece** — el ADR / regla dura sigue siendo la fuente del *porqué*; el check es el *enforcement*. No se borra la prosa al agregar el check.

### 2.3 Anti-goals (qué NO hace esta decisión)

- **NO** convertir cada "Regla dura" de CLAUDE.md en una lint rule. La mayoría se queda en L0/L1 a propósito — el costo de mantener cientos de checks frágiles supera el beneficio.
- **NO** bloquear el flujo activo con deuda pre-existente. Todo check L2 nace warn-first + legacy-exempt.
- **NO** reescribir el backlog legacy (`CODEX_TASK_*`, specs pre-template) para que pase checks nuevos.
- **NO** generar código desde las specs automáticamente (full "regenerate from spec"). Greenhouse usa SDD para **verificar** intención contra implementación, no para code-gen.

## 3. Estado actual y roadmap de implementación

SDD es un **programa**, no una task. Se ejecuta incrementalmente bajo esta doctrina.

| Pieza | Gap del audit | Estado |
| --- | --- | --- |
| `pnpm task:lint` — compliance del Task Protocol (zonas, paridad lifecycle↔carpeta, paridad registry, next-id marker, boundary de deuda activa) | #3 | **TASK-926 complete** (primera implementación de este ADR; `--changed`/`--task` estrictos y `--active` para deuda post-adopción) |
| Files-owned collision detector (reusa parser de TASK-926) | #1 | Follow-up declarado |
| Parity tipos runtime ↔ OpenAPI (`platform-health.v1` y siblings) | #2 | Follow-up |
| Enforcement de sync spec↔código en PRs que cambian comportamiento | #4 | Follow-up |
| Instrumentación del Plan Mode (plan→slices→commits→verificación) | #5 | Follow-up |

Cada follow-up, al crearse, declara en su Zone 1 que implementa este ADR y a qué nivel de promoción (L0→L2) lleva qué invariante.

## 4. Consecuencias

**Positivas:**
- Los invariantes de mayor riesgo dejan de depender de la memoria del agente.
- Hay un criterio explícito y compartido para decidir qué se mecaniza (evita tanto la sub-automatización como la sobre-ingeniería).
- Cualquier agente (Claude, Codex, Cursor) hereda los gates al clonar el repo.

**Costos / riesgos:**
- Cada check L2 es código que se mantiene; mal calibrado genera falsos positivos que erosionan confianza (mitigado por warn-first + legacy-exempt).
- Riesgo de "promover por reflejo" — mitigado por el criterio explícito de §2.1.

## 5. Alternatives Considered

- **No nombrar SDD; seguir ad-hoc.** Rechazada: el patrón ya se aplica de facto pero sin criterio compartido, lo que produce tanto sub-automatización (invariantes de alto riesgo en prosa) como riesgo de sobre-ingeniería (promover por reflejo). Sin doctrina, cada agente decide distinto.
- **Mecanizar todos los invariantes de prosa (full executable specs).** Rechazada: cientos de checks frágiles cuyo costo de mantenimiento + falsos positivos supera el beneficio. Viola la regla de no agregar abstracción más allá de lo necesario.
- **Code-gen desde specs (regenerate-from-spec).** Rechazada para V1: Greenhouse usa SDD para *verificar* intención contra implementación, no para generar código. Code-gen introduce un acoplamiento spec→runtime que el repo no necesita hoy.
- **Un único linter monolítico de "todo".** Rechazada: contradice el patrón canónico ya probado (checks pequeños y declarativos por dominio: `design:lint`, lint rules, parity tests). Se prefiere la composición.

## 6. Relación con otras decisiones

- **Subordina operativamente** al ADR operating model (`ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`): este ADR define *cómo* los invariantes se vuelven ejecutables; aquel define *dónde* viven las decisiones.
- **Generaliza** el patrón ya aceptado en: `DESIGN.md refleja runtime` (TASK-764, `design:lint`), governance tables FK + migration marker gate (TASK-838/ISSUE-068), smoke navigation contract (ISSUE-073).
- **Es implementado por** TASK-926 y sus follow-ups.

## 7. Runtime Contract

Fuente de verdad de esta decisión:

- **Doctrina canónica:** este documento (`docs/architecture/GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md`) — la escalera de promoción L0→L1→L2 (§2.1) y el patrón canónico de promoción (§2.2) son el contrato que todo agente respeta al decidir si un invariante se mecaniza.
- **Índice:** `docs/architecture/DECISIONS_INDEX.md` (fila Accepted que apunta acá).
- **Implementaciones L2 vigentes (precedente vinculante del patrón):** `pnpm design:lint` + `.github/workflows/design-contract.yml`; lint rules en `eslint-plugins/greenhouse/` (`no-direct-pg-pool`, `no-untokenized-fx-math`); gate scripts en `scripts/ci/*.mjs`; parity tests `*.live.test.ts`.
- **Primera implementación derivada de este ADR:** TASK-926 complete (`pnpm task:lint`, `pnpm task:lint --active`, `--changed`, `--task TASK-###` + `.github/workflows/task-contract.yml`).
- No introduce schema, evento, route ni capability nuevos: el contrato es de proceso/governance, materializado en checks ejecutables existentes y futuros.

## 8. Revisit When

Reabrir esta decisión (nuevo ADR que la supersede) si:

- El criterio de promoción de §2.1 produce falsos positivos sistémicos o checks que erosionan confianza más de lo que protegen (señal: PRs bloqueados por checks mal calibrados con frecuencia).
- Emerge una necesidad real de code-gen desde specs (regenerate-from-spec) que justifique mover SDD de "verificación" a "generación".
- El volumen de checks L2 vuelve inmanejable su mantenimiento (señal: deuda de checks rotos/desactivados).
- Cambia el modelo de agentes/CI de forma que el patrón "regla → check declarativo → gate CI" deje de ser el canónico del repo.
