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

## Clientes de otro mercado hispano (p. ej. México): localizar, no neutralizar

> As-of 2026-09-19. Caso fuente: tres piezas de campaña de un fabricante mexicano de pintura que el cliente
> devolvió porque «no suena natural» ni «adaptado a México». Canon del cliente: skill
> `berel-content-production`, módulo 04 (§Adaptación a México).

El default es-CL neutro es para Efeonce. El copy de un cliente de otro mercado se escribe en la **variedad
estándar de ese país**: la que publicaría una marca nacional seria, sin coloquialismos ni jerga regional. Para
México, español mexicano estándar. Que el cliente diga «no suena natural» es un hallazgo de craft, no de
gusto: se corrige con una pasada de localización y una lectura con ojos del mercado.

Patrones que delatan un texto no localizado:

- **El «nosotros» es la marca**, no la nacionalidad. Nada de «los mexicanos» como sujeto colectivo.
- **No explicarle su país al lector.** Un mexicano no necesita que le cuenten qué hay en una casa mexicana.
  Mostrar objetos y escenas; variarlos entre piezas en lugar de repetir la misma postal.
- **Nada de jerga traducida ni de registro de agencia:** «profundidad», «acento», «contraste fresco»,
  «sumar una mirada» y similares se cambian por lo que la persona haría o vería.
- **Una sola lista de tres por sección.** La tríada como muletilla delata texto generado.
- **Cada fórmula vive en una sola pieza del conjunto.** Si una pieza abre con «En <Marca> presentamos», las
  demás abren distinto.
- **Menos posesivos** («nuestro», «nuestra»): cansan y suenan a folleto.
- **Convenciones del país:** decimal con punto en México; léxico local cuando lo hay (recámara, no dormitorio).
- **El léxico del cliente manda.** Si la marca usa un anglicismo en sus propios materiales («premium»), se usa;
  la preferencia del redactor no lo corrige.

Verificación: antes de entregar, una lectura desde el mercado (el lente «lector del mercado» de
`../../seo-aeo/references/agentic-editorial-eeat.md` §10). Si se usa un agente para simularla, sus hallazgos se
verifican antes de aplicarlos.

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
- **NUNCA** entregar copy de un cliente de otro mercado hispano en es-CL neutro: se localiza a la variedad
  estándar de su país, sin coloquialismos.
- **NUNCA** spanglish/calco en en-US.
- **SIEMPRE** verificar el efecto (voz alta) en cada idioma; ubicar en el locale correcto de `src/lib/copy/`.
