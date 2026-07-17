# Overlay Efeonce / Greenhouse — índice

> Aterriza el craft portable de copywriting en la marca y el runtime reales de Efeonce/Greenhouse.
> Los conceptos genéricos viven en `../modules/`; aquí van la voz, el boundary y los paths reales
> verificados. **Reverifica el estado en el repo** (docs y código cambian).

## Cuándo usar este overlay

Siempre que escribas copy **para Efeonce/Greenhouse o para Julio Reyes**: primero resuelve quién
habla; luego aplica la voz correcta, ubica el copy en su runtime y respeta las skills vecinas.

## Router de voz obligatorio

- **Julio:** piezas con byline/speaker Julio, Marketing con Manzanitas, LinkedIn, keynote,
  newsletter, podcast o thought leadership personal → `JULIO_REYES_VOICE_SYSTEM.md`.
- **Efeonce:** landings, páginas institucionales, UI, producto, emails del sistema, propuestas,
  políticas, documentación y artículos sin byline personal → `EFEONCE_VOICE_SYSTEM.md`.
- **Híbrido firmado por Julio:** Julio narra; hechos se atribuyen; la doctrina organizacional se
  marca como `En Efeonce...`. Nunca cambiar de speaker de forma invisible.
- **Otra persona:** no usar a Julio como voz humana genérica.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `EFEONCE_VOICE_SYSTEM.md` | La voz Efeonce: 7 creencias contrarias (ADN narrativo) + personalidad + tono por contexto + slogan "Empower your Growth". **El más load-bearing.** |
| `JULIO_REYES_VOICE_SYSTEM.md` | Voz autoral de Julio, corpus, firma narrativa, running motifs y router Julio/Efeonce. Obligatorio para piezas firmadas o habladas por él. |
| `COPYWRITING_BOUNDARY.md` | Sinergia + regla de precedencia vs UX-writing, growth-cro, digital-marketing, seo-aeo, efeonce-agency, email. |
| `COPY_IN_THE_REPO.md` | `src/lib/copy/` SSOT + nomenclature + email copy; cómo el craft aterriza en runtime (craftear → tokenizar). |
| `BILINGUAL_CRAFT.md` | Transcreación es-CL/en-US para clientes Globe internacionales. |

## Regla de una frase (repetida por seguridad)

> Las otras skills deciden **QUÉ decir, DÓNDE y SI convierte**; Copywriting decide **CÓMO
> escribirlo para que impacte** — después de resolver si habla Julio o Efeonce.

## Fuentes de verdad de voz

### Efeonce institucional

- **`docs/context/05_voz-tono-estilo.md`** — la doctrina canónica de voz/tono/estilo (7 creencias
  + personalidad + tono por contexto + microcopy aplicado). **Punto de partida obligatorio.**
- `docs/context/09_marca-agencia.md` (marca), `13_icp-buyer-personas-jtbd.md` (audiencia/VoC),
  `06_glosario-metricas.md` (naming/términos), `01_quienes-somos.md`, `02_gtm.md`.
- `src/config/efeonce-brand.ts` — SSOT de datos de marca + slogan **"Empower your Growth"**.

### Julio Reyes

- `JULIO_REYES_VOICE_SYSTEM.md` — contrato autoral y router vigente.
- Corpus publicado de Julio (`author_id=1`) registrado en ese archivo.
- Instrucciones directas de Julio prevalecen para una pieza concreta; no autorizan trasladar su voz a otras
  superficies o autores.

## Runtime donde vive el copy

- `src/lib/copy/**` (SSOT microcopy es-CL/en-US), `src/config/greenhouse-nomenclature.ts` (naming
  de producto), `src/emails/**` + `src/lib/email/template-copy.ts` (copy de email). Detalle en
  `COPY_IN_THE_REPO.md`.

## Skills de escritura del ecosistema (dónde encadenar)

- **`greenhouse-ux-writing`** — la skill **canónica de UX writing** (global, Claude). Gobernanza de
  microcopy, ubicación, a11y, tokenización es-CL. La invoca CLAUDE.md.
- **`greenhouse-ux-content-accessibility`** — variante repo-local (Codex) para review UX+a11y.
- `growth-marketing-cro` / `digital-marketing` / `seo-aeo` / `efeonce-agency` / `greenhouse-email`
  — ver `COPYWRITING_BOUNDARY.md`.
