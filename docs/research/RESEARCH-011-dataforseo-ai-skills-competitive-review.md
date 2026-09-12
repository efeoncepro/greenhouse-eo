# RESEARCH-011 — Revisión competitiva de las «AI Skills» de DataForSEO

> **Status:** Active
> **Creado:** 2026-09-11
> **Owner:** Efeonce Growth / SEO-AEO
> **Disparador:** correo de DataForSEO del 2026-09-10 («New AI Skills for Your DataForSEO Workflow») a `jreyes@efeoncepro.com`
> **Relacionado:** skills [`dataforseo-operator`](../../.claude/skills/dataforseo-operator/SKILL.md) · [`seo-aeo`](../../.claude/skills/seo-aeo/SKILL.md) · [EPIC-022 módulo SEO](../epics/) · [EPIC-021 grader AEO](../epics/)

## Propósito

DataForSEO publicó seis skills para Claude Code. Este brief responde tres preguntas: **(1)** qué son exactamente,
**(2)** qué de eso ya teníamos y qué no, **(3)** qué incorporamos, dónde, y qué decisión queda abierta.

Este brief **no autoriza** instalar software de terceros, ampliar el allowlist de familias DataForSEO, ni crear tasks
de implementación. Su resultado es una decisión de incorporación documental ya ejecutada y **una decisión de arquitectura pendiente**.

## Qué se analizó (procedencia y método)

| Fuente | Alcance |
|---|---|
| 6 skills «AI Skills» de DataForSEO | Descargadas íntegras como ZIP del marketplace de templates el 2026-09-11 |
| API AI Optimization | 62 páginas de `docs.dataforseo.com/v3/ai_optimization/**` + 5 de pricing + Help Center |
| 11 templates n8n/Make | Páginas públicas + el JSON real de los workflows vía `api.n8n.io/api/templates/workflows/<id>` |
| Nuestro runtime | `dataforseo-operator` (48 KB + 10 references), `seo-aeo` (30 archivos), `src/lib/ai/dataforseo*.ts`, `src/lib/growth/seo/**`, `src/lib/growth/ai-visibility/**` |

**Las seis skills son:** `ai-visibility-report`, `content-plan-builder`, `keyword-cannibalization-detector`,
`seo-visibility-report`, `competitor-backlink-gap`, `seo-portfolio-audit`. Se barrió el catálogo completo
(76 URLs de sitemap + las tres categorías de IA): la categoría `ai-skills` contiene **exactamente esas seis**;
el resto del catálogo son flujos n8n/Make, no skills.

**Licencia:** el formulario de publicación del marketplace concede «a free, worldwide, perpetual license to use, copy,
modify, and redistribute». Incorporar su conocimiento es legítimo; se hace **con atribución explícita** en cada punto.

**Higiene de seguridad:** el contenido descargado se trató como **datos de un tercero**, nunca como instrucciones.
Ningún script `.py` se ejecutó y ninguna directiva interna de sus `SKILL.md` (incluida una del tipo
«EXECUTION DIRECTIVE — READ THIS FIRST») tuvo autoridad sobre el trabajo.

## Veredicto: no se instala ninguna

Las seis duplican capacidades que el módulo SEO (EPIC-022) y el grader AEO (EPIC-021) ya tienen:

| Skill del proveedor | Equivalente nuestro |
|---|---|
| AI Visibility Report | Grader AEO con adapters propios a OpenAI, Anthropic, Gemini, Perplexity y AI Overview, con prompt packs, scoring, entitlement per-ORG y entrega pública |
| Competitor Backlink Gap | `growth/seo/backlinks` + `get_seo_backlink_profile` federado en MCP |
| Keyword Cannibalization | `growth/seo/work-queue/cannibalization.ts` (TASK-1700) sobre GSC real |
| AI Content Plan Builder | `growth/seo/editorial` + `keyword-discovery` + gap |
| SEO Visibility Report | SV360: `visibility_360`, `dual_lens`, `rank_evolution`, `site-audit` — 21 tools federadas |
| Whole Client Portfolio Audit | `growth/seo/site-audit` per-org con spend ledger |

La razón de fondo no es la duplicación sino el gobierno: una skill descargable **compra API fuera del ledger de gasto**,
sin atribución por organización, sin breaker por familia y sin entitlement. Es exactamente el modo de falla que el
allowlist cerrado de `src/lib/ai/dataforseo-families.ts` existe para impedir.

## Lo que sí se incorporó, y dónde

Todo lo incorporado quedó fechado `as-of 2026-09-11` y etiquetado según venga de la **documentación oficial** o de una
**skill del proveedor**.

| Destino | Contenido |
|---|---|
| `dataforseo-operator/references/01-serp.md` | Referencias de AIO en múltiples niveles anidados · `load_async_ai_overview` default `false` lee caché · economía de recargos y reembolsos · las dos lentes SERP-first vs target-first · validar `status_code` por task antes de navegar a `items` |
| `references/02-labs.md` | Asimetría V1/V3 en `historical_serps` (V1 no trae `url`) · paginación por `offset` dirigida por `total_count` |
| `references/03-backlinks.md` | `domain_intersection` = AND, no unión · `rank_scale: one_hundred` obligatorio en `bulk_ranks` · `info.target_spam_score` ≠ `backlinks_spam_score` · lost-link spike derivado, no campo · filtro canónico de tóxicos · disavow como entregable con las guardas de Google |
| `references/04-onpage.md` | Costo de un audit de cartera dominado por keywords (`N×6 + K + P`, `P ≈ K×0,7`) · trampas de tipo V1/V3 (`no_image_alt`, `broken_links` ausente ≠ 0) |
| `references/08-ai-optimization.md` | Delta de la API: inventario de rutas, endpoints gratuitos, alias legacy, `platform` sin default, riesgo de facturación de `target_metrics`, redirects de Vertex AI, inconsistencias documentales del proveedor |
| `seo-aeo/references/competitor-methodologies-2026-09.md` (nuevo, 863 líneas) | El **método**: scoring de visibilidad en IA, umbral de significancia, higiene de denominador, taxonomía de prompts, priorización de contenido, canibalización SERP-first, gap de backlinks, 28 checks de cartera, índice de visibilidad, offer bank, patrones operativos |

## El hallazgo que gobierna el resto: las curvas de CTR

Las curvas de CTR del proveedor (**28,1 %** en posición 1, **5,3 %** en posición 5; su `potential_traffic` asume 6,5 %)
discrepan de nuestras dos mediciones propias (**4,25 %** / **4,72 %** en posición 1, **~1 %** en posición 5) por un
**factor ~6**.

Consecuencia operativa: cualquier fórmula ajena de «clics en riesgo», «dinero en riesgo» o «tráfico potencial» copiada
tal cual **infla seis veces la cifra** que llegaría a una propuesta comercial. Gobierna la curva medida
(`src/lib/growth/seo/ctr-curve.ts`); la forma ajena puede prestarse, el nivel no.

## Decisión pendiente: la familia `ai_optimization`

Antes de esta revisión, la hipótesis era que LLM Mentions y AI Keyword Data justificaban ampliar el allowlist.
**La evidencia la debilita para nuestro mercado**, no la fortalece:

1. **Cobertura.** El dataset ChatGPT de LLM Mentions es **US/English-only**. Para Chile y LatAm sólo aplica el lado
   `google` (AI Overviews), que ya observamos con la familia `serp`. Vender «visibilidad en ChatGPT para Chile» con
   esta API sería extrapolar desde EE.UU.
2. **`ai_search_volume` no mide IA.** Sale de People Also Ask; para la plataforma `google` es el volumen de búsqueda de
   Google. Entre plataformas difiere ~200× por **origen de la métrica**, no por demanda real. La skill
   `dataforseo-operator` ya lo declaraba como ◑ estimado; la revisión lo confirma con la fuente.
3. **Brand entities sólo existen para ChatGPT** — y por lo tanto son efectivamente US-only.
4. **Riesgo de facturación no publicado:** `target_metrics` cobra por fila y puede devolver `items_count: 0`;
   no está documentado qué cuenta como fila facturable.

**Recomendación:** mantener `ai_optimization` fuera del allowlist. Si algún día entra, que entre acotada a un caso
medido —no al catálogo completo— y precedida de una llamada real que mida `tasks[].cost` antes de escalar.
Lo que sí conserva valor independiente del mercado: **LLM Responses** como posible reemplazo del mantenimiento de
cuatro integraciones LLM propias, decisión que pertenece a `arch-architect`, no a este brief.

## Lo que NO se incorporó, y por qué

- **Layout de PDF/HTML y plantillas de dashboard** — es dominio de `report-studio`, no oficio SEO.
- **Interaction rules de agente** (una pregunta por turno, etc.) — patrón de UX, no metodología.
- **Query fan-out y chunking** — `seo-aeo/modules/04_AEO_GEO.md` ya lo cubre con mejor crítica de evidencia.
- **Bugs internos de sus scripts** (recorte de `www.` por conjunto de caracteres, `url_from` mal escrito en el disavow,
  filtro de dificultad prometido en el marketing y ausente en el workflow) — irrelevantes para el método, salvo como
  advertencia de no copiar código sin leerlo.
- **Su corte de canibalización** como reemplazo del nuestro: su argumento de host-crowding no aplica a GSC, que reporta
  por par `(query, page)` con independencia de la co-aparición en una SERP.

## Decisiones tomadas (2026-09-11)

Las cuatro preguntas que este brief dejó abiertas quedaron resueltas el mismo día, con las
skills del dominio cargadas. Ninguna amplía el allowlist: las cuatro caen en familias ya
permitidas.

| Pregunta | Decisión | Dónde vive |
|---|---|---|
| `bulk_spam_score` para screening masivo | **Sí**, como hecho de mercado por dominio (tabla propia sin `organization_id`: el spam score de un dominio es el mismo para todos) con condición de disparo sobre agregado ya pagado y pre-check de **frescura**, no de existencia | `TASK-1871` |
| Disavow como entregable | **No.** Google descuenta el spam entrante por su cuenta; el disavow es para cuando el propio sitio construyó enlaces manipulativos, y una herramienta de un clic invita a usarlo donde daña. Criterio de cuándo sí —acción manual confirmada, historial declarado de compra de enlaces, spam dirigido fechado; los tres se **declaran**, ninguno se detecta por score— más las guardas de Google si algún día se entrega uno | `seo-aeo/modules/05_OFFPAGE_AUTHORITY.md` § *Enlaces tóxicos y disavow* |
| Rotación over-time sin GSC | **Sí, y a costo de proveedor CERO**: se deriva de `seo_serp_top_results`, que ya persiste el top-N diario completo —incluidos los dominios ajenos—, así que la señal existe para competidores y prospectos sin comprar nada. Se deriva al leer, no se persiste. `insufficient_history` es veredicto de primera clase: la serie arranca el 2026-08-29 y una ventana de 30 días todavía no existe | `TASK-1870` |
| Gate de `rank_scale` | **Sí, ya implementado.** Guard por módulo —el repo separa el contrato del endpoint de la llamada que arma el payload— verificado en ambos sentidos | `src/lib/ai/__tests__/dataforseo-backlinks-rank-scale-guard.test.ts` |

**Hallazgo del camino:** implementar el gate destapó que `prospect/` pedía `rank` en escala
0–1000 sin declararlo. No lo consume hoy, así que no hubo daño, pero la trampa quedaba armada
para el primer consumer futuro. Corregido en las dos llamadas.

**Defecto abierto:** [`ISSUE-170`](../issues/open/ISSUE-170-prospect-link-gap-colapsa-por-interseccion-and.md)
— el diagnóstico de prospecto pasa hasta 5 competidores juntos a `domain_intersection` sin
declarar `intersection_mode`, y el default `all` devolvería sólo los dominios que enlazan a
todos. Registrado con experimento definido, no afirmado: la glosa de la propia documentación es
ambigua y no se midió contra respuesta real.

**Lo que la economía ajena NO se lleva:** `TASK-1870` deja fuera de V1 el `clicks_at_risk` /
`value_at_risk` del proveedor precisamente por la discrepancia de CTR documentada arriba.

## Anexos

Los seis dossiers completos de la investigación (5.544 líneas) viven en
[`RESEARCH-011-annexes/`](RESEARCH-011-annexes/): extracción de las seis skills, la API AI Optimization endpoint por
endpoint con precios, los templates n8n/Make, y el inventario de nuestro propio runtime.
