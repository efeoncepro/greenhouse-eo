# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-09-02 (10) — TASK-1805 tomada: la metodología ETV pasa a ser identidad del hecho, todavía en legacy

Sesión `greenhouse-eo-fe` implementa `TASK-1805` local-first sobre `develop`, **sin push** mientras dure la
promoción a producción anunciada por `Task-1804`. Alcance: policy endpoint-aware fail-closed
(`src/lib/growth/seo/etv-methodology/**`), expand aditivo del schema de `seo_domain_overview_snapshots`,
`seo_url_visibility_snapshots` y `seo_prospect_diagnostics` (identidad metodológica + evidencia + guard de
corte), writers/readers/API/MCP formula-aware, señal de drift cross-runtime y evaluador dry-run sin gasto.
Estado del árbol al arrancar: diez docs sucios ajenos (EPIC-022 + nueve tasks SEO); ninguno se acopla a los
commits de esta sesión salvo el propio `TASK-1805`, cuya sección «MCP Tools & Skills Contract» ya estaba en
el working tree y se conserva.

**Decisiones de foundation que `TASK-1806` hereda:** las filas existentes (5 fotos de dominio, 8 de
visibilidad, 1 hecho de tráfico de prospecto; todas capturadas 2026-08-27/29 por código que nunca envió
`use_improved_etv`, sobre una cuenta registrada antes del 2026-09-01) se atribuyen a `legacy_static_v1` con
evidencia `contract_default_pre_cutoff`, nunca por fecha; la selección productiva permanece legacy explícita;
el contract phase (retirar uniqueness legacy y defaults transitorios) queda en `docs/tasks/pending-migrations/`
hasta que ambos runtimes escriban método explícito (regla ISSUE-161, una sola instancia Cloud SQL).

## 2026-09-02 (9) — DCR quedó deprecado en MCP `2026-07-28`: el shim de `mcp.efeonce.org` se mantiene, con dos hallazgos que la evaluación no buscaba

Evaluación de impacto pedida por el operador, **sin migración**. Verificada contra la spec en vivo.
Ya en producción vía release `375f56e24187` (commits `7788c8626` + `b4135f287`, verificados por blob
contra `origin/main`). **Cero cambios de código.**

**Veredicto:** el shim DCR sigue siendo correcto y no por inercia. La spec retiene DCR *"for backwards
compatibility with authorization servers that do not support Client ID Metadata Documents"* — que es
literalmente Entra, que no soporta **ni CIMD ni RFC 7591**. El shim es pre-registro (prioridad 1 de la
spec) por el único canal que los clientes MCP estándar consumen sin configuración manual. Earliest
removal de DCR: primera revisión publicada en o después de **2027-07-28**.

**Hallazgo estructural:** *"migrar el gateway a CIMD" no existe como trabajo.* CIMD es capacidad del
**authorization server**; el nuestro es Entra y el gateway **espeja** `authorize`/`token` en vez de
proxearlos. Soportarlo exige emitir los tokens = el broker de `TASK-1631`, cuyos invariantes **ya** lo
exigían al proveedor. No se abrió task paralela; esta evaluación es insumo de esa task.

**🔴 Riesgo más cercano que la deprecación, en la misma revisión:** la página nueva *Authorization
Server Discovery* (no existía en `2025-11-25`) exige `issuer` **idéntico** al identificador usado para
construir la well-known URL. **Los nuestros difieren** desde que el shim existe. Funciona sólo porque
los clientes todavía no lo aplican — empírico, no garantizado. **No se parchea** reclamando issuer
propio: rompería la validación `iss` de RFC 9207, que hoy pasamos *porque* espejamos el de Entra.

**Dos hallazgos que salieron de coordinar con otras sesiones, no de la evaluación:**

1. *Confused deputy* (aporte de `greenhouse-eo-1e`, adoptado a medias tras verificar): la letra del
   `MUST` no ata —no reenviamos— y el modo de la cookie de consentimiento quedó **refutado** leyendo
   `src/app.ts`. Pero el riesgo está por construcción: `client_id` estático compartido +
   `http://localhost` **sin puerto** + consentimiento cacheado por Entra = un proceso local toma un
   código en silencio. Acotado a lectura porque ese cliente **no lleva scopes de escritura**.
2. *La etiqueta miente:* `32617b87-…` se llama **"Efeonce MCP Local Canary Client"** siendo el cliente
   compartido de producción; el canary real es `66985833-…`. Quien lee "Local Canary" y asume radio de
   juguete es quien no auditará las redirect URIs.

**Plan B declarado, sin ejecutar:** si un cliente endurece cualquiera de las dos validaciones antes del
broker → pre-registro puro (apuntar `authorization_servers` a Entra, apagar `OAUTH_PUBLIC_CLIENT_ID`
—el shim ya está gateado por esa env— y `client_id` manual por usuario).

**Pendiente con dueño:** renombrar el cliente en Entra y decidir sobre las redirect URIs — **NO**
angostando `http://localhost` a secas, que es el loopback que Claude Code necesita. Opcional para quien
formalice `TASK-1654`: publicar `client_id_metadata_document_supported: false` explícito.

**Deuda de proceso, ajena a la task:** el worktree de esta sesión nació de `origin/main` (1490 commits
detrás de `develop`) porque `origin/HEAD` apunta a `main`. Le pasó igual al worktree
`busy-shirley-80edbf` del 2026-08-27. Fix propuesto y **no aplicado** (decisión del operador):
`git remote set-head origin develop` + borrar ambos worktrees.

## 2026-09-02 (8) — El release `375f56e24187` quedó huérfano y se recuperó; `main` vuelve a tener manifest

La promoción `develop→main` del 2026-09-02 entró a `main` por el PR #215 a las `20:51:04Z` (726 archivos,
1490 commits, 2 migraciones) y quedó **sin manifest de release**: la sesión que la promovía fue archivada por
accidente antes de dispatchar el orquestador. Un commit en `main` sin manifest es exactamente la condición que
la regla dura del control plane prohíbe dejar abierta, así que otra sesión lo retomó con autorización directa
del operador y cerró el ciclo.

Cierre: run `33683893124` **completed/success** en 11m50s, `release_id`
`375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9`, máquina de estados completa
`preflight → ready → deploying → verifying → released`. Los DOS gates `production` se aprobaron con 34 s de
diferencia (sin el stall del gotcha #6). Único bypass: `release_batch_policy`, inevitable por las 2 migraciones
—dominio irreversible por precedencia del clasificador, donde el marker `[release-coupled: …]` no aplica—, con
razón citando un hecho verificado y no un adjetivo: `migrate:status` en dry-run reporta cero migraciones
pendientes contra la única instancia Cloud SQL.

Verificación runtime, con la trampa del día atajada: el `ops-worker` cerró con un **skip de 51 s** y sirve
`c4c838dea9d1`, no el target. Se verificó con el **diff de árbol completo** (43 archivos, 5 de código, tres bajo
`src/mcp/**`) y con `pnpm worker:deploy-path-gate`, que confirma que los 1451 archivos del bundle caen bajo
prefijos declarados y que `src/mcp` no es uno: ese código lo sirve Vercel, que sí desplegó el target. Skip
legítimo. El watchdog reportó `data_missing=4`, que **no es drift**; la lectura autoritativa fue
`pnpm release:workers`: 3/4 workers en el target, `Ready=True`. Canary de contrato del lane MCP `skills` verde
**después** del `released`.

Flags: se prendió `GROWTH_SEO_SITE_FINDINGS_ENABLED` en el ops-worker con los dos pasos (revisión activa
`ops-worker-00631-jfw`), tras probar por blob que el evaluador desplegado es idéntico al de `main`. Quedan
pendientes sus verificaciones post-flip (3) y (4). La cadencia `ops-seo-keyword-discovery-drain` quedó
reconciliada: `main` ya declara `*/2`. **No** se prendió `HIRING_FAIRNESS_MONITOR_ENABLED`: su condición de
retiro sigue vigente hasta `TASK-1365` y prod carece de la policy row de privacidad, así que daría cero en
silencio en una métrica de equidad.

Aprendizaje operativo del día: **dos sesiones recibieron el mismo mandato y ninguna verificó peers vivos antes
de arrancar.** La colisión se detectó porque `origin/main` ganó un commit entre dos comandos consecutivos. Nadie
tocó el control plane durante el solapamiento. Regla que queda: anunciar no es coordinar — hay que preguntar con
`ListAgents` y esperar respuesta antes de tocar el árbol.

## 2026-09-02 (7) — Salesforce ya tiene oferta canónica y task de landing, sin implementación

La práctica Salesforce quedó canonizada por outcomes y lifecycle en cuatro fases: `Diagnose & Architect`,
`Implement & Integrate`, `Activate & Adopt` y `Operate & Evolve`; seis solution lanes cubren Revenue/Sales,
Service, Marketing/Lifecycle, Data/Identity/Consent, Agentforce/Automation y Experience/Integration/Analytics.
El mapa previo conserva el routing de producto y separa CRM, Marketing Cloud Engagement y Marketing Cloud Next.

Se registró `TASK-1812` para convertir esa oferta en una landing pública `Universo conectado`. Ya existen dirección
visual, wireframe 1440/390, flujo installed-base/evaluation y motion contract. Efeonce lidera; Salesforce aporta
reconocimiento referencial. Nubes/agentes son originales y cualquier logo, badge, screenshot, mascota o claim de
partnership queda bloqueado hasta rights y readback contractual. `TASK-1404` sigue dueña de la comparación HubSpot
vs Salesforce.

Estado honesto: documentación y contrato UI listos; no hay implementación, WordPress postId, CMS save, publicación,
cache purge, indexación, conversión ni live readback. La ejecución empieza con Discovery/VoC/SEO/rights/runtime,
continúa con un first fold `noindex` y se detiene para `ACCEPT FIRST FOLD` antes del below-fold.

## 2026-09-02 (6) — ANAM recibe un cierre documental premium y un soporte acotado a tres meses

El cierre de Emma quedó consolidado en dos entregables externos de cinco páginas: especificación técnica y guía
funcional. El sistema visual usa Poppins para display y Geist para lectura; Efeonce predomina como proveedor,
HubSpot aparece como partnership y ANAM como cliente. Los PDF son el master de envío, los HTML/CSS la fuente
editable y diez capturas rasterizadas la evidencia de revisión. Todos los pies incluyen sitio, correo, teléfono y
dirección de Efeonce. Las versiones Word supersedidas quedaron fuera del paquete versionado.

El correo para Óscar, María Paz, Pablo y Marco quedó listo, pero **no enviado**. Explica el rediseño de la landing,
la corrección generativa del bordado `ANÁLISIS AMBIENTALES S.A.`, la identidad live de Emma, la matriz de handoff,
las tres pruebas E2E y las validaciones humanas todavía pendientes. La captura final de la landing también quedó
versionada como adjunto. El SharePoint consolidado es un compromiso para esta semana y permanece pendiente hasta
verificar el enlace compartido.

El soporte quedó explícito para Customer Agent y KPI: **tres meses, del 2026-08-13 al 2026-11-12 inclusive**.
Cubre incidentes, correcciones, dudas operativas, comportamientos inesperados, recuperación de configuración y
documentación derivada de una corrección. No cubre nuevas funcionalidades, KPI, workflows, automatizaciones,
integraciones, rediseños ni innovación; toda evolución requiere alcance y aprobación separados. Este cierre sólo
actualiza documentación y entregables; no mutó HubSpot, no envió correo, no creó SharePoint y no hizo push.

## 2026-09-02 (6) — TASK-1804: el manual de uso viaja por el protocolo — code complete, rollout pendiente

Tres slices en Greenhouse (`ec89014e4`, `12c0ea85d`, `5a6ae57f4`) y uno en `efeonce-mcp` (`c588a1b`,
**local, sin push**: `main` auto-despliega a Cloud Run). Manifiesto de manuales
(`src/mcp/greenhouse/skill-manifest.ts`) + reader canónico + tres `SKILL.md` en `docs/mcp/skills/`
escritos de cero para el consumidor MCP; tool `get_greenhouse_skill` (44 tools en el artefacto),
recurso `skill://efeonce/<name>/SKILL.md`, lane `/api/platform/ecosystem/mcp/skills[/{name}]` con
404 anti-oráculo para bindings no-internal; las `instructions` rutean al manual en vez de contener
el procedimiento. Test de fuga sobre todo `docs/mcp/skills/**`. `next.config.ts` declara los `.md`
como `outputFileTracingIncludes` (primer uso en el repo).

🔴 **Pendiente de runtime, en este orden:** (1) push de `develop` y verificar la lane en staging con
binding real — `count` **exactamente 3**, cuerpo con frontmatter, `404` inexistente, `401` sin token,
catálogo `[]` + `404` con binding de cliente; (2) release a producción y repetir; (3) push del commit
local de `efeonce-mcp` → deploy de Cloud Run → `scripts/greenhouse-seo-canary.mjs` (ya trae los
asserts de skills). Sin Entra, flag ni secreto nuevos. `pnpm build` de producción no se corrió en
local (cuelga la máquina): lo prueba Vercel o se corre con autorización.

⚠️ El guard de paridad del gateway está anclado al dominio SEO y no veía una tool `platform`: nació
`EXPECTED_GREENHOUSE_PLATFORM_TOOLS` + `computeFederatedNonSeoToolFindings` (test con regresiones).

**Actualización (misma task, más tarde ese día):** el SHA `eed9992d5` rompió el build de staging —
*"api/mcp/greenhouse is 397.29mb (limit 250mb)"*. No era el tamaño de los manuales (el glob resuelve 3
archivos; `@vercel/nft` traza la ruta en 2,6 MB): una ruta con `outputFileTracingIncludes` propio deja de
agruparse y su función sola supera el techo. Se cerró la clase: `skill-catalog.generated.json` generado desde
`docs/mcp/skills/**` con `pnpm mcp:skills:generate`, gate `pnpm mcp:skills:check` en `local:check` y CI,
hashes re-verificados al cargar, cero `fs` en runtime, tracing retirado de `next.config.ts`.
🔴 **Decisión del operador: sin release a `main` en esta ventana; sólo el gateway.** `efeonce-mcp`
`c588a1b` desplegado (revisión `efeonce-mcp-gateway-00028-pmx`, CI + Deploy Cloud Run success, front door
200/200/401). Consecuencia declarada: `get_greenhouse_skill` responde `not_found` desde producción hasta que la
lane llegue a `main`. Pendiente: lane verificada en staging con el SHA nuevo de `develop` + canary del gateway
contra staging.

**Cierre de la ventana (verificado):** el build de staging `greenhouse-jr9hmjido` quedó **Ready** con
`4620875eb`: la causa real era el análisis estático de `fs` de Turbopack (no nft ni el tracing) —
`skill-catalog.ts` conservaba `readdirSync`/`readFileSync` alcanzables desde tres rutas y Turbopack incluía el
proyecto entero (397 MB). Todo `node:fs` vive ahora en `skill-catalog-fs.ts` (sólo generador y tests).
**Lane verificada en staging** con el binding interno del consumer del gateway: `count=3` exacto, ETag/304,
tres cuerpos byte-idénticos al artefacto, `404` inexistente, `401` sin token; canary del provider del gateway
contra staging 5/5. Contra producción el gateway responde `not_found` (la lane espera el release). Pendientes
reales: release `develop→main` (decisión del operador) y el camino de negación con binding de cliente en
runtime. ⚠️ `4620875eb` arrastró archivos que otra sesión tenía en el índice compartido (`mcp-craft/**`,
`.claude/rules/mcp-tool-surface.md`); esa sesión lo registró en `bd112e66a`.

**Cierre definitivo (21:27Z):** la lane salió a producción en el release `375f56e24` (release_id
`375f56e24187-546f452b-…`, run `33683893124`, llevado por `greenhouse-eo-ac`); canary de contrato contra
producción post-`released` verde (count=3 exacto, cuerpos byte-idénticos, ETag/304, 404/401, provider del
gateway 5/5). TASK-1804 → `complete`. Sin evidencia runtime: `tools/call` por el front door OAuth (login
Entra interactivo) y la negación con binding de cliente (sin consumer de cliente con token).

**Higiene Entra (21:40Z):** el cliente PKCE público `32617b87…` dejó de llamarse "Local Canary Client" y ahora es
"Efeonce MCP Public Client (Claude Code, claude.ai, Claude Desktop)"; sólo `displayName`, readback con redirect
URIs y scopes intactos. Queda abierta la revisión del loopback `http://localhost` sin puerto (ADR del gateway).

**Follow-up (22:10Z):** (a) evidencia por el front door: `claude mcp login efeonce-mcp` → `✔ Connected` y un
agente `claude -p` en sesión nueva llamó `get_greenhouse_skill` por `mcp.efeonce.org` con token Entra real, listó
el catálogo y resumió bien el manual de gasto — cerrado el único hueco de evidencia. (b) El catálogo pasa de 3 a 6
manuales, todos SEO federado (`seo-discovery-to-tracking`, `seo-technical-health`, `seo-prospect-diagnostic`); la
`description` de la tool no cambia (nombra el manual de gasto y remite al catálogo), así que el gateway no se
redespliega: los nuevos aparecen tras el release. Hiring/Globe quedan fuera: sus tools no están en el manifiesto de
Greenhouse y el contrato de manuales sólo gobierna ése. Techo "revisar al pasar de 6" alcanzado: la próxima adición
particiona por dominio.

## 2026-09-02 (5) — TASK-1784: el eval de selección MCP refutó su propia hipótesis, y eso es el entregable

Se midió la selección de tools SEO antes de tocar una descripción: **tool 94.5% / mercado 98.2% / gasto 100%**
sobre 55 preguntas de operador en los cinco mercados productivos, con piso de ruido cero (dos corridas
idénticas). Después se probaron cuatro variantes de descripción, cada una determinista.

🔴 **Los bloques de ruteo `Use when · Prefer X if · Do NOT use for` NO mejoraron la selección de tool.** La
banda 92.7–96.4% no tiene dirección, y una variante hizo regresar a `prepare_seo_grounded_queries`, una tool que
nadie tocó: alargar siete descripciones degrada la selección de sus vecinas. Se aplicó la variante SIN bloques.

Lo que sí movió el número fue corregir dos afirmaciones falsas. La cláusula de mercado decía *"pass market when
the organization has more than one"* —una instrucción de elegir—, y el modelo la obedecía justificándose con
*"the operator is in Santiago"*: `ISSUE-152` en su propio razonamiento. Ahora nombra la clase de señal que NO es
una declaración. **Mercado 98.2% → 100%.** Tool bajó a 92.7% y se reporta sin declarar mejora: su regresión es
léxica y ninguna descripción le gana al nombre de su propia tool.

**Hallazgo lateral, el más caro:** al hacer que el guard de paridad comparara `description`, aparecieron
**21 de 27 tools federadas ya divergentes** — el gateway servía, entre otras, la instrucción que causa
`ISSUE-152`. Se cerró **derivando** el texto del artefacto (`greenhouseToolDescription`) en vez de copiarlo.

✅ **Gateway desplegado.** `mcp.efeonce.org` corre la revisión `efeonce-mcp-gateway-00027-6pj` desde el commit
`3d09e152`, con la postura intacta (`internal-and-cloud-load-balancing` + invoker `allUsers`), `health=200` y
`/mcp` desafiando 401. En ese commit hay **cero** ocurrencias de la instrucción vieja. Lo que NO se verificó:
leer el `tools/list` servido exige login Entra interactivo y no es automatizable — la cadena
commit→imagen→revisión es fuerte, pero no reemplaza leer el texto servido.

⚠️ **Corrección: la "otra superficie" NO existe.** Se afirmó acá que la ruta `/api/mcp/greenhouse`
(Vercel) seguía sirviendo las descripciones viejas. Es **falso**: su token
`GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN` no existe en ningún environment (`vercel env ls`) y la ruta responde
`404 — "Greenhouse MCP remote gateway is not configured."`, comprobado en vivo contra staging. No sirve
texto viejo porque no sirve nada. **El gateway era la única superficie MCP viva y ya está corregida.**

`develop` empujado (`0a68d92c`) con los 9 workflows en `success` — CI, Playwright E2E smoke y los cuatro
deploys de workers Cloud Run incluidos. Producción queda pendiente del release `develop→main`, que no
cambia nada servido por MCP. Único seguimiento real: `seo_provider_spend_daily` a 7 días — la disciplina de
gasto dio 100% en el eval, pero eso se confirma en la factura, no en la medición.

## 2026-09-02 (4) — Globe queda en hibernación profunda, reversible y documentada

Por decisión del operador, Globe dejó de consumir trabajo productivo mientras todavía no genera ingresos. El
estado live verificado a `2026-09-02T10:30:38Z` es: Cloud SQL `globe-pg` `STOPPED/NEVER`; schedulers Producer,
Media y Governance `PAUSED`; cero ejecuciones activas; API `00216-wmm` y Studio `00150-m2m` listas, con
`minInstances=0` y `GLOBE_PRODUCTIVE_LANES_ENABLED=false`. Se preservaron el disco SQL con deletion protection,
backups/PITR, 10 buckets, 17 secretos, Artifact Registry, servicios/jobs, IAM, front door, budgets,
observabilidad y Terraform. Ningún apply destruyó o reemplazó recursos; el post-plan quedó `No changes`.

El Terraform de `efeonce-globe` gobierna ahora `active -> draining -> hibernated`. `draining` es obligatorio en
ambos sentidos: mantiene SQL encendido mientras publica y verifica revisiones fail-closed. Un primer apply dejó
una revisión API sin startup al apagar SQL demasiado pronto; la revisión anterior conservó tráfico, SQL se
restauró temporalmente y se corrigió la secuencia antes del stop final, sin pérdida de datos.

Baseline previo: ~CLP 348.152 netos/30 días. Residual hibernado modelado: CLP 20.000–30.000; reducción modelada:
CLP 318.000–328.000. No es ahorro realizado hasta Billing Export a 24 h, 7 días y cierre mensual. Encender de
nuevo requiere autorización explícita de gasto y seguir sin saltos
`docs/operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md`: `hibernated -> draining`, integridad y
readback no facturable, luego `draining -> active`; ante falla se vuelve primero a `draining`.

Las skills espejo `greenhouse-globe` y `greenhouse-globe-model-fleet` ya bloquean deploys, migraciones,
generaciones, canarios y promociones mientras el estado siga hibernado. El ledger de modelos conserva evidencia
histórica de integración, pero deja explícito que `available` no significa ejecutable durante la hibernación.

## 2026-09-02 (3) — cada task ETV/cluster incluye tools y skills MCP

Las nueve tasks de la secuencia (`1805`, `1806`, `1312`, `1313`, `1314`, `1808`–`1811`) declaran ahora un
`MCP Tools & Skills Contract` exigible. Cada una debe crear o actualizar tools, lane ecosystem,
manifest/artefacto, federación o exclusión razonada y las skills `dataforseo-operator`/`seo-aeo` espejadas. Si el
registro de skills servidas de `TASK-1804` existe al ejecutarla, también actualiza ese recurso agent-facing.

Las tools read no compran datos on-read. Writes o gasto siguen bajo capability fina,
`propose → confirm → execute`, presupuesto, idempotencia y audit; el cliente PKCE público nunca recibe write
scope. El cierre requiere canaries allow/deny/fault y readback real del gateway. Cambio documental solamente:
sin código, tools creadas, gasto, deploy ni runtime mutation todavía.

## 2026-09-02 (2) — cinco endpoints Labs sin caller quedan repartidos en cuatro tasks

El operador confirmó que quiere usar las cinco familias que `TASK-1805` había dejado
`provider_supported_not_enabled`. Se registraron bajo `EPIC-022`: `TASK-1808` Category Market Intelligence
(`categories_for_domain` + `domain_metrics_by_categories`), `TASK-1809` SERP competitor market SoV,
`TASK-1810` Page Intersection y `TASK-1811` Historical Bulk. Todas son backend-critical, nacen sin UI y exigen
Improved ETV explícito, persistence append-only, reader/API/MCP y gates de gasto/rollout.

La taxonomía de DataForSEO es evidencia externa: nunca reemplaza ni crea `seo_topic_clusters`; cualquier binding
usa `propose → confirm → execute`. `TASK-1314` conserva cero provider calls y compone los readers de 1808/1810.
El runtime actual sigue con cero callers para estos cinco endpoints. Registrar las tasks no implementó código,
schema, llamadas, gasto, flags, deploy ni cutover. Próximo ID libre: `TASK-1812`.

## 2026-09-02 — DataForSEO confirma el corte irreversible de Improved ETV

La respuesta contractual de DataForSEO cerró las preguntas de `TASK-1805/1806`: 14 familias ETV-capable,
sin premium por improved, históricos recomputados completamente desde julio de 2026 y aproximados antes mediante
el ratio de julio por dominio. El corte global es `2026-11-01T00:00:00Z`; desde entonces `false` se ignora y no
existe fallback legacy. La respuesta no trae formula version, así que el contrato interno usa método solicitado,
instante UTC, policy version y método efectivo derivado.

`TASK-1805` queda P0 sin blocker contractual, target interno 2026-10-15. `TASK-1806` sube a P0 deadline-bound:
shadow/decisión objetivo 2026-10-23 y cutover 2026-10-28T00:00:00Z. El repo llama nueve familias: seis familias/
siete caminos consumen ETV, tres callers lo ignoran bajo guard y cinco familias permanecen no habilitadas.
Rollback legacy sólo existe antes del corte; después el safe mode congela capturas y sirve la última serie
coherente. Esta actualización fue documental: no hubo código, schema, llamadas, gasto, flags, deploy ni cutover.

## 2026-09-01 (16) — Emma distribuye handoffs por intención y disponibilidad

El Customer Agent `Emma` del portal ANAM `19893546` quedó conectado al workflow activo `1876744588`. La matriz
publicada es cotización/nuevo negocio: Pablo Puga → Maria Paz Haeger; seguimiento: Marco Jiménez Venegas → Pablo
Puga; Calidad, facturación y otros: Maria Paz Haeger → Marco Jiménez Venegas. El copy al visitante permanece
neutral.

La primera prueba pública (`48103382175`) encontró dos defectos: Emma ya era propietaria del ticket y bloqueaba
las asignaciones sin sobrescritura; además `PRUEBA QA INTERNA` sesgó el clasificador hacia Calidad. Se restauró
temporalmente el handoff directo a María Paz, se agregó el borrado de owner antes de la ramificación y se reforzó
el prompt para ignorar metadatos de prueba. Después se reactivó y reconectó el workflow.

La regresión E2E pasó con tickets reales de QA: `48103069613` cotización → Pablo; `48105602378` seguimiento →
Marco no disponible → Pablo; `48094218332` Calidad → María Paz. Los widgets mostraron los propietarios finales,
los action logs terminaron correctamente y los chats de prueba quedaron cerrados. Readback final: workflow activo,
sin problemas y seleccionado por Emma. Evidencia: `docs/audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md`.

La documentación separa ahora trigger, asignación y continuidad. La QA demostró routing y owner visible, pero no
una respuesta humana ni una segunda reasignación en el mismo chat. En live handoff, el owner humano puede
reasignar manualmente el ticket mientras el chat siga abierto; el workflow vigente no resuelve nombres escritos
libremente. No se requirió ADR: se documentó el comportamiento existente sin modificar runtime, ownership ni
arquitectura.

## 2026-09-01 (15) — Customer Agent ANAM adopta la identidad Emma

El Customer Agent del portal ANAM `19893546` quedó alineado con la landing: el nombre visible cambió de
`Agente de clientes de ANAM` a `Emma` y el saludo guionizado de `Soy ANA, de ANAM` a `Soy Emma, de ANAM`.
HubSpot confirmó `Perfil actualizado` y `Cambios publicados`; el readback mostró `Agente de clientes, Emma`,
preview `Hola, soy Emma.`, saludo exacto y `Borrador (0)`.

El cambio no tocó personalidad (`Amigable`), idioma, conocimiento, permisos, acciones, handoff, routing,
canales, chatflow ni datos CRM. Tampoco abrió o envió una conversación real. El preflight dejó dos advertencias
preexistentes sobre `Registraré tu consulta`; se documentaron como deuda separada porque corregirlas requiere
aprobación y regresión conversacional propia.

La evidencia y el contrato vigente están en
`docs/audits/ANAM_CUSTOMER_AGENT_EMMA_IDENTITY_QA_2026-09-01.md` y en el source pack. Se actualizaron además la
documentación funcional, el manual, el changelog client-facing y las referencias espejadas de la skill
`hubspot-as-a-service`. No se requirió ADR: fue una edición reversible de identidad, sin cambio de autonomía,
ownership, permisos ni arquitectura.

## 2026-09-01 (14) — La landing ANAM pasa a una experiencia editorial centrada en Emma

La landing pública `https://anam-2.hubspotpagebuilder.com/agente-anam` sirve el build `#28` del proyecto
`kortex-cms-react` en el portal ANAM `19893546`. La pantalla dejó el layout institucional de tarjetas y ahora
presenta a Emma como concierge: hero asimétrico, una superficie única para seleccionar intención, un solo CTA
`Conversar con Emma` y un panel navy con disponibilidad, orientación, protección de datos y derivación humana.

HubSpot renderiza el módulo React en servidor, por lo que la selección se implementó en el controlador Hubl
existente: los tres botones usan `aria-pressed` y sólo preparan el contexto; el CTA final es el único nodo que
abre el chat. El smoke confirmó selección por clic y teclado y transferencia de
`requerimiento_calidad` al CTA, sin abrir ni enviar una conversación real.

El feedback visual del operador quedó incorporado antes del cierre: se eliminó el espacio blanco inferior
recortando la decoración dentro del hero y reseteando el margen del body; el header usa ahora
`anam-logo-horizontal.svg`, copiado del catálogo canónico del repo y sin el círculo superior, a `199x54` en
desktop y `166x45` en mobile. Playwright live en `1440x1100` y `390x1000` confirmó HTTP 200,
`scrollWidth === clientWidth`, `bodyMargin=0px`, tres opciones íntegras, interacción por teclado y cero errores
de consola, página o red. Evidencia: `.captures/anam-emma-premium-build27-2026-09-01/`.

El uniforme de Emma quedó corregido en `anam-virtual-executive-v2.png` mediante edición generativa: el bordado
ya no dice `AUTORIDAD NACIONAL DEL AMBIENTE`, sino `ANÁLISIS AMBIENTALES S.A.`. Se descartó explícitamente
un montaje tipográfico determinista y se mantuvo el asset anterior como rollback. El readback #28 confirmó el
nuevo archivo tanto en desktop como en mobile sin alterar layout, interacción ni overflow.

La fuente sigue en `/Users/jreye/Documents/dev/kortex/hubspot-cms-react-project`; el cambio quedó en el commit
`2ae3b42`. `hs project validate --profile anam` pasó y `hs project upload --profile anam` construyó y
auto-desplegó #28.

La continuidad quedó sincronizada en las capas técnica, funcional y operativa: canon y runbook CMS, documento
end-to-end, manual ANAM, dirección visual, changelog client-facing y referencias espejadas de la skill
`hubspot-as-a-service` para Codex y Claude. `project_context.md` ahora enruta explícitamente este seam; `AGENTS.md`
y la arquitectura de la oferta no cambiaron porque el trabajo no alteró ownership, schema, permisos ni el modelo
de servicio.

## 2026-09-01 (13) — Emma reemplaza al personaje masculino en la landing ANAM

La landing pública `https://anam-2.hubspotpagebuilder.com/agente-anam` sirve ahora el build `#23` del
Developer Project `kortex-cms-react` en el portal ANAM `19893546`. El único cambio funcional fue reemplazar
`anam-virtual-executive.png` por una asistente virtual femenina coherente con el nombre Emma y corregir el ALT
a `Emma, asistente virtual de ANAM, sonriendo`; las dimensiones intrínsecas quedaron sincronizadas en `900x675`.

La fuente vive en el checkout externo
`/Users/jreye/Documents/dev/kortex/hubspot-cms-react-project` y conserva dos cambios locales sin commit: el PNG
y `KortexLandingHero/index.jsx`. `hs project validate --profile anam` pasó; `hs project upload --profile anam`
construyó y auto-desplegó `#23`; el readback público convergió desde el bundle cacheado `#22` a
`kortex-cms-react/23`.

Playwright anónimo sobre `1440x1100` y `390x1000` confirmó HTTP 200, Emma visible, ALT y asset del build 23,
`scrollWidth === clientWidth`, cero errores de consola, cero page errors y cero requests fallidas. Evidencia:
`.captures/anam-emma-build23-2026-09-01/`. No se modificaron el Customer Agent, los intents, el chatflow, CRM,
copy visible ni el portal Greenhouse `48713323`.

## 2026-09-01 (13) — TASK-1671 cerrada: la pantalla existe, pero nada está desplegado

`TASK-1671` quedó `complete`. Con eso **ninguna task bloquea el flip**, pero el flip sigue sin poder
hacerse, y por una razón distinta de la de ayer: ya no falta código, falta **despliegue**.

Verificado en vivo el 2026-09-01, no leído de un doc:

- `origin/develop` y `origin/main` **no tienen** `site-findings.ts` ni `SiteAuditSiteFindings.tsx`.
- La revisión activa del ops-worker (`ops-worker-00625-5qj`) **no tiene la env var**
  `GROWTH_SEO_SITE_FINDINGS_ENABLED`. Está OFF por AUSENCIA. Prenderla hoy con `--update-env-vars`
  no haría nada: esa revisión no tiene el evaluador.
- La migración `finding_scope` **sí** está aplicada: es la única pieza que ya cruzó a la base
  compartida (aditiva, default `page`, 4.977 filas históricas clasificadas; nadie la lee todavía).

Qué se construyó: región propia "Acceso y presentación del sitio" entre la salud y la lista,
alimentada por `partitionAuditIssuesByScope` desde UNA sola pasada de agrupación — no hay una
segunda lista con su propio orden. El bloqueo de entrenamiento lleva etiqueta textual propia
("Decisión declarada"); el filtro `?severity=` no alcanza a la región; el empty de la lista pasó a
decir "Sin problemas de PÁGINA" porque sin ese alcance se contradecía con un crítico de dominio.

Dos cosas que la revisión visual corrigió, y que ningún gate habría atrapado:

1. El alcance flotaba a la derecha en desktop y caía huérfano al final de la fila en 390px. **El
   wireframe que yo mismo escribí estaba mal**: decía "misma posición que N páginas afectadas"
   cuando esa posición real es un caption bajo el título. Corregido el código y el wireframe.
2. Con un único chequeo sin verificar, la región decía "Verificado" y "No pudimos verificar" a la
   vez — el falso sano de TASK-1670 reintroducido en la UI. Lo cazó su propio test.

⚠️ **Deuda declarada:** la región poblada no tiene evidencia de runtime. El flag está OFF, la tabla
es append-only sobre una instancia compartida con producción, y encolar un crawl le cargaría
presupuesto al cliente. Los frames del scorecard salen de una ruta local temporal (no commiteada)
con el componente real y props representativas: sirven para layout y responsive, no para runtime.
Esa evidencia se produce en el paso 3 del runbook del flip.

Próximo paso: desplegar (`TASK-1670` + `TASK-1671`) y recién entonces el flip.
Sin push. Runbook: `docs/manual-de-uso/growth/operar-hallazgos-de-sitio-seo.md`.

## 2026-09-01 (12) — TASK-1670 cerrada, y el punto ciego del audit SEO SIGUE ABIERTO

`TASK-1670` quedó `complete` como **`code complete, rollout pendiente`**. La distinción importa más
que el resumen: el motor de hallazgos de sitio existe y está verificado, pero
`GROWTH_SEO_SITE_FINDINGS_ENABLED` nace **OFF** y no se prende hasta que `TASK-1671` esté desplegada.
Hasta ese flip, **un sitio que bloquea a los crawlers de IA sigue puntuando 95/100 y presentándose
como sano**. El merge no cerró el agujero.

Qué quedó en `develop`: migración aditiva `finding_scope` (`page`|`site`) sobre
`seo_site_audit_findings` — aplicada, 4.977 filas históricas clasificadas sin backfill —;
`growth/seo/site-audit/site-findings.ts` con los cuatro chequeos (crawlers de IA en `robots.txt`,
acceso en el borde/WAF, JSON-LD ausente, salud de sitemap); materialización en el collect detrás del
flag; `findingScope` aditivo en el reader canónico; y 7 fichas es-CL con el drift test corriendo
contra la unión de los dos allowlists.

Tres cosas que el próximo agente debe saber antes de tocar esto:

1. **Retrieval y training no comparten severidad.** Bloquear el rastreo que te cita es `critical`;
   bloquear el de entrenamiento es `notice` con lectura de postura y **nunca** `critical` — es una
   decisión de derechos, y pintarla en rojo enseña al cliente a ignorar la severidad más alta.
2. **El chequeo de borde usa NUESTRO token variado, jamás el de un bot ajeno.** Suplantar `GPTBot` o
   `OAI-SearchBot` es evasión verificable por DNS inverso. El criterio de aceptación que pedía lo
   contrario quedó corregido en la spec.
3. **La verificación con red real encontró un bug que ningún test con mocks podía ver**: contra
   `reuters.com`, un `robots.txt` que nos prohíbe la ruta se reportaba como sitemap roto — le
   inventábamos un defecto a un archivo que nunca miramos. Corregido a "no verificado" + regresión.

Próximo paso: `TASK-1671` (desbloqueada, `Blocked by: none`). Es dueña del flip y por lo tanto del
cierre real del agujero. `TASK-1672` conserva su gate: el flag en `ON` con corrida verificada, no un
merge.

Sin push. Cinco commits locales en `develop`.

**Capa documental completada el mismo día (tres agentes en paralelo).** El cierre anterior sólo tenía
la capa técnica (§10.6 de la arquitectura); el protocolo pide tres. Ahora existen: doc funcional
(`docs/documentation/growth/hallazgos-de-sitio-audit-seo.md`), manual + runbook del flip
(`docs/manual-de-uso/growth/operar-hallazgos-de-sitio-seo.md` y la actualización de
`usar-auditoria-sitio-seo.md`), y las skills de oficio corregidas: `seo-aeo/modules/01_SEO_TECHNICAL.md`
§8 pasó de cuatro viñetas descriptivas a siete reglas accionables con su razón, y
`dataforseo-operator/references/04-onpage.md` dejó de implicar que nadie resuelve lo que OnPage no ve.
Los cinco documentos declaran el flag OFF y el punto ciego abierto — ninguno promete la capacidad. La
skill agrega la consecuencia operativa de hoy: al auditar, estas verificaciones se hacen a mano.

## 2026-09-01 (11) — Brand Visibility Grader entra al menú público

El menú primario de WordPress (`Menu 1`, ID 61) suma el ítem custom `251916`, **Brand Visibility
Grader**, bajo `Recursos` (`242524`) y con destino
`https://think.efeoncepro.com/brand-visibility`. La escritura se hizo por la API nativa de menús con
el usuario operativo de WP-CLI, luego de confirmar que el enlace no existía y que los 26 ítems
anteriores tenían `menu_order` persistido igual al orden visible.

Snapshot recuperable: `_gh_backup_before_brand_visibility_menu_20260901T212219Z`. La verificación
post-write confirmó 27 ítems, el nuevo en posición 27 y los 26 previos sin cambios. Se purgaron el
object cache de WordPress y el cache de Kinsta. Playwright anónimo live verificó el submenú y el clic
en 1440 px y 390 px: destino HTTP 200, título correcto, `scrollWidth === clientWidth` en origen y
destino, y cero errores de consola. No hubo cambio de código, deploy, Elementor ni contenido del
Grader.

## 2026-09-01 (10) — TASK-1807 tomada: reducción GCP con guardrails por workload

El operador aprobó ejecutar la reducción urgente de gasto GCP. `TASK-1807` quedó `in-progress`, con baseline live
de CLP 538.785 netos en agosto y ~CLP 540.383 de run-rate. Los tres Cloud Run Jobs de Globe explican ~CLP
286.196, pero la ejecución no aplica el mismo cron a los tres: la skill y el contrato runtime de Globe registran
que Asset Governance avanza una etapa por tick y que `*/5` elevaba la convergencia en frío a ~20–25 minutos.

Orden vigente: Producer `* * * * * -> */5` con Terraform/readback/rollback; observar 24 h; Media `*/2 ->
2-59/5` con señal de backlog; Asset Governance conserva `*/1` hasta un rediseño multi-stage o event-driven con
ADR y canary. No hay autorización para CUDs, eliminación de artefactos/secretos ni cancelación de suscripciones.
Plan: `docs/tasks/plans/TASK-1807-plan.md`.

Slice 1 quedó aplicada a las 20:55Z: plan `0 add/1 change/0 destroy`, apply `0/1/0`, post-plan `No changes`.
Primer tick de la nueva cadence: `globe-producer-worker-2lq2v` a las 21:00:07Z, sano y no-op:
`queueOldestAgeSeconds=0`, retry storm/terminal attempts/divergencias/fallos en 0. La ventana de 24 h sigue abierta;
Media no cambia antes de cerrarla.

Slice 5 quedó operativo: dos budgets alert-only en CLP (Globe 250.000; consolidado 370.000), umbrales actuales
50/75/90/100% y forecast 90/100%, post-plan sin drift. Greenhouse `aad71bf07` reconcilia neto = bruto + créditos
y estabiliza el cooldown; 5 pruebas focales pasan y el dry-run no envía notificaciones. En 30 días Globe midió
CLP 350.442 brutos, CLP -2.218 en créditos y CLP 348.224 netos.

Globe `5b01e99` agregó labels a 33 recursos y retention de Artifact Registry en dry-run: 418 versiones / 10,4 GB,
KEEP 10 por paquete y DELETE simulado >30 días; cero eliminaciones. Con autorización del operador, Globe fue
publicado hasta `7eeb1da`. Asset Governance quedó desplegado por el workflow canónico `33561719287` sobre el digest
`sha256:864a33c2ac30a9e10b4ab17c4b34c51cb149a4e1fc22889680875af322c69095`, con cuatro stages máximos por
ejecución, scheduler restaurado `ENABLED`, cron `*/1` y post-plan sin drift. La reconciliación fue sana pero no-op
(`claimed=0`, `failed=0`, cola 0), así que no sustituye el canary con asset real y no habilita espaciar el cron.
Greenhouse sigue local y no fue publicado.

## 2026-09-01 (10) — ISSUE-167 resuelto: el foco no era del form, era del eje de modelado

Resuelto el mismo día que lo abrí. **Code complete, rollout pendiente**: el bundle desplegado sigue
siendo el anterior, así que en producción el defecto continúa hasta el próximo release.

La primera lectura culpaba al path del form. Al abrir el código apareció lo real: el comportamiento
existía **dos veces y distinto** —`slide-in` con foco-return y `Escape` a nivel de shell,
`meeting-action` con el suyo propio— y faltaba una tercera. El foco y la salida por teclado se
habían modelado como propiedad del **placement**, no de «hay una superficie revelada por activación
del usuario». Por eso `embedded` no las heredaba.

Primitive canónica `src/growth-cta-renderer/disclosure-focus.ts`. Es disclosure y no modal (sin
focus trap ni `aria-modal`), y **`Escape` se escucha en el contenedor, jamás en el documento**: un
CTA incrustado no puede secuestrarle el `Escape` a la página del cliente.

🔴 **El hallazgo que vale más que el arreglo de accesibilidad salió del test:** `Escape` estaba por
emitir `dismissed`, que es una **señal de negocio** —«el visitante rechazó la oferta»— que viaja al
ledger de conversión. Cerrar un formulario abierto por curiosidad no es rechazar el CTA. Ahora
`Escape` **colapsa** al card sin telemetría, y el botón «✕ Ahora no» sigue siendo el único rechazo.
El colapso queda deliberadamente sin evento: el vocabulario de `cta_conversion_event` no tiene
`form_closed` y agregarlo es cambio de contrato server-side.

Verificación: 8 tests de la primitive + 3 del cableado, **falsificados** revirtiendo el arreglo (2
rojos de 22; 47/47 con él). Y un riesgo que jsdom no habría atrapado, cerrado con medición contra el
DOM real de producción: si `<greenhouse-form>` montara en shadow DOM el selector no lo vería y el
arreglo sería inerte — verificado que no usa shadow DOM y expone 5 controles al selector exacto.

`meeting-action.ts` conserva su gestión propia: funciona, no tenía defecto medido, y refactorizarla
sin necesidad era riesgo sin retorno. Queda como consumidor candidato.

Próximo paso: release develop→main + rebuild del renderer, y repetir el recorrido con teclado en
vivo en ambos hosts antes de dar el issue por cerrado operativamente.
