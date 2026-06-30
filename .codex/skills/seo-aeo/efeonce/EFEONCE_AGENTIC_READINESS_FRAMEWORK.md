# Framework propietario Efeonce — Niveles para existir en un internet de agentes

> **Qué es esto.** El **framework + metodología propietaria de Efeonce** para
> posicionar marcas en la web agéntica y la era de los answer engines. Es la
> narrativa pública de la agencia ("no basta con rankear en Google") y, a la
> vez, el modelo interno que el **AI Visibility Grader** (producto Greenhouse,
> dominio `growth`) usa para diagnosticar y puntuar. Marketing y medición hablan
> el mismo idioma. Sello: as-of 2026-06-27. Si hay drift con el runtime del
> grader, prevalece el doc del repo (`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`).

> **Relación con el resto de la skill.** Esto es el **modelo mental propietario**
> que envuelve las 3 capas técnicas (SEO clásico, AEO/GEO, fundamentos) del
> `SKILL.md` §1. Carga `efeonce/AI_VISIBILITY_GRADER.md` para el producto que lo
> operacionaliza, y la skill cross `webmcp` para el nivel Be Actionable.

---

## El framework: cinco niveles para existir en un internet de agentes

**Tesis central:** ser visible para la IA no es un interruptor — es una escalera
de madurez. No basta con que te *rankee* Google; hay que recorrer los niveles de
preparación para que los buscadores **y** los agentes de IA te encuentren, te
entiendan, te representen bien, te puedan operar y te prefieran por defecto.

| # | Nivel | Ancla EN | Qué significa | La pregunta que responde |
|---|---|---|---|---|
| **01** | **Que te encuentre** | **Be Found** | Indexable y visible para buscadores y motores de IA. | *¿Existes para la IA?* |
| **02** | **Que te entienda** | **Be Readable** | Estructura semántica, schema y contenido que la IA procesa sin ambigüedad. | *¿Te puede leer sin adivinar?* |
| **03** | **Que te represente bien** | **Be Correct** | La IA habla de ti con exactitud: sin features alucinadas, sin confundirte con un competidor, sin claims falsos. | *¿Lo que dice de ti es verdad?* |
| **04** | **Que pueda actuar** | **Be Actionable** | Un agente puede comparar, reservar o comprar en tu sitio sin fricción. | *¿Te pueden usar, no solo citar?* |
| **05** | **Que te prefiera** | **Be Intrinsic** | Tu marca es parte de cómo la IA entiende tu categoría. La recomendación por defecto. | *¿Eres el default?* |

> **Nota de versión.** El framework nació con **4 niveles** (Found · Readable ·
> Actionable · Intrinsic). **Be Correct** se agregó como 5º eje (2026-06-27):
> estar *found + readable* pero ser **consistentemente malinterpretado** por la
> IA es un fallo distinto y de alta ansiedad para la marca ("¿qué está diciendo
> mal de mí?"). El sitio público puede presentar 4 ó 5 niveles según el espacio;
> la **metodología canónica es de 5**.

---

## El modelo honesto detrás de la escalera: NO es una sola línea, son DOS ejes

La escalera de 5 vende bien como narrativa, pero **medir** con ella mal lleva a
mis-scoring. La verdad arquitectónica (regla dura: no mezclar dimensiones
ortogonales): hay **dos ejes**, no una secuencia lineal.

```
EJE A — PERCEPCIÓN  ("¿qué dice/piensa la IA de ti?")
  Be Found ──► Be Readable ──► Be Correct ──► Be Intrinsic
  (progresión real: descubrible → entendido → bien representado → preferido)

EJE B — OPERABILIDAD AGÉNTICA  ("¿te pueden USAR los agentes?")
  Be Actionable   (track propio, ortogonal al eje A)
```

**Por qué importa:** una marca puede ser **Intrinsic** (la IA la recomienda por
defecto) sin ser **Actionable** (sin checkout/operación por agente) — pasa todo
el tiempo en B2B. Y al revés. Be Actionable NO es un peldaño entre Readable e
Intrinsic; es un eje propio. En la narrativa pública va como "nivel 04" porque
cuenta bien; en el **grader se puntúa como axis separado** y nunca se fusiona con
el score de percepción en un solo número.

**Honestidad de expectativas por nivel (para ventas):**

- **Be Intrinsic (05)** es un **outcome que se gana**, no un deliverable. Depende
  de autoridad de entidad + share-of-voice + presencia en training data — lento y
  no del todo en control de la marca (no editas los pesos del modelo). Frámalo
  como *trayectoria*, nunca como "te hacemos el default" garantizado.
- **Be Actionable (04)** es el mayor **diferenciador** (casi nadie lo ofrece) y el
  menos maduro hoy: WebMCP es pre-estándar (Chrome origin trial, 2026). On-ramp
  gradual: structured data + APIs limpias + DOM semántico **hoy** (el 80%
  alcanzable); WebMCP como frontera que va aterrizando. WebMCP = techo de la
  escala, no el único camino.
- **Be Correct (03)** es gancho emocional fuerte: las marcas temen lo que la IA
  inventa de ellas. Medible vía detección de exactitud (hallucinated feature,
  confusión con competidor).

---

## Mapeo 1:1 al AI Visibility Grader (el framework ES el instrumento de medición)

El framework es la **narrativa pública**; el grader es el **instrumento**; los
fix-it artifacts son la **remediación**. El report del grader debería estructurar
su top-line literalmente como estos niveles, con las dimensiones técnicas mapeadas
debajo — así el lead magnet y el pitch comercial hablan el mismo idioma.

| Nivel | Cómo lo mide el grader (dominio `growth.ai_visibility`) |
|---|---|
| **01 · Be Found** | Dim. percepción `ai_visibility` + probes técnicos `robots.txt` (acceso GPTBot/PerplexityBot/ClaudeBot/Google-Extended/OAI-SearchBot), `sitemap`, indexación. Cobertura de motores: OpenAI/Anthropic/Perplexity/Gemini + **Google AI Overviews / AI Mode** (TASK-1265). |
| **02 · Be Readable** | Probes structural readiness: JSON-LD/schema.org, `llms.txt`, answer-capsules/chunking, CWV/render + dim. `entity_clarity` (TASK-1266). |
| **03 · Be Correct** | Accuracy detector: `hallucinated_feature`, `confused_with_competitor`, claims falsos → gate `review_required` (existe en `accuracy/`, TASK-1238). Surface como axis propio = follow-up. |
| **04 · Be Actionable** | **`agentic_readiness`** — WebMCP tools (Lighthouse `registered-webmcp-tools`), `.well-known/mcp` / API discoverability, DOM semántico/ARIA, `potentialAction`/`SearchAction` (TASK-1266). *El nivel que prueba que el framework no es humo: lo podemos medir.* |
| **05 · Be Intrinsic** | `category_ownership` + `competitive_sov` + `message_alignment` + autoridad de entidad (Knowledge Graph/Wikidata/Reddit, TASK-1267) + SoV recurrente en el tiempo (TASK-1270). |

**Frame propietario interno** del grader = "Surround Discovery Audit". La
durabilidad no es "tu score es 47/100": es el diagnóstico accionable por nivel +
los artefactos fix-it (JSON-LD, llms.txt, briefs — TASK-1269) que cierran el loop
diagnóstico → acción.

---

## Cómo usar el framework en una asesoría / pitch

1. **Diagnostica por eje, no por escalera lineal.** Reporta percepción
   (Found/Readable/Correct/Intrinsic) y operabilidad (Actionable) por separado.
   Una marca puede estar en distinto nivel en cada eje.
2. **Prioriza con RICE** (SKILL.md §4). El orden típico de remediación: arreglar
   Found roto (indexación/robots IA) → Readable (schema/llms.txt) → Correct
   (corregir lo que la IA malinterpreta) → Actionable (structured actions/MCP/
   WebMCP) → Intrinsic (entidad + digital PR + SoV sostenido).
3. **Sé honesto con Intrinsic y Actionable** (ver expectativas arriba). No
   prometas el default ni WebMCP universal como switch.
4. **Cierra con medición** (`modules/07_MEASUREMENT.md`): SoV cross-engine + AEO
   + el re-grade recurrente para tendencia (no un snapshot único).

---

## Guardrails (heredados de la skill + el grader)

- **No black-hat / spam IA** (`ANTIPATTERNS.md`). El framework es de autoridad
  ganada, no de gaming.
- **Probes read-only sobre superficies públicas de terceros** — nunca autenticar,
  mutar ni tocar endpoints privados del sitio analizado (cuando se mide a un
  cliente o prospecto).
- **Public-safe** en cualquier artefacto del lead magnet: sin raw provider text,
  sin claims de ranking garantizado, sin internal reasons.
- **Si Efeonce/Greenhouse adopta WebMCP propio:** las tools de write van por el
  loop gobernado `propose → confirm → execute` (el LLM nunca muta directo).

---

## Fuentes / cross-refs

- `SKILL.md` §1 (las 3 capas técnicas que este framework envuelve) + §4 (RICE).
- `efeonce/AI_VISIBILITY_GRADER.md` — el producto que lo operacionaliza.
- `efeonce/EFEONCE_OVERLAY.md` — caso Efeonce (WordPress/Kinsta, ICP Globe).
- skill cross `webmcp` — Be Actionable / agentic-web readiness (rubric + Lighthouse).
- Repo Greenhouse: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` +
  TASK-1265…1270 (cobertura AI Overviews, probe layer, entity probes, citation
  breakdown, fix-it artifacts, recurring SoV).
