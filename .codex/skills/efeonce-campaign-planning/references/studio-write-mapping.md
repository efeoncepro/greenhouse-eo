# Contrato de escritura y disponibilidad por sesión

**Decisión vigente 2026-10-04:** TASK-1899 retirada; TASK-2003 habilita T1 con identidad delegada. El protocolo
con proposalDigest retirado NO es un requisito vigente ni debe implementarse.
T2 sigue en el carril de operador. TASK-1905 sirve las siguientes tools en el manifiesto de Studio 1.6.0; aún sin federación/canary MCP:

| Uso | Tool | Tier |
| --- | --- | --- |
| Consultar canales/versiones/aliases | `studio.channels.list`, `studio.channel.get`, `studio.channel_catalog.versions.list`, `studio.channel_aliases.list` | T0 |
| Evidencia de validación / modelo ICP | `studio.campaign.channel_findings.list`, `studio.customer_model.get` | T0 |
| Preparar/publicar catálogo / mapear alias | `studio.channel_catalog.draft.create`, `.draft.channel.upsert`, `.version.publish`, `studio.channel_alias.map` | T1, catalog.manage |
| Revalidar / escribir audiencia / fijar versión ICP | `studio.campaign.channels.revalidate`, `studio.campaign.audience.upsert`, `studio.campaign.customer_model_version.set` | T1 |
| Descartar draft / quitar audiencia | `studio.channel_catalog.draft.discard`, `studio.campaign.audience.remove` | T2, operador |

No crear identidad/organización ficticia para gobierno global. ICP real depende de TASK-1906/TASK-1892. Referencias previas
no migran al fijar otra versión. Tools ausentes = propuesta documental; no simular ejecución.

## Disponibilidad vigente (2026-10-04)

Studio API1.6.0 publica 59 tools y cinco exclusiones HTTP; la CLI de Greenhouse `pnpm studio` las descubre en vivo.
`pnpm studio describe <tool>` entrega el cuerpo vigente, scope y revisión. Copys/piezas/brief/planes/calendario
están en API; los commands de estrategia aún pendientes se mantienen como propuestas documentales.

- MCP: no usar una escritura ausente de la sesión ni sustituirla por un bearer de servicio; TASK-2003 habilitará T1
  delegado y corre en paralelo. TASK-1899/proposalDigest fue retirada, no es requisito de API/CLI/UI.
- Operación local explícita por API: `pnpm studio call <tool> --param ... --file ...` valida sin persistir;
  `--apply` ejecuta, con `--key`/`--if-match` según esquema. El cliente de cargas no tiene `studio:write`.
- Catálogo global: rechaza bearer de servicio/usuario mientras no se habilite autoridad delegada. El registro
  de una operación en `list` no habilita su permiso. T2 queda operator_cli; `--confirm` no fabrica identidad.
- Leer `permissions`, `revision` y `sourceOfTruth` antes de proponer edición. Las campañas `onedrive` conservan
  restricciones de sus datos maestros; las creadas por Studio nacen `studio`. La puerta de uploads es separada.
- Guía operativa API: `docs/manual-de-uso/marketing-studio/operar-por-cli-api.md`. Las cargas nacen pending_review;
  descargar un original verifica integridad, no concede derechos ni aprobación.


## Niveles de gobierno

| Nivel | Qué cubre | Protocolo |
|---|---|---|
| **T0** | Lecturas | Directas. |
| **T1** | Borradores y ediciones que no aprueban, no publican, no gastan y no destruyen | Directas, con la **identidad delegada de la persona** (capability `marketing_studio.campaign.write` o `marketing_studio.asset.write`), `Idempotency-Key` estable por intento lógico (reintentar con la misma llave; misma llave + otro cuerpo = `422 idempotency_key_reused`), `If-Match` con la `revision` recién leída (`412 revision_conflict` ⇒ releer y proponer de nuevo, nunca forzar). Todo nace en borrador / `pending_review`. |
| **T2** | Aprobaciones, publicación, gasto y acciones destructivas | En Studio, carril de operador con autorización humana explícita; API conserva `403 confirmation_required` o `approval_requires_person` según actor/acción. `--confirm` en el cliente HTTP no concede identidad. Para gasto/publicación externos, usar el contrato vigente del proveedor; no importar el proposalDigest retirado. |

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
| 3 · Audiencias del brief | `upsertCampaignBrief` (`campaign_brief_audience`: nombre, descripción, referencia opcional a `studio.audience`) | idem | T1 | para audiencias de campaña usar además `upsertChannelAudience` / `studio.campaign.audience.upsert` (TASK-1905); ICP real aún depende del reader habilitado |
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
| 8 · Copys | `createCopyVariant` · `updateCopyVariant` | `studio.copy.create` · `.update` | T1 | se guarda literal; warn puede persistir hallazgo duro, enforce lo rechaza; nunca truncar para pasar |
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
   gasto SEO), con evidencia y validación disponible, sin inventar digest de confirmación.
4. Derivar T2 al carril autorizado de operador/proveedor; ejecutar sólo lo autorizado y releer el estado.
   MCP T1 disponible o CLI HTTP local no habilitan aprobación/publicación por sí solos.
