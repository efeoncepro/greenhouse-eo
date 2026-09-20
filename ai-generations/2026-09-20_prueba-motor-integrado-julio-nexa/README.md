# Prueba de motor integrado — Julio y Nexa

- Fecha: 2026-09-20.
- Estado: prueba generada, no aprobada para publicación.
- Motor: `image_gen` integrado de Codex; una generación con cuatro referencias de identidad.
- Dirección: ficha `../2026-09-20_identidad-julio-nexa/fichas/P3-juntos-taller-miami-v2.json` y prompt compilado `../2026-09-20_identidad-julio-nexa/prompts/P3-juntos-taller-miami-v2.txt`, usados sin cambios.
- Referencias: `julio-reyes-01.png`, `julio-reyes-04.png`, `nexa-cuerpo-completo-v2.png`, `nexa-the-point.png` de las bibliotecas locales indicadas en el canon fotográfico.
- Entregable: `plate.png` (1122 × 1402 px, proporción aproximada 4:5), sin texto ni firma generada.

## Revisión

`pnpm foto:validar plate.png` devolvió 2/4 reservas medibles: el lecho claro y las sombras pasan; el aire lateral para cursores y el campo libre para texto fallan. El lecho pasa con señal débil de nitidez (frágil). La imagen tampoco presenta un azul activo reconocible. Por esto no se compuso la firma oficial ni se declaró master.

Visualmente, los rostros siguen las referencias y el vestuario se aparta del blazer navy de Nexa. La escena muestra trabajo real sobre pruebas impresas, pero el primer plano de la mesa ocupa demasiado cuadro y la reserva superior queda invadida por las cabezas. Una siguiente toma necesita encuadre más abierto y personas más abajo, sin añadir un bloque gráfico para compensar.

## Corrección tras revisión con el operador

Antes de la primera generación no comparé visualmente las hojas aprobadas. La revisión posterior incluyó `rondas/personas/julio-nexa-firmadas.jpg`, `rondas/curado/set-curado-12.jpg` y el P3 anterior firmado al 20 %. La primera toma midió **0,0 % azul** y **0,01 % naranja** con `scripts/metricas.cjs`: faltaba el código cromático de la marca, además de la firma.

- `ficha-v2.json` introdujo azul en un proof impreso y naranja en el lápiz de revisión, pero `plate-v2.png` falló el lecho: contraste blanco 1,06:1 y navy 2,17:1. No se firmó.
- `ficha-v3.json` conservó la escena y cambió sólo el lecho a la tapa mate de una maleta de cámara presente en el estudio. `prompt-v3.txt` es la salida canónica de `pnpm foto:prompt` usada con el motor integrado y las cuatro referencias de identidad.
- `plate-v3.png` pasó zona de texto, lecho y sombras; el validador devolvió 3/5 porque fallan aire para cursores y margen de cita, capas que esta ficha no declara. La firma SVG oficial se compuso a 20 % en `final-v3-logo20.png`, con **10,72:1** de contraste blanco.
- La métrica de azul activo estricto es **0,3 %** y la del naranja **0,00 %**: se ven el proof azul y el lápiz naranja, pero el azul queda menos saturado que el valor nominal de marca y el lápiz ocupa muy pocos píxeles. Esta prueba mejora la codificación visual; queda para revisión del operador, no se declara aprobada ni publicada.
