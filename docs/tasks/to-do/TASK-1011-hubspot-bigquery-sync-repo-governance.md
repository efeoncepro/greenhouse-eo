# TASK-1011 — HubSpot→BigQuery sync repo governance (transfer + deploy gobernado + gate de consolidación)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio-Alto` (cierra trust boundary de un sync productivo; sin incidente activo)
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `integrations.hubspot|cross-repo|infra|governance`
- Blocked by: `none`
- Branch: `task/TASK-1011-hubspot-bigquery-sync-repo-governance`

## Summary

El sync **HubSpot→BigQuery** (`main.py`, Cloud Function `hubspot-bq-sync`) — que alimenta `hubspot_crm.*` → conformed → `greenhouse_crm.*` (de lo que dependen, entre otros, el cotizador, los economics comerciales y el webhook de deal de TASK-1010) — vive en **`cesargrowth11/hubspot-bigquery`**, una cuenta personal externa, y se despliega manual con `gcloud run deploy --source` desde local. Esta task cierra ese riesgo **escalonadamente y reversible**: (1) transferir el repo a la org `efeoncepro`, (2) deploy gobernado por GitHub Actions + WIF, (3) decisión de consolidación (Cloud Run vs Workers vs absorber al monorepo) **gated por TASK-879**.

## Why This Task Exists

Verificado en vivo (2026-06-04, gh API): el repo de sync HubSpot→BQ sigue en `cesargrowth11/hubspot-bigquery` (sin redirect de transfer; `efeoncepro/hubspot-bigquery` no existe). Es la **misma clase de riesgo** que ya motivó el transfer de `notion-bigquery` a `efeoncepro` (changelog 2026-05-18): si la cuenta personal externa pierde acceso, Greenhouse pierde el source-of-truth del código de un sync **productivo crítico**, y parchearlo requiere autorización del owner externo (vivido en vivo durante un patch defensivo del sync de notion). El deploy manual-desde-local (sin Actions/WIF/CI) no es trazable ni reproducible. NO es un incidente activo (el sync funciona), pero es deuda de gobernanza + seguridad que debe cerrarse antes de que escale.

Distinción canónica (anti-confusión, para que no se repita el cruce de esta sesión): lo que se **absorbió al monorepo** `greenhouse-eo` fue el **bridge** Cloud Run `hubspot-greenhouse-integration` (TASK-574) + el **app project** HubSpot (scopes + webhooks, TASK-706). Lo que se **transfirió a efeoncepro** fue **`notion-bigquery`** (sync de Notion), NO HubSpot. Este `hubspot-bigquery` (sync HubSpot→BQ) es el único que queda en la cuenta externa.

## Goal

- Cerrar el trust boundary: `hubspot-bigquery` bajo la org `efeoncepro` (no cuenta personal externa).
- Deploy del sync trazable y reproducible (GitHub Actions + WIF), no `gcloud deploy` manual.
- Decisión documentada y gated de consolidación (mantener standalone con sunset vs absorber al monorepo como worker), tratando `hubspot-bigquery` + `notion-bigquery` como **una clase** (mismo patrón de gobernanza).
- Cero impacto operacional en el sync durante el cambio (reversible en cada paso).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` [verificar]
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- CLAUDE.md → "Cross-repo action safety" (verificar relevancia operacional + CI/CD del repo target antes de cualquier commit cross-repo)

Reglas obligatorias:

- **Cross-repo safety**: auditar deps técnicas ANTES del transfer (GitHub Actions, Vercel/Netlify configs, GCP Cloud Build triggers, WIF providers, IAM bindings, submódulos) — espejo del audit pre-transfer de `notion-bigquery`.
- **No big-bang de consolidación**: la decisión absorber-vs-standalone pasa por el gate **TASK-879** (inventario de uso legacy + piloto sandbox + matriz Cloud Run vs Workers vs híbrido). NO migrar/absorber sin ese gate.
- **Reversibilidad**: cada slice reversible (transfer GitHub → retransfer 1 min; deploy Actions → revert workflow + fallback a deploy manual).

## Normative Docs

- Changelog entry "Governance fix: transfer `notion-bigquery` legacy sync repo a `efeoncepro` org" (2026-05-18) — **precedente/runbook exacto** del transfer.
- `docs/tasks/to-do/TASK-879-*.md` — gate de evaluación Notion/Cloud Run/Workers (aplica por analogía a los syncs *-BigQuery).
- Cross-repo tasks notion (mirror): `TASK-1000`, `TASK-1003`, `TASK-1004`, `TASK-1007` (mismo dominio cross-repo + deploy-sensitive).

## Dependencies & Impact

### Depends on

- Acceso de owner de la org `efeoncepro` (el operador) para ejecutar el transfer en GitHub.
- WIF provider GCP para el deploy gobernado (Slice 2) — verificar si reusa el de los workers del monorepo o requiere uno nuevo.

### Blocks / Impacts

- No bloquea a nadie hoy (el sync funciona). Habilita gobernanza consistente de los repos de sync.
- Relacionado con TASK-1010 (su deal webhook consume `greenhouse_crm.deals`, poblado por este sync) — pero TASK-1010 cierra independiente.

### Files owned

- Repo externo `cesargrowth11/hubspot-bigquery` → `efeoncepro/hubspot-bigquery` (transfer + workflow nuevo `.github/workflows/*` ahí).
- `greenhouse-eo`: referencias en docs (`project_context.md`, `Handoff.md`, skills `hubspot-ops` / `hubspot-greenhouse-bridge`) que apunten a la ubicación del sync.

## Current Repo State

### Already exists

- `cesargrowth11/hubspot-bigquery` (sync HubSpot→BQ `main.py` + `create_hubspot_properties.py` + `deploy.sh`). Deploy manual `gcloud run deploy --source` desde local. [verificar contenido exacto al tomar la task]
- Precedente completo de transfer: `notion-bigquery` ya en `efeoncepro/` con README deprecation note + sunset plan.

### Gap

- Repo de sync productivo en cuenta personal externa (trust boundary abierto).
- Deploy no gobernado (manual, sin Actions/WIF/CI).
- Sin decisión documentada sobre consolidación (standalone vs absorber).

## Scope

### Slice 1 — Transfer del repo a `efeoncepro` (cierra trust boundary)

- Audit pre-transfer de deps técnicas (espejo notion): Actions, Vercel/Netlify, Cloud Build triggers, WIF, IAM, submódulos. Documentar "cero deps a la URL vieja" o listarlas.
- Ejecutar transfer GitHub (`cesargrowth11/hubspot-bigquery` → `efeoncepro/hubspot-bigquery`), nombre preservado.
- Actualizar `git remote` local; verificar auto-redirect; smoke: el sync sigue funcionando (deploy/`/health` o corrida de prueba).
- README del repo: deprecation/ownership note (si aplica el patrón sunset).
- Actualizar referencias en `greenhouse-eo` docs + skills (`hubspot-ops`, `hubspot-greenhouse-bridge`) + memorias.

### Slice 2 — Deploy gobernado (GitHub Actions + WIF)

- Workflow de deploy en el repo transferido (mirror del patrón de los 4 workers del monorepo: WIF, sin creds long-lived, smoke post-deploy). Reemplaza `gcloud run deploy --source` manual.
- Verificar IAM/WIF del SA de deploy.

### Slice 3 — Decisión de consolidación (gated, NO ejecución)

- Pasar por **TASK-879**: inventario de uso legacy + matriz Cloud Run vs Workers vs absorber-al-monorepo (espejo TASK-574). Documentar la decisión + (si aplica) abrir task derivada de ejecución. Tratar `hubspot-bigquery` + `notion-bigquery` como una clase con política común.

## Out of Scope

- Reescribir la lógica del sync HubSpot→BQ (`main.py`).
- Absorber el sync al monorepo en esta task (eso es ejecución post-gate TASK-879).
- Tocar el bridge `hubspot-greenhouse-integration` (ya en el monorepo) ni el app project (scopes/webhooks).
- Cambiar el sync de Notion (`notion-bigquery`) — ya gobernado.

## Detailed Spec

Mirror del runbook de transfer de `notion-bigquery` (changelog 2026-05-18). El sync seguirá deployado a su Cloud Run/Function productivo; el cambio es de **propiedad del repo + pipeline de deploy**, no de runtime de datos. La consolidación (Slice 3) NO se ejecuta sin el gate TASK-879.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1 (transfer) → 2 (deploy gobernado) → 3 (decisión gated). NO ejecutar 3 (absorción) sin TASK-879. Slice 2 requiere Slice 1 (el repo debe estar en la org para configurar WIF/Actions de la org).

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Transfer rompe un trigger/redirect oculto | sync HubSpot→BQ | Baja | Audit pre-transfer de deps (espejo notion); GitHub deja auto-redirect meses | smoke `/health` o corrida de prueba post-transfer |
| Deploy gobernado mal configurado deja el sync sin poder deployar | sync | Media | Mantener `gcloud deploy` manual como fallback hasta que Actions+WIF esté verde | run del workflow success + revisión actualizada |
| Absorción prematura rompe pipeline productivo | BQ ingestion | Alta si se salta el gate | Slice 3 es decisión gated por TASK-879; NO ejecutar aquí | N/A (no se ejecuta) |
| Owner externo bloquea el transfer | governance | Baja | El operador es owner de `efeoncepro`; transfer es 1 click del owner del repo origen | transfer confirmado |

### Feature flags / cutover

No aplica (no hay runtime de datos nuevo). El "cutover" es el cambio de owner del repo (atómico en GitHub, con redirect) + el cambio de pipeline de deploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 transfer | retransferir a `cesargrowth11` | ~1 min | Sí |
| 2 deploy Actions | desactivar workflow + volver a `gcloud deploy` manual | ~5 min | Sí |
| 3 decisión | no se ejecuta nada destructivo (solo doc) | — | N/A |

### Production verification sequence

Post Slice 1: `git remote` actualizado + auto-redirect OK + smoke del Cloud Run/Function (`/health` o corrida). Post Slice 2: run del workflow `success` + revisión Cloud Run con el SHA esperado.

### Out-of-band coordination required

- Owner del repo origen (`cesargrowth11`) debe aceptar/ejecutar el transfer, o el operador (owner de `efeoncepro`) lo acepta del lado destino. Coordinar con el operador.

## Acceptance Criteria

- [ ] `hubspot-bigquery` vive en `efeoncepro/` (verificable por `gh repo view efeoncepro/hubspot-bigquery`).
- [ ] Audit pre-transfer documentado (deps técnicas a la URL vieja: cero o listadas + resueltas).
- [ ] El sync HubSpot→BQ sigue funcionando post-transfer (smoke documentado).
- [ ] Deploy del sync por GitHub Actions + WIF (run success), `gcloud deploy` manual ya no es el path canónico.
- [ ] Decisión de consolidación documentada con referencia a TASK-879 (standalone vs absorber).
- [ ] Referencias en `greenhouse-eo` (docs + skills `hubspot-ops`/`hubspot-greenhouse-bridge` + memorias) apuntan a la ubicación correcta.

## Verification

- Manual: `gh repo view`, smoke del Cloud Run, run del workflow de deploy. No `pnpm`-gated (el cambio es cross-repo + infra).

## Closing Protocol

- Mover a `complete/`, Lifecycle `complete`, sync README + TASK_ID_REGISTRY.
- Changelog + Handoff con el transfer + deploy gobernado + decisión de consolidación.
- Actualizar skills `hubspot-ops` + `hubspot-greenhouse-bridge` + memorias con la ubicación final.

## Follow-ups

- Si Slice 3 decide absorber: task derivada de ejecución (mirror TASK-574) post-gate TASK-879.
- Evaluar política común de sunset/gobernanza para todos los repos de sync `*-BigQuery`.

## Open Questions

- ¿El WIF/SA de deploy del sync reusa el de los workers del monorepo o necesita uno propio? (resolver en Discovery de Slice 2).
- ¿El transfer lo ejecuta el owner de `cesargrowth11` (origen) o se acepta del lado `efeoncepro` (destino)? (coordinación operador).
