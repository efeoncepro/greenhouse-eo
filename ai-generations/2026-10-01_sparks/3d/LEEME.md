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
