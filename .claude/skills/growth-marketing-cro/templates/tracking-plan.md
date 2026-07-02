# Tracking Plan

> La base de todo dato confiable. Escríbelo ANTES de instrumentar. Ver `07`.

## Gobernanza
- **Owner del plan:** ______
- **Convención de naming:** `object_action`, verbo pasado, snake_case (ej. `report_created`)
- **Versionado:** cambios documentados con fecha; no romper eventos existentes en silencio

## Eventos
| Evento | Cuándo dispara | Propiedades (tipo) | Etapa funnel / NSM input | Fuente (client/server) |
|---|---|---|---|---|
| `signup_completed` | | email_domain(str), source(str), variant(str) | Acquisition | server |
| `activated` | (aha event) | ttfv_sec(int), plan(str) | Activation / NSM input | server |
| `pql_reached` | | milestones(int) | Activation→sales | server |
| `subscription_started` | | plan(str), mrr(num) | Revenue | server |
| `report_created` | | shared(bool) | NSM input | server |
| ... | | | | |

## Propiedades globales (en todos los eventos)
- `user_id` / `anonymous_id`, `tenant_id`, `timestamp`, `source`, `experiment_variant`,
  `consent_state`

## Consentimiento & privacidad
- [ ] Base legal capturada (GDPR / Ley 21.719); `consent_state` en cada evento
- [ ] PII minimizada; no PII cruda en propiedades; retención acotada
- [ ] Consent Mode v2 + server-side routing donde aplique

## Verdad única
- [ ] Eventos aterrizan en el warehouse (fuente única)
- [ ] Métricas de experimentación/negocio se calculan del warehouse (no solo del tool)
