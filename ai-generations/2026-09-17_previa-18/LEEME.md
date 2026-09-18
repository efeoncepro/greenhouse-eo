# «Hay días que sí rediseñaríamos» — Efeonce · previa Fiestas Patrias Chile (17/09/2026)

Estado: **pieza producida y revisada por el agente (2026-09-16)**. Pendiente: aprobación del operador y autorización
de programación. Nada fue publicado ni programado.

## Pieza

`post-17.png` — 1080×1350 PNG sRGB (render 2x → lanczos3 + grano monocromo ±3 niveles anti-banding). Fuente editable:
`post-17-source.svg` (texto en trazados). Vista móvil: `post-17-mobile-390.png`. Métricas: `qa.json`.

- **Concepto:** el 17 es el día que queremos editar. El «7» está seleccionado (AXIS `efeonce.collaboration-selection`,
  eight-handles, cursor local en `bottom-end` con acción resize) y su vista previa de arrastre ya es un «8».
- **Serie:** cierra la trilogía «Hay…»: «Hay frases que no se tocan» (México, 16/09) → «Hay días que sí
  rediseñaríamos» (17/09) → «Hay cosas que no necesitan rediseño» (Reel Chile, 18/09).
- **Señal de fiesta:** banderines de fonda en dos planos (adelante con sombra, atrás más chico y translúcido),
  en paleta corporativa. Sin bandera, escudo ni rojo.
- **Paleta:** `efeonceTokens.color.action` `#0375db` → `#0359a8` → `actionStrong` `#023c70`; blanco; `softOnDark` `#cfe4fa`.
- **Tipografía:** «17» Bricolage 800 (wdth 96, opsz 96, −0.045em) · «Hay días que» Poppins 500 50 px `softOnDark` ·
  «sí rediseñaríamos.» Bricolage `ideaImpact` 780 (opsz 72, −0.03em) ≈ 100 px blanco · gap de tinta 16 px.
- **Firma:** `public/branding/logo-negative.svg` 190 px, centrado, 6 % inferior.
- **Sin generación IA:** composición tipográfica determinística.

## Revisión (juicio del agente, no aprobación humana)

| Nivel | Estado | Observación |
|---|---|---|
| Estratégico | pass | Oficio de agencia (seleccionar y rediseñar) aplicado a la ansiedad compartida del 17; continuidad de serie. |
| Creativo | pass | Una sola idea legible en < 1 s: 17 → 8; remate con contraste de función, peso y escala. |
| Cultural/contextual | pass | 17/09/2026 es jueves hábil antes del fin de semana largo 18–20 (verificado La Tercera / El Mostrador). Banderines evocan fonda sin símbolos patrios. No alude al proyecto de feriado del 17 (tema político). |
| Marca | pass | Colores corporativos Efeonce, logo oficial negativo, contraste peor caso 9,7:1. |
| Producción | pass | Contraste peor caso (p98 del fondo bajo la tinta): «17» 4,19:1 (texto grande, piso 3:1), «Hay días que» 5,69:1, remate 8,01:1. Selección dentro del lienzo. Cuerdas nacen y mueren fuera del lienzo. Lectura verificada a 390 px. |

Defectos corregidos durante la producción: remate invadiendo el aire de la firma (el script falla si ocurre),
cuerda delantera naciendo dentro del lienzo y cruzándose con la trasera, banderines demasiado planos.

## v2 — alto impacto (2026-09-16, pedido del operador: «no se ve con ese impacto visual»)

`v2/post-17-v2.png` (1080×1350 PNG). Diagnóstico de v1: plano/vectorial, contraste medio, acción implícita (el «8»
sólo como contorno), banderines de clipart. v2 conserva idea, copy y paleta, y pasa a escena 3D de estudio con acción física.

| Paso | Detalle |
|---|---|
| Boceto | `v2/sketch.mjs` → `v2/sketch.png`: glifos Bricolage 800 reales («1», «8», «7» cayendo 24°), cursor y banderines en posiciones exactas |
| Plate 3D | `pnpm ai:image --image v2/sketch.png` · `gpt-image-2.5-sunburst` · xhigh · 1600×2000 · `v2/plate.prompt.txt` · usage in 1934 / out 4244 |
| Composición | `v2/compose.mjs`: viñeta, «Hay días que» Poppins 500 44 px `softOnDark` + «sí rediseñaríamos.» Bricolage 780 82,8 px, logo 180 px; guardias: copy fuera del «7» (0 píxeles brillantes) y fuera del aire de la firma |
| Contraste peor caso | lead 5,65:1 · remate 8,97:1 · logo 12,68:1 |

Límite declarado: los números 3D se materializaron desde el boceto con glifos reales, pero no son vectores exactos de
Bricolage (el «8» sale algo más redondeado). Texto de lectura y logo sí son exactos.

## v3 — luz dramática y cámara heroica (2026-09-16)

`v3/post-17-v3.png` (1080×1350 PNG). Cambios sobre v2 por crítica del agente aceptada por el operador: fondo marino
profundo con foco cenital y humo, cámara baja y números al ~70 % de la altura, «8» entrando inclinado con estela,
cursor mayor con borde turquesa corporativo (`#12afa2`) presionando el «8», «7» expulsado con desenfoque,
banderines en dos planos (primer plano desenfocado), piso reflectante.

| Paso | Detalle |
|---|---|
| Boceto | `v3/sketch.mjs` (glifos Bricolage 800 reales a escala heroica, «7» a 26°) |
| Plate 3D | `gpt-image-2.5-sunburst` xhigh 1600×2000 · `v3/plate.prompt.txt` · usage in 2020 / out 4244 |
| Composición | `v3/compose.mjs`: scrim gradual del piso (0 → 0,9 desde el 70 % de la altura), viñeta, copy y logo exactos; contraste mínimo 4,5:1 obligatorio |
| Contraste peor caso | lead 6,02:1 · remate 11,03:1 · logo 15,21:1 |

Límite: el «7» sale muy desenfocado y se reconoce más por contexto (cursor + «18» + copy) que por su forma.

## v3b — banderines con color de Chile (2026-09-16)

`v3/post-17-v3b.png` (1080×1350 PNG). Los banderines celestes del plano medio pasan a rojo fonda; blancos y marinos
se conservan; primer plano desenfocado, números, cursor y piso sin cambios. Sin estrella ni franjas.

- Intento descartado: inpainting con máscara (`gpt-image-2.5-sunburst`, `v3/mask-bunting.png`) cambió la geometría
  (menos banderines, más grandes, borde desenfocado teñido); no se usó.
- Método aplicado: recoloreo determinístico `v3/recolor-bunting.mjs` sobre el plate original. Banderines detectados
  por perfil de columnas (celestes B−R 84–120; blancos B−R < 25), relleno por semilla, apertura morfológica para
  excluir el cordel, conservación de la punta bajo el cordel, rojo `hsl(354°, 68 %)` con la luminosidad del píxel
  original (trama, pliegues y luz intactos) y 8 % del ambiente azul.
- Contraste peor caso: lead 6,02:1 · remate 11,03:1 · logo 15,21:1 (sin cambio: el rojo queda fuera de la zona de texto).
- Detalle conocido: la secuencia empieza rojo-rojo (heredada del orden original de colores).

## Historia 9:16 (2026-09-16)

`story/post-17-story-9x16.png` (1080×1920 PNG). Recomposición nativa, sin estirar ni bandas: plate v3b escalado a
1152×1440 al centro de un lienzo 1152×2048 → outpaint arriba (techo con foco) y abajo (piso) con
`gpt-image-2.5-sunburst` xhigh y máscara → núcleo aprobado re-pegado con fundido.

- Primer intento con costura visible (salto de luminancia 89,6 → 100,4 en y=304): el modelo conservó el borde del
  lienzo aunque la máscara abría la franja de solape. Corrección: abrir una franja de transición DENTRO del núcleo en
  zonas seguras (techo hasta 20 px antes de los banderines rojos; piso lejos del «7») y fundir el núcleo sólo dentro
  de esa franja repintada (344→372 y 1560→1600). Resultado continuo.
- Composición `story/compose-story.mjs`: zona segura AXIS story (13 % vertical, 10 % lateral) con guardias; scrim del
  piso adelantado tras fallar el primer render por contraste (lead 4,24:1). Final: lead 9,41:1 · remate 13,7:1 · logo 14,89:1.
