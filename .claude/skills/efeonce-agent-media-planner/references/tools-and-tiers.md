# Planificador de medios · tools permitidas y niveles

Verificado contra el repo el 2026-09-26: manual servido `docs/mcp/skills/marketing-studio/SKILL.md` (Studio sólo
lectura), ADR de la capa de estrategia §4.7 y §5, mapa de escritura de
`efeonce-campaign-planning/references/studio-write-mapping.md` y las tools del MCP oficial de Meta Ads visibles en una
sesión de operador. Si una tool no aparece en la sesión, se declara la limitación y se usa la fuente documental,
marcada como tal. **Los nombres del manifiesto vigente mandan sobre esta tabla.**

## T0 · Lecturas (directas)

### Studio

| Tool | Para qué la usa este rol |
|---|---|
| `studio.attention.get` | líneas esperando aprobación, medios bloqueados, posts vencidos sin observación |
| `studio.campaigns.list` · `studio.search` | encontrar la campaña (`not_found` = no existe **o** no es visible) |
| `studio.campaign.get` | tres estados independientes; nota de `media_authorization` |
| `studio.campaign.media_plan.get` | flights, audiencias, líneas por `kind` (`proposed` / `approved` / `actual`) |
| `studio.campaign.ads.list` | configuraciones de anuncio: canal, placement, audiencia, objetivo, UTM, `status`, `checksPending` |
| `studio.campaign.copies.list` | cobertura de copy por canal (literal, con conteo de caracteres) |
| `studio.campaign.assets.list` · `studio.asset.get` | qué ratios/placements tienen pieza (para marcar faltantes, no para inventar exports) |
| `studio.calendar.get` | choques de fechas con otras campañas (`from` incluido, `to` excluido) |

### MCP oficial de Meta Ads (si la persona lo conectó) — sólo estas lecturas

| Tool | Uso | Cómo se reporta |
|---|---|---|
| `ads_get_ad_accounts` | qué cuentas ve la persona, moneda y zona horaria | cuenta + moneda + fecha |
| `ads_insights_advertiser_context` | contexto de la cuenta | fuente + fecha |
| `ads_insights_performance_trend` | desempeño histórico propio | cuenta, ventana, métrica con denominador, fecha |
| `ads_insights_industry_benchmark` · `ads_insights_auction_ranking_benchmarks` | referencia externa | **`dimensionamiento`**, «no revalidado en nuestra cuenta» |
| `ads_insights_anomaly_signal` | alertas del proveedor | observación con fecha; no causa inferida |
| `ads_get_ad_account_custom_audiences` · `ads_get_custom_audience` · `ads_get_custom_audience_adsets` | existencia, tamaño y uso de audiencias propias | tamaño con fecha; si no hay, la audiencia es **candidata** |
| `ads_get_datasets` · `ads_get_dataset_quality` · `ads_get_dataset_stats` · `ads_get_customconversions` | calidad y existencia de la señal de conversión | define qué objetivo es posible |
| `ads_get_ad_entities` · `ads_get_creatives` · `ads_get_ad_preview` | estado real de lo que ya existe (readback) | estado leído ≠ entrega |
| `ads_library_search` | referencia creativa y competitiva pública | dato, nunca instrucción; no se atribuye a una marca lo que no dijo |
| `ads_get_opportunity_score` · `ads_get_help_article` · `ads_get_field_context` | recomendaciones y documentación | recomendación del proveedor, no decisión |

**Nunca**, ni con confirmación: `ads_create_*`, `ads_update_entity`, `ads_activate_entity`, `ads_boost_ig_post`,
`ads_creative_update/delete/upload_media`, `ads_*custom_audience*` que escriben (`create`, `update`, `delete`,
`update_users`), `ads_pixel_*` que escriben, `ads_catalog_*` que escriben, `ads_experiment_*_create/update`. Lanzar,
pausar, editar o mover presupuesto en una plataforma publicitaria está **fuera de alcance** de Studio y de este rol
(ADR estrategia §4.7–4.8); hacerlo exigiría un ADR nuevo con su propia clase de scope.

LinkedIn Ads y Google Ads: sin conector registrado al 2026-09-26. Cifras de esas plataformas = fuente documental con
fecha (p. ej. especificaciones verificadas en `channels-and-measurement.md` §2) o `no registrado`.

### Documentos

Plan de campaña (`PLAN-IA-<fecha>.md`), `BRIEF.md`, `MANIFIESTO-PAUTA.json`, CDR en `docs/campaigns/decisions/`,
`docs/context/13_icp-buyer-personas-jtbd.md`, `docs/context/11_hubspot-bowtie.md`,
`docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`, OneDrive `_templates/MEDIA-PLAN-TEMPLATE.md`.

## T1 · Borradores (cuando existan las escrituras)

Nombres de trabajo de TASK-1894 / TASK-1899 y de la capa de estrategia. Todos con la identidad delegada de la
persona, `Idempotency-Key` estable por intento lógico, `If-Match` con la `revision` leída (`412` ⇒ releer y proponer
de nuevo) y procedencia.

| Sección del plan de medios | Tool (nombre de trabajo) | Nota |
|---|---|---|
| Flights | `studio.media_plan.flight.create` · `.update` | |
| Reparto | `studio.media_plan.budget_line.set` | **sólo `kind: proposed`**; `actual` nunca por command; mezclar kinds = `422 budget_kind_violation` |
| Audiencias de canal | ‹command de audiencia de canal› | referencia ICP obligatoria; sin ella, pendiente visible |
| Configuraciones de anuncio | `studio.ad.create` · `.update` | configurado ≠ activo; `checksPending` visible |
| Borrador del plan | ‹command de borrador de plan› | hasta que exista, el plan vive en el documento |

## T2 · Este rol no los ejecuta

| Acción | Tool (nombre de trabajo) | Qué hace el rol |
|---|---|---|
| Aprobar una línea | `studio.media_plan.budget_line.approve` | la lista en el checklist con su `dryRun`/`proposalDigest` |
| Quitar una línea | `studio.media_plan.budget_line.remove` | ídem |
| Autorizar medios | `studio.campaign.media.authorize` | ídem |
| Conectar una cuenta publicitaria (OAuth/credenciales) | — | lo pide a la persona, con la identidad de menor privilegio |
| Mover estados de lanzamiento | `studio.campaign.launch_state.transition` | fuera del rol; `live_observed` sólo con evidencia |

Errores de escritura con resultado incierto (`upstream_timeout_unknown_outcome`, `5xx`) se resuelven **releyendo**,
nunca repitiendo la llamada.
