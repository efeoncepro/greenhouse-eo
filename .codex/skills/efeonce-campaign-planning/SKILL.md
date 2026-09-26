---
name: efeonce-campaign-planning
description: Plan an Efeonce campaign end-to-end with AI (EPIC-049, Marketing Studio) — from a brief or a Studio campaign CMP-### to a reviewable plan: strategy, KPIs with sourced targets, hypotheses, audience matrix (persona × bow-tie stage × canonical channel), message house, content plan with canonical filenames, SEO/AEO plan from Search Visibility 360, measurement (UTM, GA4, HubSpot), per-channel copy drafts with limits and test variants, risks and a decision checklist. Use for "planificar una campaña", "plan de campaña", "estrategia de campaña", "message house", "matriz de audiencias", "plan de contenidos/medición de campaña" or "qué hacemos con CMP-###". Reads studio.* MCP tools, ICP/voice context packs and Greenhouse SEO tools; outputs a plan document today and writes into Studio through governed commands once write tools exist. Never approves, publishes or spends alone. Not for producing pieces (efeonce-advertising-creative, social-media-studio) or operating Studio runtime (efeonce-marketing-studio).
argument-hint: "[brief o CMP-###] [organización] [objetivo] [presupuesto/horizonte si se conoce]"
---

# Planificar campaña (Efeonce)

Esta skill convierte un brief —o una campaña ya registrada en Marketing Studio— en un **plan de campaña
revisable**, con fuente y fecha para cada número, y lo deja listo para entrar a Studio cuando existan las tools de
escritura. Es el oficio de **planificar**; no produce piezas, no opera el runtime de Studio y no activa pauta.

**Pertenece a EPIC-049 (Efeonce Marketing Studio).** Anclas:

- Epic: [`docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md`](../../../docs/epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)
  (no se edita desde esta skill; el epic enlaza la skill).
- ADR de la capa de estrategia (en redacción al 2026-09-26; si todavía no existe, rige lo que diga el epic):
  `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md`.
- ADR de fuente única e ingesta (Accepted 2026-09-26):
  [`EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`](../../../docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md).
- Arquitectura de Studio: [`EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`](../../../docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).

Si el ADR de la capa de estrategia contradice algo de esta skill (nombres de commands, niveles de gobierno,
dónde vive el borrador del plan), **gana el ADR** y esta skill se corrige.

## Orden de lectura

1. Este archivo (flujo, reglas duras, modos de salida).
2. [`references/workflow-tools.md`](references/workflow-tools.md) — qué tool o fuente exacta usar en cada paso.
3. [`references/channels-and-measurement.md`](references/channels-and-measurement.md) — canales canónicos,
   especificaciones con fecha, convención de nombres de archivo, UTM y eventos de conversión.
4. [`references/plan-template.md`](references/plan-template.md) — la plantilla del documento de plan.
5. [`references/studio-write-mapping.md`](references/studio-write-mapping.md) — «Cuando existan las tools de
   escritura»: cada sección del plan → command/tool de Studio y su nivel de gobierno (T0/T1/T2).
6. [`references/worked-example-cmp001.md`](references/worked-example-cmp001.md) — ejemplo trabajado sobre CMP-001.

## Entradas

| Entrada | Obligatoria | Cómo se obtiene si falta |
|---|---|---|
| Brief **o** id de campaña `CMP-###` | Sí (una de las dos) | Si hay `CMP-###`: `studio.campaign.get` y sus lecturas relacionadas. Si sólo hay una idea: se planifica en borrador sin id y se propone reservar uno (paso 0). |
| Organización | Sí | Id canónico de Greenhouse `org-…`. Si el pedido no la nombra y la campaña existe, sale de Studio. Nunca se toma `EO-ORG-####` como id. |
| Objetivo de negocio | Sí | Del brief (`BRIEF.md` de la campaña o brief de Studio). Si no está, **se pregunta**: es lo único que no se infiere. |
| Presupuesto / horizonte | No | Del plan de medios de Studio (`studio.campaign.media_plan.get`) o del brief. Si no existe: `no registrado`, y el plan se arma con **dimensionamiento**, nunca con metas inventadas. |

**Preguntar sólo lo que no se puede inferir.** Antes de preguntar, leer Studio, el brief en OneDrive
(`Alineación/2. Campañas/CMP-###_…/BRIEF.md`), los CDR de `docs/campaigns/decisions/` y el context pack. Una
pregunta que ya tiene respuesta registrada es tiempo perdido del humano; una respuesta inventada es peor.

## Flujo (pasos, con la fuente exacta de cada uno)

El detalle de parámetros, orden de llamadas y trampas está en `references/workflow-tools.md`.

0. **Identidad de la campaña.** ¿Existe? `studio.campaigns.list` / `studio.search`. Si no existe, el plan nace
   como borrador sin id y la reserva de `CMP-###` queda como decisión del humano (reservar el código y registrar su
   fila en el overview es **un solo paso**, `EFEONCE_CAMPAIGN_REGISTRY_V1.md` §2; un código nunca se reutiliza).
1. **Leer contexto.**
   - Studio (T0, lectura directa): `studio.attention.get` → `studio.campaign.get` →
     `studio.campaign.assets.list` / `studio.campaign.copies.list` / `studio.campaign.ads.list` →
     `studio.campaign.media_plan.get` → `studio.campaign.posts.list` → `studio.calendar.get`. Seguir el manual
     servido `docs/mcp/skills/marketing-studio/SKILL.md`.
   - Brief, `ASSETS.md`, `decisiones/` y medición de la campaña en OneDrive; CDR vigentes en `docs/campaigns/`.
   - Cliente: ICP, buyer personas y JTBD desde `docs/context/13_icp-buyer-personas-jtbd.md` (+ skill
     `efeonce-customer-model-operator` si el ICP de la oferta no está resuelto). **Se referencia, no se redefine.**
   - Voz: `docs/context/05_voz-tono-estilo.md` y skill `copywriting` (voz institucional Efeonce).
   - Funnel y negocio: `docs/context/11_hubspot-bowtie.md` (bow-tie dual) y `docs/context/08_estrategia-comercial.md`.
2. **Estrategia.** Objetivo de negocio → KPI norte + KPIs de etapa con **meta, denominador, fuente y fecha**, o
   marcados `dimensionamiento` (supuesto para calcular, no meta) cuando no hay datos propios. Hipótesis
   falsables (qué creemos, cómo lo sabremos, criterio de parada). Con `gtm-architect` si la campaña abre
   posicionamiento o motion nuevos.
3. **Matriz de audiencias.** Persona (BP del context pack + rol en el buying group) × etapa (TOFU/MOFU/BOFU del
   journey y stage del bow-tie de HubSpot) × **canal canónico** (lista cerrada en
   `references/channels-and-measurement.md`). Cada celda: job, trigger, mensaje, acción y destino. Una pieza sin
   rol asignado no se produce.
4. **Message house.** Promesa central, 3–4 pilares con su prueba (dato/caso/mecanismo con fuente), lo que **no**
   se promete, vocabulario sí/no. Sale del brief; si el plan necesita una promesa que el brief no tiene, se
   propone como cambio al brief, no se improvisa en la pieza.
5. **Plan de contenidos.** Piezas por canal/formato/concepto con owner y fecha, nombre canónico
   `CMP001-02 - <título> - 4x5.png` (id de pieza `CMP001-02-imagen-4x5`), ratios por placement y
   especificación con fecha de verificación. Producción real → `efeonce-advertising-creative`,
   `social-media-studio`, `content-marketing-studio`.
6. **Plan SEO/AEO (Search Visibility 360).** Lecturas sin costo: `get_seo_entitlement` →
   `get_seo_keyword_opportunities`, `get_seo_keyword_gap`, `get_seo_keyword_discovery`, `get_seo_work_queue`,
   `get_seo_url_visibility`, `get_seo_rank_evolution`, `get_seo_dual_lens_visibility`, `get_seo_visibility_360`,
   `get_seo_grounded_query_draft`. Resultado: keywords objetivo, preguntas de respuesta IA, URLs destino y
   contenido de soporte. **Toda acción que gasta presupuesto de proveedor** (`track_seo_keywords`,
   `discover_seo_keywords`, `declare_seo_competitors`, `run_seo_prospect_diagnostic`) va como **propuesta
   exacta que requiere confirmación humana explícita** (manual `seo-spend-discipline`); nunca se ejecuta desde
   esta skill sin esa confirmación.
7. **Plan de medición.** Convención UTM (la ya registrada de la campaña; si no hay, la observada en producción),
   eventos GA4 y HubSpot, definición de conversión calificada (la fija quien opera el pipeline, no un agente),
   metas o dimensionamiento, guardrails y cadencia de lectura. Con `growth-marketing-cro` para atribución y
   experimentos.
8. **Copies por canal.** Borradores con límites medidos (caracteres por campo), voz Efeonce, 2+ variantes para
   test que cambian **una** variable, CTA y destino. Son **borradores de IA**: nunca se presentan como literal
   aprobado. El craft es de `copywriting`.
9. **Riesgos, supuestos y decisiones abiertas.** Riesgos con mitigación; supuestos marcados; checklist de
   decisiones que sólo el humano puede tomar (presupuesto, conversión calificada, canales nuevos, reserva del
   CMP, gasto SEO, aprobaciones).

## Modos de salida

**Detectar el modo antes de escribir:** si la sesión expone tools `studio.*` con `writes: true` (por ejemplo
`studio.campaign.brief.upsert`), aplica el modo escritura; si no, el modo documento. Los nombres se leen del
manifiesto vigente (lista de tools de la sesión o `GET /api/v1/tool-manifest`), nunca de esta skill.

### Hoy — modo documento

- El plan se entrega **inline en la conversación**, siguiendo `references/plan-template.md`, con fuente y fecha
  en cada número y `no registrado` / `null` donde no hay dato.
- Si el humano pide guardarlo: va a la carpeta de la campaña en OneDrive,
  `Alineación/2. Campañas/CMP-###_<slug>/PLAN-IA-<AAAA-MM-DD>.md` (nunca sobrescribe `BRIEF.md`; los cambios al
  brief se proponen como diff para que el humano los aplique). **No se guarda en `docs/campaigns/`**: el registro
  de campañas (Accepted 2026-09-22) define que brief, copy, media plan y medición viven en OneDrive y que nada se
  escribe en los dos lados. Al repo sólo van las **decisiones** que el humano tome (CDR en
  `docs/campaigns/decisions/`) y el trabajo con lifecycle (tasks).
- Sin acceso a OneDrive (agente remoto): sólo inline, y se declara la limitación.
- Cierra siempre con el **checklist de decisiones** para el humano.

### Mañana — modo escritura (cuando existan las tools)

La sección «Cuando existan las tools de escritura» de `references/studio-write-mapping.md` mapea cada sección del
plan a su command. Niveles de gobierno:

| Nivel | Qué | Cómo |
|---|---|---|
| **T0** | Lecturas | Directas (`studio.*` de lectura, tools SEO sin costo). |
| **T1** | Borradores y ediciones (brief en borrador, conceptos, piezas planificadas, copys, anuncios configurados, flight, líneas `proposed`, posts programados, borrador de prompts AEO) | Directas con la identidad delegada de la persona, `Idempotency-Key` por intento lógico, `If-Match` con la `revision` leída y procedencia registrada. Nacen en borrador / `pending_review`. |
| **T2** | Aprobaciones, publicación, gasto y acciones destructivas | `dryRun` → `proposalDigest` → **confirmación humana explícita** → ejecución con ese digest. Si el estado cambió, el digest no coincide y no se escribe. |

**El agente nunca aprueba, publica ni gasta solo.** Toda pieza de IA (plan, brief, copy, concepto) registra su
**procedencia**: modelo exacto, entradas (ids y `revision` leídos, brief con fecha), fuentes con fecha y skill que
la produjo.

## Reglas duras

- **NUNCA** inventar métricas, metas, presupuestos, benchmarks ni fechas. Un número sin fuente y fecha no entra al
  plan; lo ausente se escribe `no registrado` (o `null` en datos estructurados), nunca 0.
- **NUNCA** presentar un benchmark externo como meta propia: es `dimensionamiento` hasta tener datos de la cuenta.
- **NUNCA** sumar ni convertir entre sí presupuestos `proposed`, `approved` y `actual`; una lista `actual` vacía
  es «sin datos de gasto», no gasto cero. Presupuesto de producción ≠ presupuesto de medios.
- **NUNCA** reescribir, resumir ni «corregir» un copy existente al citarlo: los copys registrados son literales.
  Los copys que propone esta skill son **borradores** y se rotulan así hasta que una persona los apruebe.
- **NUNCA** inferir que un archivo es «final» por su carpeta en OneDrive/SharePoint: un final existe sólo cuando
  entró a Studio (ADR 2026-09-26).
- **NUNCA** redefinir el ICP, las buyer personas o los JTBD: se referencian desde Greenhouse
  (`docs/context/13_…`, skill `efeonce-customer-model-operator`). Una persona candidata (p. ej. BP9) no es vigente.
- **NUNCA** usar un canal fuera de la lista canónica; un canal nuevo es una decisión abierta del humano
  (y se registra como CDR), no una celda del plan.
- **NUNCA** ejecutar una tool que gasta presupuesto de proveedor (SEO) ni una aprobación/publicación sin
  confirmación humana explícita de la propuesta exacta.
- **NUNCA** declarar una campaña en vivo sin `live_observed`, ni un post publicado porque pasó su fecha.
- **NUNCA** fijar la definición de conversión calificada por cuenta propia: la fija quien opera el pipeline.
- **NUNCA** citar la marca de un tercero (partner, competidor) diciendo algo que no dijo; claims con fuente.
- **SIEMPRE** preguntar sólo lo que no se puede inferir, y **SIEMPRE** cerrar con el checklist de decisiones.
- **SIEMPRE** español neutro latinoamericano, tuteo de marca, sin voseo.

## Ruteo

| Necesidad | Skill |
|---|---|
| Operar/extender Studio, sus tools, su runtime | `efeonce-marketing-studio` (+ `efeonce-mcp-platform`) |
| Posicionamiento, motion, launch, economía GTM | `gtm-architect` |
| ICP, buying group, JTBD de una oferta nueva | `efeonce-customer-model-operator` |
| Craft del copy, voz institucional o autoral | `copywriting` |
| Ejecución por canal, UTM genérica, templates de brief | `digital-marketing` |
| Conversión, atribución, experimentos | `growth-marketing-cro` (+ `greenhouse-gtm-ga4-operator` para GA4/GTM) |
| SEO/AEO táctico y lectura de visibilidad | `seo-aeo` (+ manuales MCP `seo-visibility-reading`, `seo-spend-discipline`) |
| Piezas publicitarias con texto | `efeonce-advertising-creative` |
| Social orgánico, trendjacking, Metricool | `social-media-studio` |
| Blog, pillar, ebook, newsletter | `content-marketing-studio` |
| Gráficos del reporte del plan | `dataviz-design` (sólo si el plan lleva visualizaciones) |

## Mantenimiento

- Esta skill se espeja byte a byte en `.codex/skills/efeonce-campaign-planning/`
  (`rsync -a --delete .claude/skills/efeonce-campaign-planning/ .codex/skills/efeonce-campaign-planning/` y
  `pnpm skills:mirrors`). Se edita `.claude/` y se espeja.
- Cuando una task de EPIC-049 (TASK-1894, TASK-1899 o las de la capa de estrategia) publique commands o tools de
  escritura, actualizar `references/studio-write-mapping.md` con los nombres **del registro de operaciones**
  (verificado contra el manifiesto, con fecha) y mover la regla de modo si cambia.
- Especificaciones de canal y convención UTM llevan fecha de verificación; al cambiar, se actualiza la fecha y la
  fuente, no sólo el valor.
