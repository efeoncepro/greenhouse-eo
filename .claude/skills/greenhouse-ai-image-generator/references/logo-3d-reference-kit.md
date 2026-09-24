# Logo 3D como referencia exacta: kit por escala y cámara (Blender)

> **Alcance:** este documento cubre los **kits de referencia de forma de marca** —el logo 3D (§1–§8) y el
> **vestuario** (§1.d)—. Todos comparten el mismo contrato: la referencia fija la forma, el prompt fija la escena.
> El método completo de prenda, para producir un kit nuevo, vive en
> [`garment-reference-kit.md`](garment-reference-kit.md); §1.d es su resumen operativo.

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

## 1.b Regla de elección (corregida 2026-09-17 con el caso recepción)

La pasada directa con el render como referencia **no es sólo para logo grande en cuadro**: es también la vía cuando la
pieza **cambia el material** del logo (acero, aluminio, vidrio, neón, madera, cobre) o cuando se quiere que el modelo
resuelva montaje, luz y atmósfera. Entregar la forma exacta como referencia y la intención en el prompt rinde mucho
mejor que pegar el render: pegado, el objeto queda con el material y la luz del kit y se ve falso en la escena.

- **Pasada directa (por defecto):** logo grande en cuadro **o** cambio de material **o** escena con una atmósfera fuerte
  (larga exposición, neón, contraluz). El render fija la forma; el prompt fija material y escena.
- **Halo enmascarado:** sólo cuando hay que conservar el material exacto del kit **y** el logo es chico o de detalle
  fino, donde la pasada directa deforma la órbita.
- **Referencia por luminancia:** para materiales claros (acero, aluminio, blanco, vidrio) usar el render **blanco**;
  para materiales oscuros o el navy de marca, el render **navy**. La luminosidad parecida guía mejor al modelo.

Caso probado: recepción premium 9:16 con larga exposición, escala mediana, referencia blanca frontal luz derecha y la
instrucción «mismas letras, nave, órbita y proporciones; cambia sólo el material: acero inoxidable cepillado de 1,2 m
y 4 cm de fondo, montado con pines ocultos sobre travertino». Una pasada, USD 0,14, aprobado por el operador
(«espectacular»). Antes, la variante de pegar + halo sobre el mismo muro fue rechazada: «se ve muy falso», y el navy
sobre travertino no tenía jerarquía. Registro: bitácora §5.


## 1.c Aplicar el kit con una persona en la escena (caso Nexa en set de TV)

Registro: `ai-generations/2026-09-17_nexa-logo-estudio/LEEME.md`. Cinco reglas medidas en esa producción:

- **El emblema es lo frágil:** acompañar SIEMPRE el render con el logo oficial plano como referencia extra y declarar
  su geometría (nave a la derecha, órbita como elipse ancha con cortes, planeta encima) y su proporción (del alto de
  una letra). Sin eso, la órbita se vuelve círculo y el emblema crece.
- **Referencia frontal** en escenas complejas; la de tres cuartos exige más del modelo.
- **Color del logo por contraste con el sujeto:** con un hoodie navy sobre set oscuro, letras blancas; el navy pide
  fondos claros.
- **Anatomía:** un objeto a la altura del codo obliga a poses que se leen mal. Apoyarse con las manos en una mesa a la
  cadera funciona. Declarar qué parte del cuerpo se ve y a qué altura llega cada elemento; si el cuerpo se corta en la
  oscuridad, iluminar el piso y declarar el calzado.
- **Encuadre:** pedir márgenes explícitos («nada toca los bordes») y tercio superior limpio si después va titular AXIS.


## 1.d Vestuario de marca: los kits de prenda

Mismo contrato para la ropa. Registro: `ai-generations/2026-09-17_{hoodie,polo}-efeonce/LEEME.md`; entrega en OneDrive
`13- Branding/Hoodie Efeonce/v01/` y `Polo Efeonce/v01/`, con manifiesto por vista.

- **La prenda la elige el contexto de la escena** (cliente → polo, formal → camisa + softshell, evento → polera,
  producción → hoodie): la cápsula la gobierna `efeonce-brand-studio`, no la costumbre.
- **Elegir la vista por el ángulo de la toma** (de espaldas → vista de espalda) y pasarla junto con las referencias de
  rostro y cuerpo de la persona. Sin la vista correcta, el modelo inventa la espalda, la capucha o el puño.
- **El texto de la prenda se compone, no se genera:** la estampa de espalda (logo + «Empower your Growth» con los tres
  pesos del contrato de marca) se arma con `estampa-espalda.mjs` y entra como referencia.
- **Proporciones fijas:** emblema del pecho igual al asset oficial, nunca reducido; estampa de espalda al 38 % del
  ancho de la espalda (al 55 % no se ve realista).
- **El emblema bordado se espeja:** pasar el isotipo oficial rasterizado como imagen 2, describir su geometría y
  revisar el pecho **vista por vista con recorte al 100 %** (en la hoja de contacto no se ve).
- **Contrato de realismo** en el prompt (lente 100 mm, arrugas asimétricas, pelo de la tela, tinta serigráfica sobre
  las fibras): sin él la prenda sale con aspecto de render. Si se cambia el contrato, rehacer la serie completa.

## 2. Elegir la variante (manda §1.b: el tamaño es sólo uno de los criterios)

El camino canónico es **generativo en las dos variantes**: el logo entra como píxeles exactos y el modelo aporta
sombra, reflejo y profundidad. Lo que cambia es cuánto se le deja tocar.

| Situación | Variante | Por qué |
|---|---|---|
| El logo ocupa **≳ un tercio del ancho** del cuadro, letras grandes y legibles | **A. Pasada directa** | A ese tamaño el modelo respeta la forma; una sola llamada e integración completa |
| **Cambio de material** (acero, aluminio, vidrio, neón, madera, latón) o escena de atmósfera fuerte | **A. Pasada directa** | El render fija la forma y el prompt la intención; pegado se ve falso (§1.b) |
| Material exacto del kit **y** logo chico en cuadro, detalle fino (órbita, cortes, ventanas), ángulos cerrados | **B. Pegar y repintar el halo con máscara** | A esa escala el modelo re-dibuja el detalle aunque el prompt lo prohíba |

Regla corta: **por defecto A; B sólo cuando hay que conservar el material exacto del kit a escala chica.** Cuesta una llamada más (el plato) y garantiza la forma.

## 3. Variante A — pasada directa (por defecto)

```bash
pnpm ai:image --model gpt-image-2.5-sunburst --image <render-del-kit.png> --prompt "…"
```

Texto obligatorio al inicio del prompt, sin variar:

> Image 1 is the exact 3D Efeonce logo: keep its shape, letters, proportions, color and perspective exactly; do not
> redraw, respell or restyle it. Integrate it into the scene described below with matching contact shadows,
> reflections and scale.

El resto del prompt describe **sólo la escena** (lugar, hora, luz, personas, cámara coherente con el render). No
describir el logo ni sus letras: la descripción compite con la imagen.

**Si la pieza cambia el material**, el contrato cambia una palabra: la referencia conserva forma, letras, órbita con
sus cortes, tres ventanas, proporciones y perspectiva, y **cambia sólo el material**, que el prompt describe con
dimensiones y montaje («acero inoxidable cepillado de 1,2 m y 4 cm de fondo, cantos vivos, veta horizontal, pines
ocultos sobre travertino»). Elegir el render por **luminancia** (blanco para materiales claros, navy para oscuros).

**Evidencia medida (2026-09-17):** avenida de Nueva York al anochecer con la **monumental blanca** (cámara 03, luz
der) salió fiel al primer intento, **USD 0,14**. Diferencias menores que el QA aceptó: órbita algo más gruesa y
nariz de la nave algo más corta que en el render.

### Evidencia 2026-09-19 — monumental como cartel de azotea en estilo ilustrado pintado

Caso «Nivel de búsqueda» (trendjacking GTA VI): `ai-generations/2026-09-19_nivel-de-busqueda/LEEME.md`, logs
`brief/s3*.log` y `brief/s9*.log`, bitácora
[`2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md`](../../../../docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md).
La pasada directa funciona también cuando la escena **no es fotográfica** sino key art pintado: el render fija la
forma y el bloque STYLE de la serie (`brief/style.txt`) fija el acabado.

- **Montaje:** letras blancas monumentales como cartel sobre la azotea de un hotel art déco frente al mar (c03) y
  sobre una estructura de cartel en una azotea con helipuerto (c09, contraportada).
- **Referencias:** `Blanco/Monumental/efeonce-logo-3d-blanco-monumental-01-frente-nivel-calle-luz-<izq|der>-transparente.png`
  o `…-02-contrapicado-frente-luz-<izq|der>-transparente.png` como imagen 1 + `ai-generations/2026-09-17_efeonce-logo-3d/ref/logo-silueta.png`
  como imagen 2 (el emblema es lo frágil, §1.c). Contrato del §3 al inicio del prompt, sin variar.
  `gpt-image-2.5-sunburst`, 1152×1440, `high`.
- **El layout va en el prompt, con porcentajes.** Sin él: **s3 v1** cortó el logo contra el borde del cuadro y
  **s3 v2** lo subió tanto que no quedó cielo para el titular. **s3 v3** (aprobada) llevó la regla estricta:

  > STRICT LAYOUT: the top edge of the logo letters is at 55% of the frame height; above it ONLY deep dark
  > indigo-cobalt night sky … no buildings, no skyline above 55%.

  Y para la firma: «The bottom 12% is dark matte … reserved for small text». Pedir el cielo **oscuro en lo más
  alto** («darkest at the very top, dark enough for white text»): un cielo naranja brillante bajo el titular midió
  1,4:1 en otras láminas de la misma serie.
- **QA letra por letra (§5) pasó en las 3 escenas con logo** que llegaron a revisión (s3 v3, s9 v1 y s9 v2): «e», «f»,
  nave, órbita con cortes y tres ventanas correctas; revisado con recorte al 100 % (`brief/zoom-*logo*.png`).
- **Cuatro referencias en una pasada:** la contraportada llevó **logo + silueta + Clawd + Codex** (4 `--image`) en
  una sola llamada Sunburst y las cuatro formas salieron fieles (input medido 5 946 tokens de imagen). Declarar el
  rol de cada imagen (forma exacta del logo, geometría del emblema, identidad de cada mascota) y dónde va cada una
  en la escena (lado del logo, superficie de apoyo, delante o detrás del cartel). Mascotas: [`mascot-3d-pose-library.md`](mascot-3d-pose-library.md#caso-en-escena-clawd--codex-frente-al-logo-2026-09-19).

## 4. Variante B — pegar y repintar el halo con máscara (excepción: material del kit a escala chica)

**Por qué existe (medido):** con la escala **pequeña** sobre un escritorio, la pasada directa deformó la órbita —la
encogió a un lazo— y aclaró el navy, **dos veces seguidas**, aun exigiendo en el prompt la elipse ancha y `#023c70`.
A ese tamaño el prompt no gana: hay que quitarle al modelo el permiso de dibujar el objeto.

1. **Plato sin el objeto.** Generar la escena vacía y declarar en el prompt el espacio libre donde irá el logo
   («leave the centre-left area completely EMPTY: clean bare wood, no object, no prop, no shadow of any object
   there, a clear space about 30 cm wide»), con la profundidad de campo enfocada en esa zona.
2. **Base = plato + render pegado, sin sombra.** La sombra la pone el modelo después.
3. **Máscara**: protegido el **interior del logo** (erosión ≈ 8 px, para que el borde pueda fundirse) **y también
   todo el resto de la escena**; editable **sólo un halo de ≈ 140 px** alrededor del objeto.
4. **Una pasada de edición** que pida **sólo integración**: sombra de contacto según la dirección de la luz de la
   escena, reflejo en la superficie, rebotes cálido/frío y fundido de bordes con la profundidad de campo; y que
   declare explícitamente que el objeto ya colocado es real, está protegido y no se re-dibuja.

```bash
# 2 y 3 — base + máscara (HALO en píxeles; 140 por defecto)
HALO=140 node prueba/preparar-mascara.mjs <plato.png> <render-del-kit.png> <ancho-px> <x> <y> base.png mascara.png

# verificación PREVIA AL GASTO: cuántos píxeles quedaron protegidos
node -e "const s=require('sharp');s('mascara.png').extractChannel('alpha').raw().toBuffer().then(b=>{let p=0;for(const v of b)if(v>200)p++;console.log('protegidos',p,'de',b.length,(100*p/b.length).toFixed(1)+'%')})"

# 4 — una sola pasada de integración
pnpm ai:image --model gpt-image-2.5-sunburst --image base.png --mask mascara.png --prompt "…"
```

**Resultado medido:** zona protegida con diferencia media **4,4/255** y halo editable **39,6** (la sombra y el
reflejo nuevos). Esa media prueba que la máscara orientó al modelo, **no** que el logo y la escena quedaron intactos:
el 2026-09-17 una media de 4,85 en zona protegida escondía un delta máximo de **221/255**, porque GPT Image 2.5
redibuja la imagen entera aunque reciba `--mask`. **Paso 5 obligatorio:** recomponer la salida con el alfa invertido
de la misma máscara sobre la base y exigir delta máximo 0 en la zona protegida
([receta](../../../../docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md#la-mascara-no-preserva-pixeles-el-recorte-lo-haces-tu)).
No es el `reanclar.mjs` descartado de abajo: ese pega el render con borde duro; éste trae de la base sólo lo
protegido y deja la franja erosionada y el halo del modelo (inferido del método; aún sin medir en una pieza de logo). **Artefacto conocido:** un brillo sucio donde el halo toca el borde del
remate; se corrige bajando `HALO` o la erosión.

**No omitir la máscara de la escena.** Protegiendo sólo el logo, el modelo conserva el objeto pero **re-dibuja toda
la escena**: cambia props y encuadre (medido: IoU de silueta **0,72** por desplazamiento y escala).

**Trampa técnica de `sharp` (cuesta plata si se ignora):** `blur()` / `linear()` sobre un buffer **raw de 1 canal**
devuelven **3 canales**; sin `.toColourspace('b-w')` el índice se corre y la máscara sale **100 % transparente**, es
decir *todo editable*, sin ningún error visible. Por eso el conteo de píxeles protegidos de arriba es obligatorio
**antes** de llamar al modelo: una máscara rota se ve igual de bien en el visor y se paga igual.

Herramientas de la corrida (en `ai-generations/2026-09-17_efeonce-logo-3d/prueba/`): `preparar-mascara.mjs` (base +
máscara de halo, `HALO` por variable de entorno) · `componer-escritorio.mjs` (composición determinística, sólo
respaldo) · `reanclar.mjs` (re-anclar el render sobre la salida: **descartado**, reintroduce el aspecto pegado y
los fringes).

## 5. QA letra por letra (obligatorio en las dos variantes)

1. Superponer la silueta del render sobre el resultado.
2. Comparar **letra por letra**: forma de «e», «f», nave, órbita **con sus cortes**, **tres ventanas**.
3. Color sin deriva frente al render; perspectiva coherente con la escena.
4. En la **variante B**, además: medir la diferencia media por píxel entre base y salida separando la **zona
   protegida** (alfa opaco de la máscara) del **halo**. La protegida debe quedar cerca de cero; si sube, la máscara
   no hizo efecto. Después recomponer la zona protegida desde la base y exigir **delta máximo 0** ahí: la media baja
   no garantiza nada (221/255 de máximo con media 4,85, medido 2026-09-17).
5. **Una letra distinta = regenerar o cambiar de variante.** Nunca entregar «casi igual».
6. Revisión adversarial con `efeonce-advertising-creative` antes de proponer.
7. La **firma** de la pieza sigue siendo el SVG oficial compuesto con AXIS: el 3D es el objeto de la escena, nunca
   la firma.

## 6. Último recurso: composición determinística

Pegar el render sobre la escena y pintar la sombra a mano **no es el camino por defecto**. El operador lo rechazó
explícitamente: «al componerlo de forma determinante pierde sombras integradas, profundidad; hay que lograr que
sirva con IA generativa». El resultado se lee pegado —sin sombra de contacto real, sin reflejo, sin fundido con la
profundidad de campo— por más precisa que sea la posición. Reservarlo para cuando la variante B no converja después
de ajustar `HALO`/erosión, y decirlo al entregar.

## 7. Agregar cámaras o rendir otro logo (`blender/render_logo.py`)

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

## 8. Reproducir

```bash
cd ai-generations/2026-09-17_efeonce-logo-3d
./render-escalas.sh navy      # o blanco: 4 escalas + kit/ + hojas de revisión
blender -b --factory-startup --python blender/render_logo.py -- blender/grande-navy.json render/grande-navy --only 02-tres-cuartos-izquierda
node blender/postproceso.mjs render/grande-navy kit/grande-navy <hoja.png>
```

Render local en Blender (Cycles, Metal), sin costo de API. Desde 2026-09-24 el agente también puede abrir, guardar y
rendir escenas por el puente MCP local `higgsfield-use-blender` (`bl_open_project` / `bl_save_project` / `bl_render`);
el kit sigue siendo la ruta determinista por script. Estado en `higgsfield-provider`. Entrega a OneDrive según
[`social-media-studio/efeonce/ONEDRIVE_DELIVERY.md`](../../social-media-studio/efeonce/ONEDRIVE_DELIVERY.md).


## 🔴 Elegir la referencia correcta — contrato canónico

**Antes de usar este kit, carga el [contrato de selección de referencias](../../../../docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md).** Vale para el logo 3D,
el isotipo, la nave y las mascotas igual que para la ropa: los kits 3D traen **ocho poses o ángulos
cada uno**, con fondo de estudio y transparente, y el logo está resuelto además por **escala**
(pequeña, mediana, grande, monumental) **y color** (blanco, navy). **Ninguna vista hay que inventarla:
hay que elegir la que corresponde.**

Las tres reglas que gobiernan la elección:

1. **Arte plano → producir vistas del kit · pieza aislada → construir · pieza en uso → USAR en una
   escena.** Darlos al revés hace que el modelo reinvente la marca.
2. **Lo sensible se compone; el modelo sólo pone material y luz.** Un modelo no sostiene una marca:
   medido, cuatro pasadas sobre la misma pieza dieron cuatro logotipos distintos, y en prendas tres
   dieron tres emblemas y ninguno era el de Efeonce.
3. **Las proporciones se calculan del objeto real** —y para el 3D, la **escala** y la **luminancia**
   deciden qué variante entra: blanca para materiales claros, navy para oscuros.

**Y el QA de una marca es letra por letra** —«e», «f», nave, órbita con sus cortes, tres ventanas—:
una letra distinta obliga a regenerar, nunca a publicar.
