# Handoff activo

## 2026-07-29 — Release completo: develop promovido y producción verificada

Estado honesto: **complete**. PR #166 promovió todo `develop` a `main` mediante el merge
`0b4bdd6acb401ef0b108e27f1a8f1d80c469a0ed`; no hubo cherry-picks ni release parcial de AXIS. CI, CI Deep,
Playwright smoke, CLAUDE/context governance y Vercel pasaron para ese SHA. El orquestador oficial
`30473069894`, sin bypass ni break-glass, terminó `success` y dejó el manifest
`0b4bdd6acb40-2608542b-b1e5-4b3b-b24e-5036501dfef1` en `released`. El intento obsoleto `30465872005` quedó
cancelado.

Vercel Production está READY en `dpl_EkXUC1oCddYWvtWxB5sJVY7qXfkd`
(`greenhouse-7i34pkv5e-efeonce-7670142f.vercel.app`) y `greenhouse.efeoncepro.com/api/auth/health` responde
`200`. Cloud Run quedó Ready en `commercial-cost-worker-00411-q6j`, `ico-batch-worker-00234-58d` y
`hubspot-greenhouse-integration-00124-drd`, todos trazados al SHA de main. `ops-worker-00507-b4g` permanece
Ready en `49ea5741aec1`: el job oficial calculó diff vacío entre ese commit y el target para todas sus rutas runtime,
por lo que aplicó el change-gate canónico y omitió un redeploy label-only. El watchdog local sigue reportando ese
caso conocido como `worker_revision_drift`; no existe drift de código desplegable.

La causa raíz de los `401` no era un PAT vencido. El secreto es un PAT clásico válido: GitHub `/user` y el tarball
privado exacto respondieron `200`. El heredoc no quoted expandía `$$` al PID del shell antes de entregar el config a
Cloud Build, produciendo bearer tokens numéricos. Los deploy scripts ahora preservan el doble dólar para que Cloud
Build inyecte el secreto real. `ops-worker`, `commercial-cost-worker`, `ico-batch-worker` y el job staging-only
`artifact-worker` usan `secretEnv` → `.npmrc` efímero → BuildKit secret; `.npmrc` está excluido de los contextos y
los gates cubren los cuatro build units. Builds reales, imágenes sin token/runtime env y revisiones Cloud Run fueron
verificados.

La ubicación actual en `efeonce-globe` es un acoplamiento legado deliberado y temporal, no ownership de Globe.
Cuando se cree la identidad de máquina, el secreto nuevo debe nacer en un proyecto neutral del ecosistema AXIS,
fuera de cualquier producto; luego se migran ambos consumidores, se validan builds/digests y se revoca el binding
cross-project. No se debe recrear el secreto en Globe por inercia. Además, la CLI local de Vercel imprimió su
credencial de sesión al construir un comando de paginación; el valor no se copió a archivos ni logs versionados,
pero esa credencial operator-owned debe revocarse y reautenticarse fuera del release.

## 2026-07-29 — PR #164: main promovido, release bloqueado por latencia Sentry (fix en develop)

`develop` quedó en `2ecef6a5c4c8a79a738536fe04192b7343e358b0` y PR #164 promovió todo el contenido a `main` mediante
el merge completo `e711fe2560e3a7c2e7e8639e07a8a394e9582cdb`. CI, CI Deep, context-governance, CLAUDE, task-contract,
Design Contract, smoke afectado y Vercel pasaron. Vercel production quedó READY para ese SHA.

Los orchestrators `30452322643`, `30452924614`, `30453278402` y `30453818726` se detuvieron en preflight, antes de
crear manifest, aprobar Production o desplegar workers. El primer bloqueo fue `playwright_smoke` sin run para
`main`; el smoke manual canónico `30452463889` pasó verde y publicó resultados en Postgres. Los siguientes intentos
resolvieron smoke, CI y Vercel; `30452924614` encontró timeout de Sentry, `30453278402` encontró staging cancelado +
Sentry timeout y `30453818726` encontró Sentry timeout persistente con staging READY. La medición aisló la causa:
Secret Manager tardó ~1,1 s y la consulta Sentry con `limit=100` tardó ~8,5–9,1 s aunque devolvió cero issues. El
fix en develop reduce el límite a 10 (el umbral de bloqueo), da al check un presupuesto de 20 s y conserva el API
deadline interno de 15 s; también corrige la evidencia del runner para mostrar el timeout específico. Estado honesto:
**fix code complete en develop; rollout pendiente / operativamente bloqueado**. Falta llevar este fix a `main` mediante
el PR canónico, esperar sus gates y repetir el preflight sin bypass. No se usó bypass.

Cambios propios: autenticación efímera de paquetes privados AXIS en workflows, `NPM_RC` cifrado en Vercel `staging`,
Preview develop y Production, compactación documentada de contexto, corrección del presupuesto/auditoría de
`CLAUDE.md` y manifest de reachability. La credencial Vercel actual es operator-owned y debe rotarse por una
identidad read-only antes de rollout externo.

Los cambios locales ajenos siguen fuera de commits: `.vercel/project.json` y los dos artefactos SKY Blog. No se
implementó trabajo nuevo de AXIS/Globe.

## AXIS/Globe — continuidad sin implementación

Globe sigue siendo producto comercial Efeonce; su estadio técnico permanece `internal-only`/`internal_smoke`, con
externos gated por TASK-1480. Incluido en este release de Greenhouse: el fixture opt-in `/design-system/axis-adapters`,
la infraestructura de consumo privado y la documentación/gates asociados. Pendiente para Globe/AXIS: TASK-1591 tiene
promoción productiva pendiente; TASK-1485 sigue `to-do` y depende de TASK-1455/aceptación ADR-016; TASK-1552 mantiene
Slice 3 abierto (estados de error/cancelación, evidencia premium y operación live/internal-only); TASK-1480 requiere
cerrar dossier/evidencia del lane managed y no habilita runtime operado por cliente. ADR-010 mantiene atestación,
promoción por ruta y gates comerciales; ADR-016 exige Tailwind v4 + `tokens.ts` como theme y cero literales de diseño.

Siguiente task recomendado: **TASK-1480**, cerrar primero el readiness dossier del lane managed SKY con sus gates de
derechos, gasto, ruta, rollback, entrega segura, SOW y facturación; después coordinar TASK-1485/TASK-1552 según sus
dependencias. No implementar ese trabajo en esta sesión.

La historia anterior y los índices archivados viven en [Handoff.archive.md](Handoff.archive.md) y
`docs/operations/agent-context-history/`; no cargar esos shards completos al inicio.
