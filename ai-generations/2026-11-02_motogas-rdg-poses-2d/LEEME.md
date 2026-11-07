# El Rey del Gas — poses 2D en vector (piloto)

> Corrida del 2026-11-02. Decisión del operador: el personaje de Rey del Gas se queda en 2D (no 3D) y necesita
> poses nuevas. Cliente: Motogas, uso exclusivo de las cuentas Rey del Gas. Estado: **10 poses aprobadas por el operador y entregadas**; falta la aprobación del cliente.

## Fuente (en `fuente/`, copiada de OneDrive en solo lectura)

| Archivo | Qué es |
|---|---|
| `rdg-avatar-2019.ai` | `.ai` original del 2019 (`Archivo/Rey del Gas/VIEJOS/avatar.ai`), compatible PDF: personaje + fondo |
| `rdg-canon-2019.png` | `VIEJOS/Logo GAS ReydelGas PNG.png`, 1367×1775 con transparencia: **canon de forma** |
| `rdg-ref-gris-1600.png` | base vectorizada sobre gris `#808080`, referencia para las ediciones |

## Invariantes medidos en el canon

- Paleta exacta de 4 colores: negro `#000000`, rojo `#FF0000`, blanco `#FFFFFF`, amarillo corona `#FFC214`.
- Reparto en la silueta: negro 34,7 % · rojo 33,8 % · blanco 23,2 % · amarillo 8,3 %. El negro es la huella del contorno grueso.
- Contorno variable, más pesado abajo y a la derecha, con trazo negro separado bajo los zapatos.
- Corona de 5 puntas en dos filas, ladeada sobre el asa. Ojos en «8», pupilas ovaladas. Sonrisa en «D» con dientes y lengua.

## Método

1. Pose generada con `gpt-image-2.5-sunburst` (edición, `high`, 1600², clave personal) desde la base, sobre gris plano `#808080`
   (el blanco de guantes y zapatos se confundiría con un fondo blanco). Briefs en `brief/` (`_estilo.txt` + la pose).
2. `tools/vectorize.cjs`: escala ×2, clasifica cada píxel al color de paleta más cercano (o al fondo), traza cada máscara con
   potrace y apila silueta negra + rojo + amarillo + blanco. El negro visible entre colores es el contorno: sin costuras.
   Salida: SVG por capas (`silueta`, `rojo`, `amarillo`, `blanco`) y PNG transparente.

## Resultados del piloto

| Pose | Archivo | Reparto (negro/rojo/blanco/amarillo) | Nota |
|---|---|---|---|
| 00 base | `vector/rdg-2d-00-base-v01.svg` | 34,7 / 33,8 / 23,2 / 8,3 | La de 2019, vectorizada |
| 01 megáfono | `vector/rdg-2d-01-megafono-v01.svg` | 37,0 / 29,2 / 23,8 / 10,0 | Megáfono junto a la mejilla, boca libre |
| 02 corriendo | `vector/rdg-2d-02-corriendo-v01.svg` | 39,8 / 28,4 / 24,0 / 7,9 | Incluye líneas de velocidad y nubes |

Las dos poses salieron a la primera. Hoja: `qa/hoja-piloto-sobre-blanco.png`.

**Licencia:** el personaje es de la marca (2019, obra del equipo); no viene de stock.

## Entrega (2026-11-02)

El operador aprobó el piloto y se generaron las 7 restantes (señalando, apoyado, celular, saludando, pensando,
celebrando, guiño): las 7 salieron a la primera. Reparto de colores dentro del rango del canon (negro 34–40 %,
amarillo 7,5–10 %). `tools/entregar.cjs` recorta cada SVG a su silueta y arma las hojas en `entrega/`.
Copiado a OneDrive: `Produccion Grafica/1. Recursos Graficos/Personajes/Rey del Gas 2D (hoja de modelo)/v01/`
(`SVG/`, `PNG transparente/`, 3 hojas, LEEME). Canvas: tablero «El Rey del Gas · hoja de modelo 2D»; decisión 3 cerrada.
Costo: 9 imágenes `high` 1600² (clave personal).
