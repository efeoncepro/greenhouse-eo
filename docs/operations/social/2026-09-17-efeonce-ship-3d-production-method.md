# Nave Efeonce 3D (2026): biblioteca del isotipo en navy y blanco

Fecha de registro: 2026-09-17. Owner: Social Media Studio / Efeonce.
Caso: biblioteca 3D del isotipo de Efeonce (la nave) en navy y en blanco, con ángulos de cámara, escenas y variantes
transparentes para reutilizar en distintos contextos. Bitácora técnica y creativa; el método transferible vive en
[`mascot-3d-pose-library.md`](../../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md)
(sección «Isotipo propio en 3D con dos colores»). Procedencia, prompts, guías y scripts en
[`LEEME.md`](../../../ai-generations/2026-09-17_efeonce-ship-3d/LEEME.md) (binarios fuera de git).

## 1. Estado y entrega

Pedido del operador: qué hacer con la nave en 3D, en navy y en blanco («puede servir los dos»), también aislada «para
usar luego en distintos contextos», y más ángulos de cámara («desde abajo u otros»). Aprobado el 2026-09-17: las navy
quedaron bien en la primera serie; las blancas v1 se rechazaron; la hoja de 8 ángulos nuevos y el blanco v2 se
aprobaron.

**Destino OneDrive:** `5. Contenidos/13- Branding/Nave Efeonce 3D/` — 78 archivos, todos PNG 1600×1600.

| Carpeta | Contenido |
|---|---|
| `Fuente oficial/` | `isotipo-efeonce-oficial.svg` (`public/branding/SVG/isotipo-full-efeonce.svg`, `#023c70`) y el negativo |
| `Navy/Angulos 3D/v01/` | 16 ángulos `-fondo-estudio` + 14 `-transparente` |
| `Blanco/Angulos 3D/v01/` | 16 ángulos `-fondo-navy` + 14 `-transparente` |
| `Navy/Escenas 3D/v01/` y `Blanco/Escenas 3D/v01/` | 8 `-escena` cada una, sin transparente |

Ángulos: 01 frente héroe · 02 tres cuartos izquierda · 03 perfil · 04 contrapicado · 05 cenital · 06 flotando ·
07 tres cuartos trasero · 08 tres cuartos derecha · 09 desde abajo (gusano) · 10 picado · 11 contrapicado tres
cuartos · 12 holandés · 14 macro ventanas · 15 macro nariz y órbita · 16 gran angular nariz · 17 sobrevuelo. No hay
13: la isométrica salió frontal dos veces y se descartó. Escenas: despegando, cruzando órbita, en órbita del planeta,
aterrizando en escritorio, trofeo en pedestal, pin, en mano, vitrina.

Modelo: `gpt-image-2.5-sunburst` edit, `xhigh`, 1600×1600, ~USD 0,14 por imagen; ~75 imágenes con descartes.

## 2. Decisiones que cambiaron el resultado

| Observación | Corrección | Criterio transferible |
|---|---|---|
| Blanco v1 generado desde cero («matte-satin white ceramic» sobre navy): plano, como jabón, cortes de la órbita poco definidos. Rechazado | Blanco v2: editar cada render navy aprobado cambiando SOLO material (laca blanca brillante, sombras frías en los cortes) y fondo (navy `#0f2744`); en escenas, sólo el material | El segundo color se recolorea desde el render aprobado, no se regenera: geometría, cortes y cámara quedan idénticos |
| Con la base frontal como referencia y la cámara sólo en texto (gusano, picado 45°, isométrica, gran angular, vista inferior), el modelo devolvió casi frontal | Guía de perspectiva proyectada desde la silueta oficial como imagen 1 | Un ángulo extremo se indica con una guía geométrica, no con una descripción; misma familia que el boceto de composición del [KV «Tu IA no conoce tu negocio»](2026-09-17-kv-tu-ia-no-conoce-production-method.md) |
| Vista inferior pura (cámara debajo mirando arriba) | Descartada | Para un logo plano sólo muestra el canto: no sirve |
| `pnpm ai:image:rmbg` dejó opacos los huecos que muestran el fondo (cortes de la órbita y ventanas de la nave blanca sobre navy; ventanas del macro navy) | `limpiar-huecos.mjs` de la corrida | Objeto claro sobre fondo oscuro es el caso inverso del relleno de huecos: revisar siempre los huecos pasantes |
| Escenas con nave blanca sobre fondo claro y macros no recortaban limpio | Se entregan sólo como escena o con fondo | No todo se recorta: si el cuerpo queda semitransparente o arrastra elementos, no hay variante transparente |

## 3. Procedimientos técnicos

- **Forma.** El SVG oficial renderizado como silueta (`ref/ref-ship-silueta.png`) más un prompt con la geometría
  enumerada: nave hacia la derecha, dos aletas, tres ventanas pasantes, órbita con los mismos cortes arriba y abajo que
  el logo, planeta sobre la órbita. Primero una base navy frontal validada; todo lo demás la usa como imagen 1.
- **Recoloreado.** Prompts `brief-blanco-v2/recolor.prompt.txt` (ángulos) y `recolor-escena.prompt.txt` (escenas):
  entrada = render navy aprobado; sólo cambian material y fondo.
- **Guía de perspectiva.** `guias/proyectar.mjs` extruye la silueta oficial (grosor 7 % del ancho), la proyecta con
  cámara real (yaw, pitch, distancia, roll) y pinta cara frontal azul claro, trasera media y grosor oscuro. Entra como
  imagen 1 («copiar cámara y posición, nunca su aspecto plano»), la base 3D aprobada como imagen 2 y la silueta
  oficial como imagen 3. Funcionó en 09, 10, 16 y 17 (`brief-angulos-v2/`). La isométrica siguió frontal. Holandés,
  contrapicado tres cuartos y macros salieron sólo con prompt.
- **Recorte y limpieza de huecos.** `pnpm ai:image:rmbg` y luego
  `node limpiar-huecos.mjs <fondo> <transparente> <umbral> <minPx>`: el color de fondo es la mediana del borde; los
  componentes conexos con distancia al fondo menor al umbral y tamaño ≥ `minPx` pasan a alfa 0, con borde suave de
  2 px y descontaminación del color. Parámetros: blanco 42/30; macro navy 30/800. Es un script de la corrida, no una
  herramienta canónica (gap abierto registrado en
  [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)).
- **Qué no se recorta.** Escenas con nave blanca sobre fondo claro (el cuerpo quedaba semitransparente y arrastraba
  manos, pin y vidrio) y macros (órbita desenfocada a medio borrar).
- **QA de transparentes.** Componer sobre un fondo de contraste fuerte (terracota) y revisar con zoom al 100 % cortes
  y ventanas; el gris azulado no revela residuos navy.
- **zsh.** Una variable con varios `--image` no se parte en zsh: usar arrays (`G=(pnpm ...)`, `"${G[@]}"`).

## 4. Uso recomendado y límites

Recomendaciones (no pedidas por el operador):

- El render 3D es un elemento ilustrativo de marca; **no reemplaza el logo oficial en firmas**, que siguen siendo el
  SVG compuesto de forma determinística (regla existente en `efeonce-advertising-creative`).
- Usos sugeridos: fondos y escenas de piezas sociales, portadas, decks, mockups de merch y headers; navy sobre fondos
  claros, blanco sobre fondos oscuros o navy.

Límites: no hay ángulo 13 (isométrica); los macros y las escenas no tienen variante transparente.
