# SOCIAL_BOUNDARY — la costura completa

> Dónde termina `social-media-studio` y empieza cada skill hermana. Regla de precedencia
> al final. Repetido por seguridad porque el borde con `digital-marketing` es el más fino.

## La frase que resuelve el 80% de los casos

**`digital-marketing` decide social como UN canal del mix (estrategia/campaña integrada);
`social-media-studio` OPERA el canal social por dentro, plataforma por plataforma.**

## Tabla de hand-offs

| Si el trabajo es… | Pertenece a… | Esta skill aporta… |
|---|---|---|
| Mix de canales, campaña integrada multi-canal, media mix, presupuesto/pacing global | `digital-marketing` | el bloque de ejecución del canal social |
| Paid estructurado (estructura de cuenta, PMax/Advantage+, programmatic, bidding) | `digital-marketing` | qué contenido orgánico ganador amplificar (`../modules/07`) |
| Conversión/CRO, experimentos A/B, activación, retención, funnel, atribución/tracking, PLG | `growth-marketing-cro` | el tráfico social + engagement que alimenta el funnel |
| Captura de lead social (grader, newsletter Glitch, form) | `growth-marketing-cro` + `greenhouse-growth-forms` | el CTA social que lleva al form |
| Craft persuasivo fino de texto, sistema de voz/tono, headline bank | `copywriting` | la estructura del hook/caption/guion social |
| SEO técnico, AEO por-motor LLM (ChatGPT/Perplexity/AI Overviews), schema, llms.txt | `seo-aeo` | **social search** (TikTok/IG/YT como buscador) — distinto |
| Pricing, quote-to-cash, pipeline, RevOps de venta | `commercial-expert` | social commerce top-of-funnel |
| Doctrina de marca/GTM/ASaaS, arquitectura de mensaje institucional | `efeonce-agency` | expresión de esa marca en social |
| Producir el asset visual/video concreto | `higgsfield-*` / `greenhouse-ai-image-generator` / `greenhouse-digital-brand-asset-designer` | la dirección creativa social |
| Publicar el blog/long-form/landing en el sitio | `efeonce-public-site-wordpress` | la distribución social de ese contenido |
| Email/newsletter runtime (Glitch) | `greenhouse-email` | el social que crece la lista |
| Copy visible del portal Greenhouse (labels, estados, aria) | `greenhouse-ux-writing` + `src/lib/copy/*` | nada — eso es copy de producto, no social |

## Zonas donde SÍ mandamos (para que no las regale a otra skill)

- Mecánica de algoritmo y señales por red · craft por formato · pilares/cadencia/calendario ·
  community management + dark social · social listening + trend-jacking + social search/AEO-social ·
  creator/UGC/whitelisting · amplificación nativa de contenido ganador · social commerce ·
  analítica **nativa** de redes · producción social con IA + orquestación del estudio.

## AEO: la línea fina con seo-aeo

- **`seo-aeo`** = ser citado por motores de respuesta LLM (ChatGPT Search, Perplexity, AI
  Overviews, Gemini, Copilot), schema, entidad de marca, crawlers IA, llms.txt.
- **Esta skill** = ser **encontrado dentro de la red social** (social search): keywords en
  caption/on-screen text/alt, hook con la query, hashtags como taxonomía, búsqueda multi-modal.
- Se complementan: una pieza puede optimizarse para social search (acá) y su versión blog para
  AEO por-motor (`seo-aeo`). Nómbralas juntas cuando el trabajo cruce ambas.

## Regla de precedencia

1. Si toca **conversión/funnel/atribución/experimento/retención** → `growth-marketing-cro` manda.
2. Si toca **mix de canales / campaña integrada / paid estructurado** → `digital-marketing` manda.
3. Si es **ejecución profunda de una red específica** (contenido, comunidad, formato, escucha,
   creator, commerce, analítica nativa) → **esta skill manda**.
4. Ante duda genuina, nombra ambas y aclara el hand-off; no invadas silenciosamente.

> Cross-runtime: `seo-aeo` y `greenhouse-ux-writing` son Codex-only; `greenhouse-email` y el
> overlay de `commercial-expert` son Claude-only. Al encadenar, nombra la sibling y su runtime.
