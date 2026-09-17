# Clawd 3D — biblioteca de poses (2026-09-17)

Pedido del operador: al menos 7 poses de Clawd (mascota de Claude, partner) desde distintos ángulos de cámara en 3D de
alta calidad, más 8 poses con accesorios relacionados con lo que hace Efeonce, guardadas en la biblioteca de contenido.

**Destino OneDrive:** `5. Contenidos/Recursos/Mascotas de partners/Clawd (Claude)/`
- `Poses 3D/v01/` — 8 poses × 2 variantes (`-fondo-estudio.png` y `-transparente.png`), 16 PNG 1600×1600.
- `Poses 3D con accesorios/v01/` — 8 poses × 2 variantes, 16 PNG 1600×1600.

Nombres: `efeonce-clawd-3d-<nn>-<pose>-1x1-1600x1600-v01-<variante>.png`.

## Método

- Referencias en cada generación: `ref-clawd-3d-neutral.png` (Clawd 3D validado en el KV «Tu IA no conoce tu negocio») y
  `ref-clawd-sprite.png` (sprite oficial reconstruido desde el binario de Claude Code, píxel 1:2, `rgb(215,119,87)`).
- `gpt-image-2.5-sunburst` xhigh 1600×1600 edit; prompt base con invariantes del personaje (bloque de cubos de vinilo,
  ojos rectangulares, brazos y cuatro patas en cubos 1×2, sin boca) + delta de pose y cámara (`brief/`, `brief-accesorios/`).
- Fondo transparente: `pnpm ai:image:rmbg` (matting medium), revisado sobre navy.

## Poses (ángulo de cámara)

| # | Pose | Cámara | Nota |
|---|---|---|---|
| 01 | Frente héroe | Frontal a la altura de los ojos | — |
| 02 | Saludo | Tres cuartos izquierda | — |
| 03 | Caminando | Perfil estricto | v01 salió frontal y v02 con cuerpo delgado y ojos en el costado; v03 aprobada (sin ojos visibles, correcto para perfil) |
| 04 | Celebrando | Contrapicado | — |
| 05 | Mirando arriba | Cenital | v01 no era cenital; v02 aprobada |
| 06 | Espalda | Tres cuartos trasero | — |
| 07 | Salto | Tres cuartos derecha, bajo | La versión transparente pierde la sombra en el piso |
| 08 | Idea con «!» | Tres cuartos derecha | — |

## Con accesorios (en el mismo estilo de cubos)

| # | Accesorio | Relación con Efeonce |
|---|---|---|
| 01 | Sombrero de detective y lupa | Auditoría, AEO, «lo que tu IA no sabe» |
| 02 | Boina y pincel | Creatividad y branding |
| 03 | Megáfono | Paid media y distribución |
| 04 | Casco de obra y llave | Implementación CRM y RevOps |
| 05 | Audífonos y micrófono | Podcast y comunidad |
| 06 | Claqueta | Producción audiovisual |
| 07 | Carpetas y cajas de archivo | Datos ordenados |
| 08 | Birrete y libro | Capacitación y conocimiento |

## Límites

- Algunas poses salen con el cuerpo algo más alto que el sprite (12×8 cubos); la silueta sigue reconocible.
- Accesorios y poses son interpretaciones de la mascota de un partner: validar contra la guía de marca de Anthropic antes
  de pautar (pendiente registrado en la narrativa canónica).
