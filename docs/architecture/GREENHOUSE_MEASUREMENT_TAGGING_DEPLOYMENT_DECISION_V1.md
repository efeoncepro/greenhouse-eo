# ADR — Estrategia de despliegue del tagging de medición: build agéntico + capa delgada de robustez (NO IaC declarativo)

> **Status:** Accepted · 2026-07-07
> **Scope:** Growth / Medición / GTM / GA4 / Tagging / Agent operations / Skills
> **Canonical doc:** [`docs/reference/measurement-gtm-ga4/`](../reference/measurement-gtm-ga4/) (README + 01-07 + TRACKING-PLAN + LEARNINGS) · [Tracking Engine §19](GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md)
> **Skill / rules:** `greenhouse-gtm-ga4-operator` · `.claude/rules/measurement-gtm-ga4.md`

## Contexto

Greenhouse ya opera medición GTM/GA4 **programáticamente**: el `GtmApiClient` (`src/lib/growth/gtm/`) crea/publica tags/triggers/variables con flujo gobernado (workspace → preview → confirm → publish), y hay un pipeline `generate_lead` genérico live que mide todos los Growth Forms por `form_slug`, más `think.efeoncepro.com` sumado a la misma propiedad. El deploy ya es por API.

La pregunta del operador: **¿construimos algo más robusto/declarativo (tagging-as-code / IaC) para desplegar el tagging, o lo mejor es que los agentes vayan armando el tagging al implementar cada capability?**

Hechos que condicionan la respuesta:

- **El patrón genérico ya hace el tagging casi-cero por superficie nueva:** un form nuevo lo cubre el `generate_lead` existente (lo distingue `form_slug`); un CTA nuevo lo cubrirá un tag genérico `gh_cta_*`; un host nuevo = 1 paso (snippet + config gateado). La robustez real ya está en el patrón, no en un pipeline.
- **Las decisiones de tagging son adyacentes al negocio** (¿es key event? ¿cómo se nombra el evento? ¿qué parámetro de identidad?) — necesitan el contexto del agente que implementa la capability; un pipeline declarativo las congela estáticas.
- **"GTM as code" es intrínsecamente frágil** (research verificada, `docs/reference/measurement-gtm-ga4/06`): GTM no tiene merge real; "as code" = git para audit/review + API para apply. Terraform-para-GTM está inmaduro (providers community v0.0.8, sin soporte oficial).
- **El surface es chico y estable:** un container, una propiedad, tags mayormente genéricos, un puñado de hosts.

## Decisión

**Build agéntico como mecanismo PRIMARIO + una capa delgada de robustez encima. NO construir un pipeline IaC declarativo.**

1. **Los agentes arman el tagging al implementar** cada capability/superficie/host, vía la skill `greenhouse-gtm-ga4-operator` (flujo gobernado por API) + el **patrón genérico** (un evento + parámetro de identidad, un tag cubre N superficies) + **enforcement por skill/rules** (`.claude/rules/measurement-gtm-ga4.md`, hard rules del operador, mandato Tracking Engine §19.2/§19.5, registro obligatorio en `TRACKING-PLAN.md`). Este es el camino por defecto.

2. **Capa delgada de robustez** (insurance barato, no infra pesada):
   - **Snapshot del container en git + drift detection** — export del config live a un JSON commiteado; diff revisable + detección de drift (live vs snapshot). Es lo que recomienda la research (normalized JSON in git).
   - **Smoke test de medición** — verificación Playwright (`/g/collect`) + realtime sobre hosts/eventos clave; atrapa regresiones (Site Kit cambió, drift, consent roto).
   - **Audit del registro** — DB/live vs `TRACKING-PLAN.md` (advisory), lista forms/hosts publicados sin fila.

## Alternativas consideradas y rechazadas

- **IaC declarativo / Terraform-para-GTM** — rechazado: GTM no mergea (no hay estado declarativo limpio), providers community inmaduros (v0.0.8, sin soporte oficial), over-engineering para un surface chico/estable. (Terraform SÍ aplica al *hosting* de sGTM — Cloud Run/dominio/IAM — pero no a la config de tags.)
- **Pipeline completo tipo owntag `gtm-cli` en CI** — rechazado (por ahora): infra + normalización + apply que mantener, para un beneficio (snapshot en git) que la capa delgada consigue con un script propio sobre el `GtmApiClient` ya existente.
- **Solo build agéntico, sin capa de robustez** — rechazado: deja el config del container fuera de git (sin diff/review), el drift invisible, y sin gate de verificación de regresiones. La capa delgada cierra eso barato.

## Consecuencias

- El tagging sigue naciendo en contexto (el agente que implementa taggea), con el patrón genérico minimizando el trabajo.
- El config del container queda **versionado y diffable** en git (snapshot), con drift detectable.
- Regresiones de medición se atrapan con el smoke test, no por casualidad.
- Se evita construir/mantener infra que la naturaleza de GTM hace frágil.

### 4 pilares

- **Safety** — deploy gobernado (`propose → confirm → execute`, humano confirma el publish); enforcement por skill/rules; sin secretos ni PII en el path.
- **Robustness** — patrón genérico (una superficie nueva no rompe nada) + snapshot/drift en git (config reproducible y auditable).
- **Resilience** — smoke test de medición atrapa regresiones (consent, Site Kit, drift de container); el fallo de un tag no afecta el render del sitio.
- **Scalability** — adecuado al surface actual (un container/propiedad, tags genéricos). El patrón genérico escala a N superficies sin tags nuevos.

## Cuándo revisitar (escalar a pipeline declarativo)

Reabrir esta decisión si: (a) el conteo de **tags custom no-genéricos** explota (decenas); (b) **humanos** empiezan a click-opsear el container en paralelo a los agentes (ahí git-as-SoT + sync se gana el lugar); (c) se onboardean **N containers de clientes** (ahí un sync declarativo prod↔dev paga). Hoy no aplica ninguno.

## Hard rules

- **NUNCA** desplegar tagging fuera del flujo gobernado del `GtmApiClient` (workspace → preview → confirmación humana → publish).
- **NUNCA** construir un IaC declarativo de tags GTM mientras se cumplan las condiciones de "surface chico/estable" de arriba — es over-engineering sobre una herramienta que no mergea.
- **SIEMPRE** que se toque el container, correr el snapshot (para que git refleje el estado live) y registrar en `TRACKING-PLAN.md`.
- **SIEMPRE** un patrón genérico (evento + parámetro de identidad) antes que un tag por superficie.

## Seguimiento

Capa delgada a construir (esta decisión la habilita):

- `pnpm gtm:snapshot` — export del container live a `docs/reference/measurement-gtm-ga4/container-snapshot.json` + `--check` para drift.
- `pnpm measurement:smoke` — verificación Playwright `/g/collect` + realtime sobre hosts/eventos clave.
- `pnpm growth:forms-tracking-audit` — DB/live vs `TRACKING-PLAN.md` (advisory).

Documentar el uso en `docs/reference/measurement-gtm-ga4/` + la skill `greenhouse-gtm-ga4-operator`.
