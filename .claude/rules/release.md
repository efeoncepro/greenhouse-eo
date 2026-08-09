---
paths:
  - "src/lib/release/**"
  - "scripts/release/**"
  - ".github/workflows/*release*.yml"
---

# Production Release Control Plane — invariantes (auto-load por path)

Antes de tocar el control plane de release, **invoca la skill MANDATORIA `greenhouse-production-release`** y carga **`docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` → §"Invariantes operativos para agentes"** + runbook `docs/operations/runbooks/production-release.md`.

Reglas duras: **NUNCA** revertir el `cancel-in-progress` dinámico de los 3 worker workflows a `false` literal (deadlock); **NUNCA** disparar el orquestador <8 min post-push a `main` (Vercel BUILDING race); **NUNCA** transicionar `state` fuera de la matriz ni UPDATE/DELETE `release_manifests`/`release_state_transitions` (append-only).

Batch policy (TASK-1676 / ISSUE-145): **NUNCA** hacer que un diff vacío reporte `ship` — venga de la base que venga, sin archivos el check no miró nada y devuelve `unknown` (3 releases seguidos aprobaron con `filesChanged=0`, uno con 1045 archivos y 14 migraciones). La base es el `target_sha` del último manifest `released` (`preflight/last-released-reader.ts`), no `origin/<branch>`. **NUNCA** relajar `RELEASE_COUPLED_MARKER_REGEX` (ancla `^`) ni leer el marker fuera del cuerpo del `target_sha`: sin las dos condiciones, una mención en prosa apaga toda la detección de mezcla de dominios.
