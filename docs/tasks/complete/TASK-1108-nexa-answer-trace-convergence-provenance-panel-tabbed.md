# TASK-1108 — Convergencia answer-trace → canvas: `NexaProvenanceTrace` panel tabbed + contrato

## Delta 2026-06-13 — COMPLETADA (A + C; B/D-absoluto diferidos arch-correct)

- **Slice A — `NexaProvenanceTrace` panel tabbed**: prop additivo `tabs?: NexaProvenanceProofTab[]` ({id, label, builtin?: `sources`/`trace`/`packet`, content?: ReactNode}). Built-ins horneados packet-driven (sources/trace → `NexaEvidencePanel`; packet → campos crudos del `nexa-evidence.v1`). `tabs` omitido = panel single byte-idéntico. Lab `/design-system/nexa-provenance` con specimen tabbed (Fuentes/Razonamiento/Packet built-ins + Evals slot) — **GVC 0 findings** (tab switch + slot de dominio verificados). PRIMITIVES.md actualizado.
- **Slice B — DIFERIDO** (arch-correct): `surfaceContext` en el answer-trace sería prop huérfano (su variant system no mapea a `allowedRenderers`). Se adopta con consumer real.
- **Slice C — proof de `/knowledge` vivo migrado**: `NexaKnowledgeAnswerSurface` delega su proof a `<NexaProvenanceTrace variant='panel' tabs={...}>` (chrome bespoke borrado: Box+Tabs+content → la primitive lo provee; `data-capture='nexa-knowledge-proof-panel'` preservado para scenarios/tests). API cambió: `proofTabs: NexaProvenanceProofTab[]` (drop `proofTab`/`onProofTabChange`/`proofContent` + genérico `TTab`; la primitive es dueña del estado del tab). 3 consumers migrados: `KnowledgeCenterView` (prod: built-ins + slot Evals = `KnowledgeEvalsContent`; `KnowledgeProofContent` reducido al slot), `NexaChatLabView` (Lab), `KnowledgeAnswerTraceMockupView` (mockup: slots bespoke `SourcesProofPanel`/`TraceProofPanel`/`PacketRows`/`EvalsPanel`). Test del primitive actualizado (8 tests verde). **GVC byte-idéntico confirmado** — frame `knowledge-proof-panel` = mismo chrome ("Fuentes y trazabilidad" + tabs) + mismo content (SourceCards vía content slot).
- **Slice D**: `CONVERSATIONAL_EXPERIENCE.md` §8 actualizado (convergencia del proof hecha + frontera ratificada + deferidos honestos). El **hard-rule absoluto en CLAUDE.md queda descriptivo** (canvas = shell canónico; grounding/proof vía `NexaProvenanceTrace`); el NUNCA absoluto aterriza cuando el answer-trace converja del todo (surfaceContext + canvas shell).
- **Nota de verificación (dev env)**: durante el GVC del answer-trace el dev server entró en degradación PG-pool (`Cannot use a pool after calling end on the pool`, patrón ISSUE-085) → render oscilando 12-66s en TODOS los routes (home/border-beam incluidos, que NO toqué). El A/B inicial fue confundido por ese estado; con pool fresco el proof renderiza + es byte-idéntico. La lentitud NO es del código de esta task.
- Cierre: `tsc` + `lint` (0 errores) + 8 tests del primitive verde.

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio-Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `En progreso`
- Domain: `ui|platform|nexa`
- Blocked by: `none` (diseño de frontera ratificado por skills arch + product-ui, sesión 2026-06-13)
- Branch: `develop` (local-first)
- Legacy ID: `none`

## Summary

Converger el answer-trace productivo (`NexaKnowledgeAnswerSurface`, wired a `/knowledge`) hacia el contrato canónico de la Conversational Experience, **sin leakear dominio en la primitive neutral**. El proof tabbed del answer-trace (`sources`/`trace`/`packet`/`review`-Evals) renderiza TODO desde el packet transversal `nexa-evidence.v1` — lo Knowledge-specific es solo configuración (labels + qué tabs + slot). Por eso se **extiende `NexaProvenanceTrace` variant `panel` a tabbed** (built-ins packet-driven + slot de dominio), se adopta el `surfaceContext` SSOT, se migra el proof de `/knowledge` vivo, y se canoniza en ADR + CLAUDE.md.

## Frontera (ratificada)

- **Transversal → primitive:** chrome tabbed (a11y/teclado/ARIA) + renderers built-in packet-driven (`sources` NexaEvidencePanel · `trace` NexaEvidencePanel trace · `packet` campos crudos del packet).
- **Dominio → slot que llena la surface:** labels (i18n) + qué tabs/orden + un tab EXTRA con `content` ReactNode (p.ej. Evals real de Knowledge).

## Slices

- **A — extender `NexaProvenanceTrace` panel a tabbed** (additive, Lab + GVC, sin tocar surface viva). `tabs?: NexaProvenanceProofTab[]` ({id, label, builtin?: sources|trace|packet, content?: ReactNode}). `tabs` omitido = panel single actual (byte-idéntico). Built-ins baked.
- **B — contract adoption:** `NexaKnowledgeAnswerSurface` consume el `surfaceContext` SSOT (`@/lib/nexa/nexa-answers-surface-context`), contract-only, byte-idéntico.
- **C — migrar el proof de `/knowledge` vivo** a `NexaProvenanceTrace` panel `tabs` (Knowledge pasa labels + slot Evals). GVC byte-idéntico (`fe:capture:diff`) contra el `/knowledge` actual.
- **D — ADR + CLAUDE.md + docs:** ADR de la convergencia + frontera; CLAUDE.md regla descriptiva ahora (canvas = shell canónico; grounding/proof vía `NexaProvenanceTrace`); NUNCA absoluto al cerrar C. Actualizar `CONVERSATIONAL_EXPERIENCE.md` §8 (convergencia ya no pendiente).

## Hard rules

- **NUNCA** hornear labels/copy de dominio en `NexaProvenanceTrace` — el consumer los pasa.
- **NUNCA** que un built-in lea data fuera del `nexa-evidence.v1`.
- **NUNCA** proof de dominio dentro de la primitive — va al `content` slot.
- **SIEMPRE** `tabs` omitido = panel single actual (byte-idéntico).

## Verification

- `pnpm local:check` + tests focales + `pnpm build` verde.
- Slice A: Lab `/design-system/nexa-provenance` con el panel tabbed + GVC 0 findings; panel sin tabs byte-idéntico.
- Slice C: GVC `fe:capture:diff` del `/knowledge` lens proof = sin regresión visual.

## Notas de origen

Diseño de frontera de la sesión TASK-1103/1104/1105/capstone (2026-06-13), auditado con `arch-architect` + `greenhouse-product-ui-architect`. Convergencia diferida en `CONVERSATIONAL_EXPERIENCE.md` §8.
