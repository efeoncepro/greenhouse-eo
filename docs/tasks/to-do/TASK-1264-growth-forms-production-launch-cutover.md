# TASK-1264 — Growth Forms: lanzamiento productivo (catálogo + selector + cutover del form)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|hubspot|wordpress|ops`
- Blocked by: `TASK-1258`
- Branch: `task/TASK-1264-growth-forms-production-launch-cutover`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Rollout operativo (NO de código nuevo) para encender en **producción** el primer form
comercial real de Growth Forms (`efeonce-lead-gen-web`, GUID `de4593c3`) + su selector
WordPress. Todo el código ya está construido y probado en staging (TASK-1258/1259/1261);
esta task ejecuta la secuencia operador-coordinada: flags prod, embed key, deploy del plugin,
swap del embed vivo en `/diseno-de-sitios-web/`, cutover del destino HubSpot, verificación.

## Why This Task Exists

TASK-1258 dejó el catálogo gobernado + auth **operativamente completos en staging** (smoke
live verde), TASK-1259 dejó el selector WordPress **construido + commiteado** (plugin v0.8.0,
sin deploy), y TASK-1261 sembró el form productivo en shadow (`delivery_mode='disabled'`). Lo
único que falta para que un visitante real envíe un lead por Greenhouse es el **rollout
productivo**, que es deliberadamente operador-coordinado y hard-to-reverse (toca el sitio de
marketing vivo + el CRM HubSpot + un release `develop→main`). Se separa en su propia task para
no forzar un release prematuro ni un cutover sin ventana/aprobación.

## Goal

- Encender el catálogo + el selector en producción (Fase A, bajo riesgo).
- Cutover del form vivo: flags del motor, destino HubSpot `disabled→direct`, swap del embed
  en `/diseno-de-sitios-web/` (Fase B, alto riesgo).
- Verificar end-to-end con un lead de prueba (dataLayer + ledger + HubSpot) y monitorear 7 días.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- La promoción `develop→main` va por el **release control plane** (skill `greenhouse-production-release`); no flip de prod unilateral del código.
- Flags prod `*_ENABLED` se registran/actualizan en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- El cutover del sitio vivo requiere ventana Kinsta + snapshot + aprobación humana del diff.
- El destino HubSpot pasa a `direct` solo con GUID/mapping confirmados por comercial.
- NUNCA meter el bypass SSO de staging en el wp-config de producción.

## Normative Docs

- `docs/operations/runbooks/growth-forms-public-launch.md` — **el paso a paso canónico de esta task.**
- `.claude/skills/greenhouse-production-release/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1258` — catálogo gobernado + auth (código en develop; rollout staging hecho).
- `TASK-1259` — selector WordPress (plugin `eo-elementor-widgets` v0.8.0, commit `27c1468` en `efeonce-public-site-runtime`).
- `TASK-1261` — form `efeonce-lead-gen-web` + destino HubSpot sembrados (shadow).
- Release control plane `develop→main` (el código de 1258/1259 debe estar en `main`).

### Blocks / Impacts

- Cierre operativo de TASK-1258 (su "cutover productivo" diferido) y TASK-1259 (deploy + verificación live).
- Primer lead real entrando por Greenhouse en vez de HubSpot embed directo.

### Files owned

- `docs/operations/runbooks/growth-forms-public-launch.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (actualización de estado de flags al encender)
- Runtime WordPress en repo separado `efeonce-public-site-runtime` (deploy del plugin ya construido — ⚠️ cross-repo, sin auto-deploy; rail manual `scp`).

## Current Repo State

### Already exists

- Catálogo + endpoint `GET /api/public/growth/forms/catalog` + auth embed key (TASK-1258, ON+verificado staging).
- Selector Elementor con catalog client server-side (TASK-1259, plugin v0.8.0, construido).
- Form + destino HubSpot sembrados en shadow (TASK-1261).
- Embed key minteada para surface `fhsf-efeonce-lead-gen-web` (`ehk_ee65ad44c942`).

### Gap

- Flags prod (`CATALOG_API`, `PUBLIC_API`, `SERVER_VALIDATION`, `DISPATCH`, `HUBSPOT_SECURE_SUBMIT`) en OFF.
- Plugin no deployado a Kinsta; wp-config sin las constantes del catálogo.
- Destino HubSpot en `disabled`; embed de la página viva sigue siendo HubSpot directo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `form_destination.delivery_mode` (HubSpot), flags Vercel/ops-worker, wp-config del sitio vivo
- Consumidores afectados: público (render/submit), WordPress editor, dispatcher ops-worker, HubSpot CRM
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-public-forms.v1`
- Contrato nuevo o modificado: ninguno (rollout de flags/config, sin código nuevo)
- Backward compatibility: `gated` (todo detrás de flags default-OFF + embed degradación honesta)
- Full API parity: N/A (no agrega capability; usa los contratos ya gobernados)

### Data model and invariants

- `form_destination_attempt` es append-only (no se borra; el rollback del destino es `delivery_mode='disabled'`, no DELETE).
- Versión publicada del form es inmutable.
- Submission preserva `surface_id` + `form_version_id`.

### Migration, backfill and rollout

- Migration posture: `none` (sin DDL).
- Default state: flags OFF → encender por fases (A catálogo/selector, luego B cutover).
- Backfill: ninguno (forward-only).
- Rollback: flags a OFF + `delivery_mode='disabled'` + restore snapshot página.
- External coordination: ventana Kinsta + aprobación diff + confirmación comercial HubSpot.

### Security and access

- Auth/access gate: embed key per-site (server-side wp-config); flags por environment.
- Sensitive data posture: no descargar PII; el secreto de embed key nunca al browser ni a git.
- Error contract: errores canónicos; sin payloads crudos al cliente.

### Runtime evidence

- Reliability signals: `growth.forms.*` (dead_letter, destination_failure_rate, submission_rejection_rate).
- Production verification sequence: ver Rollout Plan + runbook.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Promoción de código a main

- Promover `develop→main` por el release control plane (incluye el código de TASK-1258/1259).
- Verificar que las rutas/endpoints existen en prod.

### Slice 2 — Fase A: catálogo + selector (bajo riesgo)

- Flag prod `GROWTH_FORMS_CATALOG_API_ENABLED=true` + redeploy.
- Embed key + constantes wp-config + deploy del plugin a Kinsta (rail `scp` + cache purge).
- Verificar el desplegable poblado en el editor Elementor.

### Slice 3 — Fase B: cutover del form vivo (alto riesgo)

- Flags prod del motor juntos (`PUBLIC_API` + `SERVER_VALIDATION`) + dispatch + secure-submit.
- Destino HubSpot `disabled→direct` (GUID `de4593c3`, mapping completo, confirmado comercial).
- Swap del embed en `/diseno-de-sitios-web/` (snapshot + aprobación diff).

### Slice 4 — Verificación + monitoreo

- Smoke productivo con 1 lead de prueba (dataLayer + ledger + HubSpot attempt succeeded), limpiar CRM.
- Monitoreo signals 7 días; cooldown 24h antes de ampliar.

## Out of Scope

- Construir código nuevo (todo ya existe en TASK-1258/1259/1261).
- Slice 3 Gutenberg block de TASK-1259 (sigue en esa task).
- Inventario/migration de los OTROS embeds HubSpot del sitio (TASK-1258 scope original).
- Motor propio de tracking Greenhouse.

## Detailed Spec

El paso a paso canónico vive en `docs/operations/runbooks/growth-forms-public-launch.md`
(Fase A / Fase B / verificación / rollback / problemas comunes). Esta task ejecuta ese runbook
en orden, con verificación entre pasos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (código en main) → Slice 2 (Fase A catálogo/selector) → Slice 3 (Fase B cutover) → Slice 4 (verificación).
- Slice 3 NO puede ejecutarse sin Slice 2 verde (el selector debe poblar antes de swapear el embed).
- Dentro de Slice 3: `PUBLIC_API` + `SERVER_VALIDATION` se flipean **juntos** (no sueltos).
- El swap del embed (paso 8) va DESPUÉS de flags + destino `direct` (pasos 6-7).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Lead va al destino/GUID equivocado | hubspot / crm | medium | GUID `de4593c3` + mapping confirmados comercial + smoke con lead test | `growth.forms.hubspot_submit_failed` / contacto en CRM equivocado |
| Swap rompe la página viva Elementor | wordpress / public-site | medium | snapshot + aprobación diff + rollback restore | post-hash mismatch / 5xx en la página |
| Primer submit prod sin validar (basura al CRM) | growth | medium | `PUBLIC_API`+`SERVER_VALIDATION` flipeados juntos | spike de submissions inválidas |
| Doble submit (embed HubSpot + Greenhouse coexisten) | public-site | low | el swap reemplaza el embed, no agrega | doble lead en HubSpot |
| Plugin deploy rompe Elementor (parse/OPcache) | wordpress | low | `php -l` previo + backups + OPcache reset + cache purge | Elementor error en el editor |

### Feature flags / cutover

- Flags (Vercel prod + ops-worker), default OFF, encendido por fases:
  `GROWTH_FORMS_CATALOG_API_ENABLED` (Fase A), luego `GROWTH_FORMS_PUBLIC_API_ENABLED` +
  `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` + `GROWTH_FORMS_DISPATCH_ENABLED` +
  `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED` (Fase B). Revert: flags a OFF + redeploy (<5 min).
- Cutover por página/surface, nunca global.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | rollback del release control plane | per control plane | si |
| Slice 2 | flag `CATALOG_API=false`; el plugin degrada al slug manual; restore backup plugin | < 15 min | si |
| Slice 3 | flags motor a OFF + `delivery_mode='disabled'` + restore snapshot página | < 15 min | si |
| Slice 4 | N/A (verificación) | — | — |

### Production verification sequence

1. Código en main (release control plane) + endpoints prod responden.
2. Flag catálogo prod ON + curl al endpoint con embed key → 200 + items.
3. Deploy plugin + editor Elementor muestra desplegable poblado.
4. Flags motor ON (juntos) + destino `direct` + swap embed (snapshot+aprobación).
5. Smoke con 1 lead test → dataLayer + ledger + HubSpot attempt succeeded; limpiar CRM.
6. Monitorear signals 7 días; cooldown 24h antes de ampliar a otras páginas.

### Out-of-band coordination required

- Ventana de edición WordPress/Kinsta + aprobación humana del diff de `/diseno-de-sitios-web/`.
- Confirmación comercial del GUID/mapping HubSpot.
- Release control plane `develop→main` (operador + sign-off).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Código de TASK-1258/1259 en `main` (prod) vía release control plane.
- [ ] Catálogo prod ON; editor Elementor de `/diseno-de-sitios-web/` muestra el desplegable poblado.
- [ ] Flags del motor (`PUBLIC_API`+`SERVER_VALIDATION`+dispatch+secure-submit) ON en prod.
- [ ] Destino HubSpot en `delivery_mode='direct'` (GUID `de4593c3`, mapping completo).
- [ ] Embed de la página viva reemplazado por `<greenhouse-form>` sin doble submit.
- [ ] Lead de prueba: dataLayer emite `gh_form_*`, submission en ledger, attempt `succeeded` en HubSpot; contacto de prueba limpiado del CRM.
- [ ] Ledger de flags actualizado; sin regresión en signals durante 7 días.

## Verification

- `pnpm staging:request` / curl al endpoint de catálogo prod (200 + items)
- Browser/GVC smoke de `/diseno-de-sitios-web/` post-swap (desktop + mobile, `scrollWidth<=clientWidth`)
- Curl submit test + verificación de delivery attempt en el cockpit `/admin/growth/forms`
- Monitoreo de signals `growth.forms.*`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-1258, TASK-1259, TASK-1261
- [ ] cerrar el "cutover productivo" diferido de TASK-1258 y el deploy/verificación de TASK-1259

## Follow-ups

- Inventario + migración de los OTROS embeds HubSpot del sitio (TASK-1258 scope original).
- Slice 3 Gutenberg block (TASK-1259).
- Task/ADR del motor propio de tracking Greenhouse.

## Open Questions

- ¿Se amplía a `/servicios-contratar-hubspot/` y `/contacto/` en la misma ventana o tras el cooldown de 7 días?
