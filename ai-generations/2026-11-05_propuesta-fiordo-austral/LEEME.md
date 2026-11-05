# Propuesta Fiordo Austral — Implementación CRM HubSpot (Wherex 428823) — 2026-11-05

Deck de 20 láminas, línea `revenue-hubspot`, tema oscuro. Edición ofertada: **Sales Hub Professional** («Pro esbelto», decisión de Julio del 05/11).
Texto fuente: `docs/commercial/tenders/fiordo-austral-crm-428823/PROPUESTA-FIORDO-AUSTRAL-428823-PARA-CLAUDE-DESIGN.md`.

Canvas (privado): https://claude.ai/artifact/UFRkFSWCHXyPC1Cq57YQDr

## Cómo se arma

1. `python3 ai-generations/2026-11-05_propuesta-fiordo-austral/build-intents.py`, desde la raíz del repo. Escribe `intents/*.json` y `plan.json` sobre los intents aprobados de `2026-10-06_deck-hubspot` y `2026-10-20_propuesta-assetplan`.
2. `pnpm brand:deck-plan -- --plan ai-generations/2026-11-05_propuesta-fiordo-austral/plan.json` debe dar «✓ Plan válido (0 avisos)».
3. `pnpm brand:compose -- --intent <intents/X.json> --out <out/X>`, una vez por lámina.
4. Se suben los PNG de `out/*/` al canvas. Cada lámina es una imagen a sangre.

## Ajustes fuera de las recetas

| Lámina | Ajuste | Por qué |
| --- | --- | --- |
| 01 portada · 20 contraportada | Insignia HubSpot Solutions Partner Gold como capa: `assets/hubspot-spp-gold-badge-light.png` | La contraportada no acepta `partnerMark` sin `sloganBlock`, igual que en Assetplan. |
| Insignia | PNG derivado del SVG oficial `public/branding/partners/hubspot/solution-partner/badge-light-spp-hubspot.svg` con sharp, a 640 px, sin tocar el arte | El canvas le quita `<style>` a los SVG subidos y la insignia salía negra (Julio, 05/11). El README de la insignia permite derivar el raster. |
| 01 portada | Logo de Fiordo Austral bajado de su sitio, con autorización de Julio del 05/11: `assets/fiordo-austral-logo-web.png` (853 × 278, versión para oscuro) | No venía en el zip de la licitación. Falta conseguir uno en alta. |

## Pendiente

- **Lámina de inversión con montos** (`content-pricing-live`): falta componerla. En Assetplan se hizo con `render-pricing-real.ts`.
- **Antes de enviar:**
  - confirmar con HubSpot el waiver del onboarding y el precio de US$ 100;
  - volver a verificar el tier Gold;
  - conseguir el logo de Fiordo Austral en alta.
- **Sprocket 3D:** no se usa hasta tener autorización escrita.
- **Láminas a mano con tokens** (método «propuesta que se lee sin presentador»): resumen de la matriz de seguridad y cadena Zero Trust, si Julio las quiere.

## Lección

La primera versión del canvas se dibujó a mano con los componentes del design system y Julio la rechazó: «así no hacemos las portadas».

El deck de marca propia se **elige** del catálogo de recetas y se **compone** con `brand:compose`, como dice la skill `efeonce-graphic-line` (applications §L, «Componer el deck hoy»). Primero se valida el plan y después se pone en el canvas.
