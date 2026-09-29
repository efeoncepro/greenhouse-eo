# Equipo en la fotografía de marca — roster V1

> **Tipo de documento:** Norma operativa (fotografía de marca)
> **Version:** 1.1
> **Creado:** 2026-09-29 por Claude (decisión del operador `cine-team-people-social`)
> **Ultima actualizacion:** 2026-09-29 por Claude (identidades aprobadas)
> **Documentacion tecnica:** [`PERSONAS` de `scripts/foto/build-prompt.mjs`](../../../scripts/foto/build-prompt.mjs) ·
> [bloques de identidad del canon §3.6](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · token AXIS
> `manzanitasRegister.teamPeople` (`rosterSource: 'greenhouse-team-roster'`)

## Para qué sirve

Es la lista de quién del equipo actual de Efeonce puede aparecer, con su identidad real, en la fotografía de marca, y de
qué fotos sale su identidad. AXIS no nombra a nadie: su token sólo dice que las fotos cine de Marketing con Manzanitas
pueden mostrar al equipo actual y que la lista vive acá.

## La decisión

**[decisión del operador, 2026-09-29]** «Las personas del equipo todas están en el repo, tienes que ponerlas sin la foto
de María Fernanda; en sustitución de María Fernanda está Valentina Hoyos.» Y, sobre la ropa: «Esos retratos son viejos,
hoy todos a excepción de Valentina y de mí salen con hoodie Efeonce.»

- Las fotos cine de **Marketing con Manzanitas** pueden mostrar a personas reales del equipo actual (antes, sólo Nexa o
  casting por rol; la publicidad con el equipo en cine seguía en prueba).
- La identidad **se regenera con sus referencias** (`pnpm foto:generar` con `identidad` en la ficha); **nunca** se injerta
  una cara ni se usa una persona que no esté en esta lista.
- **María Fernanda** ya no está en el equipo actual: su foto de la carpeta `squad/` del deck no se usa.

## Quién está y de qué foto sale

| Clave | Persona | Referencia de identidad | Vestuario | Estado |
| --- | --- | --- | --- | --- |
| `julio` | Julio Reyes | set aprobado del 2026-09-20 (`ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/`) | **polo** Efeonce | aprobado |
| `andres` | Andrés | `squad/squad-andres.png` (actual, con hoodie) + retrato antiguo de `public/` | **hoodie** Efeonce | aprobado |
| `daniela` | Daniela | `squad/squad-daniela.png` (actual, con hoodie) + retrato antiguo de `public/` | **hoodie** Efeonce | aprobado |
| `melkin` | Melkin | sólo `squad/squad-melkin.png` (actual): el retrato antiguo lo muestra con el pelo largo amarrado | **hoodie** Efeonce | aprobado |
| `humberly` | Humberly | retrato antiguo de `public/images/greenhouse/team/` (no hay foto actual en el repo) | **hoodie** Efeonce | aprobado · falta foto actual |
| `luis` | Luis | retrato antiguo de `public/images/greenhouse/team/` (no hay foto actual en el repo) | **hoodie** Efeonce | aprobado · falta foto actual |
| `valentina` | Valentina Hoyos | `public/images/greenhouse/team/EO_Avatar-Valentina.png` | **su propia ropa**, sin logo | aprobado |

`squad/` es `src/lib/artifact-composer/catalogs/deck-axis/assets/squad/`. Nexa sigue con su propia identidad (anclas de
`ai-generations/_identidad-nexa/`).

**Aprobado** [operador, 2026-09-29: «Está perfecto, aprobado»]: el operador revisó la hoja de contacto de la ronda
piloto —cada persona junto a su foto, en la Escena interior de Marketing con Manzanitas— y la Escena de Daniela compuesta
en el carrusel. Evidencia: `ai-generations/2026-09-29_manzanitas-equipo/` (fichas, prompts y plates `EQ-*`). Una persona
que entre después al equipo pasa por la misma ronda antes de publicarse.

## Cómo se usa

1. La ficha declara `"identidad": ["<clave>"]` y el vestuario de la tabla en `objetos` (`hoodie-efeonce` o
   `polo-efeonce`); Valentina va sin prenda de marca.
2. La escena declara el vestuario (sin eso, la referencia lo decide: lección del 2026-09-20).
3. Con una sola foto de medio cuerpo, el encuadre va de la cintura para arriba, cámara a unos 2 m a la altura del pecho
   y 85 mm (la regla «retrato solo deforma el cuerpo», 2026-09-17).
4. `pnpm foto:generar <ficha.json>` resuelve las referencias; nadie copia rutas a mano.
5. Se revisa la identidad en hoja de contacto, al lado de la foto de referencia, antes de componer.

## Qué no hacer

- Usar a una persona que no esté en esta tabla, o la foto de alguien que ya no está en el equipo.
- Vestir con hoodie a Valentina o a Julio, o sin hoodie al resto (salvo que la escena pida otro registro y el operador lo
  apruebe).
- Publicar a alguien nuevo en el equipo sin su ronda de identidad aprobada por el operador.
- Describir la identidad de memoria: el bloque vive en `PERSONAS` y en el canon §3.6, y el gate exige que sean iguales.

## Pendiente

- Fotos actuales (con hoodie) de **Humberly** y **Luis**; con ellas, su identidad pasa a salir de la foto actual.
- Toda persona que entre al equipo: su ronda de identidad antes de publicarse.
