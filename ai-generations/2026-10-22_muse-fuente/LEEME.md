# Muse (Meta) — fuente oficial de la mascota · 2026-10-22

Material de partida para una futura biblioteca de poses 3D, con el mismo método que Clawd, Codex y Gigi
([`mascot-3d-pose-library.md`](../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md)).
**Aún no se generó nada con IA ni se copió a OneDrive.** Estado: candidato para el canvas, sin canonizar.

## 1. Qué es (verificado vs. inferido)

| Dato | Estado | Evidencia |
|---|---|---|
| «Muse» es la app de agente de IA de **Meta** | **Verificado** | `/Applications/Muse.app/Contents/Info.plist`: `CFBundleIdentifier = com.meta.endo`, `CFBundleDisplayName = Muse`, versión 1.0 (build 1070843164) |
| El nombre interno del proyecto es **Hatch** (y «Endo» el de la app de escritorio) | **Verificado** | Todos los assets del personaje se llaman `Hatch*`; esquema URL `hatch:`; flags `hatch_web:*` en `Resources/hatch/metaconfig.json`; la extensión de Chrome se llama «Hatch Browser Node … Paired via: Endo app» |
| La mascota (felpa marfil, cara de cachetes rosados) **es** el personaje del producto | **Verificado** | Los 6 MP4 y el JPG del bundle son ese personaje; son los estados de la app (reposo, saludo, trabajando, creando, hitos) |
| Su nombre público es **«Jolly»** (también «Jollybot») | **Inferido de prensa**, no de una fuente de Meta | Coinciden varias notas (Fortune, Shattered, The Ashland Chronicle); no se encontró el anuncio en about.fb.com |
| La diseñó **Alex Cornell**, líder de diseño de producto de Muse (equipo interno, no un estudio externo) | **Inferido de prensa** | Axios (2026-09-25) y el crédito público de Alexandr Wang en X, citado por AGTP. Una nota de Copyranter atribuye otra mascota («Leon») a Publicis: no es este personaje |
| El ícono rojo con dos círculos es el logo de la app Muse | **Probable, sin confirmar** | PNG 512 px embebido en `Resources/hatch/index.html` |

Fuentes: [Axios](https://www.axios.com/2026/09/25/ai-doom-meta-muse-mascot) ·
[Fortune](https://fortune.com/2026/10/02/meta-openai-ai-agent-mascots-jolly-dots-trust/) ·
[Daring Fireball / The Verge](https://daringfireball.net/linked/2026/09/24/song-meta-muse-cute) ·
[Shattered](https://shattered.io/meta-muse-jolly-mascot-clippy-marketing-2026/) ·
[AGTP en X](https://x.com/AGTPinsights/status/2102636424550088886).

🔴 **Diferencia con Gigi:** aquí la fuente SÍ está en el producto (como Codex). Y a diferencia de las tres anteriores,
**Jolly ya es 3D**: un render de felpa. No hay que interpretarlo desde un sprite ni un dibujo, sino conservarlo.

## 2. Origen de cada archivo

`fuente/` — copia byte a byte desde `/Applications/Muse.app/Contents/Resources/`:

| Archivo | Qué es |
|---|---|
| `Hatch.jpg` (640×640) | Retrato oficial de cerca: la mejor referencia de cara y pelaje |
| `HatchIdle.mp4` (512², 3,9 s) | Reposo, parpadeo (ojos cerrados felices) |
| `HatchWave.mp4` (512², 4 s) | Saludo con la mano derecha |
| `HatchWorking.mp4` (512², 3,8 s) | **Única vista de tres cuartos**: audífonos y laptop |
| `HatchMaking.mp4` (512², 6 s) | Cuerpo entero creando: cristal violeta emisivo entre las manos |
| `HatchMilestoneCape.mp4` (512², 6 s) | Hito: **cuerpo entero frontal limpio** en t=0 → capa violeta, brazos arriba, estrella dorada |
| `HatchMilestoneConfetti.mp4` (512², 8 s) | Hito: gorro de fiesta, cañones de confeti, **boca abierta** |
| `muse-brand-loader-middle-out.json` | Lottie del loader de marca (abstracto, sin personaje) |
| `AppIcon.icns`, `AppIcon-1024.png` | Ícono de la app (el PNG convertido sale a 256 px: es el tamaño mayor que trae el icns) |
| `hatch-cws-screenshot-1.jpg` | Captura de Chrome Web Store de la extensión «Hatch» (desde `Resources/chrome/`) |

`cuadros/` — 6 cuadros por video (0, 20, 40, 60, 80 y 95 % de la duración), con ffmpeg.
`extra-embebido/` — 43 PNG/GIF base64 extraídos de `Resources/hatch/index.html` (51 MB): son íconos de UI (tipos de
archivo, etc.), **ninguno es la mascota**, salvo el logo rojo (`emb-001`). Se dejan como inventario.
`ref/` — 13 recortes elegidos para el canvas. `hoja-de-contacto.png` — los 13 etiquetados.
`brief/` — scripts (`extraer_embebidos.py`, `medir.cjs`, `hoja.cjs`) y previsualizaciones.

## 3. Anatomía medida

Medido sobre `cuadros/HatchMilestoneCape-t00.00.png` (cuerpo entero frontal, 512²) y `fuente/Hatch.jpg`
(`brief/medir.cjs`; las proporciones de cara son a ojo sobre el cuadro, ±5 %).

| | |
|---|---|
| **Silueta** | Un solo volumen tipo «bellota / almohada»: capucha redondeada que continúa en el cuerpo sin cuello. Caja del personaje 311×380 px → **ancho/alto ≈ 0,82** |
| **Cara** | Ventana ovalada lisa, sin pelaje, recortada en la capucha: ≈ 47 % del ancho del cuerpo y ≈ 26 % del alto total; ubicada en el tercio superior |
| **Ojos** | Dos cuentas negras brillantes, separadas, a media altura de la ventana; brillo especular arriba |
| **Boca** | Línea fina en «U» ancha, pequeña, centrada bajo los ojos. Alterna: ojos en arco cerrados (feliz) y boca abierta roja (celebración) |
| **Cachetes** | Rubor rosado difuso bajo cada ojo |
| **Nariz / orejas** | No tiene |
| **Brazos** | Dos muñones cortos y redondeados, sin dedos, que nacen a media altura del costado |
| **Piernas** | Dos patas cortas y anchas, casi ocultas bajo el pelaje, separadas |
| **Material** | Pelaje corto y denso (piel sintética de peluche) en todo el cuerpo; cara de vinilo mate, tono crema |

**Paleta muestreada (HEX):**

| Zona | HEX |
|---|---|
| Pelaje, pecho (luz) | `#CEB49C` |
| Pelaje, capucha | `#D7BB9D` |
| Pelaje, sombra del costado | `#B3A191` |
| Pelaje, pies | `#C2AD9A` |
| Cara (vinilo) | `#E9D0AC` – `#EBD5B3` |
| Rubor | `#C69379` (núcleo) → `#EAB795` (borde) |
| Ojos | `#0B0803` – `#0D0603` |
| Fondo de estudio oficial | `#F4F6F5` – `#F5F5F5` |

Accesorios canónicos de los propios videos: audífonos plateados + laptop de aluminio; capa de terciopelo violeta;
estrella dorada acolchada; gorro de fiesta a rayas azul y dorado; cristal violeta emisivo.

## 4. Material 3D propuesto

**Conservar la felpa: peluche de pelaje corto + cara de vinilo mate.** No aplica cubos (no es pixelado) ni gel con
línea (no es dibujo). Jolly ya es 3D; reinterpretarlo en vinilo liso le borraría lo único que lo hace Jolly: el pelo.
Para la serie Efeonce se mantiene la luz de estudio y el fondo gris cálido liso de las otras mascotas.

🔴 **Riesgo de recorte, previsto por la lección de Gigi:** pelaje crema con borde difuso sobre fondo de estudio claro
(Δ por canal pequeño contra `#F4F6F5`). Recortar pelo es lo más difícil del matting: generar el fondo de estudio con
más contraste (gris medio) o planear rmbg con modelo de pelo, nunca `fill-alpha-holes` con tolerancia.
Y la criatura es **cálida**: declarar la temperatura del cuadro para que no arrastre la pieza al tungsteno
(misma trampa que Clawd).

## 5. Límites de marca

- Meta pide usar **sólo los assets oficiales y respetar sus guías** en material de marketing
  ([Brand Resource Center](https://www.meta.com/brand/resources/)); no hay sección para Muse ni para la mascota, y el
  centro no contempla personajes. Marcas registradas: [Our trademarks](https://www.facebook.com/brand/resources/facebookcompany/our-trademarks).
- **Las poses 3D serían interpretación de Efeonce**: uso interno y exploración hasta validar con Meta, igual que las
  demás mascotas de partners. Para publicar sin aprobación, preferir la insignia/mención del partner.
- Sensibilidad pública: grupos como Fairplay critican que el personaje atrae a niños aunque Muse es 18+ (prensa
  citada arriba). Evitar escenas infantiles con Jolly.

## 6. Huecos

- **No hay perfil puro ni espalda** en ninguna fuente oficial; el único giro es el tres cuartos de `HatchWorking`.
  La espalda y el perfil habrá que deducirlos (capucha continua, sin cara atrás).
- No hay hoja de modelo ni press kit oficial de Meta; no se encontró el post de about.fb.com ni un caso de estudio
  de Alex Cornell.
- Resolución máxima: 640 px (retrato) y 512 px (videos).
- El nombre «Jolly» es de prensa; confirmarlo antes de usarlo en copy.
- La app permite personalizar el avatar (otros personajes): este kit cubre sólo el personaje por defecto.
