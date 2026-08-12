# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

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

Se creó [`docs/commercial/tenders/sika-lic-1120/`](docs/commercial/tenders/sika-lic-1120/): originales en OneDrive, evidencia Wherex, admisibilidad, blueprint interno, técnica, estructura económica y deck de taller. La propuesta se enfoca en continuidad comercial: Search por intención y ubicación → landing/ficha de destino → canal de atención → medición y optimización; **no** promete transferir 50% de ventas. El deck técnico de ocho láminas pasó slots y revisión visual local, pero sigue siendo taller (sin `Proposal`/render gobernado). La pregunta propia continúa en **0/1 respondidas** al 12-08 11:14: faltan fecha/destino/stock por cierre, línea base/fuente de ventas y canal autorizado. El precio recomendado para aprobación es MXN 150.000 antes de impuestos, incluido medio, pero está sólo en `pricing-brief-INTERNO.md`; no existe cotización aprobada. Wherex muestra 45 días, pero también condiciona el crédito a lo convenido con Sika: no asumirlo como término cerrado. La oferta Wherex sigue en edición, sin adjuntos, términos aceptados ni envío; tab queda en handoff.

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

### TASK-1388 CERRADA — la navegación interna repartida en sus 3 superficies (2026-08-10)

Implementación completa en `develop`, autorizada a cierre total por el operador ("termina todo lo que
falta"): rail interno en 3 zonas (Operación · Administración · Recursos, acordeón nativo), `/my/*`
rehomed al avatar (builder canónico `src/lib/navigation/my-nav-items.ts`), ⌘K único
(`GlobalCommandPalette` sobre la `CommandPalette` de TASK-696, con filtro de audiencia — la
`NavSearch` retirada exponía el registry completo), dedup + legacy borrado + los 4 fixes a11y de
TASK-1675. Cero cambios de rutas/gating (test de identidad interno + no-interno). Gates TODOS verdes
incluido `pnpm build` de producción y `pnpm test` full (10.447); baselines GVC durables promovidos
(`scripts/frontend/baselines/task-1388-*`); scorecard 4.93. `UI ready: yes` con sign-off del operador.

**Continuidad para quien siga:** (1) `TASK-1389` quedó desbloqueada — el sidebar está bajo el tope,
su gate `nav:budget` es promovible a `error` (Delta escrito allá); (2) card-sort formal de nombres de
zonas queda como validación posterior NO bloqueante (rename = 1 línea en `GH_INTERNAL_NAV`); (3) gap
conocido del chrome: `@menu` no expone `aria-expanded` en triggers de submenú (intocable; estado
canónico = clase `ts-open`, documentado en el scorecard) — decidir como deuda de chrome aparte;
(4) la rama no-interna del menú quedó con punto de extensión limpio para `TASK-1685` (Delta escrito).

### Cerrada — la decisión pendiente del portal cliente y las lecciones de la sesión del 2026-08-09

**La decisión ya se tomó** (`TASK-1685`, entrada de arriba): opción (a′). La parada de esa sesión
cumplió su propósito — decidir con cabeza fresca y midiendo — y el "no lo resuelvas con un `AND` en la
puerta" se confirmó correcto: habría cerrado 6 pares contratados sin arreglar ninguno de los 36 enlaces
muertos que eran el defecto real.

**Lo que sigue siendo continuidad activa de esa sesión:**

- `TASK-1684` — la postura de `AGENT_AUTH_ALLOW_PRODUCTION`, seteada desde ~90 días. Sigue abierta.
- `TASK-1687` — `/creative-hub` no existe y el bundle de SKY lo declara; señal en 1.
- **Una nota de este archivo no es evidencia.** Es la lección que produjo los tres errores de esa
  sesión (afirmar sin verificar): el 403 "por diseño" de `agent-session` salió de una nota de acá y era
  falso. Verificar contra runtime o PG antes de construir encima.

### Barrido documental post-release: tres auditorías paralelas y dos defectos vivos (2026-08-09)

Tres subagentes auditaron arquitectura, docs funcionales/manuales y skills. Encontraron cosas que el
trabajo de código no había visto.

**Lo que necesita quien siga:**

1. 🔴 **El §0 Status del doc de contrato del portal cliente estaba INVERTIDO** y lo estuvo tres meses:
   decía "NO existe `src/lib/client-portal/`", "NO existe `/api/client-portal/`", "NO existe schema
   `greenhouse_client_portal`" y "NO existe modelo de módulos on-demand". Las cuatro se implementaron
   entre `TASK-824` y `TASK-828`. Es lo primero que lee un agente que abre ese doc, así que lo mandaba
   a construir de cero lo que ya existía — el carril paralelo que el spec vino a evitar. Corregido y
   verificado contra filesystem y PG. **Lección:** un bloque "estado actual del repo" escrito cuando un
   spec era propuesta se vuelve activamente peligroso si nadie lo da vuelta al implementarlo.
2. ⚠️ **`/creative-hub` NO EXISTE y Sky Airlines ve el enlace.** Lo causé hoy: el bundle
   `creative_hub_globe_v1` declara `cliente.creative_hub` → `/creative-hub`, y esa página nunca se
   materializó. El defecto era latente desde el seed de `TASK-824`; **lo activó el assignment**, no un
   deploy. Señal nueva `identity.client_portal.assigned_view_without_route` (warning, hoy en **1**).
   Decidir: materializar la página o retirar el viewCode del bundle — **NUNCA** quitarle el módulo a
   SKY, eso le saca superficies que sí funcionan.
3. **`route-reachability-gate` sólo cubre una dirección.** Verifica página → enlace ("0 huérfanas") y
   NO enlace → página, así que el enlace muerto pasa. Y no lo podría atrapar de todos modos: la
   condición la crea un **assignment**, o sea un cambio de dato. Por eso el complemento es una señal y
   no un test. Además hay **10 viewCodes cliente** apuntando a rutas no materializadas, y eso es
   legítimo por diseño (regla vigente: declarar el `routePath` canónico aunque la página sea
   forward-looking) — el riesgo aparece al asignarlos.
4. **El menú del cliente puede prometer de más.** La lista base de 6 enlaces (Proyectos, Ciclos,
   Equipo, Revisiones, Analytics, Campañas) se sigue mostrando **por rol**, no por módulo. No es fuga
   de acceso —la puerta decide por módulo— pero ahora que las páginas dicen la verdad, es la confusión
   de soporte más probable: enlace visible + empty state al entrar. Quitar el permiso al rol apagaría
   enlaces legítimos de otros clientes, así que no es el fix.
5. **`pnpm skills:mirrors` sólo valida 3 skills del manifest** (`efeonce-mcp-platform`,
   `greenhouse-globe`, `greenhouse-globe-model-fleet`). NO cubre `qa-release-auditor` ni
   `documentation-governor`: su paridad Claude↔Codex se verificó a mano. Si agregas una skill espejada,
   no asumas que el gate la cuida.
6. **`CLAUDE.md` está en 34.903/35.000 tokens — 97 de headroom.** Los cinco aprendizajes de proceso de
   hoy se escribieron en su skill dueña y en `AGENTS.md`, no ahí, a propósito.

### Barrido final de docs (2026-08-09) — tres cosas que necesitan tu decisión

Un barrido de cierre corrigió lo que el trabajo del día dejó stale, **incluidas dos contradicciones en
docs que yo mismo edité hoy** (el inventario del carril seguía diciendo que el lint estaba en `warn`, y
el ledger de flags listaba `NODE_ENV` en la columna de runtime mientras su descripción decía
`VERCEL_ENV`). Ambas corregidas. Y el conteo "3 abren, 6 empty state" **dejó de ser un dato del doc**:
cambió el mismo día al asignarle Creative a SKY, así que ahora el inventario declara la regla —
derivarlo de los datos, nunca heredarlo de un doc.

Lo que **NO** decidí por ti:

1. **`TASK-286` (client view catalog expansion) tiene la premisa vencida**: dice "11 view codes" y hoy
   hay 25, y su alcance se solapa con `TASK-1685`. Reescribirla o cerrarla es tu llamada.
2. **`TASK-1675`/`1678`/`1679`/`1680`/`1685` declaran `Epic: none`** aunque son el carril de
   `EPIC-015`. Consecuencia mecánica: `epic-child-parity` las excluye del denominador, así que el
   avance del epic se ve más chico de lo que es. Reasignarlas es trivial pero cambia métricas.
3. **`/api/client-portal/*` no está en `GREENHOUSE_API_REFERENCE_V1.md`.** Documentarlo ahí depende de
   si esa referencia pretende ser exhaustiva o sólo cubrir las lanes de plataforma.

### Release 2026-08-09 (2.º del día) — el carril del portal cliente cerrado y VERIFICADO EN PRODUCCIÓN

Manifest `ee0d568b8614-1ff03476-6a82-4e03-8dfc-2d49e3c30ce3` en `released`, run `31343569815`, target
`ee0d568b86140d92224f9fdcad75cd6e1a6dcae4`, PR #186. Watchdog `drift_count=0`. **Sin bypass**: el batch
policy dio `ship` (cero migraciones).

**Lo que necesita quien siga:**

1. ✅ **La verificación que dos releases dejaron pendiente está HECHA, en producción.** 9 rutas × 3
   personas con sesión real contra `greenhouse.efeoncepro.com`: las 3 base sirven `200`, las 6
   module-gated redirigen a `/home?denied=<slug>`, cero `?error=resolver_unavailable`, y `/proyectos`
   sirve `200` al operador interno donde antes daba `/401`.
2. 🔴 **`agent-session` SÍ funciona en producción — y yo dije lo contrario toda la sesión.**
   `AGENT_AUTH_ALLOW_PRODUCTION` está seteada en Production desde hace ~90 días. Lo repetí tomándolo de
   una nota de este mismo Handoff, sin verificarlo, y por eso declaré como "pendiente del operador" una
   verificación que podía hacer yo. **La regla: una afirmación sobre runtime se verifica contra el
   runtime.** Postura de seguridad abierta en `TASK-1684` (P2): la credencial de las personas agente
   vive escrita en `CLAUDE.md`, así que endpoint + credencial documentada alcanzan para operar
   producción como superadmin.
3. **`vercel redeploy` NO arregla un staging `Canceled` por docs-only** — el gotcha #7 lo recomienda y
   es un consejo incompleto: el redeploy reevalúa el mismo diff y cancela otra vez. La salida es tocar
   un doc del set `deployControlDocs` de `vercel-ignore-build.mjs` (no cuenta como docs-only y fuerza
   el build); si de todos modos hay que documentar el release, ese commit produce la evidencia como
   efecto. Documentado en runbook + ambas skills como gotcha #11.
4. **El context gate va ÚLTIMO y `docs:closure-check` NO lo reemplaza.** Dejé un run rojo en `develop`
   (`31340366010`) por correr context-check, después agregar una entrada al changelog, y commitear con
   closure-check verde. Orden seguro: ediciones documentales → closure-check → context-rotate si hace
   falta → context-check:strict → commit.
5. **Contraste útil entre los dos releases de hoy:** el de la mañana necesitó bypass del batch policy y
   el de la tarde no. La diferencia fue **cero migraciones**, no el tamaño del batch.
