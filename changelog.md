# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-03 — TASK-1806 seguimiento: alerta Teams determinista para drift de metodología ETV

Nuevo cron `ops-seo-etv-drift-watch` (Cloud Scheduler, diario 12:00 America/Santiago, sin flag) en el
ops-worker: lee la señal existente `seo.etv_methodology.drift` y avisa a Microsoft Teams sólo si
`severity=error`, vía el dispatcher determinista `sendManualTeamsAnnouncement` y un destino nuevo
`growth-seo-reliability-alerts` (mismo canal "EO - Admin" que `production-release-alerts`). Antes,
la única forma de enterarse era abrir `/admin/operations`. Verificado en vivo (rev `ops-worker-00637-2ww`):
respondió `warning`/`alerted:false`, correcto para el estado actual de la señal.

## 2026-09-03 — TASK-1806: Improved ETV de DataForSEO en producción (rebaseline versionado)

Release `bda12be7e33a` (PR #218, orquestador `33758619690`, manifest `released` 13:14Z, watchdog `ok`). El módulo
SEO sirve desde hoy `improved_layout_clickstream_v2` en los siete caminos consumidores: ops-worker (`deploy.sh`,
rev `00636-h6w`) y Vercel Production+staging con ambos selectores en improved; canary de contrato 13:15:26Z sobre
los lanes de Berel. Antes: contract de schema ETV aplicado (`20260903103858964`), shadow `exact_ab` de 26 requests
(USD 1,095) evaluado contra Search Console — improved 6× mejor calibrado en Berel (err. rel. 49 % vs 321 %),
Jaccard 1,0 en páginas/subdominios, historia continua —, memo de decisión y aprobación del operador; drill de
rollback en staging; rebaseline acotado (historia improved de Berel y Comex, USD 0,2568). Las cifras de tráfico
estimado bajan ≈ 60 % por cambio de fórmula del proveedor, no por pérdida real; cada cifra declara `etvMethodology`.
Efeonce se mide aparte de los clientes (guard de organización en celdas bulk). Writers `rowsWritten` ahora cuentan
filas insertadas. Legacy sólo vuelve como rollback antes del corte 2026-11-01T00:00:00Z.

## 2026-09-03 — Berel: cobertura por negocio, skills sincronizadas y minería trazable

Decisión local del operador 2026-09-02: fortalecer elección, protección y aplicación, manteniendo color
y paletas. [Estrategia](docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md), inventario de 49 cuerpos,
modelo/brief/manual/funcional y skills espejo Berel/SEO-AEO/DataForSEO actualizados; Playbook Notion
ampliado y releído. [Discovery](docs/audits/seo/BEREL_CAPILLARY_KEYWORD_MINING_2026-09-02.md):
14 runs Labs, 1.517 keywords distintas, 13 SERPs y 52 PAA; costo reportado US$1,23572.
Mapa propuesto de 27 intenciones, no 27 artículos aprobados. No tracking, calendario, CMS ni release.
Ampliación 2026-09-03: skill Berel y espejos incorporan completitud técnica por macropaso, correcciones
acotadas y conciliación de producto; se retira la inferencia «campo CMS vacío = tiempo inexistente».
Control técnico y caso Berelex Semibrillante en módulos 12/13; N29 corregido en Notion, artes y
derivados pendientes, sin publicación. Evidencia: [QA de guardrails](docs/audits/seo/BEREL_TUTORIAL_GUARDRAILS_2026-09-03.md).
Clasificación de piezas: 51 tareas corregidas y releídas; la skill exige tipo/canal/formato
y excluye principales del conteo visual. [Auditoría y límites](docs/audits/seo/BEREL_PIECE_COUNT_CLASSIFICATION_2026-09-03.md).
Tipo/canal obligatorios desde la creación de cada tarea visual, incluidos bloqueados; requisitos y
checklists explícitos en banners, sociales y fotos. Se mantiene el esquema y la agrupación existentes.
Distribución: cuatro opciones, no cuatro derivados obligatorios; módulo 15 y matrices por artículo.
Playbooks Social/Producción en Notion alineados, Instagram Story corregido, contrato 8 artículos
de 3.000–5.000 palabras/50 gráficas/3 videos y cortesía extendida a nov/dic registrados. Octubre
excluido. Aclaración: 50 incluyen blog/RRSS; Blog/Facebook/Instagram/Pinterest. Priorización N52→Navidad
aprobada: 4 banners N52 fuera del paquete, 4 banners y 2 sociales N59 creados. Distribución 50 gráficas
+ 3 videos por mes, con reservas técnicas/editoriales; 193 páginas modificadas releídas, sin pérdida de historial.

Corrección de numeración verificada: [mapa por ID y readback 179/179](docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Skill Berel módulo 16: bloques mensuales completos, reserva de slots, cambios coordinados y aliases
de archivos; no numerar por orden de trabajo. Se preserva el corte histórico descrito arriba.
Complemento de `1fcc2ade3`: metodología de research SEO/AEO y DataForSEO versionada con su referencia
canónica de minería, gate de espejos y documentación de priorización/brief/operación; sin cambios runtime.

## 2026-09-03 — TASK-1805 en producción: foundation ETV versionada desplegada, selección legacy explícita

Release `5ec4cf769977` (run `33698245254`): readers/lane/MCP sirven `etvMethodology`, señal `seo.etv_methodology.drift`,
readback del selector en `/health` del ops-worker, selectores `legacy_static_v1` explícitos en Vercel y worker,
gateway sincronizado. Canary de contrato en producción verde. Contract de schema parqueado con condición de 7 días
(precondición de `TASK-1806`). Improved ETV no activado.

## 2026-09-02 — TASK-1805: la fórmula detrás de `etv` pasa a ser identidad del hecho (foundation, todavía legacy)

DataForSEO cambia el cálculo de `etv` bajo el mismo campo y corta legacy el `2026-11-01T00:00:00Z` sin exponer
versión. Greenhouse deja de depender del default: una policy pura endpoint-aware construye `use_improved_etv`
explícito por request (falla cerrado ante familia ignorada/no habilitada, config inválida o legacy desde el
corte), las tres tablas ETV ganan versión + evidencia + instante UTC + policy (expand aplicado; filas previas
`legacy_static_v1` por contrato, nunca por fecha; guard de corte en la base), los siete caminos consumidores la
persisten, readers/API/MCP sirven UNA fórmula con `etvMethodology` y `not_available_for_method`, la señal
`seo.etv_methodology.drift` compara configurado vs solicitado en Vercel y ops-worker, y un evaluador
dry-run/replay compara valor, membresía del top-N, traffic cost y prospecto sin gastar. Contract de schema
parqueado hasta el release. Estado: code complete, rollout pendiente; Improved ETV NO activado (`TASK-1806`).

## 2026-09-02 — DCR deprecado en MCP `2026-07-28`: el shim del gateway se queda, pero deja de ser el futuro

La revisión Current del protocolo marcó Dynamic Client Registration como `Deprecated` (PR #2858),
migración a Client ID Metadata Documents, retiro más temprano en la primera revisión publicada en o
después de 2027-07-28. El shim se mantiene porque la excepción está redactada para nuestro caso exacto:
DCR se retiene *"for backwards compatibility with authorization servers that do not support Client ID
Metadata Documents"*, y Entra no soporta ninguno de los dos — su única vía oficial es el pre-registro,
que es justo lo que `POST /register` devuelve.

Lo que cierra la pregunta de fondo: **CIMD no es implementable en la capa del shim.** Es capacidad del
authorization server, el AS es Entra, y el gateway espeja `authorize`/`token` en lugar de proxearlos;
soportarlo exige emitir los tokens, o sea el broker que `TASK-1631` ya está eligiendo con CIMD entre sus
requisitos. No hay task paralela que abrir.

En el camino aparecieron tres cosas que la evaluación no buscaba. La misma revisión agregó texto que no
existía en `2025-11-25` —el `issuer` de la metadata debe ser idéntico al identificador con que se
construyó la well-known URL— y los nuestros difieren desde que el shim existe; funciona sólo porque los
clientes todavía no lo aplican. El `client_id` estático compartido, con `http://localhost` sin puerto
entre sus redirect URIs y el consentimiento cacheado por Entra, reproduce la forma del confused deputy
aunque la letra del `MUST` no ate: lo acota que ese cliente no lleve scopes de escritura, una regla
escrita por otra razón que resulta ser la que limita el daño a lectura. Y esa misma aplicación se llama
"Local Canary Client" cuando es el cliente compartido de producción, de modo que quien la audite por el
nombre concluirá lo contrario de lo que debe.

El horizonte del shim no lo fija el calendario de la spec sino el día que un cliente endurezca
cualquiera de las dos validaciones. Para ese día queda declarado un plan B de pre-registro puro que no
toca Entra ni el modelo de tokens.

## 2026-09-02 — un release quedó huérfano en `main` y se recuperó sin ensuciar el control plane

La promoción `develop→main` (PR #215, 726 archivos, 1490 commits, 2 migraciones) entró a `main` a las
`20:51:04Z` y quedó **sin manifest**: la sesión que la promovía fue archivada por accidente antes de dispatchar
el orquestador. Otra sesión la retomó con autorización directa del operador y cerró el ciclo: run `33683893124`
completed/success en 11m50s, `release_id` `375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9`, estado final
`released`, con los dos gates `production` aprobados en 34 s y post-release health verde.

Tres verificaciones que no se dieron por hechas. El skip del `ops-worker` (51 s, step `Deploy` en `skipped`) se
validó con el **diff de árbol completo** y con `pnpm worker:deploy-path-gate` —1451 archivos del bundle, todos
cubiertos; `src/mcp` no entra, lo sirve Vercel—, no con la lista del change-gate. El `data_missing=4` del
watchdog se trató como falta de evidencia y no como drift: la lectura autoritativa fue `pnpm release:workers`,
3/4 workers en el target. Y el canary de contrato del lane MCP `skills` se corrió **después** del `released`,
con asserts que sólo el contrato nuevo puede producir.

Flags: `GROWTH_SEO_SITE_FINDINGS_ENABLED` prendido en el ops-worker con los dos pasos, tras probar **por blob**
que el evaluador desplegado es idéntico al de `main`. `HIRING_FAIRNESS_MONITOR_ENABLED` NO se prendió: daría
cero en silencio en una métrica de equidad hasta que cierre `TASK-1365`.

## 2026-09-02 — la práctica Salesforce se canoniza como oferta por outcomes y lifecycle

La práctica Revenue Operations & CRM incorpora una arquitectura comercial Salesforce en cuatro fases:
Diagnose & Architect, Implement & Integrate, Activate & Adopt y Operate & Evolve. El contrato separa CRM core,
Marketing Cloud Engagement y Marketing Cloud Next; define carriles de solución, ICP/anti-ICP, operator y buying
group, delivery, métricas, límites de claims y gates de madurez. El estado queda `Approved for validation`: no
autoriza todavía partnership, badge, certificaciones, reventa, pricing, casos ni Product Service comercialmente
aprobado sin evidencia y sign-offs propios.

## 2026-09-02 — MCP: el manual de uso viaja por el protocolo (TASK-1804, released)

La superficie MCP gana un segundo canal de conocimiento de uso: un manifiesto de manuales
(`skill-manifest.ts`) hermano del de tools, tres `SKILL.md` publicables en `docs/mcp/skills/`
(`seo-spend-discipline`, `seo-visibility-reading`, `competitor-loop`), la tool `get_greenhouse_skill`,
el recurso `skill://efeonce/<name>/SKILL.md` y la lane ecosystem `GET /api/platform/ecosystem/mcp/skills[/{name}]`,
todos sobre el mismo reader. Los cuerpos viajan en el bundle como artefacto generado (`pnpm mcp:skills:generate`
/ `mcp:skills:check`): leerlos del filesystem exigía `outputFileTracingIncludes` y Vercel rechazó el build (función sola
de 397 MB). Publicar es un acto explícito (drift manifiesto↔filesystem no construye el
servidor), un binding de cliente no sabe que los manuales existen (404 anti-oráculo) y la fuga de contenido
interno la controla un test. Las `instructions` del handshake rutean al manual en vez de contener el
procedimiento de gasto. El gateway federa la tool con su propio guard de paridad no-SEO (desplegado,
`efeonce-mcp-gateway-00028-pmx`) y la lane salió a producción en el release `375f56e24` del mismo día, con canary de
contrato verde contra producción. Sin Entra, flag ni persistencia nuevos. Follow-up del mismo día: un agente Claude Code
real cargó el manual por el front door OAuth, y el catálogo creció a seis manuales (discovery→tracking, salud técnica,
diagnóstico de prospecto) sin tocar la tool ni el gateway; los seis salieron a producción en el segundo release del día
(`4379c495013f`) con canary de contrato verde. Barrido documental posterior por subagentes: manuales de uso del
inventario MCP/gateway/provider SEO, docs funcionales de API Platform y gateway, deltas en arquitectura API/ADR del
gateway/patrones canónicos/arquitectura SEO, skills `dataforseo-operator` y `seo-aeo-practice`, y README/AGENTS del
repo `efeonce-mcp`.

## 2026-09-02 — ANAM: entrega premium de Emma y soporte explícito de tres meses

Se consolidó el cierre de la landing, identidad y handoff de Emma en dos PDF de cinco páginas: una especificación
técnica y una guía funcional. Los HTML/CSS son la fuente editable; los PDF, el master para cliente. Se revisaron
diez páginas rasterizadas, fuentes Poppins/Geist embebidas, composición, overflow y pies con sitio, correo,
teléfono y dirección. La captura final de la landing quedó versionada y los borradores Word supersedidos fueron
excluidos del paquete.

El borrador de correo para Óscar, María Paz, Pablo y Marco explica los cambios de landing e identidad, la matriz
de routing y el límite de las pruebas E2E. Quedó listo, no enviado. También registra el SharePoint consolidado
como compromiso pendiente para esta semana.

La documentación y las skills espejo ahora fijan el soporte de Customer Agent y KPI en tres meses, del
2026-08-13 al 2026-11-12 inclusive. Soporte cubre el alcance construido; nuevas funcionalidades, KPI, workflows,
automatizaciones, integraciones, rediseños e innovación requieren un alcance separado. No se cambió runtime
HubSpot, no se envió correo, no se creó SharePoint y no se hizo push.

## 2026-09-02 — La superficie MCP del módulo SEO pasa a tener eval de selección

TASK-1784 agregó un fixture de 55 preguntas de operador en los cinco mercados productivos y un runner que mide
tres precisiones que nunca se promedian: qué tool se elige, qué mercado se pasa y si se llamó a una tool que
gasta cuando no correspondía. Baseline registrado antes de tocar una descripción: tool 94.5%, mercado 98.2%,
gasto 100%.

El resultado contradijo la hipótesis con la que se escribió la task: agregar bloques de ruteo a las
descripciones NO mejoró la selección de tool, y en una variante degradó una tool que nadie había tocado. Lo que
sí funcionó fue corregir dos afirmaciones falsas — la cláusula de mercado ordenaba elegir un país en vez de
preguntar, y la lente dual reclamaba prioridad sin acotarla. La precisión de mercado llegó a 100%, cerrando la
elección silenciosa que costó un año de mediciones contra el país equivocado en ISSUE-152; la de tool bajó a
92.7% y se reporta sin declarar mejora.

El gate de CI mide cobertura del fixture, no precisión: una tool SEO nueva sin caso rompe el build. El guard de
paridad del gateway ahora compara la descripción, y al conectarlo encontró 21 de 27 tools federadas divergentes;
se cerró haciendo que el gateway derive el texto del artefacto en vez de mantener una copia. El redeploy de
`mcp.efeonce.org` queda pendiente.

## 2026-09-02 — Globe entra en hibernación profunda reversible

TASK-1807 incorporó una state machine Terraform `active | draining | hibernated`. Globe quedó en
`hibernated`: tres schedulers pausados, vías productivas cerradas, Cloud Run en scale-to-zero y Cloud SQL
`STOPPED/NEVER`; datos, backups/PITR, buckets, secretos, imágenes, identidades, front door, budgets y
observabilidad permanecen intactos. Los applies finales tuvieron cero deletes/replacements y el post-plan quedó
sin drift.

El runbook nuevo documenta el gate anti-borrado, todos los inputs de preservación, la secuencia segura de apagado
y encendido, los readbacks, rollback, monitoreo y medición de costo. El baseline era ~CLP 348.152/30 días y la
reducción modelada es CLP 318.000–328.000; el ahorro realizado queda pendiente de Billing Export a 24 horas,
7 días y cierre mensual.

Se sincronizaron los índices, arquitectura de persistencia, runbooks IaC/rollout/promoción, ledger de modelos,
plan TASK-1807 y prompt de sesiones nuevas. Las skills `greenhouse-globe` y `greenhouse-globe-model-fleet`
quedaron espejadas Codex/Claude con una compuerta que impide gasto o reactivación implícita.

## 2026-09-02 — tools y skills MCP pasan a ser Definition of Done de toda la secuencia ETV

TASK-1805/1806, TASK-1312/1313/1314 y TASK-1808–1811 exigen ahora crear o actualizar su tool MCP, lane,
manifiesto, federación y skill operativa en el mismo PR. Una tool existente se amplía en vez de duplicarse y toda
ausencia del gateway debe ser una exclusión razonada. Las lecturas no compran al proveedor durante el read; writes
y gasto conservan confirmación, capability fina y scope fail-closed. No cambió runtime: son criterios de ejecución
y cierre para trabajo futuro.

## 2026-09-02 — las cinco familias Labs restantes ya tienen ownership ejecutable

El backlog de Growth SEO incorpora `TASK-1808`–`TASK-1811`: categorías y mercado temático, competidores SERP por
keyword set, comparación entre páginas e historia bulk de cohortes. Las dos direcciones de categorías viven en
una task porque forman una sola capacidad dominio↔categoría; los demás endpoints conservan grano, costo y lifecycle
propios. Las cuatro tasks dependen de `TASK-1805/1806` y no habilitan llamadas por estar registradas.

Los contratos existentes ahora aclaran que DataForSEO sólo aporta evidencia para topic clusters, que
`TASK-1314` compone sin capturar y que las menciones históricas de `serp_competitors`/`page_intersection` no eran
callers reales. No cambió runtime, schema, gasto, flags ni deploy.

## 2026-09-02 — Improved ETV pasa de anuncio a contrato operativo

DataForSEO confirmó 14 familias ETV-capable, alcance sobre todos los ETV/traffic cost, precio sin premium,
históricos fully recomputed desde julio de 2026 y calibrados antes, y corte irreversible
`2026-11-01T00:00:00Z`. La arquitectura, auditoría, runbook, tasks y skills ahora distinguen 14 familias del
proveedor, nueve callers y seis familias/siete caminos consumidores; reemplazan el método «servido» no observable
por método efectivo derivado. `TASK-1806` pasa a P0 deadline-bound. No cambió runtime.

## 2026-09-01 — Emma enruta cotización, seguimiento y Calidad al equipo correcto

El handoff del Customer Agent ANAM dejó de depender de una única propietaria. El workflow activo `1876744588`
clasifica el ticket, elimina a Emma como owner y aplica la matriz Pablo → María Paz para cotización, Marco → Pablo
para seguimiento y María Paz → Marco para Calidad/facturación/otros, respetando disponibilidad. Tres chats públicos
E2E aprobaron las rutas de cotización y Calidad y el fallback real de seguimiento; el primer probe fallido permitió
corregir el owner previo y el sesgo de marcadores QA antes de dejar el flujo conectado.

El canon reusable distingue el trigger del Customer Agent, la asignación por workflow y la reasignación manual
entre personas. También registra el límite de evidencia: el owner visible quedó probado, pero la respuesta humana
y una segunda transferencia en el mismo chat abierto requieren una prueba operativa separada.

## 2026-09-01 — El Customer Agent de ANAM ya sabe que se llama Emma

El perfil y las directrices publicadas del Customer Agent en el portal ANAM `19893546` quedaron alineados con la
landing: nombre `Emma`, preview `Hola, soy Emma.` y saludo `Soy Emma, de ANAM`. El readback confirmó cero
borradores. No cambiaron personalidad, conocimiento, permisos, acciones, routing, handoff, canales ni datos CRM,
y no se envió una conversación real. Dos advertencias anteriores sobre `Registraré tu consulta` quedaron
documentadas para un cambio conversacional separado.

## 2026-09-01 — Emma convierte la landing ANAM en un concierge digital

La landing de atención de ANAM reemplazó al personaje masculino por Emma y reconstruyó la primera pantalla como
una experiencia editorial premium: narrativa clara, selector unificado de tres intenciones, un único CTA y un
panel de confianza integrado con la asistente. La selección prepara el contexto y no abre el chat hasta que la
persona pulsa `Conversar con Emma`.

El build HubSpot CMS React `#28` está desplegado en el portal ANAM `19893546`. El header usa el logo horizontal
del catálogo del repo, sin el círculo superior, y el recurso decorativo queda recortado dentro del hero para no
dejar espacio blanco bajo el footer. La verificación desktop y móvil confirmó HTTP 200, margen del body en cero,
ausencia de overflow, selección por clic y teclado, transferencia del intent al CTA y cero errores de consola,
página o red. Emma usa ahora un asset generativo versionado cuyo bordado dice correctamente
`ANÁLISIS AMBIENTALES S.A.`; se descartó el montaje tipográfico plano y se conservó el asset anterior para
rollback. No se abrió ni se envió una conversación real; tampoco cambiaron el Customer Agent ni datos CRM.

El cierre documental quedó reflejado en el canon y runbook CMS, documentación funcional, manual operativo,
dirección visual, changelog de cliente, `project_context.md` y las dos copias espejadas de la skill
`hubspot-as-a-service`. No se modificaron el router global ni la arquitectura comercial porque no cambió ningún
contrato transversal.

## 2026-09-01 — La auditoría gana una sección para lo que vale en todo el sitio (TASK-1671)

La pantalla de auditoría separa dos preguntas que antes mezclaba. Arriba, una sección nueva
—"Acceso y presentación del sitio"— responde si los motores de IA pueden leer el sitio, si la
portada se presenta y si el mapa del sitio está sano. Abajo, la lista de siempre, ahora rotulada
como lo que es: problemas **por página**.

La distinción importa porque cada hallazgo de la sección nueva vale para el dominio entero. En la
lista se habrían rotulado como "1 página afectada" —falso— y habrían quedado hundidos debajo de
cualquier problema menor que toque muchas páginas. Ahora dicen "Todo el sitio" y nombran dónde se
detectó el problema, para que el cliente pueda verificarlo en vez de concluir que el informe miente.

Y el bloqueo de entrenamiento de modelos de IA no se pinta como una falla: lleva la etiqueta
"Decisión declarada", porque es una decisión legítima sobre el uso del contenido.

🔴 **Sigue apagado.** El código existe pero no está desplegado, y el interruptor tampoco está
encendido. Hasta que las dos cosas pasen, un sitio invisible para los motores de IA **sigue**
saliendo con 95 de salud.

## 2026-09-01 — El audit SEO aprende a mirar el sitio, no sólo sus páginas (TASK-1670)

La auditoría técnica pasa a evaluar cuatro cosas que el crawl de páginas no ve: si el `robots.txt`
le niega el paso a los rastreadores de IA, si el servidor o el CDN los rechaza aunque el `robots.txt`
los permita, si la portada publica datos estructurados y si el mapa del sitio está sano.

La distinción que hace creíble al informe: bloquear el rastreo que **cita** el sitio en una respuesta
de IA es crítico, mientras que bloquear el que **entrena** modelos es una decisión de derechos sobre
el contenido y se reporta como información, nunca como falla. Meterlos en la misma bolsa haría que un
sitio perfectamente accesible saliera en rojo, y eso enseña a ignorar la alerta más importante.

🔴 **Todavía no está encendido.** La capacidad viaja apagada detrás de un flag, porque estos
hallazgos son del dominio completo y la pantalla actual los contaría como "1 página afectada". Hasta
que esa superficie exista (`TASK-1671`), un sitio invisible para los motores de IA **sigue** saliendo
con 95 de salud. El estado real es `code complete, rollout pendiente`.

## 2026-09-01 — Brand Visibility Grader queda disponible en Recursos

El menú principal de `efeoncepro.com` ahora incluye **Brand Visibility Grader** dentro de
`Recursos`, enlazado a `https://think.efeoncepro.com/brand-visibility`. La actualización reutiliza la
navegación nativa de Ohio; no crea una segunda cabecera ni modifica Elementor. Los 26 ítems previos
conservaron membresía, jerarquía y orden persistido, y el nuevo ítem quedó respaldado con snapshot
recuperable.

Después de purgar WordPress/Kinsta, el submenú y el clic se verificaron en producción a 1440 px y
390 px. El destino respondió 200 y ambas vistas quedaron sin overflow horizontal ni errores de
consola.

## 2026-09-01 — TASK-1807 instala los primeros controles FinOps de GCP

Producer corre cada cinco minutos mediante Terraform y permanece bajo observación antes de tocar Media. Dos
budgets nativos alert-only quedaron activos en CLP: 250.000 para Globe y 370.000 consolidados, con cuatro umbrales
de gasto actual y dos de forecast. El lector Greenhouse usa costo neto después de créditos y el watcher deduplica
por incidente estable; su prueba dry-run no consulta persistencia ni envía mensajes.

Globe agregó cuatro labels de atribución a 33 recursos. Artifact Registry, con 418 versiones y 10,4 GB, tiene una
cleanup policy en dry-run que conserva 10 versiones por paquete y sólo simula borrar versiones de más de 30 días;
no hubo eliminación. Asset Governance fue publicado y desplegado por digest inmutable para converger hasta cuatro
stages fenced en una ejecución. El smoke live quedó sano pero no-op, así que conserva cron minutely hasta un canary
con asset real. El post-plan no presenta drift y Greenhouse sigue local, sin publicación.

## 2026-09-01 — cinco licitaciones nuevas entran a HubSpot por MCP

Promoción manual confirmada y verificada de Chile Cultura, Universidad de Chile DII, JUNJI, Temuco y CNTV: cinco
Deals nuevos en `Pipeline de ventas` / `Calificado para comprar`, con ambas llaves de deduplicación, fechas,
modalidad, próximo paso y asociación a Company. Se reutilizaron tres Companies canónicas y se crearon únicamente
las dos ausentes, Temuco y CNTV; no se inventaron contactos. CNTV quedó clasificada como `Strategic Bets`, propiedad
de movimiento comercial separada del stage.

Las skills HubSpot espejadas dejaron de contradecir el contrato ya vigente en el companion LicitaLAB y
`project_context.md`: el MCP de HubSpot es un writer válido para cargas manuales bajo confirmación y readback; el
bridge queda como carril de automatización y su cobertura incompleta no bloquea ese flujo. Los registros comercial
y de licitaciones quedaron sincronizados con los IDs observados. No hubo postulación ni envío de propuesta.

## 2026-09-01 — el registro del avance entra a los checklists de cierre

`stale-progress` existía pero ningún protocolo mandaba correrlo. Los checklists de cierre de
`CLAUDE.md` y `AGENTS.md` ahora exigen tildar los acceptance criteria con evidencia, dejar sin
tildar y con razón lo que no se verificó, poner `Status real` al día y correr
`pnpm task:lint --task TASK-###` antes de mover a `complete/`.

`ui-flow-contract` deja de romper el gate cuando una task de `to-do/` aparece en el diff sin ser el
foco: misma calibración que `ui-wireframe-contract`, con test falsable. El footer de `flags:audit`
deja de llamar «verdad live» a `vercel env ls` (que sólo dice que la variable existe) y nombra
`vercel env pull`.

Barrido de coherencia sobre los 19 cierres del día: `Lifecycle` desincronizado, 5 rutas stale en los
índices, 9 estados falsos en el README de tasks, conteos y prosa stale en cinco epics y en
`AEO_PROGRAM_STATUS.md`, 10 archivos con rutas rotas y cuatro reglas duras apoyadas en hechos ya
falsos.

## 2026-09-01 — el CTA gana foco y salida por teclado, y `Escape` deja de mentirle al ledger

Bundle del renderer CTA **`1.2.0-preview.1` → `1.3.0`**. Minor y no patch: cambia comportamiento
observable, y `dismissed` deja de emitirse al cerrar por teclado — quien mida la tasa de rechazo
verá la serie cambiar de sentido en esta versión. `renderer_version` viaja en la telemetría, así que
el bump es lo único que después permite distinguir qué host corre el arreglo.

`ISSUE-167` resuelto (code complete, rollout pendiente). Primitive `attachDisclosureFocus`
(`src/growth-cta-renderer/disclosure-focus.ts`): al abrir el Growth Form desde un CTA el foco entra
al contenido y `Escape` cierra. Es disclosure, no modal, y `Escape` se escucha en el contenedor —
nunca en el documento, para no secuestrárselo a la página del host.

🔴 Cambio de comportamiento que importa al dato: **`Escape` COLAPSA el form al card y NO emite
`dismissed`**. `dismissed` significa «el visitante rechazó la oferta» y viaja al ledger de
conversión; cerrar un formulario abierto por curiosidad no es rechazar. El botón «✕ Ahora no» sigue
siendo el único rechazo.

Causa raíz: el foco y la salida por teclado estaban modelados por **placement** (`slide-in`) en vez
de por «superficie revelada», así que `embedded` no los heredaba.

## 2026-09-01 — el motor CTA cierra su primera rebanada, y deja un hueco de accesibilidad nombrado

`TASK-1427` complete. El steady-state se observó sobre **45 días** y no sobre los 7 que pedía el
criterio: la ventana literal de julio tuvo tráfico un solo día, así que sus ceros eran un falso
verde. Resultado sobre la serie real: 0 errores server-confirmed, 0 kill switches, 0 colisiones.

Los readers de `growth.cta.*` filtran `INTERVAL '1 day'`: responden «¿está sano ahora?», nunca
«¿estuvo steady durante N días?». Queda `scripts/growth/_sanity-cta-signal-window.ts` para esa
pregunta.

**`ISSUE-167` abierto:** al abrir el Growth Form desde un CTA el foco queda en `body` y `Escape` no
cierra — renderer compartido, afecta a todos los CTA en Think y WordPress.

## 2026-09-01 — el paso de registrar el avance entra a los seis checklists de cierre

Un mecanismo que avisa en un comando que ningún protocolo manda ejecutar está apagado. La regla
—tildar con evidencia, dejar sin tildar con razón, `Status real` al día, `pnpm task:lint --task`—
quedó en `CLAUDE.md`, `AGENTS.md`, el harness `implement-task`, `GREENHOUSE_OPERATING_LOOP_V1.md`,
`TASK_PROCESS.md` y el `greenhouse-documentation-governor`.

`TASK_PROCESS.md` documenta las calibraciones medidas de `stale-progress`/`stale-blocker`.
`TASK_UI_UX_ADDENDUM.md` documenta la severidad foco-vs-incidental de los gates de UI y el protocolo
de contrato retroactivo. El `greenhouse-qa-release-auditor` suma tres defectos de gate nuevos y la
regla de falsificar todo test contra su propio arreglo.

## 2026-09-01 — barrido `stale-progress`: el registro se pone al día en 16 tasks

12 de 16 dejaron de reportar el aviso. Ninguna cerró: ninguna estaba terminada. Se tildó solo lo que
la evidencia respalda y se dejó por escrito la razón de cada criterio sin tildar.

Tres defectos del propio detector, corregidos con test falsable: `stale-blocker` disparaba cuando el
campo decía `none` seguido de la explicación que nombra al blocker cerrado; `ui-flow-contract` rompía
el gate por deuda previa al tocar una task de `to-do` incidentalmente; y un commit de scope `docs`
contaba como implementación. Se documentó por qué NO se filtran los `TASK-###` entre paréntesis.

`TASK-1259` recibió wireframe y flow retroactivos, construidos desde el manual del runtime: estaba
`in-progress` con UI ya implementada en el repo de WordPress y sin contratos declarados.

## 2026-09-01 — DataForSEO ETV deja de ser una cifra sin versión

El anuncio de ETV improved fue contrastado con la documentación pública y con siete consumers Greenhouse.
Las skills DataForSEO/SEO, el dossier Labs, manuales y auditoría ahora distinguen legacy/improved,
`use_improved_etv` de `include_clickstream_data`, y prohíben interpretar el cambio de modelo como performance.
También se incorporó `dataforseo-operator` al gate de mirrors y se corrigieron sus pointers canónicos. No hubo
cambio de runtime. Se registraron el ADR formula-aware, `TASK-1805` para la foundation, `TASK-1806` para
evaluación/cutover, el runbook y un correo de diez preguntas en borrador/no enviado. El cutover queda bloqueado por
aclaración del proveedor, foundation completa, shadow aprobado y decisión histórica antes del default anunciado
para el 1-nov.
[Auditoría](docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md).

## 2026-09-01 — TeamBot completa el ciclo mensual del Performance Report

Nexa publicó el resumen de agosto en `EO Team` con cuatro menciones verificadas y envió cuatro lecturas personales 1:1, todas auditadas como `succeeded`. El runbook, la arquitectura, el manual y las skills espejadas ahora exigen separar cifras de interpretación: volumen no prueba sobrecarga, los atrasos heredados se contextualizan y una muestra de onboarding no se presenta como tendencia. También fijan la jerarquía de evidencia para menciones y el uso de Object ID Entra revalidado cuando un correo escrito contiene un typo. [Evidencia y límites](docs/audits/communications/2026-09-01-performance-report-teambot.md).

## 2026-09-01 — 15 cierres del barrido y dos defectos de task:lint corregidos

Quedaron `complete` con evidencia por criterio: 1036, 1040, 1090, 1113, 1209, 1210, 1225, 1253, 1282,
1321, 1330, 1335, 1430, 1431 y 1747. Desbloqueadas 1246, 1254, 1255 y 1336.

`TASK-1078` NO se cerró pese a estar desplegada: es UI sin `Wireframe:` declarado y no se le inventa
uno para pasar el gate. Queda como decisión de política para las tasks de UI previas a esa regla.

Dos defectos de `task:lint`, ambos de mensajes que prometían lo que el mecanismo no honraba:
`ui-wireframe-contract` ignoraba el `UI impact: none` explícito por inferir desde `Domain`, y se
rompía cuando el autor agregaba la razón que la plantilla exige.

## 2026-09-01 — El auditor de flags detecta el drift ledger↔live, y dos defectos quedan registrados

`pnpm flags:audit` era ciego al drift más caro del ledger porque `vercel env ls` lista presencia, no
valor. Ahora hace `vercel env pull` y compara: 24 filas declaran `prod: OFF` con el valor live en
`true`. Ese drift es lo que hace que un agente lea "rollout pendiente" y re-ejecute trabajo hecho.

Del barrido de 27 tasks salen `ISSUE-165` (writer de organizaciones fuera del SSOT en
`/api/admin/spaces`, impacto latente) e `ISSUE-166` (el CTA de Nexa abre el chat sin anclar el insight
ni enviar la pregunta).

## 2026-09-01 — TASK-1709 cerrada y la doc que la daba por apagada

El carril de diagnóstico de prospecto llevaba **5 días desplegado** (flag ON en Vercel Production
desde el 27-ago, corrida real sobre `skyairline.com`) mientras cuatro skills, el runbook del gateway
MCP, dos manuales y la doc funcional decían "flag OFF en todos los ambientes". El runbook incluso
instruía al canary a normalizar un `disabled` — que hoy sería una regresión. Corregido en 9 archivos.

Tier `prospect` documentado: se resuelve sin `module_assignments` y su gasto es presupuesto de
adquisición de Efeonce, nunca costo de cliente.

## 2026-09-01 — TASK-1699 cerrada, y `task:lint` gana la regla `stale-progress`

El top-N del SERP quedó `complete`: serie viva desde el 2026-08-29 (766 · 775 · 762 · 778 filas en
4 días) con costo marginal CERO medido, y su señal de cobertura convergió sola a `ok`/`uncovered=0`
sin tocar el umbral.

Se re-ejecutó cinco veces sin cerrar por un defecto de **registro**, no técnico: 46 checkboxes sin
tildar y `Status real: Diseno` hacían que cada sesión la leyera como no empezada, mientras el trabajo
quedaba anotado sólo en prosa.

Regla nueva `stale-progress` en `task:lint`: avisa cuando el estado declarado contradice la historia
de commits, y cuando una task se cierra sin tildar una sola evidencia. Warning por diseño y por
medición (414 de 975 completas están así); acotada a las que tienen commits de implementación, la
señal cae a 28 tasks.

## 2026-08-31 — Blog WordPress sanea categorías y abre una copia gobernada de Demo 35

La taxonomía live quedó reducida a 13 categorías reales: AEO y SEO son raíces;
Diseño Web depende de Diseño y Redes Sociales de Marketing Digital. Se
reclasificaron 11 posts reales, se enviaron 20 posts Ohio demo a papelera, se
retiraron 15 categorías descartadas y Marketing Digital quedó como default.
Los cambios de URL tienen redirects explícitos y los demo retirados, `410`.

La copia `251875` de Demo 35 está publicada con `noindex` como superficie de
trabajo; la fuente `225984` y `/blog/` permanecen sin cutover. PDR, contrato,
manual y skills WordPress Codex/Claude fijan que jerarquía no equivale a
prominencia y que los 15 widgets deben reconectarse a contenido real antes de
publicar. [Estado y pendientes](docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md).

## 2026-08-31 — Las páginas misceláneas dejan de ser “una 404” y ganan ownership

Discovery live confirmó que Ohio padre gobierna 404, búsqueda/no-results y archivos; Elementor Theme Builder
no tiene templates/conditions especiales activos. Se creó el contrato child-theme-first, el comportamiento
funcional, el runbook, el registro de primitive propuesto y las rutas en skills WordPress/SEO. La política separa
recovery, búsqueda, archivos editoriales y chrome global, con HTTP/robots/canonical por query type. No hubo
mutación ni publicación. Persisten P0: contenido público `(Borrador)`, search vacío con 154 resultados y enlaces
demo/rotos globales. [Discovery y límites](docs/audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md).

## 2026-08-31 — Content Marketing: cierre técnico focal en producción

El stage ya aplica el mismo gate de alto/ancho al cargar y redimensionar; 1440×650 conserva los
siete capítulos en flujo. Se corrigieron contrastes de estados y badges con variantes de la paleta
aprobada. Despliegue WordPress limitado a JS/CSS con backup, hashes y readback de documento intacto.
Nuevo verificador recorre pin, capítulos, tabs/cortes, mobile/reduced-motion/JS-off y contraste;
smoke seguro separa rechazos reales, ledger vacío y un evento GA4 explícitamente sintético.
[Evidencia y límite Turnstile/Realtime](docs/audits/public-site/2026-08-31-content-marketing-technical-closure.md).

## 2026-08-31 — Cobertura Efeonce incorpora Estados Unidos y Contacto corrige su fuente institucional

La cobertura vigente queda en Chile, Estados Unidos, Colombia, México y Perú, sin inferir oficina ni entidad
legal por mercado. Contexto de negocio, posicionamiento público, primitives y skills espejadas apuntan al
mismo estado. El brief de Contacto usa la dirección y los dos teléfonos de la contraportada canónica y marca
como desactualizados Las Bellotas, el teléfono público anterior y las listas de cuatro mercados. `TASK-1801` quedó registrada con contratos visual/flow/motion, routing, privacidad, Meetings y rollout; esta edición no publicó WordPress ni amplió métricas históricas de clientes.
[Brief y límites](docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md).

## 2026-08-31 — Home: cierre editorial y mantenimiento nativo

Ocho revisiones publicadas: hero desafiante, beneficios concretos, comparación cualitativa, FAQ
con jerarquía tipográfica y encabezado Con + logo. Readback 17 widgets/407 campos/seis repeaters;
doce archivos coinciden local/remoto. Subagente concilió planes, snapshots y evidencia.
Contratos técnico/funcional/manual y skills WordPress/copywriting espejadas actualizados;
commit documental, sin runtime hermano ni WIP SEO previo. QA residual y TASK-1358 siguen abiertos.
[Cierre y límites](docs/audits/public-site/2026-08-31-home-editorial-closure.md).

## 2026-08-31 — TASK-1780: el inventario de tools MCP pasa a ser un manifiesto

`src/mcp/greenhouse/tool-manifest.ts` es la fuente única del catálogo de tools MCP. `server.ts`
registra recorriéndolo —definir una tool sin entrada rompe la construcción del servidor— y el `name`
y las `instructions` que el cliente MCP lee se derivan de él, así que el servidor ya no puede
anunciarse `greenhouse-read-only` mientras registra siete escrituras. Dos banderas ortogonales por
tool: `writes` y `spendsProviderBudget`.

El manual se renombró a `mcp-greenhouse-tool-inventory.md` y se corrigieron sus tres cifras en
conflicto. Nuevo gate `pnpm mcp:manifest:check` en `ci.yml` sobre el artefacto generado que el
gateway consumirá.

Cambio de comportamiento verificado como nulo: el registro del SDK antes y después es idéntico byte a
byte (43 tools, mismo orden y schemas), y el artefacto reproduce el espejo del gateway tool por tool.

Cerrada y pusheada: Greenhouse `d2b3c0639` (9 workflows `success`) y gateway `efeonce-mcp` `e92961e`
(CI `success`). El deploy del gateway es `workflow_dispatch` y sigue sin disparar, así que la revisión
productiva no cambió — la verificación de esta task es de CI, no de runtime.

Barrido documental con 4 subagentes: 8 skills, 5 specs de arquitectura, 9 docs funcionales/manuales,
4 tasks vivas y un epic corregidos. Dos huecos sistémicos cerrados de paso: la rule auto-cargada de
Growth/SEO instruía editar a mano el espejo retirado, y no existía ninguna rule para `src/mcp/**`
(creada). `mcp:manifest:check` entró a `local:check` — antes el drift del artefacto sólo aparecía en CI.
Fila nueva en `DECISIONS_INDEX.md`: la frontera "qué capacidades existen es conocimiento de producto,
no de transporte" es la tercera arista del triángulo que ya fijaban las dos filas MCP existentes.

## 2026-08-31 — Content Marketing: diseño aprobado publicado en Elementor

Versionado local del runtime: `73493a8`; cambios Greenhouse acompañados en este cierre, sin push.

Revisión documental delegada: arquitectura/funcional/manual, skills WordPress/Growth Forms e índices
sincronizados con la entrega. Contratos UI distinguen plan de export publicado; task conserva sus
pendientes. Se precisan rollback, empaquetado, orden visible del menú y riesgo del pin tras resize.
Sin cambio de código ni nueva publicación durante esta revisión.

Menú verificado: **Soluciones → Crecimiento Multicanal → Content Marketing**, item `242917`, sin duplicados ni cambio de orden.
[Revisión editorial de ambas secciones](docs/audits/public-site/2026-08-31-content-marketing-editorial-copy.md): 118 campos publicados, siete pasos coherentes; diseño/SEO/shell intactos.
[Segundo pase editorial](docs/audits/public-site/2026-08-31-content-marketing-hub-review-copy.md): hub y revisión creativa, 83 campos publicados; tres cortes y fichas de campaña revisados.
[CMS y modos](docs/audits/public-site/2026-08-31-content-marketing-cms-modes.md): 53 textos y cuatro logos oficiales publicados; ocho controles nuevos, diseño general y SEO conservados.
[Ecosistema y FAQ](docs/audits/public-site/2026-08-31-content-marketing-ecosystem-faq.md): 37 textos y seis URL publicados; tarjetas completas y ocho FAQ, sin cambios de diseño/SEO.
[Marca en modalidades](docs/audits/public-site/2026-08-31-content-marketing-mode-logo.md): dos logos ampliados con CSS acotado, sin cambiar contenido ni SEO.
[Indexabilidad del menú](docs/audits/public-site/2026-08-31-menu-indexability.md): 18/18 páginas habilitadas; sólo Redes Sociales requería quitar noindex. Canonical/sitemap verificados; indexación GSC no afirmada.
[Cierre, caso interno y formulario](docs/audits/public-site/2026-08-31-content-marketing-business-conversion.md): 48 textos Elementor y copy de form v3 publicados; correo copiado coincide con lo visible, sin cambiar destino ni enviar leads. Ajuste posterior: cinco textos condensados para equilibrar las columnas, sin cambiar el formulario. Cierre documental con tres subagentes; runtime `f12dd64`, ocho archivos idénticos a producción, sin push.

Trece widgets editables conservan composición, assets e interacciones de Content Ops; header/footer Ohio
nativos. Captura canónica de dos pasos, select preseleccionado corregido, Yoast/meta/social/Service y URL
original preservada. [QA y límites](docs/audits/public-site/2026-08-31-content-marketing-publication.md).

## 2026-08-30 — Landing HubSpot: export aprobado publicado en Elementor

2026-08-31: etiqueta del enlace de menú cambiada a «Servicios HubSpot» por pedido del operador; URL y jerarquía conservadas.

2026-08-31: [auditoría SEO/AEO completa](docs/audits/public-site/2026-08-31-hubspot-seo-aeo.md):
OG/Twitter y breadcrumb corregidos, Service conectado al grafo Yoast, enlace oficial del partner y HTTP→HTTPS
301 sólo en la landing. Iconos 878 KB→2,4 KB y fuentes adelantadas; móvil LCP 16,3→8,6 s (lab; aún mejorable).
Schema.org 0 errores/advertencias; GSC indexada, último crawl 27-08 anterior al rediseño. Header/footer intactos;
persisten defectos globales del footer y falta respaldo localizado de las cifras 56%/76%. Snapshot SEO
`_gh_hubspot_seo_20260831_093553`; hash Elementor sin cambios. Sin commit/push.
Después se afinó la descripción SEO/social con `copywriting`, eliminando redundancia, sin cambiar title ni diseño.
Por comentarios posteriores se restauró el timeline del diseño y se dejaron dos columnas de partner con badge mayor;
[audit y rollback](docs/audits/public-site/2026-08-31-hubspot-timeline-partner-fix.md). SEO y datos Elementor intactos.
Nueva revisión: [seis iconos oficiales HubSpot y logo ANAM](docs/audits/public-site/2026-08-31-hubspot-brand-assets.md);
Media nativos, nota del caso identificada, SEO y shell conservados.
Revisión siguiente: [isotipos en paneles, Smart CRM/Agent Hub y wordmark de licencias](docs/audits/public-site/2026-08-31-hubspot-product-marks.md);
autorización del logo confirmada por operador, AEO sin símbolo propio identificado, sin cambios de copy/SEO.
MCP suma [ChatGPT, Claude y Gemini reutilizados desde AEO](docs/audits/public-site/2026-08-31-hubspot-mcp-logos.md),
en tarjeta y panel, tres Media nativos; AEO y contenido Elementor protegidos.
Las cinco capacidades restantes suman [iconos semánticos azul claro](docs/audits/public-site/2026-08-31-hubspot-semantic-icons.md),
diferenciados de las marcas oficiales, compartidos tarjeta/panel y editables.
[Revisión editorial](docs/audits/public-site/2026-08-31-hubspot-editorial-copy.md): licencias, ANAM, partner y reunión;
51 textos, sin «práctica» en la landing, sin cambios de diseño/SEO ni de otras páginas.
Continuación: [industrias, primer paso y cinco etapas](docs/audits/public-site/2026-08-31-hubspot-industry-method-copy.md), solo copy en tres widgets.
[Cierre documental delegado](docs/audits/public-site/2026-08-31-hubspot-documentation-closure.md): contratos, manual, skills y task reflejan publicación/alcance pendiente; Git acotado, sin push.


Se reemplazó el cuerpo de `244079` por once widgets Elementor editables, con 23 paneles servidos por PHP,
interacciones progresivas, CSS del diseño y header/footer nativos. URL e imagen destacada conservadas.
Formulario real de tres pasos por Growth Forms, variante portable `hubspot_pillar`; desaparece el éxito
simulado del export. Despliegue acotado por hashes, respaldo durable y verificación anónima responsive,
teclado, reduced motion, rechazo de captcha y guardado nativo de Elementor. Sin commit/push.
[Contrato](docs/architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md) ·
[Audit](docs/audits/public-site/2026-08-30-hubspot-elementor-publication.md).

## 2026-08-30 — TASK-1358: Home modular Elementor promovida con respaldo

Revisión SEO/AEO: título/descripción y OG/Twitter propios en Yoast, dos Media HTTP → HTTPS;
grafo existente conservado sin duplicaciones. [Audit y límites](docs/audits/public-site/2026-08-30-home-seo-aeo.md).
Aprendizajes consolidados en skills SEO/AEO y WordPress, espejadas Codex/Claude: metadatos sin forzar H1,
dueño único de grafo, retiro de FAQ rich results, alcance llms.txt y pruebas CMS/HTML/GSC diferenciadas.

Por instrucción posterior del operador, la página `251731` ya sirve `/`: menu Home y SEO/canonical/index
actualizados, diseño/copy/header/footer intactos; antigua Home `2791` conservada noindex. Snapshot
`_gh_home_cutover_20260830_162109`. Se aplicaron después los seis comentarios visuales: contraste corregido,
10 piezas recuperadas, isotipo HubSpot de Simple Icons, Logo Marquee compartido y agenda horizontal sin
formulario, enlazada al calendario vigente. QA 1280/890/390; copy/claims/editor UI siguen pendientes.
[Evidencia](docs/audits/public-site/2026-08-30-home-visual-review.md).
Segunda revisión: contraste de Ecosistema, CTA teal editable, FAQ con CTA integrado y layout tablet
sin sticky, e isotipo correcto también en Respaldo oficial. Sin reescribir documento ni header/footer.
Tercera revisión: hover nativo Ohio sin cubrir el CTA, FAQ sin mail, cierre de tabla moderado, sprocket CRM,
halos sin cortes e isotipo hero proporcional. Cambios de contenido guardados vía Elementor; QA responsive/hover PASS.
Cuarta revisión: HubSpot CRM teal con hover blanco; isotipos oficiales negativos de Greenhouse/Globe mediante
Media nativo. Tres comentarios publicados y comprobados en 390/890/1280; copys y header/footer sin cambios.
Quinta revisión: Kortex/Wave oficiales, Verk retirado y aviso oculto; logos reales del hero con microinteracción
original restaurada, y bucle de trabajos con cobertura por viewport. Snapshot `190751`; 415 campos/7 repeaters.
Rótulos narrativos: «El costo de trabajar por separado» y «Un equipo. Una misma dirección.» sustituyen notas
del wireframe en dos controles Elementor; snapshot `192130`, resto del contenido y estilo intactos.
Servicios enlaza cuatro landings verificadas mediante URL nativa por fila; ocho tarjetas siguen estáticas.
Snapshot `192809`; reparación del default URL, pruebas de renderer y navegación real documentadas en audit.
Casos se convierte en CTA navy compacto → `/portafolio/`, cinco campos nativos; tarjetas/cifras retiradas.
Snapshot `194253`, backup runtime `194241`; 415 campos/6 repeaters; hover, móvil y clic verificados.
Hero «Mira cómo operamos» abre showreel YouTube en dialog navy responsive; URL nativa, carga sólo al clic,
destrucción del player al cerrar, alternativa YouTube. Snapshot `195821`, backup `195756`; 414 campos.
Reproducción live, cierre X/exterior, foco de retorno y reduced motion verificados; teclado del iframe no certificado.

Consolidación documental con tres subagentes: contrato técnico, funcional, manual y skills espejadas;
task/índices/contexto reconciliados con PDR-010 y la Home actual. Plan y handoff previos preservados como
historia, no instrucciones vigentes. Readback independiente 17 widgets/414 campos raíz/6 repeaters,
tests PHP/lifecycle/geometría PASS; QA del editor, teclado del player y claims globales siguen abiertos.
Sin cambios live en esta consolidación. [Audit](docs/audits/public-site/2026-08-30-home-documentation-consolidation.md).

Checkpoint de construcción anterior a la promoción:

Se auditó el ZIP y se portó el cuerpo de Claude Design a `https://efeoncepro.com/home-claude-design-preview/` (`251731`, noindex), preservando el header/footer Ohio y Home `2791`. Tras la corrección solicitada por el operador, usa 17 widgets semánticos Elementor con controles editables y siete repeaters, **cero widgets HTML**. Assets condicionales y ciclo de vida idempotente; adaptación móvil del motor sin superposiciones. Tests PHP/JS y frontend 1440/390, reduced motion, filtros/FAQ/modal/foco pasan. Editor visual save/reload pendiente de login; media de 12 slots, copy/claims, captación y cutover siguen pendientes. [Contrato y manuales](docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md).

## 2026-08-30 — HubSpot as a Service y su futura landing adoptan arquitectura moderna e inmersiva

La práctica dejó de reducirse a RevOps + Customer Agent y ahora se gobierna mediante seis familias: Marketing,
Content & AEO; Sales & AI Pipeline; Revenue Lifecycle; Service, Customer Success & Delivery; Data, Integration &
CRM Intelligence; y Agent Hub & Agentic Operations. La evaluación inicial para fit/cotización es sin costo; un
blueprint pagado requiere un artefacto autónomo. Customer Agent queda como caso de uso, mientras Contracts,
Projects y Services se clasifican correctamente como objetos/capabilities dentro de sus workflows.

El benchmark de 11 partners, la oferta V2, tres fichas sectoriales, el pillar público, las skills HubSpot espejadas y
el router de agentes quedaron reconciliados. `TASK-1352` fue **reemplazada integralmente**, sin conservar deltas,
copy, claims ni composición del resultado rechazado de Claude Design. La nueva task impone research-first,
copywriting completo, SEO/AEO por intención y motor, CRO medible, proof ledger y un gate humano del primer fold antes
de la implementación total. Su dirección visual durable es **Sistema vivo de crecimiento**: atlas de seis resultados, tres lentes
sectoriales, color HubSpot usado como señal dentro de Efeonce masterbrand, motion causal/interrumpible, frontera
gratis-vs-blueprint y GVC premium. Los activos exactos de marca deben venir del Partner Brandfolder/guía vigente;
no se autoriza copiar la UI/trade dress, modificar logos, inventar HEX ni usar inmersión ornamental que perjudique
accesibilidad o CWV. No hubo cambio de runtime ni publicación web; la task permanece `to-do` y `UI ready: no`.

Dirección visual, wireframe, flow y motion de TASK-1352 se reautoraron desde cero contra la task nueva. Eliminan la
gran idea prefijada, normalizan las seis familias canónicas, subordinan agentes/capabilities a outcomes, incorporan
copy slots research-dependent, restricciones SEO/AEO en HTML, flujo de conversión y no-fit, fallas honestas,
transformación desktop/tablet/mobile y un motion system causal con tokens exactos, reduced-motion y budgets CWV.

## 2026-08-30 — Growth SEO · la lente `Descubrir` entrega lo que ya tenía construido (TASK-1693)

**Qué cambia para quien opera el módulo SEO.** Tres capacidades que estaban construidas y pagadas
pero no llegaban a la pantalla:

- **Se puede recorrer la corrida completa.** Una corrida materializa hasta 500 candidatos y la
  pantalla servía 50 sin salida. Ahora hay «Ver N candidatos más» al pie. Recorrer **no cuesta**: lee
  lo ya comprado, no llama al proveedor y por eso se ve distinto del botón que sí gasta.
- **Se elige de dónde salen las seeds.** Cuatro fuentes, con Search Console a la cabeza — seeds con
  demanda medida y resolución sin costo de proveedor. Cada una declara cuántas seeds aportaría. Una
  fuente sin insumo se bloquea con su razón y **nunca** cae en silencio a «seeds escritas».
- **Se puede filtrar el canvas**, y el filtro se aplica en el servidor: el conteo del encabezado
  sigue al universo filtrado, no a la página que bajó. No hay filtro por «dificultad» a propósito;
  el control correcto es «Barrera máxima», derivada del perfil real de enlaces.

Manual actualizado: `docs/manual-de-uso/growth/descubrir-keywords-seo.md` v1.3.

## 2026-08-29 — release `e1718a359575`: dos guardas textuales fallaron el mismo día con signos opuestos

El 4.º paso a producción del día promovió el fix de banda 2, el gate de cobertura del worker y la
quema de la deuda de procedencia. Manifest `released` en un solo run del orquestador; canary de
contrato verde por el lane de producción (provenance + rank monotónico — sólo el código nuevo lo
produce) y Berel paginada entera: 501/501, secuencia == persistida. El índice keyset huérfano se
retiró después del release (migración `20260829225504734`), como el contrato manda.

El desvío enseñó el patrón del día: CI Deep rojo sobre el primer squash porque el test del contrato
del deploy del worker contaba ocurrencias de string en el YAML — el proxy textual de un mecanismo
que 146070ffc había reemplazado por cobertura de metafile. La misma clase que el string-match del
ORDER BY del reader, con signo opuesto: aquél pasaba verde con banda 2 rota; éste se puso rojo con
la cobertura mejorada. Una guarda textual debe señalar al verificador real, no reemplazarlo. Y la
parte que no era del pipeline: la racha completa fue de **5 corridas rojas/canceladas en ~70
minutos** — el run del commit culpable cancelado por `cancel-in-progress` (nunca juzgado), dos
rojos de una sesión y uno del push del merge canónico de otra, sin que nadie abriera ninguno — en
ráfagas el veredicto es del último push, y una alarma sostenida se normaliza hasta volverse
invisible. El skip de 44 s del ops-worker esta vez fue legítimo (árboles
idénticos, diff completo vacío): mismo síntoma que el incidente anterior, causa opuesta — los
distingue el diff, no el cronómetro.

## 2026-08-29 — la cuarta llave invisible: el orden servido de la cola contradecía el rank persistido en banda 2

Auditoría independiente post-release sobre el snapshot vigente: 54 de 55 items de banda 2 de
`seot-efeonce-own-brand` salían fuera de su `rank_in_snapshot`. El comparador del materializador
desempata esa banda por impresiones — un valor que no es columna — y el reader reconstruía el orden
en SQL con las tres llaves que sí lo son; con el score NULL en toda la banda, colapsaba a orden
alfabético. El test de paridad comparaba el **string** del SQL contra una constante, así que
consagraba un modelo de tres llaves que el comparador no seguía y pasaba verde con el defecto
puesto. Invisible en Berel (todo banda 1); total en la org sin curva — que es toda org nueva.

El fix no agrega la columna que falta: **deja de reconstruir**. El reader sirve y pagina
`rank_in_snapshot` (único, sin NULL, ahora con UNIQUE index estructural), y la coincidencia entre
orden servido y persistido pasa a ser por construcción. Mueren de paso la disciplina `COLLATE "C"`
del reader, el cursor expandido con NULLs y el test por string. Re-medido paginando la corrida real
de punta a punta: 0 discrepancias en ambos targets, bandas 1 y 3 sin regresión. En el mismo tren se
quemó la deuda de procedencia de `work-queue` (TASK-1785): fuente nueva `own_ctr_model` para el caso
«insumos medidos, resultado estimado», censo en `emitted`. Queda con dueño el retiro post-release
del índice de keyset huérfano. La bug class quedó documentada como la TERCERA de
`SQL_DATE_MATH_AGENT_INVARIANTS` §"Orden y paginación", con el corolario de protocolo que la habría
atrapado: la detección se corre sobre el dataset que EXHIBE cada estado, no sobre el más grande.

## 2026-08-29 — el filtro que decide si un worker se despliega llevaba tiempo describiendo un bundle que ya no existía

El release de `incremental-clicks-v2` cerró verde en todo: manifest `released`, Vercel READY,
watchdog sin drift, tres de cuatro workers en el SHA. El `ops-worker` estaba sirviendo la versión
**anterior** — o sea el predicado de canibalización que ese mismo release existía para corregir.
Su job no falló: duró 46 segundos, se saltó el deploy solo y cerró `success`.

La decisión de desplegar se tomaba contra `WORKER_RUNTIME_PATHS`, una lista de rutas mantenida a
mano. Medido con el metafile de esbuild —el mismo bundle que arma el Dockerfile—, el `ops-worker`
empaqueta **1449 archivos** y la lista cubría **24 prefijos**: **696 archivos invisibles**, entre
ellos `src/lib/postgres`, casi todo `src/lib/finance` y todo `src/lib/growth/seo`. Como 1385 de los
1449 vienen de `src/lib`, enumerar subdirectorios nunca iba a sostenerse.

No era la primera vez. Los comentarios del propio workflow documentan **cinco** recurrencias
(TASK-1210, 742, 1723, 1746, 1279) y cada una se cerró agregando una ruta más. La sexta habría sido
`src/lib/growth/seo`.

Ahora la declaración es la verdadera —gruesa a propósito, y sigue evitando el redeploy por cambios a
`src/app/**`, `docs/**` o `tests/**`— y hay un gate, `pnpm worker:deploy-path-gate`, que la mantiene
verdadera derivándola del árbol real del bundle en vez de la lista escrita. Corriéndolo aparecieron
dos huecos más: `commercial-cost-worker` e `ico-batch` tampoco cubrían `services/_shared/sentry-init.ts`,
que ambos bundlean.

Con el worker ya en el SHA correcto, la cola se rematerializó **sin** `force`: el piso de recomputación
filtra por versión, así que un snapshot v1 dejó de contar como reciente. En Berel MX `consolidation`
cayó de 200 a 11 mientras `gsc_striking_distance` subía de 168 a 200 — reclasificación, no filtrado
de más. Y el 200 de v1 era el tope de `maxItemsPerOrigin`, o sea que el número real estaba truncado:
la mejora es mayor que la que muestra la resta.

## 2026-08-29 — el detector de canibalización de la cola SEO detectaba marca, y de paso vaciaba media pantalla

La cola priorizada decidía si una keyword era canibalización preguntando "¿aparece más de una página
del sitio?". Medido contra berel.com sobre 28 días, eso no mide canibalización: la población no-marca
tenía **80,7 %** de sus impresiones concentradas en su página principal y la de marca **34,2 %**. El
predicado seleccionaba marca — donde el sitio ocupa legítimamente su propia SERP. El caso que lo
retrata es la query de mayor demanda del sitio: `pinturas`, 41 páginas, **99,3 %** de las impresiones
en una sola, y la cola proponiendo "fusiona 41 URLs" sobre el ítem #1.

El daño mayor estaba en el otro lado. Como el colector de striking-distance excluía todo lo
multi-página, sacaba **216 de 269** filas de su ventana: reconstruida la lente, el operador veía
**92 keywords donde el reader anterior mostraba 269**. Al validar el cutover se verificó la dirección
que agregaba filas y nunca la que las quitaba.

`incremental-clicks-v2` corrige el predicado (no-marca ∧ concentración de la principal ≤ 70 % ∧ ≥2
páginas fusionables), lo escribe en **un solo lugar** que los dos colectores importan —antes estaba
escrito dos veces— y separa dos preguntas que parecían una: quién se queda con la query se mide sobre
todas las páginas, home incluida; qué se puede fusionar excluye home, PDFs e imágenes. Mezclarlas
invierte el veredicto, y lo destapó medir: al sacar la home también del denominador, `pinturas` cayó a
13,2 % y volvió a salir canibalizada. La marca tolera un error de tipeo, que no era un lujo: `bereñ`
con 38 páginas, `verel`, `berol`, `berrl`, `betel`, `berem`, `bere` — 16 queries de marca entraban
como canibalización.

De 400 candidatas, v1 llamaba canibalizadas 400 y v2 llama 11; la población real del sitio son 29.
Quedan ~5 sub-marcas propias (`kover` son 19 fichas de una línea de producto) que no se detectan desde
el dominio: es un límite declarado en la versión, no un pendiente silencioso, y cerrarlo exige una
fuente de marca con autor.

El bump destapó dos defectos latentes que sólo existen cuando hay más de una versión: el piso de
recomputación reusaba snapshots de otra versión y devolvía la versión activa sobre ellos —un campo que
miente—, y la huella congelada de parámetros no puede ver un cambio de fórmula. Lo primero ahora filtra
por versión con su gate; lo segundo tiene vectores dorados que congelan la salida.

## 2026-08-29 — La cola SEO empieza a correr sola, y un detector que avisaba a tiempo no llegaba a nadie

Los dos schedulers del módulo quedaron activos: `ops-seo-work-queue-materialize` (`0 10 * * *`, tras
corrida shadow con la identidad OIDC real y revisión fila por fila) y `ops-seo-competitor-coverage`
(`0 9 18 * *`, ~USD 0,11/mes). Ambos despausados en el **SoT y en vivo**, porque
`upsert_scheduler_job` re-aplica `pause`/`resume` en cada deploy y un resume suelto se revierte solo.

El hallazgo del día no fue técnico sino de enrutamiento: la credencial AXIS que bloqueó el release
**sí tenía detector, y avisó tres días antes** con el modo de falla exacto. Nadie lo leyó porque su
único canal de salida era el color de su corrida, y ese color ya venía rojo por un bug ajeno. Un gate
cuyo único canal es su propio color es un registro, no una alerta; y un detector con rojo crónico
deja de ser un detector. `TASK-1794` recoge el arreglo, con el check de preflight primero — poner la
medición donde alguien esté obligado a mirar.

De paso: la arquitectura afirmaba en cuatro lugares que un scheduler estaba activo cuando estaba
pausado, y el runbook de AXIS documentaba el `.npmrc` con una línea de menos.

## 2026-08-29 — La lente `●`/`◑` llega a producción con mecanismo, no con prosa

Release `b7f74c95a2af` (`released`, watchdog `drift_count=0`). **TASK-1785**: los readers de
`growth/seo` emiten `provenance` **requerido** —así que `tsc` nombra a cualquiera que no lo declare—,
un guard camina el DTO real exigiendo que cada hoja numérica tenga exactamente un dueño, y un censo
compara las superficies contra el filesystem en ambas direcciones. Tool
`get_seo_dual_lens_visibility` federada al gateway: devuelve las dos series separadas y **sin campo
combinado por contrato**.

Viajaron también **TASK-1700** (cola priorizada, 3 migraciones ya aplicadas en la única instancia
Cloud SQL) y **TASK-1792** (curva de CTR con sus 4 estados). `GROWTH_SEO_WORK_QUEUE_ENABLED` prendido
en los dos runtimes por el SoT; el scheduler del materializador sigue PAUSADO a propósito.

Dos hallazgos que no eran el objetivo y valen por separado: el PAT `read:packages` de AXIS llevaba
14 h vencido tumbando 3 de los 4 workers **sin que nada avisara**, y el audit de flags tenía un punto
ciego que **anulaba su propio gate ISSUE-150** (39 de 43 «env vars muertas» eran falsos positivos).
Los dos quedaron documentados y el segundo, arreglado.

## 2026-08-29 — El contrato `●`/`◑` deja de depender de que alguien lea la descripción

`TASK-1785`. Los readers de `growth/seo` emiten `provenance: SeoProvenance[]` en su `ok: true`:
**requerido**, así que `tsc` nombra a cualquier reader que no declare de qué naturaleza es lo que
devuelve. En lista, porque hay DTO genuinamente mixtos — `SeoPerformanceResult` declaraba UNA fuente
mientras su `summary` era siempre Search Console, o sea cifras medidas dentro de un envoltorio
rotulado estimado.

Dos guards nuevos: uno camina el DTO real y exige que **cada hoja numérica tenga exactamente un
dueño** (detecta sin-dueño y con-dos-dueños); otro censa las superficies del lane y del MCP
comparando contra el **filesystem**, en ambas direcciones. Sin ellos, el campo habría sido una
promesa: nada obligaba a que las procedencias declaradas cubrieran lo que hay.

Tool nueva `get_seo_dual_lens_visibility`: las dos series de posición separadas y rotuladas en una
sola llamada, **sin campo combinado por contrato**. Existe para invertir un incentivo — presentar
bien las dos lentes costaba dos llamadas y una decisión, presentarlas mal costaba una y ninguna.
⚠️ **Falta federarla al gateway** (cross-repo): hasta entonces Nexa y los clientes MCP no la ven.

Sin migración, sin flag, sin cambio de valor en ninguna cifra. `dataforseo_serp` quedó como lente
`estimated` y no `measured`: exacto no es medido — esa consulta la hicimos nosotros.

## 2026-08-29 — Las capacidades SEO nuevas pasan de "prendidas" a "ejercitadas"

`domain-overview` y `url-visibility` corrieron por el camino desatendido del scheduler (body `{}`),
con costo real **clavado al preview** (USD 0,01212 y USD 0,024) y re-corrida a USD 0. Los schedulers
tenían `lastAttemptTime` vacío y su próxima corrida agendada era el 16-17 de septiembre. La ventana de
48 h de `ISSUE-164` quedó cerrada midiendo el efecto en `grader_probe_results` (`blocked%` = 0) en vez
del conteo de Sentry, con la salvedad explícita de que la muestra es una sola corrida.

## 2026-08-28 — El módulo SEO tiene una sola cola de trabajo (`TASK-1700`)

- `greenhouse_growth.seo_work_queue_{snapshots,items,decisions}`: aggregate append-only que pasa a ser la
  ÚNICA autoridad de orden del módulo. Antes había cuatro criterios no comparables y el operador abría
  tres pantallas sin que ninguna dijera qué hacer primero.
- El score deja de ser un índice compuesto y pasa a **clics incrementales sobre demanda MEDIDA**, con la
  curva de CTR del propio sitio y su versión persistida en cada fila. Sin demanda medida no se fabrica un
  score: la fila recibe `NULL`, cae a su banda y su verbo honesto es `measure` — y lo impone un CHECK de
  la base, no el TypeScript.
- La lente de oportunidades de `/admin/growth/seo/keywords` cambia de FUENTE del orden sin cambiar de
  forma, detrás de `GROWTH_SEO_WORK_QUEUE_ENABLED` (OFF) con caída al reader legacy. Paridad verificada
  contra PG real: techo idéntico y orden relativo idéntico sobre las keywords compartidas.
- Materializador en Cloud Scheduler + ops-worker (nunca Vercel cron), tres señales de reliability nuevas
  y la capability `growth.seo.work_queue.decide` — ver y decidir son dos permisos distintos.
- Documentación en las tres capas (arquitectura §18, funcional y manual de uso), invariantes nuevos en
  `.claude/rules/growth-seo.md`, y la skill `seo-aeo` (`modules/02_SEO_CONTENT.md`, espejada en `.codex/`)
  gana la implementación de referencia del score más la advertencia comercial: la métrica es *table
  stakes* y lo propio es la COMBINACIÓN curva-propia × cambio-de-posición, una afirmación NEGATIVA que
  exige re-verificación a la fecha antes de cualquier uso comercial.
- **Rollout pendiente:** flag OFF en los dos runtimes, scheduler pausado, sin promover a `main`.

## 2026-08-28 — Landing Agencia de influencers publicada (`TASK-1598`)

- Se canonizó el estilo del brief como `Editorial Premium Brief`: una composición host candidate sobre
  `diagnostic_premium`, con una sola superficie editorial, jerarquía Poppins/Geist, controles accesibles, submit azul
  y decoración semántica. La frontera renderer/host quedó sincronizada en arquitectura, documentación funcional,
  manuales, registry público y skills `.codex/.claude`; copiar los observadores/iconos page-scoped a otra landing
  queda explícitamente prohibido hasta promover metadata browser-safe al renderer.

- El submit del brief abandona el teal heredado y adopta azul Efeonce con texto blanco. El selector de mercado
  reemplaza siglas por banderas SVG circulares para Chile, Colombia, México y Perú, visibles también tras elegir;
  las centra ópticamente, elimina el blur y conserva un outline nítido. Región/otro mantienen iconos semánticos. El
  gate live fija paleta, contraste, persistencia, teclado y responsive.

- Los selects premium eliminan la doble señal visual que mezclaba un caret del renderer con otro pseudo-elemento
  del host. Cada trigger conserva un solo indicador alineado al borde y las opciones mantienen iconos semánticos
  sobre superficies tonales claras, sin bloques azules sólidos. El gate live fija ambos invariantes en
  1536/1440/1414/890/390 y reduced motion.

- El cierre responsive corrige la franja de divulgación IA que a 1414 px dejaba un bloque vacío: ahora es full-bleed
  y conserva la retícula. El form reemplaza sparkle por documento y fija una jerarquía medible Poppins/Geist sin
  peso 650. Los assets mantienen duración, eliminan fechas ficticias y explican publicación, pauta o canales con
  chips tonales; el CTA secundario de ofertas usa contorno navy e icono diagonal. Fidelidad live pasó en
  1536/1440/1414/890/390 y reduced motion; SEO/AEO no tuvo drift.

- El rail estático de cuatro logos se reemplazó por el widget compartido `greenhouse_social_trust` de la landing de
  Redes Sociales. Conserva las tres señales regionales y añade el marquee monocromático canónico `logoMarquee.v2`
  con 3×7 marcas, label/nombre accesible y reduced motion; el gate live cubre composición y overflow en cuatro
  viewports. No se duplicó markup ni se creó otro widget.

- El último refinamiento visual convierte la franja bajo el hero en un rail editorial responsive, añade profundidad
  controlada a “Cinco capas”, usa iconos monocromos reales/semánticos en los destinos de assets y corrige el lenguaje
  visual del form con megáfono y contador próximo al textarea. El gate de fidelidad ahora cubre estos contratos en
  1536/1440/890/390 y reduced motion; el gate SEO/AEO volvió a pasar sin drift de metadata o schema.

- El CTA fijo se refinó como dock Midnight flotante y contenido, con safe-area y targets de 48 px. `Agenda una
  reunión` conserva la única superficie sólida verde; `Cuéntanos tu campaña` usa contorno transparente e icono
  diagonal. El gate live cubre geometría, clipping, superficie, jerarquía e icono en 1536/1440/890/390.

- El brief publicó una v2 `diagnostic_premium`: los dos selects ya no abren el popup nativo, sino comboboxes
  accesibles del renderer. La landing añade 11 marcas semánticas para mercado y activación sin duplicar estado ni
  validación; el gate live abre ambas listas y prueba teclado, overlay, contraste y clipping en cuatro viewports.

- Tras el review live del owner se corrigió una regresión de fidelidad que el smoke inicial no detectó: cargar assets
  no probaba la secuencia. El hero vuelve a rotar tres clips con progreso, play/pausa y sonido; también se restauraron
  badge de derechos, stack social, pulgar decorativo, selección por teclado de ofertas, CTA sticky y reveals. El gate
  nuevo `public-website:verify-influencer-landing-fidelity` ejerce esos contratos en 1536/1440/890/390 y reduced
  motion. Tras el segundo review, el hero mide el masthead Ohio y reserva 32 px adicionales: kicker, teléfono y
  sticker ya no entran en el área visual del header en ningún breakpoint probado. Tras el tercer review se corrigió
  la cascada `font: inherit` que dejaba los CTA en peso 400 y se consolidó un sistema AXIS con siete botones
  primary/secondary/tonal, iconos sin discos de fondo, foco doble, targets ≥44 px y sticky `inert` al ocultarse. El
  hero mantiene una sola acción sólida (`Agenda una reunión`); `Cuéntanos tu campaña` sigue como enlace secundario.
  El intro de conversión se mantiene sticky a 32 px junto al formulario desde 761 px; en móvil se apila y vuelve a
  flujo estático. El intro del FAQ es sticky sólo cuando caben sus dos columnas (>900 px); en 890/390 se apila y
  queda estático para no cubrir el acordeón durante el scroll. El gate cubre estos contratos en 1536/1440/890/390.
- Se corrigió la desaparición del brief: el loader estable de meetings sólo registraba
  `<efeonce-meeting-scheduler>` y dejaba vacío `<greenhouse-form>`. La landing carga ahora el renderer canónico de
  Growth Forms y conserva fallback host-owned. El gate live ya no acepta la mera etiqueta: exige custom element,
  root, siete bloques de campo, CTA submit, altura útil y ausencia del fallback tras montar.
- El brief se rediseñó como una sola superficie editorial premium: encabezado útil, duración, señales de confianza,
  seis iconos semánticos sin discos, controles de 56 px con texto de 16 px, estados focus/autofill/error, consentimiento
  tonal y submit full-width. El cambio es host/CSS page-scoped; no bifurca contrato, validación, Turnstile, destino ni
  tracking. El scorecard visual live quedó en `4.68/5` y el gate cubre el contrato visual en 1536/1440/890/390.
- El último review refinó el ritmo del form, reemplazó la URL cruda por `Consulta nuestra Política de privacidad` y
  convirtió los selects en controles tonales con affordance propia. El acordeón de agenda se retiró: el Growth CTA
  published `influencer-discovery-meeting` abre `open_meeting_scheduler` en diálogo nativo sobre el scheduler
  `discovery`; el smoke live verificó teclado, 390 px, reduced motion y cero enlaces HubSpot sin crear una reserva.
- Se publicó `https://efeoncepro.com/servicios/agencia-de-influencers/` como página Elementor `251627`, conservando
  el header/footer Ohio global y la dirección visual aprobada de Claude Design. El slug responde a intención comercial
  validada en CL, MX, CO y PE; la página sirve canonical, `index, follow`, schema visible y sitemap/lastmod.
- La conversión usa Growth Form gobernado `efeonce-creator-influence-brief` y el meeting canónico
  `fhsf-efeonce-lead-gen-web` / `discovery`; no reconstruye destinos, scheduler, CRM ni tracking en WordPress. El
  menu item nativo `Influencer Marketing` quedó bajo `Servicios Destacados`.
- Los seis clips únicos del diseño están activos y rotulados como visuales ilustrativos generados con IA, no casos ni
  resultados. QA live post-cache cubrió secuencia/interacciones, teclado, form, meeting, FAQ, schema, overflow,
  consola y performance de laboratorio; snapshots de página y menú dejan rollback acotado.
- El hardening SEO/AEO final publicó title y description comerciales, canonical/robots/excerpt, Open Graph/Twitter con
  imagen dedicada `1200×630` y un grafo sin entidades duplicadas: Yoast posee WebPage/Breadcrumb/WebSite/Organization;
  la página completa Service con cinco ofertas y FAQPage con seis respuestas visibles. El gate live nuevo valida
  metadata, imagen, schema, sitemap, menú y HTML inicial. La ruta queda publicada y elegible para indexación, sin
  presentar ese estado como prueba de indexación en Google. Menú: `Soluciones → Servicios Destacados`, después de
  `Redes Sociales`.

## 2026-08-28 — La curva de CTR declara si es utilizable, o la lente no ordena (`TASK-1792`)

- `readKeywordOpportunities` ordenaba por un campo colapsado a cero. `expectedCtrAt` preguntaba «¿está el
  bucket en el `Map`?» cuando la pregunta era «¿hay muestra para estimar un CTR?»: con un bucket presente y
  sin clics (`efeoncepro.com`: 75 impresiones, 0 clics en la posición objetivo) el guard devolvía `0`, la
  ganancia estimada colapsaba en **toda** la lente y el `.sort()` quedaba en no-op. La pantalla no ordenaba
  mal: **no ordenaba**, y nada fallaba. Medido contra PG el 2026-08-28: Efeonce 24/24 filas en cero; Berel,
  con curva sana, 1.445 de 1.798 (80%) empatadas. El disparador está garantizado en todo target recién
  onboardeado, así que no es un defecto de un cliente.
- Primitive nuevo [`src/lib/growth/seo/ctr-curve.ts`](src/lib/growth/seo/ctr-curve.ts): la curva se lee **sin
  `HAVING`** (un filtro en el SQL borra el bucket y vuelve indistinguible «no vino» de «vino sin muestra»),
  transporta su muestra por bucket y declara su usabilidad con un piso de **dos dimensiones** — impresiones
  **y** clics, porque la precisión de un estimador de tasa la gobiernan los éxitos. El umbral `1000/5` se
  **adopta** de `work-queue/score-versions.ts` y lo sostiene un test que compara el **veredicto** del
  predicado sobre nueve curvas fixture, no las constantes.
- El envelope de `KeywordOpportunitiesResult` gana `ctrCurveSource`, `curveSampleSize`, `orderedBy`,
  `targetPosition` y `expectedCtrAtTarget`. Cuando el techo no discrimina —curva no utilizable, o ganancia
  idéntica en todas las filas— la lente ordena por **demanda medida** (impresiones × cercanía a página 1) y
  lo declara. Los tres consumers (page server, lane ecosystem, tool MCP) son passthrough y heredan la
  procedencia sin lógica propia.
- El `FALLBACK_CTR_CURVE` declaraba 6% en la posición objetivo contra ~1% medido en dos sitios independientes:
  estaba calibrado para una SERP que ya no existe. Se reemplaza por **forma de referencia + nivel estimado del
  propio sitio** (un parámetro medido en vez de veinte prestados), con la curva expuesta forzada monótona no
  creciente — el híbrido anterior producía bucket 8 en `0,0000` junto a bucket 9 en `≈0,027`.
- Verificación: 663 unitarios + `src/lib/growth/seo/ctr-curve.live.test.ts` contra PG real, **4 passed, no
  `skipped`**. Cierra la costura que dejó pasar el defecto: los mocks ejercitaban el TS sin el SQL y el sanity
  el SQL sin el TS. Levanta el bloqueo del cutover de `TASK-1700`.

## 2026-08-28 — LicitaLAB: MCP oficial + radar Playwright autenticado y gateado

- La skill espejada `greenhouse-public-private-tenders` incorpora el companion `licitalab-mcp.md` en
  [Codex](.codex/skills/greenhouse-public-private-tenders/licitalab-mcp.md) y
  [Claude](.claude/skills/greenhouse-public-private-tenders/licitalab-mcp.md), con endpoint OAuth, inventario live
  de cinco tools read-only, recetas por oportunidad/proveedor/documentos, estados RAG, límites y canary verificado.
  El bundle entra a `pnpm skills:mirrors` para impedir que ambos agentes operen licitaciones reales con contratos
  distintos.
- `pnpm licitalab:radar:setup` guarda la credencial local ignorada con modo `0600`; `pnpm licitalab:radar`
  reutiliza un perfil Chrome aislado, pagina la vista autenticada y emite un reporte `efeonce.licitalab-radar.v1`
  bajo `.auth/`. El canary leyó 45 oportunidades únicas atravesando la primera página. Discovery no postula ni
  escribe CRM: los códigos pasan al MCP para análisis documental y cualquier promoción a HubSpot conserva
  confirmación humana, asociación y readback.
- Frontera canónica explícita: **LicitaLAB ve licitaciones públicas solamente**. Toda fila mantiene
  `public_opportunity` y cualquier `Proposal` derivada usa `origin='public_tender'`; nunca se interpreta una
  modalidad pública como `private_rfp` ni se mezcla este radar con Wherex, Ariba, Coupa u otras fuentes privadas.
- El contrato descubierto de promoción a HubSpot quedó documentado en la skill de licitaciones y en
  `hubspot-greenhouse-bridge`: upsert por ID + `gh_idempotency_key`, reutilización de Company, asociaciones
  idempotentes sin contactos ficticios, URL directa, y separación de `fecha_de_cierre_de_licitacion` versus
  `closedate`. La precedencia es cliente existente → Core; nueva cuenta por Licitación → Strategic Bets; Compra
  Ágil nueva queda `policy_required`. El bridge actual todavía no transporta esos campos ni resuelve todas las
  identidades/asociaciones; es contrato objetivo para automatización. La carga manual confirmada usa el MCP de
  HubSpot como writer gobernado y no queda bloqueada por esa brecha.
- La etapa inicial quedó fijada por metadata live: una candidata aprobada entra a `Pipeline de ventas`
  (`default`) en `Calificado para comprar` (`qualifiedtobuy`), nunca en `Cita programada`; las filas crudas del
  radar permanecen fuera del CRM. La skill documenta el avance técnico→muestra opcional→precio→formalización→cierre
  y excluye el pipeline de Shared Selling. El snapshot completo de 99 deals LicitaLAB mostró 95 perdidos, 3 ganados,
  1 en `appointmentscheduled` y 0 intermedios, por lo que el histórico no se canonizó como workflow.
- Primera promoción live aprobada y releída: la oportunidad `1098710-22-LP26` creó Company HubSpot `57870164778`
  y deal `64461187076`, asociado en `default/qualifiedtobuy`, `Strategic Bets`, CLP 250.000.000, con deadline y
  adjudicación separados. La Company terminó con `num_associated_deals=1`; no se inventó contacto.
  `gh_commercial_party_id` permanece vacío y la automatización por bridge continúa pendiente.
- La promoción manual se amplió con ProChile (`deal 64482163516` ↔ Company `31209269815`) y Defensoría
  (`deal 64471071912` ↔ Company nueva `57878590071`). ProChile quedó `Core Pipeline`/`existingbusiness` porque la
  Company es cliente vigente; Defensoría quedó `Strategic Bets`/`newbusiness`. Ambas usan
  `default/qualifiedtobuy`, conservan fechas separadas y tienen una sola coincidencia por `gh_idempotency_key`.
  `gh_deal_origin` queda vacío: el enum live sólo admite `greenhouse_quote_builder` y nunca se etiqueta una
  licitación con un origen falso.
- El radar ampliado leyó 163 oportunidades y se promovieron otras cinco con Company y asociación verificadas:
  UOH/web (`64466117716`), Beneficios Estudiantiles/medios (`64482321775`), Campaña VCM (`64466272830`),
  Valparaíso/paid media (`64469214508`) y JUNJI/RFI ticketing (`64469523247`). Cada búsqueda por
  `id_de_licitacion` devolvió una sola fila; no se asociaron contactos sin evidencia. Los cinco nuevos Deals no
  recibieron `gh_idempotency_key` en la carga aprobada, por lo que esa propiedad queda como brecha explícita y no
  como garantía supuesta.
- Se creó `docs/commercial/tenders/LICITATION_CRM_REGISTER.md` como índice operativo compartido para Codex y
  Claude, actualizado con diez oportunidades y ocho Deals verificados. Registra decisión, postulación, fechas, IDs/enlaces y
  asociaciones sin desplazar las fuentes autoritativas; el histórico de 99 deals permanece sólo en HubSpot.
- El patrón se extendió a `docs/commercial/CRM_DEAL_REGISTER.md`: vista transversal para negocios Core, Strategic
  Bets y otros orígenes, con una fila sólo después de verificar el Deal en HubSpot. Las licitaciones promovidas se
  sincronizan en ambos registros por `deal_id`; las oportunidades todavía en radar permanecen sólo en bid desk.
- El segundo lote público y ocho RFP privados Wherex elevaron el registro a 30 oportunidades revisadas y 24 Deals
  verificados. Al 2026-08-29 hay 23 Deals abiertos de esta admisión y uno `closedlost`; HubSpot suma además el RFI
  CRM Mineduc anterior al corte, para 24 Deals de licitación abiertos en total. Ajinomoto ya está `closedlost`.
- La skill espejada suma `crm-portfolio-operating-model.md`: promoción común con segundo readback posterior a
  automatizaciones y cartera separada en diez bids prioritarios, tres RFI livianos y diez gates previos.
- El readback live encontró los ocho Deals Wherex en `Core Pipeline` pese a que continúan `newbusiness`; se registra
  la deriva frente a la política `Strategic Bet` sin corregirla silenciosamente. CINTERMEX queda `HOLD vencido /
  portal no verificado` y los cuatro IDs de Grupo Reditos quedan `No bid` por decisión del operador.

## 2026-08-28 — El candidato de discovery no declara pertinencia (hueco documentado y levantado)

- Auditando la salida del smoke apareció que el candidato **no transporta ninguna señal de marca,
  categoría ni relevancia** — ni en la tabla ni en el DTO. Consecuencia medida: 50 keywords de
  consumidor sobre ChatGPT (`chatgpt en linea`, `chatgpt rojo`) pasaron **todos** los checks para un
  target que vende servicios AEO B2B.
- 🔴 El vector estructural no es elegir mal la seed: es **`TASK-1662`**. En el gap competitivo los
  candidatos salen de dominios del competidor, así que **las seeds las elige él**, y sirve segmentos
  que el cliente no. Ahí no hay operador a quien educar.
- ⚠️ **La urgencia que se argumentó primero era falsa, y se corrigió el mismo día** (`65372ea68`).
  Se afirmó que el orden por defecto pondera volumen y que la cola append-only de `TASK-1700`
  congelaría lo irrelevante arriba. No ocurre: `work-queue/priority-score.ts` no mira el volumen
  estimado del proveedor, y el CHECK `basis_band_score` impide fabricar un score sin demanda medida —
  un candidato irrelevante **sin** impresiones cae a banda 3 con score `NULL` y no compite. El caso
  que sí sostiene la task es el otro: keyword irrelevante **con** impresiones reales, que atraviesa
  el CHECK y entra a la cola. El vector es la demanda medida, no el volumen del proveedor.
- **Levantada como `TASK-1791`** (`to-do`, P1, `EPIC-022`, `backend-data`, `Blocked by: none`), sin
  dueño asignado todavía. La señal entra como **factor del item con su procedencia, jamás como
  entrada del `priority_score`**: `evidence_ref` es opaca por contrato (cero FK, cero JOIN al motor
  que produciría la señal), así que puntuar con ella sería puntuar con algo que el aggregate no puede
  citar. El hallazgo queda además en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 (no sólo en una
  bitácora que rota) porque tres sesiones lo verificaron por separado el mismo día.

## 2026-08-28 — El drain de keyword discovery baja de 10 a 2 minutos

- `ops-seo-keyword-discovery-drain` pasa de `*/10` a `*/2`. `Descubrir` es un workbench
  interactivo: el operador encolaba y esperaba **5 minutos de media, 10 en el peor caso**, cuando la
  corrida en sí tarda segundos. El `*/10` no compraba nada — el drain con cola vacía es no-op, así
  que correrlo 5× más seguido **no gasta un centavo más**. Es la cadencia que `ops-outbox-publish`
  ya usaba por el mismo motivo.
- Seguro a esta cadencia: el claim de la corrida es un `UPDATE` condicional
  (`WHERE status='pending' … RETURNING`), así que un segundo worker matchea cero filas y responde
  `busy` sin tocar al proveedor.
- Aplicado en los dos lugares (SoT `services/ops-worker/deploy.sh` + `gcloud scheduler jobs update`).
  ⚠️ `main` todavía declara `*/10`: hasta el próximo release, un deploy del worker desde `main`
  revertiría el schedule en silencio. Documentado en el Handoff.

## 2026-08-28 — Release a producción `e82c18579b05`: el contrato de discovery corregido, vivo

- Paso a producción de **TASK-1694** y **TASK-1692** (PR #209, 30 archivos de código, **cero
  migraciones**). Manifest `released` en un solo run del orquestador (`33208942436`, 12m51s), ambos
  gates `production` aprobados sin stall, watchdog `ok` con `drift_count=0`.
- **Primer release del ledger que pasa sin break-glass desde un batch de dos tasks.** La razón es
  estructural: sin migraciones no hay dominio irreversible, así que el classifier dio `ship` limpio.
- **Cero flags que prender.** El release no introduce ninguno, y los que gatean el dominio ya
  estaban `true` en Production — verificado leyendo el VALOR, no la presencia.
- 🔴 **Verificado con canary de contrato, no sólo con el manifest.** Producción respondió
  `maxLinkBarrier aceptado; ignoredFilters=maxDifficulty` (TASK-1694 ejecutándose), y el lane
  devolvió **400** a un consumer intentando escribir `promoted_to_tracking` o el retirado
  `selected_for_target` (TASK-1692: el boundary de escritura vivo). Un manifest `released` prueba
  despliegue; el canary prueba comportamiento.
- Gateway MCP desplegado con el schema federado nuevo de `get_seo_keyword_discovery`.
- **Smoke con gasto ejecutado el mismo día** — 3 corridas, USD 0,0482, MX y CL, los dos endpoints
  cuyo payload cambió. Las tres `succeeded`: el payload sin `filters` es aceptado por Labs (riesgo
  de la matriz refutado con evidencia) y `volumePolicy: "all"` quedó persistido en el snapshot.
- 🔴 **Y desmintió la justificación escrita de la propia task**: 102 candidatos, 2 endpoints, 2
  mercados → CERO con volumen nulo o cero. Los índices de sugerencias e ideas del proveedor sólo
  devuelven keywords con volumen medido, así que el filtro que se quitó era un **no-op** ahí; los
  nulos aparecen sólo en `keyword_overview`, que nunca lo llevó. Quitarlo sigue siendo correcto
  (elimina una asimetría no declarada), pero el beneficio prometido no tiene evidencia. `TASK-1700`
  (P0) queda desbloqueada y con su prerequisito de runtime cumplido.
