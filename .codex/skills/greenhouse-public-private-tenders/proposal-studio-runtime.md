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
| **Repo / CLI / scripts** (un agente Claude o un dev) | ✅ **El camino vivo hoy.** Todo lo de este doc |
| **API interna** (`/api/commercial/proposals/**`) | ✅ Existe y está gateada (capability + entitlement per-ORG) |
| **Nexa (conversación)** | ⚙️ **Code-complete, flag OFF** (TASK-1399). Registradas en `NEXA_ACTION_REGISTRY`: `register_proposal`, `attach_proposal_rfp`, `record_proposal_evidence`, `request_proposal_render` + el tool read-only `proposal_status`. Se prenden con **`NEXA_PROPOSAL_ACTIONS_ENABLED`** (default OFF, además del master `NEXA_ACTION_RUNTIME_ENABLED`) — y el render exige además `ARTIFACT_RENDER_JOBS_ENABLED` en el MISMO target |
| **UI del portal** | ✅ **Read + descarga** (TASK-1413, 2026-07-15): `/admin/commercial/proposals` — lista operator-view + sidecar con historial de versiones por artefacto + descarga del archivo real. viewCode `administracion.commercial_proposals` (efeonce_admin+efeonce_account). La ESCRITURA desde UI sigue siendo F5: crear/gates/render se opera por repo/API/Nexa |

**Consecuencia práctica:** si alguien pregunta *"¿puedo pedirle un deck a Nexa?"* — el código está, la
puerta se abre con el flag. Mientras esté OFF, Nexa lo dice honestamente (gap `runtime_disabled`) y el
camino del día a día sigue siendo el repo. Manual: `docs/manual-de-uso/proposal-studio/rfp-a-pdf-el-dia-a-dia.md`.

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

### 5b · Nexa: el dominio operado desde el chat (TASK-1399)

Nexa **no es un camino paralelo**: es otro consumer del mismo primitive. Las 4 acciones
(`src/lib/nexa/actions/proposal-studio.ts`) delegan en `createProposal` / `attachProposalAsset` /
`recordProposalEvidence` / `requestProposalRender` y cruzan la **misma puerta** que las rutas
(`assertProposalStudioAccessForSubject`). El tool read-only `proposal_status` lee el **mismo** read
model del día a día (`proposals/operator-view.ts`) que consumirá la UI.

Tres invariantes nacieron acá y aplican a **cualquier acción gobernada futura** (no sólo a este dominio):

1. **El scope sale de la sesión, NUNCA del modelo.** Ningún `inputSchema` acepta `ownerOrgId`: se
   deriva del entitlement (`resolveProposalStudioOwnerOrg`) y el cliente entra **por nombre**
   (`resolveClientOrganizationByName`, fail-closed: cero → no inventa; varias → pregunta). Dejar que el
   LLM proponga un UUID de organización es una superficie de ataque, no una comodidad.
2. **Un preview que promete lo que va a fallar es una mentira.** Si un invariante de dominio bloquea la
   acción, `buildPreview` lanza `NexaActionBlockedError` → gap `unavailable`: **se explica, no se
   propone**. (Antes eso sólo podía morir en el `execute`, después de que el humano confirmara.)
3. **El preview ejercita los gates del command, no una copia.** Por eso los gates del render viven en
   `assertProposalRenderAdmissible` (read-only) y los corren los dos. Una evidencia `internal` citada en
   un artefacto `client_facing` **nunca llega a ser una tarjeta de confirmar**.

⚠️ El schema del `manifest` usa `.passthrough()` **a propósito**: Zod borra las claves que no declara, y
el manifest lleva su procedencia (`input`). Strippearla cambia el `manifestHash` → el MISMO deck pedido
por API y por Nexa daría DOS jobs. **El manifest se valida, no se reescribe.**

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
| **Una acción nueva operable desde Nexa** | Copiar el molde de `actions/proposal-studio.ts`: schema Zod SIN ids de organización (el scope se deriva) + `isEnabled` con flag propio default-OFF + `isPermitted` sync (capability) + `buildPreview` que **cruza la puerta y ejercita los gates del command** (bloqueo → `NexaActionBlockedError`) + `execute` que re-cruza la puerta y delega en el command **sin** `idempotencyKey` (la pone el confirm) → registrar en `NEXA_ACTION_REGISTRY` **y en la descripción del tool `propose_action`** (la lista está hardcodeada ahí: si no la actualizás, el LLM no sabe que existe) | Un `ownerOrgId` en el schema; reglas de dominio nuevas dentro de la acción; un preview que "avisa" de un bloqueo en vez de bloquear |
| **Una UI del Studio (F5 — la parte WRITE)** | La lectura+descarga YA existe (TASK-1413) y es LA prueba del camino correcto: consumió `operator-view.ts` + `readProposalArtifactVersions` + el endpoint de descarga sin reimplementar un solo gate. Para el write: consumir `operator-view.ts` + `assertProposalStudioAccessForSubject` (la misma puerta) + `assertProposalRenderAdmissible` para deshabilitar "Generar" **con el motivo real** | Reimplementar los gates en el componente (drift garantizado: el día que se agregue uno, la UI miente) |
| **Batch de renders** (30 carruseles) | Open Question CON DIENTES en TASK-1391: `png-set` probablemente quiere batch por ejecución (cold start de Chromium domina). Decidir CON DATOS de carga | Subir `tasks`/`parallelism` a ojo |
| **Otro detector de QA visual** | `quality-gates.ts` + calibrarlo contra los 40 frames del baseline (como blank_slide: reales ≥2,41%, sintético 0%) + código de fallo | Un warning que nadie lee |

**Las 3 cosas que NO evolucionan (son el suelo):**

1. El manifest **canónico y hasheado** como única entrada del render productivo (el drift check
   depende de eso — cazó 3 bugs reales el primer día).
2. `propose → confirm → execute` con confirm humano — en el contrato, en el command Y en la DB.
3. El `audience` por referencia: un artefacto client_facing jamás contiene una referencia
   internal. Es la diferencia entre ganar una licitación y regalar el piso de negociación.

## Delta 2026-07-15 — dos capas: el taller (carpeta git) y el registro (este aggregate)

El deal tiene **dos capas**, y este runtime es la segunda: (1) el **taller** = la carpeta git del deal
(`docs/commercial/tenders/<slug>/`, `pnpm tender:new`) donde viven las **fuentes** (`oferta-tecnica.md`,
`deck-plan.json`) que el equipo/agente itera y revisa; (2) el **registro gobernado** = este aggregate
`Proposal`, que guarda las **salidas versionadas** (los PDF renderizados) + el snapshot de la quote + el
estado. **Decisión (2026-07-15): las fuentes se quedan como archivos git, NO se vuelven `proposal_assets`**
(conservan git-review; el composer las lee directo). El aggregate **referencia** la carpeta por
`proposal_id`; NO la absorbe. La `Proposal` ES el contenedor del deal, no un doc dentro de una carpeta.
Es también el **F0 del Digital Sales Room** (workspace interno primero; la sala del comprador es una
proyección posterior — `GREENHOUSE_DIGITAL_SALES_ROOM_*_V1.md`).

## Delta 2026-07-15 — la versión se DERIVA y la descarga es gobernada (TASK-1412/1413)

**Cambio de contrato en `attachProposalAsset`:** el input **ya NO acepta `version`** — se deriva
`MAX(version)+1` por `(proposal_id, kind)` dentro de la misma tx (`FOR UPDATE` serializa; índice
único `(proposal_id, kind, version)` como cinturón) y el command la retorna. Si un agente/consumer
intenta pasarla, el tipo lo rechaza; NUNCA reintroducirla "para fijar una versión a mano" — v1/v2/v3
son historia derivada, no opinión del caller. El `artifact-worker` ya adjunta el PDF del render por
este camino, así que **todo render productivo queda versionado solo**.

**Leer/descargar (los dos contratos nuevos, mismos gates de siempre):**

- `readProposalArtifactVersions` (`proposals/artifact-versions.ts`): historial por kind + `current`,
  con filename/size/fecha — **CERO URLs de storage en el shape** (invariante).
- `GET /api/commercial/proposals/[id]/assets/[proposalAssetId]/download`: valida pertenencia del
  asset a la proposal, re-cruza `assertProposalStudioAccess` y **el audience gate manda**: un
  `internal` responde 403 a cualquier principal client aunque tenga el link. Verificado en runtime
  (matriz client 403 / superadmin 200 con el PDF real de SKY).

**La superficie del portal** (`/admin/commercial/proposals`, TASK-1413) es un consumer de esos dos
contratos — no tiene lógica propia de dominio. Manual del operador:
`docs/manual-de-uso/comercial/descargar-propuestas-portal.md`. Si el día a día pide ver evidencia,
requirements o render jobs en vivo, el follow-up declarado es la ruta detalle `[proposalId]`, no
engordar el sidecar.
