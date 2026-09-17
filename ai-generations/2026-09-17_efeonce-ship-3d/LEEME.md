# Nave Efeonce 3D — biblioteca del isotipo en navy y blanco (2026-09-17)

Pedido del operador: qué hacer con la nave (isotipo de Efeonce) en 3D, en navy y en blanco («puede servir los dos»),
también aislada para usarla después en distintos contextos, y más ángulos de cámara (desde abajo y otros). Aprobado por
el operador el 2026-09-17.

**Destino OneDrive:** `5. Contenidos/13- Branding/Nave Efeonce 3D/`
- `Fuente oficial/` — `isotipo-efeonce-oficial.svg` (`public/branding/SVG/isotipo-full-efeonce.svg`, `#023c70`) y `isotipo-efeonce-negativo-oficial.svg`.
- `Navy/Angulos 3D/v01/` — 16 ángulos con `-fondo-estudio.png` (gris cálido claro) y 14 `-transparente.png`.
- `Blanco/Angulos 3D/v01/` — 16 ángulos con `-fondo-navy.png` y 14 `-transparente.png`.
- `Navy/Escenas 3D/v01/` y `Blanco/Escenas 3D/v01/` — 8 escenas `-escena.png` cada una, sin transparente.

Nombre: `efeonce-nave-3d-<navy|blanco>-<nn>-<ángulo>-1x1-1600x1600-v01-<variante>.png`. Todo PNG 1600×1600.

## Contenido

| # | Ángulo | # | Ángulo |
|---|---|---|---|
| 01 | frente héroe | 09 | desde abajo (gusano) |
| 02 | tres cuartos izquierda | 10 | picado |
| 03 | perfil | 11 | contrapicado tres cuartos |
| 04 | contrapicado | 12 | holandés (cámara inclinada) |
| 05 | cenital | 14 | macro ventanas (sin transparente) |
| 06 | flotando | 15 | macro nariz y órbita (sin transparente) |
| 07 | tres cuartos trasero | 16 | gran angular, nariz hacia cámara |
| 08 | tres cuartos derecha | 17 | sobrevuelo |

No hay 13: la isométrica salió frontal dos veces y se descartó.

Escenas: 01 despegando · 02 cruzando órbita · 03 en órbita del planeta · 04 aterrizando en escritorio · 05 trofeo en
pedestal · 06 pin · 07 en mano · 08 vitrina.

## Método y lecciones

1. **Forma:** el SVG oficial renderizado como silueta (`ref/ref-ship-silueta.png`) + prompt con la geometría enumerada
   (nave hacia la derecha, dos aletas, tres ventanas pasantes, órbita con los mismos cortes arriba/abajo que el logo,
   planeta sobre la órbita). Primero una base navy frontal validada; todo lo demás la usa como imagen 1.
   Modelo: `gpt-image-2.5-sunburst` edit, `xhigh`, 1600×1600 (`brief/`, `brief-angulos*/`).
2. **El segundo color se recolorea, no se regenera.** El blanco generado desde cero (cerámica mate) salió plano, como
   jabón, con cortes poco definidos, y el operador lo rechazó. El blanco aprobado sale de editar cada render navy ya
   aprobado cambiando SOLO material (laca blanca brillante) y fondo (`brief-blanco-v2/recolor.prompt.txt`; en escenas,
   `recolor-escena.prompt.txt` conserva todo lo demás). Resultado: geometría, cortes y cámara idénticos al navy.
3. **Ángulos extremos necesitan una guía de perspectiva.** Con la base frontal como referencia, el modelo ignora
   «desde abajo», «isométrica» o «gran angular» y devuelve casi frontal. Solución: `guias/proyectar.mjs` extruye la
   silueta oficial, la proyecta con cámara real (yaw, pitch, distancia) y pinta cara frontal clara y grosor oscuro; esa
   guía entra como imagen 1 («copiar cámara, no su aspecto plano»), la base 3D como 2 y el logo como 3. Funcionó en 09,
   10, 16 y 17 (`brief-angulos-v2/`). La isométrica siguió frontal. Holandés, contrapicado 3/4 y macros salieron con
   prompt solo.
4. **Recorte:** hoy `pnpm ai:image:rmbg <fondo> <transparente> --key-background <umbral> <minPx>` (opción canónica que
   reemplaza a `limpiar-huecos.mjs`, **superseded**; mismo alfa sobre los finales). En la corrida: `pnpm ai:image:rmbg` y luego `node limpiar-huecos.mjs <fondo> <transparente> <umbral> <minPx>`, que
   vacía los componentes del color de fondo que el matting dejó opacos (cortes de la órbita y ventanas del blanco sobre
   navy; ventanas del macro navy), con borde suave y descontaminación. Umbral 42/min 30 para blanco, 30/800 para navy.
   Sin transparente: escenas (la nave blanca sobre fondo claro quedaba semitransparente y arrastraba manos, pines y
   vidrio) y macros (órbita desenfocada semitransparente).
5. **QA:** transparentes compuestos sobre fondo de contraste (terracota) y zoom al 100 % en cortes y ventanas.

Costo aproximado: ~USD 0,14 por imagen; ~75 imágenes en total con descartes.
