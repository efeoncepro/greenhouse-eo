# Agente SEO/AEO · tools, lentes y niveles

Verificado el 2026-09-26 contra `src/mcp/greenhouse/tool-manifest.ts` (campos `writes` y `spendsProviderBudget`), los
manuales servidos `docs/mcp/skills/seo-visibility-reading` y `seo-spend-discipline`, y el ADR de la capa de estrategia
§4.5. El manifiesto de Greenhouse declara lo que **existe**; el gateway decide lo que se federa. Si una tool no aparece
en la sesión, se declara la limitación. **Los nombres del manifiesto vigente mandan sobre esta tabla.**

Lentes: ● medido (Search Console, primera parte) · ◑ estimado (snapshots de proveedor). Nunca se combinan.

## T0 · Lecturas sin gasto

| Tool | Pregunta que responde | Lente | Clasificación |
|---|---|---|---|
| `get_seo_entitlement` | ¿tiene módulo y cuánto presupuesto de proveedor queda? | — | interno |
| `get_seo_work_queue` | ¿qué hacer primero? (única autoridad de orden) | mixta, por ítem | interno |
| `get_seo_keyword_opportunities` | ¿dónde estamos cerca de ganar? | ● | apto cliente |
| `get_seo_keyword_discovery` | ¿qué candidatos salieron de discovery? | ◑ | interno |
| `get_seo_keyword_market_data` | volumen/CPC/dificultad de mercado | ◑ | apto cliente (con fecha) |
| `get_seo_keyword_gap` | ¿qué tienen los competidores y nosotros no? | ◑ | **sólo interno** |
| `get_seo_serp_top_results` | top-N del SERP persistido | ◑ | **sólo interno** |
| `get_seo_competitor_candidates` | candidatos a competidor por recurrencia | ◑ | **sólo interno** |
| `get_seo_url_visibility` | ¿qué ranquea la URL destino? | ◑ | apto cliente (su propio dominio) |
| `get_seo_performance_catalog` · `get_seo_performance` | rendimiento de keywords/URLs elegidas | ● | apto cliente |
| `get_seo_rank_evolution` | serie de posiciones capturadas | ◑ | apto cliente |
| `get_seo_dual_lens_visibility` | medido vs estimado, separados | ● y ◑ | apto cliente |
| `get_seo_visibility_360` | rank medido × citabilidad en respuestas IA | ● + IA | apto cliente |
| `get_seo_grounded_query_draft` | borradores de prompts AEO con procedencia | — | apto cliente |
| `get_seo_overview_kpis` | KPIs norte del cockpit | ● | apto cliente |
| `get_seo_site_audit_report` | salud técnica ya auditada | — | apto cliente |
| `get_seo_domain_overview` · `get_seo_backlink_profile` · `get_seo_backlink_detail` | foto de dominio y enlaces | ◑ | apto cliente para el dominio propio; de terceros, interno |
| `get_seo_prospect_diagnostic` | diagnósticos de prospecto ya corridos | ◑ | interno |

«Apto cliente» no autoriza a compartir: sólo indica que el dato no es competitivo. Lo que se comparte lo decide la
persona.

## T1 · Escrituras sin gasto

| Tool | Qué hace | Cuándo la usa este rol |
|---|---|---|
| `prepare_seo_grounded_queries` | crea un **borrador** de prompts AEO; nunca aprueba, activa ni corre el grader | sólo si la persona pidió registrar el borrador |
| `untrack_seo_keywords` | cierra la ventana de seguimiento; corta gasto; no borra historia | sólo a pedido explícito |
| `retire_seo_competitors` | retira competidores; corta gasto del próximo ciclo | sólo a pedido explícito |

## T2 · Gasto de proveedor: sólo propuesta

| Tool | Gasto | Qué entrega este rol |
|---|---|---|
| `track_seo_keywords` | **recurrente** en cada ciclo diario hasta retirar | lista exacta de keywords, por qué cada una (URL, persona, etapa), costo estimado y presupuesto restante |
| `declare_seo_competitors` | **recurrente** mensual de cobertura | lista exacta de dominios con autoría humana pendiente |
| `discover_seo_keywords` | inmediato, por llamada y por fila | semillas y métodos exactos + la fórmula de costo de la vista previa (`preview: true`, paso 2 del manual servido) |
| `run_seo_prospect_diagnostic` | inmediato, por corrida | dominio exacto y motivo |

Protocolo completo en `seo-spend-discipline`: la ejecuta el command dueño en Greenhouse con la autoridad y la
confirmación explícita de una persona sobre **esa** lista. Studio nunca las ejecuta con su identidad de servicio
(ADR estrategia §4.5).

## Studio (T0)

`studio.campaign.get` · `studio.campaign.ads.list` (URL destino con UTM) · `studio.campaign.posts.list` ·
`studio.calendar.get`. Mañana (T1): ‹command de referencias SEO/AEO del plan› — referencia al sujeto de SV360 + snapshot
fechado (valor, métrica, fecha, lane, `etvMethodology.version`), nunca copia de series.
