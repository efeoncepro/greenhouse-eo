---
paths:
  - "src/lib/commercial/tenders/**"
  - "src/lib/artifact-composer/**"
  - "docs/architecture/tender-deck-composer-prototypes/**"
  - "scripts/commercial/compose-tender-deck.ts"
  - "scripts/artifact-composer/**"
---

# Licitaciones / Artifact Composer — invariantes (auto-load por path)

Antes de tocar este dominio, cargá **`docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`**
(+ la skill `greenhouse-public-private-tenders` → `deck-visual-system.md` y `deck-studio` para argumento,
composición y entrega del deck).

**Estado real (TASK-1393 + TASK-1392, 2026-07-12):** el motor vive en **`src/lib/artifact-composer/**`**
(primitive domain-free, package-shaped, frontera mecánica por allowlist) y el deck es el **catálogo
`catalogs/deck-axis/`** (plantillas + registry + resolvers + validadores semánticos + brand pack `axis`
compilado + font pack local — el render **bloquea la red** y falla cerrado). Emite PDF + PNG + el
**`ResolvedCompositionManifest`** (`pnpm deck:compose`). **El aggregate `Proposal` EXISTE** (TASK-1392,
aplicado a dev): `greenhouse_commercial.proposal*` con state machine persistida (matriz + triggers
append-only; gates humanos exigidos por la DB), commands/readers en
`src/lib/commercial/tenders/proposals/**`, API `/api/commercial/proposals/**`, entitlement **per-ORG**
(`module_assignments: proposal_studio_v1` — **OFF en todos los ambientes hasta staging evidence**),
outbox `commercial.proposal.*`, intake agent (propose → confirm → execute; el LLM **NUNCA** muta — ni
siquiera existe `actor_kind='agent'`) y la **proyección allowlisted de render** (`render-projection.ts`,
contrato de TASK-1391: un artefacto `client_facing` con UNA evidencia `internal` **falla cerrado**).
**NUNCA** escribir a `proposals`/hijos fuera de esos commands; **NUNCA** exponer RFP crudo, costos,
`external_source_snapshot` ni URLs de storage en una proyección/evento.

**Gates mecánicos del dominio — SIEMPRE al tocarlo:**

- `pnpm vitest run src/lib/artifact-composer` verde (12+ suites: boundary/composability/geometría/
  brand-pack-sync/gradient-inventory/…).
- **`pnpm composer:visual-gate` a CERO píxeles** contra el baseline committeado
  (`scripts/frontend/baselines/artifact-composer/**`). Un cambio de píxel intencional se declara
  lámina por lámina en `BASELINE_DELTAS.md` y se re-promueve con `--freeze` — **NUNCA** se muta el
  baseline a mano (el digest sellado también falla el gate).
- **NUNCA** un HEX/rgb de marca en una plantilla (`pnpm composer:color-ledger`): el color sale de
  `deck-tokens.css` (brand pack); los gradientes son recipes (`gradient-recipes.json`) o inventario
  ratchet. **NUNCA** `'Poppins'/'Geist'` literal: type roles `var(--axis-deck-type-display|text)`.
- **NUNCA** un `@import` de Google Fonts: las fuentes salen del font pack del brand pack (OFL +
  checksums; `pnpm composer:brand-pack --check` sincroniza).

Una oferta es un **documento contractual que evalúa un comité**. De ahí las 3 reglas raíz:

1. **Anti-fabricación** — **NUNCA** una cifra sin `evidenceRef`, **NUNCA** geometría dibujada a mano (la barra sale del número o no sale), **NUNCA** una cara del squad generada con IA (es tergiversación, no un tema estético).
2. **Fail-closed** — **NUNCA** un `default:` silencioso en el filler; **NUNCA** truncar copy (`overflow: reject`); **NUNCA** `grid-template-columns` en `%` con `gap` (los % no descuentan el gap → `.slide{overflow:hidden}` amputa la palabra en silencio). "Pasó `maxCharacters`" **NO** significa "cabe": el juez es el layout real (`assertSlideFitsCanvas`).
3. **Human-in-control** — el agente prepara; **el humano sube y firma**. **NUNCA** un GO sin margen sobre loaded cost.

**Autoridad de presentación:** el autor (humano o agente) declara INTENCIÓN (`contentType` + slots) —
**NUNCA** `template`. El selector del catálogo resuelve; un `template` declarado que lo contradiga aborta
(`TemplateAuthorityError`). Lo único persistible/renderizable productivo es el `ResolvedCompositionManifest`.

**`TimelineFull`:** el plan declara `timeUnit`, eje discreto, fases, hitos y `barLabel`; el compiler deriva
grilla, rangos, diamantes y conectores (hoy: hooks del catálogo `deck-axis`, no del motor). **NUNCA** se
editan porcentajes/conectores ni se oculta el label para pasar: el layout real lo mide y falla cerrado.

**Frontera del motor:** **NUNCA** el composer importa de un dominio ni de `@/` (allowlist:
relativo-interno + `node:*` + playwright + pdf-lib — `package-boundary.test.ts` rompe el build).
**NUNCA** copiar el motor para una superficie nueva: un catálogo, no un fork (`catalog-extensibility.test.ts`
es la prueba). La marca es un INPUT: AXIS es *el brand pack de Efeonce*, no *el* brand pack.
