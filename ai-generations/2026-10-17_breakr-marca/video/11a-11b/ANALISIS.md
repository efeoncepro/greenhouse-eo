# 11a → 11b: diagnóstico y receta (2026-10-22, revisión con tres subagentes)

Julio rechazó los cuatro intentos (2 Omni, 1 Seedance 2.5 con inicio y final, 2 borradores Seedance 2.5): «en todos
te falla la física». Tres subagentes revisaron, sin generar nada, la física de los clips cuadro a cuadro (ffmpeg,
`pnpm ai:listen --measure-only` y 2 consultas a Gemini), la geometría de los planos aprobados y la receta.

## Qué tiene que transmitir

«¿Para cuándo?» → «Ya está» → la campaña la golpea **antes de que alcance a reaccionar**. Velocidad. Antonio no se
inmuta.

## Lo que se vio (medido en cuadros)

En ningún clip el agua viaja de la pantalla a Paula. Queda quieta (montículo o corona), brota de la mesa, entra por un
costado o se esfuma. La lata aparece de pie y flota 1 a 2 s junto a la cabeza. Paula se seca y le cambia el pelo. Los
tres clips con cuadro final cortan hacia él en vez de llegar con continuidad. En la previa, el 11a es sólo dolly (el
agua no avanza) y en el 11b el agua golpea desde la derecha.

## La causa está en los insumos, no en el motor (los dos motores fallaron igual)

1. **El plano 11a aprobado es un aterrizaje, no una carrera:** corona radial alrededor de una lata de pie sobre la
   mesa. Todos los clips animaron el colapso de esa corona.
2. **El cuadro `11b-inicio-v2` traza el agua en otro eje:** está a la izquierda del portátil, ya pasó a Paula por su
   costado, el portátil tapa la línea cámara→pecho y hay rocío sembrado a la derecha. El modelo armó el golpe desde esa
   semilla: por eso el agua entra por la derecha.
3. **11a y 11b no comparten el set:** el 11a tiene tabique, lámparas y plantas (lo que pide la biblia para el eje B); el
   11b/00 tiene ventanal claro y monitor azul, que la biblia prohíbe en ese eje. El portátil está girado distinto y la
   lata salta de lado. Cualquier corte entre ambos salta.
4. **El agua de los fijos son cuentas congeladas** y el modelo copia ese look.
5. **Duración:** un evento de 0,3–0,5 s pedido en 4–6 s; el modelo rellena el tiempo con flotación.
6. **Cuadro final a mitad de la acción:** obliga a un corte oculto.

## Física de referencia

- Portátil → Paula ≈ 1,4 m. A 4–5 m/s son 0,28–0,35 s (7–8 cuadros a 24 fps).
- El agua sobre una mesa es una **lámina rasante de 1–3 cm** con frente blanco aireado, alimentada desde la pantalla;
  al chocar sube por el cuerpo (v²/2g ≈ 1 m): eso es la corona sobre pecho y cara. Cae con gravedad antes de 1 s.
- A 1/48 s el agua se corre 8–10 cm por cuadro: estelas y láminas, nunca cuentas. **La etiqueta de la lata no se lee
  en vuelo**; se lee en el ápice del rebote o en la mesa.
- La lata (~350 g) no surfea: va empujada dentro del chorro, inclinada o rodando; rebota en el cuerpo, pasa menos de
  0,3 s junto a la cabeza, cae y queda acostada sin moverse sola.
- Después: pelo oscuro pegado a la cara, suéter oscurecido y pesado, goteo, mesa con película de agua. Nada se seca.

## Receta

1. **Arreglar los insumos antes de animar.** Un cuadro inicial nuevo derivado del 11a aprobado con `pnpm ai:inpaint`
   (se protegen Paula, Antonio, el portátil y el fondo con delta 0): sin corona ni lata de pie; una lámina baja del
   ancho del portátil saliendo por el borde superior de la tapa, ya sobre la mesa, con estelas sobre la línea
   tapa→pecho; la lata dentro del frente, inclinada hacia ella; Paula seca y sin reacción; nada de agua a los costados
   ni hacia la cámara.
2. **Una sola toma continua en el eje B, sin cuadro final.** Dolly-in rápido detrás del agua del 35 mm del 11a hasta
   plano medio. Acción cargada al principio (golpe a los ~0,4 s) y el resto son consecuencias reales con Paula empapada
   hasta el último cuadro. Seedance 2.5 en Higgsfield, `omni_reference`, inicio + lata como referencia, borrador 480p.
3. **El 00 sale del video nuevo:** se congela el cuadro útil del golpe. El plano 11b/00 actual queda reemplazado,
   porque su fondo contradice la biblia y el 11a.
4. **Velocidad:** si el viaje dura más de 0,5 s, se acelera sólo el viaje en edición (rampa continua); el impacto va a
   1×. Nunca cámara lenta.
5. **Plan B:** si el viaje sale bien y el golpe no, se corta antes del golpe y se extiende hacia adelante
   (`video_extension`) desde ese clip, para heredar la línea del agua. **Plan C:** ola compuesta como capa sobre el
   plano.

## QA antes de finalizar (a 24 fps)

El agua nace en la tapa y su frente sube de forma monótona en el cuadro; ningún píxel entra por los bordes; no hay
cortes (`ai:listen --measure-only`); Antonio no se mueve; la lata no brilla ni flota; el pelo y el suéter de Paula se
oscurecen en el impacto y no se aclaran hasta el final; la cara al 100 % en el cuadro 0, en el impacto y en el último.
Si cuatro borradores fallan por el mismo defecto, se cambia de ruta.
