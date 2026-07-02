# Overlay Efeonce / Greenhouse — índice

> Aterriza el craft portable de copywriting en la marca y el runtime reales de Efeonce/Greenhouse.
> Los conceptos genéricos viven en `../modules/`; aquí van la voz, el boundary y los paths reales
> verificados. **Reverifica el estado en el repo** (docs y código cambian).

## Cuándo usar este overlay

Siempre que escribas copy **para Efeonce/Greenhouse**: para que suene a la marca (no a copy
genérico), para saber dónde aterriza en el runtime, y para no pisar a las skills vecinas.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `EFEONCE_VOICE_SYSTEM.md` | La voz Efeonce: 7 creencias contrarias (ADN narrativo) + personalidad + tono por contexto + slogan "Empower your Growth". **El más load-bearing.** |
| `COPYWRITING_BOUNDARY.md` | Sinergia + regla de precedencia vs UX-writing, growth-cro, digital-marketing, seo-aeo, efeonce-agency, email. |
| `COPY_IN_THE_REPO.md` | `src/lib/copy/` SSOT + nomenclature + email copy; cómo el craft aterriza en runtime (craftear → tokenizar). |
| `BILINGUAL_CRAFT.md` | Transcreación es-CL/en-US para clientes Globe internacionales. |

## Regla de una frase (repetida por seguridad)

> Las otras skills deciden **QUÉ decir, DÓNDE y SI convierte**; Copywriting decide **CÓMO
> escribirlo para que impacte** — encarnando la voz Efeonce.

## Fuente de verdad de la voz (leer antes de escribir copy Efeonce)

- **`docs/context/05_voz-tono-estilo.md`** — la doctrina canónica de voz/tono/estilo (7 creencias
  + personalidad + tono por contexto + microcopy aplicado). **Punto de partida obligatorio.**
- `docs/context/09_marca-agencia.md` (marca), `13_icp-buyer-personas-jtbd.md` (audiencia/VoC),
  `06_glosario-metricas.md` (naming/términos), `01_quienes-somos.md`, `02_gtm.md`.
- `src/config/efeonce-brand.ts` — SSOT de datos de marca + slogan **"Empower your Growth"**.

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
