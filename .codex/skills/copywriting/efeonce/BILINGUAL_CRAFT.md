# Craft bilingüe (es-CL / en-US)

> Efeonce sirve clientes Globe internacionales; el copy vive en **es-CL** y **en-US**. La regla
> madre: **se transcrea, no se traduce.** Cada idioma se craftea, preservando intención, ritmo y
> efecto — no palabra por palabra.

## Transcreación, no traducción

- **Traducir** = pasar palabras de un idioma a otro. **Transcrear** = recrear el *mensaje y su
  efecto* en el otro idioma. Un headline con juego de palabras, un idiom o un ritmo específico
  casi nunca sobrevive literal.
- El copy de alto impacto (headline, tagline, hook, CTA) se **re-crafta** en cada idioma desde la
  big idea, no se traduce del original.
- Los datos/estructura se mantienen; el *wording* se recrea para sonar nativo.

## es-CL (el default)

- **Tuteo neutro**: puedes/quieres/dime. **Sin voseo** (nunca podés/querés/tenés/decime).
- **Sin modismos argentinos** (che, boludo, laburo…). Chilenismo operativo solo si es contexto de
  producto/país, nunca como muletilla.
- Español neutro latinoamericano, natural para el mercado chileno e internacional hispanohablante.
- Voz Efeonce: directa, con filo, cada frase con un trabajo (`EFEONCE_VOICE_SYSTEM.md`).

## en-US

- Natural y directo, no "spanglish" ni calco del español. Los idioms y el ritmo son propios del
  inglés.
- Mantén la personalidad Efeonce (arquitecto directo, honestidad incómoda, prueba) — la voz cruza
  idiomas aunque las palabras cambien.
- El tagline canónico ya es en inglés: **"Empower your Growth"** (`src/config/efeonce-brand.ts`).

## Reglas de craft bilingüe

- **Craftea la big idea una vez; escribe el copy dos veces** (uno por idioma), no traduzcas.
- **Verifica el efecto en cada idioma** leyendo en voz alta (`../modules/07`): ¿el hook engancha?
  ¿el CTA suena natural? ¿el chiste/ritmo funciona?
- **Runtime:** el copy es-CL/en-US se ubica en `src/lib/copy/dictionaries/{es-CL,en-US}/**` con la
  misma estructura de namespaces (`COPY_IN_THE_REPO.md`). El selector de locale de email está en
  `src/lib/email/template-copy.ts`.
- **Consistencia de voz cross-idioma:** la personalidad (7 creencias, tono por contexto) es la
  misma en ambos; solo cambia el idioma, no la marca.

## Reglas duras

- **NUNCA** traducir literal un headline/tagline/hook: transcrear.
- **NUNCA** voseo ni modismos argentinos en es-CL.
- **NUNCA** spanglish/calco en en-US.
- **SIEMPRE** verificar el efecto (voz alta) en cada idioma; ubicar en el locale correcto de `src/lib/copy/`.
