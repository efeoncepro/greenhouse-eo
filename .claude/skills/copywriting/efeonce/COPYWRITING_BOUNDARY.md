# Boundary: Copywriting vs skills vecinas (sinergia)

> Copywriting es el **craft de las palabras**; las vecinas **gobiernan, deciden y ubican**. Regla
> de una frase: **las otras deciden QUÉ decir, DÓNDE y SI convierte; Copywriting decide CÓMO
> escribirlo para que impacte.**

## La costura con las skills de escritura/marketing

| Terreno compartido | Copywriting (esta skill) posee | La skill dueña posee |
|---|---|---|
| **Microcopy de UI** (labels, botones, errores, empty states) | el craft: que sea claro, humano, con voz y persuasivo | ubicación, a11y, jerarquía, tokenización es-CL, review → **`greenhouse-ux-writing`** (global) / **`greenhouse-ux-content-accessibility`** (Codex) + `src/lib/copy/` |
| **Conversión** | escribir bien headline/CTA/value-prop/hero | qué ángulo convierte, message-market fit, A/B testing → **`growth-marketing-cro`** |
| **Canal / campaña** | craftear el copy de cada pieza | arquitectura de mensaje, canal-mix, distribución, calendario → **`digital-marketing`** |
| **Contenido para búsqueda** | el craft del artículo/página | táctica SEO/AEO/GEO/schema/entidad → **`seo-aeo`** |
| **Marca / voz** | aplicar y extender la voz en el craft | doctrina de voz/marca/posicionamiento → **`efeonce-agency`** + `docs/context/05_voz-tono-estilo.md` |
| **Email** | el copy del email/secuencia | plantillas, registro, entrega, deliverability → **`greenhouse-email`** + `src/lib/email/**` |
| **Tipografía** | — | peso/variante/legibilidad del texto → **`typography-design`** |

## Regla de precedencia

- Pregunta sobre **cómo redactar/estructurar/afinar/editar las palabras** para que persuadan o
  narren → **es esta skill**.
- Pregunta sobre **dónde vive el texto, si convierte, en qué canal, cómo se tokeniza, o la
  doctrina de marca** → **es la skill dueña**.
- En medio (siempre, en escritura): **nómbralo y encadena**. Craftea aquí → gobierna/ubica allá.

## Nota sobre la skill de UX writing (precisión de runtime)

- **`greenhouse-ux-writing`** es la skill **canónica de UX writing** que usa el equipo. Vive
  **global** (`~/.claude/skills/greenhouse-ux-writing/skill.md`), no repo-local; CLAUDE.md la
  invoca para todo texto visible de producto.
- **`greenhouse-ux-content-accessibility`** es una variante **repo-local (Codex)** enfocada en
  review de UX writing + accesibilidad + calidad de interacción.
- Ambas gobiernan el **microcopy de producto**; esta skill **craftea las palabras** que ellas
  ubican y tokenizan. No dupliques su gobernanza; referéncialas.

## Patrón de encadenamiento (ejemplos)

- "Escríbeme el hero de /aeo-2" → **copywriting** craftea el headline/subhead/CTA →
  `growth-marketing-cro` valida que convierta → `greenhouse-ux-writing`/`digital-marketing`
  lo ubican/publican.
- "El label de este botón suena genérico" → **copywriting** propone el wording con voz →
  `greenhouse-ux-writing` decide ubicación/a11y y lo tokeniza en `src/lib/copy/`.
- "Necesito la narrativa de marca" → **copywriting** (SB7/7 creencias) craftea → `efeonce-agency`
  valida doctrina/posicionamiento.
