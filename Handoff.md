# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

### ISSUE-152 + ISSUE-153 resueltos — mercado de Berel corregido + contrato multi-mercado (2026-08-13)

**Berel migrado a México** (autorización del operador: "Berel es de México" + "solucionalo
end-to-end"): `seot-berel-mx` activo con 31 keywords, `seot-berel-fase0` (CL) pausado con sus 238
snapshots íntegros. Verificado con capturas reales (USD ~0.14): 31/31 rankings MX — **#1 en sus
términos de marca** —, mercado 30/31, ledger atribuido. El cron diario toma MX solo desde el
próximo ciclo (itera targets `active`).

**Contrato multi-mercado shipped** (`bc7cafe77`): helper canónico `resolve-target.ts` (los 4
`LIMIT 1` copy-pasteados migrados), lane con `?market=` + 409 `multiple_markets`/`market_not_found`,
`meta.servedMarket` en toda respuesta, 9 MCP tools con `market` opcional. Suite 10.629 verde.

**Pendientes que dejaron estos cierres (no bloqueantes):**
- Selector de mercado en la UI admin (cockpit/keywords) — producto, para cuando una org
  multi-mercado se materialice; declarado en ISSUE-153 §Follow-up.
- Guardrail de alta de target (contrastar volumen del nombre de marca vs mercados vecinos) —
  ISSUE-152 §4.
- `keyword_difficulty` del proveedor sigue sin ser confiable en español (KD 0 con 135k
  búsquedas): NO mostrar esa columna a cliente sin segunda fuente.

### TASK-1661 — datos de mercado por keyword: code complete, rollout PENDIENTE (2026-08-13)

`greenhouse_growth.seo_keyword_market_data` **ya existe en la base** (migración `20260813171143226`
aplicada; base compartida dev/staging/prod). `readKeywordOpportunities` ya no cablea
`market: 'unavailable'`. Commits: `261b2919a` (schema) · `739734512` (fetch) · `efc76b8b0` (reader,
worker, MCP, señal + fix). Suite completa 10.616 verde; sanity PG 13/13.

**Lo que FALTA para que esto funcione en runtime (nada de esto está hecho):**

1. Autorización tuya para habilitar la captura recurrente — **gasta saldo DataForSEO**.
2. `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED=true` en `services/ops-worker/deploy.sh` + deploy.
   El flag vive **sólo en el ops-worker**; en Vercel es inerte.
3. Despausar `ops-seo-keyword-market-data` (5.º arg de `upsert_scheduler_job`, hoy `"true"`).

Hasta eso, el estado correcto es **`code complete, rollout pendiente`**, no "listo".

**Riesgo abierto que hay que cerrar antes de mostrar la columna a un cliente:** el proveedor devuelve
`keyword_difficulty = 0` para cabeceras de alto volumen (`pintura`, 18.100 búsquedas/mes). Se verificó
contra la respuesta cruda: el 0 es del proveedor, y para otras keywords devuelve `null`, así que el
campo sí distingue. Se persiste verbatim (transformarlo sería inventar), pero un 0 se lee como
"trivialmente fácil" y sería una afirmación falsa. Contrastar con una segunda fuente.

**Gasto real ya incurrido en verificación: USD ~0.05** (dry-run gratis + corrida real + una llamada
de diagnóstico + la corrida con el defecto que se corrigió).

**Desbloqueadas por este cierre:** `TASK-1662` y `TASK-1664` pasaron a `Blocked by: none`. 1664 tiene
además su spec recalibrada (commit `a98aaf4c7`): entitlement `seo_v2`, IDs `TEXT`, despertador por
Cloud Scheduler y el boundary de ownership del dato de mercado.

### Credencial de partner en el deck + los aprendizajes documentados (2026-08-13)

**Sin commitear todavía: conviven con el WIP del deck ANAM/HubSpot en el árbol.** El badge de HubSpot
rompía `catalog-portability.test.ts` (apuntaba a `public/` con `../../../../../`). Corregido: el asset
vive en `catalogs/deck-axis/assets/partners/` y el slot resuelve por clave cerrada
(`partner-badge-asset`, espejo de `client-logo-asset`). Suite del composer verde: 18 archivos, 223 tests.

**Lo que necesita quien siga:**

1. 🔴 **`pnpm composer:visual-gate` sigue rojo en DOS láminas, y ninguna es regresión.**
   `BackCoverFull` (1.787 px) driftea porque **declarar un slot mueve el frame del probe**: el gate
   compone con slots sintéticos y para cualquier `asset` usa `assets/url-lum.svg` — por eso aparece una
   burbuja de URL dentro de la caja del badge. Es delta intencional del carril ANAM, a declarar en
   `BASELINE_DELTAS.md`. `NarrativeSplit` (58.846 px) es **baseline viejo en `HEAD`**: su plantilla está
   commiteada desde `f7761988f` y limpia en el árbol. **No congelé**: el runbook prohíbe `--freeze` con
   el composer sucio por otro agente, y lo está.
2. **El dueño del carril ANAM decide si mis cambios viajan con su commit o van aparte.** Son 4 archivos:
   el SVG copiado, `back-cover-full.html`, `back-cover-full.slots.json` y `resolvers.ts`.
3. **Queda una duplicación de asset por decidir:** el badge existe ahora en `public/branding/partners/…`,
   en `src/lib/brand-assets/` (módulo TS, untracked) y dentro del catálogo. Tres hogares para un SVG.

### TASK-1310 CERRADA — portal SEO del cliente completo; su propio scorecard estaba equivocado (2026-08-12)

**`complete`, promoción `develop → main` pendiente.** Con ella el módulo SEO tiene sus dos caras
(4 tabs de operador + portal cliente) y la pata visible del exit criterion de parity queda cubierta.
Los 4 gates UI en verde: `design-contract:lint` · `ui:code-lint` · `ui:visual-gate` · `ui:quality`
**PASS 4.52**. Verificado con **sesión de cliente real de la organización contratada**: 3 superficies
× 2 viewports, `qualityFindings` **vacío** en las seis corridas.

**Lo que necesita quien siga:**

1. 🔴 **Un scorecard es una foto con fecha, no un estado.** El de esta task bloqueaba con 2.29 sobre
   capturas de las 10:25 del 08-08, y el commit `5f622386d` de las 19:29 ya había ejecutado los 7
   lotes premium. Cuatro días el veredicto vigente describió una UI inexistente. **Ante una task con
   auditoría abierta: medir antes de rehacer.** Acá casi rehago trabajo terminado.
2. **Los gates no ven contradicciones de contenido.** El informe anunciaba "Aún no hay una posición
   media para leer" con `#13.3` al lado, con `exitCode 0` y axe limpio. Causa: tres renders del mismo
   modelo derivando cada uno su regla. Ahora se deriva una vez (`resolveSeoLeadTitle`) con test de
   regresión. **Mirar el frame no es opcional.**
3. **Para verificar una superficie client-gated hace falta la persona de ESA organización.** La
   genérica `agent-client@…` recibe la card de bloqueo y se lee como defecto de producto. La de Berel
   ya existía: `agent-berel-client@greenhouse.efeonce.org`. El mapeo usuario↔organización **no** está
   en `client_users`/`clients`/`organizations` — está en `greenhouse_serving.session_360`, que es
   donde el runtime mismo lo resuelve. La sonda `scripts/growth/_sanity-seo-client-population.ts`
   deja esa consulta lista.
4. **Fix global de paso:** el FAB "volver arriba" del layout `(dashboard)` no tenía nombre accesible
   (`button-name`, *critical*) en **todas** las rutas del portal. Cerrado con label del namespace
   `aria` canónico (`756d9970d`).
5. 🔴 **`pnpm test` está rojo en el árbol por trabajo AJENO:** `catalog-portability.test.ts` falla por
   un `../../../../../public/branding/...` en `deck-axis/back-cover-full.html`, WIP no commiteado del
   deck ANAM/HubSpot (en HEAD hay cero ocurrencias). El guardrail hace su trabajo: ese path escapa del
   catálogo. 10.588 tests pasan. No lo toqué — no es mío, y quien lo tenga en curso debe verlo.
6. **Follow-up con dato, sin task todavía:** la superficie cliente tiene **una sola organización**
   (Efeonce tiene assignment pero es tenant interno y `requireClientTenantContext()` lo excluye). Con
   N=1 nadie delata que `connection.state` se decide con **GSC** mientras el Resumen deriva de **rank
   snapshots**: un cliente con Search Console conectado y captura de rank sin correr —**el día 1 de
   todo cliente nuevo**— ve el KPI principal en "sin dato" con el Quadrant poblado debajo.

### CIERRE END-TO-END TASK-1688/1689 — segundo release del día, cero pendientes (2026-08-12)

Release `950f5bdb4` (PR #191) → manifest `950f5bdb4043-71cc7e1a-…` en **`released`** (run `31639297861`, sin
bypass: batch sin migraciones). Cierra TODO lo que quedaba: **flip expand→contract** del país (requerido en
parser; verificado en staging con POST sin país → `invalid`), país en «01 Tus datos» del form nativo, **fix del
select premium** (placeholder real — mostraba la primera opción como elegida con valor vacío), **email
`selected` ejercitado live** (supersede controlado sobre EO-APP-0090, `sent`; re-decidida rejected), **scorecard
GVC PASS** (avg 4.6, capturas 1440+390 de ambas superficies), **revisión de privacidad documentada**
(`docs/operations/hiring/2026-08-12-revision-privacidad-contacto-careers.md`; 2 recomendaciones no bloqueantes:
completitud del aviso público en efeoncepro.com/privacy + purga del mensaje en la política de retención) y fila
del flag movida a §Snapshot (los 6 tipos con evidencia live). **Hallazgo de CI:** el run de `main` quedó rojo con
10.582 tests verdes por un flake pre-existente (timer del email-verify del renderer dispara post-teardown sin el
global `CSS` → unhandled rejection); rerun verde + guard commiteado en develop (`a349d0088`, viaja en el próximo
release). `ops-worker` en `63625ccdd` = residual change-gated (diff runtime 0). Único follow-up humano restante:
las 2 recomendaciones de la revisión de privacidad.

### ROLLOUT COMPLETO TASK-1688/1689 — emails de hiring LIVE + contacto Careers en producción (2026-08-12)

Release `393144e9f` (PR #190) → manifest `393144e9fb3b-8d17b9bc-…` en **`released`** (run `31593198609`,
workflow 9m54s, ambos gates `production` aprobados por loop, bypass forense por `db_migrations` ya aplicadas en
la instancia única + `cloud_release` ya aplicado en vivo). Verificación: health 3 providers `ready`, watchdog
`ok`, 3 workers en target + `ops-worker` residual change-gated con diff runtime 0 (su SHA `e8078fe08` ya contiene
los consumers). **Emails LIVE**: flag ON (rev `ops-worker-00548-x52` + default true en deploy.sh), ejercicio E2E
real EO-APP-0090 con 5 tipos `sent` (interno a people@efeoncepro.com con contacto completo + acuse + Preselección
+ evaluación + rechazo, asuntos personalizados). **Contacto Careers LIVE**: campo país en el form custom de prod
(curl verificado) y Growth Form v4 publicado (paridad nativa; el campo cae en «Datos adicionales» del renderer —
deuda visual menor). La postulación de prueba `EO-APP-0090` (Prueba TASK-1689 NO CONTACTAR) queda en el Desk para
descarte de HR. **Pendientes menores:** revisión Legal/Privacy de los 3 campos; flip país→requerido-en-parser
tras ventana de observación; scorecard GVC formal; sacar la fila del flag de §Pendientes del ledger tras la
primera postulación real con emails verificados.

### Sika México LIC-1120 — paquete de bid preparado, sin precio ni envío (2026-08-12)

Se creó [`docs/commercial/tenders/sika-lic-1120/`](docs/commercial/tenders/sika-lic-1120/): originales en OneDrive, evidencia Wherex, admisibilidad, blueprint interno, técnica, estructura económica y deck de taller. La propuesta se enfoca en continuidad comercial: Search por intención y ubicación → landing/ficha de destino → canal de atención → medición y optimización; **no** promete transferir 50% de ventas. El deck técnico de ocho láminas pasó slots y revisión visual local, pero sigue siendo taller (sin `Proposal`/render gobernado). La pregunta propia continúa en **0/1 respondidas** al 12-08 11:14: faltan fecha/destino/stock por cierre, línea base/fuente de ventas y canal autorizado. **Corrección 2026-08-13:** el brief confirma MXN 100–150 mil para desarrollo y ejecución, pero no dice explícitamente que incluya pauta; una lectura anterior atribuye creatividad/pauta/fee a la respuesta del comprador, y debe revalidarse antes de fijar precio. No existe cotización aprobada. Wherex muestra 45 días, pero también condiciona el crédito a lo convenido con Sika: no asumirlo como término cerrado. La oferta Wherex sigue en edición, sin adjuntos, términos aceptados ni envío; tab queda en handoff.

### TASK-1688 CERRADA — contacto completo en postulaciones Careers: code complete, rollout pendiente (2026-08-12)

ADR aceptado y registrado (Delta en la arquitectura Hiring + `DECISIONS_INDEX`): `phone_e164` y
`residence_country_code` (autodeclarado, ISO, CHECK) viven en `candidate_facet` con upsert anti-wipe;
`candidate_message` (≤4000) en `hiring_application`. Migración `20260812094000000` aditiva aplicada y verificada
contra PG real — su timestamp es 09:40 porque la migración de ISSUE-151 (nombrada a mano con hora futura 09:30) ya
estaba aplicada y node-pg-migrate rechaza timestamps anteriores. El parser único valida el país contra el SSOT
`countries.ts` SIN truncar (`'Chile'`→`'CH'` habría sido Suiza — atrapado por test) y lo usa sólo como hint de
formato del teléfono; el command persiste los tres campos (test anti-regresión del bug class "el form acepta y el
command descarta"). Paridad: select de país requerido en `CareersApplyClient` + contrato del native Growth Form,
copy es-CL/en-US tokenizado; Application 360 muestra Teléfono completo / País (nombre textual) / Mensaje, con "No
informado" para legacy. Suite completa 10.585 tests + lint/typecheck 0; `design-contract:lint` y `ui:code-lint`
PASS. **Rollout pendiente:** ejercicio en staging + GVC premium 1440/390 (el preview harness local no levantó el
dev server esta sesión), revisión Legal/Privacy de retención/aviso, y el flip expand→contract que hace el país
requerido a nivel parser tras verificar ambas superficies en producción.

### TASK-1689 CERRADA — emails del ciclo de Hiring: code complete, rollout pendiente (2026-08-12)

Los 6 emails (aviso interno a People + acuse al candidato en `hiring.application.created`, test asignado en
`hiring.assessment.assigned` sólo `candidate_test`, avance de etapa allowlisted en `stage_changed`, decisión
selected/rejected anti-stale en `decided`) quedaron cableados como 4 consumers reactivos domain `notifications`
(lane existente `ops-reactive-notifications`), con política en `src/lib/hiring/notifications/**`, dedupe
`wasEmailAlreadySent` y re-emisión canónica del token del test (`reissueCandidateTestTokenForEmail` — el token
nunca viaja por el outbox). Gates: 10.577 tests verdes, lint/typecheck 0, worker gates OK; el `pnpm build` de
producción NO se corrió por la preferencia del operador (memoria: build cuelga la máquina) — el CI lo cubre al
push. **Rollout pendiente:** flag `HIRING_LIFECYCLE_EMAILS_ENABLED` default OFF en `deploy.sh` (seed
`email_type_config` YA aplicado en la DB compartida, benigno con flag OFF); el flip exige deploy del ops-worker
+ ejercicio end-to-end en staging + revisión de Talent del copy (especialmente `hiring_decision_rejected`,
pausable aparte). Ledger actualizado. El seed se aplicó selectivamente con `pnpm migrate:up 1` para no adelantar la migración de
ISSUE-151, que en ese momento exigía código desplegado primero (la sesión de ISSUE-151 la aplicó después por su
propio carril — ver su entrada).

### ISSUE-151 RESUELTA — bridge Facebook, grant Globe y smoke de identidad verificados (2026-08-12)

`d139726ff` llegó a `main` por PR #189 y el release de producción terminó correctamente. El filtro Sentry para
`JAVASCRIPT-NEXTJS-8W` descarta sólo el bridge Facebook Android `Java object is gone`; Careers siguió respondiendo
200 con `<greenhouse-form>` y sin `postMessage`/iframe. La migration
`20260812093000000_issue-151-seed-globe-credits-view-access.sql` quedó aplicada en Cloud SQL: registry activo y
único grant `efeonce_admin → administracion.globe_credits` con `granted=true`.

Se cerró además el falso positivo `JAVASCRIPT-NEXTJS-4S`: el `ops-worker` compartido consultaba el portal staging,
que responde 302 por su SSO; quedó apuntando al portal público. Dos ejecuciones consecutivas de
`ops-identity-auth-smoke` pasaron 5/5, incluido `portal_auth_health`, y la health pública devolvió `ready`. 8W no
recibió eventos tras el rollout. Los dos tickets remotos siguen *unresolved* sólo porque la sesión de Sentry no está
autenticada y el token API disponible es read-only (403 al resolver); hace falta una sesión/token con escritura para
marcarlos en Sentry. El artefacto interno vive en `docs/issues/resolved/ISSUE-151-…`.

### TASK-1378 CERRADA + ISSUE-150 RESUELTA — scanner LIVE en producción, verificado en 3 capas (2026-08-12 06:10Z)

**Cierre completo, autorizado por el operador ("terminemos todo lo que falte"):** (1) redeploy
`greenhouse-aivcug5f5` con el flag horneado; (2) diagnóstico post-flip EN producción: `flagEnabled=true`,
`credentialPlan=service_account_key`, `mint.ok` (94 ms), `probe.ok` (147 ms); (3) **camino completo de upload
productivo**: postulación de prueba por el formulario público REAL (`PRUEBA TASK-1378 / NO CONTACTAR`,
`task-1378-postflip-prod@efeonce.org`, Turnstile real auto-verificado, CV inyectado vía DataTransfer) →
`scan_id ascan-e6a62b39-de96-4279-87ba-172587040068`, `scanner=structural+clamav-http`, `verdict=clean`,
asset `attached`, 129 ms. **HR descarta esa postulación en el Desk** (tercera de prueba identificada).

ISSUE-150 movida a `resolved/` (índice actualizado); TASK-1378 movida a `complete/` con sección de cierre;
flag ledger con Production ON en el snapshot; delta de impacto cruzado en TASK-1423. Gates de cierre (full
test + build) corridos en el commit de cierre. El bloqueo del clasificador de permisos sobre
`vercel env/redeploy` resultó transitorio.

### (histórico) TASK-1378 — RELEASE HECHO + diagnóstico VERDE en producción; falta SOLO el flip del flag (2026-08-11 23:15Z)

**Actualización de la misma fecha, sesión "avanza con lo necesario":** la promoción develop→main se ejecutó
completa y A LA PRIMERA por el control plane: PR #188 → squash `a90951dba` → orquestador run `31544667630` →
manifest `a90951dba3b7-73da976e-f460-4241-8708-5772421fa49d` en `released` (workflow 11m45s, ambos gates
`production` aprobados por el loop, Azure no-op esperado, 4 workers success, post-release health verde). Watchdog
local: `drift_count=0` con `data_missing_count=4` — la sesión gcloud expiró a mitad de release; NO es drift, la
evidencia autoritativa son los jobs de deploy del run. Pre-empción completa: merge canónico verificado (verif 1 y
2 vacías), `decision=ship` sin marker ni bypass, smoke producido sobre `main` (run `31543221610`), staging READY.

**El diagnóstico nuevo respondió VERDE desde el runtime de producción** (`greenhouse.efeoncepro.com`,
`version=a90951d`): `credentialPlan=service_account_key`, `mint.ok=true` (53 ms,
`email=greenhouse-portal@efeonce-group.iam.gserviceaccount.com`, `aud` del scanner), `probe.ok=true`
(`scanStatus=ok`, 100 ms). Las condiciones (1) y (2) de ISSUE-150 están CUMPLIDAS.

**Único paso restante — REDEPLOY de Production, EN MANOS DEL OPERADOR:** la env var
`ASSET_MALWARE_SCAN_ENABLED="true"` YA quedó en Production (verificada ~23:25Z vía `env pull`), pero el
deployment activo (`greenhouse-asy9c5esa`, build 22:37Z) se construyó ANTES de la var — Vercel congela env al
build. El clasificador de permisos del agente bloqueó `vercel redeploy`. Comando:
`vercel redeploy https://greenhouse-asy9c5esa-efeonce-7670142f.vercel.app --scope efeonce-7670142f` (o botón
Redeploy del dashboard). Verificación post-redeploy: endpoint de diagnóstico con `flagEnabled=true` + primera
postulación real con `scanner=structural+clamav-http`. Pendiente menor aparte: `gcloud auth login` para
refrescar la sesión local (watchdog/`release:workers` en `data_missing`, sin impacto).

### TASK-1378 — causa raíz del 2.º fallo del flag CERRADA EN CÓDIGO; flag OFF en prod hasta verificar desde el runtime (2026-08-11, sesión anterior)

Estado real: **staging ON y operativo** (gate E2E con postulaciones reales); **Production OFF** — el flag falló
DOS veces el 2026-08-11 (ISSUE-150) y quedó revertido. Todos los CV afectados (5+1) recuperados.

**Causa raíz del 2.º fallo, encontrada y corregida esta sesión:** Production corre con
`GCP_AUTH_PREFERENCE=service_account_key` (postura transicional, TASK-800) y `resolveGoogleIdTokenProvider`
(`src/lib/google-credentials.ts`) no tenía rama de service account key — caía a impersonación ambiente sin ADC
en Vercel → excepción en 21 ms → fail-closed `scanner_auth_failed`. Staging pasó su gate porque sin la
preferencia toma la rama WIF. **Fix:** rama `service_account_key` enrutada por `getGoogleIdTokenProviderPlan()`
(exportado, 6 tests con los shapes exactos de prod/staging) + **endpoint de diagnóstico
`GET /api/internal/health/scanner-auth`** (`?probe=scan`; guard `CRON_SECRET` o tenant agency) que acuña el
token EN el runtime donde corre. Sanity honesto ejecutado: con la SA key REAL de producción (no la ADC del
operador), mint 120 ms + Cloud Run aceptó (clean `ok` / EICAR `found`).

**Condición vigente para re-prender en Production** (la anterior — "código en main" — se cumplió y NO bastó):
(1) fix + endpoint promovidos a `main` vía release control plane; (2) `?probe=scan` contra
`greenhouse.efeoncepro.com` con `mint.ok=true` + `probe.ok=true`; (3) flip mirando la primera postulación real
(~13/día por la campaña de Facebook de `EO-OPN-0061`/`EO-OPN-0009`). Rollback <10 min.

Docs sincronizados: ISSUE-150 (§Segundo fallo), flag ledger, timing ledger del release `64c80f61d4a4`
(run `31530324227`), task file, runbook `operar-scanner-malware-assets.md` (paso 5 nuevo + troubleshooting).
`recover-scanner-403-quarantined-cvs.ts` generalizado a `scanner_auth_failed`/`scanner_unreachable`.
TASK-1378 sigue `in-progress` (no se cierra con el flag OFF en prod).

Nota histórica: la afirmación previa de este Handoff — "ambos caminos de credencial verificados por separado" —
era falsa: la prueba local usó la ADC del operador (que tiene `serviceAccountTokenCreator`), un camino que
Vercel no tiene. Detalle en ISSUE-150 §Prevención.

Servicio: **un solo `clamav`** en us-east4 (2 GiB, `min=1`, IAM-only, ≈USD 19/mes). Quedan dos postulaciones de
prueba identificadas (`PRUEBA TASK-1378 / NO CONTACTAR`) en el Hiring Desk para que HR las descarte.

### ISSUE-149 RESUELTA — drift TS↔DB de route_group_scope (2026-08-11)

El avatar vacío que reportó el operador tras TASK-1388 era drift de DATOS: 3 filas de
`greenhouse_core.roles.route_group_scope` (efeonce_admin/operations/hr_payroll) drifteadas del mapeo
TS que es solo fallback. Migration de paridad aplicada + verificada; las sesiones vivas se auto-sanaron
por el refresh de claims (5 min) sin re-login — verificado en la sesión real del operador. El fix del
trigger ⌘K (lenguaje topbar) salió en el mismo lote. Deuda señalada en la issue: 2 roles fantasma en DB
(`employee`, `finance_manager`) y falta un drift-guard mecánico TS↔DB de route groups.

### Campaña de vacantes en grupos de Facebook (2026-08-11)

Se difundieron los openings públicos `EO-OPN-0061` (Content Creator) y `EO-OPN-0009`
(Account Manager) en grupos ya unidos y afines. La expansión cerró con diez envíos adicionales por rol:
nueve visibles y uno enviado a moderación en cada caso. El detalle de copy, beneficios aprobados, grupos,
estados y decisión de publicar sin imágenes vive en
`docs/operations/hiring/2026-08-11-facebook-vacancy-distribution.md`. No cambió el runtime ni el estado
de Hiring, por lo que no requiere ADR. Pendiente operativo opcional: revisar las dos publicaciones en
moderación antes de contarlas como visibles.

### TASK-1688 — completar contacto de postulaciones Careers (2026-08-11)

`TASK-354` quedó cerrada y `TASK-355` ya estaba correctamente cerrada: la postulación de Hector Tolmo sí quedó en
Account; el Pipeline sólo seleccionaba Content por defecto. La auditoría descubrió aparte que teléfono/mensaje se
validaban pero no se persistían y que no existía país de residencia. `TASK-1688` gobierna el arreglo vertical:
ADR previo, migración aditiva, paridad Careers/Growth Forms y lectura autorizada en Application 360; prohíbe
inferir/backfillear datos históricos o exponer PII. No hay implementación ni migración aplicada aún.

### Proceso reusable — radar Wherex con CLI Playwright (2026-08-11)

Quedó canonizado para futuras solicitudes en la skill `greenhouse-public-private-tenders` y el manual
`docs/manual-de-uso/comercial/revisar-licitaciones-wherex-con-chrome.md`. `pnpm wherex:radar:setup` guarda
correo y clave sólo en `.auth/` con `0600`; `pnpm wherex:radar` usa un perfil Chrome aislado, revisa **Nueva** y
**Editando**, lee fichas y adjuntos, y genera el reporte protegido local. El dictamen exige además leer la
descripción/comentarios generales y el Centro de mensajes → Preguntas: presupuesto, alcance o condiciones pueden
vivir allí; no se infieren desde el título ni el brief. No participa, responde, carga,
presenta ni firma. Pendiente operativo: correr el setup una vez en una terminal interactiva y calibrar selectores
si Wherex cambió su interfaz. La continuidad de candidatas también quedó canonizada: los originales se archivan
en OneDrive `Alineación/4. Comercial/Licitaciones/<Comprador>/` sin URLs firmadas; empresa, deal y asociación se
verifican por MCP HubSpot y toda escritura requiere propuesta/confirmación, con la asociación confirmada una vez
que la empresa tiene ID. Caso real del 2026-08-11: Ajinomoto y CINTERMEX creados/verificados; Polpaico ya existía
y no se duplicó. Si el visor bloquea un guardado soportado, no se elude: se requiere una copia local verificable.
Para Ajinomoto LIC-962, el expediente `docs/commercial/tenders/ajinomoto-lic-962/research/` conserva la evidencia
de descripción, preguntas y mecanismo de postulación: servicio de 12 meses, cotización y presentación obligatorias
(20 MB), condiciones y aceptación final. Aún no se ingresó precio, adjuntó archivo, aceptó término ni envió oferta.
El runner ahora incluye `--tender-id <ID> --archive-originals <carpeta>` para archivar originales sólo cuando
Wherex emite una descarga nativa; si abre el visor protegido, informa `manual-save-required` sin extraer enlaces.
La primera ejecución real sigue bloqueada hasta completar el setup de la credencial aislada.
Para una sesión Chrome principal autorizada, se verificó el fallback visible y reversible: activar **Descargar archivos
PDF** en `chrome://settings/content/pdfDocuments`, descargar cada adjunto individualmente, validar el archivo local y
archivarlo en OneDrive; se restaura **Abrir archivos PDF en Chrome** para volver al visor. Caso Sika LIC-1120:
ambos PDF quedaron archivados y leídos en `Alineación/4. Comercial/Licitaciones/Sika/`; el brief y la estrategia
discrepan en duración (agosto–septiembre vs. septiembre–diciembre), por lo que no se debe cotizar duración sin
aclaración del comprador.
La mecánica reutilizable de postulación quedó además en la skill, el manual y la documentación funcional: servicio
→ condiciones/adjuntos → resumen/reconciliación → aceptación y envío sólo con confirmación humana final.

La oferta de Ajinomoto quedó redactada y renderizada en el mismo expediente: `oferta-tecnica.md`,
`oferta-economica.md`, `economica.json`, `deck-plan.json` y
`propuesta-economica-ajinomoto-lic-962.xlsx`. La presentación técnica de 11 láminas se validó y renderizó
localmente en `.captures/ajinomoto-lic-962/AJINOMOTO-LIC-962-TECHNICAL.pdf` (2,2 MB); no se cargó a Wherex.
La propuesta oferta S/ 7.000 mensuales sin IGV peruano (S/ 84.000 referenciales por 12 meses), cubre operación
remota de comunidad y deja audiovisual, diseño de alto volumen, presencialidad, pauta, premios y creadores
externos como adicionales. Antes de presentar, quedan cuatro gates concretos: validar identificador de marca,
asignar squad/capacidad y costeo cargado con Finanzas, confirmar documentación tributaria Chile–Perú y revisar la
definición de embajador activo/corte FY 2026. No suplir esos gates con una aceptación de términos ni con un envío.

### TASK-1685 CERRADA — un solo primitive de visibilidad del portal cliente; `ISSUE-148` resuelta (2026-08-10)

Cuarta task de navegación del mismo día, en `develop`, local-first, **sin push**. Decisión del Slice 1
delegada por el operador a `arch-architect` + overlay del repo: **(a′)** — el módulo autoriza, un
`revoke` per-persona cierra, y **el menú consume el mismo predicado que la puerta**
(`src/lib/client-portal/visibility/`, puro + adaptador server + contexto). Cuatro consumers, no dos:
page guard, lista base del menú, ⌘K y layouts de ruta.

**Medir cambió el diagnóstico dos veces, y por eso (a) literal no alcanzaba.** (1) La divergencia viva
eran **36 enlaces muertos** en la dirección *el menú promete y la puerta niega*, sobre **8 de 8**
usuarios cliente —incluidos los 3 reales de Sky Airlines— y **0** en la dirección que `ISSUE-148`
enfatizaba (el merge aditivo de TASK-1675 repone todo ítem de módulo). (2) La intención de los 9 denials
**estaba escrita** en sus migraciones: 6 son plomería anti-fallback que TASK-1678 dejó vestigial, 3 son
diferenciación per-rol que hoy no afecta a nadie. No hizo falta preguntarle a nadie.

**Hallazgo de ACCESO que la spec no tenía, y lo encontró el lint nuevo:** los layouts de `/proyectos`,
`/campanas`, `/sprints` y `/notifications` gateaban por el carril de rol, y sus rutas de detalle
(`[id]`, `[campaignId]`, `preferences`) **no tienen guard propio** — un cliente cuyo rol concedía la
vista pero cuya organización no tenía el módulo entraba al detalle por URL. Los cuatro pasan al guard
canónico.

Verificado contra PG: **24 pares contratados intactos** (nadie perdió nada), enlaces muertos **36 → 0**,
`revoke` cierra la puerta. Gates: `local:check`, `test:lint-rules` (21), suites focales 867. Sin
migraciones, sin flags — `user_view_overrides` está vacía, así que el delta de acceso es cero exacto.

**Continuidad:**
- **Rollout pendiente**: falta ejercitar las 9 rutas con las personas agente contra staging/producción
  (pasos 2-5 de §Production verification sequence). El código está completo y medido en local.
- La señal `identity.client_portal.menu_gate_divergence` queda en **warning con 2**, y es honesto:
  `cliente.ciclos` y `cliente.analytics` no las vende **ningún** módulo del catálogo, así que ninguna
  organización puede alcanzarlas. Antes eran enlaces muertos; no se perdió acceso. Decisión pendiente:
  venderlas en un módulo o retirarlas del catálogo y sus rutas.
- **`TASK-1687` creada**: `/creative-hub` no existe y el bundle de SKY lo declara. Separada a propósito
  (catálogo comercial ≠ semántica de autorización). **Nunca** quitarle el módulo a SKY.
- **`TASK-286` desbloqueada con premisa nueva**: sembrar grants por rol para una vista `cliente.*` ya
  no produce acceso; el carril es declararla en el módulo que la vende. Delta escrito allá.
- Sigue abierto el bloque legacy de capability modules (`capability-modules-resolver-migration`, sin
  ID): sus dos callsites quedaron con marker y dueño declarado.

### TASK-1389 CERRADA — el candado anti-regresión de la navegación quedó armado (2026-08-10)

Tercera task del programa de navegación cerrada el mismo día: Contrato de Asignación de Superficies
(`agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md` + pointer en CLAUDE.md al límite del
budget — quedan ~45 tokens de headroom — + campo `Nav placement` en el addendum UI) y gate
`pnpm nav:budget` que mide el árbol REAL (evaluador puro + harness superadmin, cero drift de parser)
contra el presupuesto medido (8 slots · profundidad 2 · zonas-solo-raíz · cero `/my/*` derivado del
builder) + cross-check `surface` del manifest. **Nació directo en `error` con 0 violaciones**
(la condición warn→error de la spec quedó cumplida por TASK-1388/1686 el mismo día; `--warn` es el
escape documentado). Doble cobertura CI: test en la suite + job `nav-budget` en design-contract.yml.
Continuidad: el tope del carril cliente/collaborator se calibra en su follow-up (module-driven — el
insumo sería el resolver, no este evaluador); considerar extender el contrato a la topbar.

### TASK-1686 CERRADA — el colaborador puro tiene su propia proyección (2026-08-10)

Implementada el mismo día que su antecesora TASK-1388, en `develop` (4 slices, local): predicado
`isPureCollaborator` en rail y avatar — el colaborador ve SOLO su portal (rail `/my` + Mi Ficha +
plataforma concedida; avatar identidad + Mi Perfil + salir), se cerraron los shortcuts cliente sin
gating, el heading "Mi Cuenta" vacío y el borde de claims vacíos; el trigger del avatar es un botón
semántico cross-audiencia. my+client/client/internal byte-equivalentes fijado por tests de control
(19+7). Gates TODOS verdes (suite full 10.460, build prod, 4 gates UI con scorecard 5.0,
reachability 0 orphans); GVC con `agent-collaborator` + baselines durables promovidos. Continuidad:
TASK-1685 hereda TRES consumers del predicado de visibilidad (Delta escrito allá); la deuda
`aria-expanded` del chrome @menu sigue siendo la única abierta (dueña: scorecard TASK-1388).

**Barrido documental post-cierre (3 subagentes, mismo día):** 29 docs/skills sincronizados con la
navegación nueva — 7 de arquitectura (status de `GREENHOUSE_SIDEBAR_ARCHITECTURE_V1` superseded,
Identity Access §Sidebar Composition reescrita, deep-link §palette, invariantes de shortcuts), 21
funcionales/manuales (todas las rutas de menú "Growth top-level"/"Personas y HR"/"Mi Ficha en
sidebar" → estructura vigente, con version bump), la skill `info-architecture`, manual NUEVO
`docs/manual-de-uso/plataforma/navegar-el-portal.md` (las 3 superficies — el ⌘K no tenía doc en
ninguna parte) y `src/data/searchData.ts` borrado (huérfano sin consumers tras retirar NavSearch;
typecheck verde). Pendiente decidible: `roadmap-cockpit.md` internamente inconsistente (pre-existente
a estas tasks — su ítem de menú se retiró el 2026-07-15 y el paso a paso aún lo cita).
