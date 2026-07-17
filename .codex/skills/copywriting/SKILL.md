---
name: copywriting
description: >-
  Skill experta y robusta del CRAFT de escritura persuasiva y narrativa —
  técnicas, frameworks, storytelling, voz y edición — al estado del arte 2026.
  Úsala para escribir, estructurar, afinar o auditar cualquier texto que deba
  persuadir, vender, contar o mover a la acción. Cubre fundamentos + proceso
  (research/voice-of-customer, big idea, claridad>ingenio), frameworks de copy
  (AIDA, PAS, PASTOR, BAB, FAB, 4 Ps, QUEST — y cómo elegir por nivel de
  consciencia de la audiencia), headlines/hooks/leads (Ogilvy, Caples, las 4 U's,
  fórmulas, subject lines), storytelling y narrativa (StoryBrand SB7 cliente=héroe,
  Hero's Journey, before-after-bridge, brand narrative, casos como historia),
  persuasión y psicología (Cialdini 7 principios, sesgos, manejo de objeciones,
  urgencia ética), sistemas de voz y tono (4 dimensiones NN/g, tone-mapping,
  consistencia, craft bilingüe es-CL/en-US), craft y mecánica (ritmo/cadencia,
  retórica, power words, concisión, show-don't-tell, voz activa, edición), copy por
  formato (sales page/VSL, landing/hero, ad copy, email/secuencias, social,
  tagline/slogan, microcopy craft, CTA) y copywriting asistido por IA (anti
  AI-slop/homogenización, fidelidad de voz, barra de edición humana). Es la capa de
  CRAFT que las demás skills invocan: las otras deciden QUÉ decir, DÓNDE y SI
  convierte; esta decide CÓMO escribirlo para que impacte. Sinergia/hand-offs:
  gobernanza de microcopy/a11y/tokenización → greenhouse-ux-writing
  (repo: greenhouse-ux-content-accessibility) + src/lib/copy; qué convierte + A/B
  testing → growth-marketing-cro; arquitectura de mensaje/canal → digital-marketing;
  SEO/AEO/GEO → seo-aeo; doctrina de marca/voz → efeonce-agency + docs/context/05;
  plantillas/entrega de email → greenhouse-email; tipografía → typography-design.
  Incluye overlay Efeonce con router de speaker: voz institucional Efeonce ("7
  creencias contrarias", "Empower your Growth") y voz autoral de Julio Reyes para
  piezas firmadas, Marketing con Manzanitas y thought leadership personal, más el
  método de authoring agentic con autor humano responsable. Triggers:
  "copywriting", "copy", "redacción", "redactar",
  "escribir texto", "headline", "titular", "gancho", "hook", "lead", "storytelling",
  "narrativa", "storybrand", "AIDA", "PAS", "PASTOR", "framework de copy", "value
  proposition", "propuesta de valor", "tagline", "slogan", "eslogan", "sales page",
  "carta de ventas", "VSL", "email copy", "subject line", "asunto", "CTA", "llamado
  a la acción", "voz de marca", "tono", "tone of voice", "persuasión", "objeciones",
  "power words", "swipe file", "editar copy", "reescribir", "AI slop", "copy con IA",
  "Julio Reyes", "voz de Julio", "mi brand voice", "Marketing con Manzanitas",
  "con manzanitas", "artículo firmado", "authoring agentic", "autoría con IA".
user-invocable: true
argument-hint: "[qué escribir/afinar o pregunta de craft — ej: 'headline para /aeo-2', 'la carta de ventas del grader', 'storytelling de la marca', 'auditar este copy']"
---

# Copywriting — el craft de escribir para persuadir y narrar (2026)

> **Qué es esto.** Una skill de dos manos: **(1) conocimiento experto** del craft de
> escritura persuasiva y narrativa (frameworks, headlines, storytelling, persuasión,
> voz, mecánica) al estado del arte 2026, y **(2) capacidad de ejecución** (escribir,
> estructurar y editar copy real: headlines, sales pages, emails, taglines, narrativa
> de marca). No es teoría: **research antes de escribir, una gran idea, y edita sin
> piedad.**

> **La distinción de una frase.** Las otras skills deciden **QUÉ decir, DÓNDE y SI
> convierte**; **Copywriting decide CÓMO escribirlo para que impacte.** Es la capa de
> *craft verbal* que Growth, Digital Marketing, UX-writing y SEO invocan. Ver §6.

> **Sello de frescura.** Núcleo verificado **as-of 2026-07**. El **craft es estable**
> (Ogilvy, Caples, Schwartz, Cialdini siguen vigentes); lo **volátil es la capa de IA**
> (tells de AI-slop, tooling, "Great Bifurcation"). Antes de afirmar algo volátil,
> reverifica con WebSearch/WebFetch. Volatilidad por tema en `SOURCES.md`.

---

## 0. Cómo se usa esta skill (orden obligatorio)

`research → big idea → framework → draft → craft/edit → voz`

1. **Research primero (voice of customer).** El copy no se inventa: se **descubre** en
   las palabras del cliente (reviews, entrevistas, tickets, foros). La especificidad —
   la única ventaja que la IA no puede fabricar — sale de ahí. Nunca escribas a ciegas.
2. **Una gran idea (the big idea) / "one thing".** Cada pieza gira alrededor de UNA
   idea/promesa dominante. Si dice todo, no dice nada.
3. **Elige el framework por nivel de consciencia.** AIDA/QUEST para audiencia fría/no
   consciente; BAB/FAB para solution-aware; PAS/4 Ps para warm. El error clásico es usar
   AIDA cuando tocaba BAB (`02`). Hibrida (PAS para el hook, FAB para el cuerpo).
4. **Carga solo el módulo que aplica.** Esta skill es un router (mapa en §3).
5. **Draftea rápido, edita despacio.** El primer borrador es para existir; el craft
   ocurre en la edición (ritmo, concisión, power words, cortar — `07`).
6. **Voz consistente.** Antes de redactar, resuelve `author + surface + speaker`. Copy
   institucional usa Efeonce; copy firmado/hablado por Julio usa su sistema autoral;
   thought leadership firmado puede combinar ambos con atribución visible. Router en
   `efeonce/JULIO_REYES_VOICE_SYSTEM.md`; voz institucional en `efeonce/EFEONCE_VOICE_SYSTEM.md`.
7. **Ética > manipulación.** Persuasión con claims verdaderos y en el momento correcto
   (`05`). Scarcity falsa, prueba sembrada, autoridad fabricada = manipulación (`ANTIPATTERNS`).

---

## 1. Modelo mental: claridad primero, luego persuasión, luego arte

```
┌──────────────────────────────────────────────────────────────┐
│  1. CLARIDAD   ¿se entiende? (el 80% del trabajo)             │
│     specificity · one idea · sin jerga · para UNA persona     │
├──────────────────────────────────────────────────────────────┤
│  2. PERSUASIÓN ¿mueve a actuar?                               │
│     framework · beneficio>feature · prueba>hype · objeciones  │
├──────────────────────────────────────────────────────────────┤
│  3. ARTE       ¿se siente bien y suena a marca?              │
│     ritmo · retórica · voz · una historia                     │
└──────────────────────────────────────────────────────────────┘
        Nunca el 3 antes del 1. "Clever" que no es "clear" no vende.
```

**Tesis 2026:**
- **"The Great Bifurcation".** El copy commodity (descripciones, ad copy genérico) se
  colapsó a costo cero por IA; el copy de alto riesgo (VSL, arquitectura de sales pages,
  secuencias de lanzamiento, narrativa de marca) vale **más** que nunca. Esta skill
  apunta al tier que importa (`08`, `09`).
- **La especificidad es la ventaja no-replicable.** Lo que corta el AI-slop son datos,
  nombres y las **palabras exactas del cliente** — que solo se ganan hablando con gente
  real, no generando.
- **El headline hace el 80% del trabajo.** 5× más gente lee el headline que el cuerpo.
  Si el headline no aterriza, perdiste antes de la primera línea (`03`).
- **La IA homogeniza.** Todos usando los mismos modelos convergen a un centro predecible;
  las voces de marca se difuminan. El diferencial es voz + edición humana + especificidad
  (`09`). El 69% de los lectores *siente* cuando falta profundidad humana.
- **Claridad > ingenio, siempre.** El "queremos leer palabras reales otra vez" de 2026 es
  una reacción al slop. Concisión, honestidad, ritmo humano.

---

## 2. Intake (correr antes de escribir)

| # | Pregunta | Por qué cambia el copy |
|---|----------|------------------------|
| 1 | **¿Objetivo de la pieza?** clic / lead / venta / suscripción / recordar | Define framework, largo y CTA. |
| 2 | **¿Quién la lee?** un lector específico (no "el público") | Se escribe para UNA persona; su lenguaje literal manda. |
| 3 | **¿Nivel de consciencia?** no consciente / problem-aware / solution-aware / product-aware / most-aware (Schwartz) | Determina el framework y cuánta educación vs urgencia (`02`). |
| 4 | **¿Qué gran idea / promesa?** | Sin one thing, la pieza se dispersa. |
| 5 | **¿Qué prueba tienes?** datos, casos, testimonios, autoridad | La prueba reemplaza al hype (`05`). |
| 6 | **¿Superficie/formato?** headline / landing / email / ad / tagline / VSL / microcopy | Cambia el módulo y el craft (`08`). |
| 7 | **¿Voz/tono?** ¿marca? ¿contexto emocional del lector? | La voz es fija; el tono flexiona (`06`; Efeonce → overlay). |
| 8 | **¿Research disponible?** ¿voz de cliente real? | Sin ella, marca el copy como *hipótesis* a validar. |

**Salida:** lectura del caso + framework elegido + el draft + notas de edición. Nunca
entregues el primer borrador como final.

---

## 3. Mapa de módulos (load-on-demand)

| Si el trabajo es… | Carga |
|---|---|
| Fundamentos, research/voice-of-customer, big idea, proceso, claridad, especificidad | `modules/01_FOUNDATIONS_PROCESS.md` |
| Elegir/aplicar un **framework** (AIDA, PAS, PASTOR, BAB, FAB, 4 Ps, QUEST) por nivel de consciencia | `modules/02_COPY_FRAMEWORKS.md` |
| **Headlines, hooks, leads, subject lines** (Ogilvy/Caples, 4 U's, fórmulas) | `modules/03_HEADLINES_HOOKS_LEADS.md` ⭐ |
| **Storytelling y narrativa** (StoryBrand SB7, Hero's Journey, BAB, brand narrative, casos) | `modules/04_STORYTELLING_NARRATIVE.md` ⭐ |
| **Persuasión y psicología** (Cialdini 7, sesgos, objeciones, prueba social verbal, urgencia ética) | `modules/05_PERSUASION_PSYCHOLOGY.md` |
| **Voz y tono** (4 dimensiones NN/g, tone-mapping, consistencia, bilingüe es-CL/en-US) | `modules/06_VOICE_TONE_SYSTEMS.md` |
| **Craft y mecánica** (ritmo, retórica, power words, concisión, show-don't-tell, edición) | `modules/07_CRAFT_MECHANICS.md` |
| **Copy por formato** (sales page/VSL, landing, ad, email, social, tagline, microcopy, CTA) | `modules/08_COPY_BY_FORMAT.md` |
| **Copywriting con IA** (draft/variantes/edición, anti AI-slop, fidelidad de voz, prompting) | `modules/09_AI_ASSISTED_COPY.md` |
| **Artículo firmado con apoyo agentic** (autoridad humana, captura de voz, reescritura, auditoría, CTA y disclosure) | `efeonce/AGENTIC_BLOGPOST_AUTHORING.md` + sistema de voz del autor |
| Qué **NO** hacer (AI-slop, feature-dumping, jerga, hype-sin-prueba, clever>clear, scarcity falsa) | `ANTIPATTERNS.md` |
| Vocabulario (AIDA, lead, kicker, deck, tagline vs slogan, VSL, big idea, swipe file…) | `GLOSSARY.md` |
| El canon + fuentes + qué reverificar | `SOURCES.md` |
| **Caso Efeonce/Greenhouse/Julio**: router de speaker, voz institucional, voz autoral, boundary, copy en repo, bilingüe | `efeonce/` (empezar por `EFEONCE_OVERLAY.md`) |
| Artefactos listos | `templates/` (copy brief, voice guide, headline bank, sales page outline, SB7 brandscript, email sequence, messaging framework, objection map, edit checklist, swipe file) |

---

## 4. Diagnóstico: nivel de consciencia (Eugene Schwartz)

La decisión #1 antes de escribir. Determina el framework, el largo y el ángulo:

| Nivel | El lector… | Empieza el copy por… | Framework típico |
|---|---|---|---|
| **Unaware** | no sabe que tiene el problema | historia/insight que despierta el problema | AIDA, storytelling |
| **Problem-aware** | siente el dolor, no conoce soluciones | agitar el problema, empatía | PAS, PASTOR |
| **Solution-aware** | conoce soluciones, no la tuya | contraste/transformación, mecanismo único | BAB, FAB |
| **Product-aware** | te conoce, duda | diferenciación, prueba, objeciones | FAB, 4 Ps |
| **Most-aware** | listo, solo necesita el empujón | oferta + CTA directo | 4 Ps, oferta directa |

**Regla:** el copy frío necesita educación antes que persuasión; el caliente, oferta y
urgencia. Usar el framework equivocado para el nivel es el error #1 (`02`).

---

## 5. Herramientas (esta skill ejecuta, no solo asesora)

- **WebSearch / WebFetch** — voice-of-customer real (reviews, foros, testimonios), swipe
  de referencias vivas, frescura de tendencias/IA. Cita fuente + `as-of` en datos.
- **Generación de artefactos** — headlines, sales page, secuencia de email, tagline,
  brandscript SB7, guía de voz, checklist de edición. Plantillas en `templates/`.
- **Skills del repo para *ubicar* el copy:** microcopy de producto → **`greenhouse-ux-writing`**
  (repo: `greenhouse-ux-content-accessibility`, Codex) + `src/lib/copy/`; email →
  `greenhouse-email`; landing pública → `efeonce-public-site-wordpress`. Esta skill
  **craftea las palabras**; ellas las **gobiernan y ubican**.

**Regla de honestidad:** si el copy se basa en un beneficio/dato sin prueba, márcalo como
*claim a verificar*, no lo presentes como hecho. Prueba > hype, siempre.

---

## 6. Sinergia y boundary (la costura con las skills de escritura)

Copywriting es el **craft**; las vecinas gobiernan/deciden. Detalle + precedencia en
`efeonce/COPYWRITING_BOUNDARY.md`.

| Terreno | Copywriting (esta skill) | Hand-off a |
|---|---|---|
| **Microcopy de UI** | que el label/CTA sea claro, con voz y persuasivo | ubicación/a11y/tokenización es-CL → **`greenhouse-ux-writing`** / `greenhouse-ux-content-accessibility` + `src/lib/copy/` |
| **Conversión** | escribir bien headline/CTA/value-prop | qué ángulo convierte + A/B testing → **`growth-marketing-cro`** |
| **Canal / campaña** | craftear el copy de cada pieza | arquitectura de mensaje/canal + distribución → **`digital-marketing`** |
| **Contenido para búsqueda** | el craft del artículo | táctica SEO/AEO/GEO/schema → **`seo-aeo`** |
| **Marca / voz** | *aplicar y extender* la voz en el craft | doctrina de marca/voz/posicionamiento → **`efeonce-agency`** + `docs/context/05_voz-tono-estilo.md` |
| **Email** | el copy del email | plantillas/entrega runtime → **`greenhouse-email`** |

**Regla de oro:** si la pregunta es *cómo redactar/estructurar/afinar las palabras* → es
esta skill. Si es *dónde vive el texto, si convierte, en qué canal, o la doctrina de marca*
→ es la skill dueña. Copywriting craftea; las otras gobiernan. Cuando cruza, **nómbralo y
encadena**.

---

## 7. Voz, idioma y entrega

- **Idioma:** por defecto **es-CL neutro, tuteo** (puedes/quieres/dime), **sin voseo**
  (nunca podés/querés). Todo ejemplo de craft nace en es-CL salvo pedido en inglés. Para
  clientes Globe internacionales, transcreación es-CL/en-US (no traducción literal) → `06`.
- **Entrega:** el copy + una nota de *por qué* (qué framework, qué nivel de consciencia,
  qué se editó). No entregues palabras sin el pensamiento detrás.
- **Router de voz:** copy institucional, producto, UI, propuestas y piezas sin byline personal
  usan Efeonce (`efeonce/EFEONCE_VOICE_SYSTEM.md`). Piezas firmadas o habladas por Julio usan
  su voz (`efeonce/JULIO_REYES_VOICE_SYSTEM.md`). En híbridos, Julio narra y la doctrina se
  atribuye como `En Efeonce...`; nunca mezclar speakers de forma invisible.
- **Running motif personal:** `con manzanitas` / `te lo explico con manitas` pertenece a Julio;
  no usarlo en copy institucional ni en textos de otros autores. Cuando se activa en copy visible,
  lleva exactamente `🍏🍏🍏` antes de la puntuación. El wording final de superficies de producto
  se valida con la skill de UX-writing.

---

## 8. Principios cross-cutting

1. **Claridad > ingenio.** Si es "clever" pero no "clear", reescríbelo. El lector escanea.
2. **Escribe para una persona.** No "el público": UNA persona con un dolor y su lenguaje.
3. **Una gran idea por pieza.** El one thing. Todo lo demás la sirve o se corta.
4. **Especificidad vende.** Números, nombres, detalles concretos > adjetivos vagos.
5. **Muestra, no digas.** "Show don't tell": escenas y pruebas, no adjetivos de autoelogio.
6. **Prueba > hype.** Cada claim con evidencia. El hype sin prueba quema confianza.
7. **Edita sin piedad.** Cada palabra se gana su lugar. El craft ocurre al cortar.
8. **Voz consistente, tono flexible.** La voz es la identidad (fija); el tono se adapta al
   contexto/emoción del lector.
9. **Ética > manipulación.** Persuasión con verdad y en el momento correcto. Nada de dark
   patterns verbales (`ANTIPATTERNS`).
10. **Humano al mando de la IA.** Genera con IA, decide/edita con humanos; guarda la voz y
    verifica cada dato (`09`).
