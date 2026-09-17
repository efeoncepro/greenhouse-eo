# Logo Efeonce 3D (2026): kit de referencia por escala y cámara

Fecha de registro: 2026-09-17. Owner: Social Media Studio / Efeonce.
Caso: el logo completo de Efeonce en 3D, aislado y sin superficie, renderizado en Blender por escala y cámara para que
los agentes lo pasen a los modelos al aplicar el logo en campañas. Bitácora técnica y creativa; el flujo de uso, la
tabla de cámaras y los comandos viven en
[`LEEME.md`](../../../ai-generations/2026-09-17_efeonce-logo-3d/LEEME.md) (binarios fuera de git). Caso hermano del
isotipo: [nave Efeonce 3D](2026-09-17-efeonce-ship-3d-production-method.md).

## 1. Estado y entrega

Pedido del operador: el logo completo en 3D en distintas poses, **no puesto en superficies**, como referencia para
aplicarlo en campañas: gigante en una avenida de Nueva York, mediano, pequeño y elegante sobre un escritorio.
Aprobado el 2026-09-17 («todas me encantan»).

**Destino OneDrive:** `5. Contenidos/13- Branding/Logo Efeonce 3D/`.

| Carpeta | Contenido (verificado al registrar) |
|---|---|
| `Fuente oficial/` | `logo-efeonce-oficial.svg` (`public/branding/logo-full.svg`, `#023c70`) |
| `Navy/Monumental/` | 9 cámaras × 2 luces × 2 variantes = 36 PNG + manifiesto |
| `Navy/Grande/`, `Navy/Mediana/`, `Navy/Pequena/` | 8 cámaras × 2 luces × 2 variantes = 32 PNG + manifiesto cada una |
| `Blanco/<escala>/` | Misma estructura. Al registrar, el blanco seguía en render y su carpeta aún no existía en OneDrive |

Cada render tiene variante `-transparente` y `-fondo-estudio`, con luz `luz-izq` y `luz-der`. El PNG va recortado al
logo con 6 % de margen, así que su tamaño cambia por cámara (ejemplo: 2260×718 en la pequeña frontal). Nombre:
`efeonce-logo-3d-<navy|blanco>-<escala>-<nn>-<camara>-luz-<izq|der>-<transparente|fondo-estudio>.png`.

| Escala | Ancho real | Uso |
|---|---|---|
| Monumental | 20 m (~4,7 m de alto) | avenida, azotea, fachada alta, plaza, dron |
| Grande | 6 m (~1,4 m de alto) | muro de oficina, recepción, escenario, conferencia |
| Mediana | 1,2 m (~28 cm de alto) | pedestal, stand, vitrina, mesón, trofeo |
| Pequeña | 24 cm (~6 cm de alto) | escritorio, repisa, en mano, packaging, regalo |

La cámara exacta de cada render (posición, dirección, lente efectiva, altura, elevación del objeto, luz y usos) está
en el manifiesto de su escala.

Render local en Blender (Cycles, Metal), sin costo de API.

## 2. Por qué Blender y no un modelo generativo

La nave se hizo con `gpt-image-2.5-sunburst`. El logo completo es una palabra y sus letras deben quedar exactas; si las
dibuja un modelo generativo, puede deformarlas o escribirlas distinto. Por eso aquí la forma sale de la geometría
exacta del SVG oficial con cámaras reales. **Ningún modelo inventa las letras.** El modelo entra después, sólo para
integrar el render en una escena.

## 3. Decisiones que cambiaron el resultado

| Observación | Corrección | Criterio transferible |
|---|---|---|
| Cámara a 8–15 m de un logo de 20 m con lente efectiva de 11–24 mm: la palabra se veía «doblada» (extremos gigantes, curva) | Nada de gran angular extremo | Un modelo copia la deformación de la referencia como si fuera la forma del logo |
| Vista oblicua a 2,5× el ancho del logo: un extremo seguía dominando | Vistas oblicuas a ≥ 3,5× el ancho y lente efectiva ≥ 35 mm | La fuga se consigue con distancia y lente, no acercando la cámara |
| Regla para contrapicados | Elevar el objeto, no acercar la cámara: logo a 12 m (monumental) o a 3 m (grande), visto desde la calle | Un ángulo bajo se logra subiendo el objeto; se ve su cara inferior sin deformar |
| Rasantes a ~60°: las letras se comprimen y la palabra deja de leerse | Descartadas; la fuga la dan los tres cuartos | Si la palabra no se lee, el ángulo no sirve como referencia |
| Regla de encuadre | `fit()` ajusta lente y desplazamiento para que el logo ocupe el 84 % del cuadro; el postproceso recorta con 6 % de margen | Encuadrar por lente y desplazamiento, nunca por posición |
| Costura en el subtrazado de la órbita y líneas en las caras: el relleno de curva une agujeros con aristas puente que el solidify convierte en rayas | SVG a malla, fusionar vértices coincidentes, conservar sólo contornos y re-triangular con scanfill; luego solidify + bisel por ángulo | Extruir desde malla limpia, no desde la curva |
| La extrusión nativa de curva con offset negativo dejó la aleta hueca | Mismo paso a malla | No usar la extrusión nativa de curva en esta forma |
| Con HDRI de estudio los reflejos plateaban caras y cantos | Entorno neutro controlado; cara frontal navy medida ≈ (11, 60, 104) frente a `#023c70` | El color de marca se protege controlando el entorno, y se mide |
| En contrapicados media palabra salía 60 % más clara. Diagnóstico: medir por mitades apagando luz por luz hasta aislar la caja de luz principal reflejada en las caras | `visible_glossy = False` en el objeto luz (en Cycles, `specular_factor` de la luz se ignora) | La luz principal ilumina pero no debe reflejarse; un brillo desigual se diagnostica apagando las luces una por una y midiendo |
| Regla de iluminación, necesaria al elevar el objeto | Luces relativas al centro real del objeto, incluida su elevación | La luz sigue al objeto, no a la escena |
| Regla de proporción entre escalas (24 cm a 20 m) | Grosor de letra = 15 % del alto de la letra en todas las escalas; bisel ≈ 0,4 % del ancho | Proporciones relativas, no medidas absolutas, para que todas las escalas sean el mismo objeto |
| Con la luz del navy el blanco quedaba gris (cara ≈ 203) | Subir la caja y bajar el entorno hasta que las caras leen blanco sin perder los costados | El blanco se calibra midiendo píxeles, no a ojo |

## 4. Cómo lo usa un agente

1. Leer la escena del brief y decidir escala (tamaño del logo frente a personas y edificios), punto de vista (altura y
   lado de la cámara) y lado de la luz principal.
2. Elegir el render en el manifiesto: escala → cámara → luz. Navy sobre fondos claros o de día; blanco sobre fondos
   oscuros, nocturnos o navy.
3. Pasarlo al modelo como **imagen 1** (`pnpm ai:image --model gpt-image-2.5-sunburst --image <render> …`) con el
   contrato de prompt del [`LEEME`](../../../ai-generations/2026-09-17_efeonce-logo-3d/LEEME.md) (mantener forma,
   letras, proporciones, color y perspectiva; no redibujar). El resto del prompt describe sólo la escena.
4. Si la escena exige mucho a las letras (logo pequeño en cuadro, muchas letras a la vista, ángulos cerrados): generar
   la escena con el espacio reservado y componer el render encima en posición exacta, integrando sombra y luz después.
5. QA antes de usar: superponer la silueta del render sobre el resultado y comparar letra por letra (forma de «e»,
   «f», nave, anillo con sus cortes, tres ventanas); color sin deriva; perspectiva coherente. Una letra distinta =
   regenerar o componer. Revisión adversarial con la skill de publicidad antes de proponer.

## 5. Reproducir

```bash
cd ai-generations/2026-09-17_efeonce-logo-3d
./render-escalas.sh navy      # o blanco: rinde las 4 escalas y arma kit/ + hojas de revisión
blender -b --factory-startup --python blender/render_logo.py -- blender/grande-navy.json render/grande-navy --only 02-tres-cuartos-izquierda
node blender/postproceso.mjs render/grande-navy kit/grande-navy <hoja.png>
```

Configuración por escala y color en `blender/<escala>-<color>.json`. Agregar una cámara = agregar una entrada y correr
con `--only` (el manifiesto conserva las demás).

## 6. Uso y límites

- Es la **fuente de verdad de la forma** del logo en 3D, no una pieza ni una escena: el objeto va aislado, sin piso
  ni superficie.
- **No reemplaza la firma:** en una pieza, la firma sigue siendo el SVG oficial compuesto con AXIS. El logo 3D es la
  idea visual dentro de la escena.
