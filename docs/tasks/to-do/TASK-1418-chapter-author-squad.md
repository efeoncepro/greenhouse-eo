# TASK-1418 — Chapter-author de equipo/squad: la lámina `team-gallery` desde el roster real (fotos allowlist, nunca IA)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-029`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (TASK-1415 shipped; el motor no se toca)
- Branch: `task/TASK-1418-chapter-author-squad`

## Status delta

Ninguno.

## Summary

El **tercer chapter-author productivo**: la lámina de equipo (`contentType: team-gallery` → `TeamGalleryFull`) autorada desde el **roster real** del squad propuesto — nombres, roles y dedicaciones vienen de datos de members/asignaciones (o del squad blueprint del deal), **jamás del LLM**; las fotos se resuelven por el resolver `squad-person` (allowlist cerrada de fotos reales — una cara generada con IA es tergiversación, invariante duro del dominio). El LLM sólo enmarca: título, `sectionLabel`, `rosterMeta`. Implementa la interface `ChapterAuthor` de TASK-1415 sin tocarla. Golden del eval: la lámina `equipo` del deck SKY real.

## Why This Task Exists

La lámina de equipo es la extensión natural del anti-fabricación a **identidades**: en una oferta, inventar una persona, inflar una dedicación o usar una cara sintética es tergiversación ante un comité. El motor ya garantiza que las cifras no viajen por el LLM; este author extiende el mismo patrón a personas (nombre/rol/dedicación = hechos; foto = allowlist del catálogo). Además, la dedicación conecta con la doctrina comercial (capacidad gobernada, nunca horas): el % que se muestra debe salir del staffing real del deal, no de la prosa del modelo.

## Goal

- `deriveSquadFacts(roster) → SquadFacts` puro: un hecho por persona (nombre, rol, `dedication` %, clave de foto del allowlist) + `evidenceRef` a la fuente del roster (asignación/blueprint + fecha).
- `squadChapterAuthor`: framing = título/sectionLabel/rosterMeta (texto); validador fail-closed con los límites reales de `team-gallery-full.slots.json` + rechazo de una persona/foto fuera de los hechos; `toSlides` inyecta `members[]` completos desde hechos.
- Eval baseline con golden = lámina `equipo` de SKY (fixture frozen) + adversariales (persona inventada, dedicación alterada, foto fuera de allowlist).
- Corrida real end-to-end con render y frame revisado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §5-ter (Delta 2026-07-16).
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` §Chapter-author engine + anti-fabricación (**NUNCA una cara del squad generada con IA**; fotos = allowlist cerrada del resolver).
- Doctrina comercial: capacidad gobernada, nunca horas ni piezas (skill `creative-practice` / `commercial-expert`) — la dedicación es un dato de staffing, no copy.

Reglas obligatorias:

- **NUNCA** una persona, rol, dedicación o foto que no venga de los hechos del roster — el framing no puede agregar ni renombrar members.
- **NUNCA** una clave de foto fuera del allowlist `squad-person` (`catalogs/deck-axis/resolvers.ts` — el resolver ya falla cerrado; el validador del author lo anticipa).
- **NUNCA** tocar `chapter-author.ts`/`eval-harness.ts`.

## Normative Docs

- `src/lib/commercial/tenders/proposals/authoring/diagnostico-chapter-author.ts` — el molde vivo.
- `src/lib/artifact-composer/catalogs/deck-axis/team-gallery-full.slots.json` + `resolvers.ts` (`squad-person`) — el contrato de la lámina.
- `docs/commercial/tenders/sky-blog-2026/deck-plan.json` → slide `equipo` — el golden.

## Dependencies & Impact

### Depends on

- TASK-1415 (shipped): interface + harness.
- Una fuente de roster: members/asignaciones de Greenhouse o el squad blueprint del workspace del deal `[verificar en Discovery cuál es el reader canónico del staffing propuesto de un deal — si no existe reader estructurado, el roster entra como hechos del operador pre-evidenciados, patrón Semrush]`.

### Blocks / Impacts

- Alimenta al orquestador (TASK-1419) con su tercer capítulo productivo.

### Files owned

- `src/lib/commercial/tenders/proposals/authoring/squad-facts.ts` (nuevo)
- `src/lib/commercial/tenders/proposals/authoring/squad-chapter-author.ts` (nuevo)
- `src/lib/commercial/tenders/proposals/authoring/__tests__/squad-*.test.ts` + fixture golden (nuevos)
- `scripts/commercial/_sanity-squad-chapter-author.ts` (nuevo)

## Current Repo State

### Already exists

- El motor completo (TASK-1415). `TeamGalleryFull` probado con la lámina SKY real (5+ personas con foto/rol/dedicación). El resolver `squad-person` con allowlist cerrada. El patrón "hechos del operador pre-evidenciados" para fuentes sin reader estructurado.

### Gap

- No existe mapper roster→hechos ni author de squad. `[verificar]` si el % de dedicación por deal vive estructurado en algún lado (asignaciones/capacity) o es dato del operador al armar la oferta.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/tenders/proposals/authoring/`
- Future candidate home: `domain-package`
- Boundary: el author consume el contrato del roster (reader de people/agency si existe, o hechos del operador); el motor no se toca; las claves de foto pertenecen al catálogo (el author sólo referencia claves del allowlist).
- Server/browser split: **server-only** (roster y LLM server-side; el browser no participa).
- Build impact: `none`.
- Extraction blocker: si el roster sale de un reader de people/agency, es un port cross-dominio más a declarar (se suma a Grader y pricing).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: roster real (members/asignaciones o blueprint del deal) como input read-only; `AuthoredSlide[]` como output.
- Consumidores afectados: orquestador (TASK-1419), Nexa/MCP (vía TASK-1416).
- Runtime target: `local` + `staging` (flag OFF en prod).

### Contract surface

- Contrato existente a respetar: interface `ChapterAuthor`, `team-gallery-full.slots.json`, allowlist `squad-person`.
- Contrato nuevo: `deriveSquadFacts(source) → SquadFacts` + `squadChapterAuthor`.
- Backward compatibility: aditivo.
- Full API parity: hereda la superficie del motor (TASK-1416).

### Data model and invariants

- Entidades: ninguna nueva.
- Invariantes: los del motor + **una persona/foto/dedicación fuera de los hechos rechaza la propuesta completa** + claves de foto ⊆ allowlist.
- Tenant/space boundary: el roster lo resuelve el caller con scope de sesión.
- Idempotency/concurrency: la del motor.
- Audit/outbox/history: N/A (persistencia = TASK-1416).

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `TENDER_CHAPTER_AUTHOR_ENABLED` OFF (sin flag nuevo).
- Backfill plan: N/A.
- Rollback path: revert PR.
- External coordination: fotos nuevas del equipo (si el squad propuesto incluye a alguien sin foto en el allowlist) son un proceso humano del catálogo, NO de esta task.

### Security and access

- Auth/access gate: el del motor; el reader de roster con su capability propia si aplica `[verificar]`.
- Sensitive data posture: nombres/roles/dedicación son contenido client-facing de la oferta; **sin PII adicional** (nada de rut/email/compensación en hechos ni prompt).
- Error contract: `captureWithDomain(err, 'commercial', …)`; degradación honesta.
- Abuse/rate-limit: interno; `maxTokens` + retry N=2.

### Runtime evidence

- Local checks: suite authoring verde (motor intacto + eval nuevo).
- DB/runtime checks: roster ejercitado contra la fuente real si existe reader.
- Integration checks: corrida real → render `TeamGalleryFull`; frame revisado contra la lámina SKY.
- Reliability signals/logs: sin signal nuevo.
- Production verification sequence: N/A (flag OFF).

### Acceptance criteria additions

- [ ] Ninguna PII más allá de nombre/rol/dedicación en hechos, prompt o slots (test).
- [ ] Claves de foto del output ⊆ allowlist `squad-person` (test).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El facts mapper del squad

- `deriveSquadFacts`: roster (reader canónico o hechos del operador pre-evidenciados — decidir en Discovery) → un hecho por persona con `evidenceRef`; validación de allowlist de fotos y de rango de dedicación (0-100%). Test contra el roster del golden SKY.

### Slice 2 — El author + validador fail-closed

- `squadChapterAuthor`: schema (framing = `sectionLabel`/`title`/`rosterMeta`; NUNCA arrays de personas), prompt formal, validador con límites reales del slot contract + members ⊆ hechos, `toSlides` que emite `members[]` completos desde hechos.

### Slice 3 — Eval baseline + golden SKY

- Fixture frozen de la lámina `equipo` + eval + adversariales (persona inventada, dedicación alterada, foto fuera de allowlist, overflow).

### Slice 4 — Corrida real end-to-end

- Sanity script → propose (LLM real) → confirm → render; frame revisado a ojo.

## Out of Scope

- Tocar motor/composer/catálogo; agregar fotos al allowlist (proceso humano aparte).
- La superficie Nexa/MCP (TASK-1416).
- Modelar staffing/capacity nuevo en people/agency (si falta, hechos del operador + follow-up).

## Detailed Spec

Mismo riel que diagnóstico/económica, con el matiz de que los "hechos" son identidades: `roster → deriveSquadFacts [PURO] → propose [LLM: sólo título/labels] → validate [members ⊆ hechos, fail-closed] → confirm [member] → toSlides [members DESDE hechos] → composeArtifact`. El framing no puede tocar el array de personas — se inyecta entero desde los hechos, incluida la clave de foto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 3 → Slice 2/4 (el eval antes del prompt, §5-bis).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Persona/dedicación alterada por el framing | N/A (flag OFF) | low | members se inyectan desde hechos; validador rechaza members en framing | eval rojo |
| Foto fuera del allowlist (o cara IA) | composer | low | validador del author + resolver `squad-person` falla cerrado (doble capa) | render rechaza |
| No existe reader estructurado del staffing por deal | people/agency | medium | hechos del operador pre-evidenciados + follow-up de reader | `[verificar]` Discovery |

### Feature flags / cutover

- Reusa `TENDER_CHAPTER_AUTHOR_ENABLED` (OFF). Sin flag nuevo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-4 | revert PR (aditivo puro) | <5 min | sí |

### Production verification sequence

1. CI: eval squad + suite authoring verdes.
2. Local: corrida real + frame revisado.
3. Prod: flag OFF (decisión EPIC-029).

### Out-of-band coordination required

- Sólo si el squad propuesto incluye una persona sin foto en el allowlist: proceso humano de fotos reales del catálogo (declararlo, no resolverlo acá).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `deriveSquadFacts` es puro; cada persona con `evidenceRef`; fotos ⊆ allowlist (tests).
- [ ] El author implementa `ChapterAuthor` sin modificar motor ni harness (diff vacío).
- [ ] El framing schema NO contiene arrays de personas; `toSlides` inyecta `members[]` desde hechos (test).
- [ ] Eval baseline verde contra el golden SKY + adversariales (persona inventada / dedicación alterada / foto fuera de allowlist rechazan).
- [ ] Sin PII más allá de nombre/rol/dedicación (test).
- [ ] Corrida real con render y frame revisado.
- [ ] `pnpm composer:visual-gate` a 0 px.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/commercial/tenders/proposals/authoring`
- Corrida real documentada + `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle + carpeta + README/registry sincronizados.
- [ ] `Handoff.md` + `changelog.md`.
- [ ] Delta en el arch doc + companion (ambos espejos).
- [ ] Impacto cruzado: EPIC-029, TASK-1419.

## Follow-ups

- Reader canónico de staffing propuesto por deal (si Discovery confirma que no existe) — task del dominio people/agency.

## Open Questions

- **¿De dónde sale el roster con dedicaciones?** Recomendación de Discovery: si existe reader de asignaciones/capacity por deal, usarlo; si no, hechos del operador pre-evidenciados (blueprint del workspace del deal) + follow-up del reader. NO bloquear el author por la fuente.
