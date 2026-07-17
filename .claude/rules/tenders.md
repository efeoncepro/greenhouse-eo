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
(`module_assignments: proposal_studio_v1` — **activo para Efeonce desde 2026-07-12**; otras orgs OFF),
outbox `commercial.proposal.*`, intake agent (propose → confirm → execute; el LLM **NUNCA** muta — ni
siquiera existe `actor_kind='agent'`) y la **proyección allowlisted de render** (`render-projection.ts`,
contrato de TASK-1391: un artefacto `client_facing` con UNA evidencia `internal` **falla cerrado**).
**NUNCA** escribir a `proposals`/hijos fuera de esos commands; **NUNCA** exponer RFP crudo, costos,
`external_source_snapshot` ni URLs de storage en una proyección/evento.

**El motor de chapter-authors EXISTE (TASK-1415, 2026-07-16 · flag `TENDER_CHAPTER_AUTHOR_ENABLED` OFF):**
la autoría agéntica de láminas vive en `src/lib/commercial/tenders/proposals/authoring/**` — interface
`ChapterAuthor` **servicio-agnóstica** (diagnóstico SEO/AEO y credenciales son implementaciones, NO el
motor). Separación dura dato/framing: `deriveFacts` (puro) es la ÚNICA fábrica de cifras; el LLM sólo
enmarca; `toSlides` inyecta `metric`/`score`/`evidenceRef` DESDE los hechos. **NUNCA** una cifra o URL
del framing sin hecho que la respalde (guard compartido rechaza la propuesta COMPLETA); **NUNCA** tocar
`chapter-author.ts`/`eval-harness.ts` para acomodar un servicio (si un author nuevo lo exige, la
abstracción está mal — STOP); **NUNCA** tocar prompt/schema de un author sin su eval verde (golden
frozen; el de diagnóstico son las láminas SKY a mano — no se edita para "pasar"). El confirm exige
`actor.kind==='member'`. Invariantes completos: `COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
§Chapter-author engine; costura para authors nuevos: companion `proposal-studio-runtime.md`.

**El dominio se opera desde Nexa (TASK-1399, code-complete · flag `NEXA_PROPOSAL_ACTIONS_ENABLED` OFF):**
4 acciones gobernadas (`src/lib/nexa/actions/proposal-studio.ts`) + el tool read-only `proposal_status`
(sobre `proposals/operator-view.ts`, el read model del día a día). Nexa es **otro consumer del mismo
primitive**, no un camino paralelo. **UNA PUERTA, DOS ENTRADAS:** el núcleo del gate es
`assertProposalStudioAccessForSubject` (subject canónico) y la firma vieja es su adapter — **NUNCA**
escribas un segundo gate para un consumer nuevo. **EL SCOPE SALE DE LA SESIÓN:** **NUNCA** agregues un
`ownerOrgId` (ni ningún id de organización) a un `inputSchema` de agente — se deriva del entitlement y el
cliente se resuelve **por nombre** fail-closed. **UN PREVIEW NUNCA PROMETE LO QUE VA A FALLAR:** los gates
del render viven en `assertProposalRenderAdmissible` (read-only) y los corren el preview **y** el command
— **NUNCA** una copia (drift); si el estado bloquea, `NexaActionBlockedError` → gap `unavailable` (se
explica, no se propone). **El manifest se valida, NO se reescribe** (`.passthrough()` en su schema Zod: sin
él, Zod borra su procedencia y el mismo deck daría dos jobs en vez de uno idempotente).

**Gates mecánicos del dominio — SIEMPRE al tocarlo:**

- `pnpm vitest run src/lib/artifact-composer` verde (12+ suites: boundary/composability/geometría/
  brand-pack-sync/gradient-inventory/…).
- **`pnpm composer:visual-gate` a CERO píxeles** contra el baseline committeado
  (`scripts/frontend/baselines/artifact-composer/**`). Un cambio de píxel intencional se declara
  lámina por lámina en `BASELINE_DELTAS.md` y se re-promueve con `--freeze` — **NUNCA** se muta el
  baseline a mano (el digest sellado también falla el gate). **Antes de `--freeze`, leé el runbook
  `docs/operations/runbooks/composer-visual-gate.md`** (fuente única del proceso). Dos reglas duras de
  ese runbook (bug class `ISSUE-122`): **(1)** el `--freeze` es **SINGLE-OWNER, serializado y atómico**
  (freeze + commit juntos) — **NUNCA** congeles con el composer sucio por otro agente (`git status` en
  `src/lib/artifact-composer`/`scripts/frontend/baselines` con `M` ajenos = coordiná, no congeles); **(2)**
  las láminas con **fotos** (`TeamGalleryFull`/equipo) **driftean píxeles entre corridas/entornos** aunque
  no las toques (el `--selftest` de 2 corridas juntas NO lo atrapa) — si el gate flagea SOLO el área de foto
  de una lámina que no cambiaste, **es `ISSUE-122`, NO tu regresión: NO la rebaselines**.
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
