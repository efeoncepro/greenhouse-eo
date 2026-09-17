# Logo 3D como referencia exacta: kit por escala y cámara (Blender)

Fuente de verdad: [`ai-generations/2026-09-17_efeonce-logo-3d/LEEME.md`](../../../../ai-generations/2026-09-17_efeonce-logo-3d/LEEME.md)
(aprobado por el operador 2026-09-17). Bitácora:
[`docs/operations/social/2026-09-17-efeonce-logo-3d-reference-kit-production-method.md`](../../../../docs/operations/social/2026-09-17-efeonce-logo-3d-reference-kit-production-method.md).

## Cuándo usarlo

Toda escena donde el **logo completo de Efeonce aparece como objeto físico**: letras gigantes en una avenida o
azotea, corpóreas en un muro o escenario, sobre pedestal o vitrina, pequeñas sobre un escritorio o en mano.

- El kit es la **forma**: geometría exacta del SVG oficial (`public/branding/logo-full.svg`, `#023c70`) renderizada
  con cámaras reales. **Nunca** dejar que el modelo dibuje las letras.
- No es una pieza ni una escena: objeto aislado, sin piso ni superficie.
- No reemplaza la firma: en la pieza, la firma sigue siendo el SVG oficial compuesto con AXIS.
- Sólo la nave (isotipo) como objeto → biblioteca de la nave, no este kit
  ([`mascot-3d-pose-library.md`](mascot-3d-pose-library.md#isotipo-propio-en-3d-con-dos-colores-caso-nave-de-efeonce)).

Ubicación: OneDrive `5. Contenidos/13- Branding/Logo Efeonce 3D/` → `Fuente oficial/` (SVG) ·
`Navy/<Monumental|Grande|Mediana|Pequena>/` · `Blanco/<…>/`. Por cámara y luz (`luz-izq`, `luz-der`):
`-transparente.png`, `-fondo-estudio.png` y el `*-manifiesto.json` de la escala. Nombre:
`efeonce-logo-3d-<navy|blanco>-<escala>-<nn>-<camara>-luz-<izq|der>-<transparente|fondo-estudio>.png`.

## 1. Elegir escala, cámara y luz desde el manifiesto

1. De la escena del brief decidir: **escala** (tamaño del logo frente a personas y edificios), **punto de vista**
   (altura y lado de la cámara) y **lado de la luz principal**.
2. Escala: Monumental 20 m (avenida, azotea, fachada, plaza, dron) · Grande 6 m (muro de oficina, recepción,
   escenario) · Mediana 1,2 m (pedestal, stand, vitrina, mesón, trofeo) · Pequeña 24 cm (escritorio, repisa, en mano,
   packaging, regalo). La tabla de cámaras por escala está en el LEEME.
3. En el manifiesto de la escala, filtrar `renders[]` por `usos`/`descripcion` y leer `camara` (`posicion_m`,
   `mira_m`, `lente_mm_efectiva`, `altura_camara_m`, `elevacion_objeto_m`) para que la escena comparta esa
   perspectiva; elegir `luz` igual al lado de la luz de la escena.
4. Color: **navy** sobre fondos claros o de día; **blanco** sobre fondos oscuros, nocturnos o navy.
5. Usar el `-transparente.png` como imagen 1; el `-fondo-estudio.png` sirve para revisión o si el modelo pierde
   bordes con alfa.

## 2. Contrato de prompt (imagen 1)

```bash
pnpm ai:image --model gpt-image-2.5-sunburst --image <render-del-kit.png> --prompt "…"
```

Texto obligatorio al inicio del prompt, sin variar:

> Image 1 is the exact 3D Efeonce logo: keep its shape, letters, proportions, color and perspective exactly; do not
> redraw, respell or restyle it. Integrate it into the scene described below with matching contact shadows,
> reflections and scale.

El resto del prompt describe **sólo la escena** (lugar, hora, luz, personas, cámara coherente con el render). No
describir el logo ni sus letras: la descripción compite con la imagen.

## 3. Fallback: componer en vez de integrar

Si la escena es exigente con las letras (logo pequeño en cuadro, muchas letras a la vista, ángulos cerrados):
generar la escena **con el espacio reservado** y **componer el render encima** en posición exacta; integrar sombra de
contacto y luz después. Regla general: lo exacto no se deja inventar al modelo.

## 4. QA letra por letra (antes de usar)

1. Superponer la silueta del render sobre el resultado.
2. Comparar letra por letra: forma de «e», «f», nave, anillo con sus cortes, tres ventanas.
3. Color sin deriva frente al render; perspectiva coherente con la escena.
4. **Una letra distinta = regenerar o componer.** Nunca entregar «casi igual».
5. Revisión adversarial con `efeonce-advertising-creative` antes de proponer.

## 5. Agregar cámaras o rendir otro logo (`blender/render_logo.py`)

Configuración por escala y color en `blender/<escala>-<color>.json` (`svg`, `color`, `color_hex`, `prefijo`,
`resolucion`, `samples`, `escala{ancho_m, grosor_m, bisel_m}`, `camaras[]{id, pos, mira, lente_mm, descripcion,
usos, elevacion_objeto_m}`). Agregar una cámara = agregar una entrada y correr con `--only <id>`: el manifiesto
conserva las demás.

Para otro logo (por ejemplo, uno de cliente) el procedimiento se generaliza copiando una config y cambiando `svg`,
`color_hex`, `prefijo` y escalas; esto es extrapolación del método, no un caso ya ejecutado: la calibración de
material y luz (abajo) se mide de nuevo para cada color, y el cliente debe tener derechos sobre el archivo de marca.

**Cámara (no repetir):**

1. Nada de gran angular extremo: con 11–24 mm efectivos a 8–15 m de un logo de 20 m la palabra se «dobla» y el
   modelo copia la deformación como forma.
2. Vistas oblicuas a **≥ 3,5× el ancho del logo** y lente efectiva **≥ 35 mm** (a 2,5× un extremo aún dominaba).
3. Contrapicados **elevando el objeto**, no acercando la cámara (12 m monumental, 3 m grande).
4. Rasantes a ~60° descartadas: las letras se comprimen; la fuga la dan los tres cuartos.
5. Encuadre por lente y shift (`fit()`, logo al 84 % del cuadro) sin mover la cámara; el postproceso recorta con
   6 % de margen.

**Geometría:** SVG → malla, fusionar vértices coincidentes, conservar sólo contornos y re-triangular con scanfill;
luego solidify + bisel por ángulo. Grosor = 15 % del alto de letra; bisel ≈ 0,4 % del ancho. No usar extrusión
nativa de curva con offset negativo (dejó la aleta hueca) ni el relleno de curva (aristas puente visibles).

**Material y luz:** entorno neutro controlado, no HDRI de estudio (plateaba caras y cantos). Medir el color de la
cara frontal contra el hex (navy medido ≈ (11, 60, 104) frente a `#023c70`). La caja de luz principal no debe
reflejarse: en Cycles apagar con `visible_glossy = False` del objeto luz (`specular_factor` se ignora). Luces
relativas al centro real del objeto, incluida su elevación. Blanco calibrado por medición: subir la caja y bajar el
entorno hasta que la cara lea blanco sin perder los costados.

## 6. Reproducir

```bash
cd ai-generations/2026-09-17_efeonce-logo-3d
./render-escalas.sh navy      # o blanco: 4 escalas + kit/ + hojas de revisión
blender -b --factory-startup --python blender/render_logo.py -- blender/grande-navy.json render/grande-navy --only 02-tres-cuartos-izquierda
node blender/postproceso.mjs render/grande-navy kit/grande-navy <hoja.png>
```

Render local en Blender (Cycles, Metal), sin costo de API. Entrega a OneDrive según
[`social-media-studio/efeonce/ONEDRIVE_DELIVERY.md`](../../social-media-studio/efeonce/ONEDRIVE_DELIVERY.md).
