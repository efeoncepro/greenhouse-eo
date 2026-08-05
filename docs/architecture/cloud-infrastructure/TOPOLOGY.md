# Cloud Infrastructure — Topología y Workload Placement

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)

## 1. Topología compartida staging/producción — CANÓNICA, no transitoria

**SoT:** `services/ops-worker/deploy.sh` (§Environment): *"The ops-worker is a SINGLE Cloud Run
service intentionally shared by both staging and production (same DB, same scheduler jobs, same
runtime revision). This is the canonical topology, not a temporary shortcut."* Formalizado por
TASK-1302 (2026-08-05); supersede el framing transitorio ("por ahora") del Delta 2026-04-15.

Greenhouse opera una **infraestructura compartida** para el runtime principal del portal y el
runtime reactivo:

- un único servicio Cloud Run `ops-worker`
- una única instancia Cloud SQL `greenhouse-pg-dev`
- la separación por ambiente vive en el **contrato de secrets/config**, no en un duplicado de
  infraestructura base

Consecuencias operativas duras:

- **`ENV` no parte la infraestructura.** `ENV=staging|production` sólo selecciona qué secret
  refs de NextAuth/Resend se montan sobre el **mismo** servicio, la **misma** revisión y los
  **mismos** Cloud Scheduler jobs. Un `ENV` equivocado no crea un ambiente aparte: intercambia
  credenciales en un servicio vivo compartido (por eso el script exige `ENV` explícito y no
  tiene default silencioso).
- **No existe un flip "sólo staging"** para nada hospedado en el `ops-worker`: flags, crons y
  credenciales quedan efectivos para todos los ambientes a la vez. El rollout gradual real se
  gatea **en datos** (per-org / per-perfil / opt-in persistido), no por ambiente.
- **Una capacidad que vive sólo en el worker queda LIVE al mergear a `develop`.** El deploy se
  dispara desde `develop` vía `.github/workflows/ops-worker-deploy.yml`; no hay promoción a
  `main` ni paso por el release control plane. El blast radius se declara antes del merge.
- **Tampoco hay "migrar primero en staging".** Una migración aplicada sobre `greenhouse-pg-dev`
  es una migración aplicada en producción.
- **Un runtime nuevo necesita su propia copia de la config.** Un reader que antes sólo corría
  en rutas Vercel no hereda nada al empezar a correr en Cloud Run: flag, credenciales y
  `*_SECRET_REF` se declaran otra vez en `deploy.sh`. Check previo a prender:
  `gcloud run services describe ops-worker --region us-east4 --format=json` contra la revisión
  activa (bug class: TASK-1302 movió el reader de Google Search Console al worker sin sus
  variables; misma clase que ISSUE-113).
- **El estado de pausa de un Cloud Scheduler job es declarativo.** `upsert_scheduler_job`
  recibe un 5º argumento `paused` y lo **re-aplica en cada deploy**: un
  `gcloud scheduler jobs resume|pause` a mano se revierte solo en el siguiente deploy, en
  silencio — mismo patrón que un env var aplicado sólo con `--update-env-vars` frente al
  `--set-env-vars` destructivo del script.
- `ENV=production` **sí** debe aplicar el contrato productivo de secrets cuando exista
  diferencia real de ambiente (`NEXTAUTH_SECRET`, `RESEND_API_KEY`, cualquier secret con blast
  radius ambiente-específico). Si en el futuro se crea infraestructura dedicada para
  producción, el deploy evoluciona por overrides explícitos o defaults nuevos, no por asumir
  refs inexistentes.

Invariantes de agente derivados:
[`agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`](../agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md)
§`Cloud Run ops-worker`.

## 2. Workload Placement Policy

### Principio rector

**El procesamiento de datos que no es interacción directa con el usuario del portal debe
ejecutarse en GCP Cloud, no en Vercel Functions.** (Decisión 2026-04-04, TASK-239/241.)

Vercel es la capa de presentación y API del portal. GCP Cloud es la capa de procesamiento,
transformación y orquestación de datos. La frontera la define la naturaleza del trabajo, no la
conveniencia de implementación.

### Reglas de colocación

| Tipo de proceso | Dónde corre | Por qué |
| --- | --- | --- |
| API route que sirve datos al portal (GET/POST < 30s) | Vercel Functions | Request-response del portal, necesita sesión de usuario |
| Materialización de métricas, snapshots, reports | **Cloud Run** | Excede 30s, no requiere sesión, accede a BigQuery + PostgreSQL |
| Pipeline AI/LLM (scoring, enrichment, evaluación) | **Cloud Run** | Múltiples llamadas a LLM, timeout impredecible, no requiere sesión |
| Sync batch de fuente externa (Notion, HubSpot, Nubox) | **Cloud Run / Cloud Functions** | Ya probado, volumen variable, timeout largo |
| ETL, backfill, re-procesamiento | **Cloud Run** | Proceso pesado one-shot, timeout configurable hasta 60 min |
| Render pesado one-shot (Chromium/Playwright) | **Cloud Run Job** (`artifact-worker`) | No expone HTTP, escala a cero real, retry del dominio |
| Trigger periódico (cron) | **Cloud Scheduler** → Cloud Run | Scheduler dispara, Cloud Run ejecuta |
| Fan-out paralelo (procesar N items) | **Cloud Tasks** → Cloud Run/Functions | Distribuye carga, cada item es un HTTP call |
| Reactive consumer del outbox (batch processing) | **Cloud Run** (`ops-worker`) | Batch de 50 eventos puede exceder 30s bajo carga (TASK-254) |
| Health checks y triggers fire-and-forget | Vercel Functions | Liviano, solo dispara y retorna |

### Regla de decisión rápida

```
¿El proceso necesita sesión de usuario?
  → Sí: Vercel Functions
  → No: ¿Puede completar en < 30s de forma consistente?
    → Sí: Vercel Functions (cron route) es aceptable
    → No: Cloud Run + Cloud Scheduler
```

### Criterios para migrar un cron Vercel a Cloud Run

Un cron debe migrar cuando cumple **2 o más** de:

1. Procesa una cola o backlog (no determinístico)
2. Necesita >60s de forma habitual
3. Tiene semántica de retry/recovery
4. Fallo silencioso tiene impacto operativo
5. Se beneficia de run tracking institucional (`source_sync_runs`)

> El inventario "procesos por migrar" de 2026-04-04 y la tabla de "próximos candidatos"
> (TASK-258/259/260/261/262) **ya se ejecutaron**: el event bus (outbox publish → react →
> recovery), sync-conformed, entra-profile-sync, nubox, webhook-dispatch e ico-member-sync
> corren hoy en el `ops-worker` vía Cloud Scheduler. Ver el inventario vigente en
> [SCHEDULING.md](SCHEDULING.md) y la cronología en [HISTORIAL.md](HISTORIAL.md).

### Anti-patterns

- **No fragmentar un proceso pesado en N endpoints Vercel para esquivar el timeout.** Si el
  proceso es pesado, va a Cloud Run como unidad.
- **No crear Cloud Functions nuevas cuando Cloud Run sirve.** Cloud Run es más flexible
  (container, timeout configurable, concurrencia). Cloud Functions sólo si el trigger nativo
  (Pub/Sub, Storage) lo justifica.
- **No asumir que un proceso liviano hoy seguirá siéndolo.** Si un cron route de Vercel empieza
  a acercarse a 30s, planificar la migración antes de que falle.

## 3. Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SOURCES                              │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  Notion  │ HubSpot  │ Frame.io │   GA4    │  Search  │  Exchange Rate  │
│   API    │   API    │   API    │  Export  │  Console │     APIs        │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬───────┘
     │          │          │          │          │              │
     ▼          ▼          ▼          │          │              │
┌─────────────────────────────────┐   │          │              │
│    CLOUD RUN / CLOUD FUNCTIONS  │   │          │              │
│  (sync legacy us-central1 +     │   │          │              │
│   workers modernos us-east4)    │   │          │              │
└────────┬───────────┬────────────┘   │          │              │
         │           │                ▼          ▼              │
         ▼           │     ┌──────────────────────────┐         │
┌──────────────────────────┴───────────────────────────┐        │
│                BIGQUERY (US multi-region)             │        │
│  greenhouse_raw ──► greenhouse_conformed ──► marts    │        │
│  hubspot_crm · notion_ops · ico_engine · searchconsole│        │
└────────────────────────┬──────────────────────────────┘        │
                         │ (materializaciones batch,             │
                         │  outbox publish vía ops-worker)       │
                         ▼                                       │
┌──────────────────────────────────────────────────────────┐     │
│         CLOUD SQL — PostgreSQL 16 (us-east4)              │     │
│         greenhouse-pg-dev · schemas greenhouse_*          │     │
└────────────────────────┬─────────────────────────────────┘     │
                         │                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js 16.x)                        │
│  Production: greenhouse.efeoncepro.com                           │
│  Staging:    dev-greenhouse.efeoncepro.com                       │
│  Crons livianos: ver SCHEDULING.md (SoT: vercel.json)            │
│  Auth: Azure AD SSO + Google OAuth                               │
└──────────────────────────────────────────────────────────────────┘
```

### Flow summary

1. **Ingest** — Cloud Scheduler dispara los servicios de sync; cada uno lee su fuente externa
   (Notion, HubSpot, Frame.io) y escribe a BigQuery.
2. **Conform** — `greenhouse_raw` se transforma en `greenhouse_conformed` (tablas limpias,
   particionadas, source-agnostic).
3. **Materialize** — El `ops-worker` corre el outbox publisher (Postgres → BigQuery) y los
   workers batch materializan métricas (BigQuery → BigQuery / Cloud SQL).
4. **Serve** — El portal Next.js lee de Cloud SQL (transaccional) y BigQuery (analítico).
5. **Sync back** — Syncs bidireccionales (HubSpot ↔ Notion) mantienen alineados los sistemas
   externos.
6. **Notify** — `notion-teams-notify` empuja eventos de tasks a canales de Microsoft Teams.
