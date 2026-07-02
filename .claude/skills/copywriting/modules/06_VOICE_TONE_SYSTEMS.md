# 06 · Voz & Tono (sistemas)

> **Voz = identidad (fija). Tono = modulación por contexto (flexible).** Una marca tiene UNA voz
> y muchos tonos. Aquí se construye y se aplica el sistema — y se craftea bilingüe es-CL/en-US.

## 1. Voz vs tono (la distinción que casi todos confunden)

- **Voz** — la personalidad verbal constante de la marca. No cambia entre un error 404 y una
  landing. Es *quién es* la marca cuando habla.
- **Tono** — cómo esa voz se modula según el contexto y la **emoción del lector**. Un mensaje de
  error (usuario frustrado) y un mensaje de éxito (usuario feliz) tienen el mismo *voice*, distinto
  *tone*.

## 2. Las 4 dimensiones de tono (NN/g) — el mapa

Ubica la voz de la marca (y ajusta el tono por contexto) en cuatro ejes:

| Dimensión | Extremos |
|---|---|
| Humor | **Funny ←→ Serious** |
| Formalidad | **Formal ←→ Casual** |
| Respeto | **Respectful ←→ Irreverent** |
| Entusiasmo | **Enthusiastic ←→ Matter-of-fact** |

- La **voz** fija una posición base en cada eje; el **tono** se mueve dentro de un rango según el
  contexto. Ej.: una marca "casual, entusiasta" baja el entusiasmo en un mensaje de error (empatía),
  sin volverse formal.
- 2026: el brand voice chart ya no es solo para humanos — **aliméntalo al contexto del LLM** para
  no obtener la voz "promedio" (`09`).

## 3. Cómo construir una guía de voz (proceso)

1. **Define la personalidad** (3–4 adjetivos con antónimos: "cercano pero no informal",
   "experto pero no arrogante").
2. **Mapea las 4 dimensiones** (posición base + rango de tono).
3. **Documenta con ejemplos:** do/don't, vocabulario (palabras que usamos / evitamos), y el mismo
   mensaje en la voz vs fuera de la voz.
4. **Tone-mapping por contexto:** define el tono para situaciones clave (onboarding, error, éxito,
   venta, soporte, celebración).
Guía emitible en `templates/voice-tone-guide.md`.

## 4. Consistencia y registro

- **Consistencia:** la marca debe reconocerse en cualquier superficie. Voz inconsistente = marca
  difusa (`ANTIPATTERNS`).
- **Registro:** ajusta el nivel de lenguaje a la audiencia y canal (un C-level en LinkedIn ≠ un
  usuario en un tooltip) sin cambiar la identidad.
- **Tono por emoción del lector:** la regla más importante — lee la emoción del momento (frustrado,
  ansioso, curioso, orgulloso) y modula. Empatía antes que ingenio.

## 5. Craft bilingüe (es-CL / en-US) — transcreación, no traducción

Efeonce sirve clientes Globe internacionales: el copy vive en **es-CL** y **en-US**.
- **Transcrear, no traducir:** recrear el mensaje preservando intención, ritmo y efecto — no
  palabra por palabra. Un headline con juego de palabras en inglés casi nunca sobrevive literal.
- **es-CL:** tuteo neutro (puedes/quieres/dime), **sin voseo** (nunca podés/querés), sin modismos
  argentinos. Evita chilenismos salvo contexto de producto/país.
- **en-US:** natural, directo, sin "spanglish" ni calcos.
- Cada idioma se **craftea**, no se pasa por traductor. Detalle en `efeonce/BILINGUAL_CRAFT.md`.

## 6. La voz Efeonce (overlay)

La voz de Efeonce se ancla en las **"7 creencias contrarias"** (ADN narrativo) y una personalidad
constante — detalle y reglas en `efeonce/EFEONCE_VOICE_SYSTEM.md` + `docs/context/05_voz-tono-estilo.md`.
La *doctrina* de esa voz es de `efeonce-agency`; aquí la **crafteas** en copy real.

## Checklist de salida

- [ ] Voz (fija) y tono (por contexto) distinguidos, no mezclados.
- [ ] Ubicada en las 4 dimensiones; rango de tono definido.
- [ ] Tono modulado por la **emoción del lector** (empatía en error, energía en éxito).
- [ ] es-CL tuteo sin voseo; bilingüe transcreado, no traducido.
- [ ] Consistente y reconocible como la marca.

## Cross-links

- Aplicar la voz en cada formato → `08`; con IA (fidelidad de voz) → `09`
- Doctrina de voz/marca → `efeonce-agency` + `efeonce/EFEONCE_VOICE_SYSTEM.md`
- Gobernanza/a11y de microcopy de producto → `greenhouse-ux-writing` + `src/lib/copy/`
- Artefacto → `templates/voice-tone-guide.md`; errores (voseo, inconsistencia) → `ANTIPATTERNS.md`
