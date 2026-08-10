# Handoff activo

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

### Releases del 2026-08-08/09 — `ISSUE-114` cerrada y batch SEO en producción

`main` = `e048ef3a4` (batch SEO). Antes, `b99b7ad97` (fix de `ISSUE-114`). Ambos manifiestos
`released`; **watchdog `aggregateSeverity: ok`**, tres señales en cero, y los 4 workers de Cloud Run
en `Ready=True` sirviendo `e048ef3a47e9` — ni siquiera el residual change-gated habitual del
`ops-worker`.

**Lo que necesita quien siga:**

1. **`ISSUE-114` resuelta: el batch policy computaba el diff sobre una base congelada.** Usaba
   three-dot (`origin/main...target`), que parte de la merge-base que el squash-merge deja vieja, y
   resucitaba archivos byte-idénticos a producción como cambios del release. Ahora es two-dot vía
   `buildReleaseDiffRange`. **Si el classifier reporta un dominio irreversible, ahora es REAL** — no
   lo tapes con `[release-coupled: …]` por costumbre, como venía pasando en los 4 releases previos.
2. **`ISSUE-145` (ALTA) — léela antes del próximo release.** El batch policy del **orquestador** es
   decorativo: corre con el `target_sha` ya mergeado, ve un rango vacío y aprueba sin mirar nada
   (verificado en los `preflight-result.json` de 3 releases; uno con 1045 archivos y 14 migraciones
   reportó `filesChanged=0`). Y el marker `[release-coupled: …]` nunca se lee donde el runbook dice,
   **pero se dispara solo con prosa**: una cita en un commit de docs de growth/MCP neutralizó
   `split_batch` para todo un batch. El ancla correcta es el `target_sha` del release anterior.
3. **`ISSUE-144`** — `vercel_readiness` confunde un build cancelado a propósito por el `ignoreCommand`
   con uno fallido. **Y `vercel redeploy` NO lo resuelve**: vuelve a correr el ignore-step y cancela
   igual. Lo que sí funciona es un push con código a `develop` (el merge canónico `main`→`develop`
   sirve doble).
4. **Se canceló el run zombie `31126022507`** (`Ops Worker Deploy`, 56h en `queued` con 0 jobs). Era
   lo único que dejaba el watchdog en `error`, y su entrada en la lista forense expiraba el
   **2026-08-21**, o sea habría vuelto a bloquear el preflight ese día. La entrada en
   `src/lib/release/preflight/ignored-pending-runs.ts` ya es letra muerta: quitarla en el próximo
   cambio que toque ese archivo.
5. **⚠️ El merge canónico `-X ours` se come el `Handoff.md` y el `changelog.md` del release.** Pasó
   en este mismo release: la sección y la entrada escritas en la rama de fix llegaron a `main` en el
   squash, y el merge `main`→`develop` las descartó porque `develop` había editado esos mismos
   archivos en paralelo — que es lo habitual. Todo lo demás (código, issues, índice, runbook, ambas
   skills) sobrevivió intacto. **Al cerrar un release, verificar explícitamente que Handoff y
   changelog conservan su entrada después del merge**; las dos verificaciones del gotcha #1 no lo
   detectan porque sólo miran `src/`, `scripts/`, `services/` y `migrations/`.
6. **Dos comandos documentados que ya no funcionan** (corregidos): `vercel ls --target=` →
   `--environment=` (CLI 50.x) y el `gcloud run services describe --format="value(...filter(...))"`
   del runbook §4.1, que crashea con `TransformFilter() takes 2 positional arguments`. Sospecha de
   todo comando copiado de la doc antes de concluir que el sistema está roto.
7. **`data_missing` del watchdog casi siempre es tu sesión `gcloud`, no deriva.** `pnpm
   gcloud:auth:playwright -- --force` renueva CLI **y** ADC. Antes: `data_missing_count=4`; después: `0`.

### TASK-1309 — Auditoría del sitio (2026-08-08)

`TASK-1309` está `in-progress` con código completo: cuarta tab `/admin/growth/seo/audit`, datos reales
de Berel (95 · 0 críticos · 138 avisos · 381 menores · 100 páginas) y UI quality 4.59. El bloqueo
heredado de TASK-1310 ya tiene fix local, pero faltan migración y staging (ver cutover más abajo).
No repetir build ni suite global sin autorización (~30 GB).
Evidencia: `.captures/2026-08-08T13-48-58_growth-seo-audit`.

Auditada con `seo-aeo` y `greenhouse-ui-review`: el orden de la lista ganó un tercer eje —**valor de
búsqueda**, ortogonal a la severidad— porque sin él la higiene de sitio ascendía por puro alcance
(favicon en 91 páginas por encima de `alt` en 50), y los checks de performance ahora declaran que son
medición de **laboratorio** (Google rankea con datos de campo). Queda declarada, sin dueño, una
cobertura que el audit NO tiene: acceso de crawlers de IA en `robots.txt`, ausencia de JSON-LD,
conflicto noindex+robots y salud de sitemap.

### Cutover `seo_v1 → seo_v2` — expand aplicado, falta migrar y contraer (2026-08-08)

El rename de la clave del módulo era **breaking en los dos sentidos**: migración primero deja al
código vivo pidiendo `seo_v1` ya superseded; código primero pide `seo_v2` que la base no tiene. Y no
es sólo UI — el mismo predicado gatea los tres batches que le pagan al proveedor, que en la ventana
saltarían con `no_entitlement` **en silencio**.

Se aplicó la fase **expand**: `SEO_MODULE_KEY` queda para escritura y las lecturas usan
`SEO_MODULE_KEYS_READ = ['seo_v2','seo_v1']` con `ANY($n::text[])` en los 5 consumidores. Verificado
contra PG real con la base todavía en `seo_v1`: ambas orgs resuelven `hasModule=true` sin bloqueo.
El contenido de la lista está fijado por test para que la contracción sea deliberada.

**Pendiente, en este orden:** desplegar el expand → aplicar
`migrations/20260808131441444_task-1310-seo-client-view-codes.sql` → verificar en staging con Berel →
**recién ahí** contraer a `seo_v2` sola (dueño `TASK-1310`). Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.7.

### TASK-1310 — surfaces cliente SEO implementadas (2026-08-08)

`TASK-1310` sigue `in-progress`: dashboard `/growth/seo`, quadrant y report `/growth/seo/report`
reusan `ReportArtifactModel`; guard = assignment per-org + `growth.seo.report.read_client` `own`.
La migración pendiente crea `seo_v2`, supersede el assignment `seo_v1` de Berel preservando tier/metadata
y publica los viewCodes; sin aplicarla no hay navegación compuesta. Próximo paso: staging, sesión Berel,
menú/rutas/denial sin módulo, baseline diff y revisión mobile. Sin push/deploy autorizado.

**Verificación 2026-08-08 (deuda cerrada por Claude).** El barrido con subagentes encontró que el
código estaba adelante de sus documentos y de sus gates, así que se corrigió lo documental y **se
hizo fallar a propósito lo que estaba verde de mentira**:

- **Señal de fiabilidad falsa-sana.** `seo-rank-capture-lag.ts` tenía `module_key = 'seo_v2'`
  hardcodeado: veía 0 orgs y reportaba `ok`. Con el expand aplicado reporta `warning` con un hallazgo
  real. Su test pinneaba el bug (asertaba el literal); ahora aserta el contrato. Commit `2f21dd46e`.
- **GVC corría con la persona equivocada.** Los tres scenarios cliente capturaban con sesión de
  operador contra una superficie client-gated, así que el frame decía "SEO no está activo en tu plan"
  y el visual-gate daba BLOCK por una razón que no era la UI. Se agregó `requiresStorageState` al
  contrato de scenario, exigido **antes** de lanzar el browser. `ui:visual-gate --task TASK-1310`
  pasó de BLOCK a PASS. Commit `ec3fa82c6`.
- **El scorecard estaba verde y la auditoría en BLOCK.** El scorecard de las 10:03 daba PASS 4.61 y
  afirmaba "axe sin violaciones" cuando la auditoría de las 10:25 tiene 2 violaciones de contraste y
  economía de superficies en 1.8. Se regeneró desde la auditoría: **`ui:quality --task TASK-1310`
  ahora da BLOCK con `average=2.29 floor=1.8`**, que es el estado correcto para una task con
  `UI ready: no`. El scorecard viejo queda declarado en el campo `supersedes`.
- **Drift documental del `masterDetail`.** El wireframe y el flow todavía describían un navigator
  lateral que la implementación descartó; era la ruta por la que el siguiente cambio reintroducía la
  composición equivocada. Corregidos a `composition='single'` + tabs, con el "por qué no" escrito.
- **Doc funcional + manual.** La superficie cliente salió de "Que NO existe todavía" y ganó su
  sección con el estado de rollout declarado; se escribió el manual que faltaba
  (`docs/manual-de-uso/growth/habilitar-portal-seo-cliente.md`) con el orden exacto del rollout y por
  qué **no** se valida con la persona agente superadmin. README, EPIC-022 y el ledger de flags
  quedaron sincronizados.

Lo que **no** hice y sigue abierto: los 7 lotes de la auditoría premium (trabajo de Codex, vive en
`/growth/seo/mockup`), el push de los commits locales y la migración —bloqueada porque `main` no
tiene todavía el catálogo TS y `syncViewRegistryCatalog` desactivaría las filas.

### TASK-1309 — CERRADA (2026-08-08)

**Cerrada.** El build de producción salió verde con autorización del operador (exit 0, árbol completo
de rutas), que era el último gate: `pnpm test` full + `pnpm build` prod + los 4 gates de UI +
reachability. Lifecycle `complete`, archivo movido, registry/README/EPIC-022 sincronizados, y delta de
impacto cruzado en las tres tasks que la citan como base (1670, 1672, 1673). **Con ella el conmutador
de Search Visibility queda completo: las 4 tabs del operador navegan.**

**El bloqueo había desaparecido solo.** 1309 estaba `code complete` frenada por 2 rojos ajenos en
`client-role-visibility.test.ts`, causados por 1310 al registrar viewCodes sin migración de
`role_view_assignments`. Esa migración se aplicó hoy en el rollout de 1310 y los cerró:
**`pnpm test` completo en 1429 archivos / 10377 tests / 0 rojos**, `ui:quality` PASS 4.63,
reachability 232 rutas / 0 huérfanas. Falta sólo `pnpm build` de producción sobre el último commit
para moverla a `complete` (no se corrió: ~30 GB, va con autorización del operador).

**Dos subagentes cerraron el ciclo documental**, con dominios de archivos disjuntos para no chocar.
Lo que encontraron vale más que el trabajo mecánico:

- 🔴 **§10.6 de la arquitectura SEO se auto-contradecía**, y fue culpa mía: el delta que agregué esta
  mañana cambiaba el orden a tres ejes, pero el contrato 4 de arriba seguía declarando la regla vieja
  de dos. Un agente que leyera el ítem sin bajar al delta implementaba lo equivocado.
- **Cinco commits de feature aterrizaron DESPUÉS del pase documental** (`4c81306d5`), así que las tres
  capas describían una pantalla anterior a la construida. El pase documental "ya hecho" no era
  garantía de nada: lo que garantiza es mirar el delta.
- Los hallazgos se **generalizaron más allá de SEO**, que es donde está el valor: `dataviz-design`
  ahora advierte que **cualquier** chart que derive su tamaño del contenedor es sospechoso (tabs
  ocultas, acordeones, y el `fullPage` de Playwright que produce cards vacías que parecen bug y no lo
  son); `state-design` fija que el resultado de un job async tiene **seis** estados y no dos (nunca
  corrió · corriendo · limpio · parcial · con techo · fallido); y los dos gates de UI review suman
  como blocker el número cuya procedencia difiere de sus vecinos sin declararlo.

**Deuda detectada de paso:** `greenhouse-ui-enterprise-review` existe en `.claude/` y `.codex/` pero
**no está en el manifiesto de espejos** y ya divergía. Se le aplicó el mismo bloque a las dos copias
para que el gate sea idéntico entre agentes, sin reconciliar la divergencia previa. Alguien debería.

### TASK-1310 — verificado con sesión de cliente: funciona, pero NO es alcanzable (2026-08-08)

Cerré el paso 5 del rollout con sesión real de Grupo Berel. Dos resultados, y el segundo es el que
importa:

✅ **El gate per-org pasa y la superficie es real.** Migración aplicada, `/growth/seo` renderiza con
datos medidos: posición media 1.5, 31 keywords, 19 en primera página, cobertura 61%, procedencia
declarada (medido ● / estimado ◑). Evidencia `.captures/2026-08-08T19-29-36_growth-seo-client`.

🔴 **El menú del portal cliente NO compone SEO** — y no es el catálogo:

1. `VerticalMenu.tsx` arma el menú cliente con una **lista hardcodeada de 7 ítems** filtrada por
   `canSeeView('cliente.*')`. SEO no está en la lista, así que ningún seed lo agrega.
2. Su único bloque dinámico (`capabilityModules`) sale de `businessLines`/`serviceModules` de la
   sesión — **otro sistema**, no `module_assignments`.
3. El resolver canónico module-based (`composeNavItemsFromModules` / `<ClientPortalNavigation>`)
   existe y **sólo lo consume el mockup** `/mockup/cliente-portal-legacy`. Cablearlo es la task
   derivada de TASK-827 que quedó como "V1.0 acepta path híbrido".

**Además, el manifest de alcanzabilidad declara un enlace que no existe:** `/growth/seo` figura con
`parent: '/home'`, `via: 'inline-link'`, y no hay ningún enlace desde `/home`. El gate da `0 orphans`
porque comprueba que la ruta esté **declarada**, no que el enlace declarado **exista**. Hoy el único
camino real es el cross-link desde el informe AEO, que sólo sirve a clientes que además tengan AEO.

**Confirmado con subagentes, y corrige una atribución errónea que hice en el camino:**
`authorizedViews` se deriva **sólo** de `role_view_assignments` + fallback heurístico + permission
sets + overrides — **nunca de `module_assignments`**. Llegué a decir que "el módulo concede y el
denial vetea"; es falso. AEO figura en las 23 views de Berel porque **no tiene fila de rol y cae al
fallback**, no porque su módulo la conceda.

**Y AEO tampoco aparece en el menú lateral.** Se alcanza por deep-link, declarado a propósito en el
manifest. Así que el estado de SEO **no es una regresión: es el diseño vigente del portal cliente.**
Lo que falta es la task derivada de TASK-827 que monta el nav module-driven
(`ClientPortalNavigation` + `/api/client-portal/modules`, ambos completos y con **cero consumidores**
en runtime).

Descartado con dato: no era sesión desactualizada — los claims se auto-refrescan cada ≤5 min y una
sesión recién emitida tampoco los trae.

**No lo parché.** Empujar SEO a la lista hardcodeada haría desaparecer el síntoma y consolidaría el
diseño equivocado: el portal cliente debe componer su menú desde `module_assignments`, que es lo que
el resolver canónico ya sabe hacer y nadie cableó.

### 🔴 ISSUE-143 — rompí SEO en producción aplicando la migración de TASK-1310 (2026-08-08)

**Resuelto el mismo día, ~25 min de caída.** Apliqué la migración de catálogo tras el push+deploy y el
canary del provider contra `greenhouse.efeoncepro.com` pasó de `domainQuadrant=riesgo keywords=50` a
`hasModule=false` + `greenhouse_seo_lane_404` en los cinco lanes.

**La causa no fue el orden del rollout: fue la forma de la migración.** El archivo de viewCodes hace
expand **y contract en el mismo paso** — crea `seo_v2`, le asigna las orgs y en el mismo statement
supersede `seo_v1`. Eso anula el dual-read `SEO_MODULE_KEYS_READ` que habíamos aplicado a los 5
consumidores: su valor entero era que existiera un período con ambas claves vigentes, y la migración
lo borró en el mismo commit en que lo creaba. Vercel producción corre `main`, que pide `seo_v1`
literal.

**El ops-worker NO se vio afectado** — su deploy ya tenía el dual-read, así que los tres batches que le
pagan a DataForSEO siguieron sanos. El daño fue de lectura, no de gasto ni de datos.

Restaurado reabriendo la ventana (`effective_to = NULL` en los `seo_v1`), verificado con el canary
real, y hecho durable por `20260808184512073_…-reopen-seo-module-cutover-window`, que hornea el
invariante: mientras el cutover esté abierto, ambas claves cubren exactamente las mismas orgs; una
ventana asimétrica aborta la migración. Sin doble conteo de cuota: el resolver hace `LIMIT 1` sobre el
`ANY(...)`.

**Dos lecciones, y la segunda es la que importa:**

1. Una migración nunca contiene el expand y el contract del mismo cutover. Hay **cinco runtimes con
   despliegues independientes**; "lo desplegué a develop" no es "lo desplegué".
2. **El diseño era correcto y aun así se cayó.** §10.7 de la arquitectura describía bien el patrón y
   el dual-read estaba fijado por test — pero nada impedía escribir el contract en el mismo archivo,
   porque la regla vivía en prosa. Ahora vive en un test que escanea `migrations/` y falla si una
   migración nueva supersede una clave que `SEO_MODULE_KEYS_READ` todavía acepta. **Probado por
   mutación**: sacando la migración culpable de su allowlist, el test la nombra.

Contribuyó una causa de método: verifiqué la migración con un `SELECT`, que es la mitad del contrato.
La otra mitad es qué versión de código la lee en cada runtime. La verificación correcta es el
consumidor real contra el host real.

**Delta 2026-08-09 — el release cumplió la precondición.** Verificado runtime por runtime: `main` con
el dual-read, canary del provider contra producción **100% verde** (con `track`/`untrack` ya en `400`
en vez de `404`, o sea que esas rutas existen), y el ops-worker en una revisión ancestro de `main`. El
contract pasa a **`TASK-1677`**, separado de `TASK-1310` para no atar una operación de datos de 20
minutos a un ciclo de diseño abierto. La señal de simetría de la ventana sigue sin dueño, pero deja de
ser urgente cuando la ventana se cierre.

**Colateral arreglado de raíz:** rotando este mismo Handoff descubrí que `docs:context-rotate` estaba
ciego y **reventaba** (`TypeError` sobre `matches[0]`): su patrón buscaba secciones `##` con fecha y el
archivo usa `###` hace rato — 0 de 23. Segunda vez que se queda ciego por la misma causa (el propio
código documenta la primera). El nivel de heading ahora **se descubre** en vez de asumirse, porque el
ancla estable es la fecha; sin secciones fechadas degrada con un mensaje accionable en lugar de un
stack. El script quedó importable y con suite (5 tests, uno contra el `Handoff.md` real). Si vuelve a
fallar, la respuesta es extender `DATED_SECTION_LEVELS`, no rotar a mano: rotar a mano es como se
corrompen los marcadores de integridad de los shards.

### Search Visibility — header canónico (2026-08-07)

TASK-1307/1308 siguen `complete`: Resumen, Rendimiento y Keywords comparten `SurfaceRecipe` +
`WorkbenchHeader` (alcance/meta/tabs), sin chrome sobre canvas ni duplicación en estados vacíos. 579
tests focales, typecheck/lint y 5 GVC OK (1440/390). Pendiente: promoción `develop → main` batcheada
con 1308/1655; el export GSC nativo de Berel requiere Owner fuera del repo.

### Carril de keywords OBJETIVO — TASK-1659…1662 (2026-08-07)

Salió de que el operador cuestionara por qué TASK-1308 no usó los ejes especificados. La respuesta
corta era correcta; la larga destapó que **el módulo tiene TRES preguntas y sólo una tenía
superficie**: (1) qué empujo de lo que ya tengo — construida; (2) dónde quiere estar el cliente;
(3) qué me pierdo entero. Ninguna de las 12 tasks abiertas de EPIC-022 cubría 2 ni 3.

🔴 **GSC es ciego por construcción a 2 y 3**: sin top ~100 no hay impresiones, así que esas
búsquedas NO EXISTEN en los datos. Ninguna superficie sobre esa fuente va a contestarlas.

⚠️ **Corrección al criterio anterior:** para una keyword donde el cliente SÍ rankea, el dato de
mercado es enriquecimiento y los ejes medidos mandan. Para una donde NO rankea, GSC no da nada y
volumen+dificultad son la ÚNICA forma de contestar "¿vale la pena?" y "¿cuánto cuesta?". Ahí son
**dependencia dura**, no opcional.

⚠️ **`TASK-1300` SÍ está complete** — yo repetía lo contrario desde un comentario obsoleto de
`contracts.ts`. Entregó el registry (`labs` es llamable) pero es *infra de cliente, no capability*:
falta fetch, columnas (`search_volume` no existe) y reader. Corregido en la fuente y en el doc, que
se contradecía. **Y `trackKeywords` acepta strings arbitrarios**: seguir una keyword no rankeada ya
funciona por contrato, sólo falta el botón — Full API Parity al revés.

Orden de dependencia: `1659` (modelo de intención, migración) → `1660` (lente Objetivos, UI) →
`1661` (datos de mercado) → `1662` (keyword gap). Las 4 con `task:lint` en 0/0.

**Superado el mismo día: el operating mode.** El operador señaló que el módulo tiene los **mismos
tres modelos de servicio que Globe** (`efeonce-managed` | `co-operated` | `client-operated`; "que el
cliente contrate la herramienta" NO es un cuarto modo sino `client-operated` × delivery model de
plataforma). El vocabulario YA era canónico y Globe YA lo materializó (SPEC-008, desplegado) — pero
vive en SU Postgres, y en Greenhouse `delivery-model.ts` es de cotización, no de esto. Creado como
`TASK-1663` + ADR `GREENHOUSE_OPERATING_RESPONSIBILITY_DECISION_V1.md`.

🔴 **La regla que sostiene todo, verbatim de Globe: el modo NUNCA es input de autorización.** No
decide quién PUEDE declarar (eso es `can(...)`), decide qué superficie DEBE existir y quién responde.
Si el modo otorgara acceso, cambiar una etiqueta comercial cambiaría en silencio quién puede
comprometer gasto. El entregable más importante de 1663 es el **test que lo prueba**.

**Tres ejes ortogonales:** quién puede (capability) · quién responde (modo) · quién paga (comercial). ⚠️ **Y NO se construye ahora** (el operador lo acotó el mismo día): el ADR quedó `Proposed` y
`TASK-1663` en `P3` con condición de activación = un segundo consumidor real. Hoy hay **cero
asignaciones declaradas**, así que sería infraestructura de un problema que no tenemos. `1659`/`1660`
se construyen **como están especificadas**, sin esperar y sin conciencia de modo "por si acaso".

### Seedance 2.5 — inventario Fal y TASK-1656 (2026-08-07)

Fal Model Search/OpenAPI confirma tres endpoints activos: T2V, I2V y R2V; Globe permanece `provider-supported / gated`.
Se dejaron el inventario API, route card, registry, fleet ledger y skills espejo actualizados; no se tocó runtime de Globe.
`TASK-1656` registra la integración backend-data: roles multimodales, audio, frame final, queue/webhook, ingest, rates,
rights, evaluación, canary, settlement y promotion por ruta. Reutiliza el adapter Fal y el control plane existente;
la UI queda en `TASK-1552` y el contrato compartido en `TASK-1633`. No habilitar 4K/1080p, tres minutos, edit/masks,
storyboard, stems, streaming, realtime, seed de entrada ni BytePlus 2.5 sin contrato verificable.
