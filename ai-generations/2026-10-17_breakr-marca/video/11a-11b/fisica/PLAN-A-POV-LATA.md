# Plan A: POV de la lata, terminando en el 00 (2026-10-22)

Decisión de Julio: cámara pegada detrás de la lata, con la lata adelante. La escena final es **exactamente** el 00 /
11b aprobado (Paula empapada, ojos cerrados, gritando, la lata arriba a la izquierda junto a su cabeza; es el mismo
cuadro de «¿Cómo llegamos aquí? Rebobinemos»). El 00 manda: su fondo (tabique claro con ventanas) pasa a ser el fondo
del clímax y se anota en la biblia.

## Secuencia

| # | Plano | Cámara | Qué pasa | En pantalla |
|---|---|---|---|---|
| 1 | 10 (existe) | Eje A, a ras de mesa del lado de Paula | La lata sale de la pantalla hacia la cámara | 1,0 s |
| 2 | **A · POV de la lata** (nuevo) | Pegada detrás de la lata, a la altura de la pantalla, mirando a Paula | Salimos de la pantalla con la lata. La lata queda fija en primer plano (abajo al centro, de espaldas, inclinada hacia ella, BREAKR legible en el costado) y Paula crece rápido. El agua viaja con nosotros y algunas gotas golpean el lente. Termina con la lata a centímetros de su pecho y sus ojos abiertos de par en par | ~1,5 s |
| 3 | **B · Impacto** (nuevo) | Eje B, el encuadre exacto del 00 | La lata y el frente de agua llegan desde el portátil a su pecho, el agua sube en corona, ella cierra los ojos y grita, y la lata rebota hacia arriba a la izquierda, junto a su cabeza. **El último cuadro es el 00** | ~1,0 s |
| 4 | 00 congelado | — | Se cierra el círculo con la apertura del anuncio | 0,5 s |

El plano 2 y el 3 van en **cámara lenta de alta velocidad, pareja para todo** (lata, agua, pelo, cara), como en los
comerciales de bebidas filmados a 1.000 cuadros por segundo. Es lo físicamente honesto para un evento de 0,2 s; nada se
estira por separado. La rampa a velocidad real, si se quiere, va en edición después del 00.

## Física por plano

- **POV de la lata:** la cámara va montada en el proyectil. La lata no cambia de tamaño ni de posición en el cuadro
  porque viaja con nosotros: lo que cambia es Paula, que pasa de plano medio a primer plano en ~60 cm de recorrido. El
  agua sale de la pantalla con nosotros y va hacia adelante y un poco hacia abajo (gravedad); las gotas que chocan con
  el lente se quedan pegadas y escurren. El borde del portátil y la pantalla quedan atrás en el primer cuadro (bordes
  desenfocados). Antonio no aparece: está detrás de nosotros.
- **Impacto en el encuadre del 00:** la lata llega desde el lado del portátil (abajo a la derecha del cuadro) al centro
  de su pecho, en la misma dirección que el POV (alejándose de la cámara). Golpe, corona de agua hasta la cara, la
  cabeza va hacia atrás, la lata rebota hacia su derecha (izquierda del cuadro) hasta la altura de la cabeza: es la
  posición del 00. Antonio quieto y seco.
- **Continuidad en el corte 2 → 3:** el mismo instante (la lata a centímetros del pecho), la misma dirección (hacia
  Paula, alejándose de cámara), la misma Paula seca y sorprendida, el mismo fondo y la misma luz.

## Cuadros a construir (stills, antes de animar)

1. **A-inicio (POV de la lata, primer cuadro):** imagen nueva con `pnpm ai:image` (GPT Image 2.5 Sunburst), con el 00
   como referencia de sala, luz y Paula, el 11a corregido como referencia de Paula seca y sorprendida, y la lata
   aprobada. Lata grande en primer plano, de espaldas e inclinada; Paula a ~70 cm, seca, ojos muy abiertos, boca
   abierta, vaso en la mano derecha, mano izquierda levantándose. Se le repone la cara aprobada con
   `pnpm creative:face:restore`.
2. **A-final (último cuadro del POV, opcional):** la lata a centímetros del pecho, Paula en primer plano. Sólo si el
   primer borrador deriva sin él.
3. **B-inicio (impacto, primer cuadro):** el encuadre exacto del 00, editado: Paula **seca**, ojos abiertos y
   sorprendida, la lata delante de su pecho llegando desde el portátil, la lengua de agua detrás de la lata desde la
   pantalla, mesa seca. Portátil, taza, mano y fondo idénticos al 00 (inpaint con delta 0 fuera de la zona).
4. **B-final = el 00 aprobado, tal cual**, desde el plate limpio `planos/final/00-gancho-congelado.png` (sin el
   texto «¿Cómo llegamos aquí? Rebobinemos» ni ningún componente: eso es una capa de edición que va encima sólo en la
   apertura).

## Motor y receta

- **Seedance 2.0 en Higgsfield** (respeta el primer cuadro y acepta último cuadro); **Kling 4.0** como alternativa con
  fotogramas clave. **No** Seedance 2.5 `omni_reference`: ahí la imagen no es primer cuadro.
- Plano 3 con **primer y último cuadro del mismo encuadre**: la causa del corte oculto de antes era pedir inicio y
  final con encuadres y fondos distintos; aquí son el mismo.
- Borradores a 480p (4 créditos c/u). El elegido se escala a 1080p con el escalador de Higgsfield (1 crédito, misma
  toma) o se regenera a 1080p std (48 créditos, toma distinta).

## QA antes de mostrar

- Cuadro 0 del clip = cuadro inicial; último cuadro del plano 3 = 00 (diferencia medida). Si el motor no aterriza
  exacto, los últimos 2–3 cuadros se funden al 00 real.
- POV: la lata no cambia de tamaño ni se mueve en el cuadro; Paula crece de forma continua.
- Impacto: la lata llega desde el lado del portátil, nunca desde un costado ni desde arriba; el agua no aparece de la
  nada; desde el golpe Paula queda mojada hasta el final.
- Sin cortes dentro de cada clip (`pnpm ai:listen --measure-only`); Antonio inmóvil.

## Costo estimado

Stills ≈ USD 0,3–0,6 (2 o 3 candidatos por cuadro). Video: 4 a 6 borradores ≈ 16–24 créditos. Final: 2 créditos
escalando, o ~100 si se regeneran ambos planos a 1080p.
