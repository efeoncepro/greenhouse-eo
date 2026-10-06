# Fotos cine del capítulo Creative Velocity (brochure Agencia Creativa, 2026-10-06)

Fichas en `fichas/`, plates en `plates/` (fuera de git). Todas pasaron por `cine-reviewer` antes y después de generar.

| Plate | Lámina | Estado | Por qué |
|---|---|---|---|
| `CV1b-misma-escala` | B1 «El mismo equipo. Otra escala.» | **En uso** | Nexa, Karo y Julio; la pieza se multiplica en una cinta de piezas. Derivó hacia el centro (falla 32): en la lámina la foto se corre 150 px a la derecha y su borde se funde con su propio negro (#020206) |
| `CV1-misma-escala` | — | Banco | Más deriva (reserva ~33 %) y la cara de Julio no calzaba con su referencia |
| `CV1c-misma-escala-expandida` | — | Descartado | `foto:expandir` dejó una costura visible en el relleno |
| `CV2b-cincuenta-piezas` | B2 «Una campaña. 50 piezas. Una sola marca.» | **En uso** | Karo muestra la pieza madre en la tablet; muro de una sola campaña |
| `CV2-cincuenta-piezas` | — | Banco | La tablet salió de dorso: se perdía la pieza madre |
| `CV3b-menos-tiempo` | B3 «Menos tiempo. La misma marca.» | **En uso** | Estelas más largas que CV3 (más impacto) |
| `CV3-menos-tiempo` | — | Banco (aprobable) | Estela suave |

## Capítulo Brand Systems (2026-10-06)

| Plate | Lámina | Estado | Por qué |
|---|---|---|---|
| `BS1b-del-manual-al-sistema` | B4 «Del manual al sistema.» | **En uso** | Karo con el manual cerrado; la identidad de una marca ficticia (dos cuadros) sube como sistema de luz; un solo punto naranja |
| `BS1-del-manual-al-sistema` | — | Descartado | El modelo dibujó el isotipo de Efeonce como «marca ficticia» cuatro veces, con cuatro puntos naranjas (el modelo nunca dibuja la marca; un acento por pieza) |

B6 «Este brochure es la prueba.» usa `assets/muro-la-orbita.jpg` (`build-muro.js`): 35 piezas reales aprobadas de La órbita
(referencias del deck + uniforme, nave y logo 3D), sin láminas con personas reales del equipo ni piezas de clientes.

## Capítulo Producción (2026-10-06)

| Plate | Lámina | Estado | Por qué |
|---|---|---|---|
| `RG1-estudio-portatil` | P1 «El estudio va donde estés.» | **En uso** | Run & Gun como estudio portátil profesional en una bodega: gimbal, cámara cine, panel LED, tubos, road cases (equipo actual, nada vintage) |
| `HB1-manos-y-modelos` | P2 «Manos y modelos, en el mismo set.» | **En uso** | Julio filma el producto real; la luz lleva la toma a cuatro variantes en pantalla; Nexa con el Spark de contenido supervisa. Derivó al centro: en la lámina se corre 150 px y se funde con su propio negro (#060910) |

Revisión previa de `cine-reviewer`: la deriva de este brochure se explica por geometría (con 85 mm a 3–4 m la escena no cabe en la mitad derecha); se corrigió ordenando la escena en profundidad y alejando la cámara [inferencia, a medir en más plates].

**Cambio de pose (comentario del operador, 2026-10-06):** «se repite la referencia de Karo mirando hacia el lado». La regla
de mirada hacia el texto de `deck-seccion` hacía el mismo gesto en tres plates (CV2b, BS1b, RG1). Se regeneraron con otra
acción: `RG1b-estudio-portatil` (filma en movimiento con el gimbal; P1) y `BS1c-del-manual-al-sistema` (mira hacia abajo
mientras abre el manual; B4). `RG1` y `BS1b` quedan en el banco. Lección para el casebook: en una serie, la mirada hacia el
texto se dosifica igual que el acento; repetida se lee como tic.

**Identidad de Julio (comentario del operador, 2026-10-06):** en `HB1` la cara «se ve muy IA» y con la frente agrandada.
Causa probable: el bloque IDENTITY insiste en «forehead tall and open, receding hairline» y el modelo lo exagera a
distancia media. `HB1b-manos-y-modelos` lo contrarresta en la escena (frente moderada y entradas como en `julio-ap-04`, cara
larga, lentes semi al aire, piel fotográfica sin suavizado) y acerca la cámara a 4,5 m. Candidato a fila del casebook y a
revisar el bloque IDENTITY de Julio.

**Set híbrido v2 (comentario del operador, 2026-10-06):** «quita mi foto y pon a Antonio… más punch, que muestre el mundo
híbrido de agentes y personas». `HB2-mundo-hibrido` (P2): escenario de producción virtual; el mundo generado en un muro LED
ilumina a las personas, la cámara y el producto reales; Antonio opera la cámara (Spark de reportes sobre el equipo), Nexa
dirige (Spark de contenido junto a su mano), más Sparks al fondo. Antonio es de la línea revenue: `foto:prompt` lo bloquea en
una ficha `linea: brand`; por pedido explícito del operador la ficha va sin `linea` (hoodie por kit). La cámara derivó a ~28 %:
en la lámina la foto se corre 130 px con el borde fundido a su negro (#060913). `HB1` y `HB1b` (con Julio) quedan en el banco.

## Talento embebido / staff augmentation (2026-10-06)

| Plate | Lámina | Estado | Por qué |
|---|---|---|---|
| `SA1-talento-adentro` | A19 «Tu equipo, con talento de Efeonce adentro.» | **En uso** | Karo arma la campaña del cliente en su mesa con dos personas de su equipo (extras sin marca, gris y carbón); una hoja de piezas de luz es la llave; el hoodie es el único azul. `cine-reviewer` corrigió antes de gastar: el monitor como llave anulaba la palanca `luz-motivada` y el acento quedaba de espaldas |

El GAZE incondicional de `deck-seccion` se contradice desde la escena (mirada a la pieza, no al texto) para no repetir el tic de mirada de la serie; candidato a campo `mirada` en el compilador.
