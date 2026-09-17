# KV paraguas «Tu IA no conoce tu negocio» — versión Clawd (2026-09-17)

Estado: **prueba producida y revisada por el agente**. Pendiente: aprobación del operador, insignia oficial de partner
Claude y guía de marca de Anthropic archivada. Nada publicado ni programado.

Narrativa canónica: [`EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md`](../../docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md).

## Pieza

`kv-tu-ia-no-conoce-clawd-4x5-v02.png` — 1080×1350 PNG. Fuente editable del texto: `*-overlay.svg` (trazados). QA:
`*-qa.json`. Vista móvil: `*-mobile-390.png`. `v01` conservada (titular sin contraste de pesos).

- **Concepto:** reinterpretación del ángel y el diablo en el hombro. Nexa (versión humana) mira a Clawd, que está en
  su hombro; los dos hacen el mismo gesto de «no sé». La IA es brillante, pero nadie le contó el negocio.
- **Copy:** «Tu IA no conoce» (Bricolage `ideaLead` 420, `softOnDark`) → «tu negocio.» (Bricolage `ideaImpact` 780,
  blanco, 66 % del ancho) · bajada Poppins 500 34 px: «Claude razona increíble. Nadie le ha contado cómo funciona tu
  empresa.» La bajada protege a la mascota del partner: el problema es el contexto, no la capacidad.
- **Firma:** `public/branding/logo-negative.svg` 170 px abajo a la derecha. Insignia de partner Claude pendiente de
  asset oficial.
- **Sistema modular:** el hombro de Nexa es el espacio intercambiable de mascota (Clawd hoy; Codex Pet después), con
  bajada e insignia ligadas a la mascota. Nunca dos mascotas de terceros en la misma imagen.

## Procedencia

| Paso | Herramienta | Detalle |
|---|---|---|
| Sprite de Clawd | `clawd/sprite.mjs` | Reconstruido desde el arte de bloques del binario oficial de Claude Code 2.1.x (` ▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝`) y el color `rgb(215,119,87)` del mismo binario. Píxel 1:2 (la celda de terminal mide el doble de alto): renderizarlo cuadrado aplana a Clawd (error corregido en v02) |
| Clawd 3D | `gpt-image-2.5-sunburst` xhigh 1600² edit · `brief/clawd-3d-{neutral,shrug}.prompt.txt` | Figura de cubos de vinilo mate; cada píxel = 1×2 cubos. `v02` fiel en silueta, ojos, brazos y cuatro patas; la pose «shrug» sube los brazos y agrega «?» en cubos (cuerpo algo más alto que el sprite) · usage out 4670 c/u |
| Fondo transparente | `pnpm ai:image:rmbg` (matting medium) | `clawd-3d-*-v02-alpha.png` |
| Referencias Nexa | OneDrive `10. Nexa (Influencer IA)` | `Avatar 3,4 v2`, `Avatar Cuerpo Completo v2`, pose `The Breakdown` (copias locales en `refs/`) |
| Plate | `gpt-image-2.5-sunburst` xhigh 1600×2000 edit con 4 referencias · `brief/plate-kv-4x5.prompt.txt` | v01: Clawd chico y al borde; v02: Clawd ~20 % del ancho, integrado a la luz · usage in 6690 (img 6101) · out 4244 |
| Composición | `compose-kv.mjs` (fontkit + sharp, tokens AXIS) | Scrim navy vertical + radial izquierdo; guardias de margen y firma; contraste mínimo 4,5:1 obligatorio |

## Revisión (juicio del agente, no aprobación humana)

| Nivel | Estado | Observación |
|---|---|---|
| Estratégico | pass | Instala el paraguas: IA capaz + falta de contexto; Efeonce como quien lo construye |
| Creativo | pass | Código del ángel/diablo reconocible al instante; espejo de gestos humano–mascota |
| Marca / partner | condicional | Clawd no se rediseña en forma ni color, pero su versión 3D en cubos y el «?» son interpretación: validar contra la guía de marca de Anthropic. Falta insignia oficial |
| Producción | pass | Contraste peor caso: entrada 5,17:1 · remate 10,95:1 · bajada 12,09:1 · logo 17,21:1. PNG 1080×1350 |

Límites: Nexa y Clawd son generados; el rostro de Nexa se validó a ojo contra sus referencias. El «hombro vacío» del
concepto original no se lee en esta composición y se descartó.

## v03 — hoodie Efeonce, cámara lejana, titular plano, 4:5 y 9:16 (2026-09-17)

Pedido del operador: Nexa con el hoodie de Efeonce, cámara más alejada, titular sin jerarquía, logo centrado sobre un
objeto de primer plano desenfocado, producción en 4:5 y 9:16.

Entregables: `kv-tu-ia-no-conoce-clawd-4x5-v03b.png` (1080×1350) y `kv-tu-ia-no-conoce-clawd-9x16-v03b.png`
(1080×1920), con `*-overlay.svg`, `*-qa.json` y vista 390. La variante `v03a` (titular navy con luz sobre la pared) se
descartó: la luz se lee como un foco artificial.

| Paso | Detalle |
|---|---|
| Referencia hoodie | `refs/efeonce-hoodie.png` (hoodie azul rey con isotipo blanco, asset del sitio público) |
| Plate 4:5 nativo | `gpt-image-2.5-sunburst` xhigh 1600×2000 edit (Avatar 3/4, Cuerpo Completo, hoodie, Clawd shrug) · `brief/plate-kv-v03-4x5.prompt.txt` · usage in 6223 · out 4244. Isotipo del hoodie prácticamente igual al oficial: sin re-estampado |
| 9:16 | `story/outpaint.mjs`: plate a 1152×1440 en lienzo 1152×2048, outpaint arriba (pared) y abajo (escritorio) con franja de 56 px dentro del núcleo y fundido de 40 px · `brief/extend-9x16.prompt.txt` · salto máximo de luminancia por fila en uniones: 1,12 / 0,79 |
| 4:5 final | El 4:5 nativo dejaba la cabeza al 17 % y no daba aire para titular ni logo. Se abrió el encuadre del 9:16 a los lados: `feed/outpaint-wide.mjs` (lienzo 1632×2048, franja 40 px, fundido 28 px) · `brief/extend-4x5-wide.prompt.txt`. Los dos formatos comparten escena |
| Composición | `compose-kv-v03.mjs` (`FORMAT=4x5|9x16`): titular Bricolage `ideaShort` 740 blanco, un solo peso, centrado sobre la pared; pared oscurecida hacia navy arriba con fundido largo hasta la cabeza; logo negativo centrado sobre el frente del escritorio. Guardias: titular dentro de la pared libre y sobre la cabeza, zona segura de historia 13 %, logo sobre el escritorio |

Contraste peor caso: 4:5 titular 15,54 / 14,42 · logo 17,64 — 9:16 titular 14,92 / 14,04 · logo 17,04. El titular navy
directo sobre la pared fallaba (2,5–3,5:1) por las juntas oscuras del ladrillo; de ahí el cambio a titular blanco.

Observaciones: Clawd mide cerca de 7 % del ancho en 4:5 y se reconoce a 390 px por silueta, color y «?», pero es
pequeño; si el feed lo pierde, subirlo en el plate. Insignia de partner Claude sigue pendiente.

## v04 — muro navy, jerarquía y selección colaborativa AXIS (2026-09-17)

Pedido del operador: sin degradado azul detrás del texto, titular con jerarquía y uso de los elementos gráficos de la
marca (bounding box, cursor local y multiplayer). Entregables: `kv-tu-ia-no-conoce-clawd-4x5-v04.png` y
`kv-tu-ia-no-conoce-clawd-9x16-v04.png`, con `*-overlay.svg`, `*-qa.json` y vista 390.

| Paso | Detalle |
|---|---|
| Decisión de muro | Se descartó el muro claro propuesto: los controles de selección AXIS (trazo `#a6cdf5`, tiradores blancos) están diseñados para fondo oscuro y desaparecen sobre claro. El muro se repintó navy liso como escenografía, sin scrim |
| Matte | `pnpm ai:image:rmbg` sobre el 9:16 → `wall/subject-alpha.png` (Nexa + Clawd) |
| Repintado del muro | `wall/wall.mjs prep|merge` + `brief/wall-navy.prompt.txt` · `gpt-image-2.5-sunburst` edit con máscara (rectángulo del muro menos núcleo del sujeto erosionado 3 px) · usage out 2511. Merge: sujeto original sobre muro nuevo con matte suavizado (σ 2, umbral 0,7→1) y fundido de 6 px en los bordes del muro; con 36 px quedaba una franja clara junto a las ventanas y con matte duro un filo en el pelo |
| 4:5 | `feed/outpaint-wide.mjs` con `PLATE=../wall/plate-9x16-navy.png TAG=-navy` · salto máximo por columna 5,22 / 2,36 (sin costura visible) |
| Composición | `compose-kv-v04.mjs`: «Tu IA no conoce» Poppins 500 `softOnDark` (0,4× del remate) → «tu negocio.» Bricolage `ideaImpact` 780 blanco (47 % del ancho). `resolveCollaborationSelectionIntent` + `renderCollaborationSelection`: `eight-handles`, overlay `subtle`, colaborador «Claude» (`role`, top-end, select) y cursor local (bottom-start). Etiqueta de capa «Contexto: 0 %» Poppins 600 en `#0375db` centrada bajo la selección. Logo centrado sobre el escritorio. Guardias: zona segura, bloque sobre la cabeza, selección dentro del muro, `<text>` convertidos a trazados, `withinCanvas` |

Contraste peor caso: entrada 12,77 (4:5) / 12,16 (9:16) · remate 15,22 · texto de etiqueta 4,59 · logo 17,64 / 17,04.

Límites observados: la etiqueta del cursor «Claude» usa el tamaño del contrato AXIS (1,2 % del ancho) y a 390 px no se
lee; el color del cursor colaborador sale de la paleta AXIS (violeta), no del naranja de Clawd. Ambos requieren
extender el contrato AXIS (escala de etiqueta para campaña, color de participante), no parchear el render.
