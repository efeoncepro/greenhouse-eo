# RESEARCH-012 — ¿Siguen teniendo sentido las UTM con GA4? Convención derivada de las activaciones

> **Status:** Active (validado por fuentes primarias; implementación por TASK-1905, TASK-2001 y TASK-1907)
> **As of:** 2026-10-04
> **Autor:** Claude, a pedido del operador (Julio Reyes)
> **Relacionado:** ADR de estrategia de Marketing Studio §15 (taxonomía de canales y activaciones),
> [TASK-2001](../tasks/to-do/TASK-2001-marketing-studio-campaign-activations-execution-evidence.md),
> [TASK-1905](../tasks/in-progress/TASK-1905-marketing-studio-channel-catalog-risk-tiers-icp-reference.md),
> [TASK-1907](../tasks/to-do/TASK-1907-marketing-studio-campaign-strategy-plan.md) (plan de medición)

## Pregunta

Con GA4 como estándar de medición, auto-tagging de las plataformas de ads, protecciones de privacidad de los navegadores
y tráfico que llega desde asistentes de IA, ¿siguen teniendo sentido las UTM? Y si sí, ¿cómo deberían construirse en
Marketing Studio?

## Respuesta corta

**Sí, y más que antes, pero sólo como una convención gobernada que genera Studio desde cada activación**, no como texto
que alguien escribe a mano. Las UTM son hoy la única señal de origen que:

1. entiende **cualquier** herramienta (GA4, HubSpot, el CRM, un warehouse) sin integración con la plataforma de ads;
2. **sobrevive a las protecciones de privacidad** que eliminan los click IDs (Safari quita `gclid`, `fbclid`, `msclkid`
   en contextos privados, pero no las UTM);
3. permite atribuir lo que no tiene auto-tagging: organic social, email, creators, comunidades, QR y OOH.

Lo que **no** resuelven: el tráfico al que se le quita el referer (p. ej. respuestas de ChatGPT de suscriptores
pagados llegan como Direct) y lo que el consentimiento de cookies impide medir. Para esos casos la UTM no basta y se
complementa con auto-tagging, conversiones server-side de cada plataforma y la evidencia de Search Visibility 360.

## Hallazgos (con fuente)

### 1. GA4 sigue leyendo UTM y amplió los parámetros

GA4 soporta `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_term`, `utm_content`, `utm_source_platform`,
`utm_creative_format` y `utm_marketing_tactic`. `utm_creative_format` y `utm_marketing_tactic` **se aceptan pero hoy no
se reportan** en GA4. Google recomienda que, si se usa una UTM, se completen las relevantes, en especial
`utm_source`, `utm_medium`, `utm_campaign`, `utm_id` y `utm_source_platform`, para no tener `(not set)`.
([Google — Traffic-source dimensions, manual tagging, and auto-tagging](https://support.google.com/analytics/answer/11242870?hl=en))

### 2. Auto-tagging y UTM conviven con una regla precisa

Cuando hay auto-tagging (`gclid`), GA4 usa esos valores; pero **si la URL trae cualquier UTM, GA4 deriva todas las
dimensiones de origen cross-channel exclusivamente de las UTM**. No hay un ajuste para invertirlo.
([misma fuente de Google](https://support.google.com/analytics/answer/11242870?hl=en))

Consecuencia: en Google Ads conviene **auto-tagging sin UTM** o **UTM completas y consistentes**, nunca UTM parciales.

### 3. El canal de GA4 depende del `utm_medium` (y de la lista de sitios del `utm_source`)

Reglas del agrupamiento por defecto (extracto):

| Canal GA4 | Regla |
|---|---|
| Paid Social | source en la lista de redes sociales **y** medium que calza `^(.*cp.*|ppc|retargeting|paid.*)$` |
| Organic Social | source en la lista de redes sociales **o** medium `social`, `social-network`, `social-media`, `sm` |
| Paid Search | source en la lista de buscadores **y** medium paid (misma regex) |
| Display | medium `display`, `banner`, `expandable`, `interstitial`, `cpm` |
| Email | source o medium `email` (y variantes) |
| Paid Other | medium paid sin source reconocido |
| **AI Assistant** | medium exactamente `ai-assistant`, o referrer de asistentes reconocidos (ChatGPT, Gemini, DeepSeek, Copilot, Grok) |
| Unassigned | nada calza |

([Google — Default channel group](https://support.google.com/analytics/answer/9756891?hl=en))

Consecuencia: un `utm_medium` inventado («messaging», «community», «qr») cae en **Unassigned**. El medium no es texto
libre: se deriva de la modalidad y la familia.

### 4. Los asistentes de IA ya traen su propia UTM, con un hueco

ChatGPT agrega `utm_source=chatgpt.com` a los enlaces de sus resultados de búsqueda
([OpenAI — Publishers and Developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)),
y GA4 tiene el canal **AI Assistant** (punto 3). Fuentes secundarias reportan que los enlaces en respuestas a
suscriptores pagados llevan `noreferrer` y llegan como Direct
([Seresa, 2026](https://seresa.io/blog/ai-deployment-risk-monitoring/chatgpt-plus-subscribers-are-your-most-valuable-ai-visitors-and-least-visible);
[Clickport](https://clickport.io/blog/chatgpt-direct-traffic-ga4)): **no verificado con fuente primaria**.

Consecuencia: el tráfico **orgánico** desde IA (AEO) no lo etiquetamos nosotros; lo etiqueta el asistente y se mide con
SV360. Las UTM sí aplican a **ChatGPT Ads** (paid search, decisión del operador): ahí la etiqueta la ponemos nosotros.

### 5. La privacidad del navegador quita click IDs, no UTM

Safari elimina parámetros de seguimiento por clic en enlaces de Mail y Messages y en navegación privada, y en toda la
navegación si el usuario activa la protección avanzada para «All Browsing». Los reportes coinciden en que `gclid`,
`fbclid` y `msclkid` están en la lista, y en que **las UTM no se quitan** porque son de nivel campaña, no de usuario o
clic. Apple no publica la lista.
([Improvado, 2026-09-23](https://improvado.io/blog/ios-26-link-tracking-protection-attribution);
[PPC Land, 2026-04-25](https://ppc.land/safari-is-quietly-killing-your-gclid-and-here-is-the-fix/))

Consecuencia: la UTM es la señal que **sobrevive** donde el auto-tagging se pierde.

### 6. HubSpot clasifica por UTM y las prioriza

HubSpot usa `utm_source`/`utm_medium` para su fuente original y las prioriza sobre lo inferido; reconoce Paid Social
cuando el medium contiene `paid`, `ppc` o `cpc` y el source es una red social reconocida.
([HubSpot Community](https://community.hubspot.com/t/other-campaigns-vs-paid-social-paid-search/78857); fuente secundaria)

Consecuencia: una convención compatible con GA4 también deja bien atribuida la **fuente original** del contacto en
HubSpot, que es la que usa el bow-tie.

## Recomendación: UTM derivadas de la activación (§15)

Studio genera la URL etiquetada de cada activación; nadie escribe una UTM a mano. Cada parámetro sale de una dimensión
del §15:

| Parámetro | Valor | Sale de |
|---|---|---|
| `utm_source` | plataforma de aparición en minúscula: `instagram`, `facebook`, `threads`, `linkedin`, `tiktok`, `youtube`, `google`, `bing`, `chatgpt`, `hubspot`… | plataforma (§15) |
| `utm_medium` | **derivado** de modalidad × familia, compatible con GA4: paid social → `paid_social`; organic social → `social`; paid search → `cpc`; display (platform o programmatic) → `display`; paid video → `paid_video`; email → `email`; creators paid → `paid_social`; creators earned → `social` | catálogo de canales (dato, no código) |
| `utm_campaign` | slug legible y estable de la campaña: `cmp-001-lo-que-la-ia-dice-de-ti` | campaña |
| `utm_id` | id canónico de la campaña: `CMP-001` | campaña |
| `utm_content` | id de la **activación** (y con eso pieza, versión y copy) | activación |
| `utm_term` | keyword (search) o audiencia (paid social) | anuncio |
| `utm_source_platform` | plataforma de **compra** en paid: `meta_ads`, `google_ads`, `linkedin_ads`, `dv360`, `the_trade_desk`, `chatgpt_ads`; vacío en organic | buying platform (§15) |
| `utm_creative_format` | `reel`, `story`, `feed_4x5`, `carousel`, `video_16x9`… | placement + pieza |
| `utm_marketing_tactic` | `prospecting`, `retargeting`, `nurturing`, `always_on` | audiencia / tipo de campaña |

`utm_creative_format` y `utm_marketing_tactic` no se ven en GA4 hoy, pero quedan en la URL de aterrizaje que leen HubSpot
y el warehouse: cuestan cero y conservan el dato.

**Reglas:**

- Minúsculas y guion bajo; vocabulario cerrado del catálogo; Studio valida al generar.
- **Google Ads con auto-tagging** (sin UTM o con el set completo, nunca parcial). Meta, LinkedIn, TikTok y DSP con
  UTM completas (con parámetros dinámicos de la plataforma cuando existan).
- **Nunca UTM en enlaces internos** del sitio: sobrescriben el origen de lo que pasa después (la conversión se
  atribuye a una «campaña» interna en vez de al canal que trajo a la persona).
- Lo que GA4 no tiene como canal (Community, Messaging, QR/OOH) se resuelve con un **custom channel group** en GA4 que
  lea los mismos valores del catálogo, no inventando mediums.
- Instagram orgánico sólo admite un enlace (bio): la activación genera su URL, y el link-in-bio rota o se usa una
  landing con la UTM de la activación vigente.

## Origen y ciclo de vida de cada valor (especificación)

Decisión del operador (2026-10-04): las UTM se generan en Studio, en un solo lugar, a partir de datos gobernados. Esta
sección es la especificación que implementan TASK-1905 (catálogo) y TASK-2001 (activaciones).

**Una sola función.** `buildTrackingUrl(activation, catalogVersion)` en `packages/domain` (pura y determinista: mismos
insumos, misma URL). La usan el command que planifica la activación, el preview de la UI, el MCP y la comparación con
lo publicado. Nadie concatena UTM fuera de ella (ni la UI, ni un agente, ni una CLI).

| Valor | Dónde nace | Quién lo fija | Cuándo cambia |
|---|---|---|---|
| `utm_source` | catálogo de canales: plataforma de aparición del `channel_key` | persona con `marketing_studio.catalog.manage`, por versión del catálogo con fuente y fecha | sólo con una versión nueva del catálogo; la activación conserva la versión con que se generó |
| `utm_medium` | catálogo: derivado de modalidad × familia (`paid_social`, `social`, `cpc`, `display`, `paid_video`, `email`…) | ídem | ídem |
| `utm_source_platform` | catálogo: plataforma de **compra** (`meta_ads`, `google_ads`, `linkedin_ads`, `dv360`, `chatgpt_ads`…); vacío en organic | ídem | ídem |
| `utm_campaign` | campaña: slug generado al crear la campaña desde id + nombre (`cmp-001-lo-que-la-ia-dice-de-ti`; minúsculas, ASCII, guiones, ≤ 60) | `createCampaign` | **se congela** con la primera activación con evidencia de ejecución: renombrar la campaña no parte los datos de GA4 en dos |
| `utm_id` | campaña: `campaign_id` (`CMP-001`) | sistema | nunca |
| `utm_content` | activación: id público `ACT-######` (ancho mínimo 6, sin truncar al crecer) | sistema al crear la activación | nunca |
| `utm_term` | anuncio: keyword (search) o clave de audiencia (paid social); se omite si es `null` | persona al configurar el anuncio | mientras la activación no tenga evidencia de ejecución |
| `utm_creative_format` | placement + formato de la pieza (`reel`, `story`, `feed_4x5`, `feed_1x1`, `video_16x9`, `carousel`, `text`) | sistema | ídem |
| `utm_marketing_tactic` | temperatura de la audiencia (fría → `prospecting`; tibia/caliente → `retargeting`) o campaña Always On → `always_on`; se omite si no se sabe | sistema | ídem |
| URL de destino | activación (o el destino por defecto de la campaña) | persona | ídem |

**Modo de etiquetado por canal** (dato del catálogo): `utm` (por defecto), `auto` (Google Ads: auto-tagging, la URL sale
sin UTM y el join usa la integración de Google Ads con GA4) o `auto_plus_full_utm` (sólo si se decide etiquetar Google Ads
completo; nunca parcial).

**Reglas de validación** (al generar; error del command si fallan):

- El destino es `https` y su dominio está en la lista de dominios propios de la organización; nunca un enlace interno con
  UTM.
- El destino no trae ya parámetros `utm_*` (error `destination_has_tracking`; Studio no mezcla dos etiquetados).
- Todos los valores salen de vocabulario cerrado (catálogo y enumeraciones); minúsculas y guion bajo.
- Compatibilidad con GA4: una función pura `expectedGa4Channel(source, medium)` replica las reglas del agrupamiento por
  defecto; un test del catálogo exige que cada canal caiga en su canal GA4 esperado (paid social → Paid Social, organic
  social → Organic Social, paid search → Paid Search, display → Display, email → Email) o declare explícitamente su
  `ga4_custom_group` (Community, Messaging, QR/OOH). Ningún canal termina en Unassigned por descuido.

**Ciclo de vida en la activación:**

- La URL generada se guarda como **snapshot** (`tracking_url` + parámetros + versión del catálogo) en la activación.
- Mientras la activación no tenga evidencia de ejecución, editarla regenera el snapshot.
- Con evidencia (programada o publicada), el snapshot **se congela**: cambiar la activación no altera la URL ya
  distribuida (advertencia `tracking_frozen`); si hace falta otra URL, se crea otra activación.
- Al llegar la evidencia, Studio compara la URL publicada con el snapshot: sin UTM → `tracking_missing`; con valores
  distintos → `tracking_mismatch` (lista de parámetros). Ambas son advertencias visibles en «Hoy» y en la activación.

**Lo que ya existe** (anuncios importados con `utm` escrito a mano en el catálogo de OneDrive): no se sobrescribe. Un
reporte compara la UTM existente con la que generaría Studio y una persona decide en el backfill revisado de TASK-1905.

**Operable por API y MCP:** `previewTrackingUrl` (T0, para ver la URL antes de planificar), el campo `tracking` en
`getActivation` / `listCampaignActivations` y los valores UTM en la lectura del catálogo; los mismos datos para la UI,
la API y los agentes.

## Qué cambia en las tasks

- **TASK-1905:** el catálogo de canales guarda, por canal, el `utm_source` y el `utm_medium` derivados (dato versionado,
  con fuente y fecha), y la plataforma de compra para `utm_source_platform`.
- **TASK-2001:** cada activación expone su **tracking URL** generada con esta convención (`utm_content` = id de la
  activación), y la evidencia de ejecución compara la URL publicada con la generada (enlace sin UTM o con otra =
  advertencia).
- **TASK-1907 (Slice 5):** el plan de medición ya no define la convención UTM: la toma del catálogo y de la activación;
  declara eventos de conversión, cadencia y responsable.
- **TASK-1910:** al leer resultados de paid, el join con GA4/HubSpot se hace por `utm_id` + `utm_content`.

## Preguntas abiertas

1. ¿Slug de campaña con o sin el id (`cmp-001-…`)? Recomendado con id: legible y único.
2. ¿Custom channel group en GA4 para Community, Messaging y Creators? Requiere acceso de edición a la propiedad GA4.
3. Verificar en cuanto exista la cuenta: si `chatgpt` como source de ChatGPT Ads cae en Paid Search o en Paid Other en
   GA4 (no está en la lista de buscadores documentada).
