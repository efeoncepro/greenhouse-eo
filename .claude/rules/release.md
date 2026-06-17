---
paths:
  - "src/lib/release/**"
  - "scripts/release/**"
  - ".github/workflows/*release*.yml"
---

# Production Release Control Plane — invariantes (auto-load por path)

Antes de tocar el control plane de release, **invocá la skill MANDATORIA `greenhouse-production-release`** y cargá **`docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` → §"Invariantes operativos para agentes"** + runbook `docs/operations/runbooks/production-release.md`.

Reglas duras: **NUNCA** revertir el `cancel-in-progress` dinámico de los 3 worker workflows a `false` literal (deadlock); **NUNCA** disparar el orquestador <8 min post-push a `main` (Vercel BUILDING race); **NUNCA** transicionar `state` fuera de la matriz ni UPDATE/DELETE `release_manifests`/`release_state_transitions` (append-only).
