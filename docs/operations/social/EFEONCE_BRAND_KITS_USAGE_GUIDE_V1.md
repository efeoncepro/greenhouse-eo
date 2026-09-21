# Guía de uso de los kits de marca de Efeonce en imagen y video

> **Tipo de documento:** Guía operativa para agentes · **Versión:** 1.1 · **Creado:** 2026-09-17 por Claude · **Actualizado:** 2026-09-17
> **Método de producción de los kits:** [kits de prenda y merch](2026-09-17-hoodie-efeonce-garment-reference-kit.md) ·
> [kit 3D del logo](2026-09-17-efeonce-logo-3d-reference-kit-production-method.md) ·
> [bibliotecas 3D y vestuario](PARTNER_MASCOT_POSE_LIBRARIES.md)

Esta guía responde una sola pregunta: **cómo usar los kits ya producidos para que la marca no se reinterprete** en una
imagen o en un video. Los kits son la fuente de forma; el modelo aporta escena, luz y atmósfera.

## 1. Qué kits existen y dónde

Todos viven en OneDrive `5. Contenidos/`:

| Kit | Carpeta | Qué fija |
|---|---|---|
| Logo Efeonce 3D | `13- Branding/Logo Efeonce 3D/` (navy y blanco × 4 escalas) | Forma del logotipo como objeto físico |
| Nave (isotipo) 3D | `13- Branding/Nave Efeonce 3D/` | Forma del isotipo como objeto |
| Vestuario | `13- Branding/{Hoodie,Polo,Chaqueta,Gorra} Efeonce/v01/` | Prendas del equipo |
| Credencial | `13- Branding/Lanyard Efeonce/v01/` | Lanyard, yoyo, portacarnet y carnet |
| Hoja maestra | `13- Branding/efeonce-kit-marca-fisica-v01-A4.png` | Vista general y reglas |
| Personas del equipo | `13- Branding/Equipo/<Nombre>/v01/` | Identidad de una persona real |
| Mascotas de partners | `14. Mascotas de partners/` | Clawd, Codex, sprocket |
| Nexa | `10. Nexa (Influencer IA)/` | Identidad y poses de Nexa |

Cada kit trae un **manifiesto** que dice qué es cada vista y **cuándo usarla**. Leerlo antes de elegir.

## 2. Cómo elegir la referencia

1. **Por el ángulo de la toma.** De espaldas → vista de espalda; tres cuartos → la que corresponda.
2. **Por cómo se usa la pieza.** Chaqueta abierta → vista de cierre abierto. Dos prendas (polo bajo chaqueta) → las dos
   como referencias separadas.
3. **Por el contexto.** Frente a cliente: polo. Formal: polo o camisa con softshell. Evento: bomber o polera.
   Producción y terreno: hoodie, gorra o trucker.
4. **Por luminancia, cuando cambia el material.** Render blanco para materiales claros (acero, aluminio, vidrio);
   render navy para oscuros o para el color de marca.
5. **Por contraste con el sujeto.** Sobre set oscuro con hoodie navy, el logo va blanco; el navy pide fondos claros.

## 3. Imágenes

**Contrato:** la referencia fija la **forma**; el prompt fija la **intención** (material, montaje, escena, cámara).

```bash
pnpm ai:image --model gpt-image-2.5-sunburst --quality xhigh --size 1152x1440 --format png \
  --image <vista-del-kit> [--image <otra-pieza>] [--image <referencia-de-persona>] \
  --prompt-file <brief.txt> --out <salida.png>
```

- **Orden de referencias:** primero la pieza cuya forma no se negocia, después las demás piezas, después la persona.
- **Toda prenda que se vea entra como referencia.** Describirla en palabras no basta: una chaqueta sólo nombrada en
  el prompt volvió lisa, sin su emblema bordado, aunque el emblema estaba escrito. Si hay dos prendas superpuestas,
  van las dos, cada una con la vista que corresponde a cómo se usa.
- **Si la pieza lleva un emblema**, sumar el **isotipo oficial** como referencia: el bordado se espeja con facilidad.
- **Texto exacto nunca se genera.** Estampas, credenciales y cualquier lockup se componen con script y entran como
  referencia. La firma de la pieza sigue siendo el SVG oficial compuesto con AXIS.
- **Vista que debe salir sin arte** (por ejemplo el reverso liso de una cinta): generar **sin referencias**, describiendo
  que no hay impresión.
- **Retrato para una credencial:** un retrato corporativo ya viene corto; recortarlo cuadrado sin más deja la cara
  tocando el borde del círculo. Se gana aire extendiendo el borde superior de la propia foto, nunca acercándose más.
- **Personas reales:** nunca sólo retratos —el cuerpo se deforma y la cabeza sale grande—; sumar una foto de cuerpo
  entero, encuadrar desde bajo las rodillas con lente larga y declarar la anatomía. Y sólo con su consentimiento.
- **Accesorios puestos:** declarar el **calce** (gorra de perfil bajo, ceñida, visera corta), o el modelo los escala de
  más.
- **Tamaño de un emblema o aplicación:** anclarlo a algo del mismo cuadro («un tercio del panel del pecho», «apenas
  más ancho que el carnet que cuelga»). En centímetros el modelo lo dibuja del doble.

**QA obligatorio antes de usar la pieza:** letra por letra contra la referencia («e», «f», nave, órbita con sus cortes,
tres ventanas), color sin deriva, emblema sin espejar —revisado **con recorte al 100 %**, porque en una hoja de
contacto no se ve—, y proporción humana coherente.

**Componer firma y texto sobre la foto** (caso «¿Claude o Codex?», 2026-09-17):

- **Logo en un desenfoque de primer plano: medir antes de añadir.** Casi siempre el lecho desenfocado ya está en la
  foto (la mesa, el mostrador). En el caso fuente, a 135 mm y f/2,8, el borde inferior de la mesa medía gradiente
  máximo **5**, igual que el fondo, contra **314** del rostro; el logo se apoyó ahí con **11,36:1** sin añadir nada,
  tras cinco objetos añadidos rechazados por forzados. Protocolo y reglas de forma:
  [marca dentro de la escena](../../../.claude/skills/social-media-studio/references/brand-in-scene.md), sección
  «Primer plano desenfocado como lecho de la marca».
- **Jerarquía: dos tamaños en el mismo eje son un solo nivel.** Titular y subtítulo centrados uno bajo otro se leen
  planos aunque difieran en tamaño. Lo que lo resuelve es darle **una función distinta a cada pieza**: titular
  dominante, cita al margen fuera de eje (aparte humano) y marca sólo abajo. Agrandar el titular no lo arregla.
- **El contraste de una línea se mide donde queda, no donde se diseñó.** La misma cita, mismo color y tamaño, dio
  **1,17:1** bajo el titular (caía sobre el pelo) y **10,63:1** al margen izquierdo. Medir contra el píxel más claro
  de la zona final.
- **Cada formato se genera nativo.** 9:16 y 16:9 no se recortan del 4:5: el recorte se come el espacio del titular, y
  la disposición cambia por formato (en horizontal la cita baja y el logo va al extremo opuesto para no chocar con la
  coronilla).

## 4. Video

El video hereda todo lo anterior y agrega tres reglas propias. Motor y costos:
[guía de selección de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) y la skill
`motion-design-studio`; ejecución con `pnpm ai:fal`.

1. **El primer cuadro es una imagen ya aprobada.** Nunca se le pide a un modelo de video que invente la prenda, el logo
   o la credencial: se produce la imagen con los kits, se verifica con el QA de arriba y esa imagen entra como frame
   inicial (`image-to-video`). Si el plano necesita un cuadro final, también se produce y se verifica antes.
2. **La marca no se mueve dentro del plano generado.** Un logotipo que rota, se acerca o cruza el cuadro se deforma
   cuadro a cuadro. Si la marca tiene que animarse, se anima de forma determinística —composición con AXIS o motion
   sobre el render del kit— y se integra al video; el modelo aporta el entorno, no el movimiento del logo.
3. **Planos cortos y movimiento contenido.** Preferir 3–6 segundos, cámara con deriva suave y el sujeto sin giros
   bruscos. Cuanto más cambia el ángulo, más se aleja la prenda o el emblema de su forma.

**Verificación del video:** revisar el primer cuadro, el último y al menos dos intermedios con el mismo QA de imagen;
si un cuadro deforma el emblema o el texto, se recorta el plano o se reemplaza por el camino determinístico. Un video
con la marca deformada no se entrega aunque el resto se vea bien.

**Qué no hacer en video:** pedirle texto al modelo, mostrar la credencial en primer plano con movimiento, o animar la
estampa de espalda. Esos elementos se componen.

## 5. Reglas duras

- La **forma** de marca —logo, isotipo, estampa, carnet— nunca se le deja inventar al modelo.
- El **texto exacto** se compone, no se genera.
- En prendas formales el emblema va **bordado** y sin eslogan; la estampa de espalda va en hoodie y chaquetas, y el
  polo también la lleva desde el 2026-09-21, bordada (ver delta al final).
- Sobre navy impreso, el prefijo del eslogan va en **gris claro `#C8CEDA`**; el gris de marca no resuelve impreso. Es
  excepción de sustrato, no un cambio de color de marca.
- Si la pieza **ya existe** (una foto real), esa foto es la fuente de construcción y las variantes se piden sobre ella.
- Declarar también **lo que la pieza no lleva** (trasera sin bordado, espalda limpia): el modelo tiende a repetir el
  logo donde no va.
- Ninguna persona real se genera sin su consentimiento.

## 6. Cierre

Antes de dar una pieza por lista: QA al 100 %, nombre y ubicación en la carpeta que corresponde, manifiesto
actualizado si la pieza entra a un kit, y registro en la bitácora de la corrida. Publicar o programar requiere
autorización explícita del operador.


## Delta 2026-09-21 — qué asset del kit se usa para qué

**Un kit tiene tres clases de asset y no son intercambiables.** Confundirlos es lo que hace que el
modelo **reinvente la marca**:

| Asset | Para qué sirve | Ejemplo |
|---|---|---|
| **Arte plano** | **PRODUCIR** las vistas del kit | `ref/arte-cinta.png`, `ref/arte-carnet-*.png` |
| **Pieza aislada** (transparente) | **CONSTRUIR** un armado nuevo | `…-01-frente-…-transparente.png` |
| **Pieza PUESTA / producto terminado** | **USAR** la pieza en una escena | `…-04-puesto-…`, `out/prueba-julio.png`, `…-14-conjunto-deterministico-…` |

**Medido el 2026-09-21.** Para vestir a alguien con el lanyard se le pasó primero una descripción del
logotipo (borrón con forma de flecha), después el arte plano (ilegible) y sólo funcionó con la **foto
del producto terminado**. En la gorra pasó lo mismo: el asset que resolvía el problema —la prueba en
persona, con el logotipo legible y el emblema bien orientado— llevaba días en el kit sin usarse.

### Y si la pieza lleva marca, se compone: no se genera

Para una pieza con marca, arte exacto o texto, el camino es **armarla determinísticamente** y pedirle
al modelo **sólo el acabado** —material y luz—, nunca el dibujo. Comando: **`pnpm foto:lanyard`**.
Método completo y medido: `ai-generations/2026-09-21_lanyard-deterministico/LEEME.md`.

**Las proporciones se calculan del objeto real, no se estiman:** la unidad del patrón de la cinta mide
7,05 veces su ancho y el yoyo 1,6 veces ese ancho (32 mm contra 20 mm reales). Puestas a ojo, el
operador detectó las dos a la primera.


🔴 **ANTES de generar una pieza con un asset de marca —ropa corporativa, lanyard, merch, logo 3D,
isotipo, nave o mascotas— carga el [contrato de selección de referencias](../EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md).** Hay **279 archivos en
10 kits**: el problema nunca es que falte la vista, es **elegir la correcta**. Resume tres reglas:

1. **Tres clases de asset, no intercambiables.** Arte plano → **producir** vistas del kit · pieza
   aislada → **construir** · **pieza en uso / producto terminado → USAR en una escena**. Darlos al
   revés hace que el modelo **reinvente la marca**.
2. **Lo sensible se compone; el modelo sólo termina.** Toda marca, texto exacto o arte oficial se arma
   determinístico y al modelo se le pide **sólo material y luz**. Un modelo no sostiene una marca:
   cuatro pasadas sobre la misma pieza dieron cuatro logotipos distintos.
3. **Las proporciones se calculan del objeto real**, nunca a ojo.

Y **abre el `LEEME.md` y el manifiesto del kit antes del prompt**: su `cuando_usarla` dice qué vista
corresponde, y si el kit trae **prueba en persona**, ésa es el punto de partida.


> 🔴 **Delta 2026-09-21 — el polo YA NO lleva la espalda limpia.** El operador **revirtió** su decisión
> del 2026-09-17: desde hoy el polo lleva en la espalda el **logo completo + «Empower your Growth»**,
> igual que el hoodie y las chaquetas, pero **BORDADO** en puntada satinada con relieve —no
> serigrafiado—, porque es la prenda más formal frente a cliente y su emblema de pecho ya es bordado.
> Motivo: de espaldas, un polo sin marca no se reconoce como Efeonce. El arte se compone con
> `ai-generations/2026-09-17_polo-efeonce/estampa-espalda.mjs` (hilo blanco sobre el navy, hilo navy
> sobre el blanco) y las cinco vistas de espalda están rehechas como `-v02-`; **las `-v01-` de espalda
> quedan obsoletas**.
