# Biblioteca de poses 3D de una mascota o personaje

Método reutilizable para producir una biblioteca de poses 3D (ángulos de cámara + accesorios ligados a servicios) de
una mascota de partner o de un personaje propio. Probado el 2026-09-17 con Clawd (Claude Code, Anthropic) y Codex
(Codex/ChatGPT, OpenAI). Evidencia y briefs completos: `ai-generations/2026-09-17_clawd-poses-3d/LEEME.md` y
`ai-generations/2026-09-17_codex-poses-3d/LEEME.md`.

## 1. Fuente oficial primero

Nunca de memoria ni desde copias de fans. Extraer el arte desde el producto oficial y medir anatomía y paleta.

| Mascota | Fuente | Cómo se extrajo |
|---|---|---|
| Clawd | Binario de Claude Code 2.1.x | Arte de bloques (` ▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝`) + color `rgb(215,119,87)` del mismo binario; sprite reconstruido con píxel **1:2** (la celda de terminal mide el doble de alto; renderizarlo cuadrado aplana a Clawd) |
| Codex | App ChatGPT macOS 26.911 | `npx @electron/asar extract-file` sobre `Resources/app.asar` → `webview/assets/codex-spritesheet-v6-*.webp`. Contrato V2: atlas 1536×2288, 8×11, celdas 192×208; filas 0–8 estados, filas 9–10 = 16 direcciones de mirada (000 = arriba). Script de cuadros clave: `sprites/extract.mjs` |

Anotar la anatomía medida (proporciones, cara, extremidades, colores HEX) antes de escribir prompts: es el bloque de
invariantes.

## 2. Material según anatomía

- **Rígido / pixelado → cubos de vinilo mate** (Clawd: cada píxel = pila de 1×2 cubos, bloque 12×8).
- **Blando / redondeado → vinilo suave** con visor de vidrio y glifos emisivos (Codex). Hacerlo en cubos habría
  borrado la nube.
- Serie coherente entre mascotas: misma luz de estudio, fondo gris cálido liso y encuadre centrado con margen.

## 3. Base validada antes de producir

1. Generar `base-frente` y `base-tres-cuartos` con el sprite (y, si existen, vistas laterales del atlas aplanadas
   sobre gris) como referencias.
2. Verificar contra el sprite: silueta, cara/ojos, extremidades, emblema y proporción.
3. Usar la base aprobada (imagen 1) + sprite (imagen 2) como referencias de **todas** las poses. Un accesorio canónico
   del atlas (laptop de Codex) suma su cuadro como referencia.

Motor usado: `pnpm ai:image` con `gpt-image-2.5-sunburst`, calidad xhigh, 1600×1600, edit (`--image`).

## 4. Plantilla de prompt

Un `base.txt` con los bloques fijos y un archivo por pose que sólo cambia expresión y POSE AND CAMERA:

```text
High quality 3D render of this exact character: <nombre>. Image 1 is the approved 3D figure and image 2 is its
official sprite. Keep the character's identity EXACTLY as in image 1 in every pose:

- <INVARIANTES> anatomía por partes (cabeza/cuerpo/cara/extremidades), material, colores HEX medidos,
  proporciones "exactly as in the sprite".
- Never add <mouth, ears, fingers, clothing, text, logos...>. Never <cambio de material prohibido>.

- <EXPRESIÓN> (si la mascota la tiene): p. ej. glifos del visor de Codex — `>_` predeterminada, `︶︶` tranquilo,
  `^^` feliz, `||` atento, `><`, `xx`, `_<` mirada lateral.

POSE AND CAMERA: <acción>. <ÁNGULO EN MAYÚSCULAS>: <descripción geométrica: qué cara se ve, qué queda de canto,
qué domina el cuadro, dónde cae la sombra>.

Lighting and render: premium product photography, soft large key light from upper left, gentle fill, subtle rim
light, soft ambient occlusion, realistic soft contact shadow, crisp focus on the whole figure, physically based
materials. Plain seamless light warm-gray studio background, nothing else in the frame. The whole figure fully
visible with generous margin, centered.
```

## 5. Los 8 ángulos

| # | Pose | Cámara |
|---|---|---|
| 01 | Frente héroe | Frontal a la altura de los ojos |
| 02 | Saludo | Tres cuartos izquierda |
| 03 | Caminando | Perfil estricto |
| 04 | Celebrando | Contrapicado |
| 05 | Mirando arriba | Cenital |
| 06 | Espalda | Tres cuartos trasero |
| 07 | Salto | Tres cuartos derecha, bajo |
| 08 | Idea con «!» | Tres cuartos derecha |

Perfil y cenital **fallan con una indicación genérica**; exigen geometría explícita:

- **Perfil:** «STRICT SIDE PROFILE, camera perpendicular to its left side at eye level» + volumen del costado («the
  side face is a full square of 8×8 cubes with NO holes»), la cara frontal «seen edge-on», ojos NO visibles, qué
  brazo y piernas se ven. Clawd tomó 3 intentos: v01 frontal, v02 cuerpo delgado con ojos en el costado, v03 OK.
  Codex: visor de canto, dominan los lóbulos laterales de la nube.
- **Cenital:** «TOP-DOWN BIRD'S-EYE VIEW: camera high above looking almost straight down (about 75 degrees down)» +
  qué superficie domina (cara superior de 12×8 cubos / racimo de lóbulos), cara frontal escorzada, patas ocultas,
  sombra alrededor. v01 no fue cenital en ninguna mascota; v02 aprobada (en Codex queda un picado alto de ~70°).

## 6. Los 8 accesorios ligados a servicios de Efeonce

| # | Accesorio | Servicio |
|---|---|---|
| 01 | Sombrero de detective y lupa | Auditoría, AEO |
| 02 | Boina y pincel | Creatividad y branding |
| 03 | Megáfono | Paid media y distribución |
| 04 | Casco de obra y llave | Implementación CRM y RevOps |
| 05 | Audífonos y micrófono | Podcast y comunidad |
| 06 | Claqueta | Producción audiovisual |
| 07 | Carpetas y cajas de archivo | Datos ordenados |
| 08 | Birrete y libro | Capacitación (Codex: laptop canónica de su atlas → contenido y desarrollo) |

Accesorios en el estilo de la mascota (cubos para Clawd; juguete liso para Codex). Nunca alteran a la mascota.

## 7. Recorte

```bash
pnpm ai:image:rmbg <in.png> <out-transparente.png>                  # matting + relleno de huecos internos
pnpm ai:image:rmbg <in.png> <out-transparente.png> --no-fill-holes  # sólo matting
```

Desde el 2026-09-17 la CLI rellena **por defecto** los huecos internos que el matting dejó transparentes y no son
fondo (caso: el `_` del emblema de Codex «saludo»). El fondo real encerrado (dentro del arco de los audífonos) se
conserva: si el color del hueco ≈ mediana del borde del original, sigue transparente. Corre en proceso aparte
(`scripts/ai/fill-alpha-holes-cli.ts`) porque el paquete de matting trae su propio sharp/libvips. Prueba:
`scripts/ai/fill-alpha-holes.test.ts`. Un recorte pierde la sombra del piso (salto de Clawd): esperado.

## 8. QA

- Hoja de contacto de las 16 poses sobre el gris de estudio.
- Hoja de los transparentes **sobre navy** (delata huecos, halos y bordes mordidos).
- Zoom a glifos, ojos y emblema de cada pose contra el sprite.
- Registrar en el `LEEME.md` de la corrida qué pose tomó varios intentos y por qué.

## 9. Entrega en OneDrive

```text
5. Contenidos/14. Mascotas de partners/<Mascota (Partner)>/
  Fuente oficial/                      sprite reconstruido o atlas oficial + cuadros clave
  Poses 3D/v01/                        8 poses × 2 variantes
  Poses 3D con accesorios/v01/         8 accesorios × 2 variantes
```

Nombre: `efeonce-<mascota>-3d-<nn>-<pose>-1x1-1600x1600-v01-{fondo-estudio|transparente}.png`
(p. ej. `efeonce-codex-3d-02-saludo-tres-cuartos-izquierda-1x1-1600x1600-v01-transparente.png`). Casos:
`Clawd (Claude)/` y `Codex (OpenAI)/`. Detalle de la raíz: `social-media-studio/efeonce/ONEDRIVE_DELIVERY.md`.

**Límite:** son interpretaciones 3D de la mascota de un partner; validar contra la guía de marca de Anthropic/OpenAI
antes de pautar. Por defecto, una sola mascota de terceros por imagen (regla del KV paraguas); juntas sólo con pedido
explícito del operador (ver el caso de abajo).

## Caso en escena: Clawd + Codex frente al logo (2026-09-19)

Contraportada `c09-refuerzos` del carrusel «Nivel de búsqueda» (trendjacking GTA VI):
`ai-generations/2026-09-19_nivel-de-busqueda/` (`plates-v2/s9-contraportada-v2.png`, `brief/s9*.log`), bitácora
[`2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md`](../../../../docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md).
El accesorio elige la pose por servicio (§6): la pieza habla de AEO, así que Clawd va de **detective con lupa** y
Codex con su **laptop** canónica.

- **Referencias (transparentes, OneDrive `5. Contenidos/14. Mascotas de partners/`):**
  `Clawd (Claude)/Poses 3D con accesorios/v01/efeonce-clawd-3d-01-detective-lupa-1x1-1600x1600-v01-transparente.png` y
  `Codex (OpenAI)/Poses 3D con accesorios/v01/efeonce-codex-3d-08-laptop-1x1-1600x1600-v01-transparente.png`, junto
  al logo monumental blanco del kit + `ai-generations/2026-09-17_efeonce-logo-3d/ref/logo-silueta.png`: **4 `--image`
  en una sola pasada** `gpt-image-2.5-sunburst` (1152×1440, `high`), con el bloque STYLE de la serie (key art
  pintado). Cada imagen con su rol declarado y su lugar en la escena.
- **Fidelidad conseguida (revisión visual, sin medición de color):** Clawd conservó el cuerpo de cubos, los ojos,
  las cuatro patas y su naranja; Codex, la nube, el visor oscuro y el glifo `>_`; sombrero, lupa y laptop quedaron en
  el estilo de cada mascota. Las mascotas mantienen su acabado 3D de vinilo dentro de la escena nocturna de la serie,
  y la identidad no se rompió. QA: recorte al 100 % de mascotas y logo (`brief/c09-check.png`, `brief/zoom-s9*-logo.png`).
- **Gobernanza:** el KV paraguas «Tu IA no conoce tu negocio» fija **una sola mascota de partner por imagen**. Juntas
  sólo con **pedido explícito del operador**, como aquí (precedente: «¿Claude o Codex?», 2026-09-17), y registrándolo
  en el LEEME de la corrida. Orgánico aprobado ≠ pauta: antes de pautar, validar contra las guías de marca de
  Anthropic y OpenAI. Registro de uso: [`PARTNER_MASCOT_POSE_LIBRARIES.md`](../../../../docs/operations/social/PARTNER_MASCOT_POSE_LIBRARIES.md).

## 10. Aplicarlo a Nexa

El mismo método (fuente oficial → base validada → ángulos → accesorios → recorte con huecos → QA → OneDrive) aplica,
con estas diferencias:

- **Marca propia:** no hay guía de partner que validar, pero la identidad está **bloqueada**: rostro, pelo, hoodie
  Efeonce e isotipo.
- **Dos familias, elegir antes de empezar:** personaje 3D estilo Pixar (`public/images/illustrations/characters/greenhouse-*.png`,
  pipeline edit + rmbg) o versión humana fotorrealista.
- **Fuente oficial** = las referencias de OneDrive `10. Nexa (Influencer IA)` (`Avatar 3,4 v2`, `Avatar Cuerpo
  Completo v2`, poses, vestuario) y los personajes del repo; no hay sprite que reconstruir.
- **Material:** no aplica la decisión cubos/vinilo; se conserva el acabado de la familia elegida.
- **Invariantes del prompt:** rasgos faciales, pelo y hoodie con isotipo en lugar de anatomía de juguete; la expresión
  es facial.
- **Destino:** `10. Nexa (Influencer IA)`, nunca `Mascotas de partners`.

## Logos de partners en 3D (caso sprocket de HubSpot)

Un logo no es una mascota: no se personifica, no se recolorea ni se le agregan partes. Fuente de forma = SVG oficial
renderizado como silueta, con la geometría enumerada en el prompt («no agregar, quitar ni re-proporcionar»); material
de color único exacto. Las escenas agregan objetos alrededor, nunca sobre el logo. Antes de publicar, la marca exige
aprobación (HubSpot: formulario con boceto, 7–10 días hábiles); mientras tanto, la biblioteca es de uso interno.
Recorte: el fondo visto a través de agujeros del logo en sombra debe quedar transparente (regla corregida en
`scripts/ai/fill-alpha-holes.ts`). Registro: `ai-generations/2026-09-17_sprocket-3d/LEEME.md`.


**Llevar cualquiera de estas piezas 3D a una escena generada** (nave, logo de partner, mascota, merch) usa el mismo
contrato que el logo completo: el render aprobado entra como **referencia de forma** y el prompt lleva la
**intención** —material, montaje, escena, atmósfera—. Nunca pegarlo como camino por defecto; el halo enmascarado es
la excepción para material exacto a escala chica. Criterio y medidas:
[`logo-3d-reference-kit.md`](logo-3d-reference-kit.md#1b-regla-de-elección-corregida-2026-09-17-con-el-caso-recepción).

## Isotipo propio en 3D con dos colores (caso nave de Efeonce)

Registro: `ai-generations/2026-09-17_efeonce-ship-3d/LEEME.md`. Tres reglas aprendidas:

- **Segundo color = recolorear el render aprobado**, nunca regenerarlo desde cero: editar cada imagen aprobada cambiando
  solo material y fondo conserva geometría, cortes y cámara. El blanco generado aparte salió plano y fue rechazado.
- **Ángulos extremos (desde abajo, picado fuerte, gran angular, sobrevuelo) requieren guía de perspectiva:** extruir la
  silueta oficial y proyectarla con cámara real (`guias/proyectar.mjs`), y pasarla como imagen 1 con la orden de copiar
  la cámara y no su aspecto. Con solo texto y la base frontal como referencia, el modelo devuelve casi frontal.
- **Objeto claro sobre fondo oscuro:** el matting deja opacos los huecos que muestran fondo (cortes, ventanas); vaciarlos
  con `pnpm ai:image:rmbg … --key-background [umbral] [minPx]`. Objeto claro sobre fondo claro no se recorta: se entrega
  solo como escena.
