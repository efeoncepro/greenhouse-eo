# Proposal Studio + Artifact Renderer — CÓMO SE USA y CÓMO SE EVOLUCIONA

> **Companion de runtime (TASK-1392 + TASK-1393 + TASK-1391, 2026-07-12).** Este es el documento
> que un agente nuevo lee para OPERAR el sistema completo — de "llegó un RFP" a "el PDF está en el
> asset store" — y para EXTENDERLO sin romper sus invariantes. El método comercial vive en
> `bid-construction-playbook.md`; el sistema visual en `deck-visual-system.md`; esto es el motor.

---

## El mapa en una pantalla

```
DOMINIO (TASK-1392)                    MOTOR (TASK-1393)                RENDER (TASK-1391)
src/lib/commercial/tenders/proposals/  src/lib/artifact-composer/       services/artifact-worker/
├─ store.ts        (aggregate)         ├─ catalog.ts   (resolvePlan)    ├─ main.ts (Cloud Run JOB)
├─ assets.ts       (RFP/evidencia)     ├─ compose.ts   (composeArtifact)├─ Dockerfile (playwright pin)
├─ render-projection.ts (allowlist)    ├─ render.ts    (Chromium+gates) └─ deploy.sh (SoT del flag)
├─ render-constraints.ts (RFP→limits)  ├─ quality-gates.ts (QA mecánica)
├─ render-jobs.ts  (command/cola)      └─ catalogs/deck-axis/ (25 tpl,  DISPATCHER (ops-worker)
├─ render-dispatch.ts (prioridad)         brand pack, fuentes, DATO)    /artifact-render/dispatch
├─ intake-agent.ts (propose→confirm)                                    (Cloud Scheduler */2 min)
└─ render-agent.ts (propose→confirm)
DB: greenhouse_commercial.proposals + proposal_{state_transitions,assets,evidence,requirements,
    render_jobs,render_job_events} — append-only, org-scoped, gates humanos EN LA DB
```

> **Capacidad actual (provisional, no SLO):** el benchmark Cloud Run de TASK-1391 confirmó un deck
> de 15 láminas en **25,2 s / 3,16 MB** y uno de 25 en **32,3 s / 5,56 MB**, ambos al primer intento.
> Operar inicialmente en **10–15 jobs/h**; el dispatcher tiene techo de **30 jobs/h** (uno cada dos
> minutos). No extrapolar a concurrencia sostenida ni a `png-set` hasta que su command tenga datos propios.

**Las 4 verdades que ordenan todo:**

1. **El aggregate es `Proposal`** (no `Tender`): `origin ∈ {public_tender, private_rfp,
   direct_sales}`, terminales `won`/`lost`. Toda escritura pasa por los commands de
   `proposals/**` — jamás SQL directo (triggers append-only + gates humanos en DB lo impiden).
2. **El motor es domain-free** y el deck es UN catálogo (`deck-axis`). El motor no conoce
   "licitación"; el catálogo es DATO.
3. **Solo un `ResolvedCompositionManifest` llega a render productivo** — canónico (input
   normalizado, hashes de catálogo/plantillas/brand pack/fuentes) y hasheado con
   `hashResolvedManifest` (serialización canónica, estable ante JSONB).
4. **El LLM propone, el humano confirma, el mismo command ejecuta.** No existe
   `actor_kind='agent'` en la DB. Punto.

---

## ⚠️ QUIÉN puede operar esto HOY (leer antes de prometerle nada a nadie)

| Superficie | Estado |
|---|---|
| **Repo / CLI / scripts** (un agente Claude o un dev) | ✅ **La única puerta hoy.** Todo lo de este doc |
| **API interna** (`/api/commercial/proposals/**`) | ✅ Existe y está gateada (capability + entitlement per-ORG) |
| **Nexa (conversación)** | ❌ **NO todavía.** El runtime de acción gobernada de Nexa existe y está probado (`propose_action` → preview → confirm → command; prior art `author_quote`), pero **cero acciones del Proposal Studio están registradas** en `NEXA_ACTION_REGISTRY`. El puente es **`TASK-1399`** (to-do, P1): enchufar el dominio sin lógica nueva |
| **UI del portal** | ❌ No existe (F5) |

**Consecuencia práctica:** si alguien pregunta *"¿puedo pedirle un deck a Nexa?"*, la respuesta
honesta hoy es **no** — se lo pide a un agente en el repo. Ver el manual del día a día:
`docs/manual-de-uso/proposal-studio/rfp-a-pdf-el-dia-a-dia.md`.

## USO — las 6 recetas

### 1 · Crear una propuesta (el objeto de negocio)

```ts
import { createProposal } from '@/lib/commercial/tenders/proposals/store'

const { proposal } = await createProposal({
  ownerOrgId, clientOrganizationId, origin: 'private_rfp',
  title: 'SKY — Gestión del blog 2026 (Wherex)', platform: 'Wherex',
  deadline: '2026-07-15T18:00:00Z', deadlineConfidence: 'ambiguous',
  deadlineAssumption: 'Bases §2.5…', currency: 'CLP',
  idempotencyKey: 'sky-blog-2026-wherex',   // retry-safe
  actor: { kind: 'member', memberId }        // o 'cli'/'system' para no-gates
})
```

- API equivalente: `POST /api/commercial/proposals` (misma semántica, mismos gates).
- La PUERTA es doble: capability (`commercial.proposal.*`) + **entitlement per-ORG**
  (`module_assignments: proposal_studio_v1`). Sin módulo asignado a la org, nadie opera.
- Transiciones: `transitionProposalState` — la matriz vive en DB (`proposal_state_matrix`);
  los 3 gates humanos (`fit_review→producing`, `fit_review→declined`, `ready_to_submit→submitted` — el bid/no-bid y la PRESENTACIÓN de la oferta; verificado en `HUMAN_GATE_TRANSITIONS`) exigen
  `actor.kind='member'` (la DB también lo exige — un agente NO puede cruzarlos ni con bug).

### 2 · RFP, evidencia y requisitos

```ts
import { ingestProposalRfp, recordProposalEvidence, declareProposalRequirement }
  from '@/lib/commercial/tenders/proposals/assets'
```

- El binario SIEMPRE por el asset store canónico (scan gate); esto agrega la capa semántica.
- **Evidencia**: EXACTAMENTE una fuente (`sourceAssetId` XOR `externalSourceSnapshot`) +
  `locator` + `method` + `asOf` + `classification` + **`audience` OBLIGATORIO** (`internal` |
  `client_facing`). El hash sella el contenido.
- **Requisitos** (`declareProposalRequirement`): el literal del RFP (kind `excluyente|puntua|
  economic_minimum|format|deadline|penalty|sla`). De acá salen las CONSTRAINTS de render.

### 3 · Componer (autoría) — el manifest

```bash
pnpm deck:compose <plan.json> --out <dir>       # CLI exploratorio (no toca DB, no necesita flag)
```

```ts
import { resolvePlan } from '@/lib/artifact-composer'
import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'

const manifest = await resolvePlan(deckAxisCatalog, { artifactId, slides })  // ÚNICA fábrica
```

- El autor declara `contentType` + `slots` — **NUNCA `template`** (si lo declara y contradice
  al selector → `TemplateAuthorityError`). `resolvePlan` canonicaliza el input: dos entradas
  equivalentes = el mismo manifest = el mismo hash.

### 4 · Render gobernado (el camino productivo)

```ts
import { requestProposalRender } from '@/lib/commercial/tenders/proposals/render-jobs'

const { job } = await requestProposalRender({
  ownerOrgId, proposalId, artifactPurpose: 'deck',      // parte de la idempotencia
  audience: 'client_facing',                            // exige actor member (DB CHECK)
  manifest, outputTarget: 'pdf-merged',
  evidenceIds: [...],                                   // lo que el artefacto CITA
  actor: { kind: 'member', memberId }
})
```

Gates fail-closed AL ENCOLAR (no esperan al worker): **audience por referencia** (UNA evidencia
`internal` en un artefacto `client_facing` rechaza TODO — loaded cost = piso de negociación),
**accesibilidad** (requisito PDF/UA/508/EAA ⇒ `accessibility_unsupported`: Chromium no emite PDF
taggeado — mejor no ofertar que entregar inadmisible), **deadline vencido**, **validadores del
manifest en pass**. API: `POST /api/commercial/proposals/[id]/render-jobs` (+ GET estado,
+ `POST …/[jobId]/retry`). Clave de idempotencia: `(ownerOrgId, proposalId, manifestHash,
artifactPurpose)` — re-pedir devuelve el job existente.

Después: el **dispatcher** (ops-worker, cada 2 min) elige por **deadline + aging** (vencidos se
cierran gobernados; pospuestos se loguean) y ejecuta el **Cloud Run Job `artifact-worker`** →
claim → **drift check** (re-resuelve el manifest contra SU catálogo; hash distinto =
`manifest_drift`, no se renderiza) → compose con TODOS los gates → constraints del RFP fijadas →
PDF + previews al asset store privado (`proposal_deliverable`) + vínculo `proposal_assets` +
outbox. Retry: **del dominio** (`retryProposalRenderJob`; `max-retries=0` en Cloud Run); los
fallos no-reintentables (audience/semántica/peso/geometría/drift) exigen un manifest nuevo.

### 5 · Los agentes (el molde propose → confirm → execute)

- **Intake**: `intake-agent.ts` — contexto allowlisted → `ProposalIntakeProposal` que cita
  inputs → validación fail-closed → `confirmProposalIntake` (member) ejecuta `createProposal`.
- **Render**: `render-agent.ts` — contexto (proyección + constraints + jobs + estimación SOLO
  con datos medidos) → `ProposalRenderAgentProposal` con **`blockers` obligatorios** (la
  validación recomputa los bloqueos reales; una propuesta que ESCONDE uno se rechaza entera) →
  `confirmProposalRender` (member, rechaza bloqueos vivos) ejecuta `requestProposalRender`.
- **Cada agente tiene su eval fixture** (`__tests__/*-agent-eval.test.ts`) — ES el gate para
  tocar prompt/schema.

### 6 · Operación y diagnóstico

```bash
# Estado de un job (la verdad vive en la DB, no en Cloud Run):
SELECT state, failure_code, failure_detail, attempts FROM greenhouse_commercial.proposal_render_jobs …
# Ejecución manual de smoke:
gcloud run jobs execute artifact-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=RENDER_JOB_ID=prnd-… --wait
```

- Flag `ARTIFACT_RENDER_JOBS_ENABLED` — **multi-runtime ×3** (Vercel enqueue · ops-worker
  dispatch · Job). SoT Cloud Run = cada `deploy.sh`; ledger `FEATURE_FLAG_STATE_LEDGER.md`.
- Señales (steady=0): `artifact.render.queue.starvation` · `artifact.render.dead_letter` ·
  `commercial.proposal.deadline_at_risk` · `commercial.proposal.stuck_in_state`.
- Runbook del worker: `services/artifact-worker/README.md`.
- Corrida de referencia (fixture vivo): `scripts/commercial/_sanity-sky-render-pipeline.ts` —
  la propuesta SKY real atravesó TODO el pipeline y produjo el PDF de 15 láminas (2026-07-12).

---

## EVOLUCIÓN — las costuras por donde SÍ se extiende (y las que no)

| Quieres… | La costura correcta | Lo que NO se hace |
|---|---|---|
| **Un formato nuevo** (carrusel IG, one-pager) | Un **catálogo nuevo** en `catalogs/<nombre>/` (registry + plantillas + slots + brand descriptor). `catalog-extensibility.test.ts` es LA prueba: compone sin tocar el motor | Fork del motor; if por formato en compose |
| **Un target de salida nuevo** (pptx-native, adobe-express) | Implementarlo en el registry de `outputTarget` (`catalog.ts` `IMPLEMENTED_OUTPUT_TARGETS`) — hoy declarado ⇒ `UnimplementedOutputTargetError` (fail-closed, nunca degrada a PDF) | Degradar en silencio a PDF |
| **Una plantilla nueva** en deck-axis | Protocolo del catálogo: `.html` + `.slots.json` + entrada en `registry.json` (1 content-type → 1 plantilla) + probe en el baseline + `pnpm composer:visual-gate --freeze` DECLARADO en `BASELINE_DELTAS.md` | Editar el baseline a mano (el digest sellado revienta) |
| **Otra marca** (cliente ASaaS) | Un **brand pack nuevo** en `brand-packs/<slug>/` (colores+roles+fuentes con `embedRights`; el compilador RECHAZA WCAG AA fallido en packs no-default) | HEX/fuentes en plantillas (ledger + gates lo bloquean) |
| **Un failure_code nuevo** del render | Migración additive al CHECK de `proposal_render_jobs.failure_code` + el union `RenderJobFailureCode` + decidir si entra a `NON_RETRYABLE_FAILURES` | Un string ad-hoc en failure_detail |
| **Una constraint nueva del RFP** (p. ej. formato de archivo) | `render-constraints.ts` (`extractRenderConstraints` + su test) → viaja FIJADA en el job → el worker la enforcea | Leerla "fresca" en el worker (rompe determinismo) |
| **Una fase agéntica nueva** (análisis F1, packaging F2…) | El MOLDE: contexto allowlisted tipado → propuesta tipada que cita inputs y declara blockers → validación fail-closed que recomputa → confirm member-only → EL MISMO command canónico → eval fixture. Copiar `render-agent.ts`, no inventar | Un prompt suelto; un tool con acceso a DB/storage/jobs.run |
| **Batch de renders** (30 carruseles) | Open Question CON DIENTES en TASK-1391: `png-set` probablemente quiere batch por ejecución (cold start de Chromium domina). Decidir CON DATOS de carga | Subir `tasks`/`parallelism` a ojo |
| **Otro detector de QA visual** | `quality-gates.ts` + calibrarlo contra los 40 frames del baseline (como blank_slide: reales ≥2,41%, sintético 0%) + código de fallo | Un warning que nadie lee |

**Las 3 cosas que NO evolucionan (son el suelo):**

1. El manifest **canónico y hasheado** como única entrada del render productivo (el drift check
   depende de eso — cazó 3 bugs reales el primer día).
2. `propose → confirm → execute` con confirm humano — en el contrato, en el command Y en la DB.
3. El `audience` por referencia: un artefacto client_facing jamás contiene una referencia
   internal. Es la diferencia entre ganar una licitación y regalar el piso de negociación.
