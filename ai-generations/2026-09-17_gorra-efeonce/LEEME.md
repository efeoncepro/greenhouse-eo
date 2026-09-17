# Gorra Efeonce — variantes y kit (2026-09-17)

La gorra **ya existía**: es el héroe visual de la landing `/contacto` del sitio público
(`contacto-careers-cap.png`), royal con el logotipo completo bordado en blanco. Se descargó como
`ref/gorra-oficial.png` y es la **única fuente de construcción**: seis paneles, visera curva, botón forrado, dos
ojetillos por lado y cierre de cinta.

## Variantes (decisión del operador: se siguió la recomendación)

| Variante | Rol |
|---|---|
| Royal con logotipo | La existente; continuidad con el sitio, producción y regalo |
| **Navy con logotipo blanco** | **Principal** del equipo; combina con polo y softshell |
| Navy sólo con isotipo | Alternativa discreta frente a cliente |
| Blanco con logotipo navy | Verano y eventos |
| Trucker navy con malla blanca | Terreno, grabación y exteriores |

## Kit (`final/`, 12 vistas + la referencia del sitio)

De la principal: héroe en tres cuartos, frente recto, lateral, trasera con el cierre, macro del bordado y cenital.
De las alternativas: héroe y trasera. Transparentes en todas menos el macro. Manifiesto
`efeonce-gorra-manifiesto.json` con **cuándo usar** cada vista.
Entrega: OneDrive `5. Contenidos/13- Branding/Gorra Efeonce/v01/`.

## Pruebas en persona

`out/prueba-nexa.png` y `out/prueba-julio.png`: la gorra navy sobre el polo navy, con las referencias de cada persona
y, en la persona real, al menos una foto de cuerpo entero. El logotipo se mantiene legible y el emblema conserva su
orientación.

**Corrección del operador: «muy grandes las gorras».** En el primer intento la gorra se leía de talla grande y dominaba
la cara. La referencia es una foto de producto, así que el modelo la escala de más si no se declara el calce. Se
resolvió describiendo el ajuste, no el objeto:

- talla adulta normal, calce **ceñido** y perfil **bajo**, nunca oversized;
- de la ceja a lo alto de la copa, alrededor de **un tercio** de la altura de la cabeza;
- la banda apoya justo sobre las cejas y los laterales abrazan sin hueco en las sienes;
- visera corta y curva, del ancho de la frente; nunca visera larga y plana;
- el logotipo se lee pequeño en los paneles, sin estirarse.

## Notas de método

- La construcción sale de una **foto real existente**, no de una descripción: cuando la pieza ya existe, esa foto es
  la referencia y las variantes se piden como cambio de color o de aplicación, igual que con el segundo color de un
  render 3D.
- La trasera se declara **sin bordado**; si no, el modelo tiende a repetir el logotipo detrás.

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 14 generaciones.
