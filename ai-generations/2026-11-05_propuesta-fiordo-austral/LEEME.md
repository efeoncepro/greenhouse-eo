# Propuesta Fiordo Austral — Implementación CRM HubSpot (Wherex 428823) — 2026-11-05

Deck de 26 láminas, línea `revenue-hubspot`, tema oscuro. Edición ofertada: **Sales Hub Professional** («Pro esbelto», decisión de Julio del 05/11).
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
| 01 portada · 26 contraportada | Insignia HubSpot Solutions Partner Gold como capa, en la variante **naranja** (`assets/hubspot-spp-gold-badge-orange.png`) desde el 05/11, para la presencia de HubSpot que pidió Julio | La contraportada no acepta `partnerMark` sin `sloganBlock`, igual que en Assetplan. |
| Insignia | PNG derivado del SVG oficial `public/branding/partners/hubspot/solution-partner/badge-light-spp-hubspot.svg` con sharp, a 640 px, sin tocar el arte | El canvas le quita `<style>` a los SVG subidos y la insignia salía negra (Julio, 05/11). El README de la insignia permite derivar el raster. |
| 03 qué cubre el CRM | Sprocket 3D de HubSpot como capa (`ai-generations/2026-10-06_deck-hubspot/png/sprocket-3d-flotando-800.png`, 380 px en x 1410 / y 470, la misma posición que en el deck HubSpot para esta receta) | Julio pidió «muy HubSpot» con sus activos oficiales (05/11). Uso autorizado el 14/10, como en Assetplan. La norma de superficie §4.6 todavía lo marca de uso interno: hay que actualizarla |
| 05 partners · 11–14 seguridad | Láminas nuevas para responder la licitación: muro de partners (nueve, HubSpot seleccionado en la segunda fila), Zero Trust con Entra ID y Wazuh, matriz resumida (29/33/10/2), 99,9 % de disponibilidad con su fuente, y continuidad e incidentes (`decision-risk` sólo existe en claro: se compone en `growth`, como decision-case en el deck HubSpot) | Julio, 05/11: la propuesta no respondía la licitación requisito por requisito |
| 01 portada | Sin pregunta: `render-portada.ts` agrega `portada-orbit-decision.css` a una copia temporal del catálogo (medidas de `cover-proposal` · `orbit-decision`, como la portada aprobada de Assetplan, sin el chip del eyebrow). Titular «Propuesta / CRM HubSpot» y evidencia «Preparada para…». Se retira con TASK-2014 | Norma: la portada de propuesta dice lo que es, sin voz (criteria §4, operador 2026-10-19). Greenhouse fija AXIS sin `orbit-decision` y la receta exige `voice.question` |
| Voz de todo el deck | Pregunta y respuesta sólo en 04 «¿Pro o Enterprise? / Pro primero», 14 «¿Dónde quedan los datos? / En Estados Unidos» y 23 «¿Cuánto invertimos? / US$ 9.900». Las demás láminas son una frase en dos tiempos: el anillo abre el tema y la esfera lo cierra («Cada acceso al CRM pasa por / Entra ID», «De la firma a producción, / 16 semanas»). Con el slot `question` de la receta, sin tocar código | Julio, 05/11: «la dinámica de preguntas y respuestas de todo el deck se siente muy absurda y forzada». Delta 2026-10-25 de La órbita: el par sólo cuando el lector de verdad pregunta; se conserva la estructura anillo arriba, esfera abajo |
| 05 partners | Retirada el 05/11 | Julio: «no tiene sentido como está planteada». La receta exige el muro de nueve partners de Efeonce, que en una propuesta HubSpot distrae; la credencial va en la insignia Gold |
| 19 inversión | `content-pricing` `live` con montos reales vía `render-pricing-real.ts` (mismo builder y plantilla; sólo reemplaza `[MONTO]`): US$ 6.900 · 1.000 · 250 / mes · 0 → total US$ 9.900 + IVA. Licencias HubSpot en los chips, fuera del total | Excepción a «montos como marcador», como Assetplan. Escenario «Pro esbelto» de Julio (05/11); cuadro en `docs/commercial/tenders/fiordo-austral-crm-428823/oferta-economica.md` |
| 01 portada | Logo de Fiordo Austral bajado de su sitio, con autorización de Julio del 05/11: `assets/fiordo-austral-logo-web.png` (853 × 278, versión para oscuro) | No venía en el zip de la licitación. Falta conseguir uno en alta. |

## Pendiente

- **Antes de enviar:**
  - confirmar con HubSpot el waiver del onboarding y el precio de US$ 100;
  - volver a verificar el tier Gold;
  - conseguir el logo de Fiordo Austral en alta.
- **Sprocket 3D:** no se usa hasta tener autorización escrita.
- **Láminas a mano con tokens** (método «propuesta que se lee sin presentador»): resumen de la matriz de seguridad y cadena Zero Trust, si Julio las quiere.

## Lección

La primera versión del canvas se dibujó a mano con los componentes del design system y Julio la rechazó: «así no hacemos las portadas».

El deck de marca propia se **elige** del catálogo de recetas y se **compone** con `brand:compose`, como dice la skill `efeonce-graphic-line` (applications §L, «Componer el deck hoy»). Primero se valida el plan y después se pone en el canvas.
