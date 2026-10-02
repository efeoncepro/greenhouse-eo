# Producir una foto de marca en registro cine — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-02 por Claude
> **Ultima actualizacion:** 2026-10-02 por Claude
> **Modulo:** Creative · marca propia de Efeonce (fotografía de marca, registro cine)
> **Ruta en portal:** no aplica — se usa desde la terminal con `pnpm foto:*` y el agente `cine-reviewer`
> **Estado:** comandos y revisor disponibles desde el 2026-10-02 (TASK-1926, delta b); prueba ciega con sesiones nuevas en curso
> **Documentacion relacionada:** [Casebook del registro cine](../../operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md) · [Registro cine (canon)](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) · [Fotografía de marca](../marketing/fotografia-de-marca-efeonce.md) · [Usar el traje biónico de Nexa](usar-traje-bionico-de-nexa-en-fotos.md) · [Usar los Sparks](usar-sparks-en-fotos-de-marca.md)

## Para qué sirve

Para llegar a una foto cine aprobable **sin consultar a otra sesión ni a otra persona**. Hasta el 2026-10-02 ninguna
sesión lo lograba sola: las consultas se repetían y eran siempre las mismas diez fallas. Ahora esas fallas están
escritas en el casebook, la ficha las previene con campos propios y un agente revisor las revisa antes y después de
generar.

**No sirve** para los registros documental (A), puesta en escena (B) ni la respuesta a la vista (C): sus comandos no
cambiaron y no reciben nada de esto.

## Antes de empezar

- **Confirma que el caso va en cine.** Sólo: Nexa protagonista; la receta de deck `proposal-cinematic`; láminas de
  sección y «about» del deck; portadas y contraportadas con foto; Marketing con Manzanitas con el roster; portadas y
  destacados de redes con Nexa. **Publicidad con personas del equipo: en prueba.** Si no está, usa A, B o C.
- **Ten la máquina lista:** `pnpm foto:doctor`.
- **Ten las imágenes de la receta en disco.** Si `foto:cine:nueva` dice que la ficha no está, o el plate de la receta
  falta: `pnpm ai-gen:where <ruta>` y `pnpm ai-gen:pull <carpeta>`.

## Paso a paso

1. **Elige la receta más cercana** a tu caso:

   ```bash
   pnpm foto:cine:nueva --listar
   ```

   Cada receta dice su formato, alcance, protagonista, por qué funciona y sus advertencias (por ejemplo, «isotipo
   pintado: receta de luz y escena, no de bordado»).

2. **Crea tu ficha desde ella:**

   ```bash
   pnpm foto:cine:nueva --desde NX7d --id NX8 --dir ai-generations/2026-10-03_mi-corrida
   ```

   La ficha nueva queda en `<dir>/fichas/NX8.json` con `"registro": "cine"`, la estructura de la receta, la escena
   marcada `REESCRIBIR — …` y una lista `__completar` con los campos que faltan.

3. **Escribe la escena y completa los campos cine** (en inglés, como el resto del prompt):

   | Campo | Qué pones |
   |---|---|
   | `llave` | `{ "fuente", "lado", "distancia" }`: una sola fuente dura con tamaño, de lado y cerca |
   | `primerPlano` | algo real y oscuro junto al lente, fuera de foco |
   | `fondo` | luces prácticas grandes y frías al fondo, en bokeh |
   | `fenomeno` | `{ "que", "esServicio" }`: el fenómeno de luz y una frase que diga por qué ES el servicio |
   | `alcance` | `nexa` · `proposal-cinematic` · `deck-seccion` · `deck-portada` · `manzanitas` · `social-nexa` · `publicidad-prueba` |

   Borra la clave `__completar` cuando termines.

4. **Revisa el prompt:** `pnpm foto:prompt <ficha>`. Lee los avisos (`⚠ … cine — …`): cada uno nombra la falla del
   casebook que vas a cometer si lo ignoras.

5. **Pide revisión antes de gastar:** invoca el agente **`cine-reviewer`** con la ruta de la ficha. Devuelve
   `APROBABLE`, `CORREGIR` o `FUERA DE ALCANCE`, con la frase exacta a cambiar.

6. **Genera una vez:** `pnpm foto:generar <ficha> --quality high` (≈ USD 0,05).

7. **Mide y mira:**

   ```bash
   pnpm foto:validar:cine <plate.png>
   pnpm foto:validar <plate.png>
   pnpm foto:emblema <plate.png>
   ```

   Después, `cine-reviewer` sobre el plate. Si algo falla, **corrige la ficha y regenera**.

## Qué significan los estados y señales

| Señal | Qué significa | Qué haces |
|---|---|---|
| `⚠ … cine — falta llave` (y similares) | a la ficha le falta un campo del oficio | complétalo; el aviso dice la falla que previene |
| `⚠ … más de 2 personajes con referencia` | la foto va a salir con «stickers» | deja dos con referencia; el resto, sin imagen, lejos y desenfocados |
| `✗ … la escena todavía es la de la receta` | `foto:generar` se niega a gastar | reescribe la escena |
| error de `alcance` | el alcance no existe | usa uno de la lista |
| `foto:validar:cine` ✗ `sombra` | el cuadro salió claro y parejo | una sola llave, sin relleno |
| `foto:validar:cine` ✗ `reserva` | en vertical, algo brillante subió al tercio del texto | nombra el fenómeno «below 36 %» y baja la fuente |
| `APROBABLE` del revisor | no cayó en ninguna falla conocida | muéstrasela al operador: **aprueba él** |

## Qué no hacer

- No armes la ficha de cero ni copies una de memoria: parte de una receta.
- No edites la foto entera para corregir un color o una posición: reencuadra y rehace la cara. Corrige la ficha.
- No describas el uniforme, el traje ni los Sparks a mano: van por catálogo en `objetos`.
- No tomes un verde de `foto:validar:cine` como aprobación: no ve stickers, relleno ni azul rey bajo luz azul.
- No consultes a otra sesión: si el casebook no cubre tu caso, cuéntaselo al operador para agregar la fila.

## Problemas comunes

- **«No hay receta cine X»:** el id va con mayúsculas como en `--listar` (`NX7d`, `SP2b`).
- **«La ficha de X no está en disco»:** `pnpm ai-gen:pull` de la carpeta de la receta.
- **El revisor dice `CORREGIR` por algo que el operador aprobó:** gana el operador; la diferencia se agrega al casebook.
- **El polo salió azul rey:** el comando ya pide navy; si igual sale, revisa que la escena no pida «bright blue» y que la
  llave no sea azul saturada directamente sobre la prenda.

## Referencias técnicas

- Ficha cine y avisos: `scripts/foto/build-prompt.mjs` (`auditarCine`, `bloqueCine`, `ALCANCES_CINE`).
- Recetas: `scripts/foto/cine-recetas.json` · andamio: `scripts/foto/cine-nueva.mjs`.
- Medidor: `scripts/foto/validar-cine.mjs` (calibración en el casebook, sección «Medidor»).
- No-regresión de los demás registros: `node scripts/foto/regresion-prompt.mjs --foto <out>` antes y `--comparar <out>`
  después de tocar `build-prompt.mjs`.
- Revisor: `.claude/agents/cine-reviewer.md`.
- Banco en AXIS: sección «Registro cine» de `/references/photography/`.
