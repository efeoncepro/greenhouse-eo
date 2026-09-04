> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-05-10 por Claude
> **Ultima actualizacion:** 2026-09-03 por Codex
> **Documentacion tecnica:** [TASK-851](../../tasks/complete/TASK-851-production-release-orchestrator-workflow.md), [CLAUDE.md §Production Release Orchestrator invariants](../../../CLAUDE.md), [GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)

# Orquestador de Release a Producción

## Que es

Greenhouse promueve código de `develop` (staging) a `main` (production) varias veces al mes. Antes de TASK-851 ese flujo era manual y propenso a errores. El **orquestador** (`production-release.yml`) lo convierte en una sola corrida workflow GitHub Actions con 8 jobs canónicos, audit completo y verificación post-deploy.

Es el **brazo activo** del control plane de releases junto al **preflight** (CLI que valida antes de actuar) y al **watchdog** (verificacion runtime manual mientras TASK-920 corrige sus falsos positivos).

## Por que existe

Antes del orquestador, el release `develop → main` requería:

1. Correr preflight a mano localmente
2. Crear PR develop → main
3. Mergear y esperar que Vercel deploy
4. Aprobar el environment Production en CADA worker workflow individualmente (4 aprobaciones)
5. Inspeccionar logs Vercel y Cloud Run para confirmar READY
6. Validar manualmente que cada Cloud Run revision serving expone el SHA correcto

Cualquier paso skipeado o desincronizado dejaba el ecosistema en estado mixto. El incidente 2026-04-26 → 2026-05-09 es exactamente la clase de bug que esto evita: 4 workflows production en estado `waiting` por días, workers Cloud Run desincronizados con `main`, descubierto solo cuando el dashboard reliability alertó 14 días después.

## Que hace (8 jobs canónicos)

```text
workflow_dispatch (operator: target_sha + opcionalmente bypass_reason)
        |
        v
   ┌────────────────────────────────────────┐
   │  1. Preflight (TASK-850 CLI)           │ → 12 checks; bloquea si error
   ├────────────────────────────────────────┤
   │  2. Record manifest started            │ → INSERT release_manifests + outbox
   ├────────────────────────────────────────┤
   │  3. Approval gate (Production env)     │ → required reviewers
   ├────────────────────────────────────────┤
   │  4. Workers deploy (parallel × 5)      │
   │     - ops-worker                       │
   │     - commercial-cost-worker           │ → cada uno verifica GIT_SHA
   │     - ico-batch-worker                 │   matches EXPECTED_SHA
   │     - hubspot-greenhouse-integration   │
   │     - auth-server (TASK-1828)          │
   ├────────────────────────────────────────┤
   │  5. Wait Vercel READY                  │ → poll API hasta encontrar deploy
   ├────────────────────────────────────────┤
   │  6. Post-release health check          │ → ping /api/auth/health
   ├────────────────────────────────────────┤
   │  7. Transition to released | degraded  │ → state machine final
   ├────────────────────────────────────────┤
   │  8. Summary                            │ → GITHUB_STEP_SUMMARY
   └────────────────────────────────────────┘
        |
        v
   release_manifests row con state=released o degraded
   + 7 outbox events platform.release.* v1 emitidos
   + audit completo en release_state_transitions
```

## Coordinación y evidencia de cierre

Cada release tiene un coordinador y un intento activo identificado por SHA, run ID y release ID.
Dos corridas del mismo SHA no son intercambiables: el reconciler todavía prioriza SHA y una cancelación
del duplicado puede abortar el manifest del intento correcto. La operación serial contiene el riesgo;
el arreglo técnico de correlación sigue pendiente. El [runbook §0.1](../../operations/runbooks/production-release.md#01-un-coordinador-y-un-intento-vivo-por-release)
explica cómo comprobar cancelaciones, webhooks y manifest antes de iniciar otro intento.

`completed` sólo significa que un run terminó: su conclusión puede ser `cancelled`. Vercel y workers
sanos prueban despliegue; el manifest y el watchdog prueban el cierre del control plane; el readback de
la operación del dominio prueba su efecto. En una recuperación que emite eventos, ese readback incluye
las proyecciones posteriores, para detectar que un consumer vuelva a deshacer la reparación.

## Como decide

El orquestador toma decisiones binarias claras en cada job:

- **Preflight rojo** → abortar antes de cualquier mutación
- **Worker GIT_SHA mismatch** → exit 1 fail-loud (Cloud Build cache, tag drift, deploy aborted)
- **Vercel timeout 900s** → abortar
- **Health soft-fail (exit 78)** → release `degraded` (operador decide rollback o forward-fix), NO aborta el orquestador

Para verificar a mano en qué SHA quedaron los 4 workers Cloud Run existe `pnpm release:workers` (con `--expected-sha=<sha>` compara contra el target). Reemplaza el comando `gcloud` crudo que el runbook documentaba, que dejó de funcionar sin que nadie lo notara hasta que un release lo ejecutó.

Desde el hardening 2026-05-11, los workers Cloud Run no hacen production deploy
automatico por `push:main`. `push:develop` sigue actualizando staging; production
normal se ejecuta via `workflow_call` dentro de `production-release.yml`.
`workflow_dispatch` queda reservado para break-glass auditado.

## Que mira el gate del batch (y que pasa cuando no mira nada)

Uno de los 12 checks del preflight, `release_batch_policy`, es el que responde "¿que agrega este release sobre lo que produccion ya tiene?". Clasifica los archivos que cambian por dominio (payroll, finance, migraciones, auth, cloud) y avisa cuando el batch mezcla dominios independientes o toca algo irreversible sin dejarlo documentado.

Hasta el 2026-08-09 ese check comparaba contra la punta de `main`. El problema es cuando corre: el orquestador se dispara con el codigo **ya mergeado**, asi que comparar contra `main` era compararlo consigo mismo. El resultado era un diff vacio y una aprobacion automatica. Paso en tres releases seguidos, y uno de ellos llevaba 1045 archivos y 14 migraciones que el gate reporto como "0 archivos".

Desde TASK-1676 el punto de comparacion es el **ultimo release que efectivamente quedo en produccion** (el que el sistema tiene registrado como `released`), no la punta de la rama. Eso hace que el check mire lo mismo antes y despues del merge, y que la comparacion sea la que el operador cree que es.

Dos consecuencias practicas para quien lee el resultado:

- **Un diff vacio ya no aprueba nada.** Cuando el check no encuentra archivos que comparar, ya no dice "todo bien": reporta que **no pudo evaluar** el batch. Es deliberado que no diga "error" — no se sabe que el release este mal, se sabe que el gate no vio nada, y el operador tiene que poder distinguir "me estan frenando" de "no pudieron mirar". En la practica frena igual, porque el preflight solo deja avanzar con todo en verde.
- **El resultado declara contra que compare.** El JSON del preflight ahora dice cual fue la base, de donde salio (el manifest del release anterior, o la punta de la rama cuando la rama no tiene releases registrados) y el ID de ese release. Sirve para diagnosticar de un vistazo por que un batch salio mas grande o mas chico de lo esperado, en vez de tener que investigarlo.

### El marker `[release-coupled: ...]`

Cuando un release mezcla a proposito dos dominios sensibles (porque la dependencia es real), la forma de declararlo es escribir `[release-coupled: <razon>]` en el cuerpo del commit de squash. Eso neutraliza la alerta de "esto deberian ser dos releases".

**El marker resuelve esa alerta y solo esa.** El check tiene dos veredictos distintos y es facil leerlos como uno: "esto deberian ser dos releases" (mezcla de dominios independientes) y "esto toca algo irreversible" (migraciones, auth, payroll, finance, cloud). El marker desactiva el primero; el segundo se dispara por el dominio en si, mezclado o no, y su unica salida es la razon de break-glass documentada. Ponerle marker a un release irreversible no cambia nada — y como la mezcla se evalua antes, un veredicto de "irreversible" ya prueba que el marker no era lo que faltaba.

Desde TASK-1676 ese marker tiene dos condiciones estrictas: **abre una linea propia** y se lee **solo del commit que se esta promoviendo**. Antes bastaba con que la frase apareciera mencionada de pasada en cualquier commit del rango — incluso citada dentro de un documento —, y eso apagaba la deteccion completa. El caso mas elocuente: el commit que creo la tarea para arreglar este defecto la disparaba, porque explicaba el problema citando el literal.

Consecuencia esperada: en la corrida local, antes de mergear, el commit de squash todavia no existe, asi que el marker no puede leerse ahi. El flujo correcto es ver la alerta en local, escribir el marker en el squash, y dejar que el orquestador lo lea. No es una falla.

## Como integra con el ecosystem

```text
TASK-848 V1.0 manifest tables ─────┐
TASK-849 watchdog (manual runtime)─┼─→ El orquestador consume TODO esto
TASK-850 preflight CLI ────────────┤   y orquesta el release end-to-end
TASK-851 worker workflow_call  ────┤
TASK-851 worker deploy.sh verify ──┘
                                  ↓
                      production-release.yml
                                  ↓
                  [opcional] TASK-853 Azure Bicep deploy
                                  ↓
                      release_manifests final state
                                  ↓
                  [TASK-854] Dashboard UI lee historico
```

## Cómo se opera (interfaces para agentes)

El orquestador es un workflow GitHub Actions, pero el operador casi nunca lo dispara "a mano". Lo conduce un agente a través de una de dos interfaces equivalentes, ambas clientes del **mismo** control plane (la skill `greenhouse-production-release` es la fuente de verdad):

| Agente | Interfaz | Qué es |
|---|---|---|
| **Claude Code** | slash command **`/release`** | Harness de proceso (`.claude/commands/release.md`) que invoca la skill mandatoria y encadena los gates del camino canónico. Acepta modos: `/release`, `/release <sha>`, `/release rollback`, `/release watchdog`, `/release drift`, `/release break-glass`. |
| **Codex** | skill directa | Codex no usa archivos de slash command; invoca `.codex/skills/greenhouse-production-release/SKILL.md` directamente (un release no es `TASK-###`/`ISSUE-###`, así que no pasa por un hook `pnpm codex:*-hook`). |

Ninguna interfaz es un motor de release nuevo: las dos terminan corriendo `production-release.yml` y escribiendo en `release_manifests`. La diferencia con disparar el workflow crudo es que el harness **fuerza el orden seguro** (preflight → promoción → orquestador → approval → workers/Vercel/Azure → health → manifest → watchdog → flags del ledger) y exige aprobación humana explícita por cada mutación externa (push, dispatch, approval gate, deploy, flags, rollback). El agente lee y propone; la persona autoriza cada paso.

> **Condiciones esperadas del flujo por squash (no son fallas).** Como cada release se promueve con *squash-merge*, `main` y `develop` divergen. Eso produce señales que parecen errores pero son conocidas: el PR develop→main puede requerir un merge de sincronización, un check de política puede marcar un archivo que **ya está en producción**, y los avisos de smoke/CI del commit fresco de `main` se resuelven con una razón de bypass documentada. El runbook (§2.3) y la skill `greenhouse-production-release` explican cómo reconocerlas y resolverlas paso a paso. El caso del archivo ya desplegado se cerró de raíz en **ISSUE-114** (2026-08-08): el clasificador dejó de resucitar archivos byte-idénticos a producción.

> **Leccion operativa 2026-07-09.** Un agente no debe tratar condiciones comunes
> del release como descubrimiento nuevo. Approvals, workers lentos, Azure
> `no_infra_diff`, `ops-worker` change-gated y `transition-released` en cola
> tienen caminos documentados. Si el runtime ya está verde y falta sólo una
> transición final atascada por runner, el cierre se hace con el CLI canónico de
> state machine y razón auditada, nunca con SQL.

> **Timing obligatorio.** Desde 2026-07-09 cada release debe registrar el
> **tiempo agente end-to-end** como KPI principal, no solo la duracion del
> workflow. El registro vive en
> `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md`: agente, fecha, release
> ID, run ID, SHA, fases de revision/analisis/release/diagnostico/docs,
> workflow elapsed, manifest elapsed, runtime-green elapsed y bloqueo principal.
> Esto permite evaluar eficiencia por agente sin depender de memoria.

## Roles + permisos

Reusa capabilities ya existentes (least-privilege per TASK-848):

| Capability | Quien tiene | Que habilita |
|---|---|---|
| `platform.release.execute` | EFEONCE_ADMIN, DEVOPS_OPERATOR | Disparar `production-release.yml` workflow |
| `platform.release.preflight.execute` | EFEONCE_ADMIN, DEVOPS_OPERATOR | El job preflight invoca esto |
| `platform.release.bypass_preflight` | EFEONCE_ADMIN solo | Usar `bypass_preflight_reason` >=20 chars |
| `platform.release.rollback` | EFEONCE_ADMIN | `pnpm release:rollback` post-degraded |

## Costos

- Workflow run total: ~5-15 min P95 (preflight 1-2min + approval variable + workers 5-10min parallel + vercel wait 1-3min + health 30s + transitions 30s)
- GitHub Actions minutos: ~30-60 min compute aggregate (1 orchestrator + 4 worker matrix in parallel)
- Vercel API: 30 polls @ 30s = 1 request/30s during wait window
- GCP API: ~12 gcloud run revisions describe calls per release
- Sin costos persistentes — el manifest row ocupa <1KB en PG

## Roadmap

| Fase | Estado | Descripción |
|---|---|---|
| V1.0 (TASK-848) | SHIPPED 2026-05-10 | Foundation: tablas, capabilities, signals, concurrency fix, rollback CLI |
| V1.1 watchdog (TASK-849) | SHIPPED 2026-05-10; schedule pausado 2026-05-24 | Detector manual hasta TASK-920 |
| V1.1 preflight (TASK-850) | SHIPPED 2026-05-10 | CLI 12 checks fail-fast |
| **V1.1 orchestrator (TASK-851)** | **SHIPPED 2026-05-10** | **Workflow end-to-end + worker SHA verification** |
| V1.1 Azure gating (TASK-853) | Por venir | Job condicional Bicep deploy gated por diff |
| V1.2 observability (TASK-854) | Por venir | 2 signals nuevos + dashboard UI consume manifest historico |

## Referencias

- [Manual de uso operador](../../manual-de-uso/plataforma/release-orchestrator.md)
- [Runbook production-release](../../operations/runbooks/production-release.md)
- [Spec arquitectónica completa](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md)
- [Decisions index ADR](../../architecture/DECISIONS_INDEX.md)
