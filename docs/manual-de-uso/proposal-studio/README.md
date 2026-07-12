# Proposal Studio + Artifact Composer + Artifact Renderer — índice

> **Tipo de documento:** Manual de uso (índice de carpeta)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Modulo:** Comercial — Proposal Studio (`commercial.proposal.*`, módulo `proposal_studio_v1`)
> **Documentacion tecnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) · [COMMERCIAL_TENDERS_AGENT_INVARIANTS.md](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md)
> **Tasks fuente:** `TASK-1392` (aggregate `Proposal`) · `TASK-1393` (Artifact Composer) · `TASK-1391` (Artifact Renderer en Cloud Run)

## Para qué sirve esta carpeta

Aquí está el runbook completo del sistema que convierte **una licitación o RFP en un PDF gobernado**:
crear la propuesta como objeto de negocio, adjuntarle el RFP y su evidencia, componer el deck y
renderizarlo con todos sus gates, y operar/diagnosticar el worker que lo produce.

Son tres piezas encadenadas. Conviene saber cuál es cuál antes de abrir un manual:

| Pieza | Qué es | Dónde vive | Qué produce |
|---|---|---|---|
| **Proposal Studio** | El objeto de negocio: la propuesta, sus estados, su RFP, su evidencia, sus requisitos y su cotización | `greenhouse_commercial.proposal*` + `/api/commercial/proposals/**` | Decisiones gobernadas (bid / no-bid, listo para presentar) |
| **Artifact Composer** | El motor de composición: convierte un plan de láminas en un manifest sellado y un PDF | `src/lib/artifact-composer/**` + catálogo `deck-axis` | `ResolvedCompositionManifest` + PDF + PNGs |
| **Artifact Renderer** | El pipeline productivo: cola de jobs + dispatcher + Cloud Run Job que ejecuta el motor y deja el PDF en el asset store | `greenhouse_commercial.proposal_render_jobs` + `services/artifact-worker/` | Job auditable + asset privado + previews |

## Empieza acá — qué manual leer

| Si quieres… | Lee |
|---|---|
| Crear una propuesta, mover su estado, adjuntar el RFP, registrar evidencia, declarar requisitos, vincular la cotización | [crear-y-operar-una-propuesta.md](crear-y-operar-una-propuesta.md) |
| Convertir un plan de láminas en el PDF de la oferta (los dos caminos: exploratorio y productivo) | [generar-el-deck-de-una-propuesta.md](generar-el-deck-de-una-propuesta.md) |
| Entender por qué el sistema rechazó tu render, o qué significa un `failure_code` | [entender-los-errores-y-rechazos.md](entender-los-errores-y-rechazos.md) |
| Ver ejecuciones en Cloud Run, leer logs, desatascar la cola, reintentar, apagar todo | [operar-el-artifact-worker.md](operar-el-artifact-worker.md) |
| **Escribir el contenido del deck** (el plan, las láminas, los slots) y entender los errores del compositor | [../comercial/componer-deck-de-licitacion.md](../comercial/componer-deck-de-licitacion.md) |
| **El método comercial** de una licitación (leer bases, admisibilidad, bid/no-bid, squad, precio) | [../comercial/construir-una-licitacion.md](../comercial/construir-una-licitacion.md) |

## Relación con los manuales que ya existían

Estos manuales **complementan**, no reemplazan, a los dos manuales comerciales previos:

- **[componer-deck-de-licitacion.md](../comercial/componer-deck-de-licitacion.md)** sigue siendo la
  referencia para **escribir el plan del deck** (`plan.json`: `contentType`, slots, `evidenceRef`) y
  para entender los errores de composición (`too_long`, `missing_evidence_ref`, "no cabe en su lienzo").
  **Lo que quedó superseded:** ese manual describe **sólo el camino CLI** (`pnpm deck:compose`), que
  hoy es el **camino exploratorio**. El camino productivo —el que deja un PDF gobernado, auditable y
  guardado en el asset store— es el **render job** documentado en
  [generar-el-deck-de-una-propuesta.md](generar-el-deck-de-una-propuesta.md). Cuando el deck es una
  entrega real a un comité, el CLI no basta.
- **[construir-una-licitacion.md](../comercial/construir-una-licitacion.md)** sigue siendo el método
  comercial (cómo se piensa un bid). Este sistema es el **motor** que ejecuta ese método: donde el
  manual dice "decide bid/no-bid", acá eso es la transición `fit_review → producing` con su gate de
  margen.

## Estado del sistema (2026-07-12)

- **Staging:** operativo y verificado con render real en Cloud Run (deck SKY de 15 láminas,
  25,2 s / 3,16 MB; bench de 25 láminas, 32,3 s / 5,56 MB).
- **Producción:** el pipeline de render está **cerrado por diseño** — Vercel Production no tiene la
  variable `ARTIFACT_RENDER_JOBS_ENABLED`, así que el enqueue productivo rechaza con `flag_disabled`.
  Abrirlo exige sign-off del operador + integrar `artifact-worker-deploy.yml` al release control plane.
- **Entitlement:** el módulo `proposal_studio_v1` está activo **sólo para la organización Efeonce**
  (`org-2df565fb-98aa-42f7-b324-ea9a2209017f`). Cualquier otra organización recibe
  `proposal_not_entitled` (403).
- **Sin UI todavía:** el sistema se opera por **API y por scripts**. No hay pantalla en el portal.

## Referencias técnicas

- Arquitectura: [`docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md)
- Invariantes de agente: [`docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md)
- Documentación funcional: [`docs/documentation/comercial/proposal-studio-aggregate.md`](../../documentation/comercial/proposal-studio-aggregate.md)
- Runbook del worker: [`services/artifact-worker/README.md`](../../../services/artifact-worker/README.md)
- Tasks: `docs/tasks/complete/TASK-1392-…`, `TASK-1393-…`, `TASK-1391-…`
- Incidente del primer deploy: [`docs/issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md`](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md)
