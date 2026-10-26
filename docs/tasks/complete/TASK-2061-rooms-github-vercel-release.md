# TASK-2061 — Rooms: repositorio privado y primer release Vercel

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `Repo privado GitHub vinculado y demo pública Vercel verificados; SHA bd4b802, deployment dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc, https://efeonce-rooms.vercel.app/demo. Smoke candidato y producción PASS. API real401; ID TASK-1834 pendiente, DB sólo local.`
- Rank: `EPIC-052 R01 release`
- Domain: `platform|ops|cloud`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-rooms main; checkouts compartidos; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Conciliación vigente — 2026-10-26

Cierre original: primera publicación de demo. Producción posterior está en `main@e4b2e890`, deployment `dpl_7JmMF7ZPBzR56wff83UyL4yFsXoS`; [disparo automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json). Los IDs/SHAs de esta entrega inicial son historia del release, no el despliegue vigente. API de acceso humano permanece OFF.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Summary

Publicar el runtime existente de Rooms en su repositorio privado y Vercel, con instalación reproducible, preview validada y promoción verificable a producción. El release expone únicamente la demostración sintética; no activa identidad real, persistencia cloud ni permisos de clientes reales.

## Why This Task Exists

TASK-2058 entregó la foundation local, TASK-2059 posee la experiencia visible y TASK-2060 construye persistencia y commands locales. Ninguna posee el primer push y rollout de Rooms. El operador autorizó explícitamente crear el repositorio GitHub y publicar en Vercel dentro del goal vigente; esta task registra esa ejecución sin confundir recursos creados con un despliegue operativo.

## Goal

- Repositorio privado con snapshot exacto, reproducible y libre de credenciales o datos locales.
- Preview Vercel validada antes de promover el mismo artefacto a producción.
- URL, revisión, estado del proveedor, smoke y rollback identificados, conservando los gates de identidad y datos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`: evidencia y orden de release; no incorporar Rooms al deploy de Greenhouse por inferencia.

Reglas obligatorias:

- Rooms conserva runtime/repositorio propios; Greenhouse conserva el dossier canónico.
- La autorización para publicar esta demo no activa el rollout productivo de identidad, DB o clientes reales descrito en la arquitectura futura.
- Los access tokens MCP no son sesiones OIDC de Rooms. TASK-1834 conserva la convergencia first-party pendiente; el issuer vivo observado sólo admite el carril MCP.
- No inferir identidad, organización ni permisos desde persona demo, query, cookie o header proporcionado por el navegador.

## Normative Docs

- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-2058-rooms-foundation-and-permissions.md`: foundation, contracts, can y API real cerrada.
- `docs/tasks/in-progress/TASK-2059-rooms-first-experience.md`: consumidor, assets y evidencia visual del snapshot que se publique. Su QA del candidato es gate de promoción, no bloqueo de creación de infraestructura.
- `docs/tasks/in-progress/TASK-2060-rooms-persistence-and-lifecycle.md`: si su código entra en el snapshot, verificar que no requiere ni activa DB cloud; sus migraciones permanecen locales.
- `docs/tasks/in-progress/TASK-1834-efeonce-auth-first-party-oidc-rooms.md`: dependencia para identidad real futura; no bloquea publicar datos sintéticos con API real fail-closed.

### Blocks / Impacts

- EPIC-052 R01 y la disponibilidad de una URL compartible para revisar TASK-2059.
- Adopción de AXIS en build remoto y la frontera entre demo pública y datos reales.
- No modifica el runtime, release ni tenants de Greenhouse, Globe, Think o Studio.

### Files owned

- Esta task: `docs/tasks/in-progress/TASK-2061-rooms-github-vercel-release.md`.
- Configuración de release del runtime existente: `../efeonce-rooms/package.json`, `pnpm-lock.yaml`, `.gitignore`, `next.config.ts`, `vercel.json`, `.vercelignore` y `scripts/sync-brand.mjs`, sólo si la instalación o el hosting requieren un ajuste acotado.
- Snapshot de Git del repo `../efeonce-rooms`; no reescribir cambios de dominio/UI que tienen otro dueño.
- Registro operativo del proyecto GitHub/Vercel; los índices, epic y Handoff se coordinan con el agente raíz.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- Runtime local en `../efeonce-rooms`, branch `main`, con Next/React/TypeScript/Tailwind y paquetes privados AXIS fijados.
- `/demo`, `/demo/workspace`, handlers demo y `/api/v1`; fixtures sintéticas, separación server/browser y permisos efectivos.
- Recursos creados por el coordinador durante esta sesión: repo privado `https://github.com/efeoncepro/efeonce-rooms`; proyecto Vercel `efeonce-rooms`, team `efeonce-7670142f`, ID `prj_9iaZv8FXdhvtC68r30OS3H4o3iJo`.
- Autorización explícita del operador para GitHub y Vercel. La creación de recursos ya ocurrió; esta task no solicita repetirla.

### Gap

- Resuelto2026-10-25: push, preview, candidato de producción, promoción y smoke público verificados; auditoría enlazada en Verification.
- Instalación privada AXIS y snapshot sin DB/config local verificados en build remoto; sin identidad ni DB cloud por esta publicación.
- El dossier anterior dice «sin despliegue»; se actualiza sólo con evidencia del estado alcanzado, a cargo del coordinador.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-rooms` como app propia; documentación en `greenhouse-eo/docs/architecture/rooms` y esta task.
- Future candidate home: `public`
- Boundary: GitHub/Vercel despliegan el artefacto Rooms; los readers/commands/can existentes siguen siendo dueños del dominio.
- Server/browser split: fixtures completas, identidad, DB y secretos sólo server-side; browser recibe DTOs por audiencia. No se empaquetan credenciales de instalación en assets públicos.
- Build impact: instalación de paquetes AXIS privados, Node 24.x, pnpm/lockfile exactos, `scripts/sync-brand.mjs` y assets sintéticos del runtime.
- Extraction blocker: ninguno para hosting de la demo; identidad real y DB cloud requieren sus contratos y evidencia separada antes de activación.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: commit Git de Rooms, metadatos del repositorio GitHub y deployment/proyecto Vercel.
- Consumidores afectados: revisores de la demo, rutas HTTP y build remoto; no clientes reales.
- Runtime target: `staging|production|external`; preview y producción Vercel de datos sintéticos.

### Contract surface

- Contrato existente a respetar: arquitectura Rooms, `../efeonce-rooms/src/domain`, `src/server/session.ts`, `src/app/api` y la versión fijada de paquetes.
- Contrato nuevo o modificado: entrega del artefacto por GitHub/Vercel; no se añade capability de negocio.
- Backward compatibility: `gated`; primer hosting de la demo, API real permanece fail-closed.
- Full API parity: no capability nueva. UI/API/CLI conservan los primitives existentes; no se incorpora un bypass de autorización para hacer pasar el smoke.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla cloud. El proyecto/deployment y revisión Git son los únicos objetos externos escritos por este release.
- Invariantes que no se pueden romper:
  - Toda marca, pieza, evidencia y persona visible en la demo es sintética y está identificada como tal.
  - No se conecta la DB local a Vercel ni se exporta su URL, dump o estado al repositorio.
  - Sin sesión real verificada, las rutas reales deniegan acceso antes de consultar o mutar datos; el selector demo nunca concede autoridad real.
- Write-target allowlist: repo `efeoncepro/efeonce-rooms` y proyecto Vercel `prj_9iaZv8FXdhvtC68r30OS3H4o3iJo` en team `efeonce-7670142f`; ningún destino DB o recurso de otro producto.
- Tenant/space boundary: conservar can y DTO por audiencia. Los recursos cloud pertenecen al team indicado; no derivar tenant real de valores enviados por el cliente.
- Idempotency/concurrency: resolver repo/proyecto existentes por identidad antes de cualquier creación; un deployment se asocia a un SHA exacto. Ante respuesta ambigua consultar estado antes de reintentar promoción o creación.
- Audit/outbox/history: evidencia del proveedor, SHA, deployment ID/URL, tiempos y smoke en el handoff de release. Sin outbox nueva porque no existe mutation de negocio.

### Migration, backfill and rollout

- Migration posture: `none`; los archivos de migración de TASK-2060 no se ejecutan en cloud.
- Default state: demo sintética disponible; endpoints reales cerrados y DB cloud ausente.
- Backfill plan: ninguno; prohibido copiar datos locales/reales al hosting para poblar la demo.
- Rollback path: deployment anterior validado o retirada controlada de publicación si es el primer release, con procedimiento del proveedor identificado antes de promover.
- External coordination: GitHub/Vercel del team autorizado; credencial mínima de lectura de paquetes AXIS en entorno seguro del build, nunca en código, logs o variables públicas.

### Security and access

- Auth/access gate: acceso administrativo al repo/proyecto; API real conserva sesión verificada y can. TASK-1834 sigue pendiente y los scopes MCP no acreditan login first-party.
- Sensitive data posture: sólo datos sintéticos publicados. No credenciales, cookies, tokens, URLs de DB, dumps, archivos `.env` reales ni capturas con secretos en Git o artefactos.
- Error contract: conservar errores canónicos sanitizados de Rooms; build/provider logs revisados sin copiar valores sensibles.
- Abuse/rate-limit posture: no habilitar writes reales, uploads ni credenciales demo de producción. Verificar que los únicos handlers públicos son los declarados para la muestra; controles adicionales de borde se documentan si el hosting los requiere.

### Runtime evidence

- Local checks: `pnpm verify` y `pnpm test:e2e` sobre el snapshot; lectura de diff/staging exactos y revisión de artefactos ignorados.
- DB/runtime checks: ausencia de conexión DB cloud y smoke fail-closed de API real, incluidos intentos de suplantar rol/organización mediante headers o persona demo.
- Integration checks: readback repo privado y SHA remoto; instalación AXIS; preview y producción Ready con el mismo SHA/deployment promovido.
- Reliability signals/logs: resultado del build Vercel, errores HTTP/console/hydration, respuestas inesperadas 2xx en API real y ausencia de assets/fonts en runtime.
- Production verification sequence: ejecutar el orden de slices y smoke descritos abajo; detener promoción si falla cualquier gate.

### Acceptance criteria additions

- [x] Source of truth, contrato, consumidores y allowlist externos están declarados; no se introduce una tabla ni capability de negocio.
- [x] Postura de identidad, datos, migración, rollback y errores está explícita; la verificación runtime sigue pendiente en los criterios del release.
- [x] El runtime publicado acredita invariantes y frontera de acceso mediante pruebas sobre su URL efectiva, no sólo pruebas locales. Evidencia: smoke externo y API anónima del release inicial ya descritos en sus checks posteriores; canary privado posterior2026-10-26 en el recibo conjunto. No equivale a aceptación visual ni activación general.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Infraestructura y snapshot reproducible

- Reutilizar repo privado y proyecto Vercel ya creados; leer estado y registrar identidad exacta.
- Seleccionar y validar el snapshot de Rooms, con archivos de UI/backend coordinados y sin WIP ajeno, secretos ni datos locales.
- Registrar remoto, commit y push autorizado; leer SHA remoto y visibilidad privada después de la operación.
- Completar configuración mínima del build y consumo privado AXIS sin ampliar permisos o hacer públicos los paquetes.

### Slice 2 — Preview y smoke

- Desplegar una preview del SHA exacto y esperar su estado Ready.
- Verificar demo cliente, operador/administrador sintéticos, denegación cliente del workspace, fuentes, logo y tres ratios originales.
- Probar navegación, visores, movimiento reducido/fallback y ausencia de errores según la evidencia de TASK-2059.
- Probar API real cerrada sin identidad; no habilitar DB cloud, seed real ni auth alternativa.

### Slice 3 — Promoción y handoff

- Identificar rollback concreto antes de promover; conservar deployment ID y revisión de retorno si existen.
- Promover el artefacto validado a producción y verificar URL, SHA, Ready, HTTP, permisos y assets desde fuera del build.
- Registrar límites vigentes, ruta de rollback y estado exacto en esta task, epic e índices mediante el coordinador.

## Out of Scope

- Identidad OIDC real, emisión de cookies de producto, nuevos scopes, tenants/clientes reales o habilitar mutations reales mediante el selector demo.
- Provisionar PostgreSQL cloud, aplicar migraciones allí, importar la DB local o activar storage/worker/CDN de medios privados.
- Rehacer UI, motion o dominio: sus dueños siguen siendo TASK-2059 y TASK-2060.
- Cambiar DNS o activar `rooms.efeonce.org` por inferencia; la URL Vercel validada satisface esta primera publicación.
- Cambiar releases, proyectos o secretos de otros productos, publicar paquetes AXIS o enviar comunicaciones a terceros.

## Detailed Spec

La unidad de release es un SHA de `efeoncepro/efeonce-rooms` y un deployment Vercel identificable, no el directorio local ni la palabra «Ready» aislada. La evidencia diferencia recurso creado, código empujado, build terminado, preview verificada, producción promovida y smoke externo completo.

La publicación conserva el producto como demo: `/demo` y sus personas son muestras públicas sintéticas; `/api/v1` no obtiene autoridad por existir en internet. El candidato puede incluir el código local de persistencia de TASK-2060 sólo si la inicialización no exige DB para servir demo y las rutas reales fallan cerradas antes del acceso al store.

El acceso a AXIS usa la configuración oficial de paquetes privados. El artefacto remoto incluye las imágenes de muestra y genera los SVG oficiales con su script; no sustituye recursos por placeholders para lograr un build verde. Las versiones efectivas de Node/pnpm/Next se registran al validar Vercel.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (snapshot + repositorio privado + instalación) → Slice 2 (preview Ready y smoke completo) → Slice 3 (rollback definido → promoción → readback externo). Se puede crear infraestructura mientras terminan los gates locales; no se promueve un snapshot diferente del verificado sin repetir sus checks.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Credencial de paquetes o DB local expuesta | GitHub/build | medium | Revisión de staging/ignore y secrets sólo en el proveedor; no imprimir valores | Archivo sensible tracked o valor en bundle/log |
| Build remoto falla por paquetes privados o versión de runtime | Vercel/AXIS | medium | Preview con instalación reproducible y pins exactos | Error de instalación, peer o build |
| Demo concede acceso real | Identidad/API | low | Fail-closed server-side, pruebas con spoofing y sin conexión DB | Endpoint real devuelve datos o mutation con persona demo |
| Snapshot publicado difiere del aprobado | Release | medium | SHA remoto/deployment y readback antes/después de promoción | Commit o deployment ID distintos |
| Assets/fonts o interacción fallan sólo en hosting | UI pública | medium | Smoke externo con QA de TASK-2059 sobre preview y producción | 404, ratios alterados, overflow, console/hydration |
| Primer release no tiene anterior para rollback | Vercel | medium | Identificar y verificar retirada controlada antes de promoción | Falta de deployment de retorno o procedimiento ejecutable |

### Feature flags / cutover

No se crea flag de producto para fingir identidad lista. El cutover es la promoción explícita del deployment validado. API real fail-closed y ausencia de DB cloud son invariantes del release, no switches que se habilitan al terminar la demo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Conservar repo/proyecto creados, detener push/configuración y revertir sólo cambios de release mediante un commit acotado; no borrar recursos como primera respuesta | Inmediato para detener; duración de reversión según proveedor | Sí |
| 2 | No promover preview fallida; retirar o proteger la preview según el control disponible del proyecto y conservar logs/ID | Una operación del proveedor más readback | Sí |
| 3 | Volver al deployment anterior validado por el mecanismo Vercel verificado. Si no existe, retirar la publicación con el procedimiento identificado y probado antes del cutover, sin borrar repo/proyecto | Tiempo medido durante la validación; no prometer un SLA sin prueba | Sí para publicación; no hay datos de negocio que revertir |

### Production verification sequence

1. Verificar permisos de repo/team, snapshot sin secretos y gates locales del SHA candidato.
2. Leer el SHA remoto después del push y confirmar visibilidad privada.
3. Crear preview en el proyecto existente; leer estado Ready, versión efectiva de build y deployment ID.
4. Ejecutar smoke externo de demo, roles sintéticos, assets, teclado/reduced motion y errores; confirmar API real cerrada sin DB cloud.
5. Identificar el deployment de retorno o procedimiento de retirada; dejar comandos/operaciones concretas y evidencia sin secretos en el registro de release antes de promover.
6. Promover la misma preview validada; confirmar revisión/deployment servido por la URL de producción.
7. Repetir smoke de rutas y acceso sobre producción; registrar tiempos, fallos y límites. Un fallo mantiene la task abierta y activa rollback según la matriz.

### Out-of-band coordination required

El operador ya autorizó GitHub y Vercel. El coordinador usa la cuenta/team confirmados y configura acceso mínimo a AXIS cuando lo requiera el build. No se solicita renovar una autorización ya dada. Si una dependencia externa no permite continuar, se documenta la acción exacta que falta; no se habilita OIDC o DB cloud como atajo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Autorización explícita del operador registrada para crear repo GitHub y publicar Rooms en Vercel, dentro del goal vigente.
- [x] Infraestructura inicial creada: repo privado `efeoncepro/efeonce-rooms` y proyecto `efeonce-rooms`/`prj_9iaZv8FXdhvtC68r30OS3H4o3iJo` en `efeonce-7670142f`; reportado por el coordinador en esta sesión el 2026-10-25.
- [x] Push completado y SHA remoto leído; repo privado y snapshot `bd4b802acbbe1db1b0089c9dc0d558c67c41d111`, sin credenciales/datos locales tracked. Git integrado con Vercel/main.
- [x] Instalación frozen410paquetes y controles supply-chain/build remoto AXIS PASS; Next16.4.3/pnpm12.15.0, Node24.x gestionado confirmado; sin bypass de peers/typecheck ni datos locales en tracing.
- [x] Preview instalación Ready; candidato production `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc` del SHA final pasa smoke externo desktop/móvil, roles, assets, motion y foco. Evidencia cloud-candidate, no sólo local.
- [x] Demo sintética, fuentes/hero/logo/ratios y estados verificados en cloud-candidate y cloud-production.
- [x] HTTP7checks candidato y5 público: API real GET/POST401 frente a spoof, tres personas y client-workspace403; sin DB/migraciones cloud.
- [x] Efeonce ID no listo: source/TASK-1834 y metadata viva sólo scopes MCP; API real sigue401. Evidencia en auditoría del release.
- [x] Retirada por ID concreto verificada sobre primer intento propio fallido y readback ausente; primer release sin anterior aceptado. Procedimiento y límites en auditoría; no hay backfill/estado de negocio cloud.
- [x] Promoción por ID exit0 sin rebuild; API alias apunta al mismo deployment/SHA; URL pública200 sin bypass/redirect y smoke desktop/móvil PASS, sin erroresJS. Logs remotos nivelerror sin resultados.
- [x] Canon, epic, índices y Handoff actualizados con publicación y límites; cierre exclusivo del release demo.

## Verification

- En Rooms: `pnpm verify` y `pnpm test:e2e` sobre el candidato; revisar `git diff --cached --check` y los paths staged antes del commit/push.
- En GitHub: readback de visibilidad y SHA del branch `main`; no asumir que push equivale a deploy.
- En Vercel: readback de proyecto/team, deployment ID, estado, revisión y URL; smoke preview → producción y ruta de rollback.
- En Greenhouse: `pnpm task:lint --task TASK-2061` y `pnpm ops:lint --changed` para la documentación coordinada.
- Visual: reusar los escenarios de TASK-2059 sobre la URL efectiva, incluidos teclado, foco, movimiento reducido y no snapshots entre personas.

## Closing Protocol

- [x] `Lifecycle` y `Status real` reflejan el resultado externo, no sólo recursos creados o build local.
- [x] Archivo movido a `complete/` sólo después de promoción y smoke verificados; si falta un gate continúa `in-progress`.
- [x] `docs/tasks/README.md`, registry y EPIC-052 sincronizados por el coordinador.
- [x] `Handoff.md` y documentación Rooms registran URL, SHA, deployment, rollback y límites.
- [x] `changelog.md` registra la primera publicación cuando ocurra.
- [x] Chequeo cruzado de TASK-2059/TASK-2060/TASK-1834; sin cerrar trabajo de identidad o persistencia cloud por esta publicación.
- [x] Evidencia de release sin secretos y sin atribuir a un tercero aceptación visual o uso real no observados.

## Follow-ups

- TASK-1834 y adopción posterior de identidad first-party por Rooms antes de habilitar usuarios/datos reales.
- EPIC-052: DB/storage/medios privados, dominio propio y rollout externo con sus gates; no se activan por la publicación de la muestra.
- TASK-2059 mantiene la aceptación visual humana y TASK-2060 la persistencia local/commands.

## Evidencia de cierre — 2026-10-25

[Auditoría del release](../../audits/rooms/2026-10-25-persistence-motion-release.md), [QA independiente](../../ui/reviews/TASK-2059-rooms-first-experience/motion-axis/review.md), [demo pública](https://efeonce-rooms.vercel.app/demo) y [repo privado](https://github.com/efeoncepro/efeonce-rooms). Candidato final SHA `bd4b802acbbe1db1b0089c9dc0d558c67c41d111`, ID `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc`. `cloud-candidate/summary.json` y `cloud-production/summary.json` conservan resultados sanitizados. El alias público fue comprobado además por API independiente del agente raíz.

40 tests dominio/transporte, lint/negativos/typecheck/build PASS;41E2E de matriz,16readiness,8contraste y24motion/burst/foco por cambios progresivos; GVC4viewports/68frames sin findings. La entrega no sustituye aceptación visual humana de2059 ni cierra EPIC-052.
