# Generar el deck de una propuesta — de `plan.json` al PDF gobernado

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Modulo:** Comercial — Artifact Composer (`TASK-1393`) + Artifact Renderer (`TASK-1391`)
> **Ruta en portal:** — (no hay UI: CLI + API)
> **Documentacion tecnica:** [GREENHOUSE_TENDER_DECK_COMPOSER_V1.md](../../architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md) · [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md)
> **Cómo se escribe el contenido del deck:** [componer-deck-de-licitacion.md](../comercial/componer-deck-de-licitacion.md)

## Para qué sirve

Convertir el plan de láminas de una oferta (`plan.json`) en el **PDF que se le entrega al comité**.

Hay **dos caminos** y elegir mal cuesta caro:

| | **Camino A — exploratorio** | **Camino B — productivo** |
|---|---|---|
| **Comando** | `pnpm deck:compose <plan.json>` | `POST …/render-jobs` (`requestProposalRender`) |
| **Dónde corre** | Tu máquina | Cloud Run Job `artifact-worker` |
| **Toca la base de datos** | No | Sí (job auditable) |
| **Necesita el flag encendido** | No | **Sí** (`ARTIFACT_RENDER_JOBS_ENABLED`) |
| **Necesita una propuesta creada** | No | Sí |
| **Aplica los gates de la propuesta** (audience, accesibilidad, deadline, requisitos del RFP) | **No** | **Sí** |
| **Deja el PDF guardado y trazable** | No (queda en un directorio local) | Sí (asset store privado + vínculo a la propuesta) |
| **Sirve para** | Iterar el contenido, ver cómo queda una lámina, probar un cambio de copy | **Producir la entrega real** |

> **La regla:** iteras con A, entregas con B. Un PDF que va a un comité y no salió de un render job no
> tiene manifest sellado, ni evidencia validada, ni constraints del RFP verificadas, ni rastro. No es
> una entrega gobernada: es un archivo.

## Antes de empezar

1. **El plan del deck ya está escrito.** Este manual empieza *después* de eso. Cómo se escribe el
   `plan.json` (los `contentType`, los slots, los `evidenceRef`, qué significan `too_long` y
   `missing_evidence_ref`) está en
   **[componer-deck-de-licitacion.md](../comercial/componer-deck-de-licitacion.md)**. No lo dupliques
   mentalmente: es el mismo archivo para los dos caminos.
2. **Para el camino B necesitas, además:**
   - Una propuesta creada, con su evidencia y sus requisitos registrados
     ([crear-y-operar-una-propuesta.md](crear-y-operar-una-propuesta.md)).
   - El módulo `proposal_studio_v1` activo en tu organización.
   - La capability `commercial.proposal.render` (roles `efeonce_admin` o `efeonce_account`).
   - El flag `ARTIFACT_RENDER_JOBS_ENABLED=true` en el runtime desde el que encolas. **Hoy: staging sí,
     Production no** (ver [operar-el-artifact-worker.md](operar-el-artifact-worker.md)).
   - Si el artefacto es `client_facing`: **ser una persona**. Un script o un agente no puede pedir un
     render hacia el comprador (lo rechazan el command y la base de datos).

## Paso a paso

### Camino A — exploratorio (iterar el contenido)

```bash
pnpm deck:compose docs/commercial/tenders/sky-blog-2026/deck-plan.json --out .captures/tender-deck
```

Sin `--out`, el destino por defecto es `.captures/tender-deck`.

Salida esperada:

```
componiendo "sky-blog-2026" — 15 láminas

  ✓ cover                → cover-hero            01-cover.png
  ✓ diagnosis            → bullet-list-split     02-diagnosis.png
  …

  📄 sky-blog-2026.pdf — 15 páginas · 3.0 MB
  deck-plan.json (artefacto auditable) + láminas PNG → .captures/tender-deck
```

**El deck no se emite a medias.** Si una lámina no pasa un gate (una cifra sin `evidenceRef`, un texto
que no cabe en el lienzo real, un slot desconocido), el proceso aborta con exit 1 y **no sale ningún
archivo**. La lista completa de esos mensajes y qué significan está en
[componer-deck-de-licitacion.md](../comercial/componer-deck-de-licitacion.md).

Este camino **no toca la base de datos, no necesita flag y no valida nada de la propuesta**: no sabe
qué evidencia es interna, ni cuánto pesa como máximo el archivo según las bases. Por eso no sirve para
entregar.

### Camino B — productivo (la entrega gobernada)

El flujo completo, con lo que pasa en cada etapa:

```
  requestProposalRender  ──►  proposal_render_jobs (queued)
   [4 gates fail-closed]
   ANTES de encolar                 │
                                    ▼
                          dispatcher (ops-worker)
                      Cloud Scheduler cada 2 minutos
                   prioridad = deadline + aging (nunca FIFO ciega)
                                    │  jobs.run
                                    ▼
                       artifact-worker (Cloud Run Job)
              claim atómico → drift check del manifest → compose + gates
                        → constraints del RFP → PDF + previews
                                    │
                                    ▼
                    asset store privado + proposal_assets
                       job = completed  ·  outbox publicado
```

#### B.1 — Resolver el manifest

El render productivo **sólo acepta un `ResolvedCompositionManifest`**: el plan ya normalizado, con los
hashes del catálogo, las plantillas, el brand pack y las fuentes sellados dentro. Se produce con una
única fábrica, `resolvePlan`:

```ts
import { resolvePlan } from '@/lib/artifact-composer'
import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'

const plan = JSON.parse(fs.readFileSync('docs/commercial/tenders/sky-blog-2026/deck-plan.json', 'utf8'))

const manifest = await resolvePlan(deckAxisCatalog, {
  artifactId: plan.tenderId,
  slides: plan.slides
})
// → manifest.manifestVersion === 1
// → manifest.catalog.{name,version,registryHash}
// → manifest.slides[], manifest.brandPack, manifest.fonts, manifest.validators[]
```

**El autor nunca elige la plantilla.** Declara la *intención* (`contentType` + slots) y el catálogo
resuelve. Si el plan trae un `template` que contradice al selector, `resolvePlan` aborta con
`TemplateAuthorityError`.

`resolvePlan` **canonicaliza** el input: dos planes equivalentes producen el mismo manifest y por lo
tanto el mismo hash. Eso es lo que hace posible el *drift check* del paso B.4.

#### B.2 — Encolar el render

**API:** `POST /api/commercial/proposals/{proposalId}/render-jobs`

```json
{
  "ownerOrgId": "org-2df565fb-98aa-42f7-b324-ea9a2209017f",
  "artifactPurpose": "deck",
  "audience": "client_facing",
  "outputTarget": "pdf-merged",
  "manifest": { "manifestVersion": 1, "artifactId": "sky-blog-2026", "catalog": { "…": "…" }, "slides": [], "validators": [] },
  "evidenceIds": ["prev-…", "prev-…"]
}
```

| Campo | Qué es |
|---|---|
| `artifactPurpose` | El propósito semántico (≥3 caracteres): `deck`, `preview`, `deck-25-staging-bench`… **Es parte de la clave de idempotencia.** |
| `audience` | `internal` o `client_facing`. `client_facing` **exige que quien lo pida sea una persona**. |
| `outputTarget` | `pdf-merged` (el del catálogo `deck-axis`) o `png-set`. Un target declarado pero no implementado **aborta**; nunca degrada en silencio a PDF. |
| `manifest` | El objeto que devolvió `resolvePlan`, **verbatim**. El hash lo calcula el servidor: nunca se confía en un hash del cliente. |
| `evidenceIds` | Los ids de evidencia que el artefacto **cita**. De acá sale el gate de audience. |

Respuesta: `201` con `{ "job": {…}, "idempotent": false }`.

**La clave de idempotencia es `(ownerOrgId, proposalId, manifestHash, artifactPurpose)`.** Volver a
pedir exactamente el mismo render devuelve `200` con el job existente y **`"idempotent": true`** — nunca
un segundo PDF. Si cambias una coma del plan, el hash cambia y es un job nuevo.

**Los 4 gates que corren AL ENCOLAR (no esperan al worker):**

| # | Gate | Qué rechaza |
|---|---|---|
| 1 | **Audience por referencia** | Un artefacto `client_facing` que cite **una sola** evidencia `internal` (o una evidencia que no exista en la proyección permitida) → se rechaza **completo**. |
| 2 | **Accesibilidad** | Si los requisitos del RFP exigen PDF/UA · 508 · EAA · WCAG → `accessibility_unsupported`. Chromium no emite PDF taggeado: mejor no ofertar que entregar inadmisible. |
| 3 | **Deadline vencido** | Si el deadline de la propuesta ya pasó → no se encola. Renderizar para un proceso cerrado es quemar CPU. |
| 4 | **Manifest** | `manifestVersion` distinto de 1, sin catálogo sellado, sin láminas, o con **algún validador que no esté en `pass`** → `semantic_rejected`. |

Si el gate rechaza, **no se crea ningún job**: la API devuelve `422 proposal_render_rejected` (o `422
proposal_invalid_input` si el problema es la referencia de evidencia). Ver
[entender-los-errores-y-rechazos.md](entender-los-errores-y-rechazos.md).

**Equivalente en script** (la corrida de referencia real, la que produjo el PDF de SKY):

```bash
# Con el proxy Cloud SQL en 15432 y ARTIFACT_RENDER_JOBS_ENABLED=true en el entorno:
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/_sanity-sky-render-pipeline.ts
```

Ese script hace, sin atajos, exactamente el camino gobernado: `createProposal` →
`recordProposalEvidence` → `resolvePlan` → `requestProposalRender`, e imprime el `renderJobId`.

#### B.3 — El dispatcher elige (no hace falta que hagas nada)

Cada **2 minutos**, Cloud Scheduler (`ops-artifact-render-dispatch`) llama al `ops-worker` en
`POST /artifact-render/dispatch`. Ese dispatcher:

1. **Cierra los jobs cuyo deadline venció esperando en la cola** (los marca `timeout` con el detalle, y
   los loguea — jamás los descarta en silencio).
2. **Elige el siguiente por prioridad:** el deadline más próximo primero. Los jobs sin deadline
   **envejecen**: a los 30 minutos en cola alcanzan prioridad de despacho. (Prioridad sin envejecimiento
   es hambruna con otro nombre: el batch sin fecha no correría nunca.)
3. **Lanza una ejecución** del Cloud Run Job. Un despacho por tick — el Job procesa un artefacto por
   ejecución.
4. **Loguea los jobs que pospuso** en ese tick.

El dispatcher **no elige cuál job**: sólo decide *que hay trabajo*. El worker hace el **claim atómico**
del de mayor prioridad (`FOR UPDATE SKIP LOCKED`), así dos ejecuciones concurrentes nunca toman el mismo.

#### B.4 — El worker renderiza

Dentro del Cloud Run Job `artifact-worker`:

1. **Claim** del job (o toma el `RENDER_JOB_ID` si lo ejecutaste a mano).
2. **Drift check:** re-resuelve el manifest contra **su propia copia** del catálogo y compara el hash con
   el que quedó sellado al encolar. Si una plantilla, un contrato o el brand pack cambiaron desde el
   enqueue, el artefacto sería **otro** → `manifest_drift` y **no se renderiza**. (Este check cazó 3 bugs
   reales el primer día.)
3. **Compone** con todos los gates de calidad: geometría real del lienzo, imágenes resueltas
   (`missing_asset`), fuentes sin fallback (`font_fallback_detected`), láminas no vacías (`blank_slide`)
   y filler fail-closed (`semantic_rejected`).
4. **Verifica las constraints fijadas en el job** (no un default releído): peso máximo del PDF y máximo
   de páginas → `size_rejected` si se pasa.
5. **Sube** el PDF y cada preview PNG al **asset store privado** (contexto `proposal_deliverable`), crea
   el vínculo `proposal_assets` (kind `deck`, con el `audience` del job) y marca el job `completed`.
6. Publica el evento `commercial.proposal.render_completed` en el outbox.

**Capacidad medida en Cloud Run** (no es un SLO): 15 láminas → **25,2 s / 3,16 MB**; 25 láminas →
**32,3 s / 5,56 MB**. Ambos al primer intento. Opera inicialmente a **10–15 jobs/hora**; el techo del
dispatcher es 30/hora.

#### B.5 — Ver el estado del job

```bash
# Todos los jobs de una propuesta
pnpm staging:request "/api/commercial/proposals/prop-…/render-jobs?ownerOrgId=org-2df565fb-…"

# Un job puntual
pnpm staging:request "/api/commercial/proposals/prop-…/render-jobs/prnd-…?ownerOrgId=org-2df565fb-…"
```

Lo que devuelve (campos que importan):

```json
{
  "renderJobId": "prnd-518535f0-…",
  "state": "completed",
  "failureCode": null,
  "failureDetail": null,
  "attempts": 1,
  "maxAttempts": 3,
  "manifestHash": "a1b2…",
  "constraints": { "maxPdfMb": 20, "maxPdfMbFromRfp": false, "maxPages": null, "accessibilityRequired": false, "sourceRequirementIds": [] },
  "deadline": "2026-07-15T18:00:00Z",
  "executionName": "…/executions/artifact-worker-xxxxx",
  "outputPdfAssetId": "asset-988fbb9a-…",
  "outputPreviewAssetIds": ["asset-…", "…"]
}
```

**La verdad del estado vive en la base de datos, no en Cloud Run.** Si necesitas mirarlo por SQL:

```sql
SELECT render_job_id, state, failure_code, failure_detail, attempts, output_pdf_asset_id
  FROM greenhouse_commercial.proposal_render_jobs
 WHERE proposal_id = 'prop-…'
 ORDER BY created_at DESC;

-- El historial completo, append-only:
SELECT from_state, to_state, actor_kind, detail, created_at
  FROM greenhouse_commercial.proposal_render_job_events
 WHERE render_job_id = 'prnd-…'
 ORDER BY created_at;
```

#### B.6 — Descargar el PDF

El `outputPdfAssetId` del job es el asset final:

```bash
pnpm staging:request "/api/assets/private/asset-988fbb9a-…"
```

o en el navegador (con sesión): `/api/assets/private/{assetId}` — los PDF se sirven **inline**; agrega
`?inline=1` para forzarlo. Los `outputPreviewAssetIds` son los PNG de cada lámina, por la misma ruta.

La descarga exige `commercial.proposal.read`. **Ningún usuario `client_*` puede descargarlo, nunca** —
ni el PDF final ni las previews: son documentos comerciales con costo interno en su linaje.

## Qué significan los estados

**Estados de un render job:**

| Estado | Qué significa | Qué hacer |
|---|---|---|
| `queued` | Encolado, esperando al dispatcher. | Esperar. El dispatcher corre cada 2 minutos. Si lleva **más de 20 min**, salta la señal `artifact.render.queue.starvation`. |
| `dispatched` | El dispatcher lanzó una ejecución de Cloud Run. | Esperar. |
| `running` | El worker tomó el job y está componiendo. | Esperar (15 láminas ≈ 25 s). |
| `completed` | PDF y previews en el asset store, vinculados a la propuesta. | Descargar y **revisar el PDF con ojo humano** antes de entregarlo. |
| `failed` | Falló, pero **es reintentable**: quedan intentos y la causa no es estructural. | Ver `failure_code` y decidir: reintentar o corregir. |
| `dead_letter` | **Terminal.** Se agotaron los 3 intentos, **o** la causa no es reintentable (el mismo manifest daría el mismo rechazo). | **Requiere una persona.** Corrige el plan/evidencia/requisitos y pide un **render nuevo**. |

**Reintentos:** el retry es **del dominio**, no de Cloud Run (el Job tiene `max-retries=0` para que
ninguna re-ejecución ocurra fuera del contrato). Se pide así:

```bash
pnpm staging:request POST "/api/commercial/proposals/prop-…/render-jobs/prnd-…/retry" '{"ownerOrgId":"org-2df565fb-…"}'
```

Sólo se puede reintentar un job en `failed` o `dead_letter`, y **sólo si su `failure_code` es
reintentable**. Los códigos `audience_violation`, `accessibility_unsupported`, `semantic_rejected`,
`size_rejected`, `geometry_rejected` y `manifest_drift` **no lo son**: el retry devuelve `409
proposal_render_conflict` con el motivo. Ver
[entender-los-errores-y-rechazos.md](entender-los-errores-y-rechazos.md).

## Qué no hacer

- **Nunca entregues un PDF que salió del CLI** (camino A) a un comité. No pasó por los gates de la
  propuesta: nadie verificó que no lleve evidencia interna, ni que cumpla el peso máximo de las bases.
- **Nunca edites el `plan.json` "un poquito" y reutilices el job anterior.** Cambiar el plan cambia el
  hash: es un artefacto distinto y necesita su propio job. Reintentar el viejo renderiza el **plan
  viejo** (el manifest del job es inmutable).
- **Nunca declares el `template` de una lámina en el plan.** Declaras `contentType` + slots; el catálogo
  elige. Contradecirlo aborta.
- **Nunca cambies el `audience` de una evidencia para destrabar un `audience_violation`.** Corrige el
  plan: saca el dato interno del deck.
- **Nunca supongas que "completed" significa "listo para enviar".** El sistema garantiza que el archivo
  es *admisible y trazable*, no que el argumento sea bueno. El PDF se mira antes de subirlo.
- **Nunca dispares el render sin haber declarado los requisitos del RFP.** Sin ellos, el sistema aplica
  el default de 20 MB y no sabe nada de páginas ni de accesibilidad: puedes producir un PDF perfecto que
  el portal rechace.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `422 proposal_render_rejected` al encolar y no se creó ningún job | Uno de los 4 gates de enqueue. El detalle está en el mensaje del error tipado (`flag_disabled`, `deadline_expired`, `accessibility_unsupported`, `semantic_rejected`, `audience_violation`). | Ver la tabla completa en [entender-los-errores-y-rechazos.md](entender-los-errores-y-rechazos.md). |
| "El pipeline de render está apagado" | El flag `ARTIFACT_RENDER_JOBS_ENABLED` está en `false` en el runtime que recibe el enqueue (hoy: **Vercel Production**). | Es el diseño actual. El CLI (camino A) sigue disponible. Abrir producción exige sign-off. |
| El job queda `queued` para siempre | El dispatcher está caído, o el flag está apagado en el `ops-worker`. | Señal `artifact.render.queue.starvation`. Ver [operar-el-artifact-worker.md](operar-el-artifact-worker.md). |
| `manifest_drift` | El catálogo (plantilla/brand pack/contrato) cambió entre el enqueue y la ejecución. | **No se reintenta.** Vuelve a resolver el plan (`resolvePlan`) y encola un render nuevo: el hash será otro. |
| El PDF salió pero pesa más de lo que aceptan las bases | El requisito de peso no estaba declarado cuando encolaste (el job fijó el default de 20 MB). | Declara el requisito `format` con el literal de las bases y encola un render nuevo. El sistema toma el límite **más restrictivo**. |
| Pido el mismo render y me devuelve `idempotent: true` | Es correcto: mismo `ownerOrgId` + `proposalId` + `manifestHash` + `artifactPurpose`. | Si de verdad quieres otro artefacto, cambia el `artifactPurpose` (ej. `deck-v2`) o el plan. |

## Referencias tecnicas

- Motor: `src/lib/artifact-composer/` (`resolvePlan`, `composeArtifact`, `quality-gates.ts`)
- Catálogo del deck: `src/lib/artifact-composer/catalogs/deck-axis/`
- Command del render: `src/lib/commercial/tenders/proposals/render-jobs.ts`
- Gates de enqueue: `render-projection.ts` (audience) + `render-constraints.ts` (RFP)
- Dispatcher: `src/lib/commercial/tenders/proposals/render-dispatch.ts` + `services/ops-worker/server.ts`
- Worker: `services/artifact-worker/main.ts` + [`README.md`](../../../services/artifact-worker/README.md)
- Esquema de jobs: `migrations/20260712180933098_task-1391-proposal-render-jobs.sql`
- Corrida de referencia: `scripts/commercial/_sanity-sky-render-pipeline.ts`
