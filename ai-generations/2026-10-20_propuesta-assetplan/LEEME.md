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
| A01 portada | lámina a mano con las medidas de `cover-proposal` · `orbit-decision` (publicada en AXIS v0.7.6: tokens 0.6.6 / contratos 0.7.6; referencia aprobada `cover-proposal-orbit-decision-assetplan`), pasa a receta con TASK-2014: receta `cover-proposal` orbit + `portada-orbit-decision.css` (oculta la pregunta; titular «Servicio / Managed CRM» Bricolage 760 92/0,95 con esfera #e86bd0 de 0,2 em; eyebrow en 404–446 como chip; evidencia en 667, 28/1,3, ancho 724) vía `render-eyebrow-chip.ts --css` | Julio: portada de propuesta sin pregunta («Pon Servicio Managed CRM»); Greenhouse aún fija AXIS 0.3.4x y no ve `orbit-decision` |
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

## Versión 2 — 27/10/2026 (respuesta a los cinco puntos de Karla)

Karla pidió, antes de la reunión del miércoles 28/10 a las 15:45: persona asignada, continuidad, tiempos de respuesta,
atención por su canal de Slack y alcance de las 25 h. Julio aprobó las respuestas; la propuesta pasa a 25 láminas.

- **Nuevas:** `A041-bolsa` (content-text, «¿Qué se cobra aparte? Poco.»: ordinario y agentes priorizados dentro, aparte
  sólo lo grande, hasta 5 h pasan al mes siguiente en los meses 1–4) · `A051-tiempos` (content-bullets: urgente ≤ 1 h con
  plan en el día; importante ≤ 4 h y ajustes en 24 h hábiles; relevante ≤ 24 h y 48–72 h hábiles; Slack Connect) ·
  `A071-continuidad` (content-bullets: respaldo designado, memoria en Notion, traspaso con traslape sin costo, acceso
  nominativo). En `A051` la selección va en el ítem 3: en el 1 la etiqueta del cursor tapaba el «04» y en el 4 se salía
  del lienzo.
- **Cambiadas:** `A05` (canal en Slack de Assetplan por Slack Connect; ícono de Slack desde el kit de Salesforce, fix en
  `content-day-live-approval.ts`), `A07` («Un equipo asignado»: dirección de cuenta, Especialista de CRM dedicado y especialistas; la cotización v3 dice lo mismo en su alcance), `A058`
  (semana 2: Slack Connect + teamspace).
- `plan.json` y `pdf-sprocket.mjs` con el nuevo orden; `pnpm brand:deck-plan` sin avisos. El caso ANAM se bajó del
  archivo con `pnpm ai-gen:pull` (estaba archivado).
- **Cotización v3** (`Efeonce-Cotizacion-Assetplan-HubSpot-v3.pdf`, ref. `ASSETPLAN-2026-10-27-v3`): mismo precio;
  tiempos de respuesta en «Capacidad», traspaso de hasta 5 h en lugar de «no acumulable», Slack Connect en el ciclo,
  contraparte y continuidad en el alcance. Datos en el expediente privado (`cotizacion-v3/`).
- En OneDrive quedan las versiones enviadas el 20/10 sin tocar y, al lado, `…-Operacion-HubSpot-v2.pdf` y la cotización v3.
- Canvas actualizado (versión 60). **Sin enviar:** el correo de respuesta a Karla lo envía Julio.

## Versión 2 a 30 horas — 28/10/2026 (tras la reunión con Karla)

En la reunión (nota en Notion «Discovery Call - Assetplan | Efeonce», 28/10 15:45) Karla pidió **30 horas mensuales** y
una **persona fija** que entienda el negocio, presente en la segunda reunión. Julio decidió: precio proporcional
(48 UF de lista, 36 UF netas en los meses 1–4, 1,2 UF/h), mantener los tiempos de respuesta de la lámina y presentar
la contraparte como «Especialista de CRM fijo desde el inicio», sin nombre todavía.

- Láminas recompuestas: `A02` (30 horas), `A04` y `A041` (30 horas), `A035` (sin landing pages: en Assetplan las hace
  su diseñador), `A036` (sin Teams ni Microsoft 365), `A057` (reunión semanal; 26 de 30 h; revisión presencial o Meet),
  `A06` (reunión semanal), `A07` (Especialista de CRM fijo desde el inicio), `A078` (36 UF; montos en
  `render-eyebrow-chip.ts` y `render-pricing-real.ts`: 48 / −12 / 36) y `A08` (segunda reunión para conocer a la
  contraparte; inicio antes de diciembre).
- **Cotización v3** rehecha a 30 horas (`ASSETPLAN-2026-10-28-v3`): 36 UF + IVA = 42,84 UF en los meses 1–4; desde el
  mes 5, 48 UF + IVA = 57,12 UF. Equipo asignado con Especialista fijo y reunión semanal en el ciclo. La v3 del 27/10
  nunca se envió: se reemplazó.
- OneDrive y canvas (versión 65) actualizados. Vigencia extendida al 30/11/2026 (Julio, 28/10). Deal 66450601027: monto 528 UF (4 × 36 + 8 × 48), readback verificado; cierre movido al 30/11/2026.
- **Enviado el 28/10 a las 17:03** por Julio, en el hilo original: propuesta por link de documento de HubSpot
  (https://hubs.ly/Q04CGTr30; el PDF pesa ~16 MB) y cotización v3 adjunta. Verificado en Enviados; HubSpot registró
  EMAIL 119864568951 `SENT` en el deal. HubSpot: próximo paso actualizado, nota 119880247983 y tarea 119879914252
  («confirmar Especialista de CRM y agendar la segunda reunión», vence 03/11).
