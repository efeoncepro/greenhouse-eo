# TASK-1009 — Notion onboarding preflight: validar que un cliente nuevo REALMENTE fluye al portal (end-to-end) + enforce template L1

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (convierte el debugging arqueológico por cliente en "corré el check, arreglá lo rojo")
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-CLIENT-360`
- Domain: `integrations.notion|infra|identity`
- Blocked by: `none` (idealmente después de TASK-1008 — gate de sprints — para no falsear el "no fluye")
- Blocks: `none`
- Branch: `develop` (greenhouse-eo)

## Summary

El onboarding de un cliente Notion (TASK-992/998/1000/1003/1004/1007) ya automatiza casi todo, pero el checklist canónico (`standard_onboarding_v1`) tiene `provision_notion_workspace` como **un checkbox de "configuré"** — no valida que la data **realmente llegue al portal**. La sesión de Berel (2026-06-04) fue exactamente eso: 1 hora cruzando BQ + PG + logs para descubrir por qué no fluía (`client_id` NULL → TASK-1004, sprint vacío → readiness gate, `last_synced_at` NULL → TASK-1007, template custom). Este task crea un **preflight de readiness end-to-end** + un **validador del template L1** y los engancha como **item bloqueante del checklist** (`verify_notion_flowing`). Resultado: ningún cliente se declara "onboardeado" hasta que sus tareas estén en el portal.

## Why This Task Exists

El hueco no es "configurar Notion" (eso ya está en el checklist) — es la **diferencia entre 'configurado' y 'fluyendo'**. Hoy esa diferencia se descubre debuggeando a mano. El preflight la convierte en una verificación determinística que cualquiera corre. Además, el template L1 custom (estatus/título no canónicos) es la trampa silenciosa: Berel zafó por aliases, el próximo cliente puede no zafar. Regla canónica del repo: **enforce template L1 ANTES del onboarding, no aliases por cliente.**

## Architecture Alignment

- Reusa el orquestador de lifecycle existente (TASK-992 `client_lifecycle_cases` + `standard_onboarding_v1`). NO crear checklist paralelo.
- Reusa los helpers de freshness/readiness existentes (`getNotionRawFreshnessGate`, `getNotionFreshnessFromBigQuery`, `resolveProductiveWorkspace`).
- Patrón composer read-only (mirror TASK-672 Platform Health): N checks en paralelo, timeout per-check, degradación honesta.
- CLAUDE.md → "Notion sync canónico", "Canonical task status vocabulary V1", Solution Quality Contract, capability grant coverage (TASK-873/935).

## Goal

Dado un `space_id` de un cliente, un preflight que valida la cadena completa y reporta verde/rojo por eslabón:

```
1. token Notion resuelve (secret ref en PG → Secret Manager)
2. space_notion_sources: sync_enabled=TRUE + data_source ids presentes
3. raw aterrizó: notion_ops.raw_pages_snapshot tiene filas para el space
4. client_id atribuido: notion_ops.tareas.client_id no-NULL (TASK-1004)
5. readiness gate: el space es "ready" (tareas+proyectos; sprints opcional tras TASK-1008)
6. template L1 conforme: propiedades del teamspace ⊇ canónicas (título nombre_de_tarea/de_la_tarea, Estado mapeable a vocabulario V1)
7. conformed fluye: greenhouse_conformed.delivery_tasks tiene filas
8. portal: PG greenhouse_delivery.tasks tiene filas
9. last_synced_at fresco en PG (TASK-1007)
```

## Slices

- **Slice 1** — Validador de template L1: helper que extrae las propiedades del space desde `raw_properties_json` y las compara contra el contrato canónico (título candidates `NOTION_TASK_TITLE_CANDIDATES`, `Estado` mapeable vía `task-status-canonical.ts`). Reporta `conforme | drift (qué falta/qué sobra)`. Reusa la normalización de keys del sync.
- **Slice 2** — Composer preflight `getNotionOnboardingReadiness(spaceId)`: los 9 checks en paralelo, struct `{ check, status: ok|fail|degraded, detail }[]` + `readyToOnboard` boolean. Server-only.
- **Slice 3** — CLI `pnpm notion:onboarding-preflight <spaceId>` (output humano + `--json`) para el operador.
- **Slice 4** — Enganche al checklist: item `verify_notion_flowing` en `standard_onboarding_v1` (migración additive), **required + blocking**, owner `operations`. El item se auto-completa cuando el preflight pasa (o lo marca el operador con evidencia).
- **Slice 5** — (opcional) reliability signal `integrations.notion.onboarding_incomplete` (spaces con caso onboarding abierto cuyo preflight falla > N días).

## Definition of Done

- [ ] Validador L1 + composer preflight + CLI, con tests.
- [ ] Item `verify_notion_flowing` en el checklist, bloqueante.
- [ ] Verificado contra Berel (debe dar verde end-to-end ahora) + contra un space mal-configurado (debe marcar el eslabón roto).
- [ ] Capability grant coverage si se agrega endpoint admin.
- [ ] `pnpm test` + tsc + lint verde.
- [ ] Lifecycle → complete, doc funcional + manual de uso (runbook de onboarding Notion), Handoff.

## Hard rules

- **NUNCA** crear un checklist/orquestador paralelo. Extender `standard_onboarding_v1` (TASK-992).
- **NUNCA** declarar un cliente "onboardeado" con `verify_notion_flowing` en rojo (item bloqueante).
- **NUNCA** agregar aliases de status/título por cliente para "pasar" el validador L1. El fix es alinear el template del cliente en Notion (enforce L1), no parchear el validador.
- **SIEMPRE** degradación honesta en el composer (un check que falla no rompe el resto; reporta `degraded`).
- **NUNCA** loggear el token Notion ni secret refs crudos en el output del preflight.

## Out of Scope

- Auto-corregir el template en Notion (inherentemente operador-side; el preflight lo **gatea**, no lo arregla).
- Crear la integración Notion / pegar token (sigue siendo paso de operador en `provision_notion_workspace`).
- Onboarding de canales Teams / portal users (ya cubiertos por sus items: TASK-1001 + communication channels).
