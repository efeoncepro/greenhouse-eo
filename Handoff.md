# Handoff activo

## 2026-07-29 — Production release: Cloud Build AXIS auth root cause isolated

`main` sigue en `9bb780ba4c41bfdf40903b762194fb6bb8085b59`, con CI, CI Deep, smoke, Vercel Production READY,
preflight y manifest verdes. El orchestrator `30465872005` llegó al gate Production, fue aprobado por la sesión
autorizada y desplegó HubSpot correctamente, pero los builds Cloud Run de `ops-worker`, `commercial-cost-worker` e
`ico-batch-worker` fallaron antes del deploy. Azure quedó en sus lanes normales de `no_infra_diff`/espera y no es la
causa.

La evidencia de Cloud Build (`322e8c71`, `f7da8e53`, `cd604434`) fue `ERR_PNPM_FETCH_401` para
`@efeoncepro/axis-tokens`: `No authorization header was set`. La causa era que los tres Dockerfiles y sus inline
Cloud Build configs instalaban paquetes privados sin el secreto AXIS.

Fix code-complete en develop, con PR #166 pendiente de gates y nuevo release: los tres deploy scripts leen
`projects/efeonce-globe/secrets/axis-packages-read-token` con `secretEnv`, materializan `.npmrc` efímero con
`trap`, ejecutan Docker BuildKit `--secret`, y los tres Dockerfiles montan `axis_npmrc` en builder y runtime.
Se concedió `secretAccessor` únicamente a `183008134038-compute@developer.gserviceaccount.com`. No se expuso token en
logs, imagen, artefactos ni runtime. Gates locales `worker-build-contract`, `worker-runtime-deps` y 10 tests focales
pasaron. El carril real de Cloud Build montó el `.npmrc`, pero GitHub Packages respondió `401 Unauthorized` en los
tres builds nuevos (`d393c460`, `367ee552`, `f356a7bd`). La verificación segura posterior demostró que el PAT no
está vencido: el payload es un PAT clásico limpio, GitHub `/user` responde `200` y el tarball privado exacto responde
`200`. La causa real era doble expansión de `$$` en el heredoc no quoted: el shell generador lo convertía en su PID
antes de entregar el config a Cloud Build, lo que explica que cada build reportara un bearer numérico distinto.
El fix preserva `$$AXIS_PACKAGES_READ_TOKEN` para que Cloud Build inyecte el secreto real. Falta revalidar CI, los
tres builds/digests y repetir el orchestrator.

La ubicación en `efeonce-globe` es un acoplamiento legado deliberado y temporal, no ownership de Globe. La decisión de
retiro está atada a ownership: cuando se cree la identidad de máquina, el secreto nuevo debe nacer en un proyecto
neutral del ecosistema AXIS, fuera de cualquier producto; después se migran ambos consumers, se completan build/digest
gates y se revoca el binding cross-project. No se debe recrear el secreto nuevo en `efeonce-globe` por inercia.

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
