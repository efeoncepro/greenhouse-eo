---
paths:
  - "public/branding/glitch/**"
  - "ai-generations/*glitch*/**"
  - "docs/operations/brand-graphic-line/glitch/**"
  - "docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md"
  - "docs/manual-de-uso/creative/editar-video-glitch.md"
---

# Glitch — sub-línea gráfica (auto-load por path)

Glitch (el magazine semanal de Efeonce: portadas, carrusel, blog, vlog/reel) tiene una **sub-línea complementaria de
«La órbita» que aplica SÓLO a Glitch**. Carga la skill **`efeonce-graphic-line`** → `references/glitch.md` (+
`efeonce-advertising-creative` si lleva texto, `social-media-studio`, `motion-design-studio` para video). Canon:
`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (motion en §13) + ADR
`docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md`. AXIS `/references/glitch/` y `/references/glitch.json`:
publicados (2026-09-27); los tokens y el contrato de Glitch llegan con TASK-1922.

Reglas duras:

- **Nunca** la manzana, el verde Glitch, la falla en bytes, Guttery ni la cabecera «EDICIÓN #N» en una pieza de Efeonce.
- **La transición de la manzana en bytes (entre piezas y entre escenas) es exclusiva de Glitch**: nunca en Efeonce.
- **Una sola esfera por pieza**: manzana **o** lente/órbita, nunca las dos.
- El verde nunca como texto, borde ni separador sobre claro; la falla nunca sobre un rostro, **tampoco en
  transiciones** (hacia o desde el host a cámara: corte seco o transición de tarjeta, salvo aprobación del operador);
  ningún overlay sobre la cara del host ni la interfaz de la app. Firma: logo de Efeonce centrado abajo, **nunca con
  falla** (en el corte sólo se corta).
- Lower third: la **órbita real** (anillo fijo al 28 % que la manzana recorre con la estela de 50°), nunca un arco
  suelto girando.
- Motion: repo taller `efeonce-brand-workshop`, `tools/glitch-motion/` (HyperFrames); desde `greenhouse-eo`:
  `pnpm -C ../efeonce-brand-workshop --filter glitch-motion {doctor|render|kit|transiciones|heroe|test}`. El texto sale
  del archivo de edición: nunca editar los `.mov` ni tocar tiempos o coordenadas de las composiciones.
- Aprobado: sistema de portada A/B/C con rotación, lámina interior, contraportada; manzana como esfera y verde como acento; línea Growth; próxima edición #17; alta de los 5 glifos Plastilina (2026-09-27). Blog, lente y todo el motion
  (piloto de video) son **propuesta**: no se entregan como canon ni se publican sin el operador.
