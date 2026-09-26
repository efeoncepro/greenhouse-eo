# Nexa con uniforme, registro documental — y por qué la marca se pierde (2026-09-21)

Seis plates del registro **documental** con Nexa vestida de Efeonce, producidos por el camino canónico
(ficha → `pnpm foto:prompt` → `pnpm ai:image` → `pnpm foto:validar` → `pnpm foto:emblema`), sin armar ningún
prompt a mano. Motor `gpt-image-2.5-sunburst`. Las imágenes están gitignoreadas; lo versionado son las
fichas, los prompts verbatim y este registro.

## El hallazgo, primero **[medido]**

🔴 **La marca no se pierde por la referencia: se pierde por el ENCUADRE.** Si el emblema, la cinta del
lanyard o el carnet quedan chicos en el cuadro, el modelo los sustituye por una mancha con forma parecida,
por más que la referencia oficial esté entre las imágenes de entrada.

Prueba controlada sobre **la misma ficha, la misma referencia y las mismas cinco imágenes de entrada**,
cambiando una sola variable por vez:

| Variante | Encuadre | Calidad | Tamaño | Cinta del lanyard | Carnet |
|---|---|---|---|---|---|
| `chaqueta-comite-v02` | plano **medio**, dos personas | `high` | 1152×1440 | ✗ manchas, sin una letra | ✗ ilegible |
| `chaqueta-v04-cerrado-high` | plano **corto** (chest-up) | `high` | 1024×1536 | ✓ «Empower your Growth» y «efeonce» | ✓ cabecera, foto, «Nexa», «AI Specialist», eslogan |
| `chaqueta-v03-cerrado` | plano **corto** (chest-up) | `xhigh` | 1024×1536 | ✓ | ✓ (remate un poco más limpio) |

**Conclusión: manda el encuadre.** Con `high` y plano corto ya sale legible; `xhigh` mejora el remate pero
**no** es lo que decide. Subir la calidad sin cerrar el plano no arregla nada — y cuesta.

Orden de magnitud del umbral, medido sobre los recortes: con la cinta a **~12 px de ancho** falla; a
**~40 px** se lee. El carnet falla a ~38 px de alto y funciona a ~100 px. Son estimaciones sobre el
recorte, no un límite exacto: la regla accionable es **si la marca tiene que leerse, el encuadre se decide
por ella**.

### Dos diagnósticos que di antes y eran FALSOS

Quedan escritos para que nadie los repita:

1. **«No hay camino generativo, hay que componer.»** Falso. Con el plano corto sale. Componer sigue siendo
   el camino cuando la escena exige un plano abierto, no siempre.
2. **«La solución es pasar el arte plano de la marca.»** Falso, y lo desmiente el manifiesto del lanyard:
   la vista 14 nace porque *«el modelo tergiversa el logotipo cuando se lo describe **o cuando se le pasa el
   arte plano**»*. Las vistas de espalda del 2026-09-21 usaron arte plano y salieron exactas porque son
   **vistas de kit** —la estampa ocupa medio cuadro—, no escenas. Es el mismo hallazgo del encuadre visto
   desde el otro lado.

## Lo que sí estaba bien y se confirmó

- La referencia pasada era la correcta: `efeonce-lanyard-15-conjunto-deterministico-nexa`, sha `adc49569…`,
  idéntica byte por byte al lanyard terminado. **Pasar la referencia correcta es necesario y no suficiente.**
- El polo **puesto** (no la prenda aislada) es el asset correcto para escena, como ya decía el código.
- `pnpm foto:emblema` usa zonas **fijas** (pecho y cabeza). Si el sujeto no cae ahí, el recorte sale vacío y
  **no** es un fallo: hay que ampliar a mano en la posición real.

## Las seis piezas

| Plate | Prenda | Palanca | Nota |
|---|---|---|---|
| `nexa-uniforme-documental/nexa-control-v01` | polo navy | `quien-sostiene` | consola de estudio; emblema **deformado** (planeta al centro en vez de arriba-derecha) |
| `gorra-polo-terreno-v01` | gorra trucker + polo navy | `atraviesa` | bahía de carga al amanecer; la gorra cae vista desde atrás y **no lleva marca visible** — el primer remedio del canon, por suerte del ángulo |
| `hoodie-terreno-v01` | hoodie azul | `luz-motivada` | rodaje antes del amanecer, monitor como única luz |
| `chaqueta-comite-v01/v02` | softshell + lanyard | `entre-dos` | v01 con el carnet de canto (parche innecesario), v02 con el lanyard de Nexa |
| `chaqueta-v04-cerrado-high` | softshell + lanyard | `entre-dos` | **la buena**: plano corto, marca legible |
| `polo-blanco-proyeccion-v01` | polo **blanco** | `proyeccion` | de espaldas dentro del haz: resuelve el emblema **por construcción** |

## Qué decidió el canon, no el gusto

- **La prenda dice el registro de la escena**, no se elige por variedad: polo = oficina/cliente ·
  chaqueta = reunión importante · gorra + polo = terreno · hoodie = terreno · lanyard = transversal.
- **`variantes` quedó descartada** pese a ser la palanca más «Efeonce»: su bloque dice *never a face*, y el
  encargo era ver el uniforme.
- El comando frenó dos veces antes de gastar: la escena no declaraba **momento** («sin momento salen poses
  de stock») ni **portador del azul**. También cazó una contradicción propia —decía polo blanco y
  «dark trousers»— y avisó que gana la referencia sobre la frase.
- **`proyeccion` pone a la persona de espaldas**, así que es la palanca a elegir cuando la marca no se
  puede sostener y no se quiere componer.

## Errores de proceso de esta corrida

- **No busqué el lanyard antes de esconderlo.** Estaba terminado desde la mañana; el comando avisaba del
  carnet determinístico y la respuesta correcta era abrirlo, no girar la tarjeta de canto.
- **Apunté a la carpeta de trabajo** del lanyard en vez de a la entrega del kit (mismo archivo, ruta frágil).
- 🔴 **Por qué el catálogo no veía el lanyard determinístico**: la entrega salió `1024x1536` y el `patron`
  del kit está fijo a `1200x1600`, así que el nombre **nunca calza** y la vista no podía declararse. Quedó
  cableada por `usoPorPersona`, que sí acepta nombre completo. **Si un kit entrega en otra resolución, su
  vista es invisible para el catálogo y nadie se entera.**
- 🔴 **`pnpm foto:assets:check` no sella los assets de uso.** Sella las vistas construidas por patrón, pero
  ni `assetDeUso` ni `usoPorPersona` entran al lock — y son justamente los que se usan en escena. Si alguien
  los cambia, ningún gate lo detecta. **[pendiente]**
