# Física del clímax 10 → 11a → 11b (2026-10-22)

Revisión profunda después de que Julio rechazó el borrador donde la lata rodaba por la mesa. Sin generar nada.
Diagrama: `trayectoria-lata-11a.png` (sobre el plano 11a aprobado) y su generador `trayectoria.cjs`.

## El evento, según los planos y el storyboard

- **Storyboard (fila del 10):** «La lata sale disparada hacia Paula». Biblia §5: la pantalla se abre como un portal de
  luz y **el vidrio queda intacto** (por eso el portátil está entero en el 12 y el 17). Julio dijo que el vidrio se
  rompe: decisión abierta, ver abajo.
- **10 (eje A, lado de Paula):** la lata sale de la pantalla de punta hacia la cámara, es decir, hacia Paula, con agua y
  rodajas de naranja.
- **11a (eje B, detrás de Antonio):** el mismo instante desde atrás. La lata acaba de salir de la pantalla (que mira a
  Paula) y aparece sobre el borde superior de la tapa.
- **11b:** la lata le pega y rebota junto a la cabeza; el agua la empapa.

**Mi error del borrador anterior:** convertí el evento en una lámina de agua sobre la mesa con la lata dentro; la lata
rodó. La lata es un **proyectil en el aire**: nunca toca la mesa antes de pegarle a Paula.

## Escala real (medida en el plano 11a)

- Cabeza de Paula ≈ 23 cm ≈ 200 px a ~2,3 m del lente → f ≈ 2000 px.
- Tapa del portátil ≈ 21 cm ≈ 250 px → está a ~1,7 m del lente. **Entre la pantalla y el pecho de Paula hay ~0,6 m**,
  no 1,4 m.
- La lata (15,7 cm) justo delante de la pantalla debe medir **~180 px**; en el pecho de Paula, **~135 px**
  (≈0,7 cabezas, coherente con las 0,8–0,9 del 11b después del rebote, un poco más cerca de cámara).
- **En el 11a aprobado la lata mide ~300 px: ~1,7 veces su tamaño físico.** La regla de «1,7 cabezas» que yo fijé
  suponía la lata a 1 m del lente, y no es así: la tapa, que está más cerca que la lata, mide menos que ella.
  Consecuencia: una lata gigante con la base tapada por el portátil **se lee como una lata parada en la mesa detrás del
  portátil**. Así la leyó un subagente y así la animaron los modelos (lata quieta, montículo de agua alrededor).

## Trayectoria

| Tramo | Tiempo | Qué pasa |
|---|---|---|
| Vuelo | 0 → 0,20 s (5 cuadros) | Sale sobre el borde de la tapa y va por el aire al pecho, en un arco leve hacia arriba (la pantalla está más baja que el pecho), achicándose de ~180 a ~135 px. Gira sobre sí misma (~1,5 vueltas por segundo): en el 10 iba de punta, en el 11a casi vertical, en el 11b inclinada. |
| Golpe | 0,20 s | Le pega en el pecho. Paula reacciona por reflejo recién 0,05–0,1 s después: ojos cerrados, cabeza atrás. |
| Rebote | 0,20 → 0,48 s | Sube hacia su derecha (izquierda del cuadro) hasta la altura de la cabeza (≈0,6 m sobre la mesa), como en el 11b. |
| Caída | 0,48 → 0,75 s | Cae a la mesa a la izquierda de Paula, rebota poco y queda **acostada**, quieta. |

Velocidad de salida ≈ 3–4 m/s. A 24 fps y 1/48 s, en vuelo se corre ~7 cm por cuadro: la etiqueta se borronea en el
vuelo y se lee en el ápice del rebote y en la mesa.

## El agua

- Sale de la pantalla **junto con la lata, en abanico hacia Paula** (no radial, no hacia los costados ni hacia la
  cámara). Es un pulso: la descarga dura ~0,2 s.
- La parte rápida viaja con la lata y le pega en el pecho ~1–2 cuadros después de la lata; sube en corona hasta la cara
  (0,2–0,45 s) y cae con gravedad antes de 1 s.
- La parte lenta cae sobre el teclado y la mesa frente al portátil (lado de Paula) y corre como lámina delgada hasta el
  canto de su lado, mojándole el regazo.
- Después: pelo oscuro pegado, suéter oscurecido y pesado, goteo, mesa con película de agua, rodajas en la mesa.
  **Nada se seca.**
- **En el 11a aprobado el agua es un géiser radial** alrededor de la base de la lata, con rocío hacia la derecha y por
  detrás de la mano de Paula. Eso contradice la dirección del evento.

## Paula y Antonio

- Paula ya está sorprendida en el 11a (lo vio salir en el 10, ~0,3 s antes): boca abierta, mano levantada. No alcanza a
  moverse antes del golpe.
- Antonio no se mueve, no parpadea con el golpe y queda seco.

## Cámara y montaje

- **Cámara fija** con el encuadre del 11a y un temblor mínimo en el impacto. **Sin dolly:** en los borradores el dolly
  hacía el trabajo y la lata parecía quieta.
- Una sola toma con todo el evento. El acercamiento del 11b se hace en edición, con un punch-in sobre la misma toma en
  el golpe: continuidad garantizada. El **00 sale de esa toma**; el 11b/00 actual tiene ventanal de fondo, que la
  biblia prohíbe en el eje B.
- Si el modelo estira el vuelo, se acelera sólo el vuelo en edición.

## Por qué fallaron los modelos y qué lo evita

| Falla vista | Causa | Contramedida |
|---|---|---|
| Lata de pie, flotando o subiendo | Lata 1,7× de grande con la base tapada; géiser radial | Cuadro inicial corregido: lata a ~180 px, claramente en el aire sobre la tapa, inclinada a mitad de giro |
| Agua quieta o en montículo | Géiser radial congelado; «wave», «crest» | Abanico direccional hacia Paula; describir pulso y gravedad |
| Lata rodando por la mesa | Mi cuadro inicial con la lata en una lámina | Proyectil en el aire; «nunca toca la mesa antes de pegarle» |
| Cámara se mueve, la lata no | Dolly pedido | Cámara fija |
| Corte oculto | Cuadro final a mitad de la acción | Sin cuadro final |
| Paula se seca | Vuelve al estado del cuadro inicial | Pedir explícitamente empapada hasta el último cuadro; QA de luminancia del pelo y del suéter |
| Brillo bajo la lata | «rides», luz cálida en la base | Negar fuego, brillo o propulsión |

## Decisiones que necesita Julio

1. **Corregir el 11a como cuadro inicial:** lata al tamaño físico (~60 % de la actual), claramente en el aire, y agua en
   abanico hacia Paula en vez del géiser. Paula, Antonio, el portátil y el fondo quedan idénticos (inpaint con
   delta 0). Cambia un plano aprobado.
2. **Vidrio intacto (biblia) o roto (lo que dijo Julio).** Si se rompe, el 10, el 12 y el 17 deben mostrar la pantalla
   rota.
3. **El 00 sale de la toma nueva** y reemplaza al 11b/00 actual.
