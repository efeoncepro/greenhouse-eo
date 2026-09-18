---
name: higgsfield-provider
description: >-
  Integra y opera Higgsfield como proveedor gobernado de Efeonce Globe: API, SDKs, CLI, skills agentic y MCP local
  para After Effects/Blender. Úsala para route cards, adapters, completion, costes, derechos, provenance, canarios
  y revisión de los repositorios públicos oficiales. No autoriza por sí sola generación, publicación ni despliegue.
---

# Higgsfield Provider

## Canon y composición

Carga siempre `greenhouse-globe`, `greenhouse-globe-model-fleet`, `greenhouse-ai-creative-rights-governance`,
`greenhouse-secret-hygiene` y `greenhouse-documentation-governor` cuando cambie integración, skill o workflow.

Fuentes canónicas:

- `docs/architecture/creative-studio/EFEONCE_HIGGSFIELD_PROVIDER_ADOPTION_DECISION_V1.md`
- `docs/audits/creative-studio/2026-09-17-higgsfield-github-review.md`
- `docs/operations/creative-studio/HIGGSFIELD_PROVIDER_RUNBOOK_V1.md`
- `docs/documentation/creative-studio/HIGGSFIELD_PROVIDER.md`
- `docs/manual-de-uso/creative-studio/higgsfield-provider.md`

## Reglas

- Provider-supported no significa integrado ni disponible en Globe.
- Fija `routeId + capability + provider + model + version/endpoint` antes de actuar.
- Usa SDK server-side como preferencia; CLI sólo para operador o diagnóstico.
- Conserva estados upstream, URLs de seguimiento devueltas por request, polling/webhook y readback-first.
- Cotización, reserva, settlement y coste realizado son hechos separados.
- No imprimas secretos, cuerpos upstream, URLs firmadas, cookies ni prompts confidenciales.
- Toda salida pasa provenance, Asset Governance, derechos y revisión humana.
- Skills de Higgsfield son referencias: no copies acciones de deploy, publicación, secrets o websites sin adaptar los
  gates de Efeonce.
- El MCP local de After Effects/Blender comienza en read-only; mailbox compartido y `eval` están prohibidos.
- No uses el framework histórico `higgsfield` como infraestructura de Globe.

## Checklist de ruta

1. Lee `GLOBE_RUNTIME_HANDOFF.md`; respeta hibernación.
2. Revalida endpoint, modelo, términos, precio y plan.
3. Crea route card y declara output shape.
4. Implementa adapter y estados con tests registrados.
5. Configura secreto server-side y spend fence.
6. Obtén evidencia exacta de rights/data governance.
7. Ejecuta canary sólo con Globe activo y autorización.
8. Verifica bytes, digest, MIME, governance, reader y UI.
9. Actualiza ledger, handoff, auditoría y changelog.
