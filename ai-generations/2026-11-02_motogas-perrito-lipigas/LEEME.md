# El Perrito Lipigas — poses (piloto)

> Corrida del 2026-11-02. Pedido del operador: poses del perro mascota de Lipigas para las cuentas Lipigas Recoleta y
> Lipiestación (Motogas es franquiciado de Lipigas). Estado: **9 poses entregadas** (piloto aprobado por el operador); falta la aprobación de Lipigas.

## Quién es

«El Perrito Lipigas», sucesor de Spike (perro real, comerciales ~2004–2016, Ogilvy). La versión vigente es una **figura de
peluche realista fotografiada**. En Motogas aparece sólo en Recoleta, como protagonista fijo de la pieza de Ubicación, siempre
en la misma pose (sentado, saludando con la pata derecha) con accesorios de temporada encima.

**Derechos:** activo de marca de Lipigas. Motogas lo usa como franquiciado; las poses nuevas son derivadas y conviene que
Lipigas (marketing) las apruebe antes de publicar. Pedir también si existe un kit oficial de poses para franquiciados.

## Fuente (`fuente/`, copiada de OneDrive en solo lectura)

| Archivo | Qué es |
|---|---|
| `perrito-recorte-2024.png` | `Archivo/Lipigas Recoleta/Aislados/spike.png`, 324×440 con alfa: único recorte limpio |
| `perrito-pieza-primavera-2026.jpg` | Evergreen Primavera Recoleta, Ubicación: la cara más grande disponible |
| `ref-cuerpo-1600.png`, `ref-cara-detalle.png` | Referencias armadas para la edición |
| `ELEMENTOS_LIPIGAS.ai` | Lámina oficial de logos (págs. 1 y 9 usadas) |
| `lipigas-simbolo-alfa.png`, `lipigas-wordmark-alfa.png` | Símbolo a una tinta y logotipo, extraídos del `.ai` (`tools/simbolo.cjs`, `tools/wordmark.cjs`) |

## Método

1. **Base en alta** (`base/`): GPT Image 2.5 Sunburst, edición `high` 1600², con el recorte + la cara como referencias.
   Brief en `brief/_personaje.txt`: figura de peluche (no perro real), pelaje café con fuego, ojos de vidrio ámbar,
   collar amarillo y placa plateada en forma de cilindro **en blanco**.
2. **Poses** (`poses/`): misma edición, desde la base + la cara.
3. **Placa** (`placa/`, `tools/placa.cjs`): el logo Lipigas oficial (símbolo sobre logotipo) se compone sobre la placa con
   multiplicación, así el metal cepillado se ve a través como un grabado. El modelo no dibuja el logo.
4. **Recorte** (`recorte/`): `pnpm ai:image:rmbg` + `tools/defringe.cjs`, que quita el halo blanco del fondo en el pelo.

## Piloto

| Pose | Resultado |
|---|---|
| 00 base | Fiel al recorte de 2024, ahora a 1600 px |
| 01 cabeza ladeada | Para «¿Sabías qué?» |
| 02 apuntando | Pata extendida a la derecha, deja espacio para la tabla |

Hoja: `qa/hoja-piloto-con-original.png` (primera columna = el original).

**Notas:** la placa del original usa una versión anterior del logo (corazón relleno); aquí va el logo vigente. Sobre
fondos oscuros queda un leve brillo en las puntas del pelo; sobre blanco y amarillo no se ve.
Costo: 3 imágenes `high` 1600² (clave personal).

## Entrega (2026-11-02)

El operador aprobó el piloto; se generaron las 6 restantes (trotando, echado, celular, megáfono, celebrando, mirando
arriba), todas a la primera. Logo en la placa (`tools/placa.cjs`, logo al 80 % del ancho) con cajas medidas por pose.

**Lo que costó el recorte:** `ai:image:rmbg` sobre fondo blanco borra lo blanco del sujeto (pantalla del celular, cono
del megáfono) y deja semitransparente la placa. Arreglo, en este orden:
1. `_fondo-gris.txt`: edición del modelo que cambia sólo el fondo a gris (`fuente-recorte/*-gris-modelo.png`; la
   geometría se conserva y las cajas de la placa calzan). Se graba la placa encima y se recorta desde ahí.
2. El gris del fondo se parece al metal: `tools/reponer-placa.cjs` repone la placa opaca con una máscara geométrica
   (por fila, del primer al último píxel de metal) y devuelve el pelo con color que el recortador perdió alrededor.
3. En «echado» se unen los dos recortes (blanco y gris) con `tools/unir-recortes.cjs`.
`tools/defringe.cjs --fondo <nivel>` quita el halo del fondo en el pelo. Queda un resto mínimo junto al cuello de la
placa en 04 y 05, visible sólo muy ampliado.

Copiado a OneDrive: `Produccion Grafica/1. Recursos Graficos/Personajes/Perrito Lipigas (hoja de poses)/v01/`.
Costo total: 9 imágenes de pose + 3 ediciones de fondo, `high` 1600² (clave personal).
