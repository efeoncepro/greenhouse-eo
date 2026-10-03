# Producir una foto de marca en registro cine — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.3
> **Creado:** 2026-10-02 por Claude
> **Ultima actualizacion:** 2026-10-02 por Claude (1.1: `--formato` y `--alcance` en `foto:cine:nueva`, la clave `__revisar`, la sección partida 1:1, las siete decisiones del operador, la luz juzgada contra la foto aprobada, el escenario con escala, las 12 recetas y el revisor sólo en Claude Code; 1.2: cambiar de formato con `foto:expandir`; 1.3, 2026-10-03: grupos de 3 a 5 con el elenco, Nexa y Julio, y la expresión de Nexa en grupo)
> **Modulo:** Creative · marca propia de Efeonce (fotografía de marca, registro cine)
> **Ruta en portal:** no aplica — se usa desde la terminal con `pnpm foto:*` y el agente `cine-reviewer`
> **Estado:** comandos y revisor disponibles desde el 2026-10-02 (TASK-1926, delta b). Dos pruebas ciegas hechas; falta el veredicto del operador sobre los plates de la segunda y el orquestador `pnpm foto:cine`
> **Documentacion relacionada:** [Casebook del registro cine](../../operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md) · [Registro cine (canon)](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) · [Fotografía de marca](../marketing/fotografia-de-marca-efeonce.md) · [Usar el traje biónico de Nexa](usar-traje-bionico-de-nexa-en-fotos.md) · [Usar los Sparks](usar-sparks-en-fotos-de-marca.md) · [Elenco de marca](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md)

## Para qué sirve

Para llegar a una foto cine aprobable **sin consultar a otra sesión ni a otra persona**. Hasta el 2026-10-02 ninguna
sesión lo lograba sola: las consultas se repetían y eran siempre las mismas diez fallas. Ahora esas fallas (trece, tras las
pruebas ciegas) están escritas en el casebook, la ficha las previene con campos propios y un agente revisor las revisa
antes y después de generar.

**No sirve** para los registros documental (A), puesta en escena (B) ni la respuesta a la vista (C): sus comandos no
cambiaron y no reciben nada de esto.

## Antes de empezar

- **Confirma que el caso va en cine.** Sólo: Nexa protagonista; la receta de deck `proposal-cinematic`; láminas de
  sección y «about» del deck; portadas y contraportadas con foto; Marketing con Manzanitas con el roster; portadas y
  destacados de redes con Nexa. **Publicidad con personas del equipo: en prueba.** Si no está, usa A, B o C.
- **Ten la máquina lista:** `pnpm foto:doctor`.
- **Ten las imágenes de la receta en disco.** Si `foto:cine:nueva` dice que la ficha no está, o el plate de la receta
  falta: `pnpm ai-gen:where <ruta>` y `pnpm ai-gen:pull <carpeta>`.
- **Sabe con qué revisas.** El agente `cine-reviewer` existe **sólo en Claude Code**. En Codex no hay agente: aplica tú
  la misma rúbrica leyendo `.claude/agents/cine-reviewer.md` y el casebook.

## Paso a paso

1. **Elige la receta más cercana** a tu caso:

   ```bash
   pnpm foto:cine:nueva --listar
   ```

   Cada receta dice su formato, alcance, protagonista, por qué funciona y sus advertencias (por ejemplo, «isotipo
   pintado: receta de luz y escena, no de bordado», o «robots anteriores a los Sparks»). Hoy hay 12, todas aprobadas
   por el operador:

   | Receta | Formato | Alcance | Protagonista |
   |---|---|---|---|
   | `NX7d` | 16:9 | `nexa` | Nexa con el traje biónico y dos Sparks con referencia |
   | `NX5b` | 16:9 | `proposal-cinematic` | Nexa con el traje biónico |
   | `NX6b` | 16:9 | `deck-portada` | Nexa con la softshell del kit |
   | `AE2b` | 16:9 | `proposal-cinematic` | Estratega SEO con el polo |
   | `SE1` | 16:9 | `proposal-cinematic` | Estratega SEO con el polo |
   | `RV1b` | 16:9 | `proposal-cinematic` | Líder RevOps con la softshell |
   | `CR4` | 16:9 | `deck-portada` | Directora creativa con el hoodie |
   | `SP2b` | 1:1 | `deck-seccion` | Director creativo con el polo |
   | `SP1` | 1:1 | `deck-seccion` | Cliente (persona ilustrativa, su ropa, sin marca Efeonce) |
   | `WB1c` | 16:9 | `proposal-cinematic` | Desarrollador con el polo |
   | `PH2` | 1:1 | `social-nexa` | Nexa, retrato centrado |
   | `PS1b` | 3:1 | `social-nexa` | Nexa con la softshell del kit |

   **Todavía no hay ninguna foto cine vertical aprobada.** Para un 9:16 o un 4:5 parte de la receta más parecida en
   escena y cambia el formato con `--formato` (paso 2).

2. **Crea tu ficha desde ella:**

   ```bash
   pnpm foto:cine:nueva --desde NX7d --id NX8 --dir ai-generations/2026-10-03_mi-corrida
   ```

   La ficha nueva queda en `<dir>/fichas/NX8.json` con `"registro": "cine"`, la estructura de la receta, la escena
   marcada `REESCRIBIR — …` y dos listas:

   - **`__completar`**: los campos que faltan.
   - **`__revisar`**: lo que la ficha heredó de la receta y casi nunca sirve tal cual — la acción `suspendido`, los
     personajes de `objetos` y la `identidad`. Míralos uno por uno: en la segunda prueba ciega viajaban a la ficha
     nueva sin que nadie los mirara.

   Dos opciones cambian lo heredado:

   | Opción | Qué hace |
   |---|---|
   | `--formato 9:16` (o `4:5`, `1:1`…) | cambia el formato. Como la geometría cambia, **borra las reservas de la receta** y agrega `reservas` a `__completar`: tienes que volver a declararlas |
   | `--alcance social-nexa` (u otro de la lista) | fija el alcance de la ficha nueva; si no lo pasas, hereda el de la receta |

   ```bash
   pnpm foto:cine:nueva --desde PH2 --id PH3 --dir ai-generations/2026-10-03_mi-corrida --formato 9:16 --alcance social-nexa
   ```

3. **Escribe la escena y completa los campos cine** (en inglés, como el resto del prompt).

   **Lo primero a cuidar es el escenario.** Lo que separa una prueba de una foto aprobada no fue la luz de la cara sino
   el lugar (observado en la prueba del 2026-10-02, a confirmar): las aprobadas tienen un espacio grande, oscuro y con
   profundidad —auditorio, escenario con luces, hangar, piso de grilla— y un fenómeno de luz que ocupa buena parte del
   cuadro; las pruebas eran una persona en un vacío negro con una luz chica. «Empty dark studio» evita la oficina,
   pero no reemplaza el lugar: declara un espacio real, oscuro y profundo, con escala.

   | Campo | Qué pones |
   |---|---|
   | `llave` | `{ "fuente", "lado", "distancia", "tamano" }`: una sola fuente dura, de lado y cerca. De color, va de lado y no de frente al pecho, o tiñe el emblema |
   | `primerPlano` | algo real y oscuro junto al lente, fuera de foco |
   | `fondo` | luces prácticas grandes y frías al fondo, en bokeh |
   | `fenomeno` | `{ "que", "esServicio" }`: el fenómeno de luz y una frase que diga por qué ES el servicio |
   | `alcance` | `nexa` · `proposal-cinematic` · `deck-seccion` · `deck-portada` · `manzanitas` · `social-nexa` · `publicidad-prueba` |

   Borra las claves `__completar` y `__revisar` cuando termines.

   **Si hay más de una figura,** no basta con pedir un número: ubica cada una por geografía en la escena. Ancla también
   al sujeto por geografía para que no se corra a la reserva del texto (en 1:1 con el brazo levantado, el ancla por
   porcentaje puede ser imposible).

   **Grupos de 3 a 5 personas.** Un grupo puede ser cualquier combinación de personajes del elenco (`hum`, `karo`,
   `sophia`, `isabella`, `antonio`), Nexa y Julio; con otras personas del roster el tope sigue en dos. Se validó con los
   cinco del elenco juntos y con Julio + Nexa + Karo (2026-10-03). Qué cambia en la ficha:

   | Qué | Cómo |
   |---|---|
   | Referencias | El comando pasa **una referencia frontal por persona**; no pidas vistas extra |
   | Luz | La luz de las referencias **se corta**: toda la luz la pone la ficha (`llave`, `fondo`, `fenomeno`). Escríbela completa |
   | Ropa | Pon `persona` en **cada prenda** de `objetos`: sin ella, la prenda va de frente y el comando avisa |
   | Nexa | Su `expresion` **no viaja** en grupo: escribe su gesto y su pose en la escena |
   | Repetidos | La misma persona dos veces da error («aparece dos veces») |

   No confundas este grupo con el aviso `⚠ … más de 2 personajes con referencia`: ese aviso cuenta los personajes de
   `objetos` (los Sparks y otros con imagen propia), no las personas de `identidad`.

   **Las siete decisiones del operador que cambian cómo escribes la ficha** (2026-10-02):

   | # | Decisión | Qué haces en la ficha |
   |---|---|---|
   | 1 | Los aros de Nexa son dorados | nada: el comando los pide solo en cine |
   | 2 | El destacado «Agents» aprobado se queda (tres Sparks, sin Nexa ni texto) | no lo rehagas ni le agregues a Nexa |
   | 3 | La escala vertical va por encuadre: 9:16 de la cintura arriba, 4:5 del pecho arriba | nada: con `identidad`, el comando la inyecta. Se confirma en el próximo piloto |
   | 4 | En la sección partida la mirada va al panel; «mira al lente» queda para portadas, contraportadas, `proposal-cinematic` y social | con `alcance: deck-seccion` no escribas «looks into the lens» |
   | 5 | Personas reales del roster con la prenda de su línea; casting por rol con el código por registro de escena | no inventes personas ni mezcles prendas de otra línea |
   | 6 | Las luces prácticas, en cine, sólo como bokeh grande, frío y lejano | nada de lámpara, monitor o ventana encendidos cerca: van en `fondo`, lejos |
   | 7 | Una sola sección partida por deck | la controla el validador del plan (`variant-both-in-deck`), no la ficha |

   **Sección partida (1:1).** Para la lámina de sección partida del deck, usa `"alcance": "deck-seccion"` y declara la
   reserva de texto a la izquierda: `"reservas": { "texto": { "lado": "izquierda", … } }`. El comando arma la sección
   partida y dirige la mirada al panel. Las recetas de partida son `SP2b` y `SP1`.

4. **Revisa el prompt:** `pnpm foto:prompt <ficha>`. Lee los avisos (`⚠ … cine — …`): cada uno nombra la falla del
   casebook que vas a cometer si lo ignoras.

5. **Pide revisión antes de gastar:** en Claude Code, invoca el agente **`cine-reviewer`** con la ruta de la ficha.
   Lee el casebook y la receta de partida, revisa la ficha y su prompt, y devuelve `APROBABLE`, `CORREGIR` o
   `FUERA DE ALCANCE`, con la frase exacta a cambiar. En Codex, aplica la rúbrica de `.claude/agents/cine-reviewer.md`
   tú mismo.

6. **Genera una vez:** `pnpm foto:generar <ficha> --quality high` (≈ USD 0,05).

7. **Mide y mira:**

   ```bash
   pnpm foto:validar:cine <plate.png>
   pnpm foto:validar <plate.png>
   pnpm foto:emblema <plate.png>
   ```

   Después, `cine-reviewer` sobre el plate. Si algo falla, **corrige la ficha y regenera**.

   **Cómo se juzga la luz de la cara.** Contra la foto aprobada de la receta, no contra un ideal escrito. Las aprobadas
   (`AE2b`, `SE1`, `RV1b`, `WB1c`, `NX5b`) también tienen la cara modelada con luz suave de frente: lo que se pide es
   una cara modelada por la fuente, con un lado algo más oscuro y la dirección legible. Sólo es falla si la cara queda
   pareja y sin dirección, o iluminada desde el lado contrario a la fuente. La barra anterior, «mitad casi negra», era
   más estricta que lo aprobado y quedó recalibrada.

### Cambiar de formato con `foto:expandir`

Cuando la pieza ya está aprobada y necesitas la horizontal **1,91:1** (LinkedIn 1200×628 y Meta horizontal), no
generes de cero: de cero el modelo centra al sujeto y el texto choca con él (10 de 11 en CMP-004). Parte de la escena
**1:1 aprobada** y deja que el modelo extienda sólo la columna de texto a la izquierda:

```bash
pnpm foto:expandir <plate-1x1> <salida> 0.8 "<el mismo fondo continúa oscuro y calmo, el lecho continúa, sin luces ni objetos brillantes ni pantallas>" 0.04 --lienzo 2048x1072 --ancla derecha --fundido 120 --reponer no
```

- `--lienzo 2048x1072 --ancla derecha` apoya la escena a la derecha al 80 % del alto (escala `0.8`, lecho abajo `0.04`).
- `--reponer no` entrega la salida del modelo sin pegar el original encima (pegarlo deja un recuadro visible). Como el
  modelo rehace la escena, **revisa las caras al 100 %** contra la aprobada.
- Si el borde de la escena trae luces, pide en el relleno que el muro termine donde termina la foto y baja la escala
  (en un caso se usó `0.76`).

La composición de la horizontal (bajada al titular del anuncio, firma a la izquierda y parámetros) está en
`.claude/skills/efeonce-advertising-creative/references/paid-format-safe-zones-and-craft.md` §0c.

## Qué significan los estados y señales

| Señal | Qué significa | Qué haces |
|---|---|---|
| `⚠ … cine — falta llave` (y similares) | a la ficha le falta un campo del oficio | complétalo; el aviso dice la falla que previene |
| `⚠ … más de 2 personajes con referencia` | la foto va a salir con «stickers» (cuenta los personajes de `objetos`, no las personas de `identidad`) | deja dos con referencia; el resto, sin imagen, lejos y desenfocados |
| aviso de prenda sin `persona` en un grupo | la prenda va de frente aunque la persona esté girada | agrega `persona` a esa prenda |
| aviso de `__completar` o `__revisar` en `foto:prompt` | quedan campos sin llenar o herencia de la receta sin mirar | completa o revisa cada campo y borra la clave |
| `✗ … la escena todavía es la de la receta` | `foto:generar` se niega a gastar | reescribe la escena |
| error de `alcance` | el alcance no existe | usa uno de la lista |
| `foto:validar:cine` ✗ `sombra` | el cuadro salió claro y parejo | una sola llave, sin relleno |
| `foto:validar:cine` ✗ `reserva` | en vertical, algo brillante subió al tercio del texto | nombra el fenómeno «below 36 %» y baja la fuente |
| `CORREGIR` del revisor por «cara con relleno» | la cara quedó pareja y sin dirección, comparada con la foto aprobada de la receta | revisa primero el escenario (lugar con escala y fenómeno grande) y la `llave`; no basta con agrandar la fuente |
| `APROBABLE` del revisor | no cayó en ninguna falla conocida | muéstrasela al operador: **aprueba él** |

## Qué no hacer

- No armes la ficha de cero ni copies una de memoria: parte de una receta.
- No edites la foto entera para corregir un color o una posición: reencuadra y rehace la cara. Corrige la ficha.
- No describas el uniforme, el traje ni los Sparks a mano: van por catálogo en `objetos`.
- No tomes un verde de `foto:validar:cine` como aprobación: no ve stickers, relleno ni azul rey bajo luz azul.
- No dejes `__revisar` sin mirar: la acción suspendida, los personajes y la identidad de la receta casi nunca sirven
  tal cual en otra escena.
- No juzgues la luz contra un ideal escrito («mitad casi negra»): compárala con la foto aprobada de la receta.
- No pongas a una persona sola en un vacío negro con una luz chica: declara un lugar real, oscuro y con escala.
- No toques `scripts/foto/build-prompt.mjs` sin correr la no-regresión antes y después (ver referencias): los demás
  registros no pueden cambiar.
- No consultes a otra sesión: si el casebook no cubre tu caso, cuéntaselo al operador para agregar la fila.

## Problemas comunes

- **«No hay receta cine X»:** el id va con mayúsculas como en `--listar` (`NX7d`, `SP2b`).
- **«La ficha de X no está en disco»:** `pnpm ai-gen:pull` de la carpeta de la receta.
- **El revisor dice `CORREGIR` por algo que el operador aprobó:** gana el operador; la diferencia se agrega al casebook.
- **El polo salió azul rey:** el comando ya pide navy; si igual sale, revisa que la escena no pida «bright blue» y que la
  llave no sea azul saturada directamente sobre la prenda. El hoodie es la excepción: conserva su azul royal del kit.
- **La llave de color tiñe o aplana el emblema:** pon la llave de lado, no de frente al pecho.
- **Salieron menos o más figuras de las pedidas, o el sujeto se corrió a la reserva:** ubica cada figura y al sujeto por
  geografía en la escena, no sólo por número o porcentaje.
- **En un grupo, Nexa salió con un gesto que no pediste:** en grupo su `expresion` no viaja; descríbelo en la escena.
- **Cambiaste el formato y faltan las reservas:** es lo esperado con `--formato`; vuelve a declararlas.
- **Trabajas en Codex y no encuentras `cine-reviewer`:** el agente existe sólo en Claude Code; aplica su rúbrica leyendo
  el archivo.

## Referencias técnicas

- Ficha cine y avisos: `scripts/foto/build-prompt.mjs` (`auditarCine`, `bloqueCine`, `ALCANCES_CINE`).
- Recetas: `scripts/foto/cine-recetas.json` · andamio: `scripts/foto/cine-nueva.mjs`.
- Medidor: `scripts/foto/validar-cine.mjs` (calibración en el casebook, sección «Medidor»).
- No-regresión de los demás registros: `node scripts/foto/regresion-prompt.mjs --foto <out>` antes y `--comparar <out>`
  después de tocar `build-prompt.mjs`.
- Revisor: `.claude/agents/cine-reviewer.md` (agente de Claude Code; en Codex, rúbrica de lectura).
- Guía operativa completa (flujo, campos, las 13 fallas, fotos aprobadas, medidor, pruebas ciegas y decisiones):
  `docs/operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md`.
- Banco en AXIS: sección «Registro cine» de `/references/photography/`.
