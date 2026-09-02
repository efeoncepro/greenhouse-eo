# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

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

## 2026-09-01 (9) — cinco oportunidades LicitaLAB promovidas por MCP HubSpot

El operador confirmó la promoción manual de cinco oportunidades. El MCP de HubSpot creó y releyó los Deals
`64528962434` (Chile Cultura), `64544277070` (Universidad de Chile DII), `64529115746` (JUNJI), `64532229714`
(Temuco) y `64521733176` (CNTV), todos en `default` / `qualifiedtobuy`, owner `75788512`, con ID de licitación,
llave de idempotencia, ficha, plazo, próximo paso y asociación Deal ↔ Company verificada. Temuco y CNTV requirieron
Companies nuevas `57953559382` y `57958935823`; no se fabricaron contactos. CNTV quedó en `Strategic Bets`, no en
una etapa ficticia: el stage sigue siendo `qualifiedtobuy`.

Corregida la contradicción entre skills: `hubspot-greenhouse-bridge` ahora coincide con el companion LicitaLAB y
con `project_context.md`: el MCP de HubSpot es el writer gobernado para promociones manuales confirmadas; la brecha
del bridge sólo limita automatización. Registros CRM general y de licitaciones sincronizados tras readback. Pendiente
comercial real: admisibilidad, loaded cost/margen y producción de propuestas; ninguna postulación fue enviada.

## 2026-09-01 (6) — barrido documental de los 19 cierres y la calibración que faltaba

Cerré el ciclo del barrido: 19 tasks quedaron en `complete/` y el registro alrededor de ellas ya no
miente. Tres subagentes barrieron docs de proceso, ledger de flags y coherencia epic↔registro; lo que
reportaron lo verifiqué yo antes de escribirlo — los conteos de hijas los medí por campo `Epic:`
(`EPIC-022` 36/39, `EPIC-020` 38/14, `EPIC-040` 11/10, `EPIC-023` 7/3) y coincidieron.

Corregido: `Lifecycle` desincronizado en `TASK-1090`; 5 rutas stale en `README`/`TASK_ID_REGISTRY`;
9 estados falsos en el `README` (1036, 1040, 1253, 1321, 1330, 1335, 1113, 1430, 1431); conteos y
prosa stale en cinco epics y en `AEO_PROGRAM_STATUS.md` —que decía «no existe entrada pública
self-serve» cuando `/aeo-2/` ya corre el grader—; 10 archivos con rutas rotas a tasks cerradas; y
las reglas duras de `TASK-1112`, `TASK-1246`, `TASK-1261` y `TASK-1336` que se apoyaban en un hecho
ya falso.

Lo estructural, que es el hallazgo de fondo: **el registro del avance no estaba en ningún checklist
de cierre**. `stale-progress` avisaba en un comando que el protocolo no mandaba correr — un
mecanismo apagado. Quedó agregado a los checklists de `CLAUDE.md` y `AGENTS.md`: tildar los
criterios que la evidencia respalda, dejar sin tildar y con razón lo que no, poner `Status real` al
día y correr `pnpm task:lint --task TASK-###` antes de mover a `complete/`.

Además: `ui-flow-contract` recibió la misma calibración incidental-vs-focal que ya tenía
`ui-wireframe-contract` —una task en `to-do/` a la que sólo le corrigen una ruta no debe romper el
gate por deuda previa—, con test falsable (rojo sin la calibración, verde con ella; el fixture hace
`git init` porque sin repo el modo `changed` no ve nada y el test sería teatro). El footer de
`flags:audit` decía «verdad live = `vercel env ls`»; `ls` sólo dice que la variable existe, así que
ahora nombra `vercel env pull`. Y el mensaje de `no-opacity-on-text` estaba en voseo.

Gates: `local:check` exit 0, `task:lint:test` 47/47, `ops:lint --changed` errors=0,
`docs:closure-check` sin dueño faltante, `docs:context-check:strict` 0/0, 262 tests de lint-rules.

## 2026-09-01 (9) — TASK-1427 cerrada: el motor CTA queda con evidencia medida, y deja ISSUE-167

Cerré la primera rebanada del motor CTA. Lo importante no es el cierre sino cómo se sostuvo.

**La ventana de 7 días era un falso verde.** El criterio pedía observar `growth.cta.*` durante siete
días tras el deploy del 2026-07-18. Medido contra PG: entre el 18 y el 25 de julio hubo tráfico **un
solo día**. Cero errores sobre cero tráfico no prueba nada. Cerré con la serie completa de 45 días —
0 errores server-confirmed, 0 kill switches, 0 colisiones, con exposición real (219 observaciones el
2026-08-29). Es evidencia más fuerte que la pedida, sobre una ventana más larga.

⚠️ **Los readers de signal no podían responder la pregunta.** `growth-cta-signals.ts` filtra
`INTERVAL '1 day'` en sus tres queries: sirven para «¿está sano ahora?», nunca para «¿estuvo steady
durante N días?». Cualquier criterio de ventana exige ir a la tabla base. Dejé
`scripts/growth/_sanity-cta-signal-window.ts` para que la próxima sea medición y no cita.

🔴 **Probar el teclado destapó `ISSUE-167`.** Me negué a tildar «funciona con teclado, Escape/focus
restore» sin ejercitarlo, y en producción encontré que al abrir el Growth Form desde un CTA **el foco
queda en `body`** y **`Escape` no cierra**. Abre como expansión inline (sin `role=dialog` ni
`aria-modal`) pero sin las dos obligaciones de ese patrón. Es del **renderer compartido**: afecta a
todos los CTA en Think y WordPress. La task cierra con ese criterio **sin tildar y con la razón
escrita**, que es el desenlace correcto.

Sí verificado live hoy: render con el contrato completo, sin overflow en 1280 y 375 (card 343px),
formulario alcanzable por teclado tabulando (5 controles, primero `firstName`).

**Pendiente NO bloqueante, decisión del operador:** el placement AMPLIO en WordPress (recomendado,
posts del blog vía `the_content` en `ohio-child`). Hoy sólo existe la página de prueba.

Transparencia: mi verificación sumó 2 eventos al ledger productivo (`clicked` + `form_opened`).
