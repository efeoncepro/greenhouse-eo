# Marca y voz Efeonce en campañas

> Expresión de marca en marketing digital. La *doctrina* de marca es de `efeonce-agency`; el
> *wording/voz final* de `greenhouse-ux-content-accessibility` (Codex) + `docs/context/05`.
> Aquí: cómo aterrizar la marca en campañas usando los assets reales.

## SSOT de marca

- **`src/config/efeonce-brand.ts`** — fuente única de datos canónicos de marca (URL, eslogan,
  dirección, identidad institucional) reutilizada en PDFs/emails/headers/footers. La identidad
  de entidad legal es dinámica (`getOperatingEntityIdentity()`); las constantes son fallback/seed.
  **NUNCA** hardcodees estos valores en una campaña — impórtalos del SSOT.
- **Arquitectura de marca Efeonce vs Greenhouse:** respeta la separación (Efeonce = agencia/marca
  madre; Greenhouse = plataforma). No mezcles en copy de campaña. Doctrina → `efeonce-agency`.

## Ilustraciones propietarias

- `public/images/illustrations/characters/greenhouse-*.png` son **obra del equipo creativo de
  Efeonce**, NO stock ni Vuexy. Úsalas como distinctive brand asset (`../modules/01`), no las
  reemplaces por stock genérico. (Cross-agente en `DESIGN.md` + `efeonce-brand.ts`.)

## Voz y tono en campañas

- **es-CL neutro, tuteo, sin voseo.** Términos técnicos en inglés cuando son estándar.
- Adapta el tono al canal (LinkedIn ≠ TikTok) manteniendo la idea central consistente (`../modules/01`).
- El **wording final** de superficies visibles se valida con `greenhouse-ux-content-accessibility`
  (Codex) + `docs/context/05_voz-tono-estilo.md`. Esta skill decide el **ángulo/mensaje**.

## Distinctive brand assets (para memoria de marca)

Al planear campañas, repite los assets reconocibles de Efeonce (logo, color, tipografía,
ilustraciones, eslogan) para construir memoria (`../modules/01 §3`). Los **tokens de diseño** y
la implementación visual son de las skills de diseño (`modern-ui`, design system); los **logos de
medios de pago** de `greenhouse-digital-brand-asset-designer` (no para marca general).

## Contexto de negocio para el mensaje

- `docs/context/09_marca-agencia.md` (marca), `05_voz-tono-estilo.md` (voz),
  `13_icp-buyer-personas-jtbd.md` (a quién le hablas), `02_gtm.md` (GTM),
  `01_quienes-somos.md`. Léelos antes de definir ángulos de campaña.

## Reglas duras

- **NUNCA** hardcodear datos de marca (importar de `efeonce-brand.ts`).
- **NUNCA** usar stock en lugar de las ilustraciones propietarias donde corresponda marca Efeonce.
- **NUNCA** mezclar identidad Efeonce vs Greenhouse en copy de campaña.
- El ángulo/mensaje es de esta skill; el wording final, es-CL y a11y son de la skill de UX-writing.
