# Propuesta Assetplan — Operación HubSpot (2026-10-20)

Deck de 22 láminas para Karla Goharriz (Assetplan), línea `revenue-hubspot`. Plan validado con
`pnpm brand:deck-plan -- --plan plan.json` (0 avisos). El PDF lo arma `node pdf-sprocket.mjs` desde la raíz del repo.
Canvas: https://claude.ai/code/artifact/a167ca41-cc6c-4748-8370-dc14dd63e340

## Ajustes a mano (fuera de las recetas)

| Lámina | Ajuste | Por qué |
|---|---|---|
| A04 alcance | sprocket 3D de HubSpot como capa (`OVERLAYS`) | la receta no tiene slot; uso autorizado desde 2026-10-14 |
| A059 seguridad | logo oficial de Efeonce (`efeonce-logo-positive.svg`, 106×25 en x 1447 / y 195) en lugar de la palabra «Efeonce» del rótulo, que quedó como «Soporte con» | pedido del operador; `decision-difference` no tiene slot de logo |
| A07 equipo · A09 contraportada | insignia HubSpot Solutions Partner Gold como capa | `partnerMark` en `close-proposal-horizon` rechazado por el contrato: «La insignia de partner de la contraportada va sólo con el eslogan en bloque (`sloganBlock`, las líneas de sus referencias).» |
| A075 caso ANAM | lámina aprobada del brochure Efeonce 360° como imagen (`RASTER`) | pedido del operador |
| A01 portada | lámina a mano con las medidas de `cover-proposal` · `orbit-decision` (AXIS 0.6.6 / 0.7.6), pasa a receta con TASK-2014: receta `cover-proposal` orbit + `portada-orbit-decision.css` (oculta la pregunta; titular «Servicio / Managed CRM» Bricolage 760 92/0,95 con esfera #e86bd0 de 0,2 em; eyebrow en 404–446 como chip; evidencia en 667, 28/1,3, ancho 724) vía `render-eyebrow-chip.ts --css` | Julio: portada de propuesta sin pregunta («Pon Servicio Managed CRM»); Greenhouse aún fija AXIS 0.3.4x y no ve `orbit-decision` |
| Todas (menos A075) | eyebrow como chip de contorno sin relleno: `render-eyebrow-chip.ts` clona el catálogo `graphic-line-deck` a una carpeta temporal y agrega una regla `.gl-eyebrow` al final de `graphic-line.css` (borde 1,5 px al 55 % del color del texto, radio pill, padding 9/16/9/20, `translate: 0 -10px`); builder, plantillas y slots canónicos | pedido del operador (2026-10-20): «chip o badge sin relleno» en los títulos; el catálogo del repo no cambia. Si se adopta, va como propuesta a AXIS/línea gráfica |
| A078 inversión | `content-pricing` layout `live` con montos reales vía `render-pricing-real.ts` (mismo builder y plantilla; sólo reemplaza `[MONTO]`) | excepción del operador a «montos como marcador»; montos de la cotización formal ASSETPLAN-2026-10-20-v2 |

## Contraportada BR3h (pendiente de aprobación de Julio)

- Ficha `fichas/BR3h.json` (desde `CMP-crm-B` + composición de BR3), revisada por `cine-reviewer` antes de generar.
- `plates/BR3h-v1-rechazada-esfera-suelta.png`: rechazada («se ve súper artificial la órbita con ese punto rosado»):
  aro grueso con la esfera suelta arriba. La v2 describe la anatomía de §1.3: anillo fino y tenue, arco corto en el
  acento (10→11 h, sentido horario) y la esfera en su punta.
- `plates/BR3h.png` (v2) → `BR3h-sin-tarima.png` (tarima borrada con `pnpm ai:inpaint erase`, manifest en
  `ai-generations/2026-10-20_inpaint/inpaint/4d9aa2d7bda0/`) → `BR3h-final.png` (escena corrida 136 px a la derecha con
  relleno espejado del borde izquierdo, sin IA) para que el halo del anillo quede a ≥ 60 px del fin del eslogan
  (medido: halo desde x 1110, línea en x 1191; el eslogan termina en 1035).
- **Opción A (v2 corregida):** `plates/BR3h-final.png`, compuesta en `out/A09-contraportada-v2/` (respaldo); la v2 cruda
  quedó como `plates/BR3h-v2-escala-retrato.png`.
- **Opción B (v3, escala de BR3):** ficha v3 (`lecho: sin-lecho`, sin `primerPlano`, anillo 64–94 % del ancho) revisada
  por `cine-reviewer` → `plates/BR3h.png` cruda → `BR3h-v3.png` (32 px a la derecha, espejo) → `BR3h-v3-sin-isotipo.png`
  (isotipo inventado de la espalda borrado con `ai:inpaint erase`, máscara `BR3h-v3-mask-isotipo.png`, manifest
  `ai-generations/2026-10-20_inpaint/inpaint/89006665124c/`) → `BR3h-v3-logo-acabado.png` (logotipo oficial de la vista
  `espalda-mujer` con `foto:isotipo --marca logotipo --sin-limpiar --acabado`; 0 px fuera de la marca). La limpieza
  automática de `foto:isotipo` cuadraba los hombros: por eso se borró antes con máscara chica y se compuso `--sin-limpiar`.
  Es la que usa hoy el intent A09. Comparación: `png/contraportada-v2-vs-v3.png`. Pendiente: elección de Julio.
- Intentos descartados por recoloreo: `BR3r-*` (rotación de tono) y `BR3r2-*` (inpaint de la luz, exceso de rosado).

## Estado final — 20/10/2026

- Portada aprobada por Julio («Apruebo»); contraportada elegida: opción B (BR3h v3), registrada por la sesión de línea gráfica (`df1f1ff6a`).
- Enviado a Karla por Outlook el 20/10 a las 18:11, con firma gráfica, CCO HubSpot y los dos PDF. Readback en Enviados y EMAIL 119144374556 `SENT` en HubSpot.
- Deal 66450601027: Precios y términos, 440 UF (proyección de 12 meses), cierre 04/11/2026 (vigencia).
- Entregables también en OneDrive `Alineación/4. Comercial/Licitaciones/Assetplan/`.
