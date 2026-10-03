# Vistas puestas del uniforme — silueta, giro, espalda y oclusión (2026-10-03)

Encargo del operador, en cuatro mensajes de la misma sesión:

1. «Dale a los comandos la capacidad de elegir la más adecuada para que sepan que tienen opciones. Genera las vistas
   de uniforme que te falten (…) cuando el brazo o algo tapa el logo siempre hay problema (…) que soporte pliegues.
   Ahí te faltaron las gorras.»
2. «Agrega incluso un giro más pronunciado que 45°: cuando el giro es más profundo también se pierden los detalles del
   logo, porque debe dibujarlo a mano el modelo.»
3. Sobre la mano de Karo en EC2: «la vista real sería que se viera sólo la parte del logo que no tapa la mano. No
   intervengan más esa imagen: hay que dar la vista en la ropa que permita esos casos, que son los que más ocurren.»
4. «Haz vistas similares en la parte de atrás: ahí está el logo completo (…) desde abajo, de los lados.»

## Qué quedó

**126 vistas puestas aprobadas**, en los `final/` de cada kit, en sus manifiestos (`cuando_usarla`), en el catálogo
(`usoPorVista` de `scripts/foto/build-prompt.mjs`), selladas en `scripts/foto/assets.lock.json` y publicadas al canon.

| Kit | Vistas nuevas | Números |
|---|---|---|
| Bomber | 29 | 18–46 |
| Softshell | 29 | 18–46 |
| Polo navy | 29 | 17–45 |
| Hoodie | 29 | 23–51 |
| Gorra navy (logotipo) | 10 | v2-10 a v2-19 |

Por prenda, hombre y mujer: frente · 45° y 70° hacia cada lado · frente con cámara baja · espalda a 45° y 70° hacia
cada lado · espalda con cámara baja · oclusión con la mano, con un antebrazo y una taza, con una tablet y con brazos
cruzados. Gorra: frente, 45° y 70° hacia cada lado, encuadrada de la copa a las cejas (sin rostro).

Convención de nombre: `<prefijo>-NN-puesto-<giro>[-<tapa>|-bajo][-mujer]`. El lado dice hacia qué borde del cuadro
apunta la nariz de la persona, de frente o de espaldas.

## Cómo se eligen

`pnpm foto:prompt` (`elegirPuesta`): silueta de quien la viste (`silueta` en roster y elenco) · giro de su vista de
identidad o `giro` en el objeto · `camara: "baja"` · `tapa` (con una persona se infiere de la escena). Imprime una
línea `·` por prenda con la elegida, el motivo y las demás opciones; `puesta` sigue ganando. El macro del bordado
viaja también con la prenda puesta (menos la gorra).

## Método

Editar, no generar: cada vista sale de la vista puesta aprobada del kit (frente o espalda) con `pnpm ai:image`
(`gpt-image-2.5-sunburst`, high, 1024×1536 o 1024×1024), con el macro del bordado como segunda imagen; la softshell de
espaldas lleva su espalda bordada corregida (`02-espalda v02`). Las entradas 3:4 se padean a 2:3 espejando el pie
(`entrada/`). Constructor: `build-jobs.cjs <ola>`; ejecución: `run-one.sh`; promoción: `promover.mjs --aplicar`.

| Ola | Qué | Resultado |
|---|---|---|
| 1 | frente de mujer; 45° de hombre; gorra de frente | gorra royal → rehecha con la vista navy del producto como tercera imagen |
| 2 | 45° de mujer; gorra a 45° | ok |
| 3 | 70° y gorra a 70° | marca ROTADA en el plano → ola 4 |
| 4 | 45° derecha y 70° rehechos desde el frente, con la órbita horizontal | ok |
| 5 | oclusión mano, brazos, objeto | la tablet esquivó la marca → rehecha anclando el borde a su centro |
| 6 | objeto y antebrazo (`cruza`) | 3 de 8 antebrazos esquivaron → rehechos anclando los nudillos a la marca |
| 7 | espaldas y cámara baja | 1 caída de red, repetida |

## Lo que aprendimos (detalle en `garment-reference-kit.md` §Delta 2026-10-03)

- En el giro, el modelo **rota la marca en el plano**; partir de un 45° rotado arrastra la rotación.
- El indicador de rotación (`rotacion-marca.mjs`) confunde el escorzo de una superficie curva con rotación: sirve de
  pista, no de gate. A ojo: la esfera arriba y la fila de ventanas horizontal.
- El modelo **esquiva la oclusión**: hay que anclar el objeto a la marca misma.
- **Componer la marca sobre la vista de kit la empeora** (archivadas en `artifacts.remote.json`, carpeta `descartes/escorzo-compuesto/`): la referencia sale buena o
  se rehace.
- En oclusión, la vista real es la marca a su tamaño con sólo la parte visible: por eso es una vista del kit, no una
  composición sobre la escena (`ai-generations/2026-10-03_elenco-cine/plates/EC2-c/` quedó como experimento, no se
  entrega).

## Herramientas de la corrida

`recorte-marca.cjs` (bordado ampliado), `rotacion-marca.mjs` (indicador de rotación), `verificar-oclusion.mjs`
(marca visible contra el origen; con la entrada padeada el reencuadre lo engaña: se revisa al 100 %).

Costo aproximado: 135 ediciones a ≈ USD 0,05–0,07 ≈ USD 8.
