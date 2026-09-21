# Nexa — props y ecosistema tecnológico

> **Decisión del operador, 2026-09-21:** *«Nexa es tecnológica… sus accesorios deben ser siempre tecnología
> premium»*. No está en el Character Bible de febrero, que cubre joyas y ropa pero no los **objetos que
> Nexa toca**. Este documento los canoniza.
>
> **Por qué importa y no es decoración:** el valor §1.3 del Bible es **«tecnología con criterio»** y el §11.8
> dice que Nexa *«sabe que ella misma es producto de IA gobernada»*. Los objetos son el lugar donde eso se ve
> sin decirlo. Un portátil genérico o un reloj de agujas la contradicen en silencio, igual que una reunión
> importante en hoodie dice lo contrario de lo que la foto cuenta.

## La regla, antes que la lista

**Siempre la generación vigente, nunca un modelo descontinuado.** Esta lista nombra **familias**, no números
de modelo, justamente para que no envejezca: al producir, se usa la versión actual de cada familia. Un
dispositivo obsoleto en manos de Nexa dice que no está al día, que es lo contrario de lo que el personaje
sostiene.

**Corolario:** el **iPod** está descontinuado desde 2022. Aunque aparezca en un encargo, no entra: su lugar
lo ocupan iPhone y AirPods.

## 1. Lo que lleva encima

| Rol | Qué es | Notas de dirección |
|---|---|---|
| **Reloj** | **Apple Watch** — caja cuadrada de esquinas redondeadas en aluminio o titanio, pantalla rectangular encendida, correa deportiva o tejida en navy o grafito | 🔴 **Reemplaza al reloj analógico de §5.1.** Ultra para terreno y exteriores; Series para oficina y estudio. **Nunca** un dial redondo con agujas |
| **Teléfono** | **iPhone Pro**, titanio natural o negro | En mano, sobre la mesa boca abajo, o asomando del bolsillo del blazer |
| **Auriculares** | **AirPods Pro** en uso · **AirPods Max** para edición y escucha crítica | Los Max son props de estudio, no de calle |
| **Tablet** | **iPad Pro + Apple Pencil** | Para revisar piezas, firmar, anotar sobre un storyboard |

## 2. Lo que usa para trabajar

| Rol | Qué es | Cuándo |
|---|---|---|
| **Portátil** | **MacBook Pro** | Terreno, café, home office, cualquier escena con laptop |
| **Escritorio** | **Mac Studio** o **iMac** con pantalla grande | The Studio y Home Base (§8) |
| **Fotografía** | Cuerpo profesional **Sony α** o **Canon EOS R**, generación vigente, con óptica luminosa | Cuando Nexa es quien fotografía. Nunca una réflex antigua ni una cámara sin marca legible |
| **Video de mano** | **DJI Osmo Pocket** (gimbal de bolsillo) · **DJI Osmo Action** para terreno | El Pocket es el prop de «está grabando mientras camina» |
| **Audio de campo** | **DJI Mic 3** · alternativa **lavalier Rode** | El transmisor visible en la solapa es un buen detalle de oficio |
| **Podcast** | Micrófono **Shure** sobre brazo articulado | Es el estándar del registro podcast del canon fotográfico |

## 3. Cómo entran en la escena

- **Encendidos y en uso, nunca de adorno.** Una pantalla apagada sobre la mesa es atrezzo; una pantalla con
  trabajo real encima es mecanismo. El canon documental pide obra a la vista y estos objetos son la obra.
- **La marca del dispositivo no se fuerza.** No se pide el logotipo: se pide la **silueta** reconocible
  —caja del smartwatch, forma del portátil, el brazo del micrófono— y se deja que la marca aparezca o no.
  Vale aquí la misma ley del emblema: un logo pequeño que el modelo dibuja de memoria sale inventado.
- 🔴 **Ningún logotipo de tercero debe quedar legible en una pieza publicable.** Reconocible por forma, sí;
  con la marca escrita y nítida, no. Es la misma regla que gobierna los kits de marca propios, y además
  evita endosar a un tercero sin acuerdo.
- **Premium se lee en el material, no en el precio.** Aluminio, titanio, vidrio limpio, cable ordenado.
  Un escritorio con cables enredados anula el mensaje aunque el equipo sea el correcto.
- **Un objeto por escena manda.** Igual que el acento de color: si en la misma foto hay cámara, micrófono,
  iPad y portátil, ninguno significa nada.

## 4. Qué NO es Nexa

Portátiles genéricos de plástico · réflex antiguas · auriculares gamer con luces · cables enredados ·
pantallas apagadas como decoración · dispositivos descontinuados · adhesivos de marcas en el portátil ·
más de tres dispositivos en el mismo cuadro.

## Verificación

Al cerrar una pieza con props tecnológicos, mirar al 100 %: que el dispositivo sea de la familia correcta,
que esté **en uso**, que ningún logotipo de tercero quede legible, y que el material se lea premium. Un
render correcto de un objeto equivocado sigue siendo un objeto equivocado.

## Relación con el resto del canon

- El **smartwatch** es ahora uno de los cuatro signature elements: viaja en el bloque `accesorios` del
  catálogo ([`build-prompt.mjs`](../../../scripts/foto/build-prompt.mjs)) y por lo tanto en toda pieza con
  Nexa.
- El resto son **props de escena**: se declaran en la `escena` de la ficha, no en el bloque de identidad.
- Ficha del personaje: [`NEXA_CHARACTER_BIBLE_FICHA_V1.md`](./NEXA_CHARACTER_BIBLE_FICHA_V1.md) ·
  documento de marca: [`NEXA_CHARACTER_BIBLE_V1.md`](../social/NEXA_CHARACTER_BIBLE_V1.md).
