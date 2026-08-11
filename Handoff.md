# Handoff activo

### TASK-1378 — RELEASE HECHO + diagnóstico VERDE en producción; falta SOLO el flip del flag (operador) (2026-08-11 23:15Z)

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

### Verificación en staging del portal cliente, y dos defectos que salieron de ella (2026-08-09)

Recorrí las 9 rutas × 3 personas con sesión de agente real contra **staging** (producción no acepta
agent-session por diseño). El fix de `TASK-1679` quedó confirmado en runtime desplegado: las 3 base
sirven `200`, las 6 module-gated redirigen a `/home?denied=<slug>` con el slug user-facing correcto, y
**cero** `?error=resolver_unavailable` — que era el síntoma de las nueve.

**Lo que necesita quien siga:**

1. ⚠️ **PRODUCCIÓN HOY: `/proyectos` devuelve `/401` al operador interno.** Arreglado en `develop`,
   **no promovido**. Si soporte reporta que no puede abrir Proyectos de un cliente, es esto y está
   conocido. Clasificado `MENOR` por el árbol §7 del runbook: es fail-closed **de más** (niega acceso
   que debería conceder), no expone dato de nadie, y las otras 8 páginas cliente abren normal. Va en
   el próximo release — que incluya este commit no es opcional.
2. **La causa era un gate legacy por route group ENCIMA del guard canónico**, y `/proyectos` era la
   única de las 9 que lo conservaba, con el comentario de al lado diciendo que el canónico ya lo
   reemplazaba. Corría primero, así que ganaba, y el `route_group_scope` del operador interno
   (`admin, commercial, internal, my`) no incluye `client`. Migración incompleta de `TASK-827`,
   invisible en review porque las dos líneas se leen como defensa en profundidad. Fijado por
   `src/lib/client-portal/guards/no-route-group-gate-above-view-code-guard.test.ts`, que barre las 9
   páginas.
3. 🔴 **El override de organización usaba `NODE_ENV` y por eso era solo-local.** Vercel compila
   **todos** los deployments con `NODE_ENV=production`, así que mi bloqueo apagaba el flag también en
   staging. El discriminador canónico del repo es **`VERCEL_ENV`** — mismo que
   `src/app/api/auth/agent-session/route.ts` y `src/proxy.ts`; staging reporta `preview`, verificado
   contra el runtime. Corregido. **Regla:** para distinguir staging de producción en este repo,
   `VERCEL_ENV`, nunca `NODE_ENV`.
4. **El override NO tiene válvula de escape de producción, y la divergencia con `agent-session` es
   deliberada.** Ese endpoint admite `AGENT_AUTH_ALLOW_PRODUCTION`; éste no, porque concede lectura
   **cross-tenant** del portal de cualquier organización con una credencial documentada en
   `CLAUDE.md`. Hay un test que detiene a quien agregue una.
5. **Sigue sin verificar en navegador: las 4 páginas Creative de SKY.** No hay persona cliente de SKY
   y sus usuarios son personas reales. Con el fix de `VERCEL_ENV` ya se puede hacer prendiendo el flag
   en staging (`vercel env add` + redeploy, porque Vercel congela las env vars al build). El resolver
   sí está verificado contra la base que lee producción: 36 combinaciones, 0 desvíos.

### Cierre del carril de acceso del portal cliente — las 3 piezas post-release (2026-08-09)

**Lo que necesita quien siga:**

1. **Sky Airlines ya tiene `creative_hub_globe_v1`** (assignment
   `cpma-ec0041f7-e416-442f-acab-73f645c06f56`, vía `enableClientPortalModule`, audit row `enabled`).
   Sus 3 usuarios activos ahora ven `/proyectos`, `/campanas`, `/equipo`, `/reviews`, más
   `cliente.pulse`, `cliente.creative_hub` y 4 capabilities de lectura — el bundle otorga más que las
   4 páginas y eso quedó escrito en `scripts/client-portal/assign-creative-hub-to-sky.ts`. **Si hay
   que revertirlo, es `pause`/`expire`, nunca DELETE.**
2. 🔴 **Un gate cuya expectativa está hardcodeada no prueba el motor: prueba que el primer consumidor
   sigue igual.** `client-portal-page-access-check.ts` fijaba "3 abren y 6 empty state" y al asignarle
   el módulo a SKY reportó 4 desvíos por hacer lo correcto — la salida fácil habría sido editar los
   esperados. Ahora deriva la expectativa de los datos (base ∪ módulos vigentes de esa org) y
   sobrevive a cualquier assignment. Vale el patrón para cualquier gate nuevo.
3. **`TASK-1680` cerrada, y su hallazgo transferible:** el override block del lint tenía 6 entradas y
   **4 eximían paths que la regla nunca miró** (`isUiFile` excluye `src/app/api/**` y sólo evalúa
   `src/(components|views|app)/**`). Antes de agregar un path a un override, comprobá que la regla
   realmente lo mire — si no, la exención no protege nada y esconde cuál es la real.
4. **Queda UNA exención viva:** `VerticalMenu.tsx` (2 violaciones, el bloque
   `resolveCapabilityModules`). Su dueño de retiro es el follow-up
   `capability-modules-resolver-migration`, todavía **sin ID** desde mayo de 2026. Cuando ese trabajo
   migre el bloque al resolver, el override block desaparece completo.
5. **`cliente.ciclos` y `cliente.analytics` siguen sin módulo que las declare** — deuda rastreada en
   `PENDING_MODULE_DECLARATION_VIEW_CODES` (`view-codes/parity.ts`), no allowlisteada en silencio.
   Decidir en qué módulo van es lo único que las hace alcanzables.
6. **Sigue pendiente el smoke con sesión cliente REAL en producción**, de este release y del de
   `TASK-1675`. El endpoint de agent-session da 403 en prod por diseño, así que es manual. Dos
   releases con la misma casilla sin marcar.

### Release 2026-08-09 — el carril de acceso del portal cliente está EN PRODUCCIÓN

`TASK-1678` + `TASK-1679` cerradas y promovidas. Manifest
`2c87d71e2eca-f444748c-92aa-484c-b118-02713ee63e06` en `released`, run `31335921151`, target
`2c87d71e2ecab15441a87bd35b6d42753f0aaef7`, PR #185. Watchdog `drift_count=0`.

**Lo que necesita quien siga:**

1. 🔴 **El marker `[release-coupled:]` NO resuelve `requires_break_glass`.** Leído el classifier: el
   marker sólo limpia `split_batch` (`findUncoupledIndependentSensitiveDomains`);
   `requires_break_glass` lo dispara `hasIrreversibleDomain()` y su única salida es
   `bypass_preflight_reason`. Ningún runbook lo decía, y el instinto de "pongo el marker como la vez
   pasada" te hace perder un run. Si el classifier dice `requires_break_glass`, el marker es
   cargo-cult.
2. **Hay UNA sola instancia Cloud SQL (`greenhouse-pg-dev`).** Producción, staging y local leen la
   misma base — verificado con `gcloud sql instances list`. Consecuencia práctica: una migración
   aplicada en "dev" YA está aplicada para producción. Las 2 de este release lo estaban antes del
   deploy, así que su dominio `db_migrations` era reconciliación de archivos, no cambio pendiente. Eso
   se puede citar en la razón del bypass porque es verificable en `pgmigrations`.
3. **Pendiente comercial, no técnico:** asignar `creative_hub_globe_v1` a **Sky Airlines** es lo único
   que abre las 4 páginas Creative del portal (`/proyectos`, `/campanas`, `/equipo`, `/reviews`). El
   operador declaró que Creative es de SKY y de nadie más. Hoy esas 4 muestran el empty state correcto.
   `cliente.ciclos` y `cliente.analytics` están en la misma situación, rastreadas en
   `PENDING_MODULE_DECLARATION_VIEW_CODES`.
4. **`platform.release.bypass_preflight` está en el catálogo sin grant en `runtime.ts`** — el workflow
   sólo valida los ≥20 caracteres, así que la capability es hoy gobernanza sobre el humano, no un gate
   mecánico. Candidato a task.
5. **Bug de tooling:** `pnpm docs:context-rotate --apply` archivó la sección que contenía
   `> Historial rotado: [Handoff.archive.md]` y el gate estricto la exige — la rotación dejó su propio
   gate rojo. Restaurada a mano; el script debería preservar esa línea.


### TASK-1679 — las 9 páginas del portal cliente dejaron de mentir (cierra ISSUE-146)

Code complete en `develop`, **rollout pendiente**. Va DESPUÉS de `TASK-1678` en la promoción.

**Lo que necesita quien siga:**

1. 🔴 **Corregir el guard NO abre las 9, y la spec decía que sí.** Los módulos que declaran
   `cliente.proyectos`/`campanas`/`equipo`/`reviews` son `creative_hub_globe_v1` y `equipo_asignado`, y
   **ninguna organización los tiene asignados** — `module_assignments` tiene 7 filas en toda su
   historia. Estado medido contra las 4 orgs reales: **3 abren** (las base) y **6 empty state**.
   Abrirlas es un assignment de módulo, o sea decisión comercial. El operador declaró que **Creative es
   de Sky Airlines y de nadie más**, así que el candidato es asignarle `creative_hub_globe_v1` a SKY.
2. **La lección transferible: contar lo que el catálogo declara no es contar lo que los datos
   permiten.** El inventario estimó "3 páginas" leyendo `modules.view_codes` sin cruzar contra
   `module_assignments`. Vale para cualquier medición futura sobre este carril.
3. **`redirect()` de Next señaliza lanzando.** Si tocas `requireViewCodeAccess`, el `redirect()` del
   camino `denied` tiene que quedar FUERA del `try`; adentro, el `catch` se lo come y toda denegación
   sale como falla del resolver. Hay un test que lo fija con un throw etiquetado igual que Next.
4. **La llave se resuelve en UN lugar:** `resolveClientPortalOrganizationId`. No leer
   `session.user.organizationId` directo en un callsite nuevo — el override de la persona de
   verificación se aplica ahí, y si el menú y el guard resolvieran distinto, el operador vería un menú
   que no corresponde a lo que puede entrar.
5. **Flag `CLIENT_PORTAL_AGENT_ORG_OVERRIDE_ENABLED`, default-OFF, inerte en producción por diseño**
   (el helper bloquea con `NODE_ENV === 'production'`, sin variable de escape). Para cambiar de
   organización en local/staging: prender el flag + cookie `gh_agent_org_override` o env
   `CLIENT_PORTAL_AGENT_ORG_OVERRIDE`. Riesgo declarado y aceptado por el operador: con el flag ON, la
   credencial documentada de la persona agente lee el portal de cualquier organización.
6. **`agent-client@greenhouse.efeonce.org` ya sirve:** tenía `organization_id` NULL y ahora resuelve a
   Greenhouse Demo (0 módulos), o sea es la persona canónica del caso empty state. Berel se verifica
   con `agent-berel-client`.
7. **Verificación reproducible:** `scripts/identity/client-portal-page-access-check.ts` declara el
   resultado esperado por ruta ANTES de correr y sale con exit 1 si algo difiere. 4 orgs × 9 rutas,
   0 desvíos. Repetir contra producción antes de cerrar.
8. **Deuda rastreada, no allowlisteada en silencio:** `cliente.ciclos` y `cliente.analytics` siguen
   sin módulo que las declare y viven en `PENDING_MODULE_DECLARATION_VIEW_CODES`
   (`view-codes/parity.ts`). Están exentas del parity test sólo para no dejarlo rojo por deuda
   preexistente; la salida correcta es declararlas en su módulo y sacarlas de ahí.


### TASK-1678 — el carril rol→vista del portal cliente ya falla hacia cerrado (cierra ISSUE-147)

Code complete en `develop`, **rollout pendiente** (no está en `main`). Invierte el fail-open de
`resolveAuthorizedViewsForUser` para el routeGroup `client`.

**Lo que necesita quien siga:**

1. 🔴 **`TASK-1679` va después de ésta, y ahora el orden es verificable:** hoy el fail-open estaba
   contenido por el fail-closed del guard de cada página. Esta task quitó el fail-open; la 1679 quita
   la contención. Antes de promover 1679, confirmar que el manifest de release con 1678 ya está en
   `main`.
2. **Sin esto, degradar hacia cerrado abría todo.** `hasAuthorizedViewCode` hace
   `if (authorizedViews.length === 0) return fallback`, y los layouts cliente pasan
   `fallback: routeGroups.includes('client')` = `true`. Devolver `[]` para un cliente degradado
   —que es lo que la spec pedía— **crea** el estado que ese fallback traduce a "mostrar todo". Si
   alguien toca `src/lib/tenant/authorization.ts`, `resolveEmptyClaimFallback` es load-bearing y
   discrimina por `tenantType`, no por el prefijo `cliente.` del viewCode.
3. **El portal interno conserva su default permisivo a propósito**, en las tres capas (fallback de
   rol, degradación de `SCHEMA_NOT_READY`, amplificador). Cambiarlo convierte un fail-open del portal
   cliente en una caída de disponibilidad interna. Hay tests de no-regresión que lo fijan.
4. **Dos supuestos de `ISSUE-147` eran falsos y conviene no heredarlos:** `role_view_assignments` no
   tiene columnas de vigencia (el predicado se extrapoló de `user_role_assignments`), y el "punto 5"
   del fix era requisito, no limpieza. El hueco de vigencia real era el merge de `toRegistryRows`.
5. **Los denials de rol NO vencen sobre grants de otro rol, y es decisión medida.** Los 9 denials
   cliente no protegen nada que la unión no proteja ya. El veto per-usuario es
   `user_view_overrides` con `override_type='revoke'`. Rationale en
   `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` §8.2 → Delta TASK-1678. Hay un test que
   detiene a quien lo invierta.
6. **Verificación de runtime ya hecha en local, no en prod:**
   `pnpm tsx scripts/identity/client-view-rail-persona-check.ts` (contra PG vía proxy) da verde para
   las tres personas agente — cliente 22 viewCodes todos con grant explícito, interno 15 y 117 sin
   regresión. Repetirlo en staging/prod antes de promover.
7. **El SQL de la señal se corrigió DOS veces por ejercitarlo contra PG antes de cablearlo:**
   `greenhouse_core.roles` no tiene columna `active`, y `'client' = ANY(route_group_scope)` arrastra
   roles internos con scope de soporte. El discriminador correcto es `tenant_type = 'client'`.
8. **Drift TS↔DB detectado de paso, sin cerrar:** `greenhouse_core.roles` tiene `employee` y
   `finance_manager`, que no existen en los 14 `ROLE_CODES` canónicos de `src/config/role-codes.ts`.
   No lo toqué porque está fuera de alcance, pero contradice el snapshot de roles de `CLAUDE.md`.


### TASK-1677 — el cutover SEO está CERRADO (código y datos)

Completa y verificada en producción el 2026-08-09. `ISSUE-143` cerrada del todo.

- El Slice 1 (código, `SEO_MODULE_KEYS_READ = ['seo_v2']`) viajó en el release `49f86c98cda6`; la
  migración `20260809163352129` se aplicó **después**, con canary del provider verde antes y después.
- Estado final: 0 assignments `seo_v1` vigentes, 2 superseded por `effective_to` con su historia
  intacta, 2 `seo_v2` `active` — nadie perdió cobertura. La fila `seo_v1` sigue en `modules`
  (append-only).
- La verificación fue con el canary contra producción, **no con un `SELECT`** — ése fue el método que
  falló en el incidente original.
- **Aprendizaje para el próximo expand/contract:** no cabe en un solo release por construcción. El
  check `postgres_migrations` bloquea una migración pendiente, y aplicarla antes del deploy es lo que
  el ordering prohíbe. Dos ciclos no es burocracia: es el punto de verificación entre código y datos.


### TASK-1676 — el gate de release dejó de aprobar sin mirar (cierra ISSUE-145)

Cerrada en `develop`. El `release_batch_policy` comparaba contra `origin/main` y el orquestador lo
corre con el `target_sha` ya mergeado: rango vacío, `ship` silencioso. Ahora ancla al `target_sha`
del último manifest `released`.

**Lo que necesita quien siga:**

1. ✅ **Promovido el 2026-08-09** en el release `49f86c98cda6` (run `31316320616`), manifest
   `released`. **Y el criterio de aceptación quedó verificado en producción, no en local:** el
   `preflight-result.json` de ese run pasó de `filesChanged=0, domains={}` a **47 archivos** con
   `diffBase=0791a89cd01f`, `diffBaseSource=last_released_manifest` y `diffBaseReleaseId`. El gate
   evaluó de verdad el release que lo contiene.
   Se promovió en DOS releases separados a propósito: `--override-batch-policy` degrada el check
   ENTERO a warning, así que el bypass debía caer sobre el batch más chico. R1 (portal cliente) pasó
   **sin bypass**; sólo R2 lo necesitó.
2. **Un `filesChanged=0` ya no es aprobación: es `unknown`.** Si lo ves, o el target coincide con el
   último release desplegado, o la base no se pudo resolver. El summary dice contra qué base comparó y
   de qué release id salió — el artefacto por fin es auditable.
3. **El marker `[release-coupled: …]` cambió de formato y ahora es estricto.** Tiene que ABRIR una
   línea del cuerpo del squash, y se lee SÓLO de ese commit. Un marker a mitad de línea ya no cuenta.
   Antes bastaba mencionarlo en cualquier commit del rango — y una cita en prosa neutralizaba
   `split_batch` para un batch entero. **Estrenado en su propio release** (`49f86c98cda6`) y funcionó:
   neutralizó el `split_batch` de `auth_access + cloud_release`. Dato útil para la próxima vez: ese
   `auth_access` eran CINCO COMENTARIOS renombrando `seo_v1`→`seo_v2` — **el classifier clasifica por
   path, no por contenido del diff**, así que antes de partir un batch conviene mirar si el dominio
   "sensible" sólo cambió prosa.
4. **Open Question viva, y es de proceso, no de código:** el classifier marca `requires_break_glass`
   ante UN SOLO dominio irreversible, sin mezcla. La matriz del runbook §2.2 considera legítimo un
   release de migración acoplado a su consumer. Con el gate arreglado eso deja de ser teórico: todo
   release que toque `src/lib/release/**`, `migrations/` o `.github/workflows/` va a pedir break-glass.
   O se relaja la severidad, o se endurece la matriz.
5. **`pnpm release:workers`** reemplaza el `gcloud run services describe` crudo del runbook §4.1 (el
   que crasheaba con `TransformFilter()`). Si falla por flags, cambió la herramienta: se corrige el
   wrapper, no cada bloque de doc.
6. La lista forense de `ignored-pending-runs.ts` quedó **vacía**: el run 31126022507 se verificó por
   API como `cancelled`.


### TASK-1675 — el menú del portal cliente ya compone sus módulos (EN PRODUCCIÓN)

Cerrada en `develop`. El menú del cliente leía `authorizedViews` mientras el gate de cada page leía
`module_assignments`: un módulo contratado funcionaba y era inalcanzable salvo escribiendo la URL.
Ahora el layout resuelve per-org server-side y `VerticalMenu` hace merge **aditivo**.

**Lo que necesita quien siga:**

1. ✅ **Promovido el 2026-08-09** en el release `0791a89cd01f` (run `31313368159`), manifest
   `released`, watchdog `drift_count=0`. **Queda una verificación que NO se pudo automatizar:** las
   tres sesiones en producción —cliente de Berel (debe ver `SEO`), cliente sin el módulo (no debe
   verlo, menú intacto) y colaborador interno (menú intacto)—. El endpoint de agent-session devuelve
   403 en producción por diseño, así que esto es manual. Confirmar también que no haya filas
   `view_registry.active=false, updated_by='system'` para los viewCodes SEO.
2. **Si tocas `VerticalMenu.tsx`, el merge aditivo es load-bearing.** La rama `!isInternalPortalUser`
   es la rama **no-interno**: los colaboradores puros caen ahí, así que reemplazar la lista base los
   deja sin menú. Hay un test de identidad que lo fija (`VerticalMenu.test.tsx`, el primer test que
   ese componente tiene). `TASK-1388` toca el mismo archivo y rebasa sobre esto.
3. **Cuatro hallazgos de accesibilidad del chrome quedaron medidos y sin arreglar**, a propósito:
   ningún ítem del menú muestra anillo de foco al tabular, la región scrollable del drawer no es
   alcanzable por teclado, el toggle es un `<i>` sin role, y el panel desborda 8px. Son globales y
   preexistentes — el escenario GVC negativo es el control que lo prueba, porque su probe parte de un
   ítem base de siempre y da el mismo resultado. Están registrados en los manifests, con los flags
   relajados y el motivo escrito inline. Dueño: `client-portal-menu-focus-ring` (chip abierto).
4. **Trampas de herramienta que cuestan una hora si no las sabes:** `pnpm fe:capture:review` corre
   contra **staging** por default, produce 0 frames aun con `--env=local`, y su
   `ensureStorageStateFresh` **pisa el storageState de la persona declarada** con el del agente
   interno — la assertion falla después con un diagnóstico engañoso. Usar `pnpm fe:capture` directo y
   regenerar la persona antes. Y promover baselines de un escenario multi-variante exige promover
   **cada subdirectorio de variante por separado**.
