# Propuesta KSB Chile — Agencia de Marketing Digital 2027 (LIC-MKT-2026-001) — 2026-11-06

Borrador de la oferta técnica: 18 láminas compuestas con las recetas aprobadas, línea `growth`, tema oscuro, en usted,
más 5 insertos íntegros del brochure 360° aprobado. Expediente: `docs/commercial/tenders/ksb-chile-agencia-marketing-digital-2027/`.
Decisiones: [DECISIONES.md](DECISIONES.md).

Canvas (privado): https://claude.ai/artifact/SkxaJtPYQ9KvgjviQsGyEo

## Cómo se arma

1. `python3 ai-generations/2026-11-06_propuesta-ksb/build-intents.py`, desde la raíz. Escribe `intents/*.json` y
   `plan-compuesto.json` sobre los intents aprobados de Fiordo Austral (2026-11-05) y los ejemplos del catálogo.
2. `pnpm brand:deck-plan -- --plan ai-generations/2026-11-06_propuesta-ksb/plan-compuesto.json` → «✓ Plan válido (0 avisos)».
   `plan.json` es el plan completo de 21 recetas revisado con la sesión Brochure (incluye las dos pendientes).
3. `pnpm brand:compose -- --intent <intents/X.json> --out <out/X> --artifact-id X`, una vez por lámina. La portada va
   con `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs ai-generations/2026-11-05_propuesta-fiordo-austral/render-portada.ts <intent> <out> ai-generations/2026-11-05_propuesta-fiordo-austral/portada-dawn.css`
   (portada `dawn` sin pregunta, el método de Fiordo).
4. Se suben los PNG de `out/*/` y los insertos al canvas; cada lámina es una imagen a sangre.

## Ajustes fuera de las recetas

| Lámina | Ajuste | Por qué |
| --- | --- | --- |
| 01 portada | `dawn` sin pregunta (render-portada.ts + portada-dawn.css de Fiordo). Logo de KSB blanco bajado de ksb.com/es-cl (`assets/ksb-header-logo-transparent.svg` → `ksb-logo-blanco-1200.png`) | Norma: la portada de propuesta dice lo que es. El logo no vino con las bases |
| 07 canales | Retirada | `content-service-lanes` exige íconos de producto de HubSpot o Salesforce; los canales los muestra p40 |
| 07–08 | Insertos 360° p40 «Las justas» y p52 «Con evidencia» en usted (cuerpo y rótulo «LLEGA A QUIEN COMPRA»), color Voice | Julio: «Usarlas así» y «Todo de usted» (06/11) |
| 18–20 | Insertos 360° p34 Sky, p20 Berel, p62 ANAM, tal cual | Referencias como bloque, sin `decision-case` |
| 13 condiciones · 03/17/22 secciones | `decision-risk` y `section-classic` en claro | Recetas sólo claras, como en Fiordo |
| Voz | Par pregunta–respuesta sólo donde el lector pregunta; el resto, frase en dos tiempos | Lección de Fiordo (05/11) |

## Pendiente

- **16 equipo:** nombres de las 7 personas para los roles de las bases; `content-team` + CV en anexo A4.
- **21 certificaciones:** archivar badge de Google Partners (Google Ads) y ficha de Meta Business Partner; HubSpot Gold
  tiene carta.
- **23 económica:** montos en `[MONTO]` hasta el GO (martes 10/11) y el Cotizador V3.
- Logo de KSB en alta o del kit oficial, si KSB lo entrega.
- Diagnóstico (05): los hallazgos vienen de la revisión de fuentes públicas del 06/11; la agencia actual no se nombra.
