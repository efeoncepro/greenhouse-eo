# El Spark en 3D (exploración, 2026-10-01)

Página publicada: https://claude.ai/artifact/HPyuWWHHZU8Pz4qFaxjhiH (privada). **Pendiente de aprobación del operador.**

- **Modelo:** Hunyuan3D v3 (`fal-ai/hunyuan3d-v3/image-to-3d`) desde cuatro vistas del kit: frente sin cara
  (`../rig/spark-engine-sin-cara.png`), `perfil` (izquierda), `perfil-derecho` y `espalda-recta`. Salida `hunyuan.glb`
  (31 MB, 150k triángulos, texturas 4096). Se comparó con Tripo v2.5 multiview (`tripo-*.glb`): Tripo exagera los paneles
  navy como agujeros; Hunyuan es más fiel de frente y tres cuartos. La espalda de Hunyuan sale más lisa que el diseño.
- **Web:** `spark-3d-web-plain.glb` (2,2 MB) =
  `npx @gltf-transform/cli@4 optimize hunyuan.glb spark-3d-web-plain.glb --texture-compress webp --texture-size 2048 --simplify-ratio 0.45 --simplify-error 0.0008 --compress false`.
  **Sin meshopt ni draco:** necesitan WebAssembly o descargar el decodificador, y la política de seguridad de los
  artifacts los puede bloquear.
- **Carga dentro de un artifact (lección del 2026-10-01):** la política bloquea `fetch`, incluso de `data:` y `blob:`.
  Por eso `GLTFLoader.load(dataURI)` falla con «No se pudo cargar el modelo». La solución: decodificar el base64 a un
  `ArrayBuffer` y usar `GLTFLoader.parse`, con `createImageBitmap` desactivado mientras se arma el parser. Así las
  texturas se cargan como `<img>` y no con `fetch(blob:)`. Se prueba en local con una política equivalente
  (`connect-src 'none'`, `img-src data: blob:`).
- **Cara:** canvas con matriz de puntos mapeado a un casquete esférico sobre el visor. Calibración con
  `calibrar-visor.html` (render ortográfico + relleno desde el centro del visor + rayos + ajuste de esfera): centro
  (-0.0026, -0.1273, -0.0291), radio 0.8326 (error 0.002), acimut ±0.786 rad, elevación -0.110 a 0.511 rad, con el
  modelo escalado a 2.4 de ancho y centrado en su caja.
- **Color de línea:** en el shader, los píxeles azules saturados pasan al tono de la línea (sin regenerar el modelo).
- **Rearmar:** reemplazar `'__GLB__'` en `spark-3d.template.html` por el data URI del GLB web y publicar.

## Vida de personaje (2026-10-01, v3)

Pedido del operador: «parece una bola o un globo, no tiene vida real». Una malla rígida que sólo gira se ve así. La v3:

- **Piezas al cargar.** El anillo es la segunda componente conexa del modelo. Los antebrazos salen de un corte (radio > 0,86,
  |x| > 0,55, y < 0,2) y la antena de otro (y > 0,86). Cada pieza gira desde su pivote; las articulaciones navy del diseño
  cubren el corte de los brazos.
- **Movimiento con resortes**, con rebote: cuerpo lento, ojos rápidos que se adelantan al giro. Además, inclinación al
  girar, estiramiento al flotar, salto con anticipación y aterrizaje al hacer clic, antena que se sacude con la
  aceleración, brazos con balanceo, saludo al volver y brazos arriba al saltar.
- **Reacciones:** sorpresa ante un movimiento brusco (como mucho cada 5 s), ladeo de cabeza cuando el cursor se
  detiene, pensativo y mirando alrededor si nadie lo mueve, sacadas de los ojos y doble parpadeo ocasional.
- **El anillo se mece, no da la vuelta completa:** el anillo generado no es plano (está alabeado) y un giro completo lo
  hace parecer que se vuelca. Para que la esfera orbite de verdad, el anillo y su esfera tienen que ser piezas limpias:
  modelado manual o un modelo nuevo.
- **Pendiente:** la separación tarda unos segundos al cargar (suelda 47 mil vértices en el navegador). Se puede guardar
  ya separada en el GLB.
