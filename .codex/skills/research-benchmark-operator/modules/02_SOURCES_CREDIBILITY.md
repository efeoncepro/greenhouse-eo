# 02 · Sources + Credibility (2026)

Una fuente equivocada envenena todo el research. Este módulo cubre **de dónde** sacar evidencia en 2026 y **cómo juzgar** si vale. Regla base: **triangula** (≥2 fuentes independientes por claim load-bearing) y **fecha todo** (`as-of`).

## El panorama de fuentes 2026 (más allá de Google)

El research moderno no es "googlear". Las fuentes se combinan por ángulo:

| Fuente | Qué da | Cuidado |
|---|---|---|
| **Web abierta / prensa / reportes** | contexto, cifras publicadas, análisis | recencia + sesgo comercial (quien publica vende algo) |
| **Motores de respuesta IA** (ChatGPT, Perplexity, Gemini, AI Overviews) | síntesis rápida, descubrir fuentes | **alucinan 17–33% de citas** (as-of 2026-07); nunca cites lo que el motor dijo sin abrir la fuente |
| **Comunidades** (Reddit, foros, Slack/Discord, reviews) | voz real sin filtro, dolores, objeciones | anécdota ≠ dato; sesgo de autoselección |
| **Datos first-party** (BigQuery, HubSpot, GA4, ICO) | la verdad de tu propio negocio/clientes | el más creíble para lo tuyo; delega a `gcp-bigquery` |
| **Herramientas de datos** (Semrush, similar) | tráfico, keywords, competencia, AI Visibility Index | metodología del proveedor; es estimación |
| **Fuentes oficiales** (gobierno, reguladores, estadística) | cifras autoritativas (mercado, demografía) | pueden estar desactualizadas |
| **Expert networks / entrevistas** | insight primario profundo | costo/tiempo; sesgo del entrevistado |
| **Research sintético** (synthetic users, AI-moderado) | qual a escala, rápido y barato | **no es señal real** — hipótesis a validar |

Regla: para cualquier claim que sostenga una decisión, **cruza al menos dos fuentes de tipos distintos** (p. ej. un reporte + datos first-party; una comunidad + una herramienta).

## Scoring de credibilidad de una fuente (CRAAP + 2026)

Evalúa cada fuente antes de citarla:

- **Currency (recencia):** ¿de cuándo es? En temas volátiles (IA, regulación, mercado), una fuente de hace 18 meses puede estar obsoleta. Registra `as-of`.
- **Relevance:** ¿responde tu pregunta o solo la roza?
- **Authority:** ¿quién la publica y qué autoridad tiene? Un vendor, un regulador y un foro no pesan igual.
- **Accuracy:** ¿tiene fuentes propias verificables? ¿los números cuadran con otras fuentes?
- **Purpose (sesgo):** ¿por qué existe? Contenido de un vendor sobre su propia categoría tiene sesgo comercial estructural — úsalo, pero descontando.

**Jerarquía práctica de credibilidad** (de mayor a menor, ceteris paribus): datos first-party verificados > fuente oficial/primaria > reporte independiente con metodología > herramienta de datos (estimación) > prensa secundaria > síntesis de motor IA sin fuente > anécdota de comunidad. La jerarquía se invierte si la de arriba está obsoleta y la de abajo es fresca y triangulada.

## Anti-alucinación de fuentes (2026, load-bearing)

- **Nunca cites lo que no abriste.** Los motores IA inventan URLs, DOIs, cifras y citas plausibles. Abre la fuente y confirma que dice lo que crees.
- **La verificación es estructural, no opcional.** La validación multicapa baja la alucinación de citas de 17–33% a <1% (as-of 2026-07).
- **Cuidado con el bucle de eco IA:** si tres artículos citan el mismo dato sin fuente primaria, no son tres fuentes — son una repetida. Rastrea la **fuente primaria**.
- Para claims críticos, usa el harness **`deep-research`** (verificación adversarial multi-agente) en vez de una sola pasada.

## Triangulación (la disciplina central)

```
CLAIM: "El mercado de X en LATAM crece 20% anual."
├─ Fuente A: reporte de consultora (2025) → 18–22%     [autoridad media, sesgo bajo]
├─ Fuente B: dato oficial de estadística (2024) → 19%   [autoridad alta, algo viejo]
└─ Fuente C: herramienta de tráfico/demanda → creciente [estimación, direccional]
CONFIANZA: alta (3 fuentes independientes convergen ~19–20%)
```

Si las fuentes **divergen**, no promedies a ciegas: entiende **por qué** (definiciones distintas, años distintos, metodologías distintas) y reporta el rango + la razón. Divergencia sin explicación = confidence bajo.

## Registro de fuentes (source log)

Mantén un **source log** (plantilla `templates/source-log.md`) por research: claim → fuentes → tipo → `as-of` → credibilidad → confidence. Es lo que hace tu research **auditable** y defendible (y lo que te salva cuando alguien pregunta "¿de dónde sacaste eso?").

## Checklist de salida

- [ ] Fuentes elegidas por **ángulo** (no todo del mismo tipo).
- [ ] Cada fuente **abierta y verificada** (nada citado de segunda mano de un motor IA).
- [ ] Claims load-bearing **triangulados** (≥2 fuentes independientes).
- [ ] Todo con **`as-of`** y credibilidad evaluada (CRAAP).
- [ ] Divergencias explicadas, no promediadas a ciegas.
- [ ] Source log poblado.

## Cross-links

- Diseño → `01`; ejecución/verificación adversarial → harness `deep-research`.
- Síntesis con confianza → `05`; sizing → `03`; competitivo/VoC → `04`.
- Datos first-party → `gcp-bigquery` + `greenhouse-ico`; keywords/tráfico → `seo-aeo`/Semrush.
- Artefacto → `templates/source-log.md`.
