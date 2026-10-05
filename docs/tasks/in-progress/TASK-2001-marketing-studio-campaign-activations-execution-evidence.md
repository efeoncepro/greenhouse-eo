# TASK-2001 — Marketing Studio: activaciones de campaña y evidencia de ejecución

## Delta 2026-10-05 — reader de hojas email y landing

Extensión solicitada para V3-SheetEmail, MobSheetEmail y V3-OwnedFormats. UI TASK-2002 ya productiva según operador; Claude conserva calendario/hojas. API local 1.9.0: `ActivationDto.email` y `ActivationDto.web`, mismos readers HTTP/MCP/CLI, sin tocar UI. El alcance de entregados/aperturas/clics se amplía aquí **sólo a la última lectura**, sin series TASK-1892/1910.

- [x] Remitente, copy literal + conteo + límites de catálogo, audiencias y métricas con fuente/fecha; null ausente, sin SQL Greenhouse desde Studio.
- [x] Conteo de destinos aislado por organización y evidencia web; formulario **Growth Forms (id = form_key)**, validado contra reader público. El operador aclara Growth Forms → DB propia → HubSpot; no tratar HubSpot como proveedor del formulario ni exponer GUID de destino.
- [x] Postgres real, `pnpm check`, build, pruebas owner/CLI y contrato OpenAPI/tool manifest. [Campos exactos, evidencia y exclusiones](../../audits/marketing-studio/TASK-2001-activation-reader-sheets-2026-10-05.md).
- [x] Skill espejo y manual actualizados. Contrato aditivo sobre JSON existentes; sin migración.
- [ ] Rollout/canary de esta extensión: pendiente, sin push autorizado. La disponibilidad de la UI productiva no certifica este DTO nuevo.

No se incluyen datos sin fuente: conteo de contactos Resend (sólo API privada beta), series/tasas/usuarios únicos, leads/entregas de formularios ni destinos internos HubSpot. Se conserva contactCount para HubSpot; Resend devuelve null. Sin límite verificado en el catálogo, copyLimits null. Embeds dinámicos no observables o contrato público inaccesible dejan connectedForms null y estado honesto; no «false». Ver motivos y fuentes en el informe enlazado.

## Ajuste de alcance 2026-10-04 — conexiones y QA

El operador confirma: conectar sólo Resend y HubSpot; preparar Marketing Cloud Engagement/Next sin conexión ni certificación live (no hay entorno de prueba). Blog: conectar sólo efeoncepro.com con WordPress, conservando CMS por cuenta y el fallback para otros CMS. Incluye QA de integración con UI TASK-2002 y CLI. TASK-2003 no se implementa en este paso. Nuevos cambios local-first, sin nuevo push hasta revisión del corte.

Ownership: Codex toma providers/owned, activations owned-readback, contratos aditivos, migración y puerto email de Greenhouse; Claude conserva apps/web UI de TASK-2002. Operaciones existentes se conservan; provider enums y metadatos de evidencia serán aditivos.

## Delta 2026-10-04 (email) — Resend principal y varios proveedores

Decisión posterior del operador: el mayor volumen de emails irá por **Resend**. La plataforma debe soportar también
**HubSpot**, **Salesforce Marketing Cloud Engagement** y **Salesforce Marketing Cloud Next**. Este delta sustituye
el supuesto de email exclusivamente HubSpot; Engagement y Next son integraciones distintas.

- **Contrato común, adapters separados.** La activación conserva canal/familia email, cuenta, proveedor, campaña,
  versión de pieza y plan. La evidencia mantiene identidad de proveedor/cuenta/envío, programación y envío observado,
  procedencia y frescura. Resend es la primera prioridad de implementación por volumen, no un fallback automático
  ni una cuenta por defecto para otros clientes.
- **Tenancy explícita.** La organización autorizada se vincula con la cuenta de Resend, portal de HubSpot, tenant y
  MID/Business Unit de Engagement u org/entorno de Next. Credenciales y binding vienen de configuración gobernada;
  registrar la cuenta en Studio no concede acceso. Los detalles y permisos de cada adapter se verifican contra su
  proveedor, sin tratar Next como alias de Engagement ni inventar un endpoint común de Salesforce.
- **Evidencia y escala.** Aceptado, en cola, programado, enviado y entregado son hechos distintos. Sin evidencia real
  de envío no se marca published. Los envíos parciales/de larga duración deben conservar su completitud; observar un
  destinatario no permite afirmar que toda la campaña fue enviada. Un envío de campaña es la unidad del calendario,
  no una activación por destinatario. Readers paginados/incrementales, deduplicación y reconciliación; los datos de
  destinatarios permanecen en el sistema de correo. No se ingieren correos transaccionales ajenos por compartir Resend.
- **Reuso Resend.** Revisar `src/lib/email/delivery.ts`, `resend-webhook.ts`, `resend-reconciliation.ts` y
  `/api/webhooks/resend`: existen dispatch/batch, inbox de eventos y reconciliación. Falta demostrar/proveer el vínculo
  explícito organización/campaña/activación y una proyección autorizada de envíos de marketing; `priority=broadcast`
  no demuestra por sí sola que el mensaje pertenezca a una campaña Studio.
- **Catálogo y superficies.** Añadir providers/canales/specs versionados para Resend, Engagement y Next preservando
  `owned_email_hubspot` y snapshots existentes. API, MCP, CLI y UI consumen las mismas operaciones de activación;
  no se duplican commands por proveedor. No cambiar a mano el catálogo v1 publicado ni migrar tracking histórica.
- **Alcance.** Este corte trata planificación/evidencia; no autoriza envíos externos ni implementa audiencias, journeys
  o campañas en el proveedor. Entregados/aperturas/clics conservan TASK-1892/1910. Adaptadores desconectados aparecen
  explícitamente como no conectados/sin evidencia, nunca como integración operativa.

Estado al registrar este delta: **requisito aceptado, implementación pendiente**. El commit Studio `4094da0` sólo
contiene el consumidor de evidencia HubSpot; no acredita soporte Resend/Engagement/Next. La verificación 276+7 y CLI
anterior conserva validez para aquel corte, no cubre esta ampliación. Cada nuevo slice debe pasar Studio + Postgres
real antes del siguiente, con flags OFF y sin push.

## Delta 2026-10-04 (blog) — CMS del cliente, borrador en Notion y medición SEO/AEO

Decisiones del operador sobre las hojas de blog de TASK-2002 (canvas, página «v3.2 · Planificar y operar», tableros «Blog ·
antes de publicar» y «Blog · después de publicar»). Corrigen el delta anterior, que daba por hecho WordPress:

- **El CMS es del cliente, no de Efeonce.** Cada sitio declara su CMS (`wordpress`, `drupal`, `webflow`, `modyo`,
  `hubspot_cms` u `other`) como atributo del sitio o cuenta owned, no de la activación. La dimensión visible es «CMS» y
  va separada de «Sitio» (dominio). El lector de WordPress sigue aprobado; un CMS con lector conectado aporta la fecha de
  publicación observada.
- **CMS sin lector conectado.** La evidencia sale de la URL pública (respuesta 200, robots, canonical y presencia en el
  sitemap) y una persona confirma la fecha de publicación (`confirmed_by` persona, en el registro de eventos). Sin esa
  fecha observada o confirmada la activación no pasa a `published`.
- **Borrador en el Content Hub de Notion.** La activación de blog guarda `draft_url`, el enlace al borrador en el Content
  Hub de Notion, que es donde se escribe. La hoja lo muestra como enlace externo; Studio no lee ni escribe Notion en esta
  task.
- **SEO y AEO quedan fuera del alcance de esta task.** El dossier antes de publicar (búsqueda e intención, metadata,
  fan-out y citabilidad, E-E-A-T y schema, enlaces y gate de publicación) y la medición después de publicar (Search
  Console: URL Inspection y rendimiento de 28 días; panel de prompts del AI Visibility Grader y del Search Visibility 360;
  GA4: sesiones orgánicas, referidas por IA y conversiones) necesitan su propio contrato. Va como follow-up `backend-data`
  y no bloquea el cierre. Lo que sí deja esta task: `draft_url`, el CMS del sitio y la evidencia de publicación.
- **Etiquetas de honestidad del dato:** todo valor de terceros se marca «Estimado · tercero» con fuente y fecha; lo de
  Search Console, el Grader y GA4 se marca «Medido». Sin dato se muestra «no medido», nunca un número inventado.
- **Decidido por el operador (2026-10-04):** (1) volumen y dificultad salen del **Search Visibility 360** (marcados
  «Estimado», con fuente y fecha); (2) el panel de prompts de IA es **por clúster temático**: todas las piezas del clúster
  se miden contra el mismo panel versionado; (3) el gate **sólo avisa**: se puede autorizar la publicación con avisos y
  los avisos abiertos quedan registrados en la autorización (evento con actor persona).

## Delta 2026-10-04 (posterior) — lo que la UI aprobada necesita del contrato

El operador aprobó la dirección visual completa de TASK-2002 (páginas v3, v3.1 y v3.2; renders en
`docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/`) y las decisiones propuestas. Esta task suma al
contrato lo que esas pantallas leen o escriben; la UI no calcula nada de esto:

- **Mercado y hora local.** La activación guarda `market` (país ISO, atributo de la activación según TASK-1905) y la cuenta
  su zona IANA. `GET /api/v1/calendar` acepta `market` como filtro y cada activación devuelve la hora en la zona de la
  cuenta y en America/Santiago.
- **Evidencia owned.** Email desde HubSpot (proveedor de lectura `hubspot`, canal `email_hubspot`): programado y enviado
  como evidencia; entregados, aperturas y clics llegan con TASK-1892/1910. Blog y landing: **lector del WordPress del sitio
  público** (proveedor nuevo `wordpress`, aprobado por el operador) con URL viva y fecha de publicación observada; sin él,
  esas activaciones sólo pueden quedar `planned` u `overdue`.
- **Avisos que calcula el reader:** `piece_not_approved` (la versión planificada no está aprobada), `version_mismatch` (la
  versión en la herramienta no es la planificada; identificada por hash o nombre canónico del archivo), `same_account_same_time`
  (otra activación de la misma cuenta a la misma hora; advierte, no bloquea) y `tool_stale` (frescura por herramienta, que
  alimenta la barra de estado).
- **Command `rescheduleActivation`** separado de `updateActivation`: recibe la nueva fecha y devuelve el estado resultante
  (p. ej. `scheduled_off_plan` con su diferencia) para que el diálogo avise antes de confirmar; nunca toca la herramienta.
- **Validación en seco.** `planActivation` y `updateActivation` aceptan `dryRun: true` y devuelven los chequeos del catálogo
  (copy contra el límite del canal, formato admitido en el placement, pieza aprobada, colisión de hora) sin escribir.
- **Crear desde ejecución.** `createActivationFromExecution` responde los campos precargados con su origen
  (`source: tool`) y exige campaña y pieza antes de vincular.
- **Registro de eventos** append-only por activación (`planned`, `updated`, `rescheduled`, `linked`, `unlinked`,
  `discovered`, `published_observed`, `cancelled`, con actor persona, agente o regla), expuesto por `getActivation`; es la
  base del historial que construye TASK-2005.
- **Tracking congelada** (`tracking_frozen`) en cuanto hay evidencia publicada o de entrega, ya prevista; la UI la muestra
  bloqueada.

## Delta 2026-10-04 — estados de pauta y tolerancia (decisión del operador, dirección visual v3)

Decidido por el operador sobre la dirección visual v3 de TASK-2002 ([canvas «Efeonce Marketing Studio»](https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi), páginas
«v3 · Calendario de activaciones» y «v3.1 · Línea de tiempo por plataforma»):

- **Dos estados de ejecución nuevos, sólo para paid:** `delivering` («En curso»: entrega observada desde el inicio real) y
  `ended` («Finalizada»: fin observado). `published` queda para organic y owned. En paid, `overdue` significa que pasó el
  inicio planificado sin entrega observada. Los calcula el reader; la UI nunca los deriva.
- **Paid compara inicio y fin por separado**, como fechas de calendario en la zona horaria de la cuenta de anuncios (no
  horas). Tolerancia por defecto **0 días**, como dato del catálogo de canales y editable por versión, igual que la de
  organic. Una diferencia en el inicio o en el fin es `scheduled_off_plan`, con la diferencia visible (p. ej. «inicio +2 d»).
- El reader expone por activación paid: fechas planificadas, fechas configuradas en la herramienta, inicio y fin observados
  y el id de la campaña en la herramienta, para que la UI pinte plan, herramienta y entrega como tres capas.

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

## Decisión vigente 2026-10-04 — desarrollo sin TASK-1899

El operador retiró TASK-1899 por la fricción que añadiría en esta etapa. Su diseño de escritura MCP deja de ser
prerrequisito de desarrollo y cierre del alcance API/CLI/UI de esta task. La federación de escrituras MCP y su
verificación se retiran del alcance actual, pendientes de una nueva decisión; nunca se declaran operativas por
cerrar ese alcance. Esta decisión prevalece sobre las referencias y criterios MCP de TASK-1899 conservados más
abajo. API-first, dependencias funcionales y controles de acceso existentes siguen vigentes.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-04 — Full API Parity y operación por MCP obligatorias (decisión del operador)

- **Regla:** todo lo que esta task implemente nace con command o reader en `packages/domain`, ruta `/api/v1`, entrada en
  el registro con **tool** (exclusión sólo para transporte o metadatos, nunca para una capacidad de negocio) y **tool
  federada y operable por Efeonce MCP**, lecturas **y escrituras**, con la identidad delegada de la persona
  (carril de TASK-2003: clase `efeonce.mcp.marketing_studio.write`, canje por capability exacta, persona como actor;
  las aprobaciones `T2` siguen por CLI/UI mientras TASK-1899 esté retirada). La UI es un cliente más de esos commands.
- **Cierre:** la task no se cierra hasta que una **sesión MCP real** (token Entra humano) ejecuta cada operación nueva
  —leer, planificar y editar (las `T2` por CLI/UI mientras TASK-1899 esté retirada)— y la evidencia queda registrada. Manual servido
  (`docs/mcp/skills/marketing-studio/SKILL.md`) actualizado con las tools nuevas.
- **Orden:** no espera a TASK-2003. Toda operación nace con su tool en el manifiesto; las lecturas se federan y prueban al
  cerrar; las escrituras se federan y prueban por MCP cuando TASK-2003 esté vivo (si ya lo está al cerrar, se prueban ahí).

## Delta 2026-10-04 — UTM derivadas de la activación (RESEARCH-012)

- Por [RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md): cada activación expone su **tracking URL** generada con la convención (`utm_content` = id de la activación, `utm_id` = id de la campaña); la evidencia de ejecución compara la URL publicada con la generada (sin UTM o con otra = advertencia).

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-049`
- Status real: `TASK-2002 calendario productivo según operador; extensión de readers email/web API 1.9.0 implementada y validada localmente (296+7 Studio con PG 18.6, build; 12 owner +18 CLI Greenhouse). Contrato Growth Forms confirmado: DB propia y dispatcher HubSpot. UI no modificada. Nuevo rollout/push y configuración owned pendientes; no ampliar el estado live por inferencia. TASK-2003 conserva MCP delegado; TASK in-progress. Evidencia: TASK-2001-activation-reader-sheets-2026-10-05.md`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `efeonce-marketing-studio main (migraciones, dominio, worker, rutas, registro, manifiesto) · Greenhouse develop (docs, manual servido) · efeonce-mcp rama + PR (sync del manifiesto); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la **activación** como entidad de Studio: la salida concreta de una campaña en un canal (campaña obligatoria,
modalidad, familia, plataforma, placement, cuenta, mercado, pieza en versión exacta, copy y fecha planificada; punto
para organic/owned, franja para paid). Las herramientas que ejecutan dejan de definir el calendario: lo que Metricool
(y después las plataformas de ads) tiene programado o publicado entra como **evidencia de ejecución** adjunta a la
activación, y Studio compara plan contra ejecución (`planned`, `scheduled`, `scheduled_off_plan`, `published`,
`overdue`, `cancelled`). Lo programado sin activación aparece en «Hoy» como **ejecución sin activación**. El calendario
(`studio.calendar.get`) pasa a leer activaciones. La UI es TASK-2002.

## Why This Task Exists

- Verificado el 2026-10-04: Metricool tenía 14 publicaciones programadas entre el 4 y el 20 de octubre (incluido el
  reel de «Los Sparks» del 5/10 14:00); el calendario de Studio mostraba 3. Studio sólo conoce los posts que llegan en el
  catálogo de OneDrive al importar; el readback de Metricool (TASK-1893) actualiza los posts conocidos y nunca descubre
  los nuevos.
- `studio.scheduled_post` modela el post **de la herramienta**: guarda `media` como URLs de Metricool, no referencia la
  pieza ni su versión, y su `channel` es texto libre. El calendario y «Hoy» pintan la portada de la campaña, no la pieza.
- No existe el **plan**: no hay dónde decir «este spot sale en Instagram el 5/10 y en LinkedIn el 8/10» antes de
  programarlo, ni con qué comparar lo que pasó.
- El operador decidió (ADR de estrategia §15, 2026-10-04): la campaña es el objeto canónico, no hay activación sin
  campaña (el contenido permanente vive en campañas **Always On**), el calendario es de Studio y Metricool es un
  atributo de ejecución.

## Goal

- Toda salida a un canal es una activación de una campaña, con sus dimensiones de canal validadas contra el catálogo.
- La ejecución de cada herramienta queda como evidencia adjunta, nunca como plan; el estado de ejecución se calcula.
- Lo programado en Metricool aparece en Studio sin cargas manuales: vinculado a su activación o como «ejecución sin
  activación» para que una persona decida.
- El calendario, «Hoy», el MCP y la UI leen el mismo reader de activaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §4.2 y
  §15 — taxonomía de canales, activaciones, calendario de Studio, ejecución como evidencia)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes: programado ≠
  publicado, `null` = ausente; §7.2 worker y readback de Metricool; §7.4 commands, autoridad por campaña)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` y `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **No hay activación sin campaña** (las campañas Always On son campañas normales con `kind`).
- **La herramienta no define el plan:** la evidencia de ejecución nunca crea ni mueve una activación por sí sola; sólo
  una persona (o un agente con su identidad delegada, TASK-1899) crea, vincula o reprograma.
- **Programado ≠ publicado:** `published` exige observación con fecha; programado en el pasado sin observación =
  `overdue`.
- **Canal del catálogo:** `channel_key` + placement + cuenta validados contra la versión del catálogo (TASK-1905); el
  mercado y el buying method nunca van en el `channel_key`.
- **Pieza en versión exacta:** la activación referencia `asset_version_id` (no sólo la pieza); la UI y los agentes ven
  qué versión salió.
- `packages/domain` libre de framework; errores `{ error (es-CL), code, actionable }`; `null` = ausente; versiones sólo en
  el `catalog:`; registro de operaciones con tool o exclusión; manifiesto regenerado, nunca a mano.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- Skill `efeonce-marketing-studio` (`references/contracts.md`, `operations.md`, `lessons.md`)
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` (nodos `MS-N1` Hoy y `MS-N4` Calendario)

## Dependency readback — 2026-10-04

TASK-1905 entrega el catálogo y taxonomía requeridos en Studio `74073de1188f`: migraciones
`1791144092031_channel-catalog.sql` y `1791144092429_channel-key-expand.sql`, seed v1 de 52 canales,
API 1.6.0. Código y dossier `docs/audits/marketing-studio/TASK-1905-release-2026-10-04.md`
verificados durante el preflight. Sus pendientes ICP/capability/federación no bloquean esta implementación local.
TASK-1910 conserva los adapters de paid; TASK-2003 se coordina en paralelo, sin ownership activo del registro.

## Dependencies & Impact

### Depends on

- TASK-1905 (catálogo de canales, `channel_key`, semilla de §15, `riskTier` en el registro).
- TASK-1894 Entregable B (en producción): kernel de commands, `Idempotency-Key`, `If-Match`, `revision`, auditoría.
- TASK-1893 (complete): worker de medios, cliente de Metricool (`providers/metricool/client.ts`), `worker_run`,
  `recordPostObservation`, `runMetricoolReadback`.

### Blocks / Impacts

- **TASK-2002** (UI del calendario y de activaciones) consume este contrato.
- **TASK-1911**: su «calendario unificado» pasa a esta task y a TASK-2002; TASK-1911 conserva experimentos y
  aprendizajes y suma las ventanas de experimento al reader de calendario como follow-up (delta en TASK-1911).
- **TASK-1907**: `setContentPlanItemProgress` vincula ítems del plan con activaciones (`activation_id`) además de pieza,
  copy y anuncio; un ítem puede tener varias activaciones (delta en TASK-1907).
- **TASK-1910**: la evidencia de paid (anuncio activo, entregas observadas) se adjunta a activaciones pagadas por el mismo
  modelo de evidencia (delta en TASK-1910).
- **TASK-1892**: el «adapter de social orgánico (Metricool)» que dejaba como follow-up queda cubierto por el
  descubrimiento de esta task.
- **TASK-1899**: federa las escrituras de activaciones con identidad delegada.

### Files owned

- `efeonce-marketing-studio/packages/database/migrations/<ts>_campaign-activations.sql` + `packages/database/src/schema.ts`
- `efeonce-marketing-studio/packages/domain/src/activations/**` (commands, estado de ejecución, emparejamiento, readers)
- `efeonce-marketing-studio/packages/domain/src/providers/metricool/**` (descubrimiento de programados)
- `efeonce-marketing-studio/packages/domain/src/readers/overview.ts` (`getCalendarRange`, atención)
- `efeonce-marketing-studio/packages/contracts/src/{dto,semantics,errors,operations-activations}.ts` + `operations.ts` + `generated/tool-manifest.json`
- `efeonce-marketing-studio/apps/web/src/app/api/v1/activations/**` y `.../campaigns/{campaignId}/activations/**`
- `efeonce-marketing-studio/apps/worker/{src/handlers.ts,src/config.ts,deploy.sh}` + `scripts/ops/infra/media-originals.sh` (scheduler del descubrimiento)
- Greenhouse: esta task, `docs/mcp/skills/marketing-studio/SKILL.md`, skill `efeonce-marketing-studio`, `FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- `studio.scheduled_post` (`post_id`, `campaign_id`, `post_key`, `provider`, `provider_brand_id`, `provider_post_id`,
  `provider_post_uuid`, `network`, `scheduled_at`, `scheduled_timezone`, `body_text`, `media` jsonb de URLs de la
  herramienta, `planner_url`, `provider_status`, `observed_at`, `observation_source`, `published_at`, `permalink`,
  `revision`); 6 filas en producción (CMP-001 ×3 de septiembre, CMP-003 ×3 de octubre).
- Commands `createScheduledPost` / `updateScheduledPost` / `cancelScheduledPost` (TASK-1894 B): Studio planifica
  `PLANNED`, cancela `CANCELLED`, nunca publica; un post del proveedor no se edita.
- Readback de Metricool en el worker (`/jobs/metricool-readback` cada 30 min, `MEDIA_WORKER_METRICOOL_READBACK_ENABLED`
  ON en producción), marcas permitidas `METRICOOL_BLOG_IDS=3961547,5105024`; sólo consulta posts conocidos.
- `getCalendarRange` (`studio.calendar.get`): vuelos por semana + posts; `undated` con razón; miniatura = portada de la
  campaña (`campaignThumbs`).
- `ad_configuration` (anuncio con `channel`, `placement`, `audience_key`, `objective`, `utm`) y `media_flight` (fechas).
- Autoridad por campaña: escrituras del catálogo sobre campañas `onedrive` ⇒ `409 campaign_not_studio_owned`.

### Gap

- No hay entidad de plan de salida (activación), ni dimensiones de canal estructuradas, ni vínculo post ↔ versión de pieza.
- No hay descubrimiento de lo programado en la herramienta ni comparación plan ↔ ejecución.
- `campaign.kind` (Always On) no existe.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` — dominio `packages/domain/src/activations`, worker de medios (descubrimiento), rutas `/api/v1` en `apps/web`
- Future candidate home: `remain-shared`
- Boundary: commands y readers de activaciones en `packages/domain`; consumidores autorizados: rutas `/api/v1`, tools MCP federadas, UI de TASK-2002, plan de contenidos de TASK-1907, readback pagado de TASK-1910
- Server/browser split: commands, readers y descubrimiento corren en el servidor (web y worker); la UI sólo llama la API
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (cambio de fuente de verdad del calendario + integración externa en el worker + backfill de los posts existentes)
- Impacto principal: `command`
- Source of truth afectado: `studio.activation` (nueva) + `studio.execution_record` (nueva; absorbe la evidencia hoy en `scheduled_post`) + `studio.campaign.kind`
- Consumidores afectados: web (Calendario, Hoy, espacio de campaña), `studio.calendar.get`, `studio.attention.get`, `studio.campaign.posts.list`, MCP, health profundo (`overdue_unverified_posts`)
- Runtime target: `staging` → `production`; worker de medios (Cloud Run)

### Contract surface

- Contrato existente a respetar: `getCalendarRange`, `listCampaignPosts`, `getAttention`, commands de posts de TASK-1894 B, readback de TASK-1893, `ScheduledPost` DTO.
- Contrato nuevo o modificado:
  - `Activation { activationId, campaignId, kind: 'point' | 'span', channelKey, modality, family, platform, placement, account, market, buyingMethod | null, assetVersions[] (assetId, versionNo, position), copyId | null, adConfigurationId | null, plannedAt | plannedRange, timezone, state: draft | planned | cancelled, execution: { status, records[] }, revision }`.
  - `ExecutionRecord { recordId, provider (metricool | meta_ads | linkedin_ads | google_ads | …), providerRef, accountRef, network, scheduledAt | null, observedAt | null, publishedAt | null, permalink | null, providerStatus, activationId | null, linkedBy: person | rule | null, mediaRefs }`.
  - Estado de ejecución calculado (nunca guardado): `planned | scheduled | scheduled_off_plan | published | overdue | cancelled`, con la tolerancia por canal como dato del catálogo.
  - Commands (registro, `riskTier`): `planActivation`, `updateActivation`, `cancelActivation` (T1); `linkExecution`, `unlinkExecution` (T1); `createActivationFromExecution` (T1, desde «ejecución sin activación»).
  - Readers: `listCampaignActivations`, `getActivation`, `listUnlinkedExecutions` (T0); `getCalendarRange` lee activaciones (+ vuelos) y agrega filtros `modality`, `family`, `platform`, `account`, `campaignId`, `executionStatus`.
  - `campaign.kind ∈ {campaign, always_on}` (`createCampaign` lo acepta; Always On sin fecha de fin obligatoria).
  - Atención: ítems `execution_without_activation`, `activation_overdue`, `scheduled_off_plan`.
- Backward compatibility: `gated` — `scheduled_post` y sus commands siguen hasta el contract posterior al release; `ScheduledPost` se proyecta desde `execution_record` mientras conviven; `studio.calendar.get` agrega campos (compatible) y cambia su descripción (bump de versión del gateway en el sync).
- Full API parity: cada command con ruta `/api/v1`, entrada en el registro y tool MCP; la UI de TASK-2002 escribe sólo por ellos.

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.activation`, `studio.activation_asset`, `studio.execution_record`, `studio.campaign` (`kind`), `studio.scheduled_post` (expand → contract).
- Invariantes que no se pueden romper:
  - `activation.campaign_id NOT NULL`; `execution_record.activation_id` nullable (ejecución sin activación).
  - Un `execution_record` se vincula a lo más a una activación; una activación puede tener varios (reprogramación, cross-post).
  - La evidencia nunca cambia `planned_at` ni crea activaciones; sólo una persona (o regla de emparejamiento explícita, ver abajo) vincula.
  - `published` sólo con `observed_at` + `published_at` de la herramienta; programado nunca se muestra como publicado.
  - `channel_key` válido en la versión de catálogo fijada en la activación; mercado y buying method fuera del `channel_key`.
  - Pieza por `asset_version_id` de la misma campaña con `review_state ∈ {imported, approved}` (una versión `pending_review` no se planifica para salir).
  - `null` = ausente (sin copy, sin placement conocido); nunca valores inventados.
- Write-target allowlist: `N/A` (Studio no tiene boundary test de destinos de escritura).
- Tenant/space boundary: organización vía la campaña (`scopeCampaigns`); `listUnlinkedExecutions` filtra por las marcas de Metricool permitidas a la organización.
- Idempotency/concurrency: commands con `Idempotency-Key` + `If-Match` (`revision`); descubrimiento idempotente por `(provider, provider_ref)` con `ON CONFLICT`; el emparejamiento automático corre en la misma transacción que la escritura de la evidencia.
- Audit/outbox/history: `audit_event` en cada command y en cada vínculo automático (`linkedBy: rule`, con la regla); `worker_run kind='metricool_discovery'`.

**Autoridad por campaña (decisión propuesta, a confirmar en el Plan):** activaciones y evidencia **no** son territorio del
import de OneDrive (el catálogo no las trae y el import no las toca), así que se pueden escribir también en campañas
`source_of_truth = 'onedrive'`, igual que la puerta de ingreso y la revisión de versiones. El import deja de crear
`scheduled_post` para campañas que ya tengan activaciones.

**Emparejamiento automático (regla propuesta, a confirmar):** se vincula sin persona sólo si hay **exactamente una**
activación `planned` de la misma campaña (resuelta por `utm_campaign` del enlace del post o por la cuenta), misma
plataforma y cuenta, y la fecha programada cae dentro de la tolerancia del canal. Cualquier otro caso queda como
«ejecución sin activación». Nunca se adivina la campaña por el texto.

### Migration, backfill and rollout

- Migration posture: `additive` (tablas nuevas + `campaign.kind` con default `campaign`); contract de `scheduled_post` en una migración posterior al release (`docs/tasks/pending-migrations/`).
- Default state: flags OFF — `STUDIO_ACTIVATIONS_ENABLED` (web: rutas de escritura y lectura nueva del calendario) y `MEDIA_WORKER_METRICOOL_DISCOVERY_ENABLED` (worker).
- Backfill plan: los 6 `scheduled_post` existentes pasan a `execution_record` (sin pérdida de observación); un dry-run propone activaciones para cada uno y una persona confirma (`createActivationFromExecution`); el descubrimiento trae lo programado en Metricool desde hoy menos 30 días.
- Rollback path: flags OFF (el calendario vuelve al reader actual); `migrate down` sólo sin activaciones confirmadas; `scheduled_post` intacto hasta el contract.
- External coordination: ninguna credencial nueva (el token de Metricool y `METRICOOL_BLOG_IDS` existen); scheduler nuevo del descubrimiento; sync del gateway con autorización.

### Security and access

- Auth/access gate: lectura `marketing_studio.campaign.read` / `studio:read`; escritura `marketing_studio.campaign.write` / `studio:write` (T1); sesión de persona hasta TASK-1898; MCP con identidad delegada en TASK-1899.
- Sensitive data posture: el texto de los posts es contenido de marca, sin PII; el token de Metricool sigue en Secret Manager y no se loggea.
- Error contract: `activation_not_found`, `channel_not_in_catalog`, `asset_version_not_plannable`, `execution_already_linked`, `revision_conflict`, `campaign_required` (catálogo cerrado, es-CL).
- Abuse/rate-limit posture: descubrimiento con ventana acotada (−30/+120 días) y reintentos con backoff ante 429 de Metricool (cliente existente).

### Runtime evidence

- Local checks: tests de estado de ejecución (cada estado por fixture, tolerancia por canal, zona horaria America/Santiago), emparejamiento (único, ambiguo, sin UTM), idempotencia del descubrimiento, paridad del registro, leak test.
- DB/runtime checks: migración en staging (up/down/up), backfill dry-run y apply sobre los 6 posts, `execution_record` = 6 + programados descubiertos.
- Integration checks: descubrimiento real contra Metricool (marcas 3961547 y 5105024) en staging; caso «Los Sparks» 5/10 y 8/10 visible como evidencia vinculable.
- Reliability signals/logs: health profundo reemplaza `overdue_unverified_posts` por `activations_overdue` y agrega `metricool_discovery` (frescura); `worker_run`.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Toda tabla nueva queda declarada en el allowlist del dominio donde exista: `N/A`.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en `packages/domain/src/activations`, no en la UI.
- [x] Activación modelada como recurso con commands, no como handler de pantalla.
- [x] Reads como readers canónicos; writes con `Idempotency-Key`, `If-Match`, capability fina, auditoría, errores canónicos y observabilidad.
- [x] Sin capability nueva (usa `.campaign.read` / `.campaign.write`); si el Plan decide una propia, va con grant y coverage test en el mismo PR.
- [x] Camino programático: `/api/v1`, CLI y tools MCP declaradas, paridad local PASS. Federación y escritura delegada real pendientes de TASK-2003; TASK-1899 está retirada.
- [x] Writes aptos para `propose → confirm → execute` (`dryRun` en cada command).
- [x] Un primitive, muchos consumers: calendario, Hoy, MCP, plan de contenidos y UI leen el mismo reader.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Esquema y Always On

- Migración: `activation`, `activation_asset`, `execution_record`, `campaign.kind`; verificación `DO … RAISE`; grants.
- `createCampaign`/`updateCampaign` aceptan `kind: always_on`.

### Slice 2 — Commands y estado de ejecución

- `planActivation`, `updateActivation`, `cancelActivation` con validación de catálogo, pieza planificable y campaña.
- Cálculo puro del estado de ejecución (con tolerancia por canal) y tests.

### Slice 3 — Evidencia y descubrimiento

- `execution_record` como destino del readback existente (observación) y del descubrimiento nuevo de programados en
  Metricool (`/jobs/metricool-discovery`, scheduler, flag); emparejamiento automático según la regla; `linkExecution`,
  `unlinkExecution`, `createActivationFromExecution`.

### Slice 4 — Readers, calendario y atención

- `listCampaignActivations`, `getActivation`, `listUnlinkedExecutions`; `getCalendarRange` desde activaciones con filtros
  por dimensión; ítems de atención; health profundo.

### Slice 4b — Tracking URL por activación ([RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md) §Origen y ciclo de vida)

- `buildTrackingUrl(activation, catalogVersion)` pura en `packages/domain/src/activations/tracking.ts`: `utm_source`,
  `utm_medium`, `utm_source_platform` y modo de etiquetado desde el catálogo; `utm_campaign` (slug congelado) y `utm_id`
  desde la campaña; `utm_content` = id público de la activación `ACT-######`; `utm_term`, `utm_creative_format` y
  `utm_marketing_tactic` desde anuncio, placement/pieza y audiencia; `null` se omite.
- Slug de campaña: se genera en `createCampaign` y se congela con la primera activación con evidencia; migración que
  agrega `campaign.utm_campaign_slug` y lo rellena para CMP-001…005 con revisión de una persona.
- Snapshot en la activación (`tracking_url`, `tracking_params`, `catalog_version`); se regenera mientras no haya
  evidencia y se congela después (`tracking_frozen`).
- Validación: destino `https` en dominios propios de la organización; destino sin `utm_*` (`destination_has_tracking`);
  vocabulario cerrado.
- Comparación con lo publicado: la evidencia de ejecución extrae los enlaces del post o del anuncio y marca
  `tracking_missing` / `tracking_mismatch` como advertencias en la activación y en «Hoy».
- Operación `previewTrackingUrl` (T0) y campo `tracking` en `getActivation` / `listCampaignActivations`.

### Slice 5 — Registro, manifiesto y backfill

- Operaciones con `riskTier`, tools y exclusiones; manifiesto; API minor; backfill de los 6 posts con confirmación.

## Out of Scope

- UI del calendario y de las activaciones (TASK-2002).
- Publicar o programar en Metricool o en plataformas de ads desde Studio (Studio nunca publica).
- Evidencia desde Meta/LinkedIn/Google Ads (TASK-1910; esta task deja el modelo listo).
- Ventanas de experimento en el calendario (TASK-1911).
- Contract (retiro) de `scheduled_post`: migración posterior al release.

## Detailed Spec

**Tolerancia por canal.** `scheduled` si la fecha de la herramienta cae a ±15 min de la planificada para organic social
(dato del catálogo, editable por versión); fuera de eso, `scheduled_off_plan` con la diferencia visible.

**Franja (paid).** Una activación pagada referencia `adConfigurationId` y su `plannedRange` = el flight (o una
subventana); el estado sale de la evidencia de la plataforma (TASK-1910); sin evidencia, `planned`.

**Proyección compatible.** Mientras conviven, `listCampaignPosts` y `ScheduledPost` se proyectan desde
`execution_record`, para no romper la UI vigente ni la tool `studio.campaign.posts.list`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 → 4 → 5. La migración antes del worker; el worker (descubrimiento) antes de la web con el flag ON;
  el backfill sólo con confirmación de una persona.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Emparejamiento automático vincula mal un post | datos | medium | sólo con coincidencia única + UTM/cuenta; auditado con la regla; `unlinkExecution` | atención `execution_without_activation` / revisión |
| Metricool cambia su API o limita | integración | medium | cliente existente con backoff; flag del worker; `worker_run` | `metricool_discovery` en health |
| El calendario pierde posts durante la convivencia | UI/API | low | proyección compatible desde `execution_record`; flag web | comparación de conteos en staging |
| Campañas `onedrive` reimportadas pisan activaciones | datos | low | el import no toca activaciones ni evidencia vinculada | test del import |

### Feature flags / cutover

- `STUDIO_ACTIVATIONS_ENABLED` (Vercel de Studio) y `MEDIA_WORKER_METRICOOL_DISCOVERY_ENABLED` (worker, SoT `deploy.sh`), ambos OFF por defecto; filas en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `migrate down` (sin activaciones confirmadas) | 5 min | sí |
| Slice 2–4 | flag web OFF + revert | 5 min | sí |
| Slice 3 | flag del worker OFF + redeploy | 10 min | sí |
| Slice 5 | desvincular/cancelar activaciones creadas por el backfill | 10 min | sí |

### Production verification sequence

1. Staging: migración, worker con descubrimiento, backfill dry-run → confirmación, calendario con filtros.
2. Producción con autorización del operador: migración → worker → descubrimiento → backfill → web con flag ON.
3. Verificar «Los Sparks» (5/10 y 8/10) como evidencia vinculada a su activación de CMP-001.

### Out-of-band coordination required

- Autorización explícita del operador para migración, deploys y push de producción; decisión sobre la regla de
  emparejamiento y la autoridad por campaña (Open Questions).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Delta email: cuentas/catálogo/readers soportan Resend, HubSpot, Marketing Cloud Engagement y Next con adapters separados, aislamiento, evidencia de envío y completitud; API/MCP/CLI comunes. Pendiente, no cubierto por los checks del corte 4094da0.

- [x] Una activación no se puede crear sin campaña ni con un `channel_key` fuera del catálogo; las campañas Always On existen.
- [x] El estado de ejecución se calcula para los ocho casos del delta (incluye delivering/ended), con tests y nunca se persiste.
- [x] El descubrimiento trae lo programado en Metricool de las marcas permitidas, idempotente, sin crear activaciones. Canary real: 3 cuentas, 62 observaciones, replay 0 cambios/0 errores; scheduler OIDC PASS. [Release](../../audits/marketing-studio/TASK-2001-release-2026-10-04.md).
- [x] Lo programado sin activación aparece como `execution_without_activation` en «Hoy» y en `listUnlinkedExecutions`.
- [x] `studio.calendar.get` devuelve activaciones con sus dimensiones y estado, filtrables; posts actuales siguen visibles durante la convivencia.
- [x] Los 6 posts existentes quedan como evidencia, vinculados a activaciones confirmadas por una persona. Dry-run/apply staging → producción, CL confirmado por operador, versiones verificadas por hash, eventos person; legacy conservado. [Release](../../audits/marketing-studio/TASK-2001-release-2026-10-04.md).
- [x] Cada activación tiene su tracking URL generada sólo por `buildTrackingUrl`; tests de determinismo, omisión de `null`, modo `auto` de Google Ads, validación de destino y congelamiento con evidencia.
- [x] `tracking_missing` y `tracking_mismatch` aparecen al comparar con lo publicado (fixture de un post de Metricool sin UTM y otro con UTM distinta).
- [x] Registro, manifiesto, paridad y leak test verdes; `pnpm check` y `pnpm build` de Studio verdes.
- [ ] Cada operación nueva (`planActivation`, `updateActivation`, `cancelActivation`, `linkExecution`, `unlinkExecution`, `createActivationFromExecution`, `previewTrackingUrl` y las lecturas) se ejecutó en una sesión MCP real con identidad delegada; manual servido actualizado. Contratos/manual PASS local; sesión delegada depende de TASK-2003.

## Verification

Greenhouse enviado a `develop`: código `20f57c4cd`, corrección documental `f08029b0f`; Vercel staging READY, smoke 200/401, CI y cinco workflows de workers PASS. Owned OFF; canary M2M autenticado y main pendientes. [Evidencia staging](../../audits/marketing-studio/TASK-2001-greenhouse-staging-2026-10-04.md).

### Rollout autorizado — 2026-10-04

[Release y canaries reales](../../audits/marketing-studio/TASK-2001-release-2026-10-04.md): Studio aa6fa07 en producción, migraciones y seis vínculos CL completos, CLI/calendario y scheduler verificados. CMP-001 conserva tres overdue por falta de fecha publicada; CMP-003 scheduled. Email/owned/MCP delegado siguen pendientes. Las secciones locales siguientes conservan la evidencia anterior al rollout.

### Cierre del corte local — 2026-10-04

[Dossier de QA y límites](../../audits/marketing-studio/TASK-2001-local-verification.md). Los checks marcados corresponden al contrato/código local; los criterios de runtime permanecen abiertos. TASK continúa in-progress.

- Tracking `946fda4`: buildTrackingUrl puro desde catálogo, cuenta, mercado y versiones exactas; destino autorizado, omisión null, auto-tagging, slug estable, revisión personal de slug legacy antes de activaciones y freeze con evidencia. Check 273 + 7 gates; migración up/down/up en PG PASS.
- Corte final `4094da0`: backfill de evidencia conservando origen/fechas y seis posts, sin activar ni emparejar automáticamente; requiere persona y revisiones. Import ON respeta campañas con activaciones, OFF conserva legacy. Accounts paginadas, piezas imported visibles con aviso de no aprobación.
- CLI HTTP existente de Greenhouse, sin cambios en su implementación: 31 comprobaciones contra Next production build local y Postgres real, incluyendo dry-run/apply/replay, lectura/edición/reprogramación, link/unlink/from_execution, calendario/atención, paginación y denegaciones por persona/organización. Los schemas de entrada OpenAPI/MCP ahora conservan defaults opcionales de Zod.
- Studio `pnpm check`: 276 tests + 7 gates PASS, todos los carriles PG habilitados, cero skips; `pnpm build` PASS. Cinco migraciones up/down/up PASS. `pnpm studio:test`: 18 PASS; manifest de manuales: 34 PASS.
- 75 tools / 80 operaciones; API 1.7.0. CLI y registro comparten capacidades; HTTP de persona y MCP delegado pendientes de TASK-2003. No se suplanta persona con token de servicio.
- Owned HubSpot: adapter consumidor implementado; el endpoint/consumer/binding de Greenhouse y su canary no están entregados. No se declara operativo email. WP y fallback público probados con fixtures; ningún proveedor real consultado.
- No push, migraciones remotas, backfill real, scheduler/deploy, cambios de flags remotos ni UI. Flags OFF por defecto; próximos pasos y rollback en runtime handoff.

### Delta blog — evidencia local 2026-10-04

- Studio `acdf30f`: CMS y sitio por cuenta owned del cliente; WordPress como primer reader con binding autorizado; fallback URL pública con HTTP, robots, canonical y sitemap. Lectura pública acotada por origen, IP pública, DNS fijado, tiempo/tamaño y sin redirects.
- `draft_url` de Notion se guarda/devuelve; ningún reader lo consulta. `confirmPublication` tiene tool, ruta y CLI de primitives; exige persona, revisión de ambos recursos y evidencia pública reciente. Guarda fecha confirmada separada de la observada, evento `publication_confirmed` con `confirmed_by`; congela tracking.
- PostgreSQL real local: migración owned-blog up/down/up PASS; una URL 200 sin fecha permanece overdue; servicio y fecha futura rechazados; dry-run, replay y confirmación humana comprobados. WordPress con URL 404 no aporta publicación.
- `pnpm check` PASS: 268 tests y 7 gates, todos los carriles Postgres habilitados, cero skips. Sin lectura real de proveedores, push ni rollout.
- Decisiones adicionales del operador conservadas en `3b5c97091`: SV360 estimado con fuente/fecha, panel IA por clúster y gate que sólo avisa. Pertenecen al follow-up SEO/AEO; no se implementa su autorización ni medición aquí.
- Tracking, compatibilidad/backfill y CLI completados localmente en los cortes siguientes; confirmación por HTTP con persona sigue pendiente del carril TASK-2003.

### Slice 4 — evidencia local 2026-10-04

- Studio `9bc974e`, 71 tools. Detalle, lista por campaña y ejecución sin activación; calendario aditivo con filtros por mercado/dimensiones/estado, fechas en zona de cuenta y cursor. Eventos en detalle y previews de la versión exacta.
- Reader calcula pieza no aprobada, versión distinta identificable, colisión y herramienta stale. `activationItems` es un campo aditivo de Atención para conservar clientes actuales con enum exhaustivo; TASK-2002 consume este campo junto a `activations`/`executionTools`.
- Compatibilidad de posts proyecta observaciones Metricool desde execution_record y mantiene identidad/revisión de scheduled_post durante coexistencia. Flags OFF conservan el reader legado.
- `pnpm check` PASS con todos los PG, 264 Vitest y 7 gates. Integración valida DTOs reales, hora local, cursor, aislamiento de organización, avisos por versión, calendario/atención y health SQL (`activations_overdue`, frescura de ambos jobs).

### Slice 3 — evidencia local 2026-10-04

- `pnpm check` PASS: 264 Vitest, 7 gates, cero skips, todos los carriles PG. Migración de frescura up/down/up PASS en Postgres 18 local.
- Descubrimiento Metricool acotado −30/+120 días, bindings administrados por organización + allowlist de marcas; un registro de cuenta creado por API no concede lectura del proveedor. Observación idempotente, vínculo único por UTM/cuenta/plataforma/tolerancia, respeto de desvinculación manual y congelamiento atómico con evidencia publicada.
- Tools link/unlink/from_execution declaradas (68 total), con revisión de ambos recursos y precarga `source: tool`. El readback anterior puede reflejar observaciones en la evidencia nueva conservando `scheduled_post`.
- Lector WordPress público implementado con paginación y comprobación de URL viva; consumidor de emails Greenhouse con verificación de organización/portal y `sentAt` explícito. No hay reader de emails de Greenhouse entregado en este checkout: endpoint/consumer/binding y canary reales siguen pendientes; nunca se sustituye por credencial directa HubSpot.
- Jobs y scheduler preparados; flags nuevos OFF por defecto. Ningún scheduler/deploy/consulta remota de cuentas fue ejecutado. Manifiesto corrige resolución de referencias de schemas de cuerpos antes de expandir argumentos MCP; coordinación enviada a TASK-2003.

### Slice 2 — evidencia local 2026-10-04

- Studio `78205fb`: plan/update/reschedule/cancel y registro/listado de cuentas; seis tools nuevas (65 total). Dry-run, idempotencia, If-Match, límites de copy/formato, aprobación de versiones y colisiones.
- `pnpm check` PASS con todos los carriles Postgres: 259 Vitest y 7 gates, cero skips. Los ocho estados cubren 15 minutos orgánicos, 0 días paid, ambos extremos del intervalo y fecha local de cuenta.
- La integración real detectó y corrigió defaults de Zod que borraban fechas en PATCH parcial. Reprogramar conserva intacta la evidencia de la herramienta; cancelar conserva historial y observaciones.
- Flags OFF; no push ni operaciones remotas.

### Slice 1 — evidencia local 2026-10-04

- PostgreSQL 18 local descartable en 127.0.0.1:55441: migración `1791149145299_campaign-activations.sql` up/down/up PASS; cinco tablas, relaciones compuestas por campaña/organización/cuenta, historial append-only, tracking congelada y zona IANA.
- Always On en create/update/readers existentes, commands y tools ya registradas; flag OFF niega crearlo. Tolerancia versionada: organic 15 minutos, paid 0 días. API 1.7.0 / manifiesto regenerado (59 tools, sin nuevas operaciones todavía).
- `pnpm check` con todos los carriles PG habilitados: 255 Vitest PASS (218 dominio, 9 contratos, 8 observabilidad, 6 worker, 14 web), 7 gates PASS; cero skips. Incluye dry-run sin escritura, replay, revisión, anti-oráculo, FK cross-campaign/tenant, fecha publicada sin observación denegada, historial protegido y freeze.
- Seed v1/52 canales publicado sólo en base local de pruebas; no se cambió catálogo remoto. Logs de esta corrida en `/tmp/studio-task-2001/`.
- Sin push, migración staging/prod, datos reales/backfill, UI ni canary MCP. Los AC de activaciones se verificarán al completar los commands/readers.


- `pnpm check` y `pnpm build` (Studio); tests del worker
- Migración y backfill en staging con evidencia SQL
- Descubrimiento real contra Metricool en staging

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] Skill `efeonce-marketing-studio`, arquitectura, manual servido y manual de uso actualizados

## Follow-ups

- Contract de `scheduled_post` después del release.
- Evidencia pagada (TASK-1910) y ventanas de experimento (TASK-1911) en el mismo reader.
- Contrato SEO/AEO del blog (`backend-data`, sin ID reservado): dossier y gate antes de publicar, y lector de Search
  Console, panel del AI Visibility Grader y GA4 después de publicar. Ver el delta «(blog)» de 2026-10-04.

## Decisiones resueltas y pendientes de runtime

1. Activaciones en campañas `onedrive`: sí; pertenecen a Studio. Import no sobreescribe su evidencia.
2. Auto-link sólo con coincidencia única por campaña UTM + cuenta/plataforma + tolerancia; el backfill y unlink humano excluyen auto-link. Ambigüedad permanece sin vincular.
3. Tolerancia: 15 min orgánico, 0 días por extremo paid en hora local de la cuenta, versionada con catálogo.
4. Pendientes: puerto owned HubSpot de Greenhouse, configuración/release autorizado, backfill real revisado y canary MCP delegado con TASK-2003. No bloquean el commit local; sí impiden declarar cierre operativo.

### Owned email — slice de conexión local 2026-10-04

Studio `e62b5e3` + `055860d`: API 1.8.0 aditiva; consumer Greenhouse paginado con aislamiento org/proveedor/cuenta, resumen de completitud, lectura sin destinatarios y fallo cerrado para Marketing Cloud. Suite Studio 286 tests + 7 gates, todas las integraciones PG habilitadas; migración up/down/up. Greenhouse: nueve pruebas focales, lint y typecheck PASS. Puerto usa consumidor/binding sister-platforms y resolvers canónicos; flags OFF.

Canary real de sólo lectura: Resend un broadcast borrador (ningún envío completo disponible para certificar ese caso); HubSpot dos páginas, 16 emails BATCH, dos completos acreditados por SENT y catorce borradores. No se enviaron emails. El canary ejecuta adapters con credenciales reales, no certifica aún el transporte M2M desplegado: requiere release Greenhouse, consumer/binding y configuración worker. No hay nuevo push.

### Cierre del corte local owned — 2026-10-04

- [x] Resend/HubSpot: adapters reales en Greenhouse y consumidor paginado Studio; límites e identidad verificados.
- [x] Engagement/Next preparados: providers/catálogo, sin lector ni prueba live (alcance confirmado por operador).
- [x] WordPress público: metadata paginada acotada, caché por corrida de robots/sitemaps y fecha observada; conserva otros CMS y draftUrl.
- [x] Studio 288 tests + 7 gates con Postgres real; build PASS. Greenhouse 9 focales + 18 CLI, lint y typecheck PASS.
- [x] Worker-domain sobre PG local con evidencia real; replay final 3 cuentas, 113 observaciones, 0 cambios, 0 errores.
- [x] CLI HTTP: flujo general de 25 comprobaciones + 15 owned; GVC desktop/móvil sin errores runtime. Datos locales desechables.
- [ ] Rollout: nuevo push no autorizado; migration/catalog/consumer/binding/flags/worker/scheduler pendientes. Owned sigue OFF en producción.
- [ ] TASK-2002: QA de formularios de escritura y navegación móvil Día→Línea de tiempo y presentación emailEvidence/nombres de proveedores corresponden al trabajo actual de Claude.

[Dossier y handoff de integración](../../audits/marketing-studio/TASK-2001-owned-connections-2026-10-04.md).
No se mueve la TASK a complete ni se interpreta este corte como federación MCP o habilitación productiva.
