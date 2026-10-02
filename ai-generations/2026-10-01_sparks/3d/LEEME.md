# El Spark en 3D (exploración, 2026-10-01)

Página publicada: https://claude.ai/artifact/HPyuWWHHZU8Pz4qFaxjhiH (privada). **Pendiente de aprobación del operador.**

- **Modelo:** Hunyuan3D v3 (`fal-ai/hunyuan3d-v3/image-to-3d`) desde cuatro vistas del kit: frente sin cara
  (`../rig/spark-engine-sin-cara.png`), `perfil` (izquierda), `perfil-derecho` y `espalda-recta`. Salida `hunyuan.glb`
  (31 MB, 150k triángulos, texturas 4096). Se comparó con Tripo v2.5 multiview (`tripo-*.glb`): Tripo exagera los paneles
  navy como agujeros; Hunyuan es más fiel de frente y tres cuartos. La espalda de Hunyuan sale más lisa que el diseño.
- **Web:** `spark-3d-web.glb` (0,8 MB) =
  `npx @gltf-transform/cli@4 optimize hunyuan.glb spark-3d-web.glb --texture-compress webp --texture-size 2048 --simplify-ratio 0.45 --simplify-error 0.0008 --compress meshopt`
- **Cara:** canvas con matriz de puntos mapeado a un casquete esférico sobre el visor. Calibración con
  `calibrar-visor.html` (render ortográfico + relleno desde el centro del visor + rayos + ajuste de esfera): centro
  (-0.0026, -0.1273, -0.0291), radio 0.8326 (error 0.002), acimut ±0.786 rad, elevación -0.110 a 0.511 rad, con el
  modelo escalado a 2.4 de ancho y centrado en su caja.
- **Color de línea:** en el shader, los píxeles azules saturados pasan al tono de la línea (sin regenerar el modelo).
- **Rearmar:** reemplazar `'__GLB__'` en `spark-3d.template.html` por el data URI del GLB web y publicar.
