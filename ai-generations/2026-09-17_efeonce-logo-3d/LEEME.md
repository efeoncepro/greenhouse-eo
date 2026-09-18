# Logo Efeonce 3D — kit de referencia por escala y cámara (2026-09-17)

Pedido del operador: el logo completo de Efeonce en 3D en distintas poses, **no puesto en superficies**, para que los
agentes tomen los renders como referencia y se los pasen a los modelos al aplicar el logo en campañas: gigante en una
avenida de Nueva York, mediano, pequeño y elegante sobre un escritorio. Aprobado por el operador («todas me encantan»).

## Qué es y qué no es

- Es la **fuente de verdad de la forma** del logo en 3D: geometría exacta del SVG oficial
  (`public/branding/logo-full.svg`, `#023c70`), renderizada en Blender con cámaras reales. Las letras no las inventa
  ningún modelo.
- No es una pieza ni una escena: el objeto va aislado (transparente o sobre fondo neutro), sin piso ni superficie.
- No reemplaza la firma: en una pieza, la firma sigue siendo el SVG oficial compuesto con AXIS. El logo 3D es la
  idea visual dentro de la escena.

## Destino

OneDrive `5. Contenidos/13- Branding/Logo Efeonce 3D/`:
`Fuente oficial/` (SVG) · `Navy/<Monumental|Grande|Mediana|Pequena>/` · `Blanco/<…>/`. En cada escala, por cámara y
luz (`luz-izq`, `luz-der`): `-transparente.png`, `-fondo-estudio.png` y el `*-manifiesto.json` de la escala.

Nombre: `efeonce-logo-3d-<navy|blanco>-<escala>-<nn>-<camara>-luz-<izq|der>-<transparente|fondo-estudio>.png`.

## Escalas y cámaras

Grosor de letra = 15 % del alto de la letra en todas las escalas; bisel ≈ 0,4 % del ancho.

| Escala | Ancho real | Uso | Cámaras |
|---|---|---|---|
| Monumental | 20 m (~4,7 m de alto) | avenida, azotea, fachada alta, plaza, dron | 01 frente nivel calle · 02 contrapicado frente (logo elevado 12 m) · 03/04 tres cuartos izq/der desde la calle · 05/06 contrapicado tres cuartos izq/der (elevado 12 m) · 07 teleobjetivo lejos · 08 picado desde edificio · 09 dron |
| Grande | 6 m (~1,4 m de alto) | muro de oficina, recepción, escenario, conferencia | 01 frente altura de ojos (montado a 1,2 m) · 02/03 tres cuartos izq/der · 04 contrapicado frente (a 3 m) · 05/06 contrapicado tres cuartos · 07 picado leve · 08 desde el público (teleobjetivo) |
| Mediana | 1,2 m (~28 cm de alto) | pedestal, stand, vitrina, mesón, trofeo | 01 frente altura de ojos (a 1 m) · 02/03 tres cuartos · 04 picado frente · 05/06 picado tres cuartos · 07 contrapicado leve · 08 teleobjetivo |
| Pequeña | 24 cm (~6 cm de alto) | escritorio, repisa, en mano, packaging, regalo | 01 frente a ras · 02 picado persona sentada · 03/04 picado tres cuartos · 05 picado alto (~60°) · 06/07 macro tres cuartos bajo · 08 picado lejano |

La cámara exacta de cada render (posición, hacia dónde mira, lente efectiva, altura, elevación del objeto, luz y
usos) está en el manifiesto de su escala.

## Cómo lo usa un agente (flujo)

1. **Leer la escena del brief** y decidir escala (tamaño del logo respecto a personas y edificios), punto de vista
   (altura y lado de la cámara) y lado de la luz principal de la escena.
2. **Elegir el render en el manifiesto** que coincide: escala → cámara → luz. Navy sobre fondos claros o de día;
   blanco sobre fondos oscuros, nocturnos o navy.
3. **Pasarlo al modelo como imagen 1** (`pnpm ai:image --model gpt-image-2.5-sunburst --image <render> …`) con este
   contrato en el prompt: «Image 1 is the exact 3D Efeonce logo: keep its shape, letters, proportions, color and
   perspective exactly; do not redraw, respell or restyle it. Integrate it into the scene described below with
   matching contact shadows, reflections and scale.» El resto del prompt describe sólo la escena.
4. **Si la escena es exigente con las letras** (logo pequeño en cuadro, muchas letras a la vista, ángulos cerrados):
   generar la escena con el espacio reservado y componer el render encima en posición exacta, integrando sombra y luz
   después (regla general: lo exacto no se deja inventar al modelo).
5. **QA antes de usar:** superponer la silueta del render sobre el resultado y comparar letra por letra (forma de «e»,
   «f», nave, anillo con sus cortes, tres ventanas); color sin deriva; perspectiva coherente con la escena. Una letra
   distinta = regenerar o componer. Revisión adversarial con la skill de publicidad antes de proponer.

## Reglas de cámara aprendidas (no repetir)

1. **Nada de gran angular extremo.** Con la cámara a 8–15 m de un logo de 20 m, lente efectiva de 11–24 mm: la
   palabra se veía «doblada» (extremos gigantes, curva). Un modelo copiaría esa deformación como forma del logo.
2. **Vistas oblicuas a ≥ 3,5× el ancho del logo** y lente efectiva ≥ 35 mm. A 2,5× todavía un extremo dominaba.
3. **Contrapicados elevando el objeto, no acercando la cámara:** logo a 12 m (monumental) o 3 m (grande) visto desde
   la calle; se ve su cara inferior sin deformar.
4. **Rasantes a ~60° descartadas:** las letras se comprimen y la palabra deja de leerse; la fuga la dan los tres
   cuartos.
5. **Encuadre por lente y desplazamiento, no por posición:** `fit()` ajusta lente y shift para que el logo ocupe el
   84 % del cuadro sin cambiar la perspectiva; el postproceso recorta al logo con 6 % de margen.

## Reglas de geometría, material y luz aprendidas

1. **Malla, no curva nativa:** convertir el SVG a malla, fusionar vértices coincidentes (costura del subtrazado de la
   órbita), conservar sólo contornos y re-triangular con scanfill (el relleno de curva une agujeros con aristas puente
   que el solidify convierte en líneas); luego solidify + bisel por ángulo. La extrusión nativa con offset negativo
   dejó la aleta hueca.
2. **Color de marca:** entorno neutro controlado, no HDRI de estudio (sus reflejos plateaban caras y cantos). Cara
   frontal navy medida ≈ (11, 60, 104) frente a `#023c70`.
3. **La caja de luz principal no debe reflejarse:** en Cycles `specular_factor` de la luz se ignora; se apaga con
   `visible_glossy = False` del objeto luz. Con reflejo, en contrapicados media palabra salía 60 % más clara (medido
   por mitades apagando luz por luz).
4. **Luces relativas al centro real del objeto**, incluida su elevación.
5. **Blanco calibrado por medición:** con la luz del navy el blanco quedaba gris (cara ≈ 203); se sube la caja y se
   baja el entorno para que las caras lean blanco sin perder los costados.

## Reproducir

```bash
cd ai-generations/2026-09-17_efeonce-logo-3d
./render-escalas.sh navy      # o blanco: rinde las 4 escalas y arma kit/ + hojas de revisión
blender -b --factory-startup --python blender/render_logo.py -- blender/grande-navy.json render/grande-navy --only 02-tres-cuartos-izquierda
node blender/postproceso.mjs render/grande-navy kit/grande-navy <hoja.png>
```

Configuración por escala y color en `blender/<escala>-<color>.json`; agregar una cámara = agregar una entrada y
correr con `--only` (el manifiesto conserva las demás). Render local en Blender (Cycles, Metal), sin costo de API.
