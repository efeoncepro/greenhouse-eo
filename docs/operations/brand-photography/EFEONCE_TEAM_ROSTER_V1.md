# Equipo en la fotografía de marca — roster V1

> **Tipo de documento:** Norma operativa (fotografía de marca)
> **Version:** 1.3
> **Creado:** 2026-09-29 por Claude (decisión del operador `cine-team-people-social`)
> **Ultima actualizacion:** 2026-09-29 por Claude (avatares oficiales con bomber y halo; firmas del equipo; Luis sale del equipo)
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

## El vestuario lo decide la línea de servicio

**[decisión del operador, 2026-09-29]** «Para todas las líneas de negocio sea la bomber y/o softshell de los uniformes
corporativos, y para los servicios creativos sea el hoodie, esto por la "personalidad" de las líneas de negocio.»

| Línea de la pieza (`efeonceGraphicLine.lines`) | Prenda del equipo | Kit en `objetos` |
| --- | --- | --- |
| `brand` (Servicios creativos) | **hoodie** Efeonce | `hoodie-efeonce` |
| `growth`, `engine`, `voice`, `revenue-hubspot`, `revenue-salesforce` (líneas de negocio) | **bomber o softshell** del uniforme corporativo, con el **polo** debajo si se quiere | `chaqueta-bomber-efeonce` o `chaqueta-softshell-efeonce` (+ `polo-efeonce`) |

- Vale para **todo el equipo**, Julio y Valentina incluidos: la prenda sale de la línea, no de la persona. Lo que
  antes era «Julio con polo» y «Valentina con su ropa» describía las fotos de referencia, no una regla.
- El **polo** nunca va solo en estas piezas: sólo debajo de la chaqueta, que se diseñó para ir sobre él
  (`ai-generations/2026-09-17_chaqueta-efeonce/LEEME.md`).
- En estas piezas la línea manda sobre el código de vestuario por registro de escena (polo = oficina, chaqueta =
  reunión, hoodie = terreno). Ese código sigue para las piezas que no declaran línea.
- **`pnpm foto:prompt` lo hace cumplir.** Si la ficha lleva a alguien del equipo en `identidad` y declara `linea`, la
  prenda de `objetos` debe ser la de la línea, o el comando se detiene. Una línea que no existe también lo detiene. Sin
  `linea` no hay guarda: decláralo siempre en una pieza de Marketing con Manzanitas
  (`validarVestuarioDeLinea` en `scripts/foto/build-prompt.mjs`).

## Quién está y de qué foto sale

| Clave | Persona | Referencia de identidad | Estado |
| --- | --- | --- | --- |
| `julio` | Julio Reyes | set aprobado del 2026-09-20 (`ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/`) | aprobado |
| `andres` | Andrés Carlosama | `_identidad-equipo/andres/actual.png` (con hoodie) + `antiguo.png` | aprobado |
| `daniela` | Daniela Ferreira | `_identidad-equipo/daniela/actual.png` (con hoodie) + `antiguo.png` | aprobado |
| `melkin` | Melkin Hernandez | sólo `_identidad-equipo/melkin/actual.png`: el retrato antiguo lo muestra con el pelo largo amarrado | aprobado |
| `humberly` | Humberly Henriquez | `_identidad-equipo/humberly/antiguo.jpg` (no hay foto actual) | aprobado · falta foto actual |
| `valentina` | Valentina Hoyos | `_identidad-equipo/valentina/actual.png` | aprobado |

`_identidad-equipo/` es `ai-generations/_identidad-equipo/` (con su `LEEME.md`): el hogar de las **fotos reales**. Desde el
2026-09-29 los avatares del repo son derivados editados (bomber, fondo nuevo) y no sirven de referencia de identidad.
**Luis salió del equipo** (operador, 2026-09-29): ya no está en `PERSONAS` ni en el canon §3.6.

La ropa de la foto de referencia no decide nada: la escena declara la prenda de la línea y el modelo viste con el kit.

Nexa sigue con su propia identidad (anclas de `ai-generations/_identidad-nexa/`).

## Avatares oficiales del equipo (2026-09-29)

**[decisiones del operador, 2026-09-29]** Todo el equipo con la **bomber** Efeonce sobre el **polo piqué** navy (Julio y
Valentina incluidos). Fondo: el **oscuro de la línea con el halo de la órbita** —el que pinta `orbitSvg` de
`@efeoncepro/axis-graphic-line` sobre superficie oscura (`#001a33` y el halo del acento con las paradas del token), sin
anillo ni arco—: el navy solo «pequeño se siente plano». Todas las caras con el mismo tamaño y a la misma altura, medidas
con Vision (distancia ojos → mentón); Daniela y Humberly un poco más lejos del lente para que se vea la chaqueta.

| Dónde | Qué hay |
| --- | --- |
| GCP (público) | `gs://efeonce-group-axis-public-media/team/avatars/v1/1080/<nombre-apellido>.png` (maestros) y `…/v1/800/` (web). URL: `https://storage.googleapis.com/efeonce-group-axis-public-media/team/avatars/v1/1080/<nombre-apellido>.png` |
| OneDrive del equipo | `Alineación/6. Marca/Kit media/Avatar/2026-09 La órbita/` (para la foto de perfil de Teams y Outlook) |
| Repo (800 px) | `src/lib/artifact-composer/catalogs/deck-axis/assets/squad/squad-<persona>.png` (deck) y `public/images/greenhouse/team/` (portal; Julio en `EO_Avatar-Julio-Reyes.png`) |
| Proceso | `ai-generations/2026-09-29_avatares-equipo/` (`componer-avatares.mjs`, `extender*.mjs`, `medir-rostro.swift`) |

Slugs: `julio-reyes`, `andres-carlosama`, `daniela-ferreira`, `melkin-hernandez`, `humberly-henriquez`, `valentina-hoyos`.

## Firmas de correo del equipo (2026-09-29)

La firma v3.1 aprobada, sin cambios de diseño, para las seis personas: la foto con órbita sale del avatar nuevo
(geometría del token `portrait`). Nombres y correos de Entra; cargos del operador (Daniela: Creative Operations Lead;
Andrés y Melkin: Senior Visual Designer; Julio: Managing & GTM Director; Humberly: Head of Finance; Valentina: Content
Lead). Teléfono: el WhatsApp de la agencia (+56 9 3732 3064) para todos y el propio para Julio (+56 9 3480 2860).
LinkedIn: pendiente (sólo Julio lo tiene hoy).

- Fotos de firma: `gs://efeonce-group-axis-public-media/email-signature/v3.1/people/<nombre-apellido>-{light,dark}.png`.
- Paquetes por persona (HTML de papel y navy, respuesta, vistas e instrucción): OneDrive `Alineación/6. Marca/Kit
  media/Firmas/firma-<nombre-apellido>.zip`. Se generan con `ai-generations/2026-09-29_avatares-equipo/firmas/build-firmas.mjs`
  (`PERSON=<nombre-apellido>` y `HOST_BASE`, igual que la v3.1).
- Página «Copiar mi firma» por persona y por buzón de área: `https://storage.googleapis.com/efeonce-group-axis-public-media/
  email-signature/v3.1/instalar/<nombre-apellido | area-talent | area-finance | area-commercial>.html` (generador
  `firmas/paginas-instalar.mjs`). El eslogan va horneado (`shared/<surface>/slogan-growth.png`) porque Outlook no carga Poppins.
- Tamaño (operador, 2026-09-29, opción C): el avatar con su órbita mide **130 px**, la altura del bloque de texto de al
  lado, y la marca de área **106 px** (`axis-tokens` 0.3.35). Las fotos se exportan a 3× con `firmas/fotos-orbita.mjs`.
  Quien instaló la firma antes debe volver a copiarla desde su página para ver el avatar grande (el operador avisa al equipo).

**Aprobado** [operador, 2026-09-29: «Está perfecto, aprobado»]: el operador revisó la hoja de contacto de la ronda
piloto —cada persona junto a su foto, en la Escena interior de Marketing con Manzanitas— y la Escena de Daniela compuesta
en el carrusel. Evidencia: `ai-generations/2026-09-29_manzanitas-equipo/` (fichas, prompts y plates `EQ-*`). Una persona
que entre después al equipo pasa por la misma ronda antes de publicarse. La aprobación es de **identidad**: los plates
piloto visten el hoodie (o la ropa propia de Valentina) porque son anteriores a la regla por línea, y no sirven como
referencia de vestuario para una pieza de línea de negocio.

## Cómo se usa

1. La ficha declara `"identidad": ["<clave>"]`, la `"linea"` de la pieza y en `objetos` la prenda de esa línea:
   `hoodie-efeonce` en `brand`; `chaqueta-bomber-efeonce` o `chaqueta-softshell-efeonce` (con `polo-efeonce` debajo si
   se quiere) en las demás.
2. La escena declara el vestuario en palabras (sin eso, la referencia lo decide: lección del 2026-09-20).
3. Con una sola foto de medio cuerpo, el encuadre va de la cintura para arriba, cámara a unos 2 m a la altura del pecho
   y 85 mm (la regla «retrato solo deforma el cuerpo», 2026-09-17).
4. `pnpm foto:generar <ficha.json>` resuelve las referencias; nadie copia rutas a mano.
5. Se revisa la identidad en hoja de contacto, al lado de la foto de referencia, antes de componer.

## Qué no hacer

- Usar a una persona que no esté en esta tabla, o la foto de alguien que ya no está en el equipo.
- Vestir al equipo con una prenda que no sea la de la línea: hoodie en una línea de negocio, chaqueta corporativa en
  Servicios creativos, o el polo solo.
- Omitir `linea` en la ficha de una pieza de línea: sin ella, `foto:prompt` no puede verificar la prenda.
- Publicar a alguien nuevo en el equipo sin su ronda de identidad aprobada por el operador.
- Describir la identidad de memoria: el bloque vive en `PERSONAS` y en el canon §3.6, y el gate exige que sean iguales.

## Pendiente

- Foto actual de **Humberly**; con ella, su identidad pasa a salir de la foto actual.
- El LinkedIn de cada persona en su firma.
- Toda persona que entre al equipo: su ronda de identidad antes de publicarse.
