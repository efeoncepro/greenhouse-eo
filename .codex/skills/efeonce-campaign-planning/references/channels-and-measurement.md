# Canales canónicos, especificaciones, nombres de archivo, UTM y eventos

Todo valor de este archivo lleva su fuente y su fecha. Una especificación de plataforma **se verifica contra la
fuente oficial vigente antes de salida**; lo de acá sirve para planificar, no para certificar.

## 1. Lista canónica de canales

Studio guarda el canal como texto (no hay enum en `packages/contracts/src/dto.ts` al 2026-09-26), así que la lista
cerrada vive acá, derivada de lo que Efeonce ya opera y registra. **Un canal fuera de esta lista es una decisión
abierta del humano** (se registra como CDR de la campaña y luego se agrega aquí con su fuente).

### Pagados

| Clave (`channel` en Studio / `utm_source`) | Qué es | Formatos | Estado de la cuenta | Fuente |
|---|---|---|---|---|
| `linkedin` | LinkedIn Ads, Sponsored Content (imagen y video) | 4:5 estático móvil · 1:1 ambos dispositivos · video MP4 | **sin confirmar** para pauta (I2) | catálogo Studio CMP-001 (46 copys `linkedin`); `CMP-001-MEDIA-PLAN-Q4-2026.md` I2 (2026-09-22) |
| `meta` | Meta Ads feed (Facebook/Instagram) | 4:5 feed imagen/video | **conectado por MCP** (declarado por el operador 2026-09-22) | catálogo Studio (61 copys `meta`); media plan CMP-001 I2 |
| `meta-vertical` | Meta Stories / Reels | 9:16 imagen (Stories) · 9:16 MP4 (Reels) | igual que `meta` | catálogo Studio (16 copys `meta-vertical`); `MANIFIESTO-PAUTA.json` `operating_rules.placements` (2026-09-22) |
| `google` | Google Ads (Search / Display) | Display 16:9 **sólo retargeting**, nunca prospección fría | **sin confirmar**; no usado todavía | media plan CMP-001 I2; `_templates/MEDIA-PLAN-TEMPLATE.md` §4 |

Reglas de canal pagado (`MANIFIESTO-PAUTA.json` `operating_rules`, CMP-001, 2026-09-22): LinkedIn es el núcleo B2B;
Meta es prueba TOFU (no segmenta por cargo: sin MOFU/BOFU dirigidos a un rol); Display diferido (16:9 no es
especificación universal); **no** activar PMax, Search, mensajería ni lead forms nativos sin su propio alcance.

### Orgánicos (publicación vía Metricool)

| Clave (red en `scheduled_post`) | Cuenta | Fuente |
|---|---|---|
| `linkedin` | página Efeonce · perfil de Julio Reyes (voz autoral: skill `copywriting`) | CDR-009 (programación CMP-003, 2026-09-24) |
| `instagram` | Efeonce | CDR-009 |

Un post orgánico **no hereda** la UTM ni el destino del plan pagado (invariante 8 de Studio). Programado ≠
publicado: la publicación la prueba la observación del proveedor (`social-media-studio/references/video-delivery-metricool.md`).

### Propios

| Canal | Qué es | Dueño del craft | Límite conocido |
|---|---|---|---|
| `blog` / sitio público | `efeoncepro.com` (WordPress) | `content-marketing-studio`, `efeonce-public-site-wordpress` | publicar exige autorización, snapshot y rollback |
| `email` | email de marketing | `digital-marketing` (canal) + `greenhouse-email` (infra) | HubSpot marketing **no** está en el repo; no asumir un módulo de campañas HubSpot (`digital-marketing/efeonce/CHANNELS_AND_MARTECH_GAPS.md`) |
| `landing` | destino de conversión, **no** canal de distribución | `growth-marketing-cro`, `greenhouse-growth-forms` | auditar formularios con navegador real (CDR-007) |

### Superficie ganada (no se «publica» ahí)

| Superficie | Cómo entra al plan |
|---|---|
| Respuestas de IA (ChatGPT, Gemini, AI Overviews, Perplexity) | vía contenido citable + plan SEO/AEO (paso 6); se mide con Search Visibility 360, no con UTM |
| Búsqueda orgánica | plan SEO (paso 6) |

## 2. Especificaciones de copy con fecha

| Canal / campo | Recomendado | Máximo | Fuente y fecha | Nota |
|---|---|---|---|---|
| LinkedIn single image — intro | 150 | 3.000 | LinkedIn Sponsored Content specs, verificada 2026-09-22 (`MANIFIESTO-PAUTA.json` `sources`; `efeonce-advertising-creative/references/ad-creative-evidence-2026.md`) | recomendación, no máximo universal |
| LinkedIn single image — headline | 70 | 200 | ídem | |
| LinkedIn video — textos | — | ver fuente | LinkedIn video ads specs, 2026-09-22 | no sustituye el preview de la cuenta |
| Meta feed — texto principal | 150 (presupuesto editorial propio) | **no certificado** | la guía oficial respondió login/bloqueo el 2026-09-22 | verificar en la cuenta antes de salida |
| Meta vertical (Stories/Reels) | 90 (presupuesto editorial propio) | **no certificado** | ídem | zonas seguras: críticos fuera de ~14 % superior, ~35 % inferior, ~6 % laterales (`ad-creative-evidence-2026.md`) |
| Instagram / LinkedIn orgánico | — | **por verificar** | sin fuente registrada en el repo | no inventar un límite |

CTA nativo observado en CMP-001: `Learn More` (48 copys, catálogo Studio). Algunos placements no muestran headline
ni descripción: la matriz lo indica en vez de rellenar.

## 3. Nombre de archivo e ids de pieza

Contrato de inferencia de TASK-1894 (Detailed Spec «Inferencia desde el nombre»):

```
<concepto> - <título> - <ratio>.<ext>
CMP001-02 - La IA es un gasto - 4x5.png
^(?<concept>CMP(?<cmp>\d{3,})-(?<seq>[A-Z]?\d{2})) - (?<title>.+?) - (?<ratio>\d+x\d+)\.(?<ext>[a-z0-9]+)$
```

- Campaña `CMP-001` ⇐ `CMP001`; concepto `CMP001-02`; pieza `CMP001-02-imagen-4x5` (tipo por mime: `imagen`,
  `video`).
- Ratios canónicos: `1x1`, `4x5`, `9x16`, `16x9`. Un recorte automático (`crop_*`) **no** es una pieza.
- El autor, la fecha y la versión van en metadata, nunca en el nombre. Un sufijo de taller («v3», «final») hace que
  la inferencia falle (`unmatched`): es correcto que falle.

## 4. Convención UTM

**Regla:** usar la convención **ya registrada** en la campaña (URL con UTM de `studio.campaign.ads.list` o
`MANIFIESTO-PAUTA.json`). Para una campaña nueva, proponer el patrón **observado en producción** y dejar el
conflicto documental como decisión abierta del dueño de la taxonomía.

Patrón observado (CMP-001, 72 anuncios del catálogo, 2026-09-22):

| Parámetro | Valor | Forma |
|---|---|---|
| `utm_source` | `linkedin` · `meta` | la plataforma, nunca la pieza |
| `utm_medium` | `paid-social` | lista controlada de `digital-marketing/templates/utm-campaign-naming-convention.md` (`cpc`, `paid-social`, `email`, `organic-social`, `display`, `referral`) |
| `utm_campaign` | `cmp001-la-ia-dice-de-ti` | `cmp###-<slug>` en minúsculas, sin tildes |
| `utm_content` | `c01-tofu-4x5-imagen-feed-image-ha-v01` | `c<NN>-<etapa>-<ratio>-<tipo>-<placement>-<hook>-v<NN>`: permite saber qué creatividad muere primero |
| `utm_term` | audiencia o keyword | opcional |

⚠️ **Conflicto registrado:** `docs/campaigns/CMP-001-MEDIA-PLAN-Q4-2026.md` §4 propone `utm_medium = paid_social`
y `utm_campaign = cmp001_<etapa>_<linea>` (con guion bajo), distinto de lo que quedó cargado en los 72 anuncios.
El plan no elige en silencio: lo lista en «Decisiones abiertas».

## 5. Eventos de conversión y medición de negocio

| Capa | Qué | Estado verificado | Fuente |
|---|---|---|---|
| Web | GA4 `G-KYPPY57M14` + GTM `GTM-K2X4ZTTK` | existen en el sitio | media plan CMP-001, 2026-09-22 |
| Formulario | `gh_form_submitted` = **intento**; `generate_lead` sólo con mapping existente verificado | IDs de conversión de las cuentas pendientes | `MANIFIESTO-PAUTA.json` `operating_rules.conversion` |
| CRM | conversión calificada = contacto en `opportunity` (CMP-001, fijado por el operador 2026-09-22) | en cada campaña la fija quien opera el pipeline | registro de campañas §6b |
| Puente | `utm_campaign` → contacto → deal en HubSpot | **no resuelto**: prerrequisito `TASK-1886` (to-do al 2026-09-26) | media plan CMP-001 §4 |
| Atribución | no sumar conversiones que Meta y LinkedIn se atribuyen; deduplicar en CRM | regla | `operating_rules.attribution` |

Stages del bow-tie para la matriz (contacto): `subscriber` → `lead` → `marketingqualifiedlead` → `pql` →
`salesqualifiedlead` → `opportunity` → `customer` (`docs/context/11_hubspot-bowtie.md`). La empresa tiene 12
stages; la post-venta (expansión, renovación, riesgo) son properties booleanas, no stages.

Cifras del plan, tres tipos (`_templates/MEDIA-PLAN-TEMPLATE.md` §1): **dimensionamiento** (supuesto para
calcular, no meta) · **meta** (compromiso) · **real** (medido en la cuenta). Un benchmark externo es
dimensionamiento con fuente, año y tamaño de muestra, marcado «no revalidado en nuestra cuenta».
