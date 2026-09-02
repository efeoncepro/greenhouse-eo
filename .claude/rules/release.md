---
paths:
  - "src/lib/release/**"
  - "scripts/release/**"
  - ".github/workflows/*release*.yml"
  # Los workflows de deploy de los workers NO matcheaban `*release*`, y ahi vivia el defecto
  # que dejo produccion sirviendo codigo viejo con el manifest en `released` (2026-08-29).
  - ".github/workflows/*-deploy.yml"
  - "services/*/deploy.sh"
---

# Production Release Control Plane — invariantes (auto-load por path)

Antes de tocar el control plane de release, **invoca la skill MANDATORIA `greenhouse-production-release`** y carga **`docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` → §"Invariantes operativos para agentes"** + runbook `docs/operations/runbooks/production-release.md`.

Reglas duras: **NUNCA** revertir el `cancel-in-progress` dinámico de los 3 worker workflows a `false` literal (deadlock); **NUNCA** disparar el orquestador <8 min post-push a `main` (Vercel BUILDING race); **NUNCA** transicionar `state` fuera de la matriz ni UPDATE/DELETE `release_manifests`/`release_state_transitions` (append-only).

Deploy de workers (2026-08-29): **NUNCA** leer un skip del change-gate como prueba de que el runtime no cambio — prueba que las rutas DECLARADAS no cambiaron. La verificacion que manda es el diff de **arbol completo** (`git diff --name-only <desplegado> <target>`, sin `--`): vacio = skip legitimo. Un release cerro verde en toda su cadena con el `ops-worker` sirviendo codigo anterior porque la lista cubria 24 prefijos de los 1449 archivos que el worker bundlea. **NUNCA** cerrar una recurrencia agregando una ruta mas (ya paso 5 veces): correr `pnpm worker:deploy-path-gate`, que deriva la cobertura del metafile de esbuild. Detalle en `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`.

Batch policy (TASK-1676 / ISSUE-145): **NUNCA** hacer que un diff vacío reporte `ship` — venga de la base que venga, sin archivos el check no miró nada y devuelve `unknown` (3 releases seguidos aprobaron con `filesChanged=0`, uno con 1045 archivos y 14 migraciones). La base es el `target_sha` del último manifest `released` (`preflight/last-released-reader.ts`), no `origin/<branch>`. **NUNCA** relajar `RELEASE_COUPLED_MARKER_REGEX` (ancla `^`) ni leer el marker fuera del cuerpo del `target_sha`: sin las dos condiciones, una mención en prosa apaga toda la detección de mezcla de dominios.
