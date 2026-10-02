# Flujo detallado: tool o fuente exacta por paso

Verificado contra el repo el 2026-09-26: manual servido `docs/mcp/skills/marketing-studio/SKILL.md`, registro de
Studio (API `1.2.0`, 13 tools de lectura + 5 exclusiones), `src/mcp/greenhouse/tool-manifest.ts` (tools SEO con
`writes` y `spendsProviderBudget`) y los manuales MCP de SEO en `docs/mcp/skills/`. Si una tool no aparece en la
sesión, **se declara la limitación** y se usa la fuente documental, marcada como tal.

## Paso 0 — ¿La campaña existe?

| Llamada | Para qué | Trampa |
|---|---|---|
| `studio.campaigns.list` | ver campañas visibles con sus tres estados | la lista respeta la organización de la conexión; «no aparece» ≠ «no existe» |
| `studio.search` (`q` 2–80 caracteres) | buscar por palabra del nombre, pieza o copy | devuelve hasta 5 campañas, 6 piezas, 5 copys: no es un inventario |
| OneDrive `Alineación/2. Campañas/LEEME.md` (overview) | la campaña puede existir `pausada` o `borrador` fuera de Studio | la fecha de modificación de OneDrive no prueba vigencia |

Sin `CMP-###`: el plan se arma como borrador sin id. La reserva es del humano (registro §2).

## Paso 1 — Contexto

### Studio (T0)

Orden recomendado (manual servido):

1. `studio.attention.get` — decisiones pendientes, próximas publicaciones, inventario.
2. `studio.campaign.get` (`campaignId`) — tres estados con notas, conceptos, decisiones, referencia al brief.
3. `studio.campaign.assets.list` (filtros `kind`, `ratio`, `conceptId`, `cursor`) → `studio.asset.get` para una
   pieza completa (versiones, derechos, anuncios que la usan, copys del concepto). `studio.asset.preview` sólo si
   hay que **mirar** la pieza (`thumb` por defecto; `preview` si hay texto fino).
4. `studio.campaign.copies.list` (`channel`, `conceptId`) — copys literales con conteo de caracteres.
5. `studio.campaign.ads.list` (`channel`) — configuraciones de anuncio (`status`, `checksPending`, URL con UTM).
6. `studio.campaign.media_plan.get` — flight, audiencias, líneas de presupuesto por `kind`.
7. `studio.campaign.posts.list` — calendario orgánico con observación.
8. `studio.calendar.get` (`from` incluido, `to` excluido, `YYYY-MM-DD`) — choques con otras campañas.

`nextCursor` se devuelve tal cual como `cursor`; nunca se arma a mano. Errores: `authorization_denied` = falta el
permiso de lectura en Greenhouse (no reintentar); `not_found` = no existe **o** no es visible (no especular);
`upstream_unavailable` = Studio no respondió (decirlo, no rellenar de memoria).

### Documentos de la campaña

| Fuente | Qué aporta |
|---|---|
| `Alineación/2. Campañas/CMP-###_…/BRIEF.md` | promesa, prohibiciones, audiencia y job, lenguaje, destinos, medición, límites de uso |
| `…/ASSETS.md`, `…/decisiones/`, `…/medicion/` | inventario, territorios descartados con razón, KPIs/UTM |
| `docs/campaigns/decisions/CDR-###` | decisiones vigentes (ventana, canales, presupuesto, cortes) |
| `5. Contenidos/15. Paid Media/01. Recursos/<CMP> - Produccion y editables/MANIFIESTO-PAUTA.json` | inventario operativo de pauta: copy externo, audiencias, anuncios, flight, `operating_rules`, `sources` con fecha |
| Templates `digital-marketing/templates/` (`campaign-brief.md`, `integrated-campaign-plan.md`, `paid-media-plan.md`, `utm-campaign-naming-convention.md`) y OneDrive `_templates/MEDIA-PLAN-TEMPLATE.md` | forma del brief y del media plan; esta skill no los duplica, los alimenta |

### Cliente, voz y negocio

| Fuente | Uso |
|---|---|
| `docs/context/13_icp-buyer-personas-jtbd.md` | 12 ICP, BP1–BP8 vigentes (BP9 candidata), JTBD por línea. Citar por id (`ICP3 AEO`, `BP1`) |
| `docs/context/05_voz-tono-estilo.md` | personalidad, voz, tono por contexto, do's/don'ts, non-negotiable de prueba |
| `docs/context/11_hubspot-bowtie.md` | stages de contacto (7) y empresa (12), properties de motion |
| `docs/context/08_estrategia-comercial.md` | tesis, narrativa GTM vigente, motores, triggers de cross-sell |
| `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md` §6–6b | brief como fuente única, buying group obligatorio en B2B, medición de negocio en HubSpot |

## Paso 2 — Estrategia

- Objetivo de negocio en una frase medible (qué cambia en el negocio, no en el canal).
- KPI norte + KPIs por etapa. Cada KPI: definición, denominador, fuente (GA4 / HubSpot / plataforma), meta **o**
  `dimensionamiento`, ventana y fecha. Si no hay datos propios, la meta se fija al cierre del mes 1
  (`_templates/MEDIA-PLAN-TEMPLATE.md` §1).
- Hipótesis: `Creemos que <audiencia> hará <acción> si <mensaje/canal>; lo sabremos cuando <métrica> <umbral> en
  <ventana>; si no, <acción de parada>`.
- Guardrail (lo que no puede empeorar) — sin él se apagan piezas que funcionan.

## Paso 3 — Matriz de audiencias

Filas = persona (BP) + rol en el buying group (campeón, sponsor económico, owner técnico, owner de datos,
bloqueadores, incumbente). Columnas = etapa (TOFU/MOFU/BOFU) con su stage de bow-tie (Subscriber/Lead → MQL →
SQL → `opportunity`). Celda = canal canónico + job + mensaje + acción + destino. Reglas:

- El tamaño de empresa no decide quién compra ni qué dolor tiene.
- Meta no segmenta por cargo: no lleva mensajes MOFU/BOFU dirigidos a un rol (plantilla de media plan §4).
- Retargeting no existe el mes 1 de una campaña nueva: la matriz no asigna BOFU a una audiencia que aún no se
  construyó.

## Paso 4 — Message house

Promesa central · 3–4 pilares (cada uno con prueba citada) · lo que **no** se promete · vocabulario sí/no ·
tono por canal (la voz no cambia, el tono sí). La prueba es dato, caso o mecanismo con fuente; si no la hay, el
pilar es hipótesis y se marca.

## Paso 5 — Plan de contenidos

Una fila por pieza: id de concepto (`CMP###-NN`), título, canal, placement, ratio, tipo, rol al que le habla,
etapa, owner, fecha de entrega, estado. Nombre de archivo canónico y specs en
`channels-and-measurement.md`. Conceptos aún no producidos van en tabla aparte (no se inventan exports).

## Paso 6 — Plan SEO/AEO

Protocolo: leer el entitlement primero; si `hasModule` es falso, el plan SEO queda `no disponible para esta
organización` y no se infiere nada más.

| Pregunta | Tool (lectura, sin costo) | Qué devuelve / cómo se reporta |
|---|---|---|
| ¿Tiene módulo y presupuesto? | `get_seo_entitlement` | módulo, presupuesto mensual restante del proveedor |
| ¿Dónde estamos cerca de ganar? | `get_seo_keyword_opportunities` | striking distance **medido** por Search Console (●) |
| ¿Qué tienen los competidores y nosotros no? | `get_seo_keyword_gap` | gap derivado al leer; no tiene orden propio |
| ¿Qué candidatos salieron de discovery? | `get_seo_keyword_discovery` | un candidato **no** es una keyword seguida |
| ¿Qué hacer primero? | `get_seo_work_queue` | la única autoridad de orden del módulo; propone, no ejecuta |
| ¿Qué ranquea la URL destino? | `get_seo_url_visibility` | snapshot de mercado (◑) con fecha |
| ¿Cómo evolucionó una keyword? | `get_seo_rank_evolution` | serie de posiciones capturadas |
| ¿Medido vs estimado? | `get_seo_dual_lens_visibility` | dos series separadas; **nunca promediarlas** |
| ¿SEO vs respuestas IA? | `get_seo_visibility_360` | cruce rank medido × citabilidad IA |
| ¿Qué preguntas le hacen a la IA? | `get_seo_grounded_query_draft` | borrador de prompts AEO con procedencia |
| ¿Volumen/CPC de mercado? | `get_seo_keyword_market_data` | estimado de la captura mensual ya pagada |

Escrituras SEO (se proponen en el plan; nunca se ejecutan sin confirmación):

| Tool | Clase | Nivel |
|---|---|---|
| `track_seo_keywords` | gasto **recurrente** hasta retirar | T2 |
| `declare_seo_competitors` | gasto **recurrente** de cobertura | T2 |
| `discover_seo_keywords` | gasto inmediato por llamada y por fila (usar `preview: true` primero) | T2 |
| `run_seo_prospect_diagnostic` | gasto inmediato por corrida | T2 |
| `prepare_seo_grounded_queries` | escritura sin gasto; crea borrador, nunca aprueba ni corre el grader | T1 |
| `untrack_seo_keywords` / `retire_seo_competitors` | cortan gasto; no borran historia | T1 (con confirmación si revierte algo que el humano pidió) |

La propuesta de gasto lleva la **lista exacta** (keywords, dominios, semillas), el costo que devuelva la vista
previa y el presupuesto restante; la confirmación de otra lista no vale para esta. Cada figura SEO lleva su lente
(● medido / ◑ estimado), su fecha de captura y, si es `etv`, la versión de fórmula.

Salida del paso: keywords objetivo por URL destino, preguntas de respuesta IA por persona/etapa, contenido de
soporte (brief de pieza → `content-marketing-studio`) y acciones técnicas (→ `seo-aeo`).

## Paso 7 — Plan de medición

Ver `channels-and-measurement.md` (UTM, eventos, definición de conversión, puente UTM → contacto → deal).
Cada tasa con denominador; un costo por conversión no se calcula con cero conversiones.

## Paso 8 — Copies

Por canal: primera línea/hook, cuerpo, titular, descripción si aplica, CTA nativo, destino. Medir caracteres por
campo y compararlos con el límite con fecha. Variantes: cambian **una** variable (hook, prueba, CTA) para que el
test enseñe algo. Una idea por anuncio. No introducir garantías, precios, gratuidad, plazos ni testimonios para
llenar un campo. La landing debe sostener la promesa.

## Paso 9 — Riesgos y decisiones

Riesgos (qué, probabilidad cualitativa, impacto, mitigación, dueño). Supuestos marcados. Checklist de decisiones
del humano, cada una con opciones y consecuencia. Una contradicción entre decisiones vigentes (p. ej. dos CDR) se
señala con la propuesta de resolución; no se resuelve en silencio.
