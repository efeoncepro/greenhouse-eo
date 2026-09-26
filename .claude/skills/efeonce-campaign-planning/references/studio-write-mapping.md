# Cuando existan las tools de escritura

Estado al 2026-09-26: **Studio no tiene escrituras** (API `1.2.0`, 13 tools de lectura). Los commands de abajo
salen de la tabla «Operaciones y tools» de `TASK-1894` (to-do) y de `TASK-1899` (to-do, federación MCP con
identidad delegada y `proposalDigest`); los de la capa de estrategia salen del ADR
`docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` y sus tasks (en
redacción). **Son nombres de trabajo.** Antes de escribir, leer el manifiesto vigente (lista de tools de la sesión o
`GET /api/v1/tool-manifest`) y usar **sus** nombres; si una tool no existe, esa sección sigue en modo documento.

## Niveles de gobierno

| Nivel | Qué cubre | Protocolo |
|---|---|---|
| **T0** | Lecturas | Directas. |
| **T1** | Borradores y ediciones que no aprueban, no publican, no gastan y no destruyen | Directas, con la **identidad delegada de la persona** (capability `marketing_studio.campaign.write` o `marketing_studio.asset.write`), `Idempotency-Key` estable por intento lógico (reintentar con la misma llave; misma llave + otro cuerpo = `422 idempotency_key_reused`), `If-Match` con la `revision` recién leída (`412 revision_conflict` ⇒ releer y proponer de nuevo, nunca forzar). Todo nace en borrador / `pending_review`. |
| **T2** | Aprobaciones, publicación, gasto y acciones destructivas | `dryRun` (diff + `revision` base, sin escribir) → mostrar el diff y el `proposalDigest` → **confirmación humana explícita de ese diff** → ejecutar con `confirmation.proposalDigest`. Sin digest: `428 confirmation_required`; con digest viejo: `409 confirmation_mismatch`; en ambos casos no se escribe. Aprobar exige `marketing_studio.campaign.approve` de la persona (un `api_client` nunca aprueba). |

**El agente nunca aprueba, publica ni gasta solo.** Si la persona no tiene la capability, el canje de Greenhouse
responde `forbidden`: se informa y no se reintenta. Un `401` o `5xx` de escritura con resultado incierto
(`upstream_timeout_unknown_outcome`) se resuelve **releyendo** el estado, nunca repitiendo la llamada.

## Procedencia obligatoria en todo borrador de IA

Modelo exacto · fecha y hora · entradas (ids y `revision` leídos, brief con fecha) · fuentes con fecha · skill
(`efeonce-campaign-planning`). Hoy va en la sección 0 del plan; en Studio va en el campo de procedencia del
command si existe, o en la nota editorial / nota de versión del registro (`copy_variant` tiene nota editorial;
`asset_upload` tiene `note` ≤ 1.000). **[verificar el campo definitivo en el registro de operaciones]**

## Mapa sección del plan → command

| Sección del plan | Command (operationId) | Tool (nombre de trabajo) | Nivel | Notas |
|---|---|---|---|---|
| 0 · Campaña nueva | `createCampaign` | `studio.campaign.create` | T1 **con encargo explícito** | reserva un `CMP-###` que nunca se reutiliza; sólo si el humano pidió crear la campaña |
| 0 · Datos de campaña | `updateCampaign` | `studio.campaign.update` | T1 | `If-Match` |
| 1–2 · Plan completo en borrador | ‹command de borrador de plan› | ‹por definir en la capa de estrategia› | T1 | hasta que exista, el plan vive en el documento |
| 2 · Objetivo, problema, insight, ventana, canales, mandatorios, presupuesto envolvente (**propuesto**) | `upsertCampaignBrief` | `studio.campaign.brief.upsert` | T1 | tabla `campaign_brief`; texto literal; editar un brief aprobado lo devuelve a borrador (auditado) |
| 2 · KPIs con meta | `upsertCampaignBrief` (`campaign_brief_kpi`: métrica, meta, unidad, fuente esperada) | idem | T1 | una meta sin quién la fijó no se escribe como meta |
| 3 · Audiencias del brief | `upsertCampaignBrief` (`campaign_brief_audience`: nombre, descripción, referencia opcional a `studio.audience`) | idem | T1 | las audiencias de targeting no tienen command propio en TASK-1894 **[verificar]** |
| 2–4 · Aprobar el brief | `approveCampaignBrief` | `studio.campaign.brief.approve` | **T2** | persona con `.campaign.approve` |
| 4–5 · Conceptos | `createConcept` · `updateConcept` | `studio.concept.create` · `.update` | T1 | |
| 5 · Piezas planificadas | `createAsset` · `updateAsset` | `studio.asset.create` · `.update` | T1 | una pieza sin versión es plan, no final |
| 5 · Ítems del plan de contenidos | ‹command de ítem de plan› | ‹por definir en la capa de estrategia› | T1 | owner y fecha de entrega |
| 5 · Subir un final | `requestAssetVersionUpload` → PUT directo a GCS por URL firmada → `createAssetVersion` | `studio.asset.upload.request` → `studio.asset.version.create` | T1 | los bytes **nunca** viajan por MCP; sha256 recalculado por Studio; derechos mínimos (`licenseKind`); nombre canónico permite inferir campaña/concepto/ratio; nace `pending_review` |
| 5 · Derechos de una versión | `setAssetVersionRights` | `studio.asset.version.rights.set` | T1 | |
| 5 · Aprobar una versión | `approveAssetVersion` | `studio.asset.version.approve` | **T2** | |
| 5 · Pedir cambios | `requestAssetVersionChanges` | `studio.asset.version.request_changes` | T1 | nota obligatoria |
| 6 · Referencias SEO/AEO del plan | ‹command de referencias SEO/AEO› | ‹por definir en la capa de estrategia› | T1 | referencia keywords/preguntas/URLs; no copia datos de SV360 |
| 6 · Borrador de prompts AEO | — (Greenhouse) | `prepare_seo_grounded_queries` | T1 | no aprueba ni corre el grader |
| 6 · Seguir keywords, discovery, competidores, diagnóstico | — (Greenhouse) | `track_seo_keywords` · `discover_seo_keywords` · `declare_seo_competitors` · `run_seo_prospect_diagnostic` | **T2** | protocolo `seo-spend-discipline` (lista exacta + costo + confirmación) |
| 8 · Copys | `createCopyVariant` · `updateCopyVariant` | `studio.copy.create` · `.update` | T1 | se guarda byte a byte; el command rechaza en vez de «arreglar» |
| 8 · Configuraciones de anuncio | `createAdConfiguration` · `updateAdConfiguration` | `studio.ad.create` · `.update` | T1 | configurado ≠ activo |
| 9 · Flight | `createMediaFlight` · `updateMediaFlight` | `studio.media_plan.flight.create` · `.update` | T1 | |
| 9 · Líneas de presupuesto | `setBudgetLine` | `studio.media_plan.budget_line.set` | T1 **sólo `proposed`** | `actual` nunca se escribe por command; mezclar kinds = `422 budget_kind_violation` |
| 9 · Aprobar una línea | `approveBudgetLine` | `studio.media_plan.budget_line.approve` | **T2** | |
| 9 · Quitar una línea | `removeBudgetLine` | `studio.media_plan.budget_line.remove` | **T2** (destructiva) | |
| 5/7 · Calendario orgánico | `createScheduledPost` · `updateScheduledPost` | `studio.calendar.post.create` · `.update` | T1 | programar en Studio ≠ publicar; ningún command marca publicado |
| 5/7 · Cancelar un post | `cancelScheduledPost` | `studio.calendar.post.cancel` | **T2** (destructiva) | |
| Estados | `approveCreative` · `authorizeMedia` | `studio.campaign.creative.approve` · `studio.campaign.media.authorize` | **T2** | la transición genérica rechaza destinos aprobatorios |
| Estados no aprobatorios | `transitionCreativeState` · `transitionMediaAuthorization` · `transitionLaunchState` | `studio.campaign.{creative_state,media_authorization,launch_state}.transition` | fuera de esta skill | planificar no mueve estados; `launch` sólo con evidencia observada |
| Publicar / activar pauta | — (plataforma externa) | Metricool, Meta/LinkedIn Ads | **T2**, fuera de Studio | `social-media-studio`, `EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md` |

## Orden de escritura recomendado (cuando todo exista)

1. Leer (T0) y guardar las `revision` base.
2. Brief en borrador → conceptos → piezas planificadas → ítems del plan de contenidos → copys → anuncios →
   flight → líneas `proposed` → posts programados → referencias SEO/AEO (todo T1, con procedencia).
3. Presentar al humano el resumen de lo escrito y la lista de T2 pendientes (aprobar brief, aprobar líneas,
   gasto SEO), cada una con su `dryRun` y su `proposalDigest`.
4. Ejecutar sólo los T2 que el humano confirmó, uno por uno, con su digest; releer y reportar el estado leído.
