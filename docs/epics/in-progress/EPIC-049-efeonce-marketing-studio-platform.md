# EPIC-049 — Efeonce Marketing Studio: plataforma de campañas API-first

## Decisión vigente 2026-10-05 — Creative Studio, vista creativa de las mismas campañas

El operador decidió que Studio tiene una vista gemela, **Creative Studio**, para el diseñador, el director de arte y el
brand manager, sobre **las mismas campañas** que Marketing Studio (un aggregate, dos vistas; la vista nunca autoriza).
ADR: [`EFEONCE_STUDIO_CREATIVE_VIEW_DECISION_V1.md`](../../architecture/marketing-studio/EFEONCE_STUDIO_CREATIVE_VIEW_DECISION_V1.md).
Su roadmap de siete slices (vista y switch, receta de producción en el catálogo, hitos derivados, feedback anclado,
referencias, chequeo de marca, regla de activación con versión aprobada) entra a este epic como tasks futuras; no se
crearon tasks con esta decisión. Globe deja de usar «Creative Studio» como descriptor (delta en la decisión de nombre).

## Decisión vigente 2026-10-04 (posterior) — escritura por MCP con TASK-2003

El operador decidió (2026-10-04, después de retirar TASK-1899) que Efeonce es agent-friendly y que todo lo de EPIC-049
nace Full API Parity con sus tools en el MCP, **escrituras incluidas**. La «nueva decisión» que dejaba pendiente la
retirada de TASK-1899 es **TASK-2003**: núcleo de escritura por MCP con identidad delegada (scope en Entra, canje por
capability exacta, persona como actor, gateway con escrituras `T1`), **sin** aprobaciones ni `proposalDigest`, que
siguen retirados en TASK-1899. Las escrituras `T1` de esta task se federan sobre TASK-2003 cuando esté vivo; las `T2`
siguen por CLI/UI. La implementa Codex.

**Sin bloqueo** (revisión de Codex aceptada por el operador, 2026-10-04): esta task **no espera** a TASK-2003. Se
construye en paralelo (API, CLI y UI) con todas sus tools en el manifiesto; sus escrituras se federan por MCP en cuanto
TASK-2003 esté vivo.

## Decisión vigente 2026-10-04 — TASK-1899 retirada

El operador retira TASK-1899 para preservar libertad de implementación en la etapa actual de Studio. Se anula
su condición de requisito previo y la obligación de cerrar cada entrega API/CLI/UI con escrituras MCP operativas.
La ruta de desarrollo de activaciones pasa a **TASK-1905 → TASK-2001 → TASK-2002**, respetando sus dependencias
funcionales. Las referencias posteriores a TASK-1899 son diseño histórico: la federación de escrituras y sus
confirmaciones se replantearán sólo por nueva decisión. Se mantienen API-first y los controles de acceso existentes;
esta retirada no habilita escrituras MCP ni modifica producción. Implementación local revertida, sin rollout.


## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Fundación en vivo (TASK-1887). Studio listo para agentes (TASK-1890) y federado en Efeonce MCP con lectura en producción (TASK-1891). Originales en GCS + worker de medios (TASK-1893) y observabilidad + restauración probada (TASK-1896) en producción desde 2026-09-26 (release Greenhouse 92002873ced9). ADR de fuente única e ingesta aceptado el 2026-09-26: Studio + GCS son la fuente; OneDrive es taller; un command y tres puertas (CLI, MCP, UI); sin espejo por Microsoft Graph. TASK-1894 Entregables A (puerta de ingreso) y B (commands de escritura, revisión y tres estados; API 1.4.0) en producción de Studio desde 2026-10-02; gateway v1.10.0 con las escrituras en el manifiesto pero sin federar; capabilities de escritura en Greenhouse `develop`, sin release a producción; Entregable C (corte de CMP-001…005 a Studio) diferido por el operador. Siguen TASK-1892, 1894 (Entregable C), 1895, 1897, 1898 (métricas, corte, UI, CONNECT y login); TASK-1899 retirada por el operador el 2026-10-04, sin reanudación automática. ADR de capa de estrategia aceptado el 2026-09-26 (canales, ICP, plan, SEO/AEO, IA y paridad total con ejecución por agentes); TASK-1905 tiene Studio desplegado y verificado (main 74073de, API 1.6.0, 59 tools, catálogo 52); backfill 134 unmapped, capability Greenhouse, ICP real y federación pendientes; sigue in-progress; TASK-1906…1912 están en to-do. ADR de operación híbrida con agentes aceptado el 2026-09-26 (work items, registro de roles, despachador Claude/OpenAI, evals y costo por rol); sus tasks TASK-1913…1916 están en to-do. El flujo editorial SEO/AEO pertenece a Studio por decisión del operador del 2026-10-04: TASK-1667 y TASK-1669 se trasladan desde EPIC-022, en diseño. La reproducción de video (TASK-1998 contrato y transporte, TASK-1999 reproductor) está en producción desde el 2026-10-04 (Studio API 1.5.0). Activaciones y calendario de Studio (ADR de estrategia §15, 2026-10-04): TASK-2001 y TASK-2002, con el núcleo MCP TASK-2003 en paralelo, sin bloquear API/CLI/UI. Censo: 30 hijas, 7 complete, 2 in-progress y 21 to-do.`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Julio Reyes`
- Branch: `Greenhouse develop (docs) · efeonce-marketing-studio main (código)`
- GitHub Issue: `none`

## Summary

Convierte el Campaign Manager local (HTML en OneDrive, prototipo de Codex aprobado por el operador el
2026-09-25) en **Efeonce Marketing Studio**, `studio.efeonce.org`: el sistema de registro de campañas con
brief, conceptos, assets, copys, configuraciones de anuncio, plan de medios, calendario, revisión y
publicación. Next.js en Vercel con la API `/api/v1` en el mismo deployment y el dominio sin framework;
Postgres en la instancia existente con base propia; repo propio `efeoncepro/efeonce-marketing-studio`.

## Why This Epic Exists

El trabajo de campaña está repartido en tres lugares que no se hablan: CDR y tasks en este repo, briefs y
assets en OneDrive, y un HTML autogenerado que no se actualiza solo (al 2026-09-25 sólo conocía CMP-001 y
CMP-002, con CMP-003 a CMP-005 ya decididos). No hay colaboración, versión, acceso remoto ni un contrato que
Efeonce MCP o un agente puedan consumir. Resolverlo cruza repo nuevo, datos, infraestructura GCP/Vercel,
identidad (Efeonce ID), UI e integraciones (Metricool, plataformas de pauta, Globe): no cabe en una task.

## Outcome

- Studio vivo en `studio.efeonce.org` con las cinco campañas importadas y legibles por web y API.
- Contrato OpenAPI v1 versionado, consumido por la web, CLI y (después) Efeonce MCP.
- Login con `auth.efeonce.org` y organización derivada del actor.
- Studio + GCS como fuente única de campañas, piezas, versiones, derechos y aprobaciones; OneDrive/SharePoint queda
  como taller del equipo. Un final existe sólo cuando entró a Studio.
- Escrituras gobernadas (idempotencia, revisión, auditoría con la persona como actor) por un solo command y tres
  puertas (CLI, MCP, UI), y corte de autoridad por campaña con fecha.
- Worker asíncrono para miniaturas/GCS, readback de Metricool y publicación programada.

## Architecture Alignment

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (ADR `Accepted`
  2026-09-26, fuente única e ingesta; reemplaza la regla «OneDrive fuente, Studio proyección reimportable»)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (ADR `Accepted`
  2026-09-26, capa de estrategia: catálogo de canales, ICP en Greenhouse por organización, plan de campaña, SEO/AEO con
  SV360, IA por agentes con procedencia, medición y aprendizajes; niveles de riesgo `T0`/`T1`/`T2` y paridad total)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md` (ADR `Accepted`
  2026-09-26, operación híbrida con agentes: work items, registro de roles de agente, identidad delegada y de servicio,
  tres modos con un contrato de corrida, despachador con adaptadores Claude/OpenAI, evals, costo y métricas por rol)
- Skill `.claude/skills/efeonce-campaign-planning/SKILL.md` (planificación de campañas con IA sobre Studio; consumidora de
  las tools de TASK-1905…1911) y skills de rol `efeonce-agent-seo-aeo` y `efeonce-agent-media-planner`
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (ADR, delta 2026-09-25)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md`
- `docs/architecture/creative-studio/` (frontera con Globe)

## Decisión de fuente única e ingesta (ADR 2026-09-26)

- **Fuente:** la base `marketing_studio` (schema `studio`) es dueña de campañas, piezas, versiones, derechos,
  aprobaciones y evidencia; el bucket privado `efeonce-marketing-studio-originals` es dueño de los bytes
  (`originals/sha256/<2 primeros hex>/<sha256>`, versionado, nunca sobrescrito).
- **Taller:** OneDrive/SharePoint conserva editables y borradores; «final» nunca se infiere por carpeta.
- **Un command, tres puertas:** `createAssetVersion` (tool `studio.asset.version.create`) sirve a la CLI
  `studio:upload`, a los agentes por MCP y a la UI. Subida en dos pasos: URL firmada V4 de un objeto (reanudable para
  video grande), bytes directo a GCS, confirmación con sha256 recalculado. Ningún binario pasa por MCP ni por Vercel.
- **Aprobación humana:** una versión nueva entra pendiente de revisión; aprueba una persona o un agente con su
  identidad delegada tras `dryRun` → confirmación. Capabilities: `marketing_studio.asset.write` (subir:
  `efeonce_admin`, `efeonce_account`, `efeonce_operations`, `designer`) y `marketing_studio.campaign.approve`
  (aprobar: los tres primeros; `designer` sube pero nunca aprueba).
- **Corte:** por campaña y con fecha; después del corte, `pnpm media:ingest` sólo sirve para backfill de historia.
- **Fuera del plan:** espejo programado de SharePoint/OneDrive por Microsoft Graph.

## Child Tasks

**Censo 2026-10-04: 30 hijas directas; 7 complete, 2 in-progress y 21 to-do.** El traslado de TASK-1667/1669 cambia ownership, no acredita implementación.

Orden vigente tras retirada de 1899 (2026-10-04): 1890 → 1891 · 1893 en paralelo · 1896 → 1892 → 1894 → 1895 → 1897 (cuando convenga) → 1898 al final. TASK-2003 corre en paralelo para autoridad MCP T1; no reintroduce la dependencia1899.

Capa de estrategia (ADR 2026-09-26; ruta actualizada 2026-10-04), sobre commands de 1894, sin TASK-1899: 1906 (Greenhouse, puede empezar ya) · 1905 → 1907 → 1908 · 1909 · 1910 (en paralelo; 1908 y 1910 además necesitan 1892) → 1911 → 1912 (UI, sección por sección cuando su backend está en staging, tras 1895). 1898 sigue siendo la última del programa.

**Regla del programa (operador, 2026-10-04): todo lo que se implemente en EPIC-049 es Full API Parity y operable por MCP, lecturas y escrituras, con identidad delegada; la federación sólo se acredita con una sesión MCP real que ejecute las operaciones nuevas; su ausencia no se disfraza de éxito API/CLI/UI ni convierte TASK-1899 retirada en prerequisito.** La ruta de producto de activaciones y calendario (ADR de estrategia §15) es: **TASK-1905** → **TASK-2001** → **TASK-2002**, y en paralelo, sin bloquearla, **TASK-2003** (núcleo de escritura delegada por MCP, sin aprobaciones; TASK-1899 retirada), que federa las escrituras de cada una cuando esté vivo. Detalle anterior de la ruta, reemplazado: **TASK-1905** (catálogo de canales con la taxonomía de §15 y los valores UTM de RESEARCH-012) → **TASK-2001** (activaciones, evidencia de ejecución, descubrimiento de Metricool, tracking URL por activación) → **TASK-2002** (calendario), con la dirección visual v3 de 2002 en paralelo desde ya.

Operación híbrida con agentes (ADR 2026-09-26; ruta corregida tras retirada), después de 1894 y con delegación MCP 2003 en paralelo: 1913 (Slices 1–3, work items con personas) → 1914 (registro de roles y tarjetas) → 1913 Slice 4 (asignación a roles) → 1915 (ledger y modo interactivo primero; despachador y adaptadores después) → 1916 (evals, costo y métricas; compuerta de autonomía). El modo delegado en segundo plano de 1915 queda bloqueado por TASK-1917 (EPIC-044 U22: delegación por corrida con claim `act`, creada por decisión del operador el 2026-09-26). La UI de work items, roles, corridas y métricas es follow-up consumidor de 1895/1912.

**Regla de paridad del programa (operador, 2026-09-25):** todo lo que se puede hacer en la UI se puede hacer por la API y, por consiguiente, por MCP — incluidas las aprobaciones. Las aprobaciones las decide una persona; un agente puede ejecutarlas con la identidad delegada de esa persona y su confirmación explícita. Ninguna capacidad nace sólo en la UI.

- `TASK-1887` — **Complete.** Fundación: repo, bases y roles, modelo de dominio, API v1, import del catálogo, renditions privadas, UI aprobada (claro/oscuro), Vercel + dominio (modo `open`). En vivo en `https://studio.efeonce.org`.
- `TASK-1890` — **Complete 2026-09-26** (manual servido en producción tras el release `0e87c7a443a2`). Studio listo para agentes: registro único de operaciones (17: 12 tools + 5 exclusiones), manifiesto con paridad, semántica, bearer de servicio, organización canónica, capability `marketing_studio.campaign.read` y manual. En producción de Studio desde `d08387f`. **Pendiente:** release de Greenhouse a producción para servir el manual `marketing-studio`.
- `TASK-1891` — **Complete 2026-09-26**: provider encendido y verificado en producción (`00061-sbc`, canary MCP real verde; la denegación en vivo a una persona sin capability queda sin ejercitar, cubierta por tests). Federación en Efeonce MCP de las 12 tools del manifiesto. Canje RFC 8693 en Greenhouse (cliente `efeonce-mcp-marketing-studio`, migrado) y gateway 1.8.0 desplegado (PR `efeonce-mcp#19`, revisión `00057-w8h`) con el flag OFF. **Pendiente:** release de Greenhouse (canje + manual) → `MARKETING_STUDIO_PROVIDER_ENABLED=true` + dispatch → `pnpm studio:canary` con token Entra humano → sesión MCP real. Regla desde aquí: toda capacidad nueva de Studio nace con su tool en el manifiesto o una exclusión con razón.
- `TASK-1892` — To-do. Métricas de marketing desde Greenhouse (Search Console, GA4, SEO) por el lane ecosystem `/api/platform/ecosystem/growth/*`, nunca por SQL. Pauta (Meta/LinkedIn) y social orgánico (Metricool) quedan en adapters propios de Studio.
- `TASK-1893` — **Complete 2026-09-26.** Almacén de originales en GCS (finales aprobados, sha256, versionado, derechos) y worker Cloud Run de medios: renditions automáticas, portadas de video, recortes y readback de Metricool. En producción: 30 versiones ingestadas por ambiente, derivados automáticos, canary de descarga verde, readback con 2 posts publicados observados. **Pendiente (Follow-ups):** 24 imágenes de CMP-002 sin sha256 en el catálogo, federación de `studio.asset.download` en el gateway, costo del primer mes.
- `TASK-1894` — **In progress.** Entregables A y B en producción de Studio desde 2026-10-02 (`a8c7886`, API 1.4.0, manifiesto de 44 tools; migraciones aditivas aplicadas en staging y producción). B entrega: máquinas de estado, commands de revisión, campaña, brief, concepto, pieza, derechos, copy, anuncio, plan de medios y posts; `permissions` por campaña; `revision`/`ETag`; CLI `pnpm studio:write`; autoridad por campaña (`source_of_truth` `onedrive` | `studio`: escribir sobre una campaña `onedrive` responde `409 campaign_not_studio_owned`). Las cinco campañas reales siguen `onedrive`. Greenhouse: capabilities `marketing_studio.asset.write` y `.campaign.write` en `develop` (`9d0d698d4`), **release a producción pendiente** del operador. Gateway v1.10.0 (efeonce-mcp#23) sincronizado y desplegado: las 30 escrituras viajan en el manifiesto y no se federan todavía; T1 delegado pasa a TASK-2003. **Entregable C (Slices 8–10, corte de campañas y retiro de OneDrive) diferido por el operador**; el corte de CMP-004 necesita fecha y a quién avisar. Alcance original: command `createAssetVersion` y URL firmada de subida, CLI `studio:upload`, derechos mínimos al subir, commands de escritura y de aprobación con `requiresPerson` y `dryRun`, scopes de API `studio:assets:write` y `studio:write`, capabilities `marketing_studio.asset.write` y `marketing_studio.campaign.write`, corte por campaña con fecha y señal «pieza aprobada sin original en Studio».
- `TASK-1895` — To-do. Puerta UI: edición, subida, revisión y aprobación de versiones y panel de métricas, consumidora de los mismos commands de 1894 (el digest de TASK-1899 está retirado).
- `TASK-1896` — **Complete 2026-09-26.** Observabilidad, alertas y restauración verificada de `marketing_studio`: Sentry, uptime con email, health profundo, `studio.ops_run`, ensayo verde en producción (job 49 s) con scheduler activo, señal `platform.marketing_studio.health` y aviso Teams «EO - Admin». **Pendiente (Follow-ups):** reglas propias de Sentry (API a Workflows), error forzado, caída simulada del uptime, mensaje real a Teams, primera corrida programada del ensayo (29/09).
- `TASK-1897` — To-do. (Greenhouse) Cerrar `CONNECT` de PUBLIC en `greenhouse_app` y en las bases de Studio.
- `TASK-1899` — **Retirada por el operador (2026-10-04); to-do no ejecutable.** Implementación local revertida, sin rollout. No bloquea el desarrollo de Studio; TASK-2003 es la decisión posterior para T1 delegado; no recupera digest/aprobaciones.
- `TASK-1898` — To-do. Login con Efeonce ID (`auth.efeonce.org`) y cambio de `STUDIO_ACCESS_MODE` a `efeonce_id`. Última del programa por decisión del operador (2026-09-25).
- `TASK-1905` — **In-progress; Studio en producción desde 2026-10-04**, main `74073de1188f`, API 1.6.0/59 tools, catálogo 52 published en staging/prod. Migraciones/worker promovidos, warn e ICP disabled, canaries API verdes. Backfill134 unmapped conserva owner efeonce_operations; capability Greenhouse no publicada, nueva federación pendiente (T1 por 2003), ICP real 1906/1892. Nueva CLI API-only Greenhouse local (`pnpm studio`, 18 tests PASS) sin release ni carga aplicada productiva. [Release](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md), [CLI](../../audits/marketing-studio/2026-10-04-studio-api-cli.md), [historia local](../../audits/marketing-studio/TASK-1905-local-verification.md).
- `TASK-1906` — To-do. (Greenhouse) Catálogo versionado de modelo de cliente por organización (`greenhouse_commercial.customer_model_*`), lane ecosystem, lane app delegado (borrador `T1`, publicación `T2`), tools MCP con la clase `efeonce.mcp.commercial.write`; versión 1 de Efeonce desde `docs/context/13`. Sin bloqueos.
- `TASK-1907` — To-do. Plan de campaña versionado: estrategia (objetivo, KPIs con meta y fuente, hipótesis), matriz persona × etapa × canal, casa de mensajes con evidencia, plan de contenidos con hueco calculado, plan de medición y programa; borrador `T1`, aprobación `T2`. Depende de 1894, 1905 y 1906; T1 MCP 2003 en paralelo, 1899 retirada.
- `TASK-1908` — To-do. Plan SEO/AEO con Search Visibility 360: referencias + snapshots inmutables (competitivo sólo interno), seguimiento en vivo, propuestas de rastreo en Studio ejecutadas en Greenhouse por `track_seo_keywords` con `proposalRef` y carril delegado (persona como actor). Depende de 1907 y 1892; T1 MCP 2003 en paralelo, 1899 retirada.
- `TASK-1909` — To-do. IA por agentes con procedencia inmutable y aceptación por persona, contexto por campaña, validadores de copy y pieza, reglas de voz versionadas, borradores de brief de contenido, QA e informe semanal; IA en el producto como follow-up. Depende de 1905 y 1907; T1 MCP 2003 en paralelo, 1899 retirada.
- `TASK-1910` — To-do. Medición real: cuentas Meta/LinkedIn de sólo lectura conectadas por `T2`, readback como observaciones (líneas `actual` sólo de ahí), atribución bow-tie por lane de Greenhouse, chequeo de destino, progreso de KPIs y mapeo de métricas editable; capability `marketing_studio.integration.manage`. Sólo lectura sobre plataformas. Depende de 1892, 1905 y 1907; T1 MCP 2003 en paralelo, 1899 retirada.
- `TASK-1911` — To-do. Experimentos desde hipótesis del plan aprobado, biblioteca de aprendizajes append-only con evidencia y validación `T2`, calendario unificado. Depende de 1907 y 1910; T1 MCP 2003 en paralelo, 1899 retirada.
- `TASK-1912` — To-do. UI del espacio de planificación (pestaña Estrategia, aprobación en dos pasos, hueco, procedencia, aprendizajes y programas) sobre la dirección `v4 · Estrategia` a aprobar; `ui-ux`, flow, UI ready no. Depende de 1895 y 1907 (+ backends por sección).
- `TASK-1913` — To-do. Work items y asignaciones: entidad por campaña con catálogo de tipos versionado, máquina de estados en el command, responsable persona o rol de agente con versión, insumos por referencia, entregable con procedencia, revisión y traspaso como work item nuevo; asignar a un rol es `T1` dentro del techo y `T2` sobre él; `assignmentId` como clave de la corrida lógica. Depende de 1894 (asignación a roles: 1914); 1899 retirada.
- `TASK-1914` — To-do. Registro de roles de agente: tarjetas versionadas sin sintaxis de proveedor, compilador portable con `cardDigest`, lista blanca de tools aplicada en Studio y en el gateway, modos, kill switch y política por organización; cinco tarjetas iniciales y tres skills de rol nuevas (copywriter, QA creativo y de marca, analista de desempeño); capability `marketing_studio.agent_role.manage`. Depende de 1894 y 1913; 1899 retirada.
- `TASK-1915` — To-do. Despachador en Cloud Run con contrato único de corrida, ledger con idempotencia por corrida lógica y lectura antes de reintentar, reserva de costo, adaptadores `claude-agent-sdk`, `claude-managed-agents`, `openai-agents-sdk` y `openai-responses` detrás de flags, modo interactivo registrado, programas `T2` e identidad de servicio `T0`/`T1`; confirmación `T2` sólo desde token sin `act`. Depende de 1913 y 1914; 1899 retirada; segundo plano delegado bloqueado por TASK-1917 (EPIC-044 U22).
- `TASK-1916` — To-do. Evals por rol × runtime × modelo con rúbrica objetiva + humana (sin autocalificación), compuerta de autonomía, catálogo de precios y costo normalizado, métricas por rol y señales, runtime por defecto por rol decidido como `T2`; capability `marketing_studio.agent_eval.grade`. Depende de 1914, 1913 y 1915.
- `TASK-1998` — **Complete 2026-10-04 (en producción).** Reproducción de video: derivado `playback` (MP4 H.264, lado corto ≤ 720 px, *faststart*) en el worker de medios con backfill idempotente por el barrido, transporte `/api/v1/media/{token}` con `302` a URL firmada V4 (sin bytes de video por Vercel, `Range` atendido por GCS) y `playback` en el contrato de lectura (API 1.5.0, manifiesto regenerado). Cloud CDN evaluado y diferido. Gateway sincronizado (efeonce-mcp `454d80eb6`).
- `TASK-1999` — **Complete 2026-10-04 (en producción).** Reproductor nativo en el panel de la pieza (feed e historia, sin autoplay), todas las piezas de un formato en el tablero (la versión «con intro para Instagram» de CMP001-08 era invisible), duración y «Ver video» / «Ver imagen» en los huecos.
- `TASK-2001` — To-do. Activaciones de campaña: la salida concreta de una campaña en un canal (campaña obligatoria, campañas Always On, modality × family × platform × placement, cuenta, mercado, pieza en versión exacta, fecha planificada), evidencia de ejecución adjunta (Metricool, después plataformas de ads), estado calculado plan vs ejecución, descubrimiento de lo programado en Metricool y «ejecución sin activación» en Hoy; el calendario lee activaciones. Bloqueada por TASK-1905 (catálogo).
- `TASK-2002` — In-progress. Calendario de activaciones en la UI: filtros por dimensión, tarjetas con pieza y estado de ejecución, hoja de detalle y bandeja de ejecución sin activación. Delta 2026-10-05: en producción de Studio en sólo lectura (`main` `d0ec7e0`, `/calendar` 200), fiel 1:1 a la dirección v3; diálogos de escritura verificados en local con un actor temporal autorizado y revertido. Pendiente: escrituras web (TASK-1898), escrituras MCP (TASK-2003), hojas de email y landing (contrato del reader, TASK-2001), hoja de blog (TASK-1667/1669); V3-Later/Quarter/SheetMore/Bulk quedan para TASK-2005/2006.
- `TASK-2003` — To-do (la implementa Codex). Núcleo de escritura por MCP con identidad delegada: scope de escritura en Entra, canje por capability exacta en Greenhouse, Studio registra a la persona vía MCP como autora, gateway federa las escrituras `T1`. Sin aprobaciones (`T2` siguen por CLI/UI; su confirmación queda en TASK-1899, retirada). Corre en paralelo: no bloquea TASK-1905/2001/2002; federa sus escrituras cuando esté vivo.
- `TASK-2004` — To-do. AXIS: isotipos de plataforma en negativo, logotipo de Metricool en negativo e isotipos de Facebook y Threads en `@efeoncepro/axis-brand-assets`, para el calendario de TASK-2002 en tema oscuro. No bloquea la ruta: el calendario puede arrancar con los isotipos en color.
- `TASK-2005` — To-do. Contrato de la siguiente iteración del calendario: comentarios, lote, exportar y feed iCal, vista de cliente, feriados y fechas comerciales, identidad de campaña y propuestas de agente. Bloqueada por TASK-2001.
- `TASK-2006` — To-do. UI de la siguiente iteración (canvas v3.3 aprobado, UI ready yes). Bloqueada por TASK-2002 y TASK-2005.


### Flujo editorial SEO/AEO — decisión 2026-10-04

- [TASK-1667](../../tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md) — To-do. Especialización editorial sobre el plan y los work items de Studio: brief SEO/AEO, QA y handoff CMS gobernado con evidencia de publicación. Reusa TASK-1907/1908/1913; no crea un ciclo editorial en Greenhouse.
- [TASK-1669](../../tasks/to-do/TASK-1669-growth-seo-agentic-daily-plan.md) — To-do. Plan editorial SEO/AEO y roles de agente sobre los commands y dispatcher de Studio (TASK-1909/1914/1915); preserva el orden de la cola SEO TASK-1700. No crea otro runtime de agentes.
- [TASK-1668](../../tasks/to-do/TASK-1668-growth-seo-editorial-qa-outcome-iteration-loop.md) sigue siendo hija de EPIC-022: contrato de outcomes y medición SEO desde evidencia de publicación de Studio. La producción, revisión y calendario pertenecen a este epic; las métricas y sus fórmulas permanecen en Greenhouse.
- TASK-1911 conserva aprendizajes y calendario; TASK-1912 consume los backends por sección. Informes y su distribución pertenecen a EPIC-045, incluidas TASK-1672/1673; Studio guarda referencias, no otro motor de informes.

[Reparto y trabajo pendiente](../../audits/seo/2026-10-04-epic-022-ownership-and-remaining-work.md). Los requisitos se redistribuyen sin cerrar tareas ni declarar disponible el circuito editorial.

## Delta 2026-09-26 — decisiones del operador sobre la capa de estrategia y la operación con agentes

Decisiones de Julio Reyes (operador) del 2026-09-26, registradas en las tasks dueñas y en §11 de ambos ADR:

1. **Delegación por corrida con `act`:** unidad nueva **U22 de EPIC-044**, poseída por `TASK-1917` (Efeonce ID emite
   tokens cortos y revocables por corrida; persona como sujeto, rol de agente versionado como actor; scopes ⊆ lista del
   rol; atados a work item y corrida; reutiliza el canje RFC 8693 de Greenhouse). Consumidor: TASK-1915.
2. **Grants:** `marketing_studio.agent_role.manage` → `efeonce_admin`, `efeonce_operations` (relajar sigue `T2`,
   TASK-1914). `marketing_studio.agent_eval.grade` → `efeonce_admin`, `efeonce_operations`, `efeonce_account`, pero
   califican sólo personas nominales, una por disciplina (Medios, SEO/AEO, CRO, Copywriter, Designer, Creativo), y `efeonce_admin` califica cualquiera; nombres pendientes del operador
   (TASK-1916).
3. **Asignar un agente sobre el techo de costo** se confirma con `marketing_studio.campaign.approve`, sin capability nueva
   (TASK-1913).
4. **`studio.voice_rules.publish` es `T2`** (TASK-1909, TASK-1899).
5. **El canje de `marketing_studio.integration.manage` verifica `update`**; conectar y revocar son `T2` (TASK-1910,
   TASK-1899).
6. **Clase de scope `efeonce.mcp.commercial.write`** creada (TASK-1906); catálogo de canales mantenido por
   `efeonce_operations` con `efeonce_admin` (TASK-1905); publicar el modelo de cliente: `efeonce_account` para
   organizaciones cliente, `efeonce_admin` para la organización propia de Efeonce (TASK-1906).
7. **Agentes programados (y en segundo plano) nunca leen datos competitivos `internal`**; sólo el modo interactivo con la
   persona presente. Una excepción futura exige una decisión nueva por organización (TASK-1915, TASK-1908).

## Existing Related Work

- Prototipo `OneDrive/…/15. Paid Media/ABRIR CAMPAIGN MANAGER.html` + `01. Recursos/Campaign Manager/` (generador, catálogo, LEEME).
- `docs/campaigns/` — CDR-001…011, harness de campañas.
- `docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`.
- Globe (`efeonce-globe`) como proveedor de assets generados.

## Exit Criteria

- [ ] `studio.efeonce.org` sirve Studio con login Efeonce ID y sin modo `open`. Progreso: en vivo en modo `open`; login = TASK-1898.
- [ ] Las campañas vigentes viven en Studio como fuente, con corte de autoridad declarado por campaña y con fecha, y sus finales nuevos entran sólo por las puertas del ADR (CLI, MCP o UI sobre `createAssetVersion`). Progreso: CMP-001..005 importadas como proyección reimportable; command de ingesta y commands de escritura en producción desde 2026-10-02 (TASK-1894 A y B), pero CMP-001..005 siguen gobernadas por OneDrive hasta su corte (TASK-1894 Entregable C, diferido); puerta MCP T1 = TASK-2003, T2 operador; puerta UI = TASK-1895.
- [ ] Un agente sube un final por MCP con persona como actor auditado (TASK-2003). Aprobación MCP/digest del criterio original retirada con TASK-1899; T2 conserva el carril operador vigente.
- [ ] La señal «pieza aprobada sin original en Studio» está en cero para toda campaña cortada, o cada caso tiene dueño (TASK-1894).
- [ ] Toda operación de la UI tiene su endpoint `/api/v1` documentado en OpenAPI. Progreso: la UI actual (sólo lectura) ya consume operaciones del registro único con test de paridad handlers ↔ registro; queda abierto hasta que la UI de edición (TASK-1895) nazca igual.
- [x] Efeonce MCP federa al menos las lecturas de Studio: 12 tools `studio.*` en producción desde 2026-09-26 (`efeonce-mcp-gateway-00061-sbc`), con canary MCP real verde (TASK-1891).
- [x] Restauración de la base `marketing_studio` probada: ensayo lógico en Cloud Run contra producción `succeeded` el 2026-09-26 (paridad de 18 tablas, restore 2 s, job 49 s, base temporal eliminada), falla forzada probada en staging y ensayo mensual programado (TASK-1896).
- [x] Toda operación del registro declara nivel de riesgo (`T0`/`T1`/`T2`) y el test de paridad rompe el build ante una escritura sin contrato (TASK-1905). — Check/paridad local PASS y manifiesto servido API 1.6.0 en [release](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md); no prueba nueva federación.
- [ ] Copys, anuncios, audiencias, presupuesto y posts usan `channel_key` del catálogo con la versión con que se validaron, sin canal en texto libre pendiente (TASK-1905; contract como follow-up). Progreso: writers/snapshots desplegados en warn;134 registros legacy unmapped y revisión de aliases pendientes, sin backfill aplicado.
- [ ] Las campañas referencian el modelo de cliente de Greenhouse por organización, versión e id; ninguna persona local en Studio (TASK-1906, TASK-1905).
- [ ] Una campaña vigente tiene plan aprobado con metas medibles, casa de mensajes con evidencia y hueco de contenidos visible (TASK-1907, TASK-1912).
- [ ] El plan SEO/AEO guarda snapshots fechados, el seguimiento se lee en vivo y un rastreo se ejecuta en Greenhouse con la persona como actor (TASK-1908).
- [ ] Todo contenido redactado por IA en Studio tiene procedencia y aceptación de una persona (TASK-1909).
- [ ] Las líneas `actual` nacen sólo de readback observado de Meta/LinkedIn y cada KPI del plan aprobado muestra su progreso o «sin dato» (TASK-1910).
- [ ] Al menos un aprendizaje validado con evidencia alimenta el contexto de IA de una campaña siguiente (TASK-1911).
- [ ] El trabajo de campaña se asigna, entrega, revisa y traspasa como work items en Studio, a personas o a roles de agente, con la persona como actor auditado (TASK-1913).
- [ ] Los cinco roles iniciales tienen tarjeta publicada y su lista blanca se aplica en Studio y en el gateway (TASK-1914).
- [ ] Toda corrida de agente, interactiva o en segundo plano, queda en el ledger de Studio con costo o «sin dato»; ningún estado duradero vive en el proveedor (TASK-1915).
- [ ] Ningún rol trabaja en segundo plano sin evaluación aprobada para su combinación rol × runtime × modelo, y sus métricas se leen por API y MCP (TASK-1916).

## Non-goals

- Reemplazar Globe en la generación o el gobierno de derechos de piezas generadas.
- Gestionar organizaciones, personas o accesos fuera de Efeonce ID / Greenhouse.
- Operar pauta en vivo (crear campañas en Meta/LinkedIn) antes de tener readback y aprobaciones gobernadas.
- Espejar SharePoint/OneDrive con Microsoft Graph (delta queries programadas) como fuente o como proceso de ingesta. Una lectura por Graph sólo sirve para backfill o reconciliación puntual.
- Inferir que una pieza es final por la carpeta en que está.
