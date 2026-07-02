# 08 · Copy por formato

> El craft es el mismo; su **aplicación cambia por superficie**. Aquí, cómo adapta cada formato.
> La *ubicación/gobernanza* la deciden las skills dueñas (UX-writing, email, public-site); el
> **craft de las palabras** es de aquí.

## 1. Sales page / carta de ventas (long-form)

- **Cuándo long-form:** ticket alto, decisión considerada, audiencia que necesita convencerse.
  **Match the length to the price** — más inversión, más copy (para responder todas las objeciones).
- **Arquitectura:** headline + lead (`03`) → problema/agitación → mecanismo único → prueba
  (casos/datos/testimonios, `05`) → oferta → objeciones/garantía → CTA + urgencia real → PS.
- Larga **no** significa relleno: cada sección hace un trabajo (una objeción, una prueba, un paso).

## 2. VSL (Video Sales Letter)

- Misma arquitectura que la carta, en video: **hook → problem → agitation → mechanism → proof →
  offer → close.** La producción cambió (talking-head + motion graphics); **el guion debajo es el
  mismo craft**.
- El **hook** de los primeros segundos es todo (`03`). Guion, no improvisación.
- 2026 ("Great Bifurcation"): VSL y arquitectura de sales pages son el tier de copy que **más
  vale** — precisamente porque la IA no lo hace bien solo.

## 3. Landing / hero

- **Above the fold:** headline = propuesta de valor clara + subhead + CTA + prueba. El lector
  decide en segundos.
- Un objetivo por página; el copy sirve a esa conversión. La *optimización de conversión* (layout,
  test) es de `growth-marketing-cro/03`; aquí el **craft** del hero/secciones.

## 4. Ad copy (paid)

- Espacio mínimo, trabajo máximo: hook + beneficio + CTA. PAS o BAB comprimidos (`02`).
- **Creative-message match:** el copy del ad promete lo que la landing cumple (sino, CAC alto y
  desconfianza). La estrategia de canal/creatividad es de `digital-marketing/03,05`; aquí las palabras.

## 5. Email (campañas y secuencias)

- **Subject + preheader** deciden la apertura (`03`). Un objetivo + un CTA por email.
- **Secuencia (arco de 5–7 emails):** 1) valor inmediato + establece voz → 2) identifica y agita
  el problema (lenguaje específico: "esta persona me entiende") → 3) prueba/caso → 4–5) oferta +
  objeciones → 6–7) urgencia/cierre.
- El **copy** es de aquí; la **plantilla/entrega y deliverability** de `greenhouse-email` +
  `growth-marketing-cro/06`.

## 6. Social / posts

- Hook en la primera línea (el feed corta rápido). Nativo por plataforma, con voz.
- El craft del post es de aquí; la estrategia de plataforma/calendario de `digital-marketing/04`.

## 7. Tagline & slogan

- **Tagline:** frase duradera de identidad de marca (ej. Efeonce **"Empower your Growth"**).
  Craft: corta, memorable, verdadera, propietaria, con ritmo. Rara vez sale a la primera —
  genera decenas.
- **Slogan:** frase de campaña, más efímera, atada a un objetivo/momento.
- Técnicas: tricolon, antítesis, aliteración (`07`), beneficio comprimido, doble lectura honesta.

## 8. Microcopy craft (labels, botones, errores, empty states)

- El **craft** de que un label/CTA/error sea claro, humano y con voz es de esta skill. Un botón
  "Ver mi diagnóstico" (valor) > "Enviar" (mecánico).
- La **gobernanza, ubicación, a11y y tokenización es-CL** son de **`greenhouse-ux-writing`**
  (+ `src/lib/copy/`). Patrón: **craftea la palabra aquí → tokenízala/ubícala allá**. No
  hardcodees strings sueltos (`efeonce/COPY_IN_THE_REPO.md`).
- Errores con voz: empatía + qué pasó + cómo resolver (tono modulado por frustración, `06`).

## 9. CTA (el craft del llamado a la acción)

- **Verbo + valor + (momento).** "Mira cómo te ve la IA" > "Enviar". Primera persona cuando
  aplica ("Quiero mi diagnóstico").
- Reduce ansiedad al lado ("gratis, sin tarjeta, 2 min"). La *ubicación/test del CTA* es de
  `growth-marketing-cro`; el **wording** es de aquí.

## Checklist de salida

- [ ] Formato correcto para el objetivo/ticket (long-form si el precio lo pide).
- [ ] Arquitectura del formato respetada (VSL: hook→…→close; email: arco 5–7).
- [ ] Creative-message match (ad ↔ landing).
- [ ] Microcopy: crafteado aquí, tokenizado vía UX-writing; nada hardcodeado.
- [ ] CTA con verbo + valor; ansiedad reducida al lado.

## Cross-links

- Framework → `02`; headline/hook → `03`; narrativa (VSL) → `04`; persuasión → `05`; voz → `06`; craft → `07`
- Conversión/layout/test de landing y CTA → `growth-marketing-cro`; canal/creatividad → `digital-marketing`
- Email runtime → `greenhouse-email`; microcopy governance → `greenhouse-ux-writing` + `src/lib/copy/`
- Artefactos → `templates/sales-page-outline.md`, `templates/email-sequence-copy.md`
