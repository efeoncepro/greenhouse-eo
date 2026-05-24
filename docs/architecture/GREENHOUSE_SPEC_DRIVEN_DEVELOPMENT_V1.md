# Greenhouse Spec-Driven Development (SDD) — Adoption & Doctrine V1

> **Tipo:** ADR / policy de arquitectura
> **Status:** Accepted (model)
> **Scope:** Documentación / arquitectura / governance / CI / multi-agente
> **Creado:** 2026-05-24
> **Decisión canónica de proceso:** complementa `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` y el Task Lifecycle Protocol (`docs/tasks/`)
> **Primera implementación:** TASK-926 (`pnpm task:lint`)

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
| `pnpm task:lint` — compliance del Task Protocol (zonas, paridad lifecycle↔carpeta, paridad registry, next-id marker) | #3 | **TASK-926** (to-do, primera implementación de este ADR) |
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

## 5. Relación con otras decisiones

- **Subordina operativamente** al ADR operating model (`ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`): este ADR define *cómo* los invariantes se vuelven ejecutables; aquel define *dónde* viven las decisiones.
- **Generaliza** el patrón ya aceptado en: `DESIGN.md refleja runtime` (TASK-764, `design:lint`), governance tables FK + migration marker gate (TASK-838/ISSUE-068), smoke navigation contract (ISSUE-073).
- **Es implementado por** TASK-926 y sus follow-ups.
