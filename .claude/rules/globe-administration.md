---
paths:
  - "src/lib/globe/**"
  - "src/lib/sister-platforms/**"
---

# Administración de Globe desde Greenhouse — invariantes (auto-load por path)

Antes de tocar el borde hacia Globe, **invocá la skill `greenhouse-globe`** y cargá **`docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`** (ADR-015) — Greenhouse es la **superficie** de administración (entitlements, sesión humana, auditoría); Globe es la **autoridad** (verifica, firma, ejecuta). Implementación: `TASK-1566`.

Reglas duras: **NUNCA** la llave de aprobación de Globe sale de su runtime — ninguna identidad de Greenhouse obtiene `secretmanager.versions.access` ni `asymmetricSign` sobre ella; **NUNCA** un actor obtiene aprobación **y** ejecución a la vez; **NUNCA** uses `greenhouse-portal@` (el reconciliador de tenancy) para administrar crédito o capabilities de Globe — es admin implícito cross-plataforma, y una identidad por propósito; **NUNCA** describas el bloqueo de fondeo como "falta una identidad de credit-admin": la autoridad de crédito **ya está** concedida al principal genérico `globe:service:internal-caller` junto con `globe.lab.experiment.run` (fondeo **y** gasto en la misma identidad), así que **sobra**, y su único freno es un secreto; **NUNCA** apoyes una disyunción de actores en `approval.proposedBy !== context.actor.principalId` — para un caller de workload ese `principalId` es una **constante** por clase y el chequeo es **vacuo**; **NUNCA** prometas control de capabilities por usuario mientras `tenancy_mode` sea `shadow` (la proyección observa y no niega, así que el toggle mentiría) ni intentes diferenciar por usuario en el **token** (el broker acopla `capabilityScopes ⊆ requiredScopes`: agregar un scope lo vuelve requerido para todos — la lección que tumbó el login en ADR-010; el grant OAuth es el **techo**, la proyección el **piso**); **NUNCA** agregues un capability scope al grant del broker de Globe en un solo movimiento (es el rollout de 3 pasos zero-downtime).

**SIEMPRE** reusá `createGreenhouseGlobeClient` (`src/lib/globe/client.ts`, `server-only`) en vez de instanciar un cliente paralelo, y consumí los comandos gobernados por la surface `sister-platform` del spine — nunca la API privada de Globe directo.
